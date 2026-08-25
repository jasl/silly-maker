// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  RuntimeInspectorSnapshotV1,
  RuntimeInspectorSourceV1,
  RuntimeInspectorUnitFacetV1,
} from "../core/runtime-inspection.ts";
import { RuntimeInspectorPanelV1 } from "./runtime-inspector.tsx";

afterEach(cleanup);

function unitV1(index: number): RuntimeInspectorUnitFacetV1 {
  const unitId = `scene.test.${String(index).padStart(4, "0")}`;
  return {
    kind: "scene",
    unitId,
    source: `src/scenes/${unitId}.json`,
    ownerId: "runtime.test.active",
    ownerStatus: "active",
    status: index === 999 ? "loaded" : index === 1 ? "failed" : "unloaded",
    current: index === 999,
    attempt: index === 1 ? 1 : index === 999 ? 1 : 0,
    failureCount: index === 1 ? 1 : 0,
    retryable: index === 1,
    timing: index === 999 ? { loadMs: 1, admitMs: 2, activateMs: 3, totalMs: 6 } : null,
    diagnostic: index === 1 ? { code: "scene.load_failed" } : null,
    references: [],
  };
}

function sourceV1(snapshot: RuntimeInspectorSnapshotV1) {
  const retry = vi.fn<RuntimeInspectorSourceV1["retry"]>().mockResolvedValue(true);
  const source: RuntimeInspectorSourceV1 = {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    retry,
  };
  return { source, retry };
}

describe("Runtime Inspector", () => {
  it("virtualizes a large working set and reveals the committed current unit", async () => {
    const units = Array.from({ length: 1_000 }, (_, index) => unitV1(index));
    const { source } = sourceV1({
      revision: 1,
      activeOwnerId: "runtime.test.active",
      units,
      codeSurfaceNodes: [],
      workingSet: {
        references: units.length,
        unloaded: 998,
        acquiring: 0,
        loaded: 1,
        failed: 1,
        released: 0,
      },
    });
    const { container } = render(<RuntimeInspectorPanelV1 source={source} />);
    const list = container.querySelector<HTMLElement>("[data-runtime-inspector-list]")!;

    await waitFor(() => {
      expect(list.scrollTop).toBeGreaterThan(0);
      expect(container.querySelector('[data-runtime-inspector-detail="scene.test.0999"]'))
        .not.toBeNull();
    });
    expect(Number(list.dataset.runtimeInspectorMountedRows)).toBeLessThanOrEqual(16);
  });

  it("keeps selection inert, delegates explicit failure retry, and shows Code Surface policy", async () => {
    const failed = unitV1(1);
    const { source, retry } = sourceV1({
      revision: 1,
      activeOwnerId: "runtime.test.active",
      units: [failed],
      codeSurfaceNodes: [{
        ownerId: "runtime.test.active",
        compositionId: "gui.test.runtime",
        nodeId: "node.test.editor",
        viewId: "view.test.editor",
        parentNodeId: null,
        slotId: null,
        documentPath: "/root",
        source: "src/editor.tsx",
        layoutDomain: "application",
        outerGeometryOwner: "application",
        lifecycle: "mounted",
        label: "Editor",
        preview: "opaque",
        stateOwner: "react_local",
        policy: { input: "application", nativeText: "allowed", portal: "application_owned" },
        diagnostic: null,
      }],
      workingSet: {
        references: 1,
        unloaded: 0,
        acquiring: 0,
        loaded: 0,
        failed: 1,
        released: 0,
      },
    });
    render(<RuntimeInspectorPanelV1 source={source} />);

    expect(retry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /scene · scene\.test\.0001/u }));
    expect(retry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry acquisition" }));
    expect(retry).toHaveBeenCalledWith({
      ownerId: "runtime.test.active",
      kind: "scene",
      unitId: "scene.test.0001",
    });

    fireEvent.click(screen.getByRole("button", { name: /Code Surface · node\.test\.editor/u }));
    expect(screen.getByText("application · geometry owned by application")).toBeInTheDocument();
    expect(screen.getByText("react_local")).toBeInTheDocument();
    expect(screen.getByText(/portal application_owned/u)).toBeInTheDocument();
    expect(screen.getByText("src/editor.tsx")).toBeInTheDocument();
  });
});
