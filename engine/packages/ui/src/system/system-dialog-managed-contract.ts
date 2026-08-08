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
const systemDialogContentConfigSnapshotBrandInternalV1 = Symbol(
  "SystemDialogContentConfigSnapshotInternalV1",
);

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
export type SystemDialogConfirmationOperationInternalV1 = "load" | "clear" | "import";

export type SystemDialogConfirmationInvocationInternalV1 =
  | {
    readonly kind: "load" | "clear";
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
  readonly [systemDialogContentConfigSnapshotBrandInternalV1]: true;
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
const readinessV1 = Object.freeze({
  initialOpen: "blocking_fallback" as const,
  primaryReplacement: "retain_current" as const,
  childOpen: "blocking_fallback" as const,
});
const dismissV1 = Object.freeze({
  back: true,
  escape: true,
  backdrop: true,
  routedCancel: true,
});

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function snapshotExactDataRecordV1(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> {
  if (!isRecordV1(value)) throw new TypeError();
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.length !== expectedKeys.length ||
    !expectedKeys.every((key) => Object.hasOwn(value, key))
  ) {
    throw new TypeError();
  }
  const snapshot: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) throw new TypeError();
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function snapshotRequiredPortBindingsV1(
  value: unknown,
): readonly SystemDialogRequiredPortBindingInternalV1[] {
  if (!Array.isArray(value)) throw new TypeError();
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== value.length + 1) throw new TypeError();
  const bindings: SystemDialogRequiredPortBindingInternalV1[] = [];
  const portIds = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const itemDescriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (itemDescriptor === undefined || !("value" in itemDescriptor)) throw new TypeError();
    const binding = snapshotExactDataRecordV1(itemDescriptor.value, ["portId", "port"]);
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
    bindings.push(Object.freeze({ portId, port }));
  }
  return Object.freeze(bindings);
}

function parseContentConfigSnapshotV1<TValue>(
  value: unknown,
): SystemDialogContentConfigSnapshotInternalV1<TValue> {
  if (!isRecordV1(value) || !Object.isFrozen(value)) throw new TypeError();
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== 2 ||
    !keys.includes(systemDialogContentConfigSnapshotBrandInternalV1) ||
    !keys.includes("value")
  ) {
    throw new TypeError();
  }
  const brandDescriptor = Object.getOwnPropertyDescriptor(
    value,
    systemDialogContentConfigSnapshotBrandInternalV1,
  );
  const valueDescriptor = Object.getOwnPropertyDescriptor(value, "value");
  if (
    brandDescriptor === undefined ||
    !("value" in brandDescriptor) ||
    brandDescriptor.value !== true ||
    valueDescriptor === undefined ||
    !("value" in valueDescriptor)
  ) {
    throw new TypeError();
  }
  return value as unknown as SystemDialogContentConfigSnapshotInternalV1<TValue>;
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
    inputPolicy: Object.freeze({ kind: "managed" as const, inputContextId: "system" as const }),
    dismissPolicy: dismissV1,
    focusPolicy: Object.freeze({
      kind: "owns_focus" as const,
      initialTargetId: parseManagedSurfaceFocusTargetIdV1(`surface-focus.system.${input.id}`),
      trap: true,
      restore: "opener" as const,
    }),
    navigationPolicy: Object.freeze({ kind: "close" as const }),
    actionIds: Object.freeze(input.actionIds.map(parseManagedSurfaceActionIdV1)),
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
 * @internal Brands one root-specific, already-copied content/config snapshot.
 * S3b owns the known-field Settings/Saves copiers; renderer content is opaque identity.
 */
export function createSystemDialogContentConfigSnapshotInternalV1<TValue>(
  value: TValue,
): SystemDialogContentConfigSnapshotInternalV1<TValue> {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    throw new TypeError("ui.system_dialog_content_config_snapshot_invalid");
  }
  return Object.freeze({
    [systemDialogContentConfigSnapshotBrandInternalV1]: true as const,
    value,
  });
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
    const source = snapshotExactDataRecordV1(input, [
      "rootRequest",
      "rendererComponent",
      "accessibleName",
      "requiredPortBindings",
      "contentConfigSnapshot",
    ]);
    const rootRequest = source.rootRequest;
    if (rootRequest !== "settings" && rootRequest !== "saves") {
      throw new TypeError();
    }
    const definition = rootRequest === "settings" ? settingsDefinitionV1 : savesDefinitionV1;
    if (
      source.rendererComponent === null ||
      (typeof source.rendererComponent !== "object" &&
        typeof source.rendererComponent !== "function") ||
      typeof source.accessibleName !== "string" ||
      source.accessibleName.length === 0
    ) {
      throw new TypeError();
    }
    const contentConfigSnapshot = parseContentConfigSnapshotV1<TContentConfigSnapshot>(
      source.contentConfigSnapshot,
    );
    return Object.freeze({
      rootRequest,
      definition,
      rendererComponent: source.rendererComponent as TRendererComponent,
      accessibleName: source.accessibleName,
      requiredPortBindings: snapshotRequiredPortBindingsV1(source.requiredPortBindings),
      contentConfigSnapshot,
    });
  } catch {
    throw new TypeError("ui.system_dialog_candidate_resolution_invalid");
  }
}

/** @internal Admits only the closed, data-property-only confirmation invocation union. */
export function normalizeSystemDialogConfirmationInvocationInternalV1(
  input: unknown,
): SystemDialogConfirmationInvocationInternalV1 {
  try {
    if (!isRecordV1(input)) throw new TypeError();
    const kindDescriptor = Object.getOwnPropertyDescriptor(input, "kind");
    if (kindDescriptor === undefined || !("value" in kindDescriptor)) throw new TypeError();
    const kind = kindDescriptor.value;
    if (kind === "import") {
      snapshotExactDataRecordV1(input, ["kind"]);
      return Object.freeze({ kind });
    }
    if (kind !== "load" && kind !== "clear") throw new TypeError();
    const source = snapshotExactDataRecordV1(input, ["kind", "slotId"]);
    if (!isSaveSlotIdShapeV1(source.slotId)) throw new TypeError();
    return Object.freeze({ kind, slotId: source.slotId });
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
    const source = snapshotExactDataRecordV1(input, [
      "invocation",
      "rendererComponent",
      "accessibleName",
      "requiredPortBindings",
    ]);
    const invocation = normalizeSystemDialogConfirmationInvocationInternalV1(source.invocation);
    if (
      source.rendererComponent === null ||
      (typeof source.rendererComponent !== "object" &&
        typeof source.rendererComponent !== "function") ||
      typeof source.accessibleName !== "string" ||
      source.accessibleName.length === 0
    ) {
      throw new TypeError();
    }
    return Object.freeze({
      invocation,
      definition: confirmationDefinitionV1,
      rendererComponent: source.rendererComponent as TRendererComponent,
      accessibleName: source.accessibleName,
      requiredPortBindings: snapshotRequiredPortBindingsV1(source.requiredPortBindings),
    });
  } catch {
    throw new TypeError("ui.system_dialog_confirmation_candidate_resolution_invalid");
  }
}

/** Dormant S3 contribution. S3b combines it with Overlay in one composition-owned recipe. */
export const systemDialogManagedContractInternalV1: SystemDialogManagedContractInternalV1 = Object
  .freeze({
    resolvedOwnerIds: Object.freeze([ownerIdV1]),
    resolvedSlotDescriptors: Object.freeze([
      Object.freeze({
        kind: "root" as const,
        slotId: rootSlotIdV1,
        cardinality: "single" as const,
      }),
      Object.freeze({
        kind: "child" as const,
        parentDefinitionId: savesDefinitionV1.definitionId,
        slotId: confirmationSlotIdV1,
        cardinality: "single" as const,
      }),
    ]),
    definitions: Object.freeze({
      settings: settingsDefinitionV1,
      saves: savesDefinitionV1,
      confirmation: confirmationDefinitionV1,
    }),
    rootRequests: Object.freeze(["settings", "saves"] as const),
    savesRendererVariants: Object.freeze(["standard", "custom"] as const),
    confirmationOperationKinds: Object.freeze(["load", "clear", "import"] as const),
    host: Object.freeze({
      logicalLeaseCardinality: "single",
      portalCardinality: "single",
      catalogAuthorityCardinality: "single",
      conflictCode: "ui.system_dialog_host_lease_conflict",
      candidateResolution: "snapshot_per_candidate",
    }),
  });
