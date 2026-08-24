// SPDX-License-Identifier: MIT
import { type NonNegativeSafeInteger, parseNonNegativeSafeInteger } from "@sillymaker/base";

/**
 * Realm-owned storage key. `Symbol.for` survives module replacement while the
 * property itself disappears with a full page/realm reload.
 *
 * @internal This module is intentionally absent from the Web package barrel.
 */
export const managedSurfaceApplicationEpochRealmKeyInternalV1 = Symbol.for(
  "sillymaker.web.managed-surface-application-epoch.v1",
);

interface ManagedSurfaceApplicationEpochRealmCellV1 {
  readonly highWaterByApplicationId: Map<string, number>;
}

export interface ManagedSurfaceApplicationEpochAllocatorInternalV1 {
  allocate(): NonNegativeSafeInteger;
}

function createRealmCellV1(): ManagedSurfaceApplicationEpochRealmCellV1 {
  return ({
    highWaterByApplicationId: new Map<string, number>(),
  });
}

function realmCellV1(realm: object): ManagedSurfaceApplicationEpochRealmCellV1 {
  const cells = realm as Record<PropertyKey, unknown>;
  const existing = cells[managedSurfaceApplicationEpochRealmKeyInternalV1];
  if (existing !== undefined) return existing as ManagedSurfaceApplicationEpochRealmCellV1;

  const cell = createRealmCellV1();
  Object.defineProperty(realm, managedSurfaceApplicationEpochRealmKeyInternalV1, {
    configurable: false,
    enumerable: false,
    value: cell,
    writable: false,
  });
  return cell;
}

/**
 * Creates an application-scoped allocator backed by a realm-stable cell.
 * Independent factory calls for the same realm/application share one cursor;
 * a different realm starts a fresh counting domain at epoch 1.
 *
 * @internal The injectable realm is the deterministic test seam. Production
 * composition roots omit it and use `globalThis`.
 */
export function createManagedSurfaceApplicationEpochAllocatorInternalV1(input: {
  readonly applicationId: string;
  readonly realm?: object;
}): ManagedSurfaceApplicationEpochAllocatorInternalV1 {
  if (typeof input.applicationId !== "string" || input.applicationId.length === 0) {
    throw new TypeError("web.managed_surface_application_id_invalid");
  }
  const applicationId = input.applicationId;
  const cell = realmCellV1(input.realm ?? globalThis);

  return ({
    allocate(): NonNegativeSafeInteger {
      const highWater = cell.highWaterByApplicationId.get(applicationId) ?? 0;
      if (highWater >= Number.MAX_SAFE_INTEGER) {
        throw new TypeError("web.managed_surface_application_epoch_exhausted");
      }
      const epoch = parseNonNegativeSafeInteger(highWater + 1);
      cell.highWaterByApplicationId.set(applicationId, epoch);
      return epoch;
    },
  });
}
