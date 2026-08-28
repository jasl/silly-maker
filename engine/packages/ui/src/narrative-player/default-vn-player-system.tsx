// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { inputHandledV1, inputIgnoredV1, systemInputActionIdsV1 } from "../input/contracts.ts";
import { useInputRouterV1 } from "../input/input-context.tsx";
import { useStageInputIsolationV1, useStagePointerGestureFenceV1 } from "../shell/game-stage.tsx";
import { usePlayerSystemControllerInternalV1 } from "../system/player-system-controller-internal.tsx";

import styles from "./default-vn-player-core.module.css";

export interface DefaultVnPlayerSystemLabelsInternalV1 {
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

export interface DefaultVnPlayerSystemControlsInternalV1 {
  readonly savesAvailable: boolean;
  readonly quickAvailable: boolean;
  readonly panelOpen: boolean;
  readonly busy: boolean;
  readonly statusText: string | null;
  openMenu(): void;
  openSaves(): void;
  quickSave(): void;
  quickLoad(): void;
  openSettings(): void;
}

type SystemPanelInternalV1 = "closed" | "menu" | "confirm_quick_load";
type SystemActionInternalV1 =
  | "menu"
  | "saves"
  | "quick_save"
  | "quick_load"
  | "settings";

const focusableSelectorInternalV1 =
  "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), " +
  'textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function trapTabInternalV1(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(focusableSelectorInternalV1),
  ).filter((element) => !element.hasAttribute("inert"));
  const first = controls[0];
  const last = controls.at(-1);
  if (first === undefined || last === undefined) {
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    return;
  }
  const activeElement = event.currentTarget.ownerDocument.activeElement;
  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}

function acceptedDialogOpenInternalV1(kind: string): boolean {
  return kind === "preparing" || kind === "applied" || kind === "unchanged";
}

export function useDefaultVnPlayerSystemInternalV1(input: {
  readonly enabled: boolean;
  readonly labels: DefaultVnPlayerSystemLabelsInternalV1;
  readonly playbackMode: "normal" | "auto" | "skip";
  readonly onToggleAuto: (() => void) | null;
  readonly onToggleSkip: (() => void) | null;
}): Readonly<{
  readonly controls: DefaultVnPlayerSystemControlsInternalV1 | null;
  readonly panelOpen: boolean;
  readonly surface: ReactElement | null;
}> {
  const controller = usePlayerSystemControllerInternalV1();
  const router = useInputRouterV1();
  const armPointerFence = useStagePointerGestureFenceV1("narrative");
  const [panel, setPanel] = useState<SystemPanelInternalV1>("closed");
  const [queuedAction, setQueuedAction] = useState<SystemActionInternalV1 | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [panelElement, setPanelElement] = useState<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const panelOpen = panel !== "closed";
  const { enabled, onToggleAuto, onToggleSkip, playbackMode } = input;

  useStageInputIsolationV1("narrative", panelOpen);

  const closePanel = useCallback((restoreFocus = true): void => {
    setPanel("closed");
    const opener = openerRef.current;
    openerRef.current = null;
    if (!restoreFocus || opener === null) return;
    queueMicrotask(() => {
      if (opener.isConnected) opener.focus({ preventScroll: true });
    });
  }, []);

  const openPanel = useCallback((next: Exclude<SystemPanelInternalV1, "closed">): void => {
    if (panel === "closed") {
      openerRef.current = typeof document !== "undefined" &&
          document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }
    setStatusText(null);
    setPanel(next);
  }, [panel]);

  const runQuickSave = useCallback((): void => {
    const quickSave = controller?.quickSave;
    if (quickSave === null || quickSave === undefined || busy) return;
    setBusy(true);
    setStatusText(null);
    void quickSave().then((result) => {
      setStatusText(
        result.kind === "saved"
          ? input.labels.quickSaveComplete
          : result.kind === "guarded"
          ? (result.reasonText ?? input.labels.operationFailed)
          : input.labels.operationFailed,
      );
    }).catch(() => setStatusText(input.labels.operationFailed)).finally(() => setBusy(false));
  }, [
    busy,
    controller?.quickSave,
    input.labels.operationFailed,
    input.labels.quickSaveComplete,
  ]);

  const runAction = useCallback((action: SystemActionInternalV1): void => {
    if (controller === null || busy) return;
    switch (action) {
      case "menu":
        openPanel("menu");
        return;
      case "saves": {
        const result = controller.openSaves();
        if (acceptedDialogOpenInternalV1(result.kind)) closePanel(false);
        else setStatusText(input.labels.operationFailed);
        return;
      }
      case "quick_save":
        runQuickSave();
        return;
      case "quick_load":
        if (controller.quickLoad !== null) openPanel("confirm_quick_load");
        return;
      case "settings": {
        const result = controller.openSettings();
        if (acceptedDialogOpenInternalV1(result.kind)) closePanel(false);
        else setStatusText(input.labels.operationFailed);
      }
    }
  }, [busy, closePanel, controller, input.labels.operationFailed, openPanel, runQuickSave]);

  const requestAction = useCallback((action: SystemActionInternalV1): void => {
    if (!enabled || controller === null || busy || queuedAction !== null) return;
    if (playbackMode === "skip") {
      setQueuedAction(action);
      onToggleSkip?.();
      return;
    }
    if (playbackMode === "auto") {
      setQueuedAction(action);
      onToggleAuto?.();
      return;
    }
    runAction(action);
  }, [
    busy,
    controller,
    enabled,
    onToggleAuto,
    onToggleSkip,
    playbackMode,
    queuedAction,
    runAction,
  ]);

  useLayoutEffect(() => {
    if (queuedAction === null || input.playbackMode !== "normal") return;
    const action = queuedAction;
    setQueuedAction(null);
    runAction(action);
  }, [input.playbackMode, queuedAction, runAction]);

  useEffect(() => {
    if (input.enabled) return;
    setQueuedAction(null);
    if (panelOpen) closePanel(false);
  }, [closePanel, input.enabled, panelOpen]);

  useLayoutEffect(() => {
    if (!panelOpen || panelElement === null) return;
    panelElement.querySelector<HTMLElement>(focusableSelectorInternalV1)?.focus({
      preventScroll: true,
    });
  }, [panel, panelElement, panelOpen]);

  useEffect(() => {
    if (!input.enabled || controller === null) return undefined;
    return router.register({
      context: panelOpen ? "system" : "narrative",
      handle: (event) => {
        if (panelOpen) {
          if (
            event.kind === "action" &&
            event.actionId === systemInputActionIdsV1.cancel
          ) {
            closePanel();
          }
          return event.kind === "focus_loss" || event.kind === "pointer_cancel"
            ? inputIgnoredV1
            : inputHandledV1;
        }
        if (
          event.kind !== "action" || event.actionId !== systemInputActionIdsV1.cancel
        ) return inputIgnoredV1;
        requestAction("menu");
        return inputHandledV1;
      },
    });
  }, [closePanel, controller, input.enabled, panelOpen, requestAction, router]);

  const confirmQuickLoad = useCallback((): void => {
    const quickLoad = controller?.quickLoad;
    if (quickLoad === null || quickLoad === undefined || busy) return;
    setBusy(true);
    setStatusText(null);
    void quickLoad().then((result) => {
      if (result.kind === "loaded") {
        closePanel(false);
        return;
      }
      setStatusText(
        result.kind === "rejected" && result.code === "empty_slot"
          ? input.labels.quickLoadUnavailable
          : input.labels.operationFailed,
      );
    }).catch(() => setStatusText(input.labels.operationFailed)).finally(() => setBusy(false));
  }, [
    busy,
    closePanel,
    controller?.quickLoad,
    input.labels.operationFailed,
    input.labels.quickLoadUnavailable,
  ]);

  const returnToTitle = useCallback((): void => {
    if (controller === null || busy) return;
    setBusy(true);
    setStatusText(null);
    void controller.returnToTitle().catch(() => {
      setStatusText(input.labels.operationFailed);
    }).finally(() => setBusy(false));
  }, [busy, controller, input.labels.operationFailed]);

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (panel === "confirm_quick_load") setPanel("menu");
      else closePanel();
      return;
    }
    if (event.key === "Tab") {
      event.stopPropagation();
      trapTabInternalV1(event);
    }
  };
  const dismissFromBackdrop = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0 || !event.isPrimary) return;
    armPointerFence(event);
    if (panel === "confirm_quick_load") setPanel("menu");
    else closePanel();
  };

  const controls = controller === null ? null : {
    savesAvailable: controller.savesAvailable,
    quickAvailable: controller.quickSave !== null && controller.quickLoad !== null,
    panelOpen,
    busy: busy || queuedAction !== null,
    statusText,
    openMenu: () => requestAction("menu"),
    openSaves: () => requestAction("saves"),
    quickSave: () => requestAction("quick_save"),
    quickLoad: () => requestAction("quick_load"),
    openSettings: () => requestAction("settings"),
  } satisfies DefaultVnPlayerSystemControlsInternalV1;

  const surface = !panelOpen ? null : (
    <dialog
      open
      className={styles["system-menu-root"]}
      data-default-vn-system-menu={panel}
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={styles["system-menu-backdrop"]}
        aria-label={input.labels.cancel}
        data-secondary-action={systemInputActionIdsV1.cancel}
        tabIndex={-1}
        onPointerUp={dismissFromBackdrop}
      />
      <div
        ref={setPanelElement}
        className={styles["system-menu-panel"]}
        data-blocking-focus-scope="system"
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
      >
        {panel === "confirm_quick_load"
          ? (
            <>
              <h2 id={titleId}>{input.labels.quickLoad}</h2>
              <p>{input.labels.quickLoadDescription}</p>
              <div className={styles["system-menu-actions"]}>
                <button
                  type="button"
                  disabled={busy}
                  data-secondary-action={systemInputActionIdsV1.cancel}
                  onClick={confirmQuickLoad}
                >
                  {input.labels.confirm}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  data-secondary-action={systemInputActionIdsV1.cancel}
                  onClick={() => setPanel("menu")}
                >
                  {input.labels.cancel}
                </button>
              </div>
            </>
          )
          : (
            <>
              <h2 id={titleId}>{input.labels.menu}</h2>
              <div className={styles["system-menu-actions"]}>
                <button
                  type="button"
                  disabled={busy}
                  data-secondary-action={systemInputActionIdsV1.cancel}
                  onClick={() => closePanel()}
                >
                  {input.labels.resume}
                </button>
                {controller?.savesAvailable === true
                  ? (
                    <button
                      type="button"
                      disabled={busy}
                      data-secondary-action={systemInputActionIdsV1.cancel}
                      onClick={() => runAction("saves")}
                    >
                      {input.labels.save}
                    </button>
                  )
                  : null}
                {controller?.quickSave === null || controller?.quickLoad === null ? null : (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      data-secondary-action={systemInputActionIdsV1.cancel}
                      onClick={runQuickSave}
                    >
                      {input.labels.quickSave}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      data-secondary-action={systemInputActionIdsV1.cancel}
                      onClick={() => openPanel("confirm_quick_load")}
                    >
                      {input.labels.quickLoad}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={busy}
                  data-secondary-action={systemInputActionIdsV1.cancel}
                  onClick={() => runAction("settings")}
                >
                  {input.labels.settings}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  data-secondary-action={systemInputActionIdsV1.cancel}
                  onClick={returnToTitle}
                >
                  {input.labels.returnToTitle}
                </button>
              </div>
            </>
          )}
        <p className={styles["system-operation-status"]} role="status">
          {statusText}
        </p>
      </div>
    </dialog>
  );

  return { controls, panelOpen, surface };
}
