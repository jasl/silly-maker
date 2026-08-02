// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

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
import type {
  HostAtomicRecordStoreV1,
  HostRecordKeyV1,
  IsoUtcInstant,
} from "../../contracts/host.ts";
import { createMemoryHostRecordStoreV1 } from "../../contracts/host.ts";
import type { SessionLeaseOwnerId } from "../../contracts/application.ts";
import { createTransactionalRngV1, rngStateV1Schema } from "../../contracts/rng.ts";
import { createGameSnapshotEnvelopeSchemaV1 } from "../../contracts/snapshot.ts";
import { parseStrictJson } from "../../contracts/strict-json.ts";
import type { NonZeroUint32, RuntimeSchemaV1 } from "../../contracts/values.ts";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../../contracts/values.ts";
import { createFixedBootstrapEntropyV1 } from "../../testkit/fixed-bootstrap-entropy.ts";
import { createPurposeTaggedSnapshotWorkCounterV1 } from "../../internal/snapshot-work-instrumentation.ts";
import { deterministicBuildIdentityInputV1 } from "../../testkit/resolver-fixtures.ts";
import {
  createRngZeroStateSaveBytesV1,
  createRngZeroStateSnapshotBytesV1,
} from "../../testkit/rng-zero-state-fixture.ts";
import type {
  SyntheticCounterCommandV1,
  SyntheticSimulationTypesV1,
} from "../../testkit/synthetic-counter.ts";
import { createSyntheticCounterGamePackageV1 } from "../../testkit/synthetic-counter.ts";
import {
  createGameDiagnosticsServiceV1,
  type DebugBundleCodecContextV1,
  decodeDebugBundleV1,
  encodeDebugBundleV1,
} from "../diagnostics/debug-bundle.ts";
import { decodeSessionLeaseRecordV1 } from "../persistence/session-lease.ts";
import type {
  CoreApplicationConstructionEventInternalV1,
  CoreApplicationExtensionContextV1,
  CoreApplicationHostServicesV1,
  CoreAutosavePolicyV1,
  CoreSchedulerV1,
  CoreSemanticAdapterV1,
} from "./core-game-application.ts";
import {
  clearAllCoreApplicationSavesForMaintenanceInternalV1,
  createCoreGameApplicationInstanceV1,
  defineCoreGameApplicationV1,
  instrumentCoreApplicationBootstrapAdmissionOptionsInternalV1,
  instrumentCoreApplicationConstructionOptionsInternalV1,
  instrumentCoreApplicationSaveProjectionOptionsInternalV1,
  instrumentCoreApplicationSnapshotWorkOptionsInternalV1,
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

interface EvidenceFactV1 {
  readonly kind: "synthetic.incremented";
  readonly count: number;
}

interface EvidenceRejectionV1 {
  readonly code: "synthetic.reject";
}

interface EvidenceDebugValidationErrorV1 {
  readonly code: "synthetic.debug_command_unsupported";
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

type RngAnchorAdmissionResultV1 =
  | { readonly kind: "anchored" }
  | { readonly kind: "rejected"; readonly code: string };

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
        })
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

// Derived from the canonical, non-mutating fixture with the same fixed entropy
// against the immediate pre-DET2d production source at 0d809dd. Expected bytes
// are embedded and never regenerated through the current canonical implementation.
const preDet2dCanonicalBootstrapGoldenV1 = Object.freeze({
  construction: Object.freeze({
    snapshot: Object.freeze({
      byteLength: 223,
      bytesDigest: "sha256:6c99d0d9a0c04502afed614772cd2a477eb532379bce41b3e27f2ea1321b65ea",
    }),
    stateDigest: "sha256:8e239525d6a136d496011d477d123c90bfebb343c2b548d791457dfff60ddfdd",
    quickSave: Object.freeze([
      Object.freeze({
        key: "save-record.v1:story.synthetic-counter:quick",
        revision: 1,
        byteLength: 1446,
        bytesDigest: "sha256:830ca8717f94430b384fb8a42c4521becdb3e935d1b23c07446c5f01f9986ac4",
      }),
    ]),
  }),
  subsequent: Object.freeze({
    snapshot: Object.freeze({
      byteLength: 224,
      bytesDigest: "sha256:4e3d87e3fd4ae7f95af30380b018f686dc76176ee68a75fec254fa76fa41e236",
    }),
    stateDigest: "sha256:b609af2038e7cec8ec3995f452dd8d0a76e952c7753db1d335d9e177093fbfad",
    quickSave: Object.freeze([
      Object.freeze({
        key: "save-record.v1:story.synthetic-counter:quick",
        revision: 1,
        byteLength: 1447,
        bytesDigest: "sha256:14bd0f03e919398a146bf9a54b0f29af856a409cf4008fc16ad05578f1ca01a8",
      }),
    ]),
  }),
});

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

const syntheticActionIdsV1 = Object.freeze(
  [
    "synthetic.increment",
    "synthetic.reject",
    "synthetic.fault",
  ] as const,
);

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
    Object.freeze({
      kind: "not_executed" as const,
      code: "validation_failed" as const,
    }),
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
  let injectZeroRngCandidate = false;
  let normalizeFaultAsZeroRngCommit = false;
  let throwGameExecutor = false;
  let normalizeFaultAsValidCommit = false;
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
        const corruptCommittedAttemptV1 = <
          TAttempt extends {
            readonly result: {
              readonly kind: string;
              readonly snapshot: SyntheticSnapshotV1;
            };
            readonly diagnostics: object;
          },
        >(attempt: TAttempt): TAttempt => {
          if (!injectZeroRngCandidate || attempt.result.kind !== "committed") return attempt;
          const zeroRng = Object.freeze({
            ...attempt.result.snapshot.rng,
            cursor: 0,
          });
          return Object.freeze({
            ...attempt,
            result: Object.freeze({
              ...attempt.result,
              snapshot: Object.freeze({
                ...attempt.result.snapshot,
                rng: zeroRng,
              }),
            }),
            diagnostics: Object.freeze({
              ...attempt.diagnostics,
              candidateRngAfter: zeroRng,
              committedRngAfter: zeroRng,
            }),
          }) as TAttempt;
        };
        return Object.freeze({
          ...gameSimulation,
          commandExecutor: Object.freeze({
            ...gameSimulation.commandExecutor,
            executeAttempt(
              snapshot: SyntheticSimulationTypesV1["snapshot"],
              command: SyntheticCounterCommandV1,
              context: SyntheticSimulationTypesV1["executionContext"],
            ) {
              if (throwGameExecutor) throw new Error("synthetic game executor failure");
              return corruptCommittedAttemptV1(
                gameSimulation.commandExecutor.executeAttempt(snapshot, command, context),
              );
            },
          }),
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
              return corruptCommittedAttemptV1(
                commitAttemptV1(snapshot, next, rng, [
                  Object.freeze({
                    kind: "synthetic.incremented" as const,
                    count,
                  }),
                ]),
              );
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
  const zeroRngCommittedAttemptV1 = (snapshot: SyntheticSnapshotV1) => {
    const rng = createTransactionalRngV1(snapshot.rng);
    const next = Object.freeze({
      ...snapshot,
      rng: Object.freeze({ ...snapshot.rng, cursor: 0 }),
      commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
    }) as unknown as SyntheticSnapshotV1;
    return commitAttemptV1(
      snapshot,
      next,
      rng,
      [
        Object.freeze({
          kind: "synthetic.incremented" as const,
          count: snapshot.state.simulation.counter.count,
        }),
      ],
    );
  };
  const validCommittedIncrementAttemptV1 = (snapshot: SyntheticSnapshotV1) => {
    const rng = createTransactionalRngV1(snapshot.rng);
    const count = parseNonNegativeSafeInteger(
      snapshot.state.simulation.counter.count + 1,
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
      Object.freeze({ kind: "synthetic.incremented" as const, count }),
    ]);
  };
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
    normalizeUnexpectedDispatchFault(error, snapshot) {
      if (normalizeFaultAsValidCommit) return validCommittedIncrementAttemptV1(snapshot);
      if (!normalizeFaultAsZeroRngCommit) throw error;
      return zeroRngCommittedAttemptV1(snapshot);
    },
    normalizeUnexpectedDebugFault(error, snapshot) {
      if (!normalizeFaultAsZeroRngCommit) throw error;
      return zeroRngCommittedAttemptV1(snapshot);
    },
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
            context.persistence.captureAutoSave(
              snapshotSchema.parse(context.session.getCurrentSnapshot()),
            ),
        }),
      });
    },
  });
  return Object.freeze({
    definition,
    debugExecuteCalls: () => debugExecuteCalls,
    injectZeroRngCandidate(value: boolean) {
      injectZeroRngCandidate = value;
    },
    normalizeFaultAsZeroRngCommit(value: boolean) {
      normalizeFaultAsZeroRngCommit = value;
    },
    throwGameExecutor(value: boolean) {
      throwGameExecutor = value;
    },
    normalizeFaultAsValidCommit(value: boolean) {
      normalizeFaultAsValidCommit = value;
    },
  });
}

function evidenceNormalizationFixtureV1(options?: {
  readonly zeroRngWithMalformedFact?: boolean;
  readonly beforeGameAttemptReturns?: () => void;
  readonly beforeEvidenceSchemaReturns?: (
    kind: "fact" | "rejection" | "debug_validation",
  ) => void;
}) {
  const baseEntry = createSyntheticCounterGamePackageV1();
  const baseStory = baseEntry.define();
  const factSchemaInputs: unknown[] = [];
  const rejectionSchemaInputs: unknown[] = [];
  const debugValidationSchemaInputs: unknown[] = [];
  const rawFacts: EvidenceFactV1[] = [];
  const rawRejections: EvidenceRejectionV1[] = [];
  const rawDebugValidationErrors: EvidenceDebugValidationErrorV1[] = [];
  const normalizedFacts: EvidenceFactV1[] = [];
  const normalizedRejections: EvidenceRejectionV1[] = [];
  const normalizedDebugValidationErrors: EvidenceDebugValidationErrorV1[] = [];
  const earlierFactFrozenDuringNormalization: boolean[] = [];
  const earlierRejectionFrozenDuringNormalization: boolean[] = [];
  let projectedFacts: readonly EvidenceFactV1[] | undefined;
  let projectedRejections: readonly EvidenceRejectionV1[] | undefined;

  const factSchema: RuntimeSchemaV1<EvidenceFactV1> = Object.freeze({
    parse(value: unknown): EvidenceFactV1 {
      const earlier = normalizedFacts.at(-1);
      if (earlier !== undefined) {
        earlierFactFrozenDuringNormalization.push(Object.isFrozen(earlier));
      }
      factSchemaInputs.push(value);
      const record = recordSchemaV1.parse(value);
      if (record.kind !== "synthetic.incremented") {
        throw new TypeError("invalid evidence-normalization fact kind");
      }
      const normalized = {
        kind: "synthetic.incremented" as const,
        count: parseNonNegativeSafeInteger(record.count),
      };
      normalizedFacts.push(normalized);
      options?.beforeEvidenceSchemaReturns?.("fact");
      return normalized;
    },
  });
  const rejectionSchema: RuntimeSchemaV1<EvidenceRejectionV1> = Object.freeze({
    parse(value: unknown): EvidenceRejectionV1 {
      const earlier = normalizedRejections.at(-1);
      if (earlier !== undefined) {
        earlierRejectionFrozenDuringNormalization.push(Object.isFrozen(earlier));
      }
      rejectionSchemaInputs.push(value);
      const record = recordSchemaV1.parse(value);
      if (record.code !== "synthetic.reject") {
        throw new TypeError("invalid evidence-normalization rejection code");
      }
      const normalized = { code: "synthetic.reject" as const };
      normalizedRejections.push(normalized);
      options?.beforeEvidenceSchemaReturns?.("rejection");
      return normalized;
    },
  });
  const debugValidationErrorSchema: RuntimeSchemaV1<EvidenceDebugValidationErrorV1> = Object.freeze(
    {
      parse(value: unknown): EvidenceDebugValidationErrorV1 {
        debugValidationSchemaInputs.push(value);
        const record = recordSchemaV1.parse(value);
        if (record.code !== "synthetic.debug_command_unsupported") {
          throw new TypeError("invalid evidence-normalization debug validation code");
        }
        const normalized = { code: "synthetic.debug_command_unsupported" as const };
        normalizedDebugValidationErrors.push(normalized);
        options?.beforeEvidenceSchemaReturns?.("debug_validation");
        return normalized;
      },
    },
  );

  const story = Object.freeze({
    ...baseStory,
    simulation: Object.freeze({
      ...baseStory.simulation,
      createGameSimulation(
        program: Parameters<typeof baseStory.simulation.createGameSimulation>[0],
      ) {
        const gameSimulation = baseStory.simulation.createGameSimulation(program);
        return Object.freeze({
          ...gameSimulation,
          factSchema,
          rejectionSchema,
          debugValidationErrorSchema,
          commandExecutor: Object.freeze({
            ...gameSimulation.commandExecutor,
            executeAttempt(
              snapshot: SyntheticSimulationTypesV1["snapshot"],
              command: SyntheticCounterCommandV1,
              context: SyntheticSimulationTypesV1["executionContext"],
            ) {
              const attempt = gameSimulation.commandExecutor.executeAttempt(
                snapshot,
                command,
                context,
              );
              options?.beforeGameAttemptReturns?.();
              if (attempt.result.kind === "committed") {
                const count = options?.zeroRngWithMalformedFact === true
                  ? 0.5
                  : attempt.result.facts[0]?.count ?? 0;
                const first = {
                  kind: "synthetic.incremented" as const,
                  count,
                  ignored: "first-raw-fact",
                };
                const second = {
                  kind: "synthetic.incremented" as const,
                  count: (attempt.result.facts[0]?.count ?? 0) + 100,
                  ignored: "second-raw-fact",
                };
                rawFacts.push(first, second);
                const candidateRng = options?.zeroRngWithMalformedFact === true
                  ? Object.freeze({ ...attempt.result.snapshot.rng, cursor: 0 })
                  : attempt.result.snapshot.rng;
                const candidateSnapshot = options?.zeroRngWithMalformedFact === true
                  ? Object.freeze({ ...attempt.result.snapshot, rng: candidateRng })
                  : attempt.result.snapshot;
                return Object.freeze({
                  result: Object.freeze({
                    kind: "committed" as const,
                    snapshot: candidateSnapshot,
                    facts: Object.freeze([first, second]),
                  }),
                  diagnostics: options?.zeroRngWithMalformedFact === true
                    ? Object.freeze({
                      ...attempt.diagnostics,
                      candidateRngAfter: candidateRng,
                      committedRngAfter: candidateRng,
                    })
                    : attempt.diagnostics,
                });
              }
              if (attempt.result.kind === "rejected") {
                const first = {
                  code: "synthetic.reject" as const,
                  ignored: "first-raw-rejection",
                };
                const second = {
                  code: "synthetic.reject" as const,
                  ignored: "second-raw-rejection",
                };
                rawRejections.push(first, second);
                return Object.freeze({
                  result: Object.freeze({
                    kind: "rejected" as const,
                    snapshot: attempt.result.snapshot,
                    reasons: Object.freeze([first, second]),
                  }),
                  diagnostics: attempt.diagnostics,
                });
              }
              return attempt;
            },
          }),
          debugCommandExecutor: Object.freeze({
            validate() {
              const error = {
                code: "synthetic.debug_command_unsupported" as const,
                ignored: "raw-debug-validation-error",
              };
              rawDebugValidationErrors.push(error);
              return Object.freeze({
                kind: "validation_failed" as const,
                errors: Object.freeze([error]),
              });
            },
            executeAttempt(): never {
              throw new TypeError("evidence-normalization debug command must not execute");
            },
          }),
        });
      },
    }),
  });
  const entry = Object.freeze({ ...baseEntry, define: () => story });
  const semantic = Object.freeze({
    ...adapterV1,
    projectDispatchResult(
      result: Parameters<typeof adapterV1.projectDispatchResult>[0] & {
        readonly execution?: {
          readonly facts?: readonly EvidenceFactV1[];
          readonly reasons?: readonly EvidenceRejectionV1[];
        };
      },
    ): SyntheticResultV1 {
      projectedFacts = result.execution?.facts;
      projectedRejections = result.execution?.reasons;
      return adapterV1.projectDispatchResult(result);
    },
  });
  const definition = defineCoreGameApplicationV1({
    entry,
    semantic: semantic as unknown as CoreSemanticAdapterV1<
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
  const resolved = resolveCoreGameApplicationV1(definition, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (resolved.kind !== "resolved") {
    throw new TypeError("evidence-normalization Story must resolve");
  }

  return Object.freeze({
    application: resolved.application,
    factSchemaInputs,
    rejectionSchemaInputs,
    debugValidationSchemaInputs,
    rawFacts,
    rawRejections,
    rawDebugValidationErrors,
    normalizedFacts,
    normalizedRejections,
    normalizedDebugValidationErrors,
    earlierFactFrozenDuringNormalization,
    earlierRejectionFrozenDuringNormalization,
    projectedFacts: () => projectedFacts,
    projectedRejections: () => projectedRejections,
  });
}

function resolvedApplicationV1() {
  const result = resolveCoreGameApplicationV1(definitionV1, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (result.kind !== "resolved") {
    throw new Error("synthetic story must resolve");
  }
  return result.application;
}

type BootstrapCandidateFactoryV1 = (
  entropy: CoreApplicationHostServicesV1["entropy"],
) => unknown;

interface BootstrapCharacterizationOptionsV1 {
  readonly initialBootstrapFactory?: BootstrapCandidateFactoryV1;
}

function canonicalBootstrapCandidateV1(
  entropy: CoreApplicationHostServicesV1["entropy"],
): unknown {
  const shared = { marker: 1 };
  return {
    rngSeed: entropy.nextNonZeroUint32(),
    nested: shared,
    repeated: shared,
  };
}

class HiddenBootstrapSourceV1 {
  readonly #privateMarker = "private-bootstrap-marker";
  readonly #weakAssociations = new WeakMap<object, string>();
  #rngSeedDescriptorReads = 0;
  #virtualRngSeedReads = 0;

  create(entropy: CoreApplicationHostServicesV1["entropy"]): object {
    const raw = new Proxy(
      {
        rngSeed: entropy.nextNonZeroUint32(),
        nested: { marker: 1 },
      },
      {
        get: (target, key, receiver) => {
          if (key === "privateMarker") return this.#privateMarker;
          if (key === "rngSeed") {
            this.#virtualRngSeedReads += 1;
            return 211;
          }
          return Reflect.get(target, key, receiver);
        },
        getOwnPropertyDescriptor: (target, key) => {
          const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
          if (key !== "rngSeed" || descriptor === undefined) return descriptor;
          this.#rngSeedDescriptorReads += 1;
          return {
            ...descriptor,
            value: this.#rngSeedDescriptorReads === 1 ? descriptor.value : 197,
          };
        },
      },
    );
    this.#weakAssociations.set(raw, "weak-bootstrap-marker");
    return raw;
  }

  privateMarker(value: unknown): unknown {
    return value === null || typeof value !== "object"
      ? undefined
      : (value as { readonly privateMarker?: unknown }).privateMarker;
  }

  weakMarker(value: unknown): string | undefined {
    return value === null || typeof value !== "object"
      ? undefined
      : this.#weakAssociations.get(value);
  }

  rngSeedDescriptorReads(): number {
    return this.#rngSeedDescriptorReads;
  }

  virtualRngSeedReads(): number {
    return this.#virtualRngSeedReads;
  }
}

function bootstrapCharacterizationFixtureV1(
  options: BootstrapCharacterizationOptionsV1 = {},
) {
  const baseEntry = createSyntheticCounterGamePackageV1();
  const adapterFailure = new Error("synthetic bootstrap adapter failure");
  let failNextBootstrap = false;
  let nextBootstrapFactory = options.initialBootstrapFactory;
  let createInitialStateCalls = 0;
  let statefulModuleInitialStateCalls = 0;
  const rawBootstraps: unknown[] = [];
  const rootReceivedBootstraps: unknown[] = [];
  const statefulModuleReceivedBootstraps: unknown[] = [];
  let extensionContext:
    | CoreApplicationExtensionContextV1<SyntheticSimulationTypesV1>
    | undefined;
  const baseStory = baseEntry.define();
  const createGameSimulation = (
    program: Parameters<typeof baseStory.simulation.createGameSimulation>[0],
  ) => {
    const simulation = baseStory.simulation.createGameSimulation(program);
    const statefulModule = simulation.modules[0];
    const statelessModule = simulation.modules[1];
    const observedStatefulModule = Object.freeze({
      ...statefulModule,
      createInitialState(
        bootstrap: Parameters<typeof statefulModule.createInitialState>[0],
      ) {
        statefulModuleInitialStateCalls += 1;
        statefulModuleReceivedBootstraps.push(bootstrap);
        return statefulModule.createInitialState(bootstrap);
      },
    });
    return Object.freeze({
      ...simulation,
      modules: Object.freeze([observedStatefulModule, statelessModule] as const),
      createBootstrapInput(
        entropy: Parameters<typeof simulation.createBootstrapInput>[0],
      ) {
        if (failNextBootstrap) {
          failNextBootstrap = false;
          throw adapterFailure;
        }
        const factory = nextBootstrapFactory ?? canonicalBootstrapCandidateV1;
        nextBootstrapFactory = undefined;
        const raw = factory(entropy);
        rawBootstraps.push(raw);
        return raw as never;
      },
      createInitialState(
        bootstrap: Parameters<typeof simulation.createInitialState>[0],
      ) {
        createInitialStateCalls += 1;
        rootReceivedBootstraps.push(bootstrap);
        return simulation.createInitialState(bootstrap);
      },
    });
  };
  const story = Object.freeze({
    ...baseStory,
    simulation: Object.freeze({
      ...baseStory.simulation,
      createGameSimulation,
    }),
  });
  const entry = Object.freeze({
    ...baseEntry,
    define: () => story,
  });
  const definition = defineCoreGameApplicationV1({
    ...definitionV1,
    entry,
    createExtensions(context) {
      extensionContext = context;
      return Object.freeze({ extensions: Object.freeze({}) });
    },
  });
  const resolved = resolveCoreGameApplicationV1(definition, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (resolved.kind !== "resolved") {
    throw new TypeError(`bootstrap fixture must resolve: ${JSON.stringify(resolved.failure)}`);
  }
  return Object.freeze({
    application: resolved.application,
    adapterFailure,
    failNextBootstrap() {
      failNextBootstrap = true;
    },
    useNextBootstrap(factory: BootstrapCandidateFactoryV1) {
      nextBootstrapFactory = factory;
    },
    createInitialStateCalls: () => createInitialStateCalls,
    statefulModuleInitialStateCalls: () => statefulModuleInitialStateCalls,
    statelessModulesWithInitializers: () =>
      simulationStatelessInitializerCountV1(
        (resolved.application.resolved as {
          readonly gameSimulation: { readonly modules: readonly unknown[] };
        }).gameSimulation.modules,
      ),
    rawBootstraps: () => Object.freeze([...rawBootstraps]),
    rootReceivedBootstraps: () => Object.freeze([...rootReceivedBootstraps]),
    statefulModuleReceivedBootstraps: () => Object.freeze([...statefulModuleReceivedBootstraps]),
    extensionContext: () => extensionContext,
  });
}

function simulationStatelessInitializerCountV1(modules: readonly unknown[]): number {
  return modules.filter((module) => {
    if (module === null || typeof module !== "object") return false;
    const bindingKind = Object.getOwnPropertyDescriptor(module, "bindingKind")?.value;
    return bindingKind === "stateless" && Object.hasOwn(module, "createInitialState");
  }).length;
}

function bootstrapWorkTupleV1(
  counter: ReturnType<typeof createPurposeTaggedSnapshotWorkCounterV1>,
  createInitialStateCalls: number,
) {
  const counts = counter.snapshot();
  return Object.freeze([
    counts.bootstrapAdmissionCanonicalTraversals,
    counts.bootstrapHandoffFreezeTraversals,
    createInitialStateCalls,
    counts.snapshotFreezeTraversals,
    counts.snapshotDigestTraversals,
  ]);
}

interface CanonicalInvalidBootstrapCaseV1 {
  readonly label: string;
  readonly code: string;
  readonly path: string;
  readonly create: BootstrapCandidateFactoryV1;
}

const canonicalInvalidBootstrapCasesV1: readonly CanonicalInvalidBootstrapCaseV1[] = Object.freeze([
  Object.freeze({
    label: "fractional number",
    code: "number.not_integer",
    path: "/invalid",
    create: (entropy: CoreApplicationHostServicesV1["entropy"]) => ({
      invalid: 0.25,
      rngSeed: entropy.nextNonZeroUint32(),
    }),
  }),
  Object.freeze({
    label: "non-finite number",
    code: "number.non_finite",
    path: "/invalid",
    create: (entropy: CoreApplicationHostServicesV1["entropy"]) => ({
      invalid: Number.POSITIVE_INFINITY,
      rngSeed: entropy.nextNonZeroUint32(),
    }),
  }),
  Object.freeze({
    label: "unsafe integer",
    code: "number.unsafe_integer",
    path: "/invalid",
    create: (entropy: CoreApplicationHostServicesV1["entropy"]) => ({
      invalid: Number.MAX_SAFE_INTEGER + 1,
      rngSeed: entropy.nextNonZeroUint32(),
    }),
  }),
  Object.freeze({
    label: "negative zero",
    code: "number.negative_zero",
    path: "/invalid",
    create: (entropy: CoreApplicationHostServicesV1["entropy"]) => ({
      invalid: -0,
      rngSeed: entropy.nextNonZeroUint32(),
    }),
  }),
  Object.freeze({
    label: "undefined",
    code: "value.undefined",
    path: "/invalid",
    create: (entropy: CoreApplicationHostServicesV1["entropy"]) => ({
      invalid: undefined,
      rngSeed: entropy.nextNonZeroUint32(),
    }),
  }),
  Object.freeze({
    label: "getter",
    code: "value.getter",
    path: "/invalid",
    create: (entropy: CoreApplicationHostServicesV1["entropy"]) => {
      const candidate: Record<string, unknown> = {
        rngSeed: entropy.nextNonZeroUint32(),
      };
      Object.defineProperty(candidate, "invalid", {
        enumerable: true,
        get: () => 1,
      });
      return candidate;
    },
  }),
  Object.freeze({
    label: "custom prototype",
    code: "value.custom_prototype",
    path: "",
    create: (entropy: CoreApplicationHostServicesV1["entropy"]) => {
      const candidate = Object.create(Object.freeze({ inherited: true })) as Record<
        string,
        unknown
      >;
      candidate.rngSeed = entropy.nextNonZeroUint32();
      return candidate;
    },
  }),
  Object.freeze({
    label: "sparse array",
    code: "value.sparse_array",
    path: "/invalid/0",
    create: (entropy: CoreApplicationHostServicesV1["entropy"]) => {
      const sparse: unknown[] = [];
      sparse.length = 1;
      return {
        invalid: sparse,
        rngSeed: entropy.nextNonZeroUint32(),
      };
    },
  }),
  Object.freeze({
    label: "cycle",
    code: "value.cycle",
    path: "/invalid",
    create: (entropy: CoreApplicationHostServicesV1["entropy"]) => {
      const candidate: Record<string, unknown> = {
        rngSeed: entropy.nextNonZeroUint32(),
      };
      candidate.invalid = candidate;
      return candidate;
    },
  }),
]);

interface BootstrapOperationalFailureCaseV1 {
  readonly label: string;
  readonly failure: Error;
  readonly expectedTuple: readonly [number, number, number, number, number];
  readonly create: BootstrapCandidateFactoryV1;
}

const bootstrapOperationalFailureCasesV1: readonly BootstrapOperationalFailureCaseV1[] = Object
  .freeze([
    (() => {
      const failure = new Error("synthetic bootstrap canonical trap failure");
      return Object.freeze({
        label: "canonical traversal trap",
        failure,
        expectedTuple: Object.freeze([1, 0, 0, 0, 0] as const),
        create: (entropy: CoreApplicationHostServicesV1["entropy"]) =>
          new Proxy(
            { rngSeed: entropy.nextNonZeroUint32() },
            {
              getPrototypeOf() {
                throw failure;
              },
            },
          ),
      });
    })(),
  ]);

function expectLatestCanonicalBootstrapHandoffV1(
  fixture: ReturnType<typeof bootstrapCharacterizationFixtureV1>,
  index: number,
): void {
  const raw = fixture.rawBootstraps()[index];
  expect(raw).toMatchObject({
    rngSeed: 101,
    nested: { marker: 1 },
    repeated: { marker: 1 },
  });
  const rootReceived = fixture.rootReceivedBootstraps()[index];
  const moduleReceived = fixture.statefulModuleReceivedBootstraps()[index];
  expect(rootReceived).toBe(moduleReceived);
  expect(rootReceived).not.toBe(raw);
  expect(rootReceived).toEqual(raw);
  expect(Object.isFrozen(rootReceived)).toBe(true);
  expect(Object.isFrozen(raw)).toBe(false);
  const rawNested = raw === null || typeof raw !== "object"
    ? undefined
    : Object.getOwnPropertyDescriptor(raw, "nested")?.value;
  const rawRepeated = raw === null || typeof raw !== "object"
    ? undefined
    : Object.getOwnPropertyDescriptor(raw, "repeated")?.value;
  const admittedNested = rootReceived === null || typeof rootReceived !== "object"
    ? undefined
    : Object.getOwnPropertyDescriptor(rootReceived, "nested")?.value;
  const admittedRepeated = rootReceived === null || typeof rootReceived !== "object"
    ? undefined
    : Object.getOwnPropertyDescriptor(rootReceived, "repeated")?.value;
  expect(rawNested).toBe(rawRepeated);
  expect(Object.isFrozen(rawNested)).toBe(false);
  expect(admittedNested).not.toBe(rawNested);
  expect(admittedRepeated).not.toBe(rawRepeated);
  expect(admittedNested).not.toBe(admittedRepeated);
  expect(Object.isFrozen(admittedNested)).toBe(true);
  expect(Object.isFrozen(admittedRepeated)).toBe(true);
}

async function observeConstructionFailureV1(
  construction: ReturnType<typeof createCoreGameApplicationInstanceV1>,
): Promise<unknown> {
  try {
    const instance = await construction;
    await instance.dispose();
    return undefined;
  } catch (error) {
    return error;
  }
}

function observeSynchronousFailureV1(operation: () => unknown): unknown {
  try {
    operation();
    return undefined;
  } catch (error) {
    return error;
  }
}

function resolvedRollbackApplicationV1() {
  const result = resolveCoreGameApplicationV1(rollbackDefinitionV1, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (result.kind !== "resolved") {
    throw new Error("synthetic rollback story must resolve");
  }
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
  if (result.kind !== "resolved") {
    throw new Error("synthetic story must resolve");
  }
  return result.application;
}

const ownerIdV1 = "owner.sillymaker.test.core-application" as SessionLeaseOwnerId;
const instantV1 = "2026-07-20T00:00:00.000Z" as IsoUtcInstant;
const rngZeroAutoSaveKeyV1 =
  "save-record.v1:story.synthetic-counter:auto.current" as HostRecordKeyV1;

function readFixedRngZeroSnapshotV1(): SyntheticSnapshotV1 {
  return JSON.parse(
    new TextDecoder().decode(createRngZeroStateSnapshotBytesV1()),
  ) as SyntheticSnapshotV1;
}

async function installFixedRngZeroAutoSaveV1(records: HostAtomicRecordStoreV1): Promise<void> {
  const result = await records.commit([
    Object.freeze({
      kind: "put" as const,
      namespace: "save",
      key: rngZeroAutoSaveKeyV1,
      expectedRevision: null,
      bytes: createRngZeroStateSaveBytesV1(),
    }),
  ]);
  if (result.kind !== "committed") {
    throw new TypeError("failed to install fixed zero-state Save fixture");
  }
}

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

function recoverableFailingSaveRecordsV1() {
  const memory = createMemoryHostRecordStoreV1();
  let failSaveWrites = true;
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      if (failSaveWrites && mutations.some(({ namespace }) => namespace === "save")) {
        return Promise.reject(new Error("synthetic disk failure"));
      }
      return memory.commit(mutations);
    },
  });
  return Object.freeze({
    records,
    recover() {
      failSaveWrites = false;
    },
  });
}

function failingAutoSaveRecordsV1() {
  const memory = createMemoryHostRecordStoreV1();
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      if (
        mutations.some(
          ({ namespace, key }) => namespace === "save" && key.includes(":auto.current"),
        )
      ) {
        return Promise.reject(new Error("synthetic Auto Save failure"));
      }
      return memory.commit(mutations);
    },
  });
  return records;
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

function blockedThenFailingSaveRecordsV1() {
  const memory = createMemoryHostRecordStoreV1();
  let blockFirstSave = true;
  let failLaterSaves = true;
  let releaseFirstSave: (() => void) | undefined;
  let reportFirstSaveStarted: (() => void) | undefined;
  const firstSaveStarted = new Promise<void>((resolve) => {
    reportFirstSaveStarted = resolve;
  });
  const firstSaveGate = new Promise<void>((resolve) => {
    releaseFirstSave = resolve;
  });
  const attemptedAutoCounts: number[] = [];
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      const autoCurrent = mutations.find(
        (mutation) => mutation.kind === "put" && mutation.key.includes(":auto.current"),
      );
      if (autoCurrent?.kind === "put") {
        const record = JSON.parse(new TextDecoder().decode(autoCurrent.bytes)) as {
          readonly snapshot: {
            readonly state: {
              readonly simulation: {
                readonly counter: { readonly count: number };
              };
            };
          };
        };
        attemptedAutoCounts.push(record.snapshot.state.simulation.counter.count);
      }
      const writesSave = mutations.some(({ namespace }) => namespace === "save");
      if (blockFirstSave && writesSave) {
        blockFirstSave = false;
        reportFirstSaveStarted?.();
        await firstSaveGate;
        return memory.commit(mutations);
      }
      if (failLaterSaves && writesSave) {
        return Promise.reject(new Error("synthetic repair failure"));
      }
      return memory.commit(mutations);
    },
  });
  return Object.freeze({
    records,
    attemptedAutoCounts,
    waitUntilFirstSaveStarts: () => firstSaveStarted,
    releaseFirstSave: () => releaseFirstSave?.(),
    recover: () => {
      failLaterSaves = false;
    },
  });
}

function blockedSaveClearRecordsV1() {
  const memory = createMemoryHostRecordStoreV1();
  let blockNextSaveClear = false;
  let reportClearStarted: (() => void) | undefined;
  let releaseClear: (() => void) | undefined;
  let clearStarted = Promise.resolve();
  let clearGate = Promise.resolve();
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      if (
        blockNextSaveClear &&
        mutations.some(({ kind, namespace }) => kind === "delete" && namespace === "save")
      ) {
        blockNextSaveClear = false;
        reportClearStarted?.();
        await clearGate;
      }
      return memory.commit(mutations);
    },
  });
  return Object.freeze({
    records,
    blockNextClear() {
      blockNextSaveClear = true;
      clearStarted = new Promise<void>((resolve) => {
        reportClearStarted = resolve;
      });
      clearGate = new Promise<void>((resolve) => {
        releaseClear = resolve;
      });
    },
    waitUntilClearStarts: () => clearStarted,
    releaseClear: () => releaseClear?.(),
  });
}

function manualSchedulerV1() {
  const scheduled: {
    callback: () => void;
    delayMs: number;
    cancelled: boolean;
  }[] = [];
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
    if (entry === undefined || entry.cancelled) {
      throw new Error("no scheduled autosave flush");
    }
    entry.callback();
  };
  return { scheduler, scheduled, runLast };
}

function constructionProbeV1(policy: CoreAutosavePolicyV1) {
  const memory = createMemoryHostRecordStoreV1();
  let sessionFactories = 0;
  let persistenceFactories = 0;
  let schedulerReads = 0;
  let timerSchedules = 0;
  let hostCommits = 0;
  let leaseOwnerAcquisitions = 0;
  let persistenceWrites = 0;
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      hostCommits += 1;
      for (const mutation of mutations) {
        if (mutation.kind !== "put") continue;
        if (mutation.namespace === "save") persistenceWrites += 1;
        if (mutation.namespace !== "lease") continue;
        const decoded = decodeSessionLeaseRecordV1(mutation.bytes);
        if (decoded.kind === "decoded" && decoded.record.ownerId !== null) {
          leaseOwnerAcquisitions += 1;
        }
      }
      return memory.commit(mutations);
    },
  });
  const scheduler: CoreSchedulerV1 = Object.freeze({
    schedule() {
      timerSchedules += 1;
      return () => {};
    },
  });
  const options = instrumentCoreApplicationConstructionOptionsInternalV1(
    Object.freeze({
      host: hostServicesV1(records),
      autosave: policy,
      get scheduler() {
        schedulerReads += 1;
        return scheduler;
      },
    }),
    Object.freeze({
      record(event: CoreApplicationConstructionEventInternalV1) {
        if (event === "session_factory") sessionFactories += 1;
        else persistenceFactories += 1;
      },
    }),
  );
  return Object.freeze({
    options,
    snapshot: () =>
      Object.freeze({
        sessionFactories,
        persistenceFactories,
        schedulerReads,
        timerSchedules,
        hostCommits,
        leaseOwnerAcquisitions,
        persistenceWrites,
      }),
  });
}

const invalidAutosavePoliciesV1 = [
  ["negative delay", { mode: "debounced", delayMs: -1 }],
  ["negative-zero delay", { mode: "debounced", delayMs: -0 }],
  ["fractional delay", { mode: "debounced", delayMs: 0.5 }],
  ["unsafe delay", { mode: "debounced", delayMs: Number.MAX_SAFE_INTEGER + 1 }],
  ["positive-infinite delay", { mode: "debounced", delayMs: Number.POSITIVE_INFINITY }],
  ["negative-infinite delay", { mode: "debounced", delayMs: Number.NEGATIVE_INFINITY }],
  ["NaN delay", { mode: "debounced", delayMs: Number.NaN }],
  ["non-number delay", { mode: "debounced", delayMs: "0" as never }],
  ["zero checkpoint", { mode: "debounced", delayMs: 0, checkpointEveryCommands: 0 }],
  ["negative-zero checkpoint", { mode: "debounced", delayMs: 0, checkpointEveryCommands: -0 }],
  ["negative checkpoint", { mode: "debounced", delayMs: 0, checkpointEveryCommands: -1 }],
  ["fractional checkpoint", { mode: "debounced", delayMs: 0, checkpointEveryCommands: 0.5 }],
  [
    "unsafe checkpoint",
    {
      mode: "debounced",
      delayMs: 0,
      checkpointEveryCommands: Number.MAX_SAFE_INTEGER + 1,
    },
  ],
  [
    "positive-infinite checkpoint",
    { mode: "debounced", delayMs: 0, checkpointEveryCommands: Number.POSITIVE_INFINITY },
  ],
  [
    "negative-infinite checkpoint",
    { mode: "debounced", delayMs: 0, checkpointEveryCommands: Number.NEGATIVE_INFINITY },
  ],
  ["NaN checkpoint", { mode: "debounced", delayMs: 0, checkpointEveryCommands: Number.NaN }],
  [
    "non-number checkpoint",
    { mode: "debounced", delayMs: 0, checkpointEveryCommands: "1" as never },
  ],
] as const satisfies readonly (readonly [string, CoreAutosavePolicyV1])[];

const validAutosavePolicyBoundariesV1 = [
  ["zero delay with omitted checkpoint", { mode: "debounced", delayMs: 0 }, [0], 0],
  [
    "maximum delay with omitted checkpoint",
    { mode: "debounced", delayMs: Number.MAX_SAFE_INTEGER },
    [Number.MAX_SAFE_INTEGER],
    0,
  ],
  [
    "minimum positive checkpoint",
    { mode: "debounced", delayMs: 0, checkpointEveryCommands: 1 },
    [],
    1,
  ],
  [
    "maximum positive checkpoint",
    {
      mode: "debounced",
      delayMs: 0,
      checkpointEveryCommands: Number.MAX_SAFE_INTEGER,
    },
    [0],
    0,
  ],
] as const satisfies readonly (
  readonly [string, CoreAutosavePolicyV1, readonly number[], number]
)[];

// Captured from the pre-AUTO0 implementation at 9724ea3. Length + SHA-256
// pins the physical Save bytes without committing a duplicate Save fixture.
const auto0PreAdmissionCheckpointGoldenV1 = [
  {
    key: "save-record.v1:story.synthetic-counter:auto.current",
    revision: 1,
    byteLength: 1_452,
    bytesDigest: "sha256:7104c4165695ce59705973f7f4cd865435ccaaf301f05b8415a5d4d0ff08e16f",
  },
] as const;

const auto0PreAdmissionSaveGoldenV1 = [
  {
    key: "save-record.v1:story.synthetic-counter:auto.current",
    revision: 2,
    byteLength: 1_452,
    bytesDigest: "sha256:68e1d817a66fe718bec5c6ff4a798517ec87c3218e07fe8b8cff3cce04655ce2",
  },
  {
    key: "save-record.v1:story.synthetic-counter:auto.previous",
    revision: 1,
    byteLength: 1_453,
    bytesDigest: "sha256:43138ffdc7749369104ae008b7a83350dea1519f42d7cd561f5cf63ded5d0104",
  },
] as const;

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

const incrementV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "synthetic.increment",
});
const rejectV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "synthetic.reject",
});
const faultV1 = Object.freeze({
  kind: "invoke" as const,
  actionId: "synthetic.fault",
});

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
    if (result.kind === "failed") {
      expect(result.failure.code.length).toBeGreaterThan(0);
    }
  });
});

describe("createCoreGameApplicationInstanceV1", () => {
  it("projects and freezes a canonical zero seed before preserving its RNG failure on all surfaces", async () => {
    const zeroBootstrapV1: BootstrapCandidateFactoryV1 = () => ({
      rngSeed: 0 as NonZeroUint32,
      nested: { marker: 1 },
    });
    const fixture = bootstrapCharacterizationFixtureV1();
    const records = createMemoryHostRecordStoreV1();
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const healthyHost = hostServicesV1(records, [97]);
    const zeroSeedHost: CoreApplicationHostServicesV1 = Object.freeze({
      ...healthyHost,
      entropy: Object.freeze({
        ...healthyHost.entropy,
        nextNonZeroUint32: () => 0 as NonZeroUint32,
      }),
    });
    const construction = createCoreGameApplicationInstanceV1(
      fixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: zeroSeedHost }),
        counter.instrumentation,
      ),
    ).then(async (instance) => {
      await instance.dispose();
      return instance;
    });

    await expect(construction).rejects.toMatchObject({ code: "rng.invalid_state" });
    expect(bootstrapWorkTupleV1(counter, fixture.createInitialStateCalls())).toEqual([
      1,
      1,
      0,
      0,
      0,
    ]);
    expect(fixture.createInitialStateCalls()).toBe(0);
    expect(await records.list("save")).toEqual([]);
    expect(await records.list("lease")).toEqual([]);

    const restartFixture = bootstrapCharacterizationFixtureV1();
    const restartRecords = createMemoryHostRecordStoreV1();
    const restartCounter = createPurposeTaggedSnapshotWorkCounterV1();
    const restarting = await createCoreGameApplicationInstanceV1(
      restartFixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(restartRecords, [101]) }),
        restartCounter.instrumentation,
      ),
    );
    try {
      const context = restartFixture.extensionContext();
      if (context === undefined) throw new TypeError("restart context missing");
      const snapshotBefore = context.session.getCurrentSnapshot();
      const rootCallsBefore = restartFixture.createInitialStateCalls();
      restartFixture.useNextBootstrap(zeroBootstrapV1);
      restartCounter.reset();
      expect.soft(await restarting.lifecycle.restart()).toEqual({
        kind: "faulted",
        code: "runtime.anchor_failed",
      });
      expect.soft(bootstrapWorkTupleV1(
        restartCounter,
        restartFixture.createInitialStateCalls() - rootCallsBefore,
      )).toEqual([1, 1, 0, 0, 0]);
      expect.soft(Object.isFrozen(restartFixture.rawBootstraps().at(-1))).toBe(false);
      expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect.soft(context.session.getStatus()).toBe("fault_paused");
    } finally {
      await restarting.dispose();
    }

    const extensionFixture = bootstrapCharacterizationFixtureV1();
    const extensionRecords = createMemoryHostRecordStoreV1();
    const extensionCounter = createPurposeTaggedSnapshotWorkCounterV1();
    const extending = await createCoreGameApplicationInstanceV1(
      extensionFixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(extensionRecords, [101]) }),
        extensionCounter.instrumentation,
      ),
    );
    try {
      const context = extensionFixture.extensionContext();
      if (context === undefined) throw new TypeError("extension context missing");
      const snapshotBefore = context.session.getCurrentSnapshot();
      const rootCallsBefore = extensionFixture.createInitialStateCalls();
      extensionFixture.useNextBootstrap(zeroBootstrapV1);
      extensionCounter.reset();
      const error = observeSynchronousFailureV1(() => context.createInitialSnapshot());
      expect.soft(error).toMatchObject({ code: "rng.invalid_state" });
      expect.soft(bootstrapWorkTupleV1(
        extensionCounter,
        extensionFixture.createInitialStateCalls() - rootCallsBefore,
      )).toEqual([1, 1, 0, 0, 0]);
      expect.soft(Object.isFrozen(extensionFixture.rawBootstraps().at(-1))).toBe(false);
      expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect.soft(context.session.getStatus()).toBe("ready");
    } finally {
      await extending.dispose();
    }

    const healthy = await createInstanceV1({ records });
    await expect(healthy.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await healthy.dispose();
  });

  it("observes construction and restart Snapshot work through a package-internal one-shot probe", async () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const options = instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
      Object.freeze({ host: hostServicesV1(createMemoryHostRecordStoreV1(), [97, 101]) }),
      counter.instrumentation,
    );
    const instance = await createCoreGameApplicationInstanceV1(resolvedApplicationV1(), options);

    expect(counter.snapshot()).toEqual({
      snapshotDigestTraversals: 1,
      snapshotFreezeTraversals: 1,
      bootstrapAdmissionCanonicalTraversals: 1,
      bootstrapHandoffFreezeTraversals: 1,
      commandAdmissionCanonicalTraversals: 0,
      commandHandoffFreezeTraversals: 0,
      commandLogMetadataAdmissionCanonicalTraversals: 0,
      commandLogMetadataFreezeTraversals: 0,
      evidenceAdmissionCanonicalTraversals: 0,
      replayComparisonTraversals: 0,
      totalPhysicalCanonicalTraversals: 2,
    });

    counter.reset();
    await expect(instance.lifecycle.restart()).resolves.toMatchObject({ kind: "anchored" });
    expect(counter.snapshot()).toEqual({
      snapshotDigestTraversals: 1,
      snapshotFreezeTraversals: 1,
      bootstrapAdmissionCanonicalTraversals: 1,
      bootstrapHandoffFreezeTraversals: 1,
      commandAdmissionCanonicalTraversals: 0,
      commandHandoffFreezeTraversals: 0,
      commandLogMetadataAdmissionCanonicalTraversals: 0,
      commandLogMetadataFreezeTraversals: 0,
      evidenceAdmissionCanonicalTraversals: 0,
      replayComparisonTraversals: 0,
      totalPhysicalCanonicalTraversals: 2,
    });

    counter.reset();
    await expect(instance.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    // Encoding verifies once; committed readback verifies both raw and
    // normalized-current identity. Capture must still reuse the digest
    // installed under the exact Session runtime-control identity.
    expect(counter.snapshot().snapshotDigestTraversals).toBe(3);
    await instance.dispose();
  });

  it("projects and recursively freezes one bootstrap handoff across all three call surfaces", async () => {
    const fixture = bootstrapCharacterizationFixtureV1();
    const records = createMemoryHostRecordStoreV1();
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const instance = await createCoreGameApplicationInstanceV1(
      fixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(records, [101, 101, 101]) }),
        counter.instrumentation,
      ),
    );
    const context = fixture.extensionContext();
    if (context === undefined) throw new TypeError("bootstrap extension context missing");

    expect(bootstrapWorkTupleV1(counter, fixture.createInitialStateCalls())).toEqual([
      1,
      1,
      1,
      1,
      1,
    ]);
    expect(fixture.statefulModuleInitialStateCalls()).toBe(1);
    expect(fixture.statelessModulesWithInitializers()).toBe(0);
    expectLatestCanonicalBootstrapHandoffV1(fixture, 0);
    const constructed = context.session.getCurrentSnapshot();
    expect(constructed.rng.cursor).toBe(101);
    expect(context.commandLog.replayBase()).toBe(constructed);

    counter.reset();
    const callsBeforeRestart = fixture.createInitialStateCalls();
    const moduleCallsBeforeRestart = fixture.statefulModuleInitialStateCalls();
    await expect(instance.lifecycle.restart()).resolves.toEqual({
      kind: "anchored",
      commandSequence: 0,
    });
    const restarted = context.session.getCurrentSnapshot();
    expect(bootstrapWorkTupleV1(
      counter,
      fixture.createInitialStateCalls() - callsBeforeRestart,
    )).toEqual([1, 1, 1, 1, 1]);
    expect(fixture.statefulModuleInitialStateCalls() - moduleCallsBeforeRestart).toBe(1);
    expectLatestCanonicalBootstrapHandoffV1(fixture, 1);
    expect(restarted).not.toBe(constructed);
    expect(restarted.rng.cursor).toBe(101);
    expect(context.commandLog.replayBase()).toBe(restarted);
    expect(context.commandLog.entries()).toEqual([]);

    counter.reset();
    const callsBeforeExtension = fixture.createInitialStateCalls();
    const moduleCallsBeforeExtension = fixture.statefulModuleInitialStateCalls();
    const extensionCandidate = context.createInitialSnapshot();
    expect(bootstrapWorkTupleV1(
      counter,
      fixture.createInitialStateCalls() - callsBeforeExtension,
    )).toEqual([1, 1, 1, 0, 0]);
    expect(fixture.statefulModuleInitialStateCalls() - moduleCallsBeforeExtension).toBe(1);
    expectLatestCanonicalBootstrapHandoffV1(fixture, 2);
    expect(extensionCandidate).not.toBe(restarted);
    expect(extensionCandidate.rng.cursor).toBe(101);
    expect(context.session.getCurrentSnapshot()).toBe(restarted);
    expect(context.commandLog.replayBase()).toBe(restarted);
    expect(await rawSaveEvidenceV1(records)).toEqual([]);
    await instance.dispose();
  });

  it("does not carry Proxy, private-field, or WeakMap identity state into bootstrap authority", async () => {
    const hiddenSource = new HiddenBootstrapSourceV1();
    const fixture = bootstrapCharacterizationFixtureV1({
      initialBootstrapFactory: (entropy) => hiddenSource.create(entropy),
    });
    const instance = await createCoreGameApplicationInstanceV1(
      fixture.application,
      Object.freeze({
        host: hostServicesV1(createMemoryHostRecordStoreV1(), [101]),
      }),
    );
    try {
      const raw = fixture.rawBootstraps()[0];
      const rootReceived = fixture.rootReceivedBootstraps()[0];
      const moduleReceived = fixture.statefulModuleReceivedBootstraps()[0];
      const rngSeedDescriptorReadsAfterAdmission = hiddenSource.rngSeedDescriptorReads();
      const virtualRngSeedReadsAfterAdmission = hiddenSource.virtualRngSeedReads();

      expect(rootReceived).toBe(moduleReceived);
      expect(rootReceived).not.toBe(raw);
      expect(rootReceived).toEqual({
        nested: { marker: 1 },
        rngSeed: 101,
      });
      expect(instance.admin.inspectForTest().snapshot.rng.cursor).toBe(101);
      expect(rngSeedDescriptorReadsAfterAdmission).toBe(1);
      expect(virtualRngSeedReadsAfterAdmission).toBe(0);
      expect(hiddenSource.privateMarker(raw)).toBe("private-bootstrap-marker");
      expect(hiddenSource.privateMarker(rootReceived)).toBeUndefined();
      expect(hiddenSource.weakMarker(raw)).toBe("weak-bootstrap-marker");
      expect(hiddenSource.weakMarker(rootReceived)).toBeUndefined();
      expect(Object.isFrozen(raw)).toBe(false);
      expect(Object.isFrozen(rootReceived)).toBe(true);
    } finally {
      await instance.dispose();
    }
  });

  it.each(canonicalInvalidBootstrapCasesV1)(
    "rejects canonical-invalid bootstrap $label before construction owns runtime resources",
    async ({ code, path, create }: CanonicalInvalidBootstrapCaseV1) => {
      const fixture = bootstrapCharacterizationFixtureV1({
        initialBootstrapFactory: create,
      });
      const records = createMemoryHostRecordStoreV1();
      const counter = createPurposeTaggedSnapshotWorkCounterV1();
      const constructionEvents: CoreApplicationConstructionEventInternalV1[] = [];
      const options = Object.freeze({ host: hostServicesV1(records, [101]) });
      instrumentCoreApplicationConstructionOptionsInternalV1(
        options,
        Object.freeze({
          record(event: CoreApplicationConstructionEventInternalV1) {
            constructionEvents.push(event);
          },
        }),
      );
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(options, counter.instrumentation);

      const error = await observeConstructionFailureV1(
        createCoreGameApplicationInstanceV1(fixture.application, options),
      );

      expect.soft(error).toMatchObject({ code, path });
      expect.soft(bootstrapWorkTupleV1(counter, fixture.createInitialStateCalls())).toEqual([
        1,
        0,
        0,
        0,
        0,
      ]);
      expect.soft(fixture.statefulModuleInitialStateCalls()).toBe(0);
      expect.soft(fixture.rootReceivedBootstraps()).toEqual([]);
      expect.soft(fixture.statefulModuleReceivedBootstraps()).toEqual([]);
      expect.soft(Object.isFrozen(fixture.rawBootstraps()[0])).toBe(false);
      expect.soft(constructionEvents).toEqual([]);
      expect.soft(await records.list("save")).toEqual([]);
      expect.soft(await records.list("lease")).toEqual([]);
    },
  );

  it("rejects one canonical-invalid bootstrap atomically on queued restart", async () => {
    const invalid = canonicalInvalidBootstrapCasesV1[0];
    if (invalid === undefined) throw new TypeError("missing fractional bootstrap fixture");
    const fixture = bootstrapCharacterizationFixtureV1();
    const records = createMemoryHostRecordStoreV1();
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const instance = await createCoreGameApplicationInstanceV1(
      fixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(records, [101, 101]) }),
        counter.instrumentation,
      ),
    );
    try {
      const context = fixture.extensionContext();
      if (context === undefined) throw new TypeError("bootstrap extension context missing");
      await expect(instance.persistence.save("quick")).resolves.toEqual({
        kind: "saved",
        slotId: "quick",
      });
      const snapshotBefore = context.session.getCurrentSnapshot();
      const digestBefore = instance.admin.stateDigest();
      const logBefore = context.commandLog.entries();
      const replayBaseBefore = context.commandLog.replayBase();
      const anchorBefore = instance.presentationAnchor();
      const savesBefore = await rawSaveEvidenceV1(records);
      const rootCallsBefore = fixture.createInitialStateCalls();
      const moduleCallsBefore = fixture.statefulModuleInitialStateCalls();
      fixture.useNextBootstrap(invalid.create);
      counter.reset();

      const result = await instance.lifecycle.restart();

      expect.soft(result).toEqual({
        kind: "faulted",
        code: "runtime.anchor_failed",
      });
      expect.soft(
        bootstrapWorkTupleV1(
          counter,
          fixture.createInitialStateCalls() - rootCallsBefore,
        ),
      ).toEqual([1, 0, 0, 0, 0]);
      expect.soft(fixture.statefulModuleInitialStateCalls() - moduleCallsBefore).toBe(0);
      expect.soft(Object.isFrozen(fixture.rawBootstraps().at(-1))).toBe(false);
      expect.soft(context.session.getStatus()).toBe("fault_paused");
      expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect.soft(instance.admin.stateDigest()).toBe(digestBefore);
      expect.soft(context.commandLog.entries()).toBe(logBefore);
      expect.soft(context.commandLog.replayBase()).toBe(replayBaseBefore);
      expect.soft(instance.presentationAnchor()).toEqual(anchorBefore);
      expect.soft(await rawSaveEvidenceV1(records)).toEqual(savesBefore);
    } finally {
      await instance.dispose();
    }
  });

  it("rejects one canonical-invalid bootstrap atomically through the captured extension helper", async () => {
    const invalid = canonicalInvalidBootstrapCasesV1[0];
    if (invalid === undefined) throw new TypeError("missing fractional bootstrap fixture");
    const fixture = bootstrapCharacterizationFixtureV1();
    const records = createMemoryHostRecordStoreV1();
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const instance = await createCoreGameApplicationInstanceV1(
      fixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(records, [101, 101]) }),
        counter.instrumentation,
      ),
    );
    try {
      const context = fixture.extensionContext();
      if (context === undefined) throw new TypeError("bootstrap extension context missing");
      await expect(instance.persistence.save("quick")).resolves.toEqual({
        kind: "saved",
        slotId: "quick",
      });
      const snapshotBefore = context.session.getCurrentSnapshot();
      const digestBefore = instance.admin.stateDigest();
      const logBefore = context.commandLog.entries();
      const replayBaseBefore = context.commandLog.replayBase();
      const anchorBefore = instance.presentationAnchor();
      const savesBefore = await rawSaveEvidenceV1(records);
      const rootCallsBefore = fixture.createInitialStateCalls();
      const moduleCallsBefore = fixture.statefulModuleInitialStateCalls();
      fixture.useNextBootstrap(invalid.create);
      counter.reset();

      const error = observeSynchronousFailureV1(() => context.createInitialSnapshot());

      expect.soft(error).toMatchObject({ code: invalid.code, path: invalid.path });
      expect.soft(
        bootstrapWorkTupleV1(
          counter,
          fixture.createInitialStateCalls() - rootCallsBefore,
        ),
      ).toEqual([1, 0, 0, 0, 0]);
      expect.soft(fixture.statefulModuleInitialStateCalls() - moduleCallsBefore).toBe(0);
      expect.soft(Object.isFrozen(fixture.rawBootstraps().at(-1))).toBe(false);
      expect.soft(context.session.getStatus()).toBe("ready");
      expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect.soft(instance.admin.stateDigest()).toBe(digestBefore);
      expect.soft(context.commandLog.entries()).toBe(logBefore);
      expect.soft(context.commandLog.replayBase()).toBe(replayBaseBefore);
      expect.soft(instance.presentationAnchor()).toEqual(anchorBefore);
      expect.soft(await rawSaveEvidenceV1(records)).toEqual(savesBefore);
    } finally {
      await instance.dispose();
    }
  });

  it.each(bootstrapOperationalFailureCasesV1)(
    "preserves $label classification and authority atomicity on all call surfaces",
    async ({ create, expectedTuple, failure }: BootstrapOperationalFailureCaseV1) => {
      const constructionFixture = bootstrapCharacterizationFixtureV1({
        initialBootstrapFactory: create,
      });
      const constructionRecords = createMemoryHostRecordStoreV1();
      const constructionCounter = createPurposeTaggedSnapshotWorkCounterV1();
      const constructionEvents: CoreApplicationConstructionEventInternalV1[] = [];
      const constructionOptions = Object.freeze({
        host: hostServicesV1(constructionRecords, [101]),
      });
      instrumentCoreApplicationConstructionOptionsInternalV1(
        constructionOptions,
        Object.freeze({
          record(event: CoreApplicationConstructionEventInternalV1) {
            constructionEvents.push(event);
          },
        }),
      );
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        constructionOptions,
        constructionCounter.instrumentation,
      );

      expect.soft(
        await observeConstructionFailureV1(
          createCoreGameApplicationInstanceV1(
            constructionFixture.application,
            constructionOptions,
          ),
        ),
      ).toBe(failure);
      expect.soft(bootstrapWorkTupleV1(
        constructionCounter,
        constructionFixture.createInitialStateCalls(),
      )).toEqual(expectedTuple);
      expect.soft(constructionFixture.statefulModuleInitialStateCalls()).toBe(0);
      expect.soft(constructionEvents).toEqual([]);
      expect.soft(await constructionRecords.list("lease")).toEqual([]);
      expect.soft(await rawSaveEvidenceV1(constructionRecords)).toEqual([]);

      const restartFixture = bootstrapCharacterizationFixtureV1();
      const restartRecords = createMemoryHostRecordStoreV1();
      const restartCounter = createPurposeTaggedSnapshotWorkCounterV1();
      const restarting = await createCoreGameApplicationInstanceV1(
        restartFixture.application,
        instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
          Object.freeze({ host: hostServicesV1(restartRecords, [101, 101]) }),
          restartCounter.instrumentation,
        ),
      );
      try {
        const context = restartFixture.extensionContext();
        if (context === undefined) throw new TypeError("restart context missing");
        await expect(restarting.persistence.save("quick")).resolves.toMatchObject({
          kind: "saved",
        });
        const snapshotBefore = context.session.getCurrentSnapshot();
        const digestBefore = restarting.admin.stateDigest();
        const logBefore = context.commandLog.entries();
        const replayBaseBefore = context.commandLog.replayBase();
        const anchorBefore = restarting.presentationAnchor();
        const savesBefore = await rawSaveEvidenceV1(restartRecords);
        const rootCallsBefore = restartFixture.createInitialStateCalls();
        const moduleCallsBefore = restartFixture.statefulModuleInitialStateCalls();
        restartFixture.useNextBootstrap(create);
        restartCounter.reset();

        expect.soft(await restarting.lifecycle.restart()).toEqual({
          kind: "faulted",
          code: "runtime.anchor_failed",
        });
        expect.soft(bootstrapWorkTupleV1(
          restartCounter,
          restartFixture.createInitialStateCalls() - rootCallsBefore,
        )).toEqual(expectedTuple);
        expect.soft(
          restartFixture.statefulModuleInitialStateCalls() - moduleCallsBefore,
        ).toBe(0);
        expect.soft(context.session.getStatus()).toBe("fault_paused");
        expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
        expect.soft(restarting.admin.stateDigest()).toBe(digestBefore);
        expect.soft(context.commandLog.entries()).toBe(logBefore);
        expect.soft(context.commandLog.replayBase()).toBe(replayBaseBefore);
        expect.soft(restarting.presentationAnchor()).toEqual(anchorBefore);
        expect.soft(await rawSaveEvidenceV1(restartRecords)).toEqual(savesBefore);
      } finally {
        await restarting.dispose();
      }

      const extensionFixture = bootstrapCharacterizationFixtureV1();
      const extensionRecords = createMemoryHostRecordStoreV1();
      const extensionCounter = createPurposeTaggedSnapshotWorkCounterV1();
      const extending = await createCoreGameApplicationInstanceV1(
        extensionFixture.application,
        instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
          Object.freeze({ host: hostServicesV1(extensionRecords, [101, 101]) }),
          extensionCounter.instrumentation,
        ),
      );
      try {
        const context = extensionFixture.extensionContext();
        if (context === undefined) throw new TypeError("extension context missing");
        await expect(extending.persistence.save("quick")).resolves.toMatchObject({
          kind: "saved",
        });
        const snapshotBefore = context.session.getCurrentSnapshot();
        const digestBefore = extending.admin.stateDigest();
        const logBefore = context.commandLog.entries();
        const replayBaseBefore = context.commandLog.replayBase();
        const anchorBefore = extending.presentationAnchor();
        const savesBefore = await rawSaveEvidenceV1(extensionRecords);
        const rootCallsBefore = extensionFixture.createInitialStateCalls();
        const moduleCallsBefore = extensionFixture.statefulModuleInitialStateCalls();
        extensionFixture.useNextBootstrap(create);
        extensionCounter.reset();

        expect.soft(observeSynchronousFailureV1(
          () => context.createInitialSnapshot(),
        )).toBe(failure);
        expect.soft(bootstrapWorkTupleV1(
          extensionCounter,
          extensionFixture.createInitialStateCalls() - rootCallsBefore,
        )).toEqual(expectedTuple);
        expect.soft(
          extensionFixture.statefulModuleInitialStateCalls() - moduleCallsBefore,
        ).toBe(0);
        expect.soft(context.session.getStatus()).toBe("ready");
        expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
        expect.soft(extending.admin.stateDigest()).toBe(digestBefore);
        expect.soft(context.commandLog.entries()).toBe(logBefore);
        expect.soft(context.commandLog.replayBase()).toBe(replayBaseBefore);
        expect.soft(extending.presentationAnchor()).toEqual(anchorBefore);
        expect.soft(await rawSaveEvidenceV1(extensionRecords)).toEqual(savesBefore);
      } finally {
        await extending.dispose();
      }
    },
  );

  it("preserves projection-freeze failure classification and authority atomicity on all call surfaces", async () => {
    const failure = new Error("synthetic bootstrap projection freeze failure");

    const constructionFixture = bootstrapCharacterizationFixtureV1();
    const constructionRecords = createMemoryHostRecordStoreV1();
    const constructionCounter = createPurposeTaggedSnapshotWorkCounterV1();
    const constructionEvents: CoreApplicationConstructionEventInternalV1[] = [];
    let constructionProjection: unknown;
    const constructionOptions = Object.freeze({
      host: hostServicesV1(constructionRecords, [101]),
    });
    instrumentCoreApplicationConstructionOptionsInternalV1(
      constructionOptions,
      Object.freeze({
        record(event: CoreApplicationConstructionEventInternalV1) {
          constructionEvents.push(event);
        },
      }),
    );
    instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
      constructionOptions,
      constructionCounter.instrumentation,
    );
    instrumentCoreApplicationBootstrapAdmissionOptionsInternalV1(
      constructionOptions,
      Object.freeze({
        beforeProjectionFreeze(projection: unknown) {
          constructionProjection = projection;
          throw failure;
        },
      }),
    );

    expect.soft(
      await observeConstructionFailureV1(
        createCoreGameApplicationInstanceV1(
          constructionFixture.application,
          constructionOptions,
        ),
      ),
    ).toBe(failure);
    const constructionRaw = constructionFixture.rawBootstraps()[0];
    expect.soft(constructionProjection).not.toBe(constructionRaw);
    expect.soft(Object.isFrozen(constructionProjection)).toBe(false);
    expect.soft(Object.isFrozen(constructionRaw)).toBe(false);
    expect.soft(bootstrapWorkTupleV1(
      constructionCounter,
      constructionFixture.createInitialStateCalls(),
    )).toEqual([1, 1, 0, 0, 0]);
    expect.soft(constructionFixture.statefulModuleInitialStateCalls()).toBe(0);
    expect.soft(constructionEvents).toEqual([]);
    expect.soft(await constructionRecords.list("lease")).toEqual([]);
    expect.soft(await rawSaveEvidenceV1(constructionRecords)).toEqual([]);

    const restartFixture = bootstrapCharacterizationFixtureV1();
    const restartRecords = createMemoryHostRecordStoreV1();
    const restartCounter = createPurposeTaggedSnapshotWorkCounterV1();
    let restartArmed = false;
    let restartFailureProjection: unknown;
    const restartOptions = Object.freeze({
      host: hostServicesV1(restartRecords, [101, 101]),
    });
    instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
      restartOptions,
      restartCounter.instrumentation,
    );
    instrumentCoreApplicationBootstrapAdmissionOptionsInternalV1(
      restartOptions,
      Object.freeze({
        beforeProjectionFreeze(projection: unknown) {
          if (!restartArmed) return;
          restartFailureProjection = projection;
          throw failure;
        },
      }),
    );
    const restarting = await createCoreGameApplicationInstanceV1(
      restartFixture.application,
      restartOptions,
    );
    try {
      const context = restartFixture.extensionContext();
      if (context === undefined) throw new TypeError("restart context missing");
      await expect(restarting.persistence.save("quick")).resolves.toMatchObject({
        kind: "saved",
      });
      const snapshotBefore = context.session.getCurrentSnapshot();
      const digestBefore = restarting.admin.stateDigest();
      const logBefore = context.commandLog.entries();
      const replayBaseBefore = context.commandLog.replayBase();
      const anchorBefore = restarting.presentationAnchor();
      const savesBefore = await rawSaveEvidenceV1(restartRecords);
      const rootCallsBefore = restartFixture.createInitialStateCalls();
      const moduleCallsBefore = restartFixture.statefulModuleInitialStateCalls();
      restartCounter.reset();
      restartArmed = true;

      expect.soft(await restarting.lifecycle.restart()).toEqual({
        kind: "faulted",
        code: "runtime.anchor_failed",
      });
      const restartRaw = restartFixture.rawBootstraps().at(-1);
      expect.soft(restartFailureProjection).not.toBe(restartRaw);
      expect.soft(Object.isFrozen(restartFailureProjection)).toBe(false);
      expect.soft(Object.isFrozen(restartRaw)).toBe(false);
      expect.soft(bootstrapWorkTupleV1(
        restartCounter,
        restartFixture.createInitialStateCalls() - rootCallsBefore,
      )).toEqual([1, 1, 0, 0, 0]);
      expect.soft(
        restartFixture.statefulModuleInitialStateCalls() - moduleCallsBefore,
      ).toBe(0);
      expect.soft(context.session.getStatus()).toBe("fault_paused");
      expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect.soft(restarting.admin.stateDigest()).toBe(digestBefore);
      expect.soft(context.commandLog.entries()).toBe(logBefore);
      expect.soft(context.commandLog.replayBase()).toBe(replayBaseBefore);
      expect.soft(restarting.presentationAnchor()).toEqual(anchorBefore);
      expect.soft(await rawSaveEvidenceV1(restartRecords)).toEqual(savesBefore);
    } finally {
      await restarting.dispose();
    }

    const extensionFixture = bootstrapCharacterizationFixtureV1();
    const extensionRecords = createMemoryHostRecordStoreV1();
    const extensionCounter = createPurposeTaggedSnapshotWorkCounterV1();
    let extensionArmed = false;
    let extensionFailureProjection: unknown;
    const extensionOptions = Object.freeze({
      host: hostServicesV1(extensionRecords, [101, 101]),
    });
    instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
      extensionOptions,
      extensionCounter.instrumentation,
    );
    instrumentCoreApplicationBootstrapAdmissionOptionsInternalV1(
      extensionOptions,
      Object.freeze({
        beforeProjectionFreeze(projection: unknown) {
          if (!extensionArmed) return;
          extensionFailureProjection = projection;
          throw failure;
        },
      }),
    );
    const extending = await createCoreGameApplicationInstanceV1(
      extensionFixture.application,
      extensionOptions,
    );
    try {
      const context = extensionFixture.extensionContext();
      if (context === undefined) throw new TypeError("extension context missing");
      await expect(extending.persistence.save("quick")).resolves.toMatchObject({
        kind: "saved",
      });
      const snapshotBefore = context.session.getCurrentSnapshot();
      const digestBefore = extending.admin.stateDigest();
      const logBefore = context.commandLog.entries();
      const replayBaseBefore = context.commandLog.replayBase();
      const anchorBefore = extending.presentationAnchor();
      const savesBefore = await rawSaveEvidenceV1(extensionRecords);
      const rootCallsBefore = extensionFixture.createInitialStateCalls();
      const moduleCallsBefore = extensionFixture.statefulModuleInitialStateCalls();
      extensionCounter.reset();
      extensionArmed = true;

      expect.soft(observeSynchronousFailureV1(
        () => context.createInitialSnapshot(),
      )).toBe(failure);
      const extensionRaw = extensionFixture.rawBootstraps().at(-1);
      expect.soft(extensionFailureProjection).not.toBe(extensionRaw);
      expect.soft(Object.isFrozen(extensionFailureProjection)).toBe(false);
      expect.soft(Object.isFrozen(extensionRaw)).toBe(false);
      expect.soft(bootstrapWorkTupleV1(
        extensionCounter,
        extensionFixture.createInitialStateCalls() - rootCallsBefore,
      )).toEqual([1, 1, 0, 0, 0]);
      expect.soft(
        extensionFixture.statefulModuleInitialStateCalls() - moduleCallsBefore,
      ).toBe(0);
      expect.soft(context.session.getStatus()).toBe("ready");
      expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect.soft(extending.admin.stateDigest()).toBe(digestBefore);
      expect.soft(context.commandLog.entries()).toBe(logBefore);
      expect.soft(context.commandLog.replayBase()).toBe(replayBaseBefore);
      expect.soft(extending.presentationAnchor()).toEqual(anchorBefore);
      expect.soft(await rawSaveEvidenceV1(extensionRecords)).toEqual(savesBefore);
    } finally {
      await extending.dispose();
    }
  });

  it("gives canonical bootstrap failure precedence over an invalid zero seed on all call surfaces", async () => {
    const invalidZeroBootstrapV1: BootstrapCandidateFactoryV1 = () => ({
      invalid: 0.25,
      rngSeed: 0 as NonZeroUint32,
    });

    const constructionFixture = bootstrapCharacterizationFixtureV1({
      initialBootstrapFactory: invalidZeroBootstrapV1,
    });
    const constructionRecords = createMemoryHostRecordStoreV1();
    const constructionCounter = createPurposeTaggedSnapshotWorkCounterV1();
    const constructionError = await observeConstructionFailureV1(
      createCoreGameApplicationInstanceV1(
        constructionFixture.application,
        instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
          Object.freeze({ host: hostServicesV1(constructionRecords, [101]) }),
          constructionCounter.instrumentation,
        ),
      ),
    );
    expect.soft(constructionError).toMatchObject({
      code: "number.not_integer",
      path: "/invalid",
    });
    expect.soft(bootstrapWorkTupleV1(
      constructionCounter,
      constructionFixture.createInitialStateCalls(),
    )).toEqual([1, 0, 0, 0, 0]);
    expect.soft(await constructionRecords.list("save")).toEqual([]);
    expect.soft(await constructionRecords.list("lease")).toEqual([]);

    const restartFixture = bootstrapCharacterizationFixtureV1();
    const restartRecords = createMemoryHostRecordStoreV1();
    const restartCounter = createPurposeTaggedSnapshotWorkCounterV1();
    const restarting = await createCoreGameApplicationInstanceV1(
      restartFixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(restartRecords, [101]) }),
        restartCounter.instrumentation,
      ),
    );
    try {
      const context = restartFixture.extensionContext();
      if (context === undefined) throw new TypeError("restart context missing");
      const snapshotBefore = context.session.getCurrentSnapshot();
      const rootCallsBefore = restartFixture.createInitialStateCalls();
      restartFixture.useNextBootstrap(invalidZeroBootstrapV1);
      restartCounter.reset();
      expect.soft(await restarting.lifecycle.restart()).toEqual({
        kind: "faulted",
        code: "runtime.anchor_failed",
      });
      expect.soft(bootstrapWorkTupleV1(
        restartCounter,
        restartFixture.createInitialStateCalls() - rootCallsBefore,
      )).toEqual([1, 0, 0, 0, 0]);
      expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect.soft(context.session.getStatus()).toBe("fault_paused");
    } finally {
      await restarting.dispose();
    }

    const extensionFixture = bootstrapCharacterizationFixtureV1();
    const extensionRecords = createMemoryHostRecordStoreV1();
    const extensionCounter = createPurposeTaggedSnapshotWorkCounterV1();
    const extending = await createCoreGameApplicationInstanceV1(
      extensionFixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(extensionRecords, [101]) }),
        extensionCounter.instrumentation,
      ),
    );
    try {
      const context = extensionFixture.extensionContext();
      if (context === undefined) throw new TypeError("extension context missing");
      const snapshotBefore = context.session.getCurrentSnapshot();
      const rootCallsBefore = extensionFixture.createInitialStateCalls();
      extensionFixture.useNextBootstrap(invalidZeroBootstrapV1);
      extensionCounter.reset();
      const error = observeSynchronousFailureV1(() => context.createInitialSnapshot());
      expect.soft(error).toMatchObject({ code: "number.not_integer", path: "/invalid" });
      expect.soft(bootstrapWorkTupleV1(
        extensionCounter,
        extensionFixture.createInitialStateCalls() - rootCallsBefore,
      )).toEqual([1, 0, 0, 0, 0]);
      expect.soft(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect.soft(context.session.getStatus()).toBe("ready");
    } finally {
      await extending.dispose();
    }
  });

  it.each([
    Object.freeze({
      mode: "preflight" as const,
      expectedTuple: Object.freeze([0, 0, 0, 0, 0] as const),
      expectedModuleCalls: 0,
    }),
    Object.freeze({
      mode: "post_operation" as const,
      expectedTuple: Object.freeze([1, 1, 1, 0, 0] as const),
      expectedModuleCalls: 1,
    }),
    Object.freeze({
      mode: "catch" as const,
      expectedTuple: Object.freeze([1, 0, 0, 0, 0] as const),
      expectedModuleCalls: 0,
    }),
  ])(
    "lets the queued-restart $mode HMR fence win without installing bootstrap work",
    async ({ mode, expectedTuple, expectedModuleCalls }) => {
      const fixture = bootstrapCharacterizationFixtureV1();
      const records = createMemoryHostRecordStoreV1();
      const counter = createPurposeTaggedSnapshotWorkCounterV1();
      const instance = await createCoreGameApplicationInstanceV1(
        fixture.application,
        instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
          Object.freeze({ host: hostServicesV1(records, [101, 103]) }),
          counter.instrumentation,
        ),
      );
      try {
        const context = fixture.extensionContext();
        if (context === undefined) throw new TypeError("bootstrap extension context missing");
        await expect(instance.persistence.save("quick")).resolves.toEqual({
          kind: "saved",
          slotId: "quick",
        });
        const snapshotBefore = context.session.getCurrentSnapshot();
        const digestBefore = instance.admin.stateDigest();
        const logBefore = context.commandLog.entries();
        const replayBaseBefore = context.commandLog.replayBase();
        const anchorBefore = instance.presentationAnchor();
        const savesBefore = await rawSaveEvidenceV1(records);
        const rootCallsBefore = fixture.createInitialStateCalls();
        const moduleCallsBefore = fixture.statefulModuleInitialStateCalls();
        const projectionFailure = new Error("synthetic HMR bootstrap projection failure");
        counter.reset();

        if (mode === "preflight") {
          instance.invalidateForHmr();
        } else if (mode === "post_operation") {
          fixture.useNextBootstrap((entropy) => {
            instance.invalidateForHmr();
            return canonicalBootstrapCandidateV1(entropy);
          });
        } else {
          fixture.useNextBootstrap((entropy) =>
            new Proxy(
              { rngSeed: entropy.nextNonZeroUint32() },
              {
                getPrototypeOf() {
                  instance.invalidateForHmr();
                  throw projectionFailure;
                },
              },
            )
          );
        }

        await expect(instance.lifecycle.restart()).resolves.toEqual({
          kind: "rejected",
          code: "hmr_invalidated",
        });
        expect(bootstrapWorkTupleV1(
          counter,
          fixture.createInitialStateCalls() - rootCallsBefore,
        )).toEqual(expectedTuple);
        expect(
          fixture.statefulModuleInitialStateCalls() - moduleCallsBefore,
        ).toBe(expectedModuleCalls);
        expect(context.session.getStatus()).toBe("hmr_invalidated");
        expect(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
        expect(instance.admin.stateDigest()).toBe(digestBefore);
        expect(context.commandLog.entries()).toBe(logBefore);
        expect(context.commandLog.replayBase()).toBe(replayBaseBefore);
        expect(instance.presentationAnchor()).toEqual(anchorBefore);
        expect(await rawSaveEvidenceV1(records)).toEqual(savesBefore);
      } finally {
        await instance.dispose();
      }
    },
  );

  it.each(["runtime", "debug"] as const)(
    "rejects a fixed zero RNG %s anchor before replacement preparation",
    async (surface) => {
      const fixture = bootstrapCharacterizationFixtureV1();
      const records = createMemoryHostRecordStoreV1();
      const counter = createPurposeTaggedSnapshotWorkCounterV1();
      const instance = await createCoreGameApplicationInstanceV1(
        fixture.application,
        instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
          Object.freeze({ host: hostServicesV1(records, [97]) }),
          counter.instrumentation,
        ),
      );
      const context = fixture.extensionContext();
      if (context === undefined) throw new TypeError("bootstrap extension context missing");
      const snapshotBefore = context.session.getCurrentSnapshot();
      const digestBefore = instance.admin.stateDigest();
      const logBefore = context.commandLog.entries();
      const replayBaseBefore = context.commandLog.replayBase();
      const anchorBefore = instance.presentationAnchor();
      const savesBefore = await rawSaveEvidenceV1(records);
      const prepareReplacement = vi.fn();
      const normalize = vi.fn((error: unknown): RngAnchorAdmissionResultV1 => {
        const code = (error as { readonly code?: unknown }).code;
        return Object.freeze({
          kind: "rejected" as const,
          code: typeof code === "string" ? code : "unknown",
        });
      });
      const zero = readFixedRngZeroSnapshotV1();
      counter.reset();

      const result = surface === "runtime"
        ? await context.runtimeControl.enqueueAuthoritative<RngAnchorAdmissionResultV1>(
          async () =>
            Object.freeze({
              kind: "replace" as const,
              snapshot: zero,
              result: Object.freeze({ kind: "anchored" as const }),
              anchor: "replace_replay_base" as const,
            }),
          normalize,
          prepareReplacement,
        )
        : await context.debugControl.anchorReplacement<RngAnchorAdmissionResultV1>(
          Object.freeze({ kind: "debug_bundle" as const }),
          async () =>
            Object.freeze({
              kind: "replace" as const,
              snapshot: zero,
              result: Object.freeze({ kind: "anchored" as const }),
            }),
          () => true,
          normalize,
          prepareReplacement,
        );

      expect(result).toEqual({ kind: "rejected", code: "rng.invalid_state" });
      expect(normalize).toHaveBeenCalledTimes(1);
      expect(normalize.mock.calls[0]?.[0]).toMatchObject({ code: "rng.invalid_state" });
      expect(prepareReplacement).not.toHaveBeenCalled();
      expect(counter.snapshot()).toMatchObject({
        snapshotDigestTraversals: 0,
        snapshotFreezeTraversals: 0,
        totalPhysicalCanonicalTraversals: 0,
      });
      expect(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect(instance.admin.stateDigest()).toBe(digestBefore);
      expect(context.commandLog.entries()).toBe(logBefore);
      expect(context.commandLog.replayBase()).toBe(replayBaseBefore);
      expect(context.session.getStatus()).toBe("ready");
      expect(instance.presentationAnchor()).toEqual(anchorBefore);
      expect(await rawSaveEvidenceV1(records)).toEqual(savesBefore);
      await expect(instance.semantic.dispatch(incrementV1)).resolves.toMatchObject({
        kind: "committed",
      });
      await instance.dispose();
    },
  );

  it("rolls back a zero RNG debug anchor when its existing fault normalizer throws", async () => {
    const fixture = bootstrapCharacterizationFixtureV1();
    const records = createMemoryHostRecordStoreV1();
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const instance = await createCoreGameApplicationInstanceV1(
      fixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(records, [97]) }),
        counter.instrumentation,
      ),
    );
    const context = fixture.extensionContext();
    if (context === undefined) throw new TypeError("bootstrap extension context missing");
    const snapshotBefore = context.session.getCurrentSnapshot();
    const digestBefore = instance.admin.stateDigest();
    const logBefore = context.commandLog.entries();
    const replayBaseBefore = context.commandLog.replayBase();
    const savesBefore = await rawSaveEvidenceV1(records);
    const prepareReplacement = vi.fn();
    const normalizerFailure = new Error("synthetic anchor normalizer failure");
    const normalize = vi.fn((): never => {
      throw normalizerFailure;
    });
    counter.reset();

    await expect(
      context.debugControl.anchorReplacement(
        Object.freeze({ kind: "debug_bundle" as const }),
        async () =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: readFixedRngZeroSnapshotV1(),
            result: Object.freeze({ kind: "anchored" as const }),
          }),
        () => true,
        normalize,
        prepareReplacement,
      ),
    ).rejects.toBe(normalizerFailure);
    expect(normalize).toHaveBeenCalledTimes(1);
    expect(prepareReplacement).not.toHaveBeenCalled();
    expect(counter.snapshot()).toMatchObject({
      snapshotDigestTraversals: 0,
      snapshotFreezeTraversals: 0,
      totalPhysicalCanonicalTraversals: 0,
    });
    expect(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
    expect(instance.admin.stateDigest()).toBe(digestBefore);
    expect(context.commandLog.entries()).toBe(logBefore);
    expect(context.commandLog.replayBase()).toBe(replayBaseBefore);
    expect(context.session.getStatus()).toBe("fault_paused");
    expect(await rawSaveEvidenceV1(records)).toEqual(savesBefore);
    await instance.dispose();
  });

  it.each(["runtime", "debug"] as const)(
    "preserves HMR invalidation precedence over zero RNG %s anchor admission",
    async (surface) => {
      const fixture = bootstrapCharacterizationFixtureV1();
      const instance = await createCoreGameApplicationInstanceV1(
        fixture.application,
        Object.freeze({ host: hostServicesV1(createMemoryHostRecordStoreV1(), [97]) }),
      );
      const context = fixture.extensionContext();
      if (context === undefined) throw new TypeError("bootstrap extension context missing");
      const snapshotBefore = context.session.getCurrentSnapshot();
      const digestBefore = instance.admin.stateDigest();
      const logBefore = context.commandLog.entries();
      const replayBaseBefore = context.commandLog.replayBase();
      type HmrAnchorResultV1 =
        | { readonly kind: "anchored" }
        | { readonly kind: "normalized" }
        | { readonly kind: "hmr" };
      const normalize = vi.fn(
        (): HmrAnchorResultV1 => Object.freeze({ kind: "normalized" as const }),
      );
      const zeroRng = readFixedRngZeroSnapshotV1().rng;
      let staleRngReads = 0;
      const staleSnapshot = { ...snapshotBefore };
      Object.defineProperty(staleSnapshot, "rng", {
        enumerable: true,
        get() {
          staleRngReads += 1;
          return zeroRng;
        },
      });
      Object.freeze(staleSnapshot);
      const operation = async () => {
        context.invalidationController.invalidateForHmr();
        return Object.freeze({
          kind: "replace" as const,
          snapshot: staleSnapshot as SyntheticSnapshotV1,
          result: Object.freeze({ kind: "anchored" as const }),
          anchor: "replace_replay_base" as const,
        });
      };

      const result = surface === "runtime"
        ? await context.runtimeControl.enqueueAuthoritative<HmrAnchorResultV1>(
          operation,
          normalize,
          undefined,
          () => Object.freeze({ kind: "hmr" as const }),
        )
        : await context.debugControl.anchorReplacement<HmrAnchorResultV1>(
          Object.freeze({ kind: "debug_bundle" as const }),
          operation,
          () => true,
          normalize,
        );

      expect(result).toEqual(
        surface === "runtime" ? { kind: "hmr" } : { kind: "not_executed", code: "hmr_invalidated" },
      );
      expect(normalize).not.toHaveBeenCalled();
      expect(staleRngReads).toBe(0);
      expect(context.session.getCurrentSnapshot()).toBe(snapshotBefore);
      expect(instance.admin.stateDigest()).toBe(digestBefore);
      expect(context.commandLog.entries()).toBe(logBefore);
      expect(context.commandLog.replayBase()).toBe(replayBaseBefore);
      expect(context.session.getStatus()).toBe("hmr_invalidated");
      await instance.dispose();
    },
  );

  it("matches independent pre-DET2d bytes for the same canonical workload on all surfaces", async () => {
    const constructionFixture = bootstrapCharacterizationFixtureV1();
    const constructionRecords = createMemoryHostRecordStoreV1();
    const construction = await createCoreGameApplicationInstanceV1(
      constructionFixture.application,
      Object.freeze({ host: hostServicesV1(constructionRecords, [97]) }),
    );
    const constructionContext = constructionFixture.extensionContext();
    if (constructionContext === undefined) throw new TypeError("construction context missing");
    expect(exactBytesEvidenceV1(canonicalJsonBytes(
      constructionContext.session.getCurrentSnapshot(),
    ))).toEqual(preDet2dCanonicalBootstrapGoldenV1.construction.snapshot);
    expect(construction.admin.stateDigest()).toBe(
      preDet2dCanonicalBootstrapGoldenV1.construction.stateDigest,
    );
    expect(exactBytesEvidenceV1(canonicalJsonBytes(
      constructionContext.commandLog.replayBase(),
    ))).toEqual(preDet2dCanonicalBootstrapGoldenV1.construction.snapshot);
    await expect(construction.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    expect(await rawSaveEvidenceV1(constructionRecords)).toEqual(
      preDet2dCanonicalBootstrapGoldenV1.construction.quickSave,
    );
    await construction.dispose();

    const restartFixture = bootstrapCharacterizationFixtureV1();
    const restartRecords = createMemoryHostRecordStoreV1();
    const restarting = await createCoreGameApplicationInstanceV1(
      restartFixture.application,
      Object.freeze({ host: hostServicesV1(restartRecords, [97, 103]) }),
    );
    await expect(restarting.lifecycle.restart()).resolves.toMatchObject({ kind: "anchored" });
    const restartContext = restartFixture.extensionContext();
    if (restartContext === undefined) throw new TypeError("restart context missing");
    expect(exactBytesEvidenceV1(canonicalJsonBytes(
      restartContext.session.getCurrentSnapshot(),
    ))).toEqual(preDet2dCanonicalBootstrapGoldenV1.subsequent.snapshot);
    expect(restarting.admin.stateDigest()).toBe(
      preDet2dCanonicalBootstrapGoldenV1.subsequent.stateDigest,
    );
    expect(exactBytesEvidenceV1(canonicalJsonBytes(
      restartContext.commandLog.replayBase(),
    ))).toEqual(preDet2dCanonicalBootstrapGoldenV1.subsequent.snapshot);
    await expect(restarting.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    expect(await rawSaveEvidenceV1(restartRecords)).toEqual(
      preDet2dCanonicalBootstrapGoldenV1.subsequent.quickSave,
    );
    await restarting.dispose();

    const extensionFixture = bootstrapCharacterizationFixtureV1();
    const extensionRecords = createMemoryHostRecordStoreV1();
    const extending = await createCoreGameApplicationInstanceV1(
      extensionFixture.application,
      Object.freeze({ host: hostServicesV1(extensionRecords, [97, 103]) }),
    );
    const extensionContext = extensionFixture.extensionContext();
    if (extensionContext === undefined) throw new TypeError("extension context missing");
    const live = extensionContext.session.getCurrentSnapshot();
    const candidate = extensionContext.createInitialSnapshot();
    expect(exactBytesEvidenceV1(canonicalJsonBytes(candidate))).toEqual(
      preDet2dCanonicalBootstrapGoldenV1.subsequent.snapshot,
    );
    expect(digestCanonical("sillymaker:state:v1", candidate)).toBe(
      preDet2dCanonicalBootstrapGoldenV1.subsequent.stateDigest,
    );
    expect(exactBytesEvidenceV1(canonicalJsonBytes(live))).toEqual(
      preDet2dCanonicalBootstrapGoldenV1.construction.snapshot,
    );
    expect(extensionContext.session.getCurrentSnapshot()).toBe(live);
    expect(extensionContext.commandLog.replayBase()).toBe(live);
    expect(await rawSaveEvidenceV1(extensionRecords)).toEqual([]);
    await extending.dispose();
  });

  it("characterizes adapter throws before bootstrap admission on all three call surfaces", async () => {
    const constructionFixture = bootstrapCharacterizationFixtureV1();
    const constructionRecords = createMemoryHostRecordStoreV1();
    const constructionCounter = createPurposeTaggedSnapshotWorkCounterV1();
    const constructionEvents: CoreApplicationConstructionEventInternalV1[] = [];
    const constructionOptions = instrumentCoreApplicationConstructionOptionsInternalV1(
      Object.freeze({ host: hostServicesV1(constructionRecords, [97, 103]) }),
      Object.freeze({
        record(event: CoreApplicationConstructionEventInternalV1) {
          constructionEvents.push(event);
        },
      }),
    );
    constructionFixture.failNextBootstrap();
    await expect(
      createCoreGameApplicationInstanceV1(
        constructionFixture.application,
        instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
          constructionOptions,
          constructionCounter.instrumentation,
        ),
      ),
    ).rejects.toBe(constructionFixture.adapterFailure);
    expect(bootstrapWorkTupleV1(
      constructionCounter,
      constructionFixture.createInitialStateCalls(),
    )).toEqual([0, 0, 0, 0, 0]);
    expect(constructionEvents).toEqual([]);
    expect(constructionFixture.extensionContext()).toBeUndefined();
    expect(await constructionRecords.list("lease")).toEqual([]);
    expect(await rawSaveEvidenceV1(constructionRecords)).toEqual([]);
    const successor = await createCoreGameApplicationInstanceV1(
      constructionFixture.application,
      Object.freeze({ host: hostServicesV1(constructionRecords, [103]) }),
    );
    await successor.dispose();

    const restartFixture = bootstrapCharacterizationFixtureV1();
    const restartRecords = createMemoryHostRecordStoreV1();
    const restartCounter = createPurposeTaggedSnapshotWorkCounterV1();
    const restarting = await createCoreGameApplicationInstanceV1(
      restartFixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(restartRecords, [97, 103]) }),
        restartCounter.instrumentation,
      ),
    );
    const restartContext = restartFixture.extensionContext();
    if (restartContext === undefined) throw new TypeError("restart context missing");
    await expect(restarting.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    const restartSnapshot = restartContext.session.getCurrentSnapshot();
    const restartDigest = restarting.admin.stateDigest();
    const restartReplayBase = restartContext.commandLog.replayBase();
    const restartLog = restartContext.commandLog.entries();
    const restartSaves = await rawSaveEvidenceV1(restartRecords);
    expect(restartSaves).toHaveLength(1);
    const callsBeforeRestart = restartFixture.createInitialStateCalls();
    restartCounter.reset();
    restartFixture.failNextBootstrap();
    await expect(restarting.lifecycle.restart()).resolves.toEqual({
      kind: "faulted",
      code: "runtime.anchor_failed",
    });
    expect(bootstrapWorkTupleV1(
      restartCounter,
      restartFixture.createInitialStateCalls() - callsBeforeRestart,
    )).toEqual([0, 0, 0, 0, 0]);
    expect(restartContext.session.getStatus()).toBe("fault_paused");
    expect(restartContext.session.getCurrentSnapshot()).toBe(restartSnapshot);
    expect(restarting.admin.stateDigest()).toBe(restartDigest);
    expect(restartContext.commandLog.entries()).toEqual(restartLog);
    expect(restartContext.commandLog.replayBase()).toBe(restartReplayBase);
    expect(await rawSaveEvidenceV1(restartRecords)).toEqual(restartSaves);
    await restarting.dispose();

    const extensionFixture = bootstrapCharacterizationFixtureV1();
    const extensionRecords = createMemoryHostRecordStoreV1();
    const extensionCounter = createPurposeTaggedSnapshotWorkCounterV1();
    const extending = await createCoreGameApplicationInstanceV1(
      extensionFixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(extensionRecords, [97, 103]) }),
        extensionCounter.instrumentation,
      ),
    );
    const extensionContext = extensionFixture.extensionContext();
    if (extensionContext === undefined) throw new TypeError("extension context missing");
    await expect(extending.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    const extensionSnapshot = extensionContext.session.getCurrentSnapshot();
    const extensionDigest = extending.admin.stateDigest();
    const extensionReplayBase = extensionContext.commandLog.replayBase();
    const extensionLog = extensionContext.commandLog.entries();
    const extensionSaves = await rawSaveEvidenceV1(extensionRecords);
    expect(extensionSaves).toHaveLength(1);
    const callsBeforeExtension = extensionFixture.createInitialStateCalls();
    extensionCounter.reset();
    extensionFixture.failNextBootstrap();
    expect(observeSynchronousFailureV1(
      () => extensionContext.createInitialSnapshot(),
    )).toBe(extensionFixture.adapterFailure);
    expect(bootstrapWorkTupleV1(
      extensionCounter,
      extensionFixture.createInitialStateCalls() - callsBeforeExtension,
    )).toEqual([0, 0, 0, 0, 0]);
    expect(extensionContext.session.getStatus()).toBe("ready");
    expect(extensionContext.session.getCurrentSnapshot()).toBe(extensionSnapshot);
    expect(extending.admin.stateDigest()).toBe(extensionDigest);
    expect(extensionContext.commandLog.entries()).toEqual(extensionLog);
    expect(extensionContext.commandLog.replayBase()).toBe(extensionReplayBase);
    expect(await rawSaveEvidenceV1(extensionRecords)).toEqual(extensionSaves);
    await extending.dispose();
  });

  it("hands the configured Save projector to the Base invocation boundary exactly once", async () => {
    const projectedStates: unknown[] = [];
    const observed: {
      readonly phase: string;
      readonly state?: unknown;
      readonly value?: unknown;
    }[] = [];
    const definition = defineCoreGameApplicationV1({
      ...definitionV1,
      summarizeSave(state) {
        projectedStates.push(state);
        return Object.freeze(["Synthetic count"]);
      },
    });
    const resolved = resolveCoreGameApplicationV1(definition, {
      buildIdentityInput: deterministicBuildIdentityInputV1,
    });
    if (resolved.kind !== "resolved") throw new TypeError("Save projection fixture must resolve");
    const instance = await createCoreGameApplicationInstanceV1(
      resolved.application,
      instrumentCoreApplicationSaveProjectionOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(createMemoryHostRecordStoreV1()) }),
        Object.freeze({
          record(event: {
            readonly phase: string;
            readonly state?: unknown;
            readonly value?: unknown;
          }) {
            observed.push(event);
          },
        }),
      ),
    );
    const state = instance.admin.inspectForTest().snapshot.state;

    await expect(instance.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    expect(projectedStates).toEqual([state]);
    expect(observed).toEqual([
      expect.objectContaining({ phase: "before", state }),
      expect.objectContaining({ phase: "returned", state, value: ["Synthetic count"] }),
    ]);
    await instance.dispose();
  });

  it("calibrates the package-internal construction probe on a valid policy", async () => {
    const probe = constructionProbeV1({ mode: "every_commit" });
    const instance = await createCoreGameApplicationInstanceV1(
      resolvedApplicationV1(),
      probe.options,
    );

    expect(probe.snapshot()).toEqual({
      sessionFactories: 1,
      persistenceFactories: 1,
      schedulerReads: 1,
      timerSchedules: 0,
      hostCommits: 1,
      leaseOwnerAcquisitions: 1,
      persistenceWrites: 0,
    });
    await instance.dispose();
  });

  it.each(invalidAutosavePoliciesV1)(
    "rejects an invalid autosave policy: %s",
    async (_, policy) => {
      const probe = constructionProbeV1(policy);
      const result = await createCoreGameApplicationInstanceV1(
        resolvedApplicationV1(),
        probe.options,
      ).then(
        (instance) => Object.freeze({ kind: "resolved" as const, instance }),
        (error: unknown) => Object.freeze({ kind: "rejected" as const, error }),
      );
      const countsBeforeCleanup = probe.snapshot();

      if (result.kind === "resolved") {
        await result.instance.dispose();
      }
      expect(result).toMatchObject({ kind: "rejected", error: expect.any(TypeError) });
      expect(countsBeforeCleanup).toEqual({
        sessionFactories: 0,
        persistenceFactories: 0,
        schedulerReads: 0,
        timerSchedules: 0,
        hostCommits: 0,
        leaseOwnerAcquisitions: 0,
        persistenceWrites: 0,
      });
    },
  );

  it.each(validAutosavePolicyBoundariesV1)(
    "accepts autosave policy boundary: %s",
    async (_, policy, expectedDelays, expectedAutoWrites) => {
      const records = countingRecordsV1();
      const scheduler = manualSchedulerV1();
      const instance = await createInstanceV1({
        records: records.counting,
        autosave: policy,
        scheduler: scheduler.scheduler,
      });

      await instance.semantic.dispatch(incrementV1);
      await instance.autoSaveIdle();
      expect(scheduler.scheduled.map(({ delayMs }) => delayMs)).toEqual(expectedDelays);
      expect(records.autoWrites()).toHaveLength(expectedAutoWrites);
      await instance.dispose();
    },
  );

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
    if (resolved.kind !== "resolved") {
      throw new Error("synthetic story must resolve");
    }
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
    await expect(instance.persistence.load("manual.1")).resolves.toMatchObject({
      kind: "loaded",
    });
    expect(instance.admin.stateDigest()).toBe(digest);
    await instance.dispose();
  });

  it("normalizes finalized Core evidence item-by-item before result, log, and replay use", async () => {
    const fixture = evidenceNormalizationFixtureV1();
    const instance = await createCoreGameApplicationInstanceV1(fixture.application, {
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
      capabilities: { debugTools: true },
    });

    try {
      await expect(instance.semantic.dispatch(incrementV1)).resolves.toEqual({
        kind: "committed",
        count: 1,
      });
      expect(fixture.factSchemaInputs).toHaveLength(2);
      expect(fixture.factSchemaInputs[0]).toBe(fixture.rawFacts[0]);
      expect(fixture.factSchemaInputs[1]).toBe(fixture.rawFacts[1]);
      expect(fixture.earlierFactFrozenDuringNormalization).toEqual([false]);
      const committedFacts = fixture.projectedFacts();
      expect(committedFacts?.[0]).not.toBe(fixture.normalizedFacts[0]);
      expect(committedFacts?.[1]).not.toBe(fixture.normalizedFacts[1]);
      expect(committedFacts?.[0]).toEqual(fixture.normalizedFacts[0]);
      expect(committedFacts?.[1]).toEqual(fixture.normalizedFacts[1]);
      expect(Object.isFrozen(committedFacts)).toBe(true);
      expect(fixture.normalizedFacts.every(Object.isFrozen)).toBe(false);
      const committedEntry = instance.admin.commandLog()[0] as {
        readonly outcome: {
          readonly kind: "committed";
          readonly facts: readonly EvidenceFactV1[];
        };
      };
      expect(committedEntry.outcome.facts[0]).toBe(committedFacts?.[0]);
      expect(committedEntry.outcome.facts[1]).toBe(committedFacts?.[1]);

      await expect(instance.semantic.dispatch(rejectV1)).resolves.toEqual({ kind: "rejected" });
      expect(fixture.rejectionSchemaInputs).toHaveLength(2);
      expect(fixture.rejectionSchemaInputs[0]).toBe(fixture.rawRejections[0]);
      expect(fixture.rejectionSchemaInputs[1]).toBe(fixture.rawRejections[1]);
      expect(fixture.earlierRejectionFrozenDuringNormalization).toEqual([false]);
      const rejectedReasons = fixture.projectedRejections();
      expect(rejectedReasons?.[0]).not.toBe(fixture.normalizedRejections[0]);
      expect(rejectedReasons?.[1]).not.toBe(fixture.normalizedRejections[1]);
      expect(rejectedReasons?.[0]).toEqual(fixture.normalizedRejections[0]);
      expect(rejectedReasons?.[1]).toEqual(fixture.normalizedRejections[1]);
      expect(Object.isFrozen(rejectedReasons)).toBe(true);
      expect(fixture.normalizedRejections.every(Object.isFrozen)).toBe(false);
      const rejectedEntry = instance.admin.commandLog()[1] as {
        readonly outcome: {
          readonly kind: "rejected";
          readonly reasons: readonly EvidenceRejectionV1[];
        };
      };
      expect(rejectedEntry.outcome.reasons[0]).toBe(rejectedReasons?.[0]);
      expect(rejectedEntry.outcome.reasons[1]).toBe(rejectedReasons?.[1]);

      const debugControl = instance.admin.debugControl;
      if (debugControl === undefined) throw new TypeError("debug control must be enabled");
      const logBeforeDebugValidation = instance.admin.commandLog();
      const validation = await debugControl.execute(
        Object.freeze({ kind: "debug.evidence-normalization" }) as never,
        () => true,
      );
      expect(validation).toMatchObject({
        kind: "validation_failed",
        errors: [{ code: "synthetic.debug_command_unsupported" }],
      });
      if (validation.kind !== "validation_failed") {
        throw new TypeError("evidence-normalization debug command must fail validation");
      }
      expect(fixture.debugValidationSchemaInputs).toHaveLength(1);
      expect(fixture.debugValidationSchemaInputs[0]).toBe(fixture.rawDebugValidationErrors[0]);
      expect(validation.errors[0]).not.toBe(fixture.normalizedDebugValidationErrors[0]);
      expect(validation.errors[0]).toEqual(fixture.normalizedDebugValidationErrors[0]);
      expect(Object.isFrozen(validation.errors)).toBe(true);
      expect(Object.isFrozen(validation.errors[0])).toBe(true);
      expect(Object.isFrozen(fixture.normalizedDebugValidationErrors[0])).toBe(false);
      expect(instance.admin.commandLog()).toBe(logBeforeDebugValidation);

      const commandLogBytesBeforeReplay = canonicalJsonBytes(instance.admin.commandLog());
      await expect(instance.admin.replayAuthoritatively()).resolves.toMatchObject({
        authoritative: true,
        identityMatch: true,
        matches: true,
        executedEntries: 2,
        mismatches: [],
      });
      expect(fixture.factSchemaInputs).toHaveLength(4);
      expect(fixture.rejectionSchemaInputs).toHaveLength(4);
      expect(canonicalJsonBytes(instance.admin.commandLog())).toEqual(commandLogBytesBeforeReplay);
      expect((instance.admin.commandLog()[0] as typeof committedEntry).outcome.facts[0]).toBe(
        committedFacts?.[0],
      );
      expect((instance.admin.commandLog()[1] as typeof rejectedEntry).outcome.reasons[0]).toBe(
        rejectedReasons?.[0],
      );
    } finally {
      await instance.dispose();
    }
  });

  it("keeps Core candidate RNG admission ahead of malformed fact finalization", async () => {
    const fixture = evidenceNormalizationFixtureV1({ zeroRngWithMalformedFact: true });
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const instance = await createCoreGameApplicationInstanceV1(
      fixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(createMemoryHostRecordStoreV1()) }),
        counter.instrumentation,
      ),
    );
    const snapshotBefore = instance.admin.inspectForTest().snapshot;
    const stateDigestBefore = instance.admin.stateDigest();
    const commandLogBefore = instance.admin.commandLog();
    const statusBefore = instance.semantic.observe().status;
    counter.reset();

    try {
      await expect(instance.semantic.dispatch(incrementV1)).rejects.toMatchObject({
        code: "rng.invalid_state",
      });
      expect(fixture.rawFacts).toHaveLength(2);
      expect(fixture.factSchemaInputs).toEqual([]);
      expect(fixture.normalizedFacts).toEqual([]);
      expect(fixture.projectedFacts()).toBeUndefined();
      expect(counter.snapshot()).toEqual({
        snapshotDigestTraversals: 0,
        snapshotFreezeTraversals: 0,
        bootstrapAdmissionCanonicalTraversals: 0,
        bootstrapHandoffFreezeTraversals: 0,
        commandAdmissionCanonicalTraversals: 1,
        commandHandoffFreezeTraversals: 1,
        commandLogMetadataAdmissionCanonicalTraversals: 0,
        commandLogMetadataFreezeTraversals: 0,
        evidenceAdmissionCanonicalTraversals: 0,
        replayComparisonTraversals: 0,
        totalPhysicalCanonicalTraversals: 1,
      });
      expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
      expect(instance.admin.stateDigest()).toBe(stateDigestBefore);
      expect(instance.admin.commandLog()).toBe(commandLogBefore);
      expect(instance.semantic.observe().status).toBe(statusBefore);
    } finally {
      await instance.dispose();
    }
  });

  it("lets the post-executor HMR fence win before candidate RNG or evidence admission", async () => {
    let instance:
      | Awaited<ReturnType<typeof createCoreGameApplicationInstanceV1>>
      | undefined;
    const fixture = evidenceNormalizationFixtureV1({
      zeroRngWithMalformedFact: true,
      beforeGameAttemptReturns: () => instance?.invalidateForHmr(),
    });
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    instance = await createCoreGameApplicationInstanceV1(
      fixture.application,
      instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
        Object.freeze({ host: hostServicesV1(createMemoryHostRecordStoreV1()) }),
        counter.instrumentation,
      ),
    );
    const snapshotBefore = instance.admin.inspectForTest().snapshot;
    const stateDigestBefore = instance.admin.stateDigest();
    const commandLogBefore = instance.admin.commandLog();
    counter.reset();

    try {
      await expect(instance.semantic.dispatch(incrementV1)).resolves.toEqual({
        kind: "not_executed",
        code: "hmr_invalidated",
      });
      expect(fixture.factSchemaInputs).toEqual([]);
      expect(counter.snapshot()).toEqual({
        snapshotDigestTraversals: 0,
        snapshotFreezeTraversals: 0,
        bootstrapAdmissionCanonicalTraversals: 0,
        bootstrapHandoffFreezeTraversals: 0,
        commandAdmissionCanonicalTraversals: 1,
        commandHandoffFreezeTraversals: 1,
        commandLogMetadataAdmissionCanonicalTraversals: 0,
        commandLogMetadataFreezeTraversals: 0,
        evidenceAdmissionCanonicalTraversals: 0,
        replayComparisonTraversals: 0,
        totalPhysicalCanonicalTraversals: 1,
      });
      expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
      expect(instance.admin.stateDigest()).toBe(stateDigestBefore);
      expect(instance.admin.commandLog()).toBe(commandLogBefore);
      expect(instance.semantic.observe().status).toBe("hmr_invalidated");
    } finally {
      await instance.dispose();
    }
  });

  it.each(["fact", "rejection", "debug_validation"] as const)(
    "drops a finalized %s candidate when its Story schema invalidates the Core instance",
    async (target) => {
      let instance:
        | Awaited<ReturnType<typeof createCoreGameApplicationInstanceV1>>
        | undefined;
      const fixture = evidenceNormalizationFixtureV1({
        beforeEvidenceSchemaReturns: (kind) => {
          if (kind === target) instance?.invalidateForHmr();
        },
      });
      instance = await createCoreGameApplicationInstanceV1(fixture.application, {
        host: hostServicesV1(createMemoryHostRecordStoreV1()),
        capabilities: { debugTools: true },
      });
      const snapshotBefore = instance.admin.inspectForTest().snapshot;
      const stateDigestBefore = instance.admin.stateDigest();
      const commandLogBefore = instance.admin.commandLog();

      try {
        const result = target === "fact"
          ? await instance.semantic.dispatch(incrementV1)
          : target === "rejection"
          ? await instance.semantic.dispatch(rejectV1)
          : await instance.admin.debugControl?.execute(
            Object.freeze({ kind: "debug.evidence-normalization" }) as never,
            () => true,
          );
        expect(result).toEqual({ kind: "not_executed", code: "hmr_invalidated" });
        expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
        expect(instance.admin.stateDigest()).toBe(stateDigestBefore);
        expect(instance.admin.commandLog()).toBe(commandLogBefore);
        expect(instance.semantic.observe().status).toBe("hmr_invalidated");
      } finally {
        await instance.dispose();
      }
    },
  );

  it.each(["game", "debug"] as const)(
    "rejects a zero RNG candidate from the Core %s executor before Session finalization",
    async (source) => {
      const fixture = debugDefinitionFixtureV1();
      const resolved = resolveCoreGameApplicationV1(fixture.definition, {
        buildIdentityInput: deterministicBuildIdentityInputV1,
      });
      if (resolved.kind !== "resolved") throw new TypeError("debug synthetic story must resolve");
      const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
        host: hostServicesV1(createMemoryHostRecordStoreV1()),
        capabilities: { debugTools: true },
      });
      const snapshotBefore = instance.admin.inspectForTest().snapshot;
      const digestBefore = instance.admin.stateDigest();
      const logBefore = instance.admin.commandLog();
      const statusBefore = instance.semantic.observe().status;
      fixture.injectZeroRngCandidate(true);

      try {
        if (source === "game") {
          await expect(instance.semantic.dispatch(incrementV1)).rejects.toMatchObject({
            code: "rng.invalid_state",
          });
        } else {
          const debugControl = instance.admin.debugControl;
          if (debugControl === undefined) throw new TypeError("debug control must be enabled");
          await expect(
            debugControl.execute(
              Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
              () => true,
            ),
          ).rejects.toMatchObject({ code: "rng.invalid_state" });
        }
        expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
        expect(instance.admin.stateDigest()).toBe(digestBefore);
        expect(instance.admin.commandLog()).toBe(logBefore);
        expect(instance.semantic.observe().status).toBe(statusBefore);

        fixture.injectZeroRngCandidate(false);
        if (source === "game") {
          await expect(instance.semantic.dispatch(incrementV1)).resolves.toMatchObject({
            kind: "committed",
          });
        } else {
          const debugControl = instance.admin.debugControl;
          if (debugControl === undefined) throw new TypeError("debug control must be enabled");
          await expect(
            debugControl.execute(
              Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
              () => true,
            ),
          ).resolves.toMatchObject({
            kind: "executed",
            attempt: { result: { kind: "committed" } },
          });
        }
      } finally {
        fixture.injectZeroRngCandidate(false);
        await instance.dispose();
      }
    },
  );

  it.each(["game", "debug"] as const)(
    "rejects a zero RNG candidate returned by the Core %s fault normalizer",
    async (source) => {
      const fixture = debugDefinitionFixtureV1();
      const resolved = resolveCoreGameApplicationV1(fixture.definition, {
        buildIdentityInput: deterministicBuildIdentityInputV1,
      });
      if (resolved.kind !== "resolved") throw new TypeError("debug synthetic story must resolve");
      const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
        host: hostServicesV1(createMemoryHostRecordStoreV1()),
        capabilities: { debugTools: true },
      });
      const snapshotBefore = instance.admin.inspectForTest().snapshot;
      const digestBefore = instance.admin.stateDigest();
      const logBefore = instance.admin.commandLog();
      const statusBefore = instance.semantic.observe().status;
      fixture.injectZeroRngCandidate(true);
      fixture.normalizeFaultAsZeroRngCommit(true);

      try {
        if (source === "game") {
          await expect(instance.semantic.dispatch(incrementV1)).rejects.toMatchObject({
            code: "rng.invalid_state",
          });
        } else {
          const debugControl = instance.admin.debugControl;
          if (debugControl === undefined) throw new TypeError("debug control must be enabled");
          await expect(
            debugControl.execute(
              Object.freeze({ kind: "debug.synthetic.add", amount: 1 }),
              () => true,
            ),
          ).rejects.toMatchObject({ code: "rng.invalid_state" });
        }
        expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
        expect(instance.admin.stateDigest()).toBe(digestBefore);
        expect(instance.admin.commandLog()).toBe(logBefore);
        expect(instance.semantic.observe().status).toBe(statusBefore);
      } finally {
        fixture.normalizeFaultAsZeroRngCommit(false);
        fixture.injectZeroRngCandidate(false);
        await instance.dispose();
      }
    },
  );

  it("rejects a zero RNG replay attempt without mutating the live Core Session", async () => {
    const fixture = debugDefinitionFixtureV1();
    const resolved = resolveCoreGameApplicationV1(fixture.definition, {
      buildIdentityInput: deterministicBuildIdentityInputV1,
    });
    if (resolved.kind !== "resolved") throw new TypeError("debug synthetic story must resolve");
    const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
      capabilities: { debugTools: true },
    });
    await instance.semantic.dispatch(incrementV1);
    const snapshotBefore = instance.admin.inspectForTest().snapshot;
    const digestBefore = instance.admin.stateDigest();
    const commandLogBytesBefore = canonicalJsonBytes(instance.admin.commandLog());
    const statusBefore = instance.semantic.observe().status;
    fixture.injectZeroRngCandidate(true);

    try {
      await expect(instance.admin.replayAuthoritatively()).rejects.toMatchObject({
        code: "rng.invalid_state",
      });
      expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
      expect(instance.admin.stateDigest()).toBe(digestBefore);
      expect(canonicalJsonBytes(instance.admin.commandLog())).toEqual(commandLogBytesBefore);
      expect(instance.semantic.observe().status).toBe(statusBefore);

      fixture.injectZeroRngCandidate(false);
      await expect(instance.admin.replayAuthoritatively()).resolves.toMatchObject({
        authoritative: true,
        matches: true,
        executedEntries: 1,
      });
    } finally {
      fixture.injectZeroRngCandidate(false);
      await instance.dispose();
    }
  });

  it("requires the same faulted normalizer fallback during replay and live dispatch", async () => {
    const fixture = debugDefinitionFixtureV1();
    const resolved = resolveCoreGameApplicationV1(fixture.definition, {
      buildIdentityInput: deterministicBuildIdentityInputV1,
    });
    if (resolved.kind !== "resolved") throw new TypeError("debug synthetic story must resolve");
    const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
      capabilities: { debugTools: true },
    });
    await instance.semantic.dispatch(incrementV1);
    const snapshotBefore = instance.admin.inspectForTest().snapshot;
    const digestBefore = instance.admin.stateDigest();
    const commandLogBefore = instance.admin.commandLog();
    const commandLogBytesBefore = canonicalJsonBytes(commandLogBefore);
    const statusBefore = instance.semantic.observe().status;
    fixture.throwGameExecutor(true);
    fixture.normalizeFaultAsValidCommit(true);

    try {
      await expect(instance.admin.replayAuthoritatively()).rejects.toThrow(
        "Replay fault normalizer must return a faulted attempt",
      );
      await expect(instance.semantic.dispatch(incrementV1)).rejects.toThrow(
        "Dispatch fault normalizer must return a faulted attempt",
      );
      expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
      expect(instance.admin.stateDigest()).toBe(digestBefore);
      expect(instance.admin.commandLog()).toBe(commandLogBefore);
      expect(canonicalJsonBytes(instance.admin.commandLog())).toEqual(commandLogBytesBefore);
      expect(instance.semantic.observe().status).toBe(statusBefore);
    } finally {
      fixture.normalizeFaultAsValidCommit(false);
      fixture.throwGameExecutor(false);
      await instance.dispose();
    }
  });

  it("replays the Core command log authoritatively through isolated attempts", async () => {
    const instance = await createInstanceV1();
    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(
      Object.freeze({
        kind: "invoke" as const,
        actionId: "synthetic.reject" as const,
      }),
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
    if (debugControl === undefined) {
      throw new TypeError("debug control must be enabled");
    }

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
        if (debugControl === undefined) {
          throw new TypeError("debug control must be enabled");
        }
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
      if (decoded.kind !== "decoded") {
        throw new TypeError("expected decoded Debug Bundle");
      }
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
      if (firstEntry === undefined) {
        throw new TypeError("expected second committed entry");
      }
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
      if (retryEntry === undefined) {
        throw new TypeError("expected retried committed entry");
      }
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
      createCoreGameApplicationInstanceV1(resolvedApplicationV1(), {
        host: throwingHost,
      }),
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
    expect(instance.presentationAnchor()).toEqual({
      epoch: 0,
      origin: "bootstrap",
    });

    const anchors: unknown[] = [];
    const unsubscribe = instance.subscribePresentationAnchor((anchor) => anchors.push(anchor));

    await instance.semantic.dispatch(incrementV1);
    expect(instance.presentationAnchor().epoch).toBe(0);

    const staleGuard = instance.bindToCurrentEpoch((value: number) => value * 2);
    expect(staleGuard(21)).toEqual({ kind: "current", value: 42 });

    await instance.persistence.save("manual.1");
    await instance.semantic.dispatch(incrementV1);
    await expect(instance.persistence.load("manual.1")).resolves.toMatchObject({
      kind: "loaded",
    });
    expect(instance.presentationAnchor()).toEqual({ epoch: 1, origin: "load" });
    const loadedDigest = instance.admin.stateDigest();
    expect(instance.admin.commandLog()).toEqual([]);
    await instance.semantic.dispatch(incrementV1);
    expect(instance.admin.commandLog()[0]?.preStateDigest).toBe(loadedDigest);
    expect(staleGuard(21)).toEqual({ kind: "stale_epoch" });
    expect(anchors).toEqual([{ epoch: 1, origin: "load" }]);

    // A failed load leaves state and epoch untouched.
    await expect(instance.persistence.load("quick")).resolves.toMatchObject({
      kind: "rejected",
    });
    expect(instance.presentationAnchor().epoch).toBe(1);

    const exported = await instance.persistence.exportCurrentSave();
    const bytes = (exported as { readonly bytes: Uint8Array }).bytes;
    await expect(instance.persistence.importSave(bytes)).resolves.toMatchObject({
      kind: "imported",
    });
    expect(instance.presentationAnchor()).toEqual({
      epoch: 2,
      origin: "import",
    });
    const importedDigest = instance.admin.stateDigest();
    expect(instance.admin.commandLog()).toEqual([]);
    await instance.semantic.dispatch(incrementV1);
    expect(instance.admin.commandLog()[0]?.preStateDigest).toBe(importedDigest);

    await expect(instance.lifecycle.restart()).resolves.toEqual({
      kind: "anchored",
      commandSequence: 0,
    });
    expect(instance.presentationAnchor()).toEqual({
      epoch: 3,
      origin: "restart",
    });
    expect(instance.semantic.observe().game).toEqual({ count: 0 });
    const restartedDigest = instance.admin.stateDigest();
    expect(instance.admin.commandLog()).toEqual([]);
    await instance.semantic.dispatch(incrementV1);
    expect(instance.admin.commandLog()[0]?.preStateDigest).toBe(restartedDigest);

    unsubscribe();
    await instance.dispose();
  });

  it("attributes concurrent queued load and import replacements to their own presentation origins", async () => {
    const instance = await createInstanceV1();
    await expect(instance.persistence.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    await instance.semantic.dispatch(incrementV1);
    const exported = await instance.persistence.exportCurrentSave();
    const bytes = (exported as { readonly bytes: Uint8Array }).bytes;
    const anchors: unknown[] = [];
    const unsubscribe = instance.subscribePresentationAnchor((anchor) => anchors.push(anchor));

    const load = instance.persistence.load("manual.1");
    const imported = instance.persistence.importSave(bytes);
    await expect(Promise.all([load, imported])).resolves.toEqual([
      { kind: "loaded", compatibility: "exact", commandSequence: 0 },
      { kind: "imported", compatibility: "exact", commandSequence: 1 },
    ]);
    expect(anchors).toEqual([
      { epoch: 1, origin: "load" },
      { epoch: 2, origin: "import" },
    ]);
    expect(instance.presentationAnchor()).toEqual({ epoch: 2, origin: "import" });

    const emptyLoad = instance.persistence.load("quick");
    const importAfterRejection = instance.persistence.importSave(bytes);
    await expect(Promise.all([emptyLoad, importAfterRejection])).resolves.toEqual([
      { kind: "rejected", code: "empty_slot" },
      { kind: "imported", compatibility: "exact", commandSequence: 1 },
    ]);
    expect(anchors).toEqual([
      { epoch: 1, origin: "load" },
      { epoch: 2, origin: "import" },
      { epoch: 3, origin: "import" },
    ]);
    expect(instance.presentationAnchor()).toEqual({ epoch: 3, origin: "import" });

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

  it("pins valid debounced scheduling, capture, flush, and Save bytes", async () => {
    const records = countingRecordsV1();
    const scheduler = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: records.counting,
      autosave: { mode: "debounced", delayMs: 0, checkpointEveryCommands: 2 },
      scheduler: scheduler.scheduler,
    });

    await instance.semantic.dispatch(incrementV1);
    expect(scheduler.scheduled).toHaveLength(1);
    expect(records.autoWrites()).toEqual([]);

    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    expect(records.autoWrites()).toHaveLength(1);
    expect(await rawSaveEvidenceV1(records.counting)).toEqual(
      auto0PreAdmissionCheckpointGoldenV1,
    );

    await instance.semantic.dispatch(incrementV1);
    expect(scheduler.scheduled).toHaveLength(2);
    await instance.flushAutoSave();
    await instance.autoSaveIdle();

    expect(scheduler.scheduled).toEqual([
      { callback: expect.any(Function), delayMs: 0, cancelled: true },
      { callback: expect.any(Function), delayMs: 0, cancelled: true },
    ]);
    expect(records.autoWrites()).toHaveLength(2);
    expect(await rawSaveEvidenceV1(records.counting)).toEqual(auto0PreAdmissionSaveGoldenV1);
    await instance.dispose();
  });

  it("clears behind an authoritative barrier without letting an old debounce candidate write back", async () => {
    const storage = blockedSaveClearRecordsV1();
    const { scheduler, scheduled, runLast } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: storage.records,
      autosave: { mode: "debounced", delayMs: 800 },
      scheduler,
    });

    await expect(instance.persistence.save("quick")).resolves.toMatchObject({
      kind: "saved",
    });
    await instance.semantic.dispatch(incrementV1);
    const staleDebounce = scheduled.at(-1);
    if (staleDebounce === undefined) throw new TypeError("expected pending Auto Save");

    storage.blockNextClear();
    const cleanup = clearAllCoreApplicationSavesForMaintenanceInternalV1(instance);
    await storage.waitUntilClearStarts();
    expect(staleDebounce.cancelled).toBe(true);
    staleDebounce.callback();

    let dispatchSettled = false;
    const dispatch = instance.semantic.dispatch(incrementV1).finally(() => {
      dispatchSettled = true;
    });
    await Promise.resolve();
    expect(dispatchSettled).toBe(false);
    expect(instance.admin.inspectForTest().snapshot.commandSequence).toBe(1);

    storage.releaseClear();
    await cleanup;
    await dispatch;
    expect(instance.admin.inspectForTest().snapshot.commandSequence).toBe(2);
    expect((await instance.persistence.listSlots()).every(({ health }) => health === "empty")).toBe(
      true,
    );

    runLast();
    await instance.autoSaveIdle();
    await expect(instance.persistence.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slotId: "auto.current", health: "valid" }),
        expect.objectContaining({ slotId: "quick", health: "empty" }),
      ]),
    );
    await instance.dispose();
    await expect(clearAllCoreApplicationSavesForMaintenanceInternalV1(instance)).rejects.toThrow(
      "core.save_maintenance_unavailable",
    );
  });

  it("flushes the exact current Snapshot even before the first command", async () => {
    const records = countingRecordsV1();
    const { scheduler } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: records.counting,
      autosave: { mode: "debounced", delayMs: 800 },
      scheduler,
    });

    await expect(instance.flushAutoSave()).resolves.toBeUndefined();
    expect(records.autoWrites()).toHaveLength(1);
    const stored = await records.counting.list("save");
    const current = stored.find(({ key }) => key.includes(":auto.current"));
    if (current === undefined) throw new TypeError("expected exact Auto Save");
    expect(JSON.parse(new TextDecoder().decode(current.bytes))).toMatchObject({
      snapshot: {
        commandSequence: 0,
        state: { simulation: { counter: { count: 0 } } },
      },
    });
    await instance.dispose();
  });

  it("does not let a same-sequence quick save mask an exact Auto Save failure", async () => {
    const records = failingAutoSaveRecordsV1();
    const { scheduler, runLast } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records,
      autosave: { mode: "debounced", delayMs: 800 },
      scheduler,
    });

    await instance.semantic.dispatch(incrementV1);
    runLast();
    await instance.autoSaveIdle();
    await expect(instance.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await expect(instance.persistence.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: 1,
      lastFailureCode: null,
    });

    await expect(instance.flushAutoSave()).rejects.toThrow("persistence.autosave_flush_failed");
    await instance.dispose();
  });

  it("fails a durability flush on a physical write fault and retries the same Snapshot", async () => {
    const storage = recoverableFailingSaveRecordsV1();
    const { scheduler } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: storage.records,
      autosave: { mode: "debounced", delayMs: 800 },
      scheduler,
    });

    await instance.semantic.dispatch(incrementV1);
    await expect(instance.flushAutoSave()).rejects.toThrow("persistence.autosave_flush_failed");
    await expect(instance.persistence.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
      lastFailureCode: "persistence.unexpected",
    });

    storage.recover();
    await expect(instance.flushAutoSave()).resolves.toBeUndefined();
    await expect(instance.persistence.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: 1,
      lastFailureCode: null,
    });
    await instance.dispose();
  });

  it("rejects a failed anchor repair, never requeues the old target, and retries current", async () => {
    const storage = blockedThenFailingSaveRecordsV1();
    const { scheduler } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: storage.records,
      autosave: { mode: "debounced", delayMs: 800 },
      scheduler,
      seeds: [77, 78],
    });

    await instance.semantic.dispatch(incrementV1);
    const firstFlush = instance.flushAutoSave();
    await storage.waitUntilFirstSaveStarts();
    await expect(instance.lifecycle.restart()).resolves.toMatchObject({
      kind: "anchored",
    });
    storage.releaseFirstSave();

    await expect(firstFlush).rejects.toThrow("persistence.autosave_flush_failed");
    expect(storage.attemptedAutoCounts).toEqual([1, 0]);

    storage.recover();
    await expect(instance.flushAutoSave()).resolves.toBeUndefined();
    expect(storage.attemptedAutoCounts).toEqual([1, 0, 0]);
    const stored = await storage.records.list("save");
    const current = stored.find(({ key }) => key.includes(":auto.current"));
    if (current === undefined) {
      throw new TypeError("expected repaired Auto Save");
    }
    expect(JSON.parse(new TextDecoder().decode(current.bytes))).toMatchObject({
      snapshot: {
        commandSequence: 0,
        state: { simulation: { counter: { count: 0 } } },
      },
    });
    await instance.dispose();
  });

  it("drops a pending debounced candidate when the replay base is replaced", async () => {
    const records = countingRecordsV1();
    const { scheduler } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: records.counting,
      autosave: { mode: "debounced", delayMs: 800 },
      scheduler,
      seeds: [77, 78],
    });

    await instance.semantic.dispatch(incrementV1);
    await expect(instance.lifecycle.restart()).resolves.toMatchObject({
      kind: "anchored",
    });
    await instance.flushAutoSave();
    expect(records.autoWrites()).toHaveLength(1);
    const afterRestart = await records.counting.list("save");
    const current = afterRestart.find(({ key }) => key.includes(":auto.current"));
    if (current === undefined) {
      throw new TypeError("expected restarted Auto Save");
    }
    expect(JSON.parse(new TextDecoder().decode(current.bytes))).toMatchObject({
      snapshot: {
        commandSequence: 0,
        state: { simulation: { counter: { count: 0 } } },
      },
    });

    await instance.semantic.dispatch(incrementV1);
    await instance.flushAutoSave();
    expect(records.autoWrites()).toHaveLength(2);
    await instance.dispose();
  });

  it("honors checkpointEveryCommands and the default every-commit policy", async () => {
    const checkpointed = countingRecordsV1();
    const { scheduler } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: checkpointed.counting,
      autosave: {
        mode: "debounced",
        delayMs: 1_000,
        checkpointEveryCommands: 2,
      },
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

  it.each(["load", "import"] as const)(
    "rejects the fixed zero RNG Save through explicit %s without mutating the live Session",
    async (operation) => {
      const records = createMemoryHostRecordStoreV1();
      if (operation === "load") await installFixedRngZeroAutoSaveV1(records);
      const rawSavesBefore = await records.list("save");
      const instance = await createInstanceV1({ records });
      const snapshotBefore = instance.admin.inspectForTest().snapshot;
      const digestBefore = instance.admin.stateDigest();
      const snapshotBytesBefore = canonicalJsonBytes(snapshotBefore);
      const commandLogBytesBefore = canonicalJsonBytes(instance.admin.commandLog());
      const statusBefore = instance.semantic.observe().status;
      const anchorBefore = instance.presentationAnchor();

      const result = operation === "load"
        ? await instance.persistence.load("auto.current")
        : await instance.persistence.importSave(createRngZeroStateSaveBytesV1());

      expect(result).toEqual({ kind: "rejected", code: "invalid_record" });
      expect((await instance.persistence.getStatus()).lastFailureCode).toBe("rng.invalid_state");
      expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
      expect(instance.admin.stateDigest()).toBe(digestBefore);
      expect(canonicalJsonBytes(instance.admin.inspectForTest().snapshot)).toEqual(
        snapshotBytesBefore,
      );
      expect(canonicalJsonBytes(instance.admin.commandLog())).toEqual(commandLogBytesBefore);
      expect(instance.semantic.observe().status).toBe(statusBefore);
      expect(instance.presentationAnchor()).toEqual(anchorBefore);
      expect(await records.list("save")).toEqual(rawSavesBefore);
      await instance.dispose();
    },
  );

  it("rejects a fixed zero RNG autosave at boot and retains a usable fresh session", async () => {
    const records = createMemoryHostRecordStoreV1();
    await installFixedRngZeroAutoSaveV1(records);
    const rawSavesBefore = await records.list("save");
    const fresh = await createInstanceV1({ seeds: [77] });
    const freshSnapshotBytes = canonicalJsonBytes(fresh.admin.inspectForTest().snapshot);
    const freshDigest = fresh.admin.stateDigest();
    await fresh.dispose();

    const resumed = await createCoreGameApplicationInstanceV1(resolvedResumingApplicationV1(), {
      host: hostServicesV1(records, [77]),
    });
    const installed = resumed.admin.inspectForTest().snapshot;
    expect(installed).toMatchObject({
      state: { simulation: { counter: { count: 0 } } },
      rng: { algorithm: "xorshift32-v1", cursor: 77, rawDrawCount: 0 },
      commandSequence: 0,
    });
    expect(canonicalJsonBytes(installed)).toEqual(freshSnapshotBytes);
    expect(resumed.admin.stateDigest()).toBe(freshDigest);
    expect(resumed.semantic.observe().status).toBe("ready");
    expect(resumed.presentationAnchor()).toEqual({ epoch: 0, origin: "bootstrap" });
    expect(resumed.admin.commandLog()).toEqual([]);
    expect(await resumed.persistence.getStatus()).toMatchObject({
      available: true,
      busy: false,
      safelySavedCommandSequence: null,
      lastFailureCode: "rng.invalid_state",
    });
    expect(await records.list("save")).toEqual(rawSavesBefore);
    await expect(resumed.admin.replayAuthoritatively()).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 0,
      mismatches: [],
    });
    expect(resumed.admin.inspectForTest().snapshot).toBe(installed);

    await expect(resumed.semantic.dispatch(incrementV1)).resolves.toEqual({
      kind: "committed",
      count: 1,
    });
    await expect(resumed.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await expect(resumed.persistence.load("quick")).resolves.toMatchObject({ kind: "loaded" });
    await resumed.dispose();
  });

  it("keeps a fresh bootstrap when current autosave is corrupt instead of auto-loading previous", async () => {
    const records = createMemoryHostRecordStoreV1();
    const source = await createCoreGameApplicationInstanceV1(resolvedResumingApplicationV1(), {
      host: hostServicesV1(records),
    });
    await source.semantic.dispatch(incrementV1);
    await source.semantic.dispatch(incrementV1);
    await source.autoSaveIdle();
    await source.dispose();

    const current = await records.read("save", rngZeroAutoSaveKeyV1);
    if (current === null) throw new TypeError("missing current autosave");
    const corrupted = await records.commit([
      Object.freeze({
        kind: "put" as const,
        namespace: "save",
        key: rngZeroAutoSaveKeyV1,
        expectedRevision: current.revision,
        bytes: new TextEncoder().encode("corrupt"),
      }),
    ]);
    if (corrupted.kind !== "committed") throw new TypeError("failed to corrupt current autosave");
    const savesBeforeResume = await records.list("save");

    const resumed = await createCoreGameApplicationInstanceV1(resolvedResumingApplicationV1(), {
      host: hostServicesV1(records, [78]),
    });
    expect((resumed.semantic.observe().game as { readonly count: number }).count).toBe(0);
    expect(resumed.presentationAnchor()).toEqual({ epoch: 0, origin: "bootstrap" });
    expect(resumed.admin.commandLog()).toEqual([]);
    await expect(resumed.persistence.listSlots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slotId: "auto.current",
          health: "invalid",
          warningCodes: ["syntax.invalid"],
        }),
        expect.objectContaining({
          slotId: "auto.previous",
          health: "recovery_candidate",
        }),
      ]),
    );
    expect(await records.list("save")).toEqual(savesBeforeResume);
    await resumed.dispose();
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

  it("fences persistence mutation ingress while exact close flush remains available", async () => {
    const records = createMemoryHostRecordStoreV1();
    const instance = await createInstanceV1({
      records,
      autosave: { mode: "debounced", delayMs: 60_000 },
    });

    instance.invalidateForHmr();
    await expect(instance.semantic.dispatch(incrementV1)).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    await expect(instance.persistence.clear("auto.current")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    await expect(instance.flushAutoSave()).resolves.toBeUndefined();
    expect(await records.list("save")).toHaveLength(1);
    await instance.dispose();
  });
});
