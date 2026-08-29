// SPDX-License-Identifier: MIT
import type { AdmittedAuthoringSceneV1 } from "@sillymaker/base/authoring/scene";

import { vnLastSoundCheckVoiceAssetForDefinitionV1 } from "../content/audio.ts";
import {
  vnLastSoundCheckControlRoomSceneV1,
  vnLastSoundCheckTagsV1,
} from "../scenes/control-room/index.ts";
import { vnLastSoundCheckRooftopAntennaSceneV1 } from "../scenes/rooftop-antenna/index.ts";
import { vnLastSoundCheckCompiledStoryV1, vnLastSoundCheckStoryDocV1 } from "../story/narrative.ts";
import type {
  VnLastSoundCheckInteractionBlockV1,
  VnLastSoundCheckNarrativeNodeV1,
} from "../story/narrative-kit.ts";

const sceneSourceByIdV1: Readonly<Record<string, string>> = {
  [vnLastSoundCheckControlRoomSceneV1.sceneId]:
    "src/scenes/control-room/control-room.authoring-scene.json",
  [vnLastSoundCheckRooftopAntennaSceneV1.sceneId]:
    "src/scenes/rooftop-antenna/rooftop-antenna.authoring-scene.json",
};

const speakerKeyByObjectIdV1: Readonly<Record<string, string>> = {
  [vnLastSoundCheckTagsV1.lin]: "lin",
  [vnLastSoundCheckTagsV1.zhou]: "zhou",
};

const compiledNodeByIdV1: ReadonlyMap<string, VnLastSoundCheckNarrativeNodeV1> = new Map(
  vnLastSoundCheckCompiledStoryV1.nodes.map((node) => [node.nodeId, node]),
);

export type NarrativeRouteV1 = "shared" | "archive" | "present";

export interface VnLastSoundCheckSceneNarrativeBindingV1 {
  readonly nodeId: string;
  readonly blockName: string;
  readonly route: NarrativeRouteV1;
  readonly opensScene: boolean;
  readonly cueIds: readonly string[];
  readonly changesSelectedAppearance: boolean;
}

export interface VnLastSoundCheckDialogueBindingV1 {
  readonly nodeId: string;
  readonly blockName: string;
  readonly route: NarrativeRouteV1;
  readonly textId: string;
  readonly textSourcePath: string;
  readonly voiceAssetId: string | null;
}

export interface VnLastSoundCheckNarrativeInspectionV1 {
  readonly sceneId: string;
  readonly sceneSourcePath: string | null;
  readonly selectedObjectId: string | null;
  readonly selectedObjectJsonPointer: string | null;
  readonly selectedCueIds: readonly string[];
  readonly sceneBindings: readonly VnLastSoundCheckSceneNarrativeBindingV1[];
  readonly dialogueBindings: readonly VnLastSoundCheckDialogueBindingV1[];
}

function routeForBlockV1(blockName: string): NarrativeRouteV1 {
  if (blockName.startsWith("archive-")) return "archive";
  if (blockName.startsWith("present-")) return "present";
  return "shared";
}

function textSourcePathV1(textId: string): string {
  if (textId.startsWith("text.vn-last-sound-check.archive.")) {
    return "assets/content/archive.zh-CN.text-pack.json";
  }
  if (textId.startsWith("text.vn-last-sound-check.present.")) {
    return "assets/content/present.zh-CN.text-pack.json";
  }
  return "assets/content/shared.zh-CN.text-pack.json";
}

function stageNodeIdForBlockV1(block: VnLastSoundCheckInteractionBlockV1): string | null {
  if (block.kind === "stage") return `node.${vnLastSoundCheckStoryDocV1.prefix}.${block.name}`;
  if (block.kind === "hold" && (block.ops?.length ?? 0) > 0) {
    return `node.${vnLastSoundCheckStoryDocV1.prefix}.${block.name}-stage`;
  }
  return null;
}

/**
 * Joins the admitted Scene with the already-compiled Story. This remains a
 * tooling-only projection: it does not compile Narrative again and owns no
 * source or gameplay writer.
 */
export function projectVnLastSoundCheckNarrativeInspectionV1(
  scene: AdmittedAuthoringSceneV1,
  selectedObjectId: string | null,
): VnLastSoundCheckNarrativeInspectionV1 {
  const selectedObjectSource = selectedObjectId === null
    ? null
    : scene.sourceMap.objects.find((entry) => entry.objectId === selectedObjectId) ?? null;
  const selectedCueIds = selectedObjectId === null ? [] : scene.document.cues
    .filter((cue) => cue.objectId === selectedObjectId)
    .map((cue) => cue.cueId);
  const sceneBindings: VnLastSoundCheckSceneNarrativeBindingV1[] = [];

  for (const block of vnLastSoundCheckStoryDocV1.blocks) {
    const nodeId = stageNodeIdForBlockV1(block);
    if (nodeId === null) continue;
    const node = compiledNodeByIdV1.get(nodeId);
    if (node?.kind !== "stage") continue;
    const matchingDispatches = node.dispatches.filter((dispatch) =>
      dispatch.sceneId === scene.document.sceneId
    );
    const changesSelectedAppearance = selectedObjectId !== null &&
      (block.kind === "stage" || block.kind === "hold") &&
      (block.ops ?? []).some((op) =>
        "setAppearance" in op && op.setAppearance.tag === selectedObjectId
      );
    if (matchingDispatches.length === 0 && !changesSelectedAppearance) continue;
    sceneBindings.push({
      nodeId,
      blockName: block.name,
      route: routeForBlockV1(block.name),
      opensScene: matchingDispatches.some((dispatch) => "open" in dispatch),
      cueIds: matchingDispatches.flatMap((dispatch) => "cueId" in dispatch ? [dispatch.cueId] : []),
      changesSelectedAppearance,
    });
  }

  const speakerKey = selectedObjectId === null ? null : speakerKeyByObjectIdV1[selectedObjectId];
  const dialogueBindings: VnLastSoundCheckDialogueBindingV1[] = [];
  if (speakerKey !== null && speakerKey !== undefined) {
    for (const block of vnLastSoundCheckStoryDocV1.blocks) {
      if (block.kind !== "say" || block.speaker !== speakerKey) continue;
      const nodeId = `node.${vnLastSoundCheckStoryDocV1.prefix}.${block.name}`;
      const node = compiledNodeByIdV1.get(nodeId);
      if (node?.kind !== "say") continue;
      dialogueBindings.push({
        nodeId,
        blockName: block.name,
        route: routeForBlockV1(block.name),
        textId: node.textId,
        textSourcePath: textSourcePathV1(node.textId),
        voiceAssetId: vnLastSoundCheckVoiceAssetForDefinitionV1(node.definitionId),
      });
    }
  }

  return {
    sceneId: scene.document.sceneId,
    sceneSourcePath: sceneSourceByIdV1[scene.document.sceneId] ?? null,
    selectedObjectId,
    selectedObjectJsonPointer: selectedObjectSource?.jsonPointer ?? null,
    selectedCueIds,
    sceneBindings,
    dialogueBindings,
  };
}
