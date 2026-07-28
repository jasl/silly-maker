// SPDX-License-Identifier: MIT
// Dialogue slice · commands: opening-narrative start and placeholder-verdict advancement (script in ./script.ts).
import { evaluateInteractionResolution } from "@sillymaker/base/story";

import type { CatcafeCommandHandlerMapV1 } from "../../runtime.ts";
import { transactionRunnerV1 } from "../../runtime.ts";
import { narrativeModuleV1 } from "./module.ts";
import { stageModuleV1 } from "../stage/module.ts";
import {
  catcafeInteractionContextV1,
  catcafeNarrativeAfterResolutionV1,
  catcafeNarrativeAtBeginV1,
  runCatcafeNarrativeUntilInteractionV1,
} from "./script.ts";

export const dialogueCommandHandlersV1: Pick<
  CatcafeCommandHandlerMapV1,
  "cc.begin_story" | "cc.narrative_resolve"
> = Object.freeze({
  "cc.begin_story": ({ snapshot, rng, state }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      if (state.narrative.pending !== null) {
        return transaction.reject({ code: "cc.narrative_busy" });
      }
      const run = runCatcafeNarrativeUntilInteractionV1(
        catcafeNarrativeAtBeginV1(state.narrative),
        state.stage,
      );
      transaction.propose(narrativeModuleV1, { kind: "begin", next: run.narrative });
      if (run.stageMutations.length > 0) {
        transaction.propose(stageModuleV1, { kind: "apply", mutations: run.stageMutations });
      }
      return transaction.complete();
    }),

  "cc.narrative_resolve": ({ snapshot, rng, state, command }) =>
    transactionRunnerV1.execute(snapshot, rng, (transaction) => {
      const outcome = evaluateInteractionResolution(
        state.narrative.pending,
        command.expectedOccurrenceId,
        command.resolution,
        catcafeInteractionContextV1(state.narrative.pending, state.shop.money),
      );
      if (outcome.kind === "rejected") return transaction.reject({ code: outcome.code });
      const run = runCatcafeNarrativeUntilInteractionV1(
        catcafeNarrativeAfterResolutionV1(state.narrative, command.resolution),
        state.stage,
      );
      transaction.propose(narrativeModuleV1, {
        kind: "resolve",
        expectedOccurrenceId: command.expectedOccurrenceId,
        resolution: command.resolution,
        next: run.narrative,
      });
      if (run.stageMutations.length > 0) {
        transaction.propose(stageModuleV1, { kind: "apply", mutations: run.stageMutations });
      }
      return transaction.complete();
    }),
});
