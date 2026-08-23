// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { canonicalJsonBytes, digestCanonical, parseTextCatalogSetV1 } from "@sillymaker/base";
import type { TextCatalogSetV1 } from "@sillymaker/base";

import type {
  TemplateInteractionBlockV1,
  TemplateInteractionDocV1,
} from "../src/story/narrative-kit.ts";
import { compileTemplateInteractionDocV1 } from "../src/story/narrative-kit.ts";

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
  memoryUsage(): {
    readonly rss: number;
    readonly heapTotal: number;
    readonly heapUsed: number;
    readonly external: number;
  };
};

export type ContentScaleProfileV1 = "content-reference" | "content-scale";

export const contentScaleProfileEntryCountsV1: Readonly<
  Record<ContentScaleProfileV1, number>
> = Object.freeze({
  "content-reference": 1_000,
  "content-scale": 100_000,
});

const contentScaleMinimalMutableStateV1 = Object.freeze({
  narrative: Object.freeze({
    cursor: "node.scale.line-000000",
    flags: Object.freeze([]) as readonly string[],
  }),
});

export interface ContentScaleFixtureV1 {
  readonly profile: ContentScaleProfileV1;
  readonly entryCount: number;
  readonly doc: TemplateInteractionDocV1;
  readonly mutableState: typeof contentScaleMinimalMutableStateV1;
}

export interface ContentScaleCorrectnessV1 {
  readonly runtimeNodeCount: number;
  readonly textEntryCount: number;
  readonly flowNodeCount: number;
  readonly flowEdgeCount: number;
  readonly catalogEntryCount: number;
  readonly firstTextId: string;
  readonly lastTextId: string;
  readonly mutableStateCanonicalBytes: number;
  readonly mutableStateDigest: string;
}

export interface ContentScaleCompiledV1 {
  readonly fixture: ContentScaleFixtureV1;
  readonly compiled: ReturnType<typeof compileTemplateInteractionDocV1>;
  readonly catalog: TextCatalogSetV1;
  readonly correctness: ContentScaleCorrectnessV1;
}

interface ContentScaleOptionsV1 {
  readonly profile: ContentScaleProfileV1;
  readonly warmup: number;
  readonly samples: number;
  readonly output?: string;
}

interface DurationSampleV1 {
  readonly compile: number;
  readonly textCatalogAdmission: number;
}

interface DurationDistributionV1 {
  readonly raw: readonly number[];
  readonly p50: number;
  readonly p95: number;
}

interface MemoryUsageV1 {
  readonly rssBytes: number;
  readonly heapTotalBytes: number;
  readonly heapUsedBytes: number;
  readonly externalBytes: number;
}

const repositoryRootV1 = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const execFile = promisify(execFileCallback);
const profileNamesV1 = Object.freeze(
  Object.keys(contentScaleProfileEntryCountsV1) as ContentScaleProfileV1[],
);
const usageV1 = "usage: deno run -A --v8-flags=--expose-gc template/bench/content-scale.ts " +
  "--profile <content-reference|content-scale> [--warmup <count>] " +
  "[--samples <count>=5+] [--output <path>]";

function lineNameV1(index: number): string {
  return `line-${String(index).padStart(6, "0")}`;
}

export function createContentScaleFixtureV1(
  profile: ContentScaleProfileV1,
): ContentScaleFixtureV1 {
  const entryCount = contentScaleProfileEntryCountsV1[profile];
  const blocks: TemplateInteractionBlockV1[] = [];
  for (let index = 0; index < entryCount; index += 1) {
    const name = lineNameV1(index);
    blocks.push(Object.freeze({
      kind: "say" as const,
      name,
      speaker: null,
      text: `Synthetic content line ${String(index).padStart(6, "0")}`,
      next: index + 1 === entryCount ? "end" : lineNameV1(index + 1),
    }));
  }
  blocks.push(Object.freeze({ kind: "end" as const, name: "end" }));
  return Object.freeze({
    profile,
    entryCount,
    doc: Object.freeze({
      prefix: "scale",
      docId: "doc.scale.content",
      entry: lineNameV1(0),
      blocks: Object.freeze(blocks),
    }),
    mutableState: contentScaleMinimalMutableStateV1,
  });
}

function requireCountV1(actual: number, expected: number, subject: string): void {
  if (actual !== expected) {
    throw new TypeError(`${subject}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

export function compileContentScaleFixtureV1(
  fixture: ContentScaleFixtureV1,
): ContentScaleCompiledV1 {
  const compiled = compileTemplateInteractionDocV1({ doc: fixture.doc });
  const catalog = parseTextCatalogSetV1({
    defaultLocale: "en",
    catalogs: [{ locale: "en", fallbackLocale: null, entries: compiled.textEntries }],
  });
  return Object.freeze({
    fixture,
    compiled,
    catalog,
    correctness: compileContentScaleFixtureV1FromOutputsV1(fixture, compiled, catalog),
  });
}

function optionErrorV1(message: string): never {
  throw new TypeError(`${message}\n${usageV1}`);
}

function parseCountOptionV1(flag: string, value: string, minimum: number): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < minimum) {
    return optionErrorV1(`${flag} must be an integer >= ${String(minimum)}`);
  }
  return count;
}

function parseOptionsV1(argv: readonly string[]): ContentScaleOptionsV1 {
  let profile: ContentScaleProfileV1 | undefined;
  let warmup = 1;
  let samples = 5;
  let output: string | undefined;
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    const equals = argument.indexOf("=");
    const flag = equals < 0 ? argument : argument.slice(0, equals);
    if (
      flag !== "--profile" && flag !== "--warmup" && flag !== "--samples" &&
      flag !== "--output"
    ) {
      return optionErrorV1(`unknown argument: ${flag}`);
    }
    if (seen.has(flag)) return optionErrorV1(`${flag} may only be provided once`);
    seen.add(flag);
    let value = equals < 0 ? undefined : argument.slice(equals + 1);
    if (value === undefined) {
      value = argv[index + 1];
      if (value !== undefined) index += 1;
    }
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      return optionErrorV1(`${flag} requires a value`);
    }
    if (flag === "--output") output = resolve(value);
    else if (flag === "--warmup") warmup = parseCountOptionV1(flag, value, 0);
    else if (flag === "--samples") samples = parseCountOptionV1(flag, value, 5);
    else {
      profile = profileNamesV1.find((candidate) => candidate === value);
      if (profile === undefined) return optionErrorV1(`unsupported profile: ${value}`);
    }
  }
  if (profile === undefined) return optionErrorV1("--profile is required");
  return Object.freeze({
    profile,
    warmup,
    samples,
    ...(output === undefined ? {} : { output }),
  });
}

function requireExplicitGarbageCollectorV1(): () => void {
  const gc = (globalThis as typeof globalThis & { readonly gc?: () => void }).gc;
  if (gc === undefined) {
    throw new TypeError("content scale benchmark requires --v8-flags=--expose-gc");
  }
  return gc;
}

async function collectGarbageV1(gc: () => void): Promise<void> {
  gc();
  await new Promise<void>((resolveTimer) => setTimeout(resolveTimer, 0));
  gc();
}

function readMemoryUsageV1(): MemoryUsageV1 {
  const usage = Deno.memoryUsage();
  return Object.freeze({
    rssBytes: usage.rss,
    heapTotalBytes: usage.heapTotal,
    heapUsedBytes: usage.heapUsed,
    externalBytes: usage.external,
  });
}

async function repositoryStateV1(): Promise<
  Readonly<{ head: string; workingTreeModified: boolean }>
> {
  const [head, status] = await Promise.all([
    execFile("git", ["rev-parse", "HEAD"], { cwd: repositoryRootV1 }),
    execFile("git", ["status", "--porcelain=v1", "--untracked-files=normal"], {
      cwd: repositoryRootV1,
    }),
  ]);
  return Object.freeze({
    head: head.stdout.trim(),
    workingTreeModified: status.stdout.trim().length > 0,
  });
}

function measureDurationSampleV1(fixture: ContentScaleFixtureV1): DurationSampleV1 {
  const compileStartedAt = performance.now();
  const compiled = compileTemplateInteractionDocV1({ doc: fixture.doc });
  const compile = performance.now() - compileStartedAt;
  const admissionStartedAt = performance.now();
  const catalog = parseTextCatalogSetV1({
    defaultLocale: "en",
    catalogs: [{ locale: "en", fallbackLocale: null, entries: compiled.textEntries }],
  });
  const textCatalogAdmission = performance.now() - admissionStartedAt;
  requireCountV1(
    catalog.catalogs[0]?.entries.length ?? -1,
    fixture.entryCount,
    "catalog entry count",
  );
  return Object.freeze({ compile, textCatalogAdmission });
}

function durationDistributionV1(raw: readonly number[]): DurationDistributionV1 {
  if (raw.length < 5 || raw.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new TypeError("duration distribution requires at least five finite samples");
  }
  const sorted = raw.toSorted((left, right) => left - right);
  const nearestRank = (percentile: number): number => {
    const index = Math.ceil(percentile * sorted.length) - 1;
    const value = sorted[index];
    if (value === undefined) throw new TypeError("duration percentile is unavailable");
    return value;
  };
  return Object.freeze({
    raw: Object.freeze([...raw]),
    p50: nearestRank(0.5),
    p95: nearestRank(0.95),
  });
}

async function outputPathV1(requested: string | undefined): Promise<string> {
  if (requested !== undefined) return requested;
  const directory = await Deno.makeTempDir({ prefix: "sillymaker-content-scale-" });
  return join(directory, "measurements.json");
}

async function mainV1(): Promise<void> {
  const options = parseOptionsV1(Deno.args);
  const gc = requireExplicitGarbageCollectorV1();
  await collectGarbageV1(gc);
  const processBaseline = readMemoryUsageV1();
  const fixture = createContentScaleFixtureV1(options.profile);
  await collectGarbageV1(gc);
  const afterFixture = readMemoryUsageV1();

  for (let index = 0; index < options.warmup; index += 1) {
    measureDurationSampleV1(fixture);
  }
  const durationSamples: DurationSampleV1[] = [];
  for (let index = 0; index < options.samples; index += 1) {
    await collectGarbageV1(gc);
    durationSamples.push(measureDurationSampleV1(fixture));
  }

  await collectGarbageV1(gc);
  const beforeRetainedCompile = readMemoryUsageV1();
  const retained = compileContentScaleFixtureV1(fixture);
  await collectGarbageV1(gc);
  const afterAdmission = readMemoryUsageV1();
  const report = Object.freeze({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    profile: fixture.profile,
    entryCount: fixture.entryCount,
    repository: await repositoryStateV1(),
    environment: Object.freeze({
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
      os: Deno.build.os,
      arch: Deno.build.arch,
    }),
    protocol: Object.freeze({
      profilesPerProcess: 1,
      gcPassesPerCheckpoint: 2,
      macrotaskBetweenGcPasses: true,
      warmupSamples: options.warmup,
      measuredSamples: options.samples,
      retainedHeapCheckpoints: 1,
      status: "trend_only" as const,
    }),
    durationMs: Object.freeze({
      compile: durationDistributionV1(durationSamples.map((sample) => sample.compile)),
      textCatalogAdmission: durationDistributionV1(
        durationSamples.map((sample) => sample.textCatalogAdmission),
      ),
    }),
    retainedMemory: Object.freeze({
      processBaseline,
      afterFixture,
      beforeRetainedCompile,
      afterAdmission,
      fixtureHeapDeltaBytes: afterFixture.heapUsedBytes - processBaseline.heapUsedBytes,
      totalHeapDeltaBytes: afterAdmission.heapUsedBytes - processBaseline.heapUsedBytes,
      compileAndAdmissionHeapDeltaBytes: afterAdmission.heapUsedBytes -
        beforeRetainedCompile.heapUsedBytes,
    }),
    correctness: retained.correctness,
  });
  const path = await outputPathV1(options.output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(path);
}

function compileContentScaleFixtureV1FromOutputsV1(
  fixture: ContentScaleFixtureV1,
  compiled: ReturnType<typeof compileTemplateInteractionDocV1>,
  catalog: TextCatalogSetV1,
): ContentScaleCorrectnessV1 {
  const catalogEntries = catalog.catalogs[0]?.entries;
  if (catalogEntries === undefined) throw new TypeError("content scale catalog is missing");
  requireCountV1(compiled.nodes.length, fixture.entryCount + 1, "runtime node count");
  requireCountV1(compiled.textEntries.length, fixture.entryCount, "text entry count");
  requireCountV1(compiled.flowGraph.nodes.length, fixture.entryCount + 1, "flow node count");
  requireCountV1(compiled.flowGraph.edges.length, fixture.entryCount, "flow edge count");
  requireCountV1(catalogEntries.length, fixture.entryCount, "catalog entry count");
  const firstTextId = compiled.textEntries[0]?.textId;
  const lastTextId = compiled.textEntries.at(-1)?.textId;
  if (firstTextId === undefined || lastTextId === undefined) {
    throw new TypeError("content scale compiler produced no text entries");
  }
  return Object.freeze({
    runtimeNodeCount: compiled.nodes.length,
    textEntryCount: compiled.textEntries.length,
    flowNodeCount: compiled.flowGraph.nodes.length,
    flowEdgeCount: compiled.flowGraph.edges.length,
    catalogEntryCount: catalogEntries.length,
    firstTextId,
    lastTextId,
    mutableStateCanonicalBytes: canonicalJsonBytes(fixture.mutableState).byteLength,
    mutableStateDigest: digestCanonical("sillymaker:state:v1", fixture.mutableState),
  });
}

if (import.meta.main) {
  await mainV1().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  });
}
