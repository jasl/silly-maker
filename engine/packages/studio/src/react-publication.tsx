// SPDX-License-Identifier: MIT
import { Fragment, useLayoutEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import { createAgentHostInternalV1 } from "@sillymaker/agent/internal";
import type { AgentHostInternalV1 } from "@sillymaker/agent/internal";

import type { StudioToolingPlanV1 } from "./composition.ts";
import { createAuthoringHostInternalV1 } from "./core/authoring-host.ts";
import type { AuthoringHostInternalV1 } from "./core/authoring-host.ts";
import { EmbeddedAuthoringSurfaceInternalV1 } from "./embedded-authoring.tsx";
import { resolveExperimentalEmbeddedAgentBindingInternalV1 } from "./experimental-agent/binding.ts";
import { AuthoringHostSurfaceInternalV1 } from "./studio-app.tsx";
import type { FlowWorkspaceLoaderInternalV1 } from "./workspaces/flow/flow-workspace-activation.tsx";

interface LayoutCommitV1Props {
  readonly children: ReactNode;
  readonly publicationId: number;
  acknowledge(publicationId: number): void;
}

function LayoutCommitV1(props: LayoutCommitV1Props): ReactElement {
  const { acknowledge, publicationId } = props;
  useLayoutEffect(() => {
    let mounted = true;
    // React reports an uncaught child layout-effect failure after the other
    // layout effects in the same commit have run. Defer acknowledgement one
    // microtask so that failure wins, while still acknowledging the exact
    // committed epoch rather than the synchronous return from root.render().
    queueMicrotask(() => {
      if (mounted) acknowledge(publicationId);
    });
    return () => {
      mounted = false;
    };
  }, [acknowledge, publicationId]);
  return <Fragment>{props.children}</Fragment>;
}

interface MountedReactEpochV1<TPlan> {
  readonly host: HTMLDivElement;
  readonly plan: TPlan;
  readonly root: Root;
  clearFailureHandler(): void;
}

export interface ReactLayoutPublicationV1<TPlan> {
  mount(plan: TPlan): Promise<void>;
  publish(plan: TPlan, signal: AbortSignal): Promise<void>;
  dispose(): void;
}

interface CreateReactLayoutPublicationInputV1<TPlan> {
  readonly container: Element | DocumentFragment;
  render(plan: TPlan): ReactNode;
  reportFailure?(error: unknown): void;
}

function abortErrorV1(message: string): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

/**
 * Package-internal React publication primitive. Every epoch renders into an
 * independent detached host and acknowledges from a layout effect. A rejected
 * candidate never touches the visible host; a successful candidate swaps one
 * DOM child synchronously before the previous root is unmounted.
 */
export function createReactLayoutPublicationV1<TPlan>(
  input: CreateReactLayoutPublicationInputV1<TPlan>,
): ReactLayoutPublicationV1<TPlan> {
  let disposed = false;
  let busy = false;
  let current: MountedReactEpochV1<TPlan> | null = null;
  let publicationId = 0;
  let activeFailureHandler: ((error: unknown) => void) | null = null;

  const reportFailure = (error: unknown): void => {
    try {
      input.reportFailure?.(error);
    } catch {
      // Publication diagnostics are observational.
    }
  };

  const disposeEpoch = (epoch: MountedReactEpochV1<TPlan>): void => {
    epoch.clearFailureHandler();
    try {
      epoch.root.unmount();
    } catch (error) {
      reportFailure(error);
    }
    epoch.host.remove();
  };

  const prepareEpoch = (
    plan: TPlan,
    signal?: AbortSignal,
  ): Promise<MountedReactEpochV1<TPlan>> => {
    if (signal?.aborted === true) return Promise.reject(signal.reason);
    const ownerDocument = input.container.ownerDocument ?? document;
    const host = ownerDocument.createElement("div");
    host.dataset.sillymakerStudioEpoch = "candidate";
    let failureHandler: ((error: unknown) => void) | null = null;
    const root = createRoot(host, {
      // A boundary-chosen fallback is a successful React commit. Only an
      // uncaught error makes this candidate unpublishable.
      onCaughtError: reportFailure,
      onRecoverableError: reportFailure,
      onUncaughtError(error) {
        const handler = failureHandler;
        if (handler === null) reportFailure(error);
        else handler(error);
      },
    });
    const epoch: MountedReactEpochV1<TPlan> = {
      host,
      plan,
      root,
      clearFailureHandler() {
        failureHandler = null;
      },
    };
    publicationId += 1;
    const expectedPublicationId = publicationId;
    const committed = new Promise<MountedReactEpochV1<TPlan>>((resolve, reject) => {
      let settled = false;
      const settle = (): boolean => {
        if (settled) return false;
        settled = true;
        signal?.removeEventListener("abort", abort);
        failureHandler = null;
        if (activeFailureHandler === fail) activeFailureHandler = null;
        return true;
      };
      const succeed = (): void => {
        if (settle()) resolve(epoch);
      };
      const fail = (error: unknown): void => {
        if (settle()) reject(error);
      };
      const abort = (): void => fail(signal?.reason ?? abortErrorV1("React publication aborted"));
      failureHandler = fail;
      activeFailureHandler = fail;
      signal?.addEventListener("abort", abort, { once: true });
      try {
        root.render(
          <LayoutCommitV1
            publicationId={expectedPublicationId}
            acknowledge={(committedId) => {
              if (committedId === expectedPublicationId) succeed();
            }}
          >
            {input.render(plan)}
          </LayoutCommitV1>,
        );
      } catch (error) {
        fail(error);
      }
    });
    return committed.catch((error: unknown) => {
      // React can report render/layout failures from inside its own work loop.
      // Unmount only after that callback unwinds into this Promise continuation.
      disposeEpoch(epoch);
      throw error;
    });
  };

  return Object.freeze({
    async mount(plan: TPlan): Promise<void> {
      if (disposed) throw abortErrorV1("Studio React publication is disposed");
      if (current !== null || busy) throw new TypeError("Studio React root is already mounted");
      busy = true;
      try {
        const initial = await prepareEpoch(plan);
        if (disposed) {
          disposeEpoch(initial);
          throw abortErrorV1("Studio React publication was disposed during mount");
        }
        initial.host.dataset.sillymakerStudioEpoch = "current";
        try {
          // Existing container content remains visible while the detached
          // candidate prepares. This cutover installs only the live Studio
          // owner; the generated Author entry separately retires its Host
          // diagnostics shell after this layout acknowledgement resolves.
          input.container.replaceChildren(initial.host);
        } catch (error) {
          disposeEpoch(initial);
          throw error;
        }
        current = initial;
      } finally {
        busy = false;
      }
    },
    async publish(plan: TPlan, signal: AbortSignal): Promise<void> {
      if (disposed) throw abortErrorV1("Studio React publication is disposed");
      if (current === null) throw new TypeError("Studio React root is not mounted");
      if (busy) throw new TypeError("Studio React publication is already in progress");
      busy = true;
      try {
        const candidate = await prepareEpoch(plan, signal);
        if (disposed || signal.aborted) {
          disposeEpoch(candidate);
          throw signal.reason ?? abortErrorV1("Studio React publication aborted");
        }
        const previous = current;
        candidate.host.dataset.sillymakerStudioEpoch = "current";
        try {
          input.container.replaceChild(candidate.host, previous.host);
        } catch (error) {
          disposeEpoch(candidate);
          throw error;
        }
        current = candidate;
        // The DOM cutover is complete and cannot be rolled back by a cleanup
        // diagnostic. Retire the old consumer while its providers are still
        // alive, then acknowledge the composition transaction.
        disposeEpoch(previous);
      } finally {
        busy = false;
      }
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      activeFailureHandler?.(abortErrorV1("Studio React publication was disposed"));
      const mounted = current;
      current = null;
      if (mounted !== null) disposeEpoch(mounted);
    },
  });
}

export type PersistentReactLayoutRenderTargetInternalV1 = "visible" | "probe";

interface CreatePersistentReactLayoutPublicationInputInternalV1<TPlan> {
  readonly container: Element | DocumentFragment;
  render(plan: TPlan, target: PersistentReactLayoutRenderTargetInternalV1): ReactNode;
  reportFailure?(error: unknown): void;
}

interface ManagedPersistentReactRootInternalV1 {
  readonly host: HTMLDivElement;
  readonly root: Root;
  disposed: boolean;
  setFailureHandler(handler: ((error: unknown) => void) | null): void;
}

/**
 * Package-internal publication primitive for a persistent visible React root.
 *
 * The initial plan commits while connected to the real container. Successors
 * first render into an inert, offscreen, document-connected probe root; only
 * an acknowledged probe may be rendered into the existing visible root.
 * Keeping that root and its element tree preserves compatible component-local
 * state across accepted plans, while connected layout failures still leave the
 * visible predecessor untouched.
 *
 * A visible-only failure is rolled back to the previous plan. If that rollback
 * also fails, the publication disposes itself rather than retaining an
 * unacknowledged tree.
 */
export function createPersistentReactLayoutPublicationInternalV1<TPlan>(
  input: CreatePersistentReactLayoutPublicationInputInternalV1<TPlan>,
): ReactLayoutPublicationV1<TPlan> {
  let disposed = false;
  let busy = false;
  let mounted = false;
  let currentPlan!: TPlan;
  let visibleRoot: ManagedPersistentReactRootInternalV1 | null = null;
  let publicationId = 0;
  let activeFailureHandler: ((error: unknown) => void) | null = null;

  const reportFailure = (error: unknown): void => {
    try {
      input.reportFailure?.(error);
    } catch {
      // Publication diagnostics are observational.
    }
  };

  const createManagedRoot = (
    host: HTMLDivElement,
  ): ManagedPersistentReactRootInternalV1 => {
    let failureHandler: ((error: unknown) => void) | null = null;
    const root = createRoot(host, {
      onCaughtError: reportFailure,
      onRecoverableError: reportFailure,
      onUncaughtError(error) {
        const handler = failureHandler;
        if (handler === null) reportFailure(error);
        else handler(error);
      },
    });
    return {
      host,
      root,
      disposed: false,
      setFailureHandler(handler) {
        failureHandler = handler;
      },
    };
  };

  const disposeManagedRoot = (managed: ManagedPersistentReactRootInternalV1): void => {
    if (managed.disposed) return;
    managed.disposed = true;
    managed.setFailureHandler(null);
    try {
      managed.root.unmount();
    } catch (error) {
      reportFailure(error);
    }
    managed.host.remove();
  };

  const commit = (
    managed: ManagedPersistentReactRootInternalV1,
    plan: TPlan,
    target: PersistentReactLayoutRenderTargetInternalV1,
    signal?: AbortSignal,
  ): Promise<void> => {
    if (managed.disposed) {
      return Promise.reject(abortErrorV1("Persistent React root is disposed"));
    }
    if (signal?.aborted === true) {
      return Promise.reject(signal.reason ?? abortErrorV1("React publication aborted"));
    }
    publicationId += 1;
    const expectedPublicationId = publicationId;
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const settle = (): boolean => {
        if (settled) return false;
        settled = true;
        signal?.removeEventListener("abort", abort);
        managed.setFailureHandler(null);
        if (activeFailureHandler === fail) activeFailureHandler = null;
        return true;
      };
      const succeed = (): void => {
        if (settle()) resolve();
      };
      const fail = (error: unknown): void => {
        if (settle()) reject(error);
      };
      const abort = (): void => fail(signal?.reason ?? abortErrorV1("React publication aborted"));
      managed.setFailureHandler(fail);
      activeFailureHandler = fail;
      signal?.addEventListener("abort", abort, { once: true });
      try {
        const rendered = input.render(plan, target);
        if (signal?.aborted === true) {
          fail(signal.reason ?? abortErrorV1("React publication aborted"));
          return;
        }
        managed.root.render(
          <LayoutCommitV1
            publicationId={expectedPublicationId}
            acknowledge={(committedId) => {
              if (committedId === expectedPublicationId) succeed();
            }}
          >
            {rendered}
          </LayoutCommitV1>,
        );
      } catch (error) {
        fail(error);
      }
    });
  };

  const createProbe = async (
    plan: TPlan,
    signal: AbortSignal,
  ): Promise<ManagedPersistentReactRootInternalV1> => {
    const ownerDocument = input.container.ownerDocument ?? document;
    const host = ownerDocument.createElement("div");
    host.dataset.sillymakerStudioEpoch = "probe";
    host.setAttribute("aria-hidden", "true");
    host.setAttribute("inert", "");
    host.style.position = "fixed";
    host.style.insetInlineStart = "-100000px";
    host.style.insetBlockStart = "0";
    host.style.inlineSize = `${
      String(Math.max(1, visibleRoot?.host.getBoundingClientRect().width ?? 1))
    }px`;
    host.style.blockSize = `${
      String(Math.max(1, visibleRoot?.host.getBoundingClientRect().height ?? 1))
    }px`;
    host.style.overflow = "hidden";
    host.style.visibility = "hidden";
    host.style.pointerEvents = "none";
    const probe = createManagedRoot(host);
    try {
      const probeParent = ownerDocument.body ?? ownerDocument.documentElement;
      if (probeParent === null) {
        throw new TypeError("Persistent React probe has no document staging parent");
      }
      probeParent.append(host);
      await commit(probe, plan, "probe", signal);
      return probe;
    } catch (error) {
      // Let React leave its render/layout work loop before retiring the probe.
      disposeManagedRoot(probe);
      throw error;
    }
  };

  const poison = (managed: ManagedPersistentReactRootInternalV1): void => {
    disposed = true;
    mounted = false;
    if (visibleRoot === managed) visibleRoot = null;
    disposeManagedRoot(managed);
  };

  return Object.freeze({
    async mount(plan: TPlan): Promise<void> {
      if (disposed) throw abortErrorV1("Persistent React publication is disposed");
      if (mounted || visibleRoot !== null || busy) {
        throw new TypeError("Persistent React root is already mounted");
      }
      busy = true;
      const ownerDocument = input.container.ownerDocument ?? document;
      const host = ownerDocument.createElement("div");
      host.dataset.sillymakerStudioEpoch = "current";
      const managed = createManagedRoot(host);
      try {
        // The initial commit must observe its real connected layout. Unlike a
        // successor probe, this root is visible before React renders it.
        input.container.replaceChildren(host);
        visibleRoot = managed;
        await commit(managed, plan, "visible");
        if (disposed) {
          throw abortErrorV1("Persistent React publication was disposed during mount");
        }
        currentPlan = plan;
        mounted = true;
      } catch (error) {
        if (visibleRoot === managed) visibleRoot = null;
        disposeManagedRoot(managed);
        throw error;
      } finally {
        busy = false;
      }
    },

    async publish(plan: TPlan, signal: AbortSignal): Promise<void> {
      if (disposed) throw abortErrorV1("Persistent React publication is disposed");
      if (!mounted || visibleRoot === null) {
        throw new TypeError("Persistent React root is not mounted");
      }
      if (busy) throw new TypeError("Persistent React publication is already in progress");
      busy = true;
      let probe: ManagedPersistentReactRootInternalV1 | null = null;
      try {
        probe = await createProbe(plan, signal);
        if (disposed || signal.aborted) {
          throw signal.reason ?? abortErrorV1("Persistent React publication aborted");
        }
        disposeManagedRoot(probe);
        probe = null;
        if (disposed || signal.aborted) {
          throw signal.reason ?? abortErrorV1("Persistent React publication aborted");
        }

        const managed = visibleRoot;
        const previousPlan = currentPlan;
        try {
          await commit(managed, plan, "visible", signal);
          if (disposed || signal.aborted) {
            throw signal.reason ?? abortErrorV1("Persistent React publication aborted");
          }
          currentPlan = plan;
        } catch (candidateError) {
          if (disposed || managed.disposed || visibleRoot !== managed) throw candidateError;
          try {
            // Rollback is not cancellable by the failed candidate's signal.
            await commit(managed, previousPlan, "visible");
            if (disposed || managed.disposed || visibleRoot !== managed) {
              throw abortErrorV1("Persistent React publication was disposed during rollback");
            }
          } catch (rollbackError) {
            if (disposed || managed.disposed || visibleRoot !== managed) throw rollbackError;
            poison(managed);
            const publicationFailure = new AggregateError(
              [candidateError, rollbackError],
              "Persistent React publication candidate and rollback both failed",
              { cause: candidateError },
            );
            throw publicationFailure;
          }
          throw candidateError;
        }
      } finally {
        if (probe !== null) disposeManagedRoot(probe);
        busy = false;
      }
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      mounted = false;
      activeFailureHandler?.(abortErrorV1("Persistent React publication was disposed"));
      const managed = visibleRoot;
      visibleRoot = null;
      if (managed !== null) disposeManagedRoot(managed);
    },
  });
}

export interface StudioToolingReactPublicationV1 {
  mount(plan: StudioToolingPlanV1): Promise<void>;
  publish(plan: StudioToolingPlanV1, signal: AbortSignal): Promise<void>;
  dispose(): void;
}

export interface CreateStudioToolingReactPublicationInputV1 {
  readonly container: Element | DocumentFragment;
  /** Standalone route by default; the dev game entry selects the embedded shell. */
  readonly mode?: "standalone" | "embedded";
  readonly reportFailure?: (error: unknown) => void;
}

export interface CreateStudioToolingReactPublicationInputInternalV1
  extends CreateStudioToolingReactPublicationInputV1 {
  /** Focused-test seam; production always uses the build-known literal loader. */
  readonly loadFlowWorkspace?: FlowWorkspaceLoaderInternalV1;
}

/**
 * Owns one Authoring Host and one persistent visible React root. Every R1
 * successor first proves itself in an inert, document-connected probe, then
 * re-renders the same visible root. The Host, document sessions, selection,
 * workspace state and compatible component-local editor state therefore
 * survive both rejected and accepted candidates.
 */
export function createStudioToolingReactPublicationInternalV1(
  input: CreateStudioToolingReactPublicationInputInternalV1,
): StudioToolingReactPublicationV1 {
  let sceneIo: StudioToolingPlanV1["sceneIo"] | null = null;
  let motionIo: StudioToolingPlanV1["motionIo"] | null = null;
  let regionsIoInitialized = false;
  let regionsIo: StudioToolingPlanV1["regionsIo"];
  let host: AuthoringHostInternalV1 | null = null;
  let agentHost: AgentHostInternalV1 | null = null;
  let agentConfigurationInitialized = false;
  let agentConfigurationId: string | null = null;
  let agentActionSignature: string | null = null;
  const visibleViewId = 1;
  let nextProbeViewId = 2;
  const mode = input.mode ?? "standalone";
  const publication = createPersistentReactLayoutPublicationInternalV1<StudioToolingPlanV1>({
    container: input.container,
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
    render(plan, target) {
      if (sceneIo === null) {
        sceneIo = plan.sceneIo;
      } else if (plan.sceneIo !== sceneIo) {
        throw new TypeError("Studio live publication cannot replace its scene IO owner");
      }
      if (motionIo === null) {
        motionIo = plan.motionIo;
      } else if (plan.motionIo !== motionIo) {
        throw new TypeError("Studio live publication cannot replace its motion IO owner");
      }
      if (!regionsIoInitialized) {
        regionsIoInitialized = true;
        regionsIo = plan.regionsIo;
      } else if (plan.regionsIo !== regionsIo) {
        throw new TypeError("Studio live publication cannot replace its regions IO owner");
      }
      host ??= createAuthoringHostInternalV1({
        sceneIo: plan.sceneIo,
        motionIo: plan.motionIo,
        ...(plan.regionsIo === undefined ? {} : { regionsIo: plan.regionsIo }),
        ...(input.loadFlowWorkspace === undefined
          ? {}
          : { loadFlowWorkspace: input.loadFlowWorkspace }),
        ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
      });
      const agentBinding = mode === "embedded"
        ? resolveExperimentalEmbeddedAgentBindingInternalV1(plan.binding)
        : null;
      if (!agentConfigurationInitialized) {
        agentConfigurationInitialized = true;
        agentConfigurationId = agentBinding?.configurationId ?? null;
        agentActionSignature = agentBinding?.actionSignature ?? null;
        if (agentBinding !== null) {
          agentHost = createAgentHostInternalV1({
            client: agentBinding.createClient(),
            allowedActionIds: agentBinding.allowedActionIds,
          });
        }
      } else if (
        (agentBinding?.configurationId ?? null) !== agentConfigurationId ||
        (agentBinding?.actionSignature ?? null) !== agentActionSignature
      ) {
        throw new TypeError(
          "Studio live publication cannot replace its Experimental Agent owner or action set",
        );
      }
      const viewId = target === "visible" ? visibleViewId : nextProbeViewId++;
      return mode === "embedded"
        ? (
          <EmbeddedAuthoringSurfaceInternalV1
            host={host}
            binding={plan.binding}
            publicationRole={target}
            viewId={viewId}
            {...(agentBinding === null || agentHost === null
              ? {}
              : { agent: Object.freeze({ host: agentHost, binding: agentBinding }) })}
          />
        )
        : (
          <AuthoringHostSurfaceInternalV1
            host={host}
            binding={plan.binding}
            mode="standalone"
            publicationRole={target}
            viewId={viewId}
          />
        );
    },
  });
  return Object.freeze({
    mount: (plan: StudioToolingPlanV1) => publication.mount(plan),
    publish: (plan: StudioToolingPlanV1, signal: AbortSignal) => publication.publish(plan, signal),
    dispose(): void {
      publication.dispose();
      const mountedAgentHost = agentHost;
      agentHost = null;
      void mountedAgentHost?.dispose().catch((error: unknown) => {
        try {
          input.reportFailure?.(error);
        } catch {
          // Lifecycle diagnostics are observational.
        }
      });
      const mountedHost = host;
      host = null;
      void mountedHost?.dispose().catch((error: unknown) => {
        try {
          input.reportFailure?.(error);
        } catch {
          // Lifecycle diagnostics are observational.
        }
      });
    },
  });
}

export function createStudioToolingReactPublicationV1(
  input: CreateStudioToolingReactPublicationInputV1,
): StudioToolingReactPublicationV1 {
  return createStudioToolingReactPublicationInternalV1(input);
}
