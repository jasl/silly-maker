// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
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
  const source: GameUiAnchorSourceV1 = Object.freeze({
    current: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
  return Object.freeze({
    source,
    publish(next: GameUiPresentationAnchorV1): void {
      current = Object.freeze({ ...next });
      for (const listener of [...listeners]) listener();
    },
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
  });
  return Object.freeze({ composition, allocatedEpochs });
}

describe("createHostedGameUiCompositionInternalV1 Managed Surface lifetime", () => {
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
      expect(Reflect.ownKeys(managedComposition.systemDialogSession)).toEqual([]);
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

  it("does not publish an anchor after activation re-entry disposes the composition", () => {
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

    expect(() => anchor.publish(Object.freeze({ epoch: 1, origin: "load" }))).not.toThrow();

    expect(composition.isDisposed()).toBe(true);
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
