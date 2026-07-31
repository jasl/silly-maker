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
  captureAutoSaveWithReceiptInternalV1,
  createInstrumentedPersistenceServiceV1,
  createPersistenceServiceV1,
  fencePersistencePlayerMutationsInternalV1,
} from "./persistence-service.ts";
import { createSaveRepositoryV1 } from "./save-repository.ts";
import type { SaveRepositorySlotMetadataV1, SaveRepositoryV1 } from "./save-repository.ts";
import { createSessionLeaseV1 } from "./session-lease.ts";
import type { SessionLeaseV1 } from "./session-lease.ts";
import { createSaveSlotRecordKeyV1 } from "./slot-keys.ts";

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
  readonly fact: { readonly count: NonNegativeSafeInteger };
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

function exactObjectV1(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).toSorted().join("\0") !== [...keys].toSorted().join("\0") ||
    Object.values(descriptors).some(({ get, set }) => get !== undefined || set !== undefined)
  ) {
    throw new TypeError("invalid object fields");
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
    ),
  );
}

const stateSchemaV1: RuntimeSchemaV1<SyntheticStateV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["count", "referenceId"]);
    if (typeof fields.referenceId !== "string") {
      throw new TypeError("invalid reference ID");
    }
    return Object.freeze({
      count: parseNonNegativeSafeInteger(fields.count),
      referenceId: fields.referenceId,
    });
  },
});

const rngSchemaV1: RuntimeSchemaV1<SyntheticRngV1> = Object.freeze({
  parse(value: unknown) {
    const fields = exactObjectV1(value, ["cursor"]);
    return Object.freeze({
      cursor: parseNonNegativeSafeInteger(fields.cursor),
    });
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
    return Object.freeze({
      storyId: fields.storyId,
      slotId: fields.slotId,
      writeReason: fields.writeReason,
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    });
  },
});
const lineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown) {
    if (!Array.isArray(value)) {
      throw new TypeError("invalid simulation lineage");
    }
    return Object.freeze(value) as readonly SimulationAdoptionV1[];
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
      facts: Object.freeze([{ count: next.state.count }]),
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

function failReplacementCommitV1(
  control: GameSessionRuntimeControlV1<SyntheticSnapshotV1>,
): GameSessionRuntimeControlV1<SyntheticSnapshotV1> {
  return Object.freeze({
    ...control,
    enqueueAuthoritative<TResult>(
      operation: (
        current: DeepReadonly<SyntheticSnapshotV1>,
      ) => Promise<AuthoritativeOutcomeV1<SyntheticSnapshotV1, TResult>>,
      normalizeUnexpectedFault: (error: unknown) => TResult,
      prepareReplacementCommit?: (
        snapshot: DeepReadonly<SyntheticSnapshotV1>,
        anchor: "preserve_log" | "replace_replay_base",
      ) => void,
    ): Promise<TResult> {
      return control.enqueueAuthoritative(
        operation,
        normalizeUnexpectedFault,
        prepareReplacementCommit === undefined ? undefined : () => {
          throw new Error("replacement callback failed");
        },
      );
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
  readonly adoptionDeclaration?: PatchSetAdoptionDeclarationV1 | null;
  readonly initialLineage?: readonly SimulationAdoptionV1[];
  readonly failReplacementCommit?: boolean;
  summarizeSave?(state: DeepReadonly<SyntheticStateV1>): readonly string[] | null;
  decorateRepository?(
    repository: SaveRepositoryV1<SyntheticSaveRecordV1>,
    lease: SessionLeaseV1,
    records: HostAtomicRecordStoreV1,
  ): SaveRepositoryV1<SyntheticSaveRecordV1>;
  decorateLease?(lease: SessionLeaseV1, records: HostAtomicRecordStoreV1): SessionLeaseV1;
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
    classifyCompatibility(record: DeepReadonly<SyntheticSaveRecordV1>) {
      return classifySaveCompatibilityV1({
        stored: record.provenance,
        current: provenance,
        simulationLineage: record.simulationLineage,
        adoptionDeclaration: options.adoptionDeclaration ?? null,
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    },
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
    runtimeControl: options.failReplacementCommit === true
      ? failReplacementCommitV1(created.runtimeControl)
      : created.runtimeControl,
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

  it("exposes a frozen current-lineage snapshot only on the internal service", async () => {
    const initialLineage = lineageV1(1, provenanceV1().resolved.simulationDigest);
    const fixture = await fixtureV1({ initialLineage });

    const observed = fixture.service.getSimulationLineage();
    expect(observed).toEqual(initialLineage);
    expect(observed).not.toBe(initialLineage);
    expect(Object.isFrozen(observed)).toBe(true);
    expect(fixture.service.port).not.toHaveProperty("getSimulationLineage");

    fixture.service.establishAnchor(snapshotV1(3), Object.freeze([]));
    expect(fixture.service.getSimulationLineage()).toEqual([]);
    expect(observed).toEqual(initialLineage);
  });

  it("disposes in-flight Auto state before exact-fence release and transfers once", async () => {
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
    const firstDisposal = fixture.service.disposeForRebootstrap();
    const repeatedDisposal = fixture.service.disposeForRebootstrap();
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
    const disposition = await firstDisposal;
    await expect(queuedSave).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    expect(disposition).toEqual({
      ownership: "released",
      code: null,
      fence: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    await expect(repeatedDisposal).resolves.toBe(disposition);
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
    });
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(replacement.service.port.lease.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    const takeover = await replacement.service.takeOverForRebootstrap(disposition);
    expect(takeover).toEqual({
      ownership: "writable",
      code: null,
      fence: {
        ownerId: "owner.persistence-service-replacement",
        fencingToken: 2,
      },
    });
    await expect(replacement.service.takeOverForRebootstrap(disposition)).resolves.toBe(takeover);
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
    const disposal = oldRuntime.service.disposeForRebootstrap();
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
    const disposition = await resolveWithinV1(disposal);
    expect(disposition).toEqual({
      ownership: "released",
      code: null,
      fence: { ownerId: ownerIdV1, fencingToken: 2 },
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
    await expect(successor.service.takeOverForRebootstrap(disposition)).resolves.toEqual({
      ownership: "writable",
      code: null,
      fence: {
        ownerId: "owner.persistence-service-successor",
        fencingToken: 3,
      },
    });
  });

  it("drains an in-flight public release and preserves its strict successor fence", async () => {
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
    const disposal = oldRuntime.service.disposeForRebootstrap();
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
    const disposition = await resolveWithinV1(disposal);
    expect(disposition).toEqual({
      ownership: "released",
      code: null,
      fence: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    await expect(oldRuntime.lease.getStatus()).resolves.toEqual({
      kind: "unowned",
      ownerId: null,
      fencingToken: 1,
    });

    const successor = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-successor" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
    });
    await expect(successor.service.takeOverForRebootstrap(disposition)).resolves.toEqual({
      ownership: "writable",
      code: null,
      fence: {
        ownerId: "owner.persistence-service-successor",
        fencingToken: 2,
      },
    });
  });

  it("finishes disposal after a rejected stale-write repair instead of waiting for future work", async () => {
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

    const disposal = fixture.service.disposeForRebootstrap();
    releaseFirstWrite?.();
    const disposition = await resolveWithinV1(disposal);

    expect(autoWriteCalls).toBe(2);
    expect(disposition).toEqual({
      ownership: "released",
      code: null,
      fence: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    await expect(disposal).resolves.toBe(disposition);
  });

  it("keeps both runtimes read-only with stable release failure and skips takeover", async () => {
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
    const disposition = await oldRuntime.service.disposeForRebootstrap();
    expect(disposition).toEqual({
      ownership: "read_only",
      code: "lease_release_failed",
      fence: null,
    });
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

    let takeoverCalls = 0;
    const replacement = await fixtureV1({
      records,
      ownerId: "owner.persistence-service-replacement" as SessionLeaseOwnerId,
      leaseAcquisition: "deferred_rebootstrap",
      decorateLease(lease) {
        return Object.freeze({
          ...lease,
          async takeOverUnowned(
            expectedFencingToken: Parameters<SessionLeaseV1["takeOverUnowned"]>[0],
          ) {
            takeoverCalls += 1;
            return lease.takeOverUnowned(expectedFencingToken);
          },
        });
      },
    });
    const takeover = await replacement.service.takeOverForRebootstrap(disposition);
    expect(takeover).toEqual({
      ownership: "read_only",
      code: "lease_release_failed",
      fence: null,
    });
    await expect(replacement.service.takeOverForRebootstrap(disposition)).resolves.toBe(takeover);
    expect(takeoverCalls).toBe(0);
    await expect(replacement.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_release_failed",
    });
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await expect(replacement.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_release_failed",
    });
    await expect(replacement.service.port.lease.takeOver()).resolves.toEqual({
      kind: "rejected",
      code: "conflict",
    });
    await expect(replacement.service.port.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
  });

  it("reports a stable takeover failure after a successful release", async () => {
    const records = createMemoryHostRecordStoreV1();
    const oldRuntime = await fixtureV1({ records });
    const disposition = await oldRuntime.service.disposeForRebootstrap();
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

    await expect(replacement.service.takeOverForRebootstrap(disposition)).resolves.toEqual({
      ownership: "read_only",
      code: "lease_takeover_failed",
      fence: null,
    });
    await expect(replacement.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_takeover_failed",
    });
    await expect(replacement.service.port.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "unavailable",
    });
    await replacement.session.dispatch({ kind: "increment" });
    await replacement.service.autoSaveIdle();
    expect(replacement.session.getCurrentSnapshot().state.count).toBe(1);
    await expect(replacement.service.port.getStatus()).resolves.toMatchObject({
      lastFailureCode: "lease_takeover_failed",
    });
    await expect(replacement.service.port.exportCurrentSave()).resolves.toMatchObject({
      mediaType: "application/json",
    });
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

    // Written records and exports carry one normalized, frozen capture-origin
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
    if (exported.kind === "decoded") {
      expect(Object.isFrozen(exported.record.versionStamp)).toBe(true);
    }
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

  it("normalizes a failing or hostile stamp collector before lease acquisition", async () => {
    const events: string[] = [];
    let getterCalls = 0;
    const hostile = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(hostile, "applicationVersion", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "must-not-run";
      },
    });
    const malformed = await fixtureV1({
      collectVersionStamp: () => {
        events.push("collect");
        return hostile as unknown as VersionStampV1;
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
    expect(getterCalls).toBe(0);
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
    const released = await first.service.disposeForRebootstrap();
    expect(released).toMatchObject({
      ownership: "released",
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
    await expect(second.service.takeOverForRebootstrap(released)).resolves.toMatchObject({
      ownership: "writable",
    });
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
      adoptionDeclaration: adoptionDeclarationV1(stored, adoptedCurrent),
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
      adoptionDeclaration: adoptionDeclarationV1(stored, adoptedCurrent),
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
    expect(Object.isFrozen(fixture.service.getSimulationLineage())).toBe(true);
    expect(await saveRecordsV1(fixture.records)).toEqual(before);
    const exported = await fixture.service.port.exportCurrentSave();
    const decoded = decodeSaveRecordV1(exported.bytes, codecV1);
    expect(decoded).toMatchObject({
      kind: "decoded",
      record: { simulationLineage: lineage },
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
      adoptionDeclaration: adoptionDeclarationV1(stored, current),
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
      adoptionDeclaration: adoptionDeclarationV1(stored, current),
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

  it("preserves the CommandLog anchor when the replacement callback fails", async () => {
    const fixture = await fixtureV1({ failReplacementCommit: true });
    await expect(fixture.session.dispatch({ kind: "increment" })).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    await fixture.service.autoSaveIdle();
    const snapshotBefore = fixture.session.getCurrentSnapshot();
    const replayBaseBefore = fixture.commandLog.replayBase();
    const entriesBefore = fixture.commandLog.entries();
    expect(entriesBefore).toHaveLength(1);
    const replacement = recordV1({ snapshot: snapshotV1(9) });

    await expect(
      fixture.service.port.importSave(encodeSaveRecordV1(replacement, codecV1)),
    ).resolves.toEqual({ kind: "faulted", code: "persistence.unexpected" });

    expect(fixture.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(fixture.commandLog.replayBase()).toBe(replayBaseBefore);
    expect(fixture.commandLog.entries()).toBe(entriesBefore);
  });

  it("keeps a lineage-limited physical Save available for inspection and export", async () => {
    const stored = provenanceV1({ simulation: "simulation.old", patch: "old" });
    const current = provenanceV1({
      simulation: "simulation.new",
      patch: "new",
    });
    const fixture = await fixtureV1({
      provenance: current,
      adoptionDeclaration: adoptionDeclarationV1(stored, current),
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
      adoptionDeclaration: null,
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
    const service = options.instrumentation === undefined
      ? await createPersistenceServiceV1(serviceOptions)
      : await createInstrumentedPersistenceServiceV1(
        serviceOptions,
        options.instrumentation,
        options.wrapRepositoryForWriteReceiptFallback === true
          ? { wrapRepositoryForWriteReceiptFallback: true }
          : undefined,
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
    now = "not-an-instant";
    await expect(invalidClock.service.port.exportSave("quick")).resolves.toMatchObject({
      kind: "exported",
      file: { filename: "standard-save.json" },
    });
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
      canonicalTraversals: 3,
      canonicalDigests: 2,
      deepFreezeTraversals: 0,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 1,
      strictJsonParses: 1,
      strictJsonPreflights: 0,
    });
    expect(fallbackCounter.snapshot()).toEqual({
      canonicalTraversals: 5,
      canonicalDigests: 3,
      deepFreezeTraversals: 0,
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
      canonicalTraversals: 4,
      canonicalDigests: 3,
      deepFreezeTraversals: 0,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 1,
      strictJsonParses: 2,
      strictJsonPreflights: 0,
    });
    expect(fallbackCounter.snapshot()).toEqual({
      canonicalTraversals: 6,
      canonicalDigests: 4,
      deepFreezeTraversals: 0,
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

  it("captures one immutable summary value and treats an empty summary as absent", async () => {
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

  it("rejects unsafe summary arrays before writing any Save bytes", async () => {
    const accessorSummary = ["line"];
    let reads = 0;
    Object.defineProperty(accessorSummary, "0", {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return "accessed";
      },
    });
    const fixture = await fixtureV1({ summarizeSave: () => accessorSummary });

    await expect(fixture.service.port.save("quick")).resolves.toEqual({
      kind: "faulted",
      code: "persistence.capture_failed",
    });
    expect(reads).toBe(0);
    expect(await saveRecordsV1(fixture.records)).toEqual([]);
    await fixture.service.autoSaveIdle();

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
