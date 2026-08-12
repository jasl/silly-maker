// SPDX-License-Identifier: MIT
import {
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type RuntimeSchemaV1,
} from "@sillymaker/base";

import {
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { createManagedSurfaceReducerStateV1 } from "../managed-surfaces/managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
} from "../managed-surfaces/managed-surface-stable-admission.ts";
import {
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import type {
  ManagedSurfaceStableDeltaInternalV1,
  ManagedSurfaceStableTargetInternalV1,
} from "../managed-surfaces/managed-surface-stable-contract.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";

export const managedSurfaceLifecycleTargetCountsV1 = Object.freeze([1, 4, 16] as const);
export type ManagedSurfaceLifecycleTargetCountV1 =
  (typeof managedSurfaceLifecycleTargetCountsV1)[number];

export const managedSurfaceLifecycleParameterClassesV1 = Object.freeze(
  ["small", "medium"] as const,
);
export type ManagedSurfaceLifecycleParameterClassV1 =
  (typeof managedSurfaceLifecycleParameterClassesV1)[number];

export const managedSurfaceLifecycleScenarioClassesV1 = Object.freeze(
  ["initial", "equal_noop", "one_change", "all_change", "empty"] as const,
);
export type ManagedSurfaceLifecycleScenarioClassV1 =
  (typeof managedSurfaceLifecycleScenarioClassesV1)[number];

export interface ManagedSurfaceLifecycleWorkloadDescriptorV1 {
  readonly workloadId: string;
  readonly targetCount: ManagedSurfaceLifecycleTargetCountV1;
  readonly parameterClass: ManagedSurfaceLifecycleParameterClassV1;
  readonly scenarioClass: ManagedSurfaceLifecycleScenarioClassV1;
  readonly measuredScope: "admission_and_atomic_apply";
}

export interface ManagedSurfaceLifecycleSemanticObservationV1 {
  readonly resultKind: "applied" | "unchanged";
  readonly resultCode:
    | "surface.stable_publication_applied"
    | "surface.stable_publication_unchanged";
  readonly sourceDelta: ManagedSurfaceStableDeltaInternalV1["source"];
  readonly runtimeDelta: ManagedSurfaceStableDeltaInternalV1["runtime"];
  readonly notificationCount: number;
  readonly runtimeAllocationHint: ManagedSurfaceStableDeltaInternalV1["runtimeAllocation"];
  readonly preparingTargetCount: number;
}

export interface ManagedSurfaceLifecycleWorkloadRunV1 {
  readonly durationMs: number;
  readonly semantic: ManagedSurfaceLifecycleSemanticObservationV1;
}

export interface PreparedManagedSurfaceLifecycleWorkloadV1 {
  readonly descriptor: ManagedSurfaceLifecycleWorkloadDescriptorV1;
  runOnce(): ManagedSurfaceLifecycleWorkloadRunV1;
}

interface HarnessV1 {
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly publisher: ManagedSurfaceStablePublisherInternalV1;
}

const applicationEpochV1 = parseNonNegativeSafeInteger(1);
const ownerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.performance-baseline");
const layerIdV1 = parseManagedSurfaceLayerIdV1("surface-layer.performance-baseline");

function schemaV1(): RuntimeSchemaV1<unknown> {
  return Object.freeze({
    parse(value: unknown): unknown {
      return value;
    },
  });
}

function fixtureV1(targetCount: ManagedSurfaceLifecycleTargetCountV1): Readonly<{
  readonly slots: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly sidecars: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
}> {
  const slots: ManagedSurfaceResolvedSlotDescriptorV1[] = [];
  const sidecars: ManagedSurfaceStableDefinitionSidecarInternalV1[] = [];
  for (let index = 0; index < targetCount; index += 1) {
    const slotId = parseManagedSurfaceSlotIdV1(
      `surface-slot.performance-baseline-${String(index)}`,
    );
    const definitionId = parseManagedSurfaceDefinitionIdV1(
      `surface.performance-baseline-${String(index)}`,
    );
    slots.push(Object.freeze({
      kind: "root",
      slotId,
      cardinality: "single",
    }));
    const definition = Object.freeze(
      {
        definitionId,
        contractRevision: parsePositiveSafeInteger(1),
        ownerId: ownerIdV1,
        slotId,
        layerId: layerIdV1,
        layerOrder: parseNonNegativeSafeInteger(index),
        placement: "root",
        modality: "non_blocking",
        inputPolicy: Object.freeze({ kind: "none" }),
        dismissPolicy: Object.freeze({
          back: true,
          escape: true,
          backdrop: false,
          routedCancel: true,
        }),
        focusPolicy: Object.freeze({ kind: "none" }),
        navigationPolicy: Object.freeze({ kind: "close" }),
        actionIds: Object.freeze([]),
        readiness: Object.freeze({
          initialOpen: "blocking_fallback",
          primaryReplacement: "retain_current",
          childOpen: "blocking_fallback",
        }),
      } satisfies ManagedSurfaceResolvedDefinitionV1,
    );
    sidecars.push(Object.freeze({ definition, parameterSchema: schemaV1() }));
  }
  return Object.freeze({
    slots: Object.freeze(slots),
    sidecars: Object.freeze(sidecars),
  });
}

function harnessV1(targetCount: ManagedSurfaceLifecycleTargetCountV1): HarnessV1 {
  const fixture = fixtureV1(targetCount);
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: [ownerIdV1],
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const publisher = registry.issuePublisher(ownerIdV1);
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: fixture.sidecars,
    resolvedSlotDescriptors: fixture.slots,
  });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: authority,
    publisherLeaseRegistry: registry,
    initialTransientState: createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      [ownerIdV1],
      fixture.slots,
    ),
  });
  const registration = kernel.registerStablePublisherLeaseInternalV1(publisher.lease);
  if (registration.kind !== "registered") {
    throw new Error("managed surface lifecycle workload could not register its publisher");
  }
  return Object.freeze({ authority, kernel, publisher });
}

function parametersV1(
  parameterClass: ManagedSurfaceLifecycleParameterClassV1,
  index: number,
  revision: number,
): Readonly<Record<string, unknown>> {
  if (parameterClass === "small") {
    return Object.freeze({ index, revision, label: `target-${String(index)}` });
  }
  return Object.freeze({
    index,
    revision,
    label: `target-${String(index)}-${"x".repeat(512)}`,
    values: Object.freeze(
      Array.from({ length: 64 }, (_, valueIndex) =>
        Object.freeze({
          id: `${String(index)}:${String(valueIndex)}`,
          value: valueIndex + revision,
        })),
    ),
  });
}

function targetsV1(
  harness: HarnessV1,
  targetCount: ManagedSurfaceLifecycleTargetCountV1,
  parameterClass: ManagedSurfaceLifecycleParameterClassV1,
  revision: number,
): readonly ManagedSurfaceStableTargetInternalV1[] {
  return Object.freeze(
    Array.from({ length: targetCount }, (_, index) =>
      Object.freeze({
        occurrenceId: harness.publisher.issueOccurrence(),
        definitionId: parseManagedSurfaceDefinitionIdV1(
          `surface.performance-baseline-${String(index)}`,
        ),
        parentOccurrenceId: null,
        parameters: parametersV1(parameterClass, index, revision),
      })),
  );
}

function publicationV1(
  harness: HarnessV1,
  targets: readonly ManagedSurfaceStableTargetInternalV1[],
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    publisherLease: harness.publisher.lease,
    sourceRevision: harness.publisher.issueSourceRevision(),
    targets,
  });
}

function evaluateAndApplyV1(
  harness: HarnessV1,
  publication: Readonly<Record<string, unknown>>,
): Readonly<{
  readonly kind: "applied" | "unchanged";
  readonly code:
    | "surface.stable_publication_applied"
    | "surface.stable_publication_unchanged";
  readonly delta: ManagedSurfaceStableDeltaInternalV1;
}> {
  const context = harness.kernel.captureAdmissionContextInternalV1(harness.publisher.lease);
  if (context.kind !== "captured") {
    throw new Error("managed surface lifecycle workload could not capture admission context");
  }
  const evaluated = harness.authority.evaluate({
    publication,
    acceptedBaseline: context.acceptedBaseline,
    reservationSnapshot: context.reservationSnapshot,
  });
  if (evaluated.kind === "unchanged") return evaluated;
  if (evaluated.kind !== "admitted") {
    throw new Error(
      `managed surface lifecycle workload admission failed: ${evaluated.kind}:${evaluated.code}`,
    );
  }
  const applied = harness.kernel.applyStableAdmissionProposalInternalV1(evaluated.proposal);
  if (applied.kind !== "applied" || applied.code !== "surface.stable_publication_applied") {
    throw new Error(
      `managed surface lifecycle workload apply failed: ${applied.kind}:${applied.code}`,
    );
  }
  return applied;
}

function prepareRunV1(
  descriptor: ManagedSurfaceLifecycleWorkloadDescriptorV1,
): Readonly<{
  readonly harness: HarnessV1;
  readonly publication: Readonly<Record<string, unknown>>;
}> {
  const harness = harnessV1(descriptor.targetCount);
  const initialTargets = targetsV1(
    harness,
    descriptor.targetCount,
    descriptor.parameterClass,
    1,
  );
  const initialPublication = publicationV1(harness, initialTargets);
  if (descriptor.scenarioClass === "initial") {
    return Object.freeze({ harness, publication: initialPublication });
  }
  evaluateAndApplyV1(harness, initialPublication);
  if (descriptor.scenarioClass === "equal_noop") {
    return Object.freeze({ harness, publication: initialPublication });
  }
  if (descriptor.scenarioClass === "empty") {
    return Object.freeze({ harness, publication: publicationV1(harness, Object.freeze([])) });
  }
  const replacementTargets = targetsV1(
    harness,
    descriptor.targetCount,
    descriptor.parameterClass,
    2,
  );
  const nextTargets = descriptor.scenarioClass === "all_change"
    ? replacementTargets
    : Object.freeze([replacementTargets[0]!, ...initialTargets.slice(1)]);
  return Object.freeze({ harness, publication: publicationV1(harness, nextTargets) });
}

export function prepareManagedSurfaceLifecycleWorkloadV1(input: {
  readonly targetCount: ManagedSurfaceLifecycleTargetCountV1;
  readonly parameterClass: ManagedSurfaceLifecycleParameterClassV1;
  readonly scenarioClass: ManagedSurfaceLifecycleScenarioClassV1;
  readonly now?: () => number;
}): PreparedManagedSurfaceLifecycleWorkloadV1 {
  const now = input.now ?? (() => performance.now());
  const descriptor = Object.freeze({
    workloadId: `stable-publication/${input.scenarioClass}/${input.parameterClass}/${
      String(input.targetCount)
    }`,
    targetCount: input.targetCount,
    parameterClass: input.parameterClass,
    scenarioClass: input.scenarioClass,
    measuredScope: "admission_and_atomic_apply" as const,
  });
  return Object.freeze({
    descriptor,
    runOnce(): ManagedSurfaceLifecycleWorkloadRunV1 {
      const prepared = prepareRunV1(descriptor);
      let notificationCount = 0;
      const unsubscribe = prepared.harness.kernel.subscribeStateInternalV1(() => {
        notificationCount += 1;
      });
      const startedAt = now();
      const result = evaluateAndApplyV1(prepared.harness, prepared.publication);
      const durationMs = now() - startedAt;
      unsubscribe();
      const preparingTargetCount = prepared.harness.kernel.getStateInternalV1()
        .stableRuntimeBindings.filter((entry) => entry.binding.kind === "preparing").length;
      return Object.freeze({
        durationMs,
        semantic: Object.freeze({
          resultKind: result.kind,
          resultCode: result.code,
          sourceDelta: result.delta.source,
          runtimeDelta: result.delta.runtime,
          notificationCount,
          runtimeAllocationHint: result.delta.runtimeAllocation,
          preparingTargetCount,
        }),
      });
    },
  });
}
