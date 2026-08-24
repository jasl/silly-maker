// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { CanonicalJsonError } from "../../contracts/canonical-json.ts";
import { digestCanonical } from "../../contracts/digest.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.ts";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../../contracts/gameplay-module.ts";
import type { IsoUtcInstant } from "../../contracts/host.ts";
import type { GameSnapshotEnvelopeV1 } from "../../contracts/snapshot.ts";
import { createPristineRunIntegrityV1, runIntegrityV1Schema } from "../../contracts/snapshot.ts";
import type { DeepReadonly, RuntimeSchemaV1 } from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger } from "../../contracts/values.ts";
import {
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
} from "../diagnostics/runtime-failures.ts";
import {
  type AuthoritativeReplacementOwnerInternalV1,
  type AuthoritativeReplacementPreparationInternalV1,
  bindAuthoritativeReplacementCommitInternalV1,
  bindAuthoritativeReplacementPrepareCallbackInternalV1,
  createAuthoritativeReplacementPublicationContextInternalV1,
  createPreparedAuthoritativeReplacementCommitInternalV1,
  createGameSessionV1,
  createInstrumentedGameSessionV1,
  type GameSessionDebugInputV1,
  lookupInstalledSnapshotDigestInternalV1,
  readActiveAuthoritativeReplacementPublicationContextInternalV1,
  readInstalledSaveStateMigrationReceiptInternalV1,
} from "./game-session.ts";
import {
  createPurposeTaggedSnapshotWorkCounterV1,
  createSnapshotWorkCounterV1,
  type SnapshotWorkEventV1,
  type SnapshotWorkPurposeV1,
} from "../../internal/snapshot-work-instrumentation.ts";

interface State {
  readonly count: number;
}
interface RngState {
  readonly cursor: number;
}
type Snapshot = GameSnapshotEnvelopeV1<State, RngState>;
type Command =
  | { readonly kind: "increment" }
  | { readonly kind: "reject" }
  | { readonly kind: "fault" }
  | { readonly kind: "throw" };
type DebugCommand =
  | { readonly kind: "debug.synthetic.add"; readonly amount: number }
  | { readonly kind: "debug.synthetic.validation_failed" }
  | { readonly kind: "debug.synthetic.fault" };
interface DebugValidationError {
  readonly code: "debug.synthetic.validation_failed";
  readonly commandKind: DebugCommand["kind"];
}
type DebugAnchorTestResult = { readonly kind: "anchored" } | { readonly kind: "faulted" };
type Attempt = CommandExecutionAttemptEnvelopeV1<
  Snapshot,
  { readonly count: number },
  { readonly code: string },
  { readonly code: string },
  { readonly cursor: number },
  never
>;
interface Types extends GameSimulationTypeMapV1<GameBootstrapInputV1, State, RngState> {
  readonly snapshot: Snapshot;
  readonly command: Command;
  readonly event: { readonly count: number };
  readonly rejection: { readonly code: string };
  readonly fault: { readonly code: string };
  readonly debugCommand: DebugCommand;
  readonly debugValidationError: DebugValidationError;
  readonly rngState: { readonly cursor: number };
  readonly rngDrawTrace: never;
  readonly executionContext: undefined;
}

const commandSchema: RuntimeSchemaV1<Command> = {
  parse(value) {
    const kind = (value as { kind?: unknown } | null)?.kind;
    if (kind !== "increment" && kind !== "reject" && kind !== "fault" && kind !== "throw") {
      throw new TypeError("invalid command");
    }
    return Object.freeze({ kind });
  },
};

function defineDebugInputV1(input: GameSessionDebugInputV1<Types>): GameSessionDebugInputV1<Types> {
  return Object.freeze(input);
}

function createSnapshot(count: number, integrity = createPristineRunIntegrityV1()): Snapshot {
  return Object.freeze({
    state: Object.freeze({ count }),
    rng: Object.freeze({ cursor: 0 }),
    commandSequence: parseNonNegativeSafeInteger(count),
    integrity,
  });
}

const attempt = (current: Snapshot, command: Command): Attempt => {
  if (command.kind === "reject") {
    return Object.freeze({
      result: Object.freeze({
        kind: "rejected" as const,
        snapshot: current,
        reasons: Object.freeze([Object.freeze({ code: "synthetic.reject" })]),
      }),
      diagnostics: Object.freeze({
        committedRngBefore: current.rng,
        attemptedDraws: Object.freeze([]) as readonly never[],
        committedRngAfter: current.rng,
      }),
    });
  }
  if (command.kind === "fault") {
    return Object.freeze({
      result: Object.freeze({
        kind: "faulted" as const,
        snapshot: current,
        fault: Object.freeze({ code: "synthetic.fault" }),
      }),
      diagnostics: Object.freeze({
        committedRngBefore: Object.freeze({ cursor: 0 }),
        attemptedDraws: Object.freeze([]) as readonly never[],
        committedRngAfter: Object.freeze({ cursor: 0 }),
      }),
    });
  }
  return Object.freeze({
    result: Object.freeze({
      kind: "committed" as const,
      snapshot: createSnapshot(current.state.count + 1, current.integrity),
      events: Object.freeze([{ count: current.state.count + 1 }]),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: Object.freeze({ cursor: 0 }),
      attemptedDraws: Object.freeze([]) as readonly never[],
      committedRngAfter: Object.freeze({ cursor: 0 }),
    }),
  });
};

function integrityDriftAttempt(
  current: Snapshot,
  drifted: Snapshot,
  kind: "committed" | "rejected" | "faulted",
): Attempt {
  const result: Attempt["result"] = kind === "committed"
    ? Object.freeze({
      kind: "committed" as const,
      snapshot: drifted,
      events: Object.freeze([{ count: drifted.state.count }]),
    })
    : kind === "rejected"
    ? Object.freeze({
      kind: "rejected" as const,
      snapshot: drifted,
      reasons: Object.freeze([{ code: "synthetic.reject" }]),
    })
    : Object.freeze({
      kind: "faulted" as const,
      snapshot: drifted,
      fault: Object.freeze({ code: "synthetic.fault" }),
    });
  return Object.freeze({
    result,
    diagnostics: Object.freeze({
      committedRngBefore: current.rng,
      attemptedDraws: Object.freeze([]) as readonly never[],
      committedRngAfter: current.rng,
    }),
  });
}

function fixture(
  options: {
    readonly onObserverFailure?: (error: unknown) => void;
    readonly onHmrInvalidated?: () => void;
  } = {},
): ReturnType<typeof createGameSessionV1<Types>> & {
  readonly calls: () => number;
  readonly attempts: Attempt[];
} {
  let calls = 0;
  const attempts: Attempt[] = [];
  const input = {
    initialSnapshot: createSnapshot(0),
    commandSchema,
    executionContext: undefined,
    executeAttempt(snapshot: Snapshot, command: Command): Attempt {
      calls += 1;
      if (command.kind === "throw") throw new Error("executor exploded");
      return attempt(snapshot, command);
    },
    normalizeUnexpectedDispatchFault(_error: unknown, snapshot: Snapshot): Attempt {
      return attempt(snapshot, { kind: "fault" });
    },
    onAttempt(value: Attempt) {
      attempts.push(value);
    },
    ...(options.onObserverFailure === undefined
      ? {}
      : { onObserverFailure: options.onObserverFailure }),
    ...(options.onHmrInvalidated === undefined
      ? {}
      : { onHmrInvalidated: options.onHmrInvalidated }),
  };
  const created = createGameSessionV1<Types>(input);
  return { ...created, calls: () => calls, attempts };
}

function invalidCommandFixture(value: unknown): {
  readonly value: unknown;
  readonly getterCalls: () => number;
} {
  return Object.freeze({ value, getterCalls: () => 0 });
}

describe("GameSession FIFO", () => {
  it.each(
    [
      [
        "fractional",
        "number.not_integer",
        "/amount",
        () => invalidCommandFixture({ kind: "increment", amount: 0.25 }),
      ],
      [
        "non-finite",
        "number.non_finite",
        "/amount",
        () => invalidCommandFixture({ kind: "increment", amount: Number.POSITIVE_INFINITY }),
      ],
      [
        "unsafe integer",
        "number.unsafe_integer",
        "/amount",
        () => invalidCommandFixture({ kind: "increment", amount: Number.MAX_SAFE_INTEGER + 1 }),
      ],
      [
        "negative zero",
        "number.negative_zero",
        "/amount",
        () => invalidCommandFixture({ kind: "increment", amount: -0 }),
      ],
      [
        "plain-object getter",
        "value.getter",
        "/amount",
        () => {
          let getterCalls = 0;
          const value = { kind: "increment" } as Record<string, unknown>;
          Object.defineProperty(value, "amount", {
            enumerable: true,
            get() {
              getterCalls += 1;
              return 1;
            },
          });
          return Object.freeze({ value, getterCalls: () => getterCalls });
        },
      ],
      [
        "custom prototype",
        "value.custom_prototype",
        "",
        () =>
          invalidCommandFixture(
            Object.assign(Object.create(null) as Record<string, unknown>, { kind: "increment" }),
          ),
      ],
      [
        "sparse array",
        "value.sparse_array",
        "/values/0",
        () => invalidCommandFixture({ kind: "increment", values: Array(1) }),
      ],
      [
        "cycle",
        "value.cycle",
        "/self",
        () => {
          const value = { kind: "increment" } as Record<string, unknown>;
          value.self = value;
          return invalidCommandFixture(value);
        },
      ],
    ] as const,
  )(
    "rejects %s schema output before queue, execution, normalization, or mutation",
    async (_label, code, path, createInvalid) => {
      const counter = createSnapshotWorkCounterV1();
      const purposes = createPurposeTaggedSnapshotWorkCounterV1();
      const instrumentation = Object.freeze({
        record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
          counter.instrumentation.record(event, purpose);
          purposes.instrumentation.record(event, purpose);
        },
      });
      let executeCalls = 0;
      let normalizerCalls = 0;
      let attemptObserverCalls = 0;
      const created = createInstrumentedGameSessionV1<Types>(
        {
          initialSnapshot: createSnapshot(0),
          commandSchema: Object.freeze({ parse: (value: unknown) => value as Command }),
          executionContext: undefined,
          executeAttempt(snapshot, command) {
            executeCalls += 1;
            return attempt(snapshot as Snapshot, command as Command);
          },
          normalizeUnexpectedDispatchFault(_error, snapshot) {
            normalizerCalls += 1;
            return attempt(snapshot as Snapshot, { kind: "fault" });
          },
          onAttempt() {
            attemptObserverCalls += 1;
          },
        },
        instrumentation,
      );
      counter.reset();
      purposes.reset();
      const snapshotBefore = created.session.getCurrentSnapshot();
      const digestBefore = lookupInstalledSnapshotDigestInternalV1(
        created.runtimeControl,
        snapshotBefore,
      );
      const entriesBefore = created.commandLog.entries();
      const { value: invalid, getterCalls } = createInvalid();
      let publications = 0;
      created.session.subscribe(() => {
        publications += 1;
      });
      const dispatch = created.session.dispatch(invalid as never);

      await expect(dispatch).rejects.toBeInstanceOf(CanonicalJsonError);
      await expect(dispatch).rejects.toMatchObject({ code, path });
      expect(getterCalls()).toBe(0);
      expect(executeCalls).toBe(0);
      expect(normalizerCalls).toBe(0);
      expect(attemptObserverCalls).toBe(0);
      expect(publications).toBe(0);
      expect(created.session.getStatus()).toBe("ready");
      expect(created.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect(
        lookupInstalledSnapshotDigestInternalV1(created.runtimeControl, snapshotBefore),
      ).toBe(digestBefore);
      expect(created.commandLog.entries()).toBe(entriesBefore);
      expect(counter.snapshot()).toEqual({
        canonicalTraversals: 1,
        canonicalDigests: 0,
        commandLogContinuityVerifications: 0,
        saveCanonicalSerializations: 0,
        strictJsonParses: 0,
        strictJsonPreflights: 0,
      });
      expect(purposes.snapshot()).toEqual({
        snapshotDigestTraversals: 0,
        bootstrapAdmissionCanonicalTraversals: 0,
        commandAdmissionCanonicalTraversals: 1,
        commandLogMetadataAdmissionCanonicalTraversals: 0,
        evidenceAdmissionCanonicalTraversals: 0,
        replayComparisonTraversals: 0,
        totalPhysicalCanonicalTraversals: 1,
      });
    },
  );

  it("enforces command admission through the public Session factory", async () => {
    let executeCalls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema: Object.freeze({ parse: (value: unknown) => value as Command }),
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        executeCalls += 1;
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
    });
    const snapshotBefore = created.session.getCurrentSnapshot();
    const entriesBefore = created.commandLog.entries();

    await expect(
      created.session.dispatch({ kind: "increment", amount: 0.25 } as never),
    ).rejects.toMatchObject({
      code: "number.not_integer",
      path: "/amount",
    });

    expect(executeCalls).toBe(0);
    expect(created.session.getStatus()).toBe("ready");
    expect(created.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(created.commandLog.entries()).toBe(entriesBefore);
  });

  it("keeps command schema failure result-based without admission or queue work", async () => {
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const instrumentation = Object.freeze({
      record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
        counter.instrumentation.record(event, purpose);
        purposes.instrumentation.record(event, purpose);
      },
    });
    let schemaCalls = 0;
    let executeCalls = 0;
    const created = createInstrumentedGameSessionV1<Types>(
      {
        initialSnapshot: createSnapshot(0),
        commandSchema: Object.freeze({
          parse(): Command {
            schemaCalls += 1;
            throw new TypeError("Story schema rejected command");
          },
        }),
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          executeCalls += 1;
          return attempt(snapshot as Snapshot, command as Command);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      },
      instrumentation,
    );
    counter.reset();
    purposes.reset();
    let publications = 0;
    created.session.subscribe(() => {
      publications += 1;
    });

    await expect(
      created.session.dispatch({ kind: "invalid", amount: 0.25 } as never),
    ).resolves.toEqual({
      kind: "not_executed",
      code: "validation_failed",
    });

    expect(schemaCalls).toBe(1);
    expect(executeCalls).toBe(0);
    expect(publications).toBe(0);
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 0,
      canonicalDigests: 0,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(purposes.snapshot()).toEqual({
      snapshotDigestTraversals: 0,
      bootstrapAdmissionCanonicalTraversals: 0,
      commandAdmissionCanonicalTraversals: 0,
      commandLogMetadataAdmissionCanonicalTraversals: 0,
      evidenceAdmissionCanonicalTraversals: 0,
      replayComparisonTraversals: 0,
      totalPhysicalCanonicalTraversals: 0,
    });
  });

  it("admits reused normalized input once per dispatch and shares it with the internal log", async () => {
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const instrumentation = Object.freeze({
      record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
        counter.instrumentation.record(event, purpose);
        purposes.instrumentation.record(event, purpose);
      },
    });
    const normalized = {
      kind: "increment" as const,
      metadata: { ordinal: 1 },
    } as unknown as Command;
    let schemaCalls = 0;
    const executedCommands: DeepReadonly<Command>[] = [];
    const created = createInstrumentedGameSessionV1<Types>(
      {
        initialSnapshot: createSnapshot(0),
        commandSchema: Object.freeze({
          parse(value: unknown) {
            schemaCalls += 1;
            expect(value).toEqual({ operation: "increment", amount: 0.25 });
            return normalized;
          },
        }),
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          executedCommands.push(command);
          return attempt(snapshot as Snapshot, command as Command);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      },
      instrumentation,
    );
    counter.reset();
    purposes.reset();

    for (let index = 0; index < 2; index += 1) {
      await expect(
        created.session.dispatch({ operation: "increment", amount: 0.25 } as never),
      ).resolves.toMatchObject({ kind: "executed", execution: { kind: "committed" } });
    }

    expect(schemaCalls).toBe(2);
    expect(executedCommands).toHaveLength(2);
    expect(executedCommands[0]).not.toBe(normalized);
    expect(executedCommands[1]).not.toBe(normalized);
    expect(executedCommands[0]).not.toBe(executedCommands[1]);
    expect(executedCommands[0]).toEqual(normalized);
    expect(executedCommands[1]).toEqual(normalized);
    expect(created.commandLog.entries()).toHaveLength(2);
    expect(created.commandLog.entries()[0]?.command).toBe(executedCommands[0]);
    expect(created.commandLog.entries()[1]?.command).toBe(executedCommands[1]);
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 6,
      canonicalDigests: 2,
      commandLogContinuityVerifications: 2,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(purposes.snapshot()).toEqual({
      snapshotDigestTraversals: 2,
      bootstrapAdmissionCanonicalTraversals: 0,
      commandAdmissionCanonicalTraversals: 2,
      commandLogMetadataAdmissionCanonicalTraversals: 0,
      evidenceAdmissionCanonicalTraversals: 2,
      replayComparisonTraversals: 0,
      totalPhysicalCanonicalTraversals: 6,
    });
  });

  it("uses one finalized attempt for dispatch, live state, parsed command log, and observers", async () => {
    const initial = createSnapshot(0);
    let observed: Attempt | undefined;
    const created = createGameSessionV1<Types>({
      initialSnapshot: initial,
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      onAttempt(finalizedAttempt) {
        observed = finalizedAttempt;
      },
    });
    const admitted = Object.freeze({ kind: "increment", semanticOnly: "discarded" });

    const dispatch = await created.session.dispatch(admitted as Command);

    expect(dispatch.kind).toBe("executed");
    if (dispatch.kind !== "executed") throw new TypeError("expected executed dispatch");
    expect(observed).toBeDefined();
    expect(dispatch.execution).toBe(observed?.result);
    expect(created.session.getCurrentSnapshot()).toBe(observed?.result.snapshot);
    expect(created.commandLog.entries()).toHaveLength(1);
    const entry = created.commandLog.entries()[0];
    expect(entry).toMatchObject({
      source: "game",
      command: { kind: "increment" },
      outcome: { kind: "committed", events: [{ count: 1 }] },
      commandSequence: { before: 0, after: 1 },
    });
    expect(entry?.command).not.toBe(admitted);
    expect(entry?.preStateDigest).toBe(digestCanonical("sillymaker:state:v1", initial));
    expect(entry?.postStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
    );
  });

  it("finalizes one successful DebugCommand for the result, log, live state, and integrity", async () => {
    const initial = createSnapshot(0);
    let validateCalls = 0;
    let executeCalls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: initial,
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      debug: defineDebugInputV1({
        validate(_snapshot, _command) {
          validateCalls += 1;
          return Object.freeze({ kind: "allowed" as const });
        },
        executeAttempt(snapshot, command) {
          executeCalls += 1;
          return attempt(snapshot as Snapshot, {
            kind: command.kind === "debug.synthetic.fault" ? "fault" : "increment",
          });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });

    const result = await created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.add", amount: 5 }),
      () => true,
    );

    expect(result.kind).toBe("executed");
    if (result.kind !== "executed") throw new TypeError("expected executed DebugCommand");
    expect(validateCalls).toBe(1);
    expect(executeCalls).toBe(1);
    expect(created.session.getCurrentSnapshot()).toBe(result.attempt.result.snapshot);
    expect(created.session.getCurrentSnapshot().integrity).toEqual({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 1,
      reasons: [
        {
          kind: "debug_command",
          commandKind: "debug.synthetic.add",
          sequence: 1,
        },
      ],
    });
    const entry = created.commandLog.entries().at(-1);
    expect(entry).toMatchObject({
      source: "debug",
      command: { kind: "debug.synthetic.add", amount: 5 },
      outcome: { kind: "committed" },
    });
    expect(entry?.postStateDigest).toBe(result.attempt.postStateDigest);
    expect(result.attempt.postStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
    );
  });

  it("uses one digest for a committed DebugCommand and none for a faulted one", async () => {
    const counter = createSnapshotWorkCounterV1();
    const created = createInstrumentedGameSessionV1<Types>(
      {
        initialSnapshot: createSnapshot(0),
        commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          return attempt(snapshot as Snapshot, command as Command);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        debug: defineDebugInputV1({
          validate: () => Object.freeze({ kind: "allowed" as const }),
          executeAttempt(snapshot, command) {
            return attempt(snapshot as Snapshot, {
              kind: command.kind === "debug.synthetic.fault" ? "fault" : "increment",
            });
          },
          normalizeUnexpectedFault(_error, snapshot) {
            return attempt(snapshot as Snapshot, { kind: "fault" });
          },
        }),
      },
      counter.instrumentation,
    );
    counter.reset();

    await created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
      () => true,
    );
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 3,
      canonicalDigests: 1,
      commandLogContinuityVerifications: 1,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });

    counter.reset();
    await created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.fault" }),
      () => true,
    );
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 2,
      canonicalDigests: 0,
      commandLogContinuityVerifications: 1,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
  });

  it("validates DebugCommand at queue front without opening an attempt or log", async () => {
    const initial = createSnapshot(0);
    let executeCalls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: initial,
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      debug: defineDebugInputV1({
        validate(_snapshot, command) {
          return Object.freeze({
            kind: "validation_failed" as const,
            errors: Object.freeze([
              Object.freeze({
                code: "debug.synthetic.validation_failed" as const,
                commandKind: command.kind,
              }),
            ]),
          });
        },
        executeAttempt(snapshot) {
          executeCalls += 1;
          return attempt(snapshot as Snapshot, { kind: "increment" });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });

    await expect(
      created.debugControl.execute(
        Object.freeze({ kind: "debug.synthetic.validation_failed" }),
        () => true,
      ),
    ).resolves.toEqual({
      kind: "validation_failed",
      errors: [
        {
          code: "debug.synthetic.validation_failed",
          commandKind: "debug.synthetic.validation_failed",
        },
      ],
    });
    expect(executeCalls).toBe(0);
    expect(created.commandLog.entries()).toEqual([]);
    expect(created.session.getCurrentSnapshot()).toBe(initial);
    expect(created.session.getCurrentSnapshot().integrity).toBe(initial.integrity);
  });

  it("rejects a non-canonical low-level DebugCommand before queue or fault normalization", async () => {
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const instrumentation = Object.freeze({
      record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
        counter.instrumentation.record(event, purpose);
        purposes.instrumentation.record(event, purpose);
      },
    });
    let validateCalls = 0;
    let executeCalls = 0;
    let normalizerCalls = 0;
    const initial = createSnapshot(0);
    const created = createInstrumentedGameSessionV1<Types>(
      {
        initialSnapshot: initial,
        commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          return attempt(snapshot as Snapshot, command as Command);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        debug: defineDebugInputV1({
          validate() {
            validateCalls += 1;
            return Object.freeze({ kind: "allowed" as const });
          },
          executeAttempt(snapshot) {
            executeCalls += 1;
            return attempt(snapshot as Snapshot, { kind: "increment" });
          },
          normalizeUnexpectedFault(_error, snapshot) {
            normalizerCalls += 1;
            return attempt(snapshot as Snapshot, { kind: "fault" });
          },
        }),
      },
      instrumentation,
    );
    counter.reset();
    purposes.reset();
    let publications = 0;
    created.session.subscribe(() => {
      publications += 1;
    });
    const entriesBefore = created.commandLog.entries();
    const execution = created.debugControl.execute(
      { kind: "debug.synthetic.add", amount: 0.5 },
      () => true,
    );

    expect(created.session.getStatus()).toBe("ready");
    await expect(execution).rejects.toBeInstanceOf(CanonicalJsonError);
    await expect(execution).rejects.toMatchObject({
      code: "number.not_integer",
      path: "/amount",
    });
    expect(validateCalls).toBe(0);
    expect(executeCalls).toBe(0);
    expect(normalizerCalls).toBe(0);
    expect(publications).toBe(0);
    expect(created.session.getCurrentSnapshot()).toBe(initial);
    expect(created.commandLog.entries()).toBe(entriesBefore);
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 0,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(purposes.snapshot().commandAdmissionCanonicalTraversals).toBe(1);
  });

  it.each(
    ["capability_disabled", "session_unavailable", "fault_paused", "hmr_invalidated"] as const,
  )(
    "lets the %s fence win without observing or queueing a malformed DebugCommand",
    async (fence) => {
      const counter = createSnapshotWorkCounterV1();
      const purposes = createPurposeTaggedSnapshotWorkCounterV1();
      const instrumentation = Object.freeze({
        record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
          counter.instrumentation.record(event, purpose);
          purposes.instrumentation.record(event, purpose);
        },
      });
      let validateCalls = 0;
      let executeCalls = 0;
      let normalizerCalls = 0;
      const created = createInstrumentedGameSessionV1<Types>(
        {
          initialSnapshot: createSnapshot(0),
          commandSchema,
          executionContext: undefined,
          ...(fence === "session_unavailable" ? { available: false } : {}),
          executeAttempt(snapshot, command) {
            return attempt(snapshot as Snapshot, command as Command);
          },
          normalizeUnexpectedDispatchFault(_error, snapshot) {
            return attempt(snapshot as Snapshot, { kind: "fault" });
          },
          debug: defineDebugInputV1({
            validate() {
              validateCalls += 1;
              return Object.freeze({ kind: "allowed" as const });
            },
            executeAttempt(snapshot) {
              executeCalls += 1;
              return attempt(snapshot as Snapshot, { kind: "increment" });
            },
            normalizeUnexpectedFault(_error, snapshot) {
              normalizerCalls += 1;
              return attempt(snapshot as Snapshot, { kind: "fault" });
            },
          }),
        },
        instrumentation,
      );
      if (fence === "fault_paused") {
        await created.session.dispatch({ kind: "fault" });
      } else if (fence === "hmr_invalidated") {
        created.invalidationController.invalidateForHmr();
      }
      counter.reset();
      purposes.reset();
      let getterCalls = 0;
      const command = { kind: "debug.synthetic.add" } as Record<string, unknown>;
      Object.defineProperty(command, "amount", {
        enumerable: true,
        get() {
          getterCalls += 1;
          return 0.5;
        },
      });
      let publications = 0;
      created.session.subscribe(() => {
        publications += 1;
      });
      const statusBefore = created.session.getStatus();
      const execution = created.debugControl.execute(
        command as unknown as DebugCommand,
        () => fence !== "capability_disabled",
      );

      expect(created.session.getStatus()).toBe(statusBefore);
      await expect(execution).resolves.toEqual(
        fence === "capability_disabled"
          ? { kind: "capability_disabled" }
          : { kind: "not_executed", code: fence },
      );
      expect(getterCalls).toBe(0);
      expect(validateCalls).toBe(0);
      expect(executeCalls).toBe(0);
      expect(normalizerCalls).toBe(0);
      expect(publications).toBe(0);
      expect(counter.snapshot()).toEqual({
        canonicalTraversals: 0,
        canonicalDigests: 0,
        commandLogContinuityVerifications: 0,
        saveCanonicalSerializations: 0,
        strictJsonParses: 0,
        strictJsonPreflights: 0,
      });
      expect(purposes.snapshot().commandAdmissionCanonicalTraversals).toBe(0);
    },
  );

  it("rechecks capability before Debug validation after waiting in the one FIFO", async () => {
    let releaseDispatch: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    let enabled = true;
    let debugValidateCalls = 0;
    let debugExecuteCalls = 0;
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const created = createInstrumentedGameSessionV1<Types>(
      {
        initialSnapshot: createSnapshot(0),
        commandSchema,
        executionContext: undefined,
        async executeAttempt(snapshot, command) {
          await blocked;
          return attempt(snapshot as Snapshot, command as Command);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        debug: defineDebugInputV1({
          validate() {
            debugValidateCalls += 1;
            return Object.freeze({ kind: "allowed" as const });
          },
          executeAttempt(snapshot) {
            debugExecuteCalls += 1;
            return attempt(snapshot as Snapshot, { kind: "increment" });
          },
          normalizeUnexpectedFault(_error, snapshot) {
            return attempt(snapshot as Snapshot, { kind: "fault" });
          },
        }),
      },
      purposes.instrumentation,
    );

    const gameplay = created.session.dispatch({ kind: "increment" });
    purposes.reset();
    const debug = created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
      () => enabled,
    );
    enabled = false;
    releaseDispatch?.();

    await expect(gameplay).resolves.toMatchObject({ kind: "executed" });
    await expect(debug).resolves.toEqual({ kind: "capability_disabled" });
    expect(debugValidateCalls).toBe(0);
    expect(debugExecuteCalls).toBe(0);
    expect(purposes.snapshot().commandAdmissionCanonicalTraversals).toBe(1);
    expect(purposes.snapshot().evidenceAdmissionCanonicalTraversals).toBe(1);
    expect(created.commandLog.entries()).toHaveLength(1);
    expect(created.commandLog.entries()[0]?.source).toBe("game");
    expect(created.session.getCurrentSnapshot().integrity).toEqual(createPristineRunIntegrityV1());
  });

  it("rechecks capability before a Debug anchor operation after waiting in the one FIFO", async () => {
    let releaseDispatch: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    let enabled = true;
    let anchorCalls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      async executeAttempt(snapshot, command) {
        await blocked;
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
    });

    const gameplay = created.session.dispatch({ kind: "increment" });
    const anchor = created.debugControl.anchorReplacement<DebugAnchorTestResult>(
      Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
      async () => {
        anchorCalls += 1;
        return Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(10),
          result: Object.freeze({ kind: "anchored" as const }),
        });
      },
      () => enabled,
      () => Object.freeze({ kind: "faulted" as const }),
    );
    enabled = false;
    releaseDispatch?.();

    await expect(gameplay).resolves.toMatchObject({ kind: "executed" });
    await expect(anchor).resolves.toEqual({ kind: "capability_disabled" });
    expect(anchorCalls).toBe(0);
    expect(created.commandLog.entries()).toHaveLength(1);
    expect(created.commandLog.entries()[0]?.source).toBe("game");
    expect(created.session.getCurrentSnapshot().state.count).toBe(1);
    expect(created.session.getCurrentSnapshot().integrity).toEqual(createPristineRunIntegrityV1());
  });

  it("does not let Debug anchors revive unavailable or HMR-invalidated Sessions", async () => {
    let unavailableAnchorCalls = 0;
    const unavailable = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      available: false,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
    });
    const unavailableOperation = async () => {
      unavailableAnchorCalls += 1;
      return Object.freeze({
        kind: "replace" as const,
        snapshot: createSnapshot(10),
        result: Object.freeze({ kind: "anchored" as const }),
      });
    };
    const unavailableFirst = await unavailable.debugControl.anchorReplacement<
      DebugAnchorTestResult
    >(
      Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
      unavailableOperation,
      () => true,
      () => Object.freeze({ kind: "faulted" as const }),
    );
    const unavailableSecond = await unavailable.debugControl.anchorReplacement<
      DebugAnchorTestResult
    >(
      Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
      unavailableOperation,
      () => true,
      () => Object.freeze({ kind: "faulted" as const }),
    );
    expect(unavailableFirst).toEqual({
      kind: "not_executed",
      code: "session_unavailable",
    });
    expect(unavailableSecond).toBe(unavailableFirst);
    expect(unavailableAnchorCalls).toBe(0);
    expect(unavailable.session.getCurrentSnapshot().state.count).toBe(0);

    const invalidated = fixture();
    let invalidatedAnchorCalls = 0;
    invalidated.invalidationController.invalidateForHmr();
    const anchor = invalidated.debugControl.anchorReplacement<DebugAnchorTestResult>(
      Object.freeze({ kind: "debug_bundle" as const }),
      async () => {
        invalidatedAnchorCalls += 1;
        return Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(20),
          result: Object.freeze({ kind: "anchored" as const }),
        });
      },
      () => true,
      () => Object.freeze({ kind: "faulted" as const }),
    );
    await expect(anchor).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(invalidatedAnchorCalls).toBe(0);
    expect(invalidated.session.getStatus()).toBe("hmr_invalidated");
    expect(invalidated.session.getCurrentSnapshot().state.count).toBe(0);
    expect(invalidated.commandLog.entries()).toEqual([]);
  });

  it("logs an admitted faulted DebugCommand without marking integrity and pauses the Session", async () => {
    const initial = createSnapshot(0);
    const created = createGameSessionV1<Types>({
      initialSnapshot: initial,
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      debug: defineDebugInputV1({
        validate: () => Object.freeze({ kind: "allowed" as const }),
        executeAttempt(snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });

    const result = await created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.fault" }),
      () => true,
    );
    expect(result).toMatchObject({
      kind: "executed",
      attempt: { result: { kind: "faulted" } },
    });
    expect(created.commandLog.entries()).toEqual([
      expect.objectContaining({
        source: "debug",
        outcome: { kind: "faulted", fault: { code: "synthetic.fault" } },
      }),
    ]);
    expect(created.session.getCurrentSnapshot()).toBe(initial);
    expect(created.session.getCurrentSnapshot().integrity).toBe(initial.integrity);
    expect(created.session.getStatus()).toBe("fault_paused");
  });

  it("allows a successful Debug anchor to recover a fault-paused Session", async () => {
    const created = fixture();
    await created.session.dispatch({ kind: "fault" });
    expect(created.session.getStatus()).toBe("fault_paused");
    expect(created.commandLog.entries()).toHaveLength(1);

    await expect(
      created.debugControl.anchorReplacement<DebugAnchorTestResult>(
        Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: createSnapshot(10),
            result: Object.freeze({ kind: "anchored" as const }),
          }),
        () => true,
        () => Object.freeze({ kind: "faulted" as const }),
      ),
    ).resolves.toEqual({ kind: "anchored" });
    expect(created.session.getStatus()).toBe("ready");
    expect(created.commandLog.entries()).toEqual([]);
    expect(created.commandLog.replayBase()).toBe(created.session.getCurrentSnapshot());
    expect(created.session.getCurrentSnapshot().integrity).toMatchObject({
      mode: "modified",
      mutationCount: 1,
      reasons: [{ kind: "fixture_anchor", fixtureId: "fixture.synthetic", sequence: 10 }],
    });
  });

  it("marks accepted fixture and Debug Bundle anchors through the dedicated Debug control", async () => {
    const created = fixture();
    await created.session.dispatch({ kind: "increment" });
    const fixtureSnapshot = createSnapshot(10);
    await expect(
      created.debugControl.anchorReplacement<DebugAnchorTestResult>(
        Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: fixtureSnapshot,
            result: Object.freeze({ kind: "anchored" as const }),
          }),
        () => true,
        () => Object.freeze({ kind: "faulted" as const }),
      ),
    ).resolves.toEqual({ kind: "anchored" });
    expect(created.session.getCurrentSnapshot().integrity).toEqual({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 10,
      reasons: [{ kind: "fixture_anchor", fixtureId: "fixture.synthetic", sequence: 10 }],
    });
    expect(created.commandLog.entries()).toEqual([]);
    expect(created.commandLog.replayBase()).toBe(created.session.getCurrentSnapshot());

    const existingModified = created.session.getCurrentSnapshot().integrity;
    const bundleSnapshot = createSnapshot(20, existingModified);
    await created.debugControl.anchorReplacement<DebugAnchorTestResult>(
      Object.freeze({ kind: "debug_bundle" as const }),
      async () =>
        Object.freeze({
          kind: "replace" as const,
          snapshot: bundleSnapshot,
          result: Object.freeze({ kind: "anchored" as const }),
        }),
      () => true,
      () => Object.freeze({ kind: "faulted" as const }),
    );
    expect(created.session.getCurrentSnapshot().integrity).toEqual({
      mode: "modified",
      mutationCount: 2,
      firstMutationSequence: 10,
      reasons: [
        { kind: "fixture_anchor", fixtureId: "fixture.synthetic", sequence: 10 },
        { kind: "debug_bundle_anchor", sequence: 20 },
      ],
    });
  });

  it("refreshes the private digest from the integrity-stamped Debug anchor", async () => {
    const counter = createSnapshotWorkCounterV1();
    const created = createInstrumentedGameSessionV1<Types>(
      {
        initialSnapshot: createSnapshot(0),
        commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          return attempt(snapshot as Snapshot, command as Command);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      },
      counter.instrumentation,
    );
    const replacement = createSnapshot(20);
    counter.reset();

    await created.debugControl.anchorReplacement<DebugAnchorTestResult>(
      Object.freeze({ kind: "debug_bundle" as const }),
      async () =>
        Object.freeze({
          kind: "replace" as const,
          snapshot: replacement,
          result: Object.freeze({ kind: "anchored" as const }),
        }),
      () => true,
      () => Object.freeze({ kind: "faulted" as const }),
    );
    const anchored = created.session.getCurrentSnapshot();
    expect(anchored).not.toBe(replacement);
    expect(anchored.integrity).toMatchObject({
      mode: "modified",
      reasons: [{ kind: "debug_bundle_anchor", sequence: 20 }],
    });
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 1,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });

    counter.reset();
    await created.session.dispatch({ kind: "increment" });
    expect(created.commandLog.entries()[0]?.preStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", anchored),
    );
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 3,
      canonicalDigests: 1,
      commandLogContinuityVerifications: 1,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
  });

  it("logs rejected and faulted attempts but not invalid admission or a queued skip", async () => {
    const { session, commandLog, calls } = fixture();

    await expect(session.dispatch({ kind: "invalid" } as never)).resolves.toEqual({
      kind: "not_executed",
      code: "validation_failed",
    });
    await expect(session.dispatch({ kind: "reject" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "rejected" },
    });
    const fault = session.dispatch({ kind: "fault" });
    const skipped = session.dispatch({ kind: "increment" });
    await expect(fault).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "faulted" },
    });
    await expect(skipped).resolves.toEqual({
      kind: "not_executed",
      code: "fault_paused",
    });

    expect(calls()).toBe(2);
    expect(
      commandLog.entries().map(({ logOrdinal, outcome }) => [logOrdinal, outcome.kind]),
    ).toEqual([
      [1, "rejected"],
      [2, "faulted"],
    ]);
    for (const entry of commandLog.entries()) {
      expect(entry.preStateDigest).toBe(entry.postStateDigest);
      expect(entry.commandSequence.before).toBe(entry.commandSequence.after);
      expect(entry.committedRngBefore).toEqual(entry.committedRngAfter);
    }
  });

  it("publishes busy synchronously and commits in admission order", async () => {
    const { session, calls } = fixture();
    const first = session.dispatch({ kind: "increment" });
    const second = session.dispatch({ kind: "increment" });
    expect(session.getStatus()).toBe("busy");
    await expect(first).resolves.toMatchObject({ kind: "executed" });
    await expect(second).resolves.toMatchObject({ kind: "executed" });
    expect(session.getCurrentSnapshot().state.count).toBe(2);
    expect(session.getStatus()).toBe("ready");
    expect(calls()).toBe(2);
    expect(session.getCurrentSnapshot().integrity).toEqual(createPristineRunIntegrityV1());
  });

  it("keeps one private digest chain across queued commits and subscriber faults", async () => {
    const counter = createSnapshotWorkCounterV1();
    const observerFailures: unknown[] = [];
    const created = createInstrumentedGameSessionV1<Types>(
      {
        initialSnapshot: createSnapshot(0),
        commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          return attempt(snapshot as Snapshot, command as Command);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        onObserverFailure(error) {
          observerFailures.push(error);
        },
      },
      counter.instrumentation,
    );
    const subscriberError = new Error("digest-chain subscriber failed");
    let throwOnce = true;
    created.session.subscribe(() => {
      if (created.session.getStatus() !== "ready" || !throwOnce) return;
      throwOnce = false;
      throw subscriberError;
    });
    counter.reset();

    const first = created.session.dispatch({ kind: "increment" });
    const second = created.session.dispatch({ kind: "increment" });
    await expect(first).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await expect(second).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await expect(created.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });

    const entries = created.commandLog.entries();
    expect(entries).toHaveLength(3);
    expect(entries[0]?.postStateDigest).toBe(entries[1]?.preStateDigest);
    expect(entries[1]?.postStateDigest).toBe(entries[2]?.preStateDigest);
    expect(entries[0]?.preStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", created.commandLog.replayBase()),
    );
    expect(entries[2]?.postStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
    );
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 9,
      canonicalDigests: 3,
      commandLogContinuityVerifications: 3,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(observerFailures).toEqual([subscriberError]);
    expect(created.session).not.toHaveProperty("currentStateDigest");
    expect(created.runtimeControl).not.toHaveProperty("currentStateDigest");
    expect(created.commandLog).not.toHaveProperty("currentStateDigest");
  });

  it("indexes only successfully installed Snapshot identities under the exact runtime control", async () => {
    const created = fixture();
    const initial = created.session.getCurrentSnapshot();
    const initialDigest = digestCanonical("sillymaker:state:v1", initial);

    expect(lookupInstalledSnapshotDigestInternalV1(created.runtimeControl, initial)).toBe(
      initialDigest,
    );
    expect(
      lookupInstalledSnapshotDigestInternalV1(
        created.runtimeControl,
        Object.freeze({ ...initial }),
      ),
    ).toBeUndefined();

    const other = fixture();
    expect(lookupInstalledSnapshotDigestInternalV1(other.runtimeControl, initial)).toBeUndefined();

    await created.session.dispatch({ kind: "increment" });
    const firstCommit = created.session.getCurrentSnapshot();
    const firstDigest = created.commandLog.entries().at(-1)?.postStateDigest;
    expect(lookupInstalledSnapshotDigestInternalV1(created.runtimeControl, firstCommit)).toBe(
      firstDigest,
    );

    await created.session.dispatch({ kind: "increment" });
    const secondCommit = created.session.getCurrentSnapshot();
    expect(lookupInstalledSnapshotDigestInternalV1(created.runtimeControl, firstCommit)).toBe(
      firstDigest,
    );
    expect(lookupInstalledSnapshotDigestInternalV1(created.runtimeControl, secondCommit)).toBe(
      created.commandLog.entries().at(-1)?.postStateDigest,
    );

    const failedCandidate = createSnapshot(40);
    await expect(
      created.runtimeControl.enqueueAuthoritative(
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: failedCandidate,
            result: "anchored" as const,
            anchor: "replace_replay_base" as const,
          }),
        () => "faulted" as const,
        () => {
          throw new Error("replacement side effect failed");
        },
      ),
    ).resolves.toBe("faulted");
    expect(
      lookupInstalledSnapshotDigestInternalV1(created.runtimeControl, failedCandidate),
    ).toBeUndefined();
    expect(created.session.getCurrentSnapshot()).toBe(secondCommit);
    expect(lookupInstalledSnapshotDigestInternalV1(created.runtimeControl, secondCommit)).toBe(
      created.commandLog.entries().at(-1)?.postStateDigest,
    );
  });

  it.each(["committed", "rejected", "faulted"] as const)(
    "turns Story-owned integrity drift from %s into one finalized fault",
    async (candidateKind) => {
      const initial = createSnapshot(0);
      const drifted = runIntegrityV1Schema.parse({
        mode: "modified",
        mutationCount: 1,
        firstMutationSequence: 1,
        reasons: [{ kind: "debug_bundle_anchor", sequence: 1 }],
      });
      let executorCalls = 0;
      const finalizedAttempts: Attempt[] = [];
      const created = createGameSessionV1<Types>({
        initialSnapshot: initial,
        commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot) {
          executorCalls += 1;
          return integrityDriftAttempt(
            snapshot as Snapshot,
            createSnapshot(snapshot.state.count + 1, drifted),
            candidateKind,
          );
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        onAttempt(value) {
          finalizedAttempts.push(value);
        },
      });

      await expect(created.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
        kind: "executed",
        execution: { kind: "faulted", fault: { code: "synthetic.fault" } },
      });
      expect(executorCalls).toBe(1);
      expect(finalizedAttempts).toHaveLength(1);
      expect(finalizedAttempts[0]?.result).toMatchObject({
        kind: "faulted",
        fault: { code: "synthetic.fault" },
      });
      expect(finalizedAttempts[0]?.result.snapshot).toBe(initial);
      expect(created.session.getCurrentSnapshot()).toBe(initial);
      expect(created.session.getCurrentSnapshot().integrity).toBe(initial.integrity);
      expect(created.commandLog.entries()).toHaveLength(1);
      expect(created.commandLog.entries()[0]?.outcome.kind).toBe("faulted");
      expect(created.commandLog.entries()[0]?.postStateDigest).toBe(
        digestCanonical("sillymaker:state:v1", initial),
      );
    },
  );

  it("preserves the exact Snapshot and skips a queued command after fault", async () => {
    const { session, calls } = fixture();
    const before = session.getCurrentSnapshot();
    const first = session.dispatch({ kind: "fault" });
    const second = session.dispatch({ kind: "increment" });
    await expect(first).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "faulted" },
    });
    await expect(second).resolves.toEqual({
      kind: "not_executed",
      code: "fault_paused",
    });
    expect(session.getCurrentSnapshot()).toBe(before);
    expect(session.getStatus()).toBe("fault_paused");
    expect(calls()).toBe(1);
  });

  it("invalidates synchronously once and rejects new commands without changing the Snapshot", async () => {
    let invalidationReports = 0;
    const { session, runtimeControl, invalidationController, commandLog, calls } = fixture({
      onHmrInvalidated() {
        invalidationReports += 1;
      },
    });
    await session.dispatch({ kind: "increment" });
    const snapshotBefore = session.getCurrentSnapshot();
    const commandLogBefore = commandLog.entries();
    let synchronouslyPublishedStatus: ReturnType<typeof session.getStatus> | undefined;
    let invalidationPublications = 0;
    session.subscribe(() => {
      synchronouslyPublishedStatus = session.getStatus();
      invalidationPublications += 1;
    });

    invalidationController.invalidateForHmr();
    expect(synchronouslyPublishedStatus).toBe("hmr_invalidated");
    expect(session.getStatus()).toBe("hmr_invalidated");
    invalidationController.invalidateForHmr();
    const command = session.dispatch({ kind: "increment" });

    await expect(command).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(invalidationReports).toBe(1);
    expect(invalidationPublications).toBe(1);
    expect(calls()).toBe(1);
    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.entries()).toBe(commandLogBefore);
    await expect(runtimeControl.readAtQueueFront((snapshot) => snapshot)).resolves.toBe(
      snapshotBefore,
    );
    expect(session.getStatus()).toBe("hmr_invalidated");
  });

  it("skips gameplay and Debug mutations queued behind synchronous invalidation", async () => {
    let releaseBlocker: (() => void) | undefined;
    let blockerStarted: (() => void) | undefined;
    const blocker = new Promise<void>((resolve) => {
      releaseBlocker = resolve;
    });
    const started = new Promise<void>((resolve) => {
      blockerStarted = resolve;
    });
    let gameplayCalls = 0;
    let debugCalls = 0;
    let anchorCalls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        gameplayCalls += 1;
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      debug: defineDebugInputV1({
        validate: () => Object.freeze({ kind: "allowed" as const }),
        executeAttempt(snapshot) {
          debugCalls += 1;
          return attempt(snapshot as Snapshot, { kind: "increment" });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });
    const blockingOperation = created.runtimeControl.enqueueAuthoritative(
      async () => {
        blockerStarted?.();
        await blocker;
        return Object.freeze({
          kind: "preserve" as const,
          result: "released" as const,
        });
      },
      () => "faulted" as const,
      undefined,
      () => "hmr_invalidated" as const,
    );
    await started;
    const gameplay = created.session.dispatch({ kind: "increment" });
    const debug = created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
      () => true,
    );
    const anchor = created.debugControl.anchorReplacement<DebugAnchorTestResult>(
      Object.freeze({ kind: "fixture" as const, fixtureId: "fixture.synthetic" }),
      async () => {
        anchorCalls += 1;
        return Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(20),
          result: Object.freeze({ kind: "anchored" as const }),
        });
      },
      () => true,
      () => Object.freeze({ kind: "faulted" as const }),
    );

    created.invalidationController.invalidateForHmr();
    expect(created.session.getStatus()).toBe("hmr_invalidated");
    releaseBlocker?.();

    await expect(blockingOperation).resolves.toBe("hmr_invalidated");
    await expect(gameplay).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    await expect(debug).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    await expect(anchor).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(gameplayCalls).toBe(0);
    expect(debugCalls).toBe(0);
    expect(anchorCalls).toBe(0);
    expect(created.session.getCurrentSnapshot().state.count).toBe(0);
    expect(created.commandLog.entries()).toEqual([]);
  });

  it("drops an in-flight async DebugCommand after synchronous HMR invalidation", async () => {
    let releaseDebug: (() => void) | undefined;
    let markDebugStarted: (() => void) | undefined;
    const blockedDebug = new Promise<void>((resolve) => {
      releaseDebug = resolve;
    });
    const debugStarted = new Promise<void>((resolve) => {
      markDebugStarted = resolve;
    });
    let attemptsObserved = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      onAttempt() {
        attemptsObserved += 1;
      },
      debug: defineDebugInputV1({
        validate: () => Object.freeze({ kind: "allowed" as const }),
        async executeAttempt(snapshot) {
          markDebugStarted?.();
          await blockedDebug;
          return attempt(snapshot as Snapshot, { kind: "increment" });
        },
        normalizeUnexpectedFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });
    const snapshotBefore = created.session.getCurrentSnapshot();
    const debug = created.debugControl.execute(
      Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
      () => true,
    );
    await debugStarted;

    created.invalidationController.invalidateForHmr();
    releaseDebug?.();

    await expect(debug).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(created.session.getStatus()).toBe("hmr_invalidated");
    expect(created.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(created.commandLog.entries()).toEqual([]);
    expect(attemptsObserved).toBe(0);
  });

  it("checks the post-validator HMR fence before admitting Debug validation evidence", async () => {
    const mutableError = {
      code: "debug.synthetic.validation_failed" as const,
      commandKind: "debug.synthetic.validation_failed" as const,
    };
    let normalizerCalls = 0;
    let created!: ReturnType<typeof createGameSessionV1<Types>>;
    created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      debug: defineDebugInputV1({
        validate() {
          created.invalidationController.invalidateForHmr();
          return { kind: "validation_failed" as const, errors: [mutableError] };
        },
        executeAttempt(): never {
          throw new TypeError("invalidated validation must not execute");
        },
        normalizeUnexpectedFault(_error, snapshot) {
          normalizerCalls += 1;
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      }),
    });

    await expect(
      created.debugControl.execute(
        Object.freeze({ kind: "debug.synthetic.validation_failed" }),
        () => true,
      ),
    ).resolves.toEqual({ kind: "not_executed", code: "hmr_invalidated" });
    expect(normalizerCalls).toBe(0);
    expect(created.commandLog.entries()).toEqual([]);
  });

  it.each(["game", "debug"] as const)(
    "normalizes an undefined %s attempt exactly once through the valid fault fallback",
    async (source) => {
      let normalizerCalls = 0;
      const created = createGameSessionV1<Types>({
        initialSnapshot: createSnapshot(0),
        commandSchema,
        executionContext: undefined,
        executeAttempt() {
          return undefined as never;
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          normalizerCalls += 1;
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        debug: defineDebugInputV1({
          validate: () => Object.freeze({ kind: "allowed" as const }),
          executeAttempt() {
            return undefined as never;
          },
          normalizeUnexpectedFault(_error, snapshot) {
            normalizerCalls += 1;
            return attempt(snapshot as Snapshot, { kind: "fault" });
          },
        }),
      });

      const result = source === "game"
        ? await created.session.dispatch({ kind: "increment" })
        : await created.debugControl.execute(
          Object.freeze({ kind: "debug.synthetic.fault" }),
          () => true,
        );
      expect(result).toMatchObject(
        source === "game"
          ? { kind: "executed", execution: { kind: "faulted" } }
          : { kind: "executed", attempt: { result: { kind: "faulted" } } },
      );
      expect(normalizerCalls).toBe(1);
      expect(created.session.getStatus()).toBe("fault_paused");
      expect(created.commandLog.entries()).toHaveLength(1);
    },
  );

  it.each(["direct", "normalized"] as const)(
    "records a %s fault for a canonical primitive DebugCommand without requiring kind",
    async (mode) => {
      let normalizerCalls = 0;
      const created = createGameSessionV1<Types>({
        initialSnapshot: createSnapshot(0),
        commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          return attempt(snapshot as Snapshot, command as Command);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
        debug: defineDebugInputV1({
          validate: () => Object.freeze({ kind: "allowed" as const }),
          executeAttempt(snapshot) {
            if (mode === "normalized") throw new Error("synthetic primitive debug failure");
            return attempt(snapshot as Snapshot, { kind: "fault" });
          },
          normalizeUnexpectedFault(_error, snapshot) {
            normalizerCalls += 1;
            return attempt(snapshot as Snapshot, { kind: "fault" });
          },
        }),
      });

      await expect(
        created.debugControl.execute(1 as never, () => true),
      ).resolves.toMatchObject({
        kind: "executed",
        attempt: { result: { kind: "faulted" } },
      });
      expect(normalizerCalls).toBe(mode === "normalized" ? 1 : 0);
      expect(created.commandLog.entries()[0]).toMatchObject({
        source: "debug",
        command: 1,
        outcome: { kind: "faulted" },
      });
    },
  );

  it("does not let an in-flight authoritative replacement revive an invalidated Session", async () => {
    let releaseReplacement: (() => void) | undefined;
    let replacementStarted: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    const started = new Promise<void>((resolve) => {
      replacementStarted = resolve;
    });
    const created = fixture();
    const before = created.session.getCurrentSnapshot();
    const replacement = created.runtimeControl.enqueueAuthoritative(
      async () => {
        replacementStarted?.();
        await blocked;
        return Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(20),
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        });
      },
      () => "faulted" as const,
      undefined,
      () => "hmr_invalidated" as const,
    );
    await started;

    created.invalidationController.invalidateForHmr();
    releaseReplacement?.();

    await expect(replacement).resolves.toBe("hmr_invalidated");
    expect(created.session.getStatus()).toBe("hmr_invalidated");
    expect(created.session.getCurrentSnapshot()).toBe(before);
    expect(created.commandLog.replayBase()).toBe(before);
    expect(created.commandLog.entries()).toEqual([]);
  });

  it("keeps HMR invalidation terminal when in-flight authoritative work throws", async () => {
    let releaseDispatch: (() => void) | undefined;
    let dispatchStarted: (() => void) | undefined;
    const blockedDispatch = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    const startedDispatch = new Promise<void>((resolve) => {
      dispatchStarted = resolve;
    });
    let normalizerCalls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      async executeAttempt() {
        dispatchStarted?.();
        await blockedDispatch;
        throw new Error("old executor failed");
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        normalizerCalls += 1;
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
    });
    const dispatch = created.session.dispatch({ kind: "increment" });
    await startedDispatch;

    created.invalidationController.invalidateForHmr();
    releaseDispatch?.();

    await expect(dispatch).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    expect(created.session.getStatus()).toBe("hmr_invalidated");
    expect(created.session.getCurrentSnapshot().state.count).toBe(0);
    expect(created.commandLog.entries()).toEqual([]);
    expect(normalizerCalls).toBe(0);

    let releaseReplacement: (() => void) | undefined;
    let replacementStarted: (() => void) | undefined;
    const blockedReplacement = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    const startedReplacement = new Promise<void>((resolve) => {
      replacementStarted = resolve;
    });
    const replacementCreated = fixture();
    const replacement = replacementCreated.runtimeControl.enqueueAuthoritative(
      async () => {
        replacementStarted?.();
        await blockedReplacement;
        throw new Error("old replacement failed");
      },
      () => "faulted" as const,
      undefined,
      () => "hmr_invalidated" as const,
    );
    await startedReplacement;

    replacementCreated.invalidationController.invalidateForHmr();
    releaseReplacement?.();

    await expect(replacement).resolves.toBe("hmr_invalidated");
    expect(replacementCreated.session.getStatus()).toBe("hmr_invalidated");
    expect(replacementCreated.session.getCurrentSnapshot().state.count).toBe(0);
    expect(replacementCreated.commandLog.entries()).toEqual([]);
  });

  it("normalizes a thrown executor once and permits an anchor recovery", async () => {
    const { session, runtimeControl, commandLog, calls, attempts } = fixture();
    expect(session.getLastFaultCause()).toBeNull();
    await expect(session.dispatch({ kind: "throw" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "faulted" },
    });
    expect(calls()).toBe(1);
    expect(attempts).toHaveLength(1);
    expect(commandLog.entries()).toHaveLength(1);
    expect(commandLog.entries()[0]?.outcome.kind).toBe("faulted");
    // The raw cause is preserved for debug display but never enters the
    // authoritative log (the normalizer's coded fault is all it records).
    expect(session.getLastFaultCause()).toMatchObject({
      at: "dispatch",
      message: "Error: executor exploded",
    });
    expect(session.getLastFaultCause()?.stackSummary.length).toBeGreaterThan(0);
    expect(JSON.stringify(commandLog.entries())).not.toContain("executor exploded");
    const acceptedIntegrity = runIntegrityV1Schema.parse({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 40,
      reasons: [{ kind: "fixture_anchor", fixtureId: "fixture.synthetic", sequence: 40 }],
    });
    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: createSnapshot(40, acceptedIntegrity),
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        }),
        () => "faulted" as const,
      ),
    ).resolves.toBe("anchored");
    expect(session.getCurrentSnapshot().state.count).toBe(40);
    expect(session.getCurrentSnapshot().integrity).toBe(acceptedIntegrity);
    expect(commandLog.entries()).toEqual([]);
    expect(commandLog.replayBase()).toBe(session.getCurrentSnapshot());
    expect(session.getStatus()).toBe("ready");
  });

  it("prepares replacement side effects only after the candidate is finalized", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    await session.dispatch({ kind: "increment" });
    const before = session.getCurrentSnapshot();
    const entriesBefore = commandLog.entries();
    const invalid = Object.freeze({
      ...createSnapshot(9),
      integrity: Object.freeze({ mode: "invalid" }),
    }) as unknown as Snapshot;
    let prepared = 0;

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: invalid,
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        }),
        () => "faulted" as const,
        () => {
          prepared += 1;
        },
      ),
    ).resolves.toBe("faulted");

    expect(prepared).toBe(0);
    expect(session.getCurrentSnapshot()).toBe(before);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("fault_paused");
  });

  it("rejects a preserve-log replacement that changes the Snapshot before any mutation", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    await session.dispatch({ kind: "increment" });
    const snapshotBefore = session.getCurrentSnapshot();
    const replayBaseBefore = commandLog.replayBase();
    const entriesBefore = commandLog.entries();
    let callbackCalls = 0;

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: createSnapshot(40),
          result: "replaced" as const,
          anchor: "preserve_log" as const,
        }),
        () => "faulted" as const,
        () => {
          callbackCalls += 1;
        },
      ),
    ).resolves.toBe("faulted");

    expect(callbackCalls).toBe(0);
    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.replayBase()).toBe(replayBaseBefore);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("fault_paused");
  });

  it("permits a preserve-log replacement only when it retains the current Snapshot", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    await session.dispatch({ kind: "increment" });
    const snapshotBefore = session.getCurrentSnapshot();
    const replayBaseBefore = commandLog.replayBase();
    const entriesBefore = commandLog.entries();
    let callbackCalls = 0;

    await expect(
      runtimeControl.enqueueAuthoritative(
        async (current) => ({
          kind: "replace" as const,
          snapshot: current as Snapshot,
          result: "preserved" as const,
          anchor: "preserve_log" as const,
        }),
        () => "faulted" as const,
        () => {
          callbackCalls += 1;
        },
      ),
    ).resolves.toBe("preserved");

    expect(callbackCalls).toBe(1);
    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.replayBase()).toBe(replayBaseBefore);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("ready");
  });

  it("resets the command log only after a replay-base replacement callback succeeds", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    expect(commandLog).not.toHaveProperty("append");
    expect(commandLog).not.toHaveProperty("prepareAnchor");
    expect(commandLog).not.toHaveProperty("establishPreparedAnchor");
    expect(commandLog).not.toHaveProperty("establishAnchor");
    expect(commandLog.entries()).toEqual([]);
    await session.dispatch({ kind: "increment" });
    expect(commandLog.entries()).toHaveLength(1);
    const oldReplayBase = commandLog.replayBase();
    const replacement = createSnapshot(40);
    let callbackObservedExistingLog = false;

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: replacement,
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        }),
        () => "faulted" as const,
        (finalized, anchor) => {
          expect(finalized).toBe(replacement);
          expect(anchor).toBe("replace_replay_base");
          expect(commandLog.entries()).toHaveLength(1);
          expect(commandLog.replayBase()).toBe(oldReplayBase);
          callbackObservedExistingLog = true;
        },
      ),
    ).resolves.toBe("anchored");

    expect(callbackObservedExistingLog).toBe(true);
    expect(session.getCurrentSnapshot()).toBe(replacement);
    expect(commandLog.entries()).toEqual([]);
    expect(commandLog.replayBase()).toBe(replacement);
  });

  it("publishes a bound replacement only after every owner and receipt commit", async () => {
    const { session, runtimeControl, commandLog, debugControl } = fixture();
    await session.dispatch({ kind: "increment" });
    const replacement = createSnapshot(10);
    const receipt = Object.freeze({
      migratedStateDigest: digestCanonical("sillymaker:state:v1", replacement),
    }) as never;
    const outcome = Object.freeze({
      kind: "replace" as const,
      snapshot: replacement,
      result: "anchored" as const,
      anchor: "replace_replay_base" as const,
    });
    const publicationContext = createAuthoritativeReplacementPublicationContextInternalV1(
      runtimeControl,
    );
    const phases: string[] = [];
    let firstOwner: AuthoritativeReplacementOwnerInternalV1 | undefined;
    let firstPreparation: AuthoritativeReplacementPreparationInternalV1 | undefined;
    bindAuthoritativeReplacementCommitInternalV1(outcome, {
      prepare: (_snapshot, _anchor, owner, preparation) => {
        firstOwner = owner;
        firstPreparation = preparation;
        return createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: receipt,
          publicationContext,
          commit: () => phases.push("owner_commit"),
          afterPublication: () => {
            expect(readActiveAuthoritativeReplacementPublicationContextInternalV1(runtimeControl))
              .toBeNull();
            phases.push("after_publication");
          },
        });
      },
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    session.subscribe(() => {
      if (session.getCurrentSnapshot() !== replacement || phases.includes("publication")) return;
      expect(commandLog.replayBase()).toBe(replacement);
      expect(commandLog.entries()).toEqual([]);
      expect(readInstalledSaveStateMigrationReceiptInternalV1(runtimeControl)).toBe(receipt);
      expect(readActiveAuthoritativeReplacementPublicationContextInternalV1(runtimeControl)).toBe(
        publicationContext,
      );
      phases.push("publication");
    });

    await expect(
      runtimeControl.enqueueAuthoritative(async () => outcome, () => "faulted" as const),
    ).resolves.toBe("anchored");
    expect(phases).toEqual(["owner_commit", "publication", "after_publication"]);
    expect(readActiveAuthoritativeReplacementPublicationContextInternalV1(runtimeControl))
      .toBeNull();
    expect(readInstalledSaveStateMigrationReceiptInternalV1(runtimeControl)).toBe(receipt);
    if (firstOwner === undefined) throw new TypeError("missing first replacement owner");
    if (firstPreparation === undefined) {
      throw new TypeError("missing first replacement preparation");
    }

    const other = fixture();
    const foreignToken = createPreparedAuthoritativeReplacementCommitInternalV1({
      owner: firstOwner,
      preparation: firstPreparation,
      migrationReceipt: null,
      commit: () => phases.push("foreign_commit"),
    });
    const foreignOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(11),
      result: "should_not_commit" as const,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(foreignOutcome, {
      prepare: () => foreignToken,
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    const otherSnapshot = other.session.getCurrentSnapshot();
    await expect(
      other.runtimeControl.enqueueAuthoritative(
        async () => foreignOutcome,
        () => "faulted" as const,
      ),
    ).resolves.toBe("prepare_failed");
    expect(other.session.getCurrentSnapshot()).toBe(otherSnapshot);
    expect(other.session.getStatus()).toBe("ready");
    expect(phases).not.toContain("foreign_commit");

    const crossOwnerPublicationContext = createAuthoritativeReplacementPublicationContextInternalV1(
      runtimeControl,
    );
    let crossOwnerContextPublications = 0;
    other.session.subscribe(() => {
      if (other.session.getCurrentSnapshot() !== otherSnapshot) {
        crossOwnerContextPublications += 1;
      }
    });
    const crossOwnerContextOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(12),
      result: "should_not_commit" as const,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(crossOwnerContextOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) =>
        createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: null,
          publicationContext: crossOwnerPublicationContext,
          commit: () => phases.push("foreign_context_commit"),
        }),
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    await expect(
      other.runtimeControl.enqueueAuthoritative(
        async () => crossOwnerContextOutcome,
        () => "faulted" as const,
      ),
    ).resolves.toBe("prepare_failed");
    expect(other.session.getCurrentSnapshot()).toBe(otherSnapshot);
    expect(other.session.getStatus()).toBe("ready");
    expect(crossOwnerContextPublications).toBe(0);
    expect(phases).not.toContain("foreign_context_commit");

    await session.dispatch({ kind: "increment" });
    expect(readInstalledSaveStateMigrationReceiptInternalV1(runtimeControl)).toBe(receipt);

    const snapshotBeforeFailure = session.getCurrentSnapshot();
    const logBeforeFailure = commandLog.entries();
    let mismatchedCommits = 0;
    const mismatchedOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(19),
      result: "should_not_commit" as const,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(mismatchedOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) =>
        createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: Object.freeze({
            migratedStateDigest: digestCanonical("sillymaker:state:v1", createSnapshot(999)),
          }) as never,
          commit: () => {
            mismatchedCommits += 1;
          },
        }),
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => mismatchedOutcome,
        () => "faulted" as const,
      ),
    ).resolves.toBe("prepare_failed");
    expect(mismatchedCommits).toBe(0);

    const rejectedOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(20),
      result: "should_not_commit" as const,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(rejectedOutcome, {
      prepare: () => ({}) as never,
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => rejectedOutcome,
        () => "faulted" as const,
      ),
    ).resolves.toBe("prepare_failed");
    expect(session.getCurrentSnapshot()).toBe(snapshotBeforeFailure);
    expect(commandLog.entries()).toBe(logBeforeFailure);
    expect(readInstalledSaveStateMigrationReceiptInternalV1(runtimeControl)).toBe(receipt);
    expect(session.getStatus()).toBe("ready");

    await expect(
      debugControl.anchorReplacement(
        { kind: "fixture", fixtureId: "fixture.receipt-clear" },
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: createSnapshot(30),
            result: "debug_anchor" as const,
          }),
        () => true,
        () => "faulted" as const,
      ),
    ).resolves.toBe("debug_anchor");
    expect(readInstalledSaveStateMigrationReceiptInternalV1(runtimeControl)).toBeNull();
  });

  it("classifies bound candidate admission as a prepare failure without fault-pausing", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    await session.dispatch({ kind: "increment" });
    const snapshotBefore = session.getCurrentSnapshot();
    const replayBaseBefore = commandLog.replayBase();
    const entriesBefore = commandLog.entries();
    let participantPrepareCalls = 0;
    const invalidOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: Object.freeze({
        ...createSnapshot(12),
        integrity: Object.freeze({}),
      }) as never,
      result: "should_not_commit" as const,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(invalidOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) => {
        participantPrepareCalls += 1;
        return createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: null,
          commit: () => undefined,
        });
      },
      normalizePrepareFailure: () => "prepare_failed" as const,
    });

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => invalidOutcome,
        () => "outer_fault" as const,
      ),
    ).resolves.toBe("prepare_failed");
    expect(participantPrepareCalls).toBe(0);
    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.replayBase()).toBe(replayBaseBefore);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("ready");
  });

  it("rejects a prepared participant captured by an earlier replacement attempt", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    const snapshotBefore = session.getCurrentSnapshot();
    const replayBaseBefore = commandLog.replayBase();
    const entriesBefore = commandLog.entries();
    let stashed:
      | ReturnType<typeof createPreparedAuthoritativeReplacementCommitInternalV1>
      | undefined;
    let commits = 0;
    const firstOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(13),
      result: "first" as const,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(firstOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) => {
        stashed = createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: null,
          commit: () => {
            commits += 1;
          },
        });
        throw new Error("synthetic prepare failure after token allocation");
      },
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    await expect(
      runtimeControl.enqueueAuthoritative(async () => firstOutcome, () => "outer_fault" as const),
    ).resolves.toBe("prepare_failed");
    if (stashed === undefined) throw new TypeError("missing stashed participant");
    const stashedPrepared = stashed;

    const secondOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(14),
      result: "second" as const,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(secondOutcome, {
      prepare: () => stashedPrepared,
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    await expect(
      runtimeControl.enqueueAuthoritative(async () => secondOutcome, () => "outer_fault" as const),
    ).resolves.toBe("prepare_failed");

    expect(commits).toBe(0);
    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.replayBase()).toBe(replayBaseBefore);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("ready");
  });

  it("consumes a prepared participant before an unexpected commit throw", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    const snapshotBefore = session.getCurrentSnapshot();
    const replayBaseBefore = commandLog.replayBase();
    const entriesBefore = commandLog.entries();
    let prepared:
      | ReturnType<typeof createPreparedAuthoritativeReplacementCommitInternalV1>
      | undefined;
    let commitCalls = 0;
    const outcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(15),
      result: "should_not_commit" as const,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(outcome, {
      prepare: (_snapshot, _anchor, owner, preparation) => {
        prepared ??= createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: null,
          commit: () => {
            commitCalls += 1;
            throw new Error("synthetic participant commit failure");
          },
        });
        return prepared;
      },
      normalizePrepareFailure: () => "prepare_failed" as const,
    });

    await expect(
      runtimeControl.enqueueAuthoritative(async () => outcome, () => "outer_fault" as const),
    ).resolves.toBe("outer_fault");
    expect(session.getStatus()).toBe("fault_paused");
    await expect(
      runtimeControl.enqueueAuthoritative(async () => outcome, () => "outer_fault" as const),
    ).resolves.toBe("prepare_failed");

    expect(commitCalls).toBe(1);
    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.replayBase()).toBe(replayBaseBefore);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("fault_paused");
  });

  it("atomically commits a package-bound debug anchor and rejects a non-null receipt", async () => {
    const { session, runtimeControl, commandLog, debugControl } = fixture();
    const migratedSnapshot = createSnapshot(16);
    const migratedReceipt = Object.freeze({
      migratedStateDigest: digestCanonical("sillymaker:state:v1", migratedSnapshot),
    }) as never;
    const migratedOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: migratedSnapshot,
      result: "migrated" as const,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(migratedOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) =>
        createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: migratedReceipt,
          commit: () => undefined,
        }),
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => migratedOutcome,
        () => "outer_fault" as const,
      ),
    ).resolves.toBe("migrated");
    expect(readInstalledSaveStateMigrationReceiptInternalV1(runtimeControl)).toBe(migratedReceipt);

    const rejectedBeforeClear = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(160),
      result: "should_not_commit" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(rejectedBeforeClear, {
      prepare: (_snapshot, _anchor, owner, preparation) =>
        createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: migratedReceipt,
          commit: () => undefined,
        }),
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    await expect(
      debugControl.anchorReplacement(
        { kind: "fixture", fixtureId: "fixture.failed-debug-preserves-receipt" },
        async () => rejectedBeforeClear,
        () => true,
        () => "outer_fault" as const,
      ),
    ).resolves.toBe("prepare_failed");
    expect(readInstalledSaveStateMigrationReceiptInternalV1(runtimeControl)).toBe(migratedReceipt);
    expect(session.getCurrentSnapshot()).toBe(migratedSnapshot);
    expect(session.getStatus()).toBe("ready");

    const phases: string[] = [];
    const publicationContext = createAuthoritativeReplacementPublicationContextInternalV1(
      runtimeControl,
    );
    const debugOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(17),
      result: "debug_anchored" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(debugOutcome, {
      prepare: (_snapshot, anchor, owner, preparation) => {
        expect(anchor).toBe("replace_replay_base");
        return createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: null,
          publicationContext,
          commit: () => phases.push("owner_commit"),
          afterPublication: () => phases.push("after_publication"),
        });
      },
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    session.subscribe(() => {
      if (session.getCurrentSnapshot().state.count !== 17 || phases.includes("publication")) return;
      expect(commandLog.entries()).toEqual([]);
      expect(commandLog.replayBase()).toBe(session.getCurrentSnapshot());
      expect(readInstalledSaveStateMigrationReceiptInternalV1(runtimeControl)).toBeNull();
      expect(readActiveAuthoritativeReplacementPublicationContextInternalV1(runtimeControl)).toBe(
        publicationContext,
      );
      phases.push("publication");
    });
    await expect(
      debugControl.anchorReplacement(
        { kind: "fixture", fixtureId: "fixture.atomic-debug" },
        async () => debugOutcome,
        () => true,
        () => "outer_fault" as const,
      ),
    ).resolves.toBe("debug_anchored");
    expect(phases).toEqual(["owner_commit", "publication", "after_publication"]);

    const snapshotBeforeRejection = session.getCurrentSnapshot();
    const logBeforeRejection = commandLog.entries();
    const rejectedDebugOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(18),
      result: "should_not_commit" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(rejectedDebugOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) =>
        createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: migratedReceipt,
          commit: () => phases.push("invalid_receipt_commit"),
        }),
      normalizePrepareFailure: () => "prepare_failed" as const,
    });
    await expect(
      debugControl.anchorReplacement(
        { kind: "fixture", fixtureId: "fixture.invalid-debug-receipt" },
        async () => rejectedDebugOutcome,
        () => true,
        () => "outer_fault" as const,
      ),
    ).resolves.toBe("prepare_failed");
    expect(session.getCurrentSnapshot()).toBe(snapshotBeforeRejection);
    expect(commandLog.entries()).toBe(logBeforeRejection);
    expect(session.getStatus()).toBe("ready");
    expect(phases).not.toContain("invalid_receipt_commit");
  });

  it("normalizes a conflicting exact outcome and callback through the outcome result type", async () => {
    const { session, runtimeControl } = fixture();
    const initial = session.getCurrentSnapshot();
    type DirectResult =
      | { readonly kind: "direct_success" }
      | { readonly kind: "direct_prepare_failed" }
      | { readonly kind: "outer_fault" };
    const directFailure = Object.freeze({ kind: "direct_prepare_failed" as const });
    const directOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(18),
      result: Object.freeze({ kind: "direct_success" as const }),
      anchor: "replace_replay_base" as const,
    });
    const callbackOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(19),
      result: "callback_success" as const,
      anchor: "replace_replay_base" as const,
    });
    let commits = 0;
    bindAuthoritativeReplacementCommitInternalV1(directOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) =>
        createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: null,
          commit: () => {
            commits += 1;
          },
        }),
      normalizePrepareFailure: () => directFailure,
    });
    bindAuthoritativeReplacementCommitInternalV1(callbackOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) =>
        createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: null,
          commit: () => {
            commits += 1;
          },
        }),
      normalizePrepareFailure: () => "callback_prepare_failed" as const,
    });
    const foreignCallback = () => undefined;
    bindAuthoritativeReplacementPrepareCallbackInternalV1(foreignCallback, callbackOutcome);

    await expect(
      runtimeControl.enqueueAuthoritative<DirectResult>(
        async () => directOutcome,
        () => Object.freeze({ kind: "outer_fault" as const }),
        foreignCallback,
      ),
    ).resolves.toBe(directFailure);
    expect(session.getCurrentSnapshot()).toBe(initial);
    expect(session.getStatus()).toBe("ready");
    expect(commits).toBe(0);
  });

  it("does not let a reused result identity carry replacement authority", async () => {
    const { session, runtimeControl } = fixture();
    const sharedResult = Object.freeze({ kind: "anchored" as const });
    const sharedSnapshot = createSnapshot(19);
    let commits = 0;
    const firstOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: sharedSnapshot,
      result: sharedResult,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(firstOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) =>
        createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: null,
          commit: () => {
            commits += 1;
          },
        }),
      normalizePrepareFailure: () => Object.freeze({ kind: "prepare_failed" as const }),
    });
    await expect(
      runtimeControl.enqueueAuthoritative(async () => firstOutcome, () => sharedResult),
    ).resolves.toBe(sharedResult);

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: sharedSnapshot,
            result: "unbound_same_snapshot" as const,
            anchor: "preserve_log" as const,
          }),
        () => "outer_fault" as const,
      ),
    ).resolves.toBe("unbound_same_snapshot");

    const reusedResultOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: createSnapshot(20),
      result: sharedResult,
      anchor: "replace_replay_base" as const,
    });
    await expect(
      runtimeControl.enqueueAuthoritative(async () => reusedResultOutcome, () => sharedResult),
    ).resolves.toBe(sharedResult);
    expect(session.getCurrentSnapshot()).toBe(reusedResultOutcome.snapshot);
    expect(commits).toBe(1);

    const secondOutcome = Object.freeze({
      kind: "replace" as const,
      snapshot: sharedSnapshot,
      result: sharedResult,
      anchor: "replace_replay_base" as const,
    });
    bindAuthoritativeReplacementCommitInternalV1(secondOutcome, {
      prepare: (_snapshot, _anchor, owner, preparation) =>
        createPreparedAuthoritativeReplacementCommitInternalV1({
          owner,
          preparation,
          migrationReceipt: null,
          commit: () => {
            commits += 1;
          },
        }),
      normalizePrepareFailure: () => Object.freeze({ kind: "prepare_failed" as const }),
    });
    await expect(
      runtimeControl.enqueueAuthoritative(async () => secondOutcome, () => sharedResult),
    ).resolves.toBe(sharedResult);
    expect(session.getCurrentSnapshot()).toBe(sharedSnapshot);
    expect(commits).toBe(2);
    expect(session.getStatus()).toBe("ready");
  });

  it.each(
    [
      ["runtime", "returns"],
      ["runtime", "throws"],
      ["debug", "returns"],
      ["debug", "throws"],
    ] as const,
  )(
    "rechecks HMR after a bound %s prepare that %s and before every owner commit",
    async (kind, preparationOutcome) => {
      const created = fixture();
      const snapshotBefore = created.session.getCurrentSnapshot();
      const replayBaseBefore = created.commandLog.replayBase();
      const entriesBefore = created.commandLog.entries();
      let commits = 0;
      type HmrPrepareResult =
        | { readonly kind: "anchored" }
        | { readonly kind: "prepare_failed" }
        | { readonly kind: "outer_fault" }
        | { readonly kind: "hmr_invalidated" };
      const result: HmrPrepareResult = Object.freeze({ kind: "anchored" as const });
      const bind = (outcome: object): void => {
        bindAuthoritativeReplacementCommitInternalV1<Snapshot, HmrPrepareResult>(outcome, {
          prepare: (_snapshot, _anchor, owner, preparation) => {
            created.invalidationController.invalidateForHmr();
            if (preparationOutcome === "throws") {
              throw new Error("synthetic prepare failure after HMR invalidation");
            }
            return createPreparedAuthoritativeReplacementCommitInternalV1({
              owner,
              preparation,
              migrationReceipt: null,
              commit: () => {
                commits += 1;
              },
            });
          },
          normalizePrepareFailure: () => Object.freeze({ kind: "prepare_failed" as const }),
        });
      };

      if (kind === "runtime") {
        const outcome = Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(21),
          result,
          anchor: "replace_replay_base" as const,
        });
        bind(outcome);
        await expect(
          created.runtimeControl.enqueueAuthoritative<HmrPrepareResult>(
            async () => outcome,
            () => Object.freeze({ kind: "outer_fault" as const }),
            undefined,
            () => Object.freeze({ kind: "hmr_invalidated" as const }),
          ),
        ).resolves.toEqual({ kind: "hmr_invalidated" });
      } else {
        const outcome = Object.freeze({
          kind: "replace" as const,
          snapshot: createSnapshot(21),
          result,
        });
        bind(outcome);
        await expect(
          created.debugControl.anchorReplacement<HmrPrepareResult>(
            { kind: "fixture", fixtureId: "fixture.hmr-during-prepare" },
            async () => outcome,
            () => true,
            () => Object.freeze({ kind: "outer_fault" as const }),
          ),
        ).resolves.toEqual({ kind: "not_executed", code: "hmr_invalidated" });
      }
      expect(commits).toBe(0);
      expect(created.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect(created.commandLog.replayBase()).toBe(replayBaseBefore);
      expect(created.commandLog.entries()).toBe(entriesBefore);
      expect(created.session.getStatus()).toBe("hmr_invalidated");
    },
  );

  it("refreshes the private digest after a runtime replay-base replacement", async () => {
    const counter = createSnapshotWorkCounterV1();
    const created = createInstrumentedGameSessionV1<Types>(
      {
        initialSnapshot: createSnapshot(0),
        commandSchema,
        executionContext: undefined,
        executeAttempt(snapshot, command) {
          return attempt(snapshot as Snapshot, command as Command);
        },
        normalizeUnexpectedDispatchFault(_error, snapshot) {
          return attempt(snapshot as Snapshot, { kind: "fault" });
        },
      },
      counter.instrumentation,
    );
    const replacement = createSnapshot(10);
    counter.reset();

    await expect(
      created.runtimeControl.enqueueAuthoritative(
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: replacement,
            result: "anchored" as const,
            anchor: "replace_replay_base" as const,
          }),
        () => "faulted" as const,
      ),
    ).resolves.toBe("anchored");
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 1,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });

    counter.reset();
    await created.session.dispatch({ kind: "increment" });
    const entry = created.commandLog.entries()[0];
    expect(entry?.preStateDigest).toBe(digestCanonical("sillymaker:state:v1", replacement));
    expect(entry?.postStateDigest).toBe(
      digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
    );
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 3,
      canonicalDigests: 1,
      commandLogContinuityVerifications: 1,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
  });

  it("preserves the command log and live Snapshot when a replacement callback fails", async () => {
    const { session, runtimeControl, commandLog } = fixture();
    await session.dispatch({ kind: "increment" });
    const snapshotBefore = session.getCurrentSnapshot();
    const replayBaseBefore = commandLog.replayBase();
    const entriesBefore = commandLog.entries();
    const callbackError = new Error("replacement callback failed");

    await expect(
      runtimeControl.enqueueAuthoritative(
        async () => ({
          kind: "replace" as const,
          snapshot: createSnapshot(40),
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        }),
        () => "faulted" as const,
        () => {
          throw callbackError;
        },
      ),
    ).resolves.toBe("faulted");

    expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(commandLog.replayBase()).toBe(replayBaseBefore);
    expect(commandLog.entries()).toBe(entriesBefore);
    expect(session.getStatus()).toBe("fault_paused");
  });

  it.each(
    [
      [
        "cyclic",
        () => {
          const state = { count: 40 } as { count: number; self?: unknown };
          state.self = state;
          return Object.freeze({
            ...createSnapshot(40),
            state: Object.freeze(state),
          }) as Snapshot;
        },
      ],
      [
        "noncanonical",
        () =>
          Object.freeze({
            ...createSnapshot(40),
            state: Object.freeze({ count: 40, invalid: undefined }),
          }) as Snapshot,
      ],
    ] as const,
  )(
    "rejects a %s replay-base replacement before its callback and preserves live/log state",
    async (_label, replacementFactory) => {
      const { session, runtimeControl, commandLog } = fixture();
      await session.dispatch({ kind: "increment" });
      const snapshotBefore = session.getCurrentSnapshot();
      const replayBaseBefore = commandLog.replayBase();
      const entriesBefore = commandLog.entries();
      let callbackCalls = 0;

      await expect(
        runtimeControl.enqueueAuthoritative(
          async () => ({
            kind: "replace" as const,
            snapshot: replacementFactory(),
            result: "anchored" as const,
            anchor: "replace_replay_base" as const,
          }),
          () => "faulted" as const,
          () => {
            callbackCalls += 1;
          },
        ),
      ).resolves.toBe("faulted");

      expect(callbackCalls).toBe(0);
      expect(session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect(commandLog.replayBase()).toBe(replayBaseBefore);
      expect(commandLog.entries()).toBe(entriesBefore);
      expect(session.getStatus()).toBe("fault_paused");
    },
  );

  it("rejects invalid admission without an attempt", async () => {
    const { session, calls } = fixture();
    await expect(session.dispatch({ kind: "invalid" } as never)).resolves.toEqual({
      kind: "not_executed",
      code: "validation_failed",
    });
    expect(calls()).toBe(0);
  });

  it("publishes busy in the enqueueing tick and executes once", async () => {
    const { session, calls } = fixture();
    const result = session.dispatch({ kind: "increment" });

    expect(session.getStatus()).toBe("busy");
    await expect(result).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(calls()).toBe(1);
  });

  it("serializes dispatch and authoritative replacement on one tail", async () => {
    const order: string[] = [];
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot: Snapshot, command: Command) {
        order.push("dispatch");
        return attempt(snapshot, command);
      },
      normalizeUnexpectedDispatchFault(_error: unknown, snapshot: Snapshot) {
        return attempt(snapshot, { kind: "fault" });
      },
    });
    const dispatch = created.session.dispatch({ kind: "increment" });
    const anchor = created.runtimeControl.enqueueAuthoritative(
      async () => {
        order.push("anchor");
        return {
          kind: "replace" as const,
          snapshot: createSnapshot(10),
          result: "anchored" as const,
          anchor: "replace_replay_base" as const,
        };
      },
      () => "faulted" as const,
    );

    await expect(dispatch).resolves.toMatchObject({ kind: "executed" });
    await expect(anchor).resolves.toBe("anchored");
    expect(order).toEqual(["dispatch", "anchor"]);
    expect(created.session.getCurrentSnapshot().state.count).toBe(10);
  });

  it("reads the latest Snapshot at its FIFO position without executing or replacing", async () => {
    let releaseDispatch: (() => void) | undefined;
    const dispatchBarrier = new Promise<void>((resolve) => {
      releaseDispatch = resolve;
    });
    let calls = 0;
    const created = createGameSessionV1<Types>({
      initialSnapshot: createSnapshot(0),
      commandSchema,
      executionContext: undefined,
      async executeAttempt(snapshot: Snapshot, command: Command) {
        calls += 1;
        await dispatchBarrier;
        return attempt(snapshot, command);
      },
      normalizeUnexpectedDispatchFault(_error: unknown, snapshot: Snapshot) {
        return attempt(snapshot, { kind: "fault" });
      },
    });
    const before = created.session.getCurrentSnapshot();
    const dispatch = created.session.dispatch({ kind: "increment" });
    const read = created.runtimeControl.readAtQueueFront((snapshot) => snapshot);

    expect(created.session).not.toHaveProperty("readAtQueueFront");
    expect(created.session.getStatus()).toBe("busy");
    releaseDispatch?.();
    await expect(dispatch).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    const readSnapshot = await read;
    expect(readSnapshot.state.count).toBe(1);
    expect(readSnapshot).toBe(created.session.getCurrentSnapshot());
    expect(readSnapshot).not.toBe(before);
    expect(calls).toBe(1);
    expect(created.session.getStatus()).toBe("ready");
  });

  it("keeps the FIFO tail usable after a queue-front reader throws", async () => {
    const { session, runtimeControl, calls } = fixture();
    const before = session.getCurrentSnapshot();
    const readerError = new Error("reader failed");

    await expect(
      runtimeControl.readAtQueueFront(() => {
        throw readerError;
      }),
    ).rejects.toBe(readerError);
    expect(session.getCurrentSnapshot()).toBe(before);
    expect(calls()).toBe(0);

    await expect(session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(session.getCurrentSnapshot().state.count).toBe(1);
    expect(calls()).toBe(1);
    expect(session.getStatus()).toBe("ready");
  });

  it("rejects a queue-front thenable and keeps the Session ready", async () => {
    const { session, runtimeControl } = fixture();
    let getterCalls = 0;
    const accessor = {};
    Reflect.defineProperty(accessor, ["th", "en"].join(""), {
      get() {
        getterCalls += 1;
        return () => undefined;
      },
    });

    await expect(runtimeControl.readAtQueueFront(() => accessor)).rejects.toThrow(
      "GameSession queue-front reader returned thenable",
    );
    expect(getterCalls).toBe(1);
    expect(session.getStatus()).toBe("ready");
  });

  it("notifies runtime commit listeners after publication and before dispatch resolves", async () => {
    const listenerFailure = new Error("runtime commit listener failed");
    const runtimeFailures = createRuntimeFailureBufferV1();
    const reportObserverFailure = createRuntimeFailureReporterV1({
      failures: runtimeFailures,
      now: () => "2026-07-14T02:03:04.000Z" as IsoUtcInstant,
      operation: "runtime.observer_notification_failed",
      category: "runtime",
      code: "runtime.async_operation_failed",
    });
    const observations: Array<{
      readonly listener: "throwing" | "following";
      readonly count: number;
      readonly dispatchResolved: boolean;
    }> = [];
    const { session, runtimeControl } = fixture({ onObserverFailure: reportObserverFailure });
    let dispatchResolved = false;
    runtimeControl.subscribeCommittedSnapshots((snapshot) => {
      observations.push({
        listener: "throwing",
        count: snapshot.state.count,
        dispatchResolved,
      });
      throw listenerFailure;
    });
    runtimeControl.subscribeCommittedSnapshots((snapshot) => {
      observations.push({
        listener: "following",
        count: snapshot.state.count,
        dispatchResolved,
      });
      expect(session.getCurrentSnapshot()).toBe(snapshot);
    });

    const dispatch = session.dispatch({ kind: "increment" }).then((result) => {
      dispatchResolved = true;
      return result;
    });
    await expect(dispatch).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(observations).toEqual([
      { listener: "throwing", count: 1, dispatchResolved: false },
      { listener: "following", count: 1, dispatchResolved: false },
    ]);
    expect(runtimeFailures.entries()).toEqual([
      expect.objectContaining({
        operation: "runtime.observer_notification_failed",
        message: "runtime commit listener failed",
      }),
    ]);

    await expect(session.dispatch({ kind: "fault" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "faulted" },
    });
    expect(observations).toHaveLength(2);
    expect(runtimeFailures.entries()).toHaveLength(1);
    expect(session).not.toHaveProperty("subscribeCommittedSnapshots");
  });

  it("isolates throwing subscribers and an observer-failure hook", async () => {
    const subscriberError = new Error("subscriber failed once");
    const observerFailures: unknown[] = [];
    const observations: Array<{ readonly count: number; readonly status: string }> = [];
    const { session } = fixture({
      onObserverFailure(error) {
        observerFailures.push(error);
        throw new Error("observer failure hook also failed");
      },
    });
    let throwOnce = true;
    session.subscribe(() => {
      if (!throwOnce) return;
      throwOnce = false;
      throw subscriberError;
    });
    session.subscribe(() => {
      observations.push({
        count: session.getCurrentSnapshot().state.count,
        status: session.getStatus(),
      });
    });

    await expect(session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(session.getCurrentSnapshot().state.count).toBe(1);
    expect(session.getStatus()).toBe("ready");
    expect(observations[0]).toEqual({ count: 0, status: "busy" });
    expect(observerFailures).toEqual([subscriberError]);

    await expect(session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(session.getCurrentSnapshot().state.count).toBe(2);
    expect(session.getStatus()).toBe("ready");
    expect(observerFailures).toEqual([subscriberError]);
  });

  it("isolates a finalized-attempt observer from logging and commit", async () => {
    const observerError = new Error("attempt observer failed");
    const observerFailures: unknown[] = [];
    const initial = createSnapshot(0);
    const created = createGameSessionV1<Types>({
      initialSnapshot: initial,
      commandSchema,
      executionContext: undefined,
      executeAttempt(snapshot, command) {
        return attempt(snapshot as Snapshot, command as Command);
      },
      normalizeUnexpectedDispatchFault(_error, snapshot) {
        return attempt(snapshot as Snapshot, { kind: "fault" });
      },
      onAttempt() {
        throw observerError;
      },
      onObserverFailure(error) {
        observerFailures.push(error);
      },
    });

    await expect(created.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });

    expect(created.session.getCurrentSnapshot().state.count).toBe(1);
    expect(created.commandLog.entries()).toHaveLength(1);
    expect(created.commandLog.entries()[0]?.outcome.kind).toBe("committed");
    expect(created.session.getStatus()).toBe("ready");
    expect(observerFailures).toEqual([observerError]);
  });
});
