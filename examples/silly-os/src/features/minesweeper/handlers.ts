// SPDX-License-Identifier: MIT
// Minesweeper slice · commands: new game / reveal / flag. First reveal places mines via the
// transaction RNG (first click safe, replay-consistent); mine hits and wins broadcast as facts (for UI performance; authority is already in state).
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
      // Flagged cells ignore left-click reveals (Win98 semantics: unflag first, then reveal).
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
        // Mine hit: the board is terminal; reveal this cell (full mine reveal is released by the publication projection after the game ends).
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
