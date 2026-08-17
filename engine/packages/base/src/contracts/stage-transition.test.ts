// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  motionStageTransitionV1,
  parseStageCueDispatchesV1,
  parseStageTransitionDefinitionV1,
  stageCueDispatchLimitV1,
} from "./stage-transition.ts";

function rawEntranceMotionV1(): Record<string, unknown> {
  return {
    format: "sillymaker.motion",
    version: 1,
    motionId: "motion.test.enter",
    label: "登场",
    durationMs: 300,
    delayMs: 50,
    tracks: [
      {
        channel: "offsetX",
        keyframes: [
          { atPermille: 0, value: 120, easing: "ease_out_cubic" },
          { atPermille: 1000, value: 0 },
        ],
      },
    ],
    authoring: { status: "generated" },
  };
}

function legacyDefinitionV1(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    transitionId: "transition.test.fade",
    kind: "crossfade",
    durationMs: 200,
    easing: "linear",
    inputPolicy: "target_active",
    interruption: "settle_and_retarget",
    reducedMotion: { kind: "settle" },
    readiness: { kind: "immediate" },
    acknowledge: false,
    slide: null,
    ...overrides,
  };
}

function motionDefinitionLiteralV1(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return legacyDefinitionV1({
    transitionId: "transition.test.enter",
    kind: "motion",
    durationMs: 350,
    motion: {
      motionId: "motion.test.enter",
      durationMs: 300,
      delayMs: 50,
      tracks: [
        {
          channel: "offsetX",
          keyframes: [
            { atPermille: 0, value: 120, easing: "ease_out_cubic" },
            { atPermille: 1000, value: 0 },
          ],
        },
      ],
    },
    ...overrides,
  });
}

describe("stage transition definition contract", () => {
  it("keeps the exact legacy shape valid without a motion key", () => {
    const definition = parseStageTransitionDefinitionV1(legacyDefinitionV1());
    expect(definition.kind).toBe("crossfade");
    expect("motion" in definition).toBe(false);
  });

  it("parses a motion-kind literal with the embedded runtime payload", () => {
    const definition = parseStageTransitionDefinitionV1(motionDefinitionLiteralV1());
    expect(definition.kind).toBe("motion");
    expect(definition.motion?.motionId).toBe("motion.test.enter");
    expect(definition.durationMs).toBe(350);
    expect(Object.isFrozen(definition)).toBe(true);
  });

  it("motionStageTransitionV1 binds a raw document with derived duration and defaults", () => {
    const definition = motionStageTransitionV1({
      transitionId: "transition.test.enter",
      motion: rawEntranceMotionV1(),
    });
    expect(definition).toEqual(parseStageTransitionDefinitionV1(motionDefinitionLiteralV1()));
    // Authoring metadata never reaches the runtime payload.
    expect(definition.motion !== undefined && "authoring" in definition.motion).toBe(false);
  });

  it("motionStageTransitionV1 honors explicit edge behavior", () => {
    const definition = motionStageTransitionV1({
      transitionId: "transition.test.enter",
      motion: rawEntranceMotionV1(),
      inputPolicy: "block",
      acknowledge: true,
    });
    expect(definition.inputPolicy).toBe("block");
    expect(definition.acknowledge).toBe(true);
  });

  it.each([
    ["motion key on a non-motion kind", legacyDefinitionV1({ motion: {} }), /object_keys/],
    [
      "motion kind without the motion key",
      (() => {
        const raw = motionDefinitionLiteralV1();
        delete raw.motion;
        return raw;
      })(),
      /object_keys/,
    ],
    [
      "motion kind with a slide offset",
      motionDefinitionLiteralV1({ slide: { x: 0, y: 10 } }),
      /motion_slide_forbidden/,
    ],
    [
      "motion kind with run-level easing",
      motionDefinitionLiteralV1({ easing: "ease_in_out" }),
      /motion_easing_must_be_linear/,
    ],
    [
      "motion kind with a mismatched duration",
      motionDefinitionLiteralV1({ durationMs: 300 }),
      /motion_duration_mismatch/,
    ],
    [
      "motion kind with an invalid payload",
      motionDefinitionLiteralV1({ motion: { motionId: "motion.test.enter" } }),
      /object_keys/,
    ],
  ])("rejects %s", (_label, raw, expected) => {
    expect(() => parseStageTransitionDefinitionV1(raw)).toThrowError(expected);
  });

  it("rejects an unknown transition kind", () => {
    expect(() => parseStageTransitionDefinitionV1(legacyDefinitionV1({ kind: "wipe" })))
      .toThrowError(/transition_kind_invalid/);
  });
});

describe("stage cue dispatch admission", () => {
  it("admits cue and open dispatch forms and freezes the list", () => {
    const dispatches = parseStageCueDispatchesV1([
      { sceneId: "scene.app.opening", cueId: "cue.app.opening.hero-enters" },
      { sceneId: "scene.app.opening", open: true },
    ]);
    expect(dispatches).toEqual([
      { sceneId: "scene.app.opening", cueId: "cue.app.opening.hero-enters" },
      { sceneId: "scene.app.opening", open: true },
    ]);
    expect(Object.isFrozen(dispatches)).toBe(true);
    expect(Object.isFrozen(dispatches[0])).toBe(true);
    expect(parseStageCueDispatchesV1([])).toEqual([]);
  });

  it("rejects non-arrays, over-bound lists, malformed entries, and bad ids", () => {
    expect(() => parseStageCueDispatchesV1(null)).toThrowError(/stage_cue_dispatches_invalid/);
    expect(() =>
      parseStageCueDispatchesV1(
        Array.from({ length: stageCueDispatchLimitV1 + 1 }, () => ({
          sceneId: "scene.app.opening",
          open: true,
        })),
      )
    ).toThrowError(/stage_cue_dispatches_count_invalid/);
    expect(() => parseStageCueDispatchesV1(["cue.app.x"])).toThrowError(
      /stage_cue_dispatch_invalid/,
    );
    expect(() => parseStageCueDispatchesV1([{ sceneId: "scene.app.opening", open: false }]))
      .toThrowError(/stage_cue_dispatch_open_invalid/);
    expect(() => parseStageCueDispatchesV1([{ sceneId: "opening", cueId: "cue.app.x" }]))
      .toThrowError(/stage_cue_dispatch_id_invalid/);
    expect(() => parseStageCueDispatchesV1([{ sceneId: "scene.app.opening", cueId: "hero" }]))
      .toThrowError(/stage_cue_dispatch_id_invalid/);
    expect(() =>
      parseStageCueDispatchesV1([
        { sceneId: "scene.app.opening", cueId: "cue.app.x", extra: 1 },
      ])
    ).toThrowError(/object_keys/);
  });
});
