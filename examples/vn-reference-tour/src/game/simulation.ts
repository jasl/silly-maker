// SPDX-License-Identifier: MIT
import type { BootstrapEntropyV1, RuntimeSchemaV1 } from "@sillymaker/base";
import { createTransactionalRngV1 } from "@sillymaker/base";
import type { GameSimulation, StageCueDispatch, StageMutation } from "@sillymaker/base/story";
import {
  defineGameSimulation,
  evaluateInteractionResolution,
  evaluateTimeTick,
  reduceAdmittedStageMutations,
} from "@sillymaker/base/story";

import type { VnReferenceTourGameStateV1 } from "./state.ts";
import {
  createInitialVnReferenceTourGameStateV1,
  createInitialVnReferenceTourStageStateV1,
  vnReferenceTourGameStateSchemaV1,
  vnReferenceTourNarrativeStateSchemaV1,
  vnReferenceTourStageStateSchemaV1,
} from "./state.ts";
import type {
  VnReferenceTourAttemptV1,
  VnReferenceTourCommandV1,
  VnReferenceTourDebugValidationErrorV1,
  VnReferenceTourEventV1,
  VnReferenceTourQueriesV1,
  VnReferenceTourRejectionV1,
  VnReferenceTourSimulationTypesV1,
  VnReferenceTourSnapshotV1,
} from "./kernel.ts";
import { commandSchemaV1, kit, vnReferenceTourEventSchemaV1 } from "./kernel.ts";
import {
  createInitialVnReferenceTourNarrativeStateV1,
  runVnReferenceTourNarrativeUntilInteractionV1,
  vnReferenceTourInteractionContextV1,
  vnReferenceTourNarrativeAfterResolutionV1,
  vnReferenceTourNarrativeAfterTimeTickV1,
  vnReferenceTourNarrativeAtBeginV1,
} from "../story/narrative.ts";
import { projectVnReferenceTourAudioIntentV1 } from "../content/audio.ts";

/** Narrative and Stage are the only authoritative modules in this product. */

// ---- Public contract re-exports: consumers face this facade only.
export type {
  VnReferenceTourAttemptV1,
  VnReferenceTourBootstrapInputV1,
  VnReferenceTourChoiceOptionViewV1,
  VnReferenceTourCommandV1,
  VnReferenceTourDebugValidationErrorV1,
  VnReferenceTourEventV1,
  VnReferenceTourFaultV1,
  VnReferenceTourGameViewV1,
  VnReferenceTourNarrativeViewV1,
  VnReferenceTourQueriesV1,
  VnReferenceTourRejectionCodeV1,
  VnReferenceTourRejectionV1,
  VnReferenceTourSimulationTypesV1,
  VnReferenceTourSnapshotV1,
} from "./kernel.ts";
function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return ({ parse: (value: unknown) => value as T });
}

const debugCommandSchemaV1: RuntimeSchemaV1<never> = {
  parse(): never {
    throw new TypeError("vn-reference-tour debug commands are unsupported");
  },
};

const narrativeModuleV1 = kit.defineStatefulModule({
  id: "vn-reference-tour.narrative",
  contractRevision: 2,
  state: {
    slot: "simulation.narrative",
    schema: vnReferenceTourNarrativeStateSchemaV1,
    initial: () => createInitialVnReferenceTourNarrativeStateV1(),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "vn-reference-tour.narrative_advanced": (_state, event) => event.next,
  },
});

const stageModuleV1 = kit.defineStatefulModule({
  id: "vn-reference-tour.stage",
  contractRevision: 1,
  state: {
    slot: "simulation.stage",
    schema: vnReferenceTourStageStateSchemaV1,
    initial: () => createInitialVnReferenceTourStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "vn-reference-tour.stage_changed": (state, event) => {
      // Handlers validate applicability before emitting, so a rejected fold
      // here is a programming fault, not a player-visible rejection.
      const outcome = reduceAdmittedStageMutations(state, event.mutations);
      if (outcome.kind !== "applied") {
        throw new TypeError("validated vn-reference-tour stage mutations must apply");
      }
      return outcome.state;
    },
  },
});

const compositionV1 = kit.composeModules([narrativeModuleV1, stageModuleV1]);

type VnReferenceTourModulesV1 = typeof compositionV1.modules;

type VnReferenceTourCommandExecutorV1 = {
  executeAttempt(
    snapshot: VnReferenceTourSnapshotV1,
    command: VnReferenceTourCommandV1,
    context: undefined,
  ): VnReferenceTourAttemptV1;
};

type VnReferenceTourDebugCommandExecutorV1 = {
  validate(
    snapshot: VnReferenceTourSnapshotV1,
    command: never,
    context: undefined,
  ): {
    readonly kind: "validation_failed";
    readonly errors: readonly VnReferenceTourDebugValidationErrorV1[];
  };
  executeAttempt(snapshot: VnReferenceTourSnapshotV1, command: never, context: undefined): never;
};

export type VnReferenceTourGameSimulationV1 = GameSimulation<
  VnReferenceTourSimulationTypesV1,
  VnReferenceTourModulesV1,
  VnReferenceTourCommandExecutorV1,
  VnReferenceTourDebugCommandExecutorV1
>;

const transactionRunnerV1 = compositionV1.createTransactionRunner({
  eventSchema: vnReferenceTourEventSchemaV1,
  createFault: () => ({ code: "vn-reference-tour.executor_failed" as const }),
});

export function createVnReferenceTourGameSimulationV1(): VnReferenceTourGameSimulationV1 {
  const commandExecutor: VnReferenceTourCommandExecutorV1 = {
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation;

      const emitStage = (
        transaction: { emit(event: VnReferenceTourEventV1): void },
        mutations: readonly StageMutation[],
        dispatches: readonly StageCueDispatch[],
      ) => {
        if (mutations.length === 0) return null;
        // Validate applicability at the decision point so an unappliable
        // mutation rejects the command instead of faulting the fold.
        const outcome = reduceAdmittedStageMutations(state.stage, mutations);
        if (outcome.kind === "rejected") return "vn-reference-tour.stage_rejected" as const;
        transaction.emit({
          kind: "vn-reference-tour.stage_changed",
          mutations,
          ...(dispatches.length === 0 ? {} : { dispatches }),
        });
        return null;
      };

      if (command.kind === "vn-reference-tour.scene_reconcile") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          const blocked = emitStage(transaction, command.mutations, []);
          if (blocked !== null) return transaction.reject({ code: blocked });
          return transaction.complete();
        });
      }

      if (command.kind === "vn-reference-tour.begin_story") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (state.narrative.pending !== null) {
            return transaction.reject({ code: "vn-reference-tour.narrative_busy" });
          }
          const run = runVnReferenceTourNarrativeUntilInteractionV1(
            vnReferenceTourNarrativeAtBeginV1(state.narrative),
            state.stage,
          );
          transaction.emit({ kind: "vn-reference-tour.narrative_advanced", next: run.narrative });
          const blocked = emitStage(transaction, run.stageMutations, run.stageDispatches);
          if (blocked !== null) return transaction.reject({ code: blocked });
          return transaction.complete();
        });
      }

      if (command.kind === "vn-reference-tour.time_tick") {
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
          const continuation = vnReferenceTourNarrativeAfterTimeTickV1(
            state.narrative,
            command.tick,
          );
          if (continuation.kind === "holding") {
            // A partial settlement decrements the authoritative remaining
            // milliseconds without consuming the pending boundary: the
            // same occurrence stays pending and the script does not run.
            transaction.emit({
              kind: "vn-reference-tour.narrative_advanced",
              next: continuation.narrative,
            });
            return transaction.complete();
          }
          // Expiry consumes the boundary: the script runs to the next
          // interaction inside the same commit.
          const run = runVnReferenceTourNarrativeUntilInteractionV1(
            continuation.narrative,
            state.stage,
          );
          transaction.emit({
            kind: "vn-reference-tour.interaction_resolved",
            definitionId: outcome.hold.definitionId,
            occurrenceId: outcome.hold.occurrenceId,
          });
          transaction.emit({ kind: "vn-reference-tour.narrative_advanced", next: run.narrative });
          const blocked = emitStage(transaction, run.stageMutations, run.stageDispatches);
          if (blocked !== null) return transaction.reject({ code: blocked });
          return transaction.complete();
        });
      }

      return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // Preview and queue-front dispatch share the same occurrence and
        // choice evaluator; every declared material option is available.
        const pending = state.narrative.pending;
        const outcome = evaluateInteractionResolution(
          pending,
          command.expectedOccurrenceId,
          command.resolution,
          vnReferenceTourInteractionContextV1(pending),
        );
        if (outcome.kind === "rejected") {
          return transaction.reject({ code: outcome.code });
        }
        if (pending === null) throw new TypeError("accepted resolution without pending");
        const run = runVnReferenceTourNarrativeUntilInteractionV1(
          vnReferenceTourNarrativeAfterResolutionV1(state.narrative, command.resolution),
          state.stage,
        );
        transaction.emit({
          kind: "vn-reference-tour.interaction_resolved",
          definitionId: pending.definitionId,
          occurrenceId: pending.occurrenceId,
        });
        transaction.emit({ kind: "vn-reference-tour.narrative_advanced", next: run.narrative });
        const blocked = emitStage(transaction, run.stageMutations, run.stageDispatches);
        if (blocked !== null) return transaction.reject({ code: blocked });
        return transaction.complete();
      });
    },
  };

  const debugCommandExecutor: VnReferenceTourDebugCommandExecutorV1 = {
    validate() {
      return ({
        kind: "validation_failed" as const,
        errors: [
          { code: "vn-reference-tour.debug_command_unsupported" as const },
        ],
      });
    },
    executeAttempt() {
      throw new TypeError("vn-reference-tour debug commands are unsupported");
    },
  };

  return defineGameSimulation<VnReferenceTourSimulationTypesV1>()({
    contractRevision: 1,
    modules: compositionV1.modules,
    stateSchema: vnReferenceTourGameStateSchemaV1,
    commandSchema: commandSchemaV1,
    eventSchema: vnReferenceTourEventSchemaV1,
    rejectionSchema: passthroughSchemaV1<VnReferenceTourRejectionV1>(),
    debugCommandSchema: debugCommandSchemaV1,
    debugValidationErrorSchema: passthroughSchemaV1<VnReferenceTourDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return ({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return createInitialVnReferenceTourGameStateV1();
    },
    createQueries(state: VnReferenceTourGameStateV1) {
      return ({
        stage: state.simulation.stage,
        narrative: state.simulation.narrative,
      });
    },
    projectGameView(queries: VnReferenceTourQueriesV1) {
      return ({
        stage: queries.stage,
        audio: projectVnReferenceTourAudioIntentV1(queries),
      });
    },
  });
}
