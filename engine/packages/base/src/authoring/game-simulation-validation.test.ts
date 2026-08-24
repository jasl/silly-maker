// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  GameplayModuleBindingV1,
  RuntimeSchemaV1,
} from "../contracts/index.ts";
import { createPristineRunIntegrityV1 } from "../contracts/snapshot.ts";
import {
  parseModuleId,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "../contracts/values.ts";
import { defineGameplayModule } from "./define-gameplay-module.ts";
import { defineGameSimulation } from "./define-game-simulation.ts";

interface SyntheticStateV1 {
  readonly simulation: {
    readonly counter: { readonly count: number };
    readonly marker: { readonly enabled: boolean };
  };
}

interface SyntheticRngStateV1 {
  readonly cursor: number;
}

interface SyntheticSimulationTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    SyntheticStateV1,
    SyntheticRngStateV1
  > {
  readonly snapshot: GameSnapshotEnvelopeV1<SyntheticStateV1, SyntheticRngStateV1>;
  readonly rngDrawTrace: never;
  readonly command: { readonly kind: "synthetic.increment" };
  readonly event: { readonly kind: "synthetic.changed" };
  readonly rejection: { readonly code: "synthetic.rejected" };
  readonly fault: { readonly code: "synthetic.fault" };
  readonly debugCommand: { readonly kind: "debug.synthetic.increment" };
  readonly debugValidationError: { readonly code: "debug.synthetic.invalid" };
  readonly executionContext: undefined;
  readonly queries: { readonly count: number; readonly parity: "even" | "odd" };
  readonly viewModel: { readonly countLabel: string };
}

function passthroughSchema<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

function captureThrownV1(callback: () => unknown): unknown {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new TypeError("expected callback to throw");
}

function statefulWithSlots(
  id: string,
  slots: readonly string[],
  dependencies: readonly string[] = [],
  stateSchema: RuntimeSchemaV1<unknown> = passthroughSchema<unknown>(),
  initialState: unknown = Object.freeze({}),
) {
  return defineGameplayModule<SyntheticSimulationTypesV1>()({
    bindingKind: "stateful" as const,
    descriptor: {
      id: parseModuleId(id),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: slots.map(parseStateSlotId),
      dependencies: dependencies.map(parseModuleId),
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    stateSchema,
    localInvariants: [],
    reducers: {},
    queries: null,
    createInitialState: () => initialState,
    createReadPort: (current: unknown) => current,
  });
}

function stateful(id: string, slot: string, dependencies: readonly string[] = []) {
  const initialState = slot === "simulation.marker" ? { enabled: false } : { count: 0 };
  return statefulWithSlots(id, [slot], dependencies, passthroughSchema<unknown>(), initialState);
}

function stateless(id: string, dependencies: readonly string[] = []) {
  return defineGameplayModule<SyntheticSimulationTypesV1>()({
    bindingKind: "stateless" as const,
    descriptor: {
      id: parseModuleId(id),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [],
      dependencies: dependencies.map(parseModuleId),
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    reducers: null,
    capabilities: Object.freeze({
      resolveParity(value: number): "even" | "odd" {
        return value % 2 === 0 ? "even" : "odd";
      },
    }),
  });
}

function simulation(modules: readonly GameplayModuleBindingV1<SyntheticSimulationTypesV1>[]) {
  return defineGameSimulation<SyntheticSimulationTypesV1>()({
    contractRevision: 1,
    modules,
    stateSchema: passthroughSchema<SyntheticStateV1>(),
    commandSchema: passthroughSchema<SyntheticSimulationTypesV1["command"]>(),
    eventSchema: passthroughSchema<SyntheticSimulationTypesV1["event"]>(),
    rejectionSchema: passthroughSchema<SyntheticSimulationTypesV1["rejection"]>(),
    debugCommandSchema: passthroughSchema<SyntheticSimulationTypesV1["debugCommand"]>(),
    debugValidationErrorSchema: passthroughSchema<
      SyntheticSimulationTypesV1["debugValidationError"]
    >(),
    commandExecutor: {
      executeAttempt(
        _snapshot: SyntheticSimulationTypesV1["snapshot"],
        _command: SyntheticSimulationTypesV1["command"],
        _context: undefined,
      ) {
        return Object.freeze({ kind: "not-exercised" as const });
      },
    },
    debugCommandExecutor: {
      validate(
        _snapshot: SyntheticSimulationTypesV1["snapshot"],
        _command: SyntheticSimulationTypesV1["debugCommand"],
        _context: undefined,
      ) {
        return Object.freeze({ kind: "allowed" as const });
      },
      executeAttempt(
        _snapshot: SyntheticSimulationTypesV1["snapshot"],
        _command: SyntheticSimulationTypesV1["debugCommand"],
        _context: undefined,
      ) {
        return Object.freeze({ kind: "not-exercised" as const });
      },
    },
    createBootstrapInput: () => Object.freeze({ rngSeed: parseNonZeroUint32(1) }),
    createInitialState: () =>
      Object.freeze({
        simulation: Object.freeze({
          counter: Object.freeze({ count: 0 }),
          marker: Object.freeze({ enabled: false }),
        }),
      }),
    createQueries: (state) =>
      Object.freeze({
        count: state.simulation.counter.count,
        parity: state.simulation.counter.count % 2 === 0 ? ("even" as const) : ("odd" as const),
      }),
    projectGameView: (queries) => Object.freeze({ countLabel: String(queries.count) }),
  });
}

function defineSyntheticSimulation() {
  return simulation([
    stateful("synthetic.counter", "simulation.counter"),
    stateful("synthetic.marker", "simulation.marker", ["synthetic.counter"]),
    stateless("synthetic.parity", ["synthetic.counter"]),
  ]);
}

function syntheticSnapshot(): SyntheticSimulationTypesV1["snapshot"] {
  return Object.freeze({
    state: Object.freeze({
      simulation: Object.freeze({
        counter: Object.freeze({ count: 0 }),
        marker: Object.freeze({ enabled: false }),
      }),
    }),
    rng: Object.freeze({ cursor: 0 }),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
}

function defineSimulationWithDuplicateSlot() {
  return simulation([
    stateful("synthetic.counter", "simulation.counter"),
    stateful("synthetic.other", "simulation.counter"),
  ]);
}

function defineSimulationWithDuplicateId() {
  return simulation([
    stateful("synthetic.counter", "simulation.counter"),
    stateful("synthetic.counter", "simulation.marker"),
  ]);
}

function defineSimulationWithMissingDependency() {
  return simulation([stateless("synthetic.parity", ["synthetic.missing"])]);
}

function defineSimulationWithCycle() {
  return simulation([
    stateless("synthetic.left", ["synthetic.right"]),
    stateless("synthetic.right", ["synthetic.left"]),
  ]);
}

describe("GameSimulation invariants", () => {
  it("keeps command execution separate from queries", () => {
    const resolved = defineSyntheticSimulation();

    expect(resolved.commandExecutor).toHaveProperty("executeAttempt");
    expect(resolved.commandExecutor).not.toHaveProperty("createQueries");
    expect(resolved.debugCommandExecutor).toHaveProperty("executeAttempt");
    expect(resolved.debugCommandExecutor).toHaveProperty("validate");
    expect(resolved.debugCommandExecutor).not.toHaveProperty("createQueries");
    expect(resolved.createInitialState(Object.freeze({ rngSeed: parseNonZeroUint32(1) }))).toEqual({
      simulation: { counter: { count: 0 }, marker: { enabled: false } },
    });
    const queries = resolved.createQueries(syntheticSnapshot().state);
    expect(queries).toEqual({
      count: 0,
      parity: "even",
    });
    expect(resolved.projectGameView(queries)).toEqual({ countLabel: "0" });
  });

  it("passes one bootstrap identity through root and stateful initializers in tuple order", () => {
    const nestedBootstrap = Object.freeze({
      labels: Object.freeze(["synthetic.bootstrap"]),
    });
    const bootstrap = Object.freeze({
      rngSeed: parseNonZeroUint32(1),
      nested: nestedBootstrap,
    });
    const callOrder: string[] = [];
    const observedBootstraps: unknown[] = [];
    const observeBootstrap = (owner: string, value: unknown): void => {
      callOrder.push(owner);
      observedBootstraps.push(value);
      expect(value).toBe(bootstrap);
    };

    const markerSeed = stateful("synthetic.marker", "simulation.marker");
    const marker = defineGameplayModule<SyntheticSimulationTypesV1>()({
      ...markerSeed,
      createInitialState(value) {
        observeBootstrap("synthetic.marker", value);
        return Object.freeze({ enabled: false });
      },
    });
    const parity = stateless("synthetic.parity", ["synthetic.counter"]);
    const counterSeed = stateful("synthetic.counter", "simulation.counter");
    const counter = defineGameplayModule<SyntheticSimulationTypesV1>()({
      ...counterSeed,
      createInitialState(value) {
        observeBootstrap("synthetic.counter", value);
        return Object.freeze({ count: 0 });
      },
    });
    const modules = Object.freeze([marker, parity, counter] as const);
    const seed = simulation(modules);
    let rootInitialStateCalls = 0;
    const rootInitialState = (value: unknown) => {
      rootInitialStateCalls += 1;
      observeBootstrap("root", value);
      return Object.freeze({
        simulation: Object.freeze({
          counter: Object.freeze({ count: 0 }),
          marker: Object.freeze({ enabled: false }),
        }),
      });
    };
    const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
      ...seed,
      createInitialState: rootInitialState,
    });

    expect(Object.hasOwn(parity, "createInitialState")).toBe(false);

    expect(resolved.createInitialState(bootstrap)).toEqual({
      simulation: { counter: { count: 0 }, marker: { enabled: false } },
    });

    expect(rootInitialStateCalls).toBe(1);
    expect(observedBootstraps).toEqual([bootstrap, bootstrap, bootstrap]);
    expect(callOrder).toEqual(["root", "synthetic.marker", "synthetic.counter"]);
  });

  it.each(["root", "aggregate_schema"] as const)(
    "keeps %s initial-State failure ahead of every module initializer",
    (failureStage) => {
      const failure = new Error(`synthetic ${failureStage} initial-State failure`);
      let rootCalls = 0;
      let moduleCalls = 0;
      const counterSeed = stateful("synthetic.counter", "simulation.counter");
      const counter = defineGameplayModule<SyntheticSimulationTypesV1>()({
        ...counterSeed,
        createInitialState() {
          moduleCalls += 1;
          return Object.freeze({ count: 0 });
        },
      });
      const seed = simulation(Object.freeze([counter]));
      const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
        ...seed,
        stateSchema: failureStage === "aggregate_schema"
          ? Object.freeze({
            parse(): never {
              throw failure;
            },
          })
          : seed.stateSchema,
        createInitialState() {
          rootCalls += 1;
          if (failureStage === "root") throw failure;
          return Object.freeze({
            simulation: Object.freeze({
              counter: Object.freeze({ count: 0 }),
              marker: Object.freeze({ enabled: false }),
            }),
          });
        },
      });

      expect(captureThrownV1(() =>
        resolved.createInitialState(
          Object.freeze({ rngSeed: parseNonZeroUint32(1) }),
        )
      )).toBe(failure);
      expect(rootCalls).toBe(1);
      expect(moduleCalls).toBe(0);
    },
  );

  it("stops at the first failing stateful module initializer", () => {
    const failure = new Error("synthetic first module initial-State failure");
    const callOrder: string[] = [];
    const markerSeed = stateful("synthetic.marker", "simulation.marker");
    const marker = defineGameplayModule<SyntheticSimulationTypesV1>()({
      ...markerSeed,
      createInitialState(): never {
        callOrder.push("synthetic.marker");
        throw failure;
      },
    });
    const counterSeed = stateful("synthetic.counter", "simulation.counter");
    const counter = defineGameplayModule<SyntheticSimulationTypesV1>()({
      ...counterSeed,
      createInitialState() {
        callOrder.push("synthetic.counter");
        return Object.freeze({ count: 0 });
      },
    });
    const seed = simulation(Object.freeze([marker, counter]));
    const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
      ...seed,
      createInitialState() {
        callOrder.push("root");
        return Object.freeze({
          simulation: Object.freeze({
            counter: Object.freeze({ count: 0 }),
            marker: Object.freeze({ enabled: false }),
          }),
        });
      },
    });

    expect(captureThrownV1(() =>
      resolved.createInitialState(
        Object.freeze({ rngSeed: parseNonZeroUint32(1) }),
      )
    )).toBe(failure);
    expect(callOrder).toEqual(["root", "synthetic.marker"]);
  });

  it("rejects duplicate slots, missing dependencies, and dependency cycles", () => {
    expect(() => defineSimulationWithDuplicateId()).toThrow("duplicate GameplayModule ID");
    expect(() => defineSimulationWithDuplicateSlot()).toThrow("duplicate State slot");
    expect(() => defineSimulationWithMissingDependency()).toThrow("missing dependency");
    expect(() => defineSimulationWithCycle()).toThrow("dependency cycle");
  });

  it("uses fixed code-unit traversal for dependency-cycle diagnostics", () => {
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
      throw new TypeError("stable diagnostics consulted the Host locale");
    });

    try {
      expect(() => defineSimulationWithCycle()).toThrow(
        "dependency cycle at synthetic.left",
      );
      expect(localeCompare).not.toHaveBeenCalled();
    } finally {
      localeCompare.mockRestore();
    }
  });

  it("allows stateless capabilities but no state or reducer surface", () => {
    const resolver = stateless("synthetic.resolver");
    expect(resolver.bindingKind).toBe("stateless");
    expect(resolver.capabilities).toHaveProperty("resolveParity");
    expect(resolver).not.toHaveProperty("services");
    expect(resolver).not.toHaveProperty("stateSchema");
  });

  it("validates real multi-slot State paths without parsing each leaf as a module aggregate", () => {
    let moduleSchemaParseCalls = 0;
    const moduleAggregateSchema: RuntimeSchemaV1<unknown> = Object.freeze({
      parse(value: unknown) {
        moduleSchemaParseCalls += 1;
        if (
          value === null ||
          typeof value !== "object" ||
          !Object.hasOwn(value, "counter") ||
          !Object.hasOwn(value, "marker")
        ) {
          throw new TypeError("invalid module aggregate");
        }
        return value;
      },
    });
    const resolved = simulation([
      statefulWithSlots(
        "synthetic.aggregate",
        ["simulation.counter", "simulation.marker"],
        [],
        moduleAggregateSchema,
        Object.freeze({
          counter: Object.freeze({ count: 0 }),
          marker: Object.freeze({ enabled: false }),
        }),
      ),
    ]);
    expect(() => resolved.createInitialState(Object.freeze({ rngSeed: parseNonZeroUint32(1) }))).not
      .toThrow();
    expect(moduleSchemaParseCalls).toBe(2);
  });

  it("deep-freezes both the authoring input and the validated simulation", () => {
    const seed = defineSyntheticSimulation();
    const modules = [...seed.modules];
    const commandExecutor = { ...seed.commandExecutor };
    const input = { ...seed, modules, commandExecutor };
    const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()(input);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(modules)).toBe(true);
    expect(Object.isFrozen(commandExecutor)).toBe(true);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.commandExecutor)).toBe(true);
  });
});
