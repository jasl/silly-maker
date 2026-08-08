// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { Component, StrictMode, useLayoutEffect, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import { inputHandledV1, systemInputActionIdsV1 } from "../input/contracts.ts";
import { RootErrorBoundaryV1 } from "../errors/root-error-boundary.tsx";
import { createManagedSurfaceCompositionRuntimeInternalV1 } from "../managed-surfaces/managed-surface-composition-runtime.ts";
import type { ManagedSurfacePublicationV1 } from "../managed-surfaces/managed-surface-contracts.ts";
import { GameStageV1 } from "../shell/game-stage.tsx";
import { systemDialogManagedContractInternalV1 } from "./system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogRootCatalogSnapshotInternalV1,
  createSystemDialogSessionFacadeInternalV1,
  type SystemDialogHostAttachmentInternalV1,
  type SystemDialogManagedSessionInternalV1,
  type SystemDialogRootCatalogInternalV1,
} from "./system-dialog-managed-session.ts";
import {
  SystemDialogManagedHostInternalV1,
  type SystemDialogRootRendererPropsInternalV1,
} from "./system-dialog-managed-host.tsx";

const liveFixturesV1: Array<() => void> = [];

afterEach(() => {
  cleanup();
  for (const dispose of liveFixturesV1.splice(0)) dispose();
});

function catalogV1(
  settingsRenderer: object | ((...args: never[]) => unknown),
  savesRenderer?: object | ((...args: never[]) => unknown),
  options?: {
    readonly settingsTitle?: string;
    readonly savesAccessibleName?: string;
    readonly requiredPort?: object;
  },
): SystemDialogRootCatalogInternalV1 {
  const requiredPortId = "synthetic.system_dialog_port";
  const requiredPortIds = options?.requiredPort === undefined
    ? Object.freeze([])
    : Object.freeze([requiredPortId]);
  return createSystemDialogRootCatalogSnapshotInternalV1({
    entries: Object.freeze([
      Object.freeze({
        rootRequest: "settings" as const,
        rendererComponent: settingsRenderer,
        accessibleName: "Managed settings",
        requiredPortIds,
        contentConfig: Object.freeze({
          title: options?.settingsTitle ?? "Settings",
          closeLabel: "Close",
          emptyText: "Empty",
          sections: Object.freeze([]),
        }),
      }),
      ...(savesRenderer === undefined ? [] : [Object.freeze({
        rootRequest: "saves" as const,
        rendererComponent: savesRenderer,
        accessibleName: options?.savesAccessibleName ?? "Managed saves",
        requiredPortIds,
        contentConfig: Object.freeze({
          variant: "custom" as const,
          accessibleName: options?.savesAccessibleName ?? "Managed saves",
          component: savesRenderer,
        }),
      })]),
    ]),
    portBindings: options?.requiredPort === undefined
      ? Object.freeze([])
      : Object.freeze([Object.freeze({
        portId: requiredPortId,
        port: options.requiredPort,
      })]),
  });
}

function fixtureV1() {
  let nextEpoch = 39;
  const inputRouter = createInputRouterV1();
  const runtime = createManagedSurfaceCompositionRuntimeInternalV1({
    epochAllocator: Object.freeze({
      allocate: () => parseNonNegativeSafeInteger(nextEpoch += 2),
    }),
    inputRouter,
    recipe: Object.freeze({
      resolvedOwnerIds: systemDialogManagedContractInternalV1.resolvedOwnerIds,
      resolvedSlotDescriptors: systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
    }),
  });
  const failures: Array<{ readonly code: string; readonly error: unknown }> = [];
  const internal = createSystemDialogManagedSessionInternalV1({
    runtime: runtime.getCurrent(),
    reportFailure: (code, error) => failures.push(Object.freeze({ code, error })),
  });
  const terminalCalls = { ready: 0, fail: 0 };
  const subscriptionCalls = { started: 0, active: 0 };
  const instrumented: SystemDialogManagedSessionInternalV1 = Object.freeze({
    ...internal,
    subscribeInternalV1(listener: () => void) {
      subscriptionCalls.started += 1;
      subscriptionCalls.active += 1;
      const unsubscribeInternal = internal.subscribeInternalV1(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        subscriptionCalls.active -= 1;
        unsubscribeInternal();
      };
    },
    attachHostInternalV1(
      input: Parameters<SystemDialogManagedSessionInternalV1["attachHostInternalV1"]>[0],
    ) {
      const attachment = internal.attachHostInternalV1(input);
      return Object.freeze({
        ...attachment,
        readyCandidateInternalV1(
          surfaceInstanceId: Parameters<
            SystemDialogHostAttachmentInternalV1["readyCandidateInternalV1"]
          >[0],
        ) {
          terminalCalls.ready += 1;
          return attachment.readyCandidateInternalV1(surfaceInstanceId);
        },
        failCandidateInternalV1(
          surfaceInstanceId: Parameters<
            SystemDialogHostAttachmentInternalV1["failCandidateInternalV1"]
          >[0],
          error?: unknown,
        ) {
          terminalCalls.fail += 1;
          return attachment.failCandidateInternalV1(surfaceInstanceId, error);
        },
      }) satisfies SystemDialogHostAttachmentInternalV1;
    },
  });
  const session = createSystemDialogSessionFacadeInternalV1(instrumented);
  let notifications = 0;
  const unsubscribe = runtime.getCurrent().coordinator.subscribe(() => notifications += 1);
  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    internal.disposeInternalV1();
    runtime.dispose();
  };
  liveFixturesV1.push(dispose);
  return {
    runtime,
    internal,
    session,
    inputRouter,
    terminalCalls,
    subscriptionCalls,
    failures,
    notifications: () => notifications,
    dispose,
  };
}

function deltaV1(before: ManagedSurfacePublicationV1, after: ManagedSurfacePublicationV1) {
  return Object.freeze([
    after.publicationRevision - before.publicationRevision,
    after.topologyRevision - before.topologyRevision,
  ]);
}

function StageHarnessV1(props: {
  readonly host: ReactElement;
}): ReactElement {
  return (
    <GameStageV1
      accessibleName="Managed System test stage"
      layers={{
        background: <button type="button">Gameplay</button>,
        character: null,
        sceneInteraction: null,
        hud: null,
        workspaceOverlay: null,
        narrative: null,
        system: props.host,
      }}
    />
  );
}

class CapturedErrorBoundaryV1 extends Component<
  { readonly onError: (error: unknown) => void; readonly children: ReactElement },
  { readonly failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { readonly failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    this.props.onError(error);
  }

  render(): ReactElement | null {
    return this.state.failed ? null : this.props.children;
  }
}

async function drainMicrotaskV1(): Promise<void> {
  await act(async () => {
    await new Promise<void>((complete) => queueMicrotask(complete));
  });
}

async function renderHostV1(input: {
  readonly fixture: ReturnType<typeof fixtureV1>;
  readonly catalog: SystemDialogRootCatalogInternalV1;
  readonly strict?: boolean;
}) {
  const host = (
    <SystemDialogManagedHostInternalV1
      session={input.fixture.session}
      catalog={input.catalog}
      inputRouter={input.fixture.inputRouter}
    />
  );
  const rendered = render(
    <StageHarnessV1 host={input.strict === true ? <StrictMode>{host}</StrictMode> : host} />,
  );
  await waitFor(() => expect(screen.getByTestId("system-dialog-managed-host")).toBeInTheDocument());
  return rendered;
}

describe("dormant managed System Host-commit readiness", () => {
  it("mounts in the System portal and activates the same keyed renderer subtree", async () => {
    const fixture = fixtureV1();
    const gameplayInput = vi.fn(() => inputHandledV1);
    const unregisterGameplay = fixture.inputRouter.register({
      context: "gameplay",
      handle: gameplayInput,
    });
    const mounted = vi.fn();
    const unmounted = vi.fn();
    const renderedCandidate = vi.fn();
    function SettingsRendererV1(): ReactElement {
      renderedCandidate();
      useLayoutEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <input data-testid="managed-settings-renderer" defaultValue="initial" />;
    }
    await renderHostV1({ fixture, catalog: catalogV1(SettingsRendererV1) });
    const before = fixture.internal.getManagedSnapshotInternalV1();
    expect(fixture.notifications()).toBe(0);

    let openResult: ReturnType<typeof fixture.internal.openRootInternalV1> | undefined;
    act(() => {
      openResult = fixture.internal.openRootInternalV1("settings");
    });

    expect(openResult).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    const preparing = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(before, preparing)).toEqual([1, 1]);
    expect(fixture.notifications()).toBe(1);
    expect(fixture.terminalCalls).toEqual({ ready: 0, fail: 0 });
    expect(renderedCandidate).toHaveBeenCalledTimes(1);
    const shell = screen.getByTestId("system-dialog-surface");
    const renderer = screen.getByTestId("managed-settings-renderer") as HTMLInputElement;
    const fallback = screen.getByTestId("system-dialog-fallback");
    const gameplayLayer = screen.getByTestId("stage-background");
    expect(shell.closest('[data-stage-layer="system"]')).not.toBeNull();
    expect(fallback.closest('[data-stage-layer="system"]')).not.toBeNull();
    expect(gameplayLayer).toHaveAttribute("inert");
    expect(fallback).toHaveAttribute("data-blocking-focus-scope", "system");
    expect(fallback).toHaveStyle({ position: "absolute", inset: "0", pointerEvents: "auto" });
    expect(document.activeElement).toBe(fallback);
    expect(fixture.inputRouter.route({
      kind: "viewport_point",
      phase: "activate",
      point: { x: 10, y: 12 },
      pointerId: parseNonNegativeSafeInteger(1),
      pointerType: "mouse",
    })).toEqual({ kind: "handled", context: "system" });
    expect(fixture.inputRouter.route({
      kind: "action",
      actionId: systemInputActionIdsV1.confirm,
    })).toEqual({ kind: "handled", context: "system" });
    expect(gameplayInput).not.toHaveBeenCalled();
    expect(shell).toHaveAttribute("inert");
    expect(shell).toHaveAttribute("aria-hidden", "true");
    expect(shell).not.toHaveAttribute("hidden");
    expect(shell).toHaveStyle({ pointerEvents: "none", visibility: "hidden" });
    expect(shell.style.display).toBe("");
    expect(preparing.inputOwner).toBeNull();
    expect(preparing.focusOwner).toBeNull();
    expect(preparing.navigationTargetInstanceId).toBeNull();
    renderer.value = "preserved";

    await drainMicrotaskV1();

    const active = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(preparing, active)).toEqual([1, 1]);
    expect(fixture.notifications()).toBe(2);
    expect(fixture.terminalCalls).toEqual({ ready: 1, fail: 0 });
    expect(screen.queryByTestId("system-dialog-fallback")).not.toBeInTheDocument();
    expect(gameplayLayer).toHaveAttribute("inert");
    expect(screen.getByTestId("system-dialog-surface")).toBe(shell);
    expect(screen.getByTestId("managed-settings-renderer")).toBe(renderer);
    expect(renderer.value).toBe("preserved");
    expect(shell).not.toHaveAttribute("inert");
    expect(shell).not.toHaveAttribute("aria-hidden");
    expect(shell.style.pointerEvents).toBe("");
    expect(shell.style.visibility).toBe("");
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    expect(renderedCandidate).toHaveBeenCalledTimes(1);
    unregisterGameplay();
  });

  it.each(["render", "constructor", "layout-effect"] as const)(
    "settles a pre-ready %s fault exactly once",
    async (faultKind) => {
      const fixture = fixtureV1();
      const error = new Error(`synthetic candidate ${faultKind} failure`);
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const renderer = faultKind === "render"
        ? function ThrowingRendererV1(): never {
          throw error;
        }
        : faultKind === "constructor"
        ? class ThrowingConstructorRendererV1 extends Component {
          constructor(props: Record<string, never>) {
            super(props);
            throw error;
          }

          render(): ReactElement {
            return <div />;
          }
        }
        : function ThrowingLayoutEffectRendererV1(): ReactElement {
          useLayoutEffect(() => {
            throw error;
          }, []);
          return <div data-testid="layout-fault-renderer" />;
        };
      await renderHostV1({ fixture, catalog: catalogV1(renderer) });
      const before = fixture.internal.getManagedSnapshotInternalV1();
      let openResult: ReturnType<typeof fixture.internal.openRootInternalV1> | undefined;

      act(() => {
        openResult = fixture.internal.openRootInternalV1("settings");
      });
      await drainMicrotaskV1();

      expect(openResult).toMatchObject({ kind: "preparing" });
      const failed = fixture.internal.getManagedSnapshotInternalV1();
      expect(deltaV1(before, failed)).toEqual([2, 2]);
      expect(failed.orderedInstances).toEqual([]);
      expect(failed.preparationFallbacks).toEqual([]);
      expect(fixture.notifications()).toBe(2);
      expect(fixture.terminalCalls).toEqual({ ready: 0, fail: 1 });
      expect(fixture.failures).toEqual([{
        code: "ui.system_dialog_render_preparation_failed",
        error,
      }]);
      consoleError.mockRestore();
    },
  );

  it("treats a null render throw as a terminal pre-ready failure", async () => {
    const fixture = fixtureV1();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    function ThrowingNullRendererV1(): never {
      throw null;
    }
    await renderHostV1({ fixture, catalog: catalogV1(ThrowingNullRendererV1) });
    const before = fixture.internal.getManagedSnapshotInternalV1();

    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();

    const failed = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(before, failed)).toEqual([2, 2]);
    expect(failed.orderedInstances).toEqual([]);
    expect(fixture.terminalCalls).toEqual({ ready: 0, fail: 1 });
    expect(fixture.failures).toEqual([{
      code: "ui.system_dialog_render_preparation_failed",
      error: null,
    }]);
    consoleError.mockRestore();
  });

  it("uses one logical Host lease and one readiness receipt under StrictMode", async () => {
    const fixture = fixtureV1();
    await renderHostV1({
      fixture,
      catalog: catalogV1(() => <div data-testid="strict-renderer" />),
      strict: true,
    });
    const before = fixture.internal.getManagedSnapshotInternalV1();
    expect(fixture.notifications()).toBe(0);

    act(() => {
      expect(fixture.internal.openRootInternalV1("settings")).toMatchObject({ kind: "preparing" });
    });
    await drainMicrotaskV1();

    const active = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(before, active)).toEqual([2, 2]);
    expect(active.orderedInstances[0]?.surfaceInstanceId).toBe("surface-instance.e41.n1");
    expect(fixture.notifications()).toBe(2);
    expect(fixture.terminalCalls).toEqual({ ready: 1, fail: 0 });
    expect(screen.getAllByTestId("strict-renderer")).toHaveLength(1);
  });

  it("suppresses the old acknowledgment while an initial supersede keeps one fallback DOM", async () => {
    const fixture = fixtureV1();
    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div data-testid="superseded-settings" />,
        () => <div data-testid="superseding-saves" />,
      ),
    });
    const gameplayButton = screen.getByRole("button", { name: "Gameplay" });
    gameplayButton.focus();
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    const firstFallback = screen.getByTestId("system-dialog-fallback");
    expect(document.activeElement).toBe(firstFallback);
    expect(firstFallback).toHaveAttribute(
      "data-system-dialog-fallback",
      "surface-instance.e41.n1",
    );

    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });

    const secondFallback = screen.getByTestId("system-dialog-fallback");
    expect(secondFallback).toBe(firstFallback);
    expect(document.activeElement).toBe(firstFallback);
    expect(document.activeElement).not.toBe(gameplayButton);
    expect(secondFallback).toHaveAttribute(
      "data-system-dialog-fallback",
      "surface-instance.e41.n2",
    );
    expect(screen.queryByTestId("superseded-settings")).not.toBeInTheDocument();
    expect(screen.getByTestId("superseding-saves")).toBeInTheDocument();

    await drainMicrotaskV1();

    expect(fixture.terminalCalls).toEqual({ ready: 1, fail: 0 });
    expect(fixture.notifications()).toBe(3);
    expect(fixture.internal.getManagedSnapshotInternalV1().orderedInstances[0]?.surfaceInstanceId)
      .toBe("surface-instance.e41.n2");
  });

  it("restores the exact external focus owner after an initial pre-ready failure", async () => {
    const fixture = fixtureV1();
    let shouldThrow = false;
    const listeners = new Set<() => void>();
    const error = new Error("synthetic pre-ready update failure");
    function ThrowBeforeReadyRendererV1(): ReactElement {
      const faulted = useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => shouldThrow,
        () => false,
      );
      if (faulted) throw error;
      return <div data-testid="pre-ready-update-renderer" />;
    }
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await renderHostV1({ fixture, catalog: catalogV1(ThrowBeforeReadyRendererV1) });
    const gameplayButton = screen.getByRole("button", { name: "Gameplay" });
    gameplayButton.focus();
    const before = fixture.internal.getManagedSnapshotInternalV1();

    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    expect(screen.getByTestId("pre-ready-update-renderer")).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId("system-dialog-fallback"));

    act(() => {
      shouldThrow = true;
      for (const listener of [...listeners]) listener();
    });

    const failed = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(before, failed)).toEqual([2, 2]);
    expect(failed.orderedInstances).toEqual([]);
    expect(screen.queryByTestId("system-dialog-fallback")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(gameplayButton);
    expect(fixture.notifications()).toBe(2);
    expect(fixture.terminalCalls).toEqual({ ready: 0, fail: 1 });
    expect(fixture.failures).toEqual([{
      code: "ui.system_dialog_render_preparation_failed",
      error,
    }]);
    consoleError.mockRestore();
  });

  it("rejects a distinct concurrent Host before replacing the winning catalog", async () => {
    const fixture = fixtureV1();
    const firstCatalog = catalogV1(() => <div data-testid="winning-renderer" />);
    const losingResolver = vi.fn(() => <div data-testid="losing-renderer" />);
    const losingCatalog = catalogV1(losingResolver);
    const firstHost = (
      <SystemDialogManagedHostInternalV1
        key="winning-host"
        session={fixture.session}
        catalog={firstCatalog}
        inputRouter={fixture.inputRouter}
      />
    );
    const rendered = render(<StageHarnessV1 host={firstHost} />);
    await waitFor(() =>
      expect(screen.getByTestId("system-dialog-managed-host")).toBeInTheDocument()
    );
    const beforeConflict = fixture.internal.getManagedSnapshotInternalV1();
    const subscriptionsBeforeConflict = { ...fixture.subscriptionCalls };
    const captured = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    rendered.rerender(
      <StageHarnessV1
        host={
          <>
            {firstHost}
            <CapturedErrorBoundaryV1 onError={captured}>
              <SystemDialogManagedHostInternalV1
                session={fixture.session}
                catalog={losingCatalog}
                inputRouter={fixture.inputRouter}
              />
            </CapturedErrorBoundaryV1>
          </>
        }
      />,
    );

    await waitFor(() => expect(captured).toHaveBeenCalledOnce());
    expect(captured.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ message: "ui.system_dialog_host_lease_conflict" }),
    );
    expect(fixture.internal.getManagedSnapshotInternalV1()).toBe(beforeConflict);
    expect(fixture.notifications()).toBe(0);
    expect(fixture.subscriptionCalls).toEqual(subscriptionsBeforeConflict);
    expect(screen.getAllByTestId("system-dialog-managed-host")).toHaveLength(1);
    act(() => {
      expect(fixture.internal.openRootInternalV1("settings")).toMatchObject({ kind: "preparing" });
    });
    expect(screen.getByTestId("winning-renderer")).toBeInTheDocument();
    expect(screen.queryByTestId("losing-renderer")).not.toBeInTheDocument();
    expect(losingResolver).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the exact active root when a replacement fails before readiness", async () => {
    const fixture = fixtureV1();
    const replacementError = new Error("synthetic replacement failure");
    function SettingsRendererV1(): ReactElement {
      return <input data-testid="retained-settings" defaultValue="A" />;
    }
    function ThrowingSavesRendererV1(): never {
      throw replacementError;
    }
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await renderHostV1({
      fixture,
      catalog: catalogV1(SettingsRendererV1, ThrowingSavesRendererV1),
    });
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    const activeA = fixture.internal.getManagedSnapshotInternalV1();
    const retained = screen.getByTestId("retained-settings") as HTMLInputElement;
    retained.value = "preserved A";
    const inputOwner = activeA.inputOwner;
    const focusOwner = activeA.focusOwner;

    act(() => {
      expect(fixture.internal.openRootInternalV1("saves")).toMatchObject({ kind: "preparing" });
    });
    await drainMicrotaskV1();

    const afterFailure = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(activeA, afterFailure)).toEqual([2, 0]);
    expect(afterFailure.orderedInstances).toHaveLength(1);
    expect(afterFailure.orderedInstances[0]?.surfaceInstanceId).toBe(
      activeA.orderedInstances[0]?.surfaceInstanceId,
    );
    expect(afterFailure.inputOwner).toEqual(inputOwner);
    expect(afterFailure.focusOwner).toEqual(focusOwner);
    expect(screen.getByTestId("retained-settings")).toBe(retained);
    expect(retained.value).toBe("preserved A");
    expect(fixture.terminalCalls).toEqual({ ready: 1, fail: 1 });
    consoleError.mockRestore();
  });

  it("retains A while B prepares and cuts over the same B subtree once", async () => {
    const fixture = fixtureV1();
    const settingsUnmounted = vi.fn();
    const savesMounted = vi.fn();
    const settingsRendered = vi.fn();
    const savesRendered = vi.fn();
    function SettingsRendererV1(): ReactElement {
      settingsRendered();
      useLayoutEffect(() => settingsUnmounted, []);
      return <div data-testid="replacement-settings" />;
    }
    function SavesRendererV1(): ReactElement {
      savesRendered();
      useLayoutEffect(() => {
        savesMounted();
      }, []);
      return <input data-testid="replacement-saves" defaultValue="B" />;
    }
    await renderHostV1({
      fixture,
      catalog: catalogV1(SettingsRendererV1, SavesRendererV1),
    });
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    const activeA = fixture.internal.getManagedSnapshotInternalV1();
    const aElement = screen.getByTestId("replacement-settings");

    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    const preparingB = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(activeA, preparingB)).toEqual([1, 0]);
    expect(preparingB.inputOwner?.surfaceInstanceId).toBe(
      activeA.inputOwner?.surfaceInstanceId,
    );
    expect(preparingB.focusOwner?.surfaceInstanceId).toBe(
      activeA.focusOwner?.surfaceInstanceId,
    );
    expect(screen.getByTestId("replacement-settings")).toBe(aElement);
    expect(screen.queryByTestId("system-dialog-fallback")).not.toBeInTheDocument();
    const bShell = document.querySelector<HTMLDivElement>('[data-system-dialog-root="saves"]')!;
    const bRenderer = screen.getByTestId("replacement-saves") as HTMLInputElement;
    expect(bShell).toHaveAttribute("inert");
    expect(settingsRendered).toHaveBeenCalledTimes(1);
    expect(savesRendered).toHaveBeenCalledTimes(1);
    bRenderer.value = "preserved B";

    await drainMicrotaskV1();

    const activeB = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(preparingB, activeB)).toEqual([1, 1]);
    expect(screen.queryByTestId("replacement-settings")).not.toBeInTheDocument();
    expect(document.querySelector('[data-system-dialog-root="saves"]')).toBe(bShell);
    expect(screen.getByTestId("replacement-saves")).toBe(bRenderer);
    expect(bRenderer.value).toBe("preserved B");
    expect(settingsUnmounted).toHaveBeenCalledOnce();
    expect(savesMounted).toHaveBeenCalledOnce();
    expect(settingsRendered).toHaveBeenCalledTimes(1);
    expect(savesRendered).toHaveBeenCalledTimes(1);
    expect(fixture.terminalCalls).toEqual({ ready: 2, fail: 0 });
  });

  it("closes Host ingress immediately and cancels a pending owner after the detach grace", async () => {
    const fixture = fixtureV1();
    const rendered = await renderHostV1({
      fixture,
      catalog: catalogV1(() => <div data-testid="detach-renderer" />),
    });
    const before = fixture.internal.getManagedSnapshotInternalV1();
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    const preparing = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(before, preparing)).toEqual([1, 1]);

    rendered.unmount();
    expect(fixture.internal.openRootInternalV1("settings")).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_unavailable",
    });
    expect(fixture.internal.getManagedSnapshotInternalV1()).toBe(preparing);
    expect(fixture.terminalCalls).toEqual({ ready: 0, fail: 0 });

    await drainMicrotaskV1();

    const closed = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(preparing, closed)).toEqual([1, 1]);
    expect(closed.orderedInstances).toEqual([]);
    expect(closed.preparationFallbacks).toEqual([]);
    expect(closed.coordinatorDisposed).toBe(false);
    expect(fixture.notifications()).toBe(2);
    expect(fixture.terminalCalls).toEqual({ ready: 0, fail: 0 });
  });

  it("atomically closes an active root and its pending replacement after Host detach", async () => {
    const fixture = fixtureV1();
    const rendered = await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div data-testid="detach-active-settings" />,
        () => <div data-testid="detach-pending-saves" />,
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    const activeAndPending = fixture.internal.getManagedSnapshotInternalV1();
    const notificationsBeforeDetach = fixture.notifications();
    expect(activeAndPending.orderedInstances).toHaveLength(2);
    expect(activeAndPending.inputOwner).not.toBeNull();
    expect(activeAndPending.focusOwner).not.toBeNull();

    rendered.unmount();

    expect(fixture.internal.openRootInternalV1("settings")).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_unavailable",
    });
    expect(fixture.internal.getManagedSnapshotInternalV1()).toBe(activeAndPending);
    expect(fixture.terminalCalls).toEqual({ ready: 1, fail: 0 });

    await drainMicrotaskV1();

    const closed = fixture.internal.getManagedSnapshotInternalV1();
    expect(deltaV1(activeAndPending, closed)).toEqual([1, 1]);
    expect(closed.orderedInstances).toEqual([]);
    expect(closed.preparationFallbacks).toEqual([]);
    expect(closed.inputOwner).toBeNull();
    expect(closed.focusOwner).toBeNull();
    expect(closed.navigationTargetInstanceId).toBeNull();
    expect(closed.coordinatorDisposed).toBe(false);
    expect(fixture.notifications()).toBe(notificationsBeforeDetach + 1);
    expect(fixture.terminalCalls).toEqual({ ready: 1, fail: 0 });
  });

  it("suppresses predecessor acknowledgment and reuses the Host catalog on a successor", async () => {
    const fixture = fixtureV1();
    await renderHostV1({
      fixture,
      catalog: catalogV1(() => <div data-testid="successor-renderer" />),
    });
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    expect(screen.getByTestId("system-dialog-surface")).toHaveAttribute(
      "data-system-dialog-instance",
      "surface-instance.e41.n1",
    );

    act(() => {
      fixture.runtime.replace("coordinator_successor", [fixture.internal]);
    });
    await drainMicrotaskV1();

    expect(fixture.terminalCalls).toEqual({ ready: 0, fail: 0 });
    expect(fixture.internal.getManagedSnapshotInternalV1()).toMatchObject({
      applicationEpoch: 43,
      publicationRevision: 0,
      topologyRevision: 0,
      orderedInstances: [],
    });
    expect(screen.queryByTestId("system-dialog-surface")).not.toBeInTheDocument();

    act(() => {
      expect(fixture.internal.openRootInternalV1("settings")).toMatchObject({ kind: "preparing" });
    });
    await drainMicrotaskV1();
    expect(fixture.terminalCalls).toEqual({ ready: 1, fail: 0 });
    expect(screen.getByTestId("system-dialog-surface")).toHaveAttribute(
      "data-system-dialog-instance",
      "surface-instance.e43.n1",
    );
  });

  it("keeps an R1 candidate frozen while the Host catalog advances to R2", async () => {
    const fixture = fixtureV1();
    const r1Port = Object.freeze({ revision: "R1" });
    const r2Port = Object.freeze({ revision: "R2" });
    const r1Props: SystemDialogRootRendererPropsInternalV1[] = [];
    const r2SavesProps: SystemDialogRootRendererPropsInternalV1[] = [];
    function SettingsR1V1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      r1Props.push(props);
      return <div data-testid="settings-r1" />;
    }
    function SettingsR2V1(): ReactElement {
      return <div data-testid="settings-r2" />;
    }
    function SavesR2V1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      r2SavesProps.push(props);
      return <div data-testid="saves-r2" />;
    }
    const rendered = await renderHostV1({
      fixture,
      catalog: catalogV1(SettingsR1V1, undefined, {
        settingsTitle: "Settings R1",
        requiredPort: r1Port,
      }),
    });
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    const r1Element = screen.getByTestId("settings-r1");

    rendered.rerender(
      <StageHarnessV1
        host={
          <SystemDialogManagedHostInternalV1
            session={fixture.session}
            catalog={catalogV1(SettingsR2V1, SavesR2V1, {
              settingsTitle: "Settings R2",
              savesAccessibleName: "Managed saves R2",
              requiredPort: r2Port,
            })}
            inputRouter={fixture.inputRouter}
          />
        }
      />,
    );
    await drainMicrotaskV1();

    expect(screen.getByTestId("settings-r1")).toBe(r1Element);
    expect(screen.queryByTestId("settings-r2")).not.toBeInTheDocument();
    expect(r1Props).toHaveLength(1);
    expect(r1Props[0]?.contentConfig).toMatchObject({ title: "Settings R1" });
    expect(r1Props[0]?.requiredPortBindings).toEqual([{
      portId: "synthetic.system_dialog_port",
      port: r1Port,
    }]);
    expect(fixture.internal.openRootInternalV1("settings")).toEqual({
      kind: "unchanged",
      code: "system_dialog.already_requested",
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    expect(screen.getByTestId("saves-r2")).toBeInTheDocument();
    expect(r2SavesProps).toHaveLength(1);
    expect(r2SavesProps[0]?.contentConfig).toMatchObject({
      variant: "custom",
      accessibleName: "Managed saves R2",
    });
    expect(r2SavesProps[0]?.requiredPortBindings).toEqual([{
      portId: "synthetic.system_dialog_port",
      port: r2Port,
    }]);
  });

  it("delegates an accepted-ready render fault without sending failure readiness", async () => {
    const fixture = fixtureV1();
    let shouldThrow = false;
    const listeners = new Set<() => void>();
    const crash = (): void => {
      shouldThrow = true;
      for (const listener of [...listeners]) listener();
    };
    function FaultAfterReadyRendererV1(): ReactElement {
      const faulted = useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => shouldThrow,
        () => false,
      );
      if (faulted) throw new Error("synthetic accepted-ready fault");
      return <div data-testid="post-ready-renderer" />;
    }
    const captured = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <RootErrorBoundaryV1
        inputRouter={createInputRouterV1()}
        reportFailure={captured}
        failureDialog={{
          title: "Runtime failure",
          description: "The UI failed.",
          retryLabel: "Retry",
          reloadApplicationLabel: "Reload",
          requestExitLabel: "Exit",
          diagnosticExport: null,
        }}
        recoveryActions={{ reloadApplication: () => undefined, requestExit: null }}
        renderFailure={() => <div data-testid="root-runtime-failure" />}
      >
        <StageHarnessV1
          host={
            <SystemDialogManagedHostInternalV1
              session={fixture.session}
              catalog={catalogV1(FaultAfterReadyRendererV1)}
              inputRouter={fixture.inputRouter}
            />
          }
        />
      </RootErrorBoundaryV1>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("system-dialog-managed-host")).toBeInTheDocument()
    );
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    expect(fixture.terminalCalls).toEqual({ ready: 1, fail: 0 });

    act(crash);
    await waitFor(() => expect(captured).toHaveBeenCalledOnce());
    expect(screen.getByTestId("root-runtime-failure")).toBeInTheDocument();

    expect(captured.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ message: "synthetic accepted-ready fault" }),
    );
    expect(fixture.terminalCalls.fail).toBe(0);
    expect(fixture.failures).toEqual([]);
    consoleError.mockRestore();
  });
});
