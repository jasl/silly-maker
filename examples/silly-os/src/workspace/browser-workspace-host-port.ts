// SPDX-License-Identifier: MIT

import {
  admitBrowserWorkspaceHostControlOutboundMessageV1,
  type BrowserWorkspaceHostControlFailureCodeV1,
  type BrowserWorkspaceHostControlRequestRecordV1,
  type BrowserWorkspaceHostControlSuccessResponseV1,
  type BrowserWorkspaceHostSnapshotWireV1,
  type BrowserWorkspaceVolumeAnchorWireV1,
} from "./browser-workspace-host-protocol.ts";
import {
  type BrowserWorkspaceHostExclusiveLockPortV1,
  createBrowserWorkspaceHostWebLockPortV1,
} from "./browser-workspace-host-opfs.ts";

interface BrowserWorkspaceHostWorkerPortV1 {
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
  readonly worker: BrowserWorkspaceHostWorkerPortV1;
  readonly bootstrapLockPort?: BrowserWorkspaceHostExclusiveLockPortV1;
  readonly createMessageChannel?: () => MessageChannel;
}

export interface BrowserWorkspaceHostFatalV1 {
  readonly code: "invalid_response" | "outcome_unknown" | "unavailable";
}

export interface BrowserWorkspaceHostPagePortV1 {
  withBootstrapLease<T>(input: {
    readonly programId: string;
    readonly workspaceId: string;
    readonly operation: () => Promise<T>;
  }): Promise<T>;
  createCandidate(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserWorkspaceVolumeAnchorWireV1>;
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
  subscribeFatal(listener: (fatal: BrowserWorkspaceHostFatalV1) => void): () => void;
  dispose(): void;
}

export function createBrowserWorkspaceHostPagePortV1(
  options: BrowserWorkspaceHostPagePortOptionsV1,
): BrowserWorkspaceHostPagePortV1 {
  const bootstrapLockPort = options.bootstrapLockPort ??
    createBrowserWorkspaceHostWebLockPortV1(navigator.locks);
  const createMessageChannel = options.createMessageChannel ?? (() => new MessageChannel());
  const pending = new Map<number, PendingControlRequestV1>();
  const candidateBootstrapKeys = new Map<string, string>();
  const fatalListeners = new Set<(fatal: BrowserWorkspaceHostFatalV1) => void>();
  let nextRequestId = 1;
  let disposed = false;
  let activeBootstrapKey: string | null = null;

  const failPending = (error: Error): void => {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  const lostResponseError = (request: PendingControlRequestV1): Error => {
    const outcomeUnknown = request.method !== "query_workspace";
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
    options.worker.removeEventListener("message", listener);
    options.worker.removeEventListener("error", transportFailureListener);
    options.worker.removeEventListener("messageerror", transportFailureListener);
    for (const request of pending.values()) request.reject(lostResponseError(request));
    pending.clear();
    candidateBootstrapKeys.clear();
    options.worker.terminate();
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
      code: [...pending.values()].some(({ method }) => method !== "query_workspace")
        ? "outcome_unknown"
        : "unavailable",
    });
  };
  options.worker.addEventListener("message", listener);
  options.worker.addEventListener("error", transportFailureListener);
  options.worker.addEventListener("messageerror", transportFailureListener);

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
        options.worker.postMessage(
          { revision: 1, kind: "control_request", requestId, record },
          transfer,
        );
      } catch (error) {
        void error;
        poisonTransport({
          code: record.method === "query_workspace" ? "unavailable" : "outcome_unknown",
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
      candidateBootstrapKeys.set(response.anchor.volumeId, expectedBootstrapKey);
      return response.anchor;
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
      options.worker.removeEventListener("message", listener);
      options.worker.removeEventListener("error", transportFailureListener);
      options.worker.removeEventListener("messageerror", transportFailureListener);
      failPending(
        new BrowserWorkspaceHostControlErrorV1("disposed", "Workspace Host port was disposed"),
      );
      candidateBootstrapKeys.clear();
      fatalListeners.clear();
      options.worker.terminate();
    },
  };
}
