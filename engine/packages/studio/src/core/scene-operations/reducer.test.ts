// SPDX-License-Identifier: MIT
import { canonicalJsonBytes, parseSceneDocumentV1 } from "@sillymaker/base";
import type { SceneDocumentV1 } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { admitSceneAuthoringOperationV1 } from "./admission.ts";
import type { SceneAuthoringOperationV1 } from "./contract.ts";
import { reduceSceneAuthoringOperationV1 } from "./reducer.ts";

function documentV1(): SceneDocumentV1 {
  return parseSceneDocumentV1({
    format: "sillymaker.scene",
    version: 1,
    sceneId: "scene.test.opening",
    label: "Opening",
    canvas: { width: 1280, height: 720 },
    entries: [
      {
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
      },
      {
        layerId: "layer.props",
        tag: "tag.lamp",
        contentId: "content.test.lamp",
      },
    ],
    cues: [
      { cueId: "cue.test.hero", kind: "show", tag: "tag.hero" },
      { cueId: "cue.test.hero-cut", kind: "hide", tag: "tag.hero", cut: true },
      { cueId: "cue.test.lamp", kind: "show", tag: "tag.lamp" },
    ],
  });
}

function operationV1(value: unknown): SceneAuthoringOperationV1 {
  const result = admitSceneAuthoringOperationV1(value);
  if (result.kind === "rejected") throw new TypeError(result.diagnostic.code);
  return result.operation;
}

function reducedV1(
  document: SceneDocumentV1,
  operation: SceneAuthoringOperationV1,
): SceneDocumentV1 {
  const result = reduceSceneAuthoringOperationV1(document, operation);
  if (result.kind === "rejected") throw new TypeError(result.diagnostic.code);
  return result.document;
}

describe("reduceSceneAuthoringOperationV1", () => {
  it("sets full placement deterministically and returns re-admitted canonical data", () => {
    const document = documentV1();
    const operation = operationV1({
      schemaRevision: 1,
      kind: "scene.entry.set_placement",
      tag: "tag.hero",
      placement: {
        x: 640,
        y: 360,
        scalePermille: 1200,
        opacityPermille: 900,
        mirrored: true,
      },
    });

    const first = reducedV1(document, operation);
    const second = reducedV1(document, operation);
    expect(first.entries[0]?.placement).toEqual({
      x: 640,
      y: 360,
      scalePermille: 1200,
      opacityPermille: 900,
      mirrored: true,
    });
    expect(canonicalJsonBytes(first)).toEqual(canonicalJsonBytes(second));
    expect(parseSceneDocumentV1(first)).toEqual(first);
  });

  it("adds and removes entries while removing dependent cues atomically", () => {
    const document = documentV1();
    const added = reducedV1(
      document,
      operationV1({
        schemaRevision: 1,
        kind: "scene.entry.add",
        entry: {
          layerId: "layer.actors",
          tag: "tag.friend",
          contentId: "content.test.friend",
        },
      }),
    );
    expect(added.entries.map((entry) => entry.tag)).toContain("tag.friend");

    const removed = reducedV1(
      added,
      operationV1({
        schemaRevision: 1,
        kind: "scene.entry.remove",
        tag: "tag.hero",
      }),
    );
    expect(removed.entries.map((entry) => entry.tag)).toEqual(["tag.lamp", "tag.friend"]);
    expect(removed.cues.map((cue) => cue.cueId)).toEqual(["cue.test.lamp"]);
  });

  it("applies the remaining current Scene edit vocabulary without a mutation callback", () => {
    let document = documentV1();
    const operations = [
      {
        schemaRevision: 1,
        kind: "scene.entry.set_z_order",
        tag: "tag.hero",
        zOrder: 7,
      },
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
        cue: { cueId: "cue.test.friend", kind: "show", tag: "tag.hero" },
      },
      { schemaRevision: 1, kind: "scene.cue.remove", cueId: "cue.test.friend" },
    ];
    for (const operation of operations) {
      document = reducedV1(document, operationV1(operation));
    }

    const hero = document.entries.find((entry) => entry.tag === "tag.hero");
    expect(hero).toMatchObject({
      zOrder: 7,
      appearance: { pose: "happy" },
      ambient: { motionId: "motion.test.breathe" },
    });
    expect(document.cues.some((cue) => cue.cueId === "cue.test.friend")).toBe(false);
  });

  it("treats cue motion as the complete edge presentation and preserves xor", () => {
    const document = documentV1();
    const bound = reducedV1(
      document,
      operationV1({
        schemaRevision: 1,
        kind: "scene.cue.set_motion",
        cueId: "cue.test.hero-cut",
        motionId: "motion.test.leave",
      }),
    );
    expect(bound.cues[1]).toEqual({
      cueId: "cue.test.hero-cut",
      kind: "hide",
      tag: "tag.hero",
      motionId: "motion.test.leave",
    });

    const cleared = reducedV1(
      bound,
      operationV1({
        schemaRevision: 1,
        kind: "scene.cue.set_motion",
        cueId: "cue.test.hero-cut",
        motionId: null,
      }),
    );
    expect(cleared.cues[1]).toEqual({
      cueId: "cue.test.hero-cut",
      kind: "hide",
      tag: "tag.hero",
    });
  });

  it("returns stable diagnostics for missing and conflicting targets", () => {
    const document = documentV1();
    const cases = [
      {
        operation: operationV1({
          schemaRevision: 1,
          kind: "scene.entry.remove",
          tag: "tag.missing",
        }),
        code: "scene_authoring.target_missing",
      },
      {
        operation: operationV1({
          schemaRevision: 1,
          kind: "scene.entry.add",
          entry: {
            layerId: "layer.actors",
            tag: "tag.hero",
            contentId: "content.test.other",
          },
        }),
        code: "scene_authoring.target_conflict",
      },
    ];

    for (const entry of cases) {
      expect(reduceSceneAuthoringOperationV1(document, entry.operation)).toMatchObject({
        kind: "rejected",
        diagnostic: { code: entry.code },
      });
    }
  });
});
