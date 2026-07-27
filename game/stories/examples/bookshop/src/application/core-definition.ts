// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  BookshopActionDescriptorV1,
  BookshopActionResultV1,
  BookshopInvocationV1,
  BookshopPreviewV1,
} from "./semantic.ts";
import { bookshopSemanticAdapterV1 } from "./semantic.ts";
import type {
  BookshopGameViewV1,
  BookshopNarrativeViewV1,
  BookshopQueriesV1,
  BookshopSimulationTypesV1,
} from "../simulation.ts";
import { bookshopStoryEntryV1 } from "../story.ts";

/**
 * The Host-neutral core application: the GamePackage entry plus the
 * semantic adapter. Session, persistence, diagnostics, and lifecycle come
 * from the Base composer; this module never touches React or the DOM, so
 * headless simulation and the browser boot share it.
 */
export const bookshopCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  BookshopSimulationTypesV1,
  BookshopQueriesV1,
  BookshopGameViewV1,
  BookshopNarrativeViewV1,
  BookshopActionDescriptorV1,
  BookshopInvocationV1,
  BookshopPreviewV1,
  BookshopActionResultV1
>({
  entry: bookshopStoryEntryV1,
  semantic: bookshopSemanticAdapterV1,
  exportFilename: "bookshop-save.json",
});

export type BookshopApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  BookshopSimulationTypesV1,
  BookshopGameViewV1,
  BookshopNarrativeViewV1,
  BookshopActionDescriptorV1,
  BookshopInvocationV1,
  BookshopPreviewV1,
  BookshopActionResultV1
>;
