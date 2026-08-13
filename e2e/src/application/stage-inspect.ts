// SPDX-License-Identifier: MIT
import labCharEnterMotionDocumentV1 from "../motions/char-enter.motion.json" with {
  type: "json",
};

import type {
  MotionSourceIndexV1,
  MotionWorkbenchStoreV1,
  StageInspectControllerV1,
} from "@sillymaker/ui/debug";
import {
  createMotionSourceIndexV1,
  createMotionWorkbenchStoreV1,
  createStageInspectControllerV1,
} from "@sillymaker/ui/debug";

/**
 * Lab stage provenance wiring: one inspect controller shared between the
 * mounted stage (which feeds rendered frames and hosts the click-to-inspect
 * surfaces) and the DevDock provenance panel. The motion source index lists
 * the same JSON modules the transition catalog imports, so the reverse
 * lookup can never disagree with the shipped data.
 */

export const labStageInspectControllerV1: StageInspectControllerV1 =
  createStageInspectControllerV1();

export const labMotionSourcesV1: MotionSourceIndexV1 = createMotionSourceIndexV1(
  { "./motions/char-enter.motion.json": labCharEnterMotionDocumentV1 },
  { sourceRoot: "src" },
);

/** Editor chrome state shared by the provenance and Workbench panels. */
export const labWorkbenchStoreV1: MotionWorkbenchStoreV1 = createMotionWorkbenchStoreV1();
