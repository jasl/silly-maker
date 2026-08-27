// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { admitSceneAuthoringEnvelopeV1, admitSceneAuthoringOperationV1 } from "./admission.ts";
import { sceneAuthoringOperationSchemaRevisionV1 } from "./contract.ts";

const transformV1 = {
  x: 10,
  y: -20,
  scalePermille: 1_000,
  opacityPermille: 900,
  mirrored: false,
};

describe("Authoring Scene operation admission", () => {
  it("admits the current object and layer operation set", () => {
    const operations = [
      {
        schemaRevision: 2,
        kind: "scene.object.set_local_transform",
        objectId: "tag.test.hero",
        localTransform: transformV1,
      },
      {
        schemaRevision: 2,
        kind: "scene.object.set_visual_content",
        objectId: "tag.test.hero",
        contentId: "content.test.hero-alt",
      },
      {
        schemaRevision: 2,
        kind: "scene.object.set_appearance",
        objectId: "tag.test.hero",
        key: "expression",
        value: "happy",
      },
      {
        schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
        kind: "scene.object.set_ambient",
        objectId: "tag.test.hero",
        ambient: {
          motionId: "motion.test.hero-idle",
          phaseMs: 120,
        },
      },
      {
        schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
        kind: "scene.object.set_ambient",
        objectId: "tag.test.hero",
        ambient: null,
      },
      {
        schemaRevision: 2,
        kind: "scene.object.move_before",
        objectId: "tag.test.hero",
        beforeObjectId: "tag.test.friend",
      },
      {
        schemaRevision: 2,
        kind: "scene.object.move_before",
        objectId: "tag.test.hero",
        beforeObjectId: null,
      },
      {
        schemaRevision: 2,
        kind: "scene.layer.move_before",
        layerId: "layer.test.actors",
        beforeLayerId: null,
      },
    ];

    for (const operation of operations) {
      expect(admitSceneAuthoringOperationV1(operation)).toMatchObject({ kind: "admitted" });
    }
  });

  it("rejects old entry/cue kinds and unsupported schema revisions", () => {
    expect(admitSceneAuthoringOperationV1({
      schemaRevision: 1,
      kind: "scene.entry.set_placement",
      tag: "tag.test.hero",
      placement: transformV1,
    })).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "scene_authoring.operation_schema_unsupported",
        path: "/operation/schemaRevision",
      },
    });
    expect(admitSceneAuthoringOperationV1({
      schemaRevision: 2,
      kind: "scene.entry.set_placement",
      tag: "tag.test.hero",
      placement: transformV1,
    })).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "scene_authoring.operation_kind_unknown",
        path: "/operation/kind",
      },
    });
  });

  it("checks ordinary record fields and values without object-authenticity rules", () => {
    const ordinary = Object.assign(Object.create(null) as Record<string, unknown>, {
      schemaRevision: 2,
      kind: "scene.object.set_visual_content",
      objectId: "tag.test.hero",
      contentId: "content.test.hero-alt",
    });
    expect(admitSceneAuthoringOperationV1(ordinary)).toMatchObject({ kind: "admitted" });

    const invalid = [
      null,
      [],
      {
        schemaRevision: 2,
        kind: "scene.object.set_visual_content",
        objectId: "hero",
        contentId: "content.test.hero-alt",
      },
      {
        schemaRevision: 2,
        kind: "scene.object.set_local_transform",
        objectId: "tag.test.hero",
        localTransform: { ...transformV1, scalePermille: 0 },
      },
      {
        schemaRevision: 2,
        kind: "scene.object.set_appearance",
        objectId: "tag.test.hero",
        key: "Bad-Key",
        value: "happy",
      },
      {
        schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
        kind: "scene.object.set_ambient",
        objectId: "tag.test.hero",
        ambient: { motionId: "hero-idle" },
      },
      {
        schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
        kind: "scene.object.set_ambient",
        objectId: "tag.test.hero",
        ambient: { motionId: "motion.test.hero-idle", phaseMs: 60_001 },
      },
      {
        schemaRevision: 2,
        kind: "scene.object.move_before",
        objectId: "tag.test.hero",
        beforeObjectId: "friend",
      },
      {
        schemaRevision: 2,
        kind: "scene.layer.move_before",
        layerId: "layer.test.actors",
        beforeLayerId: null,
        extra: true,
      },
    ];
    for (const operation of invalid) {
      expect(admitSceneAuthoringOperationV1(operation)).toMatchObject({
        kind: "rejected",
        diagnostic: { code: "scene_authoring.operation_payload_invalid" },
      });
    }
  });

  it("admits a current envelope and limits coalescing to continuous fields", () => {
    const operation = {
      schemaRevision: 2 as const,
      kind: "scene.object.set_local_transform" as const,
      objectId: "tag.test.hero",
      localTransform: transformV1,
    };
    expect(admitSceneAuthoringEnvelopeV1({
      documentIdentity: "authoring-document:1:1",
      expectedDraftRevision: 4,
      operation,
      coalesceKey: "drag:tag.test.hero:4",
    })).toMatchObject({ kind: "admitted" });

    expect(admitSceneAuthoringEnvelopeV1({
      documentIdentity: "authoring-document:1:1",
      expectedDraftRevision: 4,
      operation: {
        schemaRevision: 2,
        kind: "scene.object.move_before",
        objectId: "tag.test.hero",
        beforeObjectId: null,
      },
      coalesceKey: "not-continuous",
    })).toEqual({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.envelope_invalid", path: "/envelope/coalesceKey" },
    });
  });

  it("rejects malformed execution currentness fields atomically", () => {
    const operation = {
      schemaRevision: 2,
      kind: "scene.object.set_appearance",
      objectId: "tag.test.hero",
      key: "expression",
      value: null,
    };
    expect(admitSceneAuthoringEnvelopeV1({
      documentIdentity: "",
      expectedDraftRevision: 1,
      operation,
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { path: "/envelope/documentIdentity" },
    });
    expect(admitSceneAuthoringEnvelopeV1({
      documentIdentity: "authoring-document:1:1",
      expectedDraftRevision: -1,
      operation,
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { path: "/envelope/expectedDraftRevision" },
    });
    expect(admitSceneAuthoringEnvelopeV1({
      documentIdentity: "authoring-document:1:1",
      expectedDraftRevision: 1,
      operation,
      unexpected: true,
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.envelope_invalid" },
    });
  });
});
