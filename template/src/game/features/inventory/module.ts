// SPDX-License-Identifier: MIT
// Inventory feature slice: the empty-shell gameplay module plus the
// capability other code uses to read it. A new feature = a new
// directory like this one — module/rules/handlers/content per slice —
// aggregated by src/game/simulation.ts (see examples/cat-cafe for the full
// pattern at scale).
import { templateInventoryStateSchemaV1 } from "../../state.ts";
import { commandSchemaV1, kit } from "../../kernel.ts";

/** The read-only capability command handlers use to price choices. */
export interface TemplateInventoryReadPortV1 {
  coinBalance(): number;
}

export const templateInventoryReadCapabilityV1 = kit.defineCapability<TemplateInventoryReadPortV1>(
  "capability.template.inventory.read",
);

/**
 * The empty-shell gameplay module. Command handlers decide and emit
 * `template.coins_changed` (the overdraft rule lives at the decision
 * point); this reducer folds the admitted event into the slice, so a
 * choice's coin cost and the narrative continuation commit atomically.
 */
export const inventoryModuleV1 = kit.defineStatefulModule({
  id: "template.inventory",
  contractRevision: 1,
  state: {
    slot: "simulation.inventory",
    schema: templateInventoryStateSchemaV1,
    initial: () => Object.freeze({ coins: 0 }),
  },
  commandSchema: commandSchemaV1,
  provides: (provide) => [
    provide(templateInventoryReadCapabilityV1, ({ readOwnState }) => ({
      coinBalance: () => readOwnState().coins,
    })),
  ],
  reducers: {
    "template.coins_changed": (_state, event) => Object.freeze({ coins: event.balance }),
  },
});
