// SPDX-License-Identifier: MIT
import {
  isSaveSlotIdShapeV1,
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type SaveSlotIdV1,
} from "@sillymaker/base";

import { systemInputActionIdsV1 } from "../input/contracts.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { parseManagedSurfaceResolvedDefinitionV1 } from "../managed-surfaces/managed-surface-definition.ts";

declare const systemDialogSessionBrandV1: unique symbol;

export type SystemDialogSessionActiveSurfaceV1 = "settings" | "saves";

export interface SystemDialogSessionSnapshotV1 {
  readonly active: SystemDialogSessionActiveSurfaceV1 | null;
}

/** Opaque composition-created System lifecycle facade. */
export interface SystemDialogSessionV1 {
  readonly [systemDialogSessionBrandV1]: "SystemDialogSessionV1";
  getSnapshot(): SystemDialogSessionSnapshotV1;
  openSettings(): SystemDialogOpenResultV1;
  openSaves(): SystemDialogOpenResultV1;
}

export type SystemDialogOpenResultV1 =
  | {
    readonly kind: "preparing";
    readonly code: "system_dialog.preparation_started";
  }
  | {
    readonly kind: "applied";
    readonly code: "system_dialog.pending_replacement_cancelled";
  }
  | {
    readonly kind: "unchanged";
    readonly code: "system_dialog.already_requested";
  }
  | {
    readonly kind: "rejected";
    readonly code:
      | "system_dialog.renderer_unavailable"
      | "system_dialog.renderer_missing"
      | "system_dialog.required_port_missing"
      | "system_dialog.disposed";
    readonly portId?: string;
  }
  | {
    readonly kind: "faulted";
    readonly code:
      | "system_dialog.renderer_faulted"
      | "system_dialog.transition_faulted";
  };

export type SystemDialogRootRequestInternalV1 = SystemDialogSessionActiveSurfaceV1;
export type SystemDialogSavesRendererVariantInternalV1 = "standard" | "custom";
export type SystemDialogConfirmationOperationInternalV1 =
  | "load"
  | "clear"
  | "import"
  | "reanchor"
  | "restore"
  | "discard";

export type SystemDialogConfirmationInvocationInternalV1 =
  | {
    readonly kind: "load" | "clear" | "reanchor" | "restore" | "discard";
    readonly slotId: SaveSlotIdV1;
  }
  | {
    readonly kind: "import";
  };

export interface SystemDialogRequiredPortBindingInternalV1 {
  readonly portId: string;
  readonly port: unknown;
}

export interface SystemDialogContentConfigSnapshotInternalV1<TValue> {
  readonly value: TValue;
}

export interface SystemDialogRootCandidateResolutionSnapshotInternalV1<
  TRendererComponent,
  TContentConfigSnapshot,
> {
  readonly rootRequest: SystemDialogRootRequestInternalV1;
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly rendererComponent: TRendererComponent;
  readonly accessibleName: string;
  readonly requiredPortBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
  readonly contentConfigSnapshot: SystemDialogContentConfigSnapshotInternalV1<
    TContentConfigSnapshot
  >;
}

export interface SystemDialogConfirmationCandidateResolutionSnapshotInternalV1<
  TRendererComponent,
> {
  readonly invocation: SystemDialogConfirmationInvocationInternalV1;
  readonly definition: ManagedSurfaceResolvedDefinitionV1;
  readonly rendererComponent: TRendererComponent;
  readonly accessibleName: string;
  readonly requiredPortBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
}

interface SystemDialogManagedContractInternalV1 {
  readonly resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly definitions: {
    readonly settings: ManagedSurfaceResolvedDefinitionV1;
    readonly saves: ManagedSurfaceResolvedDefinitionV1;
    readonly confirmation: ManagedSurfaceResolvedDefinitionV1;
  };
  readonly rootRequests: readonly SystemDialogRootRequestInternalV1[];
  readonly savesRendererVariants: readonly SystemDialogSavesRendererVariantInternalV1[];
  readonly confirmationOperationKinds: readonly SystemDialogConfirmationOperationInternalV1[];
  readonly host: {
    readonly logicalLeaseCardinality: "single";
    readonly portalCardinality: "single";
    readonly catalogAuthorityCardinality: "single";
    readonly conflictCode: "ui.system_dialog_host_lease_conflict";
    readonly candidateResolution: "snapshot_per_candidate";
  };
}

const ownerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.system");
const rootSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.system.root");
const confirmationSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.system.confirmation");
const layerIdV1 = parseManagedSurfaceLayerIdV1("surface-layer.system");
const readinessV1 = {
  initialOpen: "blocking_fallback" as const,
  primaryReplacement: "retain_current" as const,
  childOpen: "blocking_fallback" as const,
};
const dismissV1 = {
  back: true,
  escape: true,
  backdrop: true,
  routedCancel: true,
};

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function snapshotRequiredPortBindingsV1(
  value: unknown,
): readonly SystemDialogRequiredPortBindingInternalV1[] {
  if (!Array.isArray(value)) throw new TypeError();
  const bindings: SystemDialogRequiredPortBindingInternalV1[] = [];
  const portIds = new Set<string>();
  for (const binding of value) {
    if (!isRecordV1(binding)) throw new TypeError();
    const portId = parseModuleId(binding.portId);
    const port = binding.port;
    if (
      port === null ||
      (typeof port !== "object" && typeof port !== "function") ||
      portIds.has(portId)
    ) {
      throw new TypeError();
    }
    portIds.add(portId);
    bindings.push({ portId, port });
  }
  return bindings;
}

function definitionV1(input: {
  readonly id: "settings" | "saves" | "action-confirmation";
  readonly placement: "root" | "child";
  readonly layerOrder: number;
  readonly actionIds: readonly string[];
}): ManagedSurfaceResolvedDefinitionV1 {
  return parseManagedSurfaceResolvedDefinitionV1({
    definitionId: parseManagedSurfaceDefinitionIdV1(`surface.system.${input.id}`),
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: ownerIdV1,
    slotId: input.placement === "root" ? rootSlotIdV1 : confirmationSlotIdV1,
    layerId: layerIdV1,
    layerOrder: parseNonNegativeSafeInteger(input.layerOrder),
    placement: input.placement,
    modality: "blocking",
    inputPolicy: { kind: "managed" as const, inputContextId: "system" as const },
    dismissPolicy: dismissV1,
    focusPolicy: {
      kind: "owns_focus" as const,
      initialTargetId: parseManagedSurfaceFocusTargetIdV1(`surface-focus.system.${input.id}`),
      trap: true,
      restore: "opener" as const,
    },
    navigationPolicy: { kind: "close" as const },
    actionIds: input.actionIds.map(parseManagedSurfaceActionIdV1),
    readiness: readinessV1,
  });
}

const settingsDefinitionV1 = definitionV1({
  id: "settings",
  placement: "root",
  layerOrder: 60,
  actionIds: [systemInputActionIdsV1.cancel],
});
const savesDefinitionV1 = definitionV1({
  id: "saves",
  placement: "root",
  layerOrder: 60,
  actionIds: [systemInputActionIdsV1.cancel],
});
const confirmationDefinitionV1 = definitionV1({
  id: "action-confirmation",
  placement: "child",
  layerOrder: 61,
  actionIds: [systemInputActionIdsV1.confirm, systemInputActionIdsV1.cancel],
});

/**
 * @internal Wraps one root-specific, already-copied content/config snapshot.
 * S3b owns the known-field Settings/Saves copiers; renderer content is opaque identity.
 */
export function createSystemDialogContentConfigSnapshotInternalV1<TValue>(
  value: TValue,
): SystemDialogContentConfigSnapshotInternalV1<TValue> {
  return { value };
}

/** @internal Captures one successful resolver/port admission for one fresh root candidate. */
export function createSystemDialogRootCandidateResolutionSnapshotInternalV1<
  TRendererComponent,
  TContentConfigSnapshot,
>(input: {
  readonly rootRequest: SystemDialogRootRequestInternalV1;
  readonly rendererComponent: TRendererComponent;
  readonly accessibleName: string;
  readonly requiredPortBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
  readonly contentConfigSnapshot: SystemDialogContentConfigSnapshotInternalV1<
    TContentConfigSnapshot
  >;
}): SystemDialogRootCandidateResolutionSnapshotInternalV1<
  TRendererComponent,
  TContentConfigSnapshot
> {
  try {
    const rootRequest = input.rootRequest;
    if (rootRequest !== "settings" && rootRequest !== "saves") {
      throw new TypeError();
    }
    const definition = rootRequest === "settings" ? settingsDefinitionV1 : savesDefinitionV1;
    if (
      input.rendererComponent === null ||
      (typeof input.rendererComponent !== "object" &&
        typeof input.rendererComponent !== "function") ||
      typeof input.accessibleName !== "string" ||
      input.accessibleName.length === 0
    ) {
      throw new TypeError();
    }
    return {
      rootRequest,
      definition,
      rendererComponent: input.rendererComponent,
      accessibleName: input.accessibleName,
      requiredPortBindings: snapshotRequiredPortBindingsV1(input.requiredPortBindings),
      contentConfigSnapshot: input.contentConfigSnapshot,
    };
  } catch {
    throw new TypeError("ui.system_dialog_candidate_resolution_invalid");
  }
}

/** @internal Admits and normalizes the closed confirmation invocation union. */
export function normalizeSystemDialogConfirmationInvocationInternalV1(
  input: unknown,
): SystemDialogConfirmationInvocationInternalV1 {
  try {
    if (!isRecordV1(input)) throw new TypeError();
    const kind = input.kind;
    if (kind === "import") {
      if (Object.keys(input).some((key) => key !== "kind")) throw new TypeError();
      return { kind };
    }
    if (
      kind !== "load" && kind !== "clear" && kind !== "reanchor" && kind !== "restore" &&
      kind !== "discard"
    ) throw new TypeError();
    if (
      Object.keys(input).some((key) => key !== "kind" && key !== "slotId") ||
      !isSaveSlotIdShapeV1(input.slotId)
    ) throw new TypeError();
    return { kind, slotId: input.slotId };
  } catch {
    throw new TypeError("ui.system_dialog_confirmation_invocation_invalid");
  }
}

/** @internal Captures one successful renderer/port admission for one fresh confirmation child. */
export function createSystemDialogConfirmationCandidateResolutionSnapshotInternalV1<
  TRendererComponent,
>(input: {
  readonly invocation: SystemDialogConfirmationInvocationInternalV1;
  readonly rendererComponent: TRendererComponent;
  readonly accessibleName: string;
  readonly requiredPortBindings: readonly SystemDialogRequiredPortBindingInternalV1[];
}): SystemDialogConfirmationCandidateResolutionSnapshotInternalV1<TRendererComponent> {
  try {
    if (
      input.rendererComponent === null ||
      (typeof input.rendererComponent !== "object" &&
        typeof input.rendererComponent !== "function") ||
      typeof input.accessibleName !== "string" ||
      input.accessibleName.length === 0
    ) {
      throw new TypeError();
    }
    return {
      invocation: input.invocation,
      definition: confirmationDefinitionV1,
      rendererComponent: input.rendererComponent,
      accessibleName: input.accessibleName,
      requiredPortBindings: snapshotRequiredPortBindingsV1(input.requiredPortBindings),
    };
  } catch {
    throw new TypeError("ui.system_dialog_confirmation_candidate_resolution_invalid");
  }
}

/** Dormant S3 contribution. S3b combines it with Overlay in one composition-owned recipe. */
export const systemDialogManagedContractInternalV1: SystemDialogManagedContractInternalV1 = {
  resolvedOwnerIds: [ownerIdV1],
  resolvedSlotDescriptors: [
    {
      kind: "root" as const,
      slotId: rootSlotIdV1,
      cardinality: "single" as const,
    },
    {
      kind: "child" as const,
      parentDefinitionId: savesDefinitionV1.definitionId,
      slotId: confirmationSlotIdV1,
      cardinality: "single" as const,
    },
  ],
  definitions: {
    settings: settingsDefinitionV1,
    saves: savesDefinitionV1,
    confirmation: confirmationDefinitionV1,
  },
  rootRequests: ["settings", "saves"] as const,
  savesRendererVariants: ["standard", "custom"] as const,
  confirmationOperationKinds: [
    "load",
    "clear",
    "import",
    "reanchor",
    "restore",
    "discard",
  ] as const,
  host: {
    logicalLeaseCardinality: "single",
    portalCardinality: "single",
    catalogAuthorityCardinality: "single",
    conflictCode: "ui.system_dialog_host_lease_conflict",
    candidateResolution: "snapshot_per_candidate",
  },
};
