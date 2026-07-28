// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DebugCommandPanelV1 } from "./DebugCommandPanel.tsx";

afterEach(cleanup);

const commandV1 = Object.freeze({ kind: "test.set", value: 1 });

describe("DebugCommandPanelV1", () => {
  it("submits the command and shows the handled message", async () => {
    const executed: unknown[] = [];
    render(
      <DebugCommandPanelV1
        fields={<span>字段</span>}
        command={commandV1}
        executeDebugCommand={async (command) => {
          executed.push(command);
          return { kind: "handled", message: "committed" };
        }}
        canExecute={true}
        disabledReason=""
      />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "执行调试命令" }));
    await waitFor(() => {
      expect(screen.getByText("committed")).toBeVisible();
    });
    expect(executed).toEqual([commandV1]);
  });

  it("clears a stale result when the command identity changes", async () => {
    const execute = async () => ({ kind: "handled", message: "committed" }) as const;
    const view = render(
      <DebugCommandPanelV1
        fields={null}
        command={commandV1}
        executeDebugCommand={execute}
        canExecute={true}
        disabledReason=""
      />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "执行调试命令" }));
    await waitFor(() => {
      expect(screen.getByText("committed")).toBeVisible();
    });
    // A new command object (edited form) invalidates the shown outcome.
    view.rerender(
      <DebugCommandPanelV1
        fields={null}
        command={{ kind: "test.set", value: 2 }}
        executeDebugCommand={execute}
        canExecute={true}
        disabledReason=""
      />,
    );
    await waitFor(() => {
      expect(screen.queryByText("committed")).toBeNull();
    });
  });

  it("announces rejections as alerts and disables without capability", () => {
    render(
      <DebugCommandPanelV1
        fields={null}
        command={commandV1}
        executeDebugCommand={async () => ({ kind: "rejected", message: "nope" })}
        canExecute={false}
        disabledReason="需要 cheats capability"
      />,
    );
    const button = screen.getByRole("button", { name: "执行调试命令" });
    expect(button).toBeDisabled();
    expect(screen.getByText("需要 cheats capability")).toBeVisible();
  });
});
