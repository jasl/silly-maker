// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { InteractionResolutionV1 } from "@sillymaker/base";
import { lintNarrativeGraphV1, predictNarrativeDependenciesV1 } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createGameHarnessV1, createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  DefaultGameRootV1,
  createFakeAudioHostV1,
  createGameUiCompositionV1,
} from "@sillymaker/ui";

import type { LabInvocationV1 } from "../index.ts";
import { labSemanticAdapterV1, labStoryEntryV1, projectLabNarrativeGraphV1 } from "../index.ts";
import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import {
  createLabUiSlotsV1,
  labRootLabelsV1,
  labUiProjectorV1,
  labViewportCanvasV1,
} from "../application/web-application.tsx";

/**
 * The AI-authoring canaries: a currency/shop module, a
 * relationship-conditioned narrative branch, and a semantic React overlay —
 * all implemented purely on the Story side of the boundary. The
 * public-import-boundary suite proves the whole package (canaries included)
 * never deep-imports engine internals or reaches across Story packages, and module
 * ownership keeps every cross-module write inside one atomic command.
 */

function createLabHarnessV1(seed = 61101) {
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

async function dispatchCommittedV1(harness: LabHarnessV1, invocation: LabInvocationV1) {
  const result = await harness.dispatch(invocation);
  expect(result).toMatchObject({ kind: "committed" });
}

/** Resolves every narrative boundary until the script completes. */
async function playNarrativeToEndV1(harness: LabHarnessV1): Promise<readonly string[]> {
  const definitions: string[] = [];
  await dispatchCommittedV1(harness, invokeV1("lab.begin_calibration"));
  for (let step = 0; step < 16; step += 1) {
    const pending = harness.observe().narrative.pending;
    if (pending === null) break;
    definitions.push(pending.definitionId);
    const resolution: InteractionResolutionV1 =
      pending.kind === "choice"
        ? { kind: "choose", choiceId: "choice.e2e.cal.basic" }
        : pending.kind === "presentation_barrier"
          ? { kind: "barrier_completed", transitionId: pending.expectedTransitionId }
          : pending.kind === "pause"
            ? { kind: "resume" }
            : pending.kind === "custom"
              ? { kind: "custom", payload: { value: 2 } }
              : { kind: "advance" };
    await dispatchCommittedV1(harness, resolveV1(pending.occurrenceId, resolution));
  }
  return Object.freeze(definitions);
}

describe("canary: currency and shop module", () => {
  it("sells a sample for credits in one atomic cross-module command", async () => {
    const harness = await createLabHarnessV1();
    await dispatchCommittedV1(harness, invokeV1("lab.collect_sample"));
    const before = harness.observe().game;

    await dispatchCommittedV1(harness, invokeV1("lab.sell_sample"));
    const after = harness.observe().game;
    expect(after.samplesCollected).toBe(before.samplesCollected - 1);
    expect(after.credits).toBe(before.credits + 2);

    // One committed log entry carries both owners' facts.
    const entry = harness.admin.commandLog().at(-1);
    const serialized = JSON.stringify(entry?.outcome);
    expect(serialized).toContain("lab.samples_consumed");
    expect(serialized).toContain("lab.credits_changed");
    await harness.dispose();
  });

  it("rejects deterministically with stable codes and an untouched digest", async () => {
    const harness = await createLabHarnessV1();
    const digest = harness.stateDigest();

    // No samples to sell; no credits for the banner. Catalog, preview, and
    // dispatch all answer from the one shared evaluator.
    const actions = harness.observe().actions;
    expect(actions.find((action) => action.actionId === "lab.sell_sample")).toMatchObject({
      enabled: false,
      blockedBy: "lab.insufficient_samples",
    });
    expect(actions.find((action) => action.actionId === "lab.buy_banner")).toMatchObject({
      enabled: false,
      blockedBy: "lab.insufficient_credits",
    });
    await expect(harness.preview(invokeV1("lab.sell_sample"))).resolves.toEqual({
      kind: "blocked",
      code: "lab.insufficient_samples",
    });
    expect(await harness.dispatch(invokeV1("lab.sell_sample"))).toEqual({
      kind: "rejected",
      codes: ["lab.insufficient_samples"],
    });
    expect(await harness.dispatch(invokeV1("lab.buy_banner"))).toEqual({
      kind: "rejected",
      codes: ["lab.insufficient_credits"],
    });
    expect(harness.stateDigest()).toBe(digest);
    await harness.dispose();
  });

  it("buys the banner once: credits spent and the stage prop shown atomically", async () => {
    const harness = await createLabHarnessV1();
    // Earn at least 4 credits (two sales; each collect yields 1–2 samples).
    for (let i = 0; i < 2; i += 1) {
      await dispatchCommittedV1(harness, invokeV1("lab.collect_sample"));
      await dispatchCommittedV1(harness, invokeV1("lab.sell_sample"));
    }
    expect(harness.observe().game.credits).toBe(4);

    await dispatchCommittedV1(harness, invokeV1("lab.buy_banner"));
    const after = harness.observe().game;
    expect(after.credits).toBe(1);
    expect(after.bannerOwned).toBe(true);
    const props = after.stage.layers.find((layer) => layer.layerId === "layer.e2e.props");
    expect(props?.entries.some((entry) => entry.tag === "tag.e2e.banner")).toBe(true);

    const entry = harness.admin.commandLog().at(-1);
    const serialized = JSON.stringify(entry?.outcome);
    expect(serialized).toContain("lab.credits_changed");
    expect(serialized).toContain("lab.stage_changed");

    // Owning it twice rejects without touching anything.
    const digest = harness.stateDigest();
    expect(await harness.dispatch(invokeV1("lab.buy_banner"))).toEqual({
      kind: "rejected",
      codes: ["lab.banner_already_owned"],
    });
    expect(harness.stateDigest()).toBe(digest);

    // Foreign slots stayed foreign: selling and buying never moved the
    // procedure or the narrative.
    expect(after.procedurePhase).toBe("idle");
    expect(harness.observe().narrative.phase).toBe("idle");
    await harness.dispose();
  });
});

describe("canary: relationship-conditioned narrative branch", () => {
  it("routes the beta line on rapport and carries rapport through Saves", async () => {
    const harness = await createLabHarnessV1();

    // First run: no rapport yet — the cold line plays.
    const firstRun = await playNarrativeToEndV1(harness);
    expect(firstRun).toContain("interaction.e2e.cal-beta-note");
    expect(firstRun).not.toContain("interaction.e2e.cal-beta-warm");
    expect(harness.observe().narrative.phase).toBe("completed");

    // Completing the run raised rapport; save exactly here.
    await expect(harness.saves.save("manual")).resolves.toMatchObject({ kind: "saved" });

    // Second run: the branch picks the warm line.
    const secondRun = await playNarrativeToEndV1(harness);
    expect(secondRun).toContain("interaction.e2e.cal-beta-warm");
    expect(secondRun).not.toContain("interaction.e2e.cal-beta-note");

    // Loading the save restores rapport = 1: a fresh run still warms up.
    await expect(harness.saves.load("manual")).resolves.toMatchObject({ kind: "loaded" });
    const reloadedRun = await playNarrativeToEndV1(harness);
    expect(reloadedRun).toContain("interaction.e2e.cal-beta-warm");
    await harness.dispose();
  });

  it("keeps the branch inside the lint-clean prediction graph without deciding it", () => {
    const graph = projectLabNarrativeGraphV1();
    expect(lintNarrativeGraphV1(graph)).toEqual([]);

    // Prediction from the entry collects BOTH conditional lines.
    const prediction = predictNarrativeDependenciesV1(graph, "node.e2e.cal.enter-alpha");
    expect(prediction.textIds).toContain("text.e2e.lab.narrative.cal.beta");
    expect(prediction.textIds).toContain("text.e2e.lab.narrative.cal.beta.warm");
    expect(prediction.truncated).toBe(false);
  });
});

describe("canary: semantic shop overlay", () => {
  afterEach(cleanup);

  it("renders from the publication and dispatches ordinary semantic intents", async () => {
    const instance = await createLabApplicationInstanceV1();
    const records = createMemoryHostRecordStoreV1();
    const playerProfile = await createPlayerProfileStoreV1({
      records,
      storyId: "story.e2e.engine-lab",
    });
    const composition = createGameUiCompositionV1({
      semantic: instance.semantic,
      projector: labUiProjectorV1,
      anchor: Object.freeze({
        current: () => instance.presentationAnchor(),
        subscribe: (listener: () => void) => instance.subscribePresentationAnchor(() => listener()),
      }),
      overlayIds: ["overlay.lab.journal", "overlay.lab.shop"],
    });
    render(
      <DefaultGameRootV1
        composition={composition}
        semantic={instance.semantic}
        accessibleName="引擎实验室"
        applicationId="e2e"
        viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
        labels={labRootLabelsV1}
        slots={createLabUiSlotsV1({
          instance,
          createAudioHost: () => createFakeAudioHostV1(),
          playerProfile,
        })}
      />,
    );
    const user = userEvent.setup();

    // Open the Story-contributed shop overlay; both actions render blocked
    // with their stable reasons straight from the action catalog.
    await user.click(screen.getByRole("button", { name: "补给站" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-shop='true']")).toBeInTheDocument();
    });
    const sell = () => document.querySelector("[data-lab-shop-action='lab.sell_sample']");
    const buy = () => document.querySelector("[data-lab-shop-action='lab.buy_banner']");
    expect(sell()).toBeDisabled();
    expect(sell()).toHaveAttribute("data-lab-shop-blocked", "lab.insufficient_samples");
    expect(buy()).toBeDisabled();
    expect(buy()).toHaveAttribute("data-lab-shop-blocked", "lab.insufficient_credits");

    // Earn credits through the ordinary HUD, then trade in the overlay:
    // every activation is a plain semantic invocation on the shared queue.
    // (Collect yields 1–2 samples, so drive by the published balance.)
    await user.click(screen.getByRole("button", { name: "采集样本" }));
    await user.click(screen.getByRole("button", { name: "采集样本" }));
    await waitFor(() => {
      expect(sell()).toBeEnabled();
    });
    await user.click(sell() as HTMLElement);
    await waitFor(() => {
      expect(document.querySelector("[data-lab-shop-balance='2']")).toBeInTheDocument();
    });
    await user.click(sell() as HTMLElement);
    await waitFor(() => {
      expect(document.querySelector("[data-lab-shop-balance='4']")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(buy()).toBeEnabled();
    });
    await user.click(buy() as HTMLElement);

    // The purchase committed one cross-module command: the banner hangs on
    // the semantic stage and the button falls back to blocked.
    await waitFor(() => {
      expect(
        document.querySelector("[data-lab-prop='content.e2e.prop.banner']"),
      ).toBeInTheDocument();
    });
    expect(buy()).toBeDisabled();
    expect(buy()).toHaveAttribute("data-lab-shop-blocked", "lab.banner_already_owned");
    await waitFor(() => {
      expect(document.querySelector("[data-lab-shop-balance='1']")).toBeInTheDocument();
    });

    cleanup();
    composition.dispose();
    await instance.dispose();
  });
});
