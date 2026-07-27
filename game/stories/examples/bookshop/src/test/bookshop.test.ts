// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { lintNarrativeGraph } from "@sillymaker/base/story";
import { createGameHarnessV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { createBookshopApplicationInstanceV1 } from "../application/core-application.ts";
import { projectBookshopNarrativeGraphV1 } from "../narrative-graph.ts";
import { bookshopScriptV1 } from "../narrative.ts";
import { bookshopTextCatalogsV1 } from "../presentation.ts";
import { bookshopSemanticAdapterV1 } from "../application/semantic.ts";
import { bookshopStoryEntryV1 } from "../story.ts";

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

describe("bookshop story baseline", () => {
  it("resolves the Story package", () => {
    const resolved = resolveStoryForTestV1(bookshopStoryEntryV1);
    expect(resolved.gameSimulation.modules).toHaveLength(3);
    expect(resolved.provenance.story.id).toBe("story.example.bookshop");
  });

  it("keeps the narrative graph lint-clean", () => {
    const diagnostics = lintNarrativeGraph(projectBookshopNarrativeGraphV1());
    expect(diagnostics).toEqual([]);
  });

  it("registers every referenced textId in the default catalog", () => {
    const catalog = bookshopTextCatalogsV1.catalogs.find(
      (candidate) => candidate.locale === bookshopTextCatalogsV1.defaultLocale,
    );
    const known = new Set(catalog?.entries.map((entry) => entry.textId as string));
    for (const node of bookshopScriptV1) {
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
      ["flag.bookshop.helped"],
      ["flag.bookshop.helped", "flag.other"],
    ];
    for (const node of bookshopScriptV1) {
      if (node.kind !== "branch") continue;
      for (const flags of flagSets) {
        expect(node.successors, node.nodeId).toContain(node.choose({ flags }));
      }
    }
  });
});

describe("bookshop narrative playthrough", () => {
  it("plays the helped route to the warm ending with saved flags", async () => {
    const application = await createBookshopApplicationInstanceV1();
    try {
      const dispatch = async (invocation: unknown) => {
        const result = await application.semantic.dispatch(invocation as never);
        expect(result).toMatchObject({ kind: "committed" });
      };
      await dispatch({ kind: "invoke", actionId: "bookshop.begin_story" });

      let publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.bookshop.line.opening-narration",
      });
      // The opening stage node put the shop and 老周 on stage.
      const layers = publication.game.stage.layers;
      expect(layers.flatMap((layer) => layer.entries.map((entry) => entry.contentId))).toEqual([
        "content.bookshop.background.shop",
        "content.bookshop.character.zhou",
      ]);

      await dispatch(advanceV1(1));
      await dispatch(advanceV1(2));
      publication = application.semantic.observe();
      // 阿澄 has entered after the opening lines.
      expect(
        publication.game.stage.layers.flatMap((layer) =>
          layer.entries.map((entry) => entry.contentId),
        ),
      ).toEqual([
        "content.bookshop.background.shop",
        "content.bookshop.character.zhou",
        "content.bookshop.character.cheng",
      ]);
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.bookshop.line.cheng-asks",
      });

      await dispatch(advanceV1(3));
      await dispatch(advanceV1(4));
      publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({ kind: "choice" });
      expect(publication.narrative.choiceOptions).toHaveLength(2);

      await dispatch(chooseV1(5, "choice.bookshop.help"));
      publication = application.semantic.observe();
      expect(publication.narrative.flags).toEqual(["flag.bookshop.helped"]);
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.bookshop.line.help-1",
      });

      await dispatch(advanceV1(6));
      await dispatch(advanceV1(7));
      await dispatch(advanceV1(8));
      publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({ kind: "choice" });
      // Yard background and soft expression after the merge stage.
      expect(
        publication.game.stage.layers
          .find((layer) => layer.layerId === "layer.bookshop.background")
          ?.entries.find((entry) => entry.tag === "tag.background")?.contentId,
      ).toBe("content.bookshop.background.yard");
      const zhou = publication.game.stage.layers
        .find((layer) => layer.layerId === "layer.bookshop.characters")
        ?.entries.find((entry) => entry.tag === "tag.zhou");
      expect(zhou?.appearance).toMatchObject({ expression: "soft" });

      // Buy option needs a coin; earn one then purchase.
      await dispatch({ kind: "invoke", actionId: "bookshop.earn_coin" });
      await dispatch(chooseV1(9, "choice.bookshop.buy"));
      publication = application.semantic.observe();
      expect(publication.game.coins).toBe(0);
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.bookshop.line.after-buy",
      });

      await dispatch(advanceV1(10));
      publication = application.semantic.observe();
      expect(publication.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.bookshop.line.ending-helped",
      });

      await dispatch(advanceV1(11));
      publication = application.semantic.observe();
      expect(publication.narrative.phase).toBe("completed");
      expect(publication.narrative.pending).toBeNull();
      expect(publication.narrative.history.entries.length).toBeGreaterThanOrEqual(3);
    } finally {
      await application.dispose();
    }
  });

  it("plays the ushered route to the plain ending without flags", async () => {
    const application = await createBookshopApplicationInstanceV1();
    try {
      const dispatch = async (invocation: unknown) => {
        const result = await application.semantic.dispatch(invocation as never);
        expect(result).toMatchObject({ kind: "committed" });
      };
      await dispatch({ kind: "invoke", actionId: "bookshop.begin_story" });
      await dispatch(advanceV1(1));
      await dispatch(advanceV1(2));
      await dispatch(advanceV1(3));
      await dispatch(advanceV1(4));
      await dispatch(chooseV1(5, "choice.bookshop.usher"));
      const midway = application.semantic.observe();
      expect(midway.narrative.flags).toEqual([]);
      expect(midway.narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.bookshop.line.usher-1",
      });
      await dispatch(advanceV1(6));
      await dispatch(advanceV1(7));
      await dispatch(advanceV1(8));
      await dispatch(chooseV1(9, "choice.bookshop.leave-book"));
      await dispatch(advanceV1(10));
      expect(application.semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        textId: "text.bookshop.line.ending-plain",
      });
      await dispatch(advanceV1(11));
      expect(application.semantic.observe().narrative.phase).toBe("completed");
    } finally {
      await application.dispose();
    }
  });

  it("fences stale occurrences and rejects them without changing state", async () => {
    const application = await createBookshopApplicationInstanceV1();
    try {
      const begin = await application.semantic.dispatch({
        kind: "invoke",
        actionId: "bookshop.begin_story",
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
    const application = await createBookshopApplicationInstanceV1();
    try {
      expect(application.semantic.observe().game.coins).toBe(0);
      const result = await application.semantic.dispatch({
        kind: "invoke",
        actionId: "bookshop.earn_coin",
      } as never);
      expect(result).toMatchObject({ kind: "committed" });
      expect(application.semantic.observe().game.coins).toBe(1);
    } finally {
      await application.dispose();
    }
  });
});

describe("bookshop determinism", () => {
  it("replays authoritatively through the harness", async () => {
    const harness = await createGameHarnessV1({
      entry: bookshopStoryEntryV1,
      semantic: bookshopSemanticAdapterV1,
      seed: 4242,
    });
    const invocations = [
      { kind: "invoke", actionId: "bookshop.earn_coin" },
      { kind: "invoke", actionId: "bookshop.begin_story" },
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
