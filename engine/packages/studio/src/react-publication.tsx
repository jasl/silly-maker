// SPDX-License-Identifier: MIT
import { Fragment, useLayoutEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import type { StudioToolingPlanV1 } from "./composition.ts";
import { createAuthoringHostInternalV1 } from "./core/authoring-host.ts";
import type { AuthoringHostInternalV1 } from "./core/authoring-host.ts";
import { EmbeddedAuthoringSurfaceInternalV1 } from "./embedded-authoring.tsx";
import { resolveEmbeddedAuthoringCompanionInternalV1 } from "./core/embedded-authoring-companion.ts";
import type { EmbeddedAuthoringCompanionOwnerInternalV1 } from "./core/embedded-authoring-companion.ts";
import { AuthoringHostSurfaceInternalV1 } from "./studio-app.tsx";
import type { FlowWorkspaceLoaderInternalV1 } from "./workspaces/flow/flow-workspace-activation.tsx";
import {
  authoringWorkspaceContractInternalV1,
  authoringWorkspaceManifestInternalV1,
} from "./workspaces/workspace-manifest.ts";

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

interface ReactLayoutPublicationInternalV1<TPlan> {
  mount(plan: TPlan): Promise<void>;
  publish(plan: TPlan, signal: AbortSignal): Promise<void>;
  dispose(): void;
}

function abortErrorV1(message: string): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export type PersistentReactLayoutRenderTargetInternalV1 = "visible" | "probe";

interface CreatePersistentReactLayoutPublicationInputInternalV1<TPlan> {
  readonly container: Element | DocumentFragment;
  render(plan: TPlan, target: PersistentReactLayoutRenderTargetInternalV1): ReactNode;
  reportFailure?(error: unknown): void;
  /** Retires owners when candidate and rollback failures poison the publication. */
  onTerminalFailure?(): void;
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
): ReactLayoutPublicationInternalV1<TPlan> {
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
    try {
      input.onTerminalFailure?.();
    } catch (error) {
      reportFailure(error);
    }
  };

  return {
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
  };
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
  let chromeIoInitialized = false;
  let chromeIo: StudioToolingPlanV1["chromeIo"];
  let host: AuthoringHostInternalV1 | null = null;
  let companionOwner: EmbeddedAuthoringCompanionOwnerInternalV1 | null = null;
  let companionConfigurationInitialized = false;
  let companionCompatibilityId: string | null = null;
  let companionContentSignature: string | null = null;
  const visibleViewId = 1;
  let nextProbeViewId = 2;
  const mode = input.mode ?? "standalone";
  const disposeOwners = (): void => {
    const mountedCompanionOwner = companionOwner;
    companionOwner = null;
    void mountedCompanionOwner?.dispose().catch((error: unknown) => {
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
  };
  const publication = createPersistentReactLayoutPublicationInternalV1<StudioToolingPlanV1>({
    container: input.container,
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
    onTerminalFailure: disposeOwners,
    render(plan, target) {
      const workspaceManifest = authoringWorkspaceManifestInternalV1({
        hasFlow: plan.binding.flow !== undefined,
        hasRegionsIo: plan.regionsIo !== undefined,
        hasChromeIo: plan.chromeIo !== undefined,
      });
      if (
        host !== null &&
        host.getSnapshot().workspaceContractSignature !==
          authoringWorkspaceContractInternalV1(workspaceManifest).signature
      ) {
        throw new TypeError("Studio live publication cannot replace its workspace contract");
      }
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
      if (!chromeIoInitialized) {
        chromeIoInitialized = true;
        chromeIo = plan.chromeIo;
      } else if (plan.chromeIo !== chromeIo) {
        throw new TypeError("Studio live publication cannot replace its chrome IO owner");
      }
      host ??= createAuthoringHostInternalV1({
        workspaceManifest,
        sceneIo: plan.sceneIo,
        motionIo: plan.motionIo,
        ...(plan.regionsIo === undefined ? {} : { regionsIo: plan.regionsIo }),
        ...(plan.chromeIo === undefined ? {} : { chromeIo: plan.chromeIo }),
        ...(input.loadFlowWorkspace === undefined
          ? {}
          : { loadFlowWorkspace: input.loadFlowWorkspace }),
        ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
      });
      const companionDefinition = mode === "embedded"
        ? resolveEmbeddedAuthoringCompanionInternalV1(plan.binding)
        : null;
      if (!companionConfigurationInitialized) {
        companionConfigurationInitialized = true;
        companionCompatibilityId = companionDefinition?.compatibilityId ?? null;
        companionContentSignature = companionDefinition?.contentSignature ?? null;
        if (companionDefinition !== null) {
          companionOwner = companionDefinition.createOwner();
        }
      } else if (
        (companionDefinition?.compatibilityId ?? null) !== companionCompatibilityId ||
        (companionDefinition?.contentSignature ?? null) !== companionContentSignature
      ) {
        throw new TypeError(
          "Studio live publication cannot replace its embedded companion owner or contract",
        );
      }
      const viewId = target === "visible" ? visibleViewId : nextProbeViewId++;
      return mode === "embedded"
        ? (
          <EmbeddedAuthoringSurfaceInternalV1
            host={host}
            binding={plan.binding}
            workspaceManifest={workspaceManifest}
            publicationRole={target}
            viewId={viewId}
            {...(companionDefinition === null || companionOwner === null ? {} : {
              companion: {
                owner: companionOwner,
                definition: companionDefinition,
              },
            })}
          />
        )
        : (
          <AuthoringHostSurfaceInternalV1
            host={host}
            binding={plan.binding}
            workspaceManifest={workspaceManifest}
            mode="standalone"
            publicationRole={target}
            viewId={viewId}
          />
        );
    },
  });
  return {
    mount: (plan: StudioToolingPlanV1) => publication.mount(plan),
    publish: (plan: StudioToolingPlanV1, signal: AbortSignal) => publication.publish(plan, signal),
    dispose(): void {
      publication.dispose();
      disposeOwners();
    },
  };
}

export function createStudioToolingReactPublicationV1(
  input: CreateStudioToolingReactPublicationInputV1,
): StudioToolingReactPublicationV1 {
  return createStudioToolingReactPublicationInternalV1(input);
}
