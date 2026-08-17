// SPDX-License-Identifier: MIT
import type { StateContractManifestV1 } from "@sillymaker/base";
import {
  defineSimulationPatchSurface,
  parseModuleId,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "@sillymaker/base";

import type { TemplateGameSimulationV1 } from "./simulation.ts";
import { createTemplateGameSimulationV1 } from "./simulation.ts";

/**
 * State-contract identity: these revisions version the SHAPES in
 * `state.ts` and gate save compatibility. Bump only on breaking schema
 * change (new module slot, removed/retyped required field, restructure),
 * together with a `defineSaveStateMigrationRegistryV1` step so existing
 * saves keep loading; additive optional/defaulted fields need no bump.
 */
export const templateStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.template.game-state",
    revision: parsePositiveSafeInteger(1),
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: parseModuleId("template.inventory"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.inventory")]),
      stateSchema: Object.freeze({
        schemaId: "schema.template.inventory-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("template.narrative"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.narrative")]),
      stateSchema: Object.freeze({
        schemaId: "schema.template.narrative-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
    Object.freeze({
      moduleId: parseModuleId("template.stage"),
      // Revision 2: placement gained the required opacityPermille (semantic
      // stage contract revision 3).
      moduleContractRevision: parsePositiveSafeInteger(2),
      stateSlots: Object.freeze([parseStateSlotId("simulation.stage")]),
      stateSchema: Object.freeze({
        schemaId: "schema.template.stage-state",
        revision: parsePositiveSafeInteger(2),
      }),
    }),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([]),
}) satisfies StateContractManifestV1;

export const templateSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface TemplateSimulationProgramV1 {
  readonly kind: "template";
}

function materializeTemplateSimulationProgramV1(): TemplateSimulationProgramV1 {
  return Object.freeze({ kind: "template" });
}

function createTemplateSimulationFromProgramV1(
  _program: TemplateSimulationProgramV1,
): TemplateGameSimulationV1 {
  return createTemplateGameSimulationV1();
}

/** Package-internal owner for every callback in the Story simulation facet. */
export const templateSimulationDefinitionV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractManifest: templateStateContractManifestV1,
  data: Object.freeze({}),
  rules: Object.freeze({}),
  narrativeProgram: null,
  patchSurface: templateSimulationPatchSurfaceV1,
  materializeProgram: materializeTemplateSimulationProgramV1,
  createGameSimulation: createTemplateSimulationFromProgramV1,
});
