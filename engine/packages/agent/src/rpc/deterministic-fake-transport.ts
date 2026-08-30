// SPDX-License-Identifier: MIT
import type {
  AgentSessionConnectionV1,
  AgentSessionConnectorConnectResultV1,
  AgentSessionConnectorV1,
} from "../session/contracts.ts";

export type DeterministicFakeAgentSessionModeInternalV1 =
  | "unconfigured"
  | "slow"
  | "offline"
  | "failed"
  | "ready";

export interface DeterministicFakeAgentSessionOperationInternalV1 {
  readonly connection: number;
  readonly operation: "start" | "submit" | "cancel";
  readonly input: unknown;
}

export interface DeterministicFakeAgentSessionConnectorInternalV1 {
  readonly connector: AgentSessionConnectorV1;
  setMode(mode: DeterministicFakeAgentSessionModeInternalV1): void;
  resolveSlowConnectAs(
    mode: Exclude<DeterministicFakeAgentSessionModeInternalV1, "slow">,
  ): void;
  emit(candidate: unknown): void;
  emitToConnection(connection: number, candidate: unknown): void;
  disconnectConnection(connection?: number): void;
  queueResponse(response: unknown): void;
  getOperations(): readonly DeterministicFakeAgentSessionOperationInternalV1[];
  getConnectionCount(): number;
  getCloseCount(): number;
}

interface FakeConnectionRecordInternalV1 {
  readonly ordinal: number;
  readonly onEvent: (candidate: unknown) => void;
  readonly connection: AgentSessionConnectionV1;
  readonly disconnect: () => void;
}

interface PendingSlowConnectInternalV1 {
  readonly onEvent: (candidate: unknown) => void;
  readonly resolve: (result: AgentSessionConnectorConnectResultV1) => void;
}

export function createDeterministicFakeAgentSessionConnectorInternalV1(
  initialMode: DeterministicFakeAgentSessionModeInternalV1 = "ready",
): DeterministicFakeAgentSessionConnectorInternalV1 {
  let mode = initialMode;
  let nextSession = 1;
  let nextRun = 1;
  let closeCount = 0;
  const connections: FakeConnectionRecordInternalV1[] = [];
  const pendingSlow: PendingSlowConnectInternalV1[] = [];
  const operations: DeterministicFakeAgentSessionOperationInternalV1[] = [];
  const queuedResponses: unknown[] = [];

  const responseFor = (
    ordinal: number,
    operation: DeterministicFakeAgentSessionOperationInternalV1["operation"],
    input: unknown,
  ): Promise<unknown> => {
    operations.push({ connection: ordinal, operation, input });
    if (queuedResponses.length > 0) {
      const response = queuedResponses.shift();
      if (response instanceof Error) return Promise.reject(response);
      return Promise.resolve(response);
    }
    switch (operation) {
      case "start":
        return Promise.resolve({ kind: "started", sessionId: `session.${nextSession++}` });
      case "submit":
        return Promise.resolve({ kind: "submitted", runId: `run.${nextRun++}` });
      case "cancel":
        return Promise.resolve({ kind: "cancel_requested" });
    }
    const exhaustive: never = operation;
    throw new TypeError(`Unknown fake Agent Session operation ${String(exhaustive)}`);
  };

  const createConnection = (
    onEvent: (candidate: unknown) => void,
  ): AgentSessionConnectorConnectResultV1 => {
    const ordinal = connections.length + 1;
    let closed = false;
    let resolveClosed!: () => void;
    const whenClosed = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });
    const disconnect = (): void => {
      if (closed) return;
      closed = true;
      resolveClosed();
    };
    const connection: AgentSessionConnectionV1 = {
      whenClosed,
      start(): Promise<unknown> {
        if (closed) return Promise.reject(new Error("fake connection closed"));
        return responseFor(ordinal, "start", undefined);
      },
      submit(input): Promise<unknown> {
        if (closed) return Promise.reject(new Error("fake connection closed"));
        return responseFor(ordinal, "submit", input);
      },
      cancel(input): Promise<unknown> {
        if (closed) return Promise.reject(new Error("fake connection closed"));
        return responseFor(ordinal, "cancel", input);
      },
      close(): Promise<void> {
        if (closed) return Promise.resolve();
        closeCount += 1;
        disconnect();
        return Promise.resolve();
      },
    };
    connections.push({ ordinal, onEvent, connection, disconnect });
    return { kind: "connected", connection };
  };

  const connectResult = (
    targetMode: Exclude<DeterministicFakeAgentSessionModeInternalV1, "slow">,
    onEvent: (candidate: unknown) => void,
  ): AgentSessionConnectorConnectResultV1 => {
    switch (targetMode) {
      case "unconfigured":
        return { kind: "unconfigured" };
      case "offline":
        return { kind: "unavailable", reason: "offline" };
      case "failed":
        return { kind: "unavailable", reason: "failed" };
      case "ready":
        return createConnection(onEvent);
    }
    const exhaustive: never = targetMode;
    throw new TypeError(`Unknown fake connector mode ${String(exhaustive)}`);
  };

  const connector: AgentSessionConnectorV1 = {
    isConfigured: () => mode !== "unconfigured",
    async connect(input): Promise<AgentSessionConnectorConnectResultV1> {
      if (mode !== "slow") return connectResult(mode, input.onEvent);
      return await new Promise<AgentSessionConnectorConnectResultV1>((resolve) => {
        pendingSlow.push({ onEvent: input.onEvent, resolve });
      });
    },
  };

  return {
    connector,
    setMode(nextMode): void {
      mode = nextMode;
    },
    resolveSlowConnectAs(nextMode): void {
      const pending = pendingSlow.shift();
      if (pending === undefined) throw new TypeError("No slow fake connection is pending");
      mode = nextMode;
      pending.resolve(connectResult(nextMode, pending.onEvent));
    },
    emit(candidate): void {
      const active = connections.at(-1);
      if (active === undefined) throw new TypeError("Fake connector has no connection");
      active.onEvent(candidate);
    },
    emitToConnection(connectionOrdinal, candidate): void {
      const target = connections[connectionOrdinal - 1];
      if (target === undefined) throw new TypeError("Unknown fake connection");
      // Deliberately calls through after close so the client's internal fence is observable.
      target.onEvent(candidate);
    },
    disconnectConnection(connectionOrdinal): void {
      const ordinal = connectionOrdinal ?? connections.length;
      const target = connections[ordinal - 1];
      if (target === undefined) throw new TypeError("Unknown fake connection");
      target.disconnect();
    },
    queueResponse(response): void {
      queuedResponses.push(response);
    },
    getOperations: () => [...operations],
    getConnectionCount: () => connections.length,
    getCloseCount: () => closeCount,
  };
}
