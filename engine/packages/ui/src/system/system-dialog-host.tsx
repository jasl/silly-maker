// SPDX-License-Identifier: MIT
import { manualSaveSlotIndexV1 } from "@sillymaker/base";
import { createElement, useMemo, useSyncExternalStore } from "react";
import type { ComponentType, ElementType, ExoticComponent, ReactElement, ReactNode } from "react";

import type { InputRouterV1 } from "../input/contracts.ts";
import { ActionConfirmationContentV1 } from "../overlays/action-confirmation-dialog.tsx";
import {
  SaveOverlayContentInternalV1,
  type SaveOverlayGuardV1,
  type SaveOverlayLabelsV1,
  type SaveOverlayPortV1,
  type SaveUiReadableSlotIdV1,
} from "../persistence/save-overlay.tsx";
import { SettingsDialogContentV1 } from "./settings-dialog.tsx";
import type { SettingsDialogContentPropsInternalV1 } from "./settings-dialog.tsx";
import type {
  SystemDialogConfirmationInvocationInternalV1,
  SystemDialogOpenResultV1,
  SystemDialogRequiredPortBindingInternalV1,
  SystemDialogSessionV1,
} from "./system-dialog-managed-contract.ts";
import {
  SystemDialogManagedHostInternalV1,
  type SystemDialogConfirmationRendererPropsInternalV1,
  type SystemDialogRootRendererPropsInternalV1,
} from "./system-dialog-managed-host.tsx";
import {
  createSystemDialogRootCatalogSnapshotInternalV1,
  resolveSystemDialogSessionInternalV1,
  type SystemDialogCustomSavesContentConfigInternalV1,
  type SystemDialogRootCatalogInternalV1,
  type SystemDialogSavesContentConfigInternalV1,
  type SystemDialogSettingsContentConfigInternalV1,
  type SystemDialogStandardSavesContentConfigInternalV1,
} from "./system-dialog-managed-session.ts";
import {
  SystemDialogControllerProviderInternalV1,
  useSystemDialogControllerV1,
} from "./use-system-dialog-controller.tsx";
import type { SystemDialogControllerV1 } from "./use-system-dialog-controller.tsx";

export type SystemDialogSettingsV1 = Omit<SettingsDialogContentPropsInternalV1, "close">;

export interface SystemDialogSavesV1 {
  readonly port: SaveOverlayPortV1;
  readonly labels: SaveOverlayLabelsV1;
  /** Live read-only Story safepoint projection; it is never another state writer. */
  readonly guardProjection?: SystemDialogSaveGuardProjectionV1;
}

export interface SystemDialogSaveGuardProjectionV1 {
  getSnapshot(): unknown;
  subscribe(listener: () => void): () => void;
  evaluate(publication: unknown): SaveOverlayGuardV1 | undefined;
}

export interface SystemDialogCustomSavesRenderIntentsV1 {
  close(): void;
}

export type SystemDialogCustomSavesComponentV1 =
  | ComponentType<SystemDialogCustomSavesRenderIntentsV1>
  | ExoticComponent<SystemDialogCustomSavesRenderIntentsV1>;

export interface SystemDialogCustomSavesV1 {
  readonly kind: "custom";
  readonly accessibleName: string;
  readonly component: SystemDialogCustomSavesComponentV1;
}

export interface SystemDialogHostPropsV1 {
  readonly session: SystemDialogSessionV1;
  readonly inputRouter: InputRouterV1;
  readonly settings: SystemDialogSettingsV1;
  /** Enables the System Save root; absent means openSaves rejects before mutation. */
  readonly saves?: SystemDialogSavesV1 | SystemDialogCustomSavesV1;
  readonly children: ReactNode;
}

export type { SystemDialogControllerV1 };
export { useSystemDialogControllerV1 };

const savesPortIdInternalV1 = "persistence.player-save";

function isCustomSavesV1(
  saves: SystemDialogSavesV1 | SystemDialogCustomSavesV1,
): saves is SystemDialogCustomSavesV1 {
  return "kind" in saves && saves.kind === "custom";
}

function requiredSavePortInternalV1(
  bindings: readonly SystemDialogRequiredPortBindingInternalV1[],
): SaveOverlayPortV1 {
  const binding = bindings.find(({ portId }) => portId === savesPortIdInternalV1);
  if (binding === undefined) throw new TypeError("ui.system_dialog_required_save_port_missing");
  return binding.port as SaveOverlayPortV1;
}

function SystemDialogSettingsRendererInternalV1(
  props: SystemDialogRootRendererPropsInternalV1,
): ReactElement {
  const config = props.contentConfig as SystemDialogSettingsContentConfigInternalV1;
  return (
    <SettingsDialogContentV1
      title={config.title}
      closeLabel={config.closeLabel}
      sections={config.sections}
      emptyText={config.emptyText}
      close={props.rootIntent.close}
    />
  );
}

function SystemDialogSavesRendererInternalV1(
  props: SystemDialogRootRendererPropsInternalV1,
): ReactElement {
  const config = props.contentConfig as SystemDialogSavesContentConfigInternalV1;
  if (config.variant === "custom") {
    const component = config.component as ElementType<SystemDialogCustomSavesRenderIntentsV1>;
    return createElement(component, { close: props.rootIntent.close });
  }
  if (props.confirmationIntent === null) {
    throw new TypeError("ui.system_dialog_confirmation_intent_missing");
  }
  return (
    <SaveOverlayContentInternalV1
      port={requiredSavePortInternalV1(props.requiredPortBindings)}
      labels={config.labels}
      closeLabel={config.closeLabel}
      {...(config.guardProjection === undefined ? {} : { guardProjection: config.guardProjection })}
      confirmationIntent={props.confirmationIntent}
      onCloseInternalV1={props.rootIntent.close}
    />
  );
}

function saveSlotNameInternalV1(
  labels: Pick<SaveOverlayLabelsV1, "slotNames">,
  slotId: SaveUiReadableSlotIdV1,
): string {
  if (slotId === "auto.current" || slotId === "auto.previous" || slotId === "quick") {
    return labels.slotNames[slotId];
  }
  const index = manualSaveSlotIndexV1(slotId);
  if (index === null) throw new TypeError("ui.system_dialog_confirmation_slot_invalid");
  return labels.slotNames.manualSlot(index);
}

type SystemDialogConfirmationCopyLabelsInternalV1 = Readonly<{
  slotNames: SaveOverlayLabelsV1["slotNames"];
  confirmation: Pick<
    SaveOverlayLabelsV1["confirmation"],
    | "loadTitle"
    | "loadDescription"
    | "clearTitle"
    | "clearDescription"
    | "importTitle"
    | "importDescription"
  >;
  recovery?: Readonly<{
    confirmation: Readonly<{
      reanchorTitle(slotName: string): string;
      reanchorDescription(slotName: string): string;
      restoreTitle(slotName: string): string;
      restoreDescription(slotName: string): string;
      discardTitle(slotName: string): string;
      discardDescription(slotName: string): string;
    }>;
  }>;
}>;

/** @internal Maps a normalized invocation to the captured Story-localized confirmation copy. */
export function resolveSystemDialogConfirmationCopyInternalV1(
  labels: SystemDialogConfirmationCopyLabelsInternalV1,
  invocation: SystemDialogConfirmationInvocationInternalV1,
): Readonly<{ readonly title: string; readonly description: string }> {
  if (invocation.kind === "import") {
    return {
      title: labels.confirmation.importTitle,
      description: labels.confirmation.importDescription,
    };
  }
  const slotName = saveSlotNameInternalV1(labels, invocation.slotId as SaveUiReadableSlotIdV1);
  const recoveryConfirmation = labels.recovery?.confirmation;
  switch (invocation.kind) {
    case "load":
      return {
        title: labels.confirmation.loadTitle(slotName),
        description: labels.confirmation.loadDescription(slotName),
      };
    case "clear":
      return {
        title: labels.confirmation.clearTitle(slotName),
        description: labels.confirmation.clearDescription(slotName),
      };
    case "reanchor":
      if (recoveryConfirmation === undefined) {
        throw new TypeError("ui.system_dialog_recovery_confirmation_missing");
      }
      return {
        title: recoveryConfirmation.reanchorTitle(slotName),
        description: recoveryConfirmation.reanchorDescription(slotName),
      };
    case "restore":
      if (recoveryConfirmation === undefined) {
        throw new TypeError("ui.system_dialog_recovery_confirmation_missing");
      }
      return {
        title: recoveryConfirmation.restoreTitle(slotName),
        description: recoveryConfirmation.restoreDescription(slotName),
      };
    case "discard":
      if (recoveryConfirmation === undefined) {
        throw new TypeError("ui.system_dialog_recovery_confirmation_missing");
      }
      return {
        title: recoveryConfirmation.discardTitle(slotName),
        description: recoveryConfirmation.discardDescription(slotName),
      };
  }
  throw new TypeError("ui.system_dialog_confirmation_invocation_invalid");
}

function SystemDialogConfirmationRendererInternalV1(
  props: SystemDialogConfirmationRendererPropsInternalV1,
): ReactElement {
  const parentConfig = props.parentContentConfig as SystemDialogSavesContentConfigInternalV1;
  if (parentConfig.variant !== "standard") {
    throw new TypeError("ui.system_dialog_confirmation_parent_invalid");
  }
  const copy = resolveSystemDialogConfirmationCopyInternalV1(
    parentConfig.labels,
    props.invocation,
  );
  return (
    <ActionConfirmationContentV1
      title={copy.title}
      titleId={props.titleId}
      description={copy.description}
      confirmLabel={parentConfig.labels.confirmation.confirmLabel}
      cancelLabel={parentConfig.labels.confirmation.cancelLabel}
      pendingText={parentConfig.labels.confirmation.pendingText}
      confirm={() => props.controller.dispatchOnceInternalV1()}
      cancel={() => props.controller.cancelInternalV1("back")}
    />
  );
}

function createCatalogInternalV1(input: {
  readonly settings: SystemDialogSettingsV1;
  readonly saves?: SystemDialogSavesV1 | SystemDialogCustomSavesV1;
}): SystemDialogRootCatalogInternalV1 {
  const saves = input.saves;
  const standardSaves = saves !== undefined && !isCustomSavesV1(saves) ? saves : null;
  const customSaves = saves !== undefined && isCustomSavesV1(saves) ? saves : null;
  const entries = [
    {
      rootRequest: "settings" as const,
      rendererComponent: SystemDialogSettingsRendererInternalV1,
      accessibleName: input.settings.title,
      requiredPortIds: [],
      contentConfig: {
        title: input.settings.title,
        closeLabel: input.settings.closeLabel,
        sections: input.settings.sections,
        emptyText: input.settings.emptyText,
      } satisfies SystemDialogSettingsContentConfigInternalV1,
    },
    ...(standardSaves === null
      ? customSaves === null ? [] : [{
        rootRequest: "saves" as const,
        rendererComponent: SystemDialogSavesRendererInternalV1,
        accessibleName: customSaves.accessibleName,
        requiredPortIds: [],
        contentConfig: {
          variant: "custom" as const,
          accessibleName: customSaves.accessibleName,
          component: customSaves.component,
        } satisfies SystemDialogCustomSavesContentConfigInternalV1,
      }]
      : [{
        rootRequest: "saves" as const,
        rendererComponent: SystemDialogSavesRendererInternalV1,
        accessibleName: standardSaves.labels.accessibleName,
        requiredPortIds: [savesPortIdInternalV1],
        contentConfig: {
          variant: "standard" as const,
          labels: standardSaves.labels,
          closeLabel: input.settings.closeLabel,
          ...(standardSaves.guardProjection === undefined
            ? {}
            : { guardProjection: standardSaves.guardProjection }),
        } satisfies SystemDialogStandardSavesContentConfigInternalV1,
      }]),
  ];
  return createSystemDialogRootCatalogSnapshotInternalV1({
    entries,
    portBindings: standardSaves === null
      ? []
      : [{ portId: savesPortIdInternalV1, port: standardSaves.port }],
    confirmationEntry: standardSaves === null ? null : {
      rendererComponent: SystemDialogConfirmationRendererInternalV1,
      accessibleName: standardSaves.labels.confirmation.importTitle,
      requiredPortIds: [],
    },
  });
}

/** Required managed System Host. It never creates a fallback lifecycle store. */
export function SystemDialogHostV1(props: SystemDialogHostPropsV1): ReactElement {
  const internalSession = resolveSystemDialogSessionInternalV1(props.session);
  const snapshot = useSyncExternalStore(
    internalSession.subscribeInternalV1,
    internalSession.getHostRenderSnapshotInternalV1,
    internalSession.getHostRenderSnapshotInternalV1,
  );
  const catalog = useMemo(
    () =>
      createCatalogInternalV1({
        settings: props.settings,
        ...(props.saves === undefined ? {} : { saves: props.saves }),
      }),
    [props.saves, props.settings],
  );
  const blocking = snapshot.entries.length > 0;

  return (
    <SystemDialogControllerProviderInternalV1 session={props.session}>
      <div
        data-system-dialog-host-content="true"
        inert={blocking || undefined}
        aria-hidden={blocking ? "true" : undefined}
      >
        {props.children}
      </div>
      <SystemDialogManagedHostInternalV1
        session={props.session}
        catalog={catalog}
        inputRouter={props.inputRouter}
      />
    </SystemDialogControllerProviderInternalV1>
  );
}

export type { SystemDialogOpenResultV1 };
