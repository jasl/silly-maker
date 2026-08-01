// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
  GameSnapshotEnvelopeV1,
  GameplayModuleBindingV1,
  RuntimeSchemaV1,
} from "../contracts/index.ts";
import { CanonicalJsonError } from "../contracts/canonical-json.ts";
import { CanonicalJsonError as RootCanonicalJsonError } from "../index.ts";
import {
  admitCanonicalCommandInternalV1,
  type CanonicalCommandHandoffTargetInternalV1,
  withCanonicalCommandHandoffInternalV1,
} from "../internal/canonical-command-admission.ts";
import { withDeferredSimulationEvidenceAdmissionInternalV1 } from "../internal/finalized-evidence-admission.ts";
import { createSnapshotWorkCounterV1 } from "../internal/snapshot-work-instrumentation.ts";
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
  readonly fact: { readonly kind: "synthetic.changed" };
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
    ownerOperationSchema: passthroughSchema<unknown>(),
    ownerProposalSchema: passthroughSchema<{
      readonly payload: null;
      readonly facts: readonly SyntheticSimulationTypesV1["fact"][];
    }>(),
    localInvariants: [],
    owner: {
      propose: () => ({
        kind: "proposed" as const,
        proposal: { payload: null, facts: [] },
      }),
      apply: (current: unknown) => current,
    },
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
    ownerOperationSchema: null,
    ownerProposalSchema: null,
    owner: null,
    capabilities: Object.freeze({
      resolveParity(value: number): "even" | "odd" {
        return value % 2 === 0 ? "even" : "odd";
      },
    }),
  });
}

function syntheticRejectedAttemptV1(
  snapshot: SyntheticSimulationTypesV1["snapshot"],
) {
  return Object.freeze({
    result: Object.freeze({
      kind: "rejected" as const,
      snapshot,
      reasons: Object.freeze([]),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: snapshot.rng,
      attemptedDraws: Object.freeze([]),
      candidateRngAfter: snapshot.rng,
      committedRngAfter: snapshot.rng,
    }),
  });
}

function simulation(modules: readonly GameplayModuleBindingV1<SyntheticSimulationTypesV1>[]) {
  return defineGameSimulation<SyntheticSimulationTypesV1>()({
    contractRevision: 1,
    modules,
    stateSchema: passthroughSchema<SyntheticStateV1>(),
    commandSchema: passthroughSchema<SyntheticSimulationTypesV1["command"]>(),
    factSchema: passthroughSchema<SyntheticSimulationTypesV1["fact"]>(),
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

  it("gates every direct public Simulation command callback", () => {
    expect(RootCanonicalJsonError).toBe(CanonicalJsonError);
    const seed = defineSyntheticSimulation();
    let executeGameCalls = 0;
    let validateDebugCalls = 0;
    let executeDebugCalls = 0;
    const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
      ...seed,
      commandExecutor: {
        executeAttempt(
          _snapshot: SyntheticSimulationTypesV1["snapshot"],
          _command: SyntheticSimulationTypesV1["command"],
          _context: undefined,
        ) {
          executeGameCalls += 1;
          return Object.freeze({ kind: "not-exercised" as const });
        },
      },
      debugCommandExecutor: {
        validate(
          _snapshot: SyntheticSimulationTypesV1["snapshot"],
          _command: SyntheticSimulationTypesV1["debugCommand"],
          _context: undefined,
        ) {
          validateDebugCalls += 1;
          return Object.freeze({ kind: "allowed" as const });
        },
        executeAttempt(
          _snapshot: SyntheticSimulationTypesV1["snapshot"],
          _command: SyntheticSimulationTypesV1["debugCommand"],
          _context: undefined,
        ) {
          executeDebugCalls += 1;
          return Object.freeze({ kind: "not-exercised" as const });
        },
      },
    });
    const snapshot = syntheticSnapshot();

    const expectFractionalFailure = (callback: () => unknown): void => {
      try {
        callback();
        throw new TypeError("expected CanonicalJsonError");
      } catch (error) {
        expect(error).toBeInstanceOf(CanonicalJsonError);
        expect(error).toMatchObject({
          code: "number.not_integer",
          path: "/amount",
        });
      }
    };

    expectFractionalFailure(() =>
      resolved.commandExecutor.executeAttempt(
        snapshot,
        { kind: "synthetic.increment", amount: 0.25 } as never,
        undefined,
      )
    );
    expectFractionalFailure(() =>
      resolved.debugCommandExecutor.validate(
        snapshot,
        { kind: "debug.synthetic.increment", amount: 0.25 } as never,
        undefined,
      )
    );
    expectFractionalFailure(() =>
      resolved.debugCommandExecutor.executeAttempt(
        snapshot,
        { kind: "debug.synthetic.increment", amount: 0.25 } as never,
        undefined,
      )
    );

    expect(executeGameCalls).toBe(0);
    expect(validateDebugCalls).toBe(0);
    expect(executeDebugCalls).toBe(0);
  });

  it("rejects own command members that canonical bytes cannot represent", () => {
    const seed = defineSyntheticSimulation();
    let executeCalls = 0;
    const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
      ...seed,
      commandExecutor: {
        executeAttempt(
          _snapshot: SyntheticSimulationTypesV1["snapshot"],
          _command: SyntheticSimulationTypesV1["command"],
          _context: undefined,
        ) {
          executeCalls += 1;
          return Object.freeze({ kind: "not-exercised" as const });
        },
      },
    });
    const payload = [Object.freeze({ ordinal: 1 })] as unknown[] & {
      extra?: { ordinal: number };
    };
    payload.extra = { ordinal: 2 };

    let failure: unknown;
    try {
      resolved.commandExecutor.executeAttempt(
        syntheticSnapshot(),
        { kind: "synthetic.increment", payload } as never,
        undefined,
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(RootCanonicalJsonError);
    expect(failure).toMatchObject({
      code: "value.unrepresented_property",
      path: "/payload/extra",
    });
    expect(executeCalls).toBe(0);
    expect(Object.isFrozen(payload)).toBe(false);
    expect(Object.isFrozen(payload.extra as object)).toBe(false);
  });

  it("passes one recursively frozen projection to a direct Simulation callback", () => {
    const seed = defineSyntheticSimulation();
    let receivedSnapshot: SyntheticSimulationTypesV1["snapshot"] | undefined;
    let receivedCommand: SyntheticSimulationTypesV1["command"] | undefined;
    const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
      ...seed,
      commandExecutor: {
        executeAttempt(snapshot, command, _context: undefined) {
          receivedSnapshot = snapshot;
          receivedCommand = command;
          return Object.freeze({ kind: "not-exercised" as const });
        },
      },
    });
    const nested = { ordinal: 1 };
    const command = { kind: "synthetic.increment" as const, metadata: nested };
    const snapshot = syntheticSnapshot();

    resolved.commandExecutor.executeAttempt(snapshot, command, undefined);

    expect(receivedSnapshot).toBe(snapshot);
    expect(receivedCommand).not.toBe(command);
    expect(receivedCommand).toEqual(command);
    const receivedMetadata = (receivedCommand as { readonly metadata?: object } | undefined)
      ?.metadata;
    expect(receivedMetadata).not.toBe(nested);
    expect(Object.isFrozen(receivedCommand)).toBe(true);
    expect(Object.isFrozen(receivedMetadata)).toBe(true);
    expect(Object.isFrozen(command)).toBe(false);
    expect(Object.isFrozen(nested)).toBe(false);
  });

  it("consumes the exact internal handoff target at every Simulation callback", () => {
    const seed = defineSyntheticSimulation();
    let receivedGameCommand: SyntheticSimulationTypesV1["command"] | undefined;
    let receivedDebugValidationCommand: SyntheticSimulationTypesV1["debugCommand"] | undefined;
    let receivedDebugExecutionCommand: SyntheticSimulationTypesV1["debugCommand"] | undefined;
    const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
      ...seed,
      commandExecutor: {
        executeAttempt(_snapshot, command, _context: undefined) {
          receivedGameCommand = command;
          return Object.freeze({ kind: "not-exercised" as const });
        },
      },
      debugCommandExecutor: {
        validate(_snapshot, command, _context: undefined) {
          receivedDebugValidationCommand = command;
          return Object.freeze({ kind: "allowed" as const });
        },
        executeAttempt(_snapshot, command, _context: undefined) {
          receivedDebugExecutionCommand = command;
          return Object.freeze({ kind: "not-exercised" as const });
        },
      },
    });
    const snapshot = syntheticSnapshot();
    const counter = createSnapshotWorkCounterV1();
    const expectNoFallback = <
      TCommand extends
        | SyntheticSimulationTypesV1["command"]
        | SyntheticSimulationTypesV1["debugCommand"],
    >(
      command: TCommand,
      target: CanonicalCommandHandoffTargetInternalV1,
      callback: (admittedCommand: TCommand) => unknown,
    ): TCommand => {
      const admission = admitCanonicalCommandInternalV1(command, counter.instrumentation);
      counter.reset();
      withCanonicalCommandHandoffInternalV1(
        admission,
        target,
        () => callback(admission.value as TCommand),
      );
      expect(counter.snapshot()).toMatchObject({
        canonicalTraversals: 0,
        deepFreezeTraversals: 0,
      });
      return admission.value as TCommand;
    };

    const gameCommand = { kind: "synthetic.increment" as const };
    const admittedGameCommand = expectNoFallback(
      gameCommand,
      "simulation_game_execute",
      (admittedCommand) =>
        resolved.commandExecutor.executeAttempt(snapshot, admittedCommand, undefined),
    );
    expect(receivedGameCommand).toBe(admittedGameCommand);
    const debugCommand = { kind: "debug.synthetic.increment" as const };
    const admittedDebugValidationCommand = expectNoFallback(
      debugCommand,
      "simulation_debug_validate",
      (admittedCommand) =>
        resolved.debugCommandExecutor.validate(snapshot, admittedCommand, undefined),
    );
    expect(receivedDebugValidationCommand).toBe(admittedDebugValidationCommand);
    const admittedDebugExecutionCommand = expectNoFallback(
      debugCommand,
      "simulation_debug_execute",
      (admittedCommand) =>
        resolved.debugCommandExecutor.executeAttempt(snapshot, admittedCommand, undefined),
    );
    expect(receivedDebugExecutionCommand).toBe(admittedDebugExecutionCommand);
  });

  it("normalizes and freezes synchronous game and Debug attempt evidence exactly once", () => {
    const seed = defineSyntheticSimulation();
    const snapshot = syntheticSnapshot();
    const rawFact = { kind: "synthetic.changed" as const, transient: "remove" };
    const rawReason = { code: "synthetic.rejected" as const, transient: "remove" };
    const rawGameAttempt = {
      result: {
        kind: "committed" as const,
        snapshot,
        facts: [rawFact],
      },
      diagnostics: {
        committedRngBefore: snapshot.rng,
        attemptedDraws: [],
        candidateRngAfter: snapshot.rng,
        committedRngAfter: snapshot.rng,
      },
    };
    const rawDebugAttempt = {
      result: {
        kind: "rejected" as const,
        snapshot,
        reasons: [rawReason],
      },
      diagnostics: {
        committedRngBefore: snapshot.rng,
        attemptedDraws: [],
        candidateRngAfter: snapshot.rng,
        committedRngAfter: snapshot.rng,
      },
    };
    const normalizedFact = Object.freeze({ kind: "synthetic.changed" as const });
    const normalizedReason = Object.freeze({ code: "synthetic.rejected" as const });
    let factParseCalls = 0;
    let rejectionParseCalls = 0;
    let executeGameCalls = 0;
    let executeDebugCalls = 0;
    const parseFact = (value: unknown): SyntheticSimulationTypesV1["fact"] => {
      factParseCalls += 1;
      expect(value).toBe(rawFact);
      return normalizedFact;
    };
    const parseRejection = (value: unknown): SyntheticSimulationTypesV1["rejection"] => {
      rejectionParseCalls += 1;
      expect(value).toBe(rawReason);
      return normalizedReason;
    };
    const executeGame = (
      _snapshot: SyntheticSimulationTypesV1["snapshot"],
      _command: SyntheticSimulationTypesV1["command"],
      _context: undefined,
    ) => {
      executeGameCalls += 1;
      return rawGameAttempt;
    };
    const executeDebug = (
      _snapshot: SyntheticSimulationTypesV1["snapshot"],
      _command: SyntheticSimulationTypesV1["debugCommand"],
      _context: undefined,
    ) => {
      executeDebugCalls += 1;
      return rawDebugAttempt;
    };
    const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
      ...seed,
      factSchema: Object.freeze({ parse: parseFact }),
      rejectionSchema: Object.freeze({ parse: parseRejection }),
      commandExecutor: { executeAttempt: executeGame },
      debugCommandExecutor: {
        ...seed.debugCommandExecutor,
        executeAttempt: executeDebug,
      },
    });

    const gameAttempt = resolved.commandExecutor.executeAttempt(
      snapshot,
      { kind: "synthetic.increment" },
      undefined,
    );
    const debugAttempt = resolved.debugCommandExecutor.executeAttempt(
      snapshot,
      { kind: "debug.synthetic.increment" },
      undefined,
    );

    expect(executeGameCalls).toBe(1);
    expect(executeDebugCalls).toBe(1);
    expect(factParseCalls).toBe(1);
    expect(rejectionParseCalls).toBe(1);
    expect(gameAttempt).not.toBe(rawGameAttempt);
    expect(debugAttempt).not.toBe(rawDebugAttempt);
    expect(gameAttempt).toMatchObject({
      result: { kind: "committed", snapshot, facts: [normalizedFact] },
    });
    expect(debugAttempt).toMatchObject({
      result: { kind: "rejected", snapshot, reasons: [normalizedReason] },
    });
    expect(Object.isFrozen(gameAttempt)).toBe(true);
    expect(Object.isFrozen(gameAttempt.result)).toBe(true);
    expect(Object.isFrozen(gameAttempt.diagnostics)).toBe(true);
    expect(Object.isFrozen(debugAttempt)).toBe(true);
    expect(Object.isFrozen(debugAttempt.result)).toBe(true);
    expect(Object.isFrozen(debugAttempt.diagnostics)).toBe(true);
    expect(Object.isFrozen(rawFact)).toBe(false);
    expect(Object.isFrozen(rawReason)).toBe(false);
  });

  it.each(
    [
      {
        label: "an extra outer field",
        createAttempt(snapshot: SyntheticSimulationTypesV1["snapshot"]) {
          return { ...syntheticRejectedAttemptV1(snapshot), leaked: true };
        },
        assertFailure(error: unknown) {
          expect(error).toEqual(new TypeError("Command attempt has invalid fields"));
        },
      },
      {
        label: "fractional fault evidence",
        createAttempt(snapshot: SyntheticSimulationTypesV1["snapshot"]) {
          return {
            result: {
              kind: "faulted" as const,
              snapshot,
              fault: { code: "synthetic.fault" as const, value: 0.5 },
            },
            diagnostics: {
              committedRngBefore: snapshot.rng,
              attemptedDraws: [],
              candidateRngAfter: snapshot.rng,
              committedRngAfter: snapshot.rng,
            },
          };
        },
        assertFailure(error: unknown) {
          expect(error).toBeInstanceOf(CanonicalJsonError);
          expect(error).toMatchObject({
            code: "number.not_integer",
            path: "/result/fault/value",
          });
        },
      },
    ] as const,
  )(
    "rejects synchronous $label after one executor callback",
    ({ createAttempt, assertFailure }) => {
      const seed = defineSyntheticSimulation();
      const snapshot = syntheticSnapshot();
      let executeCalls = 0;
      const executeAttempt = (
        _snapshot: SyntheticSimulationTypesV1["snapshot"],
        _command: SyntheticSimulationTypesV1["command"],
        _context: undefined,
      ) => {
        executeCalls += 1;
        return createAttempt(snapshot);
      };
      const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
        ...seed,
        commandExecutor: { executeAttempt },
      });

      let failure: unknown;
      try {
        resolved.commandExecutor.executeAttempt(
          snapshot,
          { kind: "synthetic.increment" },
          undefined,
        );
      } catch (error) {
        failure = error;
      }

      assertFailure(failure);
      expect(executeCalls).toBe(1);
    },
  );

  it.each(
    [
      ["game", "simulation_game_execute"],
      ["debug", "simulation_debug_execute"],
    ] as const,
  )(
    "lets Standard Core defer synchronous %s evidence until after its RNG gate",
    (surface, target) => {
      const seed = defineSyntheticSimulation();
      const snapshot = syntheticSnapshot();
      const rawFact = { kind: "synthetic.changed" as const, value: 0.5 };
      const candidate = {
        result: {
          kind: "committed" as const,
          snapshot,
          facts: [rawFact],
        },
        diagnostics: {
          committedRngBefore: snapshot.rng,
          attemptedDraws: [],
          candidateRngAfter: snapshot.rng,
          committedRngAfter: snapshot.rng,
        },
      };
      let factParseCalls = 0;
      let executeCalls = 0;
      const parseFact = (_value: unknown): SyntheticSimulationTypesV1["fact"] => {
        factParseCalls += 1;
        throw new TypeError("evidence schema ran before the Core RNG gate");
      };
      const executeAttempt = (
        _snapshot: SyntheticSimulationTypesV1["snapshot"],
        _command:
          | SyntheticSimulationTypesV1["command"]
          | SyntheticSimulationTypesV1["debugCommand"],
        _context: undefined,
      ) => {
        executeCalls += 1;
        return candidate;
      };
      const resolved = defineGameSimulation<SyntheticSimulationTypesV1>()({
        ...seed,
        factSchema: Object.freeze({ parse: parseFact }),
        commandExecutor: { executeAttempt },
        debugCommandExecutor: {
          ...seed.debugCommandExecutor,
          executeAttempt,
        },
      });

      const returned = withDeferredSimulationEvidenceAdmissionInternalV1(
        target,
        () =>
          surface === "game"
            ? resolved.commandExecutor.executeAttempt(
              snapshot,
              { kind: "synthetic.increment" },
              undefined,
            )
            : resolved.debugCommandExecutor.executeAttempt(
              snapshot,
              { kind: "debug.synthetic.increment" },
              undefined,
            ),
      );

      expect(returned).toBe(candidate);
      expect(executeCalls).toBe(1);
      expect(factParseCalls).toBe(0);
      expect(Object.isFrozen(candidate)).toBe(false);
      expect(Object.isFrozen(rawFact)).toBe(false);
    },
  );

  it("rejects duplicate slots, missing dependencies, and dependency cycles", () => {
    expect(() => defineSimulationWithDuplicateId()).toThrow("duplicate GameplayModule ID");
    expect(() => defineSimulationWithDuplicateSlot()).toThrow("duplicate State slot");
    expect(() => defineSimulationWithMissingDependency()).toThrow("missing dependency");
    expect(() => defineSimulationWithCycle()).toThrow("dependency cycle");
  });

  it("characterizes locale-controlled dependency-cycle first failure", () => {
    const comparisons: [string, string][] = [];
    const ranks = new Map([
      ["synthetic.right", 0],
      ["synthetic.left", 1],
    ]);
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(
      function (this: string, right: string): number {
        comparisons.push([this, right]);
        return (ranks.get(this) ?? 0) - (ranks.get(right) ?? 0);
      },
    );

    try {
      expect(() => defineSimulationWithCycle()).toThrow(
        "dependency cycle at synthetic.right",
      );
      expect(comparisons).toContainEqual(["synthetic.right", "synthetic.left"]);
    } finally {
      localeCompare.mockRestore();
    }
  });

  it("allows stateless capabilities but no state or owner surface", () => {
    const resolver = stateless("synthetic.resolver");
    expect(resolver.bindingKind).toBe("stateless");
    expect(resolver.capabilities).toHaveProperty("resolveParity");
    expect(resolver).not.toHaveProperty("services");
    expect(resolver).not.toHaveProperty("stateSchema");
  });

  it("validates real multi-slot State paths without parsing each leaf as an owner aggregate", () => {
    let ownerSchemaParseCalls = 0;
    const ownerAggregateSchema: RuntimeSchemaV1<unknown> = Object.freeze({
      parse(value: unknown) {
        ownerSchemaParseCalls += 1;
        if (
          value === null ||
          typeof value !== "object" ||
          !Object.hasOwn(value, "counter") ||
          !Object.hasOwn(value, "marker")
        ) {
          throw new TypeError("invalid owner aggregate");
        }
        return value;
      },
    });
    const resolved = simulation([
      statefulWithSlots(
        "synthetic.aggregate",
        ["simulation.counter", "simulation.marker"],
        [],
        ownerAggregateSchema,
        Object.freeze({
          counter: Object.freeze({ count: 0 }),
          marker: Object.freeze({ enabled: false }),
        }),
      ),
    ]);
    expect(() => resolved.createInitialState(Object.freeze({ rngSeed: parseNonZeroUint32(1) }))).not
      .toThrow();
    expect(ownerSchemaParseCalls).toBe(2);
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
