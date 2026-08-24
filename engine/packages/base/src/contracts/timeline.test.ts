// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { timelineV1 } from "./timeline-builder.ts";
import { evaluateTimelineAtV1, parseTimelineDefinitionV1, timelineDurationV1 } from "./timeline.ts";

const beacon = timelineV1.entry("layer.e2e.props", "tag.beacon");

function pulseDefinitionV1() {
  return timelineV1.define(
    "cue.test.pulse",
    timelineV1.sequence(
      timelineV1.event("event.test.start"),
      timelineV1.tween({
        target: beacon,
        property: "scalePermille",
        to: 1200,
        durationMs: 100,
        easing: "linear",
      }),
      timelineV1.tween({
        target: beacon,
        property: "scalePermille",
        from: 1200,
        to: 1000,
        durationMs: 100,
        easing: "linear",
      }),
      timelineV1.event("event.test.done"),
    ),
  );
}

describe("timeline definition contract", () => {
  it("builder and literal produce the identical parsed contract", () => {
    const literal = parseTimelineDefinitionV1({
      timelineId: "cue.test.pulse",
      root: {
        kind: "sequence",
        steps: [
          { kind: "event", eventId: "event.test.start" },
          {
            kind: "tween",
            target: { kind: "entry", layerId: "layer.e2e.props", tag: "tag.beacon" },
            property: "scalePermille",
            to: 1200,
            durationMs: 100,
            easing: "linear",
          },
          {
            kind: "tween",
            target: { kind: "entry", layerId: "layer.e2e.props", tag: "tag.beacon" },
            property: "scalePermille",
            from: 1200,
            to: 1000,
            durationMs: 100,
            easing: "linear",
          },
          { kind: "event", eventId: "event.test.done" },
        ],
      },
    });
    expect(literal).toEqual(pulseDefinitionV1());
  });

  it.each([
    [
      "bad id",
      { timelineId: "pulse", root: { kind: "wait", durationMs: 1 } },
      "timeline.id_invalid",
    ],
    [
      "zero duration",
      { timelineId: "cue.t", root: { kind: "wait", durationMs: 0 } },
      "timeline.duration_invalid",
    ],
    [
      "float duration",
      { timelineId: "cue.t", root: { kind: "wait", durationMs: 10.5 } },
      "timeline.duration_invalid",
    ],
    [
      "unbounded repeat",
      {
        timelineId: "cue.t",
        root: { kind: "repeat", count: 9, step: { kind: "wait", durationMs: 1 } },
      },
      "timeline.repeat_unbounded",
    ],
    [
      "unknown easing",
      {
        timelineId: "cue.t",
        root: {
          kind: "tween",
          target: { kind: "camera" },
          property: "offsetX",
          to: 10,
          durationMs: 10,
          easing: "bounce",
        },
      },
      "timeline.easing_invalid",
    ],
    [
      "unknown property",
      {
        timelineId: "cue.t",
        root: {
          kind: "tween",
          target: { kind: "camera" },
          property: "rotation",
          to: 10,
          durationMs: 10,
          easing: "linear",
        },
      },
      "timeline.property_invalid",
    ],
    [
      "bad event id",
      { timelineId: "cue.t", root: { kind: "event", eventId: "start" } },
      "timeline.event_invalid",
    ],
  ])("rejects %s with a structured code", (_label, value, code) => {
    expect(() => parseTimelineDefinitionV1(value)).toThrowError(expect.objectContaining({ code }));
  });

  it("rejects parallel branches writing the same channel", () => {
    expect(() =>
      timelineV1.define(
        "cue.test.conflict",
        timelineV1.parallel(
          timelineV1.tween({ target: beacon, property: "offsetX", to: 10, durationMs: 10 }),
          timelineV1.sequence(
            timelineV1.wait(5),
            timelineV1.tween({ target: beacon, property: "offsetX", to: -10, durationMs: 10 }),
          ),
        ),
      )
    ).toThrowError(expect.objectContaining({ code: "timeline.parallel_conflict" }));
  });

  it("allows sequential writes to the same channel within one parallel branch", () => {
    const definition = timelineV1.define(
      "cue.test.parallel-sequence",
      timelineV1.parallel(
        timelineV1.sequence(
          timelineV1.tween({ target: beacon, property: "offsetX", to: 10, durationMs: 10 }),
          timelineV1.tween({ target: beacon, property: "offsetX", to: -10, durationMs: 20 }),
        ),
        timelineV1.wait(5),
      ),
    );

    expect(timelineDurationV1(definition)).toBe(30);
  });

  it("allows parallel branches on different channels of the same target", () => {
    const definition = timelineV1.define(
      "cue.test.ok",
      timelineV1.parallel(
        timelineV1.tween({ target: beacon, property: "offsetX", to: 10, durationMs: 10 }),
        timelineV1.tween({ target: beacon, property: "opacityPermille", to: 500, durationMs: 20 }),
      ),
    );
    expect(timelineDurationV1(definition)).toBe(20);
  });

  it("rejects nesting beyond the depth ceiling", () => {
    let step: unknown = { kind: "wait", durationMs: 1 };
    for (let index = 0; index < 9; index += 1) {
      step = { kind: "sequence", steps: [step] };
    }
    expect(() => parseTimelineDefinitionV1({ timelineId: "cue.t", root: step })).toThrowError(
      expect.objectContaining({ code: "timeline.too_deep" }),
    );
  });

  it("rejects nested repeats that expand beyond the event budget", () => {
    let step: unknown = { kind: "event", eventId: "event.test.repeated" };
    for (let index = 0; index < 5; index += 1) {
      step = { kind: "repeat", count: 8, step };
    }
    expect(() => parseTimelineDefinitionV1({ timelineId: "cue.t", root: step })).toThrowError(
      expect.objectContaining({ code: "timeline.too_many_event_occurrences" }),
    );
  });
});

describe("timeline sampling", () => {
  it("computes duration across sequence, parallel, and repeat", () => {
    const definition = timelineV1.define(
      "cue.test.duration",
      timelineV1.sequence(
        timelineV1.repeat(3, timelineV1.wait(10)),
        timelineV1.parallel(timelineV1.wait(50), timelineV1.wait(20)),
      ),
    );
    expect(timelineDurationV1(definition)).toBe(80);
  });

  it("samples deterministic values, holds finished tweens, and orders events", () => {
    const definition = pulseDefinitionV1();
    expect(timelineDurationV1(definition)).toBe(200);

    const start = evaluateTimelineAtV1(definition, 0);
    expect(start.firedEventIds).toEqual(["event.test.start"]);
    expect(start.completed).toBe(false);

    const mid = evaluateTimelineAtV1(definition, 50);
    expect(mid.values).toEqual([{ target: beacon, property: "scalePermille", value: 1100 }]);

    const held = evaluateTimelineAtV1(definition, 150);
    expect(held.values).toEqual([{ target: beacon, property: "scalePermille", value: 1100 }]);

    const end = evaluateTimelineAtV1(definition, 200);
    expect(end.values).toEqual([{ target: beacon, property: "scalePermille", value: 1000 }]);
    expect(end.firedEventIds).toEqual(["event.test.start", "event.test.done"]);
    expect(end.completed).toBe(true);

    // Identical input, identical output: sampling is pure.
    expect(evaluateTimelineAtV1(definition, 50)).toEqual(mid);
  });

  it("repeats fire their events once per iteration", () => {
    const definition = timelineV1.define(
      "cue.test.repeat-events",
      timelineV1.repeat(
        3,
        timelineV1.sequence(timelineV1.event("event.test.tick"), timelineV1.wait(10)),
      ),
    );
    expect(evaluateTimelineAtV1(definition, 25).firedEventIds).toEqual([
      "event.test.tick",
      "event.test.tick",
      "event.test.tick",
    ]);
    expect(evaluateTimelineAtV1(definition, 5).firedEventIds).toEqual(["event.test.tick"]);
  });

  it("keeps parallel event samples as a chronological prefix", () => {
    const definition = timelineV1.define(
      "cue.test.parallel-events",
      timelineV1.parallel(
        timelineV1.sequence(
          timelineV1.wait(20),
          timelineV1.event("event.test.late"),
        ),
        timelineV1.sequence(
          timelineV1.wait(5),
          timelineV1.event("event.test.early"),
        ),
      ),
    );
    expect(evaluateTimelineAtV1(definition, 5).firedEventIds).toEqual([
      "event.test.early",
    ]);
    expect(evaluateTimelineAtV1(definition, 20).firedEventIds).toEqual([
      "event.test.early",
      "event.test.late",
    ]);
  });

  it("defaults tween from-values to the channel baseline", () => {
    const definition = timelineV1.define(
      "cue.test.baseline",
      timelineV1.tween({
        target: timelineV1.camera(),
        property: "offsetX",
        to: 100,
        durationMs: 100,
      }),
    );
    expect(evaluateTimelineAtV1(definition, 50).values).toEqual([
      { target: { kind: "camera" }, property: "offsetX", value: 50 },
    ]);
  });
});
