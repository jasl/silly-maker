// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../../content/copy.ts";
import type { ReadOnlyProcessConversationProjectionV1 } from "../process/read-only-process-conversation-controller.ts";
import { ReadOnlyProcessConversationViewV1 } from "./read-only-process-conversation.tsx";

afterEach(cleanup);

describe("read-only Process Conversation view", () => {
  it("reports a missing Workspace without hiding the durable Conversation", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const processId = "process.workspace-missing";
    const conversation: ReadOnlyProcessConversationProjectionV1 = {
      process: {
        schemaVersion: 1,
        processId,
        revision: 2,
        programPackage: {
          programId: "community.translation",
          packageVersion: "1.0.0",
          contentDigest: "a".repeat(64),
        },
        subjectProgramId: null,
        status: "active",
        transcriptFrontier: 1,
        activeAttempt: null,
        lastTerminalAttempt: null,
        checkpoint: {
          checkpointId: "checkpoint.process",
          throughSequence: 1,
          workspaceId: "workspace.missing",
          workspaceCheckpointId: "checkpoint.workspace",
          workspaceGeneration: 1,
        },
        createdAt: 1,
        updatedAt: 2,
      },
      transcript: {
        entries: [{
          schemaVersion: 1,
          processId,
          sequence: 1,
          entryId: "entry.saved",
          role: "assistant",
          state: "committed",
          parts: [{
            partId: "part.saved",
            kind: "text_markdown",
            markdown: "The saved answer remains readable.",
          }],
        }],
        byteLength: 128,
        nextBeforeSequence: null,
        newerOmitted: true,
        phase: "ready",
      },
      degradation: { capability: "workspace", code: "volume_missing" },
    };

    const onReloadLatestTranscript = vi.fn();
    render(
      <ReadOnlyProcessConversationViewV1
        copy={getSillyOsCopyV1("en")}
        conversation={conversation}
        onHome={vi.fn()}
        onLoadOlderTranscript={vi.fn()}
        onReloadLatestTranscript={onReloadLatestTranscript}
      />,
    );

    expect(screen.getByText("The saved answer remains readable.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "local Workspace is missing or was cleared",
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-degradation-code",
      "volume_missing",
    );
    screen.getByRole("button", { name: "Jump to latest messages" }).click();
    expect(onReloadLatestTranscript).toHaveBeenCalledOnce();
  });
});
