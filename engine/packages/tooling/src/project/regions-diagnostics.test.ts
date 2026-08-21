// SPDX-License-Identifier: MIT
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectRegionsSourceDiagnosticsV1 } from "./regions-diagnostics.ts";

function regionsJsonV1(regionsId: string): string {
  return `${
    JSON.stringify(
      {
        format: "sillymaker.regions",
        version: 1,
        regionsId,
        label: "身体部位",
        regions: [
          { regionId: "head", accessibleNameText: "头", x: 10, y: 10, width: 80, height: 60 },
        ],
      },
      null,
      2,
    )
  }\n`;
}

let sourceRoot = "";

beforeEach(() => {
  sourceRoot = mkdtempSync(join(tmpdir(), "sillymaker-regions-lint-"));
  mkdirSync(join(sourceRoot, "regions"), { recursive: true });
});

afterEach(() => {
  rmSync(sourceRoot, { recursive: true, force: true });
});

describe("collectRegionsSourceDiagnosticsV1", () => {
  it("accepts consistent regions sources", () => {
    writeFileSync(
      join(sourceRoot, "regions", "body.regions.json"),
      regionsJsonV1("regions.app.body"),
    );
    expect(collectRegionsSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });

  it("flags invalid JSON, failed admission, duplicates, and filename drift", () => {
    writeFileSync(join(sourceRoot, "regions", "broken.regions.json"), "{ nope\n");
    writeFileSync(
      join(sourceRoot, "regions", "bad.regions.json"),
      `${JSON.stringify({ format: "sillymaker.regions", version: 1 })}\n`,
    );
    writeFileSync(
      join(sourceRoot, "regions", "body.regions.json"),
      regionsJsonV1("regions.app.body"),
    );
    writeFileSync(
      join(sourceRoot, "regions", "again.regions.json"),
      regionsJsonV1("regions.app.body"),
    );
    writeFileSync(
      join(sourceRoot, "regions", "drifted.regions.json"),
      regionsJsonV1("regions.app.other"),
    );

    const codes = collectRegionsSourceDiagnosticsV1(sourceRoot).map(
      (diagnostic) => `${diagnostic.code}@${diagnostic.location?.file ?? ""}`,
    );
    expect(codes).toEqual([
      // Sorted scan order: "again" claims regions.app.body first (and its
      // filename drifts from that id), so "body" reports the duplicate.
      "regions.id_filename_mismatch@regions/again.regions.json",
      "regions.document_invalid@regions/bad.regions.json",
      "regions.id_duplicate@regions/body.regions.json",
      "regions.document_json_invalid@regions/broken.regions.json",
      "regions.id_filename_mismatch@regions/drifted.regions.json",
    ]);
  });

  it("skips node_modules and dot directories", () => {
    mkdirSync(join(sourceRoot, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(sourceRoot, "node_modules", "pkg", "x.regions.json"), "{ nope\n");
    expect(collectRegionsSourceDiagnosticsV1(sourceRoot)).toEqual([]);
  });
});
