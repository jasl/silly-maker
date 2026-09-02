// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  createAgentSessionClientV1,
  type AgentSessionStreamEventV1,
} from "@sillymaker/agent/session";
import { createDeterministicFakeAgentSessionConnectorInternalV1 } from "./deterministic-fake-transport.ts";

function streamEventCandidateInternalV1(
  kind: "output_text_delta" | "output_data" | "run_completed",
  sequence: number,
  extra: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    kind,
    sessionId: "session.1",
    runId: "run.1",
    sequence,
    ...extra,
  };
}

function createDeferredSignalV1(): {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe("createAgentSessionClientV1", () => {
  it("never publishes ready when the returned connection is already closed", async () => {
    let resolveClosed!: () => void;
    const whenClosed = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });
    const statuses: string[] = [];
    const client = createAgentSessionClientV1({
      connector: {
        isConfigured: () => true,
        async connect() {
          resolveClosed();
          return {
            kind: "connected",
            connection: {
              whenClosed,
              async start() {
                return { kind: "started", sessionId: "session.1" };
              },
              async submit() {
                return { kind: "submitted", runId: "run.1" };
              },
              async cancel() {
                return { kind: "cancel_requested" };
              },
              async close() {},
            },
          };
        },
      },
    });
    client.subscribe(() => statuses.push(client.getSnapshot().status.kind));

    await expect(client.connect()).resolves.toEqual({
      kind: "unavailable",
      diagnostic: {
        code: "agent_session.connection_failed",
        path: "/connection",
      },
    });
    expect(statuses).toEqual(["connecting", "unavailable"]);
  });

  it("keeps unconfigured, slow, offline, failed, and retry states explicit", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1("unconfigured");
    const client = createAgentSessionClientV1({ connector: fake.connector });

    expect(client.getSnapshot().status).toEqual({ kind: "unconfigured" });
    await expect(client.connect()).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "agent_session.unconfigured" },
    });

    fake.setMode("slow");
    const slow = client.reconnect();
    expect(client.getSnapshot().status).toEqual({ kind: "connecting" });
    fake.resolveSlowConnectAs("offline");
    await expect(slow).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "agent_session.offline" },
    });
    expect(client.getSnapshot().status).toMatchObject({ kind: "unavailable" });

    fake.setMode("failed");
    await expect(client.reconnect()).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "agent_session.connection_failed" },
    });
    fake.setMode("ready");
    await expect(client.reconnect()).resolves.toEqual({ kind: "ready" });
    expect(client.getSnapshot()).toMatchObject({ status: { kind: "ready" }, diagnostic: null });
  });

  it("keeps caller-local input rejection out of connection health and forwards large text", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    await client.connect();
    await client.start();
    const before = client.getSnapshot();

    await expect(client.submit({ sessionId: "session.1", text: "" })).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "agent_session.record_invalid", path: "/text" },
    });
    expect(client.getSnapshot()).toBe(before);

    const text = `译${'\\"\n'.repeat(30_000)}`;
    await expect(client.submit({ sessionId: "session.1", text })).resolves.toEqual({
      kind: "submitted",
      runId: "run.1",
    });
    expect(fake.getOperations().at(-1)).toEqual({
      connection: 1,
      operation: "submit",
      input: { sessionId: "session.1", text },
    });
    expect(client.getSnapshot()).toMatchObject({ status: { kind: "ready" }, diagnostic: null });
  });

  it("admits one ordered stream across reconnect without duplicate output or resubmission", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    const events: AgentSessionStreamEventV1[] = [];
    const statuses: string[] = [];
    client.subscribeStream((event) => events.push(event));

    await client.connect();
    await expect(client.start()).resolves.toEqual({ kind: "started", sessionId: "session.1" });
    await expect(client.submit({ sessionId: "session.1", text: "build UI" })).resolves.toEqual({
      kind: "submitted",
      runId: "run.1",
    });

    fake.emit(streamEventCandidateInternalV1("output_text_delta", 1, { text: "A" }));
    fake.emit(streamEventCandidateInternalV1("output_text_delta", 1, { text: "A" }));
    expect(events).toHaveLength(1);
    expect(client.getSnapshot().diagnostic?.code).toBe("agent_session.sequence_duplicate");

    fake.emit(streamEventCandidateInternalV1("output_text_delta", 3, { text: "gap" }));
    expect(events).toHaveLength(1);
    expect(client.getSnapshot().diagnostic?.code).toBe("agent_session.sequence_gap");
    fake.emit(streamEventCandidateInternalV1("output_text_delta", 2, { text: "B" }));
    expect(events.map((event) => event.sequence)).toEqual([1, 2]);

    const operationCount = fake.getOperations().length;
    const unsubscribeStatuses = client.subscribe(() => {
      statuses.push(client.getSnapshot().status.kind);
    });
    await expect(client.reconnect()).resolves.toEqual({ kind: "ready" });
    unsubscribeStatuses();
    expect(statuses).not.toContain("unavailable");
    expect(fake.getOperations()).toHaveLength(operationCount);
    fake.emitToConnection(1, streamEventCandidateInternalV1("run_completed", 3));
    expect(events).toHaveLength(2);
    fake.emit(streamEventCandidateInternalV1("run_completed", 3));
    expect(events.at(-1)).toEqual({
      kind: "run_completed",
      sessionId: "session.1",
      runId: "run.1",
      sequence: 3,
    });
  });

  it("scopes reusable run IDs by session", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    const events: AgentSessionStreamEventV1[] = [];
    client.subscribeStream((event) => events.push(event));

    await client.connect();
    await expect(client.start()).resolves.toEqual({ kind: "started", sessionId: "session.1" });
    await expect(client.submit({ sessionId: "session.1", text: "first" })).resolves.toEqual({
      kind: "submitted",
      runId: "run.1",
    });
    await expect(client.start()).resolves.toEqual({ kind: "started", sessionId: "session.2" });
    fake.queueResponse({ kind: "submitted", runId: "run.1" });
    await expect(client.submit({ sessionId: "session.2", text: "second" })).resolves.toEqual({
      kind: "submitted",
      runId: "run.1",
    });
    fake.emit({
      kind: "output_text_delta",
      sessionId: "session.2",
      runId: "run.1",
      sequence: 1,
      text: "second session",
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ sessionId: "session.2", runId: "run.1", sequence: 1 });
  });

  it("keeps more than 64 active submitted runs current and retires only terminal tuples", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    const events: AgentSessionStreamEventV1[] = [];
    client.subscribeStream((event) => events.push(event));
    await client.connect();
    await client.start();

    for (let index = 0; index < 65; index += 1) {
      await expect(client.submit({ sessionId: "session.1", text: `run ${index}` })).resolves
        .toMatchObject({ kind: "submitted" });
    }
    fake.emit(streamEventCandidateInternalV1("output_text_delta", 1, { text: "still current" }));
    fake.emit(streamEventCandidateInternalV1("run_completed", 2));
    fake.emit(streamEventCandidateInternalV1("output_text_delta", 3, { text: "late" }));

    expect(events.map((event) => event.kind)).toEqual(["output_text_delta", "run_completed"]);
    expect(client.getSnapshot().diagnostic?.code).toBe("agent_session.unknown_run");
  });

  it("retires a terminal tuple before notifying observers", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    const events: AgentSessionStreamEventV1[] = [];
    client.subscribeStream((event) => {
      events.push(event);
      if (event.kind === "run_completed") {
        fake.emit(streamEventCandidateInternalV1("output_text_delta", 2, { text: "late" }));
      }
    });
    await client.connect();
    await client.start();
    await client.submit({ sessionId: "session.1", text: "build UI" });

    fake.emit(streamEventCandidateInternalV1("run_completed", 1));

    expect(events.map((event) => event.kind)).toEqual(["run_completed"]);
    expect(client.getSnapshot().diagnostic?.code).toBe("agent_session.unknown_run");
  });

  it("rejects same-session reuse of a terminal run ID", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    await client.connect();
    await client.start();
    await client.submit({ sessionId: "session.1", text: "first" });
    fake.emit(streamEventCandidateInternalV1("run_completed", 1));
    fake.queueResponse({ kind: "submitted", runId: "run.1" });

    await expect(client.submit({ sessionId: "session.1", text: "second" })).resolves
      .toMatchObject({
        kind: "unavailable",
        diagnostic: { code: "agent_session.record_invalid", path: "/response/runId" },
      });
  });

  it("retires a failed connection before connect replaces it", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    await client.connect();
    fake.queueResponse(new Error("operation failed"));

    await expect(client.start()).resolves.toMatchObject({ kind: "unavailable" });
    expect(fake.getConnectionCount()).toBe(1);
    expect(fake.getCloseCount()).toBe(0);
    await expect(client.connect()).resolves.toEqual({ kind: "ready" });
    expect(fake.getConnectionCount()).toBe(2);
    expect(fake.getCloseCount()).toBe(1);
    await client.dispose();
    expect(fake.getCloseCount()).toBe(2);
  });

  it("projects candidates without invoking accessors and enforces canonical limits", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    await client.connect();
    await client.start();
    const operationCount = fake.getOperations().length;
    let inputGetterCalls = 0;
    const accessorInput = { sessionId: "session.1" } as {
      sessionId: string;
      text: string;
    };
    Object.defineProperty(accessorInput, "text", {
      enumerable: true,
      get() {
        inputGetterCalls += 1;
        return "must not run";
      },
    });
    await expect(client.submit(accessorInput)).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "agent_session.record_invalid" },
    });
    expect(inputGetterCalls).toBe(0);
    expect(fake.getOperations()).toHaveLength(operationCount);
    await client.submit({ sessionId: "session.1", text: "build UI" });
    let getterCalls = 0;
    const accessorCandidate = {
      kind: "output_text_delta",
      sessionId: "session.1",
      runId: "run.1",
      sequence: 1,
    } as Record<string, unknown>;
    Object.defineProperty(accessorCandidate, "text", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "must not run";
      },
    });

    fake.emit(accessorCandidate);
    expect(getterCalls).toBe(0);
    expect(client.getSnapshot().diagnostic?.code).toBe("agent_session.record_invalid");
    expect(() => fake.emit(null)).not.toThrow();
    expect(client.getSnapshot().diagnostic?.code).toBe("agent_session.record_invalid");
    fake.emit(streamEventCandidateInternalV1("output_text_delta", 1, {
      text: "x".repeat(70_000),
    }));
    expect(client.getSnapshot().diagnostic?.code).toBe("agent_session.record_too_large");
  });

  it("fences a slow connection that resolves after local dispose", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1("slow");
    const client = createAgentSessionClientV1({ connector: fake.connector });
    const connecting = client.connect();

    await client.dispose();
    fake.resolveSlowConnectAs("ready");
    await expect(connecting).resolves.toEqual({ kind: "disposed" });
    expect(client.getSnapshot().status).toEqual({ kind: "disposed" });
    expect(fake.getCloseCount()).toBe(1);
  });

  it.each(["resolve", "reject"] as const)(
    "fences an in-flight submit that settles after asynchronous close (%s)",
    async (settlement) => {
      const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
      const client = createAgentSessionClientV1({ connector: fake.connector });
      await client.connect();
      await client.start();
      let resolveSubmit!: (value: unknown) => void;
      let rejectSubmit!: (reason?: unknown) => void;
      const pending = new Promise<unknown>((resolve, reject) => {
        resolveSubmit = resolve;
        rejectSubmit = reject;
      });
      fake.queueResponse(pending);
      const submitting = client.submit({ sessionId: "session.1", text: "late" });

      fake.disconnectConnection();
      await Promise.resolve();
      if (settlement === "resolve") {
        resolveSubmit({ kind: "submitted", runId: "run.late" });
      } else {
        rejectSubmit(new Error("late failure"));
      }

      await expect(submitting).resolves.toEqual({ kind: "superseded" });
      expect(client.getSnapshot()).toMatchObject({
        status: {
          kind: "unavailable",
          diagnostic: {
            code: "agent_session.connection_failed",
            path: "/connection",
          },
        },
      });

      fake.setMode("ready");
      await expect(client.reconnect()).resolves.toEqual({ kind: "ready" });
      fake.queueResponse({ kind: "submitted", runId: "run.late" });
      await expect(client.submit({ sessionId: "session.1", text: "current" })).resolves.toEqual({
        kind: "submitted",
        runId: "run.late",
      });
    },
  );

  it("ignores a retired connection close signal after its successor is ready", async () => {
    const closeSignals = [createDeferredSignalV1(), createDeferredSignalV1()];
    let connectionIndex = 0;
    const client = createAgentSessionClientV1({
      connector: {
        isConfigured: () => true,
        async connect() {
          const index = connectionIndex++;
          const signal = closeSignals[index];
          if (signal === undefined) throw new TypeError("Unexpected connection");
          return {
            kind: "connected",
            connection: {
              whenClosed: signal.promise,
              async start() {
                return { kind: "started", sessionId: "session.1" };
              },
              async submit() {
                return { kind: "submitted", runId: "run.1" };
              },
              async cancel() {
                return { kind: "cancel_requested" };
              },
              async close() {},
            },
          };
        },
      },
    });
    await client.connect();
    await client.reconnect();
    const successorSnapshot = client.getSnapshot();
    const predecessorSignal = closeSignals[0];
    const successorSignal = closeSignals[1];
    if (predecessorSignal === undefined || successorSignal === undefined) {
      throw new TypeError("Missing close signal");
    }

    predecessorSignal.resolve();
    await Promise.resolve();

    expect(client.getSnapshot()).toBe(successorSnapshot);
    successorSignal.resolve();
    await client.dispose();
  });

  it("preserves active run identity across asynchronous connection replacement", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    const events: AgentSessionStreamEventV1[] = [];
    client.subscribeStream((event) => events.push(event));
    await client.connect();
    await client.start();
    await client.submit({ sessionId: "session.1", text: "first" });
    fake.emit(streamEventCandidateInternalV1("output_text_delta", 1, { text: "one" }));

    fake.disconnectConnection();
    await Promise.resolve();
    fake.emitToConnection(
      1,
      streamEventCandidateInternalV1("output_text_delta", 2, {
        text: "late",
      }),
    );
    await client.reconnect();
    fake.emit(streamEventCandidateInternalV1("output_text_delta", 2, { text: "two" }));
    fake.emit(streamEventCandidateInternalV1("run_completed", 3));
    fake.queueResponse({ kind: "submitted", runId: "run.1" });

    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);
    await expect(client.submit({ sessionId: "session.1", text: "reuse" })).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "agent_session.record_invalid", path: "/response/runId" },
    });
  });
});
