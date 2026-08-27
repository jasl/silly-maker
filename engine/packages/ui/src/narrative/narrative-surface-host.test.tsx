// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  appendNarrativeHistoryV1,
  emptyNarrativeHistoryV1,
  parseNonNegativeSafeInteger,
  type NarrativeHistoryV1,
  type PendingInteractionV1,
} from "@sillymaker/base";
import { defaultPlayerProfileV1, type PlayerProfileV1 } from "@sillymaker/base/runtime";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Component,
  startTransition,
  StrictMode,
  Suspense,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  inputHandledV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
  type InputActionIdV1,
} from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceGestureIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { createManagedSurfaceCompositeKernelBundleInternalV1 } from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import {
  createNarrativeManagedSurfaceFamilyContractInternalV1,
  createNarrativeStablePhysicalActionAdmissionInternalV1,
  createNarrativeStablePublisherBridgeInternalV1,
  createNarrativeStableSessionInternalV1,
  type NarrativeStableCandidatePreflightInternalV1,
  type NarrativeStableHistoryObservationPortInternalV1,
  type NarrativeStableRendererPropsInternalV1,
  type NarrativeStableSemanticResolutionPortInternalV1,
} from "./narrative-managed-surface-family.ts";
import * as narrativeFamilyModuleV1 from "./narrative-managed-surface-family.ts";
import type {
  NarrativeStableHostRenderEntryInternalV1,
  NarrativeStableHostRenderSourceInternalV1,
  NarrativeStableHostReadyCommitInternalV1,
  NarrativeStableHostRuntimeInternalV1,
  NarrativeStableRootPreparationInternalV1,
  NarrativeStableSessionInternalV1,
} from "./narrative-managed-surface-session.ts";
import {
  NarrativeSurfaceHostInternalV1,
  registerNarrativeSurfaceHostPhysicalIngressInternalV1,
  type NarrativeSurfaceHostPhysicalIngressContextInternalV1,
  type NarrativeSurfaceHostPropsInternalV1,
  type RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1,
} from "./narrative-surface-host.tsx";
import type { NarrativeStableDialoguePlayerSnapshotInternalV1 } from "./dialogue-player-controller.ts";
import { GameStageV1, type GameStageLayersV1 } from "../shell/game-stage.tsx";

const applicationEpochV1 = parseNonNegativeSafeInteger(211);
const toggleHistoryActionIdV1 = parseManagedSurfaceActionIdV1(
  playerInputActionIdsV1.toggleHistory,
);

const emptyStageLayersV1 = ({
  background: null,
  character: null,
  sceneInteraction: null,
  hud: null,
  narrative: null,
  wholeCanvas: null,
  workspaceOverlay: null,
  system: null,
}) satisfies GameStageLayersV1;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function pendingSayV1(
  sequence = 1,
): Extract<PendingInteractionV1, { readonly kind: "say" }> {
  return {
    kind: "say",
    definitionId: "narrative.test.say",
    seenRevision: sequence,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    speakerTextId: "text.host-test.speaker",
    textId: "text.host-test.line",
    advancePolicy: "confirm",
  };
}

interface MutableHistoryObservationV1 {
  readonly port: NarrativeStableHistoryObservationPortInternalV1;
  readonly started: () => number;
  readonly active: () => number;
  failReads(error: unknown): void;
  publish(snapshot: NarrativeHistoryV1): void;
}

function mutableHistoryObservationV1(): MutableHistoryObservationV1 {
  let snapshot = emptyNarrativeHistoryV1;
  let readError: unknown = null;
  let started = 0;
  const listeners = new Set<() => void>();
  const port = ({
    getSnapshotInternalV1: () => {
      if (readError !== null) throw readError;
      return snapshot;
    },
    subscribeInternalV1(listener: () => void): () => void {
      started += 1;
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
  }) satisfies NarrativeStableHistoryObservationPortInternalV1;
  return {
    port,
    started: () => started,
    active: () => listeners.size,
    failReads(error: unknown): void {
      readError = error;
    },
    publish(nextSnapshot): void {
      snapshot = nextSnapshot;
      for (const listener of [...listeners]) listener();
    },
  };
}

interface MutableDialoguePlayerObservationV1 {
  readonly port: Readonly<{
    getSnapshotInternalV1(): NarrativeStableDialoguePlayerSnapshotInternalV1;
    subscribeInternalV1(listener: () => void): () => void;
  }>;
  readonly started: () => number;
  readonly active: () => number;
  failReads(error: unknown): void;
  failSubscriptions(error: unknown): void;
  publish(snapshot: NarrativeStableDialoguePlayerSnapshotInternalV1): void;
}

function passiveDialoguePlayerViewV1(
  phase: "preparing" | "active" | "suspended",
  playerProfile = defaultPlayerProfileV1,
): NarrativeStableDialoguePlayerSnapshotInternalV1 {
  return ({
    kind: "passive" as const,
    phase,
    playbackMode: "normal" as const,
    playerProfile,
  });
}

function mutableDialoguePlayerObservationV1(
  initialSnapshot: NarrativeStableDialoguePlayerSnapshotInternalV1 = passiveDialoguePlayerViewV1(
    "preparing",
  ),
): MutableDialoguePlayerObservationV1 {
  let snapshot = initialSnapshot;
  let readFailed = false;
  let readError: unknown;
  let subscribeFailed = false;
  let subscribeError: unknown;
  let started = 0;
  const listeners = new Set<() => void>();
  const port = {
    getSnapshotInternalV1: () => {
      if (readFailed) throw readError;
      return snapshot;
    },
    subscribeInternalV1(listener: () => void): () => void {
      started += 1;
      if (subscribeFailed) throw subscribeError;
      listeners.add(listener);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
  };
  return {
    port,
    started: () => started,
    active: () => listeners.size,
    failReads(error: unknown): void {
      readFailed = true;
      readError = error;
    },
    failSubscriptions(error: unknown): void {
      subscribeFailed = true;
      subscribeError = error;
    },
    publish(nextSnapshot): void {
      snapshot = nextSnapshot;
      for (const listener of [...listeners]) listener();
    },
  };
}

function hostHarnessV1(
  rendererComponent: (props: NarrativeStableRendererPropsInternalV1) => unknown,
  historyObservation = mutableHistoryObservationV1(),
) {
  const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const kernelBundle = createManagedSurfaceCompositeKernelBundleInternalV1({
    applicationEpoch: applicationEpochV1,
    recipe: {
      resolvedOwnerIds: contract.resolvedOwnerIds,
      resolvedSlotDescriptors: contract.resolvedSlotDescriptors,
    },
    definitionSidecars: contract.stableDefinitionSidecars,
  });
  const kernel = kernelBundle.compositeRuntimeKernel;
  const semanticDispatchPort = ({
    dispatchResolutionInternalV1: (_request: unknown) => Promise.resolve(undefined),
  }) satisfies NarrativeStableSemanticResolutionPortInternalV1;
  let currentPlayerProfile: PlayerProfileV1 = defaultPlayerProfileV1;
  const playerProfileListeners = new Set<() => void>();
  const playerProfile = {
    getSnapshotInternalV1: () => currentPlayerProfile,
    subscribeInternalV1: (listener: () => void) => {
      playerProfileListeners.add(listener);
      let active = true;
      return (() => {
        if (!active) return;
        active = false;
        playerProfileListeners.delete(listener);
      });
    },
    markSeenInternalV1: (_definitionId: string, _seenRevision: number) => {},
  };
  let tickRequests = 0;
  const presentationClock = {
    nowInternalV1: () => 0,
    requestTickInternalV1: (_callback: (nowMs: number) => void) => {
      tickRequests += 1;
      return (() => {});
    },
    prefersReducedMotionInternalV1: () => false,
  };
  const textResolver = {
    resolveTextInternalV1: (textId: string) => textId,
  };
  const candidatePreflight = ({
    preflightCandidateInternalV1: () => ({
      kind: "captured" as const,
      candidateSnapshot: {
        rendererComponent,
        visualConfig: { skin: "host-test" },
        semanticDispatchPort,
        historyObservationPort: historyObservation.port,
        historyAvailabilityPort: {
          readHistoryAvailabilityInternalV1: () => true,
        },
        playerProfile,
        presentationClock,
        textResolver,
        voiceReplayPort: null,
        quickMenuContribution: null,
      },
    }),
  }) satisfies NarrativeStableCandidatePreflightInternalV1;
  const bridge = createNarrativeStablePublisherBridgeInternalV1({
    kernelBundle,
    candidatePreflight,
  });
  const session = createNarrativeStableSessionInternalV1({ bridge });
  const isGestureCurrent = () => true;
  let stateNotifications = 0;
  const bindingKinds: string[] = [];
  kernel.subscribeStateInternalV1(() => {
    stateNotifications += 1;
    bindingKinds.push(
      ...kernel.getStateInternalV1().stableRuntimeBindings.map((entry) => entry.binding.kind),
    );
  });
  return {
    bindingKinds,
    bridge,
    historyObservation,
    inputRouter: createInputRouterV1(),
    isGestureCurrent,
    kernel,
    publishPlayerProfile: (nextProfile: PlayerProfileV1): void => {
      currentPlayerProfile = nextProfile;
      for (const listener of [...playerProfileListeners]) listener();
    },
    session,
    stateNotificationCount: () => stateNotifications,
    tickRequestCount: () => tickRequests,
  };
}

async function flushHostMicrotasksV1(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function openHistoryV1(
  harness: ReturnType<typeof hostHarnessV1>,
  suffix: string,
  isGestureCurrent: NarrativeSurfaceHostPropsInternalV1["isGestureCurrent"],
): void {
  const admission = createNarrativeStablePhysicalActionAdmissionInternalV1({
    bridge: harness.bridge,
    inputRouter: harness.inputRouter,
    isGestureCurrent,
  });
  const attempt = admission.issueHistoryOpenAttemptInternalV1();
  if (attempt === null) throw new Error("expected a History-open attempt");
  const result = admission.routeInternalV1(
    admission.createEnvelopeInternalV1({
      actionId: toggleHistoryActionIdV1,
      gestureId: parseManagedSurfaceGestureIdV1(`gesture.host-test.${suffix}`),
    }),
    attempt,
  );
  if (result.consumerResult?.kind !== "requested") {
    throw new Error("expected a requested History-open intent");
  }
  const redeemed = harness.session.getHistoryChildLifecycleInternalV1()
    .redeemHistoryOpenIntentInternalV1(result.consumerResult.intent);
  admission.disposeInternalV1();
  if (redeemed.kind !== "preparing") throw new Error("expected History preparation");
}

type HistoryRenderEntryV1 = Extract<
  NarrativeStableHostRenderEntryInternalV1,
  { readonly kind: "history" }
>;

function currentHistoryRenderEntryV1(
  runtime: NarrativeStableHostRuntimeInternalV1,
): HistoryRenderEntryV1 {
  const entry = runtime.renderSource.getSnapshotInternalV1().entries.find((candidate) =>
    candidate.kind === "history"
  );
  if (entry?.kind !== "history") throw new Error("expected current History render entry");
  return entry;
}

function routeActionV1(
  harness: ReturnType<typeof hostHarnessV1>,
  actionId: InputActionIdV1,
) {
  return harness.inputRouter.route({ kind: "action" as const, actionId });
}

function narrativeRenderShellV1(descendant: Element | null): HTMLDivElement {
  const shell = descendant?.closest<HTMLDivElement>(
    "[data-narrative-surface-render-shell]",
  );
  if (!(shell instanceof HTMLDivElement)) {
    throw new Error("expected narrative render shell");
  }
  return shell;
}

function narrativeFocusScopeV1(descendant: Element | null): HTMLDivElement {
  const renderShell = narrativeRenderShellV1(descendant);
  const scope = renderShell.parentElement;
  if (
    !(scope instanceof HTMLDivElement) ||
    !scope.hasAttribute("data-narrative-surface-focus-scope")
  ) {
    throw new Error("expected narrative focus scope");
  }
  return scope;
}

function StagedNarrativeHostV1(
  props: NarrativeSurfaceHostPropsInternalV1 & Readonly<{ onLowerAction: () => void }>,
) {
  return (
    <GameStageV1
      accessibleName="Narrative Host gesture stage"
      layers={{
        ...emptyStageLayersV1,
        sceneInteraction: (
          <button type="button" data-testid="narrative-lower-action" onClick={props.onLowerAction}>
            Lower action
          </button>
        ),
        narrative: (
          <NarrativeSurfaceHostInternalV1
            session={props.session}
            portalContainer={props.portalContainer}
            inputRouter={props.inputRouter}
            isGestureCurrent={props.isGestureCurrent}
          />
        ),
      }}
    />
  );
}

function historyWithOneEntryV1(): NarrativeHistoryV1 {
  return appendNarrativeHistoryV1(
    emptyNarrativeHistoryV1,
    {
      kind: "say" as const,
      occurrenceId: "interaction-occurrence.2",
      definitionId: "interaction.host-test.line",
      seenRevision: 1,
      speakerTextId: null,
      textId: "text.host-test.line",
      voiceAssetId: null,
    },
  );
}

type SyntheticDialogueRenderEntryV1 = Extract<
  NarrativeStableHostRenderEntryInternalV1,
  { readonly kind: "dialogue" }
>;

function syntheticDialogueRenderEntryV1(
  input: Readonly<{
    readonly phase: SyntheticDialogueRenderEntryV1["phase"];
    readonly preparation: NarrativeStableRootPreparationInternalV1 | null;
    readonly renderKey?: string;
    readonly rendererComponent: SyntheticDialogueRenderEntryV1["rendererComponent"];
    readonly playerObservation?: MutableDialoguePlayerObservationV1["port"];
  }>,
): SyntheticDialogueRenderEntryV1 {
  return ({
    kind: "dialogue",
    phase: input.phase,
    renderKey: input.renderKey ?? "narrative-host-render.synthetic-repair",
    preparation: input.preparation,
    initialFocusTargetId: parseManagedSurfaceFocusTargetIdV1(
      "surface-focus.narrative.primary",
    ),
    rendererComponent: input.rendererComponent,
    rendererProps: {
      kind: "dialogue",
      pending: pendingSayV1(),
      visualConfig: { skin: "synthetic-repair" },
      playerProfile: defaultPlayerProfileV1,
      textResolver: (textId: string) => textId,
      quickMenuContribution: null,
    },
    playerObservation: input.playerObservation ?? mutableDialoguePlayerObservationV1().port,
  }) as unknown as SyntheticDialogueRenderEntryV1;
}

function mutableHostRenderSourceV1(
  initialEntry: NarrativeStableHostRenderEntryInternalV1,
): Readonly<{
  readonly source: NarrativeStableHostRenderSourceInternalV1;
  publish(entry: NarrativeStableHostRenderEntryInternalV1): void;
  selectWithoutNotify(entry: NarrativeStableHostRenderEntryInternalV1): void;
}> {
  let snapshot = { entries: [initialEntry] };
  const listeners = new Set<() => void>();
  const source = ({
    getSnapshotInternalV1: () => snapshot,
    subscribeInternalV1(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  }) satisfies NarrativeStableHostRenderSourceInternalV1;
  return ({
    source,
    publish(entry: NarrativeStableHostRenderEntryInternalV1): void {
      snapshot = { entries: [entry] };
      for (const listener of [...listeners]) listener();
    },
    selectWithoutNotify(entry: NarrativeStableHostRenderEntryInternalV1): void {
      snapshot = { entries: [entry] };
    },
  });
}

function syntheticHostRuntimeV1(
  initialEntry: NarrativeStableHostRenderEntryInternalV1,
): Readonly<{
  readonly runtime: NarrativeStableHostRuntimeInternalV1;
  readonly renderSource: ReturnType<typeof mutableHostRenderSourceV1>;
  readonly settleReady: ReturnType<typeof vi.fn>;
  readonly settleFailed: ReturnType<typeof vi.fn>;
  readonly release: ReturnType<typeof vi.fn>;
}> {
  const renderSource = mutableHostRenderSourceV1(initialEntry);
  const settleReady = vi.fn(() => ({ kind: "settled" as const, completion: null }));
  const settleFailed = vi.fn(() => ({ kind: "settled" as const, completion: null }));
  const release = vi.fn();
  const runtime = ({
    attachment: {
      settleRootReadinessReadyInternalV1: settleReady,
      settleRootReadinessFailedInternalV1: settleFailed,
      settleHistoryReadinessReadyInternalV1: vi.fn(),
      settleHistoryReadinessFailedInternalV1: vi.fn(),
      releaseInternalV1: release,
    },
    renderSource: renderSource.source,
  }) as unknown as NarrativeStableHostRuntimeInternalV1;
  vi.spyOn(narrativeFamilyModuleV1, "createNarrativeStableHostRuntimeInternalV1")
    .mockReturnValue(runtime);
  return ({ runtime, renderSource, settleReady, settleFailed, release });
}

function emptySyntheticHostRuntimeV1(
  releaseObservation: (() => void) | null = null,
): Readonly<{
  readonly runtime: NarrativeStableHostRuntimeInternalV1;
  readonly release: ReturnType<typeof vi.fn>;
  readonly getSnapshot: ReturnType<typeof vi.fn>;
  readonly subscribe: ReturnType<typeof vi.fn>;
  readonly isActive: () => boolean;
  readonly retire: () => void;
}> {
  let active = true;
  const snapshot = { entries: [] };
  const getSnapshot = vi.fn(() => snapshot);
  const subscribe = vi.fn((_listener: () => void) => (() => {}));
  const release = vi.fn(() => {
    releaseObservation?.();
    active = false;
  });
  const runtime = ({
    attachment: {
      settleRootReadinessReadyInternalV1: vi.fn(),
      settleRootReadinessFailedInternalV1: vi.fn(),
      settleHistoryReadinessReadyInternalV1: vi.fn(),
      settleHistoryReadinessFailedInternalV1: vi.fn(),
      releaseInternalV1: release,
    },
    renderSource: {
      getSnapshotInternalV1: getSnapshot,
      subscribeInternalV1: subscribe,
    },
  }) as unknown as NarrativeStableHostRuntimeInternalV1;
  vi.spyOn(narrativeFamilyModuleV1, "createNarrativeStableHostRuntimeInternalV1")
    .mockReturnValue(runtime);
  vi.spyOn(narrativeFamilyModuleV1, "isNarrativeStableHostRuntimeCurrentInternalV1")
    .mockImplementation((candidate) => candidate === runtime && active);
  return ({
    runtime,
    release,
    getSnapshot,
    subscribe,
    isActive: () => active,
    retire: () => {
      active = false;
    },
  });
}

function freshEmptySyntheticHostRuntimeFactoryV1(): Readonly<{
  readonly created: () => number;
  readonly observed: () => number;
  readonly released: () => number;
}> {
  const activeRuntimes = new WeakSet<NarrativeStableHostRuntimeInternalV1>();
  let created = 0;
  let observed = 0;
  let released = 0;
  vi.spyOn(narrativeFamilyModuleV1, "createNarrativeStableHostRuntimeInternalV1")
    .mockImplementation(() => {
      created += 1;
      const snapshot = { entries: [] };
      const runtime = ({
        attachment: {
          settleRootReadinessReadyInternalV1: vi.fn(),
          settleRootReadinessFailedInternalV1: vi.fn(),
          settleHistoryReadinessReadyInternalV1: vi.fn(),
          settleHistoryReadinessFailedInternalV1: vi.fn(),
          releaseInternalV1: () => {
            if (!activeRuntimes.delete(runtime)) return;
            released += 1;
          },
        },
        renderSource: {
          getSnapshotInternalV1: () => {
            observed += 1;
            return snapshot;
          },
          subscribeInternalV1: (_listener: () => void) => (() => {}),
        },
      }) as unknown as NarrativeStableHostRuntimeInternalV1;
      activeRuntimes.add(runtime);
      return runtime;
    });
  vi.spyOn(narrativeFamilyModuleV1, "isNarrativeStableHostRuntimeCurrentInternalV1")
    .mockImplementation((runtime) => activeRuntimes.has(runtime));
  return ({
    created: () => created,
    observed: () => observed,
    released: () => released,
  });
}

function physicalIngressRegistrationInputV1(
  input: RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1,
): RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1 {
  return ({
    session: input.session,
    portalContainer: input.portalContainer,
    inputRouter: input.inputRouter,
    attachInternalV1: input.attachInternalV1,
  });
}

class CapturedErrorBoundaryV1 extends Component<
  Readonly<{ readonly onError: (error: unknown) => void; readonly children: ReactNode }>,
  Readonly<{ readonly failed: boolean }>
> {
  state = { failed: false };

  static getDerivedStateFromError(): { readonly failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    this.props.onError(error);
  }

  render(): ReactNode {
    return this.state.failed ? <div data-testid="outer-host-error" /> : this.props.children;
  }
}

describe("NarrativeSurfaceHostInternalV1", () => {
  it("keeps the dormant Host module and props package-internal and exact", () => {
    expectTypeOf<keyof NarrativeSurfaceHostPropsInternalV1>().toEqualTypeOf<
      "session" | "portalContainer" | "inputRouter" | "isGestureCurrent"
    >();
    expectTypeOf<NarrativeSurfaceHostPropsInternalV1["session"]>()
      .toEqualTypeOf<NarrativeStableSessionInternalV1>();
    expectTypeOf<NarrativeSurfaceHostPropsInternalV1["portalContainer"]>()
      .toEqualTypeOf<HTMLDivElement>();
    expect(NarrativeSurfaceHostInternalV1).toEqual(expect.any(Function));
  });

  it("does not reclaim focus after a higher Stage layer makes Narrative inert", async () => {
    const Renderer = () => <button type="button" data-testid="inert-narrative">Narrative</button>;
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const narrativeLayer = document.createElement("div");
    const portalContainer = document.createElement("div");
    const higherOwner = document.createElement("button");
    narrativeLayer.append(portalContainer);
    document.body.append(narrativeLayer, higherOwner);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();
    expect(portalContainer.querySelector('[data-testid="inert-narrative"]')).not.toBeNull();

    narrativeLayer.setAttribute("inert", "");
    act(() => higherOwner.focus());
    await flushHostMicrotasksV1();

    expect(document.activeElement).toBe(higherOwner);
    view.unmount();
    narrativeLayer.remove();
    higherOwner.remove();
  });

  it("keeps the committed Narrative snapshot when a successor render is abandoned", async () => {
    const firstRenderer = vi.fn(() => <button type="button">First narrative</button>);
    const successorRenderer = vi.fn(() => <button type="button">Successor narrative</button>);
    const firstEntry = syntheticDialogueRenderEntryV1({
      phase: "active",
      preparation: null,
      renderKey: "narrative-host-render.first-currentness",
      rendererComponent: firstRenderer,
    });
    const successorEntry = syntheticDialogueRenderEntryV1({
      phase: "active",
      preparation: null,
      renderKey: "narrative-host-render.successor-currentness",
      rendererComponent: successorRenderer,
    });
    const runtime = syntheticHostRuntimeV1(firstEntry);
    vi.spyOn(narrativeFamilyModuleV1, "prepareNarrativeStableHostReadyCommitInternalV1")
      .mockReturnValue({ kind: "reattached" as const, completion: null });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const session = ({}) as unknown as NarrativeStableSessionInternalV1;
    const inputRouter = createInputRouterV1();
    const isGestureCurrent = () => true;
    const never = new Promise<void>(() => {});
    const suspendedRender = vi.fn();
    let attemptSuccessorRender: (() => void) | null = null;

    function SuspendSuccessorRenderInternalV1(props: { readonly active: boolean }) {
      if (props.active) {
        suspendedRender();
        throw never;
      }
      return null;
    }

    function CurrentnessHarnessInternalV1() {
      const [attempted, setAttempted] = useState(false);
      useLayoutEffect(() => {
        attemptSuccessorRender = () => {
          runtime.renderSource.selectWithoutNotify(successorEntry);
          startTransition(() => setAttempted(true));
        };
        return () => {
          attemptSuccessorRender = null;
        };
      }, []);
      return (
        <Suspense fallback={null}>
          <NarrativeSurfaceHostInternalV1
            session={session}
            portalContainer={portalContainer}
            inputRouter={inputRouter}
            isGestureCurrent={isGestureCurrent}
          />
          <SuspendSuccessorRenderInternalV1 active={attempted} />
        </Suspense>
      );
    }

    const view = render(<CurrentnessHarnessInternalV1 />);
    await waitFor(() => expect(firstRenderer).toHaveBeenCalled());
    const firstFocusScope = narrativeFocusScopeV1(portalContainer.querySelector("button"));
    expect(document.activeElement).toBe(firstFocusScope);
    expect(attemptSuccessorRender).not.toBeNull();

    act(() => attemptSuccessorRender!());
    await waitFor(() => {
      expect(suspendedRender).toHaveBeenCalled();
      expect(successorRenderer).toHaveBeenCalled();
    });

    const escapedFocus = document.createElement("button");
    escapedFocus.type = "button";
    document.body.append(escapedFocus);
    act(() => escapedFocus.focus());
    await act(async () => await Promise.resolve());

    expect(document.activeElement).toBe(firstFocusScope);
    expect(portalContainer).toContainElement(firstFocusScope);

    view.unmount();
    escapedFocus.remove();
    portalContainer.remove();
  });

  it("rejects a non-div physical-ingress portal before Host work", () => {
    const harness = hostHarnessV1(() => null);
    const attachInternalV1 = vi.fn(() => (() => {}));
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    expect(() =>
      registerNarrativeSurfaceHostPhysicalIngressInternalV1({
        session: harness.session,
        portalContainer: document.createElement("span") as unknown as HTMLDivElement,
        inputRouter: harness.inputRouter,
        attachInternalV1,
      })
    ).toThrowError(new TypeError("ui.narrative_surface_host_physical_ingress_invalid"));
    expect(attachInternalV1).not.toHaveBeenCalled();
    expect(createRuntime).not.toHaveBeenCalled();
  });

  it("keys registration by the exact tuple and token-fences old cleanup from a successor", () => {
    const firstHarness = hostHarnessV1(() => null);
    const secondHarness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    const otherPortalContainer = document.createElement("div");
    const otherInputRouter = createInputRouterV1();
    const attachInternalV1 = vi.fn(() => (() => {}));
    const exactInput = physicalIngressRegistrationInputV1({
      session: firstHarness.session,
      portalContainer,
      inputRouter: firstHarness.inputRouter,
      attachInternalV1,
    });
    const conflictingAttachInternalV1 = vi.fn(() => (() => {}));
    const conflictingInput = physicalIngressRegistrationInputV1({
      session: firstHarness.session,
      portalContainer,
      inputRouter: firstHarness.inputRouter,
      attachInternalV1: conflictingAttachInternalV1,
    });
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const firstCleanup = registerNarrativeSurfaceHostPhysicalIngressInternalV1(exactInput);
    expect(() => registerNarrativeSurfaceHostPhysicalIngressInternalV1(conflictingInput))
      .toThrowError(new TypeError("ui.narrative_surface_host_physical_ingress_invalid"));
    expect(attachInternalV1).not.toHaveBeenCalled();
    expect(conflictingAttachInternalV1).not.toHaveBeenCalled();
    expect(createRuntime).not.toHaveBeenCalled();

    const distinctTupleCleanups = [
      registerNarrativeSurfaceHostPhysicalIngressInternalV1(
        physicalIngressRegistrationInputV1({
          ...exactInput,
          session: secondHarness.session,
        }),
      ),
      registerNarrativeSurfaceHostPhysicalIngressInternalV1(
        physicalIngressRegistrationInputV1({
          ...exactInput,
          portalContainer: otherPortalContainer,
        }),
      ),
      registerNarrativeSurfaceHostPhysicalIngressInternalV1(
        physicalIngressRegistrationInputV1({
          ...exactInput,
          inputRouter: otherInputRouter,
        }),
      ),
    ];
    for (const cleanupDistinctTuple of distinctTupleCleanups) cleanupDistinctTuple();

    firstCleanup();
    const successorCleanup = registerNarrativeSurfaceHostPhysicalIngressInternalV1(exactInput);
    firstCleanup();
    expect(() => registerNarrativeSurfaceHostPhysicalIngressInternalV1(exactInput))
      .toThrowError(new TypeError("ui.narrative_surface_host_physical_ingress_invalid"));
    successorCleanup();
    const finalCleanup = registerNarrativeSurfaceHostPhysicalIngressInternalV1(exactInput);
    finalCleanup();
  });

  it.each(["unregistered", "session", "portal", "router"] as const)(
    "leaves an ordinary %s-unmatched Host path unchanged",
    (mismatchKind) => {
      const harness = hostHarnessV1(() => null);
      const otherHarness = hostHarnessV1(() => null);
      const portalContainer = document.createElement("div");
      document.body.append(portalContainer);
      const attachInternalV1 = vi.fn(() => (() => {}));
      let cleanupRegistration = () => {};
      if (mismatchKind !== "unregistered") {
        cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
          physicalIngressRegistrationInputV1({
            session: mismatchKind === "session" ? otherHarness.session : harness.session,
            portalContainer: mismatchKind === "portal"
              ? document.createElement("div")
              : portalContainer,
            inputRouter: mismatchKind === "router" ? otherHarness.inputRouter : harness.inputRouter,
            attachInternalV1,
          }),
        );
      }
      const createRuntime = vi.spyOn(
        narrativeFamilyModuleV1,
        "createNarrativeStableHostRuntimeInternalV1",
      );

      const view = render(
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />,
      );

      expect(createRuntime).toHaveBeenCalledOnce();
      expect(attachInternalV1).not.toHaveBeenCalled();
      expect(narrativeFamilyModuleV1.isNarrativeStableHostRuntimeCurrentInternalV1(
        createRuntime.mock.results[0]!.value,
      )).toBe(true);
      view.unmount();
      cleanupRegistration();
      portalContainer.remove();
    },
  );

  it("hands off the stable Host callback in a current-generation context", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const contexts: NarrativeSurfaceHostPhysicalIngressContextInternalV1[] = [];
    const detachInternalV1 = vi.fn();
    const attachInternalV1 = vi.fn(
      (context: NarrativeSurfaceHostPhysicalIngressContextInternalV1) => {
        expect(context.isCurrentInternalV1()).toBe(true);
        contexts.push(context);
        return detachInternalV1;
      },
    );
    const cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      physicalIngressRegistrationInputV1({
        session: harness.session,
        portalContainer,
        inputRouter: harness.inputRouter,
        attachInternalV1,
      }),
    );
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const firstGesturePredicate = vi.fn(() => true);
    const secondGesturePredicate = vi.fn(() => false);

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={firstGesturePredicate}
      />,
    );

    expect(attachInternalV1).toHaveBeenCalledOnce();
    expect(createRuntime).toHaveBeenCalledOnce();
    const context = contexts[0]!;
    const runtimeInput = createRuntime.mock.calls[0]![0];
    expect(context.inputRouter).toBe(harness.inputRouter);
    expect(context.isGestureCurrent).toBe(runtimeInput.isGestureCurrent);
    expect(context.isGestureCurrent).not.toBe(firstGesturePredicate);
    expect(context.isCurrentInternalV1()).toBe(true);

    const gestureId = parseManagedSurfaceGestureIdV1("gesture.host-physical-ingress.current");
    expect(context.isGestureCurrent(gestureId)).toBe(true);
    expect(firstGesturePredicate).toHaveBeenCalledWith(gestureId);
    view.rerender(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={secondGesturePredicate}
      />,
    );
    expect(createRuntime).toHaveBeenCalledOnce();
    expect(attachInternalV1).toHaveBeenCalledOnce();
    expect(context.isGestureCurrent).toBe(runtimeInput.isGestureCurrent);
    expect(context.isGestureCurrent(gestureId)).toBe(false);
    expect(secondGesturePredicate).toHaveBeenCalledWith(gestureId);

    cleanupRegistration();
    expect(context.isCurrentInternalV1()).toBe(false);
    expect(detachInternalV1).toHaveBeenCalledOnce();
    expect(narrativeFamilyModuleV1.isNarrativeStableHostRuntimeCurrentInternalV1(
      createRuntime.mock.results[0]!.value,
    )).toBe(true);
    cleanupRegistration();
    view.unmount();
    expect(detachInternalV1).toHaveBeenCalledOnce();
    portalContainer.remove();
  });

  it("rolls back attach faults without publishing a mounted runtime", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const contexts: NarrativeSurfaceHostPhysicalIngressContextInternalV1[] = [];
    const runtime = emptySyntheticHostRuntimeV1(() => {
      expect(contexts).toHaveLength(1);
      expect(contexts[0]!.isCurrentInternalV1()).toBe(false);
    });
    const attachInternalV1 = vi.fn(
      (context: NarrativeSurfaceHostPhysicalIngressContextInternalV1) => {
        contexts.push(context);
        throw new Error("physical-ingress-attach-fault");
      },
    );
    const registrationInput = physicalIngressRegistrationInputV1({
      session: harness.session,
      portalContainer,
      inputRouter: harness.inputRouter,
      attachInternalV1,
    });
    const cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      registrationInput,
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      render(
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />,
      )
    ).toThrowError(new Error("physical-ingress-attach-fault"));
    expect(attachInternalV1).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledOnce();
    expect(runtime.isActive()).toBe(false);
    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.isCurrentInternalV1()).toBe(false);
    expect(runtime.getSnapshot).not.toHaveBeenCalled();
    expect(runtime.subscribe).not.toHaveBeenCalled();
    expect(portalContainer).toBeEmptyDOMElement();
    expect(() => registerNarrativeSurfaceHostPhysicalIngressInternalV1(registrationInput))
      .toThrowError(new TypeError("ui.narrative_surface_host_physical_ingress_invalid"));

    consoleError.mockRestore();
    cleanupRegistration();
    const cleanupRetry = registerNarrativeSurfaceHostPhysicalIngressInternalV1(registrationInput);
    cleanupRetry();
    portalContainer.remove();
  });

  it("rolls back a cleanup returned after attach synchronously released its registration", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const runtime = emptySyntheticHostRuntimeV1();
    const detachInternalV1 = vi.fn();
    const contexts: NarrativeSurfaceHostPhysicalIngressContextInternalV1[] = [];
    let cleanupRegistration = () => {};
    cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      physicalIngressRegistrationInputV1({
        session: harness.session,
        portalContainer,
        inputRouter: harness.inputRouter,
        attachInternalV1: (context) => {
          contexts.push(context);
          cleanupRegistration();
          return detachInternalV1;
        },
      }),
    );

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );

    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.isCurrentInternalV1()).toBe(false);
    expect(detachInternalV1).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledOnce();
    expect(runtime.getSnapshot).not.toHaveBeenCalled();
    expect(runtime.subscribe).not.toHaveBeenCalled();
    expect(portalContainer).toBeEmptyDOMElement();
    view.unmount();
    expect(detachInternalV1).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledOnce();
    portalContainer.remove();
  });

  it("does not claim physical ingress when existing Host runtime creation fails", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    const runtimeError = new Error("host-runtime-create-before-physical-ingress");
    const attachInternalV1 = vi.fn(() => (() => {}));
    const cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      physicalIngressRegistrationInputV1({
        session: harness.session,
        portalContainer,
        inputRouter: harness.inputRouter,
        attachInternalV1,
      }),
    );
    vi.spyOn(narrativeFamilyModuleV1, "createNarrativeStableHostRuntimeInternalV1")
      .mockImplementation(() => {
        throw runtimeError;
      });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      render(
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />,
      )
    ).toThrowError(runtimeError);
    expect(attachInternalV1).not.toHaveBeenCalled();

    consoleError.mockRestore();
    cleanupRegistration();
  });

  it("makes context currentness depend on the Host runtime currentness gate", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const runtime = emptySyntheticHostRuntimeV1();
    let context!: NarrativeSurfaceHostPhysicalIngressContextInternalV1;
    const detachInternalV1 = vi.fn();
    const cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      physicalIngressRegistrationInputV1({
        session: harness.session,
        portalContainer,
        inputRouter: harness.inputRouter,
        attachInternalV1: (nextContext) => {
          context = nextContext;
          return detachInternalV1;
        },
      }),
    );
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    expect(context.isCurrentInternalV1()).toBe(true);

    runtime.retire();
    expect(context.isCurrentInternalV1()).toBe(false);
    expect(detachInternalV1).not.toHaveBeenCalled();

    view.unmount();
    expect(detachInternalV1).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledOnce();
    cleanupRegistration();
    portalContainer.remove();
  });

  it("fences generation before contained detach and releases the runtime in finally", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const order: string[] = [];
    const runtime = emptySyntheticHostRuntimeV1(() => order.push("release"));
    let context!: NarrativeSurfaceHostPhysicalIngressContextInternalV1;
    let cleanupRegistration = () => {};
    const detachInternalV1 = vi.fn(() => {
      order.push(`detach:${String(context.isCurrentInternalV1())}:${String(runtime.isActive())}`);
      cleanupRegistration();
      throw new Error("contained-physical-ingress-detach-fault");
    });
    cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      physicalIngressRegistrationInputV1({
        session: harness.session,
        portalContainer,
        inputRouter: harness.inputRouter,
        attachInternalV1: (nextContext) => {
          context = nextContext;
          return detachInternalV1;
        },
      }),
    );

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    expect(context.isCurrentInternalV1()).toBe(true);

    expect(() => view.unmount()).not.toThrow();
    expect(order).toEqual(["detach:false:true", "release"]);
    expect(detachInternalV1).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledOnce();
    expect(runtime.isActive()).toBe(false);
    cleanupRegistration();
    portalContainer.remove();
  });

  it("contains outer-release detach failure without releasing the still-mounted Host runtime", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const runtime = emptySyntheticHostRuntimeV1();
    let context!: NarrativeSurfaceHostPhysicalIngressContextInternalV1;
    const detachInternalV1 = vi.fn(() => {
      expect(context.isCurrentInternalV1()).toBe(false);
      expect(runtime.isActive()).toBe(true);
      throw new Error("contained-outer-release-detach-fault");
    });
    const cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      physicalIngressRegistrationInputV1({
        session: harness.session,
        portalContainer,
        inputRouter: harness.inputRouter,
        attachInternalV1: (nextContext) => {
          context = nextContext;
          return detachInternalV1;
        },
      }),
    );
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );

    expect(() => cleanupRegistration()).not.toThrow();
    expect(detachInternalV1).toHaveBeenCalledOnce();
    expect(runtime.release).not.toHaveBeenCalled();
    expect(runtime.isActive()).toBe(true);
    view.unmount();
    expect(detachInternalV1).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledOnce();
    portalContainer.remove();
  });

  it("does not let old effect cleanup erase a same-tuple successor registered by detach reentry", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const runtime = emptySyntheticHostRuntimeV1();
    const successorAttach = vi.fn(() => (() => {}));
    let oldCleanup = () => {};
    let successorCleanup = () => {};
    const oldInput = physicalIngressRegistrationInputV1({
      session: harness.session,
      portalContainer,
      inputRouter: harness.inputRouter,
      attachInternalV1: () => (() => {
        oldCleanup();
        successorCleanup = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
          physicalIngressRegistrationInputV1({
            session: harness.session,
            portalContainer,
            inputRouter: harness.inputRouter,
            attachInternalV1: successorAttach,
          }),
        );
      }),
    });
    oldCleanup = registerNarrativeSurfaceHostPhysicalIngressInternalV1(oldInput);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );

    view.unmount();
    expect(runtime.release).toHaveBeenCalledOnce();
    expect(() => registerNarrativeSurfaceHostPhysicalIngressInternalV1(oldInput))
      .toThrowError("ui.narrative_surface_host_physical_ingress_invalid");
    expect(successorAttach).not.toHaveBeenCalled();
    successorCleanup();
    portalContainer.remove();
  });

  it("uses a fresh physical-ingress generation across the same-instance StrictMode probe", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const contexts: NarrativeSurfaceHostPhysicalIngressContextInternalV1[] = [];
    const detachCalls: number[] = [];
    const attachInternalV1 = vi.fn(
      (context: NarrativeSurfaceHostPhysicalIngressContextInternalV1) => {
        const index = contexts.push(context) - 1;
        return (() => detachCalls.push(index));
      },
    );
    const cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      physicalIngressRegistrationInputV1({
        session: harness.session,
        portalContainer,
        inputRouter: harness.inputRouter,
        attachInternalV1,
      }),
    );
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );

    const view = render(
      <StrictMode>
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />
      </StrictMode>,
    );

    expect(attachInternalV1).toHaveBeenCalledTimes(2);
    expect(contexts).toHaveLength(2);
    expect(contexts[0]).not.toBe(contexts[1]);
    expect(contexts[0]!.isCurrentInternalV1()).toBe(false);
    expect(contexts[1]!.isCurrentInternalV1()).toBe(true);
    expect(detachCalls).toEqual([0]);
    expect(createRuntime).toHaveBeenCalledTimes(2);
    expect(createRuntime.mock.calls[0]![0].hostIdentity)
      .toBe(createRuntime.mock.calls[1]![0].hostIdentity);
    expect(createRuntime.mock.calls[0]![0].isGestureCurrent)
      .toBe(createRuntime.mock.calls[1]![0].isGestureCurrent);
    expect(contexts[0]!.isGestureCurrent).toBe(contexts[1]!.isGestureCurrent);

    view.unmount();
    expect(contexts[1]!.isCurrentInternalV1()).toBe(false);
    expect(detachCalls).toEqual([0, 1]);
    cleanupRegistration();
    expect(detachCalls).toEqual([0, 1]);
    portalContainer.remove();
  });

  it("clears the first StrictMode runtime when the second physical-ingress setup self-releases", () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const runtimeFactory = freshEmptySyntheticHostRuntimeFactoryV1();
    const contexts: NarrativeSurfaceHostPhysicalIngressContextInternalV1[] = [];
    const detachInternalV1 = vi.fn();
    let cleanupRegistration = () => {};
    cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      physicalIngressRegistrationInputV1({
        session: harness.session,
        portalContainer,
        inputRouter: harness.inputRouter,
        attachInternalV1: (context) => {
          contexts.push(context);
          if (contexts.length === 2) cleanupRegistration();
          return detachInternalV1;
        },
      }),
    );

    const view = render(
      <StrictMode>
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />
      </StrictMode>,
    );

    expect(contexts).toHaveLength(2);
    expect(contexts.every((context) => !context.isCurrentInternalV1())).toBe(true);
    expect(detachInternalV1).toHaveBeenCalledTimes(2);
    expect(runtimeFactory.created()).toBe(2);
    expect(runtimeFactory.released()).toBe(2);
    const observedDuringProbe = runtimeFactory.observed();
    view.rerender(
      <StrictMode>
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={() => false}
        />
      </StrictMode>,
    );
    expect(runtimeFactory.observed()).toBe(observedDuringProbe);
    expect(portalContainer).toBeEmptyDOMElement();
    view.unmount();
    expect(detachInternalV1).toHaveBeenCalledTimes(2);
    cleanupRegistration();
    portalContainer.remove();
  });

  it("does not reinterpret a distinct Host in release grace as physical-ingress reattach", async () => {
    const harness = hostHarnessV1(() => null);
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const contexts: NarrativeSurfaceHostPhysicalIngressContextInternalV1[] = [];
    const detachInternalV1 = vi.fn();
    const attachInternalV1 = vi.fn(
      (context: NarrativeSurfaceHostPhysicalIngressContextInternalV1) => {
        contexts.push(context);
        return detachInternalV1;
      },
    );
    const cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
      physicalIngressRegistrationInputV1({
        session: harness.session,
        portalContainer,
        inputRouter: harness.inputRouter,
        attachInternalV1,
      }),
    );
    const firstView = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    expect(contexts[0]!.isCurrentInternalV1()).toBe(true);
    firstView.unmount();
    expect(contexts[0]!.isCurrentInternalV1()).toBe(false);
    expect(detachInternalV1).toHaveBeenCalledOnce();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      render(
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />,
      )
    ).toThrowError("ui.narrative_stable_host_lease_conflict");
    expect(attachInternalV1).toHaveBeenCalledOnce();

    await flushHostMicrotasksV1();
    expect(() =>
      render(
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />,
      )
    ).toThrowError("ui.narrative_stable_host_attachment_invalid");
    expect(attachInternalV1).toHaveBeenCalledOnce();

    consoleError.mockRestore();
    cleanupRegistration();
    portalContainer.remove();
  });

  it(
    "keeps exact-tuple registry and current generation bounded through 10,000 mount changes",
    () => {
      const harness = hostHarnessV1(() => null);
      const portalContainer = document.createElement("div");
      document.body.append(portalContainer);
      const secondInputRouter = createInputRouterV1();
      const runtimeFactory = freshEmptySyntheticHostRuntimeFactoryV1();
      let attachCount = 0;
      let detachCount = 0;
      let firstContext: NarrativeSurfaceHostPhysicalIngressContextInternalV1 | null = null;
      let currentContext: NarrativeSurfaceHostPhysicalIngressContextInternalV1 | null = null;
      const attachInternalV1 = (
        context: NarrativeSurfaceHostPhysicalIngressContextInternalV1,
      ): () => void => {
        attachCount += 1;
        firstContext ??= context;
        currentContext = context;
        return (() => {
          detachCount += 1;
        });
      };
      const retainedRegistrationTuples: Array<
        readonly [portalContainer: HTMLDivElement, inputRouter: typeof harness.inputRouter]
      > = [];
      for (let index = 0; index < 10_000; index += 1) {
        const churnPortalContainer = document.createElement("div");
        const churnInputRouter = createInputRouterV1();
        retainedRegistrationTuples.push([churnPortalContainer, churnInputRouter]);
        const cleanupRegistration = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
          physicalIngressRegistrationInputV1({
            session: harness.session,
            portalContainer: churnPortalContainer,
            inputRouter: churnInputRouter,
            attachInternalV1,
          }),
        );
        cleanupRegistration();
        cleanupRegistration();
      }
      expect(retainedRegistrationTuples).toHaveLength(10_000);
      expect(attachCount).toBe(0);
      const firstRegistrationCleanup = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
        physicalIngressRegistrationInputV1({
          session: harness.session,
          portalContainer,
          inputRouter: harness.inputRouter,
          attachInternalV1,
        }),
      );
      const secondRegistrationCleanup = registerNarrativeSurfaceHostPhysicalIngressInternalV1(
        physicalIngressRegistrationInputV1({
          session: harness.session,
          portalContainer,
          inputRouter: secondInputRouter,
          attachInternalV1,
        }),
      );
      const Host = (props: Readonly<{ readonly inputRouter: typeof harness.inputRouter }>) => (
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={props.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />
      );
      const view = render(<Host inputRouter={harness.inputRouter} />);

      for (let index = 0; index < 10_000; index += 1) {
        view.rerender(
          <Host inputRouter={index % 2 === 0 ? secondInputRouter : harness.inputRouter} />,
        );
      }

      expect(attachCount).toBe(10_001);
      expect(detachCount).toBe(10_000);
      expect(runtimeFactory.created()).toBe(10_001);
      expect(runtimeFactory.released()).toBe(10_000);
      expect(firstContext!.isCurrentInternalV1()).toBe(false);
      expect(currentContext!.isCurrentInternalV1()).toBe(true);

      view.unmount();
      expect(detachCount).toBe(10_001);
      expect(runtimeFactory.released()).toBe(10_001);
      expect(currentContext!.isCurrentInternalV1()).toBe(false);
      firstRegistrationCleanup();
      secondRegistrationCleanup();
      portalContainer.remove();
    },
    30_000,
  );

  it("keeps a focusable outer scope around the hidden render shell, then activates both in place", async () => {
    const readyMint = vi.spyOn(
      narrativeFamilyModuleV1,
      "prepareNarrativeStableHostReadyCommitInternalV1",
    );
    const rendererProps: NarrativeStableRendererPropsInternalV1[] = [];
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) => {
      rendererProps.push(props);
      return <button type="button" data-testid="narrative-host-renderer">Dialogue</button>;
    };
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
      code: "surface.stable_publication_applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={() => true}
      />,
    );

    const renderer = portalContainer.querySelector<HTMLElement>(
      '[data-testid="narrative-host-renderer"]',
    );
    expect(renderer).not.toBeNull();
    expect(view.container).not.toContainElement(renderer);
    const renderShell = narrativeRenderShellV1(renderer);
    const focusScope = narrativeFocusScopeV1(renderer);
    expect(renderer?.parentElement).toBe(renderShell);
    expect(renderShell).toHaveAttribute("data-narrative-surface-render-shell", "dialogue");
    expect(renderShell.parentElement).toBe(focusScope);
    expect(renderShell).toHaveAttribute("inert");
    expect(renderShell).toHaveAttribute("aria-hidden", "true");
    expect(renderShell).not.toHaveAttribute("hidden");
    expect(renderShell).toHaveStyle({ visibility: "hidden", pointerEvents: "none" });
    expect(renderShell.style.display).not.toBe("none");
    expect(focusScope).toHaveAttribute("data-narrative-surface-focus-scope", "dialogue");
    expect(focusScope).toHaveAttribute("tabindex", "-1");
    expect(focusScope).not.toHaveAttribute("inert");
    expect(focusScope).not.toHaveAttribute("aria-hidden");
    expect(focusScope).not.toHaveAttribute("hidden");
    expect(focusScope.style.visibility).not.toBe("hidden");
    expect(focusScope.style.pointerEvents).not.toBe("none");
    expect(document.activeElement).toBe(focusScope);
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding.kind)
      .toBe("preparing");
    expect(readyMint).toHaveBeenCalledOnce();
    expect(readyMint).toHaveBeenCalledWith(expect.objectContaining({
      portalShell: focusScope,
      initialFocusTarget: focusScope,
    }));
    const preparingEntry = readyMint.mock.calls[0]?.[0].renderEntry;
    if (preparingEntry?.kind !== "dialogue") throw new Error("expected preparing Dialogue entry");

    await flushHostMicrotasksV1();

    expect(portalContainer.querySelector('[data-testid="narrative-host-renderer"]')).toBe(
      renderer,
    );
    expect(renderer?.parentElement).toBe(renderShell);
    expect(renderShell.parentElement).toBe(focusScope);
    expect(renderShell).not.toHaveAttribute("inert");
    expect(renderShell).not.toHaveAttribute("aria-hidden");
    expect(renderShell.style.visibility).not.toBe("hidden");
    expect(renderShell.style.pointerEvents).not.toBe("none");
    expect(focusScope).not.toHaveAttribute("inert");
    expect(focusScope).not.toHaveAttribute("aria-hidden");
    expect(document.activeElement).toBe(focusScope);
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding.kind)
      .toBe("ready_instance");
    expect(rendererProps.at(-1)).toMatchObject({ kind: "dialogue" });

    expect("playerObservation" in (rendererProps.at(-1) ?? {})).toBe(false);

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it("materializes the exact passive player view through one keyed Dialogue subscription", () => {
    const currentProfile = {
      ...defaultPlayerProfileV1,
      preferences: {
        ...defaultPlayerProfileV1.preferences,
        locale: "zh-Hans",
      },
    };
    const initialView = passiveDialoguePlayerViewV1("active", currentProfile);
    const playerObservation = mutableDialoguePlayerObservationV1(initialView);
    const renderedProps: NarrativeStableRendererPropsInternalV1[] = [];
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) => {
      renderedProps.push(props);
      return <output data-testid="player-view-dialogue">Dialogue</output>;
    };
    const entry = syntheticDialogueRenderEntryV1({
      phase: "active",
      preparation: null,
      rendererComponent: Renderer,
      playerObservation: playerObservation.port,
    });
    const runtime = syntheticHostRuntimeV1(entry);
    vi.spyOn(narrativeFamilyModuleV1, "prepareNarrativeStableHostReadyCommitInternalV1")
      .mockReturnValue({ kind: "reattached" as const, completion: null });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={({}) as unknown as NarrativeStableSessionInternalV1}
        portalContainer={portalContainer}
        inputRouter={createInputRouterV1()}
        isGestureCurrent={() => true}
      />,
    );

    const renderer = portalContainer.querySelector('[data-testid="player-view-dialogue"]');
    const firstProps = renderedProps.at(-1);
    if (firstProps?.kind !== "dialogue") throw new Error("expected Dialogue props");
    const firstPlayerView = (firstProps as unknown as {
      readonly playerView: NarrativeStableDialoguePlayerSnapshotInternalV1;
    }).playerView;

    expect(firstPlayerView).toBe(initialView);
    expect(firstProps.playerProfile).toBe(currentProfile);
    expect(firstProps.textResolver("text.player-view")).toBe("text.player-view");
    expect("playerObservation" in firstProps).toBe(false);
    expect(playerObservation.started()).toBe(1);
    expect(playerObservation.active()).toBe(1);

    const rendersBeforeEqualPublication = renderedProps.length;
    act(() => playerObservation.publish(initialView));
    expect(renderedProps).toHaveLength(rendersBeforeEqualPublication);

    const suspendedView = passiveDialoguePlayerViewV1("suspended", currentProfile);
    act(() => {
      playerObservation.publish(suspendedView);
      runtime.renderSource.publish(syntheticDialogueRenderEntryV1({
        phase: "suspended",
        preparation: null,
        rendererComponent: Renderer,
        playerObservation: playerObservation.port,
      }));
    });
    const suspendedProps = renderedProps.at(-1);
    if (suspendedProps?.kind !== "dialogue") throw new Error("expected suspended Dialogue props");
    expect((suspendedProps as unknown as { readonly playerView: unknown }).playerView).toBe(
      suspendedView,
    );
    expect(portalContainer.querySelector('[data-testid="player-view-dialogue"]')).toBe(renderer);
    expect(playerObservation.started()).toBe(1);
    expect(playerObservation.active()).toBe(1);

    const resumedView = passiveDialoguePlayerViewV1("active", currentProfile);
    act(() => {
      playerObservation.publish(resumedView);
      runtime.renderSource.publish(syntheticDialogueRenderEntryV1({
        phase: "active",
        preparation: null,
        rendererComponent: Renderer,
        playerObservation: playerObservation.port,
      }));
    });
    expect((renderedProps.at(-1) as unknown as { readonly playerView: unknown }).playerView).toBe(
      resumedView,
    );
    expect(playerObservation.started()).toBe(1);

    let finalView = resumedView;
    act(() => {
      for (let index = 0; index < 10_000; index += 1) {
        finalView = passiveDialoguePlayerViewV1("active", currentProfile);
        playerObservation.publish(finalView);
      }
    });
    const finalProps = renderedProps.at(-1);
    if (finalProps?.kind !== "dialogue") throw new Error("expected final Dialogue props");
    expect((finalProps as unknown as { readonly playerView: unknown }).playerView).toBe(finalView);
    expect(finalProps.playerProfile).toBe(currentProfile);
    expect(portalContainer.querySelector('[data-testid="player-view-dialogue"]')).toBe(renderer);
    expect(playerObservation.started()).toBe(1);
    expect(playerObservation.active()).toBe(1);

    view.unmount();
    expect(runtime.release).toHaveBeenCalledOnce();
    expect(playerObservation.active()).toBe(0);
    portalContainer.remove();
  });

  it.each(["read", "subscribe"] as const)(
    "settles a pre-ready Dialogue observation %s fault exactly once, including throw null",
    async (faultKind) => {
      const preparation = ({}) as unknown as NarrativeStableRootPreparationInternalV1;
      const playerObservation = mutableDialoguePlayerObservationV1();
      if (faultKind === "read") {
        playerObservation.failReads(null);
      } else {
        playerObservation.failSubscriptions(null);
      }
      const entry = syntheticDialogueRenderEntryV1({
        phase: "preparing",
        preparation,
        rendererComponent: () => <output>unreachable</output>,
        playerObservation: playerObservation.port,
      });
      const runtime = syntheticHostRuntimeV1(entry);
      const readyMint = vi.spyOn(
        narrativeFamilyModuleV1,
        "prepareNarrativeStableHostReadyCommitInternalV1",
      );
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const portalContainer = document.createElement("div");
      document.body.append(portalContainer);

      const view = render(
        <NarrativeSurfaceHostInternalV1
          session={({}) as unknown as NarrativeStableSessionInternalV1}
          portalContainer={portalContainer}
          inputRouter={createInputRouterV1()}
          isGestureCurrent={() => true}
        />,
      );
      await flushHostMicrotasksV1();

      expect(runtime.settleFailed).toHaveBeenCalledOnce();
      expect(runtime.settleFailed).toHaveBeenCalledWith(preparation);
      expect(runtime.settleReady).not.toHaveBeenCalled();
      if (faultKind === "read") {
        expect(readyMint).not.toHaveBeenCalled();
      } else {
        expect(readyMint).toHaveBeenCalledOnce();
      }
      expect(playerObservation.active()).toBe(0);
      expect(portalContainer).toBeEmptyDOMElement();
      expect(consoleError).toHaveBeenCalled();

      view.unmount();
      expect(runtime.release).toHaveBeenCalledOnce();
      portalContainer.remove();
    },
  );

  it("rethrows an accepted-ready Dialogue observation fault to the outer diagnostics owner", async () => {
    const acceptedError = null;
    const playerObservation = mutableDialoguePlayerObservationV1(
      passiveDialoguePlayerViewV1("active"),
    );
    const entry = syntheticDialogueRenderEntryV1({
      phase: "active",
      preparation: null,
      rendererComponent: () => <output data-testid="accepted-player-view">Dialogue</output>,
      playerObservation: playerObservation.port,
    });
    const runtime = syntheticHostRuntimeV1(entry);
    vi.spyOn(narrativeFamilyModuleV1, "prepareNarrativeStableHostReadyCommitInternalV1")
      .mockReturnValue({ kind: "reattached" as const, completion: null });
    const captured: unknown[] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);

    const view = render(
      <CapturedErrorBoundaryV1 onError={(error) => captured.push(error)}>
        <NarrativeSurfaceHostInternalV1
          session={({}) as unknown as NarrativeStableSessionInternalV1}
          portalContainer={portalContainer}
          inputRouter={createInputRouterV1()}
          isGestureCurrent={() => true}
        />
      </CapturedErrorBoundaryV1>,
    );
    expect(playerObservation.active()).toBe(1);

    playerObservation.failReads(acceptedError);
    act(() => playerObservation.publish(passiveDialoguePlayerViewV1("active")));
    await flushHostMicrotasksV1();

    expect(captured).toEqual([acceptedError]);
    expect(runtime.settleFailed).not.toHaveBeenCalled();
    expect(runtime.settleReady).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    expect(playerObservation.active()).toBe(0);

    view.unmount();
    expect(runtime.release).toHaveBeenCalledOnce();
    portalContainer.remove();
  });

  it("renders History through a keyed child subscription while retaining the suspended root", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const initialRawHistory = JSON.parse(
      JSON.stringify(historyWithOneEntryV1()),
    ) as NarrativeHistoryV1;
    const historyObservation = mutableHistoryObservationV1();
    historyObservation.publish(initialRawHistory);
    let historyRenderCount = 0;
    const historyProps: NarrativeStableRendererPropsInternalV1[] = [];
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) => {
      if (props.kind === "dialogue") {
        return <button type="button" data-render-kind="dialogue">Dialogue</button>;
      }
      historyRenderCount += 1;
      historyProps.push(props);
      return <output data-render-kind="history">{props.history.entries.length}</output>;
    };
    const harness = hostHarnessV1(Renderer, historyObservation);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();

    const rootRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-render-kind="dialogue"]',
    );
    const rootShell = rootRenderer?.parentElement;
    expect(rootShell).toBeInstanceOf(HTMLDivElement);
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (committedGestureCurrent === undefined) throw new Error("expected Host gesture seam");
    act(() => openHistoryV1(harness, "history-open", committedGestureCurrent));

    const historyRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-render-kind="history"]',
    );
    const historyShell = historyRenderer?.parentElement;
    expect(historyRenderer).toHaveTextContent("1");
    expect(rootRenderer?.isConnected).toBe(true);
    expect(rootRenderer?.parentElement).toBe(rootShell);
    expect(rootShell).toHaveAttribute("inert");
    expect(rootShell).toHaveAttribute("aria-hidden", "true");
    expect(rootShell?.style.visibility).not.toBe("hidden");
    expect(rootShell?.style.display).not.toBe("none");
    expect(historyShell).toHaveAttribute("inert");
    expect(historyShell).toHaveAttribute("aria-hidden", "true");
    expect(historyShell).toHaveStyle({ visibility: "hidden", pointerEvents: "none" });

    await flushHostMicrotasksV1();

    expect(rootRenderer?.parentElement).toBe(rootShell);
    expect(rootShell).toHaveAttribute("inert");
    expect(rootShell?.style.visibility).not.toBe("hidden");
    expect(historyRenderer?.parentElement).toBe(historyShell);
    expect(historyShell).not.toHaveAttribute("inert");
    expect(historyShell).not.toHaveAttribute("aria-hidden");
    expect(historyShell?.style.visibility).not.toBe("hidden");
    expect(historyObservation.started()).toBe(1);
    expect(historyObservation.active()).toBe(1);
    const latestHistoryProps = historyProps.at(-1);
    if (latestHistoryProps?.kind !== "history") {
      throw new Error("expected rendered History props");
    }
    const admittedHistory = latestHistoryProps.history;
    expect(admittedHistory).toBe(initialRawHistory);

    const beforeEqual = historyRenderCount;
    act(() => {
      historyObservation.publish(
        JSON.parse(JSON.stringify(initialRawHistory)) as NarrativeHistoryV1,
      );
    });
    expect(historyRenderCount).toBe(beforeEqual);

    act(() => historyObservation.publish(emptyNarrativeHistoryV1));
    expect(historyRenderCount).toBeGreaterThan(beforeEqual);
    expect(historyRenderer).toHaveTextContent("0");
    expect(historyRenderer?.parentElement).toBe(historyShell);

    view.unmount();
    await flushHostMicrotasksV1();
    expect(historyObservation.active()).toBe(0);
    portalContainer.remove();
  });

  it("keeps one exact controller on the History render entry without forwarding it to renderer props", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const renderedHistoryProps: NarrativeStableRendererPropsInternalV1[] = [];
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) => {
      if (props.kind === "history") renderedHistoryProps.push(props);
      return <output data-render-kind={props.kind}>{props.kind}</output>;
    };
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();

    const runtime = createRuntime.mock.results.at(-1)?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (runtime === undefined || committedGestureCurrent === undefined) {
      throw new Error("expected current Host runtime");
    }
    act(() => openHistoryV1(harness, "controller-entry", committedGestureCurrent));

    const preparingEntry = runtime.renderSource.getSnapshotInternalV1().entries.find((entry) =>
      entry.kind === "history"
    );
    if (preparingEntry?.kind !== "history") throw new Error("expected preparing History entry");

    const controller = preparingEntry.controller;

    await flushHostMicrotasksV1();

    const activeEntry = runtime.renderSource.getSnapshotInternalV1().entries.find((entry) =>
      entry.kind === "history"
    );
    if (activeEntry?.kind !== "history") throw new Error("expected active History entry");
    expect(activeEntry.phase).toBe("active");
    expect(activeEntry.controller).toBe(controller);
    view.rerender(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={() => true}
      />,
    );
    await flushHostMicrotasksV1();
    expect(createRuntime).toHaveBeenCalledOnce();
    expect(currentHistoryRenderEntryV1(runtime).controller).toBe(controller);
    const latestHistoryProps = renderedHistoryProps.at(-1);
    if (latestHistoryProps?.kind !== "history") throw new Error("expected History props");

    expect("controller" in latestHistoryProps).toBe(false);

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it("keeps descendant History focus while profile churn refreshes same-key renderer props", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const readyMint = vi.spyOn(
      narrativeFamilyModuleV1,
      "prepareNarrativeStableHostReadyCommitInternalV1",
    );
    const renderedHistoryProps: NarrativeStableRendererPropsInternalV1[] = [];
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) => {
      if (props.kind === "dialogue") {
        return <button type="button" data-testid="profile-focus-opener">Open</button>;
      }
      renderedHistoryProps.push(props);
      return (
        <button
          type="button"
          data-testid="profile-focus-history"
          data-profile-locale={props.playerProfile.preferences.locale ?? "default"}
        >
          History
        </button>
      );
    };
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();

    const runtime = createRuntime.mock.results.at(-1)?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (runtime === undefined || committedGestureCurrent === undefined) {
      throw new Error("expected current Host runtime");
    }
    act(() => openHistoryV1(harness, "profile-focus", committedGestureCurrent));
    await flushHostMicrotasksV1();

    const focusedControl = portalContainer.querySelector<HTMLButtonElement>(
      '[data-testid="profile-focus-history"]',
    );
    if (focusedControl === null) throw new Error("expected History focus control");
    expect(focusedControl).toHaveAttribute("data-profile-locale", "default");
    focusedControl.focus();
    expect(document.activeElement).toBe(focusedControl);
    const entryBeforeProfile = currentHistoryRenderEntryV1(runtime);
    const propsBeforeProfile = entryBeforeProfile.rendererProps;
    const controllerBeforeProfile = entryBeforeProfile.controller;
    const observationBeforeProfile = entryBeforeProfile.historyObservation;
    const readyMintsBeforeProfile = readyMint.mock.calls.length;
    const stateNotificationsBeforeProfile = harness.stateNotificationCount();
    const tickRequestsBeforeProfile = harness.tickRequestCount();
    const renderedPropsBeforeProfile = renderedHistoryProps.length;
    const nextProfile = {
      ...defaultPlayerProfileV1,
      preferences: {
        ...defaultPlayerProfileV1.preferences,
        locale: "ja",
      },
    };

    act(() => harness.publishPlayerProfile(nextProfile));

    const entryAfterProfile = currentHistoryRenderEntryV1(runtime);
    const latestHistoryProps = renderedHistoryProps.at(-1);
    if (latestHistoryProps?.kind !== "history") {
      throw new Error("expected refreshed History props");
    }
    expect(entryAfterProfile).not.toBe(entryBeforeProfile);
    expect(entryAfterProfile.renderKey).toBe(entryBeforeProfile.renderKey);
    expect(entryAfterProfile.rendererProps).not.toBe(propsBeforeProfile);
    expect(entryAfterProfile.rendererProps.playerProfile).toBe(nextProfile);
    expect(entryAfterProfile.controller).toBe(controllerBeforeProfile);
    expect(entryAfterProfile.historyObservation).toBe(observationBeforeProfile);
    expect(renderedHistoryProps.length).toBeGreaterThan(renderedPropsBeforeProfile);
    expect(latestHistoryProps.playerProfile).toBe(nextProfile);
    expect(focusedControl).toHaveAttribute("data-profile-locale", "ja");
    expect(portalContainer.querySelector('[data-testid="profile-focus-history"]')).toBe(
      focusedControl,
    );
    expect(document.activeElement).toBe(focusedControl);
    expect(readyMint).toHaveBeenCalledTimes(readyMintsBeforeProfile);
    expect(createRuntime).toHaveBeenCalledOnce();
    expect(harness.stateNotificationCount()).toBe(stateNotificationsBeforeProfile);
    expect(harness.tickRequestCount()).toBe(tickRequestsBeforeProfile);

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it.each(
    [
      ["toggle", playerInputActionIdsV1.toggleHistory],
      ["cancel", systemInputActionIdsV1.cancel],
    ] as const,
  )(
    "routes preparing History %s through one blocking fallback before the retained root",
    async (_label, actionId) => {
      const createRuntime = vi.spyOn(
        narrativeFamilyModuleV1,
        "createNarrativeStableHostRuntimeInternalV1",
      );
      const Renderer = (props: NarrativeStableRendererPropsInternalV1) => (
        <output data-render-kind={`fallback-${props.kind}`}>{props.kind}</output>
      );
      const harness = hostHarnessV1(Renderer);
      const lowerInput = vi.fn(() => inputHandledV1);
      harness.inputRouter.register({ context: "gameplay", handle: lowerInput });
      expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
        kind: "applied",
      });
      const portalContainer = document.createElement("div");
      document.body.append(portalContainer);
      const view = render(
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />,
      );
      await flushHostMicrotasksV1();
      const runtime = createRuntime.mock.results.at(-1)?.value as
        | NarrativeStableHostRuntimeInternalV1
        | undefined;
      const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
      if (runtime === undefined || committedGestureCurrent === undefined) {
        throw new Error("expected current Host runtime");
      }

      act(() => openHistoryV1(harness, `fallback-${_label}`, committedGestureCurrent));
      expect(currentHistoryRenderEntryV1(runtime).phase).toBe("preparing");
      expect(portalContainer.querySelector('[data-render-kind="fallback-history"]')).not.toBeNull();

      let routed: ReturnType<typeof routeActionV1> | undefined;
      act(() => {
        routed = routeActionV1(harness, actionId);
      });

      expect(routed).toEqual({ kind: "handled", context: "narrative" });
      expect(lowerInput).not.toHaveBeenCalled();
      expect(runtime.renderSource.getSnapshotInternalV1().entries).toHaveLength(1);
      expect(runtime.renderSource.getSnapshotInternalV1().entries[0]).toMatchObject({
        kind: "dialogue",
        phase: "active",
      });
      expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toHaveLength(1);
      expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding).toMatchObject({
        kind: "ready_instance",
        instance: { phase: "active" },
      });

      lowerInput.mockClear();
      const viewportAfterClose = {
        kind: "viewport_point" as const,
        phase: "begin" as const,
        point: { x: 4, y: 9 },
        pointerId: parseNonNegativeSafeInteger(1),
        pointerType: "mouse" as const,
      };
      expect(harness.inputRouter.route(viewportAfterClose)).toEqual({
        kind: "handled",
        context: "gameplay",
      });
      expect(lowerInput).toHaveBeenCalledOnce();

      view.unmount();
      await flushHostMicrotasksV1();
      portalContainer.remove();
    },
  );

  it.each(
    [
      ["toggle", playerInputActionIdsV1.toggleHistory],
      ["cancel", systemInputActionIdsV1.cancel],
    ] as const,
  )(
    "withdraws the preparing fallback before raw active History %s can bypass authenticated admission",
    async (_label, actionId) => {
      const createRuntime = vi.spyOn(
        narrativeFamilyModuleV1,
        "createNarrativeStableHostRuntimeInternalV1",
      );
      const Renderer = (props: NarrativeStableRendererPropsInternalV1) => (
        <output data-render-kind={`active-${props.kind}`}>{props.kind}</output>
      );
      const harness = hostHarnessV1(Renderer);
      const lowerInput = vi.fn(() => inputHandledV1);
      harness.inputRouter.register({ context: "gameplay", handle: lowerInput });
      expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
        kind: "applied",
      });
      const portalContainer = document.createElement("div");
      document.body.append(portalContainer);
      const view = render(
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />,
      );
      await flushHostMicrotasksV1();
      const runtime = createRuntime.mock.results.at(-1)?.value as
        | NarrativeStableHostRuntimeInternalV1
        | undefined;
      const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
      if (runtime === undefined || committedGestureCurrent === undefined) {
        throw new Error("expected current Host runtime");
      }
      act(() => openHistoryV1(harness, `active-${_label}`, committedGestureCurrent));
      await flushHostMicrotasksV1();
      expect(currentHistoryRenderEntryV1(runtime).phase).toBe("active");
      const notificationsBeforeClose = harness.stateNotificationCount();

      let routed: ReturnType<typeof routeActionV1> | undefined;
      act(() => {
        routed = routeActionV1(harness, actionId);
      });

      expect(routed).toEqual({ kind: "handled", context: "gameplay" });
      expect(lowerInput).toHaveBeenCalledOnce();
      expect(currentHistoryRenderEntryV1(runtime).phase).toBe("active");
      expect(runtime.renderSource.getSnapshotInternalV1().entries).toHaveLength(2);
      expect(harness.stateNotificationCount()).toBe(notificationsBeforeClose);

      view.unmount();
      await flushHostMicrotasksV1();
      portalContainer.remove();
    },
  );

  it("captures the eligible previous owner before initial focus, traps root Tab, and restores on initial failure", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const Renderer = () => (
      <div data-testid="root-focus-content">
        <button type="button" data-testid="root-focus-first">First</button>
        <button type="button" data-testid="root-focus-last">Last</button>
      </div>
    );
    const previousOwner = document.createElement("button");
    previousOwner.type = "button";
    previousOwner.textContent = "Previous owner";
    document.body.append(previousOwner);
    previousOwner.focus();
    expect(document.activeElement).toBe(previousOwner);
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    const runtime = createRuntime.mock.results.at(-1)?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    if (runtime === undefined) throw new Error("expected current Host runtime");
    const rootContent = portalContainer.querySelector<HTMLElement>(
      '[data-testid="root-focus-content"]',
    );
    const rootFocusScope = narrativeFocusScopeV1(rootContent);
    expect(document.activeElement).toBe(rootFocusScope);

    fireEvent.keyDown(rootFocusScope, { key: "Tab" });
    expect(document.activeElement).toBe(rootFocusScope);
    fireEvent.keyDown(rootFocusScope, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(rootFocusScope);

    const rootEntry = runtime.renderSource.getSnapshotInternalV1().entries.find((entry) =>
      entry.kind === "dialogue" && entry.phase === "preparing"
    );
    if (rootEntry?.kind !== "dialogue" || rootEntry.preparation === null) {
      throw new Error("expected preparing root entry");
    }
    act(() => {
      expect(runtime.attachment.settleRootReadinessFailedInternalV1(rootEntry.preparation!))
        .toEqual({ kind: "settled", completion: null });
    });
    await flushHostMicrotasksV1();

    expect(portalContainer).toBeEmptyDOMElement();
    expect(document.activeElement).toBe(previousOwner);

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
    previousOwner.remove();
  });

  it("keeps a no-tabbable root trapped while yielding focus to an independent application sibling", async () => {
    const Renderer = () => <output data-testid="root-focus-empty">Dialogue</output>;
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();
    const rootContent = portalContainer.querySelector<HTMLElement>(
      '[data-testid="root-focus-empty"]',
    );
    const rootFocusScope = narrativeFocusScopeV1(rootContent);
    expect(document.activeElement).toBe(rootFocusScope);

    fireEvent.keyDown(rootFocusScope, { key: "Tab" });
    expect(document.activeElement).toBe(rootFocusScope);
    fireEvent.keyDown(rootFocusScope, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(rootFocusScope);

    const authoringOwner = document.createElement("div");
    authoringOwner.dataset.applicationFocusOwner = "authoring";
    const authoringInput = document.createElement("input");
    authoringOwner.append(authoringInput);
    document.body.append(authoringOwner);
    authoringInput.focus();
    fireEvent.focusIn(authoringInput);
    await flushHostMicrotasksV1();
    expect(document.activeElement).toBe(authoringInput);

    const escapedFocus = document.createElement("button");
    escapedFocus.type = "button";
    escapedFocus.textContent = "Escaped focus";
    document.body.append(escapedFocus);
    escapedFocus.focus();
    fireEvent.focusIn(escapedFocus);
    await flushHostMicrotasksV1();
    expect(document.activeElement).toBe(rootFocusScope);

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
    authoringOwner.remove();
    escapedFocus.remove();
  });

  it("captures the Host-local History opener before fallback focus and restores it only after topology commit", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) =>
      props.kind === "dialogue"
        ? <button type="button" data-testid="history-opener">Open History</button>
        : (
          <div data-testid="history-focus-content">
            <button type="button" data-testid="history-focus-first">First</button>
            <button type="button" data-testid="history-focus-last">Last</button>
            <button type="button" style={{ display: "none" }}>Responsive hidden</button>
          </div>
        );
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();
    const runtime = createRuntime.mock.results.at(-1)?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (runtime === undefined || committedGestureCurrent === undefined) {
      throw new Error("expected current Host runtime");
    }
    const opener = portalContainer.querySelector<HTMLElement>('[data-testid="history-opener"]');
    if (opener === null) throw new Error("expected Dialogue opener");
    expect(narrativeFocusScopeV1(opener)).toHaveAttribute(
      "data-narrative-surface-focus-scope",
      "dialogue",
    );
    opener.focus();

    act(() => openHistoryV1(harness, "focus-opener", committedGestureCurrent));
    const historyContent = portalContainer.querySelector<HTMLElement>(
      '[data-testid="history-focus-content"]',
    );
    const historyFocusScope = narrativeFocusScopeV1(historyContent);
    expect(currentHistoryRenderEntryV1(runtime).phase).toBe("preparing");
    expect(document.activeElement).toBe(historyFocusScope);

    await flushHostMicrotasksV1();
    expect(currentHistoryRenderEntryV1(runtime).phase).toBe("active");
    expect(document.activeElement).toBe(historyFocusScope);
    const first = portalContainer.querySelector<HTMLElement>('[data-testid="history-focus-first"]');
    const last = portalContainer.querySelector<HTMLElement>('[data-testid="history-focus-last"]');
    if (first === null || last === null) throw new Error("expected History focus controls");
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    historyFocusScope.focus();

    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const focusCallsBeforeClose = focus.mock.calls.length;
    let focusCallsAtTopologyCommit: number | null = null;
    let bindingAtTopologyCommit: unknown = null;
    const unsubscribe = harness.kernel.subscribeStateInternalV1(() => {
      if (harness.kernel.getStateInternalV1().stableRuntimeBindings.length !== 1) return;
      const onlyBinding = harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding;
      if (onlyBinding?.kind !== "ready_instance" || onlyBinding.instance.phase !== "active") return;
      focusCallsAtTopologyCommit = focus.mock.calls.length;
      bindingAtTopologyCommit = onlyBinding;
    });

    let closeResult:
      | ReturnType<HistoryRenderEntryV1["controller"]["dismissInternalV1"]>
      | undefined;
    act(() => {
      closeResult = currentHistoryRenderEntryV1(runtime).controller.dismissInternalV1(
        "routed_cancel",
      );
    });
    unsubscribe();

    expect(closeResult).toEqual({ kind: "dismissed", completion: null });
    expect(bindingAtTopologyCommit).toMatchObject({
      kind: "ready_instance",
      instance: { phase: "active" },
    });
    expect(focusCallsAtTopologyCommit).toBe(focusCallsBeforeClose);
    await flushHostMicrotasksV1();
    expect(document.activeElement).toBe(opener);

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it.each(["disconnected_opener", "external_owner"] as const)(
    "revalidates History restore against %s instead of forcing stale focus",
    async (mode) => {
      const createRuntime = vi.spyOn(
        narrativeFamilyModuleV1,
        "createNarrativeStableHostRuntimeInternalV1",
      );
      const Renderer = (props: NarrativeStableRendererPropsInternalV1) =>
        props.kind === "dialogue"
          ? <button type="button" data-testid={`restore-opener-${mode}`}>Dialogue</button>
          : <output data-testid={`restore-history-${mode}`}>History</output>;
      const harness = hostHarnessV1(Renderer);
      expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
        kind: "applied",
      });
      const portalContainer = document.createElement("div");
      document.body.append(portalContainer);
      const view = render(
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />,
      );
      await flushHostMicrotasksV1();
      const runtime = createRuntime.mock.results.at(-1)?.value as
        | NarrativeStableHostRuntimeInternalV1
        | undefined;
      const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
      if (runtime === undefined || committedGestureCurrent === undefined) {
        throw new Error("expected current Host runtime");
      }
      const opener = portalContainer.querySelector<HTMLElement>(
        `[data-testid="restore-opener-${mode}"]`,
      );
      if (opener === null) throw new Error("expected restore opener");
      const rootFocusScope = narrativeFocusScopeV1(opener);
      opener.focus();
      act(() => openHistoryV1(harness, `restore-${mode}`, committedGestureCurrent));
      await flushHostMicrotasksV1();
      expect(currentHistoryRenderEntryV1(runtime).phase).toBe("active");

      let expectedFocus: HTMLElement;
      let externalFocusReentered = false;
      let stopExternalFocusReentry = (): void => {};
      if (mode === "disconnected_opener") {
        opener.remove();
        expectedFocus = rootFocusScope;
      } else {
        const externalOwner = document.createElement("button");
        externalOwner.type = "button";
        externalOwner.textContent = "Higher external focus owner";
        document.body.append(externalOwner);
        expectedFocus = externalOwner;
        stopExternalFocusReentry = harness.kernel.subscribeStateInternalV1(() => {
          const bindings = harness.kernel.getStateInternalV1().stableRuntimeBindings;
          if (
            externalFocusReentered || bindings.length !== 1 ||
            bindings[0]?.binding.kind !== "ready_instance" ||
            bindings[0].binding.instance.phase !== "active"
          ) return;
          externalFocusReentered = true;
          externalOwner.focus();
        });
      }
      act(() => {
        const controller = currentHistoryRenderEntryV1(runtime).controller;
        expect(
          mode === "disconnected_opener"
            ? controller.closeInternalV1()
            : controller.dismissInternalV1("routed_cancel"),
        ).toEqual({
          kind: mode === "disconnected_opener" ? "closed" : "dismissed",
          completion: null,
        });
      });
      stopExternalFocusReentry();
      await flushHostMicrotasksV1();

      expect(runtime.renderSource.getSnapshotInternalV1().entries).toHaveLength(1);
      if (mode === "external_owner") expect(externalFocusReentered).toBe(true);
      expect(document.activeElement).toBe(expectedFocus);

      view.unmount();
      await flushHostMicrotasksV1();
      portalContainer.remove();
      if (expectedFocus !== rootFocusScope) expectedFocus.remove();
    },
  );

  it("contains History focus faults without rolling back committed topology", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) =>
      props.kind === "dialogue"
        ? <button type="button" data-testid="focus-fault-root">Dialogue</button>
        : <output data-testid="focus-fault-history">History</output>;
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();
    const runtime = createRuntime.mock.results.at(-1)?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (runtime === undefined || committedGestureCurrent === undefined) {
      throw new Error("expected current Host runtime");
    }
    const nativeFocus = HTMLElement.prototype.focus;
    let containedHistoryFocusFaults = 0;
    vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (
      this: HTMLElement,
      options?: FocusOptions,
    ) {
      if (this.querySelector('[data-testid="focus-fault-history"]') !== null) {
        containedHistoryFocusFaults += 1;
        throw new Error("synthetic History focus fault");
      }
      nativeFocus.call(this, options);
    });

    act(() => openHistoryV1(harness, "focus-fault", committedGestureCurrent));
    await flushHostMicrotasksV1();

    expect(containedHistoryFocusFaults).toBeGreaterThan(0);
    expect(currentHistoryRenderEntryV1(runtime).phase).toBe("active");
    expect(runtime.renderSource.getSnapshotInternalV1().entries).toHaveLength(2);

    act(() => {
      expect(currentHistoryRenderEntryV1(runtime).controller.dismissInternalV1("routed_cancel"))
        .toEqual({
          kind: "dismissed",
          completion: null,
        });
    });
    expect(runtime.renderSource.getSnapshotInternalV1().entries).toHaveLength(1);

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it("dismisses only exact primary backdrop gestures, fences the residual click, and keeps Escape fence-free", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) =>
      props.kind === "dialogue"
        ? <button type="button" data-testid="gesture-root">Dialogue</button>
        : (
          <button
            type="button"
            data-testid="gesture-history-content"
            data-devdock-escape-owner="true"
          >
            History
          </button>
        );
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const lowerAction = vi.fn();
    const view = render(
      <StagedNarrativeHostV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
        onLowerAction={lowerAction}
      />,
    );
    await flushHostMicrotasksV1();
    const runtime = createRuntime.mock.results.at(-1)?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (runtime === undefined || committedGestureCurrent === undefined) {
      throw new Error("expected current Host runtime");
    }
    const dialogueFocusScope = narrativeFocusScopeV1(
      portalContainer.querySelector<HTMLElement>('[data-testid="gesture-root"]'),
    );
    const dialogueEscape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    const observeDialogueEscape = vi.fn();
    portalContainer.addEventListener("keydown", observeDialogueEscape);
    dialogueFocusScope.dispatchEvent(dialogueEscape);
    expect(dialogueEscape.defaultPrevented).toBe(false);
    expect(observeDialogueEscape).toHaveBeenCalledOnce();
    portalContainer.removeEventListener("keydown", observeDialogueEscape);

    act(() => openHistoryV1(harness, "pointer-dismiss", committedGestureCurrent));
    await flushHostMicrotasksV1();
    let historyContent = portalContainer.querySelector<HTMLElement>(
      '[data-testid="gesture-history-content"]',
    );
    if (historyContent === null) throw new Error("expected active History gesture content");
    let historyFocusScope = narrativeFocusScopeV1(historyContent);
    const backdropScope = historyFocusScope;

    fireEvent.keyDown(historyContent, { key: "Escape" });
    expect(currentHistoryRenderEntryV1(runtime).phase).toBe("active");

    fireEvent.pointerDown(backdropScope, { button: 0, isPrimary: true, pointerId: 11 });
    fireEvent.pointerUp(backdropScope, { button: 0, isPrimary: true, pointerId: 12 });
    expect(currentHistoryRenderEntryV1(runtime).phase).toBe("active");

    fireEvent.pointerDown(historyContent, { button: 0, isPrimary: true, pointerId: 13 });
    fireEvent.pointerUp(historyContent, { button: 0, isPrimary: true, pointerId: 13 });
    expect(currentHistoryRenderEntryV1(runtime).phase).toBe("active");

    act(() => {
      fireEvent.pointerDown(backdropScope, { button: 0, isPrimary: true, pointerId: 14 });
      fireEvent.pointerUp(backdropScope, { button: 0, isPrimary: true, pointerId: 14 });
    });
    expect(runtime.renderSource.getSnapshotInternalV1().entries).toHaveLength(1);

    const lowerControl = screen.getByTestId("narrative-lower-action");
    const residualPointerClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      detail: 1,
    });
    lowerControl.dispatchEvent(residualPointerClick);
    expect(residualPointerClick.defaultPrevented).toBe(true);
    expect(lowerAction).not.toHaveBeenCalled();

    act(() => openHistoryV1(harness, "escape-dismiss", committedGestureCurrent));
    await flushHostMicrotasksV1();
    historyContent = portalContainer.querySelector<HTMLElement>(
      '[data-testid="gesture-history-content"]',
    );
    historyFocusScope = narrativeFocusScopeV1(historyContent);
    act(() => {
      fireEvent.keyDown(historyFocusScope, { key: "Escape" });
    });
    expect(runtime.renderSource.getSnapshotInternalV1().entries).toHaveLength(1);

    const postEscapePointerClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      detail: 1,
    });
    lowerControl.dispatchEvent(postEscapePointerClick);
    expect(postEscapePointerClick.defaultPrevented).toBe(false);
    expect(lowerAction).toHaveBeenCalledOnce();

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it("shares the stage for stageInput-shared pendings while History and isolated entries re-isolate", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) =>
      props.kind === "dialogue"
        ? <button type="button" data-testid="shared-stage-root">Dialogue</button>
        : <button type="button" data-testid="shared-stage-history">History</button>;

    // Shared mount: the host must not register narrative stage isolation.
    const sharedHarness = hostHarnessV1(Renderer);
    expect(
      sharedHarness.bridge.reconcilePendingInternalV1({
        ...pendingSayV1(),
        stageInput: "shared" as const,
      }),
    ).toMatchObject({ kind: "applied" });
    const sharedPortal = document.createElement("div");
    document.body.append(sharedPortal);
    const sharedView = render(
      <StagedNarrativeHostV1
        session={sharedHarness.session}
        portalContainer={sharedPortal}
        inputRouter={sharedHarness.inputRouter}
        isGestureCurrent={sharedHarness.isGestureCurrent}
        onLowerAction={vi.fn()}
      />,
    );
    await flushHostMicrotasksV1();
    const runtime = createRuntime.mock.results.at(-1)?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (runtime === undefined || committedGestureCurrent === undefined) {
      throw new Error("expected current Host runtime");
    }
    const gameplayLayer = screen.getByTestId("stage-scene-interaction");
    expect(gameplayLayer).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-narrative")).not.toHaveAttribute("inert");

    // A shared owner neither traps Tab nor recaptures roaming focus: the
    // stage is a declared input surface.
    const sharedRootScope = narrativeFocusScopeV1(screen.getByTestId("shared-stage-root"));
    expect(fireEvent.keyDown(sharedRootScope, { key: "Tab" })).toBe(true);
    const lowerControl = screen.getByTestId("narrative-lower-action");
    lowerControl.focus();
    await flushHostMicrotasksV1();
    expect(document.activeElement).toBe(lowerControl);

    // History stays exclusive over a shared root: isolation and the focus
    // machinery return in full while it is open, then release on dismiss.
    act(() => openHistoryV1(sharedHarness, "shared-stage", committedGestureCurrent));
    await flushHostMicrotasksV1();
    expect(gameplayLayer).toHaveAttribute("inert");
    const historyScope = narrativeFocusScopeV1(screen.getByTestId("shared-stage-history"));
    expect(document.activeElement).toBe(historyScope);
    expect(fireEvent.keyDown(historyScope, { key: "Tab" })).toBe(false);
    lowerControl.focus();
    await flushHostMicrotasksV1();
    expect(document.activeElement).toBe(historyScope);
    act(() => {
      expect(currentHistoryRenderEntryV1(runtime).controller.dismissInternalV1("routed_cancel"))
        .toEqual({ kind: "dismissed", completion: null });
    });
    await flushHostMicrotasksV1();
    expect(gameplayLayer).not.toHaveAttribute("inert");
    sharedView.unmount();
    await flushHostMicrotasksV1();
    sharedPortal.remove();

    // Isolated mount: an undeclared pending keeps today's exclusive
    // behavior — stage inert, Tab trapped, roaming focus recaptured.
    const isolatedHarness = hostHarnessV1(Renderer);
    expect(isolatedHarness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const isolatedPortal = document.createElement("div");
    document.body.append(isolatedPortal);
    const isolatedView = render(
      <StagedNarrativeHostV1
        session={isolatedHarness.session}
        portalContainer={isolatedPortal}
        inputRouter={isolatedHarness.inputRouter}
        isGestureCurrent={isolatedHarness.isGestureCurrent}
        onLowerAction={vi.fn()}
      />,
    );
    await flushHostMicrotasksV1();
    const isolatedGameplayLayer = screen.getByTestId("stage-scene-interaction");
    expect(isolatedGameplayLayer).toHaveAttribute("inert");
    const isolatedRootScope = narrativeFocusScopeV1(screen.getByTestId("shared-stage-root"));
    expect(fireEvent.keyDown(isolatedRootScope, { key: "Tab" })).toBe(false);
    const isolatedLowerControl = screen.getByTestId("narrative-lower-action");
    isolatedLowerControl.focus();
    await flushHostMicrotasksV1();
    expect(document.activeElement).toBe(isolatedRootScope);
    isolatedView.unmount();
    await flushHostMicrotasksV1();
    isolatedPortal.remove();
  });

  it("renders max-three phases, retains exact root and History on failure, then cuts over atomically", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) =>
      props.kind === "history"
        ? <output data-render-kind="max-three-history">History</output>
        : (
          <button
            type="button"
            data-render-kind="max-three-dialogue"
            data-occurrence-id={props.pending.occurrenceId}
            data-player-phase={(props as unknown as {
              readonly playerView: NarrativeStableDialoguePlayerSnapshotInternalV1;
            }).playerView?.phase}
          >
            Dialogue
          </button>
        );
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1(1))).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();
    const runtime = createRuntime.mock.results.at(-1)?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    if (runtime === undefined) throw new Error("expected Host runtime");
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (committedGestureCurrent === undefined) throw new Error("expected Host gesture seam");
    const rootRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-occurrence-id="interaction-occurrence.1"]',
    );
    if (rootRenderer === null) throw new Error("expected retained root renderer");
    expect(rootRenderer).toHaveAttribute("data-player-phase", "active");
    expect(harness.tickRequestCount()).toBe(1);
    rootRenderer.focus();

    act(() => openHistoryV1(harness, "max-three-open", committedGestureCurrent));
    await flushHostMicrotasksV1();
    const historyRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-render-kind="max-three-history"]',
    );
    const rootShell = rootRenderer?.parentElement;
    const historyShell = historyRenderer?.parentElement;
    const rootFocusScope = narrativeFocusScopeV1(rootRenderer);
    const historyFocusScope = narrativeFocusScopeV1(historyRenderer);
    expect(rootShell).toHaveAttribute("inert");
    expect(rootRenderer).toHaveAttribute("data-player-phase", "suspended");
    expect(harness.tickRequestCount()).toBe(1);
    expect(historyShell).not.toHaveAttribute("inert");
    expect(rootFocusScope).toHaveAttribute("inert");
    expect(historyFocusScope).not.toHaveAttribute("inert");
    expect(document.activeElement).toBe(historyFocusScope);

    act(() => {
      expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1(2))).toMatchObject({
        kind: "applied",
      });
    });
    const failedReplacementRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-occurrence-id="interaction-occurrence.2"]',
    );
    const failedReplacementShell = failedReplacementRenderer?.parentElement;
    const failedReplacementFocusScope = narrativeFocusScopeV1(failedReplacementRenderer);
    expect(portalContainer.children).toHaveLength(3);
    expect(rootRenderer?.parentElement).toBe(rootShell);
    expect(rootShell).toHaveAttribute("inert");
    expect(rootShell).toHaveAttribute("aria-hidden", "true");
    expect(rootShell).toHaveStyle({ pointerEvents: "none" });
    expect(rootShell?.style.visibility).not.toBe("hidden");
    expect(rootShell?.style.display).not.toBe("none");
    expect(historyRenderer?.parentElement).toBe(historyShell);
    expect(historyShell).not.toHaveAttribute("inert");
    expect(historyShell).not.toHaveAttribute("aria-hidden");
    expect(historyShell?.style.pointerEvents).not.toBe("none");
    expect(historyShell?.style.visibility).not.toBe("hidden");
    expect(failedReplacementShell).toHaveAttribute("inert");
    expect(failedReplacementRenderer).toHaveAttribute("data-player-phase", "preparing");
    expect(failedReplacementShell).toHaveAttribute("aria-hidden", "true");
    expect(failedReplacementShell).toHaveStyle({
      visibility: "hidden",
      pointerEvents: "none",
    });
    expect(failedReplacementFocusScope).toHaveAttribute("inert");
    expect(failedReplacementFocusScope).toHaveAttribute("aria-hidden", "true");
    expect(failedReplacementFocusScope).toHaveStyle({ pointerEvents: "none" });
    expect(failedReplacementFocusScope.style.visibility).not.toBe("hidden");
    expect(harness.tickRequestCount()).toBe(1);

    const failedReplacement = runtime.renderSource.getSnapshotInternalV1().entries.find((entry) =>
      entry.kind === "dialogue" && entry.phase === "preparing" &&
      entry.rendererProps.pending.occurrenceId === "interaction-occurrence.2"
    );
    if (failedReplacement?.kind !== "dialogue" || failedReplacement.preparation === null) {
      throw new Error("expected preparing replacement");
    }
    act(() => {
      expect(runtime.attachment.settleRootReadinessFailedInternalV1(
        failedReplacement.preparation!,
      )).toEqual({ kind: "settled", completion: null });
    });
    await flushHostMicrotasksV1();

    expect(portalContainer.children).toHaveLength(2);
    expect(rootRenderer?.parentElement).toBe(rootShell);
    expect(rootRenderer?.isConnected).toBe(true);
    expect(rootRenderer).toHaveAttribute("data-player-phase", "suspended");
    expect(rootShell).toHaveAttribute("inert");
    expect(historyRenderer?.parentElement).toBe(historyShell);
    expect(historyRenderer?.isConnected).toBe(true);
    expect(historyShell).not.toHaveAttribute("inert");
    expect(failedReplacementRenderer?.isConnected).toBe(false);
    expect(document.activeElement).toBe(historyFocusScope);
    expect(harness.tickRequestCount()).toBe(1);

    act(() => {
      expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1(3))).toMatchObject({
        kind: "applied",
      });
    });
    const successorRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-occurrence-id="interaction-occurrence.3"]',
    );
    const successorShell = successorRenderer?.parentElement;
    const successorFocusScope = narrativeFocusScopeV1(successorRenderer);
    expect(portalContainer.children).toHaveLength(3);
    expect(successorShell).toHaveStyle({ visibility: "hidden", pointerEvents: "none" });
    expect(successorRenderer).toHaveAttribute("data-player-phase", "preparing");
    expect(harness.tickRequestCount()).toBe(1);
    expect(successorFocusScope).toHaveAttribute("inert");
    expect(successorFocusScope.style.visibility).not.toBe("hidden");

    await flushHostMicrotasksV1();

    expect(portalContainer.children).toHaveLength(1);
    expect(successorRenderer?.parentElement).toBe(successorShell);
    expect(successorRenderer?.isConnected).toBe(true);
    expect(successorRenderer).toHaveAttribute("data-player-phase", "active");
    expect(harness.tickRequestCount()).toBe(2);
    expect(successorShell).not.toHaveAttribute("inert");
    expect(successorShell).not.toHaveAttribute("aria-hidden");
    expect(successorShell?.style.visibility).not.toBe("hidden");
    expect(successorFocusScope).not.toHaveAttribute("inert");
    expect(successorFocusScope).not.toHaveAttribute("aria-hidden");
    expect(successorRenderer?.parentElement?.parentElement).toBe(successorFocusScope);
    expect(document.activeElement).toBe(successorFocusScope);
    expect(document.activeElement).not.toBe(rootRenderer);
    expect(rootRenderer?.isConnected).toBe(false);
    expect(historyRenderer?.isConnected).toBe(false);
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toHaveLength(1);
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
      .toMatchObject({ kind: "ready_instance", instance: { phase: "active" } });

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it("contains a pre-ready History observation fault and restores the exact root", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const historyObservation = mutableHistoryObservationV1();
    const Renderer = (props: NarrativeStableRendererPropsInternalV1) =>
      props.kind === "dialogue"
        ? <button type="button" data-render-kind="fault-root">Dialogue</button>
        : <output data-render-kind="fault-history">History</output>;
    const harness = hostHarnessV1(Renderer, historyObservation);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={harness.isGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();
    const rootRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-render-kind="fault-root"]',
    );
    const rootShell = rootRenderer?.parentElement;
    expect(rootShell).not.toHaveAttribute("inert");

    historyObservation.failReads(new Error("History observation failure"));
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (committedGestureCurrent === undefined) throw new Error("expected Host gesture seam");
    act(() => openHistoryV1(harness, "observation-fault", committedGestureCurrent));
    await flushHostMicrotasksV1();

    expect(rootRenderer?.parentElement).toBe(rootShell);
    expect(rootShell).not.toHaveAttribute("inert");
    expect(rootShell?.style.visibility).not.toBe("hidden");
    expect(portalContainer.querySelector('[data-render-kind="fault-history"]')).toBeNull();
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toHaveLength(1);
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
      .toMatchObject({ kind: "ready_instance", instance: { phase: "active" } });
    expect(consoleError).toHaveBeenCalled();

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it("coalesces the StrictMode setup-cleanup-setup probe into one readiness transition", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const Renderer = () => <button type="button" data-testid="strict-dialogue">Dialogue</button>;
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const notificationsBeforeHost = harness.stateNotificationCount();
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <StrictMode>
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={() => true}
        />
      </StrictMode>,
    );

    await flushHostMicrotasksV1();

    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding.kind)
      .toBe("ready_instance");
    expect(harness.stateNotificationCount()).toBe(notificationsBeforeHost + 1);
    expect(portalContainer.querySelectorAll('[data-testid="strict-dialogue"]')).toHaveLength(1);
    expect(createRuntime).toHaveBeenCalledTimes(2);
    expect(createRuntime.mock.calls[1]?.[0].hostIdentity).toBe(
      createRuntime.mock.calls[0]?.[0].hostIdentity,
    );
    expect(createRuntime.mock.calls[1]?.[0].portalContainer).toBe(portalContainer);
    const firstRuntime = createRuntime.mock.results[0]?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    const runtime = createRuntime.mock.results.at(-1)?.value as
      | NarrativeStableHostRuntimeInternalV1
      | undefined;
    const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
    if (
      firstRuntime === undefined || runtime === undefined || committedGestureCurrent === undefined
    ) {
      throw new Error("expected StrictMode Host runtime");
    }
    const firstDialogueEntry = firstRuntime.renderSource.getSnapshotInternalV1().entries.find((
      entry,
    ) => entry.kind === "dialogue");
    const currentDialogueEntry = runtime.renderSource.getSnapshotInternalV1().entries.find((
      entry,
    ) => entry.kind === "dialogue");
    if (firstDialogueEntry?.kind !== "dialogue" || currentDialogueEntry?.kind !== "dialogue") {
      throw new Error("expected StrictMode Dialogue entries");
    }
    expect(currentDialogueEntry.playerObservation).toBe(firstDialogueEntry.playerObservation);
    expect(harness.tickRequestCount()).toBe(1);
    act(() => openHistoryV1(harness, "strict-fallback", committedGestureCurrent));
    expect(currentHistoryRenderEntryV1(runtime).phase).toBe("preparing");
    const notificationsBeforeClose = harness.stateNotificationCount();
    let routed: ReturnType<typeof routeActionV1> | undefined;
    act(() => {
      routed = routeActionV1(harness, systemInputActionIdsV1.cancel);
    });
    expect(routed).toEqual({ kind: "handled", context: "narrative" });
    expect(runtime.renderSource.getSnapshotInternalV1().entries).toHaveLength(1);
    expect(harness.stateNotificationCount()).toBe(notificationsBeforeClose + 1);

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it("updates the gesture callback without rotating the logical Host generation", async () => {
    const createRuntime = vi.spyOn(
      narrativeFamilyModuleV1,
      "createNarrativeStableHostRuntimeInternalV1",
    );
    const Renderer = () => <button type="button" data-testid="gesture-dialogue">Dialogue</button>;
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const firstGestureCurrent = vi.fn(() => true);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={firstGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();
    const renderer = portalContainer.querySelector('[data-testid="gesture-dialogue"]');
    const notifications = harness.stateNotificationCount();
    expect(createRuntime).toHaveBeenCalledOnce();

    const successorGestureCurrent = vi.fn(() => true);
    view.rerender(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={successorGestureCurrent}
      />,
    );
    await flushHostMicrotasksV1();

    expect(createRuntime).toHaveBeenCalledOnce();
    expect(portalContainer.querySelector('[data-testid="gesture-dialogue"]')).toBe(renderer);
    expect(harness.stateNotificationCount()).toBe(notifications);
    expect(
      createRuntime.mock.calls[0]?.[0].isGestureCurrent(
        parseManagedSurfaceGestureIdV1("gesture.host-test.updated-callback"),
      ),
    ).toBe(true);
    expect(successorGestureCurrent).toHaveBeenCalledOnce();
    expect(firstGestureCurrent).not.toHaveBeenCalled();

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it("keeps a physically inert candidate preparing until its Stage layer is exposed", async () => {
    const Renderer = () => (
      <button type="button" data-testid="inert-ready-dialogue">Dialogue</button>
    );
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const narrativeLayer = document.createElement("div");
    narrativeLayer.setAttribute("inert", "");
    const portalContainer = document.createElement("div");
    narrativeLayer.append(portalContainer);
    document.body.append(narrativeLayer);

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={() => true}
      />,
    );
    await flushHostMicrotasksV1();

    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
      .toMatchObject({ kind: "preparing" });
    const renderShell = portalContainer.querySelector(
      '[data-narrative-surface-render-shell="dialogue"]',
    );
    expect(renderShell).toHaveAttribute("inert");
    expect(renderShell).toHaveStyle({ visibility: "hidden" });

    act(() => narrativeLayer.removeAttribute("inert"));
    await flushHostMicrotasksV1();

    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
      .toMatchObject({ kind: "ready_instance" });
    expect(renderShell).not.toHaveAttribute("inert");
    expect(renderShell).not.toHaveStyle({ visibility: "hidden" });

    view.unmount();
    await flushHostMicrotasksV1();
    narrativeLayer.remove();
  });

  it("fences readiness when the Stage layer becomes inert before its queued settlement", async () => {
    const Renderer = () => <output data-testid="raced-inert-dialogue">Dialogue</output>;
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const narrativeLayer = document.createElement("div");
    const portalContainer = document.createElement("div");
    narrativeLayer.append(portalContainer);
    document.body.append(narrativeLayer);

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={() => true}
      />,
    );
    narrativeLayer.setAttribute("inert", "");
    await flushHostMicrotasksV1();

    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
      .toMatchObject({ kind: "preparing" });
    const renderShell = portalContainer.querySelector(
      '[data-narrative-surface-render-shell="dialogue"]',
    );
    expect(renderShell).toHaveAttribute("inert");
    expect(renderShell).toHaveStyle({ visibility: "hidden" });

    act(() => narrativeLayer.removeAttribute("inert"));
    await flushHostMicrotasksV1();

    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
      .toMatchObject({ kind: "ready_instance" });
    expect(renderShell).not.toHaveAttribute("inert");
    expect(renderShell).not.toHaveStyle({ visibility: "hidden" });

    view.unmount();
    await flushHostMicrotasksV1();
    narrativeLayer.remove();
  });

  it("disconnects the exposure observer immediately after a ready Host reattach", () => {
    const Renderer = () => <output data-testid="reattached-dialogue">Dialogue</output>;
    const entry = syntheticDialogueRenderEntryV1({
      phase: "active",
      preparation: null,
      rendererComponent: Renderer,
      playerObservation: mutableDialoguePlayerObservationV1(
        passiveDialoguePlayerViewV1("active"),
      ).port,
    });
    const runtime = syntheticHostRuntimeV1(entry);
    vi.spyOn(narrativeFamilyModuleV1, "prepareNarrativeStableHostReadyCommitInternalV1")
      .mockReturnValue({ kind: "reattached" as const, completion: null });
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={({}) as unknown as NarrativeStableSessionInternalV1}
        portalContainer={portalContainer}
        inputRouter={createInputRouterV1()}
        isGestureCurrent={() => true}
      />,
    );

    expect(portalContainer.querySelector('[data-testid="reattached-dialogue"]')).not.toBeNull();
    expect(disconnect).toHaveBeenCalledOnce();
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(runtime.release).toHaveBeenCalledOnce();
    portalContainer.remove();
  });

  it("does not reopen a cancelled readiness gate from an abandoned successor render", async () => {
    const preparation = ({}) as unknown as NarrativeStableRootPreparationInternalV1;
    const Renderer = () => <button type="button">Cancelled narrative</button>;
    const firstEntry = syntheticDialogueRenderEntryV1({
      phase: "preparing",
      preparation,
      rendererComponent: Renderer,
    });
    const successorRenderer = vi.fn(() => <button type="button">Successor narrative</button>);
    const successorEntry = syntheticDialogueRenderEntryV1({
      phase: "preparing",
      preparation,
      rendererComponent: successorRenderer,
    });
    const renderSource = mutableHostRenderSourceV1(firstEntry);
    const settleReady = vi.fn(() => ({ kind: "stale" as const, completion: null }));
    const release = vi.fn();
    const runtime = ({
      attachment: {
        settleRootReadinessReadyInternalV1: settleReady,
        settleRootReadinessFailedInternalV1: vi.fn(),
        settleHistoryReadinessReadyInternalV1: vi.fn(),
        settleHistoryReadinessFailedInternalV1: vi.fn(),
        releaseInternalV1: release,
      },
      renderSource: renderSource.source,
    }) as unknown as NarrativeStableHostRuntimeInternalV1;
    vi.spyOn(narrativeFamilyModuleV1, "createNarrativeStableHostRuntimeInternalV1")
      .mockReturnValue(runtime);
    const readyMint = vi.spyOn(
      narrativeFamilyModuleV1,
      "prepareNarrativeStableHostReadyCommitInternalV1",
    ).mockReturnValue({
      kind: "prepared" as const,
      readyCommit: ({}) as unknown as NarrativeStableHostReadyCommitInternalV1,
      completion: null,
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const session = ({}) as unknown as NarrativeStableSessionInternalV1;
    const inputRouter = createInputRouterV1();
    const isGestureCurrent = () => true;
    const never = new Promise<void>(() => {});
    const suspendedRender = vi.fn();
    let attemptSuccessorRender: (() => void) | null = null;
    let hideCommittedTree: (() => void) | null = null;
    let revealCommittedTree: (() => void) | null = null;

    function SuspendGateProbeInternalV1(props: { readonly active: boolean }) {
      if (props.active) {
        suspendedRender();
        throw never;
      }
      return null;
    }

    function GateCurrentnessHarnessInternalV1() {
      const [attempted, setAttempted] = useState(false);
      const [cancelled, setCancelled] = useState(false);
      const [hidden, setHidden] = useState(false);
      useLayoutEffect(() => {
        attemptSuccessorRender = () => {
          renderSource.selectWithoutNotify(successorEntry);
          startTransition(() => setAttempted(true));
        };
        hideCommittedTree = () => {
          renderSource.selectWithoutNotify(firstEntry);
          setHidden(true);
        };
        revealCommittedTree = () => {
          setCancelled(true);
          setHidden(false);
        };
        return () => {
          attemptSuccessorRender = null;
          hideCommittedTree = null;
          revealCommittedTree = null;
        };
      }, []);
      return (
        <Suspense fallback={<output data-testid="narrative-gate-fallback" />}>
          <NarrativeSurfaceHostInternalV1
            session={session}
            portalContainer={portalContainer}
            inputRouter={inputRouter}
            isGestureCurrent={isGestureCurrent}
          />
          <SuspendGateProbeInternalV1 active={hidden || (attempted && !cancelled)} />
        </Suspense>
      );
    }

    const view = render(<GateCurrentnessHarnessInternalV1 />);
    await flushHostMicrotasksV1();
    expect(readyMint).toHaveBeenCalledOnce();
    expect(settleReady).toHaveBeenCalledOnce();
    expect(attemptSuccessorRender).not.toBeNull();
    expect(hideCommittedTree).not.toBeNull();
    expect(revealCommittedTree).not.toBeNull();

    act(() => attemptSuccessorRender!());
    await waitFor(() => {
      expect(suspendedRender).toHaveBeenCalled();
      expect(successorRenderer).toHaveBeenCalled();
    });

    act(() => hideCommittedTree!());
    await waitFor(() => {
      expect(view.getByTestId("narrative-gate-fallback")).toBeInTheDocument();
    });
    act(() => revealCommittedTree!());
    await waitFor(() => {
      expect(view.queryByTestId("narrative-gate-fallback")).toBeNull();
    });
    await flushHostMicrotasksV1();

    expect(readyMint).toHaveBeenCalledOnce();
    expect(settleReady).toHaveBeenCalledOnce();

    view.unmount();
    expect(release).toHaveBeenCalledTimes(2);
    portalContainer.remove();
  });

  it("remints only after a stale ready settlement publishes a fresh current entry", async () => {
    const preparation = ({}) as unknown as NarrativeStableRootPreparationInternalV1;
    const Renderer = () => <button type="button" data-testid="repaired-dialogue">Dialogue</button>;
    const firstEntry = syntheticDialogueRenderEntryV1({
      phase: "preparing",
      preparation,
      rendererComponent: Renderer,
    });
    const refreshedEntry = syntheticDialogueRenderEntryV1({
      phase: "preparing",
      preparation,
      rendererComponent: Renderer,
    });
    const synchronouslyRefreshedEntry = syntheticDialogueRenderEntryV1({
      phase: "preparing",
      preparation,
      rendererComponent: Renderer,
    });
    const activeEntry = syntheticDialogueRenderEntryV1({
      phase: "active",
      preparation: null,
      rendererComponent: Renderer,
    });
    const renderSource = mutableHostRenderSourceV1(firstEntry);
    let readySettlements = 0;
    const settleReady = vi.fn(() => {
      readySettlements += 1;
      if (readySettlements === 1) {
        return ({ kind: "stale" as const, completion: null });
      }
      if (readySettlements === 2) {
        renderSource.publish(synchronouslyRefreshedEntry);
        return ({ kind: "stale" as const, completion: null });
      }
      renderSource.publish(activeEntry);
      return ({ kind: "settled" as const, completion: null });
    });
    const settleFailed = vi.fn(() => ({ kind: "settled" as const, completion: null }));
    const release = vi.fn();
    const runtime = ({
      attachment: {
        settleRootReadinessReadyInternalV1: settleReady,
        settleRootReadinessFailedInternalV1: settleFailed,
        settleHistoryReadinessReadyInternalV1: vi.fn(),
        settleHistoryReadinessFailedInternalV1: vi.fn(),
        releaseInternalV1: release,
      },
      renderSource: renderSource.source,
    }) as unknown as NarrativeStableHostRuntimeInternalV1;
    vi.spyOn(narrativeFamilyModuleV1, "createNarrativeStableHostRuntimeInternalV1")
      .mockReturnValue(runtime);
    const readyMint = vi.spyOn(
      narrativeFamilyModuleV1,
      "prepareNarrativeStableHostReadyCommitInternalV1",
    ).mockImplementation(() => ({
      kind: "prepared" as const,
      readyCommit: ({}) as unknown as NarrativeStableHostReadyCommitInternalV1,
      completion: null,
    }));
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={({}) as unknown as NarrativeStableSessionInternalV1}
        portalContainer={portalContainer}
        inputRouter={createInputRouterV1()}
        isGestureCurrent={() => true}
      />,
    );
    const shell = portalContainer.querySelector('[data-testid="repaired-dialogue"]')
      ?.parentElement;
    expect(shell).toHaveStyle({ visibility: "hidden" });

    await flushHostMicrotasksV1();

    expect(settleReady).toHaveBeenCalledOnce();
    expect(readyMint).toHaveBeenCalledOnce();
    expect(shell).toHaveStyle({ visibility: "hidden" });

    act(() => renderSource.publish(refreshedEntry));
    await flushHostMicrotasksV1();

    expect(settleReady).toHaveBeenCalledTimes(3);
    expect(settleFailed).not.toHaveBeenCalled();
    expect(readyMint).toHaveBeenCalledTimes(3);
    expect(portalContainer.querySelector('[data-testid="repaired-dialogue"]')?.parentElement)
      .toBe(shell);
    expect(shell).not.toHaveAttribute("inert");
    expect(shell?.style.visibility).not.toBe("hidden");

    view.unmount();
    expect(release).toHaveBeenCalledOnce();
    portalContainer.remove();
  });

  it("retries a failed settlement only when the errored candidate receives a fresh entry", async () => {
    const rendererError = new Error("repairable pre-ready renderer failure");
    const preparation = ({}) as unknown as NarrativeStableRootPreparationInternalV1;
    const Renderer = () => {
      throw rendererError;
    };
    const firstEntry = syntheticDialogueRenderEntryV1({
      phase: "preparing",
      preparation,
      rendererComponent: Renderer,
    });
    const refreshedEntry = syntheticDialogueRenderEntryV1({
      phase: "preparing",
      preparation,
      rendererComponent: Renderer,
    });
    const synchronouslyRefreshedEntry = syntheticDialogueRenderEntryV1({
      phase: "preparing",
      preparation,
      rendererComponent: Renderer,
    });
    const renderSource = mutableHostRenderSourceV1(firstEntry);
    let failedSettlements = 0;
    const settleFailed = vi.fn(() => {
      failedSettlements += 1;
      if (failedSettlements === 1) {
        return ({ kind: "stale" as const, completion: null });
      }
      if (failedSettlements === 2) {
        renderSource.publish(synchronouslyRefreshedEntry);
        return ({ kind: "stale" as const, completion: null });
      }
      return ({ kind: "settled" as const, completion: null });
    });
    const settleReady = vi.fn();
    const release = vi.fn();
    const runtime = ({
      attachment: {
        settleRootReadinessReadyInternalV1: settleReady,
        settleRootReadinessFailedInternalV1: settleFailed,
        settleHistoryReadinessReadyInternalV1: vi.fn(),
        settleHistoryReadinessFailedInternalV1: vi.fn(),
        releaseInternalV1: release,
      },
      renderSource: renderSource.source,
    }) as unknown as NarrativeStableHostRuntimeInternalV1;
    vi.spyOn(narrativeFamilyModuleV1, "createNarrativeStableHostRuntimeInternalV1")
      .mockReturnValue(runtime);
    const readyMint = vi.spyOn(
      narrativeFamilyModuleV1,
      "prepareNarrativeStableHostReadyCommitInternalV1",
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={({}) as unknown as NarrativeStableSessionInternalV1}
        portalContainer={portalContainer}
        inputRouter={createInputRouterV1()}
        isGestureCurrent={() => true}
      />,
    );

    await flushHostMicrotasksV1();

    expect(settleFailed).toHaveBeenCalledOnce();
    act(() => renderSource.publish(refreshedEntry));
    await flushHostMicrotasksV1();

    expect(settleFailed).toHaveBeenCalledTimes(3);
    expect(settleReady).not.toHaveBeenCalled();
    expect(readyMint).not.toHaveBeenCalled();
    expect(portalContainer).toBeEmptyDOMElement();
    expect(consoleError).toHaveBeenCalled();

    view.unmount();
    expect(release).toHaveBeenCalledOnce();
    portalContainer.remove();
  });

  it("settles a renderer failure before ready exactly once without escaping the candidate boundary", async () => {
    const Renderer = () => {
      throw null;
    };
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const notificationsBeforeHost = harness.stateNotificationCount();
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={() => true}
      />,
    );
    await flushHostMicrotasksV1();

    const binding = harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding;
    expect(binding).toMatchObject({ kind: "gap", reason: "readiness_failed" });
    expect(harness.stateNotificationCount()).toBe(notificationsBeforeHost + 1);
    expect(harness.bindingKinds.filter((kind) => kind === "gap")).toHaveLength(1);
    expect(consoleError).toHaveBeenCalled();

    view.unmount();
    await flushHostMicrotasksV1();
    consoleError.mockRestore();
    portalContainer.remove();
  });

  it("contains a layout ready-mint fault and settles the candidate before ready", async () => {
    const Renderer = () => <output data-testid="mint-fault-dialogue">Dialogue</output>;
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const notificationsBeforeHost = harness.stateNotificationCount();
    const mintError = new Error("ready mint layout failure");
    const readyMint = vi.spyOn(
      narrativeFamilyModuleV1,
      "prepareNarrativeStableHostReadyCommitInternalV1",
    ).mockImplementation(() => {
      throw mintError;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);

    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={() => true}
      />,
    );
    await flushHostMicrotasksV1();

    expect(readyMint).toHaveBeenCalledOnce();
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
      .toMatchObject({ kind: "gap", reason: "readiness_failed" });
    expect(harness.stateNotificationCount()).toBe(notificationsBeforeHost + 1);
    expect(portalContainer.querySelector('[data-testid="mint-fault-dialogue"]')).toBeNull();
    expect(consoleError).toHaveBeenCalled();

    view.unmount();
    await flushHostMicrotasksV1();
    portalContainer.remove();
  });

  it("fails a disconnected pre-ready portal instead of leaving an immortal preparation", async () => {
    const Renderer = () => <button type="button" data-testid="detached-dialogue">Dialogue</button>;
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const detachedPortal = document.createElement("div");
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={detachedPortal}
        inputRouter={harness.inputRouter}
        isGestureCurrent={() => true}
      />,
    );

    await flushHostMicrotasksV1();

    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding)
      .toMatchObject({ kind: "gap", reason: "readiness_failed" });
    view.unmount();
    await flushHostMicrotasksV1();
  });

  it("delegates an accepted-ready render fault to the outer diagnostics boundary", async () => {
    const acceptedError = new Error("accepted-ready renderer failure");
    let faulted = false;
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void): () => void => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    const getSnapshot = () => faulted;
    const Renderer = () => {
      if (useSyncExternalStore(subscribe, getSnapshot, getSnapshot)) throw acceptedError;
      return <button type="button" data-testid="accepted-dialogue">Dialogue</button>;
    };
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const captured: unknown[] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <CapturedErrorBoundaryV1 onError={(error) => captured.push(error)}>
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={() => true}
        />
      </CapturedErrorBoundaryV1>,
    );
    await flushHostMicrotasksV1();
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding.kind)
      .toBe("ready_instance");

    act(() => {
      faulted = true;
      for (const listener of [...listeners]) listener();
    });
    await flushHostMicrotasksV1();

    expect(captured).toEqual([acceptedError]);
    expect(harness.bindingKinds).not.toContain("gap");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
    portalContainer.remove();
  });

  it("fences a ref-null detach before its queued ready acknowledgment and terminally cleans up", async () => {
    const Renderer = () => <button type="button" data-testid="pending-dialogue">Dialogue</button>;
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={() => true}
      />,
    );
    expect(portalContainer.querySelector('[data-testid="pending-dialogue"]')).not.toBeNull();

    view.unmount();
    expect(portalContainer).toBeEmptyDOMElement();
    expect(() =>
      harness.session.attachHostInternalV1({
        hostIdentity: { host: "grace-competitor" },
      })
    ).toThrowError("ui.narrative_stable_host_lease_conflict");

    await flushHostMicrotasksV1();

    expect(harness.bindingKinds).not.toContain("ready_instance");
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
    expect(harness.session.getReadinessSnapshotInternalV1().entries).toEqual([]);
    expect(() =>
      harness.session.attachHostInternalV1({
        hostIdentity: { host: "after-terminal" },
      })
    ).toThrowError("ui.narrative_stable_host_attachment_invalid");
    portalContainer.remove();
  });

  it.each(["publisher_dispose", "coordinator_dispose"] as const)(
    "does not restore the root previous owner when a mounted Host receives %s terminal state",
    async (terminalKind) => {
      const Renderer = () => <button type="button" data-testid="terminal-root">Dialogue</button>;
      const previousOwner = document.createElement("button");
      previousOwner.type = "button";
      previousOwner.textContent = "Terminal previous owner";
      document.body.append(previousOwner);
      previousOwner.focus();
      const harness = hostHarnessV1(Renderer);
      expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
        kind: "applied",
      });
      const portalContainer = document.createElement("div");
      document.body.append(portalContainer);
      const view = render(
        <>
          <output data-testid="terminal-host-mounted">Mounted</output>
          <NarrativeSurfaceHostInternalV1
            session={harness.session}
            portalContainer={portalContainer}
            inputRouter={harness.inputRouter}
            isGestureCurrent={harness.isGestureCurrent}
          />
        </>,
      );
      await flushHostMicrotasksV1();
      expect(document.activeElement).toBe(narrativeFocusScopeV1(
        portalContainer.querySelector('[data-testid="terminal-root"]'),
      ));

      const previousOwnerFocus = vi.spyOn(previousOwner, "focus");
      const queuedMicrotask = vi.spyOn(globalThis, "queueMicrotask");
      const queuedBeforeTerminal = queuedMicrotask.mock.calls.length;
      act(() => {
        expect(
          terminalKind === "publisher_dispose"
            ? harness.bridge.disposeInternalV1()
            : harness.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }),
        ).toMatchObject({
          kind: "applied",
          code: terminalKind === "publisher_dispose"
            ? "surface.stable_publisher_disposed"
            : "surface.coordinator_disposed",
        });
      });
      const queuedRestoreCount = queuedMicrotask.mock.calls.length - queuedBeforeTerminal;
      expect(portalContainer).toBeEmptyDOMElement();
      expect(view.container.querySelector('[data-testid="terminal-host-mounted"]')).not.toBeNull();

      await flushHostMicrotasksV1();

      expect({
        previousOwnerFocusCount: previousOwnerFocus.mock.calls.length,
        queuedRestoreCount,
      }).toEqual({
        previousOwnerFocusCount: 0,
        queuedRestoreCount: 0,
      });

      view.unmount();
      portalContainer.remove();
      previousOwner.remove();
    },
  );

  it.each(["publisher_dispose", "coordinator_dispose"] as const)(
    "does not queue root or History focus restoration when a mounted History Host receives %s terminal state",
    async (terminalKind) => {
      const createRuntime = vi.spyOn(
        narrativeFamilyModuleV1,
        "createNarrativeStableHostRuntimeInternalV1",
      );
      const Renderer = (props: NarrativeStableRendererPropsInternalV1) =>
        props.kind === "dialogue"
          ? <button type="button" data-testid="terminal-history-opener">Open</button>
          : <output data-testid="terminal-history">History</output>;
      const previousOwner = document.createElement("button");
      previousOwner.type = "button";
      previousOwner.textContent = "Terminal root previous owner";
      document.body.append(previousOwner);
      previousOwner.focus();
      const harness = hostHarnessV1(Renderer);
      expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
        kind: "applied",
      });
      const portalContainer = document.createElement("div");
      document.body.append(portalContainer);
      const view = render(
        <>
          <output data-testid="terminal-history-host-mounted">Mounted</output>
          <NarrativeSurfaceHostInternalV1
            session={harness.session}
            portalContainer={portalContainer}
            inputRouter={harness.inputRouter}
            isGestureCurrent={harness.isGestureCurrent}
          />
        </>,
      );
      await flushHostMicrotasksV1();
      const runtime = createRuntime.mock.results.at(-1)?.value as
        | NarrativeStableHostRuntimeInternalV1
        | undefined;
      const committedGestureCurrent = createRuntime.mock.calls.at(-1)?.[0].isGestureCurrent;
      if (runtime === undefined || committedGestureCurrent === undefined) {
        throw new Error("expected current Host runtime");
      }
      const opener = portalContainer.querySelector<HTMLElement>(
        '[data-testid="terminal-history-opener"]',
      );
      if (opener === null) throw new Error("expected History opener");
      opener.focus();
      act(() => openHistoryV1(harness, `terminal-${terminalKind}`, committedGestureCurrent));
      await flushHostMicrotasksV1();
      expect(currentHistoryRenderEntryV1(runtime).phase).toBe("active");

      const previousOwnerFocus = vi.spyOn(previousOwner, "focus");
      const openerFocus = vi.spyOn(opener, "focus");
      const queuedMicrotask = vi.spyOn(globalThis, "queueMicrotask");
      const queuedBeforeTerminal = queuedMicrotask.mock.calls.length;
      act(() => {
        expect(
          terminalKind === "publisher_dispose"
            ? harness.bridge.disposeInternalV1()
            : harness.kernel.transitionTransientInternalV1({ kind: "dispose_coordinator" }),
        ).toMatchObject({ kind: "applied" });
      });
      const queuedRestoreCount = queuedMicrotask.mock.calls.length - queuedBeforeTerminal;
      expect(portalContainer).toBeEmptyDOMElement();
      expect(
        view.container.querySelector('[data-testid="terminal-history-host-mounted"]'),
      ).not.toBeNull();

      await flushHostMicrotasksV1();

      expect({
        openerFocusCount: openerFocus.mock.calls.length,
        previousOwnerFocusCount: previousOwnerFocus.mock.calls.length,
        queuedRestoreCount,
      }).toEqual({
        openerFocusCount: 0,
        previousOwnerFocusCount: 0,
        queuedRestoreCount: 0,
      });

      view.unmount();
      portalContainer.remove();
      previousOwner.remove();
    },
  );

  it("suppresses an already queued root restore when publisher disposal wins before delivery", async () => {
    const Renderer = () => <button type="button">Dialogue</button>;
    const previousOwner = document.createElement("button");
    previousOwner.type = "button";
    previousOwner.textContent = "Queued terminal previous owner";
    document.body.append(previousOwner);
    previousOwner.focus();
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <>
        <output data-testid="queued-terminal-host-mounted">Mounted</output>
        <NarrativeSurfaceHostInternalV1
          session={harness.session}
          portalContainer={portalContainer}
          inputRouter={harness.inputRouter}
          isGestureCurrent={harness.isGestureCurrent}
        />
      </>,
    );
    await flushHostMicrotasksV1();

    const queuedRestores: VoidFunction[] = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
      queuedRestores.push(callback);
    });
    const previousOwnerFocus = vi.spyOn(previousOwner, "focus");
    act(() => {
      expect(harness.bridge.reconcilePendingInternalV1(null)).toMatchObject({ kind: "applied" });
    });
    expect(queuedRestores).toHaveLength(1);
    const queuedRestore = queuedRestores[0];
    if (queuedRestore === undefined) throw new Error("expected queued root focus restore");

    act(() => {
      expect(harness.bridge.disposeInternalV1()).toMatchObject({
        kind: "applied",
        code: "surface.stable_publisher_disposed",
      });
      queuedRestore();
    });

    expect(previousOwnerFocus).not.toHaveBeenCalled();
    expect(portalContainer).toBeEmptyDOMElement();
    expect(view.container.querySelector('[data-testid="queued-terminal-host-mounted"]'))
      .not.toBeNull();

    view.unmount();
    portalContainer.remove();
    previousOwner.remove();
  });

  it("terminally disposes a ready ref-null detach without rewriting it as failed", async () => {
    const Renderer = () => <button type="button" data-testid="ready-dialogue">Dialogue</button>;
    const previousOwner = document.createElement("button");
    previousOwner.type = "button";
    previousOwner.textContent = "Terminal previous owner";
    document.body.append(previousOwner);
    previousOwner.focus();
    const harness = hostHarnessV1(Renderer);
    expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1())).toMatchObject({
      kind: "applied",
    });
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={harness.session}
        portalContainer={portalContainer}
        inputRouter={harness.inputRouter}
        isGestureCurrent={() => true}
      />,
    );
    await flushHostMicrotasksV1();
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding.kind)
      .toBe("ready_instance");
    const readyRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-testid="ready-dialogue"]',
    );
    expect(document.activeElement).toBe(narrativeFocusScopeV1(readyRenderer));

    view.unmount();
    await flushHostMicrotasksV1();

    expect(harness.bindingKinds).not.toContain("gap");
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
    expect(harness.session.getReadinessSnapshotInternalV1().entries).toEqual([]);
    expect(document.activeElement).not.toBe(previousOwner);
    portalContainer.remove();
    previousOwner.remove();
  });
});
