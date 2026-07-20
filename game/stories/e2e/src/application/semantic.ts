// SPDX-License-Identifier: MIT
import type { GameHarnessSemanticAdapterV1 } from "@sillymaker/base/testkit";

import type {
  LabCommandV1,
  LabGameViewV1,
  LabQueriesV1,
  LabRejectionV1,
  LabSimulationTypesV1,
} from "../gameplay/simulation.js";
import { createLabGameSimulationV1 } from "../gameplay/simulation.js";

export type LabActionIdV1 = LabCommandV1["kind"];

export interface LabActionDescriptorV1 {
  readonly actionId: LabActionIdV1;
  readonly enabled: boolean;
  readonly blockedBy: LabRejectionV1["code"] | null;
}

export interface LabInvocationV1 {
  readonly kind: "invoke";
  readonly actionId: LabActionIdV1;
}

export type LabPreviewV1 =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly code: LabRejectionV1["code"] };

export type LabActionResultV1 =
  | { readonly kind: "committed" }
  | { readonly kind: "rejected"; readonly codes: readonly LabRejectionV1["code"][] }
  | { readonly kind: "faulted"; readonly code: string }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    };

const labActionIdsV1: readonly LabActionIdV1[] = Object.freeze([
  "lab.collect_sample",
  "lab.begin_procedure",
  "lab.advance_procedure",
  "lab.run_experiment",
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
    default: {
      const exhaustive: never = actionId;
      throw new TypeError(`unknown lab action ${String(exhaustive)}`);
    }
  }
}

export function parseLabInvocationV1(value: unknown): LabInvocationV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).toSorted().join("\0") !== "actionId\0kind" ||
    (value as { readonly kind?: unknown }).kind !== "invoke"
  ) {
    throw new TypeError("invalid lab invocation");
  }
  const actionId = (value as { readonly actionId?: unknown }).actionId;
  if (!labActionIdsV1.includes(actionId as LabActionIdV1)) {
    throw new TypeError("unknown lab action");
  }
  return Object.freeze({ kind: "invoke", actionId: actionId as LabActionIdV1 });
}

export const labSemanticAdapterV1: GameHarnessSemanticAdapterV1<
  LabSimulationTypesV1,
  LabQueriesV1,
  LabGameViewV1,
  null,
  LabActionDescriptorV1,
  LabInvocationV1,
  LabPreviewV1,
  LabActionResultV1
> = {
  createQueries: (state) => labSimulationForSemanticV1.createQueries(state as never),
  projectGameView: (queries) => labSimulationForSemanticV1.projectGameView(queries),
  projectNarrativeView: () => null,
  actions: (queries) =>
    Object.freeze(
      labActionIdsV1.map((actionId) => {
        const blockedBy = blockedByV1(queries, actionId);
        return Object.freeze({ actionId, enabled: blockedBy === null, blockedBy });
      }),
    ),
  preview: (queries, invocation) => {
    const blockedBy = blockedByV1(queries, invocation.actionId);
    return blockedBy === null
      ? Object.freeze({ kind: "allowed" as const })
      : Object.freeze({ kind: "blocked" as const, code: blockedBy });
  },
  parseInvocation: parseLabInvocationV1,
  commandForInvocation: (invocation) => Object.freeze({ kind: invocation.actionId }),
  projectDispatchResult: (result) => {
    if (result.kind === "not_executed") {
      return Object.freeze({ kind: "not_executed" as const, code: result.code });
    }
    const execution = result.execution;
    if (execution.kind === "committed") {
      // Committed facts stay engine evidence; agents observe outcomes through
      // the published game view, never through a raw fact stream.
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
