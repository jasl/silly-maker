// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  compileVnReferenceTourInteractionDocV1,
  type VnReferenceTourInteractionDocV1,
} from "./narrative-kit.ts";

function compileV1(blocks: VnReferenceTourInteractionDocV1["blocks"]) {
  return compileVnReferenceTourInteractionDocV1({
    doc: {
      prefix: "vn-reference-tour",
      docId: "doc.vn-reference-tour.kit-probe",
      speakers: { guide: "Guide" },
      entry: "opening",
      blocks,
    },
  });
}

describe("VN Reference Tour interaction-document kit", () => {
  it("compiles the selected say, choice, branch, stage, hold, and end vocabulary", () => {
    const compiled = compileV1([
      {
        kind: "say",
        name: "opening",
        speaker: "guide",
        text: "Choose a route.",
        next: "menu",
      },
      {
        kind: "choice",
        name: "menu",
        prompt: "Where next?",
        options: [{
          name: "continue",
          text: "Continue",
          setSignalChoice: "archive",
          next: "route",
        }],
      },
      {
        kind: "branch",
        name: "route",
        cases: [
          { when: { signalChoice: "archive" }, next: "stage" },
          { next: "wait" },
        ],
      },
      {
        kind: "stage",
        name: "stage",
        ops: [{
          setAppearance: {
            layerId: "layer.vn-reference-tour.character",
            tag: "tag.vn-reference-tour.guide",
            appearance: { expression: "smile" },
          },
        }],
        next: "wait",
      },
      {
        kind: "hold",
        name: "wait",
        durationMs: 250,
        tickQuantumMs: 50,
        skippable: true,
        next: "close",
      },
      { kind: "end", name: "close" },
    ]);

    expect(compiled.entryNodeId).toBe("node.vn-reference-tour.opening");
    expect(compiled.nodes.map(({ kind }) => kind)).toEqual([
      "say",
      "choice",
      "branch",
      "stage",
      "hold",
      "end",
    ]);
    expect(compiled.textEntries.map(({ text }) => text)).toEqual([
      "Guide",
      "Choose a route.",
      "Where next?",
      "Continue",
    ]);

    const branch = compiled.nodes.find((node) => node.kind === "branch");
    const choice = compiled.nodes.find((node) => node.kind === "choice");
    const hold = compiled.nodes.find((node) => node.kind === "hold");
    expect(choice?.options[0]).toMatchObject({ setSignalChoice: "archive" });
    expect(branch?.choose({ signalChoice: "archive" })).toBe("node.vn-reference-tour.stage");
    expect(branch?.choose({ signalChoice: null })).toBe("node.vn-reference-tour.wait");
    expect(hold).toMatchObject({ durationMs: 250, tickQuantumMs: 50 });
  });

  it("reports unresolved authoring targets at the document boundary", () => {
    expect(() =>
      compileV1([
        {
          kind: "say",
          name: "opening",
          speaker: null,
          text: "Broken route",
          next: "missing",
        },
      ])
    ).toThrow(
      "vn-reference-tour.interaction_doc_invalid:doc.vn-reference-tour.kit-probe/opening:" +
        "next_unresolved:missing",
    );
  });
});
