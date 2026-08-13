// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";
import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Component,
  StrictMode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import { inputHandledV1, systemInputActionIdsV1 } from "../input/contracts.ts";
import { RootErrorBoundaryV1 } from "../errors/root-error-boundary.tsx";
import { createManagedSurfaceCompositionRuntimeInternalV1 } from "../managed-surfaces/managed-surface-composition-runtime.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfacePublicationV1,
  type ManagedSurfaceResolvedDefinitionV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { GameStageV1 } from "../shell/game-stage.tsx";
import { systemDialogManagedContractInternalV1 } from "./system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogRootCatalogSnapshotInternalV1,
  createSystemDialogSessionFacadeInternalV1,
  type SystemDialogConfirmationOperationBindingInternalV1,
  type SystemDialogConfirmationResultDeliveryInternalV1,
  type SystemDialogHostAttachmentInternalV1,
  type SystemDialogManagedSessionInternalV1,
  type SystemDialogRootCatalogInternalV1,
} from "./system-dialog-managed-session.ts";
import {
  SystemDialogManagedHostInternalV1,
  type SystemDialogConfirmationRendererPropsInternalV1,
  type SystemDialogRootRendererPropsInternalV1,
} from "./system-dialog-managed-host.tsx";

const liveFixturesV1: Array<() => void> = [];
const foreignOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.fixture-foreign");
const foreignSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.fixture-foreign");
const foreignDefinitionV1 = Object.freeze({
  definitionId: parseManagedSurfaceDefinitionIdV1("surface.fixture.foreign"),
  contractRevision: parsePositiveSafeInteger(1),
  ownerId: foreignOwnerIdV1,
  slotId: foreignSlotIdV1,
  layerId: parseManagedSurfaceLayerIdV1("surface-layer.fixture-foreign"),
  layerOrder: parseNonNegativeSafeInteger(50),
  placement: "root",
  modality: "blocking",
  inputPolicy: Object.freeze({ kind: "managed", inputContextId: "overlay" }),
  dismissPolicy: Object.freeze({
    back: true,
    escape: true,
    backdrop: true,
    routedCancel: true,
  }),
  focusPolicy: Object.freeze({
    kind: "owns_focus",
    initialTargetId: parseManagedSurfaceFocusTargetIdV1("surface-focus.fixture-foreign"),
    trap: true,
    restore: "opener",
  }),
  navigationPolicy: Object.freeze({ kind: "close" }),
  actionIds: Object.freeze([parseManagedSurfaceActionIdV1("surface-action.cancel")]),
  readiness: Object.freeze({
    initialOpen: "blocking_fallback",
    primaryReplacement: "retain_current",
    childOpen: "blocking_fallback",
  }),
}) satisfies ManagedSurfaceResolvedDefinitionV1;

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
    readonly confirmationRenderer?: object | ((...args: never[]) => unknown);
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
    ...(options?.confirmationRenderer === undefined ? {} : {
      confirmationEntry: Object.freeze({
        rendererComponent: options.confirmationRenderer,
        accessibleName: "Managed action confirmation",
        requiredPortIds,
      }),
    }),
  });
}

function fixtureV1(options: { readonly foreignFamily?: boolean } = {}) {
  let nextEpoch = 39;
  const inputRouter = createInputRouterV1();
  const runtime = createManagedSurfaceCompositionRuntimeInternalV1({
    epochAllocator: Object.freeze({
      allocate: () => parseNonNegativeSafeInteger(nextEpoch += 2),
    }),
    inputRouter,
    recipe: Object.freeze({
      resolvedOwnerIds: Object.freeze([
        ...systemDialogManagedContractInternalV1.resolvedOwnerIds,
        ...(options.foreignFamily === true ? [foreignOwnerIdV1] : []),
      ]),
      resolvedSlotDescriptors: Object.freeze([
        ...systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
        ...(options.foreignFamily === true
          ? [Object.freeze({
            kind: "root" as const,
            slotId: foreignSlotIdV1,
            cardinality: "single" as const,
          })]
          : []),
      ]),
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
  readonly onGameplayAction?: () => void;
}): ReactElement {
  return (
    <GameStageV1
      accessibleName="Managed System test stage"
      layers={{
        background: <button type="button" onClick={props.onGameplayAction}>Gameplay</button>,
        character: null,
        sceneInteraction: null,
        hud: null,
        narrative: null,
        wholeCanvas: <button type="button">Whole canvas</button>,
        workspaceOverlay: null,
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

function deferredV1<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
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

describe("managed System Host-commit readiness", () => {
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
    const wholeCanvasLayer = screen.getByTestId("stage-whole-canvas");
    expect(shell.closest('[data-stage-layer="system"]')).not.toBeNull();
    expect(fallback.closest('[data-stage-layer="system"]')).not.toBeNull();
    expect(gameplayLayer).toHaveAttribute("inert");
    expect(wholeCanvasLayer).toHaveAttribute("inert");
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

  it("gives only the active root Dialog semantics and a closed focus trap", async () => {
    const fixture = fixtureV1();
    function SettingsRendererV1(): ReactElement {
      return (
        <div>
          <button type="button" data-testid="root-tab-first">First</button>
          <button type="button" data-testid="root-tab-second">Second</button>
          <div data-devdock-surface="system">
            <button type="button" data-testid="root-tab-devdock">DevDock</button>
          </div>
        </div>
      );
    }
    await renderHostV1({ fixture, catalog: catalogV1(SettingsRendererV1) });
    const gameplay = screen.getByRole("button", { name: "Gameplay" });
    gameplay.focus();

    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    const preparingShell = screen.getByTestId("system-dialog-surface");
    expect(preparingShell).not.toHaveAttribute("role");
    expect(document.activeElement).toBe(screen.getByTestId("system-dialog-fallback"));

    await drainMicrotaskV1();

    const dialog = screen.getByRole("dialog", { name: "Managed settings" });
    const first = screen.getByTestId("root-tab-first");
    const second = screen.getByTestId("root-tab-second");
    expect(dialog).toBe(preparingShell);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-blocking-focus-scope", "system");
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: "Tab" });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(second);

    gameplay.focus();
    expect(document.activeElement).toBe(first);
    expect(screen.getByTestId("root-tab-devdock")).not.toHaveFocus();
  });

  it("does not steal keyboard focus from DevDock chrome outside the active dialog", async () => {
    const fixture = fixtureV1();
    function SettingsRendererV1(): ReactElement {
      return <button type="button">Settings action</button>;
    }
    await renderHostV1({ fixture, catalog: catalogV1(SettingsRendererV1) });
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    expect(screen.getByRole("dialog", { name: "Managed settings" })).toBeInTheDocument();

    const dockWindow = document.createElement("div");
    dockWindow.dataset.devdockEscapeOwner = "true";
    dockWindow.dataset.devdockWindow = "cheat-panel";
    const input = document.createElement("input");
    input.type = "text";
    dockWindow.append(input);
    document.body.append(dockWindow);
    input.focus();
    expect(document.activeElement).toBe(input);
    await drainMicrotaskV1();
    expect(document.activeElement).toBe(input);
    dockWindow.remove();
  });

  it("lets content close the exact root and restores its original external focus owner", async () => {
    const fixture = fixtureV1();
    function SettingsRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      return (
        <button
          type="button"
          data-testid="root-explicit-close"
          onClick={() => props.rootIntent.close()}
        >
          Close
        </button>
      );
    }
    await renderHostV1({ fixture, catalog: catalogV1(SettingsRendererV1) });
    const opener = screen.getByRole("button", { name: "Gameplay" });
    opener.focus();
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();

    fireEvent.click(screen.getByTestId("root-explicit-close"));
    await drainMicrotaskV1();

    expect(screen.queryByRole("dialog", { name: "Managed settings" })).not.toBeInTheDocument();
    expect(fixture.internal.getManagedSnapshotInternalV1().orderedInstances).toEqual([]);
    expect(screen.getByTestId("stage-whole-canvas")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-workspace-overlay")).not.toHaveAttribute("inert");
    expect(document.activeElement).toBe(opener);
  });

  it("does not claim System isolation for another managed family", async () => {
    const fixture = fixtureV1({ foreignFamily: true });
    await renderHostV1({ fixture, catalog: catalogV1(() => <div />) });

    const foreign = fixture.runtime.getCurrent().coordinator.openTransientPrimary({
      definition: foreignDefinitionV1,
      semanticOccurrenceId: null,
    });
    act(() => {
      foreign.readiness?.ready();
    });
    await drainMicrotaskV1();

    expect(fixture.internal.getHostRenderSnapshotInternalV1().entries).toEqual([]);
    expect(screen.getByTestId("stage-whole-canvas")).not.toHaveAttribute("inert");
    expect(screen.getByTestId("stage-workspace-overlay")).not.toHaveAttribute("inert");
  });

  it("does not restore an active root return target during terminal disposal", async () => {
    const fixture = fixtureV1();
    render(<button type="button">External predecessor</button>);
    const predecessor = screen.getByRole("button", { name: "External predecessor" });
    predecessor.focus();
    const rendered = await renderHostV1({
      fixture,
      catalog: catalogV1(() => <button type="button">Managed settings target</button>),
    });
    const restoreFocus = vi.spyOn(predecessor, "focus");
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();

    fixture.internal.sealTerminalDisposalInternalV1();
    rendered.unmount();
    await drainMicrotaskV1();

    expect(predecessor.isConnected).toBe(true);
    expect(restoreFocus).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(predecessor);
  });

  it("restores an active root return target after a true Host detach", async () => {
    const fixture = fixtureV1();
    render(<button type="button">External return target</button>);
    const returnTarget = screen.getByRole("button", { name: "External return target" });
    returnTarget.focus();
    const restoreFocus = vi.spyOn(returnTarget, "focus");
    const rendered = await renderHostV1({
      fixture,
      catalog: catalogV1(() => <button type="button">Managed settings target</button>),
    });
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Managed settings target" }),
    );

    rendered.unmount();
    await drainMicrotaskV1();

    expect(returnTarget.isConnected).toBe(true);
    expect(restoreFocus).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(returnTarget);
  });

  it("routes root fallback and active dismissals while fencing only pointer gestures", async () => {
    const fixture = fixtureV1();
    const gameplayAction = vi.fn();
    function SettingsRendererV1(): ReactElement {
      return <button type="button">Settings action</button>;
    }
    const host = (
      <SystemDialogManagedHostInternalV1
        session={fixture.session}
        catalog={catalogV1(SettingsRendererV1)}
        inputRouter={fixture.inputRouter}
      />
    );
    render(<StageHarnessV1 host={host} onGameplayAction={gameplayAction} />);
    await waitFor(() =>
      expect(screen.getByTestId("system-dialog-managed-host")).toBeInTheDocument()
    );
    const opener = screen.getByRole("button", { name: "Gameplay" });
    opener.focus();

    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    const fallback = screen.getByTestId("system-dialog-fallback");
    fireEvent.keyDown(fallback, { key: "Escape" });
    await drainMicrotaskV1();
    expect(screen.queryByTestId("system-dialog-fallback")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);

    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    const dialog = screen.getByRole("dialog", { name: "Managed settings" });
    const devDockTarget = document.createElement("button");
    devDockTarget.dataset.devdockEscapeOwner = "true";
    dialog.append(devDockTarget);
    fireEvent.keyDown(devDockTarget, { key: "Escape" });
    expect(dialog).toBeInTheDocument();

    expect(fixture.inputRouter.route({
      kind: "action",
      actionId: systemInputActionIdsV1.cancel,
    })).toEqual({ kind: "handled", context: "system" });
    await drainMicrotaskV1();
    expect(screen.queryByRole("dialog", { name: "Managed settings" })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);

    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    const backdrop = screen.getByTestId("system-dialog-root-backdrop");
    fireEvent.pointerDown(backdrop, { button: 0, pointerId: 9 });
    fireEvent.pointerUp(backdrop, { button: 0, pointerId: 9 });
    await drainMicrotaskV1();
    expect(screen.queryByRole("dialog", { name: "Managed settings" })).not.toBeInTheDocument();

    const residualPointerClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      detail: 1,
    });
    opener.dispatchEvent(residualPointerClick);
    expect(residualPointerClick.defaultPrevented).toBe(true);
    expect(gameplayAction).not.toHaveBeenCalled();

    const keyboardClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      detail: 0,
    });
    opener.dispatchEvent(keyboardClick);
    expect(keyboardClick.defaultPrevented).toBe(false);
    expect(gameplayAction).toHaveBeenCalledOnce();
  });

  it("keeps the managed root and confirmation shells stage-bounded and scrollable", async () => {
    const css = await readFile(
      resolvePath(import.meta.dirname, "../overlays/overlay-host.module.css"),
      "utf8",
    );

    expect(css).toMatch(/\.blocking-dialog__backdrop\s*\{[^}]*inset:\s*0;/su);
    expect(css).toMatch(/\.blocking-dialog__backdrop\s*\{[^}]*pointer-events:\s*auto;/su);
    expect(css).toMatch(
      /\.blocking-dialog__content\s*\{[^}]*max-block-size:\s*calc\(100% - 2 \* var\(--silly-space-3\)\);/su,
    );
    expect(css).toMatch(/\.blocking-dialog__content\s*\{[^}]*overflow:\s*auto;/su);
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

  it("does not restore a connected predecessor focus owner during terminal fallback disposal", async () => {
    const fixture = fixtureV1();
    render(<button type="button">External predecessor</button>);
    const predecessor = screen.getByRole("button", {
      name: "External predecessor",
    }) as HTMLButtonElement;
    predecessor.focus();
    const restoreFocus = vi.spyOn(predecessor, "focus");
    const rendered = await renderHostV1({ fixture, catalog: catalogV1(() => <div />) });

    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    expect(document.activeElement).toBe(screen.getByTestId("system-dialog-fallback"));

    fixture.internal.sealTerminalDisposalInternalV1();
    rendered.unmount();
    await drainMicrotaskV1();

    expect(predecessor.isConnected).toBe(true);
    expect(restoreFocus).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(predecessor);
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

  it("inherits the external return target across replacement without intermediate restore", async () => {
    const fixture = fixtureV1();
    function SettingsRendererV1(): ReactElement {
      return <button type="button" data-testid="return-target-settings">Settings</button>;
    }
    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      return (
        <button
          type="button"
          data-testid="return-target-saves-close"
          onClick={() => props.rootIntent.close()}
        >
          Close saves
        </button>
      );
    }
    await renderHostV1({
      fixture,
      catalog: catalogV1(SettingsRendererV1, SavesRendererV1),
    });
    const externalOpener = screen.getByRole("button", { name: "Gameplay" });
    externalOpener.focus();
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    const settingsTarget = screen.getByTestId("return-target-settings");
    expect(document.activeElement).toBe(settingsTarget);
    const restoreSpy = vi.spyOn(externalOpener, "focus");

    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    expect(document.activeElement).toBe(settingsTarget);
    expect(restoreSpy).not.toHaveBeenCalled();
    await drainMicrotaskV1();
    expect(document.activeElement).toBe(screen.getByTestId("return-target-saves-close"));
    expect(restoreSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("return-target-saves-close"));
    expect(restoreSpy).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(externalOpener);
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

  it("does not restore a predecessor return target across application-epoch rotation", async () => {
    const fixture = fixtureV1();
    await renderHostV1({
      fixture,
      catalog: catalogV1(() => <button type="button">Managed settings target</button>),
    });
    const predecessorTarget = screen.getByRole("button", { name: "Gameplay" });
    predecessorTarget.focus();
    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    await drainMicrotaskV1();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Managed settings target" }),
    );
    const predecessorFocus = vi.spyOn(predecessorTarget, "focus");

    act(() => {
      fixture.runtime.replace("coordinator_successor", [fixture.internal]);
    });
    await drainMicrotaskV1();

    expect(fixture.internal.getManagedSnapshotInternalV1()).toMatchObject({
      applicationEpoch: 43,
      orderedInstances: [],
    });
    expect(predecessorFocus).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(predecessorTarget);
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

describe("managed System confirmation Host", () => {
  it("exposes only a typed confirmation intent and snapshots request data before transition", async () => {
    const fixture = fixtureV1();
    const operationBinding = Object.freeze({
      dispatch: vi.fn(() =>
        Promise.resolve(Object.freeze({
          kind: "retain_root" as const,
          result: "unused",
        }))
      ),
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    });
    let rootProps: SystemDialogRootRendererPropsInternalV1 | null = null;

    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      rootProps = props;
      return <button type="button" data-testid="snapshot-intent-opener">Open</button>;
    }

    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        { confirmationRenderer: () => <div data-testid="snapshot-intent-child" /> },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const resolvedRootProps = rootProps as SystemDialogRootRendererPropsInternalV1 | null;
    if (resolvedRootProps === null || resolvedRootProps.confirmationIntent === null) {
      throw new TypeError("missing confirmation intent");
    }
    const intent = resolvedRootProps.confirmationIntent;
    const opener = screen.getByTestId("snapshot-intent-opener");
    opener.focus();
    expect(resolvedRootProps).not.toHaveProperty("confirmationLifecycle");
    expect(Object.keys(intent)).toEqual(["requestConfirmationInternalV1"]);

    const beforeInvalid = fixture.internal.getManagedSnapshotInternalV1();
    const throwingRequest = Object.defineProperties({}, {
      invocation: {
        enumerable: true,
        get(): never {
          throw new Error("synthetic request getter failure");
        },
      },
      operationBinding: { enumerable: true, value: operationBinding },
    }) as Parameters<typeof intent.requestConfirmationInternalV1>[0];
    let invalidResult: ReturnType<typeof intent.requestConfirmationInternalV1> | undefined;
    expect(() => {
      act(() => {
        invalidResult = intent.requestConfirmationInternalV1(throwingRequest);
      });
    }).not.toThrow();
    expect(invalidResult).toEqual({
      kind: "rejected",
      code: "system_dialog.confirmation_invocation_invalid",
    });
    expect(fixture.internal.getManagedSnapshotInternalV1()).toBe(beforeInvalid);

    let invocationReads = 0;
    let operationBindingReads = 0;
    const exactRequest = Object.defineProperties({}, {
      invocation: {
        enumerable: true,
        get() {
          invocationReads += 1;
          return Object.freeze({ kind: "import" as const });
        },
      },
      operationBinding: {
        enumerable: true,
        get() {
          operationBindingReads += 1;
          return operationBinding;
        },
      },
    }) as Parameters<typeof intent.requestConfirmationInternalV1>[0];
    let preparingResult: ReturnType<typeof intent.requestConfirmationInternalV1> | undefined;
    act(() => {
      preparingResult = intent.requestConfirmationInternalV1(exactRequest);
    });

    expect(preparingResult).toEqual({
      kind: "preparing",
      code: "system_dialog.confirmation_preparation_started",
    });
    expect(invocationReads).toBe(1);
    expect(operationBindingReads).toBe(1);
    expect(screen.getByTestId("snapshot-intent-child")).toBeInTheDocument();
  });

  it("keeps one child subtree through Host readiness and dispatches at most once", async () => {
    const fixture = fixtureV1();
    const operation = deferredV1<{ readonly kind: "retain_root"; readonly result: string }>();
    const dispatch = vi.fn(() => operation.promise);
    const resultSink = vi.fn();
    const operationBinding: SystemDialogConfirmationOperationBindingInternalV1 = Object.freeze({
      dispatch,
      resultSink,
      finalizeExactRoot: vi.fn(),
    });
    const confirmationRendered = vi.fn();
    const confirmationProps: SystemDialogConfirmationRendererPropsInternalV1[] = [];
    const contentOpenResults: unknown[] = [];

    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      return (
        <div data-testid="managed-saves-content">
          <button type="button">
            Saves initial
          </button>
          <button
            type="button"
            data-testid="confirmation-opener"
            onClick={() => {
              const result = props.confirmationIntent?.requestConfirmationInternalV1({
                invocation: Object.freeze({ kind: "import" }),
                operationBinding,
              });
              contentOpenResults.push(result);
            }}
          >
            Import
          </button>
        </div>
      );
    }
    function ConfirmationRendererV1(
      props: SystemDialogConfirmationRendererPropsInternalV1,
    ): ReactElement {
      confirmationRendered();
      confirmationProps.push(props);
      return (
        <button
          type="button"
          data-testid="managed-confirmation-confirm"
          onClick={() => props.controller.dispatchOnceInternalV1()}
        >
          Confirm
        </button>
      );
    }

    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        { confirmationRenderer: ConfirmationRendererV1 },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const rootShell = document.querySelector<HTMLDivElement>(
      '[data-system-dialog-root="saves"]',
    )!;
    const rootContent = screen.getByTestId("managed-saves-content");
    const opener = screen.getByTestId("confirmation-opener");
    opener.focus();

    fireEvent.click(opener);

    const preparingChild = document.querySelector<HTMLDivElement>(
      '[data-system-dialog-entry="confirmation"]',
    )!;
    const childRenderer = screen.getByTestId("managed-confirmation-confirm");
    const fallback = screen.getByTestId("system-dialog-fallback");
    const preparingSnapshot = fixture.internal.getManagedSnapshotInternalV1();
    const childInstanceId = preparingChild.dataset.systemDialogInstance;
    expect(rootShell).toHaveAttribute("inert");
    expect(rootShell).toHaveAttribute("aria-hidden", "true");
    expect(preparingChild).toHaveAttribute("inert");
    expect(preparingChild).toHaveAttribute("aria-hidden", "true");
    expect(preparingChild).toHaveStyle({ pointerEvents: "none", visibility: "hidden" });
    expect(document.activeElement).toBe(fallback);
    opener.focus();
    expect(document.activeElement).toBe(fallback);
    expect(preparingSnapshot.focusOwner?.surfaceInstanceId).not.toBe(childInstanceId);
    expect(preparingSnapshot.inputOwner?.surfaceInstanceId).not.toBe(childInstanceId);
    expect(fixture.inputRouter.route({
      kind: "action",
      actionId: systemInputActionIdsV1.confirm,
    })).toEqual({ kind: "handled", context: "system" });
    expect(dispatch).not.toHaveBeenCalled();
    expect(confirmationRendered).toHaveBeenCalledTimes(1);
    expect(contentOpenResults).toEqual([{
      kind: "preparing",
      code: "system_dialog.confirmation_preparation_started",
    }]);
    expect(contentOpenResults[0]).not.toHaveProperty("surfaceInstanceId");

    await drainMicrotaskV1();

    expect(screen.queryByTestId("system-dialog-fallback")).not.toBeInTheDocument();
    expect(document.querySelector('[data-system-dialog-entry="confirmation"]')).toBe(
      preparingChild,
    );
    expect(screen.getByTestId("managed-confirmation-confirm")).toBe(childRenderer);
    expect(rootShell).toHaveAttribute("inert");
    expect(rootShell).toHaveAttribute("aria-hidden", "true");
    expect(preparingChild).not.toHaveAttribute("inert");
    expect(document.activeElement).toBe(preparingChild);
    expect(confirmationRendered).toHaveBeenCalledTimes(1);
    expect(confirmationProps[0]?.invocation).toEqual({ kind: "import" });

    expect(fixture.inputRouter.route({
      kind: "action",
      actionId: systemInputActionIdsV1.confirm,
    })).toEqual({ kind: "handled", context: "system" });
    fireEvent.click(childRenderer);
    fireEvent.click(childRenderer);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ kind: "import" });

    expect(fixture.inputRouter.route({
      kind: "action",
      actionId: systemInputActionIdsV1.cancel,
    })).toEqual({ kind: "handled", context: "system" });
    await drainMicrotaskV1();
    expect(document.querySelector('[data-system-dialog-entry="confirmation"]')).toBeNull();
    expect(document.querySelector('[data-system-dialog-root="saves"]')).toBe(rootShell);
    expect(screen.getByTestId("managed-saves-content")).toBe(rootContent);
    expect(rootShell).not.toHaveAttribute("inert");
    expect(document.activeElement).toBe(opener);

    const afterCancel = fixture.internal.getManagedSnapshotInternalV1();
    operation.resolve(Object.freeze({ kind: "retain_root", result: "imported" }));
    await operation.promise;
    await drainMicrotaskV1();
    expect(resultSink).not.toHaveBeenCalled();
    expect(fixture.internal.getManagedSnapshotInternalV1()).toBe(afterCancel);
    expect(document.activeElement).toBe(opener);
  });

  it("restores the exact pointer opener when WebKit leaves focus on the active root shell", async () => {
    const fixture = fixtureV1();
    const operationBinding = Object.freeze({
      dispatch: vi.fn(() =>
        Promise.resolve(Object.freeze({
          kind: "retain_root" as const,
          result: "unused",
        }))
      ),
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    });
    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      return (
        <>
          <button
            type="button"
            data-testid="webkit-pointer-confirmation-opener"
            onClick={() => {
              // WebKit may reach React's target callback after a microtask checkpoint
              // following the delegated capture callback.
              queueMicrotask(() =>
                props.confirmationIntent?.requestConfirmationInternalV1({
                  invocation: Object.freeze({ kind: "discard", slotId: "quick" }),
                  operationBinding,
                })
              );
            }}
          >
            Discard backup
          </button>
          <button type="button" data-testid="webkit-other-pointer-action">
            Other action
          </button>
        </>
      );
    }
    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        { confirmationRenderer: () => <div data-testid="webkit-pointer-confirmation" /> },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const rootShell = document.querySelector<HTMLElement>('[data-system-dialog-root="saves"]')!;
    const opener = screen.getByTestId("webkit-pointer-confirmation-opener");

    fireEvent.pointerDown(opener, { button: 0, pointerId: 11 });
    rootShell.focus();
    expect(document.activeElement).toBe(rootShell);
    fireEvent.pointerUp(opener, { button: 0, pointerId: 11 });
    fireEvent.click(opener, { button: 0, detail: 1 });
    await drainMicrotaskV1();
    expect(screen.getByTestId("webkit-pointer-confirmation")).toBeInTheDocument();

    expect(fixture.inputRouter.route({
      kind: "action",
      actionId: systemInputActionIdsV1.cancel,
    })).toEqual({ kind: "handled", context: "system" });
    await drainMicrotaskV1();

    expect(screen.queryByTestId("webkit-pointer-confirmation")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);

    const otherAction = screen.getByTestId("webkit-other-pointer-action");
    fireEvent.pointerDown(opener, { button: 0, pointerId: 12 });
    fireEvent.pointerDown(otherAction, { button: 0, pointerId: 13 });
    fireEvent.pointerUp(otherAction, { button: 0, pointerId: 13 });
    fireEvent.click(otherAction, { button: 0, detail: 1 });
    otherAction.focus();
    fireEvent.click(opener, { button: 0, detail: 0 });
    await drainMicrotaskV1();
    expect(screen.getByTestId("webkit-pointer-confirmation")).toBeInTheDocument();

    expect(fixture.inputRouter.route({
      kind: "action",
      actionId: systemInputActionIdsV1.cancel,
    })).toEqual({ kind: "handled", context: "system" });
    await drainMicrotaskV1();
    expect(document.activeElement).toBe(otherAction);
  });

  it.each(
    [
      ["reanchor", "manual.1"],
      ["restore", "auto.previous"],
      ["discard", "quick"],
    ] as const,
  )(
    "keeps %s on the shared confirmation child across completion, focus restore, and reentry",
    async (kind, slotId) => {
      const fixture = fixtureV1();
      const operation = deferredV1<{
        readonly kind: "retain_root";
        readonly result: string;
      }>();
      const dispatch = vi.fn(() => operation.promise);
      const resultSink = vi.fn();
      const operationBinding: SystemDialogConfirmationOperationBindingInternalV1 = Object.freeze({
        dispatch,
        resultSink,
        finalizeExactRoot: vi.fn(),
      });
      function SavesRendererV1(
        props: SystemDialogRootRendererPropsInternalV1,
      ): ReactElement {
        return (
          <div data-testid={`${kind}-saves-content`}>
            <button type="button">Saves initial</button>
            <button
              type="button"
              data-testid={`${kind}-confirmation-opener`}
              onClick={() =>
                props.confirmationIntent?.requestConfirmationInternalV1({
                  invocation: Object.freeze({ kind, slotId }),
                  operationBinding,
                })}
            >
              Open {kind}
            </button>
          </div>
        );
      }
      function ConfirmationRendererV1(
        props: SystemDialogConfirmationRendererPropsInternalV1,
      ): ReactElement {
        return (
          <div>
            <output data-testid={`${kind}-captured-invocation`}>
              {`${props.invocation.kind}:${
                "slotId" in props.invocation ? props.invocation.slotId : ""
              }`}
            </output>
            <button
              type="button"
              data-testid={`${kind}-confirmation-confirm`}
              onClick={() => props.controller.dispatchOnceInternalV1()}
            >
              Confirm
            </button>
            <button
              type="button"
              data-testid={`${kind}-confirmation-cancel`}
              onClick={() => props.controller.cancelInternalV1("back")}
            >
              Cancel
            </button>
          </div>
        );
      }

      await renderHostV1({
        fixture,
        catalog: catalogV1(
          () => <div />,
          SavesRendererV1,
          { confirmationRenderer: ConfirmationRendererV1 },
        ),
      });
      act(() => {
        fixture.internal.openRootInternalV1("saves");
      });
      await drainMicrotaskV1();
      const rootShell = document.querySelector<HTMLDivElement>(
        '[data-system-dialog-root="saves"]',
      )!;
      const rootContent = screen.getByTestId(`${kind}-saves-content`);
      const opener = screen.getByTestId(`${kind}-confirmation-opener`);
      opener.focus();
      fireEvent.click(opener);
      const firstChild = document.querySelector<HTMLDivElement>(
        '[data-system-dialog-entry="confirmation"]',
      )!;
      const firstInstanceId = firstChild.dataset.systemDialogInstance;
      await drainMicrotaskV1();

      expect(screen.getByTestId(`${kind}-captured-invocation`)).toHaveTextContent(
        `${kind}:${slotId}`,
      );
      expect(document.activeElement).toBe(firstChild);
      fireEvent.click(screen.getByTestId(`${kind}-confirmation-confirm`));
      fireEvent.click(screen.getByTestId(`${kind}-confirmation-confirm`));
      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledWith({ kind, slotId });

      operation.resolve(Object.freeze({ kind: "retain_root", result: `${kind}-done` }));
      await operation.promise;
      await drainMicrotaskV1();

      expect(resultSink).toHaveBeenCalledWith({ kind: "settled", result: `${kind}-done` });
      expect(document.querySelector('[data-system-dialog-entry="confirmation"]')).toBeNull();
      expect(document.querySelector('[data-system-dialog-root="saves"]')).toBe(rootShell);
      expect(screen.getByTestId(`${kind}-saves-content`)).toBe(rootContent);
      expect(document.activeElement).toBe(opener);

      fireEvent.click(opener);
      const secondChild = document.querySelector<HTMLDivElement>(
        '[data-system-dialog-entry="confirmation"]',
      )!;
      expect(secondChild.dataset.systemDialogInstance).not.toBe(firstInstanceId);
      await drainMicrotaskV1();
      fireEvent.click(screen.getByTestId(`${kind}-confirmation-cancel`));
      await drainMicrotaskV1();

      expect(dispatch).toHaveBeenCalledOnce();
      expect(document.querySelector('[data-system-dialog-entry="confirmation"]')).toBeNull();
      expect(document.activeElement).toBe(opener);
    },
  );

  it("cycles active confirmation Tab within content while excluding DevDock and external targets", async () => {
    const fixture = fixtureV1();
    const operationBinding = Object.freeze({
      dispatch: vi.fn(() =>
        Promise.resolve(Object.freeze({ kind: "retain_root" as const, result: "unused" }))
      ),
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    });

    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      return (
        <button
          type="button"
          data-testid="tab-cycle-opener"
          onClick={() =>
            props.confirmationIntent?.requestConfirmationInternalV1({
              invocation: Object.freeze({ kind: "clear", slotId: "quick" }),
              operationBinding,
            })}
        >
          Open
        </button>
      );
    }
    function ConfirmationRendererV1(): ReactElement {
      return (
        <div>
          <button type="button" data-testid="tab-cycle-first">First</button>
          <button type="button" data-testid="tab-cycle-second">Second</button>
          <div data-devdock-surface="system">
            <button type="button" data-testid="tab-cycle-devdock">DevDock</button>
          </div>
        </div>
      );
    }

    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        { confirmationRenderer: ConfirmationRendererV1 },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const opener = screen.getByTestId("tab-cycle-opener");
    opener.focus();
    fireEvent.click(opener);
    await drainMicrotaskV1();

    const shell = document.querySelector<HTMLDivElement>(
      '[data-system-dialog-entry="confirmation"]',
    )!;
    const first = screen.getByTestId("tab-cycle-first");
    const second = screen.getByTestId("tab-cycle-second");
    expect(document.activeElement).toBe(shell);

    fireEvent.keyDown(shell, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Tab" });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(second);

    screen.getByRole("button", { name: "Gameplay" }).focus();
    expect(document.activeElement).toBe(first);
    expect(screen.getByTestId("tab-cycle-devdock")).not.toHaveFocus();
  });

  it.each([0, 1] as const)(
    "keeps bidirectional Tab inside an active confirmation with %i content targets",
    async (targetCount) => {
      const fixture = fixtureV1();
      const operationBinding = Object.freeze({
        dispatch: vi.fn(() =>
          Promise.resolve(Object.freeze({ kind: "retain_root" as const, result: "unused" }))
        ),
        resultSink: vi.fn(),
        finalizeExactRoot: vi.fn(),
      });
      function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
        return (
          <button
            type="button"
            data-testid="bounded-tab-opener"
            onClick={() =>
              props.confirmationIntent?.requestConfirmationInternalV1({
                invocation: Object.freeze({ kind: "import" }),
                operationBinding,
              })}
          >
            Open
          </button>
        );
      }
      function ConfirmationRendererV1(): ReactElement {
        return targetCount === 0
          ? <div data-testid="bounded-tab-empty" />
          : <button type="button" data-testid="bounded-tab-only">Only</button>;
      }
      await renderHostV1({
        fixture,
        catalog: catalogV1(
          () => <div />,
          SavesRendererV1,
          { confirmationRenderer: ConfirmationRendererV1 },
        ),
      });
      act(() => {
        fixture.internal.openRootInternalV1("saves");
      });
      await drainMicrotaskV1();
      const opener = screen.getByTestId("bounded-tab-opener");
      opener.focus();
      fireEvent.click(opener);
      await drainMicrotaskV1();
      const shell = document.querySelector<HTMLDivElement>(
        '[data-system-dialog-entry="confirmation"]',
      )!;
      const expected = targetCount === 0 ? shell : screen.getByTestId("bounded-tab-only");

      fireEvent.keyDown(shell, { key: "Tab" });
      expect(document.activeElement).toBe(expected);
      fireEvent.keyDown(expected, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(expected);
    },
  );

  it("restores the parent initial target when the exact opener disconnects", async () => {
    const fixture = fixtureV1();
    const dispatch = vi.fn(() =>
      Promise.resolve(Object.freeze({
        kind: "retain_root" as const,
        result: "unused",
      }))
    );
    const operationBinding = Object.freeze({
      dispatch,
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    });
    let savesIntent: SystemDialogRootRendererPropsInternalV1["confirmationIntent"] = null;

    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      savesIntent = props.confirmationIntent;
      return (
        <div>
          <button type="button" data-testid="saves-initial-target">
            Initial
          </button>
          <button
            type="button"
            data-testid="disconnecting-opener"
            onClick={() =>
              props.confirmationIntent?.requestConfirmationInternalV1({
                invocation: Object.freeze({ kind: "clear", slotId: "quick" }),
                operationBinding,
              })}
          >
            Clear
          </button>
        </div>
      );
    }

    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        {
          confirmationRenderer: () => <div data-testid="disconnecting-confirmation" />,
        },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const rootShell = document.querySelector<HTMLDivElement>(
      '[data-system-dialog-root="saves"]',
    )!;
    const initialTarget = screen.getByTestId("saves-initial-target");
    const opener = screen.getByTestId("disconnecting-opener");
    expect(savesIntent).not.toBeNull();
    opener.focus();
    fireEvent.click(opener);
    expect(rootShell).toHaveAttribute("inert");
    expect(rootShell).toHaveAttribute("aria-hidden", "true");
    expect(document.activeElement).toBe(screen.getByTestId("system-dialog-fallback"));
    opener.remove();

    const fallback = screen.getByTestId("system-dialog-fallback");
    fireEvent.pointerDown(fallback, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(fallback, { button: 0, pointerId: 1 });
    await drainMicrotaskV1();

    expect(screen.queryByTestId("disconnecting-confirmation")).not.toBeInTheDocument();
    expect(rootShell).not.toHaveAttribute("inert");
    expect(document.activeElement).toBe(initialTarget);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("lets the exact opener win over a same-root result-summary focus attempt", async () => {
    const fixture = fixtureV1();
    const operation = deferredV1<{ readonly kind: "retain_root"; readonly result: string }>();
    const dispatch = vi.fn(() => operation.promise);
    const resultSink = vi.fn();

    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      const [result, setResult] = useState("");
      const summaryRef = useRef<HTMLParagraphElement>(null);
      const operationBinding = useMemo<SystemDialogConfirmationOperationBindingInternalV1>(
        () =>
          Object.freeze({
            dispatch,
            resultSink(delivery: SystemDialogConfirmationResultDeliveryInternalV1) {
              resultSink(delivery);
              if (delivery.kind === "settled") setResult(String(delivery.result));
            },
            finalizeExactRoot: vi.fn(),
          }),
        [],
      );
      useLayoutEffect(() => {
        if (result !== "") summaryRef.current?.focus({ preventScroll: true });
      }, [result]);
      return (
        <div>
          <button type="button">
            Initial
          </button>
          <button
            type="button"
            data-testid="completion-opener"
            onClick={() =>
              props.confirmationIntent?.requestConfirmationInternalV1({
                invocation: Object.freeze({ kind: "clear", slotId: "quick" }),
                operationBinding,
              })}
          >
            Load
          </button>
          <p ref={summaryRef} tabIndex={-1} data-testid="operation-result-summary">
            {result}
          </p>
        </div>
      );
    }
    function ConfirmationRendererV1(
      props: SystemDialogConfirmationRendererPropsInternalV1,
    ): ReactElement {
      return (
        <button
          type="button"
          data-testid="completion-confirm"
          onClick={() => props.controller.dispatchOnceInternalV1()}
        >
          Confirm
        </button>
      );
    }

    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        { confirmationRenderer: ConfirmationRendererV1 },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const rootShell = document.querySelector<HTMLDivElement>(
      '[data-system-dialog-root="saves"]',
    )!;
    const opener = screen.getByTestId("completion-opener");
    opener.focus();
    fireEvent.click(opener);
    await drainMicrotaskV1();
    fireEvent.click(screen.getByTestId("completion-confirm"));
    operation.resolve(Object.freeze({ kind: "retain_root", result: "cleared" }));
    await operation.promise;
    await drainMicrotaskV1();

    expect(resultSink).toHaveBeenCalledOnce();
    expect(resultSink).toHaveBeenCalledWith({ kind: "settled", result: "cleared" });
    expect(screen.getByTestId("operation-result-summary")).toHaveTextContent("cleared");
    expect(document.querySelector('[data-system-dialog-root="saves"]')).toBe(rootShell);
    expect(document.activeElement).toBe(opener);
  });

  it("fails a child layout commit once and restores its exact opener without replacing the root", async () => {
    const fixture = fixtureV1();
    const failure = new Error("synthetic confirmation layout failure");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const operationBinding = Object.freeze({
      dispatch: vi.fn(() =>
        Promise.resolve(Object.freeze({
          kind: "retain_root" as const,
          result: "unused",
        }))
      ),
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    });
    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      return (
        <div>
          <button type="button">
            Initial
          </button>
          <input data-testid="failure-root-state" defaultValue="preserved" />
          <button
            type="button"
            data-testid="failure-child-opener"
            onClick={() =>
              props.confirmationIntent?.requestConfirmationInternalV1({
                invocation: Object.freeze({ kind: "clear", slotId: "quick" }),
                operationBinding,
              })}
          >
            Clear
          </button>
        </div>
      );
    }
    function ThrowingConfirmationRendererV1(): ReactElement {
      useLayoutEffect(() => {
        throw failure;
      }, []);
      return <div data-testid="failing-confirmation" />;
    }
    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        { confirmationRenderer: ThrowingConfirmationRendererV1 },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const rootShell = document.querySelector<HTMLDivElement>(
      '[data-system-dialog-root="saves"]',
    )!;
    const rootInstanceId = rootShell.dataset.systemDialogInstance;
    const rootState = screen.getByTestId("failure-root-state") as HTMLInputElement;
    rootState.value = "local state retained";
    const opener = screen.getByTestId("failure-child-opener");
    opener.focus();

    fireEvent.click(opener);
    await drainMicrotaskV1();

    expect(screen.queryByTestId("failing-confirmation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("system-dialog-fallback")).not.toBeInTheDocument();
    expect(document.querySelector('[data-system-dialog-root="saves"]')).toBe(rootShell);
    expect(rootShell).toHaveAttribute("data-system-dialog-instance", rootInstanceId);
    expect(rootShell).not.toHaveAttribute("inert");
    expect(screen.getByTestId("failure-root-state")).toBe(rootState);
    expect(rootState.value).toBe("local state retained");
    expect(document.activeElement).toBe(opener);
    expect(fixture.terminalCalls).toEqual({ ready: 1, fail: 1 });
    expect(fixture.failures).toEqual([{
      code: "ui.system_dialog_render_preparation_failed",
      error: failure,
    }]);
    consoleError.mockRestore();
  });

  it.each(["escape", "backdrop"] as const)(
    "closes only the active child through DOM %s and restores its opener",
    async (dismissKind) => {
      const fixture = fixtureV1();
      const dispatch = vi.fn(() =>
        Promise.resolve(Object.freeze({
          kind: "retain_root" as const,
          result: "unused",
        }))
      );
      const operationBinding = Object.freeze({
        dispatch,
        resultSink: vi.fn(),
        finalizeExactRoot: vi.fn(),
      });
      function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
        return (
          <div>
            <button type="button">
              Initial
            </button>
            <button
              type="button"
              data-testid="dom-dismiss-opener"
              onClick={() =>
                props.confirmationIntent?.requestConfirmationInternalV1({
                  invocation: Object.freeze({ kind: "import" }),
                  operationBinding,
                })}
            >
              Import
            </button>
          </div>
        );
      }
      await renderHostV1({
        fixture,
        catalog: catalogV1(
          () => <div />,
          SavesRendererV1,
          { confirmationRenderer: () => <div data-testid="dom-dismiss-child" /> },
        ),
      });
      act(() => {
        fixture.internal.openRootInternalV1("saves");
      });
      await drainMicrotaskV1();
      const rootShell = document.querySelector<HTMLDivElement>(
        '[data-system-dialog-root="saves"]',
      )!;
      const opener = screen.getByTestId("dom-dismiss-opener");
      opener.focus();
      fireEvent.click(opener);
      await drainMicrotaskV1();
      const childShell = document.querySelector<HTMLDivElement>(
        '[data-system-dialog-entry="confirmation"]',
      )!;

      if (dismissKind === "escape") {
        fireEvent.keyDown(childShell, { key: "Escape" });
      } else {
        const backdrop = screen.getByTestId("system-dialog-confirmation-backdrop");
        expect(backdrop).toHaveAttribute(
          "data-system-dialog-backdrop",
          "action_confirmation",
        );
        fireEvent.pointerDown(backdrop, { button: 0, pointerId: 1 });
        fireEvent.pointerUp(backdrop, { button: 0, pointerId: 1 });
      }
      await drainMicrotaskV1();

      expect(screen.queryByTestId("dom-dismiss-child")).not.toBeInTheDocument();
      expect(document.querySelector('[data-system-dialog-root="saves"]')).toBe(rootShell);
      expect(rootShell).not.toHaveAttribute("inert");
      expect(document.activeElement).toBe(opener);
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it("suppresses a queued exact-child focus restore after terminal disposal seals", async () => {
    const fixture = fixtureV1();
    const operationBinding = Object.freeze({
      dispatch: vi.fn(() =>
        Promise.resolve(Object.freeze({
          kind: "retain_root" as const,
          result: "unused",
        }))
      ),
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    });
    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      return (
        <button
          type="button"
          data-testid="terminal-child-opener"
          onClick={() =>
            props.confirmationIntent?.requestConfirmationInternalV1({
              invocation: Object.freeze({ kind: "import" }),
              operationBinding,
            })}
        >
          Import
        </button>
      );
    }
    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        { confirmationRenderer: () => <div data-testid="terminal-child" /> },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const opener = screen.getByTestId("terminal-child-opener") as HTMLButtonElement;
    opener.focus();
    fireEvent.click(opener);
    await drainMicrotaskV1();
    const restoreFocus = vi.spyOn(opener, "focus");
    const childShell = document.querySelector<HTMLDivElement>(
      '[data-system-dialog-entry="confirmation"]',
    )!;

    fireEvent.keyDown(childShell, { key: "Escape" });
    fixture.internal.sealTerminalDisposalInternalV1();
    await drainMicrotaskV1();

    expect(screen.queryByTestId("terminal-child")).not.toBeInTheDocument();
    expect(opener.isConnected).toBe(true);
    expect(restoreFocus).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(opener);
  });

  it("fences a residual pointer click after backdrop dismissal without swallowing keyboard activation", async () => {
    const fixture = fixtureV1();
    const keyboardAction = vi.fn();
    const openCount = vi.fn();
    const operationBinding = Object.freeze({
      dispatch: vi.fn(() =>
        Promise.resolve(Object.freeze({ kind: "retain_root" as const, result: "unused" }))
      ),
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    });
    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      return (
        <div>
          <button
            type="button"
            data-testid="gesture-child-opener"
            onClick={() => {
              openCount();
              props.confirmationIntent?.requestConfirmationInternalV1({
                invocation: Object.freeze({ kind: "import" }),
                operationBinding,
              });
            }}
          >
            Import
          </button>
          <button type="button" data-testid="gesture-keyboard-action" onClick={keyboardAction}>
            Keyboard action
          </button>
        </div>
      );
    }
    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        { confirmationRenderer: () => <div data-testid="gesture-confirmation" /> },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const opener = screen.getByTestId("gesture-child-opener");
    opener.focus();
    fireEvent.click(opener);
    await drainMicrotaskV1();
    expect(openCount).toHaveBeenCalledOnce();

    const backdrop = screen.getByTestId("system-dialog-confirmation-backdrop");
    fireEvent.pointerDown(backdrop, { button: 0, pointerId: 7 });
    fireEvent.pointerUp(backdrop, { button: 0, pointerId: 7 });
    await drainMicrotaskV1();
    expect(screen.queryByTestId("gesture-confirmation")).not.toBeInTheDocument();

    const keyboardClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      detail: 0,
    });
    screen.getByTestId("gesture-keyboard-action").dispatchEvent(keyboardClick);
    expect(keyboardClick.defaultPrevented).toBe(false);
    expect(keyboardAction).toHaveBeenCalledOnce();

    const residualPointerClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      detail: 1,
    });
    opener.dispatchEvent(residualPointerClick);
    expect(residualPointerClick.defaultPrevented).toBe(true);
    expect(openCount).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("gesture-confirmation")).not.toBeInTheDocument();
  });

  it("does not restore a child opener while an exact root replacement retires the subtree", async () => {
    const fixture = fixtureV1();
    const operationBinding = Object.freeze({
      dispatch: vi.fn(() =>
        Promise.resolve(Object.freeze({
          kind: "retain_root" as const,
          result: "unused",
        }))
      ),
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    });
    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      return (
        <button
          type="button"
          data-testid="replacement-child-opener"
          onClick={() =>
            props.confirmationIntent?.requestConfirmationInternalV1({
              invocation: Object.freeze({ kind: "import" }),
              operationBinding,
            })}
        >
          Import
        </button>
      );
    }
    await renderHostV1({
      fixture,
      catalog: catalogV1(
        () => <div data-testid="replacement-settings-root" />,
        SavesRendererV1,
        { confirmationRenderer: () => <div data-testid="replacement-child" /> },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const opener = screen.getByTestId("replacement-child-opener") as HTMLButtonElement;
    const rootShell = opener.closest<HTMLElement>('[data-system-dialog-root="saves"]')!;
    fireEvent.pointerDown(opener, { button: 0, pointerId: 12 });
    rootShell.focus();
    fireEvent.pointerUp(opener, { button: 0, pointerId: 12 });
    fireEvent.click(opener, { button: 0, detail: 1 });
    await drainMicrotaskV1();
    expect(screen.getByTestId("replacement-child")).toBeInTheDocument();
    const focusOpener = vi.spyOn(opener, "focus");

    act(() => {
      fixture.internal.openRootInternalV1("settings");
    });
    expect(screen.getByTestId("replacement-child")).toBeInTheDocument();
    await drainMicrotaskV1();

    expect(screen.getByTestId("replacement-settings-root")).toBeInTheDocument();
    expect(screen.queryByTestId("replacement-child")).not.toBeInTheDocument();
    expect(screen.queryByTestId("replacement-child-opener")).not.toBeInTheDocument();
    expect(focusOpener).not.toHaveBeenCalled();
  });

  it("keeps child readiness and dispatch terminal-once under StrictMode", async () => {
    const fixture = fixtureV1();
    const dispatch = vi.fn(() =>
      Promise.resolve(Object.freeze({
        kind: "retain_root" as const,
        result: "done",
      }))
    );
    const operationBinding = Object.freeze({
      dispatch,
      resultSink: vi.fn(),
      finalizeExactRoot: vi.fn(),
    });
    let confirmationIntent: SystemDialogRootRendererPropsInternalV1["confirmationIntent"] = null;
    function SavesRendererV1(props: SystemDialogRootRendererPropsInternalV1): ReactElement {
      confirmationIntent = props.confirmationIntent;
      return <button type="button" data-testid="strict-child-opener">Open</button>;
    }
    function ConfirmationRendererV1(
      props: SystemDialogConfirmationRendererPropsInternalV1,
    ): ReactElement {
      return (
        <button
          type="button"
          data-testid="strict-child-confirm"
          onClick={() => props.controller.dispatchOnceInternalV1()}
        >
          Confirm
        </button>
      );
    }
    await renderHostV1({
      fixture,
      strict: true,
      catalog: catalogV1(
        () => <div />,
        SavesRendererV1,
        { confirmationRenderer: ConfirmationRendererV1 },
      ),
    });
    act(() => {
      fixture.internal.openRootInternalV1("saves");
    });
    await drainMicrotaskV1();
    const opener = screen.getByTestId("strict-child-opener");
    opener.focus();
    act(() => {
      confirmationIntent?.requestConfirmationInternalV1({
        invocation: Object.freeze({ kind: "import" }),
        operationBinding,
      });
    });
    await drainMicrotaskV1();
    fireEvent.click(screen.getByTestId("strict-child-confirm"));
    fireEvent.click(screen.getByTestId("strict-child-confirm"));
    await drainMicrotaskV1();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(fixture.terminalCalls).toEqual({ ready: 2, fail: 0 });
  });
});
