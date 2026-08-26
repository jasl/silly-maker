// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  buildDependencyMeasurementEnvironmentKeyInternalV1,
  parseBuildDependencyReceiptInternalV1,
  serializeBuildDependencyMeasurementRequestInternalV1,
} from "../../engine/packages/tooling/src/vite/build-dependency-receipt.ts";
import type { BuildDependencyReceiptInternalV1 } from "../../engine/packages/tooling/src/vite/build-dependency-receipt.ts";
import { resolveWebBuildTargetV1 } from "../../engine/packages/tooling/src/project/config.ts";
import { loadWorkspaceProjectV1 } from "../../engine/packages/tooling/src/project/workspace.ts";
import { sillyMakerConfigV1 } from "../../project.config.ts";
import {
  contributionIdsByPlayerBuildAssetV1,
  playerBuildAssetKindV1,
  playerBuildAssetRoleV1,
  referencedPlayerBuildAssetsV1,
  repositoryRelativePlayerBuildPathV1,
  selectPlayerBuildOutDirV1,
} from "./player-build-baseline-helpers.ts";
import type {
  PlayerBuildAssetKindV1,
  PlayerBuildAssetRoleV1,
} from "./player-build-baseline-helpers.ts";

declare const Deno: {
  readonly args: readonly string[];
  readonly build: { readonly os: string; readonly arch: string };
  readonly version: {
    readonly deno: string;
    readonly v8: string;
    readonly typescript: string;
  };
  exitCode: number;
  makeTempDir(options?: { readonly prefix?: string }): Promise<string>;
};

interface OptionsV1 {
  readonly applicationId: string;
  readonly outDir?: string;
  readonly output?: string;
}

interface AssetRowV1 {
  readonly path: string;
  readonly kind: PlayerBuildAssetKindV1;
  readonly role: PlayerBuildAssetRoleV1;
  readonly rawBytes: number;
  readonly gzipBytes: number;
  readonly contributionIds: readonly string[];
}

const execFile = promisify(execFileCallback);
const repositoryRootV1 = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const usageV1 = "usage: deno task bench:player:bundle [--application <id>] [--out-dir <path>] " +
  "[--output <path>]";

function argumentErrorV1(message: string): never {
  throw new TypeError(`${message}\n${usageV1}`);
}

function parseOptionsV1(argv: readonly string[]): OptionsV1 {
  let applicationId = "e2e";
  let outDir: string | undefined;
  let output: string | undefined;
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    const equals = argument.indexOf("=");
    const flag = equals < 0 ? argument : argument.slice(0, equals);
    let value = equals < 0 ? undefined : argument.slice(equals + 1);
    if (seen.has(flag)) return argumentErrorV1(`${flag} may only be provided once`);
    seen.add(flag);
    if (value === undefined) {
      value = argv[index + 1];
      if (value !== undefined) index += 1;
    }
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      return argumentErrorV1(`${flag} requires a value`);
    }
    if (flag === "--application") applicationId = value;
    else if (flag === "--out-dir") outDir = value;
    else if (flag === "--output") output = value;
    else return argumentErrorV1(`unknown argument: ${flag}`);
  }
  return {
    applicationId,
    ...(outDir === undefined ? {} : { outDir }),
    ...(output === undefined ? {} : { output }),
  };
}

async function listFilesV1(root: string, directory = root): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFilesV1(root, path));
    else if (entry.isFile()) files.push(relative(root, path).split(sep).join("/"));
  }
  return files;
}

function sumV1(rows: readonly AssetRowV1[]): Readonly<{
  readonly files: number;
  readonly rawBytes: number;
  readonly gzipBytes: number;
}> {
  return {
    files: rows.length,
    rawBytes: rows.reduce((total, row) => total + row.rawBytes, 0),
    gzipBytes: rows.reduce((total, row) => total + row.gzipBytes, 0),
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

async function outputPathV1(requestedPath: string | undefined): Promise<string> {
  if (requestedPath !== undefined) return resolve(requestedPath);
  const directory = await Deno.makeTempDir({ prefix: "sillymaker-player-build-baseline-" });
  return join(directory, "baseline.json");
}

async function buildReleaseWithDependencyReceiptV1(input: {
  readonly applicationId: string;
}): Promise<
  Readonly<{
    readonly buildDurationMs: number;
    readonly dependencyGraph: BuildDependencyReceiptInternalV1;
  }>
> {
  const receiptDirectory = await Deno.makeTempDir({
    prefix: "sillymaker-build-dependency-receipt-",
  });
  const receiptPath = join(receiptDirectory, "receipt.json");
  const measurement = serializeBuildDependencyMeasurementRequestInternalV1({
    graphRoot: repositoryRootV1,
    receiptPath,
  });
  const buildStartedAt = performance.now();
  try {
    await execFile(
      "deno",
      ["task", "app", "build", input.applicationId, "--profile", "release"],
      {
        cwd: repositoryRootV1,
        env: {
          ...process.env,
          [buildDependencyMeasurementEnvironmentKeyInternalV1]: measurement,
        },
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    const buildDurationMs = performance.now() - buildStartedAt;
    const dependencyGraph = parseBuildDependencyReceiptInternalV1(
      await readFile(receiptPath, "utf8"),
    );
    if (dependencyGraph.applicationId !== input.applicationId) {
      throw new TypeError(
        "build dependency receipt application does not match the requested build",
      );
    }
    return { buildDurationMs, dependencyGraph };
  } catch (error) {
    const detail = error as { readonly stderr?: string; readonly stdout?: string };
    throw new Error(
      `player release build failed\n${detail.stderr ?? ""}\n${detail.stdout ?? ""}`.trim(),
      { cause: error },
    );
  } finally {
    await rm(receiptDirectory, { force: true, recursive: true });
  }
}

async function mainV1(): Promise<void> {
  const options = parseOptionsV1(Deno.args);
  const project = await loadWorkspaceProjectV1({
    repositoryRoot: repositoryRootV1,
    workspace: sillyMakerConfigV1,
  });
  const web = resolveWebBuildTargetV1(project, options.applicationId);
  const reportedOutDir = repositoryRelativePlayerBuildPathV1(
    repositoryRootV1,
    selectPlayerBuildOutDirV1(options.outDir, web.outDir),
  );
  const outDir = resolve(repositoryRootV1, reportedOutDir);
  const repository = await repositoryStateV1();
  const { buildDurationMs, dependencyGraph } = await buildReleaseWithDependencyReceiptV1({
    applicationId: options.applicationId,
  });
  const outDirStat = await stat(outDir);
  if (!outDirStat.isDirectory()) throw new Error("player release build did not create outDir");
  const html = await readFile(join(outDir, "index.html"), "utf8");
  const references = referencedPlayerBuildAssetsV1(html);
  const contributionIdsByAsset = contributionIdsByPlayerBuildAssetV1(dependencyGraph);
  const noContributionIdsV1: readonly string[] = [];
  const rows: AssetRowV1[] = [];
  for (const path of await listFilesV1(outDir)) {
    const bytes = await readFile(join(outDir, path));
    const kind = playerBuildAssetKindV1(path);
    const role = playerBuildAssetRoleV1(path, kind, references);
    rows.push({
      path,
      kind,
      role,
      rawBytes: bytes.byteLength,
      gzipBytes: gzipSync(bytes).byteLength,
      contributionIds: contributionIdsByAsset.get(path) ?? noContributionIdsV1,
    });
  }
  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    repository,
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
    },
    applicationId: options.applicationId,
    profile: "release",
    outDir: reportedOutDir,
    buildDurationMs,
    groups: {
      entry: sumV1(rows.filter((row) => row.role === "entry")),
      preload: sumV1(rows.filter((row) => row.role === "preload")),
      lazy: sumV1(rows.filter((row) => row.role === "lazy")),
      allJavaScript: sumV1(rows.filter((row) => row.kind === "javascript")),
      allCss: sumV1(rows.filter((row) => row.kind === "css")),
      runtimeAssets: sumV1(rows.filter((row) => row.kind === "runtime_asset")),
      allFiles: sumV1(rows),
    },
    assets: rows,
    dependencyGraph,
    interpretation: {
      status: "trend_only",
      machineBoundHardGate: false,
      rawAndGzipBytesAreProductFacts: true,
      buildDurationIsMachineSpecific: true,
    },
  };
  const path = await outputPathV1(options.output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(path);
}

try {
  await mainV1();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  Deno.exitCode = 1;
}
