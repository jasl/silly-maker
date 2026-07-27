// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineGamePackage,
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { LabGameSimulationV1 } from "./gameplay/simulation.js";
import { createLabGameSimulationV1 } from "./gameplay/simulation.js";
import {
  createLabStageSceneGraphV1,
  labAssetSlotsV1,
  labPresentationPatchSurfaceV1,
  labTextCatalogsV1,
  materializeLabPresentationV1,
} from "./presentation.js";

export const labStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.e2e.lab.game-state",
    revision: parsePositiveSafeInteger(3),
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: parseModuleId("lab.narrative"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.narrative")]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.lab.narrative-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("lab.procedure"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.procedure")]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.lab.procedure-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("lab.samples"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.samples")]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.lab.samples-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("lab.stage"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.stage")]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.lab.stage-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([]),
}) satisfies StateContractManifestV1;

export const labSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface LabSimulationProgramV1 {
  readonly kind: "e2e-lab";
}

function materializeLabSimulationProgramV1(): LabSimulationProgramV1 {
  return Object.freeze({ kind: "e2e-lab" });
}

function createLabGameSimulationFromProgramV1(
  _program: LabSimulationProgramV1,
): LabGameSimulationV1 {
  return createLabGameSimulationV1();
}

const labStoryDefinitionV1 = Object.freeze({
  simulation: Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(3),
    stateContractManifest: labStateContractManifestV1,
    data: Object.freeze({}),
    rules: Object.freeze({}),
    narrativeProgram: null,
    patchSurface: labSimulationPatchSurfaceV1,
    materializeProgram: materializeLabSimulationProgramV1,
    createGameSimulation: createLabGameSimulationFromProgramV1,
  }),
  presentation: Object.freeze({
    uiSceneGraph: createLabStageSceneGraphV1(),
    textCatalogs: labTextCatalogsV1,
    assetSlots: labAssetSlotsV1,
    assetPacks: Object.freeze([]) as readonly [],
    patchSurface: labPresentationPatchSurfaceV1,
    materializePresentation: materializeLabPresentationV1,
  }),
});

export const labStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.e2e.engine-lab",
    revision: parsePositiveSafeInteger(3),
  },
  define: () => labStoryDefinitionV1,
});
