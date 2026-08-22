// SPDX-License-Identifier: MIT
import { parseSceneDocumentV1 } from "@sillymaker/base";
import type { SceneDocumentV1 } from "@sillymaker/base";
import { createAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";
import { describe, expect, it } from "vitest";

import type {
  SceneAuthoringExecutionEnvelopeV1,
  SceneAuthoringLocalAdapterV1,
  SceneAuthoringOperationV1,
} from "./contract.ts";
import { createSceneAuthoringLocalAdapterV1 } from "./local-adapter.ts";

function documentV1(): SceneDocumentV1 {
  return parseSceneDocumentV1({
    format: "sillymaker.scene",
    version: 1,
    sceneId: "scene.test.opening",
    label: "Opening",
    canvas: { width: 1280, height: 720 },
    entries: [{
      layerId: "layer.actors",
      tag: "tag.hero",
      contentId: "content.test.hero",
      placement: {
        x: 100,
        y: 200,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: false,
      },
    }],
    cues: [
      { cueId: "cue.test.hero", kind: "show", tag: "tag.hero" },
      { cueId: "cue.test.hero-hide", kind: "hide", tag: "tag.hero", cut: true },
    ],
  });
}

function fixtureV1(): {
  readonly session: ReturnType<typeof createAuthoringDocumentSessionV1<SceneDocumentV1>>;
  readonly adapter: SceneAuthoringLocalAdapterV1;
} {
  const session = createAuthoringDocumentSessionV1<SceneDocumentV1>();
  session.installSaved({ path: "opening.scene.json", document: documentV1(), digest: null });
  return { session, adapter: createSceneAuthoringLocalAdapterV1(session) };
}

function executeCurrentV1(
  adapter: SceneAuthoringLocalAdapterV1,
  operation: SceneAuthoringOperationV1,
  coalesceKey?: string,
) {
  const current = adapter.current();
  if (current === null) throw new TypeError("missing current Scene");
  return adapter.execute({
    documentIdentity: current.documentIdentity,
    expectedDraftRevision: current.draftRevision,
    operation,
    ...(coalesceKey === undefined ? {} : { coalesceKey }),
  });
}

describe("Scene authoring local adapter", () => {
  it("coalesces continuous operations while every successful event advances revision", () => {
    const { session, adapter } = fixtureV1();
    const initial = adapter.current();
    if (initial === null) throw new TypeError("missing current Scene");

    const first = executeCurrentV1(adapter, {
      schemaRevision: 1,
      kind: "scene.entry.set_placement",
      tag: "tag.hero",
      placement: {
        x: 200,
        y: 200,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: false,
      },
    }, "move:hero:1");
    expect(first).toMatchObject({ kind: "applied", draftRevision: initial.draftRevision + 1 });

    const second = executeCurrentV1(adapter, {
      schemaRevision: 1,
      kind: "scene.entry.set_placement",
      tag: "tag.hero",
      placement: {
        x: 300,
        y: 200,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: false,
      },
    }, "move:hero:1");
    expect(second).toMatchObject({ kind: "applied", draftRevision: initial.draftRevision + 2 });

    session.undo();
    expect(session.getSnapshot().draft?.entries[0]?.placement?.x).toBe(100);
    expect(session.getSnapshot().draftRevision).toBe(initial.draftRevision + 3);
  });

  it("commits structural and reference edits as ordinary recoverable history steps", () => {
    const { session, adapter } = fixtureV1();
    expect(executeCurrentV1(adapter, {
      schemaRevision: 1,
      kind: "scene.cue.set_motion",
      cueId: "cue.test.hero-hide",
      motionId: "motion.test.leave",
    })).toMatchObject({ kind: "applied" });
    expect(session.getSnapshot().draft?.cues[1]).toMatchObject({
      motionId: "motion.test.leave",
    });
    expect(session.getSnapshot().draft?.cues[1]).not.toHaveProperty("cut");

    expect(executeCurrentV1(adapter, {
      schemaRevision: 1,
      kind: "scene.entry.remove",
      tag: "tag.hero",
    })).toMatchObject({ kind: "applied" });
    expect(session.getSnapshot().draft).toMatchObject({ entries: [], cues: [] });

    session.undo();
    expect(session.getSnapshot().draft?.entries).toHaveLength(1);
    expect(session.getSnapshot().draft?.cues[1]).toMatchObject({
      motionId: "motion.test.leave",
    });
    session.undo();
    expect(session.getSnapshot().draft?.cues[1]).toHaveProperty("cut", true);
  });

  it("rejects stale envelopes before target reduction with no session side effects", () => {
    const { session, adapter } = fixtureV1();
    const current = adapter.current();
    if (current === null) throw new TypeError("missing current Scene");
    const missingTarget: SceneAuthoringOperationV1 = {
      schemaRevision: 1,
      kind: "scene.entry.remove",
      tag: "tag.missing",
    };
    const before = session.getSnapshot();

    expect(adapter.execute({
      documentIdentity: `${current.documentIdentity}:stale`,
      expectedDraftRevision: current.draftRevision,
      operation: missingTarget,
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.document_stale" },
    });
    expect(session.getSnapshot()).toBe(before);

    expect(adapter.execute({
      documentIdentity: current.documentIdentity,
      expectedDraftRevision: current.draftRevision + 1,
      operation: missingTarget,
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.revision_stale" },
    });
    expect(session.getSnapshot()).toBe(before);
  });

  it("rejects malformed non-UI input without creating dirty or history state", () => {
    const { session, adapter } = fixtureV1();
    const current = adapter.current();
    if (current === null) throw new TypeError("missing current Scene");
    const before = session.getSnapshot();
    const malformed = {
      documentIdentity: current.documentIdentity,
      expectedDraftRevision: current.draftRevision,
      operation: {
        schemaRevision: 1,
        kind: "scene.entry.set_placement",
        tag: "tag.hero",
        placement: {
          x: 10,
          y: 20,
          scalePermille: 0,
          opacityPermille: 1000,
          mirrored: false,
        },
      },
    } as unknown as SceneAuthoringExecutionEnvelopeV1;

    expect(adapter.execute(malformed)).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.operation_payload_invalid" },
    });
    expect(session.getSnapshot()).toBe(before);
  });

  it("rejects a well-formed request while no document is installed", () => {
    const session = createAuthoringDocumentSessionV1<SceneDocumentV1>();
    const adapter = createSceneAuthoringLocalAdapterV1(session);
    expect(adapter.current()).toBeNull();
    expect(adapter.execute({
      documentIdentity: "authoring-document:missing",
      expectedDraftRevision: 0,
      operation: {
        schemaRevision: 1,
        kind: "scene.entry.remove",
        tag: "tag.hero",
      },
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.document_unavailable" },
    });
  });
});
