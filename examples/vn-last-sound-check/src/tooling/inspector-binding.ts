// SPDX-License-Identifier: MIT
// The product's dev-only Inspector binding contributes only presentation
// seams that source discovery cannot infer. It never enters the Player graph.
import { resolveAssetManifestV1 } from "@sillymaker/base/authoring";
import { createAssetRegistryV1 } from "@sillymaker/ui/assets";
import { createBrowserImageLoaderV1 } from "@sillymaker/web";
import type { InspectorBindingV1 } from "@sillymaker/studio";

import {
  vnLastSoundCheckAssetIdsV1,
  vnLastSoundCheckAssetPacksV1,
  vnLastSoundCheckAssetSlotsV1,
} from "../content/assets.ts";
import { vnLastSoundCheckStageContentCatalogV1 } from "../content/presentation.ts";
import { createVnLastSoundCheckStageRenderersV1 } from "../ui/stage-renderers.tsx";
import { vnLastSoundCheckSceneInspectorContributionsV1 } from "./narrative-inspector.ts";

const assetPreloadControllerV1 = new AbortController();
const assetRegistryV1 = createAssetRegistryV1(
  resolveAssetManifestV1(vnLastSoundCheckAssetSlotsV1, vnLastSoundCheckAssetPacksV1),
  createBrowserImageLoaderV1({
    resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
    createImage: () => new Image(),
  }),
  (diagnostic) => console.error("One Last Sound Check Inspector asset failed", diagnostic),
);
void assetRegistryV1.preload(
  Object.values(vnLastSoundCheckAssetIdsV1),
  assetPreloadControllerV1.signal,
).catch((error: unknown) => {
  if (!assetPreloadControllerV1.signal.aborted) {
    console.error("One Last Sound Check Inspector asset preload failed", error);
  }
});

export const vnLastSoundCheckInspectorBindingV1: InspectorBindingV1 = {
  catalog: vnLastSoundCheckStageContentCatalogV1,
  renderers: createVnLastSoundCheckStageRenderersV1(assetRegistryV1),
  assets: assetRegistryV1,
  sceneInspector: vnLastSoundCheckSceneInspectorContributionsV1,
  dispose() {
    assetPreloadControllerV1.abort();
    assetRegistryV1.dispose();
  },
};
