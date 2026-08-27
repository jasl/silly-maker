// SPDX-License-Identifier: MIT
import type { NarrativeGraph } from "@sillymaker/base/story";
import { parseNarrativeGraph } from "@sillymaker/base/story";

import type { VnReferenceTourNarrativeNodeV1 } from "./narrative.ts";
import { vnReferenceTourScriptV1 } from "./narrative.ts";
import {
  predictVnReferenceTourStageAudioAssetsV1,
  vnReferenceTourSfxAssetForDefinitionV1,
  vnReferenceTourVoiceAssetForDefinitionV1,
} from "../content/audio.ts";

function interactionAudioAssetsV1(definitionId: string): readonly string[] {
  const voice = vnReferenceTourVoiceAssetForDefinitionV1(definitionId);
  const sfx = vnReferenceTourSfxAssetForDefinitionV1(definitionId);
  return [voice, sfx].filter((assetId): assetId is string => assetId !== null);
}

/**
 * Projects the typed script into the generic narrative graph so
 * `lintNarrativeGraph` can prove it structurally sound (no missing
 * successors, no unreachable nodes, no pure loops) and prediction can
 * collect its dependencies. The test suite lints this projection.
 */
function graphNodeForV1(node: VnReferenceTourNarrativeNodeV1): unknown {
  const source = `story/narrative.ts#${node.nodeId}`;
  const base = { nodeId: node.nodeId, callTarget: null, source };
  switch (node.kind) {
    case "say":
      return {
        ...base,
        kind: "interaction",
        successors: [node.next],
        interaction: { definitionId: node.definitionId, seenRevision: node.seenRevision },
        dependencies: {
          textIds: node.speakerTextId === null ? [node.textId] : [node.speakerTextId, node.textId],
          assetIds: interactionAudioAssetsV1(node.definitionId),
          stageContentIds: [],
        },
      };
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
          assetIds: predictVnReferenceTourStageAudioAssetsV1(node.mayShow),
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
        successors: [node.next],
        interaction: { definitionId: node.definitionId, seenRevision: node.seenRevision },
        dependencies: {
          textIds: [],
          assetIds: interactionAudioAssetsV1(node.definitionId),
          stageContentIds: [],
        },
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
      throw new TypeError(`unknown vn-reference-tour narrative node ${String(exhaustive)}`);
    }
  }
}

export function projectVnReferenceTourNarrativeGraphV1(): NarrativeGraph {
  const entry = vnReferenceTourScriptV1[0];
  if (entry === undefined) throw new TypeError("vn-reference-tour.narrative_script_empty");
  return parseNarrativeGraph({
    entryNodeId: entry.nodeId,
    nodes: vnReferenceTourScriptV1.map((node) => graphNodeForV1(node)),
  });
}
