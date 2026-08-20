// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { InteractionResolutionV1 } from "@sillymaker/base";
import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import type { LabInvocationV1 } from "../index.ts";
import { labSemanticAdapterV1, labStoryEntryV1 } from "../index.ts";

/**
 * The Engine Conformance route: one short, real application path exercising
 * the semantic stage (two backgrounds, two characters, a prop), all three
 * transition kinds, every interaction boundary, a choice with a real
 * cross-module cost, and the return to the ordinary SLG surface. Headless
 * and browser suites drive the exact same authoritative steps.
 */

function createLabHarnessV1(seed = 23049) {
  return createGameHarnessV1({
    entry: labStoryEntryV1,
    semantic: labSemanticAdapterV1,
    seed,
  });
}

type LabHarnessV1 = Awaited<ReturnType<typeof createLabHarnessV1>>;

const invokeV1 = (
  actionId: Extract<LabInvocationV1, { readonly kind: "invoke" }>["actionId"],
): LabInvocationV1 => Object.freeze({ kind: "invoke" as const, actionId });

function resolveV1(
  expectedOccurrenceId: string,
  resolution: InteractionResolutionV1,
): LabInvocationV1 {
  return Object.freeze({ kind: "resolve" as const, expectedOccurrenceId, resolution });
}

/** A hold-fenced time tick: the verb that folds the pending hold's remainder. */
function timeV1(expectedHoldOccurrenceId: string, elapsedMs: number): LabInvocationV1 {
  return Object.freeze({
    kind: "time" as const,
    tick: Object.freeze({ elapsedMs, expectedHoldOccurrenceId }),
  });
}

interface RouteBoundaryV1 {
  readonly kind: string;
  readonly definitionId: string;
}

/**
 * Plays the whole canonical route by observing boundaries, never by step
 * numbers: collect three samples, run the calibration narrative through the
 * precise branch (which atomically consumes a sample), then finish the
 * ordinary SLG procedure. Returns the boundary transcript.
 */
async function playCanonicalRouteV1(
  harness: LabHarnessV1,
  onBoundary?: (boundary: RouteBoundaryV1) => Promise<void> | void,
): Promise<readonly RouteBoundaryV1[]> {
  const transcript: RouteBoundaryV1[] = [];
  const dispatch = async (invocation: LabInvocationV1): Promise<void> => {
    const result = await harness.dispatch(invocation);
    expect(result).toMatchObject({ kind: "committed" });
  };

  for (let i = 0; i < 3; i += 1) await dispatch(invokeV1("lab.collect_sample"));
  await dispatch(invokeV1("lab.begin_calibration"));

  for (let step = 0; step < 16; step += 1) {
    const narrative = harness.observe().narrative;
    const pending = narrative.pending;
    if (pending === null) break;
    transcript.push(Object.freeze({ kind: pending.kind, definitionId: pending.definitionId }));
    await onBoundary?.(Object.freeze({ kind: pending.kind, definitionId: pending.definitionId }));
    switch (pending.kind) {
      case "say":
        await dispatch(resolveV1(pending.occurrenceId, { kind: "advance" }));
        break;
      case "choice":
        await dispatch(
          resolveV1(pending.occurrenceId, {
            kind: "choose",
            choiceId: "choice.e2e.cal.precise",
          }),
        );
        break;
      case "presentation_barrier":
        await dispatch(
          resolveV1(pending.occurrenceId, {
            kind: "barrier_completed",
            transitionId: pending.expectedTransitionId,
          }),
        );
        break;
      case "hold":
        await dispatch(timeV1(pending.occurrenceId, 400));
        break;
      default:
        await dispatch(resolveV1(pending.occurrenceId, { kind: "custom", payload: { value: 2 } }));
        break;
    }
  }

  await dispatch(invokeV1("lab.begin_procedure"));
  await dispatch(invokeV1("lab.run_experiment"));
  await dispatch(invokeV1("lab.run_experiment"));
  return Object.freeze(transcript);
}

describe("Engine Conformance route", () => {
  it("plays every boundary in order, spends the choice cost cross-module, and returns to the SLG surface", async () => {
    const harness = await createLabHarnessV1();

    let samplesBeforeChoice = -1;
    const transcript = await playCanonicalRouteV1(harness, (boundary) => {
      if (boundary.kind === "choice") {
        samplesBeforeChoice = harness.observe().game.samplesCollected;
      }
    });

    // The exact boundary order of the route, by stable definition IDs.
    expect(transcript).toEqual([
      { kind: "say", definitionId: "interaction.e2e.cal-intro" },
      { kind: "say", definitionId: "interaction.e2e.cal-beta-note" },
      { kind: "choice", definitionId: "interaction.e2e.cal-approach" },
      { kind: "presentation_barrier", definitionId: "interaction.e2e.cal-flash" },
      { kind: "hold", definitionId: "interaction.e2e.cal-hold" },
      { kind: "custom", definitionId: "interaction.e2e.cal-dial" },
      { kind: "say", definitionId: "interaction.e2e.cal-done" },
    ]);

    // The precise choice consumed exactly one sample atomically with the
    // narrative continuation: one command, two owners, one commit.
    const afterChoice = harness.admin
      .commandLog()
      .find(
        (entry) =>
          entry.outcome.kind === "committed" &&
          JSON.stringify(entry.outcome).includes("lab.samples_consumed"),
      );
    expect(afterChoice).toBeDefined();
    expect(JSON.stringify(afterChoice?.outcome)).toContain("lab.interaction_resolved");
    expect(JSON.stringify(afterChoice?.outcome)).toContain("lab.stage_changed");

    // The narrative completed and the ordinary SLG surface returned: the
    // procedure ran to completion afterwards with the remaining samples.
    const finished = harness.observe();
    expect(finished.narrative.phase).toBe("completed");
    expect(finished.narrative.calibration).toBe(2);
    expect(finished.game.procedurePhase).toBe("complete");
    expect(finished.game.samplesCollected).toBe(samplesBeforeChoice - 1 - 2);

    // The narrative cleaned its own stage on exit (the beacon is gone), and
    // the characters now on stage belong to the ordinary SLG procedure that
    // resumed afterwards — the same stage, two owners, no leftovers.
    const stage = finished.game.stage;
    const props = stage.layers.find((layer) => layer.layerId === "layer.e2e.props");
    expect(props?.entries.some((entry) => entry.tag === "tag.e2e.beacon")).toBe(false);
    const characters = stage.layers.find((layer) => layer.layerId === "layer.e2e.characters");
    expect(characters?.entries.map((entry) => entry.tag).toSorted()).toEqual([
      "tag.e2e.alpha",
      "tag.e2e.beta",
    ]);

    await harness.dispose();
  });

  it("is deterministic: same seed, same commands, same digests, and replay passes", async () => {
    const first = await createLabHarnessV1(90401);
    const second = await createLabHarnessV1(90401);
    await playCanonicalRouteV1(first);
    await playCanonicalRouteV1(second);

    expect(first.stateDigest()).toBe(second.stateDigest());
    expect(first.admin.commandLog()).toEqual(second.admin.commandLog());

    const replay = await first.admin.replayAuthoritatively();
    expect(replay).toMatchObject({ authoritative: true, identityMatch: true, matches: true });

    await first.dispose();
    await second.dispose();
  });

  it("continues to the same end state after a mid-route save/load", async () => {
    const straight = await createLabHarnessV1(90402);
    await playCanonicalRouteV1(straight);
    const straightFinal = straight.observe();

    // Interrupted run: save at the barrier, play past it, load back, and
    // continue to the end — the same authoritative end state.
    const interrupted = await createLabHarnessV1(90402);
    let saved = false;
    await playCanonicalRouteV1(interrupted, async (boundary) => {
      if (boundary.kind === "presentation_barrier" && !saved) {
        saved = true;
        await expect(interrupted.saves.save("manual.1")).resolves.toMatchObject({ kind: "saved" });
      }
    });
    expect(saved).toBe(true);
    await expect(interrupted.saves.load("manual.1")).resolves.toMatchObject({ kind: "loaded" });
    expect(interrupted.observe().narrative.pending?.kind).toBe("presentation_barrier");

    // Finish from the restored barrier through the rest of the route.
    for (let step = 0; step < 16; step += 1) {
      const pending = interrupted.observe().narrative.pending;
      if (pending === null) break;
      const invocation: LabInvocationV1 = pending.kind === "hold"
        ? timeV1(pending.occurrenceId, pending.remainingMs)
        : resolveV1(
          pending.occurrenceId,
          pending.kind === "presentation_barrier"
            ? { kind: "barrier_completed", transitionId: pending.expectedTransitionId }
            : pending.kind === "custom"
            ? { kind: "custom", payload: { value: 2 } }
            : { kind: "advance" },
        );
      const result = await interrupted.dispatch(invocation);
      expect(result).toMatchObject({ kind: "committed" });
    }
    const beginResult = await interrupted.dispatch(invokeV1("lab.begin_procedure"));
    expect(beginResult).toMatchObject({ kind: "committed" });
    for (let i = 0; i < 2; i += 1) {
      const result = await interrupted.dispatch(invokeV1("lab.run_experiment"));
      expect(result).toMatchObject({ kind: "committed" });
    }

    const interruptedFinal = interrupted.observe();
    expect(interruptedFinal.game).toEqual(straightFinal.game);
    expect(interruptedFinal.narrative.phase).toBe("completed");
    expect(interruptedFinal.narrative.calibration).toBe(straightFinal.narrative.calibration);

    await straight.dispose();
    await interrupted.dispose();
  });
});
