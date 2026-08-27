// SPDX-License-Identifier: MIT
// The starter's dev-only Inspector binding contributes only presentation
// seams that source discovery cannot infer. It never enters the Player graph.
import { resolveAssetManifestV1 } from "@sillymaker/base/authoring";
import { createAssetRegistryV1 } from "@sillymaker/ui/assets";
import { createBrowserImageLoaderV1 } from "@sillymaker/web";
import type { InspectorBindingV1 } from "@sillymaker/studio";

import {
  vnReferenceTourAssetIdsV1,
  vnReferenceTourAssetPacksV1,
  vnReferenceTourAssetSlotsV1,
} from "../content/assets.ts";
import { vnReferenceTourStageContentCatalogV1 } from "../content/presentation.ts";
import { createVnReferenceTourStageRenderersV1 } from "../ui/stage-renderers.tsx";

const assetPreloadControllerV1 = new AbortController();
const assetRegistryV1 = createAssetRegistryV1(
  resolveAssetManifestV1(vnReferenceTourAssetSlotsV1, vnReferenceTourAssetPacksV1),
  createBrowserImageLoaderV1({
    resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
    createImage: () => new Image(),
  }),
  (diagnostic) => console.error("VN Reference Tour Inspector asset failed", diagnostic),
);
void assetRegistryV1.preload(
  Object.values(vnReferenceTourAssetIdsV1),
  assetPreloadControllerV1.signal,
).catch((error: unknown) => {
  if (!assetPreloadControllerV1.signal.aborted) {
    console.error("VN Reference Tour Inspector asset preload failed", error);
  }
});

export const vnReferenceTourInspectorBindingV1: InspectorBindingV1 = {
  catalog: vnReferenceTourStageContentCatalogV1,
  renderers: createVnReferenceTourStageRenderersV1(assetRegistryV1),
  assets: assetRegistryV1,
  dispose() {
    assetPreloadControllerV1.abort();
    assetRegistryV1.dispose();
  },
};
