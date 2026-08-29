// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { ChromeLayoutDocumentV1 } from "@sillymaker/base";
import { parseChromeLayoutDocumentV1 } from "@sillymaker/base";

import {
  addAnchorV1,
  addBoxV1,
  addOffsetV1,
  chromeLayoutDraftBlockingIssueV1,
  editChromeLayoutDocumentV1,
  graduateChromeLayoutDocumentV1,
  inferChromeLayoutIdPrefixV1,
  moveAnchorV1,
  moveBoxV1,
  newChromeLayoutDocumentV1,
  removeEntryV1,
  renameEntryV1,
  resizeBoxV1,
  setOffsetV1,
} from "./chrome-edit.ts";

function documentV1(): ChromeLayoutDocumentV1 {
  return parseChromeLayoutDocumentV1({
    format: "sillymaker.chrome-layout",
    version: 1,
    layoutId: "layout.test.hud",
    label: "测试 HUD",
    canvas: { width: 640, height: 360 },
    boxes: { chip: { x: 40, y: 30, width: 120, height: 48 } },
    anchors: { "tab-tip": { x: 320, y: 12 } },
    offsets: { "menu-gap": 16 },
    authoring: { status: "generated" },
  });
}

describe("chrome-edit", () => {
  it("creates a blank generated document that passes admission", () => {
    const doc = newChromeLayoutDocumentV1({
      layoutId: "layout.test.blank",
      label: "空白",
      canvas: { width: 1024, height: 576 },
    });
    expect(chromeLayoutDraftBlockingIssueV1(doc)).toBeNull();
    expect(doc.authoring?.status).toBe("generated");
  });

  it("graduates authoring status to human_tuned without touching geometry", () => {
    const graduated = graduateChromeLayoutDocumentV1(documentV1());
    expect(graduated.authoring?.status).toBe("human_tuned");
    expect(graduated.boxes["chip"]).toEqual({ x: 40, y: 30, width: 120, height: 48 });
    expect(chromeLayoutDraftBlockingIssueV1(graduated)).toBeNull();
  });

  it("moves, resizes, and clamps boxes to the admission budget", () => {
    const moved = editChromeLayoutDocumentV1(documentV1(), (plain) => {
      moveBoxV1(plain, "chip", -20.4, 2_000_000);
      resizeBoxV1(plain, "chip", 0, 33.6);
    });
    // Negative positions park elements; coordinates round and clamp to ±1e6.
    expect(moved.boxes["chip"]).toEqual({ x: -20, y: 1_000_000, width: 1, height: 34 });
    expect(chromeLayoutDraftBlockingIssueV1(moved)).toBeNull();
  });

  it("moves anchors and sets offsets", () => {
    const edited = editChromeLayoutDocumentV1(documentV1(), (plain) => {
      moveAnchorV1(plain, "tab-tip", 100.6, -8);
      setOffsetV1(plain, "menu-gap", 24.2);
      setOffsetV1(plain, "missing", 99);
    });
    expect(edited.anchors["tab-tip"]).toEqual({ x: 101, y: -8 });
    expect(edited.offsets["menu-gap"]).toBe(24);
    expect(edited.offsets["missing"]).toBeUndefined();
  });

  it("adds entries with deduplicated names and removes them", () => {
    const edited = editChromeLayoutDocumentV1(documentV1(), (plain) => {
      renameEntryV1(plain, "boxes", "chip", "box-2");
      expect(addBoxV1(plain)).toBe("box-2-2");
      expect(addAnchorV1(plain)).toBe("anchor-2");
      expect(addOffsetV1(plain)).toBe("offset-2");
      removeEntryV1(plain, "anchors", "tab-tip");
    });
    expect(Object.keys(edited.boxes)).toEqual(["box-2", "box-2-2"]);
    expect(Object.keys(edited.anchors)).toEqual(["anchor-2"]);
    expect(Object.keys(edited.offsets)).toEqual(["menu-gap", "offset-2"]);
    // The seed box is centered on the document's own canvas.
    expect(edited.boxes["box-2-2"]).toEqual({ x: 280, y: 158, width: 80, height: 45 });
    expect(chromeLayoutDraftBlockingIssueV1(edited)).toBeNull();
  });

  it("refuses renames that would merge entries or pollute prototypes", () => {
    const edited = editChromeLayoutDocumentV1(documentV1(), (plain) => {
      // "menu-gap" is taken (across sections) and "__proto__" is dangerous.
      renameEntryV1(plain, "boxes", "chip", "menu-gap");
      renameEntryV1(plain, "boxes", "chip", "__proto__");
      renameEntryV1(plain, "offsets", "missing", "anything");
    });
    expect(Object.keys(edited.boxes)).toEqual(["chip"]);
    expect(edited.offsets["anything"]).toBeUndefined();
  });

  it("keeps widget box references valid across box renames and removals", () => {
    const withWidgets = parseChromeLayoutDocumentV1({
      format: "sillymaker.chrome-layout",
      version: 1,
      layoutId: "layout.test.widgets",
      label: "widget 保全",
      canvas: { width: 640, height: 360 },
      boxes: {
        chip: { x: 40, y: 30, width: 120, height: 48 },
        bar: { x: 40, y: 90, width: 200, height: 20 },
      },
      anchors: {},
      offsets: {},
      widgets: {
        "chip.press": {
          kind: "intent",
          box: "chip",
          intentId: "app.chip.press",
          labelTextId: "text.chip.press",
        },
        "bar.meter": { kind: "hold_progress", box: "bar", labelTextId: "text.bar.meter" },
      },
    });

    // A rename rewrites the reference; the draft stays admissible.
    const renamed = editChromeLayoutDocumentV1(withWidgets, (plain) => {
      renameEntryV1(plain, "boxes", "chip", "chip-main");
    });
    expect(renamed.widgets?.["chip.press"]?.box).toBe("chip-main");
    expect(chromeLayoutDraftBlockingIssueV1(renamed)).toBeNull();

    // Removing a box removes the widgets anchored to it — never a wedged
    // draft the workspace cannot save.
    const removed = editChromeLayoutDocumentV1(withWidgets, (plain) => {
      removeEntryV1(plain, "boxes", "bar");
    });
    expect(removed.widgets?.["bar.meter"]).toBeUndefined();
    expect(removed.widgets?.["chip.press"]).toBeDefined();
    expect(chromeLayoutDraftBlockingIssueV1(removed)).toBeNull();
  });

  it("flags drafts that fail admission and infers the id prefix", () => {
    const broken = editChromeLayoutDocumentV1(documentV1(), (plain) => {
      renameEntryV1(plain, "boxes", "chip", "x".repeat(97));
    });
    expect(chromeLayoutDraftBlockingIssueV1(broken)).toContain("chrome_layout_entry_name_invalid");

    expect(inferChromeLayoutIdPrefixV1(["layout.test.hud"], null)).toBe("layout.test.");
    expect(inferChromeLayoutIdPrefixV1([], "night")).toBe("layout.night.");
    expect(inferChromeLayoutIdPrefixV1([], null)).toBe("layout.story.");
  });
});
