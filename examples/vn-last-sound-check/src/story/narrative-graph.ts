// SPDX-License-Identifier: MIT
import type { NarrativeGraph } from "@sillymaker/base/story";
import { parseNarrativeGraph } from "@sillymaker/base/story";

import type { VnLastSoundCheckNarrativeNodeV1 } from "./narrative.ts";
import { vnLastSoundCheckScriptV1 } from "./narrative.ts";
import {
  predictVnLastSoundCheckStageAudioAssetsV1,
  vnLastSoundCheckSfxAssetForDefinitionV1,
  vnLastSoundCheckVoiceAssetForDefinitionV1,
} from "../content/audio.ts";

function interactionAudioAssetsV1(definitionId: string): readonly string[] {
  const voice = vnLastSoundCheckVoiceAssetForDefinitionV1(definitionId);
  const sfx = vnLastSoundCheckSfxAssetForDefinitionV1(definitionId);
  return [voice, sfx].filter((assetId): assetId is string => assetId !== null);
}

/**
 * Projects the typed script into the generic narrative graph so
 * `lintNarrativeGraph` can prove it structurally sound (no missing
 * successors, no unreachable nodes, no pure loops) and prediction can
 * collect its dependencies. The test suite lints this projection.
 */
function graphNodeForV1(node: VnLastSoundCheckNarrativeNodeV1): unknown {
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
          assetIds: predictVnLastSoundCheckStageAudioAssetsV1(node.mayShow),
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
      throw new TypeError(`unknown vn-last-sound-check narrative node ${String(exhaustive)}`);
    }
  }
}

export function projectVnLastSoundCheckNarrativeGraphV1(): NarrativeGraph {
  const entry = vnLastSoundCheckScriptV1[0];
  if (entry === undefined) throw new TypeError("vn-last-sound-check.narrative_script_empty");
  return parseNarrativeGraph({
    entryNodeId: entry.nodeId,
    nodes: vnLastSoundCheckScriptV1.map((node) => graphNodeForV1(node)),
  });
}
