// SPDX-License-Identifier: MIT
import type { ResolvedAssetManifestV1 } from "@sillymaker/base";
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  CatcafeActionDescriptorV1,
  CatcafeActionResultV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
} from "./semantic.ts";
import { catcafeSemanticAdapterV1 } from "./semantic.ts";
import type {
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeSimulationTypesV1,
} from "../game/simulation.ts";
import { catcafeStoryEntryV1 } from "../story.ts";

/**
 * The Host-neutral core application: the GamePackage entry plus the
 * semantic adapter. Session, persistence, diagnostics, and lifecycle come
 * from the Base composer; this module never touches React or the DOM, so
 * headless simulation and the browser boot share it.
 */
export const catcafeCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  CatcafeSimulationTypesV1,
  CatcafeQueriesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1
>({
  entry: catcafeStoryEntryV1,
  semantic: catcafeSemanticAdapterV1,
  exportFilename: "catcafe-save.json",
  // Boot resume: this is what makes the title screen's "Continue" truthful —
  // the autosave restores automatically after a refresh, no manual "load" needed.
  resumeFromAutosave: true,
  // Player rollback (R7): contest start and ending confirmation are hard barriers —
  // a contest cannot be re-rolled by stepping back before it started (RNG rides the
  // snapshot, so retrying replays the same result), and a confirmed ending is final. Every other commit is an ordinary checkpoint.
  rollback: {
    capacity: 24,
    classify: (command) =>
      command.kind === "cc.enter_contest" || command.kind === "cc.enter_postgame"
        ? "barrier"
        : "checkpoint",
  },
  // The resolved asset manifest rides the extensions surface so the web UI
  // can build its asset registry; extensions observe, never own.
  createExtensions: (context) => ({
    extensions: Object.freeze({
      assets: (context.resolved as { readonly assets: ResolvedAssetManifestV1 }).assets,
    }),
  }),
});

export interface CatcafeExtensionsV1 {
  readonly assets: ResolvedAssetManifestV1;
}

export type CatcafeApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  CatcafeSimulationTypesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1
>;
