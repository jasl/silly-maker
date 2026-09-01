// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../../../src/content/copy.ts";
import { ChatPaneV1 } from "../../../src/ui/chat-pane.tsx";
import type { ComposerModelControlV1 } from "../../../src/ui/composer-model-picker.tsx";
import { CreatorHomeV1 } from "../ui/creator-home.tsx";
import { CreatorChatSupplementV1 } from "../ui/creator-chat-supplement.tsx";
import { CreatorReadinessNoticeV1 } from "../ui/creator-readiness-notice.tsx";
import { getCreatorProgramCopyV1 } from "../ui/creator-program-copy.ts";

const getCreatorCopyV1 = (locale: "en" | "zh-CN") =>
  getCreatorProgramCopyV1(getSillyOsCopyV1(locale));

afterEach(cleanup);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

const copyV1 = getCreatorCopyV1("en");
const emptyTranscriptV1 = {
  entries: [],
  byteLength: 0,
  nextBeforeSequence: null,
  newerOmitted: false,
  phase: "ready" as const,
};
const providerModelV1: ComposerModelControlV1 = {
  status: "ready",
  selectedValue: "builtin:anthropic:claude-opus-5",
  options: [
    {
      value: "builtin:anthropic:claude-opus-5",
      modelName: "Claude Opus 5",
      providerName: "Anthropic",
    },
  ],
  reasoningEffort: {
    status: "ready",
    selectedValue: "high",
    options: ["high"],
    onSelect: vi.fn(),
  },
  onSelect: vi.fn(),
  onOpenSettings: vi.fn(),
};

describe("Creator readiness UI", () => {
  it("uses the shared passive collection pattern for recent Program states", () => {
    const { rerender } = render(
      <CreatorHomeV1
        copy={copyV1}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
        programCatalog={{
          status: "loading",
          programs: [],
          openDisabled: false,
          onEdit: vi.fn(),
          hasMore: false,
          onLoadMore: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("data-slot", "collection-state");
    expect(screen.getByRole("status")).toHaveTextContent(copyV1.programsLoading);

    rerender(
      <CreatorHomeV1
        copy={copyV1}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
        programCatalog={{
          status: "failed",
          programs: [],
          openDisabled: false,
          onEdit: vi.fn(),
          hasMore: false,
          onLoadMore: vi.fn(),
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveAttribute("data-slot", "collection-state");
    expect(screen.getByRole("alert")).toHaveTextContent(copyV1.programsUnavailable);

    rerender(
      <CreatorHomeV1
        copy={copyV1}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
        programCatalog={{
          status: "ready",
          programs: [],
          openDisabled: false,
          onEdit: vi.fn(),
          hasMore: false,
          onLoadMore: vi.fn(),
        }}
      />,
    );
    const empty = screen.getByText(copyV1.recentProgramsEmpty).closest(
      "[data-slot=collection-state]",
    );
    expect(empty).not.toBeNull();
    expect(empty).not.toHaveAttribute("role");
    expect(empty).not.toHaveAttribute("aria-live");
  });

  it("keeps Program catalog pagination explicit and disables it while the next page loads", () => {
    const onLoadMore = vi.fn();
    const program = {
      programId: "program.catalog.1",
      name: "Translation desk",
      kind: "translation" as const,
      programRevision: 1,
      proposalStatus: "pending" as const,
    };
    const view = render(
      <CreatorHomeV1
        copy={copyV1}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
        programCatalog={{
          status: "ready",
          programs: [program],
          openDisabled: false,
          onEdit: vi.fn(),
          hasMore: true,
          onLoadMore,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: copyV1.loadMorePrograms }));
    expect(onLoadMore).toHaveBeenCalledOnce();

    view.rerender(
      <CreatorHomeV1
        copy={copyV1}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
        programCatalog={{
          status: "loading_more",
          programs: [program],
          openDisabled: true,
          onEdit: vi.fn(),
          hasMore: true,
          onLoadMore,
        }}
      />,
    );

    expect(screen.getByRole("button", { name: copyV1.loadingMorePrograms })).toBeDisabled();
    expect(screen.getByRole("button", { name: `${copyV1.editProgram}: ${program.name}` }))
      .toBeDisabled();
  });

  it("renders one actionable Home blocker instead of a model picker", () => {
    const onRecover = vi.fn();
    const onCreate = vi.fn();
    const view = render(
      <CreatorHomeV1
        copy={copyV1}
        onCreate={onCreate}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
        programAgentReadiness={{ status: "credential_required", recoveryTarget: "providers" }}
        onOpenCreatorSettings={onRecover}
        providerModel={providerModelV1}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("API key required");
    expect(screen.queryByRole("combobox", { name: "Program Agent model" })).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: copyV1.programAgentTitle }), {
      target: { value: "Build a translation workspace" },
    });
    const createButton = screen.getByRole("button", { name: copyV1.create });
    expect(createButton).toBeDisabled();
    fireEvent.submit(createButton.closest("form")!);
    expect(onCreate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open Providers" }));
    expect(onRecover).toHaveBeenCalledWith("providers");
    expect(view.container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByText("Add resource")).toBeNull();
  });

  it("renders the Home picker when Creator is ready", () => {
    render(
      <CreatorHomeV1
        copy={copyV1}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
        programAgentReadiness={{ status: "ready", recoveryTarget: null }}
        providerModel={providerModelV1}
      />,
    );

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Program Agent model" })).toBeVisible();
  });

  it.each([
    {
      status: "model_required" as const,
      title: "Choose a model",
      modelStatus: "required" as const,
    },
    {
      status: "agent_failed" as const,
      title: "Program Agent unavailable",
      modelStatus: "failed" as const,
    },
  ])("keeps the Home picker available for $status", ({ status, title, modelStatus }) => {
    render(
      <CreatorHomeV1
        copy={copyV1}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        theme="system"
        onThemeChange={vi.fn()}
        programAgentReadiness={{ status, recoveryTarget: "providers" }}
        providerModel={{ ...providerModelV1, status: modelStatus }}
      />,
    );

    expect(screen.getByRole(status === "agent_failed" ? "alert" : "status")).toHaveTextContent(
      title,
    );
    expect(screen.getByRole("combobox", { name: "Program Agent model" })).toBeVisible();
    expect(screen.getByRole("button", { name: copyV1.create })).toBeDisabled();
  });

  it("keeps local proposal decisions available while Workspace Agent input is blocked", () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const onRecover = vi.fn();
    const view = render(
      <ChatPaneV1
        copy={copyV1}
        agentName={copyV1.programAgentName}
        transcript={emptyTranscriptV1}
        feedSupplement={
          <CreatorChatSupplementV1
            copy={copyV1}
            proposal={{
              proposalId: "proposal.readiness.1",
              programRevision: 1,
              status: "pending",
            }}
            program={{
              programId: "program.readiness",
              revision: 1,
              kind: "general",
              name: "Readiness studio",
              purpose: "Keep product authorities independent.",
              requirements: [],
              suggestedCapabilities: [],
            }}
            workspaceReview={null}
            workpieceOpen
            decisionPending={false}
            onAccept={onAccept}
            onReject={onReject}
            onOpenWorkpiece={vi.fn()}
          />
        }
        onSend={vi.fn()}
        interactionReady={false}
        statusNotice={
          <CreatorReadinessNoticeV1
            copy={copyV1}
            readiness={{ status: "vault_locked", recoveryTarget: "credential_vault" }}
            surface="workspace"
            onRecover={onRecover}
          />
        }
        providerModel={providerModelV1}
        agentInteractionPending
      />,
    );

    expect(screen.getByText("Credential Vault locked")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Program Agent model" })).toBeNull();
    expect(screen.getByRole("button", { name: "Accept program" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reject proposal" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Ask for a change…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Open Credential Vault" }));
    expect(onRecover).toHaveBeenCalledWith("credential_vault");
    expect(view.container.querySelector('input[type="file"]')).toBeNull();
  });

  it.each([
    {
      status: "model_required" as const,
      title: "Choose a model",
      modelStatus: "required" as const,
    },
    {
      status: "agent_failed" as const,
      title: "Program Agent unavailable",
      modelStatus: "failed" as const,
    },
  ])("keeps the Workspace model picker available for $status", ({
    status,
    title,
    modelStatus,
  }) => {
    render(
      <ChatPaneV1
        copy={copyV1}
        agentName={copyV1.programAgentName}
        transcript={emptyTranscriptV1}
        onSend={vi.fn()}
        interactionReady={false}
        modelSelectionAvailable
        statusNotice={
          <CreatorReadinessNoticeV1
            copy={copyV1}
            readiness={{ status, recoveryTarget: "providers" }}
            surface="workspace"
          />
        }
        providerModel={{ ...providerModelV1, status: modelStatus }}
      />,
    );

    expect(screen.getByText(title)).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Program Agent model" })).toBeVisible();
    expect(screen.getByRole("button", { name: copyV1.send })).toBeDisabled();
  });
});
