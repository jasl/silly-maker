// SPDX-License-Identifier: MIT

import type {
  AgentRpcRawConnectionInternalV1,
  AgentRpcRawTransportInternalV1,
} from "@sillymaker/agent/internal";

import {
  admitBrowserPiEngineRequestV1,
  admitBrowserPiWorkerOutboundMessageV1,
  type BrowserPiWorkerInitializeV1,
} from "./browser-pi-worker-protocol.ts";

type BrowserPiWorkerMessageListenerV1 = (event: { readonly data: unknown }) => void;
type BrowserPiWorkerErrorListenerV1 = (event: unknown) => void;

export interface BrowserPiWorkerLikeV1 {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: BrowserPiWorkerMessageListenerV1): void;
  addEventListener(type: "error", listener: BrowserPiWorkerErrorListenerV1): void;
  removeEventListener(type: "message", listener: BrowserPiWorkerMessageListenerV1): void;
  removeEventListener(type: "error", listener: BrowserPiWorkerErrorListenerV1): void;
  terminate(): void;
}

export type BrowserPiWorkerFactoryV1 = () => BrowserPiWorkerLikeV1;

export interface BrowserPiWorkerRawTransportV1 extends AgentRpcRawTransportInternalV1 {
  /** Terminates an initializing or connected Worker and drops any unposted credential. */
  forget(): Promise<void>;
}

interface PendingCallV1 {
  readonly method: "start" | "submit" | "cancel";
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: Error) => void;
}

interface ConnectionStateV1 {
  readonly worker: BrowserPiWorkerLikeV1;
  readonly onRecord: (record: unknown) => void;
  readonly pending: Map<number, PendingCallV1>;
  readonly bufferedRecords: unknown[];
  readonly resolveReady: (ready: boolean) => void;
  messageListener: BrowserPiWorkerMessageListenerV1;
  errorListener: BrowserPiWorkerErrorListenerV1;
  cancelReadyTimer: (() => void) | null;
  nextCallId: number;
  pendingSubmitGates: number;
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

export function createBrowserPiWorkerRawTransportV1({
  apiKey: suppliedApiKey,
  runtime,
  workerFactory = defaultBrowserPiWorkerFactoryV1,
}: {
  readonly apiKey: string;
  readonly runtime: "deterministic_test";
  readonly workerFactory?: BrowserPiWorkerFactoryV1;
}): BrowserPiWorkerRawTransportV1 {
  let pendingApiKey = suppliedApiKey.length > 0 &&
      suppliedApiKey.length <= credentialMaximumCharactersV1
    ? suppliedApiKey
    : null;
  suppliedApiKey = "";
  let activeState: ConnectionStateV1 | null = null;

  const closeState = (state: ConnectionStateV1, reason: string): void => {
    if (state.closed) return;
    state.closed = true;
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
    state.bufferedRecords.length = 0;
    state.resolveReady(false);
    try {
      state.worker.terminate();
    } catch {
      // Termination is best-effort after the Worker has become unreachable.
    }
    if (activeState === state) activeState = null;
  };

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
        bufferedRecords: [],
        resolveReady,
        messageListener: undefined as unknown as BrowserPiWorkerMessageListenerV1,
        errorListener: undefined as unknown as BrowserPiWorkerErrorListenerV1,
        cancelReadyTimer: null,
        nextCallId: 2,
        pendingSubmitGates: 0,
        ready: false,
        closed: false,
      };

      const flushRecords = (): void => {
        if (state.closed || state.pendingSubmitGates !== 0) return;
        const records = state.bufferedRecords.splice(0);
        for (const record of records) {
          try {
            state.onRecord(record);
          } catch {
            // The raw record consumer is observational at this transport boundary.
          }
        }
      };

      state.messageListener = (event: { readonly data: unknown }): void => {
        if (state.closed) return;
        const message = admitBrowserPiWorkerOutboundMessageV1(event.data);
        if (message === null || message.kind === "protocol_failure") {
          closeState(state, "protocol_failure");
          return;
        }
        if (!state.ready) {
          if (message.kind !== "ready" || message.requestId !== 1) {
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
        if (message.kind === "rpc_record") {
          if (state.pendingSubmitGates !== 0) {
            if (state.bufferedRecords.length >= bufferedRecordMaximumV1) {
              closeState(state, "record_buffer_limit");
              return;
            }
            state.bufferedRecords.push(message.record);
          } else {
            try {
              state.onRecord(message.record);
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
        if (message.ok) pending.resolve(message.response);
        else pending.reject(transportErrorV1(`rpc_${message.code}`));
        if (pending.method === "submit") {
          // Engine request settlement/tracking and the product facade continuation
          // both run before a synchronously delivered Worker record is released.
          queueMicrotask(() =>
            queueMicrotask(() => {
              if (state.closed) return;
              state.pendingSubmitGates -= 1;
              flushRecords();
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
              const envelope = Object.freeze({
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
    async forget(): Promise<void> {
      pendingApiKey = null;
      if (activeState !== null) closeState(activeState, "forgotten");
    },
  };
  return transport;
}
