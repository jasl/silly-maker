// SPDX-License-Identifier: MIT
import { dataFailure, readArray, readExactRecord } from "./presentation-data.ts";
import type { StrictJsonObjectV1 } from "./strict-json.ts";

/**
 * PendingInteraction V1: the explicit, saveable interaction boundary a
 * Narrative runner stops at after executing pure control nodes. The contract
 * lives in Base; instances belong to Story authoritative State and decide
 * the currently allowed gameplay input and the Save recovery point.
 *
 * Every interaction separates three identities: the author-stable
 * `definitionId`, the author-controlled `seenRevision` for seen/text
 * migration, and the per-entry-unique `occurrenceId`. Re-entering the same
 * definition through loops, calls, or rollback produces a new occurrence;
 * resolutions must present the expected occurrence and are re-checked at
 * the session queue front, so stale UI, double activation, autoplay timers,
 * and late transition or voice callbacks cannot resolve a changed
 * interaction. Renderer promises and callbacks never enter State or Saves.
 */

const interactionIdPatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;

function parseInteractionIdV1(value: unknown, path: string, reason: string): string {
  if (
    typeof value !== "string" ||
    !interactionIdPatternV1.test(value) ||
    value.length < 3 ||
    value.length > 96
  ) {
    return dataFailure(path, reason);
  }
  return value;
}

/** Deterministic occurrence identity derived from a Story-owned sequence. */
export function interactionOccurrenceIdV1(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new TypeError("interaction occurrence sequence must be a positive integer");
  }
  return `interaction-occurrence.${String(sequence)}`;
}

const occurrenceIdPatternV1 = /^interaction-occurrence\.[1-9][0-9]*$/u;

export function parseInteractionOccurrenceIdV1(value: unknown, path = "/occurrenceId"): string {
  if (typeof value !== "string" || !occurrenceIdPatternV1.test(value) || value.length > 96) {
    return dataFailure(path, "interaction_occurrence_invalid");
  }
  return value;
}

function parseSeenRevisionV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    return dataFailure(path, "seen_revision_invalid");
  }
  return value;
}

function parsePositiveDurationMsV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 600_000) {
    return dataFailure(path, "duration_invalid");
  }
  return value;
}

function parseBooleanV1(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") return dataFailure(path, "boolean_expected");
  return value;
}

/**
 * Bounded plain-JSON validation for custom interaction params and payloads.
 * Values stay canonical-JSON safe: plain objects/arrays, strings, booleans,
 * null, and safe integers only.
 */
export function parseInteractionJsonObjectV1(value: unknown, path = "/params"): StrictJsonObjectV1 {
  const parseValue = (candidate: unknown, valuePath: string, depth: number): unknown => {
    if (depth > 8) return dataFailure(valuePath, "interaction_json_too_deep");
    if (candidate === null || typeof candidate === "boolean") return candidate;
    if (typeof candidate === "number") {
      if (!Number.isSafeInteger(candidate)) {
        return dataFailure(valuePath, "interaction_json_integer_expected");
      }
      return candidate;
    }
    if (typeof candidate === "string") {
      if (candidate.length > 1024) {
        return dataFailure(valuePath, "interaction_json_string_too_long");
      }
      return candidate;
    }
    if (Array.isArray(candidate)) {
      const items = readArray(candidate, valuePath);
      if (items.length > 64) return dataFailure(valuePath, "interaction_json_too_large");
      return Object.freeze(
        items.map((item, index) => parseValue(item, `${valuePath}/${String(index)}`, depth + 1)),
      );
    }
    if (typeof candidate === "object" && Object.getPrototypeOf(candidate) === Object.prototype) {
      const keys = Object.keys(candidate);
      if (keys.length > 64) return dataFailure(valuePath, "interaction_json_too_large");
      const result: Record<string, unknown> = {};
      for (const key of keys.toSorted()) {
        if (key.length > 96) return dataFailure(valuePath, "interaction_json_key_too_long");
        result[key] = parseValue(
          (candidate as Record<string, unknown>)[key],
          `${valuePath}/${key}`,
          depth + 1,
        );
      }
      return Object.freeze(result);
    }
    return dataFailure(valuePath, "interaction_json_value_invalid");
  };

  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "object_expected");
  }
  return parseValue(value, path, 0) as StrictJsonObjectV1;
}

export interface PendingInteractionBaseV1 {
  readonly definitionId: string;
  readonly seenRevision: number;
  readonly occurrenceId: string;
}

export interface InteractionChoiceOptionV1 {
  readonly choiceId: string;
  readonly textId: string;
}

export type PendingInteractionV1 =
  | (PendingInteractionBaseV1 & {
    readonly kind: "say";
    readonly speakerTextId: string | null;
    readonly textId: string;
    readonly advancePolicy: "confirm" | "auto";
  })
  | (PendingInteractionBaseV1 & {
    readonly kind: "choice";
    readonly promptTextId: string;
    readonly options: readonly InteractionChoiceOptionV1[];
  })
  | (PendingInteractionBaseV1 & {
    readonly kind: "pause";
    readonly durationMs: number;
    readonly skippable: boolean;
  })
  | (PendingInteractionBaseV1 & {
    readonly kind: "presentation_barrier";
    readonly expectedTransitionId: string;
    readonly loadRecovery: "replay" | "settle";
  })
  | (PendingInteractionBaseV1 & {
    readonly kind: "custom";
    readonly surfaceId: string;
    readonly params: StrictJsonObjectV1;
  });

export type InteractionResolutionV1 =
  | { readonly kind: "advance" }
  | { readonly kind: "choose"; readonly choiceId: string }
  | { readonly kind: "resume" }
  | { readonly kind: "barrier_completed"; readonly transitionId: string }
  | { readonly kind: "custom"; readonly payload: StrictJsonObjectV1 };

const interactionBaseKeysV1 = ["kind", "definitionId", "seenRevision", "occurrenceId"] as const;

function parseInteractionBaseV1(
  record: Record<string, unknown>,
  path: string,
): PendingInteractionBaseV1 {
  return {
    definitionId: parseInteractionIdV1(
      record.definitionId,
      `${path}/definitionId`,
      "interaction_definition_invalid",
    ),
    seenRevision: parseSeenRevisionV1(record.seenRevision, `${path}/seenRevision`),
    occurrenceId: parseInteractionOccurrenceIdV1(record.occurrenceId, `${path}/occurrenceId`),
  };
}

export function parsePendingInteractionV1(value: unknown, path = "/pending"): PendingInteractionV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "object_expected");
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  switch (kind) {
    case "say": {
      const record = readExactRecord(
        value,
        [...interactionBaseKeysV1, "speakerTextId", "textId", "advancePolicy"],
        path,
      );
      if (record.advancePolicy !== "confirm" && record.advancePolicy !== "auto") {
        return dataFailure(`${path}/advancePolicy`, "advance_policy_invalid");
      }
      return Object.freeze({
        kind,
        ...parseInteractionBaseV1(record, path),
        speakerTextId: record.speakerTextId === null ? null : parseInteractionIdV1(
          record.speakerTextId,
          `${path}/speakerTextId`,
          "text_id_invalid",
        ),
        textId: parseInteractionIdV1(record.textId, `${path}/textId`, "text_id_invalid"),
        advancePolicy: record.advancePolicy,
      });
    }
    case "choice": {
      const record = readExactRecord(
        value,
        [...interactionBaseKeysV1, "promptTextId", "options"],
        path,
      );
      const optionsValue = readArray(record.options, `${path}/options`);
      if (optionsValue.length < 1 || optionsValue.length > 16) {
        return dataFailure(`${path}/options`, "choice_options_invalid");
      }
      const seen = new Set<string>();
      const options = optionsValue.map((option, index) => {
        const optionPath = `${path}/options/${String(index)}`;
        const optionRecord = readExactRecord(option, ["choiceId", "textId"], optionPath);
        const choiceId = parseInteractionIdV1(
          optionRecord.choiceId,
          `${optionPath}/choiceId`,
          "choice_id_invalid",
        );
        if (seen.has(choiceId)) return dataFailure(`${optionPath}/choiceId`, "choice_id_duplicate");
        seen.add(choiceId);
        return Object.freeze({
          choiceId,
          textId: parseInteractionIdV1(
            optionRecord.textId,
            `${optionPath}/textId`,
            "text_id_invalid",
          ),
        });
      });
      return Object.freeze({
        kind,
        ...parseInteractionBaseV1(record, path),
        promptTextId: parseInteractionIdV1(
          record.promptTextId,
          `${path}/promptTextId`,
          "text_id_invalid",
        ),
        options: Object.freeze(options),
      });
    }
    case "pause": {
      const record = readExactRecord(
        value,
        [...interactionBaseKeysV1, "durationMs", "skippable"],
        path,
      );
      return Object.freeze({
        kind,
        ...parseInteractionBaseV1(record, path),
        durationMs: parsePositiveDurationMsV1(record.durationMs, `${path}/durationMs`),
        skippable: parseBooleanV1(record.skippable, `${path}/skippable`),
      });
    }
    case "presentation_barrier": {
      const record = readExactRecord(
        value,
        [...interactionBaseKeysV1, "expectedTransitionId", "loadRecovery"],
        path,
      );
      if (record.loadRecovery !== "replay" && record.loadRecovery !== "settle") {
        return dataFailure(`${path}/loadRecovery`, "load_recovery_invalid");
      }
      return Object.freeze({
        kind,
        ...parseInteractionBaseV1(record, path),
        expectedTransitionId: parseInteractionIdV1(
          record.expectedTransitionId,
          `${path}/expectedTransitionId`,
          "transition_id_invalid",
        ),
        loadRecovery: record.loadRecovery,
      });
    }
    case "custom": {
      const record = readExactRecord(
        value,
        [...interactionBaseKeysV1, "surfaceId", "params"],
        path,
      );
      return Object.freeze({
        kind,
        ...parseInteractionBaseV1(record, path),
        surfaceId: parseInteractionIdV1(
          record.surfaceId,
          `${path}/surfaceId`,
          "surface_id_invalid",
        ),
        params: parseInteractionJsonObjectV1(record.params, `${path}/params`),
      });
    }
    default:
      return dataFailure(`${path}/kind`, "interaction_kind_invalid");
  }
}

export function parseInteractionResolutionV1(
  value: unknown,
  path = "/resolution",
): InteractionResolutionV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "object_expected");
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  switch (kind) {
    case "advance":
    case "resume": {
      readExactRecord(value, ["kind"], path);
      return Object.freeze({ kind });
    }
    case "choose": {
      const record = readExactRecord(value, ["kind", "choiceId"], path);
      return Object.freeze({
        kind,
        choiceId: parseInteractionIdV1(record.choiceId, `${path}/choiceId`, "choice_id_invalid"),
      });
    }
    case "barrier_completed": {
      const record = readExactRecord(value, ["kind", "transitionId"], path);
      return Object.freeze({
        kind,
        transitionId: parseInteractionIdV1(
          record.transitionId,
          `${path}/transitionId`,
          "transition_id_invalid",
        ),
      });
    }
    case "custom": {
      const record = readExactRecord(value, ["kind", "payload"], path);
      return Object.freeze({
        kind,
        payload: parseInteractionJsonObjectV1(record.payload, `${path}/payload`),
      });
    }
    default:
      return dataFailure(`${path}/kind`, "resolution_kind_invalid");
  }
}

export type InteractionRejectionCodeV1 =
  | "interaction.none_pending"
  | "interaction.occurrence_mismatch"
  | "interaction.kind_mismatch"
  | "interaction.choice_unknown"
  | "interaction.choice_disabled"
  | "interaction.barrier_mismatch"
  | "interaction.payload_invalid";

export type InteractionResolutionOutcomeV1 =
  | { readonly kind: "accepted" }
  | { readonly kind: "rejected"; readonly code: InteractionRejectionCodeV1 };

/**
 * Story-provided context so the exact same evaluator serves the action
 * catalog, preview, and queue-front dispatch: choice availability and
 * custom payload validation are re-checked at every use.
 */
export interface InteractionResolutionContextV1 {
  isChoiceEnabled?(choiceId: string): boolean;
  isCustomPayloadValid?(surfaceId: string, payload: StrictJsonObjectV1): boolean;
}

const resolutionKindForInteractionV1: Readonly<
  Record<PendingInteractionV1["kind"], InteractionResolutionV1["kind"]>
> = Object.freeze({
  say: "advance",
  choice: "choose",
  pause: "resume",
  presentation_barrier: "barrier_completed",
  custom: "custom",
});

/**
 * The single resolution evaluator. It never mutates anything: callers use
 * the outcome to reject a command or to let the Narrative runner continue.
 */
export function evaluateInteractionResolutionV1(
  pending: PendingInteractionV1 | null,
  expectedOccurrenceId: string,
  resolution: InteractionResolutionV1,
  context: InteractionResolutionContextV1 = {},
): InteractionResolutionOutcomeV1 {
  const rejected = (code: InteractionRejectionCodeV1): InteractionResolutionOutcomeV1 =>
    Object.freeze({ kind: "rejected", code });

  if (pending === null) return rejected("interaction.none_pending");
  if (pending.occurrenceId !== expectedOccurrenceId) {
    return rejected("interaction.occurrence_mismatch");
  }
  if (resolutionKindForInteractionV1[pending.kind] !== resolution.kind) {
    return rejected("interaction.kind_mismatch");
  }

  if (pending.kind === "choice" && resolution.kind === "choose") {
    if (!pending.options.some((option) => option.choiceId === resolution.choiceId)) {
      return rejected("interaction.choice_unknown");
    }
    if (context.isChoiceEnabled !== undefined && !context.isChoiceEnabled(resolution.choiceId)) {
      return rejected("interaction.choice_disabled");
    }
  }
  if (pending.kind === "presentation_barrier" && resolution.kind === "barrier_completed") {
    if (pending.expectedTransitionId !== resolution.transitionId) {
      return rejected("interaction.barrier_mismatch");
    }
  }
  if (pending.kind === "custom" && resolution.kind === "custom") {
    if (
      context.isCustomPayloadValid !== undefined &&
      !context.isCustomPayloadValid(pending.surfaceId, resolution.payload)
    ) {
      return rejected("interaction.payload_invalid");
    }
  }
  return Object.freeze({ kind: "accepted" });
}
