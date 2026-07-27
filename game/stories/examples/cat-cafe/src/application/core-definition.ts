// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  CatcafeActionDescriptorV1,
  CatcafeActionResultV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
} from "./semantic.ts";
import { catcafeSemanticAdapterV1 } from "./semantic.ts";
import type {
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeSimulationTypesV1,
} from "../simulation.ts";
import { catcafeStoryEntryV1 } from "../story.ts";

/**
 * The Host-neutral core application: the GamePackage entry plus the
 * semantic adapter. Session, persistence, diagnostics, and lifecycle come
 * from the Base composer; this module never touches React or the DOM, so
 * headless simulation and the browser boot share it.
 */
export const catcafeCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  CatcafeSimulationTypesV1,
  CatcafeQueriesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1
>({
  entry: catcafeStoryEntryV1,
  semantic: catcafeSemanticAdapterV1,
  exportFilename: "catcafe-save.json",
});

export type CatcafeApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  CatcafeSimulationTypesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1
>;
