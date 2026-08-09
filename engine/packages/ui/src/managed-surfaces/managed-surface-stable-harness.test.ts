// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceDefinitionIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceReadinessEvidenceV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceSlotIdV1,
  type ManagedSurfaceTargetOccurrenceIdV1,
  type ManagedSurfaceTransitionReceiptV1,
} from "./managed-surface-contracts.ts";
import { createManagedSurfaceReducerStateV1 } from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionProposalInternalV1,
  type ManagedSurfaceStableAdmissionResultInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "./managed-surface-stable-admission.ts";
import {
  compareManagedSurfaceStableCompositePrivateProvenanceInternalV1,
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableRuntimeEntryInternalV1,
} from "./managed-surface-stable-composite-state.ts";
import type {
  ManagedSurfaceStableReadinessEnvelopeInternalV1,
  ManagedSurfaceStableTargetInternalV1,
} from "./managed-surface-stable-contract.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(91);
const alphaOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.neutral-alpha");
const betaOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.neutral-beta");
const alphaRootSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.neutral-alpha-root");
const betaRootSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.neutral-beta-root");
const alphaChildSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.neutral-alpha-child");
const alphaRootDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.neutral-alpha-root",
);
const alphaReplacementDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.neutral-alpha-replacement",
);
const alphaChildDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.neutral-alpha-child",
);
const betaRootDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.neutral-beta-root",
);
const betaConflictDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.neutral-beta-conflict",
);
const neutralLayerIdV1 = parseManagedSurfaceLayerIdV1("surface-layer.neutral-stable-harness");

const resolvedSlotDescriptorsV1 = Object.freeze(
  [
    Object.freeze({
      kind: "root" as const,
      slotId: alphaRootSlotIdV1,
      cardinality: "single" as const,
    }),
    Object.freeze({
      kind: "root" as const,
      slotId: betaRootSlotIdV1,
      cardinality: "single" as const,
    }),
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: alphaRootDefinitionIdV1,
      slotId: alphaChildSlotIdV1,
      cardinality: "stack" as const,
    }),
  ] satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);

function schemaV1(): RuntimeSchemaV1<unknown> {
  return Object.freeze({ parse: (value: unknown): unknown => value });
}

function sidecarV1(input: {
  readonly definitionId: ManagedSurfaceDefinitionIdV1;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly slotId: ManagedSurfaceSlotIdV1;
  readonly placement?: "root" | "child";
  readonly layerOrder: number;
  readonly modality?: "non_blocking" | "blocking";
}): ManagedSurfaceStableDefinitionSidecarInternalV1 {
  const definition = Object.freeze({
    definitionId: input.definitionId,
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: input.ownerId,
    slotId: input.slotId,
    layerId: neutralLayerIdV1,
    layerOrder: parseNonNegativeSafeInteger(input.layerOrder),
    placement: input.placement ?? "root",
    modality: input.modality ?? "non_blocking",
    inputPolicy: Object.freeze({ kind: "none" as const }),
    dismissPolicy: Object.freeze({
      back: true,
      escape: true,
      backdrop: false,
      routedCancel: true,
    }),
    focusPolicy: Object.freeze({ kind: "none" as const }),
    navigationPolicy: Object.freeze({ kind: "close" as const }),
    actionIds: Object.freeze([]),
    readiness: Object.freeze({
      initialOpen: "blocking_fallback" as const,
      primaryReplacement: "retain_current" as const,
      childOpen: "blocking_fallback" as const,
    }),
  }) satisfies ManagedSurfaceResolvedDefinitionV1;
  return Object.freeze({ definition, parameterSchema: schemaV1() });
}

interface NeutralHarnessV1 {
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly alpha: ManagedSurfaceStablePublisherInternalV1;
  readonly beta: ManagedSurfaceStablePublisherInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
}

function harnessV1(
  input: { readonly reportSubscriberFailure?: () => void } = {},
): NeutralHarnessV1 {
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: [alphaOwnerIdV1, betaOwnerIdV1],
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const alpha = registry.issuePublisher(alphaOwnerIdV1);
  const beta = registry.issuePublisher(betaOwnerIdV1);
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: [
      sidecarV1({
        definitionId: alphaRootDefinitionIdV1,
        ownerId: alphaOwnerIdV1,
        slotId: alphaRootSlotIdV1,
        layerOrder: 10,
      }),
      sidecarV1({
        definitionId: alphaReplacementDefinitionIdV1,
        ownerId: alphaOwnerIdV1,
        slotId: alphaRootSlotIdV1,
        layerOrder: 10,
      }),
      sidecarV1({
        definitionId: alphaChildDefinitionIdV1,
        ownerId: alphaOwnerIdV1,
        slotId: alphaChildSlotIdV1,
        placement: "child",
        layerOrder: 20,
      }),
      sidecarV1({
        definitionId: betaRootDefinitionIdV1,
        ownerId: betaOwnerIdV1,
        slotId: betaRootSlotIdV1,
        layerOrder: 100,
        modality: "blocking",
      }),
      sidecarV1({
        definitionId: betaConflictDefinitionIdV1,
        ownerId: betaOwnerIdV1,
        slotId: alphaRootSlotIdV1,
        layerOrder: 100,
        modality: "blocking",
      }),
    ],
    resolvedSlotDescriptors: resolvedSlotDescriptorsV1,
  });
  const initialTransientState = createManagedSurfaceReducerStateV1(
    applicationEpochV1,
    [alphaOwnerIdV1, betaOwnerIdV1],
    resolvedSlotDescriptorsV1,
  );
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: authority,
    publisherLeaseRegistry: registry,
    initialTransientState,
    ...(input.reportSubscriberFailure === undefined
      ? {}
      : { reportSubscriberFailure: input.reportSubscriberFailure }),
  });
  expect(kernel.registerStablePublisherLeaseInternalV1(alpha.lease).kind).toBe("registered");
  expect(kernel.registerStablePublisherLeaseInternalV1(beta.lease).kind).toBe("registered");
  return { registry, authority, alpha, beta, kernel };
}

function rawRootV1(
  publisher: ManagedSurfaceStablePublisherInternalV1,
  definitionId: ManagedSurfaceDefinitionIdV1,
): ManagedSurfaceStableTargetInternalV1 {
  return Object.freeze({
    occurrenceId: publisher.issueOccurrence(),
    definitionId,
    parentOccurrenceId: null,
    parameters: null,
  });
}

function rawChildV1(
  publisher: ManagedSurfaceStablePublisherInternalV1,
  parentOccurrenceId: ManagedSurfaceTargetOccurrenceIdV1,
): ManagedSurfaceStableTargetInternalV1 {
  return Object.freeze({
    occurrenceId: publisher.issueOccurrence(),
    definitionId: alphaChildDefinitionIdV1,
    parentOccurrenceId,
    parameters: null,
  });
}

function capturedContextV1(
  harness: NeutralHarnessV1,
  publisher: ManagedSurfaceStablePublisherInternalV1,
): {
  readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
  readonly reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
} {
  const captured = harness.kernel.captureAdmissionContextInternalV1(publisher.lease);
  if (captured.kind !== "captured") throw new Error("expected captured admission context");
  return captured;
}

function evaluateV1(input: {
  readonly harness: NeutralHarnessV1;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly targets: readonly ManagedSurfaceStableTargetInternalV1[];
}): ManagedSurfaceStableAdmissionResultInternalV1 {
  const context = capturedContextV1(input.harness, input.publisher);
  return input.harness.authority.evaluate({
    publication: Object.freeze({
      publisherLease: input.publisher.lease,
      sourceRevision: input.publisher.issueSourceRevision(),
      targets: input.targets,
    }),
    acceptedBaseline: context.acceptedBaseline,
    reservationSnapshot: context.reservationSnapshot,
  });
}

function applyV1(input: {
  readonly harness: NeutralHarnessV1;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly targets: readonly ManagedSurfaceStableTargetInternalV1[];
}): ManagedSurfaceStableAdmissionProposalInternalV1 {
  const admitted = evaluateV1(input);
  if (admitted.kind !== "admitted") {
    throw new Error("expected admitted publication, got " + admitted.kind + ":" + admitted.code);
  }
  expect(input.harness.kernel.applyStableAdmissionProposalInternalV1(admitted.proposal))
    .toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
  return admitted.proposal;
}

function preparingEntryV1(
  harness: NeutralHarnessV1,
  occurrenceId: ManagedSurfaceTargetOccurrenceIdV1,
): ManagedSurfaceStableRuntimeEntryInternalV1 & {
  readonly binding: Extract<ManagedSurfaceStableRuntimeEntryInternalV1["binding"], {
    readonly kind: "preparing";
  }>;
} {
  const entry = harness.kernel.getStateInternalV1().stableRuntimeBindings.find((candidate) =>
    candidate.desiredTarget.admittedTarget.occurrenceId === occurrenceId
  );
  if (entry?.binding.kind !== "preparing") throw new Error("expected preparing entry");
  return entry as ReturnType<typeof preparingEntryV1>;
}

function envelopeV1(
  entry: ReturnType<typeof preparingEntryV1>,
): ManagedSurfaceStableReadinessEnvelopeInternalV1 {
  return Object.freeze({
    readinessEvidence: Object.freeze({
      applicationEpoch: applicationEpochV1,
      surfaceInstanceId: entry.binding.attempt.identity.surfaceInstanceId,
    }),
    publisherLease: entry.desiredTarget.publisherLease,
    sourceRevision: entry.desiredTarget.sourceRevision,
  });
}

function baselineV1(
  harness: NeutralHarnessV1,
  publisher: ManagedSurfaceStablePublisherInternalV1,
): ManagedSurfaceStableAcceptedBaselineInternalV1 | undefined {
  return harness.kernel.getStateInternalV1().stableAcceptedBaselines.find(
    (candidate) => candidate.publisherLease === publisher.lease,
  );
}

function runtimeSummaryV1(harness: NeutralHarnessV1) {
  return harness.kernel.getStateInternalV1().stableRuntimeBindings.map((entry) => {
    const occurrenceId = entry.desiredTarget.admittedTarget.occurrenceId;
    if (entry.binding.kind === "preparing") {
      return Object.freeze({
        occurrenceId,
        kind: "preparing" as const,
        sequence: entry.binding.attempt.identity.allocation.sequence,
        retainedRoot:
          entry.binding.retainedSubtree?.root.attempt.desiredTarget.admittedTarget.occurrenceId ??
            null,
      });
    }
    if (entry.binding.kind === "ready_instance") {
      return Object.freeze({
        occurrenceId,
        kind: "ready" as const,
        phase: entry.binding.instance.phase,
        sequence: entry.binding.instance.attempt.identity.allocation.sequence,
      });
    }
    return Object.freeze({
      occurrenceId,
      kind: "gap" as const,
      reason: entry.binding.reason,
      retainedRoot:
        entry.binding.retainedSubtree?.root.attempt.desiredTarget.admittedTarget.occurrenceId ??
          null,
    });
  });
}

describe("neutral dormant stable aggregate harness", () => {
  it("keeps transient evidence and receipts free of stable source placeholders", () => {
    type StablePlaceholderV1 =
      | "publisherLease"
      | "sourceRevision"
      | "acceptedBaseline"
      | "reconcileCursor";
    expectTypeOf<Extract<keyof ManagedSurfaceReadinessEvidenceV1, StablePlaceholderV1>>()
      .toEqualTypeOf<never>();
    expectTypeOf<Extract<keyof ManagedSurfaceTransitionReceiptV1, StablePlaceholderV1>>()
      .toEqualTypeOf<never>();
  });

  it("matches a neutral two-owner reference trace across conflict, retry, empty, and disposal", () => {
    const harness = harnessV1();
    let stateNotifications = 0;
    let transientNotifications = 0;
    harness.kernel.subscribeStateInternalV1(() => stateNotifications += 1);
    harness.kernel.subscribeTransientInternalV1(() => transientNotifications += 1);

    const alphaRoot = rawRootV1(harness.alpha, alphaRootDefinitionIdV1);
    const alphaChild = rawChildV1(harness.alpha, alphaRoot.occurrenceId);
    applyV1({ harness, publisher: harness.alpha, targets: [alphaRoot, alphaChild] });
    expect(runtimeSummaryV1(harness)).toEqual([
      { occurrenceId: alphaRoot.occurrenceId, kind: "preparing", sequence: 1, retainedRoot: null },
      {
        occurrenceId: alphaChild.occurrenceId,
        kind: "gap",
        reason: "parent_unavailable",
        retainedRoot: null,
      },
    ]);

    const alphaRootCandidate = preparingEntryV1(harness, alphaRoot.occurrenceId);
    expect(harness.kernel.settleStableReadinessReadyInternalV1(
      envelopeV1(alphaRootCandidate),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    expect(runtimeSummaryV1(harness)).toEqual([
      { occurrenceId: alphaRoot.occurrenceId, kind: "ready", phase: "suspended", sequence: 1 },
      { occurrenceId: alphaChild.occurrenceId, kind: "preparing", sequence: 2, retainedRoot: null },
    ]);
    const alphaChildCandidate = preparingEntryV1(harness, alphaChild.occurrenceId);
    expect(harness.kernel.settleStableReadinessFailedInternalV1(
      envelopeV1(alphaChildCandidate),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
    expect(runtimeSummaryV1(harness)).toEqual([
      { occurrenceId: alphaRoot.occurrenceId, kind: "ready", phase: "active", sequence: 1 },
      {
        occurrenceId: alphaChild.occurrenceId,
        kind: "gap",
        reason: "readiness_failed",
        retainedRoot: null,
      },
    ]);

    const betaRoot = rawRootV1(harness.beta, betaRootDefinitionIdV1);
    applyV1({ harness, publisher: harness.beta, targets: [betaRoot] });
    const betaRootCandidate = preparingEntryV1(harness, betaRoot.occurrenceId);
    expect(harness.kernel.settleStableReadinessReadyInternalV1(
      envelopeV1(betaRootCandidate),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    expect(runtimeSummaryV1(harness)).toEqual([
      { occurrenceId: alphaRoot.occurrenceId, kind: "ready", phase: "suspended", sequence: 1 },
      {
        occurrenceId: alphaChild.occurrenceId,
        kind: "gap",
        reason: "readiness_failed",
        retainedRoot: null,
      },
      { occurrenceId: betaRoot.occurrenceId, kind: "ready", phase: "active", sequence: 3 },
    ]);

    const conflict = rawRootV1(harness.beta, betaConflictDefinitionIdV1);
    const beforeConflict = harness.kernel.getStateInternalV1();
    expect(evaluateV1({ harness, publisher: harness.beta, targets: [conflict] })).toMatchObject({
      kind: "rejected",
      code: "surface.stable_owner_conflict",
    });
    expect(harness.kernel.getStateInternalV1()).toBe(beforeConflict);

    applyV1({ harness, publisher: harness.beta, targets: [] });
    expect(runtimeSummaryV1(harness)).toEqual([
      { occurrenceId: alphaRoot.occurrenceId, kind: "ready", phase: "active", sequence: 1 },
      {
        occurrenceId: alphaChild.occurrenceId,
        kind: "gap",
        reason: "readiness_failed",
        retainedRoot: null,
      },
    ]);
    const betaBaseline = baselineV1(harness, harness.beta);
    expect(betaBaseline).toMatchObject({ kind: "accepted", sourceRevision: 3, targets: [] });

    const retryProposal = applyV1({
      harness,
      publisher: harness.alpha,
      targets: [alphaRoot, alphaChild],
    });
    const retriedChild = preparingEntryV1(harness, alphaChild.occurrenceId);
    expect(retriedChild.binding.attempt.identity.allocation.sequence).toBe(4);
    expect(harness.kernel.settleStableReadinessReadyInternalV1(
      envelopeV1(retriedChild),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    expect(runtimeSummaryV1(harness)).toEqual([
      { occurrenceId: alphaRoot.occurrenceId, kind: "ready", phase: "active", sequence: 1 },
      { occurrenceId: alphaChild.occurrenceId, kind: "ready", phase: "active", sequence: 4 },
    ]);

    const replacement = rawRootV1(harness.alpha, alphaReplacementDefinitionIdV1);
    applyV1({ harness, publisher: harness.alpha, targets: [replacement] });
    const replacementCandidate = preparingEntryV1(harness, replacement.occurrenceId);
    expect(runtimeSummaryV1(harness)).toEqual([
      {
        occurrenceId: replacement.occurrenceId,
        kind: "preparing",
        sequence: 5,
        retainedRoot: alphaRoot.occurrenceId,
      },
    ]);
    expect(harness.kernel.settleStableReadinessFailedInternalV1(
      envelopeV1(replacementCandidate),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
    expect(runtimeSummaryV1(harness)).toEqual([
      {
        occurrenceId: replacement.occurrenceId,
        kind: "gap",
        reason: "readiness_failed",
        retainedRoot: alphaRoot.occurrenceId,
      },
    ]);

    applyV1({ harness, publisher: harness.alpha, targets: [replacement] });
    const replacementRetry = preparingEntryV1(harness, replacement.occurrenceId);
    expect(replacementRetry.binding.attempt.identity.allocation.sequence).toBe(6);
    expect(harness.kernel.settleStableReadinessReadyInternalV1(
      envelopeV1(replacementRetry),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    expect(runtimeSummaryV1(harness)).toEqual([
      { occurrenceId: replacement.occurrenceId, kind: "ready", phase: "active", sequence: 6 },
    ]);

    applyV1({ harness, publisher: harness.alpha, targets: [] });
    expect(runtimeSummaryV1(harness)).toEqual([]);
    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.alpha.lease)).toMatchObject(
      {
        kind: "applied",
        code: "surface.stable_publisher_disposed",
      },
    );
    const afterDispose = harness.kernel.getStateInternalV1();
    expect(harness.kernel.disposeStablePublisherLeaseInternalV1(harness.alpha.lease)).toMatchObject(
      {
        kind: "unchanged",
        code: "surface.stable_publisher_already_disposed",
      },
    );
    expect(harness.kernel.getStateInternalV1()).toBe(afterDispose);
    expect(harness.registry.inspectCurrentLease(harness.alpha.lease)).toBeNull();

    const freshAlpha = harness.registry.issuePublisher(alphaOwnerIdV1);
    expect(harness.kernel.registerStablePublisherLeaseInternalV1(freshAlpha.lease).kind).toBe(
      "registered",
    );
    expect(harness.kernel.applyStableAdmissionProposalInternalV1(retryProposal)).toMatchObject({
      kind: "stale",
      code: "surface.stable_publisher_lease_stale",
    });
    const freshRoot = rawRootV1(freshAlpha, alphaRootDefinitionIdV1);
    applyV1({ harness, publisher: freshAlpha, targets: [freshRoot] });
    expect(
      preparingEntryV1(harness, freshRoot.occurrenceId).binding.attempt.identity.allocation
        .sequence,
    )
      .toBe(7);

    expect(stateNotifications).toBe(16);
    expect(transientNotifications).toBe(0);
  });

  it("keeps 10k full reconcile cycles bounded to current state and scalar cursors", () => {
    const harness = harnessV1();
    let stateNotifications = 0;
    let transientNotifications = 0;
    harness.kernel.subscribeStateInternalV1(() => stateNotifications += 1);
    harness.kernel.subscribeTransientInternalV1(() => transientNotifications += 1);
    let previous = harness.kernel.getStateInternalV1();

    for (let index = 0; index < 10_000; index += 1) {
      const root = rawRootV1(harness.alpha, alphaRootDefinitionIdV1);
      applyV1({ harness, publisher: harness.alpha, targets: [root] });
      const prepared = harness.kernel.getStateInternalV1();
      const candidate = preparingEntryV1(harness, root.occurrenceId);
      expect(harness.kernel.settleStableReadinessFailedInternalV1(
        envelopeV1(candidate),
      )).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
      const failed = harness.kernel.getStateInternalV1();
      const failedPrivate = compareManagedSurfaceStableCompositePrivateProvenanceInternalV1(
        prepared,
        failed,
      );
      expect(failedPrivate.boundRuntimeAttempts.afterSize).toBe(0);
      expect(failedPrivate.pendingRuntimeAttempts.afterSize).toBe(0);
      expect(failedPrivate.preservedReadinessFailureGaps).toEqual({
        sameIdentity: false,
        beforeSize: 0,
        afterSize: 1,
      });

      applyV1({ harness, publisher: harness.alpha, targets: [] });
      const empty = harness.kernel.getStateInternalV1();
      const emptyPrivate = compareManagedSurfaceStableCompositePrivateProvenanceInternalV1(
        failed,
        empty,
      );
      expect(emptyPrivate.boundRuntimeAttempts.afterSize).toBe(0);
      expect(emptyPrivate.pendingRuntimeAttempts.afterSize).toBe(0);
      expect(emptyPrivate.preservedReadinessFailureGaps).toEqual({
        sameIdentity: false,
        beforeSize: 1,
        afterSize: 0,
      });
      expect(emptyPrivate.stableContributorCandidates.afterSize).toBe(0);
      expect(emptyPrivate.after).toEqual({
        installable: true,
        derivedFromPresent: false,
        derivationDepth: 0,
      });
      expect(empty.stableAcceptedBaselines).toHaveLength(2);
      expect(empty.stableRuntimeBindings).toHaveLength(0);
      expect(empty.rootReservationContributors).toHaveLength(0);
      previous = empty;
    }

    const alphaBaseline = baselineV1(harness, harness.alpha);
    expect(alphaBaseline).toMatchObject({
      kind: "accepted",
      sourceRevision: 20_000,
      targets: [],
      acceptedOccurrenceHighWater: { occurrenceSequenceHighWater: 10_000 },
    });
    expect(harness.alpha.getSnapshot()).toMatchObject({
      sourceRevisionIssuanceHighWater: 20_000,
      occurrenceIssuanceHighWater: 10_000,
      disposed: false,
    });
    expect(harness.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 2,
      currentPublisherCount: 2,
      disposed: false,
    });
    expect(previous.transientState.identitySequenceHighWater).toBe(10_000);
    expect(stateNotifications).toBe(30_000);
    expect(transientNotifications).toBe(0);
  }, 120_000);

  it("terminally clears both owners, private provenance, and captured listeners once", () => {
    let diagnostics = 0;
    const harness = harnessV1({ reportSubscriberFailure: () => diagnostics += 1 });
    const root = rawRootV1(harness.alpha, alphaRootDefinitionIdV1);
    applyV1({ harness, publisher: harness.alpha, targets: [root] });
    const candidate = preparingEntryV1(harness, root.occurrenceId);
    expect(harness.kernel.settleStableReadinessFailedInternalV1(
      envelopeV1(candidate),
    )).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
    const before = harness.kernel.getStateInternalV1();
    const trace: string[] = [];
    let nestedRepeat: ManagedSurfaceTransitionReceiptV1 | null = null;
    let terminalFence = "";

    const removedStateListener = harness.kernel.subscribeStateInternalV1(() => {
      trace.push("removed");
    });
    removedStateListener();
    harness.kernel.subscribeTransientInternalV1(() => {
      trace.push("transient");
      expect(harness.registry.getSnapshot().disposed).toBe(true);
      expect(harness.kernel.getStateInternalV1().stableAcceptedBaselines).toEqual([]);
      nestedRepeat = harness.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" });
      try {
        harness.kernel.settleStableReadinessReadyInternalV1(envelopeV1(candidate));
      } catch (error) {
        terminalFence = error instanceof Error ? error.message : "unknown";
      }
    });
    harness.kernel.subscribeStateInternalV1(() => {
      trace.push("state");
      expect(harness.registry.getSnapshot().disposed).toBe(true);
      throw new Error("aggregate terminal listener failed");
    });

    expect(harness.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }))
      .toMatchObject({
        kind: "applied",
        code: "surface.coordinator_disposed",
      });
    expect(trace).toEqual(["transient", "state"]);
    expect(nestedRepeat).toMatchObject({
      kind: "unchanged",
      code: "surface.coordinator_already_disposed",
    });
    expect(terminalFence).toBe("ui.managed_surface_coordinator_disposed");
    expect(diagnostics).toBe(1);
    const terminal = harness.kernel.getStateInternalV1();
    expect(terminal.stableAcceptedBaselines).toEqual([]);
    expect(terminal.stableRuntimeBindings).toEqual([]);
    expect(terminal.rootReservationContributors).toEqual([]);
    const privateComparison = compareManagedSurfaceStableCompositePrivateProvenanceInternalV1(
      before,
      terminal,
    );
    expect(Object.isFrozen(privateComparison.preservedReadinessFailureGaps)).toBe(true);
    expect(privateComparison.boundRuntimeAttempts).toMatchObject({
      sameIdentity: false,
      afterSize: 0,
    });
    expect(privateComparison.pendingRuntimeAttempts).toMatchObject({
      sameIdentity: false,
      afterSize: 0,
    });
    expect(privateComparison.preservedReadinessFailureGaps).toMatchObject({
      sameIdentity: false,
      beforeSize: 1,
      afterSize: 0,
    });
    expect(privateComparison.stableContributorCandidates).toMatchObject({
      sameIdentity: false,
      afterSize: 0,
    });
    expect(harness.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }))
      .toMatchObject({
        kind: "unchanged",
        code: "surface.coordinator_already_disposed",
      });
    expect(trace).toEqual(["transient", "state"]);
  });
});
