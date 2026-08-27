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
  it("uses partial English authoring copy and follows its declared Chinese fallback", () => {
    expect(
      vnReferenceTourAuthoringTextForLocaleV1("en", "text.vn-reference-tour.line.greeting"),
    ).toBe("The rain has stopped, and the courtyard stones still shine with water.");
    expect(
      vnReferenceTourAuthoringTextForLocaleV1("en", "text.vn-reference-tour.choice.inside"),
    ).toBe("先回屋里");
    expect(
      vnReferenceTourAuthoringTextForLocaleV1("en", "text.vn-reference-tour.line.ending-plain"),
    ).toBe("屋里茶还温着。院子里的雨声停了。");
  });

  it("keeps the shipped derived graph grouped, labeled, and source-addressable", () => {
    expect(
      vnReferenceTourFlowGraphV1.nodes.find((node) =>
        node.nodeId === "node.vn-reference-tour.opening"
      ),
    )
      .toMatchObject({
        kind: "stage",
        docId: "doc.vn-reference-tour.opening",
        blockName: "opening",
        summary:
          "cue:scene.vn-reference-tour.opening/courtyard + cue:scene.vn-reference-tour.opening/mist",
        source: "interaction-doc:doc.vn-reference-tour.opening#opening",
      });
    expect(
      vnReferenceTourFlowGraphV1.edges.find((edge) =>
        edge.from === "node.vn-reference-tour.first-choice" &&
        edge.label.kind === "choice" &&
        edge.label.choiceId === "choice.vn-reference-tour.look"
      ),
    ).toMatchObject({
      to: "node.vn-reference-tour.cat-line",
      label: {
        kind: "choice",
        textId: "text.vn-reference-tour.choice.look",
        text: "去看看檐下的动静",
        gates: [],
      },
    });
    expect(
      vnReferenceTourFlowGraphV1.edges.find((edge) =>
        edge.from === "node.vn-reference-tour.ending-gate" &&
        edge.to === "node.vn-reference-tour.ending-warm"
      ),
    ).toMatchObject({
      label: { kind: "branch", condition: "flag flag.vn-reference-tour.cat_found" },
    });
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
              tag: "tag.vn-reference-tour.mei",
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
