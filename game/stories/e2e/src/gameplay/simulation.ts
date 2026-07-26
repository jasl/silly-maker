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
import type { SemanticStageStateV2, StageMutationV2 } from "@sillymaker/base";
import {
  createGameAuthoringKitV1,
  createTransactionalRngV1,
  defineGameSimulation,
  parseNonNegativeSafeInteger,
  parseStageMutationV2,
  reduceStageMutationsV2,
} from "@sillymaker/base";

import type { LabGameStateV1, LabProcedureStateV1 } from "./state.js";
import {
  createInitialLabGameStateV1,
  labGameStateSchemaV1,
  labProcedureStateSchemaV1,
  labSamplesStateSchemaV1,
  labStageStateSchemaV1,
} from "./state.js";
import {
  createInitialLabStageStateV1,
  labStageMutationsForBeginV1,
  labStageMutationsForCollectV1,
  labStageMutationsForProgressV1,
} from "./stage.js";

export type LabCommandV1 =
  | { readonly kind: "lab.collect_sample" }
  | { readonly kind: "lab.begin_procedure" }
  | { readonly kind: "lab.advance_procedure" }
  | { readonly kind: "lab.run_experiment" };

export type LabFactV1 =
  | { readonly kind: "lab.sample_collected"; readonly yield: number; readonly total: number }
  | { readonly kind: "lab.samples_consumed"; readonly amount: number; readonly remaining: number }
  | {
      readonly kind: "lab.procedure_advanced";
      readonly phase: LabProcedureStateV1["phase"];
      readonly stepsTaken: number;
    }
  | { readonly kind: "lab.stage_changed"; readonly mutations: number };

export interface LabRejectionV1 {
  readonly code:
    | "lab.procedure_already_running"
    | "lab.procedure_not_running"
    | "lab.samples_required"
    | "lab.insufficient_samples"
    | "lab.stage_rejected";
}

export interface LabFaultV1 {
  readonly code: "lab.executor_failed";
}

export interface LabDebugValidationErrorV1 {
  readonly code: "lab.debug_command_unsupported";
}

export interface LabQueriesV1 {
  readonly samplesCollected: number;
  readonly procedurePhase: LabProcedureStateV1["phase"];
  readonly procedureSteps: number;
  readonly stage: SemanticStageStateV2;
}

export interface LabGameViewV1 {
  readonly samplesCollected: number;
  readonly procedurePhase: LabProcedureStateV1["phase"];
  readonly procedureSteps: number;
  /** The semantic stage target: plain saveable data, observable headless. */
  readonly stage: SemanticStageStateV2;
}

export interface LabBootstrapInputV1 {
  readonly rngSeed: NonZeroUint32;
}

export interface LabSimulationTypesV1 extends GameSimulationTypeMapV1<
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
  readonly mutations: readonly StageMutationV2[];
};

const commandSchemaV1: RuntimeSchemaV1<LabCommandV1> = Object.freeze({
  parse(value: unknown): LabCommandV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join("\0") !== "kind"
    ) {
      throw new TypeError("invalid lab command");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (
      kind !== "lab.collect_sample" &&
      kind !== "lab.begin_procedure" &&
      kind !== "lab.advance_procedure" &&
      kind !== "lab.run_experiment"
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
          parseStageMutationV2(mutation, `/mutations/${String(index)}`),
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

export const labSamplesReadCapabilityV1: CapabilityTokenV1<LabSamplesReadPortV1> =
  kit.defineCapability<LabSamplesReadPortV1>("capability.lab.samples.read");

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
      const fact =
        operation.kind === "collect"
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
        collected:
          operation.kind === "collect"
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
    phase:
      stepsTaken >= labProcedureStepsToCompleteV1 ? ("complete" as const) : ("running" as const),
    stepsTaken,
  });
}

const stageModuleV1 = kit.defineStatefulModule({
  id: "lab.stage",
  contractRevision: 1,
  state: {
    slot: "simulation.stage",
    schema: labStageStateSchemaV1,
    initial: () => createInitialLabStageStateV1(),
  },
  commandSchema: commandSchemaV1,
  owner: {
    operationSchema: stageOperationSchemaV1,
    propose(state, operation) {
      const outcome = reduceStageMutationsV2(state, operation.mutations);
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
      const outcome = reduceStageMutationsV2(state, proposal.payload.mutations);
      if (outcome.kind !== "applied") {
        throw new TypeError("validated lab stage mutations must apply");
      }
      return outcome.state;
    },
  },
});

const labCompositionV1 = kit.composeModules([samplesModuleV1, procedureModuleV1, stageModuleV1]);

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
        mutations: readonly StageMutationV2[],
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
        procedurePhase: state.simulation.procedure.phase,
        procedureSteps: state.simulation.procedure.stepsTaken,
        stage: state.simulation.stage,
      });
    },
    projectGameView(queries: LabQueriesV1) {
      return Object.freeze({
        samplesCollected: queries.samplesCollected,
        procedurePhase: queries.procedurePhase,
        procedureSteps: queries.procedureSteps,
        stage: queries.stage,
      });
    },
  });
}
