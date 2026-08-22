// SPDX-License-Identifier: MIT
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectChromeLayoutSourceDiagnosticsV1 } from "./chrome-layout-diagnostics.ts";

function chromeLayoutJsonV1(layoutId: string): string {
  return `${
    JSON.stringify(
      {
        format: "sillymaker.chrome-layout",
        version: 1,
        layoutId,
        label: "主场景 HUD",
        canvas: { width: 1024, height: 576 },
        boxes: { "hud.icon.stats": { x: 925, y: 510, width: 80, height: 60 } },
        anchors: {},
        offsets: {},
      },
      null,
      2,
    )
  }\n`;
}

let sourceRoot = "";

beforeEach(() => {
  sourceRoot = mkdtempSync(join(tmpdir(), "sillymaker-chrome-layout-lint-"));
  mkdirSync(join(sourceRoot, "chrome"), { recursive: true });
});

afterEach(() => {
  rmSync(sourceRoot, { recursive: true, force: true });
});

describe("collectChromeLayoutSourceDiagnosticsV1", () => {
  it("accepts consistent chrome-layout sources", () => {
    writeFileSync(
      join(sourceRoot, "chrome", "main-hud.chrome-layout.json"),
      chromeLayoutJsonV1("layout.app.main-hud"),
    );
    expect(collectChromeLayoutSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });

  it("flags invalid JSON, failed admission, duplicates, and filename drift", () => {
    writeFileSync(join(sourceRoot, "chrome", "broken.chrome-layout.json"), "{ nope\n");
    writeFileSync(
      join(sourceRoot, "chrome", "bad.chrome-layout.json"),
      `${JSON.stringify({ format: "sillymaker.chrome-layout", version: 1 })}\n`,
    );
    writeFileSync(
      join(sourceRoot, "chrome", "main-hud.chrome-layout.json"),
      chromeLayoutJsonV1("layout.app.main-hud"),
    );
    writeFileSync(
      join(sourceRoot, "chrome", "again.chrome-layout.json"),
      chromeLayoutJsonV1("layout.app.main-hud"),
    );
    writeFileSync(
      join(sourceRoot, "chrome", "drifted.chrome-layout.json"),
      chromeLayoutJsonV1("layout.app.other"),
    );

    const codes = collectChromeLayoutSourceDiagnosticsV1(sourceRoot).map(
      (diagnostic) => `${diagnostic.code}@${diagnostic.location?.file ?? ""}`,
    );
    expect(codes).toEqual([
      // Sorted scan order: "again" claims layout.app.main-hud first (and its
      // filename drifts from that id), so "main-hud" reports the duplicate.
      "chrome_layout.id_filename_mismatch@chrome/again.chrome-layout.json",
      "chrome_layout.document_invalid@chrome/bad.chrome-layout.json",
      "chrome_layout.document_json_invalid@chrome/broken.chrome-layout.json",
      "chrome_layout.id_filename_mismatch@chrome/drifted.chrome-layout.json",
      "chrome_layout.id_duplicate@chrome/main-hud.chrome-layout.json",
    ]);
  });

  it("skips node_modules and dot directories", () => {
    mkdirSync(join(sourceRoot, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(sourceRoot, "node_modules", "pkg", "x.chrome-layout.json"), "{ nope\n");
    expect(collectChromeLayoutSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });
});
