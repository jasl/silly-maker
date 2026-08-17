// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { startTransition, Suspense, useState } from "react";
import type { ReactElement } from "react";

import { DebugCommandPanelV1 } from "./debug-command-panel.tsx";

afterEach(cleanup);

interface TestCommandV1 {
  readonly kind: "test.set";
  readonly value: number;
}

const commandV1: TestCommandV1 = Object.freeze({ kind: "test.set", value: 1 });
const suspendedCommandV1: TestCommandV1 = Object.freeze({ kind: "test.set", value: 2 });
const neverSettlesV1 = new Promise<never>(() => undefined);

function deferredV1<TValue>() {
  let resolve!: (value: TValue) => void;
  const promise = new Promise<TValue>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}

function SuspendedCommandRenderV1(props: { readonly active: boolean }): null {
  if (props.active) throw neverSettlesV1;
  return null;
}

function CommandCurrentnessHarnessV1(props: {
  readonly executeDebugCommand: () => Promise<{
    readonly kind: "handled";
    readonly message: string;
  }>;
}): ReactElement {
  const [command, setCommand] = useState<TestCommandV1>(commandV1);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          startTransition(() => setCommand(suspendedCommandV1));
        }}
      >
        尝试未提交命令
      </button>
      <Suspense fallback={null}>
        <DebugCommandPanelV1
          fields={null}
          command={command}
          executeDebugCommand={props.executeDebugCommand}
          canExecute={true}
          disabledReason=""
        />
        <SuspendedCommandRenderV1 active={command === suspendedCommandV1} />
      </Suspense>
    </>
  );
}

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

  it("does not let a suspended command render invalidate the committed pending result", async () => {
    const pending = deferredV1<{ readonly kind: "handled"; readonly message: string }>();
    render(<CommandCurrentnessHarnessV1 executeDebugCommand={() => pending.promise} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "执行调试命令" }));
    expect(screen.getByText("正在执行调试命令")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "尝试未提交命令" }));
    expect(screen.getByText("正在执行调试命令")).toBeVisible();

    await act(async () => {
      pending.resolve({ kind: "handled", message: "committed result" });
    });
    await waitFor(() => {
      expect(screen.getByText("committed result")).toBeVisible();
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
