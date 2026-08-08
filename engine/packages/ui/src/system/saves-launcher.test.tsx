// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  SystemDialogOpenResultV1,
  SystemDialogSessionV1,
} from "./system-dialog-managed-contract.ts";
import { SavesLauncherV1 } from "./saves-launcher.tsx";
import { SystemDialogControllerProviderInternalV1 } from "./use-system-dialog-controller.tsx";

afterEach(cleanup);

const preparationStartedV1 = Object.freeze({
  kind: "preparing" as const,
  code: "system_dialog.preparation_started" as const,
});

function sessionV1(input: {
  readonly openSettings?: () => SystemDialogOpenResultV1;
  readonly openSaves: () => SystemDialogOpenResultV1;
}): SystemDialogSessionV1 {
  return Object.freeze({
    getSnapshot: () => Object.freeze({ active: null }),
    openSettings: input.openSettings ?? (() => preparationStartedV1),
    openSaves: input.openSaves,
  }) as SystemDialogSessionV1;
}

describe("SavesLauncherV1", () => {
  it("opens only the reserved Saves surface through the structured controller", async () => {
    const openSaves = vi.fn(() => preparationStartedV1);
    const openSettings = vi.fn(() => preparationStartedV1);
    render(
      <SystemDialogControllerProviderInternalV1 session={sessionV1({ openSettings, openSaves })}>
        <SavesLauncherV1 label="存档" />
      </SystemDialogControllerProviderInternalV1>,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "存档" }));

    expect(openSaves).toHaveBeenCalledOnce();
    expect(openSaves).toHaveBeenCalledWith();
    expect(openSettings).not.toHaveBeenCalled();
  });

  it("fails with a stable code when no SystemDialogHost owns the launcher", () => {
    expect(() => render(<SavesLauncherV1 label="存档" />)).toThrowError(
      "ui.system_dialog_host_missing",
    );
  });
});
