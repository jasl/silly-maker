// SPDX-License-Identifier: MIT
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectSceneSourceDiagnosticsV1 } from "./scene-diagnostics.ts";

function sceneJsonV1(
  sceneId: string,
  motionId?: string,
  options?: { readonly contentId?: string; readonly cueId?: string; readonly cut?: true },
): string {
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
            contentId: options?.contentId ?? "content.app.character.hero",
            zOrder: 10,
          },
        ],
        cues: [
          {
            cueId: options?.cueId ?? "cue.app.opening.hero-enters",
            kind: "show",
            tag: "tag.hero",
            ...(motionId === undefined ? {} : { motionId }),
            ...(options?.cut === undefined ? {} : { cut: true }),
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

  it("reports an uncovered ambient motion reference and accepts a covered one", () => {
    const ambientScene = (motionId: string): string =>
      `${
        JSON.stringify(
          {
            format: "sillymaker.scene",
            version: 1,
            sceneId: "scene.app.opening",
            label: "开场",
            canvas: { width: 1280, height: 720 },
            entries: [
              {
                layerId: "layer.app.characters",
                tag: "tag.hero",
                contentId: "content.app.character.hero",
                zOrder: 10,
                ambient: { motionId, phaseMs: 100 },
              },
            ],
            cues: [{ cueId: "cue.app.opening.hero-enters", kind: "show", tag: "tag.hero" }],
          },
          null,
          2,
        )
      }\n`;
    const scenePath = join(sourceRoot, "scenes", "opening", "opening.scene.json");
    writeFileSync(scenePath, ambientScene("motion.app.breathe"));
    expect(
      collectSceneSourceDiagnosticsV1(sourceRoot).map((diagnostic) => diagnostic.code),
    ).toEqual(["scene.ambient_motion_missing"]);

    writeFileSync(
      join(sourceRoot, "scenes", "opening", "breathe.motion.json"),
      motionJsonV1("motion.app.breathe"),
    );
    expect(collectSceneSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });

  it("skips node_modules and dot directories", () => {
    mkdirSync(join(sourceRoot, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(sourceRoot, "node_modules", "pkg", "x.scene.json"), "{ nope\n");
    expect(collectSceneSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });

  it("accepts two scenes declaring divergent presentations on one stage edge", () => {
    // Legal per-cue bindings since cue identity (accepted 2026-08-17): each
    // scene's dispatch resolves its own declaration through presentation
    // edge context, so divergent declared-vs-declared edges no longer
    // diagnose. Final lint disposition is re-evaluated after the clone
    // migration completes (owner ruling #3).
    mkdirSync(join(sourceRoot, "scenes", "living-room"), { recursive: true });
    mkdirSync(join(sourceRoot, "scenes", "yard"), { recursive: true });
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening", "motion.app.peek"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "living-room", "living-room.scene.json"),
      sceneJsonV1("scene.app.living-room", "motion.app.breakfast", {
        cueId: "cue.app.living-room.hero-enters",
      }),
    );
    // An explicit cut is a declaration too, not a bare-cue leak.
    writeFileSync(
      join(sourceRoot, "scenes", "yard", "yard.scene.json"),
      sceneJsonV1("scene.app.yard", undefined, {
        cueId: "cue.app.yard.hero-pops",
        cut: true,
      }),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "peek.motion.json"),
      motionJsonV1("motion.app.peek"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "living-room", "breakfast.motion.json"),
      motionJsonV1("motion.app.breakfast"),
    );

    expect(collectSceneSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });

  it("flags a bound edge that another scene leaves unbound", () => {
    mkdirSync(join(sourceRoot, "scenes", "living-room"), { recursive: true });
    // Sorted scan order: living-room registers the unbound edge first, so
    // the binding opening file reports the pairing and names the leak site.
    writeFileSync(
      join(sourceRoot, "scenes", "living-room", "living-room.scene.json"),
      sceneJsonV1("scene.app.living-room", undefined, {
        cueId: "cue.app.living-room.hero-enters",
      }),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening", "motion.app.peek"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "peek.motion.json"),
      motionJsonV1("motion.app.peek"),
    );

    const diagnostics = collectSceneSourceDiagnosticsV1(sourceRoot);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "scene.cue_binding_scope_collision",
    ]);
    expect(diagnostics[0]?.location?.file).toBe("scenes/opening/opening.scene.json");
    expect(diagnostics[0]?.message).toContain("cue.app.living-room.hero-enters");
    expect(diagnostics[0]?.message).toContain("motion.app.peek");
  });

  it("flags an unbound cue whose edge another scene already binds", () => {
    mkdirSync(join(sourceRoot, "scenes", "yard"), { recursive: true });
    // Sorted scan order: opening binds the edge first, so the later yard
    // file reports the leak from the unbound side.
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening", "motion.app.peek"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "peek.motion.json"),
      motionJsonV1("motion.app.peek"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "yard", "yard.scene.json"),
      sceneJsonV1("scene.app.yard", undefined, { cueId: "cue.app.yard.hero-enters" }),
    );

    const diagnostics = collectSceneSourceDiagnosticsV1(sourceRoot);
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "scene.cue_binding_scope_collision",
    ]);
    expect(diagnostics[0]?.location?.file).toBe("scenes/yard/yard.scene.json");
    expect(diagnostics[0]?.message).toContain("cue.app.opening.hero-enters");
  });

  it("accepts one motion shared by the same edge across scenes and distinct edges", () => {
    mkdirSync(join(sourceRoot, "scenes", "living-room"), { recursive: true });
    mkdirSync(join(sourceRoot, "scenes", "backyard"), { recursive: true });
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "opening.scene.json"),
      sceneJsonV1("scene.app.opening", "motion.app.peek"),
    );
    // Same edge, same motion: order cannot change what plays.
    writeFileSync(
      join(sourceRoot, "scenes", "living-room", "living-room.scene.json"),
      sceneJsonV1("scene.app.living-room", "motion.app.peek", {
        cueId: "cue.app.living-room.hero-enters",
      }),
    );
    // Different content: a different edge tuple entirely.
    writeFileSync(
      join(sourceRoot, "scenes", "backyard", "backyard.scene.json"),
      sceneJsonV1("scene.app.backyard", "motion.app.breakfast", {
        cueId: "cue.app.backyard.hero-enters",
        contentId: "content.app.character.hero-raincoat",
      }),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "opening", "peek.motion.json"),
      motionJsonV1("motion.app.peek"),
    );
    writeFileSync(
      join(sourceRoot, "scenes", "backyard", "breakfast.motion.json"),
      motionJsonV1("motion.app.breakfast"),
    );
    expect(collectSceneSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });
});
