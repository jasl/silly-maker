// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  VnReferenceTourActionDescriptorV1,
  VnReferenceTourActionResultV1,
  VnReferenceTourInvocationV1,
  VnReferenceTourPreviewV1,
} from "./semantic.ts";
import { vnReferenceTourSemanticAdapterV1 } from "./semantic.ts";
import type {
  VnReferenceTourGameViewV1,
  VnReferenceTourNarrativeViewV1,
  VnReferenceTourQueriesV1,
  VnReferenceTourSimulationTypesV1,
} from "../game/simulation.ts";
import { vnReferenceTourStoryEntryV1 } from "../story.ts";
import { vnReferenceTourControlRoomSceneV1 } from "../scenes/control-room/index.ts";
import { vnReferenceTourRooftopAntennaSceneV1 } from "../scenes/rooftop-antenna/index.ts";
import { vnReferenceTourContentIdsV1 } from "../story/narrative.ts";

/**
 * The Host-neutral core application: the GamePackage entry plus the
 * semantic adapter. Session, persistence, diagnostics, and lifecycle come
 * from the Base composer; this module never touches React or the DOM, so
 * headless simulation and the browser boot share it.
 */
export const vnReferenceTourCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  VnReferenceTourSimulationTypesV1,
  VnReferenceTourQueriesV1,
  VnReferenceTourGameViewV1,
  VnReferenceTourNarrativeViewV1,
  VnReferenceTourActionDescriptorV1,
  VnReferenceTourInvocationV1,
  VnReferenceTourPreviewV1,
  VnReferenceTourActionResultV1
>({
  entry: vnReferenceTourStoryEntryV1,
  semantic: vnReferenceTourSemanticAdapterV1,
  projectRebootstrapCommand(snapshot) {
    const stage = snapshot.state.simulation.stage;
    const scene = stage.layers.some((layer) =>
        layer.entries.some((entry) =>
          entry.contentId === vnReferenceTourContentIdsV1.backgroundRooftopAntenna
        )
      )
      ? vnReferenceTourRooftopAntennaSceneV1
      : vnReferenceTourControlRoomSceneV1;
    const mutations = scene.reconcileOrderingMutations(stage);
    return mutations.length === 0
      ? null
      : ({ kind: "vn-reference-tour.scene_reconcile" as const, mutations });
  },
  exportFilename: "vn-reference-tour-save.json",
});

export type VnReferenceTourApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  VnReferenceTourSimulationTypesV1,
  VnReferenceTourGameViewV1,
  VnReferenceTourNarrativeViewV1,
  VnReferenceTourActionDescriptorV1,
  VnReferenceTourInvocationV1,
  VnReferenceTourPreviewV1,
  VnReferenceTourActionResultV1
>;
