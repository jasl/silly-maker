// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  SystemDialogOpenResultV1,
  SystemDialogSessionV1,
} from "./system-dialog-managed-contract.ts";
import { SettingsLauncherV1 } from "./settings-launcher.tsx";
import { SystemDialogControllerProviderInternalV1 } from "./use-system-dialog-controller.tsx";

afterEach(cleanup);

const preparationStartedV1 = Object.freeze({
  kind: "preparing" as const,
  code: "system_dialog.preparation_started" as const,
});

function sessionV1(input: {
  readonly openSettings: () => SystemDialogOpenResultV1;
  readonly openSaves?: () => SystemDialogOpenResultV1;
}): SystemDialogSessionV1 {
  return Object.freeze({
    getSnapshot: () => Object.freeze({ active: null }),
    openSettings: input.openSettings,
    openSaves: input.openSaves ?? (() => preparationStartedV1),
  }) as SystemDialogSessionV1;
}

describe("SettingsLauncherV1", () => {
  it("uses a native button, forwards its ref, and opens only the reserved settings surface", async () => {
    const ref = createRef<HTMLButtonElement>();
    const openSettings = vi.fn(() => preparationStartedV1);
    render(
      <SystemDialogControllerProviderInternalV1 session={sessionV1({ openSettings })}>
        <SettingsLauncherV1 ref={ref} label="设置" className="fixture-launcher" />
      </SystemDialogControllerProviderInternalV1>,
    );

    const launcher = screen.getByRole("button", { name: "设置" });
    expect(launcher.tagName).toBe("BUTTON");
    expect(launcher).toHaveAttribute("type", "button");
    expect(launcher).toHaveClass("silly-button", "fixture-launcher");
    expect(ref.current).toBe(launcher);

    await userEvent.setup().click(launcher);
    expect(openSettings).toHaveBeenCalledOnce();
    expect(openSettings).toHaveBeenCalledWith();
  });

  it("fails with a stable code when no SystemDialogHost owns the launcher", () => {
    expect(() => render(<SettingsLauncherV1 label="设置" />)).toThrowError(
      "ui.system_dialog_host_missing",
    );
  });
});
