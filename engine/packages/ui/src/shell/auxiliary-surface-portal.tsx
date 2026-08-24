// SPDX-License-Identifier: MIT
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * Auxiliary chrome is a privileged shell layer, not a scene participant. It
 * anchors to the game canvas above gameplay and system layers. The terminal
 * runtime-failure dialog is the one higher-priority surface: while it owns the
 * page, auxiliary chrome re-parents into that dialog so it remains operable.
 */
export type AuxiliarySurfacePortalSurfaceV1 = "fault_pause";

type AuxiliarySurfacePortalSelectionSurfaceV1 = AuxiliarySurfacePortalSurfaceV1 | "base";

interface AuxiliarySurfacePortalTargetRegistrationV1 {
  readonly surface: AuxiliarySurfacePortalSurfaceV1;
  readonly target: HTMLElement;
}

export interface AuxiliarySurfacePortalTargetSelectionV1 {
  readonly target: HTMLElement | null;
  readonly surface: AuxiliarySurfacePortalSelectionSurfaceV1;
}

interface AuxiliarySurfacePortalContextValueV1 {
  register(surface: AuxiliarySurfacePortalSurfaceV1, target: HTMLElement): () => void;
  readonly selection: AuxiliarySurfacePortalTargetSelectionV1;
}

export interface AuxiliarySurfacePortalCoordinatorPropsV1 {
  readonly children: ReactNode;
  readonly baseTargetClassName?: string;
}

const AuxiliarySurfacePortalContextV1 = createContext<AuxiliarySurfacePortalContextValueV1 | null>(
  null,
);

const missingAuxiliarySurfacePortalSelectionV1 = {
  target: null,
  surface: "base",
} satisfies AuxiliarySurfacePortalTargetSelectionV1;

function selectAuxiliarySurfacePortalTargetV1(
  registrations: readonly AuxiliarySurfacePortalTargetRegistrationV1[],
  baseTarget: HTMLElement | null,
): AuxiliarySurfacePortalTargetSelectionV1 {
  const registration = registrations.findLast((candidate) => candidate.surface === "fault_pause");
  if (registration !== undefined) {
    return { target: registration.target, surface: registration.surface };
  }
  return { target: baseTarget, surface: "base" };
}

/** Anchors an optional shell surface to the canvas; only fault pause may claim it. */
export function AuxiliarySurfacePortalCoordinatorV1(
  props: AuxiliarySurfacePortalCoordinatorPropsV1,
): ReactElement {
  const [overlayTarget, setOverlayTarget] = useState<HTMLDivElement | null>(null);
  const [canvasTarget, setCanvasTarget] = useState<HTMLElement | null>(null);
  const [registrations, setRegistrations] = useState<
    readonly AuxiliarySurfacePortalTargetRegistrationV1[]
  >([]);

  useLayoutEffect(() => {
    if (overlayTarget === null) return undefined;
    const root = overlayTarget.parentElement;
    if (root === null) return undefined;
    const sync = (): void => {
      const canvas = root.querySelector("[data-game-viewport-canvas]");
      setCanvasTarget(canvas instanceof HTMLElement ? canvas : null);
    };
    sync();
    if (typeof MutationObserver !== "function") return undefined;
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [overlayTarget]);

  const register = useCallback(
    (surface: AuxiliarySurfacePortalSurfaceV1, target: HTMLElement): () => void => {
      const registration = { surface, target };
      setRegistrations((current) => [...current, registration]);
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        setRegistrations((current) => current.filter((candidate) => candidate !== registration));
      };
    },
    [],
  );
  const selection = useMemo(
    () => selectAuxiliarySurfacePortalTargetV1(registrations, canvasTarget ?? overlayTarget),
    [canvasTarget, overlayTarget, registrations],
  );
  const contextValue = useMemo(
    () => ({ register, selection }) satisfies AuxiliarySurfacePortalContextValueV1,
    [register, selection],
  );

  return (
    <AuxiliarySurfacePortalContextV1.Provider value={contextValue}>
      <div
        ref={setOverlayTarget}
        className={props.baseTargetClassName}
        data-auxiliary-surface-portal-target="base"
      />
      {props.children}
    </AuxiliarySurfacePortalContextV1.Provider>
  );
}

/** Lets the terminal fault-pause surface claim auxiliary chrome while it owns the page. */
export function useAuxiliarySurfacePortalTargetRegistrationV1(
  surface: AuxiliarySurfacePortalSurfaceV1,
  target: HTMLElement | null,
): void {
  const register = useContext(AuxiliarySurfacePortalContextV1)?.register;
  useLayoutEffect(() => {
    if (register === undefined || target === null) return undefined;
    return register(surface, target);
  }, [register, surface, target]);
}

/** Returns the highest-priority live target, or the coordinator's base target. */
export function useAuxiliarySurfacePortalTargetV1(): AuxiliarySurfacePortalTargetSelectionV1 {
  return useContext(AuxiliarySurfacePortalContextV1)?.selection ??
    missingAuxiliarySurfacePortalSelectionV1;
}
