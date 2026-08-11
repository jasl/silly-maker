// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  InteractionResolutionV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityPortV1,
} from "@sillymaker/base";
import { createPlayerProfileStoreV1, type PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  createFakeAudioHostV1,
  createGameUiCompositionV1,
  createManualPresentationClockV1,
  DefaultGameRootV1,
} from "@sillymaker/ui";

import { createLabApplicationInstanceV1 } from "../application/core-application.ts";
import type { LabApplicationInstanceV1 } from "../application/core-definition.ts";
import {
  createLabUiSlotsV1,
  labGamepadMapV1,
  labGameApplicationV1,
  labKeyboardMapV1,
  labRootLabelsV1,
  labUiProjectorV1,
  labViewportCanvasV1,
  labWorkspaceOverlayDefinitionsV1,
} from "../application/composition.tsx";
import {
  createLabNarrativeConformanceInputV1,
  createLabNarrativeConformanceV1,
} from "../application/narrative-conformance.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  globalThis.window.history.replaceState({}, "", "/");
});

async function createLabProfileV1() {
  return await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.e2e.engine-lab",
  });
}

function countSemanticSubscriptionsV1(
  instance: LabApplicationInstanceV1,
  onUnsubscribe?: () => void,
): {
  readonly instance: LabApplicationInstanceV1;
  subscribeCalls(): number;
  unsubscribeCalls(): number;
  activeSubscriptions(): number;
} {
  const semantic = instance.semantic;
  let subscribeCalls = 0;
  let unsubscribeCalls = 0;
  let activeSubscriptions = 0;
  const countedSemantic: LabApplicationInstanceV1["semantic"] = Object.freeze({
    ...semantic,
    subscribe(listener: () => void): () => void {
      subscribeCalls += 1;
      activeSubscriptions += 1;
      const unsubscribe = semantic.subscribe(listener);
      let unsubscribed = false;
      return () => {
        if (unsubscribed) return;
        unsubscribed = true;
        unsubscribeCalls += 1;
        activeSubscriptions -= 1;
        unsubscribe();
        onUnsubscribe?.();
      };
    },
  });
  return {
    instance: Object.freeze({ ...instance, semantic: countedSemantic }),
    subscribeCalls: () => subscribeCalls,
    unsubscribeCalls: () => unsubscribeCalls,
    activeSubscriptions: () => activeSubscriptions,
  };
}

function faultFirstSemanticObservationV1(instance: LabApplicationInstanceV1): {
  readonly instance: LabApplicationInstanceV1;
  observeCalls(): number;
} {
  const semantic = instance.semantic;
  let observeCalls = 0;
  const faultedSemantic: LabApplicationInstanceV1["semantic"] = Object.freeze({
    ...semantic,
    observe() {
      observeCalls += 1;
      if (observeCalls === 1) throw new TypeError("e2e.synthetic_initial_observe_fault");
      return semantic.observe();
    },
  });
  return Object.freeze({
    instance: Object.freeze({ ...instance, semantic: faultedSemantic }),
    observeCalls: () => observeCalls,
  });
}

type LabGameUiInputV1 = Parameters<typeof labGameApplicationV1.ui>[0];

function createLabGameUiInputV1(
  instance: LabApplicationInstanceV1,
  playerProfile: PlayerProfileStoreV1,
  reportFailure: (code: string, error: unknown) => void = vi.fn(),
): LabGameUiInputV1 {
  const capabilityState: RuntimeCapabilitiesV1 = Object.freeze({
    debugTools: false,
    cheats: false,
    automationBridge: false,
  });
  const capabilityView = Object.freeze({
    getCurrent: () => capabilityState,
    subscribe: (_listener: () => void): () => void => () => undefined,
  });
  const persistedCapabilities: RuntimeCapabilityPortV1 = Object.freeze({
    state: capabilityView,
    setEnabled: () =>
      Promise.resolve(Object.freeze({ kind: "unchanged" as const, state: capabilityState })),
  });
  return Object.freeze({
    instance,
    playerProfile,
    assetLoader: Object.freeze({
      cacheKey: () => "engine-lab-conformance",
      load: () => Promise.resolve(Object.freeze({ kind: "aborted" as const })),
      dispose: () => undefined,
    }),
    files: Object.freeze({
      selectOne: () => Promise.resolve(Object.freeze({ kind: "cancelled" as const })),
      download: () => Promise.resolve(),
    }),
    capabilities: Object.freeze({
      persisted: persistedCapabilities,
      sessionRequested: Object.freeze([]),
      state: capabilityView,
      setEnabled: persistedCapabilities.setEnabled,
      dispose: () => undefined,
    }),
    reportFailure,
  });
}

function resolutionForPendingV1(
  pending: NonNullable<
    ReturnType<LabApplicationInstanceV1["semantic"]["observe"]>["narrative"]["pending"]
  >,
): InteractionResolutionV1 {
  switch (pending.kind) {
    case "say":
      return Object.freeze({ kind: "advance" as const });
    case "choice":
      return Object.freeze({ kind: "choose" as const, choiceId: "choice.e2e.cal.basic" });
    case "presentation_barrier":
      return Object.freeze({
        kind: "barrier_completed" as const,
        transitionId: pending.expectedTransitionId,
      });
    case "pause":
      return Object.freeze({ kind: "resume" as const });
    case "custom":
      return Object.freeze({
        kind: "custom" as const,
        payload: Object.freeze({ value: 2 }),
      });
  }
  throw new TypeError("e2e.narrative_conformance_pending_kind_invalid");
}

function pressV1(code: string): void {
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }),
  );
}

describe("Engine Lab dormant Narrative conformance", () => {
  it("projects cached real semantic pending and history snapshots", async () => {
    const instance = await createLabApplicationInstanceV1();
    const playerProfile = await createLabProfileV1();
    const input = createLabNarrativeConformanceInputV1({
      instance,
      playerProfile,
      presentationClock: createManualPresentationClockV1(),
      voiceReplay: () => false,
      reportFailure: vi.fn(),
    });
    const notifications = vi.fn();
    const unsubscribe = input.subscribeNarrative(notifications);
    try {
      const initial = input.observeNarrative();
      expect(Reflect.ownKeys(input)).toEqual([
        "observeNarrative",
        "subscribeNarrative",
        "dispatchResolution",
        "playerProfile",
        "presentationClock",
        "textResolver",
        "voiceReplay",
        "reportFailure",
      ]);
      expect(Reflect.ownKeys(initial)).toEqual(["revision", "pending", "history"]);
      expect(Object.isFrozen(initial)).toBe(true);
      expect(initial.pending).toBeNull();
      expect(input.observeNarrative()).toBe(initial);

      await instance.semantic.dispatch(
        Object.freeze({ kind: "invoke" as const, actionId: "lab.begin_calibration" as const }),
      );
      const say = input.observeNarrative();
      expect(say).not.toBe(initial);
      expect(say.pending?.kind).toBe("say");
      expect(input.observeNarrative()).toBe(say);
      expect(notifications).toHaveBeenCalled();

      await input.dispatchResolution(
        Object.freeze({
          expectedOccurrenceId: say.pending!.occurrenceId,
          resolution: Object.freeze({ kind: "advance" as const }),
        }),
      );
      const advanced = input.observeNarrative();
      expect(advanced.revision).toBeGreaterThan(say.revision);
      expect(advanced.history.entries).toHaveLength(1);
      expect(advanced.history.entries[0]?.occurrenceId).toBe(say.pending!.occurrenceId);
    } finally {
      unsubscribe();
      await instance.dispose();
    }
  });

  it("projects every real Engine Lab boundary and settles only after source publication", async () => {
    const instance = await createLabApplicationInstanceV1();
    const playerProfile = await createLabProfileV1();
    const input = createLabNarrativeConformanceInputV1({
      instance,
      playerProfile,
      presentationClock: createManualPresentationClockV1(),
      voiceReplay: () => false,
      reportFailure: vi.fn(),
    });
    let notificationSequence = 0;
    const unsubscribe = input.subscribeNarrative(() => {
      notificationSequence += 1;
    });
    try {
      expect(input.observeNarrative().pending).toBeNull();
      await instance.semantic.dispatch(
        Object.freeze({ kind: "invoke" as const, actionId: "lab.begin_calibration" as const }),
      );

      const transcript: string[] = [];
      for (let step = 0; step < 8; step += 1) {
        const before = input.observeNarrative();
        const pending = before.pending;
        if (pending === null) break;
        transcript.push(pending.kind);
        const notificationsBefore = notificationSequence;
        let notificationsAtSettlement = notificationsBefore;
        await input.dispatchResolution(
          Object.freeze({
            expectedOccurrenceId: pending.occurrenceId,
            resolution: resolutionForPendingV1(pending),
          }),
        ).then(() => {
          notificationsAtSettlement = notificationSequence;
        });
        expect(notificationsAtSettlement).toBeGreaterThan(notificationsBefore);
        const after = input.observeNarrative();
        expect(after.revision).toBeGreaterThan(before.revision);
        expect(after).not.toBe(before);
        expect(input.observeNarrative()).toBe(after);
      }

      expect(transcript).toEqual([
        "say",
        "say",
        "choice",
        "presentation_barrier",
        "pause",
        "custom",
        "say",
      ]);
      const completed = input.observeNarrative();
      expect(completed.pending).toBeNull();
      expect(
        completed.history.entries.map(({ kind, definitionId }) => ({ kind, definitionId })),
      ).toEqual([
        { kind: "say", definitionId: "interaction.e2e.cal-intro" },
        { kind: "say", definitionId: "interaction.e2e.cal-beta-note" },
        { kind: "choice", definitionId: "interaction.e2e.cal-approach" },
        { kind: "say", definitionId: "interaction.e2e.cal-done" },
      ]);
      expect(Object.isFrozen(completed)).toBe(true);
    } finally {
      unsubscribe();
      await instance.dispose();
    }
  });

  it("reads only the exact query value before mount and releases the source on UI dispose", async () => {
    const original = await createLabApplicationInstanceV1();
    let declaration: ReturnType<typeof labGameApplicationV1.ui> | undefined;
    const counted = countSemanticSubscriptionsV1(original, () => declaration?.dispose?.());
    const playerProfile = await createLabProfileV1();
    const uiInput = createLabGameUiInputV1(counted.instance, playerProfile);
    const getSpy = vi.spyOn(URLSearchParams.prototype, "get");
    const removeEventListenerSpy = vi.spyOn(globalThis.window, "removeEventListener");
    try {
      for (
        const search of [
          "",
          "?narrative_conformance",
          "?narrative_conformance=",
          "?narrative_conformance=true",
          "?narrative_conformance=0",
          "?narrative_conformance=0&narrative_conformance=1",
        ]
      ) {
        globalThis.window.history.replaceState({}, "", `/${search}`);
        const callsBefore = counted.subscribeCalls();
        const narrativeReadsBefore = getSpy.mock.calls.filter(
          ([key]) => key === "narrative_conformance",
        ).length;
        const legacyDeclaration = labGameApplicationV1.ui(uiInput);
        expect(counted.subscribeCalls()).toBe(callsBefore);
        expect(
          getSpy.mock.calls.filter(([key]) => key === "narrative_conformance").length,
        ).toBe(narrativeReadsBefore + 1);
        legacyDeclaration.dispose?.();
      }

      globalThis.window.history.replaceState(
        {},
        "",
        "/?narrative_conformance=1&overlay_conformance=1",
      );
      const narrativeReadsBefore = getSpy.mock.calls.filter(
        ([key]) => key === "narrative_conformance",
      ).length;
      declaration = labGameApplicationV1.ui(uiInput);

      expect(document.body.childElementCount).toBe(0);
      expect(
        getSpy.mock.calls.filter(([key]) => key === "narrative_conformance").length,
      ).toBe(narrativeReadsBefore + 1);
      expect(counted.subscribeCalls()).toBe(1);
      expect(counted.activeSubscriptions()).toBe(1);
      declaration.dispose?.();
      declaration.dispose?.();
      expect(counted.unsubscribeCalls()).toBe(1);
      expect(counted.activeSubscriptions()).toBe(0);
      for (
        const eventType of [
          "sillymaker:engine-lab:overlay-hold-next",
          "sillymaker:engine-lab:overlay-ready",
          "sillymaker:engine-lab:overlay-fail",
        ]
      ) {
        expect(
          removeEventListenerSpy.mock.calls.filter(([type]) => type === eventType),
        ).toHaveLength(1);
      }
    } finally {
      declaration?.dispose?.();
      await original.dispose();
    }
  });

  it("fails closed on real-source creation fault and releases the pair for a fresh retry", async () => {
    const original = await createLabApplicationInstanceV1();
    const faulted = faultFirstSemanticObservationV1(original);
    const counted = countSemanticSubscriptionsV1(faulted.instance);
    const playerProfile = await createLabProfileV1();
    const reportFailure = vi.fn();
    const uiInput = createLabGameUiInputV1(counted.instance, playerProfile, reportFailure);
    globalThis.window.history.replaceState(
      {},
      "",
      "/?narrative_conformance=1&narrative_conformance=0",
    );
    const declaration = labGameApplicationV1.ui(uiInput);
    let composition: ReturnType<typeof createGameUiCompositionV1> | undefined;
    try {
      expect(faulted.observeCalls()).toBe(1);
      expect(counted.subscribeCalls()).toBe(0);
      expect(reportFailure).not.toHaveBeenCalled();

      const retry = createLabNarrativeConformanceV1({
        instance: counted.instance,
        playerProfile,
        presentationClock: createManualPresentationClockV1(),
        reportFailure: vi.fn(),
      });
      expect(retry.creation.kind).toBe("created");
      retry.dispose();
      expect(counted.subscribeCalls()).toBe(1);
      expect(counted.unsubscribeCalls()).toBe(1);

      const overlayDefinitions = declaration.overlayDefinitions;
      const slots = declaration.slots;
      if (overlayDefinitions === undefined || slots === undefined) {
        throw new TypeError("e2e.narrative_conformance_declaration_incomplete");
      }
      composition = createGameUiCompositionV1({
        semantic: counted.instance.semantic,
        projector: declaration.projector,
        anchor: Object.freeze({
          current: () => counted.instance.presentationAnchor(),
          subscribe: (listener: () => void) =>
            counted.instance.subscribePresentationAnchor(() => listener()),
        }),
        overlayDefinitions,
      });
      render(
        <DefaultGameRootV1
          composition={composition}
          semantic={counted.instance.semantic}
          accessibleName="引擎实验室"
          applicationId="e2e"
          viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
          labels={labRootLabelsV1}
          slots={slots}
        />,
      );
      expect(
        document.querySelector('[data-lab-narrative-conformance="unavailable"]'),
      ).toHaveAttribute(
        "data-lab-narrative-conformance-code",
        "narrative.conformance_creation_faulted",
      );
      expect(document.querySelector("[data-lab-player]")).toBeNull();
      expect(document.querySelector("[data-narrative-surface-render-shell]")).toBeNull();
    } finally {
      cleanup();
      composition?.dispose();
      declaration.dispose?.();
      await original.dispose();
    }
  });

  it("mounts the exact-1 application declaration as rig-only after one pre-mount subscription", async () => {
    const original = await createLabApplicationInstanceV1();
    const counted = countSemanticSubscriptionsV1(original);
    const playerProfile = await createLabProfileV1();
    const uiInput = createLabGameUiInputV1(counted.instance, playerProfile);
    globalThis.window.history.replaceState({}, "", "/?narrative_conformance=1");
    const declaration = labGameApplicationV1.ui(uiInput);
    let composition: ReturnType<typeof createGameUiCompositionV1> | undefined;
    try {
      expect(document.body.childElementCount).toBe(0);
      expect(counted.subscribeCalls()).toBe(1);
      expect(counted.activeSubscriptions()).toBe(1);
      const duplicate = createLabNarrativeConformanceV1({
        instance: counted.instance,
        playerProfile,
        presentationClock: createManualPresentationClockV1(),
        reportFailure: vi.fn(),
      });
      expect(duplicate.creation).toEqual({
        kind: "rejected",
        code: "narrative.conformance_source_claimed",
      });
      duplicate.dispose();
      expect(counted.subscribeCalls()).toBe(1);
      expect(counted.activeSubscriptions()).toBe(1);
      const overlayDefinitions = declaration.overlayDefinitions;
      const slots = declaration.slots;
      if (overlayDefinitions === undefined || slots === undefined) {
        throw new TypeError("e2e.narrative_conformance_declaration_incomplete");
      }
      composition = createGameUiCompositionV1({
        semantic: counted.instance.semantic,
        projector: declaration.projector,
        anchor: Object.freeze({
          current: () => counted.instance.presentationAnchor(),
          subscribe: (listener: () => void) =>
            counted.instance.subscribePresentationAnchor(() => listener()),
        }),
        overlayDefinitions,
      });
      render(
        <DefaultGameRootV1
          composition={composition}
          semantic={counted.instance.semantic}
          accessibleName="引擎实验室"
          applicationId="e2e"
          viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
          labels={labRootLabelsV1}
          slots={slots}
          {...(declaration.inputMaps === undefined ? {} : { inputMaps: declaration.inputMaps })}
        />,
      );
      await userEvent.setup().click(screen.getByRole("button", { name: "开始校准" }));
      await waitFor(() => {
        expect(
          document.querySelector('[data-narrative-surface-render-shell="dialogue"]'),
        ).toBeInTheDocument();
      });
      expect(document.querySelector("[data-lab-player]")).toBeNull();
      expect(
        document.querySelector('[data-lab-narrative-conformance="unavailable"]'),
      ).toBeNull();
    } finally {
      cleanup();
      composition?.dispose();
      declaration.dispose?.();
      expect(counted.unsubscribeCalls()).toBe(counted.subscribeCalls());
      expect(counted.activeSubscriptions()).toBe(0);
      await original.dispose();
    }
  });

  it("mounts the rig as the sole Narrative writer against the real Lab source", async () => {
    const instance = await createLabApplicationInstanceV1();
    const playerProfile = await createLabProfileV1();
    await playerProfile.updatePreferences({
      textRevealCharsPerSecond: 0,
      autoWaitMs: 100,
      skipPolicy: "skip_all",
    });
    const clock = createManualPresentationClockV1();
    const reportFailure = vi.fn();
    let audioHost: ReturnType<typeof createFakeAudioHostV1> | null = null;
    let gamepadConnected = false;
    const gamepadButtons = Array.from({ length: 4 }, () => ({ pressed: false }));
    const gamepad = Object.freeze({
      index: 0,
      get connected() {
        return gamepadConnected;
      },
      buttons: gamepadButtons,
    });
    const getGamepads = vi.fn(() => gamepadConnected ? [gamepad] : []);
    const getGamepadsDescriptor = Reflect.getOwnPropertyDescriptor(
      globalThis.navigator,
      "getGamepads",
    );
    const conformance = createLabNarrativeConformanceV1({
      instance,
      playerProfile,
      presentationClock: clock,
      reportFailure,
    });
    const composition = createGameUiCompositionV1({
      semantic: instance.semantic,
      projector: labUiProjectorV1,
      anchor: Object.freeze({
        current: () => instance.presentationAnchor(),
        subscribe: (listener: () => void) => instance.subscribePresentationAnchor(() => listener()),
      }),
      overlayDefinitions: labWorkspaceOverlayDefinitionsV1,
    });
    try {
      if (
        !Reflect.defineProperty(globalThis.navigator, "getGamepads", {
          configurable: true,
          value: getGamepads,
        })
      ) {
        throw new TypeError("e2e.narrative_conformance_gamepad_fixture_invalid");
      }
      expect(conformance.creation.kind).toBe("created");
      render(
        <DefaultGameRootV1
          composition={composition}
          semantic={instance.semantic}
          accessibleName="引擎实验室"
          applicationId="e2e"
          viewport={{ canvas: labViewportCanvasV1, fallbackSize: { width: 1600, height: 1000 } }}
          labels={labRootLabelsV1}
          inputMaps={{ keyboard: labKeyboardMapV1, gamepad: labGamepadMapV1 }}
          slots={createLabUiSlotsV1({
            instance,
            createAudioHost: () => {
              const host = createFakeAudioHostV1();
              audioHost = host;
              return host;
            },
            playerProfile,
            playerClock: clock,
            narrativeConformance: conformance,
          })}
        />,
      );

      await userEvent.setup().click(screen.getByRole("button", { name: "开始校准" }));
      const dialogueShell = await waitFor(() => {
        const shell = document.querySelector<HTMLElement>(
          '[data-narrative-surface-render-shell="dialogue"]',
        );
        expect(shell).toBeInTheDocument();
        return shell!;
      });
      expect(document.querySelector("[data-lab-player]")).toBeNull();
      const firstOccurrence = instance.semantic.observe().narrative.pending?.occurrenceId;
      expect(firstOccurrence).toBeDefined();

      const user = userEvent.setup();
      const commandsBeforePhysicalActions = instance.admin.commandLog().length;
      await waitFor(() => {
        expect(audioHost?.channel("voice")?.assetId).toBe("audio.e2e.voice.cal-intro");
      });
      const voicePlaysBeforeReplay = audioHost!.operations().filter((operation) =>
        operation.startsWith("play:voice:")
      ).length;
      const voiceReplay = dialogueShell.querySelector<HTMLButtonElement>(
        '[data-narrative-conformance-voice="true"]',
      );
      expect(voiceReplay).not.toBeNull();
      voiceReplay!.click();
      await waitFor(() => {
        expect(
          audioHost!.operations().filter((operation) => operation.startsWith("play:voice:")),
        ).toHaveLength(voicePlaysBeforeReplay + 1);
      });
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforePhysicalActions);
      const auto = dialogueShell.querySelector<HTMLButtonElement>(
        '[data-narrative-conformance-auto="true"]',
      );
      expect(auto).not.toBeNull();
      auto!.click();
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforePhysicalActions);
      await waitFor(() => expect(clock.pendingTickCount()).toBe(1));
      await act(async () => {
        clock.advance(100);
        await Promise.resolve();
      });
      await waitFor(() => {
        expect(instance.semantic.observe().narrative.history.entries).toHaveLength(1);
        expect(instance.semantic.observe().narrative.pending?.occurrenceId).not.toBe(
          firstOccurrence,
        );
      });
      await waitFor(() => {
        expect(playerProfile.current().seen["interaction.e2e.cal-intro"]).toBe(1);
      });
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforePhysicalActions + 1);

      const historyOpener = document.querySelector<HTMLButtonElement>(
        '[data-dialogue-history-open="true"]',
      );
      expect(historyOpener).not.toBeNull();
      await user.click(historyOpener!);
      await waitFor(() => {
        expect(
          document.querySelector('[data-narrative-surface-render-shell="history"]'),
        ).toBeInTheDocument();
        expect(document.querySelector('[data-dialogue-history="true"]')).toHaveTextContent(
          "需要校准信标，请跟我来。",
        );
      });
      pressV1("KeyH");
      await waitFor(() => {
        expect(
          document.querySelector('[data-narrative-surface-render-shell="history"]'),
        ).toBeNull();
        expect(
          document.querySelector('[data-narrative-surface-render-shell="dialogue"]'),
        ).toBeInTheDocument();
      });
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforePhysicalActions + 1);

      const secondAuto = await waitFor(() => {
        const button = document.querySelector<HTMLButtonElement>(
          '[data-narrative-conformance-auto="true"]',
        );
        expect(button).not.toBeNull();
        return button!;
      });
      secondAuto.click();
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforePhysicalActions + 1);
      const skip = document.querySelector<HTMLButtonElement>(
        '[data-narrative-conformance-skip="true"]',
      );
      expect(skip).not.toBeNull();
      skip!.click();
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforePhysicalActions + 1);
      await waitFor(() => expect(clock.pendingTickCount()).toBe(1));
      await act(async () => {
        clock.advance(1_000);
        await Promise.resolve();
      });
      const basicChoice = await waitFor(() => {
        const button = document.querySelector<HTMLButtonElement>(
          '[data-narrative-conformance-choice="choice.e2e.cal.basic"]',
        );
        expect(button).not.toBeNull();
        return button!;
      });
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforePhysicalActions + 2);
      await act(async () => {
        clock.advance(10_000);
        await Promise.resolve();
      });
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforePhysicalActions + 2);
      const commandsBeforeChoice = instance.admin.commandLog().length;
      basicChoice.click();
      await waitFor(() => {
        expect(instance.admin.commandLog()).toHaveLength(commandsBeforeChoice + 1);
      });
      const resume = await waitFor(
        () => {
          const button = document.querySelector<HTMLButtonElement>(
            '[data-narrative-conformance-resume="true"]',
          );
          expect(button).not.toBeNull();
          return button!;
        },
        { timeout: 4_000 },
      );
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforeChoice + 2);
      resume.click();

      const customForm = await waitFor(() => {
        const form = document.querySelector<HTMLFormElement>(
          '[data-narrative-conformance-custom="surface.e2e.calibration"]',
        );
        expect(form).not.toBeNull();
        return form!;
      });
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforeChoice + 3);
      expect(
        JSON.parse(
          customForm.querySelector("[data-narrative-conformance-custom-params]")
            ?.textContent ?? "",
        ),
      ).toEqual({ min: 1, max: 3 });
      const customPayload = customForm.querySelector<HTMLTextAreaElement>(
        "[data-narrative-conformance-custom-payload]",
      );
      expect(customPayload).not.toBeNull();
      expect(customPayload).toHaveValue("{}");
      const commandsBeforeCustom = instance.admin.commandLog().length;
      fireEvent.change(customPayload!, { target: { value: '{"value":2}' } });
      fireEvent.submit(customForm);
      await waitFor(() => {
        expect(instance.semantic.observe().narrative).toMatchObject({
          calibration: 2,
          pending: { kind: "say", definitionId: "interaction.e2e.cal-done" },
        });
      });
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforeCustom + 1);

      const pollsBeforeConnection = getGamepads.mock.calls.length;
      gamepadConnected = true;
      globalThis.window.dispatchEvent(new globalThis.window.Event("gamepadconnected"));
      await waitFor(() => {
        expect(getGamepads.mock.calls.length).toBeGreaterThan(pollsBeforeConnection);
      });
      const commandsBeforeGamepad = instance.admin.commandLog().length;
      gamepadButtons[0]!.pressed = true;
      await waitFor(() => {
        expect(instance.semantic.observe().narrative).toMatchObject({
          phase: "completed",
          calibration: 2,
          pending: null,
        });
      });
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforeGamepad + 1);
      const pollsAtResolution = getGamepads.mock.calls.length;
      await waitFor(() => {
        expect(getGamepads.mock.calls.length).toBeGreaterThan(pollsAtResolution + 1);
      });
      expect(instance.admin.commandLog()).toHaveLength(commandsBeforeGamepad + 1);
      expect(document.querySelector("[data-lab-player]")).toBeNull();
      expect(reportFailure).not.toHaveBeenCalled();
    } finally {
      cleanup();
      if (getGamepadsDescriptor === undefined) {
        Reflect.deleteProperty(globalThis.navigator, "getGamepads");
      } else {
        Reflect.defineProperty(globalThis.navigator, "getGamepads", getGamepadsDescriptor);
      }
      composition.dispose();
      conformance.dispose();
      expect(clock.pendingTickCount()).toBe(0);
      await instance.dispose();
    }
  }, 15_000);
});
