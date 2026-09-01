// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  normalizeProcessWorkspaceCreateBundleInputV1,
  type ProcessWorkspaceCreateBundleInputV1,
} from "../../../src/application/persistence/program-data-repository.ts";
import { normalizeProcessExecutionTerminalInputV1 } from "../../../src/program-platform/process/process-execution-repository.ts";
import {
  normalizeCreatorProgramProcessCreateBundleInputV1,
  normalizeCreatorProgramProcessExecutionRevisionBundleInputV1,
  normalizeCreatorProgramProcessRevisionBundleInputV1,
  type CreatorProgramProcessCreateBundleInputV1,
  type CreatorProgramProcessExecutionRevisionBundleInputV1,
  type CreatorProgramProcessRevisionBundleInputV1,
} from "../persistence/creator-persistence-contract.ts";

function packageReferenceV1(programId: string) {
  return {
    programId,
    packageVersion: "1.0.0",
    contentDigest: "a".repeat(64),
  };
}

function createBundleV1(): CreatorProgramProcessCreateBundleInputV1 {
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
      reviewedWorkspace: {
        processId: "process.one",
        workspaceId: "workspace.one",
        volumeId: "volume.one",
        workspaceFormat: 1,
        checkpointId: "workspace-checkpoint.one",
        generation: 1,
      },
      updatedAt: 1,
    },
    process: {
      processId: "process.one",
      programPackage: packageReferenceV1("sillyos.creator"),
      subjectProgramId: "program.one",
      createdAt: 1,
    },
    workspace: {
      revision: 1,
      processId: "process.one",
      workspaceId: "workspace.one",
      volumeId: "volume.one",
      workspaceFormat: 1,
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
      checkpoint: {
        checkpointId: "process-checkpoint.one",
        throughSequence: 1,
        workspaceId: "workspace.one",
        workspaceCheckpointId: "workspace-checkpoint.one",
        workspaceGeneration: 1,
      },
      terminalAttemptReceipt: null,
      updatedAt: 1,
    },
  };
}

function revisionBundleV1(): CreatorProgramProcessRevisionBundleInputV1 {
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
      reviewedWorkspace: {
        processId: "process.one",
        workspaceId: "workspace.one",
        volumeId: "volume.one",
        workspaceFormat: 1,
        checkpointId: "workspace-checkpoint.two",
        generation: 2,
      },
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
      programPackage: packageReferenceV1("sillyos.translation"),
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

function executionRevisionBundleV1(): CreatorProgramProcessExecutionRevisionBundleInputV1 {
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
  it("pins the first durable Process to one exact Program package", () => {
    expect(normalizeCreatorProgramProcessCreateBundleInputV1(createBundleV1()).process)
      .toMatchObject({
        programPackage: {
          programId: "sillyos.creator",
          packageVersion: "1.0.0",
          contentDigest: "a".repeat(64),
        },
      });

    const external = createBundleV1();
    expect(() =>
      normalizeCreatorProgramProcessCreateBundleInputV1({
        ...external,
        process: {
          ...external.process,
          programPackage: packageReferenceV1("community.creator"),
        },
      })
    ).not.toThrow();

    const invalid = createBundleV1();
    expect(() =>
      normalizeCreatorProgramProcessCreateBundleInputV1({
        ...invalid,
        process: {
          ...invalid.process,
          programPackage: { ...invalid.process.programPackage, contentDigest: "invalid" },
        },
      })
    ).toThrow("program_package_ref.invalid");
  });

  it("binds an attempt-owned revision to the same reviewed Workspace head", () => {
    expect(
      normalizeCreatorProgramProcessExecutionRevisionBundleInputV1(executionRevisionBundleV1())
        .transcript,
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
        normalizeCreatorProgramProcessExecutionRevisionBundleInputV1({
          ...mismatched,
          transcript: {
            ...mismatched.transcript,
            checkpoint: {
              ...mismatched.transcript.checkpoint!,
              ...checkpoint,
            },
          },
        })
      ).toThrow("invalid Creator Program/Process execution revision bundle");
    }

    const missing = executionRevisionBundleV1();
    expect(() =>
      normalizeCreatorProgramProcessExecutionRevisionBundleInputV1({
        ...missing,
        transcript: { ...missing.transcript, checkpoint: null },
      })
    ).toThrow("invalid Creator Program/Process execution revision bundle");
  });

  it("admits terminal shape independently from the repository's Process-kind policy", () => {
    const completed = executionRevisionBundleV1();
    expect(() => normalizeCreatorProgramProcessExecutionRevisionBundleInputV1(completed)).not
      .toThrow();
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
        normalizeCreatorProgramProcessExecutionRevisionBundleInputV1({
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
          programPackage: packageReferenceV1("community.translation"),
        },
      })
    ).not.toThrow();
  });

  it("requires deterministic revisions to bind the reviewed Workspace checkpoint", () => {
    const deterministic = revisionBundleV1();
    expect(() =>
      normalizeCreatorProgramProcessRevisionBundleInputV1({
        ...deterministic,
        transcript: {
          ...deterministic.transcript,
          attemptBinding: null,
          checkpoint: null,
          terminalAttemptReceipt: null,
        },
      })
    ).toThrow("invalid Creator Program/Process revision bundle");
  });
});
