// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DevelopmentToolLauncherInternalV1 } from "./development-tool-launcher.tsx";

afterEach(cleanup);

describe("DevelopmentToolLauncherInternalV1", () => {
  it("hosts both resident actions, preserves hooks, and snaps a movable launcher", async () => {
    const activateAuthoring = vi.fn();
    const activateDebug = vi.fn();
    const onPositionChange = vi.fn();
    const debugButtonRef = createRef<HTMLButtonElement>();
    render(
      <DevelopmentToolLauncherInternalV1
        portalTarget={document.body}
        position="top_left"
        movable
        authoringAction={{ label: "打开内嵌制作", onActivate: activateAuthoring }}
        debugAction={{
          label: "调试",
          expanded: true,
          buttonRef: debugButtonRef,
          onActivate: activateDebug,
        }}
        onPositionChange={onPositionChange}
      >
        <div data-launcher-content="true">工具菜单</div>
      </DevelopmentToolLauncherInternalV1>,
    );

    const launcher = document.querySelector<HTMLElement>("[data-development-tool-launcher]");
    expect(launcher).not.toBeNull();
    expect(launcher).toHaveAttribute("data-development-tool-panel", "true");
    expect(launcher).toHaveAttribute("data-story-debug-dock", "true");
    expect(launcher).toHaveAttribute("data-devdock-position", "top_left");
    expect(screen.getByText("工具菜单")).toBeVisible();

    const actions = screen.getByRole("group", { name: "开发工具" });
    const user = userEvent.setup();
    await user.click(within(actions).getByRole("button", { name: "打开内嵌制作" }));
    await user.click(within(actions).getByRole("button", { name: "调试" }));
    expect(activateAuthoring).toHaveBeenCalledOnce();
    expect(activateDebug).toHaveBeenCalledOnce();
    expect(debugButtonRef.current).toHaveAttribute("aria-expanded", "true");

    const drag = document.querySelector<HTMLElement>("[data-debug-dock-chip-drag]");
    expect(drag).not.toBeNull();
    if (drag === null) throw new TypeError("missing launcher drag handle");
    fireEvent.pointerDown(drag, { button: 0, pointerId: 7, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(drag, { pointerId: 7, clientX: 100, clientY: 100 });
    expect(launcher).toHaveAttribute("data-devdock-position", "bottom_right");
    expect(onPositionChange).toHaveBeenCalledWith("bottom_right");
  });
});
