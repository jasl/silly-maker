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
import { labDrillTripwireDurationMsV1 } from "../gameplay/narrative.ts";

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

async function startAsideLabV1() {
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
      seeds: [20260827],
      uuids: ["6b2d9c4e-1f53-48aa-9c07-3e5a80bf2100"],
    }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
  await waitFor(() => {
    expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
  });
  if (instance === null) throw new TypeError("e2e.aside_host_capture_missing");
  return Object.freeze({ started, instance: instance as LabApplicationInstanceV1, clock });
}

function asideWindowV1(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-lab-aside='true']");
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * The narrative-aside conformance: a mid-hold fenced write raises a
 * zero-authority aside whose pages advance locally over the still-running
 * hold, an aside arriving while an authoritative dialogue owns the surface
 * is consumed-by-drop, and the `when` reroute onto the catch say
 * force-dismisses a presenting aside. The real-pointer half of the
 * evidence lives in the browser suite (`narrative-aside.spec.ts`).
 */
describe("Engine Lab narrative aside", () => {
  it("presents mid-hold flavor pages without touching the hold and yields to the catch say", async () => {
    const lab = await startAsideLabV1();
    const { instance, clock } = lab;
    try {
      const semantic = instance.semantic;
      const committed = async (invocation: Parameters<typeof semantic.dispatch>[0]) => {
        expect(await semantic.dispatch(invocation)).toMatchObject({ kind: "committed" });
      };

      // The crate enters on first collect, during free navigation.
      await committed({ kind: "invoke", actionId: "lab.collect_sample" });
      await untilV1(clock, () => {
        expect(screen.getByRole("button", { name: "样本箱采集口" })).toBeInTheDocument();
      });
      const zone = screen.getByRole("button", { name: "样本箱采集口" });
      expect(asideWindowV1()).toBeNull();

      // Isolated chamber say: an aside pushed while the authoritative
      // dialogue owns the surface is consumed-by-drop — toggling the
      // collector on raises the aside push (sequence 1), which must never
      // surface, not even after the dialogue clears. Toggle back off so
      // the tripwire arm starts from a clean switch.
      await committed({ kind: "invoke", actionId: "lab.begin_drill" });
      await untilV1(clock, () => {
        expect(semantic.observe().narrative.pending).toMatchObject({ kind: "say" });
      });
      await committed({ kind: "invoke", actionId: "lab.toggle_collector" });
      await committed({ kind: "invoke", actionId: "lab.toggle_collector" });
      await untilV1(clock, () => {
        expect(asideWindowV1()).toBeNull();
      });

      // Walk to the shared decision menu, then choose the tripwire watch
      // through the crate region (the shared-stage-input path).
      const say = semantic.observe().narrative.pending;
      if (say === null) throw new Error("expected the chamber say");
      await committed({
        kind: "resolve",
        expectedOccurrenceId: say.occurrenceId,
        resolution: { kind: "advance" },
      });
      await untilV1(clock, () => {
        expect(asideWindowV1()).toBeNull();
      });
      await userEvent.setup().click(zone);
      await waitFor(() => {
        expect(semantic.observe().narrative.pending).toMatchObject({
          kind: "hold",
          definitionId: "interaction.e2e.drill-tripwire",
        });
      });
      const hold = semantic.observe().narrative.pending;
      if (hold === null) throw new Error("expected the tripwire hold");
      expect(asideWindowV1()).toBeNull();

      // The fenced mid-hold write commits and raises the aside (sequence
      // 2 — the dropped push consumed sequence 1). The hold's occurrence
      // and remaining milliseconds are untouched.
      await userEvent.setup().click(zone);
      await waitFor(() => {
        expect(semantic.observe().game.monitors.collectorEngaged).toBe(true);
      });
      await untilV1(clock, () => {
        expect(asideWindowV1()).not.toBeNull();
      });
      const window = asideWindowV1() as HTMLElement;
      expect(window.dataset.labAsideSequence).toBe("2");
      expect(window.dataset.labAsidePageIndex).toBe("0");
      expect(window.dataset.labAsidePageCount).toBe("2");
      expect(window.querySelector("[data-lab-aside-speaker]")?.textContent).toBe("研究员乙");
      expect(window.querySelector("[data-lab-aside-text]")?.textContent).toBe(
        "收集器咔哒咬合，绊线绷紧了。",
      );
      expect(semantic.observe().narrative.pending).toMatchObject({
        kind: "hold",
        occurrenceId: hold.occurrenceId,
        remainingMs: labDrillTripwireDurationMsV1,
      });

      // Advancing pages is purely local presentation: the second page
      // (no speaker) appears and the semantic revision does not move.
      const revisionBeforeAdvance = semantic.observe().revision;
      await userEvent.setup().click(
        window.querySelector("[data-lab-aside-advance]") as HTMLElement,
      );
      await untilV1(clock, () => {
        expect(asideWindowV1()?.dataset.labAsidePageIndex).toBe("1");
      });
      expect(asideWindowV1()?.querySelector("[data-lab-aside-speaker]")).toBeNull();
      expect(asideWindowV1()?.querySelector("[data-lab-aside-text]")?.textContent).toBe(
        "低鸣渐起——别出声，等它靠近。",
      );
      expect(semantic.observe().revision).toBe(revisionBeforeAdvance);

      // The arm reads the write at the next fenced settlement's t=0 and
      // cuts to the catch say; the authoritative dialogue taking the
      // surface force-dismisses the still-presenting aside.
      await committed({
        kind: "time",
        tick: { elapsedMs: 50, expectedHoldOccurrenceId: hold.occurrenceId },
      });
      expect(semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        definitionId: "interaction.e2e.drill-catch",
      });
      await untilV1(clock, () => {
        expect(asideWindowV1()).toBeNull();
      });
    } finally {
      await lab.started.dispose();
    }
  });
});
