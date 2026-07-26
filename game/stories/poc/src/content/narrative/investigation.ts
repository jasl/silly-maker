// SPDX-License-Identifier: CC-BY-NC-SA-4.0

import {
  deepFreezePocValueV1,
  type DeepReadonly,
  type NarrativeSceneV1,
} from "../../gameplay/index.js";
import { assetIdsV1 } from "../asset-ids.js";
import { nodeIdsV1, sceneIdsV1 } from "../simulation-ids.js";
import { pocSimulationTextIdsV1 as pocTextIdsV1 } from "../simulation-text-ids.js";

export const pocInvestigationNarrativeV1: DeepReadonly<readonly NarrativeSceneV1[]> =
  deepFreezePocValueV1([
    {
      sceneId: sceneIdsV1[6],
      entryNodeId: nodeIdsV1[17],
      nodes: [
        {
          // Departing to the old trade road moves the visible stage onto the
          // world map through the Narrative-owned saveable stage target.
          kind: "stageCue",
          nodeId: nodeIdsV1[17],
          cue: { kind: "background.set", assetId: assetIdsV1[10], transition: "fade" },
          nextNodeId: nodeIdsV1[13],
        },
        {
          kind: "narration",
          nodeId: nodeIdsV1[13],
          textId: pocTextIdsV1.narrativeOldTradeRoadDepartureLine,
          nextNodeId: nodeIdsV1[14],
        },
        { kind: "end", nodeId: nodeIdsV1[14] },
      ],
    },
    {
      sceneId: sceneIdsV1[7],
      entryNodeId: nodeIdsV1[15],
      nodes: [
        {
          kind: "narration",
          nodeId: nodeIdsV1[15],
          textId: pocTextIdsV1.narrativeOldTradeRoadInvestigationLine,
          nextNodeId: nodeIdsV1[16],
        },
        { kind: "end", nodeId: nodeIdsV1[16] },
      ],
    },
  ] satisfies readonly NarrativeSceneV1[]);
