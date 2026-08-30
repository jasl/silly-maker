// SPDX-License-Identifier: MIT

import type { Frame, Page } from "@playwright/test";

import { expect, sillyOsQuickJsSandboxTargetUrlV1, test } from "./fixtures.ts";

const sandboxUrlV1 = sillyOsQuickJsSandboxTargetUrlV1("workspace-sandbox.html");
const workerPathV1 = "/src/workspace-sandbox/browser-workspace-quickjs.worker.ts";
const buildIdentityV1 = "sillyos.workspace-sandbox.development";

interface QuickJsRequestV1 {
  readonly revision: 1;
  readonly kind: "quickjs_execute";
  readonly requestId: number;
  readonly buildIdentity: string;
  readonly source: string;
  readonly argv: readonly string[];
  readonly stdin: string;
  readonly files: readonly Readonly<{ path: string; text: string }>[];
}

interface QuickJsResponseV1 {
  readonly revision: 1;
  readonly kind: "quickjs_result";
  readonly requestId: number | null;
  readonly buildIdentity: string;
  readonly ok: boolean;
  readonly code?: string;
  readonly diagnostic?:
    | Readonly<{
      readonly kind: string;
      readonly message: string;
      readonly line: number | null;
      readonly column: number | null;
    }>
    | null;
  readonly wasmLinearMemoryBytes?: number | null;
  readonly response?: {
    readonly changes: readonly Readonly<{
      path: string;
      kind: string;
      before: string | null;
      after: string | null;
    }>[];
    readonly stdout: string;
    readonly moduleStartupMilliseconds: number;
    readonly executionMilliseconds: number;
    readonly runtimeAllocatorLimitBytes: number;
    readonly wasmLinearMemoryBytes: number;
    readonly stackLimitBytes: number;
  };
}

function requestV1(
  requestId: number,
  source: string,
  overrides: Partial<Pick<QuickJsRequestV1, "argv" | "stdin" | "files">> = {},
): QuickJsRequestV1 {
  return {
    revision: 1,
    kind: "quickjs_execute",
    requestId,
    buildIdentity: buildIdentityV1,
    source,
    argv: overrides.argv ?? [],
    stdin: overrides.stdin ?? "",
    files: overrides.files ?? [],
  };
}

async function openSandboxOriginV1(page: Page, url = sandboxUrlV1): Promise<Frame> {
  await page.goto(url);
  const frame = page.mainFrame();
  expect(frame.url()).toBe(url);
  return frame;
}

async function executeInFreshWorkerV1(
  frame: Frame,
  request: QuickJsRequestV1,
  timeoutMilliseconds = 10_000,
): Promise<QuickJsResponseV1> {
  return await frame.evaluate(
    ({ payload, deadlineMs, workerPath }) =>
      new Promise<QuickJsResponseV1>((resolve, reject) => {
        const worker = new Worker(new URL(workerPath, location.href), {
          type: "module",
          name: `sillyos-workspace-qjs-${String(payload.requestId)}`,
        });
        const timer = setTimeout(() => {
          worker.terminate();
          reject(new Error("Workspace qjs Worker timed out"));
        }, deadlineMs);
        worker.addEventListener("message", (event: MessageEvent<QuickJsResponseV1>) => {
          clearTimeout(timer);
          worker.terminate();
          resolve(event.data);
        }, { once: true });
        worker.addEventListener("error", (event) => {
          clearTimeout(timer);
          worker.terminate();
          reject(new Error(`Workspace qjs Worker error: ${event.message}`));
        }, { once: true });
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        worker.postMessage(payload);
      }),
    { payload: request, deadlineMs: timeoutMilliseconds, workerPath: workerPathV1 },
  );
}

async function hardTerminateWorkerV1(
  frame: Frame,
  request: QuickJsRequestV1,
): Promise<Readonly<{ messagesBeforeTermination: number; messagesAfterTermination: number }>> {
  return await frame.evaluate(
    async ({ payload, workerPath }) => {
      const worker = new Worker(new URL(workerPath, location.href), {
        type: "module",
        name: "sillyos-workspace-qjs-hard-terminate",
      });
      let messages = 0;
      worker.addEventListener("message", () => messages += 1);
      // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
      worker.postMessage(payload);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const messagesBeforeTermination = messages;
      worker.terminate();
      await new Promise((resolve) => setTimeout(resolve, 250));
      return { messagesBeforeTermination, messagesAfterTermination: messages };
    },
    { payload: request, workerPath: workerPathV1 },
  );
}

async function startPageLoopObservationV1(frame: Frame): Promise<void> {
  await frame.evaluate(() => {
    const state = {
      active: true,
      previousAnimationFrame: null as number | null,
      animationFrameIntervals: [] as number[],
      timerDelays: [] as number[],
      longTasks: [] as number[],
      longTaskSupported: PerformanceObserver.supportedEntryTypes?.includes("longtask") ?? false,
      observer: null as PerformanceObserver | null,
    };
    const sampleAnimationFrame = (timestamp: number): void => {
      if (!state.active) return;
      if (state.previousAnimationFrame !== null) {
        state.animationFrameIntervals.push(timestamp - state.previousAnimationFrame);
      }
      state.previousAnimationFrame = timestamp;
      requestAnimationFrame(sampleAnimationFrame);
    };
    const sampleTimer = (): void => {
      if (!state.active) return;
      const due = performance.now() + 16;
      setTimeout(() => {
        state.timerDelays.push(Math.max(0, performance.now() - due));
        sampleTimer();
      }, 16);
    };
    if (state.longTaskSupported) {
      state.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) state.longTasks.push(entry.duration);
      });
      state.observer.observe({ entryTypes: ["longtask"] });
    }
    Reflect.set(globalThis, "__sillyosQuickJsPageLoopV1", state);
    requestAnimationFrame(sampleAnimationFrame);
    sampleTimer();
  });
}

interface SampleSummaryV1 {
  readonly count: number;
  readonly median: number | null;
  readonly maximum: number | null;
}

interface PageLoopObservationV1 {
  readonly animationFrameIntervals: SampleSummaryV1;
  readonly timerDelays: SampleSummaryV1;
  readonly longTaskSupported: boolean;
  readonly longTasks: SampleSummaryV1;
}

async function stopPageLoopObservationV1(frame: Frame): Promise<PageLoopObservationV1> {
  return await frame.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const state = Reflect.get(globalThis, "__sillyosQuickJsPageLoopV1") as {
      active: boolean;
      animationFrameIntervals: number[];
      timerDelays: number[];
      longTasks: number[];
      longTaskSupported: boolean;
      observer: PerformanceObserver | null;
    } | undefined;
    if (state === undefined) throw new Error("QuickJS page-loop observation unavailable");
    state.active = false;
    state.observer?.disconnect();
    const summarize = (samples: readonly number[]): SampleSummaryV1 => {
      if (samples.length === 0) return { count: 0, median: null, maximum: null };
      const sorted = [...samples].sort((left, right) => left - right);
      return {
        count: sorted.length,
        median: sorted[Math.floor(sorted.length / 2)] ?? null,
        maximum: sorted.at(-1) ?? null,
      };
    };
    return {
      animationFrameIntervals: summarize(state.animationFrameIntervals),
      timerDelays: summarize(state.timerDelays),
      longTaskSupported: state.longTaskSupported,
      longTasks: summarize(state.longTasks),
    };
  });
}

test(
  "@quickjs-q1 the independent Sandbox CSP admits only the fixed product Wasm runtime",
  async ({ page }) => {
    let contentSecurityPolicy = "";
    page.on("response", async (response) => {
      if (response.url() === sandboxUrlV1) {
        contentSecurityPolicy = (await response.allHeaders())["content-security-policy"] ?? "";
      }
    });
    const frame = await openSandboxOriginV1(page);
    expect(contentSecurityPolicy).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(contentSecurityPolicy).not.toMatch(/(?:^|[ ;])'unsafe-eval'(?=[ ;]|$)/u);
    expect(contentSecurityPolicy).toContain("connect-src 'none'");

    await expect(executeInFreshWorkerV1(frame, requestV1(90, "1 + 1"))).resolves
      .toMatchObject({
        revision: 1,
        kind: "quickjs_result",
        requestId: 90,
        buildIdentity: buildIdentityV1,
        ok: true,
        response: { changes: [], stdout: "" },
      });
  },
);

test(
  "@quickjs-q1 the fixed Sandbox Worker executes a bounded guest and recovers after limits and termination",
  async ({ page }, testInfo) => {
    const sandboxResponses: string[] = [];
    let forbiddenOutboundRequests = 0;
    page.on("response", async (response) => {
      if (response.url() === sandboxUrlV1) {
        sandboxResponses.push((await response.allHeaders())["content-security-policy"] ?? "");
      }
    });
    page.on("request", (request) => {
      if (request.url().startsWith("https://quickjs-q1.invalid/")) {
        forbiddenOutboundRequests += 1;
      }
    });
    const frame = await openSandboxOriginV1(page);
    expect(new URL(frame.url()).origin).toBe(new URL(sandboxUrlV1).origin);
    expect(sandboxResponses).toHaveLength(1);
    expect(sandboxResponses[0]).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(sandboxResponses[0]).not.toMatch(/(?:^|[ ;])'unsafe-eval'(?=[ ;]|$)/u);
    expect(sandboxResponses[0]).toContain("connect-src 'none'");
    await startPageLoopObservationV1(frame);

    const success = await executeInFreshWorkerV1(
      frame,
      requestV1(
        1,
        `
const forbidden = [
  "fetch", "navigator", "indexedDB", "Worker", "postMessage", "WebAssembly",
  "document", "window", "self", "process", "require", "Deno", "Bun",
];
for (const name of forbidden) {
  if (typeof globalThis[name] !== "undefined") throw new Error("ambient host global: " + name);
}
const reconstructedGlobal = globalThis.constructor.constructor("return globalThis")();
if (typeof reconstructedGlobal.indexedDB !== "undefined" || typeof reconstructedGlobal.fetch !== "undefined") {
  throw new Error("Function constructor escaped the QuickJS realm");
}
workspace.writeFile("source.txt", workspace.readFile("source.txt").toUpperCase() + ":" + argv[0]);
workspace.writeFile("created.txt", stdin);
print(workspace.listFiles().join(","));
`,
        {
          argv: ["ARG"],
          stdin: "from stdin",
          files: [
            { path: "/workspace/source.txt", text: "hello" },
            { path: "/workspace/unchanged.txt", text: "same" },
          ],
        },
      ),
    );
    expect(success, JSON.stringify(success)).toMatchObject({
      revision: 1,
      kind: "quickjs_result",
      requestId: 1,
      buildIdentity: buildIdentityV1,
      ok: true,
      response: {
        changes: [
          {
            path: "/workspace/created.txt",
            kind: "created",
            before: null,
            after: "from stdin",
          },
          {
            path: "/workspace/source.txt",
            kind: "updated",
            before: "hello",
            after: "HELLO:ARG",
          },
        ],
        stdout: "/workspace/created.txt,/workspace/source.txt,/workspace/unchanged.txt\n",
        runtimeAllocatorLimitBytes: 12 * 1_024 * 1_024,
        wasmLinearMemoryBytes: 16 * 1_024 * 1_024,
        stackLimitBytes: 512 * 1_024,
      },
    });
    expect(success.response?.moduleStartupMilliseconds).toBeGreaterThanOrEqual(0);
    expect(success.response?.executionMilliseconds).toBeGreaterThanOrEqual(0);

    const staticImport = await executeInFreshWorkerV1(
      frame,
      requestV1(6, 'import value from "https://quickjs-q1.invalid/module.js";'),
    );
    expect(staticImport).toEqual({
      revision: 1,
      kind: "quickjs_result",
      requestId: 6,
      buildIdentity: buildIdentityV1,
      ok: false,
      code: "execution_failed",
      diagnostic: {
        kind: "SyntaxError",
        message: "expecting '('",
        line: 1,
        column: 8,
      },
      wasmLinearMemoryBytes: 16 * 1_024 * 1_024,
    });

    const networkAttempt = await executeInFreshWorkerV1(
      frame,
      requestV1(7, 'fetch("https://quickjs-q1.invalid/network-marker");'),
    );
    expect(networkAttempt).toEqual({
      revision: 1,
      kind: "quickjs_result",
      requestId: 7,
      buildIdentity: buildIdentityV1,
      ok: false,
      code: "execution_failed",
      diagnostic: {
        kind: "ReferenceError",
        message: "'fetch' is not defined",
        line: 1,
        column: 1,
      },
      wasmLinearMemoryBytes: 16 * 1_024 * 1_024,
    });
    expect(forbiddenOutboundRequests).toBe(0);

    const asynchronous = await executeInFreshWorkerV1(
      frame,
      requestV1(
        8,
        'Promise.resolve().then(() => workspace.writeFile("late.txt", "late"));',
      ),
    );
    expect(asynchronous).toEqual({
      revision: 1,
      kind: "quickjs_result",
      requestId: 8,
      buildIdentity: buildIdentityV1,
      ok: false,
      code: "async_unsupported",
      diagnostic: null,
      wasmLinearMemoryBytes: 16 * 1_024 * 1_024,
    });

    const asynchronousSnapshot = await executeInFreshWorkerV1(
      frame,
      requestV1(
        9,
        `
const originalFrom = Array.from;
Array.from = (...values) => {
  Promise.resolve().then(() => workspace.writeFile("late.txt", "late"));
  return originalFrom(...values);
};
`,
      ),
    );
    expect(asynchronousSnapshot).toEqual({
      revision: 1,
      kind: "quickjs_result",
      requestId: 9,
      buildIdentity: buildIdentityV1,
      ok: false,
      code: "async_unsupported",
      diagnostic: null,
      wasmLinearMemoryBytes: 16 * 1_024 * 1_024,
    });

    const deadline = await executeInFreshWorkerV1(
      frame,
      requestV1(2, "while (true) {}"),
      6_000,
    );
    expect(deadline).toEqual({
      revision: 1,
      kind: "quickjs_result",
      requestId: 2,
      buildIdentity: buildIdentityV1,
      ok: false,
      code: "deadline_exceeded",
      diagnostic: null,
      wasmLinearMemoryBytes: 16 * 1_024 * 1_024,
    });

    const memory = await executeInFreshWorkerV1(
      frame,
      requestV1(
        3,
        `
const blocks = [];
for (let index = 0; index < 64; index += 1) {
  blocks.push("x".repeat(1024 * 1024) + String(index));
}
print(blocks.length);
`,
      ),
      6_000,
    );
    expect(memory).toEqual({
      revision: 1,
      kind: "quickjs_result",
      requestId: 3,
      buildIdentity: buildIdentityV1,
      ok: false,
      code: "memory_limit",
      diagnostic: null,
      wasmLinearMemoryBytes: 16 * 1_024 * 1_024,
    });

    const terminated = await hardTerminateWorkerV1(
      frame,
      requestV1(4, "while (true) {}"),
    );
    expect(terminated).toEqual({ messagesBeforeTermination: 0, messagesAfterTermination: 0 });

    const recovery = await executeInFreshWorkerV1(
      frame,
      requestV1(5, 'workspace.writeFile("recovered.txt", "yes");'),
    );
    expect(recovery).toMatchObject({
      requestId: 5,
      ok: true,
      response: {
        changes: [{
          path: "/workspace/recovered.txt",
          kind: "created",
          before: null,
          after: "yes",
        }],
      },
    });
    const pageLoop = await stopPageLoopObservationV1(frame);
    expect(pageLoop.animationFrameIntervals.count).toBeGreaterThan(0);
    expect(pageLoop.timerDelays.count).toBeGreaterThan(0);
    const rawObservation = {
      moduleStartupMilliseconds: success.response?.moduleStartupMilliseconds ?? null,
      executionMilliseconds: success.response?.executionMilliseconds ?? null,
      pageLoop,
    };
    await testInfo.attach("quickjs-q1-raw-observation", {
      body: JSON.stringify(rawObservation, null, 2),
      contentType: "application/json",
    });
    console.log(`SILLYOS_QUICKJS_Q1_V1 ${JSON.stringify(rawObservation)}`);
  },
);
