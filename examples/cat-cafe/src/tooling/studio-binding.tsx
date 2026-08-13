// SPDX-License-Identifier: MIT
// The Studio binding: what the dev-only SillyMaker Studio page needs to
// draw and edit this Story's scenes — the content catalog, the real stage
// renderers, and the motion sources scenes may bind. Loaded only by the
// dev-server studio entry (`sillymaker.config.ts` `studio`); never part of
// the player bundle or the application composition.
import type { StudioBindingV1 } from "@sillymaker/studio";

import { createCatcafeStageRenderersV1 } from "../features/stage/renderers.tsx";
import { catcafeStageContentCatalogV1 } from "../presentation.ts";
import catEntranceMotionDocumentV1 from "../scenes/opening/motions/cat-entrance.motion.json" with {
  type: "json",
};

export const catcafeStudioBindingV1: StudioBindingV1 = Object.freeze({
  catalog: catcafeStageContentCatalogV1,
  // The registry-less renderers draw the code-native art (asset URLs need
  // the composed application); placements, anchors, and cue previews are
  // identical either way.
  renderers: createCatcafeStageRenderersV1(null),
  motions: Object.freeze([
    Object.freeze({
      path: "src/scenes/opening/motions/cat-entrance.motion.json",
      motionDocument: catEntranceMotionDocumentV1,
    }),
  ]),
});
