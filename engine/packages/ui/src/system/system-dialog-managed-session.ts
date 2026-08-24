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
import type { SaveOverlayGuardV1, SaveOverlayLabelsV1 } from "../persistence/save-overlay.tsx";
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
  type SystemDialogSessionSnapshotV1,
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
  readonly labels: SaveOverlayLabelsV1;
  readonly closeLabel: string;
  /** Candidate-snapshotted live source; catalog updates never rewrite an active root. */
  readonly guardProjection?: SystemDialogSaveGuardProjectionInternalV1;
}

export interface SystemDialogSaveGuardProjectionInternalV1 {
  getSnapshot(): unknown;
  subscribe(listener: () => void): () => void;
  evaluate(publication: unknown): SaveOverlayGuardV1 | undefined;
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

export interface SystemDialogRootControllerInternalV1 {
  closeInternalV1(): ManagedSurfaceTransitionReceiptV1;
  cancelInternalV1(
    dismissKind: ManagedSurfaceDismissKindV1,
  ): ManagedSurfaceTransitionReceiptV1;
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
  readonly controller: SystemDialogRootControllerInternalV1;
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
  readonly controller: SystemDialogRootControllerInternalV1;
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

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function snapshotArrayV1(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError();
  return [...value];
}

type KnownFieldKindV1 = "string" | "function";

function snapshotKnownFieldsV1(
  value: unknown,
  fields: Readonly<Record<string, KnownFieldKindV1>>,
): Readonly<Record<string, unknown>> {
  if (!isRecordV1(value)) throw new TypeError();
  const snapshot: Record<string, unknown> = {};
  for (const [key, kind] of Object.entries(fields)) {
    const field = value[key];
    if (
      (kind === "string" && typeof field !== "string") ||
      (kind === "function" && typeof field !== "function")
    ) throw new TypeError();
    snapshot[key] = field;
  }
  return snapshot;
}

function snapshotOptionalFunctionV1(
  value: Readonly<Record<string, unknown>>,
  key: string,
): ((...args: never[]) => unknown) | undefined {
  const field = value[key];
  if (field === undefined) return undefined;
  if (typeof field !== "function") throw new TypeError();
  return field as (...args: never[]) => unknown;
}

function snapshotSystemDialogSaveGuardProjectionInternalV1(
  value: unknown,
): SystemDialogSaveGuardProjectionInternalV1 {
  if (!isRecordV1(value)) throw new TypeError();
  const getSnapshot = value.getSnapshot;
  const subscribe = value.subscribe;
  const evaluate = value.evaluate;
  if (
    typeof getSnapshot !== "function" || typeof subscribe !== "function" ||
    typeof evaluate !== "function"
  ) {
    throw new TypeError();
  }
  return {
    getSnapshot: getSnapshot as SystemDialogSaveGuardProjectionInternalV1["getSnapshot"],
    subscribe: subscribe as SystemDialogSaveGuardProjectionInternalV1["subscribe"],
    evaluate: evaluate as SystemDialogSaveGuardProjectionInternalV1["evaluate"],
  };
}

function snapshotOptionalSystemDialogSaveGuardProjectionInternalV1(
  value: Readonly<Record<string, unknown>>,
): SystemDialogSaveGuardProjectionInternalV1 | undefined {
  if (value.guardProjection === undefined) return undefined;
  return snapshotSystemDialogSaveGuardProjectionInternalV1(value.guardProjection);
}

const saveLabelScalarFieldsV1 = {
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
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveSlotNameFieldsV1 = {
  "auto.current": "string",
  "auto.previous": "string",
  quick: "string",
  manualSlot: "function",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveSlotHealthFieldsV1 = {
  empty: "string",
  valid: "string",
  invalid: "string",
  recovery_candidate: "string",
  unavailable: "string",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveLegacyConfirmationFieldsV1 = {
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
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveRecoveryConfirmationFieldsV1 = {
  reanchorTitle: "function",
  reanchorDescription: "function",
  restoreTitle: "function",
  restoreDescription: "function",
  discardTitle: "function",
  discardDescription: "function",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveOperationScalarFieldsV1 = {
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
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveImportFileRejectionFieldsV1 = {
  too_large: "string",
  unsupported_type: "string",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const savePersistenceRejectionFieldsV1 = {
  busy: "string",
  unavailable: "string",
  empty_slot: "string",
  conflict: "string",
  in_flight: "string",
  invalid_record: "string",
  invalid_note: "string",
  lineage_limit: "string",
  migration_unavailable: "string",
  migration_rejected: "string",
  incompatible: "string",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveExportRejectionFieldsV1 = {
  unavailable: "string",
  empty_slot: "string",
  conflict: "string",
  invalid_record: "string",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveRecoveryScalarFieldsV1 = { checking: "string" } as const satisfies Readonly<
  Record<string, KnownFieldKindV1>
>;

const saveRecoveryDispositionFieldsV1 = {
  direct: "string",
  migration_required: "string",
  adoption_required: "string",
  migration_and_adoption_required: "string",
  migration_unavailable: "string",
  migration_rejected: "string",
  incompatible: "string",
  reanchor_required: "string",
  invalid_record: "string",
  unavailable: "string",
  faulted: "string",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveRecoveryBackupFieldsV1 = {
  available: "string",
  invalid: "string",
  unavailable: "string",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveRecoveryActionFieldsV1 = {
  inspect: "string",
  upgrade: "string",
  reanchor: "string",
  restore: "string",
  exportBackup: "string",
  discard: "string",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveRecoveryOperationFieldsV1 = {
  upgrading: "function",
  reanchoring: "function",
  restoring: "function",
  exportingBackup: "function",
  discarding: "function",
  upgradedExact: "string",
  upgradedAdopted: "string",
  reanchored: "string",
  restored: "string",
  backupExported: "string",
  discarded: "string",
  faulted: "string",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

const saveRecoveryRejectionFieldsV1 = {
  busy: "string",
  unavailable: "string",
  empty_slot: "string",
  backup_pending: "string",
  conflict: "string",
  invalid_record: "string",
  migration_unavailable: "string",
  migration_rejected: "string",
  incompatible: "string",
  reanchor_required: "string",
  not_required: "string",
  empty_backup: "string",
  invalid_backup: "string",
} as const satisfies Readonly<Record<string, KnownFieldKindV1>>;

function snapshotSaveRecoveryLabelsV1(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecordV1(value)) throw new TypeError();
  const operationValue = value.operation;
  if (!isRecordV1(operationValue)) throw new TypeError();
  return {
    ...snapshotKnownFieldsV1(value, saveRecoveryScalarFieldsV1),
    confirmation: snapshotKnownFieldsV1(
      value.confirmation,
      saveRecoveryConfirmationFieldsV1,
    ),
    disposition: snapshotKnownFieldsV1(
      value.disposition,
      saveRecoveryDispositionFieldsV1,
    ),
    backup: snapshotKnownFieldsV1(
      value.backup,
      saveRecoveryBackupFieldsV1,
    ),
    action: snapshotKnownFieldsV1(
      value.action,
      saveRecoveryActionFieldsV1,
    ),
    operation: {
      ...snapshotKnownFieldsV1(operationValue, saveRecoveryOperationFieldsV1),
      rejected: snapshotKnownFieldsV1(
        operationValue.rejected,
        saveRecoveryRejectionFieldsV1,
      ),
    },
  };
}

function snapshotSaveLabelsV1(value: unknown): SaveOverlayLabelsV1 {
  if (!isRecordV1(value)) throw new TypeError();
  const scalar = snapshotKnownFieldsV1(value, saveLabelScalarFieldsV1);
  const confirmationValue = value.confirmation;
  const legacyConfirmation = snapshotKnownFieldsV1(
    confirmationValue,
    saveLegacyConfirmationFieldsV1,
  );
  const recovery = value.recovery === undefined
    ? undefined
    : snapshotSaveRecoveryLabelsV1(value.recovery);
  const operationValue = value.operation;
  if (!isRecordV1(operationValue)) throw new TypeError();
  const operationScalar = snapshotKnownFieldsV1(operationValue, saveOperationScalarFieldsV1);
  const operation = {
    ...operationScalar,
    importFileRejected: snapshotKnownFieldsV1(
      operationValue.importFileRejected,
      saveImportFileRejectionFieldsV1,
    ),
    rejected: snapshotKnownFieldsV1(
      operationValue.rejected,
      savePersistenceRejectionFieldsV1,
    ),
    exportRejected: snapshotKnownFieldsV1(
      operationValue.exportRejected,
      saveExportRejectionFieldsV1,
    ),
  };
  const savedAtText = snapshotOptionalFunctionV1(value, "savedAtText");
  return {
    ...scalar,
    slotNames: snapshotKnownFieldsV1(value.slotNames, saveSlotNameFieldsV1),
    slotHealth: snapshotKnownFieldsV1(
      value.slotHealth,
      saveSlotHealthFieldsV1,
    ),
    confirmation: legacyConfirmation,
    operation,
    ...(recovery === undefined ? {} : { recovery }),
    ...(savedAtText === undefined ? {} : { savedAtText }),
  } as unknown as SaveOverlayLabelsV1;
}

export function snapshotSystemDialogSettingsContentConfigInternalV1(
  input: SystemDialogSettingsContentConfigInternalV1,
): SystemDialogContentConfigSnapshotInternalV1<SystemDialogSettingsContentConfigInternalV1> {
  try {
    if (!isRecordV1(input)) throw new TypeError();
    const title = input.title;
    const closeLabel = input.closeLabel;
    const emptyText = input.emptyText;
    if (
      typeof title !== "string" || typeof closeLabel !== "string" || typeof emptyText !== "string"
    ) {
      throw new TypeError();
    }
    const sections = snapshotArrayV1(input.sections);
    return createSystemDialogContentConfigSnapshotInternalV1({
      title,
      closeLabel,
      emptyText,
      sections: sections as readonly ReactNode[],
    });
  } catch {
    throw new TypeError("ui.system_dialog_settings_config_invalid");
  }
}

export function snapshotSystemDialogSavesContentConfigInternalV1(
  input: SystemDialogSavesContentConfigInternalV1,
): SystemDialogContentConfigSnapshotInternalV1<SystemDialogSavesContentConfigInternalV1> {
  try {
    if (!isRecordV1(input)) throw new TypeError();
    const variant = input.variant;
    if (variant === "custom") {
      const accessibleName = input.accessibleName;
      const component = input.component;
      if (
        typeof accessibleName !== "string" ||
        accessibleName.length === 0 ||
        component === null ||
        (typeof component !== "object" && typeof component !== "function")
      ) {
        throw new TypeError();
      }
      return createSystemDialogContentConfigSnapshotInternalV1({
        variant,
        accessibleName,
        component,
      });
    }
    if (variant !== "standard") throw new TypeError();
    const closeLabel = input.closeLabel;
    if (typeof closeLabel !== "string") {
      throw new TypeError();
    }
    const guardProjection = snapshotOptionalSystemDialogSaveGuardProjectionInternalV1(input);
    return createSystemDialogContentConfigSnapshotInternalV1({
      variant,
      labels: snapshotSaveLabelsV1(input.labels),
      closeLabel,
      ...(guardProjection === undefined ? {} : { guardProjection }),
    });
  } catch {
    throw new TypeError("ui.system_dialog_saves_config_invalid");
  }
}

function normalizeCatalogEntryV1(value: unknown): CatalogEntryRecordV1 {
  if (!isRecordV1(value)) throw new TypeError();
  const rootRequest = value.rootRequest;
  if (rootRequest !== "settings" && rootRequest !== "saves") throw new TypeError();
  const rendererComponent = value.rendererComponent;
  if (
    rendererComponent === null ||
    (typeof rendererComponent !== "object" && typeof rendererComponent !== "function")
  ) {
    throw new TypeError();
  }
  const accessibleName = value.accessibleName;
  if (typeof accessibleName !== "string" || accessibleName.length === 0) throw new TypeError();
  const requiredPortIds = snapshotArrayV1(value.requiredPortIds).map(parseModuleId);
  if (new Set(requiredPortIds).size !== requiredPortIds.length) throw new TypeError();
  const contentConfig = value.contentConfig;
  const contentConfigSnapshot = rootRequest === "settings"
    ? snapshotSystemDialogSettingsContentConfigInternalV1(
      contentConfig as SystemDialogSettingsContentConfigInternalV1,
    )
    : snapshotSystemDialogSavesContentConfigInternalV1(
      contentConfig as SystemDialogSavesContentConfigInternalV1,
    );
  return {
    rootRequest,
    rendererComponent,
    accessibleName,
    requiredPortIds,
    contentConfigSnapshot,
  };
}

function normalizeConfirmationCatalogEntryV1(
  value: unknown,
): SystemDialogResolvedConfirmationCatalogEntryInternalV1 {
  if (!isRecordV1(value)) throw new TypeError();
  const rendererComponent = value.rendererComponent;
  if (
    rendererComponent === null ||
    (typeof rendererComponent !== "object" && typeof rendererComponent !== "function")
  ) {
    throw new TypeError();
  }
  const accessibleName = value.accessibleName;
  if (typeof accessibleName !== "string" || accessibleName.length === 0) throw new TypeError();
  const requiredPortIds = snapshotArrayV1(value.requiredPortIds).map(parseModuleId);
  if (new Set(requiredPortIds).size !== requiredPortIds.length) throw new TypeError();
  return {
    rendererComponent,
    accessibleName,
    requiredPortIds,
  };
}

export function createSystemDialogRootCatalogSnapshotInternalV1(input: {
  readonly entries: readonly SystemDialogRootCatalogEntryInternalV1[];
  readonly portBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
  readonly confirmationEntry?: SystemDialogConfirmationCatalogEntryInternalV1 | null;
}): SystemDialogRootCatalogInternalV1 {
  try {
    if (!isRecordV1(input)) throw new TypeError();
    const entriesInput = snapshotArrayV1(input.entries);
    const entries = new Map<SystemDialogRootRequestInternalV1, CatalogEntryRecordV1>();
    for (const value of entriesInput) {
      const entry = normalizeCatalogEntryV1(value);
      if (entries.has(entry.rootRequest)) throw new TypeError();
      entries.set(entry.rootRequest, entry);
    }
    const confirmationEntry = input.confirmationEntry === undefined ||
        input.confirmationEntry === null
      ? null
      : normalizeConfirmationCatalogEntryV1(input.confirmationEntry);
    const portsInput = snapshotArrayV1(input.portBindings);
    const ports = new Map<string, object | ((...args: never[]) => unknown)>();
    for (const value of portsInput) {
      if (!isRecordV1(value)) throw new TypeError();
      const portId = parseModuleId(value.portId);
      const port = value.port;
      if (
        port === null ||
        (typeof port !== "object" && typeof port !== "function") ||
        ports.has(portId)
      ) {
        throw new TypeError();
      }
      ports.set(portId, port);
    }
    return {
      resolveRoot: (request: SystemDialogRootRequestInternalV1) => entries.get(request) ?? null,
      resolveConfirmation: (_invocation: SystemDialogConfirmationInvocationInternalV1) =>
        confirmationEntry,
      resolvePort: (portId: string) => ports.get(portId) ?? null,
    };
  } catch {
    throw new TypeError("ui.system_dialog_catalog_invalid");
  }
}

const preparingResultV1 = {
  kind: "preparing" as const,
  code: "system_dialog.preparation_started" as const,
};
const cancelledResultV1 = {
  kind: "applied" as const,
  code: "system_dialog.pending_replacement_cancelled" as const,
};
const alreadyRequestedResultV1 = {
  kind: "unchanged" as const,
  code: "system_dialog.already_requested" as const,
};
const disposedResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.disposed" as const,
};
const unavailableResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.renderer_unavailable" as const,
};
const missingRendererResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.renderer_missing" as const,
};
const rendererFaultResultV1 = {
  kind: "faulted" as const,
  code: "system_dialog.renderer_faulted" as const,
};
const transitionFaultResultV1 = {
  kind: "faulted" as const,
  code: "system_dialog.transition_faulted" as const,
};

const confirmationAlreadyRequestedResultV1 = {
  kind: "unchanged" as const,
  code: "system_dialog.confirmation_already_requested" as const,
};
const confirmationParentStaleResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.confirmation_parent_stale" as const,
};
const confirmationInvocationInvalidResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.confirmation_invocation_invalid" as const,
};
const confirmationRendererUnavailableResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.confirmation_renderer_unavailable" as const,
};
const confirmationRendererMissingResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.confirmation_renderer_missing" as const,
};
const confirmationRendererFaultResultV1 = {
  kind: "faulted" as const,
  code: "system_dialog.confirmation_renderer_faulted" as const,
};
const confirmationTransitionFaultResultV1 = {
  kind: "faulted" as const,
  code: "system_dialog.confirmation_transition_faulted" as const,
};
const confirmationStaleResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.confirmation_stale" as const,
};
const confirmationNotReadyResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.confirmation_not_ready" as const,
};
const confirmationDispatchedResultV1 = {
  kind: "applied" as const,
  code: "system_dialog.confirmation_operation_dispatched" as const,
};
const confirmationAlreadyDispatchedResultV1 = {
  kind: "unchanged" as const,
  code: "system_dialog.confirmation_operation_already_dispatched" as const,
};
const confirmationClosedResultV1 = {
  kind: "applied" as const,
  code: "system_dialog.confirmation_closed" as const,
};
const confirmationDismissLockedResultV1 = {
  kind: "rejected" as const,
  code: "system_dialog.confirmation_dismiss_locked" as const,
};

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
    return ({
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
      disposed || terminalDisposal || detached || activationGate?.isOpen() === false ||
      !runtime.isIngressOpen()
    ) return;
    const ownerId = systemDialogManagedContractInternalV1.resolvedOwnerIds[0]!;
    const snapshot = managedSnapshot();
    if (!snapshot.orderedInstances.some((instance) => instance.definition.ownerId === ownerId)) {
      return;
    }
    mutate(() =>
      runtime.coordinator.closeOwner({
        applicationEpoch: snapshot.applicationEpoch,
        topologyRevision: snapshot.topologyRevision,
        ownerId,
      })
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
      for (const rawPortId of entry.requiredPortIds) {
        const portId = parseModuleId(rawPortId);
        const port = currentCatalog.resolvePort(portId);
        if (port === null || port === undefined) {
          return ({
            kind: "rejected" as const,
            code: "system_dialog.required_port_missing" as const,
            portId,
          });
        }
        bindings.push({ portId, port });
      }
      return createSystemDialogRootCandidateResolutionSnapshotInternalV1({
        rootRequest: request,
        rendererComponent: entry.rendererComponent,
        accessibleName: entry.accessibleName,
        requiredPortBindings: bindings,
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
      for (const rawPortId of entry.requiredPortIds) {
        const portId = parseModuleId(rawPortId);
        const port = currentCatalog.resolvePort(portId);
        if (port === null || port === undefined) {
          return ({
            kind: "rejected" as const,
            code: "system_dialog.confirmation_required_port_missing" as const,
            portId,
          });
        }
        bindings.push({ portId, port });
      }
      return createSystemDialogConfirmationCandidateResolutionSnapshotInternalV1({
        invocation,
        rendererComponent: entry.rendererComponent,
        accessibleName: entry.accessibleName,
        requiredPortBindings: bindings,
      });
    } catch {
      return confirmationRendererFaultResultV1;
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
  ): SystemDialogSavesLifecycleIntentsInternalV1 => ({
    requestConfirmationInternalV1: (request: {
      readonly invocation: SystemDialogConfirmationInvocationInternalV1;
      readonly operationBinding: SystemDialogConfirmationOperationBindingInternalV1;
    }) => requestConfirmation(parentSurfaceInstanceId, request),
  });

  const staleRootIntentReceipt = (
    surfaceInstanceId: ManagedSurfaceInstanceIdV1,
    expectedRuntime: ManagedSurfaceCoordinatorRuntimeV1,
  ): ManagedSurfaceTransitionReceiptV1 => {
    const snapshot = expectedRuntime.coordinator.getSnapshot();
    return ({
      kind: "stale" as const,
      code: "surface.stale_instance" as const,
      beforeTopologyRevision: snapshot.topologyRevision,
      afterTopologyRevision: snapshot.topologyRevision,
      surfaceInstanceId,
    });
  };

  const currentExactRoot = (
    record: SystemDialogRootCandidateRecordInternalV1,
    expectedRuntime: ManagedSurfaceCoordinatorRuntimeV1,
    allowPreparing: boolean,
  ) => {
    if (
      disposed || terminalDisposal || detached || hostLease?.open !== true ||
      activationGate?.isOpen() === false || !expectedRuntime.isIngressOpen() ||
      runtime !== expectedRuntime || records.get(record.surfaceInstanceId) !== record
    ) return null;
    const expectedDefinition = requestDefinitionV1(record.rootRequest);
    return expectedRuntime.coordinator.getSnapshot().orderedInstances.find((instance) =>
      instance.surfaceInstanceId === record.surfaceInstanceId &&
      instance.parentInstanceId === null &&
      instance.definition.definitionId === expectedDefinition.definitionId &&
      (instance.readiness.kind === "ready" ||
        (allowPreparing && instance.readiness.kind === "preparing"))
    ) ?? null;
  };

  const createRootRecord = (candidateInput: {
    readonly surfaceInstanceId: ManagedSurfaceInstanceIdV1;
    readonly request: SystemDialogRootRequestInternalV1;
    readonly resolution: SystemDialogRootCandidateResolutionSnapshotInternalV1<unknown, unknown>;
    readonly readiness: ManagedSurfaceReadinessAdapterV1;
    readonly candidateRuntime: ManagedSurfaceCoordinatorRuntimeV1;
  }): SystemDialogRootCandidateRecordInternalV1 => {
    let record!: SystemDialogRootCandidateRecordInternalV1;
    const ownerId = systemDialogManagedContractInternalV1.resolvedOwnerIds[0]!;
    const controller: SystemDialogRootControllerInternalV1 = {
      closeInternalV1() {
        if (currentExactRoot(record, candidateInput.candidateRuntime, false) === null) {
          return staleRootIntentReceipt(record.surfaceInstanceId, candidateInput.candidateRuntime);
        }
        const handle = candidateInput.candidateRuntime.coordinator.getHandle(
          record.surfaceInstanceId,
        );
        if (handle === null) {
          return staleRootIntentReceipt(record.surfaceInstanceId, candidateInput.candidateRuntime);
        }
        return mutate(() =>
          candidateInput.candidateRuntime.coordinator.closeExpectedWithOwnerPreparationCancel(
            handle,
            ownerId,
          )
        );
      },
      cancelInternalV1(dismissKind: ManagedSurfaceDismissKindV1) {
        const current = currentExactRoot(record, candidateInput.candidateRuntime, true);
        if (current === null) {
          return staleRootIntentReceipt(record.surfaceInstanceId, candidateInput.candidateRuntime);
        }
        if (current.readiness.kind === "preparing") {
          return mutate(() =>
            candidateInput.candidateRuntime.coordinator
              .routeFallbackDismissWithOwnerPreparationCancel(
                record.readiness.evidence,
                ownerId,
                dismissKind,
              )
          );
        }
        const handle = candidateInput.candidateRuntime.coordinator.getHandle(
          record.surfaceInstanceId,
        );
        if (handle === null) {
          return staleRootIntentReceipt(record.surfaceInstanceId, candidateInput.candidateRuntime);
        }
        return mutate(() =>
          candidateInput.candidateRuntime.coordinator.routeDismissWithOwnerPreparationCancel(
            handle,
            ownerId,
            dismissKind,
          )
        );
      },
    };
    record = {
      kind: "root" as const,
      surfaceInstanceId: candidateInput.surfaceInstanceId,
      rootRequest: candidateInput.request,
      resolution: candidateInput.resolution,
      readiness: candidateInput.readiness,
      lifecycleIntents: candidateInput.request === "saves"
        ? bindSavesLifecycleIntents(candidateInput.surfaceInstanceId)
        : null,
      controller,
    };
    return record;
  };

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
      preparedRecord = createRootRecord({
        surfaceInstanceId: prepared.receipt.surfaceInstanceId,
        request,
        resolution,
        readiness: prepared.readiness,
        candidateRuntime,
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
      disposed || terminalDisposal || detached || activationGate?.isOpen() === false ||
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
      disposed || terminalDisposal || detached || hostLease?.open !== true ||
      !expectedRuntime.isIngressOpen() || runtime !== expectedRuntime ||
      records.get(record.surfaceInstanceId) !== record
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
    return child === undefined || parent === undefined ? null : ({ child, parent });
  };

  const exactRootSurvives = (
    parentSurfaceInstanceId: ManagedSurfaceInstanceIdV1,
    parentRecord: SystemDialogRootCandidateRecordInternalV1,
    expectedRuntime: ManagedSurfaceCoordinatorRuntimeV1,
  ): boolean => {
    if (
      disposed || terminalDisposal || detached || hostLease?.open !== true ||
      !expectedRuntime.isIngressOpen() || activationGate?.isOpen() === false ||
      runtime !== expectedRuntime ||
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
      record.operationBinding.resultSink(delivery);
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
      record.operationBinding.finalizeExactRoot();
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
      settle({ kind: "faulted" as const, error });
    };
    const settleOutcome = (outcome: SystemDialogConfirmationOperationOutcomeInternalV1): void => {
      if (settled) return;
      try {
        if (!isRecordV1(outcome)) throw new TypeError();
        const kind = outcome.kind;
        if (kind === "successor") {
          if (
            (candidateInput.invocation.kind !== "load" &&
              candidateInput.invocation.kind !== "import")
          ) {
            throw new TypeError();
          }
          settle(null);
          return;
        }
        if (kind !== "retain_root" || !Object.hasOwn(outcome, "result")) throw new TypeError();
        settle({ kind: "settled" as const, result: outcome.result });
      } catch {
        settleFault(new TypeError("ui.system_dialog_confirmation_operation_outcome_invalid"));
      }
    };
    const controller: SystemDialogConfirmationControllerInternalV1 = {
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
          void operation.then(settleOutcome, settleFault);
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
    };
    record = {
      kind: "confirmation" as const,
      surfaceInstanceId: candidateInput.surfaceInstanceId,
      parentSurfaceInstanceId: candidateInput.parentSurfaceInstanceId,
      invocation: candidateInput.invocation,
      resolution: candidateInput.resolution,
      readiness: candidateInput.readiness,
      operationBinding: candidateInput.operationBinding,
      controller,
    };
    return record;
  };

  requestConfirmation = (parentSurfaceInstanceId, request) => {
    if (
      disposed || terminalDisposal || detached || activationGate?.isOpen() === false ||
      !runtime.isIngressOpen()
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
    const operationBinding = request.operationBinding;
    const admitted = confirmationPreflight(invocation);
    if ("kind" in admitted) return admitted;
    if (
      disposed || terminalDisposal || detached || activationGate?.isOpen() === false ||
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
    const resultGeneration = { kind: "confirmation-result-generation" };
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
    return ({
      kind: "preparing" as const,
      code: "system_dialog.confirmation_preparation_started" as const,
      surfaceInstanceId: result.receipt.surfaceInstanceId,
    });
  };

  const session: SystemDialogManagedSessionInternalV1 = {
    getManagedSnapshotInternalV1: managedSnapshot,
    getRootCandidateRecordsInternalV1() {
      reconcileRecords();
      return ([...records.values()].filter(
        (record): record is SystemDialogRootCandidateRecordInternalV1 => record.kind === "root",
      ));
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
            ? ({
              kind: "root" as const,
              surfaceInstanceId: instance.surfaceInstanceId,
              phase: instance.phase,
              rootRequest: record.rootRequest,
              resolution: record.resolution,
              lifecycleIntents: record.lifecycleIntents,
              controller: record.controller,
            })
            : ({
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
      const nextSnapshot: SystemDialogHostRenderSnapshotInternalV1 = {
        publication,
        entries: entries,
      };
      hostRenderSnapshot = nextSnapshot;
      return nextSnapshot;
    },
    subscribeInternalV1(listener) {
      if (disposed || terminalDisposal) return () => undefined;
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
        disposed || terminalDisposal || detached || activationGate?.isOpen() === false ||
        !runtime.isIngressOpen()
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
        disposed || terminalDisposal || detached || activationGate?.isOpen() === false ||
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
      if (disposed || terminalDisposal) {
        throw new TypeError("ui.system_dialog_session_disposed");
      }
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
        isAcknowledgmentOpen: () =>
          !released && !disposed && !terminalDisposal && hostLease === lease && lease.open,
        updateCatalogInternalV1(nextCatalog) {
          if (released || disposed || terminalDisposal || hostLease !== lease || !lease.open) {
            throw new TypeError("ui.system_dialog_host_attachment_stale");
          }
          catalog = nextCatalog;
        },
        readyCandidateInternalV1(surfaceInstanceId) {
          return !released && !disposed && !terminalDisposal && hostLease === lease && lease.open
            ? readyCandidate(surfaceInstanceId)
            : staleCandidateReceipt(surfaceInstanceId);
        },
        failCandidateInternalV1(surfaceInstanceId, error) {
          if (!released && !disposed && !terminalDisposal && hostLease === lease && lease.open) {
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
            if (disposed || terminalDisposal || hostLease !== lease || lease.open) return;
            hostLease = null;
            catalog = null;
            closeSystemOwnerAfterHostDetach();
          });
        },
      };
      return attachment;
    },
    isRuntimeAttachmentCurrentInternalV1(expectedRuntime) {
      return !disposed && !terminalDisposal && !detached && preparedRuntime === null &&
        runtime === expectedRuntime && (activationGate === null || activationGate.isOpen()) &&
        expectedRuntime.isIngressOpen();
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
      if (disposed || terminalDisposal) {
        throw new TypeError("ui.system_dialog_session_disposed");
      }
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
      if (disposed || terminalDisposal) {
        throw new TypeError("ui.system_dialog_session_disposed");
      }
      const attachmentRuntime = preparedRuntime;
      if (!detached || attachmentRuntime === null || runtime !== attachmentRuntime) {
        throw new TypeError("ui.system_dialog_runtime_attachment_not_prepared");
      }
      preparedRuntime = null;
      detached = false;
      return (): void => {
        if (
          disposed || terminalDisposal || detached || runtime !== attachmentRuntime ||
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
  return session;
}

const systemDialogSessionInternalsV1 = new WeakMap<
  SystemDialogSessionV1,
  SystemDialogManagedSessionInternalV1
>();

export function createSystemDialogSessionFacadeInternalV1(
  internal: SystemDialogManagedSessionInternalV1,
): SystemDialogSessionV1 {
  let snapshot: SystemDialogSessionSnapshotV1 = { active: null };
  const getSnapshot = (): SystemDialogSessionSnapshotV1 => {
    const active = internal.getHostRenderSnapshotInternalV1().entries.find(
      (entry): entry is SystemDialogRootHostRenderEntryInternalV1 =>
        entry.kind === "root" && entry.phase === "active",
    )?.rootRequest ?? null;
    if (snapshot.active === active) return snapshot;
    snapshot = { active };
    return snapshot;
  };
  const facade = ({
    getSnapshot,
    openSettings: () => internal.openRootInternalV1("settings"),
    openSaves: () => internal.openRootInternalV1("saves"),
  }) as SystemDialogSessionV1;
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
