// SPDX-License-Identifier: MIT
// The Studio binding: what the dev-only SillyMaker Studio page needs to
// draw and edit this Story's scenes — the content catalog, the real stage
// renderers bound to a live asset registry, and the motion sources scenes
// may bind. Loaded only by the dev-server studio entry
// (`sillymaker.config.ts` `studio`); never part of the player bundle or
// the application composition.
import { resolveAssetManifestV1 } from "@sillymaker/base/authoring";
import { createAssetRegistryV1 } from "@sillymaker/ui";
import { createBrowserImageLoaderV1 } from "@sillymaker/web";
import type { StudioBindingV1 } from "@sillymaker/studio";

import type { CatcafeAssetRegistryV1 } from "../application/ui-kit.ts";
import { createCatcafeStageRenderersV1 } from "../features/stage/renderers.tsx";
import {
  catcafeAssetPacksV1,
  catcafeAssetSlotsV1,
  catcafeStageContentCatalogV1,
} from "../presentation.ts";
import catEntranceMotionDocumentV1 from "../scenes/opening/motions/cat-entrance.motion.json" with {
  type: "json",
};

// The same registry construction the composition uses, on the dev server's
// own origin: the manifest is plain resolved Story data and the browser
// loader fetches/decodes the packaged art, so the canvas positions real
// backgrounds and poses. Runtime paths resolve against the server root —
// the Studio page lives under /__sillymaker/studio/, so baseURI-relative
// resolution would miss the app's assets. Guarded so a non-browser import
// falls back to the code-native rendering instead of crashing.
const registryV1: CatcafeAssetRegistryV1 | null = typeof document === "undefined"
  ? null
  : (createAssetRegistryV1(
    resolveAssetManifestV1(catcafeAssetSlotsV1, catcafeAssetPacksV1),
    createBrowserImageLoaderV1({
      resolveRuntimeUrl: (runtimePath) => new URL(`/${runtimePath}`, document.baseURI).href,
      createImage: () => new Image(),
    }),
    () => {
      // Asset faults keep the code-native fallback on the dev canvas.
    },
  ) as CatcafeAssetRegistryV1);

export const catcafeStudioBindingV1: StudioBindingV1 = Object.freeze({
  catalog: catcafeStageContentCatalogV1,
  renderers: createCatcafeStageRenderersV1(registryV1),
  ...(registryV1 === null ? {} : { assets: registryV1 }),
  motions: Object.freeze([
    Object.freeze({
      path: "src/scenes/opening/motions/cat-entrance.motion.json",
      motionDocument: catEntranceMotionDocumentV1,
    }),
  ]),
});
