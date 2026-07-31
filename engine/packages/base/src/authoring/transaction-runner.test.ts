// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { AuthoringDiagnosticErrorV1 } from "../contracts/diagnostic-envelope.ts";
import { digestCanonical } from "../contracts/digest.ts";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../contracts/gameplay-module.ts";
import { createTransactionalRngV1 } from "../contracts/rng.ts";
import type { RngStateV1 } from "../contracts/rng.ts";
import type { GameSnapshotEnvelopeV1 } from "../contracts/snapshot.ts";
import { createPristineRunIntegrityV1 } from "../contracts/snapshot.ts";
import type { RuntimeSchemaV1 } from "../contracts/values.ts";
import { parseNonNegativeSafeInteger, parseNonZeroUint32 } from "../contracts/values.ts";
import { createGameAuthoringKitV1 } from "./game-authoring-kit.ts";

interface VaultStateV1 {
  readonly coins: number;
}

interface LedgerStateV1 {
  readonly entries: number;
}

interface BankStateV1 {
  readonly simulation: {
    readonly vault: VaultStateV1;
    readonly ledger: LedgerStateV1;
  };
}

type BankFactV1 =
  | { readonly kind: "bank.coins_moved"; readonly amount: number }
  | { readonly kind: "bank.entry_recorded"; readonly entries: number };

interface BankRejectionV1 {
  readonly code: "bank.insufficient_coins" | "bank.vault_locked";
}

interface BankFaultV1 {
  readonly code: "bank.transaction_failed";
  readonly diagnosticCode: string | null;
}

interface BankTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    BankStateV1,
    RngStateV1
  > {
  readonly snapshot: GameSnapshotEnvelopeV1<BankStateV1, RngStateV1>;
  readonly command: { readonly kind: "bank.transfer" };
  readonly fact: BankFactV1;
  readonly rejection: BankRejectionV1;
  readonly fault: BankFaultV1;
}

type BankSnapshotV1 = BankTypesV1["snapshot"];

function exactNumberSchemaV1<TState>(key: string): RuntimeSchemaV1<TState> {
  return Object.freeze({
    parse(value: unknown): TState {
      if (value === null || typeof value !== "object" || Object.keys(value).join("\0") !== key) {
        throw new TypeError(`invalid ${key} state`);
      }
      parseNonNegativeSafeInteger((value as Record<string, unknown>)[key]);
      return Object.freeze({ ...(value as object) }) as TState;
    },
  });
}

const bankStateSchemaV1: RuntimeSchemaV1<BankStateV1> = Object.freeze({
  parse(value: unknown): BankStateV1 {
    const record = value as BankStateV1;
    parseNonNegativeSafeInteger(record.simulation.vault.coins);
    parseNonNegativeSafeInteger(record.simulation.ledger.entries);
    return Object.freeze({
      simulation: Object.freeze({
        vault: Object.freeze({ coins: record.simulation.vault.coins }),
        ledger: Object.freeze({ entries: record.simulation.ledger.entries }),
      }),
    });
  },
});

function createBankFixtureV1() {
  const kit = createGameAuthoringKitV1<BankTypesV1>();
  const vaultRead = kit.defineCapability<{ coinCount(): number }>("capability.vault.read");
  const vault = kit.defineStatefulModule({
    id: "bank.vault",
    contractRevision: 1,
    state: {
      slot: "simulation.vault",
      schema: exactNumberSchemaV1<VaultStateV1>("coins"),
      initial: () => Object.freeze({ coins: 10 }),
    },
    provides: (provide) => [
      provide(vaultRead, ({ readOwnState }) => ({ coinCount: () => readOwnState().coins })),
    ],
    owner: {
      operationSchema: Object.freeze({
        parse(value: unknown) {
          const amount = (value as { readonly amount?: unknown }).amount;
          if (typeof amount !== "number") throw new TypeError("invalid vault operation");
          return Object.freeze({ amount });
        },
      }),
      propose(state, operation) {
        if (state.coins + operation.amount < 0) {
          return Object.freeze({
            kind: "rejected" as const,
            rejection: Object.freeze({ code: "bank.insufficient_coins" as const }),
          });
        }
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({
            payload: operation,
            facts: Object.freeze([
              Object.freeze({ kind: "bank.coins_moved" as const, amount: operation.amount }),
            ]),
          }),
        });
      },
      apply(state, proposal) {
        return Object.freeze({ coins: state.coins + proposal.payload.amount });
      },
    },
  });
  const ledger = kit.defineStatefulModule({
    id: "bank.ledger",
    contractRevision: 1,
    state: {
      slot: "simulation.ledger",
      schema: exactNumberSchemaV1<LedgerStateV1>("entries"),
      initial: () => Object.freeze({ entries: 0 }),
    },
    requires: { vault: vaultRead },
    owner: {
      operationSchema: Object.freeze({
        parse(value: unknown) {
          const kind = (value as { readonly kind?: unknown }).kind;
          if (kind !== "record" && kind !== "corrupt") {
            throw new TypeError("invalid ledger operation");
          }
          return Object.freeze({ kind });
        },
      }),
      propose(state, operation) {
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({
            payload: operation,
            facts: Object.freeze([
              Object.freeze({
                kind: "bank.entry_recorded" as const,
                entries: state.entries + 1,
              }),
            ]),
          }),
        });
      },
      apply(state, proposal) {
        if (proposal.payload.kind === "corrupt") {
          return Object.freeze({ entries: -1 }) as never;
        }
        return Object.freeze({ entries: state.entries + 1 });
      },
    },
  });
  const composition = kit.composeModules([vault, ledger]);
  const runner = composition.createTransactionRunner({
    stateSchema: bankStateSchemaV1,
    createFault: (cause) =>
      Object.freeze({
        code: "bank.transaction_failed" as const,
        diagnosticCode: cause instanceof AuthoringDiagnosticErrorV1
          ? (cause.diagnostics[0]?.code ?? null)
          : null,
      }),
    validateCandidate: (state) =>
      state.simulation.ledger.entries > state.simulation.vault.coins + 100
        ? ["ledger entries exceed plausible vault activity"]
        : [],
  });
  return { kit, vaultRead, vault, ledger, composition, runner };
}

function bankSnapshotV1(coins = 10, entries = 0): BankSnapshotV1 {
  return Object.freeze({
    state: Object.freeze({
      simulation: Object.freeze({
        vault: Object.freeze({ coins }),
        ledger: Object.freeze({ entries }),
      }),
    }),
    rng: createTransactionalRngV1(parseNonZeroUint32(97)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(4),
    integrity: createPristineRunIntegrityV1(),
  });
}

describe("kit transaction runner", () => {
  it("commits both owner slices atomically with collected facts", () => {
    const { vault, ledger, runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();
    const rng = createTransactionalRngV1(snapshot.rng);

    const attempt = runner.execute(snapshot, rng, (transaction) => {
      transaction.propose(vault, { amount: -3 });
      transaction.propose(ledger, { kind: "record" });
      return transaction.complete();
    });

    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.snapshot.state.simulation).toEqual({
      vault: { coins: 7 },
      ledger: { entries: 1 },
    });
    expect(attempt.result.snapshot.commandSequence).toBe(5);
    expect(attempt.result.facts).toEqual([
      { kind: "bank.entry_recorded", entries: 1 },
      { kind: "bank.coins_moved", amount: -3 },
    ]);
    expect(attempt.diagnostics.committedRngBefore).toBe(snapshot.rng);
    expect(() => canonicalJsonBytes(attempt.result.snapshot.state)).not.toThrow();
  });

  it("produces the same candidate regardless of proposal declaration order", () => {
    const { vault, ledger, runner } = createBankFixtureV1();
    const digests = (
      [
        [vault, ledger],
        [ledger, vault],
      ] as const
    ).map(([first, _second]) => {
      const snapshot = bankSnapshotV1();
      const attempt = runner.execute(
        snapshot,
        createTransactionalRngV1(snapshot.rng),
        (transaction) => {
          if (first.id === "bank.vault") {
            transaction.propose(vault, { amount: -3 });
            transaction.propose(ledger, { kind: "record" });
          } else {
            transaction.propose(ledger, { kind: "record" });
            transaction.propose(vault, { amount: -3 });
          }
          return transaction.complete();
        },
      );
      expect(attempt.result.kind).toBe("committed");
      return digestCanonical("sillymaker:state:v1", attempt.result.snapshot);
    });
    expect(digests[0]).toBe(digests[1]);
  });

  it("rejects through transaction.reject and keeps the exact snapshot and RNG", () => {
    const { vaultRead, runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1(0);
    const rng = createTransactionalRngV1(snapshot.rng);

    const attempt = runner.execute(snapshot, rng, (transaction) => {
      if (transaction.read(vaultRead).coinCount() < 5) {
        return transaction.reject({ code: "bank.vault_locked" });
      }
      return transaction.complete();
    });

    expect(attempt.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "bank.vault_locked" }],
    });
    expect(attempt.result.snapshot).toBe(snapshot);
    expect(attempt.diagnostics.committedRngAfter).toBe(snapshot.rng);
  });

  it("turns an ignored owner rejection into a command rejection instead of a partial commit", () => {
    const { vault, ledger, runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1(1);

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.propose(vault, { amount: -5 });
        transaction.propose(ledger, { kind: "record" });
        return transaction.complete();
      },
    );

    expect(attempt.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "bank.insufficient_coins" }],
    });
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("faults with a stable diagnostic on a duplicate owner proposal", () => {
    const { vault, runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.propose(vault, { amount: -1 });
        transaction.propose(vault, { amount: -2 });
        return transaction.complete();
      },
    );

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: {
        code: "bank.transaction_failed",
        diagnosticCode: "authoring.transaction.duplicate_proposal",
      },
    });
    expect(attempt.result.snapshot).toBe(snapshot);
    expect(attempt.diagnostics.committedRngAfter).toBe(snapshot.rng);
  });

  it("faults when an applied slice violates its module schema", () => {
    const { ledger, runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.propose(ledger, { kind: "corrupt" });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("faulted");
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("faults with a stable diagnostic when the candidate violates an invariant", () => {
    const { ledger, runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1(0, 200);

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.propose(ledger, { kind: "record" });
        return transaction.complete();
      },
    );

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { diagnosticCode: "authoring.transaction.invariant_violation" },
    });
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("faults through createFault when the handler throws", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(snapshot, createTransactionalRngV1(snapshot.rng), () => {
      throw new Error("handler exploded");
    });

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { code: "bank.transaction_failed", diagnosticCode: null },
    });
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("keeps reads on the command-start snapshot even after staging proposals", () => {
    const { vault, vaultRead, ledger, runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();
    const observed: number[] = [];

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        observed.push(transaction.read(vaultRead).coinCount());
        transaction.propose(vault, { amount: -3 });
        observed.push(transaction.read(vaultRead).coinCount());
        transaction.propose(ledger, { kind: "record" });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("committed");
    expect(observed).toEqual([10, 10]);
  });
});
