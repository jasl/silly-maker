// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  inputIgnoredV1,
  parseInputActionIdV1,
  type InputEventV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import { createManagedSurfaceCompositeKernelBundleInternalV1 } from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import type { ManagedSurfaceCoordinatorRuntimeV1 } from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
import type {
  WholeCanvasManagedSurfaceRenderEntryInternalV1,
  WholeCanvasManagedSurfaceResolveTargetRequestInternalV1,
  WholeCanvasManagedSurfaceRootDesiredInternalV1,
} from "./whole-canvas-managed-surface-session.ts";
import {
  createWholeCanvasSurfaceCompositionDefinitionInternalV1,
  createWholeCanvasSurfaceCompositionRuntimeInternalV1,
  resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1,
  resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1,
  type WholeCanvasSurfaceRendererPropsInternalV1,
} from "./whole-canvas-surface-composition.tsx";
import { WholeCanvasSurfaceHostInternalV1 } from "./whole-canvas-surface-host.tsx";

afterEach(cleanup);

const ownerActionIdInternalV1 = "test.whole-canvas.owner";
const openDetailActionIdInternalV1 = "test.whole-canvas.open-detail";
const backActionIdInternalV1 = "test.whole-canvas.back";

function deferredInternalV1() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return Object.freeze({ promise, resolve, reject });
}

function targetInternalV1(targetId: string) {
  return Object.freeze({ targetId, parameters: Object.freeze({}) });
}

function inputRouterInternalV1() {
  const registrations = new Set<Parameters<InputRouterV1["register"]>[0]>();
  const router: InputRouterV1 = Object.freeze({
    register(registration: Parameters<InputRouterV1["register"]>[0]): () => void {
      registrations.add(registration);
      return Object.freeze(() => registrations.delete(registration));
    },
    route(event: InputEventV1) {
      for (const registration of [...registrations].toReversed()) {
        const result = registration.handle(event);
        if (result.kind === "handled") {
          return Object.freeze({ kind: "handled" as const, context: registration.context });
        }
      }
      return inputIgnoredV1;
    },
    clearTransientInput(): void {},
  });
  return Object.freeze({ router, registrationCount: () => registrations.size });
}

function hostHarnessInternalV1(
  input: Readonly<{
    readonly prepare?: (entry: WholeCanvasManagedSurfaceRenderEntryInternalV1) => Promise<unknown>;
    readonly renderer: ComponentType<WholeCanvasSurfaceRendererPropsInternalV1>;
    readonly reportFailure?: (error: unknown) => void;
    readonly sealFailure?: (error: unknown) => void;
  }>,
) {
  const rootTarget = targetInternalV1("test.whole-canvas.root");
  const replacementTarget = targetInternalV1("test.whole-canvas.replacement");
  const detailTarget = targetInternalV1("test.whole-canvas.detail");
  let desired: WholeCanvasManagedSurfaceRootDesiredInternalV1 = Object.freeze({
    bootSplash: null,
    title: null,
    story: Object.freeze({ sourceKind: "application" as const, target: rootTarget }),
  });
  const listeners = new Set<() => void>();
  const dispatchOwner = vi.fn(() => Promise.resolve());
  const definition = createWholeCanvasSurfaceCompositionDefinitionInternalV1(Object.freeze({
    catalog: Object.freeze([
      Object.freeze({
        targetId: rootTarget.targetId,
        contractRevision: 1 as const,
        placements: Object.freeze(["primary" as const]),
        actionIds: Object.freeze([ownerActionIdInternalV1, openDetailActionIdInternalV1]),
        defaultActionId: null,
      }),
      Object.freeze({
        targetId: replacementTarget.targetId,
        contractRevision: 1 as const,
        placements: Object.freeze(["primary" as const]),
        actionIds: Object.freeze([ownerActionIdInternalV1, openDetailActionIdInternalV1]),
        defaultActionId: null,
      }),
      Object.freeze({
        targetId: detailTarget.targetId,
        contractRevision: 1 as const,
        placements: Object.freeze(["detail" as const]),
        actionIds: Object.freeze([backActionIdInternalV1]),
        defaultActionId: null,
      }),
    ]),
    getSnapshotInternalV1: () => desired,
    subscribeInternalV1(listener: () => void): () => void {
      listeners.add(listener);
      return Object.freeze(() => listeners.delete(listener));
    },
    resolveTargetInternalV1: (request: WholeCanvasManagedSurfaceResolveTargetRequestInternalV1) =>
      request.target.targetId !== detailTarget.targetId
        ? Object.freeze({
          accessibleNameTextId: "text.whole-canvas.root",
          view: Object.freeze({ kind: "root", targetId: request.target.targetId }),
          actions: Object.freeze([
            Object.freeze({
              actionId: ownerActionIdInternalV1,
              status: "enabled" as const,
              reasonTextIds: Object.freeze([]),
              intent: Object.freeze({ kind: "owner" as const, payload: Object.freeze({}) }),
            }),
            Object.freeze({
              actionId: openDetailActionIdInternalV1,
              status: "enabled" as const,
              reasonTextIds: Object.freeze([]),
              intent: Object.freeze({ kind: "open_detail" as const, target: detailTarget }),
            }),
          ]),
        })
        : Object.freeze({
          accessibleNameTextId: "text.whole-canvas.detail",
          view: Object.freeze({ kind: "detail" }),
          actions: Object.freeze([Object.freeze({
            actionId: backActionIdInternalV1,
            status: "enabled" as const,
            reasonTextIds: Object.freeze([]),
            intent: Object.freeze({ kind: "back" as const }),
          })]),
        }),
    dispatchOwnerActionInternalV1: dispatchOwner,
    prepareTargetInternalV1: input.prepare ?? (() => Promise.resolve()),
    renderInternalV1: input.renderer,
  }));
  const family = resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(definition);
  const bundle = createManagedSurfaceCompositeKernelBundleInternalV1(Object.freeze({
    applicationEpoch: parseNonNegativeSafeInteger(71),
    recipe: Object.freeze({
      resolvedOwnerIds: family.resolvedOwnerIds,
      resolvedSlotDescriptors: family.resolvedSlotDescriptors,
    }),
    definitionSidecars: family.stableDefinitionSidecars,
  }));
  const runtime = Object.freeze({
    applicationEpoch: bundle.applicationEpoch,
    activationKind: "initial" as const,
    coordinator: bundle.coordinator,
    gestureLease: Object.freeze({
      begin: () => {
        throw new TypeError("unused");
      },
      isCurrent: () => false,
      revoke: () => undefined,
    }),
    bindCurrentInput: () => {
      throw new TypeError("unused");
    },
    isIngressOpen: () => true,
  }) as ManagedSurfaceCoordinatorRuntimeV1;
  const composition = createWholeCanvasSurfaceCompositionRuntimeInternalV1({
    definition,
    resolveKernelBundleInternalV1: () => bundle,
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
    ...(input.sealFailure === undefined ? {} : {
      sealCompositionOnFailure: input.sealFailure,
    }),
  });
  const gate = { open: false };
  composition.prepareRuntimeAttachmentInternalV1(
    runtime,
    Object.freeze({ isOpen: () => gate.open }),
  );
  const notify = composition.activateRuntimeAttachmentInternalV1();
  gate.open = true;
  notify();
  const binding = composition.getCurrentHostBindingInternalV1()!;
  const bindingRuntime = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(binding);
  const portalContainer = document.createElement("div");
  document.body.append(portalContainer);
  const router = inputRouterInternalV1();
  const releasePhysical = composition.registerHostPhysicalIngressInternalV1(Object.freeze({
    portalContainer,
    inputRouter: router.router,
  }));
  return Object.freeze({
    composition,
    binding,
    bindingRuntime,
    portalContainer,
    router,
    dispatchOwner,
    publishRoot(targetId: string): void {
      desired = Object.freeze({
        bootSplash: null,
        title: null,
        story: Object.freeze({
          sourceKind: "application" as const,
          target: targetId === replacementTarget.targetId ? replacementTarget : rootTarget,
        }),
      });
      for (const listener of [...listeners]) listener();
    },
    dispose(): void {
      releasePhysical();
      composition.disposeInternalV1();
      portalContainer.remove();
    },
  });
}

function hostElementInternalV1(harness: ReturnType<typeof hostHarnessInternalV1>) {
  return (
    <WholeCanvasSurfaceHostInternalV1
      binding={harness.binding}
      portalContainer={harness.portalContainer}
      inputRouter={harness.router.router}
    />
  );
}

describe("S4b.1b WholeCanvas React Host", () => {
  it("keeps the preparing renderer inert, then promotes the same instance atomically", async () => {
    const readiness = deferredInternalV1();
    const rendererProps: WholeCanvasSurfaceRendererPropsInternalV1[] = [];
    const Renderer = (props: WholeCanvasSurfaceRendererPropsInternalV1) => {
      rendererProps.push(props);
      return <button type="button" data-testid="whole-owner">Owner</button>;
    };
    const harness = hostHarnessInternalV1({
      prepare: () => readiness.promise,
      renderer: Renderer,
    });
    render(hostElementInternalV1(harness));
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-phase="preparing"]',
      )).not.toBeNull();
    });
    const pendingShell = harness.portalContainer.querySelector<HTMLElement>(
      '[data-whole-canvas-phase="preparing"]',
    )!;
    const pendingRenderer = pendingShell.querySelector<HTMLElement>("[inert]")!;
    expect(pendingShell.hasAttribute("inert")).toBe(false);
    expect(pendingRenderer.getAttribute("aria-hidden")).toBe("true");
    expect(harness.portalContainer.querySelector(
      '[data-whole-canvas-readiness-fallback="primary"]',
    )).not.toBeNull();

    const currentPublication = vi.fn(() => {
      const snapshot = harness.bindingRuntime.getSnapshotInternalV1();
      if (snapshot.root.current === null) return;
      expect(document.activeElement).toBe(pendingShell);
      expect(pendingShell.dataset.wholeCanvasFocusTarget).toBe(
        "surface-focus.whole-canvas.primary",
      );
      expect(harness.router.router.route(Object.freeze({
        kind: "action" as const,
        actionId: parseInputActionIdV1(ownerActionIdInternalV1),
      }))).toEqual({ kind: "handled", context: "whole_canvas" });
    });
    const unsubscribe = harness.bindingRuntime.subscribeInternalV1(currentPublication);
    await act(async () => {
      readiness.resolve();
      await readiness.promise;
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-phase="current"]',
      )).not.toBeNull();
    });
    const currentShell = harness.portalContainer.querySelector<HTMLElement>(
      '[data-whole-canvas-phase="current"]',
    )!;
    expect(currentShell).toBe(pendingShell);
    expect(currentPublication).toHaveBeenCalledTimes(1);
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(rendererProps.at(-1)?.entry)).toBe(true);
    expect(harness.router.router.route(Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(ownerActionIdInternalV1),
    }))).toEqual({ kind: "handled", context: "whole_canvas" });
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(2);
    unsubscribe();
    harness.dispose();
  });

  it("retains the exact current primary while a replacement prepares, then cuts over", async () => {
    const replacement = deferredInternalV1();
    const callbacks = new Map<string, WholeCanvasSurfaceRendererPropsInternalV1["onAction"]>();
    const Renderer = (
      { entry, onAction }: WholeCanvasSurfaceRendererPropsInternalV1,
    ) => {
      const targetId = (entry.resolved.view as Readonly<{ targetId: string }>).targetId;
      callbacks.set(targetId, onAction);
      return (
        <button
          type="button"
          data-testid={`primary-${targetId}`}
          onClick={() => onAction(ownerActionIdInternalV1)}
        >
          {targetId}
        </button>
      );
    };
    const harness = hostHarnessInternalV1({
      prepare: (entry) =>
        (entry.resolved.view as Readonly<{ targetId: string }>).targetId ===
            "test.whole-canvas.replacement"
          ? replacement.promise
          : Promise.resolve(),
      renderer: Renderer,
    });
    render(hostElementInternalV1(harness));
    const initialButton = await waitFor(() =>
      harness.portalContainer.querySelector<HTMLButtonElement>(
        '[data-testid="primary-test.whole-canvas.root"]',
      )!
    );
    const initialShell = initialButton.closest<HTMLElement>(
      '[data-whole-canvas-phase="current"]',
    )!;
    initialButton.focus();
    act(() => harness.publishRoot("test.whole-canvas.replacement"));
    const candidate = await waitFor(() =>
      harness.portalContainer.querySelector<HTMLElement>(
        '[data-whole-canvas-phase="preparing"]',
      )!
    );
    expect(candidate.hasAttribute("inert")).toBe(true);
    expect(harness.portalContainer.querySelector(
      '[data-whole-canvas-readiness-fallback="primary"]',
    )).toBeNull();
    expect(initialButton.closest('[data-whole-canvas-phase="current"]')).toBe(initialShell);
    expect(document.activeElement).toBe(initialButton);
    fireEvent.click(initialButton);
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);

    const cutoverPublication = vi.fn(() => {
      const current = harness.bindingRuntime.getSnapshotInternalV1().root.current;
      if (
        current === null ||
        (current.resolved.view as Readonly<{ targetId: string }>).targetId !==
          "test.whole-canvas.replacement"
      ) return;
      expect(document.activeElement).toBe(candidate);
      expect(candidate.dataset.wholeCanvasFocusTarget).toBe(
        "surface-focus.whole-canvas.primary",
      );
      expect(candidate.querySelector("[inert]")).toBeNull();
      callbacks.get("test.whole-canvas.root")!(ownerActionIdInternalV1);
      expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
      expect(harness.router.router.route(Object.freeze({
        kind: "action" as const,
        actionId: parseInputActionIdV1(ownerActionIdInternalV1),
      }))).toEqual({ kind: "handled", context: "whole_canvas" });
    });
    const unsubscribe = harness.bindingRuntime.subscribeInternalV1(cutoverPublication);
    await act(async () => {
      replacement.resolve();
      await replacement.promise;
      await Promise.resolve();
    });
    const replacementButton = await waitFor(() =>
      harness.portalContainer.querySelector<HTMLButtonElement>(
        '[data-testid="primary-test.whole-canvas.replacement"]',
      )!
    );
    expect(replacementButton.closest('[data-whole-canvas-phase="current"]')).toBe(candidate);
    expect(initialShell.isConnected).toBe(false);
    expect(cutoverPublication).toHaveBeenCalledTimes(1);
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(2);
    unsubscribe();
    harness.dispose();
  });

  it("keeps the exact current primary and focus when replacement readiness fails", async () => {
    const replacement = deferredInternalV1();
    const harness = hostHarnessInternalV1({
      prepare: (entry) =>
        (entry.resolved.view as Readonly<{ targetId: string }>).targetId ===
            "test.whole-canvas.replacement"
          ? replacement.promise
          : Promise.resolve(),
      renderer: ({ entry, onAction }) => (
        <button
          type="button"
          data-testid={(entry.resolved.view as Readonly<{ targetId: string }>).targetId}
          onClick={() => onAction(ownerActionIdInternalV1)}
        >
          primary
        </button>
      ),
    });
    render(hostElementInternalV1(harness));
    const currentButton = await waitFor(() =>
      harness.portalContainer.querySelector<HTMLButtonElement>(
        '[data-testid="test.whole-canvas.root"]',
      )!
    );
    const currentShell = currentButton.closest<HTMLElement>(
      '[data-whole-canvas-phase="current"]',
    )!;
    currentButton.focus();
    act(() => harness.publishRoot("test.whole-canvas.replacement"));
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-phase="preparing"]',
      )).not.toBeNull();
    });
    await act(async () => {
      replacement.reject(new Error("replacement failed"));
      try {
        await replacement.promise;
      } catch {
        // Readiness failures are converted to the retained-current path.
      }
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(harness.bindingRuntime.getSnapshotInternalV1().root.failure).not.toBeNull();
    });
    expect(harness.portalContainer.querySelector(
      '[data-whole-canvas-readiness-failure="true"]',
    )).toBeNull();
    expect(harness.portalContainer.querySelector(
      '[data-testid="test.whole-canvas.replacement"]',
    )).toBeNull();
    expect(currentButton.closest('[data-whole-canvas-phase="current"]')).toBe(currentShell);
    expect(document.activeElement).toBe(currentButton);
    expect(harness.router.router.route(Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1(ownerActionIdInternalV1),
    }))).toEqual({ kind: "handled", context: "whole_canvas" });
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    expect(harness.bindingRuntime.dispatchActionInternalV1(
      harness.bindingRuntime.getSnapshotInternalV1().root.current!.frame,
      ownerActionIdInternalV1,
    )).toMatchObject({ kind: "applied" });
    fireEvent.click(currentButton);
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(3);
    harness.dispose();
  });

  it("focuses failed readiness, traps Tab, and retries with a fresh preparation", async () => {
    const prepare = vi.fn()
      .mockRejectedValueOnce(new Error("prepare failed"))
      .mockResolvedValue(undefined);
    const harness = hostHarnessInternalV1({
      prepare,
      renderer: () => <button type="button">candidate</button>,
    });
    render(hostElementInternalV1(harness));
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-phase="failed"]',
      )).not.toBeNull();
    });
    const failed = harness.portalContainer.querySelector<HTMLElement>(
      '[data-whole-canvas-phase="failed"]',
    )!;
    expect(failed.ownerDocument.activeElement).toBe(failed);
    expect(fireEvent.keyDown(failed, { key: "Tab" })).toBe(false);
    fireEvent.click(failed.querySelector("button")!);
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-phase="current"]',
      )).not.toBeNull();
    });
    expect(prepare).toHaveBeenCalledTimes(2);
    harness.dispose();
  });

  it("blocks the root for detail preparation and restores the exact opener on Back", async () => {
    const detailReady = deferredInternalV1();
    const Renderer = ({ entry, onAction, onBack }: WholeCanvasSurfaceRendererPropsInternalV1) =>
      entry.placement === "primary"
        ? (
          <button
            type="button"
            data-testid="open-detail"
            onClick={() => onAction(openDetailActionIdInternalV1)}
          >
            Open
          </button>
        )
        : <button type="button" data-testid="close-detail" onClick={onBack}>Back</button>;
    const harness = hostHarnessInternalV1({
      prepare: (entry) => entry.placement === "detail" ? detailReady.promise : Promise.resolve(),
      renderer: Renderer,
    });
    render(hostElementInternalV1(harness));
    await waitFor(() => {
      expect(harness.portalContainer.querySelector('[data-testid="open-detail"]')).not.toBeNull();
    });
    const opener = harness.portalContainer.querySelector<HTMLButtonElement>(
      '[data-testid="open-detail"]',
    )!;
    opener.focus();
    fireEvent.click(opener);
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-readiness-fallback="detail"]',
      )).not.toBeNull();
    });
    expect(
      harness.portalContainer.querySelector(
        '[data-whole-canvas-surface="primary"]',
      )?.hasAttribute("inert"),
    ).toBe(true);
    await act(async () => {
      detailReady.resolve();
      await detailReady.promise;
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(harness.portalContainer.querySelector('[data-testid="close-detail"]')).not.toBeNull();
    });
    const closePublication = vi.fn(() => {
      const snapshot = harness.bindingRuntime.getSnapshotInternalV1();
      if (snapshot.detail.current !== null || snapshot.root.current === null) return;
      expect(document.activeElement).toBe(opener);
      expect(harness.router.router.route(Object.freeze({
        kind: "action" as const,
        actionId: parseInputActionIdV1(ownerActionIdInternalV1),
      }))).toEqual({ kind: "handled", context: "whole_canvas" });
    });
    const unsubscribe = harness.bindingRuntime.subscribeInternalV1(closePublication);
    fireEvent.click(harness.portalContainer.querySelector('[data-testid="close-detail"]')!);
    await act(async () => await Promise.resolve());
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-surface="detail"]',
      )).toBeNull();
    });
    expect(opener.ownerDocument.activeElement).toBe(opener);
    expect(closePublication).toHaveBeenCalledTimes(1);
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    unsubscribe();
    harness.dispose();
  });

  it("removes a failed detail fallback and restores the same parent opener", async () => {
    const detailReady = deferredInternalV1();
    const harness = hostHarnessInternalV1({
      prepare: (entry) => entry.placement === "detail" ? detailReady.promise : Promise.resolve(),
      renderer: ({ entry, onAction }) =>
        entry.placement === "primary"
          ? (
            <button
              type="button"
              data-testid="detail-opener"
              onClick={() => onAction(openDetailActionIdInternalV1)}
            >
              Open
            </button>
          )
          : <button type="button">candidate</button>,
    });
    render(hostElementInternalV1(harness));
    const opener = await waitFor(() =>
      harness.portalContainer.querySelector<HTMLButtonElement>(
        '[data-testid="detail-opener"]',
      )!
    );
    const parentShell = opener.closest<HTMLElement>(
      '[data-whole-canvas-surface="primary"]',
    )!;
    opener.focus();
    fireEvent.click(opener);
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-readiness-fallback="detail"]',
      )).not.toBeNull();
    });
    expect(parentShell.hasAttribute("inert")).toBe(true);
    const failurePublication = vi.fn(() => {
      const snapshot = harness.bindingRuntime.getSnapshotInternalV1();
      if (snapshot.detail.failure === null) return;
      expect(document.activeElement).toBe(opener);
      expect(parentShell.hasAttribute("inert")).toBe(false);
      expect(harness.router.router.route(Object.freeze({
        kind: "action" as const,
        actionId: parseInputActionIdV1(ownerActionIdInternalV1),
      }))).toEqual({ kind: "handled", context: "whole_canvas" });
    });
    const unsubscribe = harness.bindingRuntime.subscribeInternalV1(failurePublication);
    await act(async () => {
      detailReady.reject(new Error("detail failed"));
      try {
        await detailReady.promise;
      } catch {
        // The package removes the failed transient candidate.
      }
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(harness.bindingRuntime.getSnapshotInternalV1().detail.failure).not.toBeNull();
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-surface="detail"]',
      )).toBeNull();
      expect(document.activeElement).toBe(opener);
    });
    expect(opener.closest('[data-whole-canvas-surface="primary"]')).toBe(parentShell);
    expect(parentShell.hasAttribute("inert")).toBe(false);
    expect(harness.portalContainer.querySelector(
      '[data-whole-canvas-readiness-failure="true"]',
    )).toBeNull();
    expect(failurePublication).toHaveBeenCalledTimes(1);
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    unsubscribe();
    harness.dispose();
  });

  it("does not publish readiness when the exact focus target is disconnected", async () => {
    const readiness = deferredInternalV1();
    const harness = hostHarnessInternalV1({
      prepare: () => readiness.promise,
      renderer: () => <button type="button">candidate</button>,
    });
    const mounted = render(hostElementInternalV1(harness));
    await waitFor(() => {
      expect(harness.bindingRuntime.getSnapshotInternalV1().root.pending).not.toBeNull();
    });
    harness.portalContainer.remove();
    await act(async () => {
      readiness.resolve();
      await readiness.promise;
      await Promise.resolve();
    });
    expect(harness.bindingRuntime.getSnapshotInternalV1().root.current).toBeNull();
    expect(harness.bindingRuntime.getSnapshotInternalV1().root.pending).not.toBeNull();
    expect(harness.dispatchOwner).not.toHaveBeenCalled();
    mounted.unmount();
    harness.composition.disposeInternalV1();
  });

  it("keeps one physical registration through StrictMode remount and fences old callbacks", async () => {
    const captures: WholeCanvasSurfaceRendererPropsInternalV1[] = [];
    const harness = hostHarnessInternalV1({
      renderer: (props) => {
        captures.push(props);
        return <button type="button">surface</button>;
      },
    });
    const first = render(<StrictMode>{hostElementInternalV1(harness)}</StrictMode>);
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-phase="current"]',
      )).not.toBeNull();
    });
    const oldAction = captures.at(-1)!.onAction;
    first.unmount();
    oldAction(ownerActionIdInternalV1);
    expect(harness.dispatchOwner).not.toHaveBeenCalled();
    const second = render(hostElementInternalV1(harness));
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-phase="current"]',
      )).not.toBeNull();
    });
    captures.at(-1)!.onAction(ownerActionIdInternalV1);
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    expect(harness.router.registrationCount()).toBe(1);
    second.unmount();
    harness.composition.disposeInternalV1();
    captures.at(-1)!.onAction(ownerActionIdInternalV1);
    expect(harness.dispatchOwner).toHaveBeenCalledTimes(1);
    harness.portalContainer.remove();
  });

  it("terminalizes both portals when a distinct Host concurrently claims one binding", async () => {
    const harness = hostHarnessInternalV1({
      renderer: () => <button type="button">surface</button>,
    });
    const first = render(hostElementInternalV1(harness));
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-phase="current"]',
      )).not.toBeNull();
    });
    const second = render(hostElementInternalV1(harness));
    await waitFor(() => {
      expect(harness.bindingRuntime.getSnapshotInternalV1().disposed).toBe(true);
    });
    expect(harness.router.registrationCount()).toBe(0);
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBeNull();
    first.unmount();
    second.unmount();
    harness.portalContainer.remove();
  });

  it("terminalizes a Host whose router does not match the registered physical tuple", async () => {
    const harness = hostHarnessInternalV1({
      renderer: () => <button type="button">surface</button>,
    });
    const mismatched = inputRouterInternalV1();
    const mounted = render(
      <WholeCanvasSurfaceHostInternalV1
        binding={harness.binding}
        portalContainer={harness.portalContainer}
        inputRouter={mismatched.router}
      />,
    );
    await waitFor(() => {
      expect(harness.bindingRuntime.getSnapshotInternalV1().disposed).toBe(true);
    });
    expect(harness.router.registrationCount()).toBe(0);
    expect(mismatched.registrationCount()).toBe(0);
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBeNull();
    mounted.unmount();
    harness.portalContainer.remove();
  });

  it("terminalizes the composition when an active renderer faults", async () => {
    let fault = false;
    const reportFailure = vi.fn();
    const sealFailure = vi.fn();
    const harness = hostHarnessInternalV1({
      renderer: () => {
        if (fault) throw new Error("active renderer failed");
        return <button type="button">surface</button>;
      },
      reportFailure,
      sealFailure,
    });
    const mounted = render(hostElementInternalV1(harness));
    await waitFor(() => {
      expect(harness.portalContainer.querySelector(
        '[data-whole-canvas-phase="current"]',
      )).not.toBeNull();
    });
    fault = true;
    mounted.rerender(hostElementInternalV1(harness));
    await waitFor(() => expect(sealFailure).toHaveBeenCalledTimes(1));
    expect(reportFailure).toHaveBeenCalledTimes(1);
    expect(harness.bindingRuntime.getSnapshotInternalV1().disposed).toBe(true);
    expect(harness.composition.getCurrentHostBindingInternalV1()).toBeNull();
    harness.portalContainer.remove();
  });
});
