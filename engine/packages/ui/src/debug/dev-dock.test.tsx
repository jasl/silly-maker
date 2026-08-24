// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseInputActionIdV1 } from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import { GameShell } from "../shell/game-shell.tsx";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CapabilityPanelV1 } from "./capability-panel.tsx";
import { DebugCommandPanelV1 } from "./debug-command-panel.tsx";
import { DevDockV1, createDevDockContributionSetV1 } from "./dev-dock.tsx";
import type { DevDockPanelV1 } from "./dev-dock.tsx";
import { createDevDockControlV1 } from "./dev-dock-control.ts";
import type { DevDockControlV1 } from "./dev-dock-control.ts";
import { StoryDebugDockV1 } from "./story-debug-dock.tsx";
import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createPresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import type { PresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import { DiagnosticInspectorV1 } from "./diagnostic-inspector.tsx";
import { FixtureBrowserV1 } from "./fixture-browser.tsx";
import {
  useAuxiliarySurfacePortalTargetRegistrationV1,
  type AuxiliarySurfacePortalSurfaceV1,
} from "../shell/auxiliary-surface-portal.tsx";
import { OverlayHostV1 } from "../overlays/overlay-host.tsx";
import {
  createLocalManagedSurfaceEpochAllocatorInternalV1,
  createManagedSurfaceCompositionRuntimeInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import {
  createWorkspaceOverlaySessionConfigurationInternalV1,
  createWorkspaceOverlaySessionInternalV1,
  defineWorkspaceOverlayV1,
} from "../overlays/workspace-overlay-session.ts";
import { SettingsLauncherV1 } from "../system/settings-launcher.tsx";
import { SystemDialogHostV1 } from "../system/system-dialog-host.tsx";
import { systemDialogManagedContractInternalV1 } from "../system/system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogSessionFacadeInternalV1,
} from "../system/system-dialog-managed-session.ts";

afterEach(cleanup);

function createDeferredV1<T>() {
  let resolveDeferred!: (value: T | PromiseLike<T>) => void;
  let rejectDeferred!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolveDeferred = resolvePromise;
    rejectDeferred = rejectPromise;
  });
  return Object.freeze({ promise, reject: rejectDeferred, resolve: resolveDeferred });
}

function createCapabilityFixtureV1(input: {
  readonly debugTools: boolean;
  readonly cheats: boolean;
  readonly automationBridge?: boolean;
}) {
  let current = Object.freeze({
    debugTools: input.debugTools,
    cheats: input.cheats,
    automationBridge: input.automationBridge ?? false,
  });
  const listeners = new Set<() => void>();
  const setEnabled = vi.fn(async (capability: string, enabled: boolean) => {
    const field = capability === "debug_tools"
      ? "debugTools"
      : capability === "cheats"
      ? "cheats"
      : "automationBridge";
    current = Object.freeze({ ...current, [field]: enabled });
    for (const listener of [...listeners]) listener();
    return Object.freeze({ kind: "updated" as const, state: current });
  });
  return {
    port: Object.freeze({
      state: Object.freeze({
        getCurrent: () => current,
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      }),
      setEnabled,
    }),
    publish(next: {
      readonly debugTools: boolean;
      readonly cheats: boolean;
      readonly automationBridge: boolean;
    }) {
      current = Object.freeze({ ...next });
      for (const listener of [...listeners]) listener();
    },
    setEnabled,
  };
}

function emptyLayersV1(content: ReactNode = null) {
  return Object.freeze({
    background: null,
    character: null,
    sceneInteraction: null,
    hud: content,
    narrative: null,
    wholeCanvas: null,
    workspaceOverlay: null,
    system: null,
  });
}

function DevDockHarnessV1(props: {
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
  readonly contributions?: ReturnType<typeof createDevDockContributionSetV1>;
  readonly control?: DevDockControlV1;
  readonly freeze?: PresentationFreezePortV1;
  readonly stageActivation?: () => void;
  readonly semanticDispatch?: () => void;
}): ReactElement {
  const inputRouterRef = useRef(createInputRouterV1());
  const contributions = props.contributions ??
    createDevDockContributionSetV1(Object.freeze({ panels: [] }));
  return (
    <div onClick={props.stageActivation}>
      <GameShell
        accessibleName="测试舞台"
        layers={emptyLayersV1()}
        inputRouter={inputRouterRef.current}
        auxiliarySurface={
          <DevDockV1
            capabilities={props.capabilities}
            contributions={contributions}
            inputRouter={inputRouterRef.current}
            {...(props.control === undefined ? {} : { control: props.control })}
            {...(props.freeze === undefined ? {} : { freeze: props.freeze })}
          />
        }
      />
      <button type="button" onClick={props.semanticDispatch}>
        语义动作
      </button>
    </div>
  );
}

function DebugLauncherAndWindowsV1(props: {
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
  readonly contributions?: ReturnType<typeof createDevDockContributionSetV1>;
  readonly control?: DevDockControlV1;
  readonly freeze?: PresentationFreezePortV1;
  readonly position?: "top_right" | "top_left" | "bottom_right" | "bottom_left";
}): ReactElement {
  const localControlRef = useRef<DevDockControlV1 | null>(null);
  if (props.control === undefined && localControlRef.current === null) {
    localControlRef.current = createDevDockControlV1();
  }
  const control = props.control ?? localControlRef.current as DevDockControlV1;
  return (
    <>
      <StoryDebugDockV1
        visible
        capabilities={props.capabilities}
        control={control}
        grantCapabilitiesOnOpen={false}
        {...(props.freeze === undefined ? {} : { presentationFreeze: props.freeze })}
        {...(props.position === undefined ? {} : { position: props.position })}
      />
      <DevDockV1
        capabilities={props.capabilities}
        contributions={props.contributions ??
          createDevDockContributionSetV1({ panels: [] })}
        inputRouter={props.inputRouter}
        control={control}
        {...(props.freeze === undefined ? {} : { freeze: props.freeze })}
        {...(props.position === undefined ? {} : { position: props.position })}
      />
    </>
  );
}

type SyntheticBlockingSurfaceKindV1 = "overlay" | "narrative" | "system" | "fault_pause";

function SyntheticBlockingSurfaceV1(props: {
  readonly kind: SyntheticBlockingSurfaceKindV1;
  readonly onClose: () => void;
  readonly opener: HTMLButtonElement | null;
}): ReactElement {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  // Production surfaces no longer adopt the dock; only fault pause does.
  useAuxiliarySurfacePortalTargetRegistrationV1(
    "fault_pause",
    props.kind === "fault_pause" ? target : null,
  );
  useLayoutEffect(() => {
    target?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => props.opener?.focus();
  }, [props.opener, target]);
  return (
    <div
      ref={setTarget}
      data-blocking-focus-scope={props.kind}
      role="dialog"
      aria-label={props.kind}
    >
      <button type="button" onClick={props.onClose}>
        关闭阻塞界面
      </button>
    </div>
  );
}

function BlockingSurfaceHarnessV1(props: {
  readonly kind: SyntheticBlockingSurfaceKindV1;
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null);
  const inputRouterRef = useRef(createInputRouterV1());
  const surface = open
    ? (
      <SyntheticBlockingSurfaceV1
        kind={props.kind}
        onClose={() => setOpen(false)}
        opener={opener}
      />
    )
    : null;
  const layers = Object.freeze({
    ...emptyLayersV1(),
    workspaceOverlay: props.kind === "overlay" ? surface : null,
    narrative: props.kind === "narrative" ? surface : null,
    system: props.kind === "system" || props.kind === "fault_pause" ? surface : null,
  });
  return (
    <>
      <button ref={setOpener} type="button" onClick={() => setOpen(true)}>
        打开阻塞界面
      </button>
      <GameShell
        accessibleName="焦点测试舞台"
        layers={layers}
        inputRouter={inputRouterRef.current}
        auxiliarySurface={
          <DebugLauncherAndWindowsV1
            capabilities={props.capabilities}
            inputRouter={inputRouterRef.current}
          />
        }
      />
    </>
  );
}

function StaticPortalTargetV1(props: {
  readonly kind: AuxiliarySurfacePortalSurfaceV1;
  readonly children?: ReactNode;
}): ReactElement {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  useAuxiliarySurfacePortalTargetRegistrationV1(props.kind, target);
  return (
    <div ref={setTarget} data-blocking-focus-scope={props.kind}>
      {props.children}
    </div>
  );
}

function PriorityHarnessV1(props: {
  readonly surfaces: readonly AuxiliarySurfacePortalSurfaceV1[];
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
  readonly control?: DevDockControlV1;
  readonly contributions?: ReturnType<typeof createDevDockContributionSetV1>;
}): ReactElement {
  const inputRouterRef = useRef(createInputRouterV1());
  const targets = props.surfaces.map((surface) => (
    <StaticPortalTargetV1 key={surface} kind={surface} />
  ));
  return (
    <>
      <button type="button">无关焦点</button>
      <GameShell
        accessibleName="优先级测试舞台"
        layers={Object.freeze({ ...emptyLayersV1(), system: <>{targets}</> })}
        inputRouter={inputRouterRef.current}
        auxiliarySurface={
          <DebugLauncherAndWindowsV1
            capabilities={props.capabilities}
            inputRouter={inputRouterRef.current}
            {...(props.control === undefined ? {} : { control: props.control })}
            {...(props.contributions === undefined ? {} : { contributions: props.contributions })}
          />
        }
      />
    </>
  );
}

function RealOverlayEscapeHarnessV1(props: {
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
}): ReactElement {
  const inputRouterRef = useRef(createInputRouterV1());
  const overlayFixtureRef = useRef<ReturnType<typeof createRealOverlayFixtureV1> | null>(null);
  if (overlayFixtureRef.current === null) {
    overlayFixtureRef.current = createRealOverlayFixtureV1(inputRouterRef.current);
  }
  const { rendererResolver, runtimeOwner, session } = overlayFixtureRef.current;
  useLayoutEffect(
    () => () => {
      session.detachRuntimeInternalV1();
      runtimeOwner.dispose();
      session.disposeInternalV1();
    },
    [runtimeOwner, session],
  );
  return (
    <GameShell
      accessibleName="真实 Overlay Escape 测试舞台"
      inputRouter={inputRouterRef.current}
      layers={Object.freeze({
        ...emptyLayersV1(),
        hud: (
          <button type="button" onClick={() => session.openPrimary("overlay.test.devdock")}>
            打开真实背包
          </button>
        ),
        workspaceOverlay: (
          <OverlayHostV1
            session={session}
            rendererResolver={rendererResolver}
            inputRouter={inputRouterRef.current}
            closeLabel="关闭真实背包"
          />
        ),
      })}
      auxiliarySurface={
        <DebugLauncherAndWindowsV1
          capabilities={props.capabilities}
          inputRouter={inputRouterRef.current}
        />
      }
    />
  );
}

function createRealOverlayFixtureV1(inputRouter: ReturnType<typeof createInputRouterV1>) {
  type OverlayIdV1 = "overlay.test.devdock";
  const rendererResolver = Object.freeze({
    resolve: (overlayId: OverlayIdV1) =>
      overlayId === "overlay.test.devdock"
        ? Object.freeze({
          accessibleName: "真实背包",
          content: <p>背包内容</p>,
          prepare: () => undefined,
        })
        : null,
  });
  const configuration = createWorkspaceOverlaySessionConfigurationInternalV1<OverlayIdV1>({
    definitions: Object.freeze([
      defineWorkspaceOverlayV1({ id: "overlay.test.devdock", contractRevision: 1 }),
    ]),
  });
  const runtimeOwner = createManagedSurfaceCompositionRuntimeInternalV1({
    inputRouter,
    epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
    recipe: configuration.recipeContribution,
  });
  const session = createWorkspaceOverlaySessionInternalV1<OverlayIdV1>({
    runtime: runtimeOwner.getCurrent(),
    configuration,
  });
  return Object.freeze({ rendererResolver, runtimeOwner, session });
}

function createRealSystemFixtureV1(inputRouter: ReturnType<typeof createInputRouterV1>) {
  const runtimeOwner = createManagedSurfaceCompositionRuntimeInternalV1({
    inputRouter,
    epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
    recipe: Object.freeze({
      resolvedOwnerIds: systemDialogManagedContractInternalV1.resolvedOwnerIds,
      resolvedSlotDescriptors: systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
    }),
  });
  const internal = createSystemDialogManagedSessionInternalV1({
    runtime: runtimeOwner.getCurrent(),
  });
  return Object.freeze({
    session: createSystemDialogSessionFacadeInternalV1(internal),
    dispose(): void {
      internal.disposeInternalV1();
      runtimeOwner.dispose();
    },
  });
}

function RealSystemEscapeHarnessV1(props: {
  readonly capabilities: ReturnType<typeof createCapabilityFixtureV1>["port"];
}): ReactElement {
  const inputRouterRef = useRef(createInputRouterV1());
  const systemFixtureRef = useRef<ReturnType<typeof createRealSystemFixtureV1> | null>(null);
  systemFixtureRef.current ??= createRealSystemFixtureV1(inputRouterRef.current);
  const systemFixture = systemFixtureRef.current;
  useLayoutEffect(() => () => systemFixture.dispose(), [systemFixture]);
  return (
    <GameShell
      accessibleName="真实 System Escape 测试舞台"
      inputRouter={inputRouterRef.current}
      layers={Object.freeze({
        ...emptyLayersV1(),
        system: (
          <SystemDialogHostV1
            session={systemFixture.session}
            inputRouter={inputRouterRef.current}
            settings={Object.freeze({
              title: "真实设置",
              closeLabel: "关闭真实设置",
              sections: Object.freeze([<section key="fixture">设置内容</section>]),
              emptyText: "没有设置",
            })}
          >
            <SettingsLauncherV1 label="打开真实设置" />
          </SystemDialogHostV1>
        ),
      })}
      auxiliarySurface={
        <DebugLauncherAndWindowsV1
          capabilities={props.capabilities}
          inputRouter={inputRouterRef.current}
        />
      }
    />
  );
}

describe("DevDockV1", () => {
  it("mounts no debug chrome while debug_tools is disabled", () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: false, cheats: false });
    render(<DevDockHarnessV1 capabilities={capabilities.port} />);

    expect(screen.queryByRole("button", { name: "调试" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: /调试/u })).not.toBeInTheDocument();
  });

  it.each(["overlay", "narrative", "system"] as const)(
    "keeps the chip out of the %s focus scope while staying fully operable",
    async (surface) => {
      const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
      const user = userEvent.setup();
      render(<BlockingSurfaceHarnessV1 kind={surface} capabilities={capabilities.port} />);

      const opener = screen.getByRole("button", { name: "打开阻塞界面" });
      await user.click(opener);
      const chip = await screen.findByRole("button", { name: "调试" });
      // Privileged chrome: the chip never re-parents into game surfaces.
      expect(chip.closest("[data-blocking-focus-scope]")).toBeNull();

      await user.click(chip);
      expect(screen.getByRole("group", { name: "调试" })).toBeVisible();
      await user.keyboard("{Escape}");
      expect(chip).toHaveFocus();
      expect(screen.getByRole("dialog", { name: surface })).toBeVisible();

      await user.click(screen.getByRole("button", { name: "关闭阻塞界面" }));
      expect(opener).toHaveFocus();
    },
  );

  it("re-parents into the terminal fault_pause surface and restores both focus layers", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const user = userEvent.setup();
    render(<BlockingSurfaceHarnessV1 kind="fault_pause" capabilities={capabilities.port} />);

    const opener = screen.getByRole("button", { name: "打开阻塞界面" });
    await user.click(opener);
    const chip = await screen.findByRole("button", { name: "调试" });
    expect(chip.closest("[data-blocking-focus-scope]")).toHaveAttribute(
      "data-blocking-focus-scope",
      "fault_pause",
    );

    await user.click(chip);
    expect(screen.getByRole("group", { name: "调试" })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(chip).toHaveFocus();
    expect(screen.getByRole("dialog", { name: "fault_pause" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "关闭阻塞界面" }));
    expect(opener).toHaveFocus();
  });

  it("keeps Escape inside debug chrome and leaves a real Radix Overlay its own Escape", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const user = userEvent.setup();
    render(<RealOverlayEscapeHarnessV1 capabilities={capabilities.port} />);

    const opener = screen.getByRole("button", { name: "打开真实背包" });
    await user.click(opener);
    const chip = await screen.findByRole("button", { name: "调试" });
    await user.click(chip);
    expect(screen.getByRole("group", { name: "调试" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "真实背包" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "调试" })).not.toBeInTheDocument();
    expect(chip).toHaveFocus();

    // Escape while focus stays on debug chrome never drives the game.
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "真实背包" })).toBeVisible();
    expect(chip).toHaveFocus();

    // Back in the game surface, the overlay's own Escape dismissal works.
    screen.getByRole("button", { name: "关闭真实背包" }).focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "真实背包" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("keeps Escape inside debug chrome and leaves a real managed System dialog its own Escape", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const user = userEvent.setup();
    render(<RealSystemEscapeHarnessV1 capabilities={capabilities.port} />);

    const opener = screen.getByRole("button", { name: "打开真实设置" });
    await user.click(opener);
    expect(await screen.findByRole("dialog", { name: "真实设置" })).toBeVisible();
    const chip = await screen.findByRole("button", { name: "调试" });
    await user.click(chip);
    expect(screen.getByRole("group", { name: "调试" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "真实设置" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "调试" })).not.toBeInTheDocument();
    expect(chip).toHaveFocus();

    // Escape while focus stays on debug chrome never drives the game.
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "真实设置" })).toBeVisible();
    expect(chip).toHaveFocus();

    // Back in the game surface, the dialog's own Escape dismissal works.
    screen.getByRole("button", { name: "关闭真实设置" }).focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "真实设置" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("only fault_pause claims the launcher and release returns it to the base layer", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const rendered = render(
      <PriorityHarnessV1 capabilities={capabilities.port} surfaces={["fault_pause"]} />,
    );
    const unrelatedFocus = screen.getByRole("button", { name: "无关焦点" });
    unrelatedFocus.focus();

    const launcherScope = () =>
      screen
        .getByRole("button", { name: "调试" })
        .closest("[data-blocking-focus-scope]")
        ?.getAttribute("data-blocking-focus-scope") ?? "base";
    await waitFor(() => expect(launcherScope()).toBe("fault_pause"));

    rendered.rerender(<PriorityHarnessV1 capabilities={capabilities.port} surfaces={[]} />);
    await waitFor(() => expect(launcherScope()).toBe("base"));

    expect(screen.getByRole("button", { name: "调试" })).toBeVisible();
    expect(screen.queryByRole("group", { name: /调试/u })).not.toBeInTheDocument();
    expect(unrelatedFocus).toHaveFocus();
  });

  it("refocuses an open window when fault_pause adopts and re-parents its DOM", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const control = createDevDockControlV1();
    const contributions = createDevDockContributionSetV1({
      panels: [
        {
          id: "panel.focus",
          side: "left",
          title: "焦点面板",
          authority: "read_only",
          render: () => <p>焦点内容</p>,
        },
      ],
    });
    control.open("panel.focus");
    const rendered = render(
      <PriorityHarnessV1
        capabilities={capabilities.port}
        surfaces={[]}
        control={control}
        contributions={contributions}
      />,
    );
    const dockWindow = await screen.findByRole("dialog", { name: "焦点面板" });
    const close = within(dockWindow).getByRole("button", { name: "关闭" });
    expect(close).toHaveAttribute("data-devdock-window-close", "true");
    expect(close).toHaveAttribute("aria-label", "关闭");
    expect(close).not.toHaveTextContent("关闭焦点面板");
    expect(dockWindow.closest("[data-blocking-focus-scope]")).toBeNull();
    await waitFor(() => expect(close).toHaveFocus());

    rendered.rerender(
      <PriorityHarnessV1
        capabilities={capabilities.port}
        surfaces={["fault_pause"]}
        control={control}
        contributions={contributions}
      />,
    );
    const movedWindow = await screen.findByRole("dialog", { name: "焦点面板" });
    const movedClose = within(movedWindow).getByRole("button", { name: "关闭" });
    await waitFor(() =>
      expect(movedWindow.closest("[data-blocking-focus-scope]")).toHaveAttribute(
        "data-blocking-focus-scope",
        "fault_pause",
      )
    );
    await waitFor(() => expect(movedClose).toHaveFocus());

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "焦点面板" })).not.toBeInTheDocument();
    expect(control.openPanelIds.getCurrent()).toEqual([]);
    expect(screen.getByRole("button", { name: "调试" })).toHaveFocus();
  });

  it("owns Escape before an injected Story field can stop propagation", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "story.form",
          side: "left",
          title: "Story 表单",
          authority: "read_only",
          render: () => (
            <input
              aria-label="Story 字段"
              onKeyDown={(event) => event.stopPropagation()}
              type="text"
            />
          ),
        },
      ],
    });
    const control = createDevDockControlV1();
    control.open("story.form");
    function Harness(): ReactElement {
      const inputRouterRef = useRef(createInputRouterV1());
      return (
        <GameShell
          accessibleName="测试舞台"
          layers={emptyLayersV1()}
          inputRouter={inputRouterRef.current}
          auxiliarySurface={
            <DebugLauncherAndWindowsV1
              capabilities={capabilities.port}
              inputRouter={inputRouterRef.current}
              contributions={panels}
              control={control}
            />
          }
        />
      );
    }
    render(<Harness />);
    const field = await screen.findByRole("textbox", { name: "Story 字段" });
    field.focus();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Story 表单" })).not.toBeInTheDocument();
    expect(control.openPanelIds.getCurrent()).toEqual([]);
    expect(screen.getByRole("button", { name: "调试" })).toHaveFocus();
  });

  it("shows read-only panels without cheats and never calls a mutating operation", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const queryDiagnostics = vi.fn(async () =>
      Object.freeze({
        kind: "diagnostics" as const,
        entries: Object.freeze([Object.freeze({ id: "revision", label: "当前修订", value: "7" })]),
      })
    );
    const executeDebugCommand = vi.fn(async () =>
      Object.freeze({ kind: "handled" as const, message: "调试命令已执行" })
    );
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "diagnostics",
          side: "left",
          title: "诊断",
          authority: "read_only",
          render: () => (
            <DiagnosticInspectorV1
              queryDiagnostics={queryDiagnostics}
              classification={Object.freeze({ kind: "restorable" as const })}
              onRestore={() => undefined}
            />
          ),
        },
        {
          id: "command",
          side: "left",
          title: "执行调试命令",
          authority: "cheat",
          render: () => (
            <DebugCommandPanelV1
              fields={<span>命令字段</span>}
              command={Object.freeze({ kind: "synthetic" as const })}
              executeDebugCommand={executeDebugCommand}
              canExecute={false}
              disabledReason="需要启用作弊功能"
            />
          ),
        },
      ],
    });
    const control = createDevDockControlV1();
    control.open("diagnostics");
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        control={control}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "诊断摘要" }));
    expect(queryDiagnostics).toHaveBeenCalledOnce();
    expect(await screen.findByText("当前修订：7")).toBeVisible();
    expect(executeDebugCommand).not.toHaveBeenCalled();
  });

  it("omits the cheat authority reason when every panel is read-only", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "diagnostics",
          side: "left",
          title: "诊断",
          authority: "read_only",
          render: () => <p>只读诊断</p>,
        },
      ],
    });
    const control = createDevDockControlV1();
    control.open("diagnostics");
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        control={control}
      />,
    );

    expect(await screen.findByText("只读诊断")).toBeVisible();
    expect(screen.queryByText("需要启用作弊功能")).not.toBeInTheDocument();
  });

  it("consumes debug input without dispatching through the stage", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: true });
    const stageActivation = vi.fn();
    const semanticDispatch = vi.fn();
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "fixtures",
          side: "right",
          title: "夹具",
          authority: "read_only",
          render: () => <p>夹具面板</p>,
        },
      ],
    });
    const control = createDevDockControlV1();
    control.open("fixtures");
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        control={control}
        stageActivation={stageActivation}
        semanticDispatch={semanticDispatch}
      />,
    );

    stageActivation.mockClear();
    expect(stageActivation).not.toHaveBeenCalled();
    expect(semanticDispatch).not.toHaveBeenCalled();

    // Clicks inside the floating window never leak to the stage…
    const dockWindow = await screen.findByRole("dialog", { name: "夹具" });
    await userEvent.click(within(dockWindow).getByText("夹具面板"));
    expect(stageActivation).not.toHaveBeenCalled();
    expect(semanticDispatch).not.toHaveBeenCalled();

    // …while the game around the windows stays interactive: the dock root
    // is no longer a full-canvas shield.
    const dockRoot = document.querySelector<HTMLElement>("[data-devdock-surface]");
    expect(dockRoot).not.toBeNull();
    if (dockRoot === null) throw new TypeError("missing DevDock root");
    await userEvent.click(dockRoot);
    expect(stageActivation).toHaveBeenCalled();

    const packageRelativePath = process.cwd().endsWith(`${sep}engine${sep}packages${sep}ui`);
    const css = await readFile(
      resolve(
        process.cwd(),
        packageRelativePath
          ? "src/debug/dev-dock.module.css"
          : "engine/packages/ui/src/debug/dev-dock.module.css",
      ),
      "utf8",
    );
    expect(css).not.toMatch(/data-devdock-open="true"\]\s*\{[^}]*pointer-events:\s*auto/gu);
    expect(css).toMatch(/\.dev-dock__window\s*\{[^}]*pointer-events:\s*auto/gu);
  });

  it("registers debug input above gameplay only while focus sits inside a tool window", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: true });
    const gameplay = vi.fn(() => Object.freeze({ kind: "handled" as const }));
    const inputRouter = createInputRouterV1();
    inputRouter.register({ context: "gameplay", handle: gameplay });
    const control = createDevDockControlV1();
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "panel.input",
          side: "left",
          title: "输入面板",
          authority: "read_only",
          render: () => <input aria-label="输入字段" type="text" />,
        },
      ],
    });
    function Harness(): ReactElement {
      return (
        <>
          <GameShell
            accessibleName="输入测试舞台"
            layers={emptyLayersV1()}
            inputRouter={inputRouter}
            auxiliarySurface={
              <DevDockV1
                capabilities={capabilities.port}
                contributions={panels}
                inputRouter={inputRouter}
                control={control}
              />
            }
          />
          <button type="button">外部焦点</button>
        </>
      );
    }
    render(<Harness />);
    const event = Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1("ui.debug.synthetic"),
    });

    expect(inputRouter.route(event)).toEqual({ kind: "handled", context: "gameplay" });
    act(() => control.open("panel.input"));
    // The window auto-focuses its first control, so debug input isolation
    // engages immediately…
    await screen.findByRole("textbox", { name: "输入字段" });
    await waitFor(() =>
      expect(inputRouter.route(event)).toEqual({ kind: "handled", context: "debug" })
    );
    // …and releases as soon as focus leaves the window: the game stays
    // playable next to an open tool window.
    gameplay.mockClear();
    const outside = screen.getByRole("button", { name: "外部焦点" });
    outside.focus();
    await waitFor(() =>
      expect(inputRouter.route(event)).toEqual({ kind: "handled", context: "gameplay" })
    );
    expect(screen.getByRole("dialog", { name: "输入面板" })).toBeVisible();
  });

  it("releases debug input isolation when the focused window closes", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: true });
    const gameplay = vi.fn(() => Object.freeze({ kind: "handled" as const }));
    const inputRouter = createInputRouterV1();
    inputRouter.register({ context: "gameplay", handle: gameplay });
    const control = createDevDockControlV1();
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "panel.input",
          side: "left",
          title: "输入面板",
          authority: "read_only",
          render: () => <input aria-label="输入字段" type="text" />,
        },
      ],
    });
    function Harness(): ReactElement {
      return (
        <GameShell
          accessibleName="关闭隔离测试舞台"
          layers={emptyLayersV1()}
          inputRouter={inputRouter}
          auxiliarySurface={
            <DevDockV1
              capabilities={capabilities.port}
              contributions={panels}
              inputRouter={inputRouter}
              control={control}
            />
          }
        />
      );
    }
    render(<Harness />);
    const event = Object.freeze({
      kind: "action" as const,
      actionId: parseInputActionIdV1("ui.debug.synthetic"),
    });
    act(() => control.open("panel.input"));
    await screen.findByRole("textbox", { name: "输入字段" });
    await waitFor(() =>
      expect(inputRouter.route(event)).toEqual({ kind: "handled", context: "debug" })
    );
    act(() => control.close("panel.input"));
    await waitFor(() =>
      expect(inputRouter.route(event)).toEqual({ kind: "handled", context: "gameplay" })
    );
  });

  it("distinguishes an empty authorized fixture list from capability revocation", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const listFixtures = vi
      .fn()
      .mockResolvedValueOnce(Object.freeze({ kind: "listed" as const, fixtureIds: [] }))
      .mockResolvedValueOnce(Object.freeze({ kind: "capability_disabled" as const }));
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "fixtures",
          side: "left",
          title: "夹具",
          authority: "read_only",
          render: () => (
            <FixtureBrowserV1
              listFixtures={listFixtures}
              inspectFixture={() => undefined}
              anchorFixture={async () => Object.freeze({ kind: "capability_disabled" as const })}
              canAnchor={false}
              disabledReason="需要启用作弊功能"
            />
          ),
        },
      ],
    });
    const control = createDevDockControlV1();
    control.open("fixtures");
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        control={control}
      />,
    );

    expect(await screen.findByText("没有可用夹具")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "刷新夹具" }));
    expect(await screen.findByText("调试工具已关闭")).toBeVisible();
  });

  it("projects validation and fault anchor results without reporting a false success", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: true });
    const storyAnchorFixture = vi
      .fn()
      .mockResolvedValueOnce(Object.freeze({ kind: "validation_failed" as const }))
      .mockResolvedValueOnce(Object.freeze({ kind: "faulted" as const }));
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "fixtures",
          side: "left",
          title: "夹具",
          authority: "read_only",
          render: () => (
            <FixtureBrowserV1
              listFixtures={async () =>
                Object.freeze({ kind: "listed" as const, fixtureIds: ["fixture.one"] as const })}
              inspectFixture={() => undefined}
              anchorFixture={async (fixtureId) => {
                const result = await storyAnchorFixture(fixtureId);
                return Object.freeze({
                  kind: "rejected" as const,
                  message: result.kind === "faulted" ? "夹具执行故障" : "夹具验证失败",
                });
              }}
              canAnchor
              disabledReason=""
            />
          ),
        },
      ],
    });
    const user = userEvent.setup();
    const control = createDevDockControlV1();
    control.open("fixtures");
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        control={control}
      />,
    );

    const anchor = await screen.findByRole("button", { name: "载入夹具 fixture.one" });
    await user.click(anchor);
    expect(await screen.findByRole("alert")).toHaveTextContent("夹具验证失败");
    expect(screen.queryByText("夹具已载入")).not.toBeInTheDocument();

    await user.click(anchor);
    expect(await screen.findByRole("alert")).toHaveTextContent("夹具执行故障");
    expect(screen.queryByText("夹具已载入")).not.toBeInTheDocument();
  });

  it("closes open windows before capability revocation removes the host", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const control = createDevDockControlV1();
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "panel.revoke",
          side: "left",
          title: "撤销面板",
          authority: "read_only",
          render: () => <p>撤销内容</p>,
        },
      ],
    });
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        control={control}
      />,
    );
    act(() => control.open("panel.revoke"));
    expect(await screen.findByRole("dialog", { name: "撤销面板" })).toBeVisible();

    act(() => capabilities.publish({ debugTools: false, cheats: false, automationBridge: false }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "撤销面板" })).not.toBeInTheDocument()
    );
    expect(control.openPanelIds.getCurrent()).toEqual([]);

    act(() => capabilities.publish({ debugTools: true, cheats: false, automationBridge: false }));
    expect(screen.queryByRole("dialog", { name: "撤销面板" })).not.toBeInTheDocument();
    expect(document.querySelector("[data-devdock-surface]")).toBeNull();
  });

  it("anchors windows to the configured corner and expands upward from the bottom", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    function PositionHarness(): ReactElement {
      const inputRouterRef = useRef(createInputRouterV1());
      return (
        <GameShell
          accessibleName="位置测试舞台"
          layers={emptyLayersV1()}
          inputRouter={inputRouterRef.current}
          auxiliarySurface={
            <DebugLauncherAndWindowsV1
              capabilities={capabilities.port}
              inputRouter={inputRouterRef.current}
              position="bottom_right"
            />
          }
        />
      );
    }
    render(<PositionHarness />);
    const launcher = document.querySelector("[data-story-debug-dock]");
    expect(launcher).toHaveAttribute("data-devdock-position", "bottom_right");
    await userEvent.click(screen.getByRole("button", { name: "调试" }));
    expect(screen.getByRole("group", { name: "调试" })).toBeVisible();
    const packageRelativePath = process.cwd().endsWith(`${sep}engine${sep}packages${sep}ui`);
    const windowCss = await readFile(
      resolve(
        process.cwd(),
        packageRelativePath
          ? "src/debug/dev-dock.module.css"
          : "engine/packages/ui/src/debug/dev-dock.module.css",
      ),
      "utf8",
    );
    const launcherCss = await readFile(
      resolve(
        process.cwd(),
        packageRelativePath
          ? "src/debug/story-debug-dock.module.css"
          : "engine/packages/ui/src/debug/story-debug-dock.module.css",
      ),
      "utf8",
    );
    expect(launcherCss).toMatch(
      /\.story-debug-dock\[data-devdock-position="bottom_right"\]\s*\{[^}]*flex-direction:\s*column-reverse/u,
    );
    expect(windowCss).toMatch(
      /data-devdock-position="bottom_right"\]\s+\.dev-dock__window,[\s\S]*?\{\s*inset-block-end:/u,
    );
  });

  it("renders windows without the chip for a Story-driven dock and honors early opens", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const control = createDevDockControlV1();
    // A Story dock may open a lazily loaded panel before it registers; the
    // window appears once the contribution arrives.
    control.open("panel.lazy");
    const rendered = render(
      <DevDockHarnessV1 capabilities={capabilities.port} control={control} />,
    );
    expect(screen.queryByRole("button", { name: "调试" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "延迟面板" })).not.toBeInTheDocument();

    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "panel.lazy",
          side: "left",
          title: "延迟面板",
          authority: "read_only",
          render: () => <p>延迟内容</p>,
        },
      ],
    });
    rendered.rerender(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        control={control}
        contributions={panels}
      />,
    );
    expect(await screen.findByRole("dialog", { name: "延迟面板" })).toBeVisible();
    expect(control.panels.getCurrent().map(({ id }) => id)).toEqual(["panel.lazy"]);
    expect(screen.queryByRole("button", { name: "调试" })).not.toBeInTheDocument();
    expect(document.querySelector("[data-devdock-surface]")).not.toBeNull();

    act(() => control.close("panel.lazy"));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "延迟面板" })).not.toBeInTheDocument()
    );
    expect(document.querySelector("[data-devdock-surface]")).toBeNull();
  });

  it("engages the freeze while a frozen-stage panel window is open", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const freeze = createPresentationFreezePortV1({ inner: createManualPresentationClockV1() });
    const control = createDevDockControlV1();
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "panel.frame",
          side: "left",
          title: "帧检视",
          authority: "read_only",
          stage: "frozen",
          render: () => <p>帧内容</p>,
        },
      ],
    });
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        control={control}
        freeze={freeze}
      />,
    );
    expect(freeze.state.getCurrent().frozen).toBe(false);

    act(() => control.open("panel.frame"));
    expect(await screen.findByRole("dialog", { name: "帧检视" })).toBeVisible();
    expect(freeze.state.getCurrent().frozen).toBe(true);

    act(() => control.close("panel.frame"));
    await waitFor(() => expect(freeze.state.getCurrent().frozen).toBe(false));
  });

  it("releases the freeze when capability revocation tears the dock down", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const freeze = createPresentationFreezePortV1({ inner: createManualPresentationClockV1() });
    const control = createDevDockControlV1();
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "panel.frame",
          side: "left",
          title: "帧检视",
          authority: "read_only",
          stage: "frozen",
          render: () => <p>帧内容</p>,
        },
      ],
    });
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        control={control}
        freeze={freeze}
      />,
    );
    act(() => control.open("panel.frame"));
    expect(await screen.findByRole("dialog", { name: "帧检视" })).toBeVisible();
    expect(freeze.state.getCurrent().frozen).toBe(true);

    act(() => capabilities.publish({ debugTools: false, cheats: false, automationBridge: false }));
    await waitFor(() => expect(freeze.state.getCurrent().frozen).toBe(false));
  });

  it("drags a window by its header and pins it to explicit coordinates", async () => {
    const capabilities = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const control = createDevDockControlV1();
    const panels = createDevDockContributionSetV1({
      panels: [
        {
          id: "panel.drag",
          side: "left",
          title: "拖动面板",
          authority: "read_only",
          render: () => <p>拖动内容</p>,
        },
      ],
    });
    control.open("panel.drag");
    render(
      <DevDockHarnessV1
        capabilities={capabilities.port}
        contributions={panels}
        control={control}
      />,
    );
    const dockWindow = await screen.findByRole("dialog", { name: "拖动面板" });
    const header = dockWindow.querySelector<HTMLElement>("[data-devdock-window-drag]");
    expect(header).not.toBeNull();
    if (header === null) throw new TypeError("missing window drag header");
    expect(dockWindow.style.insetInlineStart).toBe("");

    fireEvent.pointerDown(header, { button: 0, pointerId: 7, clientX: 40, clientY: 30 });
    fireEvent.pointerMove(header, { pointerId: 7, clientX: 90, clientY: 75 });
    fireEvent.pointerUp(header, { pointerId: 7 });
    // jsdom reports zero-size rects, so the clamped drag pins to the host
    // origin — the point is that dragging switches to explicit coordinates.
    expect(dockWindow.style.insetInlineStart).not.toBe("");
    expect(dockWindow.style.insetInlineEnd).toBe("auto");
  });
});

describe("DevDock contribution validation", () => {
  function panelV1(overrides: Partial<DevDockPanelV1> = {}): DevDockPanelV1 {
    return {
      id: "panel.synthetic",
      side: "left",
      title: "测试面板",
      authority: "read_only",
      render: () => null,
      ...overrides,
    };
  }

  it("rejects duplicate IDs, unknown policies, per-side overflow, and 129-byte titles", () => {
    expect(() =>
      createDevDockContributionSetV1({
        panels: [panelV1(), panelV1({ side: "right" })],
      })
    ).toThrowError("ui.devdock_duplicate_panel_id");
    expect(() =>
      createDevDockContributionSetV1({
        panels: [panelV1({ side: "center" as "left" })],
      })
    ).toThrowError("ui.devdock_invalid_side");
    expect(() =>
      createDevDockContributionSetV1({
        panels: [panelV1({ authority: "owner" as "read_only" })],
      })
    ).toThrowError("ui.devdock_invalid_authority");
    expect(() =>
      createDevDockContributionSetV1({
        panels: Array.from(
          { length: 17 },
          (_, index) => panelV1({ id: `panel.synthetic.${index}` }),
        ),
      })
    ).toThrowError("ui.devdock_panels_limit");
    expect(() => createDevDockContributionSetV1({ panels: [panelV1({ title: "a".repeat(129) })] }))
      .toThrowError("ui.devdock_title_limit");
  });

  it("accepts exact limits and preserves authored order in a copied registry", () => {
    const input = Array.from({ length: 16 }, (_, index) =>
      panelV1({
        id: `panel.synthetic.${index}`,
        title: index === 0 ? "界".repeat(42) + "aa" : `${index}`,
      }));
    const contributions = createDevDockContributionSetV1({ panels: input });
    expect(contributions.panels.map(({ id }) => id)).toEqual(input.map(({ id }) => id));
    expect(contributions.panels[0]).not.toBe(input[0]);
  });
});

describe("CapabilityPanelV1", () => {
  it("renders exactly three persisted switches and requires confirmation before enabling cheats", async () => {
    const persisted = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    const effective = createCapabilityFixtureV1({ debugTools: true, cheats: true });
    render(
      <CapabilityPanelV1
        persistedCapabilities={persisted.port}
        effectiveCapabilities={effective.port.state}
        sessionRequested={["cheats"]}
      />,
    );

    expect(screen.getAllByRole("switch")).toHaveLength(3);
    expect(screen.getByRole("switch", { name: "作弊功能" })).toBeDisabled();
    expect(screen.getByText("作弊功能由本次会话请求启用")).toBeVisible();
    expect(persisted.setEnabled).not.toHaveBeenCalled();

    cleanup();
    const persistedOnly = createCapabilityFixtureV1({ debugTools: true, cheats: false });
    render(
      <CapabilityPanelV1
        persistedCapabilities={persistedOnly.port}
        effectiveCapabilities={persistedOnly.port.state}
        sessionRequested={[]}
      />,
    );
    const cheats = screen.getByRole("switch", { name: "作弊功能" });
    expect(cheats).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "我确认启用作弊功能" }));
    expect(cheats).toBeEnabled();
    await userEvent.click(cheats);
    expect(persistedOnly.setEnabled).toHaveBeenCalledWith("cheats", true);
  });
});

describe("neutral async debug panels", () => {
  it("serializes fixture operations and disables every conflicting control", async () => {
    const anchored = createDeferredV1<{ readonly kind: "anchored" }>();
    render(
      <FixtureBrowserV1
        listFixtures={async () =>
          Object.freeze({
            kind: "listed" as const,
            fixtureIds: Object.freeze(["fixture.one", "fixture.two"]),
          })}
        inspectFixture={() => undefined}
        anchorFixture={() => anchored.promise}
        canAnchor
        disabledReason=""
      />,
    );
    const user = userEvent.setup();
    const firstAnchor = await screen.findByRole("button", { name: "载入夹具 fixture.one" });
    await user.click(firstAnchor);

    expect(screen.getByRole("button", { name: "刷新夹具" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "检查夹具 fixture.one" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "检查夹具 fixture.two" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "载入夹具 fixture.two" })).toBeDisabled();

    act(() => anchored.resolve(Object.freeze({ kind: "anchored" as const })));
    expect(await screen.findByText("夹具已载入")).toBeVisible();
  });

  it("refreshes when the fixture provider changes and ignores the old operation completion", async () => {
    const oldAnchor = createDeferredV1<{ readonly kind: "anchored" }>();
    const commonProps = Object.freeze({
      inspectFixture: () => undefined,
      anchorFixture: () => oldAnchor.promise,
      canAnchor: true,
      disabledReason: "",
    });
    const rendered = render(
      <FixtureBrowserV1
        {...commonProps}
        listFixtures={async () =>
          Object.freeze({ kind: "listed" as const, fixtureIds: ["fixture.old"] as const })}
      />,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "载入夹具 fixture.old" }));

    rendered.rerender(
      <FixtureBrowserV1
        {...commonProps}
        listFixtures={async () =>
          Object.freeze({ kind: "listed" as const, fixtureIds: ["fixture.new"] as const })}
      />,
    );
    expect(await screen.findByText("fixture.new")).toBeVisible();

    act(() => oldAnchor.resolve(Object.freeze({ kind: "anchored" as const })));
    await waitFor(() => expect(screen.queryByText("夹具已载入")).not.toBeInTheDocument());
  });

  it("preserves queried diagnostics while a single restore is pending and after it succeeds", async () => {
    const restore = createDeferredV1<void>();
    const onRestore = vi.fn(() => restore.promise);
    render(
      <DiagnosticInspectorV1
        queryDiagnostics={async () =>
          Object.freeze({
            kind: "diagnostics" as const,
            entries: Object.freeze([
              Object.freeze({ id: "revision", label: "当前修订", value: "7" }),
            ]),
          })}
        classification={Object.freeze({ kind: "restorable" as const })}
        onRestore={onRestore}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "诊断摘要" }));
    expect(await screen.findByText("当前修订：7")).toBeVisible();

    const restoreButton = screen.getByRole("button", { name: "恢复界面状态" });
    await user.click(restoreButton);
    expect(restoreButton).toBeDisabled();
    expect(screen.getByText("当前修订：7")).toBeVisible();
    expect(onRestore).toHaveBeenCalledOnce();

    act(() => restore.resolve());
    expect(await screen.findByText("界面状态已恢复")).toBeVisible();
    expect(screen.getByText("当前修订：7")).toBeVisible();
  });

  it("renders an adapted debug-command rejection instead of a false handled result", async () => {
    render(
      <DebugCommandPanelV1
        fields={<span>命令字段</span>}
        command={Object.freeze({ kind: "synthetic" as const })}
        executeDebugCommand={async () =>
          Object.freeze({ kind: "rejected" as const, message: "调试命令验证失败" })}
        canExecute
        disabledReason=""
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "执行调试命令" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("调试命令验证失败");
    expect(screen.queryByText("调试命令请求已处理")).not.toBeInTheDocument();
  });

  it("ignores an old debug-command completion after the typed provider is replaced", async () => {
    const oldExecution = createDeferredV1<{
      readonly kind: "rejected";
      readonly message: string;
    }>();
    const executeOld = vi.fn(() => oldExecution.promise);
    const executeNew = vi.fn(async () =>
      Object.freeze({ kind: "handled" as const, message: "新命令已执行" })
    );
    const rendered = render(
      <DebugCommandPanelV1
        fields={<span>旧命令字段</span>}
        command={Object.freeze({ kind: "old" as const })}
        executeDebugCommand={executeOld}
        canExecute
        disabledReason=""
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "执行调试命令" }));

    rendered.rerender(
      <DebugCommandPanelV1
        fields={<span>新命令字段</span>}
        command={Object.freeze({ kind: "new" as const })}
        executeDebugCommand={executeNew}
        canExecute
        disabledReason=""
      />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "执行调试命令" })).toBeEnabled());

    act(() =>
      oldExecution.resolve(Object.freeze({ kind: "rejected" as const, message: "旧命令不应显示" }))
    );
    await waitFor(() => expect(screen.queryByText("旧命令不应显示")).not.toBeInTheDocument());
    expect(executeOld).toHaveBeenCalledOnce();
    expect(executeNew).not.toHaveBeenCalled();
  });

  it("keeps one in-flight command when only the typed command value changes", async () => {
    const execution = createDeferredV1<{
      readonly kind: "handled";
      readonly message: string;
    }>();
    const execute = vi.fn(() => execution.promise);
    const rendered = render(
      <DebugCommandPanelV1
        fields={<span>命令 A</span>}
        command={Object.freeze({ kind: "same", amount: 1 })}
        executeDebugCommand={execute}
        canExecute
        disabledReason=""
      />,
    );
    const user = userEvent.setup();
    const submit = screen.getByRole("button", { name: "执行调试命令" });
    await user.click(submit);

    rendered.rerender(
      <DebugCommandPanelV1
        fields={<span>命令 B</span>}
        command={Object.freeze({ kind: "same", amount: 2 })}
        executeDebugCommand={execute}
        canExecute
        disabledReason=""
      />,
    );
    await waitFor(() => expect(screen.getByText("命令 B")).toBeVisible());
    expect(screen.getByRole("button", { name: "执行调试命令" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "执行调试命令" }));
    expect(execute).toHaveBeenCalledOnce();

    act(() =>
      execution.resolve(Object.freeze({ kind: "handled" as const, message: "命令 A 已执行" }))
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "执行调试命令" })).toBeEnabled());
    expect(screen.queryByText("命令 A 已执行")).not.toBeInTheDocument();
  });

  it("ignores an old debug-command rejection after the typed command value changes", async () => {
    const execution = createDeferredV1<never>();
    const execute = vi.fn(() => execution.promise);
    const rendered = render(
      <DebugCommandPanelV1
        fields={<span>命令 A</span>}
        command={Object.freeze({ kind: "same", amount: 1 })}
        executeDebugCommand={execute}
        canExecute
        disabledReason=""
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "执行调试命令" }));

    rendered.rerender(
      <DebugCommandPanelV1
        fields={<span>命令 B</span>}
        command={Object.freeze({ kind: "same", amount: 2 })}
        executeDebugCommand={execute}
        canExecute
        disabledReason=""
      />,
    );
    expect(screen.getByRole("button", { name: "执行调试命令" })).toBeDisabled();

    act(() => execution.reject(new Error("命令 A 失败")));
    await waitFor(() => expect(screen.getByRole("button", { name: "执行调试命令" })).toBeEnabled());
    expect(screen.queryByText("调试命令执行失败")).not.toBeInTheDocument();
    expect(execute).toHaveBeenCalledOnce();
  });
});
