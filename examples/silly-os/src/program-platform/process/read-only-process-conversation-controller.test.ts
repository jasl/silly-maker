// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import { createMemoryProgramProcessRepositoryV1 } from "./memory-program-process-repository.ts";
import {
  transcriptEntryUtf8ByteLengthV1,
  type ProgramProcessRepositoryV1,
  type TranscriptEntryV1,
} from "./program-process-repository.ts";
import { createReadOnlyProcessConversationControllerV1 } from "./read-only-process-conversation-controller.ts";

const unavailableProgramPackageV1 = {
  programId: "community.program.no-longer-installed",
  packageVersion: "7.0.0",
  contentDigest: "7".repeat(64),
} as const;

function transcriptEntryV1(processId: string, sequence: number): TranscriptEntryV1 {
  return {
    schemaVersion: 1,
    processId,
    sequence,
    entryId: `${processId}.entry.${String(sequence)}`,
    role: "assistant",
    state: "committed",
    parts: [{
      kind: "text_markdown",
      partId: `${processId}.part.${String(sequence)}`,
      markdown: `Message ${String(sequence)}`,
    }],
  };
}

async function createConversationV1(
  repository: ProgramProcessRepositoryV1,
  processId: string,
  entryCount: number,
): Promise<readonly TranscriptEntryV1[]> {
  const created = await repository.createProcess({
    processId,
    programPackage: unavailableProgramPackageV1,
    subjectProgramId: null,
    createdAt: 1,
  });
  if (created.kind !== "committed") throw new Error("expected Process creation");
  const entries = Array.from(
    { length: entryCount },
    (_, index) => transcriptEntryV1(processId, index + 1),
  );
  if (entries.length > 0) {
    const appended = await repository.appendProcessTranscript({
      processId,
      expectedProcessRevision: created.process.revision,
      expectedTranscriptFrontier: 0,
      commitId: `${processId}.initial-transcript`,
      attemptBinding: null,
      entries,
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 2,
    });
    if (appended.kind !== "committed") throw new Error("expected transcript append");
  }
  return entries;
}

describe("read-only Process Conversation controller", () => {
  it("opens by Process identity without resolving its unavailable package or Workspace", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    const processId = "process.unavailable-package";
    const entries = await createConversationV1(repository, processId, 2);
    const loadProcess = vi.fn(repository.loadProcess.bind(repository));
    const loadTranscriptPage = vi.fn(repository.loadTranscriptPage.bind(repository));
    const controller = createReadOnlyProcessConversationControllerV1({
      repository: { loadProcess, loadTranscriptPage },
    });

    await expect(controller.openProcess(processId, {
      capability: "package",
      code: "package_missing",
    })).resolves.toEqual({
      kind: "completed",
      value: true,
    });
    expect(controller.getSnapshot()).toMatchObject({
      phase: "ready",
      failure: null,
      conversation: {
        process: {
          processId,
          programPackage: unavailableProgramPackageV1,
          subjectProgramId: null,
        },
        transcript: {
          phase: "ready",
          entries,
          nextBeforeSequence: null,
          newerOmitted: false,
        },
        degradation: { capability: "package", code: "package_missing" },
      },
    });
    expect(loadProcess).toHaveBeenCalledWith(processId);
    expect(loadTranscriptPage).toHaveBeenCalledWith(expect.objectContaining({ processId }));
  });

  it("pages the durable transcript while bounding only the mounted read window", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    const processId = "process.long-conversation";
    const entries = await createConversationV1(repository, processId, 4);
    const oneEntryBytes = transcriptEntryUtf8ByteLengthV1(entries[0]!);
    expect(entries.every((entry) => transcriptEntryUtf8ByteLengthV1(entry) === oneEntryBytes))
      .toBe(true);
    const controller = createReadOnlyProcessConversationControllerV1({
      repository,
      budgets: {
        transcriptPageMaximumBytes: oneEntryBytes,
        transcriptWindowMaximumBytes: oneEntryBytes * 2,
      },
    });

    await controller.openProcess(processId);
    expect(controller.getSnapshot().conversation?.transcript.entries.map((entry) => entry.sequence))
      .toEqual([4]);

    await controller.loadOlderTranscript();
    expect(controller.getSnapshot().conversation?.transcript).toMatchObject({
      entries: [entries[2], entries[3]],
      newerOmitted: false,
    });

    await controller.loadOlderTranscript();
    expect(controller.getSnapshot().conversation?.transcript).toMatchObject({
      entries: [entries[1], entries[2]],
      nextBeforeSequence: 2,
      newerOmitted: true,
    });

    await controller.loadOlderTranscript();
    expect(controller.getSnapshot().conversation?.transcript).toMatchObject({
      entries: [entries[0], entries[1]],
      nextBeforeSequence: null,
      newerOmitted: true,
    });

    await controller.reloadLatestTranscript();
    expect(controller.getSnapshot().conversation?.transcript).toMatchObject({
      entries: [entries[3]],
      newerOmitted: false,
    });
  });

  it("reports missing and invalid Process identities without inventing a Conversation", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    const controller = createReadOnlyProcessConversationControllerV1({ repository });

    await expect(controller.openProcess("process.missing")).resolves.toEqual({
      kind: "failed",
      code: "process_not_found",
    });
    expect(controller.getSnapshot()).toMatchObject({
      phase: "failed",
      conversation: null,
      failure: { operation: "open", code: "process_not_found" },
    });

    await expect(controller.openProcess("not a process id")).resolves.toEqual({
      kind: "failed",
      code: "process_id_invalid",
    });
    expect(controller.getSnapshot().conversation).toBeNull();

    controller.dispose();
    expect(controller.getSnapshot()).toMatchObject({ phase: "disposed", conversation: null });
    await expect(controller.openProcess("process.missing")).resolves.toEqual({
      kind: "failed",
      code: "disposed",
    });
  });
});
