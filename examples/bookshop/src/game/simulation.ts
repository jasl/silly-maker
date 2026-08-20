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
import { createTransactionalRngV1 } from "@sillymaker/base";
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

import type { BookshopGameStateV1 } from "./state.ts";
import {
  createInitialBookshopGameStateV1,
  createInitialBookshopStageStateV1,
  bookshopGameStateSchemaV1,
  bookshopInventoryStateSchemaV1,
  bookshopNarrativeStateSchemaV1,
  bookshopStageStateSchemaV1,
} from "./state.ts";
import type { BookshopNarrativeStateV1 } from "../story/narrative.ts";
import {
  createInitialBookshopNarrativeStateV1,
  runBookshopNarrativeUntilInteractionV1,
  bookshopChoiceOptionsForV1,
  bookshopInteractionContextV1,
  bookshopNarrativeAfterResolutionV1,
  bookshopNarrativeAtBeginV1,
} from "../story/narrative.ts";

/**
 * The starter simulation: three stateful modules and one command executor.
 *
 * - `bookshop.inventory` is the empty-shell gameplay module (a coin purse).
 * - `bookshop.narrative` owns the script cursor and pending interaction.
 * - `bookshop.stage`     owns the semantic stage state.
 *
 * Command handlers decide and emit domain events; each module's reducers
 * fold the admitted events atomically. A command either commits a complete
 * valid result across every touched module or leaves authoritative state
 * unchanged.
 */

export type BookshopCommandV1 =
  | { readonly kind: "bookshop.begin_story" }
  | { readonly kind: "bookshop.earn_coin" }
  | {
    readonly kind: "bookshop.narrative_resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolution;
  };

/**
 * The bookshop's domain-event union: the only internal authoritative update
 * channel. `bookshop.interaction_resolved` is journal-only evidence — no
 * module reduces it.
 */
export type BookshopEventV1 =
  | { readonly kind: "bookshop.coins_changed"; readonly delta: number; readonly balance: number }
  | { readonly kind: "bookshop.stage_changed"; readonly mutations: readonly StageMutation[] }
  | { readonly kind: "bookshop.narrative_advanced"; readonly next: BookshopNarrativeStateV1 }
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

export interface BookshopSimulationTypesV1 extends
  GameSimulationTypeMapV1<
    BookshopBootstrapInputV1,
    BookshopGameStateV1,
    RngStateV1
  > {
  readonly snapshot: GameSnapshotEnvelopeV1<BookshopGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: BookshopCommandV1;
  readonly event: BookshopEventV1;
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
  BookshopEventV1,
  BookshopRejectionV1,
  BookshopFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

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

function keysV1(value: object): string {
  return Object.keys(value).toSorted().join("\0");
}

function parseIntegerV1(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`invalid bookshop event ${label}`);
  }
  return value;
}

/**
 * Domain-event admission: every emitted event is validated once here before
 * any reducer folds it, so reducers consume ordinary typed data.
 */
const bookshopEventSchemaV1: RuntimeSchemaV1<BookshopEventV1> = Object.freeze({
  parse(value: unknown): BookshopEventV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid bookshop event");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "bookshop.coins_changed") {
      if (keysV1(value) !== "balance\0delta\0kind") {
        throw new TypeError("invalid bookshop coins event");
      }
      const record = value as { readonly delta?: unknown; readonly balance?: unknown };
      const delta = parseIntegerV1(record.delta, "delta");
      const balance = parseIntegerV1(record.balance, "balance");
      if (delta === 0 || balance < 0) throw new TypeError("invalid bookshop coins event");
      return Object.freeze({ kind, delta, balance });
    }
    if (kind === "bookshop.stage_changed") {
      if (keysV1(value) !== "kind\0mutations") {
        throw new TypeError("invalid bookshop stage event");
      }
      const record = value as { readonly mutations?: unknown };
      if (!Array.isArray(record.mutations) || record.mutations.length === 0) {
        throw new TypeError("invalid bookshop stage event mutations");
      }
      return Object.freeze({
        kind,
        mutations: Object.freeze(
          record.mutations.map((mutation, index) =>
            parseStageMutation(mutation, `/mutations/${String(index)}`)
          ),
        ),
      });
    }
    if (kind === "bookshop.narrative_advanced") {
      if (keysV1(value) !== "kind\0next") {
        throw new TypeError("invalid bookshop narrative event");
      }
      return Object.freeze({
        kind,
        next: bookshopNarrativeStateSchemaV1.parse((value as { readonly next?: unknown }).next),
      });
    }
    if (kind === "bookshop.interaction_resolved") {
      if (keysV1(value) !== "definitionId\0kind\0occurrenceId") {
        throw new TypeError("invalid bookshop interaction event");
      }
      const record = value as { readonly definitionId?: unknown; readonly occurrenceId?: unknown };
      if (
        typeof record.definitionId !== "string" || record.definitionId.length === 0 ||
        typeof record.occurrenceId !== "string" || record.occurrenceId.length === 0
      ) {
        throw new TypeError("invalid bookshop interaction event");
      }
      return Object.freeze({
        kind,
        definitionId: record.definitionId,
        occurrenceId: record.occurrenceId,
      });
    }
    throw new TypeError("invalid bookshop event kind");
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

/** The read-only capability command handlers use to price choices. */
export interface BookshopInventoryReadPortV1 {
  coinBalance(): number;
}

export const bookshopInventoryReadCapabilityV1 = kit.defineCapability<BookshopInventoryReadPortV1>(
  "capability.bookshop.inventory.read",
);

/**
 * The empty-shell gameplay module. Command handlers decide and emit
 * `bookshop.coins_changed` (the overdraft rule lives at the decision
 * point); this reducer folds the admitted event into the slice, so a
 * choice's coin cost and the narrative continuation commit atomically.
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
  reducers: {
    "bookshop.coins_changed": (_state, event) => Object.freeze({ coins: event.balance }),
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
  // Coin-costing choices gate on the wallet balance.
  requires: { inventory: bookshopInventoryReadCapabilityV1 },
  initializesAfter: ["bookshop.inventory"],
  reducers: {
    "bookshop.narrative_advanced": (_state, event) => event.next,
  },
});

const stageModuleV1 = kit.defineStatefulModule({
  id: "bookshop.stage",
  contractRevision: 2,
  state: {
    slot: "simulation.stage",
    schema: bookshopStageStateSchemaV1,
    initial: () => createInitialBookshopStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "bookshop.stage_changed": (state, event) => {
      // Handlers validate applicability before emitting, so a rejected fold
      // here is a programming fault, not a player-visible rejection.
      const outcome = reduceStageMutations(state, event.mutations);
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
  eventSchema: bookshopEventSchemaV1,
  createFault: () => Object.freeze({ code: "bookshop.executor_failed" as const }),
});

export function createBookshopGameSimulationV1(): BookshopGameSimulationV1 {
  const commandExecutor: BookshopCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation;

      const emitStage = (
        transaction: { emit(event: BookshopEventV1): void },
        mutations: readonly StageMutation[],
      ) => {
        if (mutations.length === 0) return null;
        // Validate applicability at the decision point so an unappliable
        // mutation rejects the command instead of faulting the fold.
        const outcome = reduceStageMutations(state.stage, mutations);
        if (outcome.kind === "rejected") return "bookshop.stage_rejected" as const;
        transaction.emit({ kind: "bookshop.stage_changed", mutations });
        return null;
      };

      if (command.kind === "bookshop.earn_coin") {
        return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
          transaction.emit({
            kind: "bookshop.coins_changed",
            delta: 1,
            balance: state.inventory.coins + 1,
          });
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
          transaction.emit({ kind: "bookshop.narrative_advanced", next: run.narrative });
          const blocked = emitStage(transaction, run.stageMutations);
          if (blocked !== null) return transaction.reject({ code: blocked });
          return transaction.complete();
        });
      }

      return transactionRunnerV1.execute(snapshot, rng, (transaction) => {
        // The same shared evaluator that served the action catalog and
        // preview re-checks the expected occurrence and choice availability
        // at dispatch time; the read capability prices choices against the
        // command-start snapshot.
        const coins = transaction.read(bookshopInventoryReadCapabilityV1).coinBalance();
        const pending = state.narrative.pending;
        const outcome = evaluateInteractionResolution(
          pending,
          command.expectedOccurrenceId,
          command.resolution,
          bookshopInteractionContextV1(pending, coins),
        );
        if (outcome.kind === "rejected") {
          return transaction.reject({ code: outcome.code });
        }
        if (pending === null) throw new TypeError("accepted resolution without pending");
        const run = runBookshopNarrativeUntilInteractionV1(
          bookshopNarrativeAfterResolutionV1(state.narrative, command.resolution),
          state.stage,
        );
        transaction.emit({
          kind: "bookshop.interaction_resolved",
          definitionId: pending.definitionId,
          occurrenceId: pending.occurrenceId,
        });
        transaction.emit({ kind: "bookshop.narrative_advanced", next: run.narrative });
        // A choice may carry a declared coin cost: the narrative
        // continuation and the spend commit in one atomic command.
        const resolution = command.resolution;
        if (resolution.kind === "choose") {
          const option = bookshopChoiceOptionsForV1(pending.definitionId).find(
            (candidate) => candidate.choiceId === resolution.choiceId,
          );
          if (option !== undefined && option.consumesCoins > 0) {
            if (coins < option.consumesCoins) {
              return transaction.reject({ code: "bookshop.insufficient_coins" });
            }
            transaction.emit({
              kind: "bookshop.coins_changed",
              delta: -option.consumesCoins,
              balance: coins - option.consumesCoins,
            });
          }
        }
        const blocked = emitStage(transaction, run.stageMutations);
        if (blocked !== null) return transaction.reject({ code: blocked });
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
    eventSchema: bookshopEventSchemaV1,
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
