// SPDX-License-Identifier: MIT
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ComponentType, ReactElement } from "react";

import {
  inputHandledV1,
  inputIgnoredV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
} from "../input/contracts.ts";
import type { HeldInputPortV1, HeldKeyMapV1 } from "../input/held-key-adapter.ts";
import { useInputRouterV1 } from "../input/input-context.tsx";
import type { KeyboardActionMapV1 } from "../input/keyboard-adapter.ts";
import type { NarrativeSurfaceRendererPropsV1 } from "../narrative/narrative-surface-composition.tsx";
import {
  DefaultVnPlayerChromeHiddenSurfaceInternalV1,
  DefaultVnPlayerRendererInternalV1,
} from "./default-vn-player-renderer.tsx";
import type { DefaultVnPlayerLabelsInternalV1 } from "./default-vn-player-renderer.tsx";

export interface DefaultVnPlayerLabelsV1 {
  readonly advance: string;
  readonly playbackControls: string;
  readonly history: string;
  readonly voice: string;
  readonly skip: string;
  readonly auto: string;
  readonly showUi: string;
  readonly historyTitle: string;
  readonly historyEmpty: string;
  readonly historyClose: string;
}

export type DefaultVnPlayerLabelKeyV1 = keyof DefaultVnPlayerLabelsV1;

export const defaultVnPlayerLabelsV1: DefaultVnPlayerLabelsV1 = {
  advance: "Continue",
  playbackControls: "Playback controls",
  history: "History",
  voice: "Voice",
  skip: "Skip",
  auto: "Auto",
  showUi: "Show dialogue interface",
  historyTitle: "Dialogue history",
  historyEmpty: "No dialogue yet.",
  historyClose: "Close history",
};

export interface CreateDefaultVnPlayerInputV1 {
  readonly heldInput: HeldInputPortV1;
  /** Optional product text IDs, resolved through the Narrative text resolver on every render. */
  readonly labelTextIds?: Readonly<Partial<Record<DefaultVnPlayerLabelKeyV1, string>>>;
}

export interface DefaultVnPlayerV1 {
  readonly renderer: ComponentType<NarrativeSurfaceRendererPropsV1>;
  readonly input: Readonly<{
    readonly keyboard: KeyboardActionMapV1;
    readonly held: HeldKeyMapV1;
  }>;
}

type DefaultVnPlayerChromePhaseInternalV1 = "visible" | "stopping" | "hidden";

interface DefaultVnPlayerChromeInternalV1 {
  readonly state: {
    getCurrent(): DefaultVnPlayerChromePhaseInternalV1;
    subscribe(listener: () => void): () => void;
  };
  attach(occurrenceId: string | null): () => void;
  finishHide(occurrenceId: string | null): void;
  requestHide(): void;
  show(): void;
}

function createDefaultVnPlayerChromeInternalV1(): DefaultVnPlayerChromeInternalV1 {
  let phase: DefaultVnPlayerChromePhaseInternalV1 = "visible";
  let hiddenOccurrenceId: string | null = null;
  let attachedRenderers = 0;
  let resetGeneration = 0;
  const listeners = new Set<() => void>();
  const publish = (next: DefaultVnPlayerChromePhaseInternalV1): void => {
    if (phase === next) return;
    phase = next;
    for (const listener of listeners) listener();
  };
  const show = (): void => {
    hiddenOccurrenceId = null;
    publish("visible");
  };
  return {
    state: {
      getCurrent: () => phase,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    attach(occurrenceId) {
      attachedRenderers += 1;
      resetGeneration += 1;
      if (phase === "hidden" && hiddenOccurrenceId !== occurrenceId) show();
      let attached = true;
      return () => {
        if (!attached) return;
        attached = false;
        attachedRenderers -= 1;
        if (attachedRenderers !== 0) return;
        const expectedGeneration = ++resetGeneration;
        queueMicrotask(() => {
          if (attachedRenderers === 0 && resetGeneration === expectedGeneration) show();
        });
      };
    },
    finishHide(occurrenceId) {
      if (phase !== "stopping") return;
      hiddenOccurrenceId = occurrenceId;
      publish("hidden");
    },
    requestHide() {
      if (phase !== "visible") return;
      hiddenOccurrenceId = null;
      publish("stopping");
    },
    show,
  };
}

function useDefaultVnPlayerHideInputInternalV1(input: {
  readonly allowHide: boolean;
  readonly chrome: DefaultVnPlayerChromeInternalV1;
}): void {
  const router = useInputRouterV1();
  const { allowHide, chrome } = input;
  useEffect(
    () =>
      router.register({
        context: "narrative",
        handle: (event) => {
          if (
            event.kind !== "action" ||
            event.actionId !== playerInputActionIdsV1.toggleUi ||
            !allowHide
          ) {
            return inputIgnoredV1;
          }
          chrome.requestHide();
          return inputHandledV1;
        },
      }),
    [allowHide, chrome, router],
  );
}

function isFastForwardHeldInternalV1(heldInput: HeldInputPortV1): boolean {
  return heldInput.state.getCurrent().heldActionIds.has(playerInputActionIdsV1.fastForward);
}

/** One Ctrl press may engage and release Skip; a stopped press cannot cross a later boundary. */
function useDefaultVnPlayerHeldSkipInternalV1(
  props: NarrativeSurfaceRendererPropsV1,
  heldInput: HeldInputPortV1,
  enabled: boolean,
): void {
  const held = useSyncExternalStore(
    heldInput.state.subscribe,
    () => isFastForwardHeldInternalV1(heldInput),
    () => isFastForwardHeldInternalV1(heldInput),
  );
  const press = useRef({
    physicalHeld: false,
    ownsSkip: false,
    observedSkip: false,
    exitIssued: false,
  });
  const activeSay = props.kind === "dialogue" && props.pending.kind === "say" &&
    props.playerView.kind === "say" && props.playerView.phase === "active";
  const playbackMode = props.kind === "dialogue" ? props.playerView.playbackMode : "normal";
  const onToggleSkip = props.kind === "dialogue" ? props.onToggleSkip : null;

  useEffect(() => {
    const state = press.current;
    if (!enabled) {
      state.physicalHeld = held;
      state.ownsSkip = false;
      state.observedSkip = false;
      state.exitIssued = false;
      return;
    }
    if (held !== state.physicalHeld) {
      state.physicalHeld = held;
      if (held) {
        state.observedSkip = playbackMode === "skip";
        state.ownsSkip = activeSay && playbackMode !== "skip";
        state.exitIssued = false;
        if (state.ownsSkip) onToggleSkip?.();
      } else if (!state.ownsSkip) {
        state.observedSkip = false;
        state.exitIssued = false;
      }
    }

    if (!state.ownsSkip) return;
    if (playbackMode === "skip") {
      state.observedSkip = true;
      if (!held && !state.exitIssued) {
        state.exitIssued = true;
        onToggleSkip?.();
      }
      return;
    }
    if (state.observedSkip || state.exitIssued || !activeSay) {
      state.ownsSkip = false;
      state.observedSkip = false;
      state.exitIssued = false;
    }
  }, [activeSay, enabled, held, onToggleSkip, playbackMode]);
}

function resolveLabelsInternalV1(
  props: NarrativeSurfaceRendererPropsV1,
  textIds: CreateDefaultVnPlayerInputV1["labelTextIds"],
): DefaultVnPlayerLabelsInternalV1 {
  const resolve = (key: DefaultVnPlayerLabelKeyV1): string => {
    const textId = textIds?.[key];
    return textId === undefined ? defaultVnPlayerLabelsV1[key] : props.resolveText(textId);
  };
  return {
    advance: resolve("advance"),
    playbackControls: resolve("playbackControls"),
    history: resolve("history"),
    voice: resolve("voice"),
    skip: resolve("skip"),
    auto: resolve("auto"),
    showUi: resolve("showUi"),
    historyTitle: resolve("historyTitle"),
    historyEmpty: resolve("historyEmpty"),
    historyClose: resolve("historyClose"),
  };
}

const defaultVnPlayerKeyboardMapInternalV1: KeyboardActionMapV1 = {
  Enter: systemInputActionIdsV1.narrativeAdvance,
  KeyH: playerInputActionIdsV1.toggleUi,
  KeyV: playerInputActionIdsV1.replayVoice,
  Space: systemInputActionIdsV1.narrativeAdvance,
  Tab: playerInputActionIdsV1.toggleSkip,
};

const defaultVnPlayerHeldKeyMapInternalV1: HeldKeyMapV1 = {
  Control: playerInputActionIdsV1.fastForward,
};

/**
 * Creates the engine-maintained, Ren'Py-aligned default VN Player. The generic
 * Narrative surface remains the lower-level custom renderer seam; choosing
 * this focused preset supplies the usable UI and physical input defaults.
 */
export function createDefaultVnPlayerV1(input: CreateDefaultVnPlayerInputV1): DefaultVnPlayerV1 {
  const chrome = createDefaultVnPlayerChromeInternalV1();

  function DefaultVnPlayerBoundRendererV1(
    props: NarrativeSurfaceRendererPropsV1,
  ): ReactElement | null {
    const chromePhase = useSyncExternalStore(
      chrome.state.subscribe,
      chrome.state.getCurrent,
      chrome.state.getCurrent,
    );
    const activeSay = props.kind === "dialogue" && props.pending.kind === "say" &&
      props.playerView.kind === "say" && props.playerView.phase === "active";
    useDefaultVnPlayerHideInputInternalV1({ allowHide: activeSay, chrome });
    useDefaultVnPlayerHeldSkipInternalV1(props, input.heldInput, chromePhase === "visible");

    const occurrenceId = props.kind === "dialogue" ? props.pending.occurrenceId : null;
    const playbackMode = props.kind === "dialogue" ? props.playerView.playbackMode : "normal";
    const onToggleAuto = props.kind === "dialogue" ? props.onToggleAuto : null;
    const onToggleSkip = props.kind === "dialogue" ? props.onToggleSkip : null;
    const playbackStopIssued = useRef<string | null>(null);

    useLayoutEffect(() => chrome.attach(occurrenceId), [occurrenceId]);

    useLayoutEffect(() => {
      if (chromePhase === "visible") {
        playbackStopIssued.current = null;
        return;
      }
      if (!activeSay) {
        playbackStopIssued.current = null;
        chrome.show();
        return;
      }
      if (chromePhase === "hidden") return;
      if (playbackMode === "normal") {
        playbackStopIssued.current = null;
        chrome.finishHide(occurrenceId);
        return;
      }
      const stopKey = `${occurrenceId}:${playbackMode}`;
      if (playbackStopIssued.current === stopKey) return;
      playbackStopIssued.current = stopKey;
      if (playbackMode === "skip") onToggleSkip?.();
      else onToggleAuto?.();
    }, [activeSay, chromePhase, occurrenceId, onToggleAuto, onToggleSkip, playbackMode]);

    const labels = resolveLabelsInternalV1(props, input.labelTextIds);
    if (chromePhase === "hidden" && activeSay) {
      return (
        <DefaultVnPlayerChromeHiddenSurfaceInternalV1
          label={labels.showUi}
          occurrenceId={props.pending.occurrenceId}
          onShow={chrome.show}
        />
      );
    }
    return <DefaultVnPlayerRendererInternalV1 labels={labels} renderer={props} />;
  }

  return {
    renderer: DefaultVnPlayerBoundRendererV1,
    input: {
      keyboard: defaultVnPlayerKeyboardMapInternalV1,
      held: defaultVnPlayerHeldKeyMapInternalV1,
    },
  };
}
