// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { playerInputActionIdsV1 } from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceGestureIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { createManagedSurfaceReducerStateV1 } from "../managed-surfaces/managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
} from "../managed-surfaces/managed-surface-stable-admission.ts";
import {
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  createManagedSurfaceStableReadyRuntimeBindingInternalV1,
  reconcileManagedSurfaceStableRootReservationsInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableRootReservationContributorCandidateInternalV1,
  type ManagedSurfaceStableRuntimeEntryInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import {
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  createNarrativeStableHistoryChildLifecycleInternalV1,
  createNarrativeStablePhysicalActionAdmissionInternalV1,
  createNarrativeStablePublisherBridgeInternalV1,
  createNarrativeStableSessionInternalV1,
  type NarrativeManagedSurfaceFamilyContractInternalV1,
  type NarrativeStableCandidatePreflightInternalV1,
  type NarrativeStableHistoryChildLifecycleInternalV1,
  type NarrativeStableHistoryChildPreparationInternalV1,
  type NarrativeStableHistoryOpenIntentInternalV1,
  type NarrativeStablePublisherBridgeInternalV1,
  type NarrativeStableSemanticResolutionPortInternalV1,
} from "./narrative-managed-surface-family.ts";
import type {
  NarrativeStableHostLeaseInternalV1,
  NarrativeStableReadinessEntryInternalV1,
  NarrativeStableReadinessSnapshotInternalV1,
  NarrativeStableRootPreparationInternalV1,
  NarrativeStableSessionInternalV1,
} from "./narrative-managed-surface-session.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(119);
const toggleHistoryActionIdV1 = parseManagedSurfaceActionIdV1(
  playerInputActionIdsV1.toggleHistory,
);
const defaultSemanticDispatchPortV1 = Object.freeze({
  dispatchResolutionInternalV1: (_request: unknown) => Promise.resolve(undefined),
}) satisfies NarrativeStableSemanticResolutionPortInternalV1;
const defaultCandidateSnapshotV1 = Object.freeze({
  rendererComponent: Object.freeze({ kind: "session-test-renderer" }),
  visualConfig: Object.freeze({ skin: "session-test" }),
  semanticDispatchPort: defaultSemanticDispatchPortV1,
  historyObservationPort: Object.freeze({ kind: "session-test-history" }),
  historyAvailabilityPort: Object.freeze({
    readHistoryAvailabilityInternalV1: () => true,
  }),
  playerProfile: Object.freeze({ locale: "en" }),
  presentationClock: Object.freeze({ kind: "session-test-clock" }),
  textResolver: Object.freeze({ kind: "session-test-text" }),
  voiceReplayPort: null,
  quickMenuContribution: null,
});
const defaultCandidatePreflightV1 = Object.freeze({
  preflightCandidateInternalV1: () =>
    Object.freeze({
      kind: "captured" as const,
      candidateSnapshot: defaultCandidateSnapshotV1,
    }),
}) satisfies NarrativeStableCandidatePreflightInternalV1;

interface NarrativeSessionHarnessV1 {
  readonly contract: NarrativeManagedSurfaceFamilyContractInternalV1;
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly stateNotificationCount: () => number;
}

function pendingV1(
  kind: "say" | "custom",
  sequence = 1,
): unknown {
  const base = {
    definitionId: `narrative.test.${kind}`,
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
  };
  return kind === "say"
    ? {
      kind,
      ...base,
      speakerTextId: "text.test.speaker",
      textId: "text.test.line",
      advancePolicy: "confirm",
    }
    : {
      kind,
      ...base,
      surfaceId: "narrative.custom.test",
      params: { sequence },
    };
}

function createSessionHarnessV1(): NarrativeSessionHarnessV1 {
  const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
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
  const bridge = createNarrativeStablePublisherBridgeInternalV1({
    publisherLeaseRegistry: registry,
    admissionAuthority: authority,
    compositeRuntimeKernel: kernel,
    candidatePreflight: defaultCandidatePreflightV1,
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

function createBridgeSuccessorV1(
  harness: NarrativeSessionHarnessV1,
): NarrativeStablePublisherBridgeInternalV1 {
  return createNarrativeStablePublisherBridgeInternalV1({
    publisherLeaseRegistry: harness.registry,
    admissionAuthority: harness.authority,
    compositeRuntimeKernel: harness.kernel,
    candidatePreflight: defaultCandidatePreflightV1,
    exactAggregateDefinitionSidecars: harness.contract.stableDefinitionSidecars,
    exactAggregateSlotDescriptors: harness.contract.resolvedSlotDescriptors,
  });
}

function currentPreparingRootV1(harness: NarrativeSessionHarnessV1) {
  const entry = harness.kernel.getStateInternalV1().stableRuntimeBindings.find((candidate) =>
    candidate.binding.kind === "preparing"
  );
  if (entry?.binding.kind !== "preparing") throw new Error("expected preparing root");
  return { entry, binding: entry.binding };
}

function settleCurrentRootReadyV1(harness: NarrativeSessionHarnessV1): void {
  const { entry, binding } = currentPreparingRootV1(harness);
  expect(harness.kernel.settleStableReadinessReadyInternalV1({
    readinessEvidence: Object.freeze({
      applicationEpoch: applicationEpochV1,
      surfaceInstanceId: binding.attempt.identity.surfaceInstanceId,
    }),
    publisherLease: entry.desiredTarget.publisherLease,
    sourceRevision: entry.desiredTarget.sourceRevision,
  })).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
}

function settleCurrentRootFailedV1(harness: NarrativeSessionHarnessV1): void {
  const { entry, binding } = currentPreparingRootV1(harness);
  expect(harness.kernel.settleStableReadinessFailedInternalV1({
    readinessEvidence: Object.freeze({
      applicationEpoch: applicationEpochV1,
      surfaceInstanceId: binding.attempt.identity.surfaceInstanceId,
    }),
    publisherLease: entry.desiredTarget.publisherLease,
    sourceRevision: entry.desiredTarget.sourceRevision,
  })).toMatchObject({ kind: "applied", code: "surface.readiness_failed" });
}

function stableContributorCandidatesV1(
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

function setCurrentRootPhaseV1(
  harness: NarrativeSessionHarnessV1,
  phase: "active" | "suspended",
): void {
  const current = harness.kernel.getStateInternalV1();
  const entry = current.stableRuntimeBindings[0];
  if (entry?.binding.kind !== "ready_instance") throw new Error("expected ready root");
  const binding = createManagedSurfaceStableReadyRuntimeBindingInternalV1({
    attempt: entry.binding.instance.attempt,
    phase,
  });
  const entries = Object.freeze(
    current.stableRuntimeBindings.map((candidate) =>
      candidate === entry ? Object.freeze({ ...candidate, binding }) : candidate
    ),
  );
  const next = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: current,
    contributorCandidates: stableContributorCandidatesV1(entries),
  });
  const prepared = harness.kernel.prepareStateInstallInternalV1(current, next);
  expect(harness.kernel.commitPreparedStateInstallInternalV1(prepared, () => true))
    .toBe("installed");
}

function mintHistoryIntentV1(
  harness: NarrativeSessionHarnessV1,
  suffix: string,
): {
  readonly intent: NarrativeStableHistoryOpenIntentInternalV1;
  readonly dispose: () => void;
} {
  const inputRouter = createInputRouterV1();
  const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
    bridge: harness.bridge,
    inputRouter,
    isGestureCurrent: () => true,
  });
  const attempt = admission.issueHistoryOpenAttemptInternalV1();
  if (attempt === null) throw new Error("expected History attempt");
  const result = admission.routeInternalV1(
    admission.createEnvelopeInternalV1({
      actionId: toggleHistoryActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(`gesture.session-test.${suffix}`),
    }),
    attempt,
  );
  expect(result.route).toMatchObject({
    input: { kind: "consumed", code: "input.managed_surface_consumed" },
    surface: { kind: "unchanged", code: "surface.action_routed" },
  });
  if (result.consumerResult?.kind !== "requested") {
    throw new Error("expected History intent");
  }
  return {
    intent: result.consumerResult.intent,
    dispose: () => admission.disposeInternalV1(),
  };
}

function prepareHistoryV1(
  harness: NarrativeSessionHarnessV1,
  lifecycle: NarrativeStableHistoryChildLifecycleInternalV1,
  suffix: string,
): NarrativeStableHistoryChildPreparationInternalV1 {
  const minted = mintHistoryIntentV1(harness, suffix);
  const result = lifecycle.redeemHistoryOpenIntentInternalV1(minted.intent);
  minted.dispose();
  if (result.kind !== "preparing") throw new Error("expected History preparation");
  return result.preparation;
}

function retireCurrentHistoryWithRootCutoverV1(harness: NarrativeSessionHarnessV1): void {
  const child = harness.kernel.getStateInternalV1().transientState.publication
    .orderedInstances.find((instance) =>
      instance.definition.definitionId === "surface.narrative.history"
    );
  if (child === undefined) throw new Error("expected preparing History child");
  expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say", 3)))
    .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
  settleCurrentRootReadyV1(harness);
  expect(
    harness.kernel.getStateInternalV1().transientState.publication.orderedInstances,
  ).toEqual([]);
}

function expectFrozenOwnMethodsV1(value: object, keys: readonly string[]): void {
  expect(Object.isFrozen(value)).toBe(true);
  expect(Reflect.ownKeys(value)).toEqual(keys);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    expect(descriptor).toBeDefined();
    expect(descriptor).toHaveProperty("value");
    expect(descriptor?.value).toEqual(expect.any(Function));
    expect(descriptor?.get).toBeUndefined();
    expect(descriptor?.set).toBeUndefined();
  }
}

function expectTypeErrorV1(run: () => unknown, code: string): void {
  expect(run).toThrowError(TypeError);
  expect(run).toThrowError(code);
}

describe("Narrative stable session", () => {
  it("freezes the exact DOM-free type and runtime surface", () => {
    type ExpectedReadinessEntryV1 =
      | Readonly<{
        readonly kind: "root";
        readonly preparation: NarrativeStableRootPreparationInternalV1;
      }>
      | Readonly<{
        readonly kind: "history";
        readonly preparation: NarrativeStableHistoryChildPreparationInternalV1;
      }>;
    expectTypeOf<NarrativeStableReadinessEntryInternalV1>()
      .toEqualTypeOf<ExpectedReadinessEntryV1>();
    expectTypeOf<keyof NarrativeStableReadinessSnapshotInternalV1>()
      .toEqualTypeOf<"entries">();
    expectTypeOf<keyof NarrativeStableHostLeaseInternalV1>()
      .toEqualTypeOf<"isCurrentInternalV1" | "releaseInternalV1">();
    expectTypeOf<keyof NarrativeStableSessionInternalV1>().toEqualTypeOf<
      | "getReadinessSnapshotInternalV1"
      | "subscribeInternalV1"
      | "getHistoryChildLifecycleInternalV1"
      | "attachHostInternalV1"
    >();
    expectTypeOf<Parameters<typeof createNarrativeStableSessionInternalV1>>()
      .toEqualTypeOf<[
        Readonly<{ readonly bridge: NarrativeStablePublisherBridgeInternalV1 }>,
      ]>();

    const harness = createSessionHarnessV1();
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    expect(createNarrativeStableSessionInternalV1(Object.freeze({
      bridge: harness.bridge,
    }))).toBe(session);
    expectFrozenOwnMethodsV1(session, [
      "getReadinessSnapshotInternalV1",
      "subscribeInternalV1",
      "getHistoryChildLifecycleInternalV1",
      "attachHostInternalV1",
    ]);

    const empty = session.getReadinessSnapshotInternalV1();
    expect(Object.isFrozen(empty)).toBe(true);
    expect(Reflect.ownKeys(empty)).toEqual(["entries"]);
    expect(Object.isFrozen(empty.entries)).toBe(true);
    expect(empty.entries).toEqual([]);
    expect(session.getReadinessSnapshotInternalV1()).toBe(empty);

    const hostIdentity = Object.freeze({ host: "exact-runtime-shape" });
    const lease = session.attachHostInternalV1({ hostIdentity });
    expectFrozenOwnMethodsV1(lease, ["isCurrentInternalV1", "releaseInternalV1"]);
    expect(lease.isCurrentInternalV1()).toBe(true);
    lease.releaseInternalV1();
  });

  it("descriptor-captures factory, session, and Host inputs and fences borrowed receivers", () => {
    const harness = createSessionHarnessV1();
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    const factoryInputs = [
      null,
      undefined,
      Object.freeze({}),
      Object.freeze({ bridge: harness.bridge, extra: true }),
      Object.freeze({ bridge: Object.freeze({}) }),
    ];
    for (const input of factoryInputs) {
      expectTypeErrorV1(
        () => createNarrativeStableSessionInternalV1(input as never),
        "ui.narrative_stable_session_invalid",
      );
    }
    const bridgeGetter = vi.fn(() => harness.bridge);
    const accessorInput = Object.defineProperty({}, "bridge", {
      enumerable: true,
      get: bridgeGetter,
    });
    expectTypeErrorV1(
      () => createNarrativeStableSessionInternalV1(accessorInput as never),
      "ui.narrative_stable_session_invalid",
    );
    expect(bridgeGetter).not.toHaveBeenCalled();

    const snapshotBefore = session.getReadinessSnapshotInternalV1();
    const stateBefore = harness.kernel.getStateInternalV1();
    const methodReceiverCases = [
      () => Reflect.apply(session.getReadinessSnapshotInternalV1, Object.freeze({}), []),
      () => Reflect.apply(session.getHistoryChildLifecycleInternalV1, Object.freeze({}), []),
      () => Reflect.apply(session.subscribeInternalV1, Object.freeze({}), [vi.fn()]),
      () =>
        Reflect.apply(session.attachHostInternalV1, Object.freeze({}), [{
          hostIdentity: Object.freeze({}),
        }]),
    ];
    for (const run of methodReceiverCases) {
      expectTypeErrorV1(run, "ui.narrative_stable_session_invalid");
    }

    const hostGetter = vi.fn(() => Object.freeze({}));
    const hostAccessor = Object.defineProperty({}, "hostIdentity", {
      enumerable: true,
      get: hostGetter,
    });
    for (
      const input of [
        null,
        Object.freeze({}),
        Object.freeze({ hostIdentity: null }),
        Object.freeze({ hostIdentity: "not-an-object" }),
        Object.freeze({ hostIdentity: Object.freeze({}), extra: true }),
        hostAccessor,
      ]
    ) {
      expectTypeErrorV1(
        () => session.attachHostInternalV1(input as never),
        "ui.narrative_stable_host_attachment_invalid",
      );
    }
    expect(hostGetter).not.toHaveBeenCalled();
    expect(session.getReadinessSnapshotInternalV1()).toBe(snapshotBefore);
    expect(harness.kernel.getStateInternalV1()).toBe(stateBefore);
  });

  it("retains one session-owned lifecycle and fences a same-kernel bridge successor ABA", () => {
    const harness = createSessionHarnessV1();
    const lifecycleBeforeSession = createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: harness.bridge,
    });
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    expect(session.getHistoryChildLifecycleInternalV1()).toBe(lifecycleBeforeSession);
    expect(createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: harness.bridge,
    })).toBe(lifecycleBeforeSession);

    const lease = session.attachHostInternalV1({
      hostIdentity: Object.freeze({ host: "predecessor" }),
    });
    harness.bridge.disposeInternalV1();
    expect(lease.isCurrentInternalV1()).toBe(false);
    const terminalEmpty = session.getReadinessSnapshotInternalV1();
    expect(terminalEmpty.entries).toEqual([]);
    expect(session.getReadinessSnapshotInternalV1()).toBe(terminalEmpty);
    expect(session.getHistoryChildLifecycleInternalV1()).toBe(lifecycleBeforeSession);
    const terminalListener = vi.fn();
    const unsubscribe = session.subscribeInternalV1(terminalListener);
    unsubscribe();
    unsubscribe();
    expect(terminalListener).not.toHaveBeenCalled();
    expectTypeErrorV1(
      () => session.attachHostInternalV1({ hostIdentity: Object.freeze({}) }),
      "ui.narrative_stable_host_attachment_invalid",
    );
    expectTypeErrorV1(
      () => createNarrativeStableSessionInternalV1({ bridge: harness.bridge }),
      "ui.narrative_stable_session_invalid",
    );

    const successorBridge = createBridgeSuccessorV1(harness);
    const successorSession = createNarrativeStableSessionInternalV1({
      bridge: successorBridge,
    });
    const successorLifecycle = successorSession.getHistoryChildLifecycleInternalV1();
    expect(successorSession).not.toBe(session);
    expect(successorLifecycle).not.toBe(lifecycleBeforeSession);
    expect(createNarrativeStableSessionInternalV1({ bridge: successorBridge }))
      .toBe(successorSession);
    expect(createNarrativeStableHistoryChildLifecycleInternalV1({
      bridge: successorBridge,
    })).toBe(successorLifecycle);
    successorBridge.disposeInternalV1();
  });

  it("treats external Coordinator disposal as a silent terminal fence", () => {
    const harness = createSessionHarnessV1();
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
      .toMatchObject({ kind: "applied" });
    expect(
      session.getReadinessSnapshotInternalV1().entries.map(
        (entry: NarrativeStableReadinessEntryInternalV1) => entry.kind,
      ),
    )
      .toEqual(["root"]);
    const lifecycle = session.getHistoryChildLifecycleInternalV1();
    const listener = vi.fn();
    const unsubscribe = session.subscribeInternalV1(listener);
    const lease = session.attachHostInternalV1({
      hostIdentity: Object.freeze({ host: "external-terminal" }),
    });

    expect(harness.kernel.transitionTransientInternalV1({
      kind: "dispose_coordinator",
    })).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });
    expect(listener).not.toHaveBeenCalled();
    expect(lease.isCurrentInternalV1()).toBe(false);
    const terminal = session.getReadinessSnapshotInternalV1();
    expect(terminal.entries).toEqual([]);
    expect(session.getReadinessSnapshotInternalV1()).toBe(terminal);
    expect(session.getHistoryChildLifecycleInternalV1()).toBe(lifecycle);
    expectTypeErrorV1(
      () => session.attachHostInternalV1({ hostIdentity: Object.freeze({}) }),
      "ui.narrative_stable_host_attachment_invalid",
    );
    const terminalListener = vi.fn();
    const terminalUnsubscribe = session.subscribeInternalV1(terminalListener);
    terminalUnsubscribe();
    terminalUnsubscribe();
    expect(terminalListener).not.toHaveBeenCalled();
    unsubscribe();
    unsubscribe();
  });

  it("fences Host authority inside an earlier raw Coordinator-terminal listener", () => {
    for (const operation of ["current", "attach", "factory"] as const) {
      const harness = createSessionHarnessV1();
      const hostIdentity = Object.freeze({ host: `terminal-window-${operation}` });
      let session!: NarrativeStableSessionInternalV1;
      let lease!: NarrativeStableHostLeaseInternalV1;
      let outcome: boolean | string | null = null;
      const unsubscribeRaw = harness.kernel.subscribeStateInternalV1(() => {
        if (
          !harness.kernel.getStateInternalV1().transientState.publication.coordinatorDisposed
        ) {
          return;
        }
        try {
          if (operation === "current") {
            outcome = lease.isCurrentInternalV1();
          } else if (operation === "attach") {
            session.attachHostInternalV1({ hostIdentity });
            outcome = "attached";
          } else {
            createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
            outcome = "created";
          }
        } catch (error) {
          outcome = error instanceof TypeError ? error.message : "unexpected error";
        }
      });
      session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
      lease = session.attachHostInternalV1({ hostIdentity });

      expect(harness.kernel.transitionTransientInternalV1({
        kind: "dispose_coordinator",
      })).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });
      expect(outcome).toBe(
        operation === "current"
          ? false
          : operation === "attach"
          ? "ui.narrative_stable_host_attachment_invalid"
          : "ui.narrative_stable_session_invalid",
      );
      expect(lease.isCurrentInternalV1()).toBe(false);
      unsubscribeRaw();
    }
  });

  it("lazy-refreshes History preparation for a raw listener registered before the session", () => {
    const harness = createSessionHarnessV1();
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
      .toMatchObject({ kind: "applied" });
    settleCurrentRootReadyV1(harness);
    let session!: NarrativeStableSessionInternalV1;
    const observedHolder: {
      current: NarrativeStableReadinessSnapshotInternalV1 | null;
    } = { current: null };
    const unsubscribeRaw = harness.kernel.subscribeStateInternalV1(() => {
      const child = harness.kernel.getStateInternalV1().transientState.publication
        .orderedInstances.find((instance) =>
          instance.definition.definitionId === "surface.narrative.history" &&
          instance.readiness.kind === "preparing"
        );
      if (child !== undefined) {
        observedHolder.current = session.getReadinessSnapshotInternalV1();
      }
    });
    session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    const preparation = prepareHistoryV1(
      harness,
      session.getHistoryChildLifecycleInternalV1(),
      "raw-listener-first-read",
    );

    const observed = observedHolder.current;
    expect(observed?.entries).toEqual([{ kind: "history", preparation }]);
    expect(session.getReadinessSnapshotInternalV1()).toBe(observed);
    unsubscribeRaw();
  });

  it("caches exact root and History vectors in root-first order", () => {
    const harness = createSessionHarnessV1();
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    const observed: NarrativeStableReadinessSnapshotInternalV1[] = [];
    const unsubscribe = session.subscribeInternalV1(() => {
      observed.push(session.getReadinessSnapshotInternalV1());
    });

    const initialEmpty = session.getReadinessSnapshotInternalV1();
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
      .toMatchObject({ kind: "applied" });
    const rootOnly = session.getReadinessSnapshotInternalV1();
    expect(rootOnly).not.toBe(initialEmpty);
    expect(rootOnly.entries).toHaveLength(1);
    expect(rootOnly.entries[0]?.kind).toBe("root");
    if (rootOnly.entries[0]?.kind !== "root") throw new Error("expected root entry");
    expect(Object.isFrozen(rootOnly.entries[0])).toBe(true);
    expect(Object.isFrozen(rootOnly.entries[0].preparation)).toBe(true);
    expect(Reflect.ownKeys(rootOnly.entries[0].preparation)).toEqual([]);
    expect(session.getReadinessSnapshotInternalV1()).toBe(rootOnly);

    settleCurrentRootReadyV1(harness);
    const readyEmpty = session.getReadinessSnapshotInternalV1();
    expect(readyEmpty).not.toBe(initialEmpty);
    expect(readyEmpty).not.toBe(rootOnly);
    expect(readyEmpty.entries).toEqual([]);
    const observedBeforeSameVector = observed.length;
    setCurrentRootPhaseV1(harness, "suspended");
    setCurrentRootPhaseV1(harness, "active");
    expect(session.getReadinessSnapshotInternalV1()).toBe(readyEmpty);
    expect(observed).toHaveLength(observedBeforeSameVector);

    const lifecycle = session.getHistoryChildLifecycleInternalV1();
    const historyPreparation = prepareHistoryV1(harness, lifecycle, "history-only");
    const historyOnly = session.getReadinessSnapshotInternalV1();
    expect(historyOnly.entries).toEqual([{
      kind: "history",
      preparation: historyPreparation,
    }]);
    expect(Object.isFrozen(historyOnly)).toBe(true);
    expect(Object.isFrozen(historyOnly.entries)).toBe(true);
    expect(Object.isFrozen(historyOnly.entries[0]!)).toBe(true);
    expect(session.getReadinessSnapshotInternalV1()).toBe(historyOnly);

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("custom", 2)))
      .toMatchObject({ kind: "applied" });
    const rootAndHistory = session.getReadinessSnapshotInternalV1();
    expect(
      rootAndHistory.entries.map((entry: NarrativeStableReadinessEntryInternalV1) => entry.kind),
    ).toEqual([
      "root",
      "history",
    ]);
    expect(rootAndHistory.entries[1]?.preparation).toBe(historyPreparation);
    expect(session.getReadinessSnapshotInternalV1()).toBe(rootAndHistory);

    settleCurrentRootFailedV1(harness);
    const retainedHistory = session.getReadinessSnapshotInternalV1();
    expect(retainedHistory).not.toBe(rootAndHistory);
    expect(retainedHistory.entries).toEqual([{
      kind: "history",
      preparation: historyPreparation,
    }]);
    expect(retainedHistory).not.toBe(historyOnly);

    retireCurrentHistoryWithRootCutoverV1(harness);
    const retiredEmpty = session.getReadinessSnapshotInternalV1();
    expect(retiredEmpty.entries).toEqual([]);
    expect(retiredEmpty).not.toBe(readyEmpty);
    expect(observed.at(-1)).toBe(retiredEmpty);
    expect(observed.every((snapshot) => snapshot.entries.length <= 2)).toBe(true);
    unsubscribe();
    unsubscribe();
  });

  it("contains subscriber faults and publishes only exact vector changes", () => {
    const harness = createSessionHarnessV1();
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    const failing = vi.fn(() => {
      throw new Error("listener failure");
    });
    const reentrantSnapshots: NarrativeStableReadinessSnapshotInternalV1[] = [];
    const healthy = vi.fn(() => {
      const snapshot = session.getReadinessSnapshotInternalV1();
      reentrantSnapshots.push(snapshot, session.getReadinessSnapshotInternalV1());
    });
    const unsubscribeFailing = session.subscribeInternalV1(failing);
    const unsubscribeHealthy = session.subscribeInternalV1(healthy);

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
      .toMatchObject({ kind: "applied" });
    expect(failing).toHaveBeenCalledOnce();
    expect(healthy).toHaveBeenCalledOnce();
    expect(reentrantSnapshots[0]).toBe(reentrantSnapshots[1]);
    const calls = healthy.mock.calls.length;
    expect(session.getReadinessSnapshotInternalV1()).toBe(reentrantSnapshots[0]);
    expect(healthy).toHaveBeenCalledTimes(calls);

    unsubscribeFailing();
    unsubscribeFailing();
    unsubscribeHealthy();
    unsubscribeHealthy();
    settleCurrentRootReadyV1(harness);
    expect(failing).toHaveBeenCalledOnce();
    expect(healthy).toHaveBeenCalledTimes(calls);

    const afterUnsubscribe = session.getReadinessSnapshotInternalV1();
    harness.bridge.disposeInternalV1();
    expect(session.getReadinessSnapshotInternalV1().entries).toEqual([]);
    expect(failing).toHaveBeenCalledOnce();
    expect(healthy).toHaveBeenCalledTimes(calls);
    expect(afterUnsubscribe.entries).toEqual([]);
  });

  it("stops a captured subscriber vector when an earlier listener terminalizes the bridge", () => {
    const harness = createSessionHarnessV1();
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    const terminal = vi.fn(() => {
      expect(harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
    });
    const late = vi.fn();
    session.subscribeInternalV1(terminal);
    session.subscribeInternalV1(late);

    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
      .toMatchObject({ kind: "applied" });
    expect(terminal).toHaveBeenCalledOnce();
    expect(late).not.toHaveBeenCalled();
    expect(session.getReadinessSnapshotInternalV1().entries).toEqual([]);
  });

  it("rotates one logical Host generation with microtask ABA fencing and zero Surface delta", async () => {
    const harness = createSessionHarnessV1();
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
      .toMatchObject({ kind: "applied" });
    const hostIdentity = Object.freeze({ host: "same-logical-host" });
    const foreignHost = Object.freeze({ host: "foreign-logical-host" });
    const state = harness.kernel.getStateInternalV1();
    const snapshot = session.getReadinessSnapshotInternalV1();
    const notifications = harness.stateNotificationCount();

    const predecessor = session.attachHostInternalV1({ hostIdentity });
    expect(predecessor.isCurrentInternalV1()).toBe(true);
    expectTypeErrorV1(
      () => session.attachHostInternalV1({ hostIdentity: foreignHost }),
      "ui.narrative_stable_host_lease_conflict",
    );
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(session.getReadinessSnapshotInternalV1()).toBe(snapshot);

    const successor = session.attachHostInternalV1({ hostIdentity });
    expect(successor).not.toBe(predecessor);
    expect(predecessor.isCurrentInternalV1()).toBe(false);
    expect(successor.isCurrentInternalV1()).toBe(true);
    expect(() => Reflect.apply(predecessor.isCurrentInternalV1, Object.freeze({}), []))
      .toThrowError(TypeError);
    expect(() => Reflect.apply(predecessor.releaseInternalV1, Object.freeze({}), []))
      .toThrowError(TypeError);
    successor.releaseInternalV1();
    successor.releaseInternalV1();
    expectTypeErrorV1(
      () => session.attachHostInternalV1({ hostIdentity: foreignHost }),
      "ui.narrative_stable_host_lease_conflict",
    );
    const strictModeSuccessor = session.attachHostInternalV1({ hostIdentity });
    await Promise.resolve();
    expect(successor.isCurrentInternalV1()).toBe(false);
    expect(strictModeSuccessor.isCurrentInternalV1()).toBe(true);

    strictModeSuccessor.releaseInternalV1();
    await Promise.resolve();
    expect(strictModeSuccessor.isCurrentInternalV1()).toBe(false);
    const afterGrace = session.attachHostInternalV1({ hostIdentity: foreignHost });
    expect(afterGrace.isCurrentInternalV1()).toBe(true);
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(session.getReadinessSnapshotInternalV1()).toBe(snapshot);
    expect(harness.stateNotificationCount()).toBe(notifications);
    expect(snapshot.entries.map((entry) => entry.kind)).toEqual(["root"]);
    expect(currentPreparingRootV1(harness).binding.kind).toBe("preparing");
    afterGrace.releaseInternalV1();
  });

  it("keeps snapshot, lease, and subscription retention bounded across 10k churn", async () => {
    const harness = createSessionHarnessV1();
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    const hostIdentity = Object.freeze({ host: "bounded-logical-host" });
    const state = harness.kernel.getStateInternalV1();
    const snapshot = session.getReadinessSnapshotInternalV1();
    const notifications = harness.stateNotificationCount();
    const first = session.attachHostInternalV1({ hostIdentity });
    let current = first;

    for (let index = 0; index < 10_000; index += 1) {
      const unsubscribe = session.subscribeInternalV1(() => {
        throw new Error("bounded listener must remain silent");
      });
      unsubscribe();
      unsubscribe();
      current.releaseInternalV1();
      current = session.attachHostInternalV1({ hostIdentity });
      expect(session.getReadinessSnapshotInternalV1()).toBe(snapshot);
    }
    await Promise.resolve();

    expect(first.isCurrentInternalV1()).toBe(false);
    expect(current.isCurrentInternalV1()).toBe(true);
    expect(harness.kernel.getStateInternalV1()).toBe(state);
    expect(harness.stateNotificationCount()).toBe(notifications);
    expect(session.getReadinessSnapshotInternalV1()).toBe(snapshot);
    current.releaseInternalV1();
    await Promise.resolve();
    const finalLease = session.attachHostInternalV1({
      hostIdentity: Object.freeze({ host: "bounded-successor" }),
    });
    expect(finalLease.isCurrentInternalV1()).toBe(true);
    finalLease.releaseInternalV1();
  });
});
