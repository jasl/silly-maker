// SPDX-License-Identifier: MIT
import type {
  InteractionResolutionContextV1,
  InteractionResolutionV1,
  NarrativeHistoryV1,
  PendingInteractionV1,
  SemanticStageStateV1,
  StageMutationV1,
  StrictJsonObjectV1,
  TimeTickV1,
} from "@sillymaker/base";
import {
  appendNarrativeHistoryV1,
  emptyNarrativeHistoryV1,
  interactionOccurrenceIdV1,
  parsePendingInteractionV1,
  reduceAdmittedStageMutationsV1,
  settleHoldTimelineV1,
} from "@sillymaker/base";

import { labVoiceForSayV1 } from "./audio.ts";

/**
 * The Engine Lab calibration narrative: a small typed script whose runner
 * executes pure nodes (stage mutations) automatically and stops at every
 * PendingInteraction boundary — say, choice, hold, presentation barrier,
 * and one schema-registered custom surface. Interaction instances live in
 * authoritative State; the script itself is code, never saved.
 */

export interface LabNarrativeStateV1 {
  readonly phase: "idle" | "active" | "completed";
  /** The node the runner will execute next; null when idle/completed. */
  readonly cursor: string | null;
  readonly pending: PendingInteractionV1 | null;
  /** Monotonic occurrence sequence; never resets, so re-entry re-fences. */
  readonly sequence: number;
  /** Evidence of the custom calibration resolution. */
  readonly calibration: number | null;
  /**
   * The relationship value with the beta researcher: narrative-owned
   * authoritative data raised by completing a calibration run. Branch
   * nodes route on it — the AI-authoring canary for
   * relationship-conditioned narrative.
   */
  readonly rapport: number;
  /**
   * The player-readable NarrativeHistory: authoritative State that enters
   * Saves and restores to the exact occurrence. Independent of the
   * CommandLog, the Seen registry (Host profile), and Debug replay. M3
   * rollback restores it together with the checkpoint Snapshot.
   */
  readonly history: NarrativeHistoryV1;
}

export function createInitialLabNarrativeStateV1(): LabNarrativeStateV1 {
  return ({
    phase: "idle" as const,
    cursor: null,
    pending: null,
    sequence: 0,
    calibration: null,
    rapport: 0,
    history: emptyNarrativeHistoryV1,
  });
}

export interface LabChoiceOptionV1 {
  readonly choiceId: string;
  readonly textId: string;
  readonly requiresSamples: number;
  /** Samples atomically consumed by the cross-module resolve command. */
  readonly consumesSamples: number;
  readonly next: string;
}

/**
 * What a hold `when` arm reads: the working narrative rapport (updated by
 * the hold's own tick crossings inside the walk, so tick-driven arms cut
 * at the exact crossing instant) plus the command-start session counters
 * (monitor crossings land as domain events after the command, so
 * monitor-driven arms surface at the next settlement's t=0 — the same
 * granularity seam `activeWhen` already has). `collectorEngaged` is the
 * input axis: an ordinary write command flips it between settlements, so
 * input-driven arms share the next-settlement granularity with monitors.
 */
export interface LabHoldWhenContextV1 {
  readonly rapport: number;
  readonly collectorUnits: number;
  readonly collectorEngaged: boolean;
}

export interface LabHoldWhenArmV1 {
  /** Pure working-state predicate; first match wins in declared order. */
  readonly matches: (context: LabHoldWhenContextV1) => boolean;
  readonly next: string;
}

/**
 * The command-start session counters a hold `when` arm may read, captured
 * once per command by the simulation executor.
 */
export interface LabHoldSessionReadV1 {
  readonly collectorUnits: number;
  readonly collectorEngaged: boolean;
}

export type LabNarrativeNodeV1 =
  | {
    readonly kind: "say";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly speakerTextId: string | null;
    readonly textId: string;
    readonly next: string;
  }
  | {
    readonly kind: "branch";
    readonly nodeId: string;
    /** Static successor annotation for the lint/prediction graph. */
    readonly successors: readonly string[];
    /** Pure relationship-conditioned routing; must pick a successor. */
    readonly choose: (context: { readonly rapport: number }) => string;
  }
  | {
    readonly kind: "stage";
    readonly nodeId: string;
    readonly mutations: (stage: SemanticStageStateV1) => readonly StageMutationV1[];
    /**
     * Static annotation of every content this node may show or replace,
     * for the lint/prediction graph. A conformance test runs the actual
     * mutation functions and proves the annotation stays honest.
     */
    readonly mayShow: readonly string[];
    readonly next: string;
  }
  | {
    readonly kind: "choice";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly promptTextId: string;
    readonly options: readonly LabChoiceOptionV1[];
  }
  | {
    readonly kind: "hold";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly durationMs: number;
    readonly skippable: boolean;
    /**
     * Optional authoritative tick effect settled by threshold crossings:
     * every `everyMs` of consumed hold time deepens rapport by
     * `rapportPerTick` inside the same time-tick commit. The shared
     * crossing arithmetic keeps the gain identical for any batch split of
     * the same millisecond sum — the E2 conformance canary.
     */
    readonly tick?: { readonly everyMs: number; readonly rapportPerTick: number };
    /**
     * Declared-condition reroute arms, evaluated on the hold's own
     * occurrence timeline: at t=0 of every fenced settlement and again
     * after each applied crossing. The first match truncates the hold at
     * that instant — remaining milliseconds are discarded, never folded
     * into a successor. At node entry a matching arm reroutes before the
     * hold ever opens (no occurrence is spent).
     */
    readonly when?: readonly LabHoldWhenArmV1[];
    readonly next: string;
  }
  | {
    readonly kind: "barrier";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly expectedTransitionId: string;
    readonly loadRecovery: "replay" | "settle";
    readonly next: string;
  }
  | {
    readonly kind: "custom";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly surfaceId: string;
    readonly params: StrictJsonObjectV1;
    readonly next: string;
  }
  | { readonly kind: "end"; readonly nodeId: string };

export {
  labCalibrationEntryNodeIdV1,
  labCalibrationNarrativeNodeIdsV1,
  labCalibrationNarrativeUnitIdV1,
  labDrillChamberNodeIdV1,
  labDrillNarrativeNodeIdsV1,
  labDrillNarrativeUnitIdV1,
  labNarrativeNodeIdsV1,
  labNarrativePositionForCursorV1,
} from "./narrative-topology.ts";
import { labCalibrationEntryNodeIdV1, labDrillChamberNodeIdV1 } from "./narrative-topology.ts";

export const labCalibrationSurfaceIdV1 = "surface.e2e.calibration";

/**
 * The approach choice's "When Cancel" option. Keeping this small interaction
 * catalog in startup metadata lets UI preview availability without loading a
 * control-plan chunk; the loaded calibration plan consumes the same objects.
 */
export const labCancelChoiceIdV1 = "choice.e2e.cal.cancel";

export const labDrillDecisionDefinitionIdV1 = "interaction.e2e.drill-decision";
export const labDrillReleaseChoiceIdV1 = "choice.e2e.drill.release";
export const labDrillVentChoiceIdV1 = "choice.e2e.drill.vent";
export const labDrillVigilChoiceIdV1 = "choice.e2e.drill.vigil";
export const labDrillStakeoutChoiceIdV1 = "choice.e2e.drill.stakeout";
export const labDrillTripwireChoiceIdV1 = "choice.e2e.drill.tripwire";
export const labDrillVigilNodeIdV1 = "node.e2e.drill.vigil";
export const labDrillStakeoutNodeIdV1 = "node.e2e.drill.stakeout";
export const labDrillTripwireNodeIdV1 = "node.e2e.drill.tripwire";
export const labDrillVigilTickEveryMsV1 = 300;
export const labDrillVigilDurationMsV1 = 800;
export const labDrillVigilRapportThresholdV1 = 2;
export const labDrillStakeoutDurationMsV1 = 1_500;
export const labDrillTripwireDurationMsV1 = 1_500;

export const labCalibrationApproachOptionsV1: readonly LabChoiceOptionV1[] = [
  {
    choiceId: "choice.e2e.cal.basic",
    textId: "text.e2e.lab.narrative.cal.basic",
    requiresSamples: 0,
    consumesSamples: 0,
    next: "node.e2e.cal.basic-mark",
  },
  {
    choiceId: "choice.e2e.cal.precise",
    textId: "text.e2e.lab.narrative.cal.precise",
    requiresSamples: 1,
    consumesSamples: 1,
    next: "node.e2e.cal.precise-mark",
  },
  {
    choiceId: labCancelChoiceIdV1,
    textId: "text.e2e.lab.narrative.cal.cancel",
    requiresSamples: 0,
    consumesSamples: 0,
    next: "node.e2e.cal.approach",
  },
];

export const labDrillDecisionOptionsV1: readonly LabChoiceOptionV1[] = [
  {
    choiceId: labDrillReleaseChoiceIdV1,
    textId: "text.e2e.lab.narrative.drill.release",
    requiresSamples: 0,
    consumesSamples: 0,
    next: "node.e2e.drill.result",
  },
  {
    choiceId: labDrillVentChoiceIdV1,
    textId: "text.e2e.lab.narrative.drill.vent",
    requiresSamples: 0,
    consumesSamples: 0,
    next: "node.e2e.drill.result",
  },
  {
    choiceId: labDrillVigilChoiceIdV1,
    textId: "text.e2e.lab.narrative.drill.vigil",
    requiresSamples: 0,
    consumesSamples: 0,
    next: labDrillVigilNodeIdV1,
  },
  {
    choiceId: labDrillStakeoutChoiceIdV1,
    textId: "text.e2e.lab.narrative.drill.stakeout",
    requiresSamples: 0,
    consumesSamples: 0,
    next: labDrillStakeoutNodeIdV1,
  },
  {
    choiceId: labDrillTripwireChoiceIdV1,
    textId: "text.e2e.lab.narrative.drill.tripwire",
    requiresSamples: 0,
    consumesSamples: 0,
    next: labDrillTripwireNodeIdV1,
  },
];

export interface LabNarrativePlanV1 {
  readonly unitId: string;
  readonly nodeIds: readonly string[];
  readonly nodesById: ReadonlyMap<string, LabNarrativeNodeV1>;
}

/** Cold-compiles one loaded unit to a direct node plan. */
export function defineLabNarrativePlanV1(
  unitId: string,
  nodes: readonly LabNarrativeNodeV1[],
): LabNarrativePlanV1 {
  const nodesById = new Map<string, LabNarrativeNodeV1>();
  for (const node of nodes) {
    if (nodesById.has(node.nodeId)) {
      throw new TypeError(`e2e.narrative_node_duplicate:${node.nodeId}`);
    }
    nodesById.set(node.nodeId, node);
  }
  return { unitId, nodeIds: [...nodesById.keys()], nodesById };
}

function requireNodeV1(plan: LabNarrativePlanV1, nodeId: string): LabNarrativeNodeV1 {
  const node = plan.nodesById.get(nodeId);
  if (node === undefined) throw new TypeError(`e2e.narrative_node_missing:${nodeId}`);
  return node;
}

/** The single choice-availability rule shared by view, preview, and dispatch. */
export function labChoiceBlockedByV1(
  option: LabChoiceOptionV1,
  samplesCollected: number,
): "lab.narrative_choice_locked" | null {
  return samplesCollected >= option.requiresSamples ? null : "lab.narrative_choice_locked";
}

export function labChoiceOptionsForV1(definitionId: string): readonly LabChoiceOptionV1[] {
  if (definitionId === "interaction.e2e.cal-approach") {
    return labCalibrationApproachOptionsV1;
  }
  if (definitionId === labDrillDecisionDefinitionIdV1) {
    return labDrillDecisionOptionsV1;
  }
  return [];
}

/** Schema-registered custom surfaces: payload validation without callbacks. */
export function labIsCustomPayloadValidV1(
  surfaceId: string,
  params: StrictJsonObjectV1,
  payload: StrictJsonObjectV1,
): boolean {
  if (surfaceId !== labCalibrationSurfaceIdV1) return false;
  const min = typeof params.min === "number" ? params.min : Number.NaN;
  const max = typeof params.max === "number" ? params.max : Number.NaN;
  const keys = Object.keys(payload);
  return (
    keys.length === 1 &&
    typeof payload.value === "number" &&
    Number.isSafeInteger(payload.value) &&
    payload.value >= min &&
    payload.value <= max
  );
}

/**
 * The one resolution context shared by the action catalog, preview, and
 * queue-front dispatch: choice availability comes from the same
 * requiresSamples rule, custom payloads from the same registered schema.
 */
export function labInteractionContextV1(
  pending: PendingInteractionV1 | null,
  samplesCollected: number,
): InteractionResolutionContextV1 {
  return {
    isChoiceEnabled(choiceId: string): boolean {
      if (pending === null || pending.kind !== "choice") return false;
      const option = labChoiceOptionsForV1(pending.definitionId).find(
        (candidate) => candidate.choiceId === choiceId,
      );
      return option !== undefined && labChoiceBlockedByV1(option, samplesCollected) === null;
    },
    isCustomPayloadValid(surfaceId: string, payload: StrictJsonObjectV1): boolean {
      if (pending === null || pending.kind !== "custom") return false;
      return labIsCustomPayloadValidV1(surfaceId, pending.params, payload);
    },
  };
}

export interface LabNarrativeRunResultV1 {
  readonly narrative: LabNarrativeStateV1;
  readonly stageMutations: readonly StageMutationV1[];
}

function pendingForNodeV1(node: LabNarrativeNodeV1, sequence: number): PendingInteractionV1 {
  const occurrenceId = interactionOccurrenceIdV1(sequence);
  switch (node.kind) {
    case "say":
      return parsePendingInteractionV1({
        kind: "say",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        speakerTextId: node.speakerTextId,
        textId: node.textId,
        advancePolicy: "confirm",
      });
    case "choice":
      return parsePendingInteractionV1({
        kind: "choice",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        promptTextId: node.promptTextId,
        options: node.options.map(({ choiceId, textId }) => ({ choiceId, textId })),
      });
    case "hold":
      return parsePendingInteractionV1({
        kind: "hold",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        totalMs: node.durationMs,
        remainingMs: node.durationMs,
        skippable: node.skippable,
      });
    case "barrier":
      return parsePendingInteractionV1({
        kind: "presentation_barrier",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        expectedTransitionId: node.expectedTransitionId,
        loadRecovery: node.loadRecovery,
      });
    case "custom":
      return parsePendingInteractionV1({
        kind: "custom",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        surfaceId: node.surfaceId,
        params: node.params,
      });
    default:
      throw new TypeError(`e2e.narrative_node_not_interactive:${node.nodeId}`);
  }
}

/**
 * Executes pure nodes from the cursor until the next PendingInteraction or
 * the end of the script. Stage mutations are collected for the stage owner
 * and simultaneously applied to a local view so later nodes observe them.
 * A hold node whose `when` arm already matches at entry reroutes without
 * opening the hold (no occurrence is spent). Deterministic: same
 * narrative state, stage, and session read produce the same result.
 */
export function runLabNarrativeUntilInteractionV1(
  plan: LabNarrativePlanV1,
  narrative: LabNarrativeStateV1,
  stage: SemanticStageStateV1,
  session: LabHoldSessionReadV1,
): LabNarrativeRunResultV1 {
  if (narrative.cursor === null) {
    throw new TypeError("e2e.narrative_cursor_missing");
  }
  let cursor: string | null = narrative.cursor;
  let sequence = narrative.sequence;
  let localStage = stage;
  const collected: StageMutationV1[] = [];

  for (let steps = 0; steps < 64; steps += 1) {
    if (cursor === null) break;
    const node = requireNodeV1(plan, cursor);
    if (node.kind === "branch") {
      const next = node.choose({ rapport: narrative.rapport });
      if (!node.successors.includes(next)) {
        throw new TypeError(`e2e.narrative_branch_invalid:${node.nodeId}`);
      }
      cursor = next;
      continue;
    }
    if (node.kind === "stage") {
      const mutations = node.mutations(localStage);
      if (mutations.length > 0) {
        const outcome = reduceAdmittedStageMutationsV1(localStage, mutations);
        if (outcome.kind !== "applied") {
          throw new TypeError(`e2e.narrative_stage_invalid:${node.nodeId}`);
        }
        localStage = outcome.state;
        collected.push(...mutations);
      }
      cursor = node.next;
      continue;
    }
    if (node.kind === "hold" && node.when !== undefined) {
      const arm = node.when.find((candidate) =>
        candidate.matches({
          rapport: narrative.rapport,
          collectorUnits: session.collectorUnits,
          collectorEngaged: session.collectorEngaged,
        })
      );
      if (arm !== undefined) {
        cursor = arm.next;
        continue;
      }
    }
    if (node.kind === "end") {
      return ({
        narrative: {
          phase: "completed" as const,
          cursor: null,
          pending: null,
          sequence,
          calibration: narrative.calibration,
          // Completing a calibration run deepens the relationship; branch
          // nodes route on this the next time the script runs.
          rapport: narrative.rapport + 1,
          history: narrative.history,
        },
        stageMutations: collected,
      });
    }
    sequence += 1;
    return ({
      narrative: {
        phase: "active" as const,
        cursor: node.nodeId,
        pending: pendingForNodeV1(node, sequence),
        sequence,
        calibration: narrative.calibration,
        rapport: narrative.rapport,
        history: narrative.history,
      },
      stageMutations: collected,
    });
  }
  throw new TypeError("e2e.narrative_runaway_script");
}

/**
 * Applies an accepted input resolution to the pending node: moves the
 * cursor to the resolution's continuation and records custom outcomes.
 * Always consumes the pending boundary — holds are pure time-settlement
 * boundaries and never reach here (the shared evaluator rejects every
 * input resolution against them). Validation already happened in that
 * evaluator.
 */
export function labNarrativeAfterResolutionV1(
  plan: LabNarrativePlanV1,
  narrative: LabNarrativeStateV1,
  resolution: InteractionResolutionV1,
): LabNarrativeStateV1 {
  const pending = narrative.pending;
  if (pending === null || narrative.cursor === null) {
    throw new TypeError("e2e.narrative_nothing_pending");
  }
  const node = requireNodeV1(plan, narrative.cursor);
  let next: string;
  let calibration = narrative.calibration;
  let history = narrative.history;
  if (node.kind === "choice" && resolution.kind === "choose") {
    const option = node.options.find((candidate) => candidate.choiceId === resolution.choiceId);
    if (option === undefined) throw new TypeError("e2e.narrative_choice_missing");
    next = option.next;
    history = appendNarrativeHistoryV1(history, {
      kind: "choice",
      occurrenceId: pending.occurrenceId,
      definitionId: pending.definitionId,
      seenRevision: pending.seenRevision,
      speakerTextId: null,
      textId: option.textId,
      voiceAssetId: null,
    });
  } else if (node.kind === "custom" && resolution.kind === "custom") {
    const value = resolution.payload.value;
    if (typeof value !== "number") throw new TypeError("e2e.narrative_payload_missing");
    calibration = value;
    next = node.next;
  } else if (node.kind === "say") {
    next = node.next;
    history = appendNarrativeHistoryV1(history, {
      kind: "say",
      occurrenceId: pending.occurrenceId,
      definitionId: pending.definitionId,
      seenRevision: pending.seenRevision,
      speakerTextId: node.speakerTextId,
      textId: node.textId,
      voiceAssetId: labVoiceForSayV1(pending.definitionId)?.assetId ?? null,
    });
  } else if (node.kind === "barrier") {
    next = node.next;
  } else {
    throw new TypeError(`e2e.narrative_resolution_mismatch:${node.nodeId}`);
  }
  return ({
    phase: "active" as const,
    cursor: next,
    pending: null,
    sequence: narrative.sequence,
    calibration,
    rapport: narrative.rapport,
    history,
  });
}

/**
 * The continuation of an accepted hold-scoped time tick: `holding` is a
 * partial settlement — the same occurrence stays pending with its
 * authoritative `remainingMs` decremented and the caller commits that
 * state without running the script; `advanced` means the boundary was
 * consumed — by expiry, or by a `when` arm truncating the hold at its
 * matching instant — and the caller runs the script from the
 * continuation's cursor. The settlement walks the shared occurrence
 * timeline: crossings apply in walk order (each one settles the node's
 * declared tick effect), arms re-evaluate at t=0 and after every
 * crossing, and the first match cuts the hold there — later
 * crossings inside the same report never run and the discarded remainder
 * is never folded anywhere. Partial and single-shot deliveries of the
 * same millisecond sum produce identical rapport, cut instants, and
 * terminal states. The tick's hold fence was already checked by
 * `evaluateTimeTickV1`.
 */
export type LabNarrativeTimeContinuationV1 =
  | { readonly kind: "advanced"; readonly narrative: LabNarrativeStateV1 }
  | { readonly kind: "holding"; readonly narrative: LabNarrativeStateV1 };

export function labNarrativeAfterTimeTickV1(
  plan: LabNarrativePlanV1,
  narrative: LabNarrativeStateV1,
  tick: TimeTickV1,
  session: LabHoldSessionReadV1,
): LabNarrativeTimeContinuationV1 {
  const pending = narrative.pending;
  if (pending === null || pending.kind !== "hold" || narrative.cursor === null) {
    throw new TypeError("e2e.narrative_no_hold_pending");
  }
  const node = requireNodeV1(plan, narrative.cursor);
  if (node.kind !== "hold") {
    throw new TypeError(`e2e.narrative_resolution_mismatch:${node.nodeId}`);
  }
  let rapport = narrative.rapport;
  const arms = node.when ?? [];
  const settlement = settleHoldTimelineV1({
    pending,
    elapsedMs: tick.elapsedMs,
    ...(node.tick !== undefined ? { tickEveryMs: node.tick.everyMs } : {}),
    arms: arms.map((arm) => () =>
      arm.matches({
        rapport,
        collectorUnits: session.collectorUnits,
        collectorEngaged: session.collectorEngaged,
      })
    ),
    onCrossing: (crossing) => {
      if (crossing.kind === "tick" && node.tick !== undefined) {
        rapport += node.tick.rapportPerTick;
      }
    },
  });
  if (settlement.kind === "holding") {
    return ({
      kind: "holding" as const,
      narrative: { ...narrative, pending: settlement.pending, rapport },
    });
  }
  const cursor = settlement.kind === "rerouted" ? arms[settlement.armIndex]?.next : node.next;
  if (cursor === undefined) {
    throw new TypeError(`e2e.narrative_hold_arm_missing:${node.nodeId}`);
  }
  return ({
    kind: "advanced" as const,
    narrative: {
      phase: "active" as const,
      cursor,
      pending: null,
      sequence: narrative.sequence,
      calibration: narrative.calibration,
      rapport,
      history: narrative.history,
    },
  });
}

export function labNarrativeAtBeginV1(narrative: LabNarrativeStateV1): LabNarrativeStateV1 {
  return ({
    phase: "active" as const,
    cursor: labCalibrationEntryNodeIdV1,
    pending: null,
    sequence: narrative.sequence,
    calibration: narrative.calibration,
    rapport: narrative.rapport,
    history: narrative.history,
  });
}

/** Enter the monitor drill; same re-entry semantics as the cal run. */
export function labNarrativeAtDrillBeginV1(narrative: LabNarrativeStateV1): LabNarrativeStateV1 {
  return ({
    phase: "active" as const,
    cursor: labDrillChamberNodeIdV1,
    pending: null,
    sequence: narrative.sequence,
    calibration: narrative.calibration,
    rapport: narrative.rapport,
    history: narrative.history,
  });
}
