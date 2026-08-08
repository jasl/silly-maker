// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  ExportedSaveV1,
  ManualSaveSlotIdV1,
  PersistenceOperationResultV1,
  PersistenceStatusV1,
  SaveExportOperationResultV1,
  SaveSlotHealthV1,
  SaveSlotSummaryV1,
} from "@sillymaker/base";
import { manualSaveSlotIndexV1 } from "@sillymaker/base";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement } from "react";
import { Button } from "../primitives/button.tsx";
import type { SystemDialogSavesConfirmationIntentInternalV1 } from "../system/system-dialog-managed-host.tsx";
import type {
  SystemDialogConfirmationOperationBindingInternalV1,
  SystemDialogConfirmationResultDeliveryInternalV1,
} from "../system/system-dialog-managed-session.ts";
import styles from "./save-overlay.module.css";

export type SaveUiWritableSlotIdV1 = "quick" | ManualSaveSlotIdV1;
export type SaveUiReadableSlotIdV1 = "auto.current" | "auto.previous" | SaveUiWritableSlotIdV1;
export type SaveUiImportFileRejectionCodeV1 = "too_large" | "unsupported_type";
export type SaveUiImportResultV1 =
  | PersistenceOperationResultV1
  | { readonly kind: "cancelled" }
  | { readonly kind: "rejected"; readonly code: SaveUiImportFileRejectionCodeV1 };

/**
 * The UI consumes the existing player-safe persistence port. The sync-or-Promise status return
 * is the only structural compatibility allowance: the runtime exposes an asynchronous
 * read, while application shells may already hold the same immutable status value.
 */
export interface SaveOverlayPortV1 {
  getStatus(): DeepReadonly<PersistenceStatusV1> | Promise<DeepReadonly<PersistenceStatusV1>>;
  listSlots(): Promise<readonly DeepReadonly<SaveSlotSummaryV1>[]>;
  save(slotId: SaveUiWritableSlotIdV1): Promise<PersistenceOperationResultV1>;
  load(slotId: SaveUiReadableSlotIdV1): Promise<PersistenceOperationResultV1>;
  clear(slotId: SaveUiReadableSlotIdV1): Promise<PersistenceOperationResultV1>;
  /** Rewrites the stored record's player note (empty string clears it). */
  annotateSave(slotId: SaveUiWritableSlotIdV1, note: string): Promise<PersistenceOperationResultV1>;
  importSave(): Promise<SaveUiImportResultV1>;
  exportSave(slotId: SaveUiReadableSlotIdV1): Promise<SaveExportOperationResultV1>;
  exportCurrentSave(): Promise<ExportedSaveV1>;
}

type PersistenceRejectedCodeV1 = Extract<
  PersistenceOperationResultV1,
  { readonly kind: "rejected" }
>["code"];
type ExportRejectedCodeV1 = Extract<
  SaveExportOperationResultV1,
  { readonly kind: "rejected" }
>["code"];

/** Fixed names for the system slots plus a formatter for numbered manual slots. */
export interface SaveOverlaySlotNamesV1 {
  readonly "auto.current": string;
  readonly "auto.previous": string;
  readonly quick: string;
  readonly manualSlot: (index: number) => string;
}

export interface SaveOverlayLabelsV1 {
  readonly accessibleName: string;
  readonly title: string;
  readonly storageLoading: string;
  readonly storageReady: string;
  readonly storageBusy: string;
  readonly storageUnavailable: string;
  readonly slotsUnavailable: string;
  readonly safelySaved: (commandSequence: number) => string;
  readonly lastFailure: (code: string) => string;
  readonly slotNames: SaveOverlaySlotNamesV1;
  readonly slotHealth: Readonly<Record<SaveSlotHealthV1, string>>;
  readonly quickSave: string;
  readonly manualSave: string;
  /** Formats a slot's savedAt instant; defaults to the locale string. */
  readonly savedAtText?: (isoInstant: string) => string;
  readonly importSave: string;
  readonly exportCurrentSave: string;
  readonly loadSlot: (slotName: string) => string;
  readonly clearSlot: (slotName: string) => string;
  readonly exportSlot: (slotName: string) => string;
  readonly confirmation: {
    readonly loadTitle: (slotName: string) => string;
    readonly loadDescription: (slotName: string) => string;
    readonly clearTitle: (slotName: string) => string;
    readonly clearDescription: (slotName: string) => string;
    readonly importTitle: string;
    readonly importDescription: string;
    readonly confirmLabel: string;
    readonly cancelLabel: string;
    readonly pendingText: string;
    readonly completedText: string;
    readonly failedText: string;
  };
  readonly operation: {
    readonly saving: (slotName: string) => string;
    readonly loading: (slotName: string) => string;
    readonly clearing: (slotName: string) => string;
    readonly importing: string;
    readonly exporting: (slotName: string) => string;
    readonly exportingCurrent: string;
    readonly saved: (slotName: string) => string;
    readonly cleared: (slotName: string) => string;
    readonly loadedExact: string;
    readonly loadedAdopted: string;
    readonly importedExact: string;
    readonly importedAdopted: string;
    readonly importCancelled: string;
    readonly importFileRejected: Readonly<Record<SaveUiImportFileRejectionCodeV1, string>>;
    readonly exported: (slotName: string) => string;
    readonly exportedCurrent: string;
    readonly rejected: Readonly<Record<PersistenceRejectedCodeV1, string>>;
    readonly exportRejected: Readonly<Record<ExportRejectedCodeV1, string>>;
    readonly faulted: (code: string) => string;
    readonly unexpectedFailure: string;
  };
}

/**
 * Story-declared safepoint. Authoritative snapshots are always committed
 * atomically, so persistence itself never tears — the guard expresses the
 * game-design boundary (no manual saves mid-dialogue, mid-battle…). Manual
 * writes are disabled with the stated reason; loads and exports stay open.
 */
export interface SaveOverlayGuardV1 {
  readonly allowed: boolean;
  readonly reasonText?: string;
}

export interface SaveOverlayGuardProjectionInternalV1 {
  getSnapshot(): unknown;
  subscribe(listener: () => void): () => void;
  evaluate(publication: unknown): SaveOverlayGuardV1 | undefined;
}

export interface SaveOverlayContentPropsInternalV1 {
  readonly port: SaveOverlayPortV1;
  readonly labels: SaveOverlayLabelsV1;
  readonly guard?: SaveOverlayGuardV1;
  readonly guardProjection?: SaveOverlayGuardProjectionInternalV1;
  readonly confirmationIntent: SystemDialogSavesConfirmationIntentInternalV1;
  readonly closeLabel: string;
  onCloseInternalV1(): void;
}

function slotNameV1(labels: SaveOverlayLabelsV1, slotId: SaveUiReadableSlotIdV1): string {
  if (slotId === "auto.current" || slotId === "auto.previous" || slotId === "quick") {
    return labels.slotNames[slotId];
  }
  const index = manualSaveSlotIndexV1(slotId);
  if (index === null) throw new TypeError(`ui.save_overlay_unknown_slot:${slotId}`);
  return labels.slotNames.manualSlot(index);
}

function writableSlotIdV1(slotId: SaveUiReadableSlotIdV1): SaveUiWritableSlotIdV1 | null {
  if (slotId === "quick") return slotId;
  return manualSaveSlotIndexV1(slotId) === null ? null : (slotId as SaveUiWritableSlotIdV1);
}

type SlotReadStateV1 =
  | {
    readonly kind: "loading";
    /** Last known slot list so rows survive a refresh (kept disabled). */
    readonly slots: readonly DeepReadonly<SaveSlotSummaryV1>[] | null;
  }
  | {
    readonly kind: "ready";
    readonly status: DeepReadonly<PersistenceStatusV1>;
    readonly slots: readonly DeepReadonly<SaveSlotSummaryV1>[];
  }
  | { readonly kind: "failed" };

type SaveOperationContextV1 =
  | { readonly kind: "save"; readonly slotId: SaveUiWritableSlotIdV1 }
  | { readonly kind: "load"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "clear"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "export"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "import" | "export_current" };

type PersistenceOperationViewResultV1 =
  | { readonly kind: "saved" | "cleared"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "loaded" | "imported"; readonly compatibility: "exact" | "adopted" }
  | { readonly kind: "rejected"; readonly code: PersistenceRejectedCodeV1 }
  | { readonly kind: "faulted"; readonly code: string };

type SaveExportOperationViewResultV1 =
  | { readonly kind: "exported"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "rejected"; readonly code: ExportRejectedCodeV1 }
  | { readonly kind: "faulted"; readonly code: string };

type SaveImportFileSelectionViewResultV1 =
  | { readonly kind: "cancelled" }
  | { readonly kind: "rejected"; readonly code: SaveUiImportFileRejectionCodeV1 };

type SaveOperationViewV1 =
  | { readonly kind: "idle" }
  | { readonly kind: "pending"; readonly context: SaveOperationContextV1 }
  | {
    readonly kind: "persistence_result";
    readonly context: Exclude<
      SaveOperationContextV1,
      { readonly kind: "export" | "export_current" }
    >;
    readonly result: PersistenceOperationViewResultV1;
  }
  | {
    readonly kind: "export_result";
    readonly context: Extract<SaveOperationContextV1, { readonly kind: "export" }>;
    readonly result: SaveExportOperationViewResultV1;
  }
  | {
    readonly kind: "import_file_selection_result";
    readonly result: SaveImportFileSelectionViewResultV1;
  }
  | { readonly kind: "current_exported" }
  | { readonly kind: "unexpected_failure" };

type ConfirmedSaveOperationV1 =
  | { readonly kind: "load" | "clear"; readonly slotId: SaveUiReadableSlotIdV1 }
  | { readonly kind: "import" };

function unreachableV1(value: never): never {
  throw new TypeError(`ui.save_overlay_unreachable:${String(value)}`);
}

function slotHealthTextV1(health: SaveSlotHealthV1, labels: SaveOverlayLabelsV1): string {
  switch (health) {
    case "empty":
      return labels.slotHealth.empty;
    case "valid":
      return labels.slotHealth.valid;
    case "invalid":
      return labels.slotHealth.invalid;
    case "recovery_candidate":
      return labels.slotHealth.recovery_candidate;
    case "unavailable":
      return labels.slotHealth.unavailable;
    default:
      return unreachableV1(health);
  }
}

function persistenceRejectedTextV1(
  code: PersistenceRejectedCodeV1,
  labels: SaveOverlayLabelsV1,
): string {
  switch (code) {
    case "busy":
      return labels.operation.rejected.busy;
    case "unavailable":
      return labels.operation.rejected.unavailable;
    case "empty_slot":
      return labels.operation.rejected.empty_slot;
    case "conflict":
      return labels.operation.rejected.conflict;
    case "invalid_record":
      return labels.operation.rejected.invalid_record;
    case "invalid_note":
      return labels.operation.rejected.invalid_note;
    case "lineage_limit":
      return labels.operation.rejected.lineage_limit;
    case "migration_unavailable":
      return labels.operation.rejected.migration_unavailable;
    case "migration_rejected":
      return labels.operation.rejected.migration_rejected;
    case "incompatible":
      return labels.operation.rejected.incompatible;
    default:
      return unreachableV1(code);
  }
}

function exportRejectedTextV1(code: ExportRejectedCodeV1, labels: SaveOverlayLabelsV1): string {
  switch (code) {
    case "unavailable":
      return labels.operation.exportRejected.unavailable;
    case "empty_slot":
      return labels.operation.exportRejected.empty_slot;
    case "conflict":
      return labels.operation.exportRejected.conflict;
    case "invalid_record":
      return labels.operation.exportRejected.invalid_record;
    default:
      return unreachableV1(code);
  }
}

function persistenceResultTextV1(
  result: PersistenceOperationViewResultV1,
  labels: SaveOverlayLabelsV1,
): string {
  switch (result.kind) {
    case "saved":
      return labels.operation.saved(slotNameV1(labels, result.slotId));
    case "cleared":
      return labels.operation.cleared(slotNameV1(labels, result.slotId));
    case "loaded":
      switch (result.compatibility) {
        case "exact":
          return labels.operation.loadedExact;
        case "adopted":
          return labels.operation.loadedAdopted;
        default:
          return unreachableV1(result.compatibility);
      }
    case "imported":
      switch (result.compatibility) {
        case "exact":
          return labels.operation.importedExact;
        case "adopted":
          return labels.operation.importedAdopted;
        default:
          return unreachableV1(result.compatibility);
      }
    case "rejected":
      return persistenceRejectedTextV1(result.code, labels);
    case "faulted":
      return labels.operation.faulted(result.code);
    default:
      return unreachableV1(result);
  }
}

function exportResultTextV1(
  result: SaveExportOperationViewResultV1,
  labels: SaveOverlayLabelsV1,
): string {
  switch (result.kind) {
    case "exported":
      return labels.operation.exported(slotNameV1(labels, result.slotId));
    case "rejected":
      return exportRejectedTextV1(result.code, labels);
    case "faulted":
      return labels.operation.faulted(result.code);
    default:
      return unreachableV1(result);
  }
}

function projectPersistenceResultV1(
  result: PersistenceOperationResultV1,
): PersistenceOperationViewResultV1 {
  switch (result.kind) {
    case "saved":
    case "cleared":
      return Object.freeze({ kind: result.kind, slotId: result.slotId });
    case "loaded":
    case "imported":
      return Object.freeze({ kind: result.kind, compatibility: result.compatibility });
    case "rejected":
      return Object.freeze({ kind: result.kind, code: result.code });
    case "faulted":
      return Object.freeze({ kind: result.kind, code: result.code });
    default:
      return unreachableV1(result);
  }
}

function projectExportResultV1(
  result: SaveExportOperationResultV1,
): SaveExportOperationViewResultV1 {
  switch (result.kind) {
    case "exported":
      return Object.freeze({ kind: result.kind, slotId: result.slotId });
    case "rejected":
      return Object.freeze({ kind: result.kind, code: result.code });
    case "faulted":
      return Object.freeze({ kind: result.kind, code: result.code });
    default:
      return unreachableV1(result);
  }
}

function projectImportResultV1(
  result: SaveUiImportResultV1,
):
  | Extract<SaveOperationViewV1, { readonly kind: "persistence_result" }>
  | Extract<SaveOperationViewV1, { readonly kind: "import_file_selection_result" }> {
  const context = Object.freeze({ kind: "import" as const });
  if (result.kind === "cancelled") {
    return Object.freeze({
      kind: "import_file_selection_result",
      result: Object.freeze({ kind: "cancelled" }),
    });
  }
  if (result.kind === "rejected") {
    switch (result.code) {
      case "too_large":
      case "unsupported_type":
        return Object.freeze({
          kind: "import_file_selection_result",
          result: Object.freeze({ kind: "rejected", code: result.code }),
        });
      default:
        return Object.freeze({
          kind: "persistence_result",
          context,
          result: Object.freeze({ kind: "rejected", code: result.code }),
        });
    }
  }
  return Object.freeze({
    kind: "persistence_result",
    context,
    result: projectPersistenceResultV1(result),
  });
}

function pendingTextV1(context: SaveOperationContextV1, labels: SaveOverlayLabelsV1): string {
  switch (context.kind) {
    case "save":
      return labels.operation.saving(slotNameV1(labels, context.slotId));
    case "load":
      return labels.operation.loading(slotNameV1(labels, context.slotId));
    case "clear":
      return labels.operation.clearing(slotNameV1(labels, context.slotId));
    case "import":
      return labels.operation.importing;
    case "export":
      return labels.operation.exporting(slotNameV1(labels, context.slotId));
    case "export_current":
      return labels.operation.exportingCurrent;
    default:
      return unreachableV1(context);
  }
}

function operationTextV1(state: SaveOperationViewV1, labels: SaveOverlayLabelsV1): string {
  switch (state.kind) {
    case "idle":
      return "";
    case "pending":
      return pendingTextV1(state.context, labels);
    case "persistence_result":
      return persistenceResultTextV1(state.result, labels);
    case "export_result":
      return exportResultTextV1(state.result, labels);
    case "import_file_selection_result":
      return state.result.kind === "cancelled"
        ? labels.operation.importCancelled
        : labels.operation.importFileRejected[state.result.code];
    case "current_exported":
      return labels.operation.exportedCurrent;
    case "unexpected_failure":
      return labels.operation.unexpectedFailure;
    default:
      return unreachableV1(state);
  }
}

function storageStatusTextV1(readState: SlotReadStateV1, labels: SaveOverlayLabelsV1): string {
  switch (readState.kind) {
    case "loading":
      return labels.storageLoading;
    case "failed":
      return labels.slotsUnavailable;
    case "ready":
      if (!readState.status.available) return labels.storageUnavailable;
      if (readState.status.busy) return labels.storageBusy;
      return labels.storageReady;
    default:
      return unreachableV1(readState);
  }
}

function defaultSavedAtTextV1(isoInstant: string): string {
  const parsed = new Date(isoInstant);
  return Number.isNaN(parsed.getTime()) ? isoInstant : parsed.toLocaleString();
}

function canLoadSlotV1(health: SaveSlotHealthV1 | null): boolean {
  return health === "valid" || health === "recovery_candidate";
}

function canClearSlotV1(health: SaveSlotHealthV1 | null): boolean {
  return health === "valid" || health === "invalid" || health === "recovery_candidate";
}

function canExportSlotV1(health: SaveSlotHealthV1 | null): boolean {
  return health === "valid" || health === "recovery_candidate";
}

const staticGuardPublicationInternalV1 = Object.freeze({});

function subscribeStaticGuardInternalV1(_listener: () => void): () => void {
  return () => undefined;
}

function getStaticGuardPublicationInternalV1(): unknown {
  return staticGuardPublicationInternalV1;
}

export function SaveOverlayContentInternalV1(
  props: SaveOverlayContentPropsInternalV1,
): ReactElement {
  const [readState, setReadState] = useState<SlotReadStateV1>(() =>
    Object.freeze({ kind: "loading", slots: null })
  );
  const [operationState, setOperationState] = useState<SaveOperationViewV1>(() =>
    Object.freeze({ kind: "idle" })
  );
  const mountedRef = useRef(true);
  const readGenerationRef = useRef(0);
  const operationActiveRef = useRef(false);
  const confirmedOperationTokenRef = useRef<object | null>(null);

  const guardPublication = useSyncExternalStore(
    props.guardProjection?.subscribe ?? subscribeStaticGuardInternalV1,
    props.guardProjection?.getSnapshot ?? getStaticGuardPublicationInternalV1,
    props.guardProjection?.getSnapshot ?? getStaticGuardPublicationInternalV1,
  );
  const guard = props.guardProjection === undefined
    ? props.guard
    : props.guardProjection.evaluate(guardPublication);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      readGenerationRef.current += 1;
      confirmedOperationTokenRef.current = null;
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const generation = readGenerationRef.current + 1;
    readGenerationRef.current = generation;
    if (mountedRef.current) {
      setReadState((previous) =>
        Object.freeze({
          kind: "loading",
          slots: previous.kind === "failed" ? null : previous.slots,
        })
      );
    }
    try {
      const [status, slots] = await Promise.all([props.port.getStatus(), props.port.listSlots()]);
      if (!mountedRef.current || readGenerationRef.current !== generation) return;
      setReadState(
        Object.freeze({
          kind: "ready",
          status,
          slots: Object.freeze([...slots]),
        }),
      );
    } catch {
      if (!mountedRef.current || readGenerationRef.current !== generation) return;
      setReadState(Object.freeze({ kind: "failed" }));
    }
  }, [props.port]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const finishOperationV1 = useCallback((): void => {
    operationActiveRef.current = false;
    if (mountedRef.current) void refresh();
  }, [refresh]);

  const runPersistenceOperationV1 = useCallback(
    async (
      context: Exclude<SaveOperationContextV1, { readonly kind: "export" | "export_current" }>,
      operation: () => Promise<PersistenceOperationResultV1>,
    ): Promise<PersistenceOperationResultV1 | null> => {
      if (operationActiveRef.current) return null;
      operationActiveRef.current = true;
      if (mountedRef.current) setOperationState(Object.freeze({ kind: "pending", context }));
      try {
        const result = await operation();
        if (mountedRef.current) {
          setOperationState(
            Object.freeze({
              kind: "persistence_result",
              context,
              result: projectPersistenceResultV1(result),
            }),
          );
        }
        return result;
      } catch {
        if (mountedRef.current) {
          setOperationState(Object.freeze({ kind: "unexpected_failure" }));
        }
        throw new Error("ui.persistence_operation_threw");
      } finally {
        finishOperationV1();
      }
    },
    [finishOperationV1],
  );

  const runExportOperationV1 = useCallback(
    async (
      context: Extract<SaveOperationContextV1, { readonly kind: "export" }>,
    ): Promise<void> => {
      if (operationActiveRef.current) return;
      operationActiveRef.current = true;
      if (mountedRef.current) setOperationState(Object.freeze({ kind: "pending", context }));
      try {
        const result = await props.port.exportSave(context.slotId);
        if (mountedRef.current) {
          setOperationState(
            Object.freeze({
              kind: "export_result",
              context,
              result: projectExportResultV1(result),
            }),
          );
        }
      } catch {
        if (mountedRef.current) {
          setOperationState(Object.freeze({ kind: "unexpected_failure" }));
        }
      } finally {
        finishOperationV1();
      }
    },
    [finishOperationV1, props.port],
  );

  const runCurrentExportV1 = useCallback(async (): Promise<void> => {
    if (operationActiveRef.current) return;
    operationActiveRef.current = true;
    const context = Object.freeze({ kind: "export_current" as const });
    if (mountedRef.current) setOperationState(Object.freeze({ kind: "pending", context }));
    try {
      await props.port.exportCurrentSave();
      if (mountedRef.current) setOperationState(Object.freeze({ kind: "current_exported" }));
    } catch {
      if (mountedRef.current) setOperationState(Object.freeze({ kind: "unexpected_failure" }));
    } finally {
      finishOperationV1();
    }
  }, [finishOperationV1, props.port]);

  const requestConfirmedOperationV1 = useCallback(
    (invocation: ConfirmedSaveOperationV1): void => {
      const exactInvocation = Object.freeze(invocation);
      const operationToken = Object.freeze({});
      let resultDelivered = false;

      const operationBinding = Object.freeze({
        async dispatch(
          dispatchedInvocation: DeepReadonly<ConfirmedSaveOperationV1>,
        ) {
          if (
            dispatchedInvocation.kind !== exactInvocation.kind ||
            ((exactInvocation.kind === "load" || exactInvocation.kind === "clear") &&
              (dispatchedInvocation.kind === "import" ||
                dispatchedInvocation.slotId !== exactInvocation.slotId))
          ) {
            throw new TypeError("ui.save_overlay_confirmation_invocation_mismatch");
          }
          if (operationActiveRef.current) {
            throw new Error("ui.persistence_operation_busy");
          }

          operationActiveRef.current = true;
          confirmedOperationTokenRef.current = operationToken;
          if (mountedRef.current) {
            setOperationState(Object.freeze({ kind: "pending", context: exactInvocation }));
          }

          switch (exactInvocation.kind) {
            case "load": {
              const result = await props.port.load(exactInvocation.slotId);
              return result.kind === "loaded"
                ? Object.freeze({ kind: "successor" as const })
                : Object.freeze({ kind: "retain_root" as const, result });
            }
            case "clear": {
              const result = await props.port.clear(exactInvocation.slotId);
              return Object.freeze({ kind: "retain_root" as const, result });
            }
            case "import": {
              const result = await props.port.importSave();
              return result.kind === "imported"
                ? Object.freeze({ kind: "successor" as const })
                : Object.freeze({ kind: "retain_root" as const, result });
            }
            default:
              return unreachableV1(exactInvocation);
          }
        },
        resultSink(delivery: SystemDialogConfirmationResultDeliveryInternalV1): void {
          if (
            confirmedOperationTokenRef.current !== operationToken ||
            !mountedRef.current
          ) return;

          if (delivery.kind === "faulted") {
            resultDelivered = true;
            setOperationState(Object.freeze({ kind: "unexpected_failure" }));
            return;
          }

          try {
            switch (exactInvocation.kind) {
              case "load":
              case "clear":
                setOperationState(
                  Object.freeze({
                    kind: "persistence_result",
                    context: exactInvocation,
                    result: projectPersistenceResultV1(
                      delivery.result as PersistenceOperationResultV1,
                    ),
                  }),
                );
                break;
              case "import":
                setOperationState(projectImportResultV1(delivery.result as SaveUiImportResultV1));
                break;
              default:
                unreachableV1(exactInvocation);
            }
            resultDelivered = true;
          } catch {
            resultDelivered = true;
            setOperationState(Object.freeze({ kind: "unexpected_failure" }));
            throw new TypeError("ui.save_overlay_operation_result_invalid");
          }
        },
        finalizeExactRoot(): void {
          if (
            confirmedOperationTokenRef.current !== operationToken ||
            !mountedRef.current
          ) return;
          confirmedOperationTokenRef.current = null;
          operationActiveRef.current = false;
          if (!resultDelivered) {
            setOperationState((previous) =>
              previous.kind === "pending" && previous.context === exactInvocation
                ? Object.freeze({ kind: "idle" })
                : previous
            );
          }
          void refresh();
        },
      }) satisfies SystemDialogConfirmationOperationBindingInternalV1;

      props.confirmationIntent.requestConfirmationInternalV1(
        Object.freeze({ invocation: exactInvocation, operationBinding }),
      );
    },
    [props.confirmationIntent, props.port, refresh],
  );

  const status = readState.kind === "ready" ? readState.status : null;
  const operationPending = operationState.kind === "pending";
  const storageOperationsEnabled = status?.available === true && !status.busy && !operationPending;
  const saveAllowed = guard?.allowed !== false;
  const writeOperationsEnabled = storageOperationsEnabled && saveAllowed;

  return (
    <section
      className={styles["save-overlay"]}
      aria-label={props.labels.accessibleName}
      data-save-overlay="true"
    >
      <header className={styles["save-overlay__header"]}>
        <h2>{props.labels.title}</h2>
        <Button data-save-overlay-close="true" onClick={props.onCloseInternalV1}>
          {props.closeLabel}
        </Button>
        {saveAllowed || guard?.reasonText === undefined
          ? null
          : (
            <p role="status" data-save-guard="blocked">
              {guard.reasonText}
            </p>
          )}
        <p role="status" aria-live="polite">
          {storageStatusTextV1(readState, props.labels)}
        </p>
        {status?.safelySavedCommandSequence === null ||
            status?.safelySavedCommandSequence === undefined
          ? null
          : <p>{props.labels.safelySaved(status.safelySavedCommandSequence)}</p>}
        {status?.lastFailureCode === null || status?.lastFailureCode === undefined
          ? null
          : <p>{props.labels.lastFailure(status.lastFailureCode)}</p>}
      </header>

      <ul className={styles["save-overlay__slots"]}>
        {(readState.kind === "failed" ? [] : (readState.slots ?? [])).map((summary) => {
          const slotId = summary.slotId as SaveUiReadableSlotIdV1;
          const health = readState.kind === "ready" ? summary.health : null;
          const slotName = slotNameV1(props.labels, slotId);
          const writableSlotId = writableSlotIdV1(slotId);
          return (
            <li key={slotId} className={styles["save-overlay__slot"]} data-slot-id={slotId}>
              <h3>{slotName}</h3>
              <p data-slot-health={health ?? "unreadable"}>
                {health === null
                  ? props.labels.storageLoading
                  : slotHealthTextV1(health, props.labels)}
              </p>
              {summary.savedAt === null ? null : (
                <p data-slot-saved-at={summary.savedAt}>
                  {(props.labels.savedAtText ?? defaultSavedAtTextV1)(summary.savedAt)}
                </p>
              )}
              <div className={styles["save-overlay__slot-actions"]}>
                {writableSlotId === null ? null : (
                  <Button
                    disabled={!writeOperationsEnabled}
                    onClick={() =>
                      void runPersistenceOperationV1(
                        Object.freeze({ kind: "save", slotId: writableSlotId }),
                        () => props.port.save(writableSlotId),
                      ).catch(() => undefined)}
                  >
                    {writableSlotId === "quick" ? props.labels.quickSave : props.labels.manualSave}
                  </Button>
                )}
                <Button
                  disabled={!storageOperationsEnabled || !canLoadSlotV1(health)}
                  onClick={() =>
                    requestConfirmedOperationV1(Object.freeze({ kind: "load", slotId }))}
                >
                  {props.labels.loadSlot(slotName)}
                </Button>
                <Button
                  disabled={!storageOperationsEnabled || !canClearSlotV1(health)}
                  onClick={() =>
                    requestConfirmedOperationV1(Object.freeze({ kind: "clear", slotId }))}
                >
                  {props.labels.clearSlot(slotName)}
                </Button>
                <Button
                  disabled={!storageOperationsEnabled || !canExportSlotV1(health)}
                  onClick={() =>
                    void runExportOperationV1(Object.freeze({ kind: "export", slotId }))}
                >
                  {props.labels.exportSlot(slotName)}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles["save-overlay__global-actions"]}>
        <Button
          disabled={!storageOperationsEnabled}
          onClick={() => requestConfirmedOperationV1(Object.freeze({ kind: "import" }))}
        >
          {props.labels.importSave}
        </Button>
        <Button disabled={operationPending} onClick={() => void runCurrentExportV1()}>
          {props.labels.exportCurrentSave}
        </Button>
      </div>

      <p
        className={styles["save-overlay__result"]}
        data-testid="save-operation-result"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {operationTextV1(operationState, props.labels)}
      </p>
    </section>
  );
}
