// SPDX-License-Identifier: MIT
// 后日谈（无限日常）：主线第 7 周结算出结局后，「继续经营」把结局写进
// 权威状态并跨入第 8 周；日历不再封顶，之后每个周日傍晚都有友谊赛，
// 对手按周轮换；结局只结算一次。
import { describe, expect, it } from "vitest";

import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import { catcafeSemanticAdapterV1 } from "../application/semantic.ts";
import { catcafeContestTodayV1 } from "../simulation.ts";
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
  // 调试通道快进到第 7 周周日清晨，再推三个时段到夜里（结算点）。
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
      // 结局已结算（默认数值走向 ordinary），但尚未确认。
      const settled = gameV1(harness);
      expect(settled.calendar).toMatchObject({ week: 7, day: 6, slot: 3 });
      expect(settled.ending).toBe("ordinary");
      expect(settled.shop.epilogue).toBeNull();

      // 结算夜之前不可用的动作现在可用了。
      const postgameAction = harness.semantic
        .observe()
        .actions.find(
          (action) => action.kind === "system" && action.actionId === "cc.enter_postgame",
        );
      expect(postgameAction).toMatchObject({ enabled: true });

      // 确认：结局写入权威状态，日历跨入第 8 周周一清晨。
      expect(
        await harness.dispatch({ kind: "invoke", actionId: "cc.enter_postgame" } as never),
      ).toMatchObject({ kind: "committed" });
      const postgame = gameV1(harness);
      expect(postgame.shop.epilogue).toBe("ordinary");
      expect(postgame.ending).toBeNull();
      expect(postgame.calendar).toMatchObject({ week: 8, day: 0, slot: 0 });

      // 只能确认一次。
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
    // 第 8/9/10 周周日暮：对手按 糯米 → 烟灰 → 将军 轮换；平日没有。
    const dusk = (week: number, day = 6, slot = 2) => ({ week, day, slot, stamina: 6 });
    expect(catcafeContestTodayV1(dusk(8))).toBe("rival.mochi");
    expect(catcafeContestTodayV1(dusk(9))).toBe("rival.smoke");
    expect(catcafeContestTodayV1(dusk(10))).toBe("rival.general");
    expect(catcafeContestTodayV1(dusk(11))).toBe("rival.mochi");
    expect(catcafeContestTodayV1(dusk(8, 5))).toBeNull();
    // 主线周不受影响：第 4 周周日没有比赛，第 5 周周日是烟灰。
    expect(catcafeContestTodayV1(dusk(4))).toBeNull();
    expect(catcafeContestTodayV1(dusk(5))).toBe("rival.smoke");
  });

  it("the epilogue keeps daily play alive: activities and contests still commit", async () => {
    const harness = await harnessAtFinalNightV1();
    try {
      expect(
        await harness.dispatch({ kind: "invoke", actionId: "cc.enter_postgame" } as never),
      ).toMatchObject({ kind: "committed" });

      // 第 8 周周一清晨：日常活动照常提交。
      expect(
        await harness.dispatch({ kind: "activity", activityId: "activity.clean" } as never),
      ).toMatchObject({ kind: "committed" });

      // 推进到第 8 周周日暮，参加友谊赛并打完。
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

      // 后日谈的夜里没有第二次结局。
      expect(
        await harness.dispatch({ kind: "invoke", actionId: "cc.advance_slot" } as never),
      ).toMatchObject({ kind: "committed" });
      expect(gameV1(harness).ending).toBeNull();
      expect(gameV1(harness).shop.epilogue).toBe("ordinary");

      // 权威回放对后日谈路径成立。
      const replay = await harness.admin.replayAuthoritatively();
      expect(replay).toMatchObject({ authoritative: true, identityMatch: true, matches: true });
    } finally {
      await harness.dispose();
    }
  });
});
