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
      value: {
        highWaterByApplicationId,
      },
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
});
