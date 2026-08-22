// SPDX-License-Identifier: MIT
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createChromeLayoutSourceFileV1,
  formatChromeLayoutDocumentV1,
  listChromeLayoutSourceFilesV1,
  readChromeLayoutSourceFileV1,
  writeChromeLayoutSourceFileV1,
} from "./chrome-layout-port.ts";

const layoutPathV1 = "src/chrome/main-hud.chrome-layout.json";

const layoutJsonV1 = {
  format: "sillymaker.chrome-layout",
  version: 1,
  layoutId: "layout.test.main-hud",
  label: "主场景 HUD",
  canvas: { width: 1024, height: 576 },
  boxes: {
    "board.item.tab.peek": { x: -16, y: 240, width: 40, height: 100 },
    "hud.icon.stats": { x: 925, y: 510, width: 80, height: 60 },
  },
  anchors: { "sheet.back": { x: 900, y: 16 } },
  offsets: { "board.value-nudge-y": 8 },
} as const;

let appRoot = "";

beforeEach(() => {
  appRoot = mkdtempSync(join(tmpdir(), "sillymaker-chrome-layout-port-"));
  mkdirSync(join(appRoot, "src", "chrome"), { recursive: true });
  writeFileSync(join(appRoot, layoutPathV1), `${JSON.stringify(layoutJsonV1, null, 2)}\n`);
});

afterEach(() => {
  rmSync(appRoot, { recursive: true, force: true });
});

describe("listChromeLayoutSourceFilesV1", () => {
  it("lists admissible documents and names inadmissible files with a reason", () => {
    writeFileSync(join(appRoot, "src", "chrome", "broken.chrome-layout.json"), "{ nope\n");
    const listed = listChromeLayoutSourceFilesV1(appRoot);
    expect(listed.chromeLayouts).toEqual([
      { path: layoutPathV1, layoutId: "layout.test.main-hud", label: "主场景 HUD" },
    ]);
    expect(listed.skipped).toHaveLength(1);
    expect(listed.skipped[0]?.path).toBe("src/chrome/broken.chrome-layout.json");
    expect(listed.skipped[0]?.reason.length).toBeGreaterThan(0);
  });
});

describe("readChromeLayoutSourceFileV1", () => {
  it("returns the parsed document with a content digest", () => {
    const read = readChromeLayoutSourceFileV1(appRoot, layoutPathV1);
    if (read.kind !== "ok") throw new Error(`read failed: ${read.code}`);
    expect(read.chromeLayoutDocument.layoutId).toBe("layout.test.main-hud");
    expect(read.chromeLayoutDocument.boxes["board.item.tab.peek"]?.x).toBe(-16);
    expect(read.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it("rejects non-layout paths and invalid contents", () => {
    writeFileSync(join(appRoot, "src", "chrome", "broken.chrome-layout.json"), "{ nope\n");
    expect(readChromeLayoutSourceFileV1(appRoot, "src/chrome/main-hud.json")).toMatchObject({
      code: "bad_request",
    });
    expect(readChromeLayoutSourceFileV1(appRoot, "src/chrome/missing.chrome-layout.json"))
      .toMatchObject({ code: "not_found" });
    expect(readChromeLayoutSourceFileV1(appRoot, "src/chrome/broken.chrome-layout.json"))
      .toMatchObject({ code: "chrome_layout_invalid" });
  });
});

describe("writeChromeLayoutSourceFileV1", () => {
  it("commits a valid CAS write with deterministic formatting", () => {
    const read = readChromeLayoutSourceFileV1(appRoot, layoutPathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    const edited = {
      ...layoutJsonV1,
      boxes: {
        ...layoutJsonV1.boxes,
        "hud.icon.album": { x: 925, y: 410, width: 80, height: 60 },
      },
    };
    const write = writeChromeLayoutSourceFileV1(appRoot, {
      path: layoutPathV1,
      expectedDigest: read.digest,
      chromeLayoutDocument: edited,
    });
    if (write.kind !== "ok") throw new Error(`write failed: ${write.code}`);

    const bytes = readFileSync(join(appRoot, layoutPathV1), "utf8");
    expect(bytes.endsWith("\n")).toBe(true);
    const roundTrip = JSON.parse(bytes) as { boxes: Readonly<Record<string, unknown>> };
    expect(Object.keys(roundTrip.boxes)).toHaveLength(3);

    // The returned digest matches a follow-up read (next CAS token).
    const reread = readChromeLayoutSourceFileV1(appRoot, layoutPathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(write.digest);

    // Formatting is canonical: rewriting the same document is byte-stable.
    expect(bytes).toBe(formatChromeLayoutDocumentV1(reread.chromeLayoutDocument));
  });

  it("rejects stale digests without touching the file", () => {
    const before = readFileSync(join(appRoot, layoutPathV1), "utf8");
    const write = writeChromeLayoutSourceFileV1(appRoot, {
      path: layoutPathV1,
      expectedDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      chromeLayoutDocument: layoutJsonV1,
    });
    expect(write).toMatchObject({ kind: "error", code: "digest_conflict" });
    expect(readFileSync(join(appRoot, layoutPathV1), "utf8")).toBe(before);
  });

  it("rejects schema violations and layout id changes", () => {
    const read = readChromeLayoutSourceFileV1(appRoot, layoutPathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    expect(
      writeChromeLayoutSourceFileV1(appRoot, {
        path: layoutPathV1,
        expectedDigest: read.digest,
        chromeLayoutDocument: { ...layoutJsonV1, label: "" },
      }),
    ).toMatchObject({ kind: "error", code: "chrome_layout_invalid" });

    expect(
      writeChromeLayoutSourceFileV1(appRoot, {
        path: layoutPathV1,
        expectedDigest: read.digest,
        chromeLayoutDocument: { ...layoutJsonV1, layoutId: "layout.test.other" },
      }),
    ).toMatchObject({ kind: "error", code: "chrome_layout_id_mismatch" });

    // Neither rejection touched the file.
    const reread = readChromeLayoutSourceFileV1(appRoot, layoutPathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(read.digest);
  });
});

describe("createChromeLayoutSourceFileV1", () => {
  it("creates a new document (missing directories included) and indexes it", () => {
    const created = createChromeLayoutSourceFileV1(appRoot, {
      path: "src/chrome/sheets/album-sheet.chrome-layout.json",
      chromeLayoutDocument: { ...layoutJsonV1, layoutId: "layout.test.album-sheet" },
    });
    if (created.kind !== "ok") throw new Error(`create failed: ${created.code}`);
    const reread = readChromeLayoutSourceFileV1(
      appRoot,
      "src/chrome/sheets/album-sheet.chrome-layout.json",
    );
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(created.digest);
    expect(listChromeLayoutSourceFilesV1(appRoot).chromeLayouts.map((entry) => entry.layoutId))
      .toEqual(["layout.test.main-hud", "layout.test.album-sheet"]);
  });

  it("rejects existing files, duplicate layout ids, and id-stem mismatches", () => {
    expect(
      createChromeLayoutSourceFileV1(appRoot, {
        path: layoutPathV1,
        chromeLayoutDocument: layoutJsonV1,
      }),
    ).toMatchObject({ code: "already_exists" });

    expect(
      createChromeLayoutSourceFileV1(appRoot, {
        path: "src/chrome/main-hud2.chrome-layout.json",
        chromeLayoutDocument: layoutJsonV1,
      }),
    ).toMatchObject({ code: "chrome_layout_id_mismatch" });

    expect(
      createChromeLayoutSourceFileV1(appRoot, {
        path: "src/sheets/main-hud.chrome-layout.json",
        chromeLayoutDocument: layoutJsonV1,
      }),
    ).toMatchObject({ code: "already_exists" });

    expect(
      createChromeLayoutSourceFileV1(appRoot, {
        path: "src/chrome/broken2.chrome-layout.json",
        chromeLayoutDocument: { nope: true },
      }),
    ).toMatchObject({ code: "chrome_layout_invalid" });

    expect(
      createChromeLayoutSourceFileV1(appRoot, {
        path: "../outside/outside.chrome-layout.json",
        chromeLayoutDocument: layoutJsonV1,
      }),
    ).toMatchObject({ code: "bad_request" });
  });
});
