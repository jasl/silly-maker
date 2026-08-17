// SPDX-License-Identifier: MIT
// Postgame (endless daily play): after the week-7 mainline settles an ending,
// "keep running the shop" writes the ending into authoritative state and crosses into
// week 8; the calendar is uncapped, every later Sunday dusk holds a friendly with opponents rotating by week; the ending settles exactly once.
import { describe, expect, it } from "vitest";

import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import { catcafeSemanticAdapterV1 } from "../application/semantic.ts";
import { catcafeContestTodayV1 } from "../game/simulation.ts";
import { catcafeStoryEntryV1 } from "../story.ts";

async function harnessAtFinalNightV1() {
  const harness = await createGameHarnessV1({
    entry: catcafeStoryEntryV1,
    semantic: catcafeSemanticAdapterV1,
    seed: 20260728,
    capabilities: { debugTools: true },
  });
  const opening = [
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
  for (const step of opening) {
    expect(await harness.dispatch(step as never)).toMatchObject({ kind: "committed" });
  }
  // Fast-forward via the debug channel to week 7 Sunday morning, then advance three slots to night (the settlement point).
  const control = harness.admin.debugControl;
  if (control === undefined) throw new Error("debug control must exist");
  expect(
    await control.execute({ kind: "cc.debug.advance_days", days: 48 } as never, () => true),
  ).toMatchObject({ kind: "executed" });
  for (let step = 0; step < 3; step += 1) {
    expect(
      await harness.dispatch({ kind: "invoke", actionId: "cc.advance_slot" } as never),
    ).toMatchObject({ kind: "committed" });
  }
  return harness;
}

function gameV1(harness: Awaited<ReturnType<typeof harnessAtFinalNightV1>>) {
  return harness.semantic.observe().game;
}

describe("catcafe postgame (endless daily mode)", () => {
  it("confirming the ending enters the epilogue and week 8 begins", async () => {
    const harness = await harnessAtFinalNightV1();
    try {
      // The ending has settled (default stat trajectory yields "ordinary") but is unconfirmed.
      const settled = gameV1(harness);
      expect(settled.calendar).toMatchObject({ week: 7, day: 6, slot: 3 });
      expect(settled.ending).toBe("ordinary");
      expect(settled.shop.epilogue).toBeNull();

      // Actions unavailable before settlement night are available now.
      const postgameAction = harness.semantic
        .observe()
        .actions.find(
          (action) => action.kind === "system" && action.actionId === "cc.enter_postgame",
        );
      expect(postgameAction).toMatchObject({ enabled: true });

      // Confirm: the ending lands in authoritative state; the calendar crosses into week 8 Monday morning.
      expect(
        await harness.dispatch({ kind: "invoke", actionId: "cc.enter_postgame" } as never),
      ).toMatchObject({ kind: "committed" });
      const postgame = gameV1(harness);
      expect(postgame.shop.epilogue).toBe("ordinary");
      expect(postgame.ending).toBeNull();
      expect(postgame.calendar).toMatchObject({ week: 8, day: 0, slot: 0 });

      // Confirmation happens only once.
      const again = await harness.dispatch({
        kind: "invoke",
        actionId: "cc.enter_postgame",
      } as never);
      expect(again.kind).not.toBe("committed");
    } finally {
      await harness.dispose();
    }
  });

  it("postgame Sundays hold friendly contests with rotating rivals", () => {
    // Weeks 8/9/10 Sunday dusk: opponents rotate 糯米 → 烟灰 → 将军; weekdays have none.
    const dusk = (week: number, day = 6, slot = 2) => ({ week, day, slot, stamina: 6 });
    expect(catcafeContestTodayV1(dusk(8))).toBe("rival.mochi");
    expect(catcafeContestTodayV1(dusk(9))).toBe("rival.smoke");
    expect(catcafeContestTodayV1(dusk(10))).toBe("rival.general");
    expect(catcafeContestTodayV1(dusk(11))).toBe("rival.mochi");
    expect(catcafeContestTodayV1(dusk(8, 5))).toBeNull();
    // Mainline weeks unaffected: week 4 Sunday has no contest, week 5 Sunday is 烟灰.
    expect(catcafeContestTodayV1(dusk(4))).toBeNull();
    expect(catcafeContestTodayV1(dusk(5))).toBe("rival.smoke");
  });

  it("the epilogue keeps daily play alive: activities and contests still commit", async () => {
    const harness = await harnessAtFinalNightV1();
    try {
      expect(
        await harness.dispatch({ kind: "invoke", actionId: "cc.enter_postgame" } as never),
      ).toMatchObject({ kind: "committed" });

      // Week 8 Monday morning: daily activities commit as usual.
      expect(
        await harness.dispatch({ kind: "activity", activityId: "activity.clean" } as never),
      ).toMatchObject({ kind: "committed" });

      // Advance to week 8 Sunday dusk, enter the friendly, and play it out.
      const control = harness.admin.debugControl;
      if (control === undefined) throw new Error("debug control must exist");
      expect(
        await control.execute({ kind: "cc.debug.advance_days", days: 6 } as never, () => true),
      ).toMatchObject({ kind: "executed" });
      for (let step = 0; step < 2; step += 1) {
        expect(
          await harness.dispatch({ kind: "invoke", actionId: "cc.advance_slot" } as never),
        ).toMatchObject({ kind: "committed" });
      }
      expect(gameV1(harness).calendar).toMatchObject({ week: 8, day: 6, slot: 2 });

      expect(
        await harness.dispatch({ kind: "invoke", actionId: "cc.enter_contest" } as never),
      ).toMatchObject({ kind: "committed" });
      expect(gameV1(harness).contest).toMatchObject({ rivalId: "rival.mochi" });
      for (let round = 0; round < 12 && gameV1(harness).contest !== null; round += 1) {
        expect(
          await harness.dispatch({ kind: "contest_move", moveId: "move.pounce" } as never),
        ).toMatchObject({ kind: "committed" });
      }
      expect(gameV1(harness).contest).toBeNull();

      // No second ending during postgame nights.
      expect(
        await harness.dispatch({ kind: "invoke", actionId: "cc.advance_slot" } as never),
      ).toMatchObject({ kind: "committed" });
      expect(gameV1(harness).ending).toBeNull();
      expect(gameV1(harness).shop.epilogue).toBe("ordinary");

      // Authoritative replay holds for the postgame path.
      const replay = await harness.admin.replayAuthoritatively();
      expect(replay).toMatchObject({ authoritative: true, identityMatch: true, matches: true });
    } finally {
      await harness.dispose();
    }
  });
});
