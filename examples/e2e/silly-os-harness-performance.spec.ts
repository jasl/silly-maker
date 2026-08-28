// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type { Frame, Page, Request, TestInfo } from "@playwright/test";
import { fileURLToPath } from "node:url";

import { expect, sillyOsTargetUrlV1, sillyOsWorkspaceSandboxTargetV1, test } from "./fixtures.ts";

const sampleCountV1 = 7;
const workerPathV1 = fileURLToPath(
  new URL("./silly-os-harness-performance.worker.ts", import.meta.url),
);

interface NumericSummaryV1 {
  readonly count: number;
  readonly minimum: number;
  readonly median: number;
  readonly maximum: number;
}

interface ResourceTimingV1 {
  readonly name: string;
  readonly durationMilliseconds: number;
  readonly transferBytes: number;
  readonly encodedBytes: number;
  readonly decodedBytes: number;
}

interface HarnessWorkerReceiptV1 {
  readonly fixture: {
    readonly path: string;
    readonly bytes: number;
    readonly lines: number;
    readonly matches: number;
    readonly writeMilliseconds: number;
  };
  readonly samples: {
    readonly coldBashTrueMilliseconds: number;
    readonly warmBashTrueMilliseconds: readonly number[];
    readonly rgMilliseconds: readonly number[];
    readonly structuredGrepMilliseconds: readonly number[];
    readonly cancellationMilliseconds: number;
    readonly recoveryBashTrueMilliseconds: number;
  };
  readonly currentGeneration: number;
  readonly mutations: readonly {
    readonly tool: string;
    readonly outcome: string;
    readonly effect: string;
  }[];
  readonly resources: readonly ResourceTimingV1[];
}

interface HarnessPageReceiptV1 {
  readonly sandboxVolumeId: string;
  readonly host: {
    readonly moduleImportMilliseconds: number;
    readonly createAndOpenMilliseconds: number;
    readonly attachEnvironmentMilliseconds: number;
    readonly harnessWorkerStartupMilliseconds: number;
  };
  readonly worker: HarnessWorkerReceiptV1;
  readonly responsiveness: {
    readonly rafDeltaMilliseconds: readonly number[];
    readonly timerDelayMilliseconds: readonly number[];
    readonly longTaskMilliseconds: readonly number[];
    readonly longTaskObserverAvailable: boolean;
  };
  readonly memoryObservation: {
    readonly userAgentSpecificMemoryApiAvailable: boolean;
    readonly pageJsHeapBytesBefore: number | null;
    readonly pageJsHeapBytesAfter: number | null;
  };
}

interface NetworkResourceTimingV1 {
  readonly url: string;
  readonly resourceType: string;
  readonly startTimeMilliseconds: number;
  readonly responseEndMilliseconds: number;
}

function summaryV1(values: readonly number[]): NumericSummaryV1 {
  if (values.length === 0) return { count: 0, minimum: 0, median: 0, maximum: 0 };
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle] ?? 0;
  return {
    count: sorted.length,
    minimum: sorted[0] ?? 0,
    median,
    maximum: sorted.at(-1) ?? 0,
  };
}

function expectFiniteSamplesV1(values: readonly number[]): void {
  expect(values.length).toBeGreaterThan(0);
  expect(values.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
}

function sandboxOriginV1(): string {
  return `http://${sillyOsWorkspaceSandboxTargetV1.host}:${
    String(sillyOsWorkspaceSandboxTargetV1.port)
  }`;
}

async function currentSandboxFrameV1(page: Page, volumeId: string): Promise<Frame> {
  const expectedOrigin = sandboxOriginV1();
  await expect.poll(() =>
    page.frames().filter((frame) => {
      if (!URL.canParse(frame.url())) return false;
      const url = new URL(frame.url());
      return url.origin === expectedOrigin && url.pathname === "/workspace-sandbox.html";
    }).length
  ).toBeGreaterThan(0);
  const frames = page.frames().filter((candidate) => {
    if (!URL.canParse(candidate.url())) return false;
    const url = new URL(candidate.url());
    return url.origin === expectedOrigin && url.pathname === "/workspace-sandbox.html";
  });
  for (const frame of frames) {
    const ownsVolume = await frame.evaluate(async (candidateVolumeId) => {
      try {
        let directory = await navigator.storage.getDirectory();
        for (const name of [".sillyos-workspace-host-v1", "volumes", candidateVolumeId]) {
          directory = await directory.getDirectoryHandle(name);
        }
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") return false;
        throw error;
      }
    }, volumeId);
    if (ownsVolume) return frame;
  }
  throw new Error("Workspace Sandbox volume frame is unavailable");
}

async function characterizeHarnessV1(page: Page): Promise<HarnessPageReceiptV1> {
  return await page.evaluate(async ({ workerPath, sampleCount }) => {
    interface HostSnapshotV1 {
      readonly checkpointId: string;
      readonly descriptor: {
        readonly revision: 1;
        readonly programId: string;
        readonly workspaceId: string;
        readonly workspaceSessionId: string;
        readonly generation: number;
      };
    }
    interface HostPortV1 {
      withBootstrapLease<T>(input: {
        readonly programId: string;
        readonly workspaceId: string;
        readonly operation: () => Promise<T>;
      }): Promise<T>;
      createCandidate(input: {
        readonly programId: string;
        readonly workspaceId: string;
      }): Promise<{ readonly anchor: { readonly volumeId: string } }>;
      openWorkspace(anchor: { readonly volumeId: string }): Promise<HostSnapshotV1>;
      attachEnvironment(input: { readonly workspaceSessionId: string }): Promise<{
        readonly snapshot: HostSnapshotV1;
        readonly environmentPort: MessagePort;
      }>;
      closeWorkspace(workspaceSessionId: string): Promise<unknown>;
      dispose(): void;
    }
    interface PerformanceMemoryV1 {
      readonly usedJSHeapSize?: number;
    }

    const readPageHeapV1 = (): number | null => {
      const memory = Reflect.get(performance, "memory") as PerformanceMemoryV1 | undefined;
      return typeof memory?.usedJSHeapSize === "number" ? memory.usedJSHeapSize : null;
    };
    const memoryBefore = readPageHeapV1();
    const rafDeltas: number[] = [];
    const timerDelays: number[] = [];
    const longTasks: number[] = [];
    let priorFrame: number | null = null;
    let priorTimer = performance.now();
    let rafId = 0;
    const observeFrame = (now: number): void => {
      if (priorFrame !== null) rafDeltas.push(Math.max(0, now - priorFrame));
      priorFrame = now;
      rafId = requestAnimationFrame(observeFrame);
    };
    rafId = requestAnimationFrame(observeFrame);
    const timerId = setInterval(() => {
      const now = performance.now();
      timerDelays.push(Math.max(0, now - priorTimer - 16));
      priorTimer = now;
    }, 16);
    let longTaskObserver: PerformanceObserver | null = null;
    try {
      longTaskObserver = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) longTasks.push(entry.duration);
      });
      longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch {
      longTaskObserver = null;
    }

    const importStartedAt = performance.now();
    const importProductModuleV1 = async (path: string): Promise<Record<string, unknown>> =>
      await import(/* @vite-ignore */ new URL(path, location.href).href) as Record<string, unknown>;
    const [transportModule, hostModule] = await Promise.all([
      importProductModuleV1("/src/workspace/browser-workspace-sandbox-frame-transport.ts"),
      importProductModuleV1("/src/workspace/browser-workspace-host-port.ts"),
    ]);
    const moduleImportMilliseconds = performance.now() - importStartedAt;
    const createTransport = Reflect.get(
      transportModule,
      "createBrowserWorkspaceSandboxFrameTransportV1",
    );
    const createHost = Reflect.get(hostModule, "createBrowserWorkspaceHostPagePortV1");
    if (typeof createTransport !== "function" || typeof createHost !== "function") {
      throw new TypeError("sillyos.harness_perf.host_module_unavailable");
    }
    const host = createHost({
      transport: createTransport({
        createNonce: () => `sandbox.bootstrap.${crypto.randomUUID()}`,
        bootstrapTimeoutMilliseconds: 20_000,
      }),
    }) as HostPortV1;
    const programId = `program.harness-perf.${crypto.randomUUID()}`;
    const workspaceId = `workspace.harness-perf.${crypto.randomUUID()}`;
    let workspaceSessionId: string | null = null;
    let retained = false;
    try {
      const createStartedAt = performance.now();
      const created = await host.withBootstrapLease({
        programId,
        workspaceId,
        operation: async () => {
          const candidate = await host.createCandidate({ programId, workspaceId });
          return {
            opened: await host.openWorkspace(candidate.anchor),
            volumeId: candidate.anchor.volumeId,
          };
        },
      });
      const { opened, volumeId: sandboxVolumeId } = created;
      const createAndOpenMilliseconds = performance.now() - createStartedAt;
      workspaceSessionId = opened.descriptor.workspaceSessionId;

      const attachStartedAt = performance.now();
      const attached = await host.attachEnvironment({ workspaceSessionId });
      const attachEnvironmentMilliseconds = performance.now() - attachStartedAt;

      const workerUrl = new URL(`/@fs/${workerPath}`, location.href);
      const workerStartedAt = performance.now();
      const worker = new Worker(workerUrl, {
        type: "module",
        name: "sillyos-harness-performance-v1",
      });
      let workerReceipt: HarnessWorkerReceiptV1;
      try {
        const ready = await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Harness Agent Worker timed out")),
            30_000,
          );
          worker.addEventListener("message", (event) => {
            const value = event.data as { readonly revision?: unknown; readonly kind?: unknown };
            if (value.revision !== 1 || value.kind !== "ready") return;
            clearTimeout(timeout);
            resolve();
          }, { once: true });
          worker.addEventListener("error", (event) => {
            clearTimeout(timeout);
            event.preventDefault();
            reject(new Error("Harness Agent Worker failed during startup"));
          }, { once: true });
        });
        void ready;
        const harnessWorkerStartupMilliseconds = performance.now() - workerStartedAt;
        workerReceipt = await new Promise<HarnessWorkerReceiptV1>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Harness execution timed out")),
            120_000,
          );
          worker.addEventListener("message", (event) => {
            const value = event.data as {
              readonly revision?: unknown;
              readonly kind?: unknown;
              readonly receipt?: HarnessWorkerReceiptV1;
              readonly message?: unknown;
            };
            if (value.revision !== 1) return;
            if (value.kind === "completed" && value.receipt !== undefined) {
              clearTimeout(timeout);
              resolve(value.receipt);
            } else if (value.kind === "failed") {
              clearTimeout(timeout);
              reject(
                new Error(typeof value.message === "string" ? value.message : "Harness failed"),
              );
            }
          });
          worker.addEventListener("error", (event) => {
            clearTimeout(timeout);
            event.preventDefault();
            reject(new Error("Harness Agent Worker failed during execution"));
          }, { once: true });
          worker.postMessage({
            revision: 1,
            kind: "run",
            descriptor: attached.snapshot.descriptor,
            sampleCount,
          }, [attached.environmentPort]);
        });

        cancelAnimationFrame(rafId);
        clearInterval(timerId);
        longTaskObserver?.disconnect();
        const owner = globalThis as typeof globalThis & {
          sillyOsHarnessPerfOwnerV1?: {
            readonly host: HostPortV1;
            readonly workspaceSessionId: string;
            readonly worker: Worker;
          };
        };
        if (owner.sillyOsHarnessPerfOwnerV1 !== undefined) {
          throw new Error("Harness performance owner already exists");
        }
        owner.sillyOsHarnessPerfOwnerV1 = { host, workspaceSessionId, worker };
        retained = true;
        return {
          sandboxVolumeId,
          host: {
            moduleImportMilliseconds,
            createAndOpenMilliseconds,
            attachEnvironmentMilliseconds,
            harnessWorkerStartupMilliseconds,
          },
          worker: workerReceipt,
          responsiveness: {
            rafDeltaMilliseconds: rafDeltas,
            timerDelayMilliseconds: timerDelays,
            longTaskMilliseconds: longTasks,
            longTaskObserverAvailable: longTaskObserver !== null,
          },
          memoryObservation: {
            userAgentSpecificMemoryApiAvailable:
              typeof Reflect.get(performance, "measureUserAgentSpecificMemory") === "function",
            pageJsHeapBytesBefore: memoryBefore,
            pageJsHeapBytesAfter: readPageHeapV1(),
          },
        };
      } catch (error) {
        worker.terminate();
        throw error;
      }
    } finally {
      if (!retained) {
        cancelAnimationFrame(rafId);
        clearInterval(timerId);
        longTaskObserver?.disconnect();
        if (workspaceSessionId !== null) {
          await host.closeWorkspace(workspaceSessionId).catch(() => undefined);
        }
        host.dispose();
      }
    }
  }, { workerPath: workerPathV1, sampleCount: sampleCountV1 });
}

async function disposeHarnessV1(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const owner = globalThis as typeof globalThis & {
      sillyOsHarnessPerfOwnerV1?: {
        readonly host: {
          closeWorkspace(workspaceSessionId: string): Promise<unknown>;
          dispose(): void;
        };
        readonly workspaceSessionId: string;
        readonly worker: Worker;
      };
    };
    const active = owner.sillyOsHarnessPerfOwnerV1;
    delete owner.sillyOsHarnessPerfOwnerV1;
    if (active === undefined) return;
    active.worker.terminate();
    try {
      await active.host.closeWorkspace(active.workspaceSessionId);
    } finally {
      active.host.dispose();
    }
  });
}

function requestTimingV1(request: Request): NetworkResourceTimingV1 {
  const timing = request.timing();
  return {
    url: request.url(),
    resourceType: request.resourceType(),
    startTimeMilliseconds: timing.startTime,
    responseEndMilliseconds: timing.responseEnd,
  };
}

async function attachReportV1(testInfo: TestInfo, report: unknown): Promise<void> {
  const json = JSON.stringify(report, null, 2);
  await testInfo.attach("silly-os-harness-performance-v1", {
    body: json,
    contentType: "application/json",
  });
  console.log(`SILLYOS_HARNESS_PERFORMANCE_V1 ${json}`);
}

test(
  "@harness-performance raw independent-Sandbox shell and control-loop characterization",
  async ({ durableProgramPage: page }, testInfo) => {
    await page.goto(sillyOsTargetUrlV1("?locale=en"));
    await expect(page.locator('[data-silly-os-view="home"]')).toBeVisible();

    const observedRequests: Request[] = [];
    const observeRequest = (request: Request): void => {
      const url = request.url();
      if (
        (url.startsWith(sillyOsTargetUrlV1()) || url.startsWith(sandboxOriginV1())) &&
        /workspace-sandbox\.html|workspace-sandbox-host\.worker|just-bash|pi-agent-core|harness-performance/iu
          .test(url)
      ) observedRequests.push(request);
    };
    page.on("request", observeRequest);

    let receipt: HarnessPageReceiptV1;
    let sandboxResources: readonly ResourceTimingV1[] = [];
    try {
      receipt = await characterizeHarnessV1(page);
      const sandboxFrame = await currentSandboxFrameV1(page, receipt.sandboxVolumeId);
      sandboxResources = await sandboxFrame.evaluate(() =>
        performance.getEntriesByType("resource")
          .filter((entry) =>
            /workspace-sandbox\.html|workspace-sandbox-host\.worker|just-bash/iu.test(entry.name)
          )
          .slice(0, 64)
          .map((entry) => {
            const resource = entry as PerformanceResourceTiming;
            return {
              name: resource.name,
              durationMilliseconds: resource.duration,
              transferBytes: resource.transferSize,
              encodedBytes: resource.encodedBodySize,
              decodedBytes: resource.decodedBodySize,
            };
          })
      );
    } finally {
      page.off("request", observeRequest);
      await disposeHarnessV1(page);
    }

    expect(receipt.worker.fixture).toMatchObject({
      path: "harness-perf-fixture.txt",
      lines: 2_048,
      matches: 128,
    });
    expect(receipt.worker.samples.warmBashTrueMilliseconds).toHaveLength(sampleCountV1);
    expect(receipt.worker.samples.rgMilliseconds).toHaveLength(sampleCountV1);
    expect(receipt.worker.samples.structuredGrepMilliseconds).toHaveLength(sampleCountV1);
    expect(receipt.worker.mutations.at(-2)).toMatchObject({
      tool: "bash",
      outcome: "cancelled",
      effect: "none",
    });
    expect(receipt.worker.mutations.at(-1)).toMatchObject({
      tool: "bash",
      outcome: "succeeded",
      effect: "none",
    });
    for (
      const values of [
        receipt.worker.samples.warmBashTrueMilliseconds,
        receipt.worker.samples.rgMilliseconds,
        receipt.worker.samples.structuredGrepMilliseconds,
        receipt.responsiveness.rafDeltaMilliseconds,
        receipt.responsiveness.timerDelayMilliseconds,
      ]
    ) expectFiniteSamplesV1(values);

    const report = {
      revision: 1,
      browser: testInfo.project.name,
      semantics: {
        measurements: "raw local development-server observations, not release gates",
        coldBash:
          "first execute_shell in a fresh Sandbox Host Worker; HTTP and Vite dependency caches are not reset",
        memory:
          "optional page-JS-heap observation only; excludes Agent Worker, Sandbox Worker, OPFS, Wasm, and browser process memory",
      },
      fixture: receipt.worker.fixture,
      host: receipt.host,
      shell: {
        raw: receipt.worker.samples,
        warmBashTrueSummary: summaryV1(receipt.worker.samples.warmBashTrueMilliseconds),
        rgSummary: summaryV1(receipt.worker.samples.rgMilliseconds),
        structuredGrepSummary: summaryV1(
          receipt.worker.samples.structuredGrepMilliseconds,
        ),
      },
      controlLoop: {
        raw: receipt.responsiveness,
        rafDeltaSummary: summaryV1(receipt.responsiveness.rafDeltaMilliseconds),
        timerDelaySummary: summaryV1(receipt.responsiveness.timerDelayMilliseconds),
        longTaskSummary: summaryV1(receipt.responsiveness.longTaskMilliseconds),
      },
      memoryObservation: receipt.memoryObservation,
      resources: {
        network: observedRequests.map(requestTimingV1),
        harnessWorker: receipt.worker.resources,
        sandboxFrame: sandboxResources,
      },
      mutationOutcomes: receipt.worker.mutations,
      currentGeneration: receipt.worker.currentGeneration,
    };
    await attachReportV1(testInfo, report);
  },
);
