// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { admitAuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";
import type { AdmittedAuthoringSceneV1 } from "@sillymaker/base/authoring/scene";
import { createAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";
import type { AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type { AuthoringSceneSourceIoV1 } from "../authoring-scene-io.ts";
import { createSceneDocumentSessionV1 } from "../scene-session.ts";
import type {
  SceneAuthoringExecutionResultV1,
  SceneAuthoringLocalAdapterV1,
  SceneAuthoringOperationV1,
} from "./contract.ts";
import { createSceneAuthoringLocalAdapterV1 } from "./local-adapter.ts";

const scenePathV1 = "src/scenes/opening/opening.authoring-scene.json";

const placementV1 = (x: number) => ({
  x,
  y: 200,
  scalePermille: 1_000,
  opacityPermille: 1_000,
  mirrored: false,
});

function sceneV1(): AdmittedAuthoringSceneV1 {
  return admitAuthoringSceneDocumentV1({
    format: "sillymaker.authoring-scene",
    version: 1,
    sceneId: "scene.test.opening",
    label: "Opening",
    canvas: { width: 1_280, height: 720 },
    layers: [{
      layerId: "layer.test.actors",
      label: "Actors",
      roots: [
        {
          objectId: "tag.test.alpha",
          label: "Alpha",
          localTransform: placementV1(100),
          visual: {
            contentId: "content.test.alpha",
            appearance: { expression: "neutral" },
          },
        },
        {
          objectId: "tag.test.beta",
          label: "Beta",
          localTransform: placementV1(300),
          visual: { contentId: "content.test.beta" },
        },
      ],
    }],
    cues: [],
  });
}

function harnessV1(): {
  readonly session: AuthoringDocumentSessionV1<AdmittedAuthoringSceneV1>;
  readonly adapter: SceneAuthoringLocalAdapterV1;
} {
  const session = createAuthoringDocumentSessionV1<AdmittedAuthoringSceneV1>();
  session.installSaved({ path: scenePathV1, document: sceneV1(), digest: "sha256:1" });
  return { session, adapter: createSceneAuthoringLocalAdapterV1(session) };
}

function executeCurrentV1(
  adapter: SceneAuthoringLocalAdapterV1,
  operation: SceneAuthoringOperationV1,
  coalesceKey?: string,
): SceneAuthoringExecutionResultV1 {
  const current = adapter.current();
  if (current === null) throw new TypeError("missing current scene");
  return adapter.execute({
    documentIdentity: current.documentIdentity,
    expectedDraftRevision: current.draftRevision,
    operation,
    ...(coalesceKey === undefined ? {} : { coalesceKey }),
  });
}

function alphaXv1(session: AuthoringDocumentSessionV1<AdmittedAuthoringSceneV1>): number {
  return session.getSnapshot().draft?.document.layers[0]?.roots[0]?.localTransform.x ?? -1;
}

describe("Authoring Scene operation executor", () => {
  it("commits one admitted object edit through the existing session CAS", () => {
    const { session, adapter } = harnessV1();
    const current = adapter.current()!;
    expect(executeCurrentV1(adapter, {
      schemaRevision: 2,
      kind: "scene.object.set_local_transform",
      objectId: "tag.test.alpha" as never,
      localTransform: placementV1(220),
    })).toEqual({
      kind: "applied",
      documentIdentity: current.documentIdentity,
      draftRevision: current.draftRevision + 1,
    });
    expect(alphaXv1(session)).toBe(220);
    expect(session.getSnapshot().dirty).toBe(true);
    expect(session.getSnapshot().canUndo).toBe(true);
  });

  it("coalesces one continuous run and leaves discrete ordering uncoalesced", () => {
    const { session, adapter } = harnessV1();
    expect(executeCurrentV1(adapter, {
      schemaRevision: 2,
      kind: "scene.object.set_local_transform",
      objectId: "tag.test.alpha" as never,
      localTransform: placementV1(180),
    }, "drag:alpha:1")).toMatchObject({ kind: "applied" });
    expect(executeCurrentV1(adapter, {
      schemaRevision: 2,
      kind: "scene.object.set_local_transform",
      objectId: "tag.test.alpha" as never,
      localTransform: placementV1(240),
    }, "drag:alpha:1")).toMatchObject({ kind: "applied" });
    session.undo();
    expect(alphaXv1(session)).toBe(100);

    expect(executeCurrentV1(adapter, {
      schemaRevision: 2,
      kind: "scene.object.move_before",
      objectId: "tag.test.beta" as never,
      beforeObjectId: "tag.test.alpha" as never,
    })).toMatchObject({ kind: "applied" });
    expect(session.getSnapshot().draft?.document.layers[0]?.roots.map((object) => object.objectId))
      .toEqual(["tag.test.beta", "tag.test.alpha"]);
  });

  it("rejects stale document identities and revisions before reducing", () => {
    const { session, adapter } = harnessV1();
    const original = adapter.current()!;
    const operation: SceneAuthoringOperationV1 = {
      schemaRevision: 2,
      kind: "scene.object.set_appearance",
      objectId: "tag.test.alpha" as never,
      key: "expression",
      value: "happy",
    };
    session.installSaved({ path: scenePathV1, document: sceneV1(), digest: "sha256:2" });

    expect(adapter.execute({
      documentIdentity: original.documentIdentity,
      expectedDraftRevision: original.draftRevision,
      operation,
    })).toEqual({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.document_stale", path: "/envelope/documentIdentity" },
    });

    const current = adapter.current()!;
    expect(adapter.execute({
      documentIdentity: current.documentIdentity,
      expectedDraftRevision: current.draftRevision - 1,
      operation,
    })).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "scene_authoring.revision_stale",
        path: "/envelope/expectedDraftRevision",
      },
    });
    expect(session.getSnapshot().dirty).toBe(false);
    expect(session.getSnapshot().canUndo).toBe(false);
  });

  it("keeps draft, revision, dirty, and history unchanged on reduction failure", () => {
    const { session, adapter } = harnessV1();
    const before = session.getSnapshot();
    expect(executeCurrentV1(adapter, {
      schemaRevision: 2,
      kind: "scene.object.set_visual_content",
      objectId: "tag.test.missing" as never,
      contentId: "content.test.missing" as never,
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.target_missing" },
    });
    const after = session.getSnapshot();
    expect(after.draft).toEqual(before.draft);
    expect(after.draftRevision).toBe(before.draftRevision);
    expect(after.dirty).toBe(before.dirty);
    expect(after.canUndo).toBe(before.canUndo);
    expect(after.canRedo).toBe(before.canRedo);
  });

  it("reports no current receipt before a document is installed", () => {
    const session = createAuthoringDocumentSessionV1<AdmittedAuthoringSceneV1>();
    const adapter = createSceneAuthoringLocalAdapterV1(session);
    expect(adapter.current()).toBeNull();
    expect(adapter.execute({
      documentIdentity: "authoring-document:missing",
      expectedDraftRevision: 0,
      operation: {
        schemaRevision: 2,
        kind: "scene.layer.move_before",
        layerId: "layer.test.actors" as never,
        beforeLayerId: null,
      },
    })).toEqual({
      kind: "rejected",
      diagnostic: {
        code: "scene_authoring.document_unavailable",
        path: "/envelope/documentIdentity",
      },
    });
  });

  it("opens and CAS-saves the admitted document/source-map pair", async () => {
    const source = sceneV1();
    const writes: {
      readonly expectedDigest: string;
      readonly admittedScene: AdmittedAuthoringSceneV1;
    }[] = [];
    const io: AuthoringSceneSourceIoV1 = {
      list: () => Promise.resolve({ kind: "ok", scenes: [], skipped: [] }),
      read: () => Promise.resolve({ kind: "ok", digest: "sha256:source", admittedScene: source }),
      write: (input) => {
        writes.push(input);
        return Promise.resolve({ kind: "ok", digest: "sha256:written" });
      },
    };
    const session = createSceneDocumentSessionV1(io);
    expect(await session.open(scenePathV1)).toEqual({ kind: "ok" });
    expect(session.getSnapshot().draft?.sourceMap.objects[0]?.jsonPointer).toBe(
      "/layers/0/roots/0",
    );

    const adapter = createSceneAuthoringLocalAdapterV1(session);
    expect(executeCurrentV1(adapter, {
      schemaRevision: 2,
      kind: "scene.object.set_local_transform",
      objectId: "tag.test.alpha" as never,
      localTransform: placementV1(260),
    })).toMatchObject({ kind: "applied" });
    expect(session.getSnapshot()).toMatchObject({
      dirty: true,
      canUndo: true,
      canRedo: false,
    });
    expect(await session.save()).toEqual({ kind: "ok", digest: "sha256:written" });
    expect(session.getSnapshot()).toMatchObject({
      dirty: false,
      canUndo: true,
      canRedo: false,
    });
    expect(writes).toHaveLength(1);
    expect(writes[0]?.expectedDigest).toBe("sha256:source");
    expect(writes[0]?.admittedScene.document.layers[0]?.roots[0]?.localTransform.x).toBe(260);
    expect(writes[0]?.admittedScene.sourceMap.objects[0]?.jsonPointer).toBe(
      "/layers/0/roots/0",
    );

    session.undo();
    expect(alphaXv1(session)).toBe(100);
    expect(session.getSnapshot()).toMatchObject({ dirty: true, canRedo: true });
    session.redo();
    expect(alphaXv1(session)).toBe(260);
    expect(session.getSnapshot()).toMatchObject({ dirty: false, canRedo: false });
  });
});
