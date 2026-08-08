// SPDX-License-Identifier: MIT
import { parseInteractionSurfaceId, parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { parseManagedSurfaceActionIdV1 } from "../managed-surfaces/managed-surface-contracts.ts";
import {
  defineWorkspaceOverlayV1,
  resolveWorkspaceOverlaySessionInternalV1,
} from "../overlays/workspace-overlay-session.ts";
import {
  createSystemDialogRootCatalogSnapshotInternalV1,
  resolveSystemDialogSessionInternalV1,
} from "../system/system-dialog-managed-session.ts";
import {
  createGameUiCompositionV1,
  createGameUiCompositionWithEpochAllocatorInternalV1,
  createHostedGameUiCompositionInternalV1,
  resolveGameUiManagedSurfaceCompositionInternalV1,
  type GameUiPresentationAnchorEventInternalV1,
  type GameUiPresentationAnchorEventSourceInternalV1,
  type GameUiPresentationSuccessorProducerInternalV1,
  type GameUiAnchorSourceV1,
  type GameUiPresentationAnchorV1,
} from "./create-game-ui-composition.ts";

const overlayDefinitionV1 = defineWorkspaceOverlayV1({
  id: "overlay.epoch-fixture",
  contractRevision: 1,
});

function deferredV1() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}

function createAnchorSourceV1() {
  let current: GameUiPresentationAnchorV1 = Object.freeze({ epoch: 0, origin: "bootstrap" });
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(event: GameUiPresentationAnchorEventInternalV1) => void>();
  const source: GameUiAnchorSourceV1 = Object.freeze({
    current: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
  return Object.freeze({
    source,
    events: Object.freeze({
      current: () => current,
      subscribe(listener: (event: GameUiPresentationAnchorEventInternalV1) => void) {
        eventListeners.add(listener);
        return () => eventListeners.delete(listener);
      },
    }),
    publish(next: GameUiPresentationAnchorV1): void {
      current = Object.freeze({ ...next });
      for (const listener of [...eventListeners]) {
        listener(Object.freeze({ anchor: current, token: null }));
      }
      for (const listener of [...listeners]) listener();
    },
  });
}

function createExactAnchorEventSourceV1() {
  let current: GameUiPresentationAnchorV1 = Object.freeze({ epoch: 0, origin: "bootstrap" });
  const listeners = new Set<
    (event: GameUiPresentationAnchorEventInternalV1) => void
  >();
  const source: GameUiPresentationAnchorEventSourceInternalV1 = Object.freeze({
    current: () => current,
    subscribe(listener: Parameters<GameUiPresentationAnchorEventSourceInternalV1["subscribe"]>[0]) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
  return Object.freeze({
    source,
    publish(event: GameUiPresentationAnchorEventInternalV1): void {
      current = event.anchor;
      for (const listener of [...listeners]) listener(event);
    },
  });
}

function createSuccessorProducerFixtureV1(
  onFailed?: (
    outcome: Parameters<GameUiPresentationSuccessorProducerInternalV1["failed"]>[0],
  ) => void,
) {
  const installed: Parameters<GameUiPresentationSuccessorProducerInternalV1["installed"]>[0][] = [];
  const failed: Parameters<GameUiPresentationSuccessorProducerInternalV1["failed"]>[0][] = [];
  const producer: GameUiPresentationSuccessorProducerInternalV1 = Object.freeze({
    installed(outcome: Parameters<GameUiPresentationSuccessorProducerInternalV1["installed"]>[0]) {
      installed.push(outcome);
    },
    failed(outcome: Parameters<GameUiPresentationSuccessorProducerInternalV1["failed"]>[0]) {
      failed.push(outcome);
      onFailed?.(outcome);
    },
  });
  return Object.freeze({ producer, installed, failed });
}

function createExactHostedCompositionFixtureV1(
  anchorEvents: ReturnType<typeof createExactAnchorEventSourceV1>,
  producerFixture: ReturnType<typeof createSuccessorProducerFixtureV1>,
  epochSequence: readonly number[] = [11, 17, 23],
) {
  let allocationCursor = 0;
  const allocatedEpochs: number[] = [];
  let semanticPublication: { readonly revision: number } = Object.freeze({ revision: 0 });
  const semanticListeners = new Set<() => void>();
  let semanticUnsubscriptions = 0;
  const composition = createHostedGameUiCompositionInternalV1({
    semantic: Object.freeze({
      observe: () => semanticPublication,
      subscribe(listener: () => void) {
        semanticListeners.add(listener);
        return () => {
          if (!semanticListeners.delete(listener)) return;
          semanticUnsubscriptions += 1;
        };
      },
    }),
    projector: Object.freeze({
      resolvedCatalog: Object.freeze({}),
      initialUiState: Object.freeze({ count: 0 as number }),
      project: (input: {
        readonly uiState: {
          readonly anchor: GameUiPresentationAnchorV1;
          readonly story: { readonly count: number };
        };
      }) =>
        Object.freeze({
          view: Object.freeze({
            anchorEpoch: input.uiState.anchor.epoch,
            count: input.uiState.story.count,
          }),
          requiredAssetIds: Object.freeze([]),
        }),
    }),
    overlayDefinitions: Object.freeze([overlayDefinitionV1]),
    interactionSurfaceIds: Object.freeze(["surface.e2e.fixture" as never]),
    cueIds: Object.freeze(["cue.e2e.fixture"]),
  }, {
    managedSurfaceEpochAllocator: Object.freeze({
      allocate() {
        const epoch = parseNonNegativeSafeInteger(epochSequence[allocationCursor]);
        allocationCursor += 1;
        allocatedEpochs.push(epoch);
        return epoch;
      },
    }),
    anchorEvents: anchorEvents.source,
    successorProducer: producerFixture.producer,
  });
  return Object.freeze({
    composition,
    allocatedEpochs,
    publishSemantic(): void {
      semanticPublication = Object.freeze({ revision: semanticPublication.revision + 1 });
      for (const listener of [...semanticListeners]) listener();
    },
    semanticUnsubscriptions: () => semanticUnsubscriptions,
  });
}

function createHostedCompositionFixtureV1(
  anchor: ReturnType<typeof createAnchorSourceV1>,
  epochSequence: readonly number[] = [11, 17],
) {
  let allocationCursor = 0;
  const allocatedEpochs: number[] = [];
  const semanticPublication = Object.freeze({ revision: 0 });
  const composition = createHostedGameUiCompositionInternalV1({
    semantic: Object.freeze({
      observe: () => semanticPublication,
      subscribe: () => () => undefined,
    }),
    anchor: anchor.source,
    projector: Object.freeze({
      resolvedCatalog: Object.freeze({}),
      initialUiState: Object.freeze({}),
      project: (input: { readonly uiState: { readonly anchor: GameUiPresentationAnchorV1 } }) =>
        Object.freeze({
          view: Object.freeze({ anchorEpoch: input.uiState.anchor.epoch }),
          requiredAssetIds: Object.freeze([]),
        }),
    }),
    overlayDefinitions: Object.freeze([overlayDefinitionV1]),
  }, {
    managedSurfaceEpochAllocator: Object.freeze({
      allocate() {
        const epoch = parseNonNegativeSafeInteger(epochSequence[allocationCursor]);
        allocationCursor += 1;
        allocatedEpochs.push(epoch);
        return epoch;
      },
    }),
    anchorEvents: anchor.events,
    successorProducer: Object.freeze({
      installed: () => undefined,
      failed: () => undefined,
    }),
  });
  return Object.freeze({ composition, allocatedEpochs });
}

describe("createHostedGameUiCompositionInternalV1 Managed Surface lifetime", () => {
  it("publishes the managed opaque System facade as the only composition lifecycle authority", () => {
    const composition = createGameUiCompositionV1({
      semantic: Object.freeze({
        observe: () => Object.freeze({ revision: 0 }),
        subscribe: () => () => undefined,
      }),
      projector: Object.freeze({
        resolvedCatalog: Object.freeze({}),
        initialUiState: Object.freeze({}),
        project: () =>
          Object.freeze({
            view: Object.freeze({}),
            requiredAssetIds: Object.freeze([]),
          }),
      }),
    });

    try {
      const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
      const before = managed.runtime.getCurrent().coordinator.getSnapshot();

      expect(composition.systemDialogSession).toBe(managed.systemDialogSession);
      expect(Reflect.ownKeys(composition.systemDialogSession)).toEqual([
        "getSnapshot",
        "openSettings",
        "openSaves",
      ]);
      expect(Object.isFrozen(composition.systemDialogSession)).toBe(true);
      expect(composition.systemDialogSession.getSnapshot()).toEqual({ active: null });
      expect(composition.systemDialogSession.openSettings()).toEqual({
        kind: "rejected",
        code: "system_dialog.renderer_unavailable",
      });
      expect(managed.runtime.getCurrent().coordinator.getSnapshot()).toBe(before);
      expect("open" in composition.systemDialogSession).toBe(false);
      expect("close" in composition.systemDialogSession).toBe(false);
      expect("subscribe" in composition.systemDialogSession).toBe(false);
    } finally {
      composition.dispose();
    }
  });

  it("does not leak semantic subscriptions when Overlay admission rejects construction", () => {
    let subscriptions = 0;
    let unsubscriptions = 0;
    const semanticPublication = Object.freeze({ revision: 0 });

    expect(() =>
      createGameUiCompositionV1({
        semantic: Object.freeze({
          observe: () => semanticPublication,
          subscribe: () => {
            subscriptions += 1;
            return () => {
              unsubscriptions += 1;
            };
          },
        }),
        projector: Object.freeze({
          resolvedCatalog: Object.freeze({}),
          initialUiState: Object.freeze({}),
          project: () =>
            Object.freeze({
              view: Object.freeze({}),
              requiredAssetIds: Object.freeze([]),
            }),
        }),
        overlayPorts: Object.freeze([
          Object.freeze({ id: "overlay.port.duplicate", port: Object.freeze({}) }),
          Object.freeze({ id: "overlay.port.duplicate", port: Object.freeze({}) }),
        ]),
      })
    ).toThrowError("ui.workspace_overlay_duplicate_port_binding");

    expect({ subscriptions, unsubscriptions }).toEqual({
      subscriptions: 0,
      unsubscriptions: 0,
    });
  });

  it("does not invoke caller array methods while admitting Overlay definitions", () => {
    let subscriptions = 0;
    const callerMap = vi.fn(() => {
      throw new Error("caller map must not run");
    });
    const overlayDefinitions = [overlayDefinitionV1];
    Object.defineProperty(overlayDefinitions, "map", { value: callerMap });

    expect(() =>
      createGameUiCompositionV1({
        semantic: Object.freeze({
          observe: () => Object.freeze({ revision: 0 }),
          subscribe: () => {
            subscriptions += 1;
            return () => undefined;
          },
        }),
        projector: Object.freeze({
          resolvedCatalog: Object.freeze({}),
          initialUiState: Object.freeze({}),
          project: () =>
            Object.freeze({
              view: Object.freeze({}),
              requiredAssetIds: Object.freeze([]),
            }),
        }),
        overlayDefinitions,
      })
    ).toThrowError("ui.workspace_overlay_definitions_invalid");

    expect(callerMap).not.toHaveBeenCalled();
    expect(subscriptions).toBe(0);
  });

  it("does not apply hosted terminal teardown to an ordinary composition failure", () => {
    const anchor = createAnchorSourceV1();
    const failure = new Error("fixture.ordinary_anchor_listener_failed");
    const composition = createGameUiCompositionV1({
      semantic: Object.freeze({
        observe: () => Object.freeze({ revision: 0 }),
        subscribe: () => () => undefined,
      }),
      anchor: anchor.source,
      projector: Object.freeze({
        resolvedCatalog: Object.freeze({}),
        initialUiState: Object.freeze({ count: 0 }),
        project: () =>
          Object.freeze({
            view: Object.freeze({}),
            requiredAssetIds: Object.freeze([]),
          }),
      }),
    });
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const unsubscribeFailure = composition.anchor.subscribe(() => {
      throw failure;
    });
    let inputCalls = 0;

    try {
      expect(() => anchor.publish(Object.freeze({ epoch: 1, origin: "ordinary" }))).toThrow(
        failure,
      );
      expect(managed.isTerminalInternalV1()).toBe(false);
      const unregister = composition.input.register({
        context: "gameplay",
        handle: () => {
          inputCalls += 1;
          return Object.freeze({ kind: "handled" as const });
        },
      });
      expect(composition.input.route({
        kind: "action",
        actionId: parseManagedSurfaceActionIdV1("ui.ordinary") as never,
      })).toEqual({ kind: "handled", context: "gameplay" });
      expect(inputCalls).toBe(1);
      unregister();
    } finally {
      unsubscribeFailure();
      composition.dispose();
    }
  });

  it("stops an ordinary anchor replacement quietly when an activation callback disposes", () => {
    const anchor = createAnchorSourceV1();
    const composition = createGameUiCompositionV1({
      semantic: Object.freeze({
        observe: () => Object.freeze({ revision: 0 }),
        subscribe: () => () => undefined,
      }),
      anchor: anchor.source,
      projector: Object.freeze({
        resolvedCatalog: Object.freeze({}),
        initialUiState: Object.freeze({}),
        project: () =>
          Object.freeze({
            view: Object.freeze({}),
            requiredAssetIds: Object.freeze([]),
          }),
      }),
      overlayDefinitions: Object.freeze([overlayDefinitionV1]),
    });
    const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
    const unsubscribeOverlay = overlayInternal.subscribe(() => composition.dispose());

    expect(() => anchor.publish(Object.freeze({ epoch: 1, origin: "ordinary" }))).not.toThrow();
    expect(composition.isDisposed()).toBe(true);
    expect(composition.anchor.getCurrent()).toEqual({ epoch: 0, origin: "bootstrap" });
    unsubscribeOverlay();
  });

  it("keeps Overlay intent and closure owner-scoped while dormant System prepares", async () => {
    const semanticPublication = Object.freeze({ revision: 0 });
    const composition = createGameUiCompositionV1({
      semantic: Object.freeze({
        observe: () => semanticPublication,
        subscribe: () => () => undefined,
      }),
      projector: Object.freeze({
        resolvedCatalog: Object.freeze({}),
        initialUiState: Object.freeze({}),
        project: () =>
          Object.freeze({
            view: Object.freeze({}),
            requiredAssetIds: Object.freeze([]),
          }),
      }),
      overlayDefinitions: Object.freeze([overlayDefinitionV1]),
    });

    try {
      const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
      overlayInternal.attachRendererResolverInternalV1(Object.freeze({
        resolve: (id: "overlay.epoch-fixture") =>
          Object.freeze({ accessibleName: id, content: id }),
      }));
      const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
      const systemInternal = resolveSystemDialogSessionInternalV1(
        managedComposition.systemDialogSession,
      );
      const systemHostAttachment = systemInternal.attachHostInternalV1({
        hostIdentity: Object.freeze({ kind: "epoch-fixture-system-host" }),
        portalContainer: Object.freeze({ kind: "epoch-fixture-system-portal" }),
        catalog: createSystemDialogRootCatalogSnapshotInternalV1({
          entries: Object.freeze([
            Object.freeze({
              rootRequest: "settings" as const,
              rendererComponent: Object.freeze({ kind: "settings-renderer" }),
              accessibleName: "Settings",
              requiredPortIds: Object.freeze([]),
              contentConfig: Object.freeze({
                title: "Settings",
                closeLabel: "Close",
                emptyText: "Empty",
                sections: Object.freeze([]),
              }),
            }),
          ]),
          portBindings: Object.freeze([]),
        }),
      });

      expect(composition.overlaySession.openPrimary("overlay.epoch-fixture")).toMatchObject({
        kind: "preparing",
      });
      const overlayRoot = overlayInternal.getRenderSnapshotInternalV1().entries[0]!;
      await expect(
        overlayInternal.beginCandidatePreparationInternalV1(overlayRoot.surfaceInstanceId),
      ).resolves.toEqual({ kind: "ready" });
      expect(systemInternal.openRootInternalV1("settings")).toMatchObject({ kind: "preparing" });
      const systemRoot = systemInternal.getRootCandidateRecordsInternalV1()[0]!;
      const beforeSameOverlay = systemInternal.getManagedSnapshotInternalV1();
      const overlayHostWhileSystemPrepares = overlayInternal.getRenderSnapshotInternalV1()
        .publication;
      expect(
        overlayHostWhileSystemPrepares.orderedInstances.map((instance) =>
          instance.surfaceInstanceId
        ),
      ).toEqual([overlayRoot.surfaceInstanceId]);
      expect(overlayHostWhileSystemPrepares.preparationFallbacks).toEqual([]);
      expect(overlayHostWhileSystemPrepares.inputOwner).toBeNull();
      expect(overlayHostWhileSystemPrepares.focusOwner).toBeNull();
      expect(composition.overlaySession.openPrimary("overlay.epoch-fixture")).toEqual({
        kind: "unchanged",
        code: "overlay.already_open",
      });
      expect(systemInternal.getManagedSnapshotInternalV1()).toBe(beforeSameOverlay);
      expect(
        systemHostAttachment.readyCandidateInternalV1(systemRoot.surfaceInstanceId),
      ).toMatchObject({
        kind: "applied",
        code: "surface.readiness_ready",
      });
      expect(composition.overlaySession.getSnapshot()).toEqual({
        primaryId: "overlay.epoch-fixture",
        detailIds: [],
      });
      expect(overlayInternal.getRenderSnapshotInternalV1().publication).toMatchObject({
        topmostBlockingInstanceId: null,
        inputOwner: null,
        focusOwner: null,
        preparationFallbacks: [],
      });

      composition.overlaySession.closeAll();
      expect(composition.overlaySession.getSnapshot()).toEqual({ primaryId: null, detailIds: [] });
      expect(overlayInternal.getRenderSnapshotInternalV1().publication.orderedInstances).toEqual(
        [],
      );
      expect(
        systemInternal.getManagedSnapshotInternalV1().orderedInstances.filter((instance) =>
          instance.definition.ownerId === systemRoot.resolution.definition.ownerId
        ),
      ).toHaveLength(1);
    } finally {
      composition.dispose();
    }
  });

  it("rotates every anchor successor behind the private facade and fences old readiness", async () => {
    const anchor = createAnchorSourceV1();
    const epochSequence = [11, 17, 23, 31] as const;
    const allocatedEpochs: number[] = [];
    let allocationCursor = 0;
    let predecessorDuringSuccessorAllocation: unknown;
    let overlayInternal!: ReturnType<
      typeof resolveWorkspaceOverlaySessionInternalV1<
        "overlay.epoch-fixture"
      >
    >;
    const epochAllocator = Object.freeze({
      allocate() {
        if (allocationCursor === 1) {
          predecessorDuringSuccessorAllocation = overlayInternal.getManagedSnapshotInternalV1();
        }
        const epoch = parseNonNegativeSafeInteger(epochSequence[allocationCursor]);
        allocationCursor += 1;
        allocatedEpochs.push(epoch);
        return epoch;
      },
    });
    const semanticPublication = Object.freeze({ revision: 0 });
    const composition = createHostedGameUiCompositionInternalV1({
      semantic: Object.freeze({
        observe: () => semanticPublication,
        subscribe: () => () => undefined,
      }),
      anchor: anchor.source,
      projector: Object.freeze({
        resolvedCatalog: Object.freeze({}),
        initialUiState: Object.freeze({}),
        project: (input: { readonly uiState: { readonly anchor: GameUiPresentationAnchorV1 } }) =>
          Object.freeze({
            view: Object.freeze({ anchorEpoch: input.uiState.anchor.epoch }),
            requiredAssetIds: Object.freeze([]),
          }),
      }),
      overlayDefinitions: Object.freeze([overlayDefinitionV1]),
    }, {
      managedSurfaceEpochAllocator: epochAllocator,
      anchorEvents: anchor.events,
      successorProducer: Object.freeze({
        installed: () => undefined,
        failed: () => undefined,
      }),
    });

    try {
      overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
      const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
      const managedSystemInternal = resolveSystemDialogSessionInternalV1(
        managedComposition.systemDialogSession,
      );
      const initialRuntime = managedComposition.runtime.getCurrent();
      const initialPublication = initialRuntime.coordinator.getSnapshot();
      expect(overlayInternal.getManagedSnapshotInternalV1()).toBe(initialPublication);
      expect(managedSystemInternal.getManagedSnapshotInternalV1()).toBe(initialPublication);
      expect(initialRuntime.applicationEpoch).toBe(11);
      expect(Reflect.ownKeys(managedComposition.systemDialogSession)).toEqual([
        "getSnapshot",
        "openSettings",
        "openSaves",
      ]);
      expect(Object.isFrozen(managedComposition.systemDialogSession)).toBe(true);

      let unavailableNotifications = 0;
      const unsubscribeUnavailable = initialRuntime.coordinator.subscribe(() => {
        unavailableNotifications += 1;
      });
      expect(managedSystemInternal.openRootInternalV1("settings")).toEqual({
        kind: "rejected",
        code: "system_dialog.renderer_unavailable",
      });
      expect(initialRuntime.coordinator.getSnapshot()).toBe(initialPublication);
      expect(unavailableNotifications).toBe(0);
      unsubscribeUnavailable();

      managedSystemInternal.attachHostInternalV1({
        hostIdentity: Object.freeze({ kind: "managed-system-test-host" }),
        portalContainer: Object.freeze({ kind: "managed-system-test-portal" }),
        catalog: createSystemDialogRootCatalogSnapshotInternalV1({
          entries: Object.freeze([
            Object.freeze({
              rootRequest: "settings" as const,
              rendererComponent: Object.freeze({ kind: "settings-renderer" }),
              accessibleName: "Settings",
              requiredPortIds: Object.freeze([]),
              contentConfig: Object.freeze({
                title: "Settings",
                closeLabel: "Close",
                emptyText: "Empty",
                sections: Object.freeze([]),
              }),
            }),
          ]),
          portBindings: Object.freeze([]),
        }),
      });
      const preparation = deferredV1();
      overlayInternal.attachRendererResolverInternalV1(Object.freeze({
        resolve: (id: "overlay.epoch-fixture") =>
          Object.freeze({
            accessibleName: id,
            content: id,
            prepare: () => preparation.promise,
          }),
      }));

      expect(composition.overlaySession.getSnapshot).toBeTypeOf("function");
      expect(composition.overlaySession.openPrimary).toBeTypeOf("function");
      expect(
        Reflect.ownKeys(composition.overlaySession).filter((key) =>
          typeof key === "string" && key.includes("Internal")
        ),
      ).toEqual([]);
      expect("getManagedSnapshotInternalV1" in composition.overlaySession).toBe(false);
      expect("rotateEpochInternalV1" in composition.overlaySession).toBe(false);
      expect("disposeInternalV1" in composition.overlaySession).toBe(false);
      expect(Object.isFrozen(composition.overlaySession)).toBe(true);
      expect(overlayInternal.getManagedSnapshotInternalV1().applicationEpoch).toBe(11);

      expect(composition.overlaySession.openPrimary("overlay.epoch-fixture")).toEqual({
        kind: "preparing",
        code: "overlay.preparation_started",
      });
      const predecessorCandidate = overlayInternal.getRenderSnapshotInternalV1().entries[0]!;
      const lateReadiness = overlayInternal.beginCandidatePreparationInternalV1(
        predecessorCandidate.surfaceInstanceId,
      );
      expect(managedSystemInternal.openRootInternalV1("settings")).toEqual({
        kind: "preparing",
        code: "system_dialog.preparation_started",
      });
      const systemPredecessorCandidate = managedSystemInternal
        .getRootCandidateRecordsInternalV1()[0]!;
      expect(managedSystemInternal.getManagedSnapshotInternalV1()).toBe(
        overlayInternal.getManagedSnapshotInternalV1(),
      );

      anchor.publish(Object.freeze({ epoch: 1, origin: "load" }));

      expect(predecessorDuringSuccessorAllocation).toMatchObject({
        applicationEpoch: 11,
        orderedInstances: [],
        preparationFallbacks: [],
        inputOwner: null,
        focusOwner: null,
        coordinatorDisposed: true,
      });
      const afterLoad = overlayInternal.getManagedSnapshotInternalV1();
      expect(managedComposition.runtime.getCurrent().applicationEpoch).toBe(17);
      expect(managedSystemInternal.getManagedSnapshotInternalV1()).toBe(afterLoad);
      expect(managedComposition.runtime.getCurrent().coordinator.getSnapshot()).toBe(afterLoad);
      expect(afterLoad).toMatchObject({
        applicationEpoch: 17,
        publicationRevision: 0,
        topologyRevision: 0,
        orderedInstances: [],
        coordinatorDisposed: false,
      });
      expect(systemPredecessorCandidate.readiness.ready().receipt).toMatchObject({
        kind: "stale",
        code: "surface.stale_readiness",
        surfaceInstanceId: systemPredecessorCandidate.surfaceInstanceId,
      });

      preparation.resolve();
      await expect(lateReadiness).resolves.toEqual({
        kind: "stale",
        code: "overlay.stale_readiness",
      });
      expect(overlayInternal.getManagedSnapshotInternalV1()).toBe(afterLoad);

      expect(composition.overlaySession.openPrimary("overlay.epoch-fixture")).toMatchObject({
        kind: "preparing",
      });
      expect(
        overlayInternal.getManagedSnapshotInternalV1().orderedInstances[0]?.surfaceInstanceId,
      ).toBe("surface-instance.e17.n1");

      anchor.publish(Object.freeze({ epoch: 2, origin: "import" }));
      expect(overlayInternal.getManagedSnapshotInternalV1()).toMatchObject({
        applicationEpoch: 23,
        orderedInstances: [],
        coordinatorDisposed: false,
      });

      anchor.publish(Object.freeze({ epoch: 3, origin: "restart" }));
      expect(overlayInternal.getManagedSnapshotInternalV1()).toMatchObject({
        applicationEpoch: 31,
        orderedInstances: [],
        coordinatorDisposed: false,
      });
      expect(allocatedEpochs).toEqual([11, 17, 23, 31]);
      expect(composition.anchor.getCurrent()).toEqual({ epoch: 3, origin: "restart" });
    } finally {
      composition.dispose();
    }
  });

  it("activates every family before the first successor notification permits re-entry", () => {
    const anchor = createAnchorSourceV1();
    const fixture = createHostedCompositionFixtureV1(anchor);
    const { composition } = fixture;

    try {
      const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
      const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
      const systemInternal = resolveSystemDialogSessionInternalV1(
        managedComposition.systemDialogSession,
      );
      let overlayNotifications = 0;
      let systemNotifications = 0;
      let firstObservation: unknown;
      let systemAnchorDuringNotification: unknown;
      const unsubscribeOverlay = overlayInternal.subscribe(() => {
        overlayNotifications += 1;
        if (overlayNotifications !== 1) return;
        const overlayPublication = overlayInternal.getManagedSnapshotInternalV1();
        const systemPublication = systemInternal.getManagedSnapshotInternalV1();
        const runtimePublication = managedComposition.runtime.getCurrent().coordinator
          .getSnapshot();
        const overlayIngress = composition.overlaySession.openPrimary("overlay.epoch-fixture");
        const systemIngress = systemInternal.openRootInternalV1("settings");
        firstObservation = Object.freeze({
          overlayPublication,
          systemPublication,
          runtimePublication,
          overlayIngress,
          systemIngress,
          afterReentryPublication: managedComposition.runtime.getCurrent().coordinator
            .getSnapshot(),
          presentationAnchor: composition.anchor.getCurrent(),
        });
      });
      const unsubscribeSystem = systemInternal.subscribeInternalV1(() => {
        systemNotifications += 1;
        if (systemNotifications === 1) {
          systemAnchorDuringNotification = composition.anchor.getCurrent();
        }
      });

      anchor.publish(Object.freeze({ epoch: 1, origin: "load" }));

      expect(firstObservation).toMatchObject({
        overlayPublication: { applicationEpoch: 17 },
        systemPublication: { applicationEpoch: 17 },
        runtimePublication: {
          applicationEpoch: 17,
          publicationRevision: 0,
          topologyRevision: 0,
          orderedInstances: [],
        },
        afterReentryPublication: {
          applicationEpoch: 17,
          publicationRevision: 0,
          topologyRevision: 0,
          orderedInstances: [],
        },
        overlayIngress: { kind: "rejected", code: "overlay.renderer_unavailable" },
        systemIngress: { kind: "rejected", code: "system_dialog.renderer_unavailable" },
        presentationAnchor: { epoch: 0, origin: "bootstrap" },
      });
      const observation = firstObservation as {
        readonly overlayPublication: unknown;
        readonly systemPublication: unknown;
        readonly runtimePublication: unknown;
        readonly afterReentryPublication: unknown;
      };
      expect(observation.overlayPublication).toBe(observation.systemPublication);
      expect(observation.overlayPublication).toBe(observation.runtimePublication);
      expect(observation.runtimePublication).toBe(observation.afterReentryPublication);
      expect(overlayNotifications).toBe(1);
      expect(systemNotifications).toBe(1);
      expect(systemAnchorDuringNotification).toEqual({ epoch: 0, origin: "bootstrap" });
      expect(fixture.allocatedEpochs).toEqual([11, 17]);
      expect(composition.anchor.getCurrent()).toEqual({ epoch: 1, origin: "load" });
      unsubscribeOverlay();
      unsubscribeSystem();
      overlayInternal.attachRendererResolverInternalV1(Object.freeze({
        resolve: (id: "overlay.epoch-fixture") =>
          Object.freeze({ accessibleName: id, content: id }),
      }));
      expect(composition.overlaySession.openPrimary("overlay.epoch-fixture")).toMatchObject({
        kind: "preparing",
      });
      expect(overlayInternal.getRenderSnapshotInternalV1().entries[0]?.surfaceInstanceId).toBe(
        "surface-instance.e17.n1",
      );
    } finally {
      composition.dispose();
    }
  });

  it("serializes a successor requested from a family activation notification", () => {
    const anchor = createAnchorSourceV1();
    const fixture = createHostedCompositionFixtureV1(anchor, [11, 17, 23]);
    const { composition } = fixture;

    try {
      const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
      const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
      const systemInternal = resolveSystemDialogSessionInternalV1(
        managedComposition.systemDialogSession,
      );
      let overlayNotifications = 0;
      let systemNotifications = 0;
      const overlayAnchors: GameUiPresentationAnchorV1[] = [];
      const systemAnchors: GameUiPresentationAnchorV1[] = [];
      const publishedAnchors: GameUiPresentationAnchorV1[] = [];
      const unsubscribeOverlay = overlayInternal.subscribe(() => {
        overlayNotifications += 1;
        overlayAnchors.push(composition.anchor.getCurrent());
        if (overlayNotifications === 1) {
          anchor.publish(Object.freeze({ epoch: 2, origin: "import" }));
        }
      });
      const unsubscribeSystem = systemInternal.subscribeInternalV1(() => {
        systemNotifications += 1;
        systemAnchors.push(composition.anchor.getCurrent());
      });
      const unsubscribeAnchor = composition.anchor.subscribe(() => {
        publishedAnchors.push(composition.anchor.getCurrent());
      });

      anchor.publish(Object.freeze({ epoch: 1, origin: "load" }));

      expect(fixture.allocatedEpochs).toEqual([11, 17, 23]);
      expect({ overlayNotifications, systemNotifications }).toEqual({
        overlayNotifications: 2,
        systemNotifications: 2,
      });
      expect(overlayAnchors).toEqual([
        { epoch: 0, origin: "bootstrap" },
        { epoch: 1, origin: "load" },
      ]);
      expect(systemAnchors).toEqual(overlayAnchors);
      expect(publishedAnchors).toEqual([
        { epoch: 1, origin: "load" },
        { epoch: 2, origin: "import" },
      ]);
      expect(managedComposition.runtime.getCurrent()).toMatchObject({
        applicationEpoch: 23,
      });
      expect(composition.anchor.getCurrent()).toEqual({ epoch: 2, origin: "import" });
      unsubscribeOverlay();
      unsubscribeSystem();
      unsubscribeAnchor();
    } finally {
      composition.dispose();
    }
  });

  it("does not publish and fails closed after activation re-entry disposes the composition", () => {
    const anchor = createAnchorSourceV1();
    const fixture = createHostedCompositionFixtureV1(anchor, [11, 17, 23]);
    const { composition } = fixture;
    const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
    const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const systemInternal = resolveSystemDialogSessionInternalV1(
      managedComposition.systemDialogSession,
    );
    let overlayNotifications = 0;
    let systemNotifications = 0;
    overlayInternal.subscribe(() => {
      overlayNotifications += 1;
      if (overlayNotifications !== 1) return;
      anchor.publish(Object.freeze({ epoch: 2, origin: "import" }));
      composition.dispose();
    });
    systemInternal.subscribeInternalV1(() => {
      systemNotifications += 1;
    });

    expect(() => anchor.publish(Object.freeze({ epoch: 1, origin: "load" }))).toThrowError(
      "ui.presentation_successor_activation_failed",
    );

    expect(composition.isDisposed()).toBe(true);
    expect(managedComposition.isTerminalInternalV1()).toBe(true);
    expect(composition.anchor.getCurrent()).toEqual({ epoch: 0, origin: "bootstrap" });
    expect(fixture.allocatedEpochs).toEqual([11, 17]);
    expect({ overlayNotifications, systemNotifications }).toEqual({
      overlayNotifications: 2,
      systemNotifications: 0,
    });
    expect(() => managedComposition.runtime.getCurrent()).toThrowError(
      "ui.managed_surface_composition_runtime_disposed",
    );
  });

  it("seals a successor without notifying any family when the second attachment fails", async () => {
    const anchor = createAnchorSourceV1();
    const fixture = createHostedCompositionFixtureV1(anchor);
    const { composition } = fixture;
    const preparation = deferredV1();

    try {
      const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
      const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
      const systemInternal = resolveSystemDialogSessionInternalV1(
        managedComposition.systemDialogSession,
      );
      overlayInternal.attachRendererResolverInternalV1(Object.freeze({
        resolve: (id: "overlay.epoch-fixture") =>
          Object.freeze({
            accessibleName: id,
            content: id,
            prepare: () => preparation.promise,
          }),
      }));
      expect(composition.overlaySession.openPrimary("overlay.epoch-fixture")).toMatchObject({
        kind: "preparing",
      });
      const predecessorCandidate = overlayInternal.getRenderSnapshotInternalV1().entries[0]!;
      const lateReadiness = overlayInternal.beginCandidatePreparationInternalV1(
        predecessorCandidate.surfaceInstanceId,
      );
      let overlayNotifications = 0;
      const unsubscribeOverlay = overlayInternal.subscribe(() => {
        overlayNotifications += 1;
      });
      systemInternal.disposeInternalV1();

      expect(() => anchor.publish(Object.freeze({ epoch: 1, origin: "load" }))).toThrowError(
        "ui.system_dialog_session_disposed",
      );

      expect(overlayNotifications).toBe(0);
      expect(composition.overlaySession.openPrimary("overlay.epoch-fixture")).toEqual({
        kind: "rejected",
        code: "overlay.disposed",
      });
      expect(() => managedComposition.runtime.getCurrent()).toThrowError(
        "ui.managed_surface_composition_runtime_disposed",
      );
      expect(composition.anchor.getCurrent()).toEqual({ epoch: 0, origin: "bootstrap" });
      expect(fixture.allocatedEpochs).toEqual([11, 17]);

      preparation.resolve();
      await expect(lateReadiness).resolves.toEqual({
        kind: "stale",
        code: "overlay.stale_readiness",
      });
      unsubscribeOverlay();
    } finally {
      composition.dispose();
    }
  });

  it("retains one input binding while both family observers process a replacement", async () => {
    const replacementDefinition = defineWorkspaceOverlayV1({
      id: "overlay.epoch-replacement" as const,
      contractRevision: 1,
    });
    let registrations = 0;
    let unregistrations = 0;
    let activeRegistrations = 0;
    let maximumActiveRegistrations = 0;
    const semanticPublication = Object.freeze({ revision: 0 });
    const composition = createGameUiCompositionWithEpochAllocatorInternalV1(
      {
        semantic: Object.freeze({
          observe: () => semanticPublication,
          subscribe: () => () => undefined,
        }),
        projector: Object.freeze({
          resolvedCatalog: Object.freeze({}),
          initialUiState: Object.freeze({}),
          project: () =>
            Object.freeze({
              view: Object.freeze({}),
              requiredAssetIds: Object.freeze([]),
            }),
        }),
        overlayDefinitions: Object.freeze([overlayDefinitionV1, replacementDefinition]),
      },
      Object.freeze({
        allocate: () => parseNonNegativeSafeInteger(11),
      }),
      undefined,
      () => {
        registrations += 1;
        activeRegistrations += 1;
        maximumActiveRegistrations = Math.max(
          maximumActiveRegistrations,
          activeRegistrations,
        );
        let registered = true;
        return () => {
          if (!registered) return;
          registered = false;
          unregistrations += 1;
          activeRegistrations -= 1;
        };
      },
    );

    try {
      const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
      const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
      const systemInternal = resolveSystemDialogSessionInternalV1(
        managedComposition.systemDialogSession,
      );
      overlayInternal.attachRendererResolverInternalV1(Object.freeze({
        resolve: (
          id: "overlay.epoch-fixture" | "overlay.epoch-replacement",
        ) => Object.freeze({ accessibleName: id, content: id }),
      }));

      expect(composition.overlaySession.openPrimary("overlay.epoch-fixture")).toMatchObject({
        kind: "preparing",
      });
      const initialCandidate = overlayInternal.getRenderSnapshotInternalV1().entries.find(
        (entry) => entry.phase === "preparing",
      )!;
      await expect(
        overlayInternal.beginCandidatePreparationInternalV1(initialCandidate.surfaceInstanceId),
      ).resolves.toEqual({ kind: "ready" });

      const runtime = managedComposition.runtime.getCurrent();
      const retainedBinding = runtime.bindCurrentInput();
      const retainedGesture = runtime.gestureLease.begin();
      const retainedEnvelope = retainedBinding.createEnvelope({
        actionId: parseManagedSurfaceActionIdV1("surface-action.cancel"),
        gestureId: retainedGesture,
      });
      let overlayNotifications = 0;
      let systemNotifications = 0;
      const unsubscribeOverlay = overlayInternal.subscribe(() => {
        overlayNotifications += 1;
      });
      const unsubscribeSystem = systemInternal.subscribeInternalV1(() => {
        systemNotifications += 1;
      });

      expect(composition.overlaySession.openPrimary("overlay.epoch-replacement")).toMatchObject({
        kind: "preparing",
      });
      const firstReplacement = overlayInternal.getRenderSnapshotInternalV1().entries.find(
        (entry) => entry.overlayId === "overlay.epoch-replacement",
      )!;
      expect(runtime.bindCurrentInput()).toBe(retainedBinding);
      expect(
        runtime.bindCurrentInput().createEnvelope({
          actionId: parseManagedSurfaceActionIdV1("surface-action.cancel"),
          gestureId: retainedGesture,
        }).inputPublicationRevision,
      ).toBe(retainedEnvelope.inputPublicationRevision);
      expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(true);
      expect({
        registrations,
        unregistrations,
        activeRegistrations,
        maximumActiveRegistrations,
        overlayNotifications,
        systemNotifications,
      }).toEqual({
        registrations: 1,
        unregistrations: 0,
        activeRegistrations: 1,
        maximumActiveRegistrations: 1,
        overlayNotifications: 1,
        systemNotifications: 1,
      });

      expect(overlayInternal.failCandidatePreparationInternalV1(
        firstReplacement.surfaceInstanceId,
        new Error("fixture.replacement_failed"),
      )).toEqual({ kind: "failed" });
      expect(runtime.bindCurrentInput()).toBe(retainedBinding);
      expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(true);
      expect({ registrations, unregistrations, overlayNotifications, systemNotifications }).toEqual(
        {
          registrations: 1,
          unregistrations: 0,
          overlayNotifications: 2,
          systemNotifications: 2,
        },
      );

      expect(composition.overlaySession.openPrimary("overlay.epoch-replacement")).toMatchObject({
        kind: "preparing",
      });
      const secondReplacement = overlayInternal.getRenderSnapshotInternalV1().entries.find(
        (entry) => entry.overlayId === "overlay.epoch-replacement",
      )!;
      await expect(
        overlayInternal.beginCandidatePreparationInternalV1(secondReplacement.surfaceInstanceId),
      ).resolves.toEqual({ kind: "ready" });
      const activeBinding = runtime.bindCurrentInput();
      const activeGesture = runtime.gestureLease.begin();
      const activeEnvelope = activeBinding.createEnvelope({
        actionId: parseManagedSurfaceActionIdV1("surface-action.cancel"),
        gestureId: activeGesture,
      });
      expect(activeBinding).not.toBe(retainedBinding);
      expect(activeEnvelope.inputPublicationRevision).toBe(
        retainedEnvelope.inputPublicationRevision + 2,
      );
      expect(runtime.gestureLease.isCurrent(retainedGesture)).toBe(false);
      expect({
        registrations,
        unregistrations,
        activeRegistrations,
        maximumActiveRegistrations,
        overlayNotifications,
        systemNotifications,
      }).toEqual({
        registrations: 2,
        unregistrations: 1,
        activeRegistrations: 1,
        maximumActiveRegistrations: 1,
        overlayNotifications: 4,
        systemNotifications: 4,
      });
      unsubscribeOverlay();
      unsubscribeSystem();
    } finally {
      composition.dispose();
    }
    expect({ registrations, unregistrations, activeRegistrations }).toEqual({
      registrations: 2,
      unregistrations: 2,
      activeRegistrations: 0,
    });
  });
});

describe("hosted presentation successor acknowledgment", () => {
  it("drains reentrant exact token events FIFO without consulting the latest anchor", () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    const fixture = createExactHostedCompositionFixtureV1(anchorEvents, producer);
    const { composition } = fixture;
    const tokenA = Object.freeze({ operation: "A" });
    const tokenB = Object.freeze({ operation: "B" });
    const anchorA = Object.freeze({ epoch: 1, origin: "restart" });
    const anchorB = Object.freeze({ epoch: 2, origin: "import" });

    try {
      const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
      const observedAnchors: GameUiPresentationAnchorV1[] = [];
      const unsubscribeOverlay = overlayInternal.subscribe(() => {
        observedAnchors.push(composition.anchor.getCurrent());
        if (observedAnchors.length === 1) {
          anchorEvents.publish(Object.freeze({ anchor: anchorB, token: tokenB }));
        }
      });

      anchorEvents.publish(Object.freeze({ anchor: anchorA, token: tokenA }));

      expect(fixture.allocatedEpochs).toEqual([11, 17, 23]);
      expect(observedAnchors).toEqual([
        { epoch: 0, origin: "bootstrap" },
        { epoch: 1, origin: "restart" },
      ]);
      expect(producer.failed).toEqual([]);
      expect(producer.installed).toEqual([
        { anchor: anchorA, token: tokenA, managedSurfaceApplicationEpoch: 17 },
        { anchor: anchorB, token: tokenB, managedSurfaceApplicationEpoch: 23 },
      ]);
      expect(composition.anchor.getCurrent()).toBe(anchorB);
      unsubscribeOverlay();
    } finally {
      composition.dispose();
    }
  });

  it("installs an unarmed load/import event without retaining acknowledgment history", () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    const fixture = createExactHostedCompositionFixtureV1(anchorEvents, producer);
    const { composition } = fixture;

    try {
      const anchor = Object.freeze({ epoch: 1, origin: "load" });
      anchorEvents.publish(Object.freeze({ anchor, token: null }));

      expect(composition.anchor.getCurrent()).toBe(anchor);
      expect(producer.installed).toEqual([]);
      expect(producer.failed).toEqual([]);
    } finally {
      composition.dispose();
    }
  });

  it("isolates ordinary family subscriber failures without upgrading a successor", () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    const fixture = createExactHostedCompositionFixtureV1(anchorEvents, producer);
    const { composition } = fixture;
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const overlay = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
    const system = resolveSystemDialogSessionInternalV1(managed.systemDialogSession);
    const token = Object.freeze({ operation: "subscriber-isolation" });
    const anchor = Object.freeze({ epoch: 1, origin: "restart" });
    overlay.subscribe(() => {
      throw new Error("fixture.overlay_subscriber_failed");
    });
    system.subscribeInternalV1(() => {
      throw new Error("fixture.system_subscriber_failed");
    });

    expect(() => anchorEvents.publish(Object.freeze({ anchor, token }))).not.toThrow();

    expect(managed.isTerminalInternalV1()).toBe(false);
    expect(producer.failed).toEqual([]);
    expect(producer.installed).toEqual([
      { anchor, token, managedSurfaceApplicationEpoch: 17 },
    ]);
    composition.dispose();
  });

  it("terminal-seals every held presentation ingress before reporting a publish failure", () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    let terminalObservedByProducer = false;
    let readTerminal = (): boolean => false;
    const producer = createSuccessorProducerFixtureV1(() => {
      terminalObservedByProducer = readTerminal();
    });
    const fixture = createExactHostedCompositionFixtureV1(anchorEvents, producer);
    const { composition } = fixture;
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    readTerminal = managed.isTerminalInternalV1;
    const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
    const managedSystem = resolveSystemDialogSessionInternalV1(managed.systemDialogSession);
    const token = Object.freeze({ operation: "terminal" });
    const anchor = Object.freeze({ epoch: 1, origin: "restart" });
    const failure = new Error("fixture.anchor_listener_failed");
    let lowerInputWrites = 0;
    let cueWrites = 0;
    const unregister = composition.input.register({
      context: "gameplay",
      handle: () => {
        lowerInputWrites += 1;
        return Object.freeze({ kind: "handled" as const });
      },
    });
    composition.cues.register(Object.freeze({
      play: () => {
        cueWrites += 1;
        return true;
      },
    }));
    const systemHostAttachment = managedSystem.attachHostInternalV1({
      hostIdentity: Object.freeze({ kind: "terminal-system-host" }),
      portalContainer: Object.freeze({ kind: "terminal-system-portal" }),
      catalog: createSystemDialogRootCatalogSnapshotInternalV1({
        entries: Object.freeze([
          Object.freeze({
            rootRequest: "settings" as const,
            rendererComponent: Object.freeze({ kind: "settings-renderer" }),
            accessibleName: "Settings",
            requiredPortIds: Object.freeze([]),
            contentConfig: Object.freeze({
              title: "Settings",
              closeLabel: "Close",
              emptyText: "Empty",
              sections: Object.freeze([]),
            }),
          }),
        ]),
        portBindings: Object.freeze([]),
      }),
    });
    expect(composition.systemDialogSession.openSettings()).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    const systemCandidate = managedSystem.getRootCandidateRecordsInternalV1()[0]!;
    expect(systemHostAttachment.readyCandidateInternalV1(systemCandidate.surfaceInstanceId))
      .toMatchObject({ kind: "applied", code: "surface.readiness_ready" });
    expect(composition.systemDialogSession.getSnapshot()).toEqual({ active: "settings" });
    let interactionNotifications = 0;
    const unsubscribeInteraction = composition.interactionSession.subscribe(() => {
      interactionNotifications += 1;
    });
    let overlayNotifications = 0;
    let managedSystemNotifications = 0;
    const unsubscribeOverlay = overlayInternal.subscribe(() => {
      overlayNotifications += 1;
    });
    const unsubscribeManagedSystem = managedSystem.subscribeInternalV1(() => {
      managedSystemNotifications += 1;
    });
    let presentationNotifications = 0;
    const unsubscribePresentation = composition.presentation.subscribe(() => {
      presentationNotifications += 1;
    });
    const unsubscribeThrow = composition.anchor.subscribe(() => {
      throw failure;
    });

    expect(() => anchorEvents.publish(Object.freeze({ anchor, token }))).toThrow(failure);
    presentationNotifications = 0;

    expect(managed.isTerminalInternalV1()).toBe(true);
    expect(terminalObservedByProducer).toBe(true);
    expect(producer.installed).toEqual([]);
    expect(producer.failed).toEqual([{ anchor, token, error: failure }]);
    expect(composition.systemDialogSession.getSnapshot()).toEqual({ active: null });
    const beforeInteraction = composition.interactionSession.getSnapshot();
    const beforePresentation = composition.presentation.getSnapshot();
    const beforeAnchor = composition.anchor.getCurrent();
    fixture.publishSemantic();
    anchorEvents.publish(Object.freeze({
      anchor: Object.freeze({ epoch: 2, origin: "late" }),
      token: Object.freeze({ operation: "late" }),
    }));
    composition.updateUiState((current) => Object.freeze({ count: current.count + 1 }));
    expect(composition.systemDialogSession.openSaves()).toEqual({
      kind: "rejected",
      code: "system_dialog.disposed",
    });
    expect(composition.systemDialogSession.openSettings()).toEqual({
      kind: "rejected",
      code: "system_dialog.disposed",
    });
    composition.interactionSession.open(
      parseInteractionSurfaceId("surface.e2e.fixture"),
      "control.e2e.fixture",
    );
    composition.interactionSession.leave();
    composition.cues.register(Object.freeze({ play: () => true }));
    expect(composition.cues.play("cue.e2e.fixture")).toBe(false);
    expect(composition.intents.execute({
      kind: "interaction.enter_surface",
      surfaceId: parseInteractionSurfaceId("surface.e2e.fixture"),
    })).toEqual({ kind: "rejected", code: "presentation.intent_unknown" });
    expect(composition.input.route({
      kind: "action",
      actionId: parseManagedSurfaceActionIdV1("ui.confirm") as never,
    })).toEqual({ kind: "ignored" });
    expect(composition.overlaySession.openPrimary("overlay.epoch-fixture")).toEqual({
      kind: "rejected",
      code: "overlay.disposed",
    });
    expect(composition.interactionSession.getSnapshot()).toBe(beforeInteraction);
    expect(composition.presentation.getSnapshot()).toBe(beforePresentation);
    expect(composition.anchor.getCurrent()).toBe(beforeAnchor);
    expect(fixture.semanticUnsubscriptions()).toBe(1);
    expect(presentationNotifications).toBe(0);
    expect(producer.installed).toEqual([]);
    expect(producer.failed).toEqual([{ anchor, token, error: failure }]);
    expect({ lowerInputWrites, cueWrites }).toEqual({ lowerInputWrites: 0, cueWrites: 0 });
    expect(interactionNotifications).toBe(0);
    expect({ overlayNotifications, managedSystemNotifications }).toEqual({
      overlayNotifications: 1,
      managedSystemNotifications: 1,
    });
    expect(() => {
      managed.sealTerminalInternalV1();
      managed.sealTerminalInternalV1();
    }).not.toThrow();
    expect({ overlayNotifications, managedSystemNotifications }).toEqual({
      overlayNotifications: 1,
      managedSystemNotifications: 1,
    });

    unsubscribeThrow();
    unsubscribeInteraction();
    unsubscribeOverlay();
    unsubscribeManagedSystem();
    unsubscribePresentation();
    unregister();
    composition.dispose();
    expect(fixture.semanticUnsubscriptions()).toBe(1);
  });

  it("terminal-seals a second-family attachment failure in the producer stack", () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    const fixture = createExactHostedCompositionFixtureV1(anchorEvents, producer);
    const { composition } = fixture;
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const system = resolveSystemDialogSessionInternalV1(managed.systemDialogSession);
    const token = Object.freeze({ operation: "second-family" });
    const anchor = Object.freeze({ epoch: 1, origin: "load" });
    system.disposeInternalV1();

    expect(() => anchorEvents.publish(Object.freeze({ anchor, token }))).toThrowError(
      "ui.system_dialog_session_disposed",
    );

    expect(managed.isTerminalInternalV1()).toBe(true);
    expect(producer.installed).toEqual([]);
    expect(producer.failed).toHaveLength(1);
    expect(producer.failed[0]).toMatchObject({ anchor, token });
    expect(producer.failed[0]?.error).toBeInstanceOf(Error);
    expect(() => managed.runtime.getCurrent()).toThrowError(
      "ui.managed_surface_composition_runtime_disposed",
    );
    composition.dispose();
  });

  it("reports the exact token when a UI anchor listener disposes after publication", () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    const fixture = createExactHostedCompositionFixtureV1(anchorEvents, producer);
    const { composition } = fixture;
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const token = Object.freeze({ operation: "post-publish-dispose" });
    const anchor = Object.freeze({ epoch: 1, origin: "restart" });
    composition.anchor.subscribe(() => composition.dispose());

    expect(() => anchorEvents.publish(Object.freeze({ anchor, token }))).toThrowError(
      "ui.managed_surface_composition_runtime_disposed",
    );

    expect(composition.isDisposed()).toBe(true);
    expect(managed.isTerminalInternalV1()).toBe(true);
    expect(producer.installed).toEqual([]);
    expect(producer.failed).toHaveLength(1);
    expect(producer.failed[0]).toMatchObject({ anchor, token });
  });

  it("fails after publication when a family attachment is no longer current", () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    const fixture = createExactHostedCompositionFixtureV1(anchorEvents, producer);
    const { composition } = fixture;
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const overlay = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
    const token = Object.freeze({ operation: "post-liveness" });
    const anchor = Object.freeze({ epoch: 1, origin: "import" });
    const unsubscribe = overlay.subscribe(() => overlay.detachRuntimeInternalV1());

    expect(() => anchorEvents.publish(Object.freeze({ anchor, token }))).toThrowError(
      "ui.presentation_successor_activation_failed",
    );

    expect(managed.isTerminalInternalV1()).toBe(true);
    expect(producer.installed).toEqual([]);
    expect(producer.failed).toHaveLength(1);
    expect(producer.failed[0]).toMatchObject({ anchor, token });
    unsubscribe();
    composition.dispose();
  });
});
