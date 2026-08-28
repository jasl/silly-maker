// SPDX-License-Identifier: MIT

export interface EmbeddedAuthoringLauncherSnapshotInternalV1 {
  readonly available: boolean;
  readonly hosted: boolean;
  readonly surfaceOpen: boolean;
  readonly requestRevision: number;
}

export interface EmbeddedAuthoringLauncherPortInternalV1 {
  readonly state: {
    getCurrent(): EmbeddedAuthoringLauncherSnapshotInternalV1;
    subscribe(listener: () => void): () => void;
  };
  activate(): Promise<void>;
  claimHost(): () => void;
  claimSurface(): () => void;
}

interface EmbeddedAuthoringLauncherStoreInternalV1 {
  owner: symbol | null;
  activate: (() => void | Promise<void>) | null;
  hostCount: number;
  surfaceCount: number;
  listeners: Set<() => void>;
  snapshot: EmbeddedAuthoringLauncherSnapshotInternalV1;
}

const unavailableSnapshotInternalV1 = {
  available: false,
  hosted: false,
  surfaceOpen: false,
  requestRevision: 0,
} satisfies EmbeddedAuthoringLauncherSnapshotInternalV1;

const launcherStoresInternalV1 = new WeakMap<
  Document,
  EmbeddedAuthoringLauncherStoreInternalV1
>();

function resolveLauncherStoreInternalV1(
  ownerDocument: Document,
): EmbeddedAuthoringLauncherStoreInternalV1 {
  const existing = launcherStoresInternalV1.get(ownerDocument);
  if (existing !== undefined) return existing;
  const created: EmbeddedAuthoringLauncherStoreInternalV1 = {
    owner: null,
    activate: null,
    hostCount: 0,
    surfaceCount: 0,
    listeners: new Set(),
    snapshot: unavailableSnapshotInternalV1,
  };
  launcherStoresInternalV1.set(ownerDocument, created);
  return created;
}

function publishLauncherSnapshotInternalV1(
  store: EmbeddedAuthoringLauncherStoreInternalV1,
  next: EmbeddedAuthoringLauncherSnapshotInternalV1,
): void {
  const current = store.snapshot;
  if (
    current.available === next.available && current.hosted === next.hosted &&
    current.surfaceOpen === next.surfaceOpen &&
    current.requestRevision === next.requestRevision
  ) return;
  store.snapshot = next;
  for (const listener of [...store.listeners]) listener();
}

function createUnavailablePortInternalV1(): EmbeddedAuthoringLauncherPortInternalV1 {
  return {
    state: {
      getCurrent: () => unavailableSnapshotInternalV1,
      subscribe: () => () => undefined,
    },
    activate: async () => undefined,
    claimHost: () => () => undefined,
    claimSurface: () => () => undefined,
  };
}

export function createEmbeddedAuthoringLauncherPortInternalV1(
  ownerDocument: Document | null = typeof document === "undefined" ? null : document,
): EmbeddedAuthoringLauncherPortInternalV1 {
  if (ownerDocument === null) return createUnavailablePortInternalV1();
  const store = resolveLauncherStoreInternalV1(ownerDocument);
  return {
    state: {
      getCurrent: () => store.snapshot,
      subscribe(listener: () => void) {
        store.listeners.add(listener);
        return () => store.listeners.delete(listener);
      },
    },
    async activate() {
      const activate = store.activate;
      if (activate === null) return;
      publishLauncherSnapshotInternalV1(store, {
        ...store.snapshot,
        requestRevision: store.snapshot.requestRevision + 1,
      });
      await activate();
    },
    claimHost() {
      store.hostCount += 1;
      publishLauncherSnapshotInternalV1(store, {
        ...store.snapshot,
        hosted: true,
      });
      let released = false;
      return () => {
        if (released) return;
        released = true;
        store.hostCount = Math.max(0, store.hostCount - 1);
        publishLauncherSnapshotInternalV1(store, {
          ...store.snapshot,
          hosted: store.hostCount > 0,
        });
      };
    },
    claimSurface() {
      store.surfaceCount += 1;
      publishLauncherSnapshotInternalV1(store, {
        ...store.snapshot,
        surfaceOpen: true,
      });
      let released = false;
      return () => {
        if (released) return;
        released = true;
        store.surfaceCount = Math.max(0, store.surfaceCount - 1);
        publishLauncherSnapshotInternalV1(store, {
          ...store.snapshot,
          surfaceOpen: store.surfaceCount > 0,
        });
      };
    },
  };
}

export function registerEmbeddedAuthoringLauncherInternalV1(
  ownerDocument: Document,
  activate: () => void | Promise<void>,
): () => void {
  const store = resolveLauncherStoreInternalV1(ownerDocument);
  const owner = Symbol("embedded-authoring-launcher");
  store.owner = owner;
  store.activate = activate;
  publishLauncherSnapshotInternalV1(store, {
    ...store.snapshot,
    available: true,
  });
  return () => {
    if (store.owner !== owner) return;
    store.owner = null;
    store.activate = null;
    publishLauncherSnapshotInternalV1(store, {
      ...store.snapshot,
      available: false,
    });
  };
}
