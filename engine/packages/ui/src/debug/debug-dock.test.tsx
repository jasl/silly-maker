// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import { DebugDockV1 } from "./debug-dock.tsx";

afterEach(cleanup);

function fakeSavePortV1(overrides?: Partial<SaveOverlayPortV1>): SaveOverlayPortV1 {
  return {
    getStatus: () => ({ kind: "ready" }) as never,
    listSlots: vi.fn(async () => [
      { slotId: "auto.current", health: "valid" },
      { slotId: "manual.1", health: "valid" },
    ]) as never,
    save: vi.fn() as never,
    load: vi.fn() as never,
    clear: vi.fn(async () => ({ kind: "committed" })) as never,
    annotateSave: vi.fn() as never,
    importSave: vi.fn(async () => ({ kind: "imported" })) as never,
    exportSave: vi.fn() as never,
    exportCurrentSave: vi.fn(async () => ({ payload: "{}" })) as never,
    ...overrides,
  } as SaveOverlayPortV1;
}

describe("DebugDockV1", () => {
  it("exports the current save and reports the done note", async () => {
    const port = fakeSavePortV1();
    render(<DebugDockV1 savePort={port} defaultOpen />);
    fireEvent.click(screen.getByText("Export state"));
    await waitFor(() => {
      expect(document.querySelector("[data-debug-dock-note]")?.textContent).toBe(
        "State exported as JSON.",
      );
    });
    expect(port.exportCurrentSave).toHaveBeenCalledTimes(1);
  });

  it("imports silently on cancel and notes success", async () => {
    const port = fakeSavePortV1({
      importSave: vi.fn(async () => ({ kind: "cancelled" })) as never,
    });
    render(<DebugDockV1 savePort={port} defaultOpen />);
    fireEvent.click(screen.getByText("Import state"));
    await waitFor(() => {
      expect(port.importSave).toHaveBeenCalledTimes(1);
    });
    expect(document.querySelector("[data-debug-dock-note]")).toBeNull();
  });

  it("explains a pre-checked incompatible import without touching the session", async () => {
    const port = fakeSavePortV1({
      importSave: vi.fn(async () => ({ kind: "rejected", code: "incompatible" })) as never,
    });
    render(<DebugDockV1 savePort={port} defaultOpen />);
    fireEvent.click(screen.getByText("Import state"));
    await waitFor(() => {
      expect(document.querySelector("[data-debug-dock-note]")?.textContent).toContain(
        "different game or version",
      );
    });
  });

  it("explains a corrupt import file", async () => {
    const port = fakeSavePortV1({
      importSave: vi.fn(async () => ({ kind: "rejected", code: "invalid_record" })) as never,
    });
    render(<DebugDockV1 savePort={port} defaultOpen />);
    fireEvent.click(screen.getByText("Import state"));
    await waitFor(() => {
      expect(document.querySelector("[data-debug-dock-note]")?.textContent).toContain(
        "Not a valid engine save",
      );
    });
  });

  it("arms the wipe on first click and clears every slot on confirm", async () => {
    const port = fakeSavePortV1();
    render(<DebugDockV1 savePort={port} defaultOpen />);
    fireEvent.click(screen.getByText("Wipe local data"));
    expect(port.clear).not.toHaveBeenCalled();
    expect(screen.getByText("Confirm wipe?")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();

    fireEvent.click(screen.getByText("Confirm wipe?"));
    await waitFor(() => {
      expect(document.querySelector("[data-debug-dock-note]")?.textContent).toBe(
        "Local data wiped.",
      );
    });
    expect(port.clear).toHaveBeenCalledTimes(2);
  });

  it("cancel disarms the wipe without clearing", () => {
    const port = fakeSavePortV1();
    render(<DebugDockV1 savePort={port} defaultOpen />);
    fireEvent.click(screen.getByText("Wipe local data"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Wipe local data")).toBeTruthy();
    expect(port.clear).not.toHaveBeenCalled();
  });

  it("prefers the Story wipe override and its custom note", async () => {
    const onWipeLocal = vi.fn(async () => "Custom wiped.");
    const port = fakeSavePortV1();
    render(<DebugDockV1 savePort={port} onWipeLocal={onWipeLocal} defaultOpen />);
    fireEvent.click(screen.getByText("Wipe local data"));
    fireEvent.click(screen.getByText("Confirm wipe?"));
    await waitFor(() => {
      expect(document.querySelector("[data-debug-dock-note]")?.textContent).toBe("Custom wiped.");
    });
    expect(onWipeLocal).toHaveBeenCalledTimes(1);
    expect(port.clear).not.toHaveBeenCalled();
  });

  it("renders reinitialize, story info and actions; hides port actions without a port", () => {
    const onReinitialize = vi.fn();
    render(
      <DebugDockV1
        onReinitialize={onReinitialize}
        info={<span data-story-info="true">hud line</span>}
        actions={<button data-story-action="true">Story button</button>}
        labels={{ reinitializeLabel: "重新初始化" }}
        defaultOpen
      />,
    );
    expect(document.querySelector("[data-story-info]")).toBeTruthy();
    expect(document.querySelector("[data-story-action]")).toBeTruthy();
    expect(screen.queryByText("Export state")).toBeNull();
    expect(screen.queryByText("Wipe local data")).toBeNull();
    fireEvent.click(screen.getByText("重新初始化"));
    expect(onReinitialize).toHaveBeenCalledTimes(1);
  });
});
