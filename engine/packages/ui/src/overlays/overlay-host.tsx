// SPDX-License-Identifier: MIT
import * as Dialog from "@radix-ui/react-dialog";
import {
  Component,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ErrorInfo, KeyboardEvent as ReactKeyboardEvent, ReactElement } from "react";
import type { DeepReadonly } from "@sillymaker/base";
import { isDevDockEscapeOwnerTargetV1 } from "../debug/dev-dock-portal-coordinator.tsx";
import { inputHandledV1, inputIgnoredV1, systemInputActionIdsV1 } from "../input/contracts.ts";
import type { InputEventV1, InputRouterV1 } from "../input/contracts.ts";
import type { ManagedSurfaceHandleV1 } from "../managed-surfaces/managed-surface-coordinator.ts";
import type { ManagedSurfaceInstanceIdV1 } from "../managed-surfaces/managed-surface-contracts.ts";
import { PanelV1 } from "../primitives/panel.tsx";
import { useStageInputIsolationV1, useStagePointerGestureFenceV1 } from "../shell/game-stage.tsx";
import type {
  OverlayRendererResolutionV1,
  OverlayRendererResolverV1,
  WorkspaceOverlayRenderEntryInternalV1,
  WorkspaceOverlayRenderSnapshotInternalV1,
  WorkspaceOverlaySessionInternalV1,
} from "./workspace-overlay-session.ts";
import styles from "./overlay-host.module.css";

export interface OverlayHostPropsV1<TOverlayId extends string> {
  readonly session: WorkspaceOverlaySessionInternalV1<TOverlayId>;
  readonly rendererResolver: OverlayRendererResolverV1<TOverlayId>;
  readonly inputRouter: InputRouterV1;
  readonly closeLabel: string;
}

interface ResolvedOverlayEntryV1<TOverlayId extends string> {
  readonly entry: WorkspaceOverlayRenderEntryInternalV1<TOverlayId>;
  readonly resolution: OverlayRendererResolutionV1;
  readonly handle: ManagedSurfaceHandleV1;
  readonly depth: number;
}

const overlayActivationTargetSelectorV1 =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function readActivationTargetV1(event: Event): HTMLElement | null {
  if (typeof HTMLElement === "undefined") return null;
  for (const target of event.composedPath()) {
    if (
      target instanceof HTMLElement &&
      target.matches(overlayActivationTargetSelectorV1)
    ) {
      return target;
    }
  }
  return null;
}

function overlayTabbableTargetsV1(root: HTMLElement): readonly HTMLElement[] {
  const view = root.ownerDocument.defaultView;
  return [...root.querySelectorAll<HTMLElement>(overlayActivationTargetSelectorV1)]
    .filter((target) => {
      if (
        target.tabIndex < 0 ||
        target.matches(":disabled") ||
        target.closest('[hidden], [inert], [aria-hidden="true"]') !== null ||
        (target instanceof HTMLInputElement && target.type === "hidden")
      ) {
        return false;
      }
      if (view === null) return true;
      let current: HTMLElement | null = target;
      while (current !== null && root.contains(current)) {
        const style = view.getComputedStyle(current);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse" ||
          style.getPropertyValue("content-visibility") === "hidden"
        ) {
          return false;
        }
        if (current === root) break;
        current = current.parentElement;
      }
      return true;
    });
}

function routeTrappedTabV1(event: ReactKeyboardEvent<HTMLElement>): void {
  const root = event.currentTarget;
  const targets = overlayTabbableTargetsV1(root);
  if (targets.length === 0) {
    event.preventDefault();
    root.focus({ preventScroll: true });
    return;
  }
  const activeIndex = targets.findIndex((target) => target === document.activeElement);
  const nextIndex = activeIndex < 0
    ? event.shiftKey ? targets.length - 1 : 0
    : event.shiftKey
    ? (activeIndex - 1 + targets.length) % targets.length
    : (activeIndex + 1) % targets.length;
  event.preventDefault();
  targets[nextIndex]!.focus({ preventScroll: true });
}

function readReturnFocusTargetV1(): HTMLElement | null {
  if (typeof document === "undefined" || typeof HTMLElement === "undefined") return null;
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement !== document.body
    ? activeElement
    : null;
}

function restoreOwnedFocusV1(
  target: HTMLElement | null | undefined,
  host: HTMLDivElement | null,
): void {
  if (target?.isConnected !== true || typeof document === "undefined") return;
  const activeElement = document.activeElement;
  if (
    activeElement !== null &&
    activeElement !== document.body &&
    (host === null || !host.contains(activeElement))
  ) {
    return;
  }
  target.focus({ preventScroll: true });
}

function resolveLatestV1<TOverlayId extends string>(
  resolver: OverlayRendererResolverV1<TOverlayId>,
  entry: WorkspaceOverlayRenderEntryInternalV1<TOverlayId>,
): OverlayRendererResolutionV1 {
  try {
    return resolver.resolve(entry.overlayId as DeepReadonly<TOverlayId>) ?? entry.resolution;
  } catch {
    // Admission already retained one valid immutable resolution. A later
    // projection fault cannot erase a live Coordinator instance.
    return entry.resolution;
  }
}

function handleOverlayInputV1<TOverlayId extends string>(
  event: InputEventV1,
  session: WorkspaceOverlaySessionInternalV1<TOverlayId>,
  snapshot: () => WorkspaceOverlayRenderSnapshotInternalV1<TOverlayId>,
) {
  switch (event.kind) {
    case "action": {
      if (event.actionId !== systemInputActionIdsV1.cancel) return inputHandledV1;
      const publication = snapshot().publication;
      const inputOwner = publication.inputOwner;
      if (inputOwner === null) {
        const fallback = publication.preparationFallbacks.at(-1);
        if (fallback !== undefined) {
          session.routeFallbackDismissInternalV1(
            fallback.candidateInstanceId,
            "routed_cancel",
          );
        }
        return inputHandledV1;
      }
      const handle = session.getHandleInternalV1(inputOwner.surfaceInstanceId);
      if (handle !== null) session.routeDismissInternalV1(handle, "routed_cancel");
      return inputHandledV1;
    }
    case "viewport_point":
      return inputHandledV1;
    case "pointer_cancel":
    case "focus_loss":
      return inputIgnoredV1;
  }
  return inputIgnoredV1;
}

function OverlayDialogEntryV1<TOverlayId extends string>(props: {
  readonly entry: ResolvedOverlayEntryV1<TOverlayId>;
  readonly focusOwnerInstanceId: string | null;
  readonly portalContainer: HTMLDivElement;
  readonly session: WorkspaceOverlaySessionInternalV1<TOverlayId>;
  readonly closeLabel: string;
}): ReactElement {
  const isTop = props.entry.entry.surfaceInstanceId === props.focusOwnerInstanceId;
  const armPointerFence = useStagePointerGestureFenceV1("overlay");
  const requestExplicitCloseV1 = (): void => {
    props.session.closeExpectedInternalV1(props.entry.handle);
  };
  const requestDismissV1 = (kind: "escape" | "backdrop"): void => {
    props.session.routeDismissInternalV1(props.entry.handle, kind);
  };

  return (
    <Dialog.Root
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) requestExplicitCloseV1();
      }}
    >
      <Dialog.Portal container={props.portalContainer}>
        <div
          className={styles["overlay-host__layer"]}
          data-overlay-layer={props.entry.entry.parentInstanceId === null ? "primary" : "detail"}
          data-overlay-depth={props.entry.depth}
          data-overlay-instance={props.entry.entry.surfaceInstanceId}
          inert={!isTop}
        >
          <div
            className={styles["overlay-host__backdrop"]}
            data-overlay-backdrop={props.entry.depth}
            aria-hidden="true"
            onPointerDown={isTop ? (event) => event.preventDefault() : undefined}
            onPointerUp={isTop
              ? (event) => {
                armPointerFence(event);
                requestDismissV1("backdrop");
              }
              : undefined}
          />
          <Dialog.Content
            className={styles["overlay-host__content"]}
            aria-describedby={undefined}
            data-blocking-focus-scope={isTop ? "overlay" : undefined}
            data-overlay-kind={props.entry.entry.parentInstanceId === null ? "primary" : "detail"}
            data-overlay-depth={props.entry.depth}
            data-overlay-instance={props.entry.entry.surfaceInstanceId}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              if (!isTop) return;
              const root = event.currentTarget as HTMLElement | null;
              const body = root?.querySelector("[data-panel-content]") ?? null;
              const target = body instanceof HTMLElement
                ? overlayTabbableTargetsV1(body)[0] ?? body
                : (body as HTMLElement | null) ??
                  root;
              target?.focus({ preventScroll: true });
            }}
            onKeyDown={(event) => {
              if (isTop && event.key === "Tab") routeTrappedTabV1(event);
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              if (!isDevDockEscapeOwnerTargetV1(event.target)) requestDismissV1("escape");
            }}
            onInteractOutside={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <PanelV1
              title={
                <Dialog.Title asChild>
                  <span>{props.entry.resolution.accessibleName}</span>
                </Dialog.Title>
              }
              {...(isTop ? { onClose: requestExplicitCloseV1, closeLabel: props.closeLabel } : {})}
            >
              {props.entry.resolution.content}
            </PanelV1>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

class OverlayRenderBoundaryV1 extends Component<
  { readonly onFailure: (error: unknown) => void; readonly children: ReactElement },
  { readonly failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { readonly failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    this.props.onFailure(error);
  }

  render(): ReactElement | null {
    return this.state.failed ? null : this.props.children;
  }
}

function OverlayPreparingEntryV1<TOverlayId extends string>(props: {
  readonly entry: WorkspaceOverlayRenderEntryInternalV1<TOverlayId>;
  readonly session: WorkspaceOverlaySessionInternalV1<TOverlayId>;
}): ReactElement {
  useLayoutEffect(() => {
    void props.session.beginCandidatePreparationInternalV1(props.entry.surfaceInstanceId);
  }, [props.entry.surfaceInstanceId, props.session]);

  return (
    <div hidden inert aria-hidden="true" data-overlay-preparing={props.entry.surfaceInstanceId} />
  );
}

function OverlayBlockingFallbackV1<TOverlayId extends string>(props: {
  readonly candidateInstanceId: ManagedSurfaceInstanceIdV1;
  readonly session: WorkspaceOverlaySessionInternalV1<TOverlayId>;
}): ReactElement {
  const armPointerFence = useStagePointerGestureFenceV1("overlay");
  const [focusElement, setFocusElement] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    focusElement?.focus({ preventScroll: true });
  }, [focusElement]);
  return (
    <div
      ref={setFocusElement}
      className={styles["overlay-host__layer"]}
      data-overlay-fallback={props.candidateInstanceId}
      data-blocking-focus-scope="overlay"
      aria-busy="true"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          return;
        }
        if (event.key !== "Escape") return;
        event.preventDefault();
        props.session.routeFallbackDismissInternalV1(
          props.candidateInstanceId,
          "escape",
        );
      }}
    >
      <div
        className={styles["overlay-host__backdrop"]}
        aria-hidden="true"
        onPointerDown={(event) => event.preventDefault()}
        onPointerUp={(event) => {
          armPointerFence(event);
          props.session.routeFallbackDismissInternalV1(
            props.candidateInstanceId,
            "backdrop",
          );
        }}
      />
      <div className={styles["overlay-host__content"]} role="status" aria-live="polite" />
    </div>
  );
}

export function OverlayHostV1<TOverlayId extends string>(
  props: OverlayHostPropsV1<TOverlayId>,
): ReactElement {
  const subscribe = useCallback(
    (listener: () => void) => props.session.subscribe(listener),
    [props.session],
  );
  const getSnapshot = useCallback(
    () => props.session.getRenderSnapshotInternalV1(),
    [props.session],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const previousSnapshotRef = useRef(snapshot);
  const returnFocusTargetsRef = useRef<Map<string, HTMLElement | null>>(new Map());
  const activationTargetRef = useRef<HTMLElement | null>(null);
  const activationSequenceRef = useRef(0);
  const hostElementRef = useRef<HTMLDivElement | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const setHostElement = useCallback((element: HTMLDivElement | null): void => {
    if (element !== null) hostElementRef.current = element;
    setPortalContainer(element);
  }, []);

  useLayoutEffect(
    () => props.session.attachRendererResolverInternalV1(props.rendererResolver),
    [props.rendererResolver, props.session],
  );

  useLayoutEffect(() => {
    if (typeof document === "undefined") return undefined;
    const captureActivationV1 = (event: Event): void => {
      const target = readActivationTargetV1(event);
      if (target === null) return;
      const sequence = activationSequenceRef.current + 1;
      activationSequenceRef.current = sequence;
      activationTargetRef.current = target;
      setTimeout(() => {
        if (activationSequenceRef.current === sequence) activationTargetRef.current = null;
      }, 0);
    };
    document.addEventListener("pointerdown", captureActivationV1, true);
    document.addEventListener("pointerup", captureActivationV1, true);
    document.addEventListener("click", captureActivationV1, true);
    return () => {
      document.removeEventListener("pointerdown", captureActivationV1, true);
      document.removeEventListener("pointerup", captureActivationV1, true);
      document.removeEventListener("click", captureActivationV1, true);
      activationSequenceRef.current += 1;
      activationTargetRef.current = null;
    };
  }, []);

  for (const instance of snapshot.publication.orderedInstances) {
    if (returnFocusTargetsRef.current.has(instance.surfaceInstanceId)) continue;
    if (
      instance.readiness.kind === "preparing" &&
      instance.readiness.transition === "primary_replacement"
    ) {
      returnFocusTargetsRef.current.set(
        instance.surfaceInstanceId,
        returnFocusTargetsRef.current.get(instance.readiness.retainedInstanceId) ?? null,
      );
    } else {
      const activationTarget = activationTargetRef.current;
      returnFocusTargetsRef.current.set(
        instance.surfaceInstanceId,
        activationTarget?.isConnected === true ? activationTarget : readReturnFocusTargetV1(),
      );
    }
  }

  const blocking = snapshot.publication.topmostBlockingInstanceId !== null ||
    snapshot.publication.preparationFallbacks.length > 0;
  useStageInputIsolationV1("overlay", blocking);

  useLayoutEffect(() => {
    if (!blocking) return undefined;
    return props.inputRouter.register({
      context: "overlay",
      handle: (event) => handleOverlayInputV1(event, props.session, () => snapshotRef.current),
    });
  }, [blocking, props.inputRouter, props.session]);

  useLayoutEffect(() => {
    const previous = previousSnapshotRef.current;
    if (props.session.isTerminalDisposalInternalV1()) {
      returnFocusTargetsRef.current.clear();
      previousSnapshotRef.current = snapshot;
      return;
    }
    const previousFocusOwnerId = previous.publication.focusOwner?.surfaceInstanceId ?? null;
    const nextFocusOwnerId = snapshot.publication.focusOwner?.surfaceInstanceId ?? null;
    const live = new Set<string>(
      snapshot.publication.orderedInstances.map((instance) => instance.surfaceInstanceId),
    );
    const previousById = new Map(
      previous.publication.orderedInstances.map((instance) => [
        instance.surfaceInstanceId,
        instance,
      ]),
    );
    const removedSubtreeRootV1 = (
      surfaceInstanceId: ManagedSurfaceInstanceIdV1 | null,
    ): ManagedSurfaceInstanceIdV1 | null => {
      if (surfaceInstanceId === null || live.has(surfaceInstanceId)) return null;
      let current = previousById.get(surfaceInstanceId);
      if (current === undefined) return null;
      while (current.parentInstanceId !== null && !live.has(current.parentInstanceId)) {
        const parent = previousById.get(current.parentInstanceId);
        if (parent === undefined) break;
        current = parent;
      }
      return current.surfaceInstanceId;
    };
    const removedFallbackCandidate = previous.publication.orderedInstances.toReversed().find(
      (instance) =>
        instance.readiness.kind === "preparing" &&
        instance.readiness.transition !== "primary_replacement" &&
        !live.has(instance.surfaceInstanceId),
    );
    const removedFocusSubtreeRootId = removedSubtreeRootV1(previousFocusOwnerId) ??
      removedSubtreeRootV1(removedFallbackCandidate?.surfaceInstanceId ?? null);
    if (previousFocusOwnerId !== nextFocusOwnerId) {
      if (nextFocusOwnerId === null && previousFocusOwnerId !== null) {
        if (
          removedFocusSubtreeRootId !== null &&
          snapshot.publication.preparationFallbacks.length === 0
        ) {
          restoreOwnedFocusV1(
            returnFocusTargetsRef.current.get(
              removedFocusSubtreeRootId ?? previousFocusOwnerId,
            ),
            hostElementRef.current,
          );
        }
      } else if (nextFocusOwnerId !== null) {
        const nextWasPreparing = previous.publication.orderedInstances.some(
          (instance) =>
            instance.surfaceInstanceId === nextFocusOwnerId &&
            instance.readiness.kind === "preparing",
        );
        if (!nextWasPreparing && previousFocusOwnerId !== null) {
          restoreOwnedFocusV1(
            returnFocusTargetsRef.current.get(
              removedFocusSubtreeRootId ?? previousFocusOwnerId,
            ),
            hostElementRef.current,
          );
        } else if (!nextWasPreparing && previousFocusOwnerId === null) {
          if (removedFallbackCandidate !== undefined) {
            restoreOwnedFocusV1(
              returnFocusTargetsRef.current.get(
                removedFocusSubtreeRootId ?? removedFallbackCandidate.surfaceInstanceId,
              ),
              hostElementRef.current,
            );
          }
        }
      }
    } else if (nextFocusOwnerId === null && removedFallbackCandidate !== undefined) {
      restoreOwnedFocusV1(
        returnFocusTargetsRef.current.get(
          removedFocusSubtreeRootId ?? removedFallbackCandidate.surfaceInstanceId,
        ),
        hostElementRef.current,
      );
    }
    for (const instanceId of returnFocusTargetsRef.current.keys()) {
      if (!live.has(instanceId)) returnFocusTargetsRef.current.delete(instanceId);
    }
    previousSnapshotRef.current = snapshot;
  }, [props.session, snapshot]);

  useLayoutEffect(
    () => () => {
      if (props.session.isTerminalDisposalInternalV1()) {
        returnFocusTargetsRef.current.clear();
        return;
      }
      const root = snapshotRef.current.publication.orderedInstances.find(
        (instance) => instance.parentInstanceId === null,
      );
      props.session.closeAll();
      if (root !== undefined) {
        restoreOwnedFocusV1(
          returnFocusTargetsRef.current.get(root.surfaceInstanceId),
          hostElementRef.current,
        );
      }
      returnFocusTargetsRef.current.clear();
    },
    [props.session],
  );

  const readyEntries = useMemo(() => {
    const entries: ResolvedOverlayEntryV1<TOverlayId>[] = [];
    for (const entry of snapshot.entries) {
      if (entry.readiness !== "ready") continue;
      const handle = props.session.getHandleInternalV1(entry.surfaceInstanceId);
      if (handle === null) continue;
      entries.push(Object.freeze({
        entry,
        resolution: resolveLatestV1(props.rendererResolver, entry),
        handle,
        depth: entries.length,
      }));
    }
    return Object.freeze(entries);
  }, [props.rendererResolver, props.session, snapshot]);
  const preparingEntries = snapshot.entries.filter((entry) => entry.readiness === "preparing");
  const active = blocking || readyEntries.length > 0;

  return (
    <div
      ref={setHostElement}
      className={styles["overlay-host"]}
      data-testid="overlay-host"
      data-overlay-application-epoch={snapshot.publication.applicationEpoch}
      data-overlay-topology-revision={snapshot.publication.topologyRevision}
      style={{ pointerEvents: active ? "auto" : "none" }}
    >
      {portalContainer === null ? null : (
        <>
          {readyEntries.map((entry) => (
            <OverlayRenderBoundaryV1
              key={entry.entry.surfaceInstanceId}
              onFailure={(error) => props.session.closeRenderFaultInternalV1(entry.handle, error)}
            >
              <OverlayDialogEntryV1
                entry={entry}
                focusOwnerInstanceId={snapshot.publication.focusOwner?.surfaceInstanceId ?? null}
                portalContainer={portalContainer}
                session={props.session}
                closeLabel={props.closeLabel}
              />
            </OverlayRenderBoundaryV1>
          ))}
          {preparingEntries.map((entry) => (
            <OverlayPreparingEntryV1
              key={`preparing:${entry.surfaceInstanceId}`}
              entry={entry}
              session={props.session}
            />
          ))}
          {snapshot.publication.preparationFallbacks.map((fallback) => (
            <OverlayBlockingFallbackV1
              key={`fallback:${fallback.candidateInstanceId}`}
              candidateInstanceId={fallback.candidateInstanceId}
              session={props.session}
            />
          ))}
        </>
      )}
    </div>
  );
}

export type { OverlayRendererResolutionV1, OverlayRendererResolverV1 };
