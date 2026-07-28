// SPDX-License-Identifier: MIT
import type { CoreSemanticAdapterV1 } from "@sillymaker/base/runtime";
import type { InteractionResolution } from "@sillymaker/base/story";
import {
  evaluateInteractionResolution,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
} from "@sillymaker/base/story";

import type {
  TemplateCommandV1,
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateQueriesV1,
  TemplateRejectionV1,
  TemplateSimulationTypesV1,
} from "../simulation.ts";
import { createTemplateGameSimulationV1 } from "../simulation.ts";
import {
  templateChoiceBlockedByV1,
  templateChoiceOptionsForV1,
  templateInteractionContextV1,
} from "../narrative.ts";

/**
 * The semantic surface: what UI, agents, and automation can see and do.
 * One availability rule serves the action catalog, preview, and dispatch.
 */

export type TemplateActionIdV1 = Exclude<TemplateCommandV1["kind"], "template.narrative_resolve">;

export interface TemplateActionDescriptorV1 {
  readonly actionId: TemplateActionIdV1;
  readonly enabled: boolean;
  readonly blockedBy: TemplateRejectionV1["code"] | null;
}

export type TemplateInvocationV1 =
  | { readonly kind: "invoke"; readonly actionId: TemplateActionIdV1 }
  | {
      readonly kind: "resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
    };

export type TemplatePreviewV1 =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly code: TemplateRejectionV1["code"] };

export type TemplateActionResultV1 =
  | { readonly kind: "committed" }
  | { readonly kind: "rejected"; readonly codes: readonly TemplateRejectionV1["code"][] }
  | { readonly kind: "faulted"; readonly code: string }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    };

const templateActionIdsV1: readonly TemplateActionIdV1[] = Object.freeze([
  "template.begin_story",
  "template.earn_coin",
]);

const simulationForSemanticV1 = createTemplateGameSimulationV1();

function blockedByV1(
  queries: TemplateQueriesV1,
  actionId: TemplateActionIdV1,
): TemplateRejectionV1["code"] | null {
  switch (actionId) {
    case "template.begin_story":
      return queries.narrative.pending === null ? null : "template.narrative_busy";
    case "template.earn_coin":
      return null;
    default: {
      const exhaustive: never = actionId;
      throw new TypeError(`unknown template action ${String(exhaustive)}`);
    }
  }
}

function resolutionBlockedByV1(
  queries: TemplateQueriesV1,
  invocation: Extract<TemplateInvocationV1, { readonly kind: "resolve" }>,
): TemplateRejectionV1["code"] | null {
  const outcome = evaluateInteractionResolution(
    queries.narrative.pending,
    invocation.expectedOccurrenceId,
    invocation.resolution,
    templateInteractionContextV1(queries.narrative.pending, queries.coins),
  );
  return outcome.kind === "accepted" ? null : outcome.code;
}

export function projectTemplateNarrativeViewV1(
  queries: TemplateQueriesV1,
): TemplateNarrativeViewV1 {
  const pending = queries.narrative.pending;
  return Object.freeze({
    phase: queries.narrative.phase,
    pending,
    flags: queries.narrative.flags,
    history: queries.narrative.history,
    choiceOptions:
      pending !== null && pending.kind === "choice"
        ? Object.freeze(
            templateChoiceOptionsForV1(pending.definitionId).map((option) => {
              const blockedBy = templateChoiceBlockedByV1(option, queries.coins);
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

export function parseTemplateInvocationV1(value: unknown): TemplateInvocationV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid template invocation");
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === "resolve") {
    if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
      throw new TypeError("invalid template resolve invocation");
    }
    const record = value as {
      readonly expectedOccurrenceId?: unknown;
      readonly resolution?: unknown;
    };
    return Object.freeze({
      kind: "resolve",
      expectedOccurrenceId: parseInteractionOccurrenceId(record.expectedOccurrenceId),
      resolution: parseInteractionResolution(record.resolution),
    });
  }
  if (kind !== "invoke" || Object.keys(value).toSorted().join("\0") !== "actionId\0kind") {
    throw new TypeError("invalid template invocation");
  }
  const actionId = (value as { readonly actionId?: unknown }).actionId;
  if (!templateActionIdsV1.includes(actionId as TemplateActionIdV1)) {
    throw new TypeError("unknown template action");
  }
  return Object.freeze({ kind: "invoke", actionId: actionId as TemplateActionIdV1 });
}

export const templateSemanticAdapterV1: CoreSemanticAdapterV1<
  TemplateSimulationTypesV1,
  TemplateQueriesV1,
  TemplateGameViewV1,
  TemplateNarrativeViewV1,
  TemplateActionDescriptorV1,
  TemplateInvocationV1,
  TemplatePreviewV1,
  TemplateActionResultV1
> = {
  createQueries: (state) => simulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => simulationForSemanticV1.projectGameView(queries),
  projectNarrativeView: (queries) => projectTemplateNarrativeViewV1(queries),
  actions: (queries) =>
    Object.freeze(
      templateActionIdsV1.map((actionId) => {
        const blockedBy = blockedByV1(queries, actionId);
        return Object.freeze({ actionId, enabled: blockedBy === null, blockedBy });
      }),
    ),
  preview: (queries, invocation) => {
    const blockedBy =
      invocation.kind === "resolve"
        ? resolutionBlockedByV1(queries, invocation)
        : blockedByV1(queries, invocation.actionId);
    return blockedBy === null
      ? Object.freeze({ kind: "allowed" as const })
      : Object.freeze({ kind: "blocked" as const, code: blockedBy });
  },
  parseInvocation: parseTemplateInvocationV1,
  commandForInvocation: (invocation) =>
    invocation.kind === "resolve"
      ? Object.freeze({
          kind: "template.narrative_resolve" as const,
          expectedOccurrenceId: invocation.expectedOccurrenceId,
          resolution: invocation.resolution,
        })
      : Object.freeze({ kind: invocation.actionId }),
  projectDispatchResult: (result) => {
    if (result.kind === "not_executed") {
      return Object.freeze({ kind: "not_executed" as const, code: result.code });
    }
    const execution = result.execution;
    if (execution.kind === "committed") {
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
};
