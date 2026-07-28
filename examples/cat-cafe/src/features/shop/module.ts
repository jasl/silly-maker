// SPDX-License-Identifier: MIT
// 店铺切片·模块：声誉/整洁/资金/奖杯/已确认结局。
import { catcafeShopStateSchemaV1 } from "../../state.ts";
import type { CatcafeFactV1 } from "../../kernel.ts";
import { clampV1, commandSchemaV1, kit, operationSchemaV1 } from "../../kernel.ts";

export type ShopOperationV1 = {
  readonly kind: "apply";
  readonly reputation: number;
  readonly tidiness: number;
  readonly money: number;
  readonly trophies: number;
  /** 缺省保持不变；enter_postgame 用它写入已确认的结局。 */
  readonly epilogue?: string | null;
  readonly facts?: readonly CatcafeFactV1[];
};

export const shopModuleV1 = kit.defineStatefulModule({
  id: "catcafe.shop",
  contractRevision: 1,
  state: {
    slot: "simulation.shop",
    schema: catcafeShopStateSchemaV1,
    initial: () =>
      Object.freeze({ reputation: 10, tidiness: 60, money: 50, trophies: 0, epilogue: null }),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<ShopOperationV1>("shop"),
    propose(state, operation) {
      if (operation.money < 0) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "cc.money_short" as const }),
        });
      }
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([...(operation.facts ?? [])]),
        }),
      });
    },
    apply: (state, proposal) => {
      const next = proposal.payload;
      return Object.freeze({
        reputation: clampV1(next.reputation, 0, 100),
        tidiness: clampV1(next.tidiness, 0, 100),
        money: next.money,
        trophies: Math.max(0, next.trophies),
        epilogue: next.epilogue === undefined ? state.epilogue : next.epilogue,
      });
    },
  },
});
