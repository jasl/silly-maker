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

import { createLabApplicationInstanceV1 } from "../application/core-application.js";
import {
  createLabUiSlotsV1,
  labRootLabelsV1,
  labUiProjectorV1,
  labViewportCanvasV1,
} from "../application/web-application.js";
import { labAudioAssetIdsV1 } from "../gameplay/audio.js";

afterEach(cleanup);

async function composeAudioLabV1() {
  const instance = await createLabApplicationInstanceV1();
  const host = createFakeAudioHostV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.e2e.engine-lab",
  });
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
  const rendered = render(
    <DefaultGameRootV1
      composition={composition}
      semantic={instance.semantic}
      accessibleName="引擎实验室"
      applicationId="e2e"
      viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
      labels={labRootLabelsV1}
      slots={createLabUiSlotsV1({ instance, createAudioHost: () => host, playerProfile })}
    />,
  );
  const dispose = async () => {
    rendered.unmount();
    composition.dispose();
    await instance.dispose();
  };
  return { instance, host, dispose };
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
    await expect(instance.persistence.save("manual")).resolves.toMatchObject({ kind: "saved" });
    await user.click(screen.getByRole("button", { name: "推进流程" }));
    await user.click(screen.getByRole("button", { name: "推进流程" }));
    await waitFor(() => {
      expect(host.channel("ambient")).toBeNull();
    });

    await expect(instance.persistence.load("manual")).resolves.toMatchObject({ kind: "loaded" });
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
    const { host, dispose } = await composeAudioLabV1();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(host.channel("voice")).toMatchObject({ assetId: labAudioAssetIdsV1.voiceIntro });
    });

    // Advancing the say stops the stop_on_advance voice line.
    await user.click(await screen.findByRole("button", { name: "继续" }));
    await waitFor(() => {
      expect(host.channel("voice")).toBeNull();
    });

    await dispose();
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
