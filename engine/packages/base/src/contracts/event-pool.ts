// SPDX-License-Identifier: MIT
import type { RuleRngV1 } from "./rng.ts";

/**
 * The event pool: conditional weighted draws for schedule/simulation
 * loops ("state × slot → filter candidates → weighted random → run").
 * Conditions are restricted serializable data — never executable
 * expressions — so tables can validate them at parse time; draws consume
 * the transactional RNG so replay and rollback reproduce them; every
 * draw returns JSON-safe explanation data (candidates, eligibility,
 * weights, roll, winner) for facts and DevDock; a debug force picks a
 * specific eligible candidate without spending a draw.
 *
 * Event content (text, effects, narrative entries) stays outside this
 * contract: Stories map eventIds to content-database rows. Cooldowns and
 * seen-tracking are module state; pre-filter candidates before drawing.
 */

export interface EventPoolContextV1 {
  /** Named numeric facts, e.g. `cat.trust`, `calendar.week`. */
  readonly numbers: Readonly<Record<string, number>>;
  /** A sorted, de-duplicated string set, e.g. story flags. */
  readonly flags: readonly string[];
  /** Named labels, e.g. `slot: "dusk"`. */
  readonly labels: Readonly<Record<string, string>>;
}

export type EventConditionV1 =
  | {
    readonly kind: "number";
    readonly key: string;
    readonly op: "eq" | "ne" | "lt" | "lte" | "gt" | "gte";
    readonly value: number;
  }
  | { readonly kind: "flag"; readonly flag: string; readonly present: boolean }
  | { readonly kind: "label"; readonly key: string; readonly anyOf: readonly string[] }
  | { readonly kind: "all"; readonly conditions: readonly EventConditionV1[] }
  | { readonly kind: "any"; readonly conditions: readonly EventConditionV1[] }
  | { readonly kind: "not"; readonly condition: EventConditionV1 };

export class EventPoolErrorV1 extends TypeError {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string) {
    super(`${code} at ${path}`);
    this.name = "EventPoolErrorV1";
    this.code = code;
    this.path = path;
  }
}

const maxConditionDepthV1 = 8;
const maxConditionBranchesV1 = 32;
const numberOpsV1 = new Set(["eq", "ne", "lt", "lte", "gt", "gte"]);

function fail(code: string, path: string): never {
  throw new EventPoolErrorV1(code, path);
}

function pointerSegmentV1(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function admitContextNumbersV1(context: EventPoolContextV1): ReadonlyMap<string, number> {
  const admitted = new Map<string, number>();
  for (const [key, value] of Object.entries(context.numbers)) {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      fail("event_pool.context_number_invalid", `/context/numbers/${pointerSegmentV1(key)}`);
    }
    admitted.set(key, value);
  }
  return admitted;
}

/** Validates one condition tree: shape, depth (≤8), branches (≤32 per node). */
export function parseEventConditionV1(value: unknown, path = "/condition"): EventConditionV1 {
  return parseConditionAtV1(value, path, 1);
}

function parseConditionAtV1(value: unknown, path: string, depth: number): EventConditionV1 {
  if (depth > maxConditionDepthV1) fail("event_pool.condition_too_deep", path);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("event_pool.condition_invalid", path);
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).toSorted().join("\u0000");
  switch (record.kind) {
    case "number": {
      if (
        keys !== "key\u0000kind\u0000op\u0000value" ||
        typeof record.key !== "string" ||
        record.key === "" ||
        typeof record.op !== "string" ||
        !numberOpsV1.has(record.op) ||
        typeof record.value !== "number" ||
        !Number.isSafeInteger(record.value) ||
        Object.is(record.value, -0)
      ) {
        fail("event_pool.condition_invalid", path);
      }
      return Object.freeze({
        kind: "number",
        key: record.key,
        op: record.op as "eq" | "ne" | "lt" | "lte" | "gt" | "gte",
        value: record.value,
      });
    }
    case "flag": {
      if (
        keys !== "flag\u0000kind\u0000present" ||
        typeof record.flag !== "string" ||
        record.flag === "" ||
        typeof record.present !== "boolean"
      ) {
        fail("event_pool.condition_invalid", path);
      }
      return Object.freeze({ kind: "flag", flag: record.flag, present: record.present });
    }
    case "label": {
      if (
        keys !== "anyOf\u0000key\u0000kind" ||
        typeof record.key !== "string" ||
        record.key === "" ||
        !Array.isArray(record.anyOf) ||
        record.anyOf.length === 0 ||
        record.anyOf.length > maxConditionBranchesV1 ||
        !record.anyOf.every((entry) => typeof entry === "string" && entry !== "")
      ) {
        fail("event_pool.condition_invalid", path);
      }
      return Object.freeze({
        kind: "label",
        key: record.key,
        anyOf: Object.freeze([...(record.anyOf as string[])]),
      });
    }
    case "all":
    case "any": {
      if (keys !== "conditions\u0000kind" || !Array.isArray(record.conditions)) {
        fail("event_pool.condition_invalid", path);
      }
      const conditions = record.conditions as unknown[];
      if (conditions.length === 0 || conditions.length > maxConditionBranchesV1) {
        fail("event_pool.condition_branches", path);
      }
      return Object.freeze({
        kind: record.kind,
        conditions: Object.freeze(
          conditions.map((child, index) =>
            parseConditionAtV1(child, `${path}/${String(index)}`, depth + 1)
          ),
        ),
      });
    }
    case "not": {
      if (keys !== "condition\u0000kind") fail("event_pool.condition_invalid", path);
      return Object.freeze({
        kind: "not",
        condition: parseConditionAtV1(record.condition, `${path}/not`, depth + 1),
      });
    }
    default:
      return fail("event_pool.condition_invalid", path);
  }
}

/** Pure evaluation; missing number/label keys evaluate to false, not throw. */
export function evaluateEventConditionV1(
  condition: EventConditionV1,
  context: EventPoolContextV1,
): boolean {
  const admittedNumbers = admitContextNumbersV1(context);
  return evaluateAdmittedEventConditionV1(condition, context, admittedNumbers);
}

function evaluateAdmittedEventConditionV1(
  condition: EventConditionV1,
  context: EventPoolContextV1,
  admittedNumbers: ReadonlyMap<string, number>,
): boolean {
  switch (condition.kind) {
    case "number": {
      const actual = admittedNumbers.get(condition.key);
      if (actual === undefined) return false;
      switch (condition.op) {
        case "eq":
          return actual === condition.value;
        case "ne":
          return actual !== condition.value;
        case "lt":
          return actual < condition.value;
        case "lte":
          return actual <= condition.value;
        case "gt":
          return actual > condition.value;
        case "gte":
          return actual >= condition.value;
        default: {
          const exhaustive: never = condition.op;
          throw new TypeError(`unknown op ${String(exhaustive)}`);
        }
      }
    }
    case "flag":
      return context.flags.includes(condition.flag) === condition.present;
    case "label": {
      const actual = context.labels[condition.key];
      return actual !== undefined && condition.anyOf.includes(actual);
    }
    case "all":
      return condition.conditions.every((child) =>
        evaluateAdmittedEventConditionV1(child, context, admittedNumbers)
      );
    case "any":
      return condition.conditions.some((child) =>
        evaluateAdmittedEventConditionV1(child, context, admittedNumbers)
      );
    case "not":
      return !evaluateAdmittedEventConditionV1(condition.condition, context, admittedNumbers);
    default: {
      const exhaustive: never = condition;
      throw new TypeError(`unknown condition ${String(exhaustive)}`);
    }
  }
}

export interface EventPoolCandidateV1 {
  readonly eventId: string;
  /** A positive safe integer; relative probability among eligible candidates. */
  readonly weight: number;
  /** null is always eligible. */
  readonly condition: EventConditionV1 | null;
}

/** JSON-safe draw explanation for facts, diagnostics, and DevDock. */
export interface EventPoolDrawExplanationV1 {
  readonly considered: number;
  readonly eligible: readonly { readonly eventId: string; readonly weight: number }[];
  readonly totalWeight: number;
  /** null when the pool was empty or the pick was forced. */
  readonly roll: number | null;
  readonly forced: boolean;
}

export type EventPoolDrawResultV1 =
  | {
    readonly kind: "drawn";
    readonly eventId: string;
    readonly explanation: EventPoolDrawExplanationV1;
  }
  | { readonly kind: "empty"; readonly explanation: EventPoolDrawExplanationV1 };

export interface EventPoolDrawInputV1 {
  readonly candidates: readonly EventPoolCandidateV1[];
  readonly context: EventPoolContextV1;
  readonly rng: RuleRngV1;
  /** The RNG draw purpose, e.g. `check:cc.encounter`. */
  readonly purpose: string;
  /**
   * Debug force: picks this eventId without spending an RNG draw. The
   * candidate must still exist and be eligible — force chooses among
   * qualified events, it never manufactures qualification.
   */
  readonly force?: string;
}

interface CapturedEventPoolCandidateV1 {
  readonly source: EventPoolCandidateV1;
  readonly index: number;
  readonly eventId: string;
  readonly weight: number;
}

interface EligibleEventPoolCandidateV1 {
  readonly index: number;
  readonly eventId: string;
  readonly weight: number;
}

/**
 * Filters eligible candidates, then draws by weight through one
 * purpose-tagged RNG draw (`exclusiveMax` = total weight, linear walk).
 * Candidate order is authoring order; duplicate eventIds are invalid.
 */
export function drawFromEventPoolV1(input: EventPoolDrawInputV1): EventPoolDrawResultV1 {
  const seen = new Set<string>();
  const captured: CapturedEventPoolCandidateV1[] = [];
  let candidateIndex = 0;
  for (const source of input.candidates) {
    const eventId = source.eventId;
    const weight = source.weight;
    if (eventId === "" || seen.has(eventId)) {
      fail("event_pool.candidate_invalid", `/candidates/${eventId}`);
    }
    if (!Number.isSafeInteger(weight) || weight <= 0) {
      fail("event_pool.weight_invalid", `/candidates/${eventId}`);
    }
    seen.add(eventId);
    captured.push({ source, index: candidateIndex, eventId, weight });
    candidateIndex += 1;
  }

  const context = input.context;
  const admittedNumbers = admitContextNumbersV1(context);

  const eligible: EligibleEventPoolCandidateV1[] = [];
  for (const candidate of captured) {
    const condition = candidate.source.condition;
    if (
      condition === null ||
      evaluateAdmittedEventConditionV1(condition, context, admittedNumbers)
    ) {
      eligible.push({
        eventId: candidate.eventId,
        weight: candidate.weight,
        index: candidate.index,
      });
    }
  }
  let totalWeight = 0;
  for (const candidate of eligible) {
    if (candidate.weight > Number.MAX_SAFE_INTEGER - totalWeight) {
      const { index } = candidate;
      fail("event_pool.total_weight_overflow", `/candidates/${String(index)}/weight`);
    }
    totalWeight += candidate.weight;
  }
  const baseExplanation = {
    considered: captured.length,
    eligible: Object.freeze(
      eligible.map((candidate) =>
        Object.freeze({ eventId: candidate.eventId, weight: candidate.weight })
      ),
    ),
    totalWeight,
  };

  const force = input.force;
  if (force !== undefined) {
    const forced = eligible.find((candidate) => candidate.eventId === force);
    if (forced === undefined) {
      fail("event_pool.force_ineligible", `/candidates/${force}`);
    }
    return Object.freeze({
      kind: "drawn",
      eventId: forced.eventId,
      explanation: Object.freeze({ ...baseExplanation, roll: null, forced: true }),
    });
  }

  if (eligible.length === 0) {
    return Object.freeze({
      kind: "empty",
      explanation: Object.freeze({ ...baseExplanation, roll: null, forced: false }),
    });
  }

  const roll = input.rng.nextInt(
    Object.freeze({ purpose: input.purpose, exclusiveMax: totalWeight }),
  );
  let cursor = roll as number;
  for (const candidate of eligible) {
    cursor -= candidate.weight;
    if (cursor < 0) {
      return Object.freeze({
        kind: "drawn",
        eventId: candidate.eventId,
        explanation: Object.freeze({ ...baseExplanation, roll: roll as number, forced: false }),
      });
    }
  }
  // Unreachable: the roll is bounded by the total weight.
  return fail("event_pool.draw_overflow", "/draw");
}
