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
import type { ReactElement, ReactNode } from "react";
import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { inputHandledV1, inputIgnoredV1 } from "../input/contracts.ts";
import type { InputRouterV1 } from "../input/contracts.ts";
import { PanelV1 } from "../primitives/panel.tsx";
import { useClampedElementDragV1 } from "../primitives/use-clamped-element-drag.ts";
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

/** True when the debug launcher is expanded or any tool window is open. */
export interface DevDockOpenStateV1 {
  readonly open: boolean;
}

/**
 * Launcher chip corner and the cascade origin for freshly opened windows.
 * The launcher always opens toward the free vertical space — bottom
 * corners expand upward — so it never leaves the canvas. Applications
 * reposition the dock when the default corner occludes their own chrome.
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
  /**
   * Window cascade origin; matches the launcher chip corner
   * (`StoryDebugDockV1` / `devDockPosition`). Defaults to `top_right`.
   */
  readonly position?: DevDockPositionV1;
  /** Shared window control; the dock creates a private one when absent. */
  readonly control?: DevDockControlV1;
  /**
   * Presentation freeze: auto-engages while a `stage: "frozen"` panel
   * window is open. The launcher owns the manual 冻结画面 toggle.
   */
  readonly freeze?: PresentationFreezePortV1;
}

const devDockPositionsV1: readonly DevDockPositionV1[] = Object.freeze([
  "top_right",
  "top_left",
  "bottom_right",
  "bottom_left",
]);

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

/**
 * One floating, movable, non-modal tool window. The game behind it stays
 * fully interactive; the window isolates input only while focus is inside
 * it, and Escape closes just this window. Chrome is `PanelV1`; drag is
 * `useClampedElementDragV1`.
 */
function DevDockWindowV1(props: {
  readonly panel: DevDockPanelV1;
  readonly cascadeIndex: number;
  readonly cheatsEnabled: boolean;
  readonly portalTarget: Element;
  onClose(): void;
  onFocusWithin(panelId: string, focused: boolean): void;
}): ReactElement {
  const drag = useClampedElementDragV1();
  const { panel, onClose, onFocusWithin, portalTarget } = props;
  const authorized = panel.authority === "read_only" || props.cheatsEnabled;
  const titleId = `sillymaker-dev-dock-title-${panel.id}`;

  useLayoutEffect(() => {
    const container = drag.containerRef.current;
    if (container === null) return;
    focusWithoutScrollingV1(focusableElementsV1(container)[0] ?? container);
  }, [drag.containerRef, portalTarget]);

  return (
    <section
      ref={drag.containerRef}
      className={styles["dev-dock__window"]}
      role="dialog"
      aria-label={panel.title}
      aria-live="polite"
      data-devdock-window={panel.id}
      data-devdock-escape-owner="true"
      data-native-text="true"
      tabIndex={-1}
      style={drag.position === null
        ? { "--devdock-cascade": props.cascadeIndex } as Record<string, number>
        : {
          insetInlineStart: `${String(drag.position.x)}px`,
          insetBlockStart: `${String(drag.position.y)}px`,
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
      <PanelV1
        title={panel.title}
        titleId={titleId}
        onClose={onClose}
        closeLabel="关闭"
        closeControl="icon"
        closeAttributes={{ "data-devdock-window-close": "true" }}
        headerProps={{
          "data-devdock-window-drag": "true",
          "data-panel-drag": "true",
          ...drag.headerProps,
        }}
      >
        <div role="document">
          {authorized ? panel.render() : <p>需要启用作弊功能</p>}
        </div>
      </PanelV1>
    </section>
  );
}

/**
 * Floating tool-window host. The collapsed launcher lives in
 * `StoryDebugDockV1`; this component never renders a chip. It never
 * receives Snapshot or Story state.
 */
export function DevDockV1(props: DevDockPropsV1): ReactElement | null {
  const position = props.position ?? "top_right";
  if (!devDockPositionsV1.includes(position)) {
    throw new TypeError(`ui.devdock_invalid_position:${position as string}`);
  }
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
  const [focusedWindows, setFocusedWindows] = useState<readonly string[]>(Object.freeze([]));
  const { target, surface } = useDevDockPortalTargetV1();
  const debugTools = capabilities.debugTools;
  const cheatsEnabled = debugTools && capabilities.cheats;

  const restoreChipFocus = useCallback((): void => {
    const chip = document.querySelector<HTMLElement>("[data-debug-dock-toggle]");
    queueMicrotask(() => {
      if (chip?.isConnected === true) focusWithoutScrollingV1(chip);
    });
  }, []);
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

  // Publish the validated registry so the launcher can list the same tools.
  useEffect(() => {
    control.publishPanelsInternalV1(
      panels.map(({ id, title, authority }) => Object.freeze({ id, title, authority })),
    );
    return () => control.publishPanelsInternalV1(Object.freeze([]));
  }, [control, panels]);

  useLayoutEffect(() => {
    if (debugTools) return;
    control.closeAll();
  }, [control, debugTools]);

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
  // Tearing the window host down (capability revocation, unmount) never
  // leaves the world frozen behind it. The launcher owns the manual lever.
  useLayoutEffect(() => () => freeze?.resume(), [freeze]);

  if (!debugTools || target === null || openWindows.length === 0) return null;

  return createPortal(
    <div
      className={styles["dev-dock"]}
      data-devdock-surface={surface}
      data-devdock-position={position}
      data-devdock-open="true"
      data-devdock-escape-owner="true"
    >
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
