// SPDX-License-Identifier: MIT
import type {
  TimelineDefinitionV1,
  TimelineEasingV1,
  TimelinePropertyV1,
  TimelineStepV1,
  TimelineTargetV1,
} from "./timeline.ts";
import { parseTimelineDefinitionV1 } from "./timeline.ts";

/**
 * The typed Timeline builder: thin composers that produce the exact same
 * JSON-safe contract a hand-written literal produces (the narrative-graph
 * precedent). `define` validates, so authoring mistakes fail at module
 * initialization with a structured path, not at playback.
 */
export const timelineV1 = Object.freeze({
  define(timelineId: string, root: TimelineStepV1): TimelineDefinitionV1 {
    return parseTimelineDefinitionV1({ timelineId, root });
  },
  sequence(...steps: readonly TimelineStepV1[]): TimelineStepV1 {
    return Object.freeze({ kind: "sequence" as const, steps: Object.freeze([...steps]) });
  },
  parallel(...steps: readonly TimelineStepV1[]): TimelineStepV1 {
    return Object.freeze({ kind: "parallel" as const, steps: Object.freeze([...steps]) });
  },
  wait(durationMs: number): TimelineStepV1 {
    return Object.freeze({ kind: "wait" as const, durationMs });
  },
  event(eventId: string): TimelineStepV1 {
    return Object.freeze({ kind: "event" as const, eventId });
  },
  repeat(count: number, step: TimelineStepV1): TimelineStepV1 {
    return Object.freeze({ kind: "repeat" as const, count, step });
  },
  tween(input: {
    readonly target: TimelineTargetV1;
    readonly property: TimelinePropertyV1;
    readonly from?: number;
    readonly to: number;
    readonly durationMs: number;
    readonly easing?: TimelineEasingV1;
  }): TimelineStepV1 {
    return Object.freeze({
      kind: "tween" as const,
      target: input.target,
      property: input.property,
      ...(input.from === undefined ? {} : { from: input.from }),
      to: input.to,
      durationMs: input.durationMs,
      easing: input.easing ?? "linear",
    });
  },
  entry(layerId: string, tag: string): TimelineTargetV1 {
    return Object.freeze({ kind: "entry" as const, layerId, tag });
  },
  camera(): TimelineTargetV1 {
    return Object.freeze({ kind: "camera" as const });
  },
});
