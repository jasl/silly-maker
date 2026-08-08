// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { RuntimeCapabilityPortV1, SessionAnchorResultV1 } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import { createInputRouterV1 } from "../input/input-router.ts";
import {
  createLocalManagedSurfaceEpochAllocatorInternalV1,
  createManagedSurfaceCompositionRuntimeInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import {
  createWorkspaceOverlayPublicSessionInternalV1,
  createWorkspaceOverlaySessionConfigurationInternalV1,
  createWorkspaceOverlaySessionInternalV1,
  defineWorkspaceOverlayV1,
  resolveWorkspaceOverlaySessionInternalV1,
} from "../overlays/workspace-overlay-session.ts";
import type {
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
  SaveUiReadableSlotIdV1,
  SaveUiWritableSlotIdV1,
} from "../persistence/save-overlay.tsx";
import { systemDialogManagedContractInternalV1 } from "../system/system-dialog-managed-contract.ts";
import {
  createSystemDialogManagedSessionInternalV1,
  createSystemDialogSessionFacadeInternalV1,
  resolveSystemDialogSessionInternalV1,
} from "../system/system-dialog-managed-session.ts";
import {
  createHostedGameUiCompositionInternalV1,
  resolveGameUiManagedSurfaceCompositionInternalV1,
  type GameUiPresentationAnchorEventInternalV1,
  type GameUiPresentationAnchorEventSourceInternalV1,
  type GameUiPresentationAnchorV1,
  type GameUiPresentationSuccessorProducerInternalV1,
} from "./create-game-ui-composition.ts";
import type { DefaultGameRootSlotContextV1 } from "./default-game-root.tsx";
import type { DefaultGameRootLabelsV1 } from "./default-game-root.tsx";
import { DefaultGameRootV1 } from "./default-game-root.tsx";

afterEach(cleanup);

const anchoredV1 = Object.freeze({
  kind: "anchored" as const,
  commandSequence: parseNonNegativeSafeInteger(0),
}) satisfies SessionAnchorResultV1;

const disabledCapabilityStateV1 = Object.freeze({
  debugTools: false,
  cheats: false,
  automationBridge: false,
});
const disabledCapabilitiesV1 = Object.freeze({
  state: Object.freeze({
    getCurrent: () => disabledCapabilityStateV1,
    subscribe: () => () => undefined,
  }),
  setEnabled: async () =>
    Object.freeze({ kind: "unchanged" as const, state: disabledCapabilityStateV1 }),
}) satisfies RuntimeCapabilityPortV1;

type LifecycleOverlayIdV1 = "lifecycle.primary" | "lifecycle.detail";

const lifecycleOverlayDefinitionsV1 = Object.freeze([
  defineWorkspaceOverlayV1({ id: "lifecycle.primary", contractRevision: 1 }),
  defineWorkspaceOverlayV1({ id: "lifecycle.detail", contractRevision: 1 }),
]);

const hostedSaveLabelsV1 = Object.freeze({
  accessibleName: "Hosted saves",
  title: "Hosted saves",
  storageLoading: "Loading saves",
  storageReady: "Storage ready",
  storageBusy: "Storage busy",
  storageUnavailable: "Storage unavailable",
  slotsUnavailable: "Slots unavailable",
  safelySaved: (sequence: number) => `Saved through ${String(sequence)}`,
  lastFailure: (code: string) => `Last failure ${code}`,
  slotNames: Object.freeze({
    "auto.current": "Current autosave",
    "auto.previous": "Previous autosave",
    quick: "Quick save",
    manualSlot: (index: number) => `Manual save ${String(index)}`,
  }),
  slotHealth: Object.freeze({
    empty: "Empty",
    valid: "Valid",
    invalid: "Invalid",
    recovery_candidate: "Recovery candidate",
    unavailable: "Unavailable",
  }),
  quickSave: "Quick save",
  manualSave: "Manual save",
  importSave: "Import save",
  exportCurrentSave: "Export current save",
  loadSlot: (slotName: string) => `Load ${slotName}`,
  clearSlot: (slotName: string) => `Clear ${slotName}`,
  exportSlot: (slotName: string) => `Export ${slotName}`,
  confirmation: Object.freeze({
    loadTitle: (slotName: string) => `Load ${slotName} confirmation`,
    loadDescription: (slotName: string) => `Replace progress with ${slotName}.`,
    clearTitle: (slotName: string) => `Clear ${slotName} confirmation`,
    clearDescription: (slotName: string) => `Permanently clear ${slotName}.`,
    importTitle: "Import save confirmation",
    importDescription: "Replace progress with the imported save.",
    confirmLabel: "Confirm operation",
    cancelLabel: "Cancel operation",
    pendingText: "Operation pending",
    completedText: "Operation completed",
    failedText: "Operation failed",
  }),
  operation: Object.freeze({
    saving: (slotName: string) => `Saving ${slotName}`,
    loading: (slotName: string) => `Loading ${slotName}`,
    clearing: (slotName: string) => `Clearing ${slotName}`,
    importing: "Importing",
    exporting: (slotName: string) => `Exporting ${slotName}`,
    exportingCurrent: "Exporting current save",
    saved: (slotName: string) => `Saved ${slotName}`,
    cleared: (slotName: string) => `Cleared ${slotName}`,
    loadedExact: "Loaded exact save",
    loadedAdopted: "Loaded adopted save",
    importedExact: "Imported exact save",
    importedAdopted: "Imported adopted save",
    importCancelled: "Import cancelled",
    importFileRejected: Object.freeze({
      too_large: "Import too large",
      unsupported_type: "Import type unsupported",
    }),
    exported: (slotName: string) => `Exported ${slotName}`,
    exportedCurrent: "Exported current save",
    rejected: Object.freeze({
      busy: "Busy",
      unavailable: "Unavailable",
      empty_slot: "Empty slot",
      conflict: "Conflict",
      invalid_record: "Invalid record",
      invalid_note: "Invalid note",
      lineage_limit: "Lineage limit",
      migration_unavailable: "Migration unavailable",
      migration_rejected: "Migration rejected",
      incompatible: "Incompatible",
    }),
    exportRejected: Object.freeze({
      unavailable: "Unavailable",
      empty_slot: "Empty slot",
      conflict: "Conflict",
      invalid_record: "Invalid record",
    }),
    faulted: (code: string) => `Faulted ${code}`,
    unexpectedFailure: "Unexpected failure",
  }),
}) satisfies SaveOverlayLabelsV1;

function deferredV1() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return Object.freeze({ promise, resolve });
}

function renderLifecycleRootV1(input: {
  readonly restart?: () => Promise<SessionAnchorResultV1>;
  readonly beginNewGame?: () => void | Promise<unknown>;
  readonly playerProfile?: PlayerProfileStoreV1;
  readonly capabilities?: RuntimeCapabilityPortV1;
  readonly labels?: Partial<DefaultGameRootLabelsV1>;
}) {
  let systemDialogs:
    | DefaultGameRootSlotContextV1<unknown, unknown>["systemDialogs"]
    | undefined;
  const inputRouter = createInputRouterV1();
  const overlayFailures: Array<{ readonly code: string; readonly error: unknown }> = [];
  const preparations = new Map<LifecycleOverlayIdV1, ReturnType<typeof deferredV1>>([
    ["lifecycle.primary", deferredV1()],
    ["lifecycle.detail", deferredV1()],
  ]);
  const overlayConfiguration = createWorkspaceOverlaySessionConfigurationInternalV1({
    definitions: lifecycleOverlayDefinitionsV1,
    reportFailure: (code, error) => overlayFailures.push(Object.freeze({ code, error })),
  });
  const managedSurfaceRuntimeOwner = createManagedSurfaceCompositionRuntimeInternalV1({
    inputRouter,
    epochAllocator: createLocalManagedSurfaceEpochAllocatorInternalV1(),
    recipe: Object.freeze({
      resolvedOwnerIds: Object.freeze([
        ...overlayConfiguration.recipeContribution.resolvedOwnerIds,
        ...systemDialogManagedContractInternalV1.resolvedOwnerIds,
      ]),
      resolvedSlotDescriptors: Object.freeze([
        ...overlayConfiguration.recipeContribution.resolvedSlotDescriptors,
        ...systemDialogManagedContractInternalV1.resolvedSlotDescriptors,
      ]),
    }),
  });
  const overlayInternal = createWorkspaceOverlaySessionInternalV1<LifecycleOverlayIdV1>({
    runtime: managedSurfaceRuntimeOwner.getCurrent(),
    configuration: overlayConfiguration,
  });
  const overlaySession = createWorkspaceOverlayPublicSessionInternalV1(overlayInternal);
  const overlayResolver = Object.freeze({
    resolve: (id: LifecycleOverlayIdV1) =>
      Object.freeze({
        accessibleName: id,
        content: <p>{id}</p>,
        prepare: () => preparations.get(id)!.promise,
      }),
  });
  const systemDialogInternal = createSystemDialogManagedSessionInternalV1({
    runtime: managedSurfaceRuntimeOwner.getCurrent(),
  });
  const systemDialogSession = createSystemDialogSessionFacadeInternalV1(systemDialogInternal);
  const publication = Object.freeze({ revision: 0 });
  const anchor = Object.freeze({ epoch: 0, origin: "bootstrap" });

  render(
    <DefaultGameRootV1
      composition={{
        presentation: Object.freeze({
          getSnapshot: () => publication,
          subscribe: () => () => undefined,
        }),
        anchor: Object.freeze({
          getCurrent: () => anchor,
          subscribe: () => () => undefined,
        }),
        input: inputRouter,
        intents: Object.freeze({}),
        cues: Object.freeze({}),
        overlaySession,
        systemDialogSession,
        interactionSession: Object.freeze({}),
        updateUiState: () => undefined,
      } as never}
      semantic={Object.freeze({})}
      accessibleName="Lifecycle fixture"
      applicationId="lifecycle-fixture"
      viewport={undefined as never}
      {...(input.playerProfile === undefined ? {} : { playerProfile: input.playerProfile })}
      {...(input.capabilities === undefined ? {} : { capabilities: input.capabilities })}
      {...(input.labels === undefined ? {} : { labels: input.labels })}
      {...(input.restart === undefined
        ? {}
        : { lifecycle: Object.freeze({ restart: input.restart }) })}
      titleScreen={Object.freeze({
        title: "Lifecycle fixture",
        ...(input.beginNewGame === undefined ? {} : { beginNewGame: input.beginNewGame }),
      })}
      slots={Object.freeze({
        hud: (context: DefaultGameRootSlotContextV1<unknown, unknown>) => {
          systemDialogs = context.systemDialogs;
          return null;
        },
        overlayResolver: () => overlayResolver,
      })}
    />,
  );

  return Object.freeze({
    managedSurfaceRuntimeOwner,
    overlayInternal,
    overlaySession,
    overlayFailures,
    resolvePreparation(id: LifecycleOverlayIdV1) {
      preparations.get(id)!.resolve();
    },
    systemDialogSession,
    systemDialogInternal,
    openSettings: () => {
      if (systemDialogs === undefined) throw new TypeError("missing System dialog fixture");
      return systemDialogs.openSettings();
    },
    openSaves: () => {
      if (systemDialogs === undefined) throw new TypeError("missing System dialog fixture");
      return systemDialogs.openSaves();
    },
    returnToTitle: () => {
      if (systemDialogs === undefined) {
        throw new TypeError("missing returnToTitle fixture");
      }
      return systemDialogs.returnToTitle();
    },
  });
}

async function settleOverlayPreparationV1(
  fixture: ReturnType<typeof renderLifecycleRootV1>,
  id: LifecycleOverlayIdV1,
): Promise<void> {
  const candidate = fixture.overlayInternal.getRenderSnapshotInternalV1().entries.find(
    (entry) => entry.overlayId === id && entry.readiness === "preparing",
  );
  expect(candidate).toBeDefined();
  const readiness = fixture.overlayInternal.beginCandidatePreparationInternalV1(
    candidate!.surfaceInstanceId,
  );
  await act(async () => {
    fixture.resolvePreparation(id);
    await expect(readiness).resolves.toEqual({ kind: "ready" });
  });
}

async function openActiveTopologyV1(fixture: ReturnType<typeof renderLifecycleRootV1>): Promise<
  Readonly<{
    system: { readonly active: "settings" };
    overlay: {
      readonly primaryId: "lifecycle.primary";
      readonly detailIds: readonly ["lifecycle.detail"];
    };
  }>
> {
  act(() => {
    expect(fixture.overlaySession.openPrimary("lifecycle.primary")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
  });
  await settleOverlayPreparationV1(fixture, "lifecycle.primary");
  act(() => {
    expect(fixture.overlaySession.pushDetail("lifecycle.detail")).toEqual({
      kind: "preparing",
      code: "overlay.preparation_started",
    });
  });
  await settleOverlayPreparationV1(fixture, "lifecycle.detail");
  act(() => {
    expect(fixture.systemDialogSession.openSettings()).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
  });
  await act(async () => {
    await new Promise<void>((complete) => queueMicrotask(complete));
  });
  expect(fixture.systemDialogSession.getSnapshot()).toEqual({ active: "settings" });
  return Object.freeze({
    system: Object.freeze({ active: "settings" as const }),
    overlay: Object.freeze({
      primaryId: "lifecycle.primary" as const,
      detailIds: Object.freeze(["lifecycle.detail"] as const),
    }),
  });
}

function createExactLifecycleAnchorSourceV1() {
  let current: GameUiPresentationAnchorV1 = Object.freeze({
    epoch: 0,
    origin: "bootstrap",
  });
  const listeners = new Set<
    (event: GameUiPresentationAnchorEventInternalV1) => void
  >();
  const source: GameUiPresentationAnchorEventSourceInternalV1 = Object.freeze({
    current: () => current,
    subscribe(
      listener: Parameters<GameUiPresentationAnchorEventSourceInternalV1["subscribe"]>[0],
    ) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
  return Object.freeze({
    source,
    publish(event: GameUiPresentationAnchorEventInternalV1): void {
      current = Object.freeze({ ...event.anchor });
      for (const listener of [...listeners]) {
        listener(Object.freeze({ anchor: current, token: event.token }));
      }
    },
  });
}

function renderHostedLifecycleRootV1(
  options: { readonly withSaveUi?: boolean } = {},
) {
  const anchorEvents = createExactLifecycleAnchorSourceV1();
  const installed: Parameters<GameUiPresentationSuccessorProducerInternalV1["installed"]>[0][] = [];
  const failed: Parameters<GameUiPresentationSuccessorProducerInternalV1["failed"]>[0][] = [];
  const allocatedEpochs: number[] = [];
  const epochSequence = [11, 17, 23] as const;
  let epochCursor = 0;
  const loadToken = Object.freeze({ kind: "hosted-load-test-token" });
  const load = vi.fn(async () => {
    anchorEvents.publish(Object.freeze({
      anchor: Object.freeze({ epoch: 1, origin: "load" }),
      token: loadToken,
    }));
    if (installed.at(-1)?.token !== loadToken) {
      throw new TypeError("missing exact load presentation successor acknowledgment");
    }
    return Object.freeze({
      kind: "loaded" as const,
      compatibility: "exact" as const,
      commandSequence: parseNonNegativeSafeInteger(0),
    });
  });
  const savePort = Object.freeze({
    getStatus: () =>
      Object.freeze({
        available: true,
        busy: false,
        safelySavedCommandSequence: null,
        lastFailureCode: null,
      }),
    listSlots: async () =>
      Object.freeze([
        Object.freeze({
          slotId: "quick" as const,
          health: "valid" as const,
          recordRevision: null,
          capturedCommandSequence: null,
          savedAt: null,
          annotation: null,
          warningCodes: Object.freeze([]),
        }),
      ]),
    save: async (slotId: SaveUiWritableSlotIdV1) =>
      Object.freeze({ kind: "saved" as const, slotId }),
    load,
    clear: async (slotId: SaveUiReadableSlotIdV1) =>
      Object.freeze({ kind: "cleared" as const, slotId }),
    annotateSave: async (slotId: SaveUiWritableSlotIdV1, _note: string) =>
      Object.freeze({ kind: "saved" as const, slotId }),
    importSave: async () => Object.freeze({ kind: "cancelled" as const }),
    exportSave: async (
      _slotId: SaveUiReadableSlotIdV1,
    ) => Object.freeze({ kind: "rejected" as const, code: "unavailable" as const }),
    exportCurrentSave: async () => {
      throw new TypeError("hosted save export is outside this fixture");
    },
  }) satisfies SaveOverlayPortV1;
  const semanticPublication = Object.freeze({ revision: 0 });
  const composition = createHostedGameUiCompositionInternalV1({
    semantic: Object.freeze({
      observe: () => semanticPublication,
      subscribe: () => () => undefined,
    }),
    projector: Object.freeze({
      resolvedCatalog: Object.freeze({}),
      initialUiState: Object.freeze({}),
      project: (input: { readonly uiState: { readonly anchor: GameUiPresentationAnchorV1 } }) =>
        Object.freeze({
          view: Object.freeze({ anchorEpoch: input.uiState.anchor.epoch }),
          requiredAssetIds: Object.freeze([]),
        }),
    }),
    overlayDefinitions: lifecycleOverlayDefinitionsV1,
  }, {
    managedSurfaceEpochAllocator: Object.freeze({
      allocate() {
        const nextEpoch = epochSequence[epochCursor];
        if (nextEpoch === undefined) {
          throw new TypeError("hosted lifecycle epoch fixture exhausted");
        }
        const epoch = parseNonNegativeSafeInteger(nextEpoch);
        epochCursor += 1;
        allocatedEpochs.push(epoch);
        return epoch;
      },
    }),
    anchorEvents: anchorEvents.source,
    successorProducer: Object.freeze({
      installed(
        outcome: Parameters<GameUiPresentationSuccessorProducerInternalV1["installed"]>[0],
      ) {
        installed.push(outcome);
      },
      failed(
        outcome: Parameters<GameUiPresentationSuccessorProducerInternalV1["failed"]>[0],
      ) {
        failed.push(outcome);
      },
    }),
  });
  let returnToTitle:
    | DefaultGameRootSlotContextV1<unknown, unknown>["systemDialogs"]["returnToTitle"]
    | undefined;
  const restartToken = Object.freeze({ kind: "return-to-title-test-token" });
  const restart = vi.fn(async () => {
    anchorEvents.publish(Object.freeze({
      anchor: Object.freeze({ epoch: 2, origin: "restart" }),
      token: restartToken,
    }));
    if (installed.at(-1)?.token !== restartToken) {
      throw new TypeError("missing exact presentation successor acknowledgment");
    }
    return anchoredV1;
  });
  const overlayResolver = Object.freeze({
    resolve: (id: LifecycleOverlayIdV1) =>
      Object.freeze({
        accessibleName: id,
        content: <p>{id}</p>,
      }),
  });

  render(
    <DefaultGameRootV1
      composition={composition as never}
      semantic={Object.freeze({})}
      accessibleName="Hosted lifecycle fixture"
      applicationId="hosted-lifecycle-fixture"
      viewport={undefined as never}
      lifecycle={Object.freeze({ restart })}
      {...(options.withSaveUi === true
        ? { saveUi: Object.freeze({ port: savePort, labels: hostedSaveLabelsV1 }) }
        : {})}
      titleScreen={Object.freeze({ title: "Hosted lifecycle fixture" })}
      slots={Object.freeze({
        hud: (context: DefaultGameRootSlotContextV1<unknown, unknown>) => {
          returnToTitle = context.systemDialogs.returnToTitle;
          return null;
        },
        overlayResolver: () => overlayResolver,
      })}
    />,
  );

  return Object.freeze({
    allocatedEpochs,
    anchorEvents,
    composition,
    failed,
    installed,
    load,
    loadToken,
    restart,
    restartToken,
    returnToTitle: () => {
      if (returnToTitle === undefined) {
        throw new TypeError("missing hosted returnToTitle fixture");
      }
      return returnToTitle();
    },
  });
}

describe("DefaultGameRootV1 lifecycle result handling", () => {
  it("returns managed structured System results through the Story slot context", async () => {
    const fixture = renderLifecycleRootV1({ restart: async () => anchoredV1 });
    let settingsResult: ReturnType<typeof fixture.openSettings> | undefined;

    act(() => {
      settingsResult = fixture.openSettings();
    });

    expect(settingsResult).toEqual({
      kind: "preparing",
      code: "system_dialog.preparation_started",
    });
    expect(Object.isFrozen(settingsResult)).toBe(true);
    expect(fixture.systemDialogSession.getSnapshot()).toEqual({ active: null });
    expect(fixture.openSettings()).toEqual({
      kind: "unchanged",
      code: "system_dialog.already_requested",
    });
    expect(fixture.openSaves()).toEqual({
      kind: "rejected",
      code: "system_dialog.renderer_missing",
    });

    await act(async () => {
      await new Promise<void>((complete) => queueMicrotask(complete));
    });
    expect(fixture.systemDialogSession.getSnapshot()).toEqual({ active: "settings" });
  });

  it("keeps New game unavailable without lifecycle and never calls the opening hook", async () => {
    const beginNewGame = vi.fn();
    renderLifecycleRootV1({ beginNewGame });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));

    expect(await screen.findByRole("alert")).toHaveAttribute(
      "data-title-lifecycle-failure",
      "unavailable",
    );
    expect(beginNewGame).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
  });

  it("forwards the Story opt-in cutscene label to the default Settings control", async () => {
    const playerProfile = await createPlayerProfileStoreV1({
      records: createMemoryHostRecordStoreV1(),
      storyId: "story.test.default-root-settings",
    });
    const fixture = renderLifecycleRootV1({
      restart: async () => anchoredV1,
      playerProfile,
      capabilities: disabledCapabilitiesV1,
      labels: Object.freeze({ settingsSkipCutscenesLabel: "Skip cinematic waits" }),
    });

    act(() => {
      expect(fixture.systemDialogSession.openSettings()).toEqual({
        kind: "preparing",
        code: "system_dialog.preparation_started",
      });
    });
    await act(async () => {
      await new Promise<void>((complete) => queueMicrotask(complete));
    });

    expect(
      screen.getByRole("checkbox", { name: "Skip cinematic waits" }),
    ).toBeInTheDocument();
  });

  it.each(
    [
      Object.freeze({
        kind: "rejected" as const,
        code: "validation_failed" as const,
      }),
      Object.freeze({
        kind: "faulted" as const,
        code: "runtime.anchor_failed",
      }),
    ] satisfies readonly SessionAnchorResultV1[],
  )(
    "keeps the title in place and skips the opening hook when restart returns $kind",
    async (result) => {
      const beginNewGame = vi.fn();
      const restart = vi.fn(async () => result);
      renderLifecycleRootV1({ restart, beginNewGame });

      await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
      await waitFor(() => expect(restart).toHaveBeenCalledTimes(1));

      expect(beginNewGame).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to start a new game.");
      expect(screen.getByRole("alert")).toHaveAttribute(
        "data-title-lifecycle-failure",
        `${result.kind}:${result.code}`,
      );
    },
  );

  it.each([
    () => {
      throw new Error("synthetic restart throw");
    },
    async () => {
      throw new Error("synthetic restart rejection");
    },
  ])(
    "presents an unexpected New game restart failure without dismissing the title",
    async (restart) => {
      const beginNewGame = vi.fn();
      renderLifecycleRootV1({ restart, beginNewGame });

      await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Unable to start a new game.");
      expect(screen.getByRole("alert")).toHaveAttribute(
        "data-title-lifecycle-failure",
        "unexpected",
      );
      expect(beginNewGame).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
    },
  );

  it.each([
    () => {
      throw new Error("synthetic begin throw");
    },
    async () => {
      throw new Error("synthetic begin rejection");
    },
  ])("presents an opening-hook failure without dismissing the title", async (beginNewGame) => {
    const restart = vi.fn(async () => anchoredV1);
    renderLifecycleRootV1({ restart, beginNewGame });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to start a new game.");
    expect(screen.getByRole("alert")).toHaveAttribute("data-title-lifecycle-failure", "unexpected");
    expect(screen.getByRole("dialog", { name: "Lifecycle fixture" })).toBeInTheDocument();
  });

  it.each(
    [
      Object.freeze({
        kind: "rejected" as const,
        code: "validation_failed" as const,
      }),
      Object.freeze({
        kind: "faulted" as const,
        code: "runtime.anchor_failed",
      }),
    ] satisfies readonly SessionAnchorResultV1[],
  )(
    "rejects returnToTitle on $kind and retains the current foreground",
    async (result) => {
      const restart = vi
        .fn<() => Promise<SessionAnchorResultV1>>()
        .mockResolvedValueOnce(anchoredV1)
        .mockResolvedValueOnce(result);
      const fixture = renderLifecycleRootV1({ restart });

      await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
      );
      const topology = await openActiveTopologyV1(fixture);

      await expect(fixture.returnToTitle()).rejects.toThrow(
        `ui.lifecycle_restart_${result.kind}:${result.code}`,
      );
      expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
      expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull();
    },
  );

  it("returns a rejected Promise for a synchronous returnToTitle restart failure", async () => {
    const restart = vi
      .fn<() => Promise<SessionAnchorResultV1>>()
      .mockResolvedValueOnce(anchoredV1)
      .mockImplementationOnce(() => {
        throw new Error("synthetic return-to-title throw");
      });
    const fixture = renderLifecycleRootV1({ restart });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );
    const topology = await openActiveTopologyV1(fixture);

    let outcome: Promise<void> | undefined;
    expect(() => {
      outcome = fixture.returnToTitle();
      void outcome.catch(() => undefined);
    }).not.toThrow();
    expect(outcome).toBeDefined();
    await expect(outcome).rejects.toThrow("synthetic return-to-title throw");
    expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
    expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
    expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull();
  });

  it("rejects an unavailable returnToTitle before mutating active presentation topology", async () => {
    const fixture = renderLifecycleRootV1({});
    const topology = await openActiveTopologyV1(fixture);
    const before = fixture.managedSurfaceRuntimeOwner.getCurrent().coordinator.getSnapshot();
    const systemNotifications = vi.fn();
    const overlayNotifications = vi.fn();
    fixture.systemDialogInternal.subscribeInternalV1(systemNotifications);
    fixture.overlaySession.subscribe(overlayNotifications);

    let outcome: Promise<void> | undefined;
    expect(() => {
      outcome = fixture.returnToTitle();
      void outcome.catch(() => undefined);
    }).not.toThrow();
    expect(outcome).toBeDefined();
    await expect(outcome).rejects.toThrow("ui.lifecycle_restart_unavailable");

    expect(fixture.managedSurfaceRuntimeOwner.getCurrent().coordinator.getSnapshot()).toBe(before);
    expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
    expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
    expect(systemNotifications).not.toHaveBeenCalled();
    expect(overlayNotifications).not.toHaveBeenCalled();
  });

  it("rejects a malformed anchored result before mutating active presentation topology", async () => {
    const malformedAnchored = Object.freeze({
      ...anchoredV1,
      extra: true,
    }) as unknown as SessionAnchorResultV1;
    const restart = vi
      .fn<() => Promise<SessionAnchorResultV1>>()
      .mockResolvedValueOnce(anchoredV1)
      .mockResolvedValueOnce(malformedAnchored);
    const fixture = renderLifecycleRootV1({ restart });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );
    const topology = await openActiveTopologyV1(fixture);
    const before = fixture.managedSurfaceRuntimeOwner.getCurrent().coordinator.getSnapshot();
    const systemNotifications = vi.fn();
    const overlayNotifications = vi.fn();
    fixture.systemDialogInternal.subscribeInternalV1(systemNotifications);
    fixture.overlaySession.subscribe(overlayNotifications);

    await expect(fixture.returnToTitle()).rejects.toThrow(
      "ui.lifecycle_restart_result_invalid",
    );

    expect(fixture.managedSurfaceRuntimeOwner.getCurrent().coordinator.getSnapshot()).toBe(before);
    expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
    expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
    expect(systemNotifications).not.toHaveBeenCalled();
    expect(overlayNotifications).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull();
  });

  it("preserves a fresh Overlay synchronously opened by the exact successor subscriber", async () => {
    const fixture = renderHostedLifecycleRootV1();
    const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(
      fixture.composition,
    );
    const overlayInternal = resolveWorkspaceOverlaySessionInternalV1(
      fixture.composition.overlaySession,
    );
    let openAttempted = false;
    let openResult: unknown;
    let freshInstanceId: string | undefined;
    let notifications = 0;
    let unsubscribe: () => void = () => undefined;

    try {
      await act(async () => {
        fixture.anchorEvents.publish(Object.freeze({
          anchor: Object.freeze({ epoch: 1, origin: "load" }),
          token: null,
        }));
        await Promise.resolve();
      });
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Hosted lifecycle fixture" })).toBeNull()
      );
      expect(managedComposition.runtime.getCurrent().applicationEpoch).toBe(17);

      unsubscribe = fixture.composition.overlaySession.subscribe(() => {
        notifications += 1;
        const publication = overlayInternal.getManagedSnapshotInternalV1();
        if (publication.applicationEpoch !== 23 || openAttempted) return;
        openAttempted = true;
        openResult = fixture.composition.intents.execute(Object.freeze({
          kind: "overlay.open" as const,
          overlayId: "lifecycle.primary",
        }));
        freshInstanceId = overlayInternal.getManagedSnapshotInternalV1().orderedInstances[0]
          ?.surfaceInstanceId;
      });

      await act(async () => {
        await fixture.returnToTitle();
      });

      expect(fixture.restart).toHaveBeenCalledTimes(1);
      expect(openResult).toEqual({ kind: "executed" });
      expect(freshInstanceId).toBe("surface-instance.e23.n1");
      expect(fixture.installed).toEqual([
        {
          anchor: { epoch: 2, origin: "restart" },
          token: fixture.restartToken,
          managedSurfaceApplicationEpoch: 23,
        },
      ]);
      expect(fixture.failed).toEqual([]);
      expect(fixture.allocatedEpochs).toEqual([11, 17, 23]);

      const afterReturn = overlayInternal.getManagedSnapshotInternalV1();
      expect(afterReturn.applicationEpoch).toBe(23);
      expect(afterReturn.orderedInstances.map((instance) => instance.surfaceInstanceId)).toEqual([
        freshInstanceId,
      ]);
      expect(screen.getByRole("dialog", {
        name: "Hosted lifecycle fixture",
      })).toBeInTheDocument();
      await waitFor(() =>
        expect(fixture.composition.overlaySession.getSnapshot()).toEqual({
          primaryId: "lifecycle.primary",
          detailIds: [],
        })
      );
      expect(await screen.findByRole("dialog", { name: "lifecycle.primary" }))
        .toBeInTheDocument();

      const stablePublication = overlayInternal.getManagedSnapshotInternalV1();
      const stableNotifications = notifications;
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(overlayInternal.getManagedSnapshotInternalV1()).toBe(stablePublication);
      expect(notifications).toBe(stableNotifications);
      expect(stablePublication.orderedInstances[0]?.surfaceInstanceId).toBe(freshInstanceId);
    } finally {
      unsubscribe();
      fixture.composition.dispose();
    }
  });

  it("preserves a fresh System root synchronously opened by the exact restart successor subscriber", async () => {
    const fixture = renderHostedLifecycleRootV1();
    const systemInternal = resolveSystemDialogSessionInternalV1(
      fixture.composition.systemDialogSession,
    );
    let openAttempted = false;
    let openResult: unknown;
    let freshInstanceId: string | undefined;
    let notifications = 0;
    const unsubscribe = systemInternal.subscribeInternalV1(() => {
      notifications += 1;
      const publication = systemInternal.getManagedSnapshotInternalV1();
      if (publication.applicationEpoch !== 23 || openAttempted) return;
      openAttempted = true;
      openResult = fixture.composition.systemDialogSession.openSettings();
      freshInstanceId = systemInternal.getManagedSnapshotInternalV1().orderedInstances[0]
        ?.surfaceInstanceId;
    });

    try {
      await act(async () => {
        fixture.anchorEvents.publish(Object.freeze({
          anchor: Object.freeze({ epoch: 1, origin: "load" }),
          token: null,
        }));
        await Promise.resolve();
      });
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Hosted lifecycle fixture" })).toBeNull()
      );

      await act(async () => {
        await fixture.returnToTitle();
      });

      expect(openResult).toEqual({
        kind: "preparing",
        code: "system_dialog.preparation_started",
      });
      expect(freshInstanceId).toBe("surface-instance.e23.n1");
      expect(fixture.failed).toEqual([]);
      expect(fixture.installed).toEqual([
        {
          anchor: { epoch: 2, origin: "restart" },
          token: fixture.restartToken,
          managedSurfaceApplicationEpoch: 23,
        },
      ]);
      await waitFor(() =>
        expect(fixture.composition.systemDialogSession.getSnapshot()).toEqual({
          active: "settings",
        })
      );
      expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument();

      const stablePublication = systemInternal.getManagedSnapshotInternalV1();
      const stableRenderSnapshot = systemInternal.getHostRenderSnapshotInternalV1();
      const stableNotifications = notifications;
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(systemInternal.getManagedSnapshotInternalV1()).toBe(stablePublication);
      expect(systemInternal.getHostRenderSnapshotInternalV1()).toBe(stableRenderSnapshot);
      expect(notifications).toBe(stableNotifications);
      expect(stablePublication.orderedInstances[0]?.surfaceInstanceId).toBe(freshInstanceId);
    } finally {
      unsubscribe();
      fixture.composition.dispose();
    }
  });

  it("keeps a fresh System root after the predecessor Saves load settles as successor", async () => {
    const fixture = renderHostedLifecycleRootV1({ withSaveUi: true });
    const managedComposition = resolveGameUiManagedSurfaceCompositionInternalV1(
      fixture.composition,
    );
    const systemInternal = resolveSystemDialogSessionInternalV1(
      fixture.composition.systemDialogSession,
    );
    let openAttempted = false;
    let openResult: unknown;
    let freshInstanceId: string | undefined;
    const unsubscribe = systemInternal.subscribeInternalV1(() => {
      const publication = systemInternal.getManagedSnapshotInternalV1();
      if (publication.applicationEpoch !== 17 || openAttempted) return;
      openAttempted = true;
      openResult = fixture.composition.systemDialogSession.openSettings();
      freshInstanceId = systemInternal.getManagedSnapshotInternalV1().orderedInstances[0]
        ?.surfaceInstanceId;
    });

    try {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(await screen.findByRole("dialog", { name: "Hosted saves" })).toBeInTheDocument();
      await user.click(await screen.findByRole("button", { name: "Load Quick save" }));
      expect(
        await screen.findByRole("dialog", { name: "Load Quick save confirmation" }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Confirm operation" }));

      expect(fixture.load).toHaveBeenCalledExactlyOnceWith("quick");
      expect(openResult).toEqual({
        kind: "preparing",
        code: "system_dialog.preparation_started",
      });
      expect(freshInstanceId).toBe("surface-instance.e17.n1");
      expect(fixture.failed).toEqual([]);
      expect(fixture.installed).toEqual([
        {
          anchor: { epoch: 1, origin: "load" },
          token: fixture.loadToken,
          managedSurfaceApplicationEpoch: 17,
        },
      ]);
      await waitFor(() =>
        expect(fixture.composition.systemDialogSession.getSnapshot()).toEqual({
          active: "settings",
        })
      );
      expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Hosted saves" })).toBeNull();
      expect(screen.queryByRole("dialog", {
        name: "Load Quick save confirmation",
      })).toBeNull();

      const stablePublication = systemInternal.getManagedSnapshotInternalV1();
      const stableRenderSnapshot = systemInternal.getHostRenderSnapshotInternalV1();
      const stableCoordinator = managedComposition.runtime.getCurrent().coordinator.getSnapshot();
      let sessionNotifications = 0;
      let coordinatorNotifications = 0;
      const unsubscribeStableSession = systemInternal.subscribeInternalV1(
        () => sessionNotifications += 1,
      );
      const unsubscribeCoordinator = managedComposition.runtime.getCurrent().coordinator.subscribe(
        () => coordinatorNotifications += 1,
      );
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(systemInternal.getManagedSnapshotInternalV1()).toBe(stablePublication);
      expect(systemInternal.getHostRenderSnapshotInternalV1()).toBe(stableRenderSnapshot);
      expect(managedComposition.runtime.getCurrent().coordinator.getSnapshot()).toBe(
        stableCoordinator,
      );
      expect(sessionNotifications).toBe(0);
      expect(coordinatorNotifications).toBe(0);
      unsubscribeCoordinator();
      unsubscribeStableSession();
    } finally {
      unsubscribe();
      fixture.composition.dispose();
    }
  });

  it("keeps active presentation topology after an exact anchored return", async () => {
    const restart = vi.fn(async () => anchoredV1);
    const fixture = renderLifecycleRootV1({ restart });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );
    const topology = await openActiveTopologyV1(fixture);
    const before = fixture.managedSurfaceRuntimeOwner.getCurrent().coordinator.getSnapshot();

    await act(async () => {
      await fixture.returnToTitle();
    });

    expect(fixture.managedSurfaceRuntimeOwner.getCurrent().coordinator.getSnapshot()).toBe(before);
    expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
    expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
    expect(document.querySelector('[data-title-screen="true"]')).toBeInTheDocument();
  });

  it("does not invoke a System close subscriber after an exact anchored return", async () => {
    const restart = vi.fn(async () => anchoredV1);
    const fixture = renderLifecycleRootV1({ restart });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );
    const topology = await openActiveTopologyV1(fixture);
    const systemFailure = new Error("synthetic System close subscriber failure");
    const systemSubscriber = vi.fn(() => {
      throw systemFailure;
    });
    fixture.systemDialogInternal.subscribeInternalV1(systemSubscriber);

    await act(async () => {
      await expect(fixture.returnToTitle()).resolves.toBeUndefined();
    });

    expect(systemSubscriber).not.toHaveBeenCalled();
    expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
    expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
    expect(document.querySelector('[data-title-screen="true"]')).toBeInTheDocument();
  });

  it("does not invoke either family subscriber for post-anchor cleanup", async () => {
    const restart = vi.fn(async () => anchoredV1);
    const fixture = renderLifecycleRootV1({ restart });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );
    const topology = await openActiveTopologyV1(fixture);
    const systemFailure = new Error("synthetic System close subscriber failure");
    const overlayFailure = new Error("synthetic Overlay close subscriber failure");
    const systemSubscriber = vi.fn(() => {
      throw systemFailure;
    });
    const overlaySubscriber = vi.fn(() => {
      throw overlayFailure;
    });
    fixture.systemDialogInternal.subscribeInternalV1(systemSubscriber);
    fixture.overlaySession.subscribe(overlaySubscriber);

    await act(async () => {
      await expect(fixture.returnToTitle()).resolves.toBeUndefined();
    });

    expect(systemSubscriber).not.toHaveBeenCalled();
    expect(overlaySubscriber).not.toHaveBeenCalled();
    expect(fixture.overlayFailures).toEqual([]);
    expect(fixture.systemDialogSession.getSnapshot()).toEqual(topology.system);
    expect(fixture.overlaySession.getSnapshot()).toEqual(topology.overlay);
    expect(document.querySelector('[data-title-screen="true"]')).toBeInTheDocument();
  });

  it("keeps the successful restart and opening-hook order unchanged", async () => {
    const order: string[] = [];
    const restart = vi.fn(async () => {
      order.push("restart");
      return anchoredV1;
    });
    const beginNewGame = vi.fn(() => {
      order.push("begin");
    });
    renderLifecycleRootV1({ restart, beginNewGame });

    await userEvent.setup().click(screen.getByRole("button", { name: "New game" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Lifecycle fixture" })).toBeNull()
    );

    expect(order).toEqual(["restart", "begin"]);
  });
});
