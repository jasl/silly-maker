// SPDX-License-Identifier: MIT
import { emptyNarrativeHistoryV1, parseNonNegativeSafeInteger } from "@sillymaker/base";
import { defaultPlayerProfileV1, type PlayerProfileV1 } from "@sillymaker/base/runtime";
import { describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceGestureIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { createManagedSurfaceCompositeKernelBundleInternalV1 } from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import type { ManagedSurfaceStableAdmissionAuthorityInternalV1 } from "../managed-surfaces/managed-surface-stable-admission.ts";
import type { ManagedSurfaceStableAdmittedTargetInternalV1 } from "../managed-surfaces/managed-surface-stable-contract.ts";
import {
  createManagedSurfaceStableReadyRuntimeBindingInternalV1,
  reconcileManagedSurfaceStableRootReservationsInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableRootReservationContributorCandidateInternalV1,
  type ManagedSurfaceStableRuntimeEntryInternalV1,
} from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import type { ManagedSurfaceStablePublisherLeaseRegistryInternalV1 } from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
import {
  createNarrativeStableDialoguePlayerControllerInternalV1,
  type CreateNarrativeStableDialoguePlayerControllerInputInternalV1,
  type NarrativeStableDialoguePlayerClockPortInternalV1,
  type NarrativeStableDialoguePlayerControllerInternalV1,
  type NarrativeStableDialoguePlayerProfilePortInternalV1,
  type NarrativeStableDialoguePlayerTextResolverPortInternalV1,
} from "./dialogue-player-controller.ts";
import {
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  createNarrativeStablePhysicalActionAdmissionInternalV1,
  createNarrativeStablePublisherBridgeInternalV1,
  type NarrativeManagedSurfaceFamilyContractInternalV1,
  type NarrativeStableAdmittedFrameInternalV1,
  type NarrativeStableCandidatePreflightInternalV1,
  type NarrativeStableHistoryAvailabilityPortInternalV1,
  type NarrativeStableHistoryObservationPortInternalV1,
  type NarrativeStablePublisherBridgeInternalV1,
  type NarrativeStableSemanticResolutionPortInternalV1,
} from "./narrative-managed-surface-family.ts";

const applicationEpochV1 = parseNonNegativeSafeInteger(142);
const narrativeAdvanceActionIdV1 = parseManagedSurfaceActionIdV1("narrative.advance");
const narrativeToggleAutoActionIdV1 = parseManagedSurfaceActionIdV1("player.toggle_auto");
const narrativeToggleSkipActionIdV1 = parseManagedSurfaceActionIdV1("player.toggle_skip");

interface ManualDialogueClockV1 {
  readonly port: NarrativeStableDialoguePlayerClockPortInternalV1;
  readonly now: ReturnType<typeof vi.fn>;
  readonly requestTick: ReturnType<typeof vi.fn>;
  readonly prefersReducedMotion: ReturnType<typeof vi.fn>;
  readonly cancel: ReturnType<typeof vi.fn>;
  setNow(nowMs: number): void;
  fire(nowMs: number): void;
  latestTick(): (nowMs: number) => void;
}

function manualDialogueClockV1(input: {
  readonly initialNowMs?: number;
  readonly reducedMotion?: boolean;
} = {}): ManualDialogueClockV1 {
  let currentNowMs = input.initialNowMs ?? 1_000;
  let pendingTick: ((nowMs: number) => void) | null = null;
  let latestTick: ((nowMs: number) => void) | null = null;
  const now = vi.fn(() => currentNowMs);
  const prefersReducedMotion = vi.fn(() => input.reducedMotion ?? false);
  const cancel = vi.fn(() => {
    pendingTick = null;
  });
  const cancelCallback = cancel;
  const requestTick = vi.fn((callback: (nowMs: number) => void) => {
    pendingTick = callback;
    latestTick = callback;
    return cancelCallback;
  });
  const port = ({
    nowInternalV1: now,
    requestTickInternalV1: requestTick,
    prefersReducedMotionInternalV1: prefersReducedMotion,
  }) satisfies NarrativeStableDialoguePlayerClockPortInternalV1;
  return {
    port,
    now,
    requestTick,
    prefersReducedMotion,
    cancel,
    setNow: (nowMs) => {
      currentNowMs = nowMs;
    },
    fire: (nowMs) => {
      currentNowMs = nowMs;
      const callback = pendingTick;
      pendingTick = null;
      if (callback === null) throw new Error("expected one scheduled Dialogue tick");
      callback(nowMs);
    },
    latestTick: () => {
      if (latestTick === null) throw new Error("expected a scheduled Dialogue tick");
      return latestTick;
    },
  };
}

/** Lets an in-flight semantic dispatch completion settle its latch. */
function flushDialogueMicrotasksV1(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

interface MutableDialogueProfileV1 {
  readonly port: NarrativeStableDialoguePlayerProfilePortInternalV1;
  readonly getSnapshot: ReturnType<typeof vi.fn>;
  readonly subscribe: ReturnType<typeof vi.fn>;
  readonly markSeen: ReturnType<typeof vi.fn>;
  readonly unsubscribe: ReturnType<typeof vi.fn>;
  publish(snapshot: PlayerProfileV1): void;
}

function mutableDialogueProfileV1(
  initialSnapshot: PlayerProfileV1 = defaultPlayerProfileV1,
): MutableDialogueProfileV1 {
  let snapshot = initialSnapshot;
  let listener: (() => void) | null = null;
  const getSnapshot = vi.fn(() => snapshot);
  const unsubscribe = vi.fn(() => {
    listener = null;
  });
  const unsubscribeCallback = unsubscribe;
  const subscribe = vi.fn((nextListener: () => void) => {
    listener = nextListener;
    return unsubscribeCallback;
  });
  const markSeen = vi.fn((_definitionId: string, _seenRevision: number) => {});
  const port = ({
    getSnapshotInternalV1: getSnapshot,
    subscribeInternalV1: subscribe,
    markSeenInternalV1: markSeen,
  }) satisfies NarrativeStableDialoguePlayerProfilePortInternalV1;
  return {
    port,
    getSnapshot,
    subscribe,
    markSeen,
    unsubscribe,
    publish: (nextSnapshot) => {
      snapshot = nextSnapshot;
      listener?.();
    },
  };
}

interface DialogueTextResolverV1 {
  readonly port: NarrativeStableDialoguePlayerTextResolverPortInternalV1;
  readonly resolveText: ReturnType<typeof vi.fn>;
}

function dialogueTextResolverV1(
  resolve: (textId: string) => string = (textId) =>
    textId === "text.test.speaker" ? "Speaker" : "A\u{1f600}B",
): DialogueTextResolverV1 {
  const resolveText = vi.fn(resolve);
  return {
    port: { resolveTextInternalV1: resolveText },
    resolveText,
  };
}

const semanticDispatchPortV1 = ({
  dispatchResolutionInternalV1: (_request: unknown) => Promise.resolve(undefined),
}) satisfies NarrativeStableSemanticResolutionPortInternalV1;

const historyAvailabilityPortV1 = ({
  readHistoryAvailabilityInternalV1: () => true,
}) satisfies NarrativeStableHistoryAvailabilityPortInternalV1;

const historyObservationPortV1 = ({
  getSnapshotInternalV1: () => emptyNarrativeHistoryV1,
  subscribeInternalV1: (_listener: () => void) => (() => {}),
}) satisfies NarrativeStableHistoryObservationPortInternalV1;

function sayPendingV1(sequence = 1, advancePolicy: "confirm" | "auto" = "confirm") {
  return ({
    kind: "say" as const,
    definitionId: "narrative.test.dialogue-player",
    seenRevision: 3,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    speakerTextId: "text.test.speaker",
    textId: "text.test.line",
    advancePolicy,
  });
}

function passivePendingV1(sequence = 1) {
  return ({
    kind: "choice" as const,
    definitionId: "narrative.test.dialogue-player-choice",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(10_000 + sequence)}`,
    promptTextId: "text.test.prompt",
    options: [
      { choiceId: "choice.test.first", textId: "text.test.first" },
    ],
  });
}

function holdPendingV1(sequence = 1, durationMs = 100, tickQuantumMs?: number) {
  return ({
    kind: "hold" as const,
    definitionId: "narrative.test.dialogue-player-hold",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(20_000 + sequence)}`,
    totalMs: durationMs,
    remainingMs: durationMs,
    skippable: true,
    ...(tickQuantumMs === undefined ? {} : { tickQuantumMs }),
  });
}

interface ControlledDialogueProfileV1 {
  readonly port: object;
  readonly getSnapshot: ReturnType<typeof vi.fn>;
  readonly markSeen: ReturnType<typeof vi.fn>;
  readonly unsubscribe: ReturnType<typeof vi.fn>;
  setRead(read: () => unknown): void;
  publish(): void;
}

function controlledDialogueProfileV1(): ControlledDialogueProfileV1 {
  let read: () => unknown = () => defaultPlayerProfileV1;
  let listener: (() => void) | null = null;
  const getSnapshot = vi.fn(() => read());
  const unsubscribe = vi.fn(() => {
    listener = null;
  });
  const subscribe = vi.fn((nextListener: () => void) => {
    listener = nextListener;
    return unsubscribe;
  });
  const markSeen = vi.fn((_definitionId: string, _seenRevision: number) => {});
  return {
    port: {
      getSnapshotInternalV1: getSnapshot,
      subscribeInternalV1: subscribe,
      markSeenInternalV1: markSeen,
    },
    getSnapshot,
    markSeen,
    unsubscribe,
    setRead: (nextRead) => {
      read = nextRead;
    },
    publish: () => {
      listener?.();
    },
  };
}

interface DialoguePlayerHarnessV1 {
  readonly contract: NarrativeManagedSurfaceFamilyContractInternalV1;
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly kernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly bridge: NarrativeStablePublisherBridgeInternalV1;
  readonly clock: ManualDialogueClockV1;
  readonly profile: MutableDialogueProfileV1;
  readonly text: DialogueTextResolverV1;
}

function dialoguePlayerHarnessV1(input: {
  readonly clock?: ManualDialogueClockV1;
  readonly profile?: MutableDialogueProfileV1;
  readonly text?: DialogueTextResolverV1;
  readonly rawClockPort?: unknown;
  readonly rawProfilePort?: unknown;
  readonly rawTextResolverPort?: unknown;
  readonly semanticDispatchPort?: NarrativeStableSemanticResolutionPortInternalV1;
  readonly isCurrentVoicePlaying?: () => boolean;
} = {}): DialoguePlayerHarnessV1 {
  const contract = createNarrativeManagedSurfaceFamilyContractInternalV1({ history: true });
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
  const clock = input.clock ?? manualDialogueClockV1();
  const profile = input.profile ?? mutableDialogueProfileV1();
  const text = input.text ?? dialogueTextResolverV1();
  const candidatePreflight = ({
    preflightCandidateInternalV1: () => ({
      kind: "captured" as const,
      candidateSnapshot: {
        rendererComponent: { kind: "dialogue-player-test-renderer" },
        visualConfig: { skin: "dialogue-player-test" },
        semanticDispatchPort: input.semanticDispatchPort ?? semanticDispatchPortV1,
        history: {
          rendererComponent: { kind: "dialogue-player-test-history-renderer" },
          observationPort: historyObservationPortV1,
          availabilityPort: historyAvailabilityPortV1,
        },
        playerProfile: input.rawProfilePort ?? profile.port,
        presentationClock: input.rawClockPort ?? clock.port,
        textResolver: input.rawTextResolverPort ?? text.port,
        voiceReplayPort: null,
        voiceActivityPort: input.isCurrentVoicePlaying === undefined ? null : {
          isCurrentVoicePlayingInternalV1: input.isCurrentVoicePlaying,
        },
        quickMenuContribution: null,
      },
    }),
  }) satisfies NarrativeStableCandidatePreflightInternalV1;
  const bridge = createNarrativeStablePublisherBridgeInternalV1({
    kernelBundle,
    family: contract,
    candidatePreflight,
  });
  return { contract, registry, authority, kernel, bridge, clock, profile, text };
}

function currentTargetAndFrameV1(harness: DialoguePlayerHarnessV1): Readonly<{
  readonly target: ManagedSurfaceStableAdmittedTargetInternalV1;
  readonly frame: NarrativeStableAdmittedFrameInternalV1;
}> {
  const baseline = harness.kernel.getStateInternalV1().stableAcceptedBaselines.find((candidate) =>
    candidate.kind === "accepted" && candidate.ownerId === harness.contract.ownerId
  );
  if (baseline?.kind !== "accepted" || baseline.targets.length !== 1) {
    throw new Error("expected one accepted Narrative target");
  }
  const target = baseline.targets[0]!;
  const frame = harness.bridge.inspectAdmittedTargetFrameInternalV1(target);
  if (frame === null) throw new Error("expected the exact admitted Narrative frame");
  return ({ target, frame });
}

function installSayCandidateV1(
  harness: DialoguePlayerHarnessV1,
  sequence = 1,
  advancePolicy: "confirm" | "auto" = "confirm",
) {
  expect(harness.bridge.reconcilePendingInternalV1(sayPendingV1(sequence, advancePolicy)))
    .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
  return currentTargetAndFrameV1(harness);
}

function installHoldCandidateV1(
  harness: DialoguePlayerHarnessV1,
  sequence = 1,
  durationMs = 100,
  tickQuantumMs?: number,
) {
  expect(
    harness.bridge.reconcilePendingInternalV1(holdPendingV1(sequence, durationMs, tickQuantumMs)),
  )
    .toMatchObject({ kind: "applied", code: "surface.stable_publication_applied" });
  return currentTargetAndFrameV1(harness);
}

function stableContributorCandidatesV1(
  entries: readonly ManagedSurfaceStableRuntimeEntryInternalV1[],
): readonly ManagedSurfaceStableRootReservationContributorCandidateInternalV1[] {
  return (entries.flatMap((entry) => [
    { kind: "stable_desired" as const, desiredTarget: entry.desiredTarget },
    {
      kind: "stable_runtime" as const,
      desiredTarget: entry.desiredTarget,
      binding: entry.binding,
    },
  ]));
}

function setCurrentNarrativePhaseV1(
  harness: DialoguePlayerHarnessV1,
  phase: "active" | "suspended",
): void {
  const current = harness.kernel.getStateInternalV1();
  const entry = current.stableRuntimeBindings[0];
  if (entry?.binding.kind !== "ready_instance") {
    throw new Error("expected one ready Narrative target");
  }
  const binding = createManagedSurfaceStableReadyRuntimeBindingInternalV1({
    attempt: entry.binding.instance.attempt,
    phase,
  });
  const entries = current.stableRuntimeBindings.map((candidate) =>
    candidate === entry ? ({ ...candidate, binding }) : candidate
  );
  const next = reconcileManagedSurfaceStableRootReservationsInternalV1({
    currentState: current,
    contributorCandidates: stableContributorCandidatesV1(entries),
  });
  const prepared = harness.kernel.prepareStateInstallInternalV1(current, next);
  expect(harness.kernel.commitPreparedStateInstallInternalV1(prepared, () => true)).toBe(
    "installed",
  );
}

function settleCurrentNarrativeReadyV1(harness: DialoguePlayerHarnessV1): void {
  const entry = harness.kernel.getStateInternalV1().stableRuntimeBindings[0];
  if (entry?.binding.kind !== "preparing") {
    throw new Error("expected one preparing Narrative target");
  }
  expect(harness.kernel.settleStableReadinessReadyInternalV1({
    readinessEvidence: {
      applicationEpoch: applicationEpochV1,
      surfaceInstanceId: entry.binding.attempt.identity.surfaceInstanceId,
    },
    publisherLease: entry.desiredTarget.publisherLease,
    sourceRevision: entry.desiredTarget.sourceRevision,
  })).toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
}

function createControllerV1(
  harness: DialoguePlayerHarnessV1,
  target: ManagedSurfaceStableAdmittedTargetInternalV1,
  frame: NarrativeStableAdmittedFrameInternalV1,
): NarrativeStableDialoguePlayerControllerInternalV1 {
  const input = ({
    bridge: harness.bridge,
    target,
    frame,
  }) satisfies CreateNarrativeStableDialoguePlayerControllerInputInternalV1;
  return createNarrativeStableDialoguePlayerControllerInternalV1(input);
}

function rawPortCallCountV1(harness: DialoguePlayerHarnessV1): number {
  return harness.clock.now.mock.calls.length +
    harness.clock.requestTick.mock.calls.length +
    harness.clock.prefersReducedMotion.mock.calls.length +
    harness.profile.getSnapshot.mock.calls.length +
    harness.profile.subscribe.mock.calls.length +
    harness.profile.markSeen.mock.calls.length +
    harness.text.resolveText.mock.calls.length;
}

function updatedProfileV1(): PlayerProfileV1 {
  return ({
    ...defaultPlayerProfileV1,
    seen: { "narrative.test.previous": 1 },
  });
}

function playerProfileWithPreferencesV1(
  preferences: Partial<PlayerProfileV1["preferences"]>,
  seen: Readonly<Record<string, number>> = defaultPlayerProfileV1.seen,
): PlayerProfileV1 {
  return ({
    ...defaultPlayerProfileV1,
    seen: { ...seen },
    preferences: {
      ...defaultPlayerProfileV1.preferences,
      ...preferences,
    },
  });
}

function togglePlaybackModeV1(
  admission: ReturnType<typeof createNarrativeStablePhysicalActionAdmissionInternalV1>,
  mode: "auto" | "skip",
  gestureSuffix: string,
): void {
  const attempt = admission.issuePlaybackModeToggleAttemptInternalV1(mode);
  expect(attempt).not.toBeNull();
  expect(
    admission.routeInternalV1(
      admission.createEnvelopeInternalV1({
        actionId: mode === "auto" ? narrativeToggleAutoActionIdV1 : narrativeToggleSkipActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          `gesture.narrative.dialogue-player-${gestureSuffix}`,
        ),
      }),
      attempt,
    ).consumerResult,
  ).toEqual({ kind: "toggled", mode, completion: null });
}

describe("S4.2.4.2 DOM-free Dialogue player controller", () => {
  it("retains the three typed ports without calling them during preflight", () => {
    const harness = dialoguePlayerHarnessV1();
    const { frame } = installSayCandidateV1(harness);

    expect(rawPortCallCountV1(harness)).toBe(0);
    expect(frame.candidateSnapshot.playerProfile).toBe(harness.profile.port);
    expect(frame.candidateSnapshot.presentationClock).toBe(harness.clock.port);
    expect(frame.candidateSnapshot.textResolver).toBe(harness.text.port);
  });

  it("rejects foreign, retired, and value-equal bridge-target-frame inputs before port reads", () => {
    const harness = dialoguePlayerHarnessV1();
    const current = installSayCandidateV1(harness);
    const foreign = dialoguePlayerHarnessV1();
    installSayCandidateV1(foreign);
    const valueEqualFrame = ({
      ...current.frame,
    }) as NarrativeStableAdmittedFrameInternalV1;

    expect(() =>
      createNarrativeStableDialoguePlayerControllerInternalV1({
        bridge: foreign.bridge,
        target: current.target,
        frame: current.frame,
      })
    ).toThrow(TypeError);
    expect(() => createControllerV1(harness, current.target, valueEqualFrame)).toThrow(TypeError);

    expect(harness.bridge.reconcilePendingInternalV1(passivePendingV1(2))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(() => createControllerV1(harness, current.target, current.frame)).toThrow(TypeError);
    expect(rawPortCallCountV1(harness)).toBe(0);
    expect(rawPortCallCountV1(foreign)).toBe(0);
  });

  it("captures the initial policy, resolved UTF-16 text, and profile, then publishes identity-only profile changes", () => {
    const harness = dialoguePlayerHarnessV1();
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);

    const initial = controller.getSnapshotInternalV1();
    expect(initial).toEqual({
      kind: "say",
      phase: "preparing",
      playbackMode: "normal",
      playerProfile: defaultPlayerProfileV1,
      resolvedSpeakerText: "Speaker",
      resolvedText: "A\u{1f600}B",
      revealedCharacters: 0,
      revealLength: 4,
      revealComplete: false,
    });

    expect(controller.getSnapshotInternalV1()).toBe(initial);
    expect(harness.profile.getSnapshot).toHaveBeenCalledTimes(2);
    expect(harness.profile.subscribe).toHaveBeenCalledOnce();
    expect(harness.text.resolveText.mock.calls).toEqual([
      ["text.test.speaker"],
      ["text.test.line"],
    ]);
    expect(harness.clock.prefersReducedMotion).toHaveBeenCalledOnce();
    expect(harness.clock.requestTick).not.toHaveBeenCalled();

    const notifications = vi.fn();
    const unsubscribe = controller.subscribeInternalV1(notifications);

    const changedProfile = updatedProfileV1();
    harness.profile.publish(changedProfile);
    const changed = controller.getSnapshotInternalV1();
    expect(changed).not.toBe(initial);
    expect(changed).toMatchObject({
      kind: "say",
      playerProfile: changedProfile,
      resolvedText: "A\u{1f600}B",
      revealLength: 4,
    });
    expect(notifications).toHaveBeenCalledOnce();
    harness.profile.publish(changedProfile);
    expect(controller.getSnapshotInternalV1()).toBe(changed);
    expect(notifications).toHaveBeenCalledOnce();

    unsubscribe();
    controller.disposeInternalV1();
    controller.disposeInternalV1();
    expect(harness.profile.unsubscribe).toHaveBeenCalledOnce();
    const late = controller.getSnapshotInternalV1();
    expect(late).toMatchObject({ kind: "passive", playbackMode: "normal" });

    const lateUnsubscribe = controller.subscribeInternalV1(vi.fn());

    lateUnsubscribe();
  });

  it("closes a silent profile update between initial capture and subscribe without recapturing timing or text", () => {
    const initialProfile = playerProfileWithPreferencesV1({
      textRevealCharsPerSecond: 10,
      autoWaitMs: 100,
    });
    const subscribedProfile = playerProfileWithPreferencesV1({
      textRevealCharsPerSecond: 1_000,
      autoWaitMs: 1,
    });
    let currentProfile = initialProfile;
    let resolvedLine = "AB";
    const getSnapshot = vi.fn(() => currentProfile);
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((_listener: () => void) => {
      currentProfile = subscribedProfile;
      resolvedLine = "must-not-re-resolve";
      return unsubscribe;
    });
    const markSeen = vi.fn();
    const rawProfilePort = {
      getSnapshotInternalV1: getSnapshot,
      subscribeInternalV1: subscribe,
      markSeenInternalV1: markSeen,
    };
    const text = dialogueTextResolverV1((textId) =>
      textId === "text.test.speaker" ? "Speaker" : resolvedLine
    );
    const harness = dialoguePlayerHarnessV1({ rawProfilePort, text });
    const current = installSayCandidateV1(harness);

    const controller = createControllerV1(harness, current.target, current.frame);

    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledOnce();
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "preparing",
      playerProfile: subscribedProfile,
      resolvedSpeakerText: "Speaker",
      resolvedText: "AB",
      revealedCharacters: 0,
      revealLength: 2,
    });
    expect(text.resolveText.mock.calls).toEqual([
      ["text.test.speaker"],
      ["text.test.line"],
    ]);

    settleCurrentNarrativeReadyV1(harness);
    harness.clock.fire(1_050);
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      playerProfile: subscribedProfile,
      resolvedText: "AB",
      revealedCharacters: 0,
      revealComplete: false,
    });
    harness.clock.fire(1_100);
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      playerProfile: subscribedProfile,
      resolvedText: "AB",
      revealedCharacters: 1,
      revealComplete: false,
    });
    expect(markSeen).not.toHaveBeenCalled();

    controller.disposeInternalV1();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("starts reveal ticks and manual admission when first created after Say is ready-active", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("late-ready-say-complete"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({
      clock,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    settleCurrentNarrativeReadyV1(harness);

    const controller = createControllerV1(harness, current.target, current.frame);

    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "active",
      revealedCharacters: 0,
      revealLength: 4,
      revealComplete: false,
    });
    expect(clock.now).toHaveBeenCalledOnce();
    expect(clock.requestTick).toHaveBeenCalledOnce();

    clock.fire(1_100);
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "active",
      revealedCharacters: 4,
      revealComplete: true,
    });
    expect(harness.profile.markSeen).toHaveBeenCalledOnce();

    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const attempt = admission.issueSayActivationAttemptInternalV1(controller);
    expect(attempt).not.toBeNull();
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-late-ready-say",
          ),
        }),
        attempt,
      ).consumerResult,
    ).toMatchObject({ kind: "dispatched" });
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("starts exact Hold expiry when first created after Hold is ready-active", () => {
    const dispatchTime = vi.fn(() => Promise.resolve("late-ready-hold-complete"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({
      clock,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: () => Promise.resolve(undefined),
        dispatchTimeInternalV1: dispatchTime,
      },
    });
    const current = installHoldCandidateV1(harness, 1, 100);
    settleCurrentNarrativeReadyV1(harness);

    const controller = createControllerV1(harness, current.target, current.frame);

    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "active",
      playbackMode: "normal",
    });
    expect(clock.now).toHaveBeenCalledOnce();
    expect(clock.requestTick).toHaveBeenCalledOnce();
    clock.fire(1_099);
    expect(dispatchTime).not.toHaveBeenCalled();
    clock.fire(1_100);
    expect(dispatchTime).toHaveBeenCalledOnce();
    expect(dispatchTime).toHaveBeenCalledWith({
      elapsedMs: 100,
      expectedHoldOccurrenceId: "interaction-occurrence.20001",
    });

    controller.disposeInternalV1();
  });

  it("faults the player once when a hold frame carries no time port instead of retrying forever", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({
      clock,
      // The Story bound only the resolution port: a hold frame admitted
      // against it can never settle time, so expiry must fault the player
      // exactly once rather than rescheduling the presentation clock on a
      // boundary that cannot expire.
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installHoldCandidateV1(harness, 1, 100);
    settleCurrentNarrativeReadyV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    expect(clock.requestTick).toHaveBeenCalledOnce();

    clock.fire(1_100);

    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
    });
    expect(clock.requestTick).toHaveBeenCalledOnce();
    expect(() => clock.fire(1_200)).toThrowError("expected one scheduled Dialogue tick");

    controller.disposeInternalV1();
  });

  it("commits declared-cadence partial time ticks whose elapsed sum equals the remainder", async () => {
    const dispatchTime = vi.fn(() => Promise.resolve("cadenced-hold-commit"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({
      clock,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: () => Promise.resolve(undefined),
        dispatchTimeInternalV1: dispatchTime,
      },
    });
    const current = installHoldCandidateV1(harness, 1, 250, 100);
    settleCurrentNarrativeReadyV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);

    // Below the first whole quantum nothing commits.
    clock.fire(1_050);
    expect(dispatchTime).not.toHaveBeenCalled();

    // Crossing 100ms presented commits the first quantum.
    clock.fire(1_100);
    expect(dispatchTime).toHaveBeenCalledTimes(1);
    expect(dispatchTime).toHaveBeenNthCalledWith(1, {
      elapsedMs: 100,
      expectedHoldOccurrenceId: "interaction-occurrence.20001",
    });
    await flushDialogueMicrotasksV1();

    // A hitch across a boundary folds the crossed quanta into one tick.
    clock.fire(1_220);
    expect(dispatchTime).toHaveBeenCalledTimes(2);
    expect(dispatchTime).toHaveBeenNthCalledWith(2, {
      elapsedMs: 100,
      expectedHoldOccurrenceId: "interaction-occurrence.20001",
    });
    await flushDialogueMicrotasksV1();

    // Expiry proposes exactly the milliseconds no partial dispatched yet:
    // 100 + 100 + 50 = the authoritative 250ms remainder.
    clock.fire(1_250);
    expect(dispatchTime).toHaveBeenCalledTimes(3);
    expect(dispatchTime).toHaveBeenNthCalledWith(3, {
      elapsedMs: 50,
      expectedHoldOccurrenceId: "interaction-occurrence.20001",
    });

    controller.disposeInternalV1();
  });

  it("withholds a crossing while a partial commit is in flight and catches up afterwards", async () => {
    const dispatchTime = vi.fn(() => Promise.resolve("cadenced-hold-in-flight"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({
      clock,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: () => Promise.resolve(undefined),
        dispatchTimeInternalV1: dispatchTime,
      },
    });
    const current = installHoldCandidateV1(harness, 1, 250, 100);
    settleCurrentNarrativeReadyV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);

    clock.fire(1_100);
    expect(dispatchTime).toHaveBeenCalledTimes(1);

    // The first completion has not settled, so the 200ms crossing is
    // withheld — the ledger does not advance on a withheld attempt.
    clock.fire(1_200);
    expect(dispatchTime).toHaveBeenCalledTimes(1);

    await flushDialogueMicrotasksV1();

    // The next tick catches up the missed quantum in one exact delta.
    clock.fire(1_249);
    expect(dispatchTime).toHaveBeenCalledTimes(2);
    expect(dispatchTime).toHaveBeenNthCalledWith(2, {
      elapsedMs: 100,
      expectedHoldOccurrenceId: "interaction-occurrence.20001",
    });
    await flushDialogueMicrotasksV1();

    clock.fire(1_250);
    expect(dispatchTime).toHaveBeenCalledTimes(3);
    expect(dispatchTime).toHaveBeenNthCalledWith(3, {
      elapsedMs: 50,
      expectedHoldOccurrenceId: "interaction-occurrence.20001",
    });

    controller.disposeInternalV1();
  });

  it("retries a withheld expiry on the next tick until the in-flight partial settles", async () => {
    const dispatchTime = vi.fn(() => Promise.resolve("cadenced-hold-expiry-retry"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({
      clock,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: () => Promise.resolve(undefined),
        dispatchTimeInternalV1: dispatchTime,
      },
    });
    const current = installHoldCandidateV1(harness, 1, 100, 60);
    settleCurrentNarrativeReadyV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);

    clock.fire(1_060);
    expect(dispatchTime).toHaveBeenCalledTimes(1);
    expect(dispatchTime).toHaveBeenNthCalledWith(1, {
      elapsedMs: 60,
      expectedHoldOccurrenceId: "interaction-occurrence.20001",
    });

    // Expiry arrives while the partial is still settling: the dispatch is
    // withheld and the loop schedules a retry tick instead of parking.
    clock.fire(1_100);
    expect(dispatchTime).toHaveBeenCalledTimes(1);

    await flushDialogueMicrotasksV1();

    clock.fire(1_101);
    expect(dispatchTime).toHaveBeenCalledTimes(2);
    expect(dispatchTime).toHaveBeenNthCalledWith(2, {
      elapsedMs: 40,
      expectedHoldOccurrenceId: "interaction-occurrence.20001",
    });

    controller.disposeInternalV1();
  });

  it.each(
    [
      [
        "rate-zero",
        () => ({
          clock: manualDialogueClockV1({ initialNowMs: 1_000 }),
          profile: mutableDialogueProfileV1(
            playerProfileWithPreferencesV1({ textRevealCharsPerSecond: 0 }),
          ),
        }),
      ],
      [
        "reduced-motion",
        () => ({
          clock: manualDialogueClockV1({ initialNowMs: 1_000, reducedMotion: true }),
          profile: mutableDialogueProfileV1(),
        }),
      ],
    ] as const,
  )("seeds a clock baseline for an instant %s content-auto Say", (_label, createPorts) => {
    const dispatchResolution = vi.fn(() => Promise.resolve("instant-content-auto-complete"));
    const { clock, profile } = createPorts();
    const harness = dialoguePlayerHarnessV1({
      clock,
      profile,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness, 1, "auto");
    const controller = createControllerV1(harness, current.target, current.frame);

    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "preparing",
      playbackMode: "normal",
      revealedCharacters: 4,
      revealComplete: true,
    });
    expect(clock.now).not.toHaveBeenCalled();
    settleCurrentNarrativeReadyV1(harness);
    expect(clock.now).toHaveBeenCalledOnce();
    expect(clock.requestTick).toHaveBeenCalledOnce();
    expect(dispatchResolution).not.toHaveBeenCalled();

    clock.fire(1_000);

    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "active",
      playbackMode: "normal",
      revealComplete: true,
    });
    expect(profile.markSeen).toHaveBeenCalledOnce();

    controller.disposeInternalV1();
  });

  it.each(
    [
      ["auto", 100],
      ["skip", 40],
    ] as const,
  )("seeds the %s deadline for a retained mode on a fresh instant Say", (mode, waitMs) => {
    const dispatchResolution = vi.fn(() => Promise.resolve(`instant-${mode}-complete`));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const initialProfile = playerProfileWithPreferencesV1({
      autoWaitMs: 100,
      skipPolicy: "skip_all",
    });
    const profile = mutableDialogueProfileV1(initialProfile);
    const harness = dialoguePlayerHarnessV1({
      clock,
      profile,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const predecessor = installSayCandidateV1(harness);
    const predecessorController = createControllerV1(
      harness,
      predecessor.target,
      predecessor.frame,
    );
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, mode, `instant-${mode}-predecessor`);
    profile.publish(playerProfileWithPreferencesV1({
      autoWaitMs: 100,
      skipPolicy: "skip_all",
      textRevealCharsPerSecond: 0,
    }));

    const successor = installSayCandidateV1(harness, 2);
    const successorController = createControllerV1(
      harness,
      successor.target,
      successor.frame,
    );
    expect(successorController.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "preparing",
      playbackMode: mode,
      revealedCharacters: 4,
      revealComplete: true,
    });
    settleCurrentNarrativeReadyV1(harness);
    expect(harness.bridge.readPlaybackModeInternalV1()).toBe(mode);
    expect(dispatchResolution).not.toHaveBeenCalled();

    clock.fire(1_000 + waitMs - 1);
    expect(dispatchResolution).not.toHaveBeenCalled();
    clock.fire(1_000 + waitMs);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.2",
      resolution: { kind: "advance" },
    });
    expect(successorController.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "active",
      playbackMode: mode,
      revealComplete: true,
    });
    expect(profile.markSeen).toHaveBeenCalledOnce();

    admission.disposeInternalV1();
    successorController.disposeInternalV1();
    predecessorController.disposeInternalV1();
  });

  it.each(
    [
      ["rate-zero", "auto", 100],
      ["rate-zero", "skip", 40],
      ["reduced-motion", "auto", 100],
      ["reduced-motion", "skip", 40],
    ] as const,
  )(
    "starts a delayed %s %s deadline from the toggle clock capture",
    (instantKind, mode, waitMs) => {
      const dispatchResolution = vi.fn(() => Promise.resolve(`delayed-${mode}-complete`));
      const clock = manualDialogueClockV1({
        initialNowMs: 1_000,
        reducedMotion: instantKind === "reduced-motion",
      });
      const profile = mutableDialogueProfileV1(
        playerProfileWithPreferencesV1({
          autoWaitMs: 100,
          skipPolicy: "skip_all",
          textRevealCharsPerSecond: instantKind === "rate-zero"
            ? 0
            : defaultPlayerProfileV1.preferences.textRevealCharsPerSecond,
        }),
      );
      const harness = dialoguePlayerHarnessV1({
        clock,
        profile,
        semanticDispatchPort: {
          dispatchResolutionInternalV1: dispatchResolution,
        },
      });
      const current = installSayCandidateV1(harness);
      const controller = createControllerV1(harness, current.target, current.frame);
      settleCurrentNarrativeReadyV1(harness);
      expect(controller.getSnapshotInternalV1()).toMatchObject({
        kind: "say",
        phase: "active",
        playbackMode: "normal",
        revealedCharacters: 4,
        revealComplete: true,
      });
      expect(clock.now).not.toHaveBeenCalled();
      expect(clock.requestTick).not.toHaveBeenCalled();
      expect(profile.markSeen).toHaveBeenCalledOnce();

      const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
        bridge: harness.bridge,
        inputRouter: createInputRouterV1(),
        isGestureCurrent: () => true,
      });
      clock.setNow(1_500);
      togglePlaybackModeV1(admission, mode, `delayed-${instantKind}-${mode}`);
      expect(clock.now).toHaveBeenCalledOnce();
      expect(clock.requestTick).toHaveBeenCalledOnce();
      expect(dispatchResolution).not.toHaveBeenCalled();

      clock.fire(1_500 + waitMs - 1);
      expect(dispatchResolution).not.toHaveBeenCalled();
      clock.fire(1_500 + waitMs);
      expect(dispatchResolution).toHaveBeenCalledOnce();
      expect(dispatchResolution).toHaveBeenCalledWith({
        expectedOccurrenceId: "interaction-occurrence.1",
        resolution: { kind: "advance" },
      });
      expect(controller.getSnapshotInternalV1()).toMatchObject({
        kind: "say",
        phase: "active",
        playbackMode: mode,
        revealComplete: true,
      });
      expect(clock.now).toHaveBeenCalledOnce();
      expect(profile.markSeen).toHaveBeenCalledOnce();

      admission.disposeInternalV1();
      controller.disposeInternalV1();
    },
  );

  it("fails an instant factory whose markSeen callback retires it without touching the successor", () => {
    const instantProfile = playerProfileWithPreferencesV1({
      textRevealCharsPerSecond: 0,
    });
    let harness!: DialoguePlayerHarnessV1;
    let replacementResult: unknown = null;
    const rawListeners: Array<() => void> = [];
    const getSnapshot = vi.fn(() => instantProfile);
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((listener: () => void) => {
      rawListeners.push(listener);
      return unsubscribe;
    });
    const markSeen = vi.fn((_definitionId: string, _seenRevision: number) => {
      if (replacementResult !== null) return;
      replacementResult = harness.bridge.reconcilePendingInternalV1(passivePendingV1(2));
    });
    const rawProfilePort = {
      getSnapshotInternalV1: getSnapshot,
      subscribeInternalV1: subscribe,
      markSeenInternalV1: markSeen,
    };
    harness = dialoguePlayerHarnessV1({ rawProfilePort });
    const retired = installSayCandidateV1(harness);

    expect(() => createControllerV1(harness, retired.target, retired.frame)).toThrowError(
      "ui.narrative_stable_dialogue_player_controller_invalid",
    );
    expect(replacementResult).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    expect(markSeen).toHaveBeenCalledOnce();
    expect(markSeen).toHaveBeenCalledWith("narrative.test.dialogue-player", 3);
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(harness.clock.requestTick).not.toHaveBeenCalled();

    const oldListener = rawListeners[0];
    if (oldListener === undefined) throw new Error("expected retired raw profile listener");
    oldListener();
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(markSeen).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();

    const successor = currentTargetAndFrameV1(harness);
    const successorController = createControllerV1(
      harness,
      successor.target,
      successor.frame,
    );
    expect(successorController.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "preparing",
      playbackMode: "normal",
      playerProfile: instantProfile,
    });
    expect(getSnapshot).toHaveBeenCalledTimes(4);
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(markSeen).toHaveBeenCalledOnce();

    successorController.disposeInternalV1();
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("reveals only while ready-active and carries UTF-16 sub-character remainder across ticks", () => {
    const harness = dialoguePlayerHarnessV1();
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);

    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "preparing",
      revealedCharacters: 0,
      revealLength: 4,
      revealComplete: false,
    });
    expect(harness.clock.now).not.toHaveBeenCalled();
    expect(harness.clock.requestTick).not.toHaveBeenCalled();

    settleCurrentNarrativeReadyV1(harness);
    const active = controller.getSnapshotInternalV1();
    expect(active).toMatchObject({
      kind: "say",
      phase: "active",
      revealedCharacters: 0,
      revealLength: 4,
      revealComplete: false,
    });
    expect(harness.clock.now).toHaveBeenCalledOnce();
    expect(harness.clock.requestTick).toHaveBeenCalledOnce();

    const notifications = vi.fn();
    const unsubscribe = controller.subscribeInternalV1(notifications);

    harness.clock.fire(1_012);
    expect(controller.getSnapshotInternalV1()).toBe(active);
    expect(notifications).not.toHaveBeenCalled();
    expect(harness.clock.requestTick).toHaveBeenCalledTimes(2);

    harness.clock.fire(1_025);
    const oneCodeUnit = controller.getSnapshotInternalV1();
    expect(oneCodeUnit).toMatchObject({
      revealedCharacters: 1,
      revealComplete: false,
    });
    if (oneCodeUnit.kind !== "say") throw new Error("expected active Say snapshot");
    expect(oneCodeUnit.resolvedText.slice(0, oneCodeUnit.revealedCharacters)).toBe("A");
    expect(notifications).toHaveBeenCalledOnce();

    harness.clock.fire(1_050);
    const splitSurrogate = controller.getSnapshotInternalV1();
    expect(splitSurrogate).toMatchObject({
      revealedCharacters: 2,
      revealComplete: false,
    });
    if (splitSurrogate.kind !== "say") throw new Error("expected active Say snapshot");
    expect(splitSurrogate.resolvedText.slice(0, splitSurrogate.revealedCharacters)).toBe(
      "A\ud83d",
    );

    harness.clock.fire(1_100);
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      revealedCharacters: 4,
      revealComplete: true,
    });
    expect(harness.clock.requestTick).toHaveBeenCalledTimes(4);
    expect(harness.profile.markSeen).toHaveBeenCalledOnce();
    expect(harness.profile.markSeen).toHaveBeenCalledWith(
      "narrative.test.dialogue-player",
      3,
    );
    expect(notifications).toHaveBeenCalledTimes(3);

    unsubscribe();
    controller.disposeInternalV1();
  });

  it.each(
    [
      ["negative", -1],
      ["fractional", 1.5],
      ["non-finite", Number.NaN],
      ["unsafe", Number.MAX_SAFE_INTEGER + 1],
    ] as const,
  )("fences the current controller for an initially %s clock timestamp", (_label, value) => {
    const now = vi.fn(() => value);
    const requestTick = vi.fn((_callback: (nowMs: number) => void) => (() => {}));
    const rawClockPort = ({
      nowInternalV1: now,
      requestTickInternalV1: requestTick,
      prefersReducedMotionInternalV1: () => false,
    }) satisfies NarrativeStableDialoguePlayerClockPortInternalV1;
    const harness = dialoguePlayerHarnessV1({ rawClockPort });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);

    settleCurrentNarrativeReadyV1(harness);

    expect(now).toHaveBeenCalledOnce();
    expect(requestTick).not.toHaveBeenCalled();
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
    expect(harness.profile.unsubscribe).toHaveBeenCalledOnce();
  });

  it.each(
    [
      ["throwing request", () => {
        throw new Error("request tick fault");
      }],
      ["non-callable cancel", () => true as unknown as () => void],
    ] as const,
  )("contains a %s and logically fences the current controller", (_label, request) => {
    const requestTick = vi.fn((_callback: (nowMs: number) => void) => request());
    const rawClockPort = ({
      nowInternalV1: () => 1_000,
      requestTickInternalV1: requestTick,
      prefersReducedMotionInternalV1: () => false,
    }) satisfies NarrativeStableDialoguePlayerClockPortInternalV1;
    const harness = dialoguePlayerHarnessV1({ rawClockPort });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);

    settleCurrentNarrativeReadyV1(harness);

    expect(requestTick).toHaveBeenCalledOnce();
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
    expect(harness.profile.unsubscribe).toHaveBeenCalledOnce();
  });

  it("contains hostile physical tick cancellation after logically fencing dispose", () => {
    const cancel = vi.fn(() => {
      throw new Error("cancel fault");
    });
    const requestTick = vi.fn((_callback: (nowMs: number) => void) => cancel);
    const rawClockPort = ({
      nowInternalV1: () => 1_000,
      requestTickInternalV1: requestTick,
      prefersReducedMotionInternalV1: () => false,
    }) satisfies NarrativeStableDialoguePlayerClockPortInternalV1;
    const harness = dialoguePlayerHarnessV1({ rawClockPort });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);

    expect(() => controller.disposeInternalV1()).not.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
  });

  it("faults synchronous tick callback reentry instead of accepting a nested schedule", () => {
    let firstRequest = true;
    const cancel = vi.fn();
    const requestTick = vi.fn((callback: (nowMs: number) => void) => {
      if (firstRequest) {
        firstRequest = false;
        callback(1_000);
      }
      return cancel;
    });
    const rawClockPort = ({
      nowInternalV1: () => 1_000,
      requestTickInternalV1: requestTick,
      prefersReducedMotionInternalV1: () => false,
    }) satisfies NarrativeStableDialoguePlayerClockPortInternalV1;
    const harness = dialoguePlayerHarnessV1({ rawClockPort });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);

    settleCurrentNarrativeReadyV1(harness);

    expect(requestTick).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
    expect(harness.profile.unsubscribe).toHaveBeenCalledOnce();
  });

  it("faults a synchronous completing tick before reveal, seen, or semantic side effects", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const cancel = vi.fn();
    const requestTick = vi.fn((callback: (nowMs: number) => void) => {
      callback(1_100);
      return cancel;
    });
    const rawClockPort = ({
      nowInternalV1: () => 1_000,
      requestTickInternalV1: requestTick,
      prefersReducedMotionInternalV1: () => false,
    }) satisfies NarrativeStableDialoguePlayerClockPortInternalV1;
    const harness = dialoguePlayerHarnessV1({
      rawClockPort,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness, 1, "auto");
    const controller = createControllerV1(harness, current.target, current.frame);

    settleCurrentNarrativeReadyV1(harness);

    expect(requestTick).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    expect(harness.profile.markSeen).not.toHaveBeenCalled();
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
    expect(harness.profile.unsubscribe).toHaveBeenCalledOnce();
  });

  it("faults an unexpected duplicate tick without mutating the successor schedule", () => {
    const harness = dialoguePlayerHarnessV1();
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const consumedTick = harness.clock.latestTick();

    harness.clock.fire(1_010);
    expect(harness.clock.requestTick).toHaveBeenCalledTimes(2);
    consumedTick(1_020);

    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
    expect(harness.profile.unsubscribe).toHaveBeenCalledOnce();
  });

  it("ignores a consumed old tick duplicated after suspension resumes a fresh generation", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({
      clock,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const notifications = vi.fn();
    const unsubscribe = controller.subscribeInternalV1(notifications);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "auto", "duplicate-old-tick");
    const consumedOldTick = clock.latestTick();

    clock.fire(1_010);
    clock.setNow(1_020);
    setCurrentNarrativePhaseV1(harness, "suspended");
    clock.setNow(5_000);
    setCurrentNarrativePhaseV1(harness, "active");
    const freshTick = clock.latestTick();
    expect(freshTick).not.toBe(consumedOldTick);
    const resumedSnapshot = controller.getSnapshotInternalV1();
    expect(resumedSnapshot).toMatchObject({
      kind: "say",
      phase: "active",
      playbackMode: "auto",
      revealedCharacters: 0,
      revealComplete: false,
    });
    notifications.mockClear();
    const requestCount = clock.requestTick.mock.calls.length;
    const cancelCount = clock.cancel.mock.calls.length;

    consumedOldTick(6_000);

    expect(controller.getSnapshotInternalV1()).toBe(resumedSnapshot);
    expect(harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
    expect(clock.requestTick).toHaveBeenCalledTimes(requestCount);
    expect(clock.cancel).toHaveBeenCalledTimes(cancelCount);
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(notifications).not.toHaveBeenCalled();

    clock.fire(5_025);
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "active",
      playbackMode: "auto",
      revealedCharacters: 1,
      revealComplete: false,
    });
    expect(clock.requestTick).toHaveBeenCalledTimes(requestCount + 1);
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(notifications).toHaveBeenCalledOnce();

    unsubscribe();
    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("fences a regressing tick timestamp with no reveal or seen side effect", () => {
    const harness = dialoguePlayerHarnessV1();
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);

    harness.clock.fire(999);

    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
    expect(harness.profile.markSeen).not.toHaveBeenCalled();
    expect(harness.profile.unsubscribe).toHaveBeenCalledOnce();
  });

  it("uses the shared manual Say claim to reveal first and dispatch only the next activation", async () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("manual-complete"));
    const harness = dialoguePlayerHarnessV1({
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });

    const revealAttempt = admission.issueSayActivationAttemptInternalV1(controller);
    expect(revealAttempt).not.toBeNull();
    const revealResult = admission.routeInternalV1(
      admission.createEnvelopeInternalV1({
        actionId: narrativeAdvanceActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          "gesture.narrative.dialogue-player-manual-reveal",
        ),
      }),
      revealAttempt,
    );
    expect(revealResult.consumerResult).toEqual({ kind: "revealed", completion: null });
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "active",
      revealedCharacters: 4,
      revealComplete: true,
    });
    expect(harness.profile.markSeen).toHaveBeenCalledOnce();
    expect(dispatchResolution).not.toHaveBeenCalled();

    const dispatchAttempt = admission.issueSayActivationAttemptInternalV1(controller);
    expect(dispatchAttempt).not.toBeNull();
    const dispatchResult = admission.routeInternalV1(
      admission.createEnvelopeInternalV1({
        actionId: narrativeAdvanceActionIdV1,
        gestureId: parseManagedSurfaceGestureIdV1(
          "gesture.narrative.dialogue-player-manual-dispatch",
        ),
      }),
      dispatchAttempt,
    );
    expect(dispatchResult.consumerResult).toMatchObject({ kind: "dispatched" });
    if (dispatchResult.consumerResult?.kind !== "dispatched") {
      throw new Error("expected manual semantic dispatch");
    }
    await expect(dispatchResult.consumerResult.completion).resolves.toBe("manual-complete");
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });
    expect(harness.profile.markSeen).toHaveBeenCalledOnce();

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("rearms player-auto from manual revealAll and dispatches exactly at autoWait expiry", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("manual-auto-complete"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({
      clock,
      profile: mutableDialogueProfileV1(
        playerProfileWithPreferencesV1({ autoWaitMs: 100 }),
      ),
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "auto", "manual-reveal-auto");
    const retiredTick = clock.latestTick();
    clock.setNow(1_500);
    const revealAttempt = admission.issueSayActivationAttemptInternalV1(controller);
    expect(revealAttempt).not.toBeNull();

    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-manual-reveal-auto",
          ),
        }),
        revealAttempt,
      ).consumerResult,
    ).toEqual({ kind: "revealed", completion: null });
    expect(clock.cancel).toHaveBeenCalledOnce();
    expect(clock.requestTick).toHaveBeenCalledTimes(2);
    expect(clock.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      clock.requestTick.mock.invocationCallOrder[1]!,
    );
    retiredTick(1_600);
    expect(dispatchResolution).not.toHaveBeenCalled();

    clock.fire(1_599);
    expect(dispatchResolution).not.toHaveBeenCalled();
    clock.fire(1_600);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });
    expect(harness.profile.markSeen).toHaveBeenCalledOnce();
    expect(() => clock.fire(1_601)).toThrowError("expected one scheduled Dialogue tick");
    expect(dispatchResolution).toHaveBeenCalledOnce();

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("holds player Auto at its expired deadline until the current voice becomes idle", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("voice-aware-auto-complete"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    let voicePlaying = true;
    const isCurrentVoicePlaying = vi.fn(() => voicePlaying);
    const harness = dialoguePlayerHarnessV1({
      clock,
      profile: mutableDialogueProfileV1(
        playerProfileWithPreferencesV1({ autoWaitMs: 100 }),
      ),
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
      isCurrentVoicePlaying,
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "auto", "voice-aware-auto");

    clock.fire(1_100);
    expect(controller.getSnapshotInternalV1()).toMatchObject({ revealComplete: true });
    clock.fire(1_200);
    expect(isCurrentVoicePlaying).toHaveBeenCalled();
    expect(dispatchResolution).not.toHaveBeenCalled();

    voicePlaying = false;
    clock.fire(1_201);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("rearms Skip after manual revealAll and first-wins from a fresh seen profile", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("manual-skip-complete"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const profile = mutableDialogueProfileV1(
      playerProfileWithPreferencesV1(
        { skipPolicy: "skip_read" },
        { "narrative.test.dialogue-player": 3 },
      ),
    );
    const harness = dialoguePlayerHarnessV1({
      clock,
      profile,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "skip", "manual-reveal-skip");
    const retiredTick = clock.latestTick();
    clock.setNow(1_500);
    const revealAttempt = admission.issueSayActivationAttemptInternalV1(controller);
    expect(revealAttempt).not.toBeNull();
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-manual-reveal-skip",
          ),
        }),
        revealAttempt,
      ).consumerResult,
    ).toEqual({ kind: "revealed", completion: null });
    const manualCompetitor = admission.issueSayActivationAttemptInternalV1(controller);
    expect(manualCompetitor).not.toBeNull();
    expect(clock.cancel).toHaveBeenCalledOnce();
    expect(clock.requestTick).toHaveBeenCalledTimes(2);
    retiredTick(1_540);
    expect(dispatchResolution).not.toHaveBeenCalled();

    clock.fire(1_539);
    expect(dispatchResolution).not.toHaveBeenCalled();
    clock.fire(1_540);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });
    expect(profile.getSnapshot).toHaveBeenCalledTimes(3);
    expect(profile.markSeen).toHaveBeenCalledOnce();
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-manual-lost-to-skip",
          ),
        }),
        manualCompetitor,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(() => clock.fire(1_541)).toThrowError("expected one scheduled Dialogue tick");
    expect(dispatchResolution).toHaveBeenCalledOnce();

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("lets content-auto first-win a presigned manual attempt on the full-reveal tick", async () => {
    let settleSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      settleSemantic = resolve;
    });
    const dispatchResolution = vi.fn(() => semanticCompletion);
    const harness = dialoguePlayerHarnessV1({
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness, 1, "auto");
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const manualCompetitor = admission.issueSayActivationAttemptInternalV1(controller);
    expect(manualCompetitor).not.toBeNull();

    harness.clock.fire(1_100);

    expect(controller.getSnapshotInternalV1()).toMatchObject({
      revealedCharacters: 4,
      revealComplete: true,
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-content-auto-won",
          ),
        }),
        manualCompetitor,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(harness.profile.markSeen).toHaveBeenCalledOnce();

    settleSemantic("content-auto-complete");
    await semanticCompletion;
    await Promise.resolve();
    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("waits the captured player-auto deadline on a confirm Say and first-wins manual", async () => {
    let settleSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      settleSemantic = resolve;
    });
    const dispatchResolution = vi.fn(() => semanticCompletion);
    const harness = dialoguePlayerHarnessV1({
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "auto", "auto-mode");

    harness.clock.fire(1_100);
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      playbackMode: "auto",
      revealComplete: true,
    });
    expect(dispatchResolution).not.toHaveBeenCalled();
    const manualCompetitor = admission.issueSayActivationAttemptInternalV1(controller);
    expect(manualCompetitor).not.toBeNull();

    harness.clock.fire(1_699);
    expect(dispatchResolution).not.toHaveBeenCalled();
    harness.clock.fire(1_700);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-player-auto-won",
          ),
        }),
        manualCompetitor,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });

    settleSemantic("player-auto-complete");
    await semanticCompletion;
    await Promise.resolve();
    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("stops skip_read on an unread Say without reveal, seen write, or semantic dispatch", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const harness = dialoguePlayerHarnessV1({
      profile: mutableDialogueProfileV1(
        playerProfileWithPreferencesV1({ skipPolicy: "skip_read" }),
      ),
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "skip", "skip-read-mode");

    harness.clock.fire(1_040);

    expect(harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "active",
      playbackMode: "normal",
      revealedCharacters: 0,
      revealComplete: false,
    });
    expect(harness.profile.getSnapshot).toHaveBeenCalledTimes(3);
    expect(harness.profile.markSeen).not.toHaveBeenCalled();
    expect(dispatchResolution).not.toHaveBeenCalled();

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it.each(
    [
      ["skip_all on unread", "skip_all", {}, true],
      [
        "skip_read on seen",
        "skip_read",
        { "narrative.test.dialogue-player": 3 },
        false,
      ],
    ] as const,
  )("dispatches %s from a fresh profile snapshot", (_label, skipPolicy, seen, writesSeen) => {
    const dispatchResolution = vi.fn(() => Promise.resolve("skip-complete"));
    const profile = mutableDialogueProfileV1(
      playerProfileWithPreferencesV1({ skipPolicy }, seen),
    );
    const harness = dialoguePlayerHarnessV1({
      profile,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "skip", `${skipPolicy}-dispatch`);

    harness.clock.fire(1_040);

    expect(profile.getSnapshot).toHaveBeenCalledTimes(3);
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "active",
      playbackMode: "skip",
      revealedCharacters: 4,
      revealComplete: true,
    });
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });
    if (writesSeen) {
      expect(profile.markSeen).toHaveBeenCalledOnce();
      expect(profile.markSeen).toHaveBeenCalledWith(
        "narrative.test.dialogue-player",
        3,
      );
      expect(profile.markSeen.mock.invocationCallOrder[0]).toBeLessThan(
        dispatchResolution.mock.invocationCallOrder[0]!,
      );
    } else {
      expect(profile.markSeen).not.toHaveBeenCalled();
    }

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("expires Hold only while ready-active and preserves remaining presentation time across suspension", () => {
    const directDispatch = vi.fn(() => Promise.resolve("direct-hold-complete"));
    const directClock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const direct = dialoguePlayerHarnessV1({
      clock: directClock,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: () => Promise.resolve(undefined),
        dispatchTimeInternalV1: directDispatch,
      },
    });
    const directCurrent = installHoldCandidateV1(direct, 1, 100);
    const directController = createControllerV1(
      direct,
      directCurrent.target,
      directCurrent.frame,
    );

    expect(directClock.requestTick).not.toHaveBeenCalled();
    settleCurrentNarrativeReadyV1(direct);
    expect(directController.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "active",
      playbackMode: "normal",
    });
    expect(directClock.now).toHaveBeenCalledOnce();
    expect(directClock.requestTick).toHaveBeenCalledOnce();
    directClock.fire(1_099);
    expect(directDispatch).not.toHaveBeenCalled();
    directClock.fire(1_100);
    expect(directDispatch).toHaveBeenCalledOnce();
    expect(directDispatch).toHaveBeenCalledWith({
      elapsedMs: 100,
      expectedHoldOccurrenceId: "interaction-occurrence.20001",
    });
    directController.disposeInternalV1();

    const resumedDispatch = vi.fn(() => Promise.resolve("resumed-hold-complete"));
    const resumedClock = manualDialogueClockV1({ initialNowMs: 2_000 });
    const resumed = dialoguePlayerHarnessV1({
      clock: resumedClock,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: () => Promise.resolve(undefined),
        dispatchTimeInternalV1: resumedDispatch,
      },
    });
    const resumedCurrent = installHoldCandidateV1(resumed, 2, 100);
    const resumedController = createControllerV1(
      resumed,
      resumedCurrent.target,
      resumedCurrent.frame,
    );
    settleCurrentNarrativeReadyV1(resumed);
    const retiredActiveTick = resumedClock.latestTick();

    resumedClock.setNow(2_040);
    setCurrentNarrativePhaseV1(resumed, "suspended");
    expect(resumedController.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
    });
    expect(resumedClock.cancel).toHaveBeenCalledOnce();
    retiredActiveTick(2_100);
    expect(resumedDispatch).not.toHaveBeenCalled();

    resumedClock.setNow(5_000);
    setCurrentNarrativePhaseV1(resumed, "active");
    expect(resumedController.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "active",
    });
    resumedClock.fire(5_059);
    expect(resumedDispatch).not.toHaveBeenCalled();
    resumedClock.fire(5_060);
    expect(resumedDispatch).toHaveBeenCalledOnce();
    expect(resumedDispatch).toHaveBeenCalledWith({
      elapsedMs: 100,
      expectedHoldOccurrenceId: "interaction-occurrence.20002",
    });
    resumedController.disposeInternalV1();
  });

  it("faults the current controller when its profile callback throws", () => {
    const profile = controlledDialogueProfileV1();
    const harness = dialoguePlayerHarnessV1({ rawProfilePort: profile.port });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    profile.setRead(() => {
      throw new Error("current profile callback fault");
    });

    profile.publish();

    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
    expect(profile.unsubscribe).toHaveBeenCalledOnce();
    expect(profile.markSeen).not.toHaveBeenCalled();
    controller.disposeInternalV1();
  });

  it("gives stale profile callback reentry exact-zero precedence over its Say successor", () => {
    const profile = controlledDialogueProfileV1();
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const harness = dialoguePlayerHarnessV1({
      rawProfilePort: profile.port,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const notifications = vi.fn();
    controller.subscribeInternalV1(notifications);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "auto", "profile-stale-reentry");
    notifications.mockClear();
    let stateAfterReentry:
      | ReturnType<
        ManagedSurfaceStableCompositeRuntimeKernelInternalV1["getStateInternalV1"]
      >
      | null = null;
    profile.setRead(() => {
      expect(harness.bridge.reconcilePendingInternalV1(sayPendingV1(2))).toMatchObject({
        kind: "applied",
        code: "surface.stable_publication_applied",
      });
      stateAfterReentry = harness.kernel.getStateInternalV1();
      throw new Error("stale profile callback fault");
    });

    profile.publish();

    expect(stateAfterReentry).not.toBeNull();
    expect(harness.kernel.getStateInternalV1()).toBe(stateAfterReentry);
    expect(harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
    expect(notifications).not.toHaveBeenCalled();
    expect(profile.markSeen).not.toHaveBeenCalled();
    expect(dispatchResolution).not.toHaveBeenCalled();

    profile.setRead(() => defaultPlayerProfileV1);
    const successor = currentTargetAndFrameV1(harness);
    const successorController = createControllerV1(
      harness,
      successor.target,
      successor.frame,
    );
    expect(successorController.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      phase: "preparing",
      playbackMode: "auto",
    });

    admission.disposeInternalV1();
    successorController.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("preserves the player-auto remaining wait across suspension", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("player-auto-resumed"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({
      clock,
      profile: mutableDialogueProfileV1(
        playerProfileWithPreferencesV1({ autoWaitMs: 100 }),
      ),
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "auto", "remaining-before-suspend");
    clock.fire(1_100);
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      playbackMode: "auto",
      revealComplete: true,
    });
    const retiredTick = clock.latestTick();

    clock.setNow(1_150);
    setCurrentNarrativePhaseV1(harness, "suspended");
    retiredTick(1_200);
    expect(dispatchResolution).not.toHaveBeenCalled();

    clock.setNow(5_000);
    setCurrentNarrativePhaseV1(harness, "active");
    expect(dispatchResolution).not.toHaveBeenCalled();
    clock.fire(5_049);
    expect(dispatchResolution).not.toHaveBeenCalled();
    clock.fire(5_050);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });
    expect(harness.profile.markSeen).toHaveBeenCalledOnce();

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("defers zero-remaining Skip until the first tick after resume", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("skip-resumed"));
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const profile = mutableDialogueProfileV1(
      playerProfileWithPreferencesV1({ skipPolicy: "skip_all" }),
    );
    const harness = dialoguePlayerHarnessV1({
      clock,
      profile,
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "skip", "zero-remaining-before-suspend");
    const retiredTick = clock.latestTick();

    clock.setNow(1_040);
    setCurrentNarrativePhaseV1(harness, "suspended");
    retiredTick(1_040);
    expect(dispatchResolution).not.toHaveBeenCalled();

    clock.setNow(5_000);
    setCurrentNarrativePhaseV1(harness, "active");
    expect(dispatchResolution).not.toHaveBeenCalled();
    expect(clock.requestTick).toHaveBeenCalledTimes(2);
    clock.fire(5_000);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(dispatchResolution).toHaveBeenCalledWith({
      expectedOccurrenceId: "interaction-occurrence.1",
      resolution: { kind: "advance" },
    });
    expect(profile.markSeen).toHaveBeenCalledOnce();
    expect(profile.markSeen.mock.invocationCallOrder[0]).toBeLessThan(
      dispatchResolution.mock.invocationCallOrder[0]!,
    );

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("keeps a presigned manual loser stale through automatic Promise rejection", async () => {
    const sentinel = new Error("automatic semantic rejection");
    let rejectSemantic!: (reason: unknown) => void;
    const semanticCompletion = new Promise<unknown>((_resolve, reject) => {
      rejectSemantic = reject;
    });
    const dispatchResolution = vi.fn(() => semanticCompletion);
    const harness = dialoguePlayerHarnessV1({
      profile: mutableDialogueProfileV1(
        playerProfileWithPreferencesV1({ autoWaitMs: 0 }),
      ),
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    const manualLoser = admission.issueSayActivationAttemptInternalV1(controller);
    expect(manualLoser).not.toBeNull();
    togglePlaybackModeV1(admission, "auto", "promise-rejection-winner");
    harness.clock.fire(1_100);
    expect(dispatchResolution).toHaveBeenCalledOnce();
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-pending-loser",
          ),
        }),
        manualLoser,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(admission.issueSayActivationAttemptInternalV1(controller)).toBeNull();

    const stopAttempt = admission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(stopAttempt).not.toBeNull();
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeToggleAutoActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-pending-stop",
          ),
        }),
        stopAttempt,
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "normal", completion: null });
    expect(harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      playbackMode: "auto",
    });
    expect(admission.issuePlaybackModeToggleAttemptInternalV1("auto")).toBeNull();

    rejectSemantic(sentinel);
    await expect(semanticCompletion).rejects.toBe(sentinel);
    await flushDialogueMicrotasksV1();
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      playbackMode: "normal",
    });
    expect(admission.issuePlaybackModeToggleAttemptInternalV1("auto")).not.toBeNull();
    expect(
      admission.routeInternalV1(
        admission.createEnvelopeInternalV1({
          actionId: narrativeAdvanceActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-settled-loser",
          ),
        }),
        manualLoser,
      ).consumerResult,
    ).toEqual({ kind: "stale", completion: null });
    expect(dispatchResolution).toHaveBeenCalledOnce();

    admission.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("does not defer an Auto and Skip stop behind a predecessor semantic boundary", async () => {
    let resolveSemantic!: (value: unknown) => void;
    const semanticCompletion = new Promise<unknown>((resolve) => {
      resolveSemantic = resolve;
    });
    const dispatchResolution = vi.fn(() => semanticCompletion);
    const harness = dialoguePlayerHarnessV1({
      profile: mutableDialogueProfileV1(
        playerProfileWithPreferencesV1({ skipPolicy: "skip_all" }),
      ),
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });

    togglePlaybackModeV1(admission, "auto", "in-flight-overlay-enable-auto");
    togglePlaybackModeV1(admission, "skip", "in-flight-overlay-enable-skip");
    harness.clock.fire(1_040);
    expect(dispatchResolution).toHaveBeenCalledOnce();

    expect(harness.bridge.reconcilePendingInternalV1(sayPendingV1(2))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    settleCurrentNarrativeReadyV1(harness);
    const successor = currentTargetAndFrameV1(harness);
    const successorController = createControllerV1(
      harness,
      successor.target,
      successor.frame,
    );
    admission.disposeInternalV1();
    const successorAdmission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    expect(successorController.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      playbackMode: "skip",
    });

    const stopSkip = successorAdmission.issuePlaybackModeToggleAttemptInternalV1("skip");
    expect(stopSkip).not.toBeNull();
    expect(
      successorAdmission.routeInternalV1(
        successorAdmission.createEnvelopeInternalV1({
          actionId: narrativeToggleSkipActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-in-flight-overlay-stop-skip",
          ),
        }),
        stopSkip,
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "auto", completion: null });
    expect(harness.bridge.readPlaybackModeInternalV1()).toBe("auto");
    expect(successorController.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      playbackMode: "auto",
    });

    const stopAuto = successorAdmission.issuePlaybackModeToggleAttemptInternalV1("auto");
    expect(stopAuto).not.toBeNull();
    expect(
      successorAdmission.routeInternalV1(
        successorAdmission.createEnvelopeInternalV1({
          actionId: narrativeToggleAutoActionIdV1,
          gestureId: parseManagedSurfaceGestureIdV1(
            "gesture.narrative.dialogue-player-in-flight-overlay-stop-auto",
          ),
        }),
        stopAuto,
      ).consumerResult,
    ).toEqual({ kind: "toggled", mode: "normal", completion: null });
    expect(harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(successorController.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      playbackMode: "normal",
    });
    expect(successorAdmission.issuePlaybackModeToggleAttemptInternalV1("auto")).not.toBeNull();

    resolveSemantic("advanced");
    await expect(semanticCompletion).resolves.toBe("advanced");
    await flushDialogueMicrotasksV1();
    expect(successorController.getSnapshotInternalV1()).toMatchObject({
      kind: "say",
      playbackMode: "normal",
    });

    successorAdmission.disposeInternalV1();
    controller.disposeInternalV1();
    successorController.disposeInternalV1();
  });

  it("resets mode before publishing a fresh non-Say boundary", () => {
    const dispatchResolution = vi.fn(() => Promise.resolve("must-not-dispatch"));
    const harness = dialoguePlayerHarnessV1({
      semanticDispatchPort: {
        dispatchResolutionInternalV1: dispatchResolution,
      },
    });
    const current = installSayCandidateV1(harness);
    const controller = createControllerV1(harness, current.target, current.frame);
    settleCurrentNarrativeReadyV1(harness);
    const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
      bridge: harness.bridge,
      inputRouter: createInputRouterV1(),
      isGestureCurrent: () => true,
    });
    togglePlaybackModeV1(admission, "skip", "fresh-non-say-reset");
    const observedModes: string[] = [];
    const unsubscribeState = harness.kernel.subscribeStateInternalV1(() => {
      observedModes.push(harness.bridge.readPlaybackModeInternalV1());
    });

    expect(harness.bridge.reconcilePendingInternalV1(passivePendingV1(2))).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });

    expect(observedModes.length).toBeGreaterThan(0);
    expect(observedModes.every((mode) => mode === "normal")).toBe(true);
    expect(harness.bridge.readPlaybackModeInternalV1()).toBe("normal");
    expect(controller.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "suspended",
      playbackMode: "normal",
    });
    expect(dispatchResolution).not.toHaveBeenCalled();
    const successor = currentTargetAndFrameV1(harness);
    const successorController = createControllerV1(
      harness,
      successor.target,
      successor.frame,
    );
    expect(successorController.getSnapshotInternalV1()).toMatchObject({
      kind: "passive",
      phase: "preparing",
      playbackMode: "normal",
    });

    unsubscribeState();
    admission.disposeInternalV1();
    successorController.disposeInternalV1();
    controller.disposeInternalV1();
  });

  it("keeps 10k controller and tick generations at one live target", () => {
    const clock = manualDialogueClockV1({ initialNowMs: 1_000 });
    const harness = dialoguePlayerHarnessV1({ clock });
    let controller: NarrativeStableDialoguePlayerControllerInternalV1 | null = null;
    let retiredTick: ((nowMs: number) => void) | null = null;

    for (let sequence = 1; sequence <= 10_000; sequence += 1) {
      const current = installSayCandidateV1(harness, sequence);
      controller = createControllerV1(harness, current.target, current.frame);
      settleCurrentNarrativeReadyV1(harness);
      clock.fire(1_000 + sequence);
      if (sequence === 1) retiredTick = clock.latestTick();
    }

    if (controller === null || retiredTick === null) {
      throw new Error("expected final controller and retired tick");
    }
    retiredTick(20_000);
    expect(clock.requestTick).toHaveBeenCalledTimes(20_000);
    expect(clock.cancel).toHaveBeenCalledTimes(9_999);
    expect(harness.profile.subscribe).toHaveBeenCalledTimes(10_000);
    expect(harness.profile.unsubscribe).toHaveBeenCalledTimes(9_999);
    expect(harness.profile.markSeen).not.toHaveBeenCalled();
    expect(harness.kernel.getStateInternalV1().stableAcceptedBaselines).toHaveLength(1);
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toHaveLength(1);

    controller.disposeInternalV1();
    expect(clock.cancel).toHaveBeenCalledTimes(10_000);
    expect(harness.profile.unsubscribe).toHaveBeenCalledTimes(10_000);
  }, 30_000);

  it("releases a subscription returned after its synchronous callback retires the factory record", () => {
    let retainedListener: (() => void) | null = null;
    const getSnapshot = vi.fn(() => defaultPlayerProfileV1);
    const unsubscribe = vi.fn();
    let harness!: DialoguePlayerHarnessV1;
    const subscribe = vi.fn((listener: () => void) => {
      retainedListener = listener;
      settleCurrentNarrativeReadyV1(harness);
      listener();
      return unsubscribe;
    });
    const markSeen = vi.fn();
    const rawProfilePort = {
      getSnapshotInternalV1: getSnapshot,
      subscribeInternalV1: subscribe,
      markSeenInternalV1: markSeen,
    };
    harness = dialoguePlayerHarnessV1({ rawProfilePort });
    const current = installSayCandidateV1(harness);

    expect(() => createControllerV1(harness, current.target, current.frame)).toThrowError(
      "ui.narrative_stable_dialogue_player_controller_invalid",
    );
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(markSeen).not.toHaveBeenCalled();
    expect(harness.clock.requestTick).toHaveBeenCalledOnce();
    expect(harness.clock.cancel).toHaveBeenCalledOnce();

    const lateListener = retainedListener as (() => void) | null;
    if (lateListener === null) throw new Error("expected retained raw profile listener");
    const state = harness.kernel.getStateInternalV1();
    lateListener();
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(harness.kernel.getStateInternalV1()).toBe(state);
  });

  it("contains resolver failure while preserving the preparing Surface state", () => {
    const text = dialogueTextResolverV1(() => {
      throw new Error("resolver fault");
    });
    const harness = dialoguePlayerHarnessV1({ text });
    const current = installSayCandidateV1(harness);
    const before = harness.kernel.getStateInternalV1();
    expect(() => createControllerV1(harness, current.target, current.frame)).toThrow(TypeError);
    expect(harness.kernel.getStateInternalV1()).toBe(before);
    expect(harness.clock.requestTick).not.toHaveBeenCalled();
    expect(harness.profile.markSeen).not.toHaveBeenCalled();
  });
});
