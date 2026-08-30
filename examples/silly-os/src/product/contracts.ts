// SPDX-License-Identifier: MIT

/** Identifies the deterministic producer of the initial preview Program. */
export type CreatorSourceV1 = "deterministic_fake_preview";

export type CreatorSessionRouteV1 = "home" | "workspace";
export type ProgramProposalStatusV1 = "pending" | "accepted" | "rejected";
export type PreviewProgramKindV1 = "translation" | "writing" | "roleplay" | "general";

export const creatorAgentTextMaximumCharactersV1 = 4_000;
export const creatorAgentFinalReplyMaximumCharactersV1 = 8_192;

export interface CreatorChatMessageV1 {
  readonly messageId: string;
  readonly role: "user" | "creator";
  readonly text: string;
}

export interface PreviewProgramCapabilityV1 {
  readonly capabilityId: string;
  readonly label: string;
  readonly description: string;
}

export interface PreviewProgramV1 {
  readonly programId: string;
  /** Monotonic within this Program. The preview starts at 1. */
  readonly revision: number;
  readonly kind: PreviewProgramKindV1;
  readonly name: string;
  readonly purpose: string;
  /** The initial intent followed by each admitted follow-up in revision order. */
  readonly requirements: readonly string[];
  /** Proposed composition only. This preview does not install or activate Mods. */
  readonly suggestedCapabilities: readonly PreviewProgramCapabilityV1[];
}

export interface ProgramProposalReferenceV1 {
  readonly proposalId: string;
  /** The exact Program revision presented for review. */
  readonly programRevision: number;
}

export interface ProgramProposalV1 extends ProgramProposalReferenceV1 {
  readonly status: ProgramProposalStatusV1;
}

/** Product payload serialized into the public Agent Session submit text field. */
export interface CreatorAgentSubmitV1 {
  readonly revision: 1;
  readonly proposalId: string;
  readonly programId: string;
  readonly baseProgramRevision: number;
  readonly text: string;
}

/** Product-owned identity and exact Program base for one accepted Creator run. */
export interface CreatorAgentRunRequestV1 {
  readonly agentRunId: string;
  readonly proposalId: string;
  readonly programId: string;
  readonly baseProgramRevision: number;
  readonly baseRepositoryRevision: number;
  readonly text: string;
}

/** Complete inert Agent result. Applying it still requires a current-session recheck. */
export interface CreatorProgramRevisionCandidateV1 {
  readonly revision: 1;
  readonly proposalId: string;
  readonly programId: string;
  readonly baseProgramRevision: number;
  readonly text: string;
  readonly requirement: string;
}

export interface CreatorProgramRevisionBaseV1 {
  readonly proposalId: string;
  readonly programId: string;
  readonly baseProgramRevision: number;
}

export type CreatorAgentDiagnosticCodeV1 =
  | "unconfigured"
  | "connection_failed"
  | "request_failed"
  | "protocol_invalid"
  | "submit_invalid"
  | "candidate_invalid"
  | "draft_too_large"
  | "run_failed"
  | "disposed";

export type CreatorAgentRunOutcomeV1 = "completed" | "failed" | "cancelled" | "replaced";

/**
 * Target-neutral terminal projection. Pi session/run identifiers are transient
 * transport fences and never enter this product-owned value.
 */
export type CreatorAgentTerminalRunV1 =
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

export type CreatorActivityKindV1 =
  | "intent_submitted"
  | "follow_up_submitted"
  | "proposal_created"
  | "proposal_revised"
  | "proposal_accepted"
  | "proposal_rejected"
  | "agent_run_failed"
  | "agent_run_cancelled"
  | "agent_run_replaced";

export interface CreatorActivityV1 {
  readonly activityId: string;
  readonly sequence: number;
  readonly kind: CreatorActivityKindV1;
  readonly summary: string;
}

export interface CreatorWorkspaceV1 {
  readonly workspaceId: string;
  readonly intent: string;
  readonly title: string;
}

export interface CreatorSessionSnapshotV1 {
  readonly revision: number;
  readonly source: CreatorSourceV1;
  readonly route: CreatorSessionRouteV1;
  readonly workspace: CreatorWorkspaceV1 | null;
  readonly messages: readonly CreatorChatMessageV1[];
  readonly proposal: ProgramProposalV1 | null;
  readonly program: PreviewProgramV1 | null;
  readonly activity: readonly CreatorActivityV1[];
}

export interface CreatorPreviewResultV1 {
  readonly title: string;
  readonly creatorReply: string;
  readonly program: PreviewProgramV1;
}

/** Product-local preview port. A future Pi-backed product path will use a separate RPC boundary. */
export interface CreatorPreviewPortV1 {
  readonly source: CreatorSourceV1;
  create(input: {
    readonly intent: string;
    readonly workspaceId: string;
  }): CreatorPreviewResultV1;
  followUp(input: {
    readonly workspace: CreatorWorkspaceV1;
    readonly program: PreviewProgramV1;
    readonly text: string;
  }): string;
}

export type CreatorSubmitResultV1 =
  | { readonly kind: "created"; readonly workspaceId: string }
  | { readonly kind: "rejected"; readonly reason: "empty_intent" | "intent_too_long" };

export type CreatorProposalDecisionResultV1 =
  | {
    readonly kind: "applied";
    readonly status: "accepted" | "rejected";
    readonly proposal: ProgramProposalReferenceV1;
  }
  | {
    readonly kind: "unchanged";
    readonly status: ProgramProposalStatusV1;
    readonly proposal: ProgramProposalReferenceV1;
  }
  | { readonly kind: "stale"; readonly current: ProgramProposalReferenceV1 }
  | { readonly kind: "unavailable" };

export type CreatorFollowUpResultV1 =
  | { readonly kind: "sent"; readonly programRevision: number }
  | { readonly kind: "rejected"; readonly reason: "empty_message" | "message_too_long" }
  | { readonly kind: "unavailable" };

export type CreatorProgramRevisionApplyResultV1 =
  | { readonly kind: "applied"; readonly proposal: ProgramProposalReferenceV1 }
  | { readonly kind: "stale"; readonly current: CreatorProgramRevisionBaseV1 }
  | {
    readonly kind: "rejected";
    readonly reason:
      | "candidate_invalid"
      | "assistant_reply_empty"
      | "assistant_reply_too_long";
  }
  | { readonly kind: "unavailable" };

export type CreatorAgentTerminalApplyResultV1 =
  | {
    readonly kind: "applied";
    readonly outcome: CreatorAgentRunOutcomeV1;
  }
  | { readonly kind: "stale"; readonly current: CreatorProgramRevisionBaseV1 }
  | {
    readonly kind: "rejected";
    readonly reason:
      | "terminal_invalid"
      | "candidate_invalid"
      | "assistant_reply_empty"
      | "assistant_reply_too_long";
  }
  | { readonly kind: "unavailable" };

export interface CreatorSessionV1 {
  getSnapshot(): CreatorSessionSnapshotV1;
  subscribe(listener: () => void): () => void;
  submitIntent(intent: string): CreatorSubmitResultV1;
  sendFollowUp(text: string): CreatorFollowUpResultV1;
  applyProgramRevisionCandidate(input: {
    readonly candidate: CreatorProgramRevisionCandidateV1;
    readonly finalAssistantReply: string;
  }): CreatorProgramRevisionApplyResultV1;
  applyAgentRunTerminal(input: CreatorAgentTerminalRunV1): CreatorAgentTerminalApplyResultV1;
  acceptProposal(expected: ProgramProposalReferenceV1): CreatorProposalDecisionResultV1;
  rejectProposal(expected: ProgramProposalReferenceV1): CreatorProposalDecisionResultV1;
  openHome(): boolean;
}
