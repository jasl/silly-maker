// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  type BornDigitalPdfTextItemV1,
  projectBornDigitalPdfPageV1,
} from "../product/translation/pdf/pdf-import-contract.ts";

describe("SillyOS born-digital PDF projection", () => {
  it("uses PDF.js end-of-line evidence for deterministic units and source geometry", () => {
    const items: BornDigitalPdfTextItemV1[] = [
      {
        itemIndex: 0,
        text: "Hello ",
        direction: "ltr",
        transform: [1, 0, 0, 1, 72, 720],
        width: 45,
        height: 18,
        hasEndOfLine: false,
      },
      {
        itemIndex: 1,
        text: "PDF",
        direction: "ltr",
        transform: [1, 0, 0, 1, 117, 720],
        width: 30,
        height: 18,
        hasEndOfLine: true,
      },
      {
        itemIndex: 2,
        text: "   ",
        direction: "ltr",
        transform: [1, 0, 0, 1, 72, 696],
        width: 12,
        height: 18,
        hasEndOfLine: true,
      },
      {
        itemIndex: 3,
        text: "Second line",
        direction: "rtl",
        transform: [1, 0, 0, 1, 72, 672],
        width: 90,
        height: 18,
        hasEndOfLine: false,
      },
    ];

    const projection = projectBornDigitalPdfPageV1({
      pageNumber: 2,
      firstUnitOrder: 3,
      items,
    });

    expect(projection.sourceUnits).toEqual([
      {
        unitId: "translation.unit.000004",
        order: 3,
        locator: "pdf/page/0002/line/0001",
        context: null,
        durationMilliseconds: null,
        source: "Hello PDF",
        protectedSegments: [],
      },
      {
        unitId: "translation.unit.000005",
        order: 4,
        locator: "pdf/page/0002/line/0003",
        context: null,
        durationMilliseconds: null,
        source: "Second line",
        protectedSegments: [],
      },
    ]);
    expect(projection.sourceMap).toEqual([
      {
        unitId: "translation.unit.000004",
        pageNumber: 2,
        lineNumber: 1,
        itemStart: 0,
        itemEndExclusive: 2,
        direction: "ltr",
        rect: { x: 72, y: 720, width: 75, height: 18 },
      },
      {
        unitId: "translation.unit.000005",
        pageNumber: 2,
        lineNumber: 3,
        itemStart: 3,
        itemEndExclusive: 4,
        direction: "rtl",
        rect: { x: 72, y: 672, width: 90, height: 18 },
      },
    ]);
  });

  it("does not invent geometry-based line or column boundaries", () => {
    const projection = projectBornDigitalPdfPageV1({
      pageNumber: 1,
      firstUnitOrder: 0,
      items: [
        {
          itemIndex: 0,
          text: "Content stream ",
          direction: "ltr",
          transform: [1, 0, 0, 1, 72, 720],
          width: 100,
          height: 12,
          hasEndOfLine: false,
        },
        {
          itemIndex: 1,
          text: "order",
          direction: "mystery",
          transform: [1, 0, 0, 1, 300, 100],
          width: 30,
          height: 12,
          hasEndOfLine: false,
        },
      ],
    });

    expect(projection.sourceUnits).toHaveLength(1);
    expect(projection.sourceUnits[0]?.source).toBe("Content stream order");
    expect(projection.sourceMap[0]?.direction).toBe("mixed");
  });
});
