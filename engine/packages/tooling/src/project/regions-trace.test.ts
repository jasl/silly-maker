// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { PngAlphaImageV1 } from "./png-alpha.ts";
import type { TraceRegionsOptionsV1 } from "./regions-trace.ts";
import { traceRegionsDocumentV1 } from "./regions-trace.ts";

/** Builds an alpha image from rows of "#" (opaque) and "." (transparent). */
function silhouetteV1(rows: readonly string[], opaque = 255): PngAlphaImageV1 {
  const width = rows[0]!.length;
  const height = rows.length;
  const alpha = new Uint8Array(width * height);
  rows.forEach((row, y) => {
    row.split("").forEach((cell, x) => {
      alpha[y * width + x] = cell === "#" ? opaque : 0;
    });
  });
  return Object.freeze({ width, height, alpha });
}

function optionsV1(overrides: Partial<TraceRegionsOptionsV1> = {}): TraceRegionsOptionsV1 {
  return {
    regionsId: "regions.test.zone",
    label: "Traced zone",
    regionId: "zone",
    accessibleNameText: "Zone",
    alphaThreshold: 128,
    maxVertices: 32,
    anchorXPermille: 0,
    anchorYPermille: 0,
    ...overrides,
  };
}

describe("traceRegionsDocumentV1", () => {
  it("traces a rectangle to exactly its four corners", () => {
    const image = silhouetteV1([
      "......",
      ".####.",
      ".####.",
      ".####.",
      "......",
    ]);
    const result = traceRegionsDocumentV1(image, optionsV1());
    const region = result.document.regions[0]!;
    expect(region.polygonPoints).toEqual([
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      { x: 5, y: 4 },
      { x: 1, y: 4 },
    ]);
    expect({ x: region.x, y: region.y, width: region.width, height: region.height }).toEqual(
      { x: 1, y: 1, width: 4, height: 3 },
    );
    expect(result.contourVertexCount).toBe(4);
    expect(result.vertexCount).toBe(4);
    expect(result.document.authoring).toEqual({ status: "generated" });
  });

  it("keeps every turn of a plus shape when the budget allows", () => {
    const image = silhouetteV1([
      ".#.",
      "###",
      ".#.",
    ]);
    const result = traceRegionsDocumentV1(image, optionsV1());
    expect(result.vertexCount).toBe(12);
    expect(result.contourVertexCount).toBe(12);
    const region = result.document.regions[0]!;
    expect({ x: region.x, y: region.y, width: region.width, height: region.height }).toEqual(
      { x: 0, y: 0, width: 3, height: 3 },
    );
  });

  it("simplifies a staircase diagonal into the vertex budget", () => {
    const size = 24;
    const rows = Array.from(
      { length: size },
      (_row, y) => Array.from({ length: size }, (_cell, x) => (x <= y ? "#" : ".")).join(""),
    );
    const result = traceRegionsDocumentV1(silhouetteV1(rows), optionsV1({ maxVertices: 8 }));
    expect(result.contourVertexCount).toBeGreaterThan(8);
    expect(result.vertexCount).toBeGreaterThanOrEqual(3);
    expect(result.vertexCount).toBeLessThanOrEqual(8);
  });

  it("traces only the largest connected component", () => {
    const image = silhouetteV1([
      "##......",
      "##......",
      "##...##.",
      "##...##.",
      "##......",
    ]);
    const region = traceRegionsDocumentV1(image, optionsV1()).document.regions[0]!;
    expect({ x: region.x, y: region.y, width: region.width, height: region.height }).toEqual(
      { x: 0, y: 0, width: 2, height: 5 },
    );
  });

  it("traces the outer boundary of a ring, covering its hole", () => {
    const image = silhouetteV1([
      "####",
      "#..#",
      "#..#",
      "####",
    ]);
    const result = traceRegionsDocumentV1(image, optionsV1());
    expect(result.document.regions[0]!.polygonPoints).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]);
  });

  it("keeps diagonal touches disconnected at saddle corners", () => {
    // State 9 (top-left + bottom-right inside): the walk must hug the
    // first pixel instead of leaking into its diagonal neighbor.
    const topLeft = traceRegionsDocumentV1(silhouetteV1(["#.", ".#"]), optionsV1());
    expect(topLeft.document.regions[0]!.polygonPoints).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);

    // State 6 (top-right + bottom-left inside), reached with entry left.
    const topRight = traceRegionsDocumentV1(silhouetteV1([".#", "#."]), optionsV1());
    expect(topRight.document.regions[0]!.polygonPoints).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ]);
  });

  it("applies the alpha threshold inclusively", () => {
    const image = silhouetteV1(["#"], 100);
    expect(
      traceRegionsDocumentV1(image, optionsV1({ alphaThreshold: 100 })).vertexCount,
    ).toBe(4);
    expect(() => traceRegionsDocumentV1(image, optionsV1({ alphaThreshold: 101 })))
      .toThrowError(/no pixel reaches alpha 101/u);
  });

  it("translates points and box into anchor space", () => {
    const image = silhouetteV1([
      "......",
      ".####.",
      ".####.",
      ".####.",
      "......",
    ]);
    // 6x5 image, bottom-center anchor: subtract (3, 5).
    const result = traceRegionsDocumentV1(
      image,
      optionsV1({ anchorXPermille: 500, anchorYPermille: 1000 }),
    );
    const region = result.document.regions[0]!;
    expect({ x: region.x, y: region.y, width: region.width, height: region.height }).toEqual(
      { x: -2, y: -4, width: 4, height: 3 },
    );
    expect(region.polygonPoints![0]).toEqual({ x: -2, y: -4 });
  });

  it("reports an unreachable budget instead of degenerating the polygon", () => {
    // A rectangle cannot lose a corner without leaving its own outline:
    // both Douglas-Peucker arcs drop their midpoint at the same epsilon.
    const image = silhouetteV1(["##", "##"]);
    expect(() => traceRegionsDocumentV1(image, optionsV1({ maxVertices: 3 })))
      .toThrowError(/could not be simplified to 3 vertices/u);
  });
});
