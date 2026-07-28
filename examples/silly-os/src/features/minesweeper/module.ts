// SPDX-License-Identifier: MIT
// Minesweeper slice · module: the board state replaced wholesale (handlers compute the rules, this commits).
import type { OsBoardV1, OsMinesweeperStateV1 } from "../../state.ts";
import { osMinesweeperStateSchemaV1 } from "../../state.ts";
import type { OsFactV1 } from "../../kernel.ts";
import { commandSchemaV1, kit, operationSchemaV1 } from "../../kernel.ts";

export type MinesweeperOperationV1 = {
  readonly kind: "set";
  readonly next: OsBoardV1 | null;
  readonly facts?: readonly OsFactV1[];
};

export const minesweeperModuleV1 = kit.defineStatefulModule({
  id: "os.minesweeper",
  contractRevision: 1,
  state: {
    slot: "simulation.minesweeper",
    schema: osMinesweeperStateSchemaV1,
    initial: (): OsMinesweeperStateV1 => Object.freeze({ board: null }),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<MinesweeperOperationV1>("minesweeper"),
    propose: (_state, operation) =>
      Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([...(operation.facts ?? [])]),
        }),
      }),
    apply: (_state, proposal) => Object.freeze({ board: proposal.payload.next }),
  },
});
