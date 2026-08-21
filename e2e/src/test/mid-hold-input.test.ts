// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { InteractionResolutionV1, PendingInteractionV1 } from "@sillymaker/base";
import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import type { LabInvocationV1 } from "../index.ts";
import { labSemanticAdapterV1, labStoryEntryV1 } from "../index.ts";
import { labDrillTripwireChoiceIdV1, labDrillTripwireDurationMsV1 } from "../gameplay/narrative.ts";

/**
 * Mid-hold input writes: the input-axis granularity of hold `when`.
 *
 * The tripwire hold's arm watches the collector switch — plain session
 * state an ordinary command writes. `lab.engage_collector` is fenced to
 * the pending hold's occurrence (the same one-line comparison the time
 * verb uses), only writes the switch, and never touches pending, time,
 * or routing. The hold's own arm reads the committed write at the next
 * fenced settlement's t=0 — the same seam monitor-driven arms have.
 */

function createLabHarnessV1(seed = 727_272) {
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

function holdWriteV1(expectedHoldOccurrenceId: string): LabInvocationV1 {
  return Object.freeze({
    kind: "hold_write" as const,
    actionId: "lab.engage_collector" as const,
    expectedHoldOccurrenceId,
  });
}

function pendingV1(harness: LabHarnessV1): PendingInteractionV1 {
  const pending = harness.observe().narrative.pending;
  if (pending === null) throw new Error("expected a pending interaction");
  return pending;
}

async function committed(harness: LabHarnessV1, invocation: LabInvocationV1): Promise<void> {
  const result = await harness.dispatch(invocation);
  expect(result).toMatchObject({ kind: "committed" });
}

/** Begins the drill and enters the tripwire hold. */
async function enterTripwireV1(harness: LabHarnessV1): Promise<PendingInteractionV1> {
  await committed(harness, invoke("lab.begin_drill"));
  await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
  expect(pendingV1(harness).kind).toBe("choice");
  await committed(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, {
      kind: "choose",
      choiceId: labDrillTripwireChoiceIdV1,
    }),
  );
  const hold = pendingV1(harness);
  expect(hold).toMatchObject({
    kind: "hold",
    definitionId: "interaction.e2e.drill-tripwire",
    remainingMs: labDrillTripwireDurationMsV1,
  });
  return hold;
}

describe("Engine Lab mid-hold input writes", () => {
  it("writes without touching the hold, then cuts at the next settlement's t=0", async () => {
    const harness = await createLabHarnessV1();
    const hold = await enterTripwireV1(harness);

    // A partial settlement first, so the write demonstrably lands against
    // a mid-flight hold rather than a fresh one.
    await committed(harness, fencedTimeV1(hold.occurrenceId, 400));
    expect(pendingV1(harness)).toMatchObject({
      kind: "hold",
      remainingMs: labDrillTripwireDurationMsV1 - 400,
    });

    // The fenced write commits, and the hold is untouched: the same
    // occurrence stays pending with the same authoritative remainder —
    // the write never settles time and never routes.
    await committed(harness, holdWriteV1(hold.occurrenceId));
    expect(harness.observe().game.monitors.collectorEngaged).toBe(true);
    expect(pendingV1(harness)).toMatchObject({
      kind: "hold",
      occurrenceId: hold.occurrenceId,
      remainingMs: labDrillTripwireDurationMsV1 - 400,
    });

    // The write entered the journal as an ordinary command — no new
    // resolution kind exists for the input axis.
    const journal = harness.admin.commandLog().map(({ command }) =>
      (command as { readonly kind: string }).kind
    );
    expect(journal).toContain("lab.engage_collector");
    expect(journal).not.toContain("lab.hold_abort");

    // The next fenced settlement evaluates the arm at t=0 against the
    // committed switch and cuts before consuming a single millisecond.
    await committed(harness, fencedTimeV1(hold.occurrenceId, 50));
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-catch",
    });

    await harness.dispose();
  });

  it("cuts at the same instant for any batch split of the same millisecond sum", async () => {
    const split = await createLabHarnessV1();
    const single = await createLabHarnessV1();

    for (const harness of [split, single]) {
      const hold = await enterTripwireV1(harness);
      await committed(harness, holdWriteV1(hold.occurrenceId));
    }

    // Split: the first slice cuts at t=0; the remaining session time
    // arrives unfenced (the cut consumed the boundary). Single: one
    // report cuts at the same t=0 and settles the same session total.
    const splitHold = pendingV1(split);
    await committed(split, fencedTimeV1(splitHold.occurrenceId, 500));
    await committed(split, unfencedTimeV1(500));
    await committed(split, unfencedTimeV1(500));

    const singleHold = pendingV1(single);
    await committed(single, fencedTimeV1(singleHold.occurrenceId, 1_500));

    for (const harness of [split, single]) {
      expect(pendingV1(harness)).toMatchObject({
        kind: "say",
        definitionId: "interaction.e2e.drill-catch",
      });
    }
    expect(split.admin.inspectForTest().snapshot.state).toEqual(
      single.admin.inspectForTest().snapshot.state,
    );

    await split.dispose();
    await single.dispose();
  });

  it("rejects a stale fenced write whole, leaving state untouched", async () => {
    const harness = await createLabHarnessV1();

    // While the decision menu is pending, the fence rejects: a hold-scoped
    // write cannot pre-arm against a choice occurrence.
    await committed(harness, invoke("lab.begin_drill"));
    await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
    const decision = pendingV1(harness);
    expect(decision.kind).toBe("choice");
    await expect(harness.dispatch(holdWriteV1(decision.occurrenceId))).resolves.toEqual({
      kind: "rejected",
      codes: ["lab.hold_occurrence_stale"],
    });

    // Let the first tripwire expire, then open a second one: a late press
    // still fenced to the dead occurrence rejects whole — it can never
    // write into the successor hold's watch.
    await committed(
      harness,
      resolveV1(decision.occurrenceId, {
        kind: "choose",
        choiceId: labDrillTripwireChoiceIdV1,
      }),
    );
    const firstHold = pendingV1(harness);
    await committed(harness, fencedTimeV1(firstHold.occurrenceId, labDrillTripwireDurationMsV1));
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-quiet",
    });
    await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
    await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
    expect(harness.observe().narrative.pending).toBeNull();

    await committed(harness, invoke("lab.begin_drill"));
    await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
    await committed(
      harness,
      resolveV1(pendingV1(harness).occurrenceId, {
        kind: "choose",
        choiceId: labDrillTripwireChoiceIdV1,
      }),
    );
    const secondHold = pendingV1(harness);
    expect(secondHold.kind).toBe("hold");
    expect(secondHold.occurrenceId).not.toBe(firstHold.occurrenceId);

    const before = JSON.stringify(harness.admin.inspectForTest().snapshot);
    await expect(harness.dispatch(holdWriteV1(firstHold.occurrenceId))).resolves.toEqual({
      kind: "rejected",
      codes: ["lab.hold_occurrence_stale"],
    });
    expect(JSON.stringify(harness.admin.inspectForTest().snapshot)).toBe(before);

    // The stale press left the switch off, so the second tripwire expires
    // quietly on its full duration.
    await committed(harness, fencedTimeV1(secondHold.occurrenceId, labDrillTripwireDurationMsV1));
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-quiet",
    });

    await harness.dispose();
  });

  it("keeps the committed write across save/load mid-hold and still cuts", async () => {
    const harness = await createLabHarnessV1();
    const hold = await enterTripwireV1(harness);
    await committed(harness, holdWriteV1(hold.occurrenceId));

    // Save with the hold pending and the write committed, then let the
    // live run diverge (expiry to the quiet line).
    await expect(harness.saves.save("quick")).resolves.toMatchObject({ kind: "saved" });
    await committed(harness, fencedTimeV1(hold.occurrenceId, labDrillTripwireDurationMsV1));
    expect(pendingV1(harness)).toMatchObject({ kind: "say" });

    // Load restores the mid-flight hold and the write request with it:
    // plain versioned state, no wall clock replayed. The next settlement
    // reads the restored switch and cuts at t=0.
    await expect(harness.saves.load("quick")).resolves.toMatchObject({ kind: "loaded" });
    expect(pendingV1(harness)).toMatchObject({
      kind: "hold",
      occurrenceId: hold.occurrenceId,
      remainingMs: labDrillTripwireDurationMsV1,
    });
    expect(harness.observe().game.monitors.collectorEngaged).toBe(true);
    await committed(harness, fencedTimeV1(hold.occurrenceId, 50));
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-catch",
    });

    await harness.dispose();
  });

  it("reroutes at entry when the switch was already on before the choice", async () => {
    const harness = await createLabHarnessV1();
    // The ordinary unfenced toggle is legal during free navigation; the
    // entry evaluation reads the committed switch and reroutes without
    // ever opening the tripwire.
    await committed(harness, invoke("lab.toggle_collector"));

    await committed(harness, invoke("lab.begin_drill"));
    await committed(harness, resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }));
    await committed(
      harness,
      resolveV1(pendingV1(harness).occurrenceId, {
        kind: "choose",
        choiceId: labDrillTripwireChoiceIdV1,
      }),
    );
    expect(pendingV1(harness)).toMatchObject({
      kind: "say",
      definitionId: "interaction.e2e.drill-catch",
    });

    await harness.dispose();
  });
});
