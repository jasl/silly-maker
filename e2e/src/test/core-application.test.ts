// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { HostAtomicRecordStoreV1, InteractionResolutionV1 } from "@sillymaker/base";
import { parseStageMutationV1, reduceStageMutationsV1 } from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import type { LabApplicationInstanceV1 } from "../application/core-application.ts";
import {
  createLabApplicationInstanceV1,
  labHeadlessExecutionContextV1,
} from "../application/core-application.ts";
import { labCoreApplicationDefinitionV1 } from "../application/core-definition.ts";
import type { LabInvocationV1 } from "../application/semantic.ts";

const collectV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "lab.collect_sample" as const,
});
const beginV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "lab.begin_procedure" as const,
});
const beginCalibrationV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "lab.begin_calibration" as const,
});

function resolveV1(
  expectedOccurrenceId: string,
  resolution: InteractionResolutionV1,
): LabInvocationV1 {
  return Object.freeze({ kind: "resolve" as const, expectedOccurrenceId, resolution });
}

/**
 * Walks the calibration narrative to its presentation barrier: two says and
 * the precise choice (the caller collected the samples). Returns the pending
 * barrier interaction.
 */
async function advanceToBarrierV1(application: LabApplicationInstanceV1) {
  for (let step = 0; step < 8; step += 1) {
    const pending = application.semantic.observe().narrative.pending;
    if (pending === null) throw new TypeError("expected a pending boundary");
    if (pending.kind === "presentation_barrier") return pending;
    const resolution: InteractionResolutionV1 = pending.kind === "say"
      ? { kind: "advance" }
      : { kind: "choose", choiceId: "choice.e2e.cal.precise" };
    const result = await application.semantic.dispatch(
      resolveV1(pending.occurrenceId, resolution),
    );
    expect(result).toMatchObject({ kind: "committed" });
  }
  throw new TypeError("presentation barrier not reached");
}

function autoCurrentSpyV1() {
  const records = createMemoryHostRecordStoreV1();
  const writes: string[] = [];
  const spy: HostAtomicRecordStoreV1 = {
    read: (namespace, key) => records.read(namespace, key),
    list: (namespace) => records.list(namespace),
    commit: (mutations) => {
      for (const mutation of mutations) {
        if (mutation.kind === "put" && mutation.key.includes(":auto.current")) {
          writes.push(mutation.key);
        }
      }
      return records.commit(mutations);
    },
  };
  return {
    records: Object.freeze(spy),
    writes,
    readAutoCurrent: async () => {
      const stored = await records.list("save");
      const current = stored.find(({ key }) => key.includes(":auto.current"));
      if (current === undefined) return null;
      return JSON.parse(new TextDecoder().decode(current.bytes)) as {
        readonly snapshot: {
          readonly commandSequence: number;
          readonly state: {
            readonly simulation: {
              readonly narrative: { readonly pending: { readonly kind: string } | null };
            };
          };
        };
      };
    },
  };
}

describe("Engine Lab core application", () => {
  it("projects authoring order drift as one ordinary Stage reconcile command", async () => {
    const application = await createLabApplicationInstanceV1();
    const idleSnapshot = application.admin.inspectForTest().snapshot;
    expect(
      labCoreApplicationDefinitionV1.projectRebootstrapCommand?.(
        idleSnapshot,
        {},
        labHeadlessExecutionContextV1,
      ),
    ).toBeNull();

    await application.semantic.dispatch(collectV1);
    await application.semantic.dispatch(beginV1);
    const snapshot = application.admin.inspectForTest().snapshot;
    const drift = reduceStageMutationsV1(
      snapshot.state.simulation.stage,
      [
        parseStageMutationV1({
          kind: "setLayerOrder",
          layerIds: [
            "layer.e2e.background",
            "layer.e2e.props",
            "layer.e2e.characters",
          ],
        }, "/mutations/0"),
        parseStageMutationV1({
          kind: "setZOrder",
          layerId: "layer.e2e.characters",
          tag: "tag.e2e.alpha",
          zOrder: 1,
        }, "/mutations/1"),
        parseStageMutationV1({
          kind: "setZOrder",
          layerId: "layer.e2e.characters",
          tag: "tag.e2e.beta",
          zOrder: 0,
        }, "/mutations/2"),
      ],
    );
    expect(drift.kind).toBe("applied");
    if (drift.kind !== "applied") throw new TypeError("expected applied Stage drift");
    const driftedSnapshot = Object.freeze({
      ...snapshot,
      state: Object.freeze({
        ...snapshot.state,
        simulation: Object.freeze({
          ...snapshot.state.simulation,
          stage: drift.state,
        }),
      }),
    });

    const command = labCoreApplicationDefinitionV1.projectRebootstrapCommand?.(
      driftedSnapshot,
      {},
      labHeadlessExecutionContextV1,
    );
    expect(command).toMatchObject({ kind: "lab.reconcile_stage_order" });
    if (command?.kind !== "lab.reconcile_stage_order") {
      throw new TypeError("expected Engine Lab Stage reconcile command");
    }
    expect(command.mutations.map(({ kind }) => kind)).toEqual([
      "setLayerOrder",
      "setZOrder",
      "setZOrder",
    ]);
    await application.dispose();
  });

  it("composes the whole application from the definition without story-side wiring", async () => {
    const application = await createLabApplicationInstanceV1();

    expect(application.storyId).toBe("story.e2e.engine-lab");
    await expect(application.semantic.dispatch(collectV1)).resolves.toEqual({
      kind: "committed",
    });
    expect(application.semantic.observe().game.samplesCollected).toBeGreaterThan(0);

    const digest = application.admin.stateDigest();
    await expect(application.persistence.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    await application.semantic.dispatch(collectV1);
    await expect(application.persistence.load("manual.1")).resolves.toMatchObject({
      kind: "loaded",
    });
    expect(application.admin.stateDigest()).toBe(digest);
    expect(application.presentationAnchor()).toEqual({ epoch: 1, origin: "load" });

    await expect(application.dispose()).resolves.toEqual({ kind: "disposed" });
  });

  it("keeps stale-epoch presentation callbacks away from the current instance", async () => {
    const application = await createLabApplicationInstanceV1();
    let observedByOldEpoch = 0;
    const bound = application.bindToCurrentEpoch(() => {
      observedByOldEpoch += 1;
      return "interaction-resolved";
    });

    await application.persistence.save("manual.1");
    await application.semantic.dispatch(collectV1);
    await application.persistence.load("manual.1");

    expect(bound()).toEqual({ kind: "stale_epoch" });
    expect(observedByOldEpoch).toBe(0);
    await application.dispose();
  });

  it("keeps every Save out of the presentation-barrier span and re-enters at the safepoint", async () => {
    const spy = autoCurrentSpyV1();
    const application = await createLabApplicationInstanceV1({ records: spy.records });

    for (let i = 0; i < 3; i += 1) {
      await application.semantic.dispatch(collectV1);
    }
    await application.semantic.dispatch(beginCalibrationV1);
    const barrier = await advanceToBarrierV1(application);
    await application.autoSaveIdle();

    // The commit that opened the barrier deferred its autosave: the stored
    // record still re-enters at the pre-span choice, not inside the barrier.
    const preSpan = await spy.readAutoCurrent();
    expect(preSpan?.snapshot.state.simulation.narrative.pending?.kind).toBe("choice");

    // Player-slot saves inside the span reject without touching the slot.
    await expect(application.persistence.save("manual.1")).resolves.toEqual({
      kind: "rejected",
      code: "in_flight",
    });

    // Completing the transition closes the span: autosave resumes with the
    // post-barrier boundary and the player slot reopens.
    const writesInSpan = spy.writes.length;
    await application.semantic.dispatch(
      resolveV1(barrier.occurrenceId, {
        kind: "barrier_completed",
        transitionId: barrier.expectedTransitionId,
      }),
    );
    await application.autoSaveIdle();
    expect(spy.writes.length).toBe(writesInSpan + 1);
    const postSpan = await spy.readAutoCurrent();
    expect(postSpan?.snapshot.state.simulation.narrative.pending?.kind).toBe("hold");
    await expect(application.persistence.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });

    // The deferred-write record is an ordinary loadable autosave.
    await expect(application.persistence.load("auto.current")).resolves.toMatchObject({
      kind: "loaded",
    });
    expect(application.semantic.observe().narrative.pending?.kind).toBe("hold");
    await application.dispose();
  });

  it("counts monitor time commits toward the span bound and re-enters with their progress", async () => {
    const spy = autoCurrentSpyV1();
    const application = await createLabApplicationInstanceV1({ records: spy.records });

    // Engage the collector: its activeWhen is pending-independent, so the
    // reporting gate stays open while the presentation barrier is pending.
    await application.semantic.dispatch(
      Object.freeze({ kind: "invoke" as const, actionId: "lab.toggle_collector" as const }),
    );
    for (let i = 0; i < 3; i += 1) {
      await application.semantic.dispatch(collectV1);
    }
    await application.semantic.dispatch(beginCalibrationV1);
    const barrier = await advanceToBarrierV1(application);
    await application.autoSaveIdle();
    const writesBeforeTicks = spy.writes.length;

    // The real pacing inside the 400ms crossfade: four 100ms unfenced
    // reporter ticks. Every one commits inside the in-flight span (well
    // under the declared 8-commit bound, so the inhibit never forfeits),
    // the collector crosses its 250ms cadence once, and autosave stays
    // deferred at the pre-span record the whole time.
    for (let i = 0; i < 4; i += 1) {
      await expect(
        application.semantic.dispatch(
          Object.freeze({ kind: "time" as const, tick: Object.freeze({ elapsedMs: 100 }) }),
        ),
      ).resolves.toMatchObject({ kind: "committed" });
    }
    await application.autoSaveIdle();
    expect(application.semantic.observe().game.monitors.collectorUnits).toBe(1);
    expect(spy.writes.length).toBe(writesBeforeTicks);
    const preSpan = await spy.readAutoCurrent();
    expect(preSpan?.snapshot.state.simulation.narrative.pending?.kind).toBe("choice");

    // Completing the transition closes the span: the resumed autosave
    // carries the monitor progress that committed inside it.
    await application.semantic.dispatch(
      resolveV1(barrier.occurrenceId, {
        kind: "barrier_completed",
        transitionId: barrier.expectedTransitionId,
      }),
    );
    await application.autoSaveIdle();
    expect(spy.writes.length).toBe(writesBeforeTicks + 1);
    const postSpan = await spy.readAutoCurrent();
    expect(postSpan?.snapshot.state.simulation.narrative.pending?.kind).toBe("hold");
    await expect(application.persistence.load("auto.current")).resolves.toMatchObject({
      kind: "loaded",
    });
    expect(application.semantic.observe().game.monitors.collectorUnits).toBe(1);
    await application.dispose();
  });

  it("supports a deterministic debounced autosave policy end to end", async () => {
    const flushes: (() => void)[] = [];
    const records = createMemoryHostRecordStoreV1();
    const writes: string[] = [];
    const spyRecords: HostAtomicRecordStoreV1 = {
      read: (namespace, key) => records.read(namespace, key),
      list: (namespace) => records.list(namespace),
      commit: (mutations) => {
        for (const mutation of mutations) {
          if (mutation.kind === "put" && mutation.key.includes(":auto.current")) {
            writes.push(mutation.key);
          }
        }
        return records.commit(mutations);
      },
    };
    const application = await createLabApplicationInstanceV1({
      records: Object.freeze(spyRecords),
      autosave: { mode: "debounced", delayMs: 500 },
      scheduler: Object.freeze({
        schedule(callback: () => void) {
          flushes.push(callback);
          return () => undefined;
        },
      }),
    });

    await application.semantic.dispatch(collectV1);
    await application.semantic.dispatch(beginV1);
    await application.autoSaveIdle();
    expect(writes).toHaveLength(0);

    flushes.at(-1)?.();
    await application.autoSaveIdle();
    expect(writes).toHaveLength(1);

    await application.dispose();
  });
});
