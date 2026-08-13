// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { MotionDocumentV1 } from "@sillymaker/base";
import { parseMotionDocumentV1, sampleMotionAtV1 } from "@sillymaker/base";

import { moveMotionKeyframeV1, setMotionOffsetKeyframesV1 } from "./motion-edit.ts";

function motionDocumentV1(): MotionDocumentV1 {
  return parseMotionDocumentV1({
    format: "sillymaker.motion",
    version: 1,
    motionId: "motion.test.enter",
    label: "登场",
    durationMs: 400,
    delayMs: 0,
    tracks: [
      {
        channel: "offsetY",
        keyframes: [
          { atPermille: 0, value: 120 },
          { atPermille: 500, value: 40 },
          { atPermille: 1000, value: 0 },
        ],
      },
    ],
  });
}

describe("setMotionOffsetKeyframesV1", () => {
  it("updates an exact keyframe in place", () => {
    const edited = setMotionOffsetKeyframesV1(motionDocumentV1(), 500, { offsetY: -60 });
    const track = edited.tracks.find((candidate) => candidate.channel === "offsetY");
    expect(track?.keyframes.map((keyframe) => [keyframe.atPermille, keyframe.value])).toEqual([
      [0, 120],
      [500, -60],
      [1000, 0],
    ]);
  });

  it("inserts a keyframe between neighbors and keeps admission valid", () => {
    const edited = setMotionOffsetKeyframesV1(motionDocumentV1(), 250, { offsetY: 90 });
    const track = edited.tracks.find((candidate) => candidate.channel === "offsetY");
    expect(track?.keyframes.map((keyframe) => keyframe.atPermille)).toEqual([0, 250, 500, 1000]);
    expect(
      sampleMotionAtV1(
        { motionId: edited.motionId, durationMs: 400, delayMs: 0, tracks: edited.tracks },
        100,
      ).offsetY,
    ).toBe(90);
  });

  it("creates a missing track with baseline endpoints before writing", () => {
    const edited = setMotionOffsetKeyframesV1(motionDocumentV1(), 500, { offsetX: -35 });
    const track = edited.tracks.find((candidate) => candidate.channel === "offsetX");
    expect(track?.keyframes.map((keyframe) => [keyframe.atPermille, keyframe.value])).toEqual([
      [0, 0],
      [500, -35],
      [1000, 0],
    ]);
    // The original offsetY track is untouched.
    expect(
      edited.tracks.find((candidate) => candidate.channel === "offsetY")?.keyframes,
    ).toHaveLength(3);
  });

  it("writes both offsets at a pinned endpoint and clamps values", () => {
    const edited = setMotionOffsetKeyframesV1(motionDocumentV1(), 0, {
      offsetX: 250_000,
      offsetY: 200.6,
    });
    expect(
      edited.tracks.find((candidate) => candidate.channel === "offsetX")?.keyframes[0],
    ).toEqual({ atPermille: 0, value: 100_000 });
    expect(
      edited.tracks.find((candidate) => candidate.channel === "offsetY")?.keyframes[0],
    ).toEqual({ atPermille: 0, value: 201 });
  });

  it("never mutates the input document", () => {
    const original = motionDocumentV1();
    setMotionOffsetKeyframesV1(original, 250, { offsetY: 90 });
    expect(original.tracks[0]?.keyframes).toHaveLength(3);
  });
});

describe("moveMotionKeyframeV1", () => {
  it("moves a middle keyframe and clamps strictly between neighbors", () => {
    const document = motionDocumentV1();
    const moved = moveMotionKeyframeV1(document, "offsetY", 1, 700);
    expect(moved.tracks[0]?.keyframes.map((keyframe) => keyframe.atPermille)).toEqual([
      0,
      700,
      1000,
    ]);
    const clampedLow = moveMotionKeyframeV1(document, "offsetY", 1, -50);
    expect(clampedLow.tracks[0]?.keyframes[1]?.atPermille).toBe(1);
    const clampedHigh = moveMotionKeyframeV1(document, "offsetY", 1, 1000);
    expect(clampedHigh.tracks[0]?.keyframes[1]?.atPermille).toBe(999);
  });

  it("returns the input for pinned endpoints, unknown tracks, and no-ops", () => {
    const document = motionDocumentV1();
    expect(moveMotionKeyframeV1(document, "offsetY", 0, 400)).toBe(document);
    expect(moveMotionKeyframeV1(document, "offsetY", 2, 400)).toBe(document);
    expect(moveMotionKeyframeV1(document, "offsetX", 1, 400)).toBe(document);
    expect(moveMotionKeyframeV1(document, "offsetY", 1, 500)).toBe(document);
  });
});
