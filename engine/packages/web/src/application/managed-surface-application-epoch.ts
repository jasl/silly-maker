// SPDX-License-Identifier: MIT
import { type NonNegativeSafeInteger, parseNonNegativeSafeInteger } from "@sillymaker/base";

const NativeMapV1 = Map;
const nativeMapPrototypeV1 = NativeMapV1.prototype;
const nativeMapHasV1 = nativeMapPrototypeV1.has;
const nativeMapGetV1 = nativeMapPrototypeV1.get;
const nativeMapSetV1 = nativeMapPrototypeV1.set;

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
  readonly protocolRevision: 1;
  readonly highWaterByApplicationId: Map<string, number>;
}

export interface ManagedSurfaceApplicationEpochAllocatorInternalV1 {
  allocate(): NonNegativeSafeInteger;
}

function cellInvalidV1(cause?: unknown): TypeError {
  return cause === undefined
    ? new TypeError("web.managed_surface_application_epoch_cell_invalid")
    : new TypeError("web.managed_surface_application_epoch_cell_invalid", { cause });
}

function isDataDescriptorV1(
  descriptor: PropertyDescriptor | undefined,
): descriptor is PropertyDescriptor & { readonly value: unknown } {
  return descriptor !== undefined && Object.hasOwn(descriptor, "value");
}

function isLockedRealmCellDescriptorV1(
  descriptor: PropertyDescriptor | undefined,
): descriptor is PropertyDescriptor & { readonly value: unknown } {
  return isDataDescriptorV1(descriptor) &&
    descriptor.configurable === false &&
    descriptor.enumerable === false &&
    descriptor.writable === false;
}

function isFrozenCellFieldDescriptorV1(
  descriptor: PropertyDescriptor | undefined,
): descriptor is PropertyDescriptor & { readonly value: unknown } {
  return isDataDescriptorV1(descriptor) &&
    descriptor.configurable === false &&
    descriptor.enumerable === true &&
    descriptor.writable === false;
}

function isNativeMapV1(value: unknown): value is Map<string, number> {
  if (typeof value !== "object" || value === null) return false;
  try {
    return Object.getPrototypeOf(value) === nativeMapPrototypeV1;
  } catch {
    return false;
  }
}

function parseRealmCellV1(value: unknown): ManagedSurfaceApplicationEpochRealmCellV1 {
  if (typeof value !== "object" || value === null) throw cellInvalidV1();
  let descriptors: PropertyDescriptorMap;
  let ownKeys: readonly PropertyKey[];
  let frozen: boolean;
  try {
    descriptors = Object.getOwnPropertyDescriptors(value);
    ownKeys = Reflect.ownKeys(value);
    frozen = Object.isFrozen(value);
  } catch (error) {
    throw cellInvalidV1(error);
  }
  const revision = descriptors.protocolRevision;
  const highWater = descriptors.highWaterByApplicationId;
  if (
    !frozen ||
    ownKeys.length !== 2 ||
    !Object.hasOwn(descriptors, "protocolRevision") ||
    !Object.hasOwn(descriptors, "highWaterByApplicationId") ||
    !isFrozenCellFieldDescriptorV1(revision) ||
    revision.value !== 1 ||
    !isFrozenCellFieldDescriptorV1(highWater) ||
    !isNativeMapV1(highWater.value)
  ) {
    throw cellInvalidV1();
  }
  return value as ManagedSurfaceApplicationEpochRealmCellV1;
}

function createRealmCellV1(): ManagedSurfaceApplicationEpochRealmCellV1 {
  return Object.freeze({
    protocolRevision: 1 as const,
    highWaterByApplicationId: new NativeMapV1<string, number>(),
  });
}

function realmCellV1(realm: object): ManagedSurfaceApplicationEpochRealmCellV1 {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(
      realm,
      managedSurfaceApplicationEpochRealmKeyInternalV1,
    );
  } catch (error) {
    throw cellInvalidV1(error);
  }
  if (descriptor !== undefined) {
    if (!isLockedRealmCellDescriptorV1(descriptor)) throw cellInvalidV1();
    return parseRealmCellV1(descriptor.value);
  }

  const cell = createRealmCellV1();
  try {
    Object.defineProperty(realm, managedSurfaceApplicationEpochRealmKeyInternalV1, {
      configurable: false,
      enumerable: false,
      value: cell,
      writable: false,
    });
    const installed = Object.getOwnPropertyDescriptor(
      realm,
      managedSurfaceApplicationEpochRealmKeyInternalV1,
    );
    if (!isLockedRealmCellDescriptorV1(installed) || installed.value !== cell) {
      throw cellInvalidV1();
    }
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === "web.managed_surface_application_epoch_cell_invalid"
    ) {
      throw error;
    }
    throw cellInvalidV1(error);
  }
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

  return Object.freeze({
    allocate(): NonNegativeSafeInteger {
      let hasHighWater: boolean;
      let storedHighWater: number | undefined;
      try {
        hasHighWater = nativeMapHasV1.call(
          cell.highWaterByApplicationId,
          applicationId,
        );
        storedHighWater = hasHighWater
          ? nativeMapGetV1.call(cell.highWaterByApplicationId, applicationId)
          : undefined;
      } catch (error) {
        throw cellInvalidV1(error);
      }
      if (
        hasHighWater &&
        (typeof storedHighWater !== "number" ||
          !Number.isSafeInteger(storedHighWater) ||
          Object.is(storedHighWater, -0) ||
          storedHighWater < 1)
      ) {
        throw cellInvalidV1();
      }
      const highWater = storedHighWater ?? 0;
      if (highWater >= Number.MAX_SAFE_INTEGER) {
        throw new TypeError("web.managed_surface_application_epoch_exhausted");
      }
      const epoch = parseNonNegativeSafeInteger(highWater + 1);
      try {
        nativeMapSetV1.call(cell.highWaterByApplicationId, applicationId, epoch);
      } catch (error) {
        throw cellInvalidV1(error);
      }
      return epoch;
    },
  });
}
