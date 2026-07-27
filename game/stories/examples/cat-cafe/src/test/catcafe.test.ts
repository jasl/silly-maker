// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { describe, expect, it } from "vitest";

import { lintNarrativeGraph } from "@sillymaker/base/story";
import { createGameHarnessV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { createCatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import type { CatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import { catcafeSemanticAdapterV1 } from "../application/semantic.ts";
import { projectCatcafeNarrativeGraphV1 } from "../narrative-graph.ts";
import { catcafeContentV1, catcafePettingV1 } from "../content.ts";
import { catcafeTextCatalogsV1 } from "../presentation.ts";
import { catcafeStoryEntryV1 } from "../story.ts";

async function dispatchCommittedV1(
  instance: CatcafeApplicationInstanceV1,
  invocation: unknown,
): Promise<void> {
  const result = await instance.semantic.dispatch(invocation as never);
  expect(result).toMatchObject({ kind: "committed" });
}

function advanceV1(occurrence: number) {
  return {
    kind: "resolve",
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution: { kind: "advance" },
  };
}

async function playOpeningV1(instance: CatcafeApplicationInstanceV1): Promise<void> {
  await dispatchCommittedV1(instance, { kind: "invoke", actionId: "cc.begin_story" });
  await dispatchCommittedV1(instance, advanceV1(1));
  await dispatchCommittedV1(instance, advanceV1(2));
  await dispatchCommittedV1(instance, advanceV1(3));
  await dispatchCommittedV1(instance, {
    kind: "resolve",
    expectedOccurrenceId: "interaction-occurrence.4",
    resolution: { kind: "choose", choiceId: "choice.catcafe.name-xiaoyu" },
  });
  await dispatchCommittedV1(instance, advanceV1(5));
  await dispatchCommittedV1(instance, advanceV1(6));
}

describe("catcafe baseline", () => {
  it("resolves the Story with six sorted modules and a clean narrative graph", () => {
    const resolved = resolveStoryForTestV1(catcafeStoryEntryV1);
    expect(resolved.provenance.story.id).toBe("story.example.cat-cafe");
    expect(resolved.gameSimulation.modules).toHaveLength(6);
    expect(lintNarrativeGraph(projectCatcafeNarrativeGraphV1())).toEqual([]);
  });

  it("registers every content-table textId in the default catalog", () => {
    const catalog = catcafeTextCatalogsV1.catalogs.find(
      (candidate) => candidate.locale === catcafeTextCatalogsV1.defaultLocale,
    );
    const known = new Set(catalog?.entries.map((entry) => entry.textId as string));
    for (const textId of catcafeContentV1.collectTextIds()) {
      expect(known, textId).toContain(textId);
    }
  });
});

describe("catcafe schedule and stats", () => {
  it("runs a content-table activity atomically across calendar, cat, and shop", async () => {
    const instance = await createCatcafeApplicationInstanceV1();
    try {
      await playOpeningV1(instance);
      const before = instance.semantic.observe().game;
      expect(before.calendar.stamina).toBe(6);

      await dispatchCommittedV1(instance, { kind: "activity", activityId: "activity.play" });
      const after = instance.semantic.observe().game;
      expect(after.calendar.stamina).toBe(5);
      expect(after.cat.trust).toBe(before.cat.trust + 3);
      expect(after.cat.vigor).toBe(before.cat.vigor - 10);
      expect(after.cat.skill).toBe(before.cat.skill + 1);
    } finally {
      await instance.dispose();
    }
  });

  it("rejects table-declared slot and unlock constraints without touching state", async () => {
    const instance = await createCatcafeApplicationInstanceV1();
    try {
      await playOpeningV1(instance);
      const digest = instance.admin.stateDigest();

      // 午睡只在傍晚；敏捷训练要幼猫期（第 3 周起）。
      const nap = await instance.semantic.dispatch({
        kind: "activity",
        activityId: "activity.nap",
      } as never);
      expect(nap).toMatchObject({ kind: "rejected", codes: ["cc.activity_wrong_slot"] });
      const agility = await instance.semantic.dispatch({
        kind: "activity",
        activityId: "activity.agility",
      } as never);
      expect(agility).toMatchObject({ kind: "rejected", codes: ["cc.activity_locked"] });
      expect(instance.admin.stateDigest()).toBe(digest);
    } finally {
      await instance.dispose();
    }
  });

  it("advances slots into new days with tidiness decay and petting reset", async () => {
    const instance = await createCatcafeApplicationInstanceV1();
    try {
      await playOpeningV1(instance);
      await dispatchCommittedV1(instance, { kind: "pet", zone: "head" });
      const beforeDay = instance.semantic.observe().game;
      expect(beforeDay.cat.pettingLeft).toBe(2);

      for (let index = 0; index < 4; index += 1) {
        await dispatchCommittedV1(instance, { kind: "invoke", actionId: "cc.advance_slot" });
      }
      const nextDay = instance.semantic.observe().game;
      expect(nextDay.calendar.day).toBe(1);
      expect(nextDay.calendar.stamina).toBe(6);
      expect(nextDay.cat.pettingLeft).toBe(3);
      expect(nextDay.shop.tidiness).toBe(beforeDay.shop.tidiness - 10);
    } finally {
      await instance.dispose();
    }
  });
});

describe("catcafe petting (reaction table)", () => {
  it("routes reactions by trust band and enforces the daily budget", async () => {
    const instance = await createCatcafeApplicationInstanceV1();
    try {
      await playOpeningV1(instance);
      const trust = instance.semantic.observe().game.cat.trust;
      const expected = catcafePettingV1.findFirst({
        where: { zone: "tail", minTrust: { lte: trust }, maxTrust: { gte: trust } },
      });
      expect(expected?.id).toBe("pet.tail.low");

      await dispatchCommittedV1(instance, { kind: "pet", zone: "tail" });
      const after = instance.semantic.observe().game.cat;
      expect(after.trust).toBe(trust - 3);

      await dispatchCommittedV1(instance, { kind: "pet", zone: "back" });
      await dispatchCommittedV1(instance, { kind: "pet", zone: "head" });
      const exhausted = await instance.semantic.dispatch({ kind: "pet", zone: "head" } as never);
      expect(exhausted).toMatchObject({ kind: "rejected", codes: ["cc.petting_exhausted"] });
    } finally {
      await instance.dispose();
    }
  });
});

describe("catcafe contest (turn-based, table-driven)", () => {
  async function reachContestV1(instance: CatcafeApplicationInstanceV1): Promise<void> {
    await playOpeningV1(instance);
    // 第 1 周周一晨 → 第 3 周周日暮 = 前进到 week 3, day 6, slot 2。
    while (true) {
      const calendar = instance.semantic.observe().game.calendar;
      if (calendar.week === 3 && calendar.day === 6 && calendar.slot === 2) break;
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "cc.advance_slot" });
    }
  }

  it("fights the week-3 rival to completion and settles trophies on victory", async () => {
    const instance = await createCatcafeApplicationInstanceV1();
    try {
      await reachContestV1(instance);
      // 赛前不许进：非比赛时段的守卫由目录/预览共享规则覆盖（此处已是比赛时段）。
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "cc.enter_contest" });
      const started = instance.semantic.observe().game.contest;
      expect(started?.rivalId).toBe("rival.mochi");

      let safety = 0;
      while (instance.semantic.observe().game.contest !== null && safety < 5) {
        await dispatchCommittedV1(instance, { kind: "contest_move", moveId: "move.pounce" });
        safety += 1;
      }
      expect(instance.semantic.observe().game.contest).toBeNull();
      expect(safety).toBeLessThanOrEqual(3);
    } finally {
      await instance.dispose();
    }
  });

  it("rejects contests outside the scheduled dusk", async () => {
    const instance = await createCatcafeApplicationInstanceV1();
    try {
      await playOpeningV1(instance);
      const result = await instance.semantic.dispatch({
        kind: "invoke",
        actionId: "cc.enter_contest",
      } as never);
      expect(result).toMatchObject({ kind: "rejected", codes: ["cc.contest_not_today"] });
    } finally {
      await instance.dispose();
    }
  });
});

describe("catcafe determinism", () => {
  it("replays authoritatively through the harness", async () => {
    const harness = await createGameHarnessV1({
      entry: catcafeStoryEntryV1,
      semantic: catcafeSemanticAdapterV1,
      seed: 20260728,
    });
    const invocations = [
      { kind: "invoke", actionId: "cc.begin_story" },
      ...([1, 2, 3] as const).map((occurrence) => ({
        kind: "resolve" as const,
        expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
        resolution: { kind: "advance" as const },
      })),
      {
        kind: "resolve",
        expectedOccurrenceId: "interaction-occurrence.4",
        resolution: { kind: "choose", choiceId: "choice.catcafe.name-xiaoyu" },
      },
      ...([5, 6] as const).map((occurrence) => ({
        kind: "resolve" as const,
        expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
        resolution: { kind: "advance" as const },
      })),
      { kind: "pet", zone: "back" },
      { kind: "activity", activityId: "activity.clean" },
    ] as const;
    for (const invocation of invocations) {
      const outcome = await harness.dispatch(invocation as never);
      expect(outcome).toMatchObject({ kind: "committed" });
    }
    const replay = await harness.admin.replayAuthoritatively();
    expect(replay).toMatchObject({ authoritative: true, identityMatch: true, matches: true });
    await harness.dispose();
  });
});
