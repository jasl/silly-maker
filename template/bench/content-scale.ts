// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  canonicalJsonBytes,
  createTextContentSessionV1,
  defineTextContentManifestV1,
  digestBytes,
  digestCanonical,
  parseTextCatalogSetV1,
  parseTextContentPackIdV1,
  parseTextId,
} from "@sillymaker/base";
import type { TextContentManifestV1, TextContentSessionV1 } from "@sillymaker/base";

import type { TemplateInteractionDocV1 } from "../src/story/narrative-kit.ts";
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

export const contentScaleEntriesPerPackV1 = 1_000;
export const contentScaleProfilePackCountsV1: Readonly<
  Record<ContentScaleProfileV1, number>
> = Object.freeze({
  "content-reference": 1,
  "content-scale": 100,
});
export const contentScaleProfileEntryCountsV1: Readonly<
  Record<ContentScaleProfileV1, number>
> = Object.freeze({
  "content-reference": contentScaleEntriesPerPackV1,
  "content-scale": 100 * contentScaleEntriesPerPackV1,
});

const contentScaleMinimalMutableStateV1 = Object.freeze({
  narrative: Object.freeze({
    cursor: "node.scale.line-000000",
    flags: Object.freeze([]) as readonly string[],
  }),
});

const contentScaleControlDocV1: TemplateInteractionDocV1 = Object.freeze({
  prefix: "scale",
  docId: "doc.scale.content",
  entry: "line-000000",
  blocks: Object.freeze([
    Object.freeze({
      kind: "say" as const,
      name: "line-000000",
      speaker: null,
      textId: "text.scale.line.000000",
      next: "end",
    }),
    Object.freeze({ kind: "end" as const, name: "end" }),
  ]),
});

export interface ContentScaleFixtureV1 {
  readonly profile: ContentScaleProfileV1;
  readonly packCount: number;
  readonly entryCount: number;
  readonly doc: TemplateInteractionDocV1;
  readonly mutableState: typeof contentScaleMinimalMutableStateV1;
}

export interface ContentScaleCorrectnessV1 {
  readonly runtimeNodeCount: number;
  readonly inlineTextEntryCount: number;
  readonly manifestPackCount: number;
  readonly declaredTextEntryCount: number;
  readonly loadedPackCount: number;
  readonly loadedTextEntryCount: number;
  readonly firstTextId: string;
  readonly lastTextId: string;
  readonly firstText: string;
  readonly mutableStateCanonicalBytes: number;
  readonly mutableStateDigest: string;
}

export interface ContentScaleCompiledV1 {
  readonly fixture: ContentScaleFixtureV1;
  readonly manifest: TextContentManifestV1;
  readonly session: TextContentSessionV1;
  readonly correctness: ContentScaleCorrectnessV1;
}

interface ContentScaleOptionsV1 {
  readonly profile: ContentScaleProfileV1;
  readonly warmup: number;
  readonly samples: number;
  readonly output?: string;
}

interface DurationSampleV1 {
  readonly manifestBuild: number;
  readonly initialPackAdmission: number;
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

interface GeneratedContentV1 {
  readonly manifest: TextContentManifestV1;
  readonly firstPackBytes: Uint8Array;
}

const repositoryRootV1 = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const execFile = promisify(execFileCallback);
const profileNamesV1 = Object.freeze(
  Object.keys(contentScaleProfileEntryCountsV1) as ContentScaleProfileV1[],
);
const usageV1 = "usage: deno run -A --v8-flags=--expose-gc template/bench/content-scale.ts " +
  "--profile <content-reference|content-scale> [--warmup <count>] " +
  "[--samples <count>=5+] [--output <path>]";
const encoderV1 = new TextEncoder();
const emptyBootstrapCatalogsV1 = parseTextCatalogSetV1({
  defaultLocale: "en",
  catalogs: [{ locale: "en", fallbackLocale: null, entries: [] }],
});

function entryIdV1(index: number): string {
  return `text.scale.line.${String(index).padStart(6, "0")}`;
}

function packIdV1(index: number): string {
  return `text-pack.scale.${String(index).padStart(3, "0")}`;
}

function packBytesV1(packIndex: number): Uint8Array {
  const firstEntryIndex = packIndex * contentScaleEntriesPerPackV1;
  const entries = Array.from({ length: contentScaleEntriesPerPackV1 }, (_, offset) => {
    const index = firstEntryIndex + offset;
    return Object.freeze({
      textId: entryIdV1(index),
      text: `Synthetic content line ${String(index).padStart(6, "0")}`,
    });
  });
  return encoderV1.encode(JSON.stringify({
    format: "sillymaker.text-content-pack",
    version: 1,
    packId: packIdV1(packIndex),
    textCatalogs: {
      defaultLocale: "en",
      catalogs: [{ locale: "en", fallbackLocale: null, entries }],
    },
  }));
}

function generateContentV1(fixture: ContentScaleFixtureV1): GeneratedContentV1 {
  const descriptors = [];
  let firstPackBytes: Uint8Array | undefined;
  for (let packIndex = 0; packIndex < fixture.packCount; packIndex += 1) {
    const bytes = packBytesV1(packIndex);
    if (packIndex === 0) firstPackBytes = bytes;
    descriptors.push(Object.freeze({
      packId: packIdV1(packIndex),
      runtimePath: `assets/content/scale-${String(packIndex).padStart(3, "0")}.json`,
      byteLength: bytes.byteLength,
      sha256: digestBytes(bytes),
      entryCount: contentScaleEntriesPerPackV1,
    }));
  }
  if (firstPackBytes === undefined) throw new TypeError("content scale first pack missing");
  return Object.freeze({
    manifest: defineTextContentManifestV1({ revision: 1, packs: descriptors }),
    firstPackBytes,
  });
}

function createSessionV1(content: GeneratedContentV1): TextContentSessionV1 {
  const firstPackId = content.manifest.packs[0]?.packId;
  if (firstPackId === undefined) throw new TypeError("content scale manifest is empty");
  return createTextContentSessionV1({
    manifest: content.manifest,
    bootstrapCatalogs: emptyBootstrapCatalogsV1,
    loadPackBytes: (descriptor) =>
      descriptor.packId === firstPackId
        ? Promise.resolve(content.firstPackBytes)
        : Promise.reject(new TypeError(`content scale pack not loaded:${descriptor.packId}`)),
  });
}

export function createContentScaleFixtureV1(
  profile: ContentScaleProfileV1,
): ContentScaleFixtureV1 {
  return Object.freeze({
    profile,
    packCount: contentScaleProfilePackCountsV1[profile],
    entryCount: contentScaleProfileEntryCountsV1[profile],
    doc: contentScaleControlDocV1,
    mutableState: contentScaleMinimalMutableStateV1,
  });
}

export async function compileContentScaleFixtureV1(
  fixture: ContentScaleFixtureV1,
): Promise<ContentScaleCompiledV1> {
  const compiled = compileTemplateInteractionDocV1({ doc: fixture.doc });
  const content = generateContentV1(fixture);
  const session = createSessionV1(content);
  await session.ensure(parseTextContentPackIdV1(packIdV1(0)));
  const firstTextId = entryIdV1(0);
  return Object.freeze({
    fixture,
    manifest: content.manifest,
    session,
    correctness: Object.freeze({
      runtimeNodeCount: compiled.nodes.length,
      inlineTextEntryCount: compiled.textEntries.length,
      manifestPackCount: content.manifest.packs.length,
      declaredTextEntryCount: content.manifest.packs.reduce(
        (total, pack) => total + pack.entryCount,
        0,
      ),
      loadedPackCount: session.loadedPackIds().length,
      loadedTextEntryCount: session.loadedEntryCount(),
      firstTextId,
      lastTextId: entryIdV1(fixture.entryCount - 1),
      firstText: session.resolveText(null, parseTextId(firstTextId)),
      mutableStateCanonicalBytes: canonicalJsonBytes(fixture.mutableState).byteLength,
      mutableStateDigest: digestCanonical("sillymaker:state:v1", fixture.mutableState),
    }),
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

async function measureDurationSampleV1(
  fixture: ContentScaleFixtureV1,
): Promise<DurationSampleV1> {
  const buildStartedAt = performance.now();
  const content = generateContentV1(fixture);
  const manifestBuild = performance.now() - buildStartedAt;
  const session = createSessionV1(content);
  const admissionStartedAt = performance.now();
  await session.ensure(parseTextContentPackIdV1(packIdV1(0)));
  const initialPackAdmission = performance.now() - admissionStartedAt;
  if (session.loadedPackIds().length !== 1 || session.loadedEntryCount() !== 1_000) {
    throw new TypeError("content scale initial pack invariant failed");
  }
  return Object.freeze({ manifestBuild, initialPackAdmission });
}

function durationDistributionV1(raw: readonly number[]): DurationDistributionV1 {
  if (raw.length < 5 || raw.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new TypeError("duration distribution requires at least five finite samples");
  }
  const sorted = raw.toSorted((left, right) => left - right);
  const nearestRank = (percentile: number): number => {
    const value = sorted[Math.ceil(percentile * sorted.length) - 1];
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
    await measureDurationSampleV1(fixture);
  }
  const samples: DurationSampleV1[] = [];
  for (let index = 0; index < options.samples; index += 1) {
    await collectGarbageV1(gc);
    samples.push(await measureDurationSampleV1(fixture));
  }

  await collectGarbageV1(gc);
  const beforeRetainedSession = readMemoryUsageV1();
  const retained = await compileContentScaleFixtureV1(fixture);
  await collectGarbageV1(gc);
  const afterInitialPack = readMemoryUsageV1();
  const report = Object.freeze({
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    profile: fixture.profile,
    packCount: fixture.packCount,
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
      entriesPerPack: contentScaleEntriesPerPackV1,
      initiallyLoadedPacks: 1,
      gcPassesPerCheckpoint: 2,
      macrotaskBetweenGcPasses: true,
      warmupSamples: options.warmup,
      measuredSamples: options.samples,
      status: "trend_only" as const,
    }),
    durationMs: Object.freeze({
      manifestBuild: durationDistributionV1(samples.map((sample) => sample.manifestBuild)),
      initialPackAdmission: durationDistributionV1(
        samples.map((sample) => sample.initialPackAdmission),
      ),
    }),
    retainedMemory: Object.freeze({
      processBaseline,
      afterFixture,
      beforeRetainedSession,
      afterInitialPack,
      fixtureHeapDeltaBytes: afterFixture.heapUsedBytes - processBaseline.heapUsedBytes,
      sessionHeapDeltaBytes: afterInitialPack.heapUsedBytes - beforeRetainedSession.heapUsedBytes,
      totalHeapDeltaBytes: afterInitialPack.heapUsedBytes - processBaseline.heapUsedBytes,
    }),
    correctness: retained.correctness,
  });
  const path = await outputPathV1(options.output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(path);
}

if (import.meta.main) {
  await mainV1().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  });
}
