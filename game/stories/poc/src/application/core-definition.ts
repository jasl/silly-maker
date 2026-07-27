// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { defineCoreGameApplicationV1 } from "@sillymaker/base/runtime";
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";

import type {
  NarrativeProjectionV1,
  PocGameSimulationTypesV1,
  PocGameQueriesV1,
  PocGameViewV1,
} from "../gameplay/contracts/types.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticActionResultV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
} from "../presentation/semantic-actions.js";
import { createPocUnexpectedFaultAttemptV1 } from "../runtime/poc-debug-bundle.js";
import {
  validatePocStateInvariantsV1,
  validatePocStateReferencesV1,
} from "../runtime/poc-state-validation.js";
import type { PocResolvedGameV1 } from "../story-definition.js";
import { pocStoryEntryV1 } from "../story-definition.js";
import { createPocApplicationExtensionsV1 } from "./extensions.js";
import type { PocApplicationExtensionsV1 } from "./extensions.js";
import { pocSemanticAdapterV1 } from "./semantic-adapter.js";

/**
 * The Host-neutral core of the Project Tavern application: the GamePackage
 * entry, the semantic adapter, validators, fault normalizers, and the Story
 * extensions (diagnostics, DebugBundle, debug tooling) the composer
 * constructs. Browser hosting layers on top in `web-application.tsx`;
 * headless consumers (`pnpm story simulate poc-web`) compose on this
 * definition directly.
 */

export type PocInstanceV1 = CoreGameApplicationInstanceV1<
  PocGameSimulationTypesV1,
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocSemanticActionResultV1
>;

export function pocApplicationExtensionsOfV1(instance: PocInstanceV1): PocApplicationExtensionsV1 {
  const extensions = instance.extensions;
  if (extensions === null || typeof extensions !== "object") {
    throw new TypeError("poc.application_extensions_missing");
  }
  return extensions as PocApplicationExtensionsV1;
}

export const pocCoreApplicationDefinitionV1 = defineCoreGameApplicationV1<
  unknown,
  unknown,
  PocGameSimulationTypesV1,
  PocGameQueriesV1,
  PocGameViewV1,
  NarrativeProjectionV1 | null,
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
  PocSemanticPreviewV1,
  PocSemanticActionResultV1
>({
  entry: pocStoryEntryV1 as never,
  semantic: pocSemanticAdapterV1,
  validateReferences: (state, resolved) =>
    validatePocStateReferencesV1(resolved as PocResolvedGameV1, state),
  validateInvariants: (view, resolved) =>
    validatePocStateInvariantsV1(resolved as PocResolvedGameV1, view),
  exportFilename: "project-tavern-poc-current.json",
  normalizeUnexpectedDispatchFault: (error, snapshot) =>
    createPocUnexpectedFaultAttemptV1(error, snapshot),
  normalizeUnexpectedDebugFault: (error, snapshot) =>
    createPocUnexpectedFaultAttemptV1(error, snapshot),
  createExtensions: (context) => createPocApplicationExtensionsV1(context),
});
