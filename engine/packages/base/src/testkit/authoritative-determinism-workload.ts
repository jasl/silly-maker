// SPDX-License-Identifier: MIT
import {
  commitAttemptV1,
  faultAttemptV1,
  rejectAttemptV1,
  type CommandExecutionAttemptEnvelopeV1,
} from "../contracts/execution.ts";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../contracts/gameplay-module.ts";
import {
  createTransactionalRngV1,
  type RngDrawTraceV1,
  type RngStateV1,
} from "../contracts/rng.ts";
import type { GameSnapshotEnvelopeV1 } from "../contracts/snapshot.ts";
import { createPristineRunIntegrityV1 } from "../contracts/snapshot.ts";
import type { RuntimeSessionStatusV1 } from "../contracts/session-status.ts";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "../contracts/values.ts";
import { parseNonNegativeSafeInteger, parseNonZeroUint32 } from "../contracts/values.ts";
import {
  createPurposeTaggedSnapshotWorkCounterV1,
  createSnapshotWorkCounterV1,
  type PurposeTaggedSnapshotWorkCountsV1,
  type SnapshotWorkEventV1,
  type SnapshotWorkInstrumentationV1,
  type SnapshotWorkPurposeV1,
} from "../internal/snapshot-work-instrumentation.ts";
import {
  createInstrumentedGameSessionV1,
  type GameSessionV1,
} from "../runtime/session/game-session.ts";

export const authoritativeDeterminismCommandClassesV1 = Object.freeze(
  ["no_draw_committed", "rng_committed", "rejected", "faulted"] as const,
);
export type AuthoritativeDeterminismCommandClassV1 =
  (typeof authoritativeDeterminismCommandClassesV1)[number];

export const authoritativeDeterminismDrawPurposeV1 = "check:determinism.workload" as const;

const authoritativeDeterminismRngSeedV1 = 97;
const authoritativeDeterminismExclusiveMaxV1 = 7;

export interface AuthoritativeDeterminismStateV1 {
  readonly value: NonNegativeSafeInteger;
}

export type AuthoritativeDeterminismSnapshotV1 = GameSnapshotEnvelopeV1<
  AuthoritativeDeterminismStateV1,
  RngStateV1
>;

export interface AuthoritativeDeterminismCommandV1 {
  readonly kind: AuthoritativeDeterminismCommandClassV1;
}

export interface AuthoritativeDeterminismFactV1 {
  readonly kind: "determinism.committed";
  readonly commandClass: "no_draw_committed" | "rng_committed";
  readonly result: NonNegativeSafeInteger | null;
}

export interface AuthoritativeDeterminismRejectionV1 {
  readonly code: "determinism.rejected";
}

export interface AuthoritativeDeterminismFaultV1 {
  readonly code: "determinism.faulted";
}

interface AuthoritativeDeterminismTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    AuthoritativeDeterminismStateV1,
    RngStateV1
  > {
  readonly snapshot: AuthoritativeDeterminismSnapshotV1;
  readonly command: AuthoritativeDeterminismCommandV1;
  readonly fact: AuthoritativeDeterminismFactV1;
  readonly rejection: AuthoritativeDeterminismRejectionV1;
  readonly fault: AuthoritativeDeterminismFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: never;
  readonly rngState: RngStateV1;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly executionContext: undefined;
}

type AuthoritativeDeterminismAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  AuthoritativeDeterminismSnapshotV1,
  AuthoritativeDeterminismFactV1,
  AuthoritativeDeterminismRejectionV1,
  AuthoritativeDeterminismFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export type AuthoritativeDeterminismDispatchResultV1 = Awaited<
  ReturnType<GameSessionV1<AuthoritativeDeterminismTypesV1>["dispatch"]>
>;

export interface AuthoritativeDeterminismWorkCountsV1 {
  readonly canonicalTraversals: number;
  readonly canonicalDigests: number;
  readonly deepFreezeTraversals: number;
  readonly commandLogContinuityVerifications: number;
  readonly purposes: PurposeTaggedSnapshotWorkCountsV1;
}

export interface AuthoritativeDeterminismWorkloadDescriptorV1 {
  readonly workloadId: string;
  readonly commandClass: AuthoritativeDeterminismCommandClassV1;
  readonly rngSeed: 97;
  readonly exclusiveMax: 7;
  readonly drawPurpose: typeof authoritativeDeterminismDrawPurposeV1;
}

export type AuthoritativeDeterminismCommandLogOutcomeV1 =
  | {
    readonly kind: "committed";
    readonly facts: readonly DeepReadonly<AuthoritativeDeterminismFactV1>[];
  }
  | {
    readonly kind: "rejected";
    readonly reasons: readonly DeepReadonly<AuthoritativeDeterminismRejectionV1>[];
  }
  | {
    readonly kind: "faulted";
    readonly fault: DeepReadonly<AuthoritativeDeterminismFaultV1>;
  };

export interface AuthoritativeDeterminismCommandLogEntryV1 {
  readonly source: "game";
  readonly command: DeepReadonly<AuthoritativeDeterminismCommandV1>;
  readonly logOrdinal: PositiveSafeInteger;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
  readonly commandSequence: {
    readonly before: NonNegativeSafeInteger;
    readonly after: NonNegativeSafeInteger;
  };
  readonly committedRngBefore: DeepReadonly<RngStateV1>;
  readonly attemptedDraws: readonly DeepReadonly<RngDrawTraceV1>[];
  readonly candidateRngAfter?: DeepReadonly<RngStateV1>;
  readonly committedRngAfter: DeepReadonly<RngStateV1>;
  readonly outcome: AuthoritativeDeterminismCommandLogOutcomeV1;
}

export interface AuthoritativeDeterminismWorkloadRunV1 {
  readonly dispatchResult: AuthoritativeDeterminismDispatchResultV1;
  readonly status: RuntimeSessionStatusV1;
  readonly initialSnapshot: DeepReadonly<AuthoritativeDeterminismSnapshotV1>;
  readonly currentSnapshot: DeepReadonly<AuthoritativeDeterminismSnapshotV1>;
  readonly snapshotRetained: boolean;
  readonly commandLog: readonly AuthoritativeDeterminismCommandLogEntryV1[];
  readonly counts: AuthoritativeDeterminismWorkCountsV1;
}

export interface PreparedAuthoritativeDeterminismWorkloadV1 {
  readonly descriptor: AuthoritativeDeterminismWorkloadDescriptorV1;
  readonly setupCounts: AuthoritativeDeterminismWorkCountsV1;
  runOnce(): Promise<AuthoritativeDeterminismWorkloadRunV1>;
}

interface CompositeSnapshotWorkCounterV1 {
  readonly instrumentation: SnapshotWorkInstrumentationV1;
  reset(): void;
  snapshot(): AuthoritativeDeterminismWorkCountsV1;
}

function createCompositeSnapshotWorkCounterV1(): CompositeSnapshotWorkCounterV1 {
  const totals = createSnapshotWorkCounterV1();
  const purposes = createPurposeTaggedSnapshotWorkCounterV1();
  const instrumentation: SnapshotWorkInstrumentationV1 = Object.freeze({
    record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
      totals.instrumentation.record(event, purpose);
      purposes.instrumentation.record(event, purpose);
    },
  });
  return Object.freeze({
    instrumentation,
    reset() {
      totals.reset();
      purposes.reset();
    },
    snapshot(): AuthoritativeDeterminismWorkCountsV1 {
      const counts = totals.snapshot();
      return Object.freeze({
        canonicalTraversals: counts.canonicalTraversals,
        canonicalDigests: counts.canonicalDigests,
        deepFreezeTraversals: counts.deepFreezeTraversals,
        commandLogContinuityVerifications: counts.commandLogContinuityVerifications,
        purposes: purposes.snapshot(),
      });
    },
  });
}

const commandSchemaV1: RuntimeSchemaV1<AuthoritativeDeterminismCommandV1> = Object.freeze({
  parse(value: unknown): AuthoritativeDeterminismCommandV1 {
    const kind = value !== null && typeof value === "object" && !Array.isArray(value)
      ? Reflect.get(value, "kind")
      : undefined;
    if (
      !authoritativeDeterminismCommandClassesV1.some(
        (candidate: AuthoritativeDeterminismCommandClassV1) => candidate === kind,
      )
    ) {
      throw new TypeError("invalid authoritative determinism command");
    }
    return Object.freeze({ kind: kind as AuthoritativeDeterminismCommandClassV1 });
  },
});

function createAuthoritativeDeterminismInitialSnapshotV1(): AuthoritativeDeterminismSnapshotV1 {
  return {
    state: { value: parseNonNegativeSafeInteger(0) },
    rng: createTransactionalRngV1(parseNonZeroUint32(authoritativeDeterminismRngSeedV1))
      .candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  };
}

function executeAuthoritativeDeterminismAttemptV1(
  current: DeepReadonly<AuthoritativeDeterminismSnapshotV1>,
  command: DeepReadonly<AuthoritativeDeterminismCommandV1>,
): AuthoritativeDeterminismAttemptV1 {
  const rng = createTransactionalRngV1(current.rng);
  if (command.kind === "no_draw_committed") {
    const snapshot: AuthoritativeDeterminismSnapshotV1 = {
      state: { value: parseNonNegativeSafeInteger(current.state.value + 1) },
      rng: rng.candidateState(),
      commandSequence: parseNonNegativeSafeInteger(current.commandSequence + 1),
      integrity: current.integrity,
    };
    return commitAttemptV1(current, snapshot, rng, [
      Object.freeze({
        kind: "determinism.committed" as const,
        commandClass: "no_draw_committed" as const,
        result: null,
      }),
    ]);
  }

  const result = rng.nextInt({
    exclusiveMax: authoritativeDeterminismExclusiveMaxV1,
    purpose: authoritativeDeterminismDrawPurposeV1,
  });
  if (command.kind === "rejected") {
    return rejectAttemptV1(current, rng, [
      Object.freeze({ code: "determinism.rejected" as const }),
    ]);
  }
  if (command.kind === "faulted") {
    return faultAttemptV1(
      current,
      rng,
      Object.freeze({ code: "determinism.faulted" as const }),
    );
  }
  const snapshot: AuthoritativeDeterminismSnapshotV1 = {
    state: { value: result },
    rng: rng.candidateState(),
    commandSequence: parseNonNegativeSafeInteger(current.commandSequence + 1),
    integrity: current.integrity,
  };
  return commitAttemptV1(current, snapshot, rng, [
    Object.freeze({
      kind: "determinism.committed" as const,
      commandClass: "rng_committed" as const,
      result,
    }),
  ]);
}

function createAuthoritativeDeterminismWorkloadV1(
  counter: CompositeSnapshotWorkCounterV1,
) {
  const created = createInstrumentedGameSessionV1<AuthoritativeDeterminismTypesV1>(
    {
      initialSnapshot: createAuthoritativeDeterminismInitialSnapshotV1(),
      commandSchema: commandSchemaV1,
      executionContext: undefined,
      executeAttempt: executeAuthoritativeDeterminismAttemptV1,
      normalizeUnexpectedDispatchFault(
        _error: unknown,
        snapshot: DeepReadonly<AuthoritativeDeterminismSnapshotV1>,
      ): AuthoritativeDeterminismAttemptV1 {
        const rng = createTransactionalRngV1(snapshot.rng);
        rng.nextInt({
          exclusiveMax: authoritativeDeterminismExclusiveMaxV1,
          purpose: authoritativeDeterminismDrawPurposeV1,
        });
        return faultAttemptV1(
          snapshot,
          rng,
          Object.freeze({ code: "determinism.faulted" as const }),
        );
      },
    },
    counter.instrumentation,
  );
  return Object.freeze({
    snapshot: () => created.session.getCurrentSnapshot(),
    status: () => created.session.getStatus(),
    commandLog: () => created.commandLog.entries(),
    dispatch(commandClass: AuthoritativeDeterminismCommandClassV1) {
      return created.session.dispatch(Object.freeze({ kind: commandClass }));
    },
  });
}

/** Prepares one neutral Session/evidence characterization and its deterministic work counts. */
export function prepareAuthoritativeDeterminismWorkloadV1(input: {
  readonly commandClass: AuthoritativeDeterminismCommandClassV1;
}): PreparedAuthoritativeDeterminismWorkloadV1 {
  if (!authoritativeDeterminismCommandClassesV1.includes(input.commandClass)) {
    throw new TypeError("unsupported authoritative determinism command class");
  }
  const counter = createCompositeSnapshotWorkCounterV1();
  const workload = createAuthoritativeDeterminismWorkloadV1(counter);
  const setupCounts = counter.snapshot();
  counter.reset();
  const initialSnapshot = workload.snapshot();
  let dispatched = false;
  return Object.freeze({
    descriptor: Object.freeze({
      workloadId: `authoritative-determinism-v1/${input.commandClass}`,
      commandClass: input.commandClass,
      rngSeed: authoritativeDeterminismRngSeedV1,
      exclusiveMax: authoritativeDeterminismExclusiveMaxV1,
      drawPurpose: authoritativeDeterminismDrawPurposeV1,
    }),
    setupCounts,
    async runOnce(): Promise<AuthoritativeDeterminismWorkloadRunV1> {
      if (dispatched) {
        throw new TypeError("Authoritative determinism workload can only run once");
      }
      dispatched = true;
      const dispatchResult = await workload.dispatch(input.commandClass);
      const currentSnapshot = workload.snapshot();
      return Object.freeze({
        dispatchResult,
        status: workload.status(),
        initialSnapshot,
        currentSnapshot,
        snapshotRetained: currentSnapshot === initialSnapshot,
        commandLog: workload.commandLog() as readonly AuthoritativeDeterminismCommandLogEntryV1[],
        counts: counter.snapshot(),
      });
    },
  });
}

type UnsafeAuthoritativeDeterminismCaseV1 =
  | "fractional_command"
  | "fractional_fact"
  | "fractional_rejection"
  | "fractional_fault"
  | "fractional_rng_draw"
  | "fractional_rng_state"
  | "illegal_fallback_fault";

interface UnsafeAuthoritativeDeterminismStateV1 {
  readonly value: number;
}

type UnsafeAuthoritativeDeterminismSnapshotV1 = GameSnapshotEnvelopeV1<
  UnsafeAuthoritativeDeterminismStateV1,
  RngStateV1
>;

interface UnsafeAuthoritativeDeterminismCommandV1 {
  readonly kind: UnsafeAuthoritativeDeterminismCaseV1;
  readonly amount: number;
}

type UnsafeAuthoritativeDeterminismFactV1 =
  | { readonly kind: "determinism.unsafe_committed" }
  | { readonly kind: "determinism.unsafe_fact"; readonly value: number };

interface UnsafeAuthoritativeDeterminismRejectionV1 {
  readonly code: "determinism.unsafe_rejection";
  readonly value: number;
}

type UnsafeAuthoritativeDeterminismFaultV1 =
  | { readonly code: "determinism.unsafe_fault"; readonly value: number }
  | { readonly code: "determinism.illegal_fallback" };

interface UnsafeAuthoritativeDeterminismTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    UnsafeAuthoritativeDeterminismStateV1,
    RngStateV1
  > {
  readonly snapshot: UnsafeAuthoritativeDeterminismSnapshotV1;
  readonly command: UnsafeAuthoritativeDeterminismCommandV1;
  readonly fact: UnsafeAuthoritativeDeterminismFactV1;
  readonly rejection: UnsafeAuthoritativeDeterminismRejectionV1;
  readonly fault: UnsafeAuthoritativeDeterminismFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: never;
  readonly rngState: RngStateV1;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly executionContext: undefined;
}

type UnsafeAuthoritativeDeterminismAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  UnsafeAuthoritativeDeterminismSnapshotV1,
  UnsafeAuthoritativeDeterminismFactV1,
  UnsafeAuthoritativeDeterminismRejectionV1,
  UnsafeAuthoritativeDeterminismFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

interface UnsafeRngStateEvidenceV1 {
  readonly algorithm: "xorshift32-v1";
  readonly cursor: number;
  readonly rawDrawCount: number;
}

interface UnsafeAuthoritativeDeterminismCommandLogEntryV1 {
  readonly source: "game";
  readonly command: DeepReadonly<UnsafeAuthoritativeDeterminismCommandV1>;
  readonly logOrdinal: PositiveSafeInteger;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
  readonly commandSequence: {
    readonly before: NonNegativeSafeInteger;
    readonly after: NonNegativeSafeInteger;
  };
  readonly committedRngBefore: UnsafeRngStateEvidenceV1;
  readonly attemptedDraws: readonly {
    readonly ordinal: number;
    readonly purpose: string;
    readonly exclusiveMax: number;
    readonly result: number;
    readonly before: UnsafeRngStateEvidenceV1;
    readonly after: UnsafeRngStateEvidenceV1;
  }[];
  readonly candidateRngAfter: UnsafeRngStateEvidenceV1;
  readonly committedRngAfter: UnsafeRngStateEvidenceV1;
  readonly outcome:
    | {
      readonly kind: "committed";
      readonly facts: readonly UnsafeAuthoritativeDeterminismFactV1[];
    }
    | {
      readonly kind: "rejected";
      readonly reasons: readonly UnsafeAuthoritativeDeterminismRejectionV1[];
    }
    | { readonly kind: "faulted"; readonly fault: UnsafeAuthoritativeDeterminismFaultV1 };
}

function createUnsafeInitialSnapshotV1(): UnsafeAuthoritativeDeterminismSnapshotV1 {
  return {
    state: { value: 0 },
    rng: createTransactionalRngV1(parseNonZeroUint32(authoritativeDeterminismRngSeedV1))
      .candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  };
}

function createUnsafeCommittedSnapshotV1(
  current: DeepReadonly<UnsafeAuthoritativeDeterminismSnapshotV1>,
  value: number,
): UnsafeAuthoritativeDeterminismSnapshotV1 {
  return {
    state: { value },
    rng: current.rng,
    commandSequence: parseNonNegativeSafeInteger(current.commandSequence + 1),
    integrity: current.integrity,
  };
}

function fractionalRngEvidenceAttemptV1(
  current: DeepReadonly<UnsafeAuthoritativeDeterminismSnapshotV1>,
  field: "draw_result" | "candidate_raw_draw_count",
): UnsafeAuthoritativeDeterminismAttemptV1 {
  const rng = createTransactionalRngV1(current.rng);
  rng.nextInt({
    exclusiveMax: authoritativeDeterminismExclusiveMaxV1,
    purpose: authoritativeDeterminismDrawPurposeV1,
  });
  const attempted = rng.attemptedDraws()[0];
  if (attempted === undefined) throw new TypeError("expected unsafe RNG draw");
  const candidate = rng.candidateState();
  return Object.freeze({
    result: Object.freeze({
      kind: "rejected" as const,
      snapshot: current,
      reasons: Object.freeze([
        Object.freeze({ code: "determinism.unsafe_rejection" as const, value: 1 }),
      ]),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: current.rng,
      attemptedDraws: Object.freeze([
        field === "draw_result" ? Object.freeze({ ...attempted, result: 0.5 }) : attempted,
      ]),
      candidateRngAfter: field === "candidate_raw_draw_count"
        ? Object.freeze({ ...candidate, rawDrawCount: 0.5 })
        : candidate,
      committedRngAfter: current.rng,
    }),
  }) as unknown as UnsafeAuthoritativeDeterminismAttemptV1;
}

function unsafeAttemptV1(
  current: DeepReadonly<UnsafeAuthoritativeDeterminismSnapshotV1>,
  command: DeepReadonly<UnsafeAuthoritativeDeterminismCommandV1>,
): UnsafeAuthoritativeDeterminismAttemptV1 {
  const rng = createTransactionalRngV1(current.rng);
  switch (command.kind) {
    case "fractional_command":
      return commitAttemptV1(
        current,
        createUnsafeCommittedSnapshotV1(current, 1),
        rng,
        [Object.freeze({ kind: "determinism.unsafe_committed" as const })],
      );
    case "fractional_fact":
      return commitAttemptV1(current, createUnsafeCommittedSnapshotV1(current, 1), rng, [
        Object.freeze({ kind: "determinism.unsafe_fact" as const, value: 0.5 }),
      ]);
    case "fractional_rejection":
      return rejectAttemptV1(current, rng, [
        Object.freeze({ code: "determinism.unsafe_rejection" as const, value: 0.75 }),
      ]);
    case "fractional_fault":
      return faultAttemptV1(
        current,
        rng,
        Object.freeze({ code: "determinism.unsafe_fault" as const, value: 0.875 }),
      );
    case "fractional_rng_draw":
      return fractionalRngEvidenceAttemptV1(current, "draw_result");
    case "fractional_rng_state":
      return fractionalRngEvidenceAttemptV1(current, "candidate_raw_draw_count");
    case "illegal_fallback_fault":
      return commitAttemptV1(
        current,
        {
          ...createUnsafeCommittedSnapshotV1(current, 1),
          integrity: createPristineRunIntegrityV1(),
        },
        rng,
        Object.freeze([]),
      );
  }
  throw new TypeError("unsupported unsafe authoritative determinism case");
}

/** @internal Unsafe characterization factory; intentionally absent from the testkit barrel. */
export function createUnsafeAuthoritativeDeterminismWorkloadV1(
  unsafeCase: UnsafeAuthoritativeDeterminismCaseV1,
) {
  const counter = createCompositeSnapshotWorkCounterV1();
  let normalizerCalls = 0;
  const initialSnapshot = createUnsafeInitialSnapshotV1();
  const commandAmount = unsafeCase === "fractional_command" ? 0.25 : 1;
  const command = Object.freeze({ kind: unsafeCase, amount: commandAmount });
  const commandSchema: RuntimeSchemaV1<UnsafeAuthoritativeDeterminismCommandV1> = Object.freeze({
    parse: () => command,
  });
  const created = createInstrumentedGameSessionV1<UnsafeAuthoritativeDeterminismTypesV1>(
    {
      initialSnapshot,
      commandSchema,
      executionContext: undefined,
      executeAttempt: unsafeAttemptV1,
      normalizeUnexpectedDispatchFault(
        _error: unknown,
        snapshot: DeepReadonly<UnsafeAuthoritativeDeterminismSnapshotV1>,
      ): UnsafeAuthoritativeDeterminismAttemptV1 {
        normalizerCalls += 1;
        const replacement: UnsafeAuthoritativeDeterminismSnapshotV1 = {
          state: { ...snapshot.state },
          rng: snapshot.rng,
          commandSequence: snapshot.commandSequence,
          integrity: snapshot.integrity,
        };
        return faultAttemptV1(
          replacement,
          createTransactionalRngV1(snapshot.rng),
          Object.freeze({ code: "determinism.illegal_fallback" as const }),
        );
      },
    },
    counter.instrumentation,
  );
  counter.reset();
  return Object.freeze({
    initialSnapshot: created.session.getCurrentSnapshot(),
    dispatch() {
      return created.session.dispatch(command);
    },
    status: () => created.session.getStatus(),
    snapshot: () => created.session.getCurrentSnapshot(),
    commandLog: () =>
      created.commandLog.entries() as readonly UnsafeAuthoritativeDeterminismCommandLogEntryV1[],
    replayBase: () => created.commandLog.replayBase(),
    counts: () => counter.snapshot(),
    normalizerCalls: () => normalizerCalls,
  });
}
