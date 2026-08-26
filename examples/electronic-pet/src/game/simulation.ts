// SPDX-License-Identifier: MIT
import type { BootstrapEntropyV1, RuntimeSchemaV1 } from "@sillymaker/base";
import { createTransactionalRngV1 } from "@sillymaker/base";
import type { GameSimulation } from "@sillymaker/base/story";
import { defineGameSimulation } from "@sillymaker/base/story";

import type {
  ElectronicPetAttemptV1,
  ElectronicPetCommandV1,
  ElectronicPetDebugValidationErrorV1,
  ElectronicPetRejectionV1,
  ElectronicPetSimulationTypesV1,
  ElectronicPetSnapshotV1,
} from "./kernel.ts";
import {
  electronicPetCommandSchemaV1,
  electronicPetEventSchemaV1,
  electronicPetKitV1,
} from "./kernel.ts";
import {
  applyElectronicPetCommandV1,
  evaluateElectronicPetCommandV1,
  projectElectronicPetPlayerViewV1,
} from "./rules.ts";
import {
  createInitialElectronicPetGameStateV1,
  createInitialElectronicPetStateV1,
  electronicPetGameStateSchemaV1,
  electronicPetStateSchemaV1,
} from "./state.ts";

const petModuleV1 = electronicPetKitV1.defineStatefulModule({
  id: "pet.lifecycle",
  contractRevision: 2,
  state: {
    slot: "simulation.pet",
    schema: electronicPetStateSchemaV1,
    initial: createInitialElectronicPetStateV1,
  },
  commandSchema: electronicPetCommandSchemaV1,
  reducers: { "pet.state_set": (_state, event) => event.next },
});
const compositionV1 = electronicPetKitV1.composeModules([petModuleV1]);
type ElectronicPetModulesV1 = typeof compositionV1.modules;
type ElectronicPetCommandExecutorV1 = {
  executeAttempt(
    snapshot: ElectronicPetSnapshotV1,
    command: ElectronicPetCommandV1,
    context: undefined,
  ): ElectronicPetAttemptV1;
};
type ElectronicPetDebugCommandExecutorV1 = {
  validate(
    snapshot: ElectronicPetSnapshotV1,
    command: never,
    context: undefined,
  ): {
    readonly kind: "validation_failed";
    readonly errors: readonly ElectronicPetDebugValidationErrorV1[];
  };
  executeAttempt(snapshot: ElectronicPetSnapshotV1, command: never, context: undefined): never;
};
export type ElectronicPetGameSimulationV1 = GameSimulation<
  ElectronicPetSimulationTypesV1,
  ElectronicPetModulesV1,
  ElectronicPetCommandExecutorV1,
  ElectronicPetDebugCommandExecutorV1
>;

function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return { parse: (value: unknown) => value as T };
}
const debugCommandSchemaV1: RuntimeSchemaV1<never> = {
  parse(): never {
    throw new TypeError("electronic pet debug commands are unsupported");
  },
};
const transactionRunnerV1 = compositionV1.createTransactionRunner({
  eventSchema: electronicPetEventSchemaV1,
  createFault: () => ({ code: "pet.executor_failed" as const }),
});

export function createElectronicPetGameSimulationV1(): ElectronicPetGameSimulationV1 {
  const commandExecutor: ElectronicPetCommandExecutorV1 = {
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation.pet;
      return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        const evaluation = evaluateElectronicPetCommandV1(state, command);
        if (evaluation.kind === "blocked") return transaction.reject({ code: evaluation.code });
        const next = applyElectronicPetCommandV1(state, command, evaluation.outcome, rng);
        transaction.emit({ kind: "pet.state_set", next });
        if (evaluation.outcome !== null) {
          const actionId = command.kind === "pet.contact_complete"
            ? command.targetInteractionId
            : command.kind === "pet.play_complete"
            ? command.toyId
            : command.kind === "pet.hand_offer"
            ? "contact.offer_hand"
            : command.kind === "pet.quiet_presence"
            ? "care.quiet_presence"
            : command.kind === "pet.food_place"
            ? "care.place_food"
            : command.kind === "pet.home_prepare"
            ? `care.prepare.${command.resource}`
            : command.kind;
          transaction.emit({
            kind: "pet.reaction_presented",
            actionId,
            outcome: evaluation.outcome,
            reactionId: `reaction.${evaluation.outcome}`,
          });
        }
        if (next.companion.activity.occurrence !== state.companion.activity.occurrence) {
          transaction.emit({
            kind: "pet.activity_selected",
            activityId: next.companion.activity.activityId,
            poseId: next.companion.activity.poseId,
            reason: next.companion.activity.reason,
          });
        }
        if (
          command.kind === "pet.time_settle" &&
          next.home.returnSummary !== state.home.returnSummary && next.home.returnSummary !== null
        ) {
          transaction.emit({ kind: "pet.offline_settled", ...next.home.returnSummary });
        }
        return transaction.complete();
      });
    },
  };
  const debugCommandExecutor: ElectronicPetDebugCommandExecutorV1 = {
    validate: () => ({
      kind: "validation_failed",
      errors: [{ code: "pet.debug_command_unsupported" }],
    }),
    executeAttempt(): never {
      throw new TypeError("electronic pet debug commands are unsupported");
    },
  };
  return defineGameSimulation<ElectronicPetSimulationTypesV1>()({
    contractRevision: 1,
    modules: compositionV1.modules,
    stateSchema: electronicPetGameStateSchemaV1,
    commandSchema: electronicPetCommandSchemaV1,
    eventSchema: electronicPetEventSchemaV1,
    rejectionSchema: passthroughSchemaV1<ElectronicPetRejectionV1>(),
    debugCommandSchema: debugCommandSchemaV1,
    debugValidationErrorSchema: passthroughSchemaV1<ElectronicPetDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return { rngSeed: entropy.nextNonZeroUint32() };
    },
    createInitialState: createInitialElectronicPetGameStateV1,
    createQueries(state) {
      const pet = state.simulation.pet;
      return { state: pet, player: projectElectronicPetPlayerViewV1(pet) };
    },
    projectGameView: (queries) => queries.player,
  });
}
