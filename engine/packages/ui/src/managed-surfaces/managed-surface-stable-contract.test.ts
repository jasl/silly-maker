// SPDX-License-Identifier: MIT
import type { PositiveSafeInteger } from "@sillymaker/base";
import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  ManagedSurfaceReadinessEvidenceV1,
  ManagedSurfaceSlotIdV1,
  ManagedSurfaceTargetOccurrenceIdV1,
  ManagedSurfaceTransitionReceiptV1,
  ManagedSurfaceTransientTargetV1,
} from "./managed-surface-contracts.ts";
import {
  managedSurfaceStableAdmissionChecksInternalV1,
  managedSurfaceStableApplyPreconditionChecksInternalV1,
  managedSurfaceStableContractLimitsInternalV1,
  managedSurfaceStableDeltaContractInternalV1,
  managedSurfaceStableParameterAdmissionPolicyInternalV1,
  managedSurfaceStableReadinessDeltaContractInternalV1,
  managedSurfaceStableReadinessFenceChecksInternalV1,
  managedSurfaceStableResultCodesInternalV1,
  type ManagedSurfaceStableAdmissionCheckRowInternalV1,
  type ManagedSurfaceStableAdmissionStageInternalV1,
  type ManagedSurfaceStableAdmittedTargetInternalV1,
  type ManagedSurfaceStableApplyPreconditionCheckRowInternalV1,
  type ManagedSurfaceStableCanonicalParameterBytesInternalV1,
  type ManagedSurfaceStableDeltaContractRowInternalV1,
  type ManagedSurfaceStableDeltaInternalV1,
  type ManagedSurfaceStablePublicationInternalV1,
  type ManagedSurfaceStablePublicationAppliedDeltaInternalV1,
  type ManagedSurfaceStablePublisherDisposedDeltaInternalV1,
  type ManagedSurfaceStableReadinessAppliedDeltaInternalV1,
  type ManagedSurfaceStableReadinessEnvelopeInternalV1,
  type ManagedSurfaceStableReadinessFenceCheckRowInternalV1,
  type ManagedSurfaceStableReadinessResultInternalV1,
  type ManagedSurfaceStableReconcileResultInternalV1,
  type ManagedSurfaceStableResultCodeInternalV1,
  type ManagedSurfaceStableRuntimeDeltaInternalV1,
  type ManagedSurfaceStableSourceRevisionInternalV1,
  type ManagedSurfaceStableStaleCodeInternalV1,
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

  it("freezes a globally unique semantic result-code inventory", () => {
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
        "surface.stable_reconcile_precondition_stale",
      ],
      rejected: {
        envelope_shape: ["surface.stable_publication_envelope_invalid"],
        source_revision: [
          "surface.stable_source_revision_invalid",
          "surface.stable_initial_revision_invalid",
        ],
        target_shape: ["surface.stable_target_shape_invalid"],
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
        owner_conflict: ["surface.stable_owner_conflict"],
      },
      faulted: [
        "surface.stable_admission_faulted",
        "surface.stable_reconcile_faulted",
      ],
    });

    const codes = [
      ...managedSurfaceStableResultCodesInternalV1.applied,
      ...managedSurfaceStableResultCodesInternalV1.unchanged,
      ...managedSurfaceStableResultCodesInternalV1.stale,
      ...Object.values(managedSurfaceStableResultCodesInternalV1.rejected).flat(),
      ...managedSurfaceStableResultCodesInternalV1.faulted,
    ];
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain("surface.stable_owner_scope_invalid");
    expect(Object.isFrozen(managedSurfaceStableResultCodesInternalV1)).toBe(true);
    for (const group of Object.values(managedSurfaceStableResultCodesInternalV1)) {
      expect(Object.isFrozen(group)).toBe(true);
    }
    for (const group of Object.values(managedSurfaceStableResultCodesInternalV1.rejected)) {
      expect(Object.isFrozen(group)).toBe(true);
    }
    expectTypeOf<ManagedSurfaceStableStaleCodeInternalV1>().toEqualTypeOf<
      | "surface.stable_publisher_lease_stale"
      | "surface.stable_source_revision_stale"
      | "surface.stable_reconcile_precondition_stale"
    >();
    expectTypeOf<
      Extract<ManagedSurfaceStableReconcileResultInternalV1, { kind: "faulted" }>["code"]
    >().toEqualTypeOf<
      "surface.stable_admission_faulted" | "surface.stable_reconcile_faulted"
    >();
  });

  it("records exact named-check precedence without ordering first-event outcomes", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableAdmissionCheckRowInternalV1>>()
      .toEqualTypeOf<"stage" | "check" | "code">();
    expectTypeOf<ManagedSurfaceStableAdmissionStageInternalV1>()
      .toEqualTypeOf<ManagedSurfaceStableAdmissionCheckRowInternalV1["stage"]>();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableAdmissionCheckRowInternalV1,
        { stage: "lower_revision_short_circuit"; check: "lower_revision" }
      >["code"]
    >().toEqualTypeOf<"surface.stable_source_revision_stale">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableAdmissionCheckRowInternalV1,
        { stage: "target_vector_header"; check: "capture_array_header" }
      >["code"]
    >().toEqualTypeOf<
      "surface.stable_target_shape_invalid" | "surface.stable_admission_faulted"
    >();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableAdmissionCheckRowInternalV1,
        { stage: "parameter_admission"; check: "canonical_first_traversal_event" }
      >["code"]
    >().toEqualTypeOf<
      | "surface.stable_canonical_invalid"
      | "surface.stable_canonical_bytes_exceeded"
      | "surface.stable_canonical_depth_exceeded"
      | "surface.stable_canonical_nodes_exceeded"
      | "surface.stable_admission_faulted"
    >();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableAdmissionCheckRowInternalV1,
        { stage: "parameter_admission"; check: "retained_normalized_bytes" }
      >["code"]
    >().toEqualTypeOf<"surface.stable_occurrence_reused">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableAdmissionCheckRowInternalV1,
        { stage: "target_count"; code: "surface.stable_occurrence_reused" }
      >
    >().toEqualTypeOf<never>();

    const collapsedChecks = managedSurfaceStableAdmissionChecksInternalV1.filter(
      (row, index, rows) =>
        index === 0 ||
        row.stage !== rows[index - 1]?.stage ||
        row.check !== rows[index - 1]?.check,
    ).map(({ stage, check }) => ({ stage, check }));

    const outcomesFor = (stage: string, check: string) =>
      new Set(
        managedSurfaceStableAdmissionChecksInternalV1
          .filter((row) => row.stage === stage && row.check === check)
          .map((row) => row.code),
      );
    const outcomeSet = (...codes: ManagedSurfaceStableResultCodeInternalV1[]) => new Set(codes);
    const expectedChecks = [
      [
        "outer_header",
        "capture_exact_publication",
        outcomeSet(
          "surface.stable_publication_envelope_invalid",
          "surface.stable_admission_faulted",
        ),
      ],
      [
        "lease_source_baseline",
        "current_publisher_lease",
        outcomeSet("surface.stable_publisher_lease_stale"),
      ],
      [
        "lease_source_baseline",
        "source_revision_scalar",
        outcomeSet("surface.stable_source_revision_invalid"),
      ],
      [
        "lease_source_baseline",
        "source_revision_issuance",
        outcomeSet("surface.stable_source_revision_invalid"),
      ],
      [
        "lease_source_baseline",
        "accepted_baseline_provenance",
        outcomeSet("surface.stable_admission_faulted"),
      ],
      [
        "lease_source_baseline",
        "initial_revision",
        outcomeSet("surface.stable_initial_revision_invalid"),
      ],
      [
        "lower_revision_short_circuit",
        "lower_revision",
        outcomeSet("surface.stable_source_revision_stale"),
      ],
      [
        "target_vector_header",
        "capture_array_header",
        outcomeSet(
          "surface.stable_target_shape_invalid",
          "surface.stable_admission_faulted",
        ),
      ],
      [
        "target_count",
        "target_count_limit",
        outcomeSet("surface.stable_target_limit_exceeded"),
      ],
      [
        "target_shape",
        "capture_exact_targets",
        outcomeSet(
          "surface.stable_target_shape_invalid",
          "surface.stable_admission_faulted",
        ),
      ],
      [
        "identity_graph",
        "occurrence_duplicate",
        outcomeSet("surface.stable_occurrence_duplicate"),
      ],
      [
        "identity_graph",
        "occurrence_issuance",
        outcomeSet("surface.stable_occurrence_unissued"),
      ],
      [
        "identity_graph",
        "occurrence_gap_burn",
        outcomeSet("surface.stable_occurrence_reused"),
      ],
      [
        "identity_graph",
        "definition_exists",
        outcomeSet("surface.stable_definition_missing"),
      ],
      [
        "identity_graph",
        "definition_owner",
        outcomeSet("surface.stable_definition_owner_mismatch"),
      ],
      [
        "identity_graph",
        "root_parent",
        outcomeSet("surface.stable_root_parent_invalid"),
      ],
      [
        "identity_graph",
        "parent_exists",
        outcomeSet("surface.stable_parent_missing"),
      ],
      [
        "identity_graph",
        "parent_order",
        outcomeSet("surface.stable_parent_order_invalid"),
      ],
      [
        "identity_graph",
        "slot_scope",
        outcomeSet("surface.stable_slot_invalid"),
      ],
      [
        "identity_graph",
        "slot_cardinality",
        outcomeSet("surface.stable_slot_occupied"),
      ],
      [
        "identity_graph",
        "retained_scope_order",
        outcomeSet("surface.stable_order_invalid"),
      ],
      [
        "identity_graph",
        "retained_structural_identity",
        outcomeSet("surface.stable_occurrence_reused"),
      ],
      [
        "parameter_admission",
        "schema_parse",
        outcomeSet("surface.stable_schema_invalid"),
      ],
      [
        "parameter_admission",
        "canonical_first_traversal_event",
        outcomeSet(
          "surface.stable_canonical_invalid",
          "surface.stable_canonical_bytes_exceeded",
          "surface.stable_canonical_depth_exceeded",
          "surface.stable_canonical_nodes_exceeded",
          "surface.stable_admission_faulted",
        ),
      ],
      [
        "parameter_admission",
        "retained_normalized_bytes",
        outcomeSet("surface.stable_occurrence_reused"),
      ],
      [
        "owner_conflict",
        "reservation_provenance",
        outcomeSet("surface.stable_admission_faulted"),
      ],
      [
        "owner_conflict",
        "root_slot_conflict",
        outcomeSet("surface.stable_owner_conflict"),
      ],
      [
        "equal_revision_comparison",
        "semantic_vector_equality",
        outcomeSet(
          "surface.stable_publication_unchanged",
          "surface.stable_source_revision_conflict",
        ),
      ],
    ] as const;

    expect(collapsedChecks).toEqual(
      expectedChecks.map(([stage, check]) => ({ stage, check })),
    );
    for (const [stage, check, outcomes] of expectedChecks) {
      expect(outcomesFor(stage, check)).toEqual(outcomes);
    }

    const checksForCode = (code: ManagedSurfaceStableResultCodeInternalV1) =>
      managedSurfaceStableAdmissionChecksInternalV1
        .filter((row) => row.code === code)
        .map((row) => row.check);
    expect(checksForCode("surface.stable_source_revision_invalid")).toEqual([
      "source_revision_scalar",
      "source_revision_issuance",
    ]);
    expect(checksForCode("surface.stable_target_shape_invalid")).toEqual([
      "capture_array_header",
      "capture_exact_targets",
    ]);
    expect(checksForCode("surface.stable_occurrence_reused")).toEqual([
      "occurrence_gap_burn",
      "retained_structural_identity",
      "retained_normalized_bytes",
    ]);
    expect(checksForCode("surface.stable_admission_faulted")).toEqual([
      "capture_exact_publication",
      "accepted_baseline_provenance",
      "capture_array_header",
      "capture_exact_targets",
      "canonical_first_traversal_event",
      "reservation_provenance",
    ]);

    const inventory = new Set<ManagedSurfaceStableResultCodeInternalV1>([
      ...managedSurfaceStableResultCodesInternalV1.applied,
      ...managedSurfaceStableResultCodesInternalV1.unchanged,
      ...managedSurfaceStableResultCodesInternalV1.stale,
      ...Object.values(managedSurfaceStableResultCodesInternalV1.rejected).flat(),
      ...managedSurfaceStableResultCodesInternalV1.faulted,
    ]);
    expect(managedSurfaceStableAdmissionChecksInternalV1.every((row) => inventory.has(row.code)))
      .toBe(true);
    expect(
      new Set(
        managedSurfaceStableAdmissionChecksInternalV1.map((row) =>
          `${row.stage}:${row.check}:${row.code}`
        ),
      ).size,
    ).toBe(managedSurfaceStableAdmissionChecksInternalV1.length);
    expect(Object.isFrozen(managedSurfaceStableAdmissionChecksInternalV1)).toBe(true);
    for (const row of managedSurfaceStableAdmissionChecksInternalV1) {
      expect(Object.keys(row)).toEqual(["stage", "check", "code"]);
      expect(Object.isFrozen(row)).toBe(true);
    }
  });

  it("freezes apply-time precondition precedence with exact zero deltas", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableApplyPreconditionCheckRowInternalV1>>()
      .toEqualTypeOf<
        | "check"
        | "kind"
        | "code"
        | "source"
        | "runtime"
        | "notificationCount"
        | "topology"
        | "runtimeAllocation"
      >();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableApplyPreconditionCheckRowInternalV1,
        { check: "proposal_provenance" }
      >
    >().toEqualTypeOf<
      {
        readonly check: "proposal_provenance";
        readonly kind: "faulted";
        readonly code: "surface.stable_admission_faulted";
        readonly source: "unchanged";
        readonly runtime: "unchanged";
        readonly notificationCount: 0;
        readonly topology: "unchanged";
        readonly runtimeAllocation: "zero";
      }
    >();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableApplyPreconditionCheckRowInternalV1,
        { kind: "faulted"; code: "surface.stable_publisher_lease_stale" }
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableApplyPreconditionCheckRowInternalV1,
        { kind: "stale"; code: "surface.stable_admission_faulted" }
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<ManagedSurfaceStableApplyPreconditionCheckRowInternalV1["source"]>()
      .toEqualTypeOf<"unchanged">();
    expectTypeOf<ManagedSurfaceStableApplyPreconditionCheckRowInternalV1["runtime"]>()
      .toEqualTypeOf<"unchanged">();
    expectTypeOf<ManagedSurfaceStableApplyPreconditionCheckRowInternalV1["notificationCount"]>()
      .toEqualTypeOf<0>();
    expectTypeOf<ManagedSurfaceStableApplyPreconditionCheckRowInternalV1["topology"]>()
      .toEqualTypeOf<"unchanged">();
    expectTypeOf<ManagedSurfaceStableApplyPreconditionCheckRowInternalV1["runtimeAllocation"]>()
      .toEqualTypeOf<"zero">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableApplyPreconditionCheckRowInternalV1,
        { check: "publisher_lease_currentness" }
      >["code"]
    >().toEqualTypeOf<"surface.stable_publisher_lease_stale">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableApplyPreconditionCheckRowInternalV1,
        { check: "accepted_baseline_currentness" | "reservation_generation_currentness" }
      >["code"]
    >().toEqualTypeOf<"surface.stable_reconcile_precondition_stale">();

    expect(managedSurfaceStableApplyPreconditionChecksInternalV1).toEqual([
      {
        check: "proposal_provenance",
        kind: "faulted",
        code: "surface.stable_admission_faulted",
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        check: "publisher_lease_currentness",
        kind: "stale",
        code: "surface.stable_publisher_lease_stale",
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        check: "accepted_baseline_currentness",
        kind: "stale",
        code: "surface.stable_reconcile_precondition_stale",
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        check: "reservation_generation_currentness",
        kind: "stale",
        code: "surface.stable_reconcile_precondition_stale",
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    ]);
    const inventory = new Set<ManagedSurfaceStableResultCodeInternalV1>([
      ...managedSurfaceStableResultCodesInternalV1.applied,
      ...managedSurfaceStableResultCodesInternalV1.unchanged,
      ...managedSurfaceStableResultCodesInternalV1.stale,
      ...Object.values(managedSurfaceStableResultCodesInternalV1.rejected).flat(),
      ...managedSurfaceStableResultCodesInternalV1.faulted,
    ]);
    expect(
      managedSurfaceStableApplyPreconditionChecksInternalV1.every((row) => inventory.has(row.code)),
    ).toBe(true);
    expect(Object.isFrozen(managedSurfaceStableApplyPreconditionChecksInternalV1)).toBe(true);
    for (const row of managedSurfaceStableApplyPreconditionChecksInternalV1) {
      expect(Object.keys(row)).toEqual([
        "check",
        "kind",
        "code",
        "source",
        "runtime",
        "notificationCount",
        "topology",
        "runtimeAllocation",
      ]);
      expect(Object.isFrozen(row)).toBe(true);
    }
  });

  it("freezes the stable-only readiness envelope and fence precedence", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableReadinessEnvelopeInternalV1>>()
      .toEqualTypeOf<"readinessEvidence" | "publisherLease" | "sourceRevision">();
    expectTypeOf<ManagedSurfaceStableReadinessEnvelopeInternalV1["readinessEvidence"]>()
      .toEqualTypeOf<ManagedSurfaceReadinessEvidenceV1>();
    expectTypeOf<
      Extract<keyof ManagedSurfaceReadinessEvidenceV1, "publisherLease" | "sourceRevision">
    >().toEqualTypeOf<never>();
    expectTypeOf<ExactKeysV1<ManagedSurfaceTransitionReceiptV1>>().toEqualTypeOf<
      | "kind"
      | "code"
      | "beforeTopologyRevision"
      | "afterTopologyRevision"
      | "surfaceInstanceId"
    >();
    expectTypeOf<
      Extract<keyof ManagedSurfaceTransitionReceiptV1, "publisherLease" | "sourceRevision">
    >().toEqualTypeOf<never>();
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableReadinessFenceCheckRowInternalV1>>()
      .toEqualTypeOf<
        | "check"
        | "kind"
        | "code"
        | "source"
        | "runtime"
        | "notificationCount"
        | "topology"
        | "runtimeAllocation"
      >();

    expect(managedSurfaceStableReadinessFenceChecksInternalV1).toEqual([
      {
        check: "application_epoch",
        kind: "stale",
        code: "surface.stale_application_epoch",
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        check: "candidate_attempt",
        kind: "stale",
        code: "surface.stale_readiness",
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        check: "candidate_publisher_lease",
        kind: "stale",
        code: "surface.stale_readiness",
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        check: "candidate_source_revision",
        kind: "stale",
        code: "surface.stale_readiness",
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    ]);
    expectTypeOf<
      Extract<
        ManagedSurfaceStableReadinessFenceCheckRowInternalV1,
        { check: "application_epoch" }
      >["code"]
    >().toEqualTypeOf<"surface.stale_application_epoch">();
    expectTypeOf<
      Extract<
        ManagedSurfaceStableReadinessFenceCheckRowInternalV1,
        {
          check:
            | "candidate_attempt"
            | "candidate_publisher_lease"
            | "candidate_source_revision";
        }
      >["code"]
    >().toEqualTypeOf<"surface.stale_readiness">();
    expectTypeOf<ManagedSurfaceStableReadinessFenceCheckRowInternalV1["kind"]>()
      .toEqualTypeOf<"stale">();
    expectTypeOf<ManagedSurfaceStableReadinessFenceCheckRowInternalV1["source"]>()
      .toEqualTypeOf<"unchanged">();
    expectTypeOf<ManagedSurfaceStableReadinessFenceCheckRowInternalV1["runtime"]>()
      .toEqualTypeOf<"unchanged">();
    expectTypeOf<ManagedSurfaceStableReadinessFenceCheckRowInternalV1["notificationCount"]>()
      .toEqualTypeOf<0>();
    expectTypeOf<ManagedSurfaceStableReadinessFenceCheckRowInternalV1["topology"]>()
      .toEqualTypeOf<"unchanged">();
    expectTypeOf<ManagedSurfaceStableReadinessFenceCheckRowInternalV1["runtimeAllocation"]>()
      .toEqualTypeOf<"zero">();
    expect(Object.isFrozen(managedSurfaceStableReadinessFenceChecksInternalV1)).toBe(true);
    for (const row of managedSurfaceStableReadinessFenceChecksInternalV1) {
      expect(Object.keys(row)).toEqual([
        "check",
        "kind",
        "code",
        "source",
        "runtime",
        "notificationCount",
        "topology",
        "runtimeAllocation",
      ]);
      expect(Object.isFrozen(row)).toBe(true);
    }
  });

  it("freezes dedicated stable readiness settlement results and deltas", () => {
    type ReadinessDeltaRowV1 = typeof managedSurfaceStableReadinessDeltaContractInternalV1[number];

    expectTypeOf<ExactKeysV1<ManagedSurfaceStableReadinessResultInternalV1>>()
      .toEqualTypeOf<"kind" | "code" | "delta">();
    expectTypeOf<ManagedSurfaceStableReadinessResultInternalV1["kind"]>()
      .toEqualTypeOf<"applied" | "stale" | "faulted">();
    expectTypeOf<
      Extract<ManagedSurfaceStableReadinessResultInternalV1, { kind: "applied" }>["code"]
    >().toEqualTypeOf<"surface.readiness_ready" | "surface.readiness_failed">();
    expectTypeOf<
      Extract<ManagedSurfaceStableReadinessResultInternalV1, { kind: "applied" }>["delta"]
    >().toEqualTypeOf<ManagedSurfaceStableReadinessAppliedDeltaInternalV1>();
    expectTypeOf<
      Extract<ManagedSurfaceStableReadinessResultInternalV1, { kind: "stale" }>["code"]
    >().toEqualTypeOf<"surface.stale_application_epoch" | "surface.stale_readiness">();
    expectTypeOf<
      Extract<ManagedSurfaceStableReadinessResultInternalV1, { kind: "stale" }>["delta"]
    >().toEqualTypeOf<ManagedSurfaceStableZeroDeltaInternalV1>();
    expectTypeOf<
      Extract<ManagedSurfaceStableReadinessResultInternalV1, { kind: "faulted" }>["code"]
    >().toEqualTypeOf<"surface.stable_reconcile_faulted">();
    expectTypeOf<
      Extract<ManagedSurfaceStableReadinessResultInternalV1, { kind: "faulted" }>["delta"]
    >().toEqualTypeOf<ManagedSurfaceStableZeroDeltaInternalV1>();
    expectTypeOf<
      Extract<ManagedSurfaceStableReadinessResultInternalV1, { kind: "unchanged" | "rejected" }>
    >().toEqualTypeOf<never>();
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableReadinessAppliedDeltaInternalV1>>()
      .toEqualTypeOf<
        "source" | "runtime" | "notificationCount" | "topology" | "runtimeAllocation"
      >();
    expectTypeOf<ManagedSurfaceStableReadinessAppliedDeltaInternalV1["source"]>()
      .toEqualTypeOf<"unchanged">();
    expectTypeOf<ManagedSurfaceStableReadinessAppliedDeltaInternalV1["runtime"]>()
      .toEqualTypeOf<"settle_readiness">();
    expectTypeOf<ManagedSurfaceStableReadinessAppliedDeltaInternalV1["notificationCount"]>()
      .toEqualTypeOf<1>();
    expectTypeOf<ManagedSurfaceStableReadinessAppliedDeltaInternalV1["topology"]>()
      .toEqualTypeOf<"readiness_policy_derived">();
    expectTypeOf<ManagedSurfaceStableReadinessAppliedDeltaInternalV1["runtimeAllocation"]>()
      .toEqualTypeOf<"zero" | "preparation_count">();
    expectTypeOf<ExactKeysV1<ReadinessDeltaRowV1>>().toEqualTypeOf<
      | "case"
      | "resultKind"
      | "resultCodes"
      | "source"
      | "runtime"
      | "notificationCount"
      | "topology"
      | "runtimeAllocation"
    >();

    expect(managedSurfaceStableReadinessDeltaContractInternalV1).toEqual([
      {
        case: "readiness_ready_zero",
        resultKind: "applied",
        resultCodes: ["surface.readiness_ready"],
        source: "unchanged",
        runtime: "settle_readiness",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "zero",
      },
      {
        case: "readiness_ready_with_preparation",
        resultKind: "applied",
        resultCodes: ["surface.readiness_ready"],
        source: "unchanged",
        runtime: "settle_readiness",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
      {
        case: "readiness_failed_zero",
        resultKind: "applied",
        resultCodes: ["surface.readiness_failed"],
        source: "unchanged",
        runtime: "settle_readiness",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "zero",
      },
      {
        case: "readiness_failed_with_preparation",
        resultKind: "applied",
        resultCodes: ["surface.readiness_failed"],
        source: "unchanged",
        runtime: "settle_readiness",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
      },
      {
        case: "readiness_fault",
        resultKind: "faulted",
        resultCodes: ["surface.stable_reconcile_faulted"],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
    ]);
    expect(Object.isFrozen(managedSurfaceStableReadinessDeltaContractInternalV1)).toBe(true);
    for (const row of managedSurfaceStableReadinessDeltaContractInternalV1) {
      expect(Object.keys(row)).toEqual([
        "case",
        "resultKind",
        "resultCodes",
        "source",
        "runtime",
        "notificationCount",
        "topology",
        "runtimeAllocation",
      ]);
      expect(Object.isFrozen(row)).toBe(true);
      expect(Object.isFrozen(row.resultCodes)).toBe(true);
    }
  });

  it("freezes per-target parameter admission around first traversal events", () => {
    expect(managedSurfaceStableParameterAdmissionPolicyInternalV1).toEqual({
      targetIteration: "raw_target_order",
      checksPerTarget: [
        "schema_parse",
        "canonical_first_traversal_event",
        "retained_normalized_bytes",
      ],
      canonicalPrecedence: "first_traversal_event",
    });
    expect(Object.isFrozen(managedSurfaceStableParameterAdmissionPolicyInternalV1)).toBe(true);
    expect(Object.isFrozen(managedSurfaceStableParameterAdmissionPolicyInternalV1.checksPerTarget))
      .toBe(true);
  });

  it("freezes exact source and runtime deltas for every R0 decision row", () => {
    type DeltaFromRowV1<
      TRow extends {
        readonly source: unknown;
        readonly runtime: unknown;
        readonly notificationCount: unknown;
        readonly topology: unknown;
        readonly runtimeAllocation: unknown;
      },
    > = TRow extends unknown ? Pick<
        TRow,
        "source" | "runtime" | "notificationCount" | "topology" | "runtimeAllocation"
      >
      : never;

    expectTypeOf<ManagedSurfaceStableDeltaInternalV1>().toEqualTypeOf<
      | ManagedSurfaceStableReconcileResultInternalV1["delta"]
      | ManagedSurfaceStableReadinessAppliedDeltaInternalV1
    >();
    expectTypeOf<
      Extract<ManagedSurfaceStableDeltaInternalV1, { runtime: "settle_readiness" }>
    >().toEqualTypeOf<ManagedSurfaceStableReadinessAppliedDeltaInternalV1>();
    expectTypeOf<DeltaFromRowV1<ManagedSurfaceStableDeltaContractRowInternalV1>>()
      .toEqualTypeOf<ManagedSurfaceStableReconcileResultInternalV1["delta"]>();
    expectTypeOf<
      Extract<
        DeltaFromRowV1<ManagedSurfaceStableDeltaContractRowInternalV1>,
        { runtime: "settle_readiness" }
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<ManagedSurfaceStableRuntimeDeltaInternalV1>().toEqualTypeOf<
      | "unchanged"
      | "retry_gaps"
      | "retain_retire_prepare"
      | "retire_owned_targets"
      | "retire_owned_targets_and_prepare_unblocked_children"
      | "settle_readiness"
    >();
    expectTypeOf<
      Extract<
        ManagedSurfaceStablePublicationAppliedDeltaInternalV1,
        { runtime: "retire_owned_targets_and_prepare_unblocked_children" }
      >
    >().toEqualTypeOf<{
      readonly source: "accept_empty";
      readonly runtime: "retire_owned_targets_and_prepare_unblocked_children";
      readonly notificationCount: 1;
      readonly topology: "readiness_policy_derived";
      readonly runtimeAllocation: "preparation_count";
    }>();
    expectTypeOf<
      Extract<
        ManagedSurfaceStablePublisherDisposedDeltaInternalV1,
        { runtime: "retire_owned_targets_and_prepare_unblocked_children" }
      >
    >().toEqualTypeOf<{
      readonly source: "remove_lease";
      readonly runtime: "retire_owned_targets_and_prepare_unblocked_children";
      readonly notificationCount: 1;
      readonly topology: "readiness_policy_derived";
      readonly runtimeAllocation: "preparation_count";
    }>();
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
        case: "apply_reconcile_precondition_stale",
        resultKind: "stale",
        resultCodes: ["surface.stable_reconcile_precondition_stale"],
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
          "surface.stable_target_shape_invalid",
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
          "surface.stable_target_shape_invalid",
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
          "surface.stable_owner_conflict",
        ],
        source: "unchanged",
        runtime: "unchanged",
        notificationCount: 0,
        topology: "unchanged",
        runtimeAllocation: "zero",
      },
      {
        case: "initial_nonempty",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "replace_vector",
        runtime: "retain_retire_prepare",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
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
        case: "greater_same_parent_unavailable",
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
        case: "greater_empty_with_unblocked_children",
        resultKind: "applied",
        resultCodes: ["surface.stable_publication_applied"],
        source: "accept_empty",
        runtime: "retire_owned_targets_and_prepare_unblocked_children",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
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
        case: "effective_dispose_with_unblocked_children",
        resultKind: "applied",
        resultCodes: ["surface.stable_publisher_disposed"],
        source: "remove_lease",
        runtime: "retire_owned_targets_and_prepare_unblocked_children",
        notificationCount: 1,
        topology: "readiness_policy_derived",
        runtimeAllocation: "preparation_count",
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
      {
        case: "reconcile_fault",
        resultKind: "faulted",
        resultCodes: ["surface.stable_reconcile_faulted"],
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

  it("binds failure and applied result codes to compatible deltas without admitting", () => {
    expectTypeOf<ExactKeysV1<ManagedSurfaceStableReconcileResultInternalV1>>()
      .toEqualTypeOf<"kind" | "code" | "delta">();
    expectTypeOf<
      Extract<ManagedSurfaceStableReconcileResultInternalV1, { kind: "admitted" }>
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<ManagedSurfaceStableReconcileResultInternalV1["kind"], "admitted">
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<ManagedSurfaceStableReconcileResultInternalV1, { kind: "stale" }>["delta"]
    >().toEqualTypeOf<ManagedSurfaceStableZeroDeltaInternalV1>();
    expectTypeOf<
      Extract<ManagedSurfaceStableReconcileResultInternalV1, { kind: "stale" }>["code"]
    >().toEqualTypeOf<
      | "surface.stable_publisher_lease_stale"
      | "surface.stable_source_revision_stale"
      | "surface.stable_reconcile_precondition_stale"
    >();
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
