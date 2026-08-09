// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  parseNonNegativeSafeInteger,
  parsePendingInteractionV1,
} from "@sillymaker/base";
import { describe, expect, expectTypeOf, it } from "vitest";

import { createManagedSurfaceReducerStateV1 } from "../managed-surfaces/managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
} from "../managed-surfaces/managed-surface-stable-admission.ts";
import {
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import {
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  createNarrativeStablePublisherBridgeInternalV1,
  type NarrativeManagedSurfaceFamilyContractInternalV1,
  type NarrativeStableCandidatePreflightInternalV1,
  type NarrativeStableCandidatePreflightRejectionCodeInternalV1,
  type NarrativeStableCandidatePreflightResultInternalV1,
  type NarrativeStablePublisherBridgeInternalV1,
  type NarrativeStablePublisherBridgeResultInternalV1,
  type NarrativeStableRequiredPortIdInternalV1,
} from "./narrative-managed-surface-family.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(91);
const zeroDeltaV1 = Object.freeze({
  source: "unchanged" as const,
  runtime: "unchanged" as const,
  notificationCount: 0 as const,
  topology: "unchanged" as const,
  runtimeAllocation: "zero" as const,
});
const defaultCandidateSnapshotV1 = Object.freeze({
  rendererComponent: Object.freeze({ kind: "dialogue-renderer" }),
  visualConfig: Object.freeze({ skin: "test" }),
  semanticDispatchPort: Object.freeze({ kind: "semantic-dispatch" }),
  historyObservationPort: Object.freeze({ kind: "history-observation" }),
  playerProfile: Object.freeze({ locale: "en" }),
  presentationClock: Object.freeze({ kind: "manual-clock" }),
  textResolver: Object.freeze({ kind: "text-resolver" }),
  voiceReplayPort: null,
  quickMenuContribution: null,
});
const capturedCandidatePreflightResultV1 = (
  candidateSnapshot: unknown = defaultCandidateSnapshotV1,
) =>
  Object.freeze({
    kind: "captured" as const,
    candidateSnapshot,
  });
const defaultCandidatePreflightV1: NarrativeStableCandidatePreflightInternalV1 = Object.freeze({
  preflightCandidateInternalV1: () => capturedCandidatePreflightResultV1(),
});

interface NarrativeHarnessV1 {
  readonly contract: NarrativeManagedSurfaceFamilyContractInternalV1;
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly stateNotificationCount: () => number;
}

function createCompositionPartsV1(
  contract: NarrativeManagedSurfaceFamilyContractInternalV1,
) {
  const registry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: contract.resolvedOwnerIds,
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: contract.stableDefinitionSidecars,
    resolvedSlotDescriptors: contract.resolvedSlotDescriptors,
  });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority: authority,
    publisherLeaseRegistry: registry,
    initialTransientState: createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      contract.resolvedOwnerIds,
      contract.resolvedSlotDescriptors,
    ),
  });
  return { registry, authority, kernel };
}

function harnessV1(input: {
  readonly candidatePreflight?: NarrativeStableCandidatePreflightInternalV1;
} = {}): NarrativeHarnessV1 {
  const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const { registry, authority, kernel } = createCompositionPartsV1(contract);
  const bridge = createNarrativeStablePublisherBridgeInternalV1({
    publisherLeaseRegistry: registry,
    admissionAuthority: authority,
    compositeRuntimeKernel: kernel,
    candidatePreflight: input.candidatePreflight ?? defaultCandidatePreflightV1,
    exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
    exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
  });
  let stateNotifications = 0;
  kernel.subscribeStateInternalV1(() => {
    stateNotifications += 1;
  });
  return {
    contract,
    registry,
    authority,
    kernel,
    bridge,
    stateNotificationCount: () => stateNotifications,
  };
}

function narrativeBaselineV1(harness: NarrativeHarnessV1) {
  const baseline = harness.kernel.getStateInternalV1().stableAcceptedBaselines.find((candidate) =>
    candidate.kind === "accepted"
      ? candidate.ownerId === harness.contract.ownerId
      : harness.registry.inspectCurrentLease(candidate.publisherLease)?.ownerId ===
        harness.contract.ownerId
  );
  expect(baseline).toBeDefined();
  return baseline!;
}

function publisherSnapshotV1(harness: NarrativeHarnessV1) {
  const baseline = narrativeBaselineV1(harness);
  const snapshot = harness.registry.inspectCurrentLease(baseline.publisherLease);
  expect(snapshot).not.toBeNull();
  return snapshot!;
}

function occurrenceV1(sequence: number): string {
  return `interaction-occurrence.${String(sequence)}`;
}

function pendingV1(
  kind: "say" | "choice" | "pause" | "presentation_barrier" | "custom",
  sequence = 1,
): unknown {
  const base = {
    definitionId: `narrative.test.${kind.replace("_", "-")}`,
    seenRevision: 1,
    occurrenceId: occurrenceV1(sequence),
  };
  switch (kind) {
    case "say":
      return {
        kind,
        ...base,
        speakerTextId: "text.test.speaker",
        textId: "text.test.line",
        advancePolicy: "confirm",
      };
    case "choice":
      return {
        kind,
        ...base,
        promptTextId: "text.test.prompt",
        options: [
          { choiceId: "choice.test.first", textId: "text.test.first" },
          { choiceId: "choice.test.second", textId: "text.test.second" },
        ],
      };
    case "pause":
      return { kind, ...base, durationMs: 250, skippable: true };
    case "presentation_barrier":
      return {
        kind,
        ...base,
        expectedTransitionId: "transition.test.fade",
        loadRecovery: "replay",
      };
    case "custom":
      return {
        kind,
        ...base,
        surfaceId: "narrative.custom.test",
        params: { z: 2, a: { enabled: true } },
      };
    default:
      throw new Error(`unsupported pending kind: ${String(kind)}`);
  }
}

function expectZeroResultV1(
  value: unknown,
  kind: "unchanged" | "stale" | "rejected" | "faulted",
  code: string,
): void {
  expect(value).toEqual({ kind, code, delta: zeroDeltaV1 });
  expect(Object.isFrozen(value)).toBe(true);
}

describe("Narrative stable Managed Surface family", () => {
  it("freezes the source-relative candidate preflight result contract", () => {
    type ExpectedPreflightResultV1 =
      | Readonly<{ readonly kind: "captured"; readonly candidateSnapshot: unknown }>
      | Readonly<{
        readonly kind: "rejected";
        readonly code: "narrative.renderer_missing";
      }>
      | Readonly<{
        readonly kind: "rejected";
        readonly code: "narrative.required_port_missing";
        readonly portId: NarrativeStableRequiredPortIdInternalV1;
      }>
      | Readonly<{
        readonly kind: "faulted";
        readonly code: "narrative.candidate_preflight_faulted";
      }>;
    type ExpectedFamilyBridgeResultV1 =
      | Readonly<{
        readonly kind: "rejected";
        readonly code: "narrative.renderer_missing";
        readonly delta: typeof zeroDeltaV1;
      }>
      | Readonly<{
        readonly kind: "rejected";
        readonly code: "narrative.required_port_missing";
        readonly portId: NarrativeStableRequiredPortIdInternalV1;
        readonly delta: typeof zeroDeltaV1;
      }>
      | Readonly<{
        readonly kind: "faulted";
        readonly code: "narrative.candidate_preflight_faulted";
        readonly delta: typeof zeroDeltaV1;
      }>;

    expectTypeOf<NarrativeStableRequiredPortIdInternalV1>().toEqualTypeOf<
      | "narrative.semantic_dispatch"
      | "narrative.history_observation"
      | "narrative.player_profile"
      | "narrative.presentation_clock"
      | "narrative.text_resolver"
    >();
    expectTypeOf<NarrativeStableCandidatePreflightRejectionCodeInternalV1>()
      .toEqualTypeOf<"narrative.renderer_missing" | "narrative.required_port_missing">();
    expectTypeOf<NarrativeStableCandidatePreflightResultInternalV1>()
      .toEqualTypeOf<ExpectedPreflightResultV1>();
    expectTypeOf<
      Extract<
        NarrativeStablePublisherBridgeResultInternalV1,
        { readonly code: `narrative.${string}` }
      >
    >().toEqualTypeOf<ExpectedFamilyBridgeResultV1>();
  });

  it("freezes the exact root/History catalog without making History a stable target", () => {
    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();

    expect(Reflect.ownKeys(contract)).toEqual([
      "ownerId",
      "resolvedOwnerIds",
      "resolvedSlotDescriptors",
      "definitions",
      "stableDefinitionSidecars",
    ]);
    expect(contract.ownerId).toBe("surface-owner.narrative");
    expect(contract.resolvedOwnerIds).toEqual(["surface-owner.narrative"]);
    expect(contract.resolvedSlotDescriptors).toEqual([
      {
        kind: "root",
        slotId: "surface-slot.narrative.root",
        cardinality: "single",
      },
      {
        kind: "child",
        parentDefinitionId: "surface.narrative.dialogue",
        slotId: "surface-slot.narrative.history",
        cardinality: "single",
      },
    ]);
    expect(contract.definitions.dialogue).toEqual({
      definitionId: "surface.narrative.dialogue",
      contractRevision: 1,
      ownerId: "surface-owner.narrative",
      slotId: "surface-slot.narrative.root",
      layerId: "surface-layer.narrative",
      layerOrder: 40,
      placement: "root",
      modality: "blocking",
      inputPolicy: { kind: "managed", inputContextId: "narrative" },
      dismissPolicy: { back: false, escape: false, backdrop: false, routedCancel: false },
      focusPolicy: {
        kind: "owns_focus",
        initialTargetId: "surface-focus.narrative.primary",
        trap: true,
        restore: "previous_owner",
      },
      navigationPolicy: { kind: "none" },
      actionIds: [
        "ui.confirm",
        "narrative.advance",
        "narrative.choose",
        "narrative.resume",
        "narrative.custom",
        "player.toggle_auto",
        "player.toggle_skip",
        "player.toggle_history",
        "player.toggle_ui",
        "player.replay_voice",
      ],
      readiness: {
        initialOpen: "blocking_fallback",
        primaryReplacement: "retain_current",
        childOpen: "blocking_fallback",
      },
    });
    expect(contract.definitions.history).toMatchObject({
      definitionId: "surface.narrative.history",
      ownerId: "surface-owner.narrative",
      slotId: "surface-slot.narrative.history",
      layerId: "surface-layer.narrative",
      layerOrder: 41,
      placement: "child",
      modality: "blocking",
      dismissPolicy: { back: true, escape: true, backdrop: true, routedCancel: true },
      focusPolicy: {
        kind: "owns_focus",
        initialTargetId: "surface-focus.narrative.history-close",
        trap: true,
        restore: "opener",
      },
      navigationPolicy: { kind: "close" },
    });
    expect(contract.stableDefinitionSidecars).toHaveLength(1);
    expect(contract.stableDefinitionSidecars[0]?.definition).toBe(
      contract.definitions.dialogue,
    );
    expect(
      contract.stableDefinitionSidecars.some((sidecar) =>
        sidecar.definition === contract.definitions.history
      ),
    ).toBe(false);
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.resolvedSlotDescriptors)).toBe(true);
    expect(Object.isFrozen(contract.definitions.dialogue.actionIds)).toBe(true);
  });

  it("claims one exact composition configuration and rejects foreign or duplicate construction", () => {
    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
    const exact = createCompositionPartsV1(contract);
    const foreign = createCompositionPartsV1(contract);
    let foreignPreflightReads = 0;
    const foreignPreflight = Object.defineProperty(
      {},
      "preflightCandidateInternalV1",
      {
        get() {
          foreignPreflightReads += 1;
          throw new Error("foreign composition must not inspect candidate preflight");
        },
      },
    ) as NarrativeStableCandidatePreflightInternalV1;

    expect(() =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: exact.registry,
        admissionAuthority: foreign.authority,
        compositeRuntimeKernel: exact.kernel,
        candidatePreflight: foreignPreflight,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      })
    ).toThrowError("ui.narrative_stable_composition_invalid");
    expect(foreignPreflightReads).toBe(0);
    expect(exact.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 0,
      currentPublisherCount: 0,
    });
    expect(exact.kernel.getStateInternalV1().stableAcceptedBaselines).toEqual([]);

    expect(() =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: exact.registry,
        admissionAuthority: exact.authority,
        compositeRuntimeKernel: foreign.kernel,
        candidatePreflight: defaultCandidatePreflightV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      })
    ).toThrowError("ui.narrative_stable_composition_invalid");
    expect(exact.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 0,
      currentPublisherCount: 0,
    });

    const bridge = createNarrativeStablePublisherBridgeInternalV1({
      publisherLeaseRegistry: exact.registry,
      admissionAuthority: exact.authority,
      compositeRuntimeKernel: exact.kernel,
      candidatePreflight: defaultCandidatePreflightV1,
      exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
      exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
    });
    expect(Object.isFrozen(bridge)).toBe(true);
    expect(exact.registry.getSnapshot().currentPublisherCount).toBe(1);
    expect(exact.kernel.getStateInternalV1().stableAcceptedBaselines).toHaveLength(1);
    const state = exact.kernel.getStateInternalV1();
    expect(() =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: exact.registry,
        admissionAuthority: exact.authority,
        compositeRuntimeKernel: exact.kernel,
        candidatePreflight: defaultCandidatePreflightV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      })
    ).toThrowError("ui.managed_surface_stable_publisher_owner_current");
    expect(exact.kernel.getStateInternalV1()).toBe(state);
  });

  it("cleans an issued publisher when registration throws inside the shared transition fence", () => {
    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
    const parts = createCompositionPartsV1(contract);
    const createBridge = (): NarrativeStablePublisherBridgeInternalV1 =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: parts.registry,
        admissionAuthority: parts.authority,
        compositeRuntimeKernel: parts.kernel,
        candidatePreflight: defaultCandidatePreflightV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      });
    const state = parts.kernel.getStateInternalV1();

    expect(() =>
      parts.kernel.transitionStateInternalV1((currentState) => {
        createBridge();
        return Object.freeze({ state: currentState, result: null });
      })
    ).toThrowError("ui.managed_surface_runtime_transition_in_progress");
    expect(parts.kernel.getStateInternalV1()).toBe(state);
    expect(parts.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 1,
      currentPublisherCount: 0,
    });

    expect(Object.isFrozen(createBridge())).toBe(true);
    expect(parts.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 2,
      currentPublisherCount: 1,
    });
  });

  it("rejects a synchronously retired registration without deleting its listener-installed successor", () => {
    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
    const parts = createCompositionPartsV1(contract);
    const createBridge = (): NarrativeStablePublisherBridgeInternalV1 =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: parts.registry,
        admissionAuthority: parts.authority,
        compositeRuntimeKernel: parts.kernel,
        candidatePreflight: defaultCandidatePreflightV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      });
    let handled = false;
    let successorBridge: NarrativeStablePublisherBridgeInternalV1 | null = null;
    const unsubscribe = parts.kernel.subscribeStateInternalV1(() => {
      if (handled) return;
      handled = true;
      const baseline = parts.kernel.getStateInternalV1().stableAcceptedBaselines[0];
      if (baseline === undefined) throw new Error("expected registered baseline");
      expect(
        parts.kernel.disposeStablePublisherLeaseInternalV1(baseline.publisherLease).kind,
      ).toBe("applied");
      successorBridge = createBridge();
    });

    expect(createBridge).toThrowError("ui.narrative_stable_composition_invalid");
    unsubscribe();
    expect(handled).toBe(true);
    expect(successorBridge).not.toBeNull();
    expect(parts.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 2,
      currentPublisherCount: 1,
    });
    expect(parts.kernel.getStateInternalV1().stableAcceptedBaselines).toHaveLength(1);
    expect(
      (successorBridge as unknown as NarrativeStablePublisherBridgeInternalV1)
        .reconcilePendingInternalV1(pendingV1("say")),
    ).toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
  });

  it("keeps initial null registered-unpublished without issuing source or occurrence", () => {
    const harness = harnessV1();
    const before = harness.kernel.getStateInternalV1();

    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(null),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(narrativeBaselineV1(harness).kind).toBe("unpublished");
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });
    expect(harness.stateNotificationCount()).toBe(0);
  });

  it("captures exact candidate preflight once and rejects missing or throwing ports before issuance", () => {
    let preflightGetterReads = 0;
    let preflightCalls = 0;
    let exactPreflight: NarrativeStableCandidatePreflightInternalV1;
    exactPreflight = Object.defineProperty({}, "preflightCandidateInternalV1", {
      get() {
        preflightGetterReads += 1;
        return function (this: unknown, pending: unknown, rendererKey: unknown) {
          expect(this).toBe(exactPreflight);
          expect(pending).toMatchObject({ kind: "say", occurrenceId: occurrenceV1(1) });
          expect(rendererKey).toBe("narrative.renderer.say");
          preflightCalls += 1;
          return capturedCandidatePreflightResultV1();
        };
      },
    }) as NarrativeStableCandidatePreflightInternalV1;
    const accepted = harnessV1({ candidatePreflight: exactPreflight });
    expect(preflightGetterReads).toBe(1);
    expect(accepted.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(preflightCalls).toBe(1);
    expectZeroResultV1(
      accepted.bridge.reconcilePendingInternalV1(pendingV1("say")),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(preflightCalls).toBe(1);
    const acceptedBaseline = narrativeBaselineV1(accepted);
    if (acceptedBaseline.kind !== "accepted") throw new Error("expected accepted baseline");
    const captured = accepted.bridge.inspectAdmittedTargetFrameInternalV1(
      acceptedBaseline.targets[0]!,
    )?.candidateSnapshot;
    expect(captured).not.toBe(defaultCandidateSnapshotV1);
    expect(captured).toEqual(defaultCandidateSnapshotV1);
    expect(Object.isFrozen(captured)).toBe(true);
    expect(captured?.rendererComponent).toBe(defaultCandidateSnapshotV1.rendererComponent);

    const missing = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () =>
          Object.freeze({
            kind: "rejected" as const,
            code: "narrative.renderer_missing" as const,
          }),
      }),
    });
    const missingState = missing.kernel.getStateInternalV1();
    expectZeroResultV1(
      missing.bridge.reconcilePendingInternalV1(pendingV1("say")),
      "rejected",
      "narrative.renderer_missing",
    );
    expect(missing.kernel.getStateInternalV1()).toBe(missingState);
    expect(publisherSnapshotV1(missing)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });

    const throwing = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          throw new Error("resolver failed");
        },
      }),
    });
    const throwingState = throwing.kernel.getStateInternalV1();
    expectZeroResultV1(
      throwing.bridge.reconcilePendingInternalV1(pendingV1("say")),
      "faulted",
      "narrative.candidate_preflight_faulted",
    );
    expect(throwing.kernel.getStateInternalV1()).toBe(throwingState);
    expect(publisherSnapshotV1(throwing)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });

    const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
    const parts = createCompositionPartsV1(contract);
    expect(() =>
      createNarrativeStablePublisherBridgeInternalV1({
        publisherLeaseRegistry: parts.registry,
        admissionAuthority: parts.authority,
        compositeRuntimeKernel: parts.kernel,
        candidatePreflight: Object.freeze({}) as NarrativeStableCandidatePreflightInternalV1,
        exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
        exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
      })
    ).toThrowError("ui.narrative_stable_composition_invalid");
    expect(parts.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 0,
      currentPublisherCount: 0,
    });
  });

  it.each(
    [
      "narrative.semantic_dispatch",
      "narrative.history_observation",
      "narrative.player_profile",
      "narrative.presentation_clock",
      "narrative.text_resolver",
    ] as const,
  )("returns exact zero delta for missing required port %s", (portId) => {
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () =>
          Object.freeze({
            kind: "rejected" as const,
            code: "narrative.required_port_missing" as const,
            portId,
          }),
      }),
    });
    const state = harness.kernel.getStateInternalV1();
    const result = harness.bridge.reconcilePendingInternalV1(pendingV1("say"));
    expect(result).toEqual({
      kind: "rejected",
      code: "narrative.required_port_missing",
      portId,
      delta: zeroDeltaV1,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });
    expect(harness.stateNotificationCount()).toBe(0);
  });

  it("captures one exact tagged preflight record without invoking caller getters", () => {
    let resultPrototypeReads = 0;
    let resultOwnKeyReads = 0;
    let resultDescriptorReads = 0;
    let resultValueReads = 0;
    let snapshotPrototypeReads = 0;
    let snapshotOwnKeyReads = 0;
    let snapshotDescriptorReads = 0;
    let snapshotValueReads = 0;
    const rawSnapshot = new Proxy(defaultCandidateSnapshotV1, {
      getPrototypeOf() {
        snapshotPrototypeReads += 1;
        return Object.prototype;
      },
      ownKeys(target) {
        snapshotOwnKeyReads += 1;
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, key) {
        snapshotDescriptorReads += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
      get() {
        snapshotValueReads += 1;
        throw new Error("candidate snapshot values must come from captured descriptors");
      },
    });
    const rawResult = new Proxy(
      {
        kind: "captured" as const,
        candidateSnapshot: rawSnapshot,
      },
      {
        getPrototypeOf() {
          resultPrototypeReads += 1;
          return Object.prototype;
        },
        ownKeys(target) {
          resultOwnKeyReads += 1;
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, key) {
          resultDescriptorReads += 1;
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
        get() {
          resultValueReads += 1;
          throw new Error("preflight result values must come from captured descriptors");
        },
      },
    );
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => rawResult,
      }) as NarrativeStableCandidatePreflightInternalV1,
    });

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(resultPrototypeReads).toBe(1);
    expect(resultOwnKeyReads).toBe(1);
    expect(resultDescriptorReads).toBe(2);
    expect(resultValueReads).toBe(0);
    expect(snapshotPrototypeReads).toBe(1);
    expect(snapshotOwnKeyReads).toBe(1);
    expect(snapshotDescriptorReads).toBe(9);
    expect(snapshotValueReads).toBe(0);
  });

  it("maps declared faults and malformed tagged results or snapshots to the family fault", () => {
    const accessorResult = Object.defineProperty(
      { kind: "rejected" },
      "code",
      { get: () => "narrative.renderer_missing", enumerable: true },
    );
    const customPrototypeResult = Object.assign(Object.create({}), {
      kind: "faulted",
      code: "narrative.candidate_preflight_faulted",
    });
    const candidateSnapshotMissingQuickMenu = Object.freeze({
      rendererComponent: defaultCandidateSnapshotV1.rendererComponent,
      visualConfig: defaultCandidateSnapshotV1.visualConfig,
      semanticDispatchPort: defaultCandidateSnapshotV1.semanticDispatchPort,
      historyObservationPort: defaultCandidateSnapshotV1.historyObservationPort,
      playerProfile: defaultCandidateSnapshotV1.playerProfile,
      presentationClock: defaultCandidateSnapshotV1.presentationClock,
      textResolver: defaultCandidateSnapshotV1.textResolver,
      voiceReplayPort: defaultCandidateSnapshotV1.voiceReplayPort,
    });
    const candidateSnapshotAccessor = Object.defineProperty(
      { ...defaultCandidateSnapshotV1 },
      "textResolver",
      { get: () => defaultCandidateSnapshotV1.textResolver, enumerable: true },
    );
    const malformedResults: readonly unknown[] = Object.freeze([
      Object.freeze({}),
      Promise.resolve(capturedCandidatePreflightResultV1()),
      Object.freeze({
        kind: "faulted",
        code: "narrative.candidate_preflight_faulted",
      }),
      Object.freeze({
        kind: "rejected",
        code: "narrative.required_port_missing",
        portId: "narrative.unknown",
      }),
      Object.freeze({
        kind: "rejected",
        code: "narrative.renderer_missing",
        extra: true,
      }),
      Object.freeze({
        kind: "rejected",
        code: "narrative.required_port_missing",
      }),
      Object.freeze({
        kind: "faulted",
        code: "narrative.candidate_preflight_faulted",
        [Symbol("extra")]: true,
      }),
      accessorResult,
      customPrototypeResult,
      capturedCandidatePreflightResultV1(Object.freeze({
        ...defaultCandidateSnapshotV1,
        quickMenuContribution: "not-an-opaque-port",
      })),
      capturedCandidatePreflightResultV1(Object.freeze({
        ...defaultCandidateSnapshotV1,
        extra: true,
      })),
      capturedCandidatePreflightResultV1(candidateSnapshotMissingQuickMenu),
      capturedCandidatePreflightResultV1(candidateSnapshotAccessor),
    ]);
    for (const rawResult of malformedResults) {
      const harness = harnessV1({
        candidatePreflight: Object.freeze({
          preflightCandidateInternalV1: () => rawResult,
        }) as NarrativeStableCandidatePreflightInternalV1,
      });
      const before = harness.kernel.getStateInternalV1();
      expectZeroResultV1(
        harness.bridge.reconcilePendingInternalV1(pendingV1("say")),
        "faulted",
        "narrative.candidate_preflight_faulted",
      );
      expect(harness.kernel.getStateInternalV1()).toBe(before);
      expect(publisherSnapshotV1(harness)).toMatchObject({
        sourceRevisionIssuanceHighWater: 0,
        occurrenceIssuanceHighWater: 0,
      });
    }
  });

  it("keeps the accepted candidate on replacement preflight failure and fails closed on reentry", () => {
    let preflightCalls = 0;
    const replacementHarness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          preflightCalls += 1;
          return preflightCalls === 1 ? capturedCandidatePreflightResultV1() : Object.freeze({
            kind: "rejected" as const,
            code: "narrative.renderer_missing" as const,
          });
        },
      }),
    });
    expect(
      replacementHarness.bridge.reconcilePendingInternalV1(pendingV1("say", 1)).kind,
    ).toBe("applied");
    const acceptedState = replacementHarness.kernel.getStateInternalV1();
    const acceptedBaseline = narrativeBaselineV1(replacementHarness);
    const acceptedTarget = acceptedBaseline.kind === "accepted"
      ? acceptedBaseline.targets[0]
      : undefined;
    const acceptedFrame = acceptedTarget === undefined
      ? null
      : replacementHarness.bridge.inspectAdmittedTargetFrameInternalV1(acceptedTarget);
    expectZeroResultV1(
      replacementHarness.bridge.reconcilePendingInternalV1(pendingV1("choice", 2)),
      "rejected",
      "narrative.renderer_missing",
    );
    expect(replacementHarness.kernel.getStateInternalV1()).toBe(acceptedState);
    expect(narrativeBaselineV1(replacementHarness)).toBe(acceptedBaseline);
    expect(
      acceptedTarget === undefined
        ? null
        : replacementHarness.bridge.inspectAdmittedTargetFrameInternalV1(acceptedTarget),
    ).toBe(acceptedFrame);
    expect(publisherSnapshotV1(replacementHarness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });

    let reentered = false;
    let nestedResult: unknown = null;
    let reentrantBridge: NarrativeStablePublisherBridgeInternalV1;
    const reentrantHarness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          if (!reentered) {
            reentered = true;
            nestedResult = reentrantBridge.reconcilePendingInternalV1(pendingV1("say"));
            return Object.freeze({
              kind: "rejected" as const,
              code: "narrative.renderer_missing" as const,
            });
          }
          return capturedCandidatePreflightResultV1();
        },
      }),
    });
    reentrantBridge = reentrantHarness.bridge;
    expectZeroResultV1(
      reentrantBridge.reconcilePendingInternalV1(pendingV1("say")),
      "stale",
      "surface.stable_reconcile_precondition_stale",
    );
    expect(nestedResult).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(publisherSnapshotV1(reentrantHarness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });
  });

  it("loses first-wins to synchronous preflight disposal without issuing on the stale lease", () => {
    let bridge: NarrativeStablePublisherBridgeInternalV1;
    let disposedState:
      | ReturnType<ManagedSurfaceStableCompositeRuntimeKernelInternalV1["getStateInternalV1"]>
      | null = null;
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          expect(bridge.disposeInternalV1()).toMatchObject({
            kind: "applied",
            code: "surface.stable_publisher_disposed",
          });
          disposedState = harness.kernel.getStateInternalV1();
          return Object.freeze({
            kind: "rejected" as const,
            code: "narrative.renderer_missing" as const,
          });
        },
      }),
    });
    bridge = harness.bridge;

    expectZeroResultV1(
      bridge.reconcilePendingInternalV1(pendingV1("say")),
      "stale",
      "surface.stable_publisher_lease_stale",
    );
    expect(disposedState).not.toBeNull();
    expect(harness.kernel.getStateInternalV1()).toBe(disposedState);
    expect(harness.kernel.getStateInternalV1().stableAcceptedBaselines).toEqual([]);
    expect(harness.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 1,
      currentPublisherCount: 0,
    });
  });

  it.each(
    [
      ["say", "narrative.renderer.say"],
      ["choice", "narrative.renderer.choice"],
      ["pause", "narrative.renderer.pause"],
      ["presentation_barrier", "narrative.renderer.presentation_barrier"],
      ["custom", "narrative.custom.test"],
    ] as const,
  )("projects every %s interaction to one exact root", (kind, rendererKey) => {
    const harness = harnessV1();
    const pending = pendingV1(kind);

    expect(harness.bridge.reconcilePendingInternalV1(pending)).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const baseline = narrativeBaselineV1(harness);
    expect(baseline.kind).toBe("accepted");
    if (baseline.kind !== "accepted") throw new Error("expected accepted baseline");
    expect(baseline.sourceRevision).toBe(1);
    expect(baseline.targets).toHaveLength(1);
    const target = baseline.targets[0]!;
    expect(target).toMatchObject({
      ownerId: "surface-owner.narrative",
      definitionId: "surface.narrative.dialogue",
      parentOccurrenceId: null,
      normalizedParameters: {
        semanticOccurrenceId: occurrenceV1(1),
        kind,
        definitionId: `narrative.test.${kind.replace("_", "-")}`,
        seenRevision: 1,
        rendererKey,
      },
    });
    expect(target.occurrenceId).not.toBe(occurrenceV1(1));
    const frame = harness.bridge.inspectAdmittedTargetFrameInternalV1(target);
    expect(frame).toEqual({
      semanticOccurrenceId: occurrenceV1(1),
      rendererKey,
      pending: parsePendingInteractionV1(pending),
      candidateSnapshot: defaultCandidateSnapshotV1,
    });
    expect(Object.isFrozen(frame)).toBe(true);
    expect(Object.isFrozen(frame?.pending)).toBe(true);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });
  });

  it("keeps Base-valid full PendingInteraction proof above stable target canonical limits", () => {
    const harness = harnessV1();
    const params = Object.fromEntries(
      Array.from({ length: 64 }, (_outerValue, outerIndex) => [
        `group_${String(outerIndex)}`,
        Array.from(
          { length: 64 },
          (_innerValue, innerIndex) =>
            `value_${String(outerIndex)}_${String(innerIndex)}_${"x".repeat(24)}`,
        ),
      ]),
    );
    const pending = {
      kind: "custom",
      definitionId: "narrative.test.large-custom",
      seenRevision: 1,
      occurrenceId: occurrenceV1(1),
      surfaceId: "narrative.custom.large",
      params,
    };
    const normalized = parsePendingInteractionV1(pending);
    expect(canonicalJsonBytes(normalized).byteLength).toBeGreaterThan(65_536);

    expect(harness.bridge.reconcilePendingInternalV1(pending)).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const baseline = narrativeBaselineV1(harness);
    if (baseline.kind !== "accepted") throw new Error("expected accepted baseline");
    expect(harness.bridge.inspectAdmittedTargetFrameInternalV1(baseline.targets[0]!)?.pending)
      .toEqual(normalized);
  });

  it("uses full normalized canonical equality while reusing exact accepted identity", () => {
    const harness = harnessV1();
    const first = pendingV1("custom") as Record<string, unknown>;
    const second = {
      ...first,
      params: { a: { enabled: true }, z: 2 },
    };
    expect(harness.bridge.reconcilePendingInternalV1(first).kind).toBe("applied");
    const state = harness.kernel.getStateInternalV1();
    const baseline = narrativeBaselineV1(harness);
    const target = baseline.kind === "accepted" ? baseline.targets[0] : undefined;
    const frame = target === undefined
      ? null
      : harness.bridge.inspectAdmittedTargetFrameInternalV1(target);
    const notifications = harness.stateNotificationCount();

    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(second),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(narrativeBaselineV1(harness)).toBe(baseline);
    expect(
      target === undefined ? null : harness.bridge.inspectAdmittedTargetFrameInternalV1(target),
    ).toBe(frame);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });
    expect(harness.stateNotificationCount()).toBe(notifications);
  });

  it.each(
    [
      ["say text", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        textId: "text.test.changed",
      }],
      ["say speaker", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        speakerTextId: null,
      }],
      ["say advance policy", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        advancePolicy: "auto",
      }],
      ["choice prompt", pendingV1("choice"), {
        ...(pendingV1("choice") as Record<string, unknown>),
        promptTextId: "text.test.prompt-changed",
      }],
      ["choice options", pendingV1("choice"), {
        ...(pendingV1("choice") as Record<string, unknown>),
        options: [{ choiceId: "choice.test.changed", textId: "text.test.changed" }],
      }],
      ["pause duration", pendingV1("pause"), {
        ...(pendingV1("pause") as Record<string, unknown>),
        durationMs: 251,
      }],
      ["pause skippable", pendingV1("pause"), {
        ...(pendingV1("pause") as Record<string, unknown>),
        skippable: false,
      }],
      ["barrier transition", pendingV1("presentation_barrier"), {
        ...(pendingV1("presentation_barrier") as Record<string, unknown>),
        expectedTransitionId: "transition.test.changed",
      }],
      ["barrier recovery", pendingV1("presentation_barrier"), {
        ...(pendingV1("presentation_barrier") as Record<string, unknown>),
        loadRecovery: "settle",
      }],
      ["custom surface", pendingV1("custom"), {
        ...(pendingV1("custom") as Record<string, unknown>),
        surfaceId: "narrative.custom.changed",
      }],
      ["custom params", pendingV1("custom"), {
        ...(pendingV1("custom") as Record<string, unknown>),
        params: { z: 3, a: { enabled: true } },
      }],
      ["base definition", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        definitionId: "narrative.test.changed",
      }],
      ["base seen revision", pendingV1("say"), {
        ...(pendingV1("say") as Record<string, unknown>),
        seenRevision: 2,
      }],
      ["interaction kind", pendingV1("say"), pendingV1("choice")],
    ] as const,
  )("faults same-occurrence %s drift before issuing", (_name, initial, changed) => {
    const harness = harnessV1();
    expect(harness.bridge.reconcilePendingInternalV1(initial).kind).toBe("applied");
    const before = harness.kernel.getStateInternalV1();
    const snapshot = publisherSnapshotV1(harness);
    const notifications = harness.stateNotificationCount();

    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(changed),
      "faulted",
      "surface.stable_reconcile_faulted",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(publisherSnapshotV1(harness)).toBe(snapshot);
    expect(harness.stateNotificationCount()).toBe(notifications);
  });

  it("advances dedicated source and occurrence across replace, empty, and reopen", () => {
    const harness = harnessV1();
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say", 1)).kind).toBe(
      "applied",
    );
    const first = narrativeBaselineV1(harness);
    if (first.kind !== "accepted") throw new Error("expected first baseline");
    const firstOccurrence = first.targets[0]!.occurrenceId;

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)).kind).toBe(
      "applied",
    );
    const second = narrativeBaselineV1(harness);
    if (second.kind !== "accepted") throw new Error("expected second baseline");
    expect(second.sourceRevision).toBe(2);
    expect(second.targets[0]!.occurrenceId).not.toBe(firstOccurrence);

    expect(harness.bridge.reconcilePendingInternalV1(null).kind).toBe("applied");
    const empty = narrativeBaselineV1(harness);
    if (empty.kind !== "accepted") throw new Error("expected empty baseline");
    expect(empty.sourceRevision).toBe(3);
    expect(empty.targets).toEqual([]);
    expect(publisherSnapshotV1(harness).occurrenceIssuanceHighWater).toBe(2);
    const emptyState = harness.kernel.getStateInternalV1();

    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(null),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(emptyState);

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("choice", 3)).kind).toBe(
      "applied",
    );
    const reopened = narrativeBaselineV1(harness);
    if (reopened.kind !== "accepted") throw new Error("expected reopened baseline");
    expect(reopened.sourceRevision).toBe(4);
    expect(reopened.targets[0]!.occurrenceId).not.toBe(second.targets[0]!.occurrenceId);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 4,
      occurrenceIssuanceHighWater: 3,
    });
  });

  it("re-preflights a readiness-failed target before allocating its fresh candidate", () => {
    const retryRenderer = Object.freeze({ kind: "dialogue-renderer-retry" });
    let preflightCalls = 0;
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          preflightCalls += 1;
          return capturedCandidatePreflightResultV1(
            preflightCalls === 1 ? defaultCandidateSnapshotV1 : Object.freeze({
              ...defaultCandidateSnapshotV1,
              rendererComponent: retryRenderer,
            }),
          );
        },
      }),
    });
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")).kind).toBe("applied");
    expect(preflightCalls).toBe(1);
    const beforeFailure = harness.kernel.getStateInternalV1();
    const entry = beforeFailure.stableRuntimeBindings[0]!;
    if (entry.binding.kind !== "preparing") throw new Error("expected preparing binding");
    const originalInstanceId = entry.binding.attempt.identity.surfaceInstanceId;
    const targetOccurrenceId = entry.desiredTarget.admittedTarget.occurrenceId;
    expect(
      harness.kernel.settleStableReadinessFailedInternalV1({
        readinessEvidence: {
          applicationEpoch: applicationEpochV1,
          surfaceInstanceId: originalInstanceId,
        },
        publisherLease: entry.desiredTarget.publisherLease,
        sourceRevision: entry.desiredTarget.sourceRevision,
      }).kind,
    ).toBe("applied");

    expect(harness.bridge.retryCurrentPendingInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(preflightCalls).toBe(2);
    const retried = harness.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    expect(retried.desiredTarget.admittedTarget.occurrenceId).toBe(targetOccurrenceId);
    expect(retried.desiredTarget.sourceRevision).toBe(2);
    expect(retried.binding.kind).toBe("preparing");
    if (retried.binding.kind !== "preparing") throw new Error("expected retried candidate");
    expect(retried.binding.attempt.identity.surfaceInstanceId).not.toBe(originalInstanceId);
    const retriedBaseline = narrativeBaselineV1(harness);
    if (retriedBaseline.kind !== "accepted") throw new Error("expected retried baseline");
    expect(
      harness.bridge.inspectAdmittedTargetFrameInternalV1(retriedBaseline.targets[0]!)
        ?.candidateSnapshot.rendererComponent,
    ).toBe(retryRenderer);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 2,
      occurrenceIssuanceHighWater: 1,
    });
  });

  it("keeps a readiness-failed gap exact when retry preflight rejects", () => {
    let preflightCalls = 0;
    const harness = harnessV1({
      candidatePreflight: Object.freeze({
        preflightCandidateInternalV1: () => {
          preflightCalls += 1;
          return preflightCalls === 1 ? capturedCandidatePreflightResultV1() : Object.freeze({
            kind: "rejected" as const,
            code: "narrative.required_port_missing" as const,
            portId: "narrative.text_resolver" as const,
          });
        },
      }),
    });
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")).kind).toBe("applied");
    const preparing = harness.kernel.getStateInternalV1().stableRuntimeBindings[0]!;
    if (preparing.binding.kind !== "preparing") throw new Error("expected preparing binding");
    expect(
      harness.kernel.settleStableReadinessFailedInternalV1({
        readinessEvidence: {
          applicationEpoch: applicationEpochV1,
          surfaceInstanceId: preparing.binding.attempt.identity.surfaceInstanceId,
        },
        publisherLease: preparing.desiredTarget.publisherLease,
        sourceRevision: preparing.desiredTarget.sourceRevision,
      }).kind,
    ).toBe("applied");
    const failedState = harness.kernel.getStateInternalV1();
    const failedBaseline = narrativeBaselineV1(harness);
    const failedSnapshot = publisherSnapshotV1(harness);

    const rejectedRetry = harness.bridge.retryCurrentPendingInternalV1();
    expect(rejectedRetry).toEqual({
      kind: "rejected",
      code: "narrative.required_port_missing",
      portId: "narrative.text_resolver",
      delta: zeroDeltaV1,
    });
    expect(Object.isFrozen(rejectedRetry)).toBe(true);
    expect(preflightCalls).toBe(2);
    expect(harness.kernel.getStateInternalV1()).toBe(failedState);
    expect(narrativeBaselineV1(harness)).toBe(failedBaseline);
    expect(publisherSnapshotV1(harness)).toBe(failedSnapshot);
  });

  it("publishes proof before synchronous state notification reentry", () => {
    const harness = harnessV1();
    const pending = pendingV1("say");
    let nested: unknown = null;
    let reentered = false;
    const unsubscribe = harness.kernel.subscribeStateInternalV1(() => {
      if (reentered) return;
      reentered = true;
      nested = harness.bridge.reconcilePendingInternalV1(pending);
    });

    expect(harness.bridge.reconcilePendingInternalV1(pending).kind).toBe("applied");
    unsubscribe();
    expectZeroResultV1(
      nested,
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 1,
      occurrenceIssuanceHighWater: 1,
    });
  });

  it("fails invalid hostile pending before issuance and reads nothing after disposal", () => {
    const harness = harnessV1();
    const before = harness.kernel.getStateInternalV1();
    const invalid = Object.defineProperty({}, "kind", {
      get: () => {
        throw new Error("must not invoke accessor");
      },
    });
    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(invalid),
      "rejected",
      "surface.stable_schema_invalid",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(publisherSnapshotV1(harness)).toMatchObject({
      sourceRevisionIssuanceHighWater: 0,
      occurrenceIssuanceHighWater: 0,
    });

    expect(harness.bridge.disposeInternalV1()).toMatchObject({
      kind: "applied",
      code: "surface.stable_publisher_disposed",
    });
    const target = {};
    const { proxy, revoke } = Proxy.revocable(target, {});
    revoke();
    expectZeroResultV1(
      harness.bridge.reconcilePendingInternalV1(proxy),
      "stale",
      "surface.stable_publisher_lease_stale",
    );
    expectZeroResultV1(
      harness.bridge.disposeInternalV1(),
      "unchanged",
      "surface.stable_publisher_already_disposed",
    );

    const successor = createNarrativeStablePublisherBridgeInternalV1({
      publisherLeaseRegistry: harness.registry,
      admissionAuthority: harness.authority,
      compositeRuntimeKernel: harness.kernel,
      candidatePreflight: defaultCandidatePreflightV1,
      exactAggregateDefinitionSidecars: harness.contract.stableDefinitionSidecars,
      exactAggregateSlotDescriptors: harness.contract.resolvedSlotDescriptors,
    });
    expect(successor.reconcilePendingInternalV1(pendingV1("choice", 2))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const successorBaseline = narrativeBaselineV1(harness);
    if (successorBaseline.kind !== "accepted") {
      throw new Error("expected accepted successor baseline");
    }
    expect(successor.inspectAdmittedTargetFrameInternalV1(successorBaseline.targets[0]!))
      .toMatchObject({ semanticOccurrenceId: occurrenceV1(2) });
    expect(harness.bridge.inspectAdmittedTargetFrameInternalV1(successorBaseline.targets[0]!))
      .toBeNull();
    expect(harness.registry.getSnapshot()).toMatchObject({
      leaseSequenceHighWater: 2,
      currentPublisherCount: 1,
    });
  });
});
