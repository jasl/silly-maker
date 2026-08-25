// SPDX-License-Identifier: MIT
import { parseStageMutationV1 } from "@sillymaker/base";
import type { LoadedNarrativeUnitV1 } from "@sillymaker/base/runtime";

import { labStageContentIdsV1, labStageTagsV1 } from "../../stage-ids.ts";
import {
  defineLabNarrativePlanV1,
  labCalibrationApproachOptionsV1,
  labCalibrationSurfaceIdV1,
  type LabNarrativeNodeV1,
  type LabNarrativePlanV1,
} from "../narrative-runtime.ts";
import {
  labCalibrationEntryNodeIdV1,
  labCalibrationNarrativeUnitIdV1,
} from "../narrative-topology.ts";
import { projectLabNarrativeUnitGraphV1 } from "../narrative-graph-projection.ts";

const propsLayerV1 = "layer.e2e.props";
const charactersLayerV1 = "layer.e2e.characters";
const backgroundLayerV1 = "layer.e2e.background";

function stageBatchV1(batch: readonly unknown[]) {
  return batch.map((mutation, index) =>
    parseStageMutationV1(mutation, `/mutations/${String(index)}`)
  );
}

function stageHasTagV1(
  stage: Parameters<Extract<LabNarrativeNodeV1, { kind: "stage" }>["mutations"]>[0],
  layerId: string,
  tag: string,
): boolean {
  const layer = stage.layers.find((candidate) => candidate.layerId === layerId);
  return layer !== undefined && layer.entries.some((entry) => entry.tag === tag);
}

export const labCalibrationNarrativeNodesV1: readonly LabNarrativeNodeV1[] = [
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
    options: labCalibrationApproachOptionsV1,
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
    params: { min: 1, max: 3 },
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
];

export const labCalibrationNarrativePlanV1 = defineLabNarrativePlanV1(
  labCalibrationNarrativeUnitIdV1,
  labCalibrationNarrativeNodesV1,
);

export const labCalibrationNarrativeUnitV1: LoadedNarrativeUnitV1<LabNarrativePlanV1> = {
  unitId: labCalibrationNarrativeUnitIdV1,
  graph: projectLabNarrativeUnitGraphV1({
    entryNodeId: labCalibrationEntryNodeIdV1,
    nodes: labCalibrationNarrativeNodesV1,
    sourceModule: "gameplay/narrative-units/calibration.ts",
  }),
  plan: labCalibrationNarrativePlanV1,
};
