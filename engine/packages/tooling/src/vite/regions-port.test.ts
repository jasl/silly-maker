// SPDX-License-Identifier: MIT
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAuthoringProjectIndexOwnerV1,
  type AuthoringProjectIndexOwnerV1,
} from "../project/authoring-index.ts";
import {
  createRegionsSourceFileV1,
  formatRegionsDocumentV1,
  listRegionsSourceFilesV1,
  readRegionsSourceFileV1,
  writeRegionsSourceFileV1,
} from "./regions-port.ts";

const regionsPathV1 = "src/regions/body.regions.json";

const regionsJsonV1 = {
  format: "sillymaker.regions",
  version: 1,
  regionsId: "regions.test.body",
  label: "身体部位",
  regions: [
    {
      regionId: "head",
      accessibleNameText: "头",
      x: 10,
      y: 10,
      width: 80,
      height: 60,
      polygonPoints: [
        { x: 50, y: 10 },
        { x: 90, y: 70 },
        { x: 10, y: 70 },
      ],
      hoverAssetId: "asset.hover.head",
    },
    { regionId: "torso", accessibleNameText: "身体", x: 10, y: 80, width: 80, height: 100 },
  ],
} as const;

let appRoot = "";
let projectIndexOwner: AuthoringProjectIndexOwnerV1;

beforeEach(() => {
  appRoot = mkdtempSync(join(tmpdir(), "sillymaker-regions-port-"));
  mkdirSync(join(appRoot, "src", "regions"), { recursive: true });
  writeFileSync(join(appRoot, regionsPathV1), `${JSON.stringify(regionsJsonV1, null, 2)}\n`);
  projectIndexOwner = createAuthoringProjectIndexOwnerV1(appRoot);
});

afterEach(() => {
  rmSync(appRoot, { recursive: true, force: true });
});

describe("listRegionsSourceFilesV1", () => {
  it("lists admissible documents and names inadmissible files with a reason", () => {
    writeFileSync(join(appRoot, "src", "regions", "broken.regions.json"), "{ nope\n");
    const index = projectIndexOwner.snapshot();
    const countersBeforeList = projectIndexOwner.counters();
    const listed = listRegionsSourceFilesV1(index);
    expect(listed.regionsDocuments).toEqual([
      { path: regionsPathV1, regionsId: "regions.test.body", label: "身体部位" },
    ]);
    expect(listed.skipped).toHaveLength(1);
    expect(listed.skipped[0]?.path).toBe("src/regions/broken.regions.json");
    expect(listed.skipped[0]?.reason.length).toBeGreaterThan(0);
    expect(projectIndexOwner.counters()).toEqual(countersBeforeList);
  });
});

describe("readRegionsSourceFileV1", () => {
  it("returns the parsed document with a content digest", () => {
    const read = readRegionsSourceFileV1(appRoot, regionsPathV1);
    if (read.kind !== "ok") throw new Error(`read failed: ${read.code}`);
    expect(read.regionsDocument.regionsId).toBe("regions.test.body");
    expect(read.regionsDocument.regions[0]?.polygonPoints).toHaveLength(3);
    expect(read.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it("rejects non-regions paths and invalid contents", () => {
    writeFileSync(join(appRoot, "src", "regions", "broken.regions.json"), "{ nope\n");
    expect(readRegionsSourceFileV1(appRoot, "src/regions/body.json")).toMatchObject({
      code: "bad_request",
    });
    expect(readRegionsSourceFileV1(appRoot, "src/regions/missing.regions.json")).toMatchObject({
      code: "not_found",
    });
    expect(readRegionsSourceFileV1(appRoot, "src/regions/broken.regions.json")).toMatchObject({
      code: "regions_invalid",
    });
  });
});

describe("writeRegionsSourceFileV1", () => {
  it("commits a valid CAS write with deterministic formatting", () => {
    const read = readRegionsSourceFileV1(appRoot, regionsPathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    const edited = {
      ...regionsJsonV1,
      regions: [
        ...regionsJsonV1.regions,
        { regionId: "hips", accessibleNameText: "腰", x: 10, y: 190, width: 80, height: 40 },
      ],
    };
    const write = writeRegionsSourceFileV1(appRoot, {
      path: regionsPathV1,
      expectedDigest: read.digest,
      regionsDocument: edited,
    });
    if (write.kind !== "ok") throw new Error(`write failed: ${write.code}`);

    const bytes = readFileSync(join(appRoot, regionsPathV1), "utf8");
    expect(bytes.endsWith("\n")).toBe(true);
    const roundTrip = JSON.parse(bytes) as { regions: readonly unknown[] };
    expect(roundTrip.regions).toHaveLength(3);

    // The returned digest matches a follow-up read (next CAS token).
    const reread = readRegionsSourceFileV1(appRoot, regionsPathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(write.digest);

    // Formatting is canonical: rewriting the same document is byte-stable.
    expect(bytes).toBe(formatRegionsDocumentV1(reread.regionsDocument));
  });

  it("rejects stale digests without touching the file", () => {
    const before = readFileSync(join(appRoot, regionsPathV1), "utf8");
    const write = writeRegionsSourceFileV1(appRoot, {
      path: regionsPathV1,
      expectedDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      regionsDocument: regionsJsonV1,
    });
    expect(write).toMatchObject({ kind: "error", code: "digest_conflict" });
    expect(readFileSync(join(appRoot, regionsPathV1), "utf8")).toBe(before);
  });

  it("rejects schema violations and regions id changes", () => {
    const read = readRegionsSourceFileV1(appRoot, regionsPathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    expect(
      writeRegionsSourceFileV1(appRoot, {
        path: regionsPathV1,
        expectedDigest: read.digest,
        regionsDocument: { ...regionsJsonV1, label: "" },
      }),
    ).toMatchObject({ kind: "error", code: "regions_invalid" });

    expect(
      writeRegionsSourceFileV1(appRoot, {
        path: regionsPathV1,
        expectedDigest: read.digest,
        regionsDocument: { ...regionsJsonV1, regionsId: "regions.test.other" },
      }),
    ).toMatchObject({ kind: "error", code: "regions_id_mismatch" });

    // Neither rejection touched the file.
    const reread = readRegionsSourceFileV1(appRoot, regionsPathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(read.digest);
  });
});

describe("createRegionsSourceFileV1", () => {
  it("creates a new document (missing directories included) and indexes it", () => {
    const created = createRegionsSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
      path: "src/scenes/opening/regions/mei.regions.json",
      regionsDocument: { ...regionsJsonV1, regionsId: "regions.test.mei" },
    });
    if (created.kind !== "ok") throw new Error(`create failed: ${created.code}`);
    projectIndexOwner.invalidate("src/scenes/opening/regions/mei.regions.json");
    const reread = readRegionsSourceFileV1(
      appRoot,
      "src/scenes/opening/regions/mei.regions.json",
    );
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(created.digest);
    expect(
      listRegionsSourceFilesV1(projectIndexOwner.snapshot()).regionsDocuments.map((entry) =>
        entry.regionsId
      ),
    )
      .toEqual(["regions.test.body", "regions.test.mei"]);
  });

  it("rejects existing files, duplicate regions ids, and id-stem mismatches", () => {
    expect(
      createRegionsSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: regionsPathV1,
        regionsDocument: regionsJsonV1,
      }),
    ).toMatchObject({ code: "already_exists" });

    expect(
      createRegionsSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: "src/regions/body2.regions.json",
        regionsDocument: regionsJsonV1,
      }),
    ).toMatchObject({ code: "regions_id_mismatch" });

    expect(
      createRegionsSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: "src/scenes/opening/regions/body.regions.json",
        regionsDocument: regionsJsonV1,
      }),
    ).toMatchObject({ code: "already_exists" });

    expect(
      createRegionsSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: "src/regions/broken2.regions.json",
        regionsDocument: { nope: true },
      }),
    ).toMatchObject({ code: "regions_invalid" });

    expect(
      createRegionsSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: "../outside/outside.regions.json",
        regionsDocument: regionsJsonV1,
      }),
    ).toMatchObject({ code: "bad_request" });
  });
});
