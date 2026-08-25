// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseRegionsDocumentV1 } from "./stage-regions.ts";

function validDocumentV1(): Record<string, unknown> {
  return {
    format: "sillymaker.regions",
    version: 1,
    regionsId: "regions.test.heroine-lying",
    label: "躺卧姿态热区",
    regions: [
      {
        regionId: "zone.chest",
        accessibleNameText: "胸口",
        x: -100,
        y: -400,
        width: 200,
        height: 200,
        polygonPoints: [
          { x: 0, y: -400 },
          { x: 100, y: -200 },
          { x: -100, y: -200 },
        ],
        hoverAssetId: "asset.test.chest-glow",
      },
      {
        regionId: "zone.base",
        accessibleNameText: "底座",
        x: -100,
        y: -200,
        width: 200,
        height: 200,
      },
    ],
  };
}

describe("parseRegionsDocumentV1", () => {
  it("parses a valid document with shaped and plain regions", () => {
    const parsed = parseRegionsDocumentV1(validDocumentV1());
    expect(parsed.regionsId).toBe("regions.test.heroine-lying");
    expect(parsed.label).toBe("躺卧姿态热区");
    expect(parsed.regions).toHaveLength(2);
    expect(parsed.regions[0]?.polygonPoints).toEqual([
      { x: 0, y: -400 },
      { x: 100, y: -200 },
      { x: -100, y: -200 },
    ]);
    expect(parsed.regions[0]?.hoverAssetId).toBe("asset.test.chest-glow");
    expect(parsed.regions[1]?.polygonPoints).toBeUndefined();
  });

  it("accepts an empty region list (a freshly created document)", () => {
    const parsed = parseRegionsDocumentV1({
      format: "sillymaker.regions",
      version: 1,
      regionsId: "regions.test.empty",
      label: "空文档",
      regions: [],
    });
    expect(parsed.regions).toEqual([]);
  });

  it("admits a large generated region list without a semantic count cap", () => {
    const regions = Array.from({ length: 96 }, (_, index) => ({
      regionId: `zone.generated-${String(index)}`,
      accessibleNameText: `Generated ${String(index)}`,
      x: index,
      y: index,
      width: 10,
      height: 10,
    }));
    const parsed = parseRegionsDocumentV1({
      ...validDocumentV1(),
      regions,
    });
    expect(parsed.regions).toHaveLength(regions.length);
    expect(parsed.regions.at(-1)?.regionId).toBe("zone.generated-95");
  });

  it("keeps authoring metadata and validates its members", () => {
    const parsed = parseRegionsDocumentV1({
      ...validDocumentV1(),
      authoring: { status: "human_tuned", locked: true, notes: "手调" },
    });
    expect(parsed.authoring).toEqual({ status: "human_tuned", locked: true, notes: "手调" });
    expect(() =>
      parseRegionsDocumentV1({
        ...validDocumentV1(),
        authoring: { status: "robot" },
      })
    ).toThrowError(/regions_authoring_status_invalid/u);
  });

  it("rejects wrong format, version, id, and label", () => {
    expect(() => parseRegionsDocumentV1({ ...validDocumentV1(), format: "sillymaker.motion" }))
      .toThrowError(/regions_format_invalid/u);
    expect(() => parseRegionsDocumentV1({ ...validDocumentV1(), version: 2 }))
      .toThrowError(/regions_version_unsupported/u);
    expect(() => parseRegionsDocumentV1({ ...validDocumentV1(), regionsId: "motion.test.x" }))
      .toThrowError(/regions_id_invalid/u);
    expect(() => parseRegionsDocumentV1({ ...validDocumentV1(), label: "" }))
      .toThrowError(/regions_label_invalid/u);
  });

  it("rejects duplicate region ids with the offending path", () => {
    const document = validDocumentV1();
    const regions = document.regions as Record<string, unknown>[];
    regions[1] = { ...regions[1], regionId: "zone.chest" };
    expect(() => parseRegionsDocumentV1(document)).toThrowError(
      /regions_region_id_duplicate at \/regions\/1\/regionId/u,
    );
  });

  it("rejects polygons that break the shared rule", () => {
    const withPolygon = (polygonPoints: unknown): Record<string, unknown> => {
      const document = validDocumentV1();
      const regions = document.regions as Record<string, unknown>[];
      regions[0] = { ...regions[0], polygonPoints };
      return document;
    };
    // Too few vertices.
    expect(() => parseRegionsDocumentV1(withPolygon([{ x: 0, y: -400 }, { x: 100, y: -200 }])))
      .toThrowError(/regions_polygon_invalid/u);
    // A vertex escapes the bounding box.
    expect(() =>
      parseRegionsDocumentV1(
        withPolygon([{ x: 0, y: -400 }, { x: 101, y: -200 }, { x: -100, y: -200 }]),
      )
    ).toThrowError(/regions_polygon_invalid/u);
    // Zero area (collinear).
    expect(() =>
      parseRegionsDocumentV1(
        withPolygon([{ x: -100, y: -400 }, { x: 0, y: -300 }, { x: 100, y: -200 }]),
      )
    ).toThrowError(/regions_polygon_invalid/u);
    // Non-integer vertex fails at the point itself.
    expect(() =>
      parseRegionsDocumentV1(
        withPolygon([{ x: 0.5, y: -400 }, { x: 100, y: -200 }, { x: -100, y: -200 }]),
      )
    ).toThrowError(/regions_polygon_point_invalid at \/regions\/0\/polygonPoints\/0\/x/u);
  });

  it("rejects invalid bounds and hover assets", () => {
    const withRegion = (patch: Record<string, unknown>): Record<string, unknown> => {
      const document = validDocumentV1();
      const regions = document.regions as Record<string, unknown>[];
      regions[1] = { ...regions[1], ...patch };
      return document;
    };
    expect(() => parseRegionsDocumentV1(withRegion({ width: 0 })))
      .toThrowError(/regions_bounds_invalid/u);
    expect(() => parseRegionsDocumentV1(withRegion({ y: 3.5 })))
      .toThrowError(/regions_bounds_invalid/u);
    expect(() => parseRegionsDocumentV1(withRegion({ hoverAssetId: "" })))
      .toThrowError(/regions_hover_asset_invalid/u);
    expect(() => parseRegionsDocumentV1(withRegion({ regionId: "" })))
      .toThrowError(/regions_region_id_invalid/u);
    expect(() => parseRegionsDocumentV1(withRegion({ accessibleNameText: "" })))
      .toThrowError(/regions_accessible_name_invalid/u);
  });

  it("rejects unknown keys anywhere in the document", () => {
    expect(() => parseRegionsDocumentV1({ ...validDocumentV1(), extra: true }))
      .toThrowError();
    const document = validDocumentV1();
    const regions = document.regions as Record<string, unknown>[];
    regions[1] = { ...regions[1], onActivate: "route.somewhere" };
    // Regions never carry routing; an activation payload is not data here.
    expect(() => parseRegionsDocumentV1(document)).toThrowError();
  });
});
