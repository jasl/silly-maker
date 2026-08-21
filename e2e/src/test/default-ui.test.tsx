// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type {
  HostAtomicRecordStoreV1,
  InteractionResolutionV1,
  IsoUtcInstant,
  SessionLeaseOwnerId,
} from "@sillymaker/base";
import {
  createCoreGameApplicationInstanceV1,
  createPlayerProfileStoreV1,
  defineCoreGameApplicationV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";
import {
  DefaultGameRootV1,
  createFakeAudioHostV1,
  createGameUiCompositionV1,
} from "@sillymaker/ui";
import type { SystemDialogCustomSavesV1 } from "@sillymaker/ui";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import type { LabApplicationInstanceV1 } from "../application/core-definition.ts";
import { labCoreApplicationDefinitionV1 } from "../application/core-definition.ts";
import {
  createLabGameUiDefinitionV1,
  createLabUiSlotsV1,
  labGameApplicationV1,
  labRootLabelsV1,
  labUiProjectorV1,
  labViewportCanvasV1,
  labWorkspaceOverlayDefinitionsV1,
} from "../application/composition.tsx";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const debugVocabularyV1 = /debug|semantic|revision|replay|fixture|diagnostic/iu;

async function composeLabUiV1() {
  const instance = await createLabApplicationInstanceV1();
  const composition = createGameUiCompositionV1({
    semantic: instance.semantic,
    projector: labUiProjectorV1,
    anchor: Object.freeze({
      current: () => instance.presentationAnchor(),
      subscribe: (listener: () => void) => instance.subscribePresentationAnchor(() => listener()),
    }),
    overlayDefinitions: labWorkspaceOverlayDefinitionsV1,
  });
  return { instance, composition };
}

async function startHostedLabUiV1(options: {
  readonly records?: HostAtomicRecordStoreV1;
} = {}) {
  globalThis.window.history.replaceState({}, "", "/");
  const records = options.records ?? createMemoryHostRecordStoreV1();
  const profile = await createPlayerProfileStoreV1({
    records,
    storyId: "story.e2e.engine-lab",
  });
  await profile.updatePreferences({ textRevealCharsPerSecond: 0 });
  let instance: LabApplicationInstanceV1 | null = null;
  const application = Object.freeze({
    ...labGameApplicationV1,
    ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
      instance = input.instance;
      return createLabGameUiDefinitionV1({
        instance: input.instance,
        createAudioHost: createFakeAudioHostV1,
      });
    },
  });
  const root = document.createElement("div");
  document.body.append(root);
  const started = await startWebGameApplicationV1(application, {
    rootElement: root,
    host: createWebHostV1({
      records,
      seeds: [20260812],
      uuids: ["bd4018a2-2fea-4359-95c6-96c634b7de8a"],
    }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
  await waitFor(() => {
    expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
  });
  if (instance === null) throw new TypeError("e2e.default_ui_host_capture_missing");
  return Object.freeze({ started, instance: instance as LabApplicationInstanceV1 });
}

/**
 * Stages a legacy mid-barrier Save: the safepoint policy keeps new player
 * saves out of the barrier span, but records written before the policy (or
 * imported from elsewhere) may still capture a pending barrier, and load
 * recovery owns what happens when they come back. A policy-free twin of the
 * Lab definition plays to the barrier headlessly and saves exactly there.
 */
async function stageLegacyMidBarrierSaveV1(
  records: HostAtomicRecordStoreV1,
  slotId: Parameters<LabApplicationInstanceV1["persistence"]["save"]>[0],
): Promise<void> {
  const { persistenceSafepoint: _policyGone, ...legacyDefinition } = labCoreApplicationDefinitionV1;
  const resolved = resolveCoreGameApplicationV1(
    defineCoreGameApplicationV1(legacyDefinition) as typeof labCoreApplicationDefinitionV1,
  );
  if (resolved.kind !== "resolved") {
    throw new TypeError("policy-free Lab definition failed to resolve");
  }
  const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
    host: Object.freeze({
      entropy: createFixedBootstrapEntropyV1({
        uuids: ["bd4018a2-2fea-4359-95c6-96c634b7de8a"],
        seeds: [20260812],
      }),
      records,
      now: () => "2026-08-12T00:00:00.000Z" as IsoUtcInstant,
      ownerId: "owner.sillymaker.e2e.default-ui-legacy" as SessionLeaseOwnerId,
      nextHandoffRequestId: () => "handoff.sillymaker.e2e.default-ui-legacy",
    }),
  }) as LabApplicationInstanceV1;
  try {
    await instance.semantic.dispatch({
      kind: "invoke",
      actionId: "lab.begin_calibration",
    });
    for (let step = 0; step < 8; step += 1) {
      const pending = instance.semantic.observe().narrative.pending;
      if (pending === null || pending.kind === "presentation_barrier") break;
      const resolution: InteractionResolutionV1 = pending.kind === "say"
        ? { kind: "advance" }
        : { kind: "choose", choiceId: "choice.e2e.cal.basic" };
      await instance.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: pending.occurrenceId,
        resolution,
      });
    }
    if (instance.semantic.observe().narrative.pending?.kind !== "presentation_barrier") {
      throw new TypeError("expected the calibration barrier to be pending");
    }
    const saved = await instance.persistence.save(slotId);
    if (saved.kind !== "saved") throw new TypeError("legacy mid-barrier save failed");
  } finally {
    await instance.dispose();
  }
}

function renderLabRootV1(
  input: Awaited<ReturnType<typeof composeLabUiV1>>,
  customSaves?: SystemDialogCustomSavesV1,
) {
  return render(
    <DefaultGameRootV1
      composition={input.composition}
      semantic={input.instance.semantic}
      accessibleName="引擎实验室"
      applicationId="e2e"
      viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
      labels={labRootLabelsV1}
      {...(customSaves === undefined ? {} : { customSaves })}
      slots={createLabUiSlotsV1({
        instance: input.instance,
        createAudioHost: createFakeAudioHostV1,
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
    // no runtime asset, so the superseded background asset is released;
    // what remains is the entering character's declared frame set (frame
    // assets preload with the entry).
    await userEvent.setup().click(screen.getByRole("button", { name: "开始流程" }));
    await waitFor(() => {
      expect(
        document
          .querySelector('[data-stage-key="layer.e2e.background:tag.e2e.bg"]')
          ?.getAttribute("data-stage-content"),
      ).toBe("content.e2e.bg.storeroom");
    });
    expect(composition.presentation.getSnapshot().requiredAssetIds).toEqual([
      "asset.e2e.lab.char-stand",
      "asset.e2e.lab.char-step",
    ]);
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

  it("keeps a custom Save surface reachable from the in-game System menu", async () => {
    const labUi = await composeLabUiV1();
    const { instance, composition } = labUi;
    renderLabRootV1(
      labUi,
      Object.freeze({
        kind: "custom",
        accessibleName: "Custom saves",
        component: ({ close }: { readonly close: () => void }) => (
          <button type="button" onClick={close}>
            Close custom saves
          </button>
        ),
      }),
    );

    const saveLauncher = screen.getByRole("button", { name: "保存" });
    await userEvent.setup().click(saveLauncher);
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Custom saves" })).toBeInTheDocument();
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "Close custom saves" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Custom saves" })).toBeNull();
    });

    composition.dispose();
    await instance.dispose();
  });

  it("plays the calibration narrative through interaction boundaries in the UI", async () => {
    const lab = await startHostedLabUiV1();
    try {
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "开始校准" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
      });
      expect(screen.getByText("需要校准信标，请跟我来。")).toBeInTheDocument();

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
      expect(screen.getByRole("button", { name: "精密校准" })).toBeDisabled();

      await user.click(screen.getByRole("button", { name: "直接校准" }));
      await waitFor(
        () => {
          expect(document.querySelector("[data-lab-interaction='hold']")).toBeInTheDocument();
        },
        { timeout: 4000 },
      );
      await user.click(screen.getByRole("button", { name: "跳过等待" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='custom']")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "2" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
      });
      await user.click(screen.getByRole("button", { name: "继续" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-narrative='calibrated']")).toBeInTheDocument();
      });
      expect(lab.instance.semantic.observe().narrative).toMatchObject({
        phase: "completed",
        calibration: 2,
      });
    } finally {
      await lab.started.dispose();
    }
  }, 15_000);

  it(
    "settles a load-restored presentation barrier instead of replaying its transition",
    async () => {
      // The safepoint policy keeps live player saves out of the barrier span
      // (they reject as in-flight), so the mid-barrier record arrives the way
      // it does in production: written before the policy existed.
      const records = createMemoryHostRecordStoreV1();
      await stageLegacyMidBarrierSaveV1(records, "manual.1");
      const lab = await startHostedLabUiV1({ records });
      const user = userEvent.setup();
      try {
        // A live save at the barrier is what the span forbids.
        await user.click(screen.getByRole("button", { name: "开始校准" }));
        await user.click(await screen.findByRole("button", { name: "继续" }));
        await user.click(await screen.findByRole("button", { name: "继续" }));
        await user.click(await screen.findByRole("button", { name: "直接校准" }));
        await waitFor(() => {
          expect(document.querySelector("[data-lab-interaction='barrier']")).toBeInTheDocument();
        });
        await expect(lab.instance.persistence.save("manual.2")).resolves.toEqual({
          kind: "rejected",
          code: "in_flight",
        });

        // Let the live run finish normally all the way to completion.
        await waitFor(
          () => {
            expect(document.querySelector("[data-lab-interaction='hold']")).toBeInTheDocument();
          },
          { timeout: 4000 },
        );
        await user.click(screen.getByRole("button", { name: "跳过等待" }));
        await waitFor(() => {
          expect(document.querySelector("[data-lab-interaction='custom']")).toBeInTheDocument();
        });
        await user.click(screen.getByRole("button", { name: "2" }));
        await user.click(await screen.findByRole("button", { name: "继续" }));
        await waitFor(() => {
          expect(document.querySelector("[data-lab-narrative='calibrated']")).toBeInTheDocument();
        });

        // Load the legacy mid-barrier record: the epoch advances, no
        // transition replays, and the settle recovery policy acknowledges the
        // restored occurrence through the ordinary semantic command. Play
        // continues to the custom surface without re-choosing anything.
        await expect(lab.instance.persistence.load("manual.1")).resolves.toMatchObject({
          kind: "loaded",
        });
        await waitFor(
          () => {
            expect(document.querySelector("[data-lab-interaction='hold']")).toBeInTheDocument();
          },
          { timeout: 4000 },
        );
        await user.click(screen.getByRole("button", { name: "跳过等待" }));
        await waitFor(() => {
          expect(document.querySelector("[data-lab-interaction='custom']")).toBeInTheDocument();
        });
        expect(lab.instance.semantic.observe().narrative.pending).toMatchObject({ kind: "custom" });
      } finally {
        await lab.started.dispose();
      }
    },
    15_000,
  );

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

    await instance.persistence.save("manual.1");
    await instance.semantic.dispatch({ kind: "invoke", actionId: "lab.collect_sample" });
    await instance.persistence.load("manual.1");

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
