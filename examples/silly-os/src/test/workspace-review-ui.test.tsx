// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import type {
  CreatorSessionSnapshotV1,
  PreviewProgramV1,
  ProgramProposalV1,
} from "../product/contracts.ts";
import type { ProgramWorkspaceReviewProjectionV1 } from "../workspace/contracts.ts";
import { ChatPaneV1, ProgramWorkspaceReviewV1 } from "../ui/chat-pane.tsx";
import { ProgramWorkspaceV1 } from "../ui/program-workspace.tsx";

afterEach(cleanup);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class ResizeObserverV1 {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  });
});

const programV1: PreviewProgramV1 = {
  programId: "program.workspace.review-ui",
  revision: 2,
  kind: "general",
  name: "Review studio",
  purpose: "Keep exact reviewed workspace bytes visible.",
  requirements: ["Keep review exact."],
  suggestedCapabilities: [],
};

const proposalV1: ProgramProposalV1 = {
  proposalId: "proposal.workspace.review-ui.2",
  programRevision: 2,
  status: "pending",
};

const changedReviewV1: ProgramWorkspaceReviewProjectionV1 = {
  revision: 1,
  latestAccepted: {
    snapshotId: "snapshot.workspace.review-ui.accepted.1",
    programRevision: 1,
    checkpointId: "checkpoint.workspace.review-ui.accepted.1",
    generation: 4,
    fileCount: 1_001,
    archiveBytes: 21_897_216,
  },
  pendingReview: {
    proposalId: proposalV1.proposalId,
    programRevision: proposalV1.programRevision,
    checkpointId: "checkpoint.workspace.review-ui.reviewed.2",
    generation: 5,
  },
  mutableHead: {
    checkpointId: "checkpoint.workspace.review-ui.mutable.3",
    generation: 6,
  },
  acceptedStatus: "changed",
  pendingStatus: "changed",
};

const snapshotV1: CreatorSessionSnapshotV1 = {
  revision: 1,
  source: "deterministic_fake_preview",
  route: "workspace",
  workspace: {
    workspaceId: "workspace.review-ui",
    intent: "Keep review currentness truthful.",
    title: "Review studio",
  },
  messages: [],
  proposal: proposalV1,
  program: programV1,
  activity: [],
};

function renderChatV1(
  review: ProgramWorkspaceReviewProjectionV1 | null,
  proposal: ProgramProposalV1 = proposalV1,
) {
  return render(
    <ChatPaneV1
      copy={getSillyOsCopyV1("en")}
      messages={[]}
      proposal={proposal}
      program={programV1}
      workspaceReview={review}
      workpieceOpen
      onAccept={vi.fn()}
      onReject={vi.fn()}
      onOpenWorkpiece={vi.fn()}
      onSend={vi.fn()}
    />,
  );
}

describe("SillyOS Workspace review presentation", () => {
  it("shows exact accepted, reviewed, and mutable heads and gates only stale Accept", () => {
    renderChatV1(changedReviewV1);

    expect(screen.getByRole("region", { name: "Workspace review" })).toBeVisible();
    expect(screen.getByText("snapshot.workspace.review-ui.accepted.1")).toBeVisible();
    expect(screen.getByText("checkpoint.workspace.review-ui.accepted.1")).toBeVisible();
    expect(screen.getByText("checkpoint.workspace.review-ui.reviewed.2")).toBeVisible();
    expect(screen.getByText("checkpoint.workspace.review-ui.mutable.3")).toBeVisible();
    expect(screen.getByText("1,001")).toBeVisible();
    expect(screen.getByText("21,897,216")).toBeVisible();

    const accept = screen.getByRole("button", { name: "Accept program" });
    expect(accept).toBeDisabled();
    expect(accept).toHaveAttribute("aria-describedby", "workspace-review-pending-status");
    expect(document.getElementById("workspace-review-pending-status")).toHaveTextContent(
      "The workspace changed after this proposal was reviewed.",
    );
    expect(screen.getByRole("button", { name: "Reject proposal" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Those changes are not accepted.",
    );
  });

  it("reports unavailable mutable truth without claiming a mismatch or disabling Accept", () => {
    renderChatV1({
      ...changedReviewV1,
      mutableHead: null,
      acceptedStatus: "unavailable",
      pendingStatus: "unavailable",
    });

    const accept = screen.getByRole("button", { name: "Accept program" });
    expect(accept).toBeEnabled();
    expect(accept).not.toHaveAttribute("aria-describedby");
    expect(screen.getByText("Unavailable")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "its relationship to this proposal is unknown",
    );
  });

  it("keeps accepted identity after a later rejected proposal and hides empty projections", () => {
    const view = renderChatV1(
      {
        ...changedReviewV1,
        pendingReview: null,
        pendingStatus: null,
      },
      { ...proposalV1, status: "rejected" },
    );

    expect(screen.getByRole("region", { name: "Workspace review" })).toBeVisible();
    expect(screen.getByText("snapshot.workspace.review-ui.accepted.1")).toBeVisible();

    view.rerender(
      <ProgramWorkspaceReviewV1
        copy={getSillyOsCopyV1("zh-CN")}
        review={{
          revision: 1,
          latestAccepted: null,
          pendingReview: null,
          mutableHead: changedReviewV1.mutableHead,
          acceptedStatus: null,
          pendingStatus: null,
        }}
      />,
    );
    expect(screen.queryByRole("region", { name: "工作区审查" })).toBeNull();
  });

  it("renders the same review contract with Chinese copy", () => {
    render(
      <ProgramWorkspaceReviewV1 copy={getSillyOsCopyV1("zh-CN")} review={changedReviewV1} />,
    );

    expect(screen.getByRole("region", { name: "工作区审查" })).toBeVisible();
    expect(screen.getByText("当前工作版本头")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("这些变化尚未被接受");
  });

  it("stops presenting an old Authority head as current when live execution advances or fails", () => {
    const exactReview: ProgramWorkspaceReviewProjectionV1 = {
      ...changedReviewV1,
      mutableHead: {
        checkpointId: changedReviewV1.pendingReview?.checkpointId ?? "missing",
        generation: 5,
      },
      pendingStatus: "matches",
    };
    const view = render(
      <ProgramWorkspaceV1
        copy={getSillyOsCopyV1("en")}
        snapshot={snapshotV1}
        workspaceReview={exactReview}
        executionWorkspace={{
          phase: "open",
          descriptor: { workspaceSessionId: "workspace-session.review-ui", generation: 6 },
          lastReceipt: null,
          diagnostic: null,
        }}
        onHome={vi.fn()}
        onLocaleChange={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onSend={vi.fn()}
      />,
    );

    const workspace = screen.getByRole("main", { name: "SillyOS program workspace" });
    expect(workspace).toHaveAttribute("data-execution-workspace-generation", "6");
    expect(workspace).toHaveAttribute("data-workspace-review-pending-status", "changed");
    expect(workspace).not.toHaveAttribute("data-workspace-review-mutable-checkpoint-id");
    expect(workspace).not.toHaveAttribute("data-workspace-review-mutable-generation");
    expect(screen.getByText("Unavailable")).toBeVisible();
    expect(screen.getByRole("button", { name: "Accept program" })).toBeDisabled();

    view.rerender(
      <ProgramWorkspaceV1
        copy={getSillyOsCopyV1("en")}
        snapshot={snapshotV1}
        workspaceReview={exactReview}
        mutationPending
        executionWorkspace={{
          phase: "failed",
          descriptor: { workspaceSessionId: "workspace-session.review-ui", generation: 6 },
          lastReceipt: null,
          diagnostic: { code: "recovery_required", path: "workspace/review" },
        }}
        onHome={vi.fn()}
        onLocaleChange={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onSend={vi.fn()}
      />,
    );

    expect(workspace).toHaveAttribute("data-workspace-review-accepted-status", "unavailable");
    expect(workspace).toHaveAttribute("data-workspace-review-pending-status", "unavailable");
    expect(workspace).not.toHaveAttribute("data-workspace-review-mutable-checkpoint-id");
    expect(screen.getByRole("status")).toHaveTextContent(
      "its relationship to this proposal is unknown",
    );
  });
});
