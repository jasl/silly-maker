// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  createCreatorSessionV1,
  creatorFollowUpMaximumCharactersV1,
  creatorIntentMaximumCharactersV1,
} from "../product/creator-session.ts";
import {
  creatorAgentFinalReplyMaximumCharactersV1,
  creatorAgentTextMaximumCharactersV1,
  type CreatorAgentRunRequestV1,
  type CreatorAgentTerminalRunV1,
  type CreatorProgramRevisionCandidateV1,
  type CreatorSessionV1,
  type ProgramProposalReferenceV1,
} from "../product/contracts.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";

function createSessionV1() {
  return createCreatorSessionV1({ creator: createDeterministicFakeCreatorV1() });
}

function currentProposalReferenceV1(session: CreatorSessionV1): ProgramProposalReferenceV1 {
  const proposal = session.getSnapshot().proposal;
  if (proposal === null) throw new Error("expected a current proposal");
  return {
    proposalId: proposal.proposalId,
    programRevision: proposal.programRevision,
  };
}

function currentAgentRunV1(
  session: CreatorSessionV1,
  overrides: Partial<CreatorAgentRunRequestV1> = {},
): CreatorAgentRunRequestV1 {
  const snapshot = session.getSnapshot();
  const proposal = snapshot.proposal;
  const program = snapshot.program;
  if (proposal === null || program === null) throw new Error("expected a current Program");
  return {
    agentRunId: "agent-run.1",
    proposalId: proposal.proposalId,
    programId: program.programId,
    baseProgramRevision: program.revision,
    baseRepositoryRevision: 1,
    text: "Make the review step more explicit.",
    ...overrides,
  };
}

function completedAgentTerminalV1(
  session: CreatorSessionV1,
  overrides: Partial<Extract<CreatorAgentTerminalRunV1, { readonly outcome: "completed" }>> = {},
): Extract<CreatorAgentTerminalRunV1, { readonly outcome: "completed" }> {
  const run = currentAgentRunV1(session);
  return {
    run,
    outcome: "completed",
    candidate: {
      revision: 1,
      proposalId: run.proposalId,
      programId: run.programId,
      baseProgramRevision: run.baseProgramRevision,
      text: run.text,
      requirement: "Require an explicit human review checkpoint.",
    },
    finalAssistantReply: "I prepared Program proposal v2 for review.",
    ...overrides,
  };
}

describe("SillyOS Creator preview session", () => {
  it("starts at Home and creates one deterministic translation workspace", () => {
    const first = createSessionV1();
    const second = createSessionV1();
    const listener = vi.fn();
    first.subscribe(listener);

    expect(first.getSnapshot()).toEqual({
      revision: 0,
      source: "deterministic_fake_preview",
      route: "home",
      workspace: null,
      messages: [],
      proposal: null,
      program: null,
      activity: [],
    });

    expect(first.submitIntent("  请翻译这份游戏文本，并保留人工审校。  ")).toEqual({
      kind: "created",
      workspaceId: "workspace.preview.1",
    });
    second.submitIntent("请翻译这份游戏文本，并保留人工审校。");

    const snapshot = first.getSnapshot();
    expect(snapshot).toEqual(second.getSnapshot());
    expect(snapshot.route).toBe("workspace");
    expect(snapshot.workspace?.intent).toBe("请翻译这份游戏文本，并保留人工审校。");
    expect(snapshot.proposal).toEqual({
      proposalId: "workspace.preview.1.proposal.1",
      programRevision: 1,
      status: "pending",
    });
    expect(snapshot.program).toMatchObject({
      kind: "translation",
      name: "翻译工作间",
      revision: 1,
      requirements: ["请翻译这份游戏文本，并保留人工审校。"],
    });
    expect(snapshot.program?.suggestedCapabilities).toHaveLength(3);
    expect(snapshot.messages.map(({ role }) => role)).toEqual(["user", "creator"]);
    expect(snapshot.activity.map(({ kind }) => kind)).toEqual([
      "intent_submitted",
      "proposal_created",
    ]);
    expect(snapshot.messages[1]?.text).toContain("根据你的意图");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("accepts or rejects a proposal once and records the visible decision", () => {
    const accepted = createSessionV1();
    accepted.submitIntent("Draft a short story with an editable outline.");
    const before = accepted.getSnapshot();
    const acceptedProposal = currentProposalReferenceV1(accepted);

    expect(accepted.acceptProposal(acceptedProposal)).toEqual({
      kind: "applied",
      status: "accepted",
      proposal: acceptedProposal,
    });
    expect(accepted.getSnapshot().revision).toBe(before.revision + 1);
    expect(accepted.getSnapshot().proposal?.status).toBe("accepted");
    expect(accepted.getSnapshot().activity.at(-1)?.kind).toBe("proposal_accepted");
    expect(accepted.getSnapshot().messages.at(-1)?.text).toContain("Proposal v1 accepted");
    expect(accepted.rejectProposal(acceptedProposal)).toEqual({
      kind: "unchanged",
      status: "accepted",
      proposal: acceptedProposal,
    });

    const rejected = createSessionV1();
    rejected.submitIntent("Create a roleplay conversation for two characters.");
    const rejectedProposal = currentProposalReferenceV1(rejected);
    expect(rejected.rejectProposal(rejectedProposal)).toEqual({
      kind: "applied",
      status: "rejected",
      proposal: rejectedProposal,
    });
    expect(rejected.getSnapshot().proposal?.status).toBe("rejected");
    expect(rejected.getSnapshot().activity.at(-1)?.kind).toBe("proposal_rejected");
    expect(rejected.acceptProposal(rejectedProposal)).toEqual({
      kind: "unchanged",
      status: "rejected",
      proposal: rejectedProposal,
    });
  });

  it("rejects invalid Home input without publishing or calling the fake creator", () => {
    const creator = createDeterministicFakeCreatorV1();
    const create = vi.spyOn(creator, "create");
    const session = createCreatorSessionV1({ creator });
    const listener = vi.fn();
    session.subscribe(listener);

    expect(
      session.acceptProposal({ proposalId: "missing", programRevision: 1 }),
    ).toEqual({ kind: "unavailable" });
    expect(session.submitIntent("   ")).toEqual({ kind: "rejected", reason: "empty_intent" });
    expect(session.submitIntent("x".repeat(creatorIntentMaximumCharactersV1 + 1))).toEqual({
      kind: "rejected",
      reason: "intent_too_long",
    });
    expect(session.getSnapshot().route).toBe("home");
    expect(create).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("turns a follow-up into an exact successor and rejects a stale decision", () => {
    const session = createSessionV1();
    expect(session.sendFollowUp("not yet")).toEqual({ kind: "unavailable" });
    session.submitIntent("请创建一个写作助手。");
    const firstProposal = currentProposalReferenceV1(session);
    expect(session.rejectProposal(firstProposal).kind).toBe("applied");

    expect(session.sendFollowUp("先从三幕结构开始。")).toEqual({
      kind: "sent",
      programRevision: 2,
    });
    expect(session.getSnapshot().messages.at(-2)).toMatchObject({
      role: "user",
      text: "先从三幕结构开始。",
    });
    expect(session.getSnapshot().messages.at(-1)?.text).toContain("方案 v2");
    expect(session.getSnapshot().program).toMatchObject({
      revision: 2,
      requirements: ["请创建一个写作助手。", "先从三幕结构开始。"],
    });
    expect(session.getSnapshot().proposal).toEqual({
      proposalId: firstProposal.proposalId,
      programRevision: 2,
      status: "pending",
    });
    expect(session.getSnapshot().activity.slice(-2).map(({ kind }) => kind)).toEqual([
      "follow_up_submitted",
      "proposal_revised",
    ]);

    const beforeStaleDecision = session.getSnapshot();
    expect(session.acceptProposal(firstProposal)).toEqual({
      kind: "stale",
      current: {
        proposalId: firstProposal.proposalId,
        programRevision: 2,
      },
    });
    expect(
      session.acceptProposal({
        proposalId: "workspace.preview.other.proposal.1",
        programRevision: 2,
      }),
    ).toEqual({
      kind: "stale",
      current: {
        proposalId: firstProposal.proposalId,
        programRevision: 2,
      },
    });
    expect(session.getSnapshot()).toBe(beforeStaleDecision);

    const secondProposal = currentProposalReferenceV1(session);
    expect(session.acceptProposal(secondProposal)).toMatchObject({
      kind: "applied",
      status: "accepted",
      proposal: secondProposal,
    });
  });

  it("rejects invalid follow-up input without calling the creator or publishing", () => {
    const creator = createDeterministicFakeCreatorV1();
    const followUp = vi.spyOn(creator, "followUp");
    const session = createCreatorSessionV1({ creator });
    session.submitIntent("Create a focused workspace.");
    const before = session.getSnapshot();
    const listener = vi.fn();
    session.subscribe(listener);

    expect(session.sendFollowUp("   ")).toEqual({
      kind: "rejected",
      reason: "empty_message",
    });
    expect(session.sendFollowUp("x".repeat(creatorFollowUpMaximumCharactersV1 + 1))).toEqual({
      kind: "rejected",
      reason: "message_too_long",
    });
    expect(session.getSnapshot()).toBe(before);
    expect(followUp).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("atomically applies an exact external Program successor without calling the fake", () => {
    const creator = createDeterministicFakeCreatorV1();
    const followUp = vi.spyOn(creator, "followUp");
    const session = createCreatorSessionV1({ creator });
    session.submitIntent("Create a focused workspace.");
    const firstProposal = currentProposalReferenceV1(session);
    expect(session.acceptProposal(firstProposal).kind).toBe("applied");
    const before = session.getSnapshot();
    const listener = vi.fn();
    session.subscribe(listener);
    const program = before.program;
    if (program === null) throw new Error("expected a current Program");

    expect(
      session.applyProgramRevisionCandidate({
        candidate: {
          revision: 1,
          proposalId: firstProposal.proposalId,
          programId: program.programId,
          baseProgramRevision: 1,
          text: "Make the review step more explicit.",
          requirement: "Require an explicit human review checkpoint.",
        },
        finalAssistantReply: "  I prepared Program proposal v2 for review.  ",
      }),
    ).toEqual({
      kind: "applied",
      proposal: { proposalId: firstProposal.proposalId, programRevision: 2 },
    });

    const snapshot = session.getSnapshot();
    expect(snapshot.revision).toBe(before.revision + 1);
    expect(snapshot.proposal).toEqual({
      proposalId: firstProposal.proposalId,
      programRevision: 2,
      status: "pending",
    });
    expect(snapshot.program).toMatchObject({
      programId: program.programId,
      revision: 2,
      requirements: [
        "Create a focused workspace.",
        "Require an explicit human review checkpoint.",
      ],
    });
    expect(snapshot.messages.slice(-2).map(({ text }) => text)).toEqual([
      "Make the review step more explicit.",
      "I prepared Program proposal v2 for review.",
    ]);
    expect(snapshot.activity.slice(-2).map(({ kind }) => kind)).toEqual([
      "follow_up_submitted",
      "proposal_revised",
    ]);
    expect(followUp).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("rejects or stales an external candidate without partial publication", () => {
    const unavailable = createSessionV1();
    const unavailableCandidate: CreatorProgramRevisionCandidateV1 = {
      revision: 1,
      proposalId: "workspace.preview.1.proposal.1",
      programId: "program.workspace.preview.1",
      baseProgramRevision: 1,
      text: "Make a change.",
      requirement: "Make a change.",
    };
    expect(
      unavailable.applyProgramRevisionCandidate({
        candidate: unavailableCandidate,
        finalAssistantReply: "Done.",
      }),
    ).toEqual({ kind: "unavailable" });

    const session = createSessionV1();
    session.submitIntent("Create a focused workspace.");
    const snapshot = session.getSnapshot();
    const proposal = snapshot.proposal;
    const program = snapshot.program;
    if (proposal === null || program === null) throw new Error("expected a current proposal");
    const candidate: CreatorProgramRevisionCandidateV1 = {
      revision: 1,
      proposalId: proposal.proposalId,
      programId: program.programId,
      baseProgramRevision: program.revision,
      text: "Make a change.",
      requirement: "Make a change.",
    };
    const listener = vi.fn();
    session.subscribe(listener);
    const current = {
      proposalId: proposal.proposalId,
      programId: program.programId,
      baseProgramRevision: program.revision,
    };

    for (
      const staleCandidate of [
        { ...candidate, proposalId: "workspace.preview.other.proposal.1" },
        { ...candidate, programId: "program.workspace.preview.other" },
        { ...candidate, baseProgramRevision: program.revision + 1 },
      ]
    ) {
      expect(
        session.applyProgramRevisionCandidate({
          candidate: staleCandidate,
          finalAssistantReply: "Done.",
        }),
      ).toEqual({ kind: "stale", current });
    }

    expect(
      session.applyProgramRevisionCandidate({
        candidate: { ...candidate, extra: true } as CreatorProgramRevisionCandidateV1,
        finalAssistantReply: "Done.",
      }),
    ).toEqual({ kind: "rejected", reason: "candidate_invalid" });
    expect(
      session.applyProgramRevisionCandidate({
        candidate,
        finalAssistantReply: "   ",
      }),
    ).toEqual({ kind: "rejected", reason: "assistant_reply_empty" });
    expect(
      session.applyProgramRevisionCandidate({
        candidate,
        finalAssistantReply: "x".repeat(creatorAgentFinalReplyMaximumCharactersV1 + 1),
      }),
    ).toEqual({ kind: "rejected", reason: "assistant_reply_too_long" });
    expect(session.getSnapshot()).toBe(snapshot);
    expect(listener).not.toHaveBeenCalled();
  });

  it("applies a completed Agent terminal through the exact existing successor behavior", () => {
    const terminalSession = createSessionV1();
    const candidateSession = createSessionV1();
    terminalSession.submitIntent("Create a focused workspace.");
    candidateSession.submitIntent("Create a focused workspace.");
    const terminal = completedAgentTerminalV1(terminalSession, {
      finalAssistantReply: "  I prepared Program proposal v2 for review.  ",
    });

    expect(terminalSession.applyAgentRunTerminal(terminal)).toEqual({
      kind: "applied",
      outcome: "completed",
    });
    expect(
      candidateSession.applyProgramRevisionCandidate({
        candidate: terminal.candidate,
        finalAssistantReply: terminal.finalAssistantReply,
      }),
    ).toMatchObject({ kind: "applied" });

    expect(terminalSession.getSnapshot()).toEqual(candidateSession.getSnapshot());
    expect(terminalSession.getSnapshot().messages.slice(-2)).toEqual([
      expect.objectContaining({ role: "user", text: terminal.run.text }),
      expect.objectContaining({
        role: "creator",
        text: "I prepared Program proposal v2 for review.",
      }),
    ]);
    expect(terminalSession.getSnapshot().activity.slice(-2).map(({ kind }) => kind)).toEqual([
      "follow_up_submitted",
      "proposal_revised",
    ]);
  });

  it("records failed, cancelled, and replaced Agent terminals without advancing the Program", () => {
    const cases = [
      {
        outcome: "failed" as const,
        activityKind: "agent_run_failed",
        terminal: (run: CreatorAgentRunRequestV1): CreatorAgentTerminalRunV1 => ({
          run,
          outcome: "failed",
          diagnosticCode: "request_failed",
        }),
      },
      {
        outcome: "cancelled" as const,
        activityKind: "agent_run_cancelled",
        terminal: (run: CreatorAgentRunRequestV1): CreatorAgentTerminalRunV1 => ({
          run,
          outcome: "cancelled",
        }),
      },
      {
        outcome: "replaced" as const,
        activityKind: "agent_run_replaced",
        terminal: (run: CreatorAgentRunRequestV1): CreatorAgentTerminalRunV1 => ({
          run,
          outcome: "replaced",
        }),
      },
    ];

    for (const testCase of cases) {
      const session = createSessionV1();
      session.submitIntent("Create a focused workspace.");
      const before = session.getSnapshot();
      const run = currentAgentRunV1(session, { agentRunId: `agent-run.${testCase.outcome}` });

      expect(session.applyAgentRunTerminal(testCase.terminal(run))).toEqual({
        kind: "applied",
        outcome: testCase.outcome,
      });

      const after = session.getSnapshot();
      expect(after.revision).toBe(before.revision + 1);
      expect(after.program).toBe(before.program);
      expect(after.proposal).toBe(before.proposal);
      expect(after.messages).toHaveLength(before.messages.length + 1);
      expect(after.messages.at(-1)).toMatchObject({ role: "user", text: run.text });
      expect(after.activity).toHaveLength(before.activity.length + 1);
      expect(after.activity.at(-1)).toMatchObject({
        sequence: before.activity.length + 1,
        kind: testCase.activityKind,
      });
    }
  });

  it("rejects malformed or mismatched Agent terminals and stales a valid old run atomically", () => {
    const unavailable = createSessionV1();
    expect(unavailable.applyAgentRunTerminal({
      run: {
        agentRunId: "agent-run.1",
        proposalId: "workspace.preview.1.proposal.1",
        programId: "program.workspace.preview.1",
        baseProgramRevision: 1,
        baseRepositoryRevision: 1,
        text: "Make a change.",
      },
      outcome: "cancelled",
    })).toEqual({ kind: "unavailable" });

    const session = createSessionV1();
    session.submitIntent("Create a focused workspace.");
    const before = session.getSnapshot();
    const run = currentAgentRunV1(session);
    const completed = completedAgentTerminalV1(session);
    const current = {
      proposalId: run.proposalId,
      programId: run.programId,
      baseProgramRevision: run.baseProgramRevision,
    };

    for (
      const staleRun of [
        { ...run, proposalId: "workspace.preview.other.proposal.1" },
        { ...run, programId: "program.workspace.preview.other" },
        { ...run, baseProgramRevision: run.baseProgramRevision + 1 },
      ]
    ) {
      expect(session.applyAgentRunTerminal({ run: staleRun, outcome: "cancelled" })).toEqual({
        kind: "stale",
        current,
      });
    }

    expect(session.applyAgentRunTerminal({
      run: { ...run, baseRepositoryRevision: 0 },
      outcome: "cancelled",
    })).toEqual({ kind: "rejected", reason: "terminal_invalid" });
    expect(session.applyAgentRunTerminal({
      run: { ...run, text: "x".repeat(creatorAgentTextMaximumCharactersV1 + 1) },
      outcome: "cancelled",
    })).toEqual({ kind: "rejected", reason: "terminal_invalid" });
    expect(session.applyAgentRunTerminal({
      run,
      outcome: "failed",
      diagnosticCode: "unknown",
    } as unknown as CreatorAgentTerminalRunV1)).toEqual({
      kind: "rejected",
      reason: "terminal_invalid",
    });
    expect(session.applyAgentRunTerminal({
      ...completed,
      candidate: { ...completed.candidate, extra: true },
    } as unknown as CreatorAgentTerminalRunV1)).toEqual({
      kind: "rejected",
      reason: "candidate_invalid",
    });
    expect(session.applyAgentRunTerminal({
      ...completed,
      candidate: { ...completed.candidate, text: "Different text." },
    })).toEqual({ kind: "rejected", reason: "terminal_invalid" });
    expect(session.applyAgentRunTerminal({ ...completed, finalAssistantReply: "   " })).toEqual({
      kind: "rejected",
      reason: "assistant_reply_empty",
    });
    expect(session.applyAgentRunTerminal({
      ...completed,
      finalAssistantReply: "x".repeat(creatorAgentFinalReplyMaximumCharactersV1 + 1),
    })).toEqual({ kind: "rejected", reason: "assistant_reply_too_long" });
    expect(session.applyAgentRunTerminal({
      ...completed,
      extra: true,
    } as unknown as CreatorAgentTerminalRunV1)).toEqual({
      kind: "rejected",
      reason: "terminal_invalid",
    });

    expect(session.getSnapshot()).toBe(before);
  });

  it("can return to Home without persistence claims", () => {
    const session = createSessionV1();
    session.submitIntent("Create a focused workspace.");

    expect(session.openHome()).toBe(true);
    expect(session.getSnapshot()).toMatchObject({
      route: "home",
      workspace: null,
      messages: [],
      proposal: null,
      program: null,
      activity: [],
    });
    expect(session.openHome()).toBe(false);
  });

  it("unsubscribes observers and assigns a fresh local workspace on another intent", () => {
    const session = createSessionV1();
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.submitIntent("First request");
    unsubscribe();
    session.submitIntent("Second request");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().workspace?.workspaceId).toBe("workspace.preview.2");
    expect(session.getSnapshot().workspace?.intent).toBe("Second request");
  });
});
