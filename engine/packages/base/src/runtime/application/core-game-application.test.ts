// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { RuntimeCapabilitiesV1 } from "../../contracts/application.ts";
import { canonicalJsonBytes } from "../../contracts/canonical-json.ts";
import type {
  DebugBundleEnvelopeV1,
  RuntimeOperationFaultV1,
} from "../../contracts/diagnostics.ts";
import {
  createDebugBundleEnvelopeSchemaV1,
  debugBundleJsonLimitsV1,
  runtimeOperationFaultSchemaV1,
} from "../../contracts/diagnostics.ts";
import { digestBytes, digestCanonical } from "../../contracts/digest.ts";
import { commitAttemptV1 } from "../../contracts/execution.ts";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../../contracts/host.ts";
import { createMemoryHostRecordStoreV1 } from "../../contracts/host.ts";
import type { SessionLeaseOwnerId } from "../../contracts/application.ts";
import { createTransactionalRngV1, rngStateV1Schema } from "../../contracts/rng.ts";
import { createGameSnapshotEnvelopeSchemaV1 } from "../../contracts/snapshot.ts";
import { parseStrictJson } from "../../contracts/strict-json.ts";
import type { RuntimeSchemaV1 } from "../../contracts/values.ts";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../../contracts/values.ts";
import { createFixedBootstrapEntropyV1 } from "../../testkit/fixed-bootstrap-entropy.ts";
import { deterministicBuildIdentityInputV1 } from "../../testkit/resolver-fixtures.ts";
import type {
  SyntheticCounterCommandV1,
  SyntheticSimulationTypesV1,
} from "../../testkit/synthetic-counter.ts";
import { createSyntheticCounterGamePackageV1 } from "../../testkit/synthetic-counter.ts";
import {
  createGameDiagnosticsServiceV1,
  decodeDebugBundleV1,
  encodeDebugBundleV1,
  type DebugBundleCodecContextV1,
} from "../diagnostics/debug-bundle.ts";
import type {
  CoreApplicationHostServicesV1,
  CoreAutosavePolicyV1,
  CoreSchedulerV1,
  CoreSemanticAdapterV1,
} from "./core-game-application.ts";
import {
  createCoreGameApplicationInstanceV1,
  defineCoreGameApplicationV1,
  resolveCoreGameApplicationV1,
} from "./core-game-application.ts";

interface SyntheticQueriesV1 {
  readonly count: number;
}

interface SyntheticInvocationV1 {
  readonly kind: "invoke";
  readonly actionId: SyntheticCounterCommandV1["kind"];
}

type SyntheticResultV1 =
  | { readonly kind: "committed"; readonly count: number }
  | { readonly kind: "rejected" }
  | { readonly kind: "faulted" }
  | { readonly kind: "not_executed"; readonly code: string };

interface DebugCounterCommandV1 {
  readonly kind: "debug.synthetic.add";
  readonly amount: number;
}

type DebugSyntheticSimulationTypesV1 = Omit<SyntheticSimulationTypesV1, "debugCommand"> & {
  readonly debugCommand: DebugCounterCommandV1;
};

type SyntheticSnapshotV1 = DebugSyntheticSimulationTypesV1["snapshot"];
type SyntheticEquivalenceDebugBundleV1 = DebugBundleEnvelopeV1<
  Record<string, unknown>,
  RuntimeCapabilitiesV1,
  readonly string[],
  SyntheticSnapshotV1,
  unknown,
  { readonly codes: readonly string[] },
  RuntimeOperationFaultV1,
  never,
  never
>;

interface SyntheticEquivalenceExtensionsV1 {
  readonly diagnostics: {
    exportDebugBundle(): Promise<{
      readonly filename: string;
      readonly mediaType: "application/json";
      readonly digest: ReturnType<typeof digestBytes>;
      readonly bytes: Uint8Array;
    }>;
  };
  readonly codec: DebugBundleCodecContextV1<SyntheticSnapshotV1, SyntheticEquivalenceDebugBundleV1>;
  anchorDebugBundle(snapshot: SyntheticSnapshotV1): Promise<
    | { readonly kind: "anchored" }
    | { readonly kind: "faulted" }
    | { readonly kind: "capability_disabled" }
    | {
        readonly kind: "not_executed";
        readonly code: "session_unavailable" | "hmr_invalidated";
      }
  >;
  captureCurrentAutoSave(): void;
}

interface ExactBytesEvidenceV1 {
  readonly byteLength: number;
  readonly bytesDigest: ReturnType<typeof digestBytes>;
}

interface RawSaveEvidenceV1 extends ExactBytesEvidenceV1 {
  readonly key: string;
  readonly revision: number;
}

function exactBytesEvidenceV1(bytes: Uint8Array): ExactBytesEvidenceV1 {
  return Object.freeze({
    byteLength: bytes.byteLength,
    bytesDigest: digestBytes(bytes),
  });
}

async function rawSaveEvidenceV1(
  records: HostAtomicRecordStoreV1,
): Promise<readonly RawSaveEvidenceV1[]> {
  const stored = await records.list("save");
  return Object.freeze(
    [...stored]
      .sort((left, right) => left.key.localeCompare(right.key))
      .map(({ key, revision, bytes }) =>
        Object.freeze({
          key,
          revision,
          ...exactBytesEvidenceV1(bytes),
        }),
      ),
  );
}

function sameCanonicalBytesV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.byteLength === rightBytes.byteLength &&
    leftBytes.every((byte, index) => byte === rightBytes[index])
  );
}

function freezeStrictJsonValueV1(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeStrictJsonValueV1(entry)));
  }
  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, freezeStrictJsonValueV1(entry)]),
      ),
    );
  }
  return value;
}

// Derived by running this corpus against the S0-complete production source at
// 96a0a93. Length + SHA-256 pins the exact canonical/physical bytes without
// committing a second long-lived Save or Debug Bundle fixture.
const s0CompleteMixedGoldenV1 = {
  snapshot: {
    byteLength: 295,
    bytesDigest: "sha256:c4906e433f8ebf347134bffd58e6bde1fda5615afa2460d9bdf8594aef5a5917",
  },
  commandLog: {
    byteLength: 2532,
    bytesDigest: "sha256:03d02cbdd4e2a6b9c47ec85edbd8aa4a6193fd244bd96a061a7e273c5b3631e7",
  },
  debugBundle: {
    byteLength: 4431,
    bytesDigest: "sha256:5dc3b014d8e239eb5742499635aae15d5160b795335adcf815526f4ff8156fcf",
  },
  firstCommitSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 1,
      byteLength: 1452,
      bytesDigest: "sha256:2cc4b218afd2b5457e6daeabfd3ec6842e4d7a8a430c1925dc5f225a2296c881",
    },
  ],
  debugCommitSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 2,
      byteLength: 1524,
      bytesDigest: "sha256:d1242efbeffdd25875e7514fb356ae7f3eb7a4006d3ff2393351de5aa940213c",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 1,
      byteLength: 1453,
      bytesDigest: "sha256:5194b31757d0ebaafb678f3b4a8be115f7600aa03e607ae231a0ff34ca41ccfe",
    },
  ],
  anchoredSnapshot: {
    byteLength: 339,
    bytesDigest: "sha256:ae5ca583f510e634c9253ca3345a45338cf4d4db8cf6fda60b51eafc879ffafa",
  },
  anchoredSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 4,
      byteLength: 1568,
      bytesDigest: "sha256:eee5fa57fe168cc51c7f2078571fb562862ea6084743a0558e38c008bb8e90e8",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 3,
      byteLength: 1525,
      bytesDigest: "sha256:2ae2e46bbaffc6f932d25959548698cec59457934a4e129f5b1dac05d3be5b21",
    },
  ],
  postAnchorSnapshot: {
    byteLength: 339,
    bytesDigest: "sha256:ba77408f4ecc5adc7de9a9d8b6859bc29394fae1048d0e994500126ba61d4c29",
  },
  postAnchorCommandLog: {
    byteLength: 641,
    bytesDigest: "sha256:5b62e1311987668f68ab3035f4f334da30f8c53352e999f102acac66e6d5a057",
  },
  postAnchorSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 5,
      byteLength: 1568,
      bytesDigest: "sha256:499433a1c47ca4cff316c826b23bcd8963113293cba3ecd86d2039d329cb8faf",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 4,
      byteLength: 1569,
      bytesDigest: "sha256:dd881ff113bde1b9ace9825ffdb3117c543015e815a4c2dfaec42e20485d7229",
    },
  ],
} as const;

const s0CompleteRollbackGoldenV1 = {
  checkpointSnapshot: {
    byteLength: 223,
    bytesDigest: "sha256:b2dc0ae05ef5578ca7d9eaa277d7d7bec52f014623e784e41ef00a27ac08196d",
  },
  checkpointSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 1,
      byteLength: 1452,
      bytesDigest: "sha256:2cc4b218afd2b5457e6daeabfd3ec6842e4d7a8a430c1925dc5f225a2296c881",
    },
  ],
  firstResultSnapshot: {
    byteLength: 223,
    bytesDigest: "sha256:4f37bc1680c5e5bdd0fba7e564abd290cd87906cd63a7ee93899599aa6447f74",
  },
  firstResultEntry: {
    byteLength: 624,
    bytesDigest: "sha256:59e634f42cdc180b744e95fc9c001cad9935c107e9a566f4bfe00f6624f47e40",
  },
  rollbackSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 3,
      byteLength: 1452,
      bytesDigest: "sha256:455b583ecd58b3fa8e6efbcdba7f60d70b7a03a1335adfb3915f95a8d9929954",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 2,
      byteLength: 1453,
      bytesDigest: "sha256:7ca855c40bbf060fb6de3748e85e9c76cebbff21649e77c0ae43ccd85f188e39",
    },
  ],
  retrySaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 4,
      byteLength: 1452,
      bytesDigest: "sha256:761a85b306e2e09293652d8586290712cbe26e44bba6b68076ba6ec0d482e3d0",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 3,
      byteLength: 1453,
      bytesDigest: "sha256:5ecfd11d71d29d03b522e33c5a639c892f9f8e66b32008b40c448ee864c7f8a5",
    },
  ],
} as const;

const recordSchemaV1: RuntimeSchemaV1<Record<string, unknown>> = Object.freeze({
  parse(value: unknown) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid synthetic equivalence record");
    }
    return value as Record<string, unknown>;
  },
});

const capabilitiesSchemaV1: RuntimeSchemaV1<RuntimeCapabilitiesV1> = Object.freeze({
  parse(value: unknown) {
    const record = recordSchemaV1.parse(value);
    if (
      typeof record.debugTools !== "boolean" ||
      typeof record.cheats !== "boolean" ||
      typeof record.automationBridge !== "boolean"
    ) {
      throw new TypeError("invalid synthetic equivalence capabilities");
    }
    return Object.freeze({
      debugTools: record.debugTools,
      cheats: record.cheats,
      automationBridge: record.automationBridge,
    });
  },
});

const stringArraySchemaV1: RuntimeSchemaV1<readonly string[]> = Object.freeze({
  parse(value: unknown) {
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
      throw new TypeError("invalid synthetic equivalence string array");
    }
    return Object.freeze([...value]) as readonly string[];
  },
});

const commandLogEntrySchemaV1: RuntimeSchemaV1<unknown> = Object.freeze({
  parse(value: unknown) {
    const decoded = parseStrictJson(canonicalJsonBytes(value), debugBundleJsonLimitsV1);
    if (!decoded.ok) {
      throw new TypeError(`invalid synthetic CommandLog Strict JSON: ${decoded.error.code}`);
    }
    const record = recordSchemaV1.parse(decoded.value);
    const hasCandidateRngAfter = Object.hasOwn(record, "candidateRngAfter");
    const expectedKeys = [
      "attemptedDraws",
      ...(hasCandidateRngAfter ? ["candidateRngAfter"] : []),
      "command",
      "commandSequence",
      "committedRngAfter",
      "committedRngBefore",
      "logOrdinal",
      "outcome",
      "postStateDigest",
      "preStateDigest",
      "source",
    ];
    if (Object.keys(record).sort().join("\0") !== expectedKeys.sort().join("\0")) {
      throw new TypeError("invalid synthetic CommandLog entry fields");
    }
    if (record.source !== "game" && record.source !== "debug") {
      throw new TypeError("invalid synthetic CommandLog source");
    }
    parsePositiveSafeInteger(record.logOrdinal);
    parseDigest(record.preStateDigest);
    parseDigest(record.postStateDigest);
    const commandSequence = recordSchemaV1.parse(record.commandSequence);
    if (Object.keys(commandSequence).sort().join("\0") !== "after\0before") {
      throw new TypeError("invalid synthetic CommandLog sequence fields");
    }
    parseNonNegativeSafeInteger(commandSequence.before);
    parseNonNegativeSafeInteger(commandSequence.after);
    rngStateV1Schema.parse(record.committedRngBefore);
    rngStateV1Schema.parse(record.committedRngAfter);
    if (hasCandidateRngAfter) rngStateV1Schema.parse(record.candidateRngAfter);
    if (!Array.isArray(record.attemptedDraws)) {
      throw new TypeError("invalid synthetic CommandLog attempted draws");
    }
    const command = recordSchemaV1.parse(record.command);
    const commandKind = command.kind;
    if (
      record.source === "game" &&
      commandKind !== "synthetic.increment" &&
      commandKind !== "synthetic.reject" &&
      commandKind !== "synthetic.fault"
    ) {
      throw new TypeError("invalid synthetic Game command");
    }
    if (record.source === "debug") {
      if (commandKind !== "debug.synthetic.add") {
        throw new TypeError("invalid synthetic Debug command");
      }
      parseNonNegativeSafeInteger(command.amount);
    }
    const outcome = recordSchemaV1.parse(record.outcome);
    if (outcome.kind !== "committed" && outcome.kind !== "rejected" && outcome.kind !== "faulted") {
      throw new TypeError("invalid synthetic CommandLog outcome");
    }
    if (
      (outcome.kind === "committed" && !Array.isArray(outcome.facts)) ||
      (outcome.kind === "rejected" && !Array.isArray(outcome.reasons)) ||
      (outcome.kind === "faulted" && (outcome.fault === null || typeof outcome.fault !== "object"))
    ) {
      throw new TypeError("invalid synthetic CommandLog outcome evidence");
    }
    return freezeStrictJsonValueV1(decoded.value);
  },
});

const equivalenceDiagnosticsSchemaV1: RuntimeSchemaV1<{
  readonly codes: readonly string[];
}> = Object.freeze({
  parse(value: unknown) {
    const record = recordSchemaV1.parse(value);
    return Object.freeze({ codes: stringArraySchemaV1.parse(record.codes) });
  },
});

const absentSchemaV1: RuntimeSchemaV1<never> = Object.freeze({
  parse(): never {
    throw new TypeError("synthetic equivalence optional field is unsupported");
  },
});

const syntheticActionIdsV1 = Object.freeze([
  "synthetic.increment",
  "synthetic.reject",
  "synthetic.fault",
] as const);

const adapterV1 = {
  createQueries: (state: {
    readonly simulation: { readonly counter: { readonly count: number } };
  }) => Object.freeze({ count: state.simulation.counter.count }),
  projectGameView: (queries: SyntheticQueriesV1) => queries,
  projectNarrativeView: () => null,
  actions: (queries: SyntheticQueriesV1) =>
    Object.freeze(
      syntheticActionIdsV1.map((actionId) => Object.freeze({ actionId, count: queries.count })),
    ),
  preview: (queries: SyntheticQueriesV1) => Object.freeze({ countBefore: queries.count }),
  parseInvocation(value: unknown): SyntheticInvocationV1 {
    const actionId = (value as { readonly actionId?: unknown } | null)?.actionId;
    if (!syntheticActionIdsV1.includes(actionId as (typeof syntheticActionIdsV1)[number])) {
      throw new TypeError("invalid synthetic invocation");
    }
    return Object.freeze({
      kind: "invoke",
      actionId: actionId as SyntheticCounterCommandV1["kind"],
    });
  },
  commandForInvocation: (invocation: SyntheticInvocationV1) =>
    Object.freeze({ kind: invocation.actionId }),
  projectDispatchResult(result: {
    readonly kind: string;
    readonly code?: string;
    readonly execution?: {
      readonly kind: string;
      readonly facts?: readonly { readonly count: number }[];
    };
  }): SyntheticResultV1 {
    if (result.kind !== "executed" || result.execution === undefined) {
      return Object.freeze({
        kind: "not_executed" as const,
        code: result.code ?? "unknown",
      });
    }
    if (result.execution.kind === "committed") {
      return Object.freeze({
        kind: "committed" as const,
        count: result.execution.facts?.[0]?.count ?? 0,
      });
    }
    return result.execution.kind === "rejected"
      ? Object.freeze({ kind: "rejected" as const })
      : Object.freeze({ kind: "faulted" as const });
  },
  invalidInvocationResult: () =>
    Object.freeze({ kind: "not_executed" as const, code: "validation_failed" as const }),
};

const definitionV1 = defineCoreGameApplicationV1({
  entry: createSyntheticCounterGamePackageV1(),
  semantic: adapterV1 as unknown as CoreSemanticAdapterV1<
    SyntheticSimulationTypesV1,
    SyntheticQueriesV1,
    SyntheticQueriesV1,
    null,
    { readonly actionId: string; readonly count: number },
    SyntheticInvocationV1,
    { readonly countBefore: number },
    SyntheticResultV1
  >,
});

const rollbackDefinitionV1 = defineCoreGameApplicationV1({
  ...definitionV1,
  rollback: Object.freeze({
    capacity: 4,
    classify: () => "checkpoint" as const,
  }),
});

function debugDefinitionFixtureV1() {
  const baseEntry = createSyntheticCounterGamePackageV1();
  let debugExecuteCalls = 0;
  const debugCommandSchemaV1 = Object.freeze({
    parse(value: unknown): DebugCounterCommandV1 {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.keys(value).sort().join("\0") !== "amount\0kind" ||
        Reflect.get(value, "kind") !== "debug.synthetic.add"
      ) {
        throw new TypeError("invalid synthetic debug command");
      }
      return Object.freeze({
        kind: "debug.synthetic.add" as const,
        amount: parseNonNegativeSafeInteger(Reflect.get(value, "amount")),
      });
    },
  });
  const story = baseEntry.define();
  const simulation = story.simulation;
  const debugStory = Object.freeze({
    ...story,
    simulation: Object.freeze({
      ...simulation,
      createGameSimulation(program: Parameters<typeof simulation.createGameSimulation>[0]) {
        const gameSimulation = simulation.createGameSimulation(program);
        return Object.freeze({
          ...gameSimulation,
          debugCommandSchema: debugCommandSchemaV1,
          debugCommandExecutor: Object.freeze({
            validate() {
              return Object.freeze({ kind: "allowed" as const });
            },
            executeAttempt(
              snapshot: SyntheticSimulationTypesV1["snapshot"],
              command: DebugCounterCommandV1,
            ) {
              debugExecuteCalls += 1;
              const rng = createTransactionalRngV1(snapshot.rng);
              const count = parseNonNegativeSafeInteger(
                snapshot.state.simulation.counter.count + command.amount,
              );
              const next = Object.freeze({
                state: Object.freeze({
                  simulation: Object.freeze({
                    counter: Object.freeze({ count }),
                  }),
                }),
                rng: rng.candidateState(),
                commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
                integrity: snapshot.integrity,
              });
              return commitAttemptV1(snapshot, next, rng, [
                Object.freeze({
                  kind: "synthetic.incremented" as const,
                  count,
                }),
              ]);
            },
          }),
        });
      },
    }),
  });
  const entry = Object.freeze({
    ...baseEntry,
    define: () => debugStory,
  });
  const definition = defineCoreGameApplicationV1({
    entry,
    semantic: adapterV1 as unknown as CoreSemanticAdapterV1<
      DebugSyntheticSimulationTypesV1,
      SyntheticQueriesV1,
      SyntheticQueriesV1,
      null,
      { readonly actionId: string; readonly count: number },
      SyntheticInvocationV1,
      { readonly countBefore: number },
      SyntheticResultV1
    >,
    createExtensions(context) {
      const resolvedGame = context.resolved as {
        readonly gameSimulation: {
          readonly stateSchema: RuntimeSchemaV1<DebugSyntheticSimulationTypesV1["state"]>;
        };
      };
      const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(
        resolvedGame.gameSimulation.stateSchema,
        rngStateV1Schema,
      );
      const bundleSchema = createDebugBundleEnvelopeSchemaV1<
        Record<string, unknown>,
        RuntimeCapabilitiesV1,
        readonly string[],
        SyntheticSnapshotV1,
        unknown,
        { readonly codes: readonly string[] },
        RuntimeOperationFaultV1,
        never,
        never
      >({
        provenanceSchema: recordSchemaV1,
        capabilitiesSchema: capabilitiesSchemaV1,
        simulationLineageSchema: stringArraySchemaV1,
        snapshotSchema,
        commandLogEntrySchema: commandLogEntrySchemaV1,
        diagnosticsSchema: equivalenceDiagnosticsSchemaV1,
        runtimeFailureSchema: runtimeOperationFaultSchemaV1,
        failureSchema: absentSchemaV1,
        uiContextSchema: absentSchemaV1,
      });
      const codec: DebugBundleCodecContextV1<
        SyntheticSnapshotV1,
        SyntheticEquivalenceDebugBundleV1
      > = Object.freeze({
        bundleSchema,
        validateEnvelope(bundle: SyntheticEquivalenceDebugBundleV1) {
          if (!sameCanonicalBytesV1(bundle.provenance, context.provenance)) {
            throw new TypeError("synthetic Debug Bundle provenance mismatch");
          }
          if (
            Object.hasOwn(bundle, "appBuildId") ||
            !bundle.capabilities.debugTools ||
            bundle.capabilities.cheats ||
            bundle.capabilities.automationBridge ||
            bundle.simulationLineage.length !== 0 ||
            bundle.generatedAt !== instantV1 ||
            bundle.diagnostics.codes.length !== 1 ||
            bundle.diagnostics.codes[0] !== "snapshot.equivalence" ||
            bundle.runtimeFailures.length !== 0 ||
            Object.hasOwn(bundle, "failure") ||
            Object.hasOwn(bundle, "uiContext")
          ) {
            throw new TypeError("synthetic Debug Bundle envelope mismatch");
          }
          const entries = bundle.commandLog.map((loggedEntry) => recordSchemaV1.parse(loggedEntry));
          if (entries.length === 0) {
            if (
              bundle.replayBaseStateDigest !== bundle.currentStateDigest ||
              !sameCanonicalBytesV1(bundle.replayBase, bundle.currentSnapshot)
            ) {
              throw new TypeError("empty synthetic Debug Bundle replay chain mismatch");
            }
            return;
          }
          if (entries[0]?.preStateDigest !== bundle.replayBaseStateDigest) {
            throw new TypeError("synthetic Debug Bundle replay base mismatch");
          }
          entries.forEach((loggedEntry, index) => {
            const outcome = recordSchemaV1.parse(loggedEntry.outcome);
            if (
              (outcome.kind === "rejected" || outcome.kind === "faulted") &&
              loggedEntry.postStateDigest !== loggedEntry.preStateDigest
            ) {
              throw new TypeError("synthetic Debug Bundle non-commit changed digest");
            }
            if (index > 0 && loggedEntry.preStateDigest !== entries[index - 1]?.postStateDigest) {
              throw new TypeError("synthetic Debug Bundle replay continuity mismatch");
            }
          });
          if (entries.at(-1)?.postStateDigest !== bundle.currentStateDigest) {
            throw new TypeError("synthetic Debug Bundle current Snapshot mismatch");
          }
        },
      });
      const diagnostics = createGameDiagnosticsServiceV1<
        Record<string, unknown>,
        RuntimeCapabilitiesV1,
        readonly string[],
        SyntheticSnapshotV1,
        unknown,
        { readonly codes: readonly string[] },
        never,
        never
      >({
        codec,
        provenance: context.provenance,
        getCapabilities: () => context.capabilityState.getCurrent(),
        getSimulationLineage: () => Object.freeze([]),
        readAtQueueFront: (reader) => context.runtimeControl.readAtQueueFront(reader),
        getReplayEvidence: () =>
          Object.freeze({
            replayBase: context.commandLog.replayBase(),
            replayBaseStateDigest: context.commandLog.replayBaseStateDigest(),
            commandLog: context.commandLog.entries(),
          }),
        getDiagnostics: () => Object.freeze({ codes: Object.freeze(["snapshot.equivalence"]) }),
        getRuntimeFailures: () => context.runtimeFailures(),
        getFailure: () => undefined,
        scrubFailure: (failure) => failure,
        metadataClock: context.metadataClock,
        exportFilename: "synthetic-equivalence.debug-bundle.json",
      });
      const anchorDebugBundle: SyntheticEquivalenceExtensionsV1["anchorDebugBundle"] = (snapshot) =>
        context.debugControl.anchorReplacement<
          { readonly kind: "anchored" } | { readonly kind: "faulted" }
        >(
          Object.freeze({ kind: "debug_bundle" as const }),
          async () =>
            Object.freeze({
              kind: "replace" as const,
              snapshot,
              result: Object.freeze({ kind: "anchored" as const }),
            }),
          () => context.capabilityState.getCurrent().debugTools,
          () => Object.freeze({ kind: "faulted" as const }),
          (prepared) =>
            context.persistence.establishAnchor(
              prepared,
              context.persistence.getSimulationLineage(),
            ),
        );
      return Object.freeze({
        extensions: Object.freeze({
          diagnostics,
          codec,
          anchorDebugBundle,
          captureCurrentAutoSave: () =>
            context.persistence.captureAutoSave(context.session.getCurrentSnapshot()),
        }),
      });
    },
  });
  return Object.freeze({
    definition,
    debugExecuteCalls: () => debugExecuteCalls,
  });
}

function resolvedApplicationV1() {
  const result = resolveCoreGameApplicationV1(definitionV1, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (result.kind !== "resolved") throw new Error("synthetic story must resolve");
  return result.application;
}

function resolvedRollbackApplicationV1() {
  const result = resolveCoreGameApplicationV1(rollbackDefinitionV1, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (result.kind !== "resolved") throw new Error("synthetic rollback story must resolve");
  return result.application;
}

const resumingDefinitionV1 = defineCoreGameApplicationV1({
  ...definitionV1,
  resumeFromAutosave: true,
});

function resolvedResumingApplicationV1() {
  const result = resolveCoreGameApplicationV1(resumingDefinitionV1, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (result.kind !== "resolved") throw new Error("synthetic story must resolve");
  return result.application;
}

const ownerIdV1 = "owner.sillymaker.test.core-application" as SessionLeaseOwnerId;
const instantV1 = "2026-07-20T00:00:00.000Z" as IsoUtcInstant;

function hostServicesV1(
  records: HostAtomicRecordStoreV1,
  seeds: readonly number[] = [77],
): CoreApplicationHostServicesV1 {
  return Object.freeze({
    entropy: createFixedBootstrapEntropyV1({
      uuids: seeds.map((seed) => `9e2f1a34-6d2b-4c33-8a41-5a3f6c1b2d${String((seed % 90) + 10)}`),
      seeds,
    }),
    records,
    now: () => instantV1,
    ownerId: ownerIdV1,
    nextHandoffRequestId: () => "handoff.sillymaker.test.core-application",
  });
}

function countingRecordsV1() {
  const store = createMemoryHostRecordStoreV1();
  const writes: string[] = [];
  const spy: HostAtomicRecordStoreV1 = {
    read: (namespace, key) => store.read(namespace, key),
    list: (namespace) => store.list(namespace),
    commit: (mutations) => {
      for (const mutation of mutations) {
        if (mutation.kind === "put") writes.push(mutation.key);
      }
      return store.commit(mutations);
    },
  };
  return {
    counting: Object.freeze(spy),
    writes,
    autoWrites: () => writes.filter((key) => key.includes(":auto.current")),
  };
}

function delayedSaveRecordsV1() {
  const memory = createMemoryHostRecordStoreV1();
  let block = false;
  let writeStarted = Promise.resolve();
  let reportStarted: (() => void) | undefined;
  let releaseBlockedWrite: (() => void) | undefined;
  let writeGate = Promise.resolve();
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      if (block && mutations.some(({ namespace }) => namespace === "save")) {
        reportStarted?.();
        await writeGate;
      }
      return memory.commit(mutations);
    },
  });
  return Object.freeze({
    records,
    blockSaveWrites() {
      block = true;
      writeStarted = new Promise<void>((resolve) => {
        reportStarted = resolve;
      });
      writeGate = new Promise<void>((resolve) => {
        releaseBlockedWrite = resolve;
      });
    },
    waitUntilWriteStarts: () => writeStarted,
    releaseWrites() {
      block = false;
      releaseBlockedWrite?.();
    },
  });
}

function manualSchedulerV1() {
  const scheduled: { callback: () => void; delayMs: number; cancelled: boolean }[] = [];
  const scheduler: CoreSchedulerV1 = Object.freeze({
    schedule(callback: () => void, delayMs: number) {
      const entry = { callback, delayMs, cancelled: false };
      scheduled.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
  });
  const runLast = () => {
    const entry = scheduled.at(-1);
    if (entry === undefined || entry.cancelled) throw new Error("no scheduled autosave flush");
    entry.callback();
  };
  return { scheduler, scheduled, runLast };
}

async function createInstanceV1(options?: {
  records?: HostAtomicRecordStoreV1;
  autosave?: CoreAutosavePolicyV1;
  scheduler?: CoreSchedulerV1;
  seeds?: readonly number[];
}) {
  return createCoreGameApplicationInstanceV1(resolvedApplicationV1(), {
    host: hostServicesV1(options?.records ?? createMemoryHostRecordStoreV1(), options?.seeds),
    ...(options?.autosave === undefined ? {} : { autosave: options.autosave }),
    ...(options?.scheduler === undefined ? {} : { scheduler: options.scheduler }),
  });
}

const incrementV1 = Object.freeze({ kind: "invoke" as const, actionId: "synthetic.increment" });
const rejectV1 = Object.freeze({ kind: "invoke" as const, actionId: "synthetic.reject" });
const faultV1 = Object.freeze({ kind: "invoke" as const, actionId: "synthetic.fault" });

describe("resolveCoreGameApplicationV1", () => {
  it("reports resolution failures structurally instead of throwing", () => {
    const broken = defineCoreGameApplicationV1({
      ...definitionV1,
      entry: Object.freeze({
        ...createSyntheticCounterGamePackageV1(),
        define: () => {
          throw new TypeError("synthetic definition exploded");
        },
      }),
    });
    const result = resolveCoreGameApplicationV1(broken);
    expect(result.kind).toBe("failed");
    if (result.kind === "failed") expect(result.failure.code.length).toBeGreaterThan(0);
  });
});

describe("createCoreGameApplicationInstanceV1", () => {
  it("rejects a configured Save projector that returns undefined", async () => {
    let summarizeCalls = 0;
    const invalidSummaryDefinition = defineCoreGameApplicationV1({
      ...definitionV1,
      summarizeSave() {
        summarizeCalls += 1;
        return undefined as never;
      },
    });
    const resolved = resolveCoreGameApplicationV1(invalidSummaryDefinition, {
      buildIdentityInput: deterministicBuildIdentityInputV1,
    });
    if (resolved.kind !== "resolved") throw new Error("synthetic story must resolve");
    const records = createMemoryHostRecordStoreV1();
    const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
      host: hostServicesV1(records),
    });

    await expect(instance.persistence.save("quick")).resolves.toEqual({
      kind: "faulted",
      code: "persistence.capture_failed",
    });
    expect(summarizeCalls).toBe(1);
    expect(await records.list("save")).toEqual([]);
    await instance.dispose();
  });

  it("plays, saves, and restores through the composed surfaces", async () => {
    const instance = await createInstanceV1();
    await expect(instance.semantic.dispatch(incrementV1)).resolves.toEqual({
      kind: "committed",
      count: 1,
    });
    const digest = instance.admin.stateDigest();
    await expect(instance.persistence.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    await instance.semantic.dispatch(incrementV1);
    await expect(instance.persistence.load("manual.1")).resolves.toMatchObject({ kind: "loaded" });
    expect(instance.admin.stateDigest()).toBe(digest);
    await instance.dispose();
  });

  it("replays the Core command log authoritatively through isolated attempts", async () => {
    const instance = await createInstanceV1();
    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(
      Object.freeze({ kind: "invoke" as const, actionId: "synthetic.reject" as const }),
    );
    await instance.semantic.dispatch(incrementV1);

    const snapshotBefore = instance.admin.inspectForTest().snapshot;
    const digestBefore = instance.admin.stateDigest();
    const commandLogBytesBefore = canonicalJsonBytes(instance.admin.commandLog());
    const statusBefore = instance.semantic.observe().status;
    await expect(instance.admin.replayAuthoritatively()).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 3,
      mismatches: [],
    });
    expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
    expect(instance.admin.stateDigest()).toBe(digestBefore);
    expect(canonicalJsonBytes(instance.admin.commandLog())).toEqual(commandLogBytesBefore);
    expect(instance.semantic.observe().status).toBe(statusBefore);
    expect(instance.semantic.observe().game).toEqual({ count: 2 });
    await instance.dispose();
  });

  it("replays a debug-sourced Core entry with identical modified integrity in isolation", async () => {
    const fixture = debugDefinitionFixtureV1();
    const resolved = resolveCoreGameApplicationV1(fixture.definition, {
      buildIdentityInput: deterministicBuildIdentityInputV1,
    });
    if (resolved.kind !== "resolved") {
      throw new TypeError(
        `debug synthetic story must resolve: ${JSON.stringify(resolved.failure)}`,
      );
    }
    const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
      capabilities: { debugTools: true },
    });
    const debugControl = instance.admin.debugControl;
    if (debugControl === undefined) throw new TypeError("debug control must be enabled");

    await expect(
      debugControl.execute(Object.freeze({ kind: "debug.synthetic.add", amount: 5 }), () => true),
    ).resolves.toMatchObject({
      kind: "executed",
      attempt: { result: { kind: "committed" } },
    });
    expect(fixture.debugExecuteCalls()).toBe(1);
    expect(instance.admin.commandLog()).toMatchObject([
      {
        source: "debug",
        command: { kind: "debug.synthetic.add", amount: 5 },
        outcome: { kind: "committed" },
      },
    ]);

    const snapshotBefore = instance.admin.inspectForTest().snapshot;
    expect(snapshotBefore.state.simulation.counter.count).toBe(5);
    expect(snapshotBefore.integrity).toEqual({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 1,
      reasons: [
        {
          kind: "debug_command",
          commandKind: "debug.synthetic.add",
          sequence: 1,
        },
      ],
    });
    const digestBefore = instance.admin.stateDigest();
    const commandLogBytesBefore = canonicalJsonBytes(instance.admin.commandLog());
    const statusBefore = instance.semantic.observe().status;

    await expect(instance.admin.replayAuthoritatively()).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 1,
      mismatches: [],
    });
    expect(fixture.debugExecuteCalls()).toBe(2);
    expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
    expect(instance.admin.stateDigest()).toBe(digestBefore);
    expect(canonicalJsonBytes(instance.admin.commandLog())).toEqual(commandLogBytesBefore);
    expect(instance.semantic.observe().status).toBe(statusBefore);
    const debugPostStateDigest = instance.admin.commandLog()[0]?.postStateDigest;
    await instance.semantic.dispatch(incrementV1);
    expect(instance.admin.commandLog()[1]?.preStateDigest).toBe(debugPostStateDigest);
    await instance.dispose();
  });

  it("keeps one mixed Game/Debug transcript, authoritative replay, and Debug Bundle byte-identical", async () => {
    const definition = debugDefinitionFixtureV1().definition;
    const resolved = resolveCoreGameApplicationV1(definition, {
      buildIdentityInput: deterministicBuildIdentityInputV1,
    });
    if (resolved.kind !== "resolved") {
      throw new TypeError(
        `debug synthetic story must resolve: ${JSON.stringify(resolved.failure)}`,
      );
    }
    const createInstance = async () => {
      const delayed = delayedSaveRecordsV1();
      const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
        host: hostServicesV1(delayed.records),
        capabilities: { debugTools: true },
      });
      return Object.freeze({ instance, delayed });
    };
    const firstHandle = await createInstance();
    const secondHandle = await createInstance();
    const handles = [firstHandle, secondHandle] as const;
    const first = firstHandle.instance;
    const second = secondHandle.instance;
    const transcriptSaveEvidence: {
      firstCommit?: readonly RawSaveEvidenceV1[];
      debugCommit?: readonly RawSaveEvidenceV1[];
    }[] = [];

    try {
      for (const { instance, delayed } of handles) {
        await instance.semantic.dispatch(incrementV1);
        await instance.autoSaveIdle();
        const firstCommit = await rawSaveEvidenceV1(delayed.records);
        await instance.semantic.dispatch(rejectV1);
        await instance.autoSaveIdle();
        expect(await rawSaveEvidenceV1(delayed.records)).toEqual(firstCommit);
        const debugControl = instance.admin.debugControl;
        if (debugControl === undefined) throw new TypeError("debug control must be enabled");
        await debugControl.execute(
          Object.freeze({ kind: "debug.synthetic.add", amount: 5 }),
          () => true,
        );
        await instance.autoSaveIdle();
        const debugCommit = await rawSaveEvidenceV1(delayed.records);
        await instance.semantic.dispatch(faultV1);
        await instance.autoSaveIdle();
        expect(await rawSaveEvidenceV1(delayed.records)).toEqual(debugCommit);
        transcriptSaveEvidence.push({ firstCommit, debugCommit });
      }
      expect(transcriptSaveEvidence[1]).toEqual(transcriptSaveEvidence[0]);
      expect(transcriptSaveEvidence[0]?.firstCommit).toEqual(
        s0CompleteMixedGoldenV1.firstCommitSaves,
      );
      expect(transcriptSaveEvidence[0]?.debugCommit).toEqual(
        s0CompleteMixedGoldenV1.debugCommitSaves,
      );
      expect(await firstHandle.delayed.records.list("save")).toEqual(
        await secondHandle.delayed.records.list("save"),
      );

      const firstLog = first.admin.commandLog();
      const secondLog = second.admin.commandLog();
      expect(firstLog.map(({ source }) => source)).toEqual(["game", "game", "debug", "game"]);
      expect(firstLog.map(({ outcome }) => outcome.kind)).toEqual([
        "committed",
        "rejected",
        "committed",
        "faulted",
      ]);
      expect(firstLog).toEqual(secondLog);
      expect(canonicalJsonBytes(firstLog)).toEqual(canonicalJsonBytes(secondLog));
      firstLog.forEach((entry, index) => {
        expect(canonicalJsonBytes(entry)).toEqual(canonicalJsonBytes(secondLog[index]));
        if (entry.outcome.kind === "rejected" || entry.outcome.kind === "faulted") {
          expect(entry.postStateDigest).toBe(entry.preStateDigest);
        }
        if (index > 0) {
          expect(entry.preStateDigest).toBe(firstLog[index - 1]?.postStateDigest);
        }
      });

      const firstSnapshot = first.admin.inspectForTest().snapshot;
      const secondSnapshot = second.admin.inspectForTest().snapshot;
      const firstDigest = first.admin.stateDigest();
      const secondDigest = second.admin.stateDigest();
      const firstStatus = first.semantic.observe().status;
      const secondStatus = second.semantic.observe().status;
      expect(firstStatus).toBe("fault_paused");
      expect(secondStatus).toBe("fault_paused");
      const firstLogBytes = canonicalJsonBytes(firstLog);
      const secondLogBytes = canonicalJsonBytes(secondLog);
      expect(exactBytesEvidenceV1(canonicalJsonBytes(firstSnapshot))).toEqual(
        s0CompleteMixedGoldenV1.snapshot,
      );
      expect(exactBytesEvidenceV1(firstLogBytes)).toEqual(s0CompleteMixedGoldenV1.commandLog);
      const firstReplay = await first.admin.replayAuthoritatively();
      const secondReplay = await second.admin.replayAuthoritatively();
      expect(firstReplay).toEqual({
        authoritative: true,
        identityMatch: true,
        visualMatch: false,
        matches: true,
        executedEntries: 4,
        mismatches: [],
      });
      expect(secondReplay).toEqual(firstReplay);
      expect(first.admin.inspectForTest().snapshot).toBe(firstSnapshot);
      expect(second.admin.inspectForTest().snapshot).toBe(secondSnapshot);
      expect(first.admin.stateDigest()).toBe(firstDigest);
      expect(second.admin.stateDigest()).toBe(secondDigest);
      expect(first.semantic.observe().status).toBe(firstStatus);
      expect(second.semantic.observe().status).toBe(secondStatus);
      expect(canonicalJsonBytes(first.admin.commandLog())).toEqual(firstLogBytes);
      expect(canonicalJsonBytes(second.admin.commandLog())).toEqual(secondLogBytes);

      const firstExtensions = first.extensions as SyntheticEquivalenceExtensionsV1;
      const secondExtensions = second.extensions as SyntheticEquivalenceExtensionsV1;
      const firstBundle = await firstExtensions.diagnostics.exportDebugBundle();
      const secondBundle = await secondExtensions.diagnostics.exportDebugBundle();
      expect(firstBundle).toEqual(secondBundle);
      expect(firstBundle.digest).toBe(digestBytes(firstBundle.bytes));
      expect(exactBytesEvidenceV1(firstBundle.bytes)).toEqual(s0CompleteMixedGoldenV1.debugBundle);
      const decoded = decodeDebugBundleV1(firstBundle.bytes, firstExtensions.codec);
      const secondDecoded = decodeDebugBundleV1(secondBundle.bytes, secondExtensions.codec);
      expect(decoded.kind).toBe("decoded");
      if (decoded.kind !== "decoded") throw new TypeError("expected decoded Debug Bundle");
      if (secondDecoded.kind !== "decoded") {
        throw new TypeError("expected second decoded Debug Bundle");
      }
      expect(secondDecoded).toEqual(decoded);
      expect(decoded.bundle.commandLog).toEqual(firstLog);
      expect(canonicalJsonBytes(decoded.bundle.commandLog)).toEqual(firstLogBytes);
      expect(canonicalJsonBytes(decoded.bundle.currentSnapshot)).toEqual(
        canonicalJsonBytes(firstSnapshot),
      );
      expect(decoded.bundle.replayBaseStateDigest).toBe(
        digestCanonical("sillymaker:state:v1", decoded.bundle.replayBase),
      );
      expect(decoded.bundle.currentStateDigest).toBe(
        digestCanonical("sillymaker:state:v1", decoded.bundle.currentSnapshot),
      );
      expect(encodeDebugBundleV1(decoded.bundle, firstExtensions.codec)).toEqual(firstBundle.bytes);

      const decodedBundles = [decoded.bundle, secondDecoded.bundle] as const;
      const staleFlushes = handles.map(({ instance, delayed }) => {
        delayed.blockSaveWrites();
        const extensions = instance.extensions as SyntheticEquivalenceExtensionsV1;
        extensions.captureCurrentAutoSave();
        return instance.autoSaveIdle();
      });
      await Promise.all(handles.map(({ delayed }) => delayed.waitUntilWriteStarts()));
      await Promise.all(
        handles.map(async ({ instance }, index) => {
          const extensions = instance.extensions as SyntheticEquivalenceExtensionsV1;
          await expect(
            extensions.anchorDebugBundle(decodedBundles[index]!.currentSnapshot),
          ).resolves.toEqual({ kind: "anchored" });
        }),
      );
      handles.forEach(({ delayed }) => delayed.releaseWrites());
      await Promise.all(staleFlushes);
      await Promise.all(handles.map(({ instance }) => instance.autoSaveIdle()));
      const anchoredSaveEvidence = await Promise.all(
        handles.map(({ delayed }) => rawSaveEvidenceV1(delayed.records)),
      );
      expect(anchoredSaveEvidence[1]).toEqual(anchoredSaveEvidence[0]);
      expect(anchoredSaveEvidence[0]).toEqual(s0CompleteMixedGoldenV1.anchoredSaves);
      expect(await firstHandle.delayed.records.list("save")).toEqual(
        await secondHandle.delayed.records.list("save"),
      );

      const firstAnchored = first.admin.inspectForTest().snapshot;
      const secondAnchored = second.admin.inspectForTest().snapshot;
      const anchoredDigest = digestCanonical("sillymaker:state:v1", firstAnchored);
      expect(canonicalJsonBytes(firstAnchored)).toEqual(canonicalJsonBytes(secondAnchored));
      expect(exactBytesEvidenceV1(canonicalJsonBytes(firstAnchored))).toEqual(
        s0CompleteMixedGoldenV1.anchoredSnapshot,
      );
      expect(first.admin.stateDigest()).toBe(anchoredDigest);
      expect(second.admin.stateDigest()).toBe(anchoredDigest);
      expect(firstAnchored.integrity.reasons.at(-1)).toEqual({
        kind: "debug_bundle_anchor",
        sequence: firstAnchored.commandSequence,
      });
      expect(first.admin.commandLog()).toEqual([]);
      expect(second.admin.commandLog()).toEqual([]);
      expect(first.semantic.observe().status).toBe("ready");
      expect(second.semantic.observe().status).toBe("ready");

      await first.semantic.dispatch(incrementV1);
      await second.semantic.dispatch(incrementV1);
      await Promise.all([first.autoSaveIdle(), second.autoSaveIdle()]);
      expect(first.admin.commandLog()[0]?.preStateDigest).toBe(anchoredDigest);
      expect(second.admin.commandLog()).toEqual(first.admin.commandLog());
      const postAnchorSaveEvidence = await Promise.all(
        handles.map(({ delayed }) => rawSaveEvidenceV1(delayed.records)),
      );
      expect(postAnchorSaveEvidence[1]).toEqual(postAnchorSaveEvidence[0]);
      expect(postAnchorSaveEvidence[0]).toEqual(s0CompleteMixedGoldenV1.postAnchorSaves);
      expect(await firstHandle.delayed.records.list("save")).toEqual(
        await secondHandle.delayed.records.list("save"),
      );
      expect(
        exactBytesEvidenceV1(canonicalJsonBytes(first.admin.inspectForTest().snapshot)),
      ).toEqual(s0CompleteMixedGoldenV1.postAnchorSnapshot);
      expect(exactBytesEvidenceV1(canonicalJsonBytes(first.admin.commandLog()))).toEqual(
        s0CompleteMixedGoldenV1.postAnchorCommandLog,
      );
    } finally {
      firstHandle.delayed.releaseWrites();
      secondHandle.delayed.releaseWrites();
      await first.dispose();
      await second.dispose();
    }
  });

  it("restores exact rollback checkpoint bytes and reproduces the retried command", async () => {
    const delayed = delayedSaveRecordsV1();
    const instance = await createCoreGameApplicationInstanceV1(resolvedRollbackApplicationV1(), {
      host: hostServicesV1(delayed.records),
    });

    try {
      await instance.semantic.dispatch(incrementV1);
      await instance.autoSaveIdle();
      const checkpointSaves = await rawSaveEvidenceV1(delayed.records);
      const checkpoint = instance.admin.inspectForTest().snapshot;
      const checkpointBytes = canonicalJsonBytes(checkpoint);
      const checkpointDigest = instance.admin.stateDigest();
      const epochBefore = instance.presentationAnchor().epoch;
      expect(exactBytesEvidenceV1(checkpointBytes)).toEqual(
        s0CompleteRollbackGoldenV1.checkpointSnapshot,
      );
      expect(checkpointSaves).toEqual(s0CompleteRollbackGoldenV1.checkpointSaves);

      delayed.blockSaveWrites();
      await instance.semantic.dispatch(incrementV1);
      await delayed.waitUntilWriteStarts();
      const firstResultBytes = canonicalJsonBytes(instance.admin.inspectForTest().snapshot);
      const firstResultDigest = instance.admin.stateDigest();
      const firstEntry = instance.admin.commandLog()[1];
      if (firstEntry === undefined) throw new TypeError("expected second committed entry");
      expect(exactBytesEvidenceV1(firstResultBytes)).toEqual(
        s0CompleteRollbackGoldenV1.firstResultSnapshot,
      );

      await expect(instance.rollback.toPrevious()).resolves.toEqual({
        kind: "rolled_back",
        commandSequence: 1,
      });
      delayed.releaseWrites();
      await instance.autoSaveIdle();
      const rollbackSaves = await rawSaveEvidenceV1(delayed.records);
      expect(rollbackSaves).toEqual(s0CompleteRollbackGoldenV1.rollbackSaves);
      expect(canonicalJsonBytes(instance.admin.inspectForTest().snapshot)).toEqual(checkpointBytes);
      expect(instance.admin.stateDigest()).toBe(checkpointDigest);
      expect(instance.admin.commandLog()).toEqual([]);
      expect(instance.presentationAnchor()).toEqual({
        epoch: epochBefore + 1,
        origin: "rollback",
      });

      await instance.semantic.dispatch(incrementV1);
      await instance.autoSaveIdle();
      const retrySaves = await rawSaveEvidenceV1(delayed.records);
      expect(canonicalJsonBytes(instance.admin.inspectForTest().snapshot)).toEqual(
        firstResultBytes,
      );
      expect(instance.admin.stateDigest()).toBe(firstResultDigest);
      const retryEntry = instance.admin.commandLog()[0];
      if (retryEntry === undefined) throw new TypeError("expected retried committed entry");
      expect(retryEntry.preStateDigest).toBe(checkpointDigest);
      const { logOrdinal: _firstOrdinal, ...firstEvidence } = firstEntry;
      const { logOrdinal: _retryOrdinal, ...retryEvidence } = retryEntry;
      expect(canonicalJsonBytes(retryEvidence)).toEqual(canonicalJsonBytes(firstEvidence));
      expect(exactBytesEvidenceV1(canonicalJsonBytes(firstEvidence))).toEqual(
        s0CompleteRollbackGoldenV1.firstResultEntry,
      );
      expect(retrySaves).toEqual(s0CompleteRollbackGoldenV1.retrySaves);
    } finally {
      delayed.releaseWrites();
      await instance.dispose();
    }
  });

  it("leaves no active owner behind after a failed construction", async () => {
    const { counting, writes } = countingRecordsV1();
    const throwingHost: CoreApplicationHostServicesV1 = Object.freeze({
      ...hostServicesV1(counting),
      entropy: Object.freeze({
        nextUuidV4: (): string => {
          throw new RangeError("entropy unavailable");
        },
        nextNonZeroUint32: (): never => {
          throw new RangeError("entropy unavailable");
        },
      }),
    });
    await expect(
      createCoreGameApplicationInstanceV1(resolvedApplicationV1(), { host: throwingHost }),
    ).rejects.toThrow("entropy unavailable");
    expect(writes).toEqual([]);

    // The same records store afterwards supports a fully writable instance.
    const healthy = await createInstanceV1({ records: counting });
    await expect(healthy.persistence.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    await healthy.dispose();
  });

  it("advances the presentation epoch on load/import/restart but never on dispatch", async () => {
    const instance = await createInstanceV1({ seeds: [77, 78] });
    expect(instance.presentationAnchor()).toEqual({ epoch: 0, origin: "bootstrap" });

    const anchors: unknown[] = [];
    const unsubscribe = instance.subscribePresentationAnchor((anchor) => anchors.push(anchor));

    await instance.semantic.dispatch(incrementV1);
    expect(instance.presentationAnchor().epoch).toBe(0);

    const staleGuard = instance.bindToCurrentEpoch((value: number) => value * 2);
    expect(staleGuard(21)).toEqual({ kind: "current", value: 42 });

    await instance.persistence.save("manual.1");
    await instance.semantic.dispatch(incrementV1);
    await expect(instance.persistence.load("manual.1")).resolves.toMatchObject({ kind: "loaded" });
    expect(instance.presentationAnchor()).toEqual({ epoch: 1, origin: "load" });
    const loadedDigest = instance.admin.stateDigest();
    expect(instance.admin.commandLog()).toEqual([]);
    await instance.semantic.dispatch(incrementV1);
    expect(instance.admin.commandLog()[0]?.preStateDigest).toBe(loadedDigest);
    expect(staleGuard(21)).toEqual({ kind: "stale_epoch" });
    expect(anchors).toEqual([{ epoch: 1, origin: "load" }]);

    // A failed load leaves state and epoch untouched.
    await expect(instance.persistence.load("quick")).resolves.toMatchObject({ kind: "rejected" });
    expect(instance.presentationAnchor().epoch).toBe(1);

    const exported = await instance.persistence.exportCurrentSave();
    const bytes = (exported as { readonly bytes: Uint8Array }).bytes;
    await expect(instance.persistence.importSave(bytes)).resolves.toMatchObject({
      kind: "imported",
    });
    expect(instance.presentationAnchor()).toEqual({ epoch: 2, origin: "import" });
    const importedDigest = instance.admin.stateDigest();
    expect(instance.admin.commandLog()).toEqual([]);
    await instance.semantic.dispatch(incrementV1);
    expect(instance.admin.commandLog()[0]?.preStateDigest).toBe(importedDigest);

    await expect(instance.lifecycle.restart()).resolves.toEqual({
      kind: "anchored",
      commandSequence: 0,
    });
    expect(instance.presentationAnchor()).toEqual({ epoch: 3, origin: "restart" });
    expect(instance.semantic.observe().game).toEqual({ count: 0 });
    const restartedDigest = instance.admin.stateDigest();
    expect(instance.admin.commandLog()).toEqual([]);
    await instance.semantic.dispatch(incrementV1);
    expect(instance.admin.commandLog()[0]?.preStateDigest).toBe(restartedDigest);

    unsubscribe();
    await instance.dispose();
  });

  it("verifies the debounced autosave policy with a deterministic scheduler", async () => {
    const { counting, autoWrites } = countingRecordsV1();
    const { scheduler, scheduled, runLast } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: counting,
      autosave: { mode: "debounced", delayMs: 250 },
      scheduler,
    });

    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    expect(autoWrites()).toEqual([]);
    expect(scheduled.at(-1)?.delayMs).toBe(250);

    runLast();
    await instance.autoSaveIdle();
    expect(autoWrites()).toHaveLength(1);

    // Explicit slot saves stay available while the debounce is pending.
    await instance.semantic.dispatch(incrementV1);
    await expect(instance.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });

    // A pagehide-style flush writes the pending Snapshot immediately.
    await instance.flushAutoSave();
    expect(autoWrites()).toHaveLength(2);
    await instance.dispose();
  });

  it("honors checkpointEveryCommands and the default every-commit policy", async () => {
    const checkpointed = countingRecordsV1();
    const { scheduler } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: checkpointed.counting,
      autosave: { mode: "debounced", delayMs: 1_000, checkpointEveryCommands: 2 },
      scheduler,
    });
    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    expect(checkpointed.autoWrites()).toHaveLength(1);
    await instance.dispose();

    const everyCommit = countingRecordsV1();
    const immediate = await createInstanceV1({ records: everyCommit.counting });
    await immediate.semantic.dispatch(incrementV1);
    await immediate.autoSaveIdle();
    expect(everyCommit.autoWrites()).toHaveLength(1);
    await immediate.dispose();
  });

  it("resumes the previous session's autosave at boot when opted in", async () => {
    const records = createMemoryHostRecordStoreV1();
    // First session: advance two steps; the debounced autosave lands with each commit (every_commit default).
    const first = await createCoreGameApplicationInstanceV1(resolvedResumingApplicationV1(), {
      host: hostServicesV1(records),
    });
    await first.semantic.dispatch(incrementV1);
    await first.semantic.dispatch(incrementV1);
    await first.autoSaveIdle();
    const countBefore = (first.semantic.observe().game as { readonly count: number }).count;
    expect(countBefore).toBe(2);
    await first.dispose();

    // Second session (same records): an opted-in definition adopts auto.current at boot.
    const second = await createCoreGameApplicationInstanceV1(resolvedResumingApplicationV1(), {
      host: hostServicesV1(records),
    });
    expect((second.semantic.observe().game as { readonly count: number }).count).toBe(2);
    // Intentional semantics: boot-resume completes before the anchor subscription
    // exists — to presentation this is the bootstrap origin, not a load, so the
    // "load origin dismisses the title screen" behavior never fires; that is what makes the title screen's Continue truthful.
    expect(second.presentationAnchor().origin).toBe("bootstrap");
    const resumedDigest = second.admin.stateDigest();
    expect(second.admin.commandLog()).toEqual([]);
    await second.semantic.dispatch(incrementV1);
    expect(second.admin.commandLog()[0]?.preStateDigest).toBe(resumedDigest);
    await second.dispose();

    // Definitions that do not opt in keep the old semantics: same records still start fresh.
    const fresh = await createCoreGameApplicationInstanceV1(resolvedApplicationV1(), {
      host: hostServicesV1(records),
    });
    expect((fresh.semantic.observe().game as { readonly count: number }).count).toBe(0);
    await fresh.dispose();
  });

  it("keeps the fresh bootstrap when the autosave slot is empty", async () => {
    const instance = await createCoreGameApplicationInstanceV1(resolvedResumingApplicationV1(), {
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
    });
    expect((instance.semantic.observe().game as { readonly count: number }).count).toBe(0);
    expect(instance.presentationAnchor().origin).toBe("bootstrap");
    await instance.dispose();
  });

  it("releases the lease and answers structurally after disposal", async () => {
    const records = createMemoryHostRecordStoreV1();
    const instance = await createInstanceV1({ records });
    await instance.semantic.dispatch(incrementV1);
    await expect(instance.dispose()).resolves.toEqual({ kind: "disposed" });
    await expect(instance.dispose()).resolves.toEqual({ kind: "disposed" });
    expect(instance.isDisposed()).toBe(true);

    await expect(instance.semantic.dispatch(incrementV1)).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    await expect(instance.persistence.save("manual.1")).resolves.toMatchObject({
      kind: "faulted",
      code: "runtime_disposed",
    });

    // Disposal left the lease unowned (no active owner); a successor over the
    // same records takes it over through the public lease port and writes.
    const successor = await createInstanceV1({ records });
    await expect(successor.persistence.lease.getStatus()).resolves.toMatchObject({
      kind: "unowned",
    });
    await expect(successor.persistence.lease.takeOver()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "owned" },
    });
    await expect(successor.persistence.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    await successor.dispose();
  });
});
