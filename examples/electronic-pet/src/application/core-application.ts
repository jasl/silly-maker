// SPDX-License-Identifier: MIT
import type { HostAtomicRecordStoreV1, IsoUtcInstant, SessionLeaseOwnerId } from "@sillymaker/base";
import {
  createCoreGameApplicationInstanceV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";

import type { ElectronicPetApplicationInstanceV1 } from "./core-definition.ts";
import { electronicPetCoreApplicationDefinitionV1 } from "./core-definition.ts";

const ownerIdV1 = "owner.sillymaker.electronic-pet" as SessionLeaseOwnerId;
const fixedInstantV1 = "2026-08-27T00:00:00.000Z" as IsoUtcInstant;

export interface CreateElectronicPetApplicationInstanceOptionsV1 {
  readonly records?: HostAtomicRecordStoreV1;
  readonly now?: () => IsoUtcInstant;
}

/** Deterministic headless instance for product tests and project simulation. */
export async function createElectronicPetApplicationInstanceV1(
  options: CreateElectronicPetApplicationInstanceOptionsV1 = {},
): Promise<ElectronicPetApplicationInstanceV1> {
  const resolved = resolveCoreGameApplicationV1(electronicPetCoreApplicationDefinitionV1);
  if (resolved.kind === "failed") {
    throw new TypeError(`electronic pet Story failed to resolve: ${resolved.failure.code}`);
  }
  return createCoreGameApplicationInstanceV1(resolved.application, {
    host: {
      entropy: createFixedBootstrapEntropyV1({
        uuids: ["0a7ea922-44a0-4dc7-a464-f4d4443ef128"],
        seeds: [20260827],
      }),
      records: options.records ?? createMemoryHostRecordStoreV1(),
      now: options.now ?? (() => fixedInstantV1),
      ownerId: ownerIdV1,
      nextHandoffRequestId: () => "handoff.sillymaker.electronic-pet",
    },
  });
}

export type { ElectronicPetApplicationInstanceV1 } from "./core-definition.ts";
export { electronicPetCoreApplicationDefinitionV1 } from "./core-definition.ts";
