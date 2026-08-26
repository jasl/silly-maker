// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { ElectronicPetGameSimulationV1 } from "./simulation.ts";
import { createElectronicPetGameSimulationV1 } from "./simulation.ts";

export const electronicPetStateContractManifestV1 = ({
  contractRevision: 1 as const,
  aggregateStateSchema: {
    schemaId: "schema.electronic-pet.game-state",
    revision: parsePositiveSafeInteger(2),
  },
  moduleStateSchemas: [
    {
      moduleId: parseModuleId("pet.lifecycle"),
      moduleContractRevision: parsePositiveSafeInteger(2),
      stateSlots: [parseStateSlotId("simulation.pet")],
      stateSchema: {
        schemaId: "schema.electronic-pet.pet-state",
        revision: parsePositiveSafeInteger(2),
      },
    },
  ],
  persistentIrSchemas: [],
  stableReferenceSets: [],
}) satisfies StateContractManifestV1;

export const electronicPetSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface ElectronicPetSimulationProgramV1 {
  readonly kind: "electronic-pet";
}

export const electronicPetSimulationDefinitionV1 = {
  stateContractRevision: parsePositiveSafeInteger(2),
  stateContractManifest: electronicPetStateContractManifestV1,
  data: {},
  rules: {},
  narrativeProgram: null,
  patchSurface: electronicPetSimulationPatchSurfaceV1,
  materializeProgram: (): ElectronicPetSimulationProgramV1 => ({ kind: "electronic-pet" }),
  createGameSimulation: (
    _program: ElectronicPetSimulationProgramV1,
  ): ElectronicPetGameSimulationV1 => createElectronicPetGameSimulationV1(),
};
