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
  VnLastSoundCheckCommandV1,
  VnLastSoundCheckGameViewV1,
  VnLastSoundCheckNarrativeViewV1,
  VnLastSoundCheckQueriesV1,
  VnLastSoundCheckRejectionV1,
  VnLastSoundCheckSimulationTypesV1,
} from "../game/simulation.ts";
import { createVnLastSoundCheckGameSimulationV1 } from "../game/simulation.ts";
import {
  vnLastSoundCheckChoiceOptionsForV1,
  vnLastSoundCheckInteractionContextV1,
} from "../story/narrative.ts";
import { projectVnLastSoundCheckTransientEffectsV1 } from "../content/audio.ts";

/**
 * The semantic surface: what UI, agents, and automation can see and do.
 * One availability rule serves the action catalog, preview, and dispatch.
 */

export type VnLastSoundCheckActionIdV1 = Exclude<
  VnLastSoundCheckCommandV1["kind"],
  | "vn-last-sound-check.narrative_resolve"
  | "vn-last-sound-check.scene_reconcile"
  | "vn-last-sound-check.time_tick"
>;

export interface VnLastSoundCheckActionDescriptorV1 {
  readonly actionId: VnLastSoundCheckActionIdV1;
  readonly enabled: boolean;
  readonly blockedBy: VnLastSoundCheckRejectionV1["code"] | null;
}

export type VnLastSoundCheckInvocationV1 =
  | { readonly kind: "invoke"; readonly actionId: VnLastSoundCheckActionIdV1 }
  | {
    readonly kind: "resolve";
    readonly expectedOccurrenceId: string;
    readonly resolution: InteractionResolution;
  }
  | { readonly kind: "time"; readonly tick: TimeTick };

export type VnLastSoundCheckPreviewV1 =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly code: VnLastSoundCheckRejectionV1["code"] };

export type VnLastSoundCheckActionResultV1 =
  | { readonly kind: "committed" }
  | { readonly kind: "rejected"; readonly codes: readonly VnLastSoundCheckRejectionV1["code"][] }
  | { readonly kind: "faulted"; readonly code: string }
  | {
    readonly kind: "not_executed";
    readonly code: "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
  };

const vnLastSoundCheckActionIdsV1: readonly VnLastSoundCheckActionIdV1[] = [
  "vn-last-sound-check.begin_story",
];

const simulationForSemanticV1 = createVnLastSoundCheckGameSimulationV1();

function blockedByV1(
  queries: VnLastSoundCheckQueriesV1,
  actionId: VnLastSoundCheckActionIdV1,
): VnLastSoundCheckRejectionV1["code"] | null {
  switch (actionId) {
    case "vn-last-sound-check.begin_story":
      return queries.narrative.pending === null ? null : "vn-last-sound-check.narrative_busy";
    default: {
      const exhaustive: never = actionId;
      throw new TypeError(`unknown vn-last-sound-check action ${String(exhaustive)}`);
    }
  }
}

function resolutionBlockedByV1(
  queries: VnLastSoundCheckQueriesV1,
  invocation: Extract<VnLastSoundCheckInvocationV1, { readonly kind: "resolve" }>,
): VnLastSoundCheckRejectionV1["code"] | null {
  const outcome = evaluateInteractionResolution(
    queries.narrative.pending,
    invocation.expectedOccurrenceId,
    invocation.resolution,
    vnLastSoundCheckInteractionContextV1(queries.narrative.pending),
  );
  return outcome.kind === "accepted" ? null : outcome.code;
}

/** The same time-tick evaluator used at queue-front dispatch, fed by queries. */
function timeTickBlockedByV1(
  queries: VnLastSoundCheckQueriesV1,
  invocation: Extract<VnLastSoundCheckInvocationV1, { readonly kind: "time" }>,
): VnLastSoundCheckRejectionV1["code"] | null {
  const outcome = evaluateTimeTick(queries.narrative.pending, invocation.tick);
  return outcome.kind === "accepted" ? null : outcome.code;
}

export function projectVnLastSoundCheckNarrativeViewV1(
  queries: VnLastSoundCheckQueriesV1,
): VnLastSoundCheckNarrativeViewV1 {
  const pending = queries.narrative.pending;
  return ({
    phase: queries.narrative.phase,
    pending,
    signalChoice: queries.narrative.signalChoice,
    history: queries.narrative.history,
    choiceOptions: pending !== null && pending.kind === "choice"
      ? (vnLastSoundCheckChoiceOptionsForV1(pending.definitionId).map((option) => {
        return ({
          choiceId: option.choiceId,
          textId: option.textId,
        });
      }))
      : null,
  });
}

export function parseVnLastSoundCheckInvocationV1(value: unknown): VnLastSoundCheckInvocationV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid vn-last-sound-check invocation");
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === "resolve") {
    if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
      throw new TypeError("invalid vn-last-sound-check resolve invocation");
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
      throw new TypeError("invalid vn-last-sound-check time invocation");
    }
    return ({
      kind: "time",
      tick: parseTimeTick((value as { readonly tick?: unknown }).tick, "/tick"),
    });
  }
  if (kind !== "invoke" || Object.keys(value).toSorted().join("\0") !== "actionId\0kind") {
    throw new TypeError("invalid vn-last-sound-check invocation");
  }
  const actionId = (value as { readonly actionId?: unknown }).actionId;
  if (!vnLastSoundCheckActionIdsV1.includes(actionId as VnLastSoundCheckActionIdV1)) {
    throw new TypeError("unknown vn-last-sound-check action");
  }
  return ({ kind: "invoke", actionId: actionId as VnLastSoundCheckActionIdV1 });
}

export const vnLastSoundCheckSemanticAdapterV1: CoreSemanticAdapterV1<
  VnLastSoundCheckSimulationTypesV1,
  VnLastSoundCheckQueriesV1,
  VnLastSoundCheckGameViewV1,
  VnLastSoundCheckNarrativeViewV1,
  VnLastSoundCheckActionDescriptorV1,
  VnLastSoundCheckInvocationV1,
  VnLastSoundCheckPreviewV1,
  VnLastSoundCheckActionResultV1
> = {
  createQueries: (state) => simulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => simulationForSemanticV1.projectGameView(queries),
  projectNarrativeView: (queries) => projectVnLastSoundCheckNarrativeViewV1(queries),
  actions: (queries) => (vnLastSoundCheckActionIdsV1.map((actionId) => {
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
  parseInvocation: parseVnLastSoundCheckInvocationV1,
  commandForInvocation: (invocation) =>
    invocation.kind === "resolve"
      ? ({
        kind: "vn-last-sound-check.narrative_resolve" as const,
        expectedOccurrenceId: invocation.expectedOccurrenceId,
        resolution: invocation.resolution,
      })
      : invocation.kind === "time"
      ? ({ kind: "vn-last-sound-check.time_tick" as const, tick: invocation.tick })
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
      event.kind === "vn-last-sound-check.stage_changed" ? event.dispatches ?? [] : []
    ),
  projectTransientEffects: (events) => projectVnLastSoundCheckTransientEffectsV1(events),
};
