// SPDX-License-Identifier: MIT

import {
  admitBrowserWorkspaceHostControlOutboundMessageV1,
  admitBrowserWorkspaceHostExportOutboundMessageV1,
  type BrowserWorkspaceHostControlFailureCodeV1,
  type BrowserWorkspaceHostControlRequestRecordV1,
  type BrowserWorkspaceHostControlSuccessResponseV1,
  type BrowserWorkspaceHostPurgeAllWorkspacesResultWireV1,
  type BrowserWorkspaceHostSnapshotWireV1,
  type BrowserWorkspaceHostExportProgressWireV1,
  type BrowserWorkspaceHostStorageInspectionWireV1,
  type BrowserWorkspaceVolumeAnchorWireV1,
  type BrowserWorkspaceVolumeCandidateWireV1,
} from "./browser-workspace-host-protocol.ts";
import {
  type BrowserWorkspaceHostLockPortV1,
  createBrowserWorkspaceHostWebLockPortV1,
} from "./browser-workspace-host-opfs.ts";
import type { ProgramWorkspaceSnapshotReceiptV1 } from "./contracts.ts";

export interface BrowserWorkspaceHostControlTransportV1 {
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

interface PendingControlRequestV1 {
  readonly method: BrowserWorkspaceHostControlRequestRecordV1["method"];
  readonly resolve: (response: BrowserWorkspaceHostControlSuccessResponseV1["response"]) => void;
  readonly reject: (error: Error) => void;
}

interface ActiveExportV1 {
  reject(error: Error): void;
  close(): void;
}

export class BrowserWorkspaceHostControlErrorV1 extends Error {
  readonly code:
    | BrowserWorkspaceHostControlFailureCodeV1
    | "invalid_response"
    | "outcome_unknown"
    | "unavailable"
    | "disposed";

  constructor(
    code:
      | BrowserWorkspaceHostControlFailureCodeV1
      | "invalid_response"
      | "outcome_unknown"
      | "unavailable"
      | "disposed",
    message: string,
  ) {
    super(message);
    this.name = "BrowserWorkspaceHostControlErrorV1";
    this.code = code;
  }
}

export interface BrowserWorkspaceHostPagePortOptionsV1 {
  readonly transport: BrowserWorkspaceHostControlTransportV1;
  readonly bootstrapLockPort?: BrowserWorkspaceHostLockPortV1;
  readonly createMessageChannel?: () => MessageChannel;
  readonly createExportId?: () => string;
}

export interface BrowserWorkspaceHostFatalV1 {
  readonly code: "invalid_response" | "outcome_unknown" | "unavailable";
}

export interface BrowserWorkspaceHostExportReadyV1
  extends BrowserWorkspaceHostExportProgressWireV1 {
  readonly checkpointId: string;
  readonly generation: number;
}

export type BrowserWorkspaceHostExportResultV1 =
  | ({
    readonly kind: "released";
    readonly checkpointId: string;
    readonly generation: number;
  } & BrowserWorkspaceHostExportProgressWireV1)
  | ({ readonly kind: "cancelled" } & BrowserWorkspaceHostExportProgressWireV1);

export interface BrowserWorkspaceHostPagePortV1 {
  inspectStorage(): Promise<BrowserWorkspaceHostStorageInspectionWireV1>;
  purgeAllWorkspaces(): Promise<BrowserWorkspaceHostPurgeAllWorkspacesResultWireV1>;
  withBootstrapLease<T>(input: {
    readonly programId: string;
    readonly workspaceId: string;
    readonly operation: () => Promise<T>;
  }): Promise<T>;
  createCandidate(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserWorkspaceVolumeCandidateWireV1>;
  discardCandidate(volumeId: string): Promise<void>;
  openWorkspace(
    anchor: BrowserWorkspaceVolumeAnchorWireV1,
  ): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  queryWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  attachEnvironment(input: {
    readonly workspaceSessionId: string;
  }): Promise<{
    readonly snapshot: BrowserWorkspaceHostSnapshotWireV1;
    readonly environmentPort: MessagePort;
  }>;
  closeWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  exportWorkspace(input: {
    readonly workspaceSessionId: string;
    readonly expectedCheckpointId: string;
    readonly expectedGeneration: number;
    readonly programRevision: number;
    readonly repositoryRevision: number;
    readonly fileName: string;
    readonly signal: AbortSignal;
    readonly onProgress?: (progress: BrowserWorkspaceHostExportProgressWireV1) => void;
    readonly onReady: (
      ready: BrowserWorkspaceHostExportReadyV1,
      startDownload: () => Promise<void>,
    ) => "release" | "cancel" | Promise<"release" | "cancel">;
  }): Promise<BrowserWorkspaceHostExportResultV1>;
  prepareSnapshot(input: {
    readonly workspaceSessionId: string;
    readonly snapshotId: string;
    readonly proposalId: string;
    readonly expectedCheckpointId: string;
    readonly expectedGeneration: number;
    readonly programRevision: number;
    readonly baseRepositoryRevision: number;
  }): Promise<ProgramWorkspaceSnapshotReceiptV1>;
  querySnapshotCandidate(
    workspaceSessionId: string,
  ): Promise<ProgramWorkspaceSnapshotReceiptV1 | null>;
  queryRetainedSnapshot(input: {
    readonly workspaceSessionId: string;
    readonly expected: ProgramWorkspaceSnapshotReceiptV1;
  }): Promise<ProgramWorkspaceSnapshotReceiptV1 | null>;
  captureReviewHead(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1>;
  resumeSnapshotPublication(input: {
    readonly workspaceSessionId: string;
    readonly expected: ProgramWorkspaceSnapshotReceiptV1;
  }): Promise<ProgramWorkspaceSnapshotReceiptV1>;
  adoptSnapshot(input: {
    readonly workspaceSessionId: string;
    readonly expected: ProgramWorkspaceSnapshotReceiptV1;
  }): Promise<"adopted" | "already_retained">;
  discardSnapshot(input: {
    readonly workspaceSessionId: string;
    readonly expected: ProgramWorkspaceSnapshotReceiptV1;
  }): Promise<"discarded" | "absent" | "retained">;
  subscribeFatal(listener: (fatal: BrowserWorkspaceHostFatalV1) => void): () => void;
  dispose(): void;
}

export function createBrowserWorkspaceHostPagePortV1(
  options: BrowserWorkspaceHostPagePortOptionsV1,
): BrowserWorkspaceHostPagePortV1 {
  const bootstrapLockPort = options.bootstrapLockPort ??
    createBrowserWorkspaceHostWebLockPortV1(navigator.locks);
  const createMessageChannel = options.createMessageChannel ?? (() => new MessageChannel());
  const createExportId = options.createExportId ??
    (() => `sillyos.workspace.export.${crypto.randomUUID()}`);
  const pending = new Map<number, PendingControlRequestV1>();
  const activeExports = new Set<ActiveExportV1>();
  const candidateBootstrapKeys = new Map<string, string>();
  const fatalListeners = new Set<(fatal: BrowserWorkspaceHostFatalV1) => void>();
  let nextRequestId = 1;
  let disposed = false;
  let activeBootstrapKey: string | null = null;

  const failPending = (error: Error): void => {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  const failActiveExports = (error: Error): void => {
    const exports = [...activeExports];
    activeExports.clear();
    for (const activeExport of exports) {
      activeExport.reject(error);
      activeExport.close();
    }
  };

  const mutationOutcomeCanBeUnknown = (
    method: BrowserWorkspaceHostControlRequestRecordV1["method"],
  ): boolean =>
    method !== "inspect_storage" && method !== "query_workspace" &&
    method !== "query_snapshot_candidate" &&
    method !== "query_retained_snapshot" && method !== "capture_review_head";

  const lostResponseError = (request: PendingControlRequestV1): Error => {
    const outcomeUnknown = mutationOutcomeCanBeUnknown(request.method);
    return new BrowserWorkspaceHostControlErrorV1(
      outcomeUnknown ? "outcome_unknown" : "unavailable",
      outcomeUnknown
        ? `Workspace Host lost the outcome of ${request.method}`
        : "Workspace Host became unavailable while reading its snapshot",
    );
  };

  const poisonTransport = (fatal: BrowserWorkspaceHostFatalV1): void => {
    if (disposed) return;
    disposed = true;
    options.transport.removeEventListener("message", listener);
    options.transport.removeEventListener("error", transportFailureListener);
    options.transport.removeEventListener("messageerror", transportFailureListener);
    for (const request of pending.values()) request.reject(lostResponseError(request));
    pending.clear();
    failActiveExports(
      new BrowserWorkspaceHostControlErrorV1(
        fatal.code,
        "Workspace Host became unavailable during workspace export",
      ),
    );
    candidateBootstrapKeys.clear();
    options.transport.terminate();
    for (const fatalListener of [...fatalListeners]) {
      try {
        fatalListener(fatal);
      } catch {
        // Fatal observers cannot change Host transport lifecycle.
      }
    }
    fatalListeners.clear();
  };

  const listener = (event: Readonly<{ data: unknown }>): void => {
    const response = admitBrowserWorkspaceHostControlOutboundMessageV1(event.data);
    if (response === null) {
      poisonTransport({ code: "invalid_response" });
      return;
    }
    const request = pending.get(response.requestId);
    if (request === undefined) return;
    if (!response.ok) {
      pending.delete(response.requestId);
      request.reject(
        new BrowserWorkspaceHostControlErrorV1(
          response.code,
          `Workspace Host rejected ${request.method}: ${response.code}`,
        ),
      );
      return;
    }
    if (response.response.method !== request.method) {
      poisonTransport({ code: "invalid_response" });
      return;
    }
    pending.delete(response.requestId);
    request.resolve(response.response);
  };
  const transportFailureListener = (event: Event): void => {
    event.preventDefault();
    poisonTransport({
      code: [...pending.values()].some(({ method }) => mutationOutcomeCanBeUnknown(method))
        ? "outcome_unknown"
        : "unavailable",
    });
  };
  options.transport.addEventListener("message", listener);
  options.transport.addEventListener("error", transportFailureListener);
  options.transport.addEventListener("messageerror", transportFailureListener);

  const request = (
    record: BrowserWorkspaceHostControlRequestRecordV1,
    transfer: Transferable[] = [],
  ): Promise<BrowserWorkspaceHostControlSuccessResponseV1["response"]> => {
    if (disposed) {
      return Promise.reject(
        new BrowserWorkspaceHostControlErrorV1("disposed", "Workspace Host port is disposed"),
      );
    }
    const requestId = nextRequestId++;
    return new Promise((resolve, reject) => {
      pending.set(requestId, { method: record.method, resolve, reject });
      try {
        options.transport.postMessage(
          { revision: 1, kind: "control_request", requestId, record },
          transfer,
        );
      } catch (error) {
        void error;
        poisonTransport({
          code: mutationOutcomeCanBeUnknown(record.method) ? "outcome_unknown" : "unavailable",
        });
      }
    });
  };

  const snapshotResponse = async (
    record: Extract<
      BrowserWorkspaceHostControlRequestRecordV1,
      { readonly workspaceSessionId: string } | { readonly method: "open_workspace" }
    >,
    transfer: Transferable[] = [],
  ): Promise<BrowserWorkspaceHostSnapshotWireV1> => {
    const response = await request(record, transfer);
    if (!("snapshot" in response)) {
      throw new BrowserWorkspaceHostControlErrorV1(
        "invalid_response",
        "Workspace Host omitted its lifecycle snapshot",
      );
    }
    return response.snapshot;
  };

  return {
    async inspectStorage() {
      const response = await request({ method: "inspect_storage" });
      if (response.method !== "inspect_storage") {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace Host omitted its storage inspection",
        );
      }
      return response.storage;
    },

    async purgeAllWorkspaces() {
      const response = await request({ method: "purge_all_workspaces" });
      if (response.method !== "purge_all_workspaces") {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace Host omitted its purge receipt",
        );
      }
      candidateBootstrapKeys.clear();
      return response.result;
    },

    async withBootstrapLease(input) {
      if (activeBootstrapKey !== null) {
        throw new BrowserWorkspaceHostControlErrorV1(
          "workspace_busy",
          "A Workspace bootstrap lease is already active on this page port",
        );
      }
      const bootstrapKey = `sillyos.workspace.bootstrap.${input.programId}.${input.workspaceId}`;
      const lease = await bootstrapLockPort.acquire(
        bootstrapKey,
        { ifAvailable: false },
      );
      if (lease === null) {
        throw new BrowserWorkspaceHostControlErrorV1(
          "workspace_busy",
          "Workspace bootstrap lease was not acquired",
        );
      }
      activeBootstrapKey = bootstrapKey;
      try {
        return await input.operation();
      } finally {
        activeBootstrapKey = null;
        await lease.release();
      }
    },

    async createCandidate(input) {
      const expectedBootstrapKey =
        `sillyos.workspace.bootstrap.${input.programId}.${input.workspaceId}`;
      if (activeBootstrapKey !== expectedBootstrapKey) {
        throw new BrowserWorkspaceHostControlErrorV1(
          "candidate_mismatch",
          "Workspace candidate creation requires its active page bootstrap lease",
        );
      }
      const response = await request({ method: "create_candidate", ...input });
      if (response.method !== "create_candidate") {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace Host omitted its candidate anchor",
        );
      }
      candidateBootstrapKeys.set(response.candidate.anchor.volumeId, expectedBootstrapKey);
      return response.candidate;
    },

    async discardCandidate(volumeId) {
      const expectedBootstrapKey = candidateBootstrapKeys.get(volumeId);
      if (expectedBootstrapKey === undefined || activeBootstrapKey !== expectedBootstrapKey) {
        throw new BrowserWorkspaceHostControlErrorV1(
          "candidate_mismatch",
          "Workspace candidate discard requires its active page bootstrap lease",
        );
      }
      await request({ method: "discard_candidate", volumeId });
      candidateBootstrapKeys.delete(volumeId);
    },

    async openWorkspace(anchor) {
      const candidateBootstrapKey = candidateBootstrapKeys.get(anchor.volumeId);
      if (
        candidateBootstrapKey !== undefined && activeBootstrapKey !== candidateBootstrapKey
      ) {
        throw new BrowserWorkspaceHostControlErrorV1(
          "candidate_mismatch",
          "Workspace candidate open requires its active page bootstrap lease",
        );
      }
      const opened = await snapshotResponse({ method: "open_workspace", anchor });
      candidateBootstrapKeys.delete(anchor.volumeId);
      return opened;
    },

    queryWorkspace(workspaceSessionId) {
      return snapshotResponse({ method: "query_workspace", workspaceSessionId });
    },

    async attachEnvironment(input) {
      const channel = createMessageChannel();
      try {
        const snapshot = await snapshotResponse(
          { method: "attach_environment", workspaceSessionId: input.workspaceSessionId },
          [channel.port1],
        );
        return { snapshot, environmentPort: channel.port2 };
      } catch (error) {
        channel.port1.close();
        channel.port2.close();
        throw error;
      }
    },

    async exportWorkspace(input) {
      const exportId = createExportId();
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(exportId)) {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace export identity factory returned an invalid identity",
        );
      }
      if (input.signal.aborted) {
        return {
          kind: "cancelled",
          filesCompleted: 0,
          filesTotal: 0,
          bytesWritten: 0,
          bytesTotal: 0,
        };
      }
      const channel = createMessageChannel();
      let expectedSequence = 1;
      let started = false;
      let ready: BrowserWorkspaceHostExportReadyV1 | null = null;
      let readySeen = false;
      let readyConsumerActive = false;
      let downloadStartSent = false;
      let downloadStarted = false;
      let downloadStartSettled = false;
      let releaseSent = false;
      let consumerError: unknown = null;
      let terminalSettled = false;
      let totalsInitialized = false;
      let lastProgress: BrowserWorkspaceHostExportProgressWireV1 = {
        filesCompleted: 0,
        filesTotal: 0,
        bytesWritten: 0,
        bytesTotal: 0,
      };
      let resolveTerminal!: (result: BrowserWorkspaceHostExportResultV1) => void;
      let rejectTerminal!: (error: Error) => void;
      const terminal = new Promise<BrowserWorkspaceHostExportResultV1>((resolve, reject) => {
        resolveTerminal = resolve;
        rejectTerminal = reject;
      });
      void terminal.catch(() => undefined);
      let resolveDownloadStarted!: () => void;
      let rejectDownloadStarted!: (error: Error) => void;
      const downloadStartedReceipt = new Promise<void>((resolve, reject) => {
        resolveDownloadStarted = resolve;
        rejectDownloadStarted = reject;
      });
      void downloadStartedReceipt.catch(() => undefined);
      const settleDownloadStarted = (error: Error | null): void => {
        if (downloadStartSettled) return;
        downloadStartSettled = true;
        if (error === null) resolveDownloadStarted();
        else rejectDownloadStarted(error);
      };

      const send = (
        kind:
          | "workspace_export_cancel"
          | "workspace_export_start_download"
          | "workspace_export_release",
      ): boolean => {
        if (terminalSettled && kind !== "workspace_export_cancel") return false;
        try {
          channel.port2.postMessage({ revision: 1, kind, exportId });
          if (kind === "workspace_export_start_download") downloadStartSent = true;
          if (kind === "workspace_export_release") releaseSent = true;
          return true;
        } catch {
          // The control transport failure path owns recovery when the port is already gone.
          return false;
        }
      };
      const failChannel = (message: string): void => {
        if (terminalSettled) return;
        terminalSettled = true;
        send("workspace_export_cancel");
        const error = new BrowserWorkspaceHostControlErrorV1("invalid_response", message);
        settleDownloadStarted(error);
        rejectTerminal(error);
        poisonTransport({ code: "invalid_response" });
      };
      const validNextProgress = (next: BrowserWorkspaceHostExportProgressWireV1): boolean =>
        next.filesCompleted >= lastProgress.filesCompleted &&
        (!totalsInitialized || lastProgress.filesTotal === next.filesTotal) &&
        next.bytesWritten >= lastProgress.bytesWritten &&
        (!totalsInitialized || lastProgress.bytesTotal === next.bytesTotal);

      const consumeReady = async (): Promise<void> => {
        const current = ready;
        if (!started || current === null || terminalSettled) return;
        ready = null;
        if (input.signal.aborted) {
          send("workspace_export_cancel");
          return;
        }
        const startDownload = (): Promise<void> => {
          if (downloadStartSent) return downloadStartedReceipt;
          if (!readyConsumerActive || terminalSettled || input.signal.aborted) {
            return Promise.reject(
              new BrowserWorkspaceHostControlErrorV1(
                "unavailable",
                "Workspace export download authorization is no longer current",
              ),
            );
          }
          if (!send("workspace_export_start_download")) {
            return Promise.reject(
              new BrowserWorkspaceHostControlErrorV1(
                "unavailable",
                "Workspace export download authorization could not be sent",
              ),
            );
          }
          return downloadStartedReceipt;
        };
        readyConsumerActive = true;
        try {
          await input.onReady(current, startDownload);
          readyConsumerActive = false;
          if (terminalSettled) return;
          if (!downloadStartSent) {
            send("workspace_export_cancel");
            return;
          }
          await downloadStartedReceipt;
          if (!terminalSettled) send("workspace_export_release");
        } catch (error) {
          readyConsumerActive = false;
          if (terminalSettled) return;
          if (!input.signal.aborted || downloadStartSent) consumerError = error;
          if (!downloadStartSent) {
            send("workspace_export_cancel");
            return;
          }
          try {
            await downloadStartedReceipt;
          } catch {
            return;
          }
          if (!terminalSettled) send("workspace_export_release");
        }
      };

      const exportListener = (event: MessageEvent<unknown>): void => {
        if (terminalSettled) return;
        const message = admitBrowserWorkspaceHostExportOutboundMessageV1(event.data);
        if (
          message === null || message.exportId !== exportId ||
          message.sequence !== expectedSequence
        ) {
          failChannel("Workspace Host emitted an invalid export record");
          return;
        }
        expectedSequence += 1;
        const nextProgress = {
          filesCompleted: message.filesCompleted,
          filesTotal: message.filesTotal,
          bytesWritten: message.bytesWritten,
          bytesTotal: message.bytesTotal,
        };
        if (!validNextProgress(nextProgress)) {
          failChannel("Workspace Host export progress moved backwards or changed totals");
          return;
        }
        lastProgress = nextProgress;
        totalsInitialized = true;
        if (message.kind === "workspace_export_progress") {
          try {
            input.onProgress?.(lastProgress);
          } catch {
            // UI progress observers cannot alter export ownership.
          }
          return;
        }
        if (message.kind === "workspace_export_ready") {
          if (
            readySeen || message.filesCompleted !== message.filesTotal ||
            message.bytesWritten !== message.bytesTotal ||
            message.checkpointId !== input.expectedCheckpointId ||
            message.generation !== input.expectedGeneration
          ) {
            failChannel("Workspace Host emitted an invalid ready export");
            return;
          }
          readySeen = true;
          ready = {
            checkpointId: message.checkpointId,
            generation: message.generation,
            ...lastProgress,
          };
          void consumeReady();
          return;
        }
        if (message.kind === "workspace_export_download_started") {
          if (
            !readySeen || !downloadStartSent || downloadStarted || ready !== null ||
            message.filesCompleted !== message.filesTotal ||
            message.bytesWritten !== message.bytesTotal ||
            message.checkpointId !== input.expectedCheckpointId ||
            message.generation !== input.expectedGeneration
          ) {
            failChannel("Workspace Host emitted an invalid download-started export");
            return;
          }
          downloadStarted = true;
          settleDownloadStarted(null);
          return;
        }
        terminalSettled = true;
        if (message.kind === "workspace_export_released") {
          if (
            !readySeen || !downloadStarted || !releaseSent || ready !== null ||
            message.filesCompleted !== message.filesTotal ||
            message.bytesWritten !== message.bytesTotal ||
            message.checkpointId !== input.expectedCheckpointId ||
            message.generation !== input.expectedGeneration
          ) {
            terminalSettled = false;
            failChannel("Workspace Host emitted an invalid released export");
            return;
          }
          resolveTerminal({
            kind: "released",
            checkpointId: message.checkpointId,
            generation: message.generation,
            ...lastProgress,
          });
          return;
        }
        if (message.code === "cancelled") {
          settleDownloadStarted(
            new BrowserWorkspaceHostControlErrorV1(
              "unavailable",
              "Workspace export was cancelled before the download started",
            ),
          );
          resolveTerminal({ kind: "cancelled", ...lastProgress });
          return;
        }
        const failure = new BrowserWorkspaceHostControlErrorV1(
          message.code,
          `Workspace export failed: ${message.code}`,
        );
        settleDownloadStarted(failure);
        rejectTerminal(failure);
      };
      channel.port2.addEventListener("message", exportListener);
      channel.port2.start();
      const cancelListener = (): void => {
        if (!downloadStartSent) send("workspace_export_cancel");
      };
      input.signal.addEventListener("abort", cancelListener, { once: true });
      let channelClosed = false;
      const closeChannel = (): void => {
        if (channelClosed) return;
        channelClosed = true;
        channel.port1.close();
        channel.port2.close();
      };
      const activeExport: ActiveExportV1 = {
        reject(error) {
          if (terminalSettled) return;
          terminalSettled = true;
          settleDownloadStarted(error);
          rejectTerminal(error);
        },
        close: closeChannel,
      };
      activeExports.add(activeExport);
      try {
        const response = await request({
          method: "start_export",
          exportId,
          workspaceSessionId: input.workspaceSessionId,
          expectedCheckpointId: input.expectedCheckpointId,
          expectedGeneration: input.expectedGeneration,
          programRevision: input.programRevision,
          repositoryRevision: input.repositoryRevision,
          fileName: input.fileName,
        }, [channel.port1]);
        if (
          response.method !== "start_export" || response.exportId !== exportId ||
          response.snapshot.phase !== "open" ||
          response.snapshot.descriptor.workspaceSessionId !== input.workspaceSessionId ||
          response.snapshot.checkpointId !== input.expectedCheckpointId ||
          response.snapshot.descriptor.generation !== input.expectedGeneration
        ) {
          failChannel("Workspace Host returned an invalid export start response");
        } else {
          started = true;
          void consumeReady();
        }
        const result = await terminal;
        if (consumerError !== null) {
          throw consumerError instanceof Error
            ? consumerError
            : new Error("Workspace export consumer failed");
        }
        return result;
      } catch (error) {
        if (!downloadStartSent) send("workspace_export_cancel");
        void terminal.catch(() => undefined);
        throw error;
      } finally {
        activeExports.delete(activeExport);
        input.signal.removeEventListener("abort", cancelListener);
        channel.port2.removeEventListener("message", exportListener);
        closeChannel();
      }
    },

    async prepareSnapshot(input) {
      const response = await request({ method: "prepare_snapshot", ...input });
      if (response.method !== "prepare_snapshot") {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace Host omitted its immutable snapshot receipt",
        );
      }
      return response.receipt;
    },

    async querySnapshotCandidate(workspaceSessionId) {
      const response = await request({ method: "query_snapshot_candidate", workspaceSessionId });
      if (response.method !== "query_snapshot_candidate") {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace Host omitted its immutable snapshot candidate query result",
        );
      }
      return response.receipt;
    },

    async queryRetainedSnapshot(input) {
      const response = await request({ method: "query_retained_snapshot", ...input });
      if (response.method !== "query_retained_snapshot") {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace Host omitted its retained immutable snapshot query result",
        );
      }
      return response.receipt;
    },

    captureReviewHead(workspaceSessionId) {
      return snapshotResponse({ method: "capture_review_head", workspaceSessionId });
    },

    async resumeSnapshotPublication(input) {
      const response = await request({ method: "resume_snapshot_publication", ...input });
      if (response.method !== "resume_snapshot_publication") {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace Host omitted its resumed immutable snapshot receipt",
        );
      }
      return response.receipt;
    },

    async adoptSnapshot(input) {
      const response = await request({ method: "adopt_snapshot", ...input });
      if (
        response.method !== "adopt_snapshot" ||
        response.snapshotId !== input.expected.snapshotId
      ) {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace Host omitted its immutable snapshot adoption result",
        );
      }
      return response.result;
    },

    async discardSnapshot(input) {
      const response = await request({ method: "discard_snapshot", ...input });
      if (
        response.method !== "discard_snapshot" ||
        response.snapshotId !== input.expected.snapshotId
      ) {
        throw new BrowserWorkspaceHostControlErrorV1(
          "invalid_response",
          "Workspace Host omitted its immutable snapshot discard receipt",
        );
      }
      return response.result;
    },

    closeWorkspace(workspaceSessionId) {
      return snapshotResponse({ method: "close_workspace", workspaceSessionId });
    },

    subscribeFatal(fatalListener) {
      if (disposed) return () => {};
      fatalListeners.add(fatalListener);
      return () => fatalListeners.delete(fatalListener);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      options.transport.removeEventListener("message", listener);
      options.transport.removeEventListener("error", transportFailureListener);
      options.transport.removeEventListener("messageerror", transportFailureListener);
      failPending(
        new BrowserWorkspaceHostControlErrorV1("disposed", "Workspace Host port was disposed"),
      );
      failActiveExports(
        new BrowserWorkspaceHostControlErrorV1(
          "disposed",
          "Workspace Host port was disposed during workspace export",
        ),
      );
      candidateBootstrapKeys.clear();
      fatalListeners.clear();
      options.transport.terminate();
    },
  };
}
