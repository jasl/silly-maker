// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInputRouterV1 } from "../input/input-router.ts";
import { SystemDialogHostV1 } from "./system-dialog-host.tsx";
import type { SystemDialogHostPropsV1 } from "./system-dialog-host.tsx";
import { TitleScreenV1 } from "./title-screen.tsx";

afterEach(cleanup);

const labelsV1 = Object.freeze({
  newGameLabel: "New game",
  continueLabel: "Continue",
  loadGameLabel: "Load game",
  settingsLabel: "Settings",
});

function renderTitleV1(node: ReactNode, saves?: SystemDialogHostPropsV1["saves"]) {
  return render(
    <SystemDialogHostV1
      inputRouter={createInputRouterV1()}
      {...(saves === undefined ? {} : { saves })}
      settings={Object.freeze({
        title: "Settings",
        closeLabel: "Close",
        sections: Object.freeze([]),
        emptyText: "Empty",
      })}
    >
      {node}
    </SystemDialogHostV1>,
  );
}

describe("TitleScreenV1", () => {
  it("routes custom Load through the typed System saves surface and restores focus on close", async () => {
    const renderCustomSaves = vi.fn(({ close }: { readonly close: () => void }) => (
      <button type="button" onClick={close}>
        Close custom saves
      </button>
    ));
    renderTitleV1(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={vi.fn()}
        middleAction={Object.freeze({ kind: "load" })}
      />,
      Object.freeze({
        kind: "custom",
        accessibleName: "Custom saves",
        render: renderCustomSaves,
      }),
    );

    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    const load = screen.getByRole("button", { name: "Load game" });
    expect(load).toBeEnabled();
    await userEvent.setup().click(load);
    expect(renderCustomSaves).toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Custom saves" })).toHaveAttribute(
      "data-system-surface",
      "saves",
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Close custom saves" }));
    expect(screen.queryByRole("dialog", { name: "Custom saves" })).toBeNull();
    expect(load).toHaveFocus();
  });

  it("keeps Continue disabled until its runnable autosave contract is true", () => {
    renderTitleV1(
      <TitleScreenV1
        title="Synthetic Story"
        labels={labelsV1}
        onNewGame={vi.fn()}
        middleAction={Object.freeze({
          kind: "continue",
          available: false,
          onActivate: vi.fn(),
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
