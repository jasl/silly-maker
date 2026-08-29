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

import type { VnLastSoundCheckGameStateV1 } from "./state.ts";
import {
  createInitialVnLastSoundCheckGameStateV1,
  createInitialVnLastSoundCheckStageStateV1,
  vnLastSoundCheckGameStateSchemaV1,
  vnLastSoundCheckNarrativeStateSchemaV1,
  vnLastSoundCheckStageStateSchemaV1,
} from "./state.ts";
import type {
  VnLastSoundCheckAttemptV1,
  VnLastSoundCheckCommandV1,
  VnLastSoundCheckDebugValidationErrorV1,
  VnLastSoundCheckEventV1,
  VnLastSoundCheckQueriesV1,
  VnLastSoundCheckRejectionV1,
  VnLastSoundCheckSimulationTypesV1,
  VnLastSoundCheckSnapshotV1,
} from "./kernel.ts";
import { commandSchemaV1, kit, vnLastSoundCheckEventSchemaV1 } from "./kernel.ts";
import {
  createInitialVnLastSoundCheckNarrativeStateV1,
  runVnLastSoundCheckNarrativeUntilInteractionV1,
  vnLastSoundCheckInteractionContextV1,
  vnLastSoundCheckNarrativeAfterResolutionV1,
  vnLastSoundCheckNarrativeAfterTimeTickV1,
  vnLastSoundCheckNarrativeAtBeginV1,
} from "../story/narrative.ts";
import { projectVnLastSoundCheckAudioIntentV1 } from "../content/audio.ts";

/** Narrative and Stage are the only authoritative modules in this product. */

// ---- Public contract re-exports: consumers face this facade only.
export type {
  VnLastSoundCheckAttemptV1,
  VnLastSoundCheckBootstrapInputV1,
  VnLastSoundCheckChoiceOptionViewV1,
  VnLastSoundCheckCommandV1,
  VnLastSoundCheckDebugValidationErrorV1,
  VnLastSoundCheckEventV1,
  VnLastSoundCheckFaultV1,
  VnLastSoundCheckGameViewV1,
  VnLastSoundCheckNarrativeViewV1,
  VnLastSoundCheckQueriesV1,
  VnLastSoundCheckRejectionCodeV1,
  VnLastSoundCheckRejectionV1,
  VnLastSoundCheckSimulationTypesV1,
  VnLastSoundCheckSnapshotV1,
} from "./kernel.ts";
function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return ({ parse: (value: unknown) => value as T });
}

const debugCommandSchemaV1: RuntimeSchemaV1<never> = {
  parse(): never {
    throw new TypeError("vn-last-sound-check debug commands are unsupported");
  },
};

const narrativeModuleV1 = kit.defineStatefulModule({
  id: "vn-last-sound-check.narrative",
  contractRevision: 3,
  state: {
    slot: "simulation.narrative",
    schema: vnLastSoundCheckNarrativeStateSchemaV1,
    initial: () => createInitialVnLastSoundCheckNarrativeStateV1(),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "vn-last-sound-check.narrative_advanced": (_state, event) => event.next,
  },
});

const stageModuleV1 = kit.defineStatefulModule({
  id: "vn-last-sound-check.stage",
  contractRevision: 1,
  state: {
    slot: "simulation.stage",
    schema: vnLastSoundCheckStageStateSchemaV1,
    initial: () => createInitialVnLastSoundCheckStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "vn-last-sound-check.stage_changed": (state, event) => {
      // Handlers validate applicability before emitting, so a rejected fold
      // here is a programming fault, not a player-visible rejection.
      const outcome = reduceAdmittedStageMutations(state, event.mutations);
      if (outcome.kind !== "applied") {
        throw new TypeError("validated vn-last-sound-check stage mutations must apply");
      }
      return outcome.state;
    },
  },
});

const compositionV1 = kit.composeModules([narrativeModuleV1, stageModuleV1]);

type VnLastSoundCheckModulesV1 = typeof compositionV1.modules;

type VnLastSoundCheckCommandExecutorV1 = {
  executeAttempt(
    snapshot: VnLastSoundCheckSnapshotV1,
    command: VnLastSoundCheckCommandV1,
    context: undefined,
  ): VnLastSoundCheckAttemptV1;
};

type VnLastSoundCheckDebugCommandExecutorV1 = {
  validate(
    snapshot: VnLastSoundCheckSnapshotV1,
    command: never,
    context: undefined,
  ): {
    readonly kind: "validation_failed";
    readonly errors: readonly VnLastSoundCheckDebugValidationErrorV1[];
  };
  executeAttempt(snapshot: VnLastSoundCheckSnapshotV1, command: never, context: undefined): never;
};

export type VnLastSoundCheckGameSimulationV1 = GameSimulation<
  VnLastSoundCheckSimulationTypesV1,
  VnLastSoundCheckModulesV1,
  VnLastSoundCheckCommandExecutorV1,
  VnLastSoundCheckDebugCommandExecutorV1
>;

const transactionRunnerV1 = compositionV1.createTransactionRunner({
  eventSchema: vnLastSoundCheckEventSchemaV1,
  createFault: () => ({ code: "vn-last-sound-check.executor_failed" as const }),
});

export function createVnLastSoundCheckGameSimulationV1(): VnLastSoundCheckGameSimulationV1 {
  const commandExecutor: VnLastSoundCheckCommandExecutorV1 = {
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation;

      const emitStage = (
        transaction: { emit(event: VnLastSoundCheckEventV1): void },
        mutations: readonly StageMutation[],
        dispatches: readonly StageCueDispatch[],
      ) => {
        if (mutations.length === 0) return null;
        // Validate applicability at the decision point so an unappliable
        // mutation rejects the command instead of faulting the fold.
        const outcome = reduceAdmittedStageMutations(state.stage, mutations);
        if (outcome.kind === "rejected") return "vn-last-sound-check.stage_rejected" as const;
        transaction.emit({
          kind: "vn-last-sound-check.stage_changed",
          mutations,
          ...(dispatches.length === 0 ? {} : { dispatches }),
        });
        return null;
      };

      if (command.kind === "vn-last-sound-check.scene_reconcile") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          const blocked = emitStage(transaction, command.mutations, []);
          if (blocked !== null) return transaction.reject({ code: blocked });
          return transaction.complete();
        });
      }

      if (command.kind === "vn-last-sound-check.begin_story") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (state.narrative.pending !== null) {
            return transaction.reject({ code: "vn-last-sound-check.narrative_busy" });
          }
          const run = runVnLastSoundCheckNarrativeUntilInteractionV1(
            vnLastSoundCheckNarrativeAtBeginV1(state.narrative),
            state.stage,
          );
          transaction.emit({ kind: "vn-last-sound-check.narrative_advanced", next: run.narrative });
          const blocked = emitStage(transaction, run.stageMutations, run.stageDispatches);
          if (blocked !== null) return transaction.reject({ code: blocked });
          return transaction.complete();
        });
      }

      if (command.kind === "vn-last-sound-check.time_tick") {
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
          const continuation = vnLastSoundCheckNarrativeAfterTimeTickV1(
            state.narrative,
            command.tick,
          );
          if (continuation.kind === "holding") {
            // A partial settlement decrements the authoritative remaining
            // milliseconds without consuming the pending boundary: the
            // same occurrence stays pending and the script does not run.
            transaction.emit({
              kind: "vn-last-sound-check.narrative_advanced",
              next: continuation.narrative,
            });
            return transaction.complete();
          }
          // Expiry consumes the boundary: the script runs to the next
          // interaction inside the same commit.
          const run = runVnLastSoundCheckNarrativeUntilInteractionV1(
            continuation.narrative,
            state.stage,
          );
          transaction.emit({
            kind: "vn-last-sound-check.interaction_resolved",
            definitionId: outcome.hold.definitionId,
            occurrenceId: outcome.hold.occurrenceId,
          });
          transaction.emit({ kind: "vn-last-sound-check.narrative_advanced", next: run.narrative });
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
          vnLastSoundCheckInteractionContextV1(pending),
        );
        if (outcome.kind === "rejected") {
          return transaction.reject({ code: outcome.code });
        }
        if (pending === null) throw new TypeError("accepted resolution without pending");
        const run = runVnLastSoundCheckNarrativeUntilInteractionV1(
          vnLastSoundCheckNarrativeAfterResolutionV1(state.narrative, command.resolution),
          state.stage,
        );
        transaction.emit({
          kind: "vn-last-sound-check.interaction_resolved",
          definitionId: pending.definitionId,
          occurrenceId: pending.occurrenceId,
        });
        transaction.emit({ kind: "vn-last-sound-check.narrative_advanced", next: run.narrative });
        const blocked = emitStage(transaction, run.stageMutations, run.stageDispatches);
        if (blocked !== null) return transaction.reject({ code: blocked });
        return transaction.complete();
      });
    },
  };

  const debugCommandExecutor: VnLastSoundCheckDebugCommandExecutorV1 = {
    validate() {
      return ({
        kind: "validation_failed" as const,
        errors: [
          { code: "vn-last-sound-check.debug_command_unsupported" as const },
        ],
      });
    },
    executeAttempt() {
      throw new TypeError("vn-last-sound-check debug commands are unsupported");
    },
  };

  return defineGameSimulation<VnLastSoundCheckSimulationTypesV1>()({
    contractRevision: 1,
    modules: compositionV1.modules,
    stateSchema: vnLastSoundCheckGameStateSchemaV1,
    commandSchema: commandSchemaV1,
    eventSchema: vnLastSoundCheckEventSchemaV1,
    rejectionSchema: passthroughSchemaV1<VnLastSoundCheckRejectionV1>(),
    debugCommandSchema: debugCommandSchemaV1,
    debugValidationErrorSchema: passthroughSchemaV1<VnLastSoundCheckDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return ({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return createInitialVnLastSoundCheckGameStateV1();
    },
    createQueries(state: VnLastSoundCheckGameStateV1) {
      return ({
        stage: state.simulation.stage,
        narrative: state.simulation.narrative,
      });
    },
    projectGameView(queries: VnLastSoundCheckQueriesV1) {
      return ({
        stage: queries.stage,
        audio: projectVnLastSoundCheckAudioIntentV1(queries),
      });
    },
  });
}
