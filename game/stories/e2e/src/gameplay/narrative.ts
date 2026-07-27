// SPDX-License-Identifier: MIT
import type {
  InteractionResolutionContextV2,
  InteractionResolutionV2,
  NarrativeHistoryV1,
  PendingInteractionV2,
  SemanticStageStateV2,
  StageMutationV2,
  StrictJsonObjectV1,
} from "@sillymaker/base";
import {
  appendNarrativeHistoryV1,
  emptyNarrativeHistoryV1,
  interactionOccurrenceIdV2,
  parsePendingInteractionV2,
  parseStageMutationV2,
  reduceStageMutationsV2,
} from "@sillymaker/base";

import { labVoiceForSayV1 } from "./audio.js";

import { labStageContentIdsV1, labStageTagsV1 } from "../stage-ids.js";

/**
 * The Engine Lab calibration narrative: a small typed script whose runner
 * executes pure nodes (stage mutations) automatically and stops at every
 * PendingInteraction boundary — say, choice, pause, presentation barrier,
 * and one schema-registered custom surface. Interaction instances live in
 * authoritative State; the script itself is code, never saved.
 */

export interface LabNarrativeStateV1 {
  readonly phase: "idle" | "active" | "completed";
  /** The node the runner will execute next; null when idle/completed. */
  readonly cursor: string | null;
  readonly pending: PendingInteractionV2 | null;
  /** Monotonic occurrence sequence; never resets, so re-entry re-fences. */
  readonly sequence: number;
  /** Evidence of the custom calibration resolution. */
  readonly calibration: number | null;
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
    history: emptyNarrativeHistoryV1,
  });
}

export interface LabChoiceOptionV1 {
  readonly choiceId: string;
  readonly textId: string;
  readonly requiresSamples: number;
  readonly next: string;
}

type LabNarrativeNodeV1 =
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
      readonly kind: "stage";
      readonly nodeId: string;
      readonly mutations: (stage: SemanticStageStateV2) => readonly StageMutationV2[];
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
      readonly kind: "pause";
      readonly nodeId: string;
      readonly definitionId: string;
      readonly seenRevision: number;
      readonly durationMs: number;
      readonly skippable: boolean;
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
const backgroundLayerV1 = "layer.e2e.background";

function stageBatchV1(batch: readonly unknown[]): readonly StageMutationV2[] {
  return Object.freeze(
    batch.map((mutation, index) => parseStageMutationV2(mutation, `/mutations/${String(index)}`)),
  );
}

export const labCalibrationSurfaceIdV1 = "surface.e2e.calibration";
export const labCalibrationEntryNodeIdV1 = "node.e2e.cal.intro";

const labNarrativeScriptV1: readonly LabNarrativeNodeV1[] = [
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
      stageHasTagV1(stage, propsLayerV1, labStageTagsV1.beacon)
        ? []
        : stageBatchV1([
            {
              kind: "show",
              layerId: propsLayerV1,
              tag: labStageTagsV1.beacon,
              contentId: labStageContentIdsV1.propBeacon,
              zOrder: 6,
              placement: { x: 360, y: 760, scalePermille: 900, mirrored: false },
            },
          ]),
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
        next: "node.e2e.cal.basic-mark",
      },
      {
        choiceId: "choice.e2e.cal.precise",
        textId: "text.e2e.lab.narrative.cal.precise",
        requiresSamples: 1,
        next: "node.e2e.cal.precise-mark",
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
    next: "node.e2e.cal.flip",
  },
  {
    kind: "stage",
    nodeId: "node.e2e.cal.flip",
    mutations: (stage) => {
      const background = stage.layers
        .find((layer) => layer.layerId === backgroundLayerV1)
        ?.entries.find((entry) => entry.tag === labStageTagsV1.background);
      const nextContent =
        background?.contentId === labStageContentIdsV1.backgroundStoreroom
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
    kind: "pause",
    nodeId: "node.e2e.cal.hold",
    definitionId: "interaction.e2e.cal-hold",
    seenRevision: 1,
    durationMs: 400,
    skippable: true,
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
    mutations: (stage) =>
      stageHasTagV1(stage, propsLayerV1, labStageTagsV1.beacon)
        ? stageBatchV1([{ kind: "hide", layerId: propsLayerV1, tag: labStageTagsV1.beacon }])
        : [],
    next: "node.e2e.cal.end",
  },
  { kind: "end", nodeId: "node.e2e.cal.end" },
];

const labNarrativeNodesByIdV1: ReadonlyMap<string, LabNarrativeNodeV1> = new Map(
  labNarrativeScriptV1.map((node) => [node.nodeId, node]),
);

export const labNarrativeNodeIdsV1: readonly string[] = Object.freeze(
  labNarrativeScriptV1.map((node) => node.nodeId),
);

function stageHasTagV1(stage: SemanticStageStateV2, layerId: string, tag: string): boolean {
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
  pending: PendingInteractionV2 | null,
  samplesCollected: number,
): InteractionResolutionContextV2 {
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
  readonly stageMutations: readonly StageMutationV2[];
}

function pendingForNodeV1(node: LabNarrativeNodeV1, sequence: number): PendingInteractionV2 {
  const occurrenceId = interactionOccurrenceIdV2(sequence);
  switch (node.kind) {
    case "say":
      return parsePendingInteractionV2({
        kind: "say",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        speakerTextId: node.speakerTextId,
        textId: node.textId,
        advancePolicy: "confirm",
      });
    case "choice":
      return parsePendingInteractionV2({
        kind: "choice",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        promptTextId: node.promptTextId,
        options: node.options.map(({ choiceId, textId }) => ({ choiceId, textId })),
      });
    case "pause":
      return parsePendingInteractionV2({
        kind: "pause",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        durationMs: node.durationMs,
        skippable: node.skippable,
      });
    case "barrier":
      return parsePendingInteractionV2({
        kind: "presentation_barrier",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        expectedTransitionId: node.expectedTransitionId,
        loadRecovery: node.loadRecovery,
      });
    case "custom":
      return parsePendingInteractionV2({
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
 * Deterministic: same narrative state and stage produce the same result.
 */
export function runLabNarrativeUntilInteractionV1(
  narrative: LabNarrativeStateV1,
  stage: SemanticStageStateV2,
): LabNarrativeRunResultV1 {
  if (narrative.cursor === null) {
    throw new TypeError("e2e.narrative_cursor_missing");
  }
  let cursor: string | null = narrative.cursor;
  let sequence = narrative.sequence;
  let localStage = stage;
  const collected: StageMutationV2[] = [];

  for (let steps = 0; steps < 64; steps += 1) {
    if (cursor === null) break;
    const node = requireNodeV1(cursor);
    if (node.kind === "stage") {
      const mutations = node.mutations(localStage);
      if (mutations.length > 0) {
        const outcome = reduceStageMutationsV2(localStage, mutations);
        if (outcome.kind !== "applied") {
          throw new TypeError(`e2e.narrative_stage_invalid:${node.nodeId}`);
        }
        localStage = outcome.state;
        collected.push(...mutations);
      }
      cursor = node.next;
      continue;
    }
    if (node.kind === "end") {
      return Object.freeze({
        narrative: Object.freeze({
          phase: "completed" as const,
          cursor: null,
          pending: null,
          sequence,
          calibration: narrative.calibration,
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
        history: narrative.history,
      }),
      stageMutations: Object.freeze(collected),
    });
  }
  throw new TypeError("e2e.narrative_runaway_script");
}

/**
 * Applies an accepted resolution to the pending node: moves the cursor to
 * the resolution's continuation and records custom outcomes. The caller
 * runs the script afterwards; validation already happened in the shared
 * evaluator.
 */
export function labNarrativeAfterResolutionV1(
  narrative: LabNarrativeStateV1,
  resolution: InteractionResolutionV2,
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
  } else if (node.kind === "pause" || node.kind === "barrier") {
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
    history,
  });
}

export function labNarrativeAtBeginV1(narrative: LabNarrativeStateV1): LabNarrativeStateV1 {
  return Object.freeze({
    phase: "active" as const,
    cursor: labCalibrationEntryNodeIdV1,
    pending: null,
    sequence: narrative.sequence,
    calibration: narrative.calibration,
    history: narrative.history,
  });
}
