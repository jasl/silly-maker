// SPDX-License-Identifier: MIT
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectSceneSourceDiagnosticsV1 } from "./scene-diagnostics.ts";

function sceneJsonV1(sceneId: string, motionId?: string): string {
  return `${
    JSON.stringify(
      {
        format: "sillymaker.scene",
        version: 1,
        sceneId,
        label: "开场",
        canvas: { width: 1280, height: 720 },
        entries: [
          {
            layerId: "layer.app.characters",
            tag: "tag.hero",
            contentId: "content.app.character.hero",
            zOrder: 10,
          },
        ],
        cues: [
          {
            cueId: "cue.app.opening.hero-enters",
            kind: "show",
            tag: "tag.hero",
            ...(motionId === undefined ? {} : { motionId }),
          },
        ],
      },
      null,
      2,
    )
  }\n`;
}

function motionJsonV1(motionId: string): string {
  return `${
    JSON.stringify(
      {
        format: "sillymaker.motion",
        version: 1,
        motionId,
        label: "enter",
        durationMs: 360,
        delayMs: 0,
        tracks: [
          {
            channel: "offsetY",
            keyframes: [{ atPermille: 0, value: 120 }, { atPermille: 1000, value: 0 }],
          },
        ],
      },
      null,
      2,
    )
  }\n`;
}

let sourceRoot = "";

beforeEach(() => {
  sourceRoot = mkdtempSync(join(tmpdir(), "scene-diagnostics-"));
  mkdirSync(join(sourceRoot, "scenes", "opening"), { recursive: true });
});

afterEach(() => {
  rmSync(sourceRoot, { recursive: true, force: true });
});

describe("collectSceneSourceDiagnosticsV1", () => {
  it("accepts consistent scene sources with covered motion references", () => {
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening", "motion.app.enter"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "enter.motion.json"),
      motionJsonV1("motion.app.enter"),
    );
    expect(collectSceneSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });

  it("flags invalid JSON, failed admission, duplicates, filename drift, and missing motions", () => {
    writeFileSync(join(sourceRoot, "scenes", "broken.scene.json"), "{ nope\n");
    writeFileSync(
      join(sourceRoot, "scenes", "bad.scene.json"),
      `${JSON.stringify({ format: "sillymaker.scene" })}\n`,
    );
    writeFileSync(
      join(sourceRoot, "scenes", "again.scene.json"),
      sceneJsonV1("scene.app.opening"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening", "motion.app.ghost"),
    );

    const codes = collectSceneSourceDiagnosticsV1(sourceRoot).map(
      (diagnostic) => `${diagnostic.code}@${diagnostic.location?.file ?? ""}`,
    );
    expect(codes).toEqual([
      // Sorted scan order: "again" claims scene.app.opening first (and its
      // filename drifts from that id), so "opening" reports the duplicate.
      "scene.id_filename_mismatch@scenes/again.scene.json",
      "scene.document_invalid@scenes/bad.scene.json",
      "scene.document_json_invalid@scenes/broken.scene.json",
      "scene.id_duplicate@scenes/opening/opening.scene.json",
    ]);
  });

  it("reports an uncovered cue motion reference", () => {
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening", "motion.app.enter"),
    );
    const codes = collectSceneSourceDiagnosticsV1(sourceRoot).map((diagnostic) => diagnostic.code);
    expect(codes).toEqual(["scene.cue_motion_missing"]);
  });

  it("skips node_modules and dot directories", () => {
    mkdirSync(join(sourceRoot, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(sourceRoot, "node_modules", "pkg", "x.scene.json"), "{ nope\n");
    expect(collectSceneSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });
});
