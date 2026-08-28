// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { ReactElement } from "react";

import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createPresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import { createPresentationRatePortV1 } from "../presentation-run/presentation-rate.ts";
import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import { createDevDockControlV1 } from "./dev-dock-control.ts";
import {
  AuxiliarySurfacePortalCoordinatorV1,
  useAuxiliarySurfacePortalTargetRegistrationV1,
} from "../shell/auxiliary-surface-portal.tsx";
import { engineStateInspectorPanelIdV1, engineStateTunerPanelIdV1 } from "./state-tuner.ts";
import { StoryDebugDockV1 } from "./story-debug-dock.tsx";

afterEach(cleanup);

function fakeCapabilitiesV1(options: {
  readonly debugTools?: boolean;
  readonly cheats?: boolean;
  readonly setEnabled?: RuntimeCapabilityPortV1["setEnabled"];
} = {}): RuntimeCapabilityPortV1 {
  const debugTools = options.debugTools ?? false;
  const state = Object.freeze({
    debugTools,
    cheats: options.cheats ?? debugTools,
    automationBridge: false,
  });
  return Object.freeze({
    state: Object.freeze({
      getCurrent: () => state,
      subscribe: () => () => undefined,
    }),
    setEnabled: options.setEnabled ??
      (async () => Object.freeze({ kind: "unchanged" as const, state })),
  });
}

function fakeSavePortV1(overrides: Partial<SaveOverlayPortV1> = {}): SaveOverlayPortV1 {
  return {
    getStatus: () => ({ kind: "ready" }) as never,
    listSlots: vi.fn(async () => []) as never,
    save: vi.fn() as never,
    load: vi.fn() as never,
    clear: vi.fn() as never,
    annotateSave: vi.fn() as never,
    importSave: vi.fn(async () => ({ kind: "cancelled" })) as never,
    exportSave: vi.fn() as never,
    exportCurrentSave: vi.fn(async () => ({ filename: "state.json" })) as never,
    ...overrides,
  };
}

const defaultToolsV1 = Object.freeze([
  Object.freeze({ panelId: "panel.story.workbench", label: "Motion 工坊" }),
]);

function renderDockV1(
  overrides: Partial<Parameters<typeof StoryDebugDockV1>[0]> & {
    readonly listFromRegistry?: boolean;
  } = {},
): ReturnType<typeof render> {
  const { listFromRegistry, tools, ...rest } = overrides;
  return render(
    <StoryDebugDockV1
      visible
      portalTarget={document.body}
      capabilities={fakeCapabilitiesV1()}
      control={createDevDockControlV1()}
      presentationFreeze={createPresentationFreezePortV1({
        inner: createManualPresentationClockV1(),
      })}
      savePort={fakeSavePortV1()}
      clearAllSaves={vi.fn(async () => undefined)}
      onReloadCurrentState={vi.fn()}
      onReinitialize={vi.fn()}
      {...(listFromRegistry === true ? {} : { tools: tools ?? defaultToolsV1 })}
      {...rest}
    />,
  );
}

describe("StoryDebugDockV1", () => {
  it("renders nothing when the Story hides it", () => {
    renderDockV1({ visible: false });
    expect(document.querySelector("[data-story-debug-dock]")).toBeNull();
  });

  it("opens tools through the shared control and grants capabilities", async () => {
    const setEnabled = vi.fn(async () =>
      Object.freeze({
        kind: "unchanged" as const,
        state: Object.freeze({ debugTools: false, cheats: false, automationBridge: false }),
      })
    ) as unknown as RuntimeCapabilityPortV1["setEnabled"];
    const control = createDevDockControlV1();
    renderDockV1({
      capabilities: fakeCapabilitiesV1({ setEnabled }),
      control,
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    expect(
      within(screen.getByRole("group", { name: "工具" })).getByRole("button", {
        name: "Motion 工坊",
      }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Motion 工坊" }));
    expect(setEnabled).toHaveBeenCalledWith("debug_tools", true);
    expect(setEnabled).toHaveBeenCalledWith("cheats", true);
    expect(control.openPanelIds.getCurrent()).toEqual(["panel.story.workbench"]);
  });

  it("shows the session's last fault cause when one is recorded", async () => {
    const cause = Object.freeze({
      at: "dispatch" as const,
      message: "TypeError: module demo.items already proposed",
      stackSummary: Object.freeze(["at executeAttempt (simulation.ts:42:11)"]),
    });
    renderDockV1({
      faultCause: Object.freeze({
        getCurrent: () => cause,
        subscribe: () => () => undefined,
      }),
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    const block = document.querySelector("[data-debug-dock-fault-cause]");
    expect(block).not.toBeNull();
    expect(block).toHaveTextContent("最近故障");
    expect(block).toHaveTextContent("module demo.items already proposed");
    expect(block).toHaveTextContent("simulation.ts:42:11");
  });

  it("renders no fault block while the cause is null", async () => {
    renderDockV1({
      faultCause: Object.freeze({
        getCurrent: () => null,
        subscribe: () => () => undefined,
      }),
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    expect(document.querySelector("[data-debug-dock-fault-cause]")).toBeNull();
  });

  it("freezes and resumes the presentation plane", async () => {
    const freeze = createPresentationFreezePortV1({ inner: createManualPresentationClockV1() });
    renderDockV1({ presentationFreeze: freeze });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    await user.click(screen.getByRole("button", { name: "冻结画面" }));
    expect(freeze.state.getCurrent().frozen).toBe(true);
    await user.click(screen.getByRole("button", { name: "恢复画面" }));
    expect(freeze.state.getCurrent().frozen).toBe(false);
  });

  it("wipes through the engine Core operation after a confirmation dialog", async () => {
    const clearAllSaves = vi.fn(async () => undefined);
    const onWiped = vi.fn();
    const clear = vi.fn();
    renderDockV1({
      clearAllSaves,
      onWiped,
      savePort: fakeSavePortV1({ clear: clear as never }),
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    await user.click(screen.getByRole("button", { name: "清空存储" }));
    expect(clearAllSaves).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "清空全部本地存储？" })).toBeVisible();
    expect(screen.getByRole("button", { name: "取消清空存储" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "取消" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "确认清空" }));
    await waitFor(() => expect(clearAllSaves).toHaveBeenCalledOnce());
    expect(clear).not.toHaveBeenCalled();
    expect(onWiped).toHaveBeenCalledOnce();
  });

  it("cancels wipe without calling Core cleanup", async () => {
    const clearAllSaves = vi.fn(async () => undefined);
    renderDockV1({ clearAllSaves });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    await user.click(screen.getByRole("button", { name: "清空存储" }));
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(clearAllSaves).not.toHaveBeenCalled();
  });

  it("reloads the live snapshot only after confirmation and does not download a save", async () => {
    const onReloadCurrentState = vi.fn(async () => undefined);
    const savePort = fakeSavePortV1();
    renderDockV1({ onReloadCurrentState, savePort });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    await user.click(screen.getByRole("button", { name: "刷新状态" }));
    expect(onReloadCurrentState).not.toHaveBeenCalled();
    expect(savePort.exportCurrentSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "用当前状态重新加载？" })).toBeVisible();
    expect(screen.getByRole("button", { name: "取消刷新状态" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "确认刷新" }));
    await waitFor(() => expect(onReloadCurrentState).toHaveBeenCalledOnce());
    expect(savePort.exportCurrentSave).not.toHaveBeenCalled();
    expect(screen.getByText("已用当前状态重新加载。")).toBeVisible();
  });

  it("reinitializes only after confirmation", async () => {
    const onReinitialize = vi.fn(async () => undefined);
    renderDockV1({ onReinitialize });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    await user.click(screen.getByRole("button", { name: "初始化" }));
    expect(onReinitialize).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "初始化会话？" })).toBeVisible();
    expect(screen.getByRole("button", { name: "取消初始化" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "确认初始化" }));
    await waitFor(() => expect(onReinitialize).toHaveBeenCalledOnce());
  });

  it("does not offer a global engine-tools shutdown", async () => {
    renderDockV1({ capabilities: fakeCapabilitiesV1({ debugTools: true }) });
    await userEvent.setup().click(screen.getByText("调试"));
    expect(screen.queryByRole("button", { name: "关闭引擎工具" })).not.toBeInTheDocument();
  });

  it("renders the Story info slot without reading Story state itself", async () => {
    renderDockV1({ info: <div data-debug-dock-info="true">trust12</div> });
    await userEvent.setup().click(screen.getByText("调试"));
    expect(screen.getByText("trust12")).toBeVisible();
  });

  it("lists live control.panels when tools are omitted and skips session maintenance", async () => {
    const control = createDevDockControlV1();
    control.publishPanelsInternalV1(Object.freeze([
      Object.freeze({
        id: "engine.session_maintenance",
        title: "Session maintenance",
        authority: "cheat" as const,
      }),
      Object.freeze({
        id: "panel.lab.graph",
        title: "叙事图",
        authority: "read_only" as const,
      }),
    ]));
    renderDockV1({
      control,
      listFromRegistry: true,
      capabilities: fakeCapabilitiesV1({ debugTools: true }),
      grantCapabilitiesOnOpen: false,
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    expect(screen.getByRole("button", { name: "叙事图" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Session maintenance" })).not
      .toBeInTheDocument();
  });

  it("disables cheat-authority tools until cheats are granted", async () => {
    const control = createDevDockControlV1();
    control.publishPanelsInternalV1(Object.freeze([
      Object.freeze({
        id: "panel.tune",
        title: "调参",
        authority: "cheat" as const,
      }),
    ]));
    renderDockV1({
      control,
      listFromRegistry: true,
      capabilities: fakeCapabilitiesV1({ debugTools: true, cheats: false }),
      grantCapabilitiesOnOpen: false,
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    expect(screen.getByRole("button", { name: "调参" })).toBeDisabled();
    expect(
      within(screen.getByRole("group", { name: "作弊" })).getByText("需要启用作弊功能"),
    ).toBeVisible();
    expect(control.openPanelIds.getCurrent()).toEqual([]);
  });

  it("groups state, scene, rate, tools, and story-cheat actions", async () => {
    const control = createDevDockControlV1();
    control.publishPanelsInternalV1(Object.freeze([
      Object.freeze({
        id: engineStateInspectorPanelIdV1,
        title: "状态查看",
        authority: "read_only" as const,
      }),
      Object.freeze({
        id: engineStateTunerPanelIdV1,
        title: "状态编辑",
        authority: "cheat" as const,
      }),
      Object.freeze({
        id: "panel.lab.graph",
        title: "叙事图",
        authority: "read_only" as const,
      }),
      Object.freeze({
        id: "panel.story.workbench",
        title: "Motion 工坊",
        authority: "read_only" as const,
      }),
      Object.freeze({
        id: "panel.tune",
        title: "作弊",
        authority: "cheat" as const,
      }),
    ]));
    renderDockV1({
      control,
      listFromRegistry: true,
      capabilities: fakeCapabilitiesV1({ debugTools: true, cheats: false }),
      grantCapabilitiesOnOpen: false,
      inspectorHref: "/__sillymaker/inspector/",
      presentationRate: createPresentationRatePortV1({
        inner: createManualPresentationClockV1(),
      }),
    });
    await userEvent.setup().click(screen.getByText("调试"));
    const state = screen.getByRole("group", { name: "状态" });
    expect(within(state).getByRole("button", { name: "导出状态" })).toBeVisible();
    expect(within(state).getByRole("button", { name: "导入状态" })).toBeVisible();
    expect(within(state).getByRole("button", { name: "状态查看" })).toBeVisible();
    expect(within(state).getByRole("button", { name: "状态编辑" })).toBeDisabled();
    expect(within(state).getByRole("button", { name: "刷新状态" })).toBeVisible();
    expect(within(state).getByRole("button", { name: "初始化" })).toBeVisible();
    expect(within(state).getByRole("button", { name: "清空存储" })).toBeVisible();
    expect(
      [...state.querySelectorAll("[data-debug-dock-action]")].map((node) =>
        node.getAttribute("data-debug-dock-action")
      ),
    ).toEqual([
      "export_state",
      "import_state",
      engineStateInspectorPanelIdV1,
      engineStateTunerPanelIdV1,
      "reload_current",
      "reinitialize",
      "wipe_local",
    ]);
    const scene = screen.getByRole("group", { name: "场景" });
    expect(within(scene).getByRole("button", { name: "冻结画面" })).toBeVisible();
    expect(within(scene).getByRole("button", { name: "叙事图" })).toBeVisible();
    expect(within(scene).queryByRole("button", { name: "Motion 工坊" })).not.toBeInTheDocument();
    expect(within(scene).queryByRole("button", { name: "1×" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "倍速" })).getByRole("button", { name: "1×" }))
      .toBeVisible();
    const tools = screen.getByRole("group", { name: "工具" });
    expect(within(tools).getByRole("button", { name: "Motion 工坊" })).toBeVisible();
    expect(within(tools).getByRole("link", { name: "Inspector" })).toBeVisible();
    expect(
      within(screen.getByRole("group", { name: "作弊" })).getByRole("button", { name: "作弊" }),
    ).toBeDisabled();
    expect(screen.queryByRole("group", { name: "创作" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "检视" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "调参" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "会话" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "危险" })).not.toBeInTheDocument();
  });

  it("opens Inspector in a new tab when the page is advertised", async () => {
    renderDockV1({ inspectorHref: "/__sillymaker/inspector/" });
    await userEvent.setup().click(screen.getByText("调试"));
    const inspector = within(screen.getByRole("group", { name: "工具" })).getByRole("link", {
      name: "Inspector",
    });
    expect(inspector).toHaveAttribute("href", "/__sillymaker/inspector/");
    expect(inspector).toHaveAttribute("target", "_blank");
    expect(inspector).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("ignores unsafe Inspector hrefs", async () => {
    renderDockV1({ inspectorHref: "javascript:alert(1)" });
    await userEvent.setup().click(screen.getByText("调试"));
    expect(screen.queryByRole("link", { name: "Inspector" })).not.toBeInTheDocument();
  });

  it("grants debug_tools and cheats when the chip expands before tools exist", async () => {
    const setEnabled = vi.fn(async () =>
      Object.freeze({
        kind: "unchanged" as const,
        state: Object.freeze({ debugTools: false, cheats: false, automationBridge: false }),
      })
    ) as unknown as RuntimeCapabilityPortV1["setEnabled"];
    renderDockV1({
      capabilities: fakeCapabilitiesV1({ setEnabled }),
      listFromRegistry: true,
    });
    await userEvent.setup().click(screen.getByText("调试"));
    expect(setEnabled).toHaveBeenCalledWith("debug_tools", true);
    expect(setEnabled).toHaveBeenCalledWith("cheats", true);
  });

  it("closes the launcher on Escape and restores chip focus", async () => {
    renderDockV1();
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    expect(screen.getByRole("group", { name: "调试" })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("group", { name: "调试" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "调试" })).toHaveFocus();
  });

  it("anchors the chip to the configured corner", () => {
    renderDockV1({ position: "bottom_right" });
    expect(document.querySelector("[data-story-debug-dock]")).toHaveAttribute(
      "data-devdock-position",
      "bottom_right",
    );
  });

  it("collapses when fault_pause adopts and releases the launcher", async () => {
    function ScopeFixtureV1(props: { readonly active: boolean }): ReactElement {
      const [element, setElement] = useState<HTMLDivElement | null>(null);
      useAuxiliarySurfacePortalTargetRegistrationV1("fault_pause", props.active ? element : null);
      return (
        <div
          ref={setElement}
          data-blocking-focus-scope={props.active ? "fault_pause" : undefined}
          data-test-scope="true"
        />
      );
    }
    function HarnessV1(props: { readonly scopeActive: boolean }): ReactElement {
      return (
        <AuxiliarySurfacePortalCoordinatorV1>
          <ScopeFixtureV1 active={props.scopeActive} />
          <StoryDebugDockV1
            visible
            capabilities={fakeCapabilitiesV1()}
            control={createDevDockControlV1()}
            tools={defaultToolsV1}
          />
        </AuxiliarySurfacePortalCoordinatorV1>
      );
    }
    const user = userEvent.setup();
    const rendered = render(<HarnessV1 scopeActive={false} />);
    await user.click(screen.getByText("调试"));
    expect(screen.getByRole("group", { name: "调试" })).toBeVisible();

    // Only the terminal fault surface may adopt the dock: the chip
    // re-portals into it and always arrives collapsed.
    rendered.rerender(<HarnessV1 scopeActive={true} />);
    await waitFor(() => {
      expect(
        document.querySelector("[data-test-scope] [data-story-debug-dock]"),
      ).not.toBeNull();
    });
    expect(screen.queryByRole("group", { name: "调试" })).not.toBeInTheDocument();

    // Returning to the base surface also lands collapsed.
    await user.click(screen.getByText("调试"));
    expect(screen.getByRole("group", { name: "调试" })).toBeVisible();
    rendered.rerender(<HarnessV1 scopeActive={false} />);
    await waitFor(() => {
      expect(document.querySelector("[data-test-scope] [data-story-debug-dock]")).toBeNull();
    });
    expect(screen.queryByRole("group", { name: "调试" })).not.toBeInTheDocument();
  });

  it("keeps the corner-yield and blocking-scope bounds in the dock CSS contract", async () => {
    const css = await readFile(
      resolve(import.meta.dirname, "story-debug-dock.module.css"),
      "utf8",
    );
    const launcherCss = await readFile(
      resolve(import.meta.dirname, "../internal/development-tool-launcher.module.css"),
      "utf8",
    );

    // A top-right chip on the game canvas slides below the engine's own
    // default system menu instead of overlapping it.
    expect(launcherCss).toMatch(
      /\[data-game-viewport-canvas\]:has\(\[data-default-system-menu\]\)[^{]*>\s*\.development-tool-launcher\[data-devdock-position="top_right"\]\s*\{[^}]*inset-block-start:/su,
    );
    // Inside a blocking scope the expanded panel stays bounded, scrollable,
    // and opaque over the dialog's content.
    expect(launcherCss).toMatch(
      /\[data-blocking-focus-scope\]\)?\s*>\s*\.development-tool-launcher\s*\{[^}]*max-block-size:/su,
    );
    expect(css).toMatch(
      /\[data-blocking-focus-scope\]\)\s*>\s*:global\(\[data-development-tool-launcher\]\)\s+\.story-debug-dock__panel\s*\{[^}]*overflow:\s*auto;[^}]*background:\s*var\(--silly-color-surface\);/su,
    );

    // Debug chrome keeps the devtools font: the rail and the sibling
    // confirm layer rebind --silly-font-family to the debug token so a
    // Story's game font never restyles them.
    expect(launcherCss).toMatch(
      /\.development-tool-launcher\s*\{[^}]*--silly-font-family:\s*var\(--silly-debug-font-family\);/su,
    );
    expect(css).toMatch(
      /\.story-debug-dock__wipe\s*\{[^}]*--silly-font-family:\s*var\(--silly-debug-font-family\);/su,
    );
    const windowsCss = await readFile(
      resolve(import.meta.dirname, "dev-dock.module.css"),
      "utf8",
    );
    // The shared launcher is the foreground control plane. A window opened
    // from the same corner cannot intercept the still-expanded action menu.
    expect(launcherCss).toMatch(
      /\.development-tool-launcher\s*\{[^}]*z-index:\s*var\(--silly-surface-z-splash\);/su,
    );
    expect(windowsCss).toMatch(
      /\.dev-dock\s*\{[^}]*z-index:\s*var\(--silly-surface-z-front-door\);/su,
    );
    expect(windowsCss).toMatch(
      /data-devdock-window-front="true"[^}]*z-index:\s*var\(--silly-surface-z-active\);/su,
    );
    expect(windowsCss).toMatch(
      /\.dev-dock\s*\{[^}]*--silly-font-family:\s*var\(--silly-debug-font-family\);/su,
    );
  });
});
