// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { RegionsDocumentV1 } from "@sillymaker/base";
import { parseRegionsDocumentV1 } from "@sillymaker/base";

import {
  addRegionV1,
  clearPolygonV1,
  editRegionsDocumentV1,
  graduateRegionsDocumentV1,
  inferRegionsIdPrefixV1,
  insertVertexV1,
  moveRegionV1,
  moveVertexV1,
  newRegionsDocumentV1,
  regionsDraftBlockingIssueV1,
  removeRegionV1,
  removeVertexV1,
  resizeRegionV1,
  seedPolygonV1,
} from "./regions-edit.ts";

function documentV1(): RegionsDocumentV1 {
  return parseRegionsDocumentV1({
    format: "sillymaker.regions",
    version: 1,
    regionsId: "regions.test.hero",
    label: "主角区域",
    regions: [
      {
        regionId: "zone.head",
        accessibleNameText: "摸头",
        x: -50,
        y: -300,
        width: 100,
        height: 80,
        polygonPoints: [
          { x: 0, y: -300 },
          { x: 50, y: -260 },
          { x: 0, y: -220 },
          { x: -50, y: -260 },
        ],
      },
    ],
    authoring: { status: "generated", notes: "初稿" },
  });
}

describe("editRegionsDocumentV1", () => {
  it("hands back a new document and leaves the input untouched", () => {
    const before = documentV1();
    const after = editRegionsDocumentV1(before, (plain) => {
      plain.label = "改过";
    });
    expect(after.label).toBe("改过");
    expect(before.label).toBe("主角区域");
    expect(after).not.toBe(before);
  });
});

describe("addRegionV1 / removeRegionV1", () => {
  it("adds a deduplicated rectangle and removes by index", () => {
    const edited = editRegionsDocumentV1(documentV1(), (plain) => {
      const first = addRegionV1(plain, { x: 0, y: 0, width: 40, height: 40 });
      expect(first).toBe(1);
      expect(plain.regions[1]?.regionId).toBe("region-2");
      // Occupy the next candidate so the dedupe suffix kicks in.
      const renamed = plain.regions[1];
      if (renamed !== undefined) renamed.regionId = "region-3";
      const second = addRegionV1(plain, { x: 10, y: 10, width: 40, height: 40 });
      expect(plain.regions[second]?.regionId).toBe("region-3-2");
      removeRegionV1(plain, second);
    });
    expect(edited.regions).toHaveLength(2);
    expect(edited.regions[1]?.regionId).toBe("region-3");
  });
});

describe("moveRegionV1", () => {
  it("moves the box and translates the polygon with it", () => {
    const edited = editRegionsDocumentV1(documentV1(), (plain) => {
      moveRegionV1(plain, 0, 50, -200);
    });
    const region = edited.regions[0];
    expect(region?.x).toBe(50);
    expect(region?.y).toBe(-200);
    expect(region?.polygonPoints?.[0]).toEqual({ x: 100, y: -200 });
    expect(region?.polygonPoints?.[3]).toEqual({ x: 50, y: -160 });
    // Still admissible after the translation.
    expect(regionsDraftBlockingIssueV1(edited)).toBeNull();
  });

  it("keeps the whole box inside the admission coordinate budget", () => {
    const edited = editRegionsDocumentV1(documentV1(), (plain) => {
      moveRegionV1(plain, 0, 5_000_000, 0);
    });
    expect(edited.regions[0]?.x).toBe(1_000_000 - 100);
  });
});

describe("resizeRegionV1", () => {
  it("scales polygon vertices proportionally and stays admissible", () => {
    const edited = editRegionsDocumentV1(documentV1(), (plain) => {
      resizeRegionV1(plain, 0, 200, 160);
    });
    const region = edited.regions[0];
    expect(region?.width).toBe(200);
    expect(region?.height).toBe(160);
    expect(region?.polygonPoints?.[0]).toEqual({ x: 50, y: -300 });
    expect(region?.polygonPoints?.[1]).toEqual({ x: 150, y: -220 });
    expect(regionsDraftBlockingIssueV1(edited)).toBeNull();
  });

  it("clamps to the minimum box", () => {
    const edited = editRegionsDocumentV1(documentV1(), (plain) => {
      resizeRegionV1(plain, 0, 0, -5);
    });
    expect(edited.regions[0]?.width).toBe(1);
    expect(edited.regions[0]?.height).toBe(1);
  });
});

describe("polygon vertex editing", () => {
  it("seeds a diamond, inserts midpoints, moves and removes vertices", () => {
    const edited = editRegionsDocumentV1(documentV1(), (plain) => {
      clearPolygonV1(plain, 0);
      expect(plain.regions[0]?.polygonPoints).toBeUndefined();
      seedPolygonV1(plain, 0);
      expect(plain.regions[0]?.polygonPoints).toHaveLength(4);
      insertVertexV1(plain, 0, 0);
      expect(plain.regions[0]?.polygonPoints).toHaveLength(5);
      // The new vertex sits at the split edge's midpoint.
      expect(plain.regions[0]?.polygonPoints?.[1]).toEqual({ x: 25, y: -280 });
      moveVertexV1(plain, 0, 1, 9_999, -9_999);
      // Clamped inside the bounding box.
      expect(plain.regions[0]?.polygonPoints?.[1]).toEqual({ x: 50, y: -300 });
      removeVertexV1(plain, 0, 1);
      expect(plain.regions[0]?.polygonPoints).toHaveLength(4);
    });
    expect(regionsDraftBlockingIssueV1(edited)).toBeNull();
  });

  it("refuses to shrink below a triangle and to grow past 64 vertices", () => {
    editRegionsDocumentV1(documentV1(), (plain) => {
      const points = plain.regions[0]?.polygonPoints;
      if (points === undefined) throw new Error("polygon expected");
      removeVertexV1(plain, 0, 0);
      expect(points).toHaveLength(3);
      removeVertexV1(plain, 0, 0);
      expect(points).toHaveLength(3);
      for (let i = 0; i < 70; i += 1) insertVertexV1(plain, 0, 0);
      expect(points.length).toBeLessThanOrEqual(64);
    });
  });
});

describe("regionsDraftBlockingIssueV1", () => {
  it("returns null for an admissible draft", () => {
    expect(regionsDraftBlockingIssueV1(documentV1())).toBeNull();
  });

  it("reports admission failures with the structured path", () => {
    const broken = editRegionsDocumentV1(documentV1(), (plain) => {
      addRegionV1(plain, { x: 0, y: 0, width: 10, height: 10 });
      const added = plain.regions[1];
      if (added !== undefined) added.regionId = "zone.head";
    });
    expect(regionsDraftBlockingIssueV1(broken)).toContain("regions_region_id_duplicate");
  });
});

describe("document lifecycle helpers", () => {
  it("creates a blank generated document and graduates on save", () => {
    const blank = newRegionsDocumentV1({ regionsId: "regions.test.new", label: "新建" });
    expect(regionsDraftBlockingIssueV1(blank)).toBeNull();
    expect(blank.authoring?.status).toBe("generated");
    const graduated = graduateRegionsDocumentV1(documentV1());
    expect(graduated.authoring?.status).toBe("human_tuned");
    expect(graduated.authoring?.notes).toBe("初稿");
  });

  it("infers the id prefix from existing documents, then the story hint", () => {
    expect(inferRegionsIdPrefixV1(["regions.test.hero"], null)).toBe("regions.test.");
    expect(inferRegionsIdPrefixV1([], "cafe")).toBe("regions.cafe.");
    expect(inferRegionsIdPrefixV1([], null)).toBe("regions.story.");
  });
});
