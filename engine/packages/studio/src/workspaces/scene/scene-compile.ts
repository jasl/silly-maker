// SPDX-License-Identifier: MIT
import type { SceneDocumentV1, StageContentCatalogV1, StageRenderTargetV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  sceneFromDocumentV1,
  sceneSettledMutationsV1,
} from "@sillymaker/base";

/**
 * Pure scene-workspace compilation: one draft Document plus an optional
 * replay point become a detached render target (no Session, no reconciler)
 * with the projection diagnostics kept for the authoring panel.
 */

const studioPreviewStageIdV1 = "stage.studio.preview";

export type StudioCompiledV1 =
  | {
    readonly kind: "ok";
    readonly target: StageRenderTargetV1;
    /** Projection warnings (unresolved content, invalid geometry, …). */
    readonly diagnostics: readonly string[];
  }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export function compileSceneV1(
  draft: SceneDocumentV1,
  throughCueId: string | null,
  catalog: StageContentCatalogV1,
): StudioCompiledV1 {
  try {
    const scene = sceneFromDocumentV1(draft);
    const layerIds: string[] = [];
    for (const entry of scene.sceneDocument.entries) {
      if (!layerIds.includes(entry.layerId as string)) layerIds.push(entry.layerId as string);
    }
    if (layerIds.length === 0) return { kind: "empty" };
    const emptyStage = createSemanticStageStateV1({
      stageId: studioPreviewStageIdV1,
      layerIds,
    });
    // The workspace default is the declared composition: every declared
    // entry visible at its declared placement, so an actor whose story arc
    // ends with a hide cue (an exit) still has a selection box to edit.
    // Replay-through-cue is the explicit story-progression preview.
    const mutations = throughCueId === null
      ? scene.openMutations(emptyStage)
      : sceneSettledMutationsV1(scene, { throughCueId });
    const outcome = reduceStageMutationsV1(emptyStage, mutations);
    if (outcome.kind !== "applied") {
      return { kind: "error", message: outcome.rejection.reason };
    }
    // Studio surfaces projection diagnostics instead of silently degrading:
    // the Player's fallback resilience is right for players, not authors.
    const projection = projectStageRenderTargetV1(outcome.state, catalog);
    return {
      kind: "ok",
      target: projection.target,
      diagnostics: Object.freeze(
        projection.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
      ),
    };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

export function defaultPlacementV1(): {
  x: number;
  y: number;
  scalePermille: number;
  opacityPermille: number;
  mirrored: boolean;
} {
  return { x: 0, y: 0, scalePermille: 1000, opacityPermille: 1000, mirrored: false };
}

/** One draft edit: clone, mutate the plain JSON, and hand back a new doc. */
export function editDocumentV1(
  draft: SceneDocumentV1,
  mutate: (plain: {
    entries: {
      layerId: string;
      tag: string;
      contentId: string;
      zOrder?: number;
      placement?: ReturnType<typeof defaultPlacementV1>;
      appearance?: Record<string, string>;
      ambient?: { motionId: string; phaseMs?: number };
    }[];
    cues: { cueId: string; kind: string; tag: string; motionId?: string }[];
  }) => void,
): SceneDocumentV1 {
  const plain = JSON.parse(JSON.stringify(draft)) as Parameters<typeof mutate>[0];
  mutate(plain);
  return plain as unknown as SceneDocumentV1;
}
