// SPDX-License-Identifier: MIT
import type {
  CommandExecutionAttemptEnvelopeV1,
  CommandExecutionResultEnvelopeV1,
} from "../../contracts/execution.ts";
import { digestCanonicalInternalV1 } from "../../contracts/digest.ts";
import type {
  GameDebugCommandValidationResultV1,
  GameSimulationTypeMapV1,
} from "../../contracts/gameplay-module.ts";
import type {
  RuntimeSessionStatusV1,
  SessionDispatchOperationResultV1,
} from "../../contracts/session-status.ts";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  RuntimeSchemaV1,
} from "../../contracts/values.ts";
import type { RunIntegrityReasonV1 } from "../../contracts/snapshot.ts";
import { runIntegrityV1Schema } from "../../contracts/snapshot.ts";
import type { SnapshotWorkInstrumentationV1 } from "../../internal/snapshot-work-instrumentation.ts";
import { recordSnapshotWorkV1 } from "../../internal/snapshot-work-instrumentation.ts";
import {
  type CommandLogV1,
  createCommandLogInternalV1,
  type FinalizedCommandAttemptV1,
} from "../diagnostics/command-log.ts";
import type { IntegrityDirectiveV1 } from "./run-integrity.ts";
import { finalizeSnapshotIntegrityV1, markRunModifiedV1 } from "./run-integrity.ts";
import {
  createRuntimeInvalidationControllerV1,
  type RuntimeInvalidationControllerV1,
} from "./runtime-invalidation.ts";

const installedSnapshotDigestsV1 = new WeakMap<object, WeakMap<object, Digest>>();

function installSnapshotDigestV1(runtimeControl: object, snapshot: object, digest: Digest): void {
  let digests = installedSnapshotDigestsV1.get(runtimeControl);
  if (digests === undefined) {
    digests = new WeakMap<object, Digest>();
    installedSnapshotDigestsV1.set(runtimeControl, digests);
  }
  digests.set(snapshot, digest);
}

/** @internal Exact-identity lookup; intentionally absent from runtime barrels. */
export function lookupInstalledSnapshotDigestInternalV1(
  runtimeControl: object,
  snapshot: object,
): Digest | undefined {
  return installedSnapshotDigestsV1.get(runtimeControl)?.get(snapshot);
}

export interface GameSessionV1<TTypes extends GameSimulationTypeMapV1> {
  getStatus(): RuntimeSessionStatusV1;
  getCurrentSnapshot(): DeepReadonly<TTypes["snapshot"]>;
  subscribe(listener: () => void): () => void;
  dispatch(
    command: DeepReadonly<TTypes["command"]>,
  ): Promise<
    SessionDispatchOperationResultV1<
      CommandExecutionResultEnvelopeV1<
        TTypes["snapshot"],
        TTypes["fact"],
        TTypes["rejection"],
        TTypes["fault"]
      >
    >
  >;
}

export type AuthoritativeOutcomeV1<TSnapshot, TResult> =
  | { readonly kind: "preserve"; readonly result: TResult }
  | {
    readonly kind: "replace";
    readonly snapshot: TSnapshot;
    readonly result: TResult;
    readonly anchor: "preserve_log" | "replace_replay_base";
  };

export interface GameSessionRuntimeControlV1<TSnapshot> {
  enqueueAuthoritative<TResult>(
    operation: (
      current: DeepReadonly<TSnapshot>,
    ) => Promise<AuthoritativeOutcomeV1<TSnapshot, TResult>>,
    normalizeUnexpectedFault: (error: unknown) => TResult,
    prepareReplacementCommit?: (
      snapshot: DeepReadonly<TSnapshot>,
      anchor: "preserve_log" | "replace_replay_base",
    ) => void,
    whenHmrInvalidated?: () => TResult,
  ): Promise<TResult>;
  readAtQueueFront<TResult>(
    reader: (snapshot: DeepReadonly<TSnapshot>) => TResult,
  ): Promise<TResult>;
  inspectForRuntime(): {
    readonly snapshot: DeepReadonly<TSnapshot>;
    readonly status: RuntimeSessionStatusV1;
  };
  subscribeCommittedSnapshots(listener: (snapshot: DeepReadonly<TSnapshot>) => void): () => void;
}

type AttemptFor<TTypes extends GameSimulationTypeMapV1> = CommandExecutionAttemptEnvelopeV1<
  TTypes["snapshot"],
  TTypes["fact"],
  TTypes["rejection"],
  TTypes["fault"],
  TTypes["rngState"],
  TTypes["rngDrawTrace"]
>;

type FinalizedAttemptFor<TTypes extends GameSimulationTypeMapV1> = FinalizedCommandAttemptV1<
  TTypes["snapshot"],
  TTypes["fact"],
  TTypes["rejection"],
  TTypes["fault"],
  TTypes["rngState"],
  TTypes["rngDrawTrace"]
>;

type LoggedGameCommandFor<TTypes extends GameSimulationTypeMapV1> = {
  readonly source: "game";
  readonly command: TTypes["command"];
};

type LoggedDebugCommandFor<TTypes extends GameSimulationTypeMapV1> = {
  readonly source: "debug";
  readonly command: TTypes["debugCommand"];
};

type LoggedCommandFor<TTypes extends GameSimulationTypeMapV1> =
  | LoggedGameCommandFor<TTypes>
  | LoggedDebugCommandFor<TTypes>;

type CommandLogFor<TTypes extends GameSimulationTypeMapV1> = CommandLogV1<
  TTypes["snapshot"],
  LoggedCommandFor<TTypes>,
  TTypes["fact"],
  TTypes["rejection"],
  TTypes["fault"],
  TTypes["rngState"],
  TTypes["rngDrawTrace"]
>;

export interface GameSessionDebugInputV1<TTypes extends GameSimulationTypeMapV1> {
  validate(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    command: DeepReadonly<TTypes["debugCommand"]>,
    context: TTypes["executionContext"],
  ): GameDebugCommandValidationResultV1<TTypes["debugValidationError"]>;
  executeAttempt(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    command: DeepReadonly<TTypes["debugCommand"]>,
    context: TTypes["executionContext"],
  ): AttemptFor<TTypes> | PromiseLike<AttemptFor<TTypes>>;
  normalizeUnexpectedFault(
    error: unknown,
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): AttemptFor<TTypes>;
}

export type GameSessionDebugCommandResultV1<TTypes extends GameSimulationTypeMapV1> =
  | { readonly kind: "capability_disabled" }
  | {
    readonly kind: "not_executed";
    readonly code: "session_unavailable" | "fault_paused" | "hmr_invalidated";
  }
  | {
    readonly kind: "validation_failed";
    readonly errors: readonly DeepReadonly<TTypes["debugValidationError"]>[];
  }
  | { readonly kind: "executed"; readonly attempt: FinalizedAttemptFor<TTypes> };

export type GameSessionDebugAnchorV1 = { readonly kind: "fixture"; readonly fixtureId: string } | {
  readonly kind: "debug_bundle";
};

type DebugAnchorOutcomeV1<TSnapshot, TResult> =
  | { readonly kind: "preserve"; readonly result: TResult }
  | { readonly kind: "replace"; readonly snapshot: TSnapshot; readonly result: TResult };

export interface GameSessionDebugControlV1<TTypes extends GameSimulationTypeMapV1> {
  execute(
    command: DeepReadonly<TTypes["debugCommand"]>,
    isCapabilityEnabled: () => boolean,
  ): Promise<GameSessionDebugCommandResultV1<TTypes>>;
  anchorReplacement<TResult>(
    anchor: GameSessionDebugAnchorV1,
    operation: (
      current: DeepReadonly<TTypes["snapshot"]>,
    ) => Promise<DebugAnchorOutcomeV1<TTypes["snapshot"], TResult>>,
    isCapabilityEnabled: () => boolean,
    normalizeUnexpectedFault: (error: unknown) => TResult,
    prepareReplacementCommit?: (snapshot: DeepReadonly<TTypes["snapshot"]>) => void,
  ): Promise<
    | TResult
    | { readonly kind: "capability_disabled" }
    | {
      readonly kind: "not_executed";
      readonly code: "session_unavailable" | "hmr_invalidated";
    }
  >;
}

type CommandLogViewFor<TTypes extends GameSimulationTypeMapV1> = Pick<
  CommandLogFor<TTypes>,
  "entries" | "replayBase" | "replayBaseStateDigest"
>;

export interface GameSessionInputV1<TTypes extends GameSimulationTypeMapV1> {
  readonly initialSnapshot: TTypes["snapshot"];
  readonly commandSchema: RuntimeSchemaV1<TTypes["command"]>;
  readonly executionContext: TTypes["executionContext"];
  readonly available?: boolean;
  executeAttempt(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    command: DeepReadonly<TTypes["command"]>,
    context: TTypes["executionContext"],
  ): AttemptFor<TTypes> | PromiseLike<AttemptFor<TTypes>>;
  normalizeUnexpectedDispatchFault(
    error: unknown,
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): AttemptFor<TTypes>;
  readonly debug?: GameSessionDebugInputV1<TTypes>;
  onAttempt?(attempt: FinalizedAttemptFor<TTypes>): void;
  onObserverFailure?(error: unknown): void;
  onHmrInvalidated?(): void;
}

export interface GameSessionCompositionV1<TTypes extends GameSimulationTypeMapV1> {
  readonly session: GameSessionV1<TTypes>;
  readonly runtimeControl: GameSessionRuntimeControlV1<TTypes["snapshot"]>;
  readonly debugControl: GameSessionDebugControlV1<TTypes>;
  readonly commandLog: CommandLogViewFor<TTypes>;
  readonly invalidationController: RuntimeInvalidationControllerV1;
}

function isThenable(value: unknown): boolean {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  let current: object | null = value;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, "then");
    if (descriptor !== undefined) {
      return (
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        typeof descriptor.value === "function"
      );
    }
    current = Object.getPrototypeOf(current);
  }
  return false;
}

function finalizeCommandAttemptV1<TTypes extends GameSimulationTypeMapV1>(
  before: DeepReadonly<TTypes["snapshot"]>,
  beforeStateDigest: Digest,
  candidate: AttemptFor<TTypes>,
  instrumentation?: SnapshotWorkInstrumentationV1,
  integrityDirective: IntegrityDirectiveV1 = { kind: "preserve_current" },
): FinalizedAttemptFor<TTypes> {
  const finalizedSnapshot = finalizeSnapshotIntegrityV1<TTypes["snapshot"]>(
    before,
    candidate.result.snapshot,
    integrityDirective,
  );
  if (candidate.result.kind !== "committed" && finalizedSnapshot !== before) {
    throw new TypeError("Non-committed command attempt changed the Snapshot");
  }
  const postSnapshot = candidate.result.kind === "committed"
    ? deepFreezeSnapshotV1(finalizedSnapshot, instrumentation)
    : finalizedSnapshot;

  const result: AttemptFor<TTypes>["result"] = candidate.result.kind === "committed"
    ? Object.freeze({
      kind: "committed" as const,
      snapshot: postSnapshot,
      facts: candidate.result.facts,
    })
    : candidate.result.kind === "rejected"
    ? Object.freeze({
      kind: "rejected" as const,
      snapshot: finalizedSnapshot,
      reasons: candidate.result.reasons,
    })
    : Object.freeze({
      kind: "faulted" as const,
      snapshot: finalizedSnapshot,
      fault: candidate.result.fault,
    });

  return Object.freeze({
    result,
    diagnostics: candidate.diagnostics,
    preSnapshot: before,
    preStateDigest: beforeStateDigest,
    postStateDigest: candidate.result.kind === "committed"
      ? digestCanonicalInternalV1("sillymaker:state:v1", postSnapshot, instrumentation)
      : beforeStateDigest,
  }) as FinalizedAttemptFor<TTypes>;
}

const capabilityDisabledV1 = Object.freeze({ kind: "capability_disabled" as const });
const sessionUnavailableV1 = Object.freeze({
  kind: "not_executed" as const,
  code: "session_unavailable" as const,
});
const faultPausedV1 = Object.freeze({
  kind: "not_executed" as const,
  code: "fault_paused" as const,
});
const hmrInvalidatedV1 = Object.freeze({
  kind: "not_executed" as const,
  code: "hmr_invalidated" as const,
});

function hasCapabilityV1(isCapabilityEnabled: () => boolean): boolean {
  try {
    return isCapabilityEnabled();
  } catch {
    return false;
  }
}

function debugCommandKindV1(command: unknown): string {
  if (command === null || typeof command !== "object" || Array.isArray(command)) {
    throw new TypeError("DebugCommand must be an object");
  }
  const descriptor = Object.getOwnPropertyDescriptor(command, "kind");
  if (
    descriptor === undefined ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined ||
    typeof descriptor.value !== "string"
  ) {
    throw new TypeError("DebugCommand kind must be an own data string");
  }
  return descriptor.value;
}

function debugAnchorReasonV1<
  TSnapshot extends { readonly commandSequence: NonNegativeSafeInteger },
>(anchor: GameSessionDebugAnchorV1, snapshot: TSnapshot): RunIntegrityReasonV1 {
  return anchor.kind === "fixture"
    ? Object.freeze({
      kind: "fixture_anchor" as const,
      fixtureId: anchor.fixtureId,
      sequence: snapshot.commandSequence,
    })
    : Object.freeze({
      kind: "debug_bundle_anchor" as const,
      sequence: snapshot.commandSequence,
    });
}

/**
 * Freezes every reachable own data property of an installed Snapshot in place.
 * Snapshots are plain validated data; freezing enforces the immutability the
 * type-level DeepReadonly promises, so a buggy consumer mutating a live
 * Snapshot throws instead of silently corrupting authoritative state. A
 * visited set guards traversal because already-frozen envelopes can still
 * carry mutable children.
 */
function deepFreezeSnapshotV1<TSnapshot>(
  value: TSnapshot,
  instrumentation?: SnapshotWorkInstrumentationV1,
): TSnapshot {
  recordSnapshotWorkV1(instrumentation, "deep_freeze_traversal");
  const visited = new Set<object>();
  const freeze = (current: unknown): void => {
    if (current === null || typeof current !== "object" || visited.has(current)) return;
    visited.add(current);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(current))) {
      if (descriptor.get === undefined && descriptor.set === undefined) {
        freeze(descriptor.value);
      }
    }
    Object.freeze(current);
  };
  freeze(value);
  return value;
}

function createInternal<TTypes extends GameSimulationTypeMapV1>(
  input: GameSessionInputV1<TTypes>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): GameSessionCompositionV1<TTypes> {
  type DispatchResult = Awaited<ReturnType<GameSessionV1<TTypes>["dispatch"]>>;

  runIntegrityV1Schema.parse(input.initialSnapshot.integrity);
  let snapshot = deepFreezeSnapshotV1(input.initialSnapshot, instrumentation);
  let currentStateDigest = digestCanonicalInternalV1(
    "sillymaker:state:v1",
    snapshot,
    instrumentation,
  );
  let stableStatus: Exclude<RuntimeSessionStatusV1, "busy"> = "ready";
  let pending = 0;
  let tail: Promise<void> = Promise.resolve();
  const commandLog = createCommandLogInternalV1<
    TTypes["snapshot"],
    LoggedCommandFor<TTypes>,
    TTypes["fact"],
    TTypes["rejection"],
    TTypes["fault"],
    TTypes["rngState"],
    TTypes["rngDrawTrace"]
  >(
    {
      replayBase: snapshot as DeepReadonly<TTypes["snapshot"]>,
      replayBaseStateDigest: currentStateDigest,
      limit: 200,
      auditStateDigests: false,
    },
    instrumentation,
  );
  const commandLogView: CommandLogViewFor<TTypes> = Object.freeze({
    entries: () => commandLog.entries(),
    replayBase: () => commandLog.replayBase(),
    replayBaseStateDigest: () => commandLog.replayBaseStateDigest(),
  });
  const listeners = new Set<() => void>();
  const committedSnapshotListeners = new Set<
    (snapshot: DeepReadonly<TTypes["snapshot"]>) => void
  >();

  const status = (): RuntimeSessionStatusV1 =>
    stableStatus === "hmr_invalidated" ? stableStatus : pending > 0 ? "busy" : stableStatus;
  const isHmrInvalidated = (): boolean => stableStatus === "hmr_invalidated";
  const reportObserverFailure = (error: unknown): void => {
    try {
      input.onObserverFailure?.(error);
    } catch {
      // Observer reporting is diagnostics-only and must not affect authoritative work.
    }
  };
  const publish = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        reportObserverFailure(error);
      }
    }
  };
  const publishCommittedSnapshot = (): void => {
    const committed = snapshot as DeepReadonly<TTypes["snapshot"]>;
    for (const listener of [...committedSnapshotListeners]) {
      try {
        listener(committed);
      } catch (error) {
        reportObserverFailure(error);
      }
    }
  };

  const invalidationController = createRuntimeInvalidationControllerV1({
    transitionToInvalidated() {
      stableStatus = "hmr_invalidated";
      publish();
    },
    ...(input.onHmrInvalidated === undefined ? {} : { reportInvalidation: input.onHmrInvalidated }),
  });

  function enqueue<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    pending += 1;
    publish();
    const result = tail.then(operation);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result.finally(() => {
      pending -= 1;
      publish();
    });
  }

  const runtimeControl: GameSessionRuntimeControlV1<TTypes["snapshot"]> = Object.freeze({
    enqueueAuthoritative<TResult>(
      operation: (
        current: DeepReadonly<TTypes["snapshot"]>,
      ) => Promise<AuthoritativeOutcomeV1<TTypes["snapshot"], TResult>>,
      normalizeUnexpectedFault: (error: unknown) => TResult,
      prepareReplacementCommit?: (
        snapshot: DeepReadonly<TTypes["snapshot"]>,
        anchor: "preserve_log" | "replace_replay_base",
      ) => void,
      whenHmrInvalidated?: () => TResult,
    ): Promise<TResult> {
      return enqueue(async () => {
        const invalidatedResult = (): TResult =>
          whenHmrInvalidated === undefined
            ? normalizeUnexpectedFault(new TypeError("GameSession was invalidated by HMR"))
            : whenHmrInvalidated();
        if (isHmrInvalidated()) return invalidatedResult();
        try {
          const outcome = await operation(snapshot as DeepReadonly<TTypes["snapshot"]>);
          if (isHmrInvalidated()) return invalidatedResult();
          if (outcome.kind === "replace") {
            const finalized = deepFreezeSnapshotV1(
              finalizeSnapshotIntegrityV1<TTypes["snapshot"]>(
                snapshot as DeepReadonly<TTypes["snapshot"]>,
                outcome.snapshot,
                { kind: "accept_replacement" },
              ),
              instrumentation,
            );
            if (outcome.anchor === "preserve_log" && finalized !== snapshot) {
              throw new TypeError("preserve_log replacement changed the Snapshot");
            }
            const preparedCommandLogAnchor = outcome.anchor === "replace_replay_base"
              ? commandLog.prepareAnchor(finalized as DeepReadonly<TTypes["snapshot"]>)
              : null;
            prepareReplacementCommit?.(
              finalized as DeepReadonly<TTypes["snapshot"]>,
              outcome.anchor,
            );
            if (preparedCommandLogAnchor !== null) {
              commandLog.establishPreparedAnchor(preparedCommandLogAnchor);
              currentStateDigest = preparedCommandLogAnchor.stateDigest;
            }
            snapshot = finalized;
            installSnapshotDigestV1(runtimeControl, snapshot, currentStateDigest);
            if (outcome.anchor === "replace_replay_base") stableStatus = "ready";
            publish();
          }
          return outcome.result;
        } catch (error) {
          if (isHmrInvalidated()) return invalidatedResult();
          stableStatus = "fault_paused";
          publish();
          return normalizeUnexpectedFault(error);
        }
      });
    },
    readAtQueueFront<TResult>(
      reader: (current: DeepReadonly<TTypes["snapshot"]>) => TResult,
    ): Promise<TResult> {
      return enqueue(async () => {
        const result = reader(snapshot as DeepReadonly<TTypes["snapshot"]>);
        if (isThenable(result)) {
          throw new TypeError("GameSession queue-front reader returned thenable");
        }
        return result;
      });
    },
    inspectForRuntime() {
      return Object.freeze({
        snapshot: snapshot as DeepReadonly<TTypes["snapshot"]>,
        status: status(),
      });
    },
    subscribeCommittedSnapshots(listener: (snapshot: DeepReadonly<TTypes["snapshot"]>) => void) {
      committedSnapshotListeners.add(listener);
      return () => committedSnapshotListeners.delete(listener);
    },
  });
  installSnapshotDigestV1(runtimeControl, snapshot, currentStateDigest);

  const debugControl: GameSessionDebugControlV1<TTypes> = Object.freeze({
    execute(command: DeepReadonly<TTypes["debugCommand"]>, isCapabilityEnabled: () => boolean) {
      return enqueue(async () => {
        if (!hasCapabilityV1(isCapabilityEnabled)) return capabilityDisabledV1;
        if (input.available === false) return sessionUnavailableV1;
        if (stableStatus === "fault_paused") return faultPausedV1;
        if (stableStatus === "hmr_invalidated") return hmrInvalidatedV1;
        if (input.debug === undefined) return sessionUnavailableV1;

        const debug = input.debug;
        const before = snapshot as DeepReadonly<TTypes["snapshot"]>;
        const normalizeFault = (error: unknown): AttemptFor<TTypes> => {
          const normalized = debug.normalizeUnexpectedFault(error, before);
          if (isThenable(normalized)) {
            throw new TypeError("Debug fault normalizer returned thenable");
          }
          if (normalized.result.kind !== "faulted") {
            throw new TypeError("Debug fault normalizer must return a faulted attempt");
          }
          return normalized;
        };

        let candidate: AttemptFor<TTypes>;
        try {
          const validation = debug.validate(before, command, input.executionContext);
          if (isThenable(validation)) {
            throw new TypeError("DebugCommand validation returned thenable");
          }
          if (validation.kind === "validation_failed") {
            if (!Array.isArray(validation.errors) || validation.errors.length === 0) {
              throw new TypeError("DebugCommand validation failure must contain errors");
            }
            return Object.freeze({
              kind: "validation_failed" as const,
              errors: Object.freeze([...validation.errors]),
            });
          }
          if (validation.kind !== "allowed") {
            throw new TypeError("DebugCommand validation returned an invalid result");
          }
          candidate = await debug.executeAttempt(before, command, input.executionContext);
          if (candidate.result.kind === "rejected") {
            throw new TypeError("An admitted DebugCommand cannot be rejected");
          }
        } catch (error) {
          candidate = normalizeFault(error);
        }
        if (isHmrInvalidated()) return hmrInvalidatedV1;

        let finalizedAttempt: FinalizedAttemptFor<TTypes>;
        try {
          const integrityDirective: IntegrityDirectiveV1 = candidate.result.kind === "committed"
            ? {
              kind: "mark_modified",
              reason: {
                kind: "debug_command",
                commandKind: debugCommandKindV1(command),
                sequence: candidate.result.snapshot.commandSequence,
              },
            }
            : { kind: "preserve_current" };
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(
            before,
            currentStateDigest,
            candidate,
            instrumentation,
            integrityDirective,
          );
        } catch (error) {
          candidate = normalizeFault(error);
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(
            before,
            currentStateDigest,
            candidate,
            instrumentation,
          );
        }

        commandLog.append(
          Object.freeze({
            source: "debug" as const,
            command,
          }),
          finalizedAttempt,
        );
        try {
          input.onAttempt?.(finalizedAttempt);
        } catch (error) {
          reportObserverFailure(error);
        }
        if (finalizedAttempt.result.kind === "committed") {
          snapshot = finalizedAttempt.result.snapshot;
          currentStateDigest = finalizedAttempt.postStateDigest;
          installSnapshotDigestV1(runtimeControl, snapshot, currentStateDigest);
          publish();
          publishCommittedSnapshot();
        } else {
          stableStatus = "fault_paused";
          publish();
        }
        return Object.freeze({
          kind: "executed" as const,
          attempt: finalizedAttempt,
        });
      });
    },
    anchorReplacement<TResult>(
      anchor: GameSessionDebugAnchorV1,
      operation: (
        current: DeepReadonly<TTypes["snapshot"]>,
      ) => Promise<DebugAnchorOutcomeV1<TTypes["snapshot"], TResult>>,
      isCapabilityEnabled: () => boolean,
      normalizeUnexpectedFault: (error: unknown) => TResult,
      prepareReplacementCommit?: (snapshot: DeepReadonly<TTypes["snapshot"]>) => void,
    ): Promise<
      | TResult
      | { readonly kind: "capability_disabled" }
      | {
        readonly kind: "not_executed";
        readonly code: "session_unavailable" | "hmr_invalidated";
      }
    > {
      return enqueue(async () => {
        if (!hasCapabilityV1(isCapabilityEnabled)) return capabilityDisabledV1;
        if (input.available === false) return sessionUnavailableV1;
        if (isHmrInvalidated()) return hmrInvalidatedV1;
        try {
          const current = snapshot as DeepReadonly<TTypes["snapshot"]>;
          const outcome = await operation(current);
          if (isHmrInvalidated()) return hmrInvalidatedV1;
          if (outcome.kind === "preserve") return outcome.result;
          if (outcome.kind !== "replace") {
            throw new TypeError("Debug anchor operation returned an invalid outcome");
          }
          const accepted = finalizeSnapshotIntegrityV1<TTypes["snapshot"]>(
            current,
            outcome.snapshot,
            { kind: "accept_replacement" },
          );
          const finalized = deepFreezeSnapshotV1(
            {
              ...accepted,
              integrity: markRunModifiedV1(
                accepted.integrity,
                debugAnchorReasonV1(anchor, accepted),
              ),
            },
            instrumentation,
          ) as TTypes["snapshot"];
          runIntegrityV1Schema.parse(finalized.integrity);
          const preparedCommandLogAnchor = commandLog.prepareAnchor(
            finalized as DeepReadonly<TTypes["snapshot"]>,
          );
          prepareReplacementCommit?.(finalized as DeepReadonly<TTypes["snapshot"]>);
          commandLog.establishPreparedAnchor(preparedCommandLogAnchor);
          snapshot = finalized;
          currentStateDigest = preparedCommandLogAnchor.stateDigest;
          installSnapshotDigestV1(runtimeControl, snapshot, currentStateDigest);
          stableStatus = "ready";
          publish();
          return outcome.result;
        } catch (error) {
          if (isHmrInvalidated()) return hmrInvalidatedV1;
          stableStatus = "fault_paused";
          publish();
          return normalizeUnexpectedFault(error);
        }
      });
    },
  });

  const session: GameSessionV1<TTypes> = Object.freeze({
    getStatus: status,
    getCurrentSnapshot: () => snapshot as DeepReadonly<TTypes["snapshot"]>,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(command: DeepReadonly<TTypes["command"]>): Promise<DispatchResult> {
      if (input.available === false) {
        return Promise.resolve(
          Object.freeze({ kind: "not_executed", code: "session_unavailable" }),
        );
      }
      if (stableStatus === "fault_paused" || stableStatus === "hmr_invalidated") {
        return Promise.resolve(Object.freeze({ kind: "not_executed", code: stableStatus }));
      }
      let parsed: TTypes["command"];
      try {
        parsed = input.commandSchema.parse(command);
      } catch {
        return Promise.resolve(Object.freeze({ kind: "not_executed", code: "validation_failed" }));
      }
      return enqueue(async () => {
        if (stableStatus === "fault_paused" || stableStatus === "hmr_invalidated") {
          return Object.freeze({
            kind: "not_executed" as const,
            code: stableStatus,
          });
        }
        const before = snapshot as DeepReadonly<TTypes["snapshot"]>;
        let candidate: AttemptFor<TTypes>;
        try {
          candidate = await input.executeAttempt(
            before,
            parsed as DeepReadonly<TTypes["command"]>,
            input.executionContext,
          );
        } catch (error) {
          candidate = input.normalizeUnexpectedDispatchFault(error, before);
        }
        if (isHmrInvalidated()) return hmrInvalidatedV1;
        let finalizedAttempt: FinalizedAttemptFor<TTypes>;
        try {
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(
            before,
            currentStateDigest,
            candidate,
            instrumentation,
          );
        } catch (error) {
          candidate = input.normalizeUnexpectedDispatchFault(error, before);
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(
            before,
            currentStateDigest,
            candidate,
            instrumentation,
          );
        }
        commandLog.append(
          Object.freeze({
            source: "game" as const,
            command: parsed as DeepReadonly<TTypes["command"]>,
          }),
          finalizedAttempt,
        );
        try {
          input.onAttempt?.(finalizedAttempt);
        } catch (error) {
          reportObserverFailure(error);
        }
        if (finalizedAttempt.result.kind === "committed") {
          snapshot = finalizedAttempt.result.snapshot;
          currentStateDigest = finalizedAttempt.postStateDigest;
          installSnapshotDigestV1(runtimeControl, snapshot, currentStateDigest);
          publish();
          publishCommittedSnapshot();
        } else if (finalizedAttempt.result.kind === "faulted") {
          stableStatus = "fault_paused";
          publish();
        }
        return Object.freeze({
          kind: "executed" as const,
          execution: finalizedAttempt.result,
        });
      });
    },
  });

  return Object.freeze({
    session,
    runtimeControl,
    debugControl,
    commandLog: commandLogView,
    invalidationController,
  });
}

export function createGameSessionV1<TTypes extends GameSimulationTypeMapV1>(
  input: GameSessionInputV1<TTypes>,
): GameSessionCompositionV1<TTypes> {
  return createInternal(input);
}

/** @internal Test/bench injection; intentionally absent from package barrels. */
export function createInstrumentedGameSessionV1<TTypes extends GameSimulationTypeMapV1>(
  input: GameSessionInputV1<TTypes>,
  instrumentation: SnapshotWorkInstrumentationV1,
): GameSessionCompositionV1<TTypes> {
  return createInternal(input, instrumentation);
}
