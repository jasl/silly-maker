// SPDX-License-Identifier: MIT
// Shop slice · module: reputation/tidiness/money/trophies/confirmed ending.
// The cc.shop_set reducer clamps percentages; overdraft rejection happens at
// the handler decision point before the event is emitted.
import { catcafeShopStateSchemaV1 } from "../../state.ts";
import { clampV1, commandSchemaV1, kit } from "../../kernel.ts";

export const shopModuleV1 = kit.defineStatefulModule({
  id: "catcafe.shop",
  contractRevision: 1,
  state: {
    slot: "simulation.shop",
    schema: catcafeShopStateSchemaV1,
    initial: () => ({ reputation: 10, tidiness: 60, money: 50, trophies: 0, epilogue: null }),
  },
  commandSchema: commandSchemaV1,
  // cc.shop_set carries the absolute post-command draft computed by the
  // handler from the command-start snapshot: emit at most one per command
  // (a second would clobber the first, not compose with it).
  reducers: {
    "cc.shop_set": (_state, event) => ({
      reputation: clampV1(event.next.reputation, 0, 100),
      tidiness: clampV1(event.next.tidiness, 0, 100),
      money: event.next.money,
      trophies: Math.max(0, event.next.trophies),
      epilogue: event.next.epilogue,
    }),
  },
});
