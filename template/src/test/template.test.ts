// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { lintNarrativeGraph } from "@sillymaker/base/story";
import { createGameHarnessV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import type { StageTargetChange } from "@sillymaker/base/story";

import { createTemplateApplicationInstanceV1 } from "../application/core-application.ts";
import type { TemplateInteractionDocV1 } from "../story/narrative-kit.ts";
import { compileTemplateInteractionDocV1 } from "../story/narrative-kit.ts";
import { projectTemplateNarrativeGraphV1 } from "../story/narrative-graph.ts";
import { templateFlowGraphV1, templateScriptV1 } from "../story/narrative.ts";
import {
  templateStageTransitionCatalogV1,
  templateTextCatalogsV1,
} from "../content/presentation.ts";
import { templateSemanticAdapterV1 } from "../application/semantic.ts";
import { templateStoryEntryV1 } from "../story.ts";

function compileDocV1(
  doc: Omit<TemplateInteractionDocV1, "prefix" | "docId">,
): ReturnType<typeof compileTemplateInteractionDocV1> {
  return compileTemplateInteractionDocV1({
    doc: { prefix: "template", docId: "doc.template.probe", ...doc },
  });
}

/** Resolves whatever is pending now — inserting script lines never renumbers tests. */
function currentResolveV1(
  application: { readonly semantic: { observe(): unknown } },
  resolution: Readonly<Record<string, unknown>>,
) {
  const publication = application.semantic.observe() as {
    readonly narrative: { readonly pending: { readonly occurrenceId: string } | null };
  };
  const pending = publication.narrative.pending;
  if (pending === null) throw new TypeError("test.no_pending_interaction");
  return Object.freeze({
    kind: "resolve" as const,
    expectedOccurrenceId: pending.occurrenceId,
    resolution: Object.freeze(resolution),
  });
}

describe("template story baseline", () => {
  it("resolves the Story package", () => {
    const resolved = resolveStoryForTestV1(templateStoryEntryV1);
    expect(resolved.gameSimulation.modules).toHaveLength(3);
    expect(resolved.provenance.story.id).toBe("story.template.starter");
  });

  it("keeps the narrative graph lint-clean", () => {
    const diagnostics = lintNarrativeGraph(projectTemplateNarrativeGraphV1());
    expect(diagnostics).toEqual([]);
  });

  it("registers every referenced textId in the default catalog", () => {
    const catalog = templateTextCatalogsV1.catalogs.find(
      (candidate) => candidate.locale === templateTextCatalogsV1.defaultLocale,
    );
    const known = new Set(catalog?.entries.map((entry) => entry.textId as string));
    for (const node of templateScriptV1) {
      if (node.kind === "say") {
        expect(known, node.nodeId).toContain(node.textId);
        if (node.speakerTextId !== null) expect(known, node.nodeId).toContain(node.speakerTextId);
      }
      if (node.kind === "choice") {
        expect(known, node.nodeId).toContain(node.promptTextId);
        for (const option of node.options) expect(known, option.choiceId).toContain(option.textId);
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
        "choice.template.inside",
      ]);
    }
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
      label: { kind: "choice", textId: "text.template.choice.look", gates: [] },
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
    const fetches = templateScriptV1.find((node) =>
      node.kind === "stage" && node.nodeId === "node.template.mei-fetches"
    );
    expect(fetches).toMatchObject({
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
      expect(publication.narrative.choiceOptions).toHaveLength(2);

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
      // explicit-cut hide leaves her absent while the narration plays, and
      // the commit's dispatch batch pairs with exactly this revision.
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.fetch-line",
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
