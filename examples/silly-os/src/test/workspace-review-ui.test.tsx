// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import type {
  CreatorSessionSnapshotV1,
  PreviewProgramV1,
  ProgramProposalV1,
} from "../product/contracts.ts";
import type { ProgramWorkspaceReviewProjectionV1 } from "../workspace/contracts.ts";
import { ChatPaneV1, type ChatPanePropsV1, ProgramWorkspaceReviewV1 } from "../ui/chat-pane.tsx";
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

function renderAgentChatV1(
  props: Partial<
    Pick<
      ChatPanePropsV1,
      "mutationPending" | "networkAccess" | "onSend" | "piAgentRun" | "providerModel"
    >
  >,
) {
  const { onSend = vi.fn(), ...optionalProps } = props;
  return render(
    <ChatPaneV1
      copy={getSillyOsCopyV1("en")}
      messages={[]}
      proposal={proposalV1}
      program={programV1}
      workspaceReview={null}
      workpieceOpen
      onAccept={vi.fn()}
      onReject={vi.fn()}
      onOpenWorkpiece={vi.fn()}
      onSend={onSend}
      {...optionalProps}
    />,
  );
}

describe("SillyOS Workspace composer model selection", () => {
  it("renders one Program-level network toggle that is off by default", async () => {
    const onChange = vi.fn(() => Promise.resolve(true));
    const view = renderAgentChatV1({
      networkAccess: { enabled: false, pending: false, onChange },
    });

    const toggle = screen.getByRole("checkbox", { name: "Allow network access" });
    expect(toggle).not.toBeChecked();
    expect(screen.getByRole("region", { name: "Network access" })).toHaveTextContent(
      "Off by default",
    );
    fireEvent.click(toggle);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true));

    view.rerender(
      <ChatPaneV1
        copy={getSillyOsCopyV1("en")}
        messages={[]}
        proposal={proposalV1}
        program={programV1}
        workspaceReview={null}
        workpieceOpen
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onOpenWorkpiece={vi.fn()}
        onSend={vi.fn()}
        networkAccess={{ enabled: true, pending: true, onChange }}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Allow network access" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Allow network access" })).toBeDisabled();
  });

  it("uses the shared picker and hides the persistent live Provider card when ready or completed", () => {
    const onOpenSettings = vi.fn();
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    const onForget = vi.fn();
    const providerModel = {
      status: "ready" as const,
      selectedValue: "builtin:anthropic:claude-sonnet-5",
      options: [
        {
          value: "builtin:anthropic:claude-sonnet-5",
          modelName: "Claude Sonnet 5",
          providerName: "Anthropic",
        },
        {
          value: "builtin:anthropic:claude-opus-5",
          modelName: "Claude Opus 5",
          providerName: "Anthropic",
        },
      ],
      onSelect,
      onOpenSettings,
    };
    const readyRun = {
      runtime: "pi_provider" as const,
      status: "ready" as const,
      draft: "",
      diagnosticPath: null,
      onCancel,
      onForget,
    };
    const view = renderAgentChatV1({ providerModel, piAgentRun: readyRun });

    expect(screen.queryByText("Model Provider")).toBeNull();
    expect(screen.queryByRole("button", { name: "Forget Provider key" })).toBeNull();
    const picker = screen.getByRole("combobox", { name: "Agent Creator model" });
    expect(picker).toHaveAttribute(
      "data-selected-value",
      "builtin:anthropic:claude-sonnet-5",
    );
    expect(picker).toBeEnabled();

    fireEvent.click(picker);
    const option = screen.getByRole("option", { name: /Claude Sonnet 5/u });
    expect(option).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Model settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(picker).toHaveAttribute("aria-expanded", "false");

    view.rerender(
      <ChatPaneV1
        copy={getSillyOsCopyV1("en")}
        messages={[]}
        proposal={proposalV1}
        program={programV1}
        workspaceReview={null}
        workpieceOpen
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onOpenWorkpiece={vi.fn()}
        onSend={vi.fn()}
        providerModel={providerModel}
        piAgentRun={{ ...readyRun, status: "completed" }}
      />,
    );
    expect(screen.queryByText("Model Provider")).toBeNull();
    expect(screen.queryByRole("button", { name: "Forget Provider key" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Agent Creator model" })).toBeEnabled();
  });

  it("disables the shared picker while a model switch settles without restoring a live card", () => {
    const onSend = vi.fn();
    renderAgentChatV1({
      onSend,
      providerModel: {
        status: "initializing",
        selectedValue: "builtin:anthropic:claude-sonnet-5",
        options: [
          {
            value: "builtin:anthropic:claude-sonnet-5",
            modelName: "Claude Sonnet 5",
            providerName: "Anthropic",
          },
          {
            value: "builtin:anthropic:claude-opus-5",
            modelName: "Claude Opus 5",
            providerName: "Anthropic",
          },
        ],
        onSelect: vi.fn(),
        onOpenSettings: vi.fn(),
      },
      piAgentRun: {
        runtime: "pi_provider",
        status: "ready",
        draft: "",
        diagnosticPath: null,
        onCancel: vi.fn(),
        onForget: vi.fn(),
      },
    });

    const picker = screen.getByRole("combobox", { name: "Agent Creator model" });
    expect(picker).toBeDisabled();
    expect(picker.closest("[data-model-state]"))
      .toHaveAttribute("data-model-state", "initializing");
    expect(screen.getByText("Switching model…")).toBeVisible();
    expect(screen.queryByText("Model Provider")).toBeNull();
    expect(screen.queryByRole("button", { name: "Forget Provider key" })).toBeNull();
    const followUp = screen.getByRole("textbox", { name: "Ask for a change…" });
    fireEvent.change(followUp, { target: { value: "Do not use the previous model." } });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.keyDown(followUp, { key: "Enter", shiftKey: false });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the model picker during a live run while retaining its Cancel control", () => {
    const onCancel = vi.fn();
    const view = renderAgentChatV1({
      mutationPending: true,
      providerModel: {
        status: "ready",
        selectedValue: "builtin:openai:gpt-latest",
        options: [
          {
            value: "builtin:openai:gpt-latest",
            modelName: "GPT latest",
            providerName: "OpenAI",
          },
        ],
        onSelect: vi.fn(),
        onOpenSettings: vi.fn(),
      },
      piAgentRun: {
        runtime: "pi_provider",
        status: "running",
        draft: "Preparing the revised Program.",
        diagnosticPath: null,
        onCancel,
        onForget: vi.fn(),
      },
    });

    expect(screen.getByRole("combobox", { name: "Agent Creator model" })).toBeDisabled();
    expect(screen.queryByText("Model Provider")).toBeNull();
    expect(screen.queryByRole("button", { name: "Forget Provider key" })).toBeNull();
    expect(view.container.querySelector('[data-pi-agent-runtime="pi_provider"]')).toHaveAttribute(
      "data-pi-agent-run-status",
      "running",
    );
    expect(screen.getByText("Preparing the revised Program.")).toBeVisible();
    const cancel = screen.getByRole("button", { name: "Cancel run" });
    expect(cancel).toBeEnabled();
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("preserves the deterministic Pi test status and Forget-key card contract", () => {
    const onForget = vi.fn();
    const view = renderAgentChatV1({
      piAgentRun: {
        runtime: "deterministic_test",
        status: "ready",
        draft: "",
        diagnosticPath: null,
        onCancel: vi.fn(),
        onForget,
      },
    });

    expect(view.container.querySelector('[data-pi-agent-runtime="deterministic_test"]'))
      .toHaveAttribute("data-pi-agent-run-status", "ready");
    expect(screen.getByText("Browser Pi wiring check")).toBeVisible();
    expect(screen.getByText("Pi test ready")).toBeVisible();
    const forget = screen.getByRole("button", { name: "Forget test key" });
    expect(forget).toBeEnabled();
    fireEvent.click(forget);
    expect(onForget).toHaveBeenCalledOnce();
  });
});

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
