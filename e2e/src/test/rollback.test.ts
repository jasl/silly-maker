// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import type { LabApplicationInstanceV1 } from "../application/core-application.ts";

async function dispatchCommittedV1(
  instance: LabApplicationInstanceV1,
  invocation: unknown,
): Promise<void> {
  const result = await instance.semantic.dispatch(invocation as never);
  expect(result).toMatchObject({ kind: "committed" });
}

function advanceV1(occurrence: number) {
  return {
    kind: "resolve",
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution: { kind: "advance" },
  };
}

describe("player rollback (R7)", () => {
  it("rolls a narrative boundary back and restores stage, pending, and digest", async () => {
    const instance = await createLabApplicationInstanceV1();
    try {
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "lab.begin_calibration" });
      const atIntro = instance.admin.stateDigest();
      const introPending = instance.semantic.observe().narrative.pending;
      const epochBefore = instance.presentationAnchor().epoch;

      await dispatchCommittedV1(instance, advanceV1(1));
      expect(instance.semantic.observe().narrative.pending?.occurrenceId).toBe(
        "interaction-occurrence.2",
      );
      expect(instance.rollback.available().steps).toBeGreaterThanOrEqual(1);

      const rolled = await instance.rollback.toPrevious();
      expect(rolled).toMatchObject({ kind: "rolled_back" });

      // Authoritative state, pending interaction, and stage all restore to
      // the checkpoint; the presentation epoch advanced with origin
      // "rollback" so stale animation callbacks are fenced out.
      expect(instance.admin.stateDigest()).toBe(atIntro);
      expect(instance.semantic.observe().narrative.pending).toEqual(introPending);
      const anchor = instance.presentationAnchor();
      expect(anchor.origin).toBe("rollback");
      expect(anchor.epoch).toBe(epochBefore + 1);

      // The timeline continues normally from the restored boundary.
      await dispatchCommittedV1(instance, advanceV1(1));
      expect(instance.semantic.observe().narrative.pending?.occurrenceId).toBe(
        "interaction-occurrence.2",
      );
    } finally {
      await instance.dispose();
    }
  });

  it("pins random outcomes: a rolled-back retry reproduces the same result", async () => {
    const instance = await createLabApplicationInstanceV1();
    try {
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "lab.collect_sample" });
      const firstDigest = instance.admin.stateDigest();
      const firstSamples = instance.semantic.observe().game.samplesCollected;

      const rolled = await instance.rollback.toPrevious();
      expect(rolled).toMatchObject({ kind: "rolled_back", commandSequence: 0 });
      expect(instance.semantic.observe().game.samplesCollected).toBe(0);

      // RNG state travels inside the Snapshot: the retry consumes the same
      // draw and lands on the identical outcome and digest. No save-scum.
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "lab.collect_sample" });
      expect(instance.semantic.observe().game.samplesCollected).toBe(firstSamples);
      expect(instance.admin.stateDigest()).toBe(firstDigest);
    } finally {
      await instance.dispose();
    }
  });

  it("treats the experiment settlement as a hard barrier", async () => {
    const instance = await createLabApplicationInstanceV1();
    try {
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "lab.collect_sample" });
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "lab.collect_sample" });
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "lab.begin_procedure" });
      expect(instance.rollback.available().steps).toBeGreaterThanOrEqual(3);

      // The settlement commits and clears every checkpoint behind it.
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "lab.run_experiment" });
      expect(instance.rollback.available().steps).toBe(0);
      const rejected = await instance.rollback.toPrevious();
      expect(rejected).toMatchObject({ kind: "rejected", code: "rollback_unavailable" });

      // New commits after the barrier are rollbackable again.
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "lab.collect_sample" });
      expect(instance.rollback.available().steps).toBe(1);
    } finally {
      await instance.dispose();
    }
  });

  it("keeps rollback and persistence isolated from each other", async () => {
    const instance = await createLabApplicationInstanceV1();
    try {
      await dispatchCommittedV1(instance, { kind: "invoke", actionId: "lab.begin_calibration" });
      const savedDigest = instance.admin.stateDigest();
      const saved = await instance.persistence.save("manual");
      expect(saved).toMatchObject({ kind: "saved" });

      await dispatchCommittedV1(instance, advanceV1(1));
      await instance.rollback.toPrevious();
      expect(instance.admin.stateDigest()).toBe(savedDigest);

      // Loading replaces the replay base: the ring reseeds and old
      // checkpoints from the previous lineage are unreachable.
      await dispatchCommittedV1(instance, advanceV1(1));
      const loaded = await instance.persistence.load("manual");
      expect(loaded).toMatchObject({ kind: "loaded" });
      expect(instance.admin.stateDigest()).toBe(savedDigest);
      expect(instance.rollback.available().steps).toBe(0);
      expect(instance.presentationAnchor().origin).toBe("load");
    } finally {
      await instance.dispose();
    }
  });

  it("bounds the ring and reports unconfigured applications", async () => {
    const instance = await createLabApplicationInstanceV1();
    try {
      // Steps outside the ring reject without touching state.
      const before = instance.admin.stateDigest();
      const tooFar = await instance.rollback.toPrevious(5);
      expect(tooFar).toMatchObject({ kind: "rejected", code: "rollback_unavailable" });
      expect(instance.admin.stateDigest()).toBe(before);
    } finally {
      await instance.dispose();
    }
  });
});
