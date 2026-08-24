// SPDX-License-Identifier: MIT
import {
  admitAgentRpcResponseInternalV1,
  admitAgentRpcStreamRecordInternalV1,
  createAgentRpcRequestInternalV1,
} from "./admission.ts";
import type {
  AgentRpcCallFailureInternalV1,
  AgentRpcCancelResultInternalV1,
  AgentRpcClientPortInternalV1,
  AgentRpcClientSnapshotInternalV1,
  AgentRpcConnectResultInternalV1,
  AgentRpcDiagnosticInternalV1,
  AgentRpcRawConnectionInternalV1,
  AgentRpcRawTransportInternalV1,
  AgentRpcStartResultInternalV1,
  AgentRpcStreamEventInternalV1,
  AgentRpcSubmitResultInternalV1,
} from "./contracts.ts";

const readyResultInternalV1 = { kind: "ready" as const };
const supersededResultInternalV1 = { kind: "superseded" as const };
const disposedResultInternalV1 = { kind: "disposed" as const };
const maxTrackedRunsInternalV1 = 64;

function runKeyInternalV1(sessionId: string, runId: string): string {
  // The admitted identifier grammar excludes NUL, so this is collision-free.
  return `${sessionId}\u0000${runId}`;
}

function diagnosticInternalV1(
  code: AgentRpcDiagnosticInternalV1["code"],
  path: string,
): AgentRpcDiagnosticInternalV1 {
  return { code, path };
}

function unavailableInternalV1(
  diagnostic: AgentRpcDiagnosticInternalV1,
): AgentRpcCallFailureInternalV1 {
  return { kind: "unavailable", diagnostic };
}

export function createAgentRpcClientInternalV1(input: {
  readonly transport: AgentRpcRawTransportInternalV1;
}): AgentRpcClientPortInternalV1 {
  const listeners = new Set<() => void>();
  const streamListeners = new Set<(event: AgentRpcStreamEventInternalV1) => void>();
  const trackedRuns = new Map<string, true>();
  const lastSequences = new Map<string, number>();
  let disposed = false;
  let revision = 0;
  let nextRequestId = 1;
  let nextConnectionGeneration = 0;
  let lifecycleEpoch = 0;
  let connection: AgentRpcRawConnectionInternalV1 | null = null;
  let activeConnectionGeneration: number | null = null;
  let connectAttempt: Promise<AgentRpcConnectResultInternalV1> | null = null;
  let status: AgentRpcClientSnapshotInternalV1["status"] = input.transport.isConfigured()
    ? { kind: "disconnected" }
    : { kind: "unconfigured" };
  let lastDiagnostic: AgentRpcDiagnosticInternalV1 | null = null;
  let snapshot!: AgentRpcClientSnapshotInternalV1;

  const rebuildSnapshot = (): void => {
    revision += 1;
    snapshot = { revision, status, diagnostic: lastDiagnostic };
  };
  const publish = (): void => {
    rebuildSnapshot();
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Client observers are observational.
      }
    }
  };
  const report = (diagnostic: AgentRpcDiagnosticInternalV1): void => {
    lastDiagnostic = diagnostic;
    publish();
  };
  const setUnavailable = (diagnostic: AgentRpcDiagnosticInternalV1): void => {
    status = { kind: "unavailable", diagnostic };
    lastDiagnostic = diagnostic;
    publish();
  };
  rebuildSnapshot();

  const acceptRawRecord = (
    raw: unknown,
    expectedGeneration: number,
    expectedEpoch: number,
  ): void => {
    if (
      disposed || lifecycleEpoch !== expectedEpoch ||
      activeConnectionGeneration !== expectedGeneration
    ) return;
    const admitted = admitAgentRpcStreamRecordInternalV1(raw, expectedGeneration);
    if (admitted.kind === "rejected") {
      report(admitted.diagnostic);
      return;
    }
    const event = admitted.value;
    const runKey = runKeyInternalV1(event.sessionId, event.runId);
    if (!trackedRuns.has(runKey)) {
      report(diagnosticInternalV1("rpc.unknown_run", "/runId"));
      return;
    }
    const previous = lastSequences.get(runKey) ?? 0;
    if (event.sequence <= previous) {
      report(diagnosticInternalV1("rpc.sequence_duplicate", "/sequence"));
      return;
    }
    if (event.sequence !== previous + 1) {
      report(diagnosticInternalV1("rpc.sequence_gap", "/sequence"));
      return;
    }
    lastSequences.set(runKey, event.sequence);
    for (const listener of [...streamListeners]) {
      try {
        listener(event);
      } catch {
        // Stream observers cannot alter client state.
      }
    }
  };

  const performConnect = (): Promise<AgentRpcConnectResultInternalV1> => {
    if (disposed) return Promise.resolve(disposedResultInternalV1);
    if (status.kind === "ready") return Promise.resolve(readyResultInternalV1);
    if (connectAttempt !== null) return connectAttempt;
    const expectedEpoch = ++lifecycleEpoch;
    const generation = ++nextConnectionGeneration;
    const previousConnection = connection;
    connection = null;
    activeConnectionGeneration = null;
    status = { kind: "connecting", connectionGeneration: generation };
    lastDiagnostic = null;
    publish();
    const attempt = (async (): Promise<AgentRpcConnectResultInternalV1> => {
      if (previousConnection !== null) {
        try {
          await previousConnection.close();
        } catch {
          // A replacement attempt still fences an old local connection that failed to close.
        }
        if (disposed || lifecycleEpoch !== expectedEpoch) {
          return disposed ? disposedResultInternalV1 : supersededResultInternalV1;
        }
      }
      let connected: Awaited<ReturnType<AgentRpcRawTransportInternalV1["connect"]>>;
      try {
        connected = await input.transport.connect({
          onRecord: (record) => acceptRawRecord(record, generation, expectedEpoch),
        });
      } catch {
        if (disposed) return disposedResultInternalV1;
        if (lifecycleEpoch !== expectedEpoch) return supersededResultInternalV1;
        const diagnostic = diagnosticInternalV1("rpc.connection_failed", "/connect");
        setUnavailable(diagnostic);
        return unavailableInternalV1(diagnostic);
      }
      if (disposed || lifecycleEpoch !== expectedEpoch) {
        if (connected.kind === "connected") {
          try {
            await connected.connection.close();
          } catch {
            // A superseded local connection is already unreachable.
          }
        }
        return disposed ? disposedResultInternalV1 : supersededResultInternalV1;
      }
      if (connected.kind === "unconfigured") {
        const diagnostic = diagnosticInternalV1("rpc.unconfigured", "/connect");
        status = { kind: "unconfigured" };
        lastDiagnostic = diagnostic;
        publish();
        return unavailableInternalV1(diagnostic);
      }
      if (connected.kind === "unavailable") {
        const diagnostic = diagnosticInternalV1(
          connected.reason === "offline" ? "rpc.offline" : "rpc.connection_failed",
          "/connect",
        );
        setUnavailable(diagnostic);
        return unavailableInternalV1(diagnostic);
      }
      connection = connected.connection;
      activeConnectionGeneration = generation;
      status = { kind: "ready", connectionGeneration: generation };
      lastDiagnostic = null;
      publish();
      return readyResultInternalV1;
    })();
    connectAttempt = attempt;
    void attempt.finally(() => {
      if (connectAttempt === attempt) connectAttempt = null;
    });
    return attempt;
  };

  const call = async (
    method: "start" | "submit" | "cancel",
    params?: Readonly<Record<string, unknown>>,
  ): Promise<
    | { readonly kind: "started"; readonly sessionId: string }
    | { readonly kind: "submitted"; readonly runId: string }
    | { readonly kind: "cancel_requested" }
    | AgentRpcCallFailureInternalV1
  > => {
    if (disposed) return disposedResultInternalV1;
    const active = connection;
    const generation = activeConnectionGeneration;
    const expectedEpoch = lifecycleEpoch;
    if (active === null || generation === null || status.kind !== "ready") {
      const diagnostic = lastDiagnostic ?? diagnosticInternalV1("rpc.offline", "/request");
      return unavailableInternalV1(diagnostic);
    }
    const request = createAgentRpcRequestInternalV1(nextRequestId++, method, params);
    if (request.kind === "rejected") return unavailableInternalV1(request.diagnostic);
    let raw: unknown;
    try {
      raw = await active.request(request.value);
    } catch {
      if (disposed) return disposedResultInternalV1;
      if (
        active !== connection || generation !== activeConnectionGeneration ||
        expectedEpoch !== lifecycleEpoch
      ) return supersededResultInternalV1;
      const diagnostic = diagnosticInternalV1("rpc.request_failed", "/request");
      setUnavailable(diagnostic);
      return unavailableInternalV1(diagnostic);
    }
    if (disposed) return disposedResultInternalV1;
    if (
      active !== connection || generation !== activeConnectionGeneration ||
      expectedEpoch !== lifecycleEpoch
    ) return supersededResultInternalV1;
    const admitted = admitAgentRpcResponseInternalV1(method, raw);
    if (admitted.kind === "rejected") {
      report(admitted.diagnostic);
      return unavailableInternalV1(admitted.diagnostic);
    }
    return admitted.value;
  };

  const client: AgentRpcClientPortInternalV1 = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeStream(listener: (event: AgentRpcStreamEventInternalV1) => void): () => void {
      if (disposed) return () => {};
      streamListeners.add(listener);
      return () => streamListeners.delete(listener);
    },
    connect: performConnect,
    async start(): Promise<AgentRpcStartResultInternalV1> {
      const result = await call("start");
      return result.kind === "started" ? result : result as AgentRpcCallFailureInternalV1;
    },
    async submit(callInput: {
      readonly sessionId: string;
      readonly text: string;
    }): Promise<AgentRpcSubmitResultInternalV1> {
      const result = await call("submit", {
        sessionId: callInput.sessionId,
        text: callInput.text,
      });
      if (result.kind !== "submitted") return result as AgentRpcCallFailureInternalV1;
      const runKey = runKeyInternalV1(callInput.sessionId, result.runId);
      if (trackedRuns.has(runKey)) {
        const diagnostic = diagnosticInternalV1("rpc.record_invalid", "/response/runId");
        report(diagnostic);
        return unavailableInternalV1(diagnostic);
      }
      while (trackedRuns.size >= maxTrackedRunsInternalV1) {
        const oldestRunKey = trackedRuns.keys().next().value as string | undefined;
        if (oldestRunKey === undefined) break;
        trackedRuns.delete(oldestRunKey);
        lastSequences.delete(oldestRunKey);
      }
      trackedRuns.set(runKey, true);
      lastSequences.set(runKey, 0);
      return result;
    },
    async cancel(callInput: {
      readonly sessionId: string;
      readonly runId: string;
    }): Promise<AgentRpcCancelResultInternalV1> {
      const result = await call("cancel", callInput);
      return result.kind === "cancel_requested" ? result : result as AgentRpcCallFailureInternalV1;
    },
    async reconnect(): Promise<AgentRpcConnectResultInternalV1> {
      if (disposed) return disposedResultInternalV1;
      lifecycleEpoch += 1;
      connectAttempt = null;
      const previous = connection;
      connection = null;
      activeConnectionGeneration = null;
      status = input.transport.isConfigured() ? { kind: "disconnected" } : { kind: "unconfigured" };
      publish();
      if (previous !== null) {
        try {
          await previous.close();
        } catch {
          // Reconnect replaces the local resource even when close reports a fault.
        }
      }
      return await performConnect();
    },
    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      lifecycleEpoch += 1;
      connectAttempt = null;
      const previous = connection;
      connection = null;
      activeConnectionGeneration = null;
      status = { kind: "disposed" };
      publish();
      listeners.clear();
      streamListeners.clear();
      if (previous !== null) {
        try {
          await previous.close();
        } catch {
          // Local disposal cannot make a remote-effect claim.
        }
      }
    },
  };
  return client;
}
