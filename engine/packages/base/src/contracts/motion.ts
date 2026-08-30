// SPDX-License-Identifier: MIT
import { dataFailure, readArray, readExactRecord } from "./presentation-data.ts";

/**
 * Authorable Motion contracts: a Motion asset is plain, versioned, validated
 * keyframe data that a Story keeps as a standalone Document (typically a
 * `*.motion.json` file under the Story's presentation sources) and binds to
 * one stage edge through a `kind: "motion"` stage transition.
 *
 * Motions are presentation-only. They animate integer overlay channels
 * relative to the settled placement (the layout authority): offsets add to
 * the placement position, permille channels multiply the placement scale and
 * opacity, the stepped `frame` channel selects an index into the content's
 * declared frame set (authorable-frame-set proposal, accepted 2026-08-21),
 * and when the owning run finishes the overlay clears back to the settled
 * rendering. Motion data never enters authoritative gameplay State, Saves,
 * digests, CommandLog, or replay.
 *
 * Two layers share one validated shape:
 * - `MotionDocumentV1` is the file format: it adds format/version/label and
 *   optional `authoring` metadata (generated vs human-tuned, locked, notes)
 *   for humans and editing tools.
 * - `MotionDefinitionV1` is the stripped runtime payload embedded in a
 *   stage transition definition; authoring metadata never reaches runtime.
 */

export type MotionChannelV1 =
  | "offsetX"
  | "offsetY"
  | "scalePermille"
  | "opacityPermille"
  | "frame";

export type MotionNamedEasingV1 =
  | "linear"
  | "ease_in"
  | "ease_out"
  | "ease_in_out"
  | "ease_in_cubic"
  | "ease_out_cubic"
  | "ease_out_back";

export type MotionEasingV1 =
  | MotionNamedEasingV1
  | Readonly<{
    readonly kind: "cubic_bezier";
    /** Control point X in permille of the unit square, 0..1000. */
    readonly x1Permille: number;
    /** Control point Y in permille; -1000..2000 so curves may overshoot. */
    readonly y1Permille: number;
    readonly x2Permille: number;
    readonly y2Permille: number;
  }>;

export interface MotionKeyframeV1 {
  /**
   * Normalized track time in permille of `durationMs` (0..1000). The first
   * keyframe of a track sits at 0, the last at 1000, strictly increasing.
   */
  readonly atPermille: number;
  /**
   * Channel-specific integer value: `offsetX`/`offsetY` in logical canvas
   * pixels relative to the settled placement, `scalePermille` and
   * `opacityPermille` as multipliers over the placement (baseline 1000),
   * `frame` as a 0-based index into the content's declared frame set.
   */
  readonly value: number;
  /**
   * Easing of the segment that starts at this keyframe; defaults to
   * "linear". Not allowed on the last keyframe (no segment follows it)
   * and never allowed on `frame` keyframes (frames sample stepwise).
   */
  readonly easing?: MotionEasingV1;
}

export interface MotionTrackV1 {
  readonly channel: MotionChannelV1;
  readonly keyframes: readonly MotionKeyframeV1[];
}

/** The normalized runtime payload embedded in `kind: "motion"` transitions. */
export interface MotionDefinitionV1 {
  readonly motionId: string;
  /** Animated span in milliseconds (excluding `delayMs`). */
  readonly durationMs: number;
  /** Hold at the first keyframe values before the animated span starts. */
  readonly delayMs: number;
  readonly tracks: readonly MotionTrackV1[];
}

export type MotionAuthoringStatusV1 = "generated" | "human_tuned";

/**
 * Non-runtime authoring metadata. Editing tools and collaboration rules read
 * it (do not overwrite human-tuned or locked assets); normalization into the
 * runtime `MotionDefinitionV1` strips it.
 */
export interface MotionAuthoringV1 {
  readonly status?: MotionAuthoringStatusV1;
  readonly locked?: boolean;
  readonly notes?: string;
}

export interface MotionDocumentV1 {
  readonly format: "sillymaker.motion";
  readonly version: 1;
  readonly motionId: string;
  readonly label: string;
  readonly durationMs: number;
  readonly delayMs: number;
  readonly tracks: readonly MotionTrackV1[];
  readonly authoring?: MotionAuthoringV1;
}

/**
 * One sampled overlay frame; absent tracks report their channel baseline.
 * The `frame` channel has no numeric baseline: a definition without a
 * frame track samples `frameIndex: null`, meaning "no frame override" —
 * the renderer keeps its default art.
 */
export interface MotionSampleV1 {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scalePermille: number;
  readonly opacityPermille: number;
  readonly frameIndex: number | null;
}

export const motionDocumentFormatV1 = "sillymaker.motion";
export const motionDocumentVersionV1 = 1;

const motionIdPatternV1 = /^motion\.[a-z0-9_.-]+$/u;
const motionMaxIdLengthV1 = 96;
const motionMaxLabelLengthV1 = 120;
const motionMaxNotesLengthV1 = 500;

const motionChannelsV1: readonly MotionChannelV1[] = [
  "offsetX",
  "offsetY",
  "scalePermille",
  "opacityPermille",
  "frame",
];

const motionNamedEasingsV1: readonly MotionNamedEasingV1[] = [
  "linear",
  "ease_in",
  "ease_out",
  "ease_in_out",
  "ease_in_cubic",
  "ease_out_cubic",
  "ease_out_back",
];

/**
 * The numeric editor baseline for a channel (a new track starts here). The
 * sampled baseline for `frame` is `null` (no override); 0 is only the
 * editor's starting index.
 */
export function motionChannelBaselineV1(channel: MotionChannelV1): number {
  return channel === "scalePermille" || channel === "opacityPermille" ? 1000 : 0;
}

function requireMotionIntV1(
  value: unknown,
  min: number,
  max: number,
  path: string,
  reason: string,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    return dataFailure(path, reason);
  }
  return value;
}

function motionChannelValueBoundsV1(
  channel: MotionChannelV1,
): { readonly min: number; readonly max: number } {
  switch (channel) {
    case "offsetX":
    case "offsetY":
      return { min: -100_000, max: 100_000 };
    case "scalePermille":
      return { min: 0, max: 100_000 };
    case "opacityPermille":
      return { min: 0, max: 1000 };
    case "frame":
      return { min: 0, max: Number.MAX_SAFE_INTEGER };
    default: {
      const exhaustive: never = channel;
      throw new TypeError(`unknown motion channel ${String(exhaustive)}`);
    }
  }
}

function parseMotionEasingV1(value: unknown, path: string): MotionEasingV1 {
  if (typeof value === "string") {
    if (!motionNamedEasingsV1.includes(value as MotionNamedEasingV1)) {
      return dataFailure(path, "motion_easing_invalid");
    }
    return value as MotionNamedEasingV1;
  }
  const record = readExactRecord(
    value,
    ["kind", "x1Permille", "y1Permille", "x2Permille", "y2Permille"],
    path,
  );
  if (record.kind !== "cubic_bezier") return dataFailure(`${path}/kind`, "motion_easing_invalid");
  return {
    kind: "cubic_bezier" as const,
    x1Permille: requireMotionIntV1(
      record.x1Permille,
      0,
      1000,
      `${path}/x1Permille`,
      "motion_easing_invalid",
    ),
    y1Permille: requireMotionIntV1(
      record.y1Permille,
      -1000,
      2000,
      `${path}/y1Permille`,
      "motion_easing_invalid",
    ),
    x2Permille: requireMotionIntV1(
      record.x2Permille,
      0,
      1000,
      `${path}/x2Permille`,
      "motion_easing_invalid",
    ),
    y2Permille: requireMotionIntV1(
      record.y2Permille,
      -1000,
      2000,
      `${path}/y2Permille`,
      "motion_easing_invalid",
    ),
  };
}

function parseMotionKeyframeV1(
  value: unknown,
  path: string,
  channel: MotionChannelV1,
  isLast: boolean,
): MotionKeyframeV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "motion_keyframe_invalid");
  }
  const hasEasing = Object.hasOwn(value, "easing");
  const record = readExactRecord(
    value,
    hasEasing ? ["atPermille", "value", "easing"] : ["atPermille", "value"],
    path,
  );
  if (hasEasing && channel === "frame") {
    return dataFailure(`${path}/easing`, "motion_frame_easing_forbidden");
  }
  if (hasEasing && isLast) {
    return dataFailure(`${path}/easing`, "motion_easing_on_last_keyframe");
  }
  const bounds = motionChannelValueBoundsV1(channel);
  const easing = hasEasing ? parseMotionEasingV1(record.easing, `${path}/easing`) : undefined;
  return {
    atPermille: requireMotionIntV1(
      record.atPermille,
      0,
      1000,
      `${path}/atPermille`,
      "motion_keyframe_offset_invalid",
    ),
    value: requireMotionIntV1(
      record.value,
      bounds.min,
      bounds.max,
      `${path}/value`,
      "motion_keyframe_value_invalid",
    ),
    ...(easing === undefined ? {} : { easing }),
  };
}

function parseMotionTrackV1(value: unknown, path: string): MotionTrackV1 {
  const record = readExactRecord(value, ["channel", "keyframes"], path);
  if (!motionChannelsV1.includes(record.channel as MotionChannelV1)) {
    return dataFailure(`${path}/channel`, "motion_channel_invalid");
  }
  const channel = record.channel as MotionChannelV1;
  const rawKeyframes = readArray(record.keyframes, `${path}/keyframes`);
  if (rawKeyframes.length < 2) {
    return dataFailure(`${path}/keyframes`, "motion_keyframes_count_invalid");
  }
  const keyframes = rawKeyframes.map((keyframe, index) =>
    parseMotionKeyframeV1(
      keyframe,
      `${path}/keyframes/${String(index)}`,
      channel,
      index === rawKeyframes.length - 1,
    )
  );
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (first === undefined || first.atPermille !== 0) {
    return dataFailure(`${path}/keyframes/0/atPermille`, "motion_track_must_start_at_zero");
  }
  if (last === undefined || last.atPermille !== 1000) {
    return dataFailure(
      `${path}/keyframes/${String(keyframes.length - 1)}/atPermille`,
      "motion_track_must_end_at_full",
    );
  }
  for (let index = 1; index < keyframes.length; index += 1) {
    const previous = keyframes[index - 1];
    const current = keyframes[index];
    if (previous === undefined || current === undefined) continue;
    if (current.atPermille <= previous.atPermille) {
      return dataFailure(
        `${path}/keyframes/${String(index)}/atPermille`,
        "motion_keyframes_not_increasing",
      );
    }
  }
  return { channel, keyframes };
}

function parseMotionIdV1(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length > motionMaxIdLengthV1 ||
    !motionIdPatternV1.test(value)
  ) {
    return dataFailure(path, "motion_id_invalid");
  }
  return value;
}

function parseMotionTracksV1(value: unknown, path: string): readonly MotionTrackV1[] {
  const rawTracks = readArray(value, path);
  if (rawTracks.length < 1 || rawTracks.length > motionChannelsV1.length) {
    return dataFailure(path, "motion_tracks_count_invalid");
  }
  const tracks = rawTracks.map((track, index) =>
    parseMotionTrackV1(track, `${path}/${String(index)}`)
  );
  const seen = new Set<MotionChannelV1>();
  tracks.forEach((track, index) => {
    if (seen.has(track.channel)) {
      dataFailure(`${path}/${String(index)}/channel`, "motion_channel_duplicate");
    }
    seen.add(track.channel);
  });
  return tracks;
}

function parseMotionAuthoringV1(value: unknown, path: string): MotionAuthoringV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "motion_authoring_invalid");
  }
  const allowed = new Set(["status", "locked", "notes"]);
  const record = value as Record<string, unknown>;
  const result: { status?: MotionAuthoringStatusV1; locked?: boolean; notes?: string } = {};
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      return dataFailure(path, "motion_authoring_invalid");
    }
    const memberValue = record[key];
    if (key === "status") {
      if (memberValue !== "generated" && memberValue !== "human_tuned") {
        return dataFailure(`${path}/status`, "motion_authoring_status_invalid");
      }
      result.status = memberValue;
    } else if (key === "locked") {
      if (typeof memberValue !== "boolean") {
        return dataFailure(`${path}/locked`, "motion_authoring_locked_invalid");
      }
      result.locked = memberValue;
    } else {
      if (
        typeof memberValue !== "string" ||
        memberValue.length === 0 ||
        memberValue.length > motionMaxNotesLengthV1
      ) {
        return dataFailure(`${path}/notes`, "motion_authoring_notes_invalid");
      }
      result.notes = memberValue;
    }
  }
  return result;
}

function parseMotionTimingV1(
  durationValue: unknown,
  delayValue: unknown,
  path: string,
): { readonly durationMs: number; readonly delayMs: number } {
  const durationMs = requireMotionIntV1(
    durationValue,
    1,
    Number.MAX_SAFE_INTEGER,
    `${path}/durationMs`,
    "motion_duration_invalid",
  );
  const delayMs = requireMotionIntV1(
    delayValue,
    0,
    Number.MAX_SAFE_INTEGER,
    `${path}/delayMs`,
    "motion_delay_invalid",
  );
  if (!Number.isSafeInteger(durationMs + delayMs)) {
    return dataFailure(`${path}/delayMs`, "motion_total_duration_invalid");
  }
  return { durationMs, delayMs };
}

/** Parses the stripped runtime payload embedded in transition definitions. */
export function parseMotionDefinitionV1(value: unknown, path = "/motion"): MotionDefinitionV1 {
  const record = readExactRecord(value, ["motionId", "durationMs", "delayMs", "tracks"], path);
  const timing = parseMotionTimingV1(record.durationMs, record.delayMs, path);
  return {
    motionId: parseMotionIdV1(record.motionId, `${path}/motionId`),
    durationMs: timing.durationMs,
    delayMs: timing.delayMs,
    tracks: parseMotionTracksV1(record.tracks, `${path}/tracks`),
  };
}

/**
 * Parses a `sillymaker.motion` Document (for example the value of a
 * `*.motion.json` import). Admission is strict: exact keys, safe-integer
 * values, coherent timing, and a structured path on every failure.
 */
export function parseMotionDocumentV1(value: unknown, path = ""): MotionDocumentV1 {
  const hasAuthoring = value !== null && typeof value === "object" &&
    Object.hasOwn(value, "authoring");
  const baseKeys = ["format", "version", "motionId", "label", "durationMs", "delayMs", "tracks"];
  const record = readExactRecord(
    value,
    hasAuthoring ? [...baseKeys, "authoring"] : baseKeys,
    path,
  );
  if (record.format !== motionDocumentFormatV1) {
    return dataFailure(`${path}/format`, "motion_format_invalid");
  }
  if (record.version !== motionDocumentVersionV1) {
    return dataFailure(`${path}/version`, "motion_version_unsupported");
  }
  if (
    typeof record.label !== "string" ||
    record.label.length === 0 ||
    record.label.length > motionMaxLabelLengthV1
  ) {
    return dataFailure(`${path}/label`, "motion_label_invalid");
  }
  const authoring = hasAuthoring
    ? parseMotionAuthoringV1(record.authoring, `${path}/authoring`)
    : undefined;
  const timing = parseMotionTimingV1(record.durationMs, record.delayMs, path);
  return {
    format: motionDocumentFormatV1,
    version: motionDocumentVersionV1,
    motionId: parseMotionIdV1(record.motionId, `${path}/motionId`),
    label: record.label,
    durationMs: timing.durationMs,
    delayMs: timing.delayMs,
    tracks: parseMotionTracksV1(record.tracks, `${path}/tracks`),
    ...(authoring === undefined ? {} : { authoring }),
  };
}

/** Strips authoring metadata into the runtime transition payload. */
export function motionDefinitionFromDocumentV1(
  motionDocument: MotionDocumentV1,
): MotionDefinitionV1 {
  return {
    motionId: motionDocument.motionId,
    durationMs: motionDocument.durationMs,
    delayMs: motionDocument.delayMs,
    tracks: motionDocument.tracks,
  };
}

/** The full run length: delay hold plus the animated span. */
export function motionTotalDurationMsV1(definition: MotionDefinitionV1): number {
  return definition.delayMs + definition.durationMs;
}

function sampleCubicBezierV1(
  easing: Extract<MotionEasingV1, { readonly kind: "cubic_bezier" }>,
  t: number,
): number {
  const x1 = easing.x1Permille / 1000;
  const y1 = easing.y1Permille / 1000;
  const x2 = easing.x2Permille / 1000;
  const y2 = easing.y2Permille / 1000;
  const sampleAxis = (a: number, b: number, u: number): number => {
    const inverted = 1 - u;
    return 3 * a * inverted * inverted * u + 3 * b * inverted * u * u + u * u * u;
  };
  const sampleAxisDerivative = (a: number, b: number, u: number): number => {
    const inverted = 1 - u;
    return 3 * a * inverted * inverted + 6 * (b - a) * inverted * u + 3 * (1 - b) * u * u;
  };
  // Solve x(u) = t with Newton-Raphson, falling back to bisection when the
  // derivative degenerates; both converge because x(u) is monotonic for
  // control points clamped to 0..1000 permille.
  let u = t;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const x = sampleAxis(x1, x2, u) - t;
    if (Math.abs(x) < 1e-6) return sampleAxis(y1, y2, u);
    const derivative = sampleAxisDerivative(x1, x2, u);
    if (Math.abs(derivative) < 1e-6) break;
    u -= x / derivative;
    u = Math.min(1, Math.max(0, u));
  }
  let lower = 0;
  let upper = 1;
  u = t;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const x = sampleAxis(x1, x2, u);
    if (Math.abs(x - t) < 1e-6) break;
    if (x < t) lower = u;
    else upper = u;
    u = (lower + upper) / 2;
  }
  return sampleAxis(y1, y2, u);
}

function evaluateMotionEasingV1(easing: MotionEasingV1 | undefined, t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  if (easing === undefined) return clamped;
  if (typeof easing === "string") {
    switch (easing) {
      case "linear":
        return clamped;
      case "ease_in":
        return clamped * clamped;
      case "ease_out":
        return 1 - (1 - clamped) * (1 - clamped);
      case "ease_in_out":
        return clamped * clamped * (3 - 2 * clamped);
      case "ease_in_cubic":
        return clamped * clamped * clamped;
      case "ease_out_cubic": {
        const inverted = 1 - clamped;
        return 1 - inverted * inverted * inverted;
      }
      case "ease_out_back": {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const shifted = clamped - 1;
        return 1 + c3 * shifted * shifted * shifted + c1 * shifted * shifted;
      }
      default: {
        const exhaustive: never = easing;
        throw new TypeError(`unknown motion easing ${String(exhaustive)}`);
      }
    }
  }
  return sampleCubicBezierV1(easing, clamped);
}

function sampleMotionTrackV1(track: MotionTrackV1, normalizedPermille: number): number {
  const keyframes = track.keyframes;
  const last = keyframes[keyframes.length - 1];
  if (last !== undefined && normalizedPermille >= last.atPermille) return last.value;
  let index = 0;
  while (
    index + 1 < keyframes.length &&
    (keyframes[index + 1]?.atPermille ?? Number.POSITIVE_INFINITY) <= normalizedPermille
  ) {
    index += 1;
  }
  const start = keyframes[index];
  const end = keyframes[index + 1];
  if (start === undefined) return 0;
  if (end === undefined) return start.value;
  const span = end.atPermille - start.atPermille;
  const linear = span <= 0 ? 1 : (normalizedPermille - start.atPermille) / span;
  const eased = evaluateMotionEasingV1(start.easing, linear);
  return Math.round(start.value + (end.value - start.value) * eased);
}

/**
 * Stepped sampling for the `frame` channel: the value of the last keyframe
 * at or before the normalized time, held until the next keyframe. No
 * interpolation, no easing — a frame index is content identity, not a
 * quantity.
 */
function sampleMotionTrackStepV1(track: MotionTrackV1, normalizedPermille: number): number {
  let value = track.keyframes[0]?.value ?? 0;
  for (const keyframe of track.keyframes) {
    if (keyframe.atPermille > normalizedPermille) break;
    value = keyframe.value;
  }
  return value;
}

/**
 * Pure sampling: the same definition and elapsed time always produce the
 * same overlay values, so players, editors, and tests share one math. Time
 * before the delay holds each track's first keyframe; time at or beyond
 * `delayMs + durationMs` holds the final keyframe.
 */
export function sampleMotionAtV1(
  definition: MotionDefinitionV1,
  elapsedMs: number,
): MotionSampleV1 {
  const local = elapsedMs - definition.delayMs;
  const normalizedPermille = definition.durationMs <= 0
    ? 1000
    : Math.min(1000, Math.max(0, (local / definition.durationMs) * 1000));
  let offsetX = 0;
  let offsetY = 0;
  let scalePermille = 1000;
  let opacityPermille = 1000;
  let frameIndex: number | null = null;
  for (const track of definition.tracks) {
    if (track.channel === "frame") {
      frameIndex = sampleMotionTrackStepV1(track, normalizedPermille);
      continue;
    }
    const value = sampleMotionTrackV1(track, normalizedPermille);
    switch (track.channel) {
      case "offsetX":
        offsetX = value;
        break;
      case "offsetY":
        offsetY = value;
        break;
      case "scalePermille":
        scalePermille = value;
        break;
      case "opacityPermille":
        opacityPermille = value;
        break;
      default: {
        const exhaustive: never = track.channel;
        throw new TypeError(`unknown motion channel ${String(exhaustive)}`);
      }
    }
  }
  return { offsetX, offsetY, scalePermille, opacityPermille, frameIndex };
}
