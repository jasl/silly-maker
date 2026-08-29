// SPDX-License-Identifier: MIT
import { createPortal } from "react-dom";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement } from "react";
import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { inputHandledV1, inputIgnoredV1 } from "../input/contracts.ts";
import type { InputRouterV1 } from "../input/contracts.ts";
import { PanelV1 } from "../primitives/panel.tsx";
import { useClampedElementDragV1 } from "../primitives/use-clamped-element-drag.ts";
import { createDevDockControlV1 } from "./dev-dock-control.ts";
import type { DevDockControlV1 } from "./dev-dock-control.ts";
import type { PresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import { useAuxiliarySurfacePortalTargetV1 } from "../shell/auxiliary-surface-portal.tsx";
import styles from "./dev-dock.module.css";
import { isDevDockPositionV1 } from "./dev-dock-contracts.ts";
import type {
  DevDockContributionSetV1,
  DevDockPanelV1,
  DevDockPositionV1,
} from "./dev-dock-contracts.ts";

export {
  combineDevDockContributionSetsInternalV1,
  createDevDockContributionSetV1,
} from "./dev-dock-contracts.ts";
export type {
  DevDockContributionSetV1,
  DevDockOpenStateV1,
  DevDockPanelAuthorityV1,
  DevDockPanelStageModeV1,
  DevDockPanelV1,
  DevDockPositionV1,
  DevDockSideV1,
} from "./dev-dock-contracts.ts";

export interface DevDockPropsV1 {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly contributions: DevDockContributionSetV1;
  readonly inputRouter: InputRouterV1;
  /**
   * Window cascade origin; the reference outer UI uses the same corner for
   * its launcher chip. Defaults to `top_right`.
   */
  readonly position?: DevDockPositionV1;
  /** Shared window control; the dock creates a private one when absent. */
  readonly control?: DevDockControlV1;
  /**
   * Presentation freeze: auto-engages while a `stage: "frozen"` panel
   * window is open. The launcher owns the manual 冻结画面 toggle.
   */
  readonly freeze?: PresentationFreezePortV1;
  /** @internal Consumer-commit acknowledgment for private successor publication. */
  readonly onRegistryCommittedInternalV1?: () => void;
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
  readonly front: boolean;
  readonly portalTarget: Element;
  onActivate(panelId: string): void;
  onClose(): void;
  onFocusWithin(panelId: string, focused: boolean): void;
}): ReactElement {
  const drag = useClampedElementDragV1();
  const { panel, onActivate, onClose, onFocusWithin, portalTarget } = props;
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
      data-devdock-window-front={props.front ? "true" : undefined}
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
      onPointerDownCapture={() => onActivate(panel.id)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onFocus={() => {
        onActivate(panel.id);
        onFocusWithin(panel.id, true);
      }}
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
  const { onRegistryCommittedInternalV1 } = props;
  const position = props.position ?? "top_right";
  if (!isDevDockPositionV1(position)) {
    throw new TypeError(`ui.devdock_invalid_position:${position as string}`);
  }
  const capabilities = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const contributions = props.contributions;
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
  const openPanelIdSet = useMemo(() => new Set(openPanelIds), [openPanelIds]);
  const [focusedWindows, setFocusedWindows] = useState<readonly string[]>([]);
  const [frontPanelId, setFrontPanelId] = useState<string | null>(null);
  const previousOpenPanelIdsRef = useRef<readonly string[]>([]);
  const { target, surface } = useAuxiliarySurfacePortalTargetV1();
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
        return current.includes(panelId) ? current : [...current, panelId];
      }
      return current.includes(panelId) ? current.filter((id) => id !== panelId) : current;
    });
  }, []);
  const onWindowActivate = useCallback((panelId: string): void => {
    setFrontPanelId(panelId);
  }, []);

  const publishedPanelsRef = useRef<
    {
      readonly control: DevDockControlV1;
      readonly panelIds: ReadonlySet<string>;
    } | null
  >(null);
  // Publish the validated registry so the launcher can list the same tools.
  // A panel that existed in the previous committed registry and disappears
  // is closed in this layout commit. Never-yet-published ids remain pending,
  // preserving the existing open-before-lazy-load behavior.
  useLayoutEffect(() => {
    const panelIds = new Set(panels.map(({ id }) => id));
    const previous = publishedPanelsRef.current;
    if (previous?.control === control) {
      for (const panelId of previous.panelIds) {
        if (!panelIds.has(panelId)) control.close(panelId);
      }
    }
    control.publishPanelsInternalV1(
      panels.map(({ id, title, authority }) => ({ id, title, authority })),
    );
    onRegistryCommittedInternalV1?.();
    publishedPanelsRef.current = { control, panelIds };
  }, [control, contributions, onRegistryCommittedInternalV1, panels]);
  useLayoutEffect(
    () => () => control.publishPanelsInternalV1([]),
    [control],
  );

  useLayoutEffect(() => {
    if (debugTools) return;
    control.closeAll();
  }, [control, debugTools]);

  useLayoutEffect(() => {
    setFocusedWindows((current) => {
      const next = current.filter((id) => openPanelIdSet.has(id));
      return next.length === current.length ? current : next;
    });
  }, [openPanelIdSet]);
  useLayoutEffect(() => {
    const previousOpenPanelIds = previousOpenPanelIdsRef.current;
    previousOpenPanelIdsRef.current = openPanelIds;
    const previousOpenPanelIdSet = new Set(previousOpenPanelIds);
    const newlyOpenedPanelId = openPanelIds.findLast((panelId) =>
      !previousOpenPanelIdSet.has(panelId)
    );
    setFrontPanelId((current) => {
      if (newlyOpenedPanelId !== undefined) return newlyOpenedPanelId;
      if (current !== null && openPanelIdSet.has(current)) return current;
      return openPanelIds.at(-1) ?? null;
    });
  }, [openPanelIds, openPanelIdSet]);

  // The game stays interactive while windows float; debug input isolation
  // applies only while focus is inside a window (typing in tool forms never
  // doubles as a stage shortcut). Closing a window must drop isolation even
  // if React never delivers blur for the unmounted node.
  const inputIsolated = focusedWindows.some((id) => openPanelIdSet.has(id));
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
      data-silly-tool-surface="true"
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
          front={panel.id === frontPanelId}
          portalTarget={target}
          onActivate={onWindowActivate}
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
