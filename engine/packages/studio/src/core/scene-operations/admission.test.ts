// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { admitSceneAuthoringOperationV1 } from "./admission.ts";

const placementV1 = Object.freeze({
  x: 10,
  y: 20,
  scalePermille: 1000,
  opacityPermille: 1000,
  mirrored: false,
});

describe("Scene authoring operation admission", () => {
  it("admits and normalizes the closed V1 operation vocabulary", () => {
    const values = [
      {
        schemaRevision: 1,
        kind: "scene.entry.set_placement",
        tag: "tag.hero",
        placement: placementV1,
      },
      {
        schemaRevision: 1,
        kind: "scene.entry.add",
        entry: {
          layerId: "layer.actors",
          tag: "tag.friend",
          contentId: "content.friend",
          placement: placementV1,
        },
      },
      { schemaRevision: 1, kind: "scene.entry.remove", tag: "tag.hero" },
      { schemaRevision: 1, kind: "scene.entry.set_z_order", tag: "tag.hero", zOrder: 3 },
      {
        schemaRevision: 1,
        kind: "scene.entry.set_appearance",
        tag: "tag.hero",
        key: "pose",
        value: "happy",
      },
      {
        schemaRevision: 1,
        kind: "scene.entry.set_ambient",
        tag: "tag.hero",
        motionId: "motion.test.breathe",
      },
      {
        schemaRevision: 1,
        kind: "scene.cue.add",
        cue: { cueId: "cue.test.friend", kind: "show", tag: "tag.friend" },
      },
      { schemaRevision: 1, kind: "scene.cue.remove", cueId: "cue.test.hero" },
      {
        schemaRevision: 1,
        kind: "scene.cue.set_motion",
        cueId: "cue.test.hero",
        motionId: null,
      },
    ];

    for (const value of values) {
      expect(admitSceneAuthoringOperationV1(value)).toMatchObject({ kind: "admitted" });
    }
  });

  it("rejects unknown revisions, kinds, extra keys, and invalid payloads", () => {
    const invalid = [
      {
        value: { schemaRevision: 2, kind: "scene.entry.remove", tag: "tag.hero" },
        code: "scene_authoring.operation_schema_unsupported",
      },
      {
        value: { schemaRevision: 1, kind: "scene.unknown" },
        code: "scene_authoring.operation_kind_unknown",
      },
      {
        value: {
          schemaRevision: 1,
          kind: "scene.entry.remove",
          tag: "tag.hero",
          extra: true,
        },
        code: "scene_authoring.operation_payload_invalid",
      },
      {
        value: JSON.parse(
          '{"schemaRevision":1,"kind":"scene.entry.remove","tag":"tag.hero","__proto__":{}}',
        ) as unknown,
        code: "scene_authoring.operation_payload_invalid",
      },
      {
        value: {
          schemaRevision: 1,
          kind: "scene.entry.set_placement",
          tag: "tag.hero",
          placement: { ...placementV1, scalePermille: 0 },
        },
        code: "scene_authoring.operation_payload_invalid",
      },
      {
        value: {
          schemaRevision: 1,
          kind: "scene.cue.set_motion",
          cueId: "cue.test.hero",
          motionId: "not-a-motion-id",
        },
        code: "scene_authoring.operation_payload_invalid",
      },
    ];

    for (const entry of invalid) {
      expect(admitSceneAuthoringOperationV1(entry.value)).toMatchObject({
        kind: "rejected",
        diagnostic: { code: entry.code },
      });
    }
  });

  it("reports appearance key and value failures at their exact fields", () => {
    expect(admitSceneAuthoringOperationV1({
      schemaRevision: 1,
      kind: "scene.entry.set_appearance",
      tag: "tag.hero",
      key: "Bad",
      value: "happy",
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { path: "/operation/key" },
    });
    expect(admitSceneAuthoringOperationV1({
      schemaRevision: 1,
      kind: "scene.entry.set_appearance",
      tag: "tag.hero",
      key: "pose",
      value: "Not Valid",
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { path: "/operation/value" },
    });
  });
});
