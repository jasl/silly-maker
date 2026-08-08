// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DevDockPortalCoordinatorV1,
  useDevDockPortalTargetV1,
} from "../debug/dev-dock-portal-coordinator.tsx";
import { inputHandledV1, systemInputActionIdsV1, type InputEventV1 } from "../input/contracts.ts";
import { createInputRouterV1 } from "../input/input-router.ts";
import { GameStageV1 } from "../shell/game-stage.tsx";
import { SavesLauncherV1 } from "./saves-launcher.tsx";
import { SettingsLauncherV1 } from "./settings-launcher.tsx";
import { SystemDialogHostV1, useSystemDialogControllerV1 } from "./system-dialog-host.tsx";
import {
  createSystemDialogSessionStoreV1,
  sealSystemDialogSessionStoreTerminalInternalV1,
} from "./system-dialog-session-store.ts";

afterEach(cleanup);

const settingsV1 = Object.freeze({
  title: "设置",
  closeLabel: "关闭设置",
  sections: Object.freeze([<section key="fixture">测试设置</section>]),
  emptyText: "没有可调整设置",
});

function SystemHarnessV1(props: { readonly inputRouter: ReturnType<typeof createInputRouterV1> }) {
  return (
    <SystemDialogHostV1 inputRouter={props.inputRouter} settings={settingsV1}>
      <div role="dialog" aria-label="测试叙事">
        测试叙事内容
      </div>
      <SettingsLauncherV1 label="设置" />
    </SystemDialogHostV1>
  );
}

function StageSystemHarnessV1(props: {
  readonly inputRouter: ReturnType<typeof createInputRouterV1>;
}) {
  return (
    <GameStageV1
      accessibleName="设置隔离测试舞台"
      layers={{
        background: <button type="button">背景操作</button>,
        character: null,
        sceneInteraction: null,
        hud: <button type="button">HUD 操作</button>,
        workspaceOverlay: <button type="button">Overlay 操作</button>,
        narrative: <button type="button">叙事操作</button>,
        system: (
          <SystemDialogHostV1 inputRouter={props.inputRouter} settings={settingsV1}>
            <SettingsLauncherV1 label="设置" />
          </SystemDialogHostV1>
        ),
      }}
    />
  );
}

function DevDockPortalSelectionProbeV1() {
  const { surface, target } = useDevDockPortalTargetV1();
  return (
    <output
      data-testid="devdock-portal-selection"
      data-surface={surface}
      data-target-scope={target?.dataset.blockingFocusScope ?? "none"}
    />
  );
}

function ExternalSystemOpenerBridgeV1(props: { readonly opener: HTMLButtonElement }) {
  const controller = useSystemDialogControllerV1();
  useEffect(() => {
    const open = (): void => controller.openSettings(props.opener);
    props.opener.addEventListener("click", open);
    return () => props.opener.removeEventListener("click", open);
  }, [controller, props.opener]);
  return null;
}

describe("SystemDialogHostV1", () => {
  it("hosts a hook-using custom Save renderer behind its own React boundary", async () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    function HookedCustomSavesV1(props: { readonly close: () => void }) {
      const [count, setCount] = useState(0);
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return (
        <>
          <output aria-label="Custom count">{count}</output>
          <button type="button" onClick={() => setCount((current) => current + 1)}>
            Increment
          </button>
          <button type="button" onClick={props.close}>
            Close custom saves
          </button>
        </>
      );
    }
    render(
      <SystemDialogHostV1
        inputRouter={createInputRouterV1()}
        settings={settingsV1}
        saves={Object.freeze({
          kind: "custom",
          accessibleName: "Custom saves",
          render: HookedCustomSavesV1,
        })}
      >
        <SavesLauncherV1 label="存档" />
        <SettingsLauncherV1 label="设置" />
      </SystemDialogHostV1>,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "存档" }));
    await user.click(screen.getByRole("button", { name: "Increment" }));
    expect(screen.getByRole("status", { name: "Custom count" })).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Close custom saves" }));
    expect(unmounted).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "关闭设置" }));
    await user.click(screen.getByRole("button", { name: "存档" }));
    expect(screen.getByRole("status", { name: "Custom count" })).toHaveTextContent("0");
    expect(mounted).toHaveBeenCalledTimes(2);
  });

  it("registers the actual settings Dialog.Content as the DevDock system target", async () => {
    const inputRouter = createInputRouterV1();
    render(
      <DevDockPortalCoordinatorV1>
        <DevDockPortalSelectionProbeV1 />
        <SystemDialogHostV1 inputRouter={inputRouter} settings={settingsV1}>
          <SettingsLauncherV1 label="设置" />
        </SystemDialogHostV1>
      </DevDockPortalCoordinatorV1>,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByRole("dialog", { name: "设置" })).toHaveAttribute(
      "data-blocking-focus-scope",
      "system",
    );
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-target-scope",
        "system",
      )
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "关闭设置" }));
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-surface",
        "base",
      )
    );
  });

  it("uses one supplied session store for rendering, diagnostics, and unmount cleanup", async () => {
    const store = createSystemDialogSessionStoreV1();
    const readSystemDialogOpenForDiagnosticsV1 = (): boolean =>
      store.getSnapshot().active === "settings";
    const rendered = render(
      <SystemDialogHostV1 store={store} inputRouter={createInputRouterV1()} settings={settingsV1}>
        <SettingsLauncherV1 label="设置" />
      </SystemDialogHostV1>,
    );
    const user = userEvent.setup();

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(false);
    expect(screen.queryByRole("dialog", { name: "设置" })).not.toBeInTheDocument();

    act(() => store.open("settings"));

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(true);
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "关闭设置" }));

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(false);
    expect(screen.queryByRole("dialog", { name: "设置" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "设置" }));

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(true);
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();

    rendered.unmount();

    expect(readSystemDialogOpenForDiagnosticsV1()).toBe(false);
  });

  it("uses System above Overlay and Narrative and never leaks to Gameplay", async () => {
    const inputRouter = createInputRouterV1();
    const overlay = vi.fn(() => inputHandledV1);
    const narrative = vi.fn(() => inputHandledV1);
    const gameplay = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    inputRouter.register({ context: "narrative", handle: narrative });
    inputRouter.register({ context: "overlay", handle: overlay });
    const rendered = render(<SystemHarnessV1 inputRouter={inputRouter} />);
    const opener = screen.getByRole("button", { name: "设置" });
    await userEvent.setup().click(opener);

    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "测试叙事", hidden: true })).toBeVisible();
    expect(
      rendered.container.querySelector('[data-system-dialog-host-content="true"]'),
    ).toHaveAttribute("inert");
    act(() => {
      expect(
        inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
      ).toEqual({ kind: "handled", context: "system" });
    });

    expect(overlay).not.toHaveBeenCalled();
    expect(narrative).not.toHaveBeenCalled();
    expect(gameplay).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "设置" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "测试叙事" })).toBeVisible();
    expect(
      rendered.container.querySelector('[data-system-dialog-host-content="true"]'),
    ).not.toHaveAttribute("inert");
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("returns focus to the exact launcher among multiple launchers", async () => {
    const inputRouter = createInputRouterV1();
    render(
      <SystemDialogHostV1 inputRouter={inputRouter} settings={settingsV1}>
        <SettingsLauncherV1 label="顶部设置" />
        <SettingsLauncherV1 label="底部设置" />
      </SystemDialogHostV1>,
    );
    const top = screen.getByRole("button", { name: "顶部设置" });
    const bottom = screen.getByRole("button", { name: "底部设置" });

    await userEvent.setup().click(bottom);
    await userEvent.setup().click(screen.getByRole("button", { name: "关闭设置" }));

    await waitFor(() => expect(bottom).toHaveFocus());
    expect(top).not.toHaveFocus();
  });

  it("does not restore its opener over a concurrently focused higher blocking surface", async () => {
    const inputRouter = createInputRouterV1();
    render(
      <>
        <button type="button">更高层恢复操作</button>
        <SystemDialogHostV1 inputRouter={inputRouter} settings={settingsV1}>
          <SettingsLauncherV1 label="设置" />
        </SystemDialogHostV1>
      </>,
    );
    const opener = screen.getByRole("button", { name: "设置" });
    const higherControl = screen.getByRole("button", { name: "更高层恢复操作", hidden: true });
    await userEvent.setup().click(opener);
    higherControl.focus();

    act(() => {
      expect(
        inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }),
      ).toEqual({ kind: "handled", context: "system" });
    });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "设置" })).toBeNull());
    expect(higherControl).toHaveFocus();
    expect(opener).not.toHaveFocus();
  });

  it("traps keyboard focus inside the reserved System dialog", async () => {
    const inputRouter = createInputRouterV1();
    render(
      <>
        <button type="button">舞台外操作</button>
        <SystemDialogHostV1 inputRouter={inputRouter} settings={settingsV1}>
          <SettingsLauncherV1 label="设置" />
        </SystemDialogHostV1>
      </>,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "设置" }));
    const close = screen.getByRole("button", { name: "关闭设置" });
    expect(close).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();
    expect(screen.getByRole("button", { name: "舞台外操作", hidden: true })).not.toHaveFocus();
  });

  it("passes transient cleanup through without closing the settings surface", async () => {
    const inputRouter = createInputRouterV1();
    const lowerCleanup = vi.fn(() => inputHandledV1);
    inputRouter.register({ context: "overlay", handle: lowerCleanup });
    render(<SystemHarnessV1 inputRouter={inputRouter} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

    expect(inputRouter.route({ kind: "focus_loss" })).toEqual({
      kind: "handled",
      context: "overlay",
    });
    expect(
      inputRouter.route({
        kind: "pointer_cancel",
        pointerId: parseNonNegativeSafeInteger(0),
      }),
    ).toEqual({ kind: "handled", context: "overlay" });
    expect(lowerCleanup).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
  });

  it("isolates lower GameStage layers only while settings is open", async () => {
    const inputRouter = createInputRouterV1();
    render(<StageSystemHarnessV1 inputRouter={inputRouter} />);
    const user = userEvent.setup();

    expect(screen.getByTestId("stage-hud")).not.toHaveAttribute("inert");
    await user.click(screen.getByRole("button", { name: "设置" }));

    const dialog = screen.getByRole("dialog", { name: "设置" });
    await waitFor(() => expect(screen.getByTestId("stage-hud")).toHaveAttribute("inert"));
    expect(screen.getByTestId("stage-workspace-overlay")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-narrative")).toHaveAttribute("inert");
    expect(screen.getByTestId("stage-system")).not.toHaveAttribute("inert");
    expect(dialog.closest('[data-stage-layer="system"]')).toBe(screen.getByTestId("stage-system"));
    expect(dialog).toHaveAttribute("data-blocking-focus-scope", "system");
    expect(dialog).toHaveStyle({ position: "absolute" });

    await user.click(screen.getByRole("button", { name: "关闭设置" }));
    await waitFor(() => expect(screen.getByTestId("stage-hud")).not.toHaveAttribute("inert"));
  });

  it("clears active state, focus registration, and input handler when the host unmounts", async () => {
    const store = createSystemDialogSessionStoreV1();
    const inputRouter = createInputRouterV1();
    const gameplay = vi.fn((_event: InputEventV1) => inputHandledV1);
    inputRouter.register({ context: "gameplay", handle: gameplay });
    const systemHost = (
      <SystemDialogHostV1 store={store} inputRouter={inputRouter} settings={settingsV1}>
        <SettingsLauncherV1 label="设置" />
      </SystemDialogHostV1>
    );
    const rendered = render(
      <DevDockPortalCoordinatorV1>
        <DevDockPortalSelectionProbeV1 />
        {systemHost}
      </DevDockPortalCoordinatorV1>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

    expect(store.getSnapshot().active).toBe("settings");
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-target-scope",
        "system",
      )
    );
    expect(inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.confirm })).toEqual(
      { kind: "handled", context: "system" },
    );
    expect(gameplay).not.toHaveBeenCalled();

    rendered.rerender(
      <DevDockPortalCoordinatorV1>
        <DevDockPortalSelectionProbeV1 />
      </DevDockPortalCoordinatorV1>,
    );

    expect(store.getSnapshot().active).toBeNull();
    expect(screen.queryByRole("dialog", { name: "设置" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("devdock-portal-selection")).toHaveAttribute(
        "data-surface",
        "base",
      )
    );
    expect(inputRouter.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
      kind: "handled",
      context: "gameplay",
    });
    expect(gameplay).toHaveBeenCalledOnce();
  });

  it("does not close or restore predecessor focus when a terminal store unmounts", async () => {
    const store = createSystemDialogSessionStoreV1();
    render(<button type="button">外部设置</button>);
    const button = screen.getByRole("button", { name: "外部设置" }) as HTMLButtonElement;
    const rendered = render(
      <SystemDialogHostV1
        store={store}
        inputRouter={createInputRouterV1()}
        settings={settingsV1}
      >
        <ExternalSystemOpenerBridgeV1 opener={button} />
      </SystemDialogHostV1>,
    );
    await userEvent.setup().click(button);
    expect(screen.getByRole("dialog", { name: "设置" })).toBeVisible();

    sealSystemDialogSessionStoreTerminalInternalV1(store);
    rendered.unmount();
    await Promise.resolve();

    expect(store.getSnapshot()).toEqual({ active: "settings" });
    expect(button).not.toHaveFocus();
  });

  it("suppresses a queued exact-opener restore when close synchronously enters terminal", async () => {
    const store = createSystemDialogSessionStoreV1();
    const unsubscribe = store.subscribe(() => {
      if (store.getSnapshot().active === null) {
        sealSystemDialogSessionStoreTerminalInternalV1(store);
      }
    });
    render(
      <SystemDialogHostV1
        store={store}
        inputRouter={createInputRouterV1()}
        settings={settingsV1}
      >
        <SettingsLauncherV1 label="设置" />
      </SystemDialogHostV1>,
    );
    const button = screen.getByRole("button", { name: "设置" });
    await userEvent.setup().click(button);

    await userEvent.setup().click(screen.getByRole("button", { name: "关闭设置" }));
    await Promise.resolve();

    expect(button).not.toHaveFocus();
    unsubscribe();
  });
});
