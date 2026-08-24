// SPDX-License-Identifier: MIT
import { parseModuleId, parsePositiveSafeInteger, type RuntimeSchemaV1 } from "@sillymaker/base";
import { projectBoundedCanonicalJsonInternalV1 } from "@sillymaker/base/runtime/internal";

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
import type { ManagedSurfaceStableDefinitionSidecarInternalV1 } from "../managed-surfaces/managed-surface-stable-admission.ts";
import { managedSurfaceStableContractLimitsInternalV1 } from "../managed-surfaces/managed-surface-stable-contract.ts";

export interface WholeCanvasManagedSurfaceFamilyContractInternalV1 {
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly definitions: Readonly<{
    readonly primary: ManagedSurfaceResolvedDefinitionV1;
    readonly detail: ManagedSurfaceResolvedDefinitionV1;
    readonly bootSplash: ManagedSurfaceResolvedDefinitionV1;
    readonly title: ManagedSurfaceResolvedDefinitionV1;
  }>;
  readonly stableDefinitionSidecars: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
  readonly catalog: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[];
}

export interface WholeCanvasManagedSurfaceCatalogRowInternalV1 {
  readonly targetId: string;
  readonly contractRevision: 1;
  readonly placements: readonly ("primary" | "detail")[];
  readonly actionIds: readonly string[];
  readonly defaultActionId: string | null;
}

const ownerIdInternalV1 = parseManagedSurfaceOwnerIdV1("surface-owner.whole-canvas");
const primarySlotIdInternalV1 = parseManagedSurfaceSlotIdV1(
  "surface-slot.whole-canvas.primary",
);
const detailSlotIdInternalV1 = parseManagedSurfaceSlotIdV1(
  "surface-slot.whole-canvas.detail",
);
const layerIdInternalV1 = parseManagedSurfaceLayerIdV1("surface-layer.whole-canvas");
const primaryDefinitionIdInternalV1 = parseManagedSurfaceDefinitionIdV1(
  "surface.whole-canvas.primary",
);
const detailDefinitionIdInternalV1 = parseManagedSurfaceDefinitionIdV1(
  "surface.whole-canvas.detail",
);
const bootSplashDefinitionIdInternalV1 = parseManagedSurfaceDefinitionIdV1(
  "surface.whole-canvas.boot-splash",
);
const titleDefinitionIdInternalV1 = parseManagedSurfaceDefinitionIdV1(
  "surface.whole-canvas.title",
);

const readinessPolicyInternalV1 = {
  initialOpen: "blocking_fallback" as const,
  primaryReplacement: "retain_current" as const,
  childOpen: "blocking_fallback" as const,
};

function managedActionIdsInternalV1(values: readonly string[]) {
  return values.map(parseManagedSurfaceActionIdV1);
}

function rootDefinitionInternalV1(input: {
  readonly definitionId: string;
  readonly focusTargetId: string;
  readonly dismissPolicy: Readonly<{
    readonly back: boolean;
    readonly escape: boolean;
    readonly backdrop: boolean;
    readonly routedCancel: boolean;
  }>;
  readonly navigation: "none" | "close";
  readonly restore: "previous_owner" | "none";
  readonly actionIds: readonly string[];
}): ManagedSurfaceResolvedDefinitionV1 {
  return parseManagedSurfaceResolvedDefinitionV1({
    definitionId: input.definitionId,
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: ownerIdInternalV1,
    slotId: primarySlotIdInternalV1,
    layerId: layerIdInternalV1,
    layerOrder: 45,
    placement: "root",
    modality: "blocking",
    inputPolicy: { kind: "managed", inputContextId: "whole_canvas" },
    dismissPolicy: input.dismissPolicy,
    focusPolicy: {
      kind: "owns_focus",
      initialTargetId: parseManagedSurfaceFocusTargetIdV1(input.focusTargetId),
      trap: true,
      restore: input.restore,
    },
    navigationPolicy: { kind: input.navigation },
    actionIds: managedActionIdsInternalV1(input.actionIds),
    readiness: readinessPolicyInternalV1,
  });
}

const bootSplashDefinitionInternalV1 = rootDefinitionInternalV1({
  definitionId: bootSplashDefinitionIdInternalV1,
  focusTargetId: "surface-focus.whole-canvas.splash-dismiss",
  dismissPolicy: {
    back: true,
    escape: true,
    backdrop: false,
    routedCancel: true,
  },
  navigation: "close",
  restore: "none",
  actionIds: [
    "ui.confirm",
    "ui.cancel",
    "whole-canvas.dismiss-splash",
  ],
});

const titleDefinitionInternalV1 = rootDefinitionInternalV1({
  definitionId: titleDefinitionIdInternalV1,
  focusTargetId: "surface-focus.whole-canvas.title-primary",
  dismissPolicy: {
    back: false,
    escape: false,
    backdrop: false,
    routedCancel: false,
  },
  navigation: "none",
  restore: "previous_owner",
  actionIds: [
    "ui.confirm",
    "ui.cancel",
    "whole-canvas.title.new-game",
    "whole-canvas.title.continue",
    "whole-canvas.title.open-load",
    "whole-canvas.title.open-settings",
  ],
});

function captureRootParametersInternalV1(value: unknown) {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new TypeError();
    }
    const input = value as Readonly<Record<string, unknown>>;
    const targetId = parseModuleId(input.targetId);
    const projected = projectBoundedCanonicalJsonInternalV1(
      input.parameters,
      {
        maxBytes: parsePositiveSafeInteger(
          managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxBytes,
        ),
        maxDepth: parsePositiveSafeInteger(
          managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxDepth,
        ),
        maxNodes: parsePositiveSafeInteger(
          managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxNodes,
        ),
      },
    );
    if (projected.kind !== "projected") throw new TypeError();
    return { targetId, parameters: projected.value };
  } catch {
    throw new TypeError("ui.whole_canvas_target_invalid");
  }
}

const rootParameterSchemaInternalV1: RuntimeSchemaV1<unknown> = {
  parse: captureRootParametersInternalV1,
};

const primarySlotDescriptorInternalV1 = {
  kind: "root" as const,
  slotId: primarySlotIdInternalV1,
  cardinality: "single" as const,
};
const detailSlotDescriptorInternalV1 = {
  kind: "child" as const,
  parentDefinitionId: primaryDefinitionIdInternalV1,
  slotId: detailSlotIdInternalV1,
  cardinality: "single" as const,
};

const reservedActionIdsInternalV1 = new Set([
  "ui.confirm",
  "ui.cancel",
  "whole-canvas.dismiss-splash",
  "whole-canvas.open-detail",
  "whole-canvas.close-detail",
  "whole-canvas.title.new-game",
  "whole-canvas.title.continue",
  "whole-canvas.title.open-load",
  "whole-canvas.title.open-settings",
]);

export function admitWholeCanvasManagedSurfaceCatalogInternalV1(
  value: unknown,
): readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[] {
  try {
    if (!Array.isArray(value)) throw new TypeError();
    const targetIds = new Set<string>();
    const rows: WholeCanvasManagedSurfaceCatalogRowInternalV1[] = [];
    for (const rawRow of value) {
      if (typeof rawRow !== "object" || rawRow === null || Array.isArray(rawRow)) {
        throw new TypeError();
      }
      const row = rawRow as Readonly<Record<string, unknown>>;
      const keys = Object.keys(row);
      if (
        keys.length !== 5 ||
        !Object.hasOwn(row, "targetId") ||
        !Object.hasOwn(row, "contractRevision") ||
        !Object.hasOwn(row, "placements") ||
        !Object.hasOwn(row, "actionIds") ||
        !Object.hasOwn(row, "defaultActionId")
      ) throw new TypeError();
      const targetId = parseModuleId(row.targetId);
      if (targetIds.has(targetId)) throw new TypeError();
      targetIds.add(targetId);
      if (row.contractRevision !== 1 || !Array.isArray(row.placements)) throw new TypeError();
      const placements = row.placements.map((placement) => {
        if (placement !== "primary" && placement !== "detail") throw new TypeError();
        return placement;
      });
      if (placements.length === 0 || new Set(placements).size !== placements.length) {
        throw new TypeError();
      }
      const canonicalPlacementVector = (placements.length === 1 &&
        (placements[0] === "primary" || placements[0] === "detail")) ||
        (placements.length === 2 &&
          placements[0] === "primary" && placements[1] === "detail");
      if (!canonicalPlacementVector) {
        throw new TypeError();
      }
      if (!Array.isArray(row.actionIds)) throw new TypeError();
      const actionIds = row.actionIds.map((actionId) =>
        String(parseManagedSurfaceActionIdV1(actionId))
      );
      if (
        new Set(actionIds).size !== actionIds.length ||
        actionIds.some((actionId) => reservedActionIdsInternalV1.has(actionId))
      ) {
        throw new TypeError();
      }
      const rawDefaultActionId = row.defaultActionId;
      const defaultActionId = rawDefaultActionId === null
        ? null
        : String(parseManagedSurfaceActionIdV1(rawDefaultActionId));
      if (defaultActionId !== null && !actionIds.includes(defaultActionId)) {
        throw new TypeError();
      }
      rows.push({
        targetId,
        contractRevision: 1 as const,
        placements,
        actionIds,
        defaultActionId,
      });
    }
    return rows;
  } catch {
    throw new TypeError("ui.whole_canvas_catalog_invalid");
  }
}

function catalogActionUnionInternalV1(
  catalog: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[],
  placement: "primary" | "detail",
): readonly string[] {
  const actionIds: string[] = [];
  for (const row of catalog) {
    if (!row.placements.includes(placement)) continue;
    for (const actionId of row.actionIds) {
      if (!actionIds.includes(actionId)) actionIds.push(actionId);
    }
  }
  return actionIds;
}

function createPrimaryDefinitionInternalV1(
  catalog: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[],
): ManagedSurfaceResolvedDefinitionV1 {
  return rootDefinitionInternalV1({
    definitionId: primaryDefinitionIdInternalV1,
    focusTargetId: "surface-focus.whole-canvas.primary",
    dismissPolicy: {
      back: false,
      escape: false,
      backdrop: false,
      routedCancel: false,
    },
    navigation: "none",
    restore: "previous_owner",
    actionIds: [
      "ui.confirm",
      "ui.cancel",
      ...catalogActionUnionInternalV1(catalog, "primary"),
    ],
  });
}

function createDetailDefinitionInternalV1(
  catalog: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[],
): ManagedSurfaceResolvedDefinitionV1 {
  return parseManagedSurfaceResolvedDefinitionV1({
    definitionId: detailDefinitionIdInternalV1,
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: ownerIdInternalV1,
    slotId: detailSlotIdInternalV1,
    layerId: layerIdInternalV1,
    layerOrder: 46,
    placement: "child",
    modality: "blocking",
    inputPolicy: { kind: "managed", inputContextId: "whole_canvas" },
    dismissPolicy: {
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    },
    focusPolicy: {
      kind: "owns_focus",
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("surface-focus.whole-canvas.detail"),
      trap: true,
      restore: "opener",
    },
    navigationPolicy: { kind: "close" },
    actionIds: managedActionIdsInternalV1([
      "ui.confirm",
      "ui.cancel",
      ...catalogActionUnionInternalV1(catalog, "detail"),
    ]),
    readiness: readinessPolicyInternalV1,
  });
}

export function createWholeCanvasManagedSurfaceFamilyContractInternalV1(
  catalog: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[],
): WholeCanvasManagedSurfaceFamilyContractInternalV1 {
  const primary = createPrimaryDefinitionInternalV1(catalog);
  const detail = createDetailDefinitionInternalV1(catalog);
  return {
    ownerId: ownerIdInternalV1,
    resolvedOwnerIds: [ownerIdInternalV1],
    resolvedSlotDescriptors: [
      primarySlotDescriptorInternalV1,
      detailSlotDescriptorInternalV1,
    ],
    definitions: {
      primary,
      detail,
      bootSplash: bootSplashDefinitionInternalV1,
      title: titleDefinitionInternalV1,
    },
    stableDefinitionSidecars: [
      { definition: primary, parameterSchema: rootParameterSchemaInternalV1 },
      {
        definition: bootSplashDefinitionInternalV1,
        parameterSchema: rootParameterSchemaInternalV1,
      },
      {
        definition: titleDefinitionInternalV1,
        parameterSchema: rootParameterSchemaInternalV1,
      },
    ],
    catalog,
  };
}
