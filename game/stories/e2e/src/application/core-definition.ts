// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplicationV1 } from "@sillymaker/base/runtime";

import type {
  LabActionDescriptorV1,
  LabActionResultV1,
  LabInvocationV1,
  LabPreviewV1,
} from "./semantic.js";
import { labSemanticAdapterV1 } from "./semantic.js";
import type { LabGameViewV1, LabQueriesV1, LabSimulationTypesV1 } from "../gameplay/simulation.js";
import { labStoryEntryV1 } from "../story.js";

/**
 * The Engine Lab core application definition: the whole application is the
 * GamePackage entry plus the semantic adapter. Session, persistence,
 * diagnostics, and lifecycle come from the Base composer. This module stays
 * production-clean (no testkit) so browser builds can include it.
 */
export const labCoreApplicationDefinitionV1 = defineCoreGameApplicationV1<
  unknown,
  unknown,
  LabSimulationTypesV1,
  LabQueriesV1,
  LabGameViewV1,
  null,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1
>({
  entry: labStoryEntryV1,
  semantic: labSemanticAdapterV1,
  exportFilename: "engine-lab-save.json",
});

export type LabApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  LabSimulationTypesV1,
  LabGameViewV1,
  null,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1
>;
