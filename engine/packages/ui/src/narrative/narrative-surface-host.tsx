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
import { createPortal } from "react-dom";

import type { InputRouterV1 } from "../input/contracts.ts";
import type { ManagedSurfaceGestureIdV1 } from "../managed-surfaces/managed-surface-contracts.ts";
import {
  createNarrativeStableHostRuntimeInternalV1,
  prepareNarrativeStableHostReadyCommitInternalV1,
} from "./narrative-managed-surface-family.ts";
import type {
  NarrativeStableHostAttachmentInternalV1,
  NarrativeStableHostRenderEntryInternalV1,
  NarrativeStableHostRuntimeInternalV1,
  NarrativeStableSessionInternalV1,
} from "./narrative-managed-surface-session.ts";

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
  { runtime, entry, gate, portalContainer }: Readonly<{
    readonly runtime: NarrativeStableHostRuntimeInternalV1;
    readonly entry: NarrativeStableHostRenderEntryInternalV1;
    readonly gate: NarrativeSurfaceEntryGateInternalV1;
    readonly portalContainer: HTMLDivElement;
  }>,
): ReactElement {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mountGeneration = useRef(0);
  useLayoutEffect(() => {
    const generation = mountGeneration.current + 1;
    mountGeneration.current = generation;
    if (gate.status === "accepted" && gate.runtime === runtime) {
      return () => {
        if (mountGeneration.current === generation) mountGeneration.current += 1;
      };
    }
    const shell = shellRef.current;
    if (shell === null) return undefined;
    const prepared = prepareNarrativeStableHostReadyCommitInternalV1({
      hostRuntime: runtime,
      renderEntry: entry,
      portalShell: shell,
      initialFocusTarget: shell,
    });
    if (prepared.kind === "reattached") {
      gate.status = "accepted";
      gate.runtime = runtime;
    } else if (prepared.kind !== "prepared" || entry.preparation === null) {
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
          return;
        }
        if (!shell.isConnected || !portalContainer.contains(shell)) {
          failNarrativeSurfaceEntryBeforeReadyInternalV1(
            runtime.attachment,
            entry,
            gate,
          );
          return;
        }
        const result = settleReady();
        gate.status = result.kind === "settled" ? "accepted" : "cancelled";
        if (result.kind === "settled") gate.runtime = runtime;
      });
    }
    return () => {
      if (mountGeneration.current === generation) mountGeneration.current += 1;
    };
  }, [entry, gate, portalContainer, runtime]);

  const inactive = entry.phase !== "active";
  const preparing = entry.phase === "preparing";
  const renderer = entry.kind === "dialogue"
    ? createElement(entry.rendererComponent, entry.rendererProps)
    : <NarrativeHistoryEntryRendererInternalV1 entry={entry} />;
  return (
    <div
      ref={shellRef}
      tabIndex={-1}
      inert={inactive ? true : undefined}
      aria-hidden={inactive ? true : undefined}
      style={{
        visibility: preparing ? "hidden" : undefined,
        pointerEvents: inactive ? "none" : undefined,
      }}
    >
      {renderer}
    </div>
  );
}

function NarrativeSurfaceEntryInternalV1(
  { runtime, entry, portalContainer }: Readonly<{
    readonly runtime: NarrativeStableHostRuntimeInternalV1;
    readonly entry: NarrativeStableHostRenderEntryInternalV1;
    readonly portalContainer: HTMLDivElement;
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
  } else if (
    gateRef.current.observedEntry !== entry || gateRef.current.observedRuntime !== runtime
  ) {
    gateRef.current.observedEntry = entry;
    gateRef.current.observedRuntime = runtime;
    if (gateRef.current.status === "cancelled") {
      gateRef.current.status = "pending";
      gateRef.current.runtime = null;
    }
  }
  const gate = gateRef.current;
  return (
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
      />
    </NarrativeSurfaceEntryBoundaryInternalV1>
  );
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
  return createPortal(
    snapshot.entries.map((entry) => (
      <NarrativeSurfaceEntryInternalV1
        key={entry.renderKey}
        runtime={runtime}
        entry={entry}
        portalContainer={portalContainer}
      />
    )),
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
    setMounted(Object.freeze({
      runtime: next,
      session: props.session,
      portalContainer: props.portalContainer,
      inputRouter: props.inputRouter,
    }));
    return () => {
      next.attachment.releaseInternalV1();
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
