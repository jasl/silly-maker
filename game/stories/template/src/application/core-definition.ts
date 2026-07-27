// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  TemplateActionDescriptorV1,
  TemplateActionResultV1,
  TemplateInvocationV1,
  TemplatePreviewV1,
} from "./semantic.ts";
import { templateSemanticAdapterV1 } from "./semantic.ts";
import type {
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateQueriesV1,
  TemplateSimulationTypesV1,
} from "../simulation.ts";
import { templateStoryEntryV1 } from "../story.ts";

/**
 * The Host-neutral core application: the GamePackage entry plus the
 * semantic adapter. Session, persistence, diagnostics, and lifecycle come
 * from the Base composer; this module never touches React or the DOM, so
 * headless simulation and the browser boot share it.
 */
export const templateCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  TemplateSimulationTypesV1,
  TemplateQueriesV1,
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateActionDescriptorV1,
  TemplateInvocationV1,
  TemplatePreviewV1,
  TemplateActionResultV1
>({
  entry: templateStoryEntryV1,
  semantic: templateSemanticAdapterV1,
  exportFilename: "template-save.json",
});

export type TemplateApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  TemplateSimulationTypesV1,
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateActionDescriptorV1,
  TemplateInvocationV1,
  TemplatePreviewV1,
  TemplateActionResultV1
>;
