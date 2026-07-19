// SPDX-License-Identifier: MIT
import type {
  BootstrapEntropyV1,
  CommandExecutionAttemptEnvelopeV1,
  GameSimulationTypeMapV1,
  GameSimulationV1,
  GameSnapshotEnvelopeV1,
  ModuleOwnerProposalEnvelopeV1,
  NonZeroUint32,
  RngDrawTraceV1,
  RngStateV1,
  RuleRngV1,
  RuntimeSchemaV1,
} from "@sillymaker/base";
import {
  createTransactionalRngV1,
  defineGameplayModule,
  defineGameSimulation,
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { LabGameStateV1, LabProcedureStateV1, LabSamplesStateV1 } from "./state.js";
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
  readonly code: "lab.procedure_already_running" | "lab.procedure_not_running";
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

interface SamplesOperationV1 {
  readonly yield: number;
}

interface SamplesProposalV1 extends ModuleOwnerProposalEnvelopeV1<SamplesOperationV1, LabFactV1> {}

type ProcedureOperationV1 = { readonly kind: "begin" } | { readonly kind: "advance" };

interface ProcedureProposalV1 extends ModuleOwnerProposalEnvelopeV1<
  ProcedureOperationV1,
  LabFactV1
> {}

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

const samplesProposalSchemaV1: RuntimeSchemaV1<SamplesProposalV1> = Object.freeze({
  parse(value: unknown): SamplesProposalV1 {
    if (value === null || typeof value !== "object") {
      throw new TypeError("invalid lab samples proposal");
    }
    const payload = samplesOperationSchemaV1.parse(Reflect.get(value, "payload"));
    const facts = Reflect.get(value, "facts");
    if (!Array.isArray(facts)) throw new TypeError("invalid lab samples proposal facts");
    return Object.freeze({ payload, facts: Object.freeze([...facts]) as readonly LabFactV1[] });
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

const procedureProposalSchemaV1: RuntimeSchemaV1<ProcedureProposalV1> = Object.freeze({
  parse(value: unknown): ProcedureProposalV1 {
    if (value === null || typeof value !== "object") {
      throw new TypeError("invalid lab procedure proposal");
    }
    const payload = procedureOperationSchemaV1.parse(Reflect.get(value, "payload"));
    const facts = Reflect.get(value, "facts");
    if (!Array.isArray(facts)) throw new TypeError("invalid lab procedure proposal facts");
    return Object.freeze({ payload, facts: Object.freeze([...facts]) as readonly LabFactV1[] });
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

function createLabModulesV1() {
  const samples = defineGameplayModule<LabSimulationTypesV1>()({
    bindingKind: "stateful" as const,
    descriptor: {
      id: parseModuleId("lab.samples"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.samples")],
      dependencies: [],
    },
    commandSchema: commandSchemaV1,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: labSamplesStateSchemaV1,
    ownerOperationSchema: samplesOperationSchemaV1,
    ownerProposalSchema: samplesProposalSchemaV1,
    localInvariants: [],
    owner: {
      propose(state: LabSamplesStateV1, operation: SamplesOperationV1) {
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
      apply(state: LabSamplesStateV1, proposal: SamplesProposalV1) {
        return Object.freeze({ collected: state.collected + proposal.payload.yield });
      },
    },
    queries: null,
    createInitialState: () => Object.freeze({ collected: 0 }),
    createReadPort: (state: LabSamplesStateV1) => state,
  });

  const procedure = defineGameplayModule<LabSimulationTypesV1>()({
    bindingKind: "stateful" as const,
    descriptor: {
      id: parseModuleId("lab.procedure"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.procedure")],
      dependencies: [],
    },
    commandSchema: commandSchemaV1,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: labProcedureStateSchemaV1,
    ownerOperationSchema: procedureOperationSchemaV1,
    ownerProposalSchema: procedureProposalSchemaV1,
    localInvariants: [],
    owner: {
      propose(state: LabProcedureStateV1, operation: ProcedureOperationV1) {
        const next =
          operation.kind === "begin"
            ? Object.freeze({ phase: "running" as const, stepsTaken: state.stepsTaken })
            : Object.freeze({
                phase:
                  state.stepsTaken + 1 >= labProcedureStepsToCompleteV1
                    ? ("complete" as const)
                    : ("running" as const),
                stepsTaken: state.stepsTaken + 1,
              });
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
      apply(state: LabProcedureStateV1, proposal: ProcedureProposalV1) {
        if (proposal.payload.kind === "begin") {
          return Object.freeze({ phase: "running" as const, stepsTaken: state.stepsTaken });
        }
        const stepsTaken = state.stepsTaken + 1;
        return Object.freeze({
          phase:
            stepsTaken >= labProcedureStepsToCompleteV1
              ? ("complete" as const)
              : ("running" as const),
          stepsTaken,
        });
      },
    },
    queries: null,
    createInitialState: () => Object.freeze({ phase: "idle" as const, stepsTaken: 0 }),
    createReadPort: (state: LabProcedureStateV1) => state,
  });

  return Object.freeze([samples, procedure] as const);
}

type LabModulesV1 = ReturnType<typeof createLabModulesV1>;

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

function rejectionDiagnosticsV1(snapshot: LabSnapshotV1, rng: RuleRngV1) {
  return Object.freeze({
    committedRngBefore: snapshot.rng,
    attemptedDraws: rng.attemptedDraws(),
    committedRngAfter: snapshot.rng,
  });
}

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
    diagnostics: rejectionDiagnosticsV1(snapshot, rng),
  });
}

export function createLabGameSimulationV1(): LabGameSimulationV1 {
  const modules = createLabModulesV1();
  const samples = modules[0];
  const procedure = modules[1];

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
        const proposed = samples.owner.propose(
          state.samples,
          samplesOperationSchemaV1.parse({ yield: sampleYield }),
          Object.freeze({}),
        );
        if (proposed.kind !== "proposed") {
          throw new TypeError("lab samples owner rejected its own operation");
        }
        const proposal = samplesProposalSchemaV1.parse(proposed.proposal);
        const nextSamples = labSamplesStateSchemaV1.parse(
          samples.owner.apply(state.samples, proposal),
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

      const operation = procedureOperationSchemaV1.parse({
        kind: command.kind === "lab.begin_procedure" ? "begin" : "advance",
      });
      const proposed = procedure.owner.propose(state.procedure, operation, Object.freeze({}));
      if (proposed.kind !== "proposed") {
        throw new TypeError("lab procedure owner rejected its own operation");
      }
      const proposal = procedureProposalSchemaV1.parse(proposed.proposal);
      const nextProcedure = labProcedureStateSchemaV1.parse(
        procedure.owner.apply(state.procedure, proposal),
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
    modules,
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
