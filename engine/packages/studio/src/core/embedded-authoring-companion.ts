// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type { InspectorBindingV1 } from "./binding.ts";
import type { SceneAuthoringLocalAdapterV1 } from "./scene-operations/contract.ts";

export interface EmbeddedAuthoringCompanionRenderInputInternalV1 {
  readonly sceneOperations: SceneAuthoringLocalAdapterV1;
  readonly authoringRevision: number;
  readonly publicationRole: "visible" | "probe";
}

/** Opaque owner retained across compatible Authoring R1 publications. */
export interface EmbeddedAuthoringCompanionOwnerInternalV1 {
  dispose(): Promise<void>;
}

/**
 * Package-private, single-sibling bridge. It is deliberately not a public
 * plugin registry or Mod ABI; a product opts in by decorating one binding.
 */
export interface EmbeddedAuthoringCompanionDefinitionInternalV1 {
  readonly compatibilityId: string;
  readonly contentSignature: string;
  readonly surfacePlacement: "after-inspector" | "replace-inspector";
  createOwner(): EmbeddedAuthoringCompanionOwnerInternalV1;
  render(
    owner: EmbeddedAuthoringCompanionOwnerInternalV1,
    input: EmbeddedAuthoringCompanionRenderInputInternalV1,
  ): ReactElement;
}

const companionDefinitionsInternalV1 = new WeakMap<
  InspectorBindingV1,
  EmbeddedAuthoringCompanionDefinitionInternalV1
>();

export function defineEmbeddedAuthoringCompanionInternalV1(
  binding: InspectorBindingV1,
  definition: EmbeddedAuthoringCompanionDefinitionInternalV1,
): InspectorBindingV1 {
  if (companionDefinitionsInternalV1.has(binding)) {
    throw new TypeError("Inspector binding already has an embedded Authoring companion");
  }
  companionDefinitionsInternalV1.set(binding, definition);
  return binding;
}

export function resolveEmbeddedAuthoringCompanionInternalV1(
  binding: InspectorBindingV1,
): EmbeddedAuthoringCompanionDefinitionInternalV1 | null {
  return companionDefinitionsInternalV1.get(binding) ?? null;
}
