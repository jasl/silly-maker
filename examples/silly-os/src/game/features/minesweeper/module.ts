// SPDX-License-Identifier: MIT
// Minesweeper slice · module: the board state replaced wholesale (handlers compute the rules and emit the board).
import type { OsMinesweeperStateV1 } from "../../state.ts";
import { osMinesweeperStateSchemaV1 } from "../../state.ts";
import { commandSchemaV1, kit } from "../../kernel.ts";

export const minesweeperModuleV1 = kit.defineStatefulModule({
  id: "os.minesweeper",
  contractRevision: 1,
  state: {
    slot: "simulation.minesweeper",
    schema: osMinesweeperStateSchemaV1,
    initial: (): OsMinesweeperStateV1 => ({ board: null }),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "os.mine.board_set": (_state, event) => ({ board: event.board }),
  },
});
