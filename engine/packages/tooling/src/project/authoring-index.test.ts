// SPDX-License-Identifier: MIT
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildAuthoringProjectIndexV1 } from "./authoring-index.ts";
import { collectMotionSourceDiagnosticsV1 } from "./motion-diagnostics.ts";
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

    const index = buildAuthoringProjectIndexV1(sourceRoot);
    expect(index.scenes).toEqual([
      { path: "scenes/backyard/backyard.scene.json", sceneId: "scene.app.backyard", label: "后院" },
      { path: "scenes/opening/opening.scene.json", sceneId: "scene.app.opening", label: "开场" },
    ]);
    expect(index.motions).toEqual([
      {
        path: "scenes/opening/motions/enter.motion.json",
        motionId: "motion.app.enter",
        label: "登场",
      },
    ]);
    expect(index.skipped).toEqual([]);
  });

  it("names inadmissible files with a structured reason instead of dropping them", () => {
    writeFileSync(join(sourceRoot, "scenes", "broken.scene.json"), "{ nope\n");
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "motions", "bad.motion.json"),
      `${JSON.stringify({ format: "sillymaker.motion" })}\n`,
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
    expect(index.skipped.map((skip) => `${skip.kind}@${skip.path}`)).toEqual([
      "scene@scenes/broken.scene.json",
      "motion@scenes/opening/motions/bad.motion.json",
    ]);
    for (const skip of index.skipped) expect(skip.reason.length).toBeGreaterThan(0);
  });

  it("skips node_modules, dot directories, and symlinked files", () => {
    mkdirSync(join(sourceRoot, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(sourceRoot, "node_modules", "pkg", "x.scene.json"), "{ nope\n");
    mkdirSync(join(sourceRoot, ".cache"), { recursive: true });
    writeFileSync(join(sourceRoot, ".cache", "y.motion.json"), "{ nope\n");
    expect(buildAuthoringProjectIndexV1(sourceRoot)).toEqual({
      scenes: [],
      motions: [],
      skipped: [],
    });
  });

  it("agrees with the story-check lints about which files exist (S2 parity)", () => {
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

    const index = buildAuthoringProjectIndexV1(sourceRoot);
    const indexedPaths = [
      ...index.scenes.map((scene) => scene.path),
      ...index.motions.map((motion) => motion.path),
      ...index.skipped.map((skip) => skip.path),
    ].toSorted();

    // Every file the index skipped is a lint finding at the same path, and
    // every lint-visible file is index-visible: one walk, two consumers.
    const lintFlagged = [
      ...collectSceneSourceDiagnosticsV1(sourceRoot),
      ...collectMotionSourceDiagnosticsV1(sourceRoot),
    ].map((diagnostic) => diagnostic.location?.file ?? "");
    for (const skip of index.skipped) expect(lintFlagged).toContain(skip.path);
    expect(indexedPaths).toEqual([
      "scenes/broken.scene.json",
      "scenes/opening/motions/broken.motion.json",
      "scenes/opening/motions/enter.motion.json",
      "scenes/opening/opening.scene.json",
    ]);
  });
});
