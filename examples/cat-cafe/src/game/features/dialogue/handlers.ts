// SPDX-License-Identifier: MIT
// Dialogue slice · commands: opening-narrative start and placeholder-verdict advancement (script in ./script.ts).
import { evaluateInteractionResolution } from "@sillymaker/base/story";

import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { emitCatcafeStageV1, transactionRunnerV1 } from "../../runtime.ts";
import {
  catcafeInteractionContextV1,
  catcafeNarrativeAfterResolutionV1,
  catcafeNarrativeAtBeginV1,
  runCatcafeNarrativeUntilInteractionV1,
} from "./script.ts";

export const dialogueCommandHandlersV1: Pick<
  CatcafeCommandHandlerMapV1,
  "cc.begin_story" | "cc.narrative_resolve"
> = {
  "cc.begin_story": ({ snapshot, rng, state }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      if (state.narrative.pending !== null) {
        return transaction.reject({ code: "cc.narrative_busy" });
      }
      const run = runCatcafeNarrativeUntilInteractionV1(
        catcafeNarrativeAtBeginV1(state.narrative),
        state.stage,
      );
      transaction.emit({ kind: "cc.narrative_advanced", next: run.narrative });
      const blocked = emitCatcafeStageV1(transaction, state.stage, run.stageMutations);
      if (blocked !== null) return transaction.reject({ code: blocked });
      return transaction.complete();
    }),

  "cc.narrative_resolve": ({ snapshot, rng, state, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      const pending = state.narrative.pending;
      const outcome = evaluateInteractionResolution(
        pending,
        command.expectedOccurrenceId,
        command.resolution,
        catcafeInteractionContextV1(pending, state.shop.money),
      );
      if (outcome.kind === "rejected") return transaction.reject({ code: outcome.code });
      if (pending === null) throw new TypeError("accepted resolution without pending");
      const run = runCatcafeNarrativeUntilInteractionV1(
        catcafeNarrativeAfterResolutionV1(state.narrative, command.resolution),
        state.stage,
      );
      transaction.emit({
        kind: "cc.interaction_resolved",
        definitionId: pending.definitionId,
        occurrenceId: pending.occurrenceId,
      });
      transaction.emit({ kind: "cc.narrative_advanced", next: run.narrative });
      const blocked = emitCatcafeStageV1(transaction, state.stage, run.stageMutations);
      if (blocked !== null) return transaction.reject({ code: blocked });
      return transaction.complete();
    }),
};
