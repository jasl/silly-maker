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
export const templateStateContractManifestV1 = ({
  contractRevision: 1 as const,
  aggregateStateSchema: {
    schemaId: "schema.template.game-state",
    revision: parsePositiveSafeInteger(1),
  },
  moduleStateSchemas: [
    {
      moduleId: parseModuleId("template.inventory"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.inventory")],
      stateSchema: {
        schemaId: "schema.template.inventory-state",
        revision: parsePositiveSafeInteger(1),
      },
    },
    {
      moduleId: parseModuleId("template.narrative"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.narrative")],
      stateSchema: {
        schemaId: "schema.template.narrative-state",
        revision: parsePositiveSafeInteger(1),
      },
    },
    {
      moduleId: parseModuleId("template.stage"),
      // Revision 3: the Stage rules admit the package-private R2 ordering
      // reconcile command; the persisted Stage shape remains revision 2.
      moduleContractRevision: parsePositiveSafeInteger(3),
      stateSlots: [parseStateSlotId("simulation.stage")],
      stateSchema: {
        schemaId: "schema.template.stage-state",
        revision: parsePositiveSafeInteger(2),
      },
    },
  ],
  persistentIrSchemas: [],
  stableReferenceSets: [],
}) satisfies StateContractManifestV1;

export const templateSimulationPatchSurfaceV1 = defineSimulationPatchSurface({});

export interface TemplateSimulationProgramV1 {
  readonly kind: "template";
}

function materializeTemplateSimulationProgramV1(): TemplateSimulationProgramV1 {
  return ({ kind: "template" });
}

function createTemplateSimulationFromProgramV1(
  _program: TemplateSimulationProgramV1,
): TemplateGameSimulationV1 {
  return createTemplateGameSimulationV1();
}

/** Package-internal owner for every callback in the Story simulation facet. */
export const templateSimulationDefinitionV1 = {
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractManifest: templateStateContractManifestV1,
  data: {},
  rules: {},
  narrativeProgram: null,
  patchSurface: templateSimulationPatchSurfaceV1,
  materializeProgram: materializeTemplateSimulationProgramV1,
  createGameSimulation: createTemplateSimulationFromProgramV1,
};
