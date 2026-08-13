// SPDX-License-Identifier: MIT
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectMotionSourceDiagnosticsV1 } from "./motion-diagnostics.ts";

function motionJsonV1(motionId: string): string {
  return `${
    JSON.stringify(
      {
        format: "sillymaker.motion",
        version: 1,
        motionId,
        label: "登场",
        durationMs: 300,
        delayMs: 0,
        tracks: [
          {
            channel: "offsetX",
            keyframes: [
              { atPermille: 0, value: 120 },
              { atPermille: 1000, value: 0 },
            ],
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
  sourceRoot = mkdtempSync(join(tmpdir(), "sillymaker-motion-lint-"));
  mkdirSync(join(sourceRoot, "motions"), { recursive: true });
});

afterEach(() => {
  rmSync(sourceRoot, { recursive: true, force: true });
});

describe("collectMotionSourceDiagnosticsV1", () => {
  it("accepts consistent motion sources", () => {
    writeFileSync(
      join(sourceRoot, "motions", "enter.motion.json"),
      motionJsonV1("motion.app.enter"),
    );
    expect(collectMotionSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });

  it("flags invalid JSON, failed admission, duplicates, and filename drift", () => {
    writeFileSync(join(sourceRoot, "motions", "broken.motion.json"), "{ nope\n");
    writeFileSync(
      join(sourceRoot, "motions", "bad.motion.json"),
      `${JSON.stringify({ format: "sillymaker.motion", version: 1 })}\n`,
    );
    writeFileSync(
      join(sourceRoot, "motions", "enter.motion.json"),
      motionJsonV1("motion.app.enter"),
    );
    writeFileSync(
      join(sourceRoot, "motions", "again.motion.json"),
      motionJsonV1("motion.app.enter"),
    );
    writeFileSync(
      join(sourceRoot, "motions", "drifted.motion.json"),
      motionJsonV1("motion.app.other"),
    );

    const codes = collectMotionSourceDiagnosticsV1(sourceRoot).map(
      (diagnostic) => `${diagnostic.code}@${diagnostic.location?.file ?? ""}`,
    );
    expect(codes).toEqual([
      // Sorted scan order: "again" claims motion.app.enter first (and its
      // filename drifts from that id), so "enter" reports the duplicate.
      "motion.id_filename_mismatch@motions/again.motion.json",
      "motion.document_invalid@motions/bad.motion.json",
      "motion.document_json_invalid@motions/broken.motion.json",
      "motion.id_filename_mismatch@motions/drifted.motion.json",
      "motion.id_duplicate@motions/enter.motion.json",
    ]);
  });

  it("skips node_modules and dot directories", () => {
    mkdirSync(join(sourceRoot, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(sourceRoot, "node_modules", "pkg", "x.motion.json"), "{ nope\n");
    expect(collectMotionSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });
});
