// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { lintNarrativeGraph } from "@sillymaker/base/story";
import { createGameHarnessV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { createTemplateApplicationInstanceV1 } from "../application/core-application.ts";
import { projectTemplateNarrativeGraphV1 } from "../narrative-graph.ts";
import { templateScriptV1 } from "../narrative.ts";
import { templateTextCatalogsV1 } from "../presentation.ts";
import { templateSemanticAdapterV1 } from "../application/semantic.ts";
import { templateStoryEntryV1 } from "../story.ts";

function advanceV1(occurrence: number) {
  return Object.freeze({
    kind: "resolve" as const,
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution: Object.freeze({ kind: "advance" as const }),
  });
}

function chooseV1(occurrence: number, choiceId: string) {
  return Object.freeze({
    kind: "resolve" as const,
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution: Object.freeze({ kind: "choose" as const, choiceId }),
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

      await dispatch(advanceV1(1));
      publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({ kind: "choice" });
      expect(publication.narrative.choiceOptions).toHaveLength(2);

      await dispatch(chooseV1(2, "choice.template.look"));
      publication = application.semantic.observe();
      expect(publication.narrative.flags).toEqual(["flag.template.cat_found"]);
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.cat",
      });

      await dispatch(advanceV1(3));
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

      await dispatch(advanceV1(4));
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
      await dispatch(advanceV1(1));
      await dispatch(chooseV1(2, "choice.template.inside"));
      const midway = application.semantic.observe();
      expect(midway.narrative.flags).toEqual([]);
      expect(midway.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.inside",
      });
      await dispatch(advanceV1(3));
      expect(application.semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.template.line.ending-plain",
      });
      await dispatch(advanceV1(4));
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
      const stale = await application.semantic.dispatch(advanceV1(99) as never);
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
