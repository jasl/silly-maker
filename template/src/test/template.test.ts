// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { lintNarrativeGraph, sampleMotionAt } from "@sillymaker/base/story";
import { createGameHarnessV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import type { StageTargetChange } from "@sillymaker/base/story";

import { createTemplateApplicationInstanceV1 } from "../application/core-application.ts";
import type { TemplateInteractionDocV1 } from "../story/narrative-kit.ts";
import { compileTemplateInteractionDocV1 } from "../story/narrative-kit.ts";
import { projectTemplateNarrativeGraphV1 } from "../story/narrative-graph.ts";
import { templateCompiledOpeningV1, templateScriptV1 } from "../story/narrative.ts";
import { projectTemplateNarrativeFlowV1, templateFlowGraphV1 } from "../tooling/narrative-flow.ts";
import {
  templateStageContentCatalogV1,
  templateStageTransitionCatalogV1,
  templateTextCatalogsV1,
} from "../content/presentation.ts";
import { templateOpeningAmbientCatalogV1 } from "../scenes/opening/index.ts";
import { templateSemanticAdapterV1 } from "../application/semantic.ts";
import { templateStoryEntryV1 } from "../story.ts";
import { templateAuthoringTextForLocaleV1 } from "../tooling/text-content.ts";
import { templateTextContentManifestV1 } from "../content/text-content.ts";

function probeDocV1(
  doc: Omit<TemplateInteractionDocV1, "prefix" | "docId">,
): TemplateInteractionDocV1 {
  return { prefix: "template", docId: "doc.template.probe", ...doc };
}

function compileDocV1(
  doc: Omit<TemplateInteractionDocV1, "prefix" | "docId">,
): ReturnType<typeof compileTemplateInteractionDocV1> {
  return compileTemplateInteractionDocV1({ doc: probeDocV1(doc) });
}

function compileDocWithFlowV1(
  doc: Omit<TemplateInteractionDocV1, "prefix" | "docId">,
) {
  const sourceDoc = probeDocV1(doc);
  const compiled = compileTemplateInteractionDocV1({ doc: sourceDoc });
  return Object.freeze({
    compiled,
    flowGraph: projectTemplateNarrativeFlowV1(compiled, sourceDoc),
  });
}

function currentOccurrenceIdV1(
  application: { readonly semantic: { observe(): unknown } },
): string {
  const publication = application.semantic.observe() as {
    readonly narrative: { readonly pending: { readonly occurrenceId: string } | null };
  };
  const pending = publication.narrative.pending;
  if (pending === null) throw new TypeError("test.no_pending_interaction");
  return pending.occurrenceId;
}

/** Resolves whatever is pending now — inserting script lines never renumbers tests. */
function currentResolveV1(
  application: { readonly semantic: { observe(): unknown } },
  resolution: Readonly<Record<string, unknown>>,
) {
  return Object.freeze({
    kind: "resolve" as const,
    expectedOccurrenceId: currentOccurrenceIdV1(application),
    resolution: Object.freeze(resolution),
  });
}

/** A time tick fenced to whatever hold is pending now. */
function currentTimeTickV1(
  application: { readonly semantic: { observe(): unknown } },
  elapsedMs: number,
) {
  return Object.freeze({
    kind: "time" as const,
    tick: Object.freeze({
      elapsedMs,
      expectedHoldOccurrenceId: currentOccurrenceIdV1(application),
    }),
  });
}

describe("template story baseline", () => {
  it("resolves the Story package", () => {
    const resolved = resolveStoryForTestV1(templateStoryEntryV1);
    expect(resolved.gameSimulation.modules).toHaveLength(3);
    expect(resolved.provenance.story.id).toBe("story.template.starter");
    expect(
      (resolved.presentation as {
        readonly textContentManifest: { readonly revision: number; readonly digest: string };
      }).textContentManifest,
    ).toMatchObject({
      revision: templateTextContentManifestV1.revision,
      digest: templateTextContentManifestV1.digest,
    });
  });

  it("keeps the narrative graph lint-clean", () => {
    const diagnostics = lintNarrativeGraph(projectTemplateNarrativeGraphV1());
    expect(diagnostics).toEqual([]);
  });

  it("keeps the shipped control plan free of resident dialogue copy", () => {
    expect(templateCompiledOpeningV1.textEntries).toEqual([]);
  });

  it("resolves every referenced textId from bootstrap or authoring packs", () => {
    const catalog = templateTextCatalogsV1.catalogs.find(
      (candidate) => candidate.locale === templateTextCatalogsV1.defaultLocale,
    );
    const known = new Set(catalog?.entries.map((entry) => entry.textId as string));
    for (const node of templateScriptV1) {
      if (node.kind === "say") {
        expect(
          known.has(node.textId) || templateAuthoringTextForLocaleV1(null, node.textId) !== null,
          node.nodeId,
        ).toBe(true);
        if (node.speakerTextId !== null) {
          expect(
            known.has(node.speakerTextId) ||
              templateAuthoringTextForLocaleV1(null, node.speakerTextId) !== null,
            node.nodeId,
          ).toBe(true);
        }
      }
      if (node.kind === "choice") {
        expect(
          known.has(node.promptTextId) ||
            templateAuthoringTextForLocaleV1(null, node.promptTextId) !== null,
          node.nodeId,
        ).toBe(true);
        for (const option of node.options) {
          expect(
            known.has(option.textId) ||
              templateAuthoringTextForLocaleV1(null, option.textId) !== null,
            option.choiceId,
          ).toBe(true);
        }
      }
    }
  });

  it("derives node/interaction/text ids from one short name per node", () => {
    const greeting = templateScriptV1.find((node) =>
      node.kind === "say" && node.nodeId === "node.template.greeting"
    );
    expect(greeting).toMatchObject({
      definitionId: "interaction.template.greeting",
      textId: "text.template.line.greeting",
      speakerTextId: "text.template.speaker.mei",
      next: "node.template.first-choice",
    });
    const choice = templateScriptV1.find((node) => node.kind === "choice");
    expect(choice).toMatchObject({
      nodeId: "node.template.first-choice",
      promptTextId: "text.template.choice.prompt",
    });
    if (choice?.kind === "choice") {
      expect(choice.options.map((option) => option.choiceId)).toEqual([
        "choice.template.look",
        "choice.template.hurry",
        "choice.template.inside",
      ]);
    }
  });

  it("keeps external text references out of the runtime compiler's inline entries", () => {
    const { compiled, flowGraph } = compileDocWithFlowV1({
      speakers: {
        inline: "内联姓名",
        mei: { textId: "text.shared.speaker.mei" },
        named: { textId: "text.shared.speaker.named", text: "指定姓名" },
      },
      entry: "line",
      blocks: [
        {
          kind: "say",
          name: "line",
          speaker: "mei",
          textId: "text.shared.line",
          next: "pick",
        },
        {
          kind: "choice",
          name: "pick",
          promptTextId: "text.shared.prompt",
          options: [
            { name: "go", textId: "text.shared.choice.go", next: "close" },
          ],
        },
        { kind: "end", name: "close" },
      ],
    });

    expect(compiled.textEntries).toEqual([
      { textId: "text.template.speaker.inline", text: "内联姓名" },
      { textId: "text.shared.speaker.named", text: "指定姓名" },
    ]);
    expect(compiled.nodes[0]).toMatchObject({
      kind: "say",
      speakerTextId: "text.shared.speaker.mei",
      textId: "text.shared.line",
    });
    expect(compiled.nodes[1]).toMatchObject({
      kind: "choice",
      promptTextId: "text.shared.prompt",
      options: [{ textId: "text.shared.choice.go" }],
    });
    expect(flowGraph.nodes[0]).toMatchObject({ summary: "text.shared.line" });
    expect(flowGraph.nodes[1]).toMatchObject({ summary: "text.shared.prompt / go" });
  });

  it("compiles hold blocks with an opening stage batch and jump redirection", () => {
    const { compiled, flowGraph } = compileDocWithFlowV1({
      entry: "wait",
      blocks: [
        {
          kind: "hold",
          name: "wait",
          durationMs: 500,
          skippable: true,
          ops: [
            {
              setAppearance: {
                layerId: "layer.template.characters",
                tag: "tag.mei",
                appearance: { expression: "smiling" },
              },
            },
          ],
          next: "again",
        },
        { kind: "say", name: "again", speaker: null, text: "……", next: "wait" },
      ],
    });
    // Entry and jumps land on the compiled opening stage node, so the held
    // picture is committed stage state — never a silent flash.
    expect(compiled.entryNodeId).toBe("node.template.wait-stage");
    const say = compiled.nodes.find((node) => node.nodeId === "node.template.again");
    expect(say).toMatchObject({ next: "node.template.wait-stage" });
    const stage = compiled.nodes.find((node) => node.nodeId === "node.template.wait-stage");
    expect(stage).toMatchObject({ kind: "stage", next: "node.template.wait" });
    const hold = compiled.nodes.find((node) => node.nodeId === "node.template.wait");
    expect(hold).toMatchObject({
      kind: "hold",
      definitionId: "interaction.template.wait",
      durationMs: 500,
      skippable: true,
      next: "node.template.again",
    });
    expect(flowGraph.nodes.find((node) => node.nodeId === "node.template.wait"))
      .toMatchObject({ kind: "hold", summary: "hold 500ms skippable" });
    // The stage→hold edge keeps the flow projection connected.
    expect(flowGraph.edges).toContainEqual(
      expect.objectContaining({ from: "node.template.wait-stage", to: "node.template.wait" }),
    );
  });

  it("compiles a bare hold without ops onto the current stage picture", () => {
    const { compiled, flowGraph } = compileDocWithFlowV1({
      entry: "beat",
      blocks: [
        { kind: "hold", name: "beat", durationMs: 240, next: "close" },
        { kind: "end", name: "close" },
      ],
    });
    expect(compiled.entryNodeId).toBe("node.template.beat");
    expect(compiled.nodes.find((node) => node.nodeId === "node.template.beat")).toMatchObject({
      kind: "hold",
      durationMs: 240,
      skippable: false,
      when: [],
    });
    expect(flowGraph.nodes.find((node) => node.nodeId === "node.template.beat"))
      .toMatchObject({ kind: "hold", summary: "hold 240ms" });
  });

  it("compiles hold `when` arms with resolved targets and labeled reroute edges", () => {
    const { compiled, flowGraph } = compileDocWithFlowV1({
      entry: "watch",
      blocks: [
        {
          kind: "hold",
          name: "watch",
          durationMs: 800,
          when: [
            { when: { flag: "flag.template.spotted" }, next: "caught" },
            // An arm may target a hold-with-ops block; the jump redirects
            // to its compiled opening stage node like any other jump.
            { when: { flag: "flag.template.tired" }, next: "rest" },
          ],
          next: "close",
        },
        { kind: "say", name: "caught", speaker: null, text: "被发现了。", next: "close" },
        {
          kind: "hold",
          name: "rest",
          durationMs: 200,
          ops: [
            {
              setAppearance: {
                layerId: "layer.template.characters",
                tag: "tag.mei",
                appearance: { expression: "calm" },
              },
            },
          ],
          next: "close",
        },
        { kind: "end", name: "close" },
      ],
    });
    const hold = compiled.nodes.find((node) => node.nodeId === "node.template.watch");
    expect(hold).toMatchObject({
      kind: "hold",
      when: [
        { flag: "flag.template.spotted", next: "node.template.caught" },
        { flag: "flag.template.tired", next: "node.template.rest-stage" },
      ],
      next: "node.template.close",
    });
    // Reroute edges precede the expiry edge, in declaration order.
    const outgoing = flowGraph.edges.filter((edge) => edge.from === "node.template.watch");
    expect(outgoing).toEqual([
      expect.objectContaining({
        to: "node.template.caught",
        label: { kind: "branch", condition: "when flag.template.spotted" },
      }),
      expect.objectContaining({
        to: "node.template.rest-stage",
        label: { kind: "branch", condition: "when flag.template.tired" },
      }),
      expect.objectContaining({ to: "node.template.close", label: { kind: "next" } }),
    ]);

    // Admission rejects empty arm lists, blank flags, unresolved targets.
    expect(() =>
      compileDocV1({
        entry: "watch",
        blocks: [
          { kind: "hold", name: "watch", durationMs: 100, when: [], next: "close" },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow(/hold_when_empty/u);
    expect(() =>
      compileDocV1({
        entry: "watch",
        blocks: [
          {
            kind: "hold",
            name: "watch",
            durationMs: 100,
            when: [{ when: { flag: "" }, next: "close" }],
            next: "close",
          },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow(/hold_when_flag_invalid/u);
    expect(() =>
      compileDocV1({
        entry: "watch",
        blocks: [
          {
            kind: "hold",
            name: "watch",
            durationMs: 100,
            when: [{ when: { flag: "flag.template.spotted" }, next: "nowhere" }],
            next: "close",
          },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow(/next_unresolved:nowhere/u);
  });

  it("rejects bad documents at admission with pointed reasons", () => {
    expect(() =>
      compileDocV1({
        entry: "close",
        blocks: [
          { kind: "end", name: "close" },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow(/duplicate_block_name/u);
    expect(() =>
      compileDocV1({
        entry: "a",
        blocks: [
          { kind: "say", name: "a", speaker: null, text: "一句", next: "b", textId: "text.x" },
          { kind: "say", name: "b", speaker: null, text: "另一句", next: "a", textId: "text.x" },
        ],
      })
    ).toThrow(/text_conflict:text\.x/u);
    expect(() =>
      compileDocV1({
        entry: "a",
        blocks: [{ kind: "say", name: "a", speaker: null, next: "a" }],
      })
    ).toThrow(/text_id_required_without_inline_text/u);
    expect(() =>
      compileDocV1({
        entry: "a",
        blocks: [{ kind: "say", name: "a", speaker: "ghost", text: "……", next: "a" }],
      })
    ).toThrow(/speaker_unknown:ghost/u);
    expect(() =>
      compileDocV1({
        entry: "a",
        blocks: [{ kind: "say", name: "a", speaker: null, text: "……", next: "missing" }],
      })
    ).toThrow(/next_unresolved:missing/u);
    expect(() =>
      compileDocV1({
        entry: "a",
        blocks: [{ kind: "say", name: "a", speaker: null, text: "……", next: "@out" }],
      })
    ).toThrow(/external_target_unknown/u);
    expect(() =>
      compileDocV1({
        entry: "pick",
        blocks: [
          {
            kind: "choice",
            name: "pick",
            prompt: "选哪个？",
            options: [
              { name: "yes", text: "好", next: "close" },
              { name: "yes", text: "好", next: "close" },
            ],
          },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow(/duplicate_option_name/u);
    expect(() =>
      compileDocV1({
        entry: "gate",
        blocks: [
          {
            kind: "branch",
            name: "gate",
            cases: [{ next: "close" }, { when: { flag: "flag.x" }, next: "close" }],
          },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow(/branch_else_not_last/u);
    expect(() =>
      compileDocV1({
        entry: "beat",
        blocks: [
          { kind: "stage", name: "beat", ops: [{ scene: "missing", open: true }], next: "close" },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow(/scene_unknown:missing/u);
    expect(() =>
      compileDocV1({
        entry: "wait",
        blocks: [
          { kind: "hold", name: "wait", durationMs: 0, next: "close" },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow(/hold_duration_invalid/u);
    // A hold with ops reserves `<name>-stage`; colliding block names fail.
    expect(() =>
      compileDocV1({
        entry: "wait",
        blocks: [
          {
            kind: "hold",
            name: "wait",
            durationMs: 500,
            ops: [
              {
                setAppearance: {
                  layerId: "layer.template.characters",
                  tag: "tag.mei",
                  appearance: { expression: "smiling" },
                },
              },
            ],
            next: "close",
          },
          { kind: "end", name: "wait-stage" },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow(/duplicate_block_name/u);
    // Reusing an option name across two different choices stays legal (a
    // shared label shares its derived ids on purpose).
    expect(() =>
      compileDocV1({
        entry: "pick",
        blocks: [
          {
            kind: "choice",
            name: "pick",
            prompt: "选哪个？",
            options: [{ name: "back", text: "返回", next: "close" }],
          },
          {
            kind: "choice",
            name: "again",
            prompt: "再选一次？",
            options: [{ name: "back", text: "返回", next: "close" }],
          },
          { kind: "end", name: "close" },
        ],
      })
    ).not.toThrow();
  });

  it("projects the labeled flow graph with document grouping", () => {
    const stageNode = templateFlowGraphV1.nodes.find(
      (node) => node.nodeId === "node.template.opening",
    );
    expect(stageNode).toMatchObject({
      kind: "stage",
      docId: "doc.template.opening",
      blockName: "opening",
      summary: "cue:scene.template.opening/courtyard + cue:scene.template.opening/mist",
      source: "interaction-doc:doc.template.opening#opening",
    });
    const lookEdge = templateFlowGraphV1.edges.find(
      (edge) =>
        edge.from === "node.template.first-choice" &&
        edge.label.kind === "choice" &&
        edge.label.choiceId === "choice.template.look",
    );
    expect(lookEdge).toMatchObject({
      to: "node.template.cat-line",
      label: {
        kind: "choice",
        textId: "text.template.choice.look",
        text: "去看看檐下的动静",
        gates: [],
      },
    });
    const gateEdge = templateFlowGraphV1.edges.find(
      (edge) =>
        edge.from === "node.template.ending-gate" && edge.to === "node.template.ending-warm",
    );
    expect(gateEdge).toMatchObject({
      label: { kind: "branch", condition: "flag flag.template.cat_found" },
    });
    // The choice block projects with the shared flow vocabulary ("menu").
    const menuNode = templateFlowGraphV1.nodes.find(
      (node) => node.nodeId === "node.template.first-choice",
    );
    expect(menuNode?.kind).toBe("menu");
    expect(menuNode?.summary).toBe(
      "接下来做什么？ / 去看看檐下的动静 / 小跑过去看个究竟 / 先回屋里",
    );
    // The hold beat projects its authoritative duration; its opening ops
    // stage node precedes it in the same document.
    const holdNode = templateFlowGraphV1.nodes.find(
      (node) => node.nodeId === "node.template.mei-fetches",
    );
    expect(holdNode).toMatchObject({ kind: "hold", summary: "hold 600ms" });
    expect(templateFlowGraphV1.edges).toContainEqual(
      expect.objectContaining({
        from: "node.template.mei-fetches-stage",
        to: "node.template.mei-fetches",
      }),
    );
    // The declared-condition reroute projects as a labeled edge off the
    // hold, so Flow shows the abort path next to the expiry path.
    const rerouteEdge = templateFlowGraphV1.edges.find(
      (edge) => edge.from === "node.template.mei-fetches" && edge.to === "node.template.hurry-line",
    );
    expect(rerouteEdge).toMatchObject({
      label: { kind: "branch", condition: "when flag.template.hurried" },
    });
  });

  it("keeps branch choosers inside their static successor annotations", () => {
    const flagSets: readonly (readonly string[])[] = [
      [],
      ["flag.template.cat_found"],
      ["flag.template.cat_found", "flag.other"],
    ];
    for (const node of templateScriptV1) {
      if (node.kind !== "branch") continue;
      for (const flags of flagSets) {
        expect(node.successors, node.nodeId).toContain(node.choose({ flags }));
      }
    }
  });
});

describe("template presentation edge context", () => {
  it("resolves Mei's shared enter edge per dispatching cue through the composed catalog", () => {
    const meiEnter: StageTargetChange = {
      kind: "enter",
      layerId: "layer.template.characters" as StageTargetChange["layerId"],
      entryKey: "layer.template.characters:tag.mei",
      previous: null,
      next: {
        contentId: "content.template.character.mei",
      } as unknown as NonNullable<StageTargetChange["next"]>,
    };

    // The ceremonial entrance plays its bound motion; the mid-beat return
    // on the same edge is an explicit cut (non-null, so no outer rule can
    // re-animate it).
    expect(
      templateStageTransitionCatalogV1.resolveTransition({
        ...meiEnter,
        dispatches: [
          { sceneId: "scene.template.opening", cueId: "cue.template.opening.mei-enters" },
        ],
      }),
    ).toMatchObject({ transitionId: "transition.template.opening.mei-enters", kind: "motion" });
    expect(
      templateStageTransitionCatalogV1.resolveTransition({
        ...meiEnter,
        dispatches: [
          { sceneId: "scene.template.opening", cueId: "cue.template.opening.mei-returns" },
        ],
      }),
    ).toMatchObject({ transitionId: "transition.template.opening.mei-returns", kind: "cut" });

    // Without context the divergent edge declares nothing scene-level and
    // no Story rule catches an enter: instant, deterministic.
    expect(templateStageTransitionCatalogV1.resolveTransition(meiEnter)).toBeNull();
  });

  it("annotates stage nodes with their scene dispatches for the runner", () => {
    // The hold block's opening ops compile to a real stage node entered
    // before the wait, carrying the cue dispatch like any stage beat.
    const fetches = templateScriptV1.find((node) =>
      node.kind === "stage" && node.nodeId === "node.template.mei-fetches-stage"
    );
    expect(fetches).toMatchObject({
      next: "node.template.mei-fetches",
      dispatches: [
        { sceneId: "scene.template.opening", cueId: "cue.template.opening.mei-fetches" },
      ],
    });
    const opening = templateScriptV1.find((node) =>
      node.kind === "stage" && node.nodeId === "node.template.opening"
    );
    expect(opening).toMatchObject({
      dispatches: [
        { sceneId: "scene.template.opening", cueId: "cue.template.opening.courtyard" },
        { sceneId: "scene.template.opening", cueId: "cue.template.opening.mist" },
      ],
    });
    // Appearance-only beats dispatch nothing.
    const smiles = templateScriptV1.find((node) =>
      node.kind === "stage" && node.nodeId === "node.template.mei-smiles"
    );
    expect(smiles).toMatchObject({ dispatches: [] });
  });
});

describe("template opening ambient (authorable frame set)", () => {
  it("declares Mei's blink as a scene-document frame loop over her frame set", () => {
    // The content side owns the ordered frame table the track indexes.
    const mei = templateStageContentCatalogV1.resolveContent(
      "content.template.character.mei" as Parameters<
        typeof templateStageContentCatalogV1.resolveContent
      >[0],
      {},
    );
    expect(mei?.frameAssetIds).toEqual([
      "asset.template.mei-eyes-open",
      "asset.template.mei-eyes-closed",
    ]);

    // The scene document binds the blink loop to Mei's settled presence —
    // same declared route as the mist drift, no renderer CSS animation.
    const binding = templateOpeningAmbientCatalogV1.resolveAmbient(
      "layer.template.characters" as Parameters<
        typeof templateOpeningAmbientCatalogV1.resolveAmbient
      >[0],
      {
        key: "layer.template.characters:tag.mei",
        contentId: "content.template.character.mei",
      } as Parameters<typeof templateOpeningAmbientCatalogV1.resolveAmbient>[1],
    );
    expect(binding).not.toBeNull();

    // Stepped frame semantics over one 4s cycle: eyes open, a 200ms blink
    // near the end (3600–3800ms), open again — no interpolation.
    expect(sampleMotionAt(binding!.motion, 0).frameIndex).toBe(0);
    expect(sampleMotionAt(binding!.motion, 3500).frameIndex).toBe(0);
    expect(sampleMotionAt(binding!.motion, 3700).frameIndex).toBe(1);
    expect(sampleMotionAt(binding!.motion, 3900).frameIndex).toBe(0);
  });
});

describe("template narrative playthrough", () => {
  it("plays the cat route to the warm ending with saved flags", async () => {
    const application = await createTemplateApplicationInstanceV1();
    try {
      const dispatch = async (invocation: unknown) => {
        const result = await application.semantic.dispatch(invocation as never);
        expect(result).toMatchObject({ kind: "committed" });
      };
      await dispatch({ kind: "invoke", actionId: "template.begin_story" });

      let publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.greeting",
      });
      // The opening stage node put the background, mist, and Mei on stage.
      const layers = publication.game.stage.layers;
      expect(layers.flatMap((layer) => layer.entries.map((entry) => entry.contentId))).toEqual([
        "content.template.background.courtyard",
        "content.template.effect.mist",
        "content.template.character.mei",
      ]);

      await dispatch(currentResolveV1(application, { kind: "advance" }));
      publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({ kind: "choice" });
      expect(publication.narrative.choiceOptions).toHaveLength(3);

      await dispatch(
        currentResolveV1(application, { kind: "choose", choiceId: "choice.template.look" }),
      );
      publication = application.semantic.observe();
      expect(publication.narrative.flags).toEqual(["flag.template.cat_found"]);
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.cat",
      });

      await dispatch(currentResolveV1(application, { kind: "advance" }));
      publication = application.semantic.observe();
      // Mei smiled, then darted off-frame to fetch the kitten: the
      // explicit-cut hide committed in this same command (the hold block's
      // opening ops), and the screen now holds on the empty frame for an
      // authoritative 600ms. The dispatch batch pairs with this revision.
      expect(publication.narrative.pending).toMatchObject({
        kind: "hold",
        totalMs: 600,
        remainingMs: 600,
        skippable: false,
      });
      const meiAway = publication.game.stage.layers
        .find((layer) => layer.layerId === "layer.template.characters")
        ?.entries.find((entry) => entry.tag === "tag.mei");
      expect(meiAway).toBeUndefined();
      expect(application.stageCueDispatches()).toEqual({
        revision: publication.revision,
        epoch: application.presentationAnchor().epoch,
        dispatches: [
          {
            sceneId: "scene.template.opening",
            cueId: "cue.template.opening.mei-fetches",
          },
        ],
      });

      // A partial hold-fenced time tick decrements the authoritative
      // remaining time without consuming the boundary: same occurrence,
      // script not run.
      const holdOccurrence = publication.narrative.pending?.occurrenceId;
      await dispatch(currentTimeTickV1(application, 250));
      publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({
        kind: "hold",
        occurrenceId: holdOccurrence,
        totalMs: 600,
        remainingMs: 350,
      });

      // The tick that reaches zero expires the hold; the narration plays.
      await dispatch(currentTimeTickV1(application, 350));
      publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.fetch-line",
      });

      await dispatch(currentResolveV1(application, { kind: "advance" }));
      publication = application.semantic.observe();
      // She is instantly back in frame (explicit-cut show on the same enter
      // edge her ceremonial entrance motion binds), carrying the kitten
      // into the warm ending. The re-show restores the scene-declared
      // appearance.
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.ending-warm",
      });
      const mei = publication.game.stage.layers
        .find((layer) => layer.layerId === "layer.template.characters")
        ?.entries.find((entry) => entry.tag === "tag.mei");
      expect(mei?.contentId).toBe("content.template.character.mei");
      expect(mei?.appearance).toMatchObject({ expression: "calm" });
      expect(application.stageCueDispatches()).toMatchObject({
        revision: publication.revision,
        dispatches: [
          {
            sceneId: "scene.template.opening",
            cueId: "cue.template.opening.mei-returns",
          },
        ],
      });

      await dispatch(currentResolveV1(application, { kind: "advance" }));
      publication = application.semantic.observe();
      expect(publication.narrative.phase).toBe("completed");
      expect(publication.narrative.pending).toBeNull();
      expect(publication.narrative.history.entries.length).toBeGreaterThanOrEqual(3);
    } finally {
      await application.dispose();
    }
  });

  it("reroutes the fetch hold at entry on the hurried path without opening the wait", async () => {
    const application = await createTemplateApplicationInstanceV1();
    try {
      const dispatch = async (invocation: unknown) => {
        const result = await application.semantic.dispatch(invocation as never);
        expect(result).toMatchObject({ kind: "committed" });
      };
      await dispatch({ kind: "invoke", actionId: "template.begin_story" });
      await dispatch(currentResolveV1(application, { kind: "advance" }));
      await dispatch(
        currentResolveV1(application, { kind: "choose", choiceId: "choice.template.hurry" }),
      );
      let publication = application.semantic.observe();
      expect(publication.narrative.flags).toEqual([
        "flag.template.cat_found",
        "flag.template.hurried",
      ]);
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.cat",
      });

      // Advancing plays the smile beat and the hold's opening stage batch,
      // but the hold itself reroutes at entry: the `when` arm's flag was
      // set in this transaction's working state, so the 600ms wait never
      // opens and the close-up line is pending instead — zero elapsed,
      // zero hold occurrence.
      await dispatch(currentResolveV1(application, { kind: "advance" }));
      publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.hurry-line",
      });
      expect(application.stageCueDispatches()).toMatchObject({
        revision: publication.revision,
        dispatches: [
          {
            sceneId: "scene.template.opening",
            cueId: "cue.template.opening.mei-fetches",
          },
        ],
      });

      // The reroute path rejoins the return beat and the warm ending.
      await dispatch(currentResolveV1(application, { kind: "advance" }));
      publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.ending-warm",
      });
      await dispatch(currentResolveV1(application, { kind: "advance" }));
      expect(application.semantic.observe().narrative.phase).toBe("completed");
    } finally {
      await application.dispose();
    }
  });

  it("plays the inside route to the plain ending without flags", async () => {
    const application = await createTemplateApplicationInstanceV1();
    try {
      const dispatch = async (invocation: unknown) => {
        const result = await application.semantic.dispatch(invocation as never);
        expect(result).toMatchObject({ kind: "committed" });
      };
      await dispatch({ kind: "invoke", actionId: "template.begin_story" });
      await dispatch(currentResolveV1(application, { kind: "advance" }));
      await dispatch(
        currentResolveV1(application, { kind: "choose", choiceId: "choice.template.inside" }),
      );
      const midway = application.semantic.observe();
      expect(midway.narrative.flags).toEqual([]);
      expect(midway.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.inside",
      });
      await dispatch(currentResolveV1(application, { kind: "advance" }));
      expect(application.semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.ending-plain",
      });
      await dispatch(currentResolveV1(application, { kind: "advance" }));
      expect(application.semantic.observe().narrative.phase).toBe("completed");
    } finally {
      await application.dispose();
    }
  });

  it("fences stale occurrences and rejects them without changing state", async () => {
    const application = await createTemplateApplicationInstanceV1();
    try {
      const begin = await application.semantic.dispatch({
        kind: "invoke",
        actionId: "template.begin_story",
      } as never);
      expect(begin).toMatchObject({ kind: "committed" });
      const before = application.admin.stateDigest();
      // An explicitly pinned stale occurrence exercises the fence contract.
      const stale = await application.semantic.dispatch(
        {
          kind: "resolve",
          expectedOccurrenceId: "interaction-occurrence.99",
          resolution: { kind: "advance" },
        } as never,
      );
      expect(stale).toMatchObject({ kind: "rejected" });
      expect(application.admin.stateDigest()).toBe(before);
    } finally {
      await application.dispose();
    }
  });

  it("earns coins through the empty-shell inventory module", async () => {
    const application = await createTemplateApplicationInstanceV1();
    try {
      expect(application.semantic.observe().game.coins).toBe(0);
      const result = await application.semantic.dispatch({
        kind: "invoke",
        actionId: "template.earn_coin",
      } as never);
      expect(result).toMatchObject({ kind: "committed" });
      expect(application.semantic.observe().game.coins).toBe(1);
    } finally {
      await application.dispose();
    }
  });
});

describe("template determinism", () => {
  it("replays authoritatively through the harness", async () => {
    const harness = await createGameHarnessV1({
      entry: templateStoryEntryV1,
      semantic: templateSemanticAdapterV1,
      seed: 4242,
    });
    const invocations = [
      { kind: "invoke", actionId: "template.earn_coin" },
      { kind: "invoke", actionId: "template.begin_story" },
      {
        kind: "resolve",
        expectedOccurrenceId: "interaction-occurrence.1",
        resolution: { kind: "advance" },
      },
    ] as const;
    for (const invocation of invocations) {
      const outcome = await harness.dispatch(invocation as never);
      expect(outcome).toMatchObject({ kind: "committed" });
    }
    const replay = await harness.admin.replayAuthoritatively();
    expect(replay).toMatchObject({ authoritative: true, identityMatch: true, matches: true });
    await harness.dispose();
  });
});
