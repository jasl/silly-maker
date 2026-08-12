// SPDX-License-Identifier: MIT
import {
  parseModuleId,
  parsePositiveSafeInteger,
  type DeepReadonly,
  type StrictJsonObjectV1,
  type StrictJsonValueV1,
} from "@sillymaker/base";
import { projectBoundedCanonicalJsonInternalV1 } from "@sillymaker/base/runtime/internal";
import { createElement, type ReactNode } from "react";
import type { ComponentType } from "react";

import { inputHandledV1, inputIgnoredV1, type InputRouterV1 } from "../input/contracts.ts";
import type {
  ManagedSurfaceFamilyActivationGateInternalV1,
  ManagedSurfaceFamilyRuntimeAdapterInternalV1,
} from "../managed-surfaces/managed-surface-composition-runtime.ts";
import type { ManagedSurfaceCompositeKernelBundleInternalV1 } from "../managed-surfaces/managed-surface-composite-kernel-bundle.ts";
import type { ManagedSurfaceCoordinatorRuntimeV1 } from "../managed-surfaces/managed-surface-coordinator-lifetime.ts";
import type {
  ManagedSurfaceDismissKindV1,
  ManagedSurfaceGestureIdV1,
} from "../managed-surfaces/managed-surface-contracts.ts";
import { managedSurfaceStableContractLimitsInternalV1 } from "../managed-surfaces/managed-surface-stable-contract.ts";
import {
  createWholeCanvasManagedSurfaceFamilyContractInternalV1,
  type WholeCanvasManagedSurfaceCatalogRowInternalV1,
  type WholeCanvasManagedSurfaceFamilyContractInternalV1,
} from "./whole-canvas-managed-surface-family.ts";
import {
  createWholeCanvasManagedSurfaceSessionInternalV1,
  type WholeCanvasManagedSurfaceFrameInternalV1,
  type WholeCanvasManagedSurfaceHostCommitInputInternalV1,
  type WholeCanvasManagedSurfaceHostCommitPortInternalV1,
  type WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
  type WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1,
  type WholeCanvasManagedSurfacePreparationInternalV1,
  type WholeCanvasManagedSurfaceReadinessEntryInternalV1,
  type WholeCanvasManagedSurfaceRenderEntryInternalV1,
  type WholeCanvasManagedSurfaceResolveTargetInternalV1,
  type WholeCanvasManagedSurfaceResultInternalV1,
  type WholeCanvasManagedSurfaceRootDesiredInternalV1,
  type WholeCanvasManagedSurfaceSessionInternalV1,
  type WholeCanvasManagedSurfaceSnapshotInternalV1,
} from "./whole-canvas-managed-surface-session.ts";

export type WholeCanvasSurfacePlacementV1 = "primary" | "detail";

export interface WholeCanvasSurfaceCatalogEntryV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly targetId: TTargetId;
  readonly contractRevision: 1;
  readonly placements: readonly WholeCanvasSurfacePlacementV1[];
  readonly actionIds: readonly TActionId[];
  readonly defaultActionId: TActionId | null;
}

export interface WholeCanvasSurfaceTargetV1<TTargetId extends string> {
  readonly targetId: TTargetId;
  readonly parameters: DeepReadonly<StrictJsonValueV1>;
}

export interface WholeCanvasSurfaceSelectionV1<TTargetId extends string> {
  readonly primary: WholeCanvasSurfaceTargetV1<TTargetId> | null;
}

export interface WholeCanvasSurfacePublicationSourceV1<
  TSemanticPublication,
  TTargetId extends string,
> {
  readonly kind: "publication";
  readonly selectPrimary: (
    publication: DeepReadonly<TSemanticPublication>,
  ) => WholeCanvasSurfaceSelectionV1<TTargetId>;
}

declare const wholeCanvasApplicationSourceBrandV1: unique symbol;
export interface WholeCanvasApplicationSourceV1<TTargetId extends string> {
  readonly [wholeCanvasApplicationSourceBrandV1]: TTargetId;
  replacePrimary(target: WholeCanvasSurfaceTargetV1<TTargetId>): void;
  closePrimary(): void;
}

export type WholeCanvasSurfaceSourceV1<
  TSemanticPublication,
  TTargetId extends string,
> =
  | WholeCanvasSurfacePublicationSourceV1<TSemanticPublication, TTargetId>
  | WholeCanvasApplicationSourceV1<TTargetId>;

export type WholeCanvasSurfaceActionIntentV1<TTargetId extends string> =
  | Readonly<
    { readonly kind: "replace_primary"; readonly target: WholeCanvasSurfaceTargetV1<TTargetId> }
  >
  | Readonly<
    { readonly kind: "open_detail"; readonly target: WholeCanvasSurfaceTargetV1<TTargetId> }
  >
  | Readonly<{ readonly kind: "back" }>
  | Readonly<{ readonly kind: "close_primary" }>
  | Readonly<{ readonly kind: "owner"; readonly payload: DeepReadonly<StrictJsonObjectV1> }>;

export interface WholeCanvasSurfaceActionAvailabilityV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly actionId: TActionId;
  readonly status: "enabled" | "disabled";
  readonly reasonTextIds: readonly string[];
  readonly intent: WholeCanvasSurfaceActionIntentV1<TTargetId>;
}

export interface WholeCanvasSurfaceRendererActionV1<TActionId extends string> {
  readonly actionId: TActionId;
  readonly status: "enabled" | "disabled";
  readonly reasonTextIds: readonly string[];
}

export interface WholeCanvasSurfaceResolvedTargetV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly accessibleNameTextId: string;
  readonly view: DeepReadonly<StrictJsonValueV1>;
  readonly actions: readonly WholeCanvasSurfaceActionAvailabilityV1<TTargetId, TActionId>[];
}

export interface WholeCanvasSurfaceResolveTargetRequestV1<
  TSemanticPublication,
  TTargetId extends string,
> {
  readonly publication: DeepReadonly<TSemanticPublication>;
  readonly placement: WholeCanvasSurfacePlacementV1;
  readonly target: WholeCanvasSurfaceTargetV1<TTargetId>;
}

export type WholeCanvasSurfacePreparationTargetV1<TTargetId extends string> =
  | Readonly<{ readonly kind: "primary"; readonly primary: WholeCanvasSurfaceTargetV1<TTargetId> }>
  | Readonly<{
    readonly kind: "detail";
    readonly primary: WholeCanvasSurfaceTargetV1<TTargetId>;
    readonly detail: WholeCanvasSurfaceTargetV1<TTargetId>;
  }>;

export interface WholeCanvasSurfaceActionDispatchRequestV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly placement: WholeCanvasSurfacePlacementV1;
  readonly primary: WholeCanvasSurfaceTargetV1<TTargetId>;
  readonly detail: WholeCanvasSurfaceTargetV1<TTargetId> | null;
  readonly actionId: TActionId;
  readonly payload: DeepReadonly<StrictJsonObjectV1>;
}

export interface WholeCanvasSurfacePrimaryRendererPropsV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly kind: "primary";
  readonly target: WholeCanvasSurfaceTargetV1<TTargetId>;
  readonly view: DeepReadonly<StrictJsonValueV1>;
  readonly actions: readonly WholeCanvasSurfaceRendererActionV1<TActionId>[];
  readonly resolveText: (textId: string) => string;
  readonly onAction: (actionId: TActionId) => void;
  readonly onBack: () => void;
}

export interface WholeCanvasSurfaceDetailRendererPropsV1<
  TTargetId extends string,
  TActionId extends string,
> {
  readonly kind: "detail";
  readonly primary: WholeCanvasSurfaceTargetV1<TTargetId>;
  readonly target: WholeCanvasSurfaceTargetV1<TTargetId>;
  readonly view: DeepReadonly<StrictJsonValueV1>;
  readonly actions: readonly WholeCanvasSurfaceRendererActionV1<TActionId>[];
  readonly resolveText: (textId: string) => string;
  readonly onAction: (actionId: TActionId) => void;
  readonly onBack: () => void;
}

export type WholeCanvasSurfaceRendererPropsV1<
  TTargetId extends string,
  TActionId extends string,
> =
  | WholeCanvasSurfacePrimaryRendererPropsV1<TTargetId, TActionId>
  | WholeCanvasSurfaceDetailRendererPropsV1<TTargetId, TActionId>;

export interface DefineWholeCanvasSurfaceInputV1<
  TSemanticPublication,
  TTargetId extends string,
  TActionId extends string,
> {
  readonly catalog: readonly WholeCanvasSurfaceCatalogEntryV1<TTargetId, TActionId>[];
  readonly source: WholeCanvasSurfaceSourceV1<TSemanticPublication, TTargetId>;
  readonly resolveTarget: (
    request: WholeCanvasSurfaceResolveTargetRequestV1<TSemanticPublication, TTargetId>,
  ) => WholeCanvasSurfaceResolvedTargetV1<TTargetId, TActionId>;
  readonly dispatchAction:
    | ((
      request: WholeCanvasSurfaceActionDispatchRequestV1<TTargetId, TActionId>,
    ) => Promise<unknown>)
    | null;
  readonly renderer: ComponentType<WholeCanvasSurfaceRendererPropsV1<TTargetId, TActionId>>;
  readonly prepareTarget:
    | ((target: WholeCanvasSurfacePreparationTargetV1<TTargetId>) => Promise<unknown>)
    | null;
  readonly resolveText: (locale: string | null, textId: string) => string;
}

declare const wholeCanvasSurfaceDefinitionBrandV1: unique symbol;
export interface WholeCanvasSurfaceDefinitionV1<TSemanticPublication> {
  readonly [wholeCanvasSurfaceDefinitionBrandV1]: TSemanticPublication;
}

export interface WholeCanvasSurfaceHostedPublicationSnapshotInternalV1<
  TSemanticPublication,
> {
  readonly semantic: DeepReadonly<TSemanticPublication>;
  readonly locale: string | null;
}

export interface BindWholeCanvasSurfaceHostedPublicationInputInternalV1<
  TSemanticPublication,
> {
  readonly getSnapshotInternalV1: () => WholeCanvasSurfaceHostedPublicationSnapshotInternalV1<
    TSemanticPublication
  >;
  readonly subscribeInternalV1: (listener: () => void) => () => void;
}

export interface WholeCanvasSurfaceHostedAdapterInternalV1<TSemanticPublication> {
  readonly familyInternalV1: WholeCanvasManagedSurfaceFamilyContractInternalV1;
  readonly catalogInternalV1: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[];
  readonly sourceKindInternalV1: "publication" | "application";
  bindPublicationInternalV1(
    input: BindWholeCanvasSurfaceHostedPublicationInputInternalV1<TSemanticPublication>,
  ): void;
  getStoryDesiredInternalV1(): WholeCanvasManagedSurfaceRootDesiredInternalV1["story"];
  subscribeStoryInternalV1(listener: () => void): () => void;
  resolveStoryTargetInternalV1(
    request: Parameters<WholeCanvasManagedSurfaceResolveTargetInternalV1>[0],
  ): unknown;
  readonly dispatchStoryOwnerActionInternalV1:
    | WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1
    | null;
  prepareStoryTargetInternalV1(
    entry: WholeCanvasManagedSurfaceRenderEntryInternalV1,
    primary: WholeCanvasSurfaceTargetV1<string> | null,
  ): Promise<unknown>;
  renderStoryInternalV1(
    props: WholeCanvasSurfaceRendererPropsInternalV1,
    primary: WholeCanvasSurfaceTargetV1<string> | null,
  ): ReactNode;
  resolveTextInternalV1(textId: string): string;
  bindCompositionDefinitionInternalV1(
    definition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown>,
    resolveTextInternalV1: (textId: string) => string,
  ): void;
  rollbackClaimInternalV1(): void;
  terminalizeInternalV1(): void;
}

export interface WholeCanvasSurfaceRendererPropsInternalV1 {
  readonly entry: WholeCanvasManagedSurfaceRenderEntryInternalV1;
  readonly onAction: (actionId: string) => void;
  readonly onBack: () => void;
}

export interface CreateWholeCanvasSurfaceCompositionDefinitionInputInternalV1 {
  readonly catalog: readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[];
  readonly getSnapshotInternalV1: () => WholeCanvasManagedSurfaceRootDesiredInternalV1 | null;
  readonly subscribeInternalV1: (listener: () => void) => () => void;
  readonly resolveTargetInternalV1: WholeCanvasManagedSurfaceResolveTargetInternalV1;
  readonly dispatchOwnerActionInternalV1:
    | WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1
    | null;
  readonly prepareTargetInternalV1:
    | ((entry: WholeCanvasManagedSurfaceRenderEntryInternalV1) => Promise<unknown>)
    | null;
  readonly renderInternalV1: ComponentType<WholeCanvasSurfaceRendererPropsInternalV1>;
}

declare const wholeCanvasSurfaceCompositionDefinitionBrandInternalV1: unique symbol;
export interface WholeCanvasSurfaceCompositionDefinitionInternalV1<
  TSource = unknown,
> {
  readonly [wholeCanvasSurfaceCompositionDefinitionBrandInternalV1]: TSource;
}

type WholeCanvasSurfaceAcceptedApplicationNavigationIntentInternalV1 =
  | Readonly<{
    readonly kind: "replace_primary";
    readonly target: WholeCanvasSurfaceTargetV1<string>;
  }>
  | Readonly<{ readonly kind: "close_primary" }>;

export interface BindWholeCanvasSurfaceCompositionPrivateMetadataInputInternalV1 {
  readonly resolveTextInternalV1: (textId: string) => string;
  readonly applyAcceptedNavigationInternalV1: (
    intent: WholeCanvasSurfaceAcceptedApplicationNavigationIntentInternalV1,
  ) => void;
}

interface WholeCanvasSurfaceCompositionDefinitionBindingInternalV1 {
  readonly receiver: CreateWholeCanvasSurfaceCompositionDefinitionInputInternalV1;
  readonly family: WholeCanvasManagedSurfaceFamilyContractInternalV1;
  readonly getSnapshot: CreateWholeCanvasSurfaceCompositionDefinitionInputInternalV1[
    "getSnapshotInternalV1"
  ];
  readonly subscribe: CreateWholeCanvasSurfaceCompositionDefinitionInputInternalV1[
    "subscribeInternalV1"
  ];
  readonly resolveTarget: WholeCanvasManagedSurfaceResolveTargetInternalV1;
  readonly dispatchOwnerAction: WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1;
  readonly prepareTarget: CreateWholeCanvasSurfaceCompositionDefinitionInputInternalV1[
    "prepareTargetInternalV1"
  ];
  readonly render: ComponentType<WholeCanvasSurfaceRendererPropsInternalV1>;
  readonly privateMetadata: {
    current: WholeCanvasSurfaceCompositionPrivateMetadataInternalV1 | null;
  };
}

interface WholeCanvasSurfaceCompositionPrivateMetadataInternalV1 {
  readonly resolveTextInternalV1: (textId: string) => string;
  readonly applyAcceptedNavigationInternalV1: (
    intent: WholeCanvasSurfaceAcceptedApplicationNavigationIntentInternalV1,
  ) => void;
}

interface WholeCanvasApplicationSourceRecordInternalV1 {
  readonly port: WholeCanvasApplicationSourceV1<string>;
  readonly listeners: Set<() => void>;
  state: "unbound" | "bound_unclaimed" | "claimed" | "terminal";
  desired: WholeCanvasSurfaceTargetV1<string> | null;
  catalogByTargetId: ReadonlyMap<string, WholeCanvasManagedSurfaceCatalogRowInternalV1> | null;
}

interface WholeCanvasSurfacePublicDefinitionBindingInternalV1<TSemanticPublication> {
  readonly receiver: DefineWholeCanvasSurfaceInputV1<TSemanticPublication, string, string>;
  readonly family: WholeCanvasManagedSurfaceFamilyContractInternalV1;
  readonly sourceKind: "publication" | "application";
  readonly publicationSource:
    | Readonly<{
      readonly receiver: WholeCanvasSurfacePublicationSourceV1<TSemanticPublication, string>;
      readonly selectPrimary: WholeCanvasSurfacePublicationSourceV1<
        TSemanticPublication,
        string
      >["selectPrimary"];
    }>
    | null;
  readonly applicationSource: WholeCanvasApplicationSourceRecordInternalV1 | null;
  readonly resolveTarget: DefineWholeCanvasSurfaceInputV1<
    TSemanticPublication,
    string,
    string
  >["resolveTarget"];
  readonly dispatchAction: DefineWholeCanvasSurfaceInputV1<
    TSemanticPublication,
    string,
    string
  >["dispatchAction"];
  readonly renderer: DefineWholeCanvasSurfaceInputV1<
    TSemanticPublication,
    string,
    string
  >["renderer"];
  readonly prepareTarget: DefineWholeCanvasSurfaceInputV1<
    TSemanticPublication,
    string,
    string
  >["prepareTarget"];
  readonly resolveText: DefineWholeCanvasSurfaceInputV1<
    TSemanticPublication,
    string,
    string
  >["resolveText"];
  claimState: "unclaimed" | "claimed" | "terminal";
}

interface WholeCanvasSurfaceHostedAdapterRecordInternalV1<TSemanticPublication> {
  readonly adapter: WholeCanvasSurfaceHostedAdapterInternalV1<TSemanticPublication>;
  readonly definition: WholeCanvasSurfaceDefinitionV1<TSemanticPublication>;
  readonly binding: WholeCanvasSurfacePublicDefinitionBindingInternalV1<TSemanticPublication>;
  publication:
    | Readonly<{
      readonly receiver: BindWholeCanvasSurfaceHostedPublicationInputInternalV1<
        TSemanticPublication
      >;
      readonly getSnapshot: BindWholeCanvasSurfaceHostedPublicationInputInternalV1<
        TSemanticPublication
      >["getSnapshotInternalV1"];
      readonly subscribe: BindWholeCanvasSurfaceHostedPublicationInputInternalV1<
        TSemanticPublication
      >["subscribeInternalV1"];
    }>
    | null;
  publicationLocale: string | null;
  presentationRevision: number;
  active: boolean;
  compositionDefinition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown> | null;
  compositionMetadata: WholeCanvasSurfaceCompositionPrivateMetadataInternalV1 | null;
}

const definitionKeysInternalV1 = Object.freeze(
  [
    "catalog",
    "getSnapshotInternalV1",
    "subscribeInternalV1",
    "resolveTargetInternalV1",
    "dispatchOwnerActionInternalV1",
    "prepareTargetInternalV1",
    "renderInternalV1",
  ] as const,
);
const definitionBindingsInternalV1 = new WeakMap<
  object,
  WholeCanvasSurfaceCompositionDefinitionBindingInternalV1
>();
const publicDefinitionKeysInternalV1 = Object.freeze(
  [
    "catalog",
    "source",
    "resolveTarget",
    "dispatchAction",
    "renderer",
    "prepareTarget",
    "resolveText",
  ] as const,
);
const publicDefinitionBindingsInternalV1 = new WeakMap<object, object>();
const applicationSourceRecordsInternalV1 = new WeakMap<
  object,
  WholeCanvasApplicationSourceRecordInternalV1
>();
const hostedAdapterRecordsInternalV1 = new WeakMap<
  object,
  WholeCanvasSurfaceHostedAdapterRecordInternalV1<unknown>
>();
const publicCanonicalLimitsInternalV1 = Object.freeze({
  maxBytes: parsePositiveSafeInteger(
    managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxBytes,
  ),
  maxDepth: parsePositiveSafeInteger(
    managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxDepth,
  ),
  maxNodes: parsePositiveSafeInteger(
    managedSurfaceStableContractLimitsInternalV1.canonicalParameters.maxNodes,
  ),
});
const emptyCatalogInternalV1 = Object.freeze(
  [] as WholeCanvasManagedSurfaceCatalogRowInternalV1[],
);
const emptyFamilyContractInternalV1 = createWholeCanvasManagedSurfaceFamilyContractInternalV1(
  emptyCatalogInternalV1,
);

interface CapturedExactRecordInternalV1 {
  readonly receiver: object;
  readonly values: ReadonlyMap<string, unknown>;
}

function captureFrozenPlainExactRecordInternalV1(
  value: unknown,
  keys: readonly string[],
): CapturedExactRecordInternalV1 | null {
  try {
    if (
      typeof value !== "object" || value === null || Array.isArray(value) ||
      Reflect.getPrototypeOf(value) !== Object.prototype || !Object.isFrozen(value)
    ) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== keys.length ||
      ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
    ) return null;
    const values = new Map<string, unknown>();
    for (const key of keys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined || !("value" in descriptor) ||
        !descriptor.enumerable || descriptor.configurable || descriptor.writable
      ) return null;
      values.set(key, descriptor.value);
    }
    return Object.freeze({ receiver: value, values });
  } catch {
    return null;
  }
}

function isCallableWithoutThenInternalV1(
  value: unknown,
): value is (...args: never[]) => unknown {
  if (typeof value !== "function") return false;
  try {
    if (Reflect.get(value, "then") !== undefined) return false;
    const visited = new Set<object>();
    let current: object | null = value;
    for (let depth = 0; current !== null && depth < 32; depth += 1) {
      if (visited.has(current)) return false;
      visited.add(current);
      if (Reflect.getOwnPropertyDescriptor(current, "then") !== undefined) return false;
      current = Reflect.getPrototypeOf(current);
    }
    return current === null;
  } catch {
    return false;
  }
}

function captureDenseFrozenArrayPublicInternalV1(
  value: unknown,
): readonly unknown[] | null {
  try {
    if (
      !Array.isArray(value) || !Object.isFrozen(value) ||
      Reflect.getPrototypeOf(value) !== Array.prototype
    ) return null;
    const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
      typeof lengthDescriptor.value !== "number" ||
      !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
    ) return null;
    const length = lengthDescriptor.value;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.length !== length + 1) return null;
    const captured: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, String(index));
      if (
        descriptor === undefined || !("value" in descriptor) ||
        !descriptor.enumerable || descriptor.configurable || descriptor.writable
      ) return null;
      captured.push(descriptor.value);
    }
    return Object.freeze(captured);
  } catch {
    return null;
  }
}

function capturePublicTargetInternalV1(
  value: unknown,
): WholeCanvasSurfaceTargetV1<string> | null {
  const captured = captureFrozenPlainExactRecordInternalV1(value, [
    "targetId",
    "parameters",
  ]);
  if (captured === null) return null;
  try {
    const targetId = parseModuleId(captured.values.get("targetId"));
    const parameters = projectBoundedCanonicalJsonInternalV1(
      captured.values.get("parameters"),
      publicCanonicalLimitsInternalV1,
    );
    if (parameters.kind !== "projected") return null;
    return Object.freeze({ targetId, parameters: parameters.value });
  } catch {
    return null;
  }
}

function targetIsPrimaryMemberInternalV1(
  target: WholeCanvasSurfaceTargetV1<string>,
  catalogByTargetId: ReadonlyMap<string, WholeCanvasManagedSurfaceCatalogRowInternalV1>,
): boolean {
  return catalogByTargetId.get(target.targetId)?.placements.includes("primary") === true;
}

function notifyApplicationSourceInternalV1(
  record: WholeCanvasApplicationSourceRecordInternalV1,
): void {
  for (const listener of [...record.listeners]) {
    try {
      listener();
    } catch {
      // Narrow source writes remain committed even when an observer faults.
    }
  }
}

/** Creates the package-owned application selection writer. */
export function createWholeCanvasApplicationSourceV1<TTargetId extends string>(
  initialPrimary: WholeCanvasSurfaceTargetV1<TTargetId>,
): WholeCanvasApplicationSourceV1<TTargetId> {
  const desired = capturePublicTargetInternalV1(initialPrimary);
  if (desired === null) {
    throw new TypeError("ui.whole_canvas_application_source_target_invalid");
  }
  const port = Object.freeze({
    replacePrimary(target: WholeCanvasSurfaceTargetV1<TTargetId>): void {
      if (record.state === "terminal") return;
      const captured = capturePublicTargetInternalV1(target);
      if (
        captured === null ||
        (record.catalogByTargetId !== null &&
          !targetIsPrimaryMemberInternalV1(captured, record.catalogByTargetId))
      ) {
        throw new TypeError("ui.whole_canvas_application_source_target_invalid");
      }
      const changed = record.desired?.targetId !== captured.targetId ||
        JSON.stringify(record.desired.parameters) !== JSON.stringify(captured.parameters);
      record.desired = captured;
      if (changed && record.state === "claimed") notifyApplicationSourceInternalV1(record);
    },
    closePrimary(): void {
      if (record.state === "terminal") return;
      const changed = record.desired !== null;
      record.desired = null;
      if (changed && record.state === "claimed") notifyApplicationSourceInternalV1(record);
    },
  }) as WholeCanvasApplicationSourceV1<TTargetId>;
  const record: WholeCanvasApplicationSourceRecordInternalV1 = {
    port: port as WholeCanvasApplicationSourceV1<string>,
    listeners: new Set(),
    state: "unbound",
    desired,
    catalogByTargetId: null,
  };
  applicationSourceRecordsInternalV1.set(port, record);
  return port;
}

function capturePublicationSourceInternalV1<TSemanticPublication>(
  value: unknown,
):
  | Readonly<{
    readonly receiver: WholeCanvasSurfacePublicationSourceV1<TSemanticPublication, string>;
    readonly selectPrimary: WholeCanvasSurfacePublicationSourceV1<
      TSemanticPublication,
      string
    >["selectPrimary"];
  }>
  | null {
  const captured = captureFrozenPlainExactRecordInternalV1(value, ["kind", "selectPrimary"]);
  const selectPrimary = captured?.values.get("selectPrimary");
  if (
    captured?.values.get("kind") !== "publication" ||
    !isCallableWithoutThenInternalV1(selectPrimary)
  ) return null;
  return Object.freeze({
    receiver: captured.receiver as WholeCanvasSurfacePublicationSourceV1<
      TSemanticPublication,
      string
    >,
    selectPrimary: selectPrimary as WholeCanvasSurfacePublicationSourceV1<
      TSemanticPublication,
      string
    >["selectPrimary"],
  });
}

function capturePublicCatalogInternalV1(
  value: unknown,
): WholeCanvasManagedSurfaceFamilyContractInternalV1 | null {
  const rows = captureDenseFrozenArrayPublicInternalV1(value);
  if (rows === null || rows.length === 0) return null;
  for (const row of rows) {
    const captured = captureFrozenPlainExactRecordInternalV1(row, [
      "targetId",
      "contractRevision",
      "placements",
      "actionIds",
      "defaultActionId",
    ]);
    if (
      captured === null ||
      captureDenseFrozenArrayPublicInternalV1(captured.values.get("placements")) === null ||
      captureDenseFrozenArrayPublicInternalV1(captured.values.get("actionIds")) === null
    ) return null;
  }
  try {
    return createWholeCanvasManagedSurfaceFamilyContractInternalV1(
      value as readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[],
    );
  } catch {
    return null;
  }
}

/** Captures one exact public definition without exposing its runtime authority. */
export function defineWholeCanvasSurfaceV1<
  TSemanticPublication,
  TTargetId extends string,
  TActionId extends string,
>(
  input: DefineWholeCanvasSurfaceInputV1<TSemanticPublication, TTargetId, TActionId>,
): WholeCanvasSurfaceDefinitionV1<TSemanticPublication> {
  const captured = captureFrozenPlainExactRecordInternalV1(
    input,
    publicDefinitionKeysInternalV1,
  );
  const family = capturePublicCatalogInternalV1(captured?.values.get("catalog"));
  const source = captured?.values.get("source");
  const resolveTarget = captured?.values.get("resolveTarget");
  const dispatchAction = captured?.values.get("dispatchAction");
  const renderer = captured?.values.get("renderer");
  const prepareTarget = captured?.values.get("prepareTarget");
  const resolveText = captured?.values.get("resolveText");
  const publicationSource = capturePublicationSourceInternalV1<TSemanticPublication>(source);
  const applicationSource = typeof source === "object" && source !== null
    ? applicationSourceRecordsInternalV1.get(source) ?? null
    : null;
  if (
    captured === null || family === null ||
    (publicationSource === null && applicationSource === null) ||
    !isCallableWithoutThenInternalV1(resolveTarget) ||
    (dispatchAction !== null && !isCallableWithoutThenInternalV1(dispatchAction)) ||
    !isCallableWithoutThenInternalV1(renderer) ||
    (prepareTarget !== null && !isCallableWithoutThenInternalV1(prepareTarget)) ||
    !isCallableWithoutThenInternalV1(resolveText)
  ) {
    throw new TypeError("ui.whole_canvas_surface_definition_invalid");
  }
  if (applicationSource !== null) {
    if (applicationSource.state !== "unbound") {
      throw new TypeError("ui.whole_canvas_application_source_binding_conflict");
    }
    const catalogByTargetId = new Map(
      family.catalog.map((row) => [row.targetId, row] as const),
    );
    if (
      applicationSource.desired !== null &&
      !targetIsPrimaryMemberInternalV1(applicationSource.desired, catalogByTargetId)
    ) {
      throw new TypeError("ui.whole_canvas_surface_definition_invalid");
    }
    // This is deliberately the final fallible state transition in the factory.
    applicationSource.catalogByTargetId = catalogByTargetId;
    applicationSource.state = "bound_unclaimed";
  }
  const definition = Object.freeze({}) as WholeCanvasSurfaceDefinitionV1<TSemanticPublication>;
  publicDefinitionBindingsInternalV1.set(definition, {
    receiver: captured.receiver as unknown as DefineWholeCanvasSurfaceInputV1<
      TSemanticPublication,
      string,
      string
    >,
    family,
    sourceKind: applicationSource === null ? "publication" : "application",
    publicationSource,
    applicationSource,
    resolveTarget: resolveTarget as WholeCanvasSurfacePublicDefinitionBindingInternalV1<
      TSemanticPublication
    >["resolveTarget"],
    dispatchAction: dispatchAction as WholeCanvasSurfacePublicDefinitionBindingInternalV1<
      TSemanticPublication
    >["dispatchAction"],
    renderer: renderer as WholeCanvasSurfacePublicDefinitionBindingInternalV1<
      TSemanticPublication
    >["renderer"],
    prepareTarget: prepareTarget as WholeCanvasSurfacePublicDefinitionBindingInternalV1<
      TSemanticPublication
    >["prepareTarget"],
    resolveText: resolveText as WholeCanvasSurfacePublicDefinitionBindingInternalV1<
      TSemanticPublication
    >["resolveText"],
    claimState: "unclaimed",
  });
  return definition;
}

function captureHostedPublicationSnapshotInternalV1<TSemanticPublication>(
  value: unknown,
): WholeCanvasSurfaceHostedPublicationSnapshotInternalV1<TSemanticPublication> {
  const captured = captureFrozenPlainExactRecordInternalV1(value, ["semantic", "locale"]);
  const locale = captured?.values.get("locale");
  if (
    captured === null ||
    (locale !== null && (typeof locale !== "string" || locale.length === 0))
  ) {
    throw new TypeError("ui.whole_canvas_surface_publication_invalid");
  }
  return captured.receiver as unknown as WholeCanvasSurfaceHostedPublicationSnapshotInternalV1<
    TSemanticPublication
  >;
}

function resolveHostedAdapterRecordInternalV1<TSemanticPublication>(
  adapter: WholeCanvasSurfaceHostedAdapterInternalV1<TSemanticPublication>,
): WholeCanvasSurfaceHostedAdapterRecordInternalV1<TSemanticPublication> {
  const record = hostedAdapterRecordsInternalV1.get(adapter) as
    | WholeCanvasSurfaceHostedAdapterRecordInternalV1<TSemanticPublication>
    | undefined;
  if (record === undefined || !record.active) {
    throw new TypeError("ui.whole_canvas_surface_hosted_adapter_invalid");
  }
  return record;
}

function publicStoryTargetInternalV1(
  target: WholeCanvasSurfaceTargetV1<string>,
  sourceKind: "publication" | "application",
): NonNullable<WholeCanvasManagedSurfaceRootDesiredInternalV1["story"]> {
  return Object.freeze({ sourceKind, target });
}

/** Claims the public recipe once for the hosted aggregate; it never subscribes by itself. */
export function claimWholeCanvasSurfaceHostedAdapterInternalV1<TSemanticPublication>(
  definition: WholeCanvasSurfaceDefinitionV1<TSemanticPublication>,
): WholeCanvasSurfaceHostedAdapterInternalV1<TSemanticPublication> {
  const binding = publicDefinitionBindingsInternalV1.get(definition) as
    | WholeCanvasSurfacePublicDefinitionBindingInternalV1<TSemanticPublication>
    | undefined;
  const applicationSource = binding?.applicationSource ?? null;
  if (
    binding === undefined || binding.claimState !== "unclaimed" ||
    (applicationSource !== null && applicationSource.state !== "bound_unclaimed")
  ) {
    throw new TypeError("ui.whole_canvas_application_source_claim_conflict");
  }
  binding.claimState = "claimed";
  if (applicationSource !== null) applicationSource.state = "claimed";

  const currentPublication = (): WholeCanvasSurfaceHostedPublicationSnapshotInternalV1<
    TSemanticPublication
  > => {
    const publication = record.publication;
    if (publication === null) {
      throw new TypeError("ui.whole_canvas_surface_publication_unbound");
    }
    const snapshot = captureHostedPublicationSnapshotInternalV1<TSemanticPublication>(
      Reflect.apply(publication.getSnapshot, publication.receiver, []),
    );
    if (snapshot.locale !== record.publicationLocale) {
      if (record.presentationRevision === Number.MAX_SAFE_INTEGER) {
        throw new TypeError("ui.whole_canvas_surface_publication_invalid");
      }
      record.publicationLocale = snapshot.locale;
      record.presentationRevision += 1;
    }
    return snapshot;
  };
  const getStoryDesired = (): WholeCanvasManagedSurfaceRootDesiredInternalV1["story"] => {
    if (!record.active || binding.claimState === "terminal") return null;
    if (applicationSource !== null) {
      return applicationSource.desired === null
        ? null
        : publicStoryTargetInternalV1(applicationSource.desired, "application");
    }
    const publication = currentPublication();
    const source = binding.publicationSource!;
    const rawSelection = Reflect.apply(source.selectPrimary, source.receiver, [
      publication.semantic,
    ]);
    const selection = captureFrozenPlainExactRecordInternalV1(rawSelection, ["primary"]);
    const rawPrimary = selection?.values.get("primary");
    const primary = rawPrimary === null ? null : capturePublicTargetInternalV1(rawPrimary);
    const catalogByTargetId = new Map(
      binding.family.catalog.map((row) => [row.targetId, row] as const),
    );
    if (
      selection === null || (rawPrimary !== null && primary === null) ||
      (primary !== null && !targetIsPrimaryMemberInternalV1(primary, catalogByTargetId))
    ) {
      throw new TypeError("ui.whole_canvas_surface_selection_invalid");
    }
    return primary === null ? null : publicStoryTargetInternalV1(primary, "publication");
  };
  const publicOwnerDispatcher = binding.dispatchAction === null ? null : Object.freeze((
    request: Parameters<
      Exclude<WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1, null>
    >[0],
  ) => {
    const publicRequest = Object.freeze({
      placement: request.placement,
      primary: request.primary,
      detail: request.detail,
      actionId: request.actionId,
      payload: request.payload,
    });
    return Reflect.apply(binding.dispatchAction!, binding.receiver, [publicRequest]);
  });
  const wrapResolvedPresentation = (resolved: unknown): unknown => {
    const captured = captureFrozenPlainExactRecordInternalV1(resolved, [
      "accessibleNameTextId",
      "view",
      "actions",
    ]);
    if (captured === null) return resolved;
    return Object.freeze({
      accessibleNameTextId: captured.values.get("accessibleNameTextId"),
      view: Object.freeze({
        publicViewInternalV1: captured.values.get("view"),
        presentationRevisionInternalV1: record.presentationRevision,
      }),
      actions: captured.values.get("actions"),
    });
  };
  const unwrapResolvedPresentationView = (
    view: DeepReadonly<StrictJsonValueV1>,
  ): DeepReadonly<StrictJsonValueV1> => {
    const captured = captureFrozenPlainExactRecordInternalV1(view, [
      "publicViewInternalV1",
      "presentationRevisionInternalV1",
    ]);
    return captured === null
      ? view
      : captured.values.get("publicViewInternalV1") as DeepReadonly<StrictJsonValueV1>;
  };
  const adapter: WholeCanvasSurfaceHostedAdapterInternalV1<TSemanticPublication> = Object.freeze({
    familyInternalV1: binding.family,
    catalogInternalV1: binding.family.catalog,
    sourceKindInternalV1: binding.sourceKind,
    bindPublicationInternalV1(
      input: BindWholeCanvasSurfaceHostedPublicationInputInternalV1<TSemanticPublication>,
    ): void {
      const activeRecord = resolveHostedAdapterRecordInternalV1(adapter);
      const captured = captureFrozenPlainExactRecordInternalV1(input, [
        "getSnapshotInternalV1",
        "subscribeInternalV1",
      ]);
      const getSnapshot = captured?.values.get("getSnapshotInternalV1");
      const subscribe = captured?.values.get("subscribeInternalV1");
      if (
        activeRecord.publication !== null || captured === null ||
        !isCallableWithoutThenInternalV1(getSnapshot) ||
        !isCallableWithoutThenInternalV1(subscribe)
      ) {
        throw new TypeError("ui.whole_canvas_surface_publication_binding_invalid");
      }
      const initialPublication = captureHostedPublicationSnapshotInternalV1<TSemanticPublication>(
        Reflect.apply(getSnapshot, captured.receiver, []),
      );
      activeRecord.publication = Object.freeze({
        receiver: captured.receiver as BindWholeCanvasSurfaceHostedPublicationInputInternalV1<
          TSemanticPublication
        >,
        getSnapshot: getSnapshot as BindWholeCanvasSurfaceHostedPublicationInputInternalV1<
          TSemanticPublication
        >["getSnapshotInternalV1"],
        subscribe: subscribe as BindWholeCanvasSurfaceHostedPublicationInputInternalV1<
          TSemanticPublication
        >["subscribeInternalV1"],
      });
      activeRecord.publicationLocale = initialPublication.locale;
    },
    getStoryDesiredInternalV1: getStoryDesired,
    subscribeStoryInternalV1(listener: () => void): () => void {
      const activeRecord = resolveHostedAdapterRecordInternalV1(adapter);
      const publication = activeRecord.publication;
      if (publication === null || !isCallableWithoutThenInternalV1(listener)) {
        throw new TypeError("ui.whole_canvas_surface_subscription_invalid");
      }
      if (applicationSource !== null) applicationSource.listeners.add(listener);
      let rawUnsubscribe: unknown;
      try {
        rawUnsubscribe = Reflect.apply(publication.subscribe, publication.receiver, [listener]);
      } catch (error) {
        applicationSource?.listeners.delete(listener);
        throw error;
      }
      if (!isCallableWithoutThenInternalV1(rawUnsubscribe)) {
        applicationSource?.listeners.delete(listener);
        throw new TypeError("ui.whole_canvas_surface_subscription_invalid");
      }
      let subscribed = true;
      return Object.freeze((): void => {
        if (!subscribed) return;
        subscribed = false;
        applicationSource?.listeners.delete(listener);
        Reflect.apply(rawUnsubscribe as () => void, undefined, []);
      });
    },
    resolveStoryTargetInternalV1(
      request: Parameters<WholeCanvasManagedSurfaceResolveTargetInternalV1>[0],
    ): unknown {
      if (
        request.rootKind !== "primary" || request.sourceKind !== binding.sourceKind
      ) throw new TypeError("ui.whole_canvas_surface_resolution_invalid");
      const resolved = Reflect.apply(binding.resolveTarget, binding.receiver, [Object.freeze({
        publication: currentPublication().semantic,
        placement: request.placement,
        target: request.target,
      })]);
      if (binding.dispatchAction === null) {
        const captured = captureFrozenPlainExactRecordInternalV1(resolved, [
          "accessibleNameTextId",
          "view",
          "actions",
        ]);
        const actions = captureDenseFrozenArrayPublicInternalV1(captured?.values.get("actions"));
        if (captured === null || actions === null) {
          throw new TypeError("ui.whole_canvas_surface_resolution_invalid");
        }
        for (const action of actions) {
          const capturedAction = captureFrozenPlainExactRecordInternalV1(action, [
            "actionId",
            "status",
            "reasonTextIds",
            "intent",
          ]);
          const capturedIntent = captureFrozenPlainExactRecordInternalV1(
            capturedAction?.values.get("intent"),
            ["kind", "payload"],
          );
          if (capturedAction === null || capturedIntent?.values.get("kind") === "owner") {
            throw new TypeError("ui.whole_canvas_surface_resolution_invalid");
          }
        }
      }
      return wrapResolvedPresentation(resolved);
    },
    dispatchStoryOwnerActionInternalV1: publicOwnerDispatcher,
    prepareStoryTargetInternalV1(
      entry: WholeCanvasManagedSurfaceRenderEntryInternalV1,
      primary: WholeCanvasSurfaceTargetV1<string> | null,
    ): Promise<unknown> {
      if (binding.prepareTarget === null) return Promise.resolve();
      const target = entry.placement === "primary"
        ? Object.freeze({ kind: "primary" as const, primary: entry.target })
        : primary === null
        ? null
        : Object.freeze({
          kind: "detail" as const,
          primary,
          detail: entry.target,
        });
      if (target === null) {
        return Promise.reject(
          new TypeError("ui.whole_canvas_surface_preparation_invalid"),
        );
      }
      let result: unknown;
      try {
        result = Reflect.apply(binding.prepareTarget, binding.receiver, [target]);
      } catch (error) {
        return Promise.reject(error);
      }
      return result instanceof Promise
        ? result
        : Promise.reject(new TypeError("ui.whole_canvas_surface_preparation_invalid"));
    },
    renderStoryInternalV1(
      props: WholeCanvasSurfaceRendererPropsInternalV1,
      primary: WholeCanvasSurfaceTargetV1<string> | null,
    ): ReactNode {
      const { entry } = props;
      const actions = Object.freeze(entry.resolved.actions.map((action) =>
        Object.freeze({
          actionId: action.actionId,
          status: action.status,
          reasonTextIds: action.reasonTextIds,
        })
      ));
      const rendererProps = entry.placement === "primary"
        ? Object.freeze({
          kind: "primary" as const,
          target: entry.target,
          view: unwrapResolvedPresentationView(entry.resolved.view),
          actions,
          resolveText: adapter.resolveTextInternalV1,
          onAction: props.onAction,
          onBack: props.onBack,
        })
        : primary === null
        ? null
        : Object.freeze({
          kind: "detail" as const,
          primary,
          target: entry.target,
          view: unwrapResolvedPresentationView(entry.resolved.view),
          actions,
          resolveText: adapter.resolveTextInternalV1,
          onAction: props.onAction,
          onBack: props.onBack,
        });
      return rendererProps === null ? null : createElement(binding.renderer, rendererProps);
    },
    resolveTextInternalV1(textId: string): string {
      const stableTextId = parseModuleId(textId);
      return Reflect.apply(binding.resolveText, binding.receiver, [
        currentPublication().locale,
        stableTextId,
      ]);
    },
    bindCompositionDefinitionInternalV1(
      compositionDefinition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown>,
      resolveTextInternalV1: (textId: string) => string,
    ): void {
      const activeRecord = resolveHostedAdapterRecordInternalV1(adapter);
      const compositionBinding = resolveDefinitionBindingInternalV1(compositionDefinition);
      if (
        activeRecord.compositionDefinition !== null ||
        compositionBinding.privateMetadata.current !== null ||
        !isCallableWithoutThenInternalV1(resolveTextInternalV1)
      ) {
        throw new TypeError("ui.whole_canvas_surface_hosted_adapter_invalid");
      }
      const metadataInput = Object.freeze({
        resolveTextInternalV1,
        applyAcceptedNavigationInternalV1(
          intent: WholeCanvasSurfaceAcceptedApplicationNavigationIntentInternalV1,
        ): void {
          if (applicationSource === null) return;
          if (intent.kind === "replace_primary") {
            applicationSource.port.replacePrimary(intent.target);
          } else {
            applicationSource.port.closePrimary();
          }
        },
      });
      const metadata = bindCompositionPrivateMetadataCoreInternalV1(
        compositionDefinition,
        metadataInput,
      );
      activeRecord.compositionDefinition = compositionDefinition;
      activeRecord.compositionMetadata = metadata;
    },
    rollbackClaimInternalV1(): void {
      const activeRecord = resolveHostedAdapterRecordInternalV1(adapter);
      if (activeRecord.compositionDefinition !== null) {
        const compositionBinding = resolveDefinitionBindingInternalV1(
          activeRecord.compositionDefinition,
        );
        if (compositionBinding.privateMetadata.current === activeRecord.compositionMetadata) {
          compositionBinding.privateMetadata.current = null;
        }
      }
      activeRecord.active = false;
      activeRecord.publication = null;
      activeRecord.publicationLocale = null;
      activeRecord.presentationRevision = 0;
      activeRecord.compositionDefinition = null;
      activeRecord.compositionMetadata = null;
      binding.claimState = "unclaimed";
      if (applicationSource !== null) {
        applicationSource.listeners.clear();
        applicationSource.state = "bound_unclaimed";
      }
    },
    terminalizeInternalV1(): void {
      const activeRecord = resolveHostedAdapterRecordInternalV1(adapter);
      activeRecord.active = false;
      binding.claimState = "terminal";
      if (applicationSource !== null) {
        applicationSource.listeners.clear();
        applicationSource.state = "terminal";
      }
    },
  });
  const record: WholeCanvasSurfaceHostedAdapterRecordInternalV1<TSemanticPublication> = {
    adapter,
    definition,
    binding,
    publication: null,
    publicationLocale: null,
    presentationRevision: 0,
    active: true,
    compositionDefinition: null,
    compositionMetadata: null,
  };
  hostedAdapterRecordsInternalV1.set(
    adapter,
    record as WholeCanvasSurfaceHostedAdapterRecordInternalV1<unknown>,
  );
  return adapter;
}

function resolveDefinitionBindingInternalV1(
  definition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown>,
): WholeCanvasSurfaceCompositionDefinitionBindingInternalV1 {
  const binding = definitionBindingsInternalV1.get(definition);
  if (binding === undefined) {
    throw new TypeError("ui.whole_canvas_surface_composition_definition_invalid");
  }
  return binding;
}

function bindCompositionPrivateMetadataCoreInternalV1(
  definition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown>,
  input: BindWholeCanvasSurfaceCompositionPrivateMetadataInputInternalV1,
): WholeCanvasSurfaceCompositionPrivateMetadataInternalV1 {
  const captured = captureFrozenPlainExactRecordInternalV1(input, [
    "resolveTextInternalV1",
    "applyAcceptedNavigationInternalV1",
  ]);
  const resolveText = captured?.values.get("resolveTextInternalV1");
  const applyAcceptedNavigation = captured?.values.get(
    "applyAcceptedNavigationInternalV1",
  );
  const binding = resolveDefinitionBindingInternalV1(definition);
  if (
    captured === null || binding.privateMetadata.current !== null ||
    !isCallableWithoutThenInternalV1(resolveText) ||
    !isCallableWithoutThenInternalV1(applyAcceptedNavigation)
  ) {
    throw new TypeError("ui.whole_canvas_surface_private_metadata_invalid");
  }
  const metadata = Object.freeze({
    resolveTextInternalV1: Object.freeze((textId: string): string =>
      Reflect.apply(
        resolveText as BindWholeCanvasSurfaceCompositionPrivateMetadataInputInternalV1[
          "resolveTextInternalV1"
        ],
        captured.receiver,
        [textId],
      )
    ),
    applyAcceptedNavigationInternalV1: Object.freeze(
      (intent: WholeCanvasSurfaceAcceptedApplicationNavigationIntentInternalV1): void => {
        Reflect.apply(
          applyAcceptedNavigation as BindWholeCanvasSurfaceCompositionPrivateMetadataInputInternalV1[
            "applyAcceptedNavigationInternalV1"
          ],
          captured.receiver,
          [intent],
        );
      },
    ),
  });
  binding.privateMetadata.current = metadata;
  return metadata;
}

/** One-shot private Host metadata binding; the seven-key definition remains unchanged. */
export function bindWholeCanvasSurfaceCompositionPrivateMetadataInternalV1(
  definition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown>,
  input: BindWholeCanvasSurfaceCompositionPrivateMetadataInputInternalV1,
): void {
  bindCompositionPrivateMetadataCoreInternalV1(definition, input);
}

/** Captures the entire source-relative definition before any runtime allocation. */
export function createWholeCanvasSurfaceCompositionDefinitionInternalV1<
  TSource = unknown,
>(
  input: CreateWholeCanvasSurfaceCompositionDefinitionInputInternalV1,
): WholeCanvasSurfaceCompositionDefinitionInternalV1<TSource> {
  const captured = captureFrozenPlainExactRecordInternalV1(input, definitionKeysInternalV1);
  const catalog = captured?.values.get("catalog");
  const getSnapshot = captured?.values.get("getSnapshotInternalV1");
  const subscribe = captured?.values.get("subscribeInternalV1");
  const resolveTarget = captured?.values.get("resolveTargetInternalV1");
  const dispatchOwnerAction = captured?.values.get("dispatchOwnerActionInternalV1");
  const prepareTarget = captured?.values.get("prepareTargetInternalV1");
  const render = captured?.values.get("renderInternalV1");
  if (
    captured === null || !isCallableWithoutThenInternalV1(getSnapshot) ||
    !isCallableWithoutThenInternalV1(subscribe) ||
    !isCallableWithoutThenInternalV1(resolveTarget) ||
    (dispatchOwnerAction !== null && !isCallableWithoutThenInternalV1(dispatchOwnerAction)) ||
    (prepareTarget !== null && !isCallableWithoutThenInternalV1(prepareTarget)) ||
    !isCallableWithoutThenInternalV1(render)
  ) {
    throw new TypeError("ui.whole_canvas_surface_composition_definition_invalid");
  }
  let family: WholeCanvasManagedSurfaceFamilyContractInternalV1;
  try {
    family = createWholeCanvasManagedSurfaceFamilyContractInternalV1(
      catalog as readonly WholeCanvasManagedSurfaceCatalogRowInternalV1[],
    );
  } catch (error) {
    throw new TypeError("ui.whole_canvas_surface_composition_definition_invalid", {
      cause: error,
    });
  }
  const definition = Object.freeze(
    {},
  ) as WholeCanvasSurfaceCompositionDefinitionInternalV1<TSource>;
  definitionBindingsInternalV1.set(
    definition,
    Object.freeze({
      receiver: captured.receiver as CreateWholeCanvasSurfaceCompositionDefinitionInputInternalV1,
      family,
      getSnapshot: getSnapshot as WholeCanvasSurfaceCompositionDefinitionBindingInternalV1[
        "getSnapshot"
      ],
      subscribe: subscribe as WholeCanvasSurfaceCompositionDefinitionBindingInternalV1[
        "subscribe"
      ],
      resolveTarget: resolveTarget as WholeCanvasManagedSurfaceResolveTargetInternalV1,
      dispatchOwnerAction:
        dispatchOwnerAction as WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1,
      prepareTarget: prepareTarget as WholeCanvasSurfaceCompositionDefinitionBindingInternalV1[
        "prepareTarget"
      ],
      render: render as ComponentType<WholeCanvasSurfaceRendererPropsInternalV1>,
      privateMetadata: { current: null },
    }),
  );
  return definition;
}

/** Pre-kernel contribution seam; null still contributes the empty dormant family. */
export function resolveWholeCanvasSurfaceCompositionFamilyContractInternalV1(
  definition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown> | null,
): WholeCanvasManagedSurfaceFamilyContractInternalV1 {
  return definition === null
    ? emptyFamilyContractInternalV1
    : resolveDefinitionBindingInternalV1(definition).family;
}

declare const wholeCanvasSurfaceHostBindingBrandInternalV1: unique symbol;
export interface WholeCanvasSurfaceHostBindingInternalV1 {
  readonly [wholeCanvasSurfaceHostBindingBrandInternalV1]: true;
}

export interface WholeCanvasSurfaceHostBindingRuntimeInternalV1 {
  getSnapshotInternalV1(): WholeCanvasManagedSurfaceSnapshotInternalV1;
  subscribeInternalV1(listener: () => void): () => void;
  isCurrentInternalV1(): boolean;
  resolveTextInternalV1(textId: string): string;
  prepareTargetInternalV1(
    readiness: WholeCanvasManagedSurfaceReadinessEntryInternalV1,
  ): Promise<boolean>;
  settleReadinessInternalV1(
    readiness: WholeCanvasManagedSurfaceReadinessEntryInternalV1,
    outcome: "ready" | "failed",
  ): WholeCanvasManagedSurfaceResultInternalV1;
  dispatchActionInternalV1(
    frame: WholeCanvasManagedSurfaceFrameInternalV1,
    actionId: string,
  ): WholeCanvasManagedSurfaceResultInternalV1;
  dismissInternalV1(
    frame: WholeCanvasManagedSurfaceFrameInternalV1,
    kind: ManagedSurfaceDismissKindV1,
  ): WholeCanvasManagedSurfaceResultInternalV1;
  retryCurrentInternalV1(): WholeCanvasManagedSurfaceResultInternalV1;
  failHostInternalV1(error: unknown): void;
  registerHostMountInternalV1(
    input: Readonly<{
      readonly hostIdentity: object;
      readonly portalContainer: HTMLDivElement;
      readonly inputRouter: InputRouterV1;
    }>,
  ): () => void;
  isHostMountCurrentInternalV1(hostIdentity: object): boolean;
  registerHostFocusCommitInternalV1(
    input: Readonly<{
      readonly hostIdentity: object;
      readonly prepareFocusInternalV1: (
        request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
      ) => (() => void) | null;
    }>,
  ): () => void;
  renderInternalV1(props: WholeCanvasSurfaceRendererPropsInternalV1): ReactNode;
}

interface WholeCanvasSurfaceHostFocusCommitInternalV1 {
  readonly hostIdentity: object;
  readonly prepareFocus: (
    request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
  ) => (() => void) | null;
}

interface WholeCanvasSurfaceHostInstalledInputInternalV1 {
  readonly contract: WholeCanvasManagedSurfaceHostCommitInputInternalV1["contract"];
  readonly frame: WholeCanvasManagedSurfaceFrameInternalV1;
}

interface WholeCanvasSurfaceHostPhysicalIngressInternalV1 {
  readonly token: object;
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
  active: boolean;
  unregister: (() => void) | null;
}

type WholeCanvasSurfaceHostPhysicalIngressInputInternalV1 = Readonly<{
  readonly portalContainer: HTMLDivElement;
  readonly inputRouter: InputRouterV1;
}>;

interface HostBindingRecordInternalV1 {
  readonly opaque: WholeCanvasSurfaceHostBindingInternalV1;
  readonly binding: WholeCanvasSurfaceCompositionDefinitionBindingInternalV1;
  readonly preparationResults: WeakMap<
    WholeCanvasManagedSurfacePreparationInternalV1,
    Promise<boolean>
  >;
  readonly runtime: WholeCanvasSurfaceHostBindingRuntimeInternalV1;
  session: WholeCanvasManagedSurfaceSessionInternalV1 | null;
  physicalIngress: WholeCanvasSurfaceHostPhysicalIngressInternalV1 | null;
  installedInput: WholeCanvasSurfaceHostInstalledInputInternalV1 | null;
  hostMountIdentity: object | null;
  focusCommit: WholeCanvasSurfaceHostFocusCommitInternalV1 | null;
  active: boolean;
  terminal: boolean;
  hostGeneration: number;
}

const hostBindingRecordsInternalV1 = new WeakMap<object, HostBindingRecordInternalV1>();
const disposedHostSnapshotInternalV1: WholeCanvasManagedSurfaceSnapshotInternalV1 = Object.freeze({
  root: Object.freeze({ current: null, pending: null, failure: null }),
  detail: Object.freeze({ current: null, pending: null, failure: null }),
  disposed: true,
});
const staleHostResultInternalV1: WholeCanvasManagedSurfaceResultInternalV1 = Object.freeze({
  kind: "stale",
  code: "ui.whole_canvas_stale",
});
const noHostSubscriptionInternalV1 = Object.freeze((): void => undefined);

function releasePhysicalIngressInternalV1(record: HostBindingRecordInternalV1): void {
  const physicalIngress = record.physicalIngress;
  record.physicalIngress = null;
  record.hostMountIdentity = null;
  record.focusCommit = null;
  if (physicalIngress === null) return;
  physicalIngress.active = false;
  const unregister = physicalIngress.unregister;
  physicalIngress.unregister = null;
  try {
    unregister?.();
  } catch {
    // The current generation is already fenced before hostile cleanup runs.
  }
}

export function resolveWholeCanvasSurfaceHostBindingRuntimeInternalV1(
  binding: WholeCanvasSurfaceHostBindingInternalV1,
): WholeCanvasSurfaceHostBindingRuntimeInternalV1 {
  const record = hostBindingRecordsInternalV1.get(binding);
  if (record === undefined || !record.active || record.terminal) {
    throw new TypeError("ui.whole_canvas_surface_host_binding_invalid");
  }
  return record.runtime;
}

function isAcceptedResultInternalV1(result: WholeCanvasManagedSurfaceResultInternalV1): boolean {
  return result.kind === "applied" || result.kind === "unchanged";
}

function readinessIsCurrentInternalV1(
  snapshot: WholeCanvasManagedSurfaceSnapshotInternalV1,
  readiness: WholeCanvasManagedSurfaceReadinessEntryInternalV1,
): boolean {
  return snapshot.root.pending?.preparation === readiness.preparation ||
    snapshot.detail.pending?.preparation === readiness.preparation;
}

function createHostBindingRecordInternalV1(
  binding: WholeCanvasSurfaceCompositionDefinitionBindingInternalV1,
  failHost: (error: unknown) => void,
): Readonly<{
  readonly record: HostBindingRecordInternalV1;
  readonly hostCommitPort: WholeCanvasManagedSurfaceHostCommitPortInternalV1;
}> {
  const opaque = Object.freeze({}) as WholeCanvasSurfaceHostBindingInternalV1;
  const currentSession = (): WholeCanvasManagedSurfaceSessionInternalV1 | null =>
    record.active && !record.terminal ? record.session : null;
  const frameIsInstalled = (frame: WholeCanvasManagedSurfaceFrameInternalV1): boolean =>
    record.installedInput?.frame === frame;
  const runtime: WholeCanvasSurfaceHostBindingRuntimeInternalV1 = Object.freeze({
    getSnapshotInternalV1: () =>
      currentSession()?.getSnapshotInternalV1() ?? disposedHostSnapshotInternalV1,
    subscribeInternalV1(listener: () => void): () => void {
      return currentSession()?.subscribeInternalV1(listener) ?? noHostSubscriptionInternalV1;
    },
    isCurrentInternalV1: () =>
      record.active && !record.terminal && record.session !== null &&
      !record.session.getSnapshotInternalV1().disposed,
    resolveTextInternalV1(textId: string): string {
      const resolver = binding.privateMetadata.current?.resolveTextInternalV1;
      return resolver === undefined ? textId : resolver(textId);
    },
    prepareTargetInternalV1(
      readiness: WholeCanvasManagedSurfaceReadinessEntryInternalV1,
    ): Promise<boolean> {
      const cached = record.preparationResults.get(readiness.preparation);
      if (cached !== undefined) return cached;
      const task = (async (): Promise<boolean> => {
        if (!runtime.isCurrentInternalV1()) return false;
        if (binding.prepareTarget === null) return true;
        try {
          await Reflect.apply(binding.prepareTarget, binding.receiver, [
            readiness.renderEntry,
          ]);
          return runtime.isCurrentInternalV1() &&
            readinessIsCurrentInternalV1(runtime.getSnapshotInternalV1(), readiness);
        } catch {
          return false;
        }
      })();
      record.preparationResults.set(readiness.preparation, task);
      return task;
    },
    settleReadinessInternalV1(
      readiness: WholeCanvasManagedSurfaceReadinessEntryInternalV1,
      outcome: "ready" | "failed",
    ): WholeCanvasManagedSurfaceResultInternalV1 {
      const session = currentSession();
      if (session === null) return staleHostResultInternalV1;
      if (!readinessIsCurrentInternalV1(session.getSnapshotInternalV1(), readiness)) {
        return staleHostResultInternalV1;
      }
      return outcome === "ready"
        ? session.settleReadinessReadyInternalV1(readiness.preparation)
        : session.settleReadinessFailedInternalV1(readiness.preparation);
    },
    dispatchActionInternalV1(
      frame: WholeCanvasManagedSurfaceFrameInternalV1,
      actionId: string,
    ): WholeCanvasManagedSurfaceResultInternalV1 {
      if (!frameIsInstalled(frame)) return staleHostResultInternalV1;
      const session = currentSession();
      if (session === null) return staleHostResultInternalV1;
      const snapshot = session.getSnapshotInternalV1();
      const entry = snapshot.detail.current?.frame === frame
        ? snapshot.detail.current
        : snapshot.detail.pending === null && snapshot.root.current?.frame === frame
        ? snapshot.root.current
        : null;
      const action = entry?.sourceKind === "application"
        ? entry.resolved.actions.find((candidate) =>
          candidate.actionId === actionId && candidate.status === "enabled" &&
          (candidate.intent.kind === "replace_primary" ||
            candidate.intent.kind === "close_primary")
        )
        : undefined;
      const result = session.dispatchActionInternalV1(Object.freeze({ frame, actionId }));
      if (
        action !== undefined &&
        (action.intent.kind === "replace_primary" ||
          action.intent.kind === "close_primary") &&
        isAcceptedResultInternalV1(result)
      ) {
        binding.privateMetadata.current?.applyAcceptedNavigationInternalV1(action.intent);
      }
      return result;
    },
    dismissInternalV1(
      frame: WholeCanvasManagedSurfaceFrameInternalV1,
      kind: ManagedSurfaceDismissKindV1,
    ): WholeCanvasManagedSurfaceResultInternalV1 {
      if (!frameIsInstalled(frame)) return staleHostResultInternalV1;
      return currentSession()?.dismissInternalV1(Object.freeze({ frame, kind })) ??
        staleHostResultInternalV1;
    },
    retryCurrentInternalV1(): WholeCanvasManagedSurfaceResultInternalV1 {
      return currentSession()?.retryCurrentInternalV1() ?? staleHostResultInternalV1;
    },
    failHostInternalV1(error: unknown): void {
      if (runtime.isCurrentInternalV1()) failHost(error);
    },
    registerHostMountInternalV1(
      input: Readonly<{
        readonly hostIdentity: object;
        readonly portalContainer: HTMLDivElement;
        readonly inputRouter: InputRouterV1;
      }>,
    ): () => void {
      const captured = captureFrozenPlainExactRecordInternalV1(input, [
        "hostIdentity",
        "portalContainer",
        "inputRouter",
      ]);
      const hostIdentity = captured?.values.get("hostIdentity");
      const portalContainer = captured?.values.get("portalContainer");
      const inputRouter = captured?.values.get("inputRouter");
      if (
        !runtime.isCurrentInternalV1() || record.physicalIngress === null ||
        record.hostMountIdentity !== null || captured === null ||
        typeof hostIdentity !== "object" || hostIdentity === null ||
        record.physicalIngress.portalContainer !== portalContainer ||
        record.physicalIngress.inputRouter !== inputRouter || !Object.isFrozen(hostIdentity) ||
        Reflect.ownKeys(hostIdentity).length !== 0
      ) throw new TypeError("ui.whole_canvas_surface_host_mount_invalid");
      record.hostMountIdentity = hostIdentity;
      let mounted = true;
      return Object.freeze((): void => {
        if (!mounted) return;
        mounted = false;
        if (record.hostMountIdentity === hostIdentity) record.hostMountIdentity = null;
      });
    },
    isHostMountCurrentInternalV1(hostIdentity: object): boolean {
      return runtime.isCurrentInternalV1() && record.physicalIngress !== null &&
        record.hostMountIdentity === hostIdentity;
    },
    registerHostFocusCommitInternalV1(
      input: Readonly<{
        readonly hostIdentity: object;
        readonly prepareFocusInternalV1: (
          request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
        ) => (() => void) | null;
      }>,
    ): () => void {
      const captured = captureFrozenPlainExactRecordInternalV1(input, [
        "hostIdentity",
        "prepareFocusInternalV1",
      ]);
      const hostIdentity = captured?.values.get("hostIdentity");
      const prepareFocus = captured?.values.get("prepareFocusInternalV1");
      const strictReplay = record.hostMountIdentity === null && record.focusCommit === null &&
        record.physicalIngress !== null;
      if (
        captured === null || !runtime.isCurrentInternalV1() ||
        (record.hostMountIdentity !== hostIdentity && !strictReplay) ||
        record.focusCommit !== null ||
        !isCallableWithoutThenInternalV1(prepareFocus)
      ) throw new TypeError("ui.whole_canvas_surface_host_focus_commit_invalid");
      const registration = Object.freeze({
        hostIdentity: hostIdentity as object,
        prepareFocus: prepareFocus as WholeCanvasSurfaceHostFocusCommitInternalV1["prepareFocus"],
      });
      record.focusCommit = registration;
      let active = true;
      return Object.freeze((): void => {
        if (!active) return;
        active = false;
        if (record.focusCommit === registration) record.focusCommit = null;
      });
    },
    renderInternalV1(props: WholeCanvasSurfaceRendererPropsInternalV1): ReactNode {
      if (!runtime.isCurrentInternalV1()) return null;
      return createElement(binding.render, props);
    },
  });
  const record: HostBindingRecordInternalV1 = {
    opaque,
    binding,
    preparationResults: new WeakMap(),
    runtime,
    session: null,
    physicalIngress: null,
    installedInput: null,
    hostMountIdentity: null,
    focusCommit: null,
    active: true,
    terminal: false,
    hostGeneration: 0,
  };
  const hostCommitPort: WholeCanvasManagedSurfaceHostCommitPortInternalV1 = Object.freeze({
    prepareCommitInternalV1(
      request: WholeCanvasManagedSurfaceHostCommitRequestInternalV1,
    ) {
      if (!record.active || record.terminal) return null;
      record.hostGeneration += 1;
      const hostGeneration = record.hostGeneration;
      const physicalIngress = record.physicalIngress;
      const previousInstalledInput = record.installedInput;
      const focusCommit = record.focusCommit;
      let rollbackFocus: (() => void) | null = null;
      let committed = false;
      let finished = false;
      return Object.freeze({
        hostGeneration,
        commitInternalV1(
          input: WholeCanvasManagedSurfaceHostCommitInputInternalV1,
        ): boolean {
          if (
            committed || finished || !record.active || record.terminal ||
            !Object.isFrozen(input)
          ) return false;
          if (input.contract === null) {
            if (input.nextInputFrame !== null) return false;
            record.installedInput = null;
          } else {
            if (
              physicalIngress === null || !physicalIngress.active ||
              record.physicalIngress !== physicalIngress || input.nextInputFrame === null ||
              !Object.isFrozen(input.contract) || Reflect.ownKeys(input.contract).length !== 0
            ) return false;
            record.installedInput = Object.freeze({
              contract: input.contract,
              frame: input.nextInputFrame,
            });
            if (
              request.kind === "root_readiness" && request.outcome === "failed" &&
              request.retainedRootFrame !== null && previousInstalledInput !== null
            ) {
              record.installedInput = previousInstalledInput;
            }
          }
          if (focusCommit !== null && record.focusCommit === focusCommit) {
            let rawRollback: unknown;
            try {
              rawRollback = Reflect.apply(focusCommit.prepareFocus, undefined, [request]);
            } catch {
              record.installedInput = previousInstalledInput;
              return false;
            }
            if (rawRollback !== null && !isCallableWithoutThenInternalV1(rawRollback)) {
              record.installedInput = previousInstalledInput;
              return false;
            }
            rollbackFocus = rawRollback as (() => void) | null;
          }
          committed = true;
          return true;
        },
        abortInternalV1(): void {
          if (committed && !finished) {
            record.installedInput = previousInstalledInput;
            try {
              rollbackFocus?.();
            } catch {
              // The failed transition is already fenced before DOM rollback.
            }
          }
          finished = true;
        },
        completeInstalledInternalV1(): void {
          finished = true;
        },
      });
    },
    terminalizeInternalV1(): void {
      record.terminal = true;
      record.installedInput = null;
    },
  });
  hostBindingRecordsInternalV1.set(opaque, record);
  return Object.freeze({ record, hostCommitPort });
}

interface WholeCanvasSurfaceCompositionGenerationInternalV1 {
  readonly runtime: ManagedSurfaceCoordinatorRuntimeV1;
  readonly activationGate: ManagedSurfaceFamilyActivationGateInternalV1;
  readonly bindingRecord: HostBindingRecordInternalV1 | null;
  readonly session: WholeCanvasManagedSurfaceSessionInternalV1 | null;
  unsubscribeSource: (() => void) | null;
  active: boolean;
  armed: boolean;
  dirty: boolean;
  reconciling: boolean;
}

export interface WholeCanvasSurfaceCompositionRuntimeInternalV1
  extends ManagedSurfaceFamilyRuntimeAdapterInternalV1 {
  isHostEnabledInternalV1(): boolean;
  getCurrentHostBindingInternalV1(): WholeCanvasSurfaceHostBindingInternalV1 | null;
  isGestureCurrentInternalV1(gestureId: ManagedSurfaceGestureIdV1): boolean;
  registerHostPhysicalIngressInternalV1(
    input: WholeCanvasSurfaceHostPhysicalIngressInputInternalV1,
  ): () => void;
  subscribeInternalV1(listener: () => void): () => void;
  isCurrentRuntimeAttachmentInternalV1(runtime: ManagedSurfaceCoordinatorRuntimeV1): boolean;
  disposeInternalV1(): void;
}

export interface CreateWholeCanvasSurfaceCompositionRuntimeInputInternalV1 {
  readonly definition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown> | null;
  readonly resolveKernelBundleInternalV1: (
    runtime: ManagedSurfaceCoordinatorRuntimeV1,
  ) => ManagedSurfaceCompositeKernelBundleInternalV1;
  readonly reportFailure?: (error: unknown) => void;
  readonly reportActionFailure?: (error: unknown) => void;
  readonly sealCompositionOnFailure?: (error: unknown) => void;
}

/** Creates the dormant fourth-family adapter without publishing a public seam. */
export function createWholeCanvasSurfaceCompositionRuntimeInternalV1(
  input: CreateWholeCanvasSurfaceCompositionRuntimeInputInternalV1,
): WholeCanvasSurfaceCompositionRuntimeInternalV1 {
  const binding = input.definition === null ? null : resolveDefinitionBindingInternalV1(
    input.definition,
  );
  if (!isCallableWithoutThenInternalV1(input.resolveKernelBundleInternalV1)) {
    throw new TypeError("ui.whole_canvas_surface_composition_invalid");
  }
  const listeners = new Set<() => void>();
  let current: WholeCanvasSurfaceCompositionGenerationInternalV1 | null = null;
  let prepared: WholeCanvasSurfaceCompositionGenerationInternalV1 | null = null;
  let disposed = false;
  let failed = false;
  let notifying = false;
  let notificationPending = false;

  const noThrow = (operation: () => void): void => {
    try {
      operation();
    } catch {
      // Terminal fences are independent and best effort.
    }
  };

  const notifyNoThrow = (): void => {
    if (notifying) {
      notificationPending = true;
      return;
    }
    notifying = true;
    try {
      do {
        notificationPending = false;
        for (const listener of [...listeners]) {
          try {
            listener();
          } catch (error) {
            noThrow(() => input.reportFailure?.(error));
          }
        }
      } while (notificationPending);
    } finally {
      notifying = false;
    }
  };

  const retireGeneration = (
    generation: WholeCanvasSurfaceCompositionGenerationInternalV1,
  ): void => {
    generation.active = false;
    const unsubscribe = generation.unsubscribeSource;
    generation.unsubscribeSource = null;
    if (generation.bindingRecord !== null) {
      releasePhysicalIngressInternalV1(generation.bindingRecord);
      generation.bindingRecord.installedInput = null;
      generation.bindingRecord.active = false;
    }
    noThrow(() => unsubscribe?.());
    noThrow(() => generation.session?.disposeInternalV1());
  };

  const readDesired = (): WholeCanvasManagedSurfaceRootDesiredInternalV1 | null => {
    if (binding === null) return null;
    return Reflect.apply(binding.getSnapshot, binding.receiver, []);
  };

  const reconcile = (
    generation: WholeCanvasSurfaceCompositionGenerationInternalV1,
  ): "applied" | "unchanged" => {
    const session = generation.session;
    if (!generation.active || binding === null || session === null) return "unchanged";
    if (generation.reconciling) {
      throw new TypeError("ui.whole_canvas_surface_reconcile_reentered");
    }
    generation.reconciling = true;
    try {
      const result = session.reconcileRootInternalV1(readDesired());
      if (!isAcceptedResultInternalV1(result)) {
        throw new TypeError(`ui.whole_canvas_surface_reconcile_${result.kind}`);
      }
      return result.kind === "applied" ? "applied" : "unchanged";
    } finally {
      generation.reconciling = false;
    }
  };

  const failComposition = (error: unknown): void => {
    if (failed) return;
    failed = true;
    noThrow(() => adapter.disposeInternalV1());
    noThrow(() => input.sealCompositionOnFailure?.(error));
    noThrow(() => input.reportFailure?.(error));
  };

  const adapter: WholeCanvasSurfaceCompositionRuntimeInternalV1 = Object.freeze({
    isHostEnabledInternalV1(): boolean {
      return binding !== null;
    },

    detachRuntimeInternalV1(): void {
      const predecessor = current ?? prepared;
      current = null;
      prepared = null;
      if (predecessor !== null) retireGeneration(predecessor);
    },

    prepareRuntimeAttachmentInternalV1(
      runtime: ManagedSurfaceCoordinatorRuntimeV1,
      activationGate: ManagedSurfaceFamilyActivationGateInternalV1,
    ): void {
      if (disposed || current !== null || prepared !== null || activationGate.isOpen()) {
        throw new TypeError("ui.whole_canvas_surface_composition_prepare_invalid");
      }
      if (binding === null) {
        prepared = {
          runtime,
          activationGate,
          bindingRecord: null,
          session: null,
          unsubscribeSource: null,
          active: true,
          armed: false,
          dirty: false,
          reconciling: false,
        };
        return;
      }
      const bundle = Reflect.apply(input.resolveKernelBundleInternalV1, input, [runtime]);
      if (bundle.applicationEpoch !== runtime.applicationEpoch) {
        throw new TypeError("ui.whole_canvas_surface_composition_kernel_invalid");
      }
      const host = createHostBindingRecordInternalV1(binding, failComposition);
      let session: WholeCanvasManagedSurfaceSessionInternalV1 | null = null;
      try {
        session = createWholeCanvasManagedSurfaceSessionInternalV1(Object.freeze({
          kernelBundle: bundle,
          family: binding.family,
          resolveTargetInternalV1: Object.freeze((
            request: Parameters<WholeCanvasManagedSurfaceResolveTargetInternalV1>[0],
          ) => Reflect.apply(binding.resolveTarget, binding.receiver, [request])),
          dispatchOwnerActionInternalV1: binding.dispatchOwnerAction === null
            ? null
            : Object.freeze((
              request: Parameters<
                Exclude<WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1, null>
              >[0],
            ) => {
              let completion: unknown;
              try {
                completion = Reflect.apply(binding.dispatchOwnerAction!, binding.receiver, [
                  request,
                ]);
              } catch (cause) {
                const error = new TypeError("ui.whole_canvas_surface_action_fault", { cause });
                noThrow(() => input.reportActionFailure?.(error));
                throw cause;
              }
              return Promise.resolve(completion).catch((cause: unknown) => {
                const error = new TypeError("ui.whole_canvas_surface_action_fault", { cause });
                noThrow(() => input.reportActionFailure?.(error));
                throw cause;
              });
            }),
          hostCommitPortInternalV1: host.hostCommitPort,
        }));
        host.record.session = session;
        const generation: WholeCanvasSurfaceCompositionGenerationInternalV1 = {
          runtime,
          activationGate,
          bindingRecord: host.record,
          session,
          unsubscribeSource: null,
          active: true,
          armed: false,
          dirty: false,
          reconciling: false,
        };
        prepared = generation;
        reconcile(generation);
      } catch (error) {
        host.record.active = false;
        noThrow(() => session?.disposeInternalV1());
        throw error;
      }
    },

    activateRuntimeAttachmentInternalV1(): () => void {
      const generation = prepared;
      if (disposed || generation === null || generation.armed) {
        throw new TypeError("ui.whole_canvas_surface_composition_activate_invalid");
      }
      generation.armed = true;
      if (binding !== null) {
        let subscribing = true;
        let reentered = false;
        const listener = (): void => {
          if (!generation.active) return;
          if (subscribing) {
            reentered = true;
            return;
          }
          if (!generation.activationGate.isOpen()) {
            generation.dirty = true;
            return;
          }
          if (generation.reconciling) {
            failComposition(
              new TypeError("ui.whole_canvas_surface_reconcile_reentered"),
            );
            return;
          }
          try {
            generation.dirty = false;
            const result = reconcile(generation);
            if (generation.dirty) {
              throw new TypeError("ui.whole_canvas_surface_reconcile_reentered");
            }
            if (result === "applied") notifyNoThrow();
          } catch (error) {
            failComposition(error);
          }
        };
        let unsubscribe: unknown;
        try {
          unsubscribe = Reflect.apply(binding.subscribe, binding.receiver, [listener]);
        } catch (error) {
          prepared = null;
          retireGeneration(generation);
          throw new TypeError("ui.whole_canvas_surface_subscription_invalid", {
            cause: error,
          });
        } finally {
          subscribing = false;
        }
        if (!isCallableWithoutThenInternalV1(unsubscribe) || reentered) {
          if (typeof unsubscribe === "function") noThrow(unsubscribe as () => void);
          prepared = null;
          retireGeneration(generation);
          throw new TypeError("ui.whole_canvas_surface_subscription_invalid");
        }
        generation.unsubscribeSource = unsubscribe as () => void;
        try {
          reconcile(generation);
        } catch (error) {
          prepared = null;
          retireGeneration(generation);
          throw error;
        }
      }
      return Object.freeze((): void => {
        if (disposed || prepared !== generation || !generation.active) return;
        if (!generation.activationGate.isOpen()) return;
        if (generation.dirty) {
          generation.dirty = false;
          try {
            reconcile(generation);
            if (generation.dirty) {
              throw new TypeError("ui.whole_canvas_surface_reconcile_reentered");
            }
          } catch (error) {
            failComposition(error);
            return;
          }
        }
        prepared = null;
        current = generation;
        notifyNoThrow();
      });
    },

    abortRuntimeAttachmentInternalV1(): void {
      const generation = prepared;
      prepared = null;
      if (generation !== null) retireGeneration(generation);
    },

    getCurrentHostBindingInternalV1(): WholeCanvasSurfaceHostBindingInternalV1 | null {
      return current?.bindingRecord?.opaque ?? null;
    },

    isGestureCurrentInternalV1(gestureId: ManagedSurfaceGestureIdV1): boolean {
      const generation = current;
      return generation !== null && generation.active &&
        generation.runtime.gestureLease.isCurrent(gestureId);
    },

    registerHostPhysicalIngressInternalV1(
      registrationInput: WholeCanvasSurfaceHostPhysicalIngressInputInternalV1,
    ): () => void {
      const registrationFailure = (cause?: unknown): TypeError => {
        const error = cause === undefined
          ? new TypeError("ui.whole_canvas_surface_host_registration_invalid")
          : new TypeError("ui.whole_canvas_surface_host_registration_invalid", { cause });
        failComposition(error);
        return error;
      };
      const generation = current;
      const record = generation?.bindingRecord ?? null;
      const captured = captureFrozenPlainExactRecordInternalV1(
        registrationInput,
        ["portalContainer", "inputRouter"],
      );
      const portalContainer = captured?.values.get("portalContainer");
      const inputRouter = captured?.values.get("inputRouter");
      const capturedRouter = captureFrozenPlainExactRecordInternalV1(inputRouter, [
        "register",
        "route",
        "clearTransientInput",
      ]);
      if (
        disposed || generation === null || !generation.active || record === null ||
        record.physicalIngress !== null || record.session === null || captured === null ||
        typeof HTMLDivElement !== "function" || !(portalContainer instanceof HTMLDivElement) ||
        capturedRouter === null ||
        !isCallableWithoutThenInternalV1(capturedRouter.values.get("register")) ||
        !isCallableWithoutThenInternalV1(capturedRouter.values.get("route")) ||
        !isCallableWithoutThenInternalV1(capturedRouter.values.get("clearTransientInput"))
      ) {
        throw registrationFailure();
      }
      const physicalIngress: WholeCanvasSurfaceHostPhysicalIngressInternalV1 = {
        token: Object.freeze({}),
        portalContainer: portalContainer as HTMLDivElement,
        inputRouter: inputRouter as InputRouterV1,
        active: true,
        unregister: null,
      };
      let rawUnregister: unknown;
      try {
        rawUnregister = Reflect.apply(
          physicalIngress.inputRouter.register,
          physicalIngress.inputRouter,
          [Object.freeze({
            context: "whole_canvas" as const,
            handle: (
              event: Parameters<InputRouterV1["register"]>[0]["handle"] extends (
                event: infer TEvent,
              ) => unknown ? TEvent
                : never,
            ) => {
              if (
                !physicalIngress.active || disposed || current !== generation ||
                !generation.active || record.physicalIngress !== physicalIngress
              ) return inputIgnoredV1;
              const snapshot = record.session?.getSnapshotInternalV1() ??
                disposedHostSnapshotInternalV1;
              if (
                snapshot.root.current === null && snapshot.root.pending === null &&
                snapshot.root.failure === null && snapshot.detail.current === null &&
                snapshot.detail.pending === null && snapshot.detail.failure === null
              ) return inputIgnoredV1;
              if (event.kind === "action") {
                const frame = record.installedInput?.frame ?? null;
                if (frame !== null) {
                  record.runtime.dispatchActionInternalV1(frame, String(event.actionId));
                }
              }
              return inputHandledV1;
            },
          })],
        );
      } catch (error) {
        physicalIngress.active = false;
        throw registrationFailure(error);
      }
      if (!isCallableWithoutThenInternalV1(rawUnregister)) {
        physicalIngress.active = false;
        if (typeof rawUnregister === "function") noThrow(rawUnregister as () => void);
        throw registrationFailure();
      }
      if (
        disposed || current !== generation || !generation.active || !record.active ||
        record.physicalIngress !== null
      ) {
        physicalIngress.active = false;
        noThrow(rawUnregister as () => void);
        throw registrationFailure();
      }
      physicalIngress.unregister = rawUnregister as () => void;
      record.physicalIngress = physicalIngress;
      let registered = true;
      return Object.freeze((): void => {
        if (!registered) return;
        registered = false;
        if (record.physicalIngress === physicalIngress) {
          releasePhysicalIngressInternalV1(record);
        }
      });
    },

    subscribeInternalV1(listener: () => void): () => void {
      if (disposed || binding === null) return Object.freeze(() => undefined);
      listeners.add(listener);
      let active = true;
      return Object.freeze((): void => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      });
    },

    isCurrentRuntimeAttachmentInternalV1(runtime: ManagedSurfaceCoordinatorRuntimeV1): boolean {
      return !disposed && current?.runtime === runtime && runtime.isIngressOpen();
    },

    disposeInternalV1(): void {
      if (disposed) return;
      disposed = true;
      const generation = current ?? prepared;
      current = null;
      prepared = null;
      if (generation !== null) retireGeneration(generation);
      listeners.clear();
    },
  });
  return adapter;
}
