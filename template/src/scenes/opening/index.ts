// SPDX-License-Identifier: MIT
// The opening scene package: `opening.scene.json` is the single authoring
// authority for this scene's visual composition (entries, placements, and
// cue→motion binding). The script references cues by id and the transition
// catalog composes the derived bindings; neither repeats placement literals.
import { sceneFromDocument, sceneStageTransitionBindings } from "@sillymaker/base/story";
import type { Scene, SceneStageTransitionBindings } from "@sillymaker/base/story";

import openingSceneDocumentV1 from "./opening.scene.json" with { type: "json" };
import meiEntranceMotionDocumentV1 from "./motions/mei-entrance.motion.json" with {
  type: "json",
};

export const templateOpeningCueIdsV1 = Object.freeze({
  courtyard: "cue.template.opening.courtyard",
  meiEnters: "cue.template.opening.mei-enters",
});

export const templateOpeningSceneV1: Scene = sceneFromDocument(openingSceneDocumentV1);

/** Exact cue-bound transitions (Mei's entrance motion on her enter edge). */
export const templateOpeningTransitionBindingsV1: SceneStageTransitionBindings =
  sceneStageTransitionBindings(templateOpeningSceneV1, {
    motions: [meiEntranceMotionDocumentV1],
  });
