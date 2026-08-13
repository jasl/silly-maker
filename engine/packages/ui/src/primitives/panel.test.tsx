// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PanelV1 } from "./panel.tsx";

afterEach(cleanup);

describe("PanelV1", () => {
  it("renders the window chrome: visible title, close control, focusable content", async () => {
    const onClose = vi.fn();
    render(
      <PanelV1
        title="成长相册"
        titleId="album-title"
        onClose={onClose}
        closeLabel="关闭"
        rootAttributes={{ "data-test-panel": "album" }}
      >
        <p>内容</p>
      </PanelV1>,
    );

    expect(screen.getByRole("heading", { name: "成长相册" })).toBeVisible();
    // The scrollable content region is keyboard-reachable and labelled by
    // the title (the WCAG scrollable-region-focusable discipline).
    const content = screen.getByText("内容").parentElement;
    expect(content).toHaveAttribute("tabindex", "0");
    expect(content).toHaveAttribute("aria-labelledby", "album-title");

    await userEvent.setup().click(screen.getByRole("button", { name: "关闭" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("omits the close control when the panel is not dismissable", () => {
    render(<PanelV1 title="T">body</PanelV1>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders an icon close control labelled only by the accessible name", async () => {
    const onClose = vi.fn();
    render(
      <PanelV1
        title="调参"
        onClose={onClose}
        closeLabel="关闭"
        closeControl="icon"
        closeAttributes={{ "data-devdock-window-close": "true" }}
      >
        内容
      </PanelV1>,
    );

    const close = screen.getByRole("button", { name: "关闭" });
    expect(close).toHaveAttribute("data-panel-close", "true");
    expect(close).toHaveAttribute("data-devdock-window-close", "true");
    expect(close).toHaveAttribute("aria-label", "关闭");
    expect(close).not.toHaveTextContent("关闭");
    await userEvent.setup().click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("forwards header props onto the title bar", () => {
    const onPointerDown = vi.fn();
    render(
      <PanelV1
        title="可拖动"
        headerProps={{
          "data-panel-drag": "true",
          onPointerDown,
        }}
      >
        内容
      </PanelV1>,
    );

    const header = screen.getByRole("heading", { name: "可拖动" }).parentElement;
    expect(header).toHaveAttribute("data-panel-drag", "true");
    header?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onPointerDown).toHaveBeenCalled();
  });
});
