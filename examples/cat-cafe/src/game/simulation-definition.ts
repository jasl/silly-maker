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
  return ({
    moduleId: parseModuleId(id),
    moduleContractRevision: parsePositiveSafeInteger(revision),
    stateSlots: [parseStateSlotId(slot)],
    stateSchema: { schemaId, revision: parsePositiveSafeInteger(revision) },
  });
}

/**
 * State-contract identity: these revisions version the SHAPES in
 * `state.ts` and gate save compatibility. Bump only on breaking schema
 * change (new module slot, removed/retyped required field, restructure),
 * together with a `defineSaveStateMigrationRegistryV1` step so existing
 * saves keep loading; additive optional/defaulted fields need no bump.
 */
export const catcafeStateContractManifestV1 = ({
  contractRevision: 1 as const,
  aggregateStateSchema: {
    schemaId: "schema.catcafe.game-state",
    revision: parsePositiveSafeInteger(1),
  },
  moduleStateSchemas: [
    moduleEntryV1("catcafe.calendar", "simulation.calendar", "schema.catcafe.calendar-state"),
    moduleEntryV1("catcafe.cat", "simulation.cat", "schema.catcafe.cat-state"),
    moduleEntryV1("catcafe.contest", "simulation.contest", "schema.catcafe.contest-state"),
    moduleEntryV1("catcafe.narrative", "simulation.narrative", "schema.catcafe.narrative-state"),
    moduleEntryV1("catcafe.shop", "simulation.shop", "schema.catcafe.shop-state"),
    // Stage state revision 2: placement gained the required opacityPermille
    // (semantic stage contract revision 3).
    moduleEntryV1("catcafe.stage", "simulation.stage", "schema.catcafe.stage-state", 2),
  ],
  persistentIrSchemas: [],
  stableReferenceSets: [],
}) satisfies StateContractManifestV1;

export const catcafeSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface CatcafeSimulationProgramV1 {
  readonly kind: "catcafe";
}

function materializeCatcafeSimulationProgramV1(): CatcafeSimulationProgramV1 {
  return ({ kind: "catcafe" });
}

function createCatcafeSimulationFromProgramV1(
  _program: CatcafeSimulationProgramV1,
): CatcafeGameSimulationV1 {
  return createCatcafeGameSimulationV1();
}

/** Package-internal owner for every callback in the Story simulation facet. */
export const catcafeSimulationDefinitionV1 = {
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractManifest: catcafeStateContractManifestV1,
  data: {},
  rules: {},
  narrativeProgram: null,
  patchSurface: catcafeSimulationPatchSurfaceV1,
  materializeProgram: materializeCatcafeSimulationProgramV1,
  createGameSimulation: createCatcafeSimulationFromProgramV1,
};
