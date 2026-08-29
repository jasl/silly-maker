// SPDX-License-Identifier: MIT
import { createElement, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";

import type {
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryFeatureV1,
  NarrativeSurfaceHistoryRendererPropsV1,
} from "@sillymaker/ui";

export interface VnHistoryPresentationV1 {
  readonly feature: NarrativeSurfaceHistoryFeatureV1;
  readonly renderOpenControl: (
    props: NarrativeSurfaceDialogueRendererPropsV1,
  ) => ReactNode;
}

export interface VnHistoryPresentationBridgeV1 {
  /** Stable feature supplied once to the generic Narrative surface owner. */
  readonly feature: NarrativeSurfaceHistoryFeatureV1;
  /** Stable core-player slot; it renders nothing while no History Mod is selected. */
  readonly renderOpenControl: (
    props: NarrativeSurfaceDialogueRendererPropsV1,
  ) => ReactNode;
  getCurrent(): VnHistoryPresentationV1 | null;
  subscribe(listener: () => void): () => void;
  /**
   * Publishes one candidate and settles only after mounted React consumers
   * committed it. An open History window is closed and unmounted first.
   */
  publish(candidate: VnHistoryPresentationV1 | null): Promise<void>;
  dispose(): Promise<void>;
}

interface HistoryPresentationSnapshotInternalV1 {
  readonly token: number;
  readonly presentation: VnHistoryPresentationV1 | null;
}

interface PublicationCommitWaiterInternalV1 {
  readonly token: number;
  readonly requiredConsumers: Set<object>;
  readonly resolve: () => void;
}

interface HistoryCloseWaiterInternalV1 {
  readonly requiredConsumers: Set<object>;
  readonly resolve: () => void;
}

/**
 * Keeps the generic Narrative/History family as the single window and input
 * owner while allowing one selected presentation implementation to change on
 * the R1 cold path. It never owns or copies NarrativeHistory State.
 */
export function createVnHistoryPresentationBridgeV1(
  initial: VnHistoryPresentationV1 | null = null,
): VnHistoryPresentationBridgeV1 {
  let snapshot: HistoryPresentationSnapshotInternalV1 = {
    token: 0,
    presentation: initial,
  };
  let disposeRequested = false;
  let disposed = false;
  let disposePromise: Promise<void> | null = null;
  let serial = Promise.resolve();
  const listeners = new Set<() => void>();
  const consumers = new Map<object, number>();
  const historyClosers = new Map<object, () => boolean>();
  let commitWaiter: PublicationCommitWaiterInternalV1 | null = null;
  let closeWaiter: HistoryCloseWaiterInternalV1 | null = null;

  const getSnapshot = (): HistoryPresentationSnapshotInternalV1 => snapshot;
  const subscribe = (listener: () => void): () => void => {
    if (disposed) return () => undefined;
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const finishCommitIfReady = (): void => {
    const waiter = commitWaiter;
    if (waiter === null || waiter.requiredConsumers.size !== 0) return;
    commitWaiter = null;
    waiter.resolve();
  };
  const finishCloseIfReady = (): void => {
    const waiter = closeWaiter;
    if (waiter === null || waiter.requiredConsumers.size !== 0) return;
    closeWaiter = null;
    waiter.resolve();
  };
  const attachConsumer = (consumer: object): void => {
    consumers.set(consumer, -1);
    commitWaiter?.requiredConsumers.add(consumer);
  };
  const commitConsumer = (consumer: object, token: number): void => {
    consumers.set(consumer, token);
    const waiter = commitWaiter;
    if (waiter === null || token !== waiter.token) return;
    waiter.requiredConsumers.delete(consumer);
    finishCommitIfReady();
  };
  const detachConsumer = (consumer: object): void => {
    consumers.delete(consumer);
    commitWaiter?.requiredConsumers.delete(consumer);
    finishCommitIfReady();
  };
  const attachHistory = (consumer: object, close: () => boolean): void => {
    historyClosers.set(consumer, close);
  };
  const detachHistory = (consumer: object): void => {
    historyClosers.delete(consumer);
    closeWaiter?.requiredConsumers.delete(consumer);
    finishCloseIfReady();
  };

  function usePublicationConsumerInternalV1(): Readonly<{
    readonly consumer: object;
    readonly snapshot: HistoryPresentationSnapshotInternalV1;
  }> {
    const consumerRef = useRef<object | null>(null);
    if (consumerRef.current === null) consumerRef.current = {};
    const consumer = consumerRef.current;
    const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    useLayoutEffect(() => {
      attachConsumer(consumer);
      return () => detachConsumer(consumer);
    }, [consumer]);
    useLayoutEffect(() => {
      commitConsumer(consumer, current.token);
    }, [consumer, current.token]);
    return { consumer, snapshot: current };
  }

  function HistoryOpenControlOutletInternalV1(props: {
    readonly renderer: NarrativeSurfaceDialogueRendererPropsV1;
  }): ReactNode {
    const current = usePublicationConsumerInternalV1().snapshot.presentation;
    return current === null ? null : current.renderOpenControl(props.renderer);
  }

  function HistoryRendererOutletInternalV1(
    props: NarrativeSurfaceHistoryRendererPropsV1,
  ): ReactElement | null {
    const publication = usePublicationConsumerInternalV1();
    const closeRef = useRef(props.onCloseHistory);
    useLayoutEffect(() => {
      closeRef.current = props.onCloseHistory;
    }, [props.onCloseHistory]);
    useLayoutEffect(() => {
      attachHistory(publication.consumer, () => closeRef.current());
      return () => detachHistory(publication.consumer);
    }, [publication.consumer]);
    const current = publication.snapshot.presentation;
    return current === null ? null : createElement(current.feature.renderer, props);
  }

  const waitForHistoryClose = (): Promise<void> => {
    const requiredConsumers = new Set(historyClosers.keys());
    if (requiredConsumers.size === 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      closeWaiter = { requiredConsumers, resolve };
      finishCloseIfReady();
    });
  };
  const closeCurrentHistory = async (): Promise<void> => {
    if (historyClosers.size === 0) return;
    const closed = waitForHistoryClose();
    for (const close of [...historyClosers.values()]) {
      if (!close()) {
        closeWaiter = null;
        throw new TypeError("vn.history_presentation_close_stale");
      }
    }
    await closed;
  };
  const waitForPublicationCommit = (token: number): Promise<void> => {
    const requiredConsumers = new Set(consumers.keys());
    if (requiredConsumers.size === 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      commitWaiter = { token, requiredConsumers, resolve };
      finishCommitIfReady();
    });
  };
  const publishNow = async (candidate: VnHistoryPresentationV1 | null): Promise<void> => {
    if (snapshot.presentation === candidate) return;
    await closeCurrentHistory();
    const token = snapshot.token + 1;
    const committed = waitForPublicationCommit(token);
    snapshot = { token, presentation: candidate };
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // Observers cannot roll back an already-current presentation owner.
      }
    }
    await committed;
  };
  const enqueue = (operation: () => Promise<void>): Promise<void> => {
    const result = serial.then(operation);
    serial = result.catch(() => undefined);
    return result;
  };

  const bridge: VnHistoryPresentationBridgeV1 = {
    feature: {
      renderer: HistoryRendererOutletInternalV1,
      active: {
        getCurrent: () => snapshot.presentation !== null,
        subscribe,
      },
    },
    renderOpenControl: (renderer) => <HistoryOpenControlOutletInternalV1 renderer={renderer} />,
    getCurrent: () => snapshot.presentation,
    subscribe,
    publish(candidate) {
      if (disposeRequested) {
        return Promise.reject(new TypeError("vn.history_presentation_bridge_disposed"));
      }
      return enqueue(() => publishNow(candidate));
    },
    dispose() {
      if (disposePromise !== null) return disposePromise;
      disposeRequested = true;
      disposePromise = enqueue(async () => {
        await publishNow(null);
        disposed = true;
        listeners.clear();
      });
      return disposePromise;
    },
  };
  return bridge;
}
