// SPDX-License-Identifier: MIT
import {
  type Brand,
  type NonNegativeSafeInteger,
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type PositiveSafeInteger,
} from "@sillymaker/base";

import {
  type ManagedSurfaceOwnerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceTargetOccurrenceIdV1,
  type ManagedSurfaceTargetOccurrenceIdV1,
} from "./managed-surface-contracts.ts";
import type {
  ManagedSurfaceStablePublisherLeaseInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
} from "./managed-surface-stable-contract.ts";

declare const managedSurfaceStableAcceptedOccurrenceAdmissionProofBrandInternalV1: unique symbol;

export type ManagedSurfaceStablePublisherLeaseIdInternalV1 = Brand<
  string,
  "ManagedSurfaceStablePublisherLeaseIdInternalV1"
>;

export type ManagedSurfaceStableSequenceKindInternalV1 =
  | "lease"
  | "source_revision"
  | "occurrence";

export interface ManagedSurfaceStableLeaseSequenceAllocatorInternalV1 {
  allocate(): PositiveSafeInteger;
}

export interface ManagedSurfaceStablePublisherLeaseRegistrySnapshotInternalV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly leaseSequenceHighWater: NonNegativeSafeInteger;
  readonly currentPublisherCount: NonNegativeSafeInteger;
  readonly disposed: boolean;
}

export interface ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 {
  /** Diagnostic identity only; exact lease authority remains object identity. */
  readonly leaseId: ManagedSurfaceStablePublisherLeaseIdInternalV1;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly leaseSequence: PositiveSafeInteger;
  readonly sourceRevisionIssuanceHighWater: NonNegativeSafeInteger;
  readonly occurrenceIssuanceHighWater: NonNegativeSafeInteger;
  readonly disposed: boolean;
}

/**
 * Immutable cursor intended for the future R3 composite source state. Advancing
 * it never mutates publisher issuance state or any previously returned cursor.
 */
export interface ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1 {
  readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly occurrenceSequenceHighWater: NonNegativeSafeInteger;
}

/**
 * Opaque stage-2 proof for one exact accepted-occurrence cursor. The proof
 * freezes occurrence issuance visibility for a single R2 admission attempt;
 * future R3 still owns current-lease and composite-state CAS.
 */
export interface ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1 {
  readonly [managedSurfaceStableAcceptedOccurrenceAdmissionProofBrandInternalV1]: true;
}

export type ManagedSurfaceStableOccurrenceAdmissionClassificationInternalV1 =
  | { readonly kind: "foreign" }
  | { readonly kind: "unissued" }
  | {
    readonly kind: "retained" | "reused" | "fresh";
    readonly occurrenceSequence: PositiveSafeInteger;
  };

export interface ManagedSurfaceStablePublisherInternalV1 {
  readonly lease: ManagedSurfaceStablePublisherLeaseInternalV1;
  getSnapshot(): ManagedSurfaceStablePublisherLeaseSnapshotInternalV1;
  issueSourceRevision(): ManagedSurfaceStableSourceRevisionInternalV1;
  issueOccurrence(): ManagedSurfaceTargetOccurrenceIdV1;
}

export type ManagedSurfaceStableOccurrenceHighWaterClassificationInternalV1 =
  | "foreign"
  | "unissued"
  | "retained"
  | "reused"
  | "fresh";

export type ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1 =
  | "current"
  | "already_disposed"
  | "diverged"
  | "stale";

export type ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1 =
  | "disposed"
  | "already_disposed"
  | "diverged"
  | "stale";

/**
 * Claim-once composition capability for distinguishing an owner commit from
 * legacy or registry-wide disposal. It owns no publisher state of its own.
 */
export interface ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1 {
  inspectPublisherLeaseDisposal(
    publisherLease: unknown,
  ): ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1;
  disposeCurrentPublisherLease(
    publisherLease: unknown,
  ): ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1;
}

export interface ManagedSurfaceStablePublisherLeaseRegistryInternalV1 {
  getSnapshot(): ManagedSurfaceStablePublisherLeaseRegistrySnapshotInternalV1;
  issuePublisher(ownerId: ManagedSurfaceOwnerIdV1): ManagedSurfaceStablePublisherInternalV1;
  inspectCurrentLease(
    publisherLease: unknown,
  ): ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 | null;
  inspectIssuedOccurrence(
    publisherLease: unknown,
    occurrenceId: unknown,
  ): PositiveSafeInteger | null;
  classifyOccurrenceAgainstAcceptedHighWater(
    current: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
    occurrenceId: unknown,
    isRetainedOccurrence: boolean,
  ): ManagedSurfaceStableOccurrenceHighWaterClassificationInternalV1;
  createAcceptedOccurrenceHighWater(
    publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1,
  ): ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
  advanceAcceptedOccurrenceHighWater(
    current: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
    nextHighWater: NonNegativeSafeInteger,
  ): ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
  captureAcceptedOccurrenceAdmissionProof(
    current: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
  ): ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1;
  classifyOccurrenceAgainstAdmissionProof(
    proof: ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1,
    occurrenceId: unknown,
    isRetainedOccurrence: boolean,
  ): ManagedSurfaceStableOccurrenceAdmissionClassificationInternalV1;
  deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
    proof: ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1,
    nextHighWater: NonNegativeSafeInteger,
  ): ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
  disposePublisherLease(
    publisherLease: unknown,
  ): "disposed" | "already_disposed" | "stale";
  dispose(): "disposed" | "already_disposed";
}

export interface CreateManagedSurfaceStablePublisherLeaseRegistryInternalInputV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
  /** Composition-owned domain; one allocator may be used by only one live registry. */
  readonly leaseSequenceAllocator: ManagedSurfaceStableLeaseSequenceAllocatorInternalV1;
}

interface PublisherRecordInternalV1 {
  readonly registryIdentity: object;
  readonly lease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly leaseId: ManagedSurfaceStablePublisherLeaseIdInternalV1;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly leaseSequence: PositiveSafeInteger;
  readonly occurrencePrefix: string;
  sourceRevisionIssuanceHighWater: NonNegativeSafeInteger;
  occurrenceIssuanceHighWater: NonNegativeSafeInteger;
  disposed: boolean;
  disposedBy: object | null;
  snapshot: ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 | null;
}

interface AcceptedOccurrenceRecordInternalV1 {
  readonly registryIdentity: object;
  readonly publisherRecord: PublisherRecordInternalV1;
  readonly highWater: NonNegativeSafeInteger;
}

interface AcceptedOccurrenceAdmissionProofRecordInternalV1 {
  readonly registryIdentity: object;
  readonly publisherRecord: PublisherRecordInternalV1;
  readonly originalCursor: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
  readonly acceptedHighWater: NonNegativeSafeInteger;
  readonly capturedOccurrenceIssuanceHighWater: NonNegativeSafeInteger;
}

const publisherRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStablePublisherLeaseInternalV1,
  PublisherRecordInternalV1
>();
const acceptedOccurrenceRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
  AcceptedOccurrenceRecordInternalV1
>();
const acceptedOccurrenceAdmissionProofRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1,
  AcceptedOccurrenceAdmissionProofRecordInternalV1
>();
const claimedLeaseDomainAllocatorsInternalV1 = new WeakSet<object>();
const publisherLeaseDisposalAuthorityClaimsInternalV1 = new WeakMap<
  ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  () => ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1
>();
interface PublisherLeaseDisposalAuthorityRecordInternalV1 {
  readonly inspectPublisherLeaseDisposal: (
    publisherLease: unknown,
  ) => ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1;
  readonly disposeCurrentPublisherLease: (
    publisherLease: unknown,
  ) => ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1;
}
const publisherLeaseDisposalAuthorityRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1,
  PublisherLeaseDisposalAuthorityRecordInternalV1
>();

function requirePublisherLeaseDisposalAuthorityInternalV1(
  receiver: unknown,
): PublisherLeaseDisposalAuthorityRecordInternalV1 {
  const authorityRecord =
    (typeof receiver === "object" || typeof receiver === "function") && receiver !== null
      ? publisherLeaseDisposalAuthorityRecordsInternalV1.get(
        receiver as ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1,
      )
      : undefined;
  if (authorityRecord === undefined) {
    throw new TypeError("ui.managed_surface_stable_disposal_authority_invalid");
  }
  return authorityRecord;
}

export function claimManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1(
  registry: unknown,
): ManagedSurfaceStablePublisherLeaseDisposalAuthorityInternalV1 {
  if ((typeof registry !== "object" && typeof registry !== "function") || registry === null) {
    throw new TypeError("ui.managed_surface_stable_disposal_authority_invalid");
  }
  const claim = publisherLeaseDisposalAuthorityClaimsInternalV1.get(
    registry as ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  );
  if (claim === undefined) {
    throw new TypeError("ui.managed_surface_stable_disposal_authority_invalid");
  }
  return claim();
}

const foreignOccurrenceAdmissionClassificationInternalV1 = Object.freeze({
  kind: "foreign" as const,
});
const unissuedOccurrenceAdmissionClassificationInternalV1 = Object.freeze({
  kind: "unissued" as const,
});

function stableSequenceErrorInternalV1(
  kind: ManagedSurfaceStableSequenceKindInternalV1,
): TypeError {
  return new TypeError(`ui.managed_surface_stable_${kind}_sequence_exhausted`);
}

/** @internal Pure exact-next primitive shared by all R1 scalar cursors. */
export function advanceManagedSurfaceStableSequenceInternalV1(
  highWater: NonNegativeSafeInteger,
  kind: ManagedSurfaceStableSequenceKindInternalV1,
): PositiveSafeInteger {
  const parsedHighWater = parseNonNegativeSafeInteger(highWater);
  if (parsedHighWater >= Number.MAX_SAFE_INTEGER) throw stableSequenceErrorInternalV1(kind);
  return parsePositiveSafeInteger(parsedHighWater + 1);
}

/** @internal Deterministic local domain allocator; composition may inject an epoch-local peer. */
export function createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(
  initialHighWater: NonNegativeSafeInteger = parseNonNegativeSafeInteger(0),
): ManagedSurfaceStableLeaseSequenceAllocatorInternalV1 {
  let highWater = parseNonNegativeSafeInteger(initialHighWater);
  return Object.freeze({
    allocate(): PositiveSafeInteger {
      const next = advanceManagedSurfaceStableSequenceInternalV1(highWater, "lease");
      highWater = parseNonNegativeSafeInteger(next);
      return next;
    },
  });
}

function parseOwnerInternalV1(value: unknown): ManagedSurfaceOwnerIdV1 {
  try {
    return parseManagedSurfaceOwnerIdV1(value);
  } catch (error) {
    throw new TypeError("ui.managed_surface_stable_publisher_owner_invalid", { cause: error });
  }
}

function parseLeaseSequenceInternalV1(value: unknown): PositiveSafeInteger {
  try {
    return parsePositiveSafeInteger(value);
  } catch (error) {
    throw new TypeError("ui.managed_surface_stable_lease_sequence_invalid", { cause: error });
  }
}

function leaseIdInternalV1(
  applicationEpoch: NonNegativeSafeInteger,
  leaseSequence: PositiveSafeInteger,
): ManagedSurfaceStablePublisherLeaseIdInternalV1 {
  return parseModuleId(
    `surface-stable-publisher.e${applicationEpoch}.n${leaseSequence}`,
  ) as unknown as ManagedSurfaceStablePublisherLeaseIdInternalV1;
}

function leaseObjectInternalV1(): ManagedSurfaceStablePublisherLeaseInternalV1 {
  return Object.freeze({}) as ManagedSurfaceStablePublisherLeaseInternalV1;
}

function publisherRecordForUnknownInternalV1(
  value: unknown,
): PublisherRecordInternalV1 | null {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return null;
  return publisherRecordsInternalV1.get(
    value as ManagedSurfaceStablePublisherLeaseInternalV1,
  ) ?? null;
}

type InspectedOccurrenceInternalV1 =
  | { readonly kind: "foreign" }
  | { readonly kind: "unissued" }
  | { readonly kind: "issued"; readonly sequence: PositiveSafeInteger };

function inspectOccurrenceInternalV1(
  record: PublisherRecordInternalV1,
  occurrenceId: unknown,
  issuanceHighWater: NonNegativeSafeInteger,
): InspectedOccurrenceInternalV1 {
  if (typeof occurrenceId !== "string" || occurrenceId.length > 96) {
    return { kind: "foreign" };
  }
  if (!occurrenceId.startsWith(record.occurrencePrefix)) return { kind: "foreign" };
  const suffixLength = occurrenceId.length - record.occurrencePrefix.length;
  if (suffixLength < 1 || suffixLength > 16) return { kind: "unissued" };
  const suffix = occurrenceId.slice(record.occurrencePrefix.length);
  if (!/^[1-9][0-9]*$/u.test(suffix)) return { kind: "unissued" };
  let sequence: PositiveSafeInteger;
  try {
    sequence = parsePositiveSafeInteger(Number(suffix));
  } catch {
    return { kind: "unissued" };
  }
  return sequence <= issuanceHighWater ? { kind: "issued", sequence } : { kind: "unissued" };
}

/**
 * Creates one epoch-scoped stable-publisher registry. It retains only current
 * publishers by the finite resolved-owner set; old lease metadata is weakly held.
 */
export function createManagedSurfaceStablePublisherLeaseRegistryInternalV1(
  input: CreateManagedSurfaceStablePublisherLeaseRegistryInternalInputV1,
): ManagedSurfaceStablePublisherLeaseRegistryInternalV1 {
  const applicationEpoch = parseNonNegativeSafeInteger(input.applicationEpoch);
  const resolvedOwnerIds = input.resolvedOwnerIds.map(parseOwnerInternalV1);
  const resolvedOwnerSet = new Set<ManagedSurfaceOwnerIdV1>();
  for (const ownerId of resolvedOwnerIds) {
    if (resolvedOwnerSet.has(ownerId)) {
      throw new TypeError("ui.managed_surface_stable_publisher_owner_duplicate");
    }
    resolvedOwnerSet.add(ownerId);
  }
  const leaseDomainAllocator = input.leaseSequenceAllocator;
  if (
    (typeof leaseDomainAllocator !== "object" && typeof leaseDomainAllocator !== "function") ||
    leaseDomainAllocator === null
  ) {
    throw new TypeError("ui.managed_surface_stable_lease_allocator_invalid");
  }
  const allocateLeaseSequence = leaseDomainAllocator.allocate;
  if (typeof allocateLeaseSequence !== "function") {
    throw new TypeError("ui.managed_surface_stable_lease_allocator_invalid");
  }
  if (claimedLeaseDomainAllocatorsInternalV1.has(leaseDomainAllocator)) {
    throw new TypeError("ui.managed_surface_stable_lease_domain_claimed");
  }
  claimedLeaseDomainAllocatorsInternalV1.add(leaseDomainAllocator);

  const registryIdentity = Object.freeze({});
  const currentPublisherByOwner = new Map<ManagedSurfaceOwnerIdV1, PublisherRecordInternalV1>();
  let leaseSequenceHighWater: NonNegativeSafeInteger = parseNonNegativeSafeInteger(0);
  let disposed = false;
  let allocationInProgress = false;
  let leaseDomainClaimReleased = false;
  let disposalAuthorityClaimed = false;
  let registrySnapshot: ManagedSurfaceStablePublisherLeaseRegistrySnapshotInternalV1 | null = null;

  const releaseLeaseDomainClaim = (): void => {
    if (leaseDomainClaimReleased) return;
    claimedLeaseDomainAllocatorsInternalV1.delete(leaseDomainAllocator);
    leaseDomainClaimReleased = true;
  };

  const getRegistrySnapshot = (): ManagedSurfaceStablePublisherLeaseRegistrySnapshotInternalV1 => {
    registrySnapshot ??= Object.freeze({
      applicationEpoch,
      leaseSequenceHighWater,
      currentPublisherCount: parseNonNegativeSafeInteger(currentPublisherByOwner.size),
      disposed,
    });
    return registrySnapshot;
  };

  const getPublisherSnapshot = (
    record: PublisherRecordInternalV1,
  ): ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 => {
    record.snapshot ??= Object.freeze({
      leaseId: record.leaseId,
      ownerId: record.ownerId,
      applicationEpoch: record.applicationEpoch,
      leaseSequence: record.leaseSequence,
      sourceRevisionIssuanceHighWater: record.sourceRevisionIssuanceHighWater,
      occurrenceIssuanceHighWater: record.occurrenceIssuanceHighWater,
      disposed: record.disposed,
    });
    return record.snapshot;
  };

  const isCurrentRecord = (record: PublisherRecordInternalV1): boolean =>
    !disposed &&
    !record.disposed &&
    record.registryIdentity === registryIdentity &&
    currentPublisherByOwner.get(record.ownerId) === record;

  const requireCurrentRecord = (record: PublisherRecordInternalV1): void => {
    if (!isCurrentRecord(record)) {
      throw new TypeError("ui.managed_surface_stable_publisher_lease_disposed");
    }
  };

  const disposeRecord = (
    record: PublisherRecordInternalV1,
    disposedBy: object | null,
  ): "disposed" | "already_disposed" => {
    if (record.disposed) return "already_disposed";
    record.disposed = true;
    record.disposedBy = disposedBy;
    record.snapshot = null;
    if (currentPublisherByOwner.get(record.ownerId) === record) {
      currentPublisherByOwner.delete(record.ownerId);
    }
    registrySnapshot = null;
    return "disposed";
  };

  const inspectCurrentRecord = (value: unknown): PublisherRecordInternalV1 | null => {
    const record = publisherRecordForUnknownInternalV1(value);
    return record !== null && isCurrentRecord(record) ? record : null;
  };

  const registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1 = Object.freeze({
    getSnapshot: getRegistrySnapshot,
    issuePublisher(ownerInput: ManagedSurfaceOwnerIdV1): ManagedSurfaceStablePublisherInternalV1 {
      if (disposed) {
        throw new TypeError("ui.managed_surface_stable_publisher_registry_disposed");
      }
      const ownerId = parseOwnerInternalV1(ownerInput);
      if (!resolvedOwnerSet.has(ownerId)) {
        throw new TypeError("ui.managed_surface_stable_publisher_owner_unresolved");
      }
      if (currentPublisherByOwner.has(ownerId)) {
        throw new TypeError("ui.managed_surface_stable_publisher_owner_current");
      }
      if (allocationInProgress) {
        throw new TypeError("ui.managed_surface_stable_lease_allocation_in_progress");
      }
      if (leaseSequenceHighWater >= Number.MAX_SAFE_INTEGER) {
        throw stableSequenceErrorInternalV1("lease");
      }

      allocationInProgress = true;
      try {
        const allocatedSequence = Reflect.apply(
          allocateLeaseSequence,
          leaseDomainAllocator,
          [],
        );
        if (disposed) {
          throw new TypeError("ui.managed_surface_stable_publisher_registry_disposed");
        }
        const leaseSequence = parseLeaseSequenceInternalV1(allocatedSequence);
        if (leaseSequence <= leaseSequenceHighWater) {
          throw new TypeError("ui.managed_surface_stable_lease_sequence_nonmonotonic");
        }

        const lease = leaseObjectInternalV1();
        const record: PublisherRecordInternalV1 = {
          registryIdentity,
          lease,
          leaseId: leaseIdInternalV1(applicationEpoch, leaseSequence),
          ownerId,
          applicationEpoch,
          leaseSequence,
          occurrencePrefix: `surface-stable-occurrence.e${applicationEpoch}.l${leaseSequence}.n`,
          sourceRevisionIssuanceHighWater: parseNonNegativeSafeInteger(0),
          occurrenceIssuanceHighWater: parseNonNegativeSafeInteger(0),
          disposed: false,
          disposedBy: null,
          snapshot: null,
        };

        const publisher: ManagedSurfaceStablePublisherInternalV1 = Object.freeze({
          lease,
          getSnapshot: (): ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 =>
            getPublisherSnapshot(record),
          issueSourceRevision(): ManagedSurfaceStableSourceRevisionInternalV1 {
            requireCurrentRecord(record);
            const next = advanceManagedSurfaceStableSequenceInternalV1(
              record.sourceRevisionIssuanceHighWater,
              "source_revision",
            );
            record.sourceRevisionIssuanceHighWater = parseNonNegativeSafeInteger(next);
            record.snapshot = null;
            return next as ManagedSurfaceStableSourceRevisionInternalV1;
          },
          issueOccurrence(): ManagedSurfaceTargetOccurrenceIdV1 {
            requireCurrentRecord(record);
            const next = advanceManagedSurfaceStableSequenceInternalV1(
              record.occurrenceIssuanceHighWater,
              "occurrence",
            );
            const occurrenceId = parseManagedSurfaceTargetOccurrenceIdV1(
              `${record.occurrencePrefix}${next}`,
            );
            record.occurrenceIssuanceHighWater = parseNonNegativeSafeInteger(next);
            record.snapshot = null;
            return occurrenceId;
          },
        });

        publisherRecordsInternalV1.set(lease, record);
        currentPublisherByOwner.set(ownerId, record);
        leaseSequenceHighWater = parseNonNegativeSafeInteger(leaseSequence);
        registrySnapshot = null;
        return publisher;
      } finally {
        allocationInProgress = false;
        if (disposed) releaseLeaseDomainClaim();
      }
    },
    inspectCurrentLease(
      publisherLease: unknown,
    ): ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 | null {
      const record = inspectCurrentRecord(publisherLease);
      return record === null ? null : getPublisherSnapshot(record);
    },
    inspectIssuedOccurrence(
      publisherLease: unknown,
      occurrenceId: unknown,
    ): PositiveSafeInteger | null {
      const record = inspectCurrentRecord(publisherLease);
      if (record === null) return null;
      const inspected = inspectOccurrenceInternalV1(
        record,
        occurrenceId,
        record.occurrenceIssuanceHighWater,
      );
      return inspected.kind === "issued" ? inspected.sequence : null;
    },
    classifyOccurrenceAgainstAcceptedHighWater(
      current: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
      occurrenceId: unknown,
      isRetainedOccurrence: boolean,
    ): ManagedSurfaceStableOccurrenceHighWaterClassificationInternalV1 {
      const cursorRecord = (typeof current === "object" && current !== null)
        ? acceptedOccurrenceRecordsInternalV1.get(current)
        : undefined;
      if (cursorRecord === undefined || cursorRecord.registryIdentity !== registryIdentity) {
        throw new TypeError("ui.managed_surface_stable_accepted_occurrence_cursor_invalid");
      }
      if (!isCurrentRecord(cursorRecord.publisherRecord)) {
        throw new TypeError("ui.managed_surface_stable_publisher_lease_stale");
      }
      const inspected = inspectOccurrenceInternalV1(
        cursorRecord.publisherRecord,
        occurrenceId,
        cursorRecord.publisherRecord.occurrenceIssuanceHighWater,
      );
      if (inspected.kind !== "issued") return inspected.kind;
      if (inspected.sequence > cursorRecord.highWater) return "fresh";
      return isRetainedOccurrence ? "retained" : "reused";
    },
    createAcceptedOccurrenceHighWater(
      publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1,
    ): ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1 {
      const record = inspectCurrentRecord(publisherLease);
      if (record === null) {
        throw new TypeError("ui.managed_surface_stable_publisher_lease_stale");
      }
      const cursor = Object.freeze({
        publisherLease: record.lease,
        occurrenceSequenceHighWater: parseNonNegativeSafeInteger(0),
      });
      acceptedOccurrenceRecordsInternalV1.set(cursor, {
        registryIdentity,
        publisherRecord: record,
        highWater: cursor.occurrenceSequenceHighWater,
      });
      return cursor;
    },
    advanceAcceptedOccurrenceHighWater(
      current: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
      nextInput: NonNegativeSafeInteger,
    ): ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1 {
      const cursorRecord = (typeof current === "object" && current !== null)
        ? acceptedOccurrenceRecordsInternalV1.get(current)
        : undefined;
      if (cursorRecord === undefined || cursorRecord.registryIdentity !== registryIdentity) {
        throw new TypeError("ui.managed_surface_stable_accepted_occurrence_cursor_invalid");
      }
      const publisherRecord = cursorRecord.publisherRecord;
      if (!isCurrentRecord(publisherRecord)) {
        throw new TypeError("ui.managed_surface_stable_publisher_lease_stale");
      }
      let nextHighWater: NonNegativeSafeInteger;
      try {
        nextHighWater = parseNonNegativeSafeInteger(nextInput);
      } catch (error) {
        throw new TypeError(
          "ui.managed_surface_stable_accepted_occurrence_high_water_invalid",
          { cause: error },
        );
      }
      if (nextHighWater < cursorRecord.highWater) {
        throw new TypeError(
          "ui.managed_surface_stable_accepted_occurrence_high_water_regressed",
        );
      }
      if (nextHighWater > publisherRecord.occurrenceIssuanceHighWater) {
        throw new TypeError("ui.managed_surface_stable_occurrence_unissued");
      }
      if (nextHighWater === cursorRecord.highWater) return current;

      const next = Object.freeze({
        publisherLease: publisherRecord.lease,
        occurrenceSequenceHighWater: nextHighWater,
      });
      acceptedOccurrenceRecordsInternalV1.set(next, {
        registryIdentity,
        publisherRecord,
        highWater: nextHighWater,
      });
      return next;
    },
    captureAcceptedOccurrenceAdmissionProof(
      current: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
    ): ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1 {
      const cursorRecord = (typeof current === "object" && current !== null)
        ? acceptedOccurrenceRecordsInternalV1.get(current)
        : undefined;
      if (cursorRecord === undefined || cursorRecord.registryIdentity !== registryIdentity) {
        throw new TypeError("ui.managed_surface_stable_accepted_occurrence_cursor_invalid");
      }
      if (!isCurrentRecord(cursorRecord.publisherRecord)) {
        throw new TypeError("ui.managed_surface_stable_publisher_lease_stale");
      }

      const proof = Object.freeze(
        {},
      ) as ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1;
      acceptedOccurrenceAdmissionProofRecordsInternalV1.set(proof, {
        registryIdentity,
        publisherRecord: cursorRecord.publisherRecord,
        originalCursor: current,
        acceptedHighWater: cursorRecord.highWater,
        capturedOccurrenceIssuanceHighWater:
          cursorRecord.publisherRecord.occurrenceIssuanceHighWater,
      });
      return proof;
    },
    classifyOccurrenceAgainstAdmissionProof(
      proof: ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1,
      occurrenceId: unknown,
      isRetainedOccurrence: boolean,
    ): ManagedSurfaceStableOccurrenceAdmissionClassificationInternalV1 {
      const proofRecord = (typeof proof === "object" && proof !== null)
        ? acceptedOccurrenceAdmissionProofRecordsInternalV1.get(proof)
        : undefined;
      if (proofRecord === undefined || proofRecord.registryIdentity !== registryIdentity) {
        throw new TypeError(
          "ui.managed_surface_stable_accepted_occurrence_admission_proof_invalid",
        );
      }

      const inspected = inspectOccurrenceInternalV1(
        proofRecord.publisherRecord,
        occurrenceId,
        proofRecord.capturedOccurrenceIssuanceHighWater,
      );
      if (inspected.kind === "foreign") {
        return foreignOccurrenceAdmissionClassificationInternalV1;
      }
      if (inspected.kind === "unissued") {
        return unissuedOccurrenceAdmissionClassificationInternalV1;
      }
      const kind = inspected.sequence > proofRecord.acceptedHighWater
        ? "fresh"
        : isRetainedOccurrence
        ? "retained"
        : "reused";
      return Object.freeze({
        kind,
        occurrenceSequence: inspected.sequence,
      });
    },
    deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
      proof: ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1,
      nextInput: NonNegativeSafeInteger,
    ): ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1 {
      const proofRecord = (typeof proof === "object" && proof !== null)
        ? acceptedOccurrenceAdmissionProofRecordsInternalV1.get(proof)
        : undefined;
      if (proofRecord === undefined || proofRecord.registryIdentity !== registryIdentity) {
        throw new TypeError(
          "ui.managed_surface_stable_accepted_occurrence_admission_proof_invalid",
        );
      }

      let nextHighWater: NonNegativeSafeInteger;
      try {
        nextHighWater = parseNonNegativeSafeInteger(nextInput);
      } catch (error) {
        throw new TypeError(
          "ui.managed_surface_stable_accepted_occurrence_high_water_invalid",
          { cause: error },
        );
      }
      if (nextHighWater < proofRecord.acceptedHighWater) {
        throw new TypeError(
          "ui.managed_surface_stable_accepted_occurrence_high_water_regressed",
        );
      }
      if (nextHighWater > proofRecord.capturedOccurrenceIssuanceHighWater) {
        throw new TypeError("ui.managed_surface_stable_occurrence_unissued");
      }
      if (nextHighWater === proofRecord.acceptedHighWater) {
        return proofRecord.originalCursor;
      }

      const next = Object.freeze({
        publisherLease: proofRecord.publisherRecord.lease,
        occurrenceSequenceHighWater: nextHighWater,
      });
      acceptedOccurrenceRecordsInternalV1.set(next, {
        registryIdentity,
        publisherRecord: proofRecord.publisherRecord,
        highWater: nextHighWater,
      });
      return next;
    },
    disposePublisherLease(
      publisherLease: unknown,
    ): "disposed" | "already_disposed" | "stale" {
      const record = publisherRecordForUnknownInternalV1(publisherLease);
      if (record === null || record.registryIdentity !== registryIdentity) return "stale";
      return disposeRecord(record, null);
    },
    dispose(): "disposed" | "already_disposed" {
      if (disposed) return "already_disposed";
      disposed = true;
      for (const record of currentPublisherByOwner.values()) {
        record.disposed = true;
        record.disposedBy = null;
        record.snapshot = null;
      }
      currentPublisherByOwner.clear();
      registrySnapshot = null;
      if (!allocationInProgress) releaseLeaseDomainClaim();
      return "disposed";
    },
  });

  publisherLeaseDisposalAuthorityClaimsInternalV1.set(registry, () => {
    if (disposalAuthorityClaimed) {
      throw new TypeError("ui.managed_surface_stable_disposal_authority_claimed");
    }
    if (disposed) {
      throw new TypeError("ui.managed_surface_stable_disposal_authority_invalid");
    }
    disposalAuthorityClaimed = true;
    const inspectPublisherLeaseDisposal = (
      publisherLease: unknown,
    ): ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1 => {
      const record = publisherRecordForUnknownInternalV1(publisherLease);
      if (record === null || record.registryIdentity !== registryIdentity) return "stale";
      if (record.disposed) {
        return record.disposedBy === authority ? "already_disposed" : "diverged";
      }
      return isCurrentRecord(record) ? "current" : "diverged";
    };
    const disposeCurrentPublisherLease = (
      publisherLease: unknown,
    ): ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1 => {
      const inspection = inspectPublisherLeaseDisposal(publisherLease);
      if (inspection !== "current") return inspection;
      const record = publisherRecordForUnknownInternalV1(publisherLease)!;
      return disposeRecord(record, authority);
    };
    const authority = Object.freeze({
      inspectPublisherLeaseDisposal(
        this: unknown,
        publisherLease: unknown,
      ): ManagedSurfaceStablePublisherLeaseDisposalInspectionInternalV1 {
        return requirePublisherLeaseDisposalAuthorityInternalV1(this)
          .inspectPublisherLeaseDisposal(publisherLease);
      },
      disposeCurrentPublisherLease(
        this: unknown,
        publisherLease: unknown,
      ): ManagedSurfaceStablePublisherLeaseDisposalCommitResultInternalV1 {
        return requirePublisherLeaseDisposalAuthorityInternalV1(this)
          .disposeCurrentPublisherLease(publisherLease);
      },
    });
    publisherLeaseDisposalAuthorityRecordsInternalV1.set(authority, {
      inspectPublisherLeaseDisposal,
      disposeCurrentPublisherLease,
    });
    return authority;
  });

  return registry;
}
