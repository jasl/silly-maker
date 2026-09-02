// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import type { InstalledProgramPackageReferenceV1 } from "../../program-platform/package/program-package-archive.ts";
import type {
  ProcessHeadV1,
  TranscriptEntryV1,
} from "../../program-platform/process/program-process-repository.ts";
import type {
  BrowserWorkspaceHostPagePortV1,
} from "../../workspace/browser-workspace-host-port.ts";
import type {
  BrowserWorkspaceHostSnapshotWireV1,
  BrowserWorkspaceVolumeCandidateWireV1,
} from "../../workspace/browser-workspace-host-protocol.ts";
import type {
  ProcessWorkspaceBindingV1,
  ProcessWorkspaceCreateBundleInputV1,
  ProgramDataRepositoryV1,
} from "../persistence/program-data-repository.ts";
import {
  type BrowserProcessWorkspaceCreateInputV1,
  createBrowserProgramWorkspaceAuthorityV1,
} from "./browser-program-workspace-authority.ts";

const packageReferenceV1: InstalledProgramPackageReferenceV1 = {
  programId: "community.translation-review",
  packageVersion: "1.0.0",
};

function createInputV1(ordinal: number): BrowserProcessWorkspaceCreateInputV1 {
  const processId = `process.external.${String(ordinal)}`;
  const createdAt = 1_000 + ordinal;
  const entry: TranscriptEntryV1 = {
    schemaVersion: 1,
    processId,
    sequence: 1,
    entryId: `entry.external.${String(ordinal)}`,
    role: "system",
    state: "committed",
    parts: [{
      kind: "text_markdown",
      partId: `part.external.${String(ordinal)}`,
      markdown: "Ready.",
    }],
  };
  return {
    workspaceId: `workspace.external.${String(ordinal)}`,
    process: {
      processId,
      programPackage: packageReferenceV1,
      subjectProgramId: null,
      createdAt,
    },
    transcript: {
      processId,
      expectedProcessRevision: 1,
      expectedTranscriptFrontier: 0,
      commitId: `commit.external.${String(ordinal)}`,
      attemptBinding: null,
      entries: [entry],
      checkpoint: {
        checkpointId: `checkpoint.external.${String(ordinal)}`,
        throughSequence: 1,
      },
      terminalAttemptReceipt: null,
      updatedAt: createdAt,
    },
  };
}

function snapshotV1(
  candidate: BrowserWorkspaceVolumeCandidateWireV1,
  workspaceSessionId: string,
  phase: "open" | "closed",
): BrowserWorkspaceHostSnapshotWireV1 {
  return {
    revision: 1,
    phase,
    volumeId: candidate.anchor.volumeId,
    checkpointId: candidate.checkpointId,
    descriptor: {
      revision: 1,
      programId: candidate.anchor.programId,
      workspaceId: candidate.anchor.workspaceId,
      workspaceSessionId,
      generation: candidate.generation,
    },
    anchor: candidate.anchor,
  };
}

describe("Browser Program Workspace authority", () => {
  it("releases each committed bootstrap candidate before another Process is created", async () => {
    const pairs = new Map<
      string,
      {
        readonly process: ProcessHeadV1;
        readonly workspace: ProcessWorkspaceBindingV1;
      }
    >();
    const repository = {
      async initialize() {},
      async createProcessWithWorkspace(input: ProcessWorkspaceCreateBundleInputV1) {
        const checkpoint = input.transcript.checkpoint!;
        const process = {
          schemaVersion: 1 as const,
          processId: input.process.processId,
          revision: 2,
          programPackage: input.process.programPackage,
          subjectProgramId: input.process.subjectProgramId,
          status: "active" as const,
          transcriptFrontier: checkpoint.throughSequence,
          activeAttempt: null,
          lastTerminalAttempt: null,
          checkpoint,
          createdAt: input.process.createdAt,
          updatedAt: input.transcript.updatedAt,
        };
        pairs.set(process.processId, { process, workspace: input.workspace });
        return {
          kind: "committed" as const,
          process,
          workspace: input.workspace,
          entries: input.transcript.entries,
        };
      },
      async loadProcess(processId: string) {
        return pairs.get(processId)?.process ?? null;
      },
      async loadProcessWorkspaceBinding(processId: string) {
        return pairs.get(processId)?.workspace ?? null;
      },
      async dispose() {},
    } as unknown as ProgramDataRepositoryV1;

    const events: string[] = [];
    let candidate: BrowserWorkspaceVolumeCandidateWireV1 | null = null;
    let opened:
      | { readonly candidate: BrowserWorkspaceVolumeCandidateWireV1; readonly sessionId: string }
      | null = null;
    let ordinal = 0;
    const host = {
      subscribeFatal: () => () => {},
      async withBootstrapLease<T>(input: { readonly operation: () => Promise<T> }) {
        return await input.operation();
      },
      async createCandidate(input: { readonly programId: string; readonly workspaceId: string }) {
        if (candidate !== null || opened !== null) throw new Error("workspace_busy");
        ordinal += 1;
        candidate = {
          revision: 1,
          anchor: {
            revision: 1,
            programId: input.programId,
            workspaceId: input.workspaceId,
            volumeId: `volume.external.${String(ordinal)}`,
            workspaceFormat: 1,
          },
          checkpointId: `workspace-checkpoint.external.${String(ordinal)}`,
          generation: 1,
        };
        events.push(`create:${input.workspaceId}`);
        return candidate;
      },
      async openWorkspace(anchor: BrowserWorkspaceVolumeCandidateWireV1["anchor"]) {
        if (candidate === null || candidate.anchor.volumeId !== anchor.volumeId) {
          throw new Error("candidate_mismatch");
        }
        const current = candidate;
        const sessionId = `session.external.${String(ordinal)}`;
        candidate = null;
        opened = { candidate: current, sessionId };
        events.push(`open:${anchor.workspaceId}`);
        return snapshotV1(current, sessionId, "open");
      },
      async closeWorkspace(workspaceSessionId: string) {
        if (opened === null || opened.sessionId !== workspaceSessionId) {
          throw new Error("workspace_mismatch");
        }
        const current = opened.candidate;
        opened = null;
        events.push(`close:${current.anchor.workspaceId}`);
        return snapshotV1(current, workspaceSessionId, "closed");
      },
      dispose() {},
    } as unknown as BrowserWorkspaceHostPagePortV1;

    const authority = createBrowserProgramWorkspaceAuthorityV1({
      repository,
      host,
      operationFence: { run: (_mode, operation) => operation() },
    });
    await expect(authority.createProcessWorkspace(createInputV1(1))).resolves.toMatchObject({
      kind: "committed",
      process: { processId: "process.external.1" },
    });
    await expect(authority.createProcessWorkspace(createInputV1(2))).resolves.toMatchObject({
      kind: "committed",
      process: { processId: "process.external.2" },
    });
    expect(events).toEqual([
      "create:workspace.external.1",
      "open:workspace.external.1",
      "close:workspace.external.1",
      "create:workspace.external.2",
      "open:workspace.external.2",
      "close:workspace.external.2",
    ]);
    await authority.dispose();
  });

  it("reads one exact Process Workspace file without attaching an execution environment", async () => {
    const input = createInputV1(3);
    const workspace: ProcessWorkspaceBindingV1 = {
      revision: 1,
      processId: input.process.processId,
      workspaceId: input.workspaceId,
      volumeId: "volume.external.read",
      workspaceFormat: 1,
    };
    const process: ProcessHeadV1 = {
      schemaVersion: 1,
      processId: input.process.processId,
      revision: 2,
      programPackage: input.process.programPackage,
      subjectProgramId: input.process.subjectProgramId,
      status: "active",
      transcriptFrontier: input.transcript.checkpoint.throughSequence,
      activeAttempt: null,
      lastTerminalAttempt: null,
      checkpoint: {
        ...input.transcript.checkpoint,
        workspaceId: workspace.workspaceId,
        workspaceCheckpointId: "checkpoint.external.read",
        workspaceGeneration: 4,
      },
      createdAt: input.process.createdAt,
      updatedAt: input.transcript.updatedAt,
    };
    const repository = {
      async initialize() {},
      async loadProcess(processId: string) {
        return processId === process.processId ? process : null;
      },
      async loadProcessWorkspaceBinding(processId: string) {
        return processId === process.processId ? workspace : null;
      },
      async dispose() {},
    } as unknown as ProgramDataRepositoryV1;
    const anchor = {
      revision: 1,
      programId: process.programPackage.programId,
      workspaceId: workspace.workspaceId,
      volumeId: workspace.volumeId,
      workspaceFormat: 1,
    } as const;
    const candidate: BrowserWorkspaceVolumeCandidateWireV1 = {
      revision: 1,
      anchor,
      checkpointId: "checkpoint.external.read",
      generation: 4,
    };
    const events: string[] = [];
    const sessionId = "session.external.read";
    const host = {
      subscribeFatal: () => () => {},
      async withBootstrapLease<T>(request: { readonly operation: () => Promise<T> }) {
        return await request.operation();
      },
      async openWorkspace() {
        events.push("open");
        return snapshotV1(candidate, sessionId, "open");
      },
      async queryWorkspace() {
        events.push("query");
        return snapshotV1(candidate, sessionId, "open");
      },
      async captureStableHead() {
        events.push("capture");
        return snapshotV1(candidate, sessionId, "open");
      },
      async readFile(request: { readonly path: string }) {
        events.push(`read:${request.path}`);
        return {
          bytes: new Uint8Array([7, 8, 9]),
          snapshot: snapshotV1(candidate, sessionId, "open"),
        };
      },
      async closeWorkspace() {
        events.push("close");
        return snapshotV1(candidate, sessionId, "closed");
      },
      dispose() {},
    } as unknown as BrowserWorkspaceHostPagePortV1;
    const authority = createBrowserProgramWorkspaceAuthorityV1({
      repository,
      host,
      operationFence: { run: (_mode, operation) => operation() },
    });

    await expect(authority.captureProcessWorkspaceHead({
      processId: process.processId,
      workspaceId: workspace.workspaceId,
    })).resolves.toEqual({
      checkpointId: candidate.checkpointId,
      generation: candidate.generation,
    });
    await expect(authority.readProcessWorkspaceFile({
      processId: process.processId,
      workspaceId: workspace.workspaceId,
      path: "translation/source.md",
    })).resolves.toEqual({
      bytes: new Uint8Array([7, 8, 9]),
      source: {
        revision: 1,
        processId: process.processId,
        workspaceId: workspace.workspaceId,
        volumeId: workspace.volumeId,
        workspaceFormat: 1,
        path: "translation/source.md",
        checkpointId: candidate.checkpointId,
        generation: candidate.generation,
      },
    });
    expect(events).toEqual([
      "open",
      "capture",
      "close",
      "open",
      "query",
      "read:translation/source.md",
      "close",
    ]);
    await authority.dispose();
    expect(events).toEqual([
      "open",
      "capture",
      "close",
      "open",
      "query",
      "read:translation/source.md",
      "close",
    ]);
  });
});
