// SPDX-License-Identifier: MIT
// Non-Vite fallback for Deno Story tooling and tests. The Browser build
// replaces the explicit package import with an in-memory runtime-only module.
import {
  admitAuthoringSceneDocumentV1,
  compileAuthoringSceneV1,
} from "@sillymaker/base/authoring/scene";

import sceneSourceV1 from "./control-room.authoring-scene.json" with { type: "json" };

export const sceneRuntimePlanV1 = compileAuthoringSceneV1(
  admitAuthoringSceneDocumentV1(sceneSourceV1),
).runtimePlan;
