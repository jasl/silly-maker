// SPDX-License-Identifier: MIT
import {
  commitAttemptV1,
  faultAttemptV1,
  rejectAttemptV1,
  type CommandExecutionAttemptEnvelopeV1,
} from "../contracts/execution.ts";
import { digestBytes } from "../contracts/digest.ts";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../contracts/gameplay-module.ts";
import type { BuildProvenanceV1 } from "../contracts/provenance.ts";
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
  NonZeroUint32,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "../contracts/values.ts";
import {
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "../contracts/values.ts";
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
import {
  replayAuthoritativelyFromAttemptsInternalV1,
  type ReplayComparisonV1,
} from "../runtime/diagnostics/replay.ts";

export const authoritativeDeterminismCommandClassesV1 = [
  "no_draw_committed",
  "rng_committed",
  "rejected",
  "faulted",
] as const;
export type AuthoritativeDeterminismCommandClassV1 =
  (typeof authoritativeDeterminismCommandClassesV1)[number];

export const authoritativeDeterminismDrawPurposeV1 = "check:determinism.workload" as const;

const unsafeAuthoritativeDeterminismRngSeedV1 = 97;
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

export interface AuthoritativeDeterminismEventV1 {
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
  readonly event: AuthoritativeDeterminismEventV1;
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
  AuthoritativeDeterminismEventV1,
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
  readonly commandLogContinuityVerifications: number;
  readonly purposes: PurposeTaggedSnapshotWorkCountsV1;
}

export interface AuthoritativeDeterminismWorkloadDescriptorV1 {
  readonly workloadId: string;
  readonly commandClass: AuthoritativeDeterminismCommandClassV1;
  readonly rngSeed: NonZeroUint32;
  readonly exclusiveMax: 7;
  readonly drawPurpose: typeof authoritativeDeterminismDrawPurposeV1;
}

export type AuthoritativeDeterminismCommandLogOutcomeV1 =
  | {
    readonly kind: "committed";
    readonly events: readonly DeepReadonly<AuthoritativeDeterminismEventV1>[];
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

export const authoritativeDeterminismTranscriptCommandClassesV1 = [
  "no_draw_committed",
  "rejected",
  "rng_committed",
  "faulted",
] as const;

export interface AuthoritativeDeterminismTranscriptStepV1 {
  readonly commandClass: AuthoritativeDeterminismCommandClassV1;
  readonly dispatchResult: AuthoritativeDeterminismDispatchResultV1;
  readonly status: RuntimeSessionStatusV1;
  readonly snapshotRetained: boolean;
  readonly commandLogEntry: AuthoritativeDeterminismCommandLogEntryV1;
}

export interface AuthoritativeDeterminismReplayWorkloadV1 {
  readonly initialSnapshot: DeepReadonly<AuthoritativeDeterminismSnapshotV1>;
  readonly currentSnapshot: DeepReadonly<AuthoritativeDeterminismSnapshotV1>;
  readonly commandLog: readonly AuthoritativeDeterminismCommandLogEntryV1[];
}

export interface AuthoritativeDeterminismTranscriptRunV1
  extends AuthoritativeDeterminismReplayWorkloadV1 {
  readonly steps: readonly AuthoritativeDeterminismTranscriptStepV1[];
  readonly status: RuntimeSessionStatusV1;
  readonly replay: ReplayComparisonV1;
}

interface CompositeSnapshotWorkCounterV1 {
  readonly instrumentation: SnapshotWorkInstrumentationV1;
  reset(): void;
  snapshot(): AuthoritativeDeterminismWorkCountsV1;
}

function createCompositeSnapshotWorkCounterV1(): CompositeSnapshotWorkCounterV1 {
  const totals = createSnapshotWorkCounterV1();
  const purposes = createPurposeTaggedSnapshotWorkCounterV1();
  const instrumentation: SnapshotWorkInstrumentationV1 = {
    record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
      totals.instrumentation.record(event, purpose);
      purposes.instrumentation.record(event, purpose);
    },
  };
  return ({
    instrumentation,
    reset() {
      totals.reset();
      purposes.reset();
    },
    snapshot(): AuthoritativeDeterminismWorkCountsV1 {
      const counts = totals.snapshot();
      return ({
        canonicalTraversals: counts.canonicalTraversals,
        canonicalDigests: counts.canonicalDigests,
        commandLogContinuityVerifications: counts.commandLogContinuityVerifications,
        purposes: purposes.snapshot(),
      });
    },
  });
}

const commandSchemaV1: RuntimeSchemaV1<AuthoritativeDeterminismCommandV1> = {
  parse(value: unknown): AuthoritativeDeterminismCommandV1 {
    const kind = value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as { readonly kind?: unknown }).kind
      : undefined;
    if (
      !authoritativeDeterminismCommandClassesV1.some(
        (candidate: AuthoritativeDeterminismCommandClassV1) => candidate === kind,
      )
    ) {
      throw new TypeError("invalid authoritative determinism command");
    }
    return ({ kind: kind as AuthoritativeDeterminismCommandClassV1 });
  },
};

function createAuthoritativeDeterminismInitialSnapshotV1(
  rngSeed: NonZeroUint32,
): AuthoritativeDeterminismSnapshotV1 {
  return {
    state: { value: parseNonNegativeSafeInteger(0) },
    rng: createTransactionalRngV1(rngSeed).candidateState(),
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
      {
        kind: "determinism.committed" as const,
        commandClass: "no_draw_committed" as const,
        result: null,
      },
    ]);
  }

  const result = rng.nextInt({
    exclusiveMax: authoritativeDeterminismExclusiveMaxV1,
    purpose: authoritativeDeterminismDrawPurposeV1,
  });
  if (command.kind === "rejected") {
    return rejectAttemptV1(current, rng, [
      { code: "determinism.rejected" as const },
    ]);
  }
  if (command.kind === "faulted") {
    return faultAttemptV1(
      current,
      rng,
      { code: "determinism.faulted" as const },
    );
  }
  const snapshot: AuthoritativeDeterminismSnapshotV1 = {
    state: { value: result },
    rng: rng.candidateState(),
    commandSequence: parseNonNegativeSafeInteger(current.commandSequence + 1),
    integrity: current.integrity,
  };
  return commitAttemptV1(current, snapshot, rng, [
    {
      kind: "determinism.committed" as const,
      commandClass: "rng_committed" as const,
      result,
    },
  ]);
}

function createAuthoritativeDeterminismWorkloadV1(
  counter: CompositeSnapshotWorkCounterV1,
  rngSeed: NonZeroUint32,
) {
  const created = createInstrumentedGameSessionV1<AuthoritativeDeterminismTypesV1>(
    {
      initialSnapshot: createAuthoritativeDeterminismInitialSnapshotV1(rngSeed),
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
          { code: "determinism.faulted" as const },
        );
      },
    },
    counter.instrumentation,
  );
  return ({
    snapshot: () => created.session.getCurrentSnapshot(),
    status: () => created.session.getStatus(),
    commandLog: () => created.commandLog.entries(),
    dispatch(commandClass: AuthoritativeDeterminismCommandClassV1) {
      return created.session.dispatch({ kind: commandClass });
    },
  });
}

/** Prepares one neutral Session/evidence characterization and its deterministic work counts. */
export function prepareAuthoritativeDeterminismWorkloadV1(input: {
  readonly commandClass: AuthoritativeDeterminismCommandClassV1;
  readonly bootstrapInput: { readonly rngSeed: number };
}): PreparedAuthoritativeDeterminismWorkloadV1 {
  if (!authoritativeDeterminismCommandClassesV1.includes(input.commandClass)) {
    throw new TypeError("unsupported authoritative determinism command class");
  }
  const rngSeed = parseNonZeroUint32(input.bootstrapInput.rngSeed);
  const counter = createCompositeSnapshotWorkCounterV1();
  const workload = createAuthoritativeDeterminismWorkloadV1(counter, rngSeed);
  const setupCounts = counter.snapshot();
  counter.reset();
  const initialSnapshot = workload.snapshot();
  let dispatched = false;
  return ({
    descriptor: {
      workloadId: `authoritative-determinism-v1/${input.commandClass}`,
      commandClass: input.commandClass,
      rngSeed,
      exclusiveMax: authoritativeDeterminismExclusiveMaxV1,
      drawPurpose: authoritativeDeterminismDrawPurposeV1,
    },
    setupCounts,
    async runOnce(): Promise<AuthoritativeDeterminismWorkloadRunV1> {
      if (dispatched) {
        throw new TypeError("Authoritative determinism workload can only run once");
      }
      dispatched = true;
      const dispatchResult = await workload.dispatch(input.commandClass);
      const currentSnapshot = workload.snapshot();
      return ({
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

const authoritativeDeterminismReplayDigestV1 = (label: string) =>
  digestBytes(new TextEncoder().encode(`authoritative-determinism-replay-v1:${label}`));

const authoritativeDeterminismReplayProvenanceV1: BuildProvenanceV1 = {
  story: {
    id: "story.authoritative-determinism-replay",
    revision: parsePositiveSafeInteger(1),
    digest: authoritativeDeterminismReplayDigestV1("story"),
  },
  engine: {
    version: "authoritative-determinism-replay-v1",
    digest: authoritativeDeterminismReplayDigestV1("engine"),
  },
  resolved: {
    stateContractRevision: parsePositiveSafeInteger(1),
    stateContractDigest: authoritativeDeterminismReplayDigestV1("state-contract"),
    simulationDigest: authoritativeDeterminismReplayDigestV1("simulation"),
    presentationDigest: authoritativeDeterminismReplayDigestV1("presentation"),
    patchSet: {
      digest: authoritativeDeterminismReplayDigestV1("patch-set"),
      simulationDigest: authoritativeDeterminismReplayDigestV1("patch-set-simulation"),
      presentationDigest: authoritativeDeterminismReplayDigestV1("patch-set-presentation"),
      appliedHotfixes: [],
    },
  },
};

/**
 * Runs one prepared neutral workload through the production authoritative replay comparator.
 *
 * @internal Test-only parity seam; exported only from the narrow determinism testkit subpath.
 */
export async function replayAuthoritativeDeterminismWorkloadV1(
  run: DeepReadonly<AuthoritativeDeterminismReplayWorkloadV1>,
): Promise<ReplayComparisonV1> {
  const entry = run.commandLog[0];
  if (entry === undefined) {
    throw new TypeError("Authoritative determinism replay requires a retained command");
  }
  return await replayAuthoritativelyFromAttemptsInternalV1({
    identity: { provenance: authoritativeDeterminismReplayProvenanceV1 },
    replayBase: run.initialSnapshot,
    replayBaseStateDigest: entry.preStateDigest,
    commandLog: run.commandLog,
    currentSnapshot: run.currentSnapshot,
    projectStableRejection: (rejection: AuthoritativeDeterminismRejectionV1) => rejection,
    projectStableFault: (fault: AuthoritativeDeterminismFaultV1) => fault,
    executeAttempt(snapshot, logged) {
      if (logged.source !== "game") {
        throw new TypeError("Authoritative determinism replay has no DebugCommand");
      }
      return executeAuthoritativeDeterminismAttemptV1(snapshot, logged.command);
    },
  });
}

/** Runs the maintained DET4 command order on one Session and replays its retained chain. */
export async function runAuthoritativeDeterminismTranscriptV1(input: {
  readonly bootstrapInput: { readonly rngSeed: number };
}): Promise<AuthoritativeDeterminismTranscriptRunV1> {
  const rngSeed = parseNonZeroUint32(input.bootstrapInput.rngSeed);
  const counter = createCompositeSnapshotWorkCounterV1();
  const workload = createAuthoritativeDeterminismWorkloadV1(counter, rngSeed);
  const initialSnapshot = workload.snapshot();
  const steps: AuthoritativeDeterminismTranscriptStepV1[] = [];
  for (const commandClass of authoritativeDeterminismTranscriptCommandClassesV1) {
    const beforeSnapshot = workload.snapshot();
    const dispatchResult = await workload.dispatch(commandClass);
    const currentSnapshot = workload.snapshot();
    const commandLog = workload.commandLog();
    const commandLogEntry = commandLog[steps.length];
    if (commandLogEntry === undefined || commandLog.length !== steps.length + 1) {
      throw new TypeError(`Authoritative determinism transcript log is invalid: ${commandClass}`);
    }
    steps.push(
      {
        commandClass,
        dispatchResult,
        status: workload.status(),
        snapshotRetained: currentSnapshot === beforeSnapshot,
        commandLogEntry: commandLogEntry as AuthoritativeDeterminismCommandLogEntryV1,
      },
    );
  }
  const currentSnapshot = workload.snapshot();
  const commandLog = workload.commandLog() as readonly AuthoritativeDeterminismCommandLogEntryV1[];
  const replayInput = { initialSnapshot, currentSnapshot, commandLog };
  return ({
    ...replayInput,
    steps: steps,
    status: workload.status(),
    replay: await replayAuthoritativeDeterminismWorkloadV1(replayInput),
  });
}

type UnsafeAuthoritativeDeterminismCaseV1 =
  | "fractional_command"
  | "fractional_event"
  | "fractional_rejection"
  | "fractional_fault"
  | "fractional_rng_draw"
  | "fractional_rng_state"
  | "fractional_debug_validation"
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

type UnsafeAuthoritativeDeterminismEventV1 =
  | { readonly kind: "determinism.unsafe_committed" }
  | { readonly kind: "determinism.unsafe_event"; readonly value: number };

interface UnsafeAuthoritativeDeterminismRejectionV1 {
  readonly code: "determinism.unsafe_rejection";
  readonly value: number;
}

type UnsafeAuthoritativeDeterminismFaultV1 =
  | { readonly code: "determinism.unsafe_fault"; readonly value: number }
  | { readonly code: "determinism.stable_fault" }
  | { readonly code: "determinism.illegal_fallback"; readonly value: number };

interface UnsafeAuthoritativeDeterminismDebugCommandV1 {
  readonly kind: "fractional_debug_validation";
}

interface UnsafeAuthoritativeDeterminismDebugValidationErrorV1 {
  readonly code: "determinism.unsafe_debug_validation";
  readonly value: number;
}

interface UnsafeAuthoritativeDeterminismTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    UnsafeAuthoritativeDeterminismStateV1,
    RngStateV1
  > {
  readonly snapshot: UnsafeAuthoritativeDeterminismSnapshotV1;
  readonly command: UnsafeAuthoritativeDeterminismCommandV1;
  readonly event: UnsafeAuthoritativeDeterminismEventV1;
  readonly rejection: UnsafeAuthoritativeDeterminismRejectionV1;
  readonly fault: UnsafeAuthoritativeDeterminismFaultV1;
  readonly debugCommand: UnsafeAuthoritativeDeterminismDebugCommandV1;
  readonly debugValidationError: UnsafeAuthoritativeDeterminismDebugValidationErrorV1;
  readonly rngState: RngStateV1;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly executionContext: undefined;
}

type UnsafeAuthoritativeDeterminismAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  UnsafeAuthoritativeDeterminismSnapshotV1,
  UnsafeAuthoritativeDeterminismEventV1,
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
  readonly source: "game" | "debug";
  readonly command: DeepReadonly<
    UnsafeAuthoritativeDeterminismCommandV1 | UnsafeAuthoritativeDeterminismDebugCommandV1
  >;
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
      readonly events: readonly UnsafeAuthoritativeDeterminismEventV1[];
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
    rng: createTransactionalRngV1(parseNonZeroUint32(unsafeAuthoritativeDeterminismRngSeedV1))
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
  return ({
    result: {
      kind: "rejected" as const,
      snapshot: current,
      reasons: [
        { code: "determinism.unsafe_rejection" as const, value: 1 },
      ],
    },
    diagnostics: {
      committedRngBefore: current.rng,
      attemptedDraws: [
        field === "draw_result" ? ({ ...attempted, result: 0.5 }) : attempted,
      ],
      candidateRngAfter: field === "candidate_raw_draw_count"
        ? ({ ...candidate, rawDrawCount: 0.5 })
        : candidate,
      committedRngAfter: current.rng,
    },
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
        [{ kind: "determinism.unsafe_committed" as const }],
      );
    case "fractional_event":
      return commitAttemptV1(current, createUnsafeCommittedSnapshotV1(current, 1), rng, [
        { kind: "determinism.unsafe_event" as const, value: 0.5 },
      ]);
    case "fractional_rejection":
      return rejectAttemptV1(current, rng, [
        { code: "determinism.unsafe_rejection" as const, value: 0.75 },
      ]);
    case "fractional_fault":
      return faultAttemptV1(
        current,
        rng,
        { code: "determinism.unsafe_fault" as const, value: 0.875 },
      );
    case "fractional_rng_draw":
      return fractionalRngEvidenceAttemptV1(current, "draw_result");
    case "fractional_rng_state":
      return fractionalRngEvidenceAttemptV1(current, "candidate_raw_draw_count");
    case "fractional_debug_validation":
      throw new TypeError("debug validation case cannot execute as a game command");
    case "illegal_fallback_fault":
      return commitAttemptV1(current, createUnsafeCommittedSnapshotV1(current, 1), rng, [
        { kind: "determinism.unsafe_event" as const, value: 0.625 },
      ]);
  }
  throw new TypeError("unsupported unsafe authoritative determinism case");
}

/** @internal Unsafe characterization factory; intentionally absent from the testkit barrel. */
export function createUnsafeAuthoritativeDeterminismWorkloadV1(
  unsafeCase: UnsafeAuthoritativeDeterminismCaseV1,
) {
  const counter = createCompositeSnapshotWorkCounterV1();
  let normalizerCalls = 0;
  const normalizerErrors: unknown[] = [];
  const initialSnapshot = createUnsafeInitialSnapshotV1();
  const commandAmount = unsafeCase === "fractional_command" ? 0.25 : 1;
  const command = { kind: unsafeCase, amount: commandAmount };
  const commandSchema: RuntimeSchemaV1<UnsafeAuthoritativeDeterminismCommandV1> = {
    parse: () => command,
  };
  const normalizeUnexpectedFault = (
    error: unknown,
    snapshot: DeepReadonly<UnsafeAuthoritativeDeterminismSnapshotV1>,
  ): UnsafeAuthoritativeDeterminismAttemptV1 => {
    normalizerCalls += 1;
    normalizerErrors.push(error);
    return faultAttemptV1(
      snapshot,
      createTransactionalRngV1(snapshot.rng),
      unsafeCase === "illegal_fallback_fault"
        ? ({
          code: "determinism.illegal_fallback" as const,
          value: 0.375,
        })
        : ({ code: "determinism.stable_fault" as const }),
    );
  };
  const created = createInstrumentedGameSessionV1<UnsafeAuthoritativeDeterminismTypesV1>(
    {
      initialSnapshot,
      commandSchema,
      executionContext: undefined,
      executeAttempt: unsafeAttemptV1,
      normalizeUnexpectedDispatchFault(
        error: unknown,
        snapshot: DeepReadonly<UnsafeAuthoritativeDeterminismSnapshotV1>,
      ): UnsafeAuthoritativeDeterminismAttemptV1 {
        return normalizeUnexpectedFault(error, snapshot);
      },
      debug: {
        validate() {
          return ({
            kind: "validation_failed" as const,
            errors: [
              {
                code: "determinism.unsafe_debug_validation" as const,
                value: 0.375,
              },
            ],
          });
        },
        executeAttempt() {
          throw new TypeError("fractional debug validation must not execute");
        },
        normalizeUnexpectedFault,
      },
    },
    counter.instrumentation,
  );
  counter.reset();
  return ({
    initialSnapshot: created.session.getCurrentSnapshot(),
    dispatch() {
      return created.session.dispatch(command);
    },
    executeDebug() {
      return created.debugControl.execute(
        { kind: "fractional_debug_validation" as const },
        () => true,
      );
    },
    status: () => created.session.getStatus(),
    snapshot: () => created.session.getCurrentSnapshot(),
    commandLog: () =>
      created.commandLog.entries() as readonly UnsafeAuthoritativeDeterminismCommandLogEntryV1[],
    replayBase: () => created.commandLog.replayBase(),
    counts: () => counter.snapshot(),
    normalizerCalls: () => normalizerCalls,
    normalizerErrors: () => [...normalizerErrors],
  });
}
