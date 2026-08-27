// SPDX-License-Identifier: MIT

import {
  createBrowserWorkspaceHostPagePortV1,
  type BrowserWorkspaceHostExportReadyV1,
  type BrowserWorkspaceHostExportResultV1,
  type BrowserWorkspaceHostFatalV1,
  type BrowserWorkspaceHostPagePortV1,
} from "../workspace/browser-workspace-host-port.ts";
import type {
  BrowserWorkspaceHostExportProgressWireV1,
  BrowserWorkspaceHostSnapshotWireV1,
  BrowserWorkspaceVolumeAnchorWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";
import { createBrowserProgramRepositoryV2 } from "./browser-program-repository.ts";
import {
  browserProgramContinuationManifestsEqualV1,
  browserProgramContinuationMatchesAggregateV1,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryAggregateV2,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "./program-repository.ts";

interface BrowserWorkspaceHostWorkerLikeV1 {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown }>) => void,
  ): void;
  addEventListener(type: "error" | "messageerror", listener: (event: Event) => void): void;
  removeEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown }>) => void,
  ): void;
  removeEventListener(type: "error" | "messageerror", listener: (event: Event) => void): void;
  terminate(): void;
}

export interface BrowserProgramWorkspaceOpenResultV1 {
  readonly snapshot: BrowserWorkspaceHostSnapshotWireV1;
  readonly environmentPort: MessagePort;
}

export type BrowserProgramWorkspaceFatalV1 = BrowserWorkspaceHostFatalV1;

export type BrowserProgramWorkspaceExportProgressV1 = BrowserWorkspaceHostExportProgressWireV1;
export type BrowserProgramWorkspaceExportReadyV1 = BrowserWorkspaceHostExportReadyV1;
export type BrowserProgramWorkspaceExportResultV1 = BrowserWorkspaceHostExportResultV1;

export interface BrowserProgramWorkspaceAuthorityV1 {
  openWorkspace(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserProgramWorkspaceOpenResultV1>;
  queryWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  exportWorkspace(input: {
    readonly workspaceSessionId: string;
    readonly signal: AbortSignal;
    readonly onProgress?: (progress: BrowserProgramWorkspaceExportProgressV1) => void;
    readonly onReady: (
      ready: BrowserProgramWorkspaceExportReadyV1,
      commitRelease: () => boolean,
    ) => "release" | "cancel" | Promise<"release" | "cancel">;
  }): Promise<BrowserProgramWorkspaceExportResultV1>;
  closeWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  subscribeFatal(listener: (fatal: BrowserProgramWorkspaceFatalV1) => void): () => void;
  dispose(): Promise<void>;
}

export interface BrowserProgramWorkspaceAuthorityOptionsV1 {
  readonly repository?: ProgramRepositoryWithWorkspaceContinuationV1;
  readonly createRepository?: () => ProgramRepositoryWithWorkspaceContinuationV1;
  readonly host?: BrowserWorkspaceHostPagePortV1;
  readonly createHostWorker?: () => BrowserWorkspaceHostWorkerLikeV1;
}

function defaultHostWorkerV1(): BrowserWorkspaceHostWorkerLikeV1 {
  return new Worker(new URL("../workspace/browser-workspace-host.worker.ts", import.meta.url), {
    type: "module",
    name: "sillyos-browser-workspace-host",
  }) as unknown as BrowserWorkspaceHostWorkerLikeV1;
}

function authorityErrorV1(code: string): TypeError {
  return new TypeError(`sillyos.browser_program_workspace.${code}`);
}

function cancelledExportV1(): BrowserProgramWorkspaceExportResultV1 {
  return {
    kind: "cancelled",
    filesCompleted: 0,
    filesTotal: 0,
    bytesWritten: 0,
    bytesTotal: 0,
  };
}

function failureCodeV1(error: unknown): string | null {
  if (error === null || typeof error !== "object") return null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" ? code : null;
}

function aggregateForWorkspaceV1(
  aggregate: ProgramRepositoryAggregateV2 | null,
  programId: string,
  workspaceId: string,
): ProgramRepositoryAggregateV2 {
  if (
    aggregate === null || aggregate.programId !== programId ||
    aggregate.snapshot.program === null ||
    aggregate.snapshot.program.programId !== programId || aggregate.snapshot.workspace === null ||
    aggregate.snapshot.workspace.workspaceId !== workspaceId
  ) throw authorityErrorV1("program_workspace_mismatch");
  return aggregate;
}

function manifestForCandidateV1(
  aggregate: ProgramRepositoryAggregateV2,
  anchor: BrowserWorkspaceVolumeAnchorWireV1,
): BrowserProgramContinuationManifestV1 {
  const program = aggregate.snapshot.program;
  if (program === null) throw authorityErrorV1("program_unavailable");
  return Object.freeze({
    revision: 1,
    programId: aggregate.programId,
    workspaceId: anchor.workspaceId,
    volumeId: anchor.volumeId,
    workspaceFormat: anchor.workspaceFormat,
    programRevision: program.revision,
    repositoryRevision: aggregate.repositoryRevision,
  });
}

function anchorFromManifestV1(
  manifest: BrowserProgramContinuationManifestV1,
): BrowserWorkspaceVolumeAnchorWireV1 {
  return Object.freeze({
    revision: 1,
    programId: manifest.programId,
    workspaceId: manifest.workspaceId,
    volumeId: manifest.volumeId,
    workspaceFormat: manifest.workspaceFormat,
  });
}

/**
 * Product-owned composition of the Program continuation record and its OPFS Host.
 * Pi receives only the returned environment port after this authority has selected
 * the exact durable owner and acquired its volume lease.
 */
export function createBrowserProgramWorkspaceAuthorityV1(
  options: BrowserProgramWorkspaceAuthorityOptionsV1 = {},
): BrowserProgramWorkspaceAuthorityV1 {
  const createRepository = options.createRepository ?? createBrowserProgramRepositoryV2;
  let repository = options.repository ?? createRepository();
  const host = options.host ?? createBrowserWorkspaceHostPagePortV1({
    worker: (options.createHostWorker ?? defaultHostWorkerV1)(),
  });
  let initialized: Promise<void> | null = null;
  let activeSessionId: string | null = null;
  let disposed = false;
  const fatalListeners = new Set<(fatal: BrowserProgramWorkspaceFatalV1) => void>();
  const unsubscribeHostFatal = host.subscribeFatal((fatal) => {
    if (disposed) return;
    activeSessionId = null;
    for (const listener of [...fatalListeners]) {
      try {
        listener(fatal);
      } catch {
        // Fatal observers cannot change Program Workspace authority lifecycle.
      }
    }
  });

  const initialize = (): Promise<void> => {
    if (disposed) return Promise.reject(authorityErrorV1("disposed"));
    initialized ??= repository.initialize();
    return initialized;
  };

  const replaceRepository = async (): Promise<void> => {
    const predecessor = repository;
    repository = createRepository();
    initialized = repository.initialize();
    await Promise.resolve(predecessor.dispose()).catch(() => undefined);
    await initialized;
  };

  const selectManifest = async (input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserProgramContinuationManifestV1> => {
    let candidateAnchor: BrowserWorkspaceVolumeAnchorWireV1 | null = null;
    let candidateDiscardable = false;
    try {
      const existing = await repository.loadWorkspaceContinuation(input.programId);
      if (existing !== null) {
        if (existing.workspaceId !== input.workspaceId) {
          throw authorityErrorV1("program_workspace_mismatch");
        }
        return existing;
      }

      candidateAnchor = await host.createCandidate(input);
      candidateDiscardable = true;
      const candidate = candidateAnchor;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const aggregate = aggregateForWorkspaceV1(
          await repository.load(input.programId),
          input.programId,
          input.workspaceId,
        );
        const desired = manifestForCandidateV1(aggregate, candidate);
        try {
          const settled = await repository.insertWorkspaceContinuation(desired);
          if ("continuation" in settled) {
            if (!browserProgramContinuationManifestsEqualV1(settled.continuation, desired)) {
              throw authorityErrorV1("continuation_response_mismatch");
            }
            candidateDiscardable = false;
            return settled.continuation;
          }
          if (settled.current !== null) {
            if (settled.current.workspaceId !== input.workspaceId) {
              throw authorityErrorV1("program_workspace_mismatch");
            }
            await host.discardCandidate(candidate.volumeId);
            candidateAnchor = null;
            return settled.current;
          }
        } catch (error) {
          if (failureCodeV1(error) !== "outcome_unknown") throw error;
          candidateDiscardable = false;
          await replaceRepository();
          const reconciled = await repository.loadWorkspaceContinuation(input.programId);
          if (reconciled !== null) {
            if (browserProgramContinuationManifestsEqualV1(reconciled, desired)) {
              return reconciled;
            }
            if (reconciled.workspaceId !== input.workspaceId) {
              throw authorityErrorV1("program_workspace_mismatch");
            }
            await host.discardCandidate(candidate.volumeId);
            candidateAnchor = null;
            return reconciled;
          }
          candidateDiscardable = true;
        }
      }
      throw authorityErrorV1("continuation_conflict");
    } finally {
      if (candidateAnchor !== null && candidateDiscardable) {
        await host.discardCandidate(candidateAnchor.volumeId).catch(() => undefined);
      }
    }
  };

  const loadExportManifest = async (
    snapshot: BrowserWorkspaceHostSnapshotWireV1,
  ): Promise<BrowserProgramContinuationManifestV1> => {
    const { programId, workspaceId } = snapshot.descriptor;
    const continuation = await repository.loadWorkspaceContinuation(programId);
    const aggregate = aggregateForWorkspaceV1(
      await repository.load(programId),
      programId,
      workspaceId,
    );
    if (
      continuation === null ||
      continuation.workspaceId !== workspaceId ||
      continuation.volumeId !== snapshot.volumeId ||
      continuation.workspaceFormat !== snapshot.anchor.workspaceFormat ||
      !browserProgramContinuationMatchesAggregateV1(continuation, aggregate)
    ) throw authorityErrorV1("export_anchor_changed");
    return continuation;
  };

  return {
    async openWorkspace(input) {
      if (disposed) throw authorityErrorV1("disposed");
      if (activeSessionId !== null) throw authorityErrorV1("workspace_busy");
      await initialize();
      return await host.withBootstrapLease({
        ...input,
        operation: async () => {
          const manifest = await selectManifest(input);
          const opened = await host.openWorkspace(anchorFromManifestV1(manifest));
          activeSessionId = opened.descriptor.workspaceSessionId;
          try {
            const attached = await host.attachEnvironment({
              workspaceSessionId: opened.descriptor.workspaceSessionId,
            });
            if (
              attached.snapshot.descriptor.workspaceSessionId !==
                opened.descriptor.workspaceSessionId ||
              attached.snapshot.descriptor.generation !== opened.descriptor.generation
            ) throw authorityErrorV1("environment_attachment_mismatch");
            return Object.freeze({
              snapshot: attached.snapshot,
              environmentPort: attached.environmentPort,
            });
          } catch (error) {
            await host.closeWorkspace(opened.descriptor.workspaceSessionId).catch(() => undefined);
            activeSessionId = null;
            throw error;
          }
        },
      });
    },

    queryWorkspace(workspaceSessionId) {
      if (disposed) return Promise.reject(authorityErrorV1("disposed"));
      if (activeSessionId !== workspaceSessionId) {
        return Promise.reject(authorityErrorV1("workspace_mismatch"));
      }
      return host.queryWorkspace(workspaceSessionId);
    },

    async exportWorkspace(input) {
      if (disposed) throw authorityErrorV1("disposed");
      if (activeSessionId !== input.workspaceSessionId) {
        throw authorityErrorV1("workspace_mismatch");
      }
      if (input.signal.aborted) return cancelledExportV1();
      await initialize();
      if (input.signal.aborted) return cancelledExportV1();
      const initialSnapshot = await host.queryWorkspace(input.workspaceSessionId);
      if (input.signal.aborted) return cancelledExportV1();
      if (initialSnapshot.phase !== "open") throw authorityErrorV1("workspace_not_open");
      const initialManifest = await loadExportManifest(initialSnapshot);
      if (input.signal.aborted) return cancelledExportV1();
      return await host.exportWorkspace({
        workspaceSessionId: input.workspaceSessionId,
        expectedCheckpointId: initialSnapshot.checkpointId,
        expectedGeneration: initialSnapshot.descriptor.generation,
        programRevision: initialManifest.programRevision,
        repositoryRevision: initialManifest.repositoryRevision,
        signal: input.signal,
        ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
        onReady: async (ready, commitRelease) => {
          if (input.signal.aborted) return "cancel";
          const currentSnapshot = await host.queryWorkspace(input.workspaceSessionId);
          if (
            currentSnapshot.phase !== "open" ||
            currentSnapshot.checkpointId !== initialSnapshot.checkpointId ||
            currentSnapshot.descriptor.generation !== initialSnapshot.descriptor.generation ||
            currentSnapshot.volumeId !== initialSnapshot.volumeId
          ) throw authorityErrorV1("export_anchor_changed");
          const currentManifest = await loadExportManifest(currentSnapshot);
          if (input.signal.aborted) return "cancel";
          if (!browserProgramContinuationManifestsEqualV1(currentManifest, initialManifest)) {
            throw authorityErrorV1("export_anchor_changed");
          }
          if (input.signal.aborted) return "cancel";
          return await input.onReady(ready, commitRelease);
        },
      });
    },

    async closeWorkspace(workspaceSessionId) {
      if (disposed) throw authorityErrorV1("disposed");
      if (activeSessionId !== workspaceSessionId) throw authorityErrorV1("workspace_mismatch");
      const closed = await host.closeWorkspace(workspaceSessionId);
      activeSessionId = null;
      return closed;
    },

    subscribeFatal(listener) {
      if (disposed) return () => {};
      fatalListeners.add(listener);
      return () => fatalListeners.delete(listener);
    },

    async dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribeHostFatal();
      fatalListeners.clear();
      const sessionId = activeSessionId;
      activeSessionId = null;
      if (sessionId !== null) {
        await host.closeWorkspace(sessionId).catch(() => undefined);
      }
      host.dispose();
      await repository.dispose().catch(() => undefined);
    },
  };
}
