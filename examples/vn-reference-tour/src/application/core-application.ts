// SPDX-License-Identifier: MIT
import type { HostAtomicRecordStoreV1, IsoUtcInstant, SessionLeaseOwnerId } from "@sillymaker/base";
import {
  createCoreGameApplicationInstanceV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import type { CoreAutosavePolicyV1 } from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";

import type { VnReferenceTourApplicationInstanceV1 } from "./core-definition.ts";
import { vnReferenceTourCoreApplicationDefinitionV1 } from "./core-definition.ts";

export type { VnReferenceTourApplicationInstanceV1 } from "./core-definition.ts";
export { vnReferenceTourCoreApplicationDefinitionV1 } from "./core-definition.ts";

const ownerIdV1 = "owner.sillymaker.vn-reference-tour" as SessionLeaseOwnerId;
const fixedInstantV1 = "2026-08-27T00:00:00.000Z" as IsoUtcInstant;
const defaultSeedV1 = 20260827;
const fixedUuidV1 = "7c1d3e58-2b96-4f41-9d05-8a37c60f21b4";

export interface CreateVnReferenceTourApplicationInstanceOptionsV1 {
  readonly seeds?: readonly number[];
  readonly records?: HostAtomicRecordStoreV1;
  readonly now?: () => IsoUtcInstant;
  /** Test/simulation override; the shipped Browser host owns its policy. */
  readonly autosave?: CoreAutosavePolicyV1;
}

/**
 * Creates a disposable headless application instance for tests and the
 * `deno task app simulate example-vn-reference-tour` target. Deterministic by default.
 */
export async function createVnReferenceTourApplicationInstanceV1(
  options: CreateVnReferenceTourApplicationInstanceOptionsV1 = {},
): Promise<VnReferenceTourApplicationInstanceV1> {
  const resolved = resolveCoreGameApplicationV1(vnReferenceTourCoreApplicationDefinitionV1);
  if (resolved.kind === "failed") {
    throw new TypeError(`vn-reference-tour Story failed to resolve: ${resolved.failure.code}`);
  }
  const seeds = options.seeds ?? [defaultSeedV1];
  return createCoreGameApplicationInstanceV1(resolved.application, {
    ...(options.autosave === undefined ? {} : { autosave: options.autosave }),
    host: {
      entropy: createFixedBootstrapEntropyV1({
        uuids: seeds.map(() => fixedUuidV1),
        seeds,
      }),
      records: options.records ?? createMemoryHostRecordStoreV1(),
      now: options.now ?? (() => fixedInstantV1),
      ownerId: ownerIdV1,
      nextHandoffRequestId: () => "handoff.sillymaker.vn-reference-tour",
    },
  });
}
