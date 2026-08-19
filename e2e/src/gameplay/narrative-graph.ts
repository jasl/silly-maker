// SPDX-License-Identifier: MIT
import type { AssetDemandPlanV1, NarrativeGraphV1, NarrativePredictionV1 } from "@sillymaker/base";
import {
  narrativePredictionToDemandPlanV1,
  parseNarrativeGraphV1,
  predictNarrativeDependenciesV1,
} from "@sillymaker/base";

import { labBgmForBackgroundV1, labVoiceForSayV1 } from "./audio.ts";
import type { LabNarrativeNodeV1 } from "./narrative.ts";
import { labNarrativeScriptV1 } from "./narrative.ts";

import { labStageContentIdsV1 } from "../stage-ids.ts";

/**
 * Projects the typed Lab narrative script (the TS narrative IR) into the
 * generic narrative graph for linting and bounded prediction. Every node
 * carries a provable source position back into the script file, and the
 * declared dependencies mirror what the runner and the audio projection
 * would actually demand — a conformance test keeps that mirror honest.
 */

const labBackgroundContentIdsV1: readonly string[] = Object.freeze([
  labStageContentIdsV1.backgroundLab,
  labStageContentIdsV1.backgroundStoreroom,
]);

function graphNodeForV1(node: LabNarrativeNodeV1): unknown {
  const source = `gameplay/narrative.ts#${node.nodeId}`;
  const base = {
    nodeId: node.nodeId,
    callTarget: null,
    source,
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
      // Prediction walks every conditional successor; it never decides
      // which relationship branch a live run will take.
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
          // Showing a background also retargets the BGM channel.
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

export function projectLabNarrativeGraphV1(): NarrativeGraphV1 {
  const entry = labNarrativeScriptV1[0];
  if (entry === undefined) throw new TypeError("e2e.narrative_script_empty");
  return parseNarrativeGraphV1({
    entryNodeId: entry.nodeId,
    nodes: labNarrativeScriptV1.map((node) => graphNodeForV1(node)),
  });
}

/**
 * Bounded prediction from the player's current cursor, and its mapping to
 * an opportunistic prefetch demand plan. Prediction is a pure read: it
 * never executes a command, never consumes RNG, and never decides which
 * branch a hidden choice will take.
 */
export function predictLabNarrativeV1(cursor: string): NarrativePredictionV1 {
  return predictNarrativeDependenciesV1(projectLabNarrativeGraphV1(), cursor);
}

export function labPrefetchPlanV1(cursor: string): AssetDemandPlanV1 {
  return narrativePredictionToDemandPlanV1(predictLabNarrativeV1(cursor), {
    planId: `plan.e2e.prefetch.${cursor}`,
    group: "e2e-narrative-prefetch",
  });
}
