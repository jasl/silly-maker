// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "@sillymaker/base";

import type { InputContextIdV1 } from "../input/contracts.ts";
import {
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceActionIdV1,
  type ManagedSurfaceDismissPolicyV1,
  type ManagedSurfaceFocusPolicyV1,
  type ManagedSurfaceInputPolicyV1,
  type ManagedSurfaceNavigationPolicyV1,
  type ManagedSurfaceReadinessPolicyV1,
  type ManagedSurfaceResolvedDefinitionV1,
} from "./managed-surface-contracts.ts";

const definitionKeysV1 = Object.freeze(
  [
    "definitionId",
    "contractRevision",
    "ownerId",
    "slotId",
    "layerId",
    "layerOrder",
    "placement",
    "modality",
    "inputPolicy",
    "dismissPolicy",
    "focusPolicy",
    "navigationPolicy",
    "actionIds",
    "readiness",
  ] as const,
);
const inputContextsV1 = new Set<InputContextIdV1>([
  "gameplay",
  "interaction",
  "narrative",
  "whole_canvas",
  "overlay",
  "system",
  "debug",
]);

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireExactKeysV1(
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
  return value;
}

function parseInputPolicyV1(value: unknown): ManagedSurfaceInputPolicyV1 {
  if (!isRecordV1(value)) throw new TypeError();
  if (value.kind === "none") {
    requireExactKeysV1(value, ["kind"]);
    return Object.freeze({ kind: "none" });
  }
  const input = requireExactKeysV1(value, ["kind", "inputContextId"]);
  if (input.kind !== "managed" || !inputContextsV1.has(input.inputContextId as InputContextIdV1)) {
    throw new TypeError();
  }
  return Object.freeze({
    kind: "managed",
    inputContextId: input.inputContextId as InputContextIdV1,
  });
}

function parseDismissPolicyV1(value: unknown): ManagedSurfaceDismissPolicyV1 {
  const input = requireExactKeysV1(value, ["back", "escape", "backdrop", "routedCancel"]);
  if (
    typeof input.back !== "boolean" ||
    typeof input.escape !== "boolean" ||
    typeof input.backdrop !== "boolean" ||
    typeof input.routedCancel !== "boolean"
  ) {
    throw new TypeError();
  }
  return Object.freeze({
    back: input.back,
    escape: input.escape,
    backdrop: input.backdrop,
    routedCancel: input.routedCancel,
  });
}

function parseFocusPolicyV1(value: unknown): ManagedSurfaceFocusPolicyV1 {
  if (!isRecordV1(value)) throw new TypeError();
  if (value.kind === "none") {
    requireExactKeysV1(value, ["kind"]);
    return Object.freeze({ kind: "none" });
  }
  const input = requireExactKeysV1(value, [
    "kind",
    "initialTargetId",
    "trap",
    "restore",
  ]);
  if (
    input.kind !== "owns_focus" ||
    typeof input.trap !== "boolean" ||
    (input.restore !== "opener" && input.restore !== "previous_owner" && input.restore !== "none")
  ) {
    throw new TypeError();
  }
  return Object.freeze({
    kind: "owns_focus",
    initialTargetId: parseManagedSurfaceFocusTargetIdV1(input.initialTargetId),
    trap: input.trap,
    restore: input.restore,
  });
}

function parseNavigationPolicyV1(value: unknown): ManagedSurfaceNavigationPolicyV1 {
  const input = requireExactKeysV1(value, ["kind"]);
  if (input.kind !== "none" && input.kind !== "close") throw new TypeError();
  return Object.freeze({ kind: input.kind });
}

function parseReadinessPolicyV1(value: unknown): ManagedSurfaceReadinessPolicyV1 {
  const input = requireExactKeysV1(value, [
    "initialOpen",
    "primaryReplacement",
    "childOpen",
  ]);
  if (
    input.initialOpen !== "blocking_fallback" ||
    input.primaryReplacement !== "retain_current" ||
    input.childOpen !== "blocking_fallback"
  ) {
    throw new TypeError();
  }
  return Object.freeze({
    initialOpen: "blocking_fallback",
    primaryReplacement: "retain_current",
    childOpen: "blocking_fallback",
  });
}

function parseActionIdsV1(value: unknown): readonly ManagedSurfaceActionIdV1[] {
  if (!Array.isArray(value)) throw new TypeError();
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== value.length + 1) throw new TypeError();
  const actionIds: ManagedSurfaceActionIdV1[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) throw new TypeError();
    actionIds.push(parseManagedSurfaceActionIdV1(value[index]));
  }
  if (new Set(actionIds).size !== actionIds.length) throw new TypeError();
  return Object.freeze(actionIds);
}

export function parseManagedSurfaceResolvedDefinitionV1(
  value: unknown,
): ManagedSurfaceResolvedDefinitionV1 {
  try {
    const input = requireExactKeysV1(value, definitionKeysV1);
    if (input.placement !== "root" && input.placement !== "child") throw new TypeError();
    if (input.modality !== "non_blocking" && input.modality !== "blocking") {
      throw new TypeError();
    }
    const actionIds = parseActionIdsV1(input.actionIds);
    return Object.freeze({
      definitionId: parseManagedSurfaceDefinitionIdV1(input.definitionId),
      contractRevision: parsePositiveSafeInteger(input.contractRevision),
      ownerId: parseManagedSurfaceOwnerIdV1(input.ownerId),
      slotId: parseManagedSurfaceSlotIdV1(input.slotId),
      layerId: parseManagedSurfaceLayerIdV1(input.layerId),
      layerOrder: parseNonNegativeSafeInteger(input.layerOrder),
      placement: input.placement,
      modality: input.modality,
      inputPolicy: parseInputPolicyV1(input.inputPolicy),
      dismissPolicy: parseDismissPolicyV1(input.dismissPolicy),
      focusPolicy: parseFocusPolicyV1(input.focusPolicy),
      navigationPolicy: parseNavigationPolicyV1(input.navigationPolicy),
      actionIds,
      readiness: parseReadinessPolicyV1(input.readiness),
    });
  } catch {
    throw new TypeError("ui.invalid_managed_surface_definition");
  }
}
