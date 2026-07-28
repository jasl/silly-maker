// SPDX-License-Identifier: MIT
// 日历切片·自动推进：体力耗尽（无法再做活动）时，时间在短暂停留后
// 自动流向下一时段——玩家不必反复点"推进"。保护条款：开场未完、
// 比赛进行中、今天的运动会还没打、结局已结算时都不自动。
import { useEffect, useState } from "react";

import type { DeepReadonly } from "@sillymaker/base";

import type { CatcafeSemanticPortV1, CatcafeUiPublicationV1 } from "../../application/ui-kit.ts";
import { dispatchV1 } from "../../application/ui-kit.ts";
import { catcafeContestTodayV1 } from "../contest/rules.ts";

export const catcafeAutoAdvanceDelayMsV1 = 5000;

/** 返回是否正在倒计时（HUD 显示"时光流逝…"提示）。 */
export function useCatcafeAutoAdvanceV1(
  publication: DeepReadonly<CatcafeUiPublicationV1>,
  semantic: CatcafeSemanticPortV1,
): boolean {
  const game = publication.semantic.game;
  const phase = publication.semantic.narrative.phase;
  const eligible =
    phase === "completed" &&
    game.ending === null &&
    game.contest === null &&
    game.calendar.stamina === 0 &&
    // 今天的运动会还没打：把时间留给玩家（打完或手动跳过）。
    catcafeContestTodayV1(game.calendar) === null;
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!eligible) {
      setPending(false);
      return undefined;
    }
    setPending(true);
    const timer = setTimeout(() => {
      dispatchV1(semantic, { kind: "invoke", actionId: "cc.advance_slot" });
    }, catcafeAutoAdvanceDelayMsV1);
    return () => clearTimeout(timer);
    // calendar 的 slot/day/week 变化（推进落地）会重建计时器或退出。
  }, [eligible, semantic, game.calendar.slot, game.calendar.day, game.calendar.week]);
  return pending;
}
