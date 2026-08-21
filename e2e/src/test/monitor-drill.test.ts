// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import type { LabInvocationV1 } from "../index.ts";
import { labSemanticAdapterV1, labStoryEntryV1 } from "../index.ts";
import {
  labAmbientEveryMsV1,
  labCollectorEveryMsV1,
  labGaugeEveryMsV1,
} from "../gameplay/monitors.ts";
import { labDrillReleaseChoiceIdV1, labDrillVentChoiceIdV1 } from "../gameplay/narrative.ts";

function createLabHarnessV1(seed = 424_242) {
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

function unfencedTime(elapsedMs: number): LabInvocationV1 {
  return Object.freeze({
    kind: "time" as const,
    tick: Object.freeze({ elapsedMs }),
  });
}

async function committed(harness: LabHarnessV1, invocation: LabInvocationV1): Promise<void> {
  const result = await harness.dispatch(invocation);
  expect(result).toMatchObject({ kind: "committed" });
}

function pendingOccurrenceV1(harness: LabHarnessV1): string {
  const pending = harness.observe().narrative.pending;
  if (pending === null) throw new Error("expected a pending interaction");
  return pending.occurrenceId;
}

async function advanceToDrillDecisionV1(harness: LabHarnessV1): Promise<void> {
  await committed(harness, invoke("lab.begin_drill"));
  await committed(
    harness,
    Object.freeze({
      kind: "resolve" as const,
      expectedOccurrenceId: pendingOccurrenceV1(harness),
      resolution: Object.freeze({ kind: "advance" as const }),
    }),
  );
  expect(harness.observe().narrative.pending?.kind).toBe("choice");
}

describe("Engine Lab monitor drill", () => {
  it("self-ignites the ambient monitor while the chamber say is on screen, batch-invariantly", async () => {
    const single = await createLabHarnessV1();
    const split = await createLabHarnessV1();

    for (const harness of [single, split]) {
      await committed(harness, invoke("lab.begin_drill"));
      expect(harness.observe().narrative.pending?.kind).toBe("say");
      expect(harness.observe().game.monitors.reportingActive).toBe(true);
      expect(harness.observe().game.monitors.realtimeActive).toBe(false);
    }

    // 2x the cadence in one report vs four quarter reports.
    await committed(single, unfencedTime(labAmbientEveryMsV1 * 2));
    for (let i = 0; i < 4; i += 1) {
      await committed(split, unfencedTime(labAmbientEveryMsV1 / 2));
    }

    for (const harness of [single, split]) {
      expect(harness.observe().game.monitors.ambientIgnitions).toBe(2);
    }

    // Leaving the chamber deactivates the span; clear retention drops the
    // accumulation at the next settlement instead of resuming it later.
    await committed(
      single,
      Object.freeze({
        kind: "resolve" as const,
        expectedOccurrenceId: pendingOccurrenceV1(single),
        resolution: Object.freeze({ kind: "advance" as const }),
      }),
    );
    await committed(single, unfencedTime(labAmbientEveryMsV1 * 3));
    expect(single.observe().game.monitors.ambientIgnitions).toBe(2);

    await single.dispose();
    await split.dispose();
  });

  it("charges the decision gauge under the live menu and converts it on release", async () => {
    const harness = await createLabHarnessV1();
    await advanceToDrillDecisionV1(harness);

    expect(harness.observe().game.monitors.realtimeActive).toBe(true);
    const creditsBefore = harness.observe().game.credits;

    // 2.5 cadences: two crossings, half a cadence of partial charge kept in
    // the accumulator (invisible to the level counter).
    await committed(harness, unfencedTime(labGaugeEveryMsV1 * 2 + labGaugeEveryMsV1 / 2));
    expect(harness.observe().game.monitors.gaugeLevel).toBe(2);

    await committed(
      harness,
      Object.freeze({
        kind: "resolve" as const,
        expectedOccurrenceId: pendingOccurrenceV1(harness),
        resolution: Object.freeze({
          kind: "choose" as const,
          choiceId: labDrillReleaseChoiceIdV1,
        }),
      }),
    );

    // Release converts the charged level to credits atomically and resets
    // the gauge; the realtime window is down with the menu.
    expect(harness.observe().game.credits).toBe(creditsBefore + 2);
    expect(harness.observe().game.monitors.gaugeLevel).toBe(0);
    expect(harness.observe().game.monitors.realtimeActive).toBe(false);

    await harness.dispose();
  });

  it("vents the gauge without conversion and resets the level", async () => {
    const harness = await createLabHarnessV1();
    await advanceToDrillDecisionV1(harness);
    const creditsBefore = harness.observe().game.credits;

    await committed(harness, unfencedTime(labGaugeEveryMsV1 * 3));
    expect(harness.observe().game.monitors.gaugeLevel).toBe(3);

    await committed(
      harness,
      Object.freeze({
        kind: "resolve" as const,
        expectedOccurrenceId: pendingOccurrenceV1(harness),
        resolution: Object.freeze({
          kind: "choose" as const,
          choiceId: labDrillVentChoiceIdV1,
        }),
      }),
    );

    expect(harness.observe().game.credits).toBe(creditsBefore);
    expect(harness.observe().game.monitors.gaugeLevel).toBe(0);

    await harness.dispose();
  });

  it("drips the collector across pending boundaries and retains partial progress while off", async () => {
    const harness = await createLabHarnessV1();

    // Engage outside any narrative run: the drip is pending-independent.
    await committed(harness, invoke("lab.toggle_collector"));
    expect(harness.observe().game.monitors.collectorEngaged).toBe(true);
    expect(harness.observe().game.monitors.reportingActive).toBe(true);

    // Partial progress below one cadence...
    await committed(harness, unfencedTime(labCollectorEveryMsV1 - 50));
    expect(harness.observe().game.monitors.collectorUnits).toBe(0);

    // ...survives a disengage (retain retention: inactive time is not
    // dropped) and completes after re-engaging.
    await committed(harness, invoke("lab.toggle_collector"));
    await committed(harness, unfencedTime(labCollectorEveryMsV1 * 4));
    expect(harness.observe().game.monitors.collectorUnits).toBe(0);
    await committed(harness, invoke("lab.toggle_collector"));
    await committed(harness, unfencedTime(50));
    expect(harness.observe().game.monitors.collectorUnits).toBe(1);

    await harness.dispose();
  });

  it("settles the engaged collector inside hold-fenced ticks with the same reported span", async () => {
    const harness = await createLabHarnessV1();
    await committed(harness, invoke("lab.toggle_collector"));

    // Walk the calibration run to its hold; the collector keeps dripping
    // through the same time verb that folds the hold remainder.
    await committed(harness, invoke("lab.begin_calibration"));
    const advance = async () => {
      await committed(
        harness,
        Object.freeze({
          kind: "resolve" as const,
          expectedOccurrenceId: pendingOccurrenceV1(harness),
          resolution: Object.freeze({ kind: "advance" as const }),
        }),
      );
    };
    await advance();
    await advance();
    await committed(
      harness,
      Object.freeze({
        kind: "resolve" as const,
        expectedOccurrenceId: pendingOccurrenceV1(harness),
        resolution: Object.freeze({ kind: "choose" as const, choiceId: "choice.e2e.cal.basic" }),
      }),
    );
    await committed(
      harness,
      Object.freeze({
        kind: "resolve" as const,
        expectedOccurrenceId: pendingOccurrenceV1(harness),
        resolution: Object.freeze({
          kind: "barrier_completed" as const,
          transitionId: "transition.e2e.bg-crossfade",
        }),
      }),
    );
    expect(harness.observe().narrative.pending?.kind).toBe("hold");

    // One fenced tick expires the 400ms hold; the same 400ms drips the
    // collector once (cadence 250): one span, every consumer, one commit.
    await committed(
      harness,
      Object.freeze({
        kind: "time" as const,
        tick: Object.freeze({
          elapsedMs: 400,
          expectedHoldOccurrenceId: pendingOccurrenceV1(harness),
        }),
      }),
    );
    expect(harness.observe().narrative.pending?.kind).toBe("custom");
    expect(harness.observe().game.monitors.collectorUnits).toBe(1);

    await harness.dispose();
  });

  it("starts a re-opened decision span without the previous span's partial charge", async () => {
    const harness = await createLabHarnessV1();
    await advanceToDrillDecisionV1(harness);

    // 1.5 cadences: one crossing plus half a cadence of sub-threshold
    // charge sitting in the accumulator when the decision closes.
    await committed(harness, unfencedTime(labGaugeEveryMsV1 + labGaugeEveryMsV1 / 2));
    expect(harness.observe().game.monitors.gaugeLevel).toBe(1);
    await committed(
      harness,
      Object.freeze({
        kind: "resolve" as const,
        expectedOccurrenceId: pendingOccurrenceV1(harness),
        resolution: Object.freeze({
          kind: "choose" as const,
          choiceId: labDrillReleaseChoiceIdV1,
        }),
      }),
    );

    // Play the run out; no settlement happens on the way (the reporting
    // gate is closed), so only the resolution commit's explicit drop keeps
    // the stale remainder out of the next span.
    await committed(
      harness,
      Object.freeze({
        kind: "resolve" as const,
        expectedOccurrenceId: pendingOccurrenceV1(harness),
        resolution: Object.freeze({ kind: "advance" as const }),
      }),
    );
    expect(harness.observe().narrative.pending).toBeNull();

    await advanceToDrillDecisionV1(harness);
    // Half a cadence must not cross: a leaked 0.5-cadence remainder from
    // the first span would complete the threshold here.
    await committed(harness, unfencedTime(labGaugeEveryMsV1 / 2));
    expect(harness.observe().game.monitors.gaugeLevel).toBe(0);
    // The fresh span's own arithmetic stays exact.
    await committed(harness, unfencedTime(labGaugeEveryMsV1 / 2));
    expect(harness.observe().game.monitors.gaugeLevel).toBe(1);

    await harness.dispose();
  });

  it("keeps a mid-decision partial charge across save and load and resumes to the same crossing", async () => {
    const harness = await createLabHarnessV1();
    await advanceToDrillDecisionV1(harness);

    await committed(harness, unfencedTime(labGaugeEveryMsV1 + labGaugeEveryMsV1 / 2));
    expect(harness.observe().game.monitors.gaugeLevel).toBe(1);
    await expect(harness.saves.save("manual.1")).resolves.toMatchObject({ kind: "saved" });

    // Diverge past the save point, then load back.
    await committed(harness, unfencedTime(labGaugeEveryMsV1));
    expect(harness.observe().game.monitors.gaugeLevel).toBe(2);
    await expect(harness.saves.load("manual.1")).resolves.toMatchObject({ kind: "loaded" });
    expect(harness.observe().game.monitors.gaugeLevel).toBe(1);
    expect(harness.observe().game.monitors.realtimeActive).toBe(true);

    // The saved half-cadence remainder completes on exactly the missing
    // half: the accumulator survived the round-trip, not just the level.
    await committed(harness, unfencedTime(labGaugeEveryMsV1 / 2));
    expect(harness.observe().game.monitors.gaugeLevel).toBe(2);

    const creditsBefore = harness.observe().game.credits;
    await committed(
      harness,
      Object.freeze({
        kind: "resolve" as const,
        expectedOccurrenceId: pendingOccurrenceV1(harness),
        resolution: Object.freeze({
          kind: "choose" as const,
          choiceId: labDrillReleaseChoiceIdV1,
        }),
      }),
    );
    expect(harness.observe().game.credits).toBe(creditsBefore + 2);

    await harness.dispose();
  });

  it("keeps the whole drill deterministic across batch splits", async () => {
    const single = await createLabHarnessV1();
    const split = await createLabHarnessV1();

    for (const harness of [single, split]) {
      await committed(harness, invoke("lab.toggle_collector"));
      await advanceToDrillDecisionV1(harness);
    }

    await committed(single, unfencedTime(1_000));
    for (const slice of [400, 300, 200, 100]) {
      await committed(split, unfencedTime(slice));
    }

    for (const harness of [single, split]) {
      await committed(
        harness,
        Object.freeze({
          kind: "resolve" as const,
          expectedOccurrenceId: pendingOccurrenceV1(harness),
          resolution: Object.freeze({
            kind: "choose" as const,
            choiceId: labDrillReleaseChoiceIdV1,
          }),
        }),
      );
    }

    const singleView = single.observe().game;
    const splitView = split.observe().game;
    expect(splitView.monitors).toEqual(singleView.monitors);
    expect(splitView.credits).toBe(singleView.credits);
    expect(split.admin.inspectForTest().snapshot.state).toEqual(
      single.admin.inspectForTest().snapshot.state,
    );

    await single.dispose();
    await split.dispose();
  });
});
