// SPDX-License-Identifier: MIT
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type AuthoringProjectIndexCountersV1,
  type AuthoringProjectIndexOwnerV1,
  type AuthoringProjectIndexV1,
  createAuthoringProjectIndexOwnerV1,
} from "../src/project/authoring-index.ts";
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
  readonly changedSceneRelativePath: string;
  readonly changedSceneSourceKind: "authoring_scene" | "low_level_scene";
  readonly counts: Readonly<Record<DocumentFamilyV1, number>>;
  readonly sceneSourceCounts: Readonly<{
    readonly authoringScene: number;
    readonly lowLevelScene: number;
  }>;
  readonly generatedObjectCount: number;
  readonly objectsPerAuthoringScene: number;
}

type IndexProfileV1 =
  | { readonly profile: "index-reference"; readonly kind: "reference"; readonly documentCount: 10 }
  | {
    readonly profile: "index-scale";
    readonly kind: "authoring-object-scale";
    readonly documentCount: 1_000;
    readonly objectsPerScene: 50;
  };

const repositoryRootV1 = fileURLToPath(new URL("../../../..", import.meta.url));
const sampleCountV1 = 5;
const familiesV1: readonly DocumentFamilyV1[] = [
  "scene",
  "motion",
  "regions",
  "chrome-layout",
];
const profilesV1: readonly IndexProfileV1[] = [
  { profile: "index-reference", kind: "reference", documentCount: 10 },
  {
    profile: "index-scale",
    kind: "authoring-object-scale",
    documentCount: 1_000,
    objectsPerScene: 50,
  },
];

function serialV1(index: number): string {
  return String(index).padStart(6, "0");
}

function sourcePathV1(
  root: string,
  family: DocumentFamilyV1,
  index: number,
  sceneSourceKind: "authoring_scene" | "low_level_scene" = "low_level_scene",
): string {
  const serial = serialV1(index);
  const bucket = String(Math.floor(index / 10)).padStart(3, "0");
  const stem = family === "scene"
    ? `s${serial}`
    : family === "motion"
    ? `m${serial}`
    : family === "regions"
    ? `r${serial}`
    : `l${serial}`;
  const suffix = family === "scene" && sceneSourceKind === "authoring_scene"
    ? "authoring-scene.json"
    : family === "chrome-layout"
    ? "chrome-layout.json"
    : `${family}.json`;
  return join(root, "sources", `bucket-${bucket}`, `${stem}.${suffix}`);
}

function sourceBytesV1(
  family: DocumentFamilyV1,
  index: number,
  labelSuffix = "",
  sceneSourceKind: "authoring_scene" | "low_level_scene" = "low_level_scene",
  objectsPerAuthoringScene = 0,
): string {
  const serial = serialV1(index);
  const label = `${family} ${serial}${labelSuffix}`;
  const document = family === "scene" && sceneSourceKind === "authoring_scene"
    ? {
      format: "sillymaker.authoring-scene",
      version: 1,
      sceneId: `scene.scale.s${serial}`,
      label,
      canvas: { width: 1280, height: 720 },
      layers: [
        {
          layerId: "layer.scale.objects",
          label: "Objects",
          roots: Array.from({ length: objectsPerAuthoringScene }, (_, objectIndex) => ({
            objectId: `tag.scale.s${serial}.object-${String(objectIndex).padStart(3, "0")}`,
            label: `Object ${String(objectIndex)}`,
          })),
        },
      ],
      cues: [],
    }
    : family === "scene"
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

function createFixtureV1(profile: IndexProfileV1): FixtureV1 {
  const root = mkdtempSync(
    join(tmpdir(), `sillymaker-authoring-index-${profile.documentCount}-`),
  );
  const counts: Record<DocumentFamilyV1, number> = {
    scene: 0,
    motion: 0,
    regions: 0,
    "chrome-layout": 0,
  };
  const sceneSourceCounts = { authoringScene: 0, lowLevelScene: 0 };
  let generatedObjectCount = 0;
  for (let index = 0; index < profile.documentCount; index += 1) {
    const family = profile.kind === "authoring-object-scale"
      ? "scene"
      : familiesV1[index % familiesV1.length]!;
    const sceneSourceKind = profile.kind === "authoring-object-scale"
      ? "authoring_scene"
      : "low_level_scene";
    const path = sourcePathV1(root, family, index, sceneSourceKind);
    mkdirSync(dirname(path), { recursive: true });
    const objectsPerAuthoringScene = profile.kind === "authoring-object-scale"
      ? profile.objectsPerScene
      : 0;
    writeFileSync(
      path,
      sourceBytesV1(family, index, "", sceneSourceKind, objectsPerAuthoringScene),
    );
    counts[family] += 1;
    if (family === "scene") {
      if (sceneSourceKind === "authoring_scene") {
        sceneSourceCounts.authoringScene += 1;
        generatedObjectCount += objectsPerAuthoringScene;
      } else {
        sceneSourceCounts.lowLevelScene += 1;
      }
    }
  }
  const changedSceneSourceKind = profile.kind === "authoring-object-scale"
    ? "authoring_scene"
    : "low_level_scene";
  return {
    root,
    changedScenePath: sourcePathV1(root, "scene", 0, changedSceneSourceKind),
    changedSceneRelativePath: changedSceneSourceKind === "authoring_scene"
      ? "sources/bucket-000/s000000.authoring-scene.json"
      : "sources/bucket-000/s000000.scene.json",
    changedSceneSourceKind,
    counts,
    sceneSourceCounts,
    generatedObjectCount,
    objectsPerAuthoringScene: profile.kind === "authoring-object-scale"
      ? profile.objectsPerScene
      : 0,
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

function assertIndexV1(fixture: FixtureV1, index: AuthoringProjectIndexV1) {
  assertCountV1("scene count", index.scenes.length, fixture.counts.scene);
  assertCountV1(
    "authoring scene count",
    index.scenes.filter((scene) => scene.sourceKind === "authoring_scene").length,
    fixture.sceneSourceCounts.authoringScene,
  );
  assertCountV1(
    "low-level scene count",
    index.scenes.filter((scene) => scene.sourceKind === "low_level_scene").length,
    fixture.sceneSourceCounts.lowLevelScene,
  );
  assertCountV1("motion count", index.motions.length, fixture.counts.motion);
  assertCountV1("regions count", index.regions.length, fixture.counts.regions);
  assertCountV1(
    "chrome-layout count",
    index.chromeLayouts.length,
    fixture.counts["chrome-layout"],
  );
  assertCountV1("skipped count", index.skipped.length, 0);
}

function counterDeltaV1(
  before: AuthoringProjectIndexCountersV1,
  after: AuthoringProjectIndexCountersV1,
): AuthoringProjectIndexCountersV1 {
  return {
    treeWalks: after.treeWalks - before.treeWalks,
    fileReads: after.fileReads - before.fileReads,
    parses: after.parses - before.parses,
    invalidations: after.invalidations - before.invalidations,
  };
}

function assertWorkV1(
  subject: string,
  actual: AuthoringProjectIndexCountersV1,
  expected: AuthoringProjectIndexCountersV1,
): void {
  for (const key of ["treeWalks", "fileReads", "parses", "invalidations"] as const) {
    assertCountV1(`${subject} ${key}`, actual[key], expected[key]);
  }
}

function measureColdBuildV1(fixture: FixtureV1) {
  const owner = createAuthoringProjectIndexOwnerV1(fixture.root);
  const before = owner.counters();
  const measured = measureV1(() => owner.snapshot());
  const work = counterDeltaV1(before, owner.counters());
  assertIndexV1(fixture, measured.value);
  assertWorkV1("cold build", work, {
    treeWalks: 1,
    fileReads: fixture.counts.scene + fixture.counts.motion + fixture.counts.regions +
      fixture.counts["chrome-layout"],
    parses: fixture.counts.scene + fixture.counts.motion + fixture.counts.regions +
      fixture.counts["chrome-layout"],
    invalidations: 0,
  });
  return { owner, durationMs: measured.durationMs, work };
}

function measureListSweepV1(
  fixture: FixtureV1,
  owner: AuthoringProjectIndexOwnerV1,
) {
  const index = owner.snapshot();
  const before = owner.counters();
  const startedAt = performance.now();
  const sceneIndex = measureV1(() => {
    let authoringScene = 0;
    let lowLevelScene = 0;
    for (const scene of index.scenes) {
      if (scene.sourceKind === "authoring_scene") authoringScene += 1;
      else lowLevelScene += 1;
    }
    return { authoringScene, lowLevelScene };
  });
  const lowLevelScenePort = measureV1(() => listSceneSourceFilesV1(index));
  const motion = measureV1(() => listMotionSourceFilesV1(index));
  const regions = measureV1(() => listRegionsSourceFilesV1(index));
  const chromeLayout = measureV1(() => listChromeLayoutSourceFilesV1(index));
  assertCountV1(
    "authoring scene index count",
    sceneIndex.value.authoringScene,
    fixture.sceneSourceCounts.authoringScene,
  );
  assertCountV1(
    "low-level scene index count",
    sceneIndex.value.lowLevelScene,
    fixture.sceneSourceCounts.lowLevelScene,
  );
  assertCountV1(
    "legacy scene list count",
    lowLevelScenePort.value.scenes.length,
    fixture.sceneSourceCounts.lowLevelScene,
  );
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
    lowLevelScenePort.value.skipped.length + motion.value.skipped.length +
      regions.value.skipped.length + chromeLayout.value.skipped.length,
    0,
  );
  const work = counterDeltaV1(before, owner.counters());
  assertWorkV1("cached list-port sweep", work, {
    treeWalks: 0,
    fileReads: 0,
    parses: 0,
    invalidations: 0,
  });
  return {
    total: performance.now() - startedAt,
    sceneIndex: sceneIndex.durationMs,
    lowLevelScenePort: lowLevelScenePort.durationMs,
    motion: motion.durationMs,
    regions: regions.durationMs,
    chromeLayout: chromeLayout.durationMs,
    work,
  };
}

function measureSingleFileChangeV1(
  fixture: FixtureV1,
  owner: AuthoringProjectIndexOwnerV1,
  sampleIndex: number,
) {
  const labelSuffix = ` revision-${String(sampleIndex)}`;
  const before = owner.counters();
  const startedAt = performance.now();
  writeFileSync(
    fixture.changedScenePath,
    sourceBytesV1(
      "scene",
      0,
      labelSuffix,
      fixture.changedSceneSourceKind,
      fixture.objectsPerAuthoringScene,
    ),
  );
  owner.invalidate(fixture.changedSceneRelativePath);
  const result = owner.snapshot();
  const durationMs = performance.now() - startedAt;
  const changed = result.scenes.find((scene) => scene.sceneId === "scene.scale.s000000");
  if (changed?.label !== `scene 000000${labelSuffix}`) {
    throw new Error("single-file change was not visible through the current scene list contract");
  }
  if (changed.sourceKind !== fixture.changedSceneSourceKind) {
    throw new Error("single-file change moved between scene source authorities");
  }
  const work = counterDeltaV1(before, owner.counters());
  assertWorkV1("single-file change", work, {
    treeWalks: 0,
    fileReads: 1,
    parses: 1,
    invalidations: 1,
  });
  return { durationMs, work };
}

function measureProfileV1(profile: IndexProfileV1) {
  const fixture = createFixtureV1(profile);
  try {
    const warmup = measureColdBuildV1(fixture);
    measureListSweepV1(fixture, warmup.owner);
    measureSingleFileChangeV1(fixture, warmup.owner, 0);

    const coldBuildMs: number[] = [];
    const listPortSweepMs: ReturnType<typeof measureListSweepV1>[] = [];
    const singleFileChangeToCurrent: ReturnType<typeof measureSingleFileChangeV1>[] = [];
    const coldBuildWork: AuthoringProjectIndexCountersV1[] = [];
    for (let sampleIndex = 1; sampleIndex <= sampleCountV1; sampleIndex += 1) {
      const build = measureColdBuildV1(fixture);
      coldBuildMs.push(build.durationMs);
      coldBuildWork.push(build.work);
      listPortSweepMs.push(measureListSweepV1(fixture, build.owner));
      singleFileChangeToCurrent.push(
        measureSingleFileChangeV1(fixture, build.owner, sampleIndex),
      );
    }
    return {
      profile: profile.profile,
      documentCount: profile.documentCount,
      familyCounts: fixture.counts,
      sceneSourceCounts: fixture.sceneSourceCounts,
      generatedObjectCount: fixture.generatedObjectCount,
      samples: sampleCountV1,
      measuredWork: {
        source: "project-index-owner-counters",
        coldBuild: coldBuildWork,
        listPortSweep: listPortSweepMs.map((sample) => sample.work),
        singleFileChangeToCurrent: singleFileChangeToCurrent.map((sample) => sample.work),
      },
      durationMs: {
        coldBuild: distributionV1(coldBuildMs),
        listPortSweep: {
          total: distributionV1(listPortSweepMs.map((sample) => sample.total)),
          sceneIndex: distributionV1(
            listPortSweepMs.map((sample) => sample.sceneIndex),
          ),
          lowLevelScenePort: distributionV1(
            listPortSweepMs.map((sample) => sample.lowLevelScenePort),
          ),
          motion: distributionV1(listPortSweepMs.map((sample) => sample.motion)),
          regions: distributionV1(listPortSweepMs.map((sample) => sample.regions)),
          chromeLayout: distributionV1(listPortSweepMs.map((sample) => sample.chromeLayout)),
        },
        singleFileChangeToCurrent: distributionV1(
          singleFileChangeToCurrent.map((sample) => sample.durationMs),
        ),
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
  schemaVersion: 3,
  workload: "authoring-index-incremental-v2",
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
    scaleProfileContainsOneThousandAuthoringScenesAndFiftyThousandObjects: true,
    coldBuildMeansFreshIndexInstanceAfterWarmup: true,
    cachedListSweepUsesOneSharedSnapshotAcrossIndexAndLegacyFamilyViews: true,
    singleFileChangeInvalidatesOnePathOnTheSameOwner: true,
    counterDeltasAreMeasuredByTheProjectIndexOwner: true,
    counterDeltasAreStructuralAcceptanceNotMachineTimingThresholds: true,
  },
  profiles: profilesV1.map(measureProfileV1),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(outputPath);
