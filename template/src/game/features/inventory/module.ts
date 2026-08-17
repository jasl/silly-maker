// SPDX-License-Identifier: MIT
// Inventory feature slice: the empty-shell gameplay module plus the
// capability other modules use to read it. A new feature = a new
// directory like this one — module/rules/handlers/content per slice —
// aggregated by src/game/simulation.ts (see examples/cat-cafe for the full
// pattern at scale).
import type { RuntimeSchemaV1 } from "@sillymaker/base";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";

import type { TemplateInventoryStateV1 } from "../../state.ts";
import { templateInventoryStateSchemaV1 } from "../../state.ts";
import { commandSchemaV1, kit } from "../../kernel.ts";

export type InventoryOperationV1 =
  | { readonly kind: "earn"; readonly amount: number }
  | { readonly kind: "spend"; readonly amount: number };

const inventoryOperationSchemaV1: RuntimeSchemaV1<InventoryOperationV1> = Object.freeze({
  parse(value: unknown): InventoryOperationV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).toSorted().join("\0") !== "amount\0kind"
    ) {
      throw new TypeError("invalid template inventory operation");
    }
    const record = value as { readonly kind?: unknown; readonly amount?: unknown };
    if (record.kind !== "earn" && record.kind !== "spend") {
      throw new TypeError("invalid template inventory operation kind");
    }
    const amount = parseNonNegativeSafeInteger(record.amount);
    if (amount < 1) throw new TypeError("template inventory amount must be positive");
    return Object.freeze({ kind: record.kind, amount });
  },
});

/** The read-only capability the narrative module uses to price choices. */
export interface TemplateInventoryReadPortV1 {
  coinBalance(): number;
}

export const templateInventoryReadCapabilityV1 = kit.defineCapability<TemplateInventoryReadPortV1>(
  "capability.template.inventory.read",
);

/**
 * The empty-shell gameplay module. Its owner enforces the one inventory
 * rule (no overdraft); cross-module commands consume it through the
 * transaction so a choice's coin cost and the narrative continuation
 * commit atomically.
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
  owner: {
    operationSchema: inventoryOperationSchemaV1,
    propose(state, operation) {
      if (operation.kind === "spend" && state.coins < operation.amount) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "template.insufficient_coins" as const }),
        });
      }
      const balance = operation.kind === "earn"
        ? state.coins + operation.amount
        : state.coins - operation.amount;
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "template.coins_changed" as const,
              delta: operation.kind === "earn" ? operation.amount : -operation.amount,
              balance,
            }),
          ]),
        }),
      });
    },
    apply(state: TemplateInventoryStateV1, proposal) {
      const operation = proposal.payload;
      return Object.freeze({
        coins: operation.kind === "earn"
          ? state.coins + operation.amount
          : state.coins - operation.amount,
      });
    },
  },
});
