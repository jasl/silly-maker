// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

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
export const neutralStateModuleCountsV1 = [16, 160] as const;
export const neutralStateTranscriptCommandCountV1 = 256;
export const neutralStateRetainedCommandCountV1 = 200;
export const neutralStateSteadyPrefillCommandCountV1 = 256;
export const neutralStateSteadyMeasuredCommandCountV1 = 64;
export const neutralStateMemoryCheckpointsV1 = [0, 200, 400, 800, 1_200];
export const neutralStateSaveClassesV1 = ["10kib", "100kib", "1mib"] as const;
export const neutralStateTouchedModuleCountsV1 = [1, 4, 16] as const;

export type NeutralStateSaveClassV1 = (typeof neutralStateSaveClassesV1)[number];
export type NeutralStateModuleCountV1 = (typeof neutralStateModuleCountsV1)[number];
export type NeutralStateTouchedModuleCountV1 = (typeof neutralStateTouchedModuleCountsV1)[number];

export interface NeutralStateCellV1 {
  readonly moduleCount: NeutralStateModuleCountV1;
  readonly saveClass: NeutralStateSaveClassV1;
  readonly targetSaveBytes: number;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
}

const targetSaveBytesByClassV1 = {
  "10kib": 10 * 1024,
  "100kib": 100 * 1024,
  "1mib": 1024 * 1024,
} satisfies Record<NeutralStateSaveClassV1, number>;

export function createNeutralStateCellsV1(input: {
  readonly moduleCounts: readonly NeutralStateModuleCountV1[];
  readonly saveClasses: readonly NeutralStateSaveClassV1[];
  readonly touchedModuleCounts: readonly NeutralStateTouchedModuleCountV1[];
}): readonly NeutralStateCellV1[] {
  return (
    input.moduleCounts.flatMap((moduleCount) =>
      input.saveClasses.flatMap((saveClass) =>
        input.touchedModuleCounts.map((touchedModules) => ({
          moduleCount,
          saveClass,
          targetSaveBytes: targetSaveBytesByClassV1[saveClass],
          touchedModules,
        }))
      )
    )
  );
}

export const neutralStateMatrixCellsV1 = createNeutralStateCellsV1({
  moduleCounts: [neutralStateModuleCountV1],
  saveClasses: neutralStateSaveClassesV1,
  touchedModuleCounts: neutralStateTouchedModuleCountsV1,
});

export const neutralStateScaleCellsV1 = createNeutralStateCellsV1({
  moduleCounts: neutralStateModuleCountsV1,
  saveClasses: ["100kib", "1mib"],
  touchedModuleCounts: [1, 16],
});

const neutralStateHistoricalGcCellsV1: readonly NeutralStateCellV1[] = [
  neutralStateMatrixCellsV1[0]!,
  neutralStateMatrixCellsV1[2]!,
  neutralStateMatrixCellsV1[4]!,
  neutralStateMatrixCellsV1[6]!,
  neutralStateMatrixCellsV1[8]!,
];

export const neutralStateGcCellsV1: readonly NeutralStateCellV1[] = [
  ...neutralStateHistoricalGcCellsV1,
  ...neutralStateScaleCellsV1.filter((scaleCell) =>
    !neutralStateHistoricalGcCellsV1.some((historicalCell) =>
      historicalCell.moduleCount === scaleCell.moduleCount &&
      historicalCell.saveClass === scaleCell.saveClass &&
      historicalCell.touchedModules === scaleCell.touchedModules
    )
  ),
];

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
  readonly shape: NeutralStateShapeV1;
  readonly stateComposition: NeutralStateCompositionV1;
  dispose(): Promise<void>;
}

const textEncoderV1 = new TextEncoder();
const neutralCommandV1 = { kind: "neutral.advance" as const };
const fixedInstantV1 = "2026-08-18T00:00:00.000Z" as IsoUtcInstant;
let persistenceIdentityV1 = 0;

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const neutralSliceSchemaV1: RuntimeSchemaV1<NeutralModuleSliceV1> = {
  parse(value: unknown): NeutralModuleSliceV1 {
    if (
      !isRecordV1(value) || Object.keys(value).sort().join("\0") !== "counter\0payload" ||
      typeof value.payload !== "string"
    ) {
      throw new TypeError("invalid neutral module slice");
    }
    parseNonNegativeSafeInteger(value.counter);
    return value as unknown as NeutralModuleSliceV1;
  },
};

const neutralCommandSchemaV1: RuntimeSchemaV1<NeutralBenchmarkCommandV1> = {
  parse(value: unknown): NeutralBenchmarkCommandV1 {
    if (
      !isRecordV1(value) || Object.keys(value).join("\0") !== "kind" ||
      value.kind !== "neutral.advance"
    ) {
      throw new TypeError("invalid neutral benchmark command");
    }
    return neutralCommandV1;
  },
};

interface NeutralStateShapeV1 {
  readonly moduleCount: NeutralStateModuleCountV1;
  readonly moduleKeys: readonly string[];
  readonly moduleIds: readonly string[];
  readonly moduleEventKinds: readonly `neutral.module_advanced:${string}`[];
  readonly stateSchema: RuntimeSchemaV1<NeutralBenchmarkStateV1>;
  readonly snapshotSchema: RuntimeSchemaV1<NeutralSnapshotV1>;
  readonly eventSchema: RuntimeSchemaV1<NeutralBenchmarkEventV1>;
  readonly provenance: BuildProvenanceV1;
}

const stateShapesV1 = new Map<NeutralStateModuleCountV1, NeutralStateShapeV1>();

function createStateShapeV1(moduleCount: NeutralStateModuleCountV1): NeutralStateShapeV1 {
  const keyWidth = moduleCount < 100 ? 2 : 3;
  const moduleKeys = Array.from(
    { length: moduleCount },
    (_, index) => `module${String(index).padStart(keyWidth, "0")}`,
  );
  const moduleIds = moduleKeys.map((key) => `bench.state.${key}`);
  const moduleEventKinds = moduleIds.map((moduleId) =>
    `neutral.module_advanced:${moduleId}` as const
  );
  const stateSchema: RuntimeSchemaV1<NeutralBenchmarkStateV1> = {
    parse(value: unknown): NeutralBenchmarkStateV1 {
      if (!isRecordV1(value) || Object.keys(value).join("\0") !== "simulation") {
        throw new TypeError("invalid neutral benchmark State");
      }
      const simulation = value.simulation;
      if (
        !isRecordV1(simulation) ||
        Object.keys(simulation).sort().join("\0") !== [...moduleKeys].sort().join("\0")
      ) {
        throw new TypeError("invalid neutral benchmark module set");
      }
      for (const key of moduleKeys) neutralSliceSchemaV1.parse(simulation[key]);
      return value as unknown as NeutralBenchmarkStateV1;
    },
  };
  const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(
    stateSchema,
    rngStateV1Schema,
  ) as RuntimeSchemaV1<NeutralSnapshotV1>;
  const eventSchema: RuntimeSchemaV1<NeutralBenchmarkEventV1> = {
    parse(value: unknown) {
      if (
        !isRecordV1(value) ||
        Object.keys(value).sort().join("\0") !== "counter\0kind" ||
        typeof value.kind !== "string" ||
        !moduleEventKinds.includes(value.kind as `neutral.module_advanced:${string}`) ||
        !Number.isSafeInteger(value.counter)
      ) {
        throw new TypeError("invalid neutral benchmark event");
      }
      return {
        kind: value.kind as `neutral.module_advanced:${string}`,
        counter: parseNonNegativeSafeInteger(value.counter),
      };
    },
  };
  const identityPrefix = moduleCount === neutralStateModuleCountV1
    ? "neutral-composition-state-workload"
    : `neutral-composition-state-workload:${String(moduleCount)}-modules`;
  const identityDigest = (label: string): Digest =>
    digestBytes(textEncoderV1.encode(`${identityPrefix}:${label}`));
  const provenance: BuildProvenanceV1 = {
    story: {
      id: identityPrefix,
      revision: parsePositiveSafeInteger(1),
      digest: identityDigest("story"),
    },
    engine: {
      version: `${identityPrefix}-v1`,
      digest: identityDigest("engine"),
    },
    resolved: {
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractDigest: identityDigest("state-contract"),
      simulationDigest: identityDigest("simulation"),
      presentationDigest: identityDigest("presentation"),
      patchSet: {
        digest: identityDigest("patch-set"),
        simulationDigest: identityDigest("patch-set-simulation"),
        presentationDigest: identityDigest("patch-set-presentation"),
        appliedHotfixes: [],
      },
    },
  };
  return {
    moduleCount,
    moduleKeys,
    moduleIds,
    moduleEventKinds,
    stateSchema,
    snapshotSchema,
    eventSchema,
    provenance,
  };
}

function stateShapeV1(moduleCount: NeutralStateModuleCountV1): NeutralStateShapeV1 {
  const existing = stateShapesV1.get(moduleCount);
  if (existing !== undefined) return existing;
  const shape = createStateShapeV1(moduleCount);
  stateShapesV1.set(moduleCount, shape);
  return shape;
}

function payloadsV1(totalBytes: number, shape: NeutralStateShapeV1): readonly string[] {
  if (!Number.isSafeInteger(totalBytes) || totalBytes < 0) {
    throw new TypeError("neutral payload byte count must be a non-negative safe integer");
  }
  const base = Math.floor(totalBytes / shape.moduleCount);
  const remainder = totalBytes % shape.moduleCount;
  const payloads = shape.moduleKeys.map((_key, index) =>
    "x".repeat(base + (index < remainder ? 1 : 0))
  );
  const maximum = Math.max(...payloads.map((payload) => textEncoderV1.encode(payload).byteLength));
  if (maximum > 262_144) {
    throw new TypeError("neutral payload exceeds the Save single-string UTF-8 limit");
  }
  return payloads;
}

function initialSnapshotV1(input: {
  readonly shape: NeutralStateShapeV1;
  readonly payloadBytes: number;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly commandSequence?: number;
}): NeutralSnapshotV1 {
  const commandSequence = input.commandSequence ?? 0;
  const payloads = payloadsV1(input.payloadBytes, input.shape);
  const simulation: Record<string, NeutralModuleSliceV1> = {};
  for (let index = 0; index < input.shape.moduleCount; index += 1) {
    simulation[input.shape.moduleKeys[index]!] = {
      counter: index < input.touchedModules ? commandSequence : 0,
      payload: payloads[index]!,
    };
  }
  return {
    state: { simulation },
    rng: createTransactionalRngV1(parseNonZeroUint32(181)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(commandSequence),
    integrity: createPristineRunIntegrityV1(),
  };
}

function createModulesV1(
  kit: ReturnType<typeof createStateAuthoringKitV1<NeutralBenchmarkTypesV1>>,
  payloadBytes: number,
  shape: NeutralStateShapeV1,
) {
  const payloads = payloadsV1(payloadBytes, shape);
  return (shape.moduleKeys.map((key, index) => {
    const moduleId = shape.moduleIds[index]!;
    const eventKind = shape.moduleEventKinds[index]!;
    const read = kit.defineCapability<NeutralModuleReadPortV1>(`${moduleId}.read`);
    const module = kit.defineModule({
      id: moduleId,
      contractRevision: 1,
      state: {
        slot: `simulation.${key}`,
        schema: neutralSliceSchemaV1,
        initial: () => ({ counter: 0, payload: payloads[index]! }),
      },
      provides: (provide) => [
        provide(read, ({ readOwnState }) => ({ counter: () => readOwnState().counter })),
      ],
      reducers: {
        [eventKind](state, event) {
          return {
            counter: event.counter,
            payload: state.payload,
          };
        },
      },
    });
    return { module, read };
  }));
}

function createAdapterV1(input: {
  readonly shape: NeutralStateShapeV1;
  readonly stateComposition: NeutralStateCompositionV1;
  readonly readTokens: readonly StateCapabilityV1<NeutralModuleReadPortV1>[];
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly initialSnapshot: NeutralSnapshotV1;
  readonly attempts?: StateFinalizedCommandAttemptV1<NeutralBenchmarkTypesV1>[];
}): NeutralAdapterV1 {
  const workflow = input.stateComposition.createWorkflow({
    eventSchema: input.shape.eventSchema,
    createFault: () => ({ code: "neutral.failed" as const }),
    run(transaction) {
      for (let index = 0; index < input.touchedModules; index += 1) {
        const counter = parseNonNegativeSafeInteger(
          transaction.read(input.readTokens[index]!).counter() + 1,
        );
        transaction.emit({
          kind: input.shape.moduleEventKinds[index]!,
          counter,
        });
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
        { code: "neutral.failed" as const },
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
  readonly shape: NeutralStateShapeV1;
  readonly factoryToken: ReturnType<
    typeof createCompositionServiceTokenV1<LegacyApplicationFactoryV1<NeutralApplicationV1>>
  >;
  setStateComposition(composition: NeutralStateCompositionV1): void;
}

function createHarnessBlueprintV1(input: {
  readonly moduleCount: NeutralStateModuleCountV1;
  readonly payloadBytes: number;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly commandSequence?: number;
}): NeutralHarnessBlueprintV1 {
  const shape = stateShapeV1(input.moduleCount);
  const kit = createStateAuthoringKitV1<NeutralBenchmarkTypesV1>();
  const moduleEntries = createModulesV1(kit, input.payloadBytes, shape);
  const modules = moduleEntries.map(({ module }) => module);
  const readTokens = moduleEntries.map(({ read }) => read);
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
      return {
        adapter: createAdapterV1({
          shape,
          stateComposition,
          readTokens,
          touchedModules: input.touchedModules,
          initialSnapshot: initialSnapshotV1({ ...input, shape }),
        }),
      };
    },
    dispose() {},
  });
  const profile = defineStateCompositionProfileV1({
    id: "bench.state.profile",
    modules,
    plugins: [sessionPlugin],
  });
  return {
    kit,
    profile,
    readTokens,
    shape,
    factoryToken,
    setStateComposition(composition: NeutralStateCompositionV1) {
      if (stateComposition !== null) throw new TypeError("neutral State plan already compiled");
      stateComposition = composition;
    },
  };
}

async function activateHarnessV1(input: {
  readonly moduleCount: NeutralStateModuleCountV1;
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
  return {
    adapter: lease.application.adapter,
    kernel,
    lease,
    readTokens: blueprint.readTokens,
    shape: blueprint.shape,
    stateComposition,
    async dispose() {
      if (disposed) return;
      disposed = true;
      await kernel.dispose();
      await lease.dispose();
    },
  };
}

async function createPersistenceV1(
  adapter: NeutralAdapterV1,
  shape: NeutralStateShapeV1,
) {
  persistenceIdentityV1 += 1;
  const identity = String(persistenceIdentityV1);
  return await createPersistenceServiceV1({
    runtimeControl: adapter.runtimeControl,
    records: createMemoryHostRecordStoreV1(),
    snapshotSchema: shape.snapshotSchema,
    provenance: shape.provenance,
    adoptionDeclarations: [],
    saveStateMigrations: null,
    ownerId: `owner.neutral-bench.${identity}` as SessionLeaseOwnerId,
    nextHandoffRequestId: () => `handoff.neutral-bench.${identity}` as LeaseHandoffRequestId,
    validateReferences: () => [],
    validateInvariants: () => [],
    initialSimulationLineage: [],
    metadataClock: { now: () => fixedInstantV1 },
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
  moduleCount: NeutralStateModuleCountV1,
  saveClass: NeutralStateSaveClassV1,
  touchedModules: NeutralStateTouchedModuleCountV1,
): Promise<number> {
  const key = `${String(moduleCount)}/${saveClass}/${String(touchedModules)}`;
  const existing = calibratedPayloadBytesV1.get(key);
  if (existing !== undefined) return await existing;
  const calibration = (async () => {
    const harness = await activateHarnessV1({
      moduleCount,
      payloadBytes: 0,
      touchedModules,
      commandSequence: neutralStateTranscriptCommandCountV1,
    });
    const persistence = await createPersistenceV1(harness.adapter, harness.shape);
    try {
      const empty = await persistence.port.exportCurrentSave();
      const payloadBytes = targetSaveBytesByClassV1[saveClass] - empty.bytes.byteLength;
      payloadsV1(payloadBytes, harness.shape);
      if (payloadBytes < 0) {
        throw new TypeError(`${saveClass} is smaller than the neutral Save envelope`);
      }
      return payloadBytes;
    } finally {
      await persistence.dispose();
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
  const identity = { provenance: harness.shape.provenance };
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
        shape: harness.shape,
        stateComposition: harness.stateComposition,
        readTokens: harness.readTokens,
        touchedModules,
        initialSnapshot: replayBase as NeutralSnapshotV1,
        attempts,
      });
      return {
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
      };
    },
  });
}

export interface NeutralStateCorrectnessObservationV1 {
  readonly moduleCount: NeutralStateModuleCountV1;
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
  readonly ownerCountersMatch: boolean;
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
  expectedModuleCount: NeutralStateModuleCountV1 = neutralStateModuleCountV1,
): void {
  const replay = observation.replay;
  if (
    observation.moduleCount !== expectedModuleCount ||
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
    !observation.ownerCountersMatch ||
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
  readonly moduleCount?: NeutralStateModuleCountV1;
  readonly saveClass: NeutralStateSaveClassV1;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly now?: () => number;
}): Promise<NeutralStateCorrectnessObservationV1> {
  const moduleCount = input.moduleCount ?? neutralStateModuleCountV1;
  const now = input.now ?? (() => performance.now());
  const payloadBytes = await calibratePayloadBytesV1(
    moduleCount,
    input.saveClass,
    input.touchedModules,
  );
  const sourceBlueprint = createHarnessBlueprintV1({
    moduleCount,
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
  const sourceHarness: ActivatedNeutralHarnessV1 = {
    adapter: sourceLease.application.adapter,
    kernel: sourceKernel,
    lease: sourceLease,
    readTokens: sourceBlueprint.readTokens,
    shape: sourceBlueprint.shape,
    stateComposition: sourceComposition,
    async dispose() {
      if (sourceDisposed) return;
      sourceDisposed = true;
      await sourceKernel.dispose();
      await sourceLease.dispose();
    },
  };
  const targetHarness = await activateHarnessV1({
    moduleCount,
    payloadBytes: 0,
    touchedModules: input.touchedModules,
  });
  const sourcePersistence = await createPersistenceV1(sourceHarness.adapter, sourceHarness.shape);
  const targetPersistence = await createPersistenceV1(targetHarness.adapter, targetHarness.shape);
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
    const ownerCountersMatch = [sourceCurrent, importedSnapshot].every((snapshot) =>
      sourceHarness.shape.moduleKeys.every((key, index) =>
        snapshot.state.simulation[key]?.counter ===
          (index < input.touchedModules ? neutralStateTranscriptCommandCountV1 : 0)
      )
    );
    const observation: NeutralStateCorrectnessObservationV1 = {
      moduleCount,
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
      ownerCountersMatch,
      roundtripBytesMatch: bytesEqualV1(exported.bytes, roundtrip.bytes),
      importedCommandSequence: importedSnapshot.commandSequence,
      replay,
      durationMs: {
        retentionCrossingTranscript: transcriptDuration,
        saveRoundtrip: saveDuration,
        authoritativeReplay: replayDuration,
      },
    };
    requireNeutralStateCorrectnessV1(
      observation,
      targetSaveBytesByClassV1[input.saveClass],
      moduleCount,
    );
    return observation;
  } finally {
    await sourcePersistence.dispose();
    await targetPersistence.dispose();
    await sourceHarness.dispose();
    await targetHarness.dispose();
  }
}

export interface NeutralStateColdObservationV1 {
  readonly moduleCount: NeutralStateModuleCountV1;
  readonly sessionStatus: "ready";
  readonly durationMs: {
    readonly mount: number;
    readonly directPlanCompile: number;
    readonly sessionCreate: number;
    readonly dispose: number;
  };
}

export async function runNeutralStateColdSampleV1(
  moduleCount: NeutralStateModuleCountV1 = neutralStateModuleCountV1,
  now: () => number = () => performance.now(),
): Promise<NeutralStateColdObservationV1> {
  const blueprint = createHarnessBlueprintV1({
    moduleCount,
    payloadBytes: 0,
    touchedModules: 16,
  });
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
  return {
    moduleCount,
    sessionStatus: status,
    durationMs: {
      mount: mountDuration,
      directPlanCompile: compileDuration,
      sessionCreate: sessionDuration,
      dispose: disposeDuration,
    },
  };
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
  readonly moduleCount?: NeutralStateModuleCountV1;
  readonly saveClass: NeutralStateSaveClassV1;
  readonly touchedModules: NeutralStateTouchedModuleCountV1;
  readonly now?: () => number;
}): Promise<NeutralStateSteadyObservationV1> {
  const moduleCount = input.moduleCount ?? neutralStateModuleCountV1;
  const now = input.now ?? (() => performance.now());
  const payloadBytes = await calibratePayloadBytesV1(
    moduleCount,
    input.saveClass,
    input.touchedModules,
  );
  const harness = await activateHarnessV1({
    moduleCount,
    payloadBytes,
    touchedModules: input.touchedModules,
  });
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
    return {
      prefillCommands: neutralStateSteadyPrefillCommandCountV1,
      measuredCommands: neutralStateSteadyMeasuredCommandCountV1,
      retainedBeforeMeasurement: entries.length,
      replayBaseCommandSequenceBeforeMeasurement: replayBase.commandSequence,
      durationMs,
      durationMsPerCommand: durationMs / neutralStateSteadyMeasuredCommandCountV1,
    };
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
    checkpoints.push({
      commandCount,
      dispatchDurationMs,
      ...input.readMemoryUsage(),
    });
  }
  return checkpoints;
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
      cell.moduleCount === input.cell.moduleCount &&
      cell.saveClass === input.cell.saveClass &&
      cell.touchedModules === input.cell.touchedModules
    )
  ) {
    throw new TypeError("neutral memory benchmark accepts only a declared GC cell");
  }
  const payloadBytes = await calibratePayloadBytesV1(
    input.cell.moduleCount,
    input.cell.saveClass,
    input.cell.touchedModules,
  );
  const harness = await activateHarnessV1({
    moduleCount: input.cell.moduleCount,
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
    return {
      ...input.cell,
      gcPassesPerCheckpoint: 2,
      checkpoints,
    };
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

export interface NeutralStateBenchmarkRepositoryV1 {
  readonly revision: string;
  readonly workingTreeModified: boolean;
}

export interface NeutralStateDurationDistributionV1 {
  readonly raw: readonly number[];
  readonly p50: number;
  readonly p95: number;
}

export function createNeutralStateDurationDistributionV1(
  values: readonly number[],
): NeutralStateDurationDistributionV1 {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new TypeError("neutral benchmark requires finite non-negative duration samples");
  }
  const ordered = values.toSorted((left, right) => left - right);
  const nearestRank = (percentile: number): number =>
    ordered[Math.min(ordered.length - 1, Math.ceil(percentile * ordered.length) - 1)]!;
  return {
    raw: [...values],
    p50: nearestRank(0.5),
    p95: nearestRank(0.95),
  };
}

const execFileV1 = promisify(execFileCallback);

export async function readNeutralStateBenchmarkRepositoryV1(
  repositoryRoot: string,
): Promise<NeutralStateBenchmarkRepositoryV1> {
  const [revision, status] = await Promise.all([
    execFileV1("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot }),
    execFileV1("git", ["status", "--porcelain=v1", "--untracked-files=normal"], {
      cwd: repositoryRoot,
    }),
  ]);
  return {
    revision: revision.stdout.trim(),
    workingTreeModified: status.stdout.trim().length > 0,
  };
}

export function createNeutralStateMemoryReportV1(input: {
  readonly generatedAt: string;
  readonly environment: NeutralStateBenchmarkEnvironmentV1;
  readonly repository: NeutralStateBenchmarkRepositoryV1;
  readonly cell: NeutralStateCellV1;
  readonly checkpoints: readonly NeutralStateMemoryCheckpointV1[];
}) {
  return {
    schemaVersion: 2,
    generatedAt: input.generatedAt,
    repository: { ...input.repository },
    environment: { ...input.environment },
    cell: { ...input.cell },
    protocol: {
      processCells: 1,
      checkpoints: neutralStateMemoryCheckpointsV1,
      gcPassesPerCheckpoint: 2,
      macrotaskBetweenGcPasses: true,
    },
    checkpoints: [...input.checkpoints],
    interpretation: {
      status: "trend_only" as const,
      machineBoundHardGate: false,
      timingsArePortableBudgets: false,
    },
  };
}

export function createNeutralStatePerformanceReportV1(input: {
  readonly generatedAt: string;
  readonly environment: NeutralStateBenchmarkEnvironmentV1;
  readonly repository: NeutralStateBenchmarkRepositoryV1;
  readonly moduleCounts: readonly NeutralStateModuleCountV1[];
  readonly saveClasses: readonly NeutralStateSaveClassV1[];
  readonly touchedModuleCounts: readonly NeutralStateTouchedModuleCountV1[];
  readonly warmup: number;
  readonly samples: number;
  readonly cold: readonly unknown[];
  readonly cells: readonly unknown[];
}) {
  return {
    schemaVersion: 2,
    generatedAt: input.generatedAt,
    repository: { ...input.repository },
    environment: { ...input.environment },
    matrix: {
      moduleCounts: [...input.moduleCounts],
      saveClasses: [...input.saveClasses],
      touchedModuleCounts: [...input.touchedModuleCounts],
      transcriptCommands: neutralStateTranscriptCommandCountV1,
      retainedCommands: neutralStateRetainedCommandCountV1,
      steadyPrefillCommands: neutralStateSteadyPrefillCommandCountV1,
      steadyMeasuredCommands: neutralStateSteadyMeasuredCommandCountV1,
    },
    warmup: input.warmup,
    samples: input.samples,
    cold: [...input.cold],
    cells: [...input.cells],
    interpretation: {
      status: "trend_only" as const,
      machineBoundHardGate: false,
      correctnessIsRequired: true,
      timingsArePortableBudgets: false,
    },
  };
}
