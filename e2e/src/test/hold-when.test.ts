// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { InteractionResolutionV1, PendingInteractionV1 } from "@sillymaker/base";
import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import type { LabInvocationV1 } from "../index.ts";
import { labSemanticAdapterV1, labStoryEntryV1 } from "../index.ts";
import { labCollectorEveryMsV1 } from "../gameplay/monitors.ts";
import {
  labDrillStakeoutChoiceIdV1,
  labDrillStakeoutDurationMsV1,
  labDrillVigilChoiceIdV1,
  labDrillVigilDurationMsV1,
} from "../gameplay/narrative.ts";

/**
 * Hold `when` in the Engine Lab: the two declared predicate granularities.
 *
 * - The vigil hold's own tick effect raises rapport and the arm cuts at
 *   the exact crossing instant that reaches the threshold — same-instant
 *   granularity, batch-invariant, and a skip walks through the same cut.
 * - The stakeout hold watches the collector monitor's drip counter; drips
 *   land as domain events after the settling command, so the arm sees
 *   them at the next fenced settlement's t=0 — next-settlement
 *   granularity, with zero milliseconds consumed by the reroute.
 */

function createLabHarnessV1(seed = 616_161) {
  return createGameHarnessV1({
    entry: labStoryEntryV1,
    semantic: labSemanticAdapterV1,
    seed,
  });
}

type LabHarnessV1 = Awaited<ReturnType<typeof createLabHarnessV1>>;

function invoke(actionId: string): LabInvocationV1 {
  return Object.freeze({ kind: "invoke" as const, actionId }) as LabInvocationV1;
}

function resolveV1(
  expectedOccurrenceId: string,
  resolution: InteractionResolutionV1,
): LabInvocationV1 {
  return Object.freeze({ kind: "resolve" as const, expectedOccurrenceId, resolution });
}

function fencedTimeV1(expectedHoldOccurrenceId: string, elapsedMs: number): LabInvocationV1 {
  return Object.freeze({
    kind: "time" as const,
    tick: Object.freeze({ elapsedMs, expectedHoldOccurrenceId }),
  });
}

function unfencedTimeV1(elapsedMs: number): LabInvocationV1 {
  return Object.freeze({ kind: "time" as const, tick: Object.freeze({ elapsedMs }) });
}

function pendingV1(harness: LabHarnessV1): PendingInteractionV1 {
  const pending = harness.observe().narrative.pending;
  if (pending === null) throw new Error("expected a pending interaction");
  return pending;
}

function rapportV1(harness: LabHarnessV1): number {
  const state = harness.admin.inspectForTest().snapshot.state as {
    simulation: { narrative: { rapport: number } };
  };
  return state.simulation.narrative.rapport;
}

async function committed(harness: LabHarnessV1, invocation: LabInvocationV1): Promise<void> {
  const result = await harness.dispatch(invocation);
  expect(result).toMatchObject({ kind: "committed" });
}

/** Walks the whole calibration run; completing it raises rapport to 3. */
async function playCalibrationV1(harness: LabHarnessV1): Promise<void> {
  await committed(harness, invoke("lab.begin_calibration"));
  await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
  await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
  await committed(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, {
      kind: "choose",
      choiceId: "choice.e2e.cal.basic",
    }),
  );
  await committed(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, {
      kind: "barrier_completed",
      transitionId: "transition.e2e.bg-crossfade",
    }),
  );
  await committed(harness, fencedTimeV1(pendingV1(harness).occurrenceId, 400));
  await committed(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, { kind: "custom", payload: { value: 2 } }),
  );
  await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
  expect(harness.observe().narrative.pending).toBeNull();
}

/** Begins the drill and picks the given decision option. */
async function chooseDrillPathV1(harness: LabHarnessV1, choiceId: string): Promise<void> {
  await committed(harness, invoke("lab.begin_drill"));
  await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
  expect(pendingV1(harness).kind).toBe("choice");
  await committed(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, { kind: "choose", choiceId }),
  );
}

describe("Engine Lab hold `when` arms", () => {
  it("cuts the vigil at the exact crossing that reaches the threshold, for any batch split", async () => {
    // Fresh sessions: rapport 0 at entry, crossings at 300ms (rapport 1)
    // and 600ms (rapport 2 — the arm matches). The skip-shaped single
    // report of the full 800ms must cut at the same instant as split
    // deliveries: 600ms consumed, 200ms discarded, one identical state.
    const skip = await createLabHarnessV1();
    const aligned = await createLabHarnessV1();
    const offset = await createLabHarnessV1();

    for (const harness of [skip, aligned, offset]) {
      await chooseDrillPathV1(harness, labDrillVigilChoiceIdV1);
      expect(pendingV1(harness)).toMatchObject({
        kind: "hold",
        definitionId: "interaction.e2e.drill-vigil",
        remainingMs: labDrillVigilDurationMsV1,
      });
      expect(rapportV1(harness)).toBe(0);
    }

    // The skippable hold's skip affordance reports the full remainder.
    await committed(skip, fencedTimeV1(pendingV1(skip).occurrenceId, labDrillVigilDurationMsV1));

    // Batch edges aligned with the crossing...
    await committed(aligned, fencedTimeV1(pendingV1(aligned).occurrenceId, 300));
    expect(pendingV1(aligned)).toMatchObject({ kind: "hold", remainingMs: 500 });
    expect(rapportV1(aligned)).toBe(1);
    await committed(aligned, fencedTimeV1(pendingV1(aligned).occurrenceId, 300));

    // ...and batch edges straddling it.
    await committed(offset, fencedTimeV1(pendingV1(offset).occurrenceId, 450));
    expect(pendingV1(offset)).toMatchObject({ kind: "hold", remainingMs: 350 });
    expect(rapportV1(offset)).toBe(1);
    await committed(offset, fencedTimeV1(pendingV1(offset).occurrenceId, 350));

    for (const harness of [skip, aligned, offset]) {
      expect(pendingV1(harness)).toMatchObject({
        kind: "say",
        definitionId: "interaction.e2e.drill-catch",
      });
      // The 800ms crossing never ran: the cut at 600ms discarded the rest.
      expect(rapportV1(harness)).toBe(2);
    }
    expect(aligned.admin.inspectForTest().snapshot.state).toEqual(
      skip.admin.inspectForTest().snapshot.state,
    );
    expect(offset.admin.inspectForTest().snapshot.state).toEqual(
      skip.admin.inspectForTest().snapshot.state,
    );

    await skip.dispose();
    await aligned.dispose();
    await offset.dispose();
  });

  it("reroutes at entry without opening the hold when the arm already matches", async () => {
    const harness = await createLabHarnessV1();
    // One completed calibration run raises rapport to 3 (two hold
    // crossings plus the completion bump) — past the vigil threshold.
    await playCalibrationV1(harness);
    expect(rapportV1(harness)).toBe(3);

    await committed(harness, invoke("lab.begin_drill"));
    await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
    const decision = pendingV1(harness);
    expect(decision.kind).toBe("choice");
    await committed(
      harness,
      resolveV1(decision.occurrenceId, { kind: "choose", choiceId: labDrillVigilChoiceIdV1 }),
    );

    // The walk rerouted at the hold's entry: the catch say is pending, no
    // tick effect ever ran, and no hold occurrence was spent — the catch
    // occurrence directly follows the decision's.
    const pending = pendingV1(harness);
    expect(pending).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-catch",
    });
    expect(rapportV1(harness)).toBe(3);
    const decisionSequence = Number(decision.occurrenceId.split(".").at(-1));
    expect(pending.occurrenceId).toBe(
      `interaction-occurrence.${String(decisionSequence + 1)}`,
    );

    await harness.dispose();
  });

  it("keeps vigil tick progress across save/load mid-hold and cuts at the same instant", async () => {
    const harness = await createLabHarnessV1();
    await chooseDrillPathV1(harness, labDrillVigilChoiceIdV1);
    const hold = pendingV1(harness);
    expect(hold.kind).toBe("hold");

    // One applied crossing: rapport 1 at 300ms, 500ms of bar left.
    await committed(harness, fencedTimeV1(hold.occurrenceId, 300));
    expect(rapportV1(harness)).toBe(1);
    expect(pendingV1(harness)).toMatchObject({ kind: "hold", remainingMs: 500 });

    // Save mid-bar, then let the live run diverge through the cut.
    await expect(harness.saves.save("quick")).resolves.toMatchObject({ kind: "saved" });
    await committed(harness, fencedTimeV1(hold.occurrenceId, 500));
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-catch",
    });
    expect(rapportV1(harness)).toBe(2);
    const divergedState = harness.admin.inspectForTest().snapshot.state;

    // Load restores the mid-flight bar as plain state — one applied
    // crossing, 500ms remaining, no wall clock replayed.
    await expect(harness.saves.load("quick")).resolves.toMatchObject({ kind: "loaded" });
    expect(pendingV1(harness)).toMatchObject({
      kind: "hold",
      occurrenceId: hold.occurrenceId,
      remainingMs: 500,
    });
    expect(rapportV1(harness)).toBe(1);

    // The loaded timeline continues from the restored instant: the next
    // crossing lands 300ms in (600ms on the hold's own timeline), the arm
    // matches there, and the cut discards the rest — converging on the
    // exact state the uninterrupted run reached.
    await committed(harness, fencedTimeV1(hold.occurrenceId, 500));
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-catch",
    });
    expect(rapportV1(harness)).toBe(2);
    expect(harness.admin.inspectForTest().snapshot.state).toEqual(divergedState);

    await harness.dispose();
  });

  it("expires the stakeout to the quiet line when the arm never matches", async () => {
    const harness = await createLabHarnessV1();
    await chooseDrillPathV1(harness, labDrillStakeoutChoiceIdV1);
    expect(pendingV1(harness)).toMatchObject({
      kind: "hold",
      definitionId: "interaction.e2e.drill-stakeout",
    });

    // No collector engaged: the full duration folds and the hold expires
    // to its declared successor.
    await committed(
      harness,
      fencedTimeV1(pendingV1(harness).occurrenceId, labDrillStakeoutDurationMsV1),
    );
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-quiet",
    });

    await harness.dispose();
  });

  it("surfaces a monitor-driven arm at the next settlement's t=0, consuming zero hold time", async () => {
    const harness = await createLabHarnessV1();
    await chooseDrillPathV1(harness, labDrillStakeoutChoiceIdV1);
    const hold = pendingV1(harness);
    expect(hold.kind).toBe("hold");

    // Engage the collector mid-hold: the toggle is pending-independent.
    await committed(harness, invoke("lab.toggle_collector"));

    // One cadence of fenced time: the hold folds the span and the
    // collector crosses once — but the drip lands as a domain event after
    // this command, and the arm read the command-start counter (0), so
    // the hold keeps holding. The same-commit seam is the declared
    // granularity, exactly like monitor `activeWhen`.
    await committed(harness, fencedTimeV1(hold.occurrenceId, labCollectorEveryMsV1));
    expect(harness.observe().game.monitors.collectorUnits).toBe(1);
    expect(pendingV1(harness)).toMatchObject({
      kind: "hold",
      remainingMs: labDrillStakeoutDurationMsV1 - labCollectorEveryMsV1,
    });

    // The next fenced settlement evaluates the arm at t=0 against the
    // committed counter and cuts before consuming a single millisecond of
    // the report — the discarded remainder is not folded anywhere.
    await committed(harness, fencedTimeV1(hold.occurrenceId, 50));
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-catch",
    });

    await harness.dispose();
  });

  it("reroutes at entry when the monitor counter already crossed before the choice", async () => {
    const harness = await createLabHarnessV1();
    // Drip one unit during free navigation, before the drill even starts.
    await committed(harness, invoke("lab.toggle_collector"));
    await committed(harness, unfencedTimeV1(labCollectorEveryMsV1));
    expect(harness.observe().game.monitors.collectorUnits).toBe(1);

    await chooseDrillPathV1(harness, labDrillStakeoutChoiceIdV1);
    // The resolve command's walk read the committed counter at the hold's
    // entry and rerouted without opening the stakeout at all.
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-catch",
    });

    await harness.dispose();
  });
});
