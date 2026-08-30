// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  normalizeProgramProcessCreateBundleInputV1,
  normalizeProgramProcessExecutionRevisionBundleInputV1,
  normalizeProgramProcessRevisionBundleInputV1,
  normalizeProcessWorkspaceCreateBundleInputV1,
  type ProgramProcessCreateBundleInputV1,
  type ProgramProcessExecutionRevisionBundleInputV1,
  type ProgramProcessRevisionBundleInputV1,
  type ProcessWorkspaceCreateBundleInputV1,
} from "../product/program-data-repository.ts";
import { normalizeProcessExecutionTerminalInputV1 } from "../product/process-execution-repository.ts";

function createBundleV1(): ProgramProcessCreateBundleInputV1 {
  return {
    catalog: {
      commitId: "commit.create",
      program: {
        programId: "program.one",
        revision: 1,
        kind: "general",
        name: "Program one",
        purpose: "Test the composite admission boundary.",
        requirements: ["Keep both authorities correlated."],
        suggestedCapabilities: [],
      },
      proposalId: "proposal.one",
      continuation: {
        revision: 1,
        programId: "program.one",
        workspaceId: "workspace.one",
        volumeId: "volume.one",
        workspaceFormat: 1,
        programRevision: 1,
        repositoryRevision: 1,
      },
      reviewedHead: { checkpointId: "workspace-checkpoint.one", generation: 1 },
      updatedAt: 1,
    },
    process: {
      processId: "process.one",
      programDefinition: { programId: "sillyos.builtin.creator", revision: 1 },
      subjectProgramId: "program.one",
      createdAt: 1,
    },
    transcript: {
      processId: "process.one",
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.transcript.create",
      attemptBinding: null,
      entries: [{
        schemaVersion: 1,
        processId: "process.one",
        sequence: 1,
        entryId: "entry.one",
        role: "user",
        state: "committed",
        parts: [{ kind: "text_markdown", partId: "part.one", markdown: "Create it." }],
      }],
      checkpoint: null,
      terminalAttemptReceipt: null,
      updatedAt: 1,
    },
  };
}

function revisionBundleV1(): ProgramProcessRevisionBundleInputV1 {
  return {
    catalog: {
      programId: "program.one",
      expectedRepositoryRevision: 1,
      expectedProposal: { proposalId: "proposal.one", programRevision: 1 },
      commitId: "commit.revision",
      program: {
        programId: "program.one",
        revision: 2,
        kind: "general",
        name: "Program one",
        purpose: "Test the composite admission boundary.",
        requirements: ["Keep both authorities correlated.", "Apply the revision."],
        suggestedCapabilities: [],
      },
      proposalId: "proposal.two",
      continuation: {
        revision: 1,
        programId: "program.one",
        workspaceId: "workspace.one",
        volumeId: "volume.one",
        workspaceFormat: 1,
        programRevision: 1,
        repositoryRevision: 1,
      },
      reviewedHead: { checkpointId: "workspace-checkpoint.two", generation: 2 },
      updatedAt: 2,
    },
    transcript: {
      processId: "process.one",
      expectedProcessRevision: 2,
      expectedTranscriptFrontier: 1,
      commitId: "commit.transcript.revision",
      attemptBinding: { attemptId: "attempt.one", generation: 1 },
      entries: [{
        schemaVersion: 1,
        processId: "process.one",
        sequence: 2,
        entryId: "entry.two",
        role: "assistant",
        state: "committed",
        parts: [{ kind: "text_markdown", partId: "part.two", markdown: "Applied." }],
      }],
      checkpoint: {
        checkpointId: "process-checkpoint.two",
        throughSequence: 2,
        workspaceId: "workspace.one",
        workspaceCheckpointId: "workspace-checkpoint.two",
        workspaceGeneration: 2,
      },
      terminalAttemptReceipt: {
        schemaVersion: 1,
        processId: "process.one",
        attemptId: "attempt.one",
        generation: 1,
        outcome: "completed",
        terminalSequence: 2,
        terminalEntryId: "entry.two",
        interruptionDisposition: null,
      },
      updatedAt: 2,
    },
  };
}

function processWorkspaceBundleV1(): ProcessWorkspaceCreateBundleInputV1 {
  return {
    process: {
      processId: "process.translation.one",
      programDefinition: { programId: "sillyos.builtin.translation", revision: 1 },
      subjectProgramId: "program.one",
      createdAt: 1,
    },
    workspace: {
      revision: 1,
      processId: "process.translation.one",
      workspaceId: "workspace.translation.one",
      volumeId: "volume.translation.one",
      workspaceFormat: 1,
    },
    transcript: {
      processId: "process.translation.one",
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: "commit.translation.create",
      attemptBinding: null,
      entries: [{
        schemaVersion: 1,
        processId: "process.translation.one",
        sequence: 1,
        entryId: "entry.translation.one",
        role: "user",
        state: "committed",
        parts: [{ kind: "text_markdown", partId: "part.translation.one", markdown: "File" }],
      }],
      checkpoint: {
        checkpointId: "process-checkpoint.translation.one",
        throughSequence: 1,
        workspaceId: "workspace.translation.one",
        workspaceCheckpointId: "workspace-checkpoint.translation.one",
        workspaceGeneration: 1,
      },
      terminalAttemptReceipt: null,
      updatedAt: 2,
    },
  };
}

function executionRevisionBundleV1(): ProgramProcessExecutionRevisionBundleInputV1 {
  const revision = revisionBundleV1();
  return {
    ...revision,
    lease: {
      processId: revision.transcript.processId,
      ownerInstanceId: "owner.one",
      attemptId: revision.transcript.attemptBinding!.attemptId,
      generation: revision.transcript.attemptBinding!.generation,
      expiresAt: 3,
    },
    observedAt: revision.transcript.updatedAt,
  };
}

describe("Program/Process composite admission", () => {
  it("pins the first durable Process to the builtin Creator definition", () => {
    expect(normalizeProgramProcessCreateBundleInputV1(createBundleV1()).process)
      .toMatchObject({
        programDefinition: { programId: "sillyos.builtin.creator", revision: 1 },
      });

    const mismatched = createBundleV1();
    expect(() =>
      normalizeProgramProcessCreateBundleInputV1({
        ...mismatched,
        process: {
          ...mismatched.process,
          programDefinition: { programId: "program.other-harness", revision: 1 },
        },
      })
    ).toThrow("invalid Program/Process create bundle");

    expect(() =>
      normalizeProgramProcessCreateBundleInputV1({
        ...mismatched,
        process: {
          ...mismatched.process,
          programDefinition: { programId: "sillyos.builtin.creator", revision: 2 },
        },
      })
    ).toThrow("invalid Program/Process create bundle");
  });

  it("binds an attempt-owned revision to the same reviewed Workspace head", () => {
    expect(
      normalizeProgramProcessExecutionRevisionBundleInputV1(executionRevisionBundleV1()).transcript,
    )
      .toMatchObject({
        checkpoint: {
          workspaceId: "workspace.one",
          workspaceCheckpointId: "workspace-checkpoint.two",
          workspaceGeneration: 2,
        },
      });

    for (
      const checkpoint of [
        { workspaceId: "workspace.other" },
        { workspaceCheckpointId: "workspace-checkpoint.other" },
        { workspaceGeneration: 3 },
      ]
    ) {
      const mismatched = executionRevisionBundleV1();
      expect(() =>
        normalizeProgramProcessExecutionRevisionBundleInputV1({
          ...mismatched,
          transcript: {
            ...mismatched.transcript,
            checkpoint: {
              ...mismatched.transcript.checkpoint!,
              ...checkpoint,
            },
          },
        })
      ).toThrow("invalid Program/Process execution revision bundle");
    }

    const missing = executionRevisionBundleV1();
    expect(() =>
      normalizeProgramProcessExecutionRevisionBundleInputV1({
        ...missing,
        transcript: { ...missing.transcript, checkpoint: null },
      })
    ).toThrow("invalid Program/Process execution revision bundle");
  });

  it("admits terminal shape independently from the repository's Process-kind policy", () => {
    const completed = executionRevisionBundleV1();
    expect(() => normalizeProgramProcessExecutionRevisionBundleInputV1(completed)).not.toThrow();
    expect(() =>
      normalizeProcessExecutionTerminalInputV1({
        lease: completed.lease,
        observedAt: completed.observedAt,
        transcript: completed.transcript,
      })
    ).not.toThrow();

    for (const outcome of ["failed", "cancelled", "replaced", "interrupted"] as const) {
      const nonCompleted = executionRevisionBundleV1();
      expect(() =>
        normalizeProgramProcessExecutionRevisionBundleInputV1({
          ...nonCompleted,
          transcript: {
            ...nonCompleted.transcript,
            terminalAttemptReceipt: {
              ...nonCompleted.transcript.terminalAttemptReceipt!,
              outcome,
              interruptionDisposition: outcome === "interrupted" ? "retryable" : null,
            },
          },
        })
      ).toThrow("invalid Process execution terminal input");
    }
  });

  it("binds a Process, initial checkpoint, and Workspace identity", () => {
    expect(normalizeProcessWorkspaceCreateBundleInputV1(processWorkspaceBundleV1())).toMatchObject({
      process: { processId: "process.translation.one" },
      workspace: { workspaceId: "workspace.translation.one" },
      transcript: { checkpoint: { throughSequence: 1 } },
    });
    const mismatched = processWorkspaceBundleV1();
    expect(() =>
      normalizeProcessWorkspaceCreateBundleInputV1({
        ...mismatched,
        workspace: { ...mismatched.workspace, workspaceId: "workspace.other" },
      })
    ).toThrow("invalid Process/Workspace create bundle");
    expect(() =>
      normalizeProcessWorkspaceCreateBundleInputV1({
        ...mismatched,
        process: {
          ...mismatched.process,
          programDefinition: { programId: "sillyos.builtin.creator", revision: 1 },
        },
      })
    ).not.toThrow();
  });

  it("keeps deterministic non-attempt revisions valid without a Process checkpoint", () => {
    const deterministic = revisionBundleV1();
    expect(() =>
      normalizeProgramProcessRevisionBundleInputV1({
        ...deterministic,
        transcript: {
          ...deterministic.transcript,
          attemptBinding: null,
          checkpoint: null,
          terminalAttemptReceipt: null,
        },
      })
    ).not.toThrow();
  });
});
