// SPDX-License-Identifier: MIT
import { Fragment, useLayoutEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import type { StudioToolingPlanV1 } from "./composition.ts";
import { createRegionsDocumentSessionV1 } from "./core/regions-session.ts";
import { createSceneDocumentSessionV1 } from "./core/scene-session.ts";
import { StudioAppWithAuthoringSessionsV1 } from "./studio-app.tsx";

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
          // The static Author boot shell remains visible while the detached
          // candidate prepares. Retire it only after the first real layout
          // commit has acknowledged, at the same cutover that installs the
          // live Studio owner.
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

export interface StudioToolingReactPublicationV1 {
  mount(plan: StudioToolingPlanV1): Promise<void>;
  publish(plan: StudioToolingPlanV1, signal: AbortSignal): Promise<void>;
  dispose(): void;
}

export interface CreateStudioToolingReactPublicationInputV1 {
  readonly container: Element | DocumentFragment;
  readonly reportFailure?: (error: unknown) => void;
}

/**
 * Owns the dev Studio's epoch roots and its authoring document sessions.
 * Staging and visible epochs receive those exact sessions, so an accepted HMR
 * epoch may remount non-authoritative UI state without discarding unsaved
 * Scene or Regions drafts.
 */
export function createStudioToolingReactPublicationV1(
  input: CreateStudioToolingReactPublicationInputV1,
): StudioToolingReactPublicationV1 {
  let sceneIo: StudioToolingPlanV1["sceneIo"] | null = null;
  let sceneSession: ReturnType<typeof createSceneDocumentSessionV1> | null = null;
  let regionsIoInitialized = false;
  let regionsIo: StudioToolingPlanV1["regionsIo"];
  let regionsSession: ReturnType<typeof createRegionsDocumentSessionV1> | null = null;
  const publication = createReactLayoutPublicationV1<StudioToolingPlanV1>({
    container: input.container,
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
    render(plan) {
      if (sceneIo === null) {
        sceneIo = plan.sceneIo;
        sceneSession = createSceneDocumentSessionV1(plan.sceneIo);
      } else if (plan.sceneIo !== sceneIo) {
        throw new TypeError("Studio live publication cannot replace its scene IO owner");
      }
      if (!regionsIoInitialized) {
        regionsIoInitialized = true;
        regionsIo = plan.regionsIo;
        regionsSession = plan.regionsIo === undefined
          ? null
          : createRegionsDocumentSessionV1(plan.regionsIo);
      } else if (plan.regionsIo !== regionsIo) {
        throw new TypeError("Studio live publication cannot replace its regions IO owner");
      }
      return (
        <StudioAppWithAuthoringSessionsV1
          binding={plan.binding}
          io={plan.sceneIo}
          motionIo={plan.motionIo}
          {...(plan.regionsIo === undefined ? {} : { regionsIo: plan.regionsIo })}
          sceneSession={sceneSession!}
          regionsSession={regionsSession}
        />
      );
    },
  });
  return Object.freeze({
    mount: (plan: StudioToolingPlanV1) => publication.mount(plan),
    publish: (plan: StudioToolingPlanV1, signal: AbortSignal) => publication.publish(plan, signal),
    dispose: () => publication.dispose(),
  });
}
