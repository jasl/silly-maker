// SPDX-License-Identifier: MIT
// The starter's dev-only Inspector binding contributes only presentation
// seams that source discovery cannot infer. It never enters the Player graph.
import type { InspectorBindingV1 } from "@sillymaker/studio";

import { vnReferenceTourStageContentCatalogV1 } from "../content/presentation.ts";
import { vnReferenceTourStageRenderersV1 } from "../ui/stage-renderers.tsx";

export const vnReferenceTourInspectorBindingV1: InspectorBindingV1 = {
  catalog: vnReferenceTourStageContentCatalogV1,
  renderers: vnReferenceTourStageRenderersV1,
};
