// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { InteractionResolutionV1, SemanticStageStateV1 } from "@sillymaker/base";
import { lintNarrativeGraphV1, reduceStageMutationsV1 } from "@sillymaker/base";
import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import type { LabInvocationV1 } from "../index.ts";
import {
  labPrefetchPlanV1,
  labSemanticAdapterV1,
  labStoryEntryV1,
  predictLabNarrativeV1,
  projectLabNarrativeGraphV1,
} from "../index.ts";
import { labNarrativeScriptV1 } from "../gameplay/narrative.ts";
import { createInitialLabStageStateV1 } from "../gameplay/stage.ts";

function createLabHarnessV1(seed = 424_242) {
  return createGameHarnessV1({
    entry: labStoryEntryV1,
    semantic: labSemanticAdapterV1,
    seed,
  });
}

type LabHarnessV1 = Awaited<ReturnType<typeof createLabHarnessV1>>;

function resolveV1(
  expectedOccurrenceId: string,
  resolution: InteractionResolutionV1,
): LabInvocationV1 {
  return Object.freeze({ kind: "resolve" as const, expectedOccurrenceId, resolution });
}

async function playCalibrationV1(
  harness: LabHarnessV1,
  onCursor?: (cursor: string) => void,
): Promise<void> {
  const dispatch = async (invocation: LabInvocationV1) => {
    const result = await harness.dispatch(invocation);
    expect(result).toMatchObject({ kind: "committed" });
  };
  const pending = () => {
    const value = harness.observe().narrative.pending;
    if (value === null) throw new Error("expected a pending interaction");
    return value;
  };
  await dispatch(Object.freeze({ kind: "invoke" as const, actionId: "lab.begin_calibration" }));
  onCursor?.("node.e2e.cal.intro");
  await dispatch(resolveV1(pending().occurrenceId, { kind: "advance" }));
  onCursor?.("node.e2e.cal.beta-note");
  await dispatch(resolveV1(pending().occurrenceId, { kind: "advance" }));
  onCursor?.("node.e2e.cal.approach");
  await dispatch(
    resolveV1(pending().occurrenceId, { kind: "choose", choiceId: "choice.e2e.cal.basic" }),
  );
  await dispatch(
    resolveV1(pending().occurrenceId, {
      kind: "barrier_completed",
      transitionId: "transition.e2e.bg-crossfade",
    }),
  );
  await dispatch(Object.freeze({
    kind: "time" as const,
    tick: Object.freeze({ elapsedMs: 400, expectedHoldOccurrenceId: pending().occurrenceId }),
  }));
  await dispatch(resolveV1(pending().occurrenceId, { kind: "custom", payload: { value: 2 } }));
  await dispatch(resolveV1(pending().occurrenceId, { kind: "advance" }));
}

describe("Lab narrative graph", () => {
  it("projects the script into a lint-clean graph", () => {
    const graph = projectLabNarrativeGraphV1();
    expect(graph.nodes).toHaveLength(labNarrativeScriptV1.length);
    expect(lintNarrativeGraphV1(graph)).toEqual([]);
    // Sources point back into the script for every node.
    for (const node of graph.nodes) {
      expect(node.source).toBe(`gameplay/narrative.ts#${node.nodeId}`);
    }
  });

  it("keeps the static mayShow annotations honest against the mutation functions", () => {
    // Run every stage node's real mutation function against representative
    // stages (initial, and after each preceding stage node applied) and
    // prove every shown/replaced content is declared in mayShow.
    const stages: SemanticStageStateV1[] = [createInitialLabStageStateV1()];
    for (const node of labNarrativeScriptV1) {
      if (node.kind !== "stage") continue;
      const nextStages: SemanticStageStateV1[] = [];
      for (const stage of stages) {
        const mutations = node.mutations(stage);
        for (const mutation of mutations) {
          if (mutation.kind === "show" || mutation.kind === "replace") {
            expect(node.mayShow).toContain(mutation.contentId);
          }
        }
        const outcome = reduceStageMutationsV1(stage, mutations);
        nextStages.push(outcome.kind === "applied" ? outcome.state : stage);
      }
      stages.push(...nextStages);
    }
  });

  it("keeps branch routing honest against the static successor annotations", () => {
    // Every branch node's choose() must land inside its declared
    // successors for representative relationship values, so the
    // lint/prediction graph mirrors what the runner can actually do.
    for (const node of labNarrativeScriptV1) {
      if (node.kind !== "branch") continue;
      for (const rapport of [0, 1, 2, 3]) {
        expect(node.successors).toContain(node.choose({ rapport }));
      }
    }
    expect(labNarrativeScriptV1.some((node) => node.kind === "branch")).toBe(true);
  });

  it("predicts both choice branches from the live cursor without deciding them", async () => {
    const harness = await createLabHarnessV1();
    await harness.dispatch(
      Object.freeze({ kind: "invoke" as const, actionId: "lab.begin_calibration" }),
    );
    const cursor = harness.observe().narrative.pending;
    expect(cursor?.kind).toBe("say");

    const prediction = predictLabNarrativeV1("node.e2e.cal.intro");
    // Voice for the intro say and for the far "done" say are both inside
    // the default budget, as are both branch marks and the flip contents.
    expect(prediction.assetIds).toContain("audio.e2e.voice.cal-intro");
    expect(prediction.assetIds).toContain("audio.e2e.voice.cal-done");
    expect(prediction.stageContentIds).toContain("content.e2e.prop.beacon");
    expect(prediction.stageContentIds).toContain("content.e2e.bg.lab");
    expect(prediction.stageContentIds).toContain("content.e2e.bg.storeroom");
    // Both branches' texts are collected; prediction never picks one.
    expect(prediction.textIds).toContain("text.e2e.lab.narrative.cal.basic");
    expect(prediction.textIds).toContain("text.e2e.lab.narrative.cal.precise");
    expect(prediction.truncated).toBe(false);

    const again = predictLabNarrativeV1("node.e2e.cal.intro");
    expect(again).toEqual(prediction);
  });

  it("maps a prediction to an opportunistic prefetch plan", () => {
    const plan = labPrefetchPlanV1("node.e2e.cal.intro");
    expect(plan.planId).toBe("plan.e2e.prefetch.node.e2e.cal.intro");
    expect(plan.entries.length).toBeGreaterThan(0);
    for (const entry of plan.entries) {
      expect(entry.priority).toBe("opportunistic");
      expect(entry.group).toBe("e2e-narrative-prefetch");
    }
  });

  it("leaves snapshot, RNG, and command log untouched by prediction", async () => {
    const predicted = await createLabHarnessV1();
    const control = await createLabHarnessV1();

    await playCalibrationV1(control);
    await playCalibrationV1(predicted, (cursor) => {
      // Predict at every boundary while the run is live.
      const prediction = predictLabNarrativeV1(cursor);
      expect(prediction.visitedNodeIds.length).toBeGreaterThan(0);
      labPrefetchPlanV1(cursor);
    });

    // Command log entries carry post-state digests, so equality here covers
    // state, RNG evidence, and ordering in one comparison.
    expect(predicted.admin.commandLog()).toEqual(control.admin.commandLog());
    expect(predicted.admin.inspectForTest().snapshot).toEqual(
      control.admin.inspectForTest().snapshot,
    );

    await predicted.dispose();
    await control.dispose();
  });
});
