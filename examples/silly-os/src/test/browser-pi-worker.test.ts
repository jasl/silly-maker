// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";

import { createAgentRpcClientInternalV1 } from "@sillymaker/agent/internal";
import { describe, expect, it } from "vitest";

import { browserPiDistributionIdentityV1 } from "../agent/browser-pi-distribution.ts";
import {
  createBrowserPiWorkerRawTransportV1,
  type BrowserPiWorkerLikeV1,
} from "../agent/browser-pi-transport.ts";
import { createBrowserPiWorkerRuntimeV1 } from "../agent/browser-pi-worker-runtime.ts";
import type { BrowserPiWorkerOutboundMessageV1 } from "../agent/browser-pi-worker-protocol.ts";
import { createBrowserCreatorAgentPortV1 } from "../agent/creator-agent-port.ts";
import { serializeCreatorAgentSubmitV1 } from "../product/creator-agent-admission.ts";
import type { CreatorAgentSubmitV1 } from "../product/contracts.ts";

const submitV1: CreatorAgentSubmitV1 = {
  revision: 1,
  proposalId: "workspace.preview.1.proposal.1",
  programId: "program.workspace.preview.1",
  baseProgramRevision: 1,
  text: "Make review explicit.",
};

async function waitUntilV1(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for the Browser Pi test runtime");
}

function rpcRequestV1(
  requestId: number,
  record: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return {
    revision: 1,
    kind: "rpc_request",
    requestId,
    record,
  };
}

class InMemoryBrowserPiWorkerV1 {
  readonly posted: unknown[] = [];
  terminated = false;
  private readonly messageListeners = new Set<(event: { readonly data: unknown }) => void>();
  private readonly errorListeners = new Set<(event: unknown) => void>();
  private readonly runtime = createBrowserPiWorkerRuntimeV1({
    postMessage: (message) => {
      const data = structuredClone(message);
      for (const listener of [...this.messageListeners]) listener({ data });
    },
  });

  postMessage(message: unknown): void {
    if (this.terminated) throw new Error("Worker is terminated");
    const data = structuredClone(message);
    this.posted.push(data);
    this.runtime.receive(data);
  }

  addEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
  addEventListener(type: "error", listener: (event: unknown) => void): void;
  addEventListener(
    type: "message" | "error",
    listener: ((event: { readonly data: unknown }) => void) | ((event: unknown) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: { readonly data: unknown }) => void);
    } else {
      this.errorListeners.add(listener as (event: unknown) => void);
    }
  }

  removeEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
  removeEventListener(type: "error", listener: (event: unknown) => void): void;
  removeEventListener(
    type: "message" | "error",
    listener: ((event: { readonly data: unknown }) => void) | ((event: unknown) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: { readonly data: unknown }) => void);
    } else {
      this.errorListeners.delete(listener as (event: unknown) => void);
    }
  }

  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    this.runtime.dispose();
    this.messageListeners.clear();
    this.errorListeners.clear();
  }
}

describe("SillyOS Browser Pi Worker runtime", () => {
  it("keeps the admitted Browser Pi identity equal to exact product dependencies", async () => {
    const manifest = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { readonly dependencies?: Readonly<Record<string, unknown>> };
    for (const dependency of browserPiDistributionIdentityV1.packages) {
      expect(manifest.dependencies?.[dependency.name]).toBe(dependency.version);
    }
  });

  it("rejects non-exact protocol envelopes without invoking accessors", () => {
    const messages: BrowserPiWorkerOutboundMessageV1[] = [];
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    let getterCalls = 0;
    const accessor = {
      revision: 1,
      requestId: 1,
      runtime: "deterministic_test",
      credential: { kind: "api_key", value: "key" },
    } as Record<string, unknown>;
    Object.defineProperty(accessor, "kind", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "initialize";
      },
    });
    runtime.receive(accessor);
    runtime.receive({
      revision: 1,
      kind: "initialize",
      requestId: 2,
      runtime: "deterministic_test",
      credential: { kind: "api_key", value: "key" },
      extra: true,
    });

    expect(getterCalls).toBe(0);
    expect(messages).toEqual([
      { revision: 1, kind: "protocol_failure", code: "invalid_message" },
      { revision: 1, kind: "protocol_failure", code: "invalid_message" },
    ]);
    runtime.dispose();
  });

  it("runs real Pi Agent tool flow and posts the submit response before its bounded records", async () => {
    const messages: BrowserPiWorkerOutboundMessageV1[] = [];
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "initialize",
      requestId: 1,
      runtime: "deterministic_test",
      credential: { kind: "api_key", value: "sentinel-browser-key" },
    });
    runtime.receive(rpcRequestV1(2, { revision: 1, requestId: 1, method: "start" }));
    runtime.receive(rpcRequestV1(3, {
      revision: 1,
      requestId: 2,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1(submitV1),
      },
    }));

    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );

    expect(messages[0]).toEqual({
      revision: 1,
      kind: "ready",
      requestId: 1,
      runtime: "deterministic_test",
      distribution: browserPiDistributionIdentityV1,
    });
    const submitResponseIndex = messages.findIndex((message) =>
      message.kind === "rpc_response" && message.requestId === 3
    );
    const firstRecordIndex = messages.findIndex((message) => message.kind === "rpc_record");
    expect(submitResponseIndex).toBeGreaterThanOrEqual(0);
    expect(firstRecordIndex).toBeGreaterThan(submitResponseIndex);

    const records = messages.flatMap((message) =>
      message.kind === "rpc_record" ? [message.record as Readonly<Record<string, unknown>>] : []
    );
    expect(records.map((record) => record.sequence)).toEqual(
      records.map((_record, index) => index + 1),
    );
    expect(records.filter((record) => record.kind === "artifact_chunk")).toHaveLength(1);
    expect(records.find((record) => record.kind === "artifact_complete")?.candidate).toEqual({
      ...submitV1,
      requirement: submitV1.text,
    });
    expect(records.at(-1)?.kind).toBe("run_completed");
    expect(JSON.stringify(messages)).not.toContain("sentinel-browser-key");
    runtime.dispose();
  });

  it("fences replaced and cancelled runs by session, run, and contiguous sequence", async () => {
    const messages: BrowserPiWorkerOutboundMessageV1[] = [];
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "initialize",
      requestId: 1,
      runtime: "deterministic_test",
      credential: { kind: "api_key", value: "key" },
    });
    runtime.receive(rpcRequestV1(2, { revision: 1, requestId: 1, method: "start" }));
    runtime.receive(rpcRequestV1(3, {
      revision: 1,
      requestId: 2,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1(submitV1),
      },
    }));
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      requestId: 3,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.2",
          text: "Replace the prior run.",
        }),
      },
    }));

    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.2" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    const records = messages.flatMap((message) =>
      message.kind === "rpc_record" ? [message.record as Readonly<Record<string, unknown>>] : []
    );
    expect(records.filter((record) => record.runId === "sillyos.run.1")).toEqual([
      {
        kind: "run_failed",
        code: "replaced",
        sessionId: "sillyos.session.1",
        runId: "sillyos.run.1",
        sequence: 1,
      },
    ]);
    expect(records.filter((record) => record.runId === "sillyos.run.2").at(-1)?.kind).toBe(
      "run_completed",
    );

    runtime.receive(rpcRequestV1(5, {
      revision: 1,
      requestId: 4,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.3",
          text: "Cancel this run.",
        }),
      },
    }));
    runtime.receive(rpcRequestV1(6, {
      revision: 1,
      requestId: 5,
      method: "cancel",
      params: { sessionId: "sillyos.session.1", runId: "sillyos.run.3" },
    }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.3"
      )
    );
    const cancelResponseIndex = messages.findIndex((message) =>
      message.kind === "rpc_response" && message.requestId === 6
    );
    const cancelledRecordIndex = messages.findIndex((message) =>
      message.kind === "rpc_record" &&
      (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.3"
    );
    expect(cancelledRecordIndex).toBeGreaterThan(cancelResponseIndex);
    expect((messages[cancelledRecordIndex] as { record: unknown }).record).toEqual({
      kind: "run_failed",
      code: "cancelled",
      sessionId: "sillyos.session.1",
      runId: "sillyos.run.3",
      sequence: 1,
    });
    runtime.dispose();
  });
});

describe("SillyOS Browser Pi transport and product port", () => {
  it("reports unconfigured and failed Worker setup without inventing a fallback", async () => {
    let emptyKeyFactoryCalls = 0;
    const unconfigured = createBrowserCreatorAgentPortV1({
      apiKey: "",
      runtime: "deterministic_test",
      workerFactory: () => {
        emptyKeyFactoryCalls += 1;
        throw new Error("must not construct");
      },
    });
    await expect(unconfigured.initialize()).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "unconfigured", path: "/connect" },
    });
    expect(emptyKeyFactoryCalls).toBe(0);
    expect(unconfigured.getSnapshot()).toMatchObject({
      phase: "failed",
      diagnostic: { code: "unconfigured", path: "/connect" },
    });
    await unconfigured.dispose();

    const failed = createBrowserCreatorAgentPortV1({
      apiKey: "synthetic-key",
      runtime: "deterministic_test",
      workerFactory: () => {
        throw new Error("worker unavailable");
      },
    });
    await expect(failed.initialize()).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "connection_failed", path: "/connect" },
    });
    expect(failed.getSnapshot()).toMatchObject({
      phase: "failed",
      diagnostic: { code: "connection_failed", path: "/connect" },
    });
    await failed.dispose();
  });

  it("creates the Worker lazily, posts the key once, settles submit first, and terminates", async () => {
    let worker: InMemoryBrowserPiWorkerV1 | null = null;
    const transport = createBrowserPiWorkerRawTransportV1({
      apiKey: "sentinel-browser-key",
      runtime: "deterministic_test",
      workerFactory: () => {
        worker = new InMemoryBrowserPiWorkerV1();
        return worker as BrowserPiWorkerLikeV1;
      },
    });
    const client = createAgentRpcClientInternalV1({ transport });
    const settlement: boolean[] = [];
    let submitSettled = false;
    client.subscribeStream(() => settlement.push(submitSettled));

    expect(worker).toBeNull();
    await expect(client.connect()).resolves.toEqual({ kind: "ready" });
    await expect(client.start()).resolves.toEqual({
      kind: "started",
      sessionId: "sillyos.session.1",
    });
    const submitted = client.submit({
      sessionId: "sillyos.session.1",
      text: serializeCreatorAgentSubmitV1(submitV1),
    }).then((result) => {
      submitSettled = true;
      return result;
    });
    await expect(submitted).resolves.toEqual({ kind: "submitted", runId: "sillyos.run.1" });
    await waitUntilV1(() => settlement.length > 0);
    expect(settlement.every(Boolean)).toBe(true);
    expect(worker).not.toBeNull();
    const posted = (worker as unknown as InMemoryBrowserPiWorkerV1).posted;
    expect(posted.filter((message) => JSON.stringify(message).includes("sentinel-browser-key")))
      .toHaveLength(1);
    expect((posted[0] as Readonly<Record<string, unknown>>).kind).toBe("initialize");

    await client.dispose();
    expect((worker as unknown as InMemoryBrowserPiWorkerV1).terminated).toBe(true);
  });

  it("exposes only product state and retains the latest concurrent run candidate", async () => {
    let worker: InMemoryBrowserPiWorkerV1 | null = null;
    const port = createBrowserCreatorAgentPortV1({
      apiKey: "sentinel-browser-key",
      runtime: "deterministic_test",
      workerFactory: () => {
        worker = new InMemoryBrowserPiWorkerV1();
        return worker as BrowserPiWorkerLikeV1;
      },
    });
    expect(port.getSnapshot()).toMatchObject({
      phase: "uninitialized",
      distribution: browserPiDistributionIdentityV1,
    });
    await expect(port.initialize()).resolves.toEqual({ kind: "ready" });

    const first = port.submit(submitV1);
    const latestSubmit: CreatorAgentSubmitV1 = {
      ...submitV1,
      proposalId: "workspace.preview.1.proposal.latest",
      text: "Keep only the latest candidate.",
    };
    const latest = port.submit(latestSubmit);
    await expect(first).resolves.toMatchObject({ kind: "submitted" });
    await expect(latest).resolves.toMatchObject({ kind: "submitted" });
    await waitUntilV1(() => port.getSnapshot().phase === "completed");

    expect(port.getSnapshot()).toMatchObject({
      phase: "completed",
      activeRunId: "sillyos.run.2",
      draft: "Deterministic test proposal ready.",
      candidate: {
        ...latestSubmit,
        requirement: latestSubmit.text,
      },
      diagnostic: null,
    });
    await port.forget();
    expect(port.getSnapshot()).toMatchObject({
      phase: "forgotten",
      activeRunId: null,
      draft: "",
      candidate: null,
    });
    expect((worker as unknown as InMemoryBrowserPiWorkerV1).terminated).toBe(true);
  });
});
