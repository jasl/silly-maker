// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { labBeaconPulseCueIdV1 } from "../presentation.ts";
import { labProcedureSceneV1 } from "../scenes/procedure/index.ts";
import { labRuntimeInspectorSourceV1 } from "../application/runtime-inspection.ts";
import { labInspectorBindingV1 } from "../tooling/inspector-binding.ts";

describe("Engine Lab Inspector binding", () => {
  it("resolves every procedure visual through the production catalog and renderers", () => {
    for (const entry of labProcedureSceneV1.sceneDocument.entries) {
      const resolution = labInspectorBindingV1.catalog.resolveContent(
        entry.contentId,
        entry.appearance ?? {},
      );
      expect(resolution).not.toBeNull();
      expect(labInspectorBindingV1.renderers[resolution!.rendererId]).toBeDefined();
    }
  });

  it("exposes the production timeline catalog used by Inspector preview", () => {
    expect(labInspectorBindingV1.timelines?.resolveTimeline(labBeaconPulseCueIdV1)).not.toBeNull();
  });

  it("exposes disconnected runtime summaries without acquiring a unit", () => {
    const runtime = labInspectorBindingV1.runtime;
    expect(runtime).toBe(labRuntimeInspectorSourceV1);
    const snapshot = runtime!.getSnapshot();
    expect(snapshot.activeOwnerId).toBeNull();
    expect(snapshot.units).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "scene",
        unitId: "scene.e2e.procedure",
        ownerStatus: "detached",
        status: "unloaded",
        attempt: 0,
      }),
      expect.objectContaining({
        kind: "narrative",
        unitId: "narrative.e2e.drill",
        ownerStatus: "detached",
        status: "unloaded",
        attempt: 0,
      }),
      expect.objectContaining({
        kind: "gui",
        unitId: "gui.e2e.code-surface-conformance",
        ownerStatus: "detached",
        status: "unloaded",
        attempt: 0,
      }),
    ]));
    expect(snapshot.workingSet.loaded).toBe(0);
  });
});
