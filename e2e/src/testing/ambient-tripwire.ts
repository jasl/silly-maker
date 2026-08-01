// SPDX-License-Identifier: MIT

declare const Deno: { readonly env: unknown };

export type AmbientTripwireRuntimeV1 = "deno" | "browser";

export type AmbientTripwireCategoryV1 =
  | "entropy"
  | "clock"
  | "host_timezone"
  | "network"
  | "environment"
  | "locale_default"
  | "dom"
  | "capability_escape";

export type AmbientTripwirePhaseV1 = "module_import" | "driver_run";

export type AmbientTripwireUnavailableReasonV1 =
  | "target_resolution_failed"
  | "descriptor_not_replaceable"
  | "replacement_failed"
  | "replacement_ineffective"
  | "self_test_failed"
  | "absence_probe_failed";

export interface AmbientTripwireCoverageV1 {
  readonly guardId: string;
  readonly categories: readonly AmbientTripwireCategoryV1[];
  readonly state: "installed" | "native_absent";
}

export interface AmbientTripwireCountsV1 {
  readonly declaredGuards: number;
  readonly installedGuards: number;
  readonly nativeAbsentGuards: number;
  readonly selfTests: number;
  readonly driverImports: number;
  readonly driverRuns: number;
  readonly violations: number;
}

export interface AmbientTripwirePassedV1<Value> {
  readonly kind: "passed";
  readonly runtime: AmbientTripwireRuntimeV1;
  readonly coverage: readonly AmbientTripwireCoverageV1[];
  readonly counts: AmbientTripwireCountsV1;
  readonly value: Value;
}

export interface AmbientTripwireUnavailableV1 {
  readonly kind: "tripwire_unavailable";
  readonly runtime: AmbientTripwireRuntimeV1;
  readonly guardId: string;
  readonly reason: AmbientTripwireUnavailableReasonV1;
  readonly coverage: readonly AmbientTripwireCoverageV1[];
  readonly counts: AmbientTripwireCountsV1;
}

export interface AmbientTripwireViolationV1 {
  readonly kind: "tripwire_violation";
  readonly runtime: AmbientTripwireRuntimeV1;
  readonly guardId: string;
  readonly code: string;
  readonly category: AmbientTripwireCategoryV1;
  readonly phase: AmbientTripwirePhaseV1;
  readonly coverage: readonly AmbientTripwireCoverageV1[];
  readonly counts: AmbientTripwireCountsV1;
}

export interface AmbientTripwireDriverFailedV1 {
  readonly kind: "driver_failed";
  readonly runtime: AmbientTripwireRuntimeV1;
  readonly phase: AmbientTripwirePhaseV1 | "protocol" | "worker";
  readonly coverage: readonly AmbientTripwireCoverageV1[];
  readonly counts: AmbientTripwireCountsV1;
}

export type AmbientTripwireResultV1<Value> =
  | AmbientTripwirePassedV1<Value>
  | AmbientTripwireUnavailableV1
  | AmbientTripwireViolationV1
  | AmbientTripwireDriverFailedV1;

type AmbientTripwireGuardModeV1 =
  | "function"
  | "value"
  | "date_constructor"
  | "date_constructor_alias"
  | "date_parse"
  | "reflection_object_define_property"
  | "reflection_object_define_properties"
  | "reflection_reflect_define_property"
  | "reflection_reflect_set"
  | "reflection_reflect_delete_property";

export interface AmbientGuardDefinitionV1 {
  readonly guardId: string;
  readonly categories: readonly AmbientTripwireCategoryV1[];
  readonly code: string;
  readonly category: AmbientTripwireCategoryV1;
  readonly path: readonly PropertyKey[];
  readonly mode: AmbientTripwireGuardModeV1;
  readonly absenceProbe: () => unknown;
  readonly absenceErrorName: string;
}

interface LocatedGuardSlotV1 {
  readonly owner: object;
  readonly receiver: object;
  readonly key: PropertyKey;
  readonly descriptor: PropertyDescriptor;
  readonly originalValue: unknown;
}

interface FirstViolationV1 {
  readonly guardId: string;
  readonly code: string;
  readonly category: AmbientTripwireCategoryV1;
  readonly phase: AmbientTripwirePhaseV1;
}

interface MutableCountsV1 {
  declaredGuards: number;
  installedGuards: number;
  nativeAbsentGuards: number;
  selfTests: number;
  driverImports: number;
  driverRuns: number;
  violations: number;
}

const intrinsicDefinePropertyV1 = Object.defineProperty;
const intrinsicGetOwnPropertyDescriptorV1 = Object.getOwnPropertyDescriptor;
const intrinsicGetPrototypeOfV1 = Object.getPrototypeOf;
const intrinsicReflectApplyV1 = Reflect.apply;
const intrinsicReflectConstructV1 = Reflect.construct;
const intrinsicReflectGetV1 = Reflect.get;
const intrinsicReflectOwnKeysV1 = Reflect.ownKeys;

function frozenArrayV1<Value>(values: readonly Value[]): readonly Value[] {
  return Object.freeze([...values]);
}

function snapshotCountsV1(counts: MutableCountsV1): AmbientTripwireCountsV1 {
  return Object.freeze({ ...counts });
}

function emptyCountsV1(): MutableCountsV1 {
  return {
    declaredGuards: 0,
    installedGuards: 0,
    nativeAbsentGuards: 0,
    selfTests: 0,
    driverImports: 0,
    driverRuns: 0,
    violations: 0,
  };
}

export function createEmptyAmbientTripwireCountsV1(): AmbientTripwireCountsV1 {
  return snapshotCountsV1(emptyCountsV1());
}

function createCoverageV1(
  definition: AmbientGuardDefinitionV1,
  state: AmbientTripwireCoverageV1["state"],
): AmbientTripwireCoverageV1 {
  return Object.freeze({
    guardId: definition.guardId,
    categories: frozenArrayV1(definition.categories),
    state,
  });
}

function descriptorValueV1(receiver: object, key: PropertyKey): unknown {
  return intrinsicReflectGetV1(receiver, key, receiver);
}

function findDescriptorV1(
  receiver: object,
  key: PropertyKey,
): { readonly owner: object; readonly descriptor: PropertyDescriptor } | null {
  let candidate: object | null = receiver;
  while (candidate !== null) {
    const descriptor = intrinsicGetOwnPropertyDescriptorV1(candidate, key);
    if (descriptor !== undefined) return Object.freeze({ owner: candidate, descriptor });
    candidate = intrinsicGetPrototypeOfV1(candidate) as object | null;
  }
  return null;
}

function locateGuardSlotV1(
  realm: object,
  path: readonly PropertyKey[],
): LocatedGuardSlotV1 | null {
  if (path.length === 0) return null;
  let receiver = realm;
  for (let index = 0; index < path.length - 1; index += 1) {
    const part = path[index];
    if (part === undefined) return null;
    const next = intrinsicReflectGetV1(receiver, part, receiver);
    if ((typeof next !== "object" || next === null) && typeof next !== "function") return null;
    receiver = next;
  }
  const key = path[path.length - 1];
  if (key === undefined) return null;
  const found = findDescriptorV1(receiver, key);
  if (found === null) return null;
  return Object.freeze({
    owner: found.owner,
    receiver,
    key,
    descriptor: found.descriptor,
    originalValue: descriptorValueV1(receiver, key),
  });
}

function slotCanBeReplacedV1(slot: LocatedGuardSlotV1): boolean {
  return slot.descriptor.configurable === true;
}

function isExpectedAbsenceV1(definition: AmbientGuardDefinitionV1): boolean {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      definition.absenceProbe();
      return false;
    } catch (error) {
      if (!(error instanceof Error) || error.name !== definition.absenceErrorName) return false;
    }
  }
  return true;
}

function validDateTimeFieldsV1(
  match: RegExpExecArray,
  input: {
    readonly secondIndex: number;
    readonly offsetHourIndex?: number;
    readonly offsetMinuteIndex?: number;
  },
): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[input.secondIndex] === undefined ? 0 : Number(match[input.secondIndex]);
  const offsetHour =
    input.offsetHourIndex === undefined || match[input.offsetHourIndex] === undefined
      ? 0
      : Number(match[input.offsetHourIndex]);
  const offsetMinute = input.offsetMinuteIndex === undefined ||
      match[input.offsetMinuteIndex] === undefined
    ? 0
    : Number(match[input.offsetMinuteIndex]);
  if (
    ![year, month, day, hour, minute, second, offsetHour, offsetMinute].every(
      Number.isInteger,
    ) || month < 1 || month > 12 || hour < 0 || hour > 23 || minute < 0 || minute > 59 ||
    second < 0 || second > 59 || offsetHour < 0 || offsetHour > 23 || offsetMinute < 0 ||
    offsetMinute > 59
  ) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = month === 2
    ? (leapYear ? 29 : 28)
    : ([4, 6, 9, 11] as const).includes(month as 4 | 6 | 9 | 11)
    ? 30
    : 31;
  return day >= 1 && day <= daysInMonth;
}

function explicitZoneDateStringV1(value: string): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?(?:Z|[+-](\d{2}):(\d{2}))$/u
      .exec(value);
  return match !== null && validDateTimeFieldsV1(match, {
    secondIndex: 6,
    offsetHourIndex: 7,
    offsetMinuteIndex: 8,
  });
}

function localZoneDateStringV1(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/u.exec(
    value,
  );
  return match !== null && validDateTimeFieldsV1(match, { secondIndex: 6 });
}

function protectedSlotV1(
  protectedSlots: WeakMap<object, Set<PropertyKey>>,
  target: unknown,
  key: unknown,
): boolean {
  if ((typeof target !== "object" || target === null) && typeof target !== "function") {
    return false;
  }
  return protectedSlots.get(target)?.has(key as PropertyKey) ?? false;
}

function registerProtectedSlotV1(
  protectedSlots: WeakMap<object, Set<PropertyKey>>,
  target: object,
  key: PropertyKey,
): void {
  const keys = protectedSlots.get(target) ?? new Set<PropertyKey>();
  keys.add(key);
  protectedSlots.set(target, keys);
}

function definitionV1(input: {
  readonly guardId: string;
  readonly categories: readonly AmbientTripwireCategoryV1[];
  readonly code: string;
  readonly category: AmbientTripwireCategoryV1;
  readonly path: readonly PropertyKey[];
  readonly mode: AmbientTripwireGuardModeV1;
  readonly absenceProbe: () => unknown;
  readonly absenceErrorName: string;
}): AmbientGuardDefinitionV1 {
  return Object.freeze({
    ...input,
    categories: frozenArrayV1(input.categories),
    path: frozenArrayV1(input.path),
  });
}

export function createFunctionAmbientGuardDefinitionV1(input: {
  readonly guardId: string;
  readonly category: AmbientTripwireCategoryV1;
  readonly code: string;
  readonly path: readonly PropertyKey[];
  readonly absenceProbe: () => unknown;
  readonly absenceErrorName: string;
}): AmbientGuardDefinitionV1 {
  return definitionV1({
    ...input,
    categories: Object.freeze([input.category]),
    mode: "function",
  });
}

function createValueAmbientGuardDefinitionV1(input: {
  readonly guardId: string;
  readonly category: AmbientTripwireCategoryV1;
  readonly code: string;
  readonly path: readonly PropertyKey[];
  readonly absenceProbe: () => unknown;
  readonly absenceErrorName: string;
}): AmbientGuardDefinitionV1 {
  return definitionV1({
    ...input,
    categories: Object.freeze([input.category]),
    mode: "value",
  });
}

function createReflectionDefinitionV1(input: {
  readonly guardId: string;
  readonly path: readonly PropertyKey[];
  readonly mode: AmbientTripwireGuardModeV1;
}): AmbientGuardDefinitionV1 {
  return definitionV1({
    ...input,
    categories: Object.freeze(["capability_escape"]),
    category: "capability_escape",
    code: "determinism.ambient_capability_escape",
    absenceProbe: () => {
      throw new ReferenceError("reflection intrinsic is absent");
    },
    absenceErrorName: "ReferenceError",
  });
}

export function createReflectionAmbientGuardDefinitionsV1(): readonly AmbientGuardDefinitionV1[] {
  return Object.freeze([
    createReflectionDefinitionV1({
      guardId: "reflection.object-define-property",
      path: Object.freeze(["Object", "defineProperty"]),
      mode: "reflection_object_define_property",
    }),
    createReflectionDefinitionV1({
      guardId: "reflection.object-define-properties",
      path: Object.freeze(["Object", "defineProperties"]),
      mode: "reflection_object_define_properties",
    }),
    createReflectionDefinitionV1({
      guardId: "reflection.reflect-define-property",
      path: Object.freeze(["Reflect", "defineProperty"]),
      mode: "reflection_reflect_define_property",
    }),
    createReflectionDefinitionV1({
      guardId: "reflection.reflect-set",
      path: Object.freeze(["Reflect", "set"]),
      mode: "reflection_reflect_set",
    }),
    createReflectionDefinitionV1({
      guardId: "reflection.reflect-delete-property",
      path: Object.freeze(["Reflect", "deleteProperty"]),
      mode: "reflection_reflect_delete_property",
    }),
  ]);
}

interface InstallContextV1 {
  readonly definition: AmbientGuardDefinitionV1;
  readonly realm: object;
  readonly slot: LocatedGuardSlotV1;
  readonly sentinel: object;
  readonly protectedSlots: WeakMap<object, Set<PropertyKey>>;
  signal(input?: {
    readonly guardId?: string;
    readonly code?: string;
    readonly category?: AmbientTripwireCategoryV1;
  }): never;
}

function guardSetterV1(context: InstallContextV1): () => never {
  return () =>
    context.signal({
      guardId: `${context.definition.guardId}.write`,
      code: "determinism.ambient_capability_escape",
      category: "capability_escape",
    });
}

function installAccessorV1(
  context: InstallContextV1,
  getter: () => unknown,
): AmbientTripwireUnavailableReasonV1 | null {
  try {
    intrinsicDefinePropertyV1(context.slot.owner, context.slot.key, {
      configurable: false,
      enumerable: context.slot.descriptor.enumerable ?? false,
      get: getter,
      set: guardSetterV1(context),
    });
  } catch {
    return "replacement_failed";
  }
  return null;
}

function expectSentinelV1(operation: () => unknown, sentinel: object): boolean {
  try {
    operation();
    return false;
  } catch (error) {
    return error === sentinel;
  }
}

function installFunctionGuardV1(
  context: InstallContextV1,
): AmbientTripwireUnavailableReasonV1 | null {
  const guarded = function ambientTripwireGuardV1(): never {
    return context.signal();
  };
  const failed = installAccessorV1(context, () => guarded);
  if (failed !== null) return failed;
  if (descriptorValueV1(context.slot.receiver, context.slot.key) !== guarded) {
    return "replacement_ineffective";
  }
  if (
    !expectSentinelV1(
      () => intrinsicReflectApplyV1(guarded, context.slot.receiver, []),
      context.sentinel,
    )
  ) return "self_test_failed";
  return null;
}

function installValueGuardV1(
  context: InstallContextV1,
): AmbientTripwireUnavailableReasonV1 | null {
  const failed = installAccessorV1(context, () => context.signal());
  if (failed !== null) return failed;
  if (
    !expectSentinelV1(
      () => descriptorValueV1(context.slot.receiver, context.slot.key),
      context.sentinel,
    )
  ) return "self_test_failed";
  return null;
}

function installDateConstructorGuardV1(
  context: InstallContextV1,
): AmbientTripwireUnavailableReasonV1 | null {
  if (typeof context.slot.originalValue !== "function") return "self_test_failed";
  const OriginalDate = context.slot.originalValue as DateConstructor;
  const originalParse = OriginalDate.parse;
  const guarded = function AmbientTripwireDateV1(
    this: unknown,
    ...args: readonly unknown[]
  ): unknown {
    if (new.target === undefined || args.length === 0) {
      return context.signal({
        guardId: "clock.date-constructor",
        code: "determinism.ambient_clock",
        category: "clock",
      });
    }
    if (args.length !== 1) {
      return context.signal({
        guardId: "host-timezone.date-constructor",
        code: "determinism.host_timezone",
        category: "host_timezone",
      });
    }
    const value = args[0];
    const safe =
      (typeof value === "number" && Number.isSafeInteger(value) && Math.abs(value) <= 8.64e15) ||
      value instanceof OriginalDate ||
      (typeof value === "string" && explicitZoneDateStringV1(value) &&
        Number.isFinite(originalParse(value)));
    if (!safe) {
      if (typeof value === "string" && localZoneDateStringV1(value)) {
        return context.signal({
          guardId: "host-timezone.date-constructor",
          code: "determinism.host_timezone",
          category: "host_timezone",
        });
      }
      return context.signal({
        guardId: "host-timezone.date-input",
        code: "determinism.date_input_unverified",
        category: "host_timezone",
      });
    }
    return intrinsicReflectConstructV1(OriginalDate, [value], OriginalDate);
  };
  try {
    intrinsicDefinePropertyV1(guarded, "prototype", {
      configurable: false,
      value: OriginalDate.prototype,
      writable: false,
    });
    for (const key of ["now", "parse"] as const) {
      intrinsicDefinePropertyV1(guarded, key, {
        configurable: false,
        enumerable: false,
        get: () => intrinsicReflectGetV1(OriginalDate, key, OriginalDate),
        set: guardSetterV1(context),
      });
    }
    intrinsicDefinePropertyV1(guarded, "UTC", {
      configurable: false,
      enumerable: false,
      value: OriginalDate.UTC,
      writable: false,
    });
    for (const key of ["prototype", "now", "parse", "UTC"] as const) {
      registerProtectedSlotV1(context.protectedSlots, guarded, key);
    }
  } catch {
    return "replacement_failed";
  }
  const failed = installAccessorV1(context, () => guarded);
  if (failed !== null) return failed;
  if (descriptorValueV1(context.slot.receiver, context.slot.key) !== guarded) {
    return "replacement_ineffective";
  }
  if (!expectSentinelV1(() => intrinsicReflectApplyV1(guarded, undefined, []), context.sentinel)) {
    return "self_test_failed";
  }
  if (!expectSentinelV1(() => intrinsicReflectConstructV1(guarded, []), context.sentinel)) {
    return "self_test_failed";
  }
  if (intrinsicGetPrototypeOfV1(guarded) !== intrinsicGetPrototypeOfV1(function () {})) {
    return "self_test_failed";
  }
  const epoch = intrinsicReflectConstructV1(guarded, [0]);
  if (!(epoch instanceof OriginalDate) || epoch.toISOString() !== "1970-01-01T00:00:00.000Z") {
    return "self_test_failed";
  }
  return null;
}

function installDateParseGuardV1(
  context: InstallContextV1,
): AmbientTripwireUnavailableReasonV1 | null {
  if (typeof context.slot.originalValue !== "function") return "self_test_failed";
  const original = context.slot.originalValue as (value: string) => number;
  const guarded = function ambientTripwireDateParseV1(...args: readonly unknown[]): number {
    if (args.length === 1 && typeof args[0] === "string") {
      if (explicitZoneDateStringV1(args[0])) {
        return intrinsicReflectApplyV1(original, context.slot.receiver, [args[0]]) as number;
      }
      if (localZoneDateStringV1(args[0])) return context.signal();
    }
    return context.signal({
      guardId: "host-timezone.date-input",
      code: "determinism.date_input_unverified",
      category: "host_timezone",
    });
  };
  const failed = installAccessorV1(context, () => guarded);
  if (failed !== null) return failed;
  if (descriptorValueV1(context.slot.receiver, context.slot.key) !== guarded) {
    return "replacement_ineffective";
  }
  if (!expectSentinelV1(() => guarded("2026-08-02T00:00:00"), context.sentinel)) {
    return "self_test_failed";
  }
  if (!Number.isFinite(guarded("2026-08-02T00:00:00Z"))) return "self_test_failed";
  return null;
}

function installDateConstructorAliasGuardV1(
  context: InstallContextV1,
): AmbientTripwireUnavailableReasonV1 | null {
  const guardedDate = intrinsicReflectGetV1(context.realm, "Date", context.realm);
  if (typeof guardedDate !== "function") return "self_test_failed";
  const failed = installAccessorV1(context, () => guardedDate);
  if (failed !== null) return failed;
  if (descriptorValueV1(context.slot.receiver, context.slot.key) !== guardedDate) {
    return "replacement_ineffective";
  }
  if (
    !expectSentinelV1(
      () => intrinsicReflectApplyV1(guardedDate, undefined, []),
      context.sentinel,
    )
  ) return "self_test_failed";
  return null;
}

function firstProtectedSlotV1(
  protectedSlots: WeakMap<object, Set<PropertyKey>>,
  candidates: readonly LocatedGuardSlotV1[],
): LocatedGuardSlotV1 | null {
  for (const candidate of candidates) {
    if (
      protectedSlots.get(candidate.owner)?.has(candidate.key) ||
      protectedSlots.get(candidate.receiver)?.has(candidate.key)
    ) return candidate;
  }
  return null;
}

function installReflectionGuardV1(
  context: InstallContextV1,
  installedSlots: readonly LocatedGuardSlotV1[],
): AmbientTripwireUnavailableReasonV1 | null {
  if (typeof context.slot.originalValue !== "function") return "self_test_failed";
  const original = context.slot.originalValue as (...args: readonly unknown[]) => unknown;
  const operation = context.definition.mode;
  const guarded = function ambientTripwireReflectionV1(...args: readonly unknown[]): unknown {
    const target = args[0];
    if (operation === "reflection_object_define_properties") {
      const descriptors = args[1];
      if (
        (typeof descriptors === "object" && descriptors !== null) ||
        typeof descriptors === "function"
      ) {
        for (const key of intrinsicReflectOwnKeysV1(descriptors)) {
          if (protectedSlotV1(context.protectedSlots, target, key)) return context.signal();
        }
      }
    } else if (protectedSlotV1(context.protectedSlots, target, args[1])) {
      return context.signal();
    }
    return intrinsicReflectApplyV1(original, context.slot.receiver, args);
  };
  const failed = installAccessorV1(context, () => guarded);
  if (failed !== null) return failed;
  if (descriptorValueV1(context.slot.receiver, context.slot.key) !== guarded) {
    return "replacement_ineffective";
  }

  try {
    if (operation === "reflection_object_define_property") {
      const safe = Object.create(null) as Record<PropertyKey, unknown>;
      guarded(safe, "value", { value: 1 });
      if (safe.value !== 1) return "self_test_failed";
    }
    const protectedSlot = firstProtectedSlotV1(context.protectedSlots, installedSlots);
    if (protectedSlot === null) return "self_test_failed";
    const mutation = operation === "reflection_object_define_properties"
      ? () => guarded(protectedSlot.receiver, { [protectedSlot.key]: { value: null } })
      : operation === "reflection_reflect_set"
      ? () => guarded(protectedSlot.receiver, protectedSlot.key, null)
      : operation === "reflection_reflect_delete_property"
      ? () => guarded(protectedSlot.receiver, protectedSlot.key)
      : () => guarded(protectedSlot.receiver, protectedSlot.key, { value: null });
    if (!expectSentinelV1(mutation, context.sentinel)) return "self_test_failed";
  } catch {
    return "self_test_failed";
  }
  return null;
}

function installDefinitionV1(
  context: InstallContextV1,
  installedSlots: readonly LocatedGuardSlotV1[],
): AmbientTripwireUnavailableReasonV1 | null {
  switch (context.definition.mode) {
    case "function":
      return installFunctionGuardV1(context);
    case "value":
      return installValueGuardV1(context);
    case "date_constructor":
      return installDateConstructorGuardV1(context);
    case "date_constructor_alias":
      return installDateConstructorAliasGuardV1(context);
    case "date_parse":
      return installDateParseGuardV1(context);
    case "reflection_object_define_property":
    case "reflection_object_define_properties":
    case "reflection_reflect_define_property":
    case "reflection_reflect_set":
    case "reflection_reflect_delete_property":
      return installReflectionGuardV1(context, installedSlots);
  }
  throw new TypeError("unknown ambient tripwire guard mode");
}

function probeXmlHttpRequestV1(): unknown {
  return XMLHttpRequest;
}

function probeDocumentV1(): unknown {
  return document;
}

function probeWindowV1(): unknown {
  return window;
}

function probeLocalStorageV1(): unknown {
  return localStorage;
}

function probeSessionStorageV1(): unknown {
  return sessionStorage;
}

function probeDenoEnvironmentV1(): unknown {
  return Deno.env;
}

function probeProcessEnvironmentV1(): unknown {
  return process.env;
}

function probeTemporalNowV1(): unknown {
  const temporal =
    (globalThis as typeof globalThis & { readonly Temporal?: { readonly Now: unknown } })
      .Temporal;
  return temporal!.Now;
}

function missingMemberCallV1(owner: unknown, key: PropertyKey): unknown {
  return intrinsicReflectApplyV1(
    intrinsicReflectGetV1(owner as object, key, owner),
    owner,
    [],
  );
}

function functionGuardV1(input: {
  readonly guardId: string;
  readonly category: AmbientTripwireCategoryV1;
  readonly code: string;
  readonly path: readonly PropertyKey[];
  readonly absenceProbe?: () => unknown;
  readonly absenceErrorName?: string;
}): AmbientGuardDefinitionV1 {
  return createFunctionAmbientGuardDefinitionV1({
    ...input,
    absenceProbe: input.absenceProbe ?? (() => {
      throw new ReferenceError("ambient binding is absent");
    }),
    absenceErrorName: input.absenceErrorName ?? "ReferenceError",
  });
}

export function createAuthoritativeAmbientGuardDefinitionsV1(): readonly AmbientGuardDefinitionV1[] {
  const dateConstructor = definitionV1({
    guardId: "clock.date-constructor",
    categories: Object.freeze(["clock", "host_timezone"]),
    code: "determinism.ambient_clock",
    category: "clock",
    path: Object.freeze(["Date"]),
    mode: "date_constructor",
    absenceProbe: () => Date,
    absenceErrorName: "ReferenceError",
  });
  const dateParse = definitionV1({
    guardId: "host-timezone.date-parse",
    categories: Object.freeze(["host_timezone"]),
    code: "determinism.host_timezone",
    category: "host_timezone",
    path: Object.freeze(["Date", "parse"]),
    mode: "date_parse",
    absenceProbe: () => Date.parse("2026-08-02T00:00:00"),
    absenceErrorName: "ReferenceError",
  });
  const dateConstructorAlias = definitionV1({
    guardId: "clock.date-prototype-constructor",
    categories: Object.freeze(["clock", "host_timezone"]),
    code: "determinism.ambient_clock",
    category: "clock",
    path: Object.freeze(["Date", "prototype", "constructor"]),
    mode: "date_constructor_alias",
    absenceProbe: () => Date.prototype.constructor,
    absenceErrorName: "ReferenceError",
  });
  const dateHostDependentMembers = Object.freeze(
    [
      "getDate",
      "getDay",
      "getFullYear",
      "getHours",
      "getMilliseconds",
      "getMinutes",
      "getMonth",
      "getSeconds",
      "getTimezoneOffset",
      "getYear",
      "setDate",
      "setFullYear",
      "setHours",
      "setMilliseconds",
      "setMinutes",
      "setMonth",
      "setSeconds",
      "setYear",
      "toDateString",
      "toString",
      "toTimeString",
    ] as const,
  );
  const dateHostDependentGuards = dateHostDependentMembers.map((member) =>
    functionGuardV1({
      guardId: `host-timezone.date-${member}`,
      category: "host_timezone",
      code: "determinism.host_timezone",
      path: Object.freeze(["Date", "prototype", member]),
      absenceProbe: () => missingMemberCallV1(new Date(0), member),
      absenceErrorName: "TypeError",
    })
  );
  return Object.freeze([
    functionGuardV1({
      guardId: "entropy.math-random",
      category: "entropy",
      code: "determinism.ambient_random",
      path: Object.freeze(["Math", "random"]),
      absenceProbe: () => Math.random(),
    }),
    functionGuardV1({
      guardId: "entropy.crypto-get-random-values",
      category: "entropy",
      code: "determinism.crypto_random",
      path: Object.freeze(["crypto", "getRandomValues"]),
      absenceProbe: () => missingMemberCallV1(globalThis.crypto, "getRandomValues"),
      absenceErrorName: "TypeError",
    }),
    functionGuardV1({
      guardId: "entropy.crypto-random-uuid",
      category: "entropy",
      code: "determinism.crypto_random",
      path: Object.freeze(["crypto", "randomUUID"]),
      absenceProbe: () => missingMemberCallV1(globalThis.crypto, "randomUUID"),
      absenceErrorName: "TypeError",
    }),
    functionGuardV1({
      guardId: "clock.date-now",
      category: "clock",
      code: "determinism.ambient_clock",
      path: Object.freeze(["Date", "now"]),
      absenceProbe: () => Date.now(),
    }),
    dateParse,
    ...dateHostDependentGuards,
    functionGuardV1({
      guardId: "host-timezone.date-to-primitive",
      category: "host_timezone",
      code: "determinism.host_timezone",
      path: Object.freeze(["Date", "prototype", Symbol.toPrimitive]),
      absenceProbe: () => `${new Date(0)}`,
    }),
    dateConstructor,
    dateConstructorAlias,
    functionGuardV1({
      guardId: "clock.performance-now",
      category: "clock",
      code: "determinism.performance_clock",
      path: Object.freeze(["performance", "now"]),
      absenceProbe: () => performance.now(),
    }),
    functionGuardV1({
      guardId: "clock.performance-to-json",
      category: "clock",
      code: "determinism.performance_clock",
      path: Object.freeze(["performance", "toJSON"]),
      absenceProbe: () => performance.toJSON(),
      absenceErrorName: "TypeError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "clock.performance-time-origin",
      category: "clock",
      code: "determinism.performance_clock",
      path: Object.freeze(["performance", "timeOrigin"]),
      absenceProbe: () => performance.timeOrigin,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "clock.performance-root",
      category: "clock",
      code: "determinism.performance_clock",
      path: Object.freeze(["performance"]),
      absenceProbe: () => performance,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "clock.temporal-now",
      category: "clock",
      code: "determinism.ambient_clock",
      path: Object.freeze(["Temporal", "Now"]),
      absenceProbe: probeTemporalNowV1,
      absenceErrorName: "TypeError",
    }),
    functionGuardV1({
      guardId: "network.fetch",
      category: "network",
      code: "determinism.network",
      path: Object.freeze(["fetch"]),
      absenceProbe: () => fetch("data:,tripwire-probe"),
    }),
    functionGuardV1({
      guardId: "network.xml-http-request",
      category: "network",
      code: "determinism.network",
      path: Object.freeze(["XMLHttpRequest"]),
      absenceProbe: probeXmlHttpRequestV1,
    }),
    functionGuardV1({
      guardId: "network.web-socket",
      category: "network",
      code: "determinism.network",
      path: Object.freeze(["WebSocket"]),
      absenceProbe: () => WebSocket,
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "environment.process-env",
      category: "environment",
      code: "determinism.environment",
      path: Object.freeze(["process", "env"]),
      absenceProbe: probeProcessEnvironmentV1,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "environment.process-root",
      category: "environment",
      code: "determinism.environment",
      path: Object.freeze(["process"]),
      absenceProbe: () => process,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "environment.deno-env",
      category: "environment",
      code: "determinism.environment",
      path: Object.freeze(["Deno", "env"]),
      absenceProbe: probeDenoEnvironmentV1,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "environment.deno-root",
      category: "environment",
      code: "determinism.environment",
      path: Object.freeze(["Deno"]),
      absenceProbe: () => Deno,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "locale.intl",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["Intl"]),
      absenceProbe: () => Intl,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "locale.navigator-language",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["navigator", "language"]),
      absenceProbe: () => navigator.language,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "locale.navigator-languages",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["navigator", "languages"]),
      absenceProbe: () => navigator.languages,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "environment.navigator-user-agent",
      category: "environment",
      code: "determinism.environment",
      path: Object.freeze(["navigator", "userAgent"]),
      absenceProbe: () => navigator.userAgent,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "environment.navigator-platform",
      category: "environment",
      code: "determinism.environment",
      path: Object.freeze(["navigator", "platform"]),
      absenceProbe: () => navigator.platform,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "environment.navigator-hardware-concurrency",
      category: "environment",
      code: "determinism.environment",
      path: Object.freeze(["navigator", "hardwareConcurrency"]),
      absenceProbe: () => navigator.hardwareConcurrency,
      absenceErrorName: "ReferenceError",
    }),
    functionGuardV1({
      guardId: "locale.string-locale-compare",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["String", "prototype", "localeCompare"]),
      absenceProbe: () => "a".localeCompare("b"),
    }),
    functionGuardV1({
      guardId: "locale.string-to-locale-lower-case",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["String", "prototype", "toLocaleLowerCase"]),
      absenceProbe: () => "A".toLocaleLowerCase(),
    }),
    functionGuardV1({
      guardId: "locale.string-to-locale-upper-case",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["String", "prototype", "toLocaleUpperCase"]),
      absenceProbe: () => "a".toLocaleUpperCase(),
    }),
    functionGuardV1({
      guardId: "locale.number-to-locale-string",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["Number", "prototype", "toLocaleString"]),
      absenceProbe: () => (1).toLocaleString(),
    }),
    functionGuardV1({
      guardId: "locale.bigint-to-locale-string",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["BigInt", "prototype", "toLocaleString"]),
      absenceProbe: () => (1n).toLocaleString(),
    }),
    functionGuardV1({
      guardId: "locale.date-to-locale-string",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["Date", "prototype", "toLocaleString"]),
      absenceProbe: () => new Date(0).toLocaleString(),
    }),
    functionGuardV1({
      guardId: "locale.date-to-locale-date-string",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["Date", "prototype", "toLocaleDateString"]),
      absenceProbe: () => new Date(0).toLocaleDateString(),
    }),
    functionGuardV1({
      guardId: "locale.date-to-locale-time-string",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["Date", "prototype", "toLocaleTimeString"]),
      absenceProbe: () => new Date(0).toLocaleTimeString(),
    }),
    functionGuardV1({
      guardId: "locale.array-to-locale-string",
      category: "locale_default",
      code: "determinism.locale",
      path: Object.freeze(["Array", "prototype", "toLocaleString"]),
      absenceProbe: () => [1].toLocaleString(),
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "dom.document",
      category: "dom",
      code: "determinism.dom_storage",
      path: Object.freeze(["document"]),
      absenceProbe: probeDocumentV1,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "dom.window",
      category: "dom",
      code: "determinism.dom_storage",
      path: Object.freeze(["window"]),
      absenceProbe: probeWindowV1,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "dom.local-storage",
      category: "dom",
      code: "determinism.dom_storage",
      path: Object.freeze(["localStorage"]),
      absenceProbe: probeLocalStorageV1,
      absenceErrorName: "ReferenceError",
    }),
    createValueAmbientGuardDefinitionV1({
      guardId: "dom.session-storage",
      category: "dom",
      code: "determinism.dom_storage",
      path: Object.freeze(["sessionStorage"]),
      absenceProbe: probeSessionStorageV1,
      absenceErrorName: "ReferenceError",
    }),
    ...createReflectionAmbientGuardDefinitionsV1(),
  ]);
}

function unavailableResultV1(
  runtime: AmbientTripwireRuntimeV1,
  definition: AmbientGuardDefinitionV1,
  reason: AmbientTripwireUnavailableReasonV1,
  coverage: readonly AmbientTripwireCoverageV1[],
  counts: MutableCountsV1,
): AmbientTripwireUnavailableV1 {
  return Object.freeze({
    kind: "tripwire_unavailable",
    runtime,
    guardId: definition.guardId,
    reason,
    coverage: frozenArrayV1(coverage),
    counts: snapshotCountsV1(counts),
  });
}

export async function runAmbientTripwireProbeV1<Value>(input: {
  readonly runtime: AmbientTripwireRuntimeV1;
  readonly realm: object;
  readonly guards: readonly AmbientGuardDefinitionV1[];
  readonly loadDriver: () => Promise<{ readonly run: () => Promise<Value> }>;
}): Promise<AmbientTripwireResultV1<Value>> {
  const counts = emptyCountsV1();
  counts.declaredGuards = input.guards.length;
  const coverage: AmbientTripwireCoverageV1[] = [];
  const protectedSlots = new WeakMap<object, Set<PropertyKey>>();
  const installedSlots: LocatedGuardSlotV1[] = [];
  const sentinel = Object.freeze({ kind: "ambient_tripwire_sentinel" });
  let armed = false;
  let phase: AmbientTripwirePhaseV1 = "module_import";
  let firstViolation: FirstViolationV1 | null = null;
  const readFirstViolation = (): FirstViolationV1 | null => firstViolation;

  const signal = (
    definition: AmbientGuardDefinitionV1,
    override: {
      readonly guardId?: string;
      readonly code?: string;
      readonly category?: AmbientTripwireCategoryV1;
    } = {},
  ): never => {
    if (armed) {
      counts.violations += 1;
      firstViolation ??= Object.freeze({
        guardId: override.guardId ?? definition.guardId,
        code: override.code ?? definition.code,
        category: override.category ?? definition.category,
        phase,
      });
    }
    throw sentinel;
  };

  for (const definition of input.guards) {
    let slot: LocatedGuardSlotV1 | null;
    try {
      slot = locateGuardSlotV1(input.realm, definition.path);
    } catch {
      return unavailableResultV1(
        input.runtime,
        definition,
        "target_resolution_failed",
        coverage,
        counts,
      );
    }
    if (slot === null) {
      if (!isExpectedAbsenceV1(definition)) {
        return unavailableResultV1(
          input.runtime,
          definition,
          "absence_probe_failed",
          coverage,
          counts,
        );
      }
      counts.nativeAbsentGuards += 1;
      counts.selfTests += 1;
      coverage.push(createCoverageV1(definition, "native_absent"));
      continue;
    }
    if (!slotCanBeReplacedV1(slot)) {
      return unavailableResultV1(
        input.runtime,
        definition,
        "descriptor_not_replaceable",
        coverage,
        counts,
      );
    }
    registerProtectedSlotV1(protectedSlots, slot.owner, slot.key);
    registerProtectedSlotV1(protectedSlots, slot.receiver, slot.key);
    const reason = installDefinitionV1(
      {
        definition,
        realm: input.realm,
        slot,
        sentinel,
        protectedSlots,
        signal: (override) => signal(definition, override),
      },
      installedSlots,
    );
    if (reason !== null) {
      return unavailableResultV1(input.runtime, definition, reason, coverage, counts);
    }
    installedSlots.push(slot);
    counts.installedGuards += 1;
    counts.selfTests += 1;
    coverage.push(createCoverageV1(definition, "installed"));
  }

  armed = true;
  counts.driverImports += 1;
  phase = "module_import";
  let driver: { readonly run: () => Promise<Value> };
  try {
    driver = await input.loadDriver();
    if (driver === null || typeof driver !== "object" || typeof driver.run !== "function") {
      throw new TypeError("tripwire driver is malformed");
    }
  } catch {
    const violation = readFirstViolation();
    if (violation !== null) {
      return Object.freeze({
        kind: "tripwire_violation",
        runtime: input.runtime,
        ...violation,
        coverage: frozenArrayV1(coverage),
        counts: snapshotCountsV1(counts),
      });
    }
    return Object.freeze({
      kind: "driver_failed",
      runtime: input.runtime,
      phase,
      coverage: frozenArrayV1(coverage),
      counts: snapshotCountsV1(counts),
    });
  }

  const importViolation = readFirstViolation();
  if (importViolation !== null) {
    return Object.freeze({
      kind: "tripwire_violation",
      runtime: input.runtime,
      ...importViolation,
      coverage: frozenArrayV1(coverage),
      counts: snapshotCountsV1(counts),
    });
  }

  counts.driverRuns += 1;
  phase = "driver_run";
  let value: Value;
  try {
    value = await driver.run();
  } catch {
    const violation = readFirstViolation();
    if (violation !== null) {
      return Object.freeze({
        kind: "tripwire_violation",
        runtime: input.runtime,
        ...violation,
        coverage: frozenArrayV1(coverage),
        counts: snapshotCountsV1(counts),
      });
    }
    return Object.freeze({
      kind: "driver_failed",
      runtime: input.runtime,
      phase,
      coverage: frozenArrayV1(coverage),
      counts: snapshotCountsV1(counts),
    });
  }
  const violation = readFirstViolation();
  if (violation !== null) {
    return Object.freeze({
      kind: "tripwire_violation",
      runtime: input.runtime,
      ...violation,
      coverage: frozenArrayV1(coverage),
      counts: snapshotCountsV1(counts),
    });
  }
  return Object.freeze({
    kind: "passed",
    runtime: input.runtime,
    coverage: frozenArrayV1(coverage),
    counts: snapshotCountsV1(counts),
    value,
  });
}
