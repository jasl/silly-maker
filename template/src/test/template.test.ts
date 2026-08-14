// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { lintNarrativeGraph } from "@sillymaker/base/story";
import { createGameHarnessV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { createTemplateApplicationInstanceV1 } from "../application/core-application.ts";
import { defineTemplateScriptV1 } from "../narrative-kit.ts";
import { projectTemplateNarrativeGraphV1 } from "../narrative-graph.ts";
import { templateScriptV1 } from "../narrative.ts";
import { templateTextCatalogsV1 } from "../presentation.ts";
import { templateSemanticAdapterV1 } from "../application/semantic.ts";
import { templateStoryEntryV1 } from "../story.ts";

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

  it("rejects duplicate node names and conflicting inline text at build time", () => {
    expect(() =>
      defineTemplateScriptV1({
        prefix: "template",
        nodes: [
          { kind: "end", name: "close" },
          { kind: "end", name: "close" },
        ],
      })
    ).toThrow("template.script_duplicate_node:close");
    expect(() =>
      defineTemplateScriptV1({
        prefix: "template",
        nodes: [
          { kind: "say", name: "a", speaker: null, text: "一句", next: "b", textId: "text.x" },
          { kind: "say", name: "b", speaker: null, text: "另一句", next: "a", textId: "text.x" },
        ],
      })
    ).toThrow("template.script_text_conflict:text.x");
    expect(() =>
      defineTemplateScriptV1({
        prefix: "template",
        nodes: [{ kind: "say", name: "a", speaker: "ghost", text: "……", next: "a" }],
      })
    ).toThrow("template.script_speaker_unknown:ghost");
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
      // The opening stage node put the background and Mei on stage.
      const layers = publication.game.stage.layers;
      expect(layers.flatMap((layer) => layer.entries.map((entry) => entry.contentId))).toEqual([
        "content.template.background.courtyard",
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
      // The branch routed on the flag; Mei is smiling now.
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.ending-warm",
      });
      const mei = publication.game.stage.layers
        .find((layer) => layer.layerId === "layer.template.characters")
        ?.entries.find((entry) => entry.tag === "tag.mei");
      expect(mei?.appearance).toMatchObject({ expression: "smiling" });

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
