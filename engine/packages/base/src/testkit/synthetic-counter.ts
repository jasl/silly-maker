// SPDX-License-Identifier: MIT
import { defineGamePackage } from "../authoring/define-game-package.ts";
import { defineGameSimulation } from "../authoring/define-game-simulation.ts";
import { defineGameplayModule } from "../authoring/define-gameplay-module.ts";
import {
  definePresentationPatchSurface,
  defineSimulationPatchSurface,
} from "../authoring/patch-surface.ts";
import type { AssetSlotDefinitionV1 } from "../contracts/assets.ts";
import { commitAttemptV1, faultAttemptV1, rejectAttemptV1 } from "../contracts/execution.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../contracts/execution.ts";
import type {
  GamePackageV1,
  StateContractManifestV1,
  StoryDefinitionV1,
} from "../contracts/game-package.ts";
import type {
  BootstrapEntropyV1,
  GameSimulationTypeMapV1,
  GameSimulationV1,
} from "../contracts/gameplay-module.ts";
import { createTransactionalRngV1, rngStateV1Schema } from "../contracts/rng.ts";
import type { RngDrawTraceV1, RngStateV1 } from "../contracts/rng.ts";
import type { GameSnapshotEnvelopeV1 } from "../contracts/snapshot.ts";
import { parseTextCatalogSetV1 } from "../contracts/presentation.ts";
import type { RuntimeSchemaV1 } from "../contracts/values.ts";
import {
  parseModuleId,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseStateSlotId,
} from "../contracts/values.ts";

export interface SyntheticCounterStateV1 {
  readonly count: number;
}

interface SyntheticGameStateV1 {
  readonly simulation: {
    readonly counter: SyntheticCounterStateV1;
  };
}

export type SyntheticCounterCommandV1 =
  | { readonly kind: "synthetic.increment" }
  | { readonly kind: "synthetic.reject" }
  | { readonly kind: "synthetic.fault" };

interface SyntheticCounterEventV1 {
  readonly kind: "synthetic.incremented";
  readonly count: number;
}

interface SyntheticCounterRejectionV1 {
  readonly code: "synthetic.reject";
}

interface SyntheticCounterFaultV1 {
  readonly code: "synthetic.fault";
}

interface SyntheticDebugValidationErrorV1 {
  readonly code: "synthetic.debug_command_unsupported";
}

export interface SyntheticSimulationTypesV1 extends
  GameSimulationTypeMapV1<
    { readonly rngSeed: ReturnType<BootstrapEntropyV1["nextNonZeroUint32"]> },
    SyntheticGameStateV1,
    RngStateV1
  > {
  readonly snapshot: GameSnapshotEnvelopeV1<SyntheticGameStateV1, RngStateV1>;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: SyntheticCounterCommandV1;
  readonly event: SyntheticCounterEventV1;
  readonly rejection: SyntheticCounterRejectionV1;
  readonly fault: SyntheticCounterFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: SyntheticDebugValidationErrorV1;
  readonly executionContext: undefined;
  readonly queries: { readonly count: number; readonly parity: "even" | "odd" };
  readonly viewModel: { readonly count: number; readonly parity: "even" | "odd" };
}

type SyntheticSnapshotV1 = SyntheticSimulationTypesV1["snapshot"];
type SyntheticAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  SyntheticSnapshotV1,
  SyntheticCounterEventV1,
  SyntheticCounterRejectionV1,
  SyntheticCounterFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

export const syntheticCounterStateSchemaV1: RuntimeSchemaV1<SyntheticCounterStateV1> = {
  parse(value: unknown): SyntheticCounterStateV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join("\0") !== "count" ||
      typeof (value as { readonly count?: unknown }).count !== "number"
    ) {
      throw new TypeError("invalid synthetic counter State");
    }
    return ({
      count: parseNonNegativeSafeInteger((value as { readonly count: number }).count),
    });
  },
};

const syntheticGameStateSchemaV1: RuntimeSchemaV1<SyntheticGameStateV1> = {
  parse(value: unknown): SyntheticGameStateV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join("\0") !== "simulation"
    ) {
      throw new TypeError("invalid synthetic aggregate State");
    }
    const simulation = (value as { readonly simulation?: unknown }).simulation;
    if (
      simulation === null ||
      typeof simulation !== "object" ||
      Array.isArray(simulation) ||
      Object.keys(simulation).join("\0") !== "counter"
    ) {
      throw new TypeError("invalid synthetic simulation State");
    }
    return ({
      simulation: {
        counter: syntheticCounterStateSchemaV1.parse(
          (simulation as { readonly counter?: unknown }).counter,
        ),
      },
    });
  },
};

const commandSchema: RuntimeSchemaV1<SyntheticCounterCommandV1> = {
  parse(value: unknown): SyntheticCounterCommandV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).join("\0") !== "kind"
    ) {
      throw new TypeError("invalid synthetic command");
    }
    const kind = (value as { readonly kind?: unknown }).kind;
    if (
      kind !== "synthetic.increment" &&
      kind !== "synthetic.reject" &&
      kind !== "synthetic.fault"
    ) {
      throw new TypeError("invalid synthetic command kind");
    }
    return ({ kind });
  },
};

function passthroughSchema<T>(): RuntimeSchemaV1<T> {
  return ({ parse: (value: unknown) => value as T });
}

const debugCommandSchema: RuntimeSchemaV1<never> = {
  parse(): never {
    throw new TypeError("synthetic debug commands are unsupported");
  },
};

const syntheticEventSchemaV1: RuntimeSchemaV1<SyntheticCounterEventV1> = {
  parse(value: unknown): SyntheticCounterEventV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      (value as { readonly kind?: unknown }).kind !== "synthetic.incremented"
    ) {
      throw new TypeError("invalid synthetic domain event");
    }
    return ({
      kind: "synthetic.incremented" as const,
      count: parseNonNegativeSafeInteger((value as { readonly count?: unknown }).count),
    });
  },
};

function createModules() {
  const counter = defineGameplayModule<SyntheticSimulationTypesV1>()({
    bindingKind: "stateful" as const,
    descriptor: {
      id: parseModuleId("synthetic.counter"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.counter")],
      dependencies: [],
    },
    commandSchema,
    querySchema: null,
    queryResultSchema: null,
    stateSchema: syntheticCounterStateSchemaV1,
    localInvariants: [],
    reducers: {
      "synthetic.incremented": (_state, event) => ({ count: event.count }),
    },
    queries: null,
    createInitialState: () => ({ count: 0 }),
    createReadPort: (state) => state,
  });
  const parity = defineGameplayModule<SyntheticSimulationTypesV1>()({
    bindingKind: "stateless" as const,
    descriptor: {
      id: parseModuleId("synthetic.parity"),
      contractRevision: parsePositiveSafeInteger(1),
      stateSlots: [],
      dependencies: [parseModuleId("synthetic.counter")],
    },
    commandSchema: null,
    querySchema: null,
    queryResultSchema: null,
    reducers: null,
    capabilities: {
      resolveParity(value: number): "even" | "odd" {
        return value % 2 === 0 ? "even" : "odd";
      },
    },
  });
  return ([counter, parity] as const);
}

type SyntheticModulesV1 = ReturnType<typeof createModules>;
type SyntheticCommandExecutorV1 = {
  executeAttempt(
    snapshot: SyntheticSnapshotV1,
    command: SyntheticCounterCommandV1,
    context: undefined,
  ): SyntheticAttemptV1;
};
type SyntheticDebugCommandExecutorV1 = {
  validate(
    snapshot: SyntheticSnapshotV1,
    command: never,
    context: undefined,
  ): {
    readonly kind: "validation_failed";
    readonly errors: readonly SyntheticDebugValidationErrorV1[];
  };
  executeAttempt(snapshot: SyntheticSnapshotV1, command: never, context: undefined): never;
};

type SyntheticGameSimulationV1 = GameSimulationV1<
  SyntheticSimulationTypesV1,
  SyntheticModulesV1,
  SyntheticCommandExecutorV1,
  SyntheticDebugCommandExecutorV1
>;

function createGameSimulation(): SyntheticGameSimulationV1 {
  const modules = createModules();
  const counter = modules[0];
  const parity = modules[1];
  const commandExecutor: SyntheticCommandExecutorV1 = {
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      if (command.kind === "synthetic.reject") {
        return rejectAttemptV1(snapshot, rng, [{ code: "synthetic.reject" }]);
      }
      if (command.kind === "synthetic.fault") {
        return faultAttemptV1(snapshot, rng, { code: "synthetic.fault" });
      }
      const event = syntheticEventSchemaV1.parse({
        kind: "synthetic.incremented",
        count: snapshot.state.simulation.counter.count + 1,
      });
      const reduce = counter.reducers["synthetic.incremented"];
      if (reduce === undefined) throw new TypeError("counter reducer missing");
      const nextCounter = syntheticCounterStateSchemaV1.parse(
        reduce(snapshot.state.simulation.counter, event),
      );
      const next = {
        state: { simulation: { counter: nextCounter } },
        rng: rng.candidateState(),
        commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
        integrity: snapshot.integrity,
      };
      return commitAttemptV1(snapshot, next, rng, [event]);
    },
  };
  const debugCommandExecutor: SyntheticDebugCommandExecutorV1 = {
    validate() {
      return ({
        kind: "validation_failed" as const,
        errors: [
          { code: "synthetic.debug_command_unsupported" as const },
        ],
      });
    },
    executeAttempt() {
      throw new TypeError("synthetic debug commands are unsupported");
    },
  };
  return defineGameSimulation<SyntheticSimulationTypesV1>()({
    contractRevision: 1,
    modules,
    stateSchema: syntheticGameStateSchemaV1,
    commandSchema,
    eventSchema: syntheticEventSchemaV1,
    rejectionSchema: passthroughSchema<SyntheticCounterRejectionV1>(),
    debugCommandSchema,
    debugValidationErrorSchema: passthroughSchema<SyntheticDebugValidationErrorV1>(),
    commandExecutor,
    debugCommandExecutor,
    createBootstrapInput(entropy: BootstrapEntropyV1) {
      return ({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return ({
        simulation: { counter: { count: 0 } },
      });
    },
    createQueries(state) {
      return ({
        count: state.simulation.counter.count,
        parity: parity.capabilities.resolveParity(state.simulation.counter.count),
      });
    },
    projectGameView(queries) {
      return ({ count: queries.count, parity: queries.parity });
    },
  });
}

const emptySimulationPatchSurfaceV1 = defineSimulationPatchSurface({});
const emptyPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

interface SyntheticSimulationProgramV1 {
  readonly kind: "synthetic-counter";
}

const syntheticTextCatalogsV1 = parseTextCatalogSetV1({
  defaultLocale: "zh-CN",
  catalogs: [
    {
      locale: "zh-CN",
      fallbackLocale: null,
      entries: [
        { textId: "text.synthetic.stage.name", text: "合成测试舞台" },
        { textId: "text.synthetic.character.name", text: "合成测试角色" },
      ],
    },
  ],
});

const syntheticAssetSlotsV1 = [
  {
    assetId: "asset.synthetic.stage.background",
    kind: "background" as const,
    usage: "scene_background" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "fallback.synthetic.stage.background",
    width: parsePositiveSafeInteger(1),
    height: parsePositiveSafeInteger(1),
    loadGroup: "bootstrap" as const,
    safeArea: null,
    pivot: null,
  },
  {
    assetId: "asset.synthetic.character.fallback",
    kind: "character" as const,
    usage: "character_pose" as const,
    overridePolicy: "replaceable" as const,
    fallbackToken: "fallback.synthetic.character",
    width: parsePositiveSafeInteger(1),
    height: parsePositiveSafeInteger(1),
    loadGroup: "scene" as const,
    safeArea: null,
    pivot: null,
  },
] satisfies readonly AssetSlotDefinitionV1[];

const syntheticStateContractManifestV1 = ({
  contractRevision: 1 as const,
  aggregateStateSchema: {
    schemaId: "schema.synthetic.game-state",
    revision: parsePositiveSafeInteger(1),
  },
  moduleStateSchemas: [
    {
      moduleId: parseModuleId("synthetic.counter"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: [parseStateSlotId("simulation.counter")],
      stateSchema: {
        schemaId: "schema.synthetic.counter-state",
        revision: parsePositiveSafeInteger(1),
      },
    },
  ],
  persistentIrSchemas: [],
  stableReferenceSets: [],
}) satisfies StateContractManifestV1;

type SyntheticDefinitionV1 = StoryDefinitionV1<
  {
    readonly stateContractRevision: ReturnType<typeof parsePositiveSafeInteger>;
    readonly stateContractManifest: typeof syntheticStateContractManifestV1;
    readonly data: Readonly<Record<never, never>>;
    readonly rules: Readonly<Record<never, never>>;
    readonly narrativeProgram: null;
    readonly patchSurface: typeof emptySimulationPatchSurfaceV1;
    materializeProgram(values: Readonly<Record<never, never>>): SyntheticSimulationProgramV1;
    createGameSimulation(program: SyntheticSimulationProgramV1): SyntheticGameSimulationV1;
  },
  {
    readonly textCatalogs: typeof syntheticTextCatalogsV1;
    readonly assetSlots: typeof syntheticAssetSlotsV1;
    readonly assetPacks: readonly [];
    readonly patchSurface: typeof emptyPresentationPatchSurfaceV1;
    materializePresentation(values: Readonly<Record<never, never>>): {
      readonly kind: "synthetic-presentation";
      readonly textCatalogs: typeof syntheticTextCatalogsV1;
    };
  }
>;

export function createSyntheticCounterGamePackageV1(): GamePackageV1<
  SyntheticDefinitionV1["simulation"],
  SyntheticDefinitionV1["presentation"]
> {
  const definition: SyntheticDefinitionV1 = {
    simulation: {
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractManifest: syntheticStateContractManifestV1,
      data: {},
      rules: {},
      narrativeProgram: null,
      patchSurface: emptySimulationPatchSurfaceV1,
      materializeProgram: () => ({ kind: "synthetic-counter" }),
      createGameSimulation: () => createGameSimulation(),
    },
    presentation: {
      textCatalogs: syntheticTextCatalogsV1,
      assetSlots: syntheticAssetSlotsV1,
      assetPacks: [] as readonly [],
      patchSurface: emptyPresentationPatchSurfaceV1,
      materializePresentation: () => ({
        kind: "synthetic-presentation",
        textCatalogs: syntheticTextCatalogsV1,
      }),
    },
  };
  return defineGamePackage({
    contractRevision: 1,
    identity: {
      id: "story.synthetic-counter",
      revision: parsePositiveSafeInteger(1),
    },
    define: () => definition,
  });
}

export { rngStateV1Schema };
