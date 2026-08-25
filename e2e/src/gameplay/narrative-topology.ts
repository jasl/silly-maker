// SPDX-License-Identifier: MIT
import type { NarrativePositionV1 } from "@sillymaker/base/runtime";

export const labCalibrationNarrativeUnitIdV1 = "narrative.e2e.calibration";
export const labDrillNarrativeUnitIdV1 = "narrative.e2e.drill";

export const labCalibrationEntryNodeIdV1 = "node.e2e.cal.enter-alpha";
export const labDrillChamberNodeIdV1 = "node.e2e.drill.chamber";

/**
 * Stable Save cursor topology. The loaded unit graph is checked against this
 * list in focused conformance tests; keeping it here lets Save admission name
 * every valid cursor without pulling either control-plan chunk into startup.
 */
export const labCalibrationNarrativeNodeIdsV1 = [
  "node.e2e.cal.enter-alpha",
  "node.e2e.cal.intro",
  "node.e2e.cal.show-beacon",
  "node.e2e.cal.enter-beta",
  "node.e2e.cal.beta-gate",
  "node.e2e.cal.beta-note-warm",
  "node.e2e.cal.beta-note",
  "node.e2e.cal.beta-react",
  "node.e2e.cal.approach",
  "node.e2e.cal.basic-mark",
  "node.e2e.cal.precise-mark",
  "node.e2e.cal.flip",
  "node.e2e.cal.flash",
  "node.e2e.cal.hold",
  "node.e2e.cal.dial",
  "node.e2e.cal.done",
  "node.e2e.cal.clear",
  "node.e2e.cal.end",
] as const;

export const labDrillNarrativeNodeIdsV1 = [
  "node.e2e.drill.chamber",
  "node.e2e.drill.decision",
  "node.e2e.drill.vigil",
  "node.e2e.drill.stakeout",
  "node.e2e.drill.tripwire",
  "node.e2e.drill.catch",
  "node.e2e.drill.quiet",
  "node.e2e.drill.result",
  "node.e2e.drill.end",
] as const;

export const labNarrativeNodeIdsV1: readonly string[] = [
  ...labCalibrationNarrativeNodeIdsV1,
  ...labDrillNarrativeNodeIdsV1,
];

const unitIdByNodeIdV1 = new Map<string, string>([
  ...labCalibrationNarrativeNodeIdsV1.map((nodeId) =>
    [nodeId, labCalibrationNarrativeUnitIdV1] as const
  ),
  ...labDrillNarrativeNodeIdsV1.map((nodeId) => [nodeId, labDrillNarrativeUnitIdV1] as const),
]);

/** One cold command/readiness lookup from the stable Save cursor to its unit. */
export function labNarrativePositionForCursorV1(cursor: string): NarrativePositionV1 {
  const unitId = unitIdByNodeIdV1.get(cursor);
  if (unitId === undefined) throw new TypeError(`e2e.narrative_cursor_unknown:${cursor}`);
  return { unitId, nodeId: cursor };
}
