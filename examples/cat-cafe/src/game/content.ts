// SPDX-License-Identifier: MIT
import type { ContentDatabase } from "@sillymaker/base/story";
import { createContentDatabase } from "@sillymaker/base/story";

import { catcafeAlbumTableV1 } from "./features/album/content.ts";
import { catcafeActivitiesTableV1 } from "./features/shop/content.ts";
import { catcafeEncountersTableV1 } from "./features/encounters/content.ts";
import { catcafeMovesTableV1, catcafeRivalsTableV1 } from "./features/contest/content.ts";
import { catcafePettingTableV1 } from "./features/petting/content.ts";

/**
 * Static content aggregation for the cat cafe: tables are defined in their feature
 * slices (features/<name>/content.ts); this file assembles the content database
 * (primary/foreign key and text-column validation at resolve time) and exports query handles. Read-only at runtime; dynamic state lives in the modules of `state.ts`.
 */

export { catcafeSlotsV1 } from "./features/calendar/content.ts";
export type { CatcafeSlotV1 } from "./features/calendar/content.ts";
export { catcafeStageForWeekV1 } from "./features/cat/content.ts";
export { catcafeEncounterConditionsV1 } from "./features/encounters/content.ts";
export type { CatcafeActivityRowV1 } from "./features/shop/content.ts";
export type { CatcafePettingRowV1 } from "./features/petting/content.ts";
export type { CatcafeMoveRowV1, CatcafeRivalRowV1 } from "./features/contest/content.ts";
export type { CatcafeEncounterRowV1 } from "./features/encounters/content.ts";
export type { CatcafeAlbumRowV1 } from "./features/album/content.ts";

export const catcafeContentV1: ContentDatabase = createContentDatabase({
  tables: [
    catcafeAlbumTableV1,
    catcafeActivitiesTableV1,
    catcafeEncountersTableV1,
    catcafePettingTableV1,
    catcafeMovesTableV1,
    catcafeRivalsTableV1,
  ],
});

export const catcafeActivitiesV1 = catcafeContentV1.table(catcafeActivitiesTableV1);
export const catcafePettingV1 = catcafeContentV1.table(catcafePettingTableV1);
export const catcafeMovesV1 = catcafeContentV1.table(catcafeMovesTableV1);
export const catcafeRivalsV1 = catcafeContentV1.table(catcafeRivalsTableV1);
export const catcafeAlbumV1 = catcafeContentV1.table(catcafeAlbumTableV1);
export const catcafeEncountersV1 = catcafeContentV1.table(catcafeEncountersTableV1);
