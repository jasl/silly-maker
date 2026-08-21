// SPDX-License-Identifier: MIT
import type { CoreGameApplicationInstanceV1 } from "@sillymaker/base/runtime";
import { defineCoreGameApplicationV1 } from "@sillymaker/base/runtime";

import type {
  LabActionDescriptorV1,
  LabActionResultV1,
  LabInvocationV1,
  LabPreviewV1,
} from "./semantic.ts";
import { labSemanticAdapterV1 } from "./semantic.ts";
import type {
  LabGameViewV1,
  LabNarrativeViewV1,
  LabQueriesV1,
  LabSimulationTypesV1,
} from "../gameplay/simulation.ts";
import { labStoryEntryV1 } from "../story.ts";
import { labSaveStateMigrationRegistryV1 } from "../save-state-migrations.ts";

/**
 * The Engine Lab core application definition: the whole application is the
 * GamePackage entry plus the semantic adapter. Session, persistence,
 * diagnostics, and lifecycle come from the Base composer. This module stays
 * production-clean (no testkit) so browser builds can include it.
 */
export const labCoreApplicationDefinitionV1 = defineCoreGameApplicationV1<
  unknown,
  unknown,
  LabSimulationTypesV1,
  LabQueriesV1,
  LabGameViewV1,
  LabNarrativeViewV1,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1
>({
  entry: labStoryEntryV1,
  semantic: labSemanticAdapterV1,
  saveStateMigrations: labSaveStateMigrationRegistryV1,
  exportFilename: "engine-lab-save.json",
  // Player rollback (R7): experiments settle results — a hard barrier the
  // player cannot roll back across; everything else is checkpointed.
  rollback: {
    capacity: 32,
    classify: (command) => (command.kind === "lab.run_experiment" ? "barrier" : "checkpoint"),
  },
  // Persistence safepoints (parallel-monitors M3): a pending presentation
  // barrier is the Lab's natural in-flight span — Saves should re-enter at
  // the pre-transition state, not inside the transition. The barrier's
  // `loadRecovery` stays authoritative for Saves that do capture one
  // (bound forfeit, imports); the span only keeps ordinary writes out.
  persistenceSafepoint: {
    classify: (state) =>
      state.simulation.narrative.pending?.kind === "presentation_barrier"
        ? "in_flight"
        : "safepoint",
    maxInFlightCommits: 8,
  },
});

export type LabApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  LabSimulationTypesV1,
  LabGameViewV1,
  LabNarrativeViewV1,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1
>;
