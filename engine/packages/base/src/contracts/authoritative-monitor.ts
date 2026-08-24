// SPDX-License-Identifier: MIT
import { dataFailure, pointerSegment, readArray, readExactRecord } from "./presentation-data.ts";
import { isPaceHintV1 } from "./pending-interaction.ts";
import type { PaceHintV1 } from "./pending-interaction.ts";
import { countThresholdCrossingsV1 } from "./time-tick.ts";

/**
 * Authoritative monitors V1: declared timing accumulations that run in
 * parallel with whatever interaction is pending — a decision gauge rising
 * under a live menu, a scene-scoped drip advancing while the player reads,
 * a held-interaction drip. A monitor is a declaration (predicate gate +
 * cadence + event payload + retention), never a script body: it has no
 * interpreter, no routing power over the narrative, and no lifecycle verbs.
 * An authoritative-state predicate (`activeWhen`, the branch `when`
 * vocabulary) gates accumulation exactly like frame-loop engines gate
 * parallel events on a switch — effects write state, the predicate flips,
 * the monitor starts or stops.
 *
 * Settlement happens inside the Story's single time-verb command
 * (`TimeTickV1`), after the pending hold's remainder folds: the handler
 * calls {@link settleMonitorsV1} with the reported milliseconds and emits
 * the returned domain events, so the transaction runner stays the only
 * writer and `{500,500,500}` settles identically to `{1500}`. The
 * accumulator is plain versioned Story state — it enters Saves and digests
 * like any other slice, while wall-clock timestamps never do.
 */
export type MonitorRetentionV1 = "clear" | "retain";

export interface MonitorDeclarationV1<TState, TEvent> {
  /** Stable non-empty monitor id, unique within the declaration set. */
  readonly id: string;
  /** Positive safe-integer cadence: one crossing per whole multiple. */
  readonly everyMs: number;
  /**
   * What happens to the accumulated milliseconds while `activeWhen` reports
   * false: `clear` drops the accumulation (the switch-off refresh of
   * frame-loop engines), `retain` keeps it so a later activation resumes
   * where it left off.
   */
  readonly retention: MonitorRetentionV1;
  /**
   * Host pacing hint, the hold `pace` idiom applied to monitors
   * (shared {@link PaceHintV1} vocabulary): `realtime` declares a
   * fairness-sensitive reaction span (a decision gauge under a live
   * menu), so the Host pins the rate while the monitor is active.
   * Optional at declaration, normalized to `cinematic` by admission so
   * consumers always read a definite value.
   */
  readonly pace?: PaceHintV1;
  /**
   * The declared domain-event payload, emitted once per threshold crossing
   * inside the settling commit. The Story `eventSchema` validates it again
   * at emit like any other domain event; reducers (or a journal-only
   * subscription) decide what a crossing means.
   */
  readonly event: TEvent;
  /**
   * Authoritative-state predicate deciding whether this monitor accumulates
   * during a settlement. It reads the command-start state the Story hands
   * to {@link settleMonitorsV1} and must stay deterministic (no wall clock,
   * no ambient randomness).
   */
  activeWhen(state: TState): boolean;
}

/** Accumulated milliseconds per monitor id: plain versioned Story state. */
export type MonitorAccumulatorV1 = Readonly<Record<string, number>>;

export interface MonitorSettlementV1<TEvent> {
  /** The next accumulator, containing only declared monitor ids. */
  readonly accumulator: MonitorAccumulatorV1;
  /**
   * One declared payload per threshold crossing, ordered by declaration
   * order then crossing order — the only production channel a monitor has.
   */
  readonly events: readonly TEvent[];
}

/**
 * Ids that collide with `Object.prototype` plumbing: browsers keep the
 * Annex-B `__proto__` accessor, so admitting these as record keys would make
 * settlement behave differently between Deno (tests) and the shipped Player.
 */
const forbiddenMonitorIdsInternalV1 = new Set(["__proto__", "prototype", "constructor"]);

function isPlainRecordInternalV1(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Admission for a Story's monitor declaration set: exact records, unique
 * non-empty ids, positive safe-integer cadences, a known retention policy,
 * a predicate function, and a `kind`-bearing event payload. Declaration
 * order is the settlement order (the registration-order rule of frame-loop
 * parallel events), so the returned vector preserves it.
 */
export function parseMonitorDeclarationsV1<TState, TEvent>(
  value: readonly MonitorDeclarationV1<TState, TEvent>[],
  path = "/monitors",
): readonly MonitorDeclarationV1<TState, TEvent>[] {
  const entries = readArray(value, path);
  const seen = new Set<string>();
  const declarations = entries.map((entry, index) => {
    const entryPath = `${path}/${index}`;
    const declaresPace = entry !== null && typeof entry === "object" &&
      Object.hasOwn(entry, "pace");
    const record = readExactRecord(
      entry,
      declaresPace
        ? ["activeWhen", "event", "everyMs", "id", "pace", "retention"]
        : ["activeWhen", "event", "everyMs", "id", "retention"],
      entryPath,
    );
    if (
      typeof record.id !== "string" || record.id.length === 0 ||
      forbiddenMonitorIdsInternalV1.has(record.id)
    ) {
      return dataFailure(`${entryPath}/id`, "monitor_id_invalid");
    }
    if (seen.has(record.id)) {
      return dataFailure(`${entryPath}/id`, "monitor_id_duplicate");
    }
    seen.add(record.id);
    if (
      typeof record.everyMs !== "number" ||
      !Number.isSafeInteger(record.everyMs) ||
      record.everyMs < 1
    ) {
      return dataFailure(`${entryPath}/everyMs`, "monitor_cadence_invalid");
    }
    const retention: MonitorRetentionV1 | null = record.retention === "clear"
      ? "clear"
      : record.retention === "retain"
      ? "retain"
      : null;
    if (retention === null) {
      return dataFailure(`${entryPath}/retention`, "monitor_retention_invalid");
    }
    if (declaresPace && !isPaceHintV1(record.pace)) {
      return dataFailure(`${entryPath}/pace`, "monitor_pace_invalid");
    }
    if (typeof record.activeWhen !== "function") {
      return dataFailure(`${entryPath}/activeWhen`, "monitor_predicate_invalid");
    }
    if (
      !isPlainRecordInternalV1(record.event) ||
      typeof record.event.kind !== "string" || record.event.kind.length === 0
    ) {
      return dataFailure(`${entryPath}/event`, "monitor_event_invalid");
    }
    return {
      id: record.id,
      everyMs: record.everyMs,
      retention,
      pace: declaresPace ? record.pace as PaceHintV1 : "cinematic",
      // Settlement emits this typed declaration value once per crossing; the
      // Story eventSchema re-validates it at emit like every other event.
      event: record.event as TEvent,
      activeWhen: record.activeWhen as MonitorDeclarationV1<TState, TEvent>["activeWhen"],
    };
  });
  return declarations;
}

/**
 * The Host-side realtime gate: whether any admitted `realtime` monitor is
 * currently active for the given authoritative state. Stories project
 * this into their published view so the application shell can pin the
 * presentation rate while the reaction span is up — the hint stays a Host
 * concern and never reaches settlement arithmetic.
 */
export function anyRealtimeMonitorActiveV1<TState, TEvent>(
  declarations: readonly MonitorDeclarationV1<TState, TEvent>[],
  state: TState,
): boolean {
  return declarations.some(
    (declaration) => declaration.pace === "realtime" && declaration.activeWhen(state),
  );
}

/**
 * Admission for the accumulator slice inside a Story state schema: a plain
 * record of non-negative safe-integer milliseconds keyed by monitor id.
 */
export function parseMonitorAccumulatorV1(
  value: unknown,
  path = "/monitorAccumulator",
): MonitorAccumulatorV1 {
  if (!isPlainRecordInternalV1(value)) {
    return dataFailure(path, "object_expected");
  }
  const accumulator: Record<string, number> = {};
  for (const id of Object.keys(value)) {
    if (id.length === 0 || forbiddenMonitorIdsInternalV1.has(id)) {
      return dataFailure(`${path}/${pointerSegment(id)}`, "monitor_id_invalid");
    }
    const accumulated: unknown = value[id];
    if (
      typeof accumulated !== "number" ||
      !Number.isSafeInteger(accumulated) ||
      accumulated < 0
    ) {
      return dataFailure(`${path}/${pointerSegment(id)}`, "monitor_accumulation_invalid");
    }
    accumulator[id] = accumulated;
  }
  return accumulator;
}

/**
 * The shared settlement arithmetic every Story time-verb handler applies —
 * after folding the pending hold's remainder, one declaration at a time in
 * declaration order:
 *
 * - active (`activeWhen(state)` reports true): accumulation grows by the
 *   full reported `elapsedMs` and each threshold crossing counted by
 *   {@link countThresholdCrossingsV1} over `(before, before + elapsedMs]`
 *   appends the declared event payload (the same admitted reference
 *   each crossing), so the outcome depends only on the millisecond sum,
 *   never on how the Host batched the ticks;
 * - inactive with `clear` retention: the accumulation is dropped;
 * - inactive with `retain` retention: the accumulation carries unchanged.
 *
 * The returned accumulator contains only declared ids — an id absent from
 * the declarations does not survive settlement — and the handler emits the
 * returned events (its only production channel) inside the same commit.
 */
export function settleMonitorsV1<TState, TEvent>(input: {
  readonly declarations: readonly MonitorDeclarationV1<TState, TEvent>[];
  readonly accumulator: MonitorAccumulatorV1;
  readonly elapsedMs: number;
  /** Command-start authoritative state the `activeWhen` predicates read. */
  readonly state: TState;
}): MonitorSettlementV1<TEvent> {
  const { declarations, accumulator, elapsedMs, state } = input;
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 1) {
    throw new TypeError("monitor settlement elapsedMs must be a positive integer");
  }
  const next: Record<string, number> = {};
  const events: TEvent[] = [];
  for (const declaration of declarations) {
    // Own-property read: an id sharing a name with Object.prototype plumbing
    // (`toString`, ...) must read as absent, not as the inherited member.
    const before = Object.hasOwn(accumulator, declaration.id)
      ? accumulator[declaration.id] ?? 0
      : 0;
    if (!declaration.activeWhen(state)) {
      if (declaration.retention === "retain" && before > 0) {
        next[declaration.id] = before;
      }
      continue;
    }
    const after = before + elapsedMs;
    const count = countThresholdCrossingsV1({
      fromMs: before,
      toMs: after,
      everyMs: declaration.everyMs,
    });
    next[declaration.id] = after;
    for (let crossing = 0; crossing < count; crossing += 1) {
      events.push(declaration.event);
    }
  }
  return { accumulator: next, events };
}
