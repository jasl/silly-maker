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
import type { CreatorAgentRunRequestV1, CreatorAgentSubmitV1 } from "../product/contracts.ts";

const submitV1: CreatorAgentSubmitV1 = {
  revision: 1,
  proposalId: "workspace.preview.1.proposal.1",
  programId: "program.workspace.preview.1",
  baseProgramRevision: 1,
  text: "Make review explicit.",
};

function productRunV1(
  overrides: Partial<CreatorAgentRunRequestV1> = {},
): CreatorAgentRunRequestV1 {
  return {
    agentRunId: "agent.run.product.1",
    proposalId: submitV1.proposalId,
    programId: submitV1.programId,
    baseProgramRevision: submitV1.baseProgramRevision,
    baseRepositoryRevision: 1,
    text: submitV1.text,
    ...overrides,
  };
}

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

class RuntimeMismatchBrowserPiWorkerV1 implements BrowserPiWorkerLikeV1 {
  terminated = false;
  private readonly messageListeners = new Set<(event: { readonly data: unknown }) => void>();
  private readonly errorListeners = new Set<(event: unknown) => void>();

  postMessage(message: unknown): void {
    const runtime = (message as { readonly runtime?: unknown }).runtime;
    const mismatchedRuntime = runtime === "openai_direct" ? "deterministic_test" : "openai_direct";
    queueMicrotask(() => {
      for (const listener of [...this.messageListeners]) {
        listener({
          data: {
            revision: 1,
            kind: "ready",
            requestId: 1,
            runtime: mismatchedRuntime,
            distribution: browserPiDistributionIdentityV1,
          },
        });
      }
    });
  }

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
    this.terminated = true;
    this.messageListeners.clear();
    this.errorListeners.clear();
  }
}

/** Minimal controllable Worker used only to drive product-terminal edge cases. */
class ControllableBrowserPiWorkerV1 implements BrowserPiWorkerLikeV1 {
  terminated = false;
  latestPiRunId: string | null = null;
  private readonly messageListeners = new Set<(event: { readonly data: unknown }) => void>();
  private readonly errorListeners = new Set<(event: unknown) => void>();
  private nextPiRunOrdinal = 1;

  private emit(message: unknown): void {
    const data = structuredClone(message);
    for (const listener of [...this.messageListeners]) listener({ data });
  }

  postMessage(message: unknown): void {
    if (this.terminated) throw new Error("Worker is terminated");
    const envelope = structuredClone(message) as Readonly<Record<string, unknown>>;
    if (envelope.kind === "initialize") {
      this.emit({
        revision: 1,
        kind: "ready",
        requestId: envelope.requestId,
        runtime: envelope.runtime,
        distribution: browserPiDistributionIdentityV1,
      });
      return;
    }
    const record = envelope.record as Readonly<Record<string, unknown>>;
    if (record.method === "start") {
      this.emit({
        revision: 1,
        kind: "rpc_response",
        requestId: envelope.requestId,
        ok: true,
        response: { kind: "started", sessionId: "controlled.session.1" },
      });
      return;
    }
    if (record.method === "submit") {
      this.latestPiRunId = `controlled.run.${String(this.nextPiRunOrdinal++)}`;
      this.emit({
        revision: 1,
        kind: "rpc_response",
        requestId: envelope.requestId,
        ok: true,
        response: { kind: "submitted", runId: this.latestPiRunId },
      });
      return;
    }
    if (record.method === "cancel") {
      this.emit({
        revision: 1,
        kind: "rpc_response",
        requestId: envelope.requestId,
        ok: true,
        response: { kind: "cancel_requested" },
      });
    }
  }

  emitRunFailure(
    code: "cancelled" | "pi_failed",
    piRunId: string = this.latestPiRunId ?? "",
  ): void {
    this.emit({
      revision: 1,
      kind: "rpc_record",
      record: {
        kind: "run_failed",
        code,
        sessionId: "controlled.session.1",
        runId: piRunId,
        sequence: 1,
      },
    });
  }

  emitCompleted(run: CreatorAgentRunRequestV1, text: string): void {
    const runId = this.latestPiRunId ?? "";
    const records = [
      { kind: "artifact_chunk", text },
      {
        kind: "artifact_complete",
        candidate: {
          revision: 1,
          proposalId: run.proposalId,
          programId: run.programId,
          baseProgramRevision: run.baseProgramRevision,
          text: run.text,
          requirement: run.text,
        },
      },
      { kind: "run_completed" },
    ];
    records.forEach((record, index) => {
      this.emit({
        revision: 1,
        kind: "rpc_record",
        record: {
          ...record,
          sessionId: "controlled.session.1",
          runId,
          sequence: index + 1,
        },
      });
    });
  }

  emitArtifactChunks(
    count: number,
    firstSequence: number,
    piRunId: string = this.latestPiRunId ?? "",
  ): void {
    for (let index = 0; index < count; index += 1) {
      this.emit({
        revision: 1,
        kind: "rpc_record",
        record: {
          kind: "artifact_chunk",
          text: "late",
          sessionId: "controlled.session.1",
          runId: piRunId,
          sequence: firstSequence + index,
        },
      });
    }
  }

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
    this.terminated = true;
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
    runtime.receive({
      revision: 1,
      kind: "initialize",
      requestId: 3,
      runtime: "host_path_pi",
      credential: { kind: "api_key", value: "key" },
    });

    expect(getterCalls).toBe(0);
    expect(messages).toEqual([
      { revision: 1, kind: "protocol_failure", code: "invalid_message" },
      { revision: 1, kind: "protocol_failure", code: "invalid_message" },
      { revision: 1, kind: "protocol_failure", code: "invalid_message" },
    ]);
    runtime.dispose();
  });

  it("initializes the explicit live profile before any Provider run exists", () => {
    const messages: BrowserPiWorkerOutboundMessageV1[] = [];
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "initialize",
      requestId: 1,
      runtime: "openai_direct",
      credential: { kind: "api_key", value: "sentinel-live-key" },
    });

    expect(messages).toEqual([{
      revision: 1,
      kind: "ready",
      requestId: 1,
      runtime: "openai_direct",
      distribution: browserPiDistributionIdentityV1,
    }]);
    expect(JSON.stringify(messages)).not.toContain("sentinel-live-key");
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

  it("rejects a Worker that reports a different configured runtime", async () => {
    const worker = new RuntimeMismatchBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      apiKey: "synthetic-key",
      runtime: "openai_direct",
      workerFactory: () => worker,
    });

    await expect(port.initialize()).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "connection_failed", path: "/connect" },
    });
    expect(worker.terminated).toBe(true);
    await port.dispose();
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

  it("publishes one completed product terminal without exposing Pi identities", async () => {
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
      terminalRuns: [],
    });
    await expect(port.initialize()).resolves.toEqual({ kind: "ready" });

    let survivingObserverCalls = 0;
    port.subscribe(() => {
      throw new Error("terminal observer failure must remain observational");
    });
    port.subscribe(() => {
      survivingObserverCalls += 1;
    });
    const run = productRunV1();
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);

    const terminal = port.getSnapshot().terminalRuns[0];
    expect(terminal).toEqual({
      run,
      outcome: "completed",
      candidate: {
        revision: 1,
        proposalId: run.proposalId,
        programId: run.programId,
        baseProgramRevision: run.baseProgramRevision,
        text: run.text,
        requirement: run.text,
      },
      finalAssistantReply: "Deterministic test proposal ready.",
    });
    expect(port.getSnapshot().terminalRuns.filter(({ outcome }) => outcome === "completed"))
      .toHaveLength(1);
    expect(JSON.stringify(terminal)).not.toContain("sillyos.session.");
    expect(JSON.stringify(terminal)).not.toContain("sillyos.run.");
    expect(JSON.stringify(terminal)).not.toContain('"sessionId"');
    expect(JSON.stringify(terminal)).not.toContain('"runId"');
    expect(survivingObserverCalls).toBeGreaterThan(0);

    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(true);
    expect(port.getSnapshot()).toMatchObject({ phase: "ready", terminalRuns: [] });
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(false);
    await port.forget();
    expect(port.getSnapshot()).toMatchObject({
      phase: "forgotten",
      activeRunId: null,
      draft: "",
      candidate: null,
    });
    expect((worker as unknown as InMemoryBrowserPiWorkerV1).terminated).toBe(true);
  });

  it("retains a predecessor replacement after the latest run becomes current", async () => {
    const port = createBrowserCreatorAgentPortV1({
      apiKey: "sentinel-browser-key",
      runtime: "deterministic_test",
      workerFactory: () => new InMemoryBrowserPiWorkerV1(),
    });
    await expect(port.initialize()).resolves.toEqual({ kind: "ready" });
    const firstRun = productRunV1({ agentRunId: "agent.run.replaced" });
    const latestRun = productRunV1({
      agentRunId: "agent.run.latest",
      proposalId: "workspace.preview.1.proposal.latest",
      text: "Keep only the latest candidate.",
    });

    const first = port.submit(firstRun);
    const latest = port.submit(latestRun);
    await expect(first).resolves.toEqual({
      kind: "submitted",
      agentRunId: firstRun.agentRunId,
    });
    await expect(latest).resolves.toEqual({
      kind: "submitted",
      agentRunId: latestRun.agentRunId,
    });
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 2);

    const terminals = port.getSnapshot().terminalRuns;
    expect(terminals).toHaveLength(2);
    expect(terminals.filter(({ run }) => run.agentRunId === firstRun.agentRunId)).toEqual([{
      run: firstRun,
      outcome: "replaced",
    }]);
    expect(terminals.filter(({ run }) => run.agentRunId === latestRun.agentRunId)).toEqual([{
      run: latestRun,
      outcome: "completed",
      candidate: {
        revision: 1,
        proposalId: latestRun.proposalId,
        programId: latestRun.programId,
        baseProgramRevision: latestRun.baseProgramRevision,
        text: latestRun.text,
        requirement: latestRun.text,
      },
      finalAssistantReply: "Deterministic test proposal ready.",
    }]);
    expect(terminals.filter(({ outcome }) => outcome === "replaced")).toHaveLength(1);
    expect(terminals.filter(({ outcome }) => outcome === "completed")).toHaveLength(1);
    expect(JSON.stringify(terminals)).not.toContain('"sessionId"');
    expect(JSON.stringify(terminals)).not.toContain('"runId"');

    expect(port.acknowledgeTerminal(firstRun.agentRunId)).toBe(true);
    expect(port.getSnapshot().terminalRuns.map(({ run }) => run.agentRunId)).toEqual([
      latestRun.agentRunId,
    ]);
    expect(port.acknowledgeTerminal(latestRun.agentRunId)).toBe(true);
    expect(port.getSnapshot().terminalRuns).toEqual([]);
    await port.dispose();
  });

  it("maps an authoritative remote failure exactly once", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      apiKey: "sentinel-browser-key",
      runtime: "deterministic_test",
      workerFactory: () => worker,
    });
    const run = productRunV1({ agentRunId: "agent.run.failed" });
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });
    const piRunId = worker.latestPiRunId;
    if (piRunId === null) throw new Error("expected a transient Pi run id");

    worker.emitRunFailure("pi_failed", piRunId);
    worker.emitRunFailure("pi_failed", piRunId);
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);

    expect(port.getSnapshot().terminalRuns).toEqual([{
      run,
      outcome: "failed",
      diagnosticCode: "run_failed",
    }]);
    expect(JSON.stringify(port.getSnapshot().terminalRuns)).not.toContain(piRunId);
    expect(JSON.stringify(port.getSnapshot().terminalRuns)).not.toContain("controlled.session.1");
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(true);
    await port.dispose();
  });

  it("projects a whitespace-only completed reply as one failed terminal", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      apiKey: "sentinel-browser-key",
      runtime: "deterministic_test",
      workerFactory: () => worker,
    });
    const run = productRunV1({ agentRunId: "agent.run.whitespace" });
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });

    worker.emitCompleted(run, "   ");
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);

    expect(port.getSnapshot().terminalRuns).toEqual([{
      run,
      outcome: "failed",
      diagnosticCode: "protocol_invalid",
    }]);
    expect(port.getSnapshot().phase).toBe("failed");
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(true);
    await port.dispose();
  });

  it("keeps cancel requested non-terminal until the Worker emits cancelled", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      apiKey: "sentinel-browser-key",
      runtime: "deterministic_test",
      workerFactory: () => worker,
    });
    const run = productRunV1({ agentRunId: "agent.run.cancelled" });
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });
    const piRunId = worker.latestPiRunId;
    if (piRunId === null) throw new Error("expected a transient Pi run id");

    await expect(port.cancel(run.agentRunId)).resolves.toEqual({ kind: "cancel_requested" });
    expect(port.getSnapshot()).toMatchObject({
      phase: "running",
      activeRunId: run.agentRunId,
      terminalRuns: [],
    });

    worker.emitRunFailure("cancelled", piRunId);
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);
    expect(port.getSnapshot().terminalRuns).toEqual([{ run, outcome: "cancelled" }]);
    expect(port.getSnapshot().terminalRuns.filter(({ outcome }) => outcome === "cancelled"))
      .toHaveLength(1);
    expect(JSON.stringify(port.getSnapshot().terminalRuns)).not.toContain(piRunId);
    expect(JSON.stringify(port.getSnapshot().terminalRuns)).not.toContain("controlled.session.1");
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(true);
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(false);
    worker.emitArtifactChunks(2_049, 2, piRunId);
    expect(port.getSnapshot()).toMatchObject({ phase: "ready", terminalRuns: [] });
    await port.dispose();
  });
});
