// SPDX-License-Identifier: MIT
// 竞赛切片·模块：进行中的运动会回合状态（null = 未开赛）。
import type { CatcafeContestStateV1 } from "../../state.ts";
import { catcafeContestStateSchemaV1 } from "../../state.ts";
import type { CatcafeFactV1 } from "../../kernel.ts";
import { commandSchemaV1, kit, operationSchemaV1 } from "../../kernel.ts";

export type ContestOperationV1 = {
  readonly kind: "set";
  readonly next: CatcafeContestStateV1 | null;
  readonly facts?: readonly CatcafeFactV1[];
};

export const contestModuleV1 = kit.defineStatefulModule({
  id: "catcafe.contest",
  contractRevision: 1,
  state: {
    slot: "simulation.contest",
    schema: catcafeContestStateSchemaV1,
    initial: () => null,
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<ContestOperationV1>("contest"),
    propose: (_state, operation) =>
      Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([...(operation.facts ?? [])]),
        }),
      }),
    apply: (_state, proposal) => proposal.payload.next,
  },
});
