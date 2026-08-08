// SPDX-License-Identifier: MIT
import {
  Component,
  createElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ElementType, ErrorInfo, ReactElement } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

import {
  isDevDockEscapeOwnerTargetV1,
  useDevDockPortalTargetRegistrationV1,
} from "../debug/dev-dock-portal-coordinator.tsx";
import {
  inputHandledV1,
  inputIgnoredV1,
  systemInputActionIdsV1,
  type InputEventV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import type {
  ManagedSurfaceDismissKindV1,
  ManagedSurfaceInstanceIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import {
  useStageInputIsolationV1,
  useStagePointerGestureFenceV1,
  useStageSystemFocusScopeRegistrationV1,
  useStageSystemPortalContainerV1,
} from "../shell/game-stage.tsx";
import type {
  SystemDialogConfirmationInvocationInternalV1,
  SystemDialogRequiredPortBindingInternalV1,
  SystemDialogRootRequestInternalV1,
  SystemDialogSessionV1,
} from "./system-dialog-managed-contract.ts";
import {
  resolveSystemDialogSessionInternalV1,
  type SystemDialogConfirmationIntentResultInternalV1,
  type SystemDialogConfirmationOpenResultInternalV1,
  type SystemDialogConfirmationOperationBindingInternalV1,
  type SystemDialogHostAttachmentInternalV1,
  type SystemDialogConfirmationHostRenderEntryInternalV1,
  type SystemDialogHostRenderEntryInternalV1,
  type SystemDialogManagedSessionInternalV1,
  type SystemDialogRootCatalogInternalV1,
} from "./system-dialog-managed-session.ts";
import styles from "../overlays/overlay-host.module.css";

export type SystemDialogHostConfirmationRequestResultInternalV1 =
  | {
    readonly kind: "preparing";
    readonly code: "system_dialog.confirmation_preparation_started";
  }
  | Exclude<SystemDialogConfirmationOpenResultInternalV1, { readonly kind: "preparing" }>
  | {
    readonly kind: "rejected";
    readonly code: "system_dialog.confirmation_opener_invalid";
  };

export interface SystemDialogHostConfirmationRequestInternalV1 {
  readonly invocation: SystemDialogConfirmationInvocationInternalV1;
  readonly operationBinding: SystemDialogConfirmationOperationBindingInternalV1;
}

export interface SystemDialogSavesConfirmationIntentInternalV1 {
  requestConfirmationInternalV1(
    input: SystemDialogHostConfirmationRequestInternalV1,
  ): SystemDialogHostConfirmationRequestResultInternalV1;
}

export interface SystemDialogRootIntentInternalV1 {
  close(): void;
}

export interface SystemDialogRootRendererPropsInternalV1 {
  readonly rootRequest: SystemDialogRootRequestInternalV1;
  readonly contentConfig: unknown;
  readonly requiredPortBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
  readonly confirmationIntent: SystemDialogSavesConfirmationIntentInternalV1 | null;
  readonly rootIntent: SystemDialogRootIntentInternalV1;
}

export interface SystemDialogConfirmationRendererPropsInternalV1 {
  readonly invocation: SystemDialogConfirmationInvocationInternalV1;
  readonly parentContentConfig: unknown;
  readonly titleId: string;
  readonly requiredPortBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
  readonly controller: {
    dispatchOnceInternalV1(): SystemDialogConfirmationIntentResultInternalV1;
    cancelInternalV1(
      dismissKind: ManagedSurfaceDismissKindV1,
    ): SystemDialogConfirmationIntentResultInternalV1;
  };
}

export interface SystemDialogManagedHostPropsInternalV1 {
  readonly session: SystemDialogSessionV1;
  readonly catalog: SystemDialogRootCatalogInternalV1;
  readonly inputRouter: InputRouterV1;
}

const systemDialogTabbableTargetSelectorInternalV1 =
  'button, [href], input, select, textarea, summary, [contenteditable="true"], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

function systemDialogTabbableTargetsInternalV1(root: HTMLElement): readonly HTMLElement[] {
  const view = root.ownerDocument.defaultView;
  return [...root.querySelectorAll<HTMLElement>(systemDialogTabbableTargetSelectorInternalV1)]
    .filter((target) => {
      if (
        target.tabIndex < 0 ||
        target.matches(":disabled") ||
        target.closest('[hidden], [inert], [aria-hidden="true"], [data-devdock-surface]') !==
          null ||
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

function routeSystemDialogTrappedTabInternalV1(
  event: ReactKeyboardEvent<HTMLDivElement>,
): void {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const root = event.currentTarget;
  const targets = systemDialogTabbableTargetsInternalV1(root);
  if (targets.length === 0) {
    event.preventDefault();
    root.focus({ preventScroll: true });
    return;
  }
  const activeIndex = targets.findIndex((target) => target === root.ownerDocument.activeElement);
  const nextIndex = activeIndex < 0
    ? event.shiftKey ? targets.length - 1 : 0
    : event.shiftKey
    ? (activeIndex - 1 + targets.length) % targets.length
    : (activeIndex + 1) % targets.length;
  event.preventDefault();
  targets[nextIndex]!.focus({ preventScroll: true });
}

function focusFirstSystemDialogTargetInternalV1(root: HTMLElement): void {
  const target = systemDialogTabbableTargetsInternalV1(root)[0] ?? root;
  target.focus({ preventScroll: true });
}

function readSystemDialogReturnFocusTargetInternalV1(): HTMLElement | null {
  if (typeof document === "undefined" || typeof HTMLElement === "undefined") return null;
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement !== document.body
    ? activeElement
    : null;
}

function restoreSystemDialogOwnedFocusInternalV1(
  target: HTMLElement | null | undefined,
  host: HTMLElement | null,
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

type CandidateSettlementV1 = "pending" | "accepted_ready" | "failed" | "cancelled";

interface CandidateSettlementGateV1 {
  status: CandidateSettlementV1;
  mountGeneration: number;
}

function candidateGateV1(): CandidateSettlementGateV1 {
  return { status: "pending", mountGeneration: 0 };
}

function acceptedReadyV1(
  attachment: SystemDialogHostAttachmentInternalV1,
  surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  gate: CandidateSettlementGateV1,
): void {
  if (gate.status !== "pending" || !attachment.isAcknowledgmentOpen()) return;
  const receipt = attachment.readyCandidateInternalV1(surfaceInstanceId);
  gate.status = receipt.kind === "applied" && receipt.code === "surface.readiness_ready"
    ? "accepted_ready"
    : "cancelled";
}

function failedBeforeReadyV1(
  attachment: SystemDialogHostAttachmentInternalV1,
  surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  gate: CandidateSettlementGateV1,
  error: unknown,
): void {
  if (gate.status !== "pending" || !attachment.isAcknowledgmentOpen()) return;
  const receipt = attachment.failCandidateInternalV1(surfaceInstanceId, error);
  gate.status = receipt.kind === "applied" && receipt.code === "surface.readiness_failed"
    ? "failed"
    : "cancelled";
}

class SystemDialogCandidateBoundaryInternalV1 extends Component<
  {
    readonly attachment: SystemDialogHostAttachmentInternalV1;
    readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
    readonly gate: CandidateSettlementGateV1;
    readonly children: ReactElement;
  },
  | { readonly kind: "healthy" }
  | { readonly kind: "failed"; readonly error: unknown }
> {
  state:
    | { readonly kind: "healthy" }
    | { readonly kind: "failed"; readonly error: unknown } = { kind: "healthy" };

  static getDerivedStateFromError(
    error: unknown,
  ): { readonly kind: "failed"; readonly error: unknown } {
    return { kind: "failed", error };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    failedBeforeReadyV1(
      this.props.attachment,
      this.props.surfaceInstanceId,
      this.props.gate,
      error,
    );
  }

  render(): ReactElement | null {
    if (this.state.kind === "healthy") return this.props.children;
    if (this.props.gate.status === "accepted_ready") throw this.state.error;
    return null;
  }
}

function SystemDialogCandidateEntryInternalV1(props: {
  readonly attachment: SystemDialogHostAttachmentInternalV1;
  readonly entry: SystemDialogHostRenderEntryInternalV1;
  readonly parentRootEntry:
    | Extract<
      SystemDialogHostRenderEntryInternalV1,
      { readonly kind: "root" }
    >
    | null;
  readonly portalContainer: HTMLDivElement;
  readonly parentBlockedByChild: boolean;
  readonly deferRootFocusRecovery: boolean;
  readonly childFocusLedger: Map<ManagedSurfaceInstanceIdV1, ChildFocusRecordInternalV1>;
}): ReactElement {
  const gateRef = useRef<CandidateSettlementGateV1 | null>(null);
  gateRef.current ??= candidateGateV1();
  const gate = gateRef.current;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const deferRootFocusRecoveryRef = useRef(false);
  if (props.deferRootFocusRecovery) deferRootFocusRecoveryRef.current = true;
  const [shellElement, setShellElement] = useState<HTMLDivElement | null>(null);
  const setShellRef = useCallback((element: HTMLDivElement | null): void => {
    shellRef.current = element;
    setShellElement(element);
  }, []);
  const preparing = props.entry.phase === "preparing";
  const activeConfirmation = props.entry.kind === "confirmation" && props.entry.phase === "active";
  const confirmationEntry = props.entry.kind === "confirmation" ? props.entry : null;
  const readyRoot = props.entry.kind === "root" && props.entry.phase === "active";
  const activeRoot = readyRoot && !props.parentBlockedByChild;
  const activeFocusOwner = activeConfirmation || activeRoot;
  const armPointerFence = useStagePointerGestureFenceV1("system");
  useStageSystemFocusScopeRegistrationV1(activeFocusOwner ? shellElement : null);
  useDevDockPortalTargetRegistrationV1(
    "system",
    activeFocusOwner ? shellElement : null,
  );
  const rootEntry = props.entry.kind === "root" ? props.entry : null;
  const rootLifecycleIntents = rootEntry?.lifecycleIntents ?? null;
  const rootSurfaceInstanceId = rootEntry?.surfaceInstanceId ?? null;
  const rootController = rootEntry?.controller ?? null;
  const rootIntent = useMemo<SystemDialogRootIntentInternalV1 | null>(() => {
    if (rootController === null) return null;
    return Object.freeze({
      close(): void {
        rootController.closeInternalV1();
      },
    });
  }, [rootController]);
  const confirmationIntent = useMemo<SystemDialogSavesConfirmationIntentInternalV1 | null>(() => {
    if (rootSurfaceInstanceId === null || rootLifecycleIntents === null) return null;
    return Object.freeze({
      requestConfirmationInternalV1(
        input: SystemDialogHostConfirmationRequestInternalV1,
      ): SystemDialogHostConfirmationRequestResultInternalV1 {
        const rootShell = shellRef.current;
        const opener = rootShell?.ownerDocument.activeElement;
        if (
          rootShell === null ||
          !(opener instanceof HTMLElement) ||
          !opener.isConnected ||
          !rootShell.contains(opener)
        ) {
          return Object.freeze({
            kind: "rejected" as const,
            code: "system_dialog.confirmation_opener_invalid" as const,
          });
        }
        let invocation: SystemDialogConfirmationInvocationInternalV1;
        try {
          invocation = input.invocation;
        } catch {
          return Object.freeze({
            kind: "rejected" as const,
            code: "system_dialog.confirmation_invocation_invalid" as const,
          });
        }
        let operationBinding: SystemDialogConfirmationOperationBindingInternalV1;
        try {
          operationBinding = input.operationBinding;
        } catch {
          return Object.freeze({
            kind: "rejected" as const,
            code: "system_dialog.confirmation_operation_binding_invalid" as const,
          });
        }
        const result = rootLifecycleIntents.requestConfirmationInternalV1({
          invocation,
          operationBinding,
        });
        if (result.kind === "preparing") {
          props.childFocusLedger.set(
            result.surfaceInstanceId,
            Object.freeze({
              parentSurfaceInstanceId: rootSurfaceInstanceId,
              opener,
            }),
          );
          return Object.freeze({ kind: result.kind, code: result.code });
        }
        return result;
      },
    });
  }, [
    props.childFocusLedger,
    rootLifecycleIntents,
    rootSurfaceInstanceId,
  ]);
  const entryKind = props.entry.kind;
  const rootRequest = props.entry.kind === "root" ? props.entry.rootRequest : null;
  const rootResolution = props.entry.kind === "root" ? props.entry.resolution : null;
  const confirmationInvocation = props.entry.kind === "confirmation"
    ? props.entry.invocation
    : null;
  const confirmationController = props.entry.kind === "confirmation"
    ? props.entry.controller
    : null;
  const confirmationResolution = props.entry.kind === "confirmation"
    ? props.entry.resolution
    : null;
  const parentContentConfig = props.parentRootEntry?.resolution.contentConfigSnapshot.value;
  const renderer = useMemo(() => {
    if (entryKind === "root") {
      if (rootRequest === null || rootResolution === null) {
        throw new TypeError("ui.system_dialog_root_render_entry_invalid");
      }
      if (rootIntent === null) {
        throw new TypeError("ui.system_dialog_root_controller_missing");
      }
      const component = rootResolution.rendererComponent as ElementType<
        SystemDialogRootRendererPropsInternalV1
      >;
      return createElement(component, {
        rootRequest,
        contentConfig: rootResolution.contentConfigSnapshot.value,
        requiredPortBindings: rootResolution.requiredPortBindings,
        confirmationIntent,
        rootIntent,
      });
    }
    if (
      confirmationInvocation === null || confirmationController === null ||
      confirmationResolution === null
    ) {
      throw new TypeError("ui.system_dialog_confirmation_render_entry_invalid");
    }
    const component = confirmationResolution.rendererComponent as ElementType<
      SystemDialogConfirmationRendererPropsInternalV1
    >;
    return createElement(component, {
      invocation: confirmationInvocation,
      parentContentConfig,
      titleId: `${props.entry.surfaceInstanceId}-title`,
      requiredPortBindings: confirmationResolution.requiredPortBindings,
      controller: confirmationController,
    });
  }, [
    confirmationController,
    confirmationInvocation,
    confirmationResolution,
    entryKind,
    confirmationIntent,
    props.entry.surfaceInstanceId,
    parentContentConfig,
    rootRequest,
    rootResolution,
    rootIntent,
  ]);

  useLayoutEffect(() => {
    const generation = gate.mountGeneration + 1;
    gate.mountGeneration = generation;
    const shell = shellRef.current;
    queueMicrotask(() => {
      if (
        gate.status !== "pending" ||
        gate.mountGeneration !== generation ||
        shell === null ||
        !props.portalContainer.contains(shell)
      ) {
        return;
      }
      acceptedReadyV1(props.attachment, props.entry.surfaceInstanceId, gate);
    });
    return () => {
      if (gate.mountGeneration === generation) gate.mountGeneration += 1;
    };
  }, [gate, props.attachment, props.entry.surfaceInstanceId, props.portalContainer]);

  useLayoutEffect(() => {
    if (!activeConfirmation || shellElement === null) return;
    shellElement.focus({ preventScroll: true });
  }, [activeConfirmation, shellElement]);

  useLayoutEffect(() => {
    if (!readyRoot || shellElement === null || deferRootFocusRecoveryRef.current) return;
    focusFirstSystemDialogTargetInternalV1(shellElement);
  }, [readyRoot, shellElement]);

  useLayoutEffect(() => {
    if (!props.deferRootFocusRecovery) return;
    queueMicrotask(() => {
      deferRootFocusRecoveryRef.current = false;
    });
  }, [props.deferRootFocusRecovery]);

  useLayoutEffect(() => {
    if (!activeFocusOwner || shellElement === null) return undefined;
    const ownerDocument = shellElement.ownerDocument;
    const containFocus = (event: FocusEvent): void => {
      const target = event.target;
      if (target instanceof Node && shellElement.contains(target)) return;
      if (readyRoot && deferRootFocusRecoveryRef.current) return;
      focusFirstSystemDialogTargetInternalV1(shellElement);
    };
    ownerDocument.addEventListener("focusin", containFocus, true);
    return () => ownerDocument.removeEventListener("focusin", containFocus, true);
  }, [activeFocusOwner, readyRoot, shellElement]);

  const blocked = props.entry.phase !== "active" || props.parentBlockedByChild;

  const surface = (
    <div
      ref={setShellRef}
      data-testid="system-dialog-surface"
      data-system-dialog-instance={props.entry.surfaceInstanceId}
      data-system-dialog-phase={props.entry.phase}
      data-system-dialog-entry={props.entry.kind}
      data-system-dialog-root={props.entry.kind === "root" ? props.entry.rootRequest : undefined}
      data-system-dialog-parent={props.entry.kind === "confirmation"
        ? props.entry.parentSurfaceInstanceId
        : undefined}
      className={props.entry.kind === "confirmation"
        ? `${styles["blocking-dialog__content"]} ${styles["blocking-dialog__content--confirm"]}`
        : styles["blocking-dialog__content"]}
      role={activeFocusOwner ? "dialog" : undefined}
      aria-modal={activeFocusOwner ? "true" : undefined}
      aria-labelledby={confirmationEntry === null
        ? undefined
        : `${props.entry.surfaceInstanceId}-title`}
      aria-label={props.entry.resolution.accessibleName}
      inert={blocked || undefined}
      aria-hidden={blocked ? "true" : undefined}
      tabIndex={-1}
      data-blocking-focus-scope={activeFocusOwner ? "system" : undefined}
      style={preparing ? { pointerEvents: "none", visibility: "hidden" } : { position: "absolute" }}
      onClick={props.entry.kind === "confirmation" ? (event) => event.stopPropagation() : undefined}
      onPointerDown={props.entry.kind === "confirmation"
        ? (event) => event.stopPropagation()
        : undefined}
      onPointerUp={props.entry.kind === "confirmation"
        ? (event) => event.stopPropagation()
        : undefined}
      onKeyDown={activeFocusOwner
        ? (event) => {
          if (event.key === "Tab") {
            routeSystemDialogTrappedTabInternalV1(event);
          } else if (event.key === "Escape" && !isDevDockEscapeOwnerTargetV1(event.target)) {
            event.preventDefault();
            if (confirmationEntry !== null) {
              confirmationEntry.controller.cancelInternalV1("escape");
            } else {
              rootController?.cancelInternalV1("escape");
            }
          }
        }
        : undefined}
    >
      {renderer}
    </div>
  );

  return (
    <SystemDialogCandidateBoundaryInternalV1
      attachment={props.attachment}
      surfaceInstanceId={props.entry.surfaceInstanceId}
      gate={gate}
    >
      {confirmationEntry !== null
        ? (
          <div
            className={`${styles["blocking-dialog__backdrop"]} ${
              styles["blocking-dialog__backdrop--confirm"]
            }`}
            data-testid="system-dialog-confirmation-backdrop"
            data-system-dialog-backdrop="action_confirmation"
            data-system-dialog-confirmation-phase={props.entry.phase}
            aria-hidden={!activeConfirmation ? "true" : undefined}
            style={!activeConfirmation
              ? { pointerEvents: "none", visibility: "hidden" }
              : { position: "absolute", inset: 0, pointerEvents: "auto" }}
            onPointerDown={activeConfirmation ? (event) => event.preventDefault() : undefined}
            onPointerUp={activeConfirmation
              ? (event) => {
                armPointerFence(event);
                confirmationEntry.controller.cancelInternalV1("backdrop");
              }
              : undefined}
          >
            {surface}
          </div>
        )
        : (
          <div
            data-system-dialog-root-layer={props.entry.surfaceInstanceId}
            style={preparing
              ? { pointerEvents: "none", visibility: "hidden" }
              : { position: "absolute", inset: 0, pointerEvents: "auto" }}
          >
            <div
              className={styles["blocking-dialog__backdrop"]}
              data-testid={activeRoot ? "system-dialog-root-backdrop" : undefined}
              data-system-dialog-backdrop={rootRequest ?? undefined}
              aria-hidden="true"
              style={{ position: "absolute" }}
              onPointerDown={activeRoot ? (event) => event.preventDefault() : undefined}
              onPointerUp={activeRoot
                ? (event) => {
                  armPointerFence(event);
                  rootController?.cancelInternalV1("backdrop");
                }
                : undefined}
            />
            {surface}
          </div>
        )}
    </SystemDialogCandidateBoundaryInternalV1>
  );
}

interface ChildFocusRecordInternalV1 {
  readonly parentSurfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly opener: HTMLElement;
}

interface RootFocusRecordInternalV1 {
  readonly returnTarget: HTMLElement | null;
}

interface MutableCellInternalV1<T> {
  current: T;
}

function restoreDetachedSystemDialogHostFocusInternalV1(input: {
  readonly generation: number;
  readonly mountGeneration: MutableCellInternalV1<number>;
  readonly session: SystemDialogManagedSessionInternalV1;
  readonly rootFocusLedger: MutableCellInternalV1<
    Map<ManagedSurfaceInstanceIdV1, RootFocusRecordInternalV1>
  >;
  readonly snapshot: MutableCellInternalV1<{
    readonly entries: readonly SystemDialogHostRenderEntryInternalV1[];
  }>;
  readonly hostElement: MutableCellInternalV1<HTMLDivElement | null>;
}): void {
  const cleanupGeneration = input.generation + 1;
  if (input.mountGeneration.current === input.generation) {
    input.mountGeneration.current = cleanupGeneration;
  }
  if (input.session.isTerminalDisposalInternalV1()) {
    input.rootFocusLedger.current.clear();
    return;
  }
  queueMicrotask(() => {
    if (
      input.mountGeneration.current !== cleanupGeneration ||
      input.session.isTerminalDisposalInternalV1()
    ) return;
    const root = input.snapshot.current.entries.find((entry) => entry.kind === "root");
    if (root === undefined) return;
    restoreSystemDialogOwnedFocusInternalV1(
      input.rootFocusLedger.current.get(root.surfaceInstanceId)?.returnTarget,
      input.hostElement.current,
    );
  });
}

function SystemDialogBlockingFallbackInternalV1(props: {
  readonly candidateInstanceId: ManagedSurfaceInstanceIdV1;
  readonly entry: SystemDialogHostRenderEntryInternalV1;
}): ReactElement {
  const [focusElement, setFocusElement] = useState<HTMLDivElement | null>(null);
  const armPointerFence = useStagePointerGestureFenceV1("system");
  useStageSystemFocusScopeRegistrationV1(focusElement);
  useDevDockPortalTargetRegistrationV1("system", focusElement);
  useLayoutEffect(() => {
    if (focusElement === null) return undefined;
    const ownerDocument = focusElement.ownerDocument;
    const containFocus = (event: FocusEvent): void => {
      const target = event.target;
      if (target instanceof Node && focusElement.contains(target)) return;
      focusElement.focus({ preventScroll: true });
    };
    ownerDocument.addEventListener("focusin", containFocus, true);
    focusElement.focus({ preventScroll: true });
    return () => {
      ownerDocument.removeEventListener("focusin", containFocus, true);
    };
  }, [focusElement]);
  const cancel = (dismissKind: ManagedSurfaceDismissKindV1): void => {
    props.entry.controller.cancelInternalV1(dismissKind);
  };
  return (
    <div
      ref={setFocusElement}
      data-testid="system-dialog-fallback"
      data-system-dialog-fallback={props.candidateInstanceId}
      data-blocking-focus-scope="system"
      role="status"
      aria-busy="true"
      tabIndex={-1}
      style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}
      onPointerDown={(event) => event.preventDefault()}
      onPointerUp={(event) => {
        armPointerFence(event);
        cancel("backdrop");
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isDevDockEscapeOwnerTargetV1(event.target)) {
          event.preventDefault();
          cancel("escape");
          return;
        }
        if (event.key !== "Tab") return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
      }}
    />
  );
}

function handleSystemBlockingFallbackInputInternalV1(event: InputEventV1) {
  switch (event.kind) {
    case "action":
    case "viewport_point":
      return inputHandledV1;
    case "pointer_cancel":
    case "focus_loss":
      return inputIgnoredV1;
  }
  return inputIgnoredV1;
}

function handleSystemConfirmationInputInternalV1(
  entry: SystemDialogConfirmationHostRenderEntryInternalV1,
  event: InputEventV1,
) {
  if (event.kind === "focus_loss" || event.kind === "pointer_cancel") {
    return inputIgnoredV1;
  }
  if (event.kind === "action") {
    if (event.actionId === systemInputActionIdsV1.confirm) {
      entry.controller.dispatchOnceInternalV1();
    } else if (event.actionId === systemInputActionIdsV1.cancel) {
      entry.controller.cancelInternalV1("routed_cancel");
    }
  }
  return inputHandledV1;
}

function handleSystemRootInputInternalV1(
  entry: Extract<SystemDialogHostRenderEntryInternalV1, { readonly kind: "root" }>,
  event: InputEventV1,
) {
  if (event.kind === "focus_loss" || event.kind === "pointer_cancel") {
    return inputIgnoredV1;
  }
  if (event.kind === "action" && event.actionId === systemInputActionIdsV1.cancel) {
    entry.controller.cancelInternalV1("routed_cancel");
  }
  return inputHandledV1;
}

function SystemDialogAttachedHostInternalV1(props: {
  readonly session: SystemDialogManagedSessionInternalV1;
  readonly attachment: SystemDialogHostAttachmentInternalV1;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
}): ReactElement {
  const rootFocusLedgerRef = useRef<
    Map<ManagedSurfaceInstanceIdV1, RootFocusRecordInternalV1>
  >(new Map());
  const childFocusLedgerRef = useRef<
    Map<ManagedSurfaceInstanceIdV1, ChildFocusRecordInternalV1>
  >(new Map());
  const subscribe = useCallback(
    (listener: () => void) => props.session.subscribeInternalV1(listener),
    [props.session],
  );
  const getSnapshot = useCallback(
    () => props.session.getHostRenderSnapshotInternalV1(),
    [props.session],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const previousSnapshotRef = useRef(snapshot);
  const hostElementRef = useRef<HTMLDivElement | null>(null);
  const hostMountGenerationRef = useRef(0);
  const currentRootEntries = snapshot.entries.filter(
    (entry): entry is Extract<SystemDialogHostRenderEntryInternalV1, { readonly kind: "root" }> =>
      entry.kind === "root",
  );
  const currentRootIds = new Set(
    currentRootEntries.map((entry) => entry.surfaceInstanceId),
  );
  for (const entry of currentRootEntries) {
    if (rootFocusLedgerRef.current.has(entry.surfaceInstanceId)) continue;
    const publicationInstance = snapshot.publication.orderedInstances.find((instance) =>
      instance.surfaceInstanceId === entry.surfaceInstanceId
    );
    let inheritedTarget: HTMLElement | null | undefined;
    if (
      publicationInstance?.readiness.kind === "preparing" &&
      publicationInstance.readiness.transition === "primary_replacement"
    ) {
      inheritedTarget = rootFocusLedgerRef.current.get(
        publicationInstance.readiness.retainedInstanceId,
      )?.returnTarget;
    } else {
      const supersededInitial = previousSnapshotRef.current.entries.toReversed().find(
        (previousEntry) =>
          previousEntry.kind === "root" &&
          previousEntry.phase === "preparing" &&
          !currentRootIds.has(previousEntry.surfaceInstanceId),
      );
      if (supersededInitial !== undefined) {
        inheritedTarget = rootFocusLedgerRef.current.get(
          supersededInitial.surfaceInstanceId,
        )?.returnTarget;
      }
    }
    rootFocusLedgerRef.current.set(
      entry.surfaceInstanceId,
      Object.freeze({
        returnTarget: inheritedTarget === undefined
          ? readSystemDialogReturnFocusTargetInternalV1()
          : inheritedTarget,
      }),
    );
  }
  const entryIds = new Set(snapshot.entries.map((entry) => entry.surfaceInstanceId));
  const deferredRootFocusIds = new Set(
    [...childFocusLedgerRef.current]
      .filter(([childInstanceId]) => !entryIds.has(childInstanceId))
      .map(([, focusRecord]) => focusRecord.parentSurfaceInstanceId),
  );
  const blockingConfirmation = snapshot.entries.toReversed().find(
    (entry): entry is SystemDialogConfirmationHostRenderEntryInternalV1 =>
      entry.kind === "confirmation",
  ) ?? null;
  const activeConfirmation = blockingConfirmation?.phase === "active" ? blockingConfirmation : null;
  const activeRoot = snapshot.entries.toReversed().find(
    (entry): entry is Extract<SystemDialogHostRenderEntryInternalV1, { readonly kind: "root" }> =>
      entry.kind === "root" && entry.phase === "active",
  ) ?? null;
  const blockedChildParentId = blockingConfirmation?.parentSurfaceInstanceId ?? null;
  const fallbacks = snapshot.publication.preparationFallbacks.filter((fallback) =>
    entryIds.has(fallback.candidateInstanceId)
  );
  const topmostBlockingInstanceId = snapshot.publication.topmostBlockingInstanceId;
  const blocking =
    (topmostBlockingInstanceId !== null && entryIds.has(topmostBlockingInstanceId)) ||
    fallbacks.length > 0;
  useStageInputIsolationV1("system", blocking);
  const fallbackBlocking = fallbacks.length > 0;
  const topFallback = fallbacks.at(-1) ?? null;
  const topFallbackEntry = topFallback === null
    ? null
    : snapshot.entries.find((entry) =>
      entry.surfaceInstanceId === topFallback.candidateInstanceId
    ) ?? null;
  useLayoutEffect(() => {
    if (!fallbackBlocking) return undefined;
    return props.inputRouter.register({
      context: "system",
      handle(event) {
        if (event.kind === "action" && event.actionId === systemInputActionIdsV1.cancel) {
          topFallbackEntry?.controller.cancelInternalV1("routed_cancel");
        }
        return handleSystemBlockingFallbackInputInternalV1(event);
      },
    });
  }, [fallbackBlocking, props.inputRouter, topFallbackEntry]);

  useLayoutEffect(() => {
    if (activeConfirmation === null) return undefined;
    return props.inputRouter.register({
      context: "system",
      handle: (event) => handleSystemConfirmationInputInternalV1(activeConfirmation, event),
    });
  }, [activeConfirmation, props.inputRouter]);

  useLayoutEffect(() => {
    if (fallbackBlocking || activeConfirmation !== null || activeRoot === null) return undefined;
    return props.inputRouter.register({
      context: "system",
      handle: (event) => handleSystemRootInputInternalV1(activeRoot, event),
    });
  }, [activeConfirmation, activeRoot, fallbackBlocking, props.inputRouter]);

  useLayoutEffect(() => {
    if (props.session.isTerminalDisposalInternalV1()) {
      rootFocusLedgerRef.current.clear();
      previousSnapshotRef.current = snapshot;
      return;
    }
    const predecessorEpoch = previousSnapshotRef.current.publication.applicationEpoch;
    const epochRotated = predecessorEpoch !== snapshot.publication.applicationEpoch;
    const liveRootIds = new Set(
      snapshot.entries.filter((entry) => entry.kind === "root").map((entry) =>
        entry.surfaceInstanceId
      ),
    );
    const removedRecords = [...rootFocusLedgerRef.current].filter(([surfaceInstanceId]) =>
      !liveRootIds.has(surfaceInstanceId)
    );
    if (!epochRotated && liveRootIds.size === 0 && removedRecords.length > 0) {
      const restoreTarget = removedRecords.at(-1)?.[1].returnTarget ?? null;
      restoreSystemDialogOwnedFocusInternalV1(restoreTarget, hostElementRef.current);
    }
    for (const [surfaceInstanceId] of removedRecords) {
      rootFocusLedgerRef.current.delete(surfaceInstanceId);
    }
    previousSnapshotRef.current = snapshot;
  }, [props.session, snapshot]);

  useLayoutEffect(() => {
    if (props.session.isTerminalDisposalInternalV1()) {
      childFocusLedgerRef.current.clear();
      return;
    }
    const currentEntryIds = new Set(
      snapshot.entries.map((entry) => entry.surfaceInstanceId),
    );
    for (const [childInstanceId, focusRecord] of childFocusLedgerRef.current) {
      if (currentEntryIds.has(childInstanceId)) continue;
      childFocusLedgerRef.current.delete(childInstanceId);
      const parentSurvives = snapshot.entries.some((entry) =>
        entry.kind === "root" &&
        entry.surfaceInstanceId === focusRecord.parentSurfaceInstanceId
      );
      if (!parentSurvives) continue;
      queueMicrotask(() => {
        if (props.session.isTerminalDisposalInternalV1()) return;
        const latest = props.session.getHostRenderSnapshotInternalV1();
        const exactParentStillSurvives = latest.entries.some((entry) =>
          entry.kind === "root" &&
          entry.surfaceInstanceId === focusRecord.parentSurfaceInstanceId
        );
        const successorChildExists = latest.entries.some((entry) =>
          entry.kind === "confirmation" &&
          entry.parentSurfaceInstanceId === focusRecord.parentSurfaceInstanceId
        );
        if (!exactParentStillSurvives || successorChildExists) return;
        if (focusRecord.opener.isConnected) {
          focusRecord.opener.focus({ preventScroll: true });
          return;
        }
        const exactParentShell = [...props.portalContainer.querySelectorAll<HTMLElement>(
          '[data-system-dialog-entry="root"]',
        )].find((element) =>
          element.dataset.systemDialogInstance === focusRecord.parentSurfaceInstanceId
        );
        if (exactParentShell !== undefined) {
          focusFirstSystemDialogTargetInternalV1(exactParentShell);
        }
      });
    }
  }, [props.portalContainer, props.session, snapshot]);

  useLayoutEffect(() => {
    const generation = hostMountGenerationRef.current + 1;
    hostMountGenerationRef.current = generation;
    return () =>
      restoreDetachedSystemDialogHostFocusInternalV1({
        generation,
        mountGeneration: hostMountGenerationRef,
        session: props.session,
        rootFocusLedger: rootFocusLedgerRef,
        snapshot: snapshotRef,
        hostElement: hostElementRef,
      });
  }, [props.session]);

  return createPortal(
    <div
      ref={hostElementRef}
      data-testid="system-dialog-managed-host"
      data-system-dialog-application-epoch={snapshot.publication.applicationEpoch}
      data-system-dialog-topology-revision={snapshot.publication.topologyRevision}
    >
      {snapshot.entries.map((entry) => (
        <SystemDialogCandidateEntryInternalV1
          key={entry.surfaceInstanceId}
          attachment={props.attachment}
          entry={entry}
          parentRootEntry={entry.kind === "confirmation"
            ? snapshot.entries.find(
              (candidate): candidate is Extract<
                SystemDialogHostRenderEntryInternalV1,
                { readonly kind: "root" }
              > =>
                candidate.kind === "root" &&
                candidate.surfaceInstanceId === entry.parentSurfaceInstanceId,
            ) ?? null
            : null}
          portalContainer={props.portalContainer}
          parentBlockedByChild={entry.kind === "root" &&
            entry.surfaceInstanceId === blockedChildParentId}
          deferRootFocusRecovery={entry.kind === "root" &&
            deferredRootFocusIds.has(entry.surfaceInstanceId)}
          childFocusLedger={childFocusLedgerRef.current}
        />
      ))}
      {fallbacks.map((fallback) => {
        const candidateEntry = snapshot.entries.find((entry) =>
          entry.surfaceInstanceId === fallback.candidateInstanceId
        );
        if (candidateEntry === undefined) return null;
        return (
          <SystemDialogBlockingFallbackInternalV1
            key={candidateEntry.kind === "root"
              ? "system-dialog-root-fallback"
              : fallback.candidateInstanceId}
            candidateInstanceId={fallback.candidateInstanceId}
            entry={candidateEntry}
          />
        );
      })}
    </div>,
    props.portalContainer,
  );
}

/** @internal Managed System Host implementation behind the public catalog wrapper. */
export function SystemDialogManagedHostInternalV1(
  props: SystemDialogManagedHostPropsInternalV1,
): ReactElement | null {
  const session = resolveSystemDialogSessionInternalV1(props.session);
  const portalContainer = useStageSystemPortalContainerV1();
  const catalogRef = useRef(props.catalog);
  catalogRef.current = props.catalog;
  const hostIdentityRef = useRef<object | null>(null);
  hostIdentityRef.current ??= Object.freeze({ kind: "system-dialog-logical-host" });
  const hostIdentity = hostIdentityRef.current;
  const attachmentRef = useRef<SystemDialogHostAttachmentInternalV1 | null>(null);
  const [attachedHost, setAttachedHost] = useState<
    {
      readonly attachment: SystemDialogHostAttachmentInternalV1;
      readonly portalContainer: HTMLDivElement;
    } | null
  >(null);

  useLayoutEffect(() => {
    if (portalContainer === null) {
      attachmentRef.current?.release();
      attachmentRef.current = null;
      setAttachedHost(null);
      return;
    }
    const nextAttachment = session.attachHostInternalV1({
      hostIdentity,
      portalContainer,
      catalog: catalogRef.current,
    });
    attachmentRef.current = nextAttachment;
    setAttachedHost(Object.freeze({ attachment: nextAttachment, portalContainer }));
  }, [hostIdentity, portalContainer, session]);

  useLayoutEffect(
    () => () => {
      attachmentRef.current?.release();
      attachmentRef.current = null;
    },
    [hostIdentity, session],
  );

  useLayoutEffect(() => {
    if (attachedHost?.attachment.isAcknowledgmentOpen() !== true) return;
    attachedHost.attachment.updateCatalogInternalV1(props.catalog);
  }, [attachedHost, props.catalog]);

  if (
    attachedHost === null ||
    !attachedHost.attachment.isAcknowledgmentOpen()
  ) {
    return null;
  }
  return (
    <SystemDialogAttachedHostInternalV1
      session={session}
      attachment={attachedHost.attachment}
      portalContainer={attachedHost.portalContainer}
      inputRouter={props.inputRouter}
    />
  );
}
