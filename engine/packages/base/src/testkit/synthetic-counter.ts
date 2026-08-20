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

export const syntheticCounterStateSchemaV1: RuntimeSchemaV1<SyntheticCounterStateV1> = Object
  .freeze({
    parse(value: unknown): SyntheticCounterStateV1 {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype ||
        Object.keys(value).join("\0") !== "count" ||
        typeof (value as { readonly count?: unknown }).count !== "number"
      ) {
        throw new TypeError("invalid synthetic counter State");
      }
      return Object.freeze({
        count: parseNonNegativeSafeInteger((value as { readonly count: number }).count),
      });
    },
  });

const syntheticGameStateSchemaV1: RuntimeSchemaV1<SyntheticGameStateV1> = Object.freeze({
  parse(value: unknown): SyntheticGameStateV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).join("\0") !== "simulation"
    ) {
      throw new TypeError("invalid synthetic aggregate State");
    }
    const simulation = (value as { readonly simulation?: unknown }).simulation;
    if (
      simulation === null ||
      typeof simulation !== "object" ||
      Array.isArray(simulation) ||
      Object.getPrototypeOf(simulation) !== Object.prototype ||
      Object.keys(simulation).join("\0") !== "counter"
    ) {
      throw new TypeError("invalid synthetic simulation State");
    }
    return Object.freeze({
      simulation: Object.freeze({
        counter: syntheticCounterStateSchemaV1.parse(
          (simulation as { readonly counter?: unknown }).counter,
        ),
      }),
    });
  },
});

const commandSchema: RuntimeSchemaV1<SyntheticCounterCommandV1> = Object.freeze({
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
    return Object.freeze({ kind });
  },
});

function passthroughSchema<T>(): RuntimeSchemaV1<T> {
  return Object.freeze({ parse: (value: unknown) => value as T });
}

const debugCommandSchema: RuntimeSchemaV1<never> = Object.freeze({
  parse(): never {
    throw new TypeError("synthetic debug commands are unsupported");
  },
});

const syntheticEventSchemaV1: RuntimeSchemaV1<SyntheticCounterEventV1> = Object.freeze({
  parse(value: unknown): SyntheticCounterEventV1 {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      (value as { readonly kind?: unknown }).kind !== "synthetic.incremented"
    ) {
      throw new TypeError("invalid synthetic domain event");
    }
    return Object.freeze({
      kind: "synthetic.incremented" as const,
      count: parseNonNegativeSafeInteger((value as { readonly count?: unknown }).count),
    });
  },
});

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
      "synthetic.incremented": (_state, event) => Object.freeze({ count: event.count }),
    },
    queries: null,
    createInitialState: () => Object.freeze({ count: 0 }),
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
    capabilities: Object.freeze({
      resolveParity(value: number): "even" | "odd" {
        return value % 2 === 0 ? "even" : "odd";
      },
    }),
  });
  return Object.freeze([counter, parity] as const);
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
  const commandExecutor: SyntheticCommandExecutorV1 = Object.freeze({
    executeAttempt(snapshot, command) {
      const rng = createTransactionalRngV1(snapshot.rng);
      if (command.kind === "synthetic.reject") {
        return rejectAttemptV1(snapshot, rng, [Object.freeze({ code: "synthetic.reject" })]);
      }
      if (command.kind === "synthetic.fault") {
        return faultAttemptV1(snapshot, rng, Object.freeze({ code: "synthetic.fault" }));
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
      const next = Object.freeze({
        state: Object.freeze({ simulation: Object.freeze({ counter: nextCounter }) }),
        rng: rng.candidateState(),
        commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
        integrity: snapshot.integrity,
      });
      return commitAttemptV1(snapshot, next, rng, [event]);
    },
  });
  const debugCommandExecutor: SyntheticDebugCommandExecutorV1 = Object.freeze({
    validate() {
      return Object.freeze({
        kind: "validation_failed" as const,
        errors: Object.freeze([
          Object.freeze({ code: "synthetic.debug_command_unsupported" as const }),
        ]),
      });
    },
    executeAttempt() {
      throw new TypeError("synthetic debug commands are unsupported");
    },
  });
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
      return Object.freeze({ rngSeed: entropy.nextNonZeroUint32() });
    },
    createInitialState() {
      return Object.freeze({
        simulation: Object.freeze({ counter: Object.freeze({ count: 0 }) }),
      });
    },
    createQueries(state) {
      return Object.freeze({
        count: state.simulation.counter.count,
        parity: parity.capabilities.resolveParity(state.simulation.counter.count),
      });
    },
    projectGameView(queries) {
      return Object.freeze({ count: queries.count, parity: queries.parity });
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

const syntheticAssetSlotsV1 = Object.freeze([
  Object.freeze({
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
  }),
  Object.freeze({
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
  }),
]) satisfies readonly AssetSlotDefinitionV1[];

const syntheticStateContractManifestV1 = Object.freeze({
  contractRevision: 1 as const,
  aggregateStateSchema: Object.freeze({
    schemaId: "schema.synthetic.game-state",
    revision: parsePositiveSafeInteger(1),
  }),
  moduleStateSchemas: Object.freeze([
    Object.freeze({
      moduleId: parseModuleId("synthetic.counter"),
      moduleContractRevision: parsePositiveSafeInteger(1),
      stateSlots: Object.freeze([parseStateSlotId("simulation.counter")]),
      stateSchema: Object.freeze({
        schemaId: "schema.synthetic.counter-state",
        revision: parsePositiveSafeInteger(1),
      }),
    }),
  ]),
  persistentIrSchemas: Object.freeze([]),
  stableReferenceSets: Object.freeze([]),
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
  const definition: SyntheticDefinitionV1 = Object.freeze({
    simulation: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractManifest: syntheticStateContractManifestV1,
      data: Object.freeze({}),
      rules: Object.freeze({}),
      narrativeProgram: null,
      patchSurface: emptySimulationPatchSurfaceV1,
      materializeProgram: () => Object.freeze({ kind: "synthetic-counter" }),
      createGameSimulation: () => createGameSimulation(),
    }),
    presentation: Object.freeze({
      textCatalogs: syntheticTextCatalogsV1,
      assetSlots: syntheticAssetSlotsV1,
      assetPacks: Object.freeze([]) as readonly [],
      patchSurface: emptyPresentationPatchSurfaceV1,
      materializePresentation: () =>
        Object.freeze({ kind: "synthetic-presentation", textCatalogs: syntheticTextCatalogsV1 }),
    }),
  });
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
