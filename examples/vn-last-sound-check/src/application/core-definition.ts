// SPDX-License-Identifier: MIT
import type { ResolvedAssetManifestV1 } from "@sillymaker/base";
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  VnLastSoundCheckActionDescriptorV1,
  VnLastSoundCheckActionResultV1,
  VnLastSoundCheckInvocationV1,
  VnLastSoundCheckPreviewV1,
} from "./semantic.ts";
import { vnLastSoundCheckSemanticAdapterV1 } from "./semantic.ts";
import type {
  VnLastSoundCheckGameViewV1,
  VnLastSoundCheckNarrativeViewV1,
  VnLastSoundCheckQueriesV1,
  VnLastSoundCheckSimulationTypesV1,
} from "../game/simulation.ts";
import { vnLastSoundCheckStoryEntryV1 } from "../story.ts";
import { vnLastSoundCheckControlRoomSceneV1 } from "../scenes/control-room/index.ts";
import { vnLastSoundCheckRooftopAntennaSceneV1 } from "../scenes/rooftop-antenna/index.ts";
import { vnLastSoundCheckContentIdsV1 } from "../story/narrative.ts";

/**
 * The Host-neutral core application: the GamePackage entry plus the
 * semantic adapter. Session, persistence, diagnostics, and lifecycle come
 * from the Base composer; this module never touches React or the DOM, so
 * headless simulation and the browser boot share it.
 */
export const vnLastSoundCheckCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  VnLastSoundCheckSimulationTypesV1,
  VnLastSoundCheckQueriesV1,
  VnLastSoundCheckGameViewV1,
  VnLastSoundCheckNarrativeViewV1,
  VnLastSoundCheckActionDescriptorV1,
  VnLastSoundCheckInvocationV1,
  VnLastSoundCheckPreviewV1,
  VnLastSoundCheckActionResultV1
>({
  entry: vnLastSoundCheckStoryEntryV1,
  semantic: vnLastSoundCheckSemanticAdapterV1,
  projectRebootstrapCommand(snapshot) {
    const stage = snapshot.state.simulation.stage;
    const scene = stage.layers.some((layer) =>
        layer.entries.some((entry) =>
          entry.contentId === vnLastSoundCheckContentIdsV1.backgroundRooftopAntenna
        )
      )
      ? vnLastSoundCheckRooftopAntennaSceneV1
      : vnLastSoundCheckControlRoomSceneV1;
    const mutations = scene.reconcileOrderingMutations(stage);
    return mutations.length === 0
      ? null
      : ({ kind: "vn-last-sound-check.scene_reconcile" as const, mutations });
  },
  createExtensions: (context) => ({
    extensions: {
      assets: (context.resolved as { readonly assets: ResolvedAssetManifestV1 }).assets,
    } satisfies VnLastSoundCheckExtensionsV1,
  }),
  resumeFromAutosave: true,
  rollback: {
    capacity: 64,
    classify(command) {
      switch (command.kind) {
        case "vn-last-sound-check.begin_story":
          return "barrier";
        case "vn-last-sound-check.narrative_resolve":
          return command.resolution.kind === "barrier_completed" ? "transparent" : "checkpoint";
        case "vn-last-sound-check.time_tick":
        case "vn-last-sound-check.scene_reconcile":
          return "transparent";
        default: {
          const exhaustive: never = command;
          throw new TypeError(`unknown vn-last-sound-check rollback command ${String(exhaustive)}`);
        }
      }
    },
  },
  exportFilename: "vn-last-sound-check-save.json",
});

export interface VnLastSoundCheckExtensionsV1 {
  readonly assets: ResolvedAssetManifestV1;
}

export type VnLastSoundCheckApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  VnLastSoundCheckSimulationTypesV1,
  VnLastSoundCheckGameViewV1,
  VnLastSoundCheckNarrativeViewV1,
  VnLastSoundCheckActionDescriptorV1,
  VnLastSoundCheckInvocationV1,
  VnLastSoundCheckPreviewV1,
  VnLastSoundCheckActionResultV1
>;
