// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// 玩家回滚（R7）在真实游戏里的语义：日常动作可回退且结果不重掷（RNG 随
// 快照），运动会开赛与结局确认是硬边界（清空之前的检查点）。
import { describe, expect, it } from "vitest";

import type { CatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import { createCatcafeApplicationInstanceV1 } from "../application/core-application.ts";

async function instanceAtDailyV1(): Promise<CatcafeApplicationInstanceV1> {
  const instance = await createCatcafeApplicationInstanceV1();
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
    expect(await instance.semantic.dispatch(step as never)).toMatchObject({ kind: "committed" });
  }
  return instance;
}

function gameV1(instance: CatcafeApplicationInstanceV1) {
  return instance.semantic.observe().game;
}

describe("catcafe player rollback", () => {
  it("rolls a petting step back and the retry reproduces the same outcome", async () => {
    const instance = await instanceAtDailyV1();
    try {
      const before = gameV1(instance);
      expect(
        await instance.semantic.dispatch({ kind: "pet", zone: "back" } as never),
      ).toMatchObject({
        kind: "committed",
      });
      const petted = gameV1(instance);
      expect(petted.cat.pettingLeft).toBe(before.cat.pettingLeft - 1);

      // Roll back: the authoritative state returns to the pre-pet snapshot.
      const rollback = instance.rollback;
      expect(rollback.available().steps).toBeGreaterThanOrEqual(1);
      expect(await rollback.toPrevious()).toMatchObject({ kind: "rolled_back" });
      expect(gameV1(instance).cat).toMatchObject({
        trust: before.cat.trust,
        pettingLeft: before.cat.pettingLeft,
      });

      // Pinned outcome: the retry lands on the identical result (RNG rides
      // inside the snapshot; rollback is not a reroll).
      expect(
        await instance.semantic.dispatch({ kind: "pet", zone: "back" } as never),
      ).toMatchObject({
        kind: "committed",
      });
      expect(gameV1(instance).cat).toMatchObject({
        trust: petted.cat.trust,
        pettingLeft: petted.cat.pettingLeft,
      });
    } finally {
      await instance.dispose();
    }
  });

  it("entering the contest is a hard barrier: no checkpoint survives it", async () => {
    const instance = await instanceAtDailyV1();
    try {
      // Reach week 3 Sunday dusk (contest day) by ordinary play: 20 full
      // days plus two slots.
      for (let step = 0; step < 20 * 4 + 2; step += 1) {
        expect(
          await instance.semantic.dispatch({
            kind: "invoke",
            actionId: "cc.advance_slot",
          } as never),
        ).toMatchObject({ kind: "committed" });
      }
      expect(gameV1(instance).calendar).toMatchObject({ week: 3, day: 6, slot: 2 });
      expect(instance.rollback.available().steps).toBeGreaterThanOrEqual(1);

      expect(
        await instance.semantic.dispatch({ kind: "invoke", actionId: "cc.enter_contest" } as never),
      ).toMatchObject({ kind: "committed" });
      // The barrier cleared history: the match cannot be un-entered.
      expect(instance.rollback.available().steps).toBe(0);

      // Moves inside the match are checkpoints again.
      expect(
        await instance.semantic.dispatch({ kind: "contest_move", moveId: "move.pounce" } as never),
      ).toMatchObject({ kind: "committed" });
      expect(instance.rollback.available().steps).toBe(1);
    } finally {
      await instance.dispose();
    }
  });
});
