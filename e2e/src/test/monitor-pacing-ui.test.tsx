// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import { createFakeAudioHostV1 } from "@sillymaker/ui";
import type { PresentationRatePortV1 } from "@sillymaker/ui";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import type { LabApplicationInstanceV1 } from "../application/core-definition.ts";
import {
  createLabGameUiDefinitionV1,
  labGameApplicationV1,
  labTimeReportingQuantumMsV1,
} from "../application/composition.tsx";
import { labDrillReleaseChoiceIdV1 } from "../gameplay/narrative.ts";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/**
 * The hosted pacing wiring: the Lab declares `timeReporting` and
 * `realtimeWindow`, so the composer installs the session time reporter and
 * the realtime rate pin. In jsdom the reporter runs on the real
 * animation-frame clock, so this suite asserts live-loop reachability
 * (counters move, pins engage) and leaves exact settlement arithmetic to
 * the headless monitor-drill suite.
 */
async function startPacedLabUiV1() {
  globalThis.window.history.replaceState({}, "", "/");
  const records = createMemoryHostRecordStoreV1();
  const profile = await createPlayerProfileStoreV1({
    records,
    storyId: "story.e2e.engine-lab",
  });
  await profile.updatePreferences({ textRevealCharsPerSecond: 0 });
  let instance: LabApplicationInstanceV1 | null = null;
  let presentationRate: PresentationRatePortV1 | null = null;
  const application = Object.freeze({
    ...labGameApplicationV1,
    ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
      instance = input.instance;
      presentationRate = input.presentationRate;
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
  if (instance === null || presentationRate === null) {
    throw new TypeError("e2e.monitor_pacing_capture_missing");
  }
  return Object.freeze({
    started,
    instance: instance as LabApplicationInstanceV1,
    presentationRate: presentationRate as PresentationRatePortV1,
  });
}

function monitorProbeV1(): HTMLElement {
  const probe = document.querySelector("[data-lab-monitors]");
  if (!(probe instanceof HTMLElement)) throw new Error("monitor HUD probe missing");
  return probe;
}

describe("Engine Lab hosted monitor pacing", () => {
  it(
    "feeds session time through the composer metronome and pins the rate for the gauge",
    async () => {
      const { started, instance, presentationRate } = await startPacedLabUiV1();
      try {
        // Idle: no monitor active, nothing reported, rate unpinned.
        expect(monitorProbeV1().dataset.labGaugeLevel).toBe("0");
        expect(presentationRate.state.getCurrent().pinned).toBe(false);

        // Chamber say: the ambient monitor opens the reporting gate and the
        // composer-side reporter starts feeding real unfenced ticks.
        await instance.semantic.dispatch({ kind: "invoke", actionId: "lab.begin_drill" });
        await waitFor(() => {
          expect(instance.semantic.observe().game.monitors.reportingActive).toBe(true);
        });
        await waitFor(() => {
          const ignitions = Number(monitorProbeV1().dataset.labAmbientIgnitions);
          expect(ignitions).toBeGreaterThanOrEqual(1);
        }, { timeout: 4_000 });
        expect(presentationRate.state.getCurrent().pinned).toBe(false);

        // The decision menu: a realtime monitor — the host pins the rate to
        // 1x even while a faster requested rate is set.
        const chamber = instance.semantic.observe().narrative.pending;
        if (chamber === null) throw new Error("expected chamber say pending");
        await instance.semantic.dispatch({
          kind: "resolve",
          expectedOccurrenceId: chamber.occurrenceId,
          resolution: { kind: "advance" },
        });
        await waitFor(() => {
          expect(presentationRate.state.getCurrent().pinned).toBe(true);
        });
        presentationRate.setRate(2);
        expect(presentationRate.state.getCurrent()).toMatchObject({
          rate: 2,
          effectiveRate: 1,
          pinned: true,
        });
        await waitFor(() => {
          const level = Number(monitorProbeV1().dataset.labGaugeLevel);
          expect(level).toBeGreaterThanOrEqual(1);
        }, { timeout: 4_000 });

        // Release: the charge converts, the window closes, the requested
        // rate resumes.
        const decision = instance.semantic.observe().narrative.pending;
        if (decision === null) throw new Error("expected decision pending");
        const creditsBefore = instance.semantic.observe().game.credits;
        const levelAtRelease = instance.semantic.observe().game.monitors.gaugeLevel;
        await instance.semantic.dispatch({
          kind: "resolve",
          expectedOccurrenceId: decision.occurrenceId,
          resolution: { kind: "choose", choiceId: labDrillReleaseChoiceIdV1 },
        });
        await waitFor(() => {
          expect(presentationRate.state.getCurrent()).toMatchObject({
            effectiveRate: 2,
            pinned: false,
          });
        });
        const view = instance.semantic.observe().game;
        expect(view.monitors.gaugeLevel).toBe(0);
        expect(view.credits).toBeGreaterThanOrEqual(creditsBefore + levelAtRelease);
      } finally {
        await started.dispose();
      }
    },
    20_000,
  );

  it(
    "drips the engaged collector from reported session time across ordinary interactions",
    async () => {
      const { started, instance } = await startPacedLabUiV1();
      try {
        await instance.semantic.dispatch({ kind: "invoke", actionId: "lab.toggle_collector" });
        await waitFor(() => {
          expect(monitorProbeV1().dataset.labCollectorEngaged).toBe("true");
        });
        await waitFor(() => {
          const units = Number(monitorProbeV1().dataset.labCollectorUnits);
          expect(units).toBeGreaterThanOrEqual(1);
        }, { timeout: 4_000 });

        // Disengaging closes the gate; retained progress stays visible.
        await instance.semantic.dispatch({ kind: "invoke", actionId: "lab.toggle_collector" });
        await waitFor(() => {
          expect(instance.semantic.observe().game.monitors.reportingActive).toBe(false);
        });
      } finally {
        await started.dispose();
      }
    },
    20_000,
  );
});

describe("Engine Lab pacing declaration", () => {
  it("declares the metronome and window against the live publication shape", async () => {
    const instance = await createLabApplicationInstanceV1();
    const definition = createLabGameUiDefinitionV1({
      instance,
      createAudioHost: createFakeAudioHostV1,
    });
    expect(definition.timeReporting.quantumMs).toBe(labTimeReportingQuantumMsV1);

    const publicationWith = (monitors: {
      readonly reportingActive: boolean;
      readonly realtimeActive: boolean;
    }): unknown => ({ semantic: { game: { monitors } } });

    expect(
      definition.timeReporting.enabledWhen(
        publicationWith({ reportingActive: true, realtimeActive: false }),
      ),
    ).toBe(true);
    expect(
      definition.timeReporting.enabledWhen(
        publicationWith({ reportingActive: false, realtimeActive: true }),
      ),
    ).toBe(false);
    expect(
      definition.realtimeWindow(
        publicationWith({ reportingActive: false, realtimeActive: true }),
      ),
    ).toBe(true);
    // Malformed publications read as inactive instead of throwing — a
    // throwing predicate would latch host pacing off.
    expect(definition.timeReporting.enabledWhen(null)).toBe(false);
    expect(definition.realtimeWindow(undefined)).toBe(false);

    // The declared dispatch is the Story's unfenced time command.
    const result = await definition.timeReporting.dispatch(120);
    expect(result).toMatchObject({ kind: "committed" });
  });
});
