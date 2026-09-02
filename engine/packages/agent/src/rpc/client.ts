// SPDX-License-Identifier: MIT
import {
  admitAgentSessionCancelInputInternalV1,
  admitAgentSessionResponseInternalV1,
  admitAgentSessionStreamEventInternalV1,
  admitAgentSessionSubmitInputInternalV1,
  type AgentSessionAdmittedResponseInternalV1,
} from "./admission.ts";
import type {
  AgentSessionCallFailureV1,
  AgentSessionCancelResultV1,
  AgentSessionClientSnapshotV1,
  AgentSessionClientV1,
  AgentSessionConnectionV1,
  AgentSessionConnectorV1,
  AgentSessionConnectResultV1,
  AgentSessionDiagnosticV1,
  AgentSessionStartResultV1,
  AgentSessionStreamEventV1,
  AgentSessionSubmitResultV1,
} from "../session/contracts.ts";

const readyResultInternalV1 = { kind: "ready" as const };
const supersededResultInternalV1 = { kind: "superseded" as const };
const disposedResultInternalV1 = { kind: "disposed" as const };

function runKeyInternalV1(sessionId: string, runId: string): string {
  return `${sessionId}\u0000${runId}`;
}

function diagnosticInternalV1(
  code: AgentSessionDiagnosticV1["code"],
  path: string,
): AgentSessionDiagnosticV1 {
  return { code, path };
}

function unavailableInternalV1(
  diagnostic: AgentSessionDiagnosticV1,
): AgentSessionCallFailureV1 {
  return { kind: "unavailable", diagnostic };
}

export function createAgentSessionClientV1(input: {
  readonly connector: AgentSessionConnectorV1;
}): AgentSessionClientV1 {
  const listeners = new Set<() => void>();
  const streamListeners = new Set<(event: AgentSessionStreamEventV1) => void>();
  const activeRuns = new Set<string>();
  const seenRuns = new Set<string>();
  const lastSequences = new Map<string, number>();
  const closingConnections = new Set<Promise<void>>();
  let disposed = false;
  let revision = 0;
  let nextConnectionGeneration = 0;
  let lifecycleEpoch = 0;
  let pendingSubmitOperations = 0;
  let connection: AgentSessionConnectionV1 | null = null;
  let activeConnectionGeneration: number | null = null;
  let connectAttempt: Promise<AgentSessionConnectResultV1> | null = null;
  let disposeAttempt: Promise<void> | null = null;
  let status: AgentSessionClientSnapshotV1["status"] = input.connector.isConfigured()
    ? { kind: "disconnected" }
    : { kind: "unconfigured" };
  let lastDiagnostic: AgentSessionDiagnosticV1 | null = null;
  let snapshot!: AgentSessionClientSnapshotV1;

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
  const report = (diagnostic: AgentSessionDiagnosticV1): void => {
    lastDiagnostic = diagnostic;
    publish();
  };
  const setUnavailable = (diagnostic: AgentSessionDiagnosticV1): void => {
    status = { kind: "unavailable", diagnostic };
    lastDiagnostic = diagnostic;
    publish();
  };
  rebuildSnapshot();

  const closeConnection = (target: AgentSessionConnectionV1): Promise<void> => {
    const closing = (async () => {
      try {
        await target.close();
      } catch {
        // Closing still retires the local resource even when the adapter reports a fault.
      }
    })();
    closingConnections.add(closing);
    void closing.then(() => closingConnections.delete(closing));
    return closing;
  };

  const waitForClosingConnections = async (): Promise<void> => {
    while (closingConnections.size > 0) {
      await Promise.all([...closingConnections]);
    }
  };

  const retireUnexpectedlyClosedConnection = (
    target: AgentSessionConnectionV1,
    expectedGeneration: number,
    expectedEpoch: number,
  ): void => {
    if (
      disposed || lifecycleEpoch !== expectedEpoch || connection !== target ||
      activeConnectionGeneration !== expectedGeneration
    ) return;
    connection = null;
    activeConnectionGeneration = null;
    void closeConnection(target);
    setUnavailable(
      diagnosticInternalV1("agent_session.connection_failed", "/connection"),
    );
  };

  const acceptAdmittedEvent = (
    event: AgentSessionStreamEventV1,
    expectedGeneration: number,
    expectedEpoch: number,
    allowSubmitBarrier: boolean,
  ): void => {
    if (
      disposed || lifecycleEpoch !== expectedEpoch ||
      activeConnectionGeneration !== expectedGeneration
    ) return;
    const runKey = runKeyInternalV1(event.sessionId, event.runId);
    if (!activeRuns.has(runKey)) {
      if (allowSubmitBarrier && pendingSubmitOperations > 0) {
        queueMicrotask(() => {
          acceptAdmittedEvent(event, expectedGeneration, expectedEpoch, false);
        });
        return;
      }
      report(diagnosticInternalV1("agent_session.unknown_run", "/runId"));
      return;
    }
    const previous = lastSequences.get(runKey) ?? 0;
    if (event.sequence <= previous) {
      report(diagnosticInternalV1("agent_session.sequence_duplicate", "/sequence"));
      return;
    }
    if (event.sequence !== previous + 1) {
      report(diagnosticInternalV1("agent_session.sequence_gap", "/sequence"));
      return;
    }
    lastSequences.set(runKey, event.sequence);
    if (event.kind === "run_completed" || event.kind === "run_failed") {
      activeRuns.delete(runKey);
      lastSequences.delete(runKey);
    }
    for (const listener of [...streamListeners]) {
      try {
        listener(event);
      } catch {
        // Stream observers cannot alter client state.
      }
    }
  };

  const acceptEventCandidate = (
    candidate: unknown,
    expectedGeneration: number,
    expectedEpoch: number,
  ): void => {
    if (
      disposed || lifecycleEpoch !== expectedEpoch ||
      activeConnectionGeneration !== expectedGeneration
    ) return;
    const admitted = admitAgentSessionStreamEventInternalV1(candidate);
    if (admitted.kind === "rejected") {
      report(admitted.diagnostic);
      return;
    }
    acceptAdmittedEvent(admitted.value, expectedGeneration, expectedEpoch, true);
  };

  const performConnect = (): Promise<AgentSessionConnectResultV1> => {
    if (disposed) return Promise.resolve(disposedResultInternalV1);
    if (status.kind === "ready") return Promise.resolve(readyResultInternalV1);
    if (connectAttempt !== null) return connectAttempt;
    const expectedEpoch = ++lifecycleEpoch;
    const generation = ++nextConnectionGeneration;
    const previousConnection = connection;
    connection = null;
    activeConnectionGeneration = null;
    status = { kind: "connecting" };
    lastDiagnostic = null;
    publish();
    const attempt = (async (): Promise<AgentSessionConnectResultV1> => {
      if (previousConnection !== null) {
        await closeConnection(previousConnection);
        if (disposed || lifecycleEpoch !== expectedEpoch) {
          return disposed ? disposedResultInternalV1 : supersededResultInternalV1;
        }
      }
      if (closingConnections.size > 0) {
        await waitForClosingConnections();
        if (disposed || lifecycleEpoch !== expectedEpoch) {
          return disposed ? disposedResultInternalV1 : supersededResultInternalV1;
        }
      }
      let connected: Awaited<ReturnType<AgentSessionConnectorV1["connect"]>>;
      try {
        connected = await input.connector.connect({
          onEvent: (candidate) => acceptEventCandidate(candidate, generation, expectedEpoch),
        });
      } catch {
        if (disposed) return disposedResultInternalV1;
        if (lifecycleEpoch !== expectedEpoch) return supersededResultInternalV1;
        const diagnostic = diagnosticInternalV1("agent_session.connection_failed", "/connect");
        setUnavailable(diagnostic);
        return unavailableInternalV1(diagnostic);
      }
      if (disposed || lifecycleEpoch !== expectedEpoch) {
        if (connected.kind === "connected") {
          await closeConnection(connected.connection);
        }
        return disposed ? disposedResultInternalV1 : supersededResultInternalV1;
      }
      if (connected.kind === "unconfigured") {
        const diagnostic = diagnosticInternalV1("agent_session.unconfigured", "/connect");
        status = { kind: "unconfigured" };
        lastDiagnostic = diagnostic;
        publish();
        return unavailableInternalV1(diagnostic);
      }
      if (connected.kind === "unavailable") {
        const diagnostic = diagnosticInternalV1(
          connected.reason === "offline"
            ? "agent_session.offline"
            : "agent_session.connection_failed",
          "/connect",
        );
        setUnavailable(diagnostic);
        return unavailableInternalV1(diagnostic);
      }
      connection = connected.connection;
      activeConnectionGeneration = generation;
      const handleClosed = (): void =>
        retireUnexpectedlyClosedConnection(
          connected.connection,
          generation,
          expectedEpoch,
        );
      void connected.connection.whenClosed.then(handleClosed, handleClosed);
      // A connector may discover closure before returning the connection. Give
      // the stable close signal one reaction turn before publishing `ready`.
      await Promise.resolve();
      if (disposed) return disposedResultInternalV1;
      if (lifecycleEpoch !== expectedEpoch) return supersededResultInternalV1;
      if (
        connection !== connected.connection || activeConnectionGeneration !== generation
      ) {
        return unavailableInternalV1(
          diagnosticInternalV1("agent_session.connection_failed", "/connection"),
        );
      }
      status = { kind: "ready" };
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

  const invoke = async (
    operation: "start" | "submit" | "cancel",
    call: (active: AgentSessionConnectionV1) => Promise<unknown>,
    commit?: (
      value: AgentSessionAdmittedResponseInternalV1,
    ) => AgentSessionAdmittedResponseInternalV1 | AgentSessionCallFailureV1,
  ) => {
    if (disposed) return disposedResultInternalV1;
    const active = connection;
    const generation = activeConnectionGeneration;
    const expectedEpoch = lifecycleEpoch;
    if (active === null || generation === null || status.kind !== "ready") {
      const diagnostic = lastDiagnostic ??
        diagnosticInternalV1("agent_session.offline", "/operation");
      return unavailableInternalV1(diagnostic);
    }
    let candidate: unknown;
    try {
      candidate = await call(active);
    } catch {
      if (disposed) return disposedResultInternalV1;
      if (
        active !== connection || generation !== activeConnectionGeneration ||
        expectedEpoch !== lifecycleEpoch
      ) return supersededResultInternalV1;
      const diagnostic = diagnosticInternalV1("agent_session.operation_failed", "/operation");
      setUnavailable(diagnostic);
      return unavailableInternalV1(diagnostic);
    }
    if (disposed) return disposedResultInternalV1;
    if (
      active !== connection || generation !== activeConnectionGeneration ||
      expectedEpoch !== lifecycleEpoch
    ) return supersededResultInternalV1;
    const admitted = admitAgentSessionResponseInternalV1(operation, candidate);
    if (admitted.kind === "rejected") {
      report(admitted.diagnostic);
      return unavailableInternalV1(admitted.diagnostic);
    }
    return commit?.(admitted.value) ?? admitted.value;
  };

  const client: AgentSessionClientV1 = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeStream(listener: (event: AgentSessionStreamEventV1) => void): () => void {
      if (disposed) return () => {};
      streamListeners.add(listener);
      return () => streamListeners.delete(listener);
    },
    connect: performConnect,
    async start(): Promise<AgentSessionStartResultV1> {
      const result = await invoke("start", (active) => active.start());
      return result.kind === "started" ? result : result as AgentSessionCallFailureV1;
    },
    async submit(callInput): Promise<AgentSessionSubmitResultV1> {
      const admittedInput = admitAgentSessionSubmitInputInternalV1(callInput);
      if (admittedInput.kind === "rejected") {
        return unavailableInternalV1(admittedInput.diagnostic);
      }
      pendingSubmitOperations += 1;
      try {
        const result = await invoke(
          "submit",
          (active) => active.submit(admittedInput.value),
          (admittedResponse) => {
            if (admittedResponse.kind !== "submitted") return admittedResponse;
            const runKey = runKeyInternalV1(
              admittedInput.value.sessionId,
              admittedResponse.runId,
            );
            if (seenRuns.has(runKey)) {
              const diagnostic = diagnosticInternalV1(
                "agent_session.record_invalid",
                "/response/runId",
              );
              report(diagnostic);
              return unavailableInternalV1(diagnostic);
            }
            seenRuns.add(runKey);
            activeRuns.add(runKey);
            lastSequences.set(runKey, 0);
            return admittedResponse;
          },
        );
        return result.kind === "submitted" ? result : result as AgentSessionCallFailureV1;
      } finally {
        pendingSubmitOperations -= 1;
      }
    },
    async cancel(callInput): Promise<AgentSessionCancelResultV1> {
      const admittedInput = admitAgentSessionCancelInputInternalV1(callInput);
      if (admittedInput.kind === "rejected") {
        return unavailableInternalV1(admittedInput.diagnostic);
      }
      const result = await invoke("cancel", (active) => active.cancel(admittedInput.value));
      return result.kind === "cancel_requested" ? result : result as AgentSessionCallFailureV1;
    },
    async reconnect(): Promise<AgentSessionConnectResultV1> {
      if (disposed) return disposedResultInternalV1;
      lifecycleEpoch += 1;
      connectAttempt = null;
      const previous = connection;
      connection = null;
      activeConnectionGeneration = null;
      status = input.connector.isConfigured() ? { kind: "disconnected" } : { kind: "unconfigured" };
      publish();
      if (previous !== null) {
        await closeConnection(previous);
      }
      return await performConnect();
    },
    dispose(): Promise<void> {
      if (disposeAttempt !== null) return disposeAttempt;
      let settleDisposal!: () => void;
      const attempt = new Promise<void>((resolve) => {
        settleDisposal = resolve;
      });
      disposeAttempt = attempt;
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
      activeRuns.clear();
      seenRuns.clear();
      lastSequences.clear();
      const cleanup = (async () => {
        if (previous !== null) {
          await closeConnection(previous);
        }
        await waitForClosingConnections();
      })();
      void cleanup.then(
        () => settleDisposal(),
        () => settleDisposal(),
      );
      return attempt;
    },
  };
  return client;
}
