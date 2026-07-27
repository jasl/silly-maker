// SPDX-License-Identifier: MIT
import type {
  BootstrapEntropyV1,
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import { createTransactionalRngV1, parseNonNegativeSafeInteger } from "@sillymaker/base";
import type {
  GameSimulation,
  InteractionRejectionCode,
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
  StageMutation,
} from "@sillymaker/base/story";
import {
  createGameAuthoringKit,
  defineGameSimulation,
  evaluateInteractionResolution,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
  parseStageMutation,
  reduceStageMutations,
} from "@sillymaker/base/story";

import type { TemplateGameStateV1, TemplateInventoryStateV1 } from "./state.js";
import {
  createInitialTemplateGameStateV1,
  createInitialTemplateStageStateV1,
  templateGameStateSchemaV1,
  templateInventoryStateSchemaV1,
  templateNarrativeStateSchemaV1,
  templateStageStateSchemaV1,
} from "./state.js";
import type { TemplateNarrativeStateV1 } from "./narrative.js";
import {
  createInitialTemplateNarrativeStateV1,
  runTemplateNarrativeUntilInteractionV1,
  templateChoiceOptionsForV1,
  templateInteractionContextV1,
  templateNarrativeAfterResolutionV1,
  templateNarrativeAtBeginV1,
} from "./narrative.js";

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

export type TemplateCommandV1 =
  | { readonly kind: "template.begin_story" }
  | { readonly kind: "template.earn_coin" }
  | {
      readonly kind: "template.narrative_resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
    };

export type TemplateFactV1 =
  | { readonly kind: "template.coins_changed"; readonly delta: number; readonly balance: number }
  | { readonly kind: "template.stage_changed"; readonly mutations: number }
  | {
      readonly kind: "template.interaction_resolved";
      readonly definitionId: string;
      readonly occurrenceId: string;
    };

export type TemplateRejectionCodeV1 =
  | "template.narrative_busy"
  | "template.insufficient_coins"
  | "template.stage_rejected"
  | InteractionRejectionCode;

export interface TemplateRejectionV1 {
  readonly code: TemplateRejectionCodeV1;
}

export interface TemplateFaultV1 {
  readonly code: "template.executor_failed";
}

export interface TemplateDebugValidationErrorV1 {
  readonly code: "template.debug_command_unsupported";
}

export interface TemplateQueriesV1 {
  readonly coins: number;
  readonly stage: SemanticStageState;
  readonly narrative: TemplateNarrativeStateV1;
}

export interface TemplateChoiceOptionViewV1 {
  readonly choiceId: string;
  readonly textId: string;
  readonly enabled: boolean;
  readonly blockedBy: "template.insufficient_coins" | null;
}

/** The player-safe narrative channel published to UI and agents. */
export interface TemplateNarrativeViewV1 {
  readonly phase: TemplateNarrativeStateV1["phase"];
  readonly pending: PendingInteraction | null;
  readonly choiceOptions: readonly TemplateChoiceOptionViewV1[] | null;
  readonly flags: readonly string[];
  readonly history: NarrativeHistory;
}

export interface TemplateGameViewV1 {
  readonly coins: number;
  /** The semantic stage target: plain saveable data, observable headless. */
  readonly stage: SemanticStageState;
}

export interface TemplateBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface TemplateSimulationTypesV1 extends GameSimulationTypeMapV1<
  TemplateBootstrapInputV1,
  TemplateGameStateV1,
  RngStateV1
> {
  readonly snapshot: GameSnapshotEnvelopeV1<TemplateGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: TemplateCommandV1;
  readonly fact: TemplateFactV1;
  readonly rejection: TemplateRejectionV1;
  readonly fault: TemplateFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: TemplateDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: TemplateQueriesV1;
  readonly viewModel: TemplateGameViewV1;
}

export type TemplateSnapshotV1 = TemplateSimulationTypesV1["snapshot"];
export type TemplateAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  TemplateSnapshotV1,
  TemplateFactV1,
  TemplateRejectionV1,
  TemplateFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type InventoryOperationV1 =
  | { readonly kind: "earn"; readonly amount: number }
  | { readonly kind: "spend"; readonly amount: number };

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

const commandSchemaV1: RuntimeSchemaV1<TemplateCommandV1> = Object.freeze({
  parse(value: unknown): TemplateCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid template command");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "template.narrative_resolve") {
      if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
        throw new TypeError("invalid template narrative resolve command");
      }
      const record = value as {
        readonly expectedOccurrenceId?: unknown;
        readonly resolution?: unknown;
      };
      return Object.freeze({
        kind,
        expectedOccurrenceId: parseInteractionOccurrenceId(record.expectedOccurrenceId),
        resolution: parseInteractionResolution(record.resolution),
      });
    }
    if (Object.keys(value).join("\0") !== "kind") {
      throw new TypeError("invalid template command");
    }
    if (kind !== "template.begin_story" && kind !== "template.earn_coin") {
      throw new TypeError("invalid template command kind");
    }
    return Object.freeze({ kind });
  },
});

const inventoryOperationSchemaV1: RuntimeSchemaV1<InventoryOperationV1> = Object.freeze({
  parse(value: unknown): InventoryOperationV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).toSorted().join("\0") !== "amount\0kind"
    ) {
      throw new TypeError("invalid template inventory operation");
    }
    const record = value as { readonly kind?: unknown; readonly amount?: unknown };
    if (record.kind !== "earn" && record.kind !== "spend") {
      throw new TypeError("invalid template inventory operation kind");
    }
    const amount = parseNonNegativeSafeInteger(record.amount);
    if (amount < 1) throw new TypeError("template inventory amount must be positive");
    return Object.freeze({ kind: record.kind, amount });
  },
});

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

const kit = createGameAuthoringKit<TemplateSimulationTypesV1>();

/** The read-only capability the narrative module uses to price choices. */
export interface TemplateInventoryReadPortV1 {
  coinBalance(): number;
}

export const templateInventoryReadCapabilityV1 = kit.defineCapability<TemplateInventoryReadPortV1>(
  "capability.template.inventory.read",
);

/**
 * The empty-shell gameplay module. Its owner enforces the one inventory
 * rule (no overdraft); cross-module commands consume it through the
 * transaction so a choice's coin cost and the narrative continuation
 * commit atomically.
 */
const inventoryModuleV1 = kit.defineStatefulModule({
  id: "template.inventory",
  contractRevision: 1,
  state: {
    slot: "simulation.inventory",
    schema: templateInventoryStateSchemaV1,
    initial: () => Object.freeze({ coins: 0 }),
  },
  commandSchema: commandSchemaV1,
  provides: (provide) => [
    provide(templateInventoryReadCapabilityV1, ({ readOwnState }) => ({
      coinBalance: () => readOwnState().coins,
    })),
  ],
  owner: {
    operationSchema: inventoryOperationSchemaV1,
    propose(state, operation) {
      if (operation.kind === "spend" && state.coins < operation.amount) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "template.insufficient_coins" as const }),
        });
      }
      const balance =
        operation.kind === "earn" ? state.coins + operation.amount : state.coins - operation.amount;
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "template.coins_changed" as const,
              delta: operation.kind === "earn" ? operation.amount : -operation.amount,
              balance,
            }),
          ]),
        }),
      });
    },
    apply(state: TemplateInventoryStateV1, proposal) {
      const operation = proposal.payload;
      return Object.freeze({
        coins:
          operation.kind === "earn"
            ? state.coins + operation.amount
            : state.coins - operation.amount,
      });
    },
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
  contractRevision: 1,
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
