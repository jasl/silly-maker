// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import {
  emptyNarrativeHistoryV1,
  parseNonNegativeSafeInteger,
  type NarrativeHistoryV1,
} from "@sillymaker/base";
import { defaultPlayerProfileV1 } from "@sillymaker/base/runtime";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  inputHandledV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
} from "../input/contracts.ts";
import * as inputRouterModuleV1 from "../input/input-router.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import * as managedSurfaceActionRouteModuleV1 from "../managed-surfaces/managed-surface-action-route.ts";
import type {
  ManagedSurfacePreparedContractBoundActionBindingInternalV1,
} from "../managed-surfaces/managed-surface-action-route.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceGestureIdV1,
  type ManagedSurfaceDismissKindV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import {
  createManagedSurfaceCompositeKernelBundleInternalV1,
  type ManagedSurfaceCompositeKernelBundleInternalV1,
} from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import type { ManagedSurfaceStableAdmissionAuthorityInternalV1 } from "../managed-surfaces/managed-surface-stable-admission.ts";
import {
  createManagedSurfaceStableReadyRuntimeBindingInternalV1,
  reconcileManagedSurfaceStableRootReservationsInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableRootReservationContributorCandidateInternalV1,
  type ManagedSurfaceStableRuntimeEntryInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import type { ManagedSurfaceStablePublisherLeaseRegistryInternalV1 } from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import {
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  createNarrativeStableHistoryChildLifecycleInternalV1,
  createNarrativeStablePhysicalActionAdmissionInternalV1,
  createNarrativeStablePublisherBridgeInternalV1,
  createNarrativeStableSessionInternalV1,
  createNarrativeStableHostRuntimeInternalV1,
  prepareNarrativeStableHostReadyCommitInternalV1,
  type NarrativeManagedSurfaceFamilyContractInternalV1,
  type NarrativeStableCandidatePreflightInternalV1,
  type NarrativeStableDialoguePlayerObservationInternalV1,
  type NarrativeStableHistoryChildControllerInternalV1,
  type NarrativeStableHistoryChildLifecycleInternalV1,
  type NarrativeStableHistoryChildLifecycleResultInternalV1,
  type NarrativeStableHistoryChildPreparationInternalV1,
  type NarrativeStableHistoryOpenIntentInternalV1,
  type NarrativeStableHistoryObservationPortInternalV1,
  type NarrativeStablePublisherBridgeInternalV1,
  type NarrativeStableSemanticResolutionPortInternalV1,
} from "./narrative-managed-surface-family.ts";
import type {
  CreateNarrativeStableHostRuntimeInputInternalV1,
  NarrativeStableHostAttachmentInternalV1,
  NarrativeStableHostReadyCommitInternalV1,
  NarrativeStableHostReadyCommitPreparationResultInternalV1,
  NarrativeStableHostRenderEntryInternalV1,
  NarrativeStableHostRenderKeyInternalV1,
  NarrativeStableHostRenderPhaseInternalV1,
  NarrativeStableHostRenderSnapshotInternalV1,
  NarrativeStableHostRenderSourceInternalV1,
  NarrativeStableHostRuntimeInternalV1,
  PrepareNarrativeStableHostReadyCommitInputInternalV1,
  NarrativeStableHostLeaseInternalV1,
  NarrativeStableReadinessSettlementResultInternalV1,
  NarrativeStableReadinessEntryInternalV1,
  NarrativeStableReadinessSnapshotInternalV1,
  NarrativeStableRootPreparationInternalV1,
  NarrativeStableSessionInternalV1,
} from "./narrative-managed-surface-session.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(119);
const toggleHistoryActionIdV1 = parseManagedSurfaceActionIdV1(
  playerInputActionIdsV1.toggleHistory,
);
const cancelHistoryActionIdV1 = parseManagedSurfaceActionIdV1(
  systemInputActionIdsV1.cancel,
);
const defaultSemanticDispatchPortV1 = Object.freeze({
  dispatchResolutionInternalV1: (_request: unknown) => Promise.resolve(undefined),
}) satisfies NarrativeStableSemanticResolutionPortInternalV1;
const defaultHistoryObservationPortV1 = Object.freeze({
  getSnapshotInternalV1: () => emptyNarrativeHistoryV1,
  subscribeInternalV1: (_listener: () => void) => Object.freeze(() => {}),
}) satisfies NarrativeStableHistoryObservationPortInternalV1;
const defaultDialoguePlayerProfilePortV1 = Object.freeze({
  getSnapshotInternalV1: () => defaultPlayerProfileV1,
  subscribeInternalV1: (_listener: () => void) => Object.freeze(() => {}),
  markSeenInternalV1: (_definitionId: string, _seenRevision: number) => {},
});
const defaultDialoguePlayerClockPortV1 = Object.freeze({
  nowInternalV1: () => 0,
  requestTickInternalV1: (_callback: (nowMs: number) => void) => Object.freeze(() => {}),
  prefersReducedMotionInternalV1: () => false,
});
const defaultDialoguePlayerTextResolverPortV1 = Object.freeze({
  resolveTextInternalV1: (textId: string) => textId,
});
const defaultCandidateSnapshotV1 = Object.freeze({
  rendererComponent: Object.freeze({ kind: "session-test-renderer" }),
  visualConfig: Object.freeze({ skin: "session-test" }),
  semanticDispatchPort: defaultSemanticDispatchPortV1,
  historyObservationPort: defaultHistoryObservationPortV1,
  historyAvailabilityPort: Object.freeze({
    readHistoryAvailabilityInternalV1: () => true,
  }),
  playerProfile: defaultDialoguePlayerProfilePortV1,
  presentationClock: defaultDialoguePlayerClockPortV1,
  textResolver: defaultDialoguePlayerTextResolverPortV1,
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

afterEach(() => {
  vi.restoreAllMocks();
});

interface NarrativeSessionHarnessV1 {
  readonly contract: NarrativeManagedSurfaceFamilyContractInternalV1;
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly kernelBundle: ManagedSurfaceCompositeKernelBundleInternalV1;
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

function createSessionHarnessV1(
  candidatePreflight: NarrativeStableCandidatePreflightInternalV1 = defaultCandidatePreflightV1,
): NarrativeSessionHarnessV1 {
  const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const kernelBundle = createManagedSurfaceCompositeKernelBundleInternalV1({
    applicationEpoch: applicationEpochV1,
    recipe: {
      resolvedOwnerIds: contract.resolvedOwnerIds,
      resolvedSlotDescriptors: contract.resolvedSlotDescriptors,
    },
    definitionSidecars: contract.stableDefinitionSidecars,
  });
  const registry = kernelBundle.publisherLeaseRegistry;
  const authority = kernelBundle.admissionAuthority;
  const kernel = kernelBundle.compositeRuntimeKernel;
  const bridge = createNarrativeStablePublisherBridgeInternalV1({
    kernelBundle,
    candidatePreflight,
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
    kernelBundle,
    bridge,
    stateNotificationCount: () => stateNotifications,
  };
}

function createBridgeSuccessorV1(
  harness: NarrativeSessionHarnessV1,
): NarrativeStablePublisherBridgeInternalV1 {
  return createNarrativeStablePublisherBridgeInternalV1({
    kernelBundle: harness.kernelBundle,
    candidatePreflight: defaultCandidatePreflightV1,
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
  inputRouter = createInputRouterV1(),
  isGestureCurrent: () => boolean = () => true,
): {
  readonly intent: NarrativeStableHistoryOpenIntentInternalV1;
  readonly dispose: () => void;
} {
  const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
    bridge: harness.bridge,
    inputRouter,
    isGestureCurrent,
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

interface NarrativeHostFixtureV1 {
  readonly harness: NarrativeSessionHarnessV1;
  readonly session: NarrativeStableSessionInternalV1;
  readonly hostIdentity: object;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly isGestureCurrent: () => boolean;
  readonly runtime: NarrativeStableHostRuntimeInternalV1;
  disposePortal(): void;
}

function createNarrativeHostFixtureV1(input: {
  readonly historyObservationPort?: NarrativeStableHistoryObservationPortInternalV1;
  readonly playerProfile?: unknown;
  readonly presentationClock?: unknown;
  readonly textResolver?: unknown;
} = {}): NarrativeHostFixtureV1 {
  const historyObservationPort = input.historyObservationPort ?? defaultHistoryObservationPortV1;
  const harness = createSessionHarnessV1(Object.freeze({
    preflightCandidateInternalV1: () =>
      Object.freeze({
        kind: "captured" as const,
        candidateSnapshot: Object.freeze({
          ...defaultCandidateSnapshotV1,
          historyObservationPort,
          playerProfile: input.playerProfile ?? defaultCandidateSnapshotV1.playerProfile,
          presentationClock: input.presentationClock ??
            defaultCandidateSnapshotV1.presentationClock,
          textResolver: input.textResolver ?? defaultCandidateSnapshotV1.textResolver,
        }),
      }),
  }));
  const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
  const hostIdentity = Object.freeze({ host: "narrative-host-fixture" });
  const portalContainer = document.createElement("div");
  document.body.append(portalContainer);
  const inputRouter = createInputRouterV1();
  const isGestureCurrent = () => true;
  const runtime = createNarrativeStableHostRuntimeInternalV1(Object.freeze({
    session,
    hostIdentity,
    portalContainer,
    inputRouter,
    isGestureCurrent,
  }));
  return {
    harness,
    session,
    hostIdentity,
    portalContainer,
    inputRouter,
    isGestureCurrent,
    runtime,
    disposePortal(): void {
      portalContainer.remove();
    },
  };
}

function preparingEntryV1(
  runtime: NarrativeStableHostRuntimeInternalV1,
  kind: "dialogue" | "history",
): NarrativeStableHostRenderEntryInternalV1 {
  const entry = runtime.renderSource.getSnapshotInternalV1().entries.find((candidate) =>
    candidate.kind === kind && candidate.phase === "preparing"
  );
  if (entry === undefined) throw new Error(`expected preparing ${kind} entry`);
  return entry;
}

type NarrativeStableHistoryHostRenderEntryV1 = Extract<
  NarrativeStableHostRenderEntryInternalV1,
  { readonly kind: "history" }
>;

type NarrativeStableDialogueHostRenderEntryV1 = Extract<
  NarrativeStableHostRenderEntryInternalV1,
  { readonly kind: "dialogue" }
>;

function currentDialogueEntryV1(
  runtime: NarrativeStableHostRuntimeInternalV1,
  phase?: "preparing" | "active" | "suspended",
): NarrativeStableDialogueHostRenderEntryV1 {
  const entry = runtime.renderSource.getSnapshotInternalV1().entries.find((candidate) =>
    candidate.kind === "dialogue" && (phase === undefined || candidate.phase === phase)
  );
  if (entry?.kind !== "dialogue") {
    throw new Error(
      phase === undefined ? "expected current Dialogue entry" : `expected ${phase} Dialogue entry`,
    );
  }
  return entry;
}

function currentHistoryEntryV1(
  runtime: NarrativeStableHostRuntimeInternalV1,
  phase?: "preparing" | "active" | "suspended",
): NarrativeStableHistoryHostRenderEntryV1 {
  const entry = runtime.renderSource.getSnapshotInternalV1().entries.find((candidate) =>
    candidate.kind === "history" && (phase === undefined || candidate.phase === phase)
  );
  if (entry?.kind !== "history") {
    throw new Error(
      phase === undefined ? "expected current History entry" : `expected ${phase} History entry`,
    );
  }
  return entry;
}

function exactHistoryControllerV1(
  entry: NarrativeStableHistoryHostRenderEntryV1,
): NarrativeStableHistoryChildControllerInternalV1 {
  expect(Object.hasOwn(entry, "controller")).toBe(true);
  expect(Object.isFrozen(entry.controller)).toBe(true);
  expectFrozenOwnMethodsV1(entry.controller, [
    "closeInternalV1",
    "dismissInternalV1",
  ]);
  return entry.controller;
}

function expectExactHistoryLifecycleResultV1(
  result: NarrativeStableHistoryChildLifecycleResultInternalV1,
  kind: NarrativeStableHistoryChildLifecycleResultInternalV1["kind"],
): void {
  expect(result).toEqual({ kind, completion: null });
  expect(Object.isFrozen(result)).toBe(true);
  expect(Reflect.ownKeys(result)).toEqual(["kind", "completion"]);
}

function trackManagedInputRegistrationsV1(): Readonly<{
  activeCount(router: ReturnType<typeof createInputRouterV1>): number;
}> {
  const registerManagedInputHandler = inputRouterModuleV1.registerManagedInputHandlerV1;
  const activeByRouter = new WeakMap<
    ReturnType<typeof createInputRouterV1>,
    Set<() => void>
  >();
  vi.spyOn(inputRouterModuleV1, "registerManagedInputHandlerV1").mockImplementation(
    (router, registration) => {
      const unregister = registerManagedInputHandler(router, registration);
      const active = activeByRouter.get(router) ?? new Set<() => void>();
      activeByRouter.set(router, active);
      let registered = true;
      const unregisterTracked = (): void => {
        if (!registered) return;
        registered = false;
        active.delete(unregisterTracked);
        unregister();
      };
      active.add(unregisterTracked);
      return unregisterTracked;
    },
  );
  return Object.freeze({
    activeCount: (router: ReturnType<typeof createInputRouterV1>): number =>
      activeByRouter.get(router)?.size ?? 0,
  });
}

function createPreparingHistoryHostFixtureV1(
  suffix: string,
  sequence: number,
): Readonly<{
  fixture: NarrativeHostFixtureV1;
  historyPreparation: NarrativeStableHistoryChildPreparationInternalV1;
  historyEntry: NarrativeStableHistoryHostRenderEntryV1;
}> {
  const fixture = createNarrativeHostFixtureV1();
  expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", sequence)))
    .toMatchObject({ kind: "applied" });
  const root = preparingEntryV1(fixture.runtime, "dialogue");
  if (root.kind !== "dialogue" || root.preparation === null) {
    throw new Error("expected root preparation");
  }
  expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
    root.preparation,
    prepareReadyCommitV1(fixture.runtime, root, fixture.portalContainer),
  )).toEqual({ kind: "settled", completion: null });
  const minted = mintHistoryIntentV1(
    fixture.harness,
    suffix,
    fixture.inputRouter,
    fixture.isGestureCurrent,
  );
  const history = fixture.session.getHistoryChildLifecycleInternalV1()
    .redeemHistoryOpenIntentInternalV1(minted.intent);
  minted.dispose();
  if (history.kind !== "preparing") throw new Error("expected History preparation");
  return Object.freeze({
    fixture,
    historyPreparation: history.preparation,
    historyEntry: currentHistoryEntryV1(fixture.runtime, "preparing"),
  });
}

function prepareReadyCommitV1(
  runtime: NarrativeStableHostRuntimeInternalV1,
  entry: NarrativeStableHostRenderEntryInternalV1,
  portalContainer: HTMLDivElement,
): NarrativeStableHostReadyCommitInternalV1 {
  const portalShell = document.createElement("div");
  portalShell.tabIndex = -1;
  portalContainer.append(portalShell);
  const result = prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
    hostRuntime: runtime,
    renderEntry: entry,
    portalShell,
    initialFocusTarget: portalShell,
  }));
  if (result.kind !== "prepared") {
    throw new Error(`expected prepared ready commit, got ${result.kind}`);
  }
  return result.readyCommit;
}

function createReadyHistoryHostFixtureV1(
  suffix: string,
  sequence: number,
  historyObservationPort: NarrativeStableHistoryObservationPortInternalV1 =
    defaultHistoryObservationPortV1,
): Readonly<{
  fixture: NarrativeHostFixtureV1;
  historyEntry: Extract<
    NarrativeStableHostRenderEntryInternalV1,
    { readonly kind: "history" }
  >;
}> {
  const fixture = createNarrativeHostFixtureV1({ historyObservationPort });
  expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", sequence)))
    .toMatchObject({ kind: "applied" });
  const root = preparingEntryV1(fixture.runtime, "dialogue");
  if (root.kind !== "dialogue" || root.preparation === null) {
    throw new Error("expected root preparation");
  }
  expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
    root.preparation,
    prepareReadyCommitV1(fixture.runtime, root, fixture.portalContainer),
  )).toEqual({ kind: "settled", completion: null });

  const minted = mintHistoryIntentV1(
    fixture.harness,
    suffix,
    fixture.inputRouter,
    fixture.isGestureCurrent,
  );
  const history = fixture.session.getHistoryChildLifecycleInternalV1()
    .redeemHistoryOpenIntentInternalV1(minted.intent);
  minted.dispose();
  if (history.kind !== "preparing") throw new Error("expected History preparation");
  const historyEntry = preparingEntryV1(fixture.runtime, "history");
  if (historyEntry.kind !== "history" || historyEntry.preparation === null) {
    throw new Error("expected History render preparation");
  }
  expect(fixture.runtime.attachment.settleHistoryReadinessReadyInternalV1(
    history.preparation,
    prepareReadyCommitV1(fixture.runtime, historyEntry, fixture.portalContainer),
  )).toEqual({ kind: "settled", completion: null });
  const readyHistory = fixture.runtime.renderSource.getSnapshotInternalV1().entries.find(
    (entry) => entry.kind === "history" && entry.phase === "active",
  );
  if (readyHistory?.kind !== "history") throw new Error("expected ready History entry");
  return Object.freeze({ fixture, historyEntry: readyHistory });
}

function createConcurrentPendingHostFixtureV1(
  suffix: string,
  sequence: number,
): Readonly<{
  fixture: NarrativeHostFixtureV1;
  historyPreparation: NarrativeStableHistoryChildPreparationInternalV1;
  replacementPreparation: NarrativeStableRootPreparationInternalV1;
}> {
  const fixture = createNarrativeHostFixtureV1();
  expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", sequence)))
    .toMatchObject({ kind: "applied" });
  const root = preparingEntryV1(fixture.runtime, "dialogue");
  if (root.kind !== "dialogue" || root.preparation === null) {
    throw new Error("expected initial root preparation");
  }
  expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
    root.preparation,
    prepareReadyCommitV1(fixture.runtime, root, fixture.portalContainer),
  )).toEqual({ kind: "settled", completion: null });
  const minted = mintHistoryIntentV1(
    fixture.harness,
    `${suffix}-history`,
    fixture.inputRouter,
    fixture.isGestureCurrent,
  );
  const history = fixture.session.getHistoryChildLifecycleInternalV1()
    .redeemHistoryOpenIntentInternalV1(minted.intent);
  minted.dispose();
  if (history.kind !== "preparing") throw new Error("expected History preparation");
  expect(fixture.harness.bridge.reconcilePendingInternalV1(
    pendingV1("say", sequence + 1),
  )).toMatchObject({ kind: "applied" });
  const replacement = fixture.runtime.renderSource.getSnapshotInternalV1().entries.at(-1);
  if (replacement?.kind !== "dialogue" || replacement.preparation === null) {
    throw new Error("expected replacement preparation");
  }
  expect(
    fixture.runtime.renderSource.getSnapshotInternalV1().entries.map((entry) => [
      entry.kind,
      entry.phase,
    ]),
  ).toEqual([
    ["dialogue", "suspended"],
    ["history", "preparing"],
    ["dialogue", "preparing"],
  ]);
  return Object.freeze({
    fixture,
    historyPreparation: history.preparation,
    replacementPreparation: replacement.preparation,
  });
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
    expectTypeOf<NarrativeStableHostRenderPhaseInternalV1>().toEqualTypeOf<
      "preparing" | "active" | "suspended"
    >();
    expectTypeOf<NarrativeStableHostRenderKeyInternalV1>().toMatchTypeOf<string>();
    expectTypeOf<keyof NarrativeStableDialogueHostRenderEntryV1>().toEqualTypeOf<
      | "kind"
      | "phase"
      | "renderKey"
      | "preparation"
      | "initialFocusTargetId"
      | "rendererComponent"
      | "rendererProps"
      | "playerObservation"
    >();
    expectTypeOf<NarrativeStableDialogueHostRenderEntryV1["playerObservation"]>()
      .toEqualTypeOf<NarrativeStableDialoguePlayerObservationInternalV1>();
    expectTypeOf<keyof NarrativeStableHistoryHostRenderEntryV1>().toEqualTypeOf<
      | "kind"
      | "phase"
      | "renderKey"
      | "parentRenderKey"
      | "preparation"
      | "initialFocusTargetId"
      | "rendererComponent"
      | "rendererProps"
      | "historyObservation"
      | "controller"
    >();
    expectTypeOf<NarrativeStableHistoryHostRenderEntryV1["controller"]>()
      .toEqualTypeOf<NarrativeStableHistoryChildControllerInternalV1>();
    expectTypeOf<keyof NarrativeStableHostRenderSnapshotInternalV1>().toEqualTypeOf<"entries">();
    expectTypeOf<keyof NarrativeStableHostRenderSourceInternalV1>().toEqualTypeOf<
      "getSnapshotInternalV1" | "subscribeInternalV1"
    >();
    expectTypeOf<keyof CreateNarrativeStableHostRuntimeInputInternalV1>().toEqualTypeOf<
      "session" | "hostIdentity" | "portalContainer" | "inputRouter" | "isGestureCurrent"
    >();
    expectTypeOf<keyof NarrativeStableHostRuntimeInternalV1>().toEqualTypeOf<
      "attachment" | "renderSource"
    >();
    expectTypeOf<keyof NarrativeStableHostAttachmentInternalV1>().toEqualTypeOf<
      | "settleRootReadinessReadyInternalV1"
      | "settleRootReadinessFailedInternalV1"
      | "settleHistoryReadinessReadyInternalV1"
      | "settleHistoryReadinessFailedInternalV1"
      | "releaseInternalV1"
    >();
    expectTypeOf<keyof PrepareNarrativeStableHostReadyCommitInputInternalV1>().toEqualTypeOf<
      "hostRuntime" | "renderEntry" | "portalShell" | "initialFocusTarget"
    >();
    expectTypeOf<NarrativeStableReadinessSettlementResultInternalV1>().toEqualTypeOf<
      | Readonly<{ readonly kind: "settled"; readonly completion: null }>
      | Readonly<{ readonly kind: "stale"; readonly completion: null }>
      | Readonly<{ readonly kind: "faulted"; readonly completion: null }>
    >();
    expectTypeOf<NarrativeStableHostReadyCommitPreparationResultInternalV1>().toEqualTypeOf<
      | Readonly<{
        readonly kind: "prepared";
        readonly readyCommit: NarrativeStableHostReadyCommitInternalV1;
        readonly completion: null;
      }>
      | Readonly<{ readonly kind: "reattached"; readonly completion: null }>
      | Readonly<{ readonly kind: "stale"; readonly completion: null }>
      | Readonly<{ readonly kind: "faulted"; readonly completion: null }>
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

  it("creates the exact Host runtime and atomically commits a laid-out root preparation", () => {
    const fixture = createNarrativeHostFixtureV1();
    const { runtime } = fixture;
    expect(Object.isFrozen(runtime)).toBe(true);
    expect(Reflect.ownKeys(runtime)).toEqual(["attachment", "renderSource"]);
    expectFrozenOwnMethodsV1(runtime.attachment, [
      "settleRootReadinessReadyInternalV1",
      "settleRootReadinessFailedInternalV1",
      "settleHistoryReadinessReadyInternalV1",
      "settleHistoryReadinessFailedInternalV1",
      "releaseInternalV1",
    ]);
    expectFrozenOwnMethodsV1(runtime.renderSource, [
      "getSnapshotInternalV1",
      "subscribeInternalV1",
    ]);
    const empty = runtime.renderSource.getSnapshotInternalV1();
    expect(Object.isFrozen(empty)).toBe(true);
    expect(Reflect.ownKeys(empty)).toEqual(["entries"]);
    expect(Object.isFrozen(empty.entries)).toBe(true);
    expect(empty.entries).toEqual([]);
    expect(runtime.renderSource.getSnapshotInternalV1()).toBe(empty);

    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const preparingSnapshot = runtime.renderSource.getSnapshotInternalV1();
    expect(preparingSnapshot).not.toBe(empty);
    expect(preparingSnapshot.entries).toHaveLength(1);
    const root = preparingEntryV1(runtime, "dialogue");
    expect(root).toMatchObject({
      kind: "dialogue",
      phase: "preparing",
      preparation: expect.any(Object),
      rendererProps: {
        kind: "dialogue",
        pending: { kind: "say" },
      },
    });
    expect(typeof root.renderKey).toBe("string");
    expect(Object.isFrozen(root)).toBe(true);
    if (root.kind !== "dialogue" || root.preparation === null) {
      throw new Error("expected root preparation");
    }
    const readyCommit = prepareReadyCommitV1(runtime, root, fixture.portalContainer);
    expect(Object.isFrozen(readyCommit)).toBe(true);
    expect(Reflect.ownKeys(readyCommit)).toEqual([]);
    const settled = runtime.attachment.settleRootReadinessReadyInternalV1(
      root.preparation,
      readyCommit,
    );
    expect(settled).toEqual({ kind: "settled", completion: null });
    expect(Object.isFrozen(settled)).toBe(true);
    const active = runtime.renderSource.getSnapshotInternalV1();
    expect(active.entries).toHaveLength(1);
    expect(active.entries[0]).toMatchObject({
      kind: "dialogue",
      phase: "active",
      preparation: null,
      renderKey: root.renderKey,
    });
    expect(
      runtime.attachment.settleRootReadinessReadyInternalV1(root.preparation, readyCommit),
    ).toEqual({ kind: "stale", completion: null });
    fixture.disposePortal();
  });

  it("keeps one safe Dialogue player materialization through phase churn and fences fresh frames", () => {
    let currentProfile = defaultPlayerProfileV1;
    const profileListeners = new Set<() => void>();
    const rawProfileSubscribe = vi.fn((listener: () => void) => {
      profileListeners.add(listener);
      let active = true;
      return Object.freeze(() => {
        if (!active) return;
        active = false;
        profileListeners.delete(listener);
      });
    });
    const playerProfile = Object.freeze({
      getSnapshotInternalV1: () => currentProfile,
      subscribeInternalV1: rawProfileSubscribe,
      markSeenInternalV1: (_definitionId: string, _seenRevision: number) => {},
    });
    const rawResolveText = vi.fn(function (this: unknown, textId: string): string {
      expect(this).toBe(textResolver);
      return `resolved:${textId}`;
    });
    const textResolver = {
      resolveTextInternalV1: rawResolveText,
    };
    const fixture = createNarrativeHostFixtureV1({ playerProfile, textResolver });
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 1)))
      .toMatchObject({ kind: "applied" });

    const preparing = currentDialogueEntryV1(fixture.runtime, "preparing");
    const observation = preparing.playerObservation;
    const safeTextResolver = preparing.rendererProps.textResolver;
    expectFrozenOwnMethodsV1(observation, [
      "getSnapshotInternalV1",
      "subscribeInternalV1",
    ]);
    expect(Reflect.ownKeys(preparing)).toEqual([
      "kind",
      "phase",
      "renderKey",
      "preparation",
      "initialFocusTargetId",
      "rendererComponent",
      "rendererProps",
      "playerObservation",
    ]);
    expect(Reflect.ownKeys(preparing.rendererProps)).toEqual([
      "kind",
      "pending",
      "visualConfig",
      "playerProfile",
      "textResolver",
      "quickMenuContribution",
    ]);
    expect(preparing.rendererProps.playerProfile).toBe(defaultPlayerProfileV1);
    expect(preparing.rendererProps.playerProfile).not.toBe(playerProfile);
    expect(typeof safeTextResolver).toBe("function");
    expect(Object.isFrozen(safeTextResolver)).toBe(true);
    expect(safeTextResolver("text.test.extra")).toBe("resolved:text.test.extra");
    expect(preparing.rendererProps).not.toHaveProperty("playerView");
    expect(observation.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "preparing",
      resolvedSpeakerText: "resolved:text.test.speaker",
      resolvedText: "resolved:text.test.line",
      playerProfile: defaultPlayerProfileV1,
    });
    expect(rawProfileSubscribe).toHaveBeenCalledOnce();

    const observed: unknown[] = [];
    const unsubscribe = observation.subscribeInternalV1(() => {
      observed.push(observation.getSnapshotInternalV1());
    });
    if (preparing.preparation === null) throw new Error("expected root preparation");
    expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      preparing.preparation,
      prepareReadyCommitV1(fixture.runtime, preparing, fixture.portalContainer),
    )).toEqual({ kind: "settled", completion: null });
    const active = currentDialogueEntryV1(fixture.runtime, "active");
    expect(active.renderKey).toBe(preparing.renderKey);
    expect(active.playerObservation).toBe(observation);
    expect(active.rendererProps).toBe(preparing.rendererProps);
    expect(observation.getSnapshotInternalV1()).toMatchObject({ phase: "active" });

    const notificationsBeforeEqualProfile = observed.length;
    for (const listener of [...profileListeners]) listener();
    expect(observed).toHaveLength(notificationsBeforeEqualProfile);
    const nextProfile = Object.freeze({
      ...defaultPlayerProfileV1,
      preferences: Object.freeze({
        ...defaultPlayerProfileV1.preferences,
        autoWaitMs: defaultPlayerProfileV1.preferences.autoWaitMs + 1,
      }),
    });
    currentProfile = nextProfile;
    for (const listener of [...profileListeners]) listener();
    expect(observation.getSnapshotInternalV1().playerProfile).toBe(nextProfile);
    expect(observed).toHaveLength(notificationsBeforeEqualProfile + 1);

    const phasesAtKernelNotification: string[] = [];
    const unsubscribeState = fixture.harness.kernel.subscribeStateInternalV1(() => {
      phasesAtKernelNotification.push(observation.getSnapshotInternalV1().phase);
    });
    setCurrentRootPhaseV1(fixture.harness, "suspended");
    const suspended = currentDialogueEntryV1(fixture.runtime, "suspended");
    expect(suspended.renderKey).toBe(preparing.renderKey);
    expect(suspended.playerObservation).toBe(observation);
    expect(suspended.rendererProps).toBe(preparing.rendererProps);
    expect(observation.getSnapshotInternalV1()).toMatchObject({ phase: "suspended" });
    expect(phasesAtKernelNotification.at(-1)).toBe("suspended");
    setCurrentRootPhaseV1(fixture.harness, "active");
    expect(currentDialogueEntryV1(fixture.runtime, "active").playerObservation).toBe(
      observation,
    );
    expect(observation.getSnapshotInternalV1()).toMatchObject({ phase: "active" });
    expect(phasesAtKernelNotification.at(-1)).toBe("active");
    unsubscribeState();

    let kernelObservedReplacement = false;
    const replacementOrder: string[] = [];
    let unsubscribeBeforeTerminalDelivery = (): void => {};
    const unsubscribeReplacementState = fixture.harness.kernel.subscribeStateInternalV1(() => {
      kernelObservedReplacement = true;
      replacementOrder.push("kernel");
      expect(observation.getSnapshotInternalV1()).toMatchObject({
        kind: "passive",
        phase: "suspended",
      });
      unsubscribeBeforeTerminalDelivery();
    });
    const terminalObservationListener = vi.fn(() => {
      expect(kernelObservedReplacement).toBe(true);
      replacementOrder.push("observation");
      expect(observation.getSnapshotInternalV1()).toMatchObject({
        kind: "passive",
        phase: "suspended",
      });
    });
    const unsubscribeTerminalObservation = observation.subscribeInternalV1(
      terminalObservationListener,
    );
    const staleTerminalListener = vi.fn();
    unsubscribeBeforeTerminalDelivery = observation.subscribeInternalV1(
      staleTerminalListener,
    );
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
      .toMatchObject({ kind: "applied" });
    expect(terminalObservationListener).toHaveBeenCalledOnce();
    expect(staleTerminalListener).not.toHaveBeenCalled();
    expect(replacementOrder).toEqual(["kernel", "observation"]);
    unsubscribeReplacementState();
    unsubscribeTerminalObservation();
    unsubscribeTerminalObservation();
    expect(
      fixture.runtime.renderSource.getSnapshotInternalV1().entries.map((entry) => [
        entry.kind,
        entry.phase,
      ]),
    ).toEqual([
      ["dialogue", "active"],
      ["dialogue", "preparing"],
    ]);
    const retained = currentDialogueEntryV1(fixture.runtime, "active");
    const replacement = currentDialogueEntryV1(fixture.runtime, "preparing");
    expect(retained.playerObservation).toBe(observation);
    expect(replacement.playerObservation).not.toBe(observation);
    expect(replacement.renderKey).not.toBe(preparing.renderKey);
    const predecessorFinal = observation.getSnapshotInternalV1();
    expect(predecessorFinal).toMatchObject({ kind: "passive", phase: "suspended" });
    expect(observation.getSnapshotInternalV1()).toBe(predecessorFinal);
    expect(() => safeTextResolver("text.test.retained")).toThrowError(TypeError);
    const replacementObservation = replacement.playerObservation;
    const replacementResolver = replacement.rendererProps.textResolver;
    if (replacement.preparation === null) throw new Error("expected replacement preparation");
    expect(fixture.runtime.attachment.settleRootReadinessFailedInternalV1(
      replacement.preparation,
    )).toEqual({ kind: "settled", completion: null });
    const recovered = currentDialogueEntryV1(fixture.runtime, "active");
    expect(recovered.renderKey).toBe(preparing.renderKey);
    expect(recovered.playerObservation).toBe(observation);
    expect(recovered.rendererProps).toBe(preparing.rendererProps);
    expect(recovered.playerObservation.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playerProfile: nextProfile,
    });
    const rawReadsAfterRecovery = rawResolveText.mock.calls.length;
    const replacementFinal = replacementObservation.getSnapshotInternalV1();
    expect(replacementObservation.getSnapshotInternalV1()).toBe(replacementFinal);
    const lateReplacementListener = vi.fn();
    const lateReplacementUnsubscribe = replacementObservation.subscribeInternalV1(
      lateReplacementListener,
    );
    expect(Object.isFrozen(lateReplacementUnsubscribe)).toBe(true);
    lateReplacementUnsubscribe();
    lateReplacementUnsubscribe();
    expect(lateReplacementListener).not.toHaveBeenCalled();
    expect(() => replacementResolver("text.test.retired")).toThrowError(TypeError);
    expect(rawResolveText).toHaveBeenCalledTimes(rawReadsAfterRecovery);

    expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
    const finalSnapshot = recovered.playerObservation.getSnapshotInternalV1();
    expect(recovered.playerObservation.getSnapshotInternalV1()).toBe(finalSnapshot);
    const lateListener = vi.fn();
    const lateUnsubscribe = recovered.playerObservation.subscribeInternalV1(lateListener);
    expect(Object.isFrozen(lateUnsubscribe)).toBe(true);
    lateUnsubscribe();
    lateUnsubscribe();
    expect(lateListener).not.toHaveBeenCalled();
    expect(() => recovered.rendererProps.textResolver("text.test.terminal"))
      .toThrowError(TypeError);
    unsubscribe();
    unsubscribe();
    fixture.disposePortal();
  });

  it("refreshes History safe props from the current Dialogue profile without raw handles", () => {
    let currentProfile = defaultPlayerProfileV1;
    const profileListeners = new Set<() => void>();
    const playerProfile = Object.freeze({
      getSnapshotInternalV1: () => currentProfile,
      subscribeInternalV1: (listener: () => void) => {
        profileListeners.add(listener);
        return Object.freeze(() => profileListeners.delete(listener));
      },
      markSeenInternalV1: (_definitionId: string, _seenRevision: number) => {},
    });
    const fixture = createNarrativeHostFixtureV1({ playerProfile });
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 1)))
      .toMatchObject({ kind: "applied" });
    const rootPreparing = currentDialogueEntryV1(fixture.runtime, "preparing");
    if (rootPreparing.preparation === null) throw new Error("expected root preparation");
    expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      rootPreparing.preparation,
      prepareReadyCommitV1(fixture.runtime, rootPreparing, fixture.portalContainer),
    )).toEqual({ kind: "settled", completion: null });
    const minted = mintHistoryIntentV1(
      fixture.harness,
      "current-profile",
      fixture.inputRouter,
      fixture.isGestureCurrent,
    );
    const prepared = fixture.session.getHistoryChildLifecycleInternalV1()
      .redeemHistoryOpenIntentInternalV1(minted.intent);
    minted.dispose();
    if (prepared.kind !== "preparing") throw new Error("expected History preparation");
    const parentBefore = currentDialogueEntryV1(fixture.runtime, "suspended");
    const historyBefore = currentHistoryEntryV1(fixture.runtime, "preparing");
    expect(historyBefore.rendererProps.playerProfile).toBe(defaultPlayerProfileV1);
    expect(historyBefore.rendererProps.playerProfile).not.toBe(playerProfile);
    expect(historyBefore.rendererProps.textResolver).toBe(
      parentBefore.rendererProps.textResolver,
    );
    const renderNotifications = vi.fn();
    const unsubscribeRender = fixture.runtime.renderSource.subscribeInternalV1(
      renderNotifications,
    );

    const nextProfile = Object.freeze({
      ...defaultPlayerProfileV1,
      preferences: Object.freeze({
        ...defaultPlayerProfileV1.preferences,
        skipPolicy: "skip_all" as const,
      }),
    });
    currentProfile = nextProfile;
    for (const listener of [...profileListeners]) listener();
    expect(renderNotifications).toHaveBeenCalledOnce();
    const parentAfter = currentDialogueEntryV1(fixture.runtime, "suspended");
    const historyAfter = currentHistoryEntryV1(fixture.runtime, "preparing");
    expect(parentAfter).toBe(parentBefore);
    expect(parentAfter.playerObservation.getSnapshotInternalV1().playerProfile).toBe(
      nextProfile,
    );
    expect(historyAfter).not.toBe(historyBefore);
    expect(historyAfter.renderKey).toBe(historyBefore.renderKey);
    expect(historyAfter.controller).toBe(historyBefore.controller);
    expect(historyAfter.historyObservation).toBe(historyBefore.historyObservation);
    expect(historyAfter.rendererProps).not.toBe(historyBefore.rendererProps);
    expect(historyAfter.rendererProps.playerProfile).toBe(nextProfile);
    expect(historyAfter.rendererProps.textResolver).toBe(
      parentAfter.rendererProps.textResolver,
    );
    expect(historyAfter.rendererProps.playerProfile).not.toBe(playerProfile);

    const snapshotAfter = fixture.runtime.renderSource.getSnapshotInternalV1();
    for (const listener of [...profileListeners]) listener();
    expect(renderNotifications).toHaveBeenCalledOnce();
    expect(fixture.runtime.renderSource.getSnapshotInternalV1()).toBe(snapshotAfter);

    const thirdProfile = Object.freeze({
      ...nextProfile,
      preferences: Object.freeze({
        ...nextProfile.preferences,
        autoWaitMs: nextProfile.preferences.autoWaitMs + 1,
      }),
    });
    const fourthProfile = Object.freeze({
      ...thirdProfile,
      preferences: Object.freeze({
        ...thirdProfile.preferences,
        autoWaitMs: thirdProfile.preferences.autoWaitMs + 1,
      }),
    });
    let nestedProfilePublication = false;
    const reentrantObservationListener = vi.fn(() => {
      if (nestedProfilePublication) return;
      nestedProfilePublication = true;
      currentProfile = fourthProfile;
      for (const listener of [...profileListeners]) listener();
    });
    const laterObservationListener = vi.fn();
    const unsubscribeReentrant = parentAfter.playerObservation.subscribeInternalV1(
      reentrantObservationListener,
    );
    const unsubscribeLater = parentAfter.playerObservation.subscribeInternalV1(
      laterObservationListener,
    );
    currentProfile = thirdProfile;
    for (const listener of [...profileListeners]) listener();
    expect(reentrantObservationListener).toHaveBeenCalledTimes(2);
    expect(laterObservationListener).toHaveBeenCalledOnce();
    expect(renderNotifications).toHaveBeenCalledTimes(3);
    expect(currentHistoryEntryV1(fixture.runtime, "preparing").rendererProps.playerProfile)
      .toBe(fourthProfile);
    expect(parentAfter.playerObservation.getSnapshotInternalV1().playerProfile)
      .toBe(fourthProfile);
    unsubscribeReentrant();
    unsubscribeLater();

    unsubscribeRender();
    unsubscribeRender();
    expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
    fixture.disposePortal();
  });

  it("terminal-notifies an isolated controller fault after scrubbing every renderer capability", () => {
    let rawProfile: unknown = defaultPlayerProfileV1;
    const profileListeners = new Set<() => void>();
    const playerProfile = Object.freeze({
      getSnapshotInternalV1: () => rawProfile,
      subscribeInternalV1: (listener: () => void) => {
        profileListeners.add(listener);
        return Object.freeze(() => profileListeners.delete(listener));
      },
      markSeenInternalV1: (_definitionId: string, _seenRevision: number) => {},
    });
    const fixture = createNarrativeHostFixtureV1({ playerProfile });
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 1)))
      .toMatchObject({ kind: "applied" });
    const preparing = currentDialogueEntryV1(fixture.runtime, "preparing");
    if (preparing.preparation === null) throw new Error("expected root preparation");
    expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      preparing.preparation,
      prepareReadyCommitV1(fixture.runtime, preparing, fixture.portalContainer),
    )).toEqual({ kind: "settled", completion: null });
    const active = currentDialogueEntryV1(fixture.runtime, "active");
    const observation = active.playerObservation;
    const safeResolver = active.rendererProps.textResolver;
    const state = fixture.harness.kernel.getStateInternalV1();
    const renderSnapshot = fixture.runtime.renderSource.getSnapshotInternalV1();
    const renderListener = vi.fn();
    const unsubscribeRender = fixture.runtime.renderSource.subscribeInternalV1(renderListener);
    const observedFinal: unknown[] = [];
    const observationListener = vi.fn(() => {
      observedFinal.push(observation.getSnapshotInternalV1());
    });
    const unsubscribeObservation = observation.subscribeInternalV1(observationListener);

    rawProfile = Object.freeze({});
    for (const listener of [...profileListeners]) listener();

    expect(observationListener).toHaveBeenCalledOnce();
    expect(observedFinal).toHaveLength(1);
    expect(observedFinal[0]).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
      playerProfile: defaultPlayerProfileV1,
    });
    expect(observation.getSnapshotInternalV1()).toBe(observedFinal[0]);
    expect(profileListeners.size).toBe(0);
    expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
    expect(renderSnapshot.entries).toContain(active);
    expect(fixture.runtime.renderSource.getSnapshotInternalV1()).toBe(renderSnapshot);
    expect(renderListener).not.toHaveBeenCalled();
    expect(() => safeResolver("text.test.faulted")).toThrowError(TypeError);
    const lateListener = vi.fn();
    const lateUnsubscribe = observation.subscribeInternalV1(lateListener);
    lateUnsubscribe();
    lateUnsubscribe();
    expect(lateListener).not.toHaveBeenCalled();

    unsubscribeObservation();
    unsubscribeObservation();
    unsubscribeRender();
    unsubscribeRender();
    expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
    expect(observationListener).toHaveBeenCalledOnce();
    fixture.disposePortal();
  });

  it.each(
    [
      "profile get",
      "reduced motion",
      "text resolve",
      "profile subscribe",
    ] as const,
  )(
    "publishes and permanently fences a preparing Dialogue factory fault at %s",
    (faultSeam) => {
      const rawProfileGet = vi.fn(() => {
        if (faultSeam === "profile get") throw new Error("hostile profile get");
        return defaultPlayerProfileV1;
      });
      const rawProfileSubscribe = vi.fn((_listener: () => void) => {
        if (faultSeam === "profile subscribe") {
          throw new Error("hostile profile subscribe");
        }
        return Object.freeze(() => {});
      });
      const rawReducedMotion = vi.fn(() => {
        if (faultSeam === "reduced motion") throw new Error("hostile reduced motion");
        return false;
      });
      const rawResolveText = vi.fn((textId: string) => {
        if (faultSeam === "text resolve") throw new Error("hostile text resolve");
        return textId;
      });
      const playerProfile = Object.freeze({
        getSnapshotInternalV1: rawProfileGet,
        subscribeInternalV1: rawProfileSubscribe,
        markSeenInternalV1: (_definitionId: string, _seenRevision: number) => {},
      });
      const presentationClock = Object.freeze({
        nowInternalV1: () => 0,
        requestTickInternalV1: (_callback: (nowMs: number) => void) => Object.freeze(() => {}),
        prefersReducedMotionInternalV1: rawReducedMotion,
      });
      const textResolver = Object.freeze({
        resolveTextInternalV1: rawResolveText,
      });
      const fixture = createNarrativeHostFixtureV1({
        playerProfile,
        presentationClock,
        textResolver,
      });
      const rawIngressCount = (): number =>
        rawProfileGet.mock.calls.length + rawProfileSubscribe.mock.calls.length +
        rawReducedMotion.mock.calls.length + rawResolveText.mock.calls.length;

      expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 91)))
        .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
      const faultSnapshot = fixture.runtime.renderSource.getSnapshotInternalV1();
      const faultEntry = currentDialogueEntryV1(fixture.runtime, "preparing");
      expect(fixture.runtime.renderSource.getSnapshotInternalV1()).toBe(faultSnapshot);
      expect(currentDialogueEntryV1(fixture.runtime, "preparing")).toBe(faultEntry);
      expect(faultEntry.rendererProps.playerProfile).toBe(defaultPlayerProfileV1);
      expect(faultEntry.preparation).not.toBeNull();
      expectTypeErrorV1(
        () => faultEntry.playerObservation.getSnapshotInternalV1(),
        "ui.narrative_stable_dialogue_player_observation_invalid",
      );
      expectTypeErrorV1(
        () => faultEntry.rendererProps.textResolver("text.test.factory-fault"),
        "ui.narrative_stable_dialogue_player_text_resolver_invalid",
      );
      if (faultEntry.preparation === null) throw new Error("expected fault preparation");
      expect(fixture.runtime.attachment.settleRootReadinessFailedInternalV1(
        faultEntry.preparation,
      )).toEqual({ kind: "settled", completion: null });
      expect(fixture.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([]);

      const rawCallsAfterRetirement = rawIngressCount();
      const finalSnapshot = faultEntry.playerObservation.getSnapshotInternalV1();
      expect(Object.isFrozen(finalSnapshot)).toBe(true);
      expect(finalSnapshot).toMatchObject({
        kind: "passive",
        phase: "suspended",
        playbackMode: "normal",
        playerProfile: defaultPlayerProfileV1,
      });
      expect(faultEntry.playerObservation.getSnapshotInternalV1()).toBe(finalSnapshot);
      const lateListener = vi.fn();
      const lateUnsubscribe = faultEntry.playerObservation.subscribeInternalV1(lateListener);
      expect(Object.isFrozen(lateUnsubscribe)).toBe(true);
      lateUnsubscribe();
      lateUnsubscribe();
      expect(lateListener).not.toHaveBeenCalled();
      expectTypeErrorV1(
        () => faultEntry.rendererProps.textResolver("text.test.retired-fault"),
        "ui.narrative_stable_dialogue_player_text_resolver_invalid",
      );
      expect(rawIngressCount()).toBe(rawCallsAfterRetirement);

      expect(fixture.harness.bridge.retryCurrentPendingInternalV1()).toMatchObject({
        kind: "applied",
        code: "surface.stable_publication_applied",
      });
      const retried = currentDialogueEntryV1(fixture.runtime, "preparing");
      expect(retried).not.toBe(faultEntry);
      expect(retried.renderKey).not.toBe(faultEntry.renderKey);
      expect(retried.playerObservation).not.toBe(faultEntry.playerObservation);
      expectTypeErrorV1(
        () => retried.playerObservation.getSnapshotInternalV1(),
        "ui.narrative_stable_dialogue_player_observation_invalid",
      );
      const rawCallsAfterRetry = rawIngressCount();
      expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
      const retriedFinal = retried.playerObservation.getSnapshotInternalV1();
      expect(retriedFinal).toMatchObject({ kind: "passive", phase: "suspended" });
      expect(retried.playerObservation.getSnapshotInternalV1()).toBe(retriedFinal);
      expect(() => fixture.harness.bridge.disposeInternalV1()).not.toThrow();
      expect(rawIngressCount()).toBe(rawCallsAfterRetry);
      fixture.disposePortal();
    },
  );

  it("terminal-fences a preparing Dialogue factory fault before readiness settlement", () => {
    const rawProfileGet = vi.fn(() => {
      throw new Error("hostile pre-ready profile get");
    });
    const fixture = createNarrativeHostFixtureV1({
      playerProfile: Object.freeze({
        getSnapshotInternalV1: rawProfileGet,
        subscribeInternalV1: (_listener: () => void) => Object.freeze(() => {}),
        markSeenInternalV1: (_definitionId: string, _seenRevision: number) => {},
      }),
    });
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 92)))
      .toMatchObject({ kind: "applied" });
    const entry = currentDialogueEntryV1(fixture.runtime, "preparing");
    const observation = entry.playerObservation;
    const safeResolver = entry.rendererProps.textResolver;
    expectTypeErrorV1(
      () => observation.getSnapshotInternalV1(),
      "ui.narrative_stable_dialogue_player_observation_invalid",
    );
    const rawCallsBeforeDisposal = rawProfileGet.mock.calls.length;

    expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
    const finalSnapshot = observation.getSnapshotInternalV1();
    expect(finalSnapshot).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playerProfile: defaultPlayerProfileV1,
    });
    expect(observation.getSnapshotInternalV1()).toBe(finalSnapshot);
    const lateListener = vi.fn();
    const lateUnsubscribe = observation.subscribeInternalV1(lateListener);
    expect(Object.isFrozen(lateUnsubscribe)).toBe(true);
    lateUnsubscribe();
    lateUnsubscribe();
    expect(lateListener).not.toHaveBeenCalled();
    expectTypeErrorV1(
      () => safeResolver("text.test.terminal-fault"),
      "ui.narrative_stable_dialogue_player_text_resolver_invalid",
    );
    expect(() => fixture.harness.bridge.disposeInternalV1()).not.toThrow();
    expect(rawProfileGet).toHaveBeenCalledTimes(rawCallsBeforeDisposal);
    fixture.disposePortal();
  });

  it("publishes an active late-factory fault for the outer render boundary", () => {
    const rawProfileGet = vi.fn(() => {
      throw new Error("hostile active profile get");
    });
    const harness = createSessionHarnessV1(Object.freeze({
      preflightCandidateInternalV1: () =>
        Object.freeze({
          kind: "captured" as const,
          candidateSnapshot: Object.freeze({
            ...defaultCandidateSnapshotV1,
            playerProfile: Object.freeze({
              getSnapshotInternalV1: rawProfileGet,
              subscribeInternalV1: (_listener: () => void) => Object.freeze(() => {}),
              markSeenInternalV1: (_definitionId: string, _seenRevision: number) => {},
            }),
          }),
        }),
    }));
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say", 93)))
      .toMatchObject({ kind: "applied" });
    settleCurrentRootReadyV1(harness);
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const runtime = createNarrativeStableHostRuntimeInternalV1(Object.freeze({
      session,
      hostIdentity: Object.freeze({ host: "active-factory-fault" }),
      portalContainer,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    }));

    const renderSnapshot = runtime.renderSource.getSnapshotInternalV1();
    const entry = currentDialogueEntryV1(runtime, "active");
    expect(entry.preparation).toBeNull();
    expect(runtime.renderSource.getSnapshotInternalV1()).toBe(renderSnapshot);
    expect(currentDialogueEntryV1(runtime, "active")).toBe(entry);
    expectTypeErrorV1(
      () => entry.playerObservation.getSnapshotInternalV1(),
      "ui.narrative_stable_dialogue_player_observation_invalid",
    );
    expectTypeErrorV1(
      () => entry.rendererProps.textResolver("text.test.active-fault"),
      "ui.narrative_stable_dialogue_player_text_resolver_invalid",
    );
    const rawCallsBeforeDisposal = rawProfileGet.mock.calls.length;
    expect(harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
    const finalSnapshot = entry.playerObservation.getSnapshotInternalV1();
    expect(finalSnapshot).toMatchObject({ kind: "passive", phase: "suspended" });
    expect(entry.playerObservation.getSnapshotInternalV1()).toBe(finalSnapshot);
    expect(rawProfileGet).toHaveBeenCalledTimes(rawCallsBeforeDisposal);
    portalContainer.remove();
  });

  it("preclaims and commits the exact root input binding before the first ready listener", () => {
    const prepareBinding = vi.spyOn(
      managedSurfaceActionRouteModuleV1,
      "prepareManagedSurfaceContractBoundActionBindingInternalV1",
    );
    const preclaimRoute = vi.spyOn(
      managedSurfaceActionRouteModuleV1,
      "claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1",
    );
    const fixture = createNarrativeHostFixtureV1();
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
      .toMatchObject({ kind: "applied" });
    const root = preparingEntryV1(fixture.runtime, "dialogue");
    if (root.kind !== "dialogue" || root.preparation === null) {
      throw new Error("expected root preparation");
    }
    const prepared = prepareBinding.mock.results.at(-1)?.value as
      | ManagedSurfacePreparedContractBoundActionBindingInternalV1
      | undefined;
    if (prepared === undefined) throw new Error("expected prepared root input binding");
    expect(prepared.getBindingInternalV1()).toBeNull();
    expect(preclaimRoute).toHaveBeenCalledWith(prepared, expect.any(Function));

    const stateBeforeForgery = fixture.harness.kernel.getStateInternalV1();
    const renderBeforeForgery = fixture.runtime.renderSource.getSnapshotInternalV1();
    const notificationsBeforeForgery = fixture.harness.stateNotificationCount();
    const tokenTrap = {
      get: vi.fn(() => {
        throw new Error("forged ready token must not be read");
      }),
      ownKeys: vi.fn(() => {
        throw new Error("forged ready token must not be reflected");
      }),
      getOwnPropertyDescriptor: vi.fn(() => {
        throw new Error("forged ready token must not be inspected");
      }),
    };
    const forgedReadyCommit = new Proxy({}, tokenTrap);
    for (const candidate of [Object.freeze({}), forgedReadyCommit]) {
      expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
        root.preparation,
        candidate as NarrativeStableHostReadyCommitInternalV1,
      )).toEqual({ kind: "stale", completion: null });
      expect(fixture.harness.kernel.getStateInternalV1()).toBe(stateBeforeForgery);
      expect(fixture.runtime.renderSource.getSnapshotInternalV1()).toBe(renderBeforeForgery);
      expect(fixture.harness.stateNotificationCount()).toBe(notificationsBeforeForgery);
      expect(prepared.getBindingInternalV1()).toBeNull();
    }
    expect(tokenTrap.get).not.toHaveBeenCalled();
    expect(tokenTrap.ownKeys).not.toHaveBeenCalled();
    expect(tokenTrap.getOwnPropertyDescriptor).not.toHaveBeenCalled();

    const readyCommit = prepareReadyCommitV1(
      fixture.runtime,
      root,
      fixture.portalContainer,
    );
    const adoptedAdmissions: Array<
      ReturnType<typeof createNarrativeStablePhysicalActionAdmissionInternalV1>
    > = [];
    const firstReady = vi.fn(() => {
      const state = fixture.harness.kernel.getStateInternalV1();
      expect(state.stableRuntimeBindings[0]?.binding.kind).toBe("ready_instance");
      const binding = prepared.getBindingInternalV1();
      if (binding === null) throw new Error("expected committed root input binding");
      const adoptedAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: fixture.harness.bridge,
        inputRouter: fixture.inputRouter,
        isGestureCurrent: fixture.isGestureCurrent,
      });
      adoptedAdmissions.push(adoptedAdmission);
      const attempt = adoptedAdmission.issueHistoryOpenAttemptInternalV1();
      if (attempt === null) throw new Error("expected adopted History attempt");
      expect(adoptedAdmission.routeInternalV1(
        adoptedAdmission.createEnvelopeInternalV1({
          actionId: toggleHistoryActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1("gesture.session-test.first-ready"),
        }),
        attempt,
      )).toMatchObject({
        consumerResult: { kind: "requested" },
        route: {
          input: { kind: "consumed", code: "input.managed_surface_consumed" },
          surface: { kind: "unchanged", code: "surface.action_routed" },
        },
      });
      expect(prepareBinding).toHaveBeenCalledOnce();
      expect(preclaimRoute).toHaveBeenCalledOnce();
    });
    const unsubscribe = fixture.runtime.renderSource.subscribeInternalV1(firstReady);
    expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      root.preparation,
      readyCommit,
    )).toEqual({ kind: "settled", completion: null });
    expect(firstReady).toHaveBeenCalledOnce();
    expect(prepared.getBindingInternalV1()).not.toBeNull();

    adoptedAdmissions[0]?.disposeInternalV1();
    unsubscribe();
    fixture.runtime.attachment.releaseInternalV1();
    fixture.disposePortal();
  });

  it("fresh-repairs the surviving candidate after either two-slot failure settles", () => {
    const prepareBinding = vi.spyOn(
      managedSurfaceActionRouteModuleV1,
      "prepareManagedSurfaceContractBoundActionBindingInternalV1",
    );
    vi.spyOn(
      managedSurfaceActionRouteModuleV1,
      "claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1",
    );
    const preparedBindings =
      (): readonly ManagedSurfacePreparedContractBoundActionBindingInternalV1[] =>
        prepareBinding.mock.results.flatMap((
          result: (typeof prepareBinding.mock.results)[number],
        ) =>
          result.type === "return"
            ? [result.value as ManagedSurfacePreparedContractBoundActionBindingInternalV1]
            : []
        );
    const prepareConcurrentCandidates = (
      suffix: string,
      sequence: number,
    ): Readonly<{
      fixture: NarrativeHostFixtureV1;
      historyPreparation: NarrativeStableHistoryChildPreparationInternalV1;
      replacement: Extract<
        NarrativeStableHostRenderEntryInternalV1,
        { readonly kind: "dialogue" }
      >;
      historyBinding: ManagedSurfacePreparedContractBoundActionBindingInternalV1;
      replacementBinding: ManagedSurfacePreparedContractBoundActionBindingInternalV1;
    }> => {
      const fixture = createNarrativeHostFixtureV1();
      expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", sequence)))
        .toMatchObject({ kind: "applied" });
      const initialRoot = preparingEntryV1(fixture.runtime, "dialogue");
      if (initialRoot.kind !== "dialogue" || initialRoot.preparation === null) {
        throw new Error("expected initial root preparation");
      }
      expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
        initialRoot.preparation,
        prepareReadyCommitV1(fixture.runtime, initialRoot, fixture.portalContainer),
      )).toEqual({ kind: "settled", completion: null });

      const minted = mintHistoryIntentV1(
        fixture.harness,
        `${suffix}-history`,
        fixture.inputRouter,
        fixture.isGestureCurrent,
      );
      const history = fixture.session.getHistoryChildLifecycleInternalV1()
        .redeemHistoryOpenIntentInternalV1(minted.intent);
      minted.dispose();
      if (history.kind !== "preparing") throw new Error("expected History preparation");
      const historyBinding = preparedBindings().at(-1);
      if (historyBinding === undefined) throw new Error("expected prepared History binding");
      expect(historyBinding.getBindingInternalV1()).toBeNull();

      expect(fixture.harness.bridge.reconcilePendingInternalV1(
        pendingV1("say", sequence + 1),
      )).toMatchObject({ kind: "applied" });
      const replacement = fixture.runtime.renderSource.getSnapshotInternalV1().entries.at(-1);
      if (
        replacement?.kind !== "dialogue" || replacement.phase !== "preparing" ||
        replacement.preparation === null
      ) {
        throw new Error("expected replacement root preparation");
      }
      expect(
        fixture.runtime.renderSource.getSnapshotInternalV1().entries.map((entry) => [
          entry.kind,
          entry.phase,
        ]),
      ).toEqual([
        ["dialogue", "suspended"],
        ["history", "preparing"],
        ["dialogue", "preparing"],
      ]);
      const replacementBinding = preparedBindings().at(-1);
      if (replacementBinding === undefined || replacementBinding === historyBinding) {
        throw new Error("expected independent two-slot replacement binding");
      }
      expect(replacementBinding.getBindingInternalV1()).toBeNull();
      return Object.freeze({
        fixture,
        historyPreparation: history.preparation,
        replacement,
        historyBinding,
        replacementBinding,
      });
    };

    const rootFailure = prepareConcurrentCandidates("root-failure", 20);
    const beforeRootFailure = preparedBindings().length;
    expect(rootFailure.fixture.runtime.attachment.settleRootReadinessFailedInternalV1(
      rootFailure.replacement.preparation!,
    )).toEqual({ kind: "settled", completion: null });
    expect(
      rootFailure.fixture.runtime.renderSource.getSnapshotInternalV1().entries.map((entry) => [
        entry.kind,
        entry.phase,
      ]),
    ).toEqual([
      ["dialogue", "suspended"],
      ["history", "preparing"],
    ]);
    const repairedAfterRootFailure = preparedBindings().slice(beforeRootFailure);
    expect(repairedAfterRootFailure.length).toBeGreaterThanOrEqual(2);
    const freshHistoryBinding = repairedAfterRootFailure.at(-1);
    if (freshHistoryBinding === undefined) throw new Error("expected fresh History binding");
    expect(freshHistoryBinding).not.toBe(rootFailure.historyBinding);
    expect(freshHistoryBinding.getBindingInternalV1()).toBeNull();
    const survivingHistory = preparingEntryV1(rootFailure.fixture.runtime, "history");
    if (survivingHistory.kind !== "history" || survivingHistory.preparation === null) {
      throw new Error("expected surviving History preparation");
    }
    expect(rootFailure.fixture.runtime.attachment.settleHistoryReadinessReadyInternalV1(
      survivingHistory.preparation,
      prepareReadyCommitV1(
        rootFailure.fixture.runtime,
        survivingHistory,
        rootFailure.fixture.portalContainer,
      ),
    )).toEqual({ kind: "settled", completion: null });
    expect(freshHistoryBinding.getBindingInternalV1()).not.toBeNull();
    rootFailure.fixture.runtime.attachment.releaseInternalV1();
    rootFailure.fixture.disposePortal();

    const historyFailure = prepareConcurrentCandidates("history-failure", 30);
    const beforeHistoryFailure = preparedBindings().length;
    expect(historyFailure.fixture.runtime.attachment.settleHistoryReadinessFailedInternalV1(
      historyFailure.historyPreparation,
    )).toEqual({ kind: "settled", completion: null });
    expect(
      historyFailure.fixture.runtime.renderSource.getSnapshotInternalV1().entries.map((entry) => [
        entry.kind,
        entry.phase,
      ]),
    ).toEqual([
      ["dialogue", "active"],
      ["dialogue", "preparing"],
    ]);
    const repairedAfterHistoryFailure = preparedBindings().slice(beforeHistoryFailure);
    expect(repairedAfterHistoryFailure.length).toBeGreaterThanOrEqual(2);
    const freshReplacementBinding = repairedAfterHistoryFailure.at(-1);
    if (freshReplacementBinding === undefined) {
      throw new Error("expected fresh replacement binding");
    }
    expect(freshReplacementBinding).not.toBe(historyFailure.replacementBinding);
    expect(freshReplacementBinding.getBindingInternalV1()).toBeNull();
    const survivingReplacement = preparingEntryV1(
      historyFailure.fixture.runtime,
      "dialogue",
    );
    if (survivingReplacement.kind !== "dialogue" || survivingReplacement.preparation === null) {
      throw new Error("expected surviving replacement preparation");
    }
    expect(historyFailure.fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      survivingReplacement.preparation,
      prepareReadyCommitV1(
        historyFailure.fixture.runtime,
        survivingReplacement,
        historyFailure.fixture.portalContainer,
      ),
    )).toEqual({ kind: "settled", completion: null });
    expect(freshReplacementBinding.getBindingInternalV1()).not.toBeNull();
    expect(historyFailure.fixture.runtime.renderSource.getSnapshotInternalV1().entries)
      .toEqual([
        expect.objectContaining({ kind: "dialogue", phase: "active" }),
      ]);
    historyFailure.fixture.runtime.attachment.releaseInternalV1();
    historyFailure.fixture.disposePortal();
  });

  it("binds one exact controller across preparing, ready, and same-portal Host reattach", async () => {
    const preparing = createPreparingHistoryHostFixtureV1("controller-preparing", 40);
    const preparingController = exactHistoryControllerV1(preparing.historyEntry);
    expect(Reflect.ownKeys(preparing.historyEntry).map(String).sort()).toEqual([
      "controller",
      "historyObservation",
      "initialFocusTargetId",
      "kind",
      "parentRenderKey",
      "phase",
      "preparation",
      "renderKey",
      "rendererComponent",
      "rendererProps",
    ]);
    const preparingClosed = preparingController.closeInternalV1();
    expectExactHistoryLifecycleResultV1(preparingClosed, "closed");
    expect(preparing.fixture.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([
      expect.objectContaining({ kind: "dialogue", phase: "active" }),
    ]);
    const canonicalStale = preparingController.closeInternalV1();
    expectExactHistoryLifecycleResultV1(canonicalStale, "stale");
    expect(preparingController.dismissInternalV1(
      "invalid" as ManagedSurfaceDismissKindV1,
    )).toBe(canonicalStale);

    const ready = createPreparingHistoryHostFixtureV1("controller-ready", 41);
    const readyPreparingController = exactHistoryControllerV1(ready.historyEntry);
    const stateBeforeInvalid = ready.fixture.harness.kernel.getStateInternalV1();
    const renderBeforeInvalid = ready.fixture.runtime.renderSource.getSnapshotInternalV1();
    const notificationsBeforeInvalid = ready.fixture.harness.stateNotificationCount();
    const invalidDismiss = readyPreparingController.dismissInternalV1(
      "invalid" as ManagedSurfaceDismissKindV1,
    );
    expectExactHistoryLifecycleResultV1(invalidDismiss, "faulted");
    expect(ready.fixture.harness.kernel.getStateInternalV1()).toBe(stateBeforeInvalid);
    expect(ready.fixture.runtime.renderSource.getSnapshotInternalV1()).toBe(
      renderBeforeInvalid,
    );
    expect(ready.fixture.harness.stateNotificationCount()).toBe(notificationsBeforeInvalid);

    const borrowedClose = readyPreparingController.closeInternalV1;
    const borrowedDismiss = readyPreparingController.dismissInternalV1;
    for (
      const receiver of [
        undefined,
        Object.freeze({}),
        Object.freeze({
          ...readyPreparingController,
        }),
      ]
    ) {
      expectTypeErrorV1(
        () => Reflect.apply(borrowedClose, receiver, []),
        "ui.narrative_stable_history_child_controller_invalid",
      );
      expectTypeErrorV1(
        () => Reflect.apply(borrowedDismiss, receiver, ["back"]),
        "ui.narrative_stable_history_child_controller_invalid",
      );
    }
    expect(ready.fixture.harness.kernel.getStateInternalV1()).toBe(stateBeforeInvalid);
    expect(ready.fixture.runtime.renderSource.getSnapshotInternalV1()).toBe(
      renderBeforeInvalid,
    );

    expect(ready.fixture.runtime.attachment.settleHistoryReadinessReadyInternalV1(
      ready.historyPreparation,
      prepareReadyCommitV1(
        ready.fixture.runtime,
        ready.historyEntry,
        ready.fixture.portalContainer,
      ),
    )).toEqual({ kind: "settled", completion: null });
    const activeEntry = currentHistoryEntryV1(ready.fixture.runtime, "active");
    expect(exactHistoryControllerV1(activeEntry)).toBe(readyPreparingController);

    ready.fixture.runtime.attachment.releaseInternalV1();
    const successor = createNarrativeStableHostRuntimeInternalV1(Object.freeze({
      session: ready.fixture.session,
      hostIdentity: ready.fixture.hostIdentity,
      portalContainer: ready.fixture.portalContainer,
      inputRouter: ready.fixture.inputRouter,
      isGestureCurrent: ready.fixture.isGestureCurrent,
    }));
    for (const entry of successor.renderSource.getSnapshotInternalV1().entries) {
      const shell = document.createElement("div");
      shell.tabIndex = -1;
      ready.fixture.portalContainer.append(shell);
      expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
        hostRuntime: successor,
        renderEntry: entry,
        portalShell: shell,
        initialFocusTarget: shell,
      }))).toEqual({ kind: "reattached", completion: null });
    }
    expect(exactHistoryControllerV1(currentHistoryEntryV1(successor, "active")))
      .toBe(readyPreparingController);
    const readyClosed = readyPreparingController.closeInternalV1();
    expect(readyClosed).toBe(preparingClosed);
    expectExactHistoryLifecycleResultV1(readyClosed, "closed");
    expect(readyPreparingController.closeInternalV1()).toBe(canonicalStale);

    preparing.fixture.runtime.attachment.releaseInternalV1();
    preparing.fixture.disposePortal();
    successor.attachment.releaseInternalV1();
    await Promise.resolve();
    ready.fixture.disposePortal();
  });

  it("maps every internal dismiss kind in both History phases to canonical family results", () => {
    const dismissKinds = [
      "back",
      "escape",
      "backdrop",
      "routed_cancel",
    ] as const satisfies readonly ManagedSurfaceDismissKindV1[];
    const phases = ["preparing", "active"] as const;
    let canonicalDismissed: NarrativeStableHistoryChildLifecycleResultInternalV1 | null = null;
    let canonicalStale: NarrativeStableHistoryChildLifecycleResultInternalV1 | null = null;
    let sequence = 50;
    for (const phase of phases) {
      for (const dismissKind of dismissKinds) {
        const current = createPreparingHistoryHostFixtureV1(
          `dismiss-${phase}-${dismissKind}`,
          sequence,
        );
        sequence += 1;
        if (phase === "active") {
          expect(current.fixture.runtime.attachment.settleHistoryReadinessReadyInternalV1(
            current.historyPreparation,
            prepareReadyCommitV1(
              current.fixture.runtime,
              current.historyEntry,
              current.fixture.portalContainer,
            ),
          )).toEqual({ kind: "settled", completion: null });
        }
        const controller = exactHistoryControllerV1(
          currentHistoryEntryV1(current.fixture.runtime, phase),
        );
        const dismissed = controller.dismissInternalV1(dismissKind);
        expectExactHistoryLifecycleResultV1(dismissed, "dismissed");
        if (canonicalDismissed === null) canonicalDismissed = dismissed;
        else expect(dismissed).toBe(canonicalDismissed);
        expect(current.fixture.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([
          expect.objectContaining({ kind: "dialogue", phase: "active" }),
        ]);
        const stale = controller.dismissInternalV1(dismissKind);
        expectExactHistoryLifecycleResultV1(stale, "stale");
        if (canonicalStale === null) canonicalStale = stale;
        else expect(stale).toBe(canonicalStale);
        current.fixture.runtime.attachment.releaseInternalV1();
        current.fixture.disposePortal();
      }
    }
  });

  it("routes initial-root and preparing-History fallback input without lower fallthrough", () => {
    const rootFixture = createNarrativeHostFixtureV1();
    expect(rootFixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 70)))
      .toMatchObject({ kind: "applied" });
    const root = preparingEntryV1(rootFixture.runtime, "dialogue");
    if (root.kind !== "dialogue" || root.preparation === null) {
      throw new Error("expected preparing Dialogue root");
    }
    const lowerRoot = vi.fn(() => inputHandledV1);
    const unregisterLowerRoot = rootFixture.inputRouter.register({
      context: "gameplay",
      handle: lowerRoot,
    });
    const rootState = rootFixture.harness.kernel.getStateInternalV1();
    for (
      const actionId of [
        playerInputActionIdsV1.toggleHistory,
        playerInputActionIdsV1.toggleAuto,
        systemInputActionIdsV1.cancel,
      ]
    ) {
      expect(rootFixture.inputRouter.route(Object.freeze({ kind: "action" as const, actionId })))
        .toEqual({ kind: "handled", context: "narrative" });
      expect(rootFixture.harness.kernel.getStateInternalV1()).toBe(rootState);
    }
    expect(rootFixture.inputRouter.route(Object.freeze({
      kind: "viewport_point" as const,
      phase: "activate" as const,
      point: Object.freeze({ x: 1, y: 2 }),
      pointerId: parseNonNegativeSafeInteger(1),
      pointerType: "mouse" as const,
    }))).toEqual({ kind: "handled", context: "narrative" });
    expect(lowerRoot).not.toHaveBeenCalled();
    expect(rootFixture.runtime.attachment.settleRootReadinessFailedInternalV1(
      root.preparation,
    )).toEqual({ kind: "settled", completion: null });
    unregisterLowerRoot();
    rootFixture.runtime.attachment.releaseInternalV1();
    rootFixture.disposePortal();

    for (
      const [index, actionId] of [
        playerInputActionIdsV1.toggleHistory,
        systemInputActionIdsV1.cancel,
      ].entries()
    ) {
      const current = createPreparingHistoryHostFixtureV1(
        `fallback-close-${String(index)}`,
        71 + index,
      );
      const controller = exactHistoryControllerV1(current.historyEntry);
      const lowerHistory = vi.fn(() => inputHandledV1);
      const unregisterLowerHistory = current.fixture.inputRouter.register({
        context: "gameplay",
        handle: lowerHistory,
      });
      expect(current.fixture.inputRouter.route(Object.freeze({
        kind: "action" as const,
        actionId: playerInputActionIdsV1.toggleAuto,
      }))).toEqual({ kind: "handled", context: "narrative" });
      expect(current.fixture.inputRouter.route(Object.freeze({
        kind: "viewport_point" as const,
        phase: "begin" as const,
        point: Object.freeze({ x: 3, y: 4 }),
        pointerId: parseNonNegativeSafeInteger(2),
        pointerType: "touch" as const,
      }))).toEqual({ kind: "handled", context: "narrative" });
      expect(currentHistoryEntryV1(current.fixture.runtime, "preparing").controller)
        .toBe(controller);
      expect(current.fixture.inputRouter.route(Object.freeze({
        kind: "action" as const,
        actionId,
      }))).toEqual({ kind: "handled", context: "narrative" });
      expect(current.fixture.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([
        expect.objectContaining({ kind: "dialogue", phase: "active" }),
      ]);
      expectExactHistoryLifecycleResultV1(controller.closeInternalV1(), "stale");
      expect(lowerHistory).not.toHaveBeenCalled();
      unregisterLowerHistory();
      current.fixture.runtime.attachment.releaseInternalV1();
      current.fixture.disposePortal();
    }
  });

  it("physically unregisters each fallback after ready, failure, or explicit close", () => {
    const registrations = trackManagedInputRegistrationsV1();

    for (const outcome of ["ready", "failed"] as const) {
      const fixture = createNarrativeHostFixtureV1();
      expect(fixture.harness.bridge.reconcilePendingInternalV1(
        pendingV1("say", outcome === "ready" ? 73 : 74),
      )).toMatchObject({ kind: "applied" });
      const root = preparingEntryV1(fixture.runtime, "dialogue");
      if (root.kind !== "dialogue" || root.preparation === null) {
        throw new Error("expected preparing Dialogue fallback");
      }
      expect(registrations.activeCount(fixture.inputRouter)).toBe(2);
      const settled = outcome === "ready"
        ? fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
          root.preparation,
          prepareReadyCommitV1(fixture.runtime, root, fixture.portalContainer),
        )
        : fixture.runtime.attachment.settleRootReadinessFailedInternalV1(root.preparation);
      expect(settled).toEqual({ kind: "settled", completion: null });
      expect(registrations.activeCount(fixture.inputRouter)).toBe(1);
      fixture.runtime.attachment.releaseInternalV1();
      fixture.disposePortal();
    }

    for (const outcome of ["closed", "ready", "failed"] as const) {
      const current = createPreparingHistoryHostFixtureV1(
        `fallback-history-${outcome}`,
        outcome === "closed" ? 75 : outcome === "ready" ? 76 : 77,
      );
      expect(registrations.activeCount(current.fixture.inputRouter)).toBe(2);
      const settled = outcome === "closed"
        ? exactHistoryControllerV1(current.historyEntry).closeInternalV1()
        : outcome === "ready"
        ? current.fixture.runtime.attachment.settleHistoryReadinessReadyInternalV1(
          current.historyPreparation,
          prepareReadyCommitV1(
            current.fixture.runtime,
            current.historyEntry,
            current.fixture.portalContainer,
          ),
        )
        : current.fixture.runtime.attachment.settleHistoryReadinessFailedInternalV1(
          current.historyPreparation,
        );
      expect(settled).toMatchObject({
        kind: outcome === "closed" ? "closed" : "settled",
        completion: null,
      });
      expect(registrations.activeCount(current.fixture.inputRouter)).toBe(1);
      current.fixture.runtime.attachment.releaseInternalV1();
      current.fixture.disposePortal();
    }
  });

  it("commits the fresh root binding before close publication and preserves listener-reentrant ABA", () => {
    const prepareBinding = vi.spyOn(
      managedSurfaceActionRouteModuleV1,
      "prepareManagedSurfaceContractBoundActionBindingInternalV1",
    );
    const { fixture, historyEntry } = createReadyHistoryHostFixtureV1(
      "close-listener-reentry",
      75,
    );
    const controller = exactHistoryControllerV1(historyEntry);
    const rootBefore = fixture.runtime.renderSource.getSnapshotInternalV1().entries.find((entry) =>
      entry.kind === "dialogue"
    );
    if (rootBefore?.kind !== "dialogue") throw new Error("expected retained Dialogue root");
    const preparedBeforeClose = prepareBinding.mock.results.length;
    let nestedPreparation: NarrativeStableHistoryChildPreparationInternalV1 | null = null;
    let nestedController: NarrativeStableHistoryChildControllerInternalV1 | null = null;
    let reentered = false;
    const unsubscribe = fixture.runtime.renderSource.subscribeInternalV1(() => {
      const snapshot = fixture.runtime.renderSource.getSnapshotInternalV1();
      if (reentered || snapshot.entries.some((entry) => entry.kind === "history")) return;
      reentered = true;
      expect(snapshot.entries).toEqual([
        expect.objectContaining({
          kind: "dialogue",
          phase: "active",
          renderKey: rootBefore.renderKey,
        }),
      ]);
      const closePreparedBindings = prepareBinding.mock.results.slice(preparedBeforeClose)
        .flatMap((result) =>
          result.type === "return"
            ? [result.value as ManagedSurfacePreparedContractBoundActionBindingInternalV1]
            : []
        );
      expect(closePreparedBindings.length).toBeGreaterThan(0);
      expect(closePreparedBindings.some((binding) => binding.getBindingInternalV1() !== null)).toBe(
        true,
      );

      const minted = mintHistoryIntentV1(
        fixture.harness,
        "close-listener-fresh-child",
        fixture.inputRouter,
        fixture.isGestureCurrent,
      );
      const nested = fixture.session.getHistoryChildLifecycleInternalV1()
        .redeemHistoryOpenIntentInternalV1(minted.intent);
      minted.dispose();
      if (nested.kind !== "preparing") {
        throw new Error("expected listener-reentrant History preparation");
      }
      nestedPreparation = nested.preparation;
      const freshEntry = currentHistoryEntryV1(fixture.runtime, "preparing");
      expect(freshEntry.parentRenderKey).toBe(rootBefore.renderKey);
      nestedController = exactHistoryControllerV1(freshEntry);
    });

    const outer = controller.closeInternalV1();
    expectExactHistoryLifecycleResultV1(outer, "closed");
    expect(reentered).toBe(true);
    expect(nestedPreparation).not.toBeNull();
    expect(nestedController).not.toBeNull();
    expect(nestedController).not.toBe(controller);
    expectExactHistoryLifecycleResultV1(controller.closeInternalV1(), "stale");
    const freshController =
      nestedController as unknown as NarrativeStableHistoryChildControllerInternalV1;
    expect(currentHistoryEntryV1(fixture.runtime, "preparing").controller)
      .toBe(freshController);
    expectExactHistoryLifecycleResultV1(
      freshController.dismissInternalV1("back"),
      "dismissed",
    );
    unsubscribe();
    fixture.runtime.attachment.releaseInternalV1();
    fixture.disposePortal();
  });

  it("retains a History controller across failed root replacement and fences it on cutover", () => {
    const failed = createConcurrentPendingHostFixtureV1("controller-root-failure", 76);
    const retainedController = exactHistoryControllerV1(
      currentHistoryEntryV1(failed.fixture.runtime, "preparing"),
    );
    expect(failed.fixture.runtime.attachment.settleRootReadinessFailedInternalV1(
      failed.replacementPreparation,
    )).toEqual({ kind: "settled", completion: null });
    expect(exactHistoryControllerV1(
      currentHistoryEntryV1(failed.fixture.runtime, "preparing"),
    )).toBe(retainedController);
    expectExactHistoryLifecycleResultV1(retainedController.closeInternalV1(), "closed");
    failed.fixture.runtime.attachment.releaseInternalV1();
    failed.fixture.disposePortal();

    const cutover = createConcurrentPendingHostFixtureV1("controller-root-cutover", 78);
    const retiredController = exactHistoryControllerV1(
      currentHistoryEntryV1(cutover.fixture.runtime, "preparing"),
    );
    const replacementEntry = cutover.fixture.runtime.renderSource.getSnapshotInternalV1().entries
      .findLast((entry) => entry.kind === "dialogue" && entry.phase === "preparing");
    if (replacementEntry?.kind !== "dialogue" || replacementEntry.preparation === null) {
      throw new Error("expected root replacement entry");
    }
    expect(cutover.fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      cutover.replacementPreparation,
      prepareReadyCommitV1(
        cutover.fixture.runtime,
        replacementEntry,
        cutover.fixture.portalContainer,
      ),
    )).toEqual({ kind: "settled", completion: null });
    expect(cutover.fixture.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([
      expect.objectContaining({ kind: "dialogue", phase: "active" }),
    ]);
    expectExactHistoryLifecycleResultV1(retiredController.closeInternalV1(), "stale");
    cutover.fixture.runtime.attachment.releaseInternalV1();
    cutover.fixture.disposePortal();
  });

  it.each(
    [
      [toggleHistoryActionIdV1, "closed"],
      [cancelHistoryActionIdV1, "dismissed"],
    ] as const,
  )(
    "routes ready History %s through one action_routed close result %s",
    (actionId, expectedKind) => {
      const prepareBinding = vi.spyOn(
        managedSurfaceActionRouteModuleV1,
        "prepareManagedSurfaceContractBoundActionBindingInternalV1",
      );
      const preclaimRoute = vi.spyOn(
        managedSurfaceActionRouteModuleV1,
        "claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1",
      );
      const { fixture, historyEntry } = createReadyHistoryHostFixtureV1(
        `ready-action-${expectedKind}`,
        expectedKind === "closed" ? 80 : 81,
      );
      const controller = exactHistoryControllerV1(historyEntry);
      const lower = vi.fn(() => inputHandledV1);
      const unregisterLower = fixture.inputRouter.register({
        context: "gameplay",
        handle: lower,
      });
      const preparedBeforeAdoption = prepareBinding.mock.calls.length;
      const claimsBeforeAdoption = preclaimRoute.mock.calls.length;
      const historyAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: fixture.harness.bridge,
        inputRouter: fixture.inputRouter,
        isGestureCurrent: fixture.isGestureCurrent,
      });
      expect(prepareBinding).toHaveBeenCalledTimes(preparedBeforeAdoption);
      expect(preclaimRoute).toHaveBeenCalledTimes(claimsBeforeAdoption);

      const stateBeforeAttemptForgery = fixture.harness.kernel.getStateInternalV1();
      const renderBeforeAttemptForgery = fixture.runtime.renderSource.getSnapshotInternalV1();
      const notificationsBeforeAttemptForgery = fixture.harness.stateNotificationCount();
      const attemptTrap = {
        get: vi.fn(() => {
          throw new Error("History close attempt must remain unread");
        }),
        ownKeys: vi.fn(() => {
          throw new Error("History close attempt must remain unreflected");
        }),
        getOwnPropertyDescriptor: vi.fn(() => {
          throw new Error("History close attempt descriptor must remain unread");
        }),
      };
      const forgedAttempt = new Proxy({}, attemptTrap);
      const forgedRoute = historyAdmission.routeInternalV1(
        historyAdmission.createEnvelopeInternalV1({
          actionId,
          gestureId: parseManagedSurfaceGestureIdV1(
            `gesture.session-test.ready-forged-${expectedKind}`,
          ),
        }),
        forgedAttempt,
      );
      expect(forgedRoute).toMatchObject({
        route: {
          input: { kind: "consumed", code: "input.managed_surface_consumed" },
          surface: { kind: "unchanged", code: "surface.action_routed" },
        },
        consumerResult: { kind: "stale", completion: null },
      });
      expect(attemptTrap.get).not.toHaveBeenCalled();
      expect(attemptTrap.ownKeys).not.toHaveBeenCalled();
      expect(attemptTrap.getOwnPropertyDescriptor).not.toHaveBeenCalled();
      expect(fixture.harness.kernel.getStateInternalV1()).toBe(stateBeforeAttemptForgery);
      expect(fixture.runtime.renderSource.getSnapshotInternalV1()).toBe(
        renderBeforeAttemptForgery,
      );
      expect(fixture.harness.stateNotificationCount()).toBe(notificationsBeforeAttemptForgery);

      const routed = historyAdmission.routeInternalV1(
        historyAdmission.createEnvelopeInternalV1({
          actionId,
          gestureId: parseManagedSurfaceGestureIdV1(
            `gesture.session-test.ready-${expectedKind}`,
          ),
        }),
        null,
      );
      expect(routed).toMatchObject({
        route: {
          input: { kind: "consumed", code: "input.managed_surface_consumed" },
          surface: { kind: "unchanged", code: "surface.action_routed" },
        },
        consumerResult: { kind: expectedKind, completion: null },
      });
      if (routed.consumerResult === null) throw new Error("expected History consumer result");
      expectExactHistoryLifecycleResultV1(
        routed.consumerResult as NarrativeStableHistoryChildLifecycleResultInternalV1,
        expectedKind,
      );
      expect(fixture.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([
        expect.objectContaining({ kind: "dialogue", phase: "active" }),
      ]);
      expectExactHistoryLifecycleResultV1(controller.closeInternalV1(), "stale");
      expect(lower).not.toHaveBeenCalled();

      historyAdmission.disposeInternalV1();
      unregisterLower();
      fixture.runtime.attachment.releaseInternalV1();
      fixture.disposePortal();
    },
  );

  it("churns 10k fallback controllers without retaining child, registration, or DOM state", () => {
    const fixture = createNarrativeHostFixtureV1();
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 90)))
      .toMatchObject({ kind: "applied" });
    const root = preparingEntryV1(fixture.runtime, "dialogue");
    if (root.kind !== "dialogue" || root.preparation === null) {
      throw new Error("expected bounded root preparation");
    }
    expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      root.preparation,
      prepareReadyCommitV1(fixture.runtime, root, fixture.portalContainer),
    )).toEqual({ kind: "settled", completion: null });
    const retainedRoot = fixture.runtime.renderSource.getSnapshotInternalV1().entries[0];
    if (retainedRoot?.kind !== "dialogue") throw new Error("expected bounded retained root");
    const initialState = fixture.harness.kernel.getStateInternalV1();
    const initialNotifications = fixture.harness.stateNotificationCount();
    const initialPortalChildren = fixture.portalContainer.childElementCount;
    const lower = vi.fn(() => inputHandledV1);
    const unregisterLower = fixture.inputRouter.register({
      context: "gameplay",
      handle: lower,
    });
    let previousController: NarrativeStableHistoryChildControllerInternalV1 | null = null;
    let canonicalClosed: NarrativeStableHistoryChildLifecycleResultInternalV1 | null = null;
    let canonicalDismissed: NarrativeStableHistoryChildLifecycleResultInternalV1 | null = null;
    let canonicalStale: NarrativeStableHistoryChildLifecycleResultInternalV1 | null = null;

    for (let index = 0; index < 10_000; index += 1) {
      const minted = mintHistoryIntentV1(
        fixture.harness,
        `bounded-controller-${String(index)}`,
        fixture.inputRouter,
        fixture.isGestureCurrent,
      );
      const prepared = fixture.session.getHistoryChildLifecycleInternalV1()
        .redeemHistoryOpenIntentInternalV1(minted.intent);
      minted.dispose();
      if (prepared.kind !== "preparing") {
        throw new Error("expected bounded History preparation");
      }
      const entry = currentHistoryEntryV1(fixture.runtime, "preparing");
      const controller = exactHistoryControllerV1(entry);
      if (controller === previousController) throw new Error("expected fresh bounded controller");
      if (previousController !== null) {
        const predecessorStale = previousController.closeInternalV1();
        if (canonicalStale === null) canonicalStale = predecessorStale;
        else expect(predecessorStale).toBe(canonicalStale);
        expectExactHistoryLifecycleResultV1(predecessorStale, "stale");
      }
      expect(fixture.inputRouter.route(Object.freeze({
        kind: "action" as const,
        actionId: playerInputActionIdsV1.toggleAuto,
      }))).toEqual({ kind: "handled", context: "narrative" });
      expect(currentHistoryEntryV1(fixture.runtime, "preparing").controller).toBe(controller);

      const result = index % 2 === 0
        ? controller.closeInternalV1()
        : controller.dismissInternalV1("back");
      if (index % 2 === 0) {
        expectExactHistoryLifecycleResultV1(result, "closed");
        if (canonicalClosed === null) canonicalClosed = result;
        else expect(result).toBe(canonicalClosed);
      } else {
        expectExactHistoryLifecycleResultV1(result, "dismissed");
        if (canonicalDismissed === null) canonicalDismissed = result;
        else expect(result).toBe(canonicalDismissed);
      }
      previousController = controller;
    }

    const finalState = fixture.harness.kernel.getStateInternalV1();
    expect(finalState.transientState.publication.orderedInstances).toEqual([]);
    expect(finalState.transientState.identitySequenceHighWater).toBe(
      initialState.transientState.identitySequenceHighWater + 10_000,
    );
    expect(finalState.stableRuntimeBindings).toHaveLength(1);
    expect(finalState.stableRuntimeBindings[0]?.binding).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "active" },
    });
    expect(fixture.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([
      expect.objectContaining({
        kind: "dialogue",
        phase: "active",
        renderKey: retainedRoot.renderKey,
      }),
    ]);
    expect(fixture.harness.stateNotificationCount()).toBe(initialNotifications + 20_000);
    expect(fixture.portalContainer.childElementCount).toBe(initialPortalChildren);
    expect(lower).not.toHaveBeenCalled();
    unregisterLower();
    fixture.runtime.attachment.releaseInternalV1();
    fixture.disposePortal();
  }, 30_000);

  it("fails pending root before History and stops cleanup after a synchronous successor", async () => {
    const detached = createConcurrentPendingHostFixtureV1("detach-order", 50);
    const detachedVectors: Array<readonly (readonly string[])[]> = [];
    detached.fixture.runtime.renderSource.subscribeInternalV1(() => {
      detachedVectors.push(
        detached.fixture.runtime.renderSource.getSnapshotInternalV1().entries.map((
          entry,
        ) => [entry.kind, entry.phase]),
      );
    });
    detached.fixture.runtime.attachment.releaseInternalV1();
    await Promise.resolve();
    expect(detachedVectors).toEqual([
      [
        ["dialogue", "suspended"],
        ["history", "preparing"],
      ],
      [["dialogue", "active"]],
      [],
    ]);
    expect(detached.fixture.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([]);
    expect(() =>
      createNarrativeStableHostRuntimeInternalV1(Object.freeze({
        session: detached.fixture.session,
        hostIdentity: detached.fixture.hostIdentity,
        portalContainer: detached.fixture.portalContainer,
        inputRouter: detached.fixture.inputRouter,
        isGestureCurrent: detached.fixture.isGestureCurrent,
      }))
    ).toThrowError("ui.narrative_stable_host_attachment_invalid");
    detached.fixture.disposePortal();

    const rescued = createConcurrentPendingHostFixtureV1("detach-rescue", 60);
    const rescuedVectors: Array<readonly (readonly string[])[]> = [];
    const successors: NarrativeStableHostRuntimeInternalV1[] = [];
    rescued.fixture.runtime.renderSource.subscribeInternalV1(() => {
      const vector = rescued.fixture.runtime.renderSource.getSnapshotInternalV1().entries.map(
        (entry) => [entry.kind, entry.phase],
      );
      rescuedVectors.push(vector);
      if (
        successors.length === 0 && vector.length === 2 &&
        vector[0]?.[0] === "dialogue" && vector[0]?.[1] === "suspended" &&
        vector[1]?.[0] === "history" && vector[1]?.[1] === "preparing"
      ) {
        successors.push(createNarrativeStableHostRuntimeInternalV1(Object.freeze({
          session: rescued.fixture.session,
          hostIdentity: rescued.fixture.hostIdentity,
          portalContainer: rescued.fixture.portalContainer,
          inputRouter: rescued.fixture.inputRouter,
          isGestureCurrent: rescued.fixture.isGestureCurrent,
        })));
      }
    });
    rescued.fixture.runtime.attachment.releaseInternalV1();
    await Promise.resolve();
    const successor = successors[0];
    if (successor === undefined) throw new Error("expected synchronous Host successor");
    expect(rescuedVectors).toEqual([[
      ["dialogue", "suspended"],
      ["history", "preparing"],
    ]]);
    expect(
      successor.renderSource.getSnapshotInternalV1().entries.map((entry) => [
        entry.kind,
        entry.phase,
      ]),
    ).toEqual([
      ["dialogue", "suspended"],
      ["history", "preparing"],
    ]);
    const survivingHistory = preparingEntryV1(successor, "history");
    if (survivingHistory.kind !== "history" || survivingHistory.preparation === null) {
      throw new Error("expected rescued History preparation");
    }
    expect(successor.attachment.settleHistoryReadinessReadyInternalV1(
      survivingHistory.preparation,
      prepareReadyCommitV1(successor, survivingHistory, rescued.fixture.portalContainer),
    )).toEqual({ kind: "settled", completion: null });
    expect(
      successor.renderSource.getSnapshotInternalV1().entries.map((entry) => [
        entry.kind,
        entry.phase,
      ]),
    ).toEqual([
      ["dialogue", "suspended"],
      ["history", "active"],
    ]);
    successor.attachment.releaseInternalV1();
    rescued.fixture.disposePortal();
  });

  it("terminally cascades ready root and History without rewriting either as failed", async () => {
    const { fixture } = createReadyHistoryHostFixtureV1("ready-detach", 70);
    const observedBindings: string[][] = [];
    const unsubscribeState = fixture.harness.kernel.subscribeStateInternalV1(() => {
      observedBindings.push(
        fixture.harness.kernel.getStateInternalV1().stableRuntimeBindings.map((entry) =>
          entry.binding.kind === "gap"
            ? `${entry.binding.kind}:${entry.binding.reason}`
            : entry.binding.kind
        ),
      );
    });
    const renderNotifications = vi.fn();
    fixture.runtime.renderSource.subscribeInternalV1(renderNotifications);

    fixture.runtime.attachment.releaseInternalV1();
    await Promise.resolve();

    expect(fixture.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([]);
    expect(renderNotifications).toHaveBeenCalledOnce();
    expect(observedBindings.flat()).not.toContain("gap:readiness_failed");
    expect(observedBindings.at(-1)).toEqual([]);
    unsubscribeState();
    fixture.disposePortal();
  });

  it("publishes one terminal empty snapshot and retires History observation ingress", () => {
    for (const terminalKind of ["bridge", "coordinator"] as const) {
      let rawSnapshot: NarrativeHistoryV1 = emptyNarrativeHistoryV1;
      let rawGetCount = 0;
      let rawSubscribeCount = 0;
      const rawListeners = new Set<() => void>();
      const rawCallbacks: Array<() => void> = [];
      const rawUnsubscribe = vi.fn((listener: () => void) => {
        rawListeners.delete(listener);
      });
      const historyObservationPort = {
        getSnapshotInternalV1(): NarrativeHistoryV1 {
          rawGetCount += 1;
          return rawSnapshot;
        },
        subscribeInternalV1(listener: () => void): () => void {
          rawSubscribeCount += 1;
          rawListeners.add(listener);
          rawCallbacks.push(listener);
          return () => rawUnsubscribe(listener);
        },
      } satisfies NarrativeStableHistoryObservationPortInternalV1;
      const { fixture, historyEntry } = createReadyHistoryHostFixtureV1(
        `terminal-${terminalKind}`,
        terminalKind === "bridge" ? 80 : 90,
        historyObservationPort,
      );
      const observation = historyEntry.historyObservation;
      const retainedCanonical = observation.getSnapshotInternalV1();
      const observationListener = vi.fn();
      const unsubscribeObservation = observation.subscribeInternalV1(observationListener);
      expect(rawSubscribeCount).toBe(1);
      expect(rawListeners.size).toBe(1);
      const renderSnapshots: NarrativeStableHostRenderSnapshotInternalV1[] = [];
      const observationRetiredBeforeRender: boolean[] = [];
      const unsubscribeRender = fixture.runtime.renderSource.subscribeInternalV1(() => {
        observationRetiredBeforeRender.push(
          rawUnsubscribe.mock.calls.length === 1 && rawListeners.size === 0 &&
            observationListener.mock.calls.length === 0,
        );
        renderSnapshots.push(fixture.runtime.renderSource.getSnapshotInternalV1());
      });

      if (terminalKind === "bridge") {
        expect(fixture.harness.bridge.disposeInternalV1()).toMatchObject({ kind: "applied" });
      } else {
        expect(fixture.harness.kernel.transitionTransientInternalV1({
          kind: "dispose_coordinator",
        })).toMatchObject({ kind: "applied", code: "surface.coordinator_disposed" });
      }

      expect(renderSnapshots).toHaveLength(1);
      expect(observationRetiredBeforeRender).toEqual([true]);
      expect(renderSnapshots[0]?.entries).toEqual([]);
      expect(fixture.runtime.renderSource.getSnapshotInternalV1()).toBe(renderSnapshots[0]);
      expect(rawUnsubscribe).toHaveBeenCalledOnce();
      expect(rawListeners.size).toBe(0);
      expect(observationListener).not.toHaveBeenCalled();
      const rawGetsAtTerminal = rawGetCount;
      const rawSubscribesAtTerminal = rawSubscribeCount;

      rawSnapshot = {
        entries: [{
          kind: "say",
          occurrenceId: `interaction-occurrence.terminal-${terminalKind}`,
          definitionId: `narrative.test.terminal-${terminalKind}`,
          seenRevision: 1,
          speakerTextId: null,
          textId: "text.test.must-not-enter-after-terminal",
          voiceAssetId: null,
        }],
      };
      rawCallbacks[0]?.();
      expect(rawGetCount).toBe(rawGetsAtTerminal);
      expect(observationListener).not.toHaveBeenCalled();
      expect(observation.getSnapshotInternalV1()).toBe(retainedCanonical);
      expect(rawGetCount).toBe(rawGetsAtTerminal);
      const lateObservationListener = vi.fn();
      const lateUnsubscribe = observation.subscribeInternalV1(lateObservationListener);
      expect(Object.isFrozen(lateUnsubscribe)).toBe(true);
      lateUnsubscribe();
      lateUnsubscribe();
      expect(rawSubscribeCount).toBe(rawSubscribesAtTerminal);
      expect(lateObservationListener).not.toHaveBeenCalled();

      const staleShell = document.createElement("div");
      staleShell.tabIndex = -1;
      fixture.portalContainer.append(staleShell);
      expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
        hostRuntime: fixture.runtime,
        renderEntry: historyEntry,
        portalShell: staleShell,
        initialFocusTarget: staleShell,
      }))).toEqual({ kind: "stale", completion: null });
      fixture.runtime.attachment.releaseInternalV1();
      const lateRenderListener = vi.fn();
      const lateRenderUnsubscribe = fixture.runtime.renderSource.subscribeInternalV1(
        lateRenderListener,
      );
      expect(Object.isFrozen(lateRenderUnsubscribe)).toBe(true);
      lateRenderUnsubscribe();
      lateRenderUnsubscribe();
      expect(lateRenderListener).not.toHaveBeenCalled();
      expect(() =>
        createNarrativeStableHostRuntimeInternalV1(Object.freeze({
          session: fixture.session,
          hostIdentity: fixture.hostIdentity,
          portalContainer: fixture.portalContainer,
          inputRouter: fixture.inputRouter,
          isGestureCurrent: fixture.isGestureCurrent,
        }))
      ).toThrowError("ui.narrative_stable_host_attachment_invalid");

      unsubscribeObservation();
      unsubscribeRender();
      expect(rawUnsubscribe).toHaveBeenCalledOnce();
      fixture.disposePortal();
    }
  });

  it("canonicalizes one History subscription and keeps render identity through root, child, and max-three replacement", async () => {
    let rawHistory: NarrativeHistoryV1 = { entries: [] };
    let rawListener: (() => void) | null = null;
    let activeRawSubscriptions = 0;
    const unsubscribeRaw = vi.fn(() => {
      activeRawSubscriptions -= 1;
      rawListener = null;
    });
    let historyObservationPort!: NarrativeStableHistoryObservationPortInternalV1;
    const capturedGetSnapshot = vi.fn(function (this: unknown) {
      expect(this).toBe(historyObservationPort);
      return {
        entries: rawHistory.entries.map((entry) => ({ ...entry })),
      };
    });
    const capturedSubscribe = vi.fn(function (
      this: unknown,
      listener: () => void,
    ): () => void {
      expect(this).toBe(historyObservationPort);
      expect(rawListener).toBeNull();
      rawListener = listener;
      activeRawSubscriptions += 1;
      return unsubscribeRaw;
    });
    historyObservationPort = {
      getSnapshotInternalV1: capturedGetSnapshot,
      subscribeInternalV1: capturedSubscribe,
    };
    const fixture = createNarrativeHostFixtureV1({ historyObservationPort });
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 1)))
      .toMatchObject({ kind: "applied" });
    const lateGetSnapshot = vi.fn(() => {
      throw new Error("post-capture History getter must not run");
    });
    const lateSubscribe = vi.fn(() => {
      throw new Error("post-capture History subscriber must not run");
    });
    Object.defineProperties(historyObservationPort, {
      getSnapshotInternalV1: {
        configurable: true,
        enumerable: true,
        get: lateGetSnapshot,
      },
      subscribeInternalV1: {
        configurable: true,
        enumerable: true,
        get: lateSubscribe,
      },
    });
    const rootPreparing = preparingEntryV1(fixture.runtime, "dialogue");
    if (rootPreparing.kind !== "dialogue" || rootPreparing.preparation === null) {
      throw new Error("expected root preparation");
    }
    const rootReady = prepareReadyCommitV1(
      fixture.runtime,
      rootPreparing,
      fixture.portalContainer,
    );
    expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      rootPreparing.preparation,
      rootReady,
    )).toEqual({ kind: "settled", completion: null });
    const rootActiveSnapshot = fixture.runtime.renderSource.getSnapshotInternalV1();
    const rootActive = rootActiveSnapshot.entries[0];
    expect(rootActive).toMatchObject({ kind: "dialogue", phase: "active" });
    if (rootActive?.kind !== "dialogue") throw new Error("expected active dialogue");

    const lifecycle = fixture.session.getHistoryChildLifecycleInternalV1();
    const minted = mintHistoryIntentV1(
      fixture.harness,
      "canonical-history",
      fixture.inputRouter,
      fixture.isGestureCurrent,
    );
    const preparedHistory = lifecycle.redeemHistoryOpenIntentInternalV1(minted.intent);
    if (preparedHistory.kind !== "preparing") throw new Error("expected History preparation");
    const rootAndPreparingHistory = fixture.runtime.renderSource.getSnapshotInternalV1();
    expect(rootAndPreparingHistory.entries.map((entry) => [entry.kind, entry.phase])).toEqual([
      ["dialogue", "suspended"],
      ["history", "preparing"],
    ]);
    expect(rootAndPreparingHistory.entries[0]?.renderKey).toBe(rootActive.renderKey);
    const historyPreparing = preparingEntryV1(fixture.runtime, "history");
    if (historyPreparing.kind !== "history" || historyPreparing.preparation === null) {
      throw new Error("expected History preparation entry");
    }
    expect(historyPreparing.parentRenderKey).toBe(rootActive.renderKey);
    expect(historyPreparing.rendererProps).toMatchObject({
      kind: "history",
      visualConfig: defaultCandidateSnapshotV1.visualConfig,
    });
    const suspendedParent = rootAndPreparingHistory.entries[0];
    if (suspendedParent?.kind !== "dialogue") throw new Error("expected suspended parent");
    expect(historyPreparing.rendererProps.playerProfile).toBe(
      suspendedParent.playerObservation.getSnapshotInternalV1().playerProfile,
    );
    expect(historyPreparing.rendererProps.playerProfile).not.toBe(
      defaultCandidateSnapshotV1.playerProfile,
    );
    expect(Object.isFrozen(historyPreparing.rendererProps.playerProfile)).toBe(true);
    expect(Reflect.ownKeys(historyPreparing.rendererProps.playerProfile)).toEqual([
      "profileRevision",
      "seen",
      "meta",
      "preferences",
    ]);
    expect(historyPreparing.rendererProps.textResolver).toBe(
      suspendedParent.rendererProps.textResolver,
    );
    expect(historyPreparing.rendererProps.textResolver).not.toBe(
      defaultCandidateSnapshotV1.textResolver,
    );
    expect(typeof historyPreparing.rendererProps.textResolver).toBe("function");
    expect(Object.isFrozen(historyPreparing.rendererProps.textResolver)).toBe(true);
    expect(historyPreparing.rendererProps.textResolver("text.test.history"))
      .toBe("text.test.history");
    expect(Object.hasOwn(historyPreparing.rendererProps, "history")).toBe(false);
    const renderObservation = historyPreparing.historyObservation;
    expectFrozenOwnMethodsV1(renderObservation, [
      "getSnapshotInternalV1",
      "subscribeInternalV1",
    ]);
    const firstHistory = renderObservation.getSnapshotInternalV1();
    expect(firstHistory).toEqual(emptyNarrativeHistoryV1);
    expect(firstHistory).not.toBe(rawHistory);
    expect(renderObservation.getSnapshotInternalV1()).toBe(firstHistory);
    const historyNotifications = vi.fn();
    const unsubscribe = renderObservation.subscribeInternalV1(historyNotifications);
    expect(activeRawSubscriptions).toBe(1);
    expect(rawListener).not.toBeNull();
    const emitRawHistory = (): void => {
      const listener = rawListener as (() => void) | null;
      if (listener === null) throw new Error("expected raw History listener");
      listener();
    };

    const sameIdentityRawHistory = {
      entries: [{
        kind: "say" as const,
        occurrenceId: "interaction-occurrence.1001",
        definitionId: "narrative.test.history-1",
        seenRevision: 1,
        speakerTextId: "text.test.speaker",
        textId: "text.test.line",
        voiceAssetId: null,
      }],
    };
    rawHistory = sameIdentityRawHistory;
    emitRawHistory();
    expect(historyNotifications).toHaveBeenCalledOnce();
    const changedHistory = renderObservation.getSnapshotInternalV1();
    expect(changedHistory).not.toBe(firstHistory);
    expect(Object.isFrozen(changedHistory)).toBe(true);
    expect(Object.isFrozen(changedHistory.entries)).toBe(true);
    expect(Object.isFrozen(changedHistory.entries[0])).toBe(true);
    sameIdentityRawHistory.entries[0]!.textId = "text.test.line.mutated";
    emitRawHistory();
    expect(historyNotifications).toHaveBeenCalledTimes(2);
    const mutatedHistory = renderObservation.getSnapshotInternalV1();
    expect(mutatedHistory).not.toBe(changedHistory);
    expect(mutatedHistory.entries[0]?.textId).toBe("text.test.line.mutated");
    expect(changedHistory.entries[0]?.textId).toBe("text.test.line");
    rawHistory = { entries: rawHistory.entries.map((entry) => ({ ...entry })) };
    emitRawHistory();
    expect(historyNotifications).toHaveBeenCalledTimes(2);
    for (let index = 0; index < 10_000; index += 1) {
      rawHistory = { entries: rawHistory.entries.map((entry) => ({ ...entry })) };
      expect(renderObservation.getSnapshotInternalV1()).toBe(mutatedHistory);
    }
    expect(activeRawSubscriptions).toBe(1);
    expect(capturedGetSnapshot).toHaveBeenCalled();
    expect(capturedSubscribe).toHaveBeenCalledOnce();
    expect(lateGetSnapshot).not.toHaveBeenCalled();
    expect(lateSubscribe).not.toHaveBeenCalled();

    const historyReady = prepareReadyCommitV1(
      fixture.runtime,
      historyPreparing,
      fixture.portalContainer,
    );
    expect(fixture.runtime.attachment.settleHistoryReadinessReadyInternalV1(
      preparedHistory.preparation,
      historyReady,
    )).toEqual({ kind: "settled", completion: null });
    const historyActiveSnapshot = fixture.runtime.renderSource.getSnapshotInternalV1();
    expect(historyActiveSnapshot.entries.map((entry) => [entry.kind, entry.phase])).toEqual([
      ["dialogue", "suspended"],
      ["history", "active"],
    ]);
    expect(historyActiveSnapshot.entries[1]?.renderKey).toBe(historyPreparing.renderKey);
    expect(
      (historyActiveSnapshot.entries[1] as Extract<
        NarrativeStableHostRenderEntryInternalV1,
        { readonly kind: "history" }
      >).historyObservation,
    ).toBe(renderObservation);

    Object.defineProperties(historyObservationPort, {
      getSnapshotInternalV1: {
        configurable: true,
        enumerable: true,
        writable: true,
        value: capturedGetSnapshot,
      },
      subscribeInternalV1: {
        configurable: true,
        enumerable: true,
        writable: true,
        value: capturedSubscribe,
      },
    });

    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 2)))
      .toMatchObject({ kind: "applied" });
    const maxThree = fixture.runtime.renderSource.getSnapshotInternalV1();
    expect(maxThree.entries.map((entry) => [entry.kind, entry.phase])).toEqual([
      ["dialogue", "suspended"],
      ["history", "active"],
      ["dialogue", "preparing"],
    ]);
    expect(maxThree.entries[0]).toBe(historyActiveSnapshot.entries[0]);
    expect(maxThree.entries[1]).toBe(historyActiveSnapshot.entries[1]);
    expect(fixture.runtime.renderSource.getSnapshotInternalV1()).toBe(maxThree);
    const replacement = maxThree.entries[2];
    if (replacement?.kind !== "dialogue" || replacement.preparation === null) {
      throw new Error("expected replacement preparation");
    }
    expect(fixture.runtime.attachment.settleRootReadinessFailedInternalV1(
      replacement.preparation,
    )).toEqual({ kind: "settled", completion: null });
    const retainedAfterFailure = fixture.runtime.renderSource.getSnapshotInternalV1();
    expect(retainedAfterFailure.entries.map((entry) => [entry.kind, entry.phase])).toEqual([
      ["dialogue", "suspended"],
      ["history", "active"],
    ]);
    expect(retainedAfterFailure.entries[0]?.renderKey).toBe(rootActive.renderKey);
    expect(retainedAfterFailure.entries[1]?.renderKey).toBe(historyPreparing.renderKey);

    unsubscribe();
    unsubscribe();
    expect(activeRawSubscriptions).toBe(1);
    expect(unsubscribeRaw).not.toHaveBeenCalled();
    const strictModeProbe = vi.fn();
    const unsubscribeStrictModeProbe = renderObservation.subscribeInternalV1(strictModeProbe);
    expect(capturedSubscribe).toHaveBeenCalledOnce();
    expect(activeRawSubscriptions).toBe(1);
    unsubscribeStrictModeProbe();
    unsubscribeStrictModeProbe();
    expect(activeRawSubscriptions).toBe(1);
    expect(unsubscribeRaw).not.toHaveBeenCalled();

    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say", 3)))
      .toMatchObject({ kind: "applied" });
    const structuralReplacementSnapshot = fixture.runtime.renderSource
      .getSnapshotInternalV1();
    expect(structuralReplacementSnapshot.entries.map((entry) => [entry.kind, entry.phase]))
      .toEqual([
        ["dialogue", "suspended"],
        ["history", "active"],
        ["dialogue", "preparing"],
      ]);
    const structuralReplacement = structuralReplacementSnapshot.entries[2];
    if (
      structuralReplacement?.kind !== "dialogue" ||
      structuralReplacement.preparation === null
    ) {
      throw new Error("expected structural root replacement preparation");
    }
    expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      structuralReplacement.preparation,
      prepareReadyCommitV1(
        fixture.runtime,
        structuralReplacement,
        fixture.portalContainer,
      ),
    )).toEqual({ kind: "settled", completion: null });
    expect(
      fixture.runtime.renderSource.getSnapshotInternalV1().entries.map((entry) => [
        entry.kind,
        entry.phase,
      ]),
    ).toEqual([["dialogue", "active"]]);
    expect(unsubscribeRaw).toHaveBeenCalledOnce();
    expect(activeRawSubscriptions).toBe(0);
    const capturedReadsAfterRetirement = capturedGetSnapshot.mock.calls.length;
    expect(renderObservation.getSnapshotInternalV1()).toBe(mutatedHistory);
    expect(capturedGetSnapshot).toHaveBeenCalledTimes(capturedReadsAfterRetirement);
    const retiredProbe = vi.fn();
    const unsubscribeRetiredProbe = renderObservation.subscribeInternalV1(retiredProbe);
    expect(Object.isFrozen(unsubscribeRetiredProbe)).toBe(true);
    unsubscribeRetiredProbe();
    unsubscribeRetiredProbe();
    expect(capturedSubscribe).toHaveBeenCalledOnce();
    expect(retiredProbe).not.toHaveBeenCalled();

    minted.dispose();
    fixture.runtime.attachment.releaseInternalV1();
    await Promise.resolve();
    expect(unsubscribeRaw).toHaveBeenCalledOnce();
    expect(activeRawSubscriptions).toBe(0);
    expect(strictModeProbe).not.toHaveBeenCalled();
    fixture.disposePortal();
  });

  it("settles root and History failure once with the restored render snapshot already visible", () => {
    const initial = createNarrativeHostFixtureV1();
    expect(initial.harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
    });
    const initialRoot = preparingEntryV1(initial.runtime, "dialogue");
    if (initialRoot.kind !== "dialogue" || initialRoot.preparation === null) {
      throw new Error("expected initial root preparation");
    }
    const observedRootSnapshots: NarrativeStableHostRenderSnapshotInternalV1[] = [];
    const unsubscribeRoot = initial.runtime.renderSource.subscribeInternalV1(() => {
      observedRootSnapshots.push(initial.runtime.renderSource.getSnapshotInternalV1());
    });
    expect(initial.runtime.attachment.settleRootReadinessFailedInternalV1(
      initialRoot.preparation,
    )).toEqual({ kind: "settled", completion: null });
    expect(initial.runtime.renderSource.getSnapshotInternalV1().entries).toEqual([]);
    expect(observedRootSnapshots.at(-1)?.entries).toEqual([]);
    expect(initial.runtime.attachment.settleRootReadinessFailedInternalV1(
      initialRoot.preparation,
    )).toEqual({ kind: "stale", completion: null });
    unsubscribeRoot();
    initial.runtime.attachment.releaseInternalV1();
    initial.disposePortal();

    const history = createNarrativeHostFixtureV1();
    expect(history.harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
    });
    const root = preparingEntryV1(history.runtime, "dialogue");
    if (root.kind !== "dialogue" || root.preparation === null) {
      throw new Error("expected root preparation");
    }
    expect(history.runtime.attachment.settleRootReadinessReadyInternalV1(
      root.preparation,
      prepareReadyCommitV1(history.runtime, root, history.portalContainer),
    )).toEqual({ kind: "settled", completion: null });
    const activeRoot = history.runtime.renderSource.getSnapshotInternalV1().entries[0];
    const minted = mintHistoryIntentV1(
      history.harness,
      "failure",
      history.inputRouter,
      history.isGestureCurrent,
    );
    const preparation = history.session.getHistoryChildLifecycleInternalV1()
      .redeemHistoryOpenIntentInternalV1(minted.intent);
    if (preparation.kind !== "preparing") throw new Error("expected History preparation");
    expect(history.runtime.attachment.settleHistoryReadinessFailedInternalV1(
      preparation.preparation,
    )).toEqual({ kind: "settled", completion: null });
    const restored = history.runtime.renderSource.getSnapshotInternalV1();
    expect(restored.entries).toHaveLength(1);
    expect(restored.entries[0]).toMatchObject({ kind: "dialogue", phase: "active" });
    expect(restored.entries[0]?.renderKey).toBe(activeRoot?.renderKey);
    expect(history.runtime.attachment.settleHistoryReadinessFailedInternalV1(
      preparation.preparation,
    )).toEqual({ kind: "stale", completion: null });
    minted.dispose();
    history.runtime.attachment.releaseInternalV1();
    history.disposePortal();
  });

  it("validates Host acquisition before lease mutation and classifies disconnected or foreign ready mint inputs", () => {
    const harness = createSessionHarnessV1();
    const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const inputRouter = createInputRouterV1();
    const hostIdentity = Object.freeze({ host: "validation" });
    const isGestureCurrent = () => true;
    const valid = Object.freeze({
      session,
      hostIdentity,
      portalContainer,
      inputRouter,
      isGestureCurrent,
    });
    let sessionReads = 0;
    const accessorInput = Object.defineProperty(
      {
        hostIdentity,
        portalContainer,
        inputRouter,
        isGestureCurrent,
      },
      "session",
      {
        enumerable: true,
        get() {
          sessionReads += 1;
          return session;
        },
      },
    );
    const invalidInputs: readonly unknown[] = Object.freeze([
      null,
      Object.freeze({}),
      Object.freeze({ ...valid, extra: true }),
      Object.freeze({ ...valid, session: Object.freeze({}) }),
      Object.freeze({ ...valid, portalContainer: document.body }),
      Object.freeze({ ...valid, inputRouter: Object.freeze({}) }),
      Object.freeze({ ...valid, isGestureCurrent: true }),
      accessorInput,
    ]);
    for (const input of invalidInputs) {
      expectTypeErrorV1(
        () => createNarrativeStableHostRuntimeInternalV1(input as never),
        "ui.narrative_stable_host_attachment_invalid",
      );
    }
    expect(sessionReads).toBe(0);

    const runtime = createNarrativeStableHostRuntimeInternalV1(valid);
    expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
    });
    const root = preparingEntryV1(runtime, "dialogue");
    const disconnectedShell = document.createElement("div");
    expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
      hostRuntime: runtime,
      renderEntry: root,
      portalShell: disconnectedShell,
      initialFocusTarget: disconnectedShell,
    }))).toEqual({ kind: "stale", completion: null });
    const connectedShell = document.createElement("div");
    const foreignFocus = document.createElement("button");
    portalContainer.append(connectedShell, foreignFocus);
    expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
      hostRuntime: runtime,
      renderEntry: root,
      portalShell: connectedShell,
      initialFocusTarget: foreignFocus,
    }))).toEqual({ kind: "stale", completion: null });
    expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
      hostRuntime: Object.freeze({}),
      renderEntry: root,
      portalShell: connectedShell,
      initialFocusTarget: connectedShell,
    }) as never)).toEqual({ kind: "faulted", completion: null });
    runtime.attachment.releaseInternalV1();
    portalContainer.remove();
  });

  it("releases the exact Host lease and partial runtime after post-attach setup failure", async () => {
    const occupyBothNarrativePreparationSlots = (
      inputRouter: ReturnType<typeof createInputRouterV1>,
      isGestureCurrent: () => boolean,
    ): readonly ManagedSurfacePreparedContractBoundActionBindingInternalV1[] =>
      Object.freeze([0, 1].map((index) =>
        managedSurfaceActionRouteModuleV1
          .prepareManagedSurfaceContractBoundActionBindingInternalV1({
            authority: Object.freeze({
              routeActionInternalV1: () => {
                throw new Error(`foreign prepared authority ${index} must not route`);
              },
            }),
            inputContextId: "narrative",
            inputRouter,
            isGestureCurrent,
          })
      ));
    const createPostAttachFaultFixture = (suffix: string) => {
      const harness = createSessionHarnessV1();
      const session = createNarrativeStableSessionInternalV1({ bridge: harness.bridge });
      expect(harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
        .toMatchObject({ kind: "applied" });
      const portalContainer = document.createElement("div");
      document.body.append(portalContainer);
      const inputRouter = createInputRouterV1();
      const isGestureCurrent = () => true;
      const hostIdentity = Object.freeze({ host: `post-attach-fault-${suffix}` });
      const input = Object.freeze({
        session,
        hostIdentity,
        portalContainer,
        inputRouter,
        isGestureCurrent,
      });
      const occupied = occupyBothNarrativePreparationSlots(
        inputRouter,
        isGestureCurrent,
      );
      expect(() => createNarrativeStableHostRuntimeInternalV1(input))
        .toThrowError("ui.narrative_stable_host_attachment_invalid");
      for (const prepared of occupied) prepared.abortInternalV1();
      return Object.freeze({
        harness,
        session,
        portalContainer,
        inputRouter,
        isGestureCurrent,
        hostIdentity,
        input,
      });
    };

    const sameHost = createPostAttachFaultFixture("same-host");
    const sameHostRetry = createNarrativeStableHostRuntimeInternalV1(sameHost.input);
    expect(sameHostRetry.renderSource.getSnapshotInternalV1().entries).toHaveLength(1);
    sameHostRetry.attachment.releaseInternalV1();
    await Promise.resolve();
    sameHost.portalContainer.remove();

    const foreignHost = createPostAttachFaultFixture("foreign-host");
    await Promise.resolve();
    const foreignRetry = createNarrativeStableHostRuntimeInternalV1(Object.freeze({
      session: foreignHost.session,
      hostIdentity: Object.freeze({ host: "post-attach-fault-foreign-retry" }),
      portalContainer: foreignHost.portalContainer,
      inputRouter: foreignHost.inputRouter,
      isGestureCurrent: foreignHost.isGestureCurrent,
    }));
    expect(foreignRetry.renderSource.getSnapshotInternalV1().entries).toHaveLength(1);
    foreignRetry.attachment.releaseInternalV1();
    await Promise.resolve();
    foreignHost.portalContainer.remove();
  });

  it("reattaches one exact Host and portal during grace, then terminal-disposes after real detach", async () => {
    const prepareBinding = vi.spyOn(
      managedSurfaceActionRouteModuleV1,
      "prepareManagedSurfaceContractBoundActionBindingInternalV1",
    );
    const preclaimRoute = vi.spyOn(
      managedSurfaceActionRouteModuleV1,
      "claimManagedSurfacePreparedAuthenticatedActionRouteInternalV1",
    );
    const fixture = createNarrativeHostFixtureV1();
    expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say"))).toMatchObject({
      kind: "applied",
    });
    const preparing = preparingEntryV1(fixture.runtime, "dialogue");
    if (preparing.kind !== "dialogue" || preparing.preparation === null) {
      throw new Error("expected root preparation");
    }
    const readyCommit = prepareReadyCommitV1(
      fixture.runtime,
      preparing,
      fixture.portalContainer,
    );
    expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
      preparing.preparation,
      readyCommit,
    )).toEqual({ kind: "settled", completion: null });
    const active = fixture.runtime.renderSource.getSnapshotInternalV1().entries[0];
    if (active?.kind !== "dialogue") throw new Error("expected active root");
    const alternatePortal = document.createElement("div");
    document.body.append(alternatePortal);
    expectTypeErrorV1(
      () =>
        createNarrativeStableHostRuntimeInternalV1(Object.freeze({
          session: fixture.session,
          hostIdentity: fixture.hostIdentity,
          portalContainer: alternatePortal,
          inputRouter: fixture.inputRouter,
          isGestureCurrent: fixture.isGestureCurrent,
        })),
      "ui.narrative_stable_host_portal_conflict",
    );
    expectTypeErrorV1(
      () =>
        createNarrativeStableHostRuntimeInternalV1(Object.freeze({
          session: fixture.session,
          hostIdentity: Object.freeze({ host: "foreign" }),
          portalContainer: fixture.portalContainer,
          inputRouter: fixture.inputRouter,
          isGestureCurrent: fixture.isGestureCurrent,
        })),
      "ui.narrative_stable_host_lease_conflict",
    );

    fixture.runtime.attachment.releaseInternalV1();
    expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
      hostRuntime: fixture.runtime,
      renderEntry: active,
      portalShell: fixture.portalContainer.firstElementChild as HTMLDivElement,
      initialFocusTarget: fixture.portalContainer.firstElementChild as HTMLElement,
    }))).toEqual({ kind: "stale", completion: null });
    const successor = createNarrativeStableHostRuntimeInternalV1(Object.freeze({
      session: fixture.session,
      hostIdentity: fixture.hostIdentity,
      portalContainer: fixture.portalContainer,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: fixture.isGestureCurrent,
    }));
    expect(successor.renderSource).toBe(fixture.runtime.renderSource);
    const successorActive = successor.renderSource.getSnapshotInternalV1().entries[0];
    expect(successorActive).toBe(active);
    const successorShell = document.createElement("div");
    successorShell.tabIndex = -1;
    fixture.portalContainer.append(successorShell);
    expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
      hostRuntime: successor,
      renderEntry: successorActive!,
      portalShell: successorShell,
      initialFocusTarget: successorShell,
    }))).toEqual({ kind: "reattached", completion: null });
    await Promise.resolve();
    expect(successor.renderSource.getSnapshotInternalV1().entries).toHaveLength(1);

    prepareBinding.mockClear();
    preclaimRoute.mockClear();
    const reattachedAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: fixture.harness.bridge,
      inputRouter: fixture.inputRouter,
      isGestureCurrent: fixture.isGestureCurrent,
    });
    expect(prepareBinding).not.toHaveBeenCalled();
    expect(preclaimRoute).not.toHaveBeenCalled();
    const reattachedAttempt = reattachedAdmission.issueHistoryOpenAttemptInternalV1();
    if (reattachedAttempt === null) throw new Error("expected reattached History attempt");
    expect(reattachedAdmission.routeInternalV1(
      reattachedAdmission.createEnvelopeInternalV1({
        actionId: toggleHistoryActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1("gesture.session-test.reattached"),
      }),
      reattachedAttempt,
    )).toMatchObject({
      consumerResult: { kind: "requested" },
      route: {
        input: { kind: "consumed", code: "input.managed_surface_consumed" },
        surface: { kind: "unchanged", code: "surface.action_routed" },
      },
    });
    reattachedAdmission.disposeInternalV1();

    successor.attachment.releaseInternalV1();
    await Promise.resolve();
    expect(successor.renderSource.getSnapshotInternalV1().entries).toEqual([]);
    expect(
      fixture.harness.kernel.getStateInternalV1().transientState.publication.orderedInstances,
    ).toEqual([]);
    expectTypeErrorV1(
      () =>
        createNarrativeStableHostRuntimeInternalV1(Object.freeze({
          session: fixture.session,
          hostIdentity: fixture.hostIdentity,
          portalContainer: fixture.portalContainer,
          inputRouter: fixture.inputRouter,
          isGestureCurrent: fixture.isGestureCurrent,
        })),
      "ui.narrative_stable_host_attachment_invalid",
    );
    alternatePortal.remove();
    fixture.disposePortal();
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

  it(
    "keeps the real Host runtime, render source, and late generations bounded across 10k churn",
    async () => {
      const fixture = createNarrativeHostFixtureV1();
      expect(fixture.harness.bridge.reconcilePendingInternalV1(pendingV1("say")))
        .toMatchObject({ kind: "applied" });
      const preparing = preparingEntryV1(fixture.runtime, "dialogue");
      if (preparing.kind !== "dialogue" || preparing.preparation === null) {
        throw new Error("expected bounded root preparation");
      }
      const readyCommit = prepareReadyCommitV1(
        fixture.runtime,
        preparing,
        fixture.portalContainer,
      );
      const portalShell = fixture.portalContainer.lastElementChild;
      if (!(portalShell instanceof HTMLDivElement)) {
        throw new Error("expected bounded Host shell");
      }
      expect(fixture.runtime.attachment.settleRootReadinessReadyInternalV1(
        preparing.preparation,
        readyCommit,
      )).toEqual({ kind: "settled", completion: null });

      const renderSource = fixture.runtime.renderSource;
      const activeSnapshot = renderSource.getSnapshotInternalV1();
      const activeEntry = activeSnapshot.entries[0];
      if (activeEntry?.kind !== "dialogue" || activeEntry.phase !== "active") {
        throw new Error("expected bounded active root");
      }
      const state = fixture.harness.kernel.getStateInternalV1();
      const notifications = fixture.harness.stateNotificationCount();
      const firstRuntime = fixture.runtime;
      let currentRuntime = firstRuntime;

      for (let index = 0; index < 10_000; index += 1) {
        const retiredRuntime = currentRuntime;
        const unsubscribe = renderSource.subscribeInternalV1(() => {
          throw new Error("bounded render listener must remain silent");
        });
        unsubscribe();
        unsubscribe();
        retiredRuntime.attachment.releaseInternalV1();
        retiredRuntime.attachment.releaseInternalV1();
        expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
          hostRuntime: retiredRuntime,
          renderEntry: activeEntry,
          portalShell,
          initialFocusTarget: portalShell,
        }))).toEqual({ kind: "stale", completion: null });
        expect(retiredRuntime.attachment.settleRootReadinessReadyInternalV1(
          preparing.preparation,
          readyCommit,
        )).toEqual({ kind: "stale", completion: null });

        currentRuntime = createNarrativeStableHostRuntimeInternalV1(Object.freeze({
          session: fixture.session,
          hostIdentity: fixture.hostIdentity,
          portalContainer: fixture.portalContainer,
          inputRouter: fixture.inputRouter,
          isGestureCurrent: fixture.isGestureCurrent,
        }));
        expect(currentRuntime.renderSource).toBe(renderSource);
        expect(currentRuntime.renderSource.getSnapshotInternalV1()).toBe(activeSnapshot);
        expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
          hostRuntime: currentRuntime,
          renderEntry: activeEntry,
          portalShell,
          initialFocusTarget: portalShell,
        }))).toEqual({ kind: "reattached", completion: null });
      }
      await Promise.resolve();

      expect(firstRuntime).not.toBe(currentRuntime);
      expect(fixture.harness.kernel.getStateInternalV1()).toBe(state);
      expect(fixture.harness.stateNotificationCount()).toBe(notifications);
      expect(renderSource.getSnapshotInternalV1()).toBe(activeSnapshot);
      currentRuntime.attachment.releaseInternalV1();
      await Promise.resolve();
      expect(renderSource.getSnapshotInternalV1().entries).toEqual([]);
      expect(prepareNarrativeStableHostReadyCommitInternalV1(Object.freeze({
        hostRuntime: currentRuntime,
        renderEntry: activeEntry,
        portalShell,
        initialFocusTarget: portalShell,
      }))).toEqual({ kind: "stale", completion: null });
      fixture.disposePortal();
    },
    30_000,
  );
});
