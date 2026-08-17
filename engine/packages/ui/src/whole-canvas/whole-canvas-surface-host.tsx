// SPDX-License-Identifier: MIT
import {
  Component,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ErrorInfo,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { isDevDockEscapeOwnerTargetV1 } from "../debug/dev-dock-portal-coordinator.tsx";
import type { InputRouterV1 } from "../input/contracts.ts";
import { useStageInputIsolationV1, useStagePointerGestureFenceV1 } from "../shell/game-stage.tsx";
import {
  resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1,
  type WholeCanvasSurfaceHostBindingInternalV1,
  type WholeCanvasSurfaceHostBindingRuntimeInternalV1,
  type WholeCanvasSurfaceRendererPropsInternalV1,
} from "./whole-canvas-surface-composition.tsx";
import type {
  WholeCanvasManagedSurfaceFrameInternalV1,
  WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
  WholeCanvasManagedSurfaceReadinessEntryInternalV1,
  WholeCanvasManagedSurfaceRenderEntryInternalV1,
  WholeCanvasManagedSurfaceSnapshotInternalV1,
} from "./whole-canvas-managed-surface-session.ts";
import styles from "./whole-canvas-surface-host.module.css";

export interface WholeCanvasSurfaceHostPropsInternalV1 {
  readonly binding: WholeCanvasSurfaceHostBindingInternalV1;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
}

interface WholeCanvasSurfaceMountedHostInternalV1 {
  readonly runtime: WholeCanvasSurfaceHostBindingRuntimeInternalV1;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
}

type SurfacePhaseInternalV1 = "current" | "preparing" | "failed";

interface SurfaceDomLifecycleInternalV1 {
  readonly portalContainer: HTMLDivElement;
  readonly shells: Map<string, HTMLElement>;
  readonly snapshot: { current: WholeCanvasManagedSurfaceSnapshotInternalV1 };
  readonly ownerKey: { current: string | null };
  readonly rootPreviousOwner: { current: HTMLElement | null };
  readonly detailOpener: { current: HTMLElement | null };
  readonly pointerActivationTarget: { current: HTMLElement | null };
  readonly pointerActivationSequence: { current: number };
  readonly active: { current: boolean };
  readonly restoreGeneration: { current: number };
  readonly focusGeneration: { current: number };
}

interface SurfaceEntryViewInternalV1 {
  readonly key: string;
  readonly entry: WholeCanvasManagedSurfaceRenderEntryInternalV1;
  readonly phase: SurfacePhaseInternalV1;
  readonly readiness: WholeCanvasManagedSurfaceReadinessEntryInternalV1 | null;
  readonly concealed: boolean;
  readonly rendererConcealed: boolean;
  readonly blockingFallback: boolean;
}

function frameKeyInternalV1(frame: WholeCanvasManagedSurfaceFrameInternalV1): string {
  return [
    frame.applicationEpoch,
    frame.primaryTargetOccurrenceId,
    frame.primaryInstanceId,
    frame.detailTargetOccurrenceId ?? "root",
    frame.detailInstanceId ?? "root",
    frame.surfacePublicationRevision,
    frame.surfaceTopologyRevision,
    frame.inputPublicationRevision,
    frame.hostGeneration,
  ].join(":");
}

function entryKeyInternalV1(
  entry: WholeCanvasManagedSurfaceRenderEntryInternalV1,
): string {
  const instanceId = entry.placement === "detail"
    ? entry.frame.detailInstanceId
    : entry.frame.primaryInstanceId;
  return `${entry.placement}:${instanceId ?? frameKeyInternalV1(entry.frame)}`;
}

function focusMarkerInternalV1(
  entry: WholeCanvasManagedSurfaceRenderEntryInternalV1,
): string {
  if (entry.placement === "detail") return "surface-focus.whole-canvas.detail";
  if (entry.rootKind === "boot_splash") {
    return "surface-focus.whole-canvas.splash-dismiss";
  }
  if (entry.rootKind === "title") {
    return "surface-focus.whole-canvas.title-primary";
  }
  return "surface-focus.whole-canvas.primary";
}

function definitionIdInternalV1(
  entry: WholeCanvasManagedSurfaceRenderEntryInternalV1,
): string {
  if (entry.placement === "detail") return "surface.whole-canvas.detail";
  if (entry.rootKind === "boot_splash") return "surface.whole-canvas.boot-splash";
  if (entry.rootKind === "title") return "surface.whole-canvas.title";
  return "surface.whole-canvas.primary";
}

function focusElementInternalV1(target: HTMLElement): void {
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
}

function isFocusableInternalV1(element: HTMLElement): boolean {
  return element.isConnected && !element.hasAttribute("disabled") &&
    element.getAttribute("aria-hidden") !== "true" && element.closest("[inert]") === null;
}

const wholeCanvasActivationTargetSelectorInternalV1 =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function readActivationTargetInternalV1(event: Event): HTMLElement | null {
  for (const target of event.composedPath()) {
    if (
      target instanceof HTMLElement &&
      target.matches(wholeCanvasActivationTargetSelectorInternalV1)
    ) return target;
  }
  return null;
}

function trapTabInternalV1(
  shell: HTMLElement,
  event: ReactKeyboardEvent<HTMLElement>,
): void {
  const focusable = [...shell.querySelectorAll<HTMLElement>(
    "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), " +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter(isFocusableInternalV1);
  if (focusable.length === 0) {
    event.preventDefault();
    focusElementInternalV1(shell);
    return;
  }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  const active = shell.ownerDocument.activeElement;
  const focusableOwnsActive = active instanceof HTMLElement && focusable.includes(active);
  if (event.shiftKey && (active === first || !focusableOwnsActive)) {
    event.preventDefault();
    focusElementInternalV1(last);
  } else if (!event.shiftKey && (active === last || !focusableOwnsActive)) {
    event.preventDefault();
    focusElementInternalV1(first);
  }
}

function acceptedResultInternalV1(
  result: ReturnType<WholeCanvasSurfaceHostBindingRuntimeInternalV1["dispatchActionInternalV1"]>,
): boolean {
  return result.kind === "applied" || result.kind === "unchanged";
}

function appendSnapshotEntriesInternalV1(
  target: SurfaceEntryViewInternalV1[],
  group: WholeCanvasManagedSurfaceSnapshotInternalV1["root"],
): void {
  if (group.current !== null) {
    target.push(Object.freeze({
      key: entryKeyInternalV1(group.current),
      entry: group.current,
      phase: "current",
      readiness: null,
      concealed: false,
      rendererConcealed: false,
      blockingFallback: false,
    }));
  }
  if (group.pending !== null) {
    target.push(Object.freeze({
      key: entryKeyInternalV1(group.pending.renderEntry),
      entry: group.pending.renderEntry,
      phase: "preparing",
      readiness: group.pending,
      concealed: group.pending.transition === "primary_replacement",
      rendererConcealed: true,
      blockingFallback: group.pending.transition !== "primary_replacement",
    }));
  }
  if (group.failure?.transition === "initial_open") {
    target.push(Object.freeze({
      key: entryKeyInternalV1(group.failure.renderEntry),
      entry: group.failure.renderEntry,
      phase: "failed",
      readiness: group.failure,
      concealed: false,
      rendererConcealed: false,
      blockingFallback: false,
    }));
  }
}

function snapshotEntriesInternalV1(
  snapshot: WholeCanvasManagedSurfaceSnapshotInternalV1,
): readonly SurfaceEntryViewInternalV1[] {
  const entries: SurfaceEntryViewInternalV1[] = [];
  appendSnapshotEntriesInternalV1(entries, snapshot.root);
  appendSnapshotEntriesInternalV1(entries, snapshot.detail);
  return Object.freeze(entries);
}

function focusOwnerKeyInternalV1(
  snapshot: WholeCanvasManagedSurfaceSnapshotInternalV1,
): string | null {
  const detail = snapshot.detail.pending?.renderEntry ?? snapshot.detail.current ?? null;
  if (detail !== null) {
    return entryKeyInternalV1(detail);
  }
  const root = snapshot.root.current ??
    (snapshot.root.failure?.transition === "initial_open"
      ? snapshot.root.failure.renderEntry
      : null) ??
    snapshot.root.pending?.renderEntry ?? null;
  if (root === null) return null;
  return entryKeyInternalV1(root);
}

function hasRootInternalV1(snapshot: WholeCanvasManagedSurfaceSnapshotInternalV1): boolean {
  return snapshot.root.current !== null || snapshot.root.pending !== null ||
    snapshot.root.failure?.transition === "initial_open";
}

function WholeCanvasSurfaceCurrentnessCommitInternalV1(props: {
  readonly lifecycle: SurfaceDomLifecycleInternalV1;
  readonly ownerKey: string | null;
  readonly snapshot: WholeCanvasManagedSurfaceSnapshotInternalV1;
}): null {
  useLayoutEffect(() => {
    props.lifecycle.snapshot.current = props.snapshot;
    props.lifecycle.ownerKey.current = props.ownerKey;
  }, [props.lifecycle, props.ownerKey, props.snapshot]);
  return null;
}

function hasDetailInternalV1(snapshot: WholeCanvasManagedSurfaceSnapshotInternalV1): boolean {
  return snapshot.detail.current !== null || snapshot.detail.pending !== null;
}

interface SurfaceEntryBoundaryPropsInternalV1 {
  readonly children: ReactNode;
  readonly onFailure: (error: unknown) => void;
}

class SurfaceEntryBoundaryInternalV1 extends Component<
  SurfaceEntryBoundaryPropsInternalV1,
  Readonly<{ failed: boolean }>
> {
  state = Object.freeze({ failed: false });
  #reported = false;

  static getDerivedStateFromError(): Readonly<{ failed: boolean }> {
    return Object.freeze({ failed: true });
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    if (this.#reported) return;
    this.#reported = true;
    this.props.onFailure(_error);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

function WholeCanvasSurfaceEntryInternalV1(
  props: Readonly<{
    readonly view: SurfaceEntryViewInternalV1;
    readonly runtime: WholeCanvasSurfaceHostBindingRuntimeInternalV1;
    readonly hostIdentity: object;
    readonly lifecycle: SurfaceDomLifecycleInternalV1;
    readonly focusOwner: boolean;
    readonly blocked: boolean;
    readonly armPointerFence: (event: ReactPointerEvent<Element>) => void;
  }>,
): ReactElement {
  const { view, runtime, hostIdentity, lifecycle, focusOwner, blocked, armPointerFence } = props;
  const shellRef = useRef<HTMLElement | null>(null);
  const backdropPointer = useRef<number | null>(null);
  const captureShell = useCallback((shell: HTMLElement | null): void => {
    const previous = shellRef.current;
    if (previous !== null) lifecycle.shells.delete(view.key);
    shellRef.current = shell;
    if (shell !== null) lifecycle.shells.set(view.key, shell);
  }, [lifecycle, view.key]);

  const captureOwnerBeforeFocus = useCallback((shell: HTMLElement): void => {
    const active = shell.ownerDocument.activeElement;
    if (!(active instanceof HTMLElement) || active === shell.ownerDocument.body) return;
    if (view.entry.placement === "detail") {
      // The opener is captured by the detail_prepare two-phase commit before
      // the exact parent becomes inert. Child layout is too late in WebKit.
      return;
    }
    if (
      lifecycle.rootPreviousOwner.current === null &&
      !lifecycle.portalContainer.contains(active)
    ) {
      lifecycle.rootPreviousOwner.current = active;
    }
  }, [lifecycle, view.entry.placement]);

  const focusShell = useCallback((): void => {
    const shell = shellRef.current;
    if (
      !focusOwner || blocked || shell === null || !shell.isConnected ||
      shell.closest("[inert]") !== null || !runtime.isCurrentInternalV1() ||
      !runtime.isHostMountCurrentInternalV1(hostIdentity)
    ) {
      return;
    }
    const active = shell.ownerDocument.activeElement;
    if (
      active instanceof HTMLElement && shell.contains(active) &&
      isFocusableInternalV1(active)
    ) return;
    captureOwnerBeforeFocus(shell);
    focusElementInternalV1(shell);
  }, [blocked, captureOwnerBeforeFocus, focusOwner, hostIdentity, runtime]);

  useLayoutEffect(() => {
    if (view.concealed || (view.phase === "preparing" && !view.blockingFallback)) return;
    focusShell();
  }, [focusShell, view.blockingFallback, view.concealed, view.phase, view.readiness]);

  useLayoutEffect(() => {
    const readiness = view.readiness;
    if (readiness === null || view.phase !== "preparing") return undefined;
    let active = true;
    void runtime.prepareTargetInternalV1(readiness).then((ready) => {
      if (
        !active || !runtime.isCurrentInternalV1() ||
        !runtime.isHostMountCurrentInternalV1(hostIdentity)
      ) return;
      runtime.settleReadinessInternalV1(readiness, ready ? "ready" : "failed");
    });
    return () => {
      active = false;
    };
  }, [hostIdentity, runtime, view.phase, view.readiness]);

  const onAction = useCallback((actionId: string): void => {
    if (!runtime.isHostMountCurrentInternalV1(hostIdentity)) return;
    runtime.dispatchActionInternalV1(view.entry.frame, actionId);
  }, [hostIdentity, runtime, view.entry.frame]);
  const onBack = useCallback((): void => {
    if (!runtime.isHostMountCurrentInternalV1(hostIdentity)) return;
    runtime.dismissInternalV1(view.entry.frame, "back");
  }, [hostIdentity, runtime, view.entry.frame]);
  const rendererProps = useMemo<WholeCanvasSurfaceRendererPropsInternalV1>(
    () => Object.freeze({ entry: view.entry, onAction, onBack }),
    [onAction, onBack, view.entry],
  );

  const onPreparationFailure = useCallback((error: unknown): void => {
    if (view.readiness !== null) {
      if (runtime.isHostMountCurrentInternalV1(hostIdentity)) {
        runtime.settleReadinessInternalV1(view.readiness, "failed");
      }
    } else {
      runtime.failHostInternalV1(error);
    }
  }, [hostIdentity, runtime, view.readiness]);
  const onRetry = useCallback((): void => {
    if (!runtime.isHostMountCurrentInternalV1(hostIdentity)) return;
    runtime.retryCurrentInternalV1();
  }, [hostIdentity, runtime]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>): void => {
    if (
      !focusOwner || blocked || event.defaultPrevented ||
      !runtime.isHostMountCurrentInternalV1(hostIdentity)
    ) return;
    if (event.key === "Tab") {
      trapTabInternalV1(event.currentTarget, event);
      return;
    }
    if (event.key !== "Escape" || view.phase !== "current") return;
    const result = runtime.dismissInternalV1(view.entry.frame, "escape");
    if (acceptedResultInternalV1(result)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [blocked, focusOwner, hostIdentity, runtime, view.entry.frame, view.phase]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    backdropPointer.current = view.entry.placement === "detail" && view.phase === "current" &&
        event.target === event.currentTarget
      ? event.pointerId
      : null;
  }, [view.entry.placement, view.phase]);
  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>): void => {
    const armed = backdropPointer.current === event.pointerId &&
      event.target === event.currentTarget;
    backdropPointer.current = null;
    if (!armed) return;
    if (!runtime.isHostMountCurrentInternalV1(hostIdentity)) return;
    armPointerFence(event);
    runtime.dismissInternalV1(view.entry.frame, "backdrop");
  }, [armPointerFence, hostIdentity, runtime, view.entry.frame]);
  const onPointerCancel = useCallback((): void => {
    backdropPointer.current = null;
  }, []);

  const className = [
    styles.entry,
    view.entry.placement === "detail" ? styles.detail : styles.root,
    view.concealed ? styles.concealed : null,
    blocked ? styles.blocked : null,
    view.phase === "failed" ? styles.failed : null,
  ].filter(Boolean).join(" ");

  return (
    <section
      ref={captureShell}
      className={className}
      data-whole-canvas-surface={view.entry.placement}
      data-whole-canvas-root-kind={view.entry.rootKind}
      data-whole-canvas-phase={view.phase}
      data-whole-canvas-focus-target={focusMarkerInternalV1(view.entry)}
      data-managed-surface-definition={definitionIdInternalV1(view.entry)}
      data-managed-surface-target={view.entry.target.targetId}
      data-managed-surface-instance={view.entry.placement === "detail"
        ? view.entry.frame.detailInstanceId
        : view.entry.frame.primaryInstanceId}
      data-managed-surface-readiness={view.phase === "preparing"
        ? "pending"
        : view.phase === "failed"
        ? "failed"
        : undefined}
      aria-label={runtime.resolveTextInternalV1(view.entry.resolved.accessibleNameTextId)}
      aria-modal="true"
      aria-hidden={view.concealed || blocked ? "true" : undefined}
      inert={view.concealed || blocked ? true : undefined}
      role="dialog"
      tabIndex={-1}
      style={{ pointerEvents: view.concealed || blocked ? "none" : "auto" }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {view.phase === "failed"
        ? (
          <div className={styles.failure} data-whole-canvas-readiness-failure="true">
            <button type="button" data-managed-surface-retry="true" onClick={onRetry}>
              Retry
            </button>
          </div>
        )
        : (
          <SurfaceEntryBoundaryInternalV1 onFailure={onPreparationFailure}>
            <div
              className={`${styles.renderer} ${
                view.rendererConcealed ? styles.rendererConcealed : ""
              }`}
              aria-hidden={view.rendererConcealed ? "true" : undefined}
              inert={view.rendererConcealed ? true : undefined}
            >
              {runtime.renderInternalV1(rendererProps)}
            </div>
          </SurfaceEntryBoundaryInternalV1>
        )}
    </section>
  );
}

function restoreFocusInternalV1(
  lifecycle: SurfaceDomLifecycleInternalV1,
  runtime: WholeCanvasSurfaceHostBindingRuntimeInternalV1,
  hostIdentity: object,
  target: HTMLElement | null,
  predicate: () => boolean,
): void {
  if (target === null) return;
  const generation = lifecycle.restoreGeneration.current + 1;
  lifecycle.restoreGeneration.current = generation;
  queueMicrotask(() => {
    if (
      !lifecycle.active.current || lifecycle.restoreGeneration.current !== generation ||
      !runtime.isCurrentInternalV1() ||
      !runtime.isHostMountCurrentInternalV1(hostIdentity) || !target.isConnected ||
      target.closest("[inert]") !== null || lifecycle.portalContainer.closest("[inert]") !== null ||
      !predicate()
    ) return;
    focusElementInternalV1(target);
  });
}

interface FocusCommitElementStateInternalV1 {
  readonly element: HTMLElement;
  readonly className: string;
  readonly ariaHidden: string | null;
  readonly inert: boolean;
  readonly phase: string | null;
  readonly pointerEvents: string;
}

function prepareFocusCommitInternalV1(
  lifecycle: SurfaceDomLifecycleInternalV1,
  request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
): (() => void) | null {
  const snapshot = lifecycle.snapshot.current;
  const touched = new Map<HTMLElement, FocusCommitElementStateInternalV1>();
  const capture = (element: HTMLElement): void => {
    if (touched.has(element)) return;
    touched.set(
      element,
      Object.freeze({
        element,
        className: element.className,
        ariaHidden: element.getAttribute("aria-hidden"),
        inert: element.hasAttribute("inert"),
        phase: element.getAttribute("data-whole-canvas-phase"),
        pointerEvents: element.style.pointerEvents,
      }),
    );
  };
  const reveal = (element: HTMLElement, phase: "current" | "failed"): void => {
    capture(element);
    element.classList.remove(styles.concealed!, styles.blocked!);
    element.removeAttribute("aria-hidden");
    element.removeAttribute("inert");
    element.setAttribute("data-whole-canvas-phase", phase);
    element.style.pointerEvents = "auto";
  };
  const revealRenderer = (element: HTMLElement): void => {
    const renderer = element.querySelector<HTMLElement>(`.${styles.rendererConcealed}`);
    if (renderer === null) return;
    capture(renderer);
    renderer.classList.remove(styles.rendererConcealed!);
    renderer.removeAttribute("aria-hidden");
    renderer.removeAttribute("inert");
  };
  const conceal = (element: HTMLElement): void => {
    capture(element);
    element.classList.add(styles.concealed!);
    element.setAttribute("aria-hidden", "true");
    element.setAttribute("inert", "");
    element.style.pointerEvents = "none";
  };
  const previousFocus = lifecycle.portalContainer.ownerDocument.activeElement;
  let focusTarget: HTMLElement | null = null;
  const rollback = Object.freeze((): void => {
    for (const state of [...touched.values()].toReversed()) {
      state.element.className = state.className;
      if (state.ariaHidden === null) state.element.removeAttribute("aria-hidden");
      else state.element.setAttribute("aria-hidden", state.ariaHidden);
      if (state.inert) state.element.setAttribute("inert", "");
      else state.element.removeAttribute("inert");
      if (state.phase === null) state.element.removeAttribute("data-whole-canvas-phase");
      else state.element.setAttribute("data-whole-canvas-phase", state.phase);
      state.element.style.pointerEvents = state.pointerEvents;
    }
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      focusElementInternalV1(previousFocus);
    }
  });

  if (request.kind === "detail_prepare") {
    if (request.transition !== "open") return null;
    const parent = snapshot.root.current;
    if (parent === null || parent.frame !== request.parentFrame) {
      throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
    }
    const parentShell = lifecycle.shells.get(entryKeyInternalV1(parent)) ?? null;
    const active = parentShell?.ownerDocument.activeElement;
    const activeDescendant = active instanceof HTMLElement && active !== parentShell &&
        parentShell?.contains(active) === true && isFocusableInternalV1(active)
      ? active
      : null;
    const pointerTarget = lifecycle.pointerActivationTarget.current;
    const exactOpener = activeDescendant ??
      (parentShell !== null && pointerTarget !== null && parentShell.contains(pointerTarget) &&
          isFocusableInternalV1(pointerTarget)
        ? pointerTarget
        : null);
    if (
      parentShell === null || exactOpener === null
    ) return null;
    const previousOpener = lifecycle.detailOpener.current;
    lifecycle.detailOpener.current = exactOpener;
    lifecycle.pointerActivationSequence.current += 1;
    lifecycle.pointerActivationTarget.current = null;
    return Object.freeze((): void => {
      if (lifecycle.detailOpener.current === exactOpener) {
        lifecycle.detailOpener.current = previousOpener;
      }
    });
  }
  if (request.kind === "root_readiness") {
    const pending = snapshot.root.pending;
    if (pending === null || pending.preparation !== request.preparation) {
      throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
    }
    const candidate = lifecycle.shells.get(entryKeyInternalV1(pending.renderEntry)) ?? null;
    if (candidate === null) throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
    if (request.outcome === "ready") {
      reveal(candidate, "current");
      revealRenderer(candidate);
      focusTarget = candidate;
    } else if (pending.transition === "initial_open") {
      reveal(candidate, "failed");
      focusTarget = candidate;
    } else {
      conceal(candidate);
      const current = snapshot.root.current === null
        ? null
        : lifecycle.shells.get(entryKeyInternalV1(snapshot.root.current)) ?? null;
      const active = candidate.ownerDocument.activeElement;
      focusTarget = current !== null && active instanceof HTMLElement && current.contains(active)
        ? active
        : current;
    }
  } else if (request.kind === "detail_readiness") {
    const pending = snapshot.detail.pending;
    if (pending === null || pending.preparation !== request.preparation) {
      throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
    }
    const candidate = lifecycle.shells.get(entryKeyInternalV1(pending.renderEntry)) ?? null;
    const parent = snapshot.root.current === null
      ? null
      : lifecycle.shells.get(entryKeyInternalV1(snapshot.root.current)) ?? null;
    if (candidate === null || parent === null) {
      throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
    }
    if (request.outcome === "ready") {
      reveal(candidate, "current");
      revealRenderer(candidate);
      focusTarget = candidate;
    } else {
      conceal(candidate);
      reveal(parent, "current");
      focusTarget = lifecycle.detailOpener.current ?? parent;
    }
  } else if (request.kind === "detail_lifecycle") {
    const detail = snapshot.detail.current;
    const parent = snapshot.root.current;
    if (detail === null || parent === null) {
      throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
    }
    const detailShell = lifecycle.shells.get(entryKeyInternalV1(detail)) ?? null;
    const parentShell = lifecycle.shells.get(entryKeyInternalV1(parent)) ?? null;
    if (detailShell === null || parentShell === null) {
      throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
    }
    conceal(detailShell);
    reveal(parentShell, "current");
    focusTarget = lifecycle.detailOpener.current ?? parentShell;
  } else if (request.kind === "root_admission" && request.transition === "primary_close") {
    const closing = snapshot.root.current ?? snapshot.root.pending?.renderEntry ??
      snapshot.root.failure?.renderEntry ?? null;
    const shell = closing === null
      ? null
      : lifecycle.shells.get(entryKeyInternalV1(closing)) ?? null;
    if (shell === null) throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
    conceal(shell);
  }

  if (focusTarget === null) return touched.size === 0 ? null : rollback;
  if (
    !focusTarget.isConnected || focusTarget.closest("[inert]") !== null ||
    lifecycle.portalContainer.closest("[inert]") !== null
  ) throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
  focusElementInternalV1(focusTarget);
  if (focusTarget.ownerDocument.activeElement !== focusTarget) {
    throw new TypeError("ui.whole_canvas_surface_focus_commit_invalid");
  }
  if (
    request.kind === "detail_lifecycle" ||
    (request.kind === "detail_readiness" && request.outcome === "failed")
  ) {
    lifecycle.focusGeneration.current += 1;
  }
  return rollback;
}

function WholeCanvasSurfaceRuntimeInternalV1(
  props: Readonly<{
    readonly runtime: WholeCanvasSurfaceHostBindingRuntimeInternalV1;
    readonly hostIdentity: object;
    readonly portalContainer: HTMLDivElement;
  }>,
): ReactElement | null {
  const { runtime, hostIdentity, portalContainer } = props;
  const subscribe = useCallback(
    (listener: () => void) => runtime.subscribeInternalV1(listener),
    [runtime],
  );
  const getSnapshot = useCallback(() => runtime.getSnapshotInternalV1(), [runtime]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const lifecycleRef = useRef<SurfaceDomLifecycleInternalV1 | null>(null);
  if (lifecycleRef.current === null) {
    lifecycleRef.current = {
      portalContainer,
      shells: new Map(),
      snapshot: { current: snapshot },
      ownerKey: { current: null },
      rootPreviousOwner: { current: null },
      detailOpener: { current: null },
      pointerActivationTarget: { current: null },
      pointerActivationSequence: { current: 0 },
      active: { current: false },
      restoreGeneration: { current: 0 },
      focusGeneration: { current: 0 },
    };
  }
  const lifecycle = lifecycleRef.current;
  const entries = useMemo(() => snapshotEntriesInternalV1(snapshot), [snapshot]);
  const ownerKey = focusOwnerKeyInternalV1(snapshot);
  const previousSnapshot = useRef(snapshot);
  const armPointerFence = useStagePointerGestureFenceV1("whole_canvas");
  useStageInputIsolationV1("whole_canvas", entries.length > 0);

  useLayoutEffect(() => {
    const active = lifecycle.active;
    const restoreGeneration = lifecycle.restoreGeneration;
    const focusGeneration = lifecycle.focusGeneration;
    const pointerActivationSequence = lifecycle.pointerActivationSequence;
    const pointerActivationTarget = lifecycle.pointerActivationTarget;
    active.current = true;
    const ownerDocument = lifecycle.portalContainer.ownerDocument;
    const onPointerActivation = (event: Event): void => {
      const target = readActivationTargetInternalV1(event);
      if (target === null || !lifecycle.portalContainer.contains(target)) return;
      const sequence = lifecycle.pointerActivationSequence.current + 1;
      lifecycle.pointerActivationSequence.current = sequence;
      lifecycle.pointerActivationTarget.current = target;
      setTimeout(() => {
        if (lifecycle.pointerActivationSequence.current !== sequence) return;
        lifecycle.pointerActivationTarget.current = null;
      }, 0);
    };
    const onFocusIn = (event: FocusEvent): void => {
      const key = lifecycle.ownerKey.current;
      const shell = key === null ? null : lifecycle.shells.get(key) ?? null;
      const target = event.target;
      if (
        shell === null || !(target instanceof HTMLElement) ||
        isDevDockEscapeOwnerTargetV1(target) ||
        shell.closest("[inert]") !== null || !runtime.isCurrentInternalV1() ||
        !runtime.isHostMountCurrentInternalV1(hostIdentity)
      ) return;
      event.stopImmediatePropagation();
      if (shell.contains(target)) return;
      const generation = lifecycle.focusGeneration.current + 1;
      lifecycle.focusGeneration.current = generation;
      queueMicrotask(() => {
        if (
          !lifecycle.active.current || lifecycle.focusGeneration.current !== generation ||
          lifecycle.ownerKey.current !== key || !shell.isConnected ||
          shell.closest("[inert]") !== null ||
          !runtime.isCurrentInternalV1() ||
          !runtime.isHostMountCurrentInternalV1(hostIdentity)
        ) return;
        focusElementInternalV1(shell);
      });
    };
    ownerDocument.addEventListener("focusin", onFocusIn, true);
    ownerDocument.addEventListener("pointerdown", onPointerActivation, true);
    ownerDocument.addEventListener("pointerup", onPointerActivation, true);
    ownerDocument.addEventListener("click", onPointerActivation, true);
    return () => {
      active.current = false;
      restoreGeneration.current += 1;
      focusGeneration.current += 1;
      ownerDocument.removeEventListener("focusin", onFocusIn, true);
      ownerDocument.removeEventListener("pointerdown", onPointerActivation, true);
      ownerDocument.removeEventListener("pointerup", onPointerActivation, true);
      ownerDocument.removeEventListener("click", onPointerActivation, true);
      pointerActivationSequence.current += 1;
      pointerActivationTarget.current = null;
    };
  }, [hostIdentity, lifecycle, runtime]);

  useLayoutEffect(() =>
    runtime.registerHostFocusCommitInternalV1(Object.freeze({
      hostIdentity,
      prepareFocusInternalV1: Object.freeze(
        (request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1) =>
          prepareFocusCommitInternalV1(lifecycle, request),
      ),
    })), [hostIdentity, lifecycle, runtime]);

  useLayoutEffect(() => {
    const previous = previousSnapshot.current;
    previousSnapshot.current = snapshot;
    if (hasDetailInternalV1(previous) && !hasDetailInternalV1(snapshot)) {
      const opener = lifecycle.detailOpener.current;
      lifecycle.detailOpener.current = null;
      lifecycle.focusGeneration.current += 1;
      if (
        opener !== null && opener.isConnected && opener.closest("[inert]") === null &&
        lifecycle.portalContainer.closest("[inert]") === null &&
        runtime.isCurrentInternalV1() && runtime.isHostMountCurrentInternalV1(hostIdentity) &&
        hasRootInternalV1(snapshot)
      ) {
        focusElementInternalV1(opener);
      }
    }
    if (hasRootInternalV1(previous) && !hasRootInternalV1(snapshot)) {
      const previousOwner = lifecycle.rootPreviousOwner.current;
      lifecycle.rootPreviousOwner.current = null;
      lifecycle.detailOpener.current = null;
      restoreFocusInternalV1(
        lifecycle,
        runtime,
        hostIdentity,
        previousOwner,
        () => !hasRootInternalV1(lifecycle.snapshot.current),
      );
    }
  }, [hostIdentity, lifecycle, runtime, snapshot]);

  return (
    <>
      <WholeCanvasSurfaceCurrentnessCommitInternalV1
        lifecycle={lifecycle}
        ownerKey={ownerKey}
        snapshot={snapshot}
      />
      {entries.length === 0 ? null : createPortal(
        <div className={styles.host} data-whole-canvas-surface-host="true">
          {entries.map((view) => (
            <div className={styles.slot} key={view.key}>
              <WholeCanvasSurfaceEntryInternalV1
                view={view}
                runtime={runtime}
                hostIdentity={hostIdentity}
                lifecycle={lifecycle}
                focusOwner={view.key === ownerKey}
                blocked={view.entry.placement === "primary" && hasDetailInternalV1(snapshot)}
                armPointerFence={armPointerFence}
              />
              {view.blockingFallback
                ? (
                  <div
                    className={`${styles.preparing} ${
                      view.entry.placement === "detail" ? styles.detail : styles.root
                    }`}
                    data-whole-canvas-readiness-fallback={view.entry.placement}
                    role="status"
                  />
                )
                : null}
            </div>
          ))}
        </div>,
        portalContainer,
      )}
    </>
  );
}

export function WholeCanvasSurfaceHostInternalV1(
  props: WholeCanvasSurfaceHostPropsInternalV1,
): ReactElement | null {
  const runtime = useMemo(
    () => resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(props.binding),
    [props.binding],
  );
  const hostIdentity = useRef<object | null>(null);
  if (hostIdentity.current === null) hostIdentity.current = Object.freeze({});
  const [mounted, setMounted] = useState<WholeCanvasSurfaceMountedHostInternalV1 | null>(null);
  useLayoutEffect(() => {
    let release: (() => void) | null = null;
    try {
      release = runtime.registerHostMountInternalV1(Object.freeze({
        hostIdentity: hostIdentity.current!,
        portalContainer: props.portalContainer,
        inputRouter: props.inputRouter,
      }));
      setMounted(Object.freeze({
        runtime,
        portalContainer: props.portalContainer,
        inputRouter: props.inputRouter,
      }));
    } catch (error) {
      setMounted(null);
      runtime.failHostInternalV1(error);
    }
    return () => release?.();
  }, [props.inputRouter, props.portalContainer, runtime]);
  const mountedRuntime = mounted !== null && mounted.runtime === runtime &&
      mounted.portalContainer === props.portalContainer && mounted.inputRouter === props.inputRouter
    ? mounted.runtime
    : null;
  if (mountedRuntime === null) return null;
  return (
    <WholeCanvasSurfaceRuntimeInternalV1
      runtime={mountedRuntime}
      hostIdentity={hostIdentity.current}
      portalContainer={props.portalContainer}
    />
  );
}
