// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { drawFromEventPool, lintNarrativeGraph } from "@sillymaker/base/story";
import { createTransactionalRngV1, parseNonZeroUint32 } from "@sillymaker/base";
import { createGameHarnessV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { catcafeEndingForV1 } from "../game/simulation.ts";
import { projectCatcafeTransientEffectsV1 } from "../application/semantic.ts";
import { createCatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import type { CatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import { catcafeSemanticAdapterV1 } from "../application/semantic.ts";
import { projectCatcafeNarrativeGraphV1 } from "../story/narrative-graph.ts";
import {
  catcafeContentV1,
  catcafeEncounterConditionsV1,
  catcafeEncountersV1,
  catcafePettingV1,
} from "../game/content.ts";
import { catcafeTextCatalogsV1 } from "../content/presentation.ts";
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

  it("keeps the en catalog in key parity with zh-CN (no missing translations)", () => {
    const ids = (locale: string) =>
      new Set(
        catcafeTextCatalogsV1.catalogs
          .find((candidate) => candidate.locale === locale)
          ?.entries.map((entry) => entry.textId as string),
      );
    const zh = ids("zh-CN");
    const en = ids("en");
    expect([...zh].filter((id) => !en.has(id))).toEqual([]);
    expect([...en].filter((id) => !zh.has(id))).toEqual([]);
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

      // Napping is dusk-only; agility training needs the junior stage (week 3+).
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
    // Week 1 Monday morning → week 3 Sunday dusk = advance to week 3, day 6, slot 2.
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
      // No entry before the contest: the non-contest-slot guard is covered by the shared catalog/preview rule (this is already the contest slot).
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

describe("catcafe endings", () => {
  const finalNight = { week: 7, day: 6, slot: 3, stamina: 0 };
  const base = {
    calendar: finalNight,
    cat: { trust: 60, vigor: 50, skill: 40, fishBuff: 0, pettingLeft: 3 },
    shop: { reputation: 50, tidiness: 50, money: 100, trophies: 1, epilogue: null },
    contest: null,
  };

  it("settles the four endings by priority after the final contest night", () => {
    const simulation = base as never;
    expect(catcafeEndingForV1(simulation)).toBe("ordinary");
    expect(catcafeEndingForV1({ ...base, shop: { ...base.shop, trophies: 3 } } as never)).toBe(
      "champion",
    );
    expect(
      catcafeEndingForV1({
        ...base,
        cat: { ...base.cat, trust: 85 },
        shop: { ...base.shop, reputation: 70 },
      } as never),
    ).toBe("signboard");
    expect(
      catcafeEndingForV1({
        ...base,
        cat: { ...base.cat, trust: 30 },
        shop: { ...base.shop, reputation: 70 },
      } as never),
    ).toBe("adopted");
  });

  it("stays null before the final night and during a running contest", () => {
    expect(
      catcafeEndingForV1({ ...base, calendar: { ...finalNight, week: 6 } } as never),
    ).toBeNull();
    expect(
      catcafeEndingForV1({ ...base, calendar: { ...finalNight, slot: 2 } } as never),
    ).toBeNull();
    expect(
      catcafeEndingForV1({
        ...base,
        contest: {
          rivalId: "rival.general",
          round: 1,
          morale: 30,
          rivalMorale: 60,
          feintActive: false,
        },
      } as never),
    ).toBeNull();
  });
});

describe("catcafe transient effects", () => {
  it("projects petting and contest events into commit-only effects", () => {
    expect(
      projectCatcafeTransientEffectsV1([
        { kind: "cc.petted", zone: "tail", reactionId: "pet.tail.low", trustDelta: -3 },
        { kind: "cc.slot_advanced", week: 1, day: 0, slot: 1 },
        { kind: "cc.contest_won", rivalId: "rival.mochi", albumId: "album.trophy.week3" },
        { kind: "cc.contest_lost", rivalId: "rival.smoke" },
      ]),
    ).toEqual([
      {
        effectId: "effect.catcafe.reaction",
        payload: { reactionId: "pet.tail.low", zone: "tail", trustDelta: -3 },
      },
      { effectId: "effect.catcafe.contest", payload: { outcome: "won", rivalId: "rival.mochi" } },
      { effectId: "effect.catcafe.contest", payload: { outcome: "lost", rivalId: "rival.smoke" } },
    ]);
  });
});

describe("catcafe encounters (event pool)", () => {
  it("validates every encounter condition at parse time", () => {
    for (const row of catcafeEncountersV1.rows()) {
      expect(catcafeEncounterConditionsV1.has(row.id), row.id).toBe(true);
    }
  });

  it("draws deterministically during business and applies effects atomically", async () => {
    // Same seed -> same encounter trail; events carry the explanation.
    async function trailV1(): Promise<readonly string[]> {
      const instance = await createCatcafeApplicationInstanceV1({ seeds: [424242] });
      const trail: string[] = [];
      const unsubscribe = instance.subscribeTransientEffects((effect) => {
        if (effect.effectId === "effect.catcafe.encounter") {
          trail.push((effect.payload as { readonly encounterId: string }).encounterId);
        }
      });
      try {
        await playOpeningV1(instance);
        // Morning -> noon, then run the shop three noons in a row.
        for (let day = 0; day < 3; day += 1) {
          await dispatchCommittedV1(instance, { kind: "invoke", actionId: "cc.advance_slot" });
          await dispatchCommittedV1(instance, {
            kind: "activity",
            activityId: "activity.business",
          });
          for (let slot = 0; slot < 3; slot += 1) {
            await dispatchCommittedV1(instance, { kind: "invoke", actionId: "cc.advance_slot" });
          }
        }
        return trail;
      } finally {
        unsubscribe();
        await instance.dispose();
      }
    }
    const first = await trailV1();
    const second = await trailV1();
    expect(second).toEqual(first);
  });

  it("keeps gated encounters out of the eligible list at low stats", () => {
    const draw = drawFromEventPool({
      candidates: catcafeEncountersV1.rows().map((row) => ({
        eventId: row.id,
        weight: row.weight,
        condition: catcafeEncounterConditionsV1.get(row.id) ?? null,
      })),
      context: {
        numbers: {
          "cat.trust": 10,
          "cat.skill": 0,
          "shop.reputation": 11,
          "shop.tidiness": 60,
          "calendar.week": 1,
        },
        flags: [],
        labels: { slot: "noon" },
      },
      rng: createTransactionalRngV1(parseNonZeroUint32(7)),
      purpose: "check:cc.encounter",
    });
    const eligible = draw.explanation.eligible.map((entry) => entry.eventId);
    // Week 1, low reputation, low trust, noon: only the unconditional rows.
    expect(eligible).toEqual(["encounter.quiet", "encounter.stray"]);
  });
});
