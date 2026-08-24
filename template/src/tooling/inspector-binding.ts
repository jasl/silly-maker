// SPDX-License-Identifier: MIT
// The starter's dev-only Inspector binding contributes only presentation
// seams that source discovery cannot infer. It never enters the Player graph.
import type { InspectorBindingV1 } from "@sillymaker/studio";

import { templateStageContentCatalogV1 } from "../content/presentation.ts";
import { templateStageRenderersV1 } from "../ui/stage-renderers.tsx";

export const templateInspectorBindingV1: InspectorBindingV1 = {
  catalog: templateStageContentCatalogV1,
  renderers: templateStageRenderersV1,
};
