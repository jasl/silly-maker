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

import type { CatcafeApplicationInstanceV1 } from "./core-definition.ts";
import { catcafeCoreApplicationDefinitionV1 } from "./core-definition.ts";

export type { CatcafeApplicationInstanceV1 } from "./core-definition.ts";
export { catcafeCoreApplicationDefinitionV1 } from "./core-definition.ts";

const ownerIdV1 = "owner.sillymaker.catcafe" as SessionLeaseOwnerId;
const fixedInstantV1 = "2026-07-27T00:00:00.000Z" as IsoUtcInstant;
const defaultSeedV1 = 20260727;
const fixedUuidV1 = "7c1d3e58-2b96-4f41-9d05-8a37c60f21b4";

export interface CreateCatcafeApplicationInstanceOptionsV1 {
  readonly seeds?: readonly number[];
  readonly records?: HostAtomicRecordStoreV1;
  readonly now?: () => IsoUtcInstant;
}

/**
 * Creates a disposable headless application instance for tests and the
 * `deno task story simulate catcafe` target. Deterministic by default.
 */
export async function createCatcafeApplicationInstanceV1(
  options: CreateCatcafeApplicationInstanceOptionsV1 = {},
): Promise<CatcafeApplicationInstanceV1> {
  const resolved = resolveCoreGameApplicationV1(catcafeCoreApplicationDefinitionV1);
  if (resolved.kind === "failed") {
    throw new TypeError(`catcafe Story failed to resolve: ${resolved.failure.code}`);
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
      nextHandoffRequestId: () => "handoff.sillymaker.catcafe",
    }),
  });
}
