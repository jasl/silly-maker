// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger, type NonNegativeSafeInteger } from "@sillymaker/base";

import type { ManagedSurfaceCoordinatorRecipeV1 } from "./managed-surface-coordinator-lifetime.ts";
import {
  createManagedSurfaceCoordinatorFacadeInternalV1,
  type ManagedSurfaceCoordinatorV1,
  type ManagedSurfaceSubscriberFailureV1,
} from "./managed-surface-coordinator.ts";
import type { ManagedSurfaceResolvedSlotDescriptorV1 } from "./managed-surface-contracts.ts";
import { parseManagedSurfaceResolvedDefinitionV1 } from "./managed-surface-definition.ts";
import { createManagedSurfaceReducerStateV1 } from "./managed-surface-reducer.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
} from "./managed-surface-stable-admission.ts";
import {
  createManagedSurfaceStableCompositeRuntimeKernelInternalV1,
  type ManagedSurfaceStableCompositeRuntimeKernelInternalV1,
} from "./managed-surface-stable-composite-state.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";

export interface ManagedSurfaceCompositeKernelBundleInternalV1 {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly coordinator: ManagedSurfaceCoordinatorV1;
  readonly publisherLeaseRegistry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly admissionAuthority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly compositeRuntimeKernel: ManagedSurfaceStableCompositeRuntimeKernelInternalV1;
  readonly exactAggregateDefinitionSidecars:
    readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
  readonly exactAggregateSlotDescriptors: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
}

interface ExactOwnDataRecordInternalV1 {
  readonly receiver: object;
  readonly values: Readonly<Record<string, unknown>>;
}

interface CapturedReporterInternalV1 {
  readonly receiver: object;
  readonly callable: (failure: ManagedSurfaceSubscriberFailureV1) => void;
}

const bundleInputKeysInternalV1 = Object.freeze(
  [
    "applicationEpoch",
    "recipe",
    "definitionSidecars",
  ] as const,
);
const recipeRequiredKeysInternalV1 = Object.freeze(
  [
    "resolvedOwnerIds",
    "resolvedSlotDescriptors",
  ] as const,
);
const recipeReporterKeyInternalV1 = "reportSubscriberFailure" as const;
const sidecarKeysInternalV1 = Object.freeze(["definition", "parameterSchema"] as const);
const invalidBundleCodeInternalV1 = "ui.managed_surface_composite_kernel_bundle_invalid";

function captureExactFrozenOwnDataRecordInternalV1(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKey: string | null = null,
): ExactOwnDataRecordInternalV1 | null {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return null;
  if (Array.isArray(value)) return null;
  const receiver = value as object;
  if (!Object.isFrozen(receiver)) return null;
  const prototype = Reflect.getPrototypeOf(receiver);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const ownKeys = Reflect.ownKeys(receiver);
  const expectedCount = requiredKeys.length +
    (optionalKey !== null && ownKeys.includes(optionalKey) ? 1 : 0);
  if (ownKeys.length !== expectedCount) return null;
  const allowedKeys = new Set(requiredKeys);
  if (optionalKey !== null) allowedKeys.add(optionalKey);
  if (ownKeys.some((key) => typeof key !== "string" || !allowedKeys.has(key))) return null;
  const values: Record<string, unknown> = Object.create(null);
  for (const key of ownKeys) {
    if (typeof key !== "string") return null;
    const descriptor = Reflect.getOwnPropertyDescriptor(receiver, key);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    Object.defineProperty(values, key, {
      configurable: false,
      enumerable: true,
      writable: false,
      value: descriptor.value,
    });
  }
  return Object.freeze({ receiver, values: Object.freeze(values) });
}

function captureDenseFrozenOwnDataArrayInternalV1(value: unknown): readonly unknown[] | null {
  if (!Array.isArray(value) || !Object.isFrozen(value)) return null;
  if (Reflect.getPrototypeOf(value) !== Array.prototype) return null;
  const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, "length");
  if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) return null;
  const lengthValue = lengthDescriptor.value;
  if (typeof lengthValue !== "number" || !Number.isSafeInteger(lengthValue) || lengthValue < 0) {
    return null;
  }
  const length = lengthValue;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1 || keys[keys.length - 1] !== "length") return null;
  const captured: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    if (keys[index] !== key) return null;
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    captured.push(descriptor.value);
  }
  return Object.freeze(captured);
}

function captureDefinitionSidecarsInternalV1(
  value: unknown,
): readonly ManagedSurfaceStableDefinitionSidecarInternalV1[] | null {
  const values = captureDenseFrozenOwnDataArrayInternalV1(value);
  if (values === null) return null;
  const identities = new Set<object>();
  for (const sidecar of values) {
    if ((typeof sidecar !== "object" && typeof sidecar !== "function") || sidecar === null) {
      return null;
    }
    if (identities.has(sidecar)) return null;
    identities.add(sidecar);
  }

  const definitionIds = new Set<string>();
  for (const sidecar of values) {
    const captured = captureExactFrozenOwnDataRecordInternalV1(sidecar, sidecarKeysInternalV1);
    if (captured === null) return null;
    const definition = captured.values.definition;
    if (
      (typeof definition !== "object" && typeof definition !== "function") ||
      definition === null || !Object.isFrozen(definition)
    ) {
      return null;
    }
    const parsedDefinition = parseManagedSurfaceResolvedDefinitionV1(definition);
    if (definitionIds.has(parsedDefinition.definitionId)) return null;
    definitionIds.add(parsedDefinition.definitionId);

    const schema = captured.values.parameterSchema;
    if (
      (typeof schema !== "object" && typeof schema !== "function") || schema === null ||
      !Object.isFrozen(schema)
    ) {
      return null;
    }
    const parseDescriptor = Reflect.getOwnPropertyDescriptor(schema, "parse");
    if (
      parseDescriptor === undefined || !("value" in parseDescriptor) ||
      typeof parseDescriptor.value !== "function"
    ) {
      return null;
    }
  }
  return values as readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
}

function captureReporterInternalV1(
  recipe: ExactOwnDataRecordInternalV1,
): CapturedReporterInternalV1 | null | undefined {
  if (!Object.hasOwn(recipe.values, recipeReporterKeyInternalV1)) return undefined;
  const callable = recipe.values[recipeReporterKeyInternalV1];
  return typeof callable === "function"
    ? Object.freeze({
      receiver: recipe.receiver,
      callable: callable as (failure: ManagedSurfaceSubscriberFailureV1) => void,
    })
    : null;
}

/**
 * Builds the single composition-owned authority graph for an exact aggregate
 * family catalog. All caller-controlled structure is snapshotted before any
 * registry, admission authority, runtime kernel, or Coordinator is allocated.
 */
export function createManagedSurfaceCompositeKernelBundleInternalV1(input: {
  readonly applicationEpoch: NonNegativeSafeInteger;
  readonly recipe: ManagedSurfaceCoordinatorRecipeV1;
  readonly definitionSidecars: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
}): ManagedSurfaceCompositeKernelBundleInternalV1 {
  let applicationEpoch: NonNegativeSafeInteger;
  let initialTransientState: ReturnType<typeof createManagedSurfaceReducerStateV1>;
  let exactAggregateDefinitionSidecars: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
  let reporter: CapturedReporterInternalV1 | undefined;
  try {
    const capturedInput = captureExactFrozenOwnDataRecordInternalV1(
      input,
      bundleInputKeysInternalV1,
    );
    if (capturedInput === null) throw new TypeError();
    const capturedRecipe = captureExactFrozenOwnDataRecordInternalV1(
      capturedInput.values.recipe,
      recipeRequiredKeysInternalV1,
      recipeReporterKeyInternalV1,
    );
    if (capturedRecipe === null) throw new TypeError();
    const resolvedOwnerIds = captureDenseFrozenOwnDataArrayInternalV1(
      capturedRecipe.values.resolvedOwnerIds,
    );
    const resolvedSlotDescriptors = captureDenseFrozenOwnDataArrayInternalV1(
      capturedRecipe.values.resolvedSlotDescriptors,
    );
    if (resolvedOwnerIds === null || resolvedSlotDescriptors === null) throw new TypeError();
    applicationEpoch = parseNonNegativeSafeInteger(capturedInput.values.applicationEpoch);
    initialTransientState = createManagedSurfaceReducerStateV1(
      applicationEpoch,
      resolvedOwnerIds as ManagedSurfaceCoordinatorRecipeV1["resolvedOwnerIds"],
      resolvedSlotDescriptors as ManagedSurfaceCoordinatorRecipeV1["resolvedSlotDescriptors"],
    );
    const capturedSidecars = captureDefinitionSidecarsInternalV1(
      capturedInput.values.definitionSidecars,
    );
    if (capturedSidecars === null) throw new TypeError();
    exactAggregateDefinitionSidecars = capturedSidecars;
    const capturedReporter = captureReporterInternalV1(capturedRecipe);
    if (capturedReporter === null) throw new TypeError();
    reporter = capturedReporter;
  } catch {
    throw new TypeError(invalidBundleCodeInternalV1);
  }

  const publisherLeaseRegistry = createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch,
    resolvedOwnerIds: initialTransientState.resolvedOwnerIds,
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
  const admissionAuthority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry,
    definitionSidecars: exactAggregateDefinitionSidecars,
    resolvedSlotDescriptors: initialTransientState.resolvedSlotDescriptors,
  });
  const compositeRuntimeKernel = createManagedSurfaceStableCompositeRuntimeKernelInternalV1({
    admissionAuthority,
    publisherLeaseRegistry,
    initialTransientState,
    ...(reporter === undefined ? {} : {
      reportSubscriberFailure: () => {
        Reflect.apply(reporter.callable, reporter.receiver, [Object.freeze({
          code: "surface.subscriber_failed" as const,
          summary: "Managed Surface publication subscriber failed.",
          details: Object.freeze({ applicationEpoch }),
        })]);
      },
    }),
  });
  return Object.freeze({
    applicationEpoch,
    coordinator: createManagedSurfaceCoordinatorFacadeInternalV1(compositeRuntimeKernel),
    publisherLeaseRegistry,
    admissionAuthority,
    compositeRuntimeKernel,
    exactAggregateDefinitionSidecars,
    exactAggregateSlotDescriptors: initialTransientState.resolvedSlotDescriptors,
  });
}
