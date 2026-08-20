// SPDX-License-Identifier: MIT
// Contest slice · module: the in-progress contest turn state (null = not started).
import { catcafeContestStateSchemaV1 } from "../../state.ts";
import { commandSchemaV1, kit } from "../../kernel.ts";

export const contestModuleV1 = kit.defineStatefulModule({
  id: "catcafe.contest",
  contractRevision: 1,
  state: {
    slot: "simulation.contest",
    schema: catcafeContestStateSchemaV1,
    initial: () => null,
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "cc.contest_set": (_state, event) => event.next,
  },
});
