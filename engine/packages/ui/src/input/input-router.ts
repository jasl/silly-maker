// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";
import {
  inputIgnoredV1,
  type InputContextIdV1,
  type InputEventV1,
  type InputHandlerResultV1,
  type InputRouteResultV1,
  type InputRouterV1,
} from "./contracts.ts";

const inputContextPrecedenceV1 = [
  "debug",
  "system",
  "overlay",
  "whole_canvas",
  "narrative",
  "interaction",
  "gameplay",
] as const satisfies readonly InputContextIdV1[];

const inputContextIdsV1 = new Set<InputContextIdV1>(inputContextPrecedenceV1);

const handledResultsV1 = {
  debug: { kind: "handled" as const, context: "debug" as const },
  system: { kind: "handled" as const, context: "system" as const },
  overlay: { kind: "handled" as const, context: "overlay" as const },
  whole_canvas: {
    kind: "handled" as const,
    context: "whole_canvas" as const,
  },
  narrative: { kind: "handled" as const, context: "narrative" as const },
  interaction: { kind: "handled" as const, context: "interaction" as const },
  gameplay: { kind: "handled" as const, context: "gameplay" as const },
} satisfies Readonly<Record<InputContextIdV1, InputRouteResultV1>>;

const focusLossEventV1 = { kind: "focus_loss" as const };

type InputHandlerV1 = (event: DeepReadonly<InputEventV1>) => InputHandlerResultV1;

interface InputHandlerRegistrationV1 {
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
const managedInputRouterFacadeTerminalInternalV1 = { kind: "terminal" as const };
const managedInputRouterFacadeNoopInternalV1 = (): void => {};

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

function isObjectRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createDispatchPlanV1(
  registrations: ReadonlyMap<InputContextIdV1, readonly InputHandlerRegistrationV1[]>,
  managedRegistrations: ReadonlyMap<InputContextIdV1, readonly InputHandlerRegistrationV1[]>,
): readonly InputHandlerRegistrationV1[] {
  const plan: InputHandlerRegistrationV1[] = [];
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
          plan.push(registration);
        }
      }
    }
  }
  return plan;
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
  const { facade, target, isIngressOpen } = input;
  const targetRegistrar = directManagedInputRegistrarsV1.get(target);
  if (
    facade === target ||
    directManagedInputRegistrarsV1.has(facade) || targetRegistrar === undefined ||
    typeof isIngressOpen !== "function"
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
      open = gate === null ? false : gate();
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
    unregister();
    return managedInputRouterFacadeNoopInternalV1;
  };
  const cleanup = (): void => {
    if (!isCurrent()) return;
    const currentFacade = record.facade;
    if (currentFacade === null) return;
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
  };
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
  // Registration changes replace the plan; an in-flight route retains its starting plan.
  let dispatchPlan = createDispatchPlanV1(registrations, managedRegistrations);
  const rebuildDispatchPlanV1 = (): void => {
    dispatchPlan = createDispatchPlanV1(registrations, managedRegistrations);
  };

  const registerIntoV1 = (
    target: Map<InputContextIdV1, InputHandlerRegistrationV1[]>,
    registration: ManagedInputHandlerRegistrationV1,
  ): () => void => {
    if (
      !isObjectRecordV1(registration) ||
      !isInputContextIdV1(registration.context) ||
      typeof registration.handle !== "function"
    ) {
      throw new TypeError("ui.invalid_input_registration");
    }

    const contextRegistrations = target.get(registration.context);
    if (contextRegistrations === undefined) {
      throw new TypeError("ui.invalid_input_registration");
    }
    const record: InputHandlerRegistrationV1 = {
      context: registration.context,
      handle: registration.handle,
    };
    contextRegistrations.push(record);
    rebuildDispatchPlanV1();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const index = contextRegistrations.indexOf(record);
      if (index < 0) return;
      contextRegistrations.splice(index, 1);
      rebuildDispatchPlanV1();
    };
  };

  const route = (event: DeepReadonly<InputEventV1>): InputRouteResultV1 => {
    const snapshot = dispatchPlan;
    for (const registration of snapshot) {
      const result = registration.handle(event);
      if (result.kind === "handled") return handledResultsV1[registration.context];
    }
    return inputIgnoredV1;
  };

  const router: InputRouterV1 = {
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
  };
  const managedRegistrar = (registration: ManagedInputHandlerRegistrationV1) =>
    registerIntoV1(managedRegistrations, registration);
  directManagedInputRegistrarsV1.set(router, managedRegistrar);
  managedInputRegistrarsV1.set(router, managedRegistrar);
  return router;
}
