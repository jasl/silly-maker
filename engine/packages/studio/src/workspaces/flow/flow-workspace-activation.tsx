// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { NarrativeFlowGraphV1 } from "../../core/binding.ts";
import styles from "../../studio-app.module.css";

export const flowWorkspaceActivationFailureCodeInternalV1 =
  "studio.flow_workspace_activation_failed" as const;

export interface FlowWorkspaceRenderInputInternalV1 {
  readonly flow: NarrativeFlowGraphV1;
  readonly resolveText?: (textId: string) => string | null;
}

export interface FlowWorkspaceConsumerInternalV1 {
  render(input: FlowWorkspaceRenderInputInternalV1): ReactElement;
}

export interface FlowWorkspaceMountedExtensionInternalV1 {
  readonly consumer: FlowWorkspaceConsumerInternalV1;
  dispose(): Promise<void>;
}

/**
 * Resolves a lifecycle already mounted by the dynamic facade. The activation
 * owner must therefore dispose every result that arrives after its fence.
 */
export type FlowWorkspaceLoaderInternalV1 = () => Promise<FlowWorkspaceMountedExtensionInternalV1>;

export type FlowWorkspaceActivationStateInternalV1 =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
    readonly kind: "ready";
    readonly consumer: FlowWorkspaceConsumerInternalV1;
  }
  | {
    readonly kind: "error";
    readonly code: typeof flowWorkspaceActivationFailureCodeInternalV1;
  }
  | { readonly kind: "disposed" };

export interface FlowWorkspaceActivationOwnerInternalV1 {
  open(): Promise<FlowWorkspaceConsumerInternalV1>;
  retry(): Promise<FlowWorkspaceConsumerInternalV1>;
  getState(): FlowWorkspaceActivationStateInternalV1;
  subscribe(listener: () => void): () => void;
  dispose(): Promise<void>;
}

export interface CreateFlowWorkspaceActivationOwnerOptionsInternalV1 {
  readonly load?: FlowWorkspaceLoaderInternalV1;
  readonly reportFailure?: (error: unknown) => void;
}

const idleStateInternalV1 = { kind: "idle" as const };
const loadingStateInternalV1 = { kind: "loading" as const };
const errorStateInternalV1 = {
  kind: "error" as const,
  code: flowWorkspaceActivationFailureCodeInternalV1,
};
const disposedStateInternalV1 = { kind: "disposed" as const };

function defaultFlowWorkspaceLoaderInternalV1(): Promise<FlowWorkspaceMountedExtensionInternalV1> {
  return import("./flow-workspace-extension.tsx").then((module) =>
    module.mountFlowWorkspaceExtensionInternalV1()
  );
}

/**
 * Resident owner for the progressive Flow workspace. It keeps only metadata,
 * activation state, and a literal build-known loader in the Studio entry
 * graph; the Flow implementation and selected lifecycle backend live behind
 * that loader.
 */
export function createFlowWorkspaceActivationOwnerInternalV1(
  options: CreateFlowWorkspaceActivationOwnerOptionsInternalV1 = {},
): FlowWorkspaceActivationOwnerInternalV1 {
  const load = options.load ?? defaultFlowWorkspaceLoaderInternalV1;
  const listeners = new Set<() => void>();
  let state: FlowWorkspaceActivationStateInternalV1 = idleStateInternalV1;
  let mounted: FlowWorkspaceMountedExtensionInternalV1 | null = null;
  let inFlight: Promise<FlowWorkspaceConsumerInternalV1> | null = null;
  let attempt = 0;
  let disposed = false;
  let disposePromise: Promise<void> | null = null;

  const emitFailure = (error: unknown): void => {
    try {
      options.reportFailure?.(error);
    } catch {
      // Diagnostics are observational; a reporter cannot change activation.
    }
  };
  const setState = (next: FlowWorkspaceActivationStateInternalV1): void => {
    state = next;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Store observers are observational.
      }
    }
  };
  const start = (): Promise<FlowWorkspaceConsumerInternalV1> => {
    const expectedAttempt = ++attempt;
    let operation!: Promise<FlowWorkspaceConsumerInternalV1>;
    operation = Promise.resolve()
      .then(load)
      .then(async (loaded) => {
        if (disposed || attempt !== expectedAttempt) {
          await loaded.dispose();
          throw new Error("Flow workspace activation became stale");
        }
        mounted = loaded;
        const ready = {
          kind: "ready" as const,
          consumer: loaded.consumer,
        };
        setState(ready);
        if (disposed || attempt !== expectedAttempt) {
          throw new Error("Flow workspace activation became stale during ready publication");
        }
        return loaded.consumer;
      })
      .catch((error: unknown) => {
        if (!disposed && attempt === expectedAttempt) {
          emitFailure(error);
          setState(errorStateInternalV1);
        }
        throw error;
      })
      .finally(() => {
        if (inFlight === operation) inFlight = null;
      });
    inFlight = operation;
    // Reserve the operation before notifying observers: a synchronous
    // subscriber may call open() from this loading transition.
    setState(loadingStateInternalV1);
    return operation;
  };

  const owner: FlowWorkspaceActivationOwnerInternalV1 = {
    open(): Promise<FlowWorkspaceConsumerInternalV1> {
      if (state.kind === "ready") return Promise.resolve(state.consumer);
      if (state.kind === "loading" && inFlight !== null) return inFlight;
      if (state.kind === "error") {
        return Promise.reject(new Error("Flow workspace activation requires an explicit retry"));
      }
      if (disposed) return Promise.reject(new Error("Flow workspace activation is disposed"));
      return start();
    },
    retry(): Promise<FlowWorkspaceConsumerInternalV1> {
      if (state.kind !== "error") return owner.open();
      return start();
    },
    getState: () => state,
    subscribe(listener: () => void): () => void {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): Promise<void> {
      if (disposePromise !== null) return disposePromise;
      disposed = true;
      attempt += 1;
      const pending = inFlight;
      const current = mounted;
      mounted = null;
      setState(disposedStateInternalV1);
      listeners.clear();
      disposePromise = Promise.resolve().then(async () => {
        if (current !== null) await current.dispose();
        if (pending !== null) await pending.catch(() => undefined);
      });
      return disposePromise;
    },
  };
  return owner;
}

/**
 * Standalone Studio ownership. The microtask lets React finish descendant
 * cleanup before lifecycle retirement; the epoch fence ignores StrictMode's
 * development-only effect replay when the owner remains mounted.
 */
export function useDisposeFlowWorkspaceActivationOnUnmountInternalV1(
  activation: FlowWorkspaceActivationOwnerInternalV1,
): void {
  const lifetime = useMemo(() => {
    let epoch = 0;
    return {
      mount: () => ++epoch,
      isCurrent: (expectedEpoch: number) => epoch === expectedEpoch,
    };
  }, []);
  useEffect(() => {
    const expectedEpoch = lifetime.mount();
    return () => {
      queueMicrotask(() => {
        if (lifetime.isCurrent(expectedEpoch)) {
          void activation.dispose().catch(() => undefined);
        }
      });
    };
  }, [activation, lifetime]);
}

export interface ProgressiveFlowWorkspaceHostPropsInternalV1
  extends FlowWorkspaceRenderInputInternalV1 {
  readonly activation: FlowWorkspaceActivationOwnerInternalV1;
  readonly publicationRole: "visible" | "probe";
}

/** Bounded state surface; the visible rail owns initial activation. */
export function ProgressiveFlowWorkspaceHostInternalV1(
  props: ProgressiveFlowWorkspaceHostPropsInternalV1,
): ReactElement | null {
  const state = useSyncExternalStore(
    props.activation.subscribe,
    props.activation.getState,
    props.activation.getState,
  );

  if (state.kind === "disposed") return null;
  if (state.kind === "ready") {
    return state.consumer.render({
      flow: props.flow,
      ...(props.resolveText === undefined ? {} : { resolveText: props.resolveText }),
    });
  }

  return (
    <div
      className={styles["flow"]}
      data-studio-flow-activation={state.kind}
    >
      <h2>Narrative 流程</h2>
      {state.kind === "idle"
        ? <p>选择 Narrative 流程后开始加载。</p>
        : state.kind === "loading"
        ? <p role="status">正在加载 Narrative 流程…</p>
        : (
          <div className={styles["flow-activation-error"]} role="alert">
            <p>
              Narrative 流程暂不可用（{flowWorkspaceActivationFailureCodeInternalV1}）。
            </p>
            {props.publicationRole === "visible"
              ? (
                <button
                  type="button"
                  data-studio-flow-retry="true"
                  onClick={() => {
                    void props.activation.retry().catch(() => undefined);
                  }}
                >
                  重试 Narrative 流程
                </button>
              )
              : null}
          </div>
        )}
    </div>
  );
}
