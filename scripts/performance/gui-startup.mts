// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { chromium } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { build, preview } from "vite";

import { resolveWebBuildTargetV1 } from "../../engine/packages/tooling/src/project/config.ts";
import { loadWorkspaceProjectV1 } from "../../engine/packages/tooling/src/project/workspace.ts";
import { sillyMakerConfigV1 } from "../../project.config.ts";

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
};

export interface GuiStartupOptionsV1 {
  readonly applicationId: string;
  readonly samples: number;
  readonly output?: string;
}

interface GuiStartupSampleV1 {
  readonly sampleIndex: number;
  readonly guiReadyMs: number;
  readonly firstInteractiveMs: number;
}

const execFile = promisify(execFileCallback);
const repositoryRootV1 = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const optionFlagsV1 = new Set(["--application", "--samples", "--output"]);
const timeoutMsV1 = 120_000;
const interactiveSelectorV1 = [
  "button:not(:disabled)",
  'a[href]:not([aria-disabled="true"])',
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[role="button"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])',
].map((selector) => `${selector}:visible`).join(",");

function optionErrorV1(message: string): never {
  throw new TypeError(`gui startup benchmark: ${message}`);
}

export function parseGuiStartupOptionsV1(
  argv: readonly string[],
  cwd: string,
): GuiStartupOptionsV1 {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    const equals = argument.indexOf("=");
    const flag = equals < 0 ? argument : argument.slice(0, equals);
    if (!optionFlagsV1.has(flag)) optionErrorV1(`unknown argument: ${flag}`);
    if (values.has(flag)) optionErrorV1(`${flag} may only be provided once`);
    let value = equals < 0 ? undefined : argument.slice(equals + 1);
    if (value === undefined) {
      value = argv[index + 1];
      if (value !== undefined) index += 1;
    }
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      optionErrorV1(`${flag} requires a value`);
    }
    values.set(flag, value);
  }

  const applicationId = values.get("--application") ?? "e2e";
  const samplesText = values.get("--samples") ?? "3";
  if (!/^[1-9][0-9]*$/u.test(samplesText)) {
    optionErrorV1("--samples must be a positive integer");
  }
  const samples = Number(samplesText);
  if (!Number.isSafeInteger(samples)) optionErrorV1("--samples must be a safe integer");
  const output = values.get("--output");
  return {
    applicationId,
    samples,
    ...(output === undefined ? {} : { output: resolve(cwd, output) }),
  };
}

async function repositoryStateV1(): Promise<Readonly<{ head: string; dirty: boolean }>> {
  const [head, status] = await Promise.all([
    execFile("git", ["rev-parse", "HEAD"], { cwd: repositoryRootV1 }),
    execFile("git", ["status", "--porcelain=v1", "--untracked-files=normal"], {
      cwd: repositoryRootV1,
    }),
  ]);
  return {
    head: head.stdout.trim(),
    dirty: status.stdout.trim().length > 0,
  };
}

async function elapsedWhenV1(
  startedAt: number,
  locator: Locator,
  state: "attached" | "visible",
): Promise<number> {
  await locator.waitFor({ state, timeout: timeoutMsV1 });
  return performance.now() - startedAt;
}

async function measureStartupV1(
  page: Page,
  url: string,
  applicationId: string,
  sampleIndex: number,
): Promise<GuiStartupSampleV1> {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const startedAt = performance.now();
  const response = await page.goto(url, { waitUntil: "commit", timeout: timeoutMsV1 });
  if (response !== null && !response.ok()) {
    throw new Error(`GUI navigation returned HTTP ${String(response.status())}`);
  }
  const ready = page.locator(
    '#sillymaker-application-boot-shell[data-sillymaker-startup-state="ready"]',
  );
  const application = page.locator(`[data-application-id="${applicationId}"]`);
  const [guiReadyMs, firstInteractiveMs] = await Promise.all([
    elapsedWhenV1(startedAt, ready, "attached"),
    elapsedWhenV1(startedAt, application.locator(interactiveSelectorV1).first(), "visible"),
  ]);
  if (pageErrors.length > 0 || consoleErrors.length > 0) {
    throw new Error(
      `GUI startup diagnostics were not clean: ${JSON.stringify({ pageErrors, consoleErrors })}`,
    );
  }
  return { sampleIndex, guiReadyMs, firstInteractiveMs };
}

async function outputPathV1(requestedPath: string | undefined): Promise<string> {
  if (requestedPath !== undefined) return requestedPath;
  const directory = await Deno.makeTempDir({ prefix: "sillymaker-gui-startup-" });
  return join(directory, "measurements.json");
}

async function mainV1(): Promise<void> {
  const options = parseGuiStartupOptionsV1(Deno.args, Deno.cwd());
  const project = await loadWorkspaceProjectV1({
    repositoryRoot: repositoryRootV1,
    workspace: sillyMakerConfigV1,
  });
  const web = resolveWebBuildTargetV1(project, options.applicationId);
  const appRoot = resolve(repositoryRootV1, web.storyRoot);
  const configFile = resolve(appRoot, "vite.config.ts");

  await build({
    root: appRoot,
    configFile,
    mode: "production",
    logLevel: "warn",
    build: { sourcemap: false },
  });
  const server = await preview({
    root: appRoot,
    configFile,
    mode: "production",
    logLevel: "silent",
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  try {
    const url = server.resolvedUrls?.local[0];
    if (url === undefined) throw new Error("Vite preview did not publish a local URL");
    const browser = await chromium.launch({ headless: true });
    try {
      const browserVersion = browser.version();
      const samples: GuiStartupSampleV1[] = [];
      for (let sampleIndex = 1; sampleIndex <= options.samples; sampleIndex += 1) {
        const context = await browser.newContext();
        try {
          samples.push(
            await measureStartupV1(
              await context.newPage(),
              url,
              options.applicationId,
              sampleIndex,
            ),
          );
        } finally {
          await context.close();
        }
      }
      const report = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        applicationId: options.applicationId,
        profile: "release",
        repository: await repositoryStateV1(),
        environment: {
          deno: Deno.version.deno,
          v8: Deno.version.v8,
          typescript: Deno.version.typescript,
          os: Deno.build.os,
          arch: Deno.build.arch,
          browser: "chromium",
          browserVersion,
        },
        samples,
      } as const;
      const path = await outputPathV1(options.output);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      console.log(path);
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}

if (import.meta.main) {
  await mainV1().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  });
}
