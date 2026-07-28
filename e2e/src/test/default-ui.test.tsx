// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  DefaultGameRootV1,
  createFakeAudioHostV1,
  createGameUiCompositionV1,
} from "@sillymaker/ui";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import {
  createLabUiSlotsV1,
  labRootLabelsV1,
  labUiProjectorV1,
  labViewportCanvasV1,
} from "../application/composition.tsx";

afterEach(cleanup);

const debugVocabularyV1 = /debug|semantic|revision|replay|fixture|diagnostic/iu;

async function composeLabUiV1() {
  const instance = await createLabApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.e2e.engine-lab",
  });
  // Instant text keeps the existing single-click flows deterministic; the
  // dedicated typewriter test drives a manual clock instead.
  await playerProfile.updatePreferences({ textRevealCharsPerSecond: 0 });
  const composition = createGameUiCompositionV1({
    semantic: instance.semantic,
    projector: labUiProjectorV1,
    anchor: Object.freeze({
      current: () => instance.presentationAnchor(),
      subscribe: (listener: () => void) => instance.subscribePresentationAnchor(() => listener()),
    }),
    overlayIds: ["overlay.lab.journal"],
  });
  return { instance, composition, playerProfile };
}

function renderLabRootV1(input: Awaited<ReturnType<typeof composeLabUiV1>>) {
  return render(
    <DefaultGameRootV1
      composition={input.composition}
      semantic={input.instance.semantic}
      accessibleName="引擎实验室"
      applicationId="e2e"
      viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
      labels={labRootLabelsV1}
      slots={createLabUiSlotsV1({
        instance: input.instance,
        createAudioHost: createFakeAudioHostV1,
        playerProfile: input.playerProfile,
      })}
    />,
  );
}

describe("Engine Lab default UI", () => {
  it("boots the default GameRoot with zero Story React Root code", async () => {
    const labUi = await composeLabUiV1();
    const { instance, composition } = labUi;
    renderLabRootV1(labUi);

    // Viewport and the seven-layer stage are present.
    expect(screen.getByTestId("game-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("stage-background")).toBeInTheDocument();
    expect(screen.getByTestId("stage-system")).toBeInTheDocument();

    // The Story stage contribution renders the semantic stage host with the
    // opening lab background under its stable presentation identity.
    expect(screen.getByRole("group", { name: "引擎实验室" })).toBeInTheDocument();
    const background = document.querySelector('[data-stage-key="layer.e2e.background:tag.e2e.bg"]');
    expect(background).not.toBeNull();
    expect(background).toHaveAttribute("data-stage-content", "content.e2e.bg.lab");
    const collect = screen.getByRole("button", { name: "采集样本" });
    expect(collect).toBeEnabled();

    // Settled asset demand is exactly the current stage target: the opening
    // lab background declares the only runtime asset.
    expect(composition.presentation.getSnapshot().requiredAssetIds).toEqual([
      "asset.e2e.lab.background",
    ]);

    // Dispatch flows through the semantic port and updates the projection —
    // including the visible stage, where the crate prop appears.
    await userEvent.setup().click(collect);
    await waitFor(() => {
      expect(screen.getByText(/样本[1-9]/u)).toBeInTheDocument();
    });
    expect(
      document.querySelector('[data-stage-key="layer.e2e.props:tag.e2e.crate"]'),
    ).toBeInTheDocument();

    // Replacing the background retargets demand exactly: the storeroom has
    // no runtime asset, so the superseded background asset is released.
    await userEvent.setup().click(screen.getByRole("button", { name: "开始流程" }));
    await waitFor(() => {
      expect(
        document
          .querySelector('[data-stage-key="layer.e2e.background:tag.e2e.bg"]')
          ?.getAttribute("data-stage-content"),
      ).toBe("content.e2e.bg.storeroom");
    });
    expect(composition.presentation.getSnapshot().requiredAssetIds).toEqual([]);
    expect(
      document.querySelectorAll('[data-stage-key="layer.e2e.characters:tag.e2e.alpha"]'),
    ).toHaveLength(1);

    // Playing the crossfade is pure presentation: the stage settles without
    // another committed semantic revision (non-barrier transitions never
    // modify gameplay State).
    const revisionDuringPlay = instance.semantic.observe().revision;
    await waitFor(() => {
      expect(
        document.querySelector("[data-semantic-stage]")?.getAttribute("data-stage-settled"),
      ).toBe("true");
    });
    expect(instance.semantic.observe().revision).toBe(revisionDuringPlay);

    composition.dispose();
    await instance.dispose();
  });

  it("plays the calibration narrative through interaction boundaries in the UI", async () => {
    const labUi = await composeLabUiV1();
    const { instance, composition } = labUi;
    renderLabRootV1(labUi);
    const user = userEvent.setup();

    // Begin: the say boundary appears with its stable occurrence.
    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });
    expect(screen.getByText("需要校准信标，请跟我来。")).toBeInTheDocument();

    // Advance through the beta researcher's line to the choice; the beacon
    // and both character stage nodes ran on the way.
    await user.click(screen.getByRole("button", { name: "继续" }));
    await waitFor(() => {
      expect(screen.getByText("样本读数稳定，可以开始校准。")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "继续" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='choice']")).toBeInTheDocument();
    });
    expect(
      document.querySelector('[data-stage-key="layer.e2e.props:tag.e2e.beacon"]'),
    ).toBeInTheDocument();

    // The sample-gated option renders disabled by the shared evaluator.
    expect(screen.getByRole("button", { name: "精密校准" })).toBeDisabled();

    // Choosing flips the background; the acknowledged crossfade confirms
    // the presentation barrier, then the pause auto-resumes, reaching the
    // custom surface without any bespoke callback plumbing.
    await user.click(screen.getByRole("button", { name: "直接校准" }));
    await waitFor(
      () => {
        expect(document.querySelector("[data-lab-interaction='custom']")).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    // Resolve the schema-registered surface and finish the script.
    await user.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "继续" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-narrative='calibrated']")).toBeInTheDocument();
    });
    expect(instance.semantic.observe().narrative).toMatchObject({
      phase: "completed",
      calibration: 2,
    });

    composition.dispose();
    await instance.dispose();
  }, 15_000);

  it("settles a load-restored presentation barrier instead of replaying its transition", async () => {
    const labUi = await composeLabUiV1();
    const { instance, composition } = labUi;
    renderLabRootV1(labUi);
    const user = userEvent.setup();

    // Reach the barrier and save exactly there. The save runs on the queue
    // long before the ~400ms crossfade acknowledgment can resolve it.
    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await user.click(await screen.findByRole("button", { name: "继续" }));
    await user.click(await screen.findByRole("button", { name: "继续" }));
    await user.click(await screen.findByRole("button", { name: "直接校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='barrier']")).toBeInTheDocument();
    });
    const barrierOccurrence = document
      .querySelector("[data-lab-interaction='barrier']")
      ?.getAttribute("data-lab-occurrence");
    await expect(instance.persistence.save("manual")).resolves.toMatchObject({ kind: "saved" });

    // Let the live run finish normally all the way to completion.
    await waitFor(
      () => {
        expect(document.querySelector("[data-lab-interaction='custom']")).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(await screen.findByRole("button", { name: "继续" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-narrative='calibrated']")).toBeInTheDocument();
    });

    // Load back to the barrier: the epoch advances, no transition replays,
    // and the settle recovery policy acknowledges the restored occurrence
    // through the ordinary semantic command. Play continues to the custom
    // surface without re-choosing anything.
    await expect(instance.persistence.load("manual")).resolves.toMatchObject({ kind: "loaded" });
    await waitFor(
      () => {
        expect(document.querySelector("[data-lab-interaction='custom']")).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    expect(barrierOccurrence).toMatch(/^interaction-occurrence\./u);
    expect(instance.semantic.observe().narrative.pending).toMatchObject({ kind: "custom" });

    composition.dispose();
    await instance.dispose();
  }, 15_000);

  it("keeps the resident player DOM free of debug vocabulary", async () => {
    const labUi = await composeLabUiV1();
    const { instance, composition } = labUi;
    const { container } = renderLabRootV1(labUi);

    expect(container.textContent ?? "").not.toMatch(debugVocabularyV1);

    // Machine probes stay data-* only.
    const root = container.querySelector("[data-application-id='e2e']");
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute("data-presentation-epoch", "0");

    composition.dispose();
    await instance.dispose();
  });

  it("opens the Story journal overlay contribution without composer changes", async () => {
    const labUi = await composeLabUiV1();
    const { instance, composition } = labUi;
    renderLabRootV1(labUi);

    await userEvent.setup().click(screen.getByRole("button", { name: "实验日志" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-journal='true']")).toBeInTheDocument();
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "关闭" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-journal='true']")).not.toBeInTheDocument();
    });

    composition.dispose();
    await instance.dispose();
  });

  it("advances the presentation epoch probe after a load", async () => {
    const labUi = await composeLabUiV1();
    const { instance, composition } = labUi;
    const { container } = renderLabRootV1(labUi);

    await instance.persistence.save("manual");
    await instance.semantic.dispatch({ kind: "invoke", actionId: "lab.collect_sample" });
    await instance.persistence.load("manual");

    await waitFor(() => {
      const root = container.querySelector("[data-application-id='e2e']");
      expect(root).toHaveAttribute("data-presentation-epoch", "1");
      expect(root).toHaveAttribute("data-presentation-origin", "load");
    });

    composition.dispose();
    await instance.dispose();
  });

  it("stops publishing after composition disposal", async () => {
    const labUi = await composeLabUiV1();
    const { instance, composition } = labUi;
    const before = composition.presentation.getSnapshot().revision;
    composition.dispose();
    await instance.semantic.dispatch({ kind: "invoke", actionId: "lab.collect_sample" });
    expect(composition.presentation.getSnapshot().revision).toBe(before);
    await instance.dispose();
  });
});
