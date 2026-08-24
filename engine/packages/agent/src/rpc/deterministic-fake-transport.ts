// SPDX-License-Identifier: MIT
import type {
  AgentRpcRawConnectResultInternalV1,
  AgentRpcRawConnectionInternalV1,
  AgentRpcRawTransportInternalV1,
} from "./contracts.ts";

export type DeterministicFakeAgentRpcModeInternalV1 =
  | "unconfigured"
  | "slow"
  | "offline"
  | "failed"
  | "ready";

export interface DeterministicFakeAgentRpcRequestInternalV1 {
  readonly connection: number;
  readonly record: unknown;
}

export interface DeterministicFakeAgentRpcTransportInternalV1 {
  readonly transport: AgentRpcRawTransportInternalV1;
  setMode(mode: DeterministicFakeAgentRpcModeInternalV1): void;
  resolveSlowConnectAs(mode: Exclude<DeterministicFakeAgentRpcModeInternalV1, "slow">): void;
  emit(record: unknown): void;
  emitToConnection(connection: number, record: unknown): void;
  queueResponse(response: unknown): void;
  getRequests(): readonly DeterministicFakeAgentRpcRequestInternalV1[];
  getConnectionCount(): number;
  getCloseCount(): number;
}

interface FakeConnectionRecordInternalV1 {
  readonly ordinal: number;
  readonly onRecord: (record: unknown) => void;
  readonly connection: AgentRpcRawConnectionInternalV1;
}

interface PendingSlowConnectInternalV1 {
  readonly onRecord: (record: unknown) => void;
  readonly resolve: (result: AgentRpcRawConnectResultInternalV1) => void;
}

function rawRecordInternalV1(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : {};
}

export function createDeterministicFakeAgentRpcTransportInternalV1(
  initialMode: DeterministicFakeAgentRpcModeInternalV1 = "ready",
): DeterministicFakeAgentRpcTransportInternalV1 {
  let mode = initialMode;
  let nextSession = 1;
  let nextRun = 1;
  let closeCount = 0;
  const connections: FakeConnectionRecordInternalV1[] = [];
  const pendingSlow: PendingSlowConnectInternalV1[] = [];
  const requests: DeterministicFakeAgentRpcRequestInternalV1[] = [];
  const queuedResponses: unknown[] = [];

  const createConnection = (
    onRecord: (record: unknown) => void,
  ): AgentRpcRawConnectResultInternalV1 => {
    const ordinal = connections.length + 1;
    let closed = false;
    const connection: AgentRpcRawConnectionInternalV1 = {
      request(value: unknown): Promise<unknown> {
        requests.push({ connection: ordinal, record: value });
        if (closed) return Promise.reject(new Error("fake connection closed"));
        if (queuedResponses.length > 0) {
          const response = queuedResponses.shift();
          if (response instanceof Error) return Promise.reject(response);
          return Promise.resolve(response);
        }
        const request = rawRecordInternalV1(value);
        switch (request.method) {
          case "start":
            return Promise.resolve({ kind: "started", sessionId: `session.${nextSession++}` });
          case "submit":
            return Promise.resolve({ kind: "submitted", runId: `run.${nextRun++}` });
          case "cancel":
            return Promise.resolve({ kind: "cancel_requested" });
          default:
            return Promise.resolve({ kind: "unknown" });
        }
      },
      close(): Promise<void> {
        if (closed) return Promise.resolve();
        closed = true;
        closeCount += 1;
        return Promise.resolve();
      },
    };
    connections.push({ ordinal, onRecord, connection });
    return { kind: "connected", connection };
  };

  const connectResult = (
    targetMode: Exclude<DeterministicFakeAgentRpcModeInternalV1, "slow">,
    onRecord: (record: unknown) => void,
  ): AgentRpcRawConnectResultInternalV1 => {
    switch (targetMode) {
      case "unconfigured":
        return { kind: "unconfigured" };
      case "offline":
        return { kind: "unavailable", reason: "offline" };
      case "failed":
        return { kind: "unavailable", reason: "failed" };
      case "ready":
        return createConnection(onRecord);
    }
    const exhaustive: never = targetMode;
    throw new TypeError(`Unknown fake transport mode ${String(exhaustive)}`);
  };

  const transport: AgentRpcRawTransportInternalV1 = {
    isConfigured: () => mode !== "unconfigured",
    async connect(input: {
      readonly onRecord: (record: unknown) => void;
    }): Promise<AgentRpcRawConnectResultInternalV1> {
      if (mode !== "slow") return connectResult(mode, input.onRecord);
      return await new Promise<AgentRpcRawConnectResultInternalV1>((resolve) => {
        pendingSlow.push({ onRecord: input.onRecord, resolve });
      });
    },
  };

  return {
    transport,
    setMode(nextMode: DeterministicFakeAgentRpcModeInternalV1): void {
      mode = nextMode;
    },
    resolveSlowConnectAs(
      nextMode: Exclude<DeterministicFakeAgentRpcModeInternalV1, "slow">,
    ): void {
      const pending = pendingSlow.shift();
      if (pending === undefined) throw new TypeError("No slow fake connection is pending");
      mode = nextMode;
      pending.resolve(connectResult(nextMode, pending.onRecord));
    },
    emit(record: unknown): void {
      const connection = connections.at(-1);
      if (connection === undefined) throw new TypeError("Fake transport has no connection");
      connection.onRecord(record);
    },
    emitToConnection(connection: number, record: unknown): void {
      const target = connections[connection - 1];
      if (target === undefined) throw new TypeError("Unknown fake connection");
      // Deliberately calls through even after close so generation fences are observable.
      target.onRecord(record);
    },
    queueResponse(response: unknown): void {
      queuedResponses.push(response);
    },
    getRequests: () => [...requests],
    getConnectionCount: () => connections.length,
    getCloseCount: () => closeCount,
  };
}
