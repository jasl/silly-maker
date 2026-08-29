// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { admitAuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";

import controlRoomSourceV1 from "../scenes/control-room/control-room.authoring-scene.json" with {
  type: "json",
};
import rooftopSourceV1 from "../scenes/rooftop-antenna/rooftop-antenna.authoring-scene.json" with {
  type: "json",
};
import { projectVnLastSoundCheckNarrativeInspectionV1 } from "./narrative-inspector-projection.ts";

describe("One Last Sound Check Narrative Inspector projection", () => {
  it("joins a selected character to Scene cues, route nodes, text, and voice bindings", () => {
    const inspection = projectVnLastSoundCheckNarrativeInspectionV1(
      admitAuthoringSceneDocumentV1(controlRoomSourceV1),
      "tag.vn-last-sound-check.character.zhou",
    );

    expect(inspection.sceneSourcePath).toBe(
      "src/scenes/control-room/control-room.authoring-scene.json",
    );
    expect(inspection.selectedObjectJsonPointer).toMatch(/^\/layers\/2\/roots\//u);
    expect(inspection.selectedCueIds).toContain(
      "cue.vn-last-sound-check.control-room.zhou-present",
    );
    expect(
      inspection.sceneBindings.some((binding) =>
        binding.nodeId === "node.vn-last-sound-check.open-control-room" &&
        binding.cueIds.includes("cue.vn-last-sound-check.control-room.zhou-present")
      ),
    ).toBe(true);
    expect(
      inspection.dialogueBindings.some((binding) =>
        binding.nodeId === "node.vn-last-sound-check.shared-old-recording-old-call" &&
        binding.voiceAssetId === "voice.vn-last-sound-check.zhou-old-call" &&
        binding.textSourcePath === "assets/content/shared.zh-CN.text-pack.json"
      ),
    ).toBe(true);
  });

  it("keeps route ownership visible for the rooftop Scene without inventing writes", () => {
    const inspection = projectVnLastSoundCheckNarrativeInspectionV1(
      admitAuthoringSceneDocumentV1(rooftopSourceV1),
      null,
    );

    expect(new Set(inspection.sceneBindings.map((binding) => binding.route))).toEqual(
      new Set(["archive", "present"]),
    );
    expect(inspection.dialogueBindings).toEqual([]);
    expect(inspection.selectedObjectJsonPointer).toBeNull();
  });
});
