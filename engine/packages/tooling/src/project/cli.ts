// SPDX-License-Identifier: MIT
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

import { AuthoringDiagnosticErrorV1, createDiagnosticV1, diffPlainDataV1 } from "@sillymaker/base";

import type {
  DesktopCompressionV1,
  DesktopTargetTripleV1,
  ProjectCommandRunnerV1,
  ProjectModuleLoaderV1,
} from "./commands.ts";
import { decodePngAlphaV1 } from "./png-alpha.ts";
import { traceRegionsDocumentV1 } from "./regions-trace.ts";
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
import { listStoryApplicationIdsV1, resolveStoryApplicationV1 } from "./config.ts";

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
  "usage: app <inspect|check|simulate|dev|build|prebuilt-smoke|desktop> <application-id> " +
  "[--scenario <name>] [--seed <uint>] [--trace <dot.paths,comma-separated>] [--smoke] " +
  "[--profile <release|debug>] [--sourcemap] [--no-minify] " +
  "[--target <os-arch-triple>]... [--compress[=xz|lzma|zstd]] " +
  "| app check --all | app diff <before.json> <after.json> " +
  "| app regions trace <image.png> --out <file.regions.json>";

const regionsTraceUsageV1 = "usage: app regions trace <image.png> --out <file.regions.json> " +
  "[--regions-id <id>] [--label <text>] [--region-id <id>] [--region-name <text>] " +
  "[--alpha-threshold <1-255>] [--max-vertices <3-64>] " +
  "[--anchor-x <permille 0-1000>] [--anchor-y <permille 0-1000>] [--force]";

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
      targets: [],
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
        trace = paths;
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
    targets,
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
      return {
        kill: () => {
          child.kill();
        },
      };
    },
    fetchText: async (url) => {
      const response = await fetch(url);
      return { status: response.status, body: await response.text() };
    },
    sleep: (milliseconds) => sleep(milliseconds),
    readFile: (path) => readFile(path, "utf8"),
    readFileBytes: (path) => readFile(path),
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
  return runner;
}

function reportCliErrorV1(input: ProjectCliInputV1, error: unknown): 1 {
  if (error instanceof AuthoringDiagnosticErrorV1) {
    input.writeOut(printableV1({ kind: "error", diagnostics: error.diagnostics }));
  } else {
    input.writeErr(error instanceof Error ? error.message : String(error));
  }
  return 1;
}

interface RegionsTraceArgsV1 {
  readonly imagePath: string;
  readonly outPath: string;
  readonly regionsId: string;
  readonly label: string;
  readonly regionId: string;
  readonly regionName: string;
  readonly alphaThreshold: number;
  readonly maxVertices: number;
  readonly anchorXPermille: number;
  readonly anchorYPermille: number;
  readonly force: boolean;
}

type RegionsTraceParseV1 =
  | { readonly kind: "ok"; readonly args: RegionsTraceArgsV1 }
  | { readonly kind: "usage" }
  | { readonly kind: "error"; readonly message: string };

const regionsOutSuffixV1 = ".regions.json";

function parseRegionsTraceArgsV1(argv: readonly string[]): RegionsTraceParseV1 {
  const [verb, imagePath, ...rest] = argv;
  if (verb !== "trace" || imagePath === undefined) return { kind: "usage" };
  let outPath: string | undefined;
  let regionsId: string | undefined;
  let label: string | undefined;
  let regionId: string | undefined;
  let regionName: string | undefined;
  let alphaThreshold = 128;
  let maxVertices = 32;
  let anchorXPermille = 500;
  let anchorYPermille = 1000;
  let force = false;
  const intRanges: Readonly<Record<string, readonly [number, number]>> = {
    "--alpha-threshold": [1, 255],
    "--max-vertices": [3, 64],
    "--anchor-x": [0, 1000],
    "--anchor-y": [0, 1000],
  };
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index]!;
    if (flag === "--force") {
      force = true;
      continue;
    }
    const value = rest[index + 1];
    if (value === undefined) return { kind: "usage" };
    index += 1;
    if (flag === "--out") outPath = value;
    else if (flag === "--regions-id") regionsId = value;
    else if (flag === "--label") label = value;
    else if (flag === "--region-id") regionId = value;
    else if (flag === "--region-name") regionName = value;
    else {
      const range = intRanges[flag];
      if (range === undefined) return { kind: "usage" };
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < range[0] || parsed > range[1]) {
        return { kind: "usage" };
      }
      if (flag === "--alpha-threshold") alphaThreshold = parsed;
      else if (flag === "--max-vertices") maxVertices = parsed;
      else if (flag === "--anchor-x") anchorXPermille = parsed;
      else anchorYPermille = parsed;
    }
  }
  if (outPath === undefined) return { kind: "usage" };
  if (!outPath.endsWith(regionsOutSuffixV1)) {
    return {
      kind: "error",
      message: `app regions trace writes a regions Document; --out must end with ` +
        `"${regionsOutSuffixV1}" (got "${outPath}")`,
    };
  }
  const stem = (outPath.split("/").at(-1) ?? "").slice(0, -regionsOutSuffixV1.length);
  if (!/^[a-z0-9_.-]+$/u.test(stem)) {
    return {
      kind: "error",
      message: `the output file stem "${stem}" must be lowercase [a-z0-9_.-] so the ` +
        "regions id and filename lint stay in step; rename --out or pass --regions-id",
    };
  }
  const resolvedLabel = label ?? stem;
  return {
    kind: "ok",
    args: {
      imagePath,
      outPath,
      regionsId: regionsId ?? `regions.${stem}`,
      label: resolvedLabel,
      regionId: regionId ?? "region-1",
      regionName: regionName ?? resolvedLabel,
      alphaThreshold,
      maxVertices,
      anchorXPermille,
      anchorYPermille,
      force,
    },
  };
}

/**
 * `app regions trace <image.png> --out <file.regions.json>`: the
 * legacy-asset bridge (shaped-hit-regions M4). Decodes the PNG's alpha
 * plane, traces the largest silhouette into a polygon within the vertex
 * budget, and writes an editable `sillymaker.regions` Document. Pixel
 * semantics live only here, at import time.
 */
async function runRegionsTraceCliV1(input: ProjectCliInputV1): Promise<number> {
  const parsed = parseRegionsTraceArgsV1(input.argv.slice(1));
  if (parsed.kind === "usage") {
    input.writeErr(regionsTraceUsageV1);
    return 2;
  }
  if (parsed.kind === "error") {
    input.writeErr(parsed.message);
    return 2;
  }
  const { args } = parsed;
  const runner = input.runner ?? createNodeRunnerV1();
  try {
    if (!args.force && (await runner.fileSize(args.outPath)) !== null) {
      throw new AuthoringDiagnosticErrorV1([
        createDiagnosticV1({
          code: "regions.trace_output_exists",
          phase: "asset",
          message: `output "${args.outPath}" already exists; pass --force to overwrite`,
          details: {},
        }),
      ]);
    }
    let bytes: Uint8Array;
    try {
      bytes = await runner.readFileBytes(args.imagePath);
    } catch (error) {
      input.writeErr(
        `app regions trace could not read "${args.imagePath}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 1;
    }
    const image = await decodePngAlphaV1(bytes);
    const result = traceRegionsDocumentV1(image, {
      regionsId: args.regionsId,
      label: args.label,
      regionId: args.regionId,
      accessibleNameText: args.regionName,
      alphaThreshold: args.alphaThreshold,
      maxVertices: args.maxVertices,
      anchorXPermille: args.anchorXPermille,
      anchorYPermille: args.anchorYPermille,
    });
    await runner.writeFile(args.outPath, `${JSON.stringify(result.document, null, 2)}\n`);
    const region = result.document.regions[0]!;
    input.writeOut(
      printableV1({
        kind: "traced",
        image: args.imagePath,
        out: args.outPath,
        regionsId: result.document.regionsId,
        regionId: region.regionId,
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        alphaThreshold: args.alphaThreshold,
        contourVertexCount: result.contourVertexCount,
        vertexCount: result.vertexCount,
        box: { x: region.x, y: region.y, width: region.width, height: region.height },
      }),
    );
    return 0;
  } catch (error) {
    return reportCliErrorV1(input, error);
  }
}

/**
 * Runs one project command and returns the process exit code. Reports are
 * JSON on stdout; failures surface as structured diagnostics, never stacks.
 */
export async function runProjectCliV1(input: ProjectCliInputV1): Promise<number> {
  if (input.argv[0] === "regions") {
    return await runRegionsTraceCliV1(input);
  }
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
            `app diff could not read inputs: ${
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
          reports.push(
            await checkStoryApplicationV1(input.project, applicationId, input.loader, {
              ...(input.repositoryRoot === undefined
                ? {}
                : { repositoryRoot: input.repositoryRoot }),
            }),
          );
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
        const deps = processDeps();
        if (deps === null) return 2;
        if (parsed.smoke) {
          const report = await devSmokeStoryApplicationV1(input.project, selector, deps);
          input.writeOut(printableV1(report));
          return report.ok ? 0 : 1;
        }
        const application = resolveStoryApplicationV1(input.project, selector);
        if (application.web === null) {
          input.writeErr(`application "${selector}" has no web target`);
          return 1;
        }
        const storyRoot = application.web.storyRoot;
        return await deps.runner.run("deno", ["run", "-A", "npm:vite"], {
          cwd: storyRoot === "." ? deps.repositoryRoot : `${deps.repositoryRoot}/${storyRoot}`,
        });
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
    return reportCliErrorV1(input, error);
  }
}
