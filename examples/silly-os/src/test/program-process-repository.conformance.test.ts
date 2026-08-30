// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createMemoryProgramProcessRepositoryBackingV1,
  createMemoryProgramProcessRepositoryV1,
} from "../product/memory-program-process-repository.ts";
import {
  admitProcessHeadV1,
  builtinCreatorProgramDefinitionReferenceV1,
  createBuiltinCreatorProgramDefinitionRevisionV1,
  formatProgramDefinitionReferenceV1,
  processSummaryUtf8ByteLengthV1,
  transcriptEntryUtf8ByteLengthV1,
  type ProcessAttemptBeginInputV1,
  type ProcessCheckpointV1,
  type ProcessHeadV1,
  type ProcessTranscriptAppendInputV1,
  type ProgramDefinitionRevisionV1,
  type ProgramProcessRepositoryV1,
  type TranscriptEntryV1,
  type TranscriptPartV1,
} from "../product/program-process-repository.ts";

function programRevisionV1(
  revision: number,
  purpose = `Creator definition revision ${String(revision)}.`,
): ProgramDefinitionRevisionV1 {
  return {
    ...createBuiltinCreatorProgramDefinitionRevisionV1(),
    revision,
    purpose,
    harnessReference: `sillyos.builtin.creator@${String(revision)}`,
  };
}

function entryV1(input: {
  readonly processId: string;
  readonly sequence: number;
  readonly role?: TranscriptEntryV1["role"];
  readonly state?: TranscriptEntryV1["state"];
  readonly text?: string;
  readonly parts?: readonly TranscriptPartV1[];
}): TranscriptEntryV1 {
  return {
    schemaVersion: 1,
    processId: input.processId,
    sequence: input.sequence,
    entryId: `${input.processId}.entry.${String(input.sequence)}`,
    role: input.role ?? "assistant",
    state: input.state ?? "committed",
    parts: input.parts ?? [{
      kind: "text_markdown",
      partId: `${input.processId}.part.${String(input.sequence)}`,
      markdown: input.text ?? `Message ${String(input.sequence)} ${"x".repeat(180)}`,
    }],
  };
}

async function createProcessV1(input: {
  readonly repository: ProgramProcessRepositoryV1;
  readonly processId: string;
  readonly definitionRevision?: number;
  readonly subjectProgramId?: string | null;
  readonly createdAt?: number;
}) {
  const result = await input.repository.createProcess({
    processId: input.processId,
    programDefinition: {
      programId: "sillyos.builtin.creator",
      revision: input.definitionRevision ?? 1,
    },
    subjectProgramId: input.subjectProgramId ?? null,
    createdAt: input.createdAt ?? 1,
  });
  if (result.kind !== "committed") throw new Error("expected committed Process");
  return result.process;
}

function checkpointV1(sequence: number): ProcessCheckpointV1 {
  return {
    checkpointId: `process.checkpoint.${String(sequence)}`,
    throughSequence: sequence,
    workspaceId: "workspace.subject",
    workspaceCheckpointId: `workspace.checkpoint.${String(sequence)}`,
    workspaceGeneration: sequence,
  };
}

async function appendV1(
  repository: ProgramProcessRepositoryV1,
  input: ProcessTranscriptAppendInputV1,
) {
  const result = await repository.appendProcessTranscript(input);
  if (result.kind !== "committed") throw new Error("expected committed append");
  return result;
}

describe("Memory Program/Process repository conformance", () => {
  it("pins a Process to Creator revision 1 when revision 2 is later published", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    expect(formatProgramDefinitionReferenceV1({
      programId: "sillyos.builtin.creator",
      revision: 1,
    })).toBe(builtinCreatorProgramDefinitionReferenceV1);
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({
      repository,
      processId: "process.creator.1",
      subjectProgramId: "program.subject",
    });
    await repository.publishProgramDefinitionRevision(programRevisionV1(2));

    expect((await repository.loadProcess(process.processId))?.programDefinition).toEqual({
      programId: "sillyos.builtin.creator",
      revision: 1,
    });
    expect(
      (await repository.loadProgramDefinitionRevision("sillyos.builtin.creator", 2))?.revision,
    ).toBe(2);
  });

  it("keeps two Processes and their transcript frontiers independent", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const first = await createProcessV1({ repository, processId: "process.first" });
    const second = await createProcessV1({ repository, processId: "process.second" });
    await appendV1(repository, {
      processId: first.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.first.1",
      attemptBinding: null,
      entries: [entryV1({ processId: first.processId, sequence: 1 })],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 2,
    });

    expect((await repository.loadProcess(first.processId))?.transcriptFrontier).toBe(1);
    expect((await repository.loadProcess(second.processId))?.transcriptFrontier).toBe(0);
    expect(
      (await repository.loadTranscriptPage({
        processId: second.processId,
        beforeSequence: null,
        maximumBytes: 1024,
      }))?.entries,
    ).toEqual([]);
  });

  it("lists compact Process summaries by subject in stable reverse tuple order", async () => {
    const backing = createMemoryProgramProcessRepositoryBackingV1();
    const repository = createMemoryProgramProcessRepositoryV1({ backing });
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const subjectProgramId = "program.subject";
    const alpha = await createProcessV1({
      repository,
      processId: "process.subject.alpha",
      subjectProgramId,
      createdAt: 4,
    });
    const zulu = await createProcessV1({
      repository,
      processId: "process.subject.zulu",
      subjectProgramId,
      createdAt: 4,
    });
    const older = await createProcessV1({
      repository,
      processId: "process.subject.older",
      subjectProgramId,
      createdAt: 2,
    });
    await createProcessV1({
      repository,
      processId: "process.other",
      subjectProgramId: "program.other",
      createdAt: 9,
    });
    await createProcessV1({
      repository,
      processId: "process.unassigned",
      subjectProgramId: null,
      createdAt: 10,
    });

    expect(
      (await repository.listProcessSummaries({
        subjectProgramId,
        before: null,
        maximumBytes: 4 * 1_024 * 1_024,
      })).summaries.map((summary) => summary.processId),
    ).toEqual([zulu.processId, alpha.processId, older.processId]);

    await appendV1(repository, {
      processId: older.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.summary.reorder",
      attemptBinding: null,
      entries: [entryV1({ processId: older.processId, sequence: 1, role: "system" })],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 5,
    });
    const reordered = await repository.listProcessSummaries({
      subjectProgramId,
      before: null,
      maximumBytes: 4 * 1_024 * 1_024,
    });
    expect(reordered.summaries.map((summary) => summary.processId)).toEqual([
      older.processId,
      zulu.processId,
      alpha.processId,
    ]);
    expect(reordered.summaries[0]).toMatchObject({
      processRevision: 2,
      transcriptFrontier: 1,
      updatedAt: 5,
    });
    expect(backing.processSummaries.get(older.processId)).not.toHaveProperty("activeAttempt");

    const firstTwoBudget = reordered.summaries.slice(0, 2).reduce(
      (sum, summary) => sum + processSummaryUtf8ByteLengthV1(summary),
      0,
    );
    const firstPage = await repository.listProcessSummaries({
      subjectProgramId,
      before: null,
      maximumBytes: firstTwoBudget,
    });
    expect(firstPage.summaries.map((summary) => summary.processId)).toEqual([
      older.processId,
      zulu.processId,
    ]);
    expect(firstPage.nextCursor).toEqual({ updatedAt: 4, processId: zulu.processId });
    const secondPage = await repository.listProcessSummaries({
      subjectProgramId,
      before: firstPage.nextCursor,
      maximumBytes: firstTwoBudget,
    });
    expect(secondPage.summaries.map((summary) => summary.processId)).toEqual([alpha.processId]);
    expect(secondPage.nextCursor).toBeNull();
    expect(
      (await repository.listProcessSummaries({
        subjectProgramId: "program.other",
        before: null,
        maximumBytes: 4 * 1_024 * 1_024,
      })).summaries.map((summary) => summary.processId),
    ).toEqual(["process.other"]);
    expect(
      (await repository.listProcessSummaries({
        subjectProgramId: null,
        before: null,
        maximumBytes: 4 * 1_024 * 1_024,
      })).summaries.map((summary) => summary.processId),
    ).toEqual(["process.unassigned"]);
    await expect(repository.listProcessSummaries({
      subjectProgramId,
      before: null,
      maximumBytes: processSummaryUtf8ByteLengthV1(reordered.summaries[0]!) - 1,
    })).rejects.toMatchObject({
      code: "page_budget_too_small",
      operation: "list_process_summaries",
    });
  });

  it("traverses more than one byte-budgeted page without truncation or unstable IDs", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.long" });
    const entries = Array.from(
      { length: 120 },
      (_, index) =>
        entryV1({
          processId: process.processId,
          sequence: index + 1,
          text: `Message ${String(index + 1)} ${"x".repeat(5_000)}`,
        }),
    );
    await appendV1(repository, {
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.long.1",
      attemptBinding: null,
      entries,
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 2,
    });

    const loaded: TranscriptEntryV1[] = [];
    let beforeSequence: number | null = null;
    let pageCount = 0;
    do {
      const page = await repository.loadTranscriptPage({
        processId: process.processId,
        beforeSequence,
        maximumBytes: 64 * 1_024,
      });
      if (page === null) throw new Error("expected transcript page");
      loaded.unshift(...page.entries);
      beforeSequence = page.nextBeforeSequence;
      pageCount += 1;
    } while (beforeSequence !== null);

    expect(pageCount).toBeGreaterThan(1);
    expect(JSON.stringify(entries).length).toBeGreaterThan(512 * 1_024);
    expect(loaded.map((entry) => entry.sequence)).toEqual(entries.map((entry) => entry.sequence));
    expect(loaded.map((entry) => entry.entryId)).toEqual(entries.map((entry) => entry.entryId));
  });

  it("keeps an old transcript cursor stable when a newer entry is appended", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.cursor" });
    const original = Array.from(
      { length: 4 },
      (_, index) => entryV1({ processId: process.processId, sequence: index + 1 }),
    );
    await appendV1(repository, {
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.cursor.original",
      attemptBinding: null,
      entries: original,
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 2,
    });
    const pageBudget = transcriptEntryUtf8ByteLengthV1(original[3]!) +
      transcriptEntryUtf8ByteLengthV1(original[2]!);
    const firstPage = await repository.loadTranscriptPage({
      processId: process.processId,
      beforeSequence: null,
      maximumBytes: pageBudget,
    });
    expect(firstPage?.entries.map((entry) => entry.sequence)).toEqual([3, 4]);

    await appendV1(repository, {
      processId: process.processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 4,
      commitId: "commit.cursor.newer",
      attemptBinding: null,
      entries: [entryV1({ processId: process.processId, sequence: 5 })],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 3,
    });
    const olderPage = await repository.loadTranscriptPage({
      processId: process.processId,
      beforeSequence: firstPage?.nextBeforeSequence ?? null,
      maximumBytes: 4 * 1_024 * 1_024,
    });
    expect(olderPage?.entries.map((entry) => entry.sequence)).toEqual([1, 2]);
    expect([
      ...(olderPage?.entries ?? []),
      ...(firstPage?.entries ?? []),
    ].map((entry) => entry.sequence)).toEqual([1, 2, 3, 4]);
  });

  it("reports a too-small page budget and a missing transcript row without deleting history", async () => {
    const backing = createMemoryProgramProcessRepositoryBackingV1();
    const repository = createMemoryProgramProcessRepositoryV1({ backing });
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.page.failure" });
    const entry = entryV1({ processId: process.processId, sequence: 1 });
    await appendV1(repository, {
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.page.failure",
      attemptBinding: null,
      entries: [entry],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 2,
    });
    await expect(repository.loadTranscriptPage({
      processId: process.processId,
      beforeSequence: null,
      maximumBytes: transcriptEntryUtf8ByteLengthV1(entry) - 1,
    })).rejects.toMatchObject({
      code: "page_budget_too_small",
      operation: "load_transcript_page",
    });
    expect((await repository.loadProcess(process.processId))?.transcriptFrontier).toBe(1);
    backing.transcriptEntries.get(process.processId)?.delete(1);
    await expect(repository.loadTranscriptPage({
      processId: process.processId,
      beforeSequence: null,
      maximumBytes: 4 * 1_024 * 1_024,
    })).rejects.toMatchObject({
      code: "schema_invalid",
      operation: "load_transcript_page",
    });
  });

  it("leaves the predecessor unchanged on stale CAS and reused entry identity", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.conflict" });
    const first = await appendV1(repository, {
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.conflict.1",
      attemptBinding: null,
      entries: [entryV1({ processId: process.processId, sequence: 1 })],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 2,
    });
    const conflict = await repository.appendProcessTranscript({
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.conflict.2",
      attemptBinding: null,
      entries: [entryV1({ processId: process.processId, sequence: 2 })],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 3,
    });

    expect(conflict).toMatchObject({ kind: "conflict" });
    expect(await repository.loadProcess(process.processId)).toEqual(first.process);
    expect(
      (await repository.loadTranscriptPage({
        processId: process.processId,
        beforeSequence: null,
        maximumBytes: 4_096,
      }))?.entries.map((entry) => entry.sequence),
    ).toEqual([1]);
  });

  it("reconciles an exact duplicate commit and rejects a mismatched commitId reuse", async () => {
    const backing = createMemoryProgramProcessRepositoryBackingV1();
    const repository = createMemoryProgramProcessRepositoryV1({ backing });
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.idempotent" });
    const mutation = {
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.idempotent.1",
      attemptBinding: null,
      entries: [entryV1({ processId: process.processId, sequence: 1 })],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 2,
    } satisfies ProcessTranscriptAppendInputV1;
    const committed = await repository.appendProcessTranscript(mutation);
    expect(committed.kind).toBe("committed");

    const reopened = createMemoryProgramProcessRepositoryV1({ backing });
    expect((await reopened.appendProcessTranscript(mutation)).kind).toBe("unchanged");
    const later = await reopened.appendProcessTranscript({
      processId: process.processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId: "commit.idempotent.2",
      attemptBinding: null,
      entries: [entryV1({ processId: process.processId, sequence: 2 })],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 3,
    });
    expect(later.kind).toBe("committed");
    const duplicateAfterLaterCommit = await reopened.appendProcessTranscript(mutation);
    expect(duplicateAfterLaterCommit).toMatchObject({
      kind: "unchanged",
      process: { revision: 3, transcriptFrontier: 2 },
    });
    const originalEntry = mutation.entries[0];
    if (originalEntry === undefined) throw new Error("fixture entry is missing");
    const mismatched = await reopened.appendProcessTranscript({
      ...mutation,
      entries: [{
        ...originalEntry,
        parts: [{
          kind: "text_markdown",
          partId: "mismatched.part",
          markdown: "Different payload.",
        }],
      }],
    });
    expect(mismatched.kind).toBe("conflict");
    expect((await reopened.loadProcess(process.processId))?.transcriptFrontier).toBe(2);
  });

  it("rejects a duplicate entry identity without publishing its new sequence", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.entry.identity" });
    const firstEntry = entryV1({ processId: process.processId, sequence: 1 });
    const first = await appendV1(repository, {
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.entry.identity.1",
      attemptBinding: null,
      entries: [firstEntry],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 2,
    });
    const conflict = await repository.appendProcessTranscript({
      processId: process.processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId: "commit.entry.identity.2",
      attemptBinding: null,
      entries: [{ ...firstEntry, sequence: 2 }],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 3,
    });

    expect(conflict.kind).toBe("conflict");
    expect(await repository.loadProcess(process.processId)).toEqual(first.process);
  });

  it("atomically admits a user attempt and settles its terminal receipt", async () => {
    const backing = createMemoryProgramProcessRepositoryBackingV1();
    const repository = createMemoryProgramProcessRepositoryV1({ backing });
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.attempt" });
    const trigger = entryV1({
      processId: process.processId,
      sequence: 1,
      role: "user",
      text: "Translate the attached script.",
    });
    const begin = {
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.attempt.begin",
      attemptId: "attempt.1",
      generation: 1,
      trigger: { kind: "new_entry", entry: trigger },
      startingCheckpoint: checkpointV1(1),
      updatedAt: 2,
    } satisfies ProcessAttemptBeginInputV1;
    const begun = await repository.beginProcessAttempt(begin);
    expect(begun).toMatchObject({
      kind: "committed",
      process: {
        transcriptFrontier: 1,
        activeAttempt: { attemptId: "attempt.1", generation: 1 },
      },
    });

    const terminalEntry = entryV1({
      processId: process.processId,
      sequence: 2,
      parts: [
        {
          kind: "reasoning_summary",
          partId: "part.reasoning",
          summaryMarkdown: "Parsed subtitles.",
        },
        {
          kind: "tool_call",
          partId: "part.call",
          toolCallId: "tool.1",
          toolName: "workspace.read",
          argumentsJson: "{}",
        },
        {
          kind: "tool_status",
          partId: "part.status",
          toolCallId: "tool.1",
          status: "succeeded",
          message: null,
        },
        {
          kind: "tool_result",
          partId: "part.result",
          toolCallId: "tool.1",
          outcome: "succeeded",
          resultJson: '{"lines":12}',
          summaryMarkdown: "Read 12 lines.",
        },
        {
          kind: "artifact_reference",
          partId: "part.artifact",
          artifactId: "artifact.1",
          label: "Translation",
          mediaType: "text/markdown",
          reference: "workspace:/translation.md",
        },
      ],
    });
    const terminalMutation = {
      processId: process.processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId: "commit.attempt.terminal",
      attemptBinding: { attemptId: "attempt.1", generation: 1 },
      entries: [terminalEntry],
      checkpoint: checkpointV1(2),
      terminalAttemptReceipt: {
        schemaVersion: 1,
        processId: process.processId,
        attemptId: "attempt.1",
        generation: 1,
        outcome: "completed",
        terminalSequence: 2,
        terminalEntryId: terminalEntry.entryId,
        interruptionDisposition: null,
      },
      updatedAt: 3,
    } satisfies ProcessTranscriptAppendInputV1;
    const terminal = await repository.appendProcessTranscript(terminalMutation);
    expect(terminal).toMatchObject({
      kind: "committed",
      process: {
        activeAttempt: null,
        lastTerminalAttempt: { attemptId: "attempt.1", outcome: "completed" },
        checkpoint: { throughSequence: 2 },
      },
      terminalAttemptReceipt: { terminalEntryId: terminalEntry.entryId },
    });
    expect((await repository.appendProcessTranscript(terminalMutation)).kind).toBe("unchanged");
    const reopened = createMemoryProgramProcessRepositoryV1({ backing });
    expect(await reopened.beginProcessAttempt(begin)).toMatchObject({
      kind: "unchanged",
      process: { activeAttempt: null, transcriptFrontier: 2 },
      entries: [{ entryId: begin.trigger.kind === "new_entry" ? begin.trigger.entry.entryId : "" }],
    });
    const laterEntry = entryV1({ processId: process.processId, sequence: 3, role: "system" });
    await appendV1(reopened, {
      processId: process.processId,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      commitId: "commit.after.terminal",
      attemptBinding: null,
      entries: [laterEntry],
      checkpoint: checkpointV1(3),
      terminalAttemptReceipt: null,
      updatedAt: 4,
    });
    expect(await reopened.beginProcessAttempt(begin)).toMatchObject({
      kind: "unchanged",
      process: { revision: 4, activeAttempt: null, transcriptFrontier: 3 },
    });
    expect(await reopened.appendProcessTranscript(terminalMutation)).toMatchObject({
      kind: "unchanged",
      process: { revision: 4, activeAttempt: null, transcriptFrontier: 3 },
      terminalAttemptReceipt: { terminalEntryId: terminalEntry.entryId },
    });
  });

  it("requires exact attempt ownership and advances nonterminal checkpoints monotonically", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.ownership" });
    const initialCheckpoint = {
      ...checkpointV1(1),
      workspaceGeneration: 2,
    };
    await repository.beginProcessAttempt({
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.ownership.begin",
      attemptId: "attempt.ownership",
      generation: 1,
      trigger: {
        kind: "new_entry",
        entry: entryV1({ processId: process.processId, sequence: 1, role: "user" }),
      },
      startingCheckpoint: initialCheckpoint,
      updatedAt: 2,
    });
    const entry = entryV1({ processId: process.processId, sequence: 2 });
    const base = {
      processId: process.processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      entries: [entry],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 3,
    } as const;
    expect(
      await repository.appendProcessTranscript({
        ...base,
        commitId: "commit.ownership.missing",
        attemptBinding: null,
      }),
    ).toMatchObject({ kind: "conflict", current: { transcriptFrontier: 1 } });
    expect(
      await repository.appendProcessTranscript({
        ...base,
        commitId: "commit.ownership.wrong",
        attemptBinding: { attemptId: "attempt.other", generation: 1 },
      }),
    ).toMatchObject({ kind: "conflict", current: { transcriptFrontier: 1 } });
    expect(
      await repository.appendProcessTranscript({
        ...base,
        commitId: "commit.ownership.changed-checkpoint",
        attemptBinding: { attemptId: "attempt.ownership", generation: 1 },
        checkpoint: {
          ...initialCheckpoint,
          workspaceCheckpointId: "workspace.checkpoint.changed",
          throughSequence: 2,
        },
      }),
    ).toMatchObject({ kind: "conflict", current: { transcriptFrontier: 1 } });
    expect(
      await repository.appendProcessTranscript({
        ...base,
        commitId: "commit.ownership.generation-rollback",
        attemptBinding: { attemptId: "attempt.ownership", generation: 1 },
        checkpoint: {
          ...checkpointV1(1),
          throughSequence: 2,
        },
      }),
    ).toMatchObject({ kind: "conflict", current: { transcriptFrontier: 1 } });
    expect(
      await repository.appendProcessTranscript({
        ...base,
        commitId: "commit.ownership.workspace-mismatch",
        attemptBinding: { attemptId: "attempt.ownership", generation: 1 },
        checkpoint: {
          ...initialCheckpoint,
          workspaceId: "workspace.other",
          throughSequence: 2,
        },
      }),
    ).toMatchObject({ kind: "conflict", current: { transcriptFrontier: 1 } });
    expect(
      await repository.appendProcessTranscript({
        ...base,
        commitId: "commit.ownership.checkpoint",
        attemptBinding: { attemptId: "attempt.ownership", generation: 1 },
        checkpoint: {
          ...initialCheckpoint,
          checkpointId: "process.checkpoint.2",
          throughSequence: 2,
        },
      }),
    ).toMatchObject({
      kind: "committed",
      process: {
        transcriptFrontier: 2,
        activeAttempt: { attemptId: "attempt.ownership" },
        checkpoint: { throughSequence: 2, workspaceGeneration: 2 },
      },
    });
  });

  it("retries from an existing user entry without growing transcript and fences unrecoverable Process", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.retry" });
    const trigger = entryV1({ processId: process.processId, sequence: 1, role: "user" });
    await repository.beginProcessAttempt({
      processId: process.processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.retry.begin.1",
      attemptId: "attempt.retry.1",
      generation: 1,
      trigger: { kind: "new_entry", entry: trigger },
      startingCheckpoint: checkpointV1(1),
      updatedAt: 2,
    });
    const interrupted = entryV1({
      processId: process.processId,
      sequence: 2,
      state: "interrupted_partial",
    });
    await repository.appendProcessTranscript({
      processId: process.processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId: "commit.retry.interrupted.1",
      attemptBinding: { attemptId: "attempt.retry.1", generation: 1 },
      entries: [interrupted],
      checkpoint: checkpointV1(2),
      terminalAttemptReceipt: {
        schemaVersion: 1,
        processId: process.processId,
        attemptId: "attempt.retry.1",
        generation: 1,
        outcome: "interrupted",
        terminalSequence: 2,
        terminalEntryId: interrupted.entryId,
        interruptionDisposition: "retryable",
      },
      updatedAt: 3,
    });
    const retryBypass = await repository.appendProcessTranscript({
      processId: process.processId,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      commitId: "commit.retry.bypass",
      attemptBinding: null,
      entries: [entryV1({ processId: process.processId, sequence: 3, role: "system" })],
      checkpoint: checkpointV1(3),
      terminalAttemptReceipt: null,
      updatedAt: 4,
    });
    expect(retryBypass).toMatchObject({
      kind: "conflict",
      current: { status: "interrupted_retryable", transcriptFrontier: 2 },
    });
    const retryCheckpoint = {
      ...checkpointV1(2),
      checkpointId: "process.checkpoint.retry.2",
      workspaceCheckpointId: "workspace.checkpoint.retry.2",
      workspaceGeneration: 3,
    };
    const retry = await repository.beginProcessAttempt({
      processId: process.processId,
      expectedProcessRevision: 3,
      expectedTranscriptFrontier: 2,
      commitId: "commit.retry.begin.2",
      attemptId: "attempt.retry.2",
      generation: 2,
      trigger: { kind: "existing_entry", entryId: trigger.entryId, sequence: trigger.sequence },
      startingCheckpoint: retryCheckpoint,
      updatedAt: 4,
    });
    expect(retry).toMatchObject({
      kind: "committed",
      process: {
        status: "active",
        transcriptFrontier: 2,
        activeAttempt: { triggerEntryId: trigger.entryId, triggerSequence: 1 },
      },
      entries: [],
    });
    const fatal = entryV1({
      processId: process.processId,
      sequence: 3,
      state: "interrupted_partial",
    });
    await repository.appendProcessTranscript({
      processId: process.processId,
      expectedProcessRevision: 4,
      expectedTranscriptFrontier: 2,
      commitId: "commit.retry.interrupted.2",
      attemptBinding: { attemptId: "attempt.retry.2", generation: 2 },
      entries: [fatal],
      checkpoint: {
        ...retryCheckpoint,
        checkpointId: "process.checkpoint.retry.3",
        throughSequence: 3,
        workspaceCheckpointId: "workspace.checkpoint.retry.3",
        workspaceGeneration: 4,
      },
      terminalAttemptReceipt: {
        schemaVersion: 1,
        processId: process.processId,
        attemptId: "attempt.retry.2",
        generation: 2,
        outcome: "interrupted",
        terminalSequence: 3,
        terminalEntryId: fatal.entryId,
        interruptionDisposition: "unrecoverable",
      },
      updatedAt: 5,
    });
    expect(await repository.loadProcess(process.processId)).toMatchObject({
      status: "interrupted_unrecoverable",
      activeAttempt: null,
      transcriptFrontier: 3,
    });
    expect(
      await repository.beginProcessAttempt({
        processId: process.processId,
        expectedProcessRevision: 5,
        expectedTranscriptFrontier: 3,
        commitId: "commit.retry.forbidden",
        attemptId: "attempt.retry.3",
        generation: 3,
        trigger: { kind: "existing_entry", entryId: trigger.entryId, sequence: trigger.sequence },
        startingCheckpoint: {
          ...retryCheckpoint,
          checkpointId: "process.checkpoint.retry.4",
          throughSequence: 3,
          workspaceCheckpointId: "workspace.checkpoint.retry.4",
          workspaceGeneration: 5,
        },
        updatedAt: 6,
      }),
    ).toMatchObject({ kind: "conflict", current: { status: "interrupted_unrecoverable" } });
    expect(
      await repository.appendProcessTranscript({
        processId: process.processId,
        expectedProcessRevision: 5,
        expectedTranscriptFrontier: 3,
        commitId: "commit.unrecoverable.bypass",
        attemptBinding: null,
        entries: [entryV1({ processId: process.processId, sequence: 4, role: "system" })],
        checkpoint: {
          ...retryCheckpoint,
          checkpointId: "process.checkpoint.unrecoverable.4",
          throughSequence: 4,
          workspaceCheckpointId: "workspace.checkpoint.unrecoverable.4",
          workspaceGeneration: 5,
        },
        terminalAttemptReceipt: null,
        updatedAt: 6,
      }),
    ).toMatchObject({ kind: "conflict", current: { status: "interrupted_unrecoverable" } });
  });

  it("rejects shape-valid Process heads whose lifecycle facts disagree", () => {
    const firstCheckpoint = checkpointV1(1);
    const retryCheckpoint = {
      ...checkpointV1(2),
      checkpointId: "process.checkpoint.retry",
      workspaceCheckpointId: "workspace.checkpoint.retry",
      workspaceGeneration: 3,
    };
    const terminal = {
      attemptId: "attempt.first",
      generation: 1,
      outcome: "interrupted" as const,
      triggerEntryId: "process.admission.entry.1",
      triggerSequence: 1,
      interruptionDisposition: "retryable" as const,
    };
    const active: ProcessHeadV1 = {
      schemaVersion: 1,
      processId: "process.admission",
      revision: 4,
      programDefinition: { programId: "sillyos.builtin.creator", revision: 1 },
      subjectProgramId: null,
      status: "active",
      transcriptFrontier: 2,
      activeAttempt: {
        attemptId: "attempt.retry",
        generation: 2,
        triggerEntryId: terminal.triggerEntryId,
        triggerSequence: terminal.triggerSequence,
        startingCheckpoint: retryCheckpoint,
      },
      lastTerminalAttempt: terminal,
      checkpoint: retryCheckpoint,
      createdAt: 1,
      updatedAt: 4,
    };
    const interrupted: ProcessHeadV1 = {
      ...active,
      revision: 3,
      status: "interrupted_retryable",
      activeAttempt: null,
      checkpoint: firstCheckpoint,
      updatedAt: 3,
    };
    expect(admitProcessHeadV1(active).kind).toBe("admitted");
    expect(admitProcessHeadV1(interrupted).kind).toBe("admitted");
    expect(
      admitProcessHeadV1({
        ...interrupted,
        lastTerminalAttempt: { ...terminal, interruptionDisposition: "unrecoverable" },
      }).kind,
    ).toBe("rejected");
    expect(
      admitProcessHeadV1({
        ...interrupted,
        activeAttempt: active.activeAttempt,
      }).kind,
    ).toBe("rejected");
    expect(
      admitProcessHeadV1({
        ...interrupted,
        lastTerminalAttempt: { ...terminal, triggerSequence: 3 },
      }).kind,
    ).toBe("rejected");
    expect(
      admitProcessHeadV1({
        ...active,
        activeAttempt: { ...active.activeAttempt!, generation: 1 },
      }).kind,
    ).toBe("rejected");
    expect(
      admitProcessHeadV1({
        ...active,
        checkpoint: { ...retryCheckpoint, workspaceId: "workspace.other" },
      }).kind,
    ).toBe("rejected");
    expect(admitProcessHeadV1({ ...active, checkpoint: null }).kind).toBe("rejected");
    expect(admitProcessHeadV1({ ...interrupted, checkpoint: null }).kind).toBe("rejected");
    expect(
      admitProcessHeadV1({ ...active, activeAttempt: null }).kind,
    ).toBe("rejected");
    expect(
      admitProcessHeadV1({
        ...active,
        activeAttempt: { ...active.activeAttempt!, triggerEntryId: "entry.other" },
      }).kind,
    ).toBe("rejected");
  });

  it("returns a normal null conflict when an existing trigger names a missing Process", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    const result = await repository.beginProcessAttempt({
      processId: "process.missing",
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 1,
      commitId: "commit.missing.retry",
      attemptId: "attempt.missing.retry",
      generation: 2,
      trigger: {
        kind: "existing_entry",
        entryId: "process.missing.entry.1",
        sequence: 1,
      },
      startingCheckpoint: checkpointV1(1),
      updatedAt: 2,
    });
    expect(result).toEqual({ kind: "conflict", current: null });
  });

  it("does not publish trigger entry or active attempt when begin CAS conflicts", async () => {
    const repository = createMemoryProgramProcessRepositoryV1();
    await repository.publishProgramDefinitionRevision(programRevisionV1(1));
    const process = await createProcessV1({ repository, processId: "process.begin.conflict" });
    const result = await repository.beginProcessAttempt({
      processId: process.processId,
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 0,
      commitId: "commit.begin.conflict",
      attemptId: "attempt.conflict",
      generation: 1,
      trigger: {
        kind: "new_entry",
        entry: entryV1({ processId: process.processId, sequence: 1, role: "user" }),
      },
      startingCheckpoint: checkpointV1(1),
      updatedAt: 2,
    });
    expect(result.kind).toBe("conflict");
    expect(await repository.loadProcess(process.processId)).toEqual(process);
    expect(
      (await repository.loadTranscriptPage({
        processId: process.processId,
        beforeSequence: null,
        maximumBytes: 1_024,
      }))?.entries,
    ).toEqual([]);
  });
});
