// SPDX-License-Identifier: MIT
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createTransactionalRngV1,
  digestBytes,
  digestCanonical,
  faultAttemptV1,
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
  rngStateV1Schema,
  type BuildProvenanceV1,
  type DeepReadonly,
  type Digest,
  type IsoUtcInstant,
  type LeaseHandoffRequestId,
  type RngDrawTraceV1,
  type RngStateV1,
  type RuntimeSchemaV1,
  type SessionLeaseOwnerId,
} from "@sillymaker/base";
import {
  createPersistenceServiceV1,
  replayAuthoritativelyV1,
  type ReplayComparisonV1,
} from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  createStateAuthoringKitV1,
  type StateAnyModuleV1,
  type StateCapabilityV1,
  type StateFinalizedCommandAttemptV1,
  type StateModuleCompositionV1,
  type StateRuntimeDefinitionV1,
  type StateWorkflowTypeMapV1,
} from "@sillymaker/state";
import {
  createLegacyStateRuntimeAdapterV1,
  type LegacyStateRuntimeAdapterV1,
} from "@sillymaker/state/legacy";

import {
  createCompositionKernelV1,
  createCompositionServiceTokenV1,
  type CompositionKernelV1,
} from "../src/index.ts";
import {
  compileLegacyApplicationFactoryV1,
  defineLegacyApplicationPluginV1,
  type LegacyApplicationFactoryV1,
  type LegacyApplicationLeaseV1,
} from "../src/legacy.ts";
import { compileStateModuleCompositionV1, defineStateCompositionProfileV1 } from "../src/state.ts";

export const neutralStateModuleCountV1 = 16;
export const neutralStateTranscriptCommandCountV1 = 256;
export const neutralStateRetainedCommandCountV1 = 200;
export const neutralStateSteadyPrefillCommandCountV1 = 256;
export const neutralStateSteadyMeasuredCommandCountV1 = 64;
export const neutralStateMemoryCheckpointsV1 = Object.freeze([0, 200, 400, 800, 1_200]);
export const neutralStateSaveClassesV1 = Object.freeze(["10kib", "100kib", "1mib"] as const);
export const neutralStateTouchedModuleCountsV1 = Object.freeze([1, 4, 16] as const);

export type NeutralStateSaveClassV1 = (typeof neutralStateSaveClassesV1)[number];
export type NeutralStateTouchedModuleCountV1 = (typeof neutralStateTouchedModuleCountsV1)[number];

export interface NeutralStateCellV1 {
  readonly saveClass: NeutralStateSaveClassV1;
  readonly targetSaveBytes: number;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
}

const targetSaveBytesByClassV1 = Object.freeze(
  {
    "10kib": 10 * 1024,
    "100kib": 100 * 1024,
    "1mib": 1024 * 1024,
  } satisfies Record<NeutralStateSaveClassV1, number>,
);

export const neutralStateMatrixCellsV1: readonly NeutralStateCellV1[] = Object.freeze(
  neutralStateSaveClassesV1.flatMap((saveClass) =>
    neutralStateTouchedModuleCountsV1.map((touchedModules) =>
      Object.freeze({
        saveClass,
        targetSaveBytes: targetSaveBytesByClassV1[saveClass],
        touchedModules,
      })
    )
  ),
);

export const neutralStateGcCellsV1: readonly NeutralStateCellV1[] = Object.freeze([
  neutralStateMatrixCellsV1[0]!,
  neutralStateMatrixCellsV1[2]!,
  neutralStateMatrixCellsV1[4]!,
  neutralStateMatrixCellsV1[6]!,
  neutralStateMatrixCellsV1[8]!,
]);

interface NeutralModuleSliceV1 {
  readonly counter: number;
  readonly payload: string;
}

interface NeutralBenchmarkStateV1 {
  readonly simulation: Readonly<Record<string, NeutralModuleSliceV1>>;
}

interface NeutralBenchmarkCommandV1 {
  readonly kind: "neutral.advance";
}

interface NeutralBenchmarkEventV1 {
  readonly kind: `neutral.module_advanced:${string}`;
  readonly counter: number;
}

interface NeutralModuleReadPortV1 {
  counter(): number;
}

interface NeutralBenchmarkRejectionV1 {
  readonly code: "neutral.rejected";
}

interface NeutralBenchmarkFaultV1 {
  readonly code: "neutral.failed";
}

interface NeutralBenchmarkTypesV1 extends StateWorkflowTypeMapV1<NeutralBenchmarkStateV1> {
  readonly command: NeutralBenchmarkCommandV1;
  readonly event: NeutralBenchmarkEventV1;
  readonly rejection: NeutralBenchmarkRejectionV1;
  readonly fault: NeutralBenchmarkFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: never;
  readonly executionContext: undefined;
  readonly rngState: RngStateV1;
  readonly rngDrawTrace: RngDrawTraceV1;
}

type NeutralSnapshotV1 = NeutralBenchmarkTypesV1["snapshot"];
type NeutralStateCompositionV1 = StateModuleCompositionV1<
  NeutralBenchmarkTypesV1,
  readonly StateAnyModuleV1[]
>;
type NeutralAdapterV1 = LegacyStateRuntimeAdapterV1<NeutralBenchmarkTypesV1>;

interface NeutralApplicationV1 {
  readonly adapter: NeutralAdapterV1;
}

interface ActivatedNeutralHarnessV1 {
  readonly adapter: NeutralAdapterV1;
  readonly kernel: CompositionKernelV1;
  readonly lease: LegacyApplicationLeaseV1<NeutralApplicationV1>;
  readonly readTokens: readonly StateCapabilityV1<NeutralModuleReadPortV1>[];
  readonly stateComposition: NeutralStateCompositionV1;
  dispose(): Promise<void>;
}

const textEncoderV1 = new TextEncoder();
const moduleKeysV1 = Object.freeze(
  Array.from(
    { length: neutralStateModuleCountV1 },
    (_, index) => `module${String(index).padStart(2, "0")}`,
  ),
);
const moduleIdsV1 = Object.freeze(moduleKeysV1.map((key) => `bench.state.${key}`));
const moduleEventKindsV1 = Object.freeze(
  moduleIdsV1.map((moduleId) => `neutral.module_advanced:${moduleId}` as const),
);
const neutralCommandV1 = Object.freeze({ kind: "neutral.advance" as const });
const fixedInstantV1 = "2026-08-18T00:00:00.000Z" as IsoUtcInstant;
let persistenceIdentityV1 = 0;

function isPlainRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

const neutralSliceSchemaV1: RuntimeSchemaV1<NeutralModuleSliceV1> = Object.freeze({
  parse(value: unknown): NeutralModuleSliceV1 {
    if (
      !isPlainRecordV1(value) || Object.keys(value).sort().join("\0") !== "counter\0payload" ||
      typeof value.payload !== "string"
    ) {
      throw new TypeError("invalid neutral module slice");
    }
    parseNonNegativeSafeInteger(value.counter);
    return value as unknown as NeutralModuleSliceV1;
  },
});

const neutralStateSchemaV1: RuntimeSchemaV1<NeutralBenchmarkStateV1> = Object.freeze({
  parse(value: unknown): NeutralBenchmarkStateV1 {
    if (!isPlainRecordV1(value) || Object.keys(value).join("\0") !== "simulation") {
      throw new TypeError("invalid neutral benchmark State");
    }
    const simulation = value.simulation;
    if (
      !isPlainRecordV1(simulation) ||
      Object.keys(simulation).sort().join("\0") !== [...moduleKeysV1].sort().join("\0")
    ) {
      throw new TypeError("invalid neutral benchmark module set");
    }
    for (const key of moduleKeysV1) neutralSliceSchemaV1.parse(simulation[key]);
    return value as unknown as NeutralBenchmarkStateV1;
  },
});

const neutralSnapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(
  neutralStateSchemaV1,
  rngStateV1Schema,
) as RuntimeSchemaV1<NeutralSnapshotV1>;

const neutralCommandSchemaV1: RuntimeSchemaV1<NeutralBenchmarkCommandV1> = Object.freeze({
  parse(value: unknown): NeutralBenchmarkCommandV1 {
    if (
      !isPlainRecordV1(value) || Object.keys(value).join("\0") !== "kind" ||
      value.kind !== "neutral.advance"
    ) {
      throw new TypeError("invalid neutral benchmark command");
    }
    return neutralCommandV1;
  },
});

const neutralEventSchemaV1: RuntimeSchemaV1<NeutralBenchmarkEventV1> = Object.freeze({
  parse(value: unknown) {
    if (
      !isPlainRecordV1(value) ||
      Object.keys(value).sort().join("\0") !== "counter\0kind" ||
      typeof value.kind !== "string" ||
      !moduleEventKindsV1.includes(value.kind as `neutral.module_advanced:${string}`) ||
      !Number.isSafeInteger(value.counter)
    ) {
      throw new TypeError("invalid neutral benchmark event");
    }
    return Object.freeze({
      kind: value.kind as `neutral.module_advanced:${string}`,
      counter: parseNonNegativeSafeInteger(value.counter),
    });
  },
});

const identityDigestV1 = (label: string): Digest =>
  digestBytes(textEncoderV1.encode(`neutral-composition-state-workload:${label}`));

const neutralProvenanceV1: BuildProvenanceV1 = Object.freeze({
  story: Object.freeze({
    id: "neutral-composition-state-workload",
    revision: parsePositiveSafeInteger(1),
    digest: identityDigestV1("story"),
  }),
  engine: Object.freeze({
    version: "neutral-composition-state-workload-v1",
    digest: identityDigestV1("engine"),
  }),
  resolved: Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(1),
    stateContractDigest: identityDigestV1("state-contract"),
    simulationDigest: identityDigestV1("simulation"),
    presentationDigest: identityDigestV1("presentation"),
    patchSet: Object.freeze({
      digest: identityDigestV1("patch-set"),
      simulationDigest: identityDigestV1("patch-set-simulation"),
      presentationDigest: identityDigestV1("patch-set-presentation"),
      appliedHotfixes: Object.freeze([]),
    }),
  }),
});

function payloadsV1(totalBytes: number): readonly string[] {
  if (!Number.isSafeInteger(totalBytes) || totalBytes < 0) {
    throw new TypeError("neutral payload byte count must be a non-negative safe integer");
  }
  const base = Math.floor(totalBytes / neutralStateModuleCountV1);
  const remainder = totalBytes % neutralStateModuleCountV1;
  const payloads = Object.freeze(
    moduleKeysV1.map((_key, index) => "x".repeat(base + (index < remainder ? 1 : 0))),
  );
  const maximum = Math.max(...payloads.map((payload) => textEncoderV1.encode(payload).byteLength));
  if (maximum > 262_144) {
    throw new TypeError("neutral payload exceeds the Save single-string UTF-8 limit");
  }
  return payloads;
}

function initialSnapshotV1(input: {
  readonly payloadBytes: number;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly commandSequence?: number;
}): NeutralSnapshotV1 {
  const commandSequence = input.commandSequence ?? 0;
  const payloads = payloadsV1(input.payloadBytes);
  const simulation: Record<string, NeutralModuleSliceV1> = {};
  for (let index = 0; index < neutralStateModuleCountV1; index += 1) {
    simulation[moduleKeysV1[index]!] = Object.freeze({
      counter: index < input.touchedModules ? commandSequence : 0,
      payload: payloads[index]!,
    });
  }
  return {
    state: Object.freeze({ simulation: Object.freeze(simulation) }),
    rng: createTransactionalRngV1(parseNonZeroUint32(181)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(commandSequence),
    integrity: createPristineRunIntegrityV1(),
  };
}

function createModulesV1(
  kit: ReturnType<typeof createStateAuthoringKitV1<NeutralBenchmarkTypesV1>>,
  payloadBytes: number,
) {
  const payloads = payloadsV1(payloadBytes);
  return Object.freeze(moduleKeysV1.map((key, index) => {
    const moduleId = moduleIdsV1[index]!;
    const eventKind = moduleEventKindsV1[index]!;
    const read = kit.defineCapability<NeutralModuleReadPortV1>(`${moduleId}.read`);
    const module = kit.defineModule({
      id: moduleId,
      contractRevision: 1,
      state: {
        slot: `simulation.${key}`,
        schema: neutralSliceSchemaV1,
        initial: () => Object.freeze({ counter: 0, payload: payloads[index]! }),
      },
      provides: (provide) => [
        provide(read, ({ readOwnState }) => ({ counter: () => readOwnState().counter })),
      ],
      reducers: {
        [eventKind](state, event) {
          return Object.freeze({
            counter: event.counter,
            payload: state.payload,
          });
        },
      },
    });
    return Object.freeze({ module, read });
  }));
}

function createAdapterV1(input: {
  readonly stateComposition: NeutralStateCompositionV1;
  readonly readTokens: readonly StateCapabilityV1<NeutralModuleReadPortV1>[];
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly initialSnapshot: NeutralSnapshotV1;
  readonly attempts?: StateFinalizedCommandAttemptV1<NeutralBenchmarkTypesV1>[];
}): NeutralAdapterV1 {
  const workflow = input.stateComposition.createWorkflow({
    stateSchema: neutralStateSchemaV1,
    eventSchema: neutralEventSchemaV1,
    createFault: () => Object.freeze({ code: "neutral.failed" as const }),
    run(transaction) {
      for (let index = 0; index < input.touchedModules; index += 1) {
        const counter = parseNonNegativeSafeInteger(
          transaction.read(input.readTokens[index]!).counter() + 1,
        );
        transaction.emit(Object.freeze({
          kind: moduleEventKindsV1[index]!,
          counter,
        }));
      }
      return transaction.complete();
    },
  });
  const definition: StateRuntimeDefinitionV1<NeutralBenchmarkTypesV1> = {
    initialSnapshot: input.initialSnapshot,
    commandSchema: neutralCommandSchemaV1,
    executionContext: undefined,
    executeAttempt(snapshot) {
      return workflow.execute(snapshot, createTransactionalRngV1(snapshot.rng));
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return faultAttemptV1(
        snapshot,
        createTransactionalRngV1(snapshot.rng),
        Object.freeze({ code: "neutral.failed" as const }),
      );
    },
    ...(input.attempts === undefined
      ? {}
      : { onAttempt: (attempt) => input.attempts!.push(attempt) }),
  };
  return createLegacyStateRuntimeAdapterV1(definition);
}

interface NeutralHarnessBlueprintV1 {
  readonly kit: ReturnType<typeof createStateAuthoringKitV1<NeutralBenchmarkTypesV1>>;
  readonly profile: ReturnType<typeof defineStateCompositionProfileV1>;
  readonly readTokens: readonly StateCapabilityV1<NeutralModuleReadPortV1>[];
  readonly factoryToken: ReturnType<
    typeof createCompositionServiceTokenV1<LegacyApplicationFactoryV1<NeutralApplicationV1>>
  >;
  setStateComposition(composition: NeutralStateCompositionV1): void;
}

function createHarnessBlueprintV1(input: {
  readonly payloadBytes: number;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly commandSequence?: number;
}): NeutralHarnessBlueprintV1 {
  const kit = createStateAuthoringKitV1<NeutralBenchmarkTypesV1>();
  const moduleEntries = createModulesV1(kit, input.payloadBytes);
  const modules = Object.freeze(moduleEntries.map(({ module }) => module));
  const readTokens = Object.freeze(moduleEntries.map(({ read }) => read));
  const factoryToken = createCompositionServiceTokenV1<
    LegacyApplicationFactoryV1<NeutralApplicationV1>
  >("bench.state.session.factory");
  let stateComposition: NeutralStateCompositionV1 | null = null;
  const sessionPlugin = defineLegacyApplicationPluginV1({
    id: "bench.state.session",
    revision: 1,
    factory: factoryToken,
    prepare() {},
    create() {
      if (stateComposition === null) {
        throw new TypeError("neutral State direct plan is not compiled");
      }
      return Object.freeze({
        adapter: createAdapterV1({
          stateComposition,
          readTokens,
          touchedModules: input.touchedModules,
          initialSnapshot: initialSnapshotV1(input),
        }),
      });
    },
    dispose() {},
  });
  const profile = defineStateCompositionProfileV1({
    id: "bench.state.profile",
    modules,
    plugins: [sessionPlugin],
  });
  return Object.freeze({
    kit,
    profile,
    readTokens,
    factoryToken,
    setStateComposition(composition: NeutralStateCompositionV1) {
      if (stateComposition !== null) throw new TypeError("neutral State plan already compiled");
      stateComposition = composition;
    },
  });
}

async function activateHarnessV1(input: {
  readonly payloadBytes: number;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly commandSequence?: number;
}): Promise<ActivatedNeutralHarnessV1> {
  const blueprint = createHarnessBlueprintV1(input);
  const kernel = createCompositionKernelV1();
  const snapshot = await kernel.mount(blueprint.profile);
  const stateComposition = compileStateModuleCompositionV1(snapshot, blueprint.kit);
  blueprint.setStateComposition(stateComposition);
  const factory = compileLegacyApplicationFactoryV1(snapshot, blueprint.factoryToken);
  const lease = await factory.create();
  let disposed = false;
  return Object.freeze({
    adapter: lease.application.adapter,
    kernel,
    lease,
    readTokens: blueprint.readTokens,
    stateComposition,
    async dispose() {
      if (disposed) return;
      disposed = true;
      await kernel.dispose();
      await lease.dispose();
    },
  });
}

async function createPersistenceV1(adapter: NeutralAdapterV1) {
  persistenceIdentityV1 += 1;
  const identity = String(persistenceIdentityV1);
  return await createPersistenceServiceV1({
    runtimeControl: adapter.runtimeControl,
    records: createMemoryHostRecordStoreV1(),
    snapshotSchema: neutralSnapshotSchemaV1,
    provenance: neutralProvenanceV1,
    adoptionDeclarations: Object.freeze([]),
    saveStateMigrations: null,
    ownerId: `owner.neutral-bench.${identity}` as SessionLeaseOwnerId,
    nextHandoffRequestId: () => `handoff.neutral-bench.${identity}` as LeaseHandoffRequestId,
    validateReferences: () => Object.freeze([]),
    validateInvariants: () => Object.freeze([]),
    initialSimulationLineage: Object.freeze([]),
    metadataClock: Object.freeze({ now: () => fixedInstantV1 }),
    exportFilename: "neutral-composition-state-save.json",
    manualSaveSlotCount: 0,
    autoSaveCapture: "external" as const,
  });
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength &&
    left.every((value, index) => value === right[index]);
}

async function dispatchCommittedV1(
  adapter: NeutralAdapterV1,
  commandCount: number,
): Promise<void> {
  for (let index = 0; index < commandCount; index += 1) {
    const result = await adapter.runtime.session.dispatch(neutralCommandV1);
    if (result.kind !== "executed" || result.execution.kind !== "committed") {
      throw new TypeError("neutral benchmark command did not commit");
    }
  }
}

const calibratedPayloadBytesV1 = new Map<string, Promise<number>>();

async function calibratePayloadBytesV1(
  saveClass: NeutralStateSaveClassV1,
  touchedModules: NeutralStateTouchedModuleCountV1,
): Promise<number> {
  const key = `${saveClass}/${String(touchedModules)}`;
  const existing = calibratedPayloadBytesV1.get(key);
  if (existing !== undefined) return await existing;
  const calibration = (async () => {
    const harness = await activateHarnessV1({
      payloadBytes: 0,
      touchedModules,
      commandSequence: neutralStateTranscriptCommandCountV1,
    });
    const persistence = await createPersistenceV1(harness.adapter);
    try {
      const empty = await persistence.port.exportCurrentSave();
      const payloadBytes = targetSaveBytesByClassV1[saveClass] - empty.bytes.byteLength;
      payloadsV1(payloadBytes);
      if (payloadBytes < 0) {
        throw new TypeError(`${saveClass} is smaller than the neutral Save envelope`);
      }
      return payloadBytes;
    } finally {
      await persistence.disposeForRebootstrap();
      await harness.dispose();
    }
  })();
  calibratedPayloadBytesV1.set(key, calibration);
  try {
    return await calibration;
  } catch (error) {
    calibratedPayloadBytesV1.delete(key);
    throw error;
  }
}

async function authoritativeReplayV1(
  harness: ActivatedNeutralHarnessV1,
  touchedModules: NeutralStateTouchedModuleCountV1,
): Promise<ReplayComparisonV1> {
  const commandLog = harness.adapter.composition.commandLog.entries();
  const currentSnapshot = harness.adapter.runtime.session.getCurrentSnapshot();
  const identity = Object.freeze({ provenance: neutralProvenanceV1 });
  return await replayAuthoritativelyV1({
    recordedIdentity: identity,
    runtimeIdentity: identity,
    replayBase: harness.adapter.composition.commandLog.replayBase(),
    replayBaseStateDigest: harness.adapter.composition.commandLog.replayBaseStateDigest(),
    commandLog,
    currentSnapshot,
    currentStateDigest: digestCanonical("sillymaker:state:v1", currentSnapshot),
    projectStableRejection: (rejection: NeutralBenchmarkRejectionV1) => rejection,
    projectStableFault: (fault: NeutralBenchmarkFaultV1) => fault,
    createDriver(replayBase) {
      const attempts: StateFinalizedCommandAttemptV1<NeutralBenchmarkTypesV1>[] = [];
      const adapter = createAdapterV1({
        stateComposition: harness.stateComposition,
        readTokens: harness.readTokens,
        touchedModules,
        initialSnapshot: replayBase as NeutralSnapshotV1,
        attempts,
      });
      return Object.freeze({
        getCurrentSnapshot: () => adapter.runtime.session.getCurrentSnapshot(),
        async submit(logged: {
          readonly source: "game" | "debug";
          readonly command: DeepReadonly<NeutralBenchmarkCommandV1>;
        }) {
          if (logged.source !== "game") {
            throw new TypeError("neutral benchmark has no Debug command");
          }
          const before = attempts.length;
          await adapter.runtime.session.dispatch(logged.command);
          const attempt = attempts[before];
          if (attempt === undefined) throw new TypeError("neutral replay attempt was not observed");
          return attempt;
        },
      });
    },
  });
}

export interface NeutralStateCorrectnessObservationV1 {
  readonly moduleCount: number;
  readonly committedCommands: number;
  readonly retainedCommands: number;
  readonly replayBaseCommandSequence: number;
  readonly firstRetainedOrdinal: number;
  readonly lastRetainedOrdinal: number;
  readonly retainedSequenceContinuity: boolean;
  readonly saveBytes: number;
  readonly maximumPayloadStringBytes: number;
  readonly saveDigestMatch: boolean;
  readonly stateDigestMatch: boolean;
  readonly roundtripBytesMatch: boolean;
  readonly importedCommandSequence: number;
  readonly replay: ReplayComparisonV1;
  readonly durationMs: {
    readonly retentionCrossingTranscript: number;
    readonly saveRoundtrip: number;
    readonly authoritativeReplay: number;
  };
}

export function requireNeutralStateCorrectnessV1(
  observation: NeutralStateCorrectnessObservationV1,
  targetSaveBytes: number,
): void {
  const replay = observation.replay;
  if (
    observation.moduleCount !== neutralStateModuleCountV1 ||
    observation.committedCommands !== neutralStateTranscriptCommandCountV1 ||
    observation.retainedCommands !== neutralStateRetainedCommandCountV1 ||
    observation.replayBaseCommandSequence !==
      neutralStateTranscriptCommandCountV1 - neutralStateRetainedCommandCountV1 ||
    observation.firstRetainedOrdinal !== 57 ||
    observation.lastRetainedOrdinal !== neutralStateTranscriptCommandCountV1 ||
    !observation.retainedSequenceContinuity ||
    observation.saveBytes !== targetSaveBytes ||
    observation.maximumPayloadStringBytes > 262_144 ||
    !observation.saveDigestMatch ||
    !observation.stateDigestMatch ||
    !observation.roundtripBytesMatch ||
    observation.importedCommandSequence !== neutralStateTranscriptCommandCountV1 ||
    !replay.authoritative ||
    !replay.identityMatch ||
    !replay.matches ||
    replay.executedEntries !== neutralStateRetainedCommandCountV1 ||
    replay.mismatches.length !== 0
  ) {
    throw new TypeError("neutral composition/State correctness invariant failed");
  }
}

export async function runNeutralStateCorrectnessV1(input: {
  readonly saveClass: NeutralStateSaveClassV1;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly now?: () => number;
}): Promise<NeutralStateCorrectnessObservationV1> {
  const now = input.now ?? (() => performance.now());
  const payloadBytes = await calibratePayloadBytesV1(input.saveClass, input.touchedModules);
  const sourceBlueprint = createHarnessBlueprintV1({
    payloadBytes,
    touchedModules: input.touchedModules,
  });
  const sourceKernel = createCompositionKernelV1();
  const sourceSnapshot = await sourceKernel.mount(sourceBlueprint.profile);
  const sourceComposition = compileStateModuleCompositionV1(sourceSnapshot, sourceBlueprint.kit);
  sourceBlueprint.setStateComposition(sourceComposition);
  const sourceFactory = compileLegacyApplicationFactoryV1(
    sourceSnapshot,
    sourceBlueprint.factoryToken,
  );
  const sourceLease = await sourceFactory.create();
  let sourceDisposed = false;
  const sourceHarness: ActivatedNeutralHarnessV1 = Object.freeze({
    adapter: sourceLease.application.adapter,
    kernel: sourceKernel,
    lease: sourceLease,
    readTokens: sourceBlueprint.readTokens,
    stateComposition: sourceComposition,
    async dispose() {
      if (sourceDisposed) return;
      sourceDisposed = true;
      await sourceKernel.dispose();
      await sourceLease.dispose();
    },
  });
  const targetHarness = await activateHarnessV1({
    payloadBytes: 0,
    touchedModules: input.touchedModules,
  });
  const sourcePersistence = await createPersistenceV1(sourceHarness.adapter);
  const targetPersistence = await createPersistenceV1(targetHarness.adapter);
  try {
    const transcriptStarted = now();
    await dispatchCommittedV1(sourceHarness.adapter, neutralStateTranscriptCommandCountV1);
    const transcriptDuration = now() - transcriptStarted;
    const sourceCurrent = sourceHarness.adapter.runtime.session.getCurrentSnapshot();
    const stateDigest = digestCanonical("sillymaker:state:v1", sourceCurrent);
    const entries = sourceHarness.adapter.composition.commandLog.entries();
    const replayBase = sourceHarness.adapter.composition.commandLog.replayBase();

    const saveStarted = now();
    const exported = await sourcePersistence.port.exportCurrentSave();
    const imported = await targetPersistence.port.importSave(exported.bytes);
    if (imported.kind !== "imported") {
      throw new TypeError(`neutral Save import failed: ${imported.kind}`);
    }
    const roundtrip = await targetPersistence.port.exportCurrentSave();
    const saveDuration = now() - saveStarted;
    if (exported.bytes.byteLength !== targetSaveBytesByClassV1[input.saveClass]) {
      throw new TypeError(
        `neutral ${input.saveClass} Save calibration produced ${
          String(exported.bytes.byteLength)
        } bytes`,
      );
    }
    if (sourceHarness.adapter.runtime.session.getCurrentSnapshot() !== sourceCurrent) {
      throw new TypeError("neutral Save roundtrip replaced the source Session authority");
    }

    const replayStarted = now();
    const replay = await authoritativeReplayV1(
      sourceHarness,
      input.touchedModules,
    );
    const replayDuration = now() - replayStarted;
    const importedSnapshot = targetHarness.adapter.runtime.session.getCurrentSnapshot();
    const firstEntry = entries[0];
    const lastEntry = entries.at(-1);
    if (firstEntry === undefined || lastEntry === undefined) {
      throw new TypeError("neutral transcript did not retain command entries");
    }
    const maximumPayloadStringBytes = Math.max(
      ...Object.values(sourceCurrent.state.simulation).map(({ payload }) =>
        textEncoderV1.encode(payload).byteLength
      ),
    );
    const retainedSequenceContinuity = entries.every((entry, index) => {
      const expectedOrdinal = index + 57;
      return entry.logOrdinal === expectedOrdinal &&
        entry.commandSequence.before === expectedOrdinal - 1 &&
        entry.commandSequence.after === expectedOrdinal &&
        entry.outcome.kind === "committed";
    });
    const observation: NeutralStateCorrectnessObservationV1 = Object.freeze({
      moduleCount: neutralStateModuleCountV1,
      committedCommands: neutralStateTranscriptCommandCountV1,
      retainedCommands: entries.length,
      replayBaseCommandSequence: replayBase.commandSequence,
      firstRetainedOrdinal: firstEntry.logOrdinal,
      lastRetainedOrdinal: lastEntry.logOrdinal,
      retainedSequenceContinuity,
      saveBytes: exported.bytes.byteLength,
      maximumPayloadStringBytes,
      saveDigestMatch: digestBytes(exported.bytes) === exported.digest &&
        roundtrip.digest === exported.digest,
      stateDigestMatch: stateDigest === lastEntry.postStateDigest &&
        digestCanonical("sillymaker:state:v1", importedSnapshot) === stateDigest,
      roundtripBytesMatch: bytesEqualV1(exported.bytes, roundtrip.bytes),
      importedCommandSequence: importedSnapshot.commandSequence,
      replay,
      durationMs: Object.freeze({
        retentionCrossingTranscript: transcriptDuration,
        saveRoundtrip: saveDuration,
        authoritativeReplay: replayDuration,
      }),
    });
    requireNeutralStateCorrectnessV1(
      observation,
      targetSaveBytesByClassV1[input.saveClass],
    );
    return observation;
  } finally {
    await sourcePersistence.disposeForRebootstrap();
    await targetPersistence.disposeForRebootstrap();
    await sourceHarness.dispose();
    await targetHarness.dispose();
  }
}

export interface NeutralStateColdObservationV1 {
  readonly moduleCount: 16;
  readonly sessionStatus: "ready";
  readonly durationMs: {
    readonly mount: number;
    readonly directPlanCompile: number;
    readonly sessionCreate: number;
    readonly dispose: number;
  };
}

export async function runNeutralStateColdSampleV1(
  now: () => number = () => performance.now(),
): Promise<NeutralStateColdObservationV1> {
  const blueprint = createHarnessBlueprintV1({ payloadBytes: 0, touchedModules: 16 });
  const kernel = createCompositionKernelV1();
  const mountStarted = now();
  const snapshot = await kernel.mount(blueprint.profile);
  const mountDuration = now() - mountStarted;

  const compileStarted = now();
  const stateComposition = compileStateModuleCompositionV1(snapshot, blueprint.kit);
  blueprint.setStateComposition(stateComposition);
  const factory = compileLegacyApplicationFactoryV1(snapshot, blueprint.factoryToken);
  const compileDuration = now() - compileStarted;

  const sessionStarted = now();
  const lease = await factory.create();
  const sessionDuration = now() - sessionStarted;
  const status = lease.application.adapter.runtime.session.getStatus();

  const disposeStarted = now();
  await kernel.dispose();
  await lease.dispose();
  const disposeDuration = now() - disposeStarted;
  if (status !== "ready") throw new TypeError("neutral cold Session was not ready");
  return Object.freeze({
    moduleCount: neutralStateModuleCountV1,
    sessionStatus: status,
    durationMs: Object.freeze({
      mount: mountDuration,
      directPlanCompile: compileDuration,
      sessionCreate: sessionDuration,
      dispose: disposeDuration,
    }),
  });
}

export interface NeutralStateSteadyObservationV1 {
  readonly prefillCommands: 256;
  readonly measuredCommands: 64;
  readonly retainedBeforeMeasurement: 200;
  readonly replayBaseCommandSequenceBeforeMeasurement: number;
  readonly durationMs: number;
  readonly durationMsPerCommand: number;
}

export async function runNeutralStateSteadySampleV1(input: {
  readonly saveClass: NeutralStateSaveClassV1;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly now?: () => number;
}): Promise<NeutralStateSteadyObservationV1> {
  const now = input.now ?? (() => performance.now());
  const payloadBytes = await calibratePayloadBytesV1(input.saveClass, input.touchedModules);
  const harness = await activateHarnessV1({ payloadBytes, touchedModules: input.touchedModules });
  try {
    await dispatchCommittedV1(harness.adapter, neutralStateSteadyPrefillCommandCountV1);
    const entries = harness.adapter.composition.commandLog.entries();
    const replayBase = harness.adapter.composition.commandLog.replayBase();
    if (entries.length !== neutralStateRetainedCommandCountV1) {
      throw new TypeError("neutral steady Session did not enter the retained-log path");
    }
    const startedAt = now();
    await dispatchCommittedV1(harness.adapter, neutralStateSteadyMeasuredCommandCountV1);
    const durationMs = now() - startedAt;
    return Object.freeze({
      prefillCommands: neutralStateSteadyPrefillCommandCountV1,
      measuredCommands: neutralStateSteadyMeasuredCommandCountV1,
      retainedBeforeMeasurement: entries.length,
      replayBaseCommandSequenceBeforeMeasurement: replayBase.commandSequence,
      durationMs,
      durationMsPerCommand: durationMs / neutralStateSteadyMeasuredCommandCountV1,
    });
  } finally {
    await harness.dispose();
  }
}

export interface NeutralStateMemoryUsageV1 {
  readonly rssBytes: number;
  readonly heapTotalBytes: number;
  readonly heapUsedBytes: number;
  readonly externalBytes: number;
}

export interface NeutralStateMemoryCheckpointV1 extends NeutralStateMemoryUsageV1 {
  readonly commandCount: number;
  readonly dispatchDurationMs: number;
}

export async function runNeutralStateMemoryScheduleV1(input: {
  readonly checkpoints: readonly number[];
  dispatchUntil(commandCount: number): Promise<void>;
  collectGarbage(): Promise<void>;
  yieldMacrotask(): Promise<void>;
  readMemoryUsage(): NeutralStateMemoryUsageV1;
  now(): number;
}): Promise<readonly NeutralStateMemoryCheckpointV1[]> {
  let previous = -1;
  const checkpoints: NeutralStateMemoryCheckpointV1[] = [];
  for (const commandCount of input.checkpoints) {
    if (!Number.isSafeInteger(commandCount) || commandCount < 0 || commandCount <= previous) {
      throw new TypeError("neutral memory checkpoints must be increasing non-negative integers");
    }
    previous = commandCount;
    const startedAt = input.now();
    await input.dispatchUntil(commandCount);
    const dispatchDurationMs = input.now() - startedAt;
    await input.collectGarbage();
    await input.yieldMacrotask();
    await input.collectGarbage();
    checkpoints.push(Object.freeze({
      commandCount,
      dispatchDurationMs,
      ...input.readMemoryUsage(),
    }));
  }
  return Object.freeze(checkpoints);
}

export async function runNeutralStateMemoryCellV1(input: {
  readonly cell: NeutralStateCellV1;
  collectGarbage(): Promise<void>;
  yieldMacrotask(): Promise<void>;
  readMemoryUsage(): NeutralStateMemoryUsageV1;
  now?: () => number;
}) {
  if (
    !neutralStateGcCellsV1.some((cell) =>
      cell.saveClass === input.cell.saveClass && cell.touchedModules === input.cell.touchedModules
    )
  ) {
    throw new TypeError("neutral memory benchmark accepts only a declared GC cell");
  }
  const payloadBytes = await calibratePayloadBytesV1(
    input.cell.saveClass,
    input.cell.touchedModules,
  );
  const harness = await activateHarnessV1({
    payloadBytes,
    touchedModules: input.cell.touchedModules,
  });
  let dispatched = 0;
  try {
    const checkpoints = await runNeutralStateMemoryScheduleV1({
      checkpoints: neutralStateMemoryCheckpointsV1,
      collectGarbage: input.collectGarbage,
      yieldMacrotask: input.yieldMacrotask,
      readMemoryUsage: input.readMemoryUsage,
      now: input.now ?? (() => performance.now()),
      async dispatchUntil(commandCount) {
        await dispatchCommittedV1(harness.adapter, commandCount - dispatched);
        dispatched = commandCount;
      },
    });
    return Object.freeze({
      ...input.cell,
      gcPassesPerCheckpoint: 2,
      checkpoints,
    });
  } finally {
    await harness.dispose();
  }
}

export interface NeutralStateBenchmarkEnvironmentV1 {
  readonly deno: string;
  readonly v8: string;
  readonly typescript: string;
  readonly os: string;
  readonly arch: string;
}

export function createNeutralStateMemoryReportV1(input: {
  readonly generatedAt: string;
  readonly environment: NeutralStateBenchmarkEnvironmentV1;
  readonly cell: NeutralStateCellV1;
  readonly checkpoints: readonly NeutralStateMemoryCheckpointV1[];
}) {
  return Object.freeze({
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    environment: Object.freeze({ ...input.environment }),
    cell: Object.freeze({ ...input.cell }),
    protocol: Object.freeze({
      processCells: 1,
      checkpoints: neutralStateMemoryCheckpointsV1,
      gcPassesPerCheckpoint: 2,
      macrotaskBetweenGcPasses: true,
    }),
    checkpoints: Object.freeze([...input.checkpoints]),
    interpretation: Object.freeze({
      status: "trend_only" as const,
      machineBoundHardGate: false,
      timingsArePortableBudgets: false,
    }),
  });
}

export function createNeutralStatePerformanceReportV1(input: {
  readonly generatedAt: string;
  readonly environment: NeutralStateBenchmarkEnvironmentV1;
  readonly warmup: number;
  readonly samples: number;
  readonly cold: readonly unknown[];
  readonly cells: readonly unknown[];
}) {
  return Object.freeze({
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    environment: Object.freeze({ ...input.environment }),
    matrix: Object.freeze({
      moduleCount: neutralStateModuleCountV1,
      saveClasses: neutralStateSaveClassesV1,
      touchedModuleCounts: neutralStateTouchedModuleCountsV1,
      transcriptCommands: neutralStateTranscriptCommandCountV1,
      retainedCommands: neutralStateRetainedCommandCountV1,
      steadyPrefillCommands: neutralStateSteadyPrefillCommandCountV1,
      steadyMeasuredCommands: neutralStateSteadyMeasuredCommandCountV1,
    }),
    warmup: input.warmup,
    samples: input.samples,
    cold: Object.freeze([...input.cold]),
    cells: Object.freeze([...input.cells]),
    interpretation: Object.freeze({
      status: "trend_only" as const,
      machineBoundHardGate: false,
      correctnessIsRequired: true,
      timingsArePortableBudgets: false,
    }),
  });
}
