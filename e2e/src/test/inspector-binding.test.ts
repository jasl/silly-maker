// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { labBeaconPulseCueIdV1 } from "../presentation.ts";
import { labProcedureSceneV1 } from "../scenes/procedure/index.ts";
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
});
