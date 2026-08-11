// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import {
  appendNarrativeHistoryV1,
  emptyNarrativeHistoryV1,
  parseNonNegativeSafeInteger,
  type NarrativeHistoryV1,
} from "@sillymaker/base";
import { act, cleanup, render } from "@testing-library/react";
import { Component, StrictMode, useSyncExternalStore, type ErrorInfo, type ReactNode } from "react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { playerInputActionIdsV1 } from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceGestureIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { createManagedSurfaceReducerStateV1 } from "../managed-surfaces/managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
} from "../managed-surfaces/managed-surface-stable-admission.ts";
import { createManagedSurfaceStableCompositeRuntimeKernelInternalV1 } from "../managed-surfaces/managed-surface-stable-composite-state.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "../managed-surfaces/managed-surface-stable-publisher-lease.ts";
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
  type NarrativeSurfaceHostPropsInternalV1,
} from "./narrative-surface-host.tsx";

const applicationEpochV1 = parseNonNegativeSafeInteger(211);
const toggleHistoryActionIdV1 = parseManagedSurfaceActionIdV1(
  playerInputActionIdsV1.toggleHistory,
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function pendingSayV1(sequence = 1): unknown {
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
  const port = Object.freeze({
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

function hostHarnessV1(
  rendererComponent: (props: NarrativeStableRendererPropsInternalV1) => unknown,
  historyObservation = mutableHistoryObservationV1(),
) {
  const contract = createNarrativeManagedSurfaceFamilyContractInternalV1();
  const registry = createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1();
  const publisherLeaseRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: applicationEpochV1,
    resolvedOwnerIds: contract.resolvedOwnerIds,
    leaseSequenceAllocator: registry,
  });
  const admissionAuthority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry,
    definitionSidecars: contract.stableDefinitionSidecars,
    resolvedSlotDescriptors: contract.resolvedSlotDescriptors,
  });
  const kernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority,
    publisherLeaseRegistry,
    initialTransientState: createManagedSurfaceReducerStateV1(
      applicationEpochV1,
      contract.resolvedOwnerIds,
      contract.resolvedSlotDescriptors,
    ),
  });
  const semanticDispatchPort = Object.freeze({
    dispatchResolutionInternalV1: (_request: unknown) => Promise.resolve(undefined),
  }) satisfies NarrativeStableSemanticResolutionPortInternalV1;
  const candidatePreflight = Object.freeze({
    preflightCandidateInternalV1: () =>
      Object.freeze({
        kind: "captured" as const,
        candidateSnapshot: Object.freeze({
          rendererComponent,
          visualConfig: Object.freeze({ skin: "host-test" }),
          semanticDispatchPort,
          historyObservationPort: historyObservation.port,
          historyAvailabilityPort: Object.freeze({
            readHistoryAvailabilityInternalV1: () => true,
          }),
          playerProfile: Object.freeze({ locale: "en" }),
          presentationClock: Object.freeze({ kind: "host-test-clock" }),
          textResolver: Object.freeze({ kind: "host-test-text" }),
          voiceReplayPort: null,
          quickMenuContribution: null,
        }),
      }),
  }) satisfies NarrativeStableCandidatePreflightInternalV1;
  const bridge = createNarrativeStablePublisherBridgeInternalV1({
    publisherLeaseRegistry,
    admissionAuthority,
    compositeRuntimeKernel: kernel,
    candidatePreflight,
    exactAggregateDefinitionSidecars: contract.stableDefinitionSidecars,
    exactAggregateSlotDescriptors: contract.resolvedSlotDescriptors,
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
    session,
    stateNotificationCount: () => stateNotifications,
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

function historyWithOneEntryV1(): NarrativeHistoryV1 {
  return appendNarrativeHistoryV1(
    emptyNarrativeHistoryV1,
    Object.freeze({
      kind: "say" as const,
      occurrenceId: "interaction-occurrence.2",
      definitionId: "interaction.host-test.line",
      seenRevision: 1,
      speakerTextId: null,
      textId: "text.host-test.line",
      voiceAssetId: null,
    }),
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
    readonly rendererComponent: SyntheticDialogueRenderEntryV1["rendererComponent"];
  }>,
): SyntheticDialogueRenderEntryV1 {
  return Object.freeze({
    kind: "dialogue",
    phase: input.phase,
    renderKey: "narrative-host-render.synthetic-repair",
    preparation: input.preparation,
    initialFocusTargetId: parseManagedSurfaceFocusTargetIdV1(
      "surface-focus.narrative.primary",
    ),
    rendererComponent: input.rendererComponent,
    rendererProps: Object.freeze({
      kind: "dialogue",
      pending: pendingSayV1(),
      visualConfig: Object.freeze({ skin: "synthetic-repair" }),
      playerProfile: Object.freeze({ locale: "en" }),
      textResolver: Object.freeze({ kind: "synthetic-text" }),
      quickMenuContribution: null,
    }),
  }) as unknown as SyntheticDialogueRenderEntryV1;
}

function mutableHostRenderSourceV1(
  initialEntry: NarrativeStableHostRenderEntryInternalV1,
): Readonly<{
  readonly source: NarrativeStableHostRenderSourceInternalV1;
  publish(entry: NarrativeStableHostRenderEntryInternalV1): void;
}> {
  let snapshot = Object.freeze({ entries: Object.freeze([initialEntry]) });
  const listeners = new Set<() => void>();
  const source = Object.freeze({
    getSnapshotInternalV1: () => snapshot,
    subscribeInternalV1(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  }) satisfies NarrativeStableHostRenderSourceInternalV1;
  return Object.freeze({
    source,
    publish(entry: NarrativeStableHostRenderEntryInternalV1): void {
      snapshot = Object.freeze({ entries: Object.freeze([entry]) });
      for (const listener of [...listeners]) listener();
    },
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

  it("portals one hidden-with-layout shell, then activates the same shell after commit", async () => {
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
    const shell = renderer?.parentElement;
    expect(shell).toBeInstanceOf(HTMLDivElement);
    expect(shell).toHaveAttribute("tabindex", "-1");
    expect(shell).toHaveAttribute("inert");
    expect(shell).toHaveAttribute("aria-hidden", "true");
    expect(shell).not.toHaveAttribute("hidden");
    expect(shell).toHaveStyle({ visibility: "hidden", pointerEvents: "none" });
    expect(shell?.style.display).not.toBe("none");
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding.kind)
      .toBe("preparing");
    expect(readyMint).toHaveBeenCalledOnce();

    await flushHostMicrotasksV1();

    expect(portalContainer.querySelector('[data-testid="narrative-host-renderer"]')).toBe(
      renderer,
    );
    expect(shell).not.toHaveAttribute("inert");
    expect(shell).not.toHaveAttribute("aria-hidden");
    expect(shell?.style.visibility).not.toBe("hidden");
    expect(shell?.style.pointerEvents).not.toBe("none");
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings[0]?.binding.kind)
      .toBe("ready_instance");
    expect(rendererProps.at(-1)).toMatchObject({ kind: "dialogue" });
    expect(Reflect.ownKeys(rendererProps.at(-1) ?? {})).toEqual([
      "kind",
      "pending",
      "visualConfig",
      "playerProfile",
      "textResolver",
      "quickMenuContribution",
    ]);

    view.unmount();
    await flushHostMicrotasksV1();
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
    const canonicalHistory = latestHistoryProps.history;
    expect(canonicalHistory).not.toBe(initialRawHistory);
    expect(Object.isFrozen(canonicalHistory)).toBe(true);
    expect(Object.isFrozen(canonicalHistory?.entries)).toBe(true);

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

    act(() => openHistoryV1(harness, "max-three-open", committedGestureCurrent));
    await flushHostMicrotasksV1();
    const rootRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-occurrence-id="interaction-occurrence.1"]',
    );
    const historyRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-render-kind="max-three-history"]',
    );
    const rootShell = rootRenderer?.parentElement;
    const historyShell = historyRenderer?.parentElement;
    expect(rootShell).toHaveAttribute("inert");
    expect(historyShell).not.toHaveAttribute("inert");

    act(() => {
      expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1(2))).toMatchObject({
        kind: "applied",
      });
    });
    const failedReplacementRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-occurrence-id="interaction-occurrence.2"]',
    );
    const failedReplacementShell = failedReplacementRenderer?.parentElement;
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
    expect(failedReplacementShell).toHaveAttribute("aria-hidden", "true");
    expect(failedReplacementShell).toHaveStyle({
      visibility: "hidden",
      pointerEvents: "none",
    });

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
    expect(rootShell).toHaveAttribute("inert");
    expect(historyRenderer?.parentElement).toBe(historyShell);
    expect(historyRenderer?.isConnected).toBe(true);
    expect(historyShell).not.toHaveAttribute("inert");
    expect(failedReplacementRenderer?.isConnected).toBe(false);

    act(() => {
      expect(harness.bridge.reconcilePendingInternalV1(pendingSayV1(3))).toMatchObject({
        kind: "applied",
      });
    });
    const successorRenderer = portalContainer.querySelector<HTMLElement>(
      '[data-occurrence-id="interaction-occurrence.3"]',
    );
    const successorShell = successorRenderer?.parentElement;
    expect(portalContainer.children).toHaveLength(3);
    expect(successorShell).toHaveStyle({ visibility: "hidden", pointerEvents: "none" });

    await flushHostMicrotasksV1();

    expect(portalContainer.children).toHaveLength(1);
    expect(successorRenderer?.parentElement).toBe(successorShell);
    expect(successorRenderer?.isConnected).toBe(true);
    expect(successorShell).not.toHaveAttribute("inert");
    expect(successorShell).not.toHaveAttribute("aria-hidden");
    expect(successorShell?.style.visibility).not.toBe("hidden");
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

  it("remints only after a stale ready settlement publishes a fresh current entry", async () => {
    const preparation = Object.freeze({}) as unknown as NarrativeStableRootPreparationInternalV1;
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
        return Object.freeze({ kind: "stale" as const, completion: null });
      }
      if (readySettlements === 2) {
        renderSource.publish(synchronouslyRefreshedEntry);
        return Object.freeze({ kind: "stale" as const, completion: null });
      }
      renderSource.publish(activeEntry);
      return Object.freeze({ kind: "settled" as const, completion: null });
    });
    const settleFailed = vi.fn(() => Object.freeze({ kind: "settled" as const, completion: null }));
    const release = vi.fn();
    const runtime = Object.freeze({
      attachment: Object.freeze({
        settleRootReadinessReadyInternalV1: settleReady,
        settleRootReadinessFailedInternalV1: settleFailed,
        settleHistoryReadinessReadyInternalV1: vi.fn(),
        settleHistoryReadinessFailedInternalV1: vi.fn(),
        releaseInternalV1: release,
      }),
      renderSource: renderSource.source,
    }) as unknown as NarrativeStableHostRuntimeInternalV1;
    vi.spyOn(narrativeFamilyModuleV1, "createNarrativeStableHostRuntimeInternalV1")
      .mockReturnValue(runtime);
    const readyMint = vi.spyOn(
      narrativeFamilyModuleV1,
      "prepareNarrativeStableHostReadyCommitInternalV1",
    ).mockImplementation(() =>
      Object.freeze({
        kind: "prepared" as const,
        readyCommit: Object.freeze({}) as unknown as NarrativeStableHostReadyCommitInternalV1,
        completion: null,
      })
    );
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);
    const view = render(
      <NarrativeSurfaceHostInternalV1
        session={Object.freeze({}) as unknown as NarrativeStableSessionInternalV1}
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
    const preparation = Object.freeze({}) as unknown as NarrativeStableRootPreparationInternalV1;
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
        return Object.freeze({ kind: "stale" as const, completion: null });
      }
      if (failedSettlements === 2) {
        renderSource.publish(synchronouslyRefreshedEntry);
        return Object.freeze({ kind: "stale" as const, completion: null });
      }
      return Object.freeze({ kind: "settled" as const, completion: null });
    });
    const settleReady = vi.fn();
    const release = vi.fn();
    const runtime = Object.freeze({
      attachment: Object.freeze({
        settleRootReadinessReadyInternalV1: settleReady,
        settleRootReadinessFailedInternalV1: settleFailed,
        settleHistoryReadinessReadyInternalV1: vi.fn(),
        settleHistoryReadinessFailedInternalV1: vi.fn(),
        releaseInternalV1: release,
      }),
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
        session={Object.freeze({}) as unknown as NarrativeStableSessionInternalV1}
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
        hostIdentity: Object.freeze({ host: "grace-competitor" }),
      })
    ).toThrowError("ui.narrative_stable_host_lease_conflict");

    await flushHostMicrotasksV1();

    expect(harness.bindingKinds).not.toContain("ready_instance");
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
    expect(harness.session.getReadinessSnapshotInternalV1().entries).toEqual([]);
    expect(() =>
      harness.session.attachHostInternalV1({
        hostIdentity: Object.freeze({ host: "after-terminal" }),
      })
    ).toThrowError("ui.narrative_stable_host_attachment_invalid");
    portalContainer.remove();
  });

  it("terminally disposes a ready ref-null detach without rewriting it as failed", async () => {
    const Renderer = () => <button type="button" data-testid="ready-dialogue">Dialogue</button>;
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

    view.unmount();
    await flushHostMicrotasksV1();

    expect(harness.bindingKinds).not.toContain("gap");
    expect(harness.kernel.getStateInternalV1().stableRuntimeBindings).toEqual([]);
    expect(harness.session.getReadinessSnapshotInternalV1().entries).toEqual([]);
    portalContainer.remove();
  });
});
