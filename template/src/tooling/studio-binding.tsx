// SPDX-License-Identifier: MIT
// The Studio binding: what the dev-only SillyMaker Studio page needs to
// draw and edit this Story's scenes — the content catalog, the real stage
// renderers, and the motion sources scenes may bind. Loaded only by the
// dev-server studio entry (`sillymaker.config.ts` `studio`); never part of
// the player bundle or the application composition.
import type { StudioBindingV1 } from "@sillymaker/studio";

import { templateStageContentCatalogV1 } from "../presentation.ts";
import { templateStageRenderersV1 } from "../stage-renderers.tsx";
import meiEntranceMotionDocumentV1 from "../scenes/opening/motions/mei-entrance.motion.json" with {
  type: "json",
};

export const templateStudioBindingV1: StudioBindingV1 = Object.freeze({
  catalog: templateStageContentCatalogV1,
  renderers: templateStageRenderersV1,
  motions: Object.freeze([
    Object.freeze({
      path: "src/scenes/opening/motions/mei-entrance.motion.json",
      motionDocument: meiEntranceMotionDocumentV1,
    }),
  ]),
});
