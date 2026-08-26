// SPDX-License-Identifier: MIT

/** This phase is an in-browser product preview. It is not connected to Pi or another LLM. */
export type CreatorSourceV1 = "deterministic_fake_preview";

export type CreatorSessionRouteV1 = "home" | "workspace";
export type ProgramProposalStatusV1 = "pending" | "accepted" | "rejected";
export type PreviewProgramKindV1 = "translation" | "writing" | "roleplay" | "general";

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
  readonly kind: PreviewProgramKindV1;
  readonly name: string;
  readonly purpose: string;
  /** Proposed composition only. This preview does not install or activate Mods. */
  readonly suggestedCapabilities: readonly PreviewProgramCapabilityV1[];
}

export interface ProgramProposalV1 {
  readonly proposalId: string;
  readonly status: ProgramProposalStatusV1;
}

export type CreatorActivityKindV1 =
  | "intent_submitted"
  | "follow_up_submitted"
  | "proposal_created"
  | "proposal_accepted"
  | "proposal_rejected";

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
    readonly text: string;
  }): string;
}

export type CreatorSubmitResultV1 =
  | { readonly kind: "created"; readonly workspaceId: string }
  | { readonly kind: "rejected"; readonly reason: "empty_intent" | "intent_too_long" };

export type CreatorProposalDecisionResultV1 =
  | { readonly kind: "applied"; readonly status: "accepted" | "rejected" }
  | { readonly kind: "unchanged"; readonly status: ProgramProposalStatusV1 }
  | { readonly kind: "unavailable" };

export type CreatorFollowUpResultV1 =
  | { readonly kind: "sent" }
  | { readonly kind: "rejected"; readonly reason: "empty_message" | "message_too_long" }
  | { readonly kind: "unavailable" };

export interface CreatorSessionV1 {
  getSnapshot(): CreatorSessionSnapshotV1;
  subscribe(listener: () => void): () => void;
  submitIntent(intent: string): CreatorSubmitResultV1;
  sendFollowUp(text: string): CreatorFollowUpResultV1;
  acceptProposal(): CreatorProposalDecisionResultV1;
  rejectProposal(): CreatorProposalDecisionResultV1;
  openHome(): boolean;
}
