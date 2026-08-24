// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { calculateFixedRowWindowV1, fixedRowRevealScrollTopV1 } from "./fixed-row-window.ts";

describe("fixed row window", () => {
  it("returns an empty window for an empty list", () => {
    expect(calculateFixedRowWindowV1({
      totalRows: 0,
      rowHeight: 20,
      viewportHeight: 100,
      scrollTop: 0,
      overscanRows: 2,
    })).toEqual({ start: 0, endExclusive: 0, offsetPx: 0, totalHeightPx: 0 });
  });

  it("adds bounded overscan at the top", () => {
    expect(calculateFixedRowWindowV1({
      totalRows: 1_000,
      rowHeight: 20,
      viewportHeight: 100,
      scrollTop: 0,
      overscanRows: 2,
    })).toEqual({ start: 0, endExclusive: 7, offsetPx: 0, totalHeightPx: 20_000 });
  });

  it("windows a partially visible middle row", () => {
    expect(calculateFixedRowWindowV1({
      totalRows: 1_000,
      rowHeight: 20,
      viewportHeight: 100,
      scrollTop: 210,
      overscanRows: 2,
    })).toEqual({ start: 8, endExclusive: 18, offsetPx: 160, totalHeightPx: 20_000 });
  });

  it("clamps stale scroll positions to the bottom", () => {
    expect(calculateFixedRowWindowV1({
      totalRows: 10,
      rowHeight: 20,
      viewportHeight: 60,
      scrollTop: 999,
      overscanRows: 1,
    })).toEqual({ start: 6, endExclusive: 10, offsetPx: 120, totalHeightPx: 200 });
  });

  it("returns the whole list when the viewport is taller than its contents", () => {
    expect(calculateFixedRowWindowV1({
      totalRows: 3,
      rowHeight: 20,
      viewportHeight: 200,
      scrollTop: 50,
      overscanRows: 3,
    })).toEqual({ start: 0, endExclusive: 3, offsetPx: 0, totalHeightPx: 60 });
  });

  it("makes the smallest adjustment needed to reveal a selected row", () => {
    expect(fixedRowRevealScrollTopV1({
      totalRows: 100,
      rowIndex: 12,
      rowHeight: 20,
      viewportHeight: 100,
      scrollTop: 200,
    })).toBe(200);
    expect(fixedRowRevealScrollTopV1({
      totalRows: 100,
      rowIndex: 20,
      rowHeight: 20,
      viewportHeight: 100,
      scrollTop: 200,
    })).toBe(320);
    expect(fixedRowRevealScrollTopV1({
      totalRows: 100,
      rowIndex: 2,
      rowHeight: 20,
      viewportHeight: 100,
      scrollTop: 200,
    })).toBe(40);
  });
});
