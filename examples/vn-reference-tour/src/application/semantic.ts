// SPDX-License-Identifier: MIT
import type { CoreSemanticAdapterV1 } from "@sillymaker/base/runtime";
import type { InteractionResolution, TimeTick } from "@sillymaker/base/story";
import {
  evaluateInteractionResolution,
  evaluateTimeTick,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
  parseTimeTick,
} from "@sillymaker/base/story";

import type {
  VnReferenceTourCommandV1,
  VnReferenceTourGameViewV1,
  VnReferenceTourNarrativeViewV1,
  VnReferenceTourQueriesV1,
  VnReferenceTourRejectionV1,
  VnReferenceTourSimulationTypesV1,
} from "../game/simulation.ts";
import { createVnReferenceTourGameSimulationV1 } from "../game/simulation.ts";
import {
  vnReferenceTourChoiceOptionsForV1,
  vnReferenceTourInteractionContextV1,
} from "../story/narrative.ts";
import { projectVnReferenceTourTransientEffectsV1 } from "../content/audio.ts";

/**
 * The semantic surface: what UI, agents, and automation can see and do.
 * One availability rule serves the action catalog, preview, and dispatch.
 */

export type VnReferenceTourActionIdV1 = Exclude<
  VnReferenceTourCommandV1["kind"],
  | "vn-reference-tour.narrative_resolve"
  | "vn-reference-tour.scene_reconcile"
  | "vn-reference-tour.time_tick"
>;

export interface VnReferenceTourActionDescriptorV1 {
  readonly actionId: VnReferenceTourActionIdV1;
  readonly enabled: boolean;
  readonly blockedBy: VnReferenceTourRejectionV1["code"] | null;
}

export type VnReferenceTourInvocationV1 =
  | { readonly kind: "invoke"; readonly actionId: VnReferenceTourActionIdV1 }
  | {
    readonly kind: "resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolution;
  }
  | { readonly kind: "time"; readonly tick: TimeTick };

export type VnReferenceTourPreviewV1 =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly code: VnReferenceTourRejectionV1["code"] };

export type VnReferenceTourActionResultV1 =
  | { readonly kind: "committed" }
  | { readonly kind: "rejected"; readonly codes: readonly VnReferenceTourRejectionV1["code"][] }
  | { readonly kind: "faulted"; readonly code: string }
  | {
    readonly kind: "not_executed";
    readonly code: "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
  };

const vnReferenceTourActionIdsV1: readonly VnReferenceTourActionIdV1[] = [
  "vn-reference-tour.begin_story",
];

const simulationForSemanticV1 = createVnReferenceTourGameSimulationV1();

function blockedByV1(
  queries: VnReferenceTourQueriesV1,
  actionId: VnReferenceTourActionIdV1,
): VnReferenceTourRejectionV1["code"] | null {
  switch (actionId) {
    case "vn-reference-tour.begin_story":
      return queries.narrative.pending === null ? null : "vn-reference-tour.narrative_busy";
    default: {
      const exhaustive: never = actionId;
      throw new TypeError(`unknown vn-reference-tour action ${String(exhaustive)}`);
    }
  }
}

function resolutionBlockedByV1(
  queries: VnReferenceTourQueriesV1,
  invocation: Extract<VnReferenceTourInvocationV1, { readonly kind: "resolve" }>,
): VnReferenceTourRejectionV1["code"] | null {
  const outcome = evaluateInteractionResolution(
    queries.narrative.pending,
    invocation.expectedOccurrenceId,
    invocation.resolution,
    vnReferenceTourInteractionContextV1(queries.narrative.pending),
  );
  return outcome.kind === "accepted" ? null : outcome.code;
}

/** The same time-tick evaluator used at queue-front dispatch, fed by queries. */
function timeTickBlockedByV1(
  queries: VnReferenceTourQueriesV1,
  invocation: Extract<VnReferenceTourInvocationV1, { readonly kind: "time" }>,
): VnReferenceTourRejectionV1["code"] | null {
  const outcome = evaluateTimeTick(queries.narrative.pending, invocation.tick);
  return outcome.kind === "accepted" ? null : outcome.code;
}

export function projectVnReferenceTourNarrativeViewV1(
  queries: VnReferenceTourQueriesV1,
): VnReferenceTourNarrativeViewV1 {
  const pending = queries.narrative.pending;
  return ({
    phase: queries.narrative.phase,
    pending,
    signalChoice: queries.narrative.signalChoice,
    history: queries.narrative.history,
    choiceOptions: pending !== null && pending.kind === "choice"
      ? (vnReferenceTourChoiceOptionsForV1(pending.definitionId).map((option) => {
        return ({
          choiceId: option.choiceId,
          textId: option.textId,
          enabled: true,
          blockedBy: null,
        });
      }))
      : null,
  });
}

export function parseVnReferenceTourInvocationV1(value: unknown): VnReferenceTourInvocationV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid vn-reference-tour invocation");
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === "resolve") {
    if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
      throw new TypeError("invalid vn-reference-tour resolve invocation");
    }
    const record = value as {
      readonly expectedOccurrenceId?: unknown;
      readonly resolution?: unknown;
    };
    return ({
      kind: "resolve",
      expectedOccurrenceId: parseInteractionOccurrenceId(record.expectedOccurrenceId),
      resolution: parseInteractionResolution(record.resolution),
    });
  }
  if (kind === "time") {
    if (Object.keys(value).toSorted().join("\0") !== "kind\0tick") {
      throw new TypeError("invalid vn-reference-tour time invocation");
    }
    return ({
      kind: "time",
      tick: parseTimeTick((value as { readonly tick?: unknown }).tick, "/tick"),
    });
  }
  if (kind !== "invoke" || Object.keys(value).toSorted().join("\0") !== "actionId\0kind") {
    throw new TypeError("invalid vn-reference-tour invocation");
  }
  const actionId = (value as { readonly actionId?: unknown }).actionId;
  if (!vnReferenceTourActionIdsV1.includes(actionId as VnReferenceTourActionIdV1)) {
    throw new TypeError("unknown vn-reference-tour action");
  }
  return ({ kind: "invoke", actionId: actionId as VnReferenceTourActionIdV1 });
}

export const vnReferenceTourSemanticAdapterV1: CoreSemanticAdapterV1<
  VnReferenceTourSimulationTypesV1,
  VnReferenceTourQueriesV1,
  VnReferenceTourGameViewV1,
  VnReferenceTourNarrativeViewV1,
  VnReferenceTourActionDescriptorV1,
  VnReferenceTourInvocationV1,
  VnReferenceTourPreviewV1,
  VnReferenceTourActionResultV1
> = {
  createQueries: (state) => simulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => simulationForSemanticV1.projectGameView(queries),
  projectNarrativeView: (queries) => projectVnReferenceTourNarrativeViewV1(queries),
  actions: (queries) => (vnReferenceTourActionIdsV1.map((actionId) => {
    const blockedBy = blockedByV1(queries, actionId);
    return ({ actionId, enabled: blockedBy === null, blockedBy });
  })),
  preview: (queries, invocation) => {
    const blockedBy = invocation.kind === "resolve"
      ? resolutionBlockedByV1(queries, invocation)
      : invocation.kind === "time"
      ? timeTickBlockedByV1(queries, invocation)
      : blockedByV1(queries, invocation.actionId);
    return blockedBy === null
      ? ({ kind: "allowed" as const })
      : ({ kind: "blocked" as const, code: blockedBy });
  },
  parseInvocation: parseVnReferenceTourInvocationV1,
  commandForInvocation: (invocation) =>
    invocation.kind === "resolve"
      ? ({
        kind: "vn-reference-tour.narrative_resolve" as const,
        expectedOccurrenceId: invocation.expectedOccurrenceId,
        resolution: invocation.resolution,
      })
      : invocation.kind === "time"
      ? ({ kind: "vn-reference-tour.time_tick" as const, tick: invocation.tick })
      : ({ kind: invocation.actionId }),
  projectDispatchResult: (result) => {
    if (result.kind === "not_executed") {
      return ({ kind: "not_executed" as const, code: result.code });
    }
    const execution = result.execution;
    if (execution.kind === "committed") {
      return ({ kind: "committed" as const });
    }
    if (execution.kind === "rejected") {
      return ({
        kind: "rejected" as const,
        codes: execution.reasons.map((reason) => reason.code),
      });
    }
    return ({ kind: "faulted" as const, code: execution.fault.code });
  },
  invalidInvocationResult: () => ({
    kind: "not_executed" as const,
    code: "validation_failed" as const,
  }),
  // Presentation edge context (cue identity, accepted 2026-08-17): the
  // stage events carry the scene dispatches behind each commit's mutations;
  // the instance stamps them with the commit's revision/epoch and the
  // stage forwards them so per-cue bindings (motions, explicit cuts)
  // resolve by dispatching cue instead of edge tuple alone.
  projectStageCueDispatches: (events) =>
    events.flatMap((event) =>
      event.kind === "vn-reference-tour.stage_changed" ? event.dispatches ?? [] : []
    ),
  projectTransientEffects: (events) => projectVnReferenceTourTransientEffectsV1(events),
};
