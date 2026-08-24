// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { SaveSlotIdV1, SessionLeaseOwnerId } from "../../contracts/application.ts";
import { isPlayerWritableSaveSlotIdV1, isSaveSlotIdShapeV1 } from "../../contracts/application.ts";
import { digestBytes, digestCanonical } from "../../contracts/digest.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.ts";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../../contracts/gameplay-module.ts";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../../contracts/host.ts";
import { createMemoryHostRecordStoreV1 } from "../../contracts/host.ts";
import type { PatchSetAdoptionDeclarationV1, PatchSetIdentityV1 } from "../../contracts/hotfix.ts";
import type { BuildProvenanceV1 } from "../../contracts/provenance.ts";
import {
  defineSaveStateMigrationRegistryV1,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
  parseSaveStateMigrationReasonCodeV1,
} from "../../contracts/save-state-migration.ts";
import type {
  SaveStateContractIdentityV1,
  SaveStateMigrationRegistryV1,
  SaveStateMigrationStepV1,
} from "../../contracts/save-state-migration.ts";
import {
  createSaveRecordEnvelopeSchemaV1,
  parseIsoUtcInstantV1,
} from "../../contracts/persistence.ts";
import type {
  SaveCodecContextV1,
  SaveImportValidationContextV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.ts";
import type { VersionStampV1 } from "../../contracts/version-stamp.ts";
import type { GameSnapshotEnvelopeV1, RunIntegrityV1 } from "../../contracts/snapshot.ts";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  runIntegrityV1Schema,
} from "../../contracts/snapshot.ts";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  RuntimeSchemaV1,
} from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.ts";
import {
  createSnapshotWorkCounterV1,
  type SnapshotWorkInstrumentationV1,
} from "../../internal/snapshot-work-instrumentation.ts";
import type {
  AuthoritativeOutcomeV1,
  GameSessionRuntimeControlV1,
} from "../session/game-session.ts";
import { createGameSessionV1 } from "../session/game-session.ts";
import { classifySaveCompatibilityV1 } from "./compatibility.ts";
import { decodeSaveRecordV1, encodeSaveRecordV1 } from "./save-codec.ts";
import {
  adoptPersistenceRebootstrapHandoffInternalV1,
  bindPersistenceAnchorReplacementInternalV1,
  captureAutoSaveWithReceiptInternalV1,
  createInstrumentedPersistenceServiceV1,
  createPersistenceServiceV1,
  disposePersistenceForRebootstrapInternalV1,
  fencePersistencePlayerMutationsInternalV1,
} from "./persistence-service.ts";
import type {
  SaveSummaryProjectionEventInternalV1,
  SaveSummaryProjectionInstrumentationInternalV1,
} from "./persistence-service.ts";
import { createSaveRepositoryV1 } from "./save-repository.ts";
import type { SaveRepositorySlotMetadataV1, SaveRepositoryV1 } from "./save-repository.ts";
import { createSessionLeaseV1 } from "./session-lease.ts";
import type { SessionLeaseV1 } from "./session-lease.ts";
import {
  createSaveMigrationBackupRecordKeyV1,
  createSaveSlotRecordKeyV1,
  createSessionLeaseRecordKeyV1,
} from "./slot-keys.ts";

interface SyntheticStateV1 {
  readonly count: NonNegativeSafeInteger;
  readonly referenceId: string;
}

interface SyntheticRngV1 {
  readonly cursor: NonNegativeSafeInteger;
}

type SyntheticSnapshotV1 = GameSnapshotEnvelopeV1<SyntheticStateV1, SyntheticRngV1>;
type SyntheticSaveRecordV1 = SaveRecordEnvelopeV1<
  SyntheticSnapshotV1,
  BuildProvenanceV1,
  SaveRepositorySlotMetadataV1,
  readonly SimulationAdoptionV1[]
>;

type SyntheticCommandV1 = { readonly kind: "increment" };
type SyntheticAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  SyntheticSnapshotV1,
  { readonly count: NonNegativeSafeInteger },
  { readonly code: string },
  { readonly code: string },
  SyntheticRngV1,
  never
>;

interface SyntheticTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    SyntheticStateV1,
    SyntheticRngV1
  > {
  readonly snapshot: SyntheticSnapshotV1;
  readonly command: SyntheticCommandV1;
  readonly event: { readonly count: NonNegativeSafeInteger };
  readonly rejection: { readonly code: string };
  readonly fault: { readonly code: string };
  readonly rngState: SyntheticRngV1;
  readonly rngDrawTrace: never;
  readonly executionContext: undefined;
}

const storyIdV1 = "story.persistence-service-test";
const ownerIdV1 = "owner.persistence-service-test" as SessionLeaseOwnerId;
const textEncoderV1 = new TextEncoder();

async function resolveWithinV1<TResult>(promise: Promise<TResult>): Promise<TResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("operation did not settle within the test guard"));
        }, 1_000);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

const digestV1 = (label: string): Digest => digestBytes(textEncoderV1.encode(label));

function patchSetV1(label = "current"): PatchSetIdentityV1 {
  return Object.freeze({
    digest: digestV1(`patch:${label}`),
    simulationDigest: digestV1(`patch:simulation:${label}`),
    presentationDigest: digestV1(`patch:presentation:${label}`),
    appliedHotfixes: Object.freeze([]),
  });
}

function provenanceV1(
  input: {
    readonly simulation?: string;
    readonly engine?: string;
    readonly patch?: string;
  } = {},
): BuildProvenanceV1 {
  return Object.freeze({
    story: Object.freeze({
      id: storyIdV1,
      revision: parsePositiveSafeInteger(1),
      digest: digestV1("story"),
    }),
    engine: Object.freeze({
      version: "1.0.0",
      digest: digestV1(input.engine ?? "engine"),
    }),
    resolved: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractDigest: digestV1("state-contract"),
      simulationDigest: digestV1(input.simulation ?? "simulation.current"),
      presentationDigest: digestV1("presentation"),
      patchSet: patchSetV1(input.patch),
    }),
  });
}

function adoptionDeclarationV1(
  stored: BuildProvenanceV1,
  current: BuildProvenanceV1,
): PatchSetAdoptionDeclarationV1 {
  return Object.freeze({
    storyId: current.story.id,
    storyRevision: current.story.revision,
    stateContractRevision: current.resolved.stateContractRevision,
    stateContractDigest: current.resolved.stateContractDigest,
    fromSimulationDigest: stored.resolved.simulationDigest,
    toSimulationDigest: current.resolved.simulationDigest,
    simulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
  });
}

function stateContractIdentityV1(
  provenance: DeepReadonly<BuildProvenanceV1>,
): SaveStateContractIdentityV1 {
  return Object.freeze({
    stateContractRevision: provenance.resolved.stateContractRevision,
    stateContractDigest: provenance.resolved.stateContractDigest,
  });
}

function migrationTargetProvenanceV1(input: { readonly simulation?: string } = {}) {
  const source = provenanceV1();
  return Object.freeze({
    ...source,
    resolved: Object.freeze({
      ...source.resolved,
      stateContractRevision: parsePositiveSafeInteger(
        Number(source.resolved.stateContractRevision) + 1,
      ),
      stateContractDigest: digestV1("state-contract.migrated"),
      ...(input.simulation === undefined ? {} : {
        simulationDigest: digestV1(input.simulation),
        patchSet: patchSetV1("migrated"),
      }),
    }),
  });
}

function migrationRegistryV1(
  source: DeepReadonly<BuildProvenanceV1>,
  target: DeepReadonly<BuildProvenanceV1>,
  migrate: SaveStateMigrationStepV1["migrate"],
): SaveStateMigrationRegistryV1 {
  const namespace = parseSaveStateMigrationNamespaceV1("state.persistence-service-test");
  return defineSaveStateMigrationRegistryV1({
    namespace,
    minimumSupported: stateContractIdentityV1(source),
    current: stateContractIdentityV1(target),
    steps: Object.freeze([
      Object.freeze({
        migrationId: parseSaveStateMigrationIdV1("migration.persistence-service-test.one"),
        namespace,
        from: stateContractIdentityV1(source),
        to: stateContractIdentityV1(target),
        references: Object.freeze({ renames: Object.freeze([]), deletions: Object.freeze([]) }),
        migrate,
      }),
    ]),
  });
}

function exactObjectV1(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid object");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).toSorted().join("\0") !== [...keys].toSorted().join("\0")) {
    throw new TypeError("invalid object fields");
  }
  return Object.fromEntries(keys.map((key) => [key, record[key]]));
}

const stateSchemaV1: RuntimeSchemaV1<SyntheticStateV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["count", "referenceId"]);
    if (typeof fields.referenceId !== "string") {
      throw new TypeError("invalid reference ID");
    }
    return {
      count: parseNonNegativeSafeInteger(fields.count),
      referenceId: fields.referenceId,
    };
  },
});

const rngSchemaV1: RuntimeSchemaV1<SyntheticRngV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["cursor"]);
    return {
      cursor: parseNonNegativeSafeInteger(fields.cursor),
    };
  },
});

const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(stateSchemaV1, rngSchemaV1);
const provenanceSchemaV1: RuntimeSchemaV1<BuildProvenanceV1> = Object.freeze({
  parse(value: unknown) {
    if (value === null || typeof value !== "object") {
      throw new TypeError("invalid provenance");
    }
    return value as BuildProvenanceV1;
  },
});
const slotSchemaV1: RuntimeSchemaV1<SaveRepositorySlotMetadataV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, [
      "storyId",
      "slotId",
      "writeReason",
      "capturedCommandSequence",
    ]);
    if (
      typeof fields.storyId !== "string" ||
      !isSaveSlotIdShapeV1(fields.slotId) ||
      (fields.writeReason !== "auto" && !isPlayerWritableSaveSlotIdV1(fields.writeReason))
    ) {
      throw new TypeError("invalid slot metadata");
    }
    return {
      storyId: fields.storyId,
      slotId: fields.slotId,
      writeReason: fields.writeReason as SaveRepositorySlotMetadataV1["writeReason"],
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    };
  },
});
const lineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown) {
    if (!Array.isArray(value)) {
      throw new TypeError("invalid simulation lineage");
    }
    return value as readonly SimulationAdoptionV1[];
  },
});
const recordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  snapshotSchemaV1,
  provenanceSchemaV1,
  slotSchemaV1,
  lineageSchemaV1,
);
const codecV1: SaveCodecContextV1<SyntheticSnapshotV1, SyntheticSaveRecordV1> = Object.freeze({
  recordSchema: recordSchemaV1,
  validateEnvelope(record: DeepReadonly<SyntheticSaveRecordV1>) {
    const expectedReason =
      record.slot.slotId === "auto.current" || record.slot.slotId === "auto.previous"
        ? "auto"
        : record.slot.slotId;
    if (
      record.slot.storyId !== record.provenance.story.id ||
      record.slot.writeReason !== expectedReason ||
      record.slot.capturedCommandSequence !== record.snapshot.commandSequence
    ) {
      throw new TypeError("invalid Save identity");
    }
    for (let index = 0; index < record.simulationLineage.length; index += 1) {
      const current = record.simulationLineage[index];
      const next = record.simulationLineage[index + 1];
      if (
        current === undefined ||
        current.toSimulationDigest !==
          (next?.fromSimulationDigest ?? record.provenance.resolved.simulationDigest)
      ) {
        throw new TypeError("invalid simulation lineage");
      }
    }
  },
});

function snapshotV1(
  sequence: number,
  integrity: RunIntegrityV1 = createPristineRunIntegrityV1(),
): SyntheticSnapshotV1 {
  return snapshotSchemaV1.parse({
    state: { count: sequence, referenceId: "reference.valid" },
    rng: { cursor: sequence },
    commandSequence: sequence,
    integrity,
  });
}

function lineageV1(length: number, finalDigest: Digest): readonly SimulationAdoptionV1[] {
  const boundaries = Array.from({ length }, (_, index) => digestV1(`lineage:${index}`));
  return Object.freeze(
    boundaries.map((fromSimulationDigest, index) =>
      Object.freeze({
        fromSimulationDigest,
        toSimulationDigest: boundaries[index + 1] ?? finalDigest,
        viaSimulationPatchSetDigest: digestV1(`lineage-patch:${index}`),
        adoptedAtCommandSequence: parseNonNegativeSafeInteger(index),
      })
    ),
  );
}

function recordV1(input: {
  readonly snapshot: SyntheticSnapshotV1;
  readonly provenance?: BuildProvenanceV1;
  readonly lineage?: readonly SimulationAdoptionV1[];
  readonly slotId?: SaveSlotIdV1;
  readonly recordRevision?: number;
}): SyntheticSaveRecordV1 {
  const provenance = input.provenance ?? provenanceV1();
  const slotId = input.slotId ?? "manual.1";
  return recordSchemaV1.parse({
    formatRevision: 1,
    recordRevision: parsePositiveSafeInteger(input.recordRevision ?? 1),
    provenance,
    slot: {
      storyId: storyIdV1,
      slotId,
      writeReason: slotId === "auto.current" || slotId === "auto.previous" ? "auto" : slotId,
      capturedCommandSequence: input.snapshot.commandSequence,
    },
    savedAt: parseIsoUtcInstantV1("2026-07-14T12:00:00.000Z"),
    stateDigest: digestCanonical("sillymaker:state:v1", input.snapshot),
    snapshot: input.snapshot,
    simulationLineage: input.lineage ?? Object.freeze([]),
  });
}

const commandSchemaV1: RuntimeSchemaV1<SyntheticCommandV1> = Object.freeze({
  parse(value: unknown) {
    if ((value as { readonly kind?: unknown } | null)?.kind !== "increment") {
      throw new TypeError("invalid command");
    }
    return Object.freeze({ kind: "increment" });
  },
});

function executeAttemptV1(current: DeepReadonly<SyntheticSnapshotV1>): SyntheticAttemptV1 {
  const parsed = snapshotV1(Number(current.commandSequence) + 1, current.integrity);
  const next = Object.freeze({ ...parsed, integrity: current.integrity });
  return Object.freeze({
    result: Object.freeze({
      kind: "committed" as const,
      snapshot: next,
      events: Object.freeze([{ count: next.state.count }]),
    }),
    diagnostics: Object.freeze({
      committedRngBefore: current.rng,
      attemptedDraws: Object.freeze([]) as readonly never[],
      committedRngAfter: next.rng,
    }),
  });
}

function createSessionV1(initial: SyntheticSnapshotV1) {
  return createGameSessionV1<SyntheticTypesV1>({
    initialSnapshot: initial,
    commandSchema: commandSchemaV1,
    executionContext: undefined,
    executeAttempt: executeAttemptV1,
    normalizeUnexpectedDispatchFault(_error, current) {
      return Object.freeze({
        result: Object.freeze({
          kind: "faulted" as const,
          snapshot: current,
          fault: Object.freeze({ code: "synthetic.unexpected" }),
        }),
        diagnostics: Object.freeze({
          committedRngBefore: current.rng,
          attemptedDraws: Object.freeze([]) as readonly never[],
          committedRngAfter: current.rng,
        }),
      });
    },
  });
}

interface FixtureOptionsV1 {
  readonly collectVersionStamp?: () => VersionStampV1;
  readonly records?: HostAtomicRecordStoreV1;
  readonly ownerId?: SessionLeaseOwnerId;
  readonly manualSaveSlotCount?: number;
  readonly leaseAcquisition?: "acquire_initial" | "deferred_rebootstrap";
  readonly initial?: SyntheticSnapshotV1;
  readonly provenance?: BuildProvenanceV1;
  readonly adoptionDeclarations?: readonly PatchSetAdoptionDeclarationV1[];
  readonly classifyCompatibility?: SaveImportValidationContextV1<
    SyntheticStateV1,
    SyntheticSnapshotV1,
    SyntheticSaveRecordV1
  >["classifyCompatibility"];
  readonly saveStateMigrations?: SaveStateMigrationRegistryV1 | null;
  readonly initialLineage?: readonly SimulationAdoptionV1[];
  decorateRuntimeControl?(
    runtimeControl: GameSessionRuntimeControlV1<SyntheticSnapshotV1>,
  ): GameSessionRuntimeControlV1<SyntheticSnapshotV1>;
  summarizeSave?(state: DeepReadonly<SyntheticStateV1>): readonly string[] | null;
  decorateRepository?(
    repository: SaveRepositoryV1<SyntheticSaveRecordV1>,
    lease: SessionLeaseV1,
    records: HostAtomicRecordStoreV1,
  ): SaveRepositoryV1<SyntheticSaveRecordV1>;
  decorateLease?(lease: SessionLeaseV1, records: HostAtomicRecordStoreV1): SessionLeaseV1;
}

function wrapRuntimeControlV1<TSnapshot>(
  delegate: GameSessionRuntimeControlV1<TSnapshot>,
  cloneReplacementOutcome = false,
  cloneReplacementResult = false,
  wrapPrepareCallback = false,
): GameSessionRuntimeControlV1<TSnapshot> {
  return Object.freeze({
    enqueueAuthoritative<TResult>(
      operation: (
        current: DeepReadonly<TSnapshot>,
      ) => Promise<AuthoritativeOutcomeV1<TSnapshot, TResult>>,
      normalizeUnexpectedFault: (error: unknown) => TResult,
      prepareReplacementCommit?: (
        snapshot: DeepReadonly<TSnapshot>,
        anchor: "preserve_log" | "replace_replay_base",
      ) => void,
      whenHmrInvalidated?: () => TResult,
    ) {
      return delegate.enqueueAuthoritative(
        async (current) => {
          const outcome = await operation(current);
          return cloneReplacementOutcome && outcome.kind === "replace"
            ? Object.freeze({
              ...outcome,
              result: cloneReplacementResult &&
                  typeof outcome.result === "object" &&
                  outcome.result !== null
                ? Object.freeze({ ...outcome.result })
                : outcome.result,
            })
            : outcome;
        },
        normalizeUnexpectedFault,
        wrapPrepareCallback && prepareReplacementCommit !== undefined
          ? (snapshot, anchor) => prepareReplacementCommit(snapshot, anchor)
          : prepareReplacementCommit,
        whenHmrInvalidated,
      );
    },
    readAtQueueFront<TResult>(reader: (snapshot: DeepReadonly<TSnapshot>) => TResult) {
      return delegate.readAtQueueFront(reader);
    },
    inspectForRuntime: () => delegate.inspectForRuntime(),
    subscribeCommittedSnapshots: (listener: (snapshot: DeepReadonly<TSnapshot>) => void) =>
      delegate.subscribeCommittedSnapshots(listener),
  });
}

async function fixtureV1(options: FixtureOptionsV1 = {}) {
  const records = options.records ?? createMemoryHostRecordStoreV1();
  const provenance = options.provenance ?? provenanceV1();
  const created = createSessionV1(options.initial ?? snapshotV1(0));
  const lease = createSessionLeaseV1({
    records,
    storyId: storyIdV1,
    ownerId: options.ownerId ?? ownerIdV1,
    nextHandoffRequestId: () => "handoff.persistence-service-test" as never,
  });
  const baseRepository = createSaveRepositoryV1({
    records,
    storyId: storyIdV1,
    codec: codecV1,
  });
  const repository = options.decorateRepository?.(baseRepository, lease, records) ?? baseRepository;
  const serviceLease = options.decorateLease?.(lease, records) ?? lease;
  const validation: SaveImportValidationContextV1<
    SyntheticStateV1,
    SyntheticSnapshotV1,
    SyntheticSaveRecordV1
  > = Object.freeze({
    codec: codecV1,
    currentStateContractRevision: provenance.resolved.stateContractRevision,
    saveStateMigrations: options.saveStateMigrations ?? null,
    classifyCompatibility: options.classifyCompatibility ?? ((record) => {
      return classifySaveCompatibilityV1({
        stored: record.provenance,
        current: provenance,
        simulationLineage: record.simulationLineage,
        adoptionDeclarations: options.adoptionDeclarations ?? Object.freeze([]),
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    }),
    validateReferences(state: DeepReadonly<SyntheticStateV1>) {
      return state.referenceId === "reference.valid" ? Object.freeze([]) : ["reference.unknown"];
    },
    validateInvariants() {
      return Object.freeze([]);
    },
  });
  const metadataClock = Object.freeze({
    now: () => "2026-07-14T12:00:00.000Z" as IsoUtcInstant,
  });
  const service = await createPersistenceServiceV1({
    runtimeControl: options.decorateRuntimeControl?.(created.runtimeControl) ??
      created.runtimeControl,
    repository,
    lease: serviceLease,
    validation,
    provenance,
    initialSimulationLineage: options.initialLineage ?? Object.freeze([]),
    metadataClock,
    exportFilename: "synthetic-save.json",
    ...(options.manualSaveSlotCount === undefined
      ? {}
      : { manualSaveSlotCount: options.manualSaveSlotCount }),
    ...(options.leaseAcquisition === undefined
      ? {}
      : { leaseAcquisition: options.leaseAcquisition }),
    ...(options.summarizeSave === undefined ? {} : { summarizeSave: options.summarizeSave }),
    ...(options.collectVersionStamp === undefined
      ? {}
      : { collectVersionStamp: options.collectVersionStamp }),
  });
  return Object.freeze({
    ...created,
    records,
    repository: baseRepository,
    lease,
    service,
  });
}

function createDelayedSaveStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let block = false;
  let release: (() => void) | undefined;
  let started: (() => void) | undefined;
  let startedPromise = Promise.resolve();
  let gate = Promise.resolve();
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      if (block && mutations.some(({ namespace }) => namespace === "save")) {
        started?.();
        await gate;
      }
      return memory.commit(mutations);
    },
  });
  return Object.freeze({
    records,
    blockSaveWrites() {
      block = true;
      startedPromise = new Promise<void>((resolve) => {
        started = resolve;
      });
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    waitUntilWriteStarts: () => startedPromise,
    releaseWrites() {
      block = false;
      release?.();
    },
  });
}

function createSemanticallyTamperingStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let tamperSaveReads = false;
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    async read(...args: Parameters<HostAtomicRecordStoreV1["read"]>) {
      const stored = await memory.read(...args);
      if (!tamperSaveReads || args[0] !== "save" || stored === null) {
        return stored;
      }
      const parsed = JSON.parse(new TextDecoder().decode(stored.bytes)) as unknown;
      return Object.freeze({
        ...stored,
        bytes: textEncoderV1.encode(JSON.stringify(parsed, null, 2)),
      });
    },
    list: memory.list,
    async commit(...args: Parameters<HostAtomicRecordStoreV1["commit"]>) {
      const result = await memory.commit(...args);
      if (
        result.kind === "committed" &&
        args[0].some((mutation) => mutation.namespace === "save")
      ) {
        tamperSaveReads = true;
      }
      return result;
    },
  });
  return records;
}

function unavailableStoreV1(): HostAtomicRecordStoreV1 {
  const failure = new Error("IndexedDB unavailable");
  Object.defineProperties(failure, {
    name: { value: "IndexedDbRecordStoreFailureV1" },
    code: { value: "indexeddb.unavailable" },
    operation: { value: "read" },
  });
  return Object.freeze({
    async read() {
      throw failure;
    },
    async list() {
      throw failure;
    },
    async commit() {
      throw failure;
    },
  });
}

function createSwitchableUnavailableStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let unavailable = false;
  const failV1 = (operation: "read" | "list" | "commit"): never => {
    const failure = new Error("IndexedDB quota exceeded");
    Object.defineProperties(failure, {
      name: { value: "IndexedDbRecordStoreFailureV1" },
      code: { value: "indexeddb.quota_exceeded" },
      operation: { value: operation },
    });
    throw failure;
  };
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read(...args: Parameters<HostAtomicRecordStoreV1["read"]>) {
      return unavailable ? failV1("read") : memory.read(...args);
    },
    list(...args: Parameters<HostAtomicRecordStoreV1["list"]>) {
      return unavailable ? failV1("list") : memory.list(...args);
    },
    commit(...args: Parameters<HostAtomicRecordStoreV1["commit"]>) {
      return unavailable ? failV1("commit") : memory.commit(...args);
    },
  });
  return Object.freeze({
    records,
    becomeUnavailable() {
      unavailable = true;
    },
  });
}

function createSwitchableCommitFailureStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let failure: "none" | "unavailable" | "throw" = "none";
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      if (failure === "none") return await memory.commit(mutations);
      if (failure === "throw") throw new Error("unclassified Save commit failure");
      const error = new Error("synthetic Save commit outage");
      Object.defineProperties(error, {
        name: { value: "IndexedDbRecordStoreFailureV1" },
        code: { value: "indexeddb.transaction_aborted" },
        operation: { value: "commit" },
      });
      throw error;
    },
  });
  return Object.freeze({
    records,
    setFailure(value: "none" | "unavailable" | "throw") {
      failure = value;
    },
  });
}

async function ownedFenceV1(fixture: Awaited<ReturnType<typeof fixtureV1>>) {
  await fixture.lease.getStatus();
  const fence = fixture.lease.captureFence();
  if (fence === null) throw new TypeError("expected an owned lease");
  return fence;
}

async function saveRecordsV1(records: HostAtomicRecordStoreV1) {
  return (await records.list("save")).map((record) => ({
    key: record.key,
    revision: record.revision,
    bytes: [...record.bytes],
  }));
}

async function leaseRecordsV1(records: HostAtomicRecordStoreV1) {
  return (await records.list("lease")).map((record) => ({
    key: record.key,
    revision: record.revision,
    bytes: [...record.bytes],
  }));
}

async function seedQuickRecordV1(
  fixture: Awaited<ReturnType<typeof fixtureV1>>,
  record: SyntheticSaveRecordV1,
) {
  await expect(
    fixture.repository.writePlayer("quick", record, await ownedFenceV1(fixture)),
  ).resolves.toMatchObject({ kind: "saved", slotId: "quick" });
  const stored = await fixture.repository.read("quick");
  if (stored.health !== "valid") throw new TypeError("expected a valid Quick Save");
  return stored;
}

async function seedPendingBackupWithoutRewriteV1(
  fixture: Awaited<ReturnType<typeof fixtureV1>>,
  bytes: Uint8Array,
) {
  const result = await fixture.records.commit([
    Object.freeze({
      kind: "put" as const,
      namespace: "save" as const,
      key: createSaveMigrationBackupRecordKeyV1(storyIdV1, "quick"),
      expectedRevision: null,
      bytes: Uint8Array.from(bytes),
    }),
  ]);
  expect(result.kind).toBe("committed");
}

async function seedRewrittenQuickWithBackupV1(
  fixture: Awaited<ReturnType<typeof fixtureV1>>,
  source: SyntheticSaveRecordV1,
  replacement: SyntheticSaveRecordV1,
) {
  const stored = await seedQuickRecordV1(fixture, source);
  await expect(
    fixture.repository.rewriteWithMigrationBackup(
      "quick",
      Object.freeze({ hostRevision: stored.hostRevision, bytes: stored.bytes }),
      replacement,
      await ownedFenceV1(fixture),
    ),
  ).resolves.toMatchObject({ kind: "saved", slotId: "quick" });
  const backup = await fixture.repository.readMigrationBackup("quick");
  if (backup.health !== "stored") throw new TypeError("expected a pending migration backup");
  return Object.freeze({ source: stored, backup });
}

async function corruptAutoCurrentV1(fixture: Awaited<ReturnType<typeof fixtureV1>>) {
  const currentKey = createSaveSlotRecordKeyV1(storyIdV1, "auto.current");
  const current = await fixture.records.read("save", currentKey);
  if (current === null) throw new TypeError("missing Auto current");
  await fixture.records.commit([
    {
      kind: "put",
      namespace: "save",
      key: currentKey,
      expectedRevision: current.revision,
      bytes: textEncoderV1.encode("corrupt"),
    },
  ]);
}

describe("PersistenceServiceV1", () => {
  it("fences every mutable player ingress while preserving exact internal Auto capture", async () => {
    const initialLineage = lineageV1(1, provenanceV1().resolved.simulationDigest);
    const fixture = await fixtureV1({ initialLineage });

    fencePersistencePlayerMutationsInternalV1(fixture.service);
    fencePersistencePlayerMutationsInternalV1(fixture.service);
    expect(fixture.service).not.toHaveProperty("fencePlayerMutations");

    fixture.service.captureAutoSave(snapshotV1(3));
    fixture.service.establishAnchor(snapshotV1(4), Object.freeze([]));
    await fixture.service.autoSaveIdle();
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "empty",
    });
    expect(fixture.service.getSimulationLineage()).toEqual(initialLineage);

    for (
      const operation of [
        fixture.service.port.upgradeSave("quick"),
        fixture.service.port.reanchorSave("quick"),
        fixture.service.port.restoreBackup("quick"),
        fixture.service.port.exportBackup("quick"),
        fixture.service.port.discardBackup("quick"),
        fixture.service.port.save("quick"),
        fixture.service.port.annotateSave("quick", "blocked"),
        fixture.service.port.load("quick"),
        fixture.service.port.clear("quick"),
        fixture.service.port.importSave(Uint8Array.of(1)),
      ]
    ) {
      await expect(operation).resolves.toEqual({
        kind: "faulted",
        code: "runtime_disposed",
      });
    }
    for (
      const operation of [
        fixture.service.port.lease.requestHandoff(),
        fixture.service.port.lease.approveHandoff("handoff.persistence-service-test" as never),
        fixture.service.port.lease.takeOver(),
        fixture.service.port.lease.release(),
      ]
    ) {
      await expect(operation).resolves.toEqual({
        kind: "rejected",
        code: "conflict",
      });
    }

    await expect(
      captureAutoSaveWithReceiptInternalV1(fixture.service, fixture.session.getCurrentSnapshot()),
    ).resolves.toEqual({ kind: "saved" });
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 0 } },
    });
  });

  it("joins an in-flight exact Snapshot and never rotates the same verified Auto Save twice", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await fixture.session.dispatch({ kind: "increment" });
    await delayed.waitUntilWriteStarts();
    const snapshot = fixture.session.getCurrentSnapshot();
    const exact = captureAutoSaveWithReceiptInternalV1(fixture.service, snapshot);
    delayed.releaseWrites();

    await expect(exact).resolves.toEqual({ kind: "saved" });
    await expect(captureAutoSaveWithReceiptInternalV1(fixture.service, snapshot)).resolves.toEqual({
      kind: "saved",
    });
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: {
        recordRevision: 1,
        snapshot: { commandSequence: 1 },
      },
    });
    await expect(fixture.repository.read("auto.previous")).resolves.toMatchObject({
      health: "empty",
    });
  });

  it("joins the current anchor repair without rotating the repaired Snapshot twice", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await fixture.session.dispatch({ kind: "increment" });
    await delayed.waitUntilWriteStarts();
    const anchor = snapshotV1(0);
    fixture.service.establishAnchor(anchor, Object.freeze([]));
    fencePersistencePlayerMutationsInternalV1(fixture.service);
    const exact = captureAutoSaveWithReceiptInternalV1(fixture.service, anchor);
    delayed.releaseWrites();

    await expect(exact).resolves.toEqual({ kind: "saved" });
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: {
        recordRevision: 2,
        snapshot: { commandSequence: 0 },
      },
    });
    await expect(fixture.repository.read("auto.previous")).resolves.toMatchObject({
      health: "valid",
      record: {
        recordRevision: 1,
        snapshot: { commandSequence: 1 },
      },
    });
  });

  it("never reuses a verified Auto receipt after its lease fence is released", async () => {
    const fixture = await fixtureV1();
    const snapshot = fixture.session.getCurrentSnapshot();

    await expect(captureAutoSaveWithReceiptInternalV1(fixture.service, snapshot)).resolves.toEqual({
      kind: "saved",
    });
    await expect(fixture.service.port.lease.release()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "unowned" },
    });
    fencePersistencePlayerMutationsInternalV1(fixture.service);

    await expect(captureAutoSaveWithReceiptInternalV1(fixture.service, snapshot)).resolves.toEqual({
      kind: "failed",
      result: { kind: "rejected", code: "unavailable" },
    });
  });

  it("never joins an in-flight Auto attempt captured under an older lease fence", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await fixture.session.dispatch({ kind: "increment" });
    await delayed.waitUntilWriteStarts();
    const snapshot = fixture.session.getCurrentSnapshot();
    await expect(fixture.service.port.lease.release()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "unowned", fencingToken: 1 },
    });
    await expect(fixture.service.port.lease.takeOver()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "owned", fencingToken: 2 },
    });
    fencePersistencePlayerMutationsInternalV1(fixture.service);
    const exact = captureAutoSaveWithReceiptInternalV1(fixture.service, snapshot);
    delayed.releaseWrites();

    await expect(exact).resolves.toEqual({ kind: "saved" });
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: {
        recordRevision: 1,
        snapshot: { commandSequence: 1 },
      },
    });
    await expect(fixture.repository.read("auto.previous")).resolves.toMatchObject({
      health: "empty",
    });
  });

  it("orders a fenced exact Auto capture after a pre-fence clear already on the physical tail", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await fixture.session.dispatch({ kind: "increment" });
    await delayed.waitUntilWriteStarts();
    const clear = fixture.service.port.clear("auto.current");
    fencePersistencePlayerMutationsInternalV1(fixture.service);
    const exact = captureAutoSaveWithReceiptInternalV1(
      fixture.service,
      fixture.session.getCurrentSnapshot(),
    );
    let exactSettled = false;
    void exact.then(() => {
      exactSettled = true;
    });
    await Promise.resolve();
    expect(exactSettled).toBe(false);

    delayed.releaseWrites();
    await expect(clear).resolves.toEqual({
      kind: "cleared",
      slotId: "auto.current",
    });
    await expect(exact).resolves.toEqual({ kind: "saved" });
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 1 } },
    });
  });

  it("joins a pending Auto attempt that is physically ordered after a successful clear", async () => {
    const delayed = createDelayedSaveStoreV1();
    const autoSequences: number[] = [];
    const fixture = await fixtureV1({
      records: delayed.records,
      decorateRepository(repository) {
        return Object.freeze({
          ...repository,
          writeAuto(
            record: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writeAuto"]>[0],
            fence: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writeAuto"]>[1],
          ) {
            autoSequences.push(record.snapshot.commandSequence);
            return repository.writeAuto(record, fence);
          },
        });
      },
    });
    await expect(
      captureAutoSaveWithReceiptInternalV1(fixture.service, fixture.session.getCurrentSnapshot()),
    ).resolves.toEqual({ kind: "saved" });
    delayed.blockSaveWrites();

    await fixture.session.dispatch({ kind: "increment" });
    await delayed.waitUntilWriteStarts();
    await fixture.session.dispatch({ kind: "increment" });
    const current = fixture.session.getCurrentSnapshot();
    const clear = fixture.service.port.clear("auto.current");
    fencePersistencePlayerMutationsInternalV1(fixture.service);
    const exact = captureAutoSaveWithReceiptInternalV1(fixture.service, current);
    delayed.releaseWrites();

    await expect(clear).resolves.toEqual({
      kind: "cleared",
      slotId: "auto.current",
    });
    await expect(exact).resolves.toEqual({ kind: "saved" });
    expect(autoSequences).toEqual([0, 1, 2]);
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: {
        recordRevision: 1,
        snapshot: { commandSequence: 2 },
      },
    });
    await expect(fixture.repository.read("auto.previous")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 0 } },
    });
  });

  it("keeps a verified Auto receipt and recovery slot when clear is rejected", async () => {
    const autoSequences: number[] = [];
    const fixture = await fixtureV1({
      decorateRepository(repository) {
        return Object.freeze({
          ...repository,
          writeAuto(
            record: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writeAuto"]>[0],
            fence: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writeAuto"]>[1],
          ) {
            autoSequences.push(record.snapshot.commandSequence);
            return repository.writeAuto(record, fence);
          },
          clear(
            slot: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["clear"]>[0],
            fence: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["clear"]>[1],
          ) {
            return slot === "auto.current"
              ? Promise.resolve(
                Object.freeze({
                  kind: "rejected" as const,
                  code: "conflict" as const,
                }),
              )
              : repository.clear(slot, fence);
          },
        });
      },
    });
    await expect(
      captureAutoSaveWithReceiptInternalV1(fixture.service, fixture.session.getCurrentSnapshot()),
    ).resolves.toEqual({ kind: "saved" });
    await fixture.session.dispatch({ kind: "increment" });
    await fixture.service.autoSaveIdle();
    const current = fixture.session.getCurrentSnapshot();

    await expect(fixture.service.port.clear("auto.current")).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    fencePersistencePlayerMutationsInternalV1(fixture.service);
    await expect(captureAutoSaveWithReceiptInternalV1(fixture.service, current)).resolves.toEqual({
      kind: "saved",
    });

    expect(autoSequences).toEqual([0, 1]);
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 1 } },
    });
    await expect(fixture.repository.read("auto.previous")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 0 } },
    });
  });

  it("exposes a detached current-lineage snapshot only on the internal service", async () => {
    const initialLineage = lineageV1(1, provenanceV1().resolved.simulationDigest);
    const fixture = await fixtureV1({ initialLineage });

    const observed = fixture.service.getSimulationLineage();
    expect(observed).toEqual(initialLineage);
    expect(observed).not.toBe(initialLineage);
    expect(fixture.service.port).not.toHaveProperty("getSimulationLineage");

    fixture.service.establishAnchor(snapshotV1(3), Object.freeze([]));
    expect(fixture.service.getSimulationLineage()).toEqual([]);
    expect(observed).toEqual(initialLineage);
  });

  it("captures one exact Save and released fence before writable atomic adoption", async () => {
    const delayed = createDelayedSaveStoreV1();
    let releaseFenceCalls = 0;
    const fixture = await fixtureV1({
      records: delayed.records,
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async releaseFence(fence: Parameters<SessionLeaseV1["releaseFence"]>[0]) {
            releaseFenceCalls += 1;
            return lease.releaseFence(fence);
          },
        });
      },
    });
    delayed.blockSaveWrites();

    await fixture.session.dispatch({ kind: "increment" });
    await delayed.waitUntilWriteStarts();
    const queuedSave = fixture.service.port.save("quick");
    await fixture.session.dispatch({ kind: "increment" });
    const firstDisposal = disposePersistenceForRebootstrapInternalV1(fixture.service);
    const repeatedDisposal = disposePersistenceForRebootstrapInternalV1(fixture.service);
    let disposed = false;
    void firstDisposal.then(() => {
      disposed = true;
    });
    await Promise.resolve();
    expect(disposed).toBe(false);
    await expect(fixture.lease.getStatus()).resolves.toMatchObject({
      kind: "owned",
      fencingToken: 1,
    });

    delayed.releaseWrites();
    const handoff = await firstDisposal;
    await expect(queuedSave).resolves.toEqual({ kind: "saved", slotId: "quick" });
    expect(handoff).toMatchObject({
      save: { mediaType: "application/json" },
      lease: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    expect(digestBytes(handoff.save.bytes)).toBe(handoff.save.digest);
    expect(decodeSaveRecordV1(handoff.save.bytes, codecV1)).toMatchObject({
      kind: "decoded",
      record: { snapshot: { commandSequence: 2, state: { count: 2 } } },
    });
    await expect(repeatedDisposal).resolves.toBe(handoff);
    expect(releaseFenceCalls).toBe(1);
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 2 } },
    });
    await expect(fixture.lease.getStatus()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 1,
    });

    const replacement = await fixtureV1({
      records: delayed.records,
      ownerId: "owner.persistence-service-replacement" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
      initial: snapshotV1(9),
    });
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(replacement.service.port.lease.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await adoptPersistenceRebootstrapHandoffInternalV1(replacement.service, handoff);
    expect(replacement.session.getCurrentSnapshot()).toMatchObject({
      state: { count: 2 },
      commandSequence: 2,
    });
    await expect(replacement.lease.getStatus()).resolves.toMatchObject({
      kind: "owned",
      ownerId: "owner.persistence-service-replacement",
      fencingToken: 2,
    });
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });

    for (
      const operation of [
        fixture.service.port.save("quick"),
        fixture.service.port.clear("quick"),
        fixture.service.port.load("quick"),
        fixture.service.port.importSave(
          encodeSaveRecordV1(recordV1({ snapshot: snapshotV1(9) }), codecV1),
        ),
      ]
    ) {
      await expect(operation).resolves.toEqual({
        kind: "faulted",
        code: "runtime_disposed",
      });
    }
    await expect(fixture.service.port.lease.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await expect(fixture.service.port.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
  });

  it("installs a declared State migration through the same handoff admission", async () => {
    const records = createMemoryHostRecordStoreV1();
    const sourceProvenance = provenanceV1();
    const targetProvenance = migrationTargetProvenanceV1();
    const predecessor = await fixtureV1({ records, provenance: sourceProvenance });
    await predecessor.session.dispatch({ kind: "increment" });
    const handoff = await disposePersistenceForRebootstrapInternalV1(predecessor.service);
    let migrationCalls = 0;
    const successor = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-migrated" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
      initial: snapshotV1(9),
      provenance: targetProvenance,
      saveStateMigrations: migrationRegistryV1(
        sourceProvenance,
        targetProvenance,
        (state) => {
          migrationCalls += 1;
          return Object.freeze({ kind: "migrated" as const, state });
        },
      ),
    });

    await adoptPersistenceRebootstrapHandoffInternalV1(successor.service, handoff);
    expect(migrationCalls).toBe(1);
    expect(successor.session.getCurrentSnapshot()).toMatchObject({
      state: { count: 1 },
      rng: { cursor: 1 },
      commandSequence: 1,
    });
    expect(successor.service.getSimulationLineage()).toEqual([]);
    await successor.service.dispose();
  });

  it("installs a declared simulation adoption and anchors its successor lineage", async () => {
    const records = createMemoryHostRecordStoreV1();
    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const current = provenanceV1({ simulation: "simulation.new", patch: "new" });
    const predecessor = await fixtureV1({ records, provenance: stored });
    await predecessor.session.dispatch({ kind: "increment" });
    const handoff = await disposePersistenceForRebootstrapInternalV1(predecessor.service);
    const successor = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-adopted" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
      initial: snapshotV1(9),
      provenance: current,
      adoptionDeclarations: Object.freeze([adoptionDeclarationV1(stored, current)]),
    });

    await adoptPersistenceRebootstrapHandoffInternalV1(successor.service, handoff);
    expect(successor.session.getCurrentSnapshot()).toMatchObject({
      state: { count: 1 },
      rng: { cursor: 1 },
      commandSequence: 1,
    });
    expect(successor.service.getSimulationLineage()).toEqual([
      expect.objectContaining({
        fromSimulationDigest: stored.resolved.simulationDigest,
        toSimulationDigest: current.resolved.simulationDigest,
      }),
    ]);
    await successor.service.dispose();
  });

  it("drains an in-flight public takeover and exact-releases its newly acquired fence", async () => {
    let releaseTakeover: (() => void) | undefined;
    let markTakeoverStarted: (() => void) | undefined;
    const takeoverGate = new Promise<void>((resolve) => {
      releaseTakeover = resolve;
    });
    const takeoverStarted = new Promise<void>((resolve) => {
      markTakeoverStarted = resolve;
    });
    let takeoverCalls = 0;
    const records = createMemoryHostRecordStoreV1();
    const oldRuntime = await fixtureV1({
      records,
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async takeOver() {
            takeoverCalls += 1;
            markTakeoverStarted?.();
            await takeoverGate;
            return lease.takeOver();
          },
        });
      },
    });
    await expect(oldRuntime.service.port.lease.release()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "unowned", fencingToken: 1 },
    });

    const takeover = oldRuntime.service.port.lease.takeOver();
    await takeoverStarted;
    const disposal = disposePersistenceForRebootstrapInternalV1(oldRuntime.service);
    await expect(oldRuntime.service.port.lease.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    expect(takeoverCalls).toBe(1);
    releaseTakeover?.();

    await expect(takeover).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "owned", fencingToken: 2 },
    });
    const handoff = await resolveWithinV1(disposal);
    expect(handoff).toMatchObject({
      save: { mediaType: "application/json" },
      lease: { ownerId: ownerIdV1, fencingToken: 2 },
    });
    await expect(oldRuntime.lease.getStatus()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 2,
    });

    const successor = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-successor" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
    });
    await adoptPersistenceRebootstrapHandoffInternalV1(successor.service, handoff);
    await expect(successor.lease.getStatus()).resolves.toMatchObject({
      kind: "owned",
      ownerId: "owner.persistence-service-successor",
      fencingToken: 3,
    });
  });

  it("rejects exact handoff after an in-flight public release removed writer authority", async () => {
    let releaseResult: (() => void) | undefined;
    let markReleaseCommitted: (() => void) | undefined;
    const releaseResultGate = new Promise<void>((resolve) => {
      releaseResult = resolve;
    });
    const releaseCommitted = new Promise<void>((resolve) => {
      markReleaseCommitted = resolve;
    });
    let releaseCalls = 0;
    const records = createMemoryHostRecordStoreV1();
    const oldRuntime = await fixtureV1({
      records,
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async release() {
            releaseCalls += 1;
            const result = await lease.release();
            markReleaseCommitted?.();
            await releaseResultGate;
            return result;
          },
        });
      },
    });

    const release = oldRuntime.service.port.lease.release();
    await releaseCommitted;
    const disposal = disposePersistenceForRebootstrapInternalV1(oldRuntime.service);
    await expect(oldRuntime.service.port.lease.release()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    expect(releaseCalls).toBe(1);
    releaseResult?.();

    await expect(release).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "unowned", fencingToken: 1 },
    });
    await expect(disposal).rejects.toThrow("persistence.rebootstrap_writer_unavailable");
    await expect(oldRuntime.lease.getStatus()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 1,
    });
  });

  it("reuses a verified exact Auto write instead of issuing a stale repair", async () => {
    let releaseFirstWrite: (() => void) | undefined;
    let markFirstWriteStarted: (() => void) | undefined;
    const firstWriteGate = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    const firstWriteStarted = new Promise<void>((resolve) => {
      markFirstWriteStarted = resolve;
    });
    let autoWriteCalls = 0;
    const fixture = await fixtureV1({
      decorateRepository(repository) {
        return Object.freeze({
          ...repository,
          async writeAuto(
            ...arguments_: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writeAuto"]>
          ) {
            autoWriteCalls += 1;
            if (autoWriteCalls === 1) {
              markFirstWriteStarted?.();
              await firstWriteGate;
              return repository.writeAuto(...arguments_);
            }
            return Object.freeze({
              kind: "rejected" as const,
              code: "conflict" as const,
            });
          },
        });
      },
    });
    await fixture.session.dispatch({ kind: "increment" });
    await firstWriteStarted;

    const disposal = disposePersistenceForRebootstrapInternalV1(fixture.service);
    releaseFirstWrite?.();
    await expect(disposal).resolves.toMatchObject({
      save: { mediaType: "application/json" },
      lease: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    expect(autoWriteCalls).toBe(1);
  });

  it("fails closed without a handoff when exact lease release fails", async () => {
    const records = createMemoryHostRecordStoreV1();
    const oldRuntime = await fixtureV1({
      records,
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async releaseFence() {
            return Object.freeze({
              kind: "rejected" as const,
              code: "unavailable" as const,
            });
          },
        });
      },
    });
    await expect(disposePersistenceForRebootstrapInternalV1(oldRuntime.service)).rejects.toThrow(
      "persistence.rebootstrap_lease_release_failed",
    );
    await expect(oldRuntime.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_release_failed",
    });
    await expect(oldRuntime.service.port.save("quick")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    await expect(oldRuntime.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_release_failed",
    });
  });

  it("retains the prepared Save and advances no fence when takeover is rejected", async () => {
    const records = createMemoryHostRecordStoreV1();
    const oldRuntime = await fixtureV1({ records });
    await oldRuntime.session.dispatch({ kind: "increment" });
    const handoff = await disposePersistenceForRebootstrapInternalV1(oldRuntime.service);
    const replacement = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-replacement" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async takeOverUnowned() {
            return Object.freeze({
              kind: "rejected" as const,
              code: "conflict" as const,
            });
          },
        });
      },
    });

    await expect(
      adoptPersistenceRebootstrapHandoffInternalV1(replacement.service, handoff),
    ).rejects.toThrow("persistence.rebootstrap_lease_takeover_failed");
    await expect(replacement.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_takeover_failed",
    });
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    expect(replacement.session.getCurrentSnapshot().state.count).toBe(0);
    const retry = await disposePersistenceForRebootstrapInternalV1(replacement.service);
    expect(retry.lease).toEqual(handoff.lease);
    expect(retry.save.digest).toBe(handoff.save.digest);
    expect(retry.save.bytes).toEqual(handoff.save.bytes);
  });

  it.each(["load", "import"] as const)(
    "maps HMR-invalidated %s to runtime_disposed without replacing the Snapshot",
    async (operation) => {
      const fixture = await fixtureV1({ initial: snapshotV1(4) });
      const snapshot = fixture.session.getCurrentSnapshot();
      fixture.invalidationController.invalidateForHmr();

      const result = operation === "load"
        ? fixture.service.port.load("quick")
        : fixture.service.port.importSave(
          encodeSaveRecordV1(recordV1({ snapshot: snapshotV1(9) }), codecV1),
        );
      await expect(result).resolves.toEqual({
        kind: "faulted",
        code: "runtime_disposed",
      });
      expect(fixture.session.getCurrentSnapshot()).toBe(snapshot);
    },
  );

  it("captures Quick at accepted call time and does not make dispatch wait for storage", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({
      records: delayed.records,
      initial: snapshotV1(3),
    });
    delayed.blockSaveWrites();

    const save = fixture.service.port.save("quick");
    const dispatch = fixture.session.dispatch({ kind: "increment" });
    await expect(dispatch).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await delayed.waitUntilWriteStarts();
    delayed.releaseWrites();

    await expect(save).resolves.toEqual({ kind: "saved", slotId: "quick" });
    await expect(fixture.repository.read("quick")).resolves.toMatchObject({
      health: "valid",
      record: {
        slot: { capturedCommandSequence: 3 },
        snapshot: { commandSequence: 3 },
      },
    });
    await fixture.service.autoSaveIdle();
  });

  it("does not let an accepted Quick Save borrow a later lease fence", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await delayed.waitUntilWriteStarts();
    const quick = fixture.service.port.save("quick");
    await expect(fixture.service.port.lease.release()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "unowned", fencingToken: 1 },
    });
    await expect(fixture.service.port.lease.takeOver()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "owned", fencingToken: 2 },
    });

    delayed.releaseWrites();
    await expect(quick).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await fixture.service.autoSaveIdle();
  });

  it("does not publish an old Quick result as safely saved after a new anchor", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({
      records: delayed.records,
      initial: snapshotV1(3),
    });
    delayed.blockSaveWrites();

    const quick = fixture.service.port.save("quick");
    await delayed.waitUntilWriteStarts();
    const replacement = recordV1({ snapshot: snapshotV1(9) });
    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toEqual({
      kind: "imported",
      compatibility: "exact",
      commandSequence: 9,
    });

    delayed.releaseWrites();
    await expect(quick).resolves.toEqual({ kind: "saved", slotId: "quick" });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
    });
    expect(fixture.session.getCurrentSnapshot().commandSequence).toBe(9);
    await expect(fixture.repository.read("quick")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 3 } },
    });
  });

  it("does not report saved after the committed record loses its lease fence", async () => {
    let contender: SessionLeaseV1 | undefined;
    const fixture = await fixtureV1({
      decorateRepository(repository, _lease, records) {
        contender = createSessionLeaseV1({
          records,
          storyId: storyIdV1,
          ownerId: "owner.contender" as SessionLeaseOwnerId,
          nextHandoffRequestId: () => "handoff.contender" as never,
        });
        return Object.freeze({
          ...repository,
          async writePlayer(
            slotId: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writePlayer"]>[0],
            record: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writePlayer"]>[1],
            fence: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["writePlayer"]>[2],
          ) {
            const result = await repository.writePlayer(slotId, record, fence);
            if (result.kind === "saved") await contender?.takeOver();
            return result;
          },
        });
      },
    });

    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
    });
  });

  it("preserves degraded storage identity when Save verification becomes unavailable", async () => {
    let unavailable = false;
    const fixture = await fixtureV1({
      decorateRepository(repository) {
        return Object.freeze({
          ...repository,
          async read(slotId: Parameters<typeof repository.read>[0]) {
            if (unavailable) {
              return Object.freeze({
                health: "unavailable" as const,
                slotId,
                hostRevision: null,
                record: null,
                code: "indexeddb.quota_exceeded",
              });
            }
            return repository.read(slotId);
          },
          async writePlayer(
            slotId: Parameters<typeof repository.writePlayer>[0],
            record: Parameters<typeof repository.writePlayer>[1],
            fence: Parameters<typeof repository.writePlayer>[2],
          ) {
            const result = await repository.writePlayer(slotId, record, fence);
            unavailable = true;
            return result;
          },
        });
      },
    });

    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      available: true,
      safelySavedCommandSequence: null,
      lastFailureCode: "indexeddb.quota_exceeded",
    });
  });

  it("detects semantically equivalent physical-byte changes after a Save commit", async () => {
    const fixture = await fixtureV1({
      records: createSemanticallyTamperingStoreV1(),
    });

    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    const stored = await fixture.repository.read("quick");
    if (stored.health !== "valid") {
      throw new TypeError("expected a valid tampered Save");
    }
    expect(stored.bytes).not.toEqual(encodeSaveRecordV1(stored.record, codecV1));
    await expect(fixture.service.port.exportSave("quick")).resolves.toMatchObject({
      kind: "exported",
      slotId: "quick",
      file: { bytes: stored.bytes },
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
    });
  });

  it("marks a valid previous Auto slot as recovery-only when current is corrupt", async () => {
    const fixture = await fixtureV1();
    const fence = await ownedFenceV1(fixture);
    await fixture.repository.writeAuto(recordV1({ snapshot: snapshotV1(1) }), fence);
    await fixture.repository.writeAuto(recordV1({ snapshot: snapshotV1(2) }), fence);
    await corruptAutoCurrentV1(fixture);

    const summaries = await fixture.service.port.listSlots();
    expect(summaries.map(({ slotId }) => slotId)).toEqual([
      "auto.current",
      "auto.previous",
      "quick",
      "manual.1",
      "manual.2",
      "manual.3",
      "manual.4",
      "manual.5",
      "manual.6",
      "manual.7",
      "manual.8",
    ]);
    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slotId: "auto.current", health: "invalid" }),
        expect.objectContaining({
          slotId: "auto.previous",
          health: "recovery_candidate",
        }),
      ]),
    );
    expect(fixture.session.getCurrentSnapshot().commandSequence).toBe(0);
  });

  it("honors a configured manual slot count and rejects out-of-range slots", async () => {
    const fixture = await fixtureV1({ manualSaveSlotCount: 2 });
    await expect(fixture.service.port.listSlots()).resolves.toMatchObject([
      { slotId: "auto.current" },
      { slotId: "auto.previous" },
      { slotId: "quick" },
      { slotId: "manual.1" },
      { slotId: "manual.2" },
    ]);
    await expect(fixture.service.port.save("manual.2")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.2",
    });
    const invalidSlot = Object.freeze({
      kind: "faulted",
      code: "persistence.invalid_slot",
    });
    await expect(fixture.service.port.save("manual.3")).resolves.toEqual(invalidSlot);
    await expect(fixture.service.port.load("manual.3")).resolves.toEqual(invalidSlot);
    await expect(fixture.service.port.clear("manual.3")).resolves.toEqual(invalidSlot);
    await expect(fixture.service.port.exportSave("manual.3")).resolves.toEqual(invalidSlot);
    for (
      const operation of [
        fixture.service.port.upgradeSave("manual.3"),
        fixture.service.port.reanchorSave("manual.3"),
        fixture.service.port.restoreBackup("manual.3"),
        fixture.service.port.exportBackup("manual.3"),
        fixture.service.port.discardBackup("manual.3"),
      ]
    ) {
      await expect(operation).resolves.toEqual(invalidSlot);
    }
    // Writes never target autosave slots even through untyped callers.
    await expect(fixture.service.port.save("auto.current" as unknown as "quick")).resolves.toEqual(
      invalidSlot,
    );

    const noManualSlots = await fixtureV1({ manualSaveSlotCount: 0 });
    await expect(noManualSlots.service.port.listSlots()).resolves.toMatchObject([
      { slotId: "auto.current" },
      { slotId: "auto.previous" },
      { slotId: "quick" },
    ]);
    await expect(noManualSlots.service.port.save("manual.1")).resolves.toEqual(invalidSlot);
    const noManualExport = decodeSaveRecordV1(
      (await noManualSlots.service.port.exportCurrentSave()).bytes,
      codecV1,
    );
    expect(noManualExport).toMatchObject({
      kind: "decoded",
      record: { slot: { slotId: "quick", writeReason: "quick" } },
    });
    await expect(fixtureV1({ manualSaveSlotCount: 100 })).rejects.toThrow(
      "invalid manual Save slot count",
    );
  });

  it("stamps records for diagnostics; import never reads the stamp", async () => {
    const stampA: VersionStampV1 = Object.freeze({
      applicationVersion: "1.2.0",
      applicationCommit: "abc1234",
      engineVersion: "0.4.2",
      engineCommit: "def5678",
    });
    const stampB: VersionStampV1 = Object.freeze({
      applicationVersion: "9.9.9",
      applicationCommit: "fffffff",
      engineVersion: null,
      engineCommit: null,
    });

    // Written records and exports carry one normalized capture-origin
    // stamp for the lifetime of the service.
    let collectorCalls = 0;
    const writer = await fixtureV1({
      collectVersionStamp: () => {
        collectorCalls += 1;
        return { ...stampA };
      },
    });
    const exported = decodeSaveRecordV1(
      (await writer.service.port.exportCurrentSave()).bytes,
      codecV1,
    );
    expect(exported).toMatchObject({
      kind: "decoded",
      record: { versionStamp: stampA },
    });
    expect(collectorCalls).toBe(1);
    await expect(writer.service.port.save("quick")).resolves.toMatchObject({
      kind: "saved",
    });
    const storedExport = await writer.service.port.exportSave("quick");
    if (storedExport.kind !== "exported") {
      throw new TypeError("expected stored Save export");
    }
    expect(decodeSaveRecordV1(storedExport.file.bytes, codecV1)).toMatchObject({
      kind: "decoded",
      record: { versionStamp: stampA },
    });

    // A build with a DIFFERENT stamp imports the file untouched: the stamp
    // is diagnostic-only and never part of import compatibility.
    const reader = await fixtureV1({ collectVersionStamp: () => stampB });
    await expect(reader.service.port.importSave(storedExport.file.bytes)).resolves.toMatchObject({
      kind: "imported",
      compatibility: "exact",
    });
    const freshAfterImport = decodeSaveRecordV1(
      (await reader.service.port.exportCurrentSave()).bytes,
      codecV1,
    );
    expect(freshAfterImport).toMatchObject({
      kind: "decoded",
      record: { versionStamp: stampB },
    });
    expect(collectorCalls).toBe(1);

    // Headless default (no injected global): all-null stamp is omitted, so
    // pre-stamp record bytes stay byte-identical.
    const bare = await fixtureV1();
    const plain = decodeSaveRecordV1((await bare.service.port.exportCurrentSave()).bytes, codecV1);
    expect(plain.kind).toBe("decoded");
    if (plain.kind === "decoded") {
      expect(plain.record).not.toHaveProperty("versionStamp");
    }
  });

  it("normalizes a malformed or failing stamp collector before lease acquisition", async () => {
    const events: string[] = [];
    const malformedStamp = { applicationVersion: 42 } as unknown as VersionStampV1;
    const malformed = await fixtureV1({
      collectVersionStamp: () => {
        events.push("collect");
        return malformedStamp;
      },
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async acquireInitial() {
            events.push("acquire");
            return lease.acquireInitial();
          },
        });
      },
    });
    expect(events).toEqual(["collect", "acquire"]);
    const malformedExport = decodeSaveRecordV1(
      (await malformed.service.port.exportCurrentSave()).bytes,
      codecV1,
    );
    expect(malformedExport).toMatchObject({ kind: "decoded" });
    if (malformedExport.kind === "decoded") {
      expect(malformedExport.record).not.toHaveProperty("versionStamp");
    }

    const throwing = await fixtureV1({
      collectVersionStamp: () => {
        throw new Error("diagnostic collector failed");
      },
    });
    await expect(throwing.service.port.lease.getStatus()).resolves.toMatchObject({
      kind: "owned",
    });
    const throwingExport = decodeSaveRecordV1(
      (await throwing.service.port.exportCurrentSave()).bytes,
      codecV1,
    );
    expect(throwingExport).toMatchObject({ kind: "decoded" });
    if (throwingExport.kind === "decoded") {
      expect(throwingExport.record).not.toHaveProperty("versionStamp");
    }
  });

  it("preserves capture-origin stamps through annotation rewrite and Auto rotation", async () => {
    const stampA: VersionStampV1 = Object.freeze({
      applicationVersion: "1.0.0",
      applicationCommit: "a".repeat(40),
      engineVersion: "0.4.2",
      engineCommit: "b".repeat(40),
    });
    const stampB: VersionStampV1 = Object.freeze({
      applicationVersion: "2.0.0",
      applicationCommit: "c".repeat(40),
      engineVersion: "0.4.3",
      engineCommit: "d".repeat(40),
    });
    const records = createMemoryHostRecordStoreV1();
    let firstCollectorCalls = 0;
    let secondCollectorCalls = 0;
    const first = await fixtureV1({
      records,
      ownerId: "owner.stamp-a" as SessionLeaseOwnerId,
      collectVersionStamp: () => {
        firstCollectorCalls += 1;
        return stampA;
      },
    });
    await expect(first.service.port.save("quick")).resolves.toMatchObject({
      kind: "saved",
    });
    await first.session.dispatch({ kind: "increment" });
    await first.service.autoSaveIdle();
    const handoff = await disposePersistenceForRebootstrapInternalV1(first.service);
    expect(handoff).toMatchObject({
      save: { mediaType: "application/json" },
      lease: { fencingToken: 1 },
    });

    const second = await fixtureV1({
      records,
      ownerId: "owner.stamp-b" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
      collectVersionStamp: () => {
        secondCollectorCalls += 1;
        return stampB;
      },
    });
    await adoptPersistenceRebootstrapHandoffInternalV1(second.service, handoff);
    await expect(second.service.port.annotateSave("quick", "kept origin")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    const rewritten = await second.repository.read("quick");
    expect(rewritten).toMatchObject({
      health: "valid",
      record: { versionStamp: stampA },
    });
    const rewrittenExport = await second.service.port.exportSave("quick");
    if (rewrittenExport.kind !== "exported") {
      throw new TypeError("expected rewritten Save export");
    }
    expect(decodeSaveRecordV1(rewrittenExport.file.bytes, codecV1)).toMatchObject({
      kind: "decoded",
      record: { versionStamp: stampA },
    });

    await second.session.dispatch({ kind: "increment" });
    await second.service.autoSaveIdle();
    expect(await second.repository.read("auto.current")).toMatchObject({
      health: "valid",
      record: { versionStamp: stampB },
    });
    expect(await second.repository.read("auto.previous")).toMatchObject({
      health: "valid",
      record: { versionStamp: stampA },
    });
    expect(firstCollectorCalls).toBe(1);
    expect(secondCollectorCalls).toBe(1);
  });

  it("offers Auto recovery only from a fully runnable previous Save", async () => {
    const currentProvenance = provenanceV1();
    const inspectFixture = await fixtureV1({ provenance: currentProvenance });
    const inspectFence = await ownedFenceV1(inspectFixture);
    await inspectFixture.repository.writeAuto(
      recordV1({
        snapshot: snapshotV1(1),
        provenance: provenanceV1({ engine: "engine.other" }),
      }),
      inspectFence,
    );
    await inspectFixture.repository.writeAuto(
      recordV1({ snapshot: snapshotV1(2), provenance: currentProvenance }),
      inspectFence,
    );
    await corruptAutoCurrentV1(inspectFixture);

    await expect(inspectFixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slotId: "auto.previous", health: "valid" }),
      ]),
    );

    const runnableFixture = await fixtureV1({ provenance: currentProvenance });
    const runnableFence = await ownedFenceV1(runnableFixture);
    await runnableFixture.repository.writeAuto(
      recordV1({ snapshot: snapshotV1(3), provenance: currentProvenance }),
      runnableFence,
    );
    await runnableFixture.repository.writeAuto(
      recordV1({
        snapshot: snapshotV1(4),
        provenance: provenanceV1({ engine: "engine.other" }),
      }),
      runnableFence,
    );

    await expect(runnableFixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slotId: "auto.current", health: "valid" }),
        expect.objectContaining({
          slotId: "auto.previous",
          health: "recovery_candidate",
        }),
      ]),
    );

    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const adoptedCurrent = provenanceV1({
      simulation: "simulation.new",
      patch: "new",
    });
    const lineageFixture = await fixtureV1({
      provenance: adoptedCurrent,
      adoptionDeclarations: Object.freeze([adoptionDeclarationV1(stored, adoptedCurrent)]),
    });
    const lineageFence = await ownedFenceV1(lineageFixture);
    await lineageFixture.repository.writeAuto(
      recordV1({
        snapshot: snapshotV1(16),
        provenance: stored,
        lineage: lineageV1(16, stored.resolved.simulationDigest),
      }),
      lineageFence,
    );
    await lineageFixture.repository.writeAuto(
      recordV1({ snapshot: snapshotV1(17), provenance: adoptedCurrent }),
      lineageFence,
    );
    await corruptAutoCurrentV1(lineageFixture);

    await expect(lineageFixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "auto.previous",
          health: "valid",
          warningCodes: ["compatibility.lineage_limit"],
        }),
      ]),
    );

    const limitedCurrentFixture = await fixtureV1({
      provenance: adoptedCurrent,
      adoptionDeclarations: Object.freeze([adoptionDeclarationV1(stored, adoptedCurrent)]),
    });
    const limitedCurrentFence = await ownedFenceV1(limitedCurrentFixture);
    await limitedCurrentFixture.repository.writeAuto(
      recordV1({ snapshot: snapshotV1(18), provenance: adoptedCurrent }),
      limitedCurrentFence,
    );
    await limitedCurrentFixture.repository.writeAuto(
      recordV1({
        snapshot: snapshotV1(16),
        provenance: stored,
        lineage: lineageV1(16, stored.resolved.simulationDigest),
      }),
      limitedCurrentFence,
    );

    await expect(limitedCurrentFixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "auto.current",
          health: "valid",
          warningCodes: ["compatibility.lineage_limit"],
        }),
        expect.objectContaining({
          slotId: "auto.previous",
          health: "recovery_candidate",
        }),
      ]),
    );
  });

  it("repairs a stale in-flight Auto write after an authoritative anchor", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await delayed.waitUntilWriteStarts();
    const anchorSnapshot = snapshotV1(0);
    await expect(
      fixture.runtimeControl.enqueueAuthoritative<
        { readonly kind: "anchored" } | { readonly kind: "faulted" }
      >(
        async () => {
          return Object.freeze({
            kind: "replace" as const,
            snapshot: anchorSnapshot,
            result: Object.freeze({ kind: "anchored" as const }),
            anchor: "replace_replay_base" as const,
          });
        },
        () => Object.freeze({ kind: "faulted" as const }),
        (snapshot) => fixture.service.establishAnchor(snapshot, Object.freeze([])),
      ),
    ).resolves.toEqual({ kind: "anchored" });

    delayed.releaseWrites();
    await fixture.service.autoSaveIdle();
    await expect(fixture.repository.read("auto.current")).resolves.toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 0 } },
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      busy: false,
      safelySavedCommandSequence: 0,
    });
  });

  it("stays busy until a rejected anchor repair is superseded successfully", async () => {
    const delayed = createDelayedSaveStoreV1();
    const fixture = await fixtureV1({ records: delayed.records });
    delayed.blockSaveWrites();

    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await delayed.waitUntilWriteStarts();
    const replacement = recordV1({ snapshot: snapshotV1(9) });
    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toMatchObject({ kind: "imported", commandSequence: 9 });
    await fixture.service.port.lease.release();
    await fixture.service.port.lease.takeOver();
    delayed.releaseWrites();

    let status = await fixture.service.port.getStatus();
    for (let attempt = 0; attempt < 20 && status.lastFailureCode !== "conflict"; attempt += 1) {
      await Promise.resolve();
      status = await fixture.service.port.getStatus();
    }
    expect(status).toMatchObject({ busy: true, lastFailureCode: "conflict" });
    let idle = false;
    const idlePromise = fixture.service.autoSaveIdle().then(() => {
      idle = true;
    });
    await Promise.resolve();
    expect(idle).toBe(false);

    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await idlePromise;
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      busy: false,
      safelySavedCommandSequence: 10,
      lastFailureCode: null,
    });
  });

  it("loads an exact Save with its integrity and lineage without rewriting the slot", async () => {
    const fixture = await fixtureV1();
    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await fixture.service.autoSaveIdle();
    const replayBaseBefore = fixture.commandLog.replayBase();
    expect(fixture.commandLog.entries()).toHaveLength(1);
    const loadedIntegrity = runIntegrityV1Schema.parse({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 7,
      reasons: [
        {
          kind: "fixture_anchor",
          fixtureId: "fixture.loaded",
          sequence: 7,
        },
      ],
    });
    const lineage = lineageV1(1, provenanceV1().resolved.simulationDigest);
    const saved = recordV1({
      snapshot: snapshotV1(7, loadedIntegrity),
      lineage,
    });
    await fixture.repository.writePlayer("quick", saved, await ownedFenceV1(fixture));
    const before = await saveRecordsV1(fixture.records);

    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "loaded",
      compatibility: "exact",
      commandSequence: 7,
    });
    const loaded = fixture.session.getCurrentSnapshot();
    expect(loaded).toEqual(saved.snapshot);
    expect(loaded.integrity).toEqual(loadedIntegrity);
    expect(fixture.commandLog.entries()).toEqual([]);
    expect(fixture.commandLog.replayBase()).toBe(loaded);
    expect(fixture.commandLog.replayBase()).not.toBe(replayBaseBefore);
    expect(fixture.commandLog.replayBaseStateDigest()).toBe(
      digestCanonical("sillymaker:state:v1", loaded),
    );
    expect(fixture.service.getSimulationLineage()).toEqual(lineage);
    expect(await saveRecordsV1(fixture.records)).toEqual(before);
    const exported = await fixture.service.port.exportCurrentSave();
    const decoded = decodeSaveRecordV1(exported.bytes, codecV1);
    expect(decoded).toMatchObject({
      kind: "decoded",
      record: { simulationLineage: lineage },
    });
  });

  it("projects ambiguous adoption as invalid inspection without mutating authority", async () => {
    const fixture = await fixtureV1({
      classifyCompatibility: () =>
        Object.freeze({
          kind: "rejected" as const,
          code: "compatibility.adoption_ambiguous" as const,
        }),
    });
    const saved = recordV1({ snapshot: snapshotV1(7) });
    await fixture.repository.writePlayer("quick", saved, await ownedFenceV1(fixture));
    const before = fixture.session.getCurrentSnapshot();
    const recordsBefore = await saveRecordsV1(fixture.records);

    await expect(fixture.service.port.inspectSave("quick")).resolves.toEqual({
      kind: "rejected",
      slotId: "quick",
      code: "invalid_record",
      diagnostics: {
        codes: ["compatibility.adoption_ambiguous"],
        migrationAttempt: null,
        migrationReasonCode: null,
        storedStateContractRevision: null,
        currentStateContractRevision: null,
      },
    });
    expect(fixture.session.getCurrentSnapshot()).toBe(before);
    expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
  });

  describe("M3.4 migration and recovery operations", () => {
    it("reports fresh player-safe backup status without touching lease, records, Session, or status", async () => {
      const fixture = await fixtureV1({ initial: snapshotV1(22) });
      const sessionBefore = fixture.session.getCurrentSnapshot();
      const lineageBefore = fixture.service.getSimulationLineage();
      const statusBefore = await fixture.service.port.getStatus();
      const leasesBefore = await leaseRecordsV1(fixture.records);
      const recordsBefore = await saveRecordsV1(fixture.records);

      const empty = await fixture.service.port.inspectBackup("quick");
      expect(empty).toEqual({ kind: "rejected", slotId: "quick", code: "empty_backup" });
      expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);

      const sourceBytes = encodeSaveRecordV1(
        recordV1({ snapshot: snapshotV1(2), slotId: "quick" }),
        codecV1,
      );
      await seedPendingBackupWithoutRewriteV1(fixture, sourceBytes);
      const recordsWithBackup = await saveRecordsV1(fixture.records);
      const available = await fixture.service.port.inspectBackup("quick");
      expect(available).toEqual({ kind: "available", slotId: "quick" });
      expect(available).not.toHaveProperty("bytes");
      expect(available).not.toHaveProperty("hostRevision");
      expect(available).not.toHaveProperty("key");
      expect(await saveRecordsV1(fixture.records)).toEqual(recordsWithBackup);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);

      const backupKey = createSaveMigrationBackupRecordKeyV1(storyIdV1, "quick");
      const pending = await fixture.records.read("save", backupKey);
      if (pending === null) throw new TypeError("expected pending backup");
      await fixture.records.commit([
        Object.freeze({
          kind: "put" as const,
          namespace: "save" as const,
          key: backupKey,
          expectedRevision: pending.revision,
          bytes: textEncoderV1.encode("corrupt"),
        }),
      ]);
      const invalidRecords = await saveRecordsV1(fixture.records);
      const invalid = await fixture.service.port.inspectBackup("quick");
      expect(invalid).toEqual({
        kind: "rejected",
        slotId: "quick",
        code: "invalid_backup",
      });
      expect(await saveRecordsV1(fixture.records)).toEqual(invalidRecords);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
      const corrupted = await fixture.records.read("save", backupKey);
      if (corrupted === null) throw new TypeError("expected corrupt backup");
      await fixture.records.commit([
        Object.freeze({
          kind: "delete" as const,
          namespace: "save" as const,
          key: backupKey,
          expectedRevision: corrupted.revision,
        }),
      ]);
      const emptyAgain = await fixture.service.port.inspectBackup("quick");
      expect(emptyAgain).toEqual({
        kind: "rejected",
        slotId: "quick",
        code: "empty_backup",
      });

      expect(recordsWithBackup).toHaveLength(1);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
      expect(fixture.session.getCurrentSnapshot()).toBe(sessionBefore);
      expect(fixture.service.getSimulationLineage()).toBe(lineageBefore);
      expect(fixture.session.getStatus()).toBe("ready");
      await expect(fixture.service.port.getStatus()).resolves.toEqual(statusBefore);
    });

    it("classifies invalid slots, unavailable reads, unclassified faults, and disposal", async () => {
      const invalidSlot = await fixtureV1({ manualSaveSlotCount: 0 });
      const invalid = await invalidSlot.service.port.inspectBackup("manual.1");
      expect(invalid).toEqual({
        kind: "faulted",
        slotId: null,
        code: "persistence.invalid_slot",
      });

      const unavailable = await fixtureV1({ records: unavailableStoreV1() });
      const unavailableResult = await unavailable.service.port.inspectBackup("quick");
      expect(unavailableResult).toEqual({
        kind: "rejected",
        slotId: "quick",
        code: "unavailable",
      });

      const unexpected = new Error("unclassified backup read fault");
      const throwing = await fixtureV1({
        decorateRepository(repository) {
          return Object.freeze({
            ...repository,
            async readMigrationBackup(): Promise<never> {
              throw unexpected;
            },
          });
        },
      });
      const faulted = await throwing.service.port.inspectBackup("quick");
      expect(faulted).toEqual({
        kind: "faulted",
        slotId: "quick",
        code: "persistence.unexpected",
      });

      const disposed = await fixtureV1();
      await disposed.service.dispose();
      const disposedResult = await disposed.service.port.inspectBackup("quick");
      expect(disposedResult).toEqual({
        kind: "faulted",
        slotId: "quick",
        code: "runtime_disposed",
      });
    });

    it("keeps 10,000 empty backup inspections bounded and mutation-free", {
      timeout: 30_000,
    }, async () => {
      const fixture = await fixtureV1({ initial: snapshotV1(11) });
      const recordsBefore = await saveRecordsV1(fixture.records);
      const leasesBefore = await leaseRecordsV1(fixture.records);
      const sessionBefore = fixture.session.getCurrentSnapshot();
      const statusBefore = await fixture.service.port.getStatus();
      for (let attempt = 0; attempt < 10_000; attempt += 1) {
        expect(await fixture.service.port.inspectBackup("quick")).toEqual({
          kind: "rejected",
          slotId: "quick",
          code: "empty_backup",
        });
      }
      expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
      expect(fixture.session.getCurrentSnapshot()).toBe(sessionBefore);
      await expect(fixture.service.port.getStatus()).resolves.toEqual(statusBefore);
    });

    it("upgrades a freshly reread migration-only Save with an exact raw backup and no live install", async () => {
      const sourceProvenance = provenanceV1();
      const targetProvenance = migrationTargetProvenanceV1();
      let migrationCalls = 0;
      const fixture = await fixtureV1({
        provenance: targetProvenance,
        saveStateMigrations: migrationRegistryV1(sourceProvenance, targetProvenance, (state) => {
          migrationCalls += 1;
          return Object.freeze({ kind: "migrated" as const, state });
        }),
      });
      const source = await seedQuickRecordV1(
        fixture,
        recordV1({ snapshot: snapshotV1(7), provenance: sourceProvenance, slotId: "quick" }),
      );
      const liveSnapshot = fixture.session.getCurrentSnapshot();
      const liveLineage = fixture.service.getSimulationLineage();
      const sessionStatus = fixture.session.getStatus();
      const persistenceStatus = await fixture.service.port.getStatus();

      await expect(fixture.service.port.inspectSave("quick")).resolves.toMatchObject({
        kind: "migration_required",
        slotId: "quick",
      });
      expect(migrationCalls).toBe(1);
      await expect(fixture.service.port.upgradeSave("quick")).resolves.toEqual({
        kind: "upgraded",
        slotId: "quick",
        compatibility: "exact",
      });
      expect(migrationCalls).toBe(2);

      const target = await fixture.repository.read("quick");
      expect(target).toMatchObject({
        health: "valid",
        hostRevision: 2,
        record: {
          recordRevision: 2,
          provenance: targetProvenance,
          simulationLineage: [],
          snapshot: { commandSequence: 7 },
        },
      });
      const backup = await fixture.repository.readMigrationBackup("quick");
      expect(backup).toMatchObject({ health: "stored", bytes: source.bytes });
      const leaseBeforeExport = await leaseRecordsV1(fixture.records);
      const firstExport = await fixture.service.port.exportBackup("quick");
      expect(firstExport).toMatchObject({
        kind: "exported",
        slotId: "quick",
        file: {
          mediaType: "application/json",
          digest: digestBytes(source.bytes),
          bytes: source.bytes,
        },
      });
      if (firstExport.kind !== "exported") throw new TypeError("expected backup export");
      firstExport.file.bytes[0] = firstExport.file.bytes[0] === 0x7b ? 0x5b : 0x7b;
      const secondExport = await fixture.service.port.exportBackup("quick");
      expect(secondExport).toMatchObject({ kind: "exported", file: { bytes: source.bytes } });
      expect(await leaseRecordsV1(fixture.records)).toEqual(leaseBeforeExport);
      expect(await fixture.repository.readMigrationBackup("quick")).toMatchObject({
        health: "stored",
        bytes: source.bytes,
      });

      expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
      expect(fixture.service.getSimulationLineage()).toBe(liveLineage);
      expect(fixture.session.getStatus()).toBe(sessionStatus);
      await expect(fixture.service.port.getStatus()).resolves.toEqual(persistenceStatus);
    });

    it("upgrades migration plus unique adoption and appends exactly one lineage entry", async () => {
      const sourceProvenance = provenanceV1({ simulation: "simulation.old", patch: "old" });
      const targetProvenance = migrationTargetProvenanceV1({ simulation: "simulation.new" });
      let migrationCalls = 0;
      const fixture = await fixtureV1({
        provenance: targetProvenance,
        adoptionDeclarations: Object.freeze([
          adoptionDeclarationV1(sourceProvenance, targetProvenance),
        ]),
        saveStateMigrations: migrationRegistryV1(sourceProvenance, targetProvenance, (state) => {
          migrationCalls += 1;
          return Object.freeze({ kind: "migrated" as const, state });
        }),
      });
      const source = await seedQuickRecordV1(
        fixture,
        recordV1({ snapshot: snapshotV1(9), provenance: sourceProvenance, slotId: "quick" }),
      );
      const liveSnapshot = fixture.session.getCurrentSnapshot();

      await expect(fixture.service.port.inspectSave("quick")).resolves.toMatchObject({
        kind: "migration_and_adoption_required",
      });
      await expect(fixture.service.port.upgradeSave("quick")).resolves.toEqual({
        kind: "upgraded",
        slotId: "quick",
        compatibility: "adopted",
      });
      expect(migrationCalls).toBe(2);
      expect(await fixture.repository.read("quick")).toMatchObject({
        health: "valid",
        record: {
          provenance: targetProvenance,
          simulationLineage: [{
            fromSimulationDigest: sourceProvenance.resolved.simulationDigest,
            toSimulationDigest: targetProvenance.resolved.simulationDigest,
            viaSimulationPatchSetDigest: targetProvenance.resolved.patchSet.simulationDigest,
            adoptedAtCommandSequence: 9,
          }],
        },
      });
      expect(await fixture.repository.readMigrationBackup("quick")).toMatchObject({
        health: "stored",
        bytes: source.bytes,
      });
      expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
      expect(fixture.service.getSimulationLineage()).toEqual([]);
    });

    it("never trusts inspection state and checks a pending backup before invoking migration", async () => {
      const sourceProvenance = provenanceV1();
      const targetProvenance = migrationTargetProvenanceV1();
      let migrationCalls = 0;
      const registry = migrationRegistryV1(sourceProvenance, targetProvenance, (state) => {
        migrationCalls += 1;
        return Object.freeze({ kind: "migrated" as const, state });
      });
      const stale = await fixtureV1({
        provenance: targetProvenance,
        saveStateMigrations: registry,
      });
      const staleSource = await seedQuickRecordV1(
        stale,
        recordV1({ snapshot: snapshotV1(3), provenance: sourceProvenance, slotId: "quick" }),
      );
      await expect(stale.service.port.inspectSave("quick")).resolves.toMatchObject({
        kind: "migration_required",
      });
      expect(migrationCalls).toBe(1);
      await expect(
        stale.repository.rewritePlayer(
          "quick",
          Object.freeze({
            hostRevision: staleSource.hostRevision,
            bytes: staleSource.bytes,
          }),
          recordV1({ snapshot: snapshotV1(4), provenance: targetProvenance, slotId: "quick" }),
          await ownedFenceV1(stale),
        ),
      ).resolves.toMatchObject({ kind: "saved" });
      await expect(stale.service.port.upgradeSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "not_required",
      });
      expect(migrationCalls).toBe(1);
      await expect(stale.repository.readMigrationBackup("quick")).resolves.toMatchObject({
        health: "empty",
      });

      const pending = await fixtureV1({
        provenance: targetProvenance,
        saveStateMigrations: registry,
      });
      const pendingSource = await seedQuickRecordV1(
        pending,
        recordV1({ snapshot: snapshotV1(5), provenance: sourceProvenance, slotId: "quick" }),
      );
      await seedPendingBackupWithoutRewriteV1(pending, pendingSource.bytes);
      const recordsBefore = await saveRecordsV1(pending.records);
      const leasesBefore = await leaseRecordsV1(pending.records);
      const callbacksBefore = migrationCalls;
      await expect(pending.service.port.upgradeSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "backup_pending",
      });
      expect(migrationCalls).toBe(callbacksBefore);
      expect(await saveRecordsV1(pending.records)).toEqual(recordsBefore);
      expect(await leaseRecordsV1(pending.records)).toEqual(leasesBefore);
    });

    it.each(
      [
        [
          "callback rejection",
          () =>
            Object.freeze({
              kind: "rejected" as const,
              reasonCode: parseSaveStateMigrationReasonCodeV1(
                "migration.persistence-service-test.rejected",
              ),
            }),
          { kind: "rejected", code: "migration_rejected" },
        ],
        [
          "invalid migrated references",
          () =>
            Object.freeze({
              kind: "migrated" as const,
              state: Object.freeze({ count: 12, referenceId: "reference.unknown" }),
            }),
          { kind: "rejected", code: "invalid_record" },
        ],
        [
          "callback throw",
          () => {
            throw new Error("private migration callback failure");
          },
          { kind: "faulted", code: "migration.callback_threw" },
        ],
      ] as const,
    )("keeps every authority unchanged for %s", async (_label, migrate, expected) => {
      const sourceProvenance = provenanceV1();
      const targetProvenance = migrationTargetProvenanceV1();
      let migrationCalls = 0;
      const fixture = await fixtureV1({
        provenance: targetProvenance,
        saveStateMigrations: migrationRegistryV1(sourceProvenance, targetProvenance, (_state) => {
          migrationCalls += 1;
          return migrate() as ReturnType<SaveStateMigrationStepV1["migrate"]>;
        }),
      });
      await seedQuickRecordV1(
        fixture,
        recordV1({ snapshot: snapshotV1(7), provenance: sourceProvenance, slotId: "quick" }),
      );
      const recordsBefore = await saveRecordsV1(fixture.records);
      const leasesBefore = await leaseRecordsV1(fixture.records);
      const liveSnapshot = fixture.session.getCurrentSnapshot();
      const liveLineage = fixture.service.getSimulationLineage();
      const statusBefore = await fixture.service.port.getStatus();

      await expect(fixture.service.port.upgradeSave("quick")).resolves.toEqual(expected);
      expect(migrationCalls).toBe(1);
      expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
      await expect(fixture.repository.readMigrationBackup("quick")).resolves.toMatchObject({
        health: "empty",
      });
      expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
      expect(fixture.service.getSimulationLineage()).toBe(liveLineage);
      await expect(fixture.service.port.getStatus()).resolves.toEqual(statusBefore);
    });

    it.each(["unavailable", "throw"] as const)(
      "leaves target, backup, lease, and Session unchanged when the upgrade commit is %s",
      async (failure) => {
        const store = createSwitchableCommitFailureStoreV1();
        const sourceProvenance = provenanceV1();
        const targetProvenance = migrationTargetProvenanceV1();
        let migrationCalls = 0;
        const fixture = await fixtureV1({
          records: store.records,
          provenance: targetProvenance,
          saveStateMigrations: migrationRegistryV1(
            sourceProvenance,
            targetProvenance,
            (state) => {
              migrationCalls += 1;
              return Object.freeze({ kind: "migrated" as const, state });
            },
          ),
        });
        await seedQuickRecordV1(
          fixture,
          recordV1({ snapshot: snapshotV1(7), provenance: sourceProvenance, slotId: "quick" }),
        );
        const recordsBefore = await saveRecordsV1(fixture.records);
        const leasesBefore = await leaseRecordsV1(fixture.records);
        const liveSnapshot = fixture.session.getCurrentSnapshot();
        store.setFailure(failure);

        await expect(fixture.service.port.upgradeSave("quick")).resolves.toEqual(
          failure === "unavailable"
            ? { kind: "rejected", code: "unavailable" }
            : { kind: "faulted", code: "persistence.unexpected" },
        );
        expect(migrationCalls).toBe(1);
        expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
        expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
        expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
      },
    );

    it("maps the final target/backup/lease CAS conflict without any operation-owned partial write", async () => {
      const sourceProvenance = provenanceV1();
      const targetProvenance = migrationTargetProvenanceV1();
      let migrationCalls = 0;
      const fixture = await fixtureV1({
        provenance: targetProvenance,
        saveStateMigrations: migrationRegistryV1(sourceProvenance, targetProvenance, (state) => {
          migrationCalls += 1;
          return Object.freeze({ kind: "migrated" as const, state });
        }),
        decorateRepository(repository) {
          return Object.freeze({
            ...repository,
            async rewriteWithMigrationBackup() {
              return Object.freeze({ kind: "rejected" as const, code: "conflict" as const });
            },
          });
        },
      });
      await seedQuickRecordV1(
        fixture,
        recordV1({ snapshot: snapshotV1(7), provenance: sourceProvenance, slotId: "quick" }),
      );
      const recordsBefore = await saveRecordsV1(fixture.records);
      const leasesBefore = await leaseRecordsV1(fixture.records);
      const liveSnapshot = fixture.session.getCurrentSnapshot();

      await expect(fixture.service.port.upgradeSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "conflict",
      });
      expect(migrationCalls).toBe(1);
      expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
      expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
    });

    it.each([0, 15] as const)(
      "upgrades an adoptable lineage of length %s without re-anchor",
      async (length) => {
        const sourceProvenance = provenanceV1({ simulation: "simulation.old", patch: "old" });
        const targetProvenance = provenanceV1({ simulation: "simulation.new", patch: "new" });
        const fixture = await fixtureV1({
          provenance: targetProvenance,
          adoptionDeclarations: Object.freeze([
            adoptionDeclarationV1(sourceProvenance, targetProvenance),
          ]),
        });
        await seedQuickRecordV1(
          fixture,
          recordV1({
            snapshot: snapshotV1(10),
            provenance: sourceProvenance,
            lineage: lineageV1(length, sourceProvenance.resolved.simulationDigest),
            slotId: "quick",
          }),
        );

        await expect(fixture.service.port.upgradeSave("quick")).resolves.toEqual({
          kind: "upgraded",
          slotId: "quick",
          compatibility: "adopted",
        });
        expect(await fixture.repository.read("quick")).toMatchObject({
          health: "valid",
          record: { simulationLineage: { length: length + 1 } },
        });
        await expect(fixture.service.port.reanchorSave("quick")).resolves.toEqual({
          kind: "rejected",
          code: "backup_pending",
        });
      },
    );

    it("re-anchors only a unique adoption that would create lineage entry 17", async () => {
      const sourceProvenance = provenanceV1({ simulation: "simulation.old", patch: "old" });
      const targetProvenance = provenanceV1({ simulation: "simulation.new", patch: "new" });
      const fixture = await fixtureV1({
        provenance: targetProvenance,
        adoptionDeclarations: Object.freeze([
          adoptionDeclarationV1(sourceProvenance, targetProvenance),
        ]),
      });
      const source = await seedQuickRecordV1(
        fixture,
        recordV1({
          snapshot: snapshotV1(16),
          provenance: sourceProvenance,
          lineage: lineageV1(16, sourceProvenance.resolved.simulationDigest),
          slotId: "quick",
        }),
      );
      const liveSnapshot = fixture.session.getCurrentSnapshot();
      await expect(fixture.service.port.upgradeSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "reanchor_required",
      });
      await expect(fixture.repository.readMigrationBackup("quick")).resolves.toMatchObject({
        health: "empty",
      });
      await expect(fixture.service.port.reanchorSave("quick")).resolves.toEqual({
        kind: "reanchored",
        slotId: "quick",
      });
      expect(await fixture.repository.read("quick")).toMatchObject({
        health: "valid",
        record: {
          provenance: targetProvenance,
          snapshot: { commandSequence: 16 },
          simulationLineage: [],
        },
      });
      expect(await fixture.repository.readMigrationBackup("quick")).toMatchObject({
        health: "stored",
        bytes: source.bytes,
      });
      expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
      expect(fixture.service.getSimulationLineage()).toEqual([]);
    });

    it("reruns a required migration before re-anchoring a uniquely adoptable full lineage", async () => {
      const sourceProvenance = provenanceV1({ simulation: "simulation.old", patch: "old" });
      const targetProvenance = migrationTargetProvenanceV1({ simulation: "simulation.new" });
      let migrationCalls = 0;
      const fixture = await fixtureV1({
        provenance: targetProvenance,
        adoptionDeclarations: Object.freeze([
          adoptionDeclarationV1(sourceProvenance, targetProvenance),
        ]),
        saveStateMigrations: migrationRegistryV1(sourceProvenance, targetProvenance, (state) => {
          migrationCalls += 1;
          return Object.freeze({ kind: "migrated" as const, state });
        }),
      });
      const source = await seedQuickRecordV1(
        fixture,
        recordV1({
          snapshot: snapshotV1(16),
          provenance: sourceProvenance,
          lineage: lineageV1(16, sourceProvenance.resolved.simulationDigest),
          slotId: "quick",
        }),
      );

      await expect(fixture.service.port.reanchorSave("quick")).resolves.toEqual({
        kind: "reanchored",
        slotId: "quick",
      });
      expect(migrationCalls).toBe(1);
      expect(await fixture.repository.read("quick")).toMatchObject({
        health: "valid",
        record: { provenance: targetProvenance, simulationLineage: [] },
      });
      expect(await fixture.repository.readMigrationBackup("quick")).toMatchObject({
        health: "stored",
        bytes: source.bytes,
      });
    });

    it("keeps exact lineage 16 loadable and rejects re-anchor for exact, over-limit, zero-match, and ambiguous inputs", async () => {
      const current = provenanceV1();
      const exact = await fixtureV1({ provenance: current });
      await seedQuickRecordV1(
        exact,
        recordV1({
          snapshot: snapshotV1(16),
          provenance: current,
          lineage: lineageV1(16, current.resolved.simulationDigest),
          slotId: "quick",
        }),
      );
      await expect(exact.service.port.upgradeSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "not_required",
      });
      await expect(exact.service.port.reanchorSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "not_required",
      });
      await expect(exact.service.port.load("quick")).resolves.toMatchObject({ kind: "loaded" });

      const overLimit = await fixtureV1({ provenance: current });
      await seedQuickRecordV1(
        overLimit,
        recordV1({
          snapshot: snapshotV1(17),
          provenance: current,
          lineage: lineageV1(17, current.resolved.simulationDigest),
          slotId: "quick",
        }),
      );
      await expect(overLimit.service.port.reanchorSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });

      const old = provenanceV1({ simulation: "simulation.old", patch: "old" });
      const changed = provenanceV1({ simulation: "simulation.new", patch: "new" });
      const noMatch = await fixtureV1({ provenance: changed });
      await seedQuickRecordV1(
        noMatch,
        recordV1({
          snapshot: snapshotV1(16),
          provenance: old,
          lineage: lineageV1(16, old.resolved.simulationDigest),
          slotId: "quick",
        }),
      );
      await expect(noMatch.service.port.reanchorSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "incompatible",
      });

      const ambiguous = await fixtureV1({
        provenance: changed,
        classifyCompatibility: () =>
          Object.freeze({
            kind: "rejected" as const,
            code: "compatibility.adoption_ambiguous" as const,
          }),
      });
      await seedQuickRecordV1(
        ambiguous,
        recordV1({
          snapshot: snapshotV1(16),
          provenance: old,
          lineage: lineageV1(16, old.resolved.simulationDigest),
          slotId: "quick",
        }),
      );
      await expect(ambiguous.service.port.reanchorSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });
    });

    it("restores an existing or cleared target without installing it and consumes the backup once", async () => {
      for (const targetState of ["existing", "empty"] as const) {
        const fixture = await fixtureV1({ initial: snapshotV1(40) });
        const sourceRecord = recordV1({ snapshot: snapshotV1(6), slotId: "quick" });
        const seeded = await seedRewrittenQuickWithBackupV1(
          fixture,
          sourceRecord,
          recordV1({ snapshot: snapshotV1(8), slotId: "quick" }),
        );
        if (targetState === "empty") {
          await expect(
            fixture.repository.clear("quick", await ownedFenceV1(fixture)),
          ).resolves.toMatchObject({ kind: "cleared" });
        }
        const liveSnapshot = fixture.session.getCurrentSnapshot();
        const liveLineage = fixture.service.getSimulationLineage();

        await expect(fixture.service.port.restoreBackup("quick")).resolves.toEqual({
          kind: "restored",
          slotId: "quick",
        });
        expect(await fixture.repository.read("quick")).toMatchObject({
          health: "valid",
          record: {
            recordRevision: targetState === "existing" ? 3 : 1,
            snapshot: { commandSequence: 6 },
          },
        });
        await expect(fixture.repository.readMigrationBackup("quick")).resolves.toMatchObject({
          health: "empty",
        });
        await expect(fixture.service.port.restoreBackup("quick")).resolves.toEqual({
          kind: "rejected",
          code: "empty_backup",
        });
        expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
        expect(fixture.service.getSimulationLineage()).toBe(liveLineage);
        expect(seeded.backup.bytes).toEqual(seeded.source.bytes);
      }
    });

    it("exports without consuming or touching the lease, and discards without changing the target", async () => {
      const fixture = await fixtureV1();
      const seeded = await seedRewrittenQuickWithBackupV1(
        fixture,
        recordV1({ snapshot: snapshotV1(2), slotId: "quick" }),
        recordV1({ snapshot: snapshotV1(3), slotId: "quick" }),
      );
      const targetBefore = await fixture.repository.read("quick");
      const leasesBefore = await leaseRecordsV1(fixture.records);
      const exported = await fixture.service.port.exportBackup("quick");
      expect(exported).toMatchObject({
        kind: "exported",
        slotId: "quick",
        file: { bytes: seeded.source.bytes, digest: digestBytes(seeded.source.bytes) },
      });
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
      expect(await fixture.repository.readMigrationBackup("quick")).toMatchObject({
        health: "stored",
      });

      await expect(fixture.service.port.discardBackup("quick")).resolves.toEqual({
        kind: "discarded",
        slotId: "quick",
      });
      expect(await fixture.repository.read("quick")).toEqual(targetBefore);
      await expect(fixture.repository.readMigrationBackup("quick")).resolves.toMatchObject({
        health: "empty",
      });
      await expect(fixture.service.port.discardBackup("quick")).resolves.toEqual({
        kind: "rejected",
        code: "empty_backup",
      });
    });

    it("fails stale backup export closed while retaining the pending backup and lease", async () => {
      let backupReads = 0;
      const fixture = await fixtureV1({
        decorateRepository(repository) {
          return Object.freeze({
            ...repository,
            async readMigrationBackup(slotId: SaveSlotIdV1) {
              backupReads += 1;
              const read = await repository.readMigrationBackup(slotId);
              return backupReads === 2 && read.health === "stored"
                ? Object.freeze({
                  health: "empty" as const,
                  slotId,
                  hostRevision: null,
                })
                : read;
            },
          });
        },
      });
      await seedRewrittenQuickWithBackupV1(
        fixture,
        recordV1({ snapshot: snapshotV1(2), slotId: "quick" }),
        recordV1({ snapshot: snapshotV1(3), slotId: "quick" }),
      );
      const recordsBefore = await saveRecordsV1(fixture.records);
      const leasesBefore = await leaseRecordsV1(fixture.records);

      await expect(fixture.service.port.exportBackup("quick")).resolves.toEqual({
        kind: "rejected",
        code: "conflict",
      });
      expect(backupReads).toBe(2);
      expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
    });

    it.each(["restoreBackup", "discardBackup"] as const)(
      "maps a %s CAS conflict without changing target, backup, lease, or Session",
      async (operation) => {
        const fixture = await fixtureV1({
          decorateRepository(repository) {
            return Object.freeze({
              ...repository,
              async restoreMigrationBackup() {
                return Object.freeze({ kind: "rejected" as const, code: "conflict" as const });
              },
              async discardMigrationBackup() {
                return Object.freeze({ kind: "rejected" as const, code: "conflict" as const });
              },
            });
          },
        });
        await seedRewrittenQuickWithBackupV1(
          fixture,
          recordV1({ snapshot: snapshotV1(2), slotId: "quick" }),
          recordV1({ snapshot: snapshotV1(3), slotId: "quick" }),
        );
        const recordsBefore = await saveRecordsV1(fixture.records);
        const leasesBefore = await leaseRecordsV1(fixture.records);
        const liveSnapshot = fixture.session.getCurrentSnapshot();

        await expect(fixture.service.port[operation]("quick")).resolves.toEqual({
          kind: "rejected",
          code: "conflict",
        });
        expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
        expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
        expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
      },
    );

    it.each(["restoreBackup", "discardBackup"] as const)(
      "keeps a valid pending backup intact when %s encounters a corrupt lease record",
      async (operation) => {
        const fixture = await fixtureV1({ initial: snapshotV1(41) });
        await seedRewrittenQuickWithBackupV1(
          fixture,
          recordV1({ snapshot: snapshotV1(2), slotId: "quick" }),
          recordV1({ snapshot: snapshotV1(3), slotId: "quick" }),
        );
        const leaseKey = createSessionLeaseRecordKeyV1(storyIdV1);
        const lease = await fixture.records.read("lease", leaseKey);
        if (lease === null) throw new TypeError("expected a lease record to corrupt");
        await expect(
          fixture.records.commit([
            Object.freeze({
              kind: "put" as const,
              namespace: "lease" as const,
              key: leaseKey,
              expectedRevision: lease.revision,
              bytes: textEncoderV1.encode("corrupt lease"),
            }),
          ]),
        ).resolves.toMatchObject({ kind: "committed" });
        const recordsBefore = await saveRecordsV1(fixture.records);
        const leasesBefore = await leaseRecordsV1(fixture.records);
        const liveSnapshot = fixture.session.getCurrentSnapshot();
        const liveLineage = fixture.service.getSimulationLineage();

        await expect(fixture.service.port[operation]("quick")).resolves.toEqual({
          kind: "rejected",
          code: "invalid_record",
        });
        expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
        expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
        expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
        expect(fixture.service.getSimulationLineage()).toBe(liveLineage);
      },
    );

    it.each(["restoreBackup", "discardBackup"] as const)(
      "preserves the repository invalid_record projection for %s",
      async (operation) => {
        const fixture = await fixtureV1({
          decorateRepository(repository) {
            return Object.freeze({
              ...repository,
              async restoreMigrationBackup() {
                return Object.freeze({
                  kind: "rejected" as const,
                  code: "invalid_record" as const,
                });
              },
              async discardMigrationBackup() {
                return Object.freeze({
                  kind: "rejected" as const,
                  code: "invalid_record" as const,
                });
              },
            });
          },
        });
        await seedRewrittenQuickWithBackupV1(
          fixture,
          recordV1({ snapshot: snapshotV1(2), slotId: "quick" }),
          recordV1({ snapshot: snapshotV1(3), slotId: "quick" }),
        );
        const recordsBefore = await saveRecordsV1(fixture.records);
        const leasesBefore = await leaseRecordsV1(fixture.records);
        const liveSnapshot = fixture.session.getCurrentSnapshot();

        await expect(fixture.service.port[operation]("quick")).resolves.toEqual({
          kind: "rejected",
          code: "invalid_record",
        });
        expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
        expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
        expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
      },
    );

    it.each(
      [
        ["restoreBackup", "unavailable"],
        ["restoreBackup", "throw"],
        ["discardBackup", "unavailable"],
        ["discardBackup", "throw"],
      ] as const,
    )("keeps recovery atomic when %s commit is %s", async (operation, failure) => {
      const store = createSwitchableCommitFailureStoreV1();
      const fixture = await fixtureV1({ records: store.records, initial: snapshotV1(50) });
      await seedRewrittenQuickWithBackupV1(
        fixture,
        recordV1({ snapshot: snapshotV1(2), slotId: "quick" }),
        recordV1({ snapshot: snapshotV1(3), slotId: "quick" }),
      );
      const recordsBefore = await saveRecordsV1(fixture.records);
      const leasesBefore = await leaseRecordsV1(fixture.records);
      const liveSnapshot = fixture.session.getCurrentSnapshot();
      store.setFailure(failure);

      await expect(fixture.service.port[operation]("quick")).resolves.toEqual(
        failure === "unavailable"
          ? { kind: "rejected", code: "unavailable" }
          : { kind: "faulted", code: "persistence.unexpected" },
      );
      expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
      expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
    });

    it("rejects invalid backup resolution without consuming target, backup, lease, or live authority", async () => {
      const fixture = await fixtureV1({ initial: snapshotV1(30) });
      const stored = await seedQuickRecordV1(
        fixture,
        recordV1({ snapshot: snapshotV1(4), slotId: "quick" }),
      );
      const backupKey = createSaveMigrationBackupRecordKeyV1(storyIdV1, "quick");
      const commit = await fixture.records.commit([
        Object.freeze({
          kind: "put" as const,
          namespace: "save" as const,
          key: backupKey,
          expectedRevision: null,
          bytes: textEncoderV1.encode("invalid backup"),
        }),
      ]);
      expect(commit.kind).toBe("committed");
      const recordsBefore = await saveRecordsV1(fixture.records);
      const leasesBefore = await leaseRecordsV1(fixture.records);
      const liveSnapshot = fixture.session.getCurrentSnapshot();
      const liveLineage = fixture.service.getSimulationLineage();

      await expect(fixture.service.port.exportBackup("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_backup",
      });
      await expect(fixture.service.port.restoreBackup("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_backup",
      });
      expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
      await expect(fixture.service.port.discardBackup("quick")).resolves.toEqual({
        kind: "discarded",
        slotId: "quick",
      });
      await expect(fixture.repository.readMigrationBackup("quick")).resolves.toMatchObject({
        health: "empty",
      });
      await expect(fixture.repository.read("quick")).resolves.toMatchObject({
        health: "valid",
        record: { snapshot: { commandSequence: 4 } },
      });
      expect(fixture.session.getCurrentSnapshot()).toBe(liveSnapshot);
      expect(fixture.service.getSimulationLineage()).toBe(liveLineage);
      expect(stored.record.snapshot.commandSequence).toBe(4);
    });

    it("bounds 10,000 pending upgrade attempts to one target and one backup", {
      timeout: 30_000,
    }, async () => {
      const sourceProvenance = provenanceV1();
      const targetProvenance = migrationTargetProvenanceV1();
      let migrationCalls = 0;
      const fixture = await fixtureV1({
        provenance: targetProvenance,
        saveStateMigrations: migrationRegistryV1(sourceProvenance, targetProvenance, (state) => {
          migrationCalls += 1;
          return Object.freeze({ kind: "migrated" as const, state });
        }),
      });
      const source = await seedQuickRecordV1(
        fixture,
        recordV1({ snapshot: snapshotV1(1), provenance: sourceProvenance, slotId: "quick" }),
      );
      await seedPendingBackupWithoutRewriteV1(fixture, source.bytes);
      const recordsBefore = await saveRecordsV1(fixture.records);
      const leasesBefore = await leaseRecordsV1(fixture.records);
      for (let attempt = 0; attempt < 10_000; attempt += 1) {
        const result = await fixture.service.port.upgradeSave("quick");
        expect(result).toEqual({ kind: "rejected", code: "backup_pending" });
      }
      expect(migrationCalls).toBe(0);
      expect(await saveRecordsV1(fixture.records)).toEqual(recordsBefore);
      expect(await leaseRecordsV1(fixture.records)).toEqual(leasesBefore);
    });
  });

  it("imports an adopted Save using current provenance, appends lineage, and writes no slot", async () => {
    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const current = provenanceV1({
      simulation: "simulation.new",
      patch: "new",
    });
    const modified = runIntegrityV1Schema.parse({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 5,
      reasons: [
        {
          kind: "fixture_anchor",
          fixtureId: "fixture.modified",
          sequence: 5,
        },
      ],
    });
    const candidate = recordV1({
      snapshot: snapshotV1(5, modified),
      provenance: stored,
    });
    const fixture = await fixtureV1({
      provenance: current,
      adoptionDeclarations: Object.freeze([adoptionDeclarationV1(stored, current)]),
    });
    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await fixture.service.autoSaveIdle();
    const replayBaseBefore = fixture.commandLog.replayBase();
    expect(fixture.commandLog.entries()).toHaveLength(1);
    const before = await saveRecordsV1(fixture.records);

    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(candidate, codecV1)),
    ).resolves.toEqual({
      kind: "imported",
      compatibility: "adopted",
      commandSequence: 5,
    });
    const adopted = fixture.session.getCurrentSnapshot();
    expect(adopted.integrity).toEqual(modified);
    expect(fixture.commandLog.entries()).toEqual([]);
    expect(fixture.commandLog.replayBase()).toBe(adopted);
    expect(fixture.commandLog.replayBase()).not.toBe(replayBaseBefore);
    expect(fixture.commandLog.replayBaseStateDigest()).toBe(
      digestCanonical("sillymaker:state:v1", adopted),
    );
    expect(await saveRecordsV1(fixture.records)).toEqual(before);

    expect(fixture.service.getSimulationLineage()).toEqual([
      {
        fromSimulationDigest: stored.resolved.simulationDigest,
        toSimulationDigest: current.resolved.simulationDigest,
        viaSimulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
        adoptedAtCommandSequence: 5,
      },
    ]);

    const decoded = decodeSaveRecordV1(
      (await fixture.service.port.exportCurrentSave()).bytes,
      codecV1,
    );
    expect(decoded).toMatchObject({
      kind: "decoded",
      record: {
        provenance: current,
        slot: { slotId: "manual.1", capturedCommandSequence: 5 },
        simulationLineage: [
          {
            fromSimulationDigest: stored.resolved.simulationDigest,
            toSimulationDigest: current.resolved.simulationDigest,
            viaSimulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
            adoptedAtCommandSequence: 5,
          },
        ],
      },
    });
    const adoptedDigest = digestCanonical("sillymaker:state:v1", adopted);
    await fixture.session.dispatch({ kind: "increment" });
    expect(fixture.commandLog.entries()[0]?.preStateDigest).toBe(adoptedDigest);
  });

  it("keeps Session and storage unchanged for inspect-only, invalid, and lineage-limit imports", async () => {
    const inspectFixture = await fixtureV1();
    await expect(inspectFixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await inspectFixture.service.autoSaveIdle();
    const inspectRecord = recordV1({
      snapshot: snapshotV1(4),
      provenance: provenanceV1({ engine: "engine.other" }),
    });
    const inspectSnapshot = inspectFixture.session.getCurrentSnapshot();
    const inspectReplayBase = inspectFixture.commandLog.replayBase();
    const inspectEntries = inspectFixture.commandLog.entries();
    const inspectLineage = inspectFixture.service.getSimulationLineage();
    expect(inspectEntries).toHaveLength(1);
    const inspectStorage = await saveRecordsV1(inspectFixture.records);
    await expect(
      inspectFixture.service.port.importSave(encodeSaveRecordV1(inspectRecord, codecV1)),
    ).resolves.toEqual({ kind: "rejected", code: "incompatible" });
    expect(inspectFixture.session.getCurrentSnapshot()).toBe(inspectSnapshot);
    expect(inspectFixture.commandLog.replayBase()).toBe(inspectReplayBase);
    expect(inspectFixture.commandLog.entries()).toBe(inspectEntries);
    expect(inspectFixture.service.getSimulationLineage()).toBe(inspectLineage);
    expect(await saveRecordsV1(inspectFixture.records)).toEqual(inspectStorage);

    const invalidSnapshot = inspectFixture.session.getCurrentSnapshot();
    await expect(
      inspectFixture.service.port.importSave(textEncoderV1.encode("not-json")),
    ).resolves.toEqual({
      kind: "rejected",
      code: "invalid_record",
    });
    expect(inspectFixture.session.getCurrentSnapshot()).toBe(invalidSnapshot);
    expect(inspectFixture.commandLog.replayBase()).toBe(inspectReplayBase);
    expect(inspectFixture.commandLog.entries()).toBe(inspectEntries);
    expect(await saveRecordsV1(inspectFixture.records)).toEqual(inspectStorage);

    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const current = provenanceV1({
      simulation: "simulation.new",
      patch: "new",
    });
    const limitFixture = await fixtureV1({
      provenance: current,
      adoptionDeclarations: Object.freeze([adoptionDeclarationV1(stored, current)]),
    });
    await expect(limitFixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await limitFixture.service.autoSaveIdle();
    const limited = recordV1({
      snapshot: snapshotV1(16),
      provenance: stored,
      lineage: lineageV1(16, stored.resolved.simulationDigest),
    });
    const limitSnapshot = limitFixture.session.getCurrentSnapshot();
    const limitReplayBase = limitFixture.commandLog.replayBase();
    const limitEntries = limitFixture.commandLog.entries();
    expect(limitEntries).toHaveLength(1);
    const limitStorage = await saveRecordsV1(limitFixture.records);
    await expect(
      limitFixture.service.port.importSave(encodeSaveRecordV1(limited, codecV1)),
    ).resolves.toEqual({ kind: "rejected", code: "lineage_limit" });
    expect(limitFixture.session.getCurrentSnapshot()).toBe(limitSnapshot);
    expect(limitFixture.commandLog.replayBase()).toBe(limitReplayBase);
    expect(limitFixture.commandLog.entries()).toBe(limitEntries);
    expect(await saveRecordsV1(limitFixture.records)).toEqual(limitStorage);
  });

  it("preserves the CommandLog anchor when persistence cannot read a requested slot", async () => {
    const switchable = createSwitchableUnavailableStoreV1();
    const fixture = await fixtureV1({ records: switchable.records });
    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await fixture.service.autoSaveIdle();
    const snapshotBefore = fixture.session.getCurrentSnapshot();
    const replayBaseBefore = fixture.commandLog.replayBase();
    const entriesBefore = fixture.commandLog.entries();
    expect(entriesBefore).toHaveLength(1);

    switchable.becomeUnavailable();
    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });

    expect(fixture.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(fixture.commandLog.replayBase()).toBe(replayBaseBefore);
    expect(fixture.commandLog.entries()).toBe(entriesBefore);
  });

  it("preserves every authority when Persistence replacement prepare fails", async () => {
    let failPrepare = false;
    const fixture = await fixtureV1({
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          captureFence() {
            if (failPrepare) throw new Error("synthetic replacement prepare failure");
            return lease.captureFence();
          },
        });
      },
    });
    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await fixture.service.autoSaveIdle();
    const snapshotBefore = fixture.session.getCurrentSnapshot();
    const replayBaseBefore = fixture.commandLog.replayBase();
    const entriesBefore = fixture.commandLog.entries();
    const lineageBefore = fixture.service.getSimulationLineage();
    expect(entriesBefore).toHaveLength(1);
    const replacement = recordV1({ snapshot: snapshotV1(9) });
    failPrepare = true;

    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toEqual({ kind: "faulted", code: "persistence.unexpected" });

    expect(fixture.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(fixture.commandLog.replayBase()).toBe(replayBaseBefore);
    expect(fixture.commandLog.entries()).toBe(entriesBefore);
    expect(fixture.service.getSimulationLineage()).toBe(lineageBefore);
    expect(fixture.session.getStatus()).toBe("ready");
  });

  it("fails prepare when lease capture reentrantly fences Persistence", async () => {
    let reentrantFence: (() => void) | undefined;
    const fixture = await fixtureV1({
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          captureFence() {
            reentrantFence?.();
            return lease.captureFence();
          },
        });
      },
    });
    await fixture.session.dispatch({ kind: "increment" });
    const snapshotBefore = fixture.session.getCurrentSnapshot();
    const replayBaseBefore = fixture.commandLog.replayBase();
    const entriesBefore = fixture.commandLog.entries();
    const lineageBefore = fixture.service.getSimulationLineage();
    reentrantFence = () => fencePersistencePlayerMutationsInternalV1(fixture.service);

    await expect(
      fixture.service.port.importSave(
        encodeSaveRecordV1(recordV1({ snapshot: snapshotV1(9) }), codecV1),
      ),
    ).resolves.toEqual({ kind: "faulted", code: "persistence.unexpected" });
    expect(fixture.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(fixture.commandLog.replayBase()).toBe(replayBaseBefore);
    expect(fixture.commandLog.entries()).toBe(entriesBefore);
    expect(fixture.service.getSimulationLineage()).toBe(lineageBefore);
    expect(fixture.session.getStatus()).toBe("ready");
  });

  it("rejects a Persistence participant on a different Session before mutation", async () => {
    const first = await fixtureV1();
    const second = await fixtureV1();
    const outcome = Object.freeze({
      kind: "replace" as const,
      snapshot: snapshotV1(9),
      result: "anchored" as const,
      anchor: "replace_replay_base" as const,
    });
    let replacementCommits = 0;
    bindPersistenceAnchorReplacementInternalV1(
      first.service,
      outcome,
      [],
      () => {
        replacementCommits += 1;
      },
      () => "prepare_failed" as const,
    );
    const firstBefore = first.session.getCurrentSnapshot();
    const secondBefore = second.session.getCurrentSnapshot();

    await expect(
      second.runtimeControl.enqueueAuthoritative(
        async () => outcome,
        () => "faulted" as const,
      ),
    ).resolves.toBe("prepare_failed");
    expect(first.session.getCurrentSnapshot()).toBe(firstBefore);
    expect(second.session.getCurrentSnapshot()).toBe(secondBefore);
    expect(first.session.getStatus()).toBe("ready");
    expect(second.session.getStatus()).toBe("ready");
    expect(replacementCommits).toBe(0);

    const retryOutcome = Object.freeze({ ...outcome });
    bindPersistenceAnchorReplacementInternalV1(
      first.service,
      retryOutcome,
      [],
      () => {
        replacementCommits += 1;
      },
      () => "prepare_failed" as const,
    );
    await expect(
      first.runtimeControl.enqueueAuthoritative(
        async () => retryOutcome,
        () => "faulted" as const,
      ),
    ).resolves.toBe("anchored");
    expect(first.session.getCurrentSnapshot().state.count).toBe(9);
    expect(second.session.getCurrentSnapshot()).toBe(secondBefore);
    expect(replacementCommits).toBe(1);
  });

  it("preserves a prior Persistence failure across a package-owned non-load anchor", async () => {
    let verificationUnavailable = false;
    const fixture = await fixtureV1({
      decorateRepository(repository) {
        return Object.freeze({
          ...repository,
          async read(slotId: Parameters<typeof repository.read>[0]) {
            if (verificationUnavailable) {
              return Object.freeze({
                health: "unavailable" as const,
                slotId,
                hostRevision: null,
                record: null,
                code: "indexeddb.quota_exceeded",
              });
            }
            return repository.read(slotId);
          },
          async writePlayer(
            slotId: Parameters<typeof repository.writePlayer>[0],
            record: Parameters<typeof repository.writePlayer>[1],
            fence: Parameters<typeof repository.writePlayer>[2],
          ) {
            const result = await repository.writePlayer(slotId, record, fence);
            verificationUnavailable = true;
            return result;
          },
        });
      },
    });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "indexeddb.quota_exceeded",
    });
    const outcome = Object.freeze({
      kind: "replace" as const,
      snapshot: snapshotV1(9),
      result: "anchored" as const,
      anchor: "replace_replay_base" as const,
    });
    bindPersistenceAnchorReplacementInternalV1(
      fixture.service,
      outcome,
      Object.freeze([]),
      () => undefined,
      () => "prepare_failed" as const,
    );

    await expect(
      fixture.runtimeControl.enqueueAuthoritative(
        async () => outcome,
        () => "outer_fault" as const,
      ),
    ).resolves.toBe("anchored");
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "indexeddb.quota_exceeded",
    });
    expect(fixture.session.getStatus()).toBe("ready");
  });

  it("preserves atomic replacement through a fully delegated runtime control", async () => {
    const fixture = await fixtureV1({
      decorateRuntimeControl: (runtimeControl) => wrapRuntimeControlV1(runtimeControl),
    });
    const replacement = recordV1({ snapshot: snapshotV1(9) });

    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toMatchObject({ kind: "imported", compatibility: "exact" });
    expect(fixture.session.getCurrentSnapshot().state.count).toBe(9);
    expect(fixture.service.getSimulationLineage()).toEqual([]);
    expect(fixture.session.getStatus()).toBe("ready");
  });

  it("rejects a mixed-owner runtime wrapper before either Session mutates", async () => {
    const foreign = createSessionV1(snapshotV1(40));
    let localControl: GameSessionRuntimeControlV1<SyntheticSnapshotV1> | undefined;
    const foreignBefore = foreign.session.getCurrentSnapshot();

    await expect(
      fixtureV1({
        decorateRuntimeControl(runtimeControl) {
          localControl = runtimeControl;
          return Object.freeze({
            ...runtimeControl,
            enqueueAuthoritative: foreign.runtimeControl.enqueueAuthoritative,
          });
        },
      }),
    ).rejects.toThrow("runtime control resolves multiple authoritative Session owners");
    expect(localControl?.inspectForRuntime().snapshot.state.count).toBe(0);
    expect(foreign.session.getCurrentSnapshot()).toBe(foreignBefore);
    expect(foreign.session.getStatus()).toBe("ready");
  });

  it("retains the atomic participant when a wrapper reconstructs outcome and result", async () => {
    const initialLineage = lineageV1(1, provenanceV1().resolved.simulationDigest);
    const fixture = await fixtureV1({
      initialLineage,
      decorateRuntimeControl: (runtimeControl) => wrapRuntimeControlV1(runtimeControl, true, true),
    });
    const replacement = recordV1({ snapshot: snapshotV1(9), lineage: Object.freeze([]) });

    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toMatchObject({ kind: "imported", compatibility: "exact" });
    expect(fixture.session.getCurrentSnapshot().state.count).toBe(9);
    expect(fixture.service.getSimulationLineage()).toEqual([]);
    expect(fixture.session.getStatus()).toBe("ready");
  });

  it("retains the legacy current-revision path for an opaque custom runtime wrapper", async () => {
    const initialLineage = lineageV1(1, provenanceV1().resolved.simulationDigest);
    const fixture = await fixtureV1({
      initialLineage,
      decorateRuntimeControl: (runtimeControl) =>
        wrapRuntimeControlV1(runtimeControl, true, true, true),
    });
    const replacement = recordV1({ snapshot: snapshotV1(9), lineage: Object.freeze([]) });

    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toMatchObject({ kind: "imported", compatibility: "exact" });
    expect(fixture.session.getCurrentSnapshot().state.count).toBe(9);
    expect(fixture.service.getSimulationLineage()).toEqual([]);
  });

  it("keeps a lineage-limited physical Save available for inspection and export", async () => {
    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const current = provenanceV1({
      simulation: "simulation.new",
      patch: "new",
    });
    const fixture = await fixtureV1({
      provenance: current,
      adoptionDeclarations: Object.freeze([adoptionDeclarationV1(stored, current)]),
    });
    const limited = recordV1({
      snapshot: snapshotV1(16),
      provenance: stored,
      lineage: lineageV1(16, stored.resolved.simulationDigest),
    });
    await fixture.repository.writePlayer("manual.1", limited, await ownedFenceV1(fixture));

    await expect(fixture.service.port.load("manual.1")).resolves.toEqual({
      kind: "rejected",
      code: "lineage_limit",
    });
    await expect(fixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "manual.1",
          health: "valid",
          warningCodes: ["compatibility.lineage_limit"],
        }),
      ]),
    );
    await expect(fixture.service.port.exportSave("manual.1")).resolves.toMatchObject({
      kind: "exported",
      slotId: "manual.1",
      file: { mediaType: "application/json" },
    });
  });

  it("exports the accepted current Snapshot without storage or capability state", async () => {
    const capabilitySentinel = Object.freeze({
      debugTools: true,
      marker: "CAPABILITY_SENTINEL_MUST_NOT_ENTER_SAVE",
    });
    const fixture = await fixtureV1({
      records: unavailableStoreV1(),
      initial: snapshotV1(6),
    });

    await expect(fixture.service.port.save("manual.1")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    const exported = await fixture.service.port.exportCurrentSave();
    expect(exported.digest).toBe(digestBytes(exported.bytes));
    expect(new TextDecoder().decode(exported.bytes)).not.toContain(capabilitySentinel.marker);
    expect(decodeSaveRecordV1(exported.bytes, codecV1)).toMatchObject({
      kind: "decoded",
      record: {
        snapshot: { commandSequence: 6 },
        slot: { slotId: "manual.1" },
      },
    });
  });

  it("records an exact degraded code after a healthy store becomes unavailable", async () => {
    const switchable = createSwitchableUnavailableStoreV1();
    const fixture = await fixtureV1({
      records: switchable.records,
      initial: snapshotV1(6),
    });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });

    switchable.becomeUnavailable();
    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(fixture.service.port.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "quick",
          health: "unavailable",
          warningCodes: ["indexeddb.quota_exceeded"],
        }),
      ]),
    );
    await expect(fixture.service.port.exportSave("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      available: false,
      safelySavedCommandSequence: 6,
      lastFailureCode: "indexeddb.quota_exceeded",
    });
    await expect(fixture.service.port.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
  });

  it("does not retain an available status when fresh lease observation throws", async () => {
    const fixture = await fixtureV1({
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async getStatus() {
            throw new Error("unexpected lease read failure");
          },
        });
      },
    });

    await expect(fixture.service.port.lease.getStatus()).resolves.toMatchObject({
      kind: "unavailable",
      code: "persistence.unexpected",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      available: false,
      lastFailureCode: "persistence.unexpected",
    });
  });

  it("returns stable export and clear results without changing Session", async () => {
    const fixture = await fixtureV1({ initial: snapshotV1(2) });
    const snapshot = fixture.session.getCurrentSnapshot();
    await expect(fixture.service.port.exportSave("quick")).resolves.toEqual({
      kind: "rejected",
      code: "empty_slot",
    });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await expect(fixture.service.port.exportSave("quick")).resolves.toMatchObject({
      kind: "exported",
      slotId: "quick",
      file: { mediaType: "application/json" },
    });
    await expect(fixture.service.port.clear("quick")).resolves.toEqual({
      kind: "cleared",
      slotId: "quick",
    });
    await expect(fixture.service.port.clear("quick")).resolves.toEqual({
      kind: "rejected",
      code: "empty_slot",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
    });
    expect(fixture.session.getCurrentSnapshot()).toBe(snapshot);
  });

  it.each(["load", "import"] as const)(
    "orders same-tick dispatch and %s on the one GameSession FIFO",
    async (operation) => {
      const dispatchFirst = await fixtureV1();
      const candidate = recordV1({ snapshot: snapshotV1(9) });
      if (operation === "load") {
        await dispatchFirst.repository.writePlayer(
          "quick",
          candidate,
          await ownedFenceV1(dispatchFirst),
        );
      }
      const firstDispatch = dispatchFirst.session.dispatch({
        kind: "increment",
      });
      const firstReplacement = operation === "load"
        ? dispatchFirst.service.port.load("quick")
        : dispatchFirst.service.port.importSave(encodeSaveRecordV1(candidate, codecV1));
      await firstDispatch;
      await expect(firstReplacement).resolves.toMatchObject({
        compatibility: "exact",
      });
      expect(dispatchFirst.session.getCurrentSnapshot().commandSequence).toBe(9);

      const replacementFirst = await fixtureV1();
      if (operation === "load") {
        await replacementFirst.repository.writePlayer(
          "quick",
          candidate,
          await ownedFenceV1(replacementFirst),
        );
      }
      const secondReplacement = operation === "load"
        ? replacementFirst.service.port.load("quick")
        : replacementFirst.service.port.importSave(encodeSaveRecordV1(candidate, codecV1));
      const secondDispatch = replacementFirst.session.dispatch({
        kind: "increment",
      });
      await expect(secondReplacement).resolves.toMatchObject({
        compatibility: "exact",
      });
      await secondDispatch;
      expect(replacementFirst.session.getCurrentSnapshot().commandSequence).toBe(10);
      await Promise.all([
        dispatchFirst.service.autoSaveIdle(),
        replacementFirst.service.autoSaveIdle(),
      ]);
    },
  );
});

describe("PersistenceService standard composition", () => {
  interface MutableStoredRecordV1 {
    slot: { storyId: string; slotId: string };
    simulationLineage: unknown[];
    provenance: { resolved: { patchSet: { [key: string]: unknown } } };
  }

  async function standardFixtureV1(
    provenance: BuildProvenanceV1 = provenanceV1(),
    options: {
      summarizeSave?(state: DeepReadonly<SyntheticStateV1>): readonly string[] | null;
      collectVersionStamp?(): VersionStampV1;
      readonly exportFilename?: string;
      readonly metadataClock?: { now(): IsoUtcInstant };
      readonly instrumentation?: SnapshotWorkInstrumentationV1;
      readonly saveSummaryProjectionInstrumentation?:
        SaveSummaryProjectionInstrumentationInternalV1<SyntheticStateV1>;
      readonly wrapRepositoryForWriteReceiptFallback?: boolean;
    } = {},
  ) {
    const records = createMemoryHostRecordStoreV1();
    const created = createSessionV1(snapshotV1(0));
    const serviceOptions = {
      runtimeControl: created.runtimeControl,
      records,
      snapshotSchema: snapshotSchemaV1,
      provenance,
      adoptionDeclarations: Object.freeze([]),
      saveStateMigrations: null,
      ownerId: ownerIdV1,
      nextHandoffRequestId: () => "handoff.standard" as never,
      validateReferences: (state: DeepReadonly<SyntheticStateV1>) =>
        state.referenceId === "reference.valid"
          ? Object.freeze([])
          : Object.freeze(["reference.unknown"]),
      validateInvariants: () => Object.freeze([]),
      initialSimulationLineage: Object.freeze([]),
      metadataClock: options.metadataClock ??
        Object.freeze({
          now: () => "2026-07-14T12:00:00.000Z" as IsoUtcInstant,
        }),
      exportFilename: options.exportFilename ?? "standard-save.json",
      ...(options.summarizeSave === undefined ? {} : { summarizeSave: options.summarizeSave }),
      ...(options.collectVersionStamp === undefined
        ? {}
        : { collectVersionStamp: options.collectVersionStamp }),
    };
    const service = options.instrumentation === undefined &&
        options.saveSummaryProjectionInstrumentation === undefined &&
        options.wrapRepositoryForWriteReceiptFallback !== true
      ? await createPersistenceServiceV1(serviceOptions)
      : await createInstrumentedPersistenceServiceV1(
        serviceOptions,
        options.instrumentation,
        {
          ...(options.wrapRepositoryForWriteReceiptFallback === true
            ? { wrapRepositoryForWriteReceiptFallback: true }
            : {}),
          ...(options.saveSummaryProjectionInstrumentation === undefined ? {} : {
            saveSummaryProjectionInstrumentation: options.saveSummaryProjectionInstrumentation,
          }),
        },
      );
    return Object.freeze({ records, ...created, service });
  }

  async function tamperStoredQuickV1(
    records: HostAtomicRecordStoreV1,
    mutate: (record: MutableStoredRecordV1) => void,
  ): Promise<void> {
    const key = createSaveSlotRecordKeyV1(storyIdV1, "quick");
    const stored = await records.read("save", key);
    if (stored === null) throw new Error("expected a stored quick Save record");
    const parsed = JSON.parse(new TextDecoder().decode(stored.bytes)) as MutableStoredRecordV1;
    mutate(parsed);
    const committed = await records.commit([
      {
        kind: "put",
        namespace: "save",
        key,
        expectedRevision: stored.revision,
        bytes: textEncoderV1.encode(JSON.stringify(parsed)),
      },
    ]);
    if (committed.kind !== "committed") {
      throw new Error("tampering commit failed");
    }
  }

  it("saves, reloads, and exports through the standard record schemas", async () => {
    const base = provenanceV1();
    const provenance = Object.freeze({
      ...base,
      resolved: Object.freeze({
        ...base.resolved,
        patchSet: Object.freeze({
          digest: digestV1("patch:hotfixed"),
          simulationDigest: digestV1("patch:simulation:hotfixed"),
          presentationDigest: digestV1("patch:presentation:hotfixed"),
          appliedHotfixes: Object.freeze([
            Object.freeze({
              identity: Object.freeze({
                id: "hotfix.standard",
                revision: parsePositiveSafeInteger(1),
                digest: digestV1("hotfix:standard"),
              }),
              ordinal: parsePositiveSafeInteger(1),
              replacements: Object.freeze([
                Object.freeze({
                  surface: "presentation" as const,
                  symbolId: "symbol.standard",
                  kind: "text" as const,
                  previousProviderDigest: digestV1("provider:previous"),
                  nextProviderDigest: digestV1("provider:next"),
                }),
              ]),
            }),
          ]),
        }),
      }),
    });
    const fixture = await standardFixtureV1(provenance);

    await fixture.session.dispatch({ kind: "increment" });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });

    await fixture.session.dispatch({ kind: "increment" });
    expect(fixture.session.getCurrentSnapshot().commandSequence).toBe(2);
    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "loaded",
      compatibility: "exact",
      commandSequence: 1,
    });
    expect(fixture.session.getCurrentSnapshot().commandSequence).toBe(1);

    const exported = await fixture.service.port.exportCurrentSave();
    expect(exported).toMatchObject({
      filename: "standard-save-20260714120000.json",
      mediaType: "application/json",
    });
    await fixture.service.autoSaveIdle();
  });

  it("passes the normalized stamp through standard composition", async () => {
    let calls = 0;
    const fixture = await standardFixtureV1(provenanceV1(), {
      collectVersionStamp: () => {
        calls += 1;
        return {
          applicationVersion: "1.2.0",
          applicationCommit: "a".repeat(40),
          engineVersion: null,
          engineCommit: null,
        };
      },
    });
    const decoded = decodeSaveRecordV1(
      (await fixture.service.port.exportCurrentSave()).bytes,
      codecV1,
    );
    expect(decoded).toMatchObject({
      kind: "decoded",
      record: {
        versionStamp: {
          applicationVersion: "1.2.0",
          applicationCommit: "a".repeat(40),
        },
      },
    });
    expect(calls).toBe(1);
  });

  it("dates extensionless exports and falls back on an invalid metadata clock", async () => {
    const dated = await standardFixtureV1(provenanceV1(), {
      exportFilename: "standard-save",
    });
    const first = await dated.service.port.exportCurrentSave();
    const second = await dated.service.port.exportCurrentSave();
    expect(first.filename).toBe("standard-save-20260714120000");
    // The UTC second is diagnostic dating, not an in-process uniqueness contract;
    // a Host such as Desktop applies its own no-clobber collision suffix.
    expect(second.filename).toBe(first.filename);
    expect(second.bytes).toEqual(first.bytes);

    let now = "2026-07-14T12:00:00.000Z";
    const invalidClock = await standardFixtureV1(provenanceV1(), {
      exportFilename: "standard-save.json",
      metadataClock: Object.freeze({ now: () => now as IsoUtcInstant }),
    });
    await expect(invalidClock.service.port.save("quick")).resolves.toMatchObject({ kind: "saved" });
    const baseline = await invalidClock.service.port.exportSave("quick");
    if (baseline.kind !== "exported") throw new TypeError("expected baseline export");
    const expectDatedExportV1 = async (instant: string, filename: string) => {
      now = instant;
      const exported = await invalidClock.service.port.exportSave("quick");
      expect(exported).toMatchObject({ kind: "exported", file: { filename } });
      if (exported.kind !== "exported") throw new TypeError("expected dated export");
      expect(exported.file.bytes).toEqual(baseline.file.bytes);
      expect(exported.file.digest).toBe(baseline.file.digest);
    };
    await expectDatedExportV1(
      "2026-02-30T12:00:00.000Z",
      "standard-save-20260302120000.json",
    );
    await expectDatedExportV1(
      "2026-02-30T24:00:00.000Z",
      "standard-save-20260303000000.json",
    );
    await expectDatedExportV1(
      "2026-04-31T12:00:00.000Z",
      "standard-save-20260501120000.json",
    );
    await expectDatedExportV1(
      "2026-12-31T24:00:00.000Z",
      "standard-save-20270101000000.json",
    );
    await expectDatedExportV1(
      "2026-12-31T24:00:00.000001Z",
      "standard-save.json",
    );
    await expectDatedExportV1("0000-01-01T00:00:00Z", "standard-save-00101000000.json");
    await expectDatedExportV1("0001-01-01T00:00:00Z", "standard-save-10101000000.json");
    await expectDatedExportV1(
      "9999-12-31T24:00:00Z",
      "standard-save-100000101000000.json",
    );
    await expectDatedExportV1("not-an-instant", "standard-save.json");
  });

  it("passes one normalized summary through optimized and receipt-fallback standard paths", async () => {
    const optimizedCounter = createSnapshotWorkCounterV1();
    const fallbackCounter = createSnapshotWorkCounterV1();
    let optimizedCalls = 0;
    let fallbackCalls = 0;
    const optimized = await standardFixtureV1(provenanceV1(), {
      instrumentation: optimizedCounter.instrumentation,
      summarizeSave: () => {
        optimizedCalls += 1;
        return ["summary"];
      },
    });
    const fallback = await standardFixtureV1(provenanceV1(), {
      instrumentation: fallbackCounter.instrumentation,
      wrapRepositoryForWriteReceiptFallback: true,
      summarizeSave: () => {
        fallbackCalls += 1;
        return ["summary"];
      },
    });
    optimizedCounter.reset();
    fallbackCounter.reset();

    await expect(optimized.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await expect(fallback.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    expect(optimizedCalls).toBe(1);
    expect(fallbackCalls).toBe(1);
    expect(optimizedCounter.snapshot()).toEqual({
      canonicalTraversals: 4,
      canonicalDigests: 3,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 1,
      strictJsonParses: 1,
      strictJsonPreflights: 0,
    });
    expect(fallbackCounter.snapshot()).toEqual({
      canonicalTraversals: 6,
      canonicalDigests: 4,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 2,
      strictJsonParses: 1,
      strictJsonPreflights: 0,
    });
    const key = createSaveSlotRecordKeyV1(storyIdV1, "quick");
    expect((await optimized.records.read("save", key))?.bytes).toEqual(
      (await fallback.records.read("save", key))?.bytes,
    );
    await Promise.all([optimized.service.autoSaveIdle(), fallback.service.autoSaveIdle()]);
  });

  it("keeps receipt and fallback work equivalent when a fresh Save replaces an invalid Quick slot", async () => {
    const optimizedCounter = createSnapshotWorkCounterV1();
    const fallbackCounter = createSnapshotWorkCounterV1();
    const optimized = await standardFixtureV1(provenanceV1(), {
      instrumentation: optimizedCounter.instrumentation,
    });
    const fallback = await standardFixtureV1(provenanceV1(), {
      instrumentation: fallbackCounter.instrumentation,
      wrapRepositoryForWriteReceiptFallback: true,
    });
    const fixtures = [optimized, fallback] as const;
    const key = createSaveSlotRecordKeyV1(storyIdV1, "quick");

    for (const fixture of fixtures) {
      await expect(fixture.service.port.save("quick")).resolves.toEqual({
        kind: "saved",
        slotId: "quick",
      });
      await tamperStoredQuickV1(fixture.records, (record) => {
        record.slot.storyId = "story.invalid-slot-owner";
      });
      await expect(fixture.service.port.listSlots()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slotId: "quick",
            health: "invalid",
            capturedCommandSequence: null,
          }),
        ]),
      );
      const source = await fixture.records.read("save", key);
      if (source === null) throw new TypeError("missing invalid Quick Save record");
      const snapshotBefore = fixture.session.getCurrentSnapshot();
      await expect(fixture.service.port.load("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });
      expect(fixture.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect(await fixture.records.read("save", key)).toEqual(source);
    }
    optimizedCounter.reset();
    fallbackCounter.reset();

    await expect(optimized.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await expect(fallback.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    expect(optimizedCounter.snapshot()).toEqual({
      canonicalTraversals: 4,
      canonicalDigests: 3,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 1,
      strictJsonParses: 1,
      strictJsonPreflights: 0,
    });
    expect(fallbackCounter.snapshot()).toEqual({
      canonicalTraversals: 6,
      canonicalDigests: 4,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 2,
      strictJsonParses: 1,
      strictJsonPreflights: 0,
    });
    const optimizedPhysical = await optimized.records.read("save", key);
    const fallbackPhysical = await fallback.records.read("save", key);
    expect(optimizedPhysical).toMatchObject({ revision: 3 });
    expect(fallbackPhysical).toMatchObject({ revision: 3 });
    expect(optimizedPhysical?.bytes).toEqual(fallbackPhysical?.bytes);
    for (const fixture of fixtures) {
      await expect(fixture.service.port.listSlots()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slotId: "quick",
            health: "valid",
            recordRevision: 3,
            capturedCommandSequence: 0,
          }),
        ]),
      );
    }
    await Promise.all([optimized.service.autoSaveIdle(), fallback.service.autoSaveIdle()]);
  });

  it("keeps successful Save results and bytes unchanged when the summary observer throws", async () => {
    const observerFailure = new Error("observer failed synchronously");
    const phases: SaveSummaryProjectionEventInternalV1<SyntheticStateV1>["phase"][] = [];
    const control = await standardFixtureV1(provenanceV1(), {
      summarizeSave: () => ["summary"],
    });
    const observed = await standardFixtureV1(provenanceV1(), {
      summarizeSave: () => ["summary"],
      saveSummaryProjectionInstrumentation: Object.freeze({
        record(event: SaveSummaryProjectionEventInternalV1<SyntheticStateV1>) {
          phases.push(event.phase);
          throw observerFailure;
        },
      }),
    });

    const [controlResult, observedResult] = await Promise.all([
      control.service.port.save("quick"),
      observed.service.port.save("quick"),
    ]);

    expect(observedResult).toEqual(controlResult);
    expect(observedResult).toEqual({ kind: "saved", slotId: "quick" });
    expect(phases).toEqual(["before", "returned"]);
    expect(await saveRecordsV1(observed.records)).toEqual(
      await saveRecordsV1(control.records),
    );
    await Promise.all([control.service.autoSaveIdle(), observed.service.autoSaveIdle()]);
  });

  it("keeps successful Save results and bytes unchanged when the summary observer rejects", async () => {
    const observerFailure = new Error("observer rejected");
    const phases: SaveSummaryProjectionEventInternalV1<SyntheticStateV1>["phase"][] = [];
    const control = await standardFixtureV1(provenanceV1(), {
      summarizeSave: () => ["summary"],
    });
    const observed = await standardFixtureV1(provenanceV1(), {
      summarizeSave: () => ["summary"],
      saveSummaryProjectionInstrumentation: Object.freeze({
        record(event: SaveSummaryProjectionEventInternalV1<SyntheticStateV1>) {
          phases.push(event.phase);
          return Promise.reject(observerFailure);
        },
      }),
    });

    const [controlResult, observedResult] = await Promise.all([
      control.service.port.save("quick"),
      observed.service.port.save("quick"),
    ]);

    expect(observedResult).toEqual(controlResult);
    expect(observedResult).toEqual({ kind: "saved", slotId: "quick" });
    expect(phases).toEqual(["before", "returned"]);
    expect(await saveRecordsV1(observed.records)).toEqual(
      await saveRecordsV1(control.records),
    );
    await Promise.all([control.service.autoSaveIdle(), observed.service.autoSaveIdle()]);
  });

  it("reports the original summary projector error without changing Save failure semantics", async () => {
    const projectionFailure = new Error("summary projection failed");
    const observerFailure = new Error("observer failed while recording throw");
    const events: SaveSummaryProjectionEventInternalV1<SyntheticStateV1>[] = [];
    const summarizeSave = () => {
      throw projectionFailure;
    };
    const control = await standardFixtureV1(provenanceV1(), { summarizeSave });
    const observed = await standardFixtureV1(provenanceV1(), {
      summarizeSave,
      saveSummaryProjectionInstrumentation: Object.freeze({
        record(event: SaveSummaryProjectionEventInternalV1<SyntheticStateV1>) {
          events.push(event);
          if (event.phase === "threw") throw observerFailure;
        },
      }),
    });

    const [controlResult, observedResult] = await Promise.all([
      control.service.port.save("quick"),
      observed.service.port.save("quick"),
    ]);

    expect(controlResult).toEqual({
      kind: "faulted",
      code: "persistence.capture_failed",
    });
    expect(observedResult).toEqual(controlResult);
    expect(events.map((event) => event.phase)).toEqual(["before", "threw"]);
    const threw = events[1];
    expect(threw?.phase).toBe("threw");
    if (threw?.phase === "threw") expect(threw.error).toBe(projectionFailure);
    expect(await saveRecordsV1(control.records)).toEqual([]);
    expect(await saveRecordsV1(observed.records)).toEqual([]);
    await Promise.all([control.service.autoSaveIdle(), observed.service.autoSaveIdle()]);
  });

  it("keeps annotation bytes equivalent while measuring receipt and fallback work", async () => {
    const optimizedCounter = createSnapshotWorkCounterV1();
    const fallbackCounter = createSnapshotWorkCounterV1();
    let optimizedSummaryCalls = 0;
    let fallbackSummaryCalls = 0;
    const optimized = await standardFixtureV1(provenanceV1(), {
      instrumentation: optimizedCounter.instrumentation,
      summarizeSave: () => {
        optimizedSummaryCalls += 1;
        return ["summary"];
      },
    });
    const fallback = await standardFixtureV1(provenanceV1(), {
      instrumentation: fallbackCounter.instrumentation,
      wrapRepositoryForWriteReceiptFallback: true,
      summarizeSave: () => {
        fallbackSummaryCalls += 1;
        return ["summary"];
      },
    });
    await Promise.all([optimized.service.port.save("quick"), fallback.service.port.save("quick")]);
    optimizedCounter.reset();
    fallbackCounter.reset();

    await expect(optimized.service.port.annotateSave("quick", "note")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await expect(fallback.service.port.annotateSave("quick", "note")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    expect(optimizedSummaryCalls).toBe(1);
    expect(fallbackSummaryCalls).toBe(1);
    expect(optimizedCounter.snapshot()).toEqual({
      canonicalTraversals: 6,
      canonicalDigests: 5,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 1,
      strictJsonParses: 2,
      strictJsonPreflights: 0,
    });
    expect(fallbackCounter.snapshot()).toEqual({
      canonicalTraversals: 8,
      canonicalDigests: 6,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 2,
      strictJsonParses: 2,
      strictJsonPreflights: 0,
    });
    const key = createSaveSlotRecordKeyV1(storyIdV1, "quick");
    expect((await optimized.records.read("save", key))?.bytes).toEqual(
      (await fallback.records.read("save", key))?.bytes,
    );
    await Promise.all([optimized.service.autoSaveIdle(), fallback.service.autoSaveIdle()]);
  });

  it("rejects loading a stored record whose slot identity was tampered", async () => {
    const fixture = await standardFixtureV1();
    await fixture.session.dispatch({ kind: "increment" });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await tamperStoredQuickV1(fixture.records, (record) => {
      record.slot.storyId = "story.other";
    });

    const snapshotBefore = fixture.session.getCurrentSnapshot();
    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "rejected",
      code: "invalid_record",
    });
    expect(fixture.session.getCurrentSnapshot()).toBe(snapshotBefore);
    await fixture.service.autoSaveIdle();
  });

  it("rejects loading a stored record whose simulation lineage chain is broken", async () => {
    const fixture = await standardFixtureV1();
    await fixture.session.dispatch({ kind: "increment" });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await tamperStoredQuickV1(fixture.records, (record) => {
      record.simulationLineage = [
        {
          fromSimulationDigest: digestV1("lineage:broken"),
          toSimulationDigest: digestV1("lineage:not-current"),
          viaSimulationPatchSetDigest: digestV1("lineage-patch:broken"),
          adoptedAtCommandSequence: 0,
        },
      ];
    });

    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "rejected",
      code: "invalid_record",
    });
    expect(fixture.session.getCurrentSnapshot().commandSequence).toBe(1);
    await fixture.service.autoSaveIdle();
  });

  it("rejects loading a stored record whose patch set shape is malformed", async () => {
    const fixture = await standardFixtureV1();
    await fixture.session.dispatch({ kind: "increment" });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await tamperStoredQuickV1(fixture.records, (record) => {
      delete record.provenance.resolved.patchSet.appliedHotfixes;
    });

    await expect(fixture.service.port.load("quick")).resolves.toEqual({
      kind: "rejected",
      code: "invalid_record",
    });
    expect(fixture.session.getCurrentSnapshot().commandSequence).toBe(1);
    await fixture.service.autoSaveIdle();
  });

  it("captures the application summary into saves and lists it as annotation", async () => {
    const fixture = await fixtureV1({
      summarizeSave: (state) => Object.freeze([`count ${String(state.count)}`, "line 2"]),
    });
    await fixture.session.dispatch({ kind: "increment" });
    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });

    const slots = await fixture.service.port.listSlots();
    const quick = slots.find((slot) => slot.slotId === "quick");
    expect(quick?.annotation).toEqual({
      summary: ["count 1", "line 2"],
      note: null,
    });

    // Saves without a projector keep records annotation-free.
    const bare = await fixtureV1();
    await expect(bare.service.port.save("quick")).resolves.toMatchObject({
      kind: "saved",
    });
    const bareSlots = await bare.service.port.listSlots();
    expect(bareSlots.find((slot) => slot.slotId === "quick")?.annotation).toBeNull();
    await fixture.service.autoSaveIdle();
    await bare.service.autoSaveIdle();
  });

  it("captures one detached summary value and treats an empty summary as absent", async () => {
    const delayed = createDelayedSaveStoreV1();
    const projected = ["capture value"];
    let calls = 0;
    const fixture = await fixtureV1({
      records: delayed.records,
      summarizeSave() {
        calls += 1;
        return projected;
      },
    });
    delayed.blockSaveWrites();
    const saving = fixture.service.port.save("quick");
    projected[0] = "mutated value";
    projected.push("late line");
    await delayed.waitUntilWriteStarts();
    delayed.releaseWrites();

    await expect(saving).resolves.toEqual({ kind: "saved", slotId: "quick" });
    expect(calls).toBe(1);
    const stored = await fixture.repository.read("quick");
    expect(stored).toMatchObject({
      health: "valid",
      record: { annotation: { summary: ["capture value"], note: null } },
    });

    const empty = await fixtureV1({ summarizeSave: () => [] });
    await expect(empty.service.port.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    const emptyStored = await empty.repository.read("quick");
    expect(emptyStored).toMatchObject({ health: "valid" });
    if (emptyStored.health === "valid") {
      expect(emptyStored.record).not.toHaveProperty("annotation");
    }
    await Promise.all([fixture.service.autoSaveIdle(), empty.service.autoSaveIdle()]);
  });

  it("rejects failed or invalid summaries before writing any Save bytes", async () => {
    const throwing = await fixtureV1({
      summarizeSave() {
        throw new TypeError("summary failed");
      },
    });
    await expect(throwing.service.port.save("quick")).resolves.toEqual({
      kind: "faulted",
      code: "persistence.capture_failed",
    });
    expect(await saveRecordsV1(throwing.records)).toEqual([]);
    await throwing.service.autoSaveIdle();

    let undefinedCalls = 0;
    const undefinedOutput = await fixtureV1({
      summarizeSave() {
        undefinedCalls += 1;
        return undefined as never;
      },
    });
    await expect(undefinedOutput.service.port.save("quick")).resolves.toEqual({
      kind: "faulted",
      code: "persistence.capture_failed",
    });
    expect(undefinedCalls).toBe(1);
    expect(await saveRecordsV1(undefinedOutput.records)).toEqual([]);
    await undefinedOutput.service.autoSaveIdle();
  });

  it("annotateSave edits only the note and the record stays loadable", async () => {
    const fixture = await fixtureV1({
      summarizeSave: (state) => Object.freeze([`count ${String(state.count)}`]),
    });
    await fixture.session.dispatch({ kind: "increment" });
    await expect(fixture.service.port.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    const before = await fixture.repository.read("manual.1");
    expect(before.health).toBe("valid");

    await expect(fixture.service.port.annotateSave("manual.1", " 存主线前 ")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    const slots = await fixture.service.port.listSlots();
    const manual = slots.find((slot) => slot.slotId === "manual.1");
    expect(manual?.annotation).toEqual({
      summary: ["count 1"],
      note: "存主线前",
    });
    if (before.health === "valid") {
      const after = await fixture.repository.read("manual.1");
      expect(after.health).toBe("valid");
      if (after.health === "valid") {
        const {
          recordRevision: beforeRevision,
          annotation: beforeAnnotation,
          ...beforeStableFields
        } = before.record;
        const {
          recordRevision: afterRevision,
          annotation: afterAnnotation,
          ...afterStableFields
        } = after.record;
        expect(afterRevision).toBe(Number(beforeRevision) + 1);
        expect(beforeAnnotation).toEqual({ summary: ["count 1"], note: null });
        expect(afterAnnotation).toEqual({
          summary: ["count 1"],
          note: "存主线前",
        });
        expect(afterStableFields).toEqual(beforeStableFields);
      }
    }
    await expect(fixture.service.port.load("manual.1")).resolves.toMatchObject({
      kind: "loaded",
    });

    // Empty string clears the note but keeps the summary.
    await expect(fixture.service.port.annotateSave("manual.1", "")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    const cleared = await fixture.service.port.listSlots();
    expect(cleared.find((slot) => slot.slotId === "manual.1")?.annotation).toEqual({
      summary: ["count 1"],
      note: null,
    });
    await fixture.service.autoSaveIdle();
  });

  it("does not let annotateSave overwrite a newer Save record", async () => {
    let injectedNewerBytes: Uint8Array | undefined;
    const fixture = await fixtureV1({
      decorateRepository(repository) {
        let injectNewerSave = true;
        return Object.freeze({
          ...repository,
          async rewritePlayer(
            ...arguments_: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["rewritePlayer"]>
          ) {
            if (injectNewerSave) {
              injectNewerSave = false;
              const [slotId, , , fence] = arguments_;
              await repository.writePlayer(
                slotId,
                recordV1({ snapshot: snapshotV1(9), slotId }),
                fence,
              );
              const injected = await repository.read(slotId);
              if (injected.health !== "valid") {
                throw new TypeError("failed to observe injected newer Save");
              }
              injectedNewerBytes = Uint8Array.from(injected.bytes);
            }
            return repository.rewritePlayer(...arguments_);
          },
        });
      },
    });
    await expect(fixture.service.port.save("manual.1")).resolves.toMatchObject({
      kind: "saved",
    });

    await expect(fixture.service.port.annotateSave("manual.1", "stale note")).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "conflict",
    });
    const stored = await fixture.repository.read("manual.1");
    expect(stored).toMatchObject({
      health: "valid",
      record: { snapshot: { commandSequence: 9 } },
    });
    if (stored.health === "valid") {
      expect(stored.record).not.toHaveProperty("annotation");
      expect(stored.bytes).toEqual(injectedNewerBytes);
    }
    await fixture.service.autoSaveIdle();
  });

  it("verifies annotateSave physical bytes and the accepted lease fence", async () => {
    let contender: SessionLeaseV1 | undefined;
    const fenceLoss = await fixtureV1({
      decorateRepository(repository, _lease, records) {
        contender = createSessionLeaseV1({
          records,
          storyId: storyIdV1,
          ownerId: "owner.annotation-contender" as SessionLeaseOwnerId,
          nextHandoffRequestId: () => "handoff.annotation-contender" as never,
        });
        return Object.freeze({
          ...repository,
          async rewritePlayer(
            ...arguments_: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["rewritePlayer"]>
          ) {
            const result = await repository.rewritePlayer(...arguments_);
            if (result.kind === "saved") await contender?.takeOver();
            return result;
          },
        });
      },
    });
    await expect(fenceLoss.service.port.save("quick")).resolves.toMatchObject({
      kind: "saved",
    });
    await expect(fenceLoss.service.port.annotateSave("quick", "note")).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await expect(fenceLoss.repository.read("quick")).resolves.toMatchObject({
      health: "valid",
      record: { annotation: { summary: null, note: "note" } },
    });

    let tamperRead = false;
    const byteTamper = await fixtureV1({
      decorateRepository(repository) {
        return Object.freeze({
          ...repository,
          async read(slotId: Parameters<typeof repository.read>[0]) {
            const observed = await repository.read(slotId);
            if (!tamperRead || observed.health !== "valid") return observed;
            return Object.freeze({
              ...observed,
              bytes: Uint8Array.from([...observed.bytes, 0x20]),
            });
          },
          async rewritePlayer(
            ...arguments_: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["rewritePlayer"]>
          ) {
            const result = await repository.rewritePlayer(...arguments_);
            if (result.kind === "saved") tamperRead = true;
            return result;
          },
        });
      },
    });
    await expect(byteTamper.service.port.save("quick")).resolves.toMatchObject({
      kind: "saved",
    });
    await expect(byteTamper.service.port.annotateSave("quick", "note")).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await Promise.all([fenceLoss.service.autoSaveIdle(), byteTamper.service.autoSaveIdle()]);
  });

  it("preserves the storage failure code when annotation readback is unavailable", async () => {
    let unavailable = false;
    const fixture = await fixtureV1({
      decorateRepository(repository) {
        return Object.freeze({
          ...repository,
          async read(slotId: Parameters<typeof repository.read>[0]) {
            if (unavailable) {
              return Object.freeze({
                health: "unavailable" as const,
                slotId,
                hostRevision: null,
                record: null,
                code: "indexeddb.quota_exceeded",
              });
            }
            return repository.read(slotId);
          },
          async rewritePlayer(
            ...arguments_: Parameters<SaveRepositoryV1<SyntheticSaveRecordV1>["rewritePlayer"]>
          ) {
            const result = await repository.rewritePlayer(...arguments_);
            if (result.kind === "saved") unavailable = true;
            return result;
          },
        });
      },
    });
    await expect(fixture.service.port.save("quick")).resolves.toMatchObject({
      kind: "saved",
    });

    await expect(fixture.service.port.annotateSave("quick", "note")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "indexeddb.quota_exceeded",
    });
    await fixture.service.autoSaveIdle();
  });

  it("preserves a pending migration backup across every existing service path", async () => {
    const fixture = await fixtureV1();
    await expect(fixture.service.port.save("quick")).resolves.toMatchObject({ kind: "saved" });
    const source = await fixture.repository.read("quick");
    if (source.health !== "valid") throw new TypeError("expected a service migration source");
    const fence = await ownedFenceV1(fixture);
    await expect(
      fixture.repository.rewriteWithMigrationBackup(
        "quick",
        Object.freeze({ hostRevision: source.hostRevision, bytes: source.bytes }),
        recordV1({ snapshot: snapshotV1(1), slotId: "quick" }),
        fence,
      ),
    ).resolves.toEqual({ kind: "saved", slotId: "quick", recordRevision: 2 });
    const backupKey = createSaveMigrationBackupRecordKeyV1(storyIdV1, "quick");
    const backup = await fixture.records.read("save", backupKey);
    if (backup === null) throw new TypeError("expected a pending service backup");
    const expectBackupUnchangedV1 = async () => {
      expect(await fixture.records.read("save", backupKey)).toEqual(backup);
    };

    await fixture.service.port.listSlots();
    await expectBackupUnchangedV1();
    await fixture.service.port.inspectSave("quick");
    await expectBackupUnchangedV1();
    await expect(fixture.service.port.exportSave("quick")).resolves.toMatchObject({
      kind: "exported",
    });
    await expectBackupUnchangedV1();
    await expect(fixture.service.port.load("quick")).resolves.toMatchObject({ kind: "loaded" });
    await expectBackupUnchangedV1();
    await expect(fixture.service.port.annotateSave("quick", "pending backup")).resolves
      .toMatchObject(
        { kind: "saved" },
      );
    await expectBackupUnchangedV1();
    await expect(fixture.service.port.save("quick")).resolves.toMatchObject({ kind: "saved" });
    await expectBackupUnchangedV1();

    fixture.service.captureAutoSave(fixture.session.getCurrentSnapshot());
    await fixture.service.autoSaveIdle();
    await expectBackupUnchangedV1();
    await expect(fixture.service.port.importSave(backup.bytes)).resolves.toMatchObject({
      kind: "imported",
    });
    await expectBackupUnchangedV1();
    await fixture.service.port.exportCurrentSave();
    await expectBackupUnchangedV1();
    await expect(fixture.service.port.clear("quick")).resolves.toEqual({
      kind: "cleared",
      slotId: "quick",
    });
    await expectBackupUnchangedV1();
  });

  it("annotateSave rejects invalid notes and empty slots", async () => {
    const fixture = await fixtureV1();
    await expect(fixture.service.port.annotateSave("manual.1", "x".repeat(65))).resolves.toEqual({
      kind: "rejected",
      code: "invalid_note",
    });
    await expect(fixture.service.port.annotateSave("manual.1", "note")).resolves.toEqual({
      kind: "rejected",
      code: "empty_slot",
    });

    // A note on a summary-less record round-trips, and clearing it removes
    // the annotation field entirely (byte shape matches a fresh save).
    await fixture.session.dispatch({ kind: "increment" });
    await expect(fixture.service.port.save("quick")).resolves.toMatchObject({
      kind: "saved",
    });
    await expect(fixture.service.port.annotateSave("quick", "note")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    const slots = await fixture.service.port.listSlots();
    expect(slots.find((slot) => slot.slotId === "quick")?.annotation).toEqual({
      summary: null,
      note: "note",
    });
    await expect(fixture.service.port.annotateSave("quick", " ")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    const cleared = await fixture.service.port.listSlots();
    expect(cleared.find((slot) => slot.slotId === "quick")?.annotation).toBeNull();
    await fixture.service.autoSaveIdle();
  });
});
