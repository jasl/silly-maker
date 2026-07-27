// SPDX-License-Identifier: MIT
import type { CoreSemanticAdapterV1 } from "@sillymaker/base/runtime";
import type { InteractionResolution } from "@sillymaker/base/story";
import {
  evaluateInteractionResolution,
  parseInteractionOccurrenceId,
  parseInteractionResolution,
} from "@sillymaker/base/story";

import type {
  BookshopCommandV1,
  BookshopGameViewV1,
  BookshopNarrativeViewV1,
  BookshopQueriesV1,
  BookshopRejectionV1,
  BookshopSimulationTypesV1,
} from "../simulation.ts";
import { createBookshopGameSimulationV1 } from "../simulation.ts";
import {
  bookshopChoiceBlockedByV1,
  bookshopChoiceOptionsForV1,
  bookshopInteractionContextV1,
} from "../narrative.ts";

/**
 * The semantic surface: what UI, agents, and automation can see and do.
 * One availability rule serves the action catalog, preview, and dispatch.
 */

export type BookshopActionIdV1 = Exclude<BookshopCommandV1["kind"], "bookshop.narrative_resolve">;

export interface BookshopActionDescriptorV1 {
  readonly actionId: BookshopActionIdV1;
  readonly enabled: boolean;
  readonly blockedBy: BookshopRejectionV1["code"] | null;
}

export type BookshopInvocationV1 =
  | { readonly kind: "invoke"; readonly actionId: BookshopActionIdV1 }
  | {
      readonly kind: "resolve";
      readonly expectedOccurrenceId: string;
      readonly resolution: InteractionResolution;
    };

export type BookshopPreviewV1 =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly code: BookshopRejectionV1["code"] };

export type BookshopActionResultV1 =
  | { readonly kind: "committed" }
  | { readonly kind: "rejected"; readonly codes: readonly BookshopRejectionV1["code"][] }
  | { readonly kind: "faulted"; readonly code: string }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    };

const bookshopActionIdsV1: readonly BookshopActionIdV1[] = Object.freeze([
  "bookshop.begin_story",
  "bookshop.earn_coin",
]);

const simulationForSemanticV1 = createBookshopGameSimulationV1();

function blockedByV1(
  queries: BookshopQueriesV1,
  actionId: BookshopActionIdV1,
): BookshopRejectionV1["code"] | null {
  switch (actionId) {
    case "bookshop.begin_story":
      return queries.narrative.pending === null ? null : "bookshop.narrative_busy";
    case "bookshop.earn_coin":
      return null;
    default: {
      const exhaustive: never = actionId;
      throw new TypeError(`unknown bookshop action ${String(exhaustive)}`);
    }
  }
}

function resolutionBlockedByV1(
  queries: BookshopQueriesV1,
  invocation: Extract<BookshopInvocationV1, { readonly kind: "resolve" }>,
): BookshopRejectionV1["code"] | null {
  const outcome = evaluateInteractionResolution(
    queries.narrative.pending,
    invocation.expectedOccurrenceId,
    invocation.resolution,
    bookshopInteractionContextV1(queries.narrative.pending, queries.coins),
  );
  return outcome.kind === "accepted" ? null : outcome.code;
}

export function projectBookshopNarrativeViewV1(
  queries: BookshopQueriesV1,
): BookshopNarrativeViewV1 {
  const pending = queries.narrative.pending;
  return Object.freeze({
    phase: queries.narrative.phase,
    pending,
    flags: queries.narrative.flags,
    history: queries.narrative.history,
    choiceOptions:
      pending !== null && pending.kind === "choice"
        ? Object.freeze(
            bookshopChoiceOptionsForV1(pending.definitionId).map((option) => {
              const blockedBy = bookshopChoiceBlockedByV1(option, queries.coins);
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

export function parseBookshopInvocationV1(value: unknown): BookshopInvocationV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid bookshop invocation");
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === "resolve") {
    if (Object.keys(value).toSorted().join("\0") !== "expectedOccurrenceId\0kind\0resolution") {
      throw new TypeError("invalid bookshop resolve invocation");
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
    throw new TypeError("invalid bookshop invocation");
  }
  const actionId = (value as { readonly actionId?: unknown }).actionId;
  if (!bookshopActionIdsV1.includes(actionId as BookshopActionIdV1)) {
    throw new TypeError("unknown bookshop action");
  }
  return Object.freeze({ kind: "invoke", actionId: actionId as BookshopActionIdV1 });
}

export const bookshopSemanticAdapterV1: CoreSemanticAdapterV1<
  BookshopSimulationTypesV1,
  BookshopQueriesV1,
  BookshopGameViewV1,
  BookshopNarrativeViewV1,
  BookshopActionDescriptorV1,
  BookshopInvocationV1,
  BookshopPreviewV1,
  BookshopActionResultV1
> = {
  createQueries: (state) => simulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => simulationForSemanticV1.projectGameView(queries),
  projectNarrativeView: (queries) => projectBookshopNarrativeViewV1(queries),
  actions: (queries) =>
    Object.freeze(
      bookshopActionIdsV1.map((actionId) => {
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
  parseInvocation: parseBookshopInvocationV1,
  commandForInvocation: (invocation) =>
    invocation.kind === "resolve"
      ? Object.freeze({
          kind: "bookshop.narrative_resolve" as const,
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
