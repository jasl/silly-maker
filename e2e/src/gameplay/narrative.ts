// SPDX-License-Identifier: MIT
// Tooling/test aggregation only. Production runtime owners import
// `narrative-runtime.ts` and acquire one literal-loaded unit plan at a time.
export * from "./narrative-runtime.ts";

import { labCalibrationNarrativeNodesV1 } from "./narrative-units/calibration.ts";
import { labDrillNarrativeNodesV1 } from "./narrative-units/drill.ts";

export const labNarrativeScriptV1 = [
  ...labCalibrationNarrativeNodesV1,
  ...labDrillNarrativeNodesV1,
];
