// SPDX-License-Identifier: MIT
// The opening scene package: the explicit `authoring_scene` binding selects
// one ordered object hierarchy as the authoring authority. Deno tooling uses
// the package-import fallback; Vite replaces that exact specifier with the
// compiler's runtime-only projection.
import {
  sceneAmbientCatalog,
  sceneFromAuthoringRuntimePlan,
  sceneStageTransitionBindings,
} from "@sillymaker/base/story/scene";
import type {
  AuthoringSceneRuntime,
  AuthoringSceneRuntimePlan,
  SceneStageTransitionBindings,
  StageAmbientCatalog,
} from "@sillymaker/base/story/scene";

import { sceneRuntimePlanV1 } from "#sillymaker/scene/opening";
import meiBlinkMotionDocumentV1 from "./motions/mei-blink.motion.json" with {
  type: "json",
};
import meiEntranceMotionDocumentV1 from "./motions/mei-entrance.motion.json" with {
  type: "json",
};
import mistDriftMotionDocumentV1 from "./motions/mist-drift.motion.json" with {
  type: "json",
};

export const templateOpeningCueIdsV1 = {
  courtyard: "cue.template.opening.courtyard",
  mist: "cue.template.opening.mist",
  meiEnters: "cue.template.opening.mei-enters",
  // Mid-beat exit/return around fetching the kitten: both edges present as
  // explicit cuts (cue identity, accepted 2026-08-17). The return shares
  // Mei's enter edge with the ceremonial entrance motion — a divergent
  // per-cue edge resolved through presentation edge context.
  meiFetches: "cue.template.opening.mei-fetches",
  meiReturns: "cue.template.opening.mei-returns",
};

export const templateOpeningSceneRuntimePlanV1: AuthoringSceneRuntimePlan = sceneRuntimePlanV1;

export const templateOpeningSceneV1: AuthoringSceneRuntime = sceneFromAuthoringRuntimePlan(
  templateOpeningSceneRuntimePlanV1,
);

/** Exact cue-bound transitions (Mei's entrance motion on her enter edge). */
export const templateOpeningTransitionBindingsV1: SceneStageTransitionBindings =
  sceneStageTransitionBindings(templateOpeningSceneV1, {
    motions: [meiEntranceMotionDocumentV1],
  });

/**
 * Presence-bound ambient loops declared by the scene document: the mist
 * band drifts one texture period per cycle (a sawtooth loop over tileable
 * content, so the wrap is visually seamless), and Mei blinks every cycle
 * through her declared frame set (authorable frame set: the motion's
 * `frame` track steps her `frameAssetIds` — no renderer CSS animation).
 * Purely presentational — the stage samples both on the presentation
 * clock; Saves/digest/replay are untouched.
 */
export const templateOpeningAmbientCatalogV1: StageAmbientCatalog = sceneAmbientCatalog(
  templateOpeningSceneV1,
  { motions: [mistDriftMotionDocumentV1, meiBlinkMotionDocumentV1] },
);
