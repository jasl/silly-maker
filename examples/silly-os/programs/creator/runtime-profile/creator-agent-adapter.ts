// SPDX-License-Identifier: MIT

import type { AgentSessionDiagnosticV1 } from "@sillymaker/agent/session";

import type {
  BrowserProgramAgentAdapterV1,
  BrowserProgramAgentPreparedRunV1,
  BrowserProgramAgentTerminalProjectionV1,
} from "../../../src/agent/browser-program-agent-adapter.ts";
import type { BrowserProgramAgentDiagnosticV1 } from "../../../src/agent/browser-program-agent-port-contracts.ts";
import { admitInstalledProgramPackageReferenceV1 } from "../../../src/program-platform/package/program-package-archive.ts";
import type {
  CreatorAgentDiagnosticCodeV1,
  CreatorAgentRunRequestV1,
  CreatorAgentTerminalRunV1,
  CreatorProgramRevisionCandidateV1,
} from "../runtime/contracts.ts";
import {
  admitCreatorAgentSubmitV1,
  admitCreatorProgramRevisionCandidateV1,
} from "../runtime/creator-agent-admission.ts";
import type { CreatorAgentSnapshotV1 } from "./browser-creator-agent-port.ts";
import { serializeBrowserPiCreatorAgentDispatchV1 } from "./creator-runtime-profile.ts";

interface CreatorRunProjectionV1 {
  readonly draft: string;
  readonly candidate: CreatorProgramRevisionCandidateV1 | null;
}

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;

function diagnosticV1(
  code: CreatorAgentDiagnosticCodeV1,
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

function prepareCreatorRunV1(value: unknown): BrowserProgramAgentPreparedRunV1 | null {
  const record = exactRecordV1(value, [
    "agentRunId",
    "programPackage",
    "processId",
    "processAttemptGeneration",
    "workspaceCheckpointId",
    "workspaceGeneration",
    "proposalId",
    "programId",
    "baseProgramRevision",
    "baseRepositoryRevision",
    "text",
  ]);
  if (
    record === null || typeof record.agentRunId !== "string" ||
    !identifierPatternV1.test(record.agentRunId) ||
    typeof record.processId !== "string" || !identifierPatternV1.test(record.processId) ||
    typeof record.processAttemptGeneration !== "number" ||
    !Number.isSafeInteger(record.processAttemptGeneration) ||
    record.processAttemptGeneration <= 0 ||
    typeof record.workspaceCheckpointId !== "string" ||
    !identifierPatternV1.test(record.workspaceCheckpointId) ||
    typeof record.workspaceGeneration !== "number" ||
    !Number.isSafeInteger(record.workspaceGeneration) || record.workspaceGeneration <= 0 ||
    typeof record.baseRepositoryRevision !== "number" ||
    !Number.isSafeInteger(record.baseRepositoryRevision) || record.baseRepositoryRevision <= 0
  ) return null;
  const admitted = admitCreatorAgentSubmitV1({
    revision: 1,
    proposalId: record.proposalId,
    programId: record.programId,
    baseProgramRevision: record.baseProgramRevision,
    text: record.text,
  });
  if (admitted.kind === "rejected") return null;
  let programPackage;
  try {
    programPackage = admitInstalledProgramPackageReferenceV1(record.programPackage);
  } catch {
    return null;
  }
  const run: CreatorAgentRunRequestV1 = Object.freeze({
    agentRunId: record.agentRunId,
    programPackage,
    processId: record.processId,
    processAttemptGeneration: record.processAttemptGeneration,
    workspaceCheckpointId: record.workspaceCheckpointId,
    workspaceGeneration: record.workspaceGeneration,
    proposalId: admitted.value.proposalId,
    programId: admitted.value.programId,
    baseProgramRevision: admitted.value.baseProgramRevision,
    baseRepositoryRevision: record.baseRepositoryRevision,
    text: admitted.value.text,
  });
  return Object.freeze({
    run,
    serializedSubmit: serializeBrowserPiCreatorAgentDispatchV1({
      programPackage,
      submit: Object.freeze(admitted.value),
    }),
    requireWorkspaceGeneration: false,
    state: Object.freeze({ draft: "", candidate: null }),
  });
}

function creatorStateV1(value: object): CreatorRunProjectionV1 {
  return value as CreatorRunProjectionV1;
}

function creatorRunV1(value: BrowserProgramAgentPreparedRunV1): CreatorAgentRunRequestV1 {
  return value.run as CreatorAgentRunRequestV1;
}

function matchesRunV1(
  candidate: CreatorProgramRevisionCandidateV1,
  run: CreatorAgentRunRequestV1,
): boolean {
  return candidate.revision === 1 && candidate.proposalId === run.proposalId &&
    candidate.programId === run.programId &&
    candidate.baseProgramRevision === run.baseProgramRevision && candidate.text === run.text;
}

function terminalV1(
  value: CreatorAgentTerminalRunV1,
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
  run: CreatorAgentRunRequestV1,
  value: AgentSessionDiagnosticV1,
): BrowserProgramAgentTerminalProjectionV1 {
  const remoteCode = value.path.startsWith("/remote/") ? value.path.slice("/remote/".length) : "";
  if (remoteCode === "cancelled" || remoteCode === "replaced") {
    return terminalV1(Object.freeze({ run, outcome: remoteCode }));
  }
  let diagnosticCode: CreatorAgentDiagnosticCodeV1;
  switch (remoteCode) {
    case "draft_limit":
      diagnosticCode = "draft_too_large";
      break;
    case "candidate_invalid":
    case "candidate_context_mismatch":
    case "candidate_duplicate":
      diagnosticCode = "candidate_invalid";
      break;
    case "candidate_missing":
      diagnosticCode = "protocol_invalid";
      break;
    default:
      diagnosticCode = "run_failed";
      break;
  }
  return terminalV1(
    Object.freeze({ run, outcome: "failed", diagnosticCode }),
    diagnosticV1(diagnosticCode, value.path),
  );
}

const creatorProgramAgentAdapterImplementationV1: BrowserProgramAgentAdapterV1 = {
  async prepareRun(input) {
    try {
      const prepared = prepareCreatorRunV1(input);
      return prepared === null ? { kind: "rejected" } : { kind: "admitted", prepared };
    } catch {
      return { kind: "rejected" };
    }
  },
  projectStream({ prepared, state, event }) {
    const run = creatorRunV1(prepared);
    const current = creatorStateV1(state);
    switch (event.kind) {
      case "output_text_delta":
        return {
          kind: "active",
          state: Object.freeze({ draft: current.draft + event.text, candidate: current.candidate }),
        };
      case "output_data": {
        const admitted = admitCreatorProgramRevisionCandidateV1(event.value);
        if (
          admitted.kind === "rejected" || current.candidate !== null ||
          !matchesRunV1(admitted.value, run)
        ) {
          const path = admitted.kind === "rejected" ? admitted.path : "/candidate";
          return {
            kind: "terminal",
            terminal: terminalV1(
              Object.freeze({ run, outcome: "failed", diagnosticCode: "candidate_invalid" }),
              diagnosticV1("candidate_invalid", path),
            ),
            cancelRemote: true,
          };
        }
        return {
          kind: "active",
          state: Object.freeze({ draft: current.draft, candidate: Object.freeze(admitted.value) }),
        };
      }
      case "run_completed": {
        const finalAssistantReply = current.draft.trim();
        if (current.candidate === null || finalAssistantReply.length === 0) {
          return {
            kind: "terminal",
            terminal: terminalV1(
              Object.freeze({ run, outcome: "failed", diagnosticCode: "protocol_invalid" }),
              diagnosticV1("protocol_invalid", "/run_completed"),
            ),
            cancelRemote: false,
          };
        }
        return {
          kind: "terminal",
          terminal: terminalV1(Object.freeze({
            run,
            outcome: "completed",
            candidate: current.candidate,
            finalAssistantReply,
          })),
          cancelRemote: false,
        };
      }
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
    const run = creatorRunV1(prepared);
    return terminalV1(Object.freeze({ run, outcome: "failed", diagnosticCode }), diagnostic);
  },
  projectSnapshot(input) {
    const active = input.activeState === null ? null : creatorStateV1(input.activeState);
    return Object.freeze({
      revision: input.revision,
      phase: input.phase,
      distribution: input.distribution,
      activeRunId: input.activeRunId,
      draft: active?.draft ?? "",
      candidate: active?.candidate ?? null,
      terminalRuns: Object.freeze([...input.terminalRuns]) as readonly CreatorAgentTerminalRunV1[],
      diagnostic: input.diagnostic,
      workspace: input.workspace,
    }) satisfies CreatorAgentSnapshotV1;
  },
};

export const creatorProgramAgentAdapterV1 = Object.freeze(
  creatorProgramAgentAdapterImplementationV1,
);
