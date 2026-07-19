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
  RuleRngV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import {
  createGameAuthoringKitV1,
  createTransactionalRngV1,
  defineGameSimulation,
  parseNonNegativeSafeInteger,
} from "@sillymaker/base";

import type { LabGameStateV1, LabProcedureStateV1 } from "./state.js";
import {
  createInitialLabGameStateV1,
  labGameStateSchemaV1,
  labProcedureStateSchemaV1,
  labSamplesStateSchemaV1,
} from "./state.js";

export type LabCommandV1 =
  | { readonly kind: "lab.collect_sample" }
  | { readonly kind: "lab.begin_procedure" }
  | { readonly kind: "lab.advance_procedure" };

export type LabFactV1 =
  | { readonly kind: "lab.sample_collected"; readonly yield: number; readonly total: number }
  | {
      readonly kind: "lab.procedure_advanced";
      readonly phase: LabProcedureStateV1["phase"];
      readonly stepsTaken: number;
    };

export interface LabRejectionV1 {
  readonly code:
    "lab.procedure_already_running" | "lab.procedure_not_running" | "lab.samples_required";
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
}

export interface LabGameViewV1 {
  readonly samplesCollected: number;
  readonly procedurePhase: LabProcedureStateV1["phase"];
  readonly procedureSteps: number;
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

interface SamplesOperationV1 {
  readonly yield: number;
}

type ProcedureOperationV1 = { readonly kind: "begin" } | { readonly kind: "advance" };

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
      kind !== "lab.advance_procedure"
    ) {
      throw new TypeError("invalid lab command kind");
    }
    return Object.freeze({ kind });
  },
});

const samplesOperationSchemaV1: RuntimeSchemaV1<SamplesOperationV1> = Object.freeze({
  parse(value: unknown): SamplesOperationV1 {
    if (value === null || typeof value !== "object" || Object.keys(value).join("\0") !== "yield") {
      throw new TypeError("invalid lab samples operation");
    }
    const sampleYield = parseNonNegativeSafeInteger((value as { readonly yield?: unknown }).yield);
    if (sampleYield < 1) throw new TypeError("lab sample yield must be positive");
    return Object.freeze({ yield: sampleYield });
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
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "lab.sample_collected" as const,
              yield: operation.yield,
              total: state.collected + operation.yield,
            }),
          ]),
        }),
      });
    },
    apply(state, proposal) {
      return Object.freeze({ collected: state.collected + proposal.payload.yield });
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

const labCompositionV1 = kit.composeModules([samplesModuleV1, procedureModuleV1]);

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

function rejectV1(
  snapshot: LabSnapshotV1,
  rng: RuleRngV1,
  code: LabRejectionV1["code"],
): LabAttemptV1 {
  return Object.freeze({
    result: Object.freeze({
      kind: "rejected" as const,
      snapshot,
      reasons: Object.freeze([Object.freeze({ code })]),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: snapshot.rng,
      attemptedDraws: rng.attemptedDraws(),
      committedRngAfter: snapshot.rng,
    }),
  });
}

export function createLabGameSimulationV1(): LabGameSimulationV1 {
  const samplesBinding = labCompositionV1.modules[0];
  const procedureBinding = labCompositionV1.modules[1];

  const commit = (
    snapshot: LabSnapshotV1,
    nextState: LabGameStateV1,
    rng: RuleRngV1,
    facts: readonly LabFactV1[],
  ): LabAttemptV1 => {
    const next = Object.freeze({
      state: labGameStateSchemaV1.parse(nextState),
      rng: rng.candidateState(),
      commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
      integrity: snapshot.integrity,
    });
    return Object.freeze({
      result: Object.freeze({
        kind: "committed" as const,
        snapshot: next,
        facts: Object.freeze([...facts]),
      }),
      diagnostics: Object.freeze({
        committedRngBefore: snapshot.rng,
        attemptedDraws: rng.attemptedDraws(),
        candidateRngAfter: rng.candidateState(),
        committedRngAfter: next.rng,
      }),
    });
  };

  const commandExecutor: LabCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation;

      if (command.kind === "lab.collect_sample") {
        const sampleYield =
          rng.nextInt(Object.freeze({ purpose: "check:lab.sample_yield", exclusiveMax: 3 })) + 1;
        const proposed = samplesBinding.owner.propose(
          state.samples,
          samplesOperationSchemaV1.parse({ yield: sampleYield }),
          Object.freeze({}),
        );
        if (proposed.kind !== "proposed") {
          return rejectV1(snapshot, rng, proposed.rejection.code);
        }
        const proposal = samplesBinding.ownerProposalSchema.parse(proposed.proposal);
        const nextSamples = labSamplesStateSchemaV1.parse(
          samplesBinding.owner.apply(state.samples, proposal),
        );
        return commit(
          snapshot,
          { simulation: { samples: nextSamples, procedure: state.procedure } },
          rng,
          proposal.facts,
        );
      }

      if (command.kind === "lab.begin_procedure" && state.procedure.phase !== "idle") {
        return rejectV1(snapshot, rng, "lab.procedure_already_running");
      }
      if (command.kind === "lab.advance_procedure" && state.procedure.phase !== "running") {
        return rejectV1(snapshot, rng, "lab.procedure_not_running");
      }

      const dependencyPorts = labCompositionV1.createDependencyPortsFor(
        procedureModuleV1,
        snapshot.state,
      );
      const operation = procedureOperationSchemaV1.parse({
        kind: command.kind === "lab.begin_procedure" ? "begin" : "advance",
      });
      const proposed = procedureBinding.owner.propose(state.procedure, operation, dependencyPorts);
      if (proposed.kind !== "proposed") {
        return rejectV1(snapshot, rng, proposed.rejection.code);
      }
      const proposal = procedureBinding.ownerProposalSchema.parse(proposed.proposal);
      const nextProcedure = labProcedureStateSchemaV1.parse(
        procedureBinding.owner.apply(state.procedure, proposal),
      );
      return commit(
        snapshot,
        { simulation: { samples: state.samples, procedure: nextProcedure } },
        rng,
        proposal.facts,
      );
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
      });
    },
    projectGameView(queries: LabQueriesV1) {
      return Object.freeze({
        samplesCollected: queries.samplesCollected,
        procedurePhase: queries.procedurePhase,
        procedureSteps: queries.procedureSteps,
      });
    },
  });
}
