// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { DeepReadonly } from "@sillymaker/base";
import {
  inputIgnoredV1,
  parseInputActionIdV1,
  type InputContextIdV1,
  type InputEventV1,
  type InputHandlerResultV1,
  type InputRouteResultV1,
  type InputRouterV1,
} from "./contracts.ts";

const inputContextPrecedenceV1 = Object.freeze(
  [
    "debug",
    "system",
    "overlay",
    "narrative",
    "interaction",
    "gameplay",
  ] as const satisfies readonly InputContextIdV1[],
);

const inputContextIdsV1 = new Set<InputContextIdV1>(inputContextPrecedenceV1);

const handledResultsV1 = Object.freeze({
  debug: Object.freeze({ kind: "handled" as const, context: "debug" as const }),
  system: Object.freeze({ kind: "handled" as const, context: "system" as const }),
  overlay: Object.freeze({ kind: "handled" as const, context: "overlay" as const }),
  narrative: Object.freeze({ kind: "handled" as const, context: "narrative" as const }),
  interaction: Object.freeze({ kind: "handled" as const, context: "interaction" as const }),
  gameplay: Object.freeze({ kind: "handled" as const, context: "gameplay" as const }),
}) satisfies Readonly<Record<InputContextIdV1, InputRouteResultV1>>;

const focusLossEventV1 = Object.freeze({ kind: "focus_loss" as const });
const actionEventKeysV1 = Object.freeze(["kind", "actionId"] as const);
const viewportPointEventKeysV1 = Object.freeze(
  [
    "kind",
    "phase",
    "point",
    "pointerId",
    "pointerType",
  ] as const,
);
const viewportPointKeysV1 = Object.freeze(["x", "y"] as const);
const pointerCancelEventKeysV1 = Object.freeze(["kind", "pointerId"] as const);
const focusLossEventKeysV1 = Object.freeze(["kind"] as const);

type InputHandlerV1 = (event: DeepReadonly<InputEventV1>) => InputHandlerResultV1;

interface InputHandlerRegistrationV1 {
  readonly handle: InputHandlerV1;
}

interface DispatchRegistrationV1 {
  readonly context: InputContextIdV1;
  readonly handle: InputHandlerV1;
}

export interface ManagedInputHandlerRegistrationV1 {
  readonly context: InputContextIdV1;
  readonly handle: InputHandlerV1;
}

type ManagedInputRegistrarV1 = (
  registration: ManagedInputHandlerRegistrationV1,
) => () => void;

const managedInputRegistrarsV1 = new WeakMap<InputRouterV1, ManagedInputRegistrarV1>();
const directManagedInputRegistrarsV1 = new WeakMap<InputRouterV1, ManagedInputRegistrarV1>();
const managedInputRouterFacadeTerminalInternalV1 = Object.freeze({ kind: "terminal" as const });
const managedInputRouterFacadeNoopInternalV1 = Object.freeze((): void => {});

interface ManagedInputRouterFacadeRecordInternalV1 {
  active: boolean;
  facade: InputRouterV1 | null;
  target: InputRouterV1 | null;
  isIngressOpen: (() => boolean) | null;
  registrar: ManagedInputRegistrarV1 | null;
  readonly cleanup: () => void;
}

const managedInputRouterFacadeRecordsInternalV1 = new WeakMap<
  InputRouterV1,
  ManagedInputRouterFacadeRecordInternalV1 | typeof managedInputRouterFacadeTerminalInternalV1
>();

function isInputContextIdV1(value: unknown): value is InputContextIdV1 {
  return typeof value === "string" && inputContextIdsV1.has(value as InputContextIdV1);
}

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactOwnKeysV1(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Reflect.ownKeys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((expectedKey) => Object.hasOwn(value, expectedKey))
  );
}

function isCallableWithoutThenV1(value: unknown): value is (...args: never[]) => unknown {
  if (typeof value !== "function") return false;
  try {
    if (Reflect.get(value, "then") !== undefined) return false;
    const visited = new Set<object>();
    let current: object | null = value;
    while (current !== null) {
      if (visited.has(current)) return false;
      visited.add(current);
      if (Reflect.getOwnPropertyDescriptor(current, "then") !== undefined) return false;
      current = Reflect.getPrototypeOf(current);
    }
    return true;
  } catch {
    return false;
  }
}

function captureFrozenExactOwnDataV1(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  try {
    if (
      !isRecordV1(value) || Reflect.getPrototypeOf(value) !== Object.prototype ||
      !Object.isFrozen(value)
    ) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== expectedKeys.length ||
      ownKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
    ) return null;
    const captured: Record<string, unknown> = Object.create(null);
    for (const key of expectedKeys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true || descriptor.configurable !== false ||
        descriptor.writable !== false
      ) return null;
      if (Reflect.get(value, key) !== descriptor.value) return null;
      captured[key] = descriptor.value;
    }
    return captured;
  } catch {
    return null;
  }
}

function isNonNegativeSafeIntegerV1(value: unknown): boolean {
  try {
    parseNonNegativeSafeInteger(value);
    return true;
  } catch {
    return false;
  }
}

function isInputActionIdV1(value: unknown): boolean {
  try {
    parseInputActionIdV1(value as string);
    return true;
  } catch {
    return false;
  }
}

function assertInputEventV1(event: unknown): asserts event is DeepReadonly<InputEventV1> {
  if (!isRecordV1(event)) {
    throw new TypeError("ui.invalid_input_event");
  }

  switch (event.kind) {
    case "action":
      if (!hasExactOwnKeysV1(event, actionEventKeysV1) || !isInputActionIdV1(event.actionId)) {
        throw new TypeError("ui.invalid_input_event");
      }
      return;
    case "viewport_point": {
      const point = event.point;
      if (
        !hasExactOwnKeysV1(event, viewportPointEventKeysV1) ||
        (event.phase !== "begin" && event.phase !== "activate") ||
        !isRecordV1(point) ||
        !hasExactOwnKeysV1(point, viewportPointKeysV1) ||
        typeof point.x !== "number" ||
        !Number.isFinite(point.x) ||
        typeof point.y !== "number" ||
        !Number.isFinite(point.y) ||
        !isNonNegativeSafeIntegerV1(event.pointerId) ||
        (event.pointerType !== "mouse" &&
          event.pointerType !== "touch" &&
          event.pointerType !== "pen")
      ) {
        throw new TypeError("ui.invalid_input_event");
      }
      return;
    }
    case "pointer_cancel":
      if (
        !hasExactOwnKeysV1(event, pointerCancelEventKeysV1) ||
        !isNonNegativeSafeIntegerV1(event.pointerId)
      ) {
        throw new TypeError("ui.invalid_input_event");
      }
      return;
    case "focus_loss":
      if (!hasExactOwnKeysV1(event, focusLossEventKeysV1)) {
        throw new TypeError("ui.invalid_input_event");
      }
      return;
    default:
      throw new TypeError("ui.invalid_input_event");
  }
}

function assertHandlerResultV1(result: unknown): asserts result is InputHandlerResultV1 {
  if (!isRecordV1(result) || (result.kind !== "handled" && result.kind !== "ignored")) {
    throw new TypeError("ui.invalid_input_handler_result");
  }
}

function createRegistrationSnapshotV1(
  registrations: ReadonlyMap<InputContextIdV1, readonly InputHandlerRegistrationV1[]>,
  managedRegistrations: ReadonlyMap<InputContextIdV1, readonly InputHandlerRegistrationV1[]>,
): readonly DispatchRegistrationV1[] {
  const snapshot: DispatchRegistrationV1[] = [];
  for (const context of inputContextPrecedenceV1) {
    for (
      const contextRegistrations of [
        managedRegistrations.get(context),
        registrations.get(context),
      ]
    ) {
      if (contextRegistrations === undefined) continue;
      for (let index = contextRegistrations.length - 1; index >= 0; index -= 1) {
        const registration = contextRegistrations[index];
        if (registration !== undefined) {
          snapshot.push(Object.freeze({ context, handle: registration.handle }));
        }
      }
    }
  }
  return Object.freeze(snapshot);
}

export function registerManagedInputHandlerV1(
  router: InputRouterV1,
  registration: ManagedInputHandlerRegistrationV1,
): () => void {
  const registrar = managedInputRegistrarsV1.get(router);
  if (registrar === undefined) {
    throw new TypeError("ui.managed_input_router_required");
  }
  return registrar(registration);
}

export function bindManagedInputRouterFacadeInternalV1(
  input: Readonly<{
    readonly facade: InputRouterV1;
    readonly target: InputRouterV1;
    readonly isIngressOpen: () => boolean;
  }>,
): () => void {
  const invalid = (): never => {
    throw new TypeError("ui.managed_input_router_facade_invalid");
  };
  const capturedInput = captureFrozenExactOwnDataV1(input, [
    "facade",
    "target",
    "isIngressOpen",
  ]);
  if (capturedInput === null) return invalid();
  const facade = capturedInput.facade as InputRouterV1;
  const target = capturedInput.target as InputRouterV1;
  const isIngressOpen = capturedInput.isIngressOpen;
  const capturedFacade = captureFrozenExactOwnDataV1(facade, [
    "register",
    "route",
    "clearTransientInput",
  ]);
  const targetRegistrar = directManagedInputRegistrarsV1.get(target);
  if (
    capturedFacade === null || facade === target ||
    directManagedInputRegistrarsV1.has(facade) || targetRegistrar === undefined ||
    !isCallableWithoutThenV1(isIngressOpen) ||
    !isCallableWithoutThenV1(capturedFacade.register) ||
    !isCallableWithoutThenV1(capturedFacade.route) ||
    !isCallableWithoutThenV1(capturedFacade.clearTransientInput)
  ) return invalid();

  const predecessor = managedInputRouterFacadeRecordsInternalV1.get(facade);
  if (predecessor !== undefined) {
    if (
      "active" in predecessor && predecessor.active && predecessor.target === target &&
      predecessor.isIngressOpen === isIngressOpen
    ) return predecessor.cleanup;
    return invalid();
  }

  let record!: ManagedInputRouterFacadeRecordInternalV1;
  const isCurrent = (): boolean => {
    const currentFacade = record.facade;
    return record.active && currentFacade !== null &&
      managedInputRouterFacadeRecordsInternalV1.get(currentFacade) === record;
  };
  const managedRegistrar: ManagedInputRegistrarV1 = (registration) => {
    if (!isCurrent()) return managedInputRouterFacadeNoopInternalV1;
    const gate = record.isIngressOpen;
    let open: unknown;
    try {
      open = gate === null ? false : Reflect.apply(gate, undefined, []);
    } catch {
      return invalid();
    }
    if (open === false) return managedInputRouterFacadeNoopInternalV1;
    if (open !== true) return invalid();
    if (!isCurrent()) return managedInputRouterFacadeNoopInternalV1;
    const registrar = record.registrar;
    if (registrar === null) return managedInputRouterFacadeNoopInternalV1;
    const unregister = registrar(registration);
    if (isCurrent()) return unregister;
    try {
      unregister();
    } catch {
      // A stale physical registration is already logically fenced. Cleanup is best effort.
    }
    return managedInputRouterFacadeNoopInternalV1;
  };
  const cleanup = Object.freeze((): void => {
    if (!isCurrent()) return;
    const currentFacade = record.facade!;
    record.active = false;
    record.facade = null;
    record.target = null;
    record.isIngressOpen = null;
    record.registrar = null;
    managedInputRegistrarsV1.delete(currentFacade);
    managedInputRouterFacadeRecordsInternalV1.set(
      currentFacade,
      managedInputRouterFacadeTerminalInternalV1,
    );
  });
  record = {
    active: true,
    facade,
    target,
    isIngressOpen: isIngressOpen as () => boolean,
    registrar: targetRegistrar,
    cleanup,
  };
  managedInputRouterFacadeRecordsInternalV1.set(facade, record);
  managedInputRegistrarsV1.set(facade, managedRegistrar);
  return cleanup;
}

export function createInputRouterV1(): InputRouterV1 {
  const registrations = new Map<InputContextIdV1, InputHandlerRegistrationV1[]>();
  const managedRegistrations = new Map<InputContextIdV1, InputHandlerRegistrationV1[]>();
  for (const context of inputContextPrecedenceV1) {
    registrations.set(context, []);
    managedRegistrations.set(context, []);
  }

  const registerIntoV1 = (
    target: Map<InputContextIdV1, InputHandlerRegistrationV1[]>,
    registration: ManagedInputHandlerRegistrationV1,
  ): () => void => {
    if (
      !isRecordV1(registration) ||
      !isInputContextIdV1(registration.context) ||
      typeof registration.handle !== "function"
    ) {
      throw new TypeError("ui.invalid_input_registration");
    }

    const contextRegistrations = target.get(registration.context);
    if (contextRegistrations === undefined) {
      throw new TypeError("ui.invalid_input_registration");
    }
    const record = Object.freeze({ handle: registration.handle });
    contextRegistrations.push(record);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const index = contextRegistrations.indexOf(record);
      if (index >= 0) contextRegistrations.splice(index, 1);
    };
  };

  const route = (event: DeepReadonly<InputEventV1>): InputRouteResultV1 => {
    assertInputEventV1(event);
    const snapshot = createRegistrationSnapshotV1(registrations, managedRegistrations);
    for (const registration of snapshot) {
      const result = registration.handle(event);
      assertHandlerResultV1(result);
      if (result.kind === "handled") return handledResultsV1[registration.context];
    }
    return inputIgnoredV1;
  };

  const router: InputRouterV1 = Object.freeze({
    register(registration: {
      readonly context: InputContextIdV1;
      readonly handle: InputHandlerV1;
    }): () => void {
      return registerIntoV1(registrations, registration);
    },
    route,
    clearTransientInput(): void {
      route(focusLossEventV1);
    },
  });
  const managedRegistrar = (registration: ManagedInputHandlerRegistrationV1) =>
    registerIntoV1(managedRegistrations, registration);
  directManagedInputRegistrarsV1.set(router, managedRegistrar);
  managedInputRegistrarsV1.set(router, managedRegistrar);
  return router;
}
