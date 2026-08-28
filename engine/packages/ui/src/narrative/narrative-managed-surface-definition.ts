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
  readonly historyEnabled: boolean;
  readonly ownerId: ManagedSurfaceOwnerIdV1;
  readonly resolvedOwnerIds: readonly ManagedSurfaceOwnerIdV1[];
  readonly resolvedSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
  readonly definitions: Readonly<{
    readonly dialogue: ManagedSurfaceResolvedDefinitionV1;
    readonly history: ManagedSurfaceResolvedDefinitionV1 | null;
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
  const ownKeys = Object.keys(value);
  return ownKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function narrativeParametersSchemaInternalV1(): RuntimeSchemaV1<unknown> {
  return {
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
      return {
        semanticOccurrenceId: parseInteractionOccurrenceIdV1(value.semanticOccurrenceId),
        kind,
        definitionId: parseModuleId(value.definitionId),
        seenRevision: parsePositiveSafeInteger(value.seenRevision),
        rendererKey: parseModuleId(value.rendererKey),
      };
    },
  };
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
const narrativeCoreDialogueDefinitionIdInternalV1 = parseManagedSurfaceDefinitionIdV1(
  "surface.narrative.dialogue.core",
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

const readinessPolicyInternalV1 = {
  initialOpen: "blocking_fallback" as const,
  primaryReplacement: "retain_current" as const,
  childOpen: "blocking_fallback" as const,
};

export const narrativeDialogueDefinitionInternalV1 = parseManagedSurfaceResolvedDefinitionV1({
  definitionId: narrativeDialogueDefinitionIdInternalV1,
  contractRevision: parsePositiveSafeInteger(2),
  ownerId: narrativeOwnerIdInternalV1,
  slotId: narrativeRootSlotIdInternalV1,
  layerId: narrativeLayerIdInternalV1,
  layerOrder: 40,
  placement: "root",
  modality: "blocking",
  inputPolicy: { kind: "managed", inputContextId: "narrative" },
  dismissPolicy: {
    back: false,
    escape: false,
    backdrop: false,
    routedCancel: false,
  },
  focusPolicy: {
    kind: "owns_focus",
    initialTargetId: parseManagedSurfaceFocusTargetIdV1(
      "surface-focus.narrative.primary",
    ),
    trap: true,
    restore: "previous_owner",
  },
  navigationPolicy: { kind: "none" },
  actionIds: [
    "ui.confirm",
    "narrative.advance",
    "narrative.choose",
    "narrative.resume",
    "narrative.custom",
    "player.toggle_auto",
    "player.toggle_skip",
    "player.toggle_history",
    "player.replay_voice",
  ].map(
    parseManagedSurfaceActionIdV1,
  ),
  readiness: readinessPolicyInternalV1,
});

const narrativeCoreDialogueDefinitionInternalV1 = parseManagedSurfaceResolvedDefinitionV1({
  ...narrativeDialogueDefinitionInternalV1,
  definitionId: narrativeCoreDialogueDefinitionIdInternalV1,
  contractRevision: parsePositiveSafeInteger(1),
  actionIds: narrativeDialogueDefinitionInternalV1.actionIds.filter(
    (actionId) => actionId !== narrativeToggleHistoryActionIdInternalV1,
  ),
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
  inputPolicy: { kind: "managed", inputContextId: "narrative" },
  dismissPolicy: {
    back: true,
    escape: true,
    backdrop: true,
    routedCancel: true,
  },
  focusPolicy: {
    kind: "owns_focus",
    initialTargetId: parseManagedSurfaceFocusTargetIdV1(
      "surface-focus.narrative.history-close",
    ),
    trap: true,
    restore: "opener",
  },
  navigationPolicy: { kind: "close" },
  actionIds: ["ui.cancel", "player.toggle_history"].map(parseManagedSurfaceActionIdV1),
  readiness: readinessPolicyInternalV1,
});

const rootSlotDescriptorInternalV1 = {
  kind: "root" as const,
  slotId: narrativeRootSlotIdInternalV1,
  cardinality: "single" as const,
};
const historySlotDescriptorInternalV1 = {
  kind: "child" as const,
  parentDefinitionId: narrativeDialogueDefinitionIdInternalV1,
  slotId: narrativeHistorySlotIdInternalV1,
  cardinality: "single" as const,
};
const dialogueSidecarInternalV1: ManagedSurfaceStableDefinitionSidecarInternalV1 = {
  definition: narrativeDialogueDefinitionInternalV1,
  parameterSchema: narrativeParametersSchemaInternalV1(),
};
const coreDialogueSidecarInternalV1: ManagedSurfaceStableDefinitionSidecarInternalV1 = {
  definition: narrativeCoreDialogueDefinitionInternalV1,
  parameterSchema: narrativeParametersSchemaInternalV1(),
};

export const narrativeManagedSurfaceFamilyContractInternalV1:
  NarrativeManagedSurfaceFamilyContractInternalV1 = {
    historyEnabled: true,
    ownerId: narrativeOwnerIdInternalV1,
    resolvedOwnerIds: [narrativeOwnerIdInternalV1],
    resolvedSlotDescriptors: [
      rootSlotDescriptorInternalV1,
      historySlotDescriptorInternalV1,
    ],
    definitions: {
      dialogue: narrativeDialogueDefinitionInternalV1,
      history: narrativeHistoryDefinitionInternalV1,
    },
    stableDefinitionSidecars: [dialogueSidecarInternalV1],
  };

const narrativeCoreManagedSurfaceFamilyContractInternalV1:
  NarrativeManagedSurfaceFamilyContractInternalV1 = {
    historyEnabled: false,
    ownerId: narrativeOwnerIdInternalV1,
    resolvedOwnerIds: [narrativeOwnerIdInternalV1],
    resolvedSlotDescriptors: [rootSlotDescriptorInternalV1],
    definitions: {
      dialogue: narrativeCoreDialogueDefinitionInternalV1,
      history: null,
    },
    stableDefinitionSidecars: [coreDialogueSidecarInternalV1],
  };

export function createNarrativeManagedSurfaceFamilyContractInternalV1(
  input: Readonly<{ readonly history: boolean }>,
): NarrativeManagedSurfaceFamilyContractInternalV1 {
  return input.history
    ? narrativeManagedSurfaceFamilyContractInternalV1
    : narrativeCoreManagedSurfaceFamilyContractInternalV1;
}
