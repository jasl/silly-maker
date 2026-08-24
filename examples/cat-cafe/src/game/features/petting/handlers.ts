// SPDX-License-Identifier: MIT
// Petting slice · commands: look up the reaction table by (part, trust band); effects and art expression commit atomically.
import { parseStageMutation } from "@sillymaker/base/story";

import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { emitCatcafeStageV1, transactionRunnerV1 } from "../../runtime.ts";
import { catcafePettingV1, catcafeStageForWeekV1 } from "../../content.ts";

export const pettingCommandHandlersV1: Pick<CatcafeCommandHandlerMapV1, "cc.pet"> = {
  "cc.pet": ({ snapshot, rng, state, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      // Daily gameplay unlocks after the opening narrative completes.
      if (state.narrative.phase !== "completed") {
        return transaction.reject({ code: "cc.narrative_busy" });
      }
      if (state.cat.pettingLeft < 1) return transaction.reject({ code: "cc.petting_exhausted" });
      // Reaction lookup: (part, trust band) decides the reaction and effects.
      const reaction = catcafePettingV1.findFirst({
        where: {
          zone: command.zone,
          minTrust: { lte: state.cat.trust },
          maxTrust: { gte: state.cat.trust },
        },
      });
      if (reaction === null) return transaction.reject({ code: "cc.petting_zone_unknown" });
      transaction.emit({
        kind: "cc.cat_set",
        next: {
          ...state.cat,
          trust: state.cat.trust + reaction.trustDelta,
          pettingLeft: state.cat.pettingLeft - 1,
        },
      });
      transaction.emit({
        kind: "cc.petted",
        zone: command.zone,
        reactionId: reaction.id,
        trustDelta: reaction.trustDelta,
      });
      const blocked = emitCatcafeStageV1(transaction, state.stage, [
        parseStageMutation(
          {
            kind: "setAppearance",
            layerId: "layer.catcafe.characters",
            tag: "tag.xiaoyu",
            appearance: {
              stage: ["kitten", "junior", "adolescent"][
                catcafeStageForWeekV1(state.calendar.week)
              ] as string,
              expression: reaction.expression,
            },
          },
          "/pet/appearance",
        ),
      ]);
      if (blocked !== null) return transaction.reject({ code: blocked });
      return transaction.complete();
    }),
};
