// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  compileVnLastSoundCheckInteractionDocV1,
  type VnLastSoundCheckInteractionDocV1,
} from "./narrative-kit.ts";

function compileV1(blocks: VnLastSoundCheckInteractionDocV1["blocks"]) {
  return compileVnLastSoundCheckInteractionDocV1({
    doc: {
      prefix: "vn-last-sound-check",
      docId: "doc.vn-last-sound-check.kit-probe",
      speakers: { guide: "Guide" },
      entry: "opening",
      blocks,
    },
  });
}

describe("One Last Sound Check interaction-document kit", () => {
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
            layerId: "layer.vn-last-sound-check.character",
            tag: "tag.vn-last-sound-check.guide",
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

    expect(compiled.entryNodeId).toBe("node.vn-last-sound-check.opening");
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
    expect(choice?.options[0]).toMatchObject({ effect: { setSignalChoice: "archive" } });
    const choose = (signalChoice: "archive" | "present" | null) =>
      branch?.cases.find((branchCase) =>
        branchCase.predicate === null || branchCase.predicate.signalChoice === signalChoice
      )?.next;
    expect(choose("archive")).toBe("node.vn-last-sound-check.stage");
    expect(choose(null)).toBe("node.vn-last-sound-check.wait");
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
      "vn-last-sound-check.interaction_doc_invalid:doc.vn-last-sound-check.kit-probe/opening:" +
        "next_unresolved:missing",
    );
  });
});
