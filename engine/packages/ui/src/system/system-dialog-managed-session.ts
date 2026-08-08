// SPDX-License-Identifier: MIT
import { parseModuleId } from "@sillymaker/base";
import type { ReactNode } from "react";

import type {
  ManagedSurfaceDismissKindV1,
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
  createSystemDialogConfirmationCandidateResolutionSnapshotInternalV1,
  createSystemDialogRootCandidateResolutionSnapshotInternalV1,
  normalizeSystemDialogConfirmationInvocationInternalV1,
  systemDialogManagedContractInternalV1,
  type SystemDialogConfirmationCandidateResolutionSnapshotInternalV1,
  type SystemDialogConfirmationInvocationInternalV1,
  type SystemDialogContentConfigSnapshotInternalV1,
  type SystemDialogOpenResultV1,
  type SystemDialogRequiredPortBindingInternalV1,
  type SystemDialogRootCandidateResolutionSnapshotInternalV1,
  type SystemDialogRootRequestInternalV1,
  type SystemDialogSessionV1,
} from "./system-dialog-managed-contract.ts";
import { createSystemDialogContentConfigSnapshotInternalV1 } from "./system-dialog-managed-contract.ts";

const promiseThenInternalV1 = Promise.prototype.then;

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

export interface SystemDialogConfirmationCatalogEntryInternalV1
  extends SystemDialogRootCatalogEntryBaseInternalV1 {}

export interface SystemDialogResolvedConfirmationCatalogEntryInternalV1
  extends SystemDialogRootCatalogEntryBaseInternalV1 {}

export interface SystemDialogRootCatalogInternalV1 {
  resolveRoot(
    request: SystemDialogRootRequestInternalV1,
  ): SystemDialogResolvedRootCatalogEntryInternalV1 | null;
  resolveConfirmation?(
    invocation: SystemDialogConfirmationInvocationInternalV1,
  ): SystemDialogResolvedConfirmationCatalogEntryInternalV1 | null;
  resolvePort(portId: string): object | ((...args: never[]) => unknown) | null;
}

export type SystemDialogConfirmationOperationOutcomeInternalV1 =
  | {
    readonly kind: "retain_root";
    readonly result: unknown;
  }
  | {
    readonly kind: "successor";
  };

export type SystemDialogConfirmationResultDeliveryInternalV1 =
  | {
    readonly kind: "settled";
    readonly result: unknown;
  }
  | {
    readonly kind: "faulted";
    readonly error: unknown;
  };

export interface SystemDialogConfirmationOperationBindingInternalV1 {
  dispatch(
    invocation: SystemDialogConfirmationInvocationInternalV1,
  ): Promise<SystemDialogConfirmationOperationOutcomeInternalV1>;
  resultSink(delivery: SystemDialogConfirmationResultDeliveryInternalV1): void;
  finalizeExactRoot(): void;
}

export type SystemDialogConfirmationOpenResultInternalV1 =
  | {
    readonly kind: "preparing";
    readonly code: "system_dialog.confirmation_preparation_started";
    readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  }
  | {
    readonly kind: "unchanged";
    readonly code: "system_dialog.confirmation_already_requested";
  }
  | {
    readonly kind: "rejected";
    readonly code:
      | "system_dialog.confirmation_parent_stale"
      | "system_dialog.confirmation_invocation_invalid"
      | "system_dialog.confirmation_renderer_unavailable"
      | "system_dialog.confirmation_renderer_missing"
      | "system_dialog.confirmation_required_port_missing"
      | "system_dialog.confirmation_operation_binding_invalid"
      | "system_dialog.disposed";
    readonly portId?: string;
  }
  | {
    readonly kind: "faulted";
    readonly code:
      | "system_dialog.confirmation_renderer_faulted"
      | "system_dialog.confirmation_transition_faulted";
  };

export type SystemDialogConfirmationIntentResultInternalV1 =
  | {
    readonly kind: "applied";
    readonly code:
      | "system_dialog.confirmation_closed"
      | "system_dialog.confirmation_operation_dispatched";
  }
  | {
    readonly kind: "unchanged";
    readonly code: "system_dialog.confirmation_operation_already_dispatched";
  }
  | {
    readonly kind: "rejected";
    readonly code:
      | "system_dialog.confirmation_stale"
      | "system_dialog.confirmation_not_ready"
      | "system_dialog.confirmation_dismiss_locked";
  }
  | {
    readonly kind: "faulted";
    readonly code: "system_dialog.confirmation_transition_faulted";
  };

export interface SystemDialogConfirmationControllerInternalV1 {
  dispatchOnceInternalV1(): SystemDialogConfirmationIntentResultInternalV1;
  cancelInternalV1(
    dismissKind: ManagedSurfaceDismissKindV1,
  ): SystemDialogConfirmationIntentResultInternalV1;
}

export interface SystemDialogSavesLifecycleIntentsInternalV1 {
  requestConfirmationInternalV1(input: {
    readonly invocation: SystemDialogConfirmationInvocationInternalV1;
    readonly operationBinding: SystemDialogConfirmationOperationBindingInternalV1;
  }): SystemDialogConfirmationOpenResultInternalV1;
}

export interface SystemDialogRootCandidateRecordInternalV1 {
  readonly kind: "root";
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly rootRequest: SystemDialogRootRequestInternalV1;
  readonly resolution: SystemDialogRootCandidateResolutionSnapshotInternalV1<unknown, unknown>;
  readonly readiness: ManagedSurfaceReadinessAdapterV1;
  readonly lifecycleIntents: SystemDialogSavesLifecycleIntentsInternalV1 | null;
}

export interface SystemDialogConfirmationCandidateRecordInternalV1 {
  readonly kind: "confirmation";
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly parentSurfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly invocation: SystemDialogConfirmationInvocationInternalV1;
  readonly resolution: SystemDialogConfirmationCandidateResolutionSnapshotInternalV1<unknown>;
  readonly readiness: ManagedSurfaceReadinessAdapterV1;
  readonly operationBinding: SystemDialogConfirmationOperationBindingInternalV1;
  readonly controller: SystemDialogConfirmationControllerInternalV1;
}

export interface SystemDialogRootHostRenderEntryInternalV1 {
  readonly kind: "root";
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly phase: ManagedSurfacePublicationV1["orderedInstances"][number]["phase"];
  readonly rootRequest: SystemDialogRootRequestInternalV1;
  readonly resolution: SystemDialogRootCandidateResolutionSnapshotInternalV1<unknown, unknown>;
  readonly lifecycleIntents: SystemDialogSavesLifecycleIntentsInternalV1 | null;
}

export interface SystemDialogConfirmationHostRenderEntryInternalV1 {
  readonly kind: "confirmation";
  readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly parentSurfaceInstanceId: ManagedSurfaceInstanceIdV1;
  readonly phase: ManagedSurfacePublicationV1["orderedInstances"][number]["phase"];
  readonly invocation: SystemDialogConfirmationInvocationInternalV1;
  readonly resolution: SystemDialogConfirmationCandidateResolutionSnapshotInternalV1<unknown>;
  readonly controller: SystemDialogConfirmationControllerInternalV1;
}

export type SystemDialogHostRenderEntryInternalV1 =
  | SystemDialogRootHostRenderEntryInternalV1
  | SystemDialogConfirmationHostRenderEntryInternalV1;

export interface SystemDialogHostRenderSnapshotInternalV1 {
  readonly publication: ManagedSurfacePublicationV1;
  readonly entries: readonly SystemDialogHostRenderEntryInternalV1[];
}

/** @internal One generation of the single logical React Host attachment. */
export interface SystemDialogHostAttachmentInternalV1 {
  isAcknowledgmentOpen(): boolean;
  updateCatalogInternalV1(catalog: SystemDialogRootCatalogInternalV1 | null): void;
  readyCandidateInternalV1(
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): ManagedSurfaceTransitionReceiptV1;
  failCandidateInternalV1(
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
    error?: unknown,
  ): ManagedSurfaceTransitionReceiptV1;
  release(): void;
}

export interface SystemDialogManagedSessionInternalV1
  extends ManagedSurfaceFamilyRuntimeAdapterInternalV1 {
  getManagedSnapshotInternalV1(): ManagedSurfacePublicationV1;
  getRootCandidateRecordsInternalV1(): readonly SystemDialogRootCandidateRecordInternalV1[];
  getHostRenderSnapshotInternalV1(): SystemDialogHostRenderSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
  openRootInternalV1(request: SystemDialogRootRequestInternalV1): SystemDialogOpenResultV1;
  attachHostInternalV1(input: {
    readonly hostIdentity: object;
    readonly portalContainer: object;
    readonly catalog: SystemDialogRootCatalogInternalV1 | null;
  }): SystemDialogHostAttachmentInternalV1;
  isRuntimeAttachmentCurrentInternalV1(
    expectedRuntime: ManagedSurfaceCoordinatorRuntimeV1,
  ): boolean;
  sealTerminalDisposalInternalV1(): void;
  isTerminalDisposalInternalV1(): boolean;
  disposeInternalV1(): void;
}

interface CatalogEntryRecordV1 extends SystemDialogResolvedRootCatalogEntryInternalV1 {}

const systemDialogSettingsConfigSnapshotsInternalV1 = new WeakSet<object>();
const systemDialogSavesConfigSnapshotsInternalV1 = new WeakSet<object>();
const systemDialogConfirmationCatalogEntriesInternalV1 = new WeakSet<object>();

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

function normalizeConfirmationCatalogEntryV1(
  value: unknown,
): SystemDialogResolvedConfirmationCatalogEntryInternalV1 {
  if (!isRecordV1(value)) throw new TypeError();
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
  const entry = Object.freeze({
    rendererComponent,
    accessibleName,
    requiredPortIds: Object.freeze(requiredPortIds),
  });
  systemDialogConfirmationCatalogEntriesInternalV1.add(entry);
  return entry;
}

export function createSystemDialogRootCatalogSnapshotInternalV1(input: {
  readonly entries: readonly SystemDialogRootCatalogEntryInternalV1[];
  readonly portBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
  readonly confirmationEntry?: SystemDialogConfirmationCatalogEntryInternalV1 | null;
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
    const confirmationDescriptor = Object.getOwnPropertyDescriptor(input, "confirmationEntry");
    if (confirmationDescriptor !== undefined && !("value" in confirmationDescriptor)) {
      throw new TypeError();
    }
    const confirmationEntry = confirmationDescriptor === undefined ||
        confirmationDescriptor.value === null
      ? null
      : normalizeConfirmationCatalogEntryV1(confirmationDescriptor.value);
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
      resolveConfirmation: (_invocation: SystemDialogConfirmationInvocationInternalV1) =>
        confirmationEntry,
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

const confirmationAlreadyRequestedResultV1 = Object.freeze({
  kind: "unchanged" as const,
  code: "system_dialog.confirmation_already_requested" as const,
});
const confirmationParentStaleResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.confirmation_parent_stale" as const,
});
const confirmationInvocationInvalidResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.confirmation_invocation_invalid" as const,
});
const confirmationRendererUnavailableResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.confirmation_renderer_unavailable" as const,
});
const confirmationRendererMissingResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.confirmation_renderer_missing" as const,
});
const confirmationOperationBindingInvalidResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.confirmation_operation_binding_invalid" as const,
});
const confirmationRendererFaultResultV1 = Object.freeze({
  kind: "faulted" as const,
  code: "system_dialog.confirmation_renderer_faulted" as const,
});
const confirmationTransitionFaultResultV1 = Object.freeze({
  kind: "faulted" as const,
  code: "system_dialog.confirmation_transition_faulted" as const,
});
const confirmationStaleResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.confirmation_stale" as const,
});
const confirmationNotReadyResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.confirmation_not_ready" as const,
});
const confirmationDispatchedResultV1 = Object.freeze({
  kind: "applied" as const,
  code: "system_dialog.confirmation_operation_dispatched" as const,
});
const confirmationAlreadyDispatchedResultV1 = Object.freeze({
  kind: "unchanged" as const,
  code: "system_dialog.confirmation_operation_already_dispatched" as const,
});
const confirmationClosedResultV1 = Object.freeze({
  kind: "applied" as const,
  code: "system_dialog.confirmation_closed" as const,
});
const confirmationDismissLockedResultV1 = Object.freeze({
  kind: "rejected" as const,
  code: "system_dialog.confirmation_dismiss_locked" as const,
});

function requestDefinitionV1(request: SystemDialogRootRequestInternalV1) {
  return request === "settings"
    ? systemDialogManagedContractInternalV1.definitions.settings
    : systemDialogManagedContractInternalV1.definitions.saves;
}

export function createSystemDialogManagedSessionInternalV1(input: {
  readonly runtime: ManagedSurfaceCoordinatorRuntimeV1;
  readonly reportFailure?: (code: string, error: unknown) => void;
}): SystemDialogManagedSessionInternalV1 {
  let runtime = input.runtime;
  let catalog: SystemDialogRootCatalogInternalV1 | null = null;
  let disposed = false;
  let terminalDisposal = false;
  let detached = false;
  let preparedRuntime: ManagedSurfaceCoordinatorRuntimeV1 | null = null;
  let activationGate: ManagedSurfaceFamilyActivationGateInternalV1 | null = null;
  type CandidateRecordV1 =
    | SystemDialogRootCandidateRecordInternalV1
    | SystemDialogConfirmationCandidateRecordInternalV1;
  const records = new Map<ManagedSurfaceInstanceIdV1, CandidateRecordV1>();
  const confirmationResultGenerations = new Map<ManagedSurfaceInstanceIdV1, object>();
  const listeners = new Set<() => void>();
  let mutationDepth = 0;
  let dirty = false;
  let unsubscribeCoordinator: (() => void) | null = null;
  let hostLease: {
    readonly hostIdentity: object;
    readonly portalContainer: object;
    open: boolean;
  } | null = null;
  let hostRenderSourcePublication: ManagedSurfacePublicationV1 | null = null;
  let hostRenderSnapshot: SystemDialogHostRenderSnapshotInternalV1 | null = null;
  const reportFailure = (code: string, error: unknown): void => {
    try {
      input.reportFailure?.(code, error);
    } catch {
      // Candidate diagnostics cannot replace the readiness transition.
    }
  };
  const observeSinkCompletion = (code: string, value: unknown): void => {
    if (
      value === null ||
      (typeof value !== "object" && typeof value !== "function")
    ) return;
    try {
      void promiseThenInternalV1.call(
        value,
        undefined,
        (error) => reportFailure(code, error),
      );
    } catch (error) {
      reportFailure(code, error);
    }
  };

  const managedSnapshot = (): ManagedSurfacePublicationV1 =>
    runtime.coordinator.getSnapshot() as ManagedSurfacePublicationV1;
  const invalidateHostRenderSnapshot = (): void => {
    hostRenderSourcePublication = null;
    hostRenderSnapshot = null;
  };
  const reconcileRecords = (): void => {
    const live = new Set(managedSnapshot().orderedInstances.map((item) => item.surfaceInstanceId));
    let changed = false;
    for (const id of records.keys()) {
      if (!live.has(id)) {
        records.delete(id);
        changed = true;
      }
    }
    for (const parentId of confirmationResultGenerations.keys()) {
      if (!live.has(parentId)) confirmationResultGenerations.delete(parentId);
    }
    if (changed) invalidateHostRenderSnapshot();
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
  const rootRecordFor = (instanceId: ManagedSurfaceInstanceIdV1 | undefined) => {
    if (instanceId === undefined) return undefined;
    const record = records.get(instanceId);
    return record?.kind === "root" ? record : undefined;
  };

  const staleCandidateReceipt = (
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): ManagedSurfaceTransitionReceiptV1 => {
    const snapshot = managedSnapshot();
    return Object.freeze({
      kind: "stale" as const,
      code: "surface.stale_readiness" as const,
      beforeTopologyRevision: snapshot.topologyRevision,
      afterTopologyRevision: snapshot.topologyRevision,
      surfaceInstanceId,
    });
  };

  const readyCandidate = (
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): ManagedSurfaceTransitionReceiptV1 => {
    const record = records.get(surfaceInstanceId);
    return record === undefined
      ? staleCandidateReceipt(surfaceInstanceId)
      : mutate(() => record.readiness.ready()).receipt;
  };

  const failCandidate = (
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): ManagedSurfaceTransitionReceiptV1 => {
    const record = records.get(surfaceInstanceId);
    return record === undefined
      ? staleCandidateReceipt(surfaceInstanceId)
      : mutate(() => record.readiness.fail());
  };

  const closeSystemOwnerAfterHostDetach = (): void => {
    if (
      disposed || detached || activationGate?.isOpen() === false || !runtime.isIngressOpen()
    ) return;
    const ownerId = systemDialogManagedContractInternalV1.resolvedOwnerIds[0]!;
    const snapshot = managedSnapshot();
    if (!snapshot.orderedInstances.some((instance) => instance.definition.ownerId === ownerId)) {
      return;
    }
    mutate(() =>
      runtime.coordinator.closeOwner(Object.freeze({
        applicationEpoch: snapshot.applicationEpoch,
        topologyRevision: snapshot.topologyRevision,
        ownerId,
      }))
    );
  };

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

  const confirmationPreflight = (
    invocation: SystemDialogConfirmationInvocationInternalV1,
  ):
    | SystemDialogConfirmationCandidateResolutionSnapshotInternalV1<unknown>
    | SystemDialogConfirmationOpenResultInternalV1 => {
    const currentCatalog = catalog;
    if (currentCatalog === null || currentCatalog.resolveConfirmation === undefined) {
      return confirmationRendererUnavailableResultV1;
    }
    let entry: SystemDialogResolvedConfirmationCatalogEntryInternalV1 | null;
    try {
      entry = currentCatalog.resolveConfirmation(invocation);
    } catch {
      return confirmationRendererFaultResultV1;
    }
    if (entry === null || entry === undefined) return confirmationRendererMissingResultV1;
    const bindings: SystemDialogRequiredPortBindingInternalV1[] = [];
    try {
      if (!systemDialogConfirmationCatalogEntriesInternalV1.has(entry)) {
        return confirmationRendererFaultResultV1;
      }
      for (const rawPortId of entry.requiredPortIds) {
        const portId = parseModuleId(rawPortId);
        const port = currentCatalog.resolvePort(portId);
        if (port === null || port === undefined) {
          return Object.freeze({
            kind: "rejected" as const,
            code: "system_dialog.confirmation_required_port_missing" as const,
            portId,
          });
        }
        bindings.push(Object.freeze({ portId, port }));
      }
      return createSystemDialogConfirmationCandidateResolutionSnapshotInternalV1({
        invocation,
        rendererComponent: entry.rendererComponent,
        accessibleName: entry.accessibleName,
        requiredPortBindings: Object.freeze(bindings),
      });
    } catch {
      return confirmationRendererFaultResultV1;
    }
  };

  const normalizeOperationBinding = (
    value: unknown,
  ): SystemDialogConfirmationOperationBindingInternalV1 | null => {
    try {
      if (!isRecordV1(value) || !Object.isFrozen(value)) return null;
      const keys = Reflect.ownKeys(value);
      if (
        keys.length !== 3 || !keys.includes("dispatch") || !keys.includes("resultSink") ||
        !keys.includes("finalizeExactRoot")
      ) return null;
      const dispatchDescriptor = Object.getOwnPropertyDescriptor(value, "dispatch");
      const resultSinkDescriptor = Object.getOwnPropertyDescriptor(value, "resultSink");
      const finalizerDescriptor = Object.getOwnPropertyDescriptor(value, "finalizeExactRoot");
      if (
        dispatchDescriptor === undefined || !("value" in dispatchDescriptor) ||
        typeof dispatchDescriptor.value !== "function" ||
        resultSinkDescriptor === undefined || !("value" in resultSinkDescriptor) ||
        typeof resultSinkDescriptor.value !== "function" ||
        finalizerDescriptor === undefined || !("value" in finalizerDescriptor) ||
        typeof finalizerDescriptor.value !== "function"
      ) return null;
      return Object.freeze({
        dispatch: dispatchDescriptor
          .value as SystemDialogConfirmationOperationBindingInternalV1["dispatch"],
        resultSink: resultSinkDescriptor
          .value as SystemDialogConfirmationOperationBindingInternalV1["resultSink"],
        finalizeExactRoot: finalizerDescriptor
          .value as SystemDialogConfirmationOperationBindingInternalV1["finalizeExactRoot"],
      });
    } catch {
      return null;
    }
  };

  let requestConfirmation: (
    parentSurfaceInstanceId: ManagedSurfaceInstanceIdV1,
    request: {
      readonly invocation: SystemDialogConfirmationInvocationInternalV1;
      readonly operationBinding: SystemDialogConfirmationOperationBindingInternalV1;
    },
  ) => SystemDialogConfirmationOpenResultInternalV1;

  const bindSavesLifecycleIntents = (
    parentSurfaceInstanceId: ManagedSurfaceInstanceIdV1,
  ): SystemDialogSavesLifecycleIntentsInternalV1 =>
    Object.freeze({
      requestConfirmationInternalV1: (request: {
        readonly invocation: SystemDialogConfirmationInvocationInternalV1;
        readonly operationBinding: SystemDialogConfirmationOperationBindingInternalV1;
      }) => requestConfirmation(parentSurfaceInstanceId, request),
    });

  const preparationResult = (
    operation: () => ReturnType<
      ManagedSurfaceCoordinatorRuntimeV1["coordinator"]["openTransientPrimary"]
    >,
    request: SystemDialogRootRequestInternalV1,
    resolution: SystemDialogRootCandidateResolutionSnapshotInternalV1<unknown, unknown>,
  ): SystemDialogOpenResultV1 => {
    const candidateRuntime = runtime;
    const candidateHostLease = hostLease;
    let preparedRecord: SystemDialogRootCandidateRecordInternalV1 | null = null;
    const result = mutate(operation, (prepared) => {
      if (
        prepared.receipt.kind !== "applied" ||
        prepared.receipt.code !== "surface.preparation_started" ||
        prepared.receipt.surfaceInstanceId === undefined ||
        prepared.readiness === null
      ) {
        return;
      }
      preparedRecord = Object.freeze({
        kind: "root" as const,
        surfaceInstanceId: prepared.receipt.surfaceInstanceId,
        rootRequest: request,
        resolution,
        readiness: prepared.readiness,
        lifecycleIntents: request === "saves"
          ? bindSavesLifecycleIntents(prepared.receipt.surfaceInstanceId)
          : null,
      });
      records.set(prepared.receipt.surfaceInstanceId, preparedRecord);
      invalidateHostRenderSnapshot();
    });
    if (
      result.receipt.kind !== "applied" ||
      result.receipt.code !== "surface.preparation_started" ||
      result.receipt.surfaceInstanceId === undefined ||
      result.readiness === null
    ) {
      return transitionFaultResultV1;
    }
    const current = managedSnapshot().orderedInstances.find((instance) =>
      instance.surfaceInstanceId === result.receipt.surfaceInstanceId &&
      instance.readiness.kind === "preparing"
    );
    if (
      disposed || detached || activationGate?.isOpen() === false ||
      !candidateRuntime.isIngressOpen() || runtime !== candidateRuntime ||
      hostLease !== candidateHostLease || candidateHostLease?.open !== true ||
      current === undefined || preparedRecord === null ||
      records.get(result.receipt.surfaceInstanceId) !== preparedRecord
    ) return transitionFaultResultV1;
    return preparingResultV1;
  };

  const currentExactConfirmation = (
    record: SystemDialogConfirmationCandidateRecordInternalV1,
    expectedRuntime: ManagedSurfaceCoordinatorRuntimeV1,
    requireReady: boolean,
  ) => {
    if (
      disposed || detached || hostLease?.open !== true || !expectedRuntime.isIngressOpen() ||
      runtime !== expectedRuntime || records.get(record.surfaceInstanceId) !== record
    ) return null;
    const publication = expectedRuntime.coordinator.getSnapshot();
    const child = publication.orderedInstances.find((instance) =>
      instance.surfaceInstanceId === record.surfaceInstanceId &&
      instance.parentInstanceId === record.parentSurfaceInstanceId &&
      instance.definition.definitionId ===
        systemDialogManagedContractInternalV1.definitions.confirmation.definitionId &&
      (!requireReady || instance.readiness.kind === "ready")
    );
    const parent = publication.orderedInstances.find((instance) =>
      instance.surfaceInstanceId === record.parentSurfaceInstanceId &&
      instance.parentInstanceId === null &&
      instance.definition.definitionId ===
        systemDialogManagedContractInternalV1.definitions.saves.definitionId &&
      instance.readiness.kind === "ready"
    );
    return child === undefined || parent === undefined ? null : Object.freeze({ child, parent });
  };

  const exactRootSurvives = (
    parentSurfaceInstanceId: ManagedSurfaceInstanceIdV1,
    parentRecord: SystemDialogRootCandidateRecordInternalV1,
    expectedRuntime: ManagedSurfaceCoordinatorRuntimeV1,
  ): boolean => {
    if (
      disposed || detached || hostLease?.open !== true || !expectedRuntime.isIngressOpen() ||
      activationGate?.isOpen() === false || runtime !== expectedRuntime ||
      records.get(parentSurfaceInstanceId) !== parentRecord
    ) return false;
    return expectedRuntime.coordinator.getSnapshot().orderedInstances.some((instance) =>
      instance.surfaceInstanceId === parentSurfaceInstanceId &&
      instance.parentInstanceId === null &&
      instance.definition.definitionId ===
        systemDialogManagedContractInternalV1.definitions.saves.definitionId &&
      instance.readiness.kind === "ready"
    );
  };

  const deliverConfirmationResult = (
    record: SystemDialogConfirmationCandidateRecordInternalV1,
    parentRecord: SystemDialogRootCandidateRecordInternalV1,
    resultGeneration: object,
    expectedRuntime: ManagedSurfaceCoordinatorRuntimeV1,
    delivery: SystemDialogConfirmationResultDeliveryInternalV1,
  ): void => {
    if (currentExactConfirmation(record, expectedRuntime, true) === null) return;
    const currentHandle = expectedRuntime.coordinator.getHandle(record.surfaceInstanceId);
    if (currentHandle === null) return;
    const receipt = mutate(() => expectedRuntime.coordinator.closeExpected(currentHandle));
    if (receipt.kind !== "applied" || receipt.code !== "surface.closed") return;
    if (
      !exactRootSurvives(record.parentSurfaceInstanceId, parentRecord, expectedRuntime) ||
      confirmationResultGenerations.get(record.parentSurfaceInstanceId) !== resultGeneration
    ) return;
    try {
      const sinkCompletion = record.operationBinding.resultSink(Object.freeze(delivery)) as unknown;
      observeSinkCompletion(
        "ui.system_dialog_confirmation_result_sink_failed",
        sinkCompletion,
      );
    } catch (error) {
      reportFailure("ui.system_dialog_confirmation_result_sink_failed", error);
    }
  };

  const finalizeConfirmationOperation = (
    record: SystemDialogConfirmationCandidateRecordInternalV1,
    parentRecord: SystemDialogRootCandidateRecordInternalV1,
    expectedRuntime: ManagedSurfaceCoordinatorRuntimeV1,
  ): void => {
    if (!exactRootSurvives(record.parentSurfaceInstanceId, parentRecord, expectedRuntime)) return;
    try {
      const sinkCompletion = record.operationBinding.finalizeExactRoot() as unknown;
      observeSinkCompletion(
        "ui.system_dialog_confirmation_finalization_sink_failed",
        sinkCompletion,
      );
    } catch (error) {
      reportFailure("ui.system_dialog_confirmation_finalization_sink_failed", error);
    }
  };

  const createConfirmationRecord = (candidateInput: {
    readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
    readonly parentSurfaceInstanceId: ManagedSurfaceInstanceIdV1;
    readonly invocation: SystemDialogConfirmationInvocationInternalV1;
    readonly resolution: SystemDialogConfirmationCandidateResolutionSnapshotInternalV1<unknown>;
    readonly readiness: ManagedSurfaceReadinessAdapterV1;
    readonly operationBinding: SystemDialogConfirmationOperationBindingInternalV1;
    readonly candidateRuntime: ManagedSurfaceCoordinatorRuntimeV1;
    readonly parentRecord: SystemDialogRootCandidateRecordInternalV1;
    readonly resultGeneration: object;
  }): SystemDialogConfirmationCandidateRecordInternalV1 => {
    let dispatched = false;
    let settled = false;
    let record!: SystemDialogConfirmationCandidateRecordInternalV1;
    const settle = (
      delivery: SystemDialogConfirmationResultDeliveryInternalV1 | null,
    ): void => {
      if (settled) return;
      settled = true;
      try {
        if (delivery !== null) {
          deliverConfirmationResult(
            record,
            candidateInput.parentRecord,
            candidateInput.resultGeneration,
            candidateInput.candidateRuntime,
            delivery,
          );
        }
      } catch (error) {
        reportFailure("ui.system_dialog_confirmation_completion_failed", error);
      } finally {
        finalizeConfirmationOperation(
          record,
          candidateInput.parentRecord,
          candidateInput.candidateRuntime,
        );
      }
    };
    const settleFault = (error: unknown): void => {
      settle(Object.freeze({ kind: "faulted" as const, error }));
    };
    const settleOutcome = (outcome: SystemDialogConfirmationOperationOutcomeInternalV1): void => {
      if (settled) return;
      try {
        if (!isRecordV1(outcome)) throw new TypeError();
        const kind = ownDataValueV1(outcome, "kind");
        const keys = Reflect.ownKeys(outcome);
        if (kind === "successor") {
          if (
            keys.length !== 1 || keys[0] !== "kind" || candidateInput.invocation.kind === "clear"
          ) {
            throw new TypeError();
          }
          settle(null);
          return;
        }
        if (
          kind !== "retain_root" || keys.length !== 2 || !keys.includes("kind") ||
          !keys.includes("result")
        ) throw new TypeError();
        const result = ownDataValueV1(outcome, "result");
        settle(Object.freeze({ kind: "settled" as const, result }));
      } catch {
        settleFault(new TypeError("ui.system_dialog_confirmation_operation_outcome_invalid"));
      }
    };
    const controller: SystemDialogConfirmationControllerInternalV1 = Object.freeze({
      dispatchOnceInternalV1() {
        if (dispatched) return confirmationAlreadyDispatchedResultV1;
        if (currentExactConfirmation(record, candidateInput.candidateRuntime, false) === null) {
          return confirmationStaleResultV1;
        }
        if (
          candidateInput.candidateRuntime.coordinator.getHandle(
            candidateInput.surfaceInstanceId,
          ) ===
            null
        ) {
          return confirmationNotReadyResultV1;
        }
        dispatched = true;
        try {
          const operation = candidateInput.operationBinding.dispatch(candidateInput.invocation);
          void promiseThenInternalV1.call(operation, settleOutcome, settleFault);
        } catch (error) {
          settleFault(error);
        }
        return confirmationDispatchedResultV1;
      },
      cancelInternalV1(dismissKind: ManagedSurfaceDismissKindV1) {
        const current = currentExactConfirmation(record, candidateInput.candidateRuntime, false);
        if (current === null) return confirmationStaleResultV1;
        const publicationInstance = current.child;
        const receipt = publicationInstance.readiness.kind === "preparing"
          ? mutate(() =>
            candidateInput.candidateRuntime.coordinator.routeFallbackDismissExactCandidate(
              candidateInput.readiness.evidence,
              dismissKind,
            )
          )
          : (() => {
            const handle = candidateInput.candidateRuntime.coordinator.getHandle(
              candidateInput.surfaceInstanceId,
            );
            return handle === null
              ? null
              : mutate(() =>
                candidateInput.candidateRuntime.coordinator.routeDismiss(handle, dismissKind)
              );
          })();
        if (receipt === null) return confirmationStaleResultV1;
        if (receipt.kind === "applied" && receipt.code === "surface.dismissed") {
          return confirmationClosedResultV1;
        }
        if (receipt.code === "surface.dismiss_locked") return confirmationDismissLockedResultV1;
        if (receipt.kind === "stale") return confirmationStaleResultV1;
        return confirmationTransitionFaultResultV1;
      },
    });
    record = Object.freeze({
      kind: "confirmation" as const,
      surfaceInstanceId: candidateInput.surfaceInstanceId,
      parentSurfaceInstanceId: candidateInput.parentSurfaceInstanceId,
      invocation: candidateInput.invocation,
      resolution: candidateInput.resolution,
      readiness: candidateInput.readiness,
      operationBinding: candidateInput.operationBinding,
      controller,
    });
    return record;
  };

  requestConfirmation = (parentSurfaceInstanceId, request) => {
    if (
      disposed || detached || activationGate?.isOpen() === false || !runtime.isIngressOpen()
    ) return disposedResultV1;
    if (hostLease?.open !== true || catalog === null) {
      return confirmationRendererUnavailableResultV1;
    }
    const candidateRuntime = runtime;
    const candidateHostLease = hostLease;
    reconcileRecords();
    const parentRecord = rootRecordFor(parentSurfaceInstanceId);
    const parentInstance = managedSnapshot().orderedInstances.find((instance) =>
      instance.surfaceInstanceId === parentSurfaceInstanceId &&
      instance.parentInstanceId === null &&
      instance.definition.definitionId ===
        systemDialogManagedContractInternalV1.definitions.saves.definitionId &&
      instance.readiness.kind === "ready"
    );
    if (parentRecord?.rootRequest !== "saves" || parentInstance === undefined) {
      return confirmationParentStaleResultV1;
    }
    const existing = managedSnapshot().orderedInstances.find((instance) =>
      instance.parentInstanceId === parentSurfaceInstanceId &&
      instance.definition.slotId ===
        systemDialogManagedContractInternalV1.definitions.confirmation.slotId
    );
    if (existing !== undefined) return confirmationAlreadyRequestedResultV1;
    const admittedPublication = candidateRuntime.coordinator.getSnapshot();
    let invocation: SystemDialogConfirmationInvocationInternalV1;
    try {
      invocation = normalizeSystemDialogConfirmationInvocationInternalV1(request.invocation);
    } catch {
      return confirmationInvocationInvalidResultV1;
    }
    const operationBinding = normalizeOperationBinding(request.operationBinding);
    if (operationBinding === null) return confirmationOperationBindingInvalidResultV1;
    const admitted = confirmationPreflight(invocation);
    if ("kind" in admitted) return admitted;
    if (
      disposed || detached || activationGate?.isOpen() === false ||
      !candidateRuntime.isIngressOpen() || runtime !== candidateRuntime
    ) return disposedResultV1;
    if (hostLease !== candidateHostLease || !candidateHostLease.open || catalog === null) {
      return confirmationRendererUnavailableResultV1;
    }
    reconcileRecords();
    const currentPublication = candidateRuntime.coordinator.getSnapshot();
    const exactParent = currentPublication.orderedInstances.find((instance) =>
      instance.surfaceInstanceId === parentSurfaceInstanceId &&
      instance.parentInstanceId === null &&
      instance.definition.definitionId ===
        systemDialogManagedContractInternalV1.definitions.saves.definitionId &&
      instance.readiness.kind === "ready"
    );
    if (records.get(parentSurfaceInstanceId) !== parentRecord || exactParent === undefined) {
      return confirmationParentStaleResultV1;
    }
    const currentChild = currentPublication.orderedInstances.find((instance) =>
      instance.parentInstanceId === parentSurfaceInstanceId &&
      instance.definition.slotId ===
        systemDialogManagedContractInternalV1.definitions.confirmation.slotId
    );
    if (currentChild !== undefined) return confirmationAlreadyRequestedResultV1;
    if (currentPublication !== admittedPublication) {
      return confirmationTransitionFaultResultV1;
    }
    const parent = candidateRuntime.coordinator.getHandle(parentSurfaceInstanceId);
    if (parent === null) return confirmationParentStaleResultV1;
    let preparedRecord: SystemDialogConfirmationCandidateRecordInternalV1 | null = null;
    const previousResultGeneration = confirmationResultGenerations.get(parentSurfaceInstanceId);
    const resultGeneration = Object.freeze({ kind: "confirmation-result-generation" });
    confirmationResultGenerations.set(parentSurfaceInstanceId, resultGeneration);
    let result: ReturnType<
      ManagedSurfaceCoordinatorRuntimeV1["coordinator"]["pushTransientChild"]
    >;
    try {
      result = mutate(
        () =>
          candidateRuntime.coordinator.pushTransientChild({
            definition: systemDialogManagedContractInternalV1.definitions.confirmation,
            semanticOccurrenceId: null,
            parent,
          }),
        (prepared) => {
          if (
            prepared.receipt.kind !== "applied" ||
            prepared.receipt.code !== "surface.preparation_started" ||
            prepared.receipt.surfaceInstanceId === undefined ||
            prepared.readiness === null
          ) return;
          preparedRecord = createConfirmationRecord({
            surfaceInstanceId: prepared.receipt.surfaceInstanceId,
            parentSurfaceInstanceId,
            invocation,
            resolution: admitted,
            readiness: prepared.readiness,
            operationBinding,
            candidateRuntime,
            parentRecord,
            resultGeneration,
          });
          records.set(prepared.receipt.surfaceInstanceId, preparedRecord);
          invalidateHostRenderSnapshot();
        },
      );
    } catch {
      if (confirmationResultGenerations.get(parentSurfaceInstanceId) === resultGeneration) {
        if (previousResultGeneration === undefined) {
          confirmationResultGenerations.delete(parentSurfaceInstanceId);
        } else {
          confirmationResultGenerations.set(parentSurfaceInstanceId, previousResultGeneration);
        }
      }
      return confirmationTransitionFaultResultV1;
    }
    if (
      result.receipt.kind !== "applied" ||
      result.receipt.code !== "surface.preparation_started" ||
      result.receipt.surfaceInstanceId === undefined ||
      result.readiness === null
    ) {
      if (confirmationResultGenerations.get(parentSurfaceInstanceId) === resultGeneration) {
        if (previousResultGeneration === undefined) {
          confirmationResultGenerations.delete(parentSurfaceInstanceId);
        } else {
          confirmationResultGenerations.set(parentSurfaceInstanceId, previousResultGeneration);
        }
      }
      return confirmationTransitionFaultResultV1;
    }
    const current = preparedRecord === null
      ? null
      : currentExactConfirmation(preparedRecord, candidateRuntime, false);
    if (
      current === null || current.child.readiness.kind !== "preparing" ||
      records.get(result.receipt.surfaceInstanceId) !== preparedRecord
    ) return confirmationTransitionFaultResultV1;
    return Object.freeze({
      kind: "preparing" as const,
      code: "system_dialog.confirmation_preparation_started" as const,
      surfaceInstanceId: result.receipt.surfaceInstanceId,
    });
  };

  const session: SystemDialogManagedSessionInternalV1 = {
    getManagedSnapshotInternalV1: managedSnapshot,
    getRootCandidateRecordsInternalV1() {
      reconcileRecords();
      return Object.freeze(
        [...records.values()].filter(
          (record): record is SystemDialogRootCandidateRecordInternalV1 => record.kind === "root",
        ),
      );
    },
    getHostRenderSnapshotInternalV1() {
      const publication = managedSnapshot();
      if (hostRenderSourcePublication === publication && hostRenderSnapshot !== null) {
        return hostRenderSnapshot;
      }
      const entries: SystemDialogHostRenderEntryInternalV1[] = [];
      for (const instance of publication.orderedInstances) {
        const record = records.get(instance.surfaceInstanceId);
        if (record === undefined) continue;
        entries.push(
          record.kind === "root"
            ? Object.freeze({
              kind: "root" as const,
              surfaceInstanceId: instance.surfaceInstanceId,
              phase: instance.phase,
              rootRequest: record.rootRequest,
              resolution: record.resolution,
              lifecycleIntents: record.lifecycleIntents,
            })
            : Object.freeze({
              kind: "confirmation" as const,
              surfaceInstanceId: instance.surfaceInstanceId,
              parentSurfaceInstanceId: record.parentSurfaceInstanceId,
              phase: instance.phase,
              invocation: record.invocation,
              resolution: record.resolution,
              controller: record.controller,
            }),
        );
      }
      hostRenderSourcePublication = publication;
      const nextSnapshot: SystemDialogHostRenderSnapshotInternalV1 = Object.freeze({
        publication,
        entries: Object.freeze(entries),
      });
      hostRenderSnapshot = nextSnapshot;
      return nextSnapshot;
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
      if (hostLease?.open !== true || catalog === null) return unavailableResultV1;
      const candidateRuntime = runtime;
      const candidateHostLease = hostLease;
      reconcileRecords();
      const admittedPublication = managedSnapshot();
      const roots = systemRoots();
      const pending = roots.find((instance) => instance.readiness.kind === "preparing");
      const active = roots.find((instance) => instance.readiness.kind === "ready");
      const pendingRecord = rootRecordFor(pending?.surfaceInstanceId);
      const activeRecord = rootRecordFor(active?.surfaceInstanceId);
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
      if (
        disposed || detached || activationGate?.isOpen() === false ||
        !candidateRuntime.isIngressOpen() || runtime !== candidateRuntime
      ) return disposedResultV1;
      if (hostLease !== candidateHostLease || !candidateHostLease.open || catalog === null) {
        return unavailableResultV1;
      }
      if (managedSnapshot() !== admittedPublication) {
        return transitionFaultResultV1;
      }
      const definition = requestDefinitionV1(request);
      if (active === undefined) {
        if (pending !== undefined) {
          if (pendingRecord === undefined) return transitionFaultResultV1;
          return preparationResult(
            () =>
              candidateRuntime.coordinator.supersedeTransientInitialPreparation({
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
            candidateRuntime.coordinator.openTransientPrimary({
              definition,
              semanticOccurrenceId: null,
            }),
          request,
          admitted,
        );
      }
      const retained = candidateRuntime.coordinator.getHandle(active.surfaceInstanceId);
      if (retained === null) return transitionFaultResultV1;
      return preparationResult(
        () =>
          candidateRuntime.coordinator.replaceTransientPrimary({
            definition,
            semanticOccurrenceId: null,
            expected: retained,
          }),
        request,
        admitted,
      );
    },
    attachHostInternalV1(attachmentInput) {
      if (disposed) throw new TypeError("ui.system_dialog_session_disposed");
      if (
        attachmentInput.hostIdentity === null ||
        typeof attachmentInput.hostIdentity !== "object" ||
        attachmentInput.portalContainer === null ||
        typeof attachmentInput.portalContainer !== "object"
      ) {
        throw new TypeError("ui.system_dialog_host_attachment_invalid");
      }
      if (hostLease !== null && hostLease.hostIdentity !== attachmentInput.hostIdentity) {
        throw new TypeError("ui.system_dialog_host_lease_conflict");
      }
      if (
        hostLease !== null &&
        hostLease.portalContainer !== attachmentInput.portalContainer &&
        systemRoots().length > 0
      ) {
        throw new TypeError("ui.system_dialog_host_portal_conflict");
      }
      const lease = {
        hostIdentity: attachmentInput.hostIdentity,
        portalContainer: attachmentInput.portalContainer,
        open: true,
      };
      hostLease = lease;
      catalog = attachmentInput.catalog;
      let released = false;
      const attachment: SystemDialogHostAttachmentInternalV1 = {
        isAcknowledgmentOpen: () => !released && !disposed && hostLease === lease && lease.open,
        updateCatalogInternalV1(nextCatalog) {
          if (released || disposed || hostLease !== lease || !lease.open) {
            throw new TypeError("ui.system_dialog_host_attachment_stale");
          }
          catalog = nextCatalog;
        },
        readyCandidateInternalV1(surfaceInstanceId) {
          return !released && !disposed && hostLease === lease && lease.open
            ? readyCandidate(surfaceInstanceId)
            : staleCandidateReceipt(surfaceInstanceId);
        },
        failCandidateInternalV1(surfaceInstanceId, error) {
          if (!released && !disposed && hostLease === lease && lease.open) {
            const receipt = failCandidate(surfaceInstanceId);
            if (error !== undefined) {
              reportFailure("ui.system_dialog_render_preparation_failed", error);
            }
            return receipt;
          }
          return staleCandidateReceipt(surfaceInstanceId);
        },
        release() {
          if (released) return;
          released = true;
          if (hostLease !== lease) return;
          lease.open = false;
          queueMicrotask(() => {
            if (disposed || hostLease !== lease || lease.open) return;
            hostLease = null;
            catalog = null;
            closeSystemOwnerAfterHostDetach();
          });
        },
      };
      return Object.freeze(attachment);
    },
    isRuntimeAttachmentCurrentInternalV1(expectedRuntime) {
      return !disposed && !detached && preparedRuntime === null && runtime === expectedRuntime &&
        (activationGate === null || activationGate.isOpen()) && expectedRuntime.isIngressOpen();
    },
    sealTerminalDisposalInternalV1() {
      terminalDisposal = true;
    },
    isTerminalDisposalInternalV1() {
      return terminalDisposal;
    },
    detachRuntimeInternalV1() {
      if (disposed || detached) return;
      detached = true;
      preparedRuntime = null;
      activationGate = null;
      unsubscribeCoordinator?.();
      unsubscribeCoordinator = null;
      records.clear();
      confirmationResultGenerations.clear();
      invalidateHostRenderSnapshot();
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
      confirmationResultGenerations.clear();
      invalidateHostRenderSnapshot();
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
      confirmationResultGenerations.clear();
      invalidateHostRenderSnapshot();
      catalog = null;
      hostLease = null;
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
