// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  type BornDigitalPdfTextItemV1,
  projectBornDigitalPdfPageV1,
} from "../runtime/pdf/pdf-import-contract.ts";

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
        lineBreakPolicy: "forbidden",
        source: "Hello PDF",
        protectedSegments: [],
      },
      {
        unitId: "translation.unit.000005",
        order: 4,
        locator: "pdf/page/0002/line/0003",
        context: null,
        durationMilliseconds: null,
        lineBreakPolicy: "forbidden",
        source: "Second line",
        protectedSegments: [],
      },
    ]);
    expect(projection.sourceMap).toEqual([
      {
        unitId: "translation.unit.000004",
        pageNumber: 2,
        physicalLineStart: 1,
        physicalLineEndExclusive: 2,
        itemStart: 0,
        itemEndExclusive: 2,
        direction: "ltr",
        rect: { x: 72, y: 720, width: 75, height: 18 },
      },
      {
        unitId: "translation.unit.000005",
        pageNumber: 2,
        physicalLineStart: 3,
        physicalLineEndExclusive: 4,
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

  it("merges compatible physical continuations and repairs lowercase soft wrapping", () => {
    const projection = projectBornDigitalPdfPageV1({
      pageNumber: 4,
      firstUnitOrder: 0,
      items: [
        {
          itemIndex: 0,
          text: "The au-",
          direction: "ltr",
          transform: [1, 0, 0, 1, 72, 720],
          width: 48,
          height: 12,
          hasEndOfLine: true,
        },
        {
          itemIndex: 1,
          text: "thorized exception remains",
          direction: "ltr",
          transform: [1, 0, 0, 1, 72, 704],
          width: 150,
          height: 12,
          hasEndOfLine: true,
        },
        {
          itemIndex: 2,
          text: "subject to review.",
          direction: "ltr",
          transform: [1, 0, 0, 1, 72, 688],
          width: 96,
          height: 12,
          hasEndOfLine: true,
        },
        {
          itemIndex: 3,
          text: "A new sentence starts here.",
          direction: "ltr",
          transform: [1, 0, 0, 1, 72, 672],
          width: 162,
          height: 12,
          hasEndOfLine: true,
        },
      ],
    });

    expect(projection.sourceUnits.map(({ locator, source }) => ({ locator, source }))).toEqual([
      {
        locator: "pdf/page/0004/line/0001",
        source: "The authorized exception remains subject to review.",
      },
      {
        locator: "pdf/page/0004/line/0004",
        source: "A new sentence starts here.",
      },
    ]);
    expect(projection.sourceMap[0]).toMatchObject({
      physicalLineStart: 1,
      physicalLineEndExclusive: 4,
      itemStart: 0,
      itemEndExclusive: 3,
      rect: { x: 72, y: 688, width: 150, height: 44 },
    });
  });

  it("keeps empty PDF.js EOL items out of layout metrics while retaining their item range", () => {
    const projection = projectBornDigitalPdfPageV1({
      pageNumber: 7,
      firstUnitOrder: 0,
      items: [
        {
          itemIndex: 0,
          text: "The sentence continues",
          direction: "ltr",
          transform: [1, 0, 0, 1, 72, 720],
          width: 132,
          height: 12,
          hasEndOfLine: false,
        },
        {
          itemIndex: 1,
          text: "",
          direction: "ltr",
          transform: [1, 0, 0, 1, 400, 680],
          width: 0,
          height: 40,
          hasEndOfLine: true,
        },
        {
          itemIndex: 2,
          text: "on the next physical line.",
          direction: "ltr",
          transform: [1, 0, 0, 1, 72, 704],
          width: 144,
          height: 12,
          hasEndOfLine: true,
        },
      ],
    });

    expect(projection.sourceUnits.map((unit) => unit.source)).toEqual([
      "The sentence continues on the next physical line.",
    ]);
    expect(projection.sourceMap[0]).toMatchObject({
      itemStart: 0,
      itemEndExclusive: 3,
      physicalLineStart: 1,
      physicalLineEndExclusive: 3,
      rect: { x: 72, y: 704, width: 144, height: 28 },
    });
  });

  it("keeps obvious block, direction, font-tier, indent, and line-gap boundaries", () => {
    const line = (
      itemIndex: number,
      text: string,
      y: number,
      overrides: Partial<BornDigitalPdfTextItemV1> = {},
    ): BornDigitalPdfTextItemV1 => ({
      itemIndex,
      text,
      direction: "ltr",
      transform: [1, 0, 0, 1, 72, y],
      width: 120,
      height: 12,
      hasEndOfLine: true,
      ...overrides,
    });
    const projection = projectBornDigitalPdfPageV1({
      pageNumber: 1,
      firstUnitOrder: 0,
      items: [
        line(0, "CHAPTER ONE", 720),
        line(1, "A body line without punctuation", 704),
        line(2, "- A distinct bullet", 688),
        line(3, "Different direction", 672, { direction: "rtl" }),
        line(4, "Larger heading tier", 656, { height: 18 }),
        line(5, "Deeply indented block", 632, {
          transform: [1, 0, 0, 1, 110, 632],
        }),
        line(6, "Distant block", 580),
      ],
    });

    expect(projection.sourceUnits.map((unit) => unit.source)).toEqual([
      "CHAPTER ONE",
      "A body line without punctuation",
      "- A distinct bullet",
      "Different direction",
      "Larger heading tier",
      "Deeply indented block",
      "Distant block",
    ]);
  });
});
