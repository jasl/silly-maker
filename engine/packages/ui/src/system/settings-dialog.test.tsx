// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsDialogContentV1 } from "./settings-dialog.tsx";

afterEach(cleanup);

describe("SettingsDialogContentV1", () => {
  it("renders only content in authored order and delegates its typed close intent", async () => {
    const close = vi.fn();
    const externalFocus = document.createElement("button");
    document.body.append(externalFocus);
    externalFocus.focus();
    const sections = Object.freeze([
      <section key="display" aria-label="显示设置">显示</section>,
      <section key="audio" aria-label="声音设置">声音</section>,
      <section key="accessibility" aria-label="辅助设置">辅助</section>,
    ]);

    render(
      <SettingsDialogContentV1
        title="设置"
        closeLabel="关闭设置"
        sections={sections}
        emptyText="此应用没有可调整设置"
        close={close}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector("[data-system-dialog-backdrop]")).toBeNull();
    expect(document.activeElement).toBe(externalFocus);
    expect(screen.getByRole("heading", { name: "设置" })).toBeVisible();
    expect(screen.getAllByTestId("settings-section").map((section) => section.textContent)).toEqual(
      ["显示", "声音", "辅助"],
    );
    const closeButton = screen.getByRole("button", { name: "关闭设置" });
    expect(closeButton).not.toHaveAttribute("autofocus");
    await userEvent.setup().click(closeButton);
    expect(close).toHaveBeenCalledOnce();
    externalFocus.remove();
  });

  it("renders only the truthful application-supplied empty text", () => {
    render(
      <SettingsDialogContentV1
        title="设置"
        closeLabel="关闭设置"
        sections={Object.freeze([])}
        emptyText="当前故事没有可调整设置"
        close={() => undefined}
      />,
    );

    expect(screen.getByText("当前故事没有可调整设置")).toBeVisible();
    expect(screen.queryAllByTestId("settings-section")).toHaveLength(0);
  });
});
