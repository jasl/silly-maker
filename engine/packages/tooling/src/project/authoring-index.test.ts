// SPDX-License-Identifier: MIT
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildAuthoringProjectIndexV1,
  createAuthoringProjectIndexOwnerV1,
} from "./authoring-index.ts";
import { collectChromeLayoutSourceDiagnosticsV1 } from "./chrome-layout-diagnostics.ts";
import { collectMotionSourceDiagnosticsV1 } from "./motion-diagnostics.ts";
import { collectRegionsSourceDiagnosticsV1 } from "./regions-diagnostics.ts";
import { collectSceneSourceDiagnosticsV1 } from "./scene-diagnostics.ts";

function sceneJsonV1(sceneId: string, label = "场景"): string {
  return `${
    JSON.stringify({
      format: "sillymaker.scene",
      version: 1,
      sceneId,
      label,
      canvas: { width: 1280, height: 720 },
      entries: [
        { layerId: "layer.app.characters", tag: "tag.hero", contentId: "content.app.hero" },
      ],
      cues: [{ cueId: `cue.${sceneId}.hero-enters`, kind: "show", tag: "tag.hero" }],
    })
  }\n`;
}

function authoringSceneJsonV1(
  sceneId: string,
  label = "场景",
  objectCount = 1,
): string {
  const serial = sceneId.split(".").at(-1) ?? "scene";
  return `${
    JSON.stringify({
      format: "sillymaker.authoring-scene",
      version: 1,
      sceneId,
      label,
      canvas: { width: 1280, height: 720 },
      layers: [
        {
          layerId: "layer.app.objects",
          label: "对象",
          roots: Array.from({ length: objectCount }, (_, index) => ({
            objectId: `tag.app.${serial}.object-${String(index).padStart(3, "0")}`,
            label: `对象 ${String(index)}`,
          })),
        },
      ],
      cues: [],
    })
  }\n`;
}

function motionJsonV1(motionId: string, label = "动效"): string {
  return `${
    JSON.stringify({
      format: "sillymaker.motion",
      version: 1,
      motionId,
      label,
      durationMs: 300,
      delayMs: 0,
      tracks: [
        {
          channel: "offsetX",
          keyframes: [{ atPermille: 0, value: 120 }, { atPermille: 1000, value: 0 }],
        },
      ],
    })
  }\n`;
}

function regionsJsonV1(regionsId: string, label = "区域"): string {
  return `${
    JSON.stringify({
      format: "sillymaker.regions",
      version: 1,
      regionsId,
      label,
      regions: [
        { regionId: "head", accessibleNameText: "头", x: 10, y: 10, width: 80, height: 60 },
      ],
    })
  }\n`;
}

function chromeLayoutJsonV1(layoutId: string, label = "布局"): string {
  return `${
    JSON.stringify({
      format: "sillymaker.chrome-layout",
      version: 1,
      layoutId,
      label,
      canvas: { width: 1024, height: 576 },
      boxes: { "hud.icon.stats": { x: 925, y: 510, width: 80, height: 60 } },
      anchors: {},
      offsets: {},
    })
  }\n`;
}

let sourceRoot = "";

beforeEach(() => {
  sourceRoot = mkdtempSync(join(tmpdir(), "sillymaker-authoring-index-"));
  mkdirSync(join(sourceRoot, "scenes", "opening", "motions"), { recursive: true });
});

afterEach(() => {
  rmSync(sourceRoot, { recursive: true, force: true });
});

describe("buildAuthoringProjectIndexV1", () => {
  it("enumerates scenes and motions by convention in deterministic order", () => {
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening", "开场"),
    );
    mkdirSync(join(sourceRoot, "scenes", "backyard"), { recursive: true });
    writeFileSync(
      join(sourceRoot, "scenes", "backyard", "backyard.scene.json"),
      sceneJsonV1("scene.app.backyard", "后院"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "motions", "enter.motion.json"),
      motionJsonV1("motion.app.enter", "登场"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "mei.regions.json"),
      regionsJsonV1("regions.app.mei", "小妹"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "main-hud.chrome-layout.json"),
      chromeLayoutJsonV1("layout.app.main-hud", "主 HUD"),
    );

    const index = buildAuthoringProjectIndexV1(sourceRoot);
    expect(index.scenes).toEqual([
      {
        path: "scenes/backyard/backyard.scene.json",
        sceneId: "scene.app.backyard",
        label: "后院",
        sourceKind: "low_level_scene",
      },
      {
        path: "scenes/opening/opening.scene.json",
        sceneId: "scene.app.opening",
        label: "开场",
        sourceKind: "low_level_scene",
      },
    ]);
    expect(index.motions).toEqual([
      {
        path: "scenes/opening/motions/enter.motion.json",
        motionId: "motion.app.enter",
        label: "登场",
      },
    ]);
    expect(index.regions).toEqual([
      {
        path: "scenes/opening/mei.regions.json",
        regionsId: "regions.app.mei",
        label: "小妹",
      },
    ]);
    expect(index.chromeLayouts).toEqual([
      {
        path: "scenes/main-hud.chrome-layout.json",
        layoutId: "layout.app.main-hud",
        label: "主 HUD",
      },
    ]);
    expect(index.skipped).toEqual([]);
  });

  it("indexes both explicit scene source authorities from their admitted bytes", () => {
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening", "低层开场"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "garden.authoring-scene.json"),
      authoringSceneJsonV1("scene.app.garden", "对象场景", 3),
    );

    const owner = createAuthoringProjectIndexOwnerV1(sourceRoot);
    expect(owner.snapshot().scenes).toEqual([
      {
        path: "scenes/opening/garden.authoring-scene.json",
        sceneId: "scene.app.garden",
        label: "对象场景",
        sourceKind: "authoring_scene",
      },
      {
        path: "scenes/opening/opening.scene.json",
        sceneId: "scene.app.opening",
        label: "低层开场",
        sourceKind: "low_level_scene",
      },
    ]);
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 2,
      parses: 2,
      invalidations: 0,
    });
  });

  it("names inadmissible files with a structured reason instead of dropping them", () => {
    writeFileSync(join(sourceRoot, "scenes", "broken.scene.json"), "{ nope\n");
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "motions", "bad.motion.json"),
      `${JSON.stringify({ format: "sillymaker.motion" })}\n`,
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "bad.regions.json"),
      `${JSON.stringify({ format: "sillymaker.regions" })}\n`,
    );
    writeFileSync(
      join(sourceRoot, "scenes", "bad.chrome-layout.json"),
      `${JSON.stringify({ format: "sillymaker.chrome-layout" })}\n`,
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening"),
    );

    const index = buildAuthoringProjectIndexV1(sourceRoot);
    expect(index.scenes.map((scene) => scene.path)).toEqual([
      "scenes/opening/opening.scene.json",
    ]);
    expect(index.motions).toEqual([]);
    expect(index.regions).toEqual([]);
    expect(index.chromeLayouts).toEqual([]);
    expect(index.skipped.map((skip) => `${skip.kind}@${skip.path}`)).toEqual([
      "scene@scenes/broken.scene.json",
      "motion@scenes/opening/motions/bad.motion.json",
      "regions@scenes/opening/bad.regions.json",
      "chrome-layout@scenes/bad.chrome-layout.json",
    ]);
    for (const skip of index.skipped) expect(skip.reason.length).toBeGreaterThan(0);
  });

  it("skips node_modules, dot directories, and symlinked files", () => {
    mkdirSync(join(sourceRoot, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(sourceRoot, "node_modules", "pkg", "x.scene.json"), "{ nope\n");
    mkdirSync(join(sourceRoot, ".cache"), { recursive: true });
    writeFileSync(join(sourceRoot, ".cache", "y.motion.json"), "{ nope\n");
    writeFileSync(join(sourceRoot, ".cache", "z.regions.json"), "{ nope\n");
    writeFileSync(join(sourceRoot, ".cache", "w.chrome-layout.json"), "{ nope\n");
    expect(buildAuthoringProjectIndexV1(sourceRoot)).toEqual({
      scenes: [],
      motions: [],
      regions: [],
      chromeLayouts: [],
      skipped: [],
    });
  });

  it("agrees with the app-check lints about which files exist (S2 parity)", () => {
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening"),
    );
    writeFileSync(join(sourceRoot, "scenes", "broken.scene.json"), "{ nope\n");
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "motions", "enter.motion.json"),
      motionJsonV1("motion.app.enter"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "motions", "broken.motion.json"),
      "{ nope\n",
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "mei.regions.json"),
      regionsJsonV1("regions.app.mei"),
    );
    writeFileSync(join(sourceRoot, "scenes", "opening", "broken.regions.json"), "{ nope\n");
    writeFileSync(
      join(sourceRoot, "scenes", "main-hud.chrome-layout.json"),
      chromeLayoutJsonV1("layout.app.main-hud"),
    );
    writeFileSync(join(sourceRoot, "scenes", "broken.chrome-layout.json"), "{ nope\n");

    const index = buildAuthoringProjectIndexV1(sourceRoot);
    const indexedPaths = [
      ...index.scenes.map((scene) => scene.path),
      ...index.motions.map((motion) => motion.path),
      ...index.regions.map((entry) => entry.path),
      ...index.chromeLayouts.map((entry) => entry.path),
      ...index.skipped.map((skip) => skip.path),
    ].toSorted();

    // Every file the index skipped is a lint finding at the same path, and
    // every lint-visible file is index-visible: one walk, two consumers.
    const lintFlagged = [
      ...collectSceneSourceDiagnosticsV1(sourceRoot),
      ...collectMotionSourceDiagnosticsV1(sourceRoot),
      ...collectRegionsSourceDiagnosticsV1(sourceRoot),
      ...collectChromeLayoutSourceDiagnosticsV1(sourceRoot),
    ].map((diagnostic) => diagnostic.location?.file ?? "");
    for (const skip of index.skipped) expect(lintFlagged).toContain(skip.path);
    expect(indexedPaths).toEqual([
      "scenes/broken.chrome-layout.json",
      "scenes/broken.scene.json",
      "scenes/main-hud.chrome-layout.json",
      "scenes/opening/broken.regions.json",
      "scenes/opening/mei.regions.json",
      "scenes/opening/motions/broken.motion.json",
      "scenes/opening/motions/enter.motion.json",
      "scenes/opening/opening.scene.json",
    ]);
  });
});

describe("createAuthoringProjectIndexOwnerV1", () => {
  it("lazily builds every family with one walk and serves cached snapshots without IO", () => {
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "motions", "enter.motion.json"),
      motionJsonV1("motion.app.enter"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "mei.regions.json"),
      regionsJsonV1("regions.app.mei"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "main-hud.chrome-layout.json"),
      chromeLayoutJsonV1("layout.app.main-hud"),
    );

    const owner = createAuthoringProjectIndexOwnerV1(sourceRoot);
    expect(owner.counters()).toEqual({
      treeWalks: 0,
      fileReads: 0,
      parses: 0,
      invalidations: 0,
    });

    const first = owner.snapshot();
    expect(first.scenes).toHaveLength(1);
    expect(first.motions).toHaveLength(1);
    expect(first.regions).toHaveLength(1);
    expect(first.chromeLayouts).toHaveLength(1);
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 4,
      parses: 4,
      invalidations: 0,
    });

    expect(owner.snapshot()).toBe(first);
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 4,
      parses: 4,
      invalidations: 0,
    });
  });

  it("re-reads and admits only the invalidated source record", () => {
    const scenePath = join(sourceRoot, "scenes", "opening", "opening.scene.json");
    writeFileSync(scenePath, sceneJsonV1("scene.app.opening", "开场"));
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "motions", "enter.motion.json"),
      motionJsonV1("motion.app.enter"),
    );
    const owner = createAuthoringProjectIndexOwnerV1(sourceRoot);
    owner.snapshot();

    writeFileSync(scenePath, sceneJsonV1("scene.app.opening", "新开场"));
    owner.invalidate("scenes/opening/opening.scene.json");
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 2,
      parses: 2,
      invalidations: 1,
    });

    const next = owner.snapshot();
    expect(next.scenes).toEqual([
      {
        path: "scenes/opening/opening.scene.json",
        sceneId: "scene.app.opening",
        label: "新开场",
        sourceKind: "low_level_scene",
      },
    ]);
    expect(next.motions).toHaveLength(1);
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 3,
      parses: 3,
      invalidations: 1,
    });
  });

  it("recovers the same record across valid, invalid, and valid revisions", () => {
    const scenePath = join(sourceRoot, "scenes", "opening", "opening.scene.json");
    const relativePath = "scenes/opening/opening.scene.json";
    writeFileSync(scenePath, sceneJsonV1("scene.app.opening", "开场"));
    const owner = createAuthoringProjectIndexOwnerV1(sourceRoot);
    owner.snapshot();

    writeFileSync(scenePath, "{ nope\n");
    owner.invalidate(relativePath);
    const invalid = owner.snapshot();
    expect(invalid.scenes).toEqual([]);
    expect(invalid.skipped.map((entry) => `${entry.kind}@${entry.path}`)).toEqual([
      `scene@${relativePath}`,
    ]);

    writeFileSync(scenePath, sceneJsonV1("scene.app.opening", "恢复"));
    owner.invalidate(relativePath);
    const recovered = owner.snapshot();
    expect(recovered.scenes).toEqual([
      {
        path: relativePath,
        sceneId: "scene.app.opening",
        label: "恢复",
        sourceKind: "low_level_scene",
      },
    ]);
    expect(recovered.skipped).toEqual([]);
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 3,
      parses: 3,
      invalidations: 2,
    });
  });

  it("adds and unlinks one record without another tree walk", () => {
    const owner = createAuthoringProjectIndexOwnerV1(sourceRoot);
    expect(owner.snapshot().scenes).toEqual([]);

    const scenePath = join(sourceRoot, "scenes", "opening", "opening.scene.json");
    const relativePath = "scenes/opening/opening.scene.json";
    writeFileSync(scenePath, sceneJsonV1("scene.app.opening"));
    owner.invalidate(relativePath);
    expect(owner.snapshot().scenes).toHaveLength(1);

    unlinkSync(scenePath);
    owner.invalidate(relativePath);
    expect(owner.snapshot().scenes).toEqual([]);
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 1,
      parses: 1,
      invalidations: 2,
    });
  });

  it("keeps invalidated records behind symlinked directories outside the project", () => {
    const outsideRoot = mkdtempSync(join(tmpdir(), "sillymaker-authoring-index-outside-"));
    try {
      writeFileSync(
        join(outsideRoot, "outside.scene.json"),
        sceneJsonV1("scene.outside", "外部"),
      );
      symlinkSync(outsideRoot, join(sourceRoot, "linked"));

      const owner = createAuthoringProjectIndexOwnerV1(sourceRoot);
      expect(owner.snapshot().scenes).toEqual([]);
      owner.invalidate("linked/outside.scene.json");
      expect(owner.snapshot().scenes).toEqual([]);
      expect(owner.counters()).toEqual({
        treeWalks: 1,
        fileReads: 0,
        parses: 0,
        invalidations: 1,
      });
    } finally {
      rmSync(outsideRoot, { recursive: true, force: true });
    }
  });

  it("coalesces repeated watcher events for one path and reads the latest file contents", () => {
    const scenePath = join(sourceRoot, "scenes", "opening", "opening.scene.json");
    const relativePath = "scenes/opening/opening.scene.json";
    writeFileSync(scenePath, sceneJsonV1("scene.app.opening", "开场"));
    const owner = createAuthoringProjectIndexOwnerV1(sourceRoot);
    owner.snapshot();

    writeFileSync(scenePath, sceneJsonV1("scene.app.opening", "中间"));
    owner.invalidate(relativePath);
    writeFileSync(scenePath, sceneJsonV1("scene.app.opening", "最终"));
    owner.invalidate(relativePath);

    expect(owner.snapshot().scenes[0]?.label).toBe("最终");
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 2,
      parses: 2,
      invalidations: 2,
    });
  });

  it("re-admits only one changed authoring scene", () => {
    const scenePath = join(
      sourceRoot,
      "scenes",
      "opening",
      "opening.authoring-scene.json",
    );
    const relativePath = "scenes/opening/opening.authoring-scene.json";
    writeFileSync(scenePath, authoringSceneJsonV1("scene.app.opening", "开场", 3));
    const owner = createAuthoringProjectIndexOwnerV1(sourceRoot);
    owner.snapshot();

    writeFileSync(scenePath, authoringSceneJsonV1("scene.app.opening", "新开场", 3));
    owner.invalidate(relativePath);
    expect(owner.snapshot().scenes).toEqual([
      {
        path: relativePath,
        sceneId: "scene.app.opening",
        label: "新开场",
        sourceKind: "authoring_scene",
      },
    ]);
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 2,
      parses: 2,
      invalidations: 1,
    });
  });

  it("indexes the 1,000-scene / 50,000-object generated structure without retaining documents", () => {
    let generatedObjectCount = 0;
    for (let sceneIndex = 0; sceneIndex < 1_000; sceneIndex += 1) {
      const serial = String(sceneIndex).padStart(4, "0");
      const directory = join(sourceRoot, "scale", serial.slice(0, 2));
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(directory, `s${serial}.authoring-scene.json`),
        authoringSceneJsonV1(`scene.scale.s${serial}`, `场景 ${serial}`, 50),
      );
      generatedObjectCount += 50;
    }

    const owner = createAuthoringProjectIndexOwnerV1(sourceRoot);
    const index = owner.snapshot();
    expect(index.scenes).toHaveLength(1_000);
    expect(index.scenes.every((scene) => scene.sourceKind === "authoring_scene")).toBe(true);
    expect(generatedObjectCount).toBe(50_000);
    expect(owner.counters()).toEqual({
      treeWalks: 1,
      fileReads: 1_000,
      parses: 1_000,
      invalidations: 0,
    });
  });
});
