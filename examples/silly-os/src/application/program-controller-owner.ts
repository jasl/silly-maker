// SPDX-License-Identifier: MIT

import type { BrowserProgramWorkspaceAuthorityHostV1 } from "./workspace/browser-program-workspace-authority.ts";
import type { ProgramDataRepositoryV1 } from "./persistence/program-data-repository.ts";
import type {
  ProgramPackageLoadResultV1,
  ProgramPackageServiceV1,
} from "../program-platform/installation/program-package-service.ts";
import type { InstalledProgramPackageReferenceV1 } from "../program-platform/package/program-package-archive.ts";
import {
  createReadOnlyProcessConversationControllerV1,
  type ReadOnlyProcessConversationControllerV1,
  type ReadOnlyProcessConversationDegradationV1,
  type ReadOnlyProcessConversationResultV1,
} from "../program-platform/process/read-only-process-conversation-controller.ts";
import type {
  RecentProcessSummaryListInputV1,
  RecentProcessSummaryPageV1,
} from "../program-platform/process/program-process-repository.ts";
import type {
  ActiveProgramRuntimeHandleV1,
  LoadProgramRuntimeControllerAdapterV1,
  ProgramRuntimeControllerAdapterV1,
} from "./program-runtime-controller.ts";

export type SillyOsProgramRouteV1 = "library" | "program" | "conversation";
type SillyOsStableProgramRouteV1 = Exclude<SillyOsProgramRouteV1, "conversation">;

export interface SillyOsProgramControllerSnapshotV1 {
  readonly revision: number;
  readonly activeProgram: ActiveProgramRuntimeHandleV1 | null;
  readonly readOnlyConversation: ReadOnlyProcessConversationControllerV1;
  readonly activeRoute: SillyOsProgramRouteV1;
  readonly defaultProgramFailure: string | null;
}

export interface SillyOsProgramControllerOwnerV1 {
  getSnapshot(): SillyOsProgramControllerSnapshotV1;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<void>;
  openLibrary(): Promise<boolean>;
  launch(reference: InstalledProgramPackageReferenceV1): Promise<"program">;
  openRecentProcess(processId: string): Promise<SillyOsProgramRouteV1>;
  openReadOnlyProcess(processId: string): Promise<ReadOnlyProcessConversationResultV1>;
  closeReadOnlyProcess(): SillyOsStableProgramRouteV1;
  listRecentProcesses(
    input: RecentProcessSummaryListInputV1,
  ): Promise<RecentProcessSummaryPageV1>;
  dispose(): Promise<void>;
}

function failureCodeV1(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const code = Reflect.get(error, "code");
    if (typeof code === "string" && code.length > 0) return code;
  }
  return error instanceof Error ? error.message : "sillyos.program_controller.unknown_failure";
}

function loadResultFailureV1(kind: string): Error {
  return new Error(`sillyos.program_package.${kind}`);
}

async function closeProgramV1(handle: ActiveProgramRuntimeHandleV1): Promise<void> {
  if (!await handle.close()) throw new Error("sillyos.program_controller.workspace_busy");
}

export function createSillyOsProgramControllerOwnerV1(input: {
  readonly repository: ProgramDataRepositoryV1;
  readonly workspace: BrowserProgramWorkspaceAuthorityHostV1;
  readonly packages: ProgramPackageServiceV1;
  readonly loadRuntimeControllerAdapter: LoadProgramRuntimeControllerAdapterV1;
  readonly reportFailure: (code: string, error: unknown) => void;
}): SillyOsProgramControllerOwnerV1 {
  const listeners = new Set<() => void>();
  const readOnlyConversation = createReadOnlyProcessConversationControllerV1({
    repository: input.repository,
  });
  let snapshot: SillyOsProgramControllerSnapshotV1 = {
    revision: 0,
    activeProgram: null,
    readOnlyConversation,
    activeRoute: "library",
    defaultProgramFailure: null,
  };
  let disposed = false;
  let initialized: Promise<void> | null = null;
  let operationTail = Promise.resolve();
  let conversationReturnRoute: SillyOsStableProgramRouteV1 = "library";

  const publishV1 = (
    next: Omit<SillyOsProgramControllerSnapshotV1, "revision">,
  ): void => {
    if (disposed) return;
    snapshot = { ...next, revision: snapshot.revision + 1 };
    for (const listener of listeners) listener();
  };

  const serializeV1 = <T>(operation: () => Promise<T>): Promise<T> => {
    const settlement = operationTail.then(operation);
    operationTail = settlement.then(() => undefined, () => undefined);
    return settlement;
  };

  const releaseAfterRouteCommitV1 = async (
    handle: ActiveProgramRuntimeHandleV1,
    failureCode: string,
  ): Promise<void> => {
    try {
      await handle.dispose();
    } catch (error) {
      input.reportFailure(failureCode, error);
    }
  };

  const launchV1 = async (
    reference: InstalledProgramPackageReferenceV1,
    exactProcessId: string | null = null,
    readyPackage?: Extract<ProgramPackageLoadResultV1, { readonly kind: "ready" }>["package"],
    readyAdapter?: ProgramRuntimeControllerAdapterV1,
  ): Promise<"program"> => {
    const programPackage = readyPackage ?? await (async () => {
      const loaded = await input.packages.loadExact(reference);
      if (loaded.kind !== "ready") throw loadResultFailureV1(loaded.kind);
      return loaded.package;
    })();
    const adapter = readyAdapter ?? await input.loadRuntimeControllerAdapter(
      programPackage.manifest.runtimeProfile,
    );
    if (adapter === null || adapter.runtimeProfile !== programPackage.manifest.runtimeProfile) {
      throw new Error(
        `sillyos.program_runtime_profile.unavailable:${programPackage.manifest.runtimeProfile}`,
      );
    }
    const candidate = await adapter.create({
      repository: input.repository,
      workspace: input.workspace,
      programPackage,
      exactProcessId,
      reportFailure: input.reportFailure,
    });
    const predecessor = snapshot.activeProgram;
    try {
      if (predecessor !== null) await closeProgramV1(predecessor);
    } catch (error) {
      await releaseAfterRouteCommitV1(
        candidate,
        "silly_os.program_candidate_dispose_failed",
      );
      throw error;
    }
    publishV1({
      activeProgram: candidate,
      readOnlyConversation,
      activeRoute: "program",
      defaultProgramFailure: null,
    });
    if (predecessor !== null) {
      await releaseAfterRouteCommitV1(
        predecessor,
        "silly_os.program_predecessor_dispose_failed",
      );
    }
    return "program";
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize() {
      initialized ??= (async () => {
        try {
          await input.repository.initialize();
        } catch (error) {
          publishV1({
            activeProgram: snapshot.activeProgram,
            readOnlyConversation,
            activeRoute: snapshot.activeRoute,
            defaultProgramFailure: failureCodeV1(error),
          });
        }
      })();
      return initialized;
    },
    openLibrary() {
      if (disposed) return Promise.resolve(false);
      return serializeV1(async () => {
        const activeProgram = snapshot.activeProgram;
        try {
          if (activeProgram !== null) await closeProgramV1(activeProgram);
          readOnlyConversation.close();
        } catch (error) {
          input.reportFailure("silly_os.program_library_open_failed", error);
          return false;
        }
        conversationReturnRoute = "library";
        publishV1({
          activeProgram: null,
          readOnlyConversation,
          activeRoute: "library",
          defaultProgramFailure: snapshot.defaultProgramFailure,
        });
        if (activeProgram !== null) {
          await releaseAfterRouteCommitV1(
            activeProgram,
            "silly_os.program_library_predecessor_dispose_failed",
          );
        }
        return true;
      });
    },
    launch(reference) {
      if (disposed) return Promise.reject(new Error("sillyos.program_controller.disposed"));
      return serializeV1(async () => {
        const route = await launchV1(reference);
        readOnlyConversation.close();
        return route;
      });
    },
    openRecentProcess(processId) {
      if (disposed) return Promise.reject(new Error("sillyos.program_controller.disposed"));
      return serializeV1(async () => {
        const process = await input.repository.loadProcess(processId);
        if (process === null) throw new Error("sillyos.conversation.process_not_found");
        let loaded: ProgramPackageLoadResultV1 | null = null;
        let degradation: ReadOnlyProcessConversationDegradationV1 = {
          capability: "package",
          code: "package_unavailable",
        };
        try {
          loaded = await input.packages.loadExact(process.programPackage);
        } catch (error) {
          degradation = { capability: "package", code: failureCodeV1(error) };
          input.reportFailure("silly_os.recent_process_package_load_failed", error);
        }
        if (loaded !== null && loaded.kind !== "ready") {
          degradation = { capability: "package", code: loaded.kind };
        }
        if (loaded?.kind === "ready") {
          try {
            const adapter = await input.loadRuntimeControllerAdapter(
              loaded.package.manifest.runtimeProfile,
            );
            if (
              adapter === null || adapter.runtimeProfile !== loaded.package.manifest.runtimeProfile
            ) {
              degradation = { capability: "runtime", code: "runtime_profile_unavailable" };
            } else {
              if (process.checkpoint !== null) {
                let workspaceAvailable = false;
                try {
                  workspaceAvailable = await input.workspace.probeProcessWorkspace(
                    process.processId,
                  );
                } catch (error) {
                  degradation = { capability: "workspace", code: failureCodeV1(error) };
                  input.reportFailure("silly_os.recent_process_workspace_probe_failed", error);
                }
                if (!workspaceAvailable) {
                  if (degradation.capability !== "workspace") {
                    degradation = {
                      capability: "workspace",
                      code: "process_workspace_unavailable",
                    };
                  }
                } else {
                  const route = await launchV1(
                    process.programPackage,
                    process.processId,
                    loaded.package,
                    adapter,
                  );
                  readOnlyConversation.close();
                  return route;
                }
              } else {
                const route = await launchV1(
                  process.programPackage,
                  process.processId,
                  loaded.package,
                  adapter,
                );
                readOnlyConversation.close();
                return route;
              }
            }
          } catch (error) {
            degradation = { capability: "runtime", code: failureCodeV1(error) };
            // A runtime-specific recovery failure degrades to durable read.
            input.reportFailure("silly_os.recent_process_runtime_restore_failed", error);
          }
        }
        const fallback = await readOnlyConversation.openProcess(process.processId, degradation);
        if (fallback.kind !== "completed" || !fallback.value) {
          throw new Error(
            `sillyos.conversation.${fallback.kind === "failed" ? fallback.code : "open_failed"}`,
          );
        }
        if (snapshot.activeRoute !== "conversation") {
          conversationReturnRoute = snapshot.activeRoute;
        }
        publishV1({
          activeProgram: snapshot.activeProgram,
          readOnlyConversation,
          activeRoute: "conversation",
          defaultProgramFailure: snapshot.defaultProgramFailure,
        });
        return "conversation";
      });
    },
    openReadOnlyProcess(processId) {
      if (disposed) return Promise.resolve({ kind: "failed", code: "disposed" });
      return serializeV1(async () => {
        const result = await readOnlyConversation.openProcess(processId);
        if (result.kind !== "completed" || !result.value) return result;
        if (snapshot.activeRoute !== "conversation") {
          conversationReturnRoute = snapshot.activeRoute;
        }
        publishV1({
          activeProgram: snapshot.activeProgram,
          readOnlyConversation,
          activeRoute: "conversation",
          defaultProgramFailure: snapshot.defaultProgramFailure,
        });
        return result;
      });
    },
    closeReadOnlyProcess() {
      if (disposed) return conversationReturnRoute;
      readOnlyConversation.close();
      if (snapshot.activeRoute !== "conversation") return snapshot.activeRoute;
      publishV1({
        activeProgram: snapshot.activeProgram,
        readOnlyConversation,
        activeRoute: conversationReturnRoute,
        defaultProgramFailure: snapshot.defaultProgramFailure,
      });
      return conversationReturnRoute;
    },
    listRecentProcesses(listInput) {
      if (disposed) return Promise.reject(new Error("sillyos.program_controller.disposed"));
      return input.repository.listRecentProcessSummaries(listInput);
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await initialized?.catch(() => undefined);
      await operationTail.catch(() => undefined);
      if (snapshot.activeProgram !== null) await snapshot.activeProgram.dispose();
      readOnlyConversation.dispose();
      listeners.clear();
    },
  };
}
