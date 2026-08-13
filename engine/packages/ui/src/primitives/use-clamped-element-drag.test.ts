// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { clampElementDragPositionV1 } from "./use-clamped-element-drag.ts";

function rectV1(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON() {
      return this;
    },
  };
}

describe("clampElementDragPositionV1", () => {
  it("keeps the grabbed point under the pointer inside the host", () => {
    expect(
      clampElementDragPositionV1({
        clientX: 80,
        clientY: 60,
        grabX: 10,
        grabY: 5,
        host: rectV1(0, 0, 200, 100),
        element: rectV1(0, 0, 40, 20),
      }),
    ).toEqual({ x: 70, y: 55 });
  });

  it("clamps to the host origin when the pointer would leave the start edge", () => {
    expect(
      clampElementDragPositionV1({
        clientX: 4,
        clientY: 2,
        grabX: 10,
        grabY: 8,
        host: rectV1(0, 0, 200, 100),
        element: rectV1(0, 0, 40, 20),
      }),
    ).toEqual({ x: 0, y: 0 });
  });

  it("clamps to the host end edge when the pointer would leave the far edge", () => {
    expect(
      clampElementDragPositionV1({
        clientX: 400,
        clientY: 300,
        grabX: 10,
        grabY: 5,
        host: rectV1(0, 0, 200, 100),
        element: rectV1(0, 0, 40, 20),
      }),
    ).toEqual({ x: 160, y: 80 });
  });

  it("pins to the origin when the element is larger than the host", () => {
    expect(
      clampElementDragPositionV1({
        clientX: 90,
        clientY: 40,
        grabX: 10,
        grabY: 5,
        host: rectV1(0, 0, 30, 10),
        element: rectV1(0, 0, 80, 40),
      }),
    ).toEqual({ x: 0, y: 0 });
  });
});
