// SPDX-License-Identifier: MIT
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildAuthoringProjectIndexV1 } from "../src/project/authoring-index.ts";
import { listChromeLayoutSourceFilesV1 } from "../src/vite/chrome-layout-port.ts";
import { listMotionSourceFilesV1 } from "../src/vite/motion-port.ts";
import { listRegionsSourceFilesV1 } from "../src/vite/regions-port.ts";
import { listSceneSourceFilesV1 } from "../src/vite/scene-port.ts";

declare const Deno: {
  readonly args: readonly string[];
  readonly build: { readonly os: string; readonly arch: string };
  readonly version: { readonly deno: string; readonly v8: string; readonly typescript: string };
  cwd(): string;
};

type DocumentFamilyV1 = "scene" | "motion" | "regions" | "chrome-layout";

interface FixtureV1 {
  readonly root: string;
  readonly changedScenePath: string;
  readonly counts: Readonly<Record<DocumentFamilyV1, number>>;
}

const repositoryRootV1 = fileURLToPath(new URL("../../../..", import.meta.url));
const sampleCountV1 = 5;
const familiesV1: readonly DocumentFamilyV1[] = [
  "scene",
  "motion",
  "regions",
  "chrome-layout",
];
const profilesV1 = [
  { profile: "index-reference", documentCount: 10 },
  { profile: "index-scale", documentCount: 1_000 },
] as const;

function serialV1(index: number): string {
  return String(index).padStart(6, "0");
}

function sourcePathV1(root: string, family: DocumentFamilyV1, index: number): string {
  const serial = serialV1(index);
  const bucket = String(Math.floor(index / 10)).padStart(3, "0");
  const stem = family === "scene"
    ? `s${serial}`
    : family === "motion"
    ? `m${serial}`
    : family === "regions"
    ? `r${serial}`
    : `l${serial}`;
  const suffix = family === "chrome-layout" ? "chrome-layout.json" : `${family}.json`;
  return join(root, "sources", `bucket-${bucket}`, `${stem}.${suffix}`);
}

function sourceBytesV1(family: DocumentFamilyV1, index: number, labelSuffix = ""): string {
  const serial = serialV1(index);
  const label = `${family} ${serial}${labelSuffix}`;
  const document = family === "scene"
    ? {
      format: "sillymaker.scene",
      version: 1,
      sceneId: `scene.scale.s${serial}`,
      label,
      canvas: { width: 1280, height: 720 },
      entries: [
        {
          layerId: "layer.scale.characters",
          tag: `tag.scale.s${serial}`,
          contentId: "content.scale.hero",
        },
      ],
      cues: [
        {
          cueId: `cue.scale.s${serial}.show`,
          kind: "show",
          tag: `tag.scale.s${serial}`,
        },
      ],
    }
    : family === "motion"
    ? {
      format: "sillymaker.motion",
      version: 1,
      motionId: `motion.scale.m${serial}`,
      label,
      durationMs: 300,
      delayMs: 0,
      tracks: [
        {
          channel: "offsetX",
          keyframes: [{ atPermille: 0, value: 120 }, { atPermille: 1000, value: 0 }],
        },
      ],
    }
    : family === "regions"
    ? {
      format: "sillymaker.regions",
      version: 1,
      regionsId: `regions.scale.r${serial}`,
      label,
      regions: [
        {
          regionId: "primary",
          accessibleNameText: "Primary",
          x: 10,
          y: 10,
          width: 80,
          height: 60,
        },
      ],
    }
    : {
      format: "sillymaker.chrome-layout",
      version: 1,
      layoutId: `layout.scale.l${serial}`,
      label,
      canvas: { width: 1024, height: 576 },
      boxes: { "hud.marker": { x: 925, y: 510, width: 80, height: 60 } },
      anchors: {},
      offsets: {},
    };
  return `${JSON.stringify(document)}\n`;
}

function createFixtureV1(documentCount: number): FixtureV1 {
  const root = mkdtempSync(join(tmpdir(), `sillymaker-authoring-index-${documentCount}-`));
  const counts: Record<DocumentFamilyV1, number> = {
    scene: 0,
    motion: 0,
    regions: 0,
    "chrome-layout": 0,
  };
  for (let index = 0; index < documentCount; index += 1) {
    const family = familiesV1[index % familiesV1.length]!;
    const path = sourcePathV1(root, family, index);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, sourceBytesV1(family, index));
    counts[family] += 1;
  }
  return {
    root,
    changedScenePath: sourcePathV1(root, "scene", 0),
    counts: Object.freeze(counts),
  };
}

function measureV1<T>(operation: () => T): { readonly durationMs: number; readonly value: T } {
  const startedAt = performance.now();
  const value = operation();
  return { durationMs: performance.now() - startedAt, value };
}

function distributionV1(raw: readonly number[]) {
  const ordered = [...raw].sort((left, right) => left - right);
  const percentile = (value: number) =>
    ordered[Math.min(ordered.length - 1, Math.ceil(value * ordered.length) - 1)]!;
  return { raw, p50: percentile(0.5), p95: percentile(0.95) };
}

function assertCountV1(subject: string, actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`${subject}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertIndexV1(fixture: FixtureV1, index: ReturnType<typeof buildAuthoringProjectIndexV1>) {
  assertCountV1("scene count", index.scenes.length, fixture.counts.scene);
  assertCountV1("motion count", index.motions.length, fixture.counts.motion);
  assertCountV1("regions count", index.regions.length, fixture.counts.regions);
  assertCountV1(
    "chrome-layout count",
    index.chromeLayouts.length,
    fixture.counts["chrome-layout"],
  );
  assertCountV1("skipped count", index.skipped.length, 0);
}

function measureListSweepV1(fixture: FixtureV1) {
  const startedAt = performance.now();
  const scene = measureV1(() => listSceneSourceFilesV1(fixture.root));
  const motion = measureV1(() => listMotionSourceFilesV1(fixture.root));
  const regions = measureV1(() => listRegionsSourceFilesV1(fixture.root));
  const chromeLayout = measureV1(() => listChromeLayoutSourceFilesV1(fixture.root));
  assertCountV1("scene list count", scene.value.scenes.length, fixture.counts.scene);
  assertCountV1("motion list count", motion.value.motions.length, fixture.counts.motion);
  assertCountV1(
    "regions list count",
    regions.value.regionsDocuments.length,
    fixture.counts.regions,
  );
  assertCountV1(
    "chrome-layout list count",
    chromeLayout.value.chromeLayouts.length,
    fixture.counts["chrome-layout"],
  );
  assertCountV1(
    "list skipped count",
    scene.value.skipped.length + motion.value.skipped.length + regions.value.skipped.length +
      chromeLayout.value.skipped.length,
    0,
  );
  return {
    total: performance.now() - startedAt,
    scene: scene.durationMs,
    motion: motion.durationMs,
    regions: regions.durationMs,
    chromeLayout: chromeLayout.durationMs,
  };
}

function measureSingleFileChangeV1(fixture: FixtureV1, sampleIndex: number): number {
  const labelSuffix = ` revision-${String(sampleIndex)}`;
  const startedAt = performance.now();
  writeFileSync(fixture.changedScenePath, sourceBytesV1("scene", 0, labelSuffix));
  const result = listSceneSourceFilesV1(fixture.root);
  const durationMs = performance.now() - startedAt;
  const changed = result.scenes.find((scene) => scene.sceneId === "scene.scale.s000000");
  if (changed?.label !== `scene 000000${labelSuffix}`) {
    throw new Error("single-file change was not visible through the current scene list contract");
  }
  return durationMs;
}

function measureProfileV1(profile: string, documentCount: number) {
  const fixture = createFixtureV1(documentCount);
  try {
    assertIndexV1(fixture, buildAuthoringProjectIndexV1(fixture.root));
    measureListSweepV1(fixture);
    measureSingleFileChangeV1(fixture, 0);

    const coldBuildMs: number[] = [];
    const listPortSweepMs: ReturnType<typeof measureListSweepV1>[] = [];
    const singleFileChangeToCurrentMs: number[] = [];
    for (let sampleIndex = 1; sampleIndex <= sampleCountV1; sampleIndex += 1) {
      const build = measureV1(() => buildAuthoringProjectIndexV1(fixture.root));
      assertIndexV1(fixture, build.value);
      coldBuildMs.push(build.durationMs);
      listPortSweepMs.push(measureListSweepV1(fixture));
      singleFileChangeToCurrentMs.push(measureSingleFileChangeV1(fixture, sampleIndex));
    }
    return {
      profile,
      documentCount,
      familyCounts: fixture.counts,
      samples: sampleCountV1,
      currentImplementationWork: {
        status: "structural_pre_change_baseline",
        productContract: false,
        coldBuild: { treeWalks: 4, fileReads: documentCount, parses: documentCount },
        listPortSweep: {
          treeWalks: 16,
          fileReads: 4 * documentCount,
          parses: 4 * documentCount,
        },
        singleFileChangeToCurrent: {
          treeWalks: 4,
          fileReads: documentCount,
          parses: documentCount,
        },
      },
      durationMs: {
        coldBuild: distributionV1(coldBuildMs),
        listPortSweep: {
          total: distributionV1(listPortSweepMs.map((sample) => sample.total)),
          scene: distributionV1(listPortSweepMs.map((sample) => sample.scene)),
          motion: distributionV1(listPortSweepMs.map((sample) => sample.motion)),
          regions: distributionV1(listPortSweepMs.map((sample) => sample.regions)),
          chromeLayout: distributionV1(listPortSweepMs.map((sample) => sample.chromeLayout)),
        },
        singleFileChangeToCurrent: distributionV1(singleFileChangeToCurrentMs),
      },
    };
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}

function outputPathV1(argv: readonly string[]): string {
  if (argv.length === 0) {
    const directory = mkdtempSync(join(tmpdir(), "sillymaker-authoring-index-report-"));
    return join(directory, "baseline.json");
  }
  const first = argv[0];
  const inline = first?.startsWith("--output=") ? first.slice("--output=".length) : null;
  const requested = inline ?? (first === "--output" ? argv[1] : undefined);
  const consumed = inline === null ? 2 : 1;
  if (requested === undefined || requested.length === 0 || argv.length !== consumed) {
    throw new TypeError("usage: deno task bench:authoring-index [--output <path>]");
  }
  return resolve(Deno.cwd(), requested);
}

function repositoryStateV1() {
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRootV1,
    encoding: "utf8",
  }).trim();
  const status = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=normal"],
    { cwd: repositoryRootV1, encoding: "utf8" },
  );
  return { revision, workingTreeModified: status.trim().length > 0 };
}

const outputPath = outputPathV1(Deno.args);
const report = {
  schemaVersion: 1,
  workload: "authoring-index-current-contract-v1",
  generatedAt: new Date().toISOString(),
  repository: repositoryStateV1(),
  environment: {
    deno: Deno.version.deno,
    v8: Deno.version.v8,
    typescript: Deno.version.typescript,
    os: Deno.build.os,
    arch: Deno.build.arch,
  },
  interpretation: {
    trendOnly: true,
    generatedDocumentsAreTemporary: true,
    coldBuildMeansFreshIndexInstanceAfterWarmup: true,
    listPortSweepUsesTheFourCurrentFamilyListContracts: true,
    singleFileChangeUsesCurrentFullRebuildPath: true,
    incrementalInvalidationAvailable: false,
    readAndParseCountsExposedByCurrentApi: false,
  },
  profiles: profilesV1.map(({ profile, documentCount }) =>
    measureProfileV1(profile, documentCount)
  ),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(outputPath);
