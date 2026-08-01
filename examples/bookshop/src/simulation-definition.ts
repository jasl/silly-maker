// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { BookshopGameSimulationV1 } from "./simulation.ts";
import { createBookshopGameSimulationV1 } from "./simulation.ts";

export const bookshopStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.example-bookshop.game-state",
    revision: parsePositiveSafeInteger(1),
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: parseModuleId("bookshop.inventory"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.inventory")]),
      stateSchema: Object.freeze({
        schemaId: "schema.example-bookshop.inventory-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("bookshop.narrative"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.narrative")]),
      stateSchema: Object.freeze({
        schemaId: "schema.example-bookshop.narrative-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("bookshop.stage"),
      // Revision 2: placement gained the required opacityPermille (semantic
      // stage contract revision 3).
      moduleContractRevision: parsePositiveSafeInteger(2),
      stateSlots: Object.freeze([parseStateSlotId("simulation.stage")]),
      stateSchema: Object.freeze({
        schemaId: "schema.example-bookshop.stage-state",
        revision: parsePositiveSafeInteger(2),
      }),
    }),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([]),
}) satisfies StateContractManifestV1;

export const bookshopSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface BookshopSimulationProgramV1 {
  readonly kind: "bookshop";
}

function materializeBookshopSimulationProgramV1(): BookshopSimulationProgramV1 {
  return Object.freeze({ kind: "bookshop" });
}

function createBookshopSimulationFromProgramV1(
  _program: BookshopSimulationProgramV1,
): BookshopGameSimulationV1 {
  return createBookshopGameSimulationV1();
}

/** Package-internal owner for every callback in the Story simulation facet. */
export const bookshopSimulationDefinitionV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractManifest: bookshopStateContractManifestV1,
  data: Object.freeze({}),
  rules: Object.freeze({}),
  narrativeProgram: null,
  patchSurface: bookshopSimulationPatchSurfaceV1,
  materializeProgram: materializeBookshopSimulationProgramV1,
  createGameSimulation: createBookshopSimulationFromProgramV1,
});
