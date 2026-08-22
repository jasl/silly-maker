// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createAgentRpcClientInternalV1 } from "./client.ts";
import { createDeterministicFakeAgentRpcTransportInternalV1 } from "./deterministic-fake-transport.ts";
import type { AgentRpcStreamEventInternalV1 } from "./contracts.ts";

function streamRecordInternalV1(
  kind: "artifact_chunk" | "artifact_complete" | "run_completed",
  sequence: number,
  extra: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    kind,
    sessionId: "session.1",
    runId: "run.1",
    sequence,
    ...extra,
  });
}

describe("createAgentRpcClientInternalV1", () => {
  it("keeps unconfigured, slow, offline, failed, and retry states explicit", async () => {
    const fake = createDeterministicFakeAgentRpcTransportInternalV1("unconfigured");
    const client = createAgentRpcClientInternalV1({ transport: fake.transport });

    expect(client.getSnapshot().status).toEqual({ kind: "unconfigured" });
    await expect(client.connect()).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "rpc.unconfigured" },
    });

    fake.setMode("slow");
    const slow = client.reconnect();
    expect(client.getSnapshot().status).toMatchObject({ kind: "connecting" });
    fake.resolveSlowConnectAs("offline");
    await expect(slow).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "rpc.offline" },
    });
    expect(client.getSnapshot().status).toMatchObject({ kind: "unavailable" });

    fake.setMode("failed");
    await expect(client.reconnect()).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "rpc.connection_failed" },
    });
    fake.setMode("ready");
    await expect(client.reconnect()).resolves.toEqual({ kind: "ready" });
    expect(client.getSnapshot()).toMatchObject({
      status: { kind: "ready" },
      diagnostic: null,
    });
  });

  it("admits one ordered stream across reconnect without duplicate chunks or resubmission", async () => {
    const fake = createDeterministicFakeAgentRpcTransportInternalV1();
    const client = createAgentRpcClientInternalV1({ transport: fake.transport });
    const events: AgentRpcStreamEventInternalV1[] = [];
    client.subscribeStream((event) => events.push(event));

    await client.connect();
    const started = await client.start();
    expect(started).toEqual({ kind: "started", sessionId: "session.1" });
    await expect(client.submit({ sessionId: "session.1", text: "build UI" })).resolves.toEqual({
      kind: "submitted",
      runId: "run.1",
    });

    fake.emit(streamRecordInternalV1("artifact_chunk", 1, { text: "A" }));
    fake.emit(streamRecordInternalV1("artifact_chunk", 1, { text: "A" }));
    expect(events).toHaveLength(1);
    expect(client.getSnapshot().diagnostic?.code).toBe("rpc.sequence_duplicate");

    fake.emit(streamRecordInternalV1("artifact_chunk", 3, { text: "gap" }));
    expect(events).toHaveLength(1);
    expect(client.getSnapshot().diagnostic?.code).toBe("rpc.sequence_gap");
    fake.emit(streamRecordInternalV1("artifact_chunk", 2, { text: "B" }));
    expect(events.map((event) => event.sequence)).toEqual([1, 2]);

    const requestCount = fake.getRequests().length;
    await expect(client.reconnect()).resolves.toEqual({ kind: "ready" });
    expect(fake.getRequests()).toHaveLength(requestCount);
    fake.emitToConnection(1, streamRecordInternalV1("run_completed", 3));
    expect(events).toHaveLength(2);
    fake.emit(streamRecordInternalV1("artifact_chunk", 2, { text: "B" }));
    expect(events).toHaveLength(2);
    fake.emit(streamRecordInternalV1("run_completed", 3));
    expect(events.at(-1)).toMatchObject({
      kind: "run_completed",
      sequence: 3,
      connectionGeneration: 2,
    });
  });

  it("scopes reusable run IDs by session", async () => {
    const fake = createDeterministicFakeAgentRpcTransportInternalV1();
    const client = createAgentRpcClientInternalV1({ transport: fake.transport });
    const events: AgentRpcStreamEventInternalV1[] = [];
    client.subscribeStream((event) => events.push(event));

    await client.connect();
    await expect(client.start()).resolves.toEqual({ kind: "started", sessionId: "session.1" });
    await expect(client.submit({ sessionId: "session.1", text: "first" })).resolves.toEqual({
      kind: "submitted",
      runId: "run.1",
    });
    await expect(client.start()).resolves.toEqual({ kind: "started", sessionId: "session.2" });
    fake.queueResponse(Object.freeze({ kind: "submitted", runId: "run.1" }));
    await expect(client.submit({ sessionId: "session.2", text: "second" })).resolves.toEqual({
      kind: "submitted",
      runId: "run.1",
    });
    fake.emit(Object.freeze({
      kind: "artifact_chunk",
      sessionId: "session.2",
      runId: "run.1",
      sequence: 1,
      text: "second session",
    }));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ sessionId: "session.2", runId: "run.1", sequence: 1 });
  });

  it("retires a failed raw connection before connect replaces it", async () => {
    const fake = createDeterministicFakeAgentRpcTransportInternalV1();
    const client = createAgentRpcClientInternalV1({ transport: fake.transport });
    await client.connect();
    fake.queueResponse(new Error("request failed"));

    await expect(client.start()).resolves.toMatchObject({ kind: "unavailable" });
    expect(fake.getConnectionCount()).toBe(1);
    expect(fake.getCloseCount()).toBe(0);
    await expect(client.connect()).resolves.toEqual({ kind: "ready" });
    expect(fake.getConnectionCount()).toBe(2);
    expect(fake.getCloseCount()).toBe(1);
    await client.dispose();
    expect(fake.getCloseCount()).toBe(2);
  });

  it("projects raw records without invoking accessors and enforces canonical limits", async () => {
    const fake = createDeterministicFakeAgentRpcTransportInternalV1();
    const client = createAgentRpcClientInternalV1({ transport: fake.transport });
    await client.connect();
    await client.start();
    await client.submit({ sessionId: "session.1", text: "build UI" });
    let getterCalls = 0;
    const accessorRecord = {
      kind: "artifact_chunk",
      sessionId: "session.1",
      runId: "run.1",
      sequence: 1,
    } as Record<string, unknown>;
    Object.defineProperty(accessorRecord, "text", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "must not run";
      },
    });

    fake.emit(accessorRecord);
    expect(getterCalls).toBe(0);
    expect(client.getSnapshot().diagnostic?.code).toBe("rpc.record_invalid");
    expect(() => fake.emit(null)).not.toThrow();
    expect(client.getSnapshot().diagnostic?.code).toBe("rpc.record_invalid");
    fake.emit(streamRecordInternalV1("artifact_chunk", 1, { text: "x".repeat(70_000) }));
    expect(client.getSnapshot().diagnostic?.code).toBe("rpc.record_too_large");
  });

  it("fences a slow connection that resolves after local dispose", async () => {
    const fake = createDeterministicFakeAgentRpcTransportInternalV1("slow");
    const client = createAgentRpcClientInternalV1({ transport: fake.transport });
    const connecting = client.connect();

    await client.dispose();
    fake.resolveSlowConnectAs("ready");
    await expect(connecting).resolves.toEqual({ kind: "disposed" });
    expect(client.getSnapshot().status).toEqual({ kind: "disposed" });
    expect(fake.getCloseCount()).toBe(1);
  });
});
