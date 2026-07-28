// SPDX-License-Identifier: MIT
// Cat slice · module: trust/vigor/skill/fresh-fish bonus/petting allowance (clamped 0-100).
import { catcafeCatStateSchemaV1, catcafeDailyPettingV1 } from "../../state.ts";
import type { CatcafeFactV1 } from "../../kernel.ts";
import { clampV1, commandSchemaV1, kit, operationSchemaV1 } from "../../kernel.ts";

export type CatOperationV1 = {
  readonly kind: "apply";
  readonly trust: number;
  readonly vigor: number;
  readonly skill: number;
  readonly fishBuff: number;
  readonly pettingLeft: number;
  readonly facts?: readonly CatcafeFactV1[];
};

export const catModuleV1 = kit.defineStatefulModule({
  id: "catcafe.cat",
  contractRevision: 1,
  state: {
    slot: "simulation.cat",
    schema: catcafeCatStateSchemaV1,
    initial: () =>
      Object.freeze({
        trust: 10,
        vigor: 60,
        skill: 0,
        fishBuff: 0,
        pettingLeft: catcafeDailyPettingV1,
      }),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<CatOperationV1>("cat"),
    propose: (_state, operation) =>
      Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([...(operation.facts ?? [])]),
        }),
      }),
    apply: (_state, proposal) => {
      const next = proposal.payload;
      return Object.freeze({
        trust: clampV1(next.trust, 0, 100),
        vigor: clampV1(next.vigor, 0, 100),
        skill: clampV1(next.skill, 0, 100),
        fishBuff: clampV1(next.fishBuff, 0, 3),
        pettingLeft: clampV1(next.pettingLeft, 0, catcafeDailyPettingV1),
      });
    },
  },
});
