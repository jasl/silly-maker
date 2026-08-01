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

export const labStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.e2e.lab.game-state",
    revision: parsePositiveSafeInteger(5),
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: parseModuleId("lab.narrative"),
      moduleContractRevision: parsePositiveSafeInteger(4),
      stateSlots: Object.freeze([parseStateSlotId("simulation.narrative")]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.lab.narrative-state",
        revision: parsePositiveSafeInteger(3),
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
      // Revision 2: placement gained the required opacityPermille (semantic
      // stage contract revision 3).
      moduleContractRevision: parsePositiveSafeInteger(2),
      stateSlots: Object.freeze([parseStateSlotId("simulation.stage")]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.lab.stage-state",
        revision: parsePositiveSafeInteger(2),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("lab.wallet"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.wallet")]),
      stateSchema: Object.freeze({
        schemaId: "schema.e2e.lab.wallet-state",
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

/** Package-internal owner for every callback in the Story simulation facet. */
export const labSimulationDefinitionV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(5),
  stateContractManifest: labStateContractManifestV1,
  data: Object.freeze({}),
  rules: Object.freeze({}),
  narrativeProgram: null,
  patchSurface: labSimulationPatchSurfaceV1,
  materializeProgram: materializeLabSimulationProgramV1,
  createGameSimulation: createLabGameSimulationFromProgramV1,
});
