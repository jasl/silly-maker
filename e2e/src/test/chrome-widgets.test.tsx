// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createFakeAudioHostV1 } from "@sillymaker/ui";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import type { LabApplicationInstanceV1 } from "../application/core-definition.ts";
import { createLabGameUiDefinitionV1, labGameApplicationV1 } from "../application/composition.tsx";
import { labDrillTripwireChoiceIdV1, labDrillTripwireDurationMsV1 } from "../gameplay/narrative.ts";

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
  });
}

type ManualClockV1 = ReturnType<typeof installManualAnimationFrameV1>;

/** Pumps manual frames until the assertion holds (or fails it loudly). */
async function untilV1(clock: ManualClockV1, assertion: () => void): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      assertion();
      return;
    } catch {
      await clock.advance(16);
    }
  }
  assertion();
}

async function startChromeWidgetLabV1() {
  globalThis.window.history.replaceState({}, "", "/");
  const records = createMemoryHostRecordStoreV1();
  const profile = await createPlayerProfileStoreV1({
    records,
    storyId: "story.e2e.engine-lab",
  });
  await profile.updatePreferences({ textRevealCharsPerSecond: 0 });
  const clock = installManualAnimationFrameV1();
  let instance: LabApplicationInstanceV1 | null = null;
  const application = Object.freeze({
    ...labGameApplicationV1,
    ui(uiInput: Parameters<typeof labGameApplicationV1.ui>[0]) {
      instance = uiInput.instance;
      return createLabGameUiDefinitionV1({
        instance: uiInput.instance,
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
      seeds: [20260829],
      uuids: ["6c2d5f04-3b8e-45a1-9a67-1f20cd7e4100"],
    }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
  await waitFor(() => {
    expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
  });
  if (instance === null) throw new TypeError("e2e.chrome_widget_host_capture_missing");
  return Object.freeze({ started, instance: instance as LabApplicationInstanceV1, clock });
}

function engageWidgetV1(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(
    '[data-chrome-widget="drill.engage"]',
  );
}

function progressWidgetV1(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-chrome-widget="drill.progress"]');
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * The chrome-widget conformance (authorable-chrome-layout M3): the layout
 * Document declares an intent widget and a hold-progress meter; the HUD
 * mounts the generic surface and supplies the whole Story side — the
 * availability projection and the intent-id → occurrence-fenced command
 * mapping. Widgets never route: activation lands the same fenced
 * `lab.engage_collector` write as the crate region, the hold keeps its
 * trajectory, and the hold's own `when` arm cuts at the next fenced
 * settlement's t=0. The meter reads only committed `remainingMs/totalMs`
 * — partial fenced ticks move it, wall-clock frames do not.
 */
describe("Engine Lab chrome widgets", () => {
  it("shows the declared widgets over the shared hold, routes activation onto the fenced write, and clears on the cut", async () => {
    const lab = await startChromeWidgetLabV1();
    const { instance, clock } = lab;
    try {
      const semantic = instance.semantic;
      const committed = async (invocation: Parameters<typeof semantic.dispatch>[0]) => {
        expect(await semantic.dispatch(invocation)).toMatchObject({ kind: "committed" });
      };

      // Free navigation: no hold pending — the intent widget reports
      // hidden and the meter has no committed view, so the surface is
      // empty.
      await untilV1(clock, () => {
        expect(document.querySelector('[data-lab-chrome-widgets="true"]')).toBeInTheDocument();
      });
      expect(engageWidgetV1()).toBeNull();
      expect(progressWidgetV1()).toBeNull();

      // Drive to the shared decision menu: still no hold, both stay
      // hidden (the intent widget's availability demands the shared
      // tripwire hold, not just any pending).
      await committed({ kind: "invoke", actionId: "lab.begin_drill" });
      const say = semantic.observe().narrative.pending;
      if (say === null || say.kind !== "say") throw new Error("expected the chamber say");
      await committed({
        kind: "resolve",
        expectedOccurrenceId: say.occurrenceId,
        resolution: { kind: "advance" },
      });
      const menu = semantic.observe().narrative.pending;
      if (menu === null || menu.kind !== "choice") throw new Error("expected the decision menu");
      await untilV1(clock, () => {
        expect(screen.getByRole("button", { name: "布设绊线" })).toBeInTheDocument();
      });
      expect(engageWidgetV1()).toBeNull();
      expect(progressWidgetV1()).toBeNull();

      // Enter the shared tripwire hold: both widgets appear at their
      // declared boxes with the committed view (elapsed 0 of 6000).
      await committed({
        kind: "resolve",
        expectedOccurrenceId: menu.occurrenceId,
        resolution: { kind: "choose", choiceId: labDrillTripwireChoiceIdV1 },
      });
      const hold = semantic.observe().narrative.pending;
      if (hold === null || hold.kind !== "hold") throw new Error("expected the tripwire hold");
      await untilV1(clock, () => {
        expect(engageWidgetV1()).not.toBeNull();
        expect(progressWidgetV1()).not.toBeNull();
      });
      const engage = engageWidgetV1() as HTMLButtonElement;
      expect(engage.dataset.chromeWidgetKind).toBe("intent");
      expect(engage.dataset.chromeIntent).toBe("lab.intent.engage_collector");
      expect(engage.disabled).toBe(false);
      expect(engage.style.insetInlineStart).toBe("1240px");
      expect(engage.style.insetBlockStart).toBe("840px");
      const meterAtEntry = screen.getByRole("progressbar", { name: "警戒窗剩余" });
      expect(meterAtEntry.dataset.chromeWidget).toBe("drill.progress");
      expect(meterAtEntry.getAttribute("aria-valuemax")).toBe(
        String(labDrillTripwireDurationMsV1),
      );
      expect(meterAtEntry.getAttribute("aria-valuenow")).toBe("0");

      // A partial fenced tick commits a decremented remainder: the meter
      // reads the committed view, not a wall clock.
      await committed({
        kind: "time",
        tick: { elapsedMs: 1_500, expectedHoldOccurrenceId: hold.occurrenceId },
      });
      await untilV1(clock, () => {
        expect(progressWidgetV1()?.getAttribute("aria-valuenow")).toBe("1500");
      });
      expect(semantic.observe().narrative.pending).toMatchObject({
        kind: "hold",
        occurrenceId: hold.occurrenceId,
        remainingMs: labDrillTripwireDurationMsV1 - 1_500,
      });

      // Activating the widget lands the occurrence-fenced collector write
      // — the hold keeps running (same occurrence, untouched remainder),
      // and the widget flips to disabled with the resolved reason.
      await userEvent.setup().click(engage);
      await waitFor(() => {
        expect(semantic.observe().game.monitors.collectorEngaged).toBe(true);
      });
      expect(semantic.observe().narrative.pending).toMatchObject({
        kind: "hold",
        occurrenceId: hold.occurrenceId,
        remainingMs: labDrillTripwireDurationMsV1 - 1_500,
      });
      await untilV1(clock, () => {
        const disabled = engageWidgetV1();
        expect(disabled).not.toBeNull();
        expect((disabled as HTMLButtonElement).disabled).toBe(true);
      });
      expect((engageWidgetV1() as HTMLButtonElement).title).toBe("收集器已啮合");

      // A disabled widget dispatches nothing.
      const revisionWhileDisabled = semantic.observe().revision;
      await userEvent.setup().click(engageWidgetV1() as HTMLButtonElement);
      expect(semantic.observe().revision).toBe(revisionWhileDisabled);

      // The hold's own arm reads the committed write at the next fenced
      // settlement's t=0 and cuts to the catch say — no hold pending, so
      // both widgets leave the surface.
      await committed({
        kind: "time",
        tick: { elapsedMs: 50, expectedHoldOccurrenceId: hold.occurrenceId },
      });
      expect(semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        definitionId: "interaction.e2e.drill-catch",
      });
      await untilV1(clock, () => {
        expect(engageWidgetV1()).toBeNull();
        expect(progressWidgetV1()).toBeNull();
      });
    } finally {
      await lab.started.dispose();
    }
  });
});
