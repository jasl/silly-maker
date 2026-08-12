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

const readinessPolicyInternalV1 = Object.freeze({
  initialOpen: "blocking_fallback" as const,
  primaryReplacement: "retain_current" as const,
  childOpen: "blocking_fallback" as const,
});

function managedActionIdsInternalV1(values: readonly string[]) {
  return Object.freeze(values.map(parseManagedSurfaceActionIdV1));
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
    inputPolicy: Object.freeze({ kind: "managed", inputContextId: "whole_canvas" }),
    dismissPolicy: input.dismissPolicy,
    focusPolicy: Object.freeze({
      kind: "owns_focus",
      initialTargetId: parseManagedSurfaceFocusTargetIdV1(input.focusTargetId),
      trap: true,
      restore: input.restore,
    }),
    navigationPolicy: Object.freeze({ kind: input.navigation }),
    actionIds: managedActionIdsInternalV1(input.actionIds),
    readiness: readinessPolicyInternalV1,
  });
}

const bootSplashDefinitionInternalV1 = rootDefinitionInternalV1({
  definitionId: bootSplashDefinitionIdInternalV1,
  focusTargetId: "surface-focus.whole-canvas.splash-dismiss",
  dismissPolicy: Object.freeze({
    back: true,
    escape: true,
    backdrop: false,
    routedCancel: true,
  }),
  navigation: "close",
  restore: "none",
  actionIds: Object.freeze([
    "ui.confirm",
    "ui.cancel",
    "whole-canvas.dismiss-splash",
  ]),
});

const titleDefinitionInternalV1 = rootDefinitionInternalV1({
  definitionId: titleDefinitionIdInternalV1,
  focusTargetId: "surface-focus.whole-canvas.title-primary",
  dismissPolicy: Object.freeze({
    back: false,
    escape: false,
    backdrop: false,
    routedCancel: false,
  }),
  navigation: "none",
  restore: "previous_owner",
  actionIds: Object.freeze([
    "ui.confirm",
    "ui.cancel",
    "whole-canvas.title.new-game",
    "whole-canvas.title.continue",
    "whole-canvas.title.open-load",
    "whole-canvas.title.open-settings",
  ]),
});

function captureRootParametersInternalV1(value: unknown) {
  try {
    if ((typeof value !== "object" && typeof value !== "function") || value === null) {
      throw new TypeError();
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length !== 2 || !keys.includes("targetId") || !keys.includes("parameters")) {
      throw new TypeError();
    }
    const targetIdDescriptor = Reflect.getOwnPropertyDescriptor(value, "targetId");
    const parametersDescriptor = Reflect.getOwnPropertyDescriptor(value, "parameters");
    if (
      targetIdDescriptor === undefined || !("value" in targetIdDescriptor) ||
      parametersDescriptor === undefined || !("value" in parametersDescriptor)
    ) {
      throw new TypeError();
    }
    const targetId = parseModuleId(targetIdDescriptor.value);
    const projected = projectBoundedCanonicalJsonInternalV1(
      parametersDescriptor.value,
      Object.freeze({
        maxBytes: parsePositiveSafeInteger(
          managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxBytes,
        ),
        maxDepth: parsePositiveSafeInteger(
          managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxDepth,
        ),
        maxNodes: parsePositiveSafeInteger(
          managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxNodes,
        ),
      }),
    );
    if (projected.kind !== "projected") throw new TypeError();
    return Object.freeze({ targetId, parameters: projected.value });
  } catch {
    throw new TypeError("ui.whole_canvas_target_invalid");
  }
}

const rootParameterSchemaInternalV1: RuntimeSchemaV1<unknown> = Object.freeze({
  parse: captureRootParametersInternalV1,
});

const primarySlotDescriptorInternalV1 = Object.freeze({
  kind: "root" as const,
  slotId: primarySlotIdInternalV1,
  cardinality: "single" as const,
});
const detailSlotDescriptorInternalV1 = Object.freeze({
  kind: "child" as const,
  parentDefinitionId: primaryDefinitionIdInternalV1,
  slotId: detailSlotIdInternalV1,
  cardinality: "single" as const,
});

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

function captureDenseFrozenArrayInternalV1(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError();
  if (!Object.isFrozen(value) || Reflect.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError();
  }
  const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
    !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
  ) throw new TypeError();
  const length = lengthDescriptor.value;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== length + 1) throw new TypeError();
  const captured: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !("value" in descriptor)) throw new TypeError();
    captured.push(descriptor.value);
  }
  for (const key of ownKeys) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(key)) throw new TypeError();
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index < 0 || index >= length) throw new TypeError();
  }
  return Object.freeze(captured);
}

function captureCatalogInternalV1(
  value: unknown,
): readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[] {
  try {
    const capturedRows = captureDenseFrozenArrayInternalV1(value);
    const targetIds = new Set<string>();
    const rows: WholeCanvasManagedSurfaceCatalogRowInternalV1[] = [];
    for (const row of capturedRows) {
      if (
        typeof row !== "object" || row === null || Array.isArray(row) ||
        Reflect.getPrototypeOf(row) !== Object.prototype || !Object.isFrozen(row)
      ) {
        throw new TypeError();
      }
      const keys = Reflect.ownKeys(row);
      const expectedKeys = [
        "targetId",
        "contractRevision",
        "placements",
        "actionIds",
        "defaultActionId",
      ] as const;
      if (keys.length !== expectedKeys.length || expectedKeys.some((key) => !keys.includes(key))) {
        throw new TypeError();
      }
      const read = (key: typeof expectedKeys[number]): unknown => {
        const member = Reflect.getOwnPropertyDescriptor(row, key);
        if (member === undefined || !("value" in member)) throw new TypeError();
        return member.value;
      };
      const targetId = parseModuleId(read("targetId"));
      if (targetIds.has(targetId)) throw new TypeError();
      targetIds.add(targetId);
      if (read("contractRevision") !== 1) throw new TypeError();
      const rawPlacements = read("placements");
      const placements = captureDenseFrozenArrayInternalV1(rawPlacements).map((placement) => {
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
      const rawActionIds = read("actionIds");
      const actionIds = captureDenseFrozenArrayInternalV1(rawActionIds).map((actionId) =>
        String(parseManagedSurfaceActionIdV1(actionId))
      );
      if (
        new Set(actionIds).size !== actionIds.length ||
        actionIds.some((actionId) => reservedActionIdsInternalV1.has(actionId))
      ) {
        throw new TypeError();
      }
      const rawDefaultActionId = read("defaultActionId");
      const defaultActionId = rawDefaultActionId === null
        ? null
        : String(parseManagedSurfaceActionIdV1(rawDefaultActionId));
      if (defaultActionId !== null && !actionIds.includes(defaultActionId)) {
        throw new TypeError();
      }
      rows.push(Object.freeze({
        targetId,
        contractRevision: 1 as const,
        placements: Object.freeze(placements),
        actionIds: Object.freeze(actionIds),
        defaultActionId,
      }));
    }
    return Object.freeze(rows);
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
  return Object.freeze(actionIds);
}

function createPrimaryDefinitionInternalV1(
  catalog: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[],
): ManagedSurfaceResolvedDefinitionV1 {
  return rootDefinitionInternalV1({
    definitionId: primaryDefinitionIdInternalV1,
    focusTargetId: "surface-focus.whole-canvas.primary",
    dismissPolicy: Object.freeze({
      back: false,
      escape: false,
      backdrop: false,
      routedCancel: false,
    }),
    navigation: "none",
    restore: "previous_owner",
    actionIds: Object.freeze([
      "ui.confirm",
      "ui.cancel",
      ...catalogActionUnionInternalV1(catalog, "primary"),
    ]),
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
    inputPolicy: Object.freeze({ kind: "managed", inputContextId: "whole_canvas" }),
    dismissPolicy: Object.freeze({
      back: true,
      escape: true,
      backdrop: true,
      routedCancel: true,
    }),
    focusPolicy: Object.freeze({
      kind: "owns_focus",
      initialTargetId: parseManagedSurfaceFocusTargetIdV1("surface-focus.whole-canvas.detail"),
      trap: true,
      restore: "opener",
    }),
    navigationPolicy: Object.freeze({ kind: "close" }),
    actionIds: managedActionIdsInternalV1([
      "ui.confirm",
      "ui.cancel",
      ...catalogActionUnionInternalV1(catalog, "detail"),
    ]),
    readiness: readinessPolicyInternalV1,
  });
}

export function createWholeCanvasManagedSurfaceFamilyContractInternalV1(
  catalogInput: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[],
): WholeCanvasManagedSurfaceFamilyContractInternalV1 {
  const catalog = captureCatalogInternalV1(catalogInput);
  const primary = createPrimaryDefinitionInternalV1(catalog);
  const detail = createDetailDefinitionInternalV1(catalog);
  return Object.freeze({
    ownerId: ownerIdInternalV1,
    resolvedOwnerIds: Object.freeze([ownerIdInternalV1]),
    resolvedSlotDescriptors: Object.freeze([
      primarySlotDescriptorInternalV1,
      detailSlotDescriptorInternalV1,
    ]),
    definitions: Object.freeze({
      primary,
      detail,
      bootSplash: bootSplashDefinitionInternalV1,
      title: titleDefinitionInternalV1,
    }),
    stableDefinitionSidecars: Object.freeze([
      Object.freeze({ definition: primary, parameterSchema: rootParameterSchemaInternalV1 }),
      Object.freeze({
        definition: bootSplashDefinitionInternalV1,
        parameterSchema: rootParameterSchemaInternalV1,
      }),
      Object.freeze({
        definition: titleDefinitionInternalV1,
        parameterSchema: rootParameterSchemaInternalV1,
      }),
    ]),
    catalog,
  });
}
