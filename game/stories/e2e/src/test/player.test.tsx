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
  createManualPresentationClockV1,
} from "@sillymaker/ui";

import { createLabApplicationInstanceV1 } from "../application/core-application.js";
import {
  createLabUiSlotsV1,
  labRootLabelsV1,
  labUiProjectorV1,
  labViewportCanvasV1,
} from "../application/web-application.js";

afterEach(cleanup);

async function composePlayerLabV1(input: { readonly seed?: readonly [string, number][] } = {}) {
  const instance = await createLabApplicationInstanceV1();
  const records = createMemoryHostRecordStoreV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records,
    storyId: "story.e2e.engine-lab",
  });
  for (const [definitionId, seenRevision] of input.seed ?? []) {
    await playerProfile.markSeen(definitionId, seenRevision);
  }
  const clock = createManualPresentationClockV1();
  const host = createFakeAudioHostV1();
  const composition = createGameUiCompositionV1({
    semantic: instance.semantic,
    projector: labUiProjectorV1,
    anchor: Object.freeze({
      current: () => instance.presentationAnchor(),
      subscribe: (listener: () => void) => instance.subscribePresentationAnchor(() => listener()),
    }),
    overlayIds: ["overlay.lab.journal"],
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
        createAudioHost: () => host,
        playerProfile,
        playerClock: clock,
      })}
    />,
  );
  const dispose = async () => {
    cleanup();
    composition.dispose();
    await instance.dispose();
  };
  return { instance, playerProfile, records, clock, host, dispose };
}

const introTextV1 = "需要校准信标，请跟我来。";

describe("Engine Lab VN player", () => {
  it("reveals text over the clock with a two-step confirm", async () => {
    const { instance, clock, dispose } = await composePlayerLabV1();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始校准" }));
    const say = () => document.querySelector("[data-lab-interaction='say']");
    await waitFor(() => {
      expect(say()).toBeInTheDocument();
    });
    const occurrence = say()?.getAttribute("data-lab-occurrence");

    // Default 40 chars/second: partially revealed after 100ms.
    const revealing = document.querySelector("[data-lab-say-reveal]");
    expect(revealing).toHaveAttribute("data-lab-say-reveal", "revealing");
    clock.advance(100);
    await waitFor(() => {
      const text = document.querySelector("[data-lab-say-reveal]")?.textContent ?? "";
      expect(text.length).toBeGreaterThan(0);
      expect(text.length).toBeLessThan(introTextV1.length);
    });

    // First confirm: the full text appears, the interaction does NOT move.
    await user.click(screen.getByRole("button", { name: "继续" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-say-reveal]")).toHaveAttribute(
        "data-lab-say-reveal",
        "complete",
      );
    });
    expect(document.querySelector("[data-lab-say-reveal]")?.textContent).toBe(introTextV1);
    expect(say()).toHaveAttribute("data-lab-occurrence", occurrence ?? "");
    expect(instance.semantic.observe().narrative.pending?.kind).toBe("say");

    // Second confirm resolves the say through the shared contract; the
    // script continues to the beta researcher's line (a fresh occurrence).
    await user.click(screen.getByRole("button", { name: "继续" }));
    await waitFor(() => {
      const next = document.querySelector("[data-lab-interaction='say']");
      expect(next).toBeInTheDocument();
      expect(next?.getAttribute("data-lab-occurrence")).not.toBe(occurrence);
    });
    await dispose();
  });

  it("auto mode advances revealed says and stops at the choice", async () => {
    const { clock, dispose } = await composePlayerLabV1();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });

    const auto = screen.getByRole("button", { name: "自动" });
    await user.click(auto);
    expect(auto).toHaveAttribute("aria-pressed", "true");

    // Reveal the whole intro (12 chars at 40cps = 300ms), wait the auto
    // beat (600ms), advance; then the beta line reveals and auto-advances
    // the same way, stopping only at the choice.
    clock.advance(1000);
    await waitFor(() => {
      expect(document.querySelector("[data-lab-say-reveal]")).toHaveAttribute(
        "data-lab-say-reveal",
        "complete",
      );
    });
    clock.advance(600);
    clock.advance(0);
    await waitFor(() => {
      expect(
        document.querySelector("[data-lab-interaction='say']")?.getAttribute("data-lab-occurrence"),
      ).toBe("interaction-occurrence.2");
    });
    clock.advance(1000);
    await waitFor(() => {
      expect(document.querySelector("[data-lab-say-reveal]")).toHaveAttribute(
        "data-lab-say-reveal",
        "complete",
      );
    });
    clock.advance(600);
    clock.advance(0);
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='choice']")).toBeInTheDocument();
    });

    // The choice stops auto and drops back to normal.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "自动" })).toHaveAttribute("aria-pressed", "false");
    });
    clock.advance(60_000);
    expect(document.querySelector("[data-lab-interaction='choice']")).toBeInTheDocument();
    await dispose();
  });

  it("skip-read skips seen lines and stops at unread ones", async () => {
    // The intro was read in a previous run (Host profile), the rest wasn't.
    const { clock, dispose } = await composePlayerLabV1({
      seed: [["interaction.e2e.cal-intro", 1]],
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "跳过模式" }));
    clock.advance(40);
    clock.advance(0);
    // The seen intro was skipped; the UNREAD beta line stops skip_read.
    await waitFor(() => {
      expect(
        document.querySelector("[data-lab-interaction='say']")?.getAttribute("data-lab-occurrence"),
      ).toBe("interaction-occurrence.2");
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "跳过模式" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
    clock.advance(60_000);
    expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    await dispose();
  });

  it("hide UI is pure presentation and the backlog panel reads from State", async () => {
    const { instance, dispose } = await composePlayerLabV1();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });
    // Two-step confirm through the intro, then through the beta line.
    await user.click(screen.getByRole("button", { name: "继续" }));
    await user.click(screen.getByRole("button", { name: "继续" }));
    await waitFor(() => {
      expect(
        document.querySelector("[data-lab-interaction='say']")?.getAttribute("data-lab-occurrence"),
      ).toBe("interaction-occurrence.2");
    });
    await user.click(screen.getByRole("button", { name: "继续" }));
    await user.click(screen.getByRole("button", { name: "继续" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='choice']")).toBeInTheDocument();
    });

    // The backlog lists both resolved says from authoritative history.
    await user.click(screen.getByRole("button", { name: "回顾记录" }));
    const panel = document.querySelector("[data-lab-player='history-panel']");
    expect(panel?.textContent).toContain(introTextV1);
    expect(panel?.textContent).toContain("研究员甲");
    expect(panel?.textContent).toContain("研究员乙");

    // Hide UI: the narrative surface disappears, State does not move.
    const digestBefore = instance.admin.inspectForTest().snapshot;
    await user.click(screen.getByRole("button", { name: "隐藏界面" }));
    expect(document.querySelector("[data-lab-interaction='choice']")).not.toBeInTheDocument();
    expect(instance.semantic.observe().narrative.pending?.kind).toBe("choice");
    expect(instance.admin.inspectForTest().snapshot).toBe(digestBefore);

    await user.click(screen.getByRole("button", { name: "显示界面" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='choice']")).toBeInTheDocument();
    });
    await dispose();
  });

  it("persists preferences and seen through the Host profile, never the Save", async () => {
    const { instance, playerProfile, records, dispose } = await composePlayerLabV1();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "开始校准" }));
    await waitFor(() => {
      expect(document.querySelector("[data-lab-interaction='say']")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "继续" }));
    await user.click(screen.getByRole("button", { name: "继续" }));

    // The resolved say marked the profile's Seen registry.
    await waitFor(() => {
      expect(playerProfile.current().seen["interaction.e2e.cal-intro"]).toBe(1);
    });
    await playerProfile.updatePreferences({ skipPolicy: "skip_all", autoWaitMs: 250 });

    // A fresh store over the same records reads the persisted profile.
    const reopened = await createPlayerProfileStoreV1({
      records,
      storyId: "story.e2e.engine-lab",
    });
    expect(reopened.current().seen["interaction.e2e.cal-intro"]).toBe(1);
    expect(reopened.current().preferences).toMatchObject({
      skipPolicy: "skip_all",
      autoWaitMs: 250,
    });

    // The Game Save carries none of it: no profile seen map, no playback
    // preferences, no presentation sidecar. (History entries legitimately
    // carry the author-controlled seenRevision contract field.)
    const exported = await instance.persistence.exportCurrentSave();
    const text = new TextDecoder().decode(exported.bytes);
    expect(text).not.toMatch(/skip_all|autoWaitMs|textReveal|"seen":|playbackMode/u);
    await dispose();
  });
});
