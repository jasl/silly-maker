// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  createManagedSurfaceApplicationEpochAllocatorInternalV1,
  managedSurfaceApplicationEpochRealmKeyInternalV1,
} from "./managed-surface-application-epoch.ts";

function createRealmV1(): object {
  return Object.create(null) as object;
}

describe("Managed Surface application epoch allocator", () => {
  it("shares one monotonic application cursor across allocators in the same realm", () => {
    const realm = createRealmV1();
    const first = createManagedSurfaceApplicationEpochAllocatorInternalV1({
      applicationId: "application.alpha",
      realm,
    });
    const successor = createManagedSurfaceApplicationEpochAllocatorInternalV1({
      applicationId: "application.alpha",
      realm,
    });

    expect(first.allocate()).toBe(1);
    expect(successor.allocate()).toBe(2);
    expect(first.allocate()).toBe(3);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(successor)).toBe(true);
  });

  it("keeps application cursors independent inside one realm", () => {
    const realm = createRealmV1();
    const alpha = createManagedSurfaceApplicationEpochAllocatorInternalV1({
      applicationId: "application.alpha",
      realm,
    });
    const beta = createManagedSurfaceApplicationEpochAllocatorInternalV1({
      applicationId: "application.beta",
      realm,
    });

    expect(alpha.allocate()).toBe(1);
    expect(alpha.allocate()).toBe(2);
    expect(beta.allocate()).toBe(1);
    expect(beta.allocate()).toBe(2);
  });

  it("allows a fresh realm to restart the same application at epoch one", () => {
    const firstRealm = createRealmV1();
    const reloadedRealm = createRealmV1();

    const predecessor = createManagedSurfaceApplicationEpochAllocatorInternalV1({
      applicationId: "application.alpha",
      realm: firstRealm,
    });
    const reloaded = createManagedSurfaceApplicationEpochAllocatorInternalV1({
      applicationId: "application.alpha",
      realm: reloadedRealm,
    });

    expect(predecessor.allocate()).toBe(1);
    expect(predecessor.allocate()).toBe(2);
    expect(reloaded.allocate()).toBe(1);
  });

  it("allocates the maximum safe epoch once, then fails without wrapping or mutation", () => {
    const realm = createRealmV1();
    const highWaterByApplicationId = new Map<string, number>([
      ["application.alpha", Number.MAX_SAFE_INTEGER - 1],
    ]);
    Object.defineProperty(realm, managedSurfaceApplicationEpochRealmKeyInternalV1, {
      configurable: false,
      enumerable: false,
      value: Object.freeze({
        protocolRevision: 1 as const,
        highWaterByApplicationId,
      }),
      writable: false,
    });
    const allocator = createManagedSurfaceApplicationEpochAllocatorInternalV1({
      applicationId: "application.alpha",
      realm,
    });

    expect(allocator.allocate()).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => allocator.allocate()).toThrow(
      "web.managed_surface_application_epoch_exhausted",
    );
    expect(highWaterByApplicationId.get("application.alpha")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("rejects a conflicting realm cell without invoking its accessor", () => {
    const realm = createRealmV1();
    let getterCount = 0;
    Object.defineProperty(realm, managedSurfaceApplicationEpochRealmKeyInternalV1, {
      configurable: false,
      get() {
        getterCount += 1;
        return undefined;
      },
    });

    expect(() =>
      createManagedSurfaceApplicationEpochAllocatorInternalV1({
        applicationId: "application.alpha",
        realm,
      })
    ).toThrow("web.managed_surface_application_epoch_cell_invalid");
    expect(getterCount).toBe(0);
  });

  it("rejects a replaceable realm cell that could reset the same-realm cursor", () => {
    const realm = createRealmV1();
    Object.defineProperty(realm, managedSurfaceApplicationEpochRealmKeyInternalV1, {
      configurable: true,
      enumerable: false,
      value: Object.freeze({
        protocolRevision: 1 as const,
        highWaterByApplicationId: new Map<string, number>(),
      }),
      writable: true,
    });

    expect(() =>
      createManagedSurfaceApplicationEpochAllocatorInternalV1({
        applicationId: "application.alpha",
        realm,
      })
    ).toThrow("web.managed_surface_application_epoch_cell_invalid");
  });

  it("rejects a mutable inner cell that could replace the high-water map", () => {
    const realm = createRealmV1();
    const mutableCell = {
      protocolRevision: 1 as const,
      highWaterByApplicationId: new Map<string, number>(),
    };
    Object.defineProperty(realm, managedSurfaceApplicationEpochRealmKeyInternalV1, {
      configurable: false,
      enumerable: false,
      value: mutableCell,
      writable: false,
    });

    expect(() =>
      createManagedSurfaceApplicationEpochAllocatorInternalV1({
        applicationId: "application.alpha",
        realm,
      })
    ).toThrow("web.managed_surface_application_epoch_cell_invalid");
    expect(Object.isFrozen(mutableCell)).toBe(false);
  });

  it("rejects Map subclasses and corrupted current-application high-water", () => {
    class NoopMapV1 extends Map<string, number> {
      override set(): this {
        return this;
      }
    }
    const subclassRealm = createRealmV1();
    Object.defineProperty(subclassRealm, managedSurfaceApplicationEpochRealmKeyInternalV1, {
      configurable: false,
      enumerable: false,
      value: Object.freeze({
        protocolRevision: 1 as const,
        highWaterByApplicationId: new NoopMapV1(),
      }),
      writable: false,
    });
    expect(() =>
      createManagedSurfaceApplicationEpochAllocatorInternalV1({
        applicationId: "application.alpha",
        realm: subclassRealm,
      })
    ).toThrow("web.managed_surface_application_epoch_cell_invalid");

    const corruptRealm = createRealmV1();
    Object.defineProperty(corruptRealm, managedSurfaceApplicationEpochRealmKeyInternalV1, {
      configurable: false,
      enumerable: false,
      value: Object.freeze({
        protocolRevision: 1 as const,
        highWaterByApplicationId: new Map<string, number>([["application.alpha", 0]]),
      }),
      writable: false,
    });
    const corrupt = createManagedSurfaceApplicationEpochAllocatorInternalV1({
      applicationId: "application.alpha",
      realm: corruptRealm,
    });
    expect(() => corrupt.allocate()).toThrow(
      "web.managed_surface_application_epoch_cell_invalid",
    );
  });
});
