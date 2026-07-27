// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { InteractionResolutionV2, PendingInteractionV2 } from "@sillymaker/base";
import { createGameHarnessV1 } from "@sillymaker/base/testkit";

import type { LabInvocationV1 } from "../index.js";
import { labSemanticAdapterV1, labStoryEntryV1 } from "../index.js";

function createLabHarnessV1(seed = 90201) {
  return createGameHarnessV1({
    entry: labStoryEntryV1,
    semantic: labSemanticAdapterV1,
    seed,
  });
}

type LabHarnessV1 = Awaited<ReturnType<typeof createLabHarnessV1>>;

const beginV1: LabInvocationV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "lab.begin_calibration" as const,
});

function resolveV1(
  expectedOccurrenceId: string,
  resolution: InteractionResolutionV2,
): LabInvocationV1 {
  return Object.freeze({ kind: "resolve" as const, expectedOccurrenceId, resolution });
}

function pendingV1(harness: LabHarnessV1): PendingInteractionV2 {
  const pending = harness.observe().narrative.pending;
  if (pending === null) throw new Error("expected a pending interaction");
  return pending;
}

async function dispatchCommittedV1(harness: LabHarnessV1, invocation: LabInvocationV1) {
  const result = await harness.dispatch(invocation);
  expect(result).toMatchObject({ kind: "committed" });
}

/** Advances through the whole calibration with the given choice. */
async function playCalibrationV1(
  harness: LabHarnessV1,
  choiceId: string,
  dialValue: number,
): Promise<void> {
  await dispatchCommittedV1(harness, beginV1);
  await dispatchCommittedV1(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }),
  );
  await dispatchCommittedV1(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, { kind: "choose", choiceId }),
  );
  await dispatchCommittedV1(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, {
      kind: "barrier_completed",
      transitionId: "transition.e2e.bg-crossfade",
    }),
  );
  await dispatchCommittedV1(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, { kind: "resume" }),
  );
  await dispatchCommittedV1(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, { kind: "custom", payload: { value: dialValue } }),
  );
  await dispatchCommittedV1(
    harness,
    resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }),
  );
}

describe("Engine Lab pending interactions", () => {
  it("runs pure nodes to each boundary and completes headless, including the barrier", async () => {
    const harness = await createLabHarnessV1();

    // The runner executed the say boundary first; the beacon prop (a pure
    // stage node) only appears after the say resolves.
    await dispatchCommittedV1(harness, beginV1);
    const say = pendingV1(harness);
    expect(say.kind).toBe("say");
    expect(say.occurrenceId).toBe("interaction-occurrence.1");
    expect(harness.observe().narrative.phase).toBe("active");

    await dispatchCommittedV1(harness, resolveV1(say.occurrenceId, { kind: "advance" }));
    const choice = pendingV1(harness);
    expect(choice.kind).toBe("choice");

    // The pure stage node between say and choice showed the beacon.
    const state = harness.admin.inspectForTest().snapshot.state as {
      simulation: {
        stage: { layers: readonly { layerId: string; entries: readonly { tag: string }[] }[] };
      };
    };
    const props = state.simulation.stage.layers.find(
      (layer) => layer.layerId === "layer.e2e.props",
    );
    expect(props?.entries.some((entry) => entry.tag === "tag.e2e.beacon")).toBe(true);

    // Choice availability: the same evaluator blocks the sample-gated
    // option in the published view, in preview, and at dispatch.
    const view = harness.observe().narrative;
    expect(view.choiceOptions).toMatchObject([
      { choiceId: "choice.e2e.cal.basic", enabled: true, blockedBy: null },
      {
        choiceId: "choice.e2e.cal.precise",
        enabled: false,
        blockedBy: "lab.narrative_choice_locked",
      },
    ]);
    const lockedResolve = resolveV1(choice.occurrenceId, {
      kind: "choose",
      choiceId: "choice.e2e.cal.precise",
    });
    expect(await harness.preview(lockedResolve)).toEqual({
      kind: "blocked",
      code: "interaction.choice_disabled",
    });
    expect(await harness.dispatch(lockedResolve)).toEqual({
      kind: "rejected",
      codes: ["interaction.choice_disabled"],
    });

    // Choose the open branch; the barrier resolves immediately headless.
    await dispatchCommittedV1(
      harness,
      resolveV1(choice.occurrenceId, { kind: "choose", choiceId: "choice.e2e.cal.basic" }),
    );
    const barrier = pendingV1(harness);
    expect(barrier.kind).toBe("presentation_barrier");
    await dispatchCommittedV1(
      harness,
      resolveV1(barrier.occurrenceId, {
        kind: "barrier_completed",
        transitionId: "transition.e2e.bg-crossfade",
      }),
    );

    const pause = pendingV1(harness);
    expect(pause).toMatchObject({ kind: "pause", durationMs: 400, skippable: true });
    await dispatchCommittedV1(harness, resolveV1(pause.occurrenceId, { kind: "resume" }));

    const dial = pendingV1(harness);
    expect(dial).toMatchObject({ kind: "custom", surfaceId: "surface.e2e.calibration" });
    await dispatchCommittedV1(
      harness,
      resolveV1(dial.occurrenceId, { kind: "custom", payload: { value: 2 } }),
    );

    const done = pendingV1(harness);
    expect(done.kind).toBe("say");
    await dispatchCommittedV1(harness, resolveV1(done.occurrenceId, { kind: "advance" }));

    const finished = harness.observe().narrative;
    expect(finished.phase).toBe("completed");
    expect(finished.pending).toBeNull();
    expect(finished.calibration).toBe(2);
    await harness.dispose();
  });

  it("fences duplicate activation, stale occurrences, and late callbacks at the queue front", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, beginV1);
    const say = pendingV1(harness);

    // Duplicate click: the first advance commits, the exact same command
    // again is a stale occurrence.
    await dispatchCommittedV1(harness, resolveV1(say.occurrenceId, { kind: "advance" }));
    expect(await harness.dispatch(resolveV1(say.occurrenceId, { kind: "advance" }))).toEqual({
      kind: "rejected",
      codes: ["interaction.occurrence_mismatch"],
    });

    // Wrong-kind resolution against the live occurrence.
    const choice = pendingV1(harness);
    expect(await harness.dispatch(resolveV1(choice.occurrenceId, { kind: "advance" }))).toEqual({
      kind: "rejected",
      codes: ["interaction.kind_mismatch"],
    });

    // Unknown choice IDs reject before availability.
    expect(
      await harness.dispatch(
        resolveV1(choice.occurrenceId, { kind: "choose", choiceId: "choice.e2e.cal.ghost" }),
      ),
    ).toEqual({ kind: "rejected", codes: ["interaction.choice_unknown"] });

    await dispatchCommittedV1(
      harness,
      resolveV1(choice.occurrenceId, { kind: "choose", choiceId: "choice.e2e.cal.basic" }),
    );
    const barrier = pendingV1(harness);

    // A late transition callback with the wrong transition identity.
    expect(
      await harness.dispatch(
        resolveV1(barrier.occurrenceId, {
          kind: "barrier_completed",
          transitionId: "transition.e2e.char-enter",
        }),
      ),
    ).toEqual({ kind: "rejected", codes: ["interaction.barrier_mismatch"] });

    // Out-of-schema custom payloads reject at the same queue front.
    await dispatchCommittedV1(
      harness,
      resolveV1(barrier.occurrenceId, {
        kind: "barrier_completed",
        transitionId: "transition.e2e.bg-crossfade",
      }),
    );
    const pause = pendingV1(harness);
    await dispatchCommittedV1(harness, resolveV1(pause.occurrenceId, { kind: "resume" }));
    const dial = pendingV1(harness);
    expect(
      await harness.dispatch(
        resolveV1(dial.occurrenceId, { kind: "custom", payload: { value: 9 } }),
      ),
    ).toEqual({ kind: "rejected", codes: ["interaction.payload_invalid"] });

    await harness.dispose();
  });

  it("re-entering the script issues fresh occurrences and rejects the old ones", async () => {
    const harness = await createLabHarnessV1();
    await playCalibrationV1(harness, "choice.e2e.cal.basic", 1);
    expect(harness.observe().narrative.phase).toBe("completed");

    await dispatchCommittedV1(harness, beginV1);
    const reentered = pendingV1(harness);
    expect(reentered.definitionId).toBe("interaction.e2e.cal-intro");
    expect(reentered.occurrenceId).toBe("interaction-occurrence.7");

    // The first run's intro occurrence is dead forever.
    expect(
      await harness.dispatch(resolveV1("interaction-occurrence.1", { kind: "advance" })),
    ).toEqual({ kind: "rejected", codes: ["interaction.occurrence_mismatch"] });

    // Duplicate begin while a run is active is equally rejected.
    expect(await harness.dispatch(beginV1)).toEqual({
      kind: "rejected",
      codes: ["lab.narrative_busy"],
    });
    await harness.dispose();
  });

  it("save/load restores the same interaction, occurrence, and stage target", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, beginV1);
    await dispatchCommittedV1(
      harness,
      resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }),
    );
    const atChoice = pendingV1(harness);
    const digest = harness.stateDigest();

    await expect(harness.saves.save("manual")).resolves.toMatchObject({ kind: "saved" });
    await dispatchCommittedV1(
      harness,
      resolveV1(atChoice.occurrenceId, { kind: "choose", choiceId: "choice.e2e.cal.basic" }),
    );
    expect(pendingV1(harness).kind).toBe("presentation_barrier");

    await expect(harness.saves.load("manual")).resolves.toMatchObject({ kind: "loaded" });
    expect(harness.stateDigest()).toBe(digest);
    const restored = pendingV1(harness);
    expect(restored).toEqual(atChoice);

    // The restored occurrence resolves normally; the pre-load barrier
    // occurrence (undone by the load) is stale.
    await dispatchCommittedV1(
      harness,
      resolveV1(restored.occurrenceId, { kind: "choose", choiceId: "choice.e2e.cal.basic" }),
    );
    await harness.dispose();
  });

  it("round-trips at the say and barrier boundaries with identical digests", async () => {
    const harness = await createLabHarnessV1();

    // Stable point 1: the say boundary.
    await dispatchCommittedV1(harness, beginV1);
    const say = pendingV1(harness);
    expect(say.kind).toBe("say");
    const sayDigest = harness.stateDigest();
    await expect(harness.saves.save("quick")).resolves.toMatchObject({ kind: "saved" });

    // Stable point 2: the presentation barrier, with the flipped stage.
    await dispatchCommittedV1(harness, resolveV1(say.occurrenceId, { kind: "advance" }));
    await dispatchCommittedV1(
      harness,
      resolveV1(pendingV1(harness).occurrenceId, {
        kind: "choose",
        choiceId: "choice.e2e.cal.basic",
      }),
    );
    const barrier = pendingV1(harness);
    expect(barrier.kind).toBe("presentation_barrier");
    const barrierDigest = harness.stateDigest();
    await expect(harness.saves.save("manual")).resolves.toMatchObject({ kind: "saved" });

    // Load back to the say: same interaction, same digest, and the barrier
    // occurrence recorded above is stale against the restored state.
    await expect(harness.saves.load("quick")).resolves.toMatchObject({ kind: "loaded" });
    expect(harness.stateDigest()).toBe(sayDigest);
    expect(pendingV1(harness)).toEqual(say);
    expect(
      await harness.dispatch(
        resolveV1(barrier.occurrenceId, {
          kind: "barrier_completed",
          transitionId: "transition.e2e.bg-crossfade",
        }),
      ),
    ).toEqual({ kind: "rejected", codes: ["interaction.occurrence_mismatch"] });

    // Load forward to the barrier: the stage target and interaction return,
    // and the barrier resolves normally — headless confirms immediately.
    await expect(harness.saves.load("manual")).resolves.toMatchObject({ kind: "loaded" });
    expect(harness.stateDigest()).toBe(barrierDigest);
    expect(pendingV1(harness)).toEqual(barrier);
    await dispatchCommittedV1(
      harness,
      resolveV1(barrier.occurrenceId, {
        kind: "barrier_completed",
        transitionId: "transition.e2e.bg-crossfade",
      }),
    );
    expect(pendingV1(harness).kind).toBe("pause");
    await harness.dispose();
  });

  it("rejects corrupt saves before touching the live session state", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, beginV1);
    await dispatchCommittedV1(
      harness,
      resolveV1(pendingV1(harness).occurrenceId, { kind: "advance" }),
    );
    const atChoice = pendingV1(harness);
    const digest = harness.stateDigest();

    const exported = await harness.saves.exportCurrentSave();

    // Corrupt the narrative payload inside the exported bytes.
    const text = new TextDecoder().decode(exported.bytes);
    const tampered = new TextEncoder().encode(
      text.replace("interaction.e2e.cal-approach", "interaction.e2e.cal-tampered"),
    );
    const rejected = await harness.saves.importSave(tampered);
    expect(rejected.kind).toBe("rejected");

    // The live session, stage, and pending interaction are untouched.
    expect(harness.stateDigest()).toBe(digest);
    expect(pendingV1(harness)).toEqual(atChoice);
    await dispatchCommittedV1(
      harness,
      resolveV1(atChoice.occurrenceId, { kind: "choose", choiceId: "choice.e2e.cal.basic" }),
    );
    await harness.dispose();
  });

  it("keeps stage and interaction identity observable to diagnostics, not to agents", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, beginV1);
    const say = pendingV1(harness);

    // Diagnostics surfaces (inspection, DebugBundle snapshots) see the
    // authoritative stage and interaction identity.
    const snapshot = harness.admin.inspectForTest().snapshot as {
      readonly state: {
        readonly simulation: {
          readonly stage: { readonly stageId: string };
          readonly narrative: {
            readonly pending: {
              readonly definitionId: string;
              readonly occurrenceId: string;
            } | null;
          };
        };
      };
    };
    expect(snapshot.state.simulation.stage.stageId).toBe("stage.e2e.lab");
    expect(snapshot.state.simulation.narrative.pending).toMatchObject({
      definitionId: say.definitionId,
      occurrenceId: say.occurrenceId,
    });

    // The player-safe agent diagnostics capability keeps the privacy
    // boundary: story identity and failures, never raw snapshots.
    const diagnostics = harness.grantDiagnosticsCapability();
    const exported = await diagnostics.capability.exportDiagnostics();
    expect(Object.keys(exported).toSorted()).toEqual(["runtimeFailures", "storyId", "trace"]);
    diagnostics.revoke();
    await harness.dispose();
  });

  it("keeps NarrativeHistory in the Save, restored to the exact occurrence", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, beginV1);
    const intro = pendingV1(harness);
    await dispatchCommittedV1(harness, resolveV1(intro.occurrenceId, { kind: "advance" }));

    // The resolved say entered the authoritative history with its occurrence.
    const historyAfterIntro = harness.observe().narrative.history.entries;
    expect(historyAfterIntro).toMatchObject([
      {
        kind: "say",
        definitionId: "interaction.e2e.cal-intro",
        occurrenceId: intro.occurrenceId,
        voiceAssetId: "audio.e2e.voice.cal-intro",
      },
    ]);
    await expect(harness.saves.save("manual")).resolves.toMatchObject({ kind: "saved" });

    // Play forward: the choice adds a history entry too.
    const choice = pendingV1(harness);
    await dispatchCommittedV1(
      harness,
      resolveV1(choice.occurrenceId, { kind: "choose", choiceId: "choice.e2e.cal.basic" }),
    );
    expect(harness.observe().narrative.history.entries).toHaveLength(2);
    expect(harness.observe().narrative.history.entries.at(-1)).toMatchObject({
      kind: "choice",
      textId: "text.e2e.lab.narrative.cal.basic",
    });

    // History is the player backlog, not the CommandLog: the engine log
    // records every command while history holds only resolved narrative
    // boundaries (begin + advance + choose = 3 commands, 2 entries).
    expect(harness.admin.commandLog().length).toBeGreaterThan(
      harness.observe().narrative.history.entries.length,
    );

    // Load restores the history to the saved occurrence — one entry again.
    await expect(harness.saves.load("manual")).resolves.toMatchObject({ kind: "loaded" });
    expect(harness.observe().narrative.history.entries).toEqual(historyAfterIntro);

    // No presentation sidecar: the save bytes carry history but never
    // seen registries, preferences, or playback execution state.
    const exported = await harness.saves.exportCurrentSave();
    const text = new TextDecoder().decode(exported.bytes);
    expect(text).toContain("interaction.e2e.cal-intro");
    expect(text).not.toMatch(/skipPolicy|autoWaitMs|textReveal|seenRegistry|playbackMode/u);
    await harness.dispose();
  });

  it("both branches reach the same boundary with the same authoritative shape", async () => {
    const precise = await createLabHarnessV1(777);
    // The precise branch needs a sample; collect first.
    await dispatchCommittedV1(
      precise,
      Object.freeze({ kind: "invoke" as const, actionId: "lab.collect_sample" as const }),
    );
    await playCalibrationV1(precise, "choice.e2e.cal.precise", 3);
    expect(precise.observe().narrative).toMatchObject({ phase: "completed", calibration: 3 });
    await precise.dispose();
  });
});
