// SPDX-License-Identifier: MIT
import type { InteractionResolutionV1, TimeTickV1 } from "@sillymaker/base";
import {
  evaluateInteractionResolutionV1,
  evaluateTimeTickV1,
  parseInteractionOccurrenceIdV1,
  parseInteractionResolutionV1,
  parseTimeTickV1,
} from "@sillymaker/base";
import type { CoreSemanticAdapterV1 } from "@sillymaker/base/runtime";

import type {
  LabCommandV1,
  LabGameViewV1,
  LabNarrativeViewV1,
  LabQueriesV1,
  LabRejectionV1,
  LabSimulationTypesV1,
} from "../gameplay/simulation.ts";
import { createLabGameSimulationV1, labBannerCostV1 } from "../gameplay/simulation.ts";
import { projectLabTransientEffectsV1 } from "../gameplay/audio.ts";
import {
  labChoiceBlockedByV1,
  labChoiceOptionsForV1,
  labInteractionContextV1,
} from "../gameplay/narrative.ts";

export type LabActionIdV1 = Exclude<
  LabCommandV1["kind"],
  "lab.narrative_resolve" | "lab.time_tick" | "lab.engage_collector"
>;

export interface LabActionDescriptorV1 {
  readonly actionId: LabActionIdV1;
  readonly enabled: boolean;
  readonly blockedBy: LabRejectionV1["code"] | null;
}

export type LabInvocationV1 =
  | { readonly kind: "invoke"; readonly actionId: LabActionIdV1 }
  | {
    readonly kind: "resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolutionV1;
  }
  | { readonly kind: "time"; readonly tick: TimeTickV1 }
  | {
    /**
     * The mid-hold input write: routed by the application while a hold is
     * pending (a hit region or key press), fenced to that hold's
     * occurrence. Preview and dispatch share the same one-line fence.
     */
    readonly kind: "hold_write";
    readonly actionId: "lab.engage_collector";
    readonly expectedHoldOccurrenceId: string;
  };

export type LabPreviewV1 =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly code: LabRejectionV1["code"] };

export type LabActionResultV1 =
  | { readonly kind: "committed" }
  | { readonly kind: "rejected"; readonly codes: readonly LabRejectionV1["code"][] }
  | { readonly kind: "faulted"; readonly code: string }
  | {
    readonly kind: "not_executed";
    readonly code: "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
  };

const labActionIdsV1: readonly LabActionIdV1[] = Object.freeze([
  "lab.collect_sample",
  "lab.begin_procedure",
  "lab.advance_procedure",
  "lab.run_experiment",
  "lab.begin_calibration",
  "lab.begin_drill",
  "lab.toggle_collector",
  "lab.sell_sample",
  "lab.buy_banner",
]);

const labSimulationForSemanticV1 = createLabGameSimulationV1();

/**
 * The single availability evaluator shared by the action catalog, preview,
 * and (through owner rules) dispatch, so all three surfaces agree.
 */
function blockedByV1(
  queries: LabQueriesV1,
  actionId: LabActionIdV1,
): LabRejectionV1["code"] | null {
  switch (actionId) {
    case "lab.collect_sample":
      return null;
    case "lab.begin_procedure":
      if (queries.procedurePhase !== "idle") return "lab.procedure_already_running";
      if (queries.samplesCollected < 1) return "lab.samples_required";
      return null;
    case "lab.advance_procedure":
      return queries.procedurePhase === "running" ? null : "lab.procedure_not_running";
    case "lab.run_experiment":
      if (queries.procedurePhase !== "running") return "lab.procedure_not_running";
      if (queries.samplesCollected < 1) return "lab.insufficient_samples";
      return null;
    case "lab.begin_calibration":
    case "lab.begin_drill":
      return queries.narrative.pending === null ? null : "lab.narrative_busy";
    case "lab.toggle_collector":
      return null;
    case "lab.sell_sample":
      return queries.samplesCollected >= 1 ? null : "lab.insufficient_samples";
    case "lab.buy_banner":
      if (queries.bannerOwned) return "lab.banner_already_owned";
      if (queries.credits < labBannerCostV1) return "lab.insufficient_credits";
      return null;
    default: {
      const exhaustive: never = actionId;
      throw new TypeError(`unknown lab action ${String(exhaustive)}`);
    }
  }
}

/** The same base evaluator used at queue-front dispatch, fed by queries. */
function resolutionBlockedByV1(
  queries: LabQueriesV1,
  invocation: Extract<LabInvocationV1, { readonly kind: "resolve" }>,
): LabRejectionV1["code"] | null {
  const outcome = evaluateInteractionResolutionV1(
    queries.narrative.pending,
    invocation.expectedOccurrenceId,
    invocation.resolution,
    labInteractionContextV1(queries.narrative.pending, queries.samplesCollected),
  );
  return outcome.kind === "accepted" ? null : outcome.code;
}

/** The same time-tick evaluator used at queue-front dispatch, fed by queries. */
function timeTickBlockedByV1(
  queries: LabQueriesV1,
  invocation: Extract<LabInvocationV1, { readonly kind: "time" }>,
): LabRejectionV1["code"] | null {
  const outcome = evaluateTimeTickV1(queries.narrative.pending, invocation.tick);
  return outcome.kind === "accepted" ? null : outcome.code;
}

/** The same one-line hold fence the dispatch handler re-checks. */
function holdWriteBlockedByV1(
  queries: LabQueriesV1,
  invocation: Extract<LabInvocationV1, { readonly kind: "hold_write" }>,
): LabRejectionV1["code"] | null {
  const pending = queries.narrative.pending;
  return pending !== null && pending.kind === "hold" &&
      pending.occurrenceId === invocation.expectedHoldOccurrenceId
    ? null
    : "lab.hold_occurrence_stale";
}

export function projectLabNarrativeViewV1(queries: LabQueriesV1): LabNarrativeViewV1 {
  const pending = queries.narrative.pending;
  return Object.freeze({
    phase: queries.narrative.phase,
    calibration: queries.narrative.calibration,
    history: queries.narrative.history,
    pending,
    choiceOptions: pending !== null && pending.kind === "choice"
      ? Object.freeze(
        labChoiceOptionsForV1(pending.definitionId).map((option) => {
          const blockedBy = labChoiceBlockedByV1(option, queries.samplesCollected);
          return Object.freeze({
            choiceId: option.choiceId,
            textId: option.textId,
            enabled: blockedBy === null,
            blockedBy,
          });
        }),
      )
      : null,
  });
}

export function parseLabInvocationV1(value: unknown): LabInvocationV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid lab invocation");
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === "resolve") {
    if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
      throw new TypeError("invalid lab resolve invocation");
    }
    const record = value as {
      readonly expectedOccurrenceId?: unknown;
      readonly resolution?: unknown;
    };
    return Object.freeze({
      kind: "resolve",
      expectedOccurrenceId: parseInteractionOccurrenceIdV1(record.expectedOccurrenceId),
      resolution: parseInteractionResolutionV1(record.resolution),
    });
  }
  if (kind === "time") {
    if (Object.keys(value).toSorted().join("\0") !== "kind\0tick") {
      throw new TypeError("invalid lab time invocation");
    }
    return Object.freeze({
      kind: "time",
      tick: parseTimeTickV1((value as { readonly tick?: unknown }).tick, "/tick"),
    });
  }
  if (kind === "hold_write") {
    if (
      Object.keys(value).toSorted().join("\0") !== "actionId\0expectedHoldOccurrenceId\0kind"
    ) {
      throw new TypeError("invalid lab hold write invocation");
    }
    const record = value as {
      readonly actionId?: unknown;
      readonly expectedHoldOccurrenceId?: unknown;
    };
    if (record.actionId !== "lab.engage_collector") {
      throw new TypeError("unknown lab hold write action");
    }
    return Object.freeze({
      kind: "hold_write",
      actionId: "lab.engage_collector",
      expectedHoldOccurrenceId: parseInteractionOccurrenceIdV1(record.expectedHoldOccurrenceId),
    });
  }
  if (kind !== "invoke" || Object.keys(value).toSorted().join("\0") !== "actionId\0kind") {
    throw new TypeError("invalid lab invocation");
  }
  const actionId = (value as { readonly actionId?: unknown }).actionId;
  if (!labActionIdsV1.includes(actionId as LabActionIdV1)) {
    throw new TypeError("unknown lab action");
  }
  return Object.freeze({ kind: "invoke", actionId: actionId as LabActionIdV1 });
}

export const labSemanticAdapterV1: CoreSemanticAdapterV1<
  LabSimulationTypesV1,
  LabQueriesV1,
  LabGameViewV1,
  LabNarrativeViewV1,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1
> = {
  createQueries: (state) => labSimulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => labSimulationForSemanticV1.projectGameView(queries),
  projectNarrativeView: (queries) => projectLabNarrativeViewV1(queries),
  actions: (queries) =>
    Object.freeze(
      labActionIdsV1.map((actionId) => {
        const blockedBy = blockedByV1(queries, actionId);
        return Object.freeze({ actionId, enabled: blockedBy === null, blockedBy });
      }),
    ),
  preview: (queries, invocation) => {
    const blockedBy = invocation.kind === "resolve"
      ? resolutionBlockedByV1(queries, invocation)
      : invocation.kind === "time"
      ? timeTickBlockedByV1(queries, invocation)
      : invocation.kind === "hold_write"
      ? holdWriteBlockedByV1(queries, invocation)
      : blockedByV1(queries, invocation.actionId);
    return blockedBy === null
      ? Object.freeze({ kind: "allowed" as const })
      : Object.freeze({ kind: "blocked" as const, code: blockedBy });
  },
  parseInvocation: parseLabInvocationV1,
  commandForInvocation: (invocation) =>
    invocation.kind === "resolve"
      ? Object.freeze({
        kind: "lab.narrative_resolve" as const,
        expectedOccurrenceId: invocation.expectedOccurrenceId,
        resolution: invocation.resolution,
      })
      : invocation.kind === "time"
      ? Object.freeze({ kind: "lab.time_tick" as const, tick: invocation.tick })
      : invocation.kind === "hold_write"
      ? Object.freeze({
        kind: "lab.engage_collector" as const,
        expectedHoldOccurrenceId: invocation.expectedHoldOccurrenceId,
      })
      : Object.freeze({ kind: invocation.actionId }),
  projectDispatchResult: (result) => {
    if (result.kind === "not_executed") {
      return Object.freeze({ kind: "not_executed" as const, code: result.code });
    }
    const execution = result.execution;
    if (execution.kind === "committed") {
      // Committed domain events stay engine evidence; agents observe outcomes through
      // the published game view, never through the raw event journal.
      return Object.freeze({ kind: "committed" as const });
    }
    if (execution.kind === "rejected") {
      return Object.freeze({
        kind: "rejected" as const,
        codes: Object.freeze(execution.reasons.map((reason) => reason.code)),
      });
    }
    return Object.freeze({ kind: "faulted" as const, code: execution.fault.code });
  },
  invalidInvocationResult: () =>
    Object.freeze({ kind: "not_executed" as const, code: "validation_failed" as const }),
  projectTransientEffects: (events) => projectLabTransientEffectsV1(events),
};
