// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";
import { defineGamePackage } from "@sillymaker/base/story";

import type { CatcafeGameSimulationV1 } from "./simulation.ts";
import { createCatcafeGameSimulationV1 } from "./simulation.ts";
import {
  catcafeAssetPacksV1,
  catcafeAssetSlotsV1,
  catcafePresentationPatchSurfaceV1,
  catcafeTextCatalogsV1,
  materializeCatcafePresentationV1,
} from "./presentation.ts";

function moduleEntryV1(id: string, slot: string, schemaId: string) {
  return Object.freeze({
    moduleId: parseModuleId(id),
    moduleContractRevision: parsePositiveSafeInteger(1),
    stateSlots: Object.freeze([parseStateSlotId(slot)]),
    stateSchema: Object.freeze({ schemaId, revision: parsePositiveSafeInteger(1) }),
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
    moduleEntryV1("catcafe.stage", "simulation.stage", "schema.catcafe.stage-state"),
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

const catcafeStoryDefinitionV1 = Object.freeze({
  simulation: Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(1),
    stateContractManifest: catcafeStateContractManifestV1,
    data: Object.freeze({}),
    rules: Object.freeze({}),
    narrativeProgram: null,
    patchSurface: catcafeSimulationPatchSurfaceV1,
    materializeProgram: materializeCatcafeSimulationProgramV1,
    createGameSimulation: createCatcafeSimulationFromProgramV1,
  }),
  presentation: Object.freeze({
    textCatalogs: catcafeTextCatalogsV1,
    assetSlots: catcafeAssetSlotsV1,
    assetPacks: catcafeAssetPacksV1,
    patchSurface: catcafePresentationPatchSurfaceV1,
    materializePresentation: materializeCatcafePresentationV1,
  }),
});

export const catcafeStoryEntryV1 = defineGamePackage({
  contractRevision: 1,
  identity: {
    id: "story.example.cat-cafe",
    revision: parsePositiveSafeInteger(1),
  },
  define: () => catcafeStoryDefinitionV1,
});
