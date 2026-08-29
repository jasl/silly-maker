// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  createAgentSessionClientV1,
  type AgentSessionConnectorV1,
  type AgentSessionStreamEventV1,
} from "@sillymaker/agent/session";

describe("public Agent Session contract", () => {
  it("keeps connector wire details private while publishing ordered semantic outputs", async () => {
    const eventSink: { current: ((event: unknown) => void) | null } = { current: null };
    let closeCount = 0;
    const connector: AgentSessionConnectorV1 = {
      isConfigured: () => true,
      async connect(input) {
        eventSink.current = input.onEvent;
        return {
          kind: "connected",
          connection: {
            async start() {
              return { kind: "started", sessionId: "session.1" };
            },
            async submit(submitInput) {
              expect(submitInput).toEqual({ sessionId: "session.1", text: "create" });
              return { kind: "submitted", runId: "run.1" };
            },
            async cancel(cancelInput) {
              expect(cancelInput).toEqual({ sessionId: "session.1", runId: "run.1" });
              return { kind: "cancel_requested" };
            },
            async close() {
              closeCount += 1;
            },
          },
        };
      },
    };
    const client = createAgentSessionClientV1({ connector });
    const events: AgentSessionStreamEventV1[] = [];
    client.subscribeStream((event) => events.push(event));

    await expect(client.connect()).resolves.toEqual({ kind: "ready" });
    expect(client.getSnapshot().status).toEqual({ kind: "ready" });
    await expect(client.start()).resolves.toEqual({ kind: "started", sessionId: "session.1" });
    await expect(client.submit({ sessionId: "session.1", text: "create" })).resolves.toEqual({
      kind: "submitted",
      runId: "run.1",
    });
    await expect(client.cancel({ sessionId: "session.1", runId: "run.1" })).resolves.toEqual({
      kind: "cancel_requested",
    });

    expect(eventSink.current).not.toBeNull();
    eventSink.current!({
      kind: "output_text_delta",
      sessionId: "session.1",
      runId: "run.1",
      sequence: 1,
      text: "working",
    });
    eventSink.current!({
      kind: "output_data",
      sessionId: "session.1",
      runId: "run.1",
      sequence: 2,
      value: { proposal: "ready" },
    });
    eventSink.current!({
      kind: "run_completed",
      sessionId: "session.1",
      runId: "run.1",
      sequence: 3,
    });

    expect(events).toEqual([
      {
        kind: "output_text_delta",
        sessionId: "session.1",
        runId: "run.1",
        sequence: 1,
        text: "working",
      },
      {
        kind: "output_data",
        sessionId: "session.1",
        runId: "run.1",
        sequence: 2,
        value: { proposal: "ready" },
      },
      {
        kind: "run_completed",
        sessionId: "session.1",
        runId: "run.1",
        sequence: 3,
      },
    ]);

    await client.dispose();
    expect(closeCount).toBe(1);
    expect(client.getSnapshot().status).toEqual({ kind: "disposed" });
  });

  it("admits the first event forwarded immediately after submit settles", async () => {
    let onEvent: ((event: unknown) => void) | null = null;
    const connector: AgentSessionConnectorV1 = {
      isConfigured: () => true,
      async connect(input) {
        onEvent = input.onEvent;
        return {
          kind: "connected",
          connection: {
            async start() {
              return { kind: "started", sessionId: "session.1" };
            },
            submit() {
              const result = Promise.resolve({ kind: "submitted", runId: "run.1" });
              void result.then(() => {
                onEvent?.({
                  kind: "output_text_delta",
                  sessionId: "session.1",
                  runId: "run.1",
                  sequence: 1,
                  text: "first",
                });
              });
              return result;
            },
            async cancel() {
              return { kind: "cancel_requested" };
            },
            async close() {},
          },
        };
      },
    };
    const client = createAgentSessionClientV1({ connector });
    const events: AgentSessionStreamEventV1[] = [];
    client.subscribeStream((event) => events.push(event));

    await client.connect();
    await client.start();
    await expect(client.submit({ sessionId: "session.1", text: "create" })).resolves.toEqual({
      kind: "submitted",
      runId: "run.1",
    });

    expect(events).toEqual([
      {
        kind: "output_text_delta",
        sessionId: "session.1",
        runId: "run.1",
        sequence: 1,
        text: "first",
      },
    ]);
    expect(client.getSnapshot().diagnostic).toBeNull();
  });

  it("waits for an in-flight reconnect close when disposed", async () => {
    let closeStartedResolve!: () => void;
    let closeResolve!: () => void;
    const closeStarted = new Promise<void>((resolve) => {
      closeStartedResolve = resolve;
    });
    const closeGate = new Promise<void>((resolve) => {
      closeResolve = resolve;
    });
    const connector: AgentSessionConnectorV1 = {
      isConfigured: () => true,
      async connect() {
        return {
          kind: "connected",
          connection: {
            async start() {
              return { kind: "started", sessionId: "session.1" };
            },
            async submit() {
              return { kind: "submitted", runId: "run.1" };
            },
            async cancel() {
              return { kind: "cancel_requested" };
            },
            async close() {
              closeStartedResolve();
              await closeGate;
            },
          },
        };
      },
    };
    const client = createAgentSessionClientV1({ connector });
    await client.connect();
    const reconnecting = client.reconnect();
    await closeStarted;
    let disposeSettled = false;
    const disposing = client.dispose().then(() => {
      disposeSettled = true;
    });
    await Promise.resolve();

    expect(disposeSettled).toBe(false);
    closeResolve();
    await disposing;
    await expect(reconnecting).resolves.toEqual({ kind: "disposed" });
  });

  it("joins concurrent dispose calls to the same close barrier", async () => {
    let closeStartedResolve!: () => void;
    let closeResolve!: () => void;
    const closeStarted = new Promise<void>((resolve) => {
      closeStartedResolve = resolve;
    });
    const closeGate = new Promise<void>((resolve) => {
      closeResolve = resolve;
    });
    const connector: AgentSessionConnectorV1 = {
      isConfigured: () => true,
      async connect() {
        return {
          kind: "connected",
          connection: {
            async start() {
              return { kind: "started", sessionId: "session.1" };
            },
            async submit() {
              return { kind: "submitted", runId: "run.1" };
            },
            async cancel() {
              return { kind: "cancel_requested" };
            },
            async close() {
              closeStartedResolve();
              await closeGate;
            },
          },
        };
      },
    };
    const client = createAgentSessionClientV1({ connector });
    await client.connect();
    const first = client.dispose();
    await closeStarted;
    let secondSettled = false;
    const second = client.dispose().then(() => {
      secondSettled = true;
    });
    await Promise.resolve();

    expect(secondSettled).toBe(false);
    closeResolve();
    await Promise.all([first, second]);
  });
});
