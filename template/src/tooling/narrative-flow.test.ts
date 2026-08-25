// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { TemplateInteractionDocV1 } from "../story/narrative-kit.ts";
import { compileTemplateInteractionDocV1 } from "../story/narrative-kit.ts";
import { projectTemplateNarrativeFlowV1, templateFlowGraphV1 } from "./narrative-flow.ts";
import { templateAuthoringTextForLocaleV1 } from "./text-content.ts";

function projectV1(
  doc: Omit<TemplateInteractionDocV1, "prefix" | "docId">,
  resolveText: (textId: string) => string | null = () => null,
) {
  const source = { prefix: "template", docId: "doc.template.probe", ...doc };
  return projectTemplateNarrativeFlowV1(
    compileTemplateInteractionDocV1({ doc: source }),
    source,
    resolveText,
  );
}

describe("Template Narrative Flow projection", () => {
  it("uses partial English authoring copy and follows its declared Chinese fallback", () => {
    expect(
      templateAuthoringTextForLocaleV1("en", "text.template.line.greeting"),
    ).toBe("The rain has stopped, and the courtyard stones still shine with water.");
    expect(
      templateAuthoringTextForLocaleV1("en", "text.template.choice.inside"),
    ).toBe("先回屋里");
    expect(
      templateAuthoringTextForLocaleV1("en", "text.template.line.ending-plain"),
    ).toBe("屋里茶还温着。院子里的雨声停了。");
  });

  it("keeps the shipped derived graph grouped, labeled, and source-addressable", () => {
    expect(templateFlowGraphV1.nodes.find((node) => node.nodeId === "node.template.opening"))
      .toMatchObject({
        kind: "stage",
        docId: "doc.template.opening",
        blockName: "opening",
        summary: "cue:scene.template.opening/courtyard + cue:scene.template.opening/mist",
        source: "interaction-doc:doc.template.opening#opening",
      });
    expect(templateFlowGraphV1.edges.find((edge) =>
      edge.from === "node.template.first-choice" &&
      edge.label.kind === "choice" &&
      edge.label.choiceId === "choice.template.look"
    )).toMatchObject({
      to: "node.template.cat-line",
      label: {
        kind: "choice",
        textId: "text.template.choice.look",
        text: "去看看檐下的动静",
        gates: [],
      },
    });
    expect(
      templateFlowGraphV1.edges.find((edge) =>
        edge.from === "node.template.ending-gate" && edge.to === "node.template.ending-warm"
      ),
    ).toMatchObject({ label: { kind: "branch", condition: "flag flag.template.cat_found" } });
    expect(
      templateFlowGraphV1.edges.find((edge) =>
        edge.from === "node.template.mei-fetches" && edge.to === "node.template.hurry-line"
      ),
    ).toMatchObject({
      label: { kind: "branch", condition: "when flag.template.hurried" },
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

  it("keeps hold reroutes ahead of expiry and connects an opening Stage batch", () => {
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
              layerId: "layer.template.characters",
              tag: "tag.template.mei",
              appearance: { expression: "calm" },
            },
          }],
          when: [
            { when: { flag: "flag.template.spotted" }, next: "caught" },
            { when: { flag: "flag.template.tired" }, next: "rest" },
          ],
          next: "close",
        },
        { kind: "say", name: "caught", speaker: null, text: "Caught", next: "close" },
        { kind: "say", name: "rest", speaker: null, text: "Rest", next: "close" },
        { kind: "end", name: "close" },
      ],
    });

    expect(graph.edges.filter((edge) => edge.from === "node.template.watch")).toEqual([
      expect.objectContaining({
        to: "node.template.caught",
        label: { kind: "branch", condition: "when flag.template.spotted" },
      }),
      expect.objectContaining({
        to: "node.template.rest",
        label: { kind: "branch", condition: "when flag.template.tired" },
      }),
      expect.objectContaining({ to: "node.template.close", label: { kind: "next" } }),
    ]);
    expect(graph.edges).toContainEqual(expect.objectContaining({
      from: "node.template.watch-stage",
      to: "node.template.watch",
      label: { kind: "next" },
    }));
  });
});
