// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createFakeAudioHostV1 } from "@sillymaker/ui";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import type { LabApplicationInstanceV1 } from "../application/core-definition.ts";
import { createLabGameUiDefinitionV1, labGameApplicationV1 } from "../application/composition.tsx";

const introTextV1 = "需要校准信标，请跟我来。";

function installManualAnimationFrameV1() {
  let current = 0;
  let nextHandle = 1;
  let pending = new Map<number, FrameRequestCallback>();
  vi.spyOn(globalThis.performance, "now").mockImplementation(() => current);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback): number => {
    const handle = nextHandle;
    nextHandle += 1;
    pending.set(handle, callback);
    return handle;
  });
  vi.stubGlobal("cancelAnimationFrame", (handle: number): void => {
    pending.delete(handle);
  });
  return Object.freeze({
    async advance(milliseconds: number): Promise<void> {
      await act(async () => {
        current += milliseconds;
        const flushing = pending;
        pending = new Map();
        for (const callback of flushing.values()) callback(current);
        await Promise.resolve();
      });
    },
    pendingCount: () => pending.size,
  });
}

async function startPlayerLabV1(input: Readonly<{
  readonly preferences?: Partial<
    PlayerProfileStoreV1["current"] extends () => infer TProfile
      ? TProfile extends { readonly preferences: infer TPreferences } ? TPreferences : never
      : never
  >;
  readonly seen?: readonly (readonly [string, number])[];
}> = {}) {
  globalThis.window.history.replaceState({}, "", "/");
  const records = createMemoryHostRecordStoreV1();
  const seededProfile = await createPlayerProfileStoreV1({
    records,
    storyId: "story.e2e.engine-lab",
  });
  if (input.preferences !== undefined) await seededProfile.updatePreferences(input.preferences);
  for (const [definitionId, seenRevision] of input.seen ?? []) {
    await seededProfile.markSeen(definitionId, seenRevision);
  }

  const clock = installManualAnimationFrameV1();
  const audioHost = createFakeAudioHostV1();
  let instance: LabApplicationInstanceV1 | null = null;
  let playerProfile: PlayerProfileStoreV1 | null = null;
  const application = Object.freeze({
    ...labGameApplicationV1,
    ui(uiInput: Parameters<typeof labGameApplicationV1.ui>[0]) {
      instance = uiInput.instance;
      playerProfile = uiInput.playerProfile;
      return createLabGameUiDefinitionV1({
        instance: uiInput.instance,
        createAudioHost: () => audioHost,
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
      uuids: ["557821ce-3a9f-4d22-92b1-4ebc2ac48000"],
    }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
  await waitFor(() => {
    expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
  });
  if (instance === null || playerProfile === null) {
    throw new TypeError("e2e.player_host_capture_missing");
  }
  return Object.freeze({
    started,
    instance: instance as LabApplicationInstanceV1,
    playerProfile: playerProfile as PlayerProfileStoreV1,
    records,
    clock,
    audioHost,
  });
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Engine Lab production Narrative player", () => {
  it("reveals a Say over the Host clock and keeps confirm reveal-first", async () => {
    const lab = await startPlayerLabV1();
    try {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "开始校准" }));
      const say = await waitFor(() => {
        const element = document.querySelector<HTMLElement>("[data-lab-interaction='say']");
        expect(element).toBeInTheDocument();
        return element!;
      });
      const occurrence = say.dataset.labOccurrence;
      expect(document.querySelector("[data-lab-say-reveal]")).toHaveAttribute(
        "data-lab-say-reveal",
        "revealing",
      );

      await lab.clock.advance(100);
      await waitFor(() => {
        const text = document.querySelector("[data-lab-say-reveal]")?.textContent ?? "";
        expect(text.length).toBeGreaterThan(0);
        expect(text.length).toBeLessThan(introTextV1.length);
      });

      await user.click(screen.getByRole("button", { name: "继续" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-say-reveal]")).toHaveTextContent(introTextV1);
        expect(document.querySelector("[data-lab-say-reveal]")).toHaveAttribute(
          "data-lab-say-reveal",
          "complete",
        );
      });
      expect(document.querySelector("[data-lab-interaction='say']")).toHaveAttribute(
        "data-lab-occurrence",
        occurrence,
      );

      await user.click(screen.getByRole("button", { name: "继续" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toHaveAttribute(
          "data-lab-occurrence",
          "interaction-occurrence.2",
        );
      });
    } finally {
      await lab.started.dispose();
    }
  });

  it(
    "renders all five pending kinds, current Choice availability, and real Stage recovery",
    async () => {
      const lab = await startPlayerLabV1({
        preferences: { textRevealCharsPerSecond: 0 },
      });
      try {
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "开始校准" }));
        await user.click(await screen.findByRole("button", { name: "继续" }));
        await user.click(await screen.findByRole("button", { name: "继续" }));

        await waitFor(() => {
          expect(document.querySelector("[data-lab-interaction='choice']")).toBeInTheDocument();
        });
        const choiceOccurrence = document
          .querySelector("[data-lab-interaction='choice']")
          ?.getAttribute("data-lab-occurrence");
        const disabledRevision = lab.instance.semantic.observe().revision;
        await user.click(screen.getByRole("button", { name: "精密校准" }));
        expect(lab.instance.semantic.observe().revision).toBe(disabledRevision);
        expect(screen.getByRole("button", { name: "直接校准" })).toBeEnabled();

        await user.click(screen.getByRole("button", { name: "采集样本" }));
        await user.click(screen.getByRole("button", { name: "采集样本" }));
        await waitFor(() => {
          expect(screen.getByRole("button", { name: "精密校准" })).toBeEnabled();
        });
        expect(document.querySelector("[data-lab-interaction='choice']")).toHaveAttribute(
          "data-lab-occurrence",
          choiceOccurrence,
        );

        await user.click(screen.getByRole("button", { name: "精密校准" }));
        await waitFor(() => {
          expect(document.querySelector("[data-lab-interaction='barrier']")).toBeInTheDocument();
        });
        await lab.clock.advance(500);
        await waitFor(() => {
          expect(document.querySelector("[data-lab-interaction='pause']")).toBeInTheDocument();
        });
        await user.click(screen.getByRole("button", { name: "跳过等待" }));
        await waitFor(() => {
          expect(document.querySelector("[data-lab-interaction='custom']")).toBeInTheDocument();
        });
        expect(document.querySelector("[data-lab-custom-surface]")).toHaveAttribute(
          "data-lab-custom-surface",
          "surface.e2e.calibration",
        );
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
          pending: null,
        });
      } finally {
        await lab.started.dispose();
      }
    },
    15_000,
  );

  it("routes Auto, Skip, voice replay, and History through fenced production callbacks", async () => {
    const lab = await startPlayerLabV1({
      preferences: {
        textRevealCharsPerSecond: 0,
        autoWaitMs: 100,
        skipPolicy: "skip_all",
      },
    });
    try {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "开始校准" }));
      await waitFor(() => {
        expect(lab.audioHost.channel("voice")?.assetId).toBe("audio.e2e.voice.cal-intro");
      });
      const voicePlays = lab.audioHost.operations().filter((operation) =>
        operation.startsWith("play:voice:")
      ).length;
      await user.click(screen.getByRole("button", { name: "重播语音" }));
      await waitFor(() => {
        expect(
          lab.audioHost.operations().filter((operation) => operation.startsWith("play:voice:")),
        ).toHaveLength(voicePlays + 1);
      });

      await user.click(screen.getByRole("button", { name: "自动" }));
      expect(screen.getByRole("button", { name: "自动" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await lab.clock.advance(100);
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='say']")).toHaveAttribute(
          "data-lab-occurrence",
          "interaction-occurrence.2",
        );
      });

      await user.click(screen.getByRole("button", { name: "回顾记录" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-player='history-panel']")).toHaveTextContent(
          introTextV1,
        );
      });
      await user.click(screen.getByRole("button", { name: "关闭回顾" }));
      await waitFor(() => {
        expect(document.querySelector("[data-lab-player='history-panel']")).toBeNull();
      });

      await user.click(screen.getByRole("button", { name: "自动" }));
      await user.click(screen.getByRole("button", { name: "跳过模式" }));
      expect(screen.getByRole("button", { name: "跳过模式" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await lab.clock.advance(1_000);
      await waitFor(() => {
        expect(document.querySelector("[data-lab-interaction='choice']")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: "跳过模式" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    } finally {
      await lab.started.dispose();
      expect(lab.clock.pendingCount()).toBe(0);
    }
  });

  it("persists Seen and preferences in the Host profile but never the Save", async () => {
    const lab = await startPlayerLabV1({
      preferences: { textRevealCharsPerSecond: 0 },
    });
    try {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "开始校准" }));
      await user.click(await screen.findByRole("button", { name: "继续" }));
      await waitFor(() => {
        expect(lab.playerProfile.current().seen["interaction.e2e.cal-intro"]).toBe(1);
      });
      await lab.playerProfile.updatePreferences({
        skipPolicy: "skip_all",
        skipCutscenes: true,
        autoWaitMs: 250,
      });
      const reopened = await createPlayerProfileStoreV1({
        records: lab.records,
        storyId: "story.e2e.engine-lab",
      });
      expect(reopened.current().preferences).toMatchObject({
        skipPolicy: "skip_all",
        skipCutscenes: true,
        autoWaitMs: 250,
      });
      const exported = await lab.instance.persistence.exportCurrentSave();
      const text = new TextDecoder().decode(exported.bytes);
      expect(text).not.toMatch(
        /skip_all|skipCutscenes|autoWaitMs|textReveal|"seen":|playbackMode/u,
      );
    } finally {
      await lab.started.dispose();
    }
  });
});
