// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  emptyNarrativeHistoryV1,
  parsePendingInteractionV1,
  type PendingInteractionV1,
} from "@sillymaker/base";
import { defaultPlayerProfileV1 } from "@sillymaker/base/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";

import { playerInputActionIdsV1, systemInputActionIdsV1 } from "../input/contracts.ts";
import type { HeldInputPortV1, HeldInputStateV1 } from "../input/held-key-adapter.ts";
import { InputContextProviderV1 } from "../input/input-context.tsx";
import { createInputRouterV1 } from "../input/input-router.ts";
import type {
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryRendererPropsV1,
  NarrativeSurfaceRendererPropsV1,
} from "../narrative/narrative-surface-composition.tsx";
import { createDefaultVnPlayerV1 } from "./default-vn-player.tsx";

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
  readonly callbacks?: DialogueCallbacksV1;
  readonly choiceAvailability?: NarrativeSurfaceDialogueRendererPropsV1["choiceAvailability"];
  readonly voiceReplayAvailable?: boolean;
} = {}): NarrativeSurfaceDialogueRendererPropsV1 {
  const pending = input.pending ?? sayPendingV1();
  const callbacks = input.callbacks ?? callbacksV1();
  return {
    kind: "dialogue",
    pending,
    choiceAvailability: input.choiceAvailability ?? null,
    voiceReplayAvailable: input.voiceReplayAvailable ?? false,
    playerProfile: defaultPlayerProfileV1,
    playerView: pending.kind === "say"
      ? {
        kind: "say",
        phase: "active",
        playbackMode: input.playbackMode ?? "normal",
        resolvedSpeakerText: "Mina",
        resolvedText: "The signal is clear.",
        revealedCharacters: 20,
        revealLength: 20,
        revealComplete: true,
      }
      : { kind: "passive", phase: "active", playbackMode: "normal" },
    resolveText: textV1,
    ...callbacks,
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

function renderPlayerV1(input: {
  readonly player: ReturnType<typeof createDefaultVnPlayerV1>;
  readonly props: NarrativeSurfaceRendererPropsV1;
  readonly router?: ReturnType<typeof createInputRouterV1>;
}) {
  const router = input.router ?? createInputRouterV1();
  const Renderer = input.player.renderer;
  const element = (props: NarrativeSurfaceRendererPropsV1) => (
    <InputContextProviderV1 router={router}>
      <main data-narrative-surface-focus-scope="dialogue" tabIndex={-1}>
        <Renderer {...props} />
      </main>
    </InputContextProviderV1>
  );
  const view = render(element(input.props));
  return {
    router,
    scope: view.container.querySelector<HTMLElement>("[data-narrative-surface-focus-scope]")!,
    rerender: (props: NarrativeSurfaceRendererPropsV1) => view.rerender(element(props)),
    unmount: view.unmount,
  };
}

describe("createDefaultVnPlayerV1", () => {
  it("returns conventional VN input defaults and resolves product-owned label text IDs", () => {
    const held = createHeldInputHarnessV1();
    const player = createDefaultVnPlayerV1({
      heldInput: held.port,
      labelTextIds: {
        advance: "label.advance",
        playbackControls: "label.playback",
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
        Enter: systemInputActionIdsV1.narrativeAdvance,
        KeyH: playerInputActionIdsV1.toggleUi,
        KeyV: playerInputActionIdsV1.replayVoice,
        Space: systemInputActionIdsV1.narrativeAdvance,
        Tab: playerInputActionIdsV1.toggleSkip,
      },
      held: { Control: playerInputActionIdsV1.fastForward },
    });

    const props = {
      ...dialoguePropsV1(),
      resolveText: (textId: string) =>
        ({
          "label.advance": "下一句",
          "label.playback": "播放控制",
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
    expect(screen.getByRole("button", { name: "回想" })).toBeVisible();
    expect(screen.getByRole("button", { name: "语音" })).toBeVisible();
    expect(screen.getByRole("button", { name: "快进" })).toBeVisible();
    expect(screen.getByRole("button", { name: "自动" })).toBeVisible();
  });

  it("advances only a Say from the full canvas and returns pointer focus to Narrative", async () => {
    const callbacks = callbacksV1();
    const player = createDefaultVnPlayerV1({ heldInput: createHeldInputHarnessV1().port });
    const view = renderPlayerV1({ player, props: dialoguePropsV1({ callbacks }) });

    await userEvent.setup().click(screen.getByRole("button", { name: "Continue" }));

    expect(callbacks.onActivate).toHaveBeenCalledTimes(1);
    expect(view.scope).toHaveFocus();
  });

  it("replays the current Say voice from the default playback bar and restores focus", async () => {
    const callbacks = callbacksV1();
    const player = createDefaultVnPlayerV1({ heldInput: createHeldInputHarnessV1().port });
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
    const player = createDefaultVnPlayerV1({ heldInput: createHeldInputHarnessV1().port });
    renderPlayerV1({ player, props: dialoguePropsV1() });

    expect(screen.queryByRole("button", { name: "Voice" })).toBeNull();
  });

  it("renders Choice availability without a full-canvas advance surface", async () => {
    const callbacks = callbacksV1();
    const player = createDefaultVnPlayerV1({ heldInput: createHeldInputHarnessV1().port });
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

  it("shows resolved History entries and closes the panel", async () => {
    const onCloseHistory = vi.fn();
    const player = createDefaultVnPlayerV1({
      heldInput: createHeldInputHarnessV1().port,
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
    const player = createDefaultVnPlayerV1({
      heldInput: createHeldInputHarnessV1().port,
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
  });

  it("lets one held Ctrl own Skip start and stop without crossing a stopped boundary", () => {
    const held = createHeldInputHarnessV1();
    const callbacks = callbacksV1();
    const player = createDefaultVnPlayerV1({ heldInput: held.port });
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
    const player = createDefaultVnPlayerV1({ heldInput: createHeldInputHarnessV1().port });
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
    const player = createDefaultVnPlayerV1({ heldInput: createHeldInputHarnessV1().port });
    const Renderer = player.renderer;
    const router = createInputRouterV1();
    const pair = (props: NarrativeSurfaceRendererPropsV1) => (
      <InputContextProviderV1 router={router}>
        <div data-instance="a">
          <Renderer {...props} />
        </div>
        <div data-instance="b">
          <Renderer {...props} />
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
