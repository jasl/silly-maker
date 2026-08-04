// SPDX-License-Identifier: MIT
import { parseModuleId } from "@sillymaker/base";
import type { ReactNode } from "react";

import type {
  ManagedSurfaceInstanceIdV1,
  ManagedSurfacePublicationV1,
  ManagedSurfaceTransitionReceiptV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import type {
  ManagedSurfaceCoordinatorRuntimeV1,
} from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
import type { ManagedSurfaceReadinessAdapterV1 } from "../managed-surfaces/managed-surface-coordinator.ts";
import type {
  ManagedSurfaceFamilyActivationGateInternalV1,
  ManagedSurfaceFamilyRuntimeAdapterInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import type {
  SaveOverlayGuardV1,
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
} from "../persistence/save-overlay.tsx";
import {
  createSystemDialogRootCandidateResolutionSnapshotInternalV1,
  systemDialogManagedContractInternalV1,
  type SystemDialogContentConfigSnapshotInternalV1,
  type SystemDialogOpenResultV1,
  type SystemDialogRequiredPortBindingInternalV1,
  type SystemDialogRootCandidateResolutionSnapshotInternalV1,
  type SystemDialogRootRequestInternalV1,
  type SystemDialogSessionV1,
} from "./system-dialog-managed-contract.ts";
import { createSystemDialogContentConfigSnapshotInternalV1 } from "./system-dialog-managed-contract.ts";

export interface SystemDialogSettingsContentConfigInternalV1 {
  readonly title: string;
  readonly closeLabel: string;
  readonly emptyText: string;
  readonly sections: readonly ReactNode[];
}

export interface SystemDialogStandardSavesContentConfigInternalV1 {
  readonly variant: "standard";
  readonly port: SaveOverlayPortV1;
  readonly labels: SaveOverlayLabelsV1;
  readonly closeLabel: string;
  /** Captures the live Story projection source, never one guard value. */
  readonly evaluateGuard?: () => SaveOverlayGuardV1 | undefined;
}

export interface SystemDialogCustomSavesContentConfigInternalV1 {
  readonly variant: "custom";
  readonly accessibleName: string;
  readonly component: object | ((...args: never[]) => unknown);
}

export type SystemDialogSavesContentConfigInternalV1 =
  | SystemDialogStandardSavesContentConfigInternalV1
  | SystemDialogCustomSavesContentConfigInternalV1;

interface SystemDialogRootCatalogEntryBaseInternalV1 {
  readonly rendererComponent: object | ((...args: never[]) => unknown);
  readonly accessibleName: string;
  readonly requiredPortIds: readonly string[];
}

export type SystemDialogRootCatalogEntryInternalV1 =
  | (SystemDialogRootCatalogEntryBaseInternalV1 & {
    readonly rootRequest: "settings";
    readonly contentConfig: SystemDialogSettingsContentConfigInternalV1;
  })
  | (SystemDialogRootCatalogEntryBaseInternalV1 & {
    readonly rootRequest: "saves";
    readonly contentConfig: SystemDialogSavesContentConfigInternalV1;
  });

export interface SystemDialogResolvedRootCatalogEntryInternalV1
  extends SystemDialogRootCatalogEntryBaseInternalV1 {
  readonly rootRequest: SystemDialogRootRequestInternalV1;
  readonly contentConfigSnapshot: SystemDialogContentConfigSnapshotInternalV1<unknown>;
}

export interface SystemDialogRootCatalogInternalV1 {
  resolveRoot(
    request: SystemDialogRootRequestInternalV1,
  ): SystemDialogResolvedRootCatalogEntryInternalV1 | null;
  resolvePort(portId: string): object | ((...args: never[]) => unknown) | null;
}

export interface SystemDialogRootCandidateRecordInternalV1 {
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly rootRequest: SystemDialogRootRequestInternalV1;
  readonly resolution: SystemDialogRootCandidateResolutionSnapshotInternalV1<unknown, unknown>;
  readonly readiness: ManagedSurfaceReadinessAdapterV1;
}

export interface SystemDialogManagedSessionInternalV1
  extends ManagedSurfaceFamilyRuntimeAdapterInternalV1 {
  getManagedSnapshotInternalV1(): ManagedSurfacePublicationV1;
  getRootCandidateRecordsInternalV1(): readonly SystemDialogRootCandidateRecordInternalV1[];
  subscribeInternalV1(listener: () => void): () => void;
  openRootInternalV1(request: SystemDialogRootRequestInternalV1): SystemDialogOpenResultV1;
  readyCandidateInternalV1(
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): ManagedSurfaceTransitionReceiptV1;
  failCandidateInternalV1(
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): ManagedSurfaceTransitionReceiptV1;
  setCatalogInternalV1(catalog: SystemDialogRootCatalogInternalV1 | null): void;
  disposeInternalV1(): void;
}

interface CatalogEntryRecordV1 extends SystemDialogResolvedRootCatalogEntryInternalV1 {}

const systemDialogSettingsConfigSnapshotsInternalV1 = new WeakSet<object>();
const systemDialogSavesConfigSnapshotsInternalV1 = new WeakSet<object>();

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownDataValueV1(value: Readonly<Record<string, unknown>>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !("value" in descriptor)) throw new TypeError();
  return descriptor.value;
}

function denseOwnArraySnapshotV1(value: unknown): readonly unknown[] {
  if (!Array.isArray(value) || Reflect.ownKeys(value).length !== value.length + 1) {
    throw new TypeError();
  }
  const snapshot: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !("value" in descriptor)) throw new TypeError();
    snapshot.push(descriptor.value);
  }
  return Object.freeze(snapshot);
}

type KnownFieldKindV1 = "string" | "function";

function snapshotKnownFieldsV1(
  value: unknown,
  fields: Readonly<Record<string, KnownFieldKindV1>>,
): Readonly<Record<string, unknown>> {
  if (!isRecordV1(value)) throw new TypeError();
  const snapshot: Record<string, unknown> = {};
  for (const [key, kind] of Object.entries(fields)) {
    const field = ownDataValueV1(value, key);
    if (typeof field !== kind) throw new TypeError();
    snapshot[key] = field;
  }
  return Object.freeze(snapshot);
}

function snapshotOptionalFunctionV1(
  value: Readonly<Record<string, unknown>>,
  key: string,
): ((...args: never[]) => unknown) | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) return undefined;
  if (!("value" in descriptor) || typeof descriptor.value !== "function") throw new TypeError();
  return descriptor.value as (...args: never[]) => unknown;
}

const saveLabelScalarFieldsV1 = Object.freeze(
  {
    accessibleName: "string",
    title: "string",
    storageLoading: "string",
    storageReady: "string",
    storageBusy: "string",
    storageUnavailable: "string",
    slotsUnavailable: "string",
    safelySaved: "function",
    lastFailure: "function",
    quickSave: "string",
    manualSave: "string",
    importSave: "string",
    exportCurrentSave: "string",
    loadSlot: "function",
    clearSlot: "function",
    exportSlot: "function",
  } as const satisfies Readonly<Record<string, KnownFieldKindV1>>,
);

const saveSlotNameFieldsV1 = Object.freeze(
  {
    "auto.current": "string",
    "auto.previous": "string",
    quick: "string",
    manualSlot: "function",
  } as const satisfies Readonly<Record<string, KnownFieldKindV1>>,
);

const saveSlotHealthFieldsV1 = Object.freeze(
  {
    empty: "string",
    valid: "string",
    invalid: "string",
    recovery_candidate: "string",
    unavailable: "string",
  } as const satisfies Readonly<Record<string, KnownFieldKindV1>>,
);

const saveConfirmationFieldsV1 = Object.freeze(
  {
    loadTitle: "function",
    loadDescription: "function",
    clearTitle: "function",
    clearDescription: "function",
    importTitle: "string",
    importDescription: "string",
    confirmLabel: "string",
    cancelLabel: "string",
    pendingText: "string",
    completedText: "string",
    failedText: "string",
  } as const satisfies Readonly<Record<string, KnownFieldKindV1>>,
);

const saveOperationScalarFieldsV1 = Object.freeze(
  {
    saving: "function",
    loading: "function",
    clearing: "function",
    importing: "string",
    exporting: "function",
    exportingCurrent: "string",
    saved: "function",
    cleared: "function",
    loadedExact: "string",
    loadedAdopted: "string",
    importedExact: "string",
    importedAdopted: "string",
    importCancelled: "string",
    exported: "function",
    exportedCurrent: "string",
    faulted: "function",
    unexpectedFailure: "string",
  } as const satisfies Readonly<Record<string, KnownFieldKindV1>>,
);

const saveImportFileRejectionFieldsV1 = Object.freeze(
  {
    too_large: "string",
    unsupported_type: "string",
  } as const satisfies Readonly<Record<string, KnownFieldKindV1>>,
);

const savePersistenceRejectionFieldsV1 = Object.freeze(
  {
    busy: "string",
    unavailable: "string",
    empty_slot: "string",
    conflict: "string",
    invalid_record: "string",
    invalid_note: "string",
    lineage_limit: "string",
    migration_unavailable: "string",
    migration_rejected: "string",
    incompatible: "string",
  } as const satisfies Readonly<Record<string, KnownFieldKindV1>>,
);

const saveExportRejectionFieldsV1 = Object.freeze(
  {
    unavailable: "string",
    empty_slot: "string",
    conflict: "string",
    invalid_record: "string",
  } as const satisfies Readonly<Record<string, KnownFieldKindV1>>,
);

function snapshotSaveLabelsV1(value: unknown): SaveOverlayLabelsV1 {
  if (!isRecordV1(value)) throw new TypeError();
  const scalar = snapshotKnownFieldsV1(value, saveLabelScalarFieldsV1);
  const operationValue = ownDataValueV1(value, "operation");
  if (!isRecordV1(operationValue)) throw new TypeError();
  const operationScalar = snapshotKnownFieldsV1(operationValue, saveOperationScalarFieldsV1);
  const operation = Object.freeze({
    ...operationScalar,
    importFileRejected: snapshotKnownFieldsV1(
      ownDataValueV1(operationValue, "importFileRejected"),
      saveImportFileRejectionFieldsV1,
    ),
    rejected: snapshotKnownFieldsV1(
      ownDataValueV1(operationValue, "rejected"),
      savePersistenceRejectionFieldsV1,
    ),
    exportRejected: snapshotKnownFieldsV1(
      ownDataValueV1(operationValue, "exportRejected"),
      saveExportRejectionFieldsV1,
    ),
  });
  const savedAtText = snapshotOptionalFunctionV1(value, "savedAtText");
  return Object.freeze({
    ...scalar,
    slotNames: snapshotKnownFieldsV1(ownDataValueV1(value, "slotNames"), saveSlotNameFieldsV1),
    slotHealth: snapshotKnownFieldsV1(
      ownDataValueV1(value, "slotHealth"),
      saveSlotHealthFieldsV1,
    ),
    confirmation: snapshotKnownFieldsV1(
      ownDataValueV1(value, "confirmation"),
      saveConfirmationFieldsV1,
    ),
    operation,
    ...(savedAtText === undefined ? {} : { savedAtText }),
  }) as unknown as SaveOverlayLabelsV1;
}

export function snapshotSystemDialogSettingsContentConfigInternalV1(
  input: SystemDialogSettingsContentConfigInternalV1,
): SystemDialogContentConfigSnapshotInternalV1<SystemDialogSettingsContentConfigInternalV1> {
  try {
    if (!isRecordV1(input)) throw new TypeError();
    const title = ownDataValueV1(input, "title");
    const closeLabel = ownDataValueV1(input, "closeLabel");
    const emptyText = ownDataValueV1(input, "emptyText");
    if (
      typeof title !== "string" || typeof closeLabel !== "string" || typeof emptyText !== "string"
    ) {
      throw new TypeError();
    }
    const sections = denseOwnArraySnapshotV1(ownDataValueV1(input, "sections"));
    const snapshot = createSystemDialogContentConfigSnapshotInternalV1(Object.freeze({
      title,
      closeLabel,
      emptyText,
      sections: sections as readonly ReactNode[],
    }));
    systemDialogSettingsConfigSnapshotsInternalV1.add(snapshot);
    return snapshot;
  } catch {
    throw new TypeError("ui.system_dialog_settings_config_invalid");
  }
}

export function snapshotSystemDialogSavesContentConfigInternalV1(
  input: SystemDialogSavesContentConfigInternalV1,
): SystemDialogContentConfigSnapshotInternalV1<SystemDialogSavesContentConfigInternalV1> {
  try {
    if (!isRecordV1(input)) throw new TypeError();
    const variant = ownDataValueV1(input, "variant");
    if (variant === "custom") {
      const accessibleName = ownDataValueV1(input, "accessibleName");
      const component = ownDataValueV1(input, "component");
      if (
        typeof accessibleName !== "string" ||
        accessibleName.length === 0 ||
        component === null ||
        (typeof component !== "object" && typeof component !== "function")
      ) {
        throw new TypeError();
      }
      const snapshot = createSystemDialogContentConfigSnapshotInternalV1(Object.freeze({
        variant,
        accessibleName,
        component,
      }));
      systemDialogSavesConfigSnapshotsInternalV1.add(snapshot);
      return snapshot;
    }
    if (variant !== "standard") throw new TypeError();
    const port = ownDataValueV1(input, "port");
    const closeLabel = ownDataValueV1(input, "closeLabel");
    if (
      port === null ||
      (typeof port !== "object" && typeof port !== "function") ||
      typeof closeLabel !== "string"
    ) {
      throw new TypeError();
    }
    const evaluateGuard = snapshotOptionalFunctionV1(input, "evaluateGuard") as
      | (() => SaveOverlayGuardV1 | undefined)
      | undefined;
    const snapshot = createSystemDialogContentConfigSnapshotInternalV1(Object.freeze({
      variant,
      port: port as SaveOverlayPortV1,
      labels: snapshotSaveLabelsV1(ownDataValueV1(input, "labels")),
      closeLabel,
      ...(evaluateGuard === undefined ? {} : { evaluateGuard }),
    }));
    systemDialogSavesConfigSnapshotsInternalV1.add(snapshot);
    return snapshot;
  } catch {
    throw new TypeError("ui.system_dialog_saves_config_invalid");
  }
}

function normalizeCatalogEntryV1(value: unknown): CatalogEntryRecordV1 {
  if (!isRecordV1(value)) throw new TypeError();
  const rootRequest = ownDataValueV1(value, "rootRequest");
  if (rootRequest !== "settings" && rootRequest !== "saves") throw new TypeError();
  const rendererComponent = ownDataValueV1(value, "rendererComponent");
  if (
    rendererComponent === null ||
    (typeof rendererComponent !== "object" && typeof rendererComponent !== "function")
  ) {
    throw new TypeError();
  }
  const accessibleName = ownDataValueV1(value, "accessibleName");
  if (typeof accessibleName !== "string" || accessibleName.length === 0) throw new TypeError();
  const requiredPortIds = denseOwnArraySnapshotV1(
    ownDataValueV1(value, "requiredPortIds"),
  ).map(parseModuleId);
  if (new Set(requiredPortIds).size !== requiredPortIds.length) throw new TypeError();
  const contentConfig = ownDataValueV1(value, "contentConfig");
  const contentConfigSnapshot = rootRequest === "settings"
    ? snapshotSystemDialogSettingsContentConfigInternalV1(
      contentConfig as SystemDialogSettingsContentConfigInternalV1,
    )
    : snapshotSystemDialogSavesContentConfigInternalV1(
      contentConfig as SystemDialogSavesContentConfigInternalV1,
    );
  return Object.freeze({
    rootRequest,
    rendererComponent,
    accessibleName,
    requiredPortIds: Object.freeze(requiredPortIds),
    contentConfigSnapshot,
  });
}

export function createSystemDialogRootCatalogSnapshotInternalV1(input: {
  readonly entries: readonly SystemDialogRootCatalogEntryInternalV1[];
  readonly portBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
}): SystemDialogRootCatalogInternalV1 {
  try {
    if (!isRecordV1(input)) throw new TypeError();
    const entriesInput = denseOwnArraySnapshotV1(ownDataValueV1(input, "entries"));
    const entries = new Map<SystemDialogRootRequestInternalV1, CatalogEntryRecordV1>();
    for (const value of entriesInput) {
      const entry = normalizeCatalogEntryV1(value);
      if (entries.has(entry.rootRequest)) throw new TypeError();
      entries.set(entry.rootRequest, entry);
    }
    const portsInput = denseOwnArraySnapshotV1(ownDataValueV1(input, "portBindings"));
    const ports = new Map<string, object | ((...args: never[]) => unknown)>();
    for (const value of portsInput) {
      if (!isRecordV1(value)) throw new TypeError();
      const portId = parseModuleId(ownDataValueV1(value, "portId"));
      const port = ownDataValueV1(value, "port");
      if (
        port === null ||
        (typeof port !== "object" && typeof port !== "function") ||
        ports.has(portId)
      ) {
        throw new TypeError();
      }
      ports.set(portId, port);
    }
    return Object.freeze({
      resolveRoot: (request: SystemDialogRootRequestInternalV1) => entries.get(request) ?? null,
      resolvePort: (portId: string) => ports.get(portId) ?? null,
    });
  } catch {
    throw new TypeError("ui.system_dialog_catalog_invalid");
  }
}

const preparingResultV1 = Object.freeze({
  kind: "preparing" as const,
  code: "system_dialog.preparation_started" as const,
});
const cancelledResultV1 = Object.freeze({
  kind: "applied" as const,
  code: "system_dialog.pending_replacement_cancelled" as const,
});
const alreadyRequestedResultV1 = Object.freeze({
  kind: "unchanged" as const,
  code: "system_dialog.already_requested" as const,
});
const disposedResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.disposed" as const,
});
const unavailableResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.renderer_unavailable" as const,
});
const missingRendererResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.renderer_missing" as const,
});
const rendererFaultResultV1 = Object.freeze({
  kind: "faulted" as const,
  code: "system_dialog.renderer_faulted" as const,
});
const transitionFaultResultV1 = Object.freeze({
  kind: "faulted" as const,
  code: "system_dialog.transition_faulted" as const,
});

function requestDefinitionV1(request: SystemDialogRootRequestInternalV1) {
  return request === "settings"
    ? systemDialogManagedContractInternalV1.definitions.settings
    : systemDialogManagedContractInternalV1.definitions.saves;
}

export function createSystemDialogManagedSessionInternalV1(input: {
  readonly runtime: ManagedSurfaceCoordinatorRuntimeV1;
  readonly catalog: SystemDialogRootCatalogInternalV1 | null;
}): SystemDialogManagedSessionInternalV1 {
  let runtime = input.runtime;
  let catalog = input.catalog;
  let disposed = false;
  let detached = false;
  let preparedRuntime: ManagedSurfaceCoordinatorRuntimeV1 | null = null;
  let activationGate: ManagedSurfaceFamilyActivationGateInternalV1 | null = null;
  const records = new Map<ManagedSurfaceInstanceIdV1, SystemDialogRootCandidateRecordInternalV1>();
  const listeners = new Set<() => void>();
  let mutationDepth = 0;
  let dirty = false;
  let unsubscribeCoordinator: (() => void) | null = null;

  const managedSnapshot = (): ManagedSurfacePublicationV1 =>
    runtime.coordinator.getSnapshot() as ManagedSurfacePublicationV1;
  const reconcileRecords = (): void => {
    const live = new Set(managedSnapshot().orderedInstances.map((item) => item.surfaceInstanceId));
    for (const id of records.keys()) if (!live.has(id)) records.delete(id);
  };
  const notify = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A package-internal observer cannot change an already committed lifecycle transition.
      }
    }
  };
  const onCoordinatorPublication = (): void => {
    reconcileRecords();
    dirty = true;
    if (detached || activationGate?.isOpen() === false) return;
    if (mutationDepth === 0) {
      dirty = false;
      notify();
    }
  };
  const subscribeCoordinator = (): void => {
    unsubscribeCoordinator = runtime.coordinator.subscribe(onCoordinatorPublication);
  };
  subscribeCoordinator();

  const mutate = <T>(operation: () => T, after?: (result: T) => void): T => {
    mutationDepth += 1;
    try {
      const result = operation();
      after?.(result);
      reconcileRecords();
      return result;
    } finally {
      mutationDepth -= 1;
      if (
        mutationDepth === 0 && dirty && !detached && activationGate?.isOpen() !== false
      ) {
        dirty = false;
        notify();
      }
    }
  };

  const systemRoots = () =>
    managedSnapshot().orderedInstances.filter(
      (instance) =>
        instance.definition.ownerId === systemDialogManagedContractInternalV1.resolvedOwnerIds[0] &&
        instance.parentInstanceId === null,
    );
  const recordFor = (instanceId: ManagedSurfaceInstanceIdV1 | undefined) =>
    instanceId === undefined ? undefined : records.get(instanceId);

  const preflight = (
    request: SystemDialogRootRequestInternalV1,
  ):
    | SystemDialogRootCandidateResolutionSnapshotInternalV1<unknown, unknown>
    | SystemDialogOpenResultV1 => {
    const currentCatalog = catalog;
    if (currentCatalog === null) return unavailableResultV1;
    let entry: SystemDialogResolvedRootCatalogEntryInternalV1 | null;
    try {
      entry = currentCatalog.resolveRoot(request);
    } catch {
      return rendererFaultResultV1;
    }
    if (entry === null || entry === undefined) return missingRendererResultV1;
    const bindings: SystemDialogRequiredPortBindingInternalV1[] = [];
    try {
      const configSnapshotAccepted = request === "settings"
        ? systemDialogSettingsConfigSnapshotsInternalV1.has(entry.contentConfigSnapshot)
        : systemDialogSavesConfigSnapshotsInternalV1.has(entry.contentConfigSnapshot);
      if (!configSnapshotAccepted) return rendererFaultResultV1;
      for (const rawPortId of entry.requiredPortIds) {
        const portId = parseModuleId(rawPortId);
        const port = currentCatalog.resolvePort(portId);
        if (port === null || port === undefined) {
          return Object.freeze({
            kind: "rejected" as const,
            code: "system_dialog.required_port_missing" as const,
            portId,
          });
        }
        bindings.push(Object.freeze({ portId, port }));
      }
      return createSystemDialogRootCandidateResolutionSnapshotInternalV1({
        rootRequest: request,
        rendererComponent: entry.rendererComponent,
        accessibleName: entry.accessibleName,
        requiredPortBindings: Object.freeze(bindings),
        contentConfigSnapshot: entry.contentConfigSnapshot,
      });
    } catch {
      return rendererFaultResultV1;
    }
  };

  const preparationResult = (
    operation: () => ReturnType<
      ManagedSurfaceCoordinatorRuntimeV1["coordinator"]["openTransientPrimary"]
    >,
    request: SystemDialogRootRequestInternalV1,
    resolution: SystemDialogRootCandidateResolutionSnapshotInternalV1<unknown, unknown>,
  ): SystemDialogOpenResultV1 => {
    const result = mutate(operation, (prepared) => {
      if (
        prepared.receipt.kind !== "applied" ||
        prepared.receipt.code !== "surface.preparation_started" ||
        prepared.receipt.surfaceInstanceId === undefined ||
        prepared.readiness === null
      ) {
        return;
      }
      records.set(
        prepared.receipt.surfaceInstanceId,
        Object.freeze({
          surfaceInstanceId: prepared.receipt.surfaceInstanceId,
          rootRequest: request,
          resolution,
          readiness: prepared.readiness,
        }),
      );
    });
    if (
      result.receipt.kind !== "applied" ||
      result.receipt.code !== "surface.preparation_started" ||
      result.receipt.surfaceInstanceId === undefined ||
      result.readiness === null
    ) {
      return transitionFaultResultV1;
    }
    return preparingResultV1;
  };

  const session: SystemDialogManagedSessionInternalV1 = {
    getManagedSnapshotInternalV1: managedSnapshot,
    getRootCandidateRecordsInternalV1() {
      reconcileRecords();
      return Object.freeze([...records.values()]);
    },
    subscribeInternalV1(listener) {
      if (disposed) return () => undefined;
      listeners.add(listener);
      let subscribed = true;
      return (): void => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
    openRootInternalV1(request) {
      if (
        disposed || detached || activationGate?.isOpen() === false || !runtime.isIngressOpen()
      ) return disposedResultV1;
      if (catalog === null) return unavailableResultV1;
      reconcileRecords();
      const roots = systemRoots();
      const pending = roots.find((instance) => instance.readiness.kind === "preparing");
      const active = roots.find((instance) => instance.readiness.kind === "ready");
      const pendingRecord = recordFor(pending?.surfaceInstanceId);
      const activeRecord = recordFor(active?.surfaceInstanceId);
      if (pendingRecord?.rootRequest === request) return alreadyRequestedResultV1;
      if (pending === undefined && activeRecord?.rootRequest === request) {
        return alreadyRequestedResultV1;
      }
      if (
        pending !== undefined &&
        pending.readiness.kind === "preparing" &&
        pending.readiness.transition === "primary_replacement" &&
        active !== undefined &&
        activeRecord?.rootRequest === request
      ) {
        const retained = runtime.coordinator.getHandle(active.surfaceInstanceId);
        if (retained === null || pendingRecord === undefined) return transitionFaultResultV1;
        const receipt = mutate(() =>
          runtime.coordinator.cancelTransientPrimaryReplacement({
            retained,
            pending: pendingRecord.readiness.evidence,
          })
        );
        return receipt.kind === "applied" && receipt.code === "surface.preparation_cancelled"
          ? cancelledResultV1
          : transitionFaultResultV1;
      }
      const admitted = preflight(request);
      if ("kind" in admitted) return admitted;
      const definition = requestDefinitionV1(request);
      if (active === undefined) {
        if (pending !== undefined) {
          if (pendingRecord === undefined) return transitionFaultResultV1;
          return preparationResult(
            () =>
              runtime.coordinator.supersedeTransientInitialPreparation({
                definition,
                semanticOccurrenceId: null,
                expected: pendingRecord.readiness.evidence,
              }),
            request,
            admitted,
          );
        }
        return preparationResult(
          () =>
            runtime.coordinator.openTransientPrimary({
              definition,
              semanticOccurrenceId: null,
            }),
          request,
          admitted,
        );
      }
      const retained = runtime.coordinator.getHandle(active.surfaceInstanceId);
      if (retained === null) return transitionFaultResultV1;
      return preparationResult(
        () =>
          runtime.coordinator.replaceTransientPrimary({
            definition,
            semanticOccurrenceId: null,
            expected: retained,
          }),
        request,
        admitted,
      );
    },
    readyCandidateInternalV1(surfaceInstanceId) {
      const record = records.get(surfaceInstanceId);
      if (record === undefined) {
        const snapshot = managedSnapshot();
        return Object.freeze({
          kind: "stale" as const,
          code: "surface.stale_readiness" as const,
          beforeTopologyRevision: snapshot.topologyRevision,
          afterTopologyRevision: snapshot.topologyRevision,
          surfaceInstanceId,
        });
      }
      return mutate(() => record.readiness.ready()).receipt;
    },
    failCandidateInternalV1(surfaceInstanceId) {
      const record = records.get(surfaceInstanceId);
      if (record === undefined) {
        const snapshot = managedSnapshot();
        return Object.freeze({
          kind: "stale" as const,
          code: "surface.stale_readiness" as const,
          beforeTopologyRevision: snapshot.topologyRevision,
          afterTopologyRevision: snapshot.topologyRevision,
          surfaceInstanceId,
        });
      }
      return mutate(() => record.readiness.fail());
    },
    setCatalogInternalV1(nextCatalog) {
      if (disposed) throw new TypeError("ui.system_dialog_session_disposed");
      catalog = nextCatalog;
    },
    detachRuntimeInternalV1() {
      if (disposed || detached) return;
      detached = true;
      preparedRuntime = null;
      activationGate = null;
      unsubscribeCoordinator?.();
      unsubscribeCoordinator = null;
      records.clear();
      dirty = true;
    },
    prepareRuntimeAttachmentInternalV1(nextRuntime, nextActivationGate) {
      if (disposed) throw new TypeError("ui.system_dialog_session_disposed");
      if (!detached) throw new TypeError("ui.system_dialog_runtime_already_attached");
      if (preparedRuntime !== null) {
        throw new TypeError("ui.system_dialog_runtime_attachment_already_prepared");
      }
      runtime = nextRuntime;
      preparedRuntime = nextRuntime;
      activationGate = nextActivationGate;
      subscribeCoordinator();
      dirty = true;
    },
    activateRuntimeAttachmentInternalV1() {
      if (disposed) throw new TypeError("ui.system_dialog_session_disposed");
      const attachmentRuntime = preparedRuntime;
      if (!detached || attachmentRuntime === null || runtime !== attachmentRuntime) {
        throw new TypeError("ui.system_dialog_runtime_attachment_not_prepared");
      }
      preparedRuntime = null;
      detached = false;
      return (): void => {
        if (
          disposed || detached || runtime !== attachmentRuntime ||
          activationGate?.isOpen() !== true || !dirty
        ) return;
        dirty = false;
        notify();
      };
    },
    abortRuntimeAttachmentInternalV1() {
      if (disposed) return;
      detached = true;
      preparedRuntime = null;
      activationGate = null;
      unsubscribeCoordinator?.();
      unsubscribeCoordinator = null;
      records.clear();
      dirty = false;
    },
    disposeInternalV1() {
      if (disposed) return;
      disposed = true;
      detached = true;
      preparedRuntime = null;
      activationGate = null;
      unsubscribeCoordinator?.();
      unsubscribeCoordinator = null;
      records.clear();
      catalog = null;
      listeners.clear();
    },
  };
  return Object.freeze(session);
}

const systemDialogSessionInternalsV1 = new WeakMap<
  SystemDialogSessionV1,
  SystemDialogManagedSessionInternalV1
>();

export function createSystemDialogSessionFacadeInternalV1(
  internal: SystemDialogManagedSessionInternalV1,
): SystemDialogSessionV1 {
  const facade = Object.freeze({}) as SystemDialogSessionV1;
  systemDialogSessionInternalsV1.set(facade, internal);
  return facade;
}

export function resolveSystemDialogSessionInternalV1(
  session: SystemDialogSessionV1,
): SystemDialogManagedSessionInternalV1 {
  const internal = systemDialogSessionInternalsV1.get(session);
  if (internal === undefined) throw new TypeError("ui.system_dialog_managed_session_required");
  return internal;
}
