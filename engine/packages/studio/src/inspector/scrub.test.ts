// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  motionDefinitionFromDocumentV1,
  parseMotionDocumentV1,
  parseTimelineDefinitionV1,
} from "@sillymaker/base";
import {
  admitAuthoringSceneDocumentV1,
  compileAuthoringSceneV1,
} from "@sillymaker/base/authoring/scene";

import { inspectorScrubChoicesV1, sampleInspectorScrubV1 } from "./scrub.ts";

const admittedV1 = admitAuthoringSceneDocumentV1({
  format: "sillymaker.authoring-scene",
  version: 1,
  sceneId: "scene.test.scrub",
  label: "Scrub",
  canvas: { width: 100, height: 100 },
  layers: [{
    layerId: "layer.test.main",
    label: "Main",
    roots: [{
      objectId: "tag.test.target",
      label: "Target",
      visual: { contentId: "content.test.target" },
      bindings: {
        motionIds: ["motion.test.slide"],
        timelineIds: ["cue.test.parallel"],
      },
    }],
  }],
  cues: [],
});
const compiledV1 = compileAuthoringSceneV1(admittedV1);

const motionV1 = motionDefinitionFromDocumentV1(parseMotionDocumentV1({
  format: "sillymaker.motion",
  version: 1,
  motionId: "motion.test.slide",
  label: "Slide",
  durationMs: 100,
  delayMs: 0,
  tracks: [{
    channel: "offsetX",
    keyframes: [{ atPermille: 0, value: 0 }, { atPermille: 1_000, value: 80 }],
  }],
}));

const parallelTimelineV1 = parseTimelineDefinitionV1({
  timelineId: "cue.test.parallel",
  root: {
    kind: "parallel",
    steps: [
      {
        kind: "tween",
        target: { kind: "entry", layerId: "layer.test.main", tag: "tag.test.target" },
        property: "offsetX",
        from: 0,
        to: 100,
        durationMs: 100,
        easing: "linear",
      },
      {
        kind: "tween",
        target: { kind: "camera" },
        property: "offsetY",
        from: 0,
        to: 50,
        durationMs: 100,
        easing: "linear",
      },
    ],
  },
});

describe("Inspector scrub", () => {
  it("offers only resolved current-Scene motion and Timeline references", () => {
    const choices = inspectorScrubChoicesV1(
      compiledV1,
      new Map([[motionV1.motionId, motionV1]]),
      { resolveTimeline: (id) => id === parallelTimelineV1.timelineId ? parallelTimelineV1 : null },
    );
    expect(choices.map((choice) => choice.key)).toEqual([
      "motion:tag.test.target:motion.test.slide",
      "timeline:cue.test.parallel",
    ]);
  });

  it("samples disjoint parallel Timeline channels without changing source data", () => {
    const draftReference = admittedV1.document;
    const draftBefore = structuredClone(admittedV1.document);
    const [motion, timeline] = inspectorScrubChoicesV1(
      compiledV1,
      new Map([[motionV1.motionId, motionV1]]),
      { resolveTimeline: () => parallelTimelineV1 },
    );
    expect(
      sampleInspectorScrubV1(motion ?? null, 50).motionOverlay?.get(
        "layer.test.main:tag.test.target",
      )?.offsetX,
    ).toBe(40);
    const sample = sampleInspectorScrubV1(timeline ?? null, 50);
    expect(sample.timelineOverlay?.map((value) => [value.target.kind, value.property, value.value]))
      .toEqual([
        ["entry", "offsetX", 50],
        ["camera", "offsetY", 25],
      ]);
    expect(compiledV1.inspection.sceneId).toBe("scene.test.scrub");
    expect(admittedV1.document).toBe(draftReference);
    expect(admittedV1.document).toEqual(draftBefore);
  });
});
