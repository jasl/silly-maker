// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  ElectronicPetActionDescriptorV1,
  ElectronicPetActionResultV1,
  ElectronicPetInvocationV1,
  ElectronicPetPreviewV1,
} from "./semantic.ts";
import { electronicPetSemanticAdapterV1 } from "./semantic.ts";
import type {
  ElectronicPetGameViewV1,
  ElectronicPetQueriesV1,
  ElectronicPetSimulationTypesV1,
} from "../game/kernel.ts";
import { electronicPetStoryEntryV1 } from "../story.ts";
import { bindElectronicPetInspectorSourceV1 } from "./inspector-source.ts";

export const electronicPetCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  ElectronicPetSimulationTypesV1,
  ElectronicPetQueriesV1,
  ElectronicPetGameViewV1,
  null,
  ElectronicPetActionDescriptorV1,
  ElectronicPetInvocationV1,
  ElectronicPetPreviewV1,
  ElectronicPetActionResultV1
>({
  entry: electronicPetStoryEntryV1,
  semantic: electronicPetSemanticAdapterV1,
  exportFilename: "electronic-pet-save.json",
  resumeFromAutosave: true,
  createExtensions: (context) => {
    const detachInspector = bindElectronicPetInspectorSourceV1(context.session);
    return {
      extensions: {
        sampleWallTimeMs(): number {
          return Date.parse(context.metadataClock.now());
        },
      } satisfies ElectronicPetExtensionsV1,
      dispose: detachInspector,
    };
  },
});

export interface ElectronicPetExtensionsV1 {
  sampleWallTimeMs(): number;
}

export type ElectronicPetApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  ElectronicPetSimulationTypesV1,
  ElectronicPetGameViewV1,
  null,
  ElectronicPetActionDescriptorV1,
  ElectronicPetInvocationV1,
  ElectronicPetPreviewV1,
  ElectronicPetActionResultV1
>;
