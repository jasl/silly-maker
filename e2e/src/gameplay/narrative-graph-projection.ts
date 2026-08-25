// SPDX-License-Identifier: MIT
import type { NarrativeGraphV1 } from "@sillymaker/base";
import { parseNarrativeGraphV1 } from "@sillymaker/base";

import { labBgmForBackgroundV1, labVoiceForSayV1 } from "./audio.ts";
import type { LabNarrativeNodeV1 } from "./narrative-runtime.ts";
import { labStageContentIdsV1 } from "../stage-ids.ts";

const labBackgroundContentIdsV1: readonly string[] = [
  labStageContentIdsV1.backgroundLab,
  labStageContentIdsV1.backgroundStoreroom,
];

function graphNodeForV1(node: LabNarrativeNodeV1, sourceModule: string): unknown {
  const base = {
    nodeId: node.nodeId,
    callTarget: null,
    source: `${sourceModule}#${node.nodeId}`,
  };
  switch (node.kind) {
    case "say": {
      const voice = labVoiceForSayV1(node.definitionId);
      return {
        ...base,
        kind: "interaction",
        successors: [node.next],
        interaction: { definitionId: node.definitionId, seenRevision: node.seenRevision },
        dependencies: {
          textIds: node.speakerTextId === null ? [node.textId] : [node.speakerTextId, node.textId],
          assetIds: voice === null ? [] : [voice.assetId],
          stageContentIds: [],
        },
      };
    }
    case "branch":
      return {
        ...base,
        kind: "pure",
        successors: node.successors,
        interaction: null,
        dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
      };
    case "stage":
      return {
        ...base,
        kind: "pure",
        successors: [node.next],
        interaction: null,
        dependencies: {
          textIds: [],
          assetIds: node.mayShow
            .filter((contentId) => labBackgroundContentIdsV1.includes(contentId))
            .map((contentId) => labBgmForBackgroundV1(contentId)),
          stageContentIds: node.mayShow,
        },
      };
    case "choice":
      return {
        ...base,
        kind: "interaction",
        successors: node.options.map((option) => option.next),
        interaction: { definitionId: node.definitionId, seenRevision: node.seenRevision },
        dependencies: {
          textIds: [node.promptTextId, ...node.options.map((option) => option.textId)],
          assetIds: [],
          stageContentIds: [],
        },
      };
    case "hold":
      return {
        ...base,
        kind: "interaction",
        successors: [...(node.when ?? []).map((arm) => arm.next), node.next],
        interaction: { definitionId: node.definitionId, seenRevision: node.seenRevision },
        dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
      };
    case "barrier":
    case "custom":
      return {
        ...base,
        kind: "interaction",
        successors: [node.next],
        interaction: { definitionId: node.definitionId, seenRevision: node.seenRevision },
        dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
      };
    case "end":
      return {
        ...base,
        kind: "end",
        successors: [],
        interaction: null,
        dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
      };
    default: {
      const exhaustive: never = node;
      throw new TypeError(`unknown narrative node ${String(exhaustive)}`);
    }
  }
}

/** Projects one addressable Story control plan into Base's admitted graph. */
export function projectLabNarrativeUnitGraphV1(input: {
  readonly entryNodeId: string;
  readonly nodes: readonly LabNarrativeNodeV1[];
  readonly sourceModule: string;
}): NarrativeGraphV1 {
  return parseNarrativeGraphV1({
    entryNodeId: input.entryNodeId,
    nodes: input.nodes.map((node) => graphNodeForV1(node, input.sourceModule)),
  });
}
