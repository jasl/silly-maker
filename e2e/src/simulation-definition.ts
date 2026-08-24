// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { LabGameSimulationV1 } from "./gameplay/simulation.ts";
import { createLabGameSimulationV1 } from "./gameplay/simulation.ts";

export { labSaveStateMigrationRegistryV1 } from "./save-state-migrations.ts";

export const labStateContractManifestV1 = ({
  contractRevision: 1 as const,
  aggregateStateSchema: {
    schemaId: "schema.e2e.lab.game-state",
    // Revision 6: the lab.monitors module joins with the simulation.monitors
    // slot (authoritative monitor accumulator and drill counters).
    revision: parsePositiveSafeInteger(6),
  },
  moduleStateSchemas: [
    {
      moduleId: parseModuleId("lab.monitors"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.monitors")],
      stateSchema: {
        schemaId: "schema.e2e.lab.monitors-state",
        revision: parsePositiveSafeInteger(1),
      },
    },
    {
      moduleId: parseModuleId("lab.narrative"),
      moduleContractRevision: parsePositiveSafeInteger(4),
      stateSlots: [parseStateSlotId("simulation.narrative")],
      stateSchema: {
        schemaId: "schema.e2e.lab.narrative-state",
        revision: parsePositiveSafeInteger(3),
      },
    },
    {
      moduleId: parseModuleId("lab.procedure"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.procedure")],
      stateSchema: {
        schemaId: "schema.e2e.lab.procedure-state",
        revision: parsePositiveSafeInteger(1),
      },
    },
    {
      moduleId: parseModuleId("lab.samples"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.samples")],
      stateSchema: {
        schemaId: "schema.e2e.lab.samples-state",
        revision: parsePositiveSafeInteger(1),
      },
    },
    {
      moduleId: parseModuleId("lab.stage"),
      // Revision 2: placement gained the required opacityPermille (semantic
      // stage contract revision 3). The package-private R2 reconcile ingress
      // reuses the existing stage event/reducer contract.
      moduleContractRevision: parsePositiveSafeInteger(2),
      stateSlots: [parseStateSlotId("simulation.stage")],
      stateSchema: {
        schemaId: "schema.e2e.lab.stage-state",
        revision: parsePositiveSafeInteger(2),
      },
    },
    {
      moduleId: parseModuleId("lab.wallet"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.wallet")],
      stateSchema: {
        schemaId: "schema.e2e.lab.wallet-state",
        revision: parsePositiveSafeInteger(1),
      },
    },
  ],
  persistentIrSchemas: [],
  stableReferenceSets: [],
}) satisfies StateContractManifestV1;

export const labSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface LabSimulationProgramV1 {
  readonly kind: "e2e-lab";
}

function materializeLabSimulationProgramV1(): LabSimulationProgramV1 {
  return ({ kind: "e2e-lab" });
}

function createLabGameSimulationFromProgramV1(
  _program: LabSimulationProgramV1,
): LabGameSimulationV1 {
  return createLabGameSimulationV1();
}

/** Package-internal owner for every callback in the Story simulation facet. */
export const labSimulationDefinitionV1 = {
  stateContractRevision: parsePositiveSafeInteger(6),
  stateContractManifest: labStateContractManifestV1,
  data: {},
  rules: {},
  narrativeProgram: null,
  patchSurface: labSimulationPatchSurfaceV1,
  materializeProgram: materializeLabSimulationProgramV1,
  createGameSimulation: createLabGameSimulationFromProgramV1,
};
