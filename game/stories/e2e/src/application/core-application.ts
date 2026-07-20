// SPDX-License-Identifier: MIT
import type { SessionLeaseOwnerId } from "@sillymaker/base";
import type {
  CoreAutosavePolicyV1,
  CoreGameApplicationInstanceV1,
  CoreSchedulerV1,
} from "@sillymaker/base/runtime";
import {
  createCoreGameApplicationInstanceV1,
  defineCoreGameApplicationV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createFixedBootstrapEntropyV1 } from "@sillymaker/base/testkit";

import type {
  LabActionDescriptorV1,
  LabActionResultV1,
  LabInvocationV1,
  LabPreviewV1,
} from "./semantic.js";
import { labSemanticAdapterV1 } from "./semantic.js";
import type { LabGameViewV1, LabQueriesV1, LabSimulationTypesV1 } from "../gameplay/simulation.js";
import { labStoryEntryV1 } from "../story.js";

/**
 * The Engine Lab core application definition: the whole application is the
 * GamePackage entry plus the semantic adapter. Session, persistence,
 * diagnostics, and lifecycle come from the Base composer.
 */
export const labCoreApplicationDefinitionV1 = defineCoreGameApplicationV1<
  unknown,
  unknown,
  LabSimulationTypesV1,
  LabQueriesV1,
  LabGameViewV1,
  null,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1
>({
  entry: labStoryEntryV1,
  semantic: labSemanticAdapterV1,
  exportFilename: "engine-lab-save.json",
});

export type LabApplicationInstanceV1 = CoreGameApplicationInstanceV1<
  LabSimulationTypesV1,
  LabGameViewV1,
  null,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1
>;

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
}

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
    host: Object.freeze({
      entropy: createFixedBootstrapEntropyV1({
        uuids: seeds.map(() => labUuidV1),
        seeds,
      }),
      records: options.records ?? createMemoryHostRecordStoreV1(),
      now: options.now ?? (() => labFixedInstantV1),
      ownerId: labOwnerIdV1,
      nextHandoffRequestId: () => "handoff.sillymaker.e2e.lab",
    }),
    ...(options.autosave === undefined ? {} : { autosave: options.autosave }),
    ...(options.scheduler === undefined ? {} : { scheduler: options.scheduler }),
    ...(options.capabilities === undefined ? {} : { capabilities: options.capabilities }),
  });
}
