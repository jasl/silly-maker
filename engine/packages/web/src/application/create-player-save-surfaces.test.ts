// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { createPlayerSaveSurfacesV1 } from "./create-player-save-surfaces.ts";

describe("createPlayerSaveSurfacesV1", () => {
  it("projects Core's cleanup barrier as a typed maintenance operation", async () => {
    let releaseClear: (() => void) | undefined;
    const clearGate = new Promise<void>((resolve) => {
      releaseClear = resolve;
    });
    const clearAllSaves = vi.fn(async () => {
      await clearGate;
    });
    const listSlots = vi.fn();
    const clear = vi.fn();
    const surfaces = createPlayerSaveSurfacesV1({
      files: ({
        selectOne: vi.fn(),
        download: vi.fn(),
      }) as never,
      persistence: ({
        getStatus: vi.fn(),
        listSlots,
        save: vi.fn(),
        load: vi.fn(),
        clear,
        annotateSave: vi.fn(),
        importSave: vi.fn(),
        exportSave: vi.fn(),
        exportCurrentSave: vi.fn(),
      }) as never,
      clearAllSaves,
    });

    const clearing = surfaces.maintenance.clearAllSaves();
    await vi.waitFor(() => expect(clearAllSaves).toHaveBeenCalledTimes(1));
    expect(listSlots).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();

    releaseClear?.();
    await clearing;
  });

  it("always creates the debug maintenance port even without default Save UI labels", async () => {
    const listSlots = vi.fn(async () => []);
    const surfaces = createPlayerSaveSurfacesV1({
      files: ({
        selectOne: vi.fn(),
        download: vi.fn(),
      }) as never,
      persistence: ({
        getStatus: vi.fn(),
        listSlots,
        save: vi.fn(),
        load: vi.fn(),
        clear: vi.fn(),
        annotateSave: vi.fn(),
        importSave: vi.fn(),
        exportSave: vi.fn(),
        exportCurrentSave: vi.fn(),
      }) as never,
      clearAllSaves: vi.fn(),
    });

    expect(surfaces.saveUi).toBeUndefined();
    await surfaces.maintenance.savePort.listSlots();
    expect(listSlots).toHaveBeenCalledTimes(1);
  });

  it("shares one player-safe port with the default Save UI when labels exist", () => {
    const surfaces = createPlayerSaveSurfacesV1({
      files: ({}) as never,
      persistence: ({}) as never,
      clearAllSaves: vi.fn(),
      saveLabels: ({}) as never,
    });

    expect(surfaces.saveUi?.port).toBe(surfaces.maintenance.savePort);
  });

  it("shares the one semantic inspection and recovery surface with UI and maintenance", async () => {
    const inspectSave = vi.fn(async () => ({
      kind: "rejected" as const,
      slotId: "quick" as const,
      code: "empty_slot",
    }));
    const restoreBackup = vi.fn(async () => ({
      kind: "restored" as const,
      slotId: "quick" as const,
    }));
    const surfaces = createPlayerSaveSurfacesV1({
      files: ({ selectOne: vi.fn(), download: vi.fn() }) as never,
      persistence: ({ inspectSave, restoreBackup }) as never,
      clearAllSaves: vi.fn(),
      saveLabels: ({}) as never,
    });

    expect(surfaces.saveUi?.port).toBe(surfaces.maintenance.savePort);
    await surfaces.saveUi?.port.recovery?.inspectSave("quick");
    await surfaces.maintenance.savePort.recovery?.restoreBackup("quick");

    expect(inspectSave).toHaveBeenCalledOnce();
    expect(inspectSave).toHaveBeenCalledWith("quick");
    expect(restoreBackup).toHaveBeenCalledOnce();
    expect(restoreBackup).toHaveBeenCalledWith("quick");
  });

  it("preserves one declarative custom Saves component without creating the default Save UI", () => {
    const CustomSavesV1 = () => null;
    const customSaves = {
      kind: "custom" as const,
      accessibleName: "Synthetic saves",
      component: CustomSavesV1,
    };
    const surfaces = createPlayerSaveSurfacesV1({
      files: ({}) as never,
      persistence: ({}) as never,
      clearAllSaves: vi.fn(),
      customSaves,
    });

    expect(surfaces.saveUi).toBeUndefined();
    expect(surfaces.customSaves).toBe(customSaves);
  });

  it("rejects ambiguous standard/custom Save authority before either surface is created", () => {
    const customSaves = {
      kind: "custom" as const,
      accessibleName: "Synthetic saves",
      component: () => null,
    };

    expect(() =>
      createPlayerSaveSurfacesV1({
        files: ({}) as never,
        persistence: ({}) as never,
        clearAllSaves: vi.fn(),
        saveLabels: ({}) as never,
        customSaves,
      })
    ).toThrowError("web.system_saves_ambiguous");
    expect(() =>
      createPlayerSaveSurfacesV1({
        files: ({}) as never,
        persistence: ({}) as never,
        clearAllSaves: vi.fn(),
        saveGuard: () => ({ allowed: true }),
        customSaves,
      })
    ).toThrowError("web.system_saves_ambiguous");
  });
});
