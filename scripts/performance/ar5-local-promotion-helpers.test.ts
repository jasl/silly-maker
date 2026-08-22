// SPDX-License-Identifier: MIT
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ar5InterleavedRunOrderV1,
  judgeAr5LocalPromotionV1,
  medianV1,
  parseAr5LocalPromotionOptionsV1,
  summarizeAr5PairedMetricV1,
} from "./ar5-local-promotion-helpers.ts";

describe("AR5 local promotion helpers", () => {
  it("parses two repository roots and keeps five pairs as the local floor", () => {
    expect(
      parseAr5LocalPromotionOptionsV1(
        ["--baseline-root", "../baseline", "--candidate-root=../candidate"],
        "/work/current",
      ),
    ).toEqual({
      baselineRoot: resolve("/work/current", "../baseline"),
      candidateRoot: resolve("/work/current", "../candidate"),
      pairs: 5,
    });
    expect(
      parseAr5LocalPromotionOptionsV1(
        [
          "--baseline-root=/baseline",
          "--candidate-root",
          "/candidate",
          "--pairs",
          "7",
          "--output=reports/ar5.json",
        ],
        "/work/current",
      ),
    ).toEqual({
      baselineRoot: resolve("/baseline"),
      candidateRoot: resolve("/candidate"),
      pairs: 7,
      output: resolve("/work/current/reports/ar5.json"),
    });
  });

  it("rejects incomplete, ambiguous, and undersized runner arguments", () => {
    expect(() => parseAr5LocalPromotionOptionsV1([], "/work")).toThrow(
      "--baseline-root is required",
    );
    expect(() =>
      parseAr5LocalPromotionOptionsV1(
        ["--baseline-root", "/a", "--candidate-root", "/b", "--pairs", "4"],
        "/work",
      )
    ).toThrow("--pairs must be at least 5");
    expect(() =>
      parseAr5LocalPromotionOptionsV1(
        ["--baseline-root", "/a", "--baseline-root", "/b", "--candidate-root", "/c"],
        "/work",
      )
    ).toThrow("may only be provided once");
    expect(() =>
      parseAr5LocalPromotionOptionsV1(
        ["--baseline-root", "/a", "--candidate-root", "/b", "--machine-id", "x"],
        "/work",
      )
    ).toThrow("unknown argument");
    expect(() =>
      parseAr5LocalPromotionOptionsV1(
        ["--baseline-root", "./same", "--candidate-root", "/work/same"],
        "/work",
      )
    ).toThrow("must differ");
  });

  it("alternates revision order within five complete pairs", () => {
    expect(ar5InterleavedRunOrderV1(5)).toEqual([
      { pairIndex: 1, orderIndex: 0, revision: "baseline" },
      { pairIndex: 1, orderIndex: 1, revision: "candidate" },
      { pairIndex: 2, orderIndex: 0, revision: "candidate" },
      { pairIndex: 2, orderIndex: 1, revision: "baseline" },
      { pairIndex: 3, orderIndex: 0, revision: "baseline" },
      { pairIndex: 3, orderIndex: 1, revision: "candidate" },
      { pairIndex: 4, orderIndex: 0, revision: "candidate" },
      { pairIndex: 4, orderIndex: 1, revision: "baseline" },
      { pairIndex: 5, orderIndex: 0, revision: "baseline" },
      { pairIndex: 5, orderIndex: 1, revision: "candidate" },
    ]);
    expect(() => ar5InterleavedRunOrderV1(4)).toThrow("at least 5");
  });

  it("reports raw pair deltas and medians without mutating input order", () => {
    const pairs = [
      { pairIndex: 1, baselineMs: 100, candidateMs: 112 },
      { pairIndex: 2, baselineMs: 110, candidateMs: 121 },
      { pairIndex: 3, baselineMs: 90, candidateMs: 99 },
      { pairIndex: 4, baselineMs: 105, candidateMs: 117 },
      { pairIndex: 5, baselineMs: 95, candidateMs: 104.5 },
    ];
    const summary = summarizeAr5PairedMetricV1(pairs);

    expect(summary.raw.map((pair) => pair.pairIndex)).toEqual([1, 2, 3, 4, 5]);
    expect(summary.raw[0]).toEqual({
      pairIndex: 1,
      baselineMs: 100,
      candidateMs: 112,
      deltaMs: 12,
      deltaPercent: 12,
    });
    expect(summary.median.baselineMs).toBe(100);
    expect(summary.median.candidateMs).toBe(112);
    expect(summary.median.deltaMs).toBe(11);
    expect(summary.median.deltaPercent).toBeCloseTo(10);
    expect(medianV1([4, 1, 3, 2])).toBe(2.5);
    expect(pairs[0]).toEqual({ pairIndex: 1, baselineMs: 100, candidateMs: 112 });
  });

  it("requires a repeat for the dual first-action threshold and stops on command regression", () => {
    const repeated = (baselineMs: number, candidateMs: number) =>
      summarizeAr5PairedMetricV1(
        Array.from({ length: 5 }, (_, index) => ({
          pairIndex: index + 1,
          baselineMs,
          candidateMs,
        })),
      );
    const stable = repeated(100, 105);
    const firstActionRegression = repeated(400, 451);

    expect(
      judgeAr5LocalPromotionV1({
        firstActionable: firstActionRegression,
        stableCommand: stable,
      }),
    ).toMatchObject({
      decision: "repeat_required",
      stop: false,
      firstActionable: { thresholdExceeded: true },
      stableCommand: { thresholdExceeded: false },
    });
    expect(
      judgeAr5LocalPromotionV1({
        firstActionable: stable,
        stableCommand: repeated(100, 111),
      }),
    ).toMatchObject({
      decision: "stop",
      stop: true,
      stableCommand: { thresholdExceeded: true },
    });
    expect(
      judgeAr5LocalPromotionV1({
        firstActionable: repeated(400, 450),
        stableCommand: repeated(100, 110),
      }),
    ).toMatchObject({ decision: "continue", stop: false });
  });
});
