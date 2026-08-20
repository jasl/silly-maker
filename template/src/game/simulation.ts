// SPDX-License-Identifier: MIT
import type { BootstrapEntropyV1, RuntimeSchemaV1 } from "@sillymaker/base";
import { createTransactionalRngV1 } from "@sillymaker/base";
import type { GameSimulation, StageCueDispatch, StageMutation } from "@sillymaker/base/story";
import {
  defineGameSimulation,
  evaluateInteractionResolution,
  evaluateTimeTick,
  reduceStageMutations,
} from "@sillymaker/base/story";

import type { TemplateGameStateV1 } from "./state.ts";
import {
  createInitialTemplateGameStateV1,
  createInitialTemplateStageStateV1,
  templateGameStateSchemaV1,
  templateNarrativeStateSchemaV1,
  templateStageStateSchemaV1,
} from "./state.ts";
import type {
  TemplateAttemptV1,
  TemplateCommandV1,
  TemplateDebugValidationErrorV1,
  TemplateEventV1,
  TemplateQueriesV1,
  TemplateRejectionV1,
  TemplateSimulationTypesV1,
  TemplateSnapshotV1,
} from "./kernel.ts";
import { commandSchemaV1, kit, templateEventSchemaV1 } from "./kernel.ts";
import {
  inventoryModuleV1,
  templateInventoryReadCapabilityV1,
} from "./features/inventory/module.ts";
import {
  createInitialTemplateNarrativeStateV1,
  runTemplateNarrativeUntilInteractionV1,
  templateChoiceOptionsForV1,
  templateInteractionContextV1,
  templateNarrativeAfterResolutionV1,
  templateNarrativeAfterTimeTickV1,
  templateNarrativeAtBeginV1,
} from "../story/narrative.ts";

/**
 * The starter simulation: three stateful modules and one command executor.
 *
 * - `template.inventory` is the empty-shell gameplay module (a coin purse).
 * - `template.narrative` owns the script cursor and pending interaction.
 * - `template.stage`     owns the semantic stage state.
 *
 * Command handlers decide and emit domain events; each module's reducers
 * fold the admitted events atomically. A command either commits a complete
 * valid result across every touched module or leaves authoritative state
 * unchanged.
 */

// ---- Public contract re-exports: consumers face this facade only.
export type {
  TemplateAttemptV1,
  TemplateBootstrapInputV1,
  TemplateChoiceOptionViewV1,
  TemplateCommandV1,
  TemplateDebugValidationErrorV1,
  TemplateEventV1,
  TemplateFaultV1,
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateQueriesV1,
  TemplateRejectionCodeV1,
  TemplateRejectionV1,
  TemplateSimulationTypesV1,
  TemplateSnapshotV1,
} from "./kernel.ts";
export type { TemplateInventoryReadPortV1 } from "./features/inventory/module.ts";
export { templateInventoryReadCapabilityV1 } from "./features/inventory/module.ts";

function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

const debugCommandSchemaV1: RuntimeSchemaV1<never> = Object.freeze({
  parse(): never {
    throw new TypeError("template debug commands are unsupported");
  },
});

const narrativeModuleV1 = kit.defineStatefulModule({
  id: "template.narrative",
  contractRevision: 1,
  state: {
    slot: "simulation.narrative",
    schema: templateNarrativeStateSchemaV1,
    initial: () => createInitialTemplateNarrativeStateV1(),
  },
  commandSchema: commandSchemaV1,
  // Coin-costing choices gate on the wallet balance.
  requires: { inventory: templateInventoryReadCapabilityV1 },
  initializesAfter: ["template.inventory"],
  reducers: {
    "template.narrative_advanced": (_state, event) => event.next,
  },
});

const stageModuleV1 = kit.defineStatefulModule({
  id: "template.stage",
  contractRevision: 2,
  state: {
    slot: "simulation.stage",
    schema: templateStageStateSchemaV1,
    initial: () => createInitialTemplateStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "template.stage_changed": (state, event) => {
      // Handlers validate applicability before emitting, so a rejected fold
      // here is a programming fault, not a player-visible rejection.
      const outcome = reduceStageMutations(state, event.mutations);
      if (outcome.kind !== "applied") {
        throw new TypeError("validated template stage mutations must apply");
      }
      return outcome.state;
    },
  },
});

const compositionV1 = kit.composeModules([inventoryModuleV1, narrativeModuleV1, stageModuleV1]);

type TemplateModulesV1 = typeof compositionV1.modules;

type TemplateCommandExecutorV1 = {
  executeAttempt(
    snapshot: TemplateSnapshotV1,
    command: TemplateCommandV1,
    context: undefined,
  ): TemplateAttemptV1;
};

type TemplateDebugCommandExecutorV1 = {
  validate(
    snapshot: TemplateSnapshotV1,
    command: never,
    context: undefined,
  ): {
    readonly kind: "validation_failed";
    readonly errors: readonly TemplateDebugValidationErrorV1[];
  };
  executeAttempt(snapshot: TemplateSnapshotV1, command: never, context: undefined): never;
};

export type TemplateGameSimulationV1 = GameSimulation<
  TemplateSimulationTypesV1,
  TemplateModulesV1,
  TemplateCommandExecutorV1,
  TemplateDebugCommandExecutorV1
>;

const transactionRunnerV1 = compositionV1.createTransactionRunner({
  stateSchema: templateGameStateSchemaV1,
  eventSchema: templateEventSchemaV1,
  createFault: () => Object.freeze({ code: "template.executor_failed" as const }),
});

export function createTemplateGameSimulationV1(): TemplateGameSimulationV1 {
  const commandExecutor: TemplateCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation;

      const emitStage = (
        transaction: { emit(event: TemplateEventV1): void },
        mutations: readonly StageMutation[],
        dispatches: readonly StageCueDispatch[],
      ) => {
        if (mutations.length === 0) return null;
        // Validate applicability at the decision point so an unappliable
        // mutation rejects the command instead of faulting the fold.
        const outcome = reduceStageMutations(state.stage, mutations);
        if (outcome.kind === "rejected") return "template.stage_rejected" as const;
        transaction.emit({
          kind: "template.stage_changed",
          mutations,
          ...(dispatches.length === 0 ? {} : { dispatches }),
        });
        return null;
      };

      if (command.kind === "template.earn_coin") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          transaction.emit({
            kind: "template.coins_changed",
            delta: 1,
            balance: state.inventory.coins + 1,
          });
          return transaction.complete();
        });
      }

      if (command.kind === "template.begin_story") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (state.narrative.pending !== null) {
            return transaction.reject({ code: "template.narrative_busy" });
          }
          const run = runTemplateNarrativeUntilInteractionV1(
            templateNarrativeAtBeginV1(state.narrative),
            state.stage,
          );
          transaction.emit({ kind: "template.narrative_advanced", next: run.narrative });
          const blocked = emitStage(transaction, run.stageMutations, run.stageDispatches);
          if (blocked !== null) return transaction.reject({ code: blocked });
          return transaction.complete();
        });
      }

      if (command.kind === "template.time_tick") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          // The queue-front authority for the time verb: a stale hold fence
          // rejects the whole command, so a stale queued report can never
          // pre-fold a successor hold.
          const outcome = evaluateTimeTick(state.narrative.pending, command.tick);
          if (outcome.kind === "rejected") {
            return transaction.reject({ code: outcome.code });
          }
          if (outcome.hold === null) {
            // An unfenced tick settles only session-global time consumers;
            // none are registered yet, so it commits with an empty journal.
            return transaction.complete();
          }
          const continuation = templateNarrativeAfterTimeTickV1(state.narrative, command.tick);
          if (continuation.kind === "holding") {
            // A partial settlement decrements the authoritative remaining
            // milliseconds without consuming the pending boundary: the
            // same occurrence stays pending and the script does not run.
            transaction.emit({
              kind: "template.narrative_advanced",
              next: continuation.narrative,
            });
            return transaction.complete();
          }
          // Expiry consumes the boundary: the script runs to the next
          // interaction inside the same commit.
          const run = runTemplateNarrativeUntilInteractionV1(continuation.narrative, state.stage);
          transaction.emit({
            kind: "template.interaction_resolved",
            definitionId: outcome.hold.definitionId,
            occurrenceId: outcome.hold.occurrenceId,
          });
          transaction.emit({ kind: "template.narrative_advanced", next: run.narrative });
          const blocked = emitStage(transaction, run.stageMutations, run.stageDispatches);
          if (blocked !== null) return transaction.reject({ code: blocked });
          return transaction.complete();
        });
      }

      return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // The same shared evaluator that served the action catalog and
        // preview re-checks the expected occurrence and choice availability
        // at dispatch time; the read capability prices choices against the
        // command-start snapshot.
        const coins = transaction.read(templateInventoryReadCapabilityV1).coinBalance();
        const pending = state.narrative.pending;
        const outcome = evaluateInteractionResolution(
          pending,
          command.expectedOccurrenceId,
          command.resolution,
          templateInteractionContextV1(pending, coins),
        );
        if (outcome.kind === "rejected") {
          return transaction.reject({ code: outcome.code });
        }
        if (pending === null) throw new TypeError("accepted resolution without pending");
        const run = runTemplateNarrativeUntilInteractionV1(
          templateNarrativeAfterResolutionV1(state.narrative, command.resolution),
          state.stage,
        );
        transaction.emit({
          kind: "template.interaction_resolved",
          definitionId: pending.definitionId,
          occurrenceId: pending.occurrenceId,
        });
        transaction.emit({ kind: "template.narrative_advanced", next: run.narrative });
        // A choice may carry a declared coin cost: the narrative
        // continuation and the spend commit in one atomic command.
        const resolution = command.resolution;
        if (resolution.kind === "choose") {
          const option = templateChoiceOptionsForV1(pending.definitionId).find(
            (candidate) => candidate.choiceId === resolution.choiceId,
          );
          if (option !== undefined && option.consumesCoins > 0) {
            if (coins < option.consumesCoins) {
              return transaction.reject({ code: "template.insufficient_coins" });
            }
            transaction.emit({
              kind: "template.coins_changed",
              delta: -option.consumesCoins,
              balance: coins - option.consumesCoins,
            });
          }
        }
        const blocked = emitStage(transaction, run.stageMutations, run.stageDispatches);
        if (blocked !== null) return transaction.reject({ code: blocked });
        return transaction.complete();
      });
    },
  });

  const debugCommandExecutor: TemplateDebugCommandExecutorV1 = Object.freeze({
    validate() {
      return Object.freeze({
        kind: "validation_failed" as const,
        errors: Object.freeze([
          Object.freeze({ code: "template.debug_command_unsupported" as const }),
        ]),
      });
    },
    executeAttempt() {
      throw new TypeError("template debug commands are unsupported");
    },
  });

  return defineGameSimulation<TemplateSimulationTypesV1>()({
    contractRevision: 1,
    modules: compositionV1.modules,
    stateSchema: templateGameStateSchemaV1,
    commandSchema: commandSchemaV1,
    eventSchema: templateEventSchemaV1,
    rejectionSchema: passthroughSchemaV1<TemplateRejectionV1>(),
    debugCommandSchema: debugCommandSchemaV1,
    debugValidationErrorSchema: passthroughSchemaV1<TemplateDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return createInitialTemplateGameStateV1();
    },
    createQueries(state: TemplateGameStateV1) {
      return Object.freeze({
        coins: state.simulation.inventory.coins,
        stage: state.simulation.stage,
        narrative: state.simulation.narrative,
      });
    },
    projectGameView(queries: TemplateQueriesV1) {
      return Object.freeze({
        coins: queries.coins,
        stage: queries.stage,
      });
    },
  });
}
