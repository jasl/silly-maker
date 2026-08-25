// SPDX-License-Identifier: MIT
import type { LoadedNarrativeUnitV1 } from "@sillymaker/base/runtime";

import {
  defineLabNarrativePlanV1,
  labDrillDecisionDefinitionIdV1,
  labDrillDecisionOptionsV1,
  labDrillStakeoutDurationMsV1,
  labDrillStakeoutNodeIdV1,
  labDrillTripwireDurationMsV1,
  labDrillTripwireNodeIdV1,
  labDrillVigilDurationMsV1,
  labDrillVigilNodeIdV1,
  labDrillVigilRapportThresholdV1,
  labDrillVigilTickEveryMsV1,
  type LabNarrativeNodeV1,
  type LabNarrativePlanV1,
} from "../narrative-runtime.ts";
import { labDrillChamberNodeIdV1, labDrillNarrativeUnitIdV1 } from "../narrative-topology.ts";
import { projectLabNarrativeUnitGraphV1 } from "../narrative-graph-projection.ts";

export const labDrillNarrativeNodesV1: readonly LabNarrativeNodeV1[] = [
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
    options: labDrillDecisionOptionsV1,
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

export const labDrillNarrativePlanV1 = defineLabNarrativePlanV1(
  labDrillNarrativeUnitIdV1,
  labDrillNarrativeNodesV1,
);

export const labDrillNarrativeUnitV1: LoadedNarrativeUnitV1<LabNarrativePlanV1> = {
  unitId: labDrillNarrativeUnitIdV1,
  graph: projectLabNarrativeUnitGraphV1({
    entryNodeId: labDrillChamberNodeIdV1,
    nodes: labDrillNarrativeNodesV1,
    sourceModule: "gameplay/narrative-units/drill.ts",
  }),
  plan: labDrillNarrativePlanV1,
};
