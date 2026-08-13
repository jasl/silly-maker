// SPDX-License-Identifier: MIT
// The opening scene package: `opening.scene.json` is the single authoring
// authority for this scene's visual composition (entries, placements, and
// cue→motion binding). The script references cues by id and the transition
// catalog composes the derived bindings; neither repeats placement literals.
import { sceneFromDocument, sceneStageTransitionBindings } from "@sillymaker/base/story";
import type { Scene, SceneStageTransitionBindings } from "@sillymaker/base/story";

import openingSceneDocumentV1 from "./opening.scene.json" with { type: "json" };
import catEntranceMotionDocumentV1 from "./motions/cat-entrance.motion.json" with {
  type: "json",
};

export const catcafeOpeningCueIdsV1 = Object.freeze({
  shopfront: "cue.catcafe.opening.shopfront",
  kittenEnters: "cue.catcafe.opening.kitten-enters",
});

export const catcafeOpeningSceneV1: Scene = sceneFromDocument(openingSceneDocumentV1);

/** Exact cue-bound transitions (the kitten entrance motion on its enter edge). */
export const catcafeOpeningTransitionBindingsV1: SceneStageTransitionBindings =
  sceneStageTransitionBindings(catcafeOpeningSceneV1, {
    motions: [catEntranceMotionDocumentV1],
  });
