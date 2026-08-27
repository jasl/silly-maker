// SPDX-License-Identifier: MIT
import {
  createSemanticStageStateV1,
  emptyNarrativeHistoryV1,
  parseInteractionSurfaceId,
  parseNonNegativeSafeInteger,
  parsePendingInteractionV1,
  parseStageTransitionDefinitionV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  type AssetId,
  type DeepReadonly,
  type PendingInteractionV1,
  type StageContentCatalogV1,
  type StageRenderTargetV1,
} from "@sillymaker/base";
import { defaultPlayerProfileV1 } from "@sillymaker/base/runtime";
import { describe, expect, it, vi } from "vitest";

import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceOwnerIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { inputHandledV1, inputIgnoredV1, parseInputActionIdV1 } from "../input/contracts.ts";
import {
  registerManagedInputHandlerV1,
  type ManagedInputHandlerRegistrationV1,
} from "../input/input-router.ts";
import {
  defineWorkspaceOverlayV1,
  resolveWorkspaceOverlaySessionInternalV1,
} from "../overlays/workspace-overlay-session.ts";
import {
  createSystemDialogRootCatalogSnapshotInternalV1,
  resolveSystemDialogSessionInternalV1,
} from "../system/system-dialog-managed-session.ts";
import { createSemanticStageCompositionDriverInternalV1 } from "../stage/semantic-stage.tsx";
import { createStageReconcilerV1 } from "../stage/stage-reconciler.ts";
import {
  createNarrativeSurfaceCompositionDefinitionInternalV1,
  type NarrativeSurfaceCompositionDefinitionInternalV1,
  type NarrativeSurfaceSelectionInternalV1,
} from "../narrative/narrative-surface-composition.tsx";
import { createManualPresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import * as runtimePresentationStoreModuleV1 from "../runtime/runtime-presentation-store.ts";
import {
  defineWholeCanvasSurfaceV1,
  resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1,
  type WholeCanvasSurfaceDefinitionV1,
} from "../whole-canvas/whole-canvas-surface-composition.tsx";
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
  return ({ promise, resolve });
}

function createAnchorSourceV1() {
  let current: GameUiPresentationAnchorV1 = { epoch: 0, origin: "bootstrap" };
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(event: GameUiPresentationAnchorEventInternalV1) => void>();
  const source: GameUiAnchorSourceV1 = {
    current: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return ({
    source,
    events: {
      current: () => current,
      subscribe(listener: (event: GameUiPresentationAnchorEventInternalV1) => void) {
        eventListeners.add(listener);
        return () => eventListeners.delete(listener);
      },
    },
    publish(next: GameUiPresentationAnchorV1): void {
      current = { ...next };
      for (const listener of [...eventListeners]) {
        listener({ anchor: current, token: null });
      }
      for (const listener of [...listeners]) listener();
    },
  });
}

function createExactAnchorEventSourceV1() {
  let current: GameUiPresentationAnchorV1 = { epoch: 0, origin: "bootstrap" };
  const listeners = new Set<
    (event: GameUiPresentationAnchorEventInternalV1) => void
  >();
  const source: GameUiPresentationAnchorEventSourceInternalV1 = {
    current: () => current,
    subscribe(listener: Parameters<GameUiPresentationAnchorEventSourceInternalV1["subscribe"]>[0]) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return ({
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
  const producer: GameUiPresentationSuccessorProducerInternalV1 = {
    installed(outcome: Parameters<GameUiPresentationSuccessorProducerInternalV1["installed"]>[0]) {
      installed.push(outcome);
    },
    failed(outcome: Parameters<GameUiPresentationSuccessorProducerInternalV1["failed"]>[0]) {
      failed.push(outcome);
      onFailed?.(outcome);
    },
  };
  return ({ producer, installed, failed });
}

const hostedWholeCanvasLabelsV1 = {
  newGame: "New game",
  newGameFailed: "New game failed",
  continue: "Continue",
  load: "Load",
  settings: "Settings",
};

function createHostedWholeCanvasDefinitionV1(): WholeCanvasSurfaceDefinitionV1<
  Readonly<{ readonly revision: number }>
> {
  const target = {
    targetId: "test.composer.whole-canvas",
    parameters: {},
  };
  return defineWholeCanvasSurfaceV1({
    catalog: [{
      targetId: target.targetId,
      contractRevision: 1 as const,
      placements: ["primary" as const],
      actionIds: [],
      defaultActionId: null,
    }],
    source: {
      kind: "publication" as const,
      selectPrimary: () => ({ primary: target }),
    },
    resolveTarget: () => ({
      accessibleNameTextId: "text.test.composer.whole-canvas",
      view: {},
      actions: [],
    }),
    dispatchAction: null,
    renderer: () => null,
    prepareTarget: null,
    resolveText: (_locale: string | null, textId: string) => textId,
  });
}

function createHostedWholeCanvasPlayerProfileV1(
  subscribe: (listener: () => void) => unknown = () => (() => undefined),
) {
  return ({
    current: () => defaultPlayerProfileV1,
    subscribe,
    markSeen: async (_definitionId: string, _seenRevision: number) => undefined,
    markMeta: async (_entryId: string, _value?: number) => undefined,
    updatePreferences: async (
      _update: Partial<typeof defaultPlayerProfileV1.preferences>,
    ) => undefined,
  });
}

function createHostedWholeCanvasAggregateV1(input: Readonly<{
  readonly definition?:
    | WholeCanvasSurfaceDefinitionV1<
      Readonly<{ readonly revision: number }>
    >
    | null;
  readonly titleScreen?: unknown;
  readonly playerProfile?: ReturnType<typeof createHostedWholeCanvasPlayerProfileV1>;
  readonly restart?: unknown;
}> = {}) {
  return ({
    narrative: null,
    wholeCanvas: {
      definition: input.definition ?? null,
      titleScreen: input.titleScreen ?? null,
      lifecycle: {
        restart: input.restart ?? (async () => ({
          kind: "anchored" as const,
          commandSequence: parseNonNegativeSafeInteger(0),
        })),
        flushAutoSave: async () => undefined,
      },
      savePort: null,
      customSavesConfigured: false,
      labels: hostedWholeCanvasLabelsV1,
    },
    environment: {
      playerProfile: input.playerProfile ?? createHostedWholeCanvasPlayerProfileV1(),
      presentationClock: createManualPresentationClockV1(),
      prefersReducedMotion: () => false,
    },
  });
}

interface HostedWholeCanvasCompositionCountsV1 {
  allocations: number;
  semanticSubscriptions: number;
  semanticUnsubscriptions: number;
}

function createHostedWholeCanvasCompositionForTestV1(
  hostedSurfaces: unknown,
  counts: HostedWholeCanvasCompositionCountsV1 = {
    allocations: 0,
    semanticSubscriptions: 0,
    semanticUnsubscriptions: 0,
  },
) {
  const anchorEvents = createExactAnchorEventSourceV1();
  const producer = createSuccessorProducerFixtureV1();
  return createHostedGameUiCompositionInternalV1(
    {
      semantic: {
        observe: () => ({ revision: 0 }),
        subscribe: () => {
          counts.semanticSubscriptions += 1;
          let active = true;
          return () => {
            if (!active) return;
            active = false;
            counts.semanticUnsubscriptions += 1;
          };
        },
      },
      projector: {
        resolvedCatalog: {},
        initialUiState: {},
        project: () => ({
          view: {},
          requiredAssetIds: [],
        }),
      },
    },
    {
      managedSurfaceEpochAllocator: {
        allocate: () => parseNonNegativeSafeInteger(++counts.allocations),
      },
      anchorEvents: anchorEvents.source,
      successorProducer: producer.producer,
    },
    hostedSurfaces as never,
  );
}

function installPresentationSubscriptionProbeV1() {
  const actualCreateRuntimePresentationStoreV1 =
    runtimePresentationStoreModuleV1.createRuntimePresentationStoreV1;
  let subscriptions = 0;
  let unsubscriptions = 0;
  const createSpy = vi.spyOn(
    runtimePresentationStoreModuleV1,
    "createRuntimePresentationStoreV1",
  ).mockImplementation(
    ((input: unknown) => {
      const store = Reflect.apply(actualCreateRuntimePresentationStoreV1, undefined, [
        input,
      ]) as ReturnType<typeof actualCreateRuntimePresentationStoreV1>;
      return ({
        getSnapshot: store.getSnapshot,
        subscribe(listener: () => void): () => void {
          subscriptions += 1;
          const release = store.subscribe(listener);
          let active = true;
          return (() => {
            if (!active) return;
            active = false;
            unsubscriptions += 1;
            release();
          });
        },
        dispose: store.dispose,
      });
    }) as typeof actualCreateRuntimePresentationStoreV1,
  );
  return ({
    counts: () => ({ subscriptions, unsubscriptions }),
    restore: () => createSpy.mockRestore(),
  });
}

function createExactHostedCompositionFixtureV1(
  anchorEvents: ReturnType<typeof createExactAnchorEventSourceV1>,
  producerFixture: ReturnType<typeof createSuccessorProducerFixtureV1>,
  epochSequence: readonly number[] = [11, 17, 23],
) {
  let allocationCursor = 0;
  const allocatedEpochs: number[] = [];
  let semanticPublication: { readonly revision: number } = { revision: 0 };
  const semanticListeners = new Set<() => void>();
  let semanticUnsubscriptions = 0;
  const composition = createHostedGameUiCompositionInternalV1({
    semantic: {
      observe: () => semanticPublication,
      subscribe(listener: () => void) {
        semanticListeners.add(listener);
        return () => {
          if (!semanticListeners.delete(listener)) return;
          semanticUnsubscriptions += 1;
        };
      },
    },
    projector: {
      resolvedCatalog: {},
      initialUiState: { count: 0 as number },
      project: (input: {
        readonly uiState: {
          readonly anchor: GameUiPresentationAnchorV1;
          readonly story: { readonly count: number };
        };
      }) => ({
        view: {
          anchorEpoch: input.uiState.anchor.epoch,
          count: input.uiState.story.count,
        },
        requiredAssetIds: [],
      }),
    },
    overlayDefinitions: [overlayDefinitionV1],
    interactionSurfaceIds: ["surface.e2e.fixture" as never],
    cueIds: ["cue.e2e.fixture"],
  }, {
    managedSurfaceEpochAllocator: {
      allocate() {
        const epoch = parseNonNegativeSafeInteger(epochSequence[allocationCursor]);
        allocationCursor += 1;
        allocatedEpochs.push(epoch);
        return epoch;
      },
    },
    anchorEvents: anchorEvents.source,
    successorProducer: producerFixture.producer,
  });
  return ({
    composition,
    allocatedEpochs,
    publishSemantic(): void {
      semanticPublication = { revision: semanticPublication.revision + 1 };
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
  const semanticPublication = { revision: 0 };
  const composition = createHostedGameUiCompositionInternalV1({
    semantic: {
      observe: () => semanticPublication,
      subscribe: () => () => undefined,
    },
    anchor: anchor.source,
    projector: {
      resolvedCatalog: {},
      initialUiState: {},
      project: (input: { readonly uiState: { readonly anchor: GameUiPresentationAnchorV1 } }) => ({
        view: { anchorEpoch: input.uiState.anchor.epoch },
        requiredAssetIds: [],
      }),
    },
    overlayDefinitions: [overlayDefinitionV1],
  }, {
    managedSurfaceEpochAllocator: {
      allocate() {
        const epoch = parseNonNegativeSafeInteger(epochSequence[allocationCursor]);
        allocationCursor += 1;
        allocatedEpochs.push(epoch);
        return epoch;
      },
    },
    anchorEvents: anchor.events,
    successorProducer: {
      installed: () => undefined,
      failed: () => undefined,
    },
  });
  return ({ composition, allocatedEpochs });
}

function createInputCompositionFixtureV1(onAnchorUnsubscribe: () => void = () => undefined) {
  const initialAnchor = { epoch: 0, origin: "managed-input-fixture" };
  return createGameUiCompositionV1({
    semantic: {
      observe: () => ({ revision: 0 }),
      subscribe: () => () => undefined,
    },
    anchor: {
      current: () => initialAnchor,
      subscribe: () => {
        let active = true;
        return () => {
          if (!active) return;
          active = false;
          onAnchorUnsubscribe();
        };
      },
    },
    projector: {
      resolvedCatalog: {},
      initialUiState: {},
      project: () => ({
        view: {},
        requiredAssetIds: [],
      }),
    },
  });
}

function expectManagedFacadeReleasedV1(error: unknown): void {
  expect(error).toBeInstanceOf(TypeError);
  expect((error as TypeError).message).toBe("ui.managed_input_router_required");
}

const managedFacadeActionEventV1 = {
  kind: "action" as const,
  actionId: parseInputActionIdV1("ui.composer_managed_facade"),
};

describe("Game UI composition managed InputRouter facade", () => {
  it("admits managed registration through the public facade before ordinary handlers", () => {
    const composition = createInputCompositionFixtureV1();
    const calls: string[] = [];
    const unregisterOrdinary = composition.input.register({
      context: "narrative",
      handle: () => {
        calls.push("ordinary");
        return inputHandledV1;
      },
    });
    const unregisterManaged = registerManagedInputHandlerV1(composition.input, {
      context: "narrative",
      handle: () => {
        calls.push("managed");
        return inputIgnoredV1;
      },
    });

    try {
      expect(composition.input.route(managedFacadeActionEventV1)).toEqual({
        kind: "handled",
        context: "narrative",
      });
      expect(calls).toEqual(["managed", "ordinary"]);
    } finally {
      unregisterManaged();
      unregisterOrdinary();
      composition.dispose();
    }
  });

  it("releases managed registration before hosted terminal physical cleanup", () => {
    const readContext = vi.fn(() => "narrative" as const);
    const readHandle = vi.fn(() => () => inputHandledV1);
    const lateRegistration = Object.defineProperties({}, {
      context: { configurable: true, enumerable: true, get: readContext },
      handle: { configurable: true, enumerable: true, get: readHandle },
    }) as ManagedInputHandlerRegistrationV1;
    let cleanupRegistrationError: unknown;
    let composition!: ReturnType<typeof createInputCompositionFixtureV1>;
    composition = createInputCompositionFixtureV1(() => {
      try {
        registerManagedInputHandlerV1(composition.input, lateRegistration);
      } catch (error) {
        cleanupRegistrationError = error;
      }
    });
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const unregisterManaged = registerManagedInputHandlerV1(composition.input, {
      context: "narrative",
      handle: () => inputHandledV1,
    });

    managed.sealTerminalInternalV1();

    expect(managed.isTerminalInternalV1()).toBe(true);
    expect(composition.isDisposed()).toBe(false);
    expectManagedFacadeReleasedV1(cleanupRegistrationError);
    expect(composition.input.route(managedFacadeActionEventV1)).toBe(inputIgnoredV1);
    expect(() => registerManagedInputHandlerV1(composition.input, lateRegistration)).toThrowError(
      "ui.managed_input_router_required",
    );
    expect(readContext).not.toHaveBeenCalled();
    expect(readHandle).not.toHaveBeenCalled();
    expect(() => {
      unregisterManaged();
      unregisterManaged();
      composition.dispose();
    }).not.toThrow();
  });

  it("releases managed registration before ordinary composition cleanup", () => {
    const readContext = vi.fn(() => "narrative" as const);
    const readHandle = vi.fn(() => () => inputHandledV1);
    const lateRegistration = Object.defineProperties({}, {
      context: { configurable: true, enumerable: true, get: readContext },
      handle: { configurable: true, enumerable: true, get: readHandle },
    }) as ManagedInputHandlerRegistrationV1;
    let cleanupRegistrationError: unknown;
    let composition!: ReturnType<typeof createInputCompositionFixtureV1>;
    composition = createInputCompositionFixtureV1(() => {
      try {
        registerManagedInputHandlerV1(composition.input, lateRegistration);
      } catch (error) {
        cleanupRegistrationError = error;
      }
    });
    const unregisterManaged = registerManagedInputHandlerV1(composition.input, {
      context: "narrative",
      handle: () => inputHandledV1,
    });

    composition.dispose();
    composition.dispose();

    expect(composition.isDisposed()).toBe(true);
    expectManagedFacadeReleasedV1(cleanupRegistrationError);
    expect(composition.input.route(managedFacadeActionEventV1)).toBe(inputIgnoredV1);
    expect(() => registerManagedInputHandlerV1(composition.input, lateRegistration)).toThrowError(
      "ui.managed_input_router_required",
    );
    expect(readContext).not.toHaveBeenCalled();
    expect(readHandle).not.toHaveBeenCalled();
    expect(() => {
      unregisterManaged();
      unregisterManaged();
    }).not.toThrow();
  });

  it("rolls back a managed registration whose getter disposes the composition", () => {
    const composition = createInputCompositionFixtureV1();
    const handle = vi.fn(() => inputHandledV1);
    const readContext = vi.fn(() => {
      composition.dispose();
      return "narrative" as const;
    });
    const readHandle = vi.fn(() => handle);
    const hostileRegistration = Object.defineProperties({}, {
      context: { configurable: true, enumerable: true, get: readContext },
      handle: { configurable: true, enumerable: true, get: readHandle },
    }) as ManagedInputHandlerRegistrationV1;

    const unregisterManaged = registerManagedInputHandlerV1(
      composition.input,
      hostileRegistration,
    );

    expect(composition.isDisposed()).toBe(true);
    expect(readContext).toHaveBeenCalled();
    expect(readHandle).toHaveBeenCalled();
    expect(handle).not.toHaveBeenCalled();
    expect(composition.input.route(managedFacadeActionEventV1)).toBe(inputIgnoredV1);
    expect(() => {
      unregisterManaged();
      unregisterManaged();
    }).not.toThrow();
    expect(() =>
      registerManagedInputHandlerV1(composition.input, {
        context: "narrative",
        handle,
      })
    ).toThrowError("ui.managed_input_router_required");
  });

  it("keeps managed registration isolated across distinct compositions", () => {
    const first = createInputCompositionFixtureV1();
    const second = createInputCompositionFixtureV1();
    const firstManaged = resolveGameUiManagedSurfaceCompositionInternalV1(first);
    const firstHandler = vi.fn(() => inputHandledV1);
    const secondHandler = vi.fn(() => inputHandledV1);
    const unregisterFirst = registerManagedInputHandlerV1(first.input, {
      context: "narrative",
      handle: firstHandler,
    });
    const unregisterSecond = registerManagedInputHandlerV1(second.input, {
      context: "narrative",
      handle: secondHandler,
    });

    firstManaged.sealTerminalInternalV1();

    expect(first.input).not.toBe(second.input);
    expect(() =>
      registerManagedInputHandlerV1(first.input, {
        context: "narrative",
        handle: firstHandler,
      })
    ).toThrowError("ui.managed_input_router_required");
    expect(second.input.route(managedFacadeActionEventV1)).toEqual({
      kind: "handled",
      context: "narrative",
    });
    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledOnce();

    unregisterFirst();
    unregisterSecond();
    first.dispose();
    second.dispose();
  });
});

describe("createHostedGameUiCompositionInternalV1 Managed Surface lifetime", () => {
  it("publishes the managed opaque System facade as the only composition lifecycle authority", () => {
    const composition = createGameUiCompositionV1({
      semantic: {
        observe: () => ({ revision: 0 }),
        subscribe: () => () => undefined,
      },
      projector: {
        resolvedCatalog: {},
        initialUiState: {},
        project: () => ({
          view: {},
          requiredAssetIds: [],
        }),
      },
    });

    try {
      const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
      const runtime = managed.runtime.getCurrent();
      const internal = resolveSystemDialogSessionInternalV1(managed.systemDialogSession);
      const beforeCoordinatorPublication = runtime.coordinator.getSnapshot();
      const beforeSystemPublication = internal.getManagedSnapshotInternalV1();

      expect(composition.systemDialogSession).toBe(managed.systemDialogSession);
      expect(composition.systemDialogSession.getSnapshot()).toEqual({ active: null });
      expect(composition.systemDialogSession.openSettings()).toEqual({
        kind: "rejected",
        code: "system_dialog.renderer_unavailable",
      });
      expect(composition.systemDialogSession.openSaves()).toEqual({
        kind: "rejected",
        code: "system_dialog.renderer_unavailable",
      });
      expect(runtime.coordinator.getSnapshot()).toBe(beforeCoordinatorPublication);
      expect(internal.getManagedSnapshotInternalV1()).toBe(beforeSystemPublication);
      expect(beforeSystemPublication).toBe(beforeCoordinatorPublication);
    } finally {
      composition.dispose();
    }
  });

  it("does not leak semantic subscriptions when Overlay admission rejects construction", () => {
    let subscriptions = 0;
    let unsubscriptions = 0;
    const semanticPublication = { revision: 0 };

    expect(() =>
      createGameUiCompositionV1({
        semantic: {
          observe: () => semanticPublication,
          subscribe: () => {
            subscriptions += 1;
            return () => {
              unsubscriptions += 1;
            };
          },
        },
        projector: {
          resolvedCatalog: {},
          initialUiState: {},
          project: () => ({
            view: {},
            requiredAssetIds: [],
          }),
        },
        overlayPorts: [
          { id: "overlay.port.duplicate", port: {} },
          { id: "overlay.port.duplicate", port: {} },
        ],
      })
    ).toThrowError("ui.workspace_overlay_duplicate_port_binding");

    expect({ subscriptions, unsubscriptions }).toEqual({
      subscriptions: 0,
      unsubscriptions: 0,
    });
  });

  it("does not apply hosted terminal teardown to an ordinary composition failure", () => {
    const anchor = createAnchorSourceV1();
    const failure = new Error("fixture.ordinary_anchor_listener_failed");
    const composition = createGameUiCompositionV1({
      semantic: {
        observe: () => ({ revision: 0 }),
        subscribe: () => () => undefined,
      },
      anchor: anchor.source,
      projector: {
        resolvedCatalog: {},
        initialUiState: { count: 0 },
        project: () => ({
          view: {},
          requiredAssetIds: [],
        }),
      },
    });
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const unsubscribeFailure = composition.anchor.subscribe(() => {
      throw failure;
    });
    let inputCalls = 0;

    try {
      expect(() => anchor.publish({ epoch: 1, origin: "ordinary" })).toThrow(
        failure,
      );
      expect(managed.isTerminalInternalV1()).toBe(false);
      const unregister = composition.input.register({
        context: "gameplay",
        handle: () => {
          inputCalls += 1;
          return ({ kind: "handled" as const });
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
      semantic: {
        observe: () => ({ revision: 0 }),
        subscribe: () => () => undefined,
      },
      anchor: anchor.source,
      projector: {
        resolvedCatalog: {},
        initialUiState: {},
        project: () => ({
          view: {},
          requiredAssetIds: [],
        }),
      },
      overlayDefinitions: [overlayDefinitionV1],
    });
    const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
    const unsubscribeOverlay = overlayInternal.subscribe(() => composition.dispose());

    expect(() => anchor.publish({ epoch: 1, origin: "ordinary" })).not.toThrow();
    expect(composition.isDisposed()).toBe(true);
    expect(composition.anchor.getCurrent()).toEqual({ epoch: 0, origin: "bootstrap" });
    unsubscribeOverlay();
  });

  it("keeps Overlay intent and closure owner-scoped while dormant System prepares", async () => {
    const semanticPublication = { revision: 0 };
    const composition = createGameUiCompositionV1({
      semantic: {
        observe: () => semanticPublication,
        subscribe: () => () => undefined,
      },
      projector: {
        resolvedCatalog: {},
        initialUiState: {},
        project: () => ({
          view: {},
          requiredAssetIds: [],
        }),
      },
      overlayDefinitions: [overlayDefinitionV1],
    });

    try {
      const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
      overlayInternal.attachRendererResolverInternalV1({
        resolve: (id: "overlay.epoch-fixture") => ({ accessibleName: id, content: id }),
      });
      const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
      const systemInternal = resolveSystemDialogSessionInternalV1(
        managedComposition.systemDialogSession,
      );
      const systemHostAttachment = systemInternal.attachHostInternalV1({
        hostIdentity: { kind: "epoch-fixture-system-host" },
        portalContainer: { kind: "epoch-fixture-system-portal" },
        catalog: createSystemDialogRootCatalogSnapshotInternalV1({
          entries: [
            {
              rootRequest: "settings" as const,
              rendererComponent: { kind: "settings-renderer" },
              accessibleName: "Settings",
              requiredPortIds: [],
              contentConfig: {
                title: "Settings",
                closeLabel: "Close",
                emptyText: "Empty",
                sections: [],
              },
            },
          ],
          portBindings: [],
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
    const epochAllocator = {
      allocate() {
        if (allocationCursor === 1) {
          predecessorDuringSuccessorAllocation = overlayInternal.getManagedSnapshotInternalV1();
        }
        const epoch = parseNonNegativeSafeInteger(epochSequence[allocationCursor]);
        allocationCursor += 1;
        allocatedEpochs.push(epoch);
        return epoch;
      },
    };
    const semanticPublication = { revision: 0 };
    const composition = createHostedGameUiCompositionInternalV1({
      semantic: {
        observe: () => semanticPublication,
        subscribe: () => () => undefined,
      },
      anchor: anchor.source,
      projector: {
        resolvedCatalog: {},
        initialUiState: {},
        project: (
          input: { readonly uiState: { readonly anchor: GameUiPresentationAnchorV1 } },
        ) => ({
          view: { anchorEpoch: input.uiState.anchor.epoch },
          requiredAssetIds: [],
        }),
      },
      overlayDefinitions: [overlayDefinitionV1],
    }, {
      managedSurfaceEpochAllocator: epochAllocator,
      anchorEvents: anchor.events,
      successorProducer: {
        installed: () => undefined,
        failed: () => undefined,
      },
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
        hostIdentity: { kind: "managed-system-test-host" },
        portalContainer: { kind: "managed-system-test-portal" },
        catalog: createSystemDialogRootCatalogSnapshotInternalV1({
          entries: [
            {
              rootRequest: "settings" as const,
              rendererComponent: { kind: "settings-renderer" },
              accessibleName: "Settings",
              requiredPortIds: [],
              contentConfig: {
                title: "Settings",
                closeLabel: "Close",
                emptyText: "Empty",
                sections: [],
              },
            },
          ],
          portBindings: [],
        }),
      });
      const preparation = deferredV1();
      overlayInternal.attachRendererResolverInternalV1({
        resolve: (id: "overlay.epoch-fixture") => ({
          accessibleName: id,
          content: id,
          prepare: () => preparation.promise,
        }),
      });

      expect(composition.overlaySession.getSnapshot).toBeTypeOf("function");
      expect(composition.overlaySession.openPrimary).toBeTypeOf("function");
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

      anchor.publish({ epoch: 1, origin: "load" });

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

      anchor.publish({ epoch: 2, origin: "import" });
      expect(overlayInternal.getManagedSnapshotInternalV1()).toMatchObject({
        applicationEpoch: 23,
        orderedInstances: [],
        coordinatorDisposed: false,
      });

      anchor.publish({ epoch: 3, origin: "restart" });
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
        firstObservation = {
          overlayPublication,
          systemPublication,
          runtimePublication,
          overlayIngress,
          systemIngress,
          afterReentryPublication: managedComposition.runtime.getCurrent().coordinator
            .getSnapshot(),
          presentationAnchor: composition.anchor.getCurrent(),
        };
      });
      const unsubscribeSystem = systemInternal.subscribeInternalV1(() => {
        systemNotifications += 1;
        if (systemNotifications === 1) {
          systemAnchorDuringNotification = composition.anchor.getCurrent();
        }
      });

      anchor.publish({ epoch: 1, origin: "load" });

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
      overlayInternal.attachRendererResolverInternalV1({
        resolve: (id: "overlay.epoch-fixture") => ({ accessibleName: id, content: id }),
      });
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
          anchor.publish({ epoch: 2, origin: "import" });
        }
      });
      const unsubscribeSystem = systemInternal.subscribeInternalV1(() => {
        systemNotifications += 1;
        systemAnchors.push(composition.anchor.getCurrent());
      });
      const unsubscribeAnchor = composition.anchor.subscribe(() => {
        publishedAnchors.push(composition.anchor.getCurrent());
      });

      anchor.publish({ epoch: 1, origin: "load" });

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
      anchor.publish({ epoch: 2, origin: "import" });
      composition.dispose();
    });
    systemInternal.subscribeInternalV1(() => {
      systemNotifications += 1;
    });

    expect(() => anchor.publish({ epoch: 1, origin: "load" })).toThrowError(
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
      overlayInternal.attachRendererResolverInternalV1({
        resolve: (id: "overlay.epoch-fixture") => ({
          accessibleName: id,
          content: id,
          prepare: () => preparation.promise,
        }),
      });
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

      expect(() => anchor.publish({ epoch: 1, origin: "load" })).toThrowError(
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

  it("retains one dispatcher while both family observers replace the logical binding", async () => {
    const replacementDefinition = defineWorkspaceOverlayV1({
      id: "overlay.epoch-replacement" as const,
      contractRevision: 1,
    });
    let registrations = 0;
    let unregistrations = 0;
    let activeRegistrations = 0;
    let maximumActiveRegistrations = 0;
    const semanticPublication = { revision: 0 };
    const composition = createGameUiCompositionWithEpochAllocatorInternalV1(
      {
        semantic: {
          observe: () => semanticPublication,
          subscribe: () => () => undefined,
        },
        projector: {
          resolvedCatalog: {},
          initialUiState: {},
          project: () => ({
            view: {},
            requiredAssetIds: [],
          }),
        },
        overlayDefinitions: [overlayDefinitionV1, replacementDefinition],
      },
      {
        allocate: () => parseNonNegativeSafeInteger(11),
      },
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
      overlayInternal.attachRendererResolverInternalV1({
        resolve: (
          id: "overlay.epoch-fixture" | "overlay.epoch-replacement",
        ) => ({ accessibleName: id, content: id }),
      });

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
      expect(retainedBinding.route(retainedEnvelope)).toMatchObject({
        input: { kind: "consumed", code: "input.stale_publication" },
        surface: null,
      });
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
        overlayNotifications: 4,
        systemNotifications: 4,
      });
      unsubscribeOverlay();
      unsubscribeSystem();
    } finally {
      composition.dispose();
    }
    expect({ registrations, unregistrations, activeRegistrations }).toEqual({
      registrations: 1,
      unregistrations: 0,
      activeRegistrations: 1,
    });
  });
});

function createNarrativeComposerFixtureV1(input: {
  readonly definition?:
    | NarrativeSurfaceCompositionDefinitionInternalV1<{
      readonly pending: null;
    }>
    | null;
  readonly reportFailure?: (code: string, error: unknown) => void;
} = {}) {
  const semanticPublication = { pending: null as null };
  const semanticListeners = new Set<() => void>();
  let semanticSubscriptions = 0;
  let semanticUnsubscriptions = 0;
  let epoch = 0;
  const definition = input.definition === undefined
    ? createNarrativeSurfaceCompositionDefinitionInternalV1({
      selectNarrativeInternalV1: () => ({
        pending: null,
        history: { entries: [] },
        choiceAvailability: null,
      }),
      preflightCandidateInternalV1: () => ({
        kind: "rejected" as const,
        code: "narrative.renderer_missing" as const,
      }),
    })
    : input.definition;
  const anchorEvents = createExactAnchorEventSourceV1();
  const producer = createSuccessorProducerFixtureV1();
  const composition = createGameUiCompositionWithEpochAllocatorInternalV1(
    {
      semantic: {
        observe: () => semanticPublication,
        subscribe(listener: () => void) {
          semanticSubscriptions += 1;
          semanticListeners.add(listener);
          return () => {
            if (!semanticListeners.delete(listener)) return;
            semanticUnsubscriptions += 1;
          };
        },
      },
      projector: {
        resolvedCatalog: {},
        initialUiState: {},
        project: () => ({
          view: {},
          requiredAssetIds: [],
        }),
      },
      overlayDefinitions: [overlayDefinitionV1],
    },
    {
      allocate: () => parseNonNegativeSafeInteger(++epoch),
    },
    input.reportFailure,
    undefined,
    {
      anchorEvents: anchorEvents.source,
      producer: producer.producer,
    },
    definition,
  );
  return ({
    composition,
    anchorEvents,
    producer,
    publishSemantic(): void {
      for (const listener of [...semanticListeners]) listener();
    },
    semanticSubscriptions: () => semanticSubscriptions,
    semanticUnsubscriptions: () => semanticUnsubscriptions,
  });
}

interface NarrativeChurnPublicationV1 {
  readonly selection: NarrativeSurfaceSelectionInternalV1;
}

function narrativeChurnChoicePendingV1(sequence: number) {
  return parsePendingInteractionV1({
    kind: "choice",
    definitionId: "narrative.composer.churn",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence)}`,
    promptTextId: "text.composer.prompt",
    options: [
      { choiceId: "choice.composer.first", textId: "text.composer.first" },
      { choiceId: "choice.composer.second", textId: "text.composer.second" },
    ],
  });
}

function narrativeChurnBarrierPendingV1(sequence: number): PendingInteractionV1 {
  return parsePendingInteractionV1({
    kind: "presentation_barrier",
    definitionId: "narrative.composer.churn-barrier",
    seenRevision: 1,
    occurrenceId: `interaction-occurrence.${String(sequence + 10_000)}`,
    expectedTransitionId: "transition.composer.churn",
    loadRecovery: "replay",
  });
}

function narrativeChurnSelectionV1(input: {
  readonly pending?: PendingInteractionV1 | null;
  readonly firstEnabled?: boolean;
} = {}): NarrativeSurfaceSelectionInternalV1 {
  const pending = input.pending ?? null;
  return ({
    pending,
    history: emptyNarrativeHistoryV1,
    choiceAvailability: pending?.kind !== "choice" ? null : [
      {
        choiceId: "choice.composer.first",
        status: input.firstEnabled === false ? "disabled" as const : "enabled" as const,
        reasonTextIds: input.firstEnabled === false ? ["text.composer.unavailable"] : [],
      },
      {
        choiceId: "choice.composer.second",
        status: "enabled" as const,
        reasonTextIds: [],
      },
    ],
  });
}

function createNarrativeChurnComposerFixtureV1() {
  let publication: NarrativeChurnPublicationV1 = {
    selection: narrativeChurnSelectionV1(),
  };
  const semanticListeners = new Set<() => void>();
  let semanticSubscriptions = 0;
  let semanticUnsubscriptions = 0;
  let allocatedEpochs = 0;
  let preflightCount = 0;
  const reports: Readonly<{ readonly code: string; readonly error: unknown }>[] = [];
  let preflightHook: (pending: PendingInteractionV1) => void = () => undefined;
  const publish = (selection: NarrativeSurfaceSelectionInternalV1): void => {
    publication = { selection };
    for (const listener of [...semanticListeners]) listener();
  };
  const definition = createNarrativeSurfaceCompositionDefinitionInternalV1({
    selectNarrativeInternalV1: (
      current: DeepReadonly<NarrativeChurnPublicationV1>,
    ) => current.selection,
    preflightCandidateInternalV1: (pending: PendingInteractionV1) => {
      preflightCount += 1;
      preflightHook(pending);
      return ({
        kind: "captured" as const,
        candidateSnapshot: {
          rendererComponent: () => null,
          visualConfig: {},
          semanticDispatchPort: {
            dispatchResolutionInternalV1: () => Promise.resolve(undefined),
          },
          historyObservationPort: {
            getSnapshotInternalV1: () => publication.selection.history,
            subscribeInternalV1: () => (() => undefined),
          },
          historyAvailabilityPort: {
            readHistoryAvailabilityInternalV1: () => false,
          },
          playerProfile: {
            getSnapshotInternalV1: () => defaultPlayerProfileV1,
            subscribeInternalV1: () => (() => undefined),
            markSeenInternalV1: () => undefined,
          },
          presentationClock: {
            nowInternalV1: () => 0,
            requestTickInternalV1: () => (() => undefined),
            prefersReducedMotionInternalV1: () => false,
          },
          textResolver: {
            resolveTextInternalV1: (textId: string) => textId,
          },
          voiceReplayPort: null,
          quickMenuContribution: null,
        },
      });
    },
  });
  const anchorEvents = createExactAnchorEventSourceV1();
  const composition = createGameUiCompositionWithEpochAllocatorInternalV1(
    {
      semantic: {
        observe: () => publication,
        subscribe(listener: () => void) {
          semanticSubscriptions += 1;
          semanticListeners.add(listener);
          return () => {
            if (!semanticListeners.delete(listener)) return;
            semanticUnsubscriptions += 1;
          };
        },
      },
      projector: {
        resolvedCatalog: {},
        initialUiState: {},
        project: () => ({
          view: {},
          requiredAssetIds: [],
        }),
      },
    },
    {
      allocate: () => parseNonNegativeSafeInteger(++allocatedEpochs),
    },
    (code: string, error: unknown) => reports.push({ code, error }),
    undefined,
    {
      anchorEvents: anchorEvents.source,
      producer: {
        installed: () => undefined,
        failed: () => undefined,
      },
    },
    definition,
  );
  return ({
    composition,
    anchorEvents,
    publish,
    setPreflightHook(
      next: (pending: PendingInteractionV1) => void,
    ): void {
      preflightHook = next;
    },
    semanticSubscriptions: () => semanticSubscriptions,
    semanticUnsubscriptions: () => semanticUnsubscriptions,
    semanticListenerCount: () => semanticListeners.size,
    allocatedEpochs: () => allocatedEpochs,
    preflightCount: () => preflightCount,
    reports: () => [...reports],
  });
}

const narrativeChurnStageCatalogV1: StageContentCatalogV1 = {
  resolveContent: (contentId: Parameters<StageContentCatalogV1["resolveContent"]>[0]) => ({
    rendererId: "renderer.composer.churn",
    assetIds: [`asset.for.${contentId}` as AssetId],
    accessibleName: `Composer churn ${contentId}`,
    props: {},
  }),
};

function narrativeChurnStageTargetV1(contentId: string): StageRenderTargetV1 {
  const initial = createSemanticStageStateV1({
    stageId: "stage.composer.churn",
    layerIds: ["layer.composer.churn"],
  });
  const reduced = reduceStageMutationsV1(initial, [{
    kind: "show",
    layerId: "layer.composer.churn",
    tag: "tag.composer.churn",
    contentId,
  }]);
  if (reduced.kind !== "applied") throw new Error("expected composer churn Stage target");
  return projectStageRenderTargetV1(reduced.state, narrativeChurnStageCatalogV1).target;
}

const narrativeChurnTransitionV1 = parseStageTransitionDefinitionV1({
  transitionId: "transition.composer.churn",
  kind: "cut",
  durationMs: 0,
  easing: "linear",
  inputPolicy: "target_active",
  interruption: "settle_and_retarget",
  reducedMotion: { kind: "settle" },
  readiness: { kind: "immediate" },
  acknowledge: true,
  slide: null,
});

describe("Game UI production Narrative shared-kernel substrate", () => {
  it("rejects an aggregate with neither hosted family before allocation or subscription", () => {
    const counts: HostedWholeCanvasCompositionCountsV1 = {
      allocations: 0,
      semanticSubscriptions: 0,
      semanticUnsubscriptions: 0,
    };

    expect(() =>
      createHostedWholeCanvasCompositionForTestV1(
        {
          narrative: null,
          wholeCanvas: null,
          environment: {
            playerProfile: createHostedWholeCanvasPlayerProfileV1(),
            presentationClock: createManualPresentationClockV1(),
            prefersReducedMotion: () => false,
          },
        },
        counts,
      )
    ).toThrow("ui.hosted_surface_composition_environment_invalid");
    expect(counts).toEqual({
      allocations: 0,
      semanticSubscriptions: 0,
      semanticUnsubscriptions: 0,
    });
  });

  it("rejects a non-null Whole Canvas bundle without a definition or Title", () => {
    const counts: HostedWholeCanvasCompositionCountsV1 = {
      allocations: 0,
      semanticSubscriptions: 0,
      semanticUnsubscriptions: 0,
    };

    expect(() =>
      createHostedWholeCanvasCompositionForTestV1(
        createHostedWholeCanvasAggregateV1(),
        counts,
      )
    ).toThrow("ui.whole_canvas_hosted_input_invalid");
    expect(counts).toEqual({
      allocations: 0,
      semanticSubscriptions: 0,
      semanticUnsubscriptions: 0,
    });
  });

  it("accepts configured Splash lines", () => {
    const definition = createHostedWholeCanvasDefinitionV1();
    const titleScreen = {
      title: "Composer title",
      backgroundUrl: null,
      splash: {
        lines: ["First", "Second"],
        durationMs: null,
      },
      beginNewGame: null,
    };
    const composition = createHostedWholeCanvasCompositionForTestV1(
      createHostedWholeCanvasAggregateV1({ definition, titleScreen }),
    );

    composition.dispose();
  });

  for (const profileFailure of ["throw", "invalid_cleanup"] as const) {
    it(`transactionally rolls back presentation when profile subscribe ${profileFailure}`, () => {
      const definition = createHostedWholeCanvasDefinitionV1();
      const presentationProbe = installPresentationSubscriptionProbeV1();
      let profileSubscriptions = 0;
      try {
        const playerProfile = createHostedWholeCanvasPlayerProfileV1(() => {
          profileSubscriptions += 1;
          if (profileFailure === "throw") throw new Error("profile subscribe fault");
          return null;
        });

        expect(() =>
          createHostedWholeCanvasCompositionForTestV1(
            createHostedWholeCanvasAggregateV1({ definition, playerProfile }),
          )
        ).toThrow(
          profileFailure === "throw"
            ? "profile subscribe fault"
            : "ui.whole_canvas_surface_subscription_invalid",
        );
        expect(profileSubscriptions).toBe(1);
        expect(presentationProbe.counts()).toEqual({
          subscriptions: 1,
          unsubscriptions: 1,
        });
      } finally {
        presentationProbe.restore();
      }

      const reusableComposition = createHostedWholeCanvasCompositionForTestV1(
        createHostedWholeCanvasAggregateV1({ definition }),
      );
      reusableComposition.dispose();
    });
  }

  it("captures the exact hosted Narrative environment before allocating the production runtime", () => {
    let allocations = 0;
    let semanticSubscriptions = 0;
    let reducedMotion = false;
    let capturedEnvironment: unknown;
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    const host = {
      managedSurfaceEpochAllocator: {
        allocate: () => parseNonNegativeSafeInteger(++allocations),
      },
      anchorEvents: anchorEvents.source,
      successorProducer: producer.producer,
    };
    const playerProfile = {
      current: () => defaultPlayerProfileV1,
      subscribe: (_listener: () => void) => () => undefined,
      markSeen: async (_definitionId: string, _seenRevision: number) => undefined,
      markMeta: async (_entryId: string, _value?: number) => undefined,
      updatePreferences: async (
        _update: Partial<typeof defaultPlayerProfileV1.preferences>,
      ) => undefined,
    };
    const presentationClock = createManualPresentationClockV1();
    presentationClock.advance(42);
    const pending = narrativeChurnChoicePendingV1(99);
    const definition = createNarrativeSurfaceCompositionDefinitionInternalV1({
      selectNarrativeInternalV1: () => ({
        pending,
        history: emptyNarrativeHistoryV1,
        choiceAvailability: narrativeChurnSelectionV1({ pending }).choiceAvailability,
      }),
      preflightCandidateInternalV1: (...args: unknown[]) => {
        capturedEnvironment = args[3];
        const environment = capturedEnvironment as {
          readonly playerProfile: typeof playerProfile;
          readonly presentationClock: typeof presentationClock;
          readonly prefersReducedMotion: () => boolean;
        };
        return ({
          kind: "captured" as const,
          candidateSnapshot: {
            rendererComponent: () => null,
            visualConfig: {},
            semanticDispatchPort: {
              dispatchResolutionInternalV1: () => Promise.resolve(undefined),
            },
            historyObservationPort: {
              getSnapshotInternalV1: () => emptyNarrativeHistoryV1,
              subscribeInternalV1: () => (() => undefined),
            },
            historyAvailabilityPort: {
              readHistoryAvailabilityInternalV1: () => false,
            },
            playerProfile: {
              getSnapshotInternalV1: () => environment.playerProfile.current(),
              subscribeInternalV1: (listener: () => void) =>
                environment.playerProfile.subscribe(listener),
              markSeenInternalV1: (definitionId: string, seenRevision: number) =>
                environment.playerProfile.markSeen(definitionId, seenRevision),
            },
            presentationClock: {
              nowInternalV1: () => environment.presentationClock.now(),
              requestTickInternalV1: (callback: (now: number) => void) =>
                environment.presentationClock.requestTick(callback),
              prefersReducedMotionInternalV1: environment.prefersReducedMotion,
            },
            textResolver: {
              resolveTextInternalV1: (textId: string) => textId,
            },
            voiceReplayPort: null,
            quickMenuContribution: null,
          },
        });
      },
    });
    const hostedSurfaces = {
      narrative: definition,
      wholeCanvas: null,
      environment: {
        playerProfile,
        presentationClock,
        prefersReducedMotion: () => reducedMotion,
      },
    };
    const composition = createHostedGameUiCompositionInternalV1(
      {
        semantic: {
          observe: () => ({ pending: null as null }),
          subscribe: () => {
            semanticSubscriptions += 1;
            return () => undefined;
          },
        },
        projector: {
          resolvedCatalog: {},
          initialUiState: {},
          project: () => ({
            view: {},
            requiredAssetIds: [],
          }),
        },
      },
      host,
      hostedSurfaces,
    );

    try {
      expect(capturedEnvironment).toMatchObject({
        playerProfile,
        presentationClock,
      });
      const captured = capturedEnvironment as {
        readonly playerProfile: typeof playerProfile;
        readonly presentationClock: typeof presentationClock;
        readonly prefersReducedMotion: () => boolean;
      };
      expect(captured.playerProfile.current().preferences.locale).toBe(
        defaultPlayerProfileV1.preferences.locale,
      );
      expect(captured.presentationClock.now()).toBe(42);
      expect(captured.prefersReducedMotion()).toBe(false);
      reducedMotion = true;
      expect(captured.prefersReducedMotion()).toBe(true);
      expect(
        resolveGameUiManagedSurfaceCompositionInternalV1(composition).narrative
          .isHostEnabledInternalV1(),
      ).toBe(true);
      expect({ allocations, semanticSubscriptions }).toEqual({
        allocations: 1,
        semanticSubscriptions: 1,
      });
    } finally {
      composition.dispose();
    }
  });

  it("shares one recipe, epoch, semantic fanout, and rotates the fourth adapter on successor", () => {
    const fixture = createNarrativeComposerFixtureV1();
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(fixture.composition);
    const initialRuntime = managed.runtime.getCurrent();
    const initialSession = managed.narrative.getCurrentSessionInternalV1();
    const claimant = managed.narrative.getStageClaimantInternalV1();
    for (
      const ownerId of [
        "surface-owner.workspace-overlay",
        "surface-owner.system",
        "surface-owner.narrative",
        "surface-owner.whole-canvas",
      ]
    ) {
      expect(
        initialRuntime.coordinator.disposeOwner(parseManagedSurfaceOwnerIdV1(ownerId)),
      ).toMatchObject({ kind: "applied" });
    }
    expect(
      initialRuntime.coordinator.getSnapshot().ownerTrace.map(({ ownerId }) => ownerId),
    ).toEqual([
      "surface-owner.workspace-overlay",
      "surface-owner.system",
      "surface-owner.narrative",
      "surface-owner.whole-canvas",
    ]);
    expect(initialSession).not.toBeNull();
    expect(managed.wholeCanvas.getCurrentHostBindingInternalV1()).toBeNull();
    expect(managed.wholeCanvas.isCurrentRuntimeAttachmentInternalV1(initialRuntime)).toBe(true);
    expect(fixture.semanticSubscriptions()).toBe(1);
    let wholeCanvasNotifications = 0;
    const unsubscribeWholeCanvas = managed.wholeCanvas.subscribeInternalV1(() => {
      wholeCanvasNotifications += 1;
    });

    const token = { operation: "narrative-successor" };
    fixture.anchorEvents.publish({
      anchor: { epoch: 1, origin: "load" },
      token,
    });

    const successorRuntime = managed.runtime.getCurrent();
    expect(successorRuntime).not.toBe(initialRuntime);
    expect(successorRuntime.applicationEpoch).toBeGreaterThan(initialRuntime.applicationEpoch);
    expect(managed.narrative.getCurrentSessionInternalV1()).not.toBe(initialSession);
    expect(managed.narrative.getStageClaimantInternalV1()).toBe(claimant);
    expect(managed.wholeCanvas.getCurrentHostBindingInternalV1()).toBeNull();
    expect(managed.wholeCanvas.isCurrentRuntimeAttachmentInternalV1(successorRuntime)).toBe(true);
    expect(wholeCanvasNotifications).toBe(0);
    expect(fixture.semanticSubscriptions()).toBe(1);
    expect(fixture.producer.installed).toEqual([{
      anchor: { epoch: 1, origin: "load" },
      token,
      managedSurfaceApplicationEpoch: successorRuntime.applicationEpoch,
    }]);

    unsubscribeWholeCanvas();
    fixture.composition.dispose();
    expect(managed.narrative.getCurrentSessionInternalV1()).toBeNull();
    expect(managed.wholeCanvas.getCurrentHostBindingInternalV1()).toBeNull();
    expect(managed.wholeCanvas.isCurrentRuntimeAttachmentInternalV1(successorRuntime)).toBe(false);
    expect(fixture.semanticUnsubscriptions()).toBe(1);
  });

  it("terminal-seals the full composition when the Stage bind claim is foreign", () => {
    const fixture = createNarrativeComposerFixtureV1({ definition: null });
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(fixture.composition);
    const reconciler = createStageReconcilerV1({
      clock: {
        now: () => 0,
        requestTick: () => (() => undefined),
      },
      catalog: {
        resolveTransition: () => null,
        resolveTransitionById: () => null,
      },
    });
    const foreignDriver = createSemanticStageCompositionDriverInternalV1(
      reconciler,
      {},
    );

    expect(() => managed.narrative.bindStageReconcilerInternalV1(reconciler, foreignDriver))
      .toThrow(TypeError);
    expect(managed.isTerminalInternalV1()).toBe(true);
    expect(foreignDriver.isCurrentInternalV1()).toBe(false);
    expect(() => managed.runtime.getCurrent()).toThrow(
      "ui.managed_surface_composition_runtime_disposed",
    );
    expect(fixture.semanticUnsubscriptions()).toBe(1);
  });

  it("terminal-seals every family when a later Narrative selection faults", () => {
    let selections = 0;
    let reporterFixture: ReturnType<typeof createNarrativeComposerFixtureV1> | null = null;
    let reporterObservation: unknown = null;
    const reportFailure = vi.fn((code: string) => {
      const currentFixture = reporterFixture;
      if (currentFixture === null) throw new Error("fixture reporter called during construction");
      const currentManaged = resolveGameUiManagedSurfaceCompositionInternalV1(
        currentFixture.composition,
      );
      let runtimeDisposed = false;
      try {
        currentManaged.runtime.getCurrent();
      } catch {
        runtimeDisposed = true;
      }
      reporterObservation = {
        code,
        input: currentFixture.composition.input.route(managedFacadeActionEventV1),
        overlay: currentFixture.composition.overlaySession.openPrimary("overlay.epoch-fixture"),
        system: currentFixture.composition.systemDialogSession.openSettings(),
        terminal: currentManaged.isTerminalInternalV1(),
        runtimeDisposed,
        semanticUnsubscriptions: currentFixture.semanticUnsubscriptions(),
      };
    });
    const fixture = createNarrativeComposerFixtureV1({
      reportFailure,
      definition: createNarrativeSurfaceCompositionDefinitionInternalV1({
        selectNarrativeInternalV1: () => {
          selections += 1;
          if (selections > 2) throw new Error("fixture.narrative_selector_failed");
          return ({
            pending: null,
            history: { entries: [] },
            choiceAvailability: null,
          });
        },
        preflightCandidateInternalV1: () => ({
          kind: "rejected" as const,
          code: "narrative.renderer_missing" as const,
        }),
      }),
    });
    reporterFixture = fixture;
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(fixture.composition);

    expect(fixture.semanticSubscriptions()).toBe(1);
    expect(() => fixture.publishSemantic()).not.toThrow();
    expect(reportFailure).toHaveBeenCalledOnce();
    expect(reporterObservation).toEqual({
      code: "ui.narrative_surface_composition_failed",
      input: { kind: "ignored" },
      overlay: { kind: "rejected", code: "overlay.disposed" },
      system: { kind: "rejected", code: "system_dialog.disposed" },
      terminal: true,
      runtimeDisposed: true,
      semanticUnsubscriptions: 1,
    });
    expect(managed.isTerminalInternalV1()).toBe(true);
    expect(managed.narrative.getCurrentSessionInternalV1()).toBeNull();
    expect(() => managed.runtime.getCurrent()).toThrow(
      "ui.managed_surface_composition_runtime_disposed",
    );
    expect(fixture.semanticUnsubscriptions()).toBe(1);
  });

  it("recaptures a successor publication advanced reentrantly by preflight", () => {
    const fixture = createNarrativeChurnComposerFixtureV1();
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(fixture.composition);
    const first = narrativeChurnChoicePendingV1(1);
    const successor = narrativeChurnChoicePendingV1(2);
    fixture.publish(narrativeChurnSelectionV1({ pending: first }));
    let republished = false;
    fixture.setPreflightHook((pending) => {
      if (republished || pending.occurrenceId !== first.occurrenceId) return;
      republished = true;
      fixture.publish(narrativeChurnSelectionV1({ pending: successor }));
    });

    fixture.anchorEvents.publish({
      anchor: { epoch: 1, origin: "restart" },
      token: null,
    });

    expect(republished).toBe(true);
    expect(managed.narrative.getCurrentSelectionInternalV1()?.pending?.occurrenceId).toBe(
      successor.occurrenceId,
    );
    expect(fixture.semanticSubscriptions()).toBe(1);
    fixture.composition.dispose();
  });

  it(
    "keeps one current session/subscription/claimant through 10,000 production churn steps",
    () => {
      const fixture = createNarrativeChurnComposerFixtureV1();
      const managed = resolveGameUiManagedSurfaceCompositionInternalV1(fixture.composition);
      const initialSession = managed.narrative.getCurrentSessionInternalV1();
      if (initialSession === null) throw new Error("expected initial Narrative session");
      const predecessorHostLease = initialSession.attachHostInternalV1({
        hostIdentity: {},
      });
      const claimant = managed.narrative.getStageClaimantInternalV1();
      const reconciler = createStageReconcilerV1({
        clock: {
          now: () => 0,
          requestTick: () => (() => undefined),
        },
        catalog: {
          resolveTransition: () => narrativeChurnTransitionV1,
          resolveTransitionById: (transitionId: string) =>
            transitionId === narrativeChurnTransitionV1.transitionId
              ? narrativeChurnTransitionV1
              : null,
        },
      });
      const driver = createSemanticStageCompositionDriverInternalV1(reconciler, claimant);
      const releaseStage = managed.narrative.bindStageReconcilerInternalV1(reconciler, driver);
      const stageTargets = [
        narrativeChurnStageTargetV1("content.composer.churn-a"),
        narrativeChurnStageTargetV1("content.composer.churn-b"),
      ];
      driver.retargetInternalV1({
        target: stageTargets[0]!,
        revision: 1,
        epoch: managed.runtime.getCurrent().applicationEpoch,
      });
      let lastBarrier = narrativeChurnBarrierPendingV1(0);

      for (let sequence = 1; sequence <= 2_500; sequence += 1) {
        const pending = narrativeChurnChoicePendingV1(sequence);
        fixture.publish(narrativeChurnSelectionV1({ pending }));
        fixture.publish(narrativeChurnSelectionV1({ pending, firstEnabled: false }));
        lastBarrier = narrativeChurnBarrierPendingV1(sequence);
        fixture.publish(narrativeChurnSelectionV1({ pending: lastBarrier }));
        fixture.anchorEvents.publish({
          anchor: { epoch: sequence, origin: "restart" },
          token: null,
        });
        driver.retargetInternalV1({
          target: stageTargets[sequence % stageTargets.length]!,
          revision: sequence + 1,
          epoch: managed.runtime.getCurrent().applicationEpoch,
        });
      }

      expect(predecessorHostLease.isCurrentInternalV1()).toBe(false);
      expect(managed.narrative.getCurrentSessionInternalV1()).not.toBe(initialSession);
      expect(managed.narrative.getCurrentSessionInternalV1()).not.toBeNull();
      expect(managed.narrative.getCurrentSelectionInternalV1()).toEqual(
        narrativeChurnSelectionV1({ pending: lastBarrier }),
      );
      expect(managed.narrative.getStageClaimantInternalV1()).toBe(claimant);
      expect(driver.isCurrentInternalV1()).toBe(true);
      expect(fixture.reports()).toHaveLength(2_500);
      expect(
        fixture.reports().every(({ code, error }) =>
          code === "narrative.barrier_replay_unsupported" && error === null
        ),
      ).toBe(true);
      expect({
        semanticSubscriptions: fixture.semanticSubscriptions(),
        semanticListeners: fixture.semanticListenerCount(),
        preflightCount: fixture.preflightCount(),
        allocatedEpochs: fixture.allocatedEpochs(),
        applicationEpoch: managed.runtime.getCurrent().applicationEpoch,
      }).toEqual({
        semanticSubscriptions: 1,
        semanticListeners: 1,
        preflightCount: 7_500,
        allocatedEpochs: 2_501,
        applicationEpoch: 2_501,
      });

      fixture.composition.dispose();
      expect(driver.isCurrentInternalV1()).toBe(false);
      expect(() => releaseStage()).not.toThrow();
      expect(fixture.semanticUnsubscriptions()).toBe(1);
    },
    30_000,
  );
});

describe("hosted presentation successor acknowledgment", () => {
  it("restores the package-owned Title in the restart successor after load closes it", async () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    let restartSequence = 0;
    const restart = vi.fn(async () => {
      restartSequence += 1;
      anchorEvents.publish({
        anchor: { epoch: restartSequence + 1, origin: "restart" },
        token: { operation: `return-${restartSequence}` },
      });
      return ({
        kind: "anchored" as const,
        commandSequence: parseNonNegativeSafeInteger(restartSequence),
      });
    });
    const playerProfile = {
      current: () => defaultPlayerProfileV1,
      subscribe: (_listener: () => void) => () => undefined,
      markSeen: async (_definitionId: string, _seenRevision: number) => undefined,
      markMeta: async (_entryId: string, _value?: number) => undefined,
      updatePreferences: async (
        _update: Partial<typeof defaultPlayerProfileV1.preferences>,
      ) => undefined,
    };
    const composition = createHostedGameUiCompositionInternalV1(
      {
        semantic: {
          observe: () => ({ revision: 0 }),
          subscribe: () => () => undefined,
        },
        projector: {
          resolvedCatalog: {},
          initialUiState: {},
          project: () => ({
            view: {},
            requiredAssetIds: [],
          }),
        },
      },
      {
        managedSurfaceEpochAllocator: {
          allocate: (() => {
            let epoch = 0;
            return () => parseNonNegativeSafeInteger(++epoch);
          })(),
        },
        anchorEvents: anchorEvents.source,
        successorProducer: producer.producer,
      },
      {
        narrative: null,
        wholeCanvas: {
          definition: null,
          titleScreen: {
            title: "Composer title",
            backgroundUrl: null,
            splash: null,
            beginNewGame: null,
          },
          lifecycle: { restart, flushAutoSave: async () => undefined },
          savePort: null,
          customSavesConfigured: false,
          labels: {
            newGame: "New game",
            newGameFailed: "New game failed",
            continue: "Continue",
            load: "Load",
            settings: "Settings",
          },
        },
        environment: {
          playerProfile,
          presentationClock: createManualPresentationClockV1(),
          prefersReducedMotion: () => false,
        },
      },
    );
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const readRootKind = (): "boot_splash" | "title" | "primary" | null => {
      const binding = managed.wholeCanvas.getCurrentHostBindingInternalV1();
      if (binding === null) return null;
      const snapshot = resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(binding)
        .getSnapshotInternalV1();
      return snapshot.root.current?.rootKind ??
        snapshot.root.pending?.renderEntry.rootKind ?? null;
    };

    try {
      expect(readRootKind()).toBe("title");

      anchorEvents.publish({
        anchor: { epoch: 1, origin: "load" },
        token: { operation: "load" },
      });
      expect(readRootKind()).toBeNull();

      await expect(managed.returnToTitleInternalV1()).resolves.toBeUndefined();

      expect(restart).toHaveBeenCalledTimes(1);
      expect(readRootKind()).toBe("title");
      expect(composition.anchor.getCurrent()).toEqual({ epoch: 2, origin: "restart" });
      expect(producer.failed).toEqual([]);
      expect(producer.installed.map(({ anchor }) => anchor.origin)).toEqual([
        "load",
        "restart",
      ]);
    } finally {
      composition.dispose();
    }
  });

  it("drains reentrant exact token events FIFO without consulting the latest anchor", () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    const fixture = createExactHostedCompositionFixtureV1(anchorEvents, producer);
    const { composition } = fixture;
    const tokenA = { operation: "A" };
    const tokenB = { operation: "B" };
    const anchorA = { epoch: 1, origin: "restart" };
    const anchorB = { epoch: 2, origin: "import" };

    try {
      const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(composition.overlaySession);
      const observedAnchors: GameUiPresentationAnchorV1[] = [];
      const unsubscribeOverlay = overlayInternal.subscribe(() => {
        observedAnchors.push(composition.anchor.getCurrent());
        if (observedAnchors.length === 1) {
          anchorEvents.publish({ anchor: anchorB, token: tokenB });
        }
      });

      anchorEvents.publish({ anchor: anchorA, token: tokenA });

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
      const anchor = { epoch: 1, origin: "load" };
      anchorEvents.publish({ anchor, token: null });

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
    const token = { operation: "subscriber-isolation" };
    const anchor = { epoch: 1, origin: "restart" };
    overlay.subscribe(() => {
      throw new Error("fixture.overlay_subscriber_failed");
    });
    system.subscribeInternalV1(() => {
      throw new Error("fixture.system_subscriber_failed");
    });

    expect(() => anchorEvents.publish({ anchor, token })).not.toThrow();

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
    const token = { operation: "terminal" };
    const anchor = { epoch: 1, origin: "restart" };
    const failure = new Error("fixture.anchor_listener_failed");
    let lowerInputWrites = 0;
    let cueWrites = 0;
    const unregister = composition.input.register({
      context: "gameplay",
      handle: () => {
        lowerInputWrites += 1;
        return ({ kind: "handled" as const });
      },
    });
    composition.cues.register({
      play: () => {
        cueWrites += 1;
        return true;
      },
    });
    const systemHostAttachment = managedSystem.attachHostInternalV1({
      hostIdentity: { kind: "terminal-system-host" },
      portalContainer: { kind: "terminal-system-portal" },
      catalog: createSystemDialogRootCatalogSnapshotInternalV1({
        entries: [
          {
            rootRequest: "settings" as const,
            rendererComponent: { kind: "settings-renderer" },
            accessibleName: "Settings",
            requiredPortIds: [],
            contentConfig: {
              title: "Settings",
              closeLabel: "Close",
              emptyText: "Empty",
              sections: [],
            },
          },
        ],
        portBindings: [],
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

    expect(() => anchorEvents.publish({ anchor, token })).toThrow(failure);
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
    anchorEvents.publish({
      anchor: { epoch: 2, origin: "late" },
      token: { operation: "late" },
    });
    composition.updateUiState((current) => ({ count: current.count + 1 }));
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
    composition.cues.register({ play: () => true });
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
    const token = { operation: "second-family" };
    const anchor = { epoch: 1, origin: "load" };
    system.disposeInternalV1();

    expect(() => anchorEvents.publish({ anchor, token })).toThrowError(
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

  it("terminal-seals the dormant fourth-family attachment before anchor publication", () => {
    const anchorEvents = createExactAnchorEventSourceV1();
    const producer = createSuccessorProducerFixtureV1();
    const fixture = createExactHostedCompositionFixtureV1(anchorEvents, producer);
    const { composition } = fixture;
    const managed = resolveGameUiManagedSurfaceCompositionInternalV1(composition);
    const token = { operation: "fourth-family" };
    const anchor = { epoch: 1, origin: "load" };
    let wholeCanvasNotifications = 0;
    let narrativeNotifications = 0;
    managed.wholeCanvas.subscribeInternalV1(() => {
      wholeCanvasNotifications += 1;
    });
    managed.narrative.subscribeInternalV1(() => {
      narrativeNotifications += 1;
    });
    managed.wholeCanvas.disposeInternalV1();

    expect(() => anchorEvents.publish({ anchor, token })).toThrowError(
      "ui.whole_canvas_surface_composition_prepare_invalid",
    );

    expect(managed.isTerminalInternalV1()).toBe(true);
    expect(wholeCanvasNotifications).toBe(0);
    expect(narrativeNotifications).toBe(0);
    expect(composition.anchor.getCurrent()).toEqual({ epoch: 0, origin: "bootstrap" });
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
    const token = { operation: "post-publish-dispose" };
    const anchor = { epoch: 1, origin: "restart" };
    composition.anchor.subscribe(() => composition.dispose());

    expect(() => anchorEvents.publish({ anchor, token })).toThrowError(
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
    const token = { operation: "post-liveness" };
    const anchor = { epoch: 1, origin: "import" };
    const unsubscribe = overlay.subscribe(() => overlay.detachRuntimeInternalV1());

    expect(() => anchorEvents.publish({ anchor, token })).toThrowError(
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
