// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createLabRuntimeInspectorOwnerV1,
  declareLabRuntimeInspectorDetachedUnitsV1,
  labRuntimeInspectorSourceV1,
} from "../application/runtime-inspection.ts";

describe("Engine Lab runtime inspection projection", () => {
  it("does not republish a large untouched absolute projection", () => {
    const listener = vi.fn();
    const unsubscribe = labRuntimeInspectorSourceV1.subscribe(listener);
    const owner = createLabRuntimeInspectorOwnerV1(
      Array.from({ length: 1_000 }, (_, index) => ({
        kind: "text" as const,
        unitId: `text-pack.test.${String(index).padStart(4, "0")}`,
        source: `assets/content/${String(index)}.text-pack.json`,
      })),
    );
    const initialNotifications = listener.mock.calls.length;
    const initialSnapshot = labRuntimeInspectorSourceV1.getSnapshot();
    for (let index = 0; index < 1_000; index += 1) {
      owner.projectUnit({
        kind: "text",
        unitId: `text-pack.test.${String(index).padStart(4, "0")}`,
        status: "unloaded",
        attempt: 0,
        failureCount: 0,
        timing: null,
        diagnostic: null,
      });
    }
    expect(listener).toHaveBeenCalledTimes(initialNotifications);
    expect(labRuntimeInspectorSourceV1.getSnapshot()).toBe(initialSnapshot);

    owner.projectUnit({
      kind: "text",
      unitId: "text-pack.test.0999",
      status: "acquiring",
      attempt: 1,
      failureCount: 0,
      timing: null,
      diagnostic: null,
    });
    expect(listener).toHaveBeenCalledTimes(initialNotifications + 1);
    owner.retire();
    unsubscribe();
  });

  it("shows static declarations as detached summaries only without a live owner", () => {
    declareLabRuntimeInspectorDetachedUnitsV1([
      { kind: "scene", unitId: "scene.test.detached", source: "src/detached.scene.json" },
      {
        kind: "narrative",
        unitId: "narrative.test.detached",
        source: "src/detached.ts",
        references: [{ kind: "asset", unitId: "asset.test.detached" }],
      },
    ]);

    const snapshot = labRuntimeInspectorSourceV1.getSnapshot();
    expect(snapshot.activeOwnerId).toBeNull();
    expect(snapshot.units.filter((unit) => unit.ownerStatus === "detached")).toEqual([
      expect.objectContaining({
        unitId: "scene.test.detached",
        ownerId: "engine-lab.runtime.detached",
        ownerStatus: "detached",
        status: "unloaded",
        attempt: 0,
        failureCount: 0,
        retryable: false,
      }),
      expect.objectContaining({
        unitId: "narrative.test.detached",
        ownerId: "engine-lab.runtime.detached",
        ownerStatus: "detached",
        status: "unloaded",
        references: [{ kind: "asset", unitId: "asset.test.detached" }],
      }),
    ]);
    expect(snapshot.workingSet).toEqual({
      references: 0,
      unloaded: 0,
      acquiring: 0,
      loaded: 0,
      failed: 0,
      released: 0,
    });
  });

  it("keeps staging and retired evidence bounded to touched units", async () => {
    const owner = createLabRuntimeInspectorOwnerV1([
      { kind: "scene", unitId: "scene.test.touched", source: "src/touched.scene.json" },
      { kind: "scene", unitId: "scene.test.untouched", source: "src/untouched.scene.json" },
    ]);
    const retry = vi.fn(async () => false);
    const beforeRetry = labRuntimeInspectorSourceV1.getSnapshot();
    expect(beforeRetry.units.filter((unit) => unit.ownerId === owner.ownerId)).toEqual([]);
    owner.setRetry("scene", "scene.test.touched", retry);
    owner.setRetry("scene", "scene.test.untouched", retry);
    expect(labRuntimeInspectorSourceV1.getSnapshot()).toBe(beforeRetry);

    owner.projectUnit({
      kind: "scene",
      unitId: "scene.test.touched",
      status: "failed",
      attempt: 3,
      failureCount: 2,
      timing: { loadMs: 4, admitMs: 5, activateMs: 6, totalMs: 15 },
      diagnostic: { code: "scene.test.absolute" },
    });
    expect(
      labRuntimeInspectorSourceV1.getSnapshot().units.filter((unit) =>
        unit.ownerId === owner.ownerId
      ),
    ).toEqual([
      expect.objectContaining({
        unitId: "scene.test.touched",
        ownerStatus: "staging",
        status: "failed",
        attempt: 3,
        failureCount: 2,
        retryable: true,
        diagnostic: { code: "scene.test.absolute" },
      }),
    ]);
    expect(
      await labRuntimeInspectorSourceV1.retry({
        ownerId: owner.ownerId,
        kind: "scene",
        unitId: "scene.test.touched",
      }),
    ).toBe(false);
    expect(retry).toHaveBeenCalledTimes(1);

    owner.activate();
    expect(
      labRuntimeInspectorSourceV1.getSnapshot().units.filter((unit) =>
        unit.ownerId === owner.ownerId
      ).map((unit) => [unit.unitId, unit.status]),
    ).toEqual([
      ["scene.test.touched", "failed"],
      ["scene.test.untouched", "unloaded"],
    ]);

    owner.setCurrent([{ kind: "scene", unitId: "scene.test.touched" }]);
    owner.retire();
    expect(
      labRuntimeInspectorSourceV1.getSnapshot().units.filter((unit) =>
        unit.ownerId === owner.ownerId
      ),
    ).toEqual([
      expect.objectContaining({
        unitId: "scene.test.touched",
        ownerStatus: "retired",
        status: "released",
        current: false,
        retryable: false,
      }),
    ]);
  });

  it("observes the real owner lifecycle, explicit retry, currentness, and late retirement fence", async () => {
    const owner = createLabRuntimeInspectorOwnerV1([
      { kind: "scene", unitId: "scene.test.runtime", source: "src/scene.json" },
      {
        kind: "narrative",
        unitId: "narrative.test.runtime",
        source: "src/narrative.ts",
        references: [{ kind: "scene", unitId: "scene.test.runtime" }],
      },
    ]);
    const retry = vi.fn(async () => {
      owner.acquiring("scene", "scene.test.runtime");
      owner.loaded("scene", "scene.test.runtime", {
        loadMs: 1,
        admitMs: 2,
        activateMs: 3,
        totalMs: 6,
      });
      return true;
    });
    owner.setRetry("scene", "scene.test.runtime", retry);
    owner.activate();
    owner.acquiring("scene", "scene.test.runtime");
    owner.failed("scene", "scene.test.runtime", { code: "scene.test.failed" });

    let row = labRuntimeInspectorSourceV1.getSnapshot().units.find((unit) =>
      unit.ownerId === owner.ownerId && unit.unitId === "scene.test.runtime"
    )!;
    expect(row).toMatchObject({
      status: "failed",
      attempt: 1,
      failureCount: 1,
      retryable: true,
      diagnostic: { code: "scene.test.failed" },
    });

    expect(
      await labRuntimeInspectorSourceV1.retry({
        ownerId: owner.ownerId,
        kind: "scene",
        unitId: "scene.test.runtime",
      }),
    ).toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
    owner.setCurrent([{ kind: "scene", unitId: "scene.test.runtime" }]);
    row = labRuntimeInspectorSourceV1.getSnapshot().units.find((unit) =>
      unit.ownerId === owner.ownerId && unit.unitId === "scene.test.runtime"
    )!;
    expect(row).toMatchObject({ status: "loaded", attempt: 2, current: true });
    expect(row.timing).toEqual({ loadMs: 1, admitMs: 2, activateMs: 3, totalMs: 6 });

    owner.installCodeSurfaceInspection({
      compositionId: "gui.test.runtime",
      nodes: [{
        nodeId: "node.test.runtime",
        viewId: "view.test.runtime",
        parentNodeId: null,
        slotId: null,
        documentPath: "/root",
        source: "src/runtime.tsx",
        layoutDomain: "application",
        outerGeometryOwner: "application",
        authoring: {
          label: "Runtime",
          properties: [],
          preview: "opaque",
          stateOwner: "react_local",
        },
        policy: { input: "application", nativeText: "allowed", portal: "none" },
      }],
    });
    owner.observeCodeSurfaceLifecycle({
      compositionId: "gui.test.runtime",
      nodeId: "node.test.runtime",
      viewId: "view.test.runtime",
      phase: "mounted",
    });
    expect(
      labRuntimeInspectorSourceV1.getSnapshot().codeSurfaceNodes.find((node) =>
        node.ownerId === owner.ownerId
      )?.lifecycle,
    ).toBe("mounted");

    owner.retire();
    owner.loaded("scene", "scene.test.runtime", {
      loadMs: 9,
      admitMs: 9,
      activateMs: 9,
      totalMs: 27,
    });
    row = labRuntimeInspectorSourceV1.getSnapshot().units.find((unit) =>
      unit.ownerId === owner.ownerId && unit.unitId === "scene.test.runtime"
    )!;
    expect(row).toMatchObject({ status: "released", current: false, ownerStatus: "retired" });
    expect(row.timing?.totalMs).toBe(6);
    expect(
      await labRuntimeInspectorSourceV1.retry({
        ownerId: owner.ownerId,
        kind: "scene",
        unitId: "scene.test.runtime",
      }),
    ).toBe(false);
  });

  it("coalesces one Code Surface lifecycle wave while keeping direct reads current", async () => {
    const owner = createLabRuntimeInspectorOwnerV1([]);
    owner.installCodeSurfaceInspection({
      compositionId: "gui.test.lifecycle-wave",
      nodes: Array.from({ length: 100 }, (_, index) => ({
        nodeId: `node.test.lifecycle-${String(index).padStart(3, "0")}`,
        viewId: "view.test.lifecycle",
        parentNodeId: null,
        slotId: null,
        documentPath: `/nodes/${String(index)}`,
        source: "src/lifecycle-wave.tsx",
        layoutDomain: "application" as const,
        outerGeometryOwner: "application" as const,
        authoring: {
          label: `Lifecycle ${String(index)}`,
          properties: [],
          preview: "opaque" as const,
          stateOwner: "react_local" as const,
        },
        policy: {
          input: "application" as const,
          nativeText: "allowed" as const,
          portal: "none" as const,
        },
      })),
    });
    const listener = vi.fn();
    const unsubscribe = labRuntimeInspectorSourceV1.subscribe(listener);

    for (let index = 0; index < 100; index += 1) {
      owner.observeCodeSurfaceLifecycle({
        compositionId: "gui.test.lifecycle-wave",
        nodeId: `node.test.lifecycle-${String(index).padStart(3, "0")}`,
        viewId: "view.test.lifecycle",
        phase: "mounted",
      });
    }

    expect(listener).not.toHaveBeenCalled();
    expect(
      labRuntimeInspectorSourceV1.getSnapshot().codeSurfaceNodes.filter((node) =>
        node.ownerId === owner.ownerId && node.lifecycle === "mounted"
      ),
    ).toHaveLength(100);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);

    owner.observeCodeSurfaceLifecycle({
      compositionId: "gui.test.lifecycle-wave",
      nodeId: "node.test.lifecycle-000",
      viewId: "view.test.lifecycle",
      phase: "released",
    });
    owner.retire();
    expect(listener).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
