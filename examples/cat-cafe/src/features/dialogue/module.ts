// SPDX-License-Identifier: MIT
// 对话切片·模块：叙事状态推进（begin/resolve，占位栅栏化陈旧输入）。
import type { InteractionResolution } from "@sillymaker/base/story";
import { evaluateInteractionResolution } from "@sillymaker/base/story";

import { catcafeNarrativeStateSchemaV1 } from "../../state.ts";
import type { CatcafeNarrativeStateV1 } from "./script.ts";
import { catcafeInteractionContextV1, createInitialCatcafeNarrativeStateV1 } from "./script.ts";
import { commandSchemaV1, kit, operationSchemaV1 } from "../../kernel.ts";

export type NarrativeOperationV1 =
  | { readonly kind: "begin"; readonly next: CatcafeNarrativeStateV1 }
  | {
      readonly kind: "resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
      readonly next: CatcafeNarrativeStateV1;
    };

export const narrativeModuleV1 = kit.defineStatefulModule({
  id: "catcafe.narrative",
  contractRevision: 1,
  state: {
    slot: "simulation.narrative",
    schema: catcafeNarrativeStateSchemaV1,
    initial: () => createInitialCatcafeNarrativeStateV1(),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: operationSchemaV1<NarrativeOperationV1>("narrative"),
    propose(state, operation) {
      if (operation.kind === "begin") {
        if (state.pending !== null) {
          return Object.freeze({
            kind: "rejected" as const,
            rejection: Object.freeze({ code: "cc.narrative_busy" as const }),
          });
        }
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({ payload: operation, facts: Object.freeze([]) }),
        });
      }
      const outcome = evaluateInteractionResolution(
        state.pending,
        operation.expectedOccurrenceId,
        operation.resolution,
        catcafeInteractionContextV1(state.pending, Number.MAX_SAFE_INTEGER),
      );
      if (outcome.kind === "rejected") {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: outcome.code }),
        });
      }
      const pending = state.pending;
      if (pending === null) throw new TypeError("accepted resolution without pending");
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "cc.interaction_resolved" as const,
              definitionId: pending.definitionId,
              occurrenceId: pending.occurrenceId,
            }),
          ]),
        }),
      });
    },
    apply: (_state, proposal) => proposal.payload.next,
  },
});
