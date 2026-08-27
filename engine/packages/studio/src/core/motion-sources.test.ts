// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseMotionDocumentV1 } from "@sillymaker/base";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import { loadInspectorMotionSourcesV1 } from "./motion-sources.ts";

function motionV1(id: string) {
  return parseMotionDocumentV1({
    format: "sillymaker.motion",
    version: 1,
    motionId: id,
    label: id,
    durationMs: 100,
    delayMs: 0,
    tracks: [{
      channel: "offsetX",
      keyframes: [{ atPermille: 0, value: 0 }, { atPermille: 1_000, value: 10 }],
    }],
  });
}

describe("Inspector motion source loading", () => {
  it("reads only current-Scene references", async () => {
    const reads: string[] = [];
    const io: MotionSourceIoV1 = {
      async list() {
        return {
          kind: "ok",
          motions: [
            { path: "a.motion.json", motionId: "motion.test.a", label: "A" },
            { path: "b.motion.json", motionId: "motion.test.b", label: "B" },
          ],
          skipped: [],
        };
      },
      async read(path) {
        reads.push(path);
        return {
          kind: "ok",
          digest: `digest:${path}`,
          motionDocument: motionV1(path.startsWith("a") ? "motion.test.a" : "motion.test.b"),
        };
      },
      async write() {
        return { kind: "error", code: "unavailable" };
      },
      async create() {
        return { kind: "error", code: "unavailable" };
      },
    };
    const loaded = await loadInspectorMotionSourcesV1(io, ["motion.test.b"]);
    expect(reads).toEqual(["b.motion.json"]);
    expect([...loaded.definitions]).toHaveLength(1);
    expect(loaded.options.map((entry) => entry.motionId)).toEqual([
      "motion.test.a",
      "motion.test.b",
    ]);
    expect(loaded.warnings).toEqual([]);
  });

  it("reports missing references without reading unrelated documents", async () => {
    let readCount = 0;
    const io: MotionSourceIoV1 = {
      async list() {
        return {
          kind: "ok",
          motions: [{ path: "a.motion.json", motionId: "motion.test.a", label: "A" }],
          skipped: [],
        };
      },
      async read() {
        readCount += 1;
        return { kind: "error", code: "not_found" };
      },
      async write() {
        return { kind: "error", code: "unavailable" };
      },
      async create() {
        return { kind: "error", code: "unavailable" };
      },
    };
    const loaded = await loadInspectorMotionSourcesV1(io, ["motion.test.missing"]);
    expect(readCount).toBe(0);
    expect(loaded.options.map((entry) => entry.motionId)).toEqual(["motion.test.a"]);
    expect(loaded.warnings).toEqual(["motion 引用未找到：motion.test.missing"]);
  });

  it("lists metadata choices without loading unrelated Motion documents", async () => {
    let readCount = 0;
    const io: MotionSourceIoV1 = {
      list: () =>
        Promise.resolve({
          kind: "ok",
          motions: [{ path: "a.motion.json", motionId: "motion.test.a", label: "A" }],
          skipped: [],
        }),
      read: () => {
        readCount += 1;
        return Promise.resolve({ kind: "error", code: "not_found" });
      },
      write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
      create: () => Promise.resolve({ kind: "error", code: "unavailable" }),
    };

    const loaded = await loadInspectorMotionSourcesV1(io, []);
    expect(loaded.options).toEqual([
      { path: "a.motion.json", motionId: "motion.test.a", label: "A" },
    ]);
    expect(readCount).toBe(0);
  });
});
