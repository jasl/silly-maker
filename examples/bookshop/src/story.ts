// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import type { BookshopGameSimulationV1 } from "./simulation.ts";
import { createBookshopGameSimulationV1 } from "./simulation.ts";
import {
  bookshopPresentationPatchSurfaceV1,
  bookshopTextCatalogsV1,
  materializeBookshopPresentationV1,
} from "./presentation.ts";

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

const bookshopStoryDefinitionV1 = Object.freeze({
  simulation: Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(1),
    stateContractManifest: bookshopStateContractManifestV1,
    data: Object.freeze({}),
    rules: Object.freeze({}),
    narrativeProgram: null,
    patchSurface: bookshopSimulationPatchSurfaceV1,
    materializeProgram: materializeBookshopSimulationProgramV1,
    createGameSimulation: createBookshopSimulationFromProgramV1,
  }),
  presentation: Object.freeze({
    textCatalogs: bookshopTextCatalogsV1,
    assetSlots: Object.freeze([]) as readonly [],
    assetPacks: Object.freeze([]) as readonly [],
    patchSurface: bookshopPresentationPatchSurfaceV1,
    materializePresentation: materializeBookshopPresentationV1,
  }),
});

export const bookshopStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.example.bookshop",
    revision: parsePositiveSafeInteger(2),
  },
  define: () => bookshopStoryDefinitionV1,
});
