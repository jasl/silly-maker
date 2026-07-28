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

import type { OsApplicationInstanceV1 } from "./core-definition.ts";
import { osCoreApplicationDefinitionV1 } from "./core-definition.ts";

export type { OsApplicationInstanceV1 } from "./core-definition.ts";
export { osCoreApplicationDefinitionV1 } from "./core-definition.ts";

const ownerIdV1 = "owner.sillymaker.silly-os" as SessionLeaseOwnerId;
const fixedInstantV1 = "2026-07-28T00:00:00.000Z" as IsoUtcInstant;
const defaultSeedV1 = 19980625;
const fixedUuidV1 = "5a92c7e0-4f13-4b6a-8d2e-91c7a30b54f8";

export interface CreateOsApplicationInstanceOptionsV1 {
  readonly seeds?: readonly number[];
  readonly records?: HostAtomicRecordStoreV1;
  readonly now?: () => IsoUtcInstant;
}

/** One-shot headless instance for tests and `story simulate` (deterministic by default). */
export async function createOsApplicationInstanceV1(
  options: CreateOsApplicationInstanceOptionsV1 = {},
): Promise<OsApplicationInstanceV1> {
  const resolved = resolveCoreGameApplicationV1(osCoreApplicationDefinitionV1);
  if (resolved.kind === "failed") {
    throw new TypeError(`silly-os Story failed to resolve: ${resolved.failure.code}`);
  }
  const seeds = options.seeds ?? [defaultSeedV1];
  return createCoreGameApplicationInstanceV1(resolved.application, {
    host: Object.freeze({
      entropy: createFixedBootstrapEntropyV1({
        uuids: seeds.map(() => fixedUuidV1),
        seeds,
      }),
      records: options.records ?? createMemoryHostRecordStoreV1(),
      now: options.now ?? (() => fixedInstantV1),
      ownerId: ownerIdV1,
      nextHandoffRequestId: () => "handoff.sillymaker.silly-os",
    }),
  });
}
