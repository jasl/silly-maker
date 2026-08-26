// SPDX-License-Identifier: MIT

import type {
  CreatorActivityV1,
  CreatorFollowUpResultV1,
  CreatorPreviewPortV1,
  CreatorProposalDecisionResultV1,
  CreatorSessionSnapshotV1,
  CreatorSessionV1,
  CreatorSubmitResultV1,
} from "./contracts.ts";

export const creatorIntentMaximumCharactersV1 = 4_000;
export const creatorFollowUpMaximumCharactersV1 = 4_000;

function decisionMessageV1(status: "accepted" | "rejected", chinese: boolean): string {
  if (status === "accepted") {
    return chinese
      ? "方案已接受。你可以继续补充要求，完善这个 Program。"
      : "Proposal accepted. You can keep refining this Program with follow-up requests.";
  }
  return chinese
    ? "方案已拒绝。你可以补充背景，或者返回首页重新开始。"
    : "Proposal rejected. You can add more context or return home to start again.";
}

function decisionActivityV1(
  workspaceId: string,
  sequence: number,
  status: "accepted" | "rejected",
  chinese: boolean,
): CreatorActivityV1 {
  return {
    activityId: `${workspaceId}.activity.${String(sequence)}`,
    sequence,
    kind: status === "accepted" ? "proposal_accepted" : "proposal_rejected",
    summary: status === "accepted"
      ? (chinese ? "接受 Program 方案" : "Accepted the Program proposal")
      : (chinese ? "拒绝 Program 方案" : "Rejected the Program proposal"),
  };
}

function initialSnapshotV1(source: CreatorPreviewPortV1["source"]): CreatorSessionSnapshotV1 {
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
}): CreatorSessionV1 {
  const listeners = new Set<() => void>();
  let nextWorkspaceOrdinal = 0;
  let snapshot = initialSnapshotV1(input.creator.source);

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
  ): CreatorProposalDecisionResultV1 => {
    const workspace = snapshot.workspace;
    const proposal = snapshot.proposal;
    if (workspace === null || proposal === null) return { kind: "unavailable" };
    if (proposal.status !== "pending") {
      return { kind: "unchanged", status: proposal.status };
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
          text: decisionMessageV1(status, chinese),
        },
      ],
      proposal: { ...proposal, status },
      program: snapshot.program,
      activity: [
        ...snapshot.activity,
        decisionActivityV1(workspace.workspaceId, nextActivitySequence, status, chinese),
      ],
    });
    return { kind: "applied", status };
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
      const workspaceId = `workspace.preview.${String(nextWorkspaceOrdinal)}`;
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
        proposal: { proposalId: `${workspaceId}.proposal.1`, status: "pending" },
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
            summary: chinese ? "生成 Program 方案" : "Created a Program proposal",
          },
        ],
      });
      return { kind: "created", workspaceId };
    },
    sendFollowUp(rawText): CreatorFollowUpResultV1 {
      const workspace = snapshot.workspace;
      if (workspace === null) return { kind: "unavailable" };
      const text = rawText.trim();
      if (text.length === 0) return { kind: "rejected", reason: "empty_message" };
      if (text.length > creatorFollowUpMaximumCharactersV1) {
        return { kind: "rejected", reason: "message_too_long" };
      }

      const creatorReply = input.creator.followUp({ workspace, text });
      const firstMessageOrdinal = snapshot.messages.length + 1;
      const nextActivitySequence = snapshot.activity.length + 1;
      publish({
        route: "workspace",
        workspace,
        messages: [
          ...snapshot.messages,
          {
            messageId: `${workspace.workspaceId}.message.${String(firstMessageOrdinal)}`,
            role: "user",
            text,
          },
          {
            messageId: `${workspace.workspaceId}.message.${String(firstMessageOrdinal + 1)}`,
            role: "creator",
            text: creatorReply,
          },
        ],
        proposal: snapshot.proposal,
        program: snapshot.program,
        activity: [
          ...snapshot.activity,
          {
            activityId: `${workspace.workspaceId}.activity.${String(nextActivitySequence)}`,
            sequence: nextActivitySequence,
            kind: "follow_up_submitted",
            summary: /[\u3400-\u9fff]/u.test(`${workspace.intent}${text}`)
              ? "补充创作要求"
              : "Added a creator follow-up",
          },
        ],
      });
      return { kind: "sent" };
    },
    acceptProposal: () => decide("accepted"),
    rejectProposal: () => decide("rejected"),
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
