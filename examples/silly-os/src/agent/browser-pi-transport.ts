// SPDX-License-Identifier: MIT

import type {
  AgentRpcRawConnectionInternalV1,
  AgentRpcRawTransportInternalV1,
} from "@sillymaker/agent/internal";

import type {
  BrowserProgramWorkspaceAuthorityV1,
  BrowserProgramWorkspaceFatalV1,
} from "../product/browser-program-workspace-authority.ts";
import type { BrowserWorkspaceHostSnapshotWireV1 } from "../workspace/browser-workspace-host-protocol.ts";
import {
  admitBrowserPiEngineRequestV1,
  admitBrowserPiWorkerAnyOutboundMessageV1,
  type BrowserPiWorkerInitializeV1,
  type BrowserPiWorkerRuntimeV1,
  type BrowserPiWorkspaceMutationReceiptWireV1,
  type BrowserPiWorkspaceRequestRecordV1,
  type BrowserPiWorkspaceSnapshotWireV1,
} from "./browser-pi-worker-protocol.ts";

type BrowserPiWorkerMessageListenerV1 = (event: { readonly data: unknown }) => void;
type BrowserPiWorkerErrorListenerV1 = (event: unknown) => void;

export interface BrowserPiWorkerLikeV1 {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: "message", listener: BrowserPiWorkerMessageListenerV1): void;
  addEventListener(type: "error", listener: BrowserPiWorkerErrorListenerV1): void;
  removeEventListener(type: "message", listener: BrowserPiWorkerMessageListenerV1): void;
  removeEventListener(type: "error", listener: BrowserPiWorkerErrorListenerV1): void;
  terminate(): void;
}

export type BrowserPiWorkerFactoryV1 = () => BrowserPiWorkerLikeV1;

export interface BrowserPiWorkspaceFailureV1 {
  readonly revision: 1;
  readonly code: BrowserProgramWorkspaceFatalV1["code"];
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly generation: number;
}

export interface BrowserPiWorkerRawTransportV1 extends AgentRpcRawTransportInternalV1 {
  openWorkspace(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserPiWorkspaceSnapshotWireV1>;
  closeWorkspace(workspaceSessionId: string): Promise<BrowserPiWorkspaceSnapshotWireV1>;
  queryWorkspace(workspaceSessionId: string): Promise<BrowserPiWorkspaceSnapshotWireV1>;
  acknowledgeWorkspaceReceipts(input: {
    readonly workspaceSessionId: string;
    readonly throughSequence: number;
  }): Promise<BrowserPiWorkspaceSnapshotWireV1>;
  subscribeWorkspaceReceipts(
    listener: (receipt: BrowserPiWorkspaceMutationReceiptWireV1) => void,
  ): () => void;
  subscribeWorkspaceFailures(
    listener: (failure: BrowserPiWorkspaceFailureV1) => void,
  ): () => void;
  /** Terminates an initializing or connected Worker and drops any unposted credential. */
  forget(): Promise<void>;
}

interface PendingCallV1 {
  readonly method:
    | "start"
    | "submit"
    | "cancel"
    | BrowserPiWorkspaceRequestRecordV1["method"];
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: Error) => void;
}

type BufferedWorkerEventV1 =
  | { readonly kind: "rpc_record"; readonly record: unknown }
  | {
    readonly kind: "workspace_receipt";
    readonly receipt: BrowserPiWorkspaceMutationReceiptWireV1;
  };

interface ConnectionStateV1 {
  readonly worker: BrowserPiWorkerLikeV1;
  readonly onRecord: (record: unknown) => void;
  readonly pending: Map<number, PendingCallV1>;
  readonly bufferedEvents: BufferedWorkerEventV1[];
  readonly resolveReady: (ready: boolean) => void;
  messageListener: BrowserPiWorkerMessageListenerV1;
  errorListener: BrowserPiWorkerErrorListenerV1;
  cancelReadyTimer: (() => void) | null;
  nextCallId: number;
  pendingSubmitGates: number;
  activeWorkspace: BrowserPiWorkspaceSnapshotWireV1 | null;
  workspaceReceiptSequence: number;
  ready: boolean;
  closed: boolean;
}

const readyTimeoutMillisecondsV1 = 5_000;
const bufferedRecordMaximumV1 = 2_048;
const credentialMaximumCharactersV1 = 64 * 1024;

function defaultBrowserPiWorkerFactoryV1(): BrowserPiWorkerLikeV1 {
  return new Worker(new URL("./browser-pi.worker.ts", import.meta.url), {
    type: "module",
    name: "sillyos-browser-pi",
  }) as unknown as BrowserPiWorkerLikeV1;
}

function transportErrorV1(code: string): TypeError {
  return new TypeError(`sillyos.browser_pi_transport.${code}`);
}

function isWorkspaceMethodV1(method: PendingCallV1["method"]): boolean {
  return method.endsWith("_workspace") || method === "acknowledge_workspace_receipts";
}

function hostDescriptorMatchesPiSnapshotV1(
  host: BrowserWorkspaceHostSnapshotWireV1,
  pi: BrowserPiWorkspaceSnapshotWireV1,
): boolean {
  return host.phase === pi.phase && host.descriptor.programId === pi.programId &&
    host.descriptor.workspaceId === pi.workspaceId &&
    host.descriptor.workspaceSessionId === pi.workspaceSessionId &&
    host.descriptor.generation === pi.generation;
}

function executionBindingFromHostV1(
  host: BrowserWorkspaceHostSnapshotWireV1,
): Extract<BrowserPiWorkspaceRequestRecordV1, { readonly method: "attach_workspace" }>[
  "descriptor"
] {
  return Object.freeze({
    revision: 1,
    programId: host.descriptor.programId,
    workspaceId: host.descriptor.workspaceId,
    workspaceSessionId: host.descriptor.workspaceSessionId,
    expectedGeneration: host.descriptor.generation,
  });
}

export function createBrowserPiWorkerRawTransportV1({
  apiKey: suppliedApiKey,
  runtime,
  workspaceAuthority,
  workerFactory = defaultBrowserPiWorkerFactoryV1,
}: {
  readonly apiKey: string;
  readonly runtime: BrowserPiWorkerRuntimeV1;
  readonly workspaceAuthority: BrowserProgramWorkspaceAuthorityV1;
  readonly workerFactory?: BrowserPiWorkerFactoryV1;
}): BrowserPiWorkerRawTransportV1 {
  let pendingApiKey = suppliedApiKey.length > 0 &&
      suppliedApiKey.length <= credentialMaximumCharactersV1
    ? suppliedApiKey
    : null;
  suppliedApiKey = "";
  let activeState: ConnectionStateV1 | null = null;
  const workspaceReceiptListeners = new Set<
    (receipt: BrowserPiWorkspaceMutationReceiptWireV1) => void
  >();
  const workspaceFailureListeners = new Set<(failure: BrowserPiWorkspaceFailureV1) => void>();

  const closeState = (
    state: ConnectionStateV1,
    reason: string,
    releaseWorkspaceAuthority = true,
  ): void => {
    if (state.closed) return;
    state.closed = true;
    const workspaceSessionId = state.activeWorkspace?.phase === "open"
      ? state.activeWorkspace.workspaceSessionId
      : null;
    if (state.cancelReadyTimer !== null) {
      state.cancelReadyTimer();
      state.cancelReadyTimer = null;
    }
    state.worker.removeEventListener("message", state.messageListener);
    state.worker.removeEventListener("error", state.errorListener);
    for (const pending of state.pending.values()) {
      pending.reject(transportErrorV1(reason));
    }
    state.pending.clear();
    state.bufferedEvents.length = 0;
    state.resolveReady(false);
    try {
      state.worker.terminate();
    } catch {
      // Termination is best-effort after the Worker has become unreachable.
    }
    if (releaseWorkspaceAuthority && workspaceSessionId !== null) {
      void workspaceAuthority.closeWorkspace(workspaceSessionId).catch(() => undefined);
    }
    if (activeState === state) activeState = null;
  };

  const unsubscribeWorkspaceAuthorityFatal = workspaceAuthority.subscribeFatal((fatal) => {
    const state = activeState;
    if (state === null || state.closed) return;
    const workspace = state.activeWorkspace?.phase === "open" ? state.activeWorkspace : null;
    closeState(state, "workspace_host_unavailable", false);
    if (workspace === null) return;
    const failure = Object.freeze(
      {
        revision: 1,
        code: fatal.code,
        programId: workspace.programId,
        workspaceId: workspace.workspaceId,
        workspaceSessionId: workspace.workspaceSessionId,
        generation: workspace.generation,
      } satisfies BrowserPiWorkspaceFailureV1,
    );
    for (const listener of [...workspaceFailureListeners]) {
      try {
        listener(failure);
      } catch {
        // Workspace failure observers cannot change transport lifecycle.
      }
    }
  });

  const transport: BrowserPiWorkerRawTransportV1 = {
    isConfigured(): boolean {
      return pendingApiKey !== null || (activeState !== null && !activeState.closed);
    },
    async connect({ onRecord }) {
      if (activeState !== null && !activeState.closed) {
        return { kind: "unavailable", reason: "failed" };
      }
      if (pendingApiKey === null) return { kind: "unconfigured" };

      let worker: BrowserPiWorkerLikeV1;
      try {
        worker = workerFactory();
      } catch {
        pendingApiKey = null;
        return { kind: "unavailable", reason: "failed" };
      }

      let resolveReady!: (ready: boolean) => void;
      const readyPromise = new Promise<boolean>((resolve) => {
        resolveReady = resolve;
      });
      const state: ConnectionStateV1 = {
        worker,
        onRecord,
        pending: new Map<number, PendingCallV1>(),
        bufferedEvents: [],
        resolveReady,
        messageListener: undefined as unknown as BrowserPiWorkerMessageListenerV1,
        errorListener: undefined as unknown as BrowserPiWorkerErrorListenerV1,
        cancelReadyTimer: null,
        nextCallId: 2,
        pendingSubmitGates: 0,
        activeWorkspace: null,
        workspaceReceiptSequence: 0,
        ready: false,
        closed: false,
      };

      const deliverWorkspaceReceipt = (
        receipt: BrowserPiWorkspaceMutationReceiptWireV1,
      ): void => {
        const current = state.activeWorkspace;
        if (
          current === null || current.phase !== "open" ||
          receipt.programId !== current.programId ||
          receipt.workspaceId !== current.workspaceId ||
          receipt.workspaceSessionId !== current.workspaceSessionId ||
          receipt.baseGeneration !== current.generation ||
          receipt.sequence !== state.workspaceReceiptSequence + 1 ||
          current.receipts.length >= 32
        ) {
          closeState(state, "workspace_receipt_invalid");
          return;
        }
        state.activeWorkspace = Object.freeze({
          ...current,
          generation: receipt.resultingGeneration,
          receipts: Object.freeze([...current.receipts, receipt]),
        });
        state.workspaceReceiptSequence = receipt.sequence;
        for (const listener of [...workspaceReceiptListeners]) {
          try {
            listener(receipt);
          } catch {
            // Workspace receipt observers cannot change transport lifecycle.
          }
        }
      };

      const flushEvents = (): void => {
        if (state.closed || state.pendingSubmitGates !== 0) return;
        const events = state.bufferedEvents.splice(0);
        for (const event of events) {
          if (event.kind === "workspace_receipt") {
            deliverWorkspaceReceipt(event.receipt);
          } else {
            try {
              state.onRecord(event.record);
            } catch {
              // The raw record consumer is observational at this transport boundary.
            }
          }
          if (state.closed) return;
        }
      };

      state.messageListener = (event: { readonly data: unknown }): void => {
        if (state.closed) return;
        const message = admitBrowserPiWorkerAnyOutboundMessageV1(event.data);
        if (message === null || message.kind === "protocol_failure") {
          closeState(state, "protocol_failure");
          return;
        }
        if (!state.ready) {
          if (
            message.kind !== "ready" || message.requestId !== 1 ||
            message.runtime !== runtime
          ) {
            closeState(state, "ready_invalid");
            return;
          }
          state.ready = true;
          if (state.cancelReadyTimer !== null) {
            state.cancelReadyTimer();
            state.cancelReadyTimer = null;
          }
          state.resolveReady(true);
          return;
        }
        if (message.kind === "ready") {
          closeState(state, "duplicate_ready");
          return;
        }
        if (message.kind === "rpc_record" || message.kind === "workspace_receipt") {
          const buffered: BufferedWorkerEventV1 = message.kind === "rpc_record"
            ? { kind: "rpc_record", record: message.record }
            : { kind: "workspace_receipt", receipt: message.receipt };
          if (state.pendingSubmitGates !== 0) {
            if (state.bufferedEvents.length >= bufferedRecordMaximumV1) {
              closeState(state, "record_buffer_limit");
              return;
            }
            state.bufferedEvents.push(buffered);
          } else if (buffered.kind === "workspace_receipt") {
            deliverWorkspaceReceipt(buffered.receipt);
          } else {
            try {
              state.onRecord(buffered.record);
            } catch {
              // The raw record consumer is observational at this transport boundary.
            }
          }
          return;
        }
        const pending = state.pending.get(message.requestId);
        if (pending === undefined) {
          closeState(state, "unknown_response");
          return;
        }
        state.pending.delete(message.requestId);
        if (message.kind === "workspace_response") {
          if (!isWorkspaceMethodV1(pending.method)) {
            closeState(state, "workspace_response_mismatch");
            return;
          }
          if (message.ok) {
            const previousWorkspaceSessionId = state.activeWorkspace?.workspaceSessionId;
            state.activeWorkspace = message.response.snapshot;
            const lastReceipt = message.response.snapshot.receipts.at(-1);
            if (message.response.method === "acknowledge_workspace_receipts") {
              state.workspaceReceiptSequence = Math.max(
                state.workspaceReceiptSequence,
                message.response.throughSequence,
                lastReceipt?.sequence ?? 0,
              );
            } else if (
              previousWorkspaceSessionId !== message.response.snapshot.workspaceSessionId
            ) {
              state.workspaceReceiptSequence = lastReceipt?.sequence ?? 0;
            } else if (lastReceipt !== undefined) {
              state.workspaceReceiptSequence = Math.max(
                state.workspaceReceiptSequence,
                lastReceipt.sequence,
              );
            }
            pending.resolve(message.response);
          } else pending.reject(transportErrorV1(`workspace_${message.code}`));
        } else {
          if (isWorkspaceMethodV1(pending.method)) {
            closeState(state, "rpc_response_mismatch");
            return;
          }
          if (message.ok) pending.resolve(message.response);
          else pending.reject(transportErrorV1(`rpc_${message.code}`));
        }
        if (pending.method === "submit") {
          // Engine request settlement/tracking and the product facade continuation
          // both run before a synchronously delivered Worker record is released.
          queueMicrotask(() =>
            queueMicrotask(() => {
              if (state.closed) return;
              state.pendingSubmitGates -= 1;
              flushEvents();
            })
          );
        }
      };
      state.errorListener = (): void => closeState(state, "worker_error");
      activeState = state;
      worker.addEventListener("message", state.messageListener);
      worker.addEventListener("error", state.errorListener);
      const readyTimer = setTimeout(
        () => closeState(state, "ready_timeout"),
        readyTimeoutMillisecondsV1,
      );
      state.cancelReadyTimer = () => clearTimeout(readyTimer);

      const postCredentialOnce = (): void => {
        const apiKey = pendingApiKey;
        pendingApiKey = null;
        if (apiKey === null) throw transportErrorV1("credential_missing");
        const initialize: BrowserPiWorkerInitializeV1 = {
          revision: 1,
          kind: "initialize",
          requestId: 1,
          runtime,
          credential: { kind: "api_key", value: apiKey },
        };
        // Worker.postMessage has no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        worker.postMessage(initialize);
      };
      try {
        postCredentialOnce();
      } catch {
        closeState(state, "initialize_failed");
        return { kind: "unavailable", reason: "failed" };
      }

      const ready = await readyPromise;
      if (!ready || state.closed) return { kind: "unavailable", reason: "failed" };

      const connection: AgentRpcRawConnectionInternalV1 = {
        request(record: unknown): Promise<unknown> {
          if (state.closed || activeState !== state) {
            return Promise.reject(transportErrorV1("connection_closed"));
          }
          const request = admitBrowserPiEngineRequestV1(record);
          if (request === null) return Promise.reject(transportErrorV1("request_invalid"));
          const callId = state.nextCallId++;
          if (request.method === "submit") state.pendingSubmitGates += 1;
          return new Promise<unknown>((resolve, reject) => {
            state.pending.set(callId, { method: request.method, resolve, reject });
            try {
              const envelope = request.method === "submit"
                ? (() => {
                  const workspace = state.activeWorkspace;
                  if (workspace === null || workspace.phase !== "open") {
                    throw transportErrorV1("workspace_unavailable");
                  }
                  return Object.freeze({
                    revision: 1,
                    kind: "rpc_request",
                    requestId: callId,
                    record: request,
                    execution: Object.freeze({
                      revision: 1,
                      programId: workspace.programId,
                      workspaceId: workspace.workspaceId,
                      workspaceSessionId: workspace.workspaceSessionId,
                      expectedGeneration: workspace.generation,
                    }),
                  });
                })()
                : Object.freeze({
                  revision: 1,
                  kind: "rpc_request",
                  requestId: callId,
                  record: request,
                });
              // Worker.postMessage has no targetOrigin parameter.
              // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
              state.worker.postMessage(envelope);
            } catch {
              state.pending.delete(callId);
              if (request.method === "submit") state.pendingSubmitGates -= 1;
              reject(transportErrorV1("post_failed"));
            }
          });
        },
        async close(): Promise<void> {
          closeState(state, "connection_closed");
        },
      };
      return { kind: "connected", connection };
    },
    async openWorkspace(input): Promise<BrowserPiWorkspaceSnapshotWireV1> {
      const opened = await workspaceAuthority.openWorkspace(input);
      try {
        const snapshot = await workspaceRequestV1(
          {
            method: "attach_workspace",
            descriptor: executionBindingFromHostV1(opened.snapshot),
          },
          [opened.environmentPort],
        );
        if (!hostDescriptorMatchesPiSnapshotV1(opened.snapshot, snapshot)) {
          throw transportErrorV1("workspace_attachment_mismatch");
        }
        return snapshot;
      } catch (error) {
        await workspaceAuthority.closeWorkspace(
          opened.snapshot.descriptor.workspaceSessionId,
        ).catch(() => undefined);
        throw error;
      }
    },
    async closeWorkspace(workspaceSessionId): Promise<BrowserPiWorkspaceSnapshotWireV1> {
      let piSnapshot: BrowserPiWorkspaceSnapshotWireV1;
      try {
        piSnapshot = await workspaceRequestV1({ method: "close_workspace", workspaceSessionId });
      } catch (error) {
        await workspaceAuthority.closeWorkspace(workspaceSessionId).catch(() => undefined);
        throw error;
      }
      const hostSnapshot = await workspaceAuthority.closeWorkspace(workspaceSessionId);
      if (!hostDescriptorMatchesPiSnapshotV1(hostSnapshot, piSnapshot)) {
        throw transportErrorV1("workspace_close_mismatch");
      }
      return piSnapshot;
    },
    async queryWorkspace(workspaceSessionId): Promise<BrowserPiWorkspaceSnapshotWireV1> {
      const [piSnapshot, hostSnapshot] = await Promise.all([
        workspaceRequestV1({ method: "query_workspace", workspaceSessionId }),
        workspaceAuthority.queryWorkspace(workspaceSessionId),
      ]);
      if (!hostDescriptorMatchesPiSnapshotV1(hostSnapshot, piSnapshot)) {
        throw transportErrorV1("workspace_query_mismatch");
      }
      return piSnapshot;
    },
    acknowledgeWorkspaceReceipts(input): Promise<BrowserPiWorkspaceSnapshotWireV1> {
      return workspaceRequestV1({
        method: "acknowledge_workspace_receipts",
        workspaceSessionId: input.workspaceSessionId,
        throughSequence: input.throughSequence,
      });
    },
    subscribeWorkspaceReceipts(listener): () => void {
      workspaceReceiptListeners.add(listener);
      return () => workspaceReceiptListeners.delete(listener);
    },
    subscribeWorkspaceFailures(listener): () => void {
      workspaceFailureListeners.add(listener);
      return () => workspaceFailureListeners.delete(listener);
    },
    async forget(): Promise<void> {
      pendingApiKey = null;
      unsubscribeWorkspaceAuthorityFatal();
      workspaceFailureListeners.clear();
      const state = activeState;
      if (state !== null) {
        const workspace = state.activeWorkspace;
        if (workspace?.phase === "open") {
          await workspaceRequestV1({
            method: "close_workspace",
            workspaceSessionId: workspace.workspaceSessionId,
          }).catch(() => undefined);
          await workspaceAuthority.closeWorkspace(workspace.workspaceSessionId).catch(
            () => undefined,
          );
        }
        closeState(state, "forgotten");
      }
      await workspaceAuthority.dispose();
    },
  };

  const workspaceRequestV1 = async (
    record: BrowserPiWorkspaceRequestRecordV1,
    transfer: Transferable[] = [],
  ): Promise<BrowserPiWorkspaceSnapshotWireV1> => {
    const state = activeState;
    if (state === null || state.closed || !state.ready) {
      throw transportErrorV1("workspace_connection_unavailable");
    }
    const requestId = state.nextCallId++;
    const response = await new Promise<unknown>((resolve, reject) => {
      state.pending.set(requestId, { method: record.method, resolve, reject });
      try {
        const envelope = Object.freeze({
          revision: 1,
          kind: "workspace_request",
          requestId,
          record: Object.freeze(record),
        });
        state.worker.postMessage(envelope, transfer);
      } catch {
        state.pending.delete(requestId);
        reject(transportErrorV1("workspace_post_failed"));
      }
    });
    if (
      response === null || typeof response !== "object" ||
      !Object.hasOwn(response, "snapshot")
    ) throw transportErrorV1("workspace_response_invalid");
    return (response as { readonly snapshot: BrowserPiWorkspaceSnapshotWireV1 }).snapshot;
  };
  return transport;
}
