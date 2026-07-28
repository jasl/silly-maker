// SPDX-License-Identifier: MIT
// Petting slice · content tables: (body part, trust band) → reaction/effects/expression.
import { z } from "zod";

import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { fromStandardSchemaV1 } from "@sillymaker/base/authoring";
import type { ContentTableDefinition } from "@sillymaker/base/story";
import { defineContentTable } from "@sillymaker/base/story";

export interface CatcafePettingRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly zone: string;
  /** Trust band (inclusive endpoints). */
  readonly minTrust: number;
  readonly maxTrust: number;
  readonly reactionTextId: string;
  readonly trustDelta: number;
  readonly expression: string;
}

const pettingSchemaV1: RuntimeSchemaV1<CatcafePettingRowV1> = fromStandardSchemaV1(
  z.strictObject({
    id: z.string(),
    zone: z.enum(["head", "chin", "back", "tail"]),
    minTrust: z.number().int().min(0).max(100),
    maxTrust: z.number().int().min(0).max(100),
    reactionTextId: z.string(),
    trustDelta: z.number().int(),
    expression: z.enum(["calm", "happy", "purring", "grumpy", "hissing"]),
  }),
  { subject: { kind: "module", id: "catcafe.content.petting" } },
);

export const catcafePettingTableV1: ContentTableDefinition<CatcafePettingRowV1> =
  defineContentTable({
    tableId: "table.catcafe.petting",
    schema: pettingSchemaV1,
    primaryKey: "id",
    textColumns: ["reactionTextId"],
    rows: [
      {
        id: "pet.head.low",
        zone: "head",
        minTrust: 0,
        maxTrust: 39,
        reactionTextId: "text.cc.pet.head.low",
        trustDelta: 1,
        expression: "calm",
      },
      {
        id: "pet.head.high",
        zone: "head",
        minTrust: 40,
        maxTrust: 100,
        reactionTextId: "text.cc.pet.head.high",
        trustDelta: 2,
        expression: "happy",
      },
      {
        id: "pet.chin.low",
        zone: "chin",
        minTrust: 0,
        maxTrust: 29,
        reactionTextId: "text.cc.pet.chin.low",
        trustDelta: 0,
        expression: "calm",
      },
      {
        id: "pet.chin.high",
        zone: "chin",
        minTrust: 30,
        maxTrust: 100,
        reactionTextId: "text.cc.pet.chin.high",
        trustDelta: 3,
        expression: "purring",
      },
      {
        id: "pet.back.any",
        zone: "back",
        minTrust: 0,
        maxTrust: 100,
        reactionTextId: "text.cc.pet.back.any",
        trustDelta: 1,
        expression: "happy",
      },
      {
        id: "pet.tail.low",
        zone: "tail",
        minTrust: 0,
        maxTrust: 59,
        reactionTextId: "text.cc.pet.tail.low",
        trustDelta: -3,
        expression: "hissing",
      },
      {
        id: "pet.tail.high",
        zone: "tail",
        minTrust: 60,
        maxTrust: 100,
        reactionTextId: "text.cc.pet.tail.high",
        trustDelta: 2,
        expression: "purring",
      },
    ],
  });
