// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import type { TemplateGameSimulationV1 } from "./simulation.js";
import { createTemplateGameSimulationV1 } from "./simulation.js";
import {
  templatePresentationPatchSurfaceV1,
  templateTextCatalogsV1,
  materializeTemplatePresentationV1,
} from "./presentation.js";

/**
 * The Story package: identity, the state contract manifest, and the two
 * facets (simulation + presentation).
 *
 * Version discipline (start-up diagnostics enforce it):
 * - change a module's state shape  -> bump that module's `stateSchema.revision`
 *   and its `moduleContractRevision`;
 * - change a module's rules only   -> bump `moduleContractRevision`;
 * - add/remove a module            -> new manifest entry (IDs sorted
 *   ascending) + bump `aggregateStateSchema.revision` and
 *   `stateContractRevision`;
 * - any of the above               -> bump `identity.revision`.
 */
export const templateStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.template.game-state",
    revision: parsePositiveSafeInteger(1),
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: parseModuleId("template.inventory"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.inventory")]),
      stateSchema: Object.freeze({
        schemaId: "schema.template.inventory-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("template.narrative"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.narrative")]),
      stateSchema: Object.freeze({
        schemaId: "schema.template.narrative-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("template.stage"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.stage")]),
      stateSchema: Object.freeze({
        schemaId: "schema.template.stage-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([]),
}) satisfies StateContractManifestV1;

export const templateSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface TemplateSimulationProgramV1 {
  readonly kind: "template";
}

function materializeTemplateSimulationProgramV1(): TemplateSimulationProgramV1 {
  return Object.freeze({ kind: "template" });
}

function createTemplateSimulationFromProgramV1(
  _program: TemplateSimulationProgramV1,
): TemplateGameSimulationV1 {
  return createTemplateGameSimulationV1();
}

const templateStoryDefinitionV1 = Object.freeze({
  simulation: Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(1),
    stateContractManifest: templateStateContractManifestV1,
    data: Object.freeze({}),
    rules: Object.freeze({}),
    narrativeProgram: null,
    patchSurface: templateSimulationPatchSurfaceV1,
    materializeProgram: materializeTemplateSimulationProgramV1,
    createGameSimulation: createTemplateSimulationFromProgramV1,
  }),
  presentation: Object.freeze({
    textCatalogs: templateTextCatalogsV1,
    assetSlots: Object.freeze([]) as readonly [],
    assetPacks: Object.freeze([]) as readonly [],
    patchSurface: templatePresentationPatchSurfaceV1,
    materializePresentation: materializeTemplatePresentationV1,
  }),
});

export const templateStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.template.starter",
    revision: parsePositiveSafeInteger(1),
  },
  define: () => templateStoryDefinitionV1,
});
