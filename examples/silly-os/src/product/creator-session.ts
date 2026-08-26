// SPDX-License-Identifier: MIT

import {
  creatorAgentFinalReplyMaximumCharactersV1,
  creatorAgentTextMaximumCharactersV1,
  type CreatorAgentDiagnosticCodeV1,
  type CreatorAgentRunRequestV1,
  type CreatorAgentTerminalApplyResultV1,
  type CreatorActivityV1,
  type CreatorFollowUpResultV1,
  type CreatorPreviewPortV1,
  type CreatorProgramRevisionCandidateV1,
  type CreatorProgramRevisionApplyResultV1,
  type CreatorProposalDecisionResultV1,
  type CreatorSessionSnapshotV1,
  type CreatorSessionV1,
  type CreatorSubmitResultV1,
  type ProgramProposalReferenceV1,
  type ProgramProposalV1,
} from "./contracts.ts";
import { admitCreatorProgramRevisionCandidateV1 } from "./creator-agent-admission.ts";

export const creatorIntentMaximumCharactersV1 = 4_000;
export const creatorFollowUpMaximumCharactersV1 = creatorAgentTextMaximumCharactersV1;

const creatorAgentIdentifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

type ExactRecordV1 = Readonly<Record<string, unknown>>;

type AdmittedAgentTerminalV1 =
  | {
    readonly run: CreatorAgentRunRequestV1;
    readonly outcome: "completed";
    readonly candidate: CreatorProgramRevisionCandidateV1;
    readonly finalAssistantReply: string;
  }
  | {
    readonly run: CreatorAgentRunRequestV1;
    readonly outcome: "failed";
    readonly diagnosticCode: CreatorAgentDiagnosticCodeV1;
  }
  | {
    readonly run: CreatorAgentRunRequestV1;
    readonly outcome: "cancelled" | "replaced";
  };

type AgentTerminalAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly value: AdmittedAgentTerminalV1 }
  | {
    readonly kind: "rejected";
    readonly reason:
      | "terminal_invalid"
      | "candidate_invalid"
      | "assistant_reply_empty"
      | "assistant_reply_too_long";
  };

function exactRecordV1(value: unknown, keys: readonly string[]): ExactRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")
      ) return null;
    }
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value]));
  } catch {
    return null;
  }
}

function positiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function admittedIdentifierV1(value: unknown): value is string {
  return typeof value === "string" && creatorAgentIdentifierPatternV1.test(value);
}

function admitAgentRunRequestV1(value: unknown): CreatorAgentRunRequestV1 | null {
  const record = exactRecordV1(value, [
    "agentRunId",
    "proposalId",
    "programId",
    "baseProgramRevision",
    "baseRepositoryRevision",
    "text",
  ]);
  if (
    record === null || !admittedIdentifierV1(record.agentRunId) ||
    !admittedIdentifierV1(record.proposalId) || !admittedIdentifierV1(record.programId) ||
    !positiveSafeIntegerV1(record.baseProgramRevision) ||
    !positiveSafeIntegerV1(record.baseRepositoryRevision) || typeof record.text !== "string" ||
    record.text.length === 0 || record.text.length > creatorAgentTextMaximumCharactersV1 ||
    record.text !== record.text.trim()
  ) return null;
  return {
    agentRunId: record.agentRunId,
    proposalId: record.proposalId,
    programId: record.programId,
    baseProgramRevision: record.baseProgramRevision,
    baseRepositoryRevision: record.baseRepositoryRevision,
    text: record.text,
  };
}

function isCreatorAgentDiagnosticCodeV1(value: unknown): value is CreatorAgentDiagnosticCodeV1 {
  return value === "unconfigured" || value === "connection_failed" || value === "request_failed" ||
    value === "protocol_invalid" || value === "submit_invalid" || value === "candidate_invalid" ||
    value === "draft_too_large" || value === "run_failed" || value === "disposed";
}

function rejectAgentTerminalV1(
  reason: Extract<AgentTerminalAdmissionResultV1, { readonly kind: "rejected" }>["reason"],
): AgentTerminalAdmissionResultV1 {
  return { kind: "rejected", reason };
}

function admitAgentTerminalV1(value: unknown): AgentTerminalAdmissionResultV1 {
  const completed = exactRecordV1(value, [
    "run",
    "outcome",
    "candidate",
    "finalAssistantReply",
  ]);
  if (completed !== null && completed.outcome === "completed") {
    const run = admitAgentRunRequestV1(completed.run);
    if (run === null) return rejectAgentTerminalV1("terminal_invalid");
    const candidate = admitCreatorProgramRevisionCandidateV1(completed.candidate);
    if (candidate.kind === "rejected") return rejectAgentTerminalV1("candidate_invalid");
    if (
      typeof completed.finalAssistantReply !== "string" ||
      completed.finalAssistantReply.trim().length === 0
    ) return rejectAgentTerminalV1("assistant_reply_empty");
    if (completed.finalAssistantReply.length > creatorAgentFinalReplyMaximumCharactersV1) {
      return rejectAgentTerminalV1("assistant_reply_too_long");
    }
    if (
      candidate.value.proposalId !== run.proposalId ||
      candidate.value.programId !== run.programId ||
      candidate.value.baseProgramRevision !== run.baseProgramRevision ||
      candidate.value.text !== run.text
    ) return rejectAgentTerminalV1("terminal_invalid");
    return {
      kind: "admitted",
      value: {
        run,
        outcome: "completed",
        candidate: candidate.value,
        finalAssistantReply: completed.finalAssistantReply.trim(),
      },
    };
  }

  const failed = exactRecordV1(value, ["run", "outcome", "diagnosticCode"]);
  if (failed !== null && failed.outcome === "failed") {
    const run = admitAgentRunRequestV1(failed.run);
    if (run === null || !isCreatorAgentDiagnosticCodeV1(failed.diagnosticCode)) {
      return rejectAgentTerminalV1("terminal_invalid");
    }
    return {
      kind: "admitted",
      value: { run, outcome: "failed", diagnosticCode: failed.diagnosticCode },
    };
  }

  const ended = exactRecordV1(value, ["run", "outcome"]);
  if (ended !== null && (ended.outcome === "cancelled" || ended.outcome === "replaced")) {
    const run = admitAgentRunRequestV1(ended.run);
    if (run === null) return rejectAgentTerminalV1("terminal_invalid");
    return { kind: "admitted", value: { run, outcome: ended.outcome } };
  }
  return rejectAgentTerminalV1("terminal_invalid");
}

function proposalReferenceV1(proposal: ProgramProposalV1): ProgramProposalReferenceV1 {
  return {
    proposalId: proposal.proposalId,
    programRevision: proposal.programRevision,
  };
}

function decisionMessageV1(
  status: "accepted" | "rejected",
  programRevision: number,
  chinese: boolean,
): string {
  if (status === "accepted") {
    return chinese
      ? `方案 v${String(programRevision)} 已接受。你可以继续补充要求，形成新的待审版本。`
      : `Proposal v${
        String(programRevision)
      } accepted. Follow-up requests will create a new revision for review.`;
  }
  return chinese
    ? `方案 v${
      String(programRevision)
    } 已拒绝。你可以补充背景，形成新的待审版本，或者返回首页重新开始。`
    : `Proposal v${
      String(programRevision)
    } rejected. Add context to create a new revision for review, or return home to start again.`;
}

function decisionActivityV1(
  workspaceId: string,
  sequence: number,
  status: "accepted" | "rejected",
  programRevision: number,
  chinese: boolean,
): CreatorActivityV1 {
  return {
    activityId: `${workspaceId}.activity.${String(sequence)}`,
    sequence,
    kind: status === "accepted" ? "proposal_accepted" : "proposal_rejected",
    summary: status === "accepted"
      ? (chinese
        ? `接受 Program 方案 v${String(programRevision)}`
        : `Accepted Program proposal v${String(programRevision)}`)
      : (chinese
        ? `拒绝 Program 方案 v${String(programRevision)}`
        : `Rejected Program proposal v${String(programRevision)}`),
  };
}

function agentRunActivityV1(
  workspaceId: string,
  sequence: number,
  outcome: "failed" | "cancelled" | "replaced",
  chinese: boolean,
): CreatorActivityV1 {
  const detail = outcome === "failed"
    ? {
      kind: "agent_run_failed" as const,
      summary: chinese ? "Creator Agent 运行失败" : "Creator Agent run failed",
    }
    : outcome === "cancelled"
    ? {
      kind: "agent_run_cancelled" as const,
      summary: chinese ? "取消 Creator Agent 运行" : "Cancelled Creator Agent run",
    }
    : {
      kind: "agent_run_replaced" as const,
      summary: chinese ? "替换 Creator Agent 运行" : "Replaced Creator Agent run",
    };
  return {
    activityId: `${workspaceId}.activity.${String(sequence)}`,
    sequence,
    ...detail,
  };
}

export function createEmptyCreatorSessionSnapshotV1(
  source: CreatorPreviewPortV1["source"],
): CreatorSessionSnapshotV1 {
  return {
    revision: 0,
    source,
    route: "home",
    workspace: null,
    messages: [],
    proposal: null,
    program: null,
    activity: [],
  };
}

/**
 * Product-local observable controller for the first Creator preview.
 * It owns neither an engine Session nor persistence; callers may render it with useSyncExternalStore.
 */
export function createCreatorSessionV1(input: {
  readonly creator: CreatorPreviewPortV1;
  readonly initialSnapshot?: CreatorSessionSnapshotV1;
  readonly createWorkspaceId?: () => string;
}): CreatorSessionV1 {
  const listeners = new Set<() => void>();
  let nextWorkspaceOrdinal = 0;
  let snapshot = input.initialSnapshot ?? createEmptyCreatorSessionSnapshotV1(input.creator.source);
  if (snapshot.source !== input.creator.source) {
    throw new TypeError("sillyos.creator_session.source_mismatch");
  }

  const publish = (
    next: Omit<CreatorSessionSnapshotV1, "revision" | "source">,
  ): void => {
    snapshot = {
      revision: snapshot.revision + 1,
      source: input.creator.source,
      ...next,
    };
    for (const listener of listeners) listener();
  };

  const decide = (
    status: "accepted" | "rejected",
    expected: ProgramProposalReferenceV1,
  ): CreatorProposalDecisionResultV1 => {
    const workspace = snapshot.workspace;
    const proposal = snapshot.proposal;
    if (workspace === null || proposal === null) return { kind: "unavailable" };
    const current = proposalReferenceV1(proposal);
    if (
      expected.proposalId !== current.proposalId ||
      expected.programRevision !== current.programRevision
    ) {
      return { kind: "stale", current };
    }
    if (proposal.status !== "pending") {
      return { kind: "unchanged", status: proposal.status, proposal: current };
    }

    const chinese = /[\u3400-\u9fff]/u.test(workspace.intent);
    const nextActivitySequence = snapshot.activity.length + 1;
    publish({
      route: "workspace",
      workspace,
      messages: [
        ...snapshot.messages,
        {
          messageId: `${workspace.workspaceId}.message.${String(snapshot.messages.length + 1)}`,
          role: "creator",
          text: decisionMessageV1(status, proposal.programRevision, chinese),
        },
      ],
      proposal: { ...proposal, status },
      program: snapshot.program,
      activity: [
        ...snapshot.activity,
        decisionActivityV1(
          workspace.workspaceId,
          nextActivitySequence,
          status,
          proposal.programRevision,
          chinese,
        ),
      ],
    });
    return { kind: "applied", status, proposal: current };
  };

  const publishSuccessor = (successor: {
    readonly workspace: NonNullable<CreatorSessionSnapshotV1["workspace"]>;
    readonly proposal: ProgramProposalV1;
    readonly program: NonNullable<CreatorSessionSnapshotV1["program"]>;
    readonly text: string;
    readonly requirement: string;
    readonly creatorReply: string;
  }): ProgramProposalReferenceV1 => {
    const nextProgram = {
      ...successor.program,
      revision: successor.program.revision + 1,
      requirements: [...successor.program.requirements, successor.requirement],
    };
    const firstMessageOrdinal = snapshot.messages.length + 1;
    const nextActivitySequence = snapshot.activity.length + 1;
    const chinese = /[\u3400-\u9fff]/u.test(`${successor.workspace.intent}${successor.text}`);
    const nextProposal = {
      proposalId: successor.proposal.proposalId,
      programRevision: nextProgram.revision,
    };
    publish({
      route: "workspace",
      workspace: successor.workspace,
      messages: [
        ...snapshot.messages,
        {
          messageId: `${successor.workspace.workspaceId}.message.${String(firstMessageOrdinal)}`,
          role: "user",
          text: successor.text,
        },
        {
          messageId: `${successor.workspace.workspaceId}.message.${
            String(firstMessageOrdinal + 1)
          }`,
          role: "creator",
          text: successor.creatorReply,
        },
      ],
      proposal: { ...nextProposal, status: "pending" },
      program: nextProgram,
      activity: [
        ...snapshot.activity,
        {
          activityId: `${successor.workspace.workspaceId}.activity.${
            String(
              nextActivitySequence,
            )
          }`,
          sequence: nextActivitySequence,
          kind: "follow_up_submitted",
          summary: chinese ? "补充创作要求" : "Added a creator follow-up",
        },
        {
          activityId: `${successor.workspace.workspaceId}.activity.${
            String(
              nextActivitySequence + 1,
            )
          }`,
          sequence: nextActivitySequence + 1,
          kind: "proposal_revised",
          summary: chinese
            ? `生成 Program 方案 v${String(nextProgram.revision)}`
            : `Created Program proposal v${String(nextProgram.revision)}`,
        },
      ],
    });
    return nextProposal;
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    submitIntent(rawIntent): CreatorSubmitResultV1 {
      const intent = rawIntent.trim();
      if (intent.length === 0) return { kind: "rejected", reason: "empty_intent" };
      if (intent.length > creatorIntentMaximumCharactersV1) {
        return { kind: "rejected", reason: "intent_too_long" };
      }

      nextWorkspaceOrdinal += 1;
      const workspaceId = input.createWorkspaceId?.() ??
        `workspace.preview.${String(nextWorkspaceOrdinal)}`;
      const preview = input.creator.create({ intent, workspaceId });
      const chinese = /[\u3400-\u9fff]/u.test(intent);
      publish({
        route: "workspace",
        workspace: { workspaceId, intent, title: preview.title },
        messages: [
          { messageId: `${workspaceId}.message.1`, role: "user", text: intent },
          {
            messageId: `${workspaceId}.message.2`,
            role: "creator",
            text: preview.creatorReply,
          },
        ],
        proposal: {
          proposalId: `${workspaceId}.proposal.1`,
          programRevision: preview.program.revision,
          status: "pending",
        },
        program: preview.program,
        activity: [
          {
            activityId: `${workspaceId}.activity.1`,
            sequence: 1,
            kind: "intent_submitted",
            summary: chinese ? "提交创作意图" : "Submitted a creator intent",
          },
          {
            activityId: `${workspaceId}.activity.2`,
            sequence: 2,
            kind: "proposal_created",
            summary: chinese
              ? `生成 Program 方案 v${String(preview.program.revision)}`
              : `Created Program proposal v${String(preview.program.revision)}`,
          },
        ],
      });
      return { kind: "created", workspaceId };
    },
    sendFollowUp(rawText): CreatorFollowUpResultV1 {
      const workspace = snapshot.workspace;
      const program = snapshot.program;
      const proposal = snapshot.proposal;
      if (workspace === null || program === null || proposal === null) {
        return { kind: "unavailable" };
      }
      const text = rawText.trim();
      if (text.length === 0) return { kind: "rejected", reason: "empty_message" };
      if (text.length > creatorFollowUpMaximumCharactersV1) {
        return { kind: "rejected", reason: "message_too_long" };
      }

      const creatorReply = input.creator.followUp({ workspace, program, text });
      const nextProposal = publishSuccessor({
        workspace,
        proposal,
        program,
        text,
        requirement: text,
        creatorReply,
      });
      return { kind: "sent", programRevision: nextProposal.programRevision };
    },
    applyProgramRevisionCandidate(callInput): CreatorProgramRevisionApplyResultV1 {
      const workspace = snapshot.workspace;
      const program = snapshot.program;
      const proposal = snapshot.proposal;
      if (workspace === null || program === null || proposal === null) {
        return { kind: "unavailable" };
      }
      const admitted = admitCreatorProgramRevisionCandidateV1(callInput.candidate);
      if (admitted.kind === "rejected") {
        return { kind: "rejected", reason: "candidate_invalid" };
      }
      if (
        typeof callInput.finalAssistantReply !== "string" ||
        callInput.finalAssistantReply.trim().length === 0
      ) {
        return { kind: "rejected", reason: "assistant_reply_empty" };
      }
      if (callInput.finalAssistantReply.length > creatorAgentFinalReplyMaximumCharactersV1) {
        return { kind: "rejected", reason: "assistant_reply_too_long" };
      }
      const candidate = admitted.value;
      const current = {
        proposalId: proposal.proposalId,
        programId: program.programId,
        baseProgramRevision: program.revision,
      };
      if (
        candidate.proposalId !== current.proposalId ||
        candidate.programId !== current.programId ||
        candidate.baseProgramRevision !== current.baseProgramRevision ||
        candidate.baseProgramRevision !== proposal.programRevision
      ) {
        return { kind: "stale", current };
      }
      const nextProposal = publishSuccessor({
        workspace,
        proposal,
        program,
        text: candidate.text,
        requirement: candidate.requirement,
        creatorReply: callInput.finalAssistantReply.trim(),
      });
      return { kind: "applied", proposal: nextProposal };
    },
    applyAgentRunTerminal(callInput): CreatorAgentTerminalApplyResultV1 {
      const workspace = snapshot.workspace;
      const program = snapshot.program;
      const proposal = snapshot.proposal;
      if (workspace === null || program === null || proposal === null) {
        return { kind: "unavailable" };
      }
      const terminal = admitAgentTerminalV1(callInput);
      if (terminal.kind === "rejected") {
        return { kind: "rejected", reason: terminal.reason };
      }
      const current = {
        proposalId: proposal.proposalId,
        programId: program.programId,
        baseProgramRevision: program.revision,
      };
      const run = terminal.value.run;
      if (
        run.proposalId !== current.proposalId || run.programId !== current.programId ||
        run.baseProgramRevision !== current.baseProgramRevision ||
        run.baseProgramRevision !== proposal.programRevision
      ) return { kind: "stale", current };

      if (terminal.value.outcome === "completed") {
        publishSuccessor({
          workspace,
          proposal,
          program,
          text: run.text,
          requirement: terminal.value.candidate.requirement,
          creatorReply: terminal.value.finalAssistantReply,
        });
        return { kind: "applied", outcome: "completed" };
      }

      const nextMessageOrdinal = snapshot.messages.length + 1;
      const nextActivitySequence = snapshot.activity.length + 1;
      const chinese = /[\u3400-\u9fff]/u.test(`${workspace.intent}${run.text}`);
      publish({
        route: "workspace",
        workspace,
        messages: [
          ...snapshot.messages,
          {
            messageId: `${workspace.workspaceId}.message.${String(nextMessageOrdinal)}`,
            role: "user",
            text: run.text,
          },
        ],
        proposal,
        program,
        activity: [
          ...snapshot.activity,
          agentRunActivityV1(
            workspace.workspaceId,
            nextActivitySequence,
            terminal.value.outcome,
            chinese,
          ),
        ],
      });
      return { kind: "applied", outcome: terminal.value.outcome };
    },
    acceptProposal: (expected) => decide("accepted", expected),
    rejectProposal: (expected) => decide("rejected", expected),
    openHome() {
      if (snapshot.route === "home") return false;
      publish({
        route: "home",
        workspace: null,
        messages: [],
        proposal: null,
        program: null,
        activity: [],
      });
      return true;
    },
  };
}
