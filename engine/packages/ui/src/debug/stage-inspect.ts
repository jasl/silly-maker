// SPDX-License-Identifier: MIT
import type { StageRenderTargetV1 } from "@sillymaker/base";

import type {
  SemanticStageInspectionFrameV1,
  SemanticStageInspectionPortV1,
  SemanticStageInspectionSnapshotV1,
} from "../stage/semantic-stage-host.tsx";
import type { StageFramePhaseV1, StageRenderFrameV1 } from "../stage/stage-reconciler.ts";

/**
 * Dev-only Stage provenance: while a mounted stage carries an inspect
 * controller, every rendered frame reports which entries are on stage and
 * which transition/motion identities are (or were last) driving them. The
 * registry lives entirely in DevTools memory — it never enters production
 * DOM attributes, authoritative State, Saves, or replay.
 */

export interface StageEntryProvenanceV1 {
  /** Stable per-frame key: entry key, or the ghost occurrence for exits. */
  readonly frameKey: string;
  readonly layerId: string;
  readonly tag: string;
  readonly contentId: string;
  readonly rendererId: string;
  readonly phase: StageFramePhaseV1;
  /** The in-flight transition; null once the entry settles. */
  readonly transitionId: string | null;
  readonly transitionKind: string | null;
  /** The in-flight motion payload id; null outside motion transitions. */
  readonly motionId: string | null;
  /** The last transition observed on this entry key, kept after settle. */
  readonly lastTransitionId: string | null;
  /** The last motion observed on this entry key, kept after settle. */
  readonly lastMotionId: string | null;
}

export interface StageInspectSnapshotV1 extends SemanticStageInspectionSnapshotV1 {
  /** Whether click-to-inspect hit surfaces are active on the stage. */
  readonly enabled: boolean;
  /** Whether declared hit regions render as labeled outlines on the stage. */
  readonly highlightHitRegions: boolean;
  readonly selectedKey: string | null;
  readonly entries: readonly StageEntryProvenanceV1[];
  readonly activeCueId: string | null;
}

export type StageInspectFrameInputV1 = SemanticStageInspectionFrameV1;

/**
 * A non-authoritative presentation fixture captured from the live stage:
 * the settled render target as currently shown (exiting ghosts dropped)
 * plus the selected entry. Editor-local reproduction input only — never a
 * Save, Snapshot, replay anchor, or a way back into gameplay.
 */
export interface StageInspectCaptureV1 {
  readonly target: StageRenderTargetV1;
  readonly entryKey: string | null;
}

export interface StageInspectControllerV1 extends SemanticStageInspectionPortV1 {
  observe(): StageInspectSnapshotV1;
  subscribe(listener: () => void): () => void;
  setEnabled(enabled: boolean): void;
  /** Dev-only: outline the declared hit regions on the live stage. */
  setHighlightHitRegions(enabled: boolean): void;
  select(frameKey: string | null): void;
  /** Fed by the mounted stage host after each committed render. */
  recordFrame(input: StageInspectFrameInputV1): void;
  /** Captures the current live rendering as a detached preview fixture. */
  capture(): StageInspectCaptureV1 | null;
}

interface LastIdentityV1 {
  readonly transitionId: string;
  readonly motionId: string | null;
}

function provenanceSignatureV1(snapshot: StageInspectSnapshotV1): string {
  const parts = snapshot.entries.map(
    (entry) =>
      `${entry.frameKey}\u0000${entry.phase}\u0000${entry.transitionId ?? ""}\u0000${
        entry.motionId ?? ""
      }\u0000${entry.lastTransitionId ?? ""}\u0000${entry.contentId}`,
  );
  return `${snapshot.enabled ? "1" : "0"}${snapshot.highlightHitRegions ? "1" : "0"}\u0001${
    snapshot.selectedKey ?? ""
  }\u0001${snapshot.activeCueId ?? ""}\u0001${parts.join("\u0001")}`;
}

/**
 * One controller per mounted stage: the Story passes it both to the stage
 * (`SemanticStageV1 inspect=`) and to its DevDock provenance panel. State is
 * observable through the usual snapshot/subscribe pair.
 */
export function createStageInspectControllerV1(): StageInspectControllerV1 {
  const listeners = new Set<() => void>();
  const lastByKey = new Map<string, LastIdentityV1>();
  let enabled = false;
  let highlightHitRegions = false;
  let selectedKey: string | null = null;
  let entries: readonly StageEntryProvenanceV1[] = Object.freeze([]);
  let activeCueId: string | null = null;
  let lastFrame: StageRenderFrameV1 | null = null;
  let snapshot: StageInspectSnapshotV1 = Object.freeze({
    enabled,
    highlightHitRegions,
    selectedKey,
    entries,
    activeCueId,
  });
  let signature = provenanceSignatureV1(snapshot);

  const commit = (): void => {
    const next: StageInspectSnapshotV1 = Object.freeze({
      enabled,
      highlightHitRegions,
      selectedKey,
      entries,
      activeCueId,
    });
    const nextSignature = provenanceSignatureV1(next);
    if (nextSignature === signature) return;
    snapshot = next;
    signature = nextSignature;
    for (const listener of [...listeners]) listener();
  };

  return Object.freeze({
    observe: () => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setEnabled(next: boolean): void {
      enabled = next;
      commit();
    },
    setHighlightHitRegions(next: boolean): void {
      highlightHitRegions = next;
      commit();
    },
    select(frameKey: string | null): void {
      selectedKey = frameKey;
      commit();
    },
    capture(): StageInspectCaptureV1 | null {
      if (lastFrame === null) return null;
      const target: StageRenderTargetV1 = Object.freeze({
        stageId: lastFrame.stageId,
        layers: Object.freeze(
          lastFrame.layers.map((layer) =>
            Object.freeze({
              layerId: layer.layerId,
              transform: layer.transform,
              entries: Object.freeze(
                layer.entries
                  .filter((frameEntry) => frameEntry.phase !== "exiting")
                  .map((frameEntry) => frameEntry.entry),
              ),
            })
          ),
        ),
        camera: lastFrame.camera,
        requiredAssetIds: lastFrame.requiredAssetIds,
      });
      const selected = selectedKey !== null &&
        entries.some((entry) => entry.frameKey === selectedKey && entry.phase !== "exiting");
      return Object.freeze({ target, entryKey: selected ? selectedKey : null });
    },
    recordFrame(input: StageInspectFrameInputV1): void {
      lastFrame = input.frame;
      const collected: StageEntryProvenanceV1[] = [];
      for (const layer of input.frame.layers) {
        for (const frameEntry of layer.entries) {
          if (frameEntry.phase !== "exiting" && frameEntry.transitionId !== null) {
            lastByKey.set(frameEntry.entry.key, {
              transitionId: frameEntry.transitionId,
              motionId: frameEntry.motion?.motionId ?? null,
            });
          }
          const last = frameEntry.phase === "exiting"
            ? null
            : (lastByKey.get(frameEntry.entry.key) ?? null);
          collected.push(
            Object.freeze({
              frameKey: frameEntry.frameKey,
              layerId: layer.layerId,
              tag: frameEntry.entry.tag,
              contentId: frameEntry.entry.contentId,
              rendererId: frameEntry.entry.rendererId,
              phase: frameEntry.phase,
              transitionId: frameEntry.transitionId,
              transitionKind: frameEntry.transitionKind,
              motionId: frameEntry.motion?.motionId ?? null,
              lastTransitionId: last?.transitionId ?? frameEntry.transitionId,
              lastMotionId: last?.motionId ?? frameEntry.motion?.motionId ?? null,
            }),
          );
        }
      }
      entries = Object.freeze(collected);
      activeCueId = input.activeCueId;
      if (selectedKey !== null && !collected.some((entry) => entry.frameKey === selectedKey)) {
        selectedKey = null;
      }
      commit();
    },
  });
}
