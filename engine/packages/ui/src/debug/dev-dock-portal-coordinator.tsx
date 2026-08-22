// SPDX-License-Identifier: MIT
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * Debug chrome is a privileged shell layer, not a scene participant: it
 * anchors to the game canvas and stays there — above every gameplay layer,
 * overlay, and system dialog — like devtools injected over a page. Blocking
 * surfaces keep their focus traps working around it through the
 * `data-devdock-escape-owner` escape below; they must never adopt the dock
 * into their own DOM.
 *
 * The single exception is the terminal runtime-failure surface: its modal
 * dialog owns the whole page (outside subtrees are hidden and focus is
 * trapped by the dialog library), so the dock re-parents into that surface
 * to stay fully operable during fault pause.
 */
export type DevDockPortalSurfaceV1 = "fault_pause";

type DevDockPortalSelectionSurfaceV1 = DevDockPortalSurfaceV1 | "base";

interface DevDockPortalTargetRegistrationV1 {
  readonly surface: DevDockPortalSurfaceV1;
  readonly target: HTMLElement;
}

interface DevDockPortalTargetSelectionV1 {
  readonly target: HTMLElement | null;
  readonly surface: DevDockPortalSelectionSurfaceV1;
}

interface DevDockPortalContextValueV1 {
  register(surface: DevDockPortalSurfaceV1, target: HTMLElement): () => void;
  readonly selection: DevDockPortalTargetSelectionV1;
}

export interface DevDockPortalCoordinatorPropsV1 {
  readonly children: ReactNode;
  readonly baseTargetClassName?: string;
}

const DevDockPortalContextV1 = createContext<DevDockPortalContextValueV1 | null>(null);

const missingDevDockPortalSelectionV1 = Object.freeze({
  target: null,
  surface: "base",
}) satisfies DevDockPortalTargetSelectionV1;

function selectDevDockPortalTargetV1(
  registrations: readonly DevDockPortalTargetRegistrationV1[],
  baseTarget: HTMLElement | null,
): DevDockPortalTargetSelectionV1 {
  const registration = registrations.findLast((candidate) => candidate.surface === "fault_pause");
  if (registration !== undefined) {
    return Object.freeze({ target: registration.target, surface: registration.surface });
  }
  return Object.freeze({ target: baseTarget, surface: "base" });
}

/** Anchors the DevDock to the canvas; only fault pause may claim it. */
export function DevDockPortalCoordinatorV1(props: DevDockPortalCoordinatorPropsV1): ReactElement {
  const [overlayTarget, setOverlayTarget] = useState<HTMLDivElement | null>(null);
  const [canvasTarget, setCanvasTarget] = useState<HTMLElement | null>(null);
  const [registrations, setRegistrations] = useState<readonly DevDockPortalTargetRegistrationV1[]>(
    () => Object.freeze([]),
  );

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
    (surface: DevDockPortalSurfaceV1, target: HTMLElement): () => void => {
      const registration = Object.freeze({ surface, target });
      setRegistrations((current) => Object.freeze([...current, registration]));
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        setRegistrations((current) =>
          Object.freeze(current.filter((candidate) => candidate !== registration))
        );
      };
    },
    [],
  );
  const selection = useMemo(
    () => selectDevDockPortalTargetV1(registrations, canvasTarget ?? overlayTarget),
    [canvasTarget, overlayTarget, registrations],
  );
  const contextValue = useMemo(
    () => Object.freeze({ register, selection }) satisfies DevDockPortalContextValueV1,
    [register, selection],
  );

  return (
    <DevDockPortalContextV1.Provider value={contextValue}>
      <div
        ref={setOverlayTarget}
        className={props.baseTargetClassName}
        data-devdock-portal-target="base"
      />
      {props.children}
    </DevDockPortalContextV1.Provider>
  );
}

/** Lets the terminal fault-pause surface claim the dock while it owns the page. */
export function useDevDockPortalTargetRegistrationV1(
  surface: DevDockPortalSurfaceV1,
  target: HTMLElement | null,
): void {
  const register = useContext(DevDockPortalContextV1)?.register;
  useLayoutEffect(() => {
    if (register === undefined || target === null) return undefined;
    return register(surface, target);
  }, [register, surface, target]);
}

/** Returns the highest-priority live target, or the coordinator's base target. */
export function useDevDockPortalTargetV1(): DevDockPortalTargetSelectionV1 {
  return useContext(DevDockPortalContextV1)?.selection ?? missingDevDockPortalSelectionV1;
}
