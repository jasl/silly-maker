// SPDX-License-Identifier: MIT
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement, ReactNode } from "react";
import {
  isDevDockEscapeOwnerTargetV1,
  useDevDockPortalTargetRegistrationV1,
} from "../debug/DevDockPortalCoordinator.tsx";
import {
  inputHandledV1,
  inputIgnoredV1,
  systemInputActionIdsV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import styles from "../overlays/overlay-host.module.css";
import type {
  SaveOverlayGuardV1,
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
} from "../persistence/save-overlay.tsx";
import { SaveOverlayV1 } from "../persistence/save-overlay.tsx";
import {
  useStageInputIsolationV1,
  useStageSystemFocusScopeRegistrationV1,
  useStageSystemPortalContainerV1,
} from "../shell/game-stage.tsx";
import { SettingsDialogContentV1 } from "./settings-dialog.tsx";
import type { SettingsDialogPropsV1 } from "./settings-dialog.tsx";
import { createSystemDialogSessionStoreV1 } from "./system-dialog-session-store.ts";
import type {
  SystemDialogSessionStoreV1,
  SystemDialogSurfaceV1,
} from "./system-dialog-session-store.ts";

export type SystemDialogSettingsV1 = Omit<SettingsDialogPropsV1, "onClose">;

export interface SystemDialogSavesV1 {
  readonly port: SaveOverlayPortV1;
  readonly labels: SaveOverlayLabelsV1;
  /** Story-declared safepoint: manual writes are disabled when not allowed. */
  readonly guard?: SaveOverlayGuardV1;
}

export interface SystemDialogHostPropsV1 {
  readonly store?: SystemDialogSessionStoreV1;
  readonly inputRouter: InputRouterV1;
  readonly settings: SystemDialogSettingsV1;
  /** Enables the system Save dialog; absent when the Host has no persistence. */
  readonly saves?: SystemDialogSavesV1;
  readonly children: ReactNode;
}

export interface SystemDialogControllerV1 {
  /** `opener` restores focus on close; pass null for programmatic entry points. */
  openSettings(opener: HTMLButtonElement | null): void;
  openSaves(opener: HTMLButtonElement | null): void;
}

const SystemDialogContextV1 = createContext<SystemDialogControllerV1 | null>(null);

export function useSystemDialogControllerV1(): SystemDialogControllerV1 {
  const controller = useContext(SystemDialogContextV1);
  if (controller === null) throw new Error("ui.system_dialog_host_missing");
  return controller;
}

function focusConnectedElementV1(
  element: HTMLElement | null,
  ownedScope: HTMLElement | null,
): void {
  if (element === null) return;
  queueMicrotask(() => {
    if (!element.isConnected) return;
    const activeElement = document.activeElement;
    if (
      activeElement !== null &&
      activeElement !== document.body &&
      (ownedScope === null || !ownedScope.contains(activeElement))
    ) {
      return;
    }
    element.focus();
  });
}

export function SystemDialogHostV1(props: SystemDialogHostPropsV1): ReactElement {
  const fallbackStoreRef = useRef<SystemDialogSessionStoreV1 | null>(null);
  const store = props.store ?? (fallbackStoreRef.current ??= createSystemDialogSessionStoreV1());
  const { active } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [focusScopeElement, setFocusScopeElement] = useState<HTMLDivElement | null>(null);
  const focusScopeRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const portalContainer = useStageSystemPortalContainerV1();
  // saves 未配置时 open("saves") 不渲染对话框——隔离判据必须跟随实际
  // 渲染的 surface，否则程序化打开会把输入锁死在一个不存在的对话框上。
  const surface = active === "saves" && props.saves === undefined ? null : active;
  const dialogOpen = surface !== null;
  useStageInputIsolationV1("system", dialogOpen);
  useStageSystemFocusScopeRegistrationV1(focusScopeElement);
  useDevDockPortalTargetRegistrationV1("system", dialogOpen ? focusScopeElement : null);

  const setFocusScope = useCallback((element: HTMLDivElement | null): void => {
    focusScopeRef.current = element;
    setFocusScopeElement(element);
  }, []);

  const closeDialog = useCallback((): void => {
    store.close();
    const opener = openerRef.current;
    openerRef.current = null;
    focusConnectedElementV1(opener, focusScopeRef.current);
  }, [store]);

  const openSurface = useCallback(
    (nextSurface: SystemDialogSurfaceV1, opener: HTMLButtonElement | null): void => {
      openerRef.current = opener;
      store.open(nextSurface);
    },
    [store],
  );

  useLayoutEffect(
    () => () => {
      store.close();
      focusConnectedElementV1(openerRef.current, focusScopeRef.current);
      openerRef.current = null;
    },
    [store],
  );

  useLayoutEffect(() => {
    if (!dialogOpen) return undefined;
    return props.inputRouter.register({
      context: "system",
      handle(event) {
        if (event.kind === "focus_loss" || event.kind === "pointer_cancel") {
          return inputIgnoredV1;
        }
        if (event.kind === "action" && event.actionId === systemInputActionIdsV1.cancel) {
          closeDialog();
        }
        return inputHandledV1;
      },
    });
  }, [closeDialog, props.inputRouter, dialogOpen]);

  const controller = useMemo(
    () =>
      Object.freeze({
        openSettings: (opener: HTMLButtonElement | null) => openSurface("settings", opener),
        openSaves: (opener: HTMLButtonElement | null) => openSurface("saves", opener),
      }) satisfies SystemDialogControllerV1,
    [openSurface],
  );
  const position = portalContainer === null ? "fixed" : "absolute";
  const saves = props.saves;

  return (
    <SystemDialogContextV1.Provider value={controller}>
      <div data-system-dialog-host-content="true" inert={dialogOpen}>
        {props.children}
      </div>
      {surface === null ? null : (
        <DialogPrimitive.Root open onOpenChange={(open) => !open && closeDialog()}>
          <DialogPrimitive.Portal container={portalContainer ?? undefined}>
            <DialogPrimitive.Overlay
              className={styles["blocking-dialog__backdrop"]}
              data-system-dialog-backdrop={surface}
              style={{ position }}
              onClick={closeDialog}
            />
            <DialogPrimitive.Content
              ref={setFocusScope}
              className={styles["blocking-dialog__content"]}
              data-blocking-focus-scope="system"
              data-system-surface={surface}
              {...(surface === "saves" && saves !== undefined
                ? { "aria-label": saves.labels.accessibleName }
                : {})}
              aria-describedby={undefined}
              style={{ position }}
              onEscapeKeyDown={(event) => {
                if (isDevDockEscapeOwnerTargetV1(event.target)) event.preventDefault();
              }}
              onPointerDownOutside={(event) => event.preventDefault()}
            >
              {surface === "settings" ? (
                <SettingsDialogContentV1 {...props.settings} />
              ) : saves === undefined ? null : (
                <SaveOverlayV1
                  port={saves.port}
                  labels={saves.labels}
                  inputRouter={props.inputRouter}
                  {...(saves.guard === undefined ? {} : { guard: saves.guard })}
                  onClose={closeDialog}
                  closeLabel={props.settings.closeLabel}
                />
              )}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </SystemDialogContextV1.Provider>
  );
}
