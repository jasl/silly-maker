// SPDX-License-Identifier: MIT
import {
  parseInteractionOccurrenceIdV1,
  parseModuleId,
  parsePositiveSafeInteger,
  type PendingInteractionV1,
  type RuntimeSchemaV1,
} from "@sillymaker/base";

import {
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  parseManagedSurfaceActionIdV1,
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceFocusTargetIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { parseManagedSurfaceResolvedDefinitionV1 } from "../managed-surfaces/managed-surface-definition.ts";
import type { ManagedSurfaceStableDefinitionSidecarInternalV1 } from "../managed-surfaces/managed-surface-stable-admission.ts";

export interface NarrativeManagedSurfaceFamilyContractInternalV1 {
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly definitions: Readonly<{
    readonly dialogue: ManagedSurfaceResolvedDefinitionV1;
    readonly history: ManagedSurfaceResolvedDefinitionV1;
  }>;
  readonly stableDefinitionSidecars: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
}

interface NarrativeStableParametersInternalV1 {
  readonly semanticOccurrenceId: string;
  readonly kind: PendingInteractionV1["kind"];
  readonly definitionId: string;
  readonly seenRevision: number;
  readonly rendererKey: string;
}

function hasExactDataKeysInternalV1(
  value: unknown,
  keys: readonly string[],
): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string") ||
    !keys.every((key) => Object.hasOwn(value, key))
  ) {
    return false;
  }
  return keys.every((key) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && "value" in descriptor;
  });
}

function narrativeParametersSchemaInternalV1(): RuntimeSchemaV1<unknown> {
  return Object.freeze({
    parse(value: unknown): NarrativeStableParametersInternalV1 {
      const keys = [
        "semanticOccurrenceId",
        "kind",
        "definitionId",
        "seenRevision",
        "rendererKey",
      ] as const;
      if (!hasExactDataKeysInternalV1(value, keys)) {
        throw new TypeError("ui.narrative_stable_parameters_invalid");
      }
      const kind = value.kind;
      if (
        kind !== "say" && kind !== "choice" && kind !== "hold" &&
        kind !== "presentation_barrier" && kind !== "custom"
      ) {
        throw new TypeError("ui.narrative_stable_parameters_invalid");
      }
      return Object.freeze({
        semanticOccurrenceId: parseInteractionOccurrenceIdV1(value.semanticOccurrenceId),
        kind,
        definitionId: parseModuleId(value.definitionId),
        seenRevision: parsePositiveSafeInteger(value.seenRevision),
        rendererKey: parseModuleId(value.rendererKey),
      });
    },
  });
}

export const narrativeOwnerIdInternalV1 = parseManagedSurfaceOwnerIdV1(
  "surface-owner.narrative",
);
export const narrativeRootSlotIdInternalV1 = parseManagedSurfaceSlotIdV1(
  "surface-slot.narrative.root",
);
export const narrativeHistorySlotIdInternalV1 = parseManagedSurfaceSlotIdV1(
  "surface-slot.narrative.history",
);
export const narrativeDialogueDefinitionIdInternalV1 = parseManagedSurfaceDefinitionIdV1(
  "surface.narrative.dialogue",
);
export const narrativeHistoryDefinitionIdInternalV1 = parseManagedSurfaceDefinitionIdV1(
  "surface.narrative.history",
);
const narrativeLayerIdInternalV1 = parseManagedSurfaceLayerIdV1("surface-layer.narrative");
export const narrativeChooseActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "narrative.choose",
);
export const narrativeResumeActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "narrative.resume",
);
export const narrativeCustomActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "narrative.custom",
);
export const narrativeConfirmActionIdInternalV1 = parseManagedSurfaceActionIdV1("ui.confirm");
export const narrativeAdvanceActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "narrative.advance",
);
export const narrativeReplayVoiceActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "player.replay_voice",
);
export const narrativeToggleAutoActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "player.toggle_auto",
);
export const narrativeToggleSkipActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "player.toggle_skip",
);
export const narrativeToggleHistoryActionIdInternalV1 = parseManagedSurfaceActionIdV1(
  "player.toggle_history",
);
export const narrativeCancelActionIdInternalV1 = parseManagedSurfaceActionIdV1("ui.cancel");

const readinessPolicyInternalV1 = Object.freeze({
  initialOpen: "blocking_fallback" as const,
  primaryReplacement: "retain_current" as const,
  childOpen: "blocking_fallback" as const,
});

export const narrativeDialogueDefinitionInternalV1 = parseManagedSurfaceResolvedDefinitionV1({
  definitionId: narrativeDialogueDefinitionIdInternalV1,
  contractRevision: parsePositiveSafeInteger(2),
  ownerId: narrativeOwnerIdInternalV1,
  slotId: narrativeRootSlotIdInternalV1,
  layerId: narrativeLayerIdInternalV1,
  layerOrder: 40,
  placement: "root",
  modality: "blocking",
  inputPolicy: Object.freeze({ kind: "managed", inputContextId: "narrative" }),
  dismissPolicy: Object.freeze({
    back: false,
    escape: false,
    backdrop: false,
    routedCancel: false,
  }),
  focusPolicy: Object.freeze({
    kind: "owns_focus",
    initialTargetId: parseManagedSurfaceFocusTargetIdV1(
      "surface-focus.narrative.primary",
    ),
    trap: true,
    restore: "previous_owner",
  }),
  navigationPolicy: Object.freeze({ kind: "none" }),
  actionIds: Object.freeze(
    [
      "ui.confirm",
      "narrative.advance",
      "narrative.choose",
      "narrative.resume",
      "narrative.custom",
      "player.toggle_auto",
      "player.toggle_skip",
      "player.toggle_history",
      "player.replay_voice",
    ].map(parseManagedSurfaceActionIdV1),
  ),
  readiness: readinessPolicyInternalV1,
});

export const narrativeHistoryDefinitionInternalV1 = parseManagedSurfaceResolvedDefinitionV1({
  definitionId: narrativeHistoryDefinitionIdInternalV1,
  contractRevision: parsePositiveSafeInteger(1),
  ownerId: narrativeOwnerIdInternalV1,
  slotId: narrativeHistorySlotIdInternalV1,
  layerId: narrativeLayerIdInternalV1,
  layerOrder: 41,
  placement: "child",
  modality: "blocking",
  inputPolicy: Object.freeze({ kind: "managed", inputContextId: "narrative" }),
  dismissPolicy: Object.freeze({
    back: true,
    escape: true,
    backdrop: true,
    routedCancel: true,
  }),
  focusPolicy: Object.freeze({
    kind: "owns_focus",
    initialTargetId: parseManagedSurfaceFocusTargetIdV1(
      "surface-focus.narrative.history-close",
    ),
    trap: true,
    restore: "opener",
  }),
  navigationPolicy: Object.freeze({ kind: "close" }),
  actionIds: Object.freeze(
    ["ui.cancel", "player.toggle_history"].map(parseManagedSurfaceActionIdV1),
  ),
  readiness: readinessPolicyInternalV1,
});

const rootSlotDescriptorInternalV1 = Object.freeze({
  kind: "root" as const,
  slotId: narrativeRootSlotIdInternalV1,
  cardinality: "single" as const,
});
const historySlotDescriptorInternalV1 = Object.freeze({
  kind: "child" as const,
  parentDefinitionId: narrativeDialogueDefinitionIdInternalV1,
  slotId: narrativeHistorySlotIdInternalV1,
  cardinality: "single" as const,
});
const dialogueSidecarInternalV1: ManagedSurfaceStableDefinitionSidecarInternalV1 = Object.freeze({
  definition: narrativeDialogueDefinitionInternalV1,
  parameterSchema: narrativeParametersSchemaInternalV1(),
});

export const narrativeManagedSurfaceFamilyContractInternalV1:
  NarrativeManagedSurfaceFamilyContractInternalV1 = Object.freeze({
    ownerId: narrativeOwnerIdInternalV1,
    resolvedOwnerIds: Object.freeze([narrativeOwnerIdInternalV1]),
    resolvedSlotDescriptors: Object.freeze([
      rootSlotDescriptorInternalV1,
      historySlotDescriptorInternalV1,
    ]),
    definitions: Object.freeze({
      dialogue: narrativeDialogueDefinitionInternalV1,
      history: narrativeHistoryDefinitionInternalV1,
    }),
    stableDefinitionSidecars: Object.freeze([dialogueSidecarInternalV1]),
  });

export function createNarrativeManagedSurfaceFamilyContractInternalV1(): NarrativeManagedSurfaceFamilyContractInternalV1 {
  return narrativeManagedSurfaceFamilyContractInternalV1;
}
