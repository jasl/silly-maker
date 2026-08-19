// SPDX-License-Identifier: MIT
import type {
  BootstrapEntropyV1,
  CapabilityTokenV1,
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  GameSimulationV1,
  GameSnapshotEnvelopeV1,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import type {
  AudioIntentV1,
  InteractionRejectionCodeV1,
  NarrativeHistoryV1,
  InteractionResolutionV1,
  PendingInteractionV1,
  SemanticStageStateV1,
  StageMutationV1,
} from "@sillymaker/base";
import {
  createGameAuthoringKitV1,
  createTransactionalRngV1,
  defineGameSimulation,
  evaluateInteractionResolutionV1,
  parseInteractionOccurrenceIdV1,
  parseInteractionResolutionV1,
  parseNonNegativeSafeInteger,
  parseStageMutationV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import type { LabGameStateV1, LabProcedureStateV1 } from "./state.ts";
import {
  createInitialLabGameStateV1,
  labGameStateSchemaV1,
  labNarrativeStateSchemaV1,
  labProcedureStateSchemaV1,
  labSamplesStateSchemaV1,
  labStageStateSchemaV1,
  labWalletStateSchemaV1,
} from "./state.ts";
import { projectLabAudioIntentV1 } from "./audio.ts";
import type { LabNarrativeStateV1 } from "./narrative.ts";
import {
  createInitialLabNarrativeStateV1,
  labChoiceOptionsForV1,
  labInteractionContextV1,
  labNarrativeAfterResolutionV1,
  labNarrativeAtBeginV1,
  runLabNarrativeUntilInteractionV1,
} from "./narrative.ts";
import {
  createInitialLabStageStateV1,
  labStageHasBannerV1,
  labStageMutationsForBannerV1,
  labStageMutationsForBeginV1,
  labStageMutationsForCollectV1,
  labStageMutationsForProgressV1,
} from "./stage.ts";

export type LabCommandV1 =
  | { readonly kind: "lab.collect_sample" }
  | { readonly kind: "lab.begin_procedure" }
  | { readonly kind: "lab.advance_procedure" }
  | { readonly kind: "lab.run_experiment" }
  | { readonly kind: "lab.begin_calibration" }
  | { readonly kind: "lab.sell_sample" }
  | { readonly kind: "lab.buy_banner" }
  | {
    readonly kind: "lab.narrative_resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolutionV1;
  };

export type LabFactV1 =
  | { readonly kind: "lab.sample_collected"; readonly yield: number; readonly total: number }
  | { readonly kind: "lab.samples_consumed"; readonly amount: number; readonly remaining: number }
  | {
    readonly kind: "lab.procedure_advanced";
    readonly phase: LabProcedureStateV1["phase"];
    readonly stepsTaken: number;
  }
  | { readonly kind: "lab.stage_changed"; readonly mutations: number }
  | { readonly kind: "lab.credits_changed"; readonly delta: number; readonly balance: number }
  | {
    readonly kind: "lab.interaction_resolved";
    readonly definitionId: string;
    readonly occurrenceId: string;
  };

export type LabRejectionCodeV1 =
  | "lab.procedure_already_running"
  | "lab.procedure_not_running"
  | "lab.samples_required"
  | "lab.insufficient_samples"
  | "lab.insufficient_credits"
  | "lab.banner_already_owned"
  | "lab.stage_rejected"
  | "lab.narrative_busy"
  | InteractionRejectionCodeV1;

export interface LabRejectionV1 {
  readonly code: LabRejectionCodeV1;
}

export interface LabFaultV1 {
  readonly code: "lab.executor_failed";
}

export interface LabDebugValidationErrorV1 {
  readonly code: "lab.debug_command_unsupported";
}

export interface LabQueriesV1 {
  readonly samplesCollected: number;
  readonly credits: number;
  readonly bannerOwned: boolean;
  readonly procedurePhase: LabProcedureStateV1["phase"];
  readonly procedureSteps: number;
  readonly stage: SemanticStageStateV1;
  readonly narrative: LabNarrativeStateV1;
}

export interface LabNarrativeChoiceOptionViewV1 {
  readonly choiceId: string;
  readonly textId: string;
  readonly enabled: boolean;
  readonly blockedBy: "lab.narrative_choice_locked" | null;
}

/** The player-safe narrative channel published to UI and agents. */
export interface LabNarrativeViewV1 {
  readonly phase: LabNarrativeStateV1["phase"];
  readonly calibration: number | null;
  readonly pending: PendingInteractionV1 | null;
  /** Availability decorated with the same rule preview/dispatch re-check. */
  readonly choiceOptions: readonly LabNarrativeChoiceOptionViewV1[] | null;
  /** The player-readable backlog from authoritative State. */
  readonly history: NarrativeHistoryV1;
}

export interface LabGameViewV1 {
  readonly samplesCollected: number;
  readonly credits: number;
  readonly bannerOwned: boolean;
  readonly procedurePhase: LabProcedureStateV1["phase"];
  readonly procedureSteps: number;
  /** The semantic stage target: plain saveable data, observable headless. */
  readonly stage: SemanticStageStateV1;
  /** The continuous audio intent derived purely from saved State. */
  readonly audio: AudioIntentV1;
}

export interface LabBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface LabSimulationTypesV1 extends
  GameSimulationTypeMapV1<
    LabBootstrapInputV1,
    LabGameStateV1,
    RngStateV1
  > {
  readonly snapshot: GameSnapshotEnvelopeV1<LabGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: LabCommandV1;
  readonly fact: LabFactV1;
  readonly rejection: LabRejectionV1;
  readonly fault: LabFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: LabDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: LabQueriesV1;
  readonly viewModel: LabGameViewV1;
}

export type LabSnapshotV1 = LabSimulationTypesV1["snapshot"];
export type LabAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  LabSnapshotV1,
  LabFactV1,
  LabRejectionV1,
  LabFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

/**
 * The read-only capability lab.samples provides and lab.procedure consumes:
 * a procedure may only begin once at least one sample has been collected.
 */
export interface LabSamplesReadPortV1 {
  collectedCount(): number;
}

type SamplesOperationV1 =
  | { readonly kind: "collect"; readonly yield: number }
  | { readonly kind: "consume"; readonly amount: number };

type ProcedureOperationV1 = { readonly kind: "begin" } | { readonly kind: "advance" };

type StageOperationV1 = {
  readonly kind: "apply";
  readonly mutations: readonly StageMutationV1[];
};

type NarrativeOperationV1 =
  | { readonly kind: "begin"; readonly next: LabNarrativeStateV1 }
  | {
    readonly kind: "resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolutionV1;
    readonly next: LabNarrativeStateV1;
  };

const commandSchemaV1: RuntimeSchemaV1<LabCommandV1> = Object.freeze({
  parse(value: unknown): LabCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid lab command");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "lab.narrative_resolve") {
      if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
        throw new TypeError("invalid lab narrative resolve command");
      }
      const record = value as {
        readonly expectedOccurrenceId?: unknown;
        readonly resolution?: unknown;
      };
      return Object.freeze({
        kind,
        expectedOccurrenceId: parseInteractionOccurrenceIdV1(record.expectedOccurrenceId),
        resolution: parseInteractionResolutionV1(record.resolution),
      });
    }
    if (Object.keys(value).join("\0") !== "kind") {
      throw new TypeError("invalid lab command");
    }
    if (
      kind !== "lab.collect_sample" &&
      kind !== "lab.begin_procedure" &&
      kind !== "lab.advance_procedure" &&
      kind !== "lab.run_experiment" &&
      kind !== "lab.begin_calibration" &&
      kind !== "lab.sell_sample" &&
      kind !== "lab.buy_banner"
    ) {
      throw new TypeError("invalid lab command kind");
    }
    return Object.freeze({ kind });
  },
});

const samplesOperationSchemaV1: RuntimeSchemaV1<SamplesOperationV1> = Object.freeze({
  parse(value: unknown): SamplesOperationV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid lab samples operation");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "collect") {
      const sampleYield = parseNonNegativeSafeInteger(
        (value as { readonly yield?: unknown }).yield,
      );
      if (sampleYield < 1) throw new TypeError("lab sample yield must be positive");
      return Object.freeze({ kind, yield: sampleYield });
    }
    if (kind === "consume") {
      const amount = parseNonNegativeSafeInteger((value as { readonly amount?: unknown }).amount);
      if (amount < 1) throw new TypeError("lab sample consumption must be positive");
      return Object.freeze({ kind, amount });
    }
    throw new TypeError("invalid lab samples operation kind");
  },
});

const procedureOperationSchemaV1: RuntimeSchemaV1<ProcedureOperationV1> = Object.freeze({
  parse(value: unknown): ProcedureOperationV1 {
    if (value === null || typeof value !== "object" || Object.keys(value).join("\0") !== "kind") {
      throw new TypeError("invalid lab procedure operation");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind !== "begin" && kind !== "advance") {
      throw new TypeError("invalid lab procedure operation kind");
    }
    return Object.freeze({ kind });
  },
});

const narrativeOperationSchemaV1: RuntimeSchemaV1<NarrativeOperationV1> = Object.freeze({
  parse(value: unknown): NarrativeOperationV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid lab narrative operation");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (kind === "begin") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0next") {
        throw new TypeError("invalid lab narrative begin operation");
      }
      return Object.freeze({
        kind,
        next: labNarrativeStateSchemaV1.parse((value as { readonly next?: unknown }).next),
      });
    }
    if (kind === "resolve") {
      if (
        Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0next\0resolution"
      ) {
        throw new TypeError("invalid lab narrative resolve operation");
      }
      const record = value as {
        readonly expectedOccurrenceId?: unknown;
        readonly resolution?: unknown;
        readonly next?: unknown;
      };
      return Object.freeze({
        kind,
        expectedOccurrenceId: parseInteractionOccurrenceIdV1(record.expectedOccurrenceId),
        resolution: parseInteractionResolutionV1(record.resolution),
        next: labNarrativeStateSchemaV1.parse(record.next),
      });
    }
    throw new TypeError("invalid lab narrative operation kind");
  },
});

const stageOperationSchemaV1: RuntimeSchemaV1<StageOperationV1> = Object.freeze({
  parse(value: unknown): StageOperationV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).sort().join("\0") !== "kind\0mutations"
    ) {
      throw new TypeError("invalid lab stage operation");
    }
    const record = value as { readonly kind?: unknown; readonly mutations?: unknown };
    if (record.kind !== "apply" || !Array.isArray(record.mutations)) {
      throw new TypeError("invalid lab stage operation kind");
    }
    return Object.freeze({
      kind: "apply" as const,
      mutations: Object.freeze(
        record.mutations.map((mutation, index) =>
          parseStageMutationV1(mutation, `/mutations/${String(index)}`)
        ),
      ),
    });
  },
});

function passthroughSchemaV1<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

const debugCommandSchemaV1: RuntimeSchemaV1<never> = Object.freeze({
  parse(): never {
    throw new TypeError("lab debug commands are unsupported");
  },
});

export const labProcedureStepsToCompleteV1 = 2;

const kit = createGameAuthoringKitV1<LabSimulationTypesV1>();

export const labSamplesReadCapabilityV1: CapabilityTokenV1<LabSamplesReadPortV1> = kit
  .defineCapability<LabSamplesReadPortV1>("capability.lab.samples.read");

const samplesModuleV1 = kit.defineStatefulModule({
  id: "lab.samples",
  contractRevision: 1,
  state: {
    slot: "simulation.samples",
    schema: labSamplesStateSchemaV1,
    initial: () => Object.freeze({ collected: 0 }),
  },
  commandSchema: commandSchemaV1,
  provides: (provide) => [
    provide(labSamplesReadCapabilityV1, ({ readOwnState }) => ({
      collectedCount: () => readOwnState().collected,
    })),
  ],
  owner: {
    operationSchema: samplesOperationSchemaV1,
    propose(state, operation) {
      if (operation.kind === "consume" && state.collected < operation.amount) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "lab.insufficient_samples" as const }),
        });
      }
      const fact = operation.kind === "collect"
        ? Object.freeze({
          kind: "lab.sample_collected" as const,
          yield: operation.yield,
          total: state.collected + operation.yield,
        })
        : Object.freeze({
          kind: "lab.samples_consumed" as const,
          amount: operation.amount,
          remaining: state.collected - operation.amount,
        });
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({ payload: operation, facts: Object.freeze([fact]) }),
      });
    },
    apply(state, proposal) {
      const operation = proposal.payload;
      return Object.freeze({
        collected: operation.kind === "collect"
          ? state.collected + operation.yield
          : state.collected - operation.amount,
      });
    },
  },
});

const procedureModuleV1 = kit.defineStatefulModule({
  id: "lab.procedure",
  contractRevision: 1,
  state: {
    slot: "simulation.procedure",
    schema: labProcedureStateSchemaV1,
    initial: () => Object.freeze({ phase: "idle" as const, stepsTaken: 0 }),
  },
  commandSchema: commandSchemaV1,
  requires: { samples: labSamplesReadCapabilityV1 },
  initializesAfter: ["lab.samples"],
  owner: {
    operationSchema: procedureOperationSchemaV1,
    propose(state, operation, dependencies) {
      if (operation.kind === "begin" && dependencies.samples.collectedCount() < 1) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "lab.samples_required" as const }),
        });
      }
      const next = applyProcedureOperationV1(state, operation);
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "lab.procedure_advanced" as const,
              phase: next.phase,
              stepsTaken: next.stepsTaken,
            }),
          ]),
        }),
      });
    },
    apply(state, proposal) {
      return applyProcedureOperationV1(state, proposal.payload);
    },
  },
});

function applyProcedureOperationV1(
  state: { readonly phase: LabProcedureStateV1["phase"]; readonly stepsTaken: number },
  operation: ProcedureOperationV1,
): LabProcedureStateV1 {
  if (operation.kind === "begin") {
    return Object.freeze({ phase: "running" as const, stepsTaken: state.stepsTaken });
  }
  const stepsTaken = state.stepsTaken + 1;
  return Object.freeze({
    phase: stepsTaken >= labProcedureStepsToCompleteV1
      ? ("complete" as const)
      : ("running" as const),
    stepsTaken,
  });
}

const stageModuleV1 = kit.defineStatefulModule({
  id: "lab.stage",
  contractRevision: 2,
  state: {
    slot: "simulation.stage",
    schema: labStageStateSchemaV1,
    initial: () => createInitialLabStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: stageOperationSchemaV1,
    propose(state, operation) {
      const outcome = reduceStageMutationsV1(state, operation.mutations);
      if (outcome.kind === "rejected") {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "lab.stage_rejected" as const }),
        });
      }
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "lab.stage_changed" as const,
              mutations: operation.mutations.length,
            }),
          ]),
        }),
      });
    },
    apply(state, proposal) {
      const outcome = reduceStageMutationsV1(state, proposal.payload.mutations);
      if (outcome.kind !== "applied") {
        throw new TypeError("validated lab stage mutations must apply");
      }
      return outcome.state;
    },
  },
});

const narrativeModuleV1 = kit.defineStatefulModule({
  id: "lab.narrative",
  contractRevision: 4,
  state: {
    slot: "simulation.narrative",
    schema: labNarrativeStateSchemaV1,
    initial: () => createInitialLabNarrativeStateV1(),
  },
  commandSchema: commandSchemaV1,
  requires: { samples: labSamplesReadCapabilityV1 },
  initializesAfter: ["lab.samples"],
  owner: {
    operationSchema: narrativeOperationSchemaV1,
    propose(state, operation, dependencies) {
      if (operation.kind === "begin") {
        if (state.pending !== null) {
          return Object.freeze({
            kind: "rejected" as const,
            rejection: Object.freeze({ code: "lab.narrative_busy" as const }),
          });
        }
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({ payload: operation, facts: Object.freeze([]) }),
        });
      }
      // The queue-front authority: the same shared evaluator that served the
      // action catalog and preview re-checks the expected occurrence, choice
      // availability, and custom payload schema at dispatch time.
      const outcome = evaluateInteractionResolutionV1(
        state.pending,
        operation.expectedOccurrenceId,
        operation.resolution,
        labInteractionContextV1(state.pending, dependencies.samples.collectedCount()),
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
              kind: "lab.interaction_resolved" as const,
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

/** Shop economics: selling a sample earns credits, the banner costs them. */
export const labSampleSalePriceV1 = 2;
export const labBannerCostV1 = 3;

type WalletOperationV1 =
  | { readonly kind: "earn"; readonly amount: number }
  | { readonly kind: "spend"; readonly amount: number };

const walletOperationSchemaV1: RuntimeSchemaV1<WalletOperationV1> = Object.freeze({
  parse(value: unknown): WalletOperationV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).toSorted().join("\0") !== "amount\0kind"
    ) {
      throw new TypeError("invalid lab wallet operation");
    }
    const record = value as { readonly kind?: unknown; readonly amount?: unknown };
    if (record.kind !== "earn" && record.kind !== "spend") {
      throw new TypeError("invalid lab wallet operation kind");
    }
    const amount = parseNonNegativeSafeInteger(record.amount);
    if (amount < 1) throw new TypeError("lab wallet amount must be positive");
    return Object.freeze({ kind: record.kind, amount });
  },
});

const walletModuleV1 = kit.defineStatefulModule({
  id: "lab.wallet",
  contractRevision: 1,
  state: {
    slot: "simulation.wallet",
    schema: labWalletStateSchemaV1,
    initial: () => Object.freeze({ credits: 0 }),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: walletOperationSchemaV1,
    propose(state, operation) {
      if (operation.kind === "spend" && state.credits < operation.amount) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({ code: "lab.insufficient_credits" as const }),
        });
      }
      const balance = operation.kind === "earn"
        ? state.credits + operation.amount
        : state.credits - operation.amount;
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "lab.credits_changed" as const,
              delta: operation.kind === "earn" ? operation.amount : -operation.amount,
              balance,
            }),
          ]),
        }),
      });
    },
    apply(state, proposal) {
      const operation = proposal.payload;
      return Object.freeze({
        credits: operation.kind === "earn"
          ? state.credits + operation.amount
          : state.credits - operation.amount,
      });
    },
  },
});

const labCompositionV1 = kit.composeModules([
  samplesModuleV1,
  procedureModuleV1,
  stageModuleV1,
  narrativeModuleV1,
  walletModuleV1,
]);

type LabModulesV1 = typeof labCompositionV1.modules;

type LabCommandExecutorV1 = {
  executeAttempt(snapshot: LabSnapshotV1, command: LabCommandV1, context: undefined): LabAttemptV1;
};

type LabDebugCommandExecutorV1 = {
  validate(
    snapshot: LabSnapshotV1,
    command: never,
    context: undefined,
  ): {
    readonly kind: "validation_failed";
    readonly errors: readonly LabDebugValidationErrorV1[];
  };
  executeAttempt(snapshot: LabSnapshotV1, command: never, context: undefined): never;
};

export type LabGameSimulationV1 = GameSimulationV1<
  LabSimulationTypesV1,
  LabModulesV1,
  LabCommandExecutorV1,
  LabDebugCommandExecutorV1
>;

const labTransactionRunnerV1 = labCompositionV1.createTransactionRunner({
  stateSchema: labGameStateSchemaV1,
  createFault: () => Object.freeze({ code: "lab.executor_failed" as const }),
});

export function createLabGameSimulationV1(): LabGameSimulationV1 {
  const commandExecutor: LabCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation;

      const proposeStage = (
        transaction: { propose(module: typeof stageModuleV1, operation: StageOperationV1): void },
        mutations: readonly StageMutationV1[],
      ) => {
        if (mutations.length > 0) {
          transaction.propose(stageModuleV1, { kind: "apply", mutations });
        }
      };

      if (command.kind === "lab.collect_sample") {
        const sampleYield =
          rng.nextInt(Object.freeze({ purpose: "check:lab.sample_yield", exclusiveMax: 3 })) + 1;
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          transaction.propose(samplesModuleV1, { kind: "collect", yield: sampleYield });
          proposeStage(transaction, labStageMutationsForCollectV1(state.stage));
          return transaction.complete();
        });
      }

      if (command.kind === "lab.begin_calibration") {
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (state.narrative.pending !== null) {
            return transaction.reject({ code: "lab.narrative_busy" });
          }
          const run = runLabNarrativeUntilInteractionV1(
            labNarrativeAtBeginV1(state.narrative),
            state.stage,
          );
          transaction.propose(narrativeModuleV1, { kind: "begin", next: run.narrative });
          proposeStage(transaction, run.stageMutations);
          return transaction.complete();
        });
      }

      if (command.kind === "lab.narrative_resolve") {
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          // Pre-check with the exact same evaluator the narrative owner uses
          // at propose time, so an invalid resolution rejects before any
          // continuation work happens.
          const outcome = evaluateInteractionResolutionV1(
            state.narrative.pending,
            command.expectedOccurrenceId,
            command.resolution,
            labInteractionContextV1(state.narrative.pending, state.samples.collected),
          );
          if (outcome.kind === "rejected") {
            return transaction.reject({ code: outcome.code });
          }
          const continuation = labNarrativeAfterResolutionV1(state.narrative, command.resolution);
          if (continuation.kind === "holding") {
            // A partial hold tick decrements the authoritative remaining
            // milliseconds without consuming the pending boundary: the
            // same occurrence stays pending and the script does not run.
            transaction.propose(narrativeModuleV1, {
              kind: "resolve",
              expectedOccurrenceId: command.expectedOccurrenceId,
              resolution: command.resolution,
              next: continuation.narrative,
            });
            return transaction.complete();
          }
          const run = runLabNarrativeUntilInteractionV1(
            continuation.narrative,
            state.stage,
          );
          transaction.propose(narrativeModuleV1, {
            kind: "resolve",
            expectedOccurrenceId: command.expectedOccurrenceId,
            resolution: command.resolution,
            next: run.narrative,
          });
          // A choice may carry a declared cross-module cost: the narrative
          // continuation and the sample consumption commit in one atomic
          // command or not at all.
          const resolution = command.resolution;
          if (resolution.kind === "choose" && state.narrative.pending !== null) {
            const option = labChoiceOptionsForV1(state.narrative.pending.definitionId).find(
              (candidate) => candidate.choiceId === resolution.choiceId,
            );
            if (option !== undefined && option.consumesSamples > 0) {
              transaction.propose(samplesModuleV1, {
                kind: "consume",
                amount: option.consumesSamples,
              });
            }
          }
          proposeStage(transaction, run.stageMutations);
          return transaction.complete();
        });
      }

      if (command.kind === "lab.sell_sample") {
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (transaction.read(labSamplesReadCapabilityV1).collectedCount() < 1) {
            return transaction.reject({ code: "lab.insufficient_samples" });
          }
          // One committed command, two owners: the sample leaves the
          // samples module and the credits land in the wallet, atomically.
          transaction.propose(samplesModuleV1, { kind: "consume", amount: 1 });
          transaction.propose(walletModuleV1, { kind: "earn", amount: labSampleSalePriceV1 });
          return transaction.complete();
        });
      }

      if (command.kind === "lab.buy_banner") {
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (labStageHasBannerV1(state.stage)) {
            return transaction.reject({ code: "lab.banner_already_owned" });
          }
          if (state.wallet.credits < labBannerCostV1) {
            return transaction.reject({ code: "lab.insufficient_credits" });
          }
          // Spending and the stage effect commit together or not at all.
          transaction.propose(walletModuleV1, { kind: "spend", amount: labBannerCostV1 });
          proposeStage(transaction, labStageMutationsForBannerV1());
          return transaction.complete();
        });
      }

      if (command.kind === "lab.run_experiment") {
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (state.procedure.phase !== "running") {
            return transaction.reject({ code: "lab.procedure_not_running" });
          }
          if (transaction.read(labSamplesReadCapabilityV1).collectedCount() < 1) {
            return transaction.reject({ code: "lab.insufficient_samples" });
          }
          transaction.propose(samplesModuleV1, { kind: "consume", amount: 1 });
          transaction.propose(procedureModuleV1, { kind: "advance" });
          proposeStage(
            transaction,
            labStageMutationsForProgressV1(state.stage, {
              completed: state.procedure.stepsTaken + 1 >= labProcedureStepsToCompleteV1,
              samplesRemaining: state.samples.collected - 1,
            }),
          );
          return transaction.complete();
        });
      }

      return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
        if (command.kind === "lab.begin_procedure" && state.procedure.phase !== "idle") {
          return transaction.reject({ code: "lab.procedure_already_running" });
        }
        if (command.kind === "lab.advance_procedure" && state.procedure.phase !== "running") {
          return transaction.reject({ code: "lab.procedure_not_running" });
        }
        transaction.propose(procedureModuleV1, {
          kind: command.kind === "lab.begin_procedure" ? "begin" : "advance",
        });
        if (command.kind === "lab.begin_procedure") {
          proposeStage(transaction, labStageMutationsForBeginV1());
        } else {
          proposeStage(
            transaction,
            labStageMutationsForProgressV1(state.stage, {
              completed: state.procedure.stepsTaken + 1 >= labProcedureStepsToCompleteV1,
              samplesRemaining: null,
            }),
          );
        }
        return transaction.complete();
      });
    },
  });

  const debugCommandExecutor: LabDebugCommandExecutorV1 = Object.freeze({
    validate() {
      return Object.freeze({
        kind: "validation_failed" as const,
        errors: Object.freeze([Object.freeze({ code: "lab.debug_command_unsupported" as const })]),
      });
    },
    executeAttempt() {
      throw new TypeError("lab debug commands are unsupported");
    },
  });

  return defineGameSimulation<LabSimulationTypesV1>()({
    contractRevision: 1,
    modules: labCompositionV1.modules,
    stateSchema: labGameStateSchemaV1,
    commandSchema: commandSchemaV1,
    factSchema: passthroughSchemaV1<LabFactV1>(),
    rejectionSchema: passthroughSchemaV1<LabRejectionV1>(),
    debugCommandSchema: debugCommandSchemaV1,
    debugValidationErrorSchema: passthroughSchemaV1<LabDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return createInitialLabGameStateV1();
    },
    createQueries(state: LabGameStateV1) {
      return Object.freeze({
        samplesCollected: state.simulation.samples.collected,
        credits: state.simulation.wallet.credits,
        bannerOwned: labStageHasBannerV1(state.simulation.stage),
        procedurePhase: state.simulation.procedure.phase,
        procedureSteps: state.simulation.procedure.stepsTaken,
        stage: state.simulation.stage,
        narrative: state.simulation.narrative,
      });
    },
    projectGameView(queries: LabQueriesV1) {
      return Object.freeze({
        samplesCollected: queries.samplesCollected,
        credits: queries.credits,
        bannerOwned: queries.bannerOwned,
        procedurePhase: queries.procedurePhase,
        procedureSteps: queries.procedureSteps,
        stage: queries.stage,
        audio: projectLabAudioIntentV1(queries),
      });
    },
  });
}
