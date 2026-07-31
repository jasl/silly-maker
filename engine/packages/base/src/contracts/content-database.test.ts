// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { RuntimeSchemaV1 } from "./values.ts";
import { fromStandardSchemaV1 } from "../authoring/runtime-schema.ts";
import { createContentDatabaseV1, defineContentTableV1 } from "./content-database.ts";

interface ActivityRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly nameTextId: string;
  readonly slots: readonly string[];
  readonly stamina: number;
  readonly unlockStage: number | null;
}

const activitySchemaV1: RuntimeSchemaV1<ActivityRowV1> = fromStandardSchemaV1(
  z.strictObject({
    id: z.string(),
    nameTextId: z.string(),
    slots: z.array(z.string()),
    stamina: z.number().int(),
    unlockStage: z.number().int().nullable(),
  }),
  { subject: { kind: "module", id: "test.activities" } },
);

function activitiesTableV1() {
  return defineContentTableV1<ActivityRowV1>({
    tableId: "table.test.activities",
    schema: activitySchemaV1,
    primaryKey: "id",
    textColumns: ["nameTextId"],
    rows: [
      {
        id: "act.play",
        nameTextId: "text.t.play",
        slots: ["morning", "noon"],
        stamina: 1,
        unlockStage: null,
      },
      {
        id: "act.train",
        nameTextId: "text.t.train",
        slots: ["morning"],
        stamina: 2,
        unlockStage: 1,
      },
      {
        id: "act.clean",
        nameTextId: "text.t.clean",
        slots: ["noon", "dusk"],
        stamina: 1,
        unlockStage: null,
      },
    ],
  });
}

interface RewardRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly activityId: string;
}

const rewardSchemaV1: RuntimeSchemaV1<RewardRowV1> = fromStandardSchemaV1(
  z.strictObject({ id: z.string(), activityId: z.string() }),
  { subject: { kind: "module", id: "test.rewards" } },
);

describe("content table definition", () => {
  it("validates rows, keys, and limits with structured codes", () => {
    expect(() =>
      defineContentTableV1({
        tableId: "activities",
        schema: activitySchemaV1,
        primaryKey: "id",
        rows: [{ id: "a", nameTextId: "t", slots: [], stamina: 1, unlockStage: null }],
      })
    ).toThrowError(expect.objectContaining({ code: "content.table_id_invalid" }));

    expect(() =>
      defineContentTableV1({
        tableId: "table.test.bad",
        schema: activitySchemaV1,
        primaryKey: "id",
        rows: [{ id: "a", stamina: "not-a-number" }],
      })
    ).toThrowError(/content\.row_invalid/u);

    expect(() =>
      defineContentTableV1({
        tableId: "table.test.dup",
        schema: activitySchemaV1,
        primaryKey: "id",
        rows: [
          { id: "same", nameTextId: "t", slots: [], stamina: 1, unlockStage: null },
          { id: "same", nameTextId: "t", slots: [], stamina: 2, unlockStage: null },
        ],
      })
    ).toThrowError(expect.objectContaining({ code: "content.primary_key_duplicate" }));
  });
});

describe("content database queries", () => {
  it("answers byId, filtered findMany, ordering, and array membership", () => {
    const table = activitiesTableV1();
    const db = createContentDatabaseV1({ tables: [table] });
    const view = db.table(table);

    expect(view.byId("act.train")?.stamina).toBe(2);
    expect(view.byId("act.missing")).toBeNull();

    expect(view.findMany({ where: { stamina: { lte: 1 } } }).map((row) => row.id)).toEqual([
      "act.play",
      "act.clean",
    ]);
    expect(view.findMany({ where: { slots: { has: "morning" } } }).map((row) => row.id)).toEqual([
      "act.play",
      "act.train",
    ]);
    expect(view.findMany({ where: { unlockStage: null } })).toHaveLength(2);
    expect(view.findMany({ orderBy: "stamina", direction: "desc" })[0]?.id).toBe("act.train");
    expect(view.findFirst({ where: { id: "act.clean" } })?.nameTextId).toBe("text.t.clean");

    // Results are frozen and stable.
    expect(Object.isFrozen(view.rows())).toBe(true);
    expect(db.collectTextIds()).toEqual(["text.t.clean", "text.t.play", "text.t.train"]);
  });

  it("validates cross-table references at construction", () => {
    const activities = activitiesTableV1();
    const rewards = defineContentTableV1<RewardRowV1>({
      tableId: "table.test.rewards",
      schema: rewardSchemaV1,
      primaryKey: "id",
      references: [{ column: "activityId", tableId: "table.test.activities" }],
      rows: [{ id: "reward.a", activityId: "act.missing" }],
    });
    expect(() => createContentDatabaseV1({ tables: [activities, rewards] })).toThrowError(
      expect.objectContaining({ code: "content.reference_missing" }),
    );

    const good = defineContentTableV1<RewardRowV1>({
      tableId: "table.test.rewards",
      schema: rewardSchemaV1,
      primaryKey: "id",
      references: [{ column: "activityId", tableId: "table.test.activities" }],
      rows: [{ id: "reward.a", activityId: "act.play" }],
    });
    const db = createContentDatabaseV1({ tables: [activities, good] });
    expect(db.table(good).byId("reward.a")?.activityId).toBe("act.play");
  });

  it("rejects foreign or duplicate table registrations", () => {
    const table = activitiesTableV1();
    const other = activitiesTableV1();
    expect(() => createContentDatabaseV1({ tables: [table, other] })).toThrowError(
      expect.objectContaining({ code: "content.table_duplicate" }),
    );
    const db = createContentDatabaseV1({ tables: [table] });
    expect(() => db.table(other)).toThrowError(
      expect.objectContaining({ code: "content.table_unregistered" }),
    );
  });
});
