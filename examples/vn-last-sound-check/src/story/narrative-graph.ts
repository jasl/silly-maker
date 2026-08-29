// SPDX-License-Identifier: MIT
import type { NarrativeGraph } from "@sillymaker/base/story";
import { projectVnNarrativeGraphV1 } from "@sillymaker/vn/interaction";

import { vnLastSoundCheckCompiledStoryV1 } from "./narrative.ts";
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

/** The engine owns VN control flow; this product contributes only its assets. */
export function projectVnLastSoundCheckNarrativeGraphV1(): NarrativeGraph {
  return projectVnNarrativeGraphV1({
    compiled: vnLastSoundCheckCompiledStoryV1,
    sourceForNode: (node) => `story/narrative.ts#${node.nodeId}`,
    assetIdsForNode: (node) => {
      if (node.kind === "stage") {
        return predictVnLastSoundCheckStageAudioAssetsV1(node.mayShow);
      }
      if (node.kind === "say" || node.kind === "hold") {
        return interactionAudioAssetsV1(node.definitionId);
      }
      return [];
    },
  });
}
