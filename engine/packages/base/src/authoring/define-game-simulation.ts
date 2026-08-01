// SPDX-License-Identifier: MIT
import type {
  GameCommandExecutorV1,
  GameDebugCommandExecutorV1,
  GameSimulationTypeMapV1,
  GameSimulationV1,
  GameplayModuleTupleForSimulationV1,
} from "../contracts/gameplay-module.ts";
import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { parseModuleId, parsePositiveSafeInteger, parseStateSlotId } from "../contracts/values.ts";
import {
  admitCanonicalCommandForTargetInternalV1,
  withCanonicalCommandHandoffInternalV1,
} from "../internal/canonical-command-admission.ts";
import {
  admitCommandAttemptEvidenceInternalV1,
  admitDebugValidationResultInternalV1,
  consumeSimulationEvidenceDeferralInternalV1,
  isCommandAttemptEnvelopeCandidateInternalV1,
} from "../internal/finalized-evidence-admission.ts";
import { deepFreezeAuthoringValueV1, moduleDefinitionErrorV1 } from "./define-gameplay-module.ts";

interface DefineGameSimulationV1<TTypes extends GameSimulationTypeMapV1> {
  <
    const TModules extends readonly unknown[],
    TExecutor extends GameCommandExecutorV1<
      TTypes["snapshot"],
      TTypes["command"],
      TTypes["executionContext"],
      unknown
    >,
    TDebugExecutor extends GameDebugCommandExecutorV1<
      TTypes["snapshot"],
      TTypes["debugCommand"],
      TTypes["executionContext"],
      TTypes["debugValidationError"],
      unknown
    >,
  >(
    simulation: GameSimulationV1<TTypes, TModules, TExecutor, TDebugExecutor> & {
      readonly modules: GameplayModuleTupleForSimulationV1<TTypes, TModules>;
    },
  ): GameSimulationV1<TTypes, TModules, TExecutor, TDebugExecutor>;
}

type RuntimeRecord = Record<PropertyKey, unknown>;
const validatedGameSimulationsV1 = new WeakSet<object>();

function requireRecord(value: unknown, label: string): RuntimeRecord {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value as RuntimeRecord;
}

function requireFunction(
  value: unknown,
  label: string,
): asserts value is (...args: unknown[]) => unknown {
  if (typeof value !== "function") throw new TypeError(`invalid ${label}`);
}

function requireSchema(value: unknown, label: string): void {
  requireFunction(requireRecord(value, label).parse, `${label} parse`);
}

function requireNullableSchema(value: unknown, label: string): void {
  if (value !== null) requireSchema(value, label);
}

function validateGameplayModuleV1(module: RuntimeRecord): void {
  const descriptor = requireRecord(module.descriptor, "GameplayModule descriptor");
  const id = parseModuleId(descriptor.id);
  parsePositiveSafeInteger(descriptor.contractRevision);
  if (!Array.isArray(descriptor.stateSlots)) {
    throw new TypeError("invalid GameplayModule stateSlots");
  }
  const slots = descriptor.stateSlots.map(parseStateSlotId);
  if (new Set(slots).size !== slots.length) {
    throw moduleDefinitionErrorV1(
      "authoring.module.duplicate_state_slot",
      "duplicate State slot in GameplayModule",
      id,
    );
  }
  if (!Array.isArray(descriptor.dependencies)) {
    throw new TypeError("invalid GameplayModule dependencies");
  }
  const dependencies = descriptor.dependencies.map(parseModuleId);
  if (new Set(dependencies).size !== dependencies.length) {
    throw moduleDefinitionErrorV1(
      "authoring.module.duplicate_dependency",
      "duplicate GameplayModule dependency",
      id,
    );
  }
  if (dependencies.includes(id)) {
    throw moduleDefinitionErrorV1(
      "authoring.module.self_dependency",
      "GameplayModule may not depend on itself",
      id,
    );
  }
  requireNullableSchema(module.commandSchema, "GameplayModule command Schema");
  requireNullableSchema(module.querySchema, "GameplayModule query Schema");
  requireNullableSchema(module.queryResultSchema, "GameplayModule query result Schema");

  if (module.bindingKind === "stateless") {
    if (
      slots.length !== 0 ||
      module.owner !== null ||
      module.ownerOperationSchema !== null ||
      module.ownerProposalSchema !== null ||
      !Object.hasOwn(module, "capabilities") ||
      Object.hasOwn(module, "services") ||
      Object.hasOwn(module, "stateSchema") ||
      Object.hasOwn(module, "createInitialState") ||
      Object.hasOwn(module, "createReadPort") ||
      Object.hasOwn(module, "localInvariants") ||
      Object.hasOwn(module, "queries")
    ) {
      throw new TypeError("stateless GameplayModule must expose capabilities without State");
    }
    const capabilities = requireRecord(module.capabilities, "GameplayModule capabilities");
    for (const [name, capability] of Object.entries(capabilities)) {
      if (!/^(?:compile|evaluate|project|resolve|validate)[A-Z]/u.test(name)) {
        throw new TypeError(`invalid stateless GameplayModule capability name ${name}`);
      }
      requireFunction(capability, `GameplayModule capability ${name}`);
    }
    return;
  }
  if (module.bindingKind !== "stateful") {
    throw new TypeError("invalid GameplayModule bindingKind");
  }
  const owner = requireRecord(module.owner, "GameplayModule owner");
  if (
    slots.length === 0 ||
    !Array.isArray(module.localInvariants) ||
    typeof owner.propose !== "function" ||
    typeof owner.apply !== "function" ||
    typeof module.createInitialState !== "function" ||
    typeof module.createReadPort !== "function"
  ) {
    throw new TypeError("stateful GameplayModule must declare complete ownership");
  }
  requireSchema(module.stateSchema, "GameplayModule State Schema");
  requireSchema(module.ownerOperationSchema, "GameplayModule owner operation Schema");
  requireSchema(module.ownerProposalSchema, "GameplayModule owner proposal Schema");
  for (const invariant of module.localInvariants) {
    requireFunction(
      requireRecord(invariant, "GameplayModule local invariant").check,
      "GameplayModule local invariant check",
    );
  }
  if (module.queries !== null) {
    requireFunction(
      requireRecord(module.queries, "GameplayModule queries").execute,
      "GameplayModule queries execute",
    );
  }
}

function assertDependencyDag(modules: readonly RuntimeRecord[]): void {
  const moduleIds = new Set(
    modules.map((module) => requireRecord(module.descriptor, "GameplayModule descriptor").id),
  );
  for (const module of modules) {
    const descriptor = requireRecord(module.descriptor, "GameplayModule descriptor");
    const dependencies = descriptor.dependencies;
    if (!Array.isArray(dependencies)) throw new TypeError("invalid GameplayModule dependencies");
    for (const dependency of dependencies) {
      if (!moduleIds.has(dependency)) {
        throw moduleDefinitionErrorV1(
          "authoring.simulation.missing_dependency",
          `missing dependency ${String(dependency)} for ${String(descriptor.id)}`,
          String(descriptor.id),
          Object.freeze({ dependency: String(dependency) }),
        );
      }
    }
  }

  const active = new Set<unknown>();
  const complete = new Set<unknown>();
  const byId = new Map(
    modules.map((module) => [
      requireRecord(module.descriptor, "GameplayModule descriptor").id,
      module,
    ]),
  );
  function visit(id: unknown): void {
    if (active.has(id)) {
      throw moduleDefinitionErrorV1(
        "authoring.simulation.dependency_cycle",
        `dependency cycle at ${String(id)}`,
        String(id),
      );
    }
    if (complete.has(id)) return;
    active.add(id);
    const descriptor = requireRecord(byId.get(id)?.descriptor, "GameplayModule descriptor");
    const dependencies = descriptor.dependencies;
    if (!Array.isArray(dependencies)) throw new TypeError("invalid GameplayModule dependencies");
    for (const dependency of dependencies) visit(dependency);
    active.delete(id);
    complete.add(id);
  }
  for (
    const id of [...byId.keys()].sort((left, right) => String(left).localeCompare(String(right)))
  ) {
    visit(id);
  }
}

function readStateSlot(state: unknown, slot: string): unknown {
  let current = state;
  for (const property of slot.split(".")) {
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, property)) {
      throw new TypeError(`State slot ${slot} is absent from aggregate State`);
    }
    current = Reflect.get(current, property);
  }
  return current;
}

function projectOwnedState(state: unknown, slots: readonly string[]): unknown {
  if (slots.length === 1) return readStateSlot(state, slots[0] as string);
  const paths = slots.map((slot) => slot.split("."));
  let commonLength = 0;
  const shortest = Math.min(...paths.map((path) => path.length));
  while (
    commonLength < shortest &&
    paths.every((path) => path[commonLength] === paths[0]?.[commonLength])
  ) {
    commonLength += 1;
  }
  const projection: Record<string, unknown> = {};
  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index] as string[];
    const relative = path.slice(commonLength);
    if (relative.length === 0) throw new TypeError("overlapping State slots");
    let target = projection;
    for (const property of relative.slice(0, -1)) {
      const existing = target[property];
      if (existing === undefined) {
        const nested: Record<string, unknown> = {};
        target[property] = nested;
        target = nested;
      } else {
        target = requireRecord(existing, "owned State projection");
      }
    }
    const leaf = relative.at(-1) as string;
    if (Object.hasOwn(target, leaf)) throw new TypeError("overlapping State slots");
    target[leaf] = readStateSlot(state, slots[index] as string);
  }
  return projection;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function parseSchema(schemaValue: unknown, value: unknown, label: string): unknown {
  const schema = requireRecord(schemaValue, label);
  requireFunction(schema.parse, `${label} parse`);
  return Reflect.apply(schema.parse, schema, [value]);
}

function validateRuntimeSimulationV1(simulationValue: unknown): unknown {
  if (
    simulationValue !== null &&
    typeof simulationValue === "object" &&
    validatedGameSimulationsV1.has(simulationValue)
  ) {
    return simulationValue;
  }
  const simulation = requireRecord(simulationValue, "GameSimulation");
  deepFreezeAuthoringValueV1(simulationValue);
  if (simulation.contractRevision !== 1) {
    throw new TypeError("GameSimulation contractRevision must be 1");
  }
  if (!Array.isArray(simulation.modules)) throw new TypeError("invalid GameSimulation modules");
  const modules = simulation.modules.map((module) => requireRecord(module, "GameplayModule"));
  for (const module of modules) validateGameplayModuleV1(module);
  const ids = modules.map(
    (module) => requireRecord(module.descriptor, "GameplayModule descriptor").id,
  );
  const duplicateId = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicateId !== undefined) {
    throw moduleDefinitionErrorV1(
      "authoring.simulation.duplicate_module_id",
      "duplicate GameplayModule ID",
      String(duplicateId),
    );
  }
  const slots = modules.flatMap((module) => {
    const value = requireRecord(module.descriptor, "GameplayModule descriptor").stateSlots;
    if (!Array.isArray(value)) throw new TypeError("invalid GameplayModule stateSlots");
    return value;
  });
  const duplicateSlot = slots.find((slot, index) => slots.indexOf(slot) !== index);
  if (duplicateSlot !== undefined) {
    throw moduleDefinitionErrorV1(
      "authoring.simulation.duplicate_state_slot",
      "duplicate State slot",
      String(duplicateSlot),
      Object.freeze({ stateSlot: String(duplicateSlot) }),
      "state_slot",
    );
  }
  for (const module of modules) {
    const descriptor = requireRecord(module.descriptor, "GameplayModule descriptor");
    const moduleSlots = descriptor.stateSlots;
    if (!Array.isArray(moduleSlots)) throw new TypeError("invalid GameplayModule stateSlots");
    if (module.bindingKind === "stateful" && moduleSlots.length === 0) {
      throw new TypeError("stateful GameplayModule has no State slot");
    }
  }
  assertDependencyDag(modules);

  for (
    const [key, label] of [
      ["stateSchema", "State Schema"],
      ["commandSchema", "Command Schema"],
      ["factSchema", "Fact Schema"],
      ["rejectionSchema", "Rejection Schema"],
      ["debugCommandSchema", "DebugCommand Schema"],
      ["debugValidationErrorSchema", "Debug validation error Schema"],
    ] as const
  ) {
    requireSchema(simulation[key], label);
  }
  const commandExecutor = requireRecord(simulation.commandExecutor, "GameCommandExecutor");
  requireFunction(commandExecutor.executeAttempt, "GameCommandExecutor executeAttempt");
  if (Object.hasOwn(commandExecutor, "createQueries")) {
    throw new TypeError("GameCommandExecutor may not own createQueries");
  }
  const debugCommandExecutor = requireRecord(
    simulation.debugCommandExecutor,
    "GameDebugCommandExecutor",
  );
  requireFunction(debugCommandExecutor.validate, "GameDebugCommandExecutor validate");
  requireFunction(debugCommandExecutor.executeAttempt, "GameDebugCommandExecutor executeAttempt");
  if (Object.hasOwn(debugCommandExecutor, "createQueries")) {
    throw new TypeError("GameDebugCommandExecutor may not own createQueries");
  }
  requireFunction(simulation.createBootstrapInput, "GameSimulation createBootstrapInput");
  requireFunction(simulation.createInitialState, "GameSimulation createInitialState");
  requireFunction(simulation.createQueries, "GameSimulation createQueries");
  requireFunction(simulation.projectGameView, "GameSimulation projectGameView");

  const executeCommandAttempt = commandExecutor.executeAttempt as (...args: unknown[]) => unknown;
  const validateDebugCommand = debugCommandExecutor.validate as (...args: unknown[]) => unknown;
  const executeDebugCommandAttempt = debugCommandExecutor.executeAttempt as (
    ...args: unknown[]
  ) => unknown;

  const validated = {
    ...simulation,
    commandExecutor: {
      ...commandExecutor,
      executeAttempt(snapshot: unknown, command: unknown, context: unknown): unknown {
        const admission = admitCanonicalCommandForTargetInternalV1(
          command,
          "simulation_game_execute",
        );
        const deferred = consumeSimulationEvidenceDeferralInternalV1("simulation_game_execute");
        const candidate = withCanonicalCommandHandoffInternalV1(
          admission,
          "simulation_game_execute",
          () =>
            Reflect.apply(executeCommandAttempt, commandExecutor, [
              snapshot,
              admission.value,
              context,
            ]),
        );
        if (deferred) return candidate;
        if (!isCommandAttemptEnvelopeCandidateInternalV1(candidate)) return candidate;
        return admitCommandAttemptEvidenceInternalV1(
          snapshot as never,
          candidate as never,
          {
            parseFact: (value: unknown) => parseSchema(simulation.factSchema, value, "Fact Schema"),
            parseRejection: (value: unknown) =>
              parseSchema(simulation.rejectionSchema, value, "Rejection Schema"),
          },
        );
      },
    },
    debugCommandExecutor: {
      ...debugCommandExecutor,
      validate(snapshot: unknown, command: unknown, context: unknown): unknown {
        const admission = admitCanonicalCommandForTargetInternalV1(
          command,
          "simulation_debug_validate",
        );
        const deferred = consumeSimulationEvidenceDeferralInternalV1("simulation_debug_validate");
        const validation = withCanonicalCommandHandoffInternalV1(
          admission,
          "simulation_debug_validate",
          () =>
            Reflect.apply(validateDebugCommand, debugCommandExecutor, [
              snapshot,
              admission.value,
              context,
            ]),
        );
        if (deferred) return validation;
        return admitDebugValidationResultInternalV1(
          validation,
          (value: unknown) =>
            parseSchema(
              simulation.debugValidationErrorSchema,
              value,
              "Debug validation error Schema",
            ),
        );
      },
      executeAttempt(snapshot: unknown, command: unknown, context: unknown): unknown {
        const admission = admitCanonicalCommandForTargetInternalV1(
          command,
          "simulation_debug_execute",
        );
        const deferred = consumeSimulationEvidenceDeferralInternalV1("simulation_debug_execute");
        const candidate = withCanonicalCommandHandoffInternalV1(
          admission,
          "simulation_debug_execute",
          () =>
            Reflect.apply(executeDebugCommandAttempt, debugCommandExecutor, [
              snapshot,
              admission.value,
              context,
            ]),
        );
        if (deferred) return candidate;
        if (!isCommandAttemptEnvelopeCandidateInternalV1(candidate)) return candidate;
        return admitCommandAttemptEvidenceInternalV1(
          snapshot as never,
          candidate as never,
          {
            parseFact: (value: unknown) => parseSchema(simulation.factSchema, value, "Fact Schema"),
            parseRejection: (value: unknown) =>
              parseSchema(simulation.rejectionSchema, value, "Rejection Schema"),
          },
        );
      },
    },
    createInitialState(bootstrap: unknown): unknown {
      const state = parseSchema(
        simulation.stateSchema,
        Reflect.apply(
          simulation.createInitialState as (...args: unknown[]) => unknown,
          simulation,
          [bootstrap],
        ),
        "State Schema",
      );
      for (const module of modules) {
        if (module.bindingKind !== "stateful") continue;
        const descriptor = requireRecord(module.descriptor, "GameplayModule descriptor");
        const moduleSlots = descriptor.stateSlots;
        if (!Array.isArray(moduleSlots)) throw new TypeError("invalid GameplayModule stateSlots");
        const slotNames = moduleSlots.map(String);
        const moduleInitialState = parseSchema(
          module.stateSchema,
          Reflect.apply(module.createInitialState as (...args: unknown[]) => unknown, module, [
            bootstrap,
          ]),
          "GameplayModule State Schema",
        );
        const aggregateOwnerState = parseSchema(
          module.stateSchema,
          projectOwnedState(state, slotNames),
          "GameplayModule State Schema",
        );
        if (
          !equalBytes(
            canonicalJsonBytes(moduleInitialState),
            canonicalJsonBytes(aggregateOwnerState),
          )
        ) {
          throw new TypeError(
            `GameplayModule ${String(descriptor.id)} initial State diverges from aggregate State`,
          );
        }
      }
      return state;
    },
  };
  const frozen = deepFreezeAuthoringValueV1(validated);
  validatedGameSimulationsV1.add(frozen);
  return frozen;
}

export function defineGameSimulation<
  TTypes extends GameSimulationTypeMapV1,
>(): DefineGameSimulationV1<TTypes> {
  return validateRuntimeSimulationV1 as DefineGameSimulationV1<TTypes>;
}
