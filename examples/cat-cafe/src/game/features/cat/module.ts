// SPDX-License-Identifier: MIT
// Cat slice · module: trust/vigor/skill/fresh-fish bonus/petting allowance.
// The cc.cat_set reducer clamps the handler-computed draft into range (0-100).
import { catcafeCatStateSchemaV1, catcafeDailyPettingV1 } from "../../state.ts";
import { clampV1, commandSchemaV1, kit } from "../../kernel.ts";

export const catModuleV1 = kit.defineStatefulModule({
  id: "catcafe.cat",
  contractRevision: 1,
  state: {
    slot: "simulation.cat",
    schema: catcafeCatStateSchemaV1,
    initial: () => ({
      trust: 10,
      vigor: 60,
      skill: 0,
      fishBuff: 0,
      pettingLeft: catcafeDailyPettingV1,
    }),
  },
  commandSchema: commandSchemaV1,
  // cc.cat_set carries the absolute post-command draft computed by the
  // handler from the command-start snapshot: emit at most one per command
  // (a second would clobber the first, not compose with it).
  reducers: {
    "cc.cat_set": (_state, event) => ({
      trust: clampV1(event.next.trust, 0, 100),
      vigor: clampV1(event.next.vigor, 0, 100),
      skill: clampV1(event.next.skill, 0, 100),
      fishBuff: clampV1(event.next.fishBuff, 0, 3),
      pettingLeft: clampV1(event.next.pettingLeft, 0, catcafeDailyPettingV1),
    }),
  },
});
