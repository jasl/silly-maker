// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeCapabilitiesV1, RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { createInputRouterV1 } from "../input/input-router.ts";
import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import { DevDockPortalCoordinatorV1 } from "./dev-dock-portal-coordinator.tsx";
import { createDevDockContributionSetV1, DevDockV1 } from "./dev-dock.tsx";
import { SessionMaintenancePanelV1 } from "./session-maintenance-panel.tsx";

afterEach(cleanup);

function capabilityPortV1(initial: RuntimeCapabilitiesV1): RuntimeCapabilityPortV1 & {
  publish(next: RuntimeCapabilitiesV1): void;
} {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    state: {
      getCurrent: () => current,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    setEnabled: vi.fn() as never,
    publish(next) {
      current = next;
      for (const listener of listeners) listener();
    },
  };
}

function fakeSavePortV1(overrides?: Partial<SaveOverlayPortV1>): SaveOverlayPortV1 {
  return {
    getStatus: () => ({ kind: "ready" }) as never,
    listSlots: vi.fn(async () => [
      { slotId: "auto.current", health: "valid" },
      { slotId: "manual.1", health: "valid" },
    ]) as never,
    save: vi.fn() as never,
    load: vi.fn() as never,
    clear: vi.fn(async (slotId) => ({ kind: "cleared", slotId })) as never,
    annotateSave: vi.fn() as never,
    importSave: vi.fn(async () => ({ kind: "imported" })) as never,
    exportSave: vi.fn() as never,
    exportCurrentSave: vi.fn(async () => ({ filename: "state.json" })) as never,
    ...overrides,
  };
}

describe("SessionMaintenancePanelV1", () => {
  it("exports and imports through the player-safe Save port", async () => {
    const port = fakeSavePortV1();
    render(<SessionMaintenancePanelV1 savePort={port} />);

    fireEvent.click(screen.getByText("Export state"));
    await waitFor(() =>
      expect(document.querySelector("[data-session-maintenance-note]")?.textContent).toBe(
        "State exported as JSON.",
      ),
    );
    expect(port.exportCurrentSave).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Import state"));
    await waitFor(() =>
      expect(document.querySelector("[data-session-maintenance-note]")?.textContent).toBe(
        "State imported.",
      ),
    );
    expect(port.importSave).toHaveBeenCalledTimes(1);
  });

  it("explains pre-checked incompatible and invalid imports in player-facing language", async () => {
    const importSave = vi
      .fn()
      .mockResolvedValueOnce({ kind: "rejected", code: "incompatible" })
      .mockResolvedValueOnce({ kind: "rejected", code: "invalid_record" });
    const port = fakeSavePortV1({ importSave: importSave as never });
    render(<SessionMaintenancePanelV1 savePort={port} />);

    fireEvent.click(screen.getByText("Import state"));
    await waitFor(() =>
      expect(document.querySelector("[data-session-maintenance-note]")?.textContent).toContain(
        "different game or version",
      ),
    );

    fireEvent.click(screen.getByText("Import state"));
    await waitFor(() =>
      expect(document.querySelector("[data-session-maintenance-note]")?.textContent).toContain(
        "Not a valid engine save",
      ),
    );
    expect(importSave).toHaveBeenCalledTimes(2);
  });

  it("shows the build version stamp readout and hides an empty stamp", () => {
    const { rerender } = render(
      <SessionMaintenancePanelV1
        versionStamp={{
          applicationVersion: "1.2.0",
          applicationCommit: "abc1234",
          engineVersion: "0.4.2",
          engineCommit: "def5678",
        }}
      />,
    );
    expect(document.querySelector("[data-session-maintenance-versions]")?.textContent).toBe(
      "app 1.2.0 (abc1234) · engine 0.4.2 (def5678)",
    );

    rerender(
      <SessionMaintenancePanelV1
        versionStamp={{
          applicationVersion: null,
          applicationCommit: null,
          engineVersion: null,
          engineCommit: null,
        }}
      />,
    );
    expect(document.querySelector("[data-session-maintenance-versions]")).toBeNull();
  });

  it("arms cleanup, skips empty slots, and reports every structured failure", async () => {
    const clear = vi.fn(async (slotId: string) =>
      slotId === "manual.1"
        ? ({ kind: "rejected", code: "unavailable" } as const)
        : ({ kind: "cleared", slotId } as const),
    );
    const port = fakeSavePortV1({
      listSlots: vi.fn(async () => [
        { slotId: "auto.current", health: "empty" },
        { slotId: "manual.1", health: "valid" },
        { slotId: "quick", health: "invalid" },
      ]) as never,
      clear: clear as never,
    });
    render(<SessionMaintenancePanelV1 savePort={port} />);

    fireEvent.click(screen.getByText("Clear all saves"));
    expect(clear).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Confirm clear?"));

    await waitFor(() =>
      expect(document.querySelector("[data-session-maintenance-note]")?.textContent).toContain(
        "Save cleanup incomplete",
      ),
    );
    expect(document.querySelector("[data-session-maintenance-note]")?.textContent).toContain(
      "unavailable",
    );
    expect(clear).toHaveBeenCalledTimes(2);
    expect(clear).toHaveBeenNthCalledWith(1, "manual.1");
    expect(clear).toHaveBeenNthCalledWith(2, "quick");
  });

  it("reports completion only after every listed save returns a clear-equivalent result", async () => {
    const port = fakeSavePortV1();
    render(<SessionMaintenancePanelV1 savePort={port} />);

    fireEvent.click(screen.getByText("Clear all saves"));
    fireEvent.click(screen.getByText("Confirm clear?"));

    await waitFor(() =>
      expect(document.querySelector("[data-session-maintenance-note]")?.textContent).toBe(
        "All saves cleared.",
      ),
    );
    expect(port.clear).toHaveBeenCalledTimes(2);
  });

  it("cancels an armed cleanup without mutating persistence", () => {
    const port = fakeSavePortV1();
    render(<SessionMaintenancePanelV1 savePort={port} />);

    fireEvent.click(screen.getByText("Clear all saves"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.getByText("Clear all saves")).toBeTruthy();
    expect(port.clear).not.toHaveBeenCalled();
  });

  it("serializes lifecycle reinitialize with every persistence operation", async () => {
    let resolveReinitialize: (() => void) | undefined;
    const onReinitialize = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveReinitialize = resolve;
        }),
    );
    render(
      <SessionMaintenancePanelV1 savePort={fakeSavePortV1()} onReinitialize={onReinitialize} />,
    );

    const reinitialize = screen.getByRole("button", { name: "Reinitialize" });
    fireEvent.click(reinitialize);
    await waitFor(() => expect(onReinitialize).toHaveBeenCalledTimes(1));
    expect(reinitialize).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export state" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Import state" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear all saves" })).toBeDisabled();

    await act(async () => resolveReinitialize?.());
    await waitFor(() => expect(reinitialize).toBeEnabled());
  });

  it("unmounts panel state on capability revoke and ignores stale async completion", async () => {
    let resolveExport: (() => void) | undefined;
    const exportCurrentSave = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveExport = () => resolve({ filename: "state.json" });
        }),
    );
    const port = fakeSavePortV1({
      exportCurrentSave: exportCurrentSave as never,
    });
    const capabilities = capabilityPortV1({
      debugTools: true,
      cheats: true,
      automationBridge: false,
    });
    const contributions = createDevDockContributionSetV1({
      panels: [
        {
          id: "engine.session_maintenance",
          side: "right",
          title: "Session maintenance",
          authority: "cheat",
          render: () => <SessionMaintenancePanelV1 savePort={port} />,
        },
      ],
    });
    render(
      <DevDockPortalCoordinatorV1>
        <DevDockV1
          capabilities={capabilities}
          contributions={contributions}
          inputRouter={createInputRouterV1()}
          openState={{ leftOpen: false, rightOpen: true }}
          onOpenStateChange={vi.fn()}
        />
      </DevDockPortalCoordinatorV1>,
    );

    fireEvent.click(screen.getByText("Clear all saves"));
    expect(screen.getByText("Confirm clear?")).toBeTruthy();
    act(() =>
      capabilities.publish({
        debugTools: false,
        cheats: false,
        automationBridge: false,
      }),
    );
    expect(document.querySelector("[data-session-maintenance-panel]")).toBeNull();
    act(() =>
      capabilities.publish({
        debugTools: true,
        cheats: true,
        automationBridge: false,
      }),
    );
    expect(screen.getByText("Clear all saves")).toBeTruthy();
    expect(screen.queryByText("Confirm clear?")).toBeNull();
    expect(document.querySelector("[data-session-maintenance-note]")).toBeNull();

    fireEvent.click(screen.getByText("Export state"));
    act(() =>
      capabilities.publish({
        debugTools: false,
        cheats: false,
        automationBridge: false,
      }),
    );
    await act(async () => resolveExport?.());
    act(() =>
      capabilities.publish({
        debugTools: true,
        cheats: true,
        automationBridge: false,
      }),
    );
    expect(document.querySelector("[data-session-maintenance-note]")).toBeNull();
  });
});
