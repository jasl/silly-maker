// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { TransientEffectV1 } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  DefaultGameRootV1,
  createFakeAudioHostV1,
  createGameUiCompositionV1,
} from "@sillymaker/ui";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import {
  createLabGameUiDefinitionV1,
  createLabUiSlotsV1,
  labGameApplicationV1,
  labRootLabelsV1,
  labUiProjectorV1,
  labViewportCanvasV1,
  labWorkspaceOverlayDefinitionsV1,
} from "../application/composition.tsx";
import { labAudioAssetIdsV1 } from "../gameplay/audio.ts";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

async function composeAudioLabV1() {
  const instance = await createLabApplicationInstanceV1();
  const host = createFakeAudioHostV1();
  const composition = createGameUiCompositionV1({
    semantic: instance.semantic,
    projector: labUiProjectorV1,
    anchor: Object.freeze({
      current: () => instance.presentationAnchor(),
      subscribe: (listener: () => void) => instance.subscribePresentationAnchor(() => listener()),
    }),
    overlayDefinitions: labWorkspaceOverlayDefinitionsV1,
  });
  const rendered = render(
    <DefaultGameRootV1
      composition={composition}
      semantic={instance.semantic}
      accessibleName="引擎实验室"
      applicationId="e2e"
      viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
      labels={labRootLabelsV1}
      slots={createLabUiSlotsV1({ instance, createAudioHost: () => host })}
    />,
  );
  const dispose = async () => {
    rendered.unmount();
    composition.dispose();
    await instance.dispose();
  };
  return { instance, host, dispose };
}

async function startHostedAudioLabV1() {
  globalThis.window.history.replaceState({}, "", "/");
  const records = createMemoryHostRecordStoreV1();
  const profile = await createPlayerProfileStoreV1({
    records,
    storyId: "story.e2e.engine-lab",
  });
  await profile.updatePreferences({ textRevealCharsPerSecond: 0 });
  const host = createFakeAudioHostV1();
  const application = Object.freeze({
    ...labGameApplicationV1,
    ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
      return createLabGameUiDefinitionV1({
        instance: input.instance,
        createAudioHost: () => host,
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
      uuids: ["4bfcba6f-d25c-4aca-8ca4-a6bbad298cf9"],
    }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
  await waitFor(() => {
    expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
  });
  return Object.freeze({ started, host });
}

describe("Engine Lab audio presentation", () => {
  it("drives continuous channels from saved state and restores them after load", async () => {
    const { instance, host, dispose } = await composeAudioLabV1();
    const user = userEvent.setup();

    // Boot: the lab theme derives from the opening stage background.
    await waitFor(() => {
      expect(host.channel("bgm")).toMatchObject({ assetId: labAudioAssetIdsV1.bgmLab });
    });
    expect(host.channel("ambient")).toBeNull();

    // Beginning the procedure flips the background and starts the hum: the
    // BGM replace intent crossfades and the ambient joins.
    await user.click(screen.getByRole("button", { name: "采集样本" }));
    await user.click(screen.getByRole("button", { name: "开始流程" }));
    await waitFor(() => {
      expect(host.channel("bgm")).toMatchObject({
        assetId: labAudioAssetIdsV1.bgmStoreroom,
        loop: true,
        fadeMs: 400,
      });
    });
    expect(host.channel("ambient")).toMatchObject({ assetId: labAudioAssetIdsV1.ambientHum });

    // Save here; play forward; load restores the exact saved intent.
    await expect(instance.persistence.save("manual.1")).resolves.toMatchObject({ kind: "saved" });
    await user.click(screen.getByRole("button", { name: "推进流程" }));
    await user.click(screen.getByRole("button", { name: "推进流程" }));
    await waitFor(() => {
      expect(host.channel("ambient")).toBeNull();
    });

    await expect(instance.persistence.load("manual.1")).resolves.toMatchObject({ kind: "loaded" });
    await waitFor(() => {
      expect(host.channel("ambient")).toMatchObject({ assetId: labAudioAssetIdsV1.ambientHum });
    });
    expect(host.channel("bgm")).toMatchObject({ assetId: labAudioAssetIdsV1.bgmStoreroom });

    await dispose();
    expect(host.isDisposed()).toBe(true);
  });

  it("plays commit-only SFX exactly once and never replays them across a load", async () => {
    const { instance, host, dispose } = await composeAudioLabV1();
    const user = userEvent.setup();
    const observed: TransientEffectV1[] = [];
    const unsubscribe = instance.subscribeTransientEffects((effect) => observed.push(effect));

    // One committed collect = one chime with a monotonic sequence stamped
    // on the current epoch.
    await user.click(screen.getByRole("button", { name: "采集样本" }));
    await waitFor(() => {
      expect(host.effects()).toHaveLength(1);
    });
    expect(host.effects()[0]).toMatchObject({ assetId: labAudioAssetIdsV1.sfxChime });
    expect(observed).toMatchObject([{ effectSequence: 1, epoch: 0, effectId: "audio.sfx" }]);

    // Save/load: the epoch advances and history is not replayed — the
    // effect count stays exactly where it was.
    await expect(instance.persistence.save("quick")).resolves.toMatchObject({ kind: "saved" });
    await expect(instance.persistence.load("quick")).resolves.toMatchObject({ kind: "loaded" });
    await waitFor(() => {
      expect(instance.presentationAnchor().origin).toBe("load");
    });
    expect(host.effects()).toHaveLength(1);

    // New commits on the new epoch keep playing new one-shots.
    await user.click(screen.getByRole("button", { name: "采集样本" }));
    await waitFor(() => {
      expect(host.effects()).toHaveLength(2);
    });
    expect(observed.at(-1)).toMatchObject({ effectSequence: 2, epoch: 1 });

    unsubscribe();
    await dispose();
  });

  it("ties the voice line to the say occurrence and stops it on advance", async () => {
    const lab = await startHostedAudioLabV1();
    try {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "开始校准" }));
      await waitFor(() => {
        expect(lab.host.channel("voice")).toMatchObject({
          assetId: labAudioAssetIdsV1.voiceIntro,
        });
      });

      await user.click(await screen.findByRole("button", { name: "继续" }));
      await waitFor(() => {
        expect(lab.host.channel("voice")).toBeNull();
      });
    } finally {
      await lab.started.dispose();
    }
  });

  it("keeps the audio intent when a corrupt import is rejected", async () => {
    const { instance, host, dispose } = await composeAudioLabV1();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "采集样本" }));
    await user.click(screen.getByRole("button", { name: "开始流程" }));
    await waitFor(() => {
      expect(host.channel("bgm")).toMatchObject({ assetId: labAudioAssetIdsV1.bgmStoreroom });
    });

    const exported = await instance.persistence.exportCurrentSave();
    const text = new TextDecoder().decode(exported.bytes);
    expect(text).toContain("content.e2e.bg.storeroom");
    const tampered = new TextEncoder().encode(
      text.replace("content.e2e.bg.storeroom", "content.e2e.bg.tampered"),
    );
    const rejected = await instance.persistence.importSave(tampered);
    expect(rejected.kind).toBe("rejected");

    // The live session and its derived audio intent are untouched.
    expect(host.channel("bgm")).toMatchObject({ assetId: labAudioAssetIdsV1.bgmStoreroom });
    expect(host.channel("ambient")).toMatchObject({ assetId: labAudioAssetIdsV1.ambientHum });
    await dispose();
  });
});
