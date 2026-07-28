// SPDX-License-Identifier: MIT
import type { CoreSemanticAdapterV1 } from "@sillymaker/base/runtime";
import type { TransientEffectRequestV1 } from "@sillymaker/base";
import type { InteractionResolution } from "@sillymaker/base/story";
import {
  evaluateInteractionResolution,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
} from "@sillymaker/base/story";

import type {
  CatcafeCommandV1,
  CatcafeFactV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeRejectionV1,
  CatcafeSimulationTypesV1,
} from "../simulation.ts";
import {
  catcafeContestTodayV1,
  catcafeEndingForV1,
  createCatcafeGameSimulationV1,
} from "../simulation.ts";
import { catcafeInteractionContextV1 } from "../features/dialogue/script.ts";
import { catcafeActivitiesV1, catcafeSlotsV1, catcafeStageForWeekV1 } from "../content.ts";

/**
 * The semantic surface: the action catalog (with activity availability expanded
 * from content tables), parameterized invocations (activity/pet/contest moves carry content-table primary keys), and the availability rule shared with dispatch.
 */

export type CatcafeActionIdV1 =
  "cc.begin_story" | "cc.advance_slot" | "cc.enter_contest" | "cc.enter_postgame";

export type CatcafeActionDescriptorV1 =
  | {
      readonly kind: "system";
      readonly actionId: CatcafeActionIdV1;
      readonly enabled: boolean;
      readonly blockedBy: CatcafeRejectionV1["code"] | null;
    }
  | {
      /** Parameterized actions: content-table rows expand into catalog entries; availability uses the same table-lookup rule. */
      readonly kind: "activity";
      readonly activityId: string;
      readonly nameTextId: string;
      readonly stamina: number;
      readonly enabled: boolean;
      readonly blockedBy: CatcafeRejectionV1["code"] | null;
    };

export type CatcafeInvocationV1 =
  | { readonly kind: "invoke"; readonly actionId: CatcafeActionIdV1 }
  | { readonly kind: "activity"; readonly activityId: string }
  | { readonly kind: "pet"; readonly zone: string }
  | { readonly kind: "contest_move"; readonly moveId: string }
  | {
      readonly kind: "resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
    };

export type CatcafePreviewV1 =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly code: CatcafeRejectionV1["code"] };

export type CatcafeActionResultV1 =
  | { readonly kind: "committed" }
  | { readonly kind: "rejected"; readonly codes: readonly CatcafeRejectionV1["code"][] }
  | { readonly kind: "faulted"; readonly code: string }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    };

const actionIdsV1: readonly CatcafeActionIdV1[] = Object.freeze([
  "cc.begin_story",
  "cc.advance_slot",
  "cc.enter_contest",
  "cc.enter_postgame",
]);

const simulationForSemanticV1 = createCatcafeGameSimulationV1();

function blockedByV1(
  queries: CatcafeQueriesV1,
  actionId: CatcafeActionIdV1,
): CatcafeRejectionV1["code"] | null {
  switch (actionId) {
    case "cc.begin_story":
      return queries.narrative.pending === null && queries.narrative.phase === "idle"
        ? null
        : "cc.narrative_busy";
    case "cc.advance_slot":
      if (queries.narrative.phase !== "completed") return "cc.narrative_busy";
      return queries.contest === null ? null : "cc.contest_already_running";
    case "cc.enter_contest":
      if (queries.narrative.phase !== "completed") return "cc.narrative_busy";
      if (queries.contest !== null) return "cc.contest_already_running";
      return catcafeContestTodayV1(queries.calendar) === null ? "cc.contest_not_today" : null;
    case "cc.enter_postgame":
      // The ending screen's "keep running the shop": available only while the mainline ending has just settled and is unconfirmed.
      return catcafeEndingForV1(queries) === null ? "cc.no_ending_pending" : null;
    default: {
      const exhaustive: never = actionId;
      throw new TypeError(`unknown catcafe action ${String(exhaustive)}`);
    }
  }
}

/** Activity availability: catalog/preview/dispatch share this one table-lookup rule. */
export function catcafeActivityBlockedByV1(
  queries: CatcafeQueriesV1,
  activityId: string,
): CatcafeRejectionV1["code"] | null {
  const activity = catcafeActivitiesV1.byId(activityId);
  if (activity === null) return "cc.activity_unknown";
  const slotName = catcafeSlotsV1[queries.calendar.slot];
  if (activity.slots.length > 0 && !activity.slots.includes(slotName ?? "")) {
    return "cc.activity_wrong_slot";
  }
  if (
    activity.unlockStage !== null &&
    catcafeStageForWeekV1(queries.calendar.week) < activity.unlockStage
  ) {
    return "cc.activity_locked";
  }
  if (queries.calendar.stamina < activity.stamina) return "cc.stamina_exhausted";
  return null;
}

function invocationBlockedByV1(
  queries: CatcafeQueriesV1,
  invocation: CatcafeInvocationV1,
): CatcafeRejectionV1["code"] | null {
  const dailyLocked = queries.narrative.phase !== "completed" ? "cc.narrative_busy" : null;
  switch (invocation.kind) {
    case "invoke":
      return blockedByV1(queries, invocation.actionId);
    case "activity":
      return dailyLocked ?? catcafeActivityBlockedByV1(queries, invocation.activityId);
    case "pet":
      if (dailyLocked !== null) return dailyLocked;
      return queries.cat.pettingLeft > 0 ? null : "cc.petting_exhausted";
    case "contest_move":
      if (dailyLocked !== null) return dailyLocked;
      return queries.contest === null ? "cc.contest_not_running" : null;
    case "resolve": {
      const outcome = evaluateInteractionResolution(
        queries.narrative.pending,
        invocation.expectedOccurrenceId,
        invocation.resolution,
        catcafeInteractionContextV1(queries.narrative.pending, queries.shop.money),
      );
      return outcome.kind === "accepted" ? null : outcome.code;
    }
    default: {
      const exhaustive: never = invocation;
      throw new TypeError(`unknown catcafe invocation ${String(exhaustive)}`);
    }
  }
}

export function projectCatcafeNarrativeViewV1(queries: CatcafeQueriesV1): CatcafeNarrativeViewV1 {
  const pending = queries.narrative.pending;
  return Object.freeze({
    phase: queries.narrative.phase,
    pending,
    flags: queries.narrative.flags,
    history: queries.narrative.history,
    choiceOptions:
      pending !== null && pending.kind === "choice"
        ? Object.freeze(
            pending.options.map((option) =>
              Object.freeze({
                choiceId: option.choiceId,
                textId: option.textId,
                enabled: true,
                blockedBy: null,
              }),
            ),
          )
        : null,
  });
}

export function parseCatcafeInvocationV1(value: unknown): CatcafeInvocationV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid catcafe invocation");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).toSorted().join("\u0000");
  switch (record.kind) {
    case "resolve":
      if (keys !== "expectedOccurrenceId\u0000kind\u0000resolution") {
        throw new TypeError("invalid catcafe resolve invocation");
      }
      return Object.freeze({
        kind: "resolve",
        expectedOccurrenceId: parseInteractionOccurrenceId(record.expectedOccurrenceId),
        resolution: parseInteractionResolution(record.resolution),
      });
    case "activity":
      if (keys !== "activityId\u0000kind" || typeof record.activityId !== "string") {
        throw new TypeError("invalid catcafe activity invocation");
      }
      return Object.freeze({ kind: "activity", activityId: record.activityId });
    case "pet":
      if (keys !== "kind\u0000zone" || typeof record.zone !== "string") {
        throw new TypeError("invalid catcafe pet invocation");
      }
      return Object.freeze({ kind: "pet", zone: record.zone });
    case "contest_move":
      if (keys !== "kind\u0000moveId" || typeof record.moveId !== "string") {
        throw new TypeError("invalid catcafe contest invocation");
      }
      return Object.freeze({ kind: "contest_move", moveId: record.moveId });
    case "invoke": {
      if (keys !== "actionId\u0000kind") throw new TypeError("invalid catcafe invocation");
      const actionId = record.actionId;
      if (!actionIdsV1.includes(actionId as CatcafeActionIdV1)) {
        throw new TypeError("unknown catcafe action");
      }
      return Object.freeze({ kind: "invoke", actionId: actionId as CatcafeActionIdV1 });
    }
    default:
      throw new TypeError("invalid catcafe invocation");
  }
}

function commandForInvocationV1(invocation: CatcafeInvocationV1): CatcafeCommandV1 {
  switch (invocation.kind) {
    case "invoke":
      return Object.freeze({
        kind:
          invocation.actionId === "cc.begin_story"
            ? ("cc.begin_story" as const)
            : invocation.actionId === "cc.advance_slot"
              ? ("cc.advance_slot" as const)
              : invocation.actionId === "cc.enter_postgame"
                ? ("cc.enter_postgame" as const)
                : ("cc.enter_contest" as const),
      });
    case "activity":
      return Object.freeze({ kind: "cc.do_activity", activityId: invocation.activityId });
    case "pet":
      return Object.freeze({ kind: "cc.pet", zone: invocation.zone });
    case "contest_move":
      return Object.freeze({ kind: "cc.contest_move", moveId: invocation.moveId });
    case "resolve":
      return Object.freeze({
        kind: "cc.narrative_resolve",
        expectedOccurrenceId: invocation.expectedOccurrenceId,
        resolution: invocation.resolution,
      });
    default: {
      const exhaustive: never = invocation;
      throw new TypeError(`unknown catcafe invocation ${String(exhaustive)}`);
    }
  }
}

/**
 * Commit-only transient effects: projected from committed facts (the engine's
 * existing mechanism, same as the Lab audio). The UI subscribes for reaction bubbles / contest toasts; never enters State, saves, publications, or transcripts.
 */
export function projectCatcafeTransientEffectsV1(
  facts: readonly CatcafeFactV1[],
): readonly TransientEffectRequestV1[] {
  return facts.flatMap((fact): readonly TransientEffectRequestV1[] => {
    switch (fact.kind) {
      case "cc.petted":
        return [
          Object.freeze({
            effectId: "effect.catcafe.reaction",
            payload: Object.freeze({
              reactionId: fact.reactionId,
              zone: fact.zone,
              trustDelta: fact.trustDelta,
            }),
          }),
        ];
      case "cc.contest_won":
        return [
          Object.freeze({
            effectId: "effect.catcafe.contest",
            payload: Object.freeze({ outcome: "won", rivalId: fact.rivalId }),
          }),
        ];
      case "cc.contest_lost":
        return [
          Object.freeze({
            effectId: "effect.catcafe.contest",
            payload: Object.freeze({ outcome: "lost", rivalId: fact.rivalId }),
          }),
        ];
      case "cc.encounter":
        return fact.textId === null
          ? []
          : [
              Object.freeze({
                effectId: "effect.catcafe.encounter",
                payload: Object.freeze({ encounterId: fact.encounterId, textId: fact.textId }),
              }),
            ];
      default:
        return [];
    }
  });
}

export const catcafeSemanticAdapterV1: CoreSemanticAdapterV1<
  CatcafeSimulationTypesV1,
  CatcafeQueriesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1
> = {
  createQueries: (state) => simulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => simulationForSemanticV1.projectGameView(queries),
  projectNarrativeView: (queries) => projectCatcafeNarrativeViewV1(queries),
  actions: (queries) =>
    Object.freeze([
      ...actionIdsV1.map((actionId) => {
        const blockedBy = blockedByV1(queries, actionId);
        return Object.freeze({
          kind: "system" as const,
          actionId,
          enabled: blockedBy === null,
          blockedBy,
        });
      }),
      ...catcafeActivitiesV1.rows().map((activity) => {
        const blockedBy =
          queries.narrative.phase !== "completed"
            ? ("cc.narrative_busy" as const)
            : catcafeActivityBlockedByV1(queries, activity.id);
        return Object.freeze({
          kind: "activity" as const,
          activityId: activity.id,
          nameTextId: activity.nameTextId,
          stamina: activity.stamina,
          enabled: blockedBy === null,
          blockedBy,
        });
      }),
    ]),
  preview: (queries, invocation) => {
    const blockedBy = invocationBlockedByV1(queries, invocation);
    return blockedBy === null
      ? Object.freeze({ kind: "allowed" as const })
      : Object.freeze({ kind: "blocked" as const, code: blockedBy });
  },
  parseInvocation: parseCatcafeInvocationV1,
  commandForInvocation: commandForInvocationV1,
  projectDispatchResult: (result) => {
    if (result.kind === "not_executed") {
      return Object.freeze({ kind: "not_executed" as const, code: result.code });
    }
    const execution = result.execution;
    if (execution.kind === "committed") return Object.freeze({ kind: "committed" as const });
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
  projectTransientEffects: (facts) =>
    projectCatcafeTransientEffectsV1(facts as readonly CatcafeFactV1[]),
};
