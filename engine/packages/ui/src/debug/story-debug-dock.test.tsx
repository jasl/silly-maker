// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";

import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createPresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import { createDevDockControlV1 } from "./dev-dock-control.ts";
import { StoryDebugDockV1 } from "./story-debug-dock.tsx";

afterEach(cleanup);

function fakeCapabilitiesV1(options: {
  readonly debugTools?: boolean;
  readonly setEnabled?: RuntimeCapabilityPortV1["setEnabled"];
} = {}): RuntimeCapabilityPortV1 {
  const state = Object.freeze({
    debugTools: options.debugTools ?? false,
    cheats: options.debugTools ?? false,
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

function renderDockV1(
  overrides: Partial<Parameters<typeof StoryDebugDockV1>[0]> = {},
): ReturnType<typeof render> {
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
      onReinitialize={vi.fn()}
      tools={Object.freeze([
        Object.freeze({ panelId: "panel.story.workbench", label: "Motion 工坊" }),
      ])}
      {...overrides}
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
    await user.click(screen.getByRole("button", { name: "Motion 工坊" }));
    expect(setEnabled).toHaveBeenCalledWith("debug_tools", true);
    expect(setEnabled).toHaveBeenCalledWith("cheats", true);
    expect(control.openPanelIds.getCurrent()).toEqual(["panel.story.workbench"]);
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
    await user.click(screen.getByRole("button", { name: "清理本地库" }));
    expect(clearAllSaves).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "清理全部本地存档？" })).toBeVisible();
    expect(screen.getByRole("button", { name: "取消清理本地库" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "取消" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "确认清库" }));
    await waitFor(() => expect(clearAllSaves).toHaveBeenCalledOnce());
    expect(clear).not.toHaveBeenCalled();
    expect(onWiped).toHaveBeenCalledOnce();
  });

  it("cancels wipe without calling Core cleanup", async () => {
    const clearAllSaves = vi.fn(async () => undefined);
    renderDockV1({ clearAllSaves });
    const user = userEvent.setup();
    await user.click(screen.getByText("调试"));
    await user.click(screen.getByRole("button", { name: "清理本地库" }));
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(clearAllSaves).not.toHaveBeenCalled();
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
});
