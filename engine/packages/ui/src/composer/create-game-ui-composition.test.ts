// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  defineWorkspaceOverlayV1,
  resolveWorkspaceOverlaySessionInternalV1,
} from "../overlays/workspace-overlay-session.ts";
import {
  createGameUiCompositionV1,
  createHostedGameUiCompositionInternalV1,
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
      expect(afterLoad).toMatchObject({
        applicationEpoch: 17,
        publicationRevision: 0,
        topologyRevision: 0,
        orderedInstances: [],
        coordinatorDisposed: false,
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
