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

import type { BookshopGameStateV1, BookshopInventoryStateV1 } from "./state.ts";
import {
  createInitialBookshopGameStateV1,
  createInitialBookshopStageStateV1,
  bookshopGameStateSchemaV1,
  bookshopInventoryStateSchemaV1,
  bookshopNarrativeStateSchemaV1,
  bookshopStageStateSchemaV1,
} from "./state.ts";
import type { BookshopNarrativeStateV1 } from "./narrative.ts";
import {
  createInitialBookshopNarrativeStateV1,
  runBookshopNarrativeUntilInteractionV1,
  bookshopChoiceOptionsForV1,
  bookshopInteractionContextV1,
  bookshopNarrativeAfterResolutionV1,
  bookshopNarrativeAtBeginV1,
} from "./narrative.ts";

/**
 * The starter simulation: three stateful modules and one command executor.
 *
 * - `bookshop.inventory` is the empty-shell gameplay module (a coin purse).
 * - `bookshop.narrative` owns the script cursor and pending interaction.
 * - `bookshop.stage`     owns the semantic stage state.
 *
 * A command either commits a complete valid result across every touched
 * module or leaves authoritative state unchanged.
 */

export type BookshopCommandV1 =
  | { readonly kind: "bookshop.begin_story" }
  | { readonly kind: "bookshop.earn_coin" }
  | {
      readonly kind: "bookshop.narrative_resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
    };

export type BookshopFactV1 =
  | { readonly kind: "bookshop.coins_changed"; readonly delta: number; readonly balance: number }
  | { readonly kind: "bookshop.stage_changed"; readonly mutations: number }
  | {
      readonly kind: "bookshop.interaction_resolved";
      readonly definitionId: string;
      readonly occurrenceId: string;
    };

export type BookshopRejectionCodeV1 =
  | "bookshop.narrative_busy"
  | "bookshop.insufficient_coins"
  | "bookshop.stage_rejected"
  | InteractionRejectionCode;

export interface BookshopRejectionV1 {
  readonly code: BookshopRejectionCodeV1;
}

export interface BookshopFaultV1 {
  readonly code: "bookshop.executor_failed";
}

export interface BookshopDebugValidationErrorV1 {
  readonly code: "bookshop.debug_command_unsupported";
}

export interface BookshopQueriesV1 {
  readonly coins: number;
  readonly stage: SemanticStageState;
  readonly narrative: BookshopNarrativeStateV1;
}

export interface BookshopChoiceOptionViewV1 {
  readonly choiceId: string;
  readonly textId: string;
  readonly enabled: boolean;
  readonly blockedBy: "bookshop.insufficient_coins" | null;
}

/** The player-safe narrative channel published to UI and agents. */
export interface BookshopNarrativeViewV1 {
  readonly phase: BookshopNarrativeStateV1["phase"];
  readonly pending: PendingInteraction | null;
  readonly choiceOptions: readonly BookshopChoiceOptionViewV1[] | null;
  readonly flags: readonly string[];
  readonly history: NarrativeHistory;
}

export interface BookshopGameViewV1 {
  readonly coins: number;
  /** The semantic stage target: plain saveable data, observable headless. */
  readonly stage: SemanticStageState;
}

export interface BookshopBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface BookshopSimulationTypesV1 extends GameSimulationTypeMapV1<
  BookshopBootstrapInputV1,
  BookshopGameStateV1,
  RngStateV1
> {
  readonly snapshot: GameSnapshotEnvelopeV1<BookshopGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: BookshopCommandV1;
  readonly fact: BookshopFactV1;
  readonly rejection: BookshopRejectionV1;
  readonly fault: BookshopFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: BookshopDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: BookshopQueriesV1;
  readonly viewModel: BookshopGameViewV1;
}

export type BookshopSnapshotV1 = BookshopSimulationTypesV1["snapshot"];
export type BookshopAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  BookshopSnapshotV1,
  BookshopFactV1,
  BookshopRejectionV1,
  BookshopFaultV1,
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
  | { readonly kind: "begin"; readonly next: BookshopNarrativeStateV1 }
  | {
      readonly kind: "resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
      readonly next: BookshopNarrativeStateV1;
    };

const commandSchemaV1: RuntimeSchemaV1<BookshopCommandV1> = Object.freeze({
  parse(value: unknown): BookshopCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid bookshop command");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "bookshop.narrative_resolve") {
      if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
        throw new TypeError("invalid bookshop narrative resolve command");
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
      throw new TypeError("invalid bookshop command");
    }
    if (kind !== "bookshop.begin_story" && kind !== "bookshop.earn_coin") {
      throw new TypeError("invalid bookshop command kind");
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
      throw new TypeError("invalid bookshop inventory operation");
    }
    const record = value as { readonly kind?: unknown; readonly amount?: unknown };
    if (record.kind !== "earn" && record.kind !== "spend") {
      throw new TypeError("invalid bookshop inventory operation kind");
    }
    const amount = parseNonNegativeSafeInteger(record.amount);
    if (amount < 1) throw new TypeError("bookshop inventory amount must be positive");
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
      throw new TypeError("invalid bookshop stage operation");
    }
    const record = value as { readonly kind?: unknown; readonly mutations?: unknown };
    if (record.kind !== "apply" || !Array.isArray(record.mutations)) {
      throw new TypeError("invalid bookshop stage operation kind");
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
      throw new TypeError("invalid bookshop narrative operation");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "begin") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0next") {
        throw new TypeError("invalid bookshop narrative begin operation");
      }
      return Object.freeze({
        kind,
        next: bookshopNarrativeStateSchemaV1.parse((value as { readonly next?: unknown }).next),
      });
    }
    if (kind === "resolve") {
      if (
        Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0next\0resolution"
      ) {
        throw new TypeError("invalid bookshop narrative resolve operation");
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
        next: bookshopNarrativeStateSchemaV1.parse(record.next),
      });
    }
    throw new TypeError("invalid bookshop narrative operation kind");
  },
});

function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

const debugCommandSchemaV1: RuntimeSchemaV1<never> = Object.freeze({
  parse(): never {
    throw new TypeError("bookshop debug commands are unsupported");
  },
});

const kit = createGameAuthoringKit<BookshopSimulationTypesV1>();

/** The read-only capability the narrative module uses to price choices. */
export interface BookshopInventoryReadPortV1 {
  coinBalance(): number;
}

export const bookshopInventoryReadCapabilityV1 = kit.defineCapability<BookshopInventoryReadPortV1>(
  "capability.bookshop.inventory.read",
);

/**
 * The empty-shell gameplay module. Its owner enforces the one inventory
 * rule (no overdraft); cross-module commands consume it through the
 * transaction so a choice's coin cost and the narrative continuation
 * commit atomically.
 */
const inventoryModuleV1 = kit.defineStatefulModule({
  id: "bookshop.inventory",
  contractRevision: 1,
  state: {
    slot: "simulation.inventory",
    schema: bookshopInventoryStateSchemaV1,
    initial: () => Object.freeze({ coins: 0 }),
  },
  commandSchema: commandSchemaV1,
  provides: (provide) => [
    provide(bookshopInventoryReadCapabilityV1, ({ readOwnState }) => ({
      coinBalance: () => readOwnState().coins,
    })),
  ],
  owner: {
    operationSchema: inventoryOperationSchemaV1,
    propose(state, operation) {
      if (operation.kind === "spend" && state.coins < operation.amount) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "bookshop.insufficient_coins" as const }),
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
              kind: "bookshop.coins_changed" as const,
              delta: operation.kind === "earn" ? operation.amount : -operation.amount,
              balance,
            }),
          ]),
        }),
      });
    },
    apply(state: BookshopInventoryStateV1, proposal) {
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
  id: "bookshop.narrative",
  contractRevision: 1,
  state: {
    slot: "simulation.narrative",
    schema: bookshopNarrativeStateSchemaV1,
    initial: () => createInitialBookshopNarrativeStateV1(),
  },
  commandSchema: commandSchemaV1,
  requires: { inventory: bookshopInventoryReadCapabilityV1 },
  initializesAfter: ["bookshop.inventory"],
  owner: {
    operationSchema: narrativeOperationSchemaV1,
    propose(state, operation, dependencies) {
      if (operation.kind === "begin") {
        if (state.pending !== null) {
          return Object.freeze({
            kind: "rejected" as const,
            rejection: Object.freeze({ code: "bookshop.narrative_busy" as const }),
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
        bookshopInteractionContextV1(state.pending, dependencies.inventory.coinBalance()),
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
              kind: "bookshop.interaction_resolved" as const,
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
  id: "bookshop.stage",
  contractRevision: 1,
  state: {
    slot: "simulation.stage",
    schema: bookshopStageStateSchemaV1,
    initial: () => createInitialBookshopStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: stageOperationSchemaV1,
    propose(state, operation) {
      const outcome = reduceStageMutations(state, operation.mutations);
      if (outcome.kind === "rejected") {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "bookshop.stage_rejected" as const }),
        });
      }
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "bookshop.stage_changed" as const,
              mutations: operation.mutations.length,
            }),
          ]),
        }),
      });
    },
    apply(state, proposal) {
      const outcome = reduceStageMutations(state, proposal.payload.mutations);
      if (outcome.kind !== "applied") {
        throw new TypeError("validated bookshop stage mutations must apply");
      }
      return outcome.state;
    },
  },
});

const compositionV1 = kit.composeModules([inventoryModuleV1, narrativeModuleV1, stageModuleV1]);

type BookshopModulesV1 = typeof compositionV1.modules;

type BookshopCommandExecutorV1 = {
  executeAttempt(
    snapshot: BookshopSnapshotV1,
    command: BookshopCommandV1,
    context: undefined,
  ): BookshopAttemptV1;
};

type BookshopDebugCommandExecutorV1 = {
  validate(
    snapshot: BookshopSnapshotV1,
    command: never,
    context: undefined,
  ): {
    readonly kind: "validation_failed";
    readonly errors: readonly BookshopDebugValidationErrorV1[];
  };
  executeAttempt(snapshot: BookshopSnapshotV1, command: never, context: undefined): never;
};

export type BookshopGameSimulationV1 = GameSimulation<
  BookshopSimulationTypesV1,
  BookshopModulesV1,
  BookshopCommandExecutorV1,
  BookshopDebugCommandExecutorV1
>;

const transactionRunnerV1 = compositionV1.createTransactionRunner({
  stateSchema: bookshopGameStateSchemaV1,
  createFault: () => Object.freeze({ code: "bookshop.executor_failed" as const }),
});

export function createBookshopGameSimulationV1(): BookshopGameSimulationV1 {
  const commandExecutor: BookshopCommandExecutorV1 = Object.freeze({
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

      if (command.kind === "bookshop.earn_coin") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          transaction.propose(inventoryModuleV1, { kind: "earn", amount: 1 });
          return transaction.complete();
        });
      }

      if (command.kind === "bookshop.begin_story") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (state.narrative.pending !== null) {
            return transaction.reject({ code: "bookshop.narrative_busy" });
          }
          const run = runBookshopNarrativeUntilInteractionV1(
            bookshopNarrativeAtBeginV1(state.narrative),
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
          bookshopInteractionContextV1(state.narrative.pending, state.inventory.coins),
        );
        if (outcome.kind === "rejected") {
          return transaction.reject({ code: outcome.code });
        }
        const run = runBookshopNarrativeUntilInteractionV1(
          bookshopNarrativeAfterResolutionV1(state.narrative, command.resolution),
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
          const option = bookshopChoiceOptionsForV1(state.narrative.pending.definitionId).find(
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

  const debugCommandExecutor: BookshopDebugCommandExecutorV1 = Object.freeze({
    validate() {
      return Object.freeze({
        kind: "validation_failed" as const,
        errors: Object.freeze([
          Object.freeze({ code: "bookshop.debug_command_unsupported" as const }),
        ]),
      });
    },
    executeAttempt() {
      throw new TypeError("bookshop debug commands are unsupported");
    },
  });

  return defineGameSimulation<BookshopSimulationTypesV1>()({
    contractRevision: 1,
    modules: compositionV1.modules,
    stateSchema: bookshopGameStateSchemaV1,
    commandSchema: commandSchemaV1,
    factSchema: passthroughSchemaV1<BookshopFactV1>(),
    rejectionSchema: passthroughSchemaV1<BookshopRejectionV1>(),
    debugCommandSchema: debugCommandSchemaV1,
    debugValidationErrorSchema: passthroughSchemaV1<BookshopDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return createInitialBookshopGameStateV1();
    },
    createQueries(state: BookshopGameStateV1) {
      return Object.freeze({
        coins: state.simulation.inventory.coins,
        stage: state.simulation.stage,
        narrative: state.simulation.narrative,
      });
    },
    projectGameView(queries: BookshopQueriesV1) {
      return Object.freeze({
        coins: queries.coins,
        stage: queries.stage,
      });
    },
  });
}
