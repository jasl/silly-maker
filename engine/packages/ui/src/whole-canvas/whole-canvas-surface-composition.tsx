// SPDX-License-Identifier: MIT
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

function resolveDefinitionBindingInternalV1(
  definition: WholeCanvasSurfaceCompositionDefinitionInternalV1<unknown>,
): WholeCanvasSurfaceCompositionDefinitionBindingInternalV1 {
  const binding = definitionBindingsInternalV1.get(definition);
  if (binding === undefined) {
    throw new TypeError("ui.whole_canvas_surface_composition_definition_invalid");
  }
  return binding;
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
  return snapshot.root.pending === readiness || snapshot.detail.pending === readiness;
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
      return currentSession()?.dispatchActionInternalV1(Object.freeze({ frame, actionId })) ??
        staleHostResultInternalV1;
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
          publisherLeaseRegistry: bundle.publisherLeaseRegistry,
          admissionAuthority: bundle.admissionAuthority,
          compositeRuntimeKernel: bundle.compositeRuntimeKernel,
          exactAggregateDefinitionSidecars: bundle.exactAggregateDefinitionSidecars,
          exactAggregateSlotDescriptors: bundle.exactAggregateSlotDescriptors,
          catalog: binding.family.catalog,
          resolveTargetInternalV1: Object.freeze((
            request: Parameters<WholeCanvasManagedSurfaceResolveTargetInternalV1>[0],
          ) => Reflect.apply(binding.resolveTarget, binding.receiver, [request])),
          dispatchOwnerActionInternalV1: binding.dispatchOwnerAction === null
            ? null
            : Object.freeze((
              request: Parameters<
                Exclude<WholeCanvasManagedSurfaceOwnerActionDispatcherInternalV1, null>
              >[0],
            ) => Reflect.apply(binding.dispatchOwnerAction!, binding.receiver, [request])),
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
