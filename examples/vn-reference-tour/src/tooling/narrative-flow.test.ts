// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { VnReferenceTourInteractionDocV1 } from "../story/narrative-kit.ts";
import { compileVnReferenceTourInteractionDocV1 } from "../story/narrative-kit.ts";
import {
  projectVnReferenceTourNarrativeFlowV1,
  vnReferenceTourFlowGraphV1,
} from "./narrative-flow.ts";
import { vnReferenceTourAuthoringTextForLocaleV1 } from "./text-content.ts";

function projectV1(
  doc: Omit<VnReferenceTourInteractionDocV1, "prefix" | "docId">,
  resolveText: (textId: string) => string | null = () => null,
) {
  const source = { prefix: "vn-reference-tour", docId: "doc.vn-reference-tour.probe", ...doc };
  return projectVnReferenceTourNarrativeFlowV1(
    compileVnReferenceTourInteractionDocV1({ doc: source }),
    source,
    resolveText,
  );
}

describe("VnReferenceTour Narrative Flow projection", () => {
  it("joins the editable English packs and their declared Chinese fallback", () => {
    expect(
      vnReferenceTourAuthoringTextForLocaleV1(
        "en",
        "text.vn-reference-tour.shared.power-on.room",
      ),
    ).toBe(
      "At 5:22 a.m., only the mixing desk and wall clock lit the control room. Outside, black sky was turning deep blue.",
    );
    expect(
      vnReferenceTourAuthoringTextForLocaleV1(
        "en",
        "text.vn-reference-tour.present.ending.title",
      ),
    ).toBe("This Moment, Archived");
    expect(
      vnReferenceTourAuthoringTextForLocaleV1("en", "text.vn-reference-tour.speaker.lin"),
    ).toBe("林澄");
  });

  it("keeps the shipped story source-addressable and labels its material route", () => {
    expect(
      vnReferenceTourFlowGraphV1.nodes.find((node) =>
        node.nodeId === "node.vn-reference-tour.open-control-room"
      ),
    ).toMatchObject({
      kind: "stage",
      docId: "doc.vn-reference-tour.story",
      blockName: "open-control-room",
      source: "interaction-doc:doc.vn-reference-tour.story#open-control-room",
    });
    expect(
      vnReferenceTourFlowGraphV1.edges.find((edge) =>
        edge.from === "node.vn-reference-tour.signal-choice" &&
        edge.label.kind === "choice" &&
        edge.label.choiceId === "choice.vn-reference-tour.archive-voice"
      ),
    ).toMatchObject({
      to: "node.vn-reference-tour.route-gate",
      label: {
        kind: "choice",
        textId: "text.vn-reference-tour.choice.signal.archive",
        text: "发送修复后的旧台呼",
        gates: [],
      },
    });
    expect(
      vnReferenceTourFlowGraphV1.edges.find((edge) =>
        edge.from === "node.vn-reference-tour.route-gate" &&
        edge.to === "node.vn-reference-tour.archive-prepare-reel"
      ),
    ).toMatchObject({ label: { kind: "branch", condition: "signal archive" } });
    expect(
      vnReferenceTourFlowGraphV1.edges.find((edge) =>
        edge.from === "node.vn-reference-tour.route-gate" &&
        edge.to === "node.vn-reference-tour.present-prepare-microphone"
      ),
    ).toMatchObject({ label: { kind: "branch", condition: "signal present" } });
  });

  it("joins shared copy without putting it back into the runtime control plan", () => {
    const graph = projectV1({
      entry: "line",
      blocks: [
        {
          kind: "say",
          name: "line",
          speaker: null,
          textId: "text.shared.line",
          next: "menu",
        },
        {
          kind: "choice",
          name: "menu",
          promptTextId: "text.shared.prompt",
          options: [{ name: "go", textId: "text.shared.go", next: "close" }],
        },
        { kind: "end", name: "close" },
      ],
    }, (textId) =>
      ({
        "text.shared.line": "Shared line",
        "text.shared.prompt": "Shared prompt",
        "text.shared.go": "Shared choice",
      })[textId] ?? null);

    expect(graph.nodes.map((node) => node.summary)).toEqual([
      "Shared line",
      "Shared prompt / Shared choice",
      "end",
    ]);
    expect(graph.edges[1]).toMatchObject({
      label: { kind: "choice", textId: "text.shared.go", text: "Shared choice" },
    });
  });

  it("connects a hold's opening Stage batch before its expiry edge", () => {
    const graph = projectV1({
      entry: "watch",
      blocks: [
        {
          kind: "hold",
          name: "watch",
          durationMs: 800,
          skippable: true,
          ops: [{
            setAppearance: {
              layerId: "layer.vn-reference-tour.characters",
              tag: "tag.vn-reference-tour.character.lin",
              appearance: { expression: "calm" },
            },
          }],
          next: "close",
        },
        { kind: "end", name: "close" },
      ],
    });

    expect(graph.edges.filter((edge) => edge.from === "node.vn-reference-tour.watch")).toEqual([
      expect.objectContaining({ to: "node.vn-reference-tour.close", label: { kind: "next" } }),
    ]);
    expect(graph.edges).toContainEqual(expect.objectContaining({
      from: "node.vn-reference-tour.watch-stage",
      to: "node.vn-reference-tour.watch",
      label: { kind: "next" },
    }));
  });
});
