// SPDX-License-Identifier: MIT
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";

import type { AgentGamePortV1, AgentWaitOptionsV1 } from "@sillymaker/base/runtime";
import { createAgentDiagnosticsCapabilityV1 } from "@sillymaker/base/runtime";

import { createJsonlAgentClientV1 } from "./client.js";
import { createJsonlAgentHostV1 } from "./host.js";
import type { JsonlAgentHostInputV1 } from "./host.js";
import { jsonlProtocolVersionV1 } from "./protocol.js";

function createFixtureAgentV1() {
  let revision = 0;
  const listeners = new Set<() => void>();
  const publication = () =>
    Object.freeze({
      revision,
      status: "ready" as const,
      game: Object.freeze({ count: revision }),
      narrative: null,
      actions: Object.freeze([Object.freeze({ actionId: "fixture.step" })]),
    });
  const agent: AgentGamePortV1<unknown, unknown, unknown, unknown, unknown, unknown> =
    Object.freeze({
      identity: () => Object.freeze({ storyId: "story.fixture", storyRevision: 1 }),
      observe: () => publication() as never,
      describeActions: () => publication().actions as never,
      preview: async () => Object.freeze({ kind: "allowed" }),
      dispatch: async () => {
        revision += 1;
        for (const listener of [...listeners]) listener();
        return Object.freeze({ kind: "committed" });
      },
      waitForIdle: async (options?: AgentWaitOptionsV1) => {
        if (options?.timeoutMs !== undefined && options.timeoutMs <= 1) {
          return new Promise<never>(() => undefined);
        }
        return Object.freeze({ kind: "idle" as const, publication: publication() as never });
      },
    });
  return {
    agent,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function createHostFixtureV1(overrides: Partial<JsonlAgentHostInputV1> = {}) {
  const fixture = createFixtureAgentV1();
  const toHost = new PassThrough();
  const fromHost = new PassThrough();
  const stdoutLines: string[] = [];
  fromHost.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split("\n")) {
      if (line.trim().length > 0) stdoutLines.push(line);
    }
  });
  const logs: string[] = [];
  const host = createJsonlAgentHostV1({
    agent: fixture.agent,
    subscribe: fixture.subscribe,
    input: toHost,
    output: fromHost,
    log: (line) => logs.push(line),
    ...overrides,
  });
  const client = createJsonlAgentClientV1({ input: toHost, output: fromHost });
  return { host, client, toHost, stdoutLines, logs };
}

describe("createJsonlAgentHostV1", () => {
  it("answers the hello/observe/preview/dispatch/wait core sequence", async () => {
    const { host, client } = createHostFixtureV1();

    const hello = await client.request("hello");
    expect(hello).toMatchObject({
      ok: true,
      result: {
        protocol: 1,
        identity: { storyId: "story.fixture", storyRevision: 1 },
      },
    });
    await expect(client.request("observe")).resolves.toMatchObject({
      ok: true,
      result: { revision: 0 },
    });
    await expect(
      client.request("preview", { invocation: { actionId: "fixture.step" } }),
    ).resolves.toMatchObject({ ok: true, result: { kind: "allowed" } });
    await expect(
      client.request("dispatch", { invocation: { actionId: "fixture.step" } }),
    ).resolves.toMatchObject({ ok: true, result: { kind: "committed" } });
    await expect(client.request("waitForIdle")).resolves.toMatchObject({
      ok: true,
      result: { kind: "idle" },
    });
    expect(client.events().length).toBeGreaterThanOrEqual(1);

    await client.request("shutdown");
    await host.done;
  });

  it("gates diagnostics behind the explicit capability", async () => {
    const withoutCapability = createHostFixtureV1();
    await expect(withoutCapability.client.request("exportDiagnostics")).resolves.toEqual({
      ok: false,
      error: {
        code: "protocol.capability_disabled",
        message: "this capability is not enabled for the agent",
      },
    });
    await withoutCapability.client.request("shutdown");
    await withoutCapability.host.done;

    const diagnostics = createAgentDiagnosticsCapabilityV1({
      exportDiagnostics: async () => ({ failures: 0 }),
    });
    const withCapability = createHostFixtureV1({ diagnostics: diagnostics.capability });
    await expect(withCapability.client.request("exportDiagnostics")).resolves.toEqual({
      ok: true,
      result: { failures: 0 },
    });
    await withCapability.client.request("shutdown");
    await withCapability.host.done;
  });

  it("returns bounded structured errors without leaking stacks to stdout", async () => {
    const { host, client, toHost, stdoutLines } = createHostFixtureV1({
      limits: { maxLineBytes: 512, maxDepth: 4, requestTimeoutMs: 20 },
    });

    toHost.write("this is not json\n");
    toHost.write(`${JSON.stringify({ v: 2, id: "raw-version", method: "observe" })}\n`);
    toHost.write(`${JSON.stringify({ v: 1, id: "raw-eval", method: "eval" })}\n`);
    toHost.write(
      `${JSON.stringify({ v: 1, id: "raw-depth", method: "observe", params: { a: { b: { c: { d: { e: 1 } } } } } })}\n`,
    );
    toHost.write(`${"x".repeat(600)}\n`);
    const timeout = await client.request("waitForIdle", { timeoutMs: 1 });
    expect(timeout).toEqual({
      ok: false,
      error: { code: "protocol.request_timeout", message: "request timed out" },
    });

    await client.request("shutdown");
    await host.done;

    const parsed = stdoutLines.map((line) => JSON.parse(line) as Record<string, unknown>);
    for (const line of parsed) {
      expect(line.v).toBe(jsonlProtocolVersionV1);
      expect(JSON.stringify(line)).not.toMatch(/\bat\s+\S+:\d+:\d+/u);
    }
    const codes = parsed
      .filter((line) => line.ok === false)
      .map((line) => (line.error as { code: string }).code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "protocol.invalid_json",
        "protocol.unsupported_version",
        "protocol.unknown_method",
        "protocol.depth_exceeded",
        "protocol.line_too_long",
        "protocol.request_timeout",
      ]),
    );
  });

  it("rejects new work while shutting down and settles once drained", async () => {
    const { host, client } = createHostFixtureV1();
    await client.request("shutdown");
    await expect(client.request("observe")).resolves.toEqual({
      ok: false,
      error: { code: "protocol.shutting_down", message: "host is shutting down" },
    });
    await host.done;
  });
});
