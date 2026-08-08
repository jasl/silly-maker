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
import { createPortal } from "react-dom";

import { useDevDockPortalTargetRegistrationV1 } from "../debug/dev-dock-portal-coordinator.tsx";
import {
  inputHandledV1,
  inputIgnoredV1,
  type InputEventV1,
  type InputRouterV1,
} from "../input/contracts.ts";
import type { ManagedSurfaceInstanceIdV1 } from "../managed-surfaces/managed-surface-contracts.ts";
import {
  useStageInputIsolationV1,
  useStageSystemFocusScopeRegistrationV1,
  useStageSystemPortalContainerV1,
} from "../shell/game-stage.tsx";
import type {
  SystemDialogRequiredPortBindingInternalV1,
  SystemDialogRootRequestInternalV1,
  SystemDialogSessionV1,
} from "./system-dialog-managed-contract.ts";
import {
  resolveSystemDialogSessionInternalV1,
  type SystemDialogHostAttachmentInternalV1,
  type SystemDialogHostRenderEntryInternalV1,
  type SystemDialogManagedSessionInternalV1,
  type SystemDialogRootCatalogInternalV1,
} from "./system-dialog-managed-session.ts";

export interface SystemDialogRootRendererPropsInternalV1 {
  readonly rootRequest: SystemDialogRootRequestInternalV1;
  readonly contentConfig: unknown;
  readonly requiredPortBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
}

export interface SystemDialogManagedHostPropsInternalV1 {
  readonly session: SystemDialogSessionV1;
  readonly catalog: SystemDialogRootCatalogInternalV1;
  readonly inputRouter: InputRouterV1;
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
  readonly portalContainer: HTMLDivElement;
}): ReactElement {
  const gateRef = useRef<CandidateSettlementGateV1 | null>(null);
  gateRef.current ??= candidateGateV1();
  const gate = gateRef.current;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const preparing = props.entry.phase === "preparing";
  const renderer = useMemo(() => {
    const component = props.entry.resolution.rendererComponent as ElementType<
      SystemDialogRootRendererPropsInternalV1
    >;
    return createElement(component, {
      rootRequest: props.entry.rootRequest,
      contentConfig: props.entry.resolution.contentConfigSnapshot.value,
      requiredPortBindings: props.entry.resolution.requiredPortBindings,
    });
  }, [props.entry.resolution, props.entry.rootRequest]);

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

  return (
    <SystemDialogCandidateBoundaryInternalV1
      attachment={props.attachment}
      surfaceInstanceId={props.entry.surfaceInstanceId}
      gate={gate}
    >
      <div
        ref={shellRef}
        data-testid="system-dialog-surface"
        data-system-dialog-instance={props.entry.surfaceInstanceId}
        data-system-dialog-phase={props.entry.phase}
        data-system-dialog-root={props.entry.rootRequest}
        aria-label={props.entry.resolution.accessibleName}
        inert={preparing || undefined}
        aria-hidden={preparing ? "true" : undefined}
        style={preparing ? { pointerEvents: "none", visibility: "hidden" } : undefined}
      >
        {renderer}
      </div>
    </SystemDialogCandidateBoundaryInternalV1>
  );
}

function SystemDialogBlockingFallbackInternalV1(props: {
  readonly candidateInstanceId: ManagedSurfaceInstanceIdV1;
  readonly session: SystemDialogManagedSessionInternalV1;
}): ReactElement {
  const [focusElement, setFocusElement] = useState<HTMLDivElement | null>(null);
  const previousFocusOwnerRef = useRef<HTMLElement | null>(null);
  const latestCandidateInstanceIdRef = useRef(props.candidateInstanceId);
  latestCandidateInstanceIdRef.current = props.candidateInstanceId;
  useStageSystemFocusScopeRegistrationV1(focusElement);
  useDevDockPortalTargetRegistrationV1("system", focusElement);
  useLayoutEffect(() => {
    if (focusElement === null) return undefined;
    const previousFocusOwner = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    previousFocusOwnerRef.current = previousFocusOwner === focusElement
      ? previousFocusOwnerRef.current
      : previousFocusOwner;
    focusElement.focus({ preventScroll: true });
    return () => {
      const candidate = props.session.getHostRenderSnapshotInternalV1().entries.find(
        (entry) => entry.surfaceInstanceId === latestCandidateInstanceIdRef.current,
      );
      if (candidate !== undefined && candidate.phase !== "preparing") return;
      const restoreTarget = previousFocusOwnerRef.current;
      if (
        restoreTarget?.isConnected === true &&
        (document.activeElement === focusElement || document.activeElement === document.body)
      ) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [focusElement, props.session]);
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
      onClick={(event) => event.preventDefault()}
      onKeyDown={(event) => {
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

function SystemDialogAttachedHostInternalV1(props: {
  readonly session: SystemDialogManagedSessionInternalV1;
  readonly attachment: SystemDialogHostAttachmentInternalV1;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
}): ReactElement {
  const subscribe = useCallback(
    (listener: () => void) => props.session.subscribeInternalV1(listener),
    [props.session],
  );
  const getSnapshot = useCallback(
    () => props.session.getHostRenderSnapshotInternalV1(),
    [props.session],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const entryIds = new Set(snapshot.entries.map((entry) => entry.surfaceInstanceId));
  const fallbacks = snapshot.publication.preparationFallbacks.filter((fallback) =>
    entryIds.has(fallback.candidateInstanceId)
  );
  const blocking = snapshot.publication.topmostBlockingInstanceId !== null ||
    fallbacks.length > 0;
  useStageInputIsolationV1("system", blocking);
  const fallbackBlocking = fallbacks.length > 0;
  useLayoutEffect(() => {
    if (!fallbackBlocking) return undefined;
    return props.inputRouter.register({
      context: "system",
      handle: handleSystemBlockingFallbackInputInternalV1,
    });
  }, [fallbackBlocking, props.inputRouter]);

  return createPortal(
    <div
      data-testid="system-dialog-managed-host"
      data-system-dialog-application-epoch={snapshot.publication.applicationEpoch}
      data-system-dialog-topology-revision={snapshot.publication.topologyRevision}
    >
      {snapshot.entries.map((entry) => (
        <SystemDialogCandidateEntryInternalV1
          key={entry.surfaceInstanceId}
          attachment={props.attachment}
          entry={entry}
          portalContainer={props.portalContainer}
        />
      ))}
      {fallbacks.map((fallback) => (
        <SystemDialogBlockingFallbackInternalV1
          key="system-dialog-root-fallback"
          candidateInstanceId={fallback.candidateInstanceId}
          session={props.session}
        />
      ))}
    </div>,
    props.portalContainer,
  );
}

/** @internal Dormant S3c.1 Host; it is deliberately absent from package barrels until S3e. */
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
