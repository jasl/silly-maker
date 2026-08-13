// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { engineDebugPatchStateKindV1 } from "@sillymaker/base";
import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import { catcafeSemanticAdapterV1 } from "../application/semantic.ts";
import { catcafeStoryEntryV1 } from "../story.ts";

async function harnessAtDailyV1() {
  const harness = await createGameHarnessV1({
    entry: catcafeStoryEntryV1,
    semantic: catcafeSemanticAdapterV1,
    seed: 20260728,
    capabilities: { debugTools: true },
  });
  const steps = [
    { kind: "invoke", actionId: "cc.begin_story" },
    ...[1, 2, 3].map((occurrence) => ({
      kind: "resolve",
      expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
      resolution: { kind: "advance" },
    })),
    {
      kind: "resolve",
      expectedOccurrenceId: "interaction-occurrence.4",
      resolution: { kind: "choose", choiceId: "choice.catcafe.name-xiaoyu" },
    },
    ...[5, 6].map((occurrence) => ({
      kind: "resolve",
      expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
      resolution: { kind: "advance" },
    })),
  ];
  for (const step of steps) {
    expect(await harness.dispatch(step as never)).toMatchObject({ kind: "committed" });
  }
  return harness;
}

function debugControlV1(harness: Awaited<ReturnType<typeof harnessAtDailyV1>>) {
  const control = harness.admin.debugControl;
  if (control === undefined) throw new Error("debug control must exist");
  return control;
}

describe("catcafe debug commands (the human tuning channel)", () => {
  it("validates ranges, stats, and encounter ids before executing", async () => {
    const harness = await harnessAtDailyV1();
    try {
      const control = debugControlV1(harness);
      const badStat = await control.execute(
        { kind: "cc.debug.set_stat", stat: "cat.mood", value: 10 } as never,
        () => true,
      );
      expect(badStat).toMatchObject({ kind: "validation_failed" });
      const badRange = await control.execute(
        { kind: "cc.debug.set_stat", stat: "cat.trust", value: 999 } as never,
        () => true,
      );
      expect(badRange).toMatchObject({ kind: "validation_failed" });
      const badDays = await control.execute(
        { kind: "cc.debug.advance_days", days: 0 } as never,
        () => true,
      );
      expect(badDays).toMatchObject({ kind: "validation_failed" });
      const badEncounter = await control.execute(
        { kind: "cc.debug.force_encounter", encounterId: "encounter.quiet" } as never,
        () => true,
      );
      expect(badEncounter).toMatchObject({ kind: "validation_failed" });
      const gated = await control.execute(
        { kind: "cc.debug.set_stat", stat: "cat.trust", value: 60 } as never,
        () => false,
      );
      expect(gated).toMatchObject({ kind: "capability_disabled" });
    } finally {
      await harness.dispose();
    }
  });

  it("commits set_stat, advance_days, and force_encounter atomically", async () => {
    const harness = await harnessAtDailyV1();
    try {
      const control = debugControlV1(harness);

      const setStat = await control.execute(
        { kind: "cc.debug.set_stat", stat: "cat.trust", value: 77 } as never,
        () => true,
      );
      expect(setStat).toMatchObject({ kind: "executed" });
      expect(harness.semantic.observe().game.cat.trust).toBe(77);

      const before = harness.semantic.observe().game;
      const advance = await control.execute(
        { kind: "cc.debug.advance_days", days: 7 } as never,
        () => true,
      );
      expect(advance).toMatchObject({ kind: "executed" });
      const after = harness.semantic.observe().game;
      expect(after.calendar.week).toBe(before.calendar.week + 1);
      expect(after.calendar.day).toBe(before.calendar.day);
      expect(after.calendar.slot).toBe(0);
      expect(after.shop.tidiness).toBe(Math.max(0, before.shop.tidiness - 70));

      const forced = await control.execute(
        { kind: "cc.debug.force_encounter", encounterId: "encounter.baker" } as never,
        () => true,
      );
      expect(forced).toMatchObject({ kind: "executed" });
      expect(harness.semantic.observe().game.shop.money).toBe(after.shop.money + 5);
    } finally {
      await harness.dispose();
    }
  });

  it("replays authoritatively with debug commands in the log", async () => {
    const harness = await harnessAtDailyV1();
    try {
      const control = debugControlV1(harness);
      await control.execute(
        { kind: "cc.debug.set_stat", stat: "shop.reputation", value: 60 } as never,
        () => true,
      );
      await harness.dispatch({ kind: "activity", activityId: "activity.clean" } as never);
      const replay = await harness.admin.replayAuthoritatively();
      expect(replay).toMatchObject({ authoritative: true, matches: true });
    } finally {
      await harness.dispose();
    }
  });

  it("applies the engine state patch without a story debug kind", async () => {
    const harness = await harnessAtDailyV1();
    try {
      const control = debugControlV1(harness);
      const result = await control.execute(
        {
          kind: engineDebugPatchStateKindV1,
          path: ["simulation", "cat", "trust"],
          value: 77,
        } as never,
        () => true,
      );
      expect(result.kind).toBe("executed");
      expect(harness.semantic.observe().game.cat.trust).toBe(77);
      const replay = await harness.admin.replayAuthoritatively();
      expect(replay).toMatchObject({ authoritative: true, matches: true });
    } finally {
      await harness.dispose();
    }
  });
});
