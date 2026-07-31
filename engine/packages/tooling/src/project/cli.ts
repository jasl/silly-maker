// SPDX-License-Identifier: MIT
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

import { AuthoringDiagnosticErrorV1, diffPlainDataV1 } from "@sillymaker/base";

import type {
  DesktopCompressionV1,
  DesktopTargetTripleV1,
  ProjectCommandRunnerV1,
  ProjectModuleLoaderV1,
} from "./commands.ts";
import {
  buildStoryApplicationV1,
  checkStoryApplicationV1,
  DESKTOP_TARGET_TRIPLES_V1,
  desktopStoryApplicationV1,
  devSmokeStoryApplicationV1,
  inspectStoryApplicationV1,
  prebuiltSmokeStoryApplicationV1,
  simulateStoryApplicationV1,
} from "./commands.ts";
import type { SillymakerProjectConfigV1 } from "./config.ts";
import { listStoryApplicationIdsV1 } from "./config.ts";

export interface ProjectCliInputV1 {
  readonly project: SillymakerProjectConfigV1;
  readonly argv: readonly string[];
  readonly loader: ProjectModuleLoaderV1;
  /** Repository root for process-level verbs (dev, build, prebuilt-smoke). */
  readonly repositoryRoot?: string;
  /** Injectable process/filesystem seam; defaults to the real Node runner. */
  readonly runner?: ProjectCommandRunnerV1;
  writeOut(line: string): void;
  writeErr(line: string): void;
}

const usageV1 =
  "usage: story <inspect|check|simulate|dev|build|prebuilt-smoke|desktop> <application-id> " +
  "[--scenario <name>] [--seed <uint>] [--trace <dot.paths,comma-separated>] [--smoke] " +
  "[--profile <release|debug>] [--sourcemap] [--no-minify] " +
  "[--target <os-arch-triple>]... [--compress[=xz|lzma|zstd]] " +
  "| story check --all | story diff <before.json> <after.json>";

function printableV1(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

interface ParsedArgsV1 {
  readonly command: string;
  readonly selector: string;
  readonly scenario?: string;
  readonly seed?: number;
  readonly trace?: readonly string[];
  readonly diffAfterPath?: string;
  readonly smoke: boolean;
  /** build/desktop: named preset — `debug` = sourcemap + no minify. */
  readonly profile?: "release" | "debug";
  /** build/desktop: explicit sourcemap override; absent inherits application config. */
  readonly sourcemap?: true;
  /** build/desktop: disable minify/mangle (for debugging; on by default). */
  readonly noMinify: boolean;
  /** desktop: explicit cross-compile triples (repeatable; empty = host). */
  readonly targets: readonly DesktopTargetTripleV1[];
  /** desktop: self-extracting payload compression. */
  readonly compress?: DesktopCompressionV1 | true;
}

function isDesktopTargetTripleV1(value: string): value is DesktopTargetTripleV1 {
  return (DESKTOP_TARGET_TRIPLES_V1 as readonly string[]).includes(value);
}

function parseArgsV1(argv: readonly string[]): ParsedArgsV1 | null {
  const [command, selector, ...rest] = argv;
  if (command === undefined || selector === undefined) return null;
  if (command === "diff") {
    const [afterPath, ...extra] = rest;
    if (afterPath === undefined || extra.length > 0) return null;
    return {
      command,
      selector,
      diffAfterPath: afterPath,
      smoke: false,
      noMinify: false,
      targets: Object.freeze([]),
    };
  }
  let scenario: string | undefined;
  let seed: number | undefined;
  let trace: readonly string[] | undefined;
  let smoke = false;
  let profile: "release" | "debug" | undefined;
  let sourcemap: true | undefined;
  let noMinify = false;
  const targets: DesktopTargetTripleV1[] = [];
  let compress: DesktopCompressionV1 | true | undefined;
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    if (flag === "--smoke") {
      smoke = true;
      continue;
    }
    if (flag === "--sourcemap") {
      sourcemap = true;
      continue;
    }
    if (flag === "--no-minify") {
      noMinify = true;
      continue;
    }
    if (flag === "--compress") {
      compress = true;
      continue;
    }
    if (flag !== undefined && flag.startsWith("--compress=")) {
      const algo = flag.slice("--compress=".length);
      if (algo !== "xz" && algo !== "lzma" && algo !== "zstd") return null;
      compress = algo;
      continue;
    }
    if (
      flag === "--scenario" ||
      flag === "--seed" ||
      flag === "--trace" ||
      flag === "--profile" ||
      flag === "--target"
    ) {
      const value = rest[index + 1];
      if (value === undefined) return null;
      index += 1;
      if (flag === "--scenario") scenario = value;
      else if (flag === "--trace") {
        const paths = value
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0);
        if (paths.length === 0) return null;
        trace = Object.freeze(paths);
      } else if (flag === "--profile") {
        if (value !== "release" && value !== "debug") return null;
        profile = value;
      } else if (flag === "--target") {
        if (!isDesktopTargetTripleV1(value)) return null;
        targets.push(value);
      } else {
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
        seed = parsed;
      }
      continue;
    }
    return null;
  }
  return {
    command,
    selector,
    ...(scenario === undefined ? {} : { scenario }),
    ...(seed === undefined ? {} : { seed }),
    ...(trace === undefined ? {} : { trace }),
    smoke,
    ...(profile === undefined ? {} : { profile }),
    ...(sourcemap === undefined ? {} : { sourcemap }),
    noMinify,
    targets: Object.freeze(targets),
    ...(compress === undefined ? {} : { compress }),
  };
}

function storyBuildOptionsV1(parsed: ParsedArgsV1): {
  readonly sourcemap?: boolean;
  readonly minify?: boolean;
} {
  const sourcemap = parsed.sourcemap === true
    ? true
    : parsed.profile === "debug"
    ? true
    : parsed.profile === "release"
    ? false
    : undefined;
  const minify = parsed.noMinify || parsed.profile === "debug" ? false : undefined;
  return {
    ...(sourcemap === undefined ? {} : { sourcemap }),
    ...(minify === undefined ? {} : { minify }),
  };
}

function createNodeRunnerV1(): ProjectCommandRunnerV1 {
  const runner: ProjectCommandRunnerV1 = {
    hostPlatform: process.platform === "darwin"
      ? "darwin"
      : process.platform === "win32"
      ? "windows"
      : process.platform === "linux"
      ? "linux"
      : null,
    run: (command, args, options) =>
      new Promise<number>((resolve, reject) => {
        const child = spawn(command, [...args], {
          cwd: options.cwd,
          stdio: "inherit",
          ...(options.environment === undefined
            ? {}
            : { env: { ...process.env, ...options.environment } }),
        });
        child.once("error", reject);
        child.once("exit", (code) => resolve(code ?? 1));
      }),
    start(command, args, options) {
      const child = spawn(command, [...args], { cwd: options.cwd, stdio: "ignore" });
      return Object.freeze({
        kill: () => {
          child.kill();
        },
      });
    },
    fetchText: async (url) => {
      const response = await fetch(url);
      return Object.freeze({ status: response.status, body: await response.text() });
    },
    sleep: (milliseconds) => sleep(milliseconds),
    readFile: (path) => readFile(path, "utf8"),
    fileSize: async (path) => {
      try {
        const entry = await stat(path);
        return entry.isFile() ? entry.size : null;
      } catch {
        return null;
      }
    },
    writeFile: async (path, contents) => {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, contents, "utf8");
    },
    copyDirectory: async (source, destination) => {
      await rm(destination, { recursive: true, force: true });
      await mkdir(dirname(destination), { recursive: true });
      await cp(source, destination, { recursive: true });
    },
    copyFile: async (source, destination) => {
      await mkdir(dirname(destination), { recursive: true });
      await cp(source, destination);
    },
    removeDirectory: async (path) => {
      await rm(path, { recursive: true, force: true });
    },
  };
  return Object.freeze(runner);
}

/**
 * Runs one project command and returns the process exit code. Reports are
 * JSON on stdout; failures surface as structured diagnostics, never stacks.
 */
export async function runProjectCliV1(input: ProjectCliInputV1): Promise<number> {
  const parsed = parseArgsV1(input.argv);
  if (parsed === null) {
    input.writeErr(usageV1);
    return 2;
  }
  const { command, selector } = parsed;
  const processDeps = () => {
    if (input.repositoryRoot === undefined) {
      input.writeErr(`story ${command} requires a repository root`);
      return null;
    }
    return {
      runner: input.runner ?? createNodeRunnerV1(),
      repositoryRoot: input.repositoryRoot,
    };
  };
  try {
    switch (command) {
      case "inspect": {
        const result = await inspectStoryApplicationV1(input.project, selector, input.loader);
        input.writeOut(printableV1(result));
        return result.kind === "inspected" ? 0 : 1;
      }
      case "diff": {
        // Structured diff over two JSON files (exported saves, simulate
        // reports): where exactly do they differ, path by path.
        const deps = processDeps();
        if (deps === null) return 2;
        const afterPath = parsed.diffAfterPath;
        if (afterPath === undefined) {
          input.writeErr(usageV1);
          return 2;
        }
        let before: unknown;
        let after: unknown;
        try {
          before = JSON.parse(await deps.runner.readFile(selector)) as unknown;
          after = JSON.parse(await deps.runner.readFile(afterPath)) as unknown;
        } catch (error) {
          input.writeErr(
            `story diff could not read inputs: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          return 1;
        }
        const entries = diffPlainDataV1(before, after);
        input.writeOut(
          printableV1({
            before: selector,
            after: afterPath,
            identical: entries.length === 0,
            differences: entries,
          }),
        );
        return 0;
      }
      case "check": {
        const applicationIds = selector === "--all"
          ? listStoryApplicationIdsV1(input.project)
          : [selector];
        const reports = [];
        for (const applicationId of applicationIds) {
          reports.push(await checkStoryApplicationV1(input.project, applicationId, input.loader));
        }
        input.writeOut(printableV1(selector === "--all" ? reports : reports[0]));
        return reports.every((report) => report.ok) ? 0 : 1;
      }
      case "simulate": {
        const report = await simulateStoryApplicationV1(input.project, selector, input.loader, {
          ...(parsed.scenario === undefined ? {} : { scenario: parsed.scenario }),
          ...(parsed.seed === undefined ? {} : { seed: parsed.seed }),
          ...(parsed.trace === undefined ? {} : { trace: parsed.trace }),
        });
        input.writeOut(printableV1(report));
        return 0;
      }
      case "dev": {
        if (!parsed.smoke) {
          input.writeErr("story dev currently supports only --smoke");
          return 2;
        }
        const deps = processDeps();
        if (deps === null) return 2;
        const report = await devSmokeStoryApplicationV1(input.project, selector, deps);
        input.writeOut(printableV1(report));
        return report.ok ? 0 : 1;
      }
      case "build": {
        const deps = processDeps();
        if (deps === null) return 2;
        const report = await buildStoryApplicationV1(
          input.project,
          selector,
          deps,
          storyBuildOptionsV1(parsed),
        );
        input.writeOut(printableV1(report));
        return report.ok ? 0 : 1;
      }
      case "prebuilt-smoke": {
        const deps = processDeps();
        if (deps === null) return 2;
        const report = await prebuiltSmokeStoryApplicationV1(input.project, selector, deps);
        input.writeOut(printableV1(report));
        return report.ok ? 0 : 1;
      }
      case "desktop": {
        const deps = processDeps();
        if (deps === null) return 2;
        const report = await desktopStoryApplicationV1(input.project, selector, deps, {
          ...storyBuildOptionsV1(parsed),
          targets: parsed.targets,
          ...(parsed.compress === undefined ? {} : { compress: parsed.compress }),
        });
        input.writeOut(printableV1(report));
        return report.ok ? 0 : 1;
      }
      default: {
        input.writeErr(usageV1);
        return 2;
      }
    }
  } catch (error) {
    if (error instanceof AuthoringDiagnosticErrorV1) {
      input.writeOut(printableV1({ kind: "error", diagnostics: error.diagnostics }));
      return 1;
    }
    input.writeErr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
