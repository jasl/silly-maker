// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import { chromium } from "@playwright/test";
import type { Browser } from "@playwright/test";

import {
  ar5InterleavedRunOrderV1,
  judgeAr5LocalPromotionV1,
  parseAr5LocalPromotionOptionsV1,
  summarizeAr5PairedMetricV1,
} from "./ar5-local-promotion-helpers.ts";
import type { Ar5LocalPromotionOptionsV1, Ar5RevisionV1 } from "./ar5-local-promotion-helpers.ts";

interface LocalHttpServerV1 {
  readonly addr: { readonly port: number };
  shutdown(): Promise<void>;
}

declare const Deno: {
  readonly args: readonly string[];
  readonly build: { readonly os: string; readonly arch: string };
  readonly version: {
    readonly deno: string;
    readonly v8: string;
    readonly typescript: string;
  };
  cwd(): string;
  exitCode: number;
  makeTempDir(options?: { readonly prefix?: string }): Promise<string>;
  serve(
    options: {
      readonly hostname: string;
      readonly port: number;
      readonly onListen: () => void;
    },
    handler: (request: Request) => Response | Promise<Response>,
  ): LocalHttpServerV1;
};

interface SampleV1 {
  readonly revision: Ar5RevisionV1;
  readonly orderIndex: 0 | 1;
  readonly buildDurationMs: number;
  readonly firstActionableMs: number;
  readonly stableCommandRoundTripMs: number;
}

interface PendingPairV1 {
  readonly pairIndex: number;
  readonly order: readonly Ar5RevisionV1[];
  baseline?: SampleV1;
  candidate?: SampleV1;
}

const execFile = promisify(execFileCallback);
const usageV1 = "usage: deno task bench:ar5:promotion --baseline-root <repo> " +
  "--candidate-root <repo> [--pairs <n>=5] [--output <report.json>]";
const applicationIdV1 = "e2e";
const outputDirectoryV1 = "e2e/dist-web";
const firstActionSelectorV1 = "[data-lab-action-id]:not(:disabled)";
const stableCommandSelectorV1 = "[data-lab-action-id='lab.begin_calibration']:not(:disabled)";
const stableCommandResultSelectorV1 = "[data-lab-interaction='say']";
const browserTimeoutMsV1 = 120_000;

const contentTypesV1: Readonly<Record<string, string>> = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
});

function isInsideDirectoryV1(root: string, path: string): boolean {
  const repositoryPath = relative(root, path);
  return repositoryPath.length > 0 && repositoryPath !== ".." &&
    !repositoryPath.startsWith(`..${sep}`);
}

async function staticResponseV1(root: string, request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed", { status: 405 });
  }
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname);
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const path = resolve(root, requestedPath);
  if (!isInsideDirectoryV1(root, path)) return new Response("not found", { status: 404 });
  try {
    const pathStat = await stat(path);
    if (!pathStat.isFile()) return new Response("not found", { status: 404 });
    const bytes = request.method === "HEAD" ? null : await readFile(path);
    return new Response(bytes, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": contentTypesV1[extname(path)] ?? "application/octet-stream",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

function startStaticBuildServerV1(root: string): LocalHttpServerV1 {
  return Deno.serve(
    { hostname: "127.0.0.1", port: 0, onListen: () => undefined },
    (request) => staticResponseV1(root, request),
  );
}

async function validateRepositoryRootV1(root: string, label: Ar5RevisionV1): Promise<void> {
  try {
    const [rootStat, configStat, applicationStat] = await Promise.all([
      stat(root),
      stat(resolve(root, "deno.json")),
      stat(resolve(root, "e2e/sillymaker.config.ts")),
    ]);
    if (!rootStat.isDirectory() || !configStat.isFile() || !applicationStat.isFile()) {
      throw new TypeError("required repository paths have the wrong kind");
    }
  } catch (error) {
    throw new TypeError(`${label} root is not a buildable SillyMaker repository: ${root}`, {
      cause: error,
    });
  }
}

async function freshReleaseBuildV1(repositoryRoot: string): Promise<number> {
  const startedAt = performance.now();
  try {
    await execFile(
      "deno",
      ["task", "story", "build", applicationIdV1, "--profile", "release"],
      {
        cwd: repositoryRoot,
        env: { ...process.env },
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    return performance.now() - startedAt;
  } catch (error) {
    const detail = error as { readonly stderr?: string; readonly stdout?: string };
    throw new Error(
      `fresh Engine Lab release build failed in ${repositoryRoot}\n` +
        `${detail.stderr ?? ""}\n${detail.stdout ?? ""}`.trim(),
      { cause: error },
    );
  }
}

async function measureRevisionV1(input: {
  readonly browser: Browser;
  readonly repositoryRoot: string;
  readonly revision: Ar5RevisionV1;
  readonly orderIndex: 0 | 1;
}): Promise<SampleV1> {
  const buildDurationMs = await freshReleaseBuildV1(input.repositoryRoot);
  const outputRoot = resolve(input.repositoryRoot, outputDirectoryV1);
  const outputStat = await stat(outputRoot);
  if (!outputStat.isDirectory()) throw new Error("release build did not create e2e/dist-web");

  const server = startStaticBuildServerV1(outputRoot);
  try {
    const context = await input.browser.newContext();
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(browserTimeoutMsV1);
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      const navigationStartedAt = performance.now();
      const response = await page.goto(`http://127.0.0.1:${String(server.addr.port)}/`, {
        waitUntil: "commit",
        timeout: browserTimeoutMsV1,
      });
      if (response !== null && !response.ok()) {
        throw new Error(`release build navigation returned HTTP ${String(response.status())}`);
      }
      await page.locator(firstActionSelectorV1).first().waitFor({ state: "visible" });
      const firstActionableMs = performance.now() - navigationStartedAt;

      const stableCommand = page.locator(stableCommandSelectorV1);
      await stableCommand.waitFor({ state: "visible" });
      const commandStartedAt = performance.now();
      await stableCommand.click();
      await page.locator(stableCommandResultSelectorV1).waitFor({ state: "visible" });
      const stableCommandRoundTripMs = performance.now() - commandStartedAt;

      if (pageErrors.length > 0 || consoleErrors.length > 0) {
        throw new Error(
          `browser diagnostics were not clean: ${JSON.stringify({ pageErrors, consoleErrors })}`,
        );
      }
      return Object.freeze({
        revision: input.revision,
        orderIndex: input.orderIndex,
        buildDurationMs,
        firstActionableMs,
        stableCommandRoundTripMs,
      });
    } finally {
      await context.close();
    }
  } finally {
    await server.shutdown();
  }
}

function completePairsV1(pairs: readonly PendingPairV1[]): readonly Readonly<{
  readonly pairIndex: number;
  readonly order: readonly Ar5RevisionV1[];
  readonly baseline: SampleV1;
  readonly candidate: SampleV1;
}>[] {
  return Object.freeze(pairs.map((pair) => {
    if (pair.baseline === undefined || pair.candidate === undefined) {
      throw new Error(`pair ${String(pair.pairIndex)} is incomplete`);
    }
    return Object.freeze({
      pairIndex: pair.pairIndex,
      order: pair.order,
      baseline: pair.baseline,
      candidate: pair.candidate,
    });
  }));
}

async function outputPathV1(options: Ar5LocalPromotionOptionsV1): Promise<string> {
  if (options.output !== undefined) return options.output;
  const directory = await Deno.makeTempDir({ prefix: "sillymaker-ar5-local-promotion-" });
  return resolve(directory, "report.json");
}

async function mainV1(): Promise<void> {
  const options = parseAr5LocalPromotionOptionsV1(Deno.args, Deno.cwd());
  await Promise.all([
    validateRepositoryRootV1(options.baselineRoot, "baseline"),
    validateRepositoryRootV1(options.candidateRoot, "candidate"),
  ]);

  const pairs: PendingPairV1[] = Array.from({ length: options.pairs }, (_, index) => {
    const pairIndex = index + 1;
    return {
      pairIndex,
      order: Object.freeze(
        pairIndex % 2 === 1
          ? ["baseline", "candidate"] as const
          : ["candidate", "baseline"] as const,
      ),
    };
  });
  const browser = await chromium.launch({ headless: true });
  const browserVersion = browser.version();
  try {
    for (const slot of ar5InterleavedRunOrderV1(options.pairs)) {
      const repositoryRoot = slot.revision === "baseline"
        ? options.baselineRoot
        : options.candidateRoot;
      console.error(
        `[AR5] pair ${String(slot.pairIndex)}/${String(options.pairs)} ` +
          `${String(slot.orderIndex + 1)}/2 ${slot.revision}`,
      );
      const sample = await measureRevisionV1({
        browser,
        repositoryRoot,
        revision: slot.revision,
        orderIndex: slot.orderIndex,
      });
      const pair = pairs[slot.pairIndex - 1];
      if (pair === undefined) throw new Error("run schedule addressed an unknown pair");
      pair[slot.revision] = sample;
    }
  } finally {
    await browser.close();
  }

  const completedPairs = completePairsV1(pairs);
  const firstActionable = summarizeAr5PairedMetricV1(completedPairs.map((pair) => ({
    pairIndex: pair.pairIndex,
    baselineMs: pair.baseline.firstActionableMs,
    candidateMs: pair.candidate.firstActionableMs,
  })));
  const stableCommand = summarizeAr5PairedMetricV1(completedPairs.map((pair) => ({
    pairIndex: pair.pairIndex,
    baselineMs: pair.baseline.stableCommandRoundTripMs,
    candidateMs: pair.candidate.stableCommandRoundTripMs,
  })));
  const judgment = judgeAr5LocalPromotionV1({ firstActionable, stableCommand });
  const report = Object.freeze({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    applicationId: applicationIdV1,
    profile: "release",
    repositories: Object.freeze({
      baselineRoot: options.baselineRoot,
      candidateRoot: options.candidateRoot,
    }),
    environment: Object.freeze({
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
      browser: "chromium",
      browserVersion,
    }),
    pairCount: options.pairs,
    pairs: completedPairs,
    summary: Object.freeze({ firstActionable, stableCommand }),
    ar5Stop: judgment,
    interpretation: Object.freeze({
      status: "local_promotion_evidence",
      ordinaryCiGate: false,
      cleanTreeRequired: false,
      firstActionableStopRequiresIndependentReproduction: true,
      positiveDeltaMeansCandidateRegression: true,
    }),
  });
  const path = await outputPathV1(options);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(path);
  console.log(JSON.stringify({ summary: report.summary, ar5Stop: report.ar5Stop }, null, 2));
}

try {
  await mainV1();
} catch (error) {
  console.error(error instanceof Error ? `${error.message}\n${usageV1}` : String(error));
  Deno.exitCode = 1;
}
