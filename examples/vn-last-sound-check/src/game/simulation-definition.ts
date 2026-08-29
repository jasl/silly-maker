// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { VnLastSoundCheckGameSimulationV1 } from "./simulation.ts";
import { createVnLastSoundCheckGameSimulationV1 } from "./simulation.ts";

/**
 * State-contract identity: these revisions version the SHAPES in
 * `state.ts` and gate save compatibility. Bump only on breaking schema
 * change (new module slot, removed/retyped required field, restructure),
 * together with a `defineSaveStateMigrationRegistryV1` step so existing
 * saves keep loading; additive optional/defaulted fields need no bump.
 */
export const vnLastSoundCheckStateContractManifestV1 = ({
  contractRevision: 1 as const,
  aggregateStateSchema: {
    schemaId: "schema.vn-last-sound-check.game-state",
    revision: parsePositiveSafeInteger(1),
  },
  moduleStateSchemas: [
    {
      moduleId: parseModuleId("vn-last-sound-check.narrative"),
      moduleContractRevision: parsePositiveSafeInteger(3),
      stateSlots: [parseStateSlotId("simulation.narrative")],
      stateSchema: {
        schemaId: "schema.vn-last-sound-check.narrative-state",
        revision: parsePositiveSafeInteger(2),
      },
    },
    {
      moduleId: parseModuleId("vn-last-sound-check.stage"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.stage")],
      stateSchema: {
        schemaId: "schema.vn-last-sound-check.stage-state",
        revision: parsePositiveSafeInteger(1),
      },
    },
  ],
  persistentIrSchemas: [],
  stableReferenceSets: [],
}) satisfies StateContractManifestV1;

export const vnLastSoundCheckSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface VnLastSoundCheckSimulationProgramV1 {
  readonly kind: "vn-last-sound-check";
}

function materializeVnLastSoundCheckSimulationProgramV1(): VnLastSoundCheckSimulationProgramV1 {
  return ({ kind: "vn-last-sound-check" });
}

function createVnLastSoundCheckSimulationFromProgramV1(
  _program: VnLastSoundCheckSimulationProgramV1,
): VnLastSoundCheckGameSimulationV1 {
  return createVnLastSoundCheckGameSimulationV1();
}

/** Package-internal owner for every callback in the Story simulation facet. */
export const vnLastSoundCheckSimulationDefinitionV1 = {
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractManifest: vnLastSoundCheckStateContractManifestV1,
  data: {},
  rules: {},
  narrativeProgram: null,
  patchSurface: vnLastSoundCheckSimulationPatchSurfaceV1,
  materializeProgram: materializeVnLastSoundCheckSimulationProgramV1,
  createGameSimulation: createVnLastSoundCheckSimulationFromProgramV1,
};
