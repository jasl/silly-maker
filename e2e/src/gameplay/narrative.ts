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
  parseStageMutationV1,
  reduceStageMutationsV1,
  settleHoldTimelineV1,
} from "@sillymaker/base";

import { labVoiceForSayV1 } from "./audio.ts";

import { labStageContentIdsV1, labStageTagsV1 } from "../stage-ids.ts";

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
  return Object.freeze({
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
    /**
     * Optional Host stage-input hint carried onto the pending verbatim:
     * `shared` keeps the stage gameplay layers input-reachable while this
     * menu is up (the night-menu shape). Never read by the runner.
     */
    readonly stageInput?: "isolated" | "shared";
  }
  | {
    readonly kind: "hold";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly durationMs: number;
    readonly skippable: boolean;
    /** Same Host hint as on choice nodes; never read by the runner. */
    readonly stageInput?: "isolated" | "shared";
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

const propsLayerV1 = "layer.e2e.props";
const charactersLayerV1 = "layer.e2e.characters";
const backgroundLayerV1 = "layer.e2e.background";

function stageBatchV1(batch: readonly unknown[]): readonly StageMutationV1[] {
  return Object.freeze(
    batch.map((mutation, index) => parseStageMutationV1(mutation, `/mutations/${String(index)}`)),
  );
}

export const labCalibrationSurfaceIdV1 = "surface.e2e.calibration";
export const labCalibrationEntryNodeIdV1 = "node.e2e.cal.enter-alpha";

/**
 * The approach choice's "When Cancel" option: it loops back to the same
 * choice node, so the runner re-presents the menu under a fresh occurrence
 * (the MV cancel semantic). The Lab UI resolves it on primary `pointerup`
 * and arms the stage pointer gesture fence — the vertical proof that a
 * dismiss which sync-unmounts its surface cannot leak the browser's
 * synthesized `click` into whatever renders underneath.
 */
export const labCancelChoiceIdV1 = "choice.e2e.cal.cancel";

/**
 * The monitor drill: a second entry point exercising all three declared
 * monitor archetypes against real narrative shapes. The chamber say is the
 * scene-scoped ambient span (self-ignition while the player reads), the
 * decision choice is the realtime gauge span (charge rises under a live
 * menu and converts to credits on release), and the collector drip runs
 * pending-independently on its own toggle. The drill shares the cal
 * script's runner, fences, and history rules.
 */
export const labDrillChamberNodeIdV1 = "node.e2e.drill.chamber";
export const labDrillDecisionDefinitionIdV1 = "interaction.e2e.drill-decision";
export const labDrillReleaseChoiceIdV1 = "choice.e2e.drill.release";
export const labDrillVentChoiceIdV1 = "choice.e2e.drill.vent";

/**
 * The hold `when` consumers: three drill paths locking the three declared
 * predicate granularities.
 *
 * - The **vigil** hold's own tick effect raises rapport; its arm cuts at
 *   the exact crossing instant that lifts rapport across the threshold —
 *   the same-instant granularity. With enough rapport at entry the hold
 *   never opens at all.
 * - The **stakeout** hold watches the collector drip — session state a
 *   monitor writes. Drips land as domain events after the settling
 *   command, so the arm sees them at the next fenced settlement's t=0 —
 *   the next-settlement granularity.
 * - The **tripwire** hold watches the collector switch itself — session
 *   state an ordinary input command writes. The mid-hold-input pattern:
 *   `lab.engage_collector` is fenced to this hold's occurrence, only
 *   writes state (never touches pending, time, or routing), and the arm
 *   reads the committed switch at the next fenced settlement's t=0.
 */
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
/**
 * Wide enough for the browser shared-stage-input conformance to land a
 * real pointer click inside the watch under CI variance; every headless
 * expiry test ticks the constant explicitly, so the width costs nothing.
 */
export const labDrillTripwireDurationMsV1 = 6_000;

export const labNarrativeScriptV1: readonly LabNarrativeNodeV1[] = [
  {
    kind: "stage",
    nodeId: "node.e2e.cal.enter-alpha",
    mutations: (stage) =>
      stageHasTagV1(stage, charactersLayerV1, labStageTagsV1.alpha) ? [] : stageBatchV1([
        {
          kind: "show",
          layerId: charactersLayerV1,
          tag: labStageTagsV1.alpha,
          contentId: labStageContentIdsV1.characterAlpha,
          zOrder: 10,
          placement: {
            x: 480,
            y: 860,
            scalePermille: 1000,
            opacityPermille: 1000,
            mirrored: false,
          },
          appearance: { pose: "standing", expression: "neutral" },
        },
      ]),
    mayShow: [labStageContentIdsV1.characterAlpha],
    next: "node.e2e.cal.intro",
  },
  {
    kind: "say",
    nodeId: "node.e2e.cal.intro",
    definitionId: "interaction.e2e.cal-intro",
    seenRevision: 1,
    speakerTextId: "text.e2e.lab.narrative.speaker.alpha",
    textId: "text.e2e.lab.narrative.cal.intro",
    next: "node.e2e.cal.show-beacon",
  },
  {
    kind: "stage",
    nodeId: "node.e2e.cal.show-beacon",
    mutations: (stage) =>
      stageHasTagV1(stage, propsLayerV1, labStageTagsV1.beacon) ? [] : stageBatchV1([
        {
          kind: "show",
          layerId: propsLayerV1,
          tag: labStageTagsV1.beacon,
          contentId: labStageContentIdsV1.propBeacon,
          zOrder: 6,
          placement: {
            x: 360,
            y: 760,
            scalePermille: 900,
            opacityPermille: 1000,
            mirrored: false,
          },
        },
      ]),
    mayShow: [labStageContentIdsV1.propBeacon],
    next: "node.e2e.cal.enter-beta",
  },
  {
    kind: "stage",
    nodeId: "node.e2e.cal.enter-beta",
    mutations: (stage) =>
      stageHasTagV1(stage, charactersLayerV1, labStageTagsV1.beta) ? [] : stageBatchV1([
        {
          kind: "show",
          layerId: charactersLayerV1,
          tag: labStageTagsV1.beta,
          contentId: labStageContentIdsV1.characterBeta,
          zOrder: 11,
          placement: {
            x: 1120,
            y: 860,
            scalePermille: 1000,
            opacityPermille: 1000,
            mirrored: true,
          },
          appearance: { pose: "standing", expression: "neutral" },
        },
      ]),
    mayShow: [labStageContentIdsV1.characterBeta],
    next: "node.e2e.cal.beta-gate",
  },
  {
    kind: "branch",
    nodeId: "node.e2e.cal.beta-gate",
    successors: ["node.e2e.cal.beta-note", "node.e2e.cal.beta-note-warm"],
    choose: ({ rapport }) =>
      rapport >= 1 ? "node.e2e.cal.beta-note-warm" : "node.e2e.cal.beta-note",
  },
  {
    kind: "say",
    nodeId: "node.e2e.cal.beta-note-warm",
    definitionId: "interaction.e2e.cal-beta-warm",
    seenRevision: 1,
    speakerTextId: "text.e2e.lab.narrative.speaker.beta",
    textId: "text.e2e.lab.narrative.cal.beta.warm",
    next: "node.e2e.cal.beta-react",
  },
  {
    kind: "say",
    nodeId: "node.e2e.cal.beta-note",
    definitionId: "interaction.e2e.cal-beta-note",
    seenRevision: 1,
    speakerTextId: "text.e2e.lab.narrative.speaker.beta",
    textId: "text.e2e.lab.narrative.cal.beta",
    next: "node.e2e.cal.beta-react",
  },
  {
    kind: "stage",
    nodeId: "node.e2e.cal.beta-react",
    mutations: () =>
      stageBatchV1([
        {
          kind: "setAppearance",
          layerId: charactersLayerV1,
          tag: labStageTagsV1.beta,
          appearance: { pose: "standing", expression: "focused" },
        },
      ]),
    mayShow: [],
    next: "node.e2e.cal.approach",
  },
  {
    kind: "choice",
    nodeId: "node.e2e.cal.approach",
    definitionId: "interaction.e2e.cal-approach",
    seenRevision: 1,
    promptTextId: "text.e2e.lab.narrative.cal.approach",
    options: [
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
        // When Cancel: re-present this choice with the next occurrence.
        // The interaction boundary breaks the cycle for the graph lint.
        choiceId: labCancelChoiceIdV1,
        textId: "text.e2e.lab.narrative.cal.cancel",
        requiresSamples: 0,
        consumesSamples: 0,
        next: "node.e2e.cal.approach",
      },
    ],
  },
  {
    kind: "stage",
    nodeId: "node.e2e.cal.basic-mark",
    mutations: () =>
      stageBatchV1([
        {
          kind: "setAppearance",
          layerId: propsLayerV1,
          tag: labStageTagsV1.beacon,
          appearance: { mode: "rough" },
        },
      ]),
    mayShow: [],
    next: "node.e2e.cal.flip",
  },
  {
    kind: "stage",
    nodeId: "node.e2e.cal.precise-mark",
    mutations: () =>
      stageBatchV1([
        {
          kind: "setAppearance",
          layerId: propsLayerV1,
          tag: labStageTagsV1.beacon,
          appearance: { mode: "fine" },
        },
      ]),
    mayShow: [],
    next: "node.e2e.cal.flip",
  },
  {
    kind: "stage",
    nodeId: "node.e2e.cal.flip",
    mutations: (stage) => {
      const background = stage.layers
        .find((layer) => layer.layerId === backgroundLayerV1)
        ?.entries.find((entry) => entry.tag === labStageTagsV1.background);
      const nextContent = background?.contentId === labStageContentIdsV1.backgroundStoreroom
        ? labStageContentIdsV1.backgroundLab
        : labStageContentIdsV1.backgroundStoreroom;
      return stageBatchV1([
        {
          kind: "replace",
          layerId: backgroundLayerV1,
          tag: labStageTagsV1.background,
          contentId: nextContent,
        },
      ]);
    },
    mayShow: [labStageContentIdsV1.backgroundLab, labStageContentIdsV1.backgroundStoreroom],
    next: "node.e2e.cal.flash",
  },
  {
    kind: "barrier",
    nodeId: "node.e2e.cal.flash",
    definitionId: "interaction.e2e.cal-flash",
    seenRevision: 1,
    expectedTransitionId: "transition.e2e.bg-crossfade",
    loadRecovery: "settle",
    next: "node.e2e.cal.hold",
  },
  {
    kind: "hold",
    nodeId: "node.e2e.cal.hold",
    definitionId: "interaction.e2e.cal-hold",
    seenRevision: 1,
    durationMs: 400,
    skippable: true,
    // Crossings at 150ms and 300ms: +2 rapport over the full hold, settled
    // batch-invariantly inside whatever time-tick commits deliver them.
    tick: { everyMs: 150, rapportPerTick: 1 },
    next: "node.e2e.cal.dial",
  },
  {
    kind: "custom",
    nodeId: "node.e2e.cal.dial",
    definitionId: "interaction.e2e.cal-dial",
    seenRevision: 1,
    surfaceId: labCalibrationSurfaceIdV1,
    params: Object.freeze({ min: 1, max: 3 }),
    next: "node.e2e.cal.done",
  },
  {
    kind: "say",
    nodeId: "node.e2e.cal.done",
    definitionId: "interaction.e2e.cal-done",
    seenRevision: 1,
    speakerTextId: "text.e2e.lab.narrative.speaker.alpha",
    textId: "text.e2e.lab.narrative.cal.done",
    next: "node.e2e.cal.clear",
  },
  {
    kind: "stage",
    nodeId: "node.e2e.cal.clear",
    mutations: (stage) => {
      const hides: { kind: "hide"; layerId: string; tag: string }[] = [];
      if (stageHasTagV1(stage, propsLayerV1, labStageTagsV1.beacon)) {
        hides.push({ kind: "hide", layerId: propsLayerV1, tag: labStageTagsV1.beacon });
      }
      if (stageHasTagV1(stage, charactersLayerV1, labStageTagsV1.alpha)) {
        hides.push({ kind: "hide", layerId: charactersLayerV1, tag: labStageTagsV1.alpha });
      }
      if (stageHasTagV1(stage, charactersLayerV1, labStageTagsV1.beta)) {
        hides.push({ kind: "hide", layerId: charactersLayerV1, tag: labStageTagsV1.beta });
      }
      return hides.length > 0 ? stageBatchV1(hides) : [];
    },
    mayShow: [],
    next: "node.e2e.cal.end",
  },
  { kind: "end", nodeId: "node.e2e.cal.end" },
  {
    kind: "say",
    nodeId: labDrillChamberNodeIdV1,
    definitionId: "interaction.e2e.drill-chamber",
    seenRevision: 1,
    speakerTextId: "text.e2e.lab.narrative.speaker.beta",
    textId: "text.e2e.lab.narrative.drill.chamber",
    next: "node.e2e.drill.decision",
  },
  {
    kind: "choice",
    nodeId: "node.e2e.drill.decision",
    definitionId: labDrillDecisionDefinitionIdV1,
    seenRevision: 1,
    promptTextId: "text.e2e.lab.narrative.drill.decision",
    // The night-menu shape: the decision menu shares the stage, so the
    // crate's collection port stays pointer-reachable and resolves the
    // tripwire option against this same occurrence.
    stageInput: "shared",
    options: [
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
    ],
  },
  {
    kind: "hold",
    nodeId: labDrillVigilNodeIdV1,
    definitionId: "interaction.e2e.drill-vigil",
    seenRevision: 1,
    durationMs: labDrillVigilDurationMsV1,
    skippable: true,
    // Crossings at 300ms and 600ms inside the 800ms watch, +1 rapport
    // each. The arm reads the working rapport, so from a fresh session
    // the second crossing reaches the threshold and cuts the hold at
    // exactly 600ms (the last 200ms are discarded) — and a skip's
    // remaining-milliseconds settlement walks through the same cut.
    tick: { everyMs: labDrillVigilTickEveryMsV1, rapportPerTick: 1 },
    when: [
      {
        matches: ({ rapport }) => rapport >= labDrillVigilRapportThresholdV1,
        next: "node.e2e.drill.catch",
      },
    ],
    next: "node.e2e.drill.quiet",
  },
  {
    kind: "hold",
    nodeId: labDrillStakeoutNodeIdV1,
    definitionId: "interaction.e2e.drill-stakeout",
    seenRevision: 1,
    durationMs: labDrillStakeoutDurationMsV1,
    skippable: false,
    // No tick effect of its own: the arm watches the collector monitor's
    // lifetime drip counter, which only moves between commands — the
    // declared next-settlement granularity.
    when: [
      { matches: ({ collectorUnits }) => collectorUnits >= 1, next: "node.e2e.drill.catch" },
    ],
    next: "node.e2e.drill.quiet",
  },
  {
    kind: "hold",
    nodeId: labDrillTripwireNodeIdV1,
    definitionId: "interaction.e2e.drill-tripwire",
    seenRevision: 1,
    durationMs: labDrillTripwireDurationMsV1,
    skippable: false,
    // Shared stage input: the crate region stays pointer-reachable while
    // the watch runs, so the fenced write below has a real pointer path.
    stageInput: "shared",
    // The input axis: the arm watches the collector switch, which the
    // fenced `lab.engage_collector` write command (or the ordinary
    // toggle) flips between settlements. The write never routes — the
    // arm cuts at the next fenced settlement's t=0.
    when: [
      { matches: ({ collectorEngaged }) => collectorEngaged, next: "node.e2e.drill.catch" },
    ],
    next: "node.e2e.drill.quiet",
  },
  {
    kind: "say",
    nodeId: "node.e2e.drill.catch",
    definitionId: "interaction.e2e.drill-catch",
    seenRevision: 1,
    speakerTextId: "text.e2e.lab.narrative.speaker.beta",
    textId: "text.e2e.lab.narrative.drill.catch",
    next: "node.e2e.drill.result",
  },
  {
    kind: "say",
    nodeId: "node.e2e.drill.quiet",
    definitionId: "interaction.e2e.drill-quiet",
    seenRevision: 1,
    speakerTextId: "text.e2e.lab.narrative.speaker.alpha",
    textId: "text.e2e.lab.narrative.drill.quiet",
    next: "node.e2e.drill.result",
  },
  {
    kind: "say",
    nodeId: "node.e2e.drill.result",
    definitionId: "interaction.e2e.drill-result",
    seenRevision: 1,
    speakerTextId: "text.e2e.lab.narrative.speaker.alpha",
    textId: "text.e2e.lab.narrative.drill.result",
    next: "node.e2e.drill.end",
  },
  { kind: "end", nodeId: "node.e2e.drill.end" },
];

const labNarrativeNodesByIdV1: ReadonlyMap<string, LabNarrativeNodeV1> = new Map(
  labNarrativeScriptV1.map((node) => [node.nodeId, node]),
);

export const labNarrativeNodeIdsV1: readonly string[] = Object.freeze(
  labNarrativeScriptV1.map((node) => node.nodeId),
);

function stageHasTagV1(stage: SemanticStageStateV1, layerId: string, tag: string): boolean {
  const layer = stage.layers.find((candidate) => candidate.layerId === layerId);
  return layer !== undefined && layer.entries.some((entry) => entry.tag === tag);
}

function requireNodeV1(nodeId: string): LabNarrativeNodeV1 {
  const node = labNarrativeNodesByIdV1.get(nodeId);
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
  for (const node of labNarrativeScriptV1) {
    if (node.kind === "choice" && node.definitionId === definitionId) return node.options;
  }
  return Object.freeze([]);
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
        ...(node.stageInput !== undefined ? { stageInput: node.stageInput } : {}),
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
        ...(node.stageInput !== undefined ? { stageInput: node.stageInput } : {}),
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
    const node = requireNodeV1(cursor);
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
        const outcome = reduceStageMutationsV1(localStage, mutations);
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
      return Object.freeze({
        narrative: Object.freeze({
          phase: "completed" as const,
          cursor: null,
          pending: null,
          sequence,
          calibration: narrative.calibration,
          // Completing a calibration run deepens the relationship; branch
          // nodes route on this the next time the script runs.
          rapport: narrative.rapport + 1,
          history: narrative.history,
        }),
        stageMutations: Object.freeze(collected),
      });
    }
    sequence += 1;
    return Object.freeze({
      narrative: Object.freeze({
        phase: "active" as const,
        cursor: node.nodeId,
        pending: pendingForNodeV1(node, sequence),
        sequence,
        calibration: narrative.calibration,
        rapport: narrative.rapport,
        history: narrative.history,
      }),
      stageMutations: Object.freeze(collected),
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
  narrative: LabNarrativeStateV1,
  resolution: InteractionResolutionV1,
): LabNarrativeStateV1 {
  const pending = narrative.pending;
  if (pending === null || narrative.cursor === null) {
    throw new TypeError("e2e.narrative_nothing_pending");
  }
  const node = requireNodeV1(narrative.cursor);
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
  return Object.freeze({
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
  narrative: LabNarrativeStateV1,
  tick: TimeTickV1,
  session: LabHoldSessionReadV1,
): LabNarrativeTimeContinuationV1 {
  const pending = narrative.pending;
  if (pending === null || pending.kind !== "hold" || narrative.cursor === null) {
    throw new TypeError("e2e.narrative_no_hold_pending");
  }
  const node = requireNodeV1(narrative.cursor);
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
    return Object.freeze({
      kind: "holding" as const,
      narrative: Object.freeze({ ...narrative, pending: settlement.pending, rapport }),
    });
  }
  const cursor = settlement.kind === "rerouted" ? arms[settlement.armIndex]?.next : node.next;
  if (cursor === undefined) {
    throw new TypeError(`e2e.narrative_hold_arm_missing:${node.nodeId}`);
  }
  return Object.freeze({
    kind: "advanced" as const,
    narrative: Object.freeze({
      phase: "active" as const,
      cursor,
      pending: null,
      sequence: narrative.sequence,
      calibration: narrative.calibration,
      rapport,
      history: narrative.history,
    }),
  });
}

export function labNarrativeAtBeginV1(narrative: LabNarrativeStateV1): LabNarrativeStateV1 {
  return Object.freeze({
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
  return Object.freeze({
    phase: "active" as const,
    cursor: labDrillChamberNodeIdV1,
    pending: null,
    sequence: narrative.sequence,
    calibration: narrative.calibration,
    rapport: narrative.rapport,
    history: narrative.history,
  });
}
