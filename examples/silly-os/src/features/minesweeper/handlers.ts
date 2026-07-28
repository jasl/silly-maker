// SPDX-License-Identifier: MIT
// 扫雷切片·命令：开局/翻格/插旗。首次翻格布雷走事务 RNG（首点安全，
// 重放一致）；踩雷与胜利以事实广播（UI 演出用，权威已在状态里）。
import type { OsCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import type { OsFactV1 } from "../../kernel.ts";
import { osCellFlaggedV1, osCellMineV1, osCellRevealedV1 } from "../../state.ts";
import { minesweeperModuleV1 } from "./module.ts";
import {
  osBoardConfigValidV1,
  osBoardWonV1,
  osCreateBoardV1,
  osPlaceMinesV1,
  osRevealFloodV1,
} from "./rules.ts";

export const minesweeperCommandHandlersV1: Pick<
  OsCommandHandlerMapV1,
  "os.mine.new" | "os.mine.reveal" | "os.mine.flag"
> = Object.freeze({
  "os.mine.new": ({ snapshot, rng, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      if (!osBoardConfigValidV1(command.width, command.height, command.mines)) {
        return transaction.reject({ code: "os.mine.invalid_config" });
      }
      transaction.propose(minesweeperModuleV1, {
        kind: "set",
        next: osCreateBoardV1(command.width, command.height, command.mines),
        facts: [
          Object.freeze({
            kind: "os.mine.started" as const,
            width: command.width,
            height: command.height,
          }),
        ],
      });
      return transaction.complete();
    }),

  "os.mine.reveal": ({ snapshot, rng, state, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      const board = state.minesweeper.board;
      if (board === null) return transaction.reject({ code: "os.mine.no_board" });
      if (board.status !== "playing") return transaction.reject({ code: "os.mine.finished" });
      if (command.x >= board.width || command.y >= board.height) {
        return transaction.reject({ code: "os.mine.out_of_bounds" });
      }
      const index = command.y * board.width + command.x;
      const cell = board.cells[index] as number;
      if ((cell & osCellRevealedV1) !== 0) {
        return transaction.reject({ code: "os.mine.cell_revealed" });
      }
      // 旗标格不响应左键翻开（Win98 语义：先取旗再翻）。
      if ((cell & osCellFlaggedV1) !== 0) {
        return transaction.reject({ code: "os.mine.cell_revealed" });
      }

      let working = board;
      if (!working.minesPlaced) {
        working = osPlaceMinesV1(working, index, (exclusiveMax) =>
          rng.nextInt(Object.freeze({ purpose: "check:os.mine_place", exclusiveMax })),
        );
      }

      const facts: OsFactV1[] = [];
      if (((working.cells[index] as number) & osCellMineV1) !== 0) {
        // 踩雷：盘面终局，翻开该格（全雷揭示由发布投影在终局后放行）。
        const cells = [...working.cells];
        cells[index] = (cells[index] as number) | osCellRevealedV1;
        working = Object.freeze({
          ...working,
          status: "lost" as const,
          cells: Object.freeze(cells),
        });
        facts.push(
          Object.freeze({ kind: "os.mine.exploded" as const, x: command.x, y: command.y }),
        );
      } else {
        working = osRevealFloodV1(working, index);
        if (osBoardWonV1(working)) {
          working = Object.freeze({ ...working, status: "won" as const });
          facts.push(Object.freeze({ kind: "os.mine.won" as const }));
        }
      }
      transaction.propose(minesweeperModuleV1, { kind: "set", next: working, facts });
      return transaction.complete();
    }),

  "os.mine.flag": ({ snapshot, rng, state, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      const board = state.minesweeper.board;
      if (board === null) return transaction.reject({ code: "os.mine.no_board" });
      if (board.status !== "playing") return transaction.reject({ code: "os.mine.finished" });
      if (command.x >= board.width || command.y >= board.height) {
        return transaction.reject({ code: "os.mine.out_of_bounds" });
      }
      const index = command.y * board.width + command.x;
      const cell = board.cells[index] as number;
      if ((cell & osCellRevealedV1) !== 0) {
        return transaction.reject({ code: "os.mine.cell_revealed" });
      }
      const cells = [...board.cells];
      cells[index] = cell ^ osCellFlaggedV1;
      transaction.propose(minesweeperModuleV1, {
        kind: "set",
        next: Object.freeze({ ...board, cells: Object.freeze(cells) }),
        facts: [],
      });
      return transaction.complete();
    }),
});
