// SPDX-License-Identifier: MIT
// Stage slice · module: semantic stage state; cc.stage_changed folds parsed
// mutations. Handlers pre-validate reducibility so unappliable mutations
// reject at the decision point instead of faulting in the reducer.
import { reduceStageMutations } from "@sillymaker/base/story";

import { catcafeStageStateSchemaV1, createInitialCatcafeStageStateV1 } from "../../state.ts";
import { commandSchemaV1, kit } from "../../kernel.ts";

export const stageModuleV1 = kit.defineStatefulModule({
  id: "catcafe.stage",
  contractRevision: 2,
  state: {
    slot: "simulation.stage",
    schema: catcafeStageStateSchemaV1,
    initial: () => createInitialCatcafeStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "cc.stage_changed": (state, event) => {
      const outcome = reduceStageMutations(state, event.mutations);
      if (outcome.kind !== "applied") {
        throw new TypeError("emitted catcafe stage mutations must apply");
      }
      return outcome.state;
    },
  },
});
