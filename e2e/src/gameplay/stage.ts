// SPDX-License-Identifier: MIT
import type {
  AuthoringSceneRuntimeV1,
  SemanticStageStateV1,
  StageMutationV1,
} from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  parseStageMutationV1,
  reduceAdmittedStageMutationsV1,
} from "@sillymaker/base";

import {
  labStageContentIdsV1,
  labStageIdV1,
  labStageLayerIdsV1,
  labStageTagsV1,
} from "../stage-ids.ts";

/**
 * Engine Lab semantic stage: two backgrounds, two characters, and one prop
 * driven by the Semantic Stage V1 contracts. Gameplay commands derive pure
 * mutation batches from the current stage; the reducer owns atomicity.
 */

function stageMutationsV1(batch: readonly unknown[]): readonly StageMutationV1[] {
  return (batch.map((mutation, index) =>
    parseStageMutationV1(mutation, `/mutations/${String(index)}`)
  ));
}

export function createInitialLabStageStateV1(): SemanticStageStateV1 {
  const empty = createSemanticStageStateV1({
    stageId: labStageIdV1,
    layerIds: [...labStageLayerIdsV1],
  });
  const outcome = reduceAdmittedStageMutationsV1(
    empty,
    stageMutationsV1([
      {
        kind: "show",
        layerId: "layer.e2e.background",
        tag: labStageTagsV1.background,
        contentId: labStageContentIdsV1.backgroundLab,
      },
    ]),
  );
  if (outcome.kind !== "applied") {
    throw new TypeError("initial lab stage state must be valid");
  }
  return outcome.state;
}

function stageHasTagV1(stage: SemanticStageStateV1, layerId: string, tag: string): boolean {
  const layer = stage.layers.find((candidate) => candidate.layerId === layerId);
  return layer !== undefined && layer.entries.some((entry) => entry.tag === tag);
}

/** The crate's authoritative art key mirrors the collector switch. */
export function labCollectorLatchAppearanceV1(
  engaged: boolean,
): Readonly<{ latch: "engaged" | "sealed" }> {
  return { latch: engaged ? "engaged" : "sealed" };
}

/** Collecting a sample reveals the crate prop once; later collects add nothing. */
export function labStageMutationsForCollectV1(
  stage: SemanticStageStateV1,
  collectorEngaged: boolean,
): readonly StageMutationV1[] {
  if (stageHasTagV1(stage, "layer.e2e.props", labStageTagsV1.crate)) return [];
  return stageMutationsV1([
    {
      kind: "show",
      layerId: "layer.e2e.props",
      tag: labStageTagsV1.crate,
      contentId: labStageContentIdsV1.propCrate,
      zOrder: 5,
      placement: { x: 1240, y: 760, scalePermille: 800, opacityPermille: 1000, mirrored: false },
      appearance: labCollectorLatchAppearanceV1(collectorEngaged),
    },
  ]);
}

/**
 * Stage-owner fold for the collector event. All writers of that event move
 * the same art key; the renderer never reads monitor State directly.
 */
export function labStageMutationsForCollectorLatchV1(
  stage: SemanticStageStateV1,
  engaged: boolean,
): readonly StageMutationV1[] {
  if (!stageHasTagV1(stage, "layer.e2e.props", labStageTagsV1.crate)) return [];
  return stageMutationsV1([
    {
      kind: "setAppearance",
      layerId: "layer.e2e.props",
      tag: labStageTagsV1.crate,
      appearance: labCollectorLatchAppearanceV1(engaged),
    },
  ]);
}

/** Beginning the procedure opens the one author-managed storeroom scene. */
export function labStageMutationsForBeginV1(
  stage: SemanticStageStateV1,
  scene: AuthoringSceneRuntimeV1,
): readonly StageMutationV1[] {
  return scene.openMutations(stage);
}

/** The drill Scene owns only shared layer order, so opening it preserves entries. */
export function labStageMutationsForDrillV1(
  stage: SemanticStageStateV1,
  scene: AuthoringSceneRuntimeV1,
): readonly StageMutationV1[] {
  return scene.openMutations(stage);
}

/** The shop's stage effect: whether the purchased banner already hangs. */
export function labStageHasBannerV1(stage: SemanticStageStateV1): boolean {
  return stageHasTagV1(stage, "layer.e2e.props", labStageTagsV1.banner);
}

/** Buying the banner hangs it above the stage; owning it twice is rejected. */
export function labStageMutationsForBannerV1(): readonly StageMutationV1[] {
  return stageMutationsV1([
    {
      kind: "show",
      layerId: "layer.e2e.props",
      tag: labStageTagsV1.banner,
      contentId: labStageContentIdsV1.propBanner,
      zOrder: 20,
      placement: { x: 800, y: 160, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
    },
  ]);
}

export interface LabStageProgressInputV1 {
  readonly completed: boolean;
  /** Samples remaining after this command commits; null when unchanged. */
  readonly samplesRemaining: number | null;
}

/** Advancing work focuses the lead character; completion settles the scene. */
export function labStageMutationsForProgressV1(
  stage: SemanticStageStateV1,
  input: LabStageProgressInputV1,
): readonly StageMutationV1[] {
  const batch: unknown[] = [
    {
      kind: "setAppearance",
      layerId: "layer.e2e.characters",
      tag: labStageTagsV1.alpha,
      appearance: { pose: "standing", expression: "focused" },
    },
  ];
  if (
    input.samplesRemaining !== null &&
    input.samplesRemaining <= 0 &&
    stageHasTagV1(stage, "layer.e2e.props", labStageTagsV1.crate)
  ) {
    batch.push({ kind: "hide", layerId: "layer.e2e.props", tag: labStageTagsV1.crate });
  }
  if (input.completed) {
    batch.push(
      {
        kind: "setAppearance",
        layerId: "layer.e2e.characters",
        tag: labStageTagsV1.alpha,
        appearance: { pose: "standing", expression: "pleased" },
      },
      {
        kind: "setAppearance",
        layerId: "layer.e2e.characters",
        tag: labStageTagsV1.beta,
        appearance: { pose: "standing", expression: "pleased" },
      },
      {
        kind: "setPlacement",
        layerId: "layer.e2e.characters",
        tag: labStageTagsV1.alpha,
        placement: { x: 640, y: 620, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
      },
      { kind: "setCamera", camera: { x: 0, y: 0, zoomPermille: 1150 } },
    );
  }
  return stageMutationsV1(batch);
}
