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
  TimeTickRejectionCodeV1,
  TimeTickV1,
} from "@sillymaker/base";
import {
  createGameAuthoringKitV1,
  createTransactionalRngV1,
  defineGameSimulation,
  evaluateInteractionResolutionV1,
  evaluateTimeTickV1,
  parseInteractionOccurrenceIdV1,
  parseInteractionResolutionV1,
  parseMonitorAccumulatorV1,
  parseNonNegativeSafeInteger,
  parseStageMutationV1,
  parseTimeTickV1,
  reduceStageMutationsV1,
  settleMonitorsV1,
} from "@sillymaker/base";
import type { MonitorAccumulatorV1 } from "@sillymaker/base";

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
import type { LabMonitorsStateV1 } from "./monitors.ts";
import {
  createInitialLabMonitorsStateV1,
  labGaugeMonitorIdV1,
  labMonitorAccumulatorEqualV1,
  labMonitorDeclarationsV1,
  labMonitorRealtimeActiveV1,
  labMonitorReportingActiveV1,
  labMonitorsStateSchemaV1,
} from "./monitors.ts";
import type { LabNarrativeStateV1 } from "./narrative.ts";
import {
  createInitialLabNarrativeStateV1,
  labChoiceOptionsForV1,
  labDrillDecisionDefinitionIdV1,
  labDrillReleaseChoiceIdV1,
  labInteractionContextV1,
  labNarrativeAfterResolutionV1,
  labNarrativeAfterTimeTickV1,
  labNarrativeAtBeginV1,
  labNarrativeAtDrillBeginV1,
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
  | { readonly kind: "lab.begin_drill" }
  | { readonly kind: "lab.toggle_collector" }
  | { readonly kind: "lab.sell_sample" }
  | { readonly kind: "lab.buy_banner" }
  | {
    readonly kind: "lab.narrative_resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolutionV1;
  }
  | {
    /**
     * The Lab's carrier for the session-level time verb: one commit
     * settles every authoritative time consumer. A hold-fenced tick folds
     * the pending hold's remainder first (stale fences reject the whole
     * command); every accepted tick then settles the declared monitors
     * with the same reported milliseconds — parallel clocks measuring the
     * same span, never a split. An unfenced tick with no active monitor
     * still commits with an empty journal, the observable proof that a
     * global tick never touches a pending hold.
     */
    readonly kind: "lab.time_tick";
    readonly tick: TimeTickV1;
  };

/**
 * The Lab's domain-event union: the only internal authoritative update
 * channel. The command handler decides and emits; module reducers fold the
 * admitted events into their slices atomically; the committed sequence is
 * the read-side journal. `lab.interaction_resolved` is journal-only
 * evidence — no module reduces it.
 */
export type LabEventV1 =
  | { readonly kind: "lab.sample_collected"; readonly yield: number; readonly total: number }
  | { readonly kind: "lab.samples_consumed"; readonly amount: number; readonly remaining: number }
  | {
    readonly kind: "lab.procedure_advanced";
    readonly phase: LabProcedureStateV1["phase"];
    readonly stepsTaken: number;
  }
  | { readonly kind: "lab.stage_changed"; readonly mutations: readonly StageMutationV1[] }
  | { readonly kind: "lab.narrative_advanced"; readonly next: LabNarrativeStateV1 }
  | { readonly kind: "lab.credits_changed"; readonly delta: number; readonly balance: number }
  | {
    readonly kind: "lab.interaction_resolved";
    readonly definitionId: string;
    readonly occurrenceId: string;
  }
  // Monitor crossings (declared payloads) and their bookkeeping: settlement
  // emits one crossing event per threshold and one accumulator update per
  // settling commit that changed it.
  | { readonly kind: "lab.gauge_charged" }
  | { readonly kind: "lab.ambient_ignited" }
  | { readonly kind: "lab.collector_dripped" }
  | { readonly kind: "lab.monitors_settled"; readonly accumulator: MonitorAccumulatorV1 }
  | { readonly kind: "lab.collector_toggled"; readonly engaged: boolean }
  | {
    /** Closing the drill decision: `level` is what the release captured (0 on vent). */
    readonly kind: "lab.gauge_captured";
    readonly level: number;
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
  | InteractionRejectionCodeV1
  | TimeTickRejectionCodeV1;

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
  readonly monitors: LabMonitorsStateV1;
  /** Whether any declared monitor is accumulating (the Host reporting gate). */
  readonly monitorReportingActive: boolean;
  /** Whether a realtime-pace monitor is up (the Host rate-pin gate). */
  readonly monitorRealtimeActive: boolean;
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

/** The monitor drill's published face: counters plus the two Host gates. */
export interface LabMonitorsViewV1 {
  readonly gaugeLevel: number;
  readonly ambientIgnitions: number;
  readonly collectorEngaged: boolean;
  readonly collectorUnits: number;
  /** Mirrors {@link LabQueriesV1.monitorReportingActive} for the composer. */
  readonly reportingActive: boolean;
  /** Mirrors {@link LabQueriesV1.monitorRealtimeActive} for the composer. */
  readonly realtimeActive: boolean;
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
  readonly monitors: LabMonitorsViewV1;
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
  readonly event: LabEventV1;
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
  LabEventV1,
  LabRejectionV1,
  LabFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

/**
 * The read-only capability lab.samples provides: command handlers read the
 * collected count through the transaction to gate procedure and shop rules.
 */
export interface LabSamplesReadPortV1 {
  collectedCount(): number;
}

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
    if (kind === "lab.time_tick") {
      if (Object.keys(value).toSorted().join("\0") !== "kind\0tick") {
        throw new TypeError("invalid lab time tick command");
      }
      return Object.freeze({
        kind,
        tick: parseTimeTickV1((value as { readonly tick?: unknown }).tick, "/tick"),
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
      kind !== "lab.begin_drill" &&
      kind !== "lab.toggle_collector" &&
      kind !== "lab.sell_sample" &&
      kind !== "lab.buy_banner"
    ) {
      throw new TypeError("invalid lab command kind");
    }
    return Object.freeze({ kind });
  },
});

const labProcedurePhasesV1 = Object.freeze(["idle", "running", "complete"] as const);

/**
 * Journal admission for every Lab domain event. Events are the public
 * read-side journal, so each payload is validated as strictly as a command.
 */
export const labEventSchemaV1: RuntimeSchemaV1<LabEventV1> = Object.freeze({
  parse(value: unknown): LabEventV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid lab event");
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).toSorted().join("\0");
    const kind = record.kind;
    if (kind === "lab.sample_collected") {
      if (keys !== "kind\0total\0yield") throw new TypeError("invalid lab sample_collected event");
      const sampleYield = parseNonNegativeSafeInteger(record.yield);
      if (sampleYield < 1) throw new TypeError("lab sample yield must be positive");
      return Object.freeze({
        kind,
        yield: sampleYield,
        total: parseNonNegativeSafeInteger(record.total),
      });
    }
    if (kind === "lab.samples_consumed") {
      if (keys !== "amount\0kind\0remaining") {
        throw new TypeError("invalid lab samples_consumed event");
      }
      const amount = parseNonNegativeSafeInteger(record.amount);
      if (amount < 1) throw new TypeError("lab sample consumption must be positive");
      return Object.freeze({
        kind,
        amount,
        remaining: parseNonNegativeSafeInteger(record.remaining),
      });
    }
    if (kind === "lab.procedure_advanced") {
      if (keys !== "kind\0phase\0stepsTaken") {
        throw new TypeError("invalid lab procedure_advanced event");
      }
      const phase = record.phase;
      if (!labProcedurePhasesV1.includes(phase as LabProcedureStateV1["phase"])) {
        throw new TypeError("invalid lab procedure phase");
      }
      return Object.freeze({
        kind,
        phase: phase as LabProcedureStateV1["phase"],
        stepsTaken: parseNonNegativeSafeInteger(record.stepsTaken),
      });
    }
    if (kind === "lab.stage_changed") {
      if (keys !== "kind\0mutations" || !Array.isArray(record.mutations)) {
        throw new TypeError("invalid lab stage_changed event");
      }
      return Object.freeze({
        kind,
        mutations: Object.freeze(
          record.mutations.map((mutation, index) =>
            parseStageMutationV1(mutation, `/mutations/${String(index)}`)
          ),
        ),
      });
    }
    if (kind === "lab.narrative_advanced") {
      if (keys !== "kind\0next") throw new TypeError("invalid lab narrative_advanced event");
      return Object.freeze({ kind, next: labNarrativeStateSchemaV1.parse(record.next) });
    }
    if (kind === "lab.credits_changed") {
      if (keys !== "balance\0delta\0kind") throw new TypeError("invalid lab credits_changed event");
      const delta = record.delta;
      if (typeof delta !== "number" || !Number.isSafeInteger(delta) || delta === 0) {
        throw new TypeError("lab credits delta must be a non-zero safe integer");
      }
      return Object.freeze({
        kind,
        delta,
        balance: parseNonNegativeSafeInteger(record.balance),
      });
    }
    if (kind === "lab.interaction_resolved") {
      if (keys !== "definitionId\0kind\0occurrenceId") {
        throw new TypeError("invalid lab interaction_resolved event");
      }
      if (typeof record.definitionId !== "string" || record.definitionId.length === 0) {
        throw new TypeError("invalid lab interaction definition id");
      }
      return Object.freeze({
        kind,
        definitionId: record.definitionId,
        occurrenceId: parseInteractionOccurrenceIdV1(record.occurrenceId),
      });
    }
    if (
      kind === "lab.gauge_charged" ||
      kind === "lab.ambient_ignited" ||
      kind === "lab.collector_dripped"
    ) {
      if (keys !== "kind") throw new TypeError(`invalid lab ${kind} event`);
      return Object.freeze({ kind });
    }
    if (kind === "lab.monitors_settled") {
      if (keys !== "accumulator\0kind") {
        throw new TypeError("invalid lab monitors_settled event");
      }
      return Object.freeze({
        kind,
        accumulator: parseMonitorAccumulatorV1(record.accumulator, "/accumulator"),
      });
    }
    if (kind === "lab.collector_toggled") {
      if (keys !== "engaged\0kind" || typeof record.engaged !== "boolean") {
        throw new TypeError("invalid lab collector_toggled event");
      }
      return Object.freeze({ kind, engaged: record.engaged });
    }
    if (kind === "lab.gauge_captured") {
      if (keys !== "kind\0level") throw new TypeError("invalid lab gauge_captured event");
      return Object.freeze({ kind, level: parseNonNegativeSafeInteger(record.level) });
    }
    throw new TypeError("invalid lab event kind");
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
  // Both events carry the absolute post-command count computed by the handler
  // from the command-start snapshot, so a command must emit at most one of
  // them; a second same-kind event would clobber, not compose.
  reducers: {
    "lab.sample_collected": (_state, event) => Object.freeze({ collected: event.total }),
    "lab.samples_consumed": (_state, event) => Object.freeze({ collected: event.remaining }),
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
  // Procedure flows gate on the sample stock: the declaration keeps the
  // capability DAG, lifecycle DAG, and dependency vector exercised by a real
  // Story (the conformance rig's job), matching the handler's
  // `transaction.read(labSamplesReadCapabilityV1)` calls.
  requires: { samples: labSamplesReadCapabilityV1 },
  initializesAfter: ["lab.samples"],
  reducers: {
    "lab.procedure_advanced": (_state, event) =>
      Object.freeze({ phase: event.phase, stepsTaken: event.stepsTaken }),
  },
});

function advanceProcedureV1(state: LabProcedureStateV1): LabProcedureStateV1 {
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
  reducers: {
    // The handler validates the mutation batch against command-start state
    // before emitting, so a rejected fold here is a genuine invariant break
    // and faults the commit.
    "lab.stage_changed": (state, event) => {
      const outcome = reduceStageMutationsV1(state, event.mutations);
      if (outcome.kind !== "applied") {
        throw new TypeError("admitted lab stage mutations must apply");
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
  // Sample-consuming menu choices gate on the sample stock.
  requires: { samples: labSamplesReadCapabilityV1 },
  initializesAfter: ["lab.samples"],
  reducers: {
    "lab.narrative_advanced": (_state, event) => event.next,
  },
});

const monitorsModuleV1 = kit.defineStatefulModule({
  id: "lab.monitors",
  contractRevision: 1,
  state: {
    slot: "simulation.monitors",
    schema: labMonitorsStateSchemaV1,
    initial: () => createInitialLabMonitorsStateV1(),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    // Crossing events carry no payload by design: each one means "count one
    // more crossing", so folding is pure increment and batch splits of the
    // same elapsed sum produce identical counters.
    "lab.gauge_charged": (state) => Object.freeze({ ...state, gaugeLevel: state.gaugeLevel + 1 }),
    "lab.ambient_ignited": (state) =>
      Object.freeze({ ...state, ambientIgnitions: state.ambientIgnitions + 1 }),
    "lab.collector_dripped": (state) =>
      Object.freeze({ ...state, collectorUnits: state.collectorUnits + 1 }),
    // Settlement emits at most one accumulator update per commit; it carries
    // the absolute post-settlement record computed from command-start state.
    "lab.monitors_settled": (state, event) =>
      Object.freeze({ ...state, accumulator: event.accumulator }),
    "lab.collector_toggled": (state, event) =>
      Object.freeze({ ...state, collectorEngaged: event.engaged }),
    // The capture's `level` is journal evidence (what the release converted);
    // the fold always resets the gauge for the next decision span.
    "lab.gauge_captured": (state) => Object.freeze({ ...state, gaugeLevel: 0 }),
  },
});

/** Shop economics: selling a sample earns credits, the banner costs them. */
export const labSampleSalePriceV1 = 2;
export const labBannerCostV1 = 3;

const walletModuleV1 = kit.defineStatefulModule({
  id: "lab.wallet",
  contractRevision: 1,
  state: {
    slot: "simulation.wallet",
    schema: labWalletStateSchemaV1,
    initial: () => Object.freeze({ credits: 0 }),
  },
  commandSchema: commandSchemaV1,
  reducers: {
    "lab.credits_changed": (_state, event) => Object.freeze({ credits: event.balance }),
  },
});

const labCompositionV1 = kit.composeModules([
  samplesModuleV1,
  procedureModuleV1,
  stageModuleV1,
  narrativeModuleV1,
  walletModuleV1,
  monitorsModuleV1,
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
  eventSchema: labEventSchemaV1,
  createFault: () => Object.freeze({ code: "lab.executor_failed" as const }),
});

export function createLabGameSimulationV1(): LabGameSimulationV1 {
  const commandExecutor: LabCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      const state = snapshot.state.simulation;

      // The command-start session counters hold `when` arms may read.
      // Monitor crossings land as domain events after this command, so
      // arms watching them surface at the next settlement's t=0 — the
      // same granularity `activeWhen` has.
      const holdSessionRead = Object.freeze({
        collectorUnits: state.monitors.collectorUnits,
      });

      const emitStage = (
        transaction: { emit(event: LabEventV1): void },
        mutations: readonly StageMutationV1[],
      ) => {
        if (mutations.length === 0) return null;
        // Validate against command-start stage state before emitting, so an
        // unappliable batch rejects the command instead of faulting the fold.
        // The pre-check reads command-start state, so a command must emit at
        // most one stage batch; a second would validate against a stale stage.
        const outcome = reduceStageMutationsV1(state.stage, mutations);
        if (outcome.kind === "rejected") return "lab.stage_rejected" as const;
        transaction.emit({ kind: "lab.stage_changed", mutations });
        return null;
      };

      // Every accepted time tick settles the declared monitors with the full
      // reported milliseconds — after the hold fold when one is pending.
      // Predicates and the accumulator read command-start state, so the
      // settlement depends only on the millisecond sum, never the batching.
      const settleSessionTime = (
        transaction: { emit(event: LabEventV1): void },
        elapsedMs: number,
      ) => {
        const settlement = settleMonitorsV1({
          declarations: labMonitorDeclarationsV1,
          accumulator: state.monitors.accumulator,
          elapsedMs,
          state,
        });
        for (const event of settlement.events) transaction.emit(event);
        if (!labMonitorAccumulatorEqualV1(settlement.accumulator, state.monitors.accumulator)) {
          transaction.emit({ kind: "lab.monitors_settled", accumulator: settlement.accumulator });
        }
      };

      if (command.kind === "lab.collect_sample") {
        const sampleYield =
          rng.nextInt(Object.freeze({ purpose: "check:lab.sample_yield", exclusiveMax: 3 })) + 1;
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          transaction.emit({
            kind: "lab.sample_collected",
            yield: sampleYield,
            total: state.samples.collected + sampleYield,
          });
          const stageRejection = emitStage(transaction, labStageMutationsForCollectV1(state.stage));
          if (stageRejection !== null) return transaction.reject({ code: stageRejection });
          return transaction.complete();
        });
      }

      if (command.kind === "lab.begin_calibration" || command.kind === "lab.begin_drill") {
        const entry = command.kind === "lab.begin_calibration"
          ? labNarrativeAtBeginV1
          : labNarrativeAtDrillBeginV1;
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (state.narrative.pending !== null) {
            return transaction.reject({ code: "lab.narrative_busy" });
          }
          const run = runLabNarrativeUntilInteractionV1(
            entry(state.narrative),
            state.stage,
            holdSessionRead,
          );
          transaction.emit({ kind: "lab.narrative_advanced", next: run.narrative });
          const stageRejection = emitStage(transaction, run.stageMutations);
          if (stageRejection !== null) return transaction.reject({ code: stageRejection });
          return transaction.complete();
        });
      }

      if (command.kind === "lab.toggle_collector") {
        // The pending-independent drip switch: legal at any time, even with
        // an interaction pending — that independence is the archetype.
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          transaction.emit({
            kind: "lab.collector_toggled",
            engaged: !state.monitors.collectorEngaged,
          });
          return transaction.complete();
        });
      }

      if (command.kind === "lab.time_tick") {
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          // The queue-front authority for the time verb: the fence check
          // rejects a tick whose hold occurrence is no longer current, so a
          // stale queued report can never pre-fold a successor hold.
          const outcome = evaluateTimeTickV1(state.narrative.pending, command.tick);
          if (outcome.kind === "rejected") {
            return transaction.reject({ code: outcome.code });
          }
          if (outcome.hold === null) {
            // An unfenced tick settles only session-global time consumers —
            // it never touches a pending hold. With no active monitor it
            // commits with an empty journal, the observable scope proof.
            settleSessionTime(transaction, command.tick.elapsedMs);
            return transaction.complete();
          }
          const continuation = labNarrativeAfterTimeTickV1(
            state.narrative,
            command.tick,
            holdSessionRead,
          );
          if (continuation.kind === "holding") {
            // A partial settlement decrements the authoritative remaining
            // milliseconds without consuming the pending boundary: the
            // same occurrence stays pending and the script does not run.
            transaction.emit({ kind: "lab.narrative_advanced", next: continuation.narrative });
            settleSessionTime(transaction, command.tick.elapsedMs);
            return transaction.complete();
          }
          // Expiry — or a `when` arm cutting the hold at its matching
          // instant — consumes the boundary: the script runs to the next
          // interaction inside the same commit.
          transaction.emit({
            kind: "lab.interaction_resolved",
            definitionId: outcome.hold.definitionId,
            occurrenceId: outcome.hold.occurrenceId,
          });
          const run = runLabNarrativeUntilInteractionV1(
            continuation.narrative,
            state.stage,
            holdSessionRead,
          );
          transaction.emit({ kind: "lab.narrative_advanced", next: run.narrative });
          settleSessionTime(transaction, command.tick.elapsedMs);
          const stageRejection = emitStage(transaction, run.stageMutations);
          if (stageRejection !== null) return transaction.reject({ code: stageRejection });
          return transaction.complete();
        });
      }

      if (command.kind === "lab.narrative_resolve") {
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          // The queue-front authority: the shared evaluator that served the
          // action catalog and preview re-checks the expected occurrence,
          // choice availability, and custom payload schema at dispatch time.
          const outcome = evaluateInteractionResolutionV1(
            state.narrative.pending,
            command.expectedOccurrenceId,
            command.resolution,
            labInteractionContextV1(state.narrative.pending, state.samples.collected),
          );
          if (outcome.kind === "rejected") {
            return transaction.reject({ code: outcome.code });
          }
          const pending = state.narrative.pending;
          if (pending === null) throw new TypeError("accepted resolution without pending");
          // A choice may carry a declared cross-module cost: the narrative
          // continuation and the sample consumption commit in one atomic
          // command or not at all.
          const resolution = command.resolution;
          let consumesSamples = 0;
          if (resolution.kind === "choose") {
            const option = labChoiceOptionsForV1(pending.definitionId).find(
              (candidate) => candidate.choiceId === resolution.choiceId,
            );
            consumesSamples = option?.consumesSamples ?? 0;
            if (consumesSamples > state.samples.collected) {
              return transaction.reject({ code: "lab.insufficient_samples" });
            }
          }
          transaction.emit({
            kind: "lab.interaction_resolved",
            definitionId: pending.definitionId,
            occurrenceId: pending.occurrenceId,
          });
          const run = runLabNarrativeUntilInteractionV1(
            labNarrativeAfterResolutionV1(state.narrative, command.resolution),
            state.stage,
            holdSessionRead,
          );
          transaction.emit({ kind: "lab.narrative_advanced", next: run.narrative });
          if (
            pending.definitionId === labDrillDecisionDefinitionIdV1 &&
            resolution.kind === "choose"
          ) {
            // Closing the drill decision converts the gauge atomically:
            // release captures the charged level as credits, vent captures
            // nothing; either way the gauge resets for the next span.
            const captured = resolution.choiceId === labDrillReleaseChoiceIdV1
              ? state.monitors.gaugeLevel
              : 0;
            transaction.emit({ kind: "lab.gauge_captured", level: captured });
            // Drop the gauge's sub-threshold remainder in the same commit:
            // `clear` retention only runs inside a time settlement, and the
            // reporting gate may close with this resolution, so without the
            // explicit drop a stale partial charge would leak into the next
            // drill span (and into Saves taken between spans).
            if (Object.hasOwn(state.monitors.accumulator, labGaugeMonitorIdV1)) {
              const cleared: Record<string, number> = {};
              for (const [id, ms] of Object.entries(state.monitors.accumulator)) {
                if (id !== labGaugeMonitorIdV1) cleared[id] = ms;
              }
              transaction.emit({
                kind: "lab.monitors_settled",
                accumulator: Object.freeze(cleared),
              });
            }
            if (captured > 0) {
              transaction.emit({
                kind: "lab.credits_changed",
                delta: captured,
                balance: state.wallet.credits + captured,
              });
            }
          }
          if (consumesSamples > 0) {
            transaction.emit({
              kind: "lab.samples_consumed",
              amount: consumesSamples,
              remaining: state.samples.collected - consumesSamples,
            });
          }
          const stageRejection = emitStage(transaction, run.stageMutations);
          if (stageRejection !== null) return transaction.reject({ code: stageRejection });
          return transaction.complete();
        });
      }

      if (command.kind === "lab.sell_sample") {
        return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
          if (transaction.read(labSamplesReadCapabilityV1).collectedCount() < 1) {
            return transaction.reject({ code: "lab.insufficient_samples" });
          }
          // One committed command, two slices: the sample leaves the samples
          // module and the credits land in the wallet, atomically.
          transaction.emit({
            kind: "lab.samples_consumed",
            amount: 1,
            remaining: state.samples.collected - 1,
          });
          transaction.emit({
            kind: "lab.credits_changed",
            delta: labSampleSalePriceV1,
            balance: state.wallet.credits + labSampleSalePriceV1,
          });
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
          transaction.emit({
            kind: "lab.credits_changed",
            delta: -labBannerCostV1,
            balance: state.wallet.credits - labBannerCostV1,
          });
          const stageRejection = emitStage(transaction, labStageMutationsForBannerV1());
          if (stageRejection !== null) return transaction.reject({ code: stageRejection });
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
          transaction.emit({
            kind: "lab.samples_consumed",
            amount: 1,
            remaining: state.samples.collected - 1,
          });
          const nextProcedure = advanceProcedureV1(state.procedure);
          transaction.emit({
            kind: "lab.procedure_advanced",
            phase: nextProcedure.phase,
            stepsTaken: nextProcedure.stepsTaken,
          });
          const stageRejection = emitStage(
            transaction,
            labStageMutationsForProgressV1(state.stage, {
              completed: nextProcedure.phase === "complete",
              samplesRemaining: state.samples.collected - 1,
            }),
          );
          if (stageRejection !== null) return transaction.reject({ code: stageRejection });
          return transaction.complete();
        });
      }

      return labTransactionRunnerV1.execute(snapshot, rng, (transaction) => {
        if (command.kind === "lab.begin_procedure") {
          if (state.procedure.phase !== "idle") {
            return transaction.reject({ code: "lab.procedure_already_running" });
          }
          if (transaction.read(labSamplesReadCapabilityV1).collectedCount() < 1) {
            return transaction.reject({ code: "lab.samples_required" });
          }
          transaction.emit({
            kind: "lab.procedure_advanced",
            phase: "running",
            stepsTaken: state.procedure.stepsTaken,
          });
          const stageRejection = emitStage(transaction, labStageMutationsForBeginV1());
          if (stageRejection !== null) return transaction.reject({ code: stageRejection });
          return transaction.complete();
        }
        if (state.procedure.phase !== "running") {
          return transaction.reject({ code: "lab.procedure_not_running" });
        }
        const nextProcedure = advanceProcedureV1(state.procedure);
        transaction.emit({
          kind: "lab.procedure_advanced",
          phase: nextProcedure.phase,
          stepsTaken: nextProcedure.stepsTaken,
        });
        const stageRejection = emitStage(
          transaction,
          labStageMutationsForProgressV1(state.stage, {
            completed: nextProcedure.phase === "complete",
            samplesRemaining: null,
          }),
        );
        if (stageRejection !== null) return transaction.reject({ code: stageRejection });
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
    eventSchema: labEventSchemaV1,
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
        monitors: state.simulation.monitors,
        monitorReportingActive: labMonitorReportingActiveV1(state.simulation),
        monitorRealtimeActive: labMonitorRealtimeActiveV1(state.simulation),
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
        monitors: Object.freeze({
          gaugeLevel: queries.monitors.gaugeLevel,
          ambientIgnitions: queries.monitors.ambientIgnitions,
          collectorEngaged: queries.monitors.collectorEngaged,
          collectorUnits: queries.monitors.collectorUnits,
          reportingActive: queries.monitorReportingActive,
          realtimeActive: queries.monitorRealtimeActive,
        }),
      });
    },
  });
}
