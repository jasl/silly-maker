// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplication } from "@sillymaker/base/story";

import type {
  TemplateActionDescriptorV1,
  TemplateActionResultV1,
  TemplateInvocationV1,
  TemplatePreviewV1,
} from "./semantic.ts";
import { templateSemanticAdapterV1 } from "./semantic.ts";
import type {
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateQueriesV1,
  TemplateSimulationTypesV1,
} from "../game/simulation.ts";
import { templateStoryEntryV1 } from "../story.ts";
import { templateOpeningSceneV1 } from "../scenes/opening/index.ts";

// The starter deliberately includes a repeatable earn action, so the complete
// rollback history is open-ended. Keep a recent, product-owned checkpoint
// window rather than implying that the engine imposes this capacity.
const templateRollbackCheckpointRetentionV1 = 64;

/**
 * The Host-neutral core application: the GamePackage entry plus the
 * semantic adapter. Session, persistence, diagnostics, and lifecycle come
 * from the Base composer; this module never touches React or the DOM, so
 * headless simulation and the browser boot share it.
 */
export const templateCoreApplicationDefinitionV1 = defineCoreGameApplication<
  unknown,
  unknown,
  TemplateSimulationTypesV1,
  TemplateQueriesV1,
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateActionDescriptorV1,
  TemplateInvocationV1,
  TemplatePreviewV1,
  TemplateActionResultV1
>({
  entry: templateStoryEntryV1,
  semantic: templateSemanticAdapterV1,
  projectRebootstrapCommand(snapshot) {
    const mutations = templateOpeningSceneV1.reconcileOrderingMutations(
      snapshot.state.simulation.stage,
    );
    return mutations.length === 0
      ? null
      : ({ kind: "template.scene_reconcile" as const, mutations });
  },
  rollback: {
    capacity: templateRollbackCheckpointRetentionV1,
    classify(command) {
      switch (command.kind) {
        case "template.begin_story":
          return "barrier";
        case "template.narrative_resolve":
          return command.resolution.kind === "barrier_completed" ? "transparent" : "checkpoint";
        case "template.time_tick":
        case "template.scene_reconcile":
          return "transparent";
        case "template.earn_coin":
          return "checkpoint";
        default: {
          const exhaustive: never = command;
          throw new TypeError(`unknown template rollback command ${String(exhaustive)}`);
        }
      }
    },
  },
  exportFilename: "template-save.json",
});

export type TemplateApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  TemplateSimulationTypesV1,
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateActionDescriptorV1,
  TemplateInvocationV1,
  TemplatePreviewV1,
  TemplateActionResultV1
>;
