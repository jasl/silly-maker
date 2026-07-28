// SPDX-License-Identifier: MIT
import type { BootstrapEntropyV1, RuntimeSchemaV1 } from "@sillymaker/base";
import { createTransactionalRngV1 } from "@sillymaker/base";
import type { GameSimulation, InteractionResolution, StageMutation } from "@sillymaker/base/story";
import {
  defineGameSimulation,
  evaluateInteractionResolution,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
  parseStageMutation,
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
  TemplateFactV1,
  TemplateQueriesV1,
  TemplateRejectionV1,
  TemplateSimulationTypesV1,
  TemplateSnapshotV1,
} from "./kernel.ts";
import { commandSchemaV1, kit } from "./kernel.ts";
import {
  inventoryModuleV1,
  templateInventoryReadCapabilityV1,
} from "./features/inventory/module.ts";
import type { TemplateNarrativeStateV1 } from "./narrative.ts";
import {
  createInitialTemplateNarrativeStateV1,
  runTemplateNarrativeUntilInteractionV1,
  templateChoiceOptionsForV1,
  templateInteractionContextV1,
  templateNarrativeAfterResolutionV1,
  templateNarrativeAtBeginV1,
} from "./narrative.ts";

/**
 * The starter simulation: three stateful modules and one command executor.
 *
 * - `template.inventory` is the empty-shell gameplay module (a coin purse).
 * - `template.narrative` owns the script cursor and pending interaction.
 * - `template.stage`     owns the semantic stage state.
 *
 * A command either commits a complete valid result across every touched
 * module or leaves authoritative state unchanged.
 */

// ---- Public contract re-exports: consumers face this facade only.
export type {
  TemplateAttemptV1,
  TemplateBootstrapInputV1,
  TemplateChoiceOptionViewV1,
  TemplateCommandV1,
  TemplateDebugValidationErrorV1,
  TemplateFactV1,
  TemplateFaultV1,
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateQueriesV1,
  TemplateRejectionCodeV1,
  TemplateRejectionV1,
  TemplateSimulationTypesV1,
  TemplateSnapshotV1,
} from "./kernel.ts";
export type {
  TemplateInventoryReadPortV1,
  InventoryOperationV1,
} from "./features/inventory/module.ts";
export { templateInventoryReadCapabilityV1 } from "./features/inventory/module.ts";

type StageOperationV1 = {
  readonly kind: "apply";
  readonly mutations: readonly StageMutation[];
};

type NarrativeOperationV1 =
  | { readonly kind: "begin"; readonly next: TemplateNarrativeStateV1 }
  | {
      readonly kind: "resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
      readonly next: TemplateNarrativeStateV1;
    };

const stageOperationSchemaV1: RuntimeSchemaV1<StageOperationV1> = Object.freeze({
  parse(value: unknown): StageOperationV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).toSorted().join("\0") !== "kind\0mutations"
    ) {
      throw new TypeError("invalid template stage operation");
    }
    const record = value as { readonly kind?: unknown; readonly mutations?: unknown };
    if (record.kind !== "apply" || !Array.isArray(record.mutations)) {
      throw new TypeError("invalid template stage operation kind");
    }
    return Object.freeze({
      kind: "apply" as const,
      mutations: Object.freeze(
        record.mutations.map((mutation, index) =>
          parseStageMutation(mutation, `/mutations/${String(index)}`),
        ),
      ),
    });
  },
});

const narrativeOperationSchemaV1: RuntimeSchemaV1<NarrativeOperationV1> = Object.freeze({
  parse(value: unknown): NarrativeOperationV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid template narrative operation");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "begin") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0next") {
        throw new TypeError("invalid template narrative begin operation");
      }
      return Object.freeze({
        kind,
        next: templateNarrativeStateSchemaV1.parse((value as { readonly next?: unknown }).next),
      });
    }
    if (kind === "resolve") {
      if (
        Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0next\0resolution"
      ) {
        throw new TypeError("invalid template narrative resolve operation");
      }
      const record = value as {
        readonly expectedOccurrenceId?: unknown;
        readonly resolution?: unknown;
        readonly next?: unknown;
      };
      return Object.freeze({
        kind,
        expectedOccurrenceId: parseInteractionOccurrenceId(record.expectedOccurrenceId),
        resolution: parseInteractionResolution(record.resolution),
        next: templateNarrativeStateSchemaV1.parse(record.next),
      });
    }
    throw new TypeError("invalid template narrative operation kind");
  },
});

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
  requires: { inventory: templateInventoryReadCapabilityV1 },
  initializesAfter: ["template.inventory"],
  owner: {
    operationSchema: narrativeOperationSchemaV1,
    propose(state, operation, dependencies) {
      if (operation.kind === "begin") {
        if (state.pending !== null) {
          return Object.freeze({
            kind: "rejected" as const,
            rejection: Object.freeze({ code: "template.narrative_busy" as const }),
          });
        }
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({ payload: operation, facts: Object.freeze([]) }),
        });
      }
      // Queue-front authority: the same shared evaluator that served the
      // action catalog and preview re-checks the expected occurrence and
      // choice availability at dispatch time.
      const outcome = evaluateInteractionResolution(
        state.pending,
        operation.expectedOccurrenceId,
        operation.resolution,
        templateInteractionContextV1(state.pending, dependencies.inventory.coinBalance()),
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
              kind: "template.interaction_resolved" as const,
              definitionId: pending.definitionId,
              occurrenceId: pending.occurrenceId,
            }),
          ]),
        }),
      });
    },
    apply(_state, proposal) {
      return proposal.payload.next;
    },
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
  owner: {
    operationSchema: stageOperationSchemaV1,
    propose(state, operation) {
      const outcome = reduceStageMutations(state, operation.mutations);
      if (outcome.kind === "rejected") {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "template.stage_rejected" as const }),
        });
      }
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "template.stage_changed" as const,
              mutations: operation.mutations.length,
            }),
          ]),
        }),
      });
    },
    apply(state, proposal) {
      const outcome = reduceStageMutations(state, proposal.payload.mutations);
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
  createFault: () => Object.freeze({ code: "template.executor_failed" as const }),
});

export function createTemplateGameSimulationV1(): TemplateGameSimulationV1 {
  const commandExecutor: TemplateCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation;

      const proposeStage = (
        transaction: { propose(module: typeof stageModuleV1, operation: StageOperationV1): void },
        mutations: readonly StageMutation[],
      ) => {
        if (mutations.length > 0) {
          transaction.propose(stageModuleV1, { kind: "apply", mutations });
        }
      };

      if (command.kind === "template.earn_coin") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          transaction.propose(inventoryModuleV1, { kind: "earn", amount: 1 });
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
          transaction.propose(narrativeModuleV1, { kind: "begin", next: run.narrative });
          proposeStage(transaction, run.stageMutations);
          return transaction.complete();
        });
      }

      return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // Pre-check with the exact evaluator the narrative owner re-runs at
        // propose time, so invalid resolutions reject before continuation
        // work happens.
        const outcome = evaluateInteractionResolution(
          state.narrative.pending,
          command.expectedOccurrenceId,
          command.resolution,
          templateInteractionContextV1(state.narrative.pending, state.inventory.coins),
        );
        if (outcome.kind === "rejected") {
          return transaction.reject({ code: outcome.code });
        }
        const run = runTemplateNarrativeUntilInteractionV1(
          templateNarrativeAfterResolutionV1(state.narrative, command.resolution),
          state.stage,
        );
        transaction.propose(narrativeModuleV1, {
          kind: "resolve",
          expectedOccurrenceId: command.expectedOccurrenceId,
          resolution: command.resolution,
          next: run.narrative,
        });
        // A choice may carry a declared coin cost: the narrative
        // continuation and the spend commit in one atomic command.
        const resolution = command.resolution;
        if (resolution.kind === "choose" && state.narrative.pending !== null) {
          const option = templateChoiceOptionsForV1(state.narrative.pending.definitionId).find(
            (candidate) => candidate.choiceId === resolution.choiceId,
          );
          if (option !== undefined && option.consumesCoins > 0) {
            transaction.propose(inventoryModuleV1, {
              kind: "spend",
              amount: option.consumesCoins,
            });
          }
        }
        proposeStage(transaction, run.stageMutations);
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
    factSchema: passthroughSchemaV1<TemplateFactV1>(),
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
