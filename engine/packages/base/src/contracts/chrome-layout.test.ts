// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { parseChromeLayoutDocumentV1 } from "./chrome-layout.ts";

function validDocumentV1(): Record<string, unknown> {
  return {
    format: "sillymaker.chrome-layout",
    version: 1,
    layoutId: "layout.test.main-hud",
    label: "主场景 HUD",
    canvas: { width: 1024, height: 576 },
    boxes: {
      "board.parked": { x: -305, y: 0, width: 330, height: 576 },
      "board.item.tab.peek": { x: -16, y: 240, width: 40, height: 100 },
    },
    anchors: { "sheet.back": { x: 900, y: 16 } },
    offsets: { "board.value-nudge-y": 8 },
  };
}

describe("parseChromeLayoutDocumentV1", () => {
  it("parses a valid document with negative positions and freezes it", () => {
    const parsed = parseChromeLayoutDocumentV1(validDocumentV1());
    expect(parsed.layoutId).toBe("layout.test.main-hud");
    expect(parsed.label).toBe("主场景 HUD");
    expect(parsed.canvas).toEqual({ width: 1024, height: 576 });
    expect(parsed.boxes["board.parked"]).toEqual({ x: -305, y: 0, width: 330, height: 576 });
    expect(parsed.anchors["sheet.back"]).toEqual({ x: 900, y: 16 });
    expect(parsed.offsets["board.value-nudge-y"]).toBe(8);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.boxes)).toBe(true);
    expect(Object.isFrozen(parsed.boxes["board.parked"])).toBe(true);
    expect(Object.isFrozen(parsed.anchors["sheet.back"])).toBe(true);
    expect(Object.isFrozen(parsed.offsets)).toBe(true);
  });

  it("accepts empty sections (a freshly created document)", () => {
    const parsed = parseChromeLayoutDocumentV1({
      format: "sillymaker.chrome-layout",
      version: 1,
      layoutId: "layout.test.empty",
      label: "空文档",
      canvas: { width: 1024, height: 576 },
      boxes: {},
      anchors: {},
      offsets: {},
    });
    expect(parsed.boxes).toEqual({});
    expect(parsed.anchors).toEqual({});
    expect(parsed.offsets).toEqual({});
  });

  it("keeps authoring metadata and validates its members", () => {
    const parsed = parseChromeLayoutDocumentV1({
      ...validDocumentV1(),
      authoring: { status: "human_tuned", locked: true, notes: "手调" },
    });
    expect(parsed.authoring).toEqual({ status: "human_tuned", locked: true, notes: "手调" });
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        authoring: { status: "robot" },
      })
    ).toThrowError(/chrome_layout_authoring_status_invalid/u);
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        authoring: { locked: "yes" },
      })
    ).toThrowError(/chrome_layout_authoring_locked_invalid/u);
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        authoring: { reviewer: "me" },
      })
    ).toThrowError(/chrome_layout_authoring_invalid/u);
  });

  it("rejects wrong format, version, id, label, and canvas", () => {
    expect(() =>
      parseChromeLayoutDocumentV1({ ...validDocumentV1(), format: "sillymaker.regions" })
    ).toThrowError(/chrome_layout_format_invalid at \/format/u);
    expect(() => parseChromeLayoutDocumentV1({ ...validDocumentV1(), version: 2 }))
      .toThrowError(/chrome_layout_version_unsupported/u);
    expect(() => parseChromeLayoutDocumentV1({ ...validDocumentV1(), layoutId: "hud.main" }))
      .toThrowError(/chrome_layout_id_invalid/u);
    expect(() => parseChromeLayoutDocumentV1({ ...validDocumentV1(), layoutId: "layout.Main" }))
      .toThrowError(/chrome_layout_id_invalid/u);
    expect(() => parseChromeLayoutDocumentV1({ ...validDocumentV1(), label: "" }))
      .toThrowError(/chrome_layout_label_invalid/u);
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        canvas: { width: 0, height: 576 },
      })
    ).toThrowError(/chrome_layout_canvas_invalid at \/canvas\/width/u);
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        canvas: { width: 1024, height: 576, depth: 1 },
      })
    ).toThrowError(/object_keys at \/canvas/u);
  });

  it("rejects malformed boxes, anchors, and offsets with structured paths", () => {
    const fractional = validDocumentV1();
    fractional.boxes = { tab: { x: 1.5, y: 0, width: 10, height: 10 } };
    expect(() => parseChromeLayoutDocumentV1(fractional)).toThrowError(
      /chrome_layout_box_invalid at \/boxes\/tab\/x/u,
    );

    const zeroSize = validDocumentV1();
    zeroSize.boxes = { tab: { x: 0, y: 0, width: 0, height: 10 } };
    expect(() => parseChromeLayoutDocumentV1(zeroSize)).toThrowError(
      /chrome_layout_box_invalid at \/boxes\/tab\/width/u,
    );

    const extraKey = validDocumentV1();
    extraKey.boxes = { tab: { x: 0, y: 0, width: 10, height: 10, color: "red" } };
    expect(() => parseChromeLayoutDocumentV1(extraKey)).toThrowError(
      /object_keys at \/boxes\/tab/u,
    );

    const badAnchor = validDocumentV1();
    badAnchor.anchors = { back: { x: "900", y: 16 } };
    expect(() => parseChromeLayoutDocumentV1(badAnchor)).toThrowError(
      /chrome_layout_anchor_invalid at \/anchors\/back\/x/u,
    );

    const badOffset = validDocumentV1();
    badOffset.offsets = { nudge: 1.25 };
    expect(() => parseChromeLayoutDocumentV1(badOffset)).toThrowError(
      /chrome_layout_offset_invalid at \/offsets\/nudge/u,
    );

    const arraySection = validDocumentV1();
    arraySection.anchors = [];
    expect(() => parseChromeLayoutDocumentV1(arraySection)).toThrowError(
      /object_expected at \/anchors/u,
    );
  });

  it("rejects blank, oversized, and prototype-polluting entry names", () => {
    const blank = validDocumentV1();
    blank.offsets = { "  ": 1 };
    expect(() => parseChromeLayoutDocumentV1(blank)).toThrowError(
      /chrome_layout_entry_name_invalid/u,
    );

    const oversized = validDocumentV1();
    oversized.offsets = { ["n".repeat(97)]: 1 };
    expect(() => parseChromeLayoutDocumentV1(oversized)).toThrowError(
      /chrome_layout_entry_name_invalid/u,
    );

    const polluting = validDocumentV1();
    polluting.boxes = JSON.parse(
      '{"__proto__": {"x": 0, "y": 0, "width": 10, "height": 10}}',
    );
    expect(() => parseChromeLayoutDocumentV1(polluting)).toThrowError(
      /chrome_layout_entry_name_invalid/u,
    );
  });

  it("caps total entries across the three sections", () => {
    const oversized = validDocumentV1();
    const offsets: Record<string, number> = {};
    for (let index = 0; index < 254; index += 1) offsets[`offset.${String(index)}`] = index;
    oversized.offsets = offsets;
    expect(() => parseChromeLayoutDocumentV1(oversized)).toThrowError(
      /chrome_layout_entries_count_invalid/u,
    );
  });

  it("rejects unknown top-level keys and missing sections", () => {
    expect(() => parseChromeLayoutDocumentV1({ ...validDocumentV1(), onDrag: "handler" }))
      .toThrowError(/object_keys/u);
    const missingSection: Record<string, unknown> = { ...validDocumentV1() };
    delete missingSection.offsets;
    expect(() => parseChromeLayoutDocumentV1(missingSection)).toThrowError(/object_keys/u);
  });

  it("parses intent and hold_progress widgets and freezes them", () => {
    const parsed = parseChromeLayoutDocumentV1({
      ...validDocumentV1(),
      widgets: {
        "route.inside": {
          kind: "intent",
          box: "board.item.tab.peek",
          intentId: "app.insert2.inside",
          labelTextId: "text.app.insert2.inside",
          assetId: "asset.app.button.inside",
        },
        "window.bar": {
          kind: "hold_progress",
          box: "board.parked",
          labelTextId: "text.app.window.bar",
        },
      },
    });
    expect(parsed.widgets?.["route.inside"]).toEqual({
      kind: "intent",
      box: "board.item.tab.peek",
      intentId: "app.insert2.inside",
      labelTextId: "text.app.insert2.inside",
      assetId: "asset.app.button.inside",
    });
    expect(parsed.widgets?.["window.bar"]).toEqual({
      kind: "hold_progress",
      box: "board.parked",
      labelTextId: "text.app.window.bar",
    });
    expect(Object.isFrozen(parsed.widgets)).toBe(true);
    expect(Object.isFrozen(parsed.widgets?.["route.inside"])).toBe(true);
  });

  it("keeps documents without widgets shaped exactly as before", () => {
    const parsed = parseChromeLayoutDocumentV1(validDocumentV1());
    expect(Object.hasOwn(parsed, "widgets")).toBe(false);
  });

  it("rejects malformed widgets with structured paths", () => {
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        widgets: { bad: { kind: "toggle", box: "board.parked", labelTextId: "text.x" } },
      })
    ).toThrowError(/chrome_layout_widget_kind_invalid at \/widgets\/bad\/kind/u);
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        widgets: {
          bad: {
            kind: "intent",
            box: "board.missing",
            intentId: "app.x",
            labelTextId: "text.x",
          },
        },
      })
    ).toThrowError(/chrome_layout_widget_box_unknown at \/widgets\/bad\/box/u);
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        widgets: {
          bad: { kind: "intent", box: "board.parked", intentId: "", labelTextId: "text.x" },
        },
      })
    ).toThrowError(/chrome_layout_widget_invalid at \/widgets\/bad\/intentId/u);
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        widgets: {
          bad: {
            kind: "hold_progress",
            box: "board.parked",
            labelTextId: "text.x",
            intentId: "app.x",
          },
        },
      })
    ).toThrowError(/object_keys at \/widgets\/bad/u);
    expect(() =>
      parseChromeLayoutDocumentV1({
        ...validDocumentV1(),
        widgets: { bad: "intent" },
      })
    ).toThrowError(/chrome_layout_widget_invalid at \/widgets\/bad/u);
  });

  it("counts widgets into the shared entry cap", () => {
    const oversized = validDocumentV1();
    const offsets: Record<string, number> = {};
    for (let index = 0; index < 251; index += 1) offsets[`offset.${String(index)}`] = index;
    oversized.offsets = offsets;
    // 2 boxes + 1 anchor + 251 offsets = 254; two widgets overflow 256.
    oversized.widgets = {
      "widget.a": {
        kind: "hold_progress",
        box: "board.parked",
        labelTextId: "text.a",
      },
      "widget.b": {
        kind: "hold_progress",
        box: "board.parked",
        labelTextId: "text.b",
      },
      "widget.c": {
        kind: "hold_progress",
        box: "board.parked",
        labelTextId: "text.c",
      },
    };
    expect(() => parseChromeLayoutDocumentV1(oversized)).toThrowError(
      /chrome_layout_entries_count_invalid/u,
    );
  });
});
