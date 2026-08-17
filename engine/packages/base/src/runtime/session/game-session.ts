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
  SessionFaultCauseV1,
} from "../../contracts/session-status.ts";
import type { SaveStateMigrationReceiptV1 } from "../../contracts/save-state-migration.ts";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  RuntimeSchemaV1,
} from "../../contracts/values.ts";
import type { RunIntegrityReasonV1 } from "../../contracts/snapshot.ts";
import { runIntegrityV1Schema } from "../../contracts/snapshot.ts";
import {
  admitCanonicalCommandInternalV1,
  type CanonicalCommandAdmissionInternalV1,
  withCanonicalCommandHandoffInternalV1,
} from "../../internal/canonical-command-admission.ts";
import {
  admitCommandAttemptEvidenceInternalV1,
  admitDebugValidationResultInternalV1,
  type FinalizedEvidencePolicyInternalV1,
  type FinalizedEvidenceResultConstraintInternalV1,
  withFinalizedEvidenceHandoffInternalV1,
} from "../../internal/finalized-evidence-admission.ts";
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
const installedMigrationReceiptReadersInternalV1 = new WeakMap<
  object,
  () => DeepReadonly<SaveStateMigrationReceiptV1> | null
>();
const authoritativeReplacementOwnerByRuntimeMemberInternalV1 = new WeakMap<
  object,
  AuthoritativeReplacementOwnerInternalV1
>();

type ReplacementAnchorInternalV1 = "preserve_log" | "replace_replay_base";

export interface AuthoritativeReplacementOwnerInternalV1 {
  readonly _authoritativeReplacementOwner?: never;
}

export interface AuthoritativeReplacementPreparationInternalV1 {
  readonly _authoritativeReplacementPreparation?: never;
}

export interface AuthoritativeReplacementPublicationContextInternalV1 {
  readonly _authoritativeReplacementPublicationContext?: never;
}

/** @internal Resolves one exact Session owner through a control or retained member identity. */
export function lookupAuthoritativeReplacementOwnerInternalV1(
  runtimeControl: object,
): AuthoritativeReplacementOwnerInternalV1 | undefined {
  const candidates = [
    runtimeControl,
    (runtimeControl as { readonly enqueueAuthoritative?: unknown }).enqueueAuthoritative,
    (runtimeControl as { readonly readAtQueueFront?: unknown }).readAtQueueFront,
    (runtimeControl as { readonly inspectForRuntime?: unknown }).inspectForRuntime,
    (runtimeControl as { readonly subscribeCommittedSnapshots?: unknown })
      .subscribeCommittedSnapshots,
  ];
  let owner: AuthoritativeReplacementOwnerInternalV1 | undefined;
  for (const candidate of candidates) {
    if ((typeof candidate !== "object" || candidate === null) && typeof candidate !== "function") {
      continue;
    }
    const candidateOwner = authoritativeReplacementOwnerByRuntimeMemberInternalV1.get(candidate);
    if (candidateOwner === undefined) continue;
    if (owner !== undefined && owner !== candidateOwner) {
      throw new TypeError("runtime control resolves multiple authoritative Session owners");
    }
    owner = candidateOwner;
  }
  return owner;
}

const authoritativeReplacementPublicationContextOwnersInternalV1 = new WeakMap<
  object,
  AuthoritativeReplacementOwnerInternalV1
>();
const activeAuthoritativeReplacementPublicationContextReadersInternalV1 = new WeakMap<
  object,
  () => AuthoritativeReplacementPublicationContextInternalV1 | null
>();

/** @internal Creates a Session-bound context visible only during replacement publication. */
export function createAuthoritativeReplacementPublicationContextInternalV1(
  runtimeControl: object,
): AuthoritativeReplacementPublicationContextInternalV1 {
  const owner = lookupAuthoritativeReplacementOwnerInternalV1(runtimeControl);
  if (owner === undefined) throw new TypeError("unknown GameSession runtime control");
  const context = Object.freeze({}) as AuthoritativeReplacementPublicationContextInternalV1;
  authoritativeReplacementPublicationContextOwnersInternalV1.set(context, owner);
  return context;
}

/** @internal Reads the context only while this Session notifies replacement listeners. */
export function readActiveAuthoritativeReplacementPublicationContextInternalV1(
  runtimeControl: object,
): AuthoritativeReplacementPublicationContextInternalV1 | null {
  const read = activeAuthoritativeReplacementPublicationContextReadersInternalV1.get(
    runtimeControl,
  );
  if (read === undefined) throw new TypeError("unknown GameSession runtime control");
  return read();
}

export interface PreparedAuthoritativeReplacementCommitInternalV1 {
  readonly _preparedAuthoritativeReplacementCommit?: never;
}

interface PreparedAuthoritativeReplacementCommitControlInternalV1 {
  status: "prepared" | "committing" | "committed" | "published" | "completed";
  readonly migrationReceipt: DeepReadonly<SaveStateMigrationReceiptV1> | null;
  readonly owner: AuthoritativeReplacementOwnerInternalV1;
  readonly preparation: AuthoritativeReplacementPreparationInternalV1;
  readonly publicationContext: AuthoritativeReplacementPublicationContextInternalV1 | null;
  readonly commit: () => void;
  readonly afterPublication: () => void;
}

interface AuthoritativeReplacementBindingInternalV1<TSnapshot, TResult> {
  readonly prepare: (
    snapshot: DeepReadonly<TSnapshot>,
    anchor: ReplacementAnchorInternalV1,
    owner: AuthoritativeReplacementOwnerInternalV1,
    preparation: AuthoritativeReplacementPreparationInternalV1,
  ) => PreparedAuthoritativeReplacementCommitInternalV1;
  readonly normalizePrepareFailure: (error: unknown) => TResult;
}

const preparedAuthoritativeReplacementControlsInternalV1 = new WeakMap<
  object,
  PreparedAuthoritativeReplacementCommitControlInternalV1
>();
const authoritativeReplacementBindingsInternalV1 = new WeakMap<
  object,
  AuthoritativeReplacementBindingRecordInternalV1
>();
const authoritativeReplacementBindingsByPrepareCallbackInternalV1 = new WeakMap<
  object,
  AuthoritativeReplacementBindingRecordInternalV1
>();

interface AuthoritativeReplacementBindingRecordInternalV1 {
  status: "available" | "claimed";
  binding: AuthoritativeReplacementBindingInternalV1<unknown, unknown> | null;
  readonly normalizePrepareFailure: (error: unknown) => unknown;
}

function objectIdentityInternalV1(value: unknown): object | null {
  return (typeof value === "object" && value !== null) || typeof value === "function"
    ? value
    : null;
}

function claimAuthoritativeReplacementBindingInternalV1<TSnapshot, TResult>(
  outcome: object,
  prepareReplacementCommit?: unknown,
):
  | ({
    readonly binding: AuthoritativeReplacementBindingInternalV1<TSnapshot, TResult>;
    readonly available: true;
  } | {
    readonly binding: null;
    readonly available: false;
    normalizePrepareFailure(error: unknown): TResult;
  })
  | undefined {
  const direct = authoritativeReplacementBindingsInternalV1.get(outcome);
  const callbackIdentity = objectIdentityInternalV1(prepareReplacementCommit);
  const callbackRecord = callbackIdentity === null
    ? undefined
    : authoritativeReplacementBindingsByPrepareCallbackInternalV1.get(callbackIdentity);
  if (direct !== undefined && callbackRecord !== undefined && direct !== callbackRecord) {
    direct.status = "claimed";
    direct.binding = null;
    callbackRecord.status = "claimed";
    callbackRecord.binding = null;
    return Object.freeze({
      binding: null,
      available: false as const,
      normalizePrepareFailure: direct.normalizePrepareFailure as (
        error: unknown,
      ) => TResult,
    });
  }
  const resolved = direct ?? callbackRecord;
  if (resolved === undefined) return undefined;
  if (resolved.status !== "available" || resolved.binding === null) {
    return Object.freeze({
      binding: null,
      available: false as const,
      normalizePrepareFailure: resolved.normalizePrepareFailure as (error: unknown) => TResult,
    });
  }
  const binding = resolved.binding as AuthoritativeReplacementBindingInternalV1<
    TSnapshot,
    TResult
  >;
  resolved.status = "claimed";
  resolved.binding = null;
  return Object.freeze({ binding, available: true as const });
}

/** @internal Exact Session-lifecycle receipt lookup; intentionally absent from barrels. */
export function readInstalledSaveStateMigrationReceiptInternalV1(
  runtimeControl: object,
): DeepReadonly<SaveStateMigrationReceiptV1> | null {
  const read = installedMigrationReceiptReadersInternalV1.get(runtimeControl);
  if (read === undefined) throw new TypeError("unknown GameSession runtime control");
  return read();
}

/** @internal Creates an exact package-owned replacement participant token. */
export function createPreparedAuthoritativeReplacementCommitInternalV1(options: {
  readonly owner: AuthoritativeReplacementOwnerInternalV1;
  readonly preparation: AuthoritativeReplacementPreparationInternalV1;
  readonly migrationReceipt: DeepReadonly<SaveStateMigrationReceiptV1> | null;
  readonly publicationContext?: AuthoritativeReplacementPublicationContextInternalV1 | null;
  readonly commit: () => void;
  readonly afterPublication?: () => void;
}): PreparedAuthoritativeReplacementCommitInternalV1 {
  const publicationContext = options.publicationContext ?? null;
  if (
    typeof options.commit !== "function" ||
    (options.afterPublication !== undefined && typeof options.afterPublication !== "function") ||
    (publicationContext !== null &&
      authoritativeReplacementPublicationContextOwnersInternalV1.get(publicationContext) !==
        options.owner)
  ) {
    throw new TypeError("invalid authoritative replacement participant");
  }
  const prepared = Object.freeze({}) as PreparedAuthoritativeReplacementCommitInternalV1;
  preparedAuthoritativeReplacementControlsInternalV1.set(prepared, {
    status: "prepared",
    owner: options.owner,
    preparation: options.preparation,
    migrationReceipt: options.migrationReceipt,
    publicationContext,
    commit: options.commit,
    afterPublication: options.afterPublication ?? (() => undefined),
  });
  return prepared;
}

/** @internal Binds one exact replacement outcome to its package participant. */
export function bindAuthoritativeReplacementCommitInternalV1<TSnapshot, TResult>(
  outcome: object,
  binding: AuthoritativeReplacementBindingInternalV1<TSnapshot, TResult>,
): void {
  if (
    authoritativeReplacementBindingsInternalV1.has(outcome) ||
    typeof binding.prepare !== "function" ||
    typeof binding.normalizePrepareFailure !== "function"
  ) {
    throw new TypeError("invalid authoritative replacement binding");
  }
  const capturedBinding = Object.freeze({
    prepare: binding.prepare,
    normalizePrepareFailure: binding.normalizePrepareFailure,
  }) as AuthoritativeReplacementBindingInternalV1<unknown, unknown>;
  const record: AuthoritativeReplacementBindingRecordInternalV1 = {
    status: "available",
    binding: capturedBinding,
    normalizePrepareFailure: capturedBinding.normalizePrepareFailure,
  };
  authoritativeReplacementBindingsInternalV1.set(outcome, record);
}

/** @internal Carries one exact package binding through structural runtime wrappers. */
export function bindAuthoritativeReplacementPrepareCallbackInternalV1(
  callback: object,
  outcome: object,
): void {
  const record = authoritativeReplacementBindingsInternalV1.get(outcome);
  if (
    record === undefined ||
    authoritativeReplacementBindingsByPrepareCallbackInternalV1.has(callback)
  ) {
    throw new TypeError("invalid authoritative replacement callback binding");
  }
  authoritativeReplacementBindingsByPrepareCallbackInternalV1.set(callback, record);
}

function preparedReplacementControlInternalV1(
  prepared: PreparedAuthoritativeReplacementCommitInternalV1,
): PreparedAuthoritativeReplacementCommitControlInternalV1 {
  const control = preparedAuthoritativeReplacementControlsInternalV1.get(prepared);
  if (control === undefined) throw new TypeError("invalid authoritative replacement token");
  return control;
}

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
  /**
   * The raw error behind the most recent unexpected fault, or null when no
   * throw was normalized yet. Non-authoritative debug data (see
   * `SessionFaultCauseV1`); `subscribe` listeners fire on the status flip
   * that accompanies every fault, so observers re-read it there.
   */
  getLastFaultCause(): SessionFaultCauseV1 | null;
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

type EvidencePolicyFor<TTypes extends GameSimulationTypeMapV1> = FinalizedEvidencePolicyInternalV1<
  TTypes["fact"],
  TTypes["rejection"],
  TTypes["rngState"],
  TTypes["rngDrawTrace"],
  TTypes["debugValidationError"]
>;

interface FinalizeCommandAttemptOptionsV1 {
  readonly resultConstraint?: FinalizedEvidenceResultConstraintInternalV1;
  readonly debugCommand?: unknown;
}

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
  evidencePolicy: EvidencePolicyFor<TTypes>,
  instrumentation?: SnapshotWorkInstrumentationV1,
  options: FinalizeCommandAttemptOptionsV1 = {},
): FinalizedAttemptFor<TTypes> {
  const admittedCandidate = admitCommandAttemptEvidenceInternalV1(
    before,
    candidate,
    evidencePolicy,
    instrumentation,
    options.resultConstraint,
  );
  const integrityDirective: IntegrityDirectiveV1 =
    options.debugCommand !== undefined && admittedCandidate.result.kind === "committed"
      ? {
        kind: "mark_modified",
        reason: {
          kind: "debug_command",
          commandKind: debugCommandKindV1(options.debugCommand),
          sequence: admittedCandidate.result.snapshot.commandSequence,
        },
      }
      : { kind: "preserve_current" };
  const finalizedSnapshot = finalizeSnapshotIntegrityV1<TTypes["snapshot"]>(
    before,
    admittedCandidate.result.snapshot,
    integrityDirective,
  );
  const postSnapshot = admittedCandidate.result.kind === "committed"
    ? deepFreezeSnapshotV1(finalizedSnapshot, instrumentation)
    : finalizedSnapshot;

  const result: AttemptFor<TTypes>["result"] = admittedCandidate.result.kind === "committed"
    ? Object.freeze({
      kind: "committed" as const,
      snapshot: postSnapshot,
      facts: admittedCandidate.result.facts,
    })
    : admittedCandidate.result.kind === "rejected"
    ? Object.freeze({
      kind: "rejected" as const,
      snapshot: finalizedSnapshot,
      reasons: admittedCandidate.result.reasons,
    })
    : Object.freeze({
      kind: "faulted" as const,
      snapshot: finalizedSnapshot,
      fault: admittedCandidate.result.fault,
    });

  return Object.freeze({
    result,
    diagnostics: admittedCandidate.diagnostics,
    preSnapshot: before,
    preStateDigest: beforeStateDigest,
    postStateDigest: admittedCandidate.result.kind === "committed"
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
  recordSnapshotWorkV1(instrumentation, "deep_freeze_traversal", "snapshot_freeze");
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

/** Builds the non-authoritative cause record for one normalized throw. */
function sessionFaultCauseV1(
  at: SessionFaultCauseV1["at"],
  error: unknown,
): SessionFaultCauseV1 {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const message = raw.length > 300 ? `${raw.slice(0, 300)}…` : raw;
  const stack = error instanceof Error && typeof error.stack === "string" ? error.stack : "";
  const stackSummary = stack
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== raw)
    .slice(0, 8);
  return Object.freeze({ at, message, stackSummary: Object.freeze(stackSummary) });
}

function createInternal<TTypes extends GameSimulationTypeMapV1>(
  input: GameSessionInputV1<TTypes>,
  instrumentation?: SnapshotWorkInstrumentationV1,
  evidencePolicy: EvidencePolicyFor<TTypes> = {},
): GameSessionCompositionV1<TTypes> {
  type DispatchResult = Awaited<ReturnType<GameSessionV1<TTypes>["dispatch"]>>;

  runIntegrityV1Schema.parse(input.initialSnapshot.integrity);
  let snapshot = deepFreezeSnapshotV1(input.initialSnapshot, instrumentation);
  let currentStateDigest = digestCanonicalInternalV1(
    "sillymaker:state:v1",
    snapshot,
    instrumentation,
  );
  let installedMigrationReceipt: DeepReadonly<SaveStateMigrationReceiptV1> | null = null;
  let activeReplacementPublicationContext:
    | AuthoritativeReplacementPublicationContextInternalV1
    | null = null;
  const authoritativeReplacementOwner = Object.freeze(
    {},
  ) as AuthoritativeReplacementOwnerInternalV1;
  let stableStatus: Exclude<RuntimeSessionStatusV1, "busy"> = "ready";
  let lastFaultCause: SessionFaultCauseV1 | null = null;
  const recordFaultCause = (at: SessionFaultCauseV1["at"], error: unknown): void => {
    lastFaultCause = sessionFaultCauseV1(at, error);
  };
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
  const publishReplacementV1 = (
    prepared: PreparedAuthoritativeReplacementCommitControlInternalV1 | null,
  ): void => {
    activeReplacementPublicationContext = prepared?.publicationContext ?? null;
    try {
      publish();
    } finally {
      activeReplacementPublicationContext = null;
    }
    if (prepared === null) return;
    prepared.status = "published";
    try {
      prepared.afterPublication();
    } catch (error) {
      reportObserverFailure(error);
    }
    prepared.status = "completed";
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
            const replacementClaim = claimAuthoritativeReplacementBindingInternalV1<
              TTypes["snapshot"],
              TResult
            >(outcome as object, prepareReplacementCommit);
            const prepareSessionReplacementV1 = () => {
              const finalized = deepFreezeSnapshotV1(
                finalizeSnapshotIntegrityV1<TTypes["snapshot"]>(
                  snapshot as DeepReadonly<TTypes["snapshot"]>,
                  outcome.snapshot,
                  { kind: "accept_replacement" },
                ),
                instrumentation,
              ) as DeepReadonly<TTypes["snapshot"]>;
              if (outcome.anchor === "preserve_log" && finalized !== snapshot) {
                throw new TypeError("preserve_log replacement changed the Snapshot");
              }
              const preparedCommandLogAnchor = outcome.anchor === "replace_replay_base"
                ? commandLog.prepareAnchor(finalized as DeepReadonly<TTypes["snapshot"]>)
                : null;
              return Object.freeze({ finalized, preparedCommandLogAnchor });
            };
            let finalized: DeepReadonly<TTypes["snapshot"]>;
            let preparedCommandLogAnchor: ReturnType<typeof commandLog.prepareAnchor> | null;
            let preparedReplacement:
              | PreparedAuthoritativeReplacementCommitControlInternalV1
              | null = null;
            if (replacementClaim !== undefined) {
              const normalizePrepareFailure = replacementClaim.available
                ? replacementClaim.binding.normalizePrepareFailure
                : replacementClaim.normalizePrepareFailure;
              try {
                if (!replacementClaim.available) {
                  throw new TypeError("reused authoritative replacement binding");
                }
                const replacementBinding = replacementClaim.binding;
                const preparedSession = prepareSessionReplacementV1();
                finalized = preparedSession.finalized;
                preparedCommandLogAnchor = preparedSession.preparedCommandLogAnchor;
                const preparation = Object.freeze(
                  {},
                ) as AuthoritativeReplacementPreparationInternalV1;
                const prepared = replacementBinding.prepare(
                  finalized,
                  outcome.anchor,
                  authoritativeReplacementOwner,
                  preparation,
                );
                preparedReplacement = preparedReplacementControlInternalV1(prepared);
                if (
                  preparedReplacement.status !== "prepared" ||
                  preparedReplacement.owner !== authoritativeReplacementOwner ||
                  preparedReplacement.preparation !== preparation
                ) {
                  throw new TypeError("reused authoritative replacement token");
                }
                if (
                  preparedReplacement.migrationReceipt !== null &&
                  (preparedCommandLogAnchor === null ||
                    preparedReplacement.migrationReceipt.migratedStateDigest !==
                      preparedCommandLogAnchor.stateDigest)
                ) {
                  throw new TypeError("migration receipt does not match the replacement anchor");
                }
              } catch (error) {
                if (isHmrInvalidated()) return invalidatedResult();
                const normalized = normalizePrepareFailure(error);
                return isHmrInvalidated() ? invalidatedResult() : normalized;
              }
            } else {
              const preparedSession = prepareSessionReplacementV1();
              finalized = preparedSession.finalized;
              preparedCommandLogAnchor = preparedSession.preparedCommandLogAnchor;
              prepareReplacementCommit?.(
                finalized,
                outcome.anchor,
              );
            }
            if (isHmrInvalidated()) return invalidatedResult();
            if (preparedReplacement !== null) {
              preparedReplacement.status = "committing";
              preparedReplacement.commit();
              preparedReplacement.status = "committed";
            }
            if (preparedCommandLogAnchor !== null) {
              commandLog.establishPreparedAnchor(preparedCommandLogAnchor);
              currentStateDigest = preparedCommandLogAnchor.stateDigest;
            }
            snapshot = finalized;
            installSnapshotDigestV1(runtimeControl, snapshot, currentStateDigest);
            if (outcome.anchor === "replace_replay_base") {
              stableStatus = "ready";
              installedMigrationReceipt = preparedReplacement?.migrationReceipt ?? null;
            }
            publishReplacementV1(preparedReplacement);
          }
          return outcome.result;
        } catch (error) {
          if (isHmrInvalidated()) return invalidatedResult();
          recordFaultCause("session", error);
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
  installedMigrationReceiptReadersInternalV1.set(runtimeControl, () => installedMigrationReceipt);
  activeAuthoritativeReplacementPublicationContextReadersInternalV1.set(
    runtimeControl,
    () => activeReplacementPublicationContext,
  );
  for (
    const member of [
      runtimeControl,
      runtimeControl.enqueueAuthoritative,
      runtimeControl.readAtQueueFront,
      runtimeControl.inspectForRuntime,
      runtimeControl.subscribeCommittedSnapshots,
    ]
  ) {
    authoritativeReplacementOwnerByRuntimeMemberInternalV1.set(
      member,
      authoritativeReplacementOwner,
    );
  }

  const debugControl: GameSessionDebugControlV1<TTypes> = Object.freeze({
    execute(command: DeepReadonly<TTypes["debugCommand"]>, isCapabilityEnabled: () => boolean) {
      const preflight = (): GameSessionDebugCommandResultV1<TTypes> | undefined => {
        if (!hasCapabilityV1(isCapabilityEnabled)) return capabilityDisabledV1;
        if (input.available === false) return sessionUnavailableV1;
        if (stableStatus === "fault_paused") return faultPausedV1;
        if (stableStatus === "hmr_invalidated") return hmrInvalidatedV1;
        if (input.debug === undefined) return sessionUnavailableV1;
        return undefined;
      };
      const initialFence = preflight();
      if (initialFence !== undefined) return Promise.resolve(initialFence);

      let admission: CanonicalCommandAdmissionInternalV1<TTypes["debugCommand"]>;
      try {
        admission = admitCanonicalCommandInternalV1(command, instrumentation);
      } catch (error) {
        return Promise.reject(error);
      }

      return enqueue(async () => {
        const queuedFence = preflight();
        if (queuedFence !== undefined) return queuedFence;

        const debug = input.debug as GameSessionDebugInputV1<TTypes>;
        const before = snapshot as DeepReadonly<TTypes["snapshot"]>;
        const normalizeFault = (error: unknown): AttemptFor<TTypes> => {
          recordFaultCause("debug", error);
          const normalized = debug.normalizeUnexpectedFault(error, before);
          if (isThenable(normalized)) {
            throw new TypeError("Debug fault normalizer returned thenable");
          }
          return normalized;
        };

        let candidate: AttemptFor<TTypes> | undefined;
        let attemptReturned = false;
        let candidateIsFallback = false;
        let validationFailure:
          | {
            readonly kind: "validation_failed";
            readonly errors: readonly DeepReadonly<TTypes["debugValidationError"]>[];
          }
          | undefined;
        let operationFailure: { readonly error: unknown } | undefined;
        let validation: unknown;
        try {
          validation = withCanonicalCommandHandoffInternalV1(
            admission,
            "simulation_debug_validate",
            () => debug.validate(before, admission.value, input.executionContext),
          );
          if (isThenable(validation)) {
            throw new TypeError("DebugCommand validation returned thenable");
          }
        } catch (error) {
          operationFailure = { error };
        }
        if (isHmrInvalidated()) return hmrInvalidatedV1;
        if (operationFailure === undefined) {
          try {
            const admittedValidation = admitDebugValidationResultInternalV1(
              validation,
              evidencePolicy.parseDebugValidationError,
              instrumentation,
            );
            if (isHmrInvalidated()) return hmrInvalidatedV1;
            if (admittedValidation.kind === "validation_failed") {
              validationFailure = Object.freeze({
                kind: "validation_failed" as const,
                errors: admittedValidation.errors,
              });
            } else if (admittedValidation.kind !== "allowed") {
              throw new TypeError("DebugCommand validation returned an invalid result");
            } else {
              candidate = await withCanonicalCommandHandoffInternalV1(
                admission,
                "simulation_debug_execute",
                () => debug.executeAttempt(before, admission.value, input.executionContext),
              );
              attemptReturned = true;
            }
          } catch (error) {
            operationFailure = { error };
          }
        }
        if (isHmrInvalidated()) return hmrInvalidatedV1;
        if (operationFailure !== undefined) {
          try {
            candidate = normalizeFault(operationFailure.error);
          } catch (error) {
            if (isHmrInvalidated()) return hmrInvalidatedV1;
            throw error;
          }
          attemptReturned = true;
          candidateIsFallback = true;
          if (isHmrInvalidated()) return hmrInvalidatedV1;
        }
        if (validationFailure !== undefined) return validationFailure;
        if (!attemptReturned) throw new TypeError("DebugCommand produced no attempt");

        let finalizedAttempt: FinalizedAttemptFor<TTypes>;
        try {
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(
            before,
            currentStateDigest,
            candidate as AttemptFor<TTypes>,
            evidencePolicy,
            instrumentation,
            {
              debugCommand: admission.value,
              resultConstraint: candidateIsFallback
                ? {
                  kind: "require",
                  resultKind: "faulted",
                  message: "Debug fault normalizer must return a faulted attempt",
                }
                : {
                  kind: "forbid",
                  resultKind: "rejected",
                  message: "An admitted DebugCommand cannot be rejected",
                },
            },
          );
        } catch (error) {
          if (candidateIsFallback) throw error;
          if (isHmrInvalidated()) return hmrInvalidatedV1;
          try {
            candidate = normalizeFault(error);
          } catch (normalizerError) {
            if (isHmrInvalidated()) return hmrInvalidatedV1;
            throw normalizerError;
          }
          candidateIsFallback = true;
          if (isHmrInvalidated()) return hmrInvalidatedV1;
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(
            before,
            currentStateDigest,
            candidate,
            evidencePolicy,
            instrumentation,
            {
              debugCommand: admission.value,
              resultConstraint: {
                kind: "require",
                resultKind: "faulted",
                message: "Debug fault normalizer must return a faulted attempt",
              },
            },
          );
        }
        if (isHmrInvalidated()) return hmrInvalidatedV1;

        withCanonicalCommandHandoffInternalV1(
          admission,
          "command_log_append",
          () =>
            withFinalizedEvidenceHandoffInternalV1(
              finalizedAttempt,
              () =>
                commandLog.append(
                  Object.freeze({
                    source: "debug" as const,
                    command: admission.value,
                  }),
                  finalizedAttempt,
                ),
            ),
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
          const replacementClaim = claimAuthoritativeReplacementBindingInternalV1<
            TTypes["snapshot"],
            TResult
          >(outcome as object, prepareReplacementCommit);
          const prepareDebugReplacementV1 = () => {
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
            ) as DeepReadonly<TTypes["snapshot"]>;
            runIntegrityV1Schema.parse(finalized.integrity);
            const preparedCommandLogAnchor = commandLog.prepareAnchor(finalized);
            return Object.freeze({ finalized, preparedCommandLogAnchor });
          };
          let finalized: DeepReadonly<TTypes["snapshot"]>;
          let preparedCommandLogAnchor: ReturnType<typeof commandLog.prepareAnchor>;
          let preparedReplacement:
            | PreparedAuthoritativeReplacementCommitControlInternalV1
            | null = null;
          if (replacementClaim !== undefined) {
            const normalizePrepareFailure = replacementClaim.available
              ? replacementClaim.binding.normalizePrepareFailure
              : replacementClaim.normalizePrepareFailure;
            try {
              if (!replacementClaim.available) {
                throw new TypeError("reused authoritative replacement binding");
              }
              const replacementBinding = replacementClaim.binding;
              const preparedSession = prepareDebugReplacementV1();
              finalized = preparedSession.finalized;
              preparedCommandLogAnchor = preparedSession.preparedCommandLogAnchor;
              const preparation = Object.freeze(
                {},
              ) as AuthoritativeReplacementPreparationInternalV1;
              const prepared = replacementBinding.prepare(
                finalized,
                "replace_replay_base",
                authoritativeReplacementOwner,
                preparation,
              );
              preparedReplacement = preparedReplacementControlInternalV1(prepared);
              if (
                preparedReplacement.status !== "prepared" ||
                preparedReplacement.owner !== authoritativeReplacementOwner ||
                preparedReplacement.preparation !== preparation
              ) {
                throw new TypeError("reused authoritative replacement token");
              }
              if (preparedReplacement.migrationReceipt !== null) {
                throw new TypeError("debug replacement cannot install a migration receipt");
              }
            } catch (error) {
              if (isHmrInvalidated()) return hmrInvalidatedV1;
              const normalized = normalizePrepareFailure(error);
              return isHmrInvalidated() ? hmrInvalidatedV1 : normalized;
            }
          } else {
            const preparedSession = prepareDebugReplacementV1();
            finalized = preparedSession.finalized;
            preparedCommandLogAnchor = preparedSession.preparedCommandLogAnchor;
            prepareReplacementCommit?.(finalized);
          }
          if (isHmrInvalidated()) return hmrInvalidatedV1;
          if (preparedReplacement !== null) {
            preparedReplacement.status = "committing";
            preparedReplacement.commit();
            preparedReplacement.status = "committed";
          }
          commandLog.establishPreparedAnchor(preparedCommandLogAnchor);
          snapshot = finalized;
          currentStateDigest = preparedCommandLogAnchor.stateDigest;
          installSnapshotDigestV1(runtimeControl, snapshot, currentStateDigest);
          installedMigrationReceipt = null;
          stableStatus = "ready";
          publishReplacementV1(preparedReplacement);
          return outcome.result;
        } catch (error) {
          if (isHmrInvalidated()) return hmrInvalidatedV1;
          recordFaultCause("session", error);
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
    getLastFaultCause: () => lastFaultCause,
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
      let admission: CanonicalCommandAdmissionInternalV1<TTypes["command"]>;
      try {
        admission = admitCanonicalCommandInternalV1(parsed, instrumentation);
      } catch (error) {
        return Promise.reject(error);
      }
      return enqueue(async () => {
        if (stableStatus === "fault_paused" || stableStatus === "hmr_invalidated") {
          return Object.freeze({
            kind: "not_executed" as const,
            code: stableStatus,
          });
        }
        const before = snapshot as DeepReadonly<TTypes["snapshot"]>;
        const normalizeFault = (error: unknown): AttemptFor<TTypes> => {
          recordFaultCause("dispatch", error);
          const normalized = input.normalizeUnexpectedDispatchFault(error, before);
          if (isThenable(normalized)) {
            throw new TypeError("Dispatch fault normalizer returned thenable");
          }
          return normalized;
        };
        let candidate: AttemptFor<TTypes> | undefined;
        let attemptReturned = false;
        let candidateIsFallback = false;
        let executionFailure: { readonly error: unknown } | undefined;
        try {
          candidate = await withCanonicalCommandHandoffInternalV1(
            admission,
            "simulation_game_execute",
            () =>
              input.executeAttempt(
                before,
                admission.value,
                input.executionContext,
              ),
          );
          attemptReturned = true;
        } catch (error) {
          executionFailure = { error };
        }
        if (isHmrInvalidated()) return hmrInvalidatedV1;
        if (executionFailure !== undefined) {
          try {
            candidate = normalizeFault(executionFailure.error);
          } catch (error) {
            if (isHmrInvalidated()) return hmrInvalidatedV1;
            throw error;
          }
          attemptReturned = true;
          candidateIsFallback = true;
          if (isHmrInvalidated()) return hmrInvalidatedV1;
        }
        if (!attemptReturned) throw new TypeError("Game command produced no attempt");
        let finalizedAttempt: FinalizedAttemptFor<TTypes>;
        try {
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(
            before,
            currentStateDigest,
            candidate as AttemptFor<TTypes>,
            evidencePolicy,
            instrumentation,
            candidateIsFallback
              ? {
                resultConstraint: {
                  kind: "require",
                  resultKind: "faulted",
                  message: "Dispatch fault normalizer must return a faulted attempt",
                },
              }
              : undefined,
          );
        } catch (error) {
          if (candidateIsFallback) throw error;
          if (isHmrInvalidated()) return hmrInvalidatedV1;
          try {
            candidate = normalizeFault(error);
          } catch (normalizerError) {
            if (isHmrInvalidated()) return hmrInvalidatedV1;
            throw normalizerError;
          }
          candidateIsFallback = true;
          if (isHmrInvalidated()) return hmrInvalidatedV1;
          finalizedAttempt = finalizeCommandAttemptV1<TTypes>(
            before,
            currentStateDigest,
            candidate,
            evidencePolicy,
            instrumentation,
            {
              resultConstraint: {
                kind: "require",
                resultKind: "faulted",
                message: "Dispatch fault normalizer must return a faulted attempt",
              },
            },
          );
        }
        if (isHmrInvalidated()) return hmrInvalidatedV1;
        withCanonicalCommandHandoffInternalV1(
          admission,
          "command_log_append",
          () =>
            withFinalizedEvidenceHandoffInternalV1(
              finalizedAttempt,
              () =>
                commandLog.append(
                  Object.freeze({
                    source: "game" as const,
                    command: admission.value,
                  }),
                  finalizedAttempt,
                ),
            ),
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

/** @internal Standard-Core schema policy; intentionally absent from package barrels. */
export function createCoreGameSessionInternalV1<TTypes extends GameSimulationTypeMapV1>(
  input: GameSessionInputV1<TTypes>,
  evidencePolicy: EvidencePolicyFor<TTypes>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): GameSessionCompositionV1<TTypes> {
  return createInternal(input, instrumentation, evidencePolicy);
}
