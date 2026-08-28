// SPDX-License-Identifier: MIT
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import type { CoreRollbackPortV1 } from "@sillymaker/base/runtime";

import {
  inputHandledV1,
  inputIgnoredV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
} from "../input/contracts.ts";
import type { HeldInputPortV1, HeldKeyMapV1 } from "../input/held-key-adapter.ts";
import { useInputRouterV1 } from "../input/input-context.tsx";
import type { KeyboardActionMapV1 } from "../input/keyboard-adapter.ts";
import type { PointerActionMapV1 } from "../input/pointer-button-adapter.ts";
import type { NarrativeSurfaceDialogueRendererPropsV1 } from "../narrative/narrative-surface-composition.tsx";
import {
  DefaultVnPlayerChromeHiddenSurfaceInternalV1,
  DefaultVnPlayerRendererInternalV1,
} from "./default-vn-player-core-renderer.tsx";
import type { DefaultVnPlayerLabelsInternalV1 } from "./default-vn-player-core-renderer.tsx";
import { useDefaultVnPlayerSystemInternalV1 } from "./default-vn-player-system.tsx";

export interface DefaultVnPlayerCoreLabelsV1 {
  readonly advance: string;
  readonly playbackControls: string;
  readonly back: string;
  readonly forward: string;
  readonly voice: string;
  readonly skip: string;
  readonly auto: string;
  readonly showUi: string;
  readonly menu: string;
  readonly resume: string;
  readonly save: string;
  readonly quickSave: string;
  readonly quickLoad: string;
  readonly settings: string;
  readonly returnToTitle: string;
  readonly quickSaveComplete: string;
  readonly quickLoadDescription: string;
  readonly confirm: string;
  readonly cancel: string;
  readonly operationFailed: string;
  readonly quickLoadUnavailable: string;
}

export type DefaultVnPlayerCoreLabelKeyV1 = keyof DefaultVnPlayerCoreLabelsV1;

export const defaultVnPlayerCoreLabelsV1: DefaultVnPlayerCoreLabelsV1 = {
  advance: "Continue",
  playbackControls: "Playback controls",
  back: "Back",
  forward: "Forward",
  voice: "Voice",
  skip: "Skip",
  auto: "Auto",
  showUi: "Show dialogue interface",
  menu: "Menu",
  resume: "Return",
  save: "Save / Load",
  quickSave: "Q.Save",
  quickLoad: "Q.Load",
  settings: "Preferences",
  returnToTitle: "Main Menu",
  quickSaveComplete: "Quick save complete.",
  quickLoadDescription: "Load the quick save and replace current progress?",
  confirm: "Load",
  cancel: "Cancel",
  operationFailed: "The operation could not be completed.",
  quickLoadUnavailable: "No quick save exists.",
};

export interface CreateDefaultVnPlayerCoreInputV1 {
  readonly heldInput: HeldInputPortV1;
  readonly rollback: CoreRollbackPortV1;
  /** Optional product text IDs, resolved through the Narrative text resolver on every render. */
  readonly labelTextIds?: Readonly<Partial<Record<DefaultVnPlayerCoreLabelKeyV1, string>>>;
}

export interface DefaultVnPlayerCoreV1 {
  readonly renderer: ComponentType<NarrativeSurfaceDialogueRendererPropsV1>;
  readonly input: Readonly<{
    readonly keyboard: KeyboardActionMapV1;
    readonly held: HeldKeyMapV1;
    readonly pointer: PointerActionMapV1;
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
          if (chrome.state.getCurrent() === "hidden") chrome.show();
          else chrome.requestHide();
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
  props: NarrativeSurfaceDialogueRendererPropsV1,
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
  const activeSay = props.pending.kind === "say" &&
    props.playerView.kind === "say" && props.playerView.phase === "active";
  const playbackMode = props.playerView.playbackMode;
  const onToggleSkip = props.onToggleSkip;

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

function useDefaultVnPlayerRollbackInternalV1(
  rollback: CoreRollbackPortV1,
  enabled: boolean,
): {
  readonly backAvailable: boolean;
  readonly forwardAvailable: boolean;
  readonly onBack: () => void;
  readonly onForward: () => void;
} {
  const router = useInputRouterV1();
  const backSteps = useSyncExternalStore(
    rollback.subscribe,
    () => rollback.available().steps,
    () => rollback.available().steps,
  );
  const forwardSteps = useSyncExternalStore(
    rollback.subscribe,
    () => rollback.available().forwardSteps,
    () => rollback.available().forwardSteps,
  );
  const backAvailable = enabled && backSteps > 0;
  const forwardAvailable = enabled && forwardSteps > 0;
  const onBack = (): void => {
    if (backAvailable) void rollback.toPrevious();
  };
  const onForward = (): void => {
    if (forwardAvailable) void rollback.toNext();
  };

  useEffect(
    () =>
      router.register({
        context: "narrative",
        handle: (event) => {
          if (event.kind !== "action") return inputIgnoredV1;
          if (event.actionId === playerInputActionIdsV1.rollback && backAvailable) {
            void rollback.toPrevious();
            return inputHandledV1;
          }
          if (event.actionId === playerInputActionIdsV1.rollForward && forwardAvailable) {
            void rollback.toNext();
            return inputHandledV1;
          }
          return inputIgnoredV1;
        },
      }),
    [backAvailable, forwardAvailable, rollback, router],
  );

  return { backAvailable, forwardAvailable, onBack, onForward };
}

function resolveLabelsInternalV1(
  props: NarrativeSurfaceDialogueRendererPropsV1,
  textIds: CreateDefaultVnPlayerCoreInputV1["labelTextIds"],
): DefaultVnPlayerLabelsInternalV1 {
  const resolve = (key: DefaultVnPlayerCoreLabelKeyV1): string => {
    const textId = textIds?.[key];
    return textId === undefined ? defaultVnPlayerCoreLabelsV1[key] : props.resolveText(textId);
  };
  return {
    advance: resolve("advance"),
    playbackControls: resolve("playbackControls"),
    back: resolve("back"),
    forward: resolve("forward"),
    voice: resolve("voice"),
    skip: resolve("skip"),
    auto: resolve("auto"),
    showUi: resolve("showUi"),
    menu: resolve("menu"),
    resume: resolve("resume"),
    save: resolve("save"),
    quickSave: resolve("quickSave"),
    quickLoad: resolve("quickLoad"),
    settings: resolve("settings"),
    returnToTitle: resolve("returnToTitle"),
    quickSaveComplete: resolve("quickSaveComplete"),
    quickLoadDescription: resolve("quickLoadDescription"),
    confirm: resolve("confirm"),
    cancel: resolve("cancel"),
    operationFailed: resolve("operationFailed"),
    quickLoadUnavailable: resolve("quickLoadUnavailable"),
  };
}

const defaultVnPlayerKeyboardMapInternalV1: KeyboardActionMapV1 = {
  Escape: systemInputActionIdsV1.cancel,
  Enter: systemInputActionIdsV1.narrativeAdvance,
  KeyH: playerInputActionIdsV1.toggleUi,
  KeyV: playerInputActionIdsV1.replayVoice,
  PageDown: playerInputActionIdsV1.rollForward,
  PageUp: playerInputActionIdsV1.rollback,
  Space: systemInputActionIdsV1.narrativeAdvance,
  Tab: playerInputActionIdsV1.toggleSkip,
};

const defaultVnPlayerHeldKeyMapInternalV1: HeldKeyMapV1 = {
  Control: playerInputActionIdsV1.fastForward,
};

const defaultVnPlayerPointerMapInternalV1: PointerActionMapV1 = {
  secondary: systemInputActionIdsV1.cancel,
  middle: playerInputActionIdsV1.toggleUi,
  wheelDown: playerInputActionIdsV1.rollForward,
  wheelUp: playerInputActionIdsV1.rollback,
};

/**
 * Creates the engine-maintained, Ren'Py-aligned default VN Player. The generic
 * Narrative surface remains the lower-level custom renderer seam; choosing
 * this focused preset supplies the usable UI and physical input defaults.
 */
export function createDefaultVnPlayerCoreInternalV1(
  input: CreateDefaultVnPlayerCoreInputV1,
  renderAuxiliaryPlaybackControl: (
    props: NarrativeSurfaceDialogueRendererPropsV1,
  ) => ReactNode = () => null,
): DefaultVnPlayerCoreV1 {
  const chrome = createDefaultVnPlayerChromeInternalV1();

  function DefaultVnPlayerBoundRendererV1(
    props: NarrativeSurfaceDialogueRendererPropsV1,
  ): ReactElement | null {
    const chromePhase = useSyncExternalStore(
      chrome.state.subscribe,
      chrome.state.getCurrent,
      chrome.state.getCurrent,
    );
    const activeSay = props.pending.kind === "say" &&
      props.playerView.kind === "say" && props.playerView.phase === "active";
    useDefaultVnPlayerHideInputInternalV1({ allowHide: activeSay, chrome });
    const labels = resolveLabelsInternalV1(props, input.labelTextIds);
    const playbackMode = props.playerView.playbackMode;
    const onToggleAuto = props.onToggleAuto;
    const onToggleSkip = props.onToggleSkip;
    const activeDialogue = props.playerView.phase === "active";
    const system = useDefaultVnPlayerSystemInternalV1({
      enabled: activeDialogue,
      labels,
      playbackMode,
      onToggleAuto,
      onToggleSkip,
    });
    useDefaultVnPlayerHeldSkipInternalV1(
      props,
      input.heldInput,
      chromePhase === "visible" && !system.panelOpen,
    );
    const rollback = useDefaultVnPlayerRollbackInternalV1(
      input.rollback,
      chromePhase === "visible",
    );

    const occurrenceId = props.pending.occurrenceId;
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

    if (chromePhase === "hidden" && activeSay) {
      return (
        <>
          <div
            style={{ display: "contents" }}
            inert={system.panelOpen || undefined}
            aria-hidden={system.panelOpen ? "true" : undefined}
          >
            <DefaultVnPlayerChromeHiddenSurfaceInternalV1
              label={labels.showUi}
              occurrenceId={props.pending.occurrenceId}
              onShow={chrome.show}
            />
          </div>
          {system.surface}
        </>
      );
    }
    return (
      <>
        <div
          style={{ display: "contents" }}
          inert={system.panelOpen || undefined}
          aria-hidden={system.panelOpen ? "true" : undefined}
        >
          <DefaultVnPlayerRendererInternalV1
            labels={labels}
            renderer={props}
            rollback={rollback}
            system={system.controls}
            auxiliaryPlaybackControl={renderAuxiliaryPlaybackControl(props)}
          />
        </div>
        {system.surface}
      </>
    );
  }

  return {
    renderer: DefaultVnPlayerBoundRendererV1,
    input: {
      keyboard: defaultVnPlayerKeyboardMapInternalV1,
      held: defaultVnPlayerHeldKeyMapInternalV1,
      pointer: defaultVnPlayerPointerMapInternalV1,
    },
  };
}

export function createDefaultVnPlayerCoreV1(
  input: CreateDefaultVnPlayerCoreInputV1,
): DefaultVnPlayerCoreV1 {
  return createDefaultVnPlayerCoreInternalV1(input);
}
