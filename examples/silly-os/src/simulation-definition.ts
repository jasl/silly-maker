// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { OsGameSimulationV1 } from "./simulation.ts";
import { createOsGameSimulationV1 } from "./simulation.ts";

/** The SillyOS simulation owns no narrative program and no presentation assets. */
export const osStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.silly-os.game-state",
    revision: parsePositiveSafeInteger(1),
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: parseModuleId("os.desktop"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.desktop")]),
      stateSchema: Object.freeze({
        schemaId: "schema.silly-os.desktop-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("os.filesystem"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.filesystem")]),
      stateSchema: Object.freeze({
        schemaId: "schema.silly-os.filesystem-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("os.minesweeper"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.minesweeper")]),
      stateSchema: Object.freeze({
        schemaId: "schema.silly-os.minesweeper-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([]),
}) satisfies StateContractManifestV1;

export const osSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface OsSimulationProgramV1 {
  readonly kind: "silly-os";
}

function materializeOsSimulationProgramV1(): OsSimulationProgramV1 {
  return Object.freeze({ kind: "silly-os" });
}

function createOsSimulationFromProgramV1(_program: OsSimulationProgramV1): OsGameSimulationV1 {
  return createOsGameSimulationV1();
}

/** Package-internal owner for every callback in the Story simulation facet. */
export const osSimulationDefinitionV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractManifest: osStateContractManifestV1,
  data: Object.freeze({}),
  rules: Object.freeze({}),
  narrativeProgram: null,
  patchSurface: osSimulationPatchSurfaceV1,
  materializeProgram: materializeOsSimulationProgramV1,
  createGameSimulation: createOsSimulationFromProgramV1,
});
