// SPDX-License-Identifier: MIT
import {
  type NonNegativeSafeInteger,
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
  claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1,
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
  type ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1,
  type ManagedSurfaceStablePublisherInternalV1,
  type ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1,
  type ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1,
  type ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1,
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

  it("claims one injected lease domain only for the registry live lifetime", () => {
    const leaseDomain = createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1();
    const workspaceRegistry = registryV1({
      applicationEpoch: 7,
      owners: [workspaceOwnerIdV1],
      leaseSequenceAllocator: leaseDomain,
    });
    const workspace = workspaceRegistry.issuePublisher(workspaceOwnerIdV1);
    const workspaceOccurrence = workspace.issueOccurrence();
    expect(() =>
      registryV1({
        applicationEpoch: 7,
        owners: [narrativeOwnerIdV1],
        leaseSequenceAllocator: leaseDomain,
      })
    ).toThrow("ui.managed_surface_stable_lease_domain_claimed");
    expect(workspaceRegistry.dispose()).toBe("disposed");
    const successorEpoch = registryV1({
      applicationEpoch: 8,
      owners: [workspaceOwnerIdV1],
      leaseSequenceAllocator: leaseDomain,
    });

    const successor = successorEpoch.issuePublisher(workspaceOwnerIdV1);
    expect(workspace.getSnapshot().leaseSequence).toBe(1);
    expect(successor.getSnapshot().leaseSequence).toBe(2);
    expect(workspaceOccurrence).toBe("surface-stable-occurrence.e7.l1.n1");
    expect(() => workspace.issueOccurrence()).toThrow(
      "ui.managed_surface_stable_publisher_lease_disposed",
    );
    expect(successor.issueOccurrence()).toBe("surface-stable-occurrence.e8.l2.n1");
    expect(workspaceRegistry.dispose()).toBe("already_disposed");
    expect(() =>
      registryV1({
        applicationEpoch: 9,
        owners: [narrativeOwnerIdV1],
        leaseSequenceAllocator: leaseDomain,
      })
    ).toThrow("ui.managed_surface_stable_lease_domain_claimed");
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

  it("captures one frozen zero-key proof bound to the exact accepted cursor", () => {
    expectTypeOf<
      Extract<
        keyof ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1,
        string | number
      >
    >().toEqualTypeOf<never>();

    const registry = registryV1();
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);
    const occurrence1 = publisher.issueOccurrence();
    const occurrence2 = publisher.issueOccurrence();
    const occurrence3 = publisher.issueOccurrence();
    const accepted0 = registry.createAcceptedOccurrenceHighWater(publisher.lease);
    const accepted1 = registry.advanceAcceptedOccurrenceHighWater(
      accepted0,
      parseNonNegativeSafeInteger(1),
    );
    const publisherSnapshot = publisher.getSnapshot();
    const registrySnapshot = registry.getSnapshot();
    const proof = registry.captureAcceptedOccurrenceAdmissionProof(accepted1);

    const classifications = [
      registry.classifyOccurrenceAgainstAdmissionProof(proof, occurrence1, true),
      registry.classifyOccurrenceAgainstAdmissionProof(proof, occurrence1, false),
      registry.classifyOccurrenceAgainstAdmissionProof(proof, occurrence2, false),
      registry.classifyOccurrenceAgainstAdmissionProof(proof, occurrence3, false),
      registry.classifyOccurrenceAgainstAdmissionProof(
        proof,
        "surface-stable-occurrence.e23.l1.n4",
        false,
      ),
      registry.classifyOccurrenceAgainstAdmissionProof(
        proof,
        "surface-stable-occurrence.e23.l2.n1",
        false,
      ),
    ] as const;
    expect(classifications).toEqual([
      { kind: "retained", occurrenceSequence: 1 },
      { kind: "reused", occurrenceSequence: 1 },
      { kind: "fresh", occurrenceSequence: 2 },
      { kind: "fresh", occurrenceSequence: 3 },
      { kind: "unissued" },
      { kind: "foreign" },
    ]);
    expect(
      registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        proof,
        parseNonNegativeSafeInteger(1),
      ),
    ).toBe(accepted1);
    expect(accepted0.occurrenceSequenceHighWater).toBe(0);
    expect(accepted1.occurrenceSequenceHighWater).toBe(1);
    expect(publisher.getSnapshot()).toBe(publisherSnapshot);
    expect(registry.getSnapshot()).toBe(registrySnapshot);
  });

  it("keeps captured proof usable after disposal while current-only APIs stay stale", () => {
    const registry = registryV1();
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);
    const occurrence1 = publisher.issueOccurrence();
    const occurrence2 = publisher.issueOccurrence();
    const occurrence3 = publisher.issueOccurrence();
    const accepted0 = registry.createAcceptedOccurrenceHighWater(publisher.lease);
    const accepted1 = registry.advanceAcceptedOccurrenceHighWater(
      accepted0,
      parseNonNegativeSafeInteger(1),
    );
    const proof = registry.captureAcceptedOccurrenceAdmissionProof(accepted1);
    const registryBeforeDispose = registry.getSnapshot();

    expect(registry.disposePublisherLease(publisher.lease)).toBe("disposed");
    expect(registry.getSnapshot()).not.toBe(registryBeforeDispose);
    const disposedRegistrySnapshot = registry.getSnapshot();
    const disposedPublisherSnapshot = publisher.getSnapshot();

    expect(
      registry.classifyOccurrenceAgainstAdmissionProof(proof, occurrence1, true),
    ).toEqual({ kind: "retained", occurrenceSequence: 1 });
    expect(
      registry.classifyOccurrenceAgainstAdmissionProof(proof, occurrence2, false),
    ).toEqual({ kind: "fresh", occurrenceSequence: 2 });
    expect(
      registry.classifyOccurrenceAgainstAdmissionProof(proof, occurrence3, false),
    ).toEqual({ kind: "fresh", occurrenceSequence: 3 });

    const accepted3 = registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
      proof,
      parseNonNegativeSafeInteger(3),
    );
    expect(accepted3).toEqual({
      publisherLease: publisher.lease,
      occurrenceSequenceHighWater: 3,
    });
    expect(accepted1.occurrenceSequenceHighWater).toBe(1);
    expect(registry.getSnapshot()).toBe(disposedRegistrySnapshot);
    expect(publisher.getSnapshot()).toBe(disposedPublisherSnapshot);
    expect(() => registry.captureAcceptedOccurrenceAdmissionProof(accepted1)).toThrow(
      "ui.managed_surface_stable_publisher_lease_stale",
    );

    expect(() => registry.classifyOccurrenceAgainstAcceptedHighWater(accepted1, occurrence1, true))
      .toThrow("ui.managed_surface_stable_publisher_lease_stale");
    expect(() =>
      registry.advanceAcceptedOccurrenceHighWater(
        accepted1,
        parseNonNegativeSafeInteger(3),
      )
    ).toThrow("ui.managed_surface_stable_publisher_lease_stale");
  });

  it("keeps captured proof usable after registry-wide disposal", () => {
    const registry = registryV1();
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);
    const occurrence1 = publisher.issueOccurrence();
    const occurrence2 = publisher.issueOccurrence();
    const accepted0 = registry.createAcceptedOccurrenceHighWater(publisher.lease);
    const proof = registry.captureAcceptedOccurrenceAdmissionProof(accepted0);

    expect(registry.dispose()).toBe("disposed");
    const disposedRegistrySnapshot = registry.getSnapshot();
    const disposedPublisherSnapshot = publisher.getSnapshot();

    expect(
      registry.classifyOccurrenceAgainstAdmissionProof(proof, occurrence1, false),
    ).toEqual({ kind: "fresh", occurrenceSequence: 1 });
    expect(
      registry.classifyOccurrenceAgainstAdmissionProof(proof, occurrence2, false),
    ).toEqual({ kind: "fresh", occurrenceSequence: 2 });
    const accepted2 = registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
      proof,
      parseNonNegativeSafeInteger(2),
    );
    expect(accepted2).toEqual({
      publisherLease: publisher.lease,
      occurrenceSequenceHighWater: 2,
    });
    expect(accepted0.occurrenceSequenceHighWater).toBe(0);
    expect(registry.getSnapshot()).toBe(disposedRegistrySnapshot);
    expect(publisher.getSnapshot()).toBe(disposedPublisherSnapshot);
    expect(() => registry.captureAcceptedOccurrenceAdmissionProof(accepted0)).toThrow(
      "ui.managed_surface_stable_publisher_lease_stale",
    );
    expect(() => registry.classifyOccurrenceAgainstAcceptedHighWater(accepted0, occurrence1, false))
      .toThrow("ui.managed_surface_stable_publisher_lease_stale");
  });

  it("bounds captured classification and cursor derivation to the proof-time issuance branch", () => {
    const registry = registryV1();
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);
    const accepted0 = registry.createAcceptedOccurrenceHighWater(publisher.lease);
    const occurrence1 = publisher.issueOccurrence();
    const oldProof = registry.captureAcceptedOccurrenceAdmissionProof(accepted0);
    const occurrence2 = publisher.issueOccurrence();
    const newProof = registry.captureAcceptedOccurrenceAdmissionProof(accepted0);
    const publisherSnapshot = publisher.getSnapshot();
    const registrySnapshot = registry.getSnapshot();

    expect(
      registry.classifyOccurrenceAgainstAdmissionProof(oldProof, occurrence1, false),
    ).toEqual({ kind: "fresh", occurrenceSequence: 1 });
    expect(
      registry.classifyOccurrenceAgainstAdmissionProof(oldProof, occurrence2, false),
    ).toEqual({ kind: "unissued" });
    expect(
      registry.classifyOccurrenceAgainstAdmissionProof(newProof, occurrence2, false),
    ).toEqual({ kind: "fresh", occurrenceSequence: 2 });
    expect(() =>
      registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        oldProof,
        parseNonNegativeSafeInteger(2),
      )
    ).toThrow("ui.managed_surface_stable_occurrence_unissued");

    const accepted2 = registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
      newProof,
      parseNonNegativeSafeInteger(2),
    );
    expect(
      registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        newProof,
        parseNonNegativeSafeInteger(0),
      ),
    ).toBe(accepted0);
    const accepted2Proof = registry.captureAcceptedOccurrenceAdmissionProof(accepted2);
    expect(
      registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        accepted2Proof,
        parseNonNegativeSafeInteger(2),
      ),
    ).toBe(accepted2);
    expect(() =>
      registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        accepted2Proof,
        parseNonNegativeSafeInteger(1),
      )
    ).toThrow("ui.managed_surface_stable_accepted_occurrence_high_water_regressed");
    const invalidHighWaters: readonly unknown[] = [
      -0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      "1",
      null,
    ];
    for (
      const invalid of invalidHighWaters
    ) {
      expect(() =>
        registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
          newProof,
          invalid as NonNegativeSafeInteger,
        )
      ).toThrow("ui.managed_surface_stable_accepted_occurrence_high_water_invalid");
    }

    expect(accepted0.occurrenceSequenceHighWater).toBe(0);
    expect(accepted2.occurrenceSequenceHighWater).toBe(2);
    expect(publisher.getSnapshot()).toBe(publisherSnapshot);
    expect(registry.getSnapshot()).toBe(registrySnapshot);
  });

  it("rejects forged, foreign, wrong-cursor, and ABA-successor admission proof evidence", () => {
    const firstRegistry = registryV1({ owners: [workspaceOwnerIdV1] });
    const foreignRegistry = registryV1({ owners: [narrativeOwnerIdV1] });
    const predecessor = firstRegistry.issuePublisher(workspaceOwnerIdV1);
    const foreign = foreignRegistry.issuePublisher(narrativeOwnerIdV1);
    const predecessorOccurrence = predecessor.issueOccurrence();
    const predecessorCursor = firstRegistry.createAcceptedOccurrenceHighWater(predecessor.lease);
    const predecessorProof = firstRegistry.captureAcceptedOccurrenceAdmissionProof(
      predecessorCursor,
    );
    const foreignCursor = foreignRegistry.createAcceptedOccurrenceHighWater(foreign.lease);
    const foreignProof = foreignRegistry.captureAcceptedOccurrenceAdmissionProof(foreignCursor);
    const firstSnapshot = firstRegistry.getSnapshot();
    const foreignSnapshot = foreignRegistry.getSnapshot();

    const forgedProof = Object.freeze(
      {},
    ) as ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1;
    const clonedProof = Object.freeze({
      ...predecessorProof,
    }) as ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1;
    for (
      const invalidProof of [
        forgedProof,
        clonedProof,
        foreignProof,
      ]
    ) {
      expect(() =>
        firstRegistry.classifyOccurrenceAgainstAdmissionProof(
          invalidProof,
          predecessorOccurrence,
          false,
        )
      ).toThrow("ui.managed_surface_stable_accepted_occurrence_admission_proof_invalid");
      expect(() =>
        firstRegistry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
          invalidProof,
          parseNonNegativeSafeInteger(1),
        )
      ).toThrow("ui.managed_surface_stable_accepted_occurrence_admission_proof_invalid");
    }
    expect(() =>
      firstRegistry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        forgedProof,
        -1 as NonNegativeSafeInteger,
      )
    ).toThrow("ui.managed_surface_stable_accepted_occurrence_admission_proof_invalid");
    const forgedCursor = Object.freeze({
      publisherLease: predecessor.lease,
      occurrenceSequenceHighWater: parseNonNegativeSafeInteger(0),
    });
    const clonedCursor = Object.freeze({ ...predecessorCursor });
    for (
      const invalidCursor of [
        forgedCursor,
        clonedCursor,
      ]
    ) {
      expect(() => firstRegistry.captureAcceptedOccurrenceAdmissionProof(invalidCursor)).toThrow(
        "ui.managed_surface_stable_accepted_occurrence_cursor_invalid",
      );
    }
    expect(() => firstRegistry.captureAcceptedOccurrenceAdmissionProof(foreignCursor)).toThrow(
      "ui.managed_surface_stable_accepted_occurrence_cursor_invalid",
    );
    expect(() => foreignRegistry.captureAcceptedOccurrenceAdmissionProof(predecessorCursor))
      .toThrow("ui.managed_surface_stable_accepted_occurrence_cursor_invalid");
    expect(firstRegistry.getSnapshot()).toBe(firstSnapshot);
    expect(foreignRegistry.getSnapshot()).toBe(foreignSnapshot);

    expect(firstRegistry.disposePublisherLease(predecessor.lease)).toBe("disposed");
    const successor = firstRegistry.issuePublisher(workspaceOwnerIdV1);
    const successorOccurrence = successor.issueOccurrence();
    const successorCursor = firstRegistry.createAcceptedOccurrenceHighWater(successor.lease);
    const successorProof = firstRegistry.captureAcceptedOccurrenceAdmissionProof(successorCursor);
    const successorSnapshot = successor.getSnapshot();
    const successorRegistrySnapshot = firstRegistry.getSnapshot();

    expect(
      firstRegistry.classifyOccurrenceAgainstAdmissionProof(
        predecessorProof,
        predecessorOccurrence,
        false,
      ),
    ).toEqual({ kind: "fresh", occurrenceSequence: 1 });
    expect(
      firstRegistry.classifyOccurrenceAgainstAdmissionProof(
        predecessorProof,
        successorOccurrence,
        false,
      ),
    ).toEqual({ kind: "foreign" });
    expect(
      firstRegistry.classifyOccurrenceAgainstAdmissionProof(
        successorProof,
        predecessorOccurrence,
        false,
      ),
    ).toEqual({ kind: "foreign" });
    expect(
      firstRegistry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        predecessorProof,
        parseNonNegativeSafeInteger(0),
      ),
    ).toBe(predecessorCursor);
    const predecessorAccepted1 = firstRegistry
      .deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        predecessorProof,
        parseNonNegativeSafeInteger(1),
      );
    expect(predecessorAccepted1).toEqual({
      publisherLease: predecessor.lease,
      occurrenceSequenceHighWater: 1,
    });
    expect(predecessorAccepted1.publisherLease).not.toBe(successor.lease);
    expect(() => firstRegistry.captureAcceptedOccurrenceAdmissionProof(predecessorAccepted1))
      .toThrow("ui.managed_surface_stable_publisher_lease_stale");
    expect(() =>
      firstRegistry.classifyOccurrenceAgainstAcceptedHighWater(
        predecessorAccepted1,
        predecessorOccurrence,
        true,
      )
    ).toThrow("ui.managed_surface_stable_publisher_lease_stale");
    expect(() =>
      firstRegistry.advanceAcceptedOccurrenceHighWater(
        predecessorAccepted1,
        parseNonNegativeSafeInteger(1),
      )
    ).toThrow("ui.managed_surface_stable_publisher_lease_stale");
    expect(
      firstRegistry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        successorProof,
        parseNonNegativeSafeInteger(0),
      ),
    ).toBe(successorCursor);

    expect(successor.getSnapshot()).toBe(successorSnapshot);
    expect(firstRegistry.getSnapshot()).toBe(successorRegistrySnapshot);
    expect(predecessorCursor.occurrenceSequenceHighWater).toBe(0);
    expect(successorCursor.occurrenceSequenceHighWater).toBe(0);
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

    const reentrantAllocator = Object.freeze({
      allocate(): PositiveSafeInteger {
        expect(() => reentrant.issuePublisher(narrativeOwnerIdV1)).toThrow(
          "ui.managed_surface_stable_lease_allocation_in_progress",
        );
        return parsePositiveSafeInteger(11);
      },
    });
    const reentrant = registryV1({ leaseSequenceAllocator: reentrantAllocator });
    expect(reentrant.issuePublisher(workspaceOwnerIdV1).getSnapshot().leaseSequence).toBe(11);

    let disposingSequence = 12;
    const disposingAllocator = Object.freeze({
      allocate(): PositiveSafeInteger {
        expect(disposing.dispose()).toBe(
          disposingSequence === 12 ? "disposed" : "already_disposed",
        );
        disposingSequence += 1;
        return parsePositiveSafeInteger(disposingSequence);
      },
    });
    const disposing = registryV1({ leaseSequenceAllocator: disposingAllocator });
    expect(() => disposing.issuePublisher(workspaceOwnerIdV1)).toThrow(
      "ui.managed_surface_stable_publisher_registry_disposed",
    );
    expect(disposing.getSnapshot()).toEqual({
      applicationEpoch: 23,
      leaseSequenceHighWater: 0,
      currentPublisherCount: 0,
      disposed: true,
    });
    const successorAfterReentrantDispose = registryV1({
      applicationEpoch: 24,
      leaseSequenceAllocator: disposingAllocator,
    });
    expect(
      successorAfterReentrantDispose.issuePublisher(workspaceOwnerIdV1).getSnapshot()
        .leaseSequence,
    ).toBe(14);
  });

  it("rejects forged leases and accepted cursors", () => {
    const registry = registryV1();
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);

    expect(registry.inspectCurrentLease(Object.freeze({}))).toBeNull();
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

  it("claims one narrow disposal authority and preserves the registry surface", () => {
    expectTypeOf<keyof ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1>()
      .toEqualTypeOf<"inspectPublisherLeaseDisposal" | "disposeCurrentPublisherLease">();
    expectTypeOf<ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1>()
      .toEqualTypeOf<"current" | "already_disposed" | "diverged" | "stale">();
    expectTypeOf<ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1>()
      .toEqualTypeOf<"disposed" | "already_disposed" | "diverged" | "stale">();
    expectTypeOf<
      ReturnType<
        ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1[
          "inspectPublisherLeaseDisposal"
        ]
      >
    >().toEqualTypeOf<ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1>();
    expectTypeOf<
      ReturnType<
        ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1[
          "disposeCurrentPublisherLease"
        ]
      >
    >().toEqualTypeOf<ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1>();
    expectTypeOf<keyof ManagedSurfaceStablePublisherLeaseRegistryInternalV1>()
      .toEqualTypeOf<
        | "getSnapshot"
        | "issuePublisher"
        | "inspectCurrentLease"
        | "inspectIssuedOccurrence"
        | "classifyOccurrenceAgainstAcceptedHighWater"
        | "createAcceptedOccurrenceHighWater"
        | "advanceAcceptedOccurrenceHighWater"
        | "captureAcceptedOccurrenceAdmissionProof"
        | "classifyOccurrenceAgainstAdmissionProof"
        | "deriveAcceptedOccurrenceHighWaterFromAdmissionProof"
        | "disposePublisherLease"
        | "dispose"
      >();

    const registry = registryV1({ owners: [workspaceOwnerIdV1] });
    const authority = claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(registry);
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);

    expect(authority.inspectPublisherLeaseDisposal(publisher.lease)).toBe("current");
    expect(() => claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(registry))
      .toThrow("ui.managed_surface_stable_disposal_authority_claimed");
    expect(authority.inspectPublisherLeaseDisposal(publisher.lease)).toBe("current");
  });

  it("records authority disposal provenance across repeat and ABA successor leases", () => {
    const registry = registryV1({ owners: [workspaceOwnerIdV1] });
    const authority = claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(registry);
    const predecessor = registry.issuePublisher(workspaceOwnerIdV1);
    const predecessorSnapshot = predecessor.getSnapshot();

    expect(authority.inspectPublisherLeaseDisposal(predecessor.lease)).toBe("current");
    expect(authority.disposeCurrentPublisherLease(predecessor.lease)).toBe("disposed");
    expect(authority.inspectPublisherLeaseDisposal(predecessor.lease)).toBe("already_disposed");
    expect(authority.disposeCurrentPublisherLease(predecessor.lease)).toBe("already_disposed");
    expect(predecessor.getSnapshot()).not.toBe(predecessorSnapshot);
    expect(predecessor.getSnapshot().disposed).toBe(true);

    const successor = registry.issuePublisher(workspaceOwnerIdV1);
    expect(successor.lease).not.toBe(predecessor.lease);
    expect(authority.inspectPublisherLeaseDisposal(predecessor.lease)).toBe("already_disposed");
    expect(authority.inspectPublisherLeaseDisposal(successor.lease)).toBe("current");
    expect(authority.disposeCurrentPublisherLease(successor.lease)).toBe("disposed");
    expect(authority.inspectPublisherLeaseDisposal(successor.lease)).toBe("already_disposed");
    expect(authority.inspectPublisherLeaseDisposal(predecessor.lease)).toBe("already_disposed");
  });

  it("uses one claimed authority across 10k fresh ABA leases", () => {
    const registry = registryV1({ owners: [workspaceOwnerIdV1] });
    const authority = claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(registry);
    let publisher = registry.issuePublisher(workspaceOwnerIdV1);

    for (let index = 0; index < 10_000; index += 1) {
      const predecessor = publisher;
      expect(authority.inspectPublisherLeaseDisposal(predecessor.lease)).toBe("current");
      expect(authority.disposeCurrentPublisherLease(predecessor.lease)).toBe("disposed");
      expect(authority.inspectPublisherLeaseDisposal(predecessor.lease)).toBe(
        "already_disposed",
      );
      publisher = registry.issuePublisher(workspaceOwnerIdV1);
      expect(authority.inspectPublisherLeaseDisposal(publisher.lease)).toBe("current");
    }

    expect(registry.getSnapshot()).toEqual({
      applicationEpoch: 23,
      leaseSequenceHighWater: 10_001,
      currentPublisherCount: 1,
      disposed: false,
    });
    expect(() => claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(registry))
      .toThrow("ui.managed_surface_stable_disposal_authority_claimed");
    expect(authority.inspectPublisherLeaseDisposal(publisher.lease)).toBe("current");
  });

  it("distinguishes legacy direct and registry-wide disposal as divergence", () => {
    const directRegistry = registryV1({ owners: [workspaceOwnerIdV1] });
    const directAuthority = claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(
      directRegistry,
    );
    const directPublisher = directRegistry.issuePublisher(workspaceOwnerIdV1);

    expect(directRegistry.disposePublisherLease(directPublisher.lease)).toBe("disposed");
    expect(directRegistry.disposePublisherLease(directPublisher.lease)).toBe("already_disposed");
    expect(directAuthority.inspectPublisherLeaseDisposal(directPublisher.lease)).toBe("diverged");
    expect(directAuthority.disposeCurrentPublisherLease(directPublisher.lease)).toBe("diverged");
    const directSuccessor = directRegistry.issuePublisher(workspaceOwnerIdV1);
    expect(directAuthority.inspectPublisherLeaseDisposal(directPublisher.lease)).toBe("diverged");
    expect(directAuthority.inspectPublisherLeaseDisposal(directSuccessor.lease)).toBe("current");

    const registryWide = registryV1({ owners: [workspaceOwnerIdV1] });
    const registryWideAuthority =
      claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(registryWide);
    const registryWidePublisher = registryWide.issuePublisher(workspaceOwnerIdV1);
    expect(registryWide.dispose()).toBe("disposed");
    expect(registryWide.dispose()).toBe("already_disposed");
    expect(registryWideAuthority.inspectPublisherLeaseDisposal(registryWidePublisher.lease)).toBe(
      "diverged",
    );
    expect(registryWideAuthority.disposeCurrentPublisherLease(registryWidePublisher.lease)).toBe(
      "diverged",
    );
  });

  it("classifies foreign and cloned candidates as stale", () => {
    const registry = registryV1({ owners: [workspaceOwnerIdV1] });
    const authority = claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(registry);
    const publisher = registry.issuePublisher(workspaceOwnerIdV1);
    const foreignRegistry = registryV1({ owners: [workspaceOwnerIdV1] });
    const foreignPublisher = foreignRegistry.issuePublisher(workspaceOwnerIdV1);
    const clonedLease = Object.freeze({ ...publisher.lease });
    const registrySnapshot = registry.getSnapshot();
    const publisherSnapshot = publisher.getSnapshot();

    for (
      const candidate of [
        foreignPublisher.lease,
        clonedLease,
        Object.freeze({}),
        null,
        "surface-stable-publisher.e23.n1",
      ]
    ) {
      expect(authority.inspectPublisherLeaseDisposal(candidate)).toBe("stale");
      expect(authority.disposeCurrentPublisherLease(candidate)).toBe("stale");
    }
    expect(registry.getSnapshot()).toBe(registrySnapshot);
    expect(publisher.getSnapshot()).toBe(publisherSnapshot);
    expect(authority.inspectPublisherLeaseDisposal(publisher.lease)).toBe("current");
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
    const successor = registryV1({
      owners: [workspaceOwnerIdV1],
      leaseSequenceAllocator: leaseDomain,
    });
    expect(successor.issuePublisher(workspaceOwnerIdV1).getSnapshot().leaseSequence).toBe(3);
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
    expect(firstLease!.getSnapshot()).toMatchObject({ leaseSequence: 2, disposed: true });
    expect(lastLease!.getSnapshot()).toMatchObject({ leaseSequence: 10_001, disposed: true });
    expect(registry.inspectCurrentLease(firstLease!.lease)).toBeNull();
  });
});
