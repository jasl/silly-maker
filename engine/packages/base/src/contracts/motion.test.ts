// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  motionChannelBaselineV1,
  motionDefinitionFromDocumentV1,
  motionTotalDurationMsV1,
  parseMotionDefinitionV1,
  parseMotionDocumentV1,
  sampleMotionAtV1,
} from "./motion.ts";
import { PresentationDataError } from "./presentation-data.ts";

function entranceDocumentV1(): Record<string, unknown> {
  return {
    format: "sillymaker.motion",
    version: 1,
    motionId: "motion.test.entrance",
    label: "测试登场",
    durationMs: 400,
    delayMs: 100,
    tracks: [
      {
        channel: "offsetX",
        keyframes: [
          { atPermille: 0, value: 140, easing: "ease_out_cubic" },
          { atPermille: 1000, value: 0 },
        ],
      },
      {
        channel: "opacityPermille",
        keyframes: [
          { atPermille: 0, value: 0 },
          { atPermille: 500, value: 1000 },
          { atPermille: 1000, value: 1000 },
        ],
      },
    ],
    authoring: { status: "human_tuned", locked: true, notes: "手工调过节奏" },
  };
}

describe("motion document contract", () => {
  it("parses a full document and strips authoring into the runtime definition", () => {
    const document = parseMotionDocumentV1(entranceDocumentV1());
    expect(document.motionId).toBe("motion.test.entrance");
    expect(document.label).toBe("测试登场");
    expect(document.authoring).toEqual({
      status: "human_tuned",
      locked: true,
      notes: "手工调过节奏",
    });
    const definition = motionDefinitionFromDocumentV1(document);
    expect(Object.keys(definition).toSorted()).toEqual([
      "delayMs",
      "durationMs",
      "motionId",
      "tracks",
    ]);
    expect(definition.tracks).toBe(document.tracks);
    expect(motionTotalDurationMsV1(definition)).toBe(500);
  });

  it("parses a document without authoring metadata", () => {
    const raw = entranceDocumentV1();
    delete raw.authoring;
    const document = parseMotionDocumentV1(raw);
    expect(document.authoring).toBeUndefined();
  });

  it("accepts an embedded runtime definition shape", () => {
    const definition = parseMotionDefinitionV1({
      motionId: "motion.test.embedded",
      durationMs: 200,
      delayMs: 0,
      tracks: [
        {
          channel: "offsetY",
          keyframes: [
            { atPermille: 0, value: -80 },
            { atPermille: 1000, value: 0 },
          ],
        },
      ],
    });
    expect(definition.motionId).toBe("motion.test.embedded");
  });

  it("admits long motions, dense tracks, and frame indexes beyond historical editor caps", () => {
    const keyframes = Array.from({ length: 33 }, (_, index) => ({
      atPermille: Math.round(index * 1000 / 32),
      value: 256 + index,
    }));
    const document = parseMotionDocumentV1({
      ...entranceDocumentV1(),
      durationMs: 120_000,
      delayMs: 90_000,
      tracks: [{ channel: "frame", keyframes }],
    });

    expect(document.tracks[0]?.keyframes).toHaveLength(33);
    expect(motionTotalDurationMsV1(document)).toBe(210_000);
    expect(sampleMotionAtV1(document, 210_000).frameIndex).toBe(288);
  });

  it("rejects timing whose combined duration is not a safe integer", () => {
    expect(() =>
      parseMotionDocumentV1({
        ...entranceDocumentV1(),
        durationMs: Number.MAX_SAFE_INTEGER,
        delayMs: 1,
      })
    ).toThrowError(/motion_total_duration_invalid/);
  });

  it.each([
    ["wrong format", { format: "sillymaker.timeline" }, /motion_format_invalid/],
    ["unsupported version", { version: 2 }, /motion_version_unsupported/],
    ["bad id", { motionId: "cue.test.entrance" }, /motion_id_invalid/],
    ["empty label", { label: "" }, /motion_label_invalid/],
    ["zero duration", { durationMs: 0 }, /motion_duration_invalid/],
    ["float duration", { durationMs: 100.5 }, /motion_duration_invalid/],
    ["negative delay", { delayMs: -1 }, /motion_delay_invalid/],
    ["empty tracks", { tracks: [] }, /motion_tracks_count_invalid/],
    [
      "authoring unknown key",
      { authoring: { status: "generated", owner: "me" } },
      /motion_authoring_invalid/,
    ],
    [
      "authoring bad status",
      { authoring: { status: "tuned" } },
      /motion_authoring_status_invalid/,
    ],
  ])("rejects %s", (_label, override, expected) => {
    const raw = { ...entranceDocumentV1(), ...override };
    expect(() => parseMotionDocumentV1(raw)).toThrowError(expected);
    expect(() => parseMotionDocumentV1(raw)).toThrowError(PresentationDataError);
  });

  it.each([
    [
      "duplicate channel",
      [
        {
          channel: "offsetX",
          keyframes: [{ atPermille: 0, value: 1 }, { atPermille: 1000, value: 0 }],
        },
        {
          channel: "offsetX",
          keyframes: [{ atPermille: 0, value: 2 }, { atPermille: 1000, value: 0 }],
        },
      ],
      /motion_channel_duplicate/,
    ],
    [
      "unknown channel",
      [{
        channel: "rotation",
        keyframes: [{ atPermille: 0, value: 0 }, { atPermille: 1000, value: 0 }],
      }],
      /motion_channel_invalid/,
    ],
    [
      "single keyframe",
      [{ channel: "offsetX", keyframes: [{ atPermille: 0, value: 0 }] }],
      /motion_keyframes_count_invalid/,
    ],
    [
      "first keyframe not at zero",
      [{
        channel: "offsetX",
        keyframes: [{ atPermille: 100, value: 0 }, { atPermille: 1000, value: 0 }],
      }],
      /motion_track_must_start_at_zero/,
    ],
    [
      "last keyframe not at full",
      [{
        channel: "offsetX",
        keyframes: [{ atPermille: 0, value: 0 }, { atPermille: 900, value: 0 }],
      }],
      /motion_track_must_end_at_full/,
    ],
    [
      "non-increasing keyframes",
      [{
        channel: "offsetX",
        keyframes: [
          { atPermille: 0, value: 0 },
          { atPermille: 500, value: 5 },
          { atPermille: 500, value: 9 },
          { atPermille: 1000, value: 0 },
        ],
      }],
      /motion_keyframes_not_increasing/,
    ],
    [
      "opacity out of bounds",
      [{
        channel: "opacityPermille",
        keyframes: [{ atPermille: 0, value: 1500 }, { atPermille: 1000, value: 1000 }],
      }],
      /motion_keyframe_value_invalid/,
    ],
    [
      "float value",
      [{
        channel: "offsetX",
        keyframes: [{ atPermille: 0, value: 1.5 }, { atPermille: 1000, value: 0 }],
      }],
      /motion_keyframe_value_invalid/,
    ],
    [
      "easing on the last keyframe",
      [{
        channel: "offsetX",
        keyframes: [
          { atPermille: 0, value: 10 },
          { atPermille: 1000, value: 0, easing: "linear" },
        ],
      }],
      /motion_easing_on_last_keyframe/,
    ],
    [
      "unknown named easing",
      [{
        channel: "offsetX",
        keyframes: [
          { atPermille: 0, value: 10, easing: "bounce" },
          { atPermille: 1000, value: 0 },
        ],
      }],
      /motion_easing_invalid/,
    ],
    [
      "bezier x out of unit range",
      [{
        channel: "offsetX",
        keyframes: [
          {
            atPermille: 0,
            value: 10,
            easing: {
              kind: "cubic_bezier",
              x1Permille: -100,
              y1Permille: 0,
              x2Permille: 580,
              y2Permille: 1000,
            },
          },
          { atPermille: 1000, value: 0 },
        ],
      }],
      /motion_easing_invalid/,
    ],
  ])("rejects track shape: %s", (_label, tracks, expected) => {
    const raw = { ...entranceDocumentV1(), tracks };
    expect(() => parseMotionDocumentV1(raw)).toThrowError(expected);
  });

  it("rejects unknown top-level keys and missing keys via exact-record admission", () => {
    expect(() => parseMotionDocumentV1({ ...entranceDocumentV1(), extra: 1 })).toThrowError(
      /object_keys/,
    );
    const missing = entranceDocumentV1();
    delete missing.label;
    expect(() => parseMotionDocumentV1(missing)).toThrowError(/object_keys/);
  });
});

describe("motion sampling", () => {
  const definition = motionDefinitionFromDocumentV1(
    parseMotionDocumentV1(entranceDocumentV1()),
  );

  it("holds the first keyframe values through the delay", () => {
    expect(sampleMotionAtV1(definition, 0)).toEqual({
      offsetX: 140,
      offsetY: 0,
      scalePermille: 1000,
      opacityPermille: 0,
      frameIndex: null,
    });
    expect(sampleMotionAtV1(definition, 99)).toEqual(sampleMotionAtV1(definition, 0));
  });

  it("holds the final keyframe values at and beyond the total duration", () => {
    const final = {
      offsetX: 0,
      offsetY: 0,
      scalePermille: 1000,
      opacityPermille: 1000,
      frameIndex: null,
    };
    expect(sampleMotionAtV1(definition, 500)).toEqual(final);
    expect(sampleMotionAtV1(definition, 10_000)).toEqual(final);
  });

  it("interpolates linearly between keyframes without explicit easing", () => {
    // Opacity ramps 0 -> 1000 over the first half of the 400ms span.
    expect(sampleMotionAtV1(definition, 100 + 100).opacityPermille).toBe(500);
    expect(sampleMotionAtV1(definition, 100 + 300).opacityPermille).toBe(1000);
  });

  it("applies the segment easing declared on the starting keyframe", () => {
    // ease_out_cubic at the midpoint: 1 - 0.5^3 = 0.875 of the way from 140 to 0.
    expect(sampleMotionAtV1(definition, 100 + 200).offsetX).toBe(Math.round(140 * (1 - 0.875)));
  });

  it("ease_out_back overshoots past the final value before settling", () => {
    const overshoot = parseMotionDefinitionV1({
      motionId: "motion.test.overshoot",
      durationMs: 1000,
      delayMs: 0,
      tracks: [
        {
          channel: "offsetX",
          keyframes: [
            { atPermille: 0, value: 100, easing: "ease_out_back" },
            { atPermille: 1000, value: 0 },
          ],
        },
      ],
    });
    const near = sampleMotionAtV1(overshoot, 800).offsetX;
    expect(near).toBeLessThan(0);
    expect(sampleMotionAtV1(overshoot, 1000).offsetX).toBe(0);
  });

  it("a diagonal cubic bezier matches linear within rounding", () => {
    const bezier = parseMotionDefinitionV1({
      motionId: "motion.test.bezier",
      durationMs: 1000,
      delayMs: 0,
      tracks: [
        {
          channel: "offsetY",
          keyframes: [
            {
              atPermille: 0,
              value: 0,
              easing: {
                kind: "cubic_bezier",
                x1Permille: 250,
                y1Permille: 250,
                x2Permille: 750,
                y2Permille: 750,
              },
            },
            { atPermille: 1000, value: 1000 },
          ],
        },
      ],
    });
    expect(Math.abs(sampleMotionAtV1(bezier, 500).offsetY - 500)).toBeLessThanOrEqual(1);
    expect(Math.abs(sampleMotionAtV1(bezier, 250).offsetY - 250)).toBeLessThanOrEqual(1);
  });

  it("same definition and time always sample identically", () => {
    for (const elapsed of [0, 137, 250, 399, 500]) {
      expect(sampleMotionAtV1(definition, elapsed)).toEqual(sampleMotionAtV1(definition, elapsed));
    }
  });

  it("reports channel baselines", () => {
    expect(motionChannelBaselineV1("offsetX")).toBe(0);
    expect(motionChannelBaselineV1("offsetY")).toBe(0);
    expect(motionChannelBaselineV1("scalePermille")).toBe(1000);
    expect(motionChannelBaselineV1("opacityPermille")).toBe(1000);
    expect(motionChannelBaselineV1("frame")).toBe(0);
  });
});

describe("frame channel (authorable frame set)", () => {
  function blinkDocumentV1(): Record<string, unknown> {
    return {
      format: "sillymaker.motion",
      version: 1,
      motionId: "motion.test.blink",
      label: "眨眼循环",
      durationMs: 4000,
      delayMs: 0,
      tracks: [
        {
          channel: "frame",
          keyframes: [
            { atPermille: 0, value: 0 },
            { atPermille: 900, value: 1 },
            { atPermille: 950, value: 0 },
            { atPermille: 1000, value: 0 },
          ],
        },
      ],
    };
  }

  it("samples stepwise: hold each frame until the next keyframe", () => {
    const definition = motionDefinitionFromDocumentV1(
      parseMotionDocumentV1(blinkDocumentV1()),
    );
    expect(sampleMotionAtV1(definition, 0).frameIndex).toBe(0);
    // Midway between keyframes there is no interpolation: still frame 0.
    expect(sampleMotionAtV1(definition, 1800).frameIndex).toBe(0);
    expect(sampleMotionAtV1(definition, 3599).frameIndex).toBe(0);
    // At the 900‰ stop the closed-eye frame appears and holds.
    expect(sampleMotionAtV1(definition, 3600).frameIndex).toBe(1);
    expect(sampleMotionAtV1(definition, 3799).frameIndex).toBe(1);
    // Back to open eyes at 950‰ and at/beyond the end.
    expect(sampleMotionAtV1(definition, 3800).frameIndex).toBe(0);
    expect(sampleMotionAtV1(definition, 10_000).frameIndex).toBe(0);
  });

  it("holds the first frame through the delay", () => {
    const raw = { ...blinkDocumentV1(), delayMs: 500 };
    const definition = motionDefinitionFromDocumentV1(parseMotionDocumentV1(raw));
    expect(sampleMotionAtV1(definition, 250).frameIndex).toBe(0);
  });

  it("composes with continuous channels in one document", () => {
    const raw = blinkDocumentV1();
    (raw.tracks as unknown[]).push({
      channel: "opacityPermille",
      keyframes: [
        { atPermille: 0, value: 0 },
        { atPermille: 1000, value: 1000 },
      ],
    });
    const definition = motionDefinitionFromDocumentV1(parseMotionDocumentV1(raw));
    const sample = sampleMotionAtV1(definition, 2000);
    expect(sample.frameIndex).toBe(0);
    expect(sample.opacityPermille).toBe(500);
  });

  it.each([
    [
      "easing on a frame keyframe",
      [
        { atPermille: 0, value: 0, easing: "linear" },
        { atPermille: 1000, value: 1 },
      ],
      /motion_frame_easing_forbidden/,
    ],
    [
      "negative frame index",
      [
        { atPermille: 0, value: -1 },
        { atPermille: 1000, value: 0 },
      ],
      /motion_keyframe_value_invalid/,
    ],
    [
      "unsafe frame index",
      [
        { atPermille: 0, value: Number.MAX_SAFE_INTEGER + 1 },
        { atPermille: 1000, value: 0 },
      ],
      /motion_keyframe_value_invalid/,
    ],
  ])("rejects %s", (_label, keyframes, expected) => {
    const raw = { ...blinkDocumentV1(), tracks: [{ channel: "frame", keyframes }] };
    expect(() => parseMotionDocumentV1(raw)).toThrowError(expected);
  });

  it("rejects a duplicate frame track (at most one per document)", () => {
    const track = {
      channel: "frame",
      keyframes: [{ atPermille: 0, value: 0 }, { atPermille: 1000, value: 1 }],
    };
    const raw = { ...blinkDocumentV1(), tracks: [track, { ...track }] };
    expect(() => parseMotionDocumentV1(raw)).toThrowError(/motion_channel_duplicate/);
  });
});
