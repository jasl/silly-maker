// SPDX-License-Identifier: MIT
// 舞台切片·模块：语义舞台状态；mutation 解析/归约后原子应用。
import type { StageMutation } from "@sillymaker/base/story";
import { parseStageMutation, reduceStageMutations } from "@sillymaker/base/story";

import { catcafeStageStateSchemaV1, createInitialCatcafeStageStateV1 } from "../../state.ts";
import { commandSchemaV1, kit, operationSchemaV1 } from "../../kernel.ts";

export type StageOperationV1 = {
  readonly kind: "apply";
  readonly mutations: readonly StageMutation[];
};

export const stageModuleV1 = kit.defineStatefulModule({
  id: "catcafe.stage",
  contractRevision: 2,
  state: {
    slot: "simulation.stage",
    schema: catcafeStageStateSchemaV1,
    initial: () => createInitialCatcafeStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<StageOperationV1>("stage"),
    propose(state, operation) {
      const mutations = operation.mutations.map((mutation, index) =>
        parseStageMutation(mutation, `/mutations/${String(index)}`),
      );
      const outcome = reduceStageMutations(state, mutations);
      if (outcome.kind === "rejected") {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "cc.stage_rejected" as const }),
        });
      }
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({ kind: "cc.stage_changed" as const, mutations: mutations.length }),
          ]),
        }),
      });
    },
    apply: (state, proposal) => {
      const outcome = reduceStageMutations(state, proposal.payload.mutations);
      if (outcome.kind !== "applied") throw new TypeError("validated catcafe stage must apply");
      return outcome.state;
    },
  },
});
