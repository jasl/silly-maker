// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionConfirmationContentV1 } from "./action-confirmation-dialog.tsx";

afterEach(cleanup);

describe("ActionConfirmationContentV1", () => {
  it("is content-only and delegates one native confirmation through typed intents", async () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    const externalFocus = document.createElement("button");
    document.body.append(externalFocus);
    externalFocus.focus();
    const user = userEvent.setup();

    render(
      <ActionConfirmationContentV1
        title="确认危险操作"
        titleId="confirmation-title"
        description="此操作需要再次确认"
        confirmLabel="确认执行"
        cancelLabel="取消"
        pendingText="正在提交"
        confirm={confirm}
        cancel={cancel}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector("[data-system-dialog-backdrop]")).toBeNull();
    expect(document.activeElement).toBe(externalFocus);
    expect(screen.getByRole("heading", { name: "确认危险操作" })).toHaveAttribute(
      "id",
      "confirmation-title",
    );
    const confirmButton = screen.getByRole("button", { name: "确认执行" });
    expect(confirmButton).not.toHaveAttribute("autofocus");
    await user.click(confirmButton);
    await user.click(confirmButton);

    expect(confirm).toHaveBeenCalledOnce();
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("正在提交");
    expect(cancel).not.toHaveBeenCalled();
    externalFocus.remove();
  });

  it("delegates cancel without dispatching or owning focus restoration", async () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ActionConfirmationContentV1
        title="确认清理"
        description={<span>清理所选存档</span>}
        confirmLabel="清理"
        cancelLabel="返回"
        pendingText="正在清理"
        confirm={confirm}
        cancel={cancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });
});
