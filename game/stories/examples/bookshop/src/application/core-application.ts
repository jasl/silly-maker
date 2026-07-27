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

import type { BookshopApplicationInstanceV1 } from "./core-definition.ts";
import { bookshopCoreApplicationDefinitionV1 } from "./core-definition.ts";

export type { BookshopApplicationInstanceV1 } from "./core-definition.ts";
export { bookshopCoreApplicationDefinitionV1 } from "./core-definition.ts";

const ownerIdV1 = "owner.sillymaker.bookshop" as SessionLeaseOwnerId;
const fixedInstantV1 = "2026-07-27T00:00:00.000Z" as IsoUtcInstant;
const defaultSeedV1 = 20260727;
const fixedUuidV1 = "7c1d3e58-2b96-4f41-9d05-8a37c60f21b4";

export interface CreateBookshopApplicationInstanceOptionsV1 {
  readonly seeds?: readonly number[];
  readonly records?: HostAtomicRecordStoreV1;
  readonly now?: () => IsoUtcInstant;
}

/**
 * Creates a disposable headless application instance for tests and the
 * `pnpm story simulate bookshop` target. Deterministic by default.
 */
export async function createBookshopApplicationInstanceV1(
  options: CreateBookshopApplicationInstanceOptionsV1 = {},
): Promise<BookshopApplicationInstanceV1> {
  const resolved = resolveCoreGameApplicationV1(bookshopCoreApplicationDefinitionV1);
  if (resolved.kind === "failed") {
    throw new TypeError(`bookshop Story failed to resolve: ${resolved.failure.code}`);
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
      nextHandoffRequestId: () => "handoff.sillymaker.bookshop",
    }),
  });
}
