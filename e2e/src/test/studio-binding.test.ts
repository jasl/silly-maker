// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { labProcedureSceneV1 } from "../scenes/procedure/index.ts";
import { labStudioBindingV1 } from "../tooling/studio-binding.tsx";

describe("Engine Lab Studio binding", () => {
  it("covers exactly the real procedure scene with its production catalog and renderers", () => {
    const contents = labStudioBindingV1.contents ?? [];
    expect(contents.map(({ contentId }) => contentId)).toEqual(
      labProcedureSceneV1.sceneDocument.entries.map(({ contentId }) => contentId),
    );

    for (const entry of labProcedureSceneV1.sceneDocument.entries) {
      const descriptor = contents.find(({ contentId }) => contentId === entry.contentId);
      expect(descriptor).toBeDefined();
      expect(descriptor?.defaultLayerId).toBe(entry.layerId);
      expect(descriptor?.defaultZOrder).toBe(entry.zOrder);
      expect(descriptor?.defaultPlacement).toEqual(entry.placement);
      expect(descriptor?.defaultAppearance).toEqual(entry.appearance);

      const resolution = labStudioBindingV1.catalog.resolveContent(
        entry.contentId,
        entry.appearance ?? Object.freeze({}),
      );
      expect(resolution).not.toBeNull();
      expect(labStudioBindingV1.renderers[resolution!.rendererId]).toBeDefined();
    }
  });
});
