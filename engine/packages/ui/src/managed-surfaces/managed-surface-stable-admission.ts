// SPDX-License-Identifier: MIT
import {
  type DeepReadonly,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type PositiveSafeInteger,
  type RuntimeSchemaV1,
  type StrictJsonValueV1,
} from "@sillymaker/base";
import {
  type BoundedCanonicalJsonRejectionCodeInternalV1,
  projectBoundedCanonicalJsonInternalV1,
} from "@sillymaker/base/runtime/internal";

import {
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceSlotIdV1,
  parseManagedSurfaceTargetOccurrenceIdV1,
  type ManagedSurfaceDefinitionIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceSlotIdV1,
  type ManagedSurfaceTargetOccurrenceIdV1,
} from "./managed-surface-contracts.ts";
import { parseManagedSurfaceResolvedDefinitionV1 } from "./managed-surface-definition.ts";
import {
  type ManagedSurfaceStableAdmittedTargetInternalV1,
  type ManagedSurfaceStableCanonicalParameterBytesInternalV1,
  managedSurfaceStableContractLimitsInternalV1,
  type ManagedSurfaceStablePublisherLeaseInternalV1,
  type ManagedSurfaceStableReconcileResultInternalV1,
  type ManagedSurfaceStableSourceRevisionInternalV1,
  type ManagedSurfaceStableStackScopeInternalV1,
  type ManagedSurfaceStableTargetInternalV1,
  type ManagedSurfaceStableZeroDeltaInternalV1,
} from "./managed-surface-stable-contract.ts";
import type {
  ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1,
  ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
  ManagedSurfaceStableOccurrenceAdmissionClassificationInternalV1,
  ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  ManagedSurfaceStablePublisherLeaseSnapshotInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";

declare const managedSurfaceStableReservationGenerationBrandInternalV1: unique symbol;

export interface ManagedSurfaceStableDefinitionSidecarInternalV1 {
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly parameterSchema: RuntimeSchemaV1<unknown>;
}

export type ManagedSurfaceStableAcceptedBaselineInternalV1 =
  | {
    readonly kind: "unpublished";
    readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
    readonly acceptedOccurrenceHighWater: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
  }
  | {
    readonly kind: "accepted";
    readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
    readonly ownerId: ManagedSurfaceOwnerIdV1;
    readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1;
    readonly targets: readonly ManagedSurfaceStableAdmittedTargetInternalV1[];
    readonly acceptedOccurrenceHighWater: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
  };

export interface ManagedSurfaceStableReservationGenerationTokenInternalV1 {
  readonly [managedSurfaceStableReservationGenerationBrandInternalV1]: true;
}

export interface ManagedSurfaceStableRootReservationSnapshotInternalV1 {
  readonly subjectPublisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly generationToken: ManagedSurfaceStableReservationGenerationTokenInternalV1;
  readonly reservedRootSlotIds: readonly ManagedSurfaceSlotIdV1[];
}

export type ManagedSurfaceStableAdmissionRelationInternalV1 =
  | "initial"
  | "greater_same"
  | "greater_changed";

export interface ManagedSurfaceStableAdmissionProposalInternalV1 {
  readonly relation: ManagedSurfaceStableAdmissionRelationInternalV1;
  readonly captured: {
    readonly lease: ManagedSurfaceStablePublisherLeaseInternalV1;
    readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
    readonly reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
  };
  readonly nextAcceptedBaseline: Extract<
    ManagedSurfaceStableAcceptedBaselineInternalV1,
    { readonly kind: "accepted" }
  >;
}

type ManagedSurfaceStableAdmissionStaleResultInternalV1 =
  & Omit<
    Extract<ManagedSurfaceStableReconcileResultInternalV1, { readonly kind: "stale" }>,
    "code"
  >
  & {
    readonly code:
      | "surface.stable_publisher_lease_stale"
      | "surface.stable_source_revision_stale";
  };

type ManagedSurfaceStableAdmissionFaultedResultInternalV1 =
  & Omit<
    Extract<ManagedSurfaceStableReconcileResultInternalV1, { readonly kind: "faulted" }>,
    "code"
  >
  & { readonly code: "surface.stable_admission_faulted" };

type ManagedSurfaceStableAdmissionZeroResultInternalV1 =
  | Omit<
    Extract<ManagedSurfaceStableReconcileResultInternalV1, { readonly kind: "unchanged" }>,
    "code"
  >
    & { readonly code: "surface.stable_publication_unchanged" }
  | ManagedSurfaceStableAdmissionStaleResultInternalV1
  | ManagedSurfaceStableAdmissionFaultedResultInternalV1
  | Extract<
    ManagedSurfaceStableReconcileResultInternalV1,
    { readonly kind: "rejected" }
  >;

export type ManagedSurfaceStableAdmissionResultInternalV1 =
  | ManagedSurfaceStableAdmissionZeroResultInternalV1
  | {
    readonly kind: "admitted";
    readonly proposal: ManagedSurfaceStableAdmissionProposalInternalV1;
  };

export interface CreateManagedSurfaceStableRootReservationSnapshotInputInternalV1 {
  readonly subjectPublisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly generationToken: ManagedSurfaceStableReservationGenerationTokenInternalV1;
  /** Already normalized by the future R3 composite-state authority. */
  readonly foreignReservedRootSlotIds: readonly ManagedSurfaceSlotIdV1[];
}

export interface EvaluateManagedSurfaceStablePublicationInputInternalV1 {
  readonly publication: unknown;
  readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
  readonly reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
}

export interface ManagedSurfaceStableAdmissionAuthorityInternalV1 {
  createUnpublishedBaseline(
    publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1,
  ): Extract<ManagedSurfaceStableAcceptedBaselineInternalV1, { readonly kind: "unpublished" }>;
  createReservationGenerationToken(): ManagedSurfaceStableReservationGenerationTokenInternalV1;
  createRootReservationSnapshot(
    input: CreateManagedSurfaceStableRootReservationSnapshotInputInternalV1,
  ): ManagedSurfaceStableRootReservationSnapshotInternalV1;
  inspectAdmissionProposal(
    proposal: unknown,
  ): ManagedSurfaceStableAdmissionProposalInternalV1 | null;
  inspectAdmittedTargetDefinition(
    target: unknown,
  ): ManagedSurfaceResolvedDefinitionV1 | null;
  evaluate(
    input: EvaluateManagedSurfaceStablePublicationInputInternalV1,
  ): ManagedSurfaceStableAdmissionResultInternalV1;
}

export interface CreateManagedSurfaceStableAdmissionAuthorityInputInternalV1 {
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly definitionSidecars: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
}

interface DefinitionRecordInternalV1 {
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly schemaReceiver: RuntimeSchemaV1<unknown>;
  readonly schemaParse: (value: unknown) => unknown;
}

interface BaselineRecordInternalV1 {
  readonly publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly acceptedOccurrenceHighWater: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
  readonly ownerId: ManagedSurfaceOwnerIdV1 | null;
  readonly sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1 | null;
  readonly targets: readonly ManagedSurfaceStableAdmittedTargetInternalV1[];
}

interface ReservationRecordInternalV1 {
  readonly subjectPublisherLease: ManagedSurfaceStablePublisherLeaseInternalV1;
  readonly generationToken: ManagedSurfaceStableReservationGenerationTokenInternalV1;
  readonly reservedRootSlotIds: ReadonlySet<ManagedSurfaceSlotIdV1>;
}

interface AdmissionAuthorityConfigurationRecordInternalV1 {
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly slotDescriptorSignatures: readonly string[];
}

const admissionAuthorityConfigurationRecordsInternalV1 = new WeakMap<
  ManagedSurfaceStableAdmissionAuthorityInternalV1,
  AdmissionAuthorityConfigurationRecordInternalV1
>();

interface CapturedTargetInternalV1 extends ManagedSurfaceStableTargetInternalV1 {
  readonly rawIndex: number;
}

interface IdentityTargetInternalV1 {
  readonly raw: CapturedTargetInternalV1;
  readonly occurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
  readonly definitionRecord: DefinitionRecordInternalV1;
  readonly parentOccurrenceId: ManagedSurfaceTargetOccurrenceIdV1 | null;
  readonly stackScope: ManagedSurfaceStableStackScopeInternalV1;
  readonly scopeKey: string;
  readonly slotCardinality: "single" | "stack";
  readonly classification: ManagedSurfaceStableOccurrenceAdmissionClassificationInternalV1;
  readonly retainedTarget: ManagedSurfaceStableAdmittedTargetInternalV1 | null;
  readonly structurallyStable: boolean;
}

type ExactDataSnapshotInternalV1 = Readonly<Record<string, unknown>>;

const zeroDeltaInternalV1: ManagedSurfaceStableZeroDeltaInternalV1 = Object.freeze({
  source: "unchanged",
  runtime: "unchanged",
  notificationCount: 0,
  topology: "unchanged",
  runtimeAllocation: "zero",
});

function zeroResultInternalV1<
  const TKind extends ManagedSurfaceStableAdmissionZeroResultInternalV1["kind"],
>(
  kind: TKind,
  code: Extract<
    ManagedSurfaceStableAdmissionZeroResultInternalV1,
    { readonly kind: NoInfer<TKind> }
  >["code"],
): Extract<ManagedSurfaceStableAdmissionZeroResultInternalV1, { readonly kind: TKind }> {
  return Object.freeze({ kind, code, delta: zeroDeltaInternalV1 }) as unknown as Extract<
    ManagedSurfaceStableAdmissionZeroResultInternalV1,
    { readonly kind: TKind }
  >;
}

function captureExactOwnDataRecordInternalV1(
  value: unknown,
  expectedKeys: readonly string[],
): ExactDataSnapshotInternalV1 | null {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return null;
  if (Array.isArray(value)) return null;
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const actualKeys = Reflect.ownKeys(value);
  if (actualKeys.length !== expectedKeys.length) return null;
  const expected = new Set(expectedKeys);
  for (const key of actualKeys) {
    if (typeof key !== "string" || !expected.has(key)) return null;
  }
  const snapshot: Record<string, unknown> = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    Object.defineProperty(snapshot, key, {
      configurable: false,
      enumerable: true,
      writable: false,
      value: descriptor.value,
    });
  }
  return Object.freeze(snapshot);
}

function snapshotSchemaInternalV1(value: RuntimeSchemaV1<unknown>): {
  readonly receiver: RuntimeSchemaV1<unknown>;
  readonly parse: (value: unknown) => unknown;
} {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    throw new TypeError("ui.managed_surface_stable_schema_invalid");
  }
  const descriptor = Reflect.getOwnPropertyDescriptor(value, "parse");
  if (
    descriptor === undefined || !("value" in descriptor) || typeof descriptor.value !== "function"
  ) {
    throw new TypeError("ui.managed_surface_stable_schema_invalid");
  }
  return Object.freeze({
    receiver: value,
    parse: descriptor.value as (value: unknown) => unknown,
  });
}

function freezeSlotDescriptorInternalV1(
  value: ManagedSurfaceResolvedSlotDescriptorV1,
): ManagedSurfaceResolvedSlotDescriptorV1 {
  if (value.cardinality !== "single" && value.cardinality !== "stack") {
    throw new TypeError("ui.managed_surface_stable_slot_descriptor_invalid");
  }
  if (value.kind === "root") {
    return Object.freeze({
      kind: "root",
      slotId: parseManagedSurfaceSlotIdV1(value.slotId),
      cardinality: value.cardinality,
    });
  }
  if (value.kind === "child") {
    return Object.freeze({
      kind: "child",
      parentDefinitionId: parseManagedSurfaceDefinitionIdV1(value.parentDefinitionId),
      slotId: parseManagedSurfaceSlotIdV1(value.slotId),
      cardinality: value.cardinality,
    });
  }
  throw new TypeError("ui.managed_surface_stable_slot_descriptor_invalid");
}

function slotDescriptorKeyInternalV1(
  descriptor: ManagedSurfaceResolvedSlotDescriptorV1,
): string {
  return descriptor.kind === "root"
    ? `root:${descriptor.slotId}`
    : `child:${descriptor.parentDefinitionId}:${descriptor.slotId}`;
}

function slotDescriptorSignatureInternalV1(
  descriptor: ManagedSurfaceResolvedSlotDescriptorV1,
): string {
  return `${slotDescriptorKeyInternalV1(descriptor)}:${descriptor.cardinality}`;
}

/** Source-relative composition proof; no registry or catalog authority is exposed. */
export function matchesManagedSurfaceStableAdmissionAuthorityConfigurationInternalV1(
  authority: unknown,
  publisherLeaseRegistry: unknown,
  resolvedSlotDescriptors: unknown,
): boolean {
  if ((typeof authority !== "object" && typeof authority !== "function") || authority === null) {
    return false;
  }
  const record = admissionAuthorityConfigurationRecordsInternalV1.get(
    authority as ManagedSurfaceStableAdmissionAuthorityInternalV1,
  );
  if (record === undefined || record.publisherLeaseRegistry !== publisherLeaseRegistry) {
    return false;
  }
  try {
    if (!Array.isArray(resolvedSlotDescriptors)) return false;
    const signatures = resolvedSlotDescriptors.map((value) =>
      slotDescriptorSignatureInternalV1(
        freezeSlotDescriptorInternalV1(value as ManagedSurfaceResolvedSlotDescriptorV1),
      )
    ).sort();
    return signatures.length === record.slotDescriptorSignatures.length &&
      signatures.every((signature, index) => signature === record.slotDescriptorSignatures[index]);
  } catch {
    return false;
  }
}

function stackScopeKeyInternalV1(scope: ManagedSurfaceStableStackScopeInternalV1): string {
  return scope.kind === "root"
    ? `root:${scope.slotId}`
    : `child:${scope.parentOccurrenceId}:${scope.slotId}`;
}

function stackScopeEqualInternalV1(
  left: ManagedSurfaceStableStackScopeInternalV1,
  right: ManagedSurfaceStableStackScopeInternalV1,
): boolean {
  return left.kind === right.kind && left.slotId === right.slotId &&
    (left.kind === "root" ||
      (right.kind === "child" && left.parentOccurrenceId === right.parentOccurrenceId));
}

function byteArraysEqualInternalV1(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function compareStableIdsInternalV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalCodeInternalV1(
  code: BoundedCanonicalJsonRejectionCodeInternalV1,
): Extract<ManagedSurfaceStableAdmissionZeroResultInternalV1, { kind: "rejected" }>["code"] {
  switch (code) {
    case "canonical.invalid":
      return "surface.stable_canonical_invalid";
    case "limit.bytes":
      return "surface.stable_canonical_bytes_exceeded";
    case "limit.depth":
      return "surface.stable_canonical_depth_exceeded";
    case "limit.nodes":
      return "surface.stable_canonical_nodes_exceeded";
  }
  const unreachable: never = code;
  throw new TypeError("ui.managed_surface_stable_canonical_code_unreachable", {
    cause: unreachable,
  });
}

function sequenceEqualInternalV1(
  left: readonly ManagedSurfaceTargetOccurrenceIdV1[],
  right: readonly ManagedSurfaceTargetOccurrenceIdV1[],
): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateOccurrenceClassificationInternalV1(
  value: unknown,
  isRetainedOccurrence: boolean,
  acceptedHighWater: number,
  capturedIssuanceHighWater: number,
): ManagedSurfaceStableOccurrenceAdmissionClassificationInternalV1 | null {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return null;
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) return null;
  const kindDescriptor = Reflect.getOwnPropertyDescriptor(value, "kind");
  if (kindDescriptor === undefined || !("value" in kindDescriptor)) return null;
  const kind = kindDescriptor.value;
  if (kind === "foreign" || kind === "unissued") {
    if (ownKeys.length !== 1 || ownKeys[0] !== "kind") return null;
    if (isRetainedOccurrence) return null;
    return Object.freeze({ kind });
  }
  if (kind !== "retained" && kind !== "reused" && kind !== "fresh") return null;
  if (
    ownKeys.length !== 2 || !ownKeys.includes("kind") ||
    !ownKeys.includes("occurrenceSequence")
  ) {
    return null;
  }
  const occurrenceSequenceDescriptor = Reflect.getOwnPropertyDescriptor(
    value,
    "occurrenceSequence",
  );
  if (
    occurrenceSequenceDescriptor === undefined ||
    !("value" in occurrenceSequenceDescriptor)
  ) {
    return null;
  }
  let occurrenceSequence: PositiveSafeInteger;
  try {
    occurrenceSequence = parsePositiveSafeInteger(occurrenceSequenceDescriptor.value);
  } catch {
    return null;
  }
  if (occurrenceSequence > capturedIssuanceHighWater) return null;
  if (
    (kind === "retained" &&
      (!isRetainedOccurrence || occurrenceSequence > acceptedHighWater)) ||
    (kind === "reused" &&
      (isRetainedOccurrence || occurrenceSequence > acceptedHighWater)) ||
    (kind === "fresh" &&
      (isRetainedOccurrence || occurrenceSequence <= acceptedHighWater))
  ) {
    return null;
  }
  return Object.freeze({
    kind,
    occurrenceSequence,
  });
}

/**
 * Creates the dormant R2 vector-admission authority. It owns provenance only;
 * accepted state and runtime mutation remain future R3 responsibilities.
 */
export function createManagedSurfaceStableAdmissionAuthorityInternalV1(
  input: CreateManagedSurfaceStableAdmissionAuthorityInputInternalV1,
): ManagedSurfaceStableAdmissionAuthorityInternalV1 {
  const publisherLeaseRegistry = input.publisherLeaseRegistry;
  const inspectCurrentLease = publisherLeaseRegistry.inspectCurrentLease;
  const createAcceptedOccurrenceHighWater =
    publisherLeaseRegistry.createAcceptedOccurrenceHighWater;
  const captureAcceptedOccurrenceAdmissionProof =
    publisherLeaseRegistry.captureAcceptedOccurrenceAdmissionProof;
  const classifyOccurrenceAgainstAdmissionProof =
    publisherLeaseRegistry.classifyOccurrenceAgainstAdmissionProof;
  const deriveAcceptedOccurrenceHighWaterFromAdmissionProof =
    publisherLeaseRegistry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof;

  const definitions = new Map<ManagedSurfaceDefinitionIdV1, DefinitionRecordInternalV1>();
  for (const sidecar of input.definitionSidecars) {
    const definition = parseManagedSurfaceResolvedDefinitionV1(sidecar.definition);
    if (definitions.has(definition.definitionId)) {
      throw new TypeError("ui.managed_surface_stable_definition_duplicate");
    }
    const schema = snapshotSchemaInternalV1(sidecar.parameterSchema);
    definitions.set(
      definition.definitionId,
      Object.freeze({
        definition,
        schemaReceiver: schema.receiver,
        schemaParse: schema.parse,
      }),
    );
  }

  const slotDescriptors = new Map<string, ManagedSurfaceResolvedSlotDescriptorV1>();
  const rootSlotIds = new Set<ManagedSurfaceSlotIdV1>();
  for (const value of input.resolvedSlotDescriptors) {
    const descriptor = freezeSlotDescriptorInternalV1(value);
    const key = slotDescriptorKeyInternalV1(descriptor);
    if (slotDescriptors.has(key)) {
      throw new TypeError("ui.managed_surface_stable_slot_descriptor_duplicate");
    }
    slotDescriptors.set(key, descriptor);
    if (descriptor.kind === "root") rootSlotIds.add(descriptor.slotId);
  }
  const slotDescriptorSignatures = Object.freeze(
    [...slotDescriptors.values()].map(slotDescriptorSignatureInternalV1).sort(),
  );

  const baselineRecords = new WeakMap<
    ManagedSurfaceStableAcceptedBaselineInternalV1,
    BaselineRecordInternalV1
  >();
  const generationTokens = new WeakSet<
    ManagedSurfaceStableReservationGenerationTokenInternalV1
  >();
  const reservationRecords = new WeakMap<
    ManagedSurfaceStableRootReservationSnapshotInternalV1,
    ReservationRecordInternalV1
  >();
  const canonicalByteRecords = new WeakMap<
    ManagedSurfaceStableCanonicalParameterBytesInternalV1,
    Uint8Array
  >();
  const admissionProposals = new WeakSet<ManagedSurfaceStableAdmissionProposalInternalV1>();
  const admittedTargetDefinitions = new WeakMap<
    ManagedSurfaceStableAdmittedTargetInternalV1,
    ManagedSurfaceResolvedDefinitionV1
  >();

  const createCanonicalBytes = (
    bytes: Uint8Array,
  ): ManagedSurfaceStableCanonicalParameterBytesInternalV1 => {
    const handle = Object.freeze({
      byteLength: parsePositiveSafeInteger(bytes.byteLength),
    }) as ManagedSurfaceStableCanonicalParameterBytesInternalV1;
    canonicalByteRecords.set(handle, Uint8Array.from(bytes));
    return handle;
  };

  const createAcceptedBaseline = (
    publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1,
    ownerId: ManagedSurfaceOwnerIdV1,
    sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1,
    targets: readonly ManagedSurfaceStableAdmittedTargetInternalV1[],
    acceptedOccurrenceHighWater: ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1,
  ): Extract<ManagedSurfaceStableAcceptedBaselineInternalV1, { kind: "accepted" }> => {
    const baseline = Object.freeze({
      kind: "accepted" as const,
      publisherLease,
      ownerId,
      sourceRevision,
      targets,
      acceptedOccurrenceHighWater,
    });
    baselineRecords.set(baseline, {
      publisherLease,
      acceptedOccurrenceHighWater,
      ownerId,
      sourceRevision,
      targets,
    });
    return baseline;
  };

  const authority: ManagedSurfaceStableAdmissionAuthorityInternalV1 = Object.freeze({
    createUnpublishedBaseline(
      publisherLease: ManagedSurfaceStablePublisherLeaseInternalV1,
    ): Extract<
      ManagedSurfaceStableAcceptedBaselineInternalV1,
      { readonly kind: "unpublished" }
    > {
      const leaseSnapshot = Reflect.apply(inspectCurrentLease, publisherLeaseRegistry, [
        publisherLease,
      ]) as ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 | null;
      if (leaseSnapshot === null) {
        throw new TypeError("ui.managed_surface_stable_publisher_lease_stale");
      }
      const cursor = Reflect.apply(
        createAcceptedOccurrenceHighWater,
        publisherLeaseRegistry,
        [publisherLease],
      ) as ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
      const baseline = Object.freeze({
        kind: "unpublished" as const,
        publisherLease,
        acceptedOccurrenceHighWater: cursor,
      });
      baselineRecords.set(baseline, {
        publisherLease,
        acceptedOccurrenceHighWater: cursor,
        ownerId: null,
        sourceRevision: null,
        targets: Object.freeze([]),
      });
      return baseline;
    },
    createReservationGenerationToken(): ManagedSurfaceStableReservationGenerationTokenInternalV1 {
      const token = Object.freeze(
        {},
      ) as ManagedSurfaceStableReservationGenerationTokenInternalV1;
      generationTokens.add(token);
      return token;
    },
    createRootReservationSnapshot(
      snapshotInput: CreateManagedSurfaceStableRootReservationSnapshotInputInternalV1,
    ): ManagedSurfaceStableRootReservationSnapshotInternalV1 {
      if (!generationTokens.has(snapshotInput.generationToken)) {
        throw new TypeError("ui.managed_surface_stable_reservation_generation_invalid");
      }
      if (
        Reflect.apply(inspectCurrentLease, publisherLeaseRegistry, [
          snapshotInput.subjectPublisherLease,
        ]) === null
      ) {
        throw new TypeError("ui.managed_surface_stable_reservation_subject_invalid");
      }
      if (!Array.isArray(snapshotInput.foreignReservedRootSlotIds)) {
        throw new TypeError("ui.managed_surface_stable_reservation_slots_invalid");
      }
      const unique = new Set<ManagedSurfaceSlotIdV1>();
      for (const value of snapshotInput.foreignReservedRootSlotIds) {
        const slotId = parseManagedSurfaceSlotIdV1(value);
        if (!rootSlotIds.has(slotId)) {
          throw new TypeError("ui.managed_surface_stable_reservation_slot_unresolved");
        }
        unique.add(slotId);
      }
      const reservedRootSlotIds = Object.freeze(
        [...unique].sort(compareStableIdsInternalV1),
      );
      const snapshot = Object.freeze({
        subjectPublisherLease: snapshotInput.subjectPublisherLease,
        generationToken: snapshotInput.generationToken,
        reservedRootSlotIds,
      });
      reservationRecords.set(snapshot, {
        subjectPublisherLease: snapshotInput.subjectPublisherLease,
        generationToken: snapshotInput.generationToken,
        reservedRootSlotIds: new Set(reservedRootSlotIds),
      });
      return snapshot;
    },
    inspectAdmissionProposal(
      proposal: unknown,
    ): ManagedSurfaceStableAdmissionProposalInternalV1 | null {
      if ((typeof proposal !== "object" && typeof proposal !== "function") || proposal === null) {
        return null;
      }
      return admissionProposals.has(proposal as ManagedSurfaceStableAdmissionProposalInternalV1)
        ? proposal as ManagedSurfaceStableAdmissionProposalInternalV1
        : null;
    },
    inspectAdmittedTargetDefinition(target: unknown): ManagedSurfaceResolvedDefinitionV1 | null {
      if ((typeof target !== "object" && typeof target !== "function") || target === null) {
        return null;
      }
      return admittedTargetDefinitions.get(
        target as ManagedSurfaceStableAdmittedTargetInternalV1,
      ) ?? null;
    },
    evaluate(
      evaluationInput: EvaluateManagedSurfaceStablePublicationInputInternalV1,
    ): ManagedSurfaceStableAdmissionResultInternalV1 {
      let publication: ExactDataSnapshotInternalV1 | null;
      try {
        publication = captureExactOwnDataRecordInternalV1(
          evaluationInput.publication,
          ["publisherLease", "sourceRevision", "targets"],
        );
      } catch {
        return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
      }
      if (publication === null) {
        return zeroResultInternalV1(
          "rejected",
          "surface.stable_publication_envelope_invalid",
        );
      }

      const publisherLease = publication.publisherLease;
      let leaseSnapshot: ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 | null;
      try {
        leaseSnapshot = Reflect.apply(inspectCurrentLease, publisherLeaseRegistry, [
          publisherLease,
        ]) as ManagedSurfaceStablePublisherLeaseSnapshotInternalV1 | null;
      } catch {
        return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
      }
      if (leaseSnapshot === null) {
        return zeroResultInternalV1(
          "stale",
          "surface.stable_publisher_lease_stale",
        );
      }

      let parsedSourceRevision: PositiveSafeInteger;
      try {
        parsedSourceRevision = parsePositiveSafeInteger(publication.sourceRevision);
      } catch {
        return zeroResultInternalV1(
          "rejected",
          "surface.stable_source_revision_invalid",
        );
      }
      if (parsedSourceRevision > leaseSnapshot.sourceRevisionIssuanceHighWater) {
        return zeroResultInternalV1(
          "rejected",
          "surface.stable_source_revision_invalid",
        );
      }
      const sourceRevision = parsedSourceRevision as ManagedSurfaceStableSourceRevisionInternalV1;

      const acceptedBaseline = evaluationInput.acceptedBaseline;
      const baselineRecord = (typeof acceptedBaseline === "object" && acceptedBaseline !== null)
        ? baselineRecords.get(acceptedBaseline)
        : undefined;
      if (
        baselineRecord === undefined ||
        baselineRecord.publisherLease !== publisherLease ||
        leaseSnapshot.ownerId !== (baselineRecord.ownerId ?? leaseSnapshot.ownerId)
      ) {
        return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
      }
      if (baselineRecord.sourceRevision === null && sourceRevision !== 1) {
        return zeroResultInternalV1(
          "rejected",
          "surface.stable_initial_revision_invalid",
        );
      }

      let occurrenceProof: ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1;
      try {
        occurrenceProof = Reflect.apply(
          captureAcceptedOccurrenceAdmissionProof,
          publisherLeaseRegistry,
          [baselineRecord.acceptedOccurrenceHighWater],
        ) as ManagedSurfaceStableAcceptedOccurrenceAdmissionProofInternalV1;
      } catch {
        return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
      }

      if (
        baselineRecord.sourceRevision !== null &&
        sourceRevision < baselineRecord.sourceRevision
      ) {
        return zeroResultInternalV1(
          "stale",
          "surface.stable_source_revision_stale",
        );
      }

      const rawTargets = publication.targets;
      let targetCount: number;
      try {
        if (!Array.isArray(rawTargets)) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_target_shape_invalid",
          );
        }
        if (Reflect.getPrototypeOf(rawTargets) !== Array.prototype) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_target_shape_invalid",
          );
        }
        const lengthDescriptor = Reflect.getOwnPropertyDescriptor(rawTargets, "length");
        if (
          lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
          !Number.isInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
        ) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_target_shape_invalid",
          );
        }
        targetCount = lengthDescriptor.value as number;
      } catch {
        return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
      }
      if (targetCount > managedSurfaceStableContractLimitsInternalV1.maxTargets) {
        return zeroResultInternalV1(
          "rejected",
          "surface.stable_target_limit_exceeded",
        );
      }

      const capturedTargets: CapturedTargetInternalV1[] = [];
      try {
        const ownKeys = Reflect.ownKeys(rawTargets);
        if (ownKeys.length !== targetCount + 1) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_target_shape_invalid",
          );
        }
        const indexKeys = new Set<string>();
        for (const key of ownKeys) {
          if (key === "length") continue;
          if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/u.test(key)) {
            return zeroResultInternalV1(
              "rejected",
              "surface.stable_target_shape_invalid",
            );
          }
          const index = Number(key);
          if (!Number.isSafeInteger(index) || index < 0 || index >= targetCount) {
            return zeroResultInternalV1(
              "rejected",
              "surface.stable_target_shape_invalid",
            );
          }
          indexKeys.add(key);
        }
        if (indexKeys.size !== targetCount) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_target_shape_invalid",
          );
        }
        for (let index = 0; index < targetCount; index += 1) {
          const descriptor = Reflect.getOwnPropertyDescriptor(rawTargets, String(index));
          if (descriptor === undefined || !("value" in descriptor)) {
            return zeroResultInternalV1(
              "rejected",
              "surface.stable_target_shape_invalid",
            );
          }
          const target = captureExactOwnDataRecordInternalV1(
            descriptor.value,
            ["occurrenceId", "definitionId", "parentOccurrenceId", "parameters"],
          );
          if (target === null) {
            return zeroResultInternalV1(
              "rejected",
              "surface.stable_target_shape_invalid",
            );
          }
          capturedTargets.push(Object.freeze({
            occurrenceId: target.occurrenceId as ManagedSurfaceTargetOccurrenceIdV1,
            definitionId: target.definitionId as ManagedSurfaceDefinitionIdV1,
            parentOccurrenceId: target.parentOccurrenceId as
              | ManagedSurfaceTargetOccurrenceIdV1
              | null,
            parameters: target.parameters,
            rawIndex: index,
          }));
        }
      } catch {
        return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
      }

      const duplicateOccurrences = new Set<unknown>();
      for (const target of capturedTargets) {
        if (duplicateOccurrences.has(target.occurrenceId)) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_occurrence_duplicate",
          );
        }
        duplicateOccurrences.add(target.occurrenceId);
      }

      const retainedByOccurrence = new Map<
        ManagedSurfaceTargetOccurrenceIdV1,
        ManagedSurfaceStableAdmittedTargetInternalV1
      >();
      for (const target of baselineRecord.targets) {
        retainedByOccurrence.set(target.occurrenceId, target);
      }

      const classificationByIndex:
        ManagedSurfaceStableOccurrenceAdmissionClassificationInternalV1[] = [];
      for (const target of capturedTargets) {
        let classification: ManagedSurfaceStableOccurrenceAdmissionClassificationInternalV1 | null;
        try {
          const classificationValue = Reflect.apply(
            classifyOccurrenceAgainstAdmissionProof,
            publisherLeaseRegistry,
            [occurrenceProof, target.occurrenceId, retainedByOccurrence.has(target.occurrenceId)],
          );
          classification = validateOccurrenceClassificationInternalV1(
            classificationValue,
            retainedByOccurrence.has(target.occurrenceId),
            baselineRecord.acceptedOccurrenceHighWater.occurrenceSequenceHighWater,
            leaseSnapshot.occurrenceIssuanceHighWater,
          );
        } catch {
          return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
        }
        if (classification === null) {
          return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
        }
        if (classification.kind === "foreign" || classification.kind === "unissued") {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_occurrence_unissued",
          );
        }
        classificationByIndex.push(classification);
      }
      for (const classification of classificationByIndex) {
        if (classification.kind === "reused") {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_occurrence_reused",
          );
        }
      }

      const definitionByIndex: DefinitionRecordInternalV1[] = [];
      for (const target of capturedTargets) {
        const definition = definitions.get(target.definitionId);
        if (definition === undefined) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_definition_missing",
          );
        }
        definitionByIndex.push(definition);
      }
      for (const definition of definitionByIndex) {
        if (definition.definition.ownerId !== leaseSnapshot.ownerId) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_definition_owner_mismatch",
          );
        }
      }

      const occurrenceIndex = new Map<unknown, number>();
      for (const target of capturedTargets) {
        occurrenceIndex.set(target.occurrenceId, target.rawIndex);
      }
      for (let index = 0; index < capturedTargets.length; index += 1) {
        const target = capturedTargets[index]!;
        const definition = definitionByIndex[index]!.definition;
        if (definition.placement === "root" && target.parentOccurrenceId !== null) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_root_parent_invalid",
          );
        }
      }
      for (let index = 0; index < capturedTargets.length; index += 1) {
        const target = capturedTargets[index]!;
        const definition = definitionByIndex[index]!.definition;
        if (definition.placement !== "child") continue;
        const parentIndex = occurrenceIndex.get(target.parentOccurrenceId);
        if (parentIndex === undefined) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_parent_missing",
          );
        }
      }
      for (let index = 0; index < capturedTargets.length; index += 1) {
        const target = capturedTargets[index]!;
        const definition = definitionByIndex[index]!.definition;
        if (definition.placement !== "child") continue;
        const parentIndex = occurrenceIndex.get(target.parentOccurrenceId)!;
        if (parentIndex >= index) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_parent_order_invalid",
          );
        }
      }

      const identityTargets: IdentityTargetInternalV1[] = [];
      const scopeCounts = new Map<string, number>();
      for (let index = 0; index < capturedTargets.length; index += 1) {
        const raw = capturedTargets[index]!;
        const definitionRecord = definitionByIndex[index]!;
        const definition = definitionRecord.definition;
        const occurrenceId = parseManagedSurfaceTargetOccurrenceIdV1(raw.occurrenceId);
        let parentOccurrenceId: ManagedSurfaceTargetOccurrenceIdV1 | null = null;
        let stackScope: ManagedSurfaceStableStackScopeInternalV1;
        let descriptor: ManagedSurfaceResolvedSlotDescriptorV1 | undefined;
        if (definition.placement === "root") {
          descriptor = slotDescriptors.get(`root:${definition.slotId}`);
          stackScope = Object.freeze({ kind: "root", slotId: definition.slotId });
        } else {
          const parentIndex = occurrenceIndex.get(raw.parentOccurrenceId)!;
          const parentDefinition = definitionByIndex[parentIndex]!.definition;
          parentOccurrenceId = parseManagedSurfaceTargetOccurrenceIdV1(
            capturedTargets[parentIndex]!.occurrenceId,
          );
          descriptor = slotDescriptors.get(
            `child:${parentDefinition.definitionId}:${definition.slotId}`,
          );
          stackScope = Object.freeze({
            kind: "child",
            parentOccurrenceId,
            slotId: definition.slotId,
          });
        }
        if (descriptor === undefined) {
          return zeroResultInternalV1("rejected", "surface.stable_slot_invalid");
        }
        const scopeKey = stackScopeKeyInternalV1(stackScope);
        scopeCounts.set(scopeKey, (scopeCounts.get(scopeKey) ?? 0) + 1);
        const retainedTarget = retainedByOccurrence.get(occurrenceId) ?? null;
        const structurallyStable = retainedTarget !== null &&
          retainedTarget.definitionId === definition.definitionId &&
          retainedTarget.definitionContractRevision === definition.contractRevision &&
          retainedTarget.parentOccurrenceId === parentOccurrenceId &&
          stackScopeEqualInternalV1(retainedTarget.stackScope, stackScope);
        identityTargets.push(Object.freeze({
          raw,
          occurrenceId,
          definitionRecord,
          parentOccurrenceId,
          stackScope,
          scopeKey,
          slotCardinality: descriptor.cardinality,
          classification: classificationByIndex[index]!,
          retainedTarget,
          structurallyStable,
        }));
      }

      for (const target of identityTargets) {
        if (
          target.slotCardinality === "single" &&
          scopeCounts.get(target.scopeKey)! > 1
        ) {
          return zeroResultInternalV1(
            "rejected",
            "surface.stable_slot_occupied",
          );
        }
      }

      const structurallyStable = new Set(
        identityTargets.filter((target) => target.structurallyStable).map((target) =>
          target.occurrenceId
        ),
      );
      const oldScopeSequences = new Map<string, ManagedSurfaceTargetOccurrenceIdV1[]>();
      for (const target of baselineRecord.targets) {
        if (!structurallyStable.has(target.occurrenceId)) continue;
        const key = stackScopeKeyInternalV1(target.stackScope);
        const sequence = oldScopeSequences.get(key) ?? [];
        sequence.push(target.occurrenceId);
        oldScopeSequences.set(key, sequence);
      }
      const nextScopeSequences = new Map<string, ManagedSurfaceTargetOccurrenceIdV1[]>();
      for (const target of identityTargets) {
        if (!structurallyStable.has(target.occurrenceId)) continue;
        const sequence = nextScopeSequences.get(target.scopeKey) ?? [];
        sequence.push(target.occurrenceId);
        nextScopeSequences.set(target.scopeKey, sequence);
      }
      for (const [scopeKey, oldSequence] of oldScopeSequences) {
        if (!sequenceEqualInternalV1(oldSequence, nextScopeSequences.get(scopeKey) ?? [])) {
          return zeroResultInternalV1("rejected", "surface.stable_order_invalid");
        }
      }
      if (
        identityTargets.some((target) =>
          target.retainedTarget !== null && !target.structurallyStable
        )
      ) {
        return zeroResultInternalV1(
          "rejected",
          "surface.stable_occurrence_reused",
        );
      }

      const nextTargets: ManagedSurfaceStableAdmittedTargetInternalV1[] = [];
      let nextOccurrenceHighWater =
        baselineRecord.acceptedOccurrenceHighWater.occurrenceSequenceHighWater;
      for (const target of identityTargets) {
        let normalized: unknown;
        try {
          normalized = Reflect.apply(
            target.definitionRecord.schemaParse,
            target.definitionRecord.schemaReceiver,
            [target.raw.parameters],
          );
        } catch {
          return zeroResultInternalV1("rejected", "surface.stable_schema_invalid");
        }
        let canonical;
        try {
          canonical = projectBoundedCanonicalJsonInternalV1(normalized, {
            maxBytes: parsePositiveSafeInteger(
              managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxBytes,
            ),
            maxDepth: parsePositiveSafeInteger(
              managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxDepth,
            ),
            maxNodes: parsePositiveSafeInteger(
              managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxNodes,
            ),
          });
        } catch {
          return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
        }
        if (canonical.kind === "rejected") {
          return zeroResultInternalV1("rejected", canonicalCodeInternalV1(canonical.code));
        }
        if (target.retainedTarget !== null) {
          const oldBytes = canonicalByteRecords.get(
            target.retainedTarget.canonicalParameterBytes,
          );
          if (oldBytes === undefined) {
            return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
          }
          if (!byteArraysEqualInternalV1(oldBytes, canonical.bytes)) {
            return zeroResultInternalV1(
              "rejected",
              "surface.stable_occurrence_reused",
            );
          }
          nextTargets.push(target.retainedTarget);
        } else {
          const canonicalParameterBytes = createCanonicalBytes(canonical.bytes);
          const admittedTarget = Object.freeze({
            publisherLease: publisherLease as ManagedSurfaceStablePublisherLeaseInternalV1,
            ownerId: leaseSnapshot.ownerId,
            occurrenceId: target.occurrenceId,
            definitionId: target.definitionRecord.definition.definitionId,
            definitionContractRevision: target.definitionRecord.definition.contractRevision,
            parentOccurrenceId: target.parentOccurrenceId,
            stackScope: target.stackScope,
            normalizedParameters: canonical.value as DeepReadonly<StrictJsonValueV1>,
            canonicalParameterBytes,
          });
          admittedTargetDefinitions.set(
            admittedTarget,
            target.definitionRecord.definition,
          );
          nextTargets.push(admittedTarget);
        }
        if (
          "occurrenceSequence" in target.classification &&
          target.classification.occurrenceSequence > nextOccurrenceHighWater
        ) {
          nextOccurrenceHighWater = parseNonNegativeSafeInteger(
            target.classification.occurrenceSequence,
          );
        }
      }

      const reservationSnapshot = evaluationInput.reservationSnapshot;
      const reservationRecord = (typeof reservationSnapshot === "object" &&
          reservationSnapshot !== null)
        ? reservationRecords.get(reservationSnapshot)
        : undefined;
      if (
        reservationRecord === undefined ||
        reservationRecord.subjectPublisherLease !== publisherLease ||
        !generationTokens.has(reservationRecord.generationToken)
      ) {
        return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
      }
      if (
        nextTargets.some((target) =>
          target.stackScope.kind === "root" &&
          reservationRecord.reservedRootSlotIds.has(target.stackScope.slotId)
        )
      ) {
        return zeroResultInternalV1("rejected", "surface.stable_owner_conflict");
      }

      const acceptedBefore = baselineRecord.sourceRevision !== null;
      const sameVector = acceptedBefore &&
        baselineRecord.targets.length === nextTargets.length &&
        nextTargets.every((target) => retainedByOccurrence.get(target.occurrenceId) === target);
      if (acceptedBefore && sourceRevision === baselineRecord.sourceRevision) {
        return sameVector
          ? zeroResultInternalV1(
            "unchanged",
            "surface.stable_publication_unchanged",
          )
          : zeroResultInternalV1(
            "rejected",
            "surface.stable_source_revision_conflict",
          );
      }

      let nextAcceptedOccurrenceHighWater:
        ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
      try {
        nextAcceptedOccurrenceHighWater = Reflect.apply(
          deriveAcceptedOccurrenceHighWaterFromAdmissionProof,
          publisherLeaseRegistry,
          [occurrenceProof, nextOccurrenceHighWater],
        ) as ManagedSurfaceStableAcceptedOccurrenceHighWaterInternalV1;
      } catch {
        return zeroResultInternalV1("faulted", "surface.stable_admission_faulted");
      }
      const frozenTargets = sameVector && baselineRecord.sourceRevision !== null
        ? baselineRecord.targets
        : Object.freeze(nextTargets);
      const nextAcceptedBaseline = createAcceptedBaseline(
        publisherLease as ManagedSurfaceStablePublisherLeaseInternalV1,
        leaseSnapshot.ownerId,
        sourceRevision,
        frozenTargets,
        nextAcceptedOccurrenceHighWater,
      );
      const relation: ManagedSurfaceStableAdmissionRelationInternalV1 = !acceptedBefore
        ? "initial"
        : sameVector
        ? "greater_same"
        : "greater_changed";
      const proposal = Object.freeze({
        relation,
        captured: Object.freeze({
          lease: publisherLease as ManagedSurfaceStablePublisherLeaseInternalV1,
          acceptedBaseline,
          reservationSnapshot,
        }),
        nextAcceptedBaseline,
      });
      admissionProposals.add(proposal);
      return Object.freeze({ kind: "admitted", proposal });
    },
  });

  admissionAuthorityConfigurationRecordsInternalV1.set(authority, {
    publisherLeaseRegistry,
    slotDescriptorSignatures,
  });

  return authority;
}
