// SPDX-License-Identifier: MIT
import {
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  faultAttemptV1,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  type DeepReadonly,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import { describe, expect, test } from "vitest";

import {
  createStateAuthoringKitV1,
  createStateRuntimeV1,
  getStateModuleContractRevisionV1,
} from "./index.ts";
import type {
  StateCommandAttemptV1,
  StateRuntimeDefinitionV1,
  StateWorkflowTypeMapV1,
} from "./index.ts";

interface CalendarStateV1 {
  readonly day: number;
}

interface InventoryStateV1 {
  readonly portions: number;
}

interface ActorStateV1 {
  readonly stamina: number;
}

interface EveningStateV1 {
  readonly completed: number;
}

interface EveningPilotStateV1 {
  readonly simulation: {
    readonly calendar: CalendarStateV1;
    readonly inventory: InventoryStateV1;
    readonly actor: ActorStateV1;
    readonly evening: EveningStateV1;
  };
}

type EveningPilotEventV1 =
  | { readonly kind: "calendar.advanced"; readonly day: number }
  | { readonly kind: "inventory.consumed"; readonly portions: number }
  | { readonly kind: "actor.energy_spent"; readonly stamina: number }
  | {
    readonly kind: "evening.recorded";
    readonly day: number;
    readonly portions: number;
    readonly stamina: number;
  };

type EveningPilotRejectionV1 =
  | { readonly code: "inventory.insufficient" }
  | { readonly code: "actor.exhausted" };

interface EveningPilotFaultV1 {
  readonly code: "evening.workflow_failed";
}

interface EveningPilotTypesV1 extends StateWorkflowTypeMapV1<EveningPilotStateV1> {
  readonly command: { readonly kind: "evening.run" };
  readonly event: EveningPilotEventV1;
  readonly rejection: EveningPilotRejectionV1;
  readonly fault: EveningPilotFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: never;
  readonly executionContext: undefined;
}

function countSchemaV1<TKey extends string>(
  key: TKey,
): RuntimeSchemaV1<Readonly<Record<TKey, number>>> {
  return Object.freeze({
    parse(value: unknown): Readonly<Record<TKey, number>> {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.keys(value).join("\0") !== key
      ) {
        throw new TypeError(`invalid ${key} state`);
      }
      const count = parseNonNegativeSafeInteger((value as Record<string, unknown>)[key]);
      return Object.freeze({ [key]: count }) as unknown as Readonly<Record<TKey, number>>;
    },
  });
}

const calendarStateSchemaV1 = countSchemaV1("day") as RuntimeSchemaV1<CalendarStateV1>;
const inventoryStateSchemaV1 = countSchemaV1("portions") as RuntimeSchemaV1<InventoryStateV1>;
const actorStateSchemaV1 = countSchemaV1("stamina") as RuntimeSchemaV1<ActorStateV1>;
const eveningStateSchemaV1 = countSchemaV1("completed") as RuntimeSchemaV1<EveningStateV1>;

function kindSchemaV1<TKind extends string>(
  kind: TKind,
): RuntimeSchemaV1<{ readonly kind: TKind }> {
  return Object.freeze({
    parse(value: unknown) {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.keys(value).join("\0") !== "kind" ||
        Reflect.get(value, "kind") !== kind
      ) {
        throw new TypeError(`invalid ${kind} operation`);
      }
      return Object.freeze({ kind });
    },
  });
}

const eveningPilotEventSchemaV1: RuntimeSchemaV1<EveningPilotEventV1> = Object.freeze({
  parse(value: unknown): EveningPilotEventV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid evening pilot event");
    }
    const event = value as Readonly<Record<string, unknown>>;
    switch (event.kind) {
      case "calendar.advanced":
        return Object.freeze({
          kind: event.kind,
          day: parseNonNegativeSafeInteger(event.day),
        });
      case "inventory.consumed":
        return Object.freeze({
          kind: event.kind,
          portions: parseNonNegativeSafeInteger(event.portions),
        });
      case "actor.energy_spent":
        return Object.freeze({
          kind: event.kind,
          stamina: parseNonNegativeSafeInteger(event.stamina),
        });
      case "evening.recorded":
        return Object.freeze({
          kind: event.kind,
          day: parseNonNegativeSafeInteger(event.day),
          portions: parseNonNegativeSafeInteger(event.portions),
          stamina: parseNonNegativeSafeInteger(event.stamina),
        });
      default:
        throw new TypeError("invalid evening pilot event kind");
    }
  },
});

function createEveningPilotV1(forceCandidateFailure = false) {
  const kit = createStateAuthoringKitV1<EveningPilotTypesV1>();
  const calendarRead = kit.defineCapability<{ day(): number }>("pilot.calendar.read");
  const inventoryRead = kit.defineCapability<{ portions(): number }>("pilot.inventory.read");
  const actorRead = kit.defineCapability<{ stamina(): number }>("pilot.actor.read");

  const calendar = kit.defineModule({
    id: "pilot.calendar",
    contractRevision: 1,
    state: {
      slot: "simulation.calendar",
      schema: calendarStateSchemaV1,
      initial: () => Object.freeze({ day: 1 }),
    },
    provides: (provide) => [
      provide(calendarRead, ({ readOwnState }) => ({ day: () => readOwnState().day })),
    ],
    reducers: {
      "calendar.advanced"(_state, event) {
        return Object.freeze({ day: event.day });
      },
    },
  });

  const inventory = kit.defineModule({
    id: "pilot.inventory",
    contractRevision: 1,
    state: {
      slot: "simulation.inventory",
      schema: inventoryStateSchemaV1,
      initial: () => Object.freeze({ portions: 2 }),
    },
    provides: (provide) => [
      provide(inventoryRead, ({ readOwnState }) => ({
        portions: () => readOwnState().portions,
      })),
    ],
    reducers: {
      "inventory.consumed"(_state, event) {
        return Object.freeze({ portions: event.portions });
      },
    },
  });

  const actor = kit.defineModule({
    id: "pilot.actor",
    contractRevision: 1,
    state: {
      slot: "simulation.actor",
      schema: actorStateSchemaV1,
      initial: () => Object.freeze({ stamina: 2 }),
    },
    provides: (provide) => [
      provide(actorRead, ({ readOwnState }) => ({ stamina: () => readOwnState().stamina })),
    ],
    reducers: {
      "actor.energy_spent"(_state, event) {
        return Object.freeze({ stamina: event.stamina });
      },
    },
  });

  const evening = kit.defineModule({
    id: "pilot.evening",
    contractRevision: 1,
    state: {
      slot: "simulation.evening",
      schema: eveningStateSchemaV1,
      initial: () => Object.freeze({ completed: 0 }),
    },
    requires: { calendar: calendarRead, inventory: inventoryRead, actor: actorRead },
    initializesAfter: ["pilot.calendar", "pilot.inventory", "pilot.actor"],
    reducers: {
      "evening.recorded"(state) {
        return Object.freeze({ completed: state.completed + 1 });
      },
    },
  });

  const composition = kit.composeModules([calendar, inventory, actor, evening]);
  const useEveningSupply = composition.createWorkflow({
    eventSchema: eveningPilotEventSchemaV1,
    createFault: () => Object.freeze({ code: "evening.workflow_failed" as const }),
    ...(forceCandidateFailure
      ? { validateCandidate: () => ["synthetic evening invariant failure"] }
      : {}),
    run(transaction) {
      const day = transaction.read(calendarRead).day();
      const portions = transaction.read(inventoryRead).portions();
      const stamina = transaction.read(actorRead).stamina();
      if (portions < 1) {
        return transaction.reject(Object.freeze({ code: "inventory.insufficient" as const }));
      }
      if (stamina < 1) {
        return transaction.reject(Object.freeze({ code: "actor.exhausted" as const }));
      }
      transaction.emit(Object.freeze({ kind: "calendar.advanced", day: day + 1 }));
      transaction.emit(Object.freeze({ kind: "inventory.consumed", portions: portions - 1 }));
      transaction.emit(Object.freeze({ kind: "actor.energy_spent", stamina: stamina - 1 }));
      transaction.emit(Object.freeze({
        kind: "evening.recorded",
        day,
        portions,
        stamina,
      }));
      return transaction.complete();
    },
  });
  return { composition, useEveningSupply };
}

function initialSnapshotV1(portions: number) {
  return {
    state: {
      simulation: {
        calendar: { day: 1 },
        inventory: { portions },
        actor: { stamina: 2 },
        evening: { completed: 0 },
      },
    },
    rng: createTransactionalRngV1(parseNonZeroUint32(73)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  };
}

function createPilotRuntimeV1(portions: number, forceCandidateFailure = false) {
  const { composition, useEveningSupply } = createEveningPilotV1(forceCandidateFailure);
  const definition: StateRuntimeDefinitionV1<EveningPilotTypesV1> = {
    initialSnapshot: initialSnapshotV1(portions),
    commandSchema: kindSchemaV1("evening.run"),
    executionContext: undefined,
    executeAttempt(snapshot) {
      return useEveningSupply.execute(snapshot, createTransactionalRngV1(snapshot.rng));
    },
    normalizeUnexpectedDispatchFault(
      _error: unknown,
      snapshot: DeepReadonly<EveningPilotTypesV1["snapshot"]>,
    ): StateCommandAttemptV1<EveningPilotTypesV1> {
      return faultAttemptV1(
        snapshot,
        createTransactionalRngV1(snapshot.rng),
        Object.freeze({ code: "evening.workflow_failed" as const }),
      );
    },
  };
  return { composition, runtime: createStateRuntimeV1(definition) };
}

describe("neutral State module workflow pilot", () => {
  test("carries the admitted module revision after its definition alias changes", () => {
    const kit = createStateAuthoringKitV1<EveningPilotTypesV1>();
    const definition = {
      id: "pilot.revision",
      contractRevision: 3,
      state: {
        slot: "simulation.calendar",
        schema: calendarStateSchemaV1,
        initial: () => Object.freeze({ day: 1 }),
      },
      reducers: {
        "calendar.advanced"(_state: CalendarStateV1, event: DeepReadonly<EveningPilotEventV1>) {
          if (event.kind !== "calendar.advanced") {
            throw new TypeError("unexpected calendar event");
          }
          return Object.freeze({ day: event.day });
        },
      },
    };

    const module = kit.defineModule(definition);
    Reflect.set(definition, "contractRevision", 99);
    expect(module.contractRevision).toBe(3);
    expect(getStateModuleContractRevisionV1(module)).toBe(3);
    expect(kit.composeModules([module]).modules[0]?.descriptor.contractRevision).toBe(3);
  });

  test("commits calendar, inventory, actor, and evening in one Session attempt", async () => {
    const { composition, runtime } = createPilotRuntimeV1(2);
    expect(composition.modules.map((module) => module.descriptor.id)).toEqual([
      "pilot.calendar",
      "pilot.inventory",
      "pilot.actor",
      "pilot.evening",
    ]);
    expect(composition.modules[3]?.descriptor).toMatchObject({
      contractRevision: 1,
      stateSlots: ["simulation.evening"],
      dependencies: ["pilot.actor", "pilot.calendar", "pilot.inventory"],
    });
    const before = runtime.session.getCurrentSnapshot();
    const result = await runtime.session.dispatch({ kind: "evening.run" });

    expect(result.kind).toBe("executed");
    if (result.kind !== "executed" || result.execution.kind !== "committed") {
      throw new Error("expected committed evening workflow");
    }
    expect(result.execution.snapshot).not.toBe(before);
    expect(runtime.session.getCurrentSnapshot()).toBe(result.execution.snapshot);
    expect(result.execution.snapshot.state.simulation).toEqual({
      calendar: { day: 2 },
      inventory: { portions: 1 },
      actor: { stamina: 1 },
      evening: { completed: 1 },
    });
    expect(result.execution.snapshot.commandSequence).toBe(1);
    expect(result.execution.events).toEqual([
      { kind: "calendar.advanced", day: 2 },
      { kind: "inventory.consumed", portions: 1 },
      { kind: "actor.energy_spent", stamina: 1 },
      { kind: "evening.recorded", day: 1, portions: 2, stamina: 2 },
    ]);
  });

  test("rejects before emission and preserves every module", async () => {
    const { runtime } = createPilotRuntimeV1(0);
    const before = runtime.session.getCurrentSnapshot();
    const result = await runtime.session.dispatch({ kind: "evening.run" });

    expect(result.kind).toBe("executed");
    if (result.kind !== "executed" || result.execution.kind !== "rejected") {
      throw new Error("expected rejected evening workflow");
    }
    expect(result.execution.snapshot).toBe(before);
    expect(runtime.session.getCurrentSnapshot()).toBe(before);
    expect(result.execution.reasons).toEqual([{ code: "inventory.insufficient" }]);
    expect(before.state.simulation).toEqual({
      calendar: { day: 1 },
      inventory: { portions: 0 },
      actor: { stamina: 2 },
      evening: { completed: 0 },
    });
    expect(before.commandSequence).toBe(0);
    expect(runtime.session.getStatus()).toBe("ready");
  });

  test("keeps the exact Snapshot when candidate validation faults", async () => {
    const { runtime } = createPilotRuntimeV1(2, true);
    const before = runtime.session.getCurrentSnapshot();
    const result = await runtime.session.dispatch({ kind: "evening.run" });

    expect(result.kind).toBe("executed");
    if (result.kind !== "executed" || result.execution.kind !== "faulted") {
      throw new Error("expected faulted evening workflow");
    }
    expect(result.execution).toEqual({
      kind: "faulted",
      snapshot: before,
      fault: { code: "evening.workflow_failed" },
    });
    expect(runtime.session.getCurrentSnapshot()).toBe(before);
    expect(before.state.simulation).toEqual({
      calendar: { day: 1 },
      inventory: { portions: 2 },
      actor: { stamina: 2 },
      evening: { completed: 0 },
    });
    expect(runtime.session.getStatus()).toBe("fault_paused");
  });
});
