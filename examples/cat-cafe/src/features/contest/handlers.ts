// SPDX-License-Identifier: MIT
// 竞赛切片·命令：开赛与回合出招（威力/佯动/魅力 对 对手行为模式）。
import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { catcafeMovesV1, catcafeRivalsV1 } from "../../content.ts";
import { clampV1 } from "../../kernel.ts";
import { contestModuleV1 } from "./module.ts";
import { catcafeContestTodayV1 } from "./rules.ts";
import { shopModuleV1 } from "../shop/module.ts";

export const contestCommandHandlersV1: Pick<
  CatcafeCommandHandlerMapV1,
  "cc.enter_contest" | "cc.contest_move"
> = Object.freeze({
  "cc.enter_contest": ({ snapshot, rng, state }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      // 日常玩法在开场叙事完成后解锁。
      if (state.narrative.phase !== "completed") {
        return transaction.reject({ code: "cc.narrative_busy" });
      }
      if (state.contest !== null) {
        return transaction.reject({ code: "cc.contest_already_running" });
      }
      const rivalId = catcafeContestTodayV1(state.calendar);
      if (rivalId === null) return transaction.reject({ code: "cc.contest_not_today" });
      const rival = catcafeRivalsV1.byId(rivalId);
      if (rival === null) return transaction.reject({ code: "cc.contest_not_today" });
      transaction.propose(contestModuleV1, {
        kind: "set",
        next: Object.freeze({
          rivalId,
          round: 1,
          morale: 30 + Math.floor(state.cat.skill / 2),
          rivalMorale: rival.morale,
          feintActive: false,
        }),
        facts: [Object.freeze({ kind: "cc.contest_started" as const, rivalId })],
      });
      return transaction.complete();
    }),

  "cc.contest_move": ({ snapshot, rng, state, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      const contest = state.contest;
      if (contest === null) return transaction.reject({ code: "cc.contest_not_running" });
      const move = catcafeMovesV1.byId(command.moveId);
      if (move === null) return transaction.reject({ code: "cc.contest_move_unknown" });
      const rival = catcafeRivalsV1.byId(contest.rivalId);
      if (rival === null) return transaction.reject({ code: "cc.contest_not_running" });

      // 我方出招：威力 + 技艺加成 + 少量随机。
      const variance = rng.nextInt(
        Object.freeze({ purpose: "check:cc.contest_variance", exclusiveMax: 5 }),
      );
      const damage =
        move.kind === "charm" ? 0 : move.power + Math.floor(state.cat.skill / 10) + variance;
      const selfHeal = move.kind === "charm" ? 12 : 0;
      let rivalMorale = Math.max(0, contest.rivalMorale - damage);
      let morale = contest.morale + selfHeal;

      // 对手回击（按行为模式），佯动可闪避。
      if (rivalMorale > 0) {
        const rivalHit =
          rival.pattern === "aggressive"
            ? rival.power + 3
            : rival.pattern === "steady"
              ? rival.power
              : contest.round === 3
                ? rival.power + 5
                : Math.max(0, rival.power - 3);
        morale = Math.max(0, morale - (contest.feintActive ? 0 : rivalHit));
      }

      const round = contest.round + 1;
      const finished = rivalMorale === 0 || morale === 0 || round > 3;
      const won = rivalMorale === 0 || (finished && morale > rivalMorale);

      if (!finished) {
        transaction.propose(contestModuleV1, {
          kind: "set",
          next: Object.freeze({
            rivalId: contest.rivalId,
            round,
            morale,
            rivalMorale,
            feintActive: move.kind === "feint",
          }),
          facts: [
            Object.freeze({
              kind: "cc.contest_resolved" as const,
              moveId: move.id,
              rivalMorale,
              morale,
            }),
          ],
        });
        return transaction.complete();
      }

      if (won) {
        transaction.propose(contestModuleV1, {
          kind: "set",
          next: null,
          facts: [
            Object.freeze({
              kind: "cc.contest_won" as const,
              rivalId: contest.rivalId,
              albumId: rival.trophyAlbumId,
            }),
            Object.freeze({
              kind: "cc.album_unlocked" as const,
              albumId: rival.trophyAlbumId,
            }),
          ],
        });
        transaction.propose(shopModuleV1, {
          kind: "apply",
          reputation: clampV1(state.shop.reputation + 10, 0, 100),
          tidiness: state.shop.tidiness,
          money: state.shop.money + 40,
          trophies: clampV1(state.shop.trophies + 1, 0, 3),
        });
        return transaction.complete();
      }
      transaction.propose(contestModuleV1, {
        kind: "set",
        next: null,
        facts: [Object.freeze({ kind: "cc.contest_lost" as const, rivalId: contest.rivalId })],
      });
      return transaction.complete();
    }),
});
