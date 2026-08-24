// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

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
import {
  createGameAuthoringKitInternalV1,
  createGameAuthoringKitV1,
} from "./game-authoring-kit.ts";
import type { AuthoringKitAnyModuleV1 } from "./game-authoring-kit.ts";
import { createTransactionWorkCounterV1 } from "./transaction-work-instrumentation.ts";

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

type BankEventV1 =
  | { readonly kind: "bank.coins_moved"; readonly amount: number }
  | { readonly kind: "bank.entry_recorded"; readonly entries: number }
  | { readonly kind: "bank.audit_marked" };

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
  readonly event: BankEventV1;
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

// Admits shapes only: value ranges stay with each module's slice schema so
// tests can drive slice-schema faults through admitted events.
const bankEventSchemaV1: RuntimeSchemaV1<BankEventV1> = Object.freeze({
  parse(value: unknown): BankEventV1 {
    const kind = (value as { readonly kind?: unknown } | null)?.kind;
    if (kind === "bank.coins_moved") {
      const amount = (value as { readonly amount?: unknown }).amount;
      if (typeof amount !== "number" || !Number.isSafeInteger(amount)) {
        throw new TypeError("invalid bank.coins_moved amount");
      }
      return Object.freeze({ kind, amount });
    }
    if (kind === "bank.entry_recorded") {
      const entries = (value as { readonly entries?: unknown }).entries;
      if (typeof entries !== "number" || !Number.isSafeInteger(entries)) {
        throw new TypeError("invalid bank.entry_recorded entries");
      }
      return Object.freeze({ kind, entries });
    }
    if (kind === "bank.audit_marked") return Object.freeze({ kind });
    throw new TypeError("invalid bank event");
  },
});

function createBankFixtureV1(foldOrder?: string[]) {
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
    reducers: {
      "bank.coins_moved": (state, event) => {
        foldOrder?.push("bank.vault");
        return Object.freeze({ coins: state.coins + event.amount });
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
    reducers: {
      "bank.entry_recorded": (_state, event) => {
        foldOrder?.push("bank.ledger");
        return Object.freeze({ entries: event.entries });
      },
    },
  });
  const composition = kit.composeModules([vault, ledger]);
  const runner = composition.createTransactionRunner({
    stateSchema: bankStateSchemaV1,
    eventSchema: bankEventSchemaV1,
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

interface StructuralSliceV1 {
  readonly value: number;
}

interface StructuralStateV1 {
  readonly simulation: Readonly<Record<string, StructuralSliceV1>>;
}

interface StructuralEventV1 {
  readonly kind: string;
  readonly delta: number;
}

interface StructuralTypesV1
  extends GameSimulationTypeMapV1<GameBootstrapInputV1, StructuralStateV1, RngStateV1> {
  readonly snapshot: GameSnapshotEnvelopeV1<StructuralStateV1, RngStateV1>;
  readonly command: { readonly kind: "structural.run" };
  readonly event: StructuralEventV1;
  readonly rejection: { readonly code: "structural.rejected" };
  readonly fault: { readonly code: "structural.failed" };
}

function createStructuralFixtureV1(moduleCount: number) {
  const counter = createTransactionWorkCounterV1();
  const kit = createGameAuthoringKitInternalV1<StructuralTypesV1>(counter.instrumentation);
  const foldOrder: string[] = [];
  const sliceParses = Array.from({ length: moduleCount }, () => 0);
  const keys = Array.from(
    { length: moduleCount },
    (_, index) => `owner${String(index).padStart(3, "0")}`,
  );
  const moduleIds = keys.map((key) => `structural.${key}`);
  const eventKinds = moduleIds.map((id) => `structural.changed:${id}`);
  const modules = keys.map((key, index) => {
    const moduleId = moduleIds[index]!;
    const reduce = (state: StructuralSliceV1, event: StructuralEventV1) =>
      Object.freeze({ value: state.value + event.delta });
    return kit.defineStatefulModule({
      id: moduleId,
      contractRevision: 1,
      state: {
        slot: `simulation.${key}`,
        schema: Object.freeze({
          parse(value: unknown): StructuralSliceV1 {
            sliceParses[index]! += 1;
            const slice = value as StructuralSliceV1;
            parseNonNegativeSafeInteger(slice.value);
            return Object.freeze({ value: slice.value });
          },
        }),
        initial: () => Object.freeze({ value: 0 }),
      },
      reducers: {
        [eventKinds[index]!]: reduce,
        "structural.shared": (state, event) => {
          foldOrder.push(moduleId);
          return reduce(state, event);
        },
      },
    });
  });
  let aggregateParses = 0;
  const runner = kit.composeModules(modules as unknown as readonly AuthoringKitAnyModuleV1[])
    .createTransactionRunner({
      stateSchema: Object.freeze({
        parse(value: unknown): StructuralStateV1 {
          aggregateParses += 1;
          return value as StructuralStateV1;
        },
      }),
      eventSchema: Object.freeze({
        parse(value: unknown): StructuralEventV1 {
          const event = value as StructuralEventV1;
          if (typeof event.kind !== "string" || !Number.isSafeInteger(event.delta)) {
            throw new TypeError("invalid structural event");
          }
          return Object.freeze({ kind: event.kind, delta: event.delta });
        },
      }),
      createFault: () => Object.freeze({ code: "structural.failed" as const }),
    });
  const simulation = Object.fromEntries(
    keys.map((key) => [key, Object.freeze({ value: 0 })]),
  );
  const snapshot: StructuralTypesV1["snapshot"] = Object.freeze({
    state: Object.freeze({ simulation: Object.freeze(simulation) }),
    rng: createTransactionalRngV1(parseNonZeroUint32(211)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
  return {
    aggregateParses: () => aggregateParses,
    counter,
    eventKinds,
    foldOrder,
    moduleIds,
    runner,
    sliceParses,
    snapshot,
  };
}

describe("kit transaction runner", () => {
  it("folds emitted domain events into both slices atomically", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();
    const rng = createTransactionalRngV1(snapshot.rng);

    const attempt = runner.execute(snapshot, rng, (transaction) => {
      transaction.emit({ kind: "bank.coins_moved", amount: -3 });
      transaction.emit({ kind: "bank.entry_recorded", entries: 1 });
      return transaction.complete();
    });

    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.snapshot.state.simulation).toEqual({
      vault: { coins: 7 },
      ledger: { entries: 1 },
    });
    expect(attempt.result.snapshot.commandSequence).toBe(5);
    expect(attempt.result.events).toEqual([
      { kind: "bank.coins_moved", amount: -3 },
      { kind: "bank.entry_recorded", entries: 1 },
    ]);
    expect(attempt.diagnostics.committedRngBefore).toBe(snapshot.rng);
    expect(() => canonicalJsonBytes(attempt.result.snapshot.state)).not.toThrow();
  });

  it("produces the same candidate state for commuting emissions in either order", () => {
    const { runner } = createBankFixtureV1();
    const digests = (["vault_first", "ledger_first"] as const).map((order) => {
      const snapshot = bankSnapshotV1();
      const attempt = runner.execute(
        snapshot,
        createTransactionalRngV1(snapshot.rng),
        (transaction) => {
          if (order === "vault_first") {
            transaction.emit({ kind: "bank.coins_moved", amount: -3 });
            transaction.emit({ kind: "bank.entry_recorded", entries: 1 });
          } else {
            transaction.emit({ kind: "bank.entry_recorded", entries: 1 });
            transaction.emit({ kind: "bank.coins_moved", amount: -3 });
          }
          return transaction.complete();
        },
      );
      expect(attempt.result.kind).toBe("committed");
      return digestCanonical("sillymaker:state:v1", attempt.result.snapshot.state);
    });
    expect(digests[0]).toBe(digests[1]);
  });

  it("folds in emission order and never consults the Host locale", () => {
    const foldOrder: string[] = [];
    const { runner } = createBankFixtureV1(foldOrder);
    const snapshot = bankSnapshotV1();
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
      throw new TypeError("authoritative ordering consulted the Host locale");
    });

    try {
      const attempt = runner.execute(
        snapshot,
        createTransactionalRngV1(snapshot.rng),
        (transaction) => {
          transaction.emit({ kind: "bank.entry_recorded", entries: 1 });
          transaction.emit({ kind: "bank.coins_moved", amount: -3 });
          return transaction.complete();
        },
      );

      expect(attempt.result.kind).toBe("committed");
      if (attempt.result.kind !== "committed") return;
      expect(foldOrder).toEqual(["bank.ledger", "bank.vault"]);
      expect(attempt.result.events).toEqual([
        { kind: "bank.entry_recorded", entries: 1 },
        { kind: "bank.coins_moved", amount: -3 },
      ]);
      expect(attempt.result.snapshot.state.simulation).toEqual({
        vault: { coins: 7 },
        ledger: { entries: 1 },
      });
      expect(localeCompare).not.toHaveBeenCalled();
    } finally {
      localeCompare.mockRestore();
    }
  });

  it("folds repeated events of one kind sequentially through the same reducer", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: "bank.coins_moved", amount: -3 });
        transaction.emit({ kind: "bank.coins_moved", amount: -2 });
        transaction.emit({ kind: "bank.coins_moved", amount: 1 });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.snapshot.state.simulation.vault).toEqual({ coins: 6 });
    expect(attempt.result.events).toHaveLength(3);
  });

  it("journals events that no module reduces without touching state", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: "bank.audit_marked" });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.events).toEqual([{ kind: "bank.audit_marked" }]);
    expect(attempt.result.snapshot.state).toEqual(snapshot.state);
    expect(attempt.result.snapshot.commandSequence).toBe(5);
  });

  it("commits an empty journal when the handler completes without emitting", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => transaction.complete(),
    );

    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.events).toEqual([]);
    expect(attempt.result.snapshot.state).toEqual(snapshot.state);
    expect(attempt.result.snapshot.commandSequence).toBe(5);
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

  it("discards already-emitted events when the handler later rejects", () => {
    const { vaultRead, runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1(2);

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: "bank.entry_recorded", entries: 1 });
        if (transaction.read(vaultRead).coinCount() < 5) {
          return transaction.reject({ code: "bank.insufficient_coins" });
        }
        return transaction.complete();
      },
    );

    expect(attempt.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "bank.insufficient_coins" }],
    });
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("faults the whole commit when an emitted event fails admission", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: "bank.coins_moved", amount: 0.5 });
        return transaction.complete();
      },
    );

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { code: "bank.transaction_failed", diagnosticCode: null },
    });
    expect(attempt.result.snapshot).toBe(snapshot);
    expect(attempt.diagnostics.committedRngAfter).toBe(snapshot.rng);
  });

  it("faults with a stable diagnostic when an event carries no string kind", () => {
    const kit = createGameAuthoringKitV1<BankTypesV1>();
    const vault = kit.defineStatefulModule({
      id: "bank.vault",
      contractRevision: 1,
      state: {
        slot: "simulation.vault",
        schema: exactNumberSchemaV1<VaultStateV1>("coins"),
        initial: () => Object.freeze({ coins: 10 }),
      },
      reducers: {},
    });
    const ledger = kit.defineStatefulModule({
      id: "bank.ledger",
      contractRevision: 1,
      state: {
        slot: "simulation.ledger",
        schema: exactNumberSchemaV1<LedgerStateV1>("entries"),
        initial: () => Object.freeze({ entries: 0 }),
      },
      reducers: {},
    });
    const runner = kit.composeModules([vault, ledger]).createTransactionRunner({
      stateSchema: bankStateSchemaV1,
      // A pass-through schema abdicates kind validation; the kit still
      // refuses kindless events with its own stable diagnostic.
      eventSchema: Object.freeze({ parse: (value: unknown) => value as BankEventV1 }),
      createFault: (cause) =>
        Object.freeze({
          code: "bank.transaction_failed" as const,
          diagnosticCode: cause instanceof AuthoringDiagnosticErrorV1
            ? (cause.diagnostics[0]?.code ?? null)
            : null,
        }),
    });
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.emit({ amount: 1 } as never);
        return transaction.complete();
      },
    );

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: {
        code: "bank.transaction_failed",
        diagnosticCode: "authoring.transaction.invalid_event",
      },
    });
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("faults when a reduced slice violates its module schema", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        // Admitted by the event schema (safe integer) but the ledger slice
        // schema rejects negative entries at fold admission.
        transaction.emit({ kind: "bank.entry_recorded", entries: -1 });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("faulted");
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("faults with a stable diagnostic when the candidate violates an invariant", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1(0, 200);

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: "bank.entry_recorded", entries: 201 });
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

  it("faults through createFault when a reducer throws mid-fold", () => {
    const kit = createGameAuthoringKitV1<BankTypesV1>();
    const vault = kit.defineStatefulModule({
      id: "bank.vault",
      contractRevision: 1,
      state: {
        slot: "simulation.vault",
        schema: exactNumberSchemaV1<VaultStateV1>("coins"),
        initial: () => Object.freeze({ coins: 10 }),
      },
      reducers: {
        "bank.coins_moved": () => {
          throw new Error("reducer exploded");
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
      reducers: {
        "bank.entry_recorded": (_state, event) => Object.freeze({ entries: event.entries }),
      },
    });
    const runner = kit.composeModules([vault, ledger]).createTransactionRunner({
      stateSchema: bankStateSchemaV1,
      eventSchema: bankEventSchemaV1,
      createFault: () =>
        Object.freeze({ code: "bank.transaction_failed" as const, diagnosticCode: null }),
    });
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: "bank.entry_recorded", entries: 1 });
        transaction.emit({ kind: "bank.coins_moved", amount: -1 });
        return transaction.complete();
      },
    );

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { code: "bank.transaction_failed" },
    });
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("keeps reads on the command-start snapshot even after emitting events", () => {
    const { vaultRead, runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();
    const observed: number[] = [];

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        observed.push(transaction.read(vaultRead).coinCount());
        transaction.emit({ kind: "bank.coins_moved", amount: -3 });
        observed.push(transaction.read(vaultRead).coinCount());
        transaction.emit({ kind: "bank.entry_recorded", entries: 1 });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("committed");
    expect(observed).toEqual([10, 10]);
  });

  it("faults an emit after the transaction settled instead of extending the commit", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: "bank.coins_moved", amount: -1 });
        const outcome = transaction.complete();
        transaction.emit({ kind: "bank.coins_moved", amount: -1 });
        return outcome;
      },
    );

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { code: "bank.transaction_failed", diagnosticCode: "authoring.transaction.settled" },
    });
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("faults a second settle attempt after reject instead of overriding the outcome", () => {
    const { runner } = createBankFixtureV1();
    const snapshot = bankSnapshotV1();

    const attempt = runner.execute(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      (transaction) => {
        transaction.reject({ code: "bank.insufficient_coins" });
        return transaction.complete();
      },
    );

    expect(attempt.result).toMatchObject({
      kind: "faulted",
      fault: { code: "bank.transaction_failed", diagnosticCode: "authoring.transaction.settled" },
    });
    expect(attempt.result.snapshot).toBe(snapshot);
  });

  it("visits only one direct subscriber in a 160-module composition", () => {
    const fixture = createStructuralFixtureV1(160);
    const attempt = fixture.runner.execute(
      fixture.snapshot,
      createTransactionalRngV1(fixture.snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: fixture.eventKinds.at(-1)!, delta: 1 });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("committed");
    expect(fixture.counter.snapshot()).toEqual({
      reducerPlanVisits: 1,
      slotMaterializations: 1,
      aggregateMaterializations: 1,
    });
    expect(fixture.sliceParses.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(fixture.aggregateParses()).toBe(1);
  });

  it("folds repeated events in order and validates/materializes their owner once", () => {
    const fixture = createStructuralFixtureV1(16);
    const attempt = fixture.runner.execute(
      fixture.snapshot,
      createTransactionalRngV1(fixture.snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: fixture.eventKinds[0]!, delta: 1 });
        transaction.emit({ kind: fixture.eventKinds[0]!, delta: 2 });
        transaction.emit({ kind: fixture.eventKinds[0]!, delta: 3 });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("committed");
    if (attempt.result.kind !== "committed") return;
    expect(attempt.result.snapshot.state.simulation.owner000).toEqual({ value: 6 });
    expect(fixture.counter.snapshot()).toEqual({
      reducerPlanVisits: 3,
      slotMaterializations: 1,
      aggregateMaterializations: 1,
    });
    expect(fixture.sliceParses[0]).toBe(1);
    expect(fixture.aggregateParses()).toBe(1);
  });

  it("keeps UTF-16 subscriber order while batching sixteen owner writes", () => {
    const fixture = createStructuralFixtureV1(16);
    const attempt = fixture.runner.execute(
      fixture.snapshot,
      createTransactionalRngV1(fixture.snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: "structural.shared", delta: 1 });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("committed");
    expect(fixture.foldOrder).toEqual(fixture.moduleIds);
    expect(fixture.counter.snapshot()).toEqual({
      reducerPlanVisits: 16,
      slotMaterializations: 16,
      aggregateMaterializations: 1,
    });
    expect(fixture.sliceParses).toEqual(Array.from({ length: 16 }, () => 1));
    expect(fixture.aggregateParses()).toBe(1);
  });

  it("does no reducer or materialization work for a journal-only event", () => {
    const fixture = createStructuralFixtureV1(160);
    const attempt = fixture.runner.execute(
      fixture.snapshot,
      createTransactionalRngV1(fixture.snapshot.rng),
      (transaction) => {
        transaction.emit({ kind: "structural.journal", delta: 0 });
        return transaction.complete();
      },
    );

    expect(attempt.result.kind).toBe("committed");
    expect(fixture.counter.snapshot()).toEqual({
      reducerPlanVisits: 0,
      slotMaterializations: 0,
      aggregateMaterializations: 0,
    });
    expect(fixture.aggregateParses()).toBe(1);
  });

  it("rejects exact and parent/child State slots as conflicting module ownership", () => {
    for (const secondSlot of ["simulation.actor", "simulation.actor.hp"]) {
      const kit = createGameAuthoringKitV1<StructuralTypesV1>();
      const schema = Object.freeze({ parse: (value: unknown) => value as StructuralSliceV1 });
      const parent = kit.defineStatefulModule({
        id: "structural.actor",
        contractRevision: 1,
        state: { slot: "simulation.actor", schema, initial: () => ({ value: 0 }) },
        reducers: {},
      });
      const second = kit.defineStatefulModule({
        id: "structural.second",
        contractRevision: 1,
        state: { slot: secondSlot, schema, initial: () => ({ value: 0 }) },
        reducers: {},
      });

      try {
        kit.composeModules([parent, second] as unknown as readonly AuthoringKitAnyModuleV1[]);
        throw new Error("expected overlapping State slots to fail composition");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthoringDiagnosticErrorV1);
        expect((error as AuthoringDiagnosticErrorV1).diagnostics).toContainEqual(
          expect.objectContaining({ code: "authoring.module.overlapping_state_slot" }),
        );
      }
    }
  });
});
