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

export interface StageTransitionAcknowledgmentV1 {
  readonly occurrenceId: string;
  readonly transitionId: string;
  readonly epoch: number;
  readonly outcome: PresentationRunOutcomeV1;
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
  onAcknowledgment?(acknowledgment: StageTransitionAcknowledgmentV1): void;
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

interface ActiveTransitionV1 {
  readonly occurrenceId: string;
  readonly definition: StageTransitionDefinitionV1;
  readonly layerId: StageLayerIdV1;
  readonly entryKey: string;
  readonly changeKind: StageTargetChangeV1["kind"];
  /** Ghost content for exit/replace; interpolation source for move. */
  readonly previousEntry: StageRenderEntryV1 | null;
  readonly run: PresentationRunV1;
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
  const listeners = new Set<() => void>();

  let currentTarget: StageRenderTargetV1 | null = null;
  let currentRevision: number | null = null;
  let currentEpoch: number | null = null;
  let active: ActiveTransitionV1[] = [];
  let occurrenceCounter = 0;
  let suspended = false;
  let disposed = false;
  let readinessTickCancel: (() => void) | undefined;

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const acknowledge = (transition: ActiveTransitionV1, outcome: PresentationRunOutcomeV1): void => {
    if (disposed || !transition.definition.acknowledge) return;
    if (transition.run.epoch !== currentEpoch) return;
    options.onAcknowledgment?.(
      Object.freeze({
        occurrenceId: transition.occurrenceId,
        transitionId: transition.definition.transitionId,
        epoch: transition.run.epoch,
        outcome,
      }),
    );
  };

  const removeTransition = (transition: ActiveTransitionV1): void => {
    active = active.filter((candidate) => candidate !== transition);
  };

  const resolveReducedMotionV1 = (
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
    if (!active.some((transition) => transition.readiness !== null)) return;
    readinessTickCancel = options.clock.requestTick(() => {
      readinessTickCancel = undefined;
      pumpReadiness();
    });
  };

  const pumpReadiness = (): void => {
    let changed = false;
    for (const transition of [...active]) {
      if (transition.readiness === null) continue;
      if (assetsReady(transition.readiness.assetIds)) {
        transition.readiness = null;
        transition.run.start();
        if (suspended) transition.run.pause();
        changed = true;
        continue;
      }
      if (options.clock.now() >= transition.readiness.deadline) {
        options.reportFailure?.(
          "stage.transition_readiness_timeout",
          `transition ${transition.definition.transitionId} degraded after bounded wait`,
        );
        transition.readiness = null;
        transition.run.skipToEnd();
        changed = true;
      }
    }
    if (changed) notify();
    ensureReadinessTicking();
  };

  const startTransition = (
    change: StageTargetChangeV1,
    definition: StageTransitionDefinitionV1,
    epoch: number,
  ): void => {
    occurrenceCounter += 1;
    const occurrenceId = `stage-transition.${String(epoch)}.${String(occurrenceCounter)}`;
    const transition: ActiveTransitionV1 = {
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
        clock: options.clock,
        ...(definition.easing === "ease_in_out" ? { easing: easeInOutV1 } : {}),
        onFinished: (outcome) => {
          removeTransition(transition);
          acknowledge(transition, outcome);
          notify();
        },
      }),
      readiness: null,
    };
    active.push(transition);
    transition.run.subscribe(notify);

    const demanded =
      change.next === null
        ? (change.previous?.assetIds ?? [])
        : [...(change.previous?.assetIds ?? []), ...change.next.assetIds];
    if (definition.readiness.kind === "wait_for_assets" && !assetsReady(demanded)) {
      transition.readiness = Object.freeze({
        deadline: options.clock.now() + definition.readiness.timeoutMs,
        assetIds: Object.freeze([...demanded]),
      });
      ensureReadinessTicking();
      return;
    }
    transition.run.start();
    if (suspended) transition.run.pause();
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
        fromPlacement:
          transition.changeKind === "move" ? (transition.previousEntry?.placement ?? null) : null,
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

  return Object.freeze({
    retarget(input: StageRetargetInputV1): void {
      if (disposed) return;

      // Epoch changes (load, rollback, rebootstrap) restore a stable target:
      // every in-flight edge is dropped silently and no new edge is derived.
      if (currentEpoch !== null && input.epoch !== currentEpoch) {
        for (const transition of active) transition.run.dispose();
        active = [];
        currentTarget = input.target;
        currentRevision = input.revision;
        currentEpoch = input.epoch;
        notify();
        return;
      }

      // Commit-only: re-projections of the same committed revision are not
      // a new edge and must not replay transitions.
      if (currentEpoch === input.epoch && currentRevision === input.revision) {
        currentTarget = input.target;
        notify();
        return;
      }

      const previousTarget = currentTarget;
      const firstTarget = currentEpoch === null;
      currentEpoch = input.epoch;
      currentRevision = input.revision;
      currentTarget = input.target;

      // Bootstrap publication: restore the stable target without transitions.
      if (firstTarget || previousTarget === null) {
        notify();
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
        const definition = resolveReducedMotionV1(resolved);
        if (definition === null || definition.kind === "cut" || definition.durationMs <= 0) {
          // Instant settles (cut, zero duration, reduced-motion settle) still
          // owe their completion acknowledgment: a presentation barrier must
          // resolve whether or not any animation played.
          if (resolved.acknowledge && !disposed) {
            occurrenceCounter += 1;
            options.onAcknowledgment?.(
              Object.freeze({
                occurrenceId: `stage-transition.${String(input.epoch)}.${String(occurrenceCounter)}`,
                transitionId: resolved.transitionId,
                epoch: input.epoch,
                outcome: "completed" as const,
              }),
            );
          }
          continue;
        }
        startTransition(change, definition, input.epoch);
      }
      notify();
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
          }),
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
      for (const transition of [...active]) transition.run.skipToEnd();
    },

    suspend(): void {
      if (suspended) return;
      suspended = true;
      for (const transition of active) transition.run.pause();
    },

    resume(): void {
      if (!suspended) return;
      suspended = false;
      for (const transition of active) transition.run.resume();
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      readinessTickCancel?.();
      readinessTickCancel = undefined;
      for (const transition of active) transition.run.dispose();
      active = [];
      listeners.clear();
    },
  });
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
      }),
    ),
    camera: target.camera,
    requiredAssetIds: target.requiredAssetIds,
    settled: true,
    inputGate: Object.freeze({ blocked: false, skipOnInput: false }),
  });
}
