// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

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
      systemInternal.setCatalogInternalV1(
        createSystemDialogRootCatalogSnapshotInternalV1({
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
      );

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
      expect(systemInternal.readyCandidateInternalV1(systemRoot.surfaceInstanceId)).toMatchObject({
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

      managedSystemInternal.setCatalogInternalV1(
        createSystemDialogRootCatalogSnapshotInternalV1({
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
      );
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
});
