// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import type { CreatorTranscriptWindowProjectionV1 } from "../product/creator-controller.ts";
import type { TranscriptEntryV1 } from "../product/program-process-repository.ts";
import { ChatPaneV1 } from "../ui/chat-pane.tsx";

afterEach(cleanup);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

const copyV1 = getSillyOsCopyV1("en");

function transcriptV1(
  entries: readonly TranscriptEntryV1[],
  options: {
    readonly phase?: CreatorTranscriptWindowProjectionV1["phase"];
    readonly nextBeforeSequence?: number | null;
  } = {},
): CreatorTranscriptWindowProjectionV1 {
  return {
    entries,
    byteLength: 1,
    nextBeforeSequence: options.nextBeforeSequence ?? null,
    newerOmitted: false,
    phase: options.phase ?? "ready",
  };
}

function renderTranscriptV1(
  transcript: CreatorTranscriptWindowProjectionV1,
  onLoadOlderTranscript = vi.fn(),
) {
  return render(
    <ChatPaneV1
      copy={copyV1}
      transcript={transcript}
      proposal={null}
      program={null}
      workspaceReview={null}
      workpieceOpen={false}
      onAccept={vi.fn()}
      onReject={vi.fn()}
      onOpenWorkpiece={vi.fn()}
      onSend={vi.fn()}
      onLoadOlderTranscript={onLoadOlderTranscript}
    />,
  );
}

describe("SillyOS rich Process transcript", () => {
  it("renders every admitted rich part and identifies an interrupted partial response", () => {
    const entry: TranscriptEntryV1 = {
      schemaVersion: 1,
      processId: "process.rich-transcript",
      sequence: 1,
      entryId: "entry.rich-transcript.1",
      role: "assistant",
      state: "interrupted_partial",
      parts: [
        { kind: "text_markdown", partId: "part.text", markdown: "Draft paragraph" },
        {
          kind: "reasoning_summary",
          partId: "part.reasoning",
          summaryMarkdown: "Checked the source format.",
        },
        {
          kind: "tool_call",
          partId: "part.call",
          toolCallId: "tool-call.1",
          toolName: "inspect_file",
          argumentsJson: '{"path":"story.srt"}',
        },
        {
          kind: "tool_status",
          partId: "part.status",
          toolCallId: "tool-call.1",
          status: "succeeded",
          message: "Source inspected",
        },
        {
          kind: "tool_result",
          partId: "part.result",
          toolCallId: "tool-call.1",
          outcome: "succeeded",
          resultJson: '{"lines":12}',
          summaryMarkdown: "12 subtitle lines found.",
        },
        {
          kind: "artifact_reference",
          partId: "part.artifact",
          artifactId: "artifact.glossary",
          label: "Glossary draft",
          mediaType: "application/json",
          reference: "workspace://glossary.json",
        },
      ],
    };

    const view = renderTranscriptV1(transcriptV1([entry]));

    expect(screen.getByText("Draft paragraph")).toBeVisible();
    expect(screen.getByText("Reasoning summary")).toBeVisible();
    expect(screen.getByText("inspect_file")).toBeVisible();
    expect(screen.getByText("Source inspected")).toBeVisible();
    expect(screen.getByText("Tool result")).toBeVisible();
    expect(screen.getByText("Glossary draft")).toBeVisible();
    expect(screen.getByText(copyV1.transcriptInterrupted)).toBeVisible();
    expect(view.container.querySelector('[data-transcript-entry-id="entry.rich-transcript.1"]'))
      .toHaveAttribute("data-transcript-state", "interrupted_partial");
  });

  it("exposes the exact interrupted-run retry only when the host admits it", () => {
    const onRetry = vi.fn();
    const view = renderTranscriptV1(transcriptV1([]));
    expect(screen.queryByRole("button", { name: copyV1.retryInterruptedRun })).toBeNull();

    view.rerender(
      <ChatPaneV1
        copy={copyV1}
        transcript={transcriptV1([])}
        interruptedRetry={{ pending: false, onRetry }}
        proposal={null}
        program={null}
        workspaceReview={null}
        workpieceOpen={false}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onOpenWorkpiece={vi.fn()}
        onSend={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: copyV1.retryInterruptedRun }));
    expect(onRetry).toHaveBeenCalledOnce();

    view.rerender(
      <ChatPaneV1
        copy={copyV1}
        transcript={transcriptV1([])}
        interruptedRetry={{ pending: true, onRetry }}
        proposal={null}
        program={null}
        workspaceReview={null}
        workpieceOpen={false}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onOpenWorkpiece={vi.fn()}
        onSend={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: copyV1.retryInterruptedRun })).toBeDisabled();
  });

  it("loads older entries explicitly and preserves the visible prepend anchor", () => {
    const latest: TranscriptEntryV1 = {
      schemaVersion: 1,
      processId: "process.paged-transcript",
      sequence: 3,
      entryId: "entry.paged-transcript.3",
      role: "assistant",
      state: "committed",
      parts: [{ kind: "text_markdown", partId: "part.3", markdown: "Latest" }],
    };
    const older: TranscriptEntryV1 = {
      schemaVersion: 1,
      processId: "process.paged-transcript",
      sequence: 2,
      entryId: "entry.paged-transcript.2",
      role: "user",
      state: "committed",
      parts: [{ kind: "text_markdown", partId: "part.2", markdown: "Earlier" }],
    };
    const onLoadOlderTranscript = vi.fn();
    const view = renderTranscriptV1(
      transcriptV1([latest], { nextBeforeSequence: 3 }),
      onLoadOlderTranscript,
    );
    const feed = view.container.querySelector<HTMLElement>(".chat-pane__feed");
    const anchor = view.container.querySelector<HTMLElement>(
      '[data-transcript-entry-id="entry.paged-transcript.3"]',
    );
    if (feed === null || anchor === null) throw new Error("missing transcript anchor");
    let anchorTop = 100;
    feed.scrollTop = 200;
    feed.getBoundingClientRect = vi.fn(() => ({ top: 0 } as DOMRect));
    anchor.getBoundingClientRect = vi.fn(() => ({ top: anchorTop } as DOMRect));

    fireEvent.click(screen.getByRole("button", { name: copyV1.loadOlderTranscript }));
    expect(onLoadOlderTranscript).toHaveBeenCalledOnce();

    anchorTop = 160;
    view.rerender(
      <ChatPaneV1
        copy={copyV1}
        transcript={transcriptV1([older, latest], { nextBeforeSequence: null })}
        proposal={null}
        program={null}
        workspaceReview={null}
        workpieceOpen={false}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onOpenWorkpiece={vi.fn()}
        onSend={vi.fn()}
        onLoadOlderTranscript={onLoadOlderTranscript}
      />,
    );

    expect(feed.scrollTop).toBe(260);
    expect(screen.getByText("Earlier")).toBeVisible();
    expect(screen.queryByRole("button", { name: copyV1.loadOlderTranscript })).toBeNull();
  });

  it("captures and restores a Conversation anchor and composer selection across unmount", () => {
    const first: TranscriptEntryV1 = {
      schemaVersion: 1,
      processId: "process.restore",
      sequence: 1,
      entryId: "entry.restore.1",
      role: "user",
      state: "committed",
      parts: [{ kind: "text_markdown", partId: "part.restore.1", markdown: "First" }],
    };
    const second: TranscriptEntryV1 = {
      schemaVersion: 1,
      processId: "process.restore",
      sequence: 2,
      entryId: "entry.restore.2",
      role: "assistant",
      state: "committed",
      parts: [{ kind: "text_markdown", partId: "part.restore.2", markdown: "Second" }],
    };
    const captured = vi.fn();
    const view = render(
      <ChatPaneV1
        copy={copyV1}
        transcript={transcriptV1([first, second])}
        proposal={null}
        program={null}
        workspaceReview={null}
        workpieceOpen={false}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onOpenWorkpiece={vi.fn()}
        onSend={vi.fn()}
        initialDraft="0123456789"
        onConversationViewStateChange={captured}
      />,
    );
    const feed = view.container.querySelector<HTMLElement>(".chat-pane__feed");
    const firstEntry = view.container.querySelector<HTMLElement>(
      '[data-transcript-entry-id="entry.restore.1"]',
    );
    const composer = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: copyV1.sendPlaceholder,
    });
    if (feed === null || firstEntry === null) throw new Error("missing Conversation surface");
    Object.defineProperty(feed, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(feed, "scrollHeight", { configurable: true, value: 500 });
    feed.scrollTop = 120;
    feed.getBoundingClientRect = vi.fn(() => ({ top: 0, bottom: 100 } as DOMRect));
    firstEntry.getBoundingClientRect = vi.fn(() => ({ top: -20, bottom: 20 } as DOMRect));

    fireEvent.scroll(feed);
    composer.setSelectionRange(3, 7);
    fireEvent.select(composer);
    expect(captured).toHaveBeenLastCalledWith({
      scrollAnchor: {
        kind: "entry",
        entryId: "entry.restore.1",
        sequence: 1,
        offset: -20,
      },
      composerSelectionStart: 3,
      composerSelectionEnd: 7,
    });
    view.unmount();

    const restoredState = captured.mock.calls.at(-1)?.[0];
    if (restoredState === undefined) throw new Error("missing captured Conversation state");
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement): DOMRect {
        if (this.classList.contains("chat-pane__feed")) {
          return { top: 0, bottom: 100 } as DOMRect;
        }
        if (this.dataset.transcriptEntryId === "entry.restore.1") {
          return { top: 80, bottom: 120 } as DOMRect;
        }
        return { top: 0, bottom: 0 } as DOMRect;
      },
    );
    const restored = render(
      <ChatPaneV1
        copy={copyV1}
        transcript={transcriptV1([first, second])}
        proposal={null}
        program={null}
        workspaceReview={null}
        workpieceOpen={false}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onOpenWorkpiece={vi.fn()}
        onSend={vi.fn()}
        initialDraft="0123456789"
        initialConversationViewState={restoredState}
      />,
    );
    const restoredFeed = restored.container.querySelector<HTMLElement>(".chat-pane__feed");
    const restoredComposer = screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: copyV1.sendPlaceholder,
    });
    expect(restoredFeed?.scrollTop).toBe(100);
    expect(restoredComposer.selectionStart).toBe(3);
    expect(restoredComposer.selectionEnd).toBe(7);
    rect.mockRestore();
  });
});
