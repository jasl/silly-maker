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

async function startSharedStageLabV1() {
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
      seeds: [20260826],
      uuids: ["3f8a41be-9d17-4bd4-8b12-0a4c56de2000"],
    }),
    capabilitySearch: "",
    registerPageLifecycle: false,
  });
  await waitFor(() => {
    expect(screen.getByRole("application", { name: "引擎实验室" })).toBeInTheDocument();
  });
  if (instance === null) throw new TypeError("e2e.shared_stage_host_capture_missing");
  return Object.freeze({ started, instance: instance as LabApplicationInstanceV1, clock });
}

function stageLayerV1(id: string): HTMLElement {
  const layer = document.querySelector<HTMLElement>(`[data-stage-layer="${id}"]`);
  if (layer === null) throw new Error(`expected stage layer ${id}`);
  return layer;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * The shared-stage-input conformance: pendings declaring
 * `stageInput: "shared"` keep the gameplay layers input-reachable, and the
 * crate region's activation routes onto occurrence-fenced commands — a
 * choice resolution while the shared menu is up, the fenced collector
 * write while the shared tripwire hold runs. Isolated pendings keep
 * today's inert stage and a synthetic activation dispatches nothing. The
 * real-pointer half of the evidence lives in the browser suite
 * (`shared-stage-input.spec.ts`); jsdom does not enforce `inert`, so this
 * test pins the attributes and the routing.
 */
describe("Engine Lab shared stage input", () => {
  it("frees the stage under shared pendings and routes region activation onto fenced commands", async () => {
    const lab = await startSharedStageLabV1();
    const { instance, clock } = lab;
    try {
      const semantic = instance.semantic;
      const committed = async (invocation: Parameters<typeof semantic.dispatch>[0]) => {
        expect(await semantic.dispatch(invocation)).toMatchObject({ kind: "committed" });
      };

      // The crate (with its authored regions Document) enters on first
      // collect, during free navigation — no isolation anywhere.
      await committed({ kind: "invoke", actionId: "lab.collect_sample" });
      await untilV1(clock, () => {
        expect(screen.getByRole("button", { name: "样本箱采集口" })).toBeInTheDocument();
      });
      const zone = screen.getByRole("button", { name: "样本箱采集口" });
      expect(stageLayerV1("background")).not.toHaveAttribute("inert");

      // Isolated chamber say: the gameplay layers are inert, and a
      // synthetic activation (jsdom clicks ignore inert) dispatches
      // nothing.
      await committed({ kind: "invoke", actionId: "lab.begin_drill" });
      await untilV1(clock, () => {
        expect(stageLayerV1("background")).toHaveAttribute("inert");
      });
      const revisionUnderSay = semantic.observe().revision;
      await userEvent.setup().click(zone);
      expect(semantic.observe().revision).toBe(revisionUnderSay);
      const say = semantic.observe().narrative.pending;
      expect(say).toMatchObject({ kind: "say" });
      if (say === null) throw new Error("expected the chamber say");

      // The decision menu declares shared stage input: isolation releases
      // while the menu idles, and activating the crate region resolves
      // the tripwire option against this same occurrence.
      await committed({
        kind: "resolve",
        expectedOccurrenceId: say.occurrenceId,
        resolution: { kind: "advance" },
      });
      expect(semantic.observe().narrative.pending).toMatchObject({
        kind: "choice",
        stageInput: "shared",
      });
      await untilV1(clock, () => {
        expect(stageLayerV1("background")).not.toHaveAttribute("inert");
      });
      await userEvent.setup().click(zone);
      await waitFor(() => {
        expect(semantic.observe().narrative.pending).toMatchObject({
          kind: "hold",
          definitionId: "interaction.e2e.drill-tripwire",
          stageInput: "shared",
          remainingMs: labDrillTripwireDurationMsV1,
        });
      });

      // The shared tripwire hold keeps the stage free; a second
      // activation lands the fenced collector write without touching the
      // hold.
      await untilV1(clock, () => {
        expect(stageLayerV1("background")).not.toHaveAttribute("inert");
      });
      const hold = semantic.observe().narrative.pending;
      if (hold === null) throw new Error("expected the tripwire hold");
      await userEvent.setup().click(zone);
      await waitFor(() => {
        expect(semantic.observe().game.monitors.collectorEngaged).toBe(true);
      });
      expect(semantic.observe().narrative.pending).toMatchObject({
        kind: "hold",
        occurrenceId: hold.occurrenceId,
        remainingMs: labDrillTripwireDurationMsV1,
      });

      // The hold's own arm reads the committed write at the next fenced
      // settlement's t=0 and cuts to the catch line — an isolated say, so
      // the stage isolates again.
      await committed({
        kind: "time",
        tick: { elapsedMs: 50, expectedHoldOccurrenceId: hold.occurrenceId },
      });
      expect(semantic.observe().narrative.pending).toMatchObject({
        kind: "say",
        definitionId: "interaction.e2e.drill-catch",
      });
      await untilV1(clock, () => {
        expect(stageLayerV1("background")).toHaveAttribute("inert");
      });
    } finally {
      await lab.started.dispose();
    }
  });
});
