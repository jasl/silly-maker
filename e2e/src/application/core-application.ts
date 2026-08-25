// SPDX-License-Identifier: MIT
import type { SessionLeaseOwnerId } from "@sillymaker/base";
import type { CoreAutosavePolicyV1, CoreSchedulerV1 } from "@sillymaker/base/runtime";
import {
  createCoreGameApplicationInstanceV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createFixedBootstrapEntropyV1 } from "@sillymaker/base/testkit";

import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { labCoreApplicationDefinitionV1 } from "./core-definition.ts";
import {
  defineLabExecutionContextV1,
  labDrillSceneUnitIdV1,
  type LabExecutionContextV1,
  labProcedureSceneUnitIdV1,
} from "../gameplay/runtime-plans.ts";
import { labCalibrationNarrativePlanV1 } from "../gameplay/narrative-units/calibration.ts";
import { labDrillNarrativePlanV1 } from "../gameplay/narrative-units/drill.ts";
import {
  labCalibrationNarrativeUnitIdV1,
  labDrillNarrativeUnitIdV1,
} from "../gameplay/narrative-topology.ts";
import { labDrillSceneV1 } from "../scenes/drill/index.ts";
import { labProcedureSceneV1 } from "../scenes/procedure/index.ts";

export type { LabApplicationInstanceV1 } from "./core-definition.ts";
export { labCoreApplicationDefinitionV1 } from "./core-definition.ts";

const labOwnerIdV1 = "owner.sillymaker.e2e.lab" as SessionLeaseOwnerId;
const labFixedInstantV1 = "2026-07-20T00:00:00.000Z" as IsoUtcInstant;
const labDefaultSeedV1 = 20260720;
const labUuidV1 = "3f5a1c22-9d47-4b7e-8a10-6c2e4d9b1f30";

export interface CreateLabApplicationInstanceOptionsV1 {
  readonly seeds?: readonly number[];
  readonly records?: HostAtomicRecordStoreV1;
  readonly now?: () => IsoUtcInstant;
  readonly autosave?: CoreAutosavePolicyV1;
  readonly scheduler?: CoreSchedulerV1;
  readonly capabilities?: { readonly debugTools?: boolean };
  /** Focused headless injection; Browser owns its per-start addressable runtime. */
  readonly executionContext?: LabExecutionContextV1;
}

export const labHeadlessExecutionContextV1 = defineLabExecutionContextV1({
  requireScenePlan(sceneId) {
    if (sceneId === labProcedureSceneUnitIdV1) return labProcedureSceneV1;
    if (sceneId === labDrillSceneUnitIdV1) return labDrillSceneV1;
    throw new TypeError(`e2e.scene_plan_not_prepared:${sceneId}`);
  },
  requireNarrativePlan(unitId) {
    if (unitId === labCalibrationNarrativeUnitIdV1) return labCalibrationNarrativePlanV1;
    if (unitId === labDrillNarrativeUnitIdV1) return labDrillNarrativePlanV1;
    throw new TypeError(`e2e.narrative_plan_not_prepared:${unitId}`);
  },
});

/**
 * Creates a disposable Engine Lab application instance. Host services are
 * injectable; defaults give a deterministic in-memory headless application.
 */
export async function createLabApplicationInstanceV1(
  options: CreateLabApplicationInstanceOptionsV1 = {},
): Promise<LabApplicationInstanceV1> {
  const resolved = resolveCoreGameApplicationV1(labCoreApplicationDefinitionV1);
  if (resolved.kind === "failed") {
    throw new TypeError(`Engine Lab Story failed to resolve: ${resolved.failure.code}`);
  }
  const seeds = options.seeds ?? [labDefaultSeedV1];
  return createCoreGameApplicationInstanceV1(resolved.application, {
    host: {
      entropy: createFixedBootstrapEntropyV1({
        uuids: seeds.map(() => labUuidV1),
        seeds,
      }),
      records: options.records ?? createMemoryHostRecordStoreV1(),
      now: options.now ?? (() => labFixedInstantV1),
      ownerId: labOwnerIdV1,
      nextHandoffRequestId: () => "handoff.sillymaker.e2e.lab",
    },
    ...(options.autosave === undefined ? {} : { autosave: options.autosave }),
    ...(options.scheduler === undefined ? {} : { scheduler: options.scheduler }),
    ...(options.capabilities === undefined ? {} : { capabilities: options.capabilities }),
    executionContext: options.executionContext ?? labHeadlessExecutionContextV1,
  });
}
