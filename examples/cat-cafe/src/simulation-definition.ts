// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { CatcafeGameSimulationV1 } from "./simulation.ts";
import { createCatcafeGameSimulationV1 } from "./simulation.ts";

function moduleEntryV1(id: string, slot: string, schemaId: string, revision = 1) {
  return Object.freeze({
    moduleId: parseModuleId(id),
    moduleContractRevision: parsePositiveSafeInteger(revision),
    stateSlots: Object.freeze([parseStateSlotId(slot)]),
    stateSchema: Object.freeze({ schemaId, revision: parsePositiveSafeInteger(revision) }),
  });
}

export const catcafeStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.catcafe.game-state",
    revision: parsePositiveSafeInteger(1),
  }),
  moduleStateSchemas: Object.freeze([
    moduleEntryV1("catcafe.calendar", "simulation.calendar", "schema.catcafe.calendar-state"),
    moduleEntryV1("catcafe.cat", "simulation.cat", "schema.catcafe.cat-state"),
    moduleEntryV1("catcafe.contest", "simulation.contest", "schema.catcafe.contest-state"),
    moduleEntryV1("catcafe.narrative", "simulation.narrative", "schema.catcafe.narrative-state"),
    moduleEntryV1("catcafe.shop", "simulation.shop", "schema.catcafe.shop-state"),
    // Stage state revision 2: placement gained the required opacityPermille
    // (semantic stage contract revision 3).
    moduleEntryV1("catcafe.stage", "simulation.stage", "schema.catcafe.stage-state", 2),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([]),
}) satisfies StateContractManifestV1;

export const catcafeSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface CatcafeSimulationProgramV1 {
  readonly kind: "catcafe";
}

function materializeCatcafeSimulationProgramV1(): CatcafeSimulationProgramV1 {
  return Object.freeze({ kind: "catcafe" });
}

function createCatcafeSimulationFromProgramV1(
  _program: CatcafeSimulationProgramV1,
): CatcafeGameSimulationV1 {
  return createCatcafeGameSimulationV1();
}

/** Package-internal owner for every callback in the Story simulation facet. */
export const catcafeSimulationDefinitionV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractManifest: catcafeStateContractManifestV1,
  data: Object.freeze({}),
  rules: Object.freeze({}),
  narrativeProgram: null,
  patchSurface: catcafeSimulationPatchSurfaceV1,
  materializeProgram: materializeCatcafeSimulationProgramV1,
  createGameSimulation: createCatcafeSimulationFromProgramV1,
});
