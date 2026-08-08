// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SystemDialogSessionV1 } from "./system-dialog-managed-contract.ts";
import {
  SystemDialogControllerProviderInternalV1,
  useSystemDialogControllerV1,
} from "./use-system-dialog-controller.tsx";

afterEach(cleanup);

describe("useSystemDialogControllerV1", () => {
  it("returns the opaque session's structured results without exposing lifecycle evidence", () => {
    const settingsResult = Object.freeze({
      kind: "preparing" as const,
      code: "system_dialog.preparation_started" as const,
    });
    const savesResult = Object.freeze({
      kind: "rejected" as const,
      code: "system_dialog.renderer_missing" as const,
    });
    const openSettings = vi.fn(() => settingsResult);
    const openSaves = vi.fn(() => savesResult);
    const session = Object.freeze({
      getSnapshot: () => Object.freeze({ active: null }),
      openSettings,
      openSaves,
    }) as unknown as SystemDialogSessionV1;
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <SystemDialogControllerProviderInternalV1 session={session}>
        {children}
      </SystemDialogControllerProviderInternalV1>
    );

    const rendered = renderHook(() => useSystemDialogControllerV1(), { wrapper });
    const controller = rendered.result.current;

    expect(controller.openSettings()).toBe(settingsResult);
    expect(controller.openSaves()).toBe(savesResult);
    expect(openSettings).toHaveBeenCalledWith();
    expect(openSaves).toHaveBeenCalledWith();
    expect(Reflect.ownKeys(controller)).toEqual(["openSettings", "openSaves"]);
    expect(Object.isFrozen(controller)).toBe(true);

    rendered.rerender();
    expect(rendered.result.current).toBe(controller);
  });
});
