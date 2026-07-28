// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  OsActionDescriptorV1,
  OsActionResultV1,
  OsInvocationV1,
  OsPreviewV1,
} from "./semantic.ts";
import { osSemanticAdapterV1 } from "./semantic.ts";
import type {
  OsGameViewV1,
  OsNarrativeViewV1,
  OsQueriesV1,
  OsSimulationTypesV1,
} from "../simulation.ts";
import { osStoryEntryV1 } from "../story.ts";

/** Host-neutral core application: a desktop simulation needs no rollback (minesweeper undo = cheating), so none is configured. */
export const osCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  OsSimulationTypesV1,
  OsQueriesV1,
  OsGameViewV1,
  OsNarrativeViewV1,
  OsActionDescriptorV1,
  OsInvocationV1,
  OsPreviewV1,
  OsActionResultV1
>({
  entry: osStoryEntryV1,
  semantic: osSemanticAdapterV1,
  exportFilename: "silly-os-save.json",
  // Boot restores the last shutdown state (computer semantics; save rules stay invisible to the player).
  resumeFromAutosave: true,
});

export type OsApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  OsSimulationTypesV1,
  OsGameViewV1,
  OsNarrativeViewV1,
  OsActionDescriptorV1,
  OsInvocationV1,
  OsPreviewV1,
  OsActionResultV1
>;
