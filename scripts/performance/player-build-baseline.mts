// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

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
  readonly outDir: string;
  readonly output?: string;
}

type AssetKindV1 = "javascript" | "css" | "runtime_asset";
type AssetRoleV1 = "entry" | "preload" | "lazy" | "runtime_asset";

interface AssetRowV1 {
  readonly path: string;
  readonly kind: AssetKindV1;
  readonly role: AssetRoleV1;
  readonly rawBytes: number;
  readonly gzipBytes: number;
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
  let outDir = "e2e/dist-web";
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
  return output === undefined ? { applicationId, outDir } : { applicationId, outDir, output };
}

function assertRepositoryPathV1(path: string): string {
  const resolved = resolve(repositoryRootV1, path);
  const relativePath = relative(repositoryRootV1, resolved);
  if (
    relativePath.length === 0 || relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  ) {
    throw new TypeError("player build baseline outDir must be inside the repository");
  }
  return resolved;
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

function referencedAssetsV1(html: string): Readonly<{
  readonly entry: ReadonlySet<string>;
  readonly preload: ReadonlySet<string>;
}> {
  const entry = new Set<string>();
  const preload = new Set<string>();
  const normalize = (value: string): string => value.replace(/^\.\//u, "").replace(/^\//u, "");
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/giu)) {
    if (match[1] !== undefined) entry.add(normalize(match[1]));
  }
  for (const match of html.matchAll(/<link\b([^>]*)>/giu)) {
    const attributes = match[1] ?? "";
    const href = /\bhref=["']([^"']+)["']/iu.exec(attributes)?.[1];
    const rel = /\brel=["']([^"']+)["']/iu.exec(attributes)?.[1] ?? "";
    if (href === undefined) continue;
    const path = normalize(href);
    if (rel.split(/\s+/u).includes("modulepreload")) preload.add(path);
    else if (rel.split(/\s+/u).includes("stylesheet")) entry.add(path);
  }
  return Object.freeze({ entry, preload });
}

function assetKindV1(path: string): AssetKindV1 {
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "javascript";
  if (path.endsWith(".css")) return "css";
  return "runtime_asset";
}

function sumV1(rows: readonly AssetRowV1[]): Readonly<{
  readonly files: number;
  readonly rawBytes: number;
  readonly gzipBytes: number;
}> {
  return Object.freeze({
    files: rows.length,
    rawBytes: rows.reduce((total, row) => total + row.rawBytes, 0),
    gzipBytes: rows.reduce((total, row) => total + row.gzipBytes, 0),
  });
}

async function repositoryStateV1(): Promise<Readonly<{ head: string; dirty: boolean }>> {
  const [head, status] = await Promise.all([
    execFile("git", ["rev-parse", "HEAD"], { cwd: repositoryRootV1 }),
    execFile("git", ["status", "--porcelain=v1", "--untracked-files=normal"], {
      cwd: repositoryRootV1,
    }),
  ]);
  return Object.freeze({
    head: head.stdout.trim(),
    dirty: status.stdout.trim().length > 0,
  });
}

async function outputPathV1(requestedPath: string | undefined): Promise<string> {
  if (requestedPath !== undefined) return resolve(requestedPath);
  const directory = await Deno.makeTempDir({ prefix: "sillymaker-player-build-baseline-" });
  return join(directory, "baseline.json");
}

async function mainV1(): Promise<void> {
  const options = parseOptionsV1(Deno.args);
  const outDir = assertRepositoryPathV1(options.outDir);
  const repository = await repositoryStateV1();
  const buildStartedAt = performance.now();
  try {
    await execFile(
      "deno",
      ["task", "story", "build", options.applicationId, "--profile", "release"],
      { cwd: repositoryRootV1, maxBuffer: 16 * 1024 * 1024 },
    );
  } catch (error) {
    const detail = error as { readonly stderr?: string; readonly stdout?: string };
    throw new Error(
      `player release build failed\n${detail.stderr ?? ""}\n${detail.stdout ?? ""}`.trim(),
      { cause: error },
    );
  }
  const buildDurationMs = performance.now() - buildStartedAt;
  const outDirStat = await stat(outDir);
  if (!outDirStat.isDirectory()) throw new Error("player release build did not create outDir");
  const html = await readFile(join(outDir, "index.html"), "utf8");
  const references = referencedAssetsV1(html);
  const rows: AssetRowV1[] = [];
  for (const path of await listFilesV1(outDir)) {
    const bytes = await readFile(join(outDir, path));
    const kind = assetKindV1(path);
    const role = kind === "runtime_asset"
      ? "runtime_asset"
      : references.entry.has(path)
      ? "entry"
      : references.preload.has(path)
      ? "preload"
      : "lazy";
    rows.push(Object.freeze({
      path,
      kind,
      role,
      rawBytes: bytes.byteLength,
      gzipBytes: gzipSync(bytes).byteLength,
    }));
  }
  const report = Object.freeze({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository,
    environment: Object.freeze({
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
    }),
    applicationId: options.applicationId,
    profile: "release",
    outDir: options.outDir,
    buildDurationMs,
    groups: Object.freeze({
      entry: sumV1(rows.filter((row) => row.role === "entry")),
      preload: sumV1(rows.filter((row) => row.role === "preload")),
      lazy: sumV1(rows.filter((row) => row.role === "lazy")),
      allJavaScript: sumV1(rows.filter((row) => row.kind === "javascript")),
      allCss: sumV1(rows.filter((row) => row.kind === "css")),
      runtimeAssets: sumV1(rows.filter((row) => row.kind === "runtime_asset")),
      allFiles: sumV1(rows),
    }),
    assets: Object.freeze(rows),
    interpretation: Object.freeze({
      status: "trend_only",
      machineBoundHardGate: false,
      rawAndGzipBytesAreProductFacts: true,
      buildDurationIsMachineSpecific: true,
    }),
  });
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
