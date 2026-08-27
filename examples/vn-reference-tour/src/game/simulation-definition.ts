// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { VnReferenceTourGameSimulationV1 } from "./simulation.ts";
import { createVnReferenceTourGameSimulationV1 } from "./simulation.ts";

/**
 * State-contract identity: these revisions version the SHAPES in
 * `state.ts` and gate save compatibility. Bump only on breaking schema
 * change (new module slot, removed/retyped required field, restructure),
 * together with a `defineSaveStateMigrationRegistryV1` step so existing
 * saves keep loading; additive optional/defaulted fields need no bump.
 */
export const vnReferenceTourStateContractManifestV1 = ({
  contractRevision: 1 as const,
  aggregateStateSchema: {
    schemaId: "schema.vn-reference-tour.game-state",
    revision: parsePositiveSafeInteger(1),
  },
  moduleStateSchemas: [
    {
      moduleId: parseModuleId("vn-reference-tour.narrative"),
      moduleContractRevision: parsePositiveSafeInteger(2),
      stateSlots: [parseStateSlotId("simulation.narrative")],
      stateSchema: {
        schemaId: "schema.vn-reference-tour.narrative-state",
        revision: parsePositiveSafeInteger(2),
      },
    },
    {
      moduleId: parseModuleId("vn-reference-tour.stage"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.stage")],
      stateSchema: {
        schemaId: "schema.vn-reference-tour.stage-state",
        revision: parsePositiveSafeInteger(1),
      },
    },
  ],
  persistentIrSchemas: [],
  stableReferenceSets: [],
}) satisfies StateContractManifestV1;

export const vnReferenceTourSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface VnReferenceTourSimulationProgramV1 {
  readonly kind: "vn-reference-tour";
}

function materializeVnReferenceTourSimulationProgramV1(): VnReferenceTourSimulationProgramV1 {
  return ({ kind: "vn-reference-tour" });
}

function createVnReferenceTourSimulationFromProgramV1(
  _program: VnReferenceTourSimulationProgramV1,
): VnReferenceTourGameSimulationV1 {
  return createVnReferenceTourGameSimulationV1();
}

/** Package-internal owner for every callback in the Story simulation facet. */
export const vnReferenceTourSimulationDefinitionV1 = {
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractManifest: vnReferenceTourStateContractManifestV1,
  data: {},
  rules: {},
  narrativeProgram: null,
  patchSurface: vnReferenceTourSimulationPatchSurfaceV1,
  materializeProgram: materializeVnReferenceTourSimulationProgramV1,
  createGameSimulation: createVnReferenceTourSimulationFromProgramV1,
};
