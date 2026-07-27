// SPDX-License-Identifier: MIT

/**
 * Typed Timeline contracts (R5): JSON-safe descriptors a Story authors in
 * plain TypeScript (builder or literal — identical contract) and the UI
 * executes on top of the Presentation Run lifecycle.
 *
 * Timelines are decorative, transient presentation: they animate integer
 * overlay channels (offsets, scale, opacity) over the settled stage
 * rendering and emit ordered events. They never touch gameplay State, never
 * enter Saves, and when a timeline finishes (completed, skipped, or
 * cancelled) its overlay clears back to the settled rendering — persistent
 * movement belongs to authoritative stage mutations, not timelines.
 */

export type TimelineTargetV1 =
  | { readonly kind: "entry"; readonly layerId: string; readonly tag: string }
  | { readonly kind: "camera" };

/**
 * Integer overlay channels relative to the settled rendering:
 * `offsetX`/`offsetY` in logical pixels (baseline 0), `scalePermille` and
 * `opacityPermille` as multipliers (baseline 1000).
 */
export type TimelinePropertyV1 = "offsetX" | "offsetY" | "scalePermille" | "opacityPermille";

export type TimelineEasingV1 = "linear" | "ease_in_out";

export type TimelineStepV1 =
  | {
      readonly kind: "tween";
      readonly target: TimelineTargetV1;
      readonly property: TimelinePropertyV1;
      /** Start value; defaults to the channel baseline (0 or 1000). */
      readonly from?: number;
      readonly to: number;
      readonly durationMs: number;
      readonly easing: TimelineEasingV1;
    }
  | { readonly kind: "wait"; readonly durationMs: number }
  | { readonly kind: "event"; readonly eventId: string }
  | { readonly kind: "sequence"; readonly steps: readonly TimelineStepV1[] }
  | { readonly kind: "parallel"; readonly steps: readonly TimelineStepV1[] }
  | { readonly kind: "repeat"; readonly count: number; readonly step: TimelineStepV1 };

export interface TimelineDefinitionV1 {
  readonly timelineId: string;
  readonly root: TimelineStepV1;
}

/** Resolves a cue ID to a timeline; the Story owns the catalog. */
export interface TimelineCatalogV1 {
  resolveTimeline(cueId: string): TimelineDefinitionV1 | null;
}

export interface TimelineChannelValueV1 {
  readonly target: TimelineTargetV1;
  readonly property: TimelinePropertyV1;
  readonly value: number;
}

export interface TimelineSampleV1 {
  /** Overlay values active at the sampled time (settled channels included). */
  readonly values: readonly TimelineChannelValueV1[];
  /** Every eventId whose fire time is <= the sampled time, in order. */
  readonly firedEventIds: readonly string[];
  readonly completed: boolean;
}

export class TimelineDefinitionErrorV1 extends TypeError {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string) {
    super(`${code} at ${path}`);
    this.name = "TimelineDefinitionErrorV1";
    this.code = code;
    this.path = path;
  }
}

const timelineIdPatternV1 = /^cue\.[a-z0-9_.-]+$/u;
const eventIdPatternV1 = /^event\.[a-z0-9_.-]+$/u;
const maxRepeatCountV1 = 8;
const maxDepthV1 = 8;
const maxStepsV1 = 256;
const maxDurationMsV1 = 60_000;
const propertyValuesV1: readonly TimelinePropertyV1[] = Object.freeze([
  "offsetX",
  "offsetY",
  "scalePermille",
  "opacityPermille",
]);
const easingValuesV1: readonly TimelineEasingV1[] = Object.freeze(["linear", "ease_in_out"]);

export function timelineChannelBaselineV1(property: TimelinePropertyV1): number {
  return property === "scalePermille" || property === "opacityPermille" ? 1000 : 0;
}

function targetKeyV1(target: TimelineTargetV1): string {
  return target.kind === "camera" ? "camera" : `entry\u0000${target.layerId}\u0000${target.tag}`;
}

function fail(code: string, path: string): never {
  throw new TimelineDefinitionErrorV1(code, path);
}

function requireIntV1(
  value: unknown,
  min: number,
  max: number,
  code: string,
  path: string,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    fail(code, path);
  }
  return value;
}

function parseTargetV1(value: unknown, path: string): TimelineTargetV1 {
  if (value === null || typeof value !== "object") fail("timeline.target_invalid", path);
  const record = value as {
    readonly kind?: unknown;
    readonly layerId?: unknown;
    readonly tag?: unknown;
  };
  if (record.kind === "camera") {
    if (Object.keys(value).join("\u0000") !== "kind") fail("timeline.target_invalid", path);
    return Object.freeze({ kind: "camera" as const });
  }
  if (record.kind !== "entry") fail("timeline.target_invalid", path);
  if (Object.keys(value).toSorted().join("\u0000") !== "kind\u0000layerId\u0000tag") {
    fail("timeline.target_invalid", path);
  }
  if (typeof record.layerId !== "string" || record.layerId === "") {
    fail("timeline.target_invalid", `${path}/layerId`);
  }
  if (typeof record.tag !== "string" || record.tag === "") {
    fail("timeline.target_invalid", `${path}/tag`);
  }
  return Object.freeze({ kind: "entry" as const, layerId: record.layerId, tag: record.tag });
}

interface ParseStateV1 {
  steps: number;
}

function parseStepV1(
  value: unknown,
  path: string,
  depth: number,
  state: ParseStateV1,
): TimelineStepV1 {
  if (depth > maxDepthV1) fail("timeline.too_deep", path);
  state.steps += 1;
  if (state.steps > maxStepsV1) fail("timeline.too_many_steps", path);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("timeline.step_invalid", path);
  }
  const record = value as Record<string, unknown>;
  switch (record.kind) {
    case "tween": {
      const keys = Object.keys(record).toSorted().join("\u0000");
      const withFrom =
        "durationMs\u0000easing\u0000from\u0000kind\u0000property\u0000target\u0000to";
      const withoutFrom = "durationMs\u0000easing\u0000kind\u0000property\u0000target\u0000to";
      if (keys !== withFrom && keys !== withoutFrom) fail("timeline.step_invalid", path);
      if (!propertyValuesV1.includes(record.property as TimelinePropertyV1)) {
        fail("timeline.property_invalid", `${path}/property`);
      }
      if (!easingValuesV1.includes(record.easing as TimelineEasingV1)) {
        fail("timeline.easing_invalid", `${path}/easing`);
      }
      const durationMs = requireIntV1(
        record.durationMs,
        1,
        maxDurationMsV1,
        "timeline.duration_invalid",
        `${path}/durationMs`,
      );
      const to = requireIntV1(record.to, -100_000, 100_000, "timeline.value_invalid", `${path}/to`);
      const from =
        record.from === undefined
          ? undefined
          : requireIntV1(record.from, -100_000, 100_000, "timeline.value_invalid", `${path}/from`);
      return Object.freeze({
        kind: "tween" as const,
        target: parseTargetV1(record.target, `${path}/target`),
        property: record.property as TimelinePropertyV1,
        ...(from === undefined ? {} : { from }),
        to,
        durationMs,
        easing: record.easing as TimelineEasingV1,
      });
    }
    case "wait": {
      if (Object.keys(record).toSorted().join("\u0000") !== "durationMs\u0000kind") {
        fail("timeline.step_invalid", path);
      }
      return Object.freeze({
        kind: "wait" as const,
        durationMs: requireIntV1(
          record.durationMs,
          1,
          maxDurationMsV1,
          "timeline.duration_invalid",
          `${path}/durationMs`,
        ),
      });
    }
    case "event": {
      if (Object.keys(record).toSorted().join("\u0000") !== "eventId\u0000kind") {
        fail("timeline.step_invalid", path);
      }
      if (typeof record.eventId !== "string" || !eventIdPatternV1.test(record.eventId)) {
        fail("timeline.event_invalid", `${path}/eventId`);
      }
      return Object.freeze({ kind: "event" as const, eventId: record.eventId });
    }
    case "sequence":
    case "parallel": {
      if (Object.keys(record).toSorted().join("\u0000") !== "kind\u0000steps") {
        fail("timeline.step_invalid", path);
      }
      if (!Array.isArray(record.steps) || record.steps.length === 0) {
        fail("timeline.steps_empty", `${path}/steps`);
      }
      const steps = Object.freeze(
        record.steps.map((child, index) =>
          parseStepV1(child, `${path}/steps/${String(index)}`, depth + 1, state),
        ),
      );
      if (record.kind === "parallel") {
        // Two parallel branches writing the same channel is rejected
        // statically: overlap analysis stays trivial and authoring mistakes
        // surface immediately instead of as last-writer-wins flicker.
        const seen = new Set<string>();
        steps.forEach((branch, index) => {
          for (const channel of collectChannelsV1(branch)) {
            if (seen.has(channel)) {
              fail("timeline.parallel_conflict", `${path}/steps/${String(index)}`);
            }
            seen.add(channel);
          }
        });
      }
      return Object.freeze({ kind: record.kind, steps }) as TimelineStepV1;
    }
    case "repeat": {
      if (Object.keys(record).toSorted().join("\u0000") !== "count\u0000kind\u0000step") {
        fail("timeline.step_invalid", path);
      }
      const count = requireIntV1(
        record.count,
        1,
        maxRepeatCountV1,
        "timeline.repeat_unbounded",
        `${path}/count`,
      );
      return Object.freeze({
        kind: "repeat" as const,
        count,
        step: parseStepV1(record.step, `${path}/step`, depth + 1, state),
      });
    }
    default:
      return fail("timeline.step_invalid", path);
  }
}

function collectChannelsV1(step: TimelineStepV1): readonly string[] {
  switch (step.kind) {
    case "tween":
      return [`${targetKeyV1(step.target)}\u0000${step.property}`];
    case "wait":
    case "event":
      return [];
    case "sequence":
    case "parallel":
      return step.steps.flatMap((child) => collectChannelsV1(child));
    case "repeat":
      return collectChannelsV1(step.step);
    default: {
      const exhaustive: never = step;
      throw new TypeError(`unknown timeline step ${String(exhaustive)}`);
    }
  }
}

export function parseTimelineDefinitionV1(value: unknown, path = ""): TimelineDefinitionV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("timeline.definition_invalid", path);
  }
  const record = value as { readonly timelineId?: unknown; readonly root?: unknown };
  if (Object.keys(value).toSorted().join("\u0000") !== "root\u0000timelineId") {
    fail("timeline.definition_invalid", path);
  }
  if (typeof record.timelineId !== "string" || !timelineIdPatternV1.test(record.timelineId)) {
    fail("timeline.id_invalid", `${path}/timelineId`);
  }
  const state: ParseStateV1 = { steps: 0 };
  return Object.freeze({
    timelineId: record.timelineId,
    root: parseStepV1(record.root, `${path}/root`, 0, state),
  });
}

export function timelineStepDurationV1(step: TimelineStepV1): number {
  switch (step.kind) {
    case "tween":
    case "wait":
      return step.durationMs;
    case "event":
      return 0;
    case "sequence":
      return step.steps.reduce((total, child) => total + timelineStepDurationV1(child), 0);
    case "parallel":
      return step.steps.reduce((max, child) => Math.max(max, timelineStepDurationV1(child)), 0);
    case "repeat":
      return step.count * timelineStepDurationV1(step.step);
    default: {
      const exhaustive: never = step;
      throw new TypeError(`unknown timeline step ${String(exhaustive)}`);
    }
  }
}

export function timelineDurationV1(definition: TimelineDefinitionV1): number {
  return timelineStepDurationV1(definition.root);
}

const easingFunctionsV1: Readonly<Record<TimelineEasingV1, (value: number) => number>> =
  Object.freeze({
    linear: (value: number) => value,
    ease_in_out: (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      return clamped * clamped * (3 - 2 * clamped);
    },
  });

interface SampleStateV1 {
  readonly values: Map<string, TimelineChannelValueV1>;
  readonly firedEventIds: string[];
}

function sampleStepV1(step: TimelineStepV1, elapsedMs: number, state: SampleStateV1): void {
  switch (step.kind) {
    case "tween": {
      if (elapsedMs <= 0) return;
      const from = step.from ?? timelineChannelBaselineV1(step.property);
      const linear = Math.min(1, elapsedMs / step.durationMs);
      const eased = easingFunctionsV1[step.easing](linear);
      const value = Math.round(from + (step.to - from) * eased);
      const key = `${targetKeyV1(step.target)}\u0000${step.property}`;
      state.values.set(key, Object.freeze({ target: step.target, property: step.property, value }));
      return;
    }
    case "wait":
      return;
    case "event": {
      if (elapsedMs >= 0) state.firedEventIds.push(step.eventId);
      return;
    }
    case "sequence": {
      let offset = 0;
      for (const child of step.steps) {
        const childDuration = timelineStepDurationV1(child);
        const local = elapsedMs - offset;
        if (local < 0) return;
        // Children fully in the past sample at their end so finished tweens
        // hold their final value for the rest of the timeline.
        sampleStepV1(child, Math.min(local, childDuration), state);
        offset += childDuration;
      }
      return;
    }
    case "parallel": {
      for (const child of step.steps) {
        sampleStepV1(child, Math.min(elapsedMs, timelineStepDurationV1(child)), state);
      }
      return;
    }
    case "repeat": {
      const childDuration = timelineStepDurationV1(step.step);
      if (childDuration === 0) {
        for (let index = 0; index < step.count; index += 1) {
          sampleStepV1(step.step, 0, state);
        }
        return;
      }
      const completedIterations = Math.min(step.count, Math.floor(elapsedMs / childDuration));
      for (let index = 0; index < completedIterations; index += 1) {
        sampleStepV1(step.step, childDuration, state);
      }
      if (completedIterations < step.count) {
        const local = elapsedMs - completedIterations * childDuration;
        if (local > 0) sampleStepV1(step.step, local, state);
      }
      return;
    }
    default: {
      const exhaustive: never = step;
      throw new TypeError(`unknown timeline step ${String(exhaustive)}`);
    }
  }
}

/**
 * Pure sampling: the same definition and elapsed time always produce the
 * same channel values and fired-event prefix, so the player stays a thin
 * clock adapter and every behavior is testable without timers.
 */
export function evaluateTimelineAtV1(
  definition: TimelineDefinitionV1,
  elapsedMs: number,
): TimelineSampleV1 {
  const clamped = Math.max(0, elapsedMs);
  const state: SampleStateV1 = { values: new Map(), firedEventIds: [] };
  sampleStepV1(definition.root, clamped, state);
  return Object.freeze({
    values: Object.freeze([...state.values.values()]),
    firedEventIds: Object.freeze(state.firedEventIds),
    completed: clamped >= timelineDurationV1(definition),
  });
}
