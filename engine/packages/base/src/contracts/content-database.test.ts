// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";
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

interface OrderedRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly label: string;
  readonly score: number;
}

const orderedRowSchemaV1: RuntimeSchemaV1<OrderedRowV1> = Object.freeze({
  parse(value: unknown): OrderedRowV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid ordered row");
    }
    const record = value as Partial<OrderedRowV1>;
    const score = record.score;
    if (
      typeof record.id !== "string" ||
      typeof record.label !== "string" ||
      typeof score !== "number" ||
      !Number.isSafeInteger(score)
    ) {
      throw new TypeError("invalid ordered row");
    }
    return Object.freeze({ id: record.id, label: record.label, score });
  },
});

function orderedTableV1(rows: readonly OrderedRowV1[]) {
  return defineContentTableV1<OrderedRowV1>({
    tableId: "table.test.ordering",
    schema: orderedRowSchemaV1,
    primaryKey: "id",
    rows,
  });
}

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

  it("characterizes locale-controlled authoritative string ordering", () => {
    const labels = ["A", "a", "a-1", "a_1", "e\u0301", "\u00e9", "\u{1f600}", "\ue000"];
    const table = orderedTableV1(
      labels.map((label, index) => ({ id: `row.${String(index)}`, label, score: index })),
    );
    const view = createContentDatabaseV1({ tables: [table] }).table(table);
    const controlledOrder = ["\u{1f600}", "a", "A", "a_1", "a-1", "e\u0301", "\u00e9", "\ue000"];
    const ranks = new Map(controlledOrder.map((value, index) => [value, index]));
    const comparisons: [string, string][] = [];
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(
      function (this: string, right: string): number {
        comparisons.push([this, right]);
        return (ranks.get(this) ?? 0) - (ranks.get(right) ?? 0);
      },
    );

    try {
      expect(view.findMany({ orderBy: "label" }).map((row) => row.label)).toEqual(
        controlledOrder,
      );
      expect(comparisons.length).toBeGreaterThan(0);
    } finally {
      localeCompare.mockRestore();
    }
  });

  it("characterizes safe-integer extremes without consulting the locale comparator", () => {
    const table = orderedTableV1([
      { id: "row.max", label: "maximum", score: Number.MAX_SAFE_INTEGER },
      { id: "row.zero", label: "zero", score: 0 },
      { id: "row.min", label: "minimum", score: Number.MIN_SAFE_INTEGER },
    ]);
    const view = createContentDatabaseV1({ tables: [table] }).table(table);
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
      throw new TypeError("numeric ordering consulted the locale comparator");
    });

    try {
      expect(view.findMany({ orderBy: "score" }).map((row) => row.score)).toEqual([
        Number.MIN_SAFE_INTEGER,
        0,
        Number.MAX_SAFE_INTEGER,
      ]);
      expect(localeCompare).not.toHaveBeenCalled();
    } finally {
      localeCompare.mockRestore();
    }
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
