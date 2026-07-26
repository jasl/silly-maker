// SPDX-License-Identifier: MIT
import { dataFailure, readExactRecord } from "./presentation-data.js";
import type { StageLayerIdV2 } from "./semantic-stage.js";
import type { StageRenderEntryV2 } from "./stage-render-target.js";

/**
 * Semantic Stage V2 transition vocabulary. A transition definition is plain,
 * versioned, validated data authored by the Story; it describes how one
 * old-target-to-new-target edge is presented. Definitions never enter the
 * saveable SemanticStageState, and playing them never changes gameplay
 * State: execution belongs to the UI Stage Reconciler and PresentationRun.
 */

export type StageTransitionKindV2 = "cut" | "crossfade" | "slide";

/** How player input is treated while the transition is active. */
export type StageTransitionInputPolicyV2 = "block" | "target_active" | "skip_to_end";

/** What happens to an active run when the stage retargets mid-flight. */
export type StageTransitionInterruptionV2 = "settle_and_retarget" | "cancel_to_target";

export type StageTransitionEasingV2 = "linear" | "ease_in_out";

export type StageTransitionReducedMotionV2 =
  { readonly kind: "settle" } | { readonly kind: "fallback"; readonly transitionId: string };

export type StageTransitionReadinessV2 =
  { readonly kind: "immediate" } | { readonly kind: "wait_for_assets"; readonly timeoutMs: number };

export interface StageTransitionDefinitionV2 {
  readonly transitionId: string;
  readonly kind: StageTransitionKindV2;
  readonly durationMs: number;
  readonly easing: StageTransitionEasingV2;
  readonly inputPolicy: StageTransitionInputPolicyV2;
  readonly interruption: StageTransitionInterruptionV2;
  readonly reducedMotion: StageTransitionReducedMotionV2;
  readonly readiness: StageTransitionReadinessV2;
  /** Emit a presentation completion acknowledgment when the run finishes. */
  readonly acknowledge: boolean;
  /** Slide-only: the logical-canvas offset entries travel from/to. */
  readonly slide: { readonly x: number; readonly y: number } | null;
}

const transitionIdPatternV2 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;

function parseTransitionIdV2(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !transitionIdPatternV2.test(value) ||
    value.length < 3 ||
    value.length > 96
  ) {
    return dataFailure(path, "transition_id_invalid");
  }
  return value;
}

function parseDurationMsV2(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 60_000) {
    return dataFailure(path, "transition_duration_invalid");
  }
  return value;
}

function parseEnumV2<TValue extends string>(
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

function parseReducedMotionV2(value: unknown, path: string): StageTransitionReducedMotionV2 {
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
      transitionId: parseTransitionIdV2(record.transitionId, `${path}/transitionId`),
    });
  }
  return dataFailure(`${path}/kind`, "reduced_motion_kind_invalid");
}

function parseReadinessV2(value: unknown, path: string): StageTransitionReadinessV2 {
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
      timeoutMs: parseDurationMsV2(record.timeoutMs, `${path}/timeoutMs`),
    });
  }
  return dataFailure(`${path}/kind`, "readiness_kind_invalid");
}

function parseSlideOffsetV2(
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

export function parseStageTransitionDefinitionV2(
  value: unknown,
  path = "/transition",
): StageTransitionDefinitionV2 {
  const record = readExactRecord(
    value,
    [
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
    ],
    path,
  );
  const kind = parseEnumV2(
    record.kind,
    ["cut", "crossfade", "slide"],
    `${path}/kind`,
    "transition_kind_invalid",
  );
  const slide = parseSlideOffsetV2(record.slide, `${path}/slide`);
  if (kind === "slide" && slide === null) {
    return dataFailure(`${path}/slide`, "slide_offset_required");
  }
  if (typeof record.acknowledge !== "boolean") {
    return dataFailure(`${path}/acknowledge`, "boolean_expected");
  }
  return Object.freeze({
    transitionId: parseTransitionIdV2(record.transitionId, `${path}/transitionId`),
    kind,
    durationMs: parseDurationMsV2(record.durationMs, `${path}/durationMs`),
    easing: parseEnumV2(
      record.easing,
      ["linear", "ease_in_out"],
      `${path}/easing`,
      "transition_easing_invalid",
    ),
    inputPolicy: parseEnumV2(
      record.inputPolicy,
      ["block", "target_active", "skip_to_end"],
      `${path}/inputPolicy`,
      "input_policy_invalid",
    ),
    interruption: parseEnumV2(
      record.interruption,
      ["settle_and_retarget", "cancel_to_target"],
      `${path}/interruption`,
      "interruption_invalid",
    ),
    reducedMotion: parseReducedMotionV2(record.reducedMotion, `${path}/reducedMotion`),
    readiness: parseReadinessV2(record.readiness, `${path}/readiness`),
    acknowledge: record.acknowledge,
    slide,
  });
}

/**
 * One observed stage change on the old-target-to-new-target edge, in
 * priority order: content replace wins over appearance, appearance over
 * placement. The catalog decides which transition (if any) presents it.
 */
export interface StageTargetChangeV2 {
  readonly kind: "enter" | "exit" | "replace" | "appearance" | "move";
  readonly layerId: StageLayerIdV2;
  readonly entryKey: string;
  readonly previous: StageRenderEntryV2 | null;
  readonly next: StageRenderEntryV2 | null;
}

/**
 * The Story transition catalog: a pure resolution from one stage change to
 * a transition definition, or null for an instant cut. Resolution must be
 * deterministic for the same change so reconciliation stays reproducible.
 */
export interface StageTransitionCatalogV2 {
  resolveTransition(change: StageTargetChangeV2): StageTransitionDefinitionV2 | null;
  /** Resolves reduced-motion fallback references; omit to always settle. */
  resolveTransitionById?(transitionId: string): StageTransitionDefinitionV2 | null;
}
