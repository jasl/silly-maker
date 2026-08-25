// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { PresentationDataError } from "./presentation-data.ts";
import {
  admitGuiCompositionDocumentV1,
  admitGuiCompositionSourceBytesV1,
} from "./gui-composition.ts";

function documentV1(): Record<string, unknown> {
  return {
    format: "sillymaker.gui-composition",
    version: 1,
    compositionId: "gui.test.shell",
    root: {
      nodeId: "node.test.shell",
      viewId: "view.test.shell",
      props: { title: "Shell" },
      slots: {
        toolbar: [{
          nodeId: "node.test.toolbar",
          viewId: "view.test.toolbar",
          props: { compact: true },
          slots: {},
        }],
        content: [
          {
            nodeId: "node.test.first",
            viewId: "view.test.card",
            props: { order: 1 },
            slots: {},
          },
          {
            nodeId: "node.test.second",
            viewId: "view.test.card",
            props: { order: 2 },
            slots: {},
          },
        ],
      },
    },
  };
}

function reasonV1(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof PresentationDataError) return error.reason;
    throw error;
  }
  throw new TypeError("expected PresentationDataError");
}

describe("GUI composition admission", () => {
  it("admits strict source bytes and preserves parent-slot child order", () => {
    const document = admitGuiCompositionSourceBytesV1(
      new TextEncoder().encode(JSON.stringify(documentV1())),
    );
    expect(document.root.props).toEqual({ title: "Shell" });
    expect(document.root.slots.content?.map((node) => node.nodeId)).toEqual([
      "node.test.first",
      "node.test.second",
    ]);
  });

  it("admits generated trees beyond early example-sized collections", () => {
    const document = documentV1();
    const root = document.root as Record<string, unknown>;
    root.slots = {
      content: Array.from({ length: 300 }, (_, index) => ({
        nodeId: `node.scale.${String(index)}`,
        viewId: "view.test.card",
        props: { order: index },
        slots: {},
      })),
    };
    expect(admitGuiCompositionDocumentV1(document).root.slots.content).toHaveLength(300);
  });

  it("rejects duplicate JSON keys before schema admission", () => {
    const source = '{"format":"sillymaker.gui-composition","format":"other"}';
    expect(
      reasonV1(() => admitGuiCompositionSourceBytesV1(new TextEncoder().encode(source))),
    ).toBe("gui_composition_json_invalid");
  });

  it("rejects unknown fields, invalid IDs, and duplicate node identities", () => {
    expect(
      reasonV1(() => admitGuiCompositionDocumentV1({ ...documentV1(), extra: true })),
    ).toBe("gui_composition_object_keys_invalid");

    const badNode = documentV1();
    (badNode.root as Record<string, unknown>).extra = true;
    expect(reasonV1(() => admitGuiCompositionDocumentV1(badNode))).toBe(
      "gui_composition_object_keys_invalid",
    );

    const badView = documentV1();
    (badView.root as Record<string, unknown>).viewId = "npm:arbitrary-module";
    expect(reasonV1(() => admitGuiCompositionDocumentV1(badView))).toBe(
      "gui_composition_view_id_invalid",
    );

    const duplicate = documentV1();
    const duplicateRoot = duplicate.root as Record<string, unknown>;
    duplicateRoot.slots = {
      left: [{
        nodeId: "node.test.duplicate",
        viewId: "view.test.card",
        props: {},
        slots: {},
      }],
      right: [{
        nodeId: "node.test.duplicate",
        viewId: "view.test.card",
        props: {},
        slots: {},
      }],
    };
    expect(reasonV1(() => admitGuiCompositionDocumentV1(duplicate))).toBe(
      "gui_composition_node_id_duplicate",
    );
  });

  it("rejects invalid slot names and non-JSON direct-object props", () => {
    const badSlot = documentV1();
    (badSlot.root as Record<string, unknown>).slots = { "module/path": [] };
    expect(reasonV1(() => admitGuiCompositionDocumentV1(badSlot))).toBe(
      "gui_composition_slot_id_invalid",
    );

    const badProps = documentV1();
    (badProps.root as Record<string, unknown>).props = { callback: () => undefined };
    expect(reasonV1(() => admitGuiCompositionDocumentV1(badProps))).toBe(
      "gui_composition_props_invalid",
    );
  });

  it("retains direct-object depth and document-work resource bounds", () => {
    const nestedV1 = (maximumDepth: number) => {
      let nested: Record<string, unknown> = {
        nodeId: `node.depth.${String(maximumDepth)}`,
        viewId: "view.test.card",
        props: {},
        slots: {},
      };
      for (let depth = maximumDepth - 1; depth >= 0; depth -= 1) {
        nested = {
          nodeId: `node.depth.${String(depth)}`,
          viewId: "view.test.card",
          props: {},
          slots: { content: [nested] },
        };
      }
      return nested;
    };

    const atBoundary = documentV1();
    atBoundary.root = nestedV1(128);
    expect(admitGuiCompositionDocumentV1(atBoundary).root.nodeId).toBe("node.depth.0");

    const overDepth = documentV1();
    overDepth.root = nestedV1(129);
    expect(reasonV1(() => admitGuiCompositionDocumentV1(overDepth))).toBe(
      "gui_composition_node_depth_invalid",
    );

    const overWork = documentV1();
    (overWork.root as Record<string, unknown>).slots = Object.fromEntries(
      Array.from({ length: 100_000 }, (_, index) => [`slot${String(index)}`, []]),
    );
    expect(reasonV1(() => admitGuiCompositionDocumentV1(overWork))).toBe(
      "gui_composition_document_work_limit",
    );

    const deepProps = documentV1();
    let props: Record<string, unknown> = { value: true };
    for (let depth = 0; depth < 129; depth += 1) props = { child: props };
    (deepProps.root as Record<string, unknown>).props = props;
    expect(reasonV1(() => admitGuiCompositionDocumentV1(deepProps))).toBe(
      "gui_composition_direct_depth_invalid",
    );
  });
});
