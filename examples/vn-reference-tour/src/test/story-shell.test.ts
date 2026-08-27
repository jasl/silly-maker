// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { lintNarrativeGraph } from "@sillymaker/base/story";
import { createGameHarnessV1, resolveStoryForTestV1 } from "@sillymaker/base/testkit";

import { createVnReferenceTourApplicationInstanceV1 } from "../application/core-application.ts";
import { vnReferenceTourSemanticAdapterV1 } from "../application/semantic.ts";
import { projectVnReferenceTourNarrativeGraphV1 } from "../story/narrative-graph.ts";
import { vnReferenceTourStoryEntryV1 } from "../story.ts";

function currentOccurrenceIdV1(
  application: { readonly semantic: { observe(): unknown } },
): string {
  const publication = application.semantic.observe() as {
    readonly narrative: { readonly pending: { readonly occurrenceId: string } | null };
  };
  const pending = publication.narrative.pending;
  if (pending === null) throw new TypeError("vn-reference-tour.test_pending_missing");
  return pending.occurrenceId;
}

describe("VN Reference Tour M0 shell", () => {
  it("resolves only the selected narrative and Stage authorities", () => {
    const resolved = resolveStoryForTestV1(vnReferenceTourStoryEntryV1);
    expect(resolved.provenance.story.id).toBe("story.example.vn-reference-tour");
    expect(resolved.gameSimulation.modules.map((module) => module.descriptor.id)).toEqual([
      "vn-reference-tour.narrative",
      "vn-reference-tour.stage",
    ]);
    expect(lintNarrativeGraph(projectVnReferenceTourNarrativeGraphV1())).toEqual([]);
  });

  it("begins headlessly and advances through the occurrence-fenced semantic port", async () => {
    const application = await createVnReferenceTourApplicationInstanceV1();
    try {
      await expect(application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-reference-tour.begin_story",
      } as never)).resolves.toMatchObject({ kind: "committed" });

      expect(application.semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        occurrenceId: "interaction-occurrence.1",
      });
      await expect(application.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: currentOccurrenceIdV1(application),
        resolution: { kind: "advance" },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      expect(application.semantic.observe().narrative.pending).toMatchObject({ kind: "choice" });
    } finally {
      await application.dispose();
    }
  });

  it("rejects a stale occurrence without changing authoritative State", async () => {
    const application = await createVnReferenceTourApplicationInstanceV1();
    try {
      await application.semantic.dispatch({
        kind: "invoke",
        actionId: "vn-reference-tour.begin_story",
      } as never);
      const before = application.admin.stateDigest();
      await expect(application.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: "interaction-occurrence.99",
        resolution: { kind: "advance" },
      } as never)).resolves.toMatchObject({
        kind: "rejected",
        codes: ["interaction.occurrence_mismatch"],
      });
      expect(application.admin.stateDigest()).toBe(before);
    } finally {
      await application.dispose();
    }
  });

  it("replays the structural scaffold authoritatively", async () => {
    const harness = await createGameHarnessV1({
      entry: vnReferenceTourStoryEntryV1,
      semantic: vnReferenceTourSemanticAdapterV1,
      seed: 4242,
    });
    try {
      await expect(harness.dispatch({
        kind: "invoke",
        actionId: "vn-reference-tour.begin_story",
      } as never)).resolves.toMatchObject({ kind: "committed" });
      await expect(harness.dispatch({
        kind: "resolve",
        expectedOccurrenceId: "interaction-occurrence.1",
        resolution: { kind: "advance" },
      } as never)).resolves.toMatchObject({ kind: "committed" });
      await expect(harness.admin.replayAuthoritatively()).resolves.toMatchObject({
        authoritative: true,
        identityMatch: true,
        matches: true,
      });
    } finally {
      await harness.dispose();
    }
  });
});
