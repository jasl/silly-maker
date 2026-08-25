// SPDX-License-Identifier: MIT
import { compileAuthoringSceneV1 } from "@sillymaker/base/authoring/scene";
import type {
  AdmittedAuthoringSceneV1,
  CompiledAuthoringSceneV1,
} from "@sillymaker/base/authoring/scene";

const compilationBySceneInternalV1 = new WeakMap<
  AdmittedAuthoringSceneV1,
  CompiledAuthoringSceneV1
>();

/**
 * Returns the compiled projection for this exact immutable admitted Scene.
 * Reducer validation and Inspector rendering share the receipt without adding
 * a second Scene authority or attempting incremental compilation.
 */
export function compileAuthoringSceneWithReceiptInternalV1(
  scene: AdmittedAuthoringSceneV1,
): CompiledAuthoringSceneV1 {
  const existing = compilationBySceneInternalV1.get(scene);
  if (existing !== undefined) return existing;
  const compiled = compileAuthoringSceneV1(scene);
  compilationBySceneInternalV1.set(scene, compiled);
  return compiled;
}
