// SPDX-License-Identifier: MIT
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from "react";
import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { inputHandledV1, inputIgnoredV1 } from "../input/contracts.ts";
import type { InputRouterV1 } from "../input/contracts.ts";
import { Button } from "../primitives/button.tsx";
import { IconButton } from "../primitives/icon-button.tsx";
import { createDevDockControlV1 } from "./dev-dock-control.ts";
import type { DevDockControlV1 } from "./dev-dock-control.ts";
import type { PresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import { useDevDockPortalTargetV1 } from "./dev-dock-portal-coordinator.tsx";
import styles from "./dev-dock.module.css";

/**
 * Panel grouping metadata kept for contribution compatibility; panels list
 * in declaration order regardless of side.
 */
export type DevDockSideV1 = "left" | "right";

/** True when the chip menu or any panel window is open. */
export interface DevDockOpenStateV1 {
  readonly open: boolean;
}

/**
 * Chip/menu corner and the cascade origin for freshly opened windows. The
 * menu always opens toward the free vertical space — bottom corners expand
 * upward — so it never leaves the canvas. Applications reposition the dock
 * when the default corner occludes their own chrome.
 */
export type DevDockPositionV1 =
  | "top_right"
  | "top_left"
  | "bottom_right"
  | "bottom_left";

export type DevDockPanelAuthorityV1 = "read_only" | "cheat";

/**
 * Different diagnostic operations declare different stage behavior:
 * `live` (default) keeps the game fully interactive beside the window —
 * right for click-to-inspect tools; `frozen` engages the presentation
 * freeze while the window is open — right for examining transient frames.
 * Editing tools that work on detached captures simply stay `live`.
 */
export type DevDockPanelStageModeV1 = "live" | "frozen";

export interface DevDockPanelV1 {
  readonly id: string;
  readonly side: DevDockSideV1;
  readonly title: string;
  readonly authority: DevDockPanelAuthorityV1;
  readonly stage?: DevDockPanelStageModeV1;
  readonly render: () => ReactNode;
}

export interface DevDockContributionSetV1 {
  readonly panels: readonly DevDockPanelV1[];
}

export interface DevDockPropsV1 {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly contributions: DevDockContributionSetV1;
  readonly inputRouter: InputRouterV1;
  /** Chip menu visibility (windows are tracked by the control port). */
  readonly openState: DevDockOpenStateV1;
  /** Chip/menu corner and window cascade origin; defaults to `top_right`. */
  readonly position?: DevDockPositionV1;
  /**
   * Render the built-in collapsed chip entry (default true). A Story whose
   * own debug dock drives the control port hides it entirely.
   */
  readonly chip?: boolean;
  /** Shared window control; the dock creates a private one when absent. */
  readonly control?: DevDockControlV1;
  /**
   * Presentation freeze: adds the manual 冻结画面 toggle to the chip menu
   * and auto-engages while a `stage: "frozen"` panel window is open.
   */
  readonly freeze?: PresentationFreezePortV1;
  onOpenStateChange(next: DevDockOpenStateV1): void;
}

const closedDevDockStateV1 = Object.freeze({ open: false }) satisfies DevDockOpenStateV1;
const openedDevDockStateV1 = Object.freeze({ open: true }) satisfies DevDockOpenStateV1;

const devDockPositionsV1: readonly DevDockPositionV1[] = Object.freeze([
  "top_right",
  "top_left",
  "bottom_right",
  "bottom_left",
]);

const noSubscriptionV1 = (): () => void => () => {};

function validatePanelV1(panel: DevDockPanelV1): DevDockPanelV1 {
  if (panel === null || typeof panel !== "object" || Array.isArray(panel)) {
    throw new TypeError("ui.devdock_invalid_panel");
  }
  if (typeof panel.id !== "string" || panel.id.length === 0 || typeof panel.render !== "function") {
    throw new TypeError("ui.devdock_invalid_panel");
  }
  if (panel.side !== "left" && panel.side !== "right") {
    throw new TypeError("ui.devdock_invalid_side");
  }
  if (panel.authority !== "read_only" && panel.authority !== "cheat") {
    throw new TypeError("ui.devdock_invalid_authority");
  }
  if (panel.stage !== undefined && panel.stage !== "live" && panel.stage !== "frozen") {
    throw new TypeError("ui.devdock_invalid_stage_mode");
  }
  if (
    typeof panel.title !== "string" ||
    panel.title.length === 0 ||
    new TextEncoder().encode(panel.title).byteLength > 128
  ) {
    throw new TypeError("ui.devdock_title_limit");
  }
  return Object.freeze({
    id: panel.id,
    side: panel.side,
    title: panel.title,
    authority: panel.authority,
    stage: panel.stage ?? "live",
    render: panel.render,
  });
}

/** Validates and freezes the bounded Story-supplied panel registry. */
export function createDevDockContributionSetV1(
  input: DevDockContributionSetV1,
): DevDockContributionSetV1 {
  if (input === null || typeof input !== "object" || !Array.isArray(input.panels)) {
    throw new TypeError("ui.devdock_invalid_contributions");
  }
  const ids = new Set<string>();
  const counts: Record<DevDockSideV1, number> = { left: 0, right: 0 };
  const panels = input.panels.map((candidate) => {
    const panel = validatePanelV1(candidate);
    if (ids.has(panel.id)) throw new TypeError("ui.devdock_duplicate_panel_id");
    ids.add(panel.id);
    counts[panel.side] += 1;
    if (counts[panel.side] > 16) throw new TypeError("ui.devdock_panels_limit");
    return panel;
  });
  return Object.freeze({ panels: Object.freeze(panels) });
}

function focusableElementsV1(scope: HTMLElement): readonly HTMLElement[] {
  const scopeBounds = scope.getBoundingClientRect();
  const layoutIsMeasured = scopeBounds.width > 0 || scopeBounds.height > 0 ||
    scope.getClientRects().length > 0;

  return [
    ...scope.querySelectorAll<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])",
    ),
  ].filter((element) => {
    if (!element.isConnected) return false;
    if (element.closest("[hidden], [inert], [aria-hidden='true']") !== null) return false;

    const view = element.ownerDocument.defaultView;
    const style = view?.getComputedStyle(element);
    if (style?.display === "none" || style?.visibility === "hidden") return false;

    if (!layoutIsMeasured) return true;
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && element.getClientRects().length > 0;
  });
}

function focusWithoutScrollingV1(element: HTMLElement): void {
  element.focus({ preventScroll: true });
}

interface DevDockDragStateV1 {
  readonly pointerId: number;
  readonly grabX: number;
  readonly grabY: number;
}

/**
 * One floating, movable, non-modal tool window. The game behind it stays
 * fully interactive; the window isolates input only while focus is inside
 * it, and Escape closes just this window.
 */
function DevDockWindowV1(props: {
  readonly panel: DevDockPanelV1;
  readonly cascadeIndex: number;
  readonly cheatsEnabled: boolean;
  readonly portalTarget: Element;
  onClose(): void;
  onFocusWithin(panelId: string, focused: boolean): void;
}): ReactElement {
  const containerRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DevDockDragStateV1 | null>(null);
  const [dragPosition, setDragPosition] = useState<
    { readonly x: number; readonly y: number } | null
  >(
    null,
  );
  const { panel, onClose, onFocusWithin, portalTarget } = props;
  const authorized = panel.authority === "read_only" || props.cheatsEnabled;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    focusWithoutScrollingV1(focusableElementsV1(container)[0] ?? container);
  }, [portalTarget]);

  const moveTo = useCallback((clientX: number, clientY: number): void => {
    const drag = dragRef.current;
    const container = containerRef.current;
    const host = container?.parentElement;
    if (drag === null || container === null || host === null || host === undefined) return;
    const hostBounds = host.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    const maxX = Math.max(0, hostBounds.width - bounds.width);
    const maxY = Math.max(0, hostBounds.height - bounds.height);
    setDragPosition({
      x: Math.min(Math.max(clientX - hostBounds.left - drag.grabX, 0), maxX),
      y: Math.min(Math.max(clientY - hostBounds.top - drag.grabY, 0), maxY),
    });
  }, []);

  const onHeaderPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    event.stopPropagation();
    if (event.button !== 0) return;
    if ((event.target as Element).closest("button, input, select, textarea, a") !== null) return;
    const container = containerRef.current;
    if (container === null) return;
    const bounds = container.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      grabX: event.clientX - bounds.left,
      grabY: event.clientY - bounds.top,
    };
    const header = event.currentTarget;
    if (typeof header.setPointerCapture === "function") {
      header.setPointerCapture(event.pointerId);
    }
  }, []);

  const onHeaderPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    if (dragRef.current === null || dragRef.current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    moveTo(event.clientX, event.clientY);
  }, [moveTo]);

  const onHeaderPointerEnd = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    if (dragRef.current === null || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const header = event.currentTarget;
    if (
      typeof header.hasPointerCapture === "function" &&
      typeof header.releasePointerCapture === "function" &&
      header.hasPointerCapture(event.pointerId)
    ) {
      header.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <section
      ref={containerRef}
      className={styles["dev-dock__window"]}
      role="dialog"
      aria-label={panel.title}
      data-devdock-window={panel.id}
      data-devdock-escape-owner="true"
      tabIndex={-1}
      style={dragPosition === null
        ? { "--devdock-cascade": props.cascadeIndex } as Record<string, number>
        : {
          insetInlineStart: `${String(dragPosition.x)}px`,
          insetBlockStart: `${String(dragPosition.y)}px`,
          insetInlineEnd: "auto",
          insetBlockEnd: "auto",
        }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onFocus={() => onFocusWithin(panel.id, true)}
      onBlur={(event) => {
        if (
          event.relatedTarget === null ||
          !event.currentTarget.contains(event.relatedTarget as Node)
        ) {
          onFocusWithin(panel.id, false);
        }
      }}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <header
        className={styles["dev-dock__window-header"]}
        data-devdock-window-drag="true"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerEnd}
        onPointerCancel={onHeaderPointerEnd}
      >
        <h2>{panel.title}</h2>
        <IconButton
          accessibleName="关闭"
          title="关闭"
          className={styles["dev-dock__window-close"]}
          data-devdock-window-close="true"
          onClick={onClose}
        >
          <svg viewBox="0 0 12 12" width="12" height="12" focusable="false">
            <path
              d="M2.2 2.2l7.6 7.6M9.8 2.2l-7.6 7.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </IconButton>
      </header>
      {/* Scrollable panel content stays keyboard-reachable (WCAG). */}
      <section
        className={styles["dev-dock__panel"]}
        aria-live="polite"
        aria-label={panel.title}
        tabIndex={0}
      >
        {authorized ? panel.render() : <p>需要启用作弊功能</p>}
      </section>
    </section>
  );
}

/** Runtime-gated GameShell chrome; it never receives Snapshot or Story state. */
export function DevDockV1(props: DevDockPropsV1): ReactElement | null {
  const { onOpenStateChange } = props;
  const position = props.position ?? "top_right";
  if (!devDockPositionsV1.includes(position)) {
    throw new TypeError(`ui.devdock_invalid_position:${position as string}`);
  }
  const showChip = props.chip !== false;
  const capabilities = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const contributions = useMemo(
    () => createDevDockContributionSetV1(props.contributions),
    [props.contributions],
  );
  const panels = contributions.panels;
  const localControlRef = useRef<DevDockControlV1 | null>(null);
  if (props.control === undefined && localControlRef.current === null) {
    localControlRef.current = createDevDockControlV1();
  }
  const control = props.control ?? localControlRef.current;
  if (control === null) throw new TypeError("ui.devdock_missing_control");
  const openPanelIds = useSyncExternalStore(
    control.openPanelIds.subscribe,
    control.openPanelIds.getCurrent,
    control.openPanelIds.getCurrent,
  );
  const chipRef = useRef<HTMLButtonElement>(null);
  const [focusedWindows, setFocusedWindows] = useState<readonly string[]>(Object.freeze([]));
  const { target, surface } = useDevDockPortalTargetV1();
  const menuOpen = props.openState.open;
  const debugTools = capabilities.debugTools;
  const cheatsEnabled = debugTools && capabilities.cheats;

  const publishOpenState = useCallback(
    (next: DevDockOpenStateV1): void => onOpenStateChange(next),
    [onOpenStateChange],
  );
  const restoreChipFocus = useCallback((): void => {
    const chip = chipRef.current;
    queueMicrotask(() => {
      if (chip?.isConnected === true) focusWithoutScrollingV1(chip);
    });
  }, []);
  const closeMenu = useCallback((): void => {
    if (!menuOpen) return;
    publishOpenState(closedDevDockStateV1);
    restoreChipFocus();
  }, [menuOpen, publishOpenState, restoreChipFocus]);
  const onWindowFocusWithin = useCallback((panelId: string, focused: boolean): void => {
    setFocusedWindows((current) => {
      if (focused) {
        return current.includes(panelId) ? current : Object.freeze([...current, panelId]);
      }
      return current.includes(panelId)
        ? Object.freeze(current.filter((id) => id !== panelId))
        : current;
    });
  }, []);

  // Publish the validated registry so a Story dock can list the same tools.
  useEffect(() => {
    control.publishPanelsInternalV1(
      panels.map(({ id, title, authority }) => Object.freeze({ id, title, authority })),
    );
    return () => control.publishPanelsInternalV1(Object.freeze([]));
  }, [control, panels]);

  useLayoutEffect(() => {
    if (debugTools) return;
    control.closeAll();
    if (menuOpen) {
      publishOpenState(closedDevDockStateV1);
      restoreChipFocus();
    }
  }, [control, debugTools, menuOpen, publishOpenState, restoreChipFocus]);

  useLayoutEffect(() => {
    setFocusedWindows((current) => {
      const next = current.filter((id) => openPanelIds.includes(id));
      return next.length === current.length ? current : Object.freeze(next);
    });
  }, [openPanelIds]);

  // The game stays interactive while windows float; debug input isolation
  // applies only while focus is inside a window (typing in tool forms never
  // doubles as a stage shortcut). Closing a window must drop isolation even
  // if React never delivers blur for the unmounted node.
  const inputIsolated = focusedWindows.some((id) => openPanelIds.includes(id));
  useLayoutEffect(() => {
    if (!inputIsolated) return undefined;
    return props.inputRouter.register({
      context: "debug",
      handle(event) {
        return event.kind === "focus_loss" || event.kind === "pointer_cancel"
          ? inputIgnoredV1
          : inputHandledV1;
      },
    });
  }, [inputIsolated, props.inputRouter]);

  const openWindows = openPanelIds
    .map((panelId) => panels.find((panel) => panel.id === panelId) ?? null)
    .filter((panel): panel is DevDockPanelV1 => panel !== null);

  // Different diagnostic operations, different behavior: a `frozen` panel
  // window engages the presentation freeze for its lifetime (edge-triggered
  // so the manual toggle keeps working independently).
  const freeze = props.freeze ?? null;
  const frozen = useSyncExternalStore(
    freeze?.state.subscribe ?? noSubscriptionV1,
    () => freeze?.state.getCurrent().frozen ?? false,
    () => freeze?.state.getCurrent().frozen ?? false,
  );
  const wantsFrozenWindow = openWindows.some((panel) => panel.stage === "frozen");
  const previousWantsFrozenRef = useRef(wantsFrozenWindow);
  useLayoutEffect(() => {
    const was = previousWantsFrozenRef.current;
    previousWantsFrozenRef.current = wantsFrozenWindow;
    if (freeze === null) return;
    if (!was && wantsFrozenWindow) freeze.pause();
    else if (was && !wantsFrozenWindow) freeze.resume();
  }, [freeze, wantsFrozenWindow]);
  useLayoutEffect(() => {
    if (debugTools || freeze === null) return;
    freeze.resume();
  }, [debugTools, freeze]);
  // The dock owns the freeze lever; tearing the dock down (capability
  // revocation, unmount) never leaves the world frozen behind it.
  useLayoutEffect(() => () => freeze?.resume(), [freeze]);

  if (!debugTools || target === null) return null;
  // A Story dock hides the chip and opens windows through the control.
  // With nothing to show, do not leave an empty full-canvas overlay.
  if (!showChip && openWindows.length === 0) return null;

  const anySurfaceOpen = menuOpen || openWindows.length > 0;

  return createPortal(
    <div
      className={styles["dev-dock"]}
      data-devdock-surface={surface}
      data-devdock-position={position}
      data-devdock-open={anySurfaceOpen ? "true" : undefined}
      data-devdock-escape-owner={anySurfaceOpen ? "true" : undefined}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || !menuOpen) return;
        // Window Escapes close their own window; the menu owns the rest.
        if ((event.target as Element).closest?.("[data-devdock-window]") !== null) return;
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
      }}
    >
      {showChip
        ? (
          <Button
            ref={chipRef}
            className={styles["dev-dock__chip"]}
            data-devdock-chip="true"
            aria-expanded={menuOpen}
            aria-controls="sillymaker-dev-dock-menu"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (menuOpen) closeMenu();
              else publishOpenState(openedDevDockStateV1);
            }}
          >
            开发工具
          </Button>
        )
        : null}
      {showChip && menuOpen
        ? (
          <nav
            id="sillymaker-dev-dock-menu"
            className={styles["dev-dock__menu"]}
            aria-label="开发工具"
            data-devdock-menu="true"
            data-devdock-escape-owner="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onKeyDownCapture={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              closeMenu();
            }}
          >
            {panels.length === 0
              ? <p className={styles["dev-dock__empty"]}>暂无可用开发工具</p>
              : panels.map((panel) => {
                const disabled = panel.authority === "cheat" && !cheatsEnabled;
                const open = openPanelIds.includes(panel.id);
                return (
                  <Button
                    key={panel.id}
                    aria-pressed={open}
                    aria-describedby={disabled ? "sillymaker-dev-dock-cheat-reason" : undefined}
                    disabled={disabled}
                    onClick={() => {
                      if (open) control.close(panel.id);
                      else control.open(panel.id);
                    }}
                  >
                    {panel.title}
                  </Button>
                );
              })}
            {freeze !== null
              ? (
                <Button
                  data-devdock-freeze-toggle="true"
                  aria-pressed={frozen}
                  onClick={() => {
                    if (frozen) freeze.resume();
                    else freeze.pause();
                  }}
                >
                  {frozen ? "恢复画面" : "冻结画面"}
                </Button>
              )
              : null}
            {!cheatsEnabled && panels.some((panel) => panel.authority === "cheat")
              ? (
                <p
                  id="sillymaker-dev-dock-cheat-reason"
                  className={styles["dev-dock__authority-reason"]}
                >
                  需要启用作弊功能
                </p>
              )
              : null}
          </nav>
        )
        : null}
      {openWindows.map((panel, index) => (
        <DevDockWindowV1
          key={panel.id}
          panel={panel}
          cascadeIndex={index}
          cheatsEnabled={cheatsEnabled}
          portalTarget={target}
          onClose={() => {
            control.close(panel.id);
            restoreChipFocus();
          }}
          onFocusWithin={onWindowFocusWithin}
        />
      ))}
    </div>,
    target,
  );
}
