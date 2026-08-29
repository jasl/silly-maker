// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { VnLastSoundCheckInteractionDocV1 } from "../story/narrative-kit.ts";
import { compileVnLastSoundCheckInteractionDocV1 } from "../story/narrative-kit.ts";
import {
  projectVnLastSoundCheckNarrativeFlowV1,
  vnLastSoundCheckFlowGraphV1,
} from "./narrative-flow.ts";
import { vnLastSoundCheckAuthoringTextForLocaleV1 } from "./text-content.ts";

function projectV1(
  doc: Omit<VnLastSoundCheckInteractionDocV1, "prefix" | "docId">,
  resolveText: (textId: string) => string | null = () => null,
) {
  const source = { prefix: "vn-last-sound-check", docId: "doc.vn-last-sound-check.probe", ...doc };
  return projectVnLastSoundCheckNarrativeFlowV1(
    compileVnLastSoundCheckInteractionDocV1({ doc: source }),
    source,
    resolveText,
  );
}

describe("VnLastSoundCheck Narrative Flow projection", () => {
  it("joins the editable English packs and resident UI catalog", () => {
    expect(
      vnLastSoundCheckAuthoringTextForLocaleV1(
        "en",
        "text.vn-last-sound-check.shared.power-on.room",
      ),
    ).toMatch(/^At 5:22 a\.m\.,/);
    expect(
      vnLastSoundCheckAuthoringTextForLocaleV1(
        "en",
        "text.vn-last-sound-check.shared.power-on.room.continued",
      ),
    ).toContain("Community Radio");
    expect(
      vnLastSoundCheckAuthoringTextForLocaleV1(
        "en",
        "text.vn-last-sound-check.present.ending.title",
      ),
    ).toBe("This Moment, Archived");
    expect(
      vnLastSoundCheckAuthoringTextForLocaleV1("en", "text.vn-last-sound-check.speaker.lin"),
    ).toBe("Lin Cheng");
  });

  it("keeps the shipped story source-addressable and labels its material route", () => {
    expect(
      vnLastSoundCheckFlowGraphV1.nodes.find((node) =>
        node.nodeId === "node.vn-last-sound-check.open-control-room"
      ),
    ).toMatchObject({
      kind: "stage",
      docId: "doc.vn-last-sound-check.story",
      blockName: "open-control-room",
      source: "interaction-doc:doc.vn-last-sound-check.story#open-control-room",
    });
    expect(
      vnLastSoundCheckFlowGraphV1.edges.find((edge) =>
        edge.from === "node.vn-last-sound-check.signal-choice" &&
        edge.label.kind === "choice" &&
        edge.label.choiceId === "choice.vn-last-sound-check.archive-voice"
      ),
    ).toMatchObject({
      to: "node.vn-last-sound-check.route-gate",
      label: {
        kind: "choice",
        textId: "text.vn-last-sound-check.choice.signal.archive",
        text: "发送修复后的旧台呼",
        gates: [],
      },
    });
    expect(
      vnLastSoundCheckFlowGraphV1.edges.find((edge) =>
        edge.from === "node.vn-last-sound-check.route-gate" &&
        edge.to === "node.vn-last-sound-check.archive-prepare-reel"
      ),
    ).toMatchObject({ label: { kind: "branch", condition: "signal archive" } });
    expect(
      vnLastSoundCheckFlowGraphV1.edges.find((edge) =>
        edge.from === "node.vn-last-sound-check.route-gate" &&
        edge.to === "node.vn-last-sound-check.present-prepare-microphone"
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
              layerId: "layer.vn-last-sound-check.characters",
              tag: "tag.vn-last-sound-check.character.lin",
              appearance: { expression: "calm" },
            },
          }],
          next: "close",
        },
        { kind: "end", name: "close" },
      ],
    });

    expect(graph.edges.filter((edge) => edge.from === "node.vn-last-sound-check.watch")).toEqual([
      expect.objectContaining({ to: "node.vn-last-sound-check.close", label: { kind: "next" } }),
    ]);
    expect(graph.edges).toContainEqual(expect.objectContaining({
      from: "node.vn-last-sound-check.watch-stage",
      to: "node.vn-last-sound-check.watch",
      label: { kind: "next" },
    }));
  });
});
