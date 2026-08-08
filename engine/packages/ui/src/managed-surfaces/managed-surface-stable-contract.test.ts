// SPDX-License-Identifier: MIT
import type { PositiveSafeInteger } from "@sillymaker/base";
import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  ManagedSurfaceSlotIdV1,
  ManagedSurfaceTargetOccurrenceIdV1,
  ManagedSurfaceTransientTargetV1,
} from "./managed-surface-contracts.ts";
import {
  managedSurfaceStableAdmissionPrecedenceInternalV1,
  managedSurfaceStableContractLimitsInternalV1,
  managedSurfaceStableDeltaContractInternalV1,
  managedSurfaceStableResultCodesInternalV1,
  type ManagedSurfaceStableAdmittedTargetInternalV1,
  type ManagedSurfaceStableCanonicalParameterBytesInternalV1,
  type ManagedSurfaceStablePublicationInternalV1,
  type ManagedSurfaceStablePublicationAppliedDeltaInternalV1,
  type ManagedSurfaceStablePublisherDisposedDeltaInternalV1,
  type ManagedSurfaceStableReconcileResultInternalV1,
  type ManagedSurfaceStableSourceRevisionInternalV1,
  type ManagedSurfaceStableStackScopeInternalV1,
  type ManagedSurfaceStableTargetInternalV1,
  type ManagedSurfaceStableZeroDeltaInternalV1,
} from "./managed-surface-stable-contract.ts";

type ExactKeysV1<TValue> = TValue extends unknown ? keyof TValue : never;
type IsNeverV1<TValue> = [TValue] extends [never] ? true : false;

describe("dormant managed stable Surface contract", () => {
  it("keeps the stable source envelope separate from transient targets", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStablePublicationInternalV1>>().toEqualTypeOf<
      "publisherLease" | "sourceRevision" | "targets"
    >();
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableTargetInternalV1>>().toEqualTypeOf<
      "occurrenceId" | "definitionId" | "parentOccurrenceId" | "parameters"
    >();
    expectTypeOf<ExactKeysV1<ManagedSurfaceTransientTargetV1>>().toEqualTypeOf<
      "kind" | "occurrenceId"
    >();
    expectTypeOf<
      Extract<
        keyof ManagedSurfaceTransientTargetV1,
        "publisherLease" | "sourceRevision" | "canonicalParameterBytes"
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<IsNeverV1<ManagedSurfaceStableSourceRevisionInternalV1>>()
      .toEqualTypeOf<false>();
    expectTypeOf<ManagedSurfaceStableSourceRevisionInternalV1>()
      .toMatchTypeOf<PositiveSafeInteger>();
  });

  it("binds admitted identity to exact parent and resolved stack scope without an ordinal", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableAdmittedTargetInternalV1>>()
      .toEqualTypeOf<
        | "publisherLease"
        | "ownerId"
        | "occurrenceId"
        | "definitionId"
        | "definitionContractRevision"
        | "parentOccurrenceId"
        | "stackScope"
        | "normalizedParameters"
        | "canonicalParameterBytes"
      >();
    expectTypeOf<ManagedSurfaceStableStackScopeInternalV1>().toEqualTypeOf<
      | {
        readonly kind: "root";
        readonly slotId: ManagedSurfaceSlotIdV1;
      }
      | {
        readonly kind: "child";
        readonly parentOccurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
        readonly slotId: ManagedSurfaceSlotIdV1;
      }
    >();
    expectTypeOf<
      Extract<keyof ManagedSurfaceStableAdmittedTargetInternalV1, "stackPosition" | "ordinal">
    >().toEqualTypeOf<never>();
    expectTypeOf<
      ManagedSurfaceStableAdmittedTargetInternalV1["canonicalParameterBytes"]
    >().toEqualTypeOf<ManagedSurfaceStableCanonicalParameterBytesInternalV1>();
    expectTypeOf<ManagedSurfaceStableCanonicalParameterBytesInternalV1>()
      .not.toMatchTypeOf<Uint8Array>();
  });

  it("freezes exact package-owned bounds without creating a public authoring knob", () => {
    expect(managedSurfaceStableContractLimitsInternalV1).toEqual({
      maxTargets: 64,
      canonicalParameters: {
        maxBytes: 65_536,
        maxDepth: 32,
        maxNodes: 4_096,
      },
    });
    expect(Object.isFrozen(managedSurfaceStableContractLimitsInternalV1)).toBe(true);
    expect(Object.isFrozen(managedSurfaceStableContractLimitsInternalV1.canonicalParameters))
      .toBe(true);
  });

  it("freezes closed result codes by exact admission stage", () => {
    expect(managedSurfaceStableResultCodesInternalV1).toEqual({
      applied: [
        "surface.stable_publication_applied",
        "surface.stable_publisher_disposed",
      ],
      unchanged: [
        "surface.stable_publication_unchanged",
        "surface.stable_publisher_already_disposed",
      ],
      stale: [
        "surface.stable_publisher_lease_stale",
        "surface.stable_source_revision_stale",
      ],
      rejected: {
        envelope_shape: ["surface.stable_publication_envelope_invalid"],
        source_revision: [
          "surface.stable_source_revision_invalid",
          "surface.stable_initial_revision_invalid",
        ],
        target_count: ["surface.stable_target_limit_exceeded"],
        identity_graph: [
          "surface.stable_occurrence_duplicate",
          "surface.stable_occurrence_unissued",
          "surface.stable_occurrence_reused",
          "surface.stable_definition_missing",
          "surface.stable_definition_owner_mismatch",
          "surface.stable_root_parent_invalid",
          "surface.stable_parent_missing",
          "surface.stable_parent_order_invalid",
          "surface.stable_slot_invalid",
          "surface.stable_slot_occupied",
          "surface.stable_order_invalid",
        ],
        canonical_parameters: [
          "surface.stable_schema_invalid",
          "surface.stable_canonical_invalid",
          "surface.stable_canonical_bytes_exceeded",
          "surface.stable_canonical_depth_exceeded",
          "surface.stable_canonical_nodes_exceeded",
        ],
        equal_revision: ["surface.stable_source_revision_conflict"],
        owner_conflict: [
          "surface.stable_owner_scope_invalid",
          "surface.stable_owner_conflict",
        ],
      },
      faulted: ["surface.stable_admission_faulted"],
    });

    const codes = [
      ...managedSurfaceStableResultCodesInternalV1.applied,
      ...managedSurfaceStableResultCodesInternalV1.unchanged,
      ...managedSurfaceStableResultCodesInternalV1.stale,
      ...Object.values(managedSurfaceStableResultCodesInternalV1.rejected).flat(),
      ...managedSurfaceStableResultCodesInternalV1.faulted,
    ];
    expect(new Set(codes).size).toBe(codes.length);
    expect(Object.isFrozen(managedSurfaceStableResultCodesInternalV1)).toBe(true);
    for (const group of Object.values(managedSurfaceStableResultCodesInternalV1)) {
      expect(Object.isFrozen(group)).toBe(true);
    }
    for (const group of Object.values(managedSurfaceStableResultCodesInternalV1.rejected)) {
      expect(Object.isFrozen(group)).toBe(true);
    }
  });

  it("records exact stage and within-stage admission precedence", () => {
    expect(managedSurfaceStableAdmissionPrecedenceInternalV1).toEqual([
      {
        stage: "envelope_shape",
        resultCodes: ["surface.stable_publication_envelope_invalid"],
      },
      {
        stage: "publisher_lease",
        resultCodes: ["surface.stable_publisher_lease_stale"],
      },
      {
        stage: "source_revision_scalar",
        resultCodes: ["surface.stable_source_revision_invalid"],
      },
      {
        stage: "initial_revision",
        resultCodes: ["surface.stable_initial_revision_invalid"],
      },
      {
        stage: "lower_revision_short_circuit",
        resultCodes: ["surface.stable_source_revision_stale"],
      },
      {
        stage: "target_count",
        resultCodes: ["surface.stable_target_limit_exceeded"],
      },
      {
        stage: "identity_graph",
        resultCodes: [
          "surface.stable_occurrence_duplicate",
          "surface.stable_occurrence_unissued",
          "surface.stable_occurrence_reused",
          "surface.stable_definition_missing",
          "surface.stable_definition_owner_mismatch",
          "surface.stable_root_parent_invalid",
          "surface.stable_parent_missing",
          "surface.stable_parent_order_invalid",
          "surface.stable_slot_invalid",
          "surface.stable_slot_occupied",
          "surface.stable_order_invalid",
        ],
      },
      {
        stage: "canonical_parameters",
        resultCodes: [
          "surface.stable_schema_invalid",
          "surface.stable_canonical_invalid",
          "surface.stable_canonical_bytes_exceeded",
          "surface.stable_canonical_depth_exceeded",
          "surface.stable_canonical_nodes_exceeded",
        ],
      },
      {
        stage: "owner_conflict",
        resultCodes: [
          "surface.stable_owner_scope_invalid",
          "surface.stable_owner_conflict",
        ],
      },
      {
        stage: "equal_revision_comparison",
        resultCodes: ["surface.stable_source_revision_conflict"],
      },
    ]);
    expect(Object.isFrozen(managedSurfaceStableAdmissionPrecedenceInternalV1)).toBe(true);
    for (const row of managedSurfaceStableAdmissionPrecedenceInternalV1) {
      expect(Object.isFrozen(row)).toBe(true);
      expect(Object.isFrozen(row.resultCodes)).toBe(true);
    }
  });

  it("freezes exact source and runtime deltas for every R0 decision row", () => {
    expect(managedSurfaceStableDeltaContractInternalV1).toEqual([
      {
        case: "stale_publisher_lease",
        resultKind: "stale",
        resultCodes: ["surface.stable_publisher_lease_stale"],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "header_or_initial_invalid",
        resultKind: "rejected",
        resultCodes: [
          "surface.stable_publication_envelope_invalid",
          "surface.stable_source_revision_invalid",
          "surface.stable_initial_revision_invalid",
        ],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "lower",
        resultKind: "stale",
        resultCodes: ["surface.stable_source_revision_stale"],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "equal_same",
        resultKind: "unchanged",
        resultCodes: ["surface.stable_publication_unchanged"],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "equal_invalid",
        resultKind: "rejected",
        resultCodes: [
          "surface.stable_target_limit_exceeded",
          "surface.stable_occurrence_duplicate",
          "surface.stable_occurrence_unissued",
          "surface.stable_occurrence_reused",
          "surface.stable_definition_missing",
          "surface.stable_definition_owner_mismatch",
          "surface.stable_root_parent_invalid",
          "surface.stable_parent_missing",
          "surface.stable_parent_order_invalid",
          "surface.stable_slot_invalid",
          "surface.stable_slot_occupied",
          "surface.stable_order_invalid",
          "surface.stable_schema_invalid",
          "surface.stable_canonical_invalid",
          "surface.stable_canonical_bytes_exceeded",
          "surface.stable_canonical_depth_exceeded",
          "surface.stable_canonical_nodes_exceeded",
          "surface.stable_owner_scope_invalid",
          "surface.stable_owner_conflict",
        ],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "equal_different",
        resultKind: "rejected",
        resultCodes: ["surface.stable_source_revision_conflict"],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "greater_invalid",
        resultKind: "rejected",
        resultCodes: [
          "surface.stable_target_limit_exceeded",
          "surface.stable_occurrence_duplicate",
          "surface.stable_occurrence_unissued",
          "surface.stable_occurrence_reused",
          "surface.stable_definition_missing",
          "surface.stable_definition_owner_mismatch",
          "surface.stable_root_parent_invalid",
          "surface.stable_parent_missing",
          "surface.stable_parent_order_invalid",
          "surface.stable_slot_invalid",
          "surface.stable_slot_occupied",
          "surface.stable_order_invalid",
          "surface.stable_schema_invalid",
          "surface.stable_canonical_invalid",
          "surface.stable_canonical_bytes_exceeded",
          "surface.stable_canonical_depth_exceeded",
          "surface.stable_canonical_nodes_exceeded",
          "surface.stable_owner_scope_invalid",
          "surface.stable_owner_conflict",
        ],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "greater_same_all_active",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "advance_cursor",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "greater_same_gap",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "advance_cursor",
        runtime: "retry_gaps",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
      {
        case: "greater_changed",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "replace_vector",
        runtime: "retain_retire_prepare",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
      {
        case: "greater_empty_with_observable_targets",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "accept_empty",
        runtime: "retire_owned_targets",
        notificationCount: 1,
        topology: "changed",
        runtimeAllocation: "zero",
      },
      {
        case: "greater_empty_with_nonobservable_targets",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "accept_empty",
        runtime: "retire_owned_targets",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "greater_empty_without_runtime",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "accept_empty",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "first_empty",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "accept_empty",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "greater_empty_cursor_only",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "advance_cursor",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "equal_empty",
        resultKind: "unchanged",
        resultCodes: ["surface.stable_publication_unchanged"],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "effective_dispose_with_observable_targets",
        resultKind: "applied",
        resultCodes: ["surface.stable_publisher_disposed"],
        source: "remove_lease",
        runtime: "retire_owned_targets",
        notificationCount: 1,
        topology: "changed",
        runtimeAllocation: "zero",
      },
      {
        case: "effective_dispose_with_nonobservable_targets",
        resultKind: "applied",
        resultCodes: ["surface.stable_publisher_disposed"],
        source: "remove_lease",
        runtime: "retire_owned_targets",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "effective_dispose_without_runtime",
        resultKind: "applied",
        resultCodes: ["surface.stable_publisher_disposed"],
        source: "remove_lease",
        runtime: "unchanged",
        notificationCount: 1,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "repeated_dispose",
        resultKind: "unchanged",
        resultCodes: ["surface.stable_publisher_already_disposed"],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "admission_fault",
        resultKind: "faulted",
        resultCodes: ["surface.stable_admission_faulted"],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    ]);
    expect(Object.isFrozen(managedSurfaceStableDeltaContractInternalV1)).toBe(true);
    for (const row of managedSurfaceStableDeltaContractInternalV1) {
      expect(Object.isFrozen(row)).toBe(true);
      expect(Object.isFrozen(row.resultCodes)).toBe(true);
    }
  });

  it("binds failure and accepted result codes to compatible deltas", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableReconcileResultInternalV1>>()
      .toEqualTypeOf<"kind" | "code" | "delta">();
    expectTypeOf<
      Extract<ManagedSurfaceStableReconcileResultInternalV1, { kind: "stale" }>["delta"]
    >().toEqualTypeOf<ManagedSurfaceStableZeroDeltaInternalV1>();
    expectTypeOf<
      Extract<ManagedSurfaceStableReconcileResultInternalV1, { kind: "rejected" }>["delta"]
    >().toEqualTypeOf<ManagedSurfaceStableZeroDeltaInternalV1>();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableReconcileResultInternalV1,
        { code: "surface.stable_publication_applied" }
      >["delta"]
    >().toEqualTypeOf<ManagedSurfaceStablePublicationAppliedDeltaInternalV1>();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableReconcileResultInternalV1,
        { code: "surface.stable_publisher_disposed" }
      >["delta"]
    >().toEqualTypeOf<ManagedSurfaceStablePublisherDisposedDeltaInternalV1>();
  });
});
