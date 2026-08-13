// SPDX-License-Identifier: MIT
import type { MotionDefinitionV1 } from "./motion.ts";
import {
  motionDefinitionFromDocumentV1,
  motionTotalDurationMsV1,
  parseMotionDefinitionV1,
  parseMotionDocumentV1,
} from "./motion.ts";
import { dataFailure, readExactRecord } from "./presentation-data.ts";
import type { StageLayerIdV1 } from "./semantic-stage.ts";
import type { StageRenderEntryV1 } from "./stage-render-target.ts";

/**
 * Semantic Stage V1 transition vocabulary. A transition definition is plain,
 * versioned, validated data authored by the Story; it describes how one
 * old-target-to-new-target edge is presented. Definitions never enter the
 * saveable SemanticStageState, and playing them never changes gameplay
 * State: execution belongs to the UI Stage Reconciler and PresentationRun.
 */

export type StageTransitionKindV1 = "cut" | "crossfade" | "slide" | "motion";

/** How player input is treated while the transition is active. */
export type StageTransitionInputPolicyV1 = "block" | "target_active" | "skip_to_end";

/** What happens to an active run when the stage retargets mid-flight. */
export type StageTransitionInterruptionV1 = "settle_and_retarget" | "cancel_to_target";

export type StageTransitionEasingV1 = "linear" | "ease_in_out";

export type StageTransitionReducedMotionV1 = { readonly kind: "settle" } | {
  readonly kind: "fallback";
  readonly transitionId: string;
};

export type StageTransitionReadinessV1 = { readonly kind: "immediate" } | {
  readonly kind: "wait_for_assets";
  readonly timeoutMs: number;
};

export interface StageTransitionDefinitionV1 {
  readonly transitionId: string;
  readonly kind: StageTransitionKindV1;
  readonly durationMs: number;
  readonly easing: StageTransitionEasingV1;
  readonly inputPolicy: StageTransitionInputPolicyV1;
  readonly interruption: StageTransitionInterruptionV1;
  readonly reducedMotion: StageTransitionReducedMotionV1;
  readonly readiness: StageTransitionReadinessV1;
  /** Emit a presentation completion acknowledgment when the run finishes. */
  readonly acknowledge: boolean;
  /** Slide-only: the logical-canvas offset entries travel from/to. */
  readonly slide: { readonly x: number; readonly y: number } | null;
  /**
   * Motion-only keyframe payload, present exactly when `kind` is "motion".
   * Its per-segment easings own the curve, so `easing` stays "linear" and
   * `durationMs` equals the motion's delay plus animated span. Authoring
   * flows through `motionStageTransitionV1`, which derives both.
   */
  readonly motion?: MotionDefinitionV1;
}

const transitionIdPatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;

function parseTransitionIdV1(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !transitionIdPatternV1.test(value) ||
    value.length < 3 ||
    value.length > 96
  ) {
    return dataFailure(path, "transition_id_invalid");
  }
  return value;
}

function parseDurationMsV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 60_000) {
    return dataFailure(path, "transition_duration_invalid");
  }
  return value;
}

function parseEnumV1<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  path: string,
  reason: string,
): TValue {
  if (typeof value !== "string" || !allowed.includes(value as TValue)) {
    return dataFailure(path, reason);
  }
  return value as TValue;
}

function parseReducedMotionV1(value: unknown, path: string): StageTransitionReducedMotionV1 {
  if (value === null || typeof value !== "object") return dataFailure(path, "object_expected");
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === "settle") {
    readExactRecord(value, ["kind"], path);
    return Object.freeze({ kind });
  }
  if (kind === "fallback") {
    const record = readExactRecord(value, ["kind", "transitionId"], path);
    return Object.freeze({
      kind,
      transitionId: parseTransitionIdV1(record.transitionId, `${path}/transitionId`),
    });
  }
  return dataFailure(`${path}/kind`, "reduced_motion_kind_invalid");
}

function parseReadinessV1(value: unknown, path: string): StageTransitionReadinessV1 {
  if (value === null || typeof value !== "object") return dataFailure(path, "object_expected");
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === "immediate") {
    readExactRecord(value, ["kind"], path);
    return Object.freeze({ kind });
  }
  if (kind === "wait_for_assets") {
    const record = readExactRecord(value, ["kind", "timeoutMs"], path);
    return Object.freeze({
      kind,
      timeoutMs: parseDurationMsV1(record.timeoutMs, `${path}/timeoutMs`),
    });
  }
  return dataFailure(`${path}/kind`, "readiness_kind_invalid");
}

function parseSlideOffsetV1(
  value: unknown,
  path: string,
): { readonly x: number; readonly y: number } | null {
  if (value === null) return null;
  const record = readExactRecord(value, ["x", "y"], path);
  const parseOffset = (candidate: unknown, offsetPath: string): number => {
    if (
      typeof candidate !== "number" ||
      !Number.isSafeInteger(candidate) ||
      Math.abs(candidate) > 1_000_000
    ) {
      return dataFailure(offsetPath, "slide_offset_invalid");
    }
    return candidate;
  };
  return Object.freeze({
    x: parseOffset(record.x, `${path}/x`),
    y: parseOffset(record.y, `${path}/y`),
  });
}

const baseTransitionKeysV1 = [
  "transitionId",
  "kind",
  "durationMs",
  "easing",
  "inputPolicy",
  "interruption",
  "reducedMotion",
  "readiness",
  "acknowledge",
  "slide",
] as const;

export function parseStageTransitionDefinitionV1(
  value: unknown,
  path = "/transition",
): StageTransitionDefinitionV1 {
  // The "motion" kind carries an extra payload key; every other kind keeps
  // the exact legacy shape, so existing authored literals stay valid.
  const isMotionKind = value !== null && typeof value === "object" && !Array.isArray(value) &&
    (value as { readonly kind?: unknown }).kind === "motion";
  const record = readExactRecord(
    value,
    isMotionKind ? [...baseTransitionKeysV1, "motion"] : baseTransitionKeysV1,
    path,
  );
  const kind = parseEnumV1(
    record.kind,
    ["cut", "crossfade", "slide", "motion"],
    `${path}/kind`,
    "transition_kind_invalid",
  );
  const slide = parseSlideOffsetV1(record.slide, `${path}/slide`);
  if (kind === "slide" && slide === null) {
    return dataFailure(`${path}/slide`, "slide_offset_required");
  }
  if (typeof record.acknowledge !== "boolean") {
    return dataFailure(`${path}/acknowledge`, "boolean_expected");
  }
  const common = {
    transitionId: parseTransitionIdV1(record.transitionId, `${path}/transitionId`),
    kind,
    durationMs: parseDurationMsV1(record.durationMs, `${path}/durationMs`),
    easing: parseEnumV1(
      record.easing,
      ["linear", "ease_in_out"],
      `${path}/easing`,
      "transition_easing_invalid",
    ),
    inputPolicy: parseEnumV1(
      record.inputPolicy,
      ["block", "target_active", "skip_to_end"],
      `${path}/inputPolicy`,
      "input_policy_invalid",
    ),
    interruption: parseEnumV1(
      record.interruption,
      ["settle_and_retarget", "cancel_to_target"],
      `${path}/interruption`,
      "interruption_invalid",
    ),
    reducedMotion: parseReducedMotionV1(record.reducedMotion, `${path}/reducedMotion`),
    readiness: parseReadinessV1(record.readiness, `${path}/readiness`),
    acknowledge: record.acknowledge,
    slide,
  };
  if (kind !== "motion") return Object.freeze(common);
  const motion = parseMotionDefinitionV1(record.motion, `${path}/motion`);
  if (slide !== null) {
    return dataFailure(`${path}/slide`, "motion_slide_forbidden");
  }
  if (common.easing !== "linear") {
    return dataFailure(`${path}/easing`, "motion_easing_must_be_linear");
  }
  if (common.durationMs !== motionTotalDurationMsV1(motion)) {
    return dataFailure(`${path}/durationMs`, "motion_duration_mismatch");
  }
  return Object.freeze({ ...common, motion });
}

export interface MotionStageTransitionInputV1 {
  readonly transitionId: string;
  /**
   * A `sillymaker.motion` Document: the raw `*.motion.json` import value or
   * an already-parsed `MotionDocumentV1`; admission validates either way.
   */
  readonly motion: unknown;
  readonly inputPolicy?: StageTransitionInputPolicyV1;
  readonly interruption?: StageTransitionInterruptionV1;
  readonly reducedMotion?: StageTransitionReducedMotionV1;
  readonly readiness?: StageTransitionReadinessV1;
  readonly acknowledge?: boolean;
}

/**
 * Binds a motion Document to one stage edge as a `kind: "motion"` transition.
 * The Document owns the curve and timing (duration derives from it, easing
 * stays per-segment inside the keyframes); the transition owns edge behavior
 * (input policy, interruption, reduced motion, readiness, acknowledgment).
 */
export function motionStageTransitionV1(
  input: MotionStageTransitionInputV1,
): StageTransitionDefinitionV1 {
  const motionDocument = parseMotionDocumentV1(input.motion, "/motion");
  const motion = motionDefinitionFromDocumentV1(motionDocument);
  return parseStageTransitionDefinitionV1({
    transitionId: input.transitionId,
    kind: "motion",
    durationMs: motionTotalDurationMsV1(motion),
    easing: "linear",
    inputPolicy: input.inputPolicy ?? "target_active",
    interruption: input.interruption ?? "settle_and_retarget",
    reducedMotion: input.reducedMotion ?? { kind: "settle" },
    readiness: input.readiness ?? { kind: "immediate" },
    acknowledge: input.acknowledge ?? false,
    slide: null,
    motion,
  });
}

/**
 * One observed stage change on the old-target-to-new-target edge, in
 * priority order: content replace wins over appearance, appearance over
 * placement. The catalog decides which transition (if any) presents it.
 */
export interface StageTargetChangeV1 {
  readonly kind: "enter" | "exit" | "replace" | "appearance" | "move";
  readonly layerId: StageLayerIdV1;
  readonly entryKey: string;
  readonly previous: StageRenderEntryV1 | null;
  readonly next: StageRenderEntryV1 | null;
}

/**
 * The Story transition catalog: a pure resolution from one stage change to
 * a transition definition, or null for an instant cut. Resolution must be
 * deterministic for the same change so reconciliation stays reproducible.
 */
export interface StageTransitionCatalogV1 {
  resolveTransition(change: StageTargetChangeV1): StageTransitionDefinitionV1 | null;
  /** Resolves reduced-motion fallback references; omit to always settle. */
  resolveTransitionById?(transitionId: string): StageTransitionDefinitionV1 | null;
}
