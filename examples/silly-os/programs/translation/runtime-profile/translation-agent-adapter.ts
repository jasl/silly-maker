// SPDX-License-Identifier: MIT

import type { AgentSessionDiagnosticV1 } from "@sillymaker/agent/session";

import type {
  BrowserProgramAgentAdapterV1,
  BrowserProgramAgentPreparedRunV1,
  BrowserProgramAgentStreamTransitionV1,
  BrowserProgramAgentTerminalProjectionV1,
} from "../../../src/agent/browser-program-agent-adapter.ts";
import type { BrowserProgramAgentDiagnosticV1 } from "../../../src/agent/browser-program-agent-port-contracts.ts";
import { admitInstalledProgramPackageReferenceV1 } from "../../../src/program-platform/package/program-package-archive.ts";
import type {
  TranslationAgentRunRequestV1,
  TranslationAgentTerminalDiagnosticCodeV1,
  TranslationAgentTerminalRunV1,
} from "../runtime/translation-agent-contracts.ts";
import {
  admitTranslationFollowUpContextV1,
  translationAgentFollowUpReplyMaximumCharactersV1,
  translationAgentInstructionMaximumCharactersV1,
} from "../runtime/translation-agent-contracts.ts";
import {
  admitTranslationBatchCandidateV1,
  admitTranslationBatchRequestV1,
  classifyTranslationBatchCandidateRejectionV1,
  type TranslationBatchCandidateV1,
  type TranslationBatchRequestV1,
} from "../runtime/translation-batch-protocol.ts";
import type { TranslationAgentSnapshotV1 } from "./browser-translation-agent-port.ts";
import {
  serializeBrowserPiTranslationAgentDispatchV1,
  serializeBrowserPiTranslationFollowUpDispatchV1,
} from "./translation-runtime-profile.ts";

interface TranslationBatchRunProjectionV1 {
  readonly kind: "batch";
  readonly request: TranslationBatchRequestV1;
  readonly candidate: TranslationBatchCandidateV1 | null;
}

interface TranslationFollowUpRunProjectionV1 {
  readonly kind: "follow_up";
  readonly draft: string;
}

type TranslationRunProjectionV1 =
  | TranslationBatchRunProjectionV1
  | TranslationFollowUpRunProjectionV1;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;

function diagnosticV1(
  code: BrowserProgramAgentDiagnosticV1["code"],
  path: string,
): BrowserProgramAgentDiagnosticV1 {
  return Object.freeze({ code, path });
}

function exactRecordV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    const entries: [string, unknown][] = [];
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
      entries.push([key, descriptor.value]);
    }
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

function prepareTranslationRunV1(value: unknown): BrowserProgramAgentPreparedRunV1 | null {
  const raw = value as Readonly<Record<string, unknown>> | null;
  const kind = raw?.kind;
  const commonKeys = [
    "kind",
    "agentRunId",
    "programPackage",
    "processId",
    "processAttemptGeneration",
    "workspaceCheckpointId",
    "workspaceGeneration",
    "programId",
    "expectedWorksetRevision",
    "requestedOutputTokens",
    "instruction",
  ] as const;
  const record = exactRecordV1(
    value,
    kind === "batch"
      ? [...commonKeys, "replacesCandidateId", "batch"]
      : kind === "follow_up"
      ? [...commonKeys, "context"]
      : commonKeys,
  );
  if (
    record === null || (kind !== "batch" && kind !== "follow_up") ||
    typeof record.agentRunId !== "string" ||
    !identifierPatternV1.test(record.agentRunId) ||
    typeof record.processId !== "string" || !identifierPatternV1.test(record.processId) ||
    typeof record.processAttemptGeneration !== "number" ||
    !Number.isSafeInteger(record.processAttemptGeneration) ||
    record.processAttemptGeneration <= 0 ||
    typeof record.workspaceCheckpointId !== "string" ||
    !identifierPatternV1.test(record.workspaceCheckpointId) ||
    typeof record.workspaceGeneration !== "number" ||
    !Number.isSafeInteger(record.workspaceGeneration) || record.workspaceGeneration <= 0 ||
    typeof record.programId !== "string" || !identifierPatternV1.test(record.programId) ||
    typeof record.expectedWorksetRevision !== "number" ||
    !Number.isSafeInteger(record.expectedWorksetRevision) || record.expectedWorksetRevision <= 0 ||
    typeof record.requestedOutputTokens !== "number" ||
    !Number.isSafeInteger(record.requestedOutputTokens) || record.requestedOutputTokens <= 0 ||
    typeof record.instruction !== "string" || record.instruction.length === 0 ||
    record.instruction.length > translationAgentInstructionMaximumCharactersV1 ||
    record.instruction !== record.instruction.trim()
  ) return null;
  let programPackage;
  try {
    programPackage = admitInstalledProgramPackageReferenceV1(record.programPackage);
  } catch {
    return null;
  }
  const common = {
    agentRunId: record.agentRunId,
    programPackage,
    processId: record.processId,
    processAttemptGeneration: record.processAttemptGeneration,
    workspaceCheckpointId: record.workspaceCheckpointId,
    workspaceGeneration: record.workspaceGeneration,
    programId: record.programId,
    expectedWorksetRevision: record.expectedWorksetRevision,
    requestedOutputTokens: record.requestedOutputTokens,
    instruction: record.instruction,
  } as const;
  if (kind === "follow_up") {
    const context = admitTranslationFollowUpContextV1(record.context);
    if (context === null || context.worksetRevision !== record.expectedWorksetRevision) return null;
    const run: TranslationAgentRunRequestV1 = Object.freeze({
      kind: "follow_up",
      ...common,
      context,
    });
    return Object.freeze({
      run,
      serializedSubmit: serializeBrowserPiTranslationFollowUpDispatchV1({
        programPackage,
        programId: run.programId,
        requestedOutputTokens: run.requestedOutputTokens,
        instruction: run.instruction,
        context,
      }),
      requireWorkspaceGeneration: true,
      state: Object.freeze({ kind: "follow_up", draft: "" }),
    });
  }
  if (
    record.replacesCandidateId !== null &&
    (typeof record.replacesCandidateId !== "string" ||
      !identifierPatternV1.test(record.replacesCandidateId))
  ) return null;
  const admitted = admitTranslationBatchRequestV1(record.batch);
  if (admitted.kind === "rejected") return null;
  const run: TranslationAgentRunRequestV1 = Object.freeze({
    kind: "batch",
    ...common,
    replacesCandidateId: record.replacesCandidateId,
    batch: admitted.request,
  });
  return Object.freeze({
    run,
    serializedSubmit: serializeBrowserPiTranslationAgentDispatchV1({
      programPackage,
      programId: run.programId,
      requestedOutputTokens: run.requestedOutputTokens,
      instruction: run.instruction,
      request: admitted.request,
    }),
    requireWorkspaceGeneration: true,
    state: Object.freeze({ kind: "batch", request: admitted.request, candidate: null }),
  });
}

function translationStateV1(value: object): TranslationRunProjectionV1 {
  return value as TranslationRunProjectionV1;
}

function translationRunV1(value: BrowserProgramAgentPreparedRunV1): TranslationAgentRunRequestV1 {
  return value.run as TranslationAgentRunRequestV1;
}

function terminalV1(
  value: TranslationAgentTerminalRunV1,
  diagnostic: BrowserProgramAgentDiagnosticV1 | null = null,
): BrowserProgramAgentTerminalProjectionV1 {
  return Object.freeze({
    runId: value.run.agentRunId,
    outcome: value.outcome,
    value: Object.freeze(value),
    diagnostic,
  });
}

function remoteFailureV1(
  run: TranslationAgentRunRequestV1,
  value: AgentSessionDiagnosticV1,
): BrowserProgramAgentTerminalProjectionV1 {
  const remoteCode = value.path.startsWith("/remote/") ? value.path.slice("/remote/".length) : "";
  if (remoteCode === "cancelled" || remoteCode === "replaced") {
    return terminalV1(Object.freeze({ run, outcome: remoteCode }));
  }
  const diagnosticCode: TranslationAgentTerminalDiagnosticCodeV1 =
    remoteCode === "candidate_invalid" || remoteCode === "candidate_duplicate"
      ? "candidate_structure_invalid"
      : remoteCode === "candidate_context_mismatch"
      ? "candidate_invalid"
      : remoteCode === "output_limit"
      ? "output_limit"
      : remoteCode === "candidate_missing"
      ? "protocol_invalid"
      : "run_failed";
  return terminalV1(
    Object.freeze({ run, outcome: "failed", diagnosticCode }),
    diagnosticV1(
      diagnosticCode === "candidate_structure_invalid" ? "candidate_invalid" : diagnosticCode,
      value.path,
    ),
  );
}

function protocolFailureV1(
  run: TranslationAgentRunRequestV1,
  path: string,
  cancelRemote: boolean,
): BrowserProgramAgentStreamTransitionV1 {
  return {
    kind: "terminal",
    terminal: terminalV1(
      Object.freeze({ run, outcome: "failed", diagnosticCode: "protocol_invalid" }),
      diagnosticV1("protocol_invalid", path),
    ),
    cancelRemote,
  };
}

const translationProgramAgentAdapterImplementationV1: BrowserProgramAgentAdapterV1 = {
  prepareRun(input) {
    try {
      const prepared = prepareTranslationRunV1(input);
      return Promise.resolve(
        prepared === null ? { kind: "rejected" } : { kind: "admitted", prepared },
      );
    } catch {
      return Promise.resolve({ kind: "rejected" });
    }
  },
  projectStream({ prepared, state, event }) {
    const run = translationRunV1(prepared);
    const current = translationStateV1(state);
    const correlated = run.kind === "batch"
      ? current.kind === "batch" ? { kind: "batch" as const, run, state: current } : null
      : current.kind === "follow_up"
      ? { kind: "follow_up" as const, run, state: current }
      : null;
    if (correlated === null) {
      return protocolFailureV1(run, "/run", event.kind !== "run_completed");
    }
    switch (event.kind) {
      case "output_text_delta":
        if (correlated.kind === "batch") return { kind: "ignored" };
        if (
          correlated.state.draft.length + event.text.length >
            translationAgentFollowUpReplyMaximumCharactersV1
        ) return protocolFailureV1(run, "/output_text_delta", true);
        return {
          kind: "active",
          state: Object.freeze({
            kind: "follow_up",
            draft: correlated.state.draft + event.text,
          }),
        };
      case "output_data": {
        if (correlated.kind === "follow_up") {
          return protocolFailureV1(run, "/candidate", true);
        }
        const admitted = admitTranslationBatchCandidateV1(
          event.value,
          correlated.state.request,
        );
        if (admitted.kind === "rejected" || correlated.state.candidate !== null) {
          const diagnosticCode: TranslationAgentTerminalDiagnosticCodeV1 =
            correlated.state.candidate !== null || admitted.kind === "rejected" &&
                classifyTranslationBatchCandidateRejectionV1(admitted) === "structure"
              ? "candidate_structure_invalid"
              : "candidate_invalid";
          return {
            kind: "terminal",
            terminal: terminalV1(
              Object.freeze({ run, outcome: "failed", diagnosticCode }),
              diagnosticV1("candidate_invalid", "/candidate"),
            ),
            cancelRemote: true,
          };
        }
        return {
          kind: "active",
          state: Object.freeze({
            kind: "batch",
            request: correlated.state.request,
            candidate: Object.freeze(admitted.candidate),
          }),
        };
      }
      case "run_completed":
        if (correlated.kind === "follow_up") {
          const assistantReply = correlated.state.draft.trim();
          return assistantReply.length === 0 ? protocolFailureV1(run, "/run_completed", false) : {
            kind: "terminal",
            terminal: terminalV1(Object.freeze({
              run: correlated.run,
              outcome: "completed",
              assistantReply,
            })),
            cancelRemote: false,
          };
        }
        return correlated.state.candidate === null
          ? protocolFailureV1(run, "/run_completed", false)
          : {
            kind: "terminal",
            terminal: terminalV1(Object.freeze({
              run: correlated.run,
              outcome: "completed",
              candidate: correlated.state.candidate,
            })),
            cancelRemote: false,
          };
      case "run_failed":
        return {
          kind: "terminal",
          terminal: remoteFailureV1(run, event.diagnostic),
          cancelRemote: false,
        };
    }
    const exhaustiveEvent: never = event;
    return exhaustiveEvent;
  },
  projectInterruption({ prepared, diagnosticCode, diagnostic }) {
    const run = translationRunV1(prepared);
    return terminalV1(Object.freeze({ run, outcome: "failed", diagnosticCode }), diagnostic);
  },
  projectSnapshot(input) {
    const active = input.activeState === null ? null : translationStateV1(input.activeState);
    return Object.freeze({
      revision: input.revision,
      phase: input.phase,
      distribution: input.distribution,
      activeRunId: input.activeRunId,
      candidate: active?.kind === "batch" ? active.candidate : null,
      draft: active?.kind === "follow_up" ? active.draft : "",
      terminalRuns: Object.freeze([
        ...input.terminalRuns,
      ]) as readonly TranslationAgentTerminalRunV1[],
      diagnostic: input.diagnostic,
      workspace: input.workspace,
    }) satisfies TranslationAgentSnapshotV1;
  },
};

export const translationProgramAgentAdapterV1 = Object.freeze(
  translationProgramAgentAdapterImplementationV1,
);
