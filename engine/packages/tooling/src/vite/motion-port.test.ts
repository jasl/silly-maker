// SPDX-License-Identifier: MIT
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createMotionSourceFileV1,
  formatMotionDocumentV1,
  listMotionSourceFilesV1,
  readMotionSourceFileV1,
  writeMotionSourceFileV1,
} from "./motion-port.ts";

const motionPathV1 = "src/motions/enter.motion.json";

const motionJsonV1 = {
  format: "sillymaker.motion",
  version: 1,
  motionId: "motion.test.enter",
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
} as const;

let appRoot = "";

beforeEach(() => {
  appRoot = mkdtempSync(join(tmpdir(), "sillymaker-motion-port-"));
  mkdirSync(join(appRoot, "src", "motions"), { recursive: true });
  writeFileSync(join(appRoot, motionPathV1), `${JSON.stringify(motionJsonV1, null, 2)}\n`);
});

afterEach(() => {
  rmSync(appRoot, { recursive: true, force: true });
});

describe("listMotionSourceFilesV1", () => {
  it("lists admissible motions and names inadmissible files with a reason", () => {
    writeFileSync(join(appRoot, "src", "motions", "broken.motion.json"), "{ nope\n");
    const listed = listMotionSourceFilesV1(appRoot);
    expect(listed.motions).toEqual([
      { path: motionPathV1, motionId: "motion.test.enter", label: "登场" },
    ]);
    expect(listed.skipped).toHaveLength(1);
    expect(listed.skipped[0]?.path).toBe("src/motions/broken.motion.json");
    expect(listed.skipped[0]?.reason.length).toBeGreaterThan(0);
  });
});

describe("readMotionSourceFileV1", () => {
  it("returns the parsed document with a content digest", () => {
    const read = readMotionSourceFileV1(appRoot, motionPathV1);
    if (read.kind !== "ok") throw new Error(`read failed: ${read.code}`);
    expect(read.motionDocument.motionId).toBe("motion.test.enter");
    expect(read.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it("rejects non-motion paths and invalid contents", () => {
    writeFileSync(join(appRoot, "src", "motions", "broken.motion.json"), "{ nope\n");
    expect(readMotionSourceFileV1(appRoot, "src/motions/enter.json")).toMatchObject({
      code: "bad_request",
    });
    expect(readMotionSourceFileV1(appRoot, "src/motions/missing.motion.json")).toMatchObject({
      code: "not_found",
    });
    expect(readMotionSourceFileV1(appRoot, "src/motions/broken.motion.json")).toMatchObject({
      code: "motion_invalid",
    });
  });
});

describe("writeMotionSourceFileV1", () => {
  it("commits a valid CAS write with deterministic formatting", () => {
    const read = readMotionSourceFileV1(appRoot, motionPathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    const edited = { ...motionJsonV1, durationMs: 470 };
    const write = writeMotionSourceFileV1(appRoot, {
      path: motionPathV1,
      expectedDigest: read.digest,
      motionDocument: edited,
    });
    if (write.kind !== "ok") throw new Error(`write failed: ${write.code}`);

    const bytes = readFileSync(join(appRoot, motionPathV1), "utf8");
    expect(bytes.endsWith("\n")).toBe(true);
    const roundTrip = JSON.parse(bytes) as { durationMs: number };
    expect(roundTrip.durationMs).toBe(470);

    // The returned digest matches a follow-up read (next CAS token).
    const reread = readMotionSourceFileV1(appRoot, motionPathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(write.digest);

    // Formatting is canonical: rewriting the same document is byte-stable.
    expect(bytes).toBe(formatMotionDocumentV1(reread.motionDocument));
  });

  it("rejects stale digests without touching the file", () => {
    const before = readFileSync(join(appRoot, motionPathV1), "utf8");
    const write = writeMotionSourceFileV1(appRoot, {
      path: motionPathV1,
      expectedDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      motionDocument: { ...motionJsonV1, durationMs: 470 },
    });
    expect(write).toMatchObject({ kind: "error", code: "digest_conflict" });
    expect(readFileSync(join(appRoot, motionPathV1), "utf8")).toBe(before);
  });

  it("rejects schema violations and motion id changes", () => {
    const read = readMotionSourceFileV1(appRoot, motionPathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    expect(
      writeMotionSourceFileV1(appRoot, {
        path: motionPathV1,
        expectedDigest: read.digest,
        motionDocument: { ...motionJsonV1, durationMs: -5 },
      }),
    ).toMatchObject({ kind: "error", code: "motion_invalid" });

    expect(
      writeMotionSourceFileV1(appRoot, {
        path: motionPathV1,
        expectedDigest: read.digest,
        motionDocument: { ...motionJsonV1, motionId: "motion.test.other" },
      }),
    ).toMatchObject({ kind: "error", code: "motion_id_mismatch" });

    // Neither rejection touched the file.
    const reread = readMotionSourceFileV1(appRoot, motionPathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(read.digest);
  });
});

describe("createMotionSourceFileV1", () => {
  it("creates a new motion (missing directories included) and indexes it", () => {
    const created = createMotionSourceFileV1(appRoot, {
      path: "src/scenes/opening/motions/hero-exit.motion.json",
      motionDocument: { ...motionJsonV1, motionId: "motion.test.hero-exit" },
    });
    if (created.kind !== "ok") throw new Error(`create failed: ${created.code}`);
    const reread = readMotionSourceFileV1(
      appRoot,
      "src/scenes/opening/motions/hero-exit.motion.json",
    );
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(created.digest);
    expect(listMotionSourceFilesV1(appRoot).motions.map((motion) => motion.motionId)).toEqual([
      "motion.test.enter",
      "motion.test.hero-exit",
    ]);
  });

  it("rejects existing files, duplicate motion ids, and id-stem mismatches", () => {
    expect(
      createMotionSourceFileV1(appRoot, { path: motionPathV1, motionDocument: motionJsonV1 }),
    ).toMatchObject({ code: "already_exists" });

    expect(
      createMotionSourceFileV1(appRoot, {
        path: "src/motions/enter2.motion.json",
        motionDocument: motionJsonV1,
      }),
    ).toMatchObject({ code: "motion_id_mismatch" });

    expect(
      createMotionSourceFileV1(appRoot, {
        path: "src/scenes/opening/motions/enter.motion.json",
        motionDocument: motionJsonV1,
      }),
    ).toMatchObject({ code: "already_exists" });

    expect(
      createMotionSourceFileV1(appRoot, {
        path: "src/motions/broken2.motion.json",
        motionDocument: { nope: true },
      }),
    ).toMatchObject({ code: "motion_invalid" });

    expect(
      createMotionSourceFileV1(appRoot, {
        path: "../outside/outside.motion.json",
        motionDocument: motionJsonV1,
      }),
    ).toMatchObject({ code: "bad_request" });
  });
});
