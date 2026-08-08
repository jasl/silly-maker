// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type PositiveSafeInteger,
} from "@sillymaker/base";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  parseManagedSurfaceOwnerIdV1,
  type ManagedSurfaceOwnerIdV1,
} from "./managed-surface-contracts.ts";
import type {
  ManagedSurfaceStablePublisherLeaseInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
} from "./managed-surface-stable-contract.ts";
import {
  advanceManagedSurfaceStableSequenceInternalV1,
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
  type ManagedSurfaceStablePublisherInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistrySnapshotInternalV1,
  type ManagedSurfaceStablePublisherLeaseSnapshotInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";

const workspaceOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
const narrativeOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.narrative");

function registryV1(input: {
  readonly applicationEpoch?: number;
  readonly owners?: readonly ManagedSurfaceOwnerIdV1[];
  readonly leaseSequenceAllocator?: { allocate(): PositiveSafeInteger };
} = {}): ManagedSurfaceStablePublisherLeaseRegistryInternalV1 {
  return createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: parseNonNegativeSafeInteger(input.applicationEpoch ?? 23),
    resolvedOwnerIds: input.owners ?? [workspaceOwnerIdV1, narrativeOwnerIdV1],
    leaseSequenceAllocator: input.leaseSequenceAllocator ??
      createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
}

describe("dormant managed stable publisher lease", () => {
  it("keeps the opaque lease separate from bounded registry and publisher cursors", () => {
    expectTypeOf<Extract<keyof ManagedSurfaceStablePublisherLeaseInternalV1, string | number>>()
      .toEqualTypeOf<never>();
    expectTypeOf<keyof ManagedSurfaceStablePublisherLeaseRegistrySnapshotInternalV1>()
      .toEqualTypeOf<
        "applicationEpoch" | "leaseSequenceHighWater" | "currentPublisherCount" | "disposed"
      >();
    expectTypeOf<keyof ManagedSurfaceStablePublisherLeaseSnapshotInternalV1>()
      .toEqualTypeOf<
        | "leaseId"
        | "ownerId"
        | "applicationEpoch"
        | "leaseSequence"
        | "sourceRevisionIssuanceHighWater"
        | "occurrenceIssuanceHighWater"
        | "disposed"
      >();
    expectTypeOf<keyof ManagedSurfaceStablePublisherInternalV1>().toEqualTypeOf<
      "lease" | "getSnapshot" | "issueSourceRevision" | "issueOccurrence"
    >();
    expectTypeOf<keyof ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1>()
      .toEqualTypeOf<"publisherLease" | "occurrenceSequenceHighWater">();
    expectTypeOf<
      Extract<
        keyof ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
        "acceptedSourceRevision" | "targets" | "runtime" | "topology" | "readiness"
      >
    >().toEqualTypeOf<never>();

    const registry = registryV1();
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);

    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(publisher)).toBe(true);
    expect(Object.isFrozen(publisher.lease)).toBe(true);
    expect(Reflect.ownKeys(publisher.lease)).toEqual([]);
    expect(registry.inspectCurrentLease(publisher.lease)).toBe(publisher.getSnapshot());
  });

  it("allocates independent owner leases and deterministic stable identity domains", () => {
    const registry = registryV1({ applicationEpoch: 7 });
    const workspace = registry.issuePublisher(workspaceOwnerIdV1);
    const narrative = registry.issuePublisher(narrativeOwnerIdV1);

    expect(workspace.getSnapshot()).toMatchObject({
      leaseId: "surface-stable-publisher.e7.n1",
      ownerId: workspaceOwnerIdV1,
      applicationEpoch: 7,
      leaseSequence: 1,
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
      disposed: false,
    });
    expect(narrative.getSnapshot()).toMatchObject({
      leaseId: "surface-stable-publisher.e7.n2",
      ownerId: narrativeOwnerIdV1,
      leaseSequence: 2,
    });
    expect(workspace.lease).not.toBe(narrative.lease);
    expect(workspace.issueSourceRevision()).toBe(1);
    expect(narrative.issueSourceRevision()).toBe(1);
    const workspaceOccurrence = workspace.issueOccurrence();
    const narrativeOccurrence = narrative.issueOccurrence();
    expect(workspaceOccurrence).toBe("surface-stable-occurrence.e7.l1.n1");
    expect(narrativeOccurrence).toBe("surface-stable-occurrence.e7.l2.n1");
    expect(registry.inspectIssuedOccurrence(workspace.lease, workspaceOccurrence)).toBe(1);
    expect(registry.inspectIssuedOccurrence(narrative.lease, workspaceOccurrence)).toBeNull();
  });

  it("accepts a strictly monotonic injected lease-domain gap", () => {
    const sequences = [4, 9] as const;
    let index = 0;
    const registry = registryV1({
      leaseSequenceAllocator: Object.freeze({
        allocate: (): PositiveSafeInteger => parsePositiveSafeInteger(sequences[index++]!),
      }),
    });

    expect(registry.issuePublisher(workspaceOwnerIdV1).getSnapshot().leaseSequence).toBe(4);
    expect(registry.issuePublisher(narrativeOwnerIdV1).getSnapshot().leaseSequence).toBe(9);
    expect(registry.getSnapshot().leaseSequenceHighWater).toBe(9);
  });

  it("captures the exact claimed allocator without rereading its input property", () => {
    let claimedCalls = 0;
    let foreignCalls = 0;
    let allocatorReads = 0;
    const claimedAllocator = Object.freeze({
      allocate(): PositiveSafeInteger {
        expect(this).toBe(claimedAllocator);
        claimedCalls += 1;
        return parsePositiveSafeInteger(claimedCalls);
      },
    });
    const foreignAllocator = Object.freeze({
      allocate(): PositiveSafeInteger {
        foreignCalls += 1;
        return parsePositiveSafeInteger(99);
      },
    });
    const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
      applicationEpoch: parseNonNegativeSafeInteger(23),
      resolvedOwnerIds: [workspaceOwnerIdV1],
      get leaseSequenceAllocator() {
        allocatorReads += 1;
        return allocatorReads === 1 ? claimedAllocator : foreignAllocator;
      },
    });

    expect(allocatorReads).toBe(1);
    expect(registry.issuePublisher(workspaceOwnerIdV1).getSnapshot().leaseSequence).toBe(1);
    expect(allocatorReads).toBe(1);
    expect(claimedCalls).toBe(1);
    expect(foreignCalls).toBe(0);
  });

  it("claims one injected lease domain for one registry and restarts local sequences by epoch", () => {
    const leaseDomain = createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1();
    const workspaceRegistry = registryV1({
      applicationEpoch: 7,
      owners: [workspaceOwnerIdV1],
      leaseSequenceAllocator: leaseDomain,
    });
    expect(() =>
      registryV1({
        applicationEpoch: 7,
        owners: [narrativeOwnerIdV1],
        leaseSequenceAllocator: leaseDomain,
      })
    ).toThrow("ui.managed_surface_stable_lease_domain_claimed");
    const successorEpoch = registryV1({
      applicationEpoch: 8,
      owners: [workspaceOwnerIdV1],
    });

    const workspace = workspaceRegistry.issuePublisher(workspaceOwnerIdV1);
    const successor = successorEpoch.issuePublisher(workspaceOwnerIdV1);
    expect(workspace.getSnapshot().leaseSequence).toBe(1);
    expect(successor.getSnapshot().leaseSequence).toBe(1);
    expect(workspace.issueOccurrence()).toBe("surface-stable-occurrence.e7.l1.n1");
    expect(successor.issueOccurrence()).toBe("surface-stable-occurrence.e8.l1.n1");
  });

  it("issues exact-next revisions while accepted delivery may legally skip an issued revision", () => {
    const publisher = registryV1().issuePublisher(workspaceOwnerIdV1);

    const revision1 = publisher.issueSourceRevision();
    const abandonedRevision2 = publisher.issueSourceRevision();
    const revision3 = publisher.issueSourceRevision();

    expect([revision1, abandonedRevision2, revision3]).toEqual([1, 2, 3]);
    expectTypeOf(revision3).toEqualTypeOf<ManagedSurfaceStableSourceRevisionInternalV1>();
    expect(publisher.getSnapshot().sourceRevisionIssuanceHighWater).toBe(3);
    expect(Object.keys(publisher.getSnapshot())).not.toContain("acceptedSourceRevision");
  });

  it("keeps occurrence issuance separate from immutable accepted high-water", () => {
    const registry = registryV1();
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);
    const accepted0 = registry.createAcceptedOccurrenceHighWater(publisher.lease);
    const occurrence1 = publisher.issueOccurrence();
    publisher.issueOccurrence();
    const occurrence3 = publisher.issueOccurrence();

    expect(accepted0).toEqual({
      publisherLease: publisher.lease,
      occurrenceSequenceHighWater: 0,
    });
    expect(Object.isFrozen(accepted0)).toBe(true);
    expect(registry.inspectIssuedOccurrence(publisher.lease, occurrence1)).toBe(1);
    expect(registry.inspectIssuedOccurrence(publisher.lease, occurrence3)).toBe(3);
    expect(accepted0.occurrenceSequenceHighWater).toBe(0);

    const issuanceSnapshot = publisher.getSnapshot();
    const registrySnapshot = registry.getSnapshot();
    const accepted1 = registry.advanceAcceptedOccurrenceHighWater(
      accepted0,
      parseNonNegativeSafeInteger(1),
    );
    const accepted3 = registry.advanceAcceptedOccurrenceHighWater(
      accepted0,
      parseNonNegativeSafeInteger(3),
    );
    expect(accepted3).toEqual({
      publisherLease: publisher.lease,
      occurrenceSequenceHighWater: 3,
    });
    expect(accepted1.occurrenceSequenceHighWater).toBe(1);
    expect(accepted0.occurrenceSequenceHighWater).toBe(0);
    expect(publisher.getSnapshot()).toBe(issuanceSnapshot);
    expect(registry.getSnapshot()).toBe(registrySnapshot);
    expect(
      registry.classifyOccurrenceAgainstAcceptedHighWater(accepted3, occurrence1, false),
    ).toBe("reused");
    expect(
      registry.classifyOccurrenceAgainstAcceptedHighWater(accepted3, occurrence3, true),
    ).toBe("retained");
    const occurrence4 = publisher.issueOccurrence();
    expect(
      registry.classifyOccurrenceAgainstAcceptedHighWater(accepted3, occurrence4, false),
    ).toBe("fresh");
    expect(
      registry.classifyOccurrenceAgainstAcceptedHighWater(
        accepted3,
        "surface-stable-occurrence.e23.l1.n5",
        false,
      ),
    ).toBe("unissued");
    expect(
      registry.classifyOccurrenceAgainstAcceptedHighWater(
        accepted3,
        "surface-stable-occurrence.e23.l2.n1",
        false,
      ),
    ).toBe("foreign");
    expect(
      registry.advanceAcceptedOccurrenceHighWater(
        accepted3,
        parseNonNegativeSafeInteger(3),
      ),
    ).toBe(accepted3);
    expect(() =>
      registry.advanceAcceptedOccurrenceHighWater(
        accepted3,
        parseNonNegativeSafeInteger(2),
      )
    ).toThrow("ui.managed_surface_stable_accepted_occurrence_high_water_regressed");
    expect(() =>
      registry.advanceAcceptedOccurrenceHighWater(
        accepted3,
        parseNonNegativeSafeInteger(5),
      )
    ).toThrow("ui.managed_surface_stable_occurrence_unissued");
    expect(accepted3.occurrenceSequenceHighWater).toBe(3);
    expect(accepted0.occurrenceSequenceHighWater).toBe(0);
    expect(publisher.getSnapshot().occurrenceIssuanceHighWater).toBe(4);
  });

  it("rejects unknown and duplicate current owners before consuming a lease sequence", () => {
    let calls = 0;
    const allocator = Object.freeze({
      allocate(): PositiveSafeInteger {
        calls += 1;
        return parsePositiveSafeInteger(calls);
      },
    });
    const registry = registryV1({
      owners: [workspaceOwnerIdV1],
      leaseSequenceAllocator: allocator,
    });

    expect(() => registry.issuePublisher(narrativeOwnerIdV1)).toThrow(
      "ui.managed_surface_stable_publisher_owner_unresolved",
    );
    expect(calls).toBe(0);
    const first = registry.issuePublisher(workspaceOwnerIdV1);
    expect(calls).toBe(1);
    expect(() => registry.issuePublisher(workspaceOwnerIdV1)).toThrow(
      "ui.managed_surface_stable_publisher_owner_current",
    );
    expect(calls).toBe(1);
    expect(registry.disposePublisherLease(first.lease)).toBe("disposed");
    expect(registry.issuePublisher(workspaceOwnerIdV1).getSnapshot().leaseSequence).toBe(2);
    expect(calls).toBe(2);
  });

  it("fails closed around throwing, malformed, nonmonotonic, and reentrant lease allocators", () => {
    const throwing = registryV1({
      leaseSequenceAllocator: Object.freeze({
        allocate(): PositiveSafeInteger {
          throw new Error("allocator exploded");
        },
      }),
    });
    const throwingBefore = throwing.getSnapshot();
    expect(() => throwing.issuePublisher(workspaceOwnerIdV1)).toThrow("allocator exploded");
    expect(throwing.getSnapshot()).toBe(throwingBefore);

    const invalidSequences: readonly unknown[] = [
      0,
      -0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      "1",
      null,
    ];
    for (const invalid of invalidSequences) {
      const malformed = registryV1({
        leaseSequenceAllocator: Object.freeze({
          allocate: () => invalid as PositiveSafeInteger,
        }),
      });
      const before = malformed.getSnapshot();
      expect(() => malformed.issuePublisher(workspaceOwnerIdV1)).toThrow(
        "ui.managed_surface_stable_lease_sequence_invalid",
      );
      expect(malformed.getSnapshot()).toBe(before);
    }

    let cursor = 0;
    const duplicateAllocator = Object.freeze({
      allocate(): PositiveSafeInteger {
        cursor += 1;
        return parsePositiveSafeInteger(cursor === 1 ? 7 : 7);
      },
    });
    const duplicate = registryV1({ leaseSequenceAllocator: duplicateAllocator });
    duplicate.issuePublisher(workspaceOwnerIdV1);
    const beforeDuplicate = duplicate.getSnapshot();
    expect(() => duplicate.issuePublisher(narrativeOwnerIdV1)).toThrow(
      "ui.managed_surface_stable_lease_sequence_nonmonotonic",
    );
    expect(duplicate.getSnapshot()).toBe(beforeDuplicate);

    let reentrant!: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
    const reentrantAllocator = Object.freeze({
      allocate(): PositiveSafeInteger {
        expect(() => reentrant.issuePublisher(narrativeOwnerIdV1)).toThrow(
          "ui.managed_surface_stable_lease_allocation_in_progress",
        );
        return parsePositiveSafeInteger(11);
      },
    });
    reentrant = registryV1({ leaseSequenceAllocator: reentrantAllocator });
    expect(reentrant.issuePublisher(workspaceOwnerIdV1).getSnapshot().leaseSequence).toBe(11);

    let disposing!: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
    const disposingAllocator = Object.freeze({
      allocate(): PositiveSafeInteger {
        expect(disposing.dispose()).toBe("disposed");
        return parsePositiveSafeInteger(13);
      },
    });
    disposing = registryV1({ leaseSequenceAllocator: disposingAllocator });
    expect(() => disposing.issuePublisher(workspaceOwnerIdV1)).toThrow(
      "ui.managed_surface_stable_publisher_registry_disposed",
    );
    expect(disposing.getSnapshot()).toEqual({
      applicationEpoch: 23,
      leaseSequenceHighWater: 0,
      currentPublisherCount: 0,
      disposed: true,
    });
  });

  it("rejects forged leases and accepted cursors without inspecting caller properties", () => {
    const registry = registryV1();
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);
    const revokedLease = Proxy.revocable(Object.freeze({}), {});
    revokedLease.revoke();

    expect(registry.inspectCurrentLease(Object.freeze({}))).toBeNull();
    expect(registry.inspectCurrentLease(revokedLease.proxy)).toBeNull();
    expect(registry.inspectIssuedOccurrence(revokedLease.proxy, publisher.issueOccurrence()))
      .toBeNull();
    expect(
      registry.inspectIssuedOccurrence(
        publisher.lease,
        `surface-stable-occurrence.e23.l1.n${"9".repeat(1_000_000)}`,
      ),
    ).toBeNull();
    expect(() =>
      registry.advanceAcceptedOccurrenceHighWater(
        Object.freeze({
          publisherLease: publisher.lease,
          occurrenceSequenceHighWater: parseNonNegativeSafeInteger(0),
        }),
        parseNonNegativeSafeInteger(0),
      )
    ).toThrow("ui.managed_surface_stable_accepted_occurrence_cursor_invalid");
  });

  it("disposes issuance idempotently and fences old lease ABA after a fresh lease", () => {
    const registry = registryV1();
    const predecessor = registry.issuePublisher(workspaceOwnerIdV1);
    const oldRevision = predecessor.issueSourceRevision();
    const oldOccurrence = predecessor.issueOccurrence();
    const accepted = registry.createAcceptedOccurrenceHighWater(predecessor.lease);

    expect(registry.disposePublisherLease(predecessor.lease)).toBe("disposed");
    const disposedSnapshot = predecessor.getSnapshot();
    expect(disposedSnapshot.disposed).toBe(true);
    expect(registry.disposePublisherLease(predecessor.lease)).toBe("already_disposed");
    expect(registry.disposePublisherLease(Object.freeze({}))).toBe("stale");
    expect(predecessor.getSnapshot()).toBe(disposedSnapshot);
    expect(registry.inspectCurrentLease(predecessor.lease)).toBeNull();
    expect(registry.inspectIssuedOccurrence(predecessor.lease, oldOccurrence)).toBeNull();
    expect(() => predecessor.issueSourceRevision()).toThrow(
      "ui.managed_surface_stable_publisher_lease_disposed",
    );
    expect(() => predecessor.issueOccurrence()).toThrow(
      "ui.managed_surface_stable_publisher_lease_disposed",
    );
    expect(() =>
      registry.advanceAcceptedOccurrenceHighWater(
        accepted,
        parseNonNegativeSafeInteger(1),
      )
    ).toThrow("ui.managed_surface_stable_publisher_lease_stale");

    const successor = registry.issuePublisher(workspaceOwnerIdV1);
    expect(successor.lease).not.toBe(predecessor.lease);
    expect(successor.issueSourceRevision()).toBe(oldRevision);
    const freshOccurrence = successor.issueOccurrence();
    expect(freshOccurrence).not.toBe(oldOccurrence);
    expect(registry.inspectIssuedOccurrence(successor.lease, oldOccurrence)).toBeNull();
    const successorSnapshot = successor.getSnapshot();
    const registrySnapshot = registry.getSnapshot();
    expect(registry.disposePublisherLease(predecessor.lease)).toBe("already_disposed");
    expect(successor.getSnapshot()).toBe(successorSnapshot);
    expect(registry.getSnapshot()).toBe(registrySnapshot);
    expect(registry.inspectCurrentLease(successor.lease)).toBe(successorSnapshot);
  });

  it("rejects authentic foreign lease and cursor evidence without changing either registry", () => {
    const firstRegistry = registryV1({ owners: [workspaceOwnerIdV1] });
    const secondRegistry = registryV1({ owners: [narrativeOwnerIdV1] });
    const first = firstRegistry.issuePublisher(workspaceOwnerIdV1);
    const second = secondRegistry.issuePublisher(narrativeOwnerIdV1);
    const firstCursor = firstRegistry.createAcceptedOccurrenceHighWater(first.lease);
    const firstSnapshot = firstRegistry.getSnapshot();
    const secondSnapshot = secondRegistry.getSnapshot();

    expect(secondRegistry.inspectCurrentLease(first.lease)).toBeNull();
    expect(secondRegistry.disposePublisherLease(first.lease)).toBe("stale");
    expect(() =>
      secondRegistry.advanceAcceptedOccurrenceHighWater(
        firstCursor,
        parseNonNegativeSafeInteger(0),
      )
    ).toThrow("ui.managed_surface_stable_accepted_occurrence_cursor_invalid");
    expect(firstRegistry.getSnapshot()).toBe(firstSnapshot);
    expect(secondRegistry.getSnapshot()).toBe(secondSnapshot);
    expect(firstRegistry.inspectCurrentLease(first.lease)).toBe(first.getSnapshot());
    expect(secondRegistry.inspectCurrentLease(second.lease)).toBe(second.getSnapshot());
  });

  it("disposes the registry without notifying or retaining current publisher authority", () => {
    const leaseDomain = createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1();
    const registry = registryV1({ leaseSequenceAllocator: leaseDomain });
    const workspace = registry.issuePublisher(workspaceOwnerIdV1);
    const narrative = registry.issuePublisher(narrativeOwnerIdV1);

    expect(registry.dispose()).toBe("disposed");
    const disposed = registry.getSnapshot();
    expect(disposed).toMatchObject({ currentPublisherCount: 0, disposed: true });
    expect(registry.dispose()).toBe("already_disposed");
    expect(registry.getSnapshot()).toBe(disposed);
    expect(workspace.getSnapshot().disposed).toBe(true);
    expect(narrative.getSnapshot().disposed).toBe(true);
    expect(() => registry.issuePublisher(workspaceOwnerIdV1)).toThrow(
      "ui.managed_surface_stable_publisher_registry_disposed",
    );
    expect(() =>
      registryV1({
        owners: [workspaceOwnerIdV1],
        leaseSequenceAllocator: leaseDomain,
      })
    ).toThrow("ui.managed_surface_stable_lease_domain_claimed");
  });

  it("checks all sequence exhaustion before wrapping or mutating a cursor", () => {
    const maximum = parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER);
    const penultimate = parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER - 1);

    for (const kind of ["lease", "source_revision", "occurrence"] as const) {
      expect(advanceManagedSurfaceStableSequenceInternalV1(penultimate, kind)).toBe(
        Number.MAX_SAFE_INTEGER,
      );
      expect(() => advanceManagedSurfaceStableSequenceInternalV1(maximum, kind)).toThrow(
        `ui.managed_surface_stable_${kind}_sequence_exhausted`,
      );
    }

    const allocator = createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(
      penultimate,
    );
    expect(allocator.allocate()).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => allocator.allocate()).toThrow(
      "ui.managed_surface_stable_lease_sequence_exhausted",
    );
    expect(() => allocator.allocate()).toThrow(
      "ui.managed_surface_stable_lease_sequence_exhausted",
    );
  });

  it("keeps 10k issuance and lease churn bounded to scalar cursors and current owners", () => {
    const registry = registryV1({ owners: [workspaceOwnerIdV1] });
    const longLived = registry.issuePublisher(workspaceOwnerIdV1);
    let accepted = registry.createAcceptedOccurrenceHighWater(longLived.lease);
    for (let sequence = 1; sequence <= 10_000; sequence += 1) {
      longLived.issueSourceRevision();
      longLived.issueOccurrence();
      accepted = registry.advanceAcceptedOccurrenceHighWater(
        accepted,
        parseNonNegativeSafeInteger(sequence),
      );
    }
    expect(longLived.getSnapshot()).toMatchObject({
      sourceRevisionIssuanceHighWater: 10_000,
      occurrenceIssuanceHighWater: 10_000,
    });
    expect(accepted.occurrenceSequenceHighWater).toBe(10_000);
    expect(registry.disposePublisherLease(longLived.lease)).toBe("disposed");

    let firstLease: ManagedSurfaceStablePublisherInternalV1 | null = null;
    let lastLease: ManagedSurfaceStablePublisherInternalV1 | null = null;

    for (let index = 0; index < 10_000; index += 1) {
      const publisher = registry.issuePublisher(workspaceOwnerIdV1);
      firstLease ??= publisher;
      publisher.issueSourceRevision();
      publisher.issueOccurrence();
      expect(registry.disposePublisherLease(publisher.lease)).toBe("disposed");
      lastLease = publisher;
    }

    expect(registry.getSnapshot()).toEqual({
      applicationEpoch: 23,
      leaseSequenceHighWater: 10_001,
      currentPublisherCount: 0,
      disposed: false,
    });
    expect(Reflect.ownKeys(registry.getSnapshot())).toHaveLength(4);
    expect(firstLease!.getSnapshot()).toMatchObject({ leaseSequence: 2, disposed: true });
    expect(lastLease!.getSnapshot()).toMatchObject({ leaseSequence: 10_001, disposed: true });
    expect(registry.inspectCurrentLease(firstLease!.lease)).toBeNull();
  });
});
