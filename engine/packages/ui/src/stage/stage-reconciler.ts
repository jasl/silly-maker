// SPDX-License-Identifier: MIT
import type {
  AssetId,
  StageCameraV1,
  StageLayerIdV1,
  StageLayerTransformV1,
  StageRenderEntryV1,
  StageRenderTargetV1,
  StageTargetChangeV1,
  StageTransitionCatalogV1,
  StageTransitionDefinitionV1,
  StagePlacementV1,
} from "@sillymaker/base";
import { parseStageTransitionDefinitionV1 } from "@sillymaker/base";

import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createPresentationRunV1, easeInOutV1 } from "../presentation-run/presentation-run.ts";
import type {
  PresentationRunOutcomeV1,
  PresentationRunV1,
} from "../presentation-run/presentation-run.ts";

/**
 * The Stage Reconciler: observes projected StageRenderTargets on each
 * committed publication edge and produces non-authoritative render frames of
 * previous + target + retained exiting entries + active transition runs. It
 * derives commit-only TransitionRequests from target diffs through the Story
 * catalog and never writes gameplay State.
 */

export type StageFramePhaseV1 = "entering" | "settled" | "exiting";

export interface StageFrameEntryV1 {
  /** Unique per frame: target entries use entry.key; ghosts add the occurrence. */
  readonly frameKey: string;
  readonly entry: StageRenderEntryV1;
  readonly phase: StageFramePhaseV1;
  readonly transitionKind: StageTransitionDefinitionV1["kind"] | null;
  /** Eased progress toward the target state, 1 when settled. */
  readonly progress: number;
  readonly slide: { readonly x: number; readonly y: number } | null;
  /** Move transitions interpolate from this placement toward entry.placement. */
  readonly fromPlacement: StagePlacementV1 | null;
}

export interface StageFrameLayerV1 {
  readonly layerId: StageLayerIdV1;
  readonly transform: StageLayerTransformV1;
  readonly entries: readonly StageFrameEntryV1[];
}

export interface StageInputGateV1 {
  /** An active transition declared input policy `block`. */
  readonly blocked: boolean;
  /** An active transition wants the next input to skip it to the end. */
  readonly skipOnInput: boolean;
}

export interface StageRenderFrameV1 {
  readonly stageId: StageRenderTargetV1["stageId"];
  readonly layers: readonly StageFrameLayerV1[];
  readonly camera: StageCameraV1;
  /** Union of the current target and retained exiting entries. */
  readonly requiredAssetIds: readonly AssetId[];
  readonly settled: boolean;
  readonly inputGate: StageInputGateV1;
}

export interface StageRetargetInputV1 {
  readonly target: StageRenderTargetV1;
  readonly revision: number;
  readonly epoch: number;
}

export interface CreateStageReconcilerOptionsV1 {
  readonly clock: PresentationClockV1;
  readonly catalog: StageTransitionCatalogV1;
  /** Live reduced-motion query; checked when each run is derived. */
  readonly prefersReducedMotion?: () => boolean;
  /** Readiness probe for wait_for_assets transitions; defaults to ready. */
  readonly assetsReady?: (assetIds: readonly AssetId[]) => boolean;
  reportFailure?(code: string, detail: string): void;
}

export interface StageReconcilerV1 {
  retarget(input: StageRetargetInputV1): void;
  frame(): StageRenderFrameV1;
  subscribe(listener: () => void): () => void;
  /** Skip every active run; used by skip-to-end input policy consumers. */
  skipAll(): void;
  /** Page-visibility suspension: pause and later resume all active runs. */
  suspend(): void;
  resume(): void;
  dispose(): void;
}

declare const stageAcknowledgedRunProofBrandInternalV1: unique symbol;

export interface StageAcknowledgedRunProofInternalV1 {
  readonly [stageAcknowledgedRunProofBrandInternalV1]: true;
}

declare const stagePresentationGenerationProofBrandInternalV1: unique symbol;

export interface StagePresentationGenerationProofInternalV1 {
  readonly [stagePresentationGenerationProofBrandInternalV1]: true;
}

export type StagePresentationGenerationCaptureResultInternalV1 =
  | Readonly<{
    readonly kind: "captured";
    readonly relation: "initial" | "equal" | "higher";
    readonly proof: StagePresentationGenerationProofInternalV1;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly proof: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly proof: null;
  }>;

export type StagePresentationGenerationRetargetResultInternalV1 =
  | Readonly<{ readonly kind: "retargeted" }>
  | Readonly<{ readonly kind: "stale" }>
  | Readonly<{ readonly kind: "faulted" }>;

export interface StageAcknowledgedRunCommitGuardInternalV1 {
  isCommitCurrentInternalV1(): boolean;
}

export interface StageAcknowledgedRunTerminalPortInternalV1 {
  deliverTerminalInternalV1(
    input: Readonly<{
      readonly proof: StageAcknowledgedRunProofInternalV1;
      readonly outcome: PresentationRunOutcomeV1;
    }>,
  ): void;
}

export type StageAcknowledgedRunRetargetResultInternalV1 =
  | Readonly<{
    readonly kind: "armed";
    readonly proof: StageAcknowledgedRunProofInternalV1;
  }>
  | Readonly<{
    readonly kind: "stale";
    readonly proof: null;
  }>
  | Readonly<{
    readonly kind: "faulted";
    readonly code:
      | "stage.acknowledged_run_unmatched"
      | "stage.acknowledged_run_ambiguous"
      | "stage.acknowledged_run_faulted";
    readonly proof: null;
  }>;

export interface StageAcknowledgedRunAuthorityInternalV1 {
  retargetInternalV1(input: StageRetargetInputV1): void;
  retargetPresentationGenerationInternalV1(
    input: StageRetargetInputV1,
  ): StagePresentationGenerationRetargetResultInternalV1;
  captureCurrentPresentationGenerationInternalV1(
    previousProof: unknown,
  ): StagePresentationGenerationCaptureResultInternalV1;
  retargetWithAcknowledgedRunInternalV1(
    input: Readonly<{
      readonly retarget: StageRetargetInputV1;
      readonly expectedTransitionId: string;
      readonly commitGuard: StageAcknowledgedRunCommitGuardInternalV1;
      readonly terminalPort: StageAcknowledgedRunTerminalPortInternalV1;
    }>,
  ): StageAcknowledgedRunRetargetResultInternalV1;
  isAcknowledgedRunTerminalStackActiveInternalV1(
    proof: unknown,
  ): boolean;
  skipAllInternalV1(): void;
  suspendInternalV1(): void;
  resumeInternalV1(): void;
  disposeInternalV1(): void;
}

interface CapturedStageAcknowledgedRunCommitGuardInternalV1 {
  readonly receiver: StageAcknowledgedRunCommitGuardInternalV1;
  readonly invoke: StageAcknowledgedRunCommitGuardInternalV1["isCommitCurrentInternalV1"];
}

interface CapturedStageAcknowledgedRunTerminalPortInternalV1 {
  readonly receiver: StageAcknowledgedRunTerminalPortInternalV1;
  readonly invoke: StageAcknowledgedRunTerminalPortInternalV1["deliverTerminalInternalV1"];
}

interface StageAcknowledgedRunProofRecordInternalV1 {
  readonly authority: StageAcknowledgedRunAuthorityInternalV1;
  readonly reconciler: StageReconcilerV1;
  readonly epoch: number;
  readonly logicalTransitionId: string;
  readonly effectiveOccurrenceId: string;
  readonly proof: StageAcknowledgedRunProofInternalV1;
  readonly terminalPort: CapturedStageAcknowledgedRunTerminalPortInternalV1;
  terminalSealed: boolean;
  terminalStackDepth: number;
}

interface StagePresentationGenerationProofRecordInternalV1 {
  readonly authority: StageAcknowledgedRunAuthorityInternalV1;
  readonly reconciler: StageReconcilerV1;
  readonly epoch: number;
  readonly proof: StagePresentationGenerationProofInternalV1;
}

interface StageReconcilerAcknowledgedRunClaimInternalV1 {
  claim(exactClaimant: unknown): StageAcknowledgedRunAuthorityInternalV1;
}

const stageReconcilerAcknowledgedRunClaimsInternalV1 = new WeakMap<
  StageReconcilerV1,
  StageReconcilerAcknowledgedRunClaimInternalV1
>();
const stageAcknowledgedRunProofRecordsInternalV1 = new WeakMap<
  StageAcknowledgedRunProofInternalV1,
  StageAcknowledgedRunProofRecordInternalV1
>();
const stagePresentationGenerationProofRecordsInternalV1 = new WeakMap<
  StagePresentationGenerationProofInternalV1,
  StagePresentationGenerationProofRecordInternalV1
>();
const freezeStageAcknowledgedRunDataInternalV1 = Object.freeze;
const applyStageAcknowledgedRunIntrinsicInternalV1 = Reflect.apply;
const isArrayStageRecordIntrinsicInternalV1 = Array.isArray;
const getPrototypeOfStageRecordIntrinsicInternalV1 = Reflect.getPrototypeOf;
const ownKeysStageRecordIntrinsicInternalV1 = Reflect.ownKeys;
const hasOwnStageRecordIntrinsicInternalV1 = Object.hasOwn;
const getOwnPropertyDescriptorStageRecordIntrinsicInternalV1 = Reflect.getOwnPropertyDescriptor;
const createStageRecordIntrinsicInternalV1 = Object.create;
const stageRecordObjectPrototypeInternalV1 = Object.prototype;
const isSafeIntegerStageGenerationIntrinsicInternalV1 = Number.isSafeInteger;
const getStageAcknowledgedRunProofRecordIntrinsicInternalV1 = WeakMap.prototype.get;
const setStageAcknowledgedRunProofRecordIntrinsicInternalV1 = WeakMap.prototype.set;
const getStagePresentationGenerationProofRecordIntrinsicInternalV1 = WeakMap.prototype.get;
const setStagePresentationGenerationProofRecordIntrinsicInternalV1 = WeakMap.prototype.set;

const stageAcknowledgedRunStaleResultInternalV1 = Object.freeze({
  kind: "stale" as const,
  proof: null,
});
const stageAcknowledgedRunUnmatchedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "stage.acknowledged_run_unmatched" as const,
  proof: null,
});
const stageAcknowledgedRunAmbiguousResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "stage.acknowledged_run_ambiguous" as const,
  proof: null,
});
const stageAcknowledgedRunFaultedResultInternalV1 = Object.freeze({
  kind: "faulted" as const,
  code: "stage.acknowledged_run_faulted" as const,
  proof: null,
});
const stagePresentationGenerationStaleCaptureResultInternalV1 =
  freezeStageAcknowledgedRunDataInternalV1({
    kind: "stale" as const,
    proof: null,
  });
const stagePresentationGenerationFaultedCaptureResultInternalV1 =
  freezeStageAcknowledgedRunDataInternalV1({
    kind: "faulted" as const,
    proof: null,
  });
const stagePresentationGenerationRetargetedResultInternalV1 =
  freezeStageAcknowledgedRunDataInternalV1({ kind: "retargeted" as const });
const stagePresentationGenerationStaleRetargetResultInternalV1 =
  freezeStageAcknowledgedRunDataInternalV1({ kind: "stale" as const });
const stagePresentationGenerationFaultedRetargetResultInternalV1 =
  freezeStageAcknowledgedRunDataInternalV1({ kind: "faulted" as const });

function captureExactOwnDataRecordInternalV1(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (typeof value !== "object" || value === null || isArrayStageRecordIntrinsicInternalV1(value)) {
    return null;
  }
  if (
    getPrototypeOfStageRecordIntrinsicInternalV1(value) !== stageRecordObjectPrototypeInternalV1
  ) {
    return null;
  }
  const ownKeys = ownKeysStageRecordIntrinsicInternalV1(value);
  if (ownKeys.length !== expectedKeys.length) return null;
  for (const ownKey of ownKeys) {
    if (typeof ownKey !== "string") return null;
  }
  for (const expectedKey of expectedKeys) {
    if (!hasOwnStageRecordIntrinsicInternalV1(value, expectedKey)) return null;
  }
  const captured = createStageRecordIntrinsicInternalV1(null) as Record<string, unknown>;
  for (const key of expectedKeys) {
    const descriptor = getOwnPropertyDescriptorStageRecordIntrinsicInternalV1(value, key);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    captured[key] = descriptor.value;
  }
  return captured;
}

function captureStageAcknowledgedRunCommitGuardInternalV1(
  value: unknown,
): CapturedStageAcknowledgedRunCommitGuardInternalV1 | null {
  const record = captureExactOwnDataRecordInternalV1(value, [
    "isCommitCurrentInternalV1",
  ]);
  if (record === null || typeof record.isCommitCurrentInternalV1 !== "function") return null;
  return Object.freeze({
    receiver: value as StageAcknowledgedRunCommitGuardInternalV1,
    invoke: record.isCommitCurrentInternalV1 as StageAcknowledgedRunCommitGuardInternalV1[
      "isCommitCurrentInternalV1"
    ],
  });
}

function captureStageAcknowledgedRunTerminalPortInternalV1(
  value: unknown,
): CapturedStageAcknowledgedRunTerminalPortInternalV1 | null {
  const record = captureExactOwnDataRecordInternalV1(value, ["deliverTerminalInternalV1"]);
  if (record === null || typeof record.deliverTerminalInternalV1 !== "function") return null;
  return Object.freeze({
    receiver: value as StageAcknowledgedRunTerminalPortInternalV1,
    invoke: record.deliverTerminalInternalV1 as StageAcknowledgedRunTerminalPortInternalV1[
      "deliverTerminalInternalV1"
    ],
  });
}

export function claimStageAcknowledgedRunAuthorityInternalV1(
  reconciler: StageReconcilerV1,
  exactClaimant: unknown,
): StageAcknowledgedRunAuthorityInternalV1 {
  if (
    (typeof reconciler !== "object" && typeof reconciler !== "function") ||
    reconciler === null
  ) {
    throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
  }
  const claim = stageReconcilerAcknowledgedRunClaimsInternalV1.get(reconciler);
  if (claim === undefined) {
    throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
  }
  return claim.claim(exactClaimant);
}

interface ActiveTransitionV1 {
  readonly occurrenceId: string;
  readonly definition: StageTransitionDefinitionV1;
  readonly layerId: StageLayerIdV1;
  readonly entryKey: string;
  readonly changeKind: StageTargetChangeV1["kind"];
  /** Ghost content for exit/replace; interpolation source for move. */
  readonly previousEntry: StageRenderEntryV1 | null;
  readonly run: PresentationRunV1;
  /** Internal proof metadata; never projected through the public Stage API. */
  acknowledgedRun: StageAcknowledgedRunProofRecordInternalV1 | null;
  /** Readiness hold: the run starts when ready or the deadline passes. */
  readiness: { readonly deadline: number; readonly assetIds: readonly AssetId[] } | null;
}

function entriesByKeyV1(
  target: StageRenderTargetV1,
): ReadonlyMap<string, { readonly layerId: StageLayerIdV1; readonly entry: StageRenderEntryV1 }> {
  const map = new Map<string, { layerId: StageLayerIdV1; entry: StageRenderEntryV1 }>();
  for (const layer of target.layers) {
    for (const entry of layer.entries) map.set(entry.key, { layerId: layer.layerId, entry });
  }
  return map;
}

function placementsEqualV1(left: StagePlacementV1, right: StagePlacementV1): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.scalePermille === right.scalePermille &&
    left.opacityPermille === right.opacityPermille &&
    left.mirrored === right.mirrored
  );
}

function appearancesEqualV1(
  left: StageRenderEntryV1["appearance"],
  right: StageRenderEntryV1["appearance"],
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
}

function deriveChangesV1(
  previous: StageRenderTargetV1 | null,
  next: StageRenderTargetV1,
): readonly StageTargetChangeV1[] {
  const changes: StageTargetChangeV1[] = [];
  const previousEntries = previous === null ? new Map() : entriesByKeyV1(previous);
  const nextEntries = entriesByKeyV1(next);

  for (const [key, { layerId, entry }] of nextEntries) {
    const before = previousEntries.get(key);
    if (before === undefined) {
      changes.push({ kind: "enter", layerId, entryKey: key, previous: null, next: entry });
      continue;
    }
    const previousEntry = before.entry;
    if (previousEntry.contentId !== entry.contentId) {
      changes.push({
        kind: "replace",
        layerId,
        entryKey: key,
        previous: previousEntry,
        next: entry,
      });
    } else if (!appearancesEqualV1(previousEntry.appearance, entry.appearance)) {
      changes.push({
        kind: "appearance",
        layerId,
        entryKey: key,
        previous: previousEntry,
        next: entry,
      });
    } else if (!placementsEqualV1(previousEntry.placement, entry.placement)) {
      changes.push({ kind: "move", layerId, entryKey: key, previous: previousEntry, next: entry });
    }
  }
  for (const [key, { layerId, entry }] of previousEntries) {
    if (!nextEntries.has(key)) {
      changes.push({ kind: "exit", layerId, entryKey: key, previous: entry, next: null });
    }
  }
  return changes;
}

export function createStageReconcilerV1(
  options: CreateStageReconcilerOptionsV1,
): StageReconcilerV1 {
  const prefersReducedMotion = options.prefersReducedMotion ?? (() => false);
  const assetsReady = options.assetsReady ?? (() => true);
  const readStageClockNowInternalV1 = options.clock.now.bind(options.clock);
  const requestStageClockTickInternalV1 = options.clock.requestTick.bind(options.clock);
  const listeners = new Set<() => void>();

  let currentTarget: StageRenderTargetV1 | null = null;
  let currentRevision: number | null = null;
  let currentEpoch: number | null = null;
  let active: ActiveTransitionV1[] = [];
  let occurrenceCounter = 0;
  let suspended = false;
  let disposed = false;
  let readinessTickCancel: (() => void) | undefined;
  let exactClaimant: object | ((...args: never[]) => unknown) | null = null;
  let authority!: StageAcknowledgedRunAuthorityInternalV1;
  let reconciler!: StageReconcilerV1;
  let currentPresentationGenerationProofRecord:
    | StagePresentationGenerationProofRecordInternalV1
    | null = null;

  interface AcknowledgedRunOperationInternalV1 {
    phase: "planning" | "interrupting" | "committed";
    reentryCount: number;
    validatedReentryCount: number;
    expectedInterruption: ActiveTransitionV1 | null;
    readonly deferredClockTicks: Set<StageClockTickInternalV1>;
  }

  interface StageClockTickInternalV1 {
    readonly callback: (now: number) => void;
    cancelled: boolean;
    cancelUnderlying: (() => void) | null;
    deferredOperation: AcknowledgedRunOperationInternalV1 | null;
  }
  let acknowledgedRunOperation: AcknowledgedRunOperationInternalV1 | null = null;
  let authorityMutationDepth = 0;

  const scheduleStageClockTick = (ticket: StageClockTickInternalV1): void => {
    if (ticket.cancelled) return;
    ticket.cancelUnderlying = requestStageClockTickInternalV1((now) => {
      ticket.cancelUnderlying = null;
      if (ticket.cancelled) return;
      const operation = acknowledgedRunOperation;
      if (operation !== null && operation.phase !== "committed") {
        ticket.deferredOperation = operation;
        operation.deferredClockTicks.add(ticket);
        return;
      }
      ticket.cancelled = true;
      ticket.callback(now);
    });
  };

  const stageClockInternalV1: PresentationClockV1 = Object.freeze({
    now(): number {
      return readStageClockNowInternalV1();
    },
    requestTick(callback: (now: number) => void): () => void {
      const ticket: StageClockTickInternalV1 = {
        callback,
        cancelled: false,
        cancelUnderlying: null,
        deferredOperation: null,
      };
      scheduleStageClockTick(ticket);
      return () => {
        if (ticket.cancelled) return;
        ticket.cancelled = true;
        ticket.cancelUnderlying?.();
        ticket.cancelUnderlying = null;
        ticket.deferredOperation?.deferredClockTicks.delete(ticket);
        ticket.deferredOperation = null;
      };
    },
  });

  const rearmDeferredStageClockTicks = (
    operation: AcknowledgedRunOperationInternalV1,
  ): void => {
    for (const ticket of operation.deferredClockTicks) {
      ticket.deferredOperation = null;
      if (!ticket.cancelled) {
        try {
          scheduleStageClockTick(ticket);
        } catch {
          // A deferred tick cannot be allowed to replace the acknowledged
          // operation's already-selected frozen result from a finally block.
          ticket.cancelled = true;
          ticket.cancelUnderlying = null;
        }
      }
    }
    operation.deferredClockTicks.clear();
  };

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const notifyContained = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A claimed Stage observer cannot interrupt private terminal delivery
        // or leave an acknowledged retarget half-committed.
      }
    }
  };

  const reportFailureContained = (code: string, detail: string): void => {
    try {
      options.reportFailure?.(code, detail);
    } catch {
      // Diagnostics remain observational on a claimed Stage path.
    }
  };

  const removeTransition = (transition: ActiveTransitionV1): void => {
    active = active.filter((candidate) => candidate !== transition);
  };

  const shouldContainTransitionObservers = (transition: ActiveTransitionV1): boolean =>
    exactClaimant !== null || authorityMutationDepth > 0 ||
    transition.acknowledgedRun !== null ||
    acknowledgedRunOperation?.expectedInterruption === transition;

  const deliverAcknowledgedTerminal = (
    record: StageAcknowledgedRunProofRecordInternalV1,
    outcome: PresentationRunOutcomeV1,
  ): void => {
    if (record.terminalSealed) return;
    record.terminalSealed = true;
    try {
      applyStageAcknowledgedRunIntrinsicInternalV1(
        record.terminalPort.invoke,
        record.terminalPort.receiver,
        [
          freezeStageAcknowledgedRunDataInternalV1({ proof: record.proof, outcome }),
        ],
      );
    } catch {
      // The proof is already sealed. A hostile private port is not retried and
      // cannot block cleanup or the public Stage observers that follow.
    }
  };

  const enterAcknowledgedTerminalStack = (
    record: StageAcknowledgedRunProofRecordInternalV1,
  ): void => {
    record.terminalStackDepth += 1;
  };

  const leaveAcknowledgedTerminalStack = (
    record: StageAcknowledgedRunProofRecordInternalV1,
  ): void => {
    if (record.terminalStackDepth > 0) record.terminalStackDepth -= 1;
  };

  const resolveReducedMotionLegacyV1 = (
    definition: StageTransitionDefinitionV1,
  ): StageTransitionDefinitionV1 | null => {
    if (!prefersReducedMotion()) return definition;
    if (definition.reducedMotion.kind === "settle") return null;
    const fallback = options.catalog.resolveTransitionById?.(definition.reducedMotion.transitionId);
    if (fallback === undefined || fallback === null) {
      options.reportFailure?.(
        "stage.transition_fallback_missing",
        `reduced-motion fallback ${definition.reducedMotion.transitionId} is not resolvable`,
      );
      return null;
    }
    // A fallback must not chain further fallbacks.
    return fallback.reducedMotion.kind === "settle" ? fallback : null;
  };

  const ensureReadinessTicking = (): void => {
    if (readinessTickCancel !== undefined || disposed) return;
    let hasReadinessHold = false;
    for (const transition of active) {
      if (transition.readiness === null) continue;
      hasReadinessHold = true;
      break;
    }
    if (!hasReadinessHold) return;
    readinessTickCancel = stageClockInternalV1.requestTick(() => {
      readinessTickCancel = undefined;
      pumpReadiness();
    });
  };

  const pumpReadiness = (): void => {
    let changed = false;
    let contained = false;
    const terminalStackRecords: StageAcknowledgedRunProofRecordInternalV1[] = [];
    try {
      for (const transition of [...active]) {
        if (transition.readiness === null) continue;
        if (assetsReady(transition.readiness.assetIds)) {
          transition.readiness = null;
          transition.run.start();
          if (suspended) transition.run.pause();
          contained ||= shouldContainTransitionObservers(transition);
          changed = true;
          continue;
        }
        if (stageClockInternalV1.now() >= transition.readiness.deadline) {
          const detail =
            `transition ${transition.definition.transitionId} degraded after bounded wait`;
          transition.readiness = null;
          if (shouldContainTransitionObservers(transition)) {
            // The private terminal, public acknowledgment, diagnostic and
            // final Stage notification share one proof-bound terminal stack.
            if (transition.acknowledgedRun !== null) {
              enterAcknowledgedTerminalStack(transition.acknowledgedRun);
              terminalStackRecords.push(transition.acknowledgedRun);
            }
            transition.run.skipToEnd();
            reportFailureContained("stage.transition_readiness_timeout", detail);
            contained = true;
          } else {
            options.reportFailure?.("stage.transition_readiness_timeout", detail);
            transition.run.skipToEnd();
          }
          changed = true;
        }
      }
      if (changed) {
        if (contained || exactClaimant !== null) notifyContained();
        else notify();
      }
      ensureReadinessTicking();
    } finally {
      for (const record of terminalStackRecords) leaveAcknowledgedTerminalStack(record);
    }
  };

  const createActiveTransition = (
    change: StageTargetChangeV1,
    definition: StageTransitionDefinitionV1,
    epoch: number,
    occurrenceId: string,
  ): ActiveTransitionV1 => {
    let transition!: ActiveTransitionV1;
    transition = {
      occurrenceId,
      definition,
      layerId: change.layerId,
      entryKey: change.entryKey,
      changeKind: change.kind,
      previousEntry: change.previous,
      run: createPresentationRunV1({
        runId: occurrenceId,
        definitionId: definition.transitionId,
        epoch,
        durationMs: definition.durationMs,
        clock: stageClockInternalV1,
        ...(definition.easing === "ease_in_out" ? { easing: easeInOutV1 } : {}),
        onFinished: (outcome) => {
          const acknowledgedRecord = transition.acknowledgedRun;
          if (acknowledgedRecord !== null) enterAcknowledgedTerminalStack(acknowledgedRecord);
          try {
            removeTransition(transition);
            if (acknowledgedRecord !== null) {
              deliverAcknowledgedTerminal(acknowledgedRecord, outcome);
            }
            if (shouldContainTransitionObservers(transition)) {
              notifyContained();
            } else {
              notify();
            }
          } finally {
            if (acknowledgedRecord !== null) leaveAcknowledgedTerminalStack(acknowledgedRecord);
          }
        },
      }),
      acknowledgedRun: null,
      readiness: null,
    };
    transition.run.subscribe(() => {
      const terminal = transition.run.status() === "settled" ||
        transition.run.status() === "cancelled";
      if (terminal && transition.acknowledgedRun !== null) return;
      if (shouldContainTransitionObservers(transition)) notifyContained();
      else notify();
    });
    return transition;
  };

  const demandedAssetsForChange = (change: StageTargetChangeV1): readonly AssetId[] =>
    change.next === null
      ? (change.previous?.assetIds ?? [])
      : [...(change.previous?.assetIds ?? []), ...change.next.assetIds];

  const startTransitionLegacy = (
    change: StageTargetChangeV1,
    definition: StageTransitionDefinitionV1,
    epoch: number,
  ): void => {
    occurrenceCounter += 1;
    const occurrenceId = `stage-transition.${String(epoch)}.${String(occurrenceCounter)}`;
    const transition = createActiveTransition(change, definition, epoch, occurrenceId);
    active.push(transition);

    const demanded = demandedAssetsForChange(change);
    if (definition.readiness.kind === "wait_for_assets" && !assetsReady(demanded)) {
      transition.readiness = Object.freeze({
        deadline: stageClockInternalV1.now() + definition.readiness.timeoutMs,
        assetIds: Object.freeze([...demanded]),
      });
      ensureReadinessTicking();
      return;
    }
    transition.run.start();
    if (suspended) transition.run.pause();
  };

  const performAuthorityMutation = (mutation: () => void): void => {
    if (acknowledgedRunOperation !== null) {
      acknowledgedRunOperation.reentryCount += 1;
      return;
    }
    if (authorityMutationDepth !== 0) return;
    authorityMutationDepth += 1;
    try {
      mutation();
    } finally {
      authorityMutationDepth -= 1;
    }
  };

  const frameEntriesForLayer = (
    layerId: StageLayerIdV1,
    entries: readonly StageRenderEntryV1[],
  ): StageFrameEntryV1[] => {
    const frameEntries: StageFrameEntryV1[] = entries.map((entry) => {
      const transition = active.find(
        (candidate) => candidate.entryKey === entry.key && candidate.changeKind !== "exit",
      );
      if (transition === undefined) {
        return {
          frameKey: entry.key,
          entry,
          phase: "settled" as const,
          transitionKind: null,
          progress: 1,
          slide: null,
          fromPlacement: null,
        };
      }
      return {
        frameKey: entry.key,
        entry,
        phase: "entering" as const,
        transitionKind: transition.definition.kind,
        progress: transition.run.progress(),
        slide: transition.definition.slide,
        fromPlacement: transition.changeKind === "move"
          ? (transition.previousEntry?.placement ?? null)
          : null,
      };
    });
    for (const transition of active) {
      if (transition.layerId !== layerId || transition.previousEntry === null) continue;
      if (transition.changeKind !== "exit" && transition.changeKind !== "replace") continue;
      frameEntries.push({
        frameKey: `${transition.entryKey}:exit:${transition.occurrenceId}`,
        entry: transition.previousEntry,
        phase: "exiting",
        transitionKind: transition.definition.kind,
        progress: transition.run.progress(),
        slide: transition.definition.slide,
        fromPlacement: null,
      });
    }
    return frameEntries;
  };

  const retargetLegacy = (input: StageRetargetInputV1, contained: boolean): void => {
    if (disposed) return;

    // Epoch changes (load, rollback, rebootstrap) restore a stable target:
    // every in-flight edge is dropped silently and no new edge is derived.
    if (currentEpoch !== null && input.epoch !== currentEpoch) {
      for (const transition of active) transition.run.dispose();
      active = [];
      currentTarget = input.target;
      currentRevision = input.revision;
      currentEpoch = input.epoch;
      if (contained) notifyContained();
      else notify();
      return;
    }

    // Commit-only: re-projections of the same committed revision are not
    // a new edge and must not replay transitions.
    if (currentEpoch === input.epoch && currentRevision === input.revision) {
      currentTarget = input.target;
      if (contained) notifyContained();
      else notify();
      return;
    }

    const previousTarget = currentTarget;
    const firstTarget = currentEpoch === null;
    currentEpoch = input.epoch;
    currentRevision = input.revision;
    currentTarget = input.target;

    // Bootstrap publication: restore the stable target without transitions.
    if (firstTarget || previousTarget === null) {
      if (contained) notifyContained();
      else notify();
      return;
    }

    const changes = deriveChangesV1(previousTarget, input.target);
    const suppressedKeys = new Set<string>();

    // Interrupt in-flight runs whose entries change again.
    const changedKeys = new Set(changes.map((change) => change.entryKey));
    for (const transition of [...active]) {
      if (!changedKeys.has(transition.entryKey)) continue;
      if (transition.definition.interruption === "settle_and_retarget") {
        transition.run.settleNow();
      } else {
        suppressedKeys.add(transition.entryKey);
        transition.run.cancel();
      }
    }

    for (const change of changes) {
      if (suppressedKeys.has(change.entryKey)) continue;
      const resolved = options.catalog.resolveTransition(change);
      if (resolved === null) continue;
      const definition = resolveReducedMotionLegacyV1(resolved);
      if (definition === null || definition.kind === "cut" || definition.durationMs <= 0) {
        continue;
      }
      startTransitionLegacy(change, definition, input.epoch);
    }
    if (contained) notifyContained();
    else notify();
  };

  const skipAllLegacy = (): void => {
    for (const transition of [...active]) transition.run.skipToEnd();
  };

  const suspendLegacy = (): void => {
    if (suspended) return;
    suspended = true;
    for (const transition of active) transition.run.pause();
  };

  const resumeLegacy = (): void => {
    if (!suspended) return;
    suspended = false;
    for (const transition of active) transition.run.resume();
  };

  const disposeLegacy = (): void => {
    if (disposed) return;
    disposed = true;
    currentPresentationGenerationProofRecord = null;
    readinessTickCancel?.();
    readinessTickCancel = undefined;
    for (const transition of active) transition.run.dispose();
    active = [];
    listeners.clear();
  };

  const capturePresentationGenerationRetargetInput = (
    input: unknown,
  ): StageRetargetInputV1 | null => {
    const raw = captureExactOwnDataRecordInternalV1(input, [
      "target",
      "revision",
      "epoch",
    ]);
    if (
      raw === null ||
      typeof raw.revision !== "number" ||
      !isSafeIntegerStageGenerationIntrinsicInternalV1(raw.revision) ||
      raw.revision < 0 ||
      typeof raw.epoch !== "number" ||
      !isSafeIntegerStageGenerationIntrinsicInternalV1(raw.epoch) ||
      raw.epoch < 0
    ) {
      return null;
    }
    return freezeStageAcknowledgedRunDataInternalV1({
      target: raw.target as StageRenderTargetV1,
      revision: raw.revision,
      epoch: raw.epoch,
    });
  };

  const mintCurrentPresentationGenerationProof = (
    epoch: number,
  ): StagePresentationGenerationProofRecordInternalV1 => {
    const proof = freezeStageAcknowledgedRunDataInternalV1(
      {},
    ) as StagePresentationGenerationProofInternalV1;
    const record: StagePresentationGenerationProofRecordInternalV1 = {
      authority,
      reconciler,
      epoch,
      proof,
    };
    applyStageAcknowledgedRunIntrinsicInternalV1(
      setStagePresentationGenerationProofRecordIntrinsicInternalV1,
      stagePresentationGenerationProofRecordsInternalV1,
      [proof, record],
    );
    currentPresentationGenerationProofRecord = record;
    return record;
  };

  const currentPresentationGenerationProof = (
    epoch: number,
  ): StagePresentationGenerationProofRecordInternalV1 | null => {
    const current = currentPresentationGenerationProofRecord;
    if (current === null) return mintCurrentPresentationGenerationProof(epoch);
    if (
      current.authority !== authority || current.reconciler !== reconciler ||
      current.epoch !== epoch
    ) {
      return null;
    }
    return current;
  };

  const captureCurrentPresentationGeneration = (
    previousProof: unknown,
  ): StagePresentationGenerationCaptureResultInternalV1 => {
    if (acknowledgedRunOperation !== null) {
      acknowledgedRunOperation.reentryCount += 1;
      return stagePresentationGenerationFaultedCaptureResultInternalV1;
    }
    if (authorityMutationDepth !== 0) {
      return stagePresentationGenerationFaultedCaptureResultInternalV1;
    }
    if (
      disposed || currentTarget === null || currentRevision === null ||
      currentEpoch === null
    ) {
      return stagePresentationGenerationStaleCaptureResultInternalV1;
    }

    if (previousProof === null) {
      const current = currentPresentationGenerationProof(currentEpoch);
      if (current === null) {
        return stagePresentationGenerationFaultedCaptureResultInternalV1;
      }
      return freezeStageAcknowledgedRunDataInternalV1({
        kind: "captured" as const,
        relation: "initial" as const,
        proof: current.proof,
      });
    }
    if (
      (typeof previousProof !== "object" && typeof previousProof !== "function") ||
      previousProof === null
    ) {
      return stagePresentationGenerationFaultedCaptureResultInternalV1;
    }

    let previous: StagePresentationGenerationProofRecordInternalV1 | undefined;
    try {
      previous = applyStageAcknowledgedRunIntrinsicInternalV1(
        getStagePresentationGenerationProofRecordIntrinsicInternalV1,
        stagePresentationGenerationProofRecordsInternalV1,
        [previousProof],
      ) as StagePresentationGenerationProofRecordInternalV1 | undefined;
    } catch {
      return stagePresentationGenerationFaultedCaptureResultInternalV1;
    }
    if (
      previous === undefined || previous.authority !== authority ||
      previous.reconciler !== reconciler || previous.proof !== previousProof
    ) {
      return stagePresentationGenerationFaultedCaptureResultInternalV1;
    }

    const current = currentPresentationGenerationProofRecord;
    if (previous.epoch === currentEpoch) {
      if (current !== previous) {
        return stagePresentationGenerationStaleCaptureResultInternalV1;
      }
      return freezeStageAcknowledgedRunDataInternalV1({
        kind: "captured" as const,
        relation: "equal" as const,
        proof: current.proof,
      });
    }
    if (previous.epoch > currentEpoch) {
      return stagePresentationGenerationStaleCaptureResultInternalV1;
    }
    if (previous.epoch < currentEpoch) {
      const higher = currentPresentationGenerationProof(currentEpoch);
      if (higher === null) {
        return stagePresentationGenerationFaultedCaptureResultInternalV1;
      }
      return freezeStageAcknowledgedRunDataInternalV1({
        kind: "captured" as const,
        relation: "higher" as const,
        proof: higher.proof,
      });
    }
    return stagePresentationGenerationFaultedCaptureResultInternalV1;
  };

  const retargetPresentationGeneration = (
    input: unknown,
  ): StagePresentationGenerationRetargetResultInternalV1 => {
    if (acknowledgedRunOperation !== null) {
      acknowledgedRunOperation.reentryCount += 1;
      return stagePresentationGenerationFaultedRetargetResultInternalV1;
    }
    if (authorityMutationDepth !== 0) {
      return stagePresentationGenerationFaultedRetargetResultInternalV1;
    }
    if (disposed) return stagePresentationGenerationStaleRetargetResultInternalV1;

    authorityMutationDepth += 1;
    try {
      const retarget = capturePresentationGenerationRetargetInput(input);
      if (retarget === null) {
        return stagePresentationGenerationFaultedRetargetResultInternalV1;
      }
      const initialized = currentTarget !== null || currentRevision !== null ||
        currentEpoch !== null;
      if (
        initialized &&
        (currentTarget === null || currentRevision === null || currentEpoch === null)
      ) {
        return stagePresentationGenerationFaultedRetargetResultInternalV1;
      }
      if (currentEpoch === retarget.epoch) {
        return stagePresentationGenerationStaleRetargetResultInternalV1;
      }

      retargetLegacy(retarget, true);
      currentPresentationGenerationProofRecord = null;
      return stagePresentationGenerationRetargetedResultInternalV1;
    } catch {
      return stagePresentationGenerationFaultedRetargetResultInternalV1;
    } finally {
      authorityMutationDepth -= 1;
    }
  };

  interface PlannedAcknowledgedEdgeInternalV1 {
    readonly change: StageTargetChangeV1;
    readonly logicalDefinition: StageTransitionDefinitionV1;
    readonly effectiveDefinition: StageTransitionDefinitionV1 | null;
    readonly occurrenceId: string | null;
    readonly transition: ActiveTransitionV1 | null;
    readonly matched: boolean;
    readonly diagnostic: Readonly<{ code: string; detail: string }> | null;
  }

  interface PlannedAcknowledgedInterruptionInternalV1 {
    readonly transition: ActiveTransitionV1;
    readonly kind: StageTransitionDefinitionV1["interruption"];
  }

  const retargetWithAcknowledgedRun = (
    input: unknown,
  ): StageAcknowledgedRunRetargetResultInternalV1 => {
    const operation: AcknowledgedRunOperationInternalV1 = {
      phase: "planning",
      reentryCount: 0,
      validatedReentryCount: 0,
      expectedInterruption: null,
      deferredClockTicks: new Set(),
    };
    acknowledgedRunOperation = operation;
    let armedResult:
      | Extract<
        StageAcknowledgedRunRetargetResultInternalV1,
        { readonly kind: "armed" }
      >
      | null = null;

    try {
      const outer = captureExactOwnDataRecordInternalV1(input, [
        "retarget",
        "expectedTransitionId",
        "commitGuard",
        "terminalPort",
      ]);
      if (outer === null || typeof outer.expectedTransitionId !== "string") {
        return stageAcknowledgedRunFaultedResultInternalV1;
      }
      const rawRetarget = captureExactOwnDataRecordInternalV1(outer.retarget, [
        "target",
        "revision",
        "epoch",
      ]);
      const commitGuard = captureStageAcknowledgedRunCommitGuardInternalV1(
        outer.commitGuard,
      );
      const terminalPort = captureStageAcknowledgedRunTerminalPortInternalV1(
        outer.terminalPort,
      );
      if (
        rawRetarget === null || commitGuard === null || terminalPort === null ||
        typeof rawRetarget.revision !== "number" ||
        !Number.isSafeInteger(rawRetarget.revision) || rawRetarget.revision < 0 ||
        typeof rawRetarget.epoch !== "number" ||
        !Number.isSafeInteger(rawRetarget.epoch) || rawRetarget.epoch < 0
      ) {
        return stageAcknowledgedRunFaultedResultInternalV1;
      }
      const retarget: StageRetargetInputV1 = Object.freeze({
        target: rawRetarget.target as StageRenderTargetV1,
        revision: rawRetarget.revision,
        epoch: rawRetarget.epoch,
      });
      const expectedTransitionId = outer.expectedTransitionId;

      if (
        disposed || currentTarget === null || currentEpoch === null ||
        currentEpoch !== retarget.epoch || currentRevision === retarget.revision
      ) {
        return stageAcknowledgedRunUnmatchedResultInternalV1;
      }

      const previousTarget = currentTarget;
      const activeSnapshot = [...active];
      const changes = deriveChangesV1(previousTarget, retarget.target);
      const changedKeys = new Set(changes.map((change) => change.entryKey));
      const interruptions: PlannedAcknowledgedInterruptionInternalV1[] = [];
      const suppressedKeys = new Set<string>();
      for (const transition of activeSnapshot) {
        if (!changedKeys.has(transition.entryKey)) continue;
        const interruption = transition.definition.interruption;
        interruptions.push(Object.freeze({ transition, kind: interruption }));
        if (interruption === "cancel_to_target") {
          suppressedKeys.add(transition.entryKey);
        }
      }

      const plannedEdges: PlannedAcknowledgedEdgeInternalV1[] = [];
      const animatedTransitions: ActiveTransitionV1[] = [];
      let plannedOccurrenceCounter = occurrenceCounter;
      const catalog = options.catalog;
      const resolveTransition = catalog.resolveTransition;
      if (typeof resolveTransition !== "function") {
        return stageAcknowledgedRunFaultedResultInternalV1;
      }
      let fallbackResolverCaptured = false;
      let fallbackResolver: StageTransitionCatalogV1["resolveTransitionById"];

      for (const change of changes) {
        if (suppressedKeys.has(change.entryKey)) continue;
        const rawLogical = Reflect.apply(resolveTransition, catalog, [change]);
        if (rawLogical === null) continue;
        const logicalDefinition = parseStageTransitionDefinitionV1(rawLogical);
        const matched = logicalDefinition.acknowledge &&
          logicalDefinition.transitionId === expectedTransitionId;

        let effectiveDefinition: StageTransitionDefinitionV1 | null = logicalDefinition;
        let diagnostic: Readonly<{ code: string; detail: string }> | null = null;
        if (prefersReducedMotion()) {
          if (logicalDefinition.reducedMotion.kind === "settle") {
            effectiveDefinition = null;
          } else {
            if (!fallbackResolverCaptured) {
              fallbackResolver = catalog.resolveTransitionById;
              fallbackResolverCaptured = true;
            }
            const rawFallback = fallbackResolver === undefined
              ? null
              : Reflect.apply(fallbackResolver, catalog, [
                logicalDefinition.reducedMotion.transitionId,
              ]);
            if (rawFallback === null || rawFallback === undefined) {
              effectiveDefinition = null;
              diagnostic = Object.freeze({
                code: "stage.transition_fallback_missing",
                detail:
                  `reduced-motion fallback ${logicalDefinition.reducedMotion.transitionId} is not resolvable`,
              });
            } else {
              const fallback = parseStageTransitionDefinitionV1(rawFallback);
              effectiveDefinition = fallback.reducedMotion.kind === "settle" ? fallback : null;
            }
          }
        }

        const animated = effectiveDefinition !== null &&
          effectiveDefinition.kind !== "cut" && effectiveDefinition.durationMs > 0;
        let occurrenceId: string | null = null;
        if (animated || logicalDefinition.acknowledge) {
          plannedOccurrenceCounter += 1;
          occurrenceId = `stage-transition.${String(retarget.epoch)}.${
            String(plannedOccurrenceCounter)
          }`;
        }

        let transition: ActiveTransitionV1 | null = null;
        if (animated && effectiveDefinition !== null && occurrenceId !== null) {
          transition = createActiveTransition(
            change,
            effectiveDefinition,
            retarget.epoch,
            occurrenceId,
          );
          const demanded = demandedAssetsForChange(change);
          if (
            effectiveDefinition.readiness.kind === "wait_for_assets" &&
            !assetsReady(demanded)
          ) {
            transition.readiness = Object.freeze({
              deadline: stageClockInternalV1.now() + effectiveDefinition.readiness.timeoutMs,
              assetIds: Object.freeze([...demanded]),
            });
          }
          animatedTransitions.push(transition);
        }
        plannedEdges.push(Object.freeze({
          change,
          logicalDefinition,
          effectiveDefinition,
          occurrenceId,
          transition,
          matched,
          diagnostic,
        }));
      }

      if (operation.reentryCount !== 0) {
        return stageAcknowledgedRunFaultedResultInternalV1;
      }
      const matches = plannedEdges.filter((edge) => edge.matched);
      if (matches.length === 0) return stageAcknowledgedRunUnmatchedResultInternalV1;
      if (matches.length > 1) return stageAcknowledgedRunAmbiguousResultInternalV1;
      const matchedEdge = matches[0];
      if (matchedEdge === undefined || matchedEdge.occurrenceId === null) {
        return stageAcknowledgedRunFaultedResultInternalV1;
      }

      const interruptedSet = new Set(interruptions.map(({ transition }) => transition));
      const retainedActive = activeSnapshot.filter((transition) => !interruptedSet.has(transition));
      const committedActive = [...retainedActive, ...animatedTransitions];
      const expectedActiveAfterInterruptions: ActiveTransitionV1[][] = [];
      const processedInterruptions = new Set<ActiveTransitionV1>();
      for (const { transition } of interruptions) {
        processedInterruptions.add(transition);
        const expected: ActiveTransitionV1[] = [];
        for (const candidate of activeSnapshot) {
          if (!processedInterruptions.has(candidate)) expected.push(candidate);
        }
        expectedActiveAfterInterruptions.push(expected);
      }

      // These objects remain unreachable until the final guard succeeds. All
      // allocation and freezing happens before that guard so publication is a
      // callback-free sequence of local assignments.
      const proof = freezeStageAcknowledgedRunDataInternalV1(
        {},
      ) as StageAcknowledgedRunProofInternalV1;
      const proofRecord: StageAcknowledgedRunProofRecordInternalV1 = {
        authority,
        reconciler,
        epoch: retarget.epoch,
        logicalTransitionId: expectedTransitionId,
        effectiveOccurrenceId: matchedEdge.occurrenceId,
        proof,
        terminalPort,
        terminalSealed: false,
        terminalStackDepth: 0,
      };
      const preparedArmedResult = freezeStageAcknowledgedRunDataInternalV1({
        kind: "armed" as const,
        proof,
      });
      const proofRecordInstallArguments = [proof, proofRecord] as const;

      const activeMatchesExpected = (expected: readonly ActiveTransitionV1[]): boolean => {
        if (active.length !== expected.length) return false;
        for (let index = 0; index < expected.length; index += 1) {
          if (active[index] !== expected[index]) return false;
        }
        return true;
      };

      const guardCurrent = (): "current" | "stale" | "faulted" => {
        let guarded: unknown;
        try {
          guarded = applyStageAcknowledgedRunIntrinsicInternalV1(
            commitGuard.invoke,
            commitGuard.receiver,
            [],
          );
        } catch {
          return "faulted";
        }
        if (guarded === false) return "stale";
        if (guarded !== true || operation.reentryCount !== operation.validatedReentryCount) {
          return "faulted";
        }
        operation.validatedReentryCount = operation.reentryCount;
        return "current";
      };

      let activeMatches = activeMatchesExpected(activeSnapshot);
      let guardResult = guardCurrent();
      if (guardResult === "stale") return stageAcknowledgedRunStaleResultInternalV1;
      if (guardResult === "faulted" || !activeMatches) {
        return stageAcknowledgedRunFaultedResultInternalV1;
      }

      operation.phase = "interrupting";
      for (let index = 0; index < interruptions.length; index += 1) {
        const interruption = interruptions[index]!;
        const { transition } = interruption;
        operation.expectedInterruption = transition;
        try {
          if (interruption.kind === "settle_and_retarget") {
            transition.run.settleNow();
          } else {
            transition.run.cancel();
          }
        } finally {
          operation.expectedInterruption = null;
        }
        activeMatches = activeMatchesExpected(expectedActiveAfterInterruptions[index]!);
        guardResult = guardCurrent();
        if (guardResult === "stale") return stageAcknowledgedRunStaleResultInternalV1;
        if (guardResult === "faulted" || !activeMatches) {
          return stageAcknowledgedRunFaultedResultInternalV1;
        }
      }

      // The final guard has succeeded. The proof becomes authentic and
      // reachable only through these callback-free local assignments.
      applyStageAcknowledgedRunIntrinsicInternalV1(
        setStageAcknowledgedRunProofRecordIntrinsicInternalV1,
        stageAcknowledgedRunProofRecordsInternalV1,
        proofRecordInstallArguments,
      );
      if (matchedEdge.transition !== null) {
        matchedEdge.transition.acknowledgedRun = proofRecord;
      }
      currentEpoch = retarget.epoch;
      currentRevision = retarget.revision;
      currentTarget = retarget.target;
      occurrenceCounter = plannedOccurrenceCounter;
      active = committedActive;
      operation.phase = "committed";
      armedResult = preparedArmedResult;

      let synchronousTerminalRecord: StageAcknowledgedRunProofRecordInternalV1 | null = null;
      try {
        for (const edge of plannedEdges) {
          if (edge.transition !== null) {
            if (edge.transition.readiness === null) {
              edge.transition.run.start();
              if (suspended) edge.transition.run.pause();
            }
          } else if (edge.logicalDefinition.acknowledge && edge.occurrenceId !== null) {
            if (edge === matchedEdge) {
              synchronousTerminalRecord = proofRecord;
              enterAcknowledgedTerminalStack(proofRecord);
              deliverAcknowledgedTerminal(proofRecord, "completed");
            }
          }
          if (edge.diagnostic !== null) {
            reportFailureContained(edge.diagnostic.code, edge.diagnostic.detail);
          }
        }
        ensureReadinessTicking();
        notifyContained();
      } finally {
        if (synchronousTerminalRecord !== null) {
          leaveAcknowledgedTerminalStack(synchronousTerminalRecord);
        }
      }
      return armedResult;
    } catch {
      return armedResult ?? stageAcknowledgedRunFaultedResultInternalV1;
    } finally {
      if (acknowledgedRunOperation === operation) acknowledgedRunOperation = null;
      rearmDeferredStageClockTicks(operation);
    }
  };

  const authorityCandidate: StageAcknowledgedRunAuthorityInternalV1 = {
    retargetInternalV1(
      this: StageAcknowledgedRunAuthorityInternalV1,
      input: StageRetargetInputV1,
    ): void {
      if (this !== authority) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      performAuthorityMutation(() => {
        if (
          disposed || currentTarget === null || currentRevision === null ||
          currentEpoch === null || input.epoch !== currentEpoch
        ) {
          return;
        }
        retargetLegacy(input, true);
      });
    },
    retargetPresentationGenerationInternalV1(
      this: StageAcknowledgedRunAuthorityInternalV1,
      input: StageRetargetInputV1,
    ): StagePresentationGenerationRetargetResultInternalV1 {
      if (this !== authority) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      return retargetPresentationGeneration(input);
    },
    captureCurrentPresentationGenerationInternalV1(
      this: StageAcknowledgedRunAuthorityInternalV1,
      previousProof: unknown,
    ): StagePresentationGenerationCaptureResultInternalV1 {
      if (this !== authority) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      return captureCurrentPresentationGeneration(previousProof);
    },
    retargetWithAcknowledgedRunInternalV1(
      this: StageAcknowledgedRunAuthorityInternalV1,
      input: Readonly<{
        readonly retarget: StageRetargetInputV1;
        readonly expectedTransitionId: string;
        readonly commitGuard: StageAcknowledgedRunCommitGuardInternalV1;
        readonly terminalPort: StageAcknowledgedRunTerminalPortInternalV1;
      }>,
    ): StageAcknowledgedRunRetargetResultInternalV1 {
      if (this !== authority) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      if (acknowledgedRunOperation !== null) {
        acknowledgedRunOperation.reentryCount += 1;
        return stageAcknowledgedRunFaultedResultInternalV1;
      }
      if (authorityMutationDepth !== 0) {
        return stageAcknowledgedRunFaultedResultInternalV1;
      }
      return retargetWithAcknowledgedRun(input);
    },
    isAcknowledgedRunTerminalStackActiveInternalV1(
      this: StageAcknowledgedRunAuthorityInternalV1,
      proof: unknown,
    ): boolean {
      if (this !== authority) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      if (
        (typeof proof !== "object" && typeof proof !== "function") ||
        proof === null
      ) {
        return false;
      }
      const proofRecord = applyStageAcknowledgedRunIntrinsicInternalV1(
        getStageAcknowledgedRunProofRecordIntrinsicInternalV1,
        stageAcknowledgedRunProofRecordsInternalV1,
        [proof],
      ) as StageAcknowledgedRunProofRecordInternalV1 | undefined;
      return proofRecord !== undefined && proofRecord.authority === authority &&
        proofRecord.proof === proof && proofRecord.terminalStackDepth > 0;
    },
    skipAllInternalV1(this: StageAcknowledgedRunAuthorityInternalV1): void {
      if (this !== authority) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      performAuthorityMutation(skipAllLegacy);
    },
    suspendInternalV1(this: StageAcknowledgedRunAuthorityInternalV1): void {
      if (this !== authority) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      performAuthorityMutation(suspendLegacy);
    },
    resumeInternalV1(this: StageAcknowledgedRunAuthorityInternalV1): void {
      if (this !== authority) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      performAuthorityMutation(resumeLegacy);
    },
    disposeInternalV1(this: StageAcknowledgedRunAuthorityInternalV1): void {
      if (this !== authority) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      performAuthorityMutation(disposeLegacy);
    },
  };
  authority = Object.freeze(authorityCandidate);

  reconciler = Object.freeze({
    retarget(input: StageRetargetInputV1): void {
      if (exactClaimant !== null) return;
      retargetLegacy(input, false);
    },

    frame(): StageRenderFrameV1 {
      if (currentTarget === null) {
        throw new TypeError("stage reconciler has no target; retarget before reading frames");
      }
      const requiredAssetIds = new Set<AssetId>(currentTarget.requiredAssetIds);
      for (const transition of active) {
        if (transition.changeKind !== "exit" && transition.changeKind !== "replace") continue;
        for (const assetId of transition.previousEntry?.assetIds ?? []) {
          requiredAssetIds.add(assetId);
        }
      }
      return Object.freeze({
        stageId: currentTarget.stageId,
        layers: currentTarget.layers.map((layer) =>
          Object.freeze({
            layerId: layer.layerId,
            transform: layer.transform,
            entries: Object.freeze(frameEntriesForLayer(layer.layerId, layer.entries)),
          })
        ),
        camera: currentTarget.camera,
        requiredAssetIds: Object.freeze([...requiredAssetIds].sort()),
        settled: active.length === 0,
        inputGate: Object.freeze({
          blocked: active.some((transition) => transition.definition.inputPolicy === "block"),
          skipOnInput: active.some(
            (transition) => transition.definition.inputPolicy === "skip_to_end",
          ),
        }),
      });
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    skipAll(): void {
      if (exactClaimant !== null) return;
      skipAllLegacy();
    },

    suspend(): void {
      if (exactClaimant !== null) return;
      suspendLegacy();
    },

    resume(): void {
      if (exactClaimant !== null) return;
      resumeLegacy();
    },

    dispose(): void {
      if (exactClaimant !== null) return;
      disposeLegacy();
    },
  });
  stageReconcilerAcknowledgedRunClaimsInternalV1.set(reconciler, {
    claim(candidate: unknown): StageAcknowledgedRunAuthorityInternalV1 {
      if (
        (typeof candidate !== "object" && typeof candidate !== "function") ||
        candidate === null
      ) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      if (exactClaimant === null) {
        exactClaimant = candidate as object | ((...args: never[]) => unknown);
        return authority;
      }
      if (candidate !== exactClaimant) {
        throw new TypeError("ui.stage_acknowledged_run_authority_invalid");
      }
      return authority;
    },
  });
  return reconciler;
}

/** A settled frame for rendering a target without any reconciler. */
export function settledStageFrameV1(target: StageRenderTargetV1): StageRenderFrameV1 {
  return Object.freeze({
    stageId: target.stageId,
    layers: target.layers.map((layer) =>
      Object.freeze({
        layerId: layer.layerId,
        transform: layer.transform,
        entries: Object.freeze(
          layer.entries.map((entry) => ({
            frameKey: entry.key,
            entry,
            phase: "settled" as const,
            transitionKind: null,
            progress: 1,
            slide: null,
            fromPlacement: null,
          })),
        ),
      })
    ),
    camera: target.camera,
    requiredAssetIds: target.requiredAssetIds,
    settled: true,
    inputGate: Object.freeze({ blocked: false, skipOnInput: false }),
  });
}
