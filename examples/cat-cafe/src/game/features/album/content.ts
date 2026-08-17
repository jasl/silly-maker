// SPDX-License-Identifier: MIT
// Album slice · content tables: meta-progression (cross-save) entry definitions; aggregation in src/game/content.ts.
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { fromStandardSchemaV1 } from "@sillymaker/base/authoring";
import type { ContentTableDefinition } from "@sillymaker/base/story";
import { defineContentTable } from "@sillymaker/base/story";

export interface CatcafeAlbumRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly nameTextId: string;
  readonly captionTextId: string;
  /** growth / trophy / memory。 */
  readonly kind: string;
}

const albumSchemaV1: RuntimeSchemaV1<CatcafeAlbumRowV1> = fromStandardSchemaV1(
  z.strictObject({
    id: z.string(),
    nameTextId: z.string(),
    captionTextId: z.string(),
    kind: z.enum(["growth", "trophy", "memory", "ending"]),
  }),
  { subject: { kind: "module", id: "catcafe.content.album" } },
);

export const catcafeAlbumTableV1: ContentTableDefinition<CatcafeAlbumRowV1> = defineContentTable({
  tableId: "table.catcafe.album",
  schema: albumSchemaV1,
  primaryKey: "id",
  textColumns: ["nameTextId", "captionTextId"],
  rows: [
    {
      id: "album.growth.rescue",
      nameTextId: "text.cc.album.rescue",
      captionTextId: "text.cc.album.rescue.caption",
      kind: "growth",
    },
    {
      id: "album.growth.purr",
      nameTextId: "text.cc.album.purr",
      captionTextId: "text.cc.album.purr.caption",
      kind: "growth",
    },
    {
      id: "album.growth.leap",
      nameTextId: "text.cc.album.leap",
      captionTextId: "text.cc.album.leap.caption",
      kind: "growth",
    },
    {
      id: "album.trophy.week3",
      nameTextId: "text.cc.album.trophy3",
      captionTextId: "text.cc.album.trophy3.caption",
      kind: "trophy",
    },
    {
      id: "album.trophy.week5",
      nameTextId: "text.cc.album.trophy5",
      captionTextId: "text.cc.album.trophy5.caption",
      kind: "trophy",
    },
    {
      id: "album.trophy.week7",
      nameTextId: "text.cc.album.trophy7",
      captionTextId: "text.cc.album.trophy7.caption",
      kind: "trophy",
    },
    {
      id: "album.memory.regular",
      nameTextId: "text.cc.album.regular",
      captionTextId: "text.cc.album.regular.caption",
      kind: "memory",
    },
    {
      id: "album.ending.champion",
      nameTextId: "text.cc.album.ending.champion",
      captionTextId: "text.cc.album.ending.champion.caption",
      kind: "ending",
    },
    {
      id: "album.ending.signboard",
      nameTextId: "text.cc.album.ending.signboard",
      captionTextId: "text.cc.album.ending.signboard.caption",
      kind: "ending",
    },
    {
      id: "album.ending.adopted",
      nameTextId: "text.cc.album.ending.adopted",
      captionTextId: "text.cc.album.ending.adopted.caption",
      kind: "ending",
    },
    {
      id: "album.ending.ordinary",
      nameTextId: "text.cc.album.ending.ordinary",
      captionTextId: "text.cc.album.ending.ordinary.caption",
      kind: "ending",
    },
  ],
});
