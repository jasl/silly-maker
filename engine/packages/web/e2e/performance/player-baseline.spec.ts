// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

import type { CDPSession, Locator, Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "../engine/fixtures.ts";

declare const Deno: {
  readonly build: { readonly os: string; readonly arch: string };
  readonly version: {
    readonly deno: string;
    readonly v8: string;
    readonly typescript: string;
  };
};

interface HeapProfileNodeV1 {
  readonly selfSize: number;
  readonly children?: readonly HeapProfileNodeV1[];
}

interface LongTaskSummaryV1 {
  readonly supported: boolean;
  readonly count: number;
  readonly totalMs: number;
  readonly maxMs: number;
}

const execFile = promisify(execFileCallback);
const cpuThrottlingRateV1 = 4;
const samplingIntervalBytesV1 = 32_768;

async function repositoryStateV1(): Promise<Readonly<{ head: string; dirty: boolean }>> {
  const [head, status] = await Promise.all([
    execFile("git", ["rev-parse", "HEAD"]),
    execFile("git", ["status", "--porcelain=v1", "--untracked-files=normal"]),
  ]);
  return Object.freeze({
    head: head.stdout.trim(),
    dirty: status.stdout.trim().length > 0,
  });
}

async function measureVisibleV1(action: () => Promise<void>, target: Locator): Promise<number> {
  const startedAt = performance.now();
  await action();
  await expect(target).toBeVisible();
  return performance.now() - startedAt;
}

async function measureAttributeV1(
  action: () => Promise<void>,
  target: Locator,
  name: string,
  value: string,
): Promise<number> {
  const startedAt = performance.now();
  await action();
  await expect(target).toHaveAttribute(name, value);
  return performance.now() - startedAt;
}

async function retainedHeapV1(session: CDPSession): Promise<number> {
  await session.send("HeapProfiler.collectGarbage");
  const usage = await session.send("Runtime.getHeapUsage") as { readonly usedSize: number };
  return usage.usedSize;
}

function sampledBytesV1(node: HeapProfileNodeV1): number {
  return node.selfSize + (node.children ?? []).reduce(
    (total, child) => total + sampledBytesV1(child),
    0,
  );
}

async function startAllocationSamplingV1(session: CDPSession): Promise<void> {
  await session.send("HeapProfiler.startSampling", {
    samplingInterval: samplingIntervalBytesV1,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
}

async function stopAllocationSamplingV1(session: CDPSession): Promise<number> {
  const result = await session.send("HeapProfiler.stopSampling") as {
    readonly profile: { readonly head: HeapProfileNodeV1 };
  };
  return sampledBytesV1(result.profile.head);
}

async function readLongTasksV1(page: Page): Promise<LongTaskSummaryV1> {
  return await page.evaluate(() => {
    const state = globalThis as typeof globalThis & {
      sillymakerLongTasksV1?: {
        readonly supported: boolean;
        readonly durations: number[];
      };
    };
    const current = state.sillymakerLongTasksV1;
    if (current === undefined || !current.supported) {
      return { supported: false, count: 0, totalMs: 0, maxMs: 0 };
    }
    return {
      supported: true,
      count: current.durations.length,
      totalMs: current.durations.reduce((total, duration) => total + duration, 0),
      maxMs: current.durations.reduce((maximum, duration) => Math.max(maximum, duration), 0),
    };
  });
}

async function collectNarrativeTimingsV1(page: Page): Promise<Readonly<Record<string, number>>> {
  const start = page.getByRole("button", { name: "开始校准" });
  const say = page.locator("[data-lab-interaction='say']");
  const semanticToVisibleReadyMs = await measureVisibleV1(() => start.click(), say);

  const auto = page.getByRole("button", { name: "自动" });
  const autoToggleMs = await measureAttributeV1(() => auto.click(), auto, "aria-pressed", "true");
  await auto.click();
  await expect(auto).toHaveAttribute("aria-pressed", "false");

  await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
  const betaLine = page.getByText("样本读数稳定，可以开始校准。");
  const sayMs = await measureVisibleV1(
    () => page.getByRole("button", { name: "继续" }).click(),
    betaLine,
  );

  const historyButton = page.locator("[data-lab-player='history']");
  const history = page.locator("[data-lab-player='history-panel']");
  const historyOpenMs = await measureVisibleV1(() => historyButton.click(), history);
  await page.locator("[data-lab-player='history-close']").click();
  await expect(history).toHaveCount(0);

  await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
  const choice = page.locator("[data-lab-interaction='choice']");
  const choiceMs = await measureVisibleV1(
    () => page.getByRole("button", { name: "继续" }).click(),
    choice,
  );
  return Object.freeze({
    semanticToVisibleReadyMs,
    sayMs,
    choiceMs,
    autoToggleMs,
    historyOpenMs,
  });
}

async function collectSkipRoundTripV1(page: Page): Promise<number> {
  await gotoLabV1(page);
  await page.getByRole("button", { name: "开始校准" }).click();
  await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();
  const skip = page.getByRole("button", { name: "跳过模式" });
  const startedAt = performance.now();
  await skip.click();
  await expect(skip).toHaveAttribute("aria-pressed", "false");
  return performance.now() - startedAt;
}

function wholeCanvasSurfaceV1(page: Page, definitionId: string, targetId: string): Locator {
  return page.locator(
    `[data-managed-surface-definition="${definitionId}"]` +
      `[data-managed-surface-target="${targetId}"]`,
  );
}

async function collectWholeCanvasTimingsV1(
  page: Page,
  session: CDPSession,
): Promise<
  Readonly<
    { readonly timings: Readonly<Record<string, number>>; readonly allocationSampleBytes: number }
  >
> {
  const initialStartedAt = performance.now();
  await gotoLabV1(page, "?whole_canvas_conformance=1");
  const home = wholeCanvasSurfaceV1(
    page,
    "surface.whole-canvas.primary",
    "lab.whole-canvas.home",
  );
  await expect(home).toBeVisible();
  const initialMs = performance.now() - initialStartedAt;

  await startAllocationSamplingV1(session);
  const status = wholeCanvasSurfaceV1(
    page,
    "surface.whole-canvas.primary",
    "lab.whole-canvas.status",
  );
  const replacementMs = await measureVisibleV1(
    () => page.locator('[data-lab-whole-canvas-launcher="status"]').click(),
    status,
  );

  await page.locator('[data-lab-whole-canvas-launcher="specimen-catalog"]').click();
  const catalog = wholeCanvasSurfaceV1(
    page,
    "surface.whole-canvas.primary",
    "lab.whole-canvas.specimen-catalog",
  );
  await expect(catalog).toBeVisible();
  const detail = wholeCanvasSurfaceV1(
    page,
    "surface.whole-canvas.detail",
    "lab.whole-canvas.specimen-detail",
  );
  const detailMs = await measureVisibleV1(
    () =>
      catalog.locator(
        '[data-managed-surface-action="lab.whole-canvas.open-specimen-detail"]',
      ).click(),
    detail,
  );
  const allocationSampleBytes = await stopAllocationSamplingV1(session);
  return Object.freeze({
    timings: Object.freeze({ initialMs, replacementMs, detailMs }),
    allocationSampleBytes,
  });
}

function requireFiniteMeasurementsV1(value: unknown, path = "report"): void {
  if (typeof value === "number") {
    expect(Number.isFinite(value), path).toBe(true);
    expect(value, path).toBeGreaterThanOrEqual(0);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    requireFiniteMeasurementsV1(child, `${path}.${key}`);
  }
}

test.describe("Player performance trend baseline", () => {
  test(
    "records one fresh-context Narrative, WholeCanvas, heap, allocation, and long-task sample",
    async ({
      browser,
      page,
    }, testInfo) => {
      await page.addInitScript(() => {
        const state = globalThis as typeof globalThis & {
          sillymakerLongTasksV1?: {
            readonly supported: boolean;
            readonly durations: number[];
            readonly observer?: PerformanceObserver;
          };
        };
        const supported = PerformanceObserver.supportedEntryTypes.includes("longtask");
        const durations: number[] = [];
        if (!supported) {
          state.sillymakerLongTasksV1 = { supported, durations };
          return;
        }
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) durations.push(entry.duration);
        });
        observer.observe({ type: "longtask", buffered: true });
        state.sillymakerLongTasksV1 = { supported, durations, observer };
      });
      const session = await page.context().newCDPSession(page);
      await session.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottlingRateV1 });
      const coldStartStartedAt = performance.now();
      await gotoLabV1(page);
      const coldStartMs = performance.now() - coldStartStartedAt;
      const retainedHeapBeforeBytes = await retainedHeapV1(session);
      const narrativeCore = await collectNarrativeTimingsV1(page);
      const coldAndNarrativeLongTasks = await readLongTasksV1(page);
      const skipRoundTripMs = await collectSkipRoundTripV1(page);
      const skipLongTasks = await readLongTasksV1(page);
      const narrative = Object.freeze({ ...narrativeCore, skipRoundTripMs });
      const wholeCanvasRun = await collectWholeCanvasTimingsV1(page, session);
      const wholeCanvasLongTasks = await readLongTasksV1(page);
      const wholeCanvas = wholeCanvasRun.timings;
      const transitionAllocationSampleBytes = wholeCanvasRun.allocationSampleBytes;
      const retainedHeapAfterBytes = await retainedHeapV1(session);
      const report = Object.freeze({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        repository: await repositoryStateV1(),
        environment: Object.freeze({
          deno: Deno.version.deno,
          v8: Deno.version.v8,
          typescript: Deno.version.typescript,
          os: Deno.build.os,
          arch: Deno.build.arch,
          browser: browser.browserType().name(),
          browserVersion: browser.version(),
          cpuThrottlingRate: cpuThrottlingRateV1,
          allocationSamplingIntervalBytes: samplingIntervalBytesV1,
        }),
        sampleIndex: testInfo.repeatEachIndex,
        coldStartMs,
        narrative,
        wholeCanvas,
        mainThread: Object.freeze({
          coldAndNarrative: coldAndNarrativeLongTasks,
          skip: skipLongTasks,
          wholeCanvas: wholeCanvasLongTasks,
        }),
        memory: Object.freeze({
          retainedHeapBeforeBytes,
          retainedHeapAfterBytes,
          retainedHeapDeltaBytes: retainedHeapAfterBytes - retainedHeapBeforeBytes,
          transitionAllocationSampleBytes,
        }),
        interpretation: Object.freeze({
          status: "trend_only",
          machineBoundHardGate: false,
          chromiumRuntimeSpecific: true,
        }),
      });
      requireFiniteMeasurementsV1({
        coldStartMs: report.coldStartMs,
        narrative: report.narrative,
        wholeCanvas: report.wholeCanvas,
        mainThread: report.mainThread,
        retainedHeapBeforeBytes,
        retainedHeapAfterBytes,
        transitionAllocationSampleBytes,
      });
      expect(typeof report.memory.retainedHeapDeltaBytes).toBe("number");
      const path = testInfo.outputPath("baseline.json");
      const body = `${JSON.stringify(report, null, 2)}\n`;
      await writeFile(path, body, "utf8");
      await testInfo.attach("player-performance-baseline", {
        body,
        contentType: "application/json",
      });
    },
  );
});
