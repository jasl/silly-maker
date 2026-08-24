// SPDX-License-Identifier: MIT
// Non-Vite fallback for Deno Story tooling and tests. Browser builds replace
// this package import with Tooling's in-memory runtime-only projection.
import {
  admitAuthoringSceneDocumentV1,
  compileAuthoringSceneV1,
} from "@sillymaker/base/authoring/scene";
import type { AuthoringSceneRuntimePlan } from "@sillymaker/base/story";

import sceneSourceV1 from "./procedure.authoring-scene.json" with { type: "json" };

export const sceneRuntimePlanV1: AuthoringSceneRuntimePlan = compileAuthoringSceneV1(
  admitAuthoringSceneDocumentV1(sceneSourceV1),
).runtimePlan;
