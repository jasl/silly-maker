// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  emptyNarrativeHistoryV1,
  parseNonNegativeSafeInteger,
  parsePendingInteractionV1,
  type PendingInteractionV1,
  type PersistenceOperationResultV1,
} from "@sillymaker/base";
import { defaultPlayerProfileV1 } from "@sillymaker/base/runtime";
import type { CoreRollbackPortV1 } from "@sillymaker/base/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";

import { playerInputActionIdsV1, systemInputActionIdsV1 } from "../input/contracts.ts";
import type { HeldInputPortV1, HeldInputStateV1 } from "../input/held-key-adapter.ts";
import { InputContextProviderV1 } from "../input/input-context.tsx";
import { createInputRouterV1 } from "../input/input-router.ts";
import {
  PlayerSystemControllerProviderInternalV1,
  type PlayerSystemControllerInternalV1,
} from "../system/player-system-controller-internal.tsx";
import type {
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryRendererPropsV1,
  NarrativeSurfaceRendererPropsV1,
} from "../narrative/narrative-surface-composition.tsx";
import {
  createDefaultVnPlayerV1,
  type CreateDefaultVnPlayerInputV1,
} from "./default-vn-player.tsx";
import { createDefaultVnPlayerCoreV1 } from "./core.ts";

afterEach(cleanup);

function sayPendingV1(sequence = 1): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "say",
    definitionId: "narrative.test.say",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    speakerTextId: "text.test.speaker",
    textId: "text.test.line",
    advancePolicy: "confirm",
  });
}

function choicePendingV1(sequence = 2): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "choice",
    definitionId: "narrative.test.choice",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    promptTextId: "text.test.prompt",
    options: [
      { choiceId: "choice.test.wait", textId: "text.test.wait" },
      { choiceId: "choice.test.go", textId: "text.test.go" },
    ],
  });
}

function callbacksV1() {
  return {
    onActivate: vi.fn(),
    onChoose: vi.fn(),
    onResume: vi.fn(),
    onSubmitCustom: vi.fn(),
    onToggleAuto: vi.fn(),
    onToggleSkip: vi.fn(),
    onOpenHistory: vi.fn(),
    onReplayVoice: vi.fn(),
  };
}

type DialogueCallbacksV1 = ReturnType<typeof callbacksV1>;

const textV1 = (textId: string): string =>
  ({
    "text.test.speaker": "Mina",
    "text.test.line": "The signal is clear.",
    "text.test.prompt": "Where next?",
    "text.test.wait": "Wait here",
    "text.test.go": "Go outside",
    "text.test.locked": "The door is locked",
  })[textId] ?? textId;

function dialoguePropsV1(input: {
  readonly pending?: PendingInteractionV1;
  readonly playbackMode?: "normal" | "auto" | "skip";
  readonly phase?: "preparing" | "active" | "suspended";
  readonly callbacks?: DialogueCallbacksV1;
  readonly choiceAvailability?: NarrativeSurfaceDialogueRendererPropsV1["choiceAvailability"];
  readonly historyAvailable?: boolean;
  readonly voiceReplayAvailable?: boolean;
} = {}): NarrativeSurfaceDialogueRendererPropsV1 {
  const pending = input.pending ?? sayPendingV1();
  const callbacks = input.callbacks ?? callbacksV1();
  const { onOpenHistory, ...dialogueCallbacks } = callbacks;
  return {
    kind: "dialogue",
    pending,
    choiceAvailability: input.choiceAvailability ?? null,
    history: {
      available: input.historyAvailable ?? true,
      onOpen: onOpenHistory,
    },
    voiceReplayAvailable: input.voiceReplayAvailable ?? false,
    playerProfile: defaultPlayerProfileV1,
    playerView: pending.kind === "say"
      ? {
        kind: "say",
        phase: input.phase ?? "active",
        playbackMode: input.playbackMode ?? "normal",
        resolvedSpeakerText: "Mina",
        resolvedText: "The signal is clear.",
        revealedCharacters: 20,
        revealLength: 20,
        revealComplete: true,
      }
      : { kind: "passive", phase: input.phase ?? "active", playbackMode: "normal" },
    resolveText: textV1,
    ...dialogueCallbacks,
  };
}

function historyPropsV1(
  onCloseHistory = vi.fn(),
  entries: NarrativeSurfaceHistoryRendererPropsV1["history"]["entries"] = [],
): NarrativeSurfaceHistoryRendererPropsV1 {
  return {
    kind: "history",
    history: { entries },
    playerProfile: defaultPlayerProfileV1,
    resolveText: textV1,
    onCloseHistory,
  };
}

function withPlaybackModeV1(
  props: NarrativeSurfaceDialogueRendererPropsV1,
  playbackMode: "normal" | "auto" | "skip",
): NarrativeSurfaceDialogueRendererPropsV1 {
  if (props.playerView.kind !== "say") throw new TypeError("expected say player view");
  return { ...props, playerView: { ...props.playerView, playbackMode } };
}

function createHeldInputHarnessV1() {
  let current: HeldInputStateV1 = { heldActionIds: new Set() };
  const listeners = new Set<() => void>();
  const port: HeldInputPortV1 = {
    state: {
      getCurrent: () => current,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
  };
  return {
    port,
    setHeld(held: boolean): void {
      current = {
        heldActionIds: held ? new Set([playerInputActionIdsV1.fastForward]) : new Set(),
      };
      for (const listener of listeners) listener();
    },
  };
}

function createRollbackHarnessV1(input: {
  readonly steps?: number;
  readonly forwardSteps?: number;
} = {}) {
  let steps = input.steps ?? 0;
  let forwardSteps = input.forwardSteps ?? 0;
  const listeners = new Set<() => void>();
  const toPrevious = vi.fn(async () => ({
    kind: "rejected" as const,
    code: "rollback_unavailable" as const,
  }));
  const toNext = vi.fn(async () => ({
    kind: "rejected" as const,
    code: "rollforward_unavailable" as const,
  }));
  const port: CoreRollbackPortV1 = {
    available: () => ({
      steps: parseNonNegativeSafeInteger(steps),
      forwardSteps: parseNonNegativeSafeInteger(forwardSteps),
    }),
    toPrevious,
    toNext,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    port,
    toPrevious,
    toNext,
    setAvailable(next: { readonly steps: number; readonly forwardSteps: number }): void {
      steps = next.steps;
      forwardSteps = next.forwardSteps;
      for (const listener of listeners) listener();
    },
  };
}

function createPlayerV1(input: Partial<CreateDefaultVnPlayerInputV1> = {}) {
  return createDefaultVnPlayerV1({
    heldInput: input.heldInput ?? createHeldInputHarnessV1().port,
    rollback: input.rollback ?? createRollbackHarnessV1().port,
    ...(input.labelTextIds === undefined ? {} : { labelTextIds: input.labelTextIds }),
  });
}

function createPlayerSystemControllerHarnessV1(input: {
  readonly savesAvailable?: boolean;
  readonly quickSaveResult?:
    | { readonly kind: "saved"; readonly slotId: "quick" }
    | { readonly kind: "guarded"; readonly reasonText?: string };
  readonly quickLoadResult?: PersistenceOperationResultV1;
  readonly quickAvailable?: boolean;
} = {}) {
  const quickAvailable = input.quickAvailable ?? true;
  const quickSave = vi.fn(async () =>
    input.quickSaveResult ?? ({ kind: "saved" as const, slotId: "quick" as const })
  );
  const quickLoad = vi.fn(async () =>
    input.quickLoadResult ?? ({
      kind: "loaded" as const,
      compatibility: "exact" as const,
      commandSequence: parseNonNegativeSafeInteger(0),
    })
  );
  const openSettings = vi.fn(() => ({
    kind: "preparing" as const,
    code: "system_dialog.preparation_started" as const,
  }));
  const openSaves = vi.fn(() => ({
    kind: "preparing" as const,
    code: "system_dialog.preparation_started" as const,
  }));
  const returnToTitle = vi.fn(async () => {});
  return {
    controller: {
      savesAvailable: input.savesAvailable ?? true,
      quickSave: quickAvailable ? quickSave : null,
      quickLoad: quickAvailable ? quickLoad : null,
      openSettings,
      openSaves,
      returnToTitle,
    } satisfies PlayerSystemControllerInternalV1,
    quickSave,
    quickLoad,
    openSettings,
    openSaves,
    returnToTitle,
  };
}

function renderPlayerV1(input: {
  readonly player: ReturnType<typeof createDefaultVnPlayerV1>;
  readonly props: NarrativeSurfaceRendererPropsV1;
  readonly router?: ReturnType<typeof createInputRouterV1>;
  readonly systemController?: PlayerSystemControllerInternalV1;
}) {
  const router = input.router ?? createInputRouterV1();
  const DialogueRenderer = input.player.renderer;
  const HistoryRenderer = input.player.history.renderer;
  const element = (props: NarrativeSurfaceRendererPropsV1) => (
    <PlayerSystemControllerProviderInternalV1
      controller={input.systemController ?? {
        savesAvailable: false,
        quickSave: null,
        quickLoad: null,
        openSettings: () => ({
          kind: "rejected",
          code: "system_dialog.renderer_unavailable",
        }),
        openSaves: () => ({
          kind: "rejected",
          code: "system_dialog.renderer_unavailable",
        }),
        returnToTitle: async () => {},
      }}
    >
      <InputContextProviderV1 router={router}>
        <main data-narrative-surface-focus-scope="dialogue" tabIndex={-1}>
          {props.kind === "history"
            ? <HistoryRenderer {...props} />
            : <DialogueRenderer {...props} />}
        </main>
      </InputContextProviderV1>
    </PlayerSystemControllerProviderInternalV1>
  );
  const view = render(element(input.props));
  return {
    router,
    scope: view.container.querySelector<HTMLElement>("[data-narrative-surface-focus-scope]")!,
    rerender: (props: NarrativeSurfaceRendererPropsV1) => view.rerender(element(props)),
    unmount: view.unmount,
  };
}

describe("createDefaultVnPlayerCoreV1", () => {
  it("renders the cohesive Player without importing or exposing a History control", () => {
    const router = createInputRouterV1();
    const player = createDefaultVnPlayerCoreV1({
      heldInput: createHeldInputHarnessV1().port,
      rollback: createRollbackHarnessV1().port,
    });
    const Renderer = player.renderer;
    render(
      <PlayerSystemControllerProviderInternalV1
        controller={createPlayerSystemControllerHarnessV1().controller}
      >
        <InputContextProviderV1 router={router}>
          <main data-narrative-surface-focus-scope="dialogue" tabIndex={-1}>
            <Renderer {...dialoguePropsV1()} history={null} />
          </main>
        </InputContextProviderV1>
      </PlayerSystemControllerProviderInternalV1>,
    );

    expect(screen.getByRole("button", { name: "Auto" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "History" })).toBeNull();
    expect(document.querySelector("[data-dialogue-history-open='true']")).toBeNull();
  });

  it("renders one explicitly selected auxiliary playback capability", () => {
    const router = createInputRouterV1();
    const player = createDefaultVnPlayerCoreV1({
      heldInput: createHeldInputHarnessV1().port,
      rollback: createRollbackHarnessV1().port,
      renderAuxiliaryPlaybackControl: () => <button type="button">Optional tool</button>,
    });
    const Renderer = player.renderer;
    render(
      <PlayerSystemControllerProviderInternalV1
        controller={createPlayerSystemControllerHarnessV1().controller}
      >
        <InputContextProviderV1 router={router}>
          <main data-narrative-surface-focus-scope="dialogue" tabIndex={-1}>
            <Renderer {...dialoguePropsV1()} />
          </main>
        </InputContextProviderV1>
      </PlayerSystemControllerProviderInternalV1>,
    );

    expect(screen.getByRole("button", { name: "Optional tool" })).toBeVisible();
  });
});

describe("createDefaultVnPlayerV1", () => {
  it("returns conventional VN input defaults and resolves product-owned label text IDs", () => {
    const held = createHeldInputHarnessV1();
    const player = createPlayerV1({
      heldInput: held.port,
      labelTextIds: {
        advance: "label.advance",
        playbackControls: "label.playback",
        back: "label.back",
        forward: "label.forward",
        history: "label.history",
        voice: "label.voice",
        skip: "label.skip",
        auto: "label.auto",
        historyTitle: "label.history-title",
        historyEmpty: "label.history-empty",
        historyClose: "label.history-close",
      },
    });
    expect(player.input).toEqual({
      keyboard: {
        Escape: systemInputActionIdsV1.cancel,
        Enter: systemInputActionIdsV1.narrativeAdvance,
        KeyH: playerInputActionIdsV1.toggleUi,
        KeyV: playerInputActionIdsV1.replayVoice,
        PageDown: playerInputActionIdsV1.rollForward,
        PageUp: playerInputActionIdsV1.rollback,
        Space: systemInputActionIdsV1.narrativeAdvance,
        Tab: playerInputActionIdsV1.toggleSkip,
      },
      held: { Control: playerInputActionIdsV1.fastForward },
      pointer: {
        secondary: systemInputActionIdsV1.cancel,
        middle: playerInputActionIdsV1.toggleUi,
        wheelDown: playerInputActionIdsV1.rollForward,
        wheelUp: playerInputActionIdsV1.rollback,
      },
    });

    const props = {
      ...dialoguePropsV1(),
      resolveText: (textId: string) =>
        ({
          "label.advance": "下一句",
          "label.playback": "播放控制",
          "label.back": "回退",
          "label.forward": "前进",
          "label.history": "回想",
          "label.voice": "语音",
          "label.skip": "快进",
          "label.auto": "自动",
        })[textId] ?? textV1(textId),
      voiceReplayAvailable: true,
    } satisfies NarrativeSurfaceDialogueRendererPropsV1;
    renderPlayerV1({ player, props });

    expect(screen.getByRole("button", { name: "下一句" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "播放控制" })).toBeVisible();
    expect(screen.getByRole("button", { name: "回退" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "前进" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "回想" })).toBeVisible();
    expect(screen.getByRole("button", { name: "语音" })).toBeVisible();
    expect(screen.getByRole("button", { name: "快进" })).toBeVisible();
    expect(screen.getByRole("button", { name: "自动" })).toBeVisible();
    expect(playerInputActionIdsV1.rollback).toBe("player.rollback");
    expect(playerInputActionIdsV1.rollForward).toBe("player.roll_forward");
  });

  it("advances only a Say from the full canvas and returns pointer focus to Narrative", async () => {
    const callbacks = callbacksV1();
    const player = createPlayerV1();
    const view = renderPlayerV1({ player, props: dialoguePropsV1({ callbacks }) });

    await userEvent.setup().click(screen.getByRole("button", { name: "Continue" }));

    expect(callbacks.onActivate).toHaveBeenCalledTimes(1);
    expect(view.scope).toHaveFocus();
  });

  it("owns a layered VN menu over the active dialogue and delegates root services", async () => {
    const system = createPlayerSystemControllerHarnessV1();
    const player = createPlayerV1();
    const view = renderPlayerV1({
      player,
      props: dialoguePropsV1(),
      systemController: system.controller,
    });
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute(
      "data-secondary-action",
      systemInputActionIdsV1.cancel,
    );
    view.scope.focus();
    act(() => {
      expect(view.router.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }))
        .toEqual({ kind: "handled", context: "narrative" });
    });

    const menu = screen.getByRole("dialog", { name: "Menu" });
    expect(menu).toBeVisible();
    expect(view.scope.querySelector("[inert]")).not.toBeNull();
    const resume = screen.getByRole("button", { name: "Return" });
    const mainMenu = screen.getByRole("button", { name: "Main Menu" });
    expect(resume).toHaveFocus();
    mainMenu.focus();
    fireEvent.keyDown(mainMenu, { key: "Tab" });
    expect(resume).toHaveFocus();
    fireEvent.keyDown(resume, { key: "Tab", shiftKey: true });
    expect(mainMenu).toHaveFocus();

    fireEvent.keyDown(mainMenu, { key: "Escape" });
    await waitFor(() => expect(view.scope).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "Menu" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Save / Load" }));
    expect(system.openSaves).toHaveBeenCalledExactlyOnceWith();
    expect(screen.queryByRole("dialog", { name: "Menu" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Preferences" }));
    expect(system.openSettings).toHaveBeenCalledExactlyOnceWith();

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("button", { name: "Main Menu" }));
    await waitFor(() => expect(system.returnToTitle).toHaveBeenCalledExactlyOnceWith());
  });

  it("quick-saves from Choice and confirms quick-load without duplicating the Save root", async () => {
    const system = createPlayerSystemControllerHarnessV1();
    const player = createPlayerV1();
    const view = renderPlayerV1({
      player,
      props: dialoguePropsV1({ pending: choicePendingV1() }),
      systemController: system.controller,
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Q.Save" }));
    await waitFor(() => expect(system.quickSave).toHaveBeenCalledExactlyOnceWith());
    expect(screen.getByRole("status")).toHaveTextContent("Quick save complete.");

    await user.click(screen.getByRole("button", { name: "Q.Load" }));
    expect(system.quickLoad).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Q.Load" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Load" }));
    await waitFor(() => expect(system.quickLoad).toHaveBeenCalledExactlyOnceWith());
    expect(screen.queryByRole("dialog", { name: "Q.Load" })).toBeNull();

    view.rerender(dialoguePropsV1({ pending: choicePendingV1(4) }));
    expect(screen.getAllByRole("button", { name: "Save / Load" })).toHaveLength(1);
  });

  it("shows real quick-save guard and empty-slot feedback", async () => {
    const guarded = createPlayerSystemControllerHarnessV1({
      quickSaveResult: { kind: "guarded", reasonText: "Wait for the current transition." },
      quickLoadResult: { kind: "rejected", code: "empty_slot" },
    });
    const player = createPlayerV1();
    renderPlayerV1({
      player,
      props: dialoguePropsV1({ pending: choicePendingV1() }),
      systemController: guarded.controller,
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Q.Save" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Wait for the current transition.",
    );
    await user.click(screen.getByRole("button", { name: "Q.Load" }));
    await user.click(screen.getByRole("button", { name: "Load" }));
    expect(await screen.findByRole("status")).toHaveTextContent("No quick save exists.");
    expect(screen.getByRole("dialog", { name: "Q.Load" })).toBeVisible();
  });

  it.each([
    { kind: "rejected", code: "unavailable" } as const,
    { kind: "faulted", code: "persistence.test" } as const,
  ])("reports %s quick-load failures as operation failures", async (quickLoadResult) => {
    const failed = createPlayerSystemControllerHarnessV1({ quickLoadResult });
    const player = createPlayerV1();
    renderPlayerV1({
      player,
      props: dialoguePropsV1({ pending: choicePendingV1() }),
      systemController: failed.controller,
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Q.Load" }));
    await user.click(screen.getByRole("button", { name: "Load" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "The operation could not be completed.",
    );
    expect(screen.getByRole("dialog", { name: "Q.Load" })).toBeVisible();
  });

  it("keeps custom Saves available without inventing quick operations", () => {
    const system = createPlayerSystemControllerHarnessV1({
      quickAvailable: false,
      savesAvailable: true,
    });
    const player = createPlayerV1();
    renderPlayerV1({
      player,
      props: dialoguePropsV1(),
      systemController: system.controller,
    });

    expect(screen.getByRole("button", { name: "Save / Load" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Q.Save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Q.Load" })).toBeNull();
  });

  it("drains playback and lets only the active dialogue own cancel-to-menu", () => {
    const callbacks = callbacksV1();
    const system = createPlayerSystemControllerHarnessV1();
    const router = createInputRouterV1();
    const player = createPlayerV1();
    const auto = dialoguePropsV1({ playbackMode: "auto", callbacks });
    const view = renderPlayerV1({
      player,
      props: auto,
      router,
      systemController: system.controller,
    });

    act(() => {
      expect(router.route({ kind: "action", actionId: systemInputActionIdsV1.cancel }))
        .toEqual({ kind: "handled", context: "narrative" });
    });
    expect(callbacks.onToggleAuto).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Menu" })).toBeNull();
    view.rerender(withPlaybackModeV1(auto, "normal"));
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeVisible();

    act(() => {
      router.route({ kind: "action", actionId: systemInputActionIdsV1.cancel });
    });
    view.rerender(dialoguePropsV1({ phase: "preparing" }));
    expect(router.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
      kind: "ignored",
    });
    view.rerender(historyPropsV1());
    expect(router.route({ kind: "action", actionId: systemInputActionIdsV1.cancel })).toEqual({
      kind: "ignored",
    });
  });

  it("replays the current Say voice from the default playback bar and restores focus", async () => {
    const callbacks = callbacksV1();
    const player = createPlayerV1();
    const view = renderPlayerV1({
      player,
      props: dialoguePropsV1({ callbacks, voiceReplayAvailable: true }),
    });

    await userEvent.setup().click(screen.getByRole("button", { name: "Voice" }));

    expect(callbacks.onReplayVoice).toHaveBeenCalledTimes(1);
    expect(callbacks.onActivate).not.toHaveBeenCalled();
    expect(view.scope).toHaveFocus();

    view.rerender(dialoguePropsV1({ pending: choicePendingV1(), callbacks }));
    expect(screen.queryByRole("button", { name: "Voice" })).toBeNull();
  });

  it("omits voice replay when the current Say has no replayable voice", () => {
    const player = createPlayerV1();
    renderPlayerV1({ player, props: dialoguePropsV1() });

    expect(screen.queryByRole("button", { name: "Voice" })).toBeNull();
  });

  it("disables History until the Host reports a committed entry and routes the full preset", async () => {
    const callbacks = callbacksV1();
    const player = createPlayerV1();
    const view = renderPlayerV1({
      player,
      props: dialoguePropsV1({ historyAvailable: false, callbacks }),
    });

    expect(screen.getByRole("button", { name: "History" })).toBeDisabled();

    view.rerender(dialoguePropsV1({ historyAvailable: true, callbacks }));
    const history = screen.getByRole("button", { name: "History" });
    expect(history).toBeEnabled();
    await userEvent.setup().click(history);
    expect(callbacks.onOpenHistory).toHaveBeenCalledExactlyOnceWith();
    expect(callbacks.onActivate).not.toHaveBeenCalled();
  });

  it("renders Choice availability without a full-canvas advance surface", async () => {
    const callbacks = callbacksV1();
    const player = createPlayerV1();
    const view = renderPlayerV1({
      player,
      props: dialoguePropsV1({
        pending: choicePendingV1(),
        callbacks,
        choiceAvailability: [
          {
            choiceId: "choice.test.wait",
            status: "disabled",
            reasonTextIds: ["text.test.locked"],
          },
          { choiceId: "choice.test.go", status: "enabled", reasonTextIds: [] },
        ],
      }),
    });

    expect(view.scope.querySelector("[data-dialogue-advance]")).toBeNull();
    const wait = screen.getByRole("button", { name: "Wait here" });
    expect(wait).toBeDisabled();
    expect(screen.getByText("The door is locked")).toBeVisible();
    await userEvent.setup().click(wait);
    expect(callbacks.onChoose).not.toHaveBeenCalled();

    await userEvent.setup().click(screen.getByRole("button", { name: "Go outside" }));
    expect(callbacks.onChoose).toHaveBeenCalledWith("choice.test.go");
  });

  it("offers live Back and Forward controls on Say and Choice", async () => {
    const rollback = createRollbackHarnessV1({ steps: 1 });
    const player = createPlayerV1({ rollback: rollback.port });
    const view = renderPlayerV1({ player, props: dialoguePropsV1() });

    const back = screen.getByRole("button", { name: "Back" });
    const forward = screen.getByRole("button", { name: "Forward" });
    expect(back).toBeEnabled();
    expect(forward).toBeDisabled();
    await userEvent.setup().click(back);
    expect(rollback.toPrevious).toHaveBeenCalledExactlyOnceWith();
    expect(view.scope).toHaveFocus();

    act(() => rollback.setAvailable({ steps: 0, forwardSteps: 2 }));
    expect(back).toBeDisabled();
    expect(forward).toBeEnabled();
    await userEvent.setup().click(forward);
    expect(rollback.toNext).toHaveBeenCalledExactlyOnceWith();

    view.rerender(dialoguePropsV1({ pending: choicePendingV1() }));
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Forward" })).toBeEnabled();
  });

  it("routes rollback only for visible dialogue, leaving History and hidden mode alone", () => {
    const rollback = createRollbackHarnessV1({ steps: 1, forwardSteps: 1 });
    const router = createInputRouterV1();
    const player = createPlayerV1({ rollback: rollback.port });
    const view = renderPlayerV1({ player, props: historyPropsV1(), router });
    const goBack = (): ReturnType<typeof router.route> =>
      router.route({ kind: "action", actionId: playerInputActionIdsV1.rollback });
    const goForward = (): ReturnType<typeof router.route> =>
      router.route({ kind: "action", actionId: playerInputActionIdsV1.rollForward });

    expect(goBack()).toEqual({ kind: "ignored" });
    expect(goForward()).toEqual({ kind: "ignored" });

    view.rerender(dialoguePropsV1());
    expect(goBack()).toEqual({ kind: "handled", context: "narrative" });
    expect(goForward()).toEqual({ kind: "handled", context: "narrative" });
    expect(rollback.toPrevious).toHaveBeenCalledTimes(1);
    expect(rollback.toNext).toHaveBeenCalledTimes(1);

    act(() => {
      expect(router.route({ kind: "action", actionId: playerInputActionIdsV1.toggleUi }))
        .toEqual({ kind: "handled", context: "narrative" });
    });
    expect(view.scope.querySelector("[data-dialogue-chrome-hidden='true']")).not.toBeNull();
    expect(goBack()).toEqual({ kind: "ignored" });
    expect(goForward()).toEqual({ kind: "ignored" });
    expect(rollback.toPrevious).toHaveBeenCalledTimes(1);
    expect(rollback.toNext).toHaveBeenCalledTimes(1);
  });

  it("shows resolved History entries and closes the panel", async () => {
    const onCloseHistory = vi.fn();
    const player = createPlayerV1({
      labelTextIds: {
        historyTitle: "label.history-title",
        historyClose: "label.history-close",
        historyEmpty: "label.history-empty",
      },
    });
    const props = {
      ...historyPropsV1(onCloseHistory, [{
        kind: "say",
        occurrenceId: "interaction-occurrence.8",
        definitionId: "narrative.test.say",
        seenRevision: 1,
        speakerTextId: "text.test.speaker",
        textId: "text.test.line",
        voiceAssetId: null,
      }]),
      resolveText: (textId: string) =>
        ({
          "label.history-title": "对话回想",
          "label.history-close": "关闭回想",
          "label.history-empty": "还没有对话",
        })[textId] ?? textV1(textId),
    } satisfies NarrativeSurfaceHistoryRendererPropsV1;
    const view = renderPlayerV1({ player, props });

    expect(screen.getByRole("heading", { name: "对话回想" })).toBeVisible();
    expect(screen.getByText("Mina")).toBeVisible();
    expect(screen.getByText("The signal is clear.")).toBeVisible();
    await userEvent.setup().click(
      view.scope.querySelector<HTMLButtonElement>("[data-dialogue-history-close]")!,
    );
    expect(onCloseHistory).toHaveBeenCalledTimes(1);

    view.rerender({ ...props, history: emptyNarrativeHistoryV1 });
    expect(screen.getByText("还没有对话")).toBeVisible();
  });

  it("drains Skip and resumed Auto before H hides chrome, then restores in place", () => {
    const callbacks = callbacksV1();
    const router = createInputRouterV1();
    const player = createPlayerV1({
      labelTextIds: { showUi: "label.show-ui" },
    });
    const props = {
      ...dialoguePropsV1({ playbackMode: "skip", callbacks }),
      resolveText: (textId: string) => textId === "label.show-ui" ? "显示对话界面" : textV1(textId),
    } satisfies NarrativeSurfaceDialogueRendererPropsV1;
    const view = renderPlayerV1({ player, props, router });

    act(() => {
      expect(router.route({ kind: "action", actionId: playerInputActionIdsV1.toggleUi }))
        .toEqual({ kind: "handled", context: "narrative" });
    });
    expect(callbacks.onToggleSkip).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "显示对话界面" })).toBeNull();

    view.rerender(withPlaybackModeV1(props, "auto"));
    expect(callbacks.onToggleAuto).toHaveBeenCalledTimes(1);
    view.rerender(withPlaybackModeV1(props, "normal"));

    const restore = screen.getByRole("button", { name: "显示对话界面" });
    expect(restore).toHaveFocus();
    fireEvent.keyDown(restore, { code: "KeyH" });
    expect(screen.getByText("The signal is clear.")).toBeVisible();
    expect(view.scope).toHaveFocus();
    expect(callbacks.onActivate).not.toHaveBeenCalled();

    act(() => {
      expect(router.route({ kind: "action", actionId: playerInputActionIdsV1.toggleUi }))
        .toEqual({ kind: "handled", context: "narrative" });
    });
    expect(screen.getByRole("button", { name: "显示对话界面" })).toBeVisible();
    act(() => {
      expect(router.route({ kind: "action", actionId: playerInputActionIdsV1.toggleUi }))
        .toEqual({ kind: "handled", context: "narrative" });
    });
    expect(screen.getByText("The signal is clear.")).toBeVisible();
  });

  it("lets one held Ctrl own Skip start and stop without crossing a stopped boundary", () => {
    const held = createHeldInputHarnessV1();
    const callbacks = callbacksV1();
    const player = createPlayerV1({ heldInput: held.port });
    const normal = dialoguePropsV1({ callbacks });
    const view = renderPlayerV1({ player, props: normal });

    act(() => held.setHeld(true));
    expect(callbacks.onToggleSkip).toHaveBeenCalledTimes(1);
    view.rerender(withPlaybackModeV1(normal, "skip"));
    act(() => held.setHeld(false));
    expect(callbacks.onToggleSkip).toHaveBeenCalledTimes(2);
    view.rerender(normal);

    act(() => held.setHeld(true));
    expect(callbacks.onToggleSkip).toHaveBeenCalledTimes(3);
    view.rerender(withPlaybackModeV1(normal, "skip"));
    view.rerender(normal);
    act(() => held.setHeld(false));
    expect(callbacks.onToggleSkip).toHaveBeenCalledTimes(3);
  });

  it("carries a stopping hide through successor handoff, then clears hidden after a root gap", async () => {
    const callbacks = callbacksV1();
    const router = createInputRouterV1();
    const player = createPlayerV1();
    const firstProps = dialoguePropsV1({ playbackMode: "skip", callbacks });
    const first = renderPlayerV1({ player, props: firstProps, router });

    act(() => {
      first.router.route({ kind: "action", actionId: playerInputActionIdsV1.toggleUi });
    });
    expect(callbacks.onToggleSkip).toHaveBeenCalledTimes(1);
    expect(first.scope.querySelector("[data-dialogue-chrome-hidden='true']")).toBeNull();
    first.unmount();

    const successorProps = dialoguePropsV1({
      pending: sayPendingV1(9),
      playbackMode: "auto",
      callbacks,
    });
    const second = renderPlayerV1({ player, props: successorProps, router });
    expect(callbacks.onToggleAuto).toHaveBeenCalledTimes(1);
    second.rerender(withPlaybackModeV1(successorProps, "normal"));
    expect(second.scope.querySelector("[data-dialogue-chrome-hidden='true']")).not.toBeNull();
    second.unmount();

    await act(async () => await new Promise<void>((resolve) => queueMicrotask(resolve)));
    const third = renderPlayerV1({ player, props: withPlaybackModeV1(successorProps, "normal") });
    expect(third.scope.querySelector("[data-dialogue-chrome-hidden='true']")).toBeNull();
    expect(screen.getByText("The signal is clear.")).toBeVisible();
  });

  it("keeps aria targets local when parallel renderer instances overlap", () => {
    const player = createPlayerV1();
    const DialogueRenderer = player.renderer;
    const HistoryRenderer = player.history.renderer;
    const router = createInputRouterV1();
    const pair = (props: NarrativeSurfaceRendererPropsV1) => (
      <InputContextProviderV1 router={router}>
        <div data-instance="a">
          {props.kind === "history"
            ? <HistoryRenderer {...props} />
            : <DialogueRenderer {...props} />}
        </div>
        <div data-instance="b">
          {props.kind === "history"
            ? <HistoryRenderer {...props} />
            : <DialogueRenderer {...props} />}
        </div>
      </InputContextProviderV1>
    );
    const assertLocalTargets = (
      roots: readonly HTMLElement[],
      relation: "aria-describedby" | "aria-labelledby",
    ): void => {
      const ids = roots.map((root) => root.getAttribute(relation));
      expect(ids[0]).toBeTruthy();
      expect(ids[1]).toBeTruthy();
      expect(ids[0]).not.toBe(ids[1]);
      roots.forEach((root, index) => {
        const target = document.getElementById(ids[index]!);
        expect(target).not.toBeNull();
        expect(root.closest("[data-instance]")).toContainElement(target);
      });
    };

    const view = render(pair(dialoguePropsV1()));
    assertLocalTargets(
      Array.from(view.container.querySelectorAll<HTMLElement>("[data-dialogue-advance]")),
      "aria-describedby",
    );

    view.rerender(pair(dialoguePropsV1({
      pending: choicePendingV1(),
      choiceAvailability: [
        {
          choiceId: "choice.test.wait",
          status: "disabled",
          reasonTextIds: ["text.test.locked"],
        },
        { choiceId: "choice.test.go", status: "enabled", reasonTextIds: [] },
      ],
    })));
    assertLocalTargets(
      Array.from(
        view.container.querySelectorAll<HTMLElement>("[data-dialogue-choice='choice.test.wait']"),
      ),
      "aria-describedby",
    );

    view.rerender(pair(historyPropsV1()));
    assertLocalTargets(
      Array.from(view.container.querySelectorAll<HTMLElement>("[data-dialogue-history='true']")),
      "aria-labelledby",
    );
  });
});
