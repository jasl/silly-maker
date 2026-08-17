// SPDX-License-Identifier: MIT
// Calendar slice · auto-advance: when stamina is exhausted (no more activities),
// time flows to the next slot after a short dwell — the player need not click
// "advance" repeatedly. Guards: never during the opening, mid-contest, before today's unplayed contest, or after the ending settles.
import { useEffect, useState } from "react";

import type { DeepReadonly } from "@sillymaker/base";

import type { CatcafeSemanticPortV1, CatcafeUiPublicationV1 } from "../../../application/ui-kit.ts";
import { dispatchV1 } from "../../../application/ui-kit.ts";
import { catcafeContestTodayV1 } from "../contest/rules.ts";

export const catcafeAutoAdvanceDelayMsV1 = 5000;

/** Returns whether the countdown is running (HUD shows the "time passes…" notice). */
export function useCatcafeAutoAdvanceV1(
  publication: DeepReadonly<CatcafeUiPublicationV1>,
  semantic: CatcafeSemanticPortV1,
): boolean {
  const game = publication.semantic.game;
  const phase = publication.semantic.narrative.phase;
  const eligible = phase === "completed" &&
    game.ending === null &&
    game.contest === null &&
    game.calendar.stamina === 0 &&
    // Today's contest is still unplayed: leave the time to the player (play it or skip manually).
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
    // Changes to calendar slot/day/week (an advance landing) rebuild the timer or exit.
  }, [eligible, semantic, game.calendar.slot, game.calendar.day, game.calendar.week]);
  return pending;
}
