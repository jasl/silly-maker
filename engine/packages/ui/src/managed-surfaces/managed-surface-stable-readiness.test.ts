// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceInstanceIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceDefinitionIdV1,
  type ManagedSurfaceModalityV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceSlotIdV1,
  type ManagedSurfaceTargetOccurrenceIdV1,
} from "./managed-surface-contracts.ts";
import { createManagedSurfaceReducerStateV1 } from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionProposalInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "./managed-surface-stable-admission.ts";
import {
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  createManagedSurfaceStableReadyRuntimeBindingInternalV1,
  reconcileManagedSurfaceStableRootReservationsInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableCompositeStateInternalV1,
  type ManagedSurfaceStableRootReservationContributorCandidateInternalV1,
  type ManagedSurfaceStableRuntimeEntryInternalV1,
} from "./managed-surface-stable-composite-state.ts";
import type {
  ManagedSurfaceStableReadinessEnvelopeInternalV1,
  ManagedSurfaceStableReadinessResultInternalV1,
  ManagedSurfaceStableTargetInternalV1,
} from "./managed-surface-stable-contract.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(73);
const workspaceOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
const narrativeOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.narrative");

const rootSlotAV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-a");
const rootSlotBV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-b");
const blockerRootSlotV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-z-blocker");
const childSlotAV1 = parseManagedSurfaceSlotIdV1("surface-slot.child-a");
const childSlotBV1 = parseManagedSurfaceSlotIdV1("surface-slot.child-b");
const grandchildSlotV1 = parseManagedSurfaceSlotIdV1("surface-slot.grandchild-a");

const rootDefinitionAV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.root-a");
const replacementDefinitionAV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.root-a-replacement",
);
const rootDefinitionBV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.root-b");
const blockerDefinitionV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.root-z-blocker",
);
const childDefinitionAV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.child-a");
const childDefinitionBV1 = parseManagedSurfaceDefinitionIdV1("surface-definition.child-b");
const grandchildDefinitionV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.grandchild-a",
);
const layerIdV1 = parseManagedSurfaceLayerIdV1("surface-layer.stable-readiness-test");

const resolvedSlotDescriptorsV1 = Object.freeze(
  [
    Object.freeze({
      kind: "root" as const,
      slotId: rootSlotAV1,
      cardinality: "single" as const,
    }),
    Object.freeze({
      kind: "root" as const,
      slotId: rootSlotBV1,
      cardinality: "single" as const,
    }),
    Object.freeze({
      kind: "root" as const,
      slotId: blockerRootSlotV1,
      cardinality: "single" as const,
    }),
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: rootDefinitionAV1,
      slotId: childSlotAV1,
      cardinality: "stack" as const,
    }),
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: rootDefinitionBV1,
      slotId: childSlotBV1,
      cardinality: "stack" as const,
    }),
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: childDefinitionAV1,
      slotId: grandchildSlotV1,
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
  readonly modality?: ManagedSurfaceModalityV1;
}): ManagedSurfaceStableDefinitionSidecarInternalV1 {
  const definition = Object.freeze({
    definitionId: input.definitionId,
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: input.ownerId,
    slotId: input.slotId,
    layerId: layerIdV1,
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

interface ReadinessHarnessV1 {
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly workspace: ManagedSurfaceStablePublisherInternalV1;
  readonly narrative: ManagedSurfaceStablePublisherInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
}

function harnessV1(input: {
  readonly identitySequenceHighWater?: number;
  readonly workspaceRootLayerOrder?: number;
  readonly replacementLayerOrder?: number;
  readonly narrativeRootLayerOrder?: number;
} = {}): ReadinessHarnessV1 {
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: [workspaceOwnerIdV1, narrativeOwnerIdV1],
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const workspace = registry.issuePublisher(workspaceOwnerIdV1);
  const narrative = registry.issuePublisher(narrativeOwnerIdV1);
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: [
      sidecarV1({
        definitionId: rootDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotAV1,
        layerOrder: input.workspaceRootLayerOrder ?? 10,
      }),
      sidecarV1({
        definitionId: replacementDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: rootSlotAV1,
        layerOrder: input.replacementLayerOrder ?? 10,
      }),
      sidecarV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
        layerOrder: input.narrativeRootLayerOrder ?? 20,
      }),
      sidecarV1({
        definitionId: blockerDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: blockerRootSlotV1,
        layerOrder: 100,
        modality: "blocking",
      }),
      sidecarV1({
        definitionId: childDefinitionAV1,
        ownerId: workspaceOwnerIdV1,
        slotId: childSlotAV1,
        placement: "child",
        layerOrder: 30,
      }),
      sidecarV1({
        definitionId: childDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: childSlotBV1,
        placement: "child",
        layerOrder: 40,
      }),
      sidecarV1({
        definitionId: grandchildDefinitionV1,
        ownerId: workspaceOwnerIdV1,
        slotId: grandchildSlotV1,
        placement: "child",
        layerOrder: 50,
      }),
    ],
    resolvedSlotDescriptors: resolvedSlotDescriptorsV1,
  });
  const baseTransientState = createManagedSurfaceReducerStateV1(
    applicationEpochV1,
    [workspaceOwnerIdV1, narrativeOwnerIdV1],
    resolvedSlotDescriptorsV1,
  );
  const initialTransientState = input.identitySequenceHighWater === undefined
    ? baseTransientState
    : Object.freeze({
      ...baseTransientState,
      identitySequenceHighWater: parseNonNegativeSafeInteger(input.identitySequenceHighWater),
    });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: authority,
    publisherLeaseRegistry: registry,
    initialTransientState,
  });
  expect(kernel.registerStablePublisherLeaseInternalV1(workspace.lease).kind).toBe("registered");
  expect(kernel.registerStablePublisherLeaseInternalV1(narrative.lease).kind).toBe("registered");
  return { registry, authority, workspace, narrative, kernel };
}

function rawRootV1(
  publisher: ManagedSurfaceStablePublisherInternalV1,
  definitionId: ManagedSurfaceDefinitionIdV1 = rootDefinitionAV1,
): ManagedSurfaceStableTargetInternalV1 {
  return Object.freeze({
    occurrenceId: publisher.issueOccurrence(),
    definitionId,
    parentOccurrenceId: null,
    parameters: null,
  });
}

function rawChildV1(input: {
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly parentOccurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
  readonly definitionId?: ManagedSurfaceDefinitionIdV1;
}): ManagedSurfaceStableTargetInternalV1 {
  return Object.freeze({
    occurrenceId: input.publisher.issueOccurrence(),
    definitionId: input.definitionId ?? childDefinitionAV1,
    parentOccurrenceId: input.parentOccurrenceId,
    parameters: null,
  });
}

function capturedContextV1(
  harness: ReadinessHarnessV1,
  publisher: ManagedSurfaceStablePublisherInternalV1,
): {
  readonly acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
  readonly reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
} {
  const context = harness.kernel.captureAdmissionContextInternalV1(publisher.lease);
  if (context.kind !== "captured") throw new Error(`expected captured, got ${context.kind}`);
  return context;
}

function admitV1(input: {
  readonly harness: ReadinessHarnessV1;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly targets: readonly ManagedSurfaceStableTargetInternalV1[];
}): ManagedSurfaceStableAdmissionProposalInternalV1 {
  const context = capturedContextV1(input.harness, input.publisher);
  const result = input.harness.authority.evaluate({
    publication: Object.freeze({
      publisherLease: input.publisher.lease,
      sourceRevision: input.publisher.issueSourceRevision(),
      targets: input.targets,
    }),
    acceptedBaseline: context.acceptedBaseline,
    reservationSnapshot: context.reservationSnapshot,
  });
  if (result.kind !== "admitted") {
    throw new Error(`expected admitted, got ${result.kind}:${result.code}`);
  }
  return result.proposal;
}

function applyV1(input: {
  readonly harness: ReadinessHarnessV1;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
  readonly targets: readonly ManagedSurfaceStableTargetInternalV1[];
}): ManagedSurfaceStableAdmissionProposalInternalV1 {
  const proposal = admitV1(input);
  expect(input.harness.kernel.applyStableAdmissionProposalInternalV1(proposal)).toMatchObject({
    kind: "applied",
    code: "surface.stable_publication_applied",
  });
  return proposal;
}

function contributorCandidatesV1(
  entries: readonly ManagedSurfaceStableRuntimeEntryInternalV1[],
): readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[] {
  return Object.freeze(entries.flatMap((entry) => [
    Object.freeze({ kind: "stable_desired" as const, desiredTarget: entry.desiredTarget }),
    Object.freeze({
      kind: "stable_runtime" as const,
      desiredTarget: entry.desiredTarget,
      binding: entry.binding,
    }),
  ]));
}

function installStateV1(
  kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  current: ManagedSurfaceStableCompositeStateInternalV1,
  next: ManagedSurfaceStableCompositeStateInternalV1,
): void {
  const prepared = kernel.prepareStateInstallInternalV1(current, next);
  expect(kernel.commitPreparedStateInstallInternalV1(prepared, () => true)).toBe("installed");
}

function installReadyOccurrenceV1(input: {
  readonly harness: ReadinessHarnessV1;
  readonly occurrenceId: ManagedSurfaceTargetOccurrenceIdV1;
  readonly phase: "active" | "suspended";
}): ManagedSurfaceStableCompositeStateInternalV1 {
  const current = input.harness.kernel.getStateInternalV1();
  const target = current.stableRuntimeBindings.find((entry) =>
    entry.desiredTarget.admittedTarget.occurrenceId === input.occurrenceId
  );
  if (target?.binding.kind !== "preparing") throw new Error("expected preparation");
  const ready = createManagedSurfaceStableReadyRuntimeBindingInternalV1({
    attempt: target.binding.attempt,
    phase: input.phase,
  });
  const entries = current.stableRuntimeBindings.map((entry) =>
    entry === target ? Object.freeze({ ...entry, binding: ready }) : entry
  );
  const next = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: current,
    contributorCandidates: contributorCandidatesV1(entries),
  });
  installStateV1(input.harness.kernel, current, next);
  return input.harness.kernel.getStateInternalV1();
}

function preparingEntryV1(
  harness: ReadinessHarnessV1,
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
  harness: ReadinessHarnessV1,
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

function openReadyTransientRootV1(
  harness: ReadinessHarnessV1,
  definition: ManagedSurfaceResolvedDefinitionV1,
) {
  const candidate = harness.kernel.peekTransientCandidateInternalV1({
    definition,
    semanticOccurrenceId: null,
  });
  expect(harness.kernel.transitionTransientInternalV1({
    kind: "prepare_initial",
    applicationEpoch: applicationEpochV1,
    candidate,
  })).toMatchObject({
    kind: "applied",
    code: "surface.preparation_started",
    surfaceInstanceId: candidate.surfaceInstanceId,
  });
  expect(harness.kernel.transitionTransientInternalV1({
    kind: "readiness_ready",
    evidence: Object.freeze({
      applicationEpoch: applicationEpochV1,
      surfaceInstanceId: candidate.surfaceInstanceId,
    }),
  })).toMatchObject({
    kind: "applied",
    code: "surface.readiness_ready",
  });
  return candidate;
}

const zeroDeltaV1 = Object.freeze({
  source: "unchanged" as const,
  runtime: "unchanged" as const,
  notificationCount: 0 as const,
  topology: "unchanged" as const,
  runtimeAllocation: "zero" as const,
});

function staleResultV1(
  code: "surface.stale_application_epoch" | "surface.stale_readiness",
): ManagedSurfaceStableReadinessResultInternalV1 {
  return Object.freeze({ kind: "stale" as const, code, delta: zeroDeltaV1 });
}

function appliedResultV1(
  code: "surface.readiness_ready" | "surface.readiness_failed",
  runtimeAllocation: "zero" | "preparation_count",
): ManagedSurfaceStableReadinessResultInternalV1 {
  return Object.freeze({
    kind: "applied" as const,
    code,
    delta: Object.freeze({
      source: "unchanged" as const,
      runtime: "settle_readiness" as const,
      notificationCount: 1 as const,
      topology: "readiness_policy_derived" as const,
      runtimeAllocation,
    }),
  });
}

describe("dormant stable readiness settlement", () => {
  it("exposes two exact source-relative methods with the dedicated closed result", () => {
    expectTypeOf<
      Parameters<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
          "settleStableReadinessReadyInternalV1"
        ]
      >[0]
    >().toEqualTypeOf<ManagedSurfaceStableReadinessEnvelopeInternalV1>();
    expectTypeOf<
      ReturnType<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
          "settleStableReadinessReadyInternalV1"
        ]
      >
    >().toEqualTypeOf<ManagedSurfaceStableReadinessResultInternalV1>();
    expectTypeOf<
      Parameters<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
          "settleStableReadinessFailedInternalV1"
        ]
      >[0]
    >().toEqualTypeOf<ManagedSurfaceStableReadinessEnvelopeInternalV1>();
    expectTypeOf<
      ReturnType<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1[
          "settleStableReadinessFailedInternalV1"
        ]
      >
    >().toEqualTypeOf<ManagedSurfaceStableReadinessResultInternalV1>();
  });

  it("fences terminal and reentrant calls before reading any envelope field", () => {
    const terminalHarness = harnessV1();
    expect(terminalHarness.kernel.transitionTransientInternalV1({
      kind: "dispose_coordinator",
    })).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });
    let terminalReads = 0;
    const terminalEnvelope = new Proxy({}, {
      get() {
        terminalReads += 1;
        throw new Error("terminal envelope touched");
      },
    }) as ManagedSurfaceStableReadinessEnvelopeInternalV1;
    expect(() => terminalHarness.kernel.settleStableReadinessReadyInternalV1(terminalEnvelope))
      .toThrowError("ui.managed_surface_coordinator_disposed");
    expect(terminalReads).toBe(0);

    const reentrantHarness = harnessV1();
    let reentrantReads = 0;
    const reentrantEnvelope = new Proxy({}, {
      get() {
        reentrantReads += 1;
        throw new Error("reentrant envelope touched");
      },
    }) as ManagedSurfaceStableReadinessEnvelopeInternalV1;
    let reentrantError: unknown = null;
    reentrantHarness.kernel.transitionStateInternalV1((state) => {
      try {
        reentrantHarness.kernel.settleStableReadinessFailedInternalV1(reentrantEnvelope);
      } catch (error) {
        reentrantError = error;
      }
      return Object.freeze({ state, result: null });
    });
    expect(reentrantError).toBeInstanceOf(TypeError);
    expect((reentrantError as TypeError).message).toBe(
      "ui.managed_surface_runtime_transition_in_progress",
    );
    expect(reentrantReads).toBe(0);
  });

  it("checks epoch, candidate, publisher lease, then source revision without touching later fences", () => {
    const harness = harnessV1();
    const root = rawRootV1(harness.workspace);
    applyV1({ harness, publisher: harness.workspace, targets: [root] });
    const entry = preparingEntryV1(harness, root.occurrenceId);

    const calls = { surface: 0, lease: 0, source: 0 };
    const wrongEpoch = {
      readinessEvidence: {
        get applicationEpoch() {
          return parseNonNegativeSafeInteger(applicationEpochV1 + 1);
        },
        get surfaceInstanceId() {
          calls.surface += 1;
          return entry.binding.attempt.identity.surfaceInstanceId;
        },
      },
      get publisherLease() {
        calls.lease += 1;
        return harness.workspace.lease;
      },
      get sourceRevision() {
        calls.source += 1;
        return entry.desiredTarget.sourceRevision;
      },
    } as ManagedSurfaceStableReadinessEnvelopeInternalV1;
    expect(harness.kernel.settleStableReadinessReadyInternalV1(wrongEpoch)).toEqual(
      staleResultV1("surface.stale_application_epoch"),
    );
    expect(calls).toEqual({ surface: 0, lease: 0, source: 0 });

    const wrongCandidate = {
      readinessEvidence: {
        applicationEpoch: applicationEpochV1,
        surfaceInstanceId: parseManagedSurfaceInstanceIdV1("surface-instance.e73.n999"),
      },
      get publisherLease() {
        calls.lease += 1;
        return harness.workspace.lease;
      },
      get sourceRevision() {
        calls.source += 1;
        return entry.desiredTarget.sourceRevision;
      },
    } as ManagedSurfaceStableReadinessEnvelopeInternalV1;
    expect(harness.kernel.settleStableReadinessReadyInternalV1(wrongCandidate)).toEqual(
      staleResultV1("surface.stale_readiness"),
    );
    expect(calls).toEqual({ surface: 0, lease: 0, source: 0 });

    const wrongLease = {
      readinessEvidence: envelopeV1(harness, entry).readinessEvidence,
      get publisherLease() {
        calls.lease += 1;
        return harness.narrative.lease;
      },
      get sourceRevision() {
        calls.source += 1;
        return entry.desiredTarget.sourceRevision;
      },
    } as ManagedSurfaceStableReadinessEnvelopeInternalV1;
    expect(harness.kernel.settleStableReadinessReadyInternalV1(wrongLease)).toEqual(
      staleResultV1("surface.stale_readiness"),
    );
    expect(calls).toEqual({ surface: 0, lease: 1, source: 0 });

    const wrongSource = {
      readinessEvidence: envelopeV1(harness, entry).readinessEvidence,
      get publisherLease() {
        calls.lease += 1;
        return harness.workspace.lease;
      },
      get sourceRevision() {
        calls.source += 1;
        return harness.workspace.issueSourceRevision();
      },
    } as ManagedSurfaceStableReadinessEnvelopeInternalV1;
    expect(harness.kernel.settleStableReadinessReadyInternalV1(wrongSource)).toEqual(
      staleResultV1("surface.stale_readiness"),
    );
    expect(calls).toEqual({ surface: 0, lease: 2, source: 1 });
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toHaveLength(1);
  });

  it("settles initial ready and failed candidates once with exact attempt identity", () => {
    for (const outcome of ["ready", "failed"] as const) {
      const harness = harnessV1();
      const root = rawRootV1(harness.workspace);
      applyV1({ harness, publisher: harness.workspace, targets: [root] });
      const before = preparingEntryV1(harness, root.occurrenceId);
      const envelope = envelopeV1(harness, before);
      const stateListener = vi.fn();
      const transientListener = vi.fn();
      harness.kernel.subscribeStateInternalV1(stateListener);
      harness.kernel.subscribeTransientInternalV1(transientListener);

      const result = outcome === "ready"
        ? harness.kernel.settleStableReadinessReadyInternalV1(envelope)
        : harness.kernel.settleStableReadinessFailedInternalV1(envelope);
      expect(result).toEqual(appliedResultV1(
        outcome === "ready" ? "surface.readiness_ready" : "surface.readiness_failed",
        "zero",
      ));
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.delta)).toBe(true);
      const after = harness.kernel.getStateInternalV1().stableRuntimeBindings[0];
      if (outcome === "ready") {
        expect(after?.binding.kind).toBe("ready_instance");
        if (after?.binding.kind === "ready_instance") {
          expect(after.binding.instance.attempt).toBe(before.binding.attempt);
          expect(after.binding.instance.phase).toBe("active");
        }
      } else {
        expect(after?.binding).toEqual({
          kind: "gap",
          reason: "readiness_failed",
          retainedSubtree: null,
        });
      }
      expect(stateListener).toHaveBeenCalledTimes(1);
      expect(transientListener).not.toHaveBeenCalled();

      const repeat = outcome === "ready"
        ? harness.kernel.settleStableReadinessReadyInternalV1(envelope)
        : harness.kernel.settleStableReadinessFailedInternalV1(envelope);
      expect(repeat).toEqual(staleResultV1("surface.stale_readiness"));
      expect(stateListener).toHaveBeenCalledTimes(1);
      expect(transientListener).not.toHaveBeenCalled();
    }
  });

  it("preserves the exact retained subtree on replacement failure and retires it on ready", () => {
    for (const outcome of ["failed", "ready"] as const) {
      const harness = harnessV1();
      const predecessor = rawRootV1(harness.workspace);
      applyV1({ harness, publisher: harness.workspace, targets: [predecessor] });
      const predecessorState = installReadyOccurrenceV1({
        harness,
        occurrenceId: predecessor.occurrenceId,
        phase: "active",
      });
      const predecessorInstance = predecessorState.stableRuntimeBindings[0];
      if (predecessorInstance?.binding.kind !== "ready_instance") {
        throw new Error("expected predecessor ready instance");
      }

      const replacement = rawRootV1(harness.workspace, replacementDefinitionAV1);
      applyV1({ harness, publisher: harness.workspace, targets: [replacement] });
      const candidate = preparingEntryV1(harness, replacement.occurrenceId);
      expect(candidate.binding.transition).toBe("primary_replacement");
      const retainedSubtree = candidate.binding.retainedSubtree;
      expect(retainedSubtree?.root).toBe(predecessorInstance.binding.instance);
      const envelope = envelopeV1(harness, candidate);

      const result = outcome === "ready"
        ? harness.kernel.settleStableReadinessReadyInternalV1(envelope)
        : harness.kernel.settleStableReadinessFailedInternalV1(envelope);
      expect(result).toEqual(appliedResultV1(
        outcome === "ready" ? "surface.readiness_ready" : "surface.readiness_failed",
        "zero",
      ));
      const after = harness.kernel.getStateInternalV1().stableRuntimeBindings[0];
      if (outcome === "failed") {
        expect(after?.binding.kind).toBe("gap");
        if (after?.binding.kind === "gap") {
          expect(after.binding.reason).toBe("readiness_failed");
          expect(after.binding.retainedSubtree).toBe(retainedSubtree);
        }
      } else {
        expect(after?.binding.kind).toBe("ready_instance");
        if (after?.binding.kind === "ready_instance") {
          expect(after.binding.instance.attempt).toBe(candidate.binding.attempt);
        }
        expect("retainedSubtree" in (after?.binding ?? {})).toBe(false);
      }
    }
  });

  it("atomically starts only direct children and accepts a blocking child suspending its parent", () => {
    const harness = harnessV1();
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1({
      publisher: harness.workspace,
      parentOccurrenceId: root.occurrenceId,
    });
    const grandchild = rawChildV1({
      publisher: harness.workspace,
      parentOccurrenceId: child.occurrenceId,
      definitionId: grandchildDefinitionV1,
    });
    applyV1({ harness, publisher: harness.workspace, targets: [root, child, grandchild] });
    const rootCandidate = preparingEntryV1(harness, root.occurrenceId);
    const beforeHighWater = harness.kernel.getTransientStateInternalV1().identitySequenceHighWater;

    expect(harness.kernel.settleStableReadinessReadyInternalV1(
      envelopeV1(harness, rootCandidate),
    )).toEqual(appliedResultV1("surface.readiness_ready", "preparation_count"));

    const after = harness.kernel.getStateInternalV1();
    const rootEntry = after.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === root.occurrenceId
    );
    const childEntry = after.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === child.occurrenceId
    );
    const grandchildEntry = after.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === grandchild.occurrenceId
    );
    expect(rootEntry?.binding.kind).toBe("ready_instance");
    expect(childEntry?.binding.kind).toBe("preparing");
    expect(grandchildEntry?.binding).toEqual({
      kind: "gap",
      reason: "parent_unavailable",
      retainedSubtree: null,
    });
    if (rootEntry?.binding.kind === "ready_instance" && childEntry?.binding.kind === "preparing") {
      expect(rootEntry.binding.instance.phase).toBe("suspended");
      expect(childEntry.binding.attempt.parentInstanceId).toBe(
        rootEntry.binding.instance.attempt.identity.surfaceInstanceId,
      );
      expect(childEntry.binding.attempt.identity.allocation.sequence).toBe(beforeHighWater + 1);
    }
    expect(after.transientState.identitySequenceHighWater).toBe(beforeHighWater + 1);
  });

  it("retires a failed blocking child once and preserves its exact gap across unrelated reflow", () => {
    const harness = harnessV1();
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1({
      publisher: harness.workspace,
      parentOccurrenceId: root.occurrenceId,
    });
    applyV1({ harness, publisher: harness.workspace, targets: [root, child] });
    const rootCandidate = preparingEntryV1(harness, root.occurrenceId);
    expect(harness.kernel.settleStableReadinessReadyInternalV1(
      envelopeV1(harness, rootCandidate),
    )).toEqual(appliedResultV1("surface.readiness_ready", "preparation_count"));

    const before = harness.kernel.getStateInternalV1();
    const rootBefore = before.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === root.occurrenceId
    );
    const childCandidate = preparingEntryV1(harness, child.occurrenceId);
    if (rootBefore?.binding.kind !== "ready_instance") {
      throw new Error("expected suspended ready parent");
    }
    expect(rootBefore.binding.instance.phase).toBe("suspended");
    expect(childCandidate.binding.attempt.parentInstanceId).toBe(
      rootBefore.binding.instance.attempt.identity.surfaceInstanceId,
    );
    const childEnvelope = envelopeV1(harness, childCandidate);
    const beforeHighWater = before.transientState.identitySequenceHighWater;
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(stateListener);
    harness.kernel.subscribeTransientInternalV1(transientListener);

    expect(harness.kernel.settleStableReadinessFailedInternalV1(childEnvelope)).toEqual(
      appliedResultV1("surface.readiness_failed", "zero"),
    );
    const after = harness.kernel.getStateInternalV1();
    const rootAfter = after.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === root.occurrenceId
    );
    const childAfter = after.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === child.occurrenceId
    );
    expect(rootAfter?.binding.kind).toBe("ready_instance");
    if (rootAfter?.binding.kind !== "ready_instance") throw new Error("expected ready parent");
    expect(rootAfter.binding.instance.attempt).toBe(rootBefore.binding.instance.attempt);
    expect(rootAfter.binding.instance.phase).toBe("active");
    expect(childAfter?.binding).toEqual({
      kind: "gap",
      reason: "readiness_failed",
      retainedSubtree: null,
    });
    expect(after.transientState.identitySequenceHighWater).toBe(beforeHighWater);
    expect(stateListener).toHaveBeenCalledTimes(1);
    expect(transientListener).not.toHaveBeenCalled();

    expect(harness.kernel.settleStableReadinessFailedInternalV1(childEnvelope)).toEqual(
      staleResultV1("surface.stale_readiness"),
    );
    expect(harness.kernel.getStateInternalV1()).toBe(after);
    expect(stateListener).toHaveBeenCalledTimes(1);
    expect(transientListener).not.toHaveBeenCalled();

    const narrativeRoot = rawRootV1(harness.narrative, rootDefinitionBV1);
    applyV1({ harness, publisher: harness.narrative, targets: [narrativeRoot] });
    const reflowed = harness.kernel.getStateInternalV1();
    const reflowedRoot = reflowed.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === root.occurrenceId
    );
    const reflowedChild = reflowed.stableRuntimeBindings.find((entry) =>
      entry.desiredTarget.admittedTarget.occurrenceId === child.occurrenceId
    );
    expect(reflowedRoot?.binding.kind).toBe("ready_instance");
    if (reflowedRoot?.binding.kind === "ready_instance") {
      expect(reflowedRoot.binding.instance.phase).toBe("suspended");
    }
    expect(reflowedChild?.binding).toBe(childAfter?.binding);
  });

  it("publishes one complete mixed-axis successor when stable ready reactivates transient runtime", () => {
    const harness = harnessV1();
    const transient = openReadyTransientRootV1(
      harness,
      sidecarV1({
        definitionId: rootDefinitionBV1,
        ownerId: narrativeOwnerIdV1,
        slotId: rootSlotBV1,
        layerOrder: 5,
      }).definition,
    );
    const root = rawRootV1(harness.workspace);
    applyV1({ harness, publisher: harness.workspace, targets: [root] });
    const rootCandidate = preparingEntryV1(harness, root.occurrenceId);
    const before = harness.kernel.getStateInternalV1();
    const beforePublication = before.transientState.publication;
    expect(beforePublication.orderedInstances).toHaveLength(1);
    expect(beforePublication.orderedInstances[0]?.surfaceInstanceId).toBe(
      transient.surfaceInstanceId,
    );
    expect(beforePublication.orderedInstances[0]?.phase).toBe("suspended");
    const beforeHighWater = before.transientState.identitySequenceHighWater;
    const notificationOrder: string[] = [];
    const observedStates: ManagedSurfaceStableCompositeStateInternalV1[] = [];
    harness.kernel.subscribeTransientInternalV1(() => {
      notificationOrder.push("transient");
      observedStates.push(harness.kernel.getStateInternalV1());
    });
    harness.kernel.subscribeStateInternalV1(() => {
      notificationOrder.push("state");
      observedStates.push(harness.kernel.getStateInternalV1());
    });

    expect(harness.kernel.settleStableReadinessReadyInternalV1(
      envelopeV1(harness, rootCandidate),
    )).toEqual(appliedResultV1("surface.readiness_ready", "zero"));
    const after = harness.kernel.getStateInternalV1();
    const afterPublication = after.transientState.publication;
    expect(afterPublication).not.toBe(beforePublication);
    expect(afterPublication.publicationRevision).toBe(beforePublication.publicationRevision + 1);
    expect(afterPublication.topologyRevision).toBe(beforePublication.topologyRevision + 1);
    expect(afterPublication.orderedInstances[0]?.surfaceInstanceId).toBe(
      transient.surfaceInstanceId,
    );
    expect(afterPublication.orderedInstances[0]?.phase).toBe("active");
    expect(after.transientState.identitySequenceHighWater).toBe(beforeHighWater);
    expect(after.stableRuntimeBindings[0]?.binding.kind).toBe("ready_instance");
    expect(notificationOrder).toEqual(["transient", "state"]);
    expect(observedStates).toEqual([after, after]);
    expect(observedStates[0]?.transientState.publication).toBe(afterPublication);
    expect(observedStates[1]?.stableRuntimeBindings).toBe(after.stableRuntimeBindings);
  });

  it("atomically cascades a stable child on transient close or rolls the close back at capacity", () => {
    for (const exhausted of [false, true] as const) {
      const harness = harnessV1({
        ...(exhausted ? { identitySequenceHighWater: Number.MAX_SAFE_INTEGER - 2 } : {}),
      });
      const transient = openReadyTransientRootV1(
        harness,
        sidecarV1({
          definitionId: blockerDefinitionV1,
          ownerId: workspaceOwnerIdV1,
          slotId: blockerRootSlotV1,
          layerOrder: 100,
          modality: "blocking",
        }).definition,
      );
      const root = rawRootV1(harness.workspace);
      const child = rawChildV1({
        publisher: harness.workspace,
        parentOccurrenceId: root.occurrenceId,
      });
      applyV1({ harness, publisher: harness.workspace, targets: [root, child] });
      const rootCandidate = preparingEntryV1(harness, root.occurrenceId);
      expect(harness.kernel.settleStableReadinessReadyInternalV1(
        envelopeV1(harness, rootCandidate),
      )).toEqual(appliedResultV1("surface.readiness_ready", "zero"));
      const before = harness.kernel.getStateInternalV1();
      const rootBefore = before.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget.occurrenceId === root.occurrenceId
      );
      const childBefore = before.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget.occurrenceId === child.occurrenceId
      );
      expect(rootBefore?.binding).toMatchObject({
        kind: "ready_instance",
        instance: { phase: "suspended" },
      });
      expect(childBefore?.binding).toEqual({
        kind: "gap",
        reason: "parent_unavailable",
        retainedSubtree: null,
      });
      const beforePublication = before.transientState.publication;
      const beforeHighWater = before.transientState.identitySequenceHighWater;
      const notifications: string[] = [];
      harness.kernel.subscribeTransientInternalV1(() => notifications.push("transient"));
      harness.kernel.subscribeStateInternalV1(() => notifications.push("state"));

      const receipt = harness.kernel.transitionTransientInternalV1({
        kind: "close_expected",
        evidence: Object.freeze({
          applicationEpoch: applicationEpochV1,
          topologyRevision: beforePublication.topologyRevision,
          surfaceInstanceId: transient.surfaceInstanceId,
        }),
      });
      if (exhausted) {
        expect(receipt).toEqual({
          kind: "faulted",
          code: "surface.transition_faulted",
          beforeTopologyRevision: beforePublication.topologyRevision,
          afterTopologyRevision: beforePublication.topologyRevision,
        });
        expect(harness.kernel.getStateInternalV1()).toBe(before);
        expect(before.transientState.identitySequenceHighWater).toBe(Number.MAX_SAFE_INTEGER);
        expect(notifications).toEqual([]);
        continue;
      }

      expect(receipt).toMatchObject({ kind: "applied", code: "surface.closed" });
      const after = harness.kernel.getStateInternalV1();
      const rootAfter = after.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget.occurrenceId === root.occurrenceId
      );
      const childAfter = after.stableRuntimeBindings.find((entry) =>
        entry.desiredTarget.admittedTarget.occurrenceId === child.occurrenceId
      );
      expect(after.transientState.publication.orderedInstances).toEqual([]);
      expect(after.transientState.identitySequenceHighWater).toBe(beforeHighWater + 1);
      expect(rootAfter?.binding).toMatchObject({
        kind: "ready_instance",
        instance: { phase: "suspended" },
      });
      expect(childAfter?.binding).toMatchObject({
        kind: "preparing",
        transition: "child_open",
      });
      if (
        rootAfter?.binding.kind === "ready_instance" && childAfter?.binding.kind === "preparing"
      ) {
        expect(childAfter.binding.attempt.parentInstanceId).toBe(
          rootAfter.binding.instance.attempt.identity.surfaceInstanceId,
        );
        expect(childAfter.binding.attempt.identity.allocation.sequence).toBe(beforeHighWater + 1);
      }
      expect(notifications).toEqual(["transient", "state"]);
    }
  });

  it("fails the whole ready transition at shared capacity without settling the candidate", () => {
    const harness = harnessV1({ identitySequenceHighWater: Number.MAX_SAFE_INTEGER - 1 });
    const root = rawRootV1(harness.workspace);
    const child = rawChildV1({
      publisher: harness.workspace,
      parentOccurrenceId: root.occurrenceId,
    });
    applyV1({ harness, publisher: harness.workspace, targets: [root, child] });
    const candidate = preparingEntryV1(harness, root.occurrenceId);
    const envelope = envelopeV1(harness, candidate);
    const before = harness.kernel.getStateInternalV1();
    const beforeToken = before.rootReservationGenerationToken;
    const beforeRuntime = before.stableRuntimeBindings;
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(stateListener);
    harness.kernel.subscribeTransientInternalV1(transientListener);

    expect(harness.kernel.settleStableReadinessReadyInternalV1(envelope)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
      delta: zeroDeltaV1,
    });
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(before.stableRuntimeBindings).toBe(beforeRuntime);
    expect(before.rootReservationGenerationToken).toBe(beforeToken);
    expect(before.transientState.identitySequenceHighWater).toBe(Number.MAX_SAFE_INTEGER);
    expect(preparingEntryV1(harness, root.occurrenceId).binding.attempt).toBe(
      candidate.binding.attempt,
    );
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("fails closed before installing an unordered equal-layer cross-publisher topology", () => {
    const harness = harnessV1({ narrativeRootLayerOrder: 10 });
    const workspaceParent = rawRootV1(harness.workspace, rootDefinitionAV1);
    const narrativeParent = rawRootV1(harness.narrative, rootDefinitionBV1);
    applyV1({ harness, publisher: harness.workspace, targets: [workspaceParent] });
    installReadyOccurrenceV1({
      harness,
      occurrenceId: workspaceParent.occurrenceId,
      phase: "active",
    });
    const proposal = admitV1({
      harness,
      publisher: harness.narrative,
      targets: [narrativeParent],
    });
    const before = harness.kernel.getStateInternalV1();
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    harness.kernel.subscribeStateInternalV1(stateListener);
    harness.kernel.subscribeTransientInternalV1(transientListener);

    expect(harness.kernel.applyStableAdmissionProposalInternalV1(proposal)).toEqual({
      kind: "faulted",
      code: "surface.stable_reconcile_faulted",
      delta: zeroDeltaV1,
    });
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(stateListener).not.toHaveBeenCalled();
    expect(transientListener).not.toHaveBeenCalled();
  });

  it("faults only the ready cutover that exposes a hidden equal-layer replacement", () => {
    for (const outcome of ["ready", "failed"] as const) {
      const harness = harnessV1({
        workspaceRootLayerOrder: 9,
        replacementLayerOrder: 10,
        narrativeRootLayerOrder: 10,
      });
      const predecessor = rawRootV1(harness.workspace, rootDefinitionAV1);
      applyV1({ harness, publisher: harness.workspace, targets: [predecessor] });
      installReadyOccurrenceV1({
        harness,
        occurrenceId: predecessor.occurrenceId,
        phase: "active",
      });
      const narrative = rawRootV1(harness.narrative, rootDefinitionBV1);
      applyV1({ harness, publisher: harness.narrative, targets: [narrative] });
      installReadyOccurrenceV1({
        harness,
        occurrenceId: narrative.occurrenceId,
        phase: "active",
      });
      const replacement = rawRootV1(harness.workspace, replacementDefinitionAV1);
      applyV1({ harness, publisher: harness.workspace, targets: [replacement] });
      const candidate = preparingEntryV1(harness, replacement.occurrenceId);
      const retainedSubtree = candidate.binding.retainedSubtree;
      expect(retainedSubtree).not.toBeNull();
      const before = harness.kernel.getStateInternalV1();

      const result = outcome === "ready"
        ? harness.kernel.settleStableReadinessReadyInternalV1(envelopeV1(harness, candidate))
        : harness.kernel.settleStableReadinessFailedInternalV1(envelopeV1(harness, candidate));
      if (outcome === "ready") {
        expect(result).toEqual({
          kind: "faulted",
          code: "surface.stable_reconcile_faulted",
          delta: zeroDeltaV1,
        });
        expect(harness.kernel.getStateInternalV1()).toBe(before);
      } else {
        expect(result).toEqual(appliedResultV1("surface.readiness_failed", "zero"));
        const binding = harness.kernel.getStateInternalV1().stableRuntimeBindings.find((entry) =>
          entry.desiredTarget.admittedTarget.occurrenceId === replacement.occurrenceId
        )?.binding;
        expect(binding).toEqual({
          kind: "gap",
          reason: "readiness_failed",
          retainedSubtree,
        });
      }
    }
  });

  it("allocates a cross-owner batch above 64 in canonical contiguous shared sequence order", () => {
    const harness = harnessV1();
    const blocker = rawRootV1(harness.workspace, blockerDefinitionV1);
    const workspaceParent = rawRootV1(harness.workspace, rootDefinitionAV1);
    const workspaceChildren = Object.freeze(
      Array.from({ length: 33 }, () =>
        rawChildV1({
          publisher: harness.workspace,
          parentOccurrenceId: workspaceParent.occurrenceId,
        })),
    );
    const narrativeParent = rawRootV1(harness.narrative, rootDefinitionBV1);
    const narrativeChildren = Object.freeze(
      Array.from({ length: 32 }, () =>
        rawChildV1({
          publisher: harness.narrative,
          parentOccurrenceId: narrativeParent.occurrenceId,
          definitionId: childDefinitionBV1,
        })),
    );
    applyV1({
      harness,
      publisher: harness.workspace,
      targets: [workspaceParent, ...workspaceChildren, blocker],
    });
    installReadyOccurrenceV1({
      harness,
      occurrenceId: workspaceParent.occurrenceId,
      phase: "suspended",
    });
    applyV1({
      harness,
      publisher: harness.narrative,
      targets: [narrativeParent, ...narrativeChildren],
    });
    installReadyOccurrenceV1({
      harness,
      occurrenceId: narrativeParent.occurrenceId,
      phase: "suspended",
    });
    const blockerCandidate = preparingEntryV1(harness, blocker.occurrenceId);
    const beforeHighWater = harness.kernel.getTransientStateInternalV1().identitySequenceHighWater;
    const stateListener = vi.fn();
    const transientListener = vi.fn();
    let nested: ManagedSurfaceStableReadinessResultInternalV1 | null = null;
    const envelope = envelopeV1(harness, blockerCandidate);
    harness.kernel.subscribeTransientInternalV1(transientListener);
    harness.kernel.subscribeStateInternalV1(() => {
      expect(
        harness.kernel.getStateInternalV1().stableRuntimeBindings.filter((entry) =>
          entry.binding.kind === "preparing" &&
          entry.desiredTarget.admittedTarget.stackScope.kind === "child"
        ),
      ).toHaveLength(65);
      nested = harness.kernel.settleStableReadinessFailedInternalV1(envelope);
      stateListener();
    });

    expect(harness.kernel.settleStableReadinessFailedInternalV1(envelope)).toEqual(
      appliedResultV1("surface.readiness_failed", "preparation_count"),
    );
    const after = harness.kernel.getStateInternalV1();
    const sequenceByOccurrence = new Map(
      after.stableRuntimeBindings.flatMap((entry) =>
        entry.binding.kind === "preparing"
          ? [
            [
              entry.desiredTarget.admittedTarget.occurrenceId,
              entry.binding.attempt.identity.allocation.sequence,
            ] as const,
          ]
          : []
      ),
    );
    const expectedChildren = [...workspaceChildren, ...narrativeChildren];
    expect(expectedChildren.map((target) => sequenceByOccurrence.get(target.occurrenceId))).toEqual(
      Array.from({ length: 65 }, (_value, index) => beforeHighWater + index + 1),
    );
    expect(after.transientState.identitySequenceHighWater).toBe(beforeHighWater + 65);
    expect(stateListener).toHaveBeenCalledTimes(1);
    expect(transientListener).not.toHaveBeenCalled();
    expect(nested).toEqual(staleResultV1("surface.stale_readiness"));
  });
});
