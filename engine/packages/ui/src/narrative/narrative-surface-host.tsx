// SPDX-License-Identifier: MIT
import {
  Component,
  createElement,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { isDevDockEscapeOwnerTargetV1 } from "../debug/dev-dock-portal-coordinator.tsx";
import type { InputRouterV1 } from "../input/contracts.ts";
import type { ManagedSurfaceGestureIdV1 } from "../managed-surfaces/managed-surface-contracts.ts";
import { useStageInputIsolationV1, useStagePointerGestureFenceV1 } from "../shell/game-stage.tsx";
import {
  createNarrativeStableHostRuntimeInternalV1,
  isNarrativeStableHostRuntimeCurrentInternalV1,
  prepareNarrativeStableHostReadyCommitInternalV1,
} from "./narrative-managed-surface-family.ts";
import type {
  NarrativeStableHostAttachmentInternalV1,
  NarrativeStableHostRenderEntryInternalV1,
  NarrativeStableHostRuntimeInternalV1,
  NarrativeStableSessionInternalV1,
} from "./narrative-managed-surface-session.ts";

export interface NarrativeSurfaceHostPhysicalIngressContextInternalV1 {
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (
    gestureId: ManagedSurfaceGestureIdV1,
  ) => boolean;
  readonly isCurrentInternalV1: () => boolean;
}

export interface RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1 {
  readonly session: NarrativeStableSessionInternalV1;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
  readonly attachInternalV1: (
    context: NarrativeSurfaceHostPhysicalIngressContextInternalV1,
  ) => () => void;
}

type NarrativeSurfaceHostPhysicalIngressAttachInternalV1 =
  RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1["attachInternalV1"];

interface NarrativeSurfaceHostPhysicalIngressGenerationInternalV1 {
  active: boolean;
  runtime: NarrativeStableHostRuntimeInternalV1 | null;
  detach: (() => void) | null;
  detachCalled: boolean;
}

interface NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1 {
  active: boolean;
  session: NarrativeStableSessionInternalV1 | null;
  portalContainer: HTMLDivElement | null;
  inputRouter: InputRouterV1 | null;
  attach: NarrativeSurfaceHostPhysicalIngressAttachInternalV1 | null;
  generation: NarrativeSurfaceHostPhysicalIngressGenerationInternalV1 | null;
}

interface NarrativeSurfaceHostPhysicalIngressPortalRegistryInternalV1 {
  readonly registrations: WeakMap<
    InputRouterV1,
    NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1
  >;
  activeRegistrationCount: number;
}

interface NarrativeSurfaceHostPhysicalIngressSessionRegistryInternalV1 {
  readonly portals: WeakMap<
    HTMLDivElement,
    NarrativeSurfaceHostPhysicalIngressPortalRegistryInternalV1
  >;
  activePortalCount: number;
}

const narrativeSurfaceHostPhysicalIngressInvalidInternalV1 =
  "ui.narrative_surface_host_physical_ingress_invalid";
const narrativeSurfaceHostPhysicalIngressRegistrationsInternalV1 = new WeakMap<
  NarrativeStableSessionInternalV1,
  NarrativeSurfaceHostPhysicalIngressSessionRegistryInternalV1
>();

function isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(
  value: unknown,
): value is (...args: never[]) => unknown {
  if (typeof value !== "function") return false;
  try {
    if (Reflect.get(value, "then") !== undefined) return false;
    const visited = new Set<object>();
    let current: object | null = value;
    while (current !== null) {
      if (visited.has(current)) return false;
      visited.add(current);
      if (Reflect.getOwnPropertyDescriptor(current, "then") !== undefined) return false;
      current = Reflect.getPrototypeOf(current);
    }
    return true;
  } catch {
    return false;
  }
}

function captureNarrativeSurfaceHostPhysicalIngressRecordInternalV1(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  try {
    if (
      typeof value !== "object" || value === null || Array.isArray(value) ||
      Reflect.getPrototypeOf(value) !== Object.prototype || !Object.isFrozen(value)
    ) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== expectedKeys.length ||
      ownKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
    ) return null;
    const captured: Record<string, unknown> = Object.create(null);
    for (const key of expectedKeys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true ||
        descriptor.configurable !== false || descriptor.writable !== false ||
        Reflect.get(value, key) !== descriptor.value
      ) return null;
      captured[key] = descriptor.value;
    }
    return captured;
  } catch {
    return null;
  }
}

function isNarrativeSurfaceHostPhysicalIngressSessionInternalV1(
  value: unknown,
): value is NarrativeStableSessionInternalV1 {
  const captured = captureNarrativeSurfaceHostPhysicalIngressRecordInternalV1(value, [
    "getReadinessSnapshotInternalV1",
    "subscribeInternalV1",
    "getHistoryChildLifecycleInternalV1",
    "attachHostInternalV1",
  ]);
  return captured !== null &&
    isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(
      captured.getReadinessSnapshotInternalV1,
    ) &&
    isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(captured.subscribeInternalV1) &&
    isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(
      captured.getHistoryChildLifecycleInternalV1,
    ) &&
    isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(captured.attachHostInternalV1);
}

function isNarrativeSurfaceHostPhysicalIngressRouterInternalV1(
  value: unknown,
): value is InputRouterV1 {
  const captured = captureNarrativeSurfaceHostPhysicalIngressRecordInternalV1(value, [
    "register",
    "route",
    "clearTransientInput",
  ]);
  return captured !== null &&
    isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(captured.register) &&
    isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(captured.route) &&
    isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(captured.clearTransientInput);
}

function isNarrativeSurfaceHostPhysicalIngressPortalContainerInternalV1(
  value: unknown,
): value is HTMLDivElement {
  try {
    return typeof HTMLDivElement === "function" && value instanceof HTMLDivElement;
  } catch {
    return false;
  }
}

function getNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(
  session: NarrativeStableSessionInternalV1,
  portalContainer: HTMLDivElement,
  inputRouter: InputRouterV1,
): NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1 | null {
  return narrativeSurfaceHostPhysicalIngressRegistrationsInternalV1.get(session)
    ?.portals.get(portalContainer)?.registrations.get(inputRouter) ?? null;
}

function setNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(
  session: NarrativeStableSessionInternalV1,
  portalContainer: HTMLDivElement,
  inputRouter: InputRouterV1,
  registration: NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1,
): void {
  let sessionRegistry = narrativeSurfaceHostPhysicalIngressRegistrationsInternalV1.get(session);
  if (sessionRegistry === undefined) {
    sessionRegistry = {
      portals: new WeakMap(),
      activePortalCount: 0,
    };
    narrativeSurfaceHostPhysicalIngressRegistrationsInternalV1.set(session, sessionRegistry);
  }
  let portalRegistry = sessionRegistry.portals.get(portalContainer);
  if (portalRegistry === undefined) {
    portalRegistry = {
      registrations: new WeakMap(),
      activeRegistrationCount: 0,
    };
    sessionRegistry.portals.set(portalContainer, portalRegistry);
    sessionRegistry.activePortalCount += 1;
  }
  portalRegistry.registrations.set(inputRouter, registration);
  portalRegistry.activeRegistrationCount += 1;
}

function deleteNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(
  registration: NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1,
): void {
  const session = registration.session;
  const portalContainer = registration.portalContainer;
  const inputRouter = registration.inputRouter;
  if (
    session === null || portalContainer === null || inputRouter === null ||
    getNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(
        session,
        portalContainer,
        inputRouter,
      ) !== registration
  ) return;
  const sessionRegistry = narrativeSurfaceHostPhysicalIngressRegistrationsInternalV1.get(session);
  const portalRegistry = sessionRegistry?.portals.get(portalContainer);
  if (sessionRegistry === undefined || portalRegistry === undefined) return;
  portalRegistry.registrations.delete(inputRouter);
  portalRegistry.activeRegistrationCount -= 1;
  if (portalRegistry.activeRegistrationCount !== 0) return;
  sessionRegistry.portals.delete(portalContainer);
  sessionRegistry.activePortalCount -= 1;
  if (sessionRegistry.activePortalCount === 0) {
    narrativeSurfaceHostPhysicalIngressRegistrationsInternalV1.delete(session);
  }
}

function isNarrativeSurfaceHostPhysicalIngressRegistrationCurrentInternalV1(
  registration: NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1,
): boolean {
  const session = registration.session;
  const portalContainer = registration.portalContainer;
  const inputRouter = registration.inputRouter;
  return registration.active && session !== null && portalContainer !== null &&
    inputRouter !== null &&
    getNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(
        session,
        portalContainer,
        inputRouter,
      ) === registration;
}

function detachNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
  generation: NarrativeSurfaceHostPhysicalIngressGenerationInternalV1,
): void {
  const detach = generation.detach;
  if (detach === null || generation.detachCalled) return;
  generation.detachCalled = true;
  generation.detach = null;
  try {
    Reflect.apply(detach, undefined, []);
  } catch {
    // Physical-ingress detachment cannot interrupt Host attachment cleanup.
  }
}

function fenceNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
  registration: NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1,
  generation: NarrativeSurfaceHostPhysicalIngressGenerationInternalV1,
): void {
  generation.active = false;
  if (registration.generation === generation) registration.generation = null;
}

function releaseNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(
  registration: NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1,
): void {
  if (!registration.active) return;
  registration.active = false;
  const generation = registration.generation;
  registration.generation = null;
  deleteNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(registration);
  registration.session = null;
  registration.portalContainer = null;
  registration.inputRouter = null;
  registration.attach = null;
  if (generation === null) return;
  generation.active = false;
  detachNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(generation);
}

export function registerNarrativeSurfaceHostPhysicalIngressInternalV1(
  input: RegisterNarrativeSurfaceHostPhysicalIngressInputInternalV1,
): () => void {
  const captured = captureNarrativeSurfaceHostPhysicalIngressRecordInternalV1(input, [
    "session",
    "portalContainer",
    "inputRouter",
    "attachInternalV1",
  ]);
  const session = captured?.session;
  const portalContainer = captured?.portalContainer;
  const inputRouter = captured?.inputRouter;
  const attach = captured?.attachInternalV1;
  if (
    !isNarrativeSurfaceHostPhysicalIngressSessionInternalV1(session) ||
    !isNarrativeSurfaceHostPhysicalIngressPortalContainerInternalV1(portalContainer) ||
    !isNarrativeSurfaceHostPhysicalIngressRouterInternalV1(inputRouter) ||
    !isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(attach) ||
    getNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(
        session,
        portalContainer,
        inputRouter,
      ) !== null
  ) {
    throw new TypeError(narrativeSurfaceHostPhysicalIngressInvalidInternalV1);
  }
  const registration: NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1 = {
    active: true,
    session,
    portalContainer,
    inputRouter,
    attach: attach as NarrativeSurfaceHostPhysicalIngressAttachInternalV1,
    generation: null,
  };
  const cleanup = Object.freeze((): void => {
    releaseNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(registration);
  });
  setNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(
    session,
    portalContainer,
    inputRouter,
    registration,
  );
  return cleanup;
}

function isNarrativeSurfaceHostPhysicalIngressGenerationCurrentInternalV1(
  registration: NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1,
  generation: NarrativeSurfaceHostPhysicalIngressGenerationInternalV1,
): boolean {
  const runtime = generation.runtime;
  if (
    runtime === null || !generation.active || registration.generation !== generation ||
    !isNarrativeSurfaceHostPhysicalIngressRegistrationCurrentInternalV1(registration)
  ) return false;
  try {
    return isNarrativeStableHostRuntimeCurrentInternalV1(runtime);
  } catch {
    return false;
  }
}

function claimNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
  session: NarrativeStableSessionInternalV1,
  portalContainer: HTMLDivElement,
  inputRouter: InputRouterV1,
  isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean,
  runtime: NarrativeStableHostRuntimeInternalV1,
):
  | Readonly<{
    readonly registration: NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1;
    readonly generation: NarrativeSurfaceHostPhysicalIngressGenerationInternalV1;
    readonly context: NarrativeSurfaceHostPhysicalIngressContextInternalV1;
    readonly attach: NarrativeSurfaceHostPhysicalIngressAttachInternalV1;
  }>
  | null {
  const registration = getNarrativeSurfaceHostPhysicalIngressRegistrationInternalV1(
    session,
    portalContainer,
    inputRouter,
  );
  if (registration === null) return null;
  const attach = registration.attach;
  if (
    !isNarrativeSurfaceHostPhysicalIngressRegistrationCurrentInternalV1(registration) ||
    attach === null || registration.generation !== null
  ) {
    throw new TypeError(narrativeSurfaceHostPhysicalIngressInvalidInternalV1);
  }
  const generation: NarrativeSurfaceHostPhysicalIngressGenerationInternalV1 = {
    active: true,
    runtime,
    detach: null,
    detachCalled: false,
  };
  registration.generation = generation;
  const context = Object.freeze({
    inputRouter,
    isGestureCurrent,
    isCurrentInternalV1: (): boolean =>
      isNarrativeSurfaceHostPhysicalIngressGenerationCurrentInternalV1(
        registration,
        generation,
      ),
  }) satisfies NarrativeSurfaceHostPhysicalIngressContextInternalV1;
  return Object.freeze({ registration, generation, context, attach });
}

function rollbackNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
  runtime: NarrativeStableHostRuntimeInternalV1,
  registration: NarrativeSurfaceHostPhysicalIngressRegistrationInternalV1,
  generation: NarrativeSurfaceHostPhysicalIngressGenerationInternalV1,
): void {
  fenceNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(registration, generation);
  detachNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(generation);
  try {
    runtime.attachment.releaseInternalV1();
  } catch {
    // Preserve the physical-ingress setup failure after best-effort runtime rollback.
  } finally {
    generation.runtime = null;
  }
}

export interface NarrativeSurfaceHostPropsInternalV1 {
  readonly session: NarrativeStableSessionInternalV1;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
  readonly isGestureCurrent: (gestureId: ManagedSurfaceGestureIdV1) => boolean;
}

interface NarrativeSurfaceEntryBoundaryPropsInternalV1 {
  readonly attachment: NarrativeStableHostAttachmentInternalV1;
  readonly entry: NarrativeStableHostRenderEntryInternalV1;
  readonly gate: NarrativeSurfaceEntryGateInternalV1;
  readonly children: ReactNode;
}

interface NarrativeSurfaceEntryBoundaryStateInternalV1 {
  readonly failed: boolean;
  readonly error: unknown;
}

type NarrativeSurfaceEntryGateStatusInternalV1 =
  | "pending"
  | "accepted"
  | "failed"
  | "cancelled";

interface NarrativeSurfaceEntryGateInternalV1 {
  status: NarrativeSurfaceEntryGateStatusInternalV1;
  runtime: NarrativeStableHostRuntimeInternalV1 | null;
  observedEntry: NarrativeStableHostRenderEntryInternalV1;
  observedRuntime: NarrativeStableHostRuntimeInternalV1;
}

interface NarrativeSurfaceMountedRuntimeInternalV1 {
  readonly runtime: NarrativeStableHostRuntimeInternalV1;
  readonly session: NarrativeStableSessionInternalV1;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
}

type NarrativeSurfaceHistoryEntryInternalV1 = Extract<
  NarrativeStableHostRenderEntryInternalV1,
  { readonly kind: "history" }
>;

interface NarrativeSurfaceFocusOwnerInternalV1 {
  readonly renderKey: NarrativeStableHostRenderEntryInternalV1["renderKey"];
  readonly kind: NarrativeStableHostRenderEntryInternalV1["kind"];
  readonly shell: HTMLDivElement;
}

interface NarrativeSurfaceHistoryOpenerInternalV1 {
  readonly renderKey: NarrativeSurfaceHistoryEntryInternalV1["renderKey"];
  readonly parentRenderKey: NarrativeSurfaceHistoryEntryInternalV1["parentRenderKey"];
  readonly opener: HTMLElement | null;
}

interface NarrativeSurfaceDomLifecycleInternalV1 {
  readonly portalContainer: HTMLDivElement;
  readonly shells: Map<NarrativeStableHostRenderEntryInternalV1["renderKey"], HTMLDivElement>;
  readonly snapshot: {
    current: ReturnType<
      NarrativeStableHostRuntimeInternalV1["renderSource"]["getSnapshotInternalV1"]
    >;
  };
  readonly previousSnapshot: {
    current: ReturnType<
      NarrativeStableHostRuntimeInternalV1["renderSource"]["getSnapshotInternalV1"]
    >;
  };
  readonly owner: { current: NarrativeSurfaceFocusOwnerInternalV1 | null };
  readonly rootPreviousOwner: {
    current: Readonly<{ readonly captured: true; readonly target: HTMLElement | null }> | null;
  };
  readonly historyOpener: { current: NarrativeSurfaceHistoryOpenerInternalV1 | null };
  readonly active: { current: boolean };
  readonly restoreGeneration: { current: number };
  readonly outsideFocusGeneration: { current: number };
}

const narrativeSurfaceTabbableSelectorInternalV1 = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusNarrativeSurfaceElementInternalV1(target: HTMLElement): void {
  try {
    target.focus({ preventScroll: true });
  } catch {
    // Physical focus failure never rolls back committed managed topology.
  }
}

function isEligibleNarrativePreviousOwnerInternalV1(
  target: Element | null,
  portalContainer: HTMLDivElement,
  ownerDocument: Document,
): target is HTMLElement {
  return target instanceof HTMLElement && target !== ownerDocument.body && target.isConnected &&
    target.ownerDocument === ownerDocument && !portalContainer.contains(target);
}

function isEligibleNarrativeHistoryOpenerInternalV1(
  target: Element | null,
  parentShell: HTMLDivElement,
): target is HTMLElement {
  return target instanceof HTMLElement && target !== target.ownerDocument.body &&
    target.isConnected && target.ownerDocument === parentShell.ownerDocument &&
    parentShell.contains(target);
}

function findNarrativeSurfaceFocusOwnerInternalV1(
  entries: readonly NarrativeStableHostRenderEntryInternalV1[],
): NarrativeStableHostRenderEntryInternalV1 | null {
  const history = entries.find((entry) =>
    entry.kind === "history" && (entry.phase === "preparing" || entry.phase === "active")
  );
  if (history !== undefined) return history;
  const activeRoot = entries.find((entry) => entry.kind === "dialogue" && entry.phase === "active");
  if (activeRoot !== undefined) return activeRoot;
  const roots = entries.filter((entry) => entry.kind === "dialogue");
  return roots.length === 1 && roots[0]?.phase === "preparing" ? roots[0] : null;
}

function trapNarrativeSurfaceTabInternalV1(
  event: ReactKeyboardEvent<HTMLDivElement>,
): void {
  const shell = event.currentTarget;
  const candidates = [...shell.querySelectorAll<HTMLElement>(
    narrativeSurfaceTabbableSelectorInternalV1,
  )].filter((candidate) =>
    candidate.isConnected && candidate.tabIndex >= 0 && candidate.closest("[inert]") === null
  );
  event.preventDefault();
  if (candidates.length === 0) {
    focusNarrativeSurfaceElementInternalV1(shell);
    return;
  }
  const activeIndex = candidates.indexOf(shell.ownerDocument.activeElement as HTMLElement);
  const nextIndex = event.shiftKey
    ? activeIndex <= 0 ? candidates.length - 1 : activeIndex - 1
    : activeIndex < 0 || activeIndex === candidates.length - 1
    ? 0
    : activeIndex + 1;
  const next = candidates[nextIndex];
  if (next !== undefined) focusNarrativeSurfaceElementInternalV1(next);
}

function narrativeSurfaceOwnerMatchesInternalV1(
  lifecycle: NarrativeSurfaceDomLifecycleInternalV1,
  entry: NarrativeStableHostRenderEntryInternalV1,
  shell: HTMLDivElement,
): boolean {
  const owner = lifecycle.owner.current;
  return lifecycle.active.current && owner?.renderKey === entry.renderKey &&
    owner.shell === shell && lifecycle.snapshot.current.entries.includes(entry);
}

function deactivateNarrativeSurfaceDomLifecycleInternalV1(
  lifecycle: NarrativeSurfaceDomLifecycleInternalV1,
): void {
  lifecycle.active.current = false;
  lifecycle.restoreGeneration.current += 1;
  lifecycle.outsideFocusGeneration.current += 1;
  lifecycle.owner.current = null;
  lifecycle.historyOpener.current = null;
  lifecycle.rootPreviousOwner.current = null;
  lifecycle.shells.clear();
}

function failNarrativeSurfaceEntryBeforeReadyInternalV1(
  attachment: NarrativeStableHostAttachmentInternalV1,
  entry: NarrativeStableHostRenderEntryInternalV1,
  gate: NarrativeSurfaceEntryGateInternalV1,
): void {
  if (gate.status !== "pending" || entry.preparation === null) return;
  try {
    const result = entry.kind === "dialogue"
      ? attachment.settleRootReadinessFailedInternalV1(entry.preparation)
      : attachment.settleHistoryReadinessFailedInternalV1(entry.preparation);
    gate.status = result.kind === "settled" ? "failed" : "cancelled";
  } catch {
    gate.status = "cancelled";
  }
}

class NarrativeSurfaceEntryBoundaryInternalV1 extends Component<
  NarrativeSurfaceEntryBoundaryPropsInternalV1,
  NarrativeSurfaceEntryBoundaryStateInternalV1
> {
  state: NarrativeSurfaceEntryBoundaryStateInternalV1 = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): NarrativeSurfaceEntryBoundaryStateInternalV1 {
    return { failed: true, error };
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    failNarrativeSurfaceEntryBeforeReadyInternalV1(
      this.props.attachment,
      this.props.entry,
      this.props.gate,
    );
  }

  componentDidUpdate(
    previousProps: NarrativeSurfaceEntryBoundaryPropsInternalV1,
  ): void {
    if (
      this.state.failed &&
      (previousProps.entry !== this.props.entry ||
        previousProps.attachment !== this.props.attachment) &&
      this.props.gate.status === "pending"
    ) {
      failNarrativeSurfaceEntryBeforeReadyInternalV1(
        this.props.attachment,
        this.props.entry,
        this.props.gate,
      );
    }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    if (
      this.props.entry.preparation !== null &&
      this.props.gate.status !== "accepted"
    ) return null;
    throw this.state.error;
  }
}

function NarrativeDialogueEntryRendererInternalV1(
  { entry }: Readonly<{
    readonly entry: Extract<
      NarrativeStableHostRenderEntryInternalV1,
      { readonly kind: "dialogue" }
    >;
  }>,
): ReactElement {
  const subscribe = useCallback(
    (listener: () => void) => entry.playerObservation.subscribeInternalV1(listener),
    [entry.playerObservation],
  );
  const getSnapshot = useCallback(
    () => entry.playerObservation.getSnapshotInternalV1(),
    [entry.playerObservation],
  );
  const playerView = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return createElement(entry.rendererComponent, {
    ...entry.rendererProps,
    playerProfile: playerView.playerProfile,
    playerView,
  });
}

function NarrativeHistoryEntryRendererInternalV1(
  { entry }: Readonly<{
    readonly entry: Extract<
      NarrativeStableHostRenderEntryInternalV1,
      { readonly kind: "history" }
    >;
  }>,
): ReactElement {
  const subscribe = useCallback(
    (listener: () => void) => entry.historyObservation.subscribeInternalV1(listener),
    [entry.historyObservation],
  );
  const getSnapshot = useCallback(
    () => entry.historyObservation.getSnapshotInternalV1(),
    [entry.historyObservation],
  );
  const history = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return createElement(entry.rendererComponent, {
    ...entry.rendererProps,
    history,
  });
}

function NarrativeSurfaceEntryShellInternalV1(
  {
    runtime,
    entry,
    gate,
    portalContainer,
    lifecycle,
    focusOwner,
    suppressImmediateFocus,
    armPointerFence,
  }: Readonly<{
    readonly runtime: NarrativeStableHostRuntimeInternalV1;
    readonly entry: NarrativeStableHostRenderEntryInternalV1;
    readonly gate: NarrativeSurfaceEntryGateInternalV1;
    readonly portalContainer: HTMLDivElement;
    readonly lifecycle: NarrativeSurfaceDomLifecycleInternalV1;
    readonly focusOwner: boolean;
    readonly suppressImmediateFocus: boolean;
    readonly armPointerFence: ReturnType<typeof useStagePointerGestureFenceV1>;
  }>,
): ReactElement {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mountGeneration = useRef(0);
  const [readinessExposureGeneration, setReadinessExposureGeneration] = useState(0);
  const backdropPointer = useRef<number | null>(null);
  const entryKind = entry.kind;
  const entryRenderKey = entry.renderKey;
  const historyParentRenderKey = entry.kind === "history" ? entry.parentRenderKey : null;
  const setShell = useCallback((shell: HTMLDivElement | null): void => {
    shellRef.current = shell;
    if (shell === null) {
      lifecycle.shells.delete(entryRenderKey);
    } else {
      lifecycle.shells.set(entryRenderKey, shell);
    }
  }, [entryRenderKey, lifecycle]);
  useLayoutEffect(() => {
    if (!focusOwner) return;
    const shell = shellRef.current;
    if (shell === null || !shell.isConnected) return;
    if (entryKind === "dialogue") {
      if (lifecycle.rootPreviousOwner.current === null) {
        const ownerDocument = shell.ownerDocument;
        const activeElement = ownerDocument.activeElement;
        lifecycle.rootPreviousOwner.current = Object.freeze({
          captured: true as const,
          target: isEligibleNarrativePreviousOwnerInternalV1(
              activeElement,
              lifecycle.portalContainer,
              ownerDocument,
            )
            ? activeElement
            : null,
        });
      }
    } else if (lifecycle.historyOpener.current?.renderKey !== entryRenderKey) {
      const parentShell = lifecycle.shells.get(historyParentRenderKey!);
      const activeElement = shell.ownerDocument.activeElement;
      lifecycle.historyOpener.current = {
        renderKey: entryRenderKey,
        parentRenderKey: historyParentRenderKey!,
        opener: parentShell !== undefined &&
            isEligibleNarrativeHistoryOpenerInternalV1(activeElement, parentShell)
          ? activeElement
          : null,
      };
    }
    lifecycle.owner.current = {
      renderKey: entryRenderKey,
      kind: entryKind,
      shell,
    };
    if (
      !suppressImmediateFocus && shell.closest("[inert]") === null &&
      lifecycle.portalContainer.closest("[inert]") === null
    ) {
      focusNarrativeSurfaceElementInternalV1(shell);
    }
  }, [
    entryKind,
    entryRenderKey,
    focusOwner,
    historyParentRenderKey,
    lifecycle,
    suppressImmediateFocus,
  ]);
  useLayoutEffect(() => {
    const generation = mountGeneration.current + 1;
    mountGeneration.current = generation;
    if (gate.status === "accepted" && gate.runtime === runtime) {
      return () => {
        if (mountGeneration.current === generation) mountGeneration.current += 1;
      };
    }
    if (gate.status !== "pending") {
      return () => {
        if (mountGeneration.current === generation) mountGeneration.current += 1;
      };
    }
    const shell = shellRef.current;
    if (shell === null) return undefined;
    let effectActive = true;
    let awaitingExposure = false;
    let exposureObserver: MutationObserver | null = null;
    let exposureObservationActive = false;
    const stopExposureObservation = (): void => {
      effectActive = false;
      if (!exposureObservationActive) return;
      exposureObservationActive = false;
      exposureObserver?.disconnect();
      exposureObserver = null;
    };
    const externalInert = (): boolean => portalContainer.closest("[inert]") !== null;
    for (
      let ancestor: Element | null = portalContainer;
      ancestor !== null;
      ancestor = ancestor.parentElement
    ) {
      if (typeof MutationObserver !== "function") break;
      exposureObserver ??= new MutationObserver(() => {
        if (
          !effectActive || !awaitingExposure || shellRef.current !== shell ||
          !shell.isConnected || externalInert()
        ) return;
        awaitingExposure = false;
        stopExposureObservation();
        setReadinessExposureGeneration((current) => current + 1);
      });
      exposureObserver.observe(ancestor, { attributes: true, attributeFilter: ["inert"] });
      exposureObservationActive = true;
    }
    if (externalInert()) {
      awaitingExposure = true;
      return () => {
        stopExposureObservation();
        if (mountGeneration.current === generation) mountGeneration.current += 1;
      };
    }
    const prepared = prepareNarrativeStableHostReadyCommitInternalV1({
      hostRuntime: runtime,
      renderEntry: entry,
      portalShell: shell,
      initialFocusTarget: shell,
    });
    if (prepared.kind === "reattached") {
      stopExposureObservation();
      gate.status = "accepted";
      gate.runtime = runtime;
    } else if (prepared.kind !== "prepared" || entry.preparation === null) {
      stopExposureObservation();
      if (entry.preparation !== null) {
        failNarrativeSurfaceEntryBeforeReadyInternalV1(
          runtime.attachment,
          entry,
          gate,
        );
      } else {
        throw new TypeError("ui.narrative_stable_host_attachment_invalid");
      }
    } else {
      const settleReady = entry.kind === "dialogue"
        ? () =>
          runtime.attachment.settleRootReadinessReadyInternalV1(
            entry.preparation!,
            prepared.readyCommit,
          )
        : () =>
          runtime.attachment.settleHistoryReadinessReadyInternalV1(
            entry.preparation!,
            prepared.readyCommit,
          );
      queueMicrotask(() => {
        if (
          gate.status !== "pending" || mountGeneration.current !== generation ||
          shellRef.current !== shell
        ) {
          stopExposureObservation();
          return;
        }
        if (!shell.isConnected || !portalContainer.contains(shell)) {
          stopExposureObservation();
          failNarrativeSurfaceEntryBeforeReadyInternalV1(
            runtime.attachment,
            entry,
            gate,
          );
          return;
        }
        if (externalInert()) {
          awaitingExposure = true;
          return;
        }
        stopExposureObservation();
        const result = settleReady();
        gate.status = result.kind === "settled" ? "accepted" : "cancelled";
        if (result.kind === "settled") gate.runtime = runtime;
      });
    }
    return () => {
      stopExposureObservation();
      if (mountGeneration.current === generation) mountGeneration.current += 1;
    };
  }, [entry, gate, portalContainer, readinessExposureGeneration, runtime]);

  const inactive = entry.phase !== "active";
  const preparing = entry.phase === "preparing";
  const focusScopeInactive = !focusOwner;
  const renderer = entry.kind === "dialogue"
    ? <NarrativeDialogueEntryRendererInternalV1 key={entry.renderKey} entry={entry} />
    : <NarrativeHistoryEntryRendererInternalV1 entry={entry} />;
  return (
    <div
      ref={setShell}
      data-narrative-surface-focus-scope={entry.kind}
      tabIndex={-1}
      inert={focusScopeInactive ? true : undefined}
      aria-hidden={focusScopeInactive ? true : undefined}
      style={{
        pointerEvents: focusScopeInactive ? "none" : undefined,
      }}
      onKeyDown={(event) => {
        if (!narrativeSurfaceOwnerMatchesInternalV1(lifecycle, entry, event.currentTarget)) return;
        if (event.key === "Tab") {
          trapNarrativeSurfaceTabInternalV1(event);
          return;
        }
        if (event.key !== "Escape" || isDevDockEscapeOwnerTargetV1(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        if (entry.kind === "history") entry.controller.dismissInternalV1("escape");
      }}
      onPointerDown={(event) => {
        backdropPointer.current = null;
        if (
          entry.kind !== "history" || event.target !== event.currentTarget ||
          event.button !== 0 || !event.isPrimary ||
          !narrativeSurfaceOwnerMatchesInternalV1(lifecycle, entry, event.currentTarget)
        ) return;
        backdropPointer.current = event.pointerId;
        event.preventDefault();
      }}
      onPointerUp={(event) => {
        const pointerId = backdropPointer.current;
        backdropPointer.current = null;
        if (
          entry.kind !== "history" || event.target !== event.currentTarget ||
          event.button !== 0 || !event.isPrimary || pointerId !== event.pointerId ||
          !narrativeSurfaceOwnerMatchesInternalV1(lifecycle, entry, event.currentTarget)
        ) return;
        armPointerFence(event);
        entry.controller.dismissInternalV1("backdrop");
      }}
      onPointerCancel={() => {
        backdropPointer.current = null;
      }}
      onLostPointerCapture={() => {
        backdropPointer.current = null;
      }}
    >
      <div
        data-narrative-surface-render-shell={entry.kind}
        inert={inactive ? true : undefined}
        aria-hidden={inactive ? true : undefined}
        style={{
          visibility: preparing ? "hidden" : undefined,
          pointerEvents: inactive ? "none" : undefined,
        }}
      >
        {renderer}
      </div>
    </div>
  );
}

function NarrativeSurfaceEntryInternalV1(
  {
    runtime,
    entry,
    portalContainer,
    lifecycle,
    focusOwner,
    suppressImmediateFocus,
    armPointerFence,
  }: Readonly<{
    readonly runtime: NarrativeStableHostRuntimeInternalV1;
    readonly entry: NarrativeStableHostRenderEntryInternalV1;
    readonly portalContainer: HTMLDivElement;
    readonly lifecycle: NarrativeSurfaceDomLifecycleInternalV1;
    readonly focusOwner: boolean;
    readonly suppressImmediateFocus: boolean;
    readonly armPointerFence: ReturnType<typeof useStagePointerGestureFenceV1>;
  }>,
): ReactElement {
  const gateRef = useRef<NarrativeSurfaceEntryGateInternalV1 | null>(null);
  if (gateRef.current === null) {
    gateRef.current = {
      status: "pending",
      runtime: null,
      observedEntry: entry,
      observedRuntime: runtime,
    };
  }
  const gate = gateRef.current;
  return (
    <>
      <NarrativeSurfaceEntryCurrentnessCommitInternalV1
        entry={entry}
        gate={gate}
        runtime={runtime}
      />
      <NarrativeSurfaceEntryBoundaryInternalV1
        attachment={runtime.attachment}
        entry={entry}
        gate={gate}
      >
        <NarrativeSurfaceEntryShellInternalV1
          runtime={runtime}
          entry={entry}
          gate={gate}
          portalContainer={portalContainer}
          lifecycle={lifecycle}
          focusOwner={focusOwner}
          suppressImmediateFocus={suppressImmediateFocus}
          armPointerFence={armPointerFence}
        />
      </NarrativeSurfaceEntryBoundaryInternalV1>
    </>
  );
}

function NarrativeSurfaceEntryCurrentnessCommitInternalV1(props: {
  readonly entry: NarrativeStableHostRenderEntryInternalV1;
  readonly gate: NarrativeSurfaceEntryGateInternalV1;
  readonly runtime: NarrativeStableHostRuntimeInternalV1;
}): null {
  useLayoutEffect(() => {
    if (
      props.gate.observedEntry === props.entry &&
      props.gate.observedRuntime === props.runtime
    ) return;
    props.gate.observedEntry = props.entry;
    props.gate.observedRuntime = props.runtime;
    if (props.gate.status === "cancelled") {
      props.gate.status = "pending";
      props.gate.runtime = null;
    }
  }, [props.entry, props.gate, props.runtime]);
  return null;
}

function NarrativeSurfaceCurrentnessCommitInternalV1(props: {
  readonly lifecycle: NarrativeSurfaceDomLifecycleInternalV1;
  readonly snapshot: ReturnType<
    NarrativeStableHostRuntimeInternalV1["renderSource"]["getSnapshotInternalV1"]
  >;
}): null {
  useLayoutEffect(() => {
    props.lifecycle.snapshot.current = props.snapshot;
  }, [props.lifecycle, props.snapshot]);
  return null;
}

function NarrativeSurfaceRuntimeInternalV1(
  { runtime, portalContainer }: Readonly<{
    readonly runtime: NarrativeStableHostRuntimeInternalV1;
    readonly portalContainer: HTMLDivElement;
  }>,
): ReactElement | null {
  const subscribe = useCallback(
    (listener: () => void) => runtime.renderSource.subscribeInternalV1(listener),
    [runtime.renderSource],
  );
  const getSnapshot = useCallback(
    () => runtime.renderSource.getSnapshotInternalV1(),
    [runtime.renderSource],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const lifecycleRef = useRef<NarrativeSurfaceDomLifecycleInternalV1 | null>(null);
  if (lifecycleRef.current === null) {
    lifecycleRef.current = {
      portalContainer,
      shells: new Map(),
      snapshot: { current: snapshot },
      previousSnapshot: { current: snapshot },
      owner: { current: null },
      rootPreviousOwner: { current: null },
      historyOpener: { current: null },
      active: { current: false },
      restoreGeneration: { current: 0 },
      outsideFocusGeneration: { current: 0 },
    };
  }
  const lifecycle = lifecycleRef.current;
  const armPointerFence = useStagePointerGestureFenceV1("narrative");
  useStageInputIsolationV1("narrative", snapshot.entries.length > 0);

  const focusOwnerEntry = findNarrativeSurfaceFocusOwnerInternalV1(snapshot.entries);
  const previousHistory = lifecycle.previousSnapshot.current.entries.find((entry) =>
    entry.kind === "history" &&
    !snapshot.entries.some((current) =>
      current.kind === "history" && current.renderKey === entry.renderKey
    )
  );
  const suppressImmediateParentFocus = focusOwnerEntry?.kind === "dialogue" &&
    previousHistory?.kind === "history" &&
    previousHistory.parentRenderKey === focusOwnerEntry.renderKey &&
    !snapshot.entries.some((entry) => entry.kind === "history");

  useLayoutEffect(() => {
    lifecycle.active.current = true;
    const ownerDocument = lifecycle.portalContainer.ownerDocument;
    const onFocusIn = (event: FocusEvent): void => {
      const owner = lifecycle.owner.current;
      const target = event.target;
      if (
        owner === null || !(target instanceof HTMLElement) || owner.shell.contains(target) ||
        isDevDockEscapeOwnerTargetV1(target) || owner.shell.closest("[inert]") !== null ||
        lifecycle.portalContainer.closest("[inert]") !== null
      ) return;
      const generation = lifecycle.outsideFocusGeneration.current + 1;
      lifecycle.outsideFocusGeneration.current = generation;
      queueMicrotask(() => {
        if (
          !lifecycle.active.current ||
          lifecycle.outsideFocusGeneration.current !== generation ||
          lifecycle.owner.current !== owner || !owner.shell.isConnected ||
          owner.shell.closest("[inert]") !== null ||
          lifecycle.portalContainer.closest("[inert]") !== null
        ) return;
        const currentOwner = findNarrativeSurfaceFocusOwnerInternalV1(
          lifecycle.snapshot.current.entries,
        );
        if (currentOwner?.renderKey !== owner.renderKey) return;
        focusNarrativeSurfaceElementInternalV1(owner.shell);
      });
    };
    ownerDocument.addEventListener("focusin", onFocusIn);
    return () => {
      deactivateNarrativeSurfaceDomLifecycleInternalV1(lifecycle);
      ownerDocument.removeEventListener("focusin", onFocusIn);
    };
  }, [lifecycle]);

  useLayoutEffect(() => {
    const previous = lifecycle.previousSnapshot.current;
    lifecycle.previousSnapshot.current = snapshot;
    if (focusOwnerEntry === null) lifecycle.owner.current = null;

    const retiredHistory = previous.entries.find((entry) =>
      entry.kind === "history" &&
      !snapshot.entries.some((current) =>
        current.kind === "history" && current.renderKey === entry.renderKey
      )
    );
    if (retiredHistory?.kind === "history") {
      const opener = lifecycle.historyOpener.current?.renderKey === retiredHistory.renderKey
        ? lifecycle.historyOpener.current
        : null;
      lifecycle.historyOpener.current = null;
      const survivingParent = snapshot.entries.find((entry) =>
        entry.kind === "dialogue" && entry.renderKey === retiredHistory.parentRenderKey &&
        entry.phase === "active"
      );
      const successorHistory = snapshot.entries.some((entry) => entry.kind === "history");
      if (
        opener !== null && survivingParent?.kind === "dialogue" && !successorHistory &&
        isNarrativeStableHostRuntimeCurrentInternalV1(runtime)
      ) {
        const generation = lifecycle.restoreGeneration.current + 1;
        lifecycle.restoreGeneration.current = generation;
        queueMicrotask(() => {
          if (
            !lifecycle.active.current || lifecycle.restoreGeneration.current !== generation ||
            !isNarrativeStableHostRuntimeCurrentInternalV1(runtime)
          ) return;
          const current = lifecycle.snapshot.current;
          if (current.entries.some((entry) => entry.kind === "history")) return;
          const parent = current.entries.find((entry) =>
            entry.kind === "dialogue" && entry.renderKey === opener.parentRenderKey &&
            entry.phase === "active"
          );
          const parentShell = lifecycle.shells.get(opener.parentRenderKey);
          if (
            parent?.kind !== "dialogue" || parentShell === undefined ||
            !parentShell.isConnected || parentShell.closest("[inert]") !== null ||
            lifecycle.portalContainer.closest("[inert]") !== null
          ) return;
          const activeElement = parentShell.ownerDocument.activeElement;
          if (
            activeElement instanceof HTMLElement &&
            activeElement !== parentShell.ownerDocument.body &&
            !lifecycle.portalContainer.contains(activeElement)
          ) return;
          const target = opener.opener !== null &&
              isEligibleNarrativeHistoryOpenerInternalV1(opener.opener, parentShell)
            ? opener.opener
            : parentShell;
          focusNarrativeSurfaceElementInternalV1(target);
        });
      }
    }

    const previousHadRoot = previous.entries.some((entry) => entry.kind === "dialogue");
    const currentHasRoot = snapshot.entries.some((entry) => entry.kind === "dialogue");
    if (previousHadRoot && !currentHasRoot) {
      const previousOwner = lifecycle.rootPreviousOwner.current;
      lifecycle.rootPreviousOwner.current = null;
      lifecycle.historyOpener.current = null;
      if (
        previousOwner !== null && isNarrativeStableHostRuntimeCurrentInternalV1(runtime)
      ) {
        const generation = lifecycle.restoreGeneration.current + 1;
        lifecycle.restoreGeneration.current = generation;
        queueMicrotask(() => {
          if (
            !lifecycle.active.current || lifecycle.restoreGeneration.current !== generation ||
            !isNarrativeStableHostRuntimeCurrentInternalV1(runtime) ||
            lifecycle.snapshot.current.entries.some((entry) => entry.kind === "dialogue")
          ) return;
          const target = previousOwner.target;
          if (
            target === null || !target.isConnected ||
            target.ownerDocument !== lifecycle.portalContainer.ownerDocument ||
            lifecycle.portalContainer.closest("[inert]") !== null
          ) return;
          const activeElement = target.ownerDocument.activeElement;
          if (
            activeElement instanceof HTMLElement && activeElement !== target.ownerDocument.body &&
            !lifecycle.portalContainer.contains(activeElement)
          ) return;
          focusNarrativeSurfaceElementInternalV1(target);
        });
      }
    }
  }, [focusOwnerEntry, lifecycle, runtime, snapshot]);

  return createPortal(
    <>
      <NarrativeSurfaceCurrentnessCommitInternalV1
        lifecycle={lifecycle}
        snapshot={snapshot}
      />
      {snapshot.entries.map((entry) => (
        <NarrativeSurfaceEntryInternalV1
          key={entry.renderKey}
          runtime={runtime}
          entry={entry}
          portalContainer={portalContainer}
          lifecycle={lifecycle}
          focusOwner={focusOwnerEntry?.renderKey === entry.renderKey}
          suppressImmediateFocus={suppressImmediateParentFocus &&
            focusOwnerEntry?.renderKey === entry.renderKey}
          armPointerFence={armPointerFence}
        />
      ))}
    </>,
    portalContainer,
  );
}

export function NarrativeSurfaceHostInternalV1(
  props: NarrativeSurfaceHostPropsInternalV1,
): ReactElement | null {
  const hostIdentity = useRef<object | null>(null);
  if (hostIdentity.current === null) hostIdentity.current = Object.freeze({});
  const isGestureCurrent = useRef(props.isGestureCurrent);
  useLayoutEffect(() => {
    isGestureCurrent.current = props.isGestureCurrent;
  }, [props.isGestureCurrent]);
  const stableIsGestureCurrent = useCallback(
    (gestureId: ManagedSurfaceGestureIdV1) => isGestureCurrent.current(gestureId),
    [],
  );
  const [mounted, setMounted] = useState<NarrativeSurfaceMountedRuntimeInternalV1 | null>(null);
  useLayoutEffect(() => {
    const next = createNarrativeStableHostRuntimeInternalV1({
      session: props.session,
      hostIdentity: hostIdentity.current!,
      portalContainer: props.portalContainer,
      inputRouter: props.inputRouter,
      isGestureCurrent: stableIsGestureCurrent,
    });
    let physicalIngress: ReturnType<
      typeof claimNarrativeSurfaceHostPhysicalIngressGenerationInternalV1
    >;
    try {
      physicalIngress = claimNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
        props.session,
        props.portalContainer,
        props.inputRouter,
        stableIsGestureCurrent,
        next,
      );
    } catch (error) {
      try {
        next.attachment.releaseInternalV1();
      } catch {
        // Preserve the physical-ingress claim failure after best-effort runtime rollback.
      }
      throw error;
    }
    if (physicalIngress !== null) {
      let detach: unknown;
      try {
        detach = Reflect.apply(physicalIngress.attach, undefined, [physicalIngress.context]);
      } catch (error) {
        rollbackNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
          next,
          physicalIngress.registration,
          physicalIngress.generation,
        );
        throw error;
      }
      if (!isNarrativeSurfaceHostPhysicalIngressCallableInternalV1(detach)) {
        rollbackNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
          next,
          physicalIngress.registration,
          physicalIngress.generation,
        );
        throw new TypeError(narrativeSurfaceHostPhysicalIngressInvalidInternalV1);
      }
      physicalIngress.generation.detach = detach as () => void;
      if (
        !isNarrativeSurfaceHostPhysicalIngressGenerationCurrentInternalV1(
          physicalIngress.registration,
          physicalIngress.generation,
        )
      ) {
        rollbackNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
          next,
          physicalIngress.registration,
          physicalIngress.generation,
        );
        setMounted(null);
        return undefined;
      }
    }
    setMounted(Object.freeze({
      runtime: next,
      session: props.session,
      portalContainer: props.portalContainer,
      inputRouter: props.inputRouter,
    }));
    return () => {
      if (physicalIngress === null) {
        next.attachment.releaseInternalV1();
        return;
      }
      fenceNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
        physicalIngress.registration,
        physicalIngress.generation,
      );
      try {
        detachNarrativeSurfaceHostPhysicalIngressGenerationInternalV1(
          physicalIngress.generation,
        );
      } finally {
        try {
          next.attachment.releaseInternalV1();
        } finally {
          physicalIngress.generation.runtime = null;
        }
      }
    };
  }, [props.inputRouter, props.portalContainer, props.session, stableIsGestureCurrent]);
  const runtime = mounted !== null && mounted.session === props.session &&
      mounted.portalContainer === props.portalContainer && mounted.inputRouter === props.inputRouter
    ? mounted.runtime
    : null;
  return runtime === null ? null : (
    <NarrativeSurfaceRuntimeInternalV1
      runtime={runtime}
      portalContainer={props.portalContainer}
    />
  );
}
