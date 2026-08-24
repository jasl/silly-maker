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
import type { PatchSetAdoptionDeclarationV1 } from "../../contracts/hotfix.ts";
import { createTransactionalRngV1, rngStateV1Schema } from "../../contracts/rng.ts";
import { createGameSnapshotEnvelopeSchemaV1 } from "../../contracts/snapshot.ts";
import {
  defineSaveStateMigrationRegistryV1,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
} from "../../contracts/save-state-migration.ts";
import type { SaveStateMigrationRegistryV1 } from "../../contracts/save-state-migration.ts";
import { parseStrictJson } from "../../contracts/strict-json.ts";
import type { DeepReadonly, NonZeroUint32, RuntimeSchemaV1 } from "../../contracts/values.ts";
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
import {
  createCoreGameApplicationInstanceForRebootstrapInternalV1,
  disposeCoreGameApplicationForRebootstrapInternalV1,
  invalidateCoreGameApplicationForHmrInternalV1,
  prepareCoreApplicationRestartInternalV1,
  subscribeCoreApplicationPresentationAnchorEventsInternalV1,
  type CorePresentationAnchorEventInternalV1,
} from "../internal.ts";
import type {
  CoreApplicationConstructionEventInternalV1,
  CoreApplicationExtensionContextV1,
  CoreApplicationHostServicesV1,
  CoreAutosavePolicyV1,
  CoreRebootstrapHandoffInternalV1,
  CoreSchedulerV1,
  CoreSemanticAdapterV1,
} from "./core-game-application.ts";
import {
  bindCoreApplicationReadinessOptionsInternalV1,
  clearAllCoreApplicationSavesForMaintenanceInternalV1,
  createCoreGameApplicationInstanceV1,
  defineCoreGameApplicationV1,
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

interface EvidenceEventV1 {
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
// 96a0a93, re-pinned for the M1 domain-event journal (committed outcomes carry
// `events` instead of `facts`, and the simulation identity digest covers the
// event schema). Length + SHA-256 pins the exact canonical/physical bytes
// without committing a second long-lived Save or Debug Bundle fixture.
const s0CompleteMixedGoldenV1 = {
  snapshot: {
    byteLength: 295,
    bytesDigest: "sha256:c4906e433f8ebf347134bffd58e6bde1fda5615afa2460d9bdf8594aef5a5917",
  },
  commandLog: {
    byteLength: 2534,
    bytesDigest: "sha256:3d77eed3450c84765e9e52b2bf822d4ffbe7df6ce317f6e877ded3e49a31727d",
  },
  debugBundle: {
    byteLength: 4433,
    bytesDigest: "sha256:6fbccc51fb2e5562f2f8efa061632d82d2fd33f4fb9c2cb591352781ccc2557f",
  },
  firstCommitSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 1,
      byteLength: 1452,
      bytesDigest: "sha256:3239108c1b2cd97a69f40e6fbcdbf689285651c37f31a1486bb6127bdb7b7962",
    },
  ],
  debugCommitSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 2,
      byteLength: 1524,
      bytesDigest: "sha256:9b738083a7eabb46d5d85e30ac3909c5e155d549bac499abefaaa08965952785",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 1,
      byteLength: 1453,
      bytesDigest: "sha256:dfb4e2b168ae7262a2e50f64402ef4f2a87b0e4b21beeb7149001d162e5048cf",
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
      bytesDigest: "sha256:1a768e929df5163f3a5edb40731ffdf8f05ca15d3d57503f9b669ae8909e2db5",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 3,
      byteLength: 1525,
      bytesDigest: "sha256:241ae02e7b27fb0fabc47175940718ddad766c662080558c0502c9856f6bdbc7",
    },
  ],
  postAnchorSnapshot: {
    byteLength: 339,
    bytesDigest: "sha256:ba77408f4ecc5adc7de9a9d8b6859bc29394fae1048d0e994500126ba61d4c29",
  },
  postAnchorCommandLog: {
    byteLength: 642,
    bytesDigest: "sha256:10d6005d9333579f99861a917751542bb7cd16bcaec1096c626e950d3994d171",
  },
  postAnchorSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 5,
      byteLength: 1568,
      bytesDigest: "sha256:3213a45c762708f3be392a16eeb251d21e56f18cc85f8d694b39305e93727895",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 4,
      byteLength: 1569,
      bytesDigest: "sha256:ff1f708352b47adb8f4515e5850bdbeb18f764714ae94aa7f30621c9aaa7319f",
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
      bytesDigest: "sha256:3239108c1b2cd97a69f40e6fbcdbf689285651c37f31a1486bb6127bdb7b7962",
    },
  ],
  firstResultSnapshot: {
    byteLength: 223,
    bytesDigest: "sha256:4f37bc1680c5e5bdd0fba7e564abd290cd87906cd63a7ee93899599aa6447f74",
  },
  firstResultEntry: {
    byteLength: 625,
    bytesDigest: "sha256:7253031ec0a70b8278f9faf63bd6cb9dd6bae4e96ed96ab8da4f1a6ed705cdfc",
  },
  rollbackSaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 3,
      byteLength: 1452,
      bytesDigest: "sha256:b2e622ad361d4b3f9a6ecce00cd950c51796474202701e11577c241e774c4064",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 2,
      byteLength: 1453,
      bytesDigest: "sha256:510f10fefaa4e6768a33f6c2c1c0780f4e4eb25b7d14ab819eb3445764910a8f",
    },
  ],
  retrySaves: [
    {
      key: "save-record.v1:story.synthetic-counter:auto.current",
      revision: 4,
      byteLength: 1452,
      bytesDigest: "sha256:b5657017d7a8c5712ea67f1a9b3b7a361a5c7c594ee36787ecab15f94f2ccd12",
    },
    {
      key: "save-record.v1:story.synthetic-counter:auto.previous",
      revision: 3,
      byteLength: 1453,
      bytesDigest: "sha256:97b236e97651942454e0e6961eb3364d50890a43fd6fdd2f2dd3e111ffcf11a0",
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
        bytesDigest: "sha256:01d17103dbd7a1f763096e5ce5aa0ffc732a7e69971efd39c1c0fb6eb2b4cd2f",
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
        bytesDigest: "sha256:8945389fc5a18720b91fcb31ff22365e5382977e906eadb94e3a47370b91eed4",
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
      (outcome.kind === "committed" && !Array.isArray(outcome.events)) ||
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
      readonly events?: readonly { readonly count: number }[];
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
        count: result.execution.events?.[0]?.count ?? 0,
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
  readonly zeroRngWithMalformedEvent?: boolean;
  readonly beforeGameAttemptReturns?: () => void;
  readonly beforeEvidenceSchemaReturns?: (
    kind: "event" | "rejection" | "debug_validation",
  ) => void;
}) {
  const baseEntry = createSyntheticCounterGamePackageV1();
  const baseStory = baseEntry.define();
  const eventSchemaInputs: unknown[] = [];
  const rejectionSchemaInputs: unknown[] = [];
  const debugValidationSchemaInputs: unknown[] = [];
  const rawEvents: EvidenceEventV1[] = [];
  const rawRejections: EvidenceRejectionV1[] = [];
  const rawDebugValidationErrors: EvidenceDebugValidationErrorV1[] = [];
  const normalizedEvents: EvidenceEventV1[] = [];
  const normalizedRejections: EvidenceRejectionV1[] = [];
  const normalizedDebugValidationErrors: EvidenceDebugValidationErrorV1[] = [];
  let projectedEvents: readonly EvidenceEventV1[] | undefined;
  let projectedRejections: readonly EvidenceRejectionV1[] | undefined;

  const eventSchema: RuntimeSchemaV1<EvidenceEventV1> = Object.freeze({
    parse(value: unknown): EvidenceEventV1 {
      eventSchemaInputs.push(value);
      const record = recordSchemaV1.parse(value);
      if (record.kind !== "synthetic.incremented") {
        throw new TypeError("invalid evidence-normalization event kind");
      }
      const normalized = {
        kind: "synthetic.incremented" as const,
        count: parseNonNegativeSafeInteger(record.count),
      };
      normalizedEvents.push(normalized);
      options?.beforeEvidenceSchemaReturns?.("event");
      return normalized;
    },
  });
  const rejectionSchema: RuntimeSchemaV1<EvidenceRejectionV1> = Object.freeze({
    parse(value: unknown): EvidenceRejectionV1 {
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
          eventSchema,
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
                const count = options?.zeroRngWithMalformedEvent === true
                  ? 0.5
                  : attempt.result.events[0]?.count ?? 0;
                const first = {
                  kind: "synthetic.incremented" as const,
                  count,
                  ignored: "first-raw-event",
                };
                const second = {
                  kind: "synthetic.incremented" as const,
                  count: (attempt.result.events[0]?.count ?? 0) + 100,
                  ignored: "second-raw-event",
                };
                rawEvents.push(first, second);
                const candidateRng = options?.zeroRngWithMalformedEvent === true
                  ? Object.freeze({ ...attempt.result.snapshot.rng, cursor: 0 })
                  : attempt.result.snapshot.rng;
                const candidateSnapshot = options?.zeroRngWithMalformedEvent === true
                  ? Object.freeze({ ...attempt.result.snapshot, rng: candidateRng })
                  : attempt.result.snapshot;
                return Object.freeze({
                  result: Object.freeze({
                    kind: "committed" as const,
                    snapshot: candidateSnapshot,
                    events: Object.freeze([first, second]),
                  }),
                  diagnostics: options?.zeroRngWithMalformedEvent === true
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
          readonly events?: readonly EvidenceEventV1[];
          readonly reasons?: readonly EvidenceRejectionV1[];
        };
      },
    ): SyntheticResultV1 {
      projectedEvents = result.execution?.events;
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
    eventSchemaInputs,
    rejectionSchemaInputs,
    debugValidationSchemaInputs,
    rawEvents,
    rawRejections,
    rawDebugValidationErrors,
    normalizedEvents,
    normalizedRejections,
    normalizedDebugValidationErrors,
    projectedEvents: () => projectedEvents,
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
    createInitialStateCalls,
    counts.snapshotDigestTraversals,
  ]);
}

const invalidCanonicalBootstrapV1: BootstrapCandidateFactoryV1 = (entropy) => ({
  invalid: 0.25,
  rngSeed: entropy.nextNonZeroUint32(),
});

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
  expect((rootReceived as { readonly nested: object }).nested).not.toBe(
    (raw as { readonly nested: object }).nested,
  );
  expect((rootReceived as { readonly repeated: object }).repeated).not.toBe(
    (raw as { readonly repeated: object }).repeated,
  );
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
    bytesDigest: "sha256:51686b9189842ee7f1b6265597cec3f8dfe2f1f3f8107cb6641ad22eee4683d3",
  },
] as const;

const auto0PreAdmissionSaveGoldenV1 = [
  {
    key: "save-record.v1:story.synthetic-counter:auto.current",
    revision: 2,
    byteLength: 1_452,
    bytesDigest: "sha256:6f2ee0bfda5f71a3921e21a30d8a86ff9eba9584e44535e3d2216033c728377f",
  },
  {
    key: "save-record.v1:story.synthetic-counter:auto.previous",
    revision: 1,
    byteLength: 1_453,
    bytesDigest: "sha256:b9ec6cc8b610d6e1801f46d1f6fe5752742d1dfd9dce0ba35eccd02a752c098a",
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

function resolvedSafepointApplicationV1(policy: {
  readonly classify: (
    state: SyntheticSimulationTypesV1["state"],
  ) => "safepoint" | "in_flight";
  readonly maxInFlightCommits: number;
}) {
  const result = resolveCoreGameApplicationV1(
    defineCoreGameApplicationV1({
      ...definitionV1,
      persistenceSafepoint: Object.freeze({
        classify: policy.classify,
        maxInFlightCommits: policy.maxInFlightCommits,
      }),
    }),
    { buildIdentityInput: deterministicBuildIdentityInputV1 },
  );
  if (result.kind !== "resolved") {
    throw new TypeError("safepoint fixture must resolve");
  }
  return result.application;
}

async function createSafepointInstanceV1(options: {
  classify: (state: SyntheticSimulationTypesV1["state"]) => "safepoint" | "in_flight";
  maxInFlightCommits?: number;
  records?: HostAtomicRecordStoreV1;
  autosave?: CoreAutosavePolicyV1;
  scheduler?: CoreSchedulerV1;
}) {
  return createCoreGameApplicationInstanceV1(
    resolvedSafepointApplicationV1({
      classify: options.classify,
      maxInFlightCommits: options.maxInFlightCommits ?? 8,
    }),
    {
      host: hostServicesV1(options.records ?? createMemoryHostRecordStoreV1()),
      ...(options.autosave === undefined ? {} : { autosave: options.autosave }),
      ...(options.scheduler === undefined ? {} : { scheduler: options.scheduler }),
    },
  );
}

/** Odd counts sit inside an in-flight span; even counts are safepoints. */
function oddCountsInFlightV1(
  state: SyntheticSimulationTypesV1["state"],
): "safepoint" | "in_flight" {
  return state.simulation.counter.count % 2 === 1 ? "in_flight" : "safepoint";
}

async function storedAutoCurrentV1(records: HostAtomicRecordStoreV1) {
  const stored = await records.list("save");
  const current = stored.find(({ key }) => key.includes(":auto.current"));
  if (current === undefined) return null;
  return JSON.parse(new TextDecoder().decode(current.bytes)) as {
    readonly snapshot: {
      readonly commandSequence: number;
      readonly state: {
        readonly simulation: { readonly counter: { readonly count: number } };
      };
    };
  };
}

function resolvedApplicationWithDisposeV1(dispose: () => void) {
  const result = resolveCoreGameApplicationV1(
    defineCoreGameApplicationV1({
      ...definitionV1,
      createExtensions: () => Object.freeze({ extensions: Object.freeze({}), dispose }),
    }),
    { buildIdentityInput: deterministicBuildIdentityInputV1 },
  );
  if (result.kind !== "resolved") {
    throw new TypeError("disposal fixture must resolve");
  }
  return result.application;
}

function resolvedApplicationWithExtensionFailureV1(error: Error) {
  const result = resolveCoreGameApplicationV1(
    defineCoreGameApplicationV1({
      ...definitionV1,
      createExtensions: () => {
        throw error;
      },
    }),
    { buildIdentityInput: deterministicBuildIdentityInputV1 },
  );
  if (result.kind !== "resolved") {
    throw new TypeError("failing extension fixture must resolve");
  }
  return result.application;
}

function resolvedApplicationWithRebootstrapProjectorV1(
  projectRebootstrapCommand: (
    snapshot: DeepReadonly<SyntheticSnapshotV1>,
    resolved: unknown,
  ) => DeepReadonly<SyntheticCounterCommandV1> | null,
) {
  const result = resolveCoreGameApplicationV1(
    defineCoreGameApplicationV1({
      ...definitionV1,
      projectRebootstrapCommand,
    }),
    { buildIdentityInput: deterministicBuildIdentityInputV1 },
  );
  if (result.kind !== "resolved") {
    throw new TypeError("rebootstrap projector fixture must resolve");
  }
  return result.application;
}

function leaseReleaseRecordsV1(options: { readonly rejectRelease?: boolean } = {}) {
  const delegate = createMemoryHostRecordStoreV1();
  const releaseError = new Error("synthetic lease release failure");
  let releaseAttempts = 0;
  const records: HostAtomicRecordStoreV1 = {
    read: delegate.read,
    list: delegate.list,
    commit(mutations) {
      const releases = mutations.filter((mutation) => {
        if (mutation.kind !== "put" || mutation.namespace !== "lease") return false;
        const decoded = decodeSessionLeaseRecordV1(mutation.bytes);
        return decoded.kind === "decoded" && decoded.record.ownerId === null;
      });
      releaseAttempts += releases.length;
      return releases.length > 0 && options.rejectRelease === true
        ? Promise.reject(releaseError)
        : delegate.commit(mutations);
    },
  };
  return Object.freeze({
    records: Object.freeze(records),
    releaseAttempts: () => releaseAttempts,
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
  it("rejects invalid adoption declaration configuration before Story resolution", () => {
    const digest = digestBytes(Uint8Array.of(0x61));
    const declaration: PatchSetAdoptionDeclarationV1 = Object.freeze({
      storyId: "story.synthetic-counter",
      storyRevision: parsePositiveSafeInteger(1),
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractDigest: digest,
      fromSimulationDigest: digest,
      toSimulationDigest: digest,
      simulationPatchSetDigest: digest,
    });
    const defineCalls = vi.fn();
    const raw = {
      ...definitionV1,
      entry: Object.freeze({
        ...definitionV1.entry,
        define: () => {
          defineCalls();
          return definitionV1.entry.define();
        },
      }),
      adoptionDeclarations: Array.from({ length: 257 }, () => declaration),
    };
    expect(resolveCoreGameApplicationV1(raw)).toMatchObject({
      kind: "failed",
      failure: { code: "save_adoption_declarations.invalid" },
    });
    expect(defineCalls).not.toHaveBeenCalled();

    expect(
      resolveCoreGameApplicationV1({
        ...raw,
        adoptionDeclarations: Object.freeze([declaration, { ...declaration }]),
      }),
    ).toMatchObject({
      kind: "failed",
      failure: { code: "save_adoption_declarations.invalid" },
    });
    expect(defineCalls).not.toHaveBeenCalled();
  });

  it("rejects an invalid persistence safepoint declaration before Story resolution", () => {
    const defineCalls = vi.fn();
    const raw = {
      ...definitionV1,
      entry: Object.freeze({
        ...definitionV1.entry,
        define: () => {
          defineCalls();
          return definitionV1.entry.define();
        },
      }),
    };
    const invalidDeclarations: readonly unknown[] = [
      Object.freeze({ classify: () => "safepoint" as const, maxInFlightCommits: 0 }),
      Object.freeze({ classify: () => "safepoint" as const, maxInFlightCommits: 257 }),
      Object.freeze({ classify: () => "safepoint" as const, maxInFlightCommits: 1.5 }),
      Object.freeze({ classify: null, maxInFlightCommits: 4 }),
      Object.freeze({ maxInFlightCommits: 4 }),
      Object.freeze({
        classify: () => "safepoint" as const,
        maxInFlightCommits: 4,
        extra: true,
      }),
    ];
    for (const persistenceSafepoint of invalidDeclarations) {
      expect(
        resolveCoreGameApplicationV1({ ...raw, persistenceSafepoint } as never),
      ).toMatchObject({
        kind: "failed",
        failure: { code: "persistence_safepoint.invalid" },
      });
    }
    expect(defineCalls).not.toHaveBeenCalled();

    const valid = resolveCoreGameApplicationV1(
      {
        ...raw,
        persistenceSafepoint: Object.freeze({
          classify: () => "safepoint" as const,
          maxInFlightCommits: 4,
        }),
      } as never,
      { buildIdentityInput: deterministicBuildIdentityInputV1 },
    );
    expect(valid.kind).toBe("resolved");
    expect(defineCalls).toHaveBeenCalled();
  });

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

  it("admits only an exact registry whose current State identity matches resolution", () => {
    const baseline = resolveCoreGameApplicationV1(definitionV1);
    expect(baseline.kind).toBe("resolved");
    if (baseline.kind !== "resolved") return;
    const resolvedProvenance = (
      baseline.application.resolved as {
        readonly provenance: {
          readonly resolved: {
            readonly stateContractRevision: ReturnType<typeof parsePositiveSafeInteger>;
            readonly stateContractDigest: ReturnType<typeof parseDigest>;
          };
        };
      }
    ).provenance.resolved;
    const resolvedIdentity = {
      stateContractRevision: resolvedProvenance.stateContractRevision,
      stateContractDigest: resolvedProvenance.stateContractDigest,
    };
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: parseSaveStateMigrationNamespaceV1("state.synthetic.aggregate"),
      minimumSupported: resolvedIdentity,
      current: resolvedIdentity,
      steps: [],
    });
    const definition = defineCoreGameApplicationV1({
      ...definitionV1,
      saveStateMigrations: registry,
    });
    const resolved = resolveCoreGameApplicationV1(definition);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind === "resolved") {
      expect(resolved.application.definition.saveStateMigrations).toBe(registry);
    }

    const registryReads = vi.fn()
      .mockReturnValueOnce(registry)
      .mockReturnValueOnce(registry)
      .mockReturnValue({ ...registry } as SaveStateMigrationRegistryV1);
    const definitionWithGetter = { ...definitionV1 } as typeof definitionV1 & {
      readonly saveStateMigrations?: SaveStateMigrationRegistryV1;
    };
    Object.defineProperty(definitionWithGetter, "saveStateMigrations", {
      enumerable: true,
      configurable: true,
      get: registryReads,
    });
    const capturedDefinition = defineCoreGameApplicationV1(definitionWithGetter);
    expect(capturedDefinition.saveStateMigrations).toBe(registry);
    expect(registryReads).toHaveBeenCalledTimes(1);

    expect(() =>
      defineCoreGameApplicationV1({
        ...definitionV1,
        saveStateMigrations: { ...registry } as SaveStateMigrationRegistryV1,
      })
    ).toThrow(TypeError);

    const mismatched = defineSaveStateMigrationRegistryV1({
      namespace: parseSaveStateMigrationNamespaceV1("state.synthetic.aggregate"),
      minimumSupported: {
        ...resolvedIdentity,
        stateContractDigest: digestBytes(new TextEncoder().encode("mismatched state contract")),
      },
      current: {
        ...resolvedIdentity,
        stateContractDigest: digestBytes(new TextEncoder().encode("mismatched state contract")),
      },
      steps: [],
    });
    const mismatchResult = resolveCoreGameApplicationV1(
      defineCoreGameApplicationV1({
        ...definitionV1,
        saveStateMigrations: mismatched,
      }),
    );
    expect(mismatchResult).toMatchObject({
      kind: "failed",
      failure: { code: "save_state_migration.current_identity_mismatch" },
    });

    const migrationCallback = vi.fn((state) => ({
      kind: "migrated" as const,
      state,
    }));
    const revisionMismatchedIdentity = {
      stateContractRevision: parsePositiveSafeInteger(
        resolvedIdentity.stateContractRevision + 1,
      ),
      stateContractDigest: resolvedIdentity.stateContractDigest,
    };
    const revisionMismatched = defineSaveStateMigrationRegistryV1({
      namespace: parseSaveStateMigrationNamespaceV1("state.synthetic.aggregate"),
      minimumSupported: resolvedIdentity,
      current: revisionMismatchedIdentity,
      steps: [
        {
          migrationId: parseSaveStateMigrationIdV1("migration.synthetic.revision-mismatch"),
          namespace: parseSaveStateMigrationNamespaceV1("state.synthetic.aggregate"),
          from: resolvedIdentity,
          to: revisionMismatchedIdentity,
          references: { renames: [], deletions: [] },
          migrate: migrationCallback,
        },
      ],
    });
    expect(
      resolveCoreGameApplicationV1(
        defineCoreGameApplicationV1({
          ...definitionV1,
          saveStateMigrations: revisionMismatched,
        }),
      ),
    ).toMatchObject({
      kind: "failed",
      failure: { code: "save_state_migration.current_identity_mismatch" },
    });
    expect(migrationCallback).not.toHaveBeenCalled();
  });
});

describe("createCoreGameApplicationInstanceV1", () => {
  it("forwards the exact resolved migration registry into Persistence", async () => {
    const baseEntry = createSyntheticCounterGamePackageV1();
    const baseStory = baseEntry.define();
    const currentEntry = Object.freeze({
      ...baseEntry,
      define: () =>
        Object.freeze({
          ...baseStory,
          simulation: Object.freeze({
            ...baseStory.simulation,
            stateContractRevision: parsePositiveSafeInteger(2),
          }),
        }),
    });
    const currentDefinition = defineCoreGameApplicationV1({
      ...definitionV1,
      entry: currentEntry,
    });
    const currentResolution = resolveCoreGameApplicationV1(currentDefinition, {
      buildIdentityInput: deterministicBuildIdentityInputV1,
    });
    expect(currentResolution.kind).toBe("resolved");
    if (currentResolution.kind !== "resolved") return;
    const resolvedState = (
      currentResolution.application.resolved as {
        readonly provenance: {
          readonly resolved: {
            readonly stateContractRevision: ReturnType<typeof parsePositiveSafeInteger>;
            readonly stateContractDigest: ReturnType<typeof parseDigest>;
          };
        };
      }
    ).provenance.resolved;
    const sourceIdentity = Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractDigest: resolvedState.stateContractDigest,
    });
    const targetIdentity = Object.freeze({
      stateContractRevision: resolvedState.stateContractRevision,
      stateContractDigest: resolvedState.stateContractDigest,
    });
    const migrate = vi.fn((state) => Object.freeze({ kind: "migrated" as const, state }));
    const namespace = parseSaveStateMigrationNamespaceV1("state.synthetic.core-wiring");
    const registry = defineSaveStateMigrationRegistryV1({
      namespace,
      minimumSupported: sourceIdentity,
      current: targetIdentity,
      steps: [
        {
          migrationId: parseSaveStateMigrationIdV1("migration.synthetic.core-wiring"),
          namespace,
          from: sourceIdentity,
          to: targetIdentity,
          references: { renames: [], deletions: [] },
          migrate,
        },
      ],
    });
    const resolution = resolveCoreGameApplicationV1(
      defineCoreGameApplicationV1({
        ...definitionV1,
        entry: currentEntry,
        saveStateMigrations: registry,
      }),
      { buildIdentityInput: deterministicBuildIdentityInputV1 },
    );
    expect(resolution.kind).toBe("resolved");
    if (resolution.kind !== "resolved") return;
    const instance = await createCoreGameApplicationInstanceV1(resolution.application, {
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
    });
    try {
      const exported = await instance.persistence.exportCurrentSave();
      const sourceBytes = Uint8Array.from(exported.bytes);
      const sourceRecord = JSON.parse(new TextDecoder().decode(sourceBytes)) as Record<
        string,
        unknown
      >;
      const provenance = sourceRecord.provenance as Record<string, unknown>;
      const resolved = provenance.resolved as Record<string, unknown>;
      resolved.stateContractRevision = sourceIdentity.stateContractRevision;
      const historicalBytes = canonicalJsonBytes(sourceRecord);

      await expect(instance.persistence.importSave(historicalBytes)).resolves.toEqual({
        kind: "imported",
        compatibility: "exact",
        commandSequence: 0,
      });
      expect(migrate).toHaveBeenCalledOnce();
      expect(instance.admin.commandLog()).toEqual([]);
    } finally {
      await instance.dispose();
    }
  });

  it("rejects a canonical zero seed atomically on all bootstrap surfaces", async () => {
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
      )).toEqual([1, 0, 0]);
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
      )).toEqual([1, 0, 0]);
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
      bootstrapAdmissionCanonicalTraversals: 1,
      commandAdmissionCanonicalTraversals: 0,
      commandLogMetadataAdmissionCanonicalTraversals: 0,
      evidenceAdmissionCanonicalTraversals: 0,
      replayComparisonTraversals: 0,
      totalPhysicalCanonicalTraversals: 2,
    });

    counter.reset();
    await expect(instance.lifecycle.restart()).resolves.toMatchObject({ kind: "anchored" });
    expect(counter.snapshot()).toEqual({
      snapshotDigestTraversals: 1,
      bootstrapAdmissionCanonicalTraversals: 1,
      commandAdmissionCanonicalTraversals: 0,
      commandLogMetadataAdmissionCanonicalTraversals: 0,
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

  it("projects one bootstrap handoff across construction, restart, and extension surfaces", async () => {
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
    )).toEqual([1, 1, 1]);
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
    )).toEqual([1, 1, 0]);
    expect(fixture.statefulModuleInitialStateCalls() - moduleCallsBeforeExtension).toBe(1);
    expectLatestCanonicalBootstrapHandoffV1(fixture, 2);
    expect(extensionCandidate).not.toBe(restarted);
    expect(extensionCandidate.rng.cursor).toBe(101);
    expect(context.session.getCurrentSnapshot()).toBe(restarted);
    expect(context.commandLog.replayBase()).toBe(restarted);
    expect(await rawSaveEvidenceV1(records)).toEqual([]);
    await instance.dispose();
  });

  it(
    "rejects canonical-invalid bootstrap data before construction owns runtime resources",
    async () => {
      const fixture = bootstrapCharacterizationFixtureV1({
        initialBootstrapFactory: invalidCanonicalBootstrapV1,
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

      expect.soft(error).toMatchObject({
        code: "number.not_integer",
        path: "/invalid",
      });
      expect.soft(bootstrapWorkTupleV1(counter, fixture.createInitialStateCalls())).toEqual([
        1,
        0,
        0,
      ]);
      expect.soft(fixture.statefulModuleInitialStateCalls()).toBe(0);
      expect.soft(fixture.rootReceivedBootstraps()).toEqual([]);
      expect.soft(fixture.statefulModuleReceivedBootstraps()).toEqual([]);
      expect.soft(constructionEvents).toEqual([]);
      expect.soft(await records.list("save")).toEqual([]);
      expect.soft(await records.list("lease")).toEqual([]);
    },
  );

  it("rejects one canonical-invalid bootstrap atomically on queued restart", async () => {
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
      fixture.useNextBootstrap(invalidCanonicalBootstrapV1);
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
      ).toEqual([1, 0, 0]);
      expect.soft(fixture.statefulModuleInitialStateCalls() - moduleCallsBefore).toBe(0);
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
      fixture.useNextBootstrap(invalidCanonicalBootstrapV1);
      counter.reset();

      const error = observeSynchronousFailureV1(() => context.createInitialSnapshot());

      expect.soft(error).toMatchObject({
        code: "number.not_integer",
        path: "/invalid",
      });
      expect.soft(
        bootstrapWorkTupleV1(
          counter,
          fixture.createInitialStateCalls() - rootCallsBefore,
        ),
      ).toEqual([1, 0, 0]);
      expect.soft(fixture.statefulModuleInitialStateCalls() - moduleCallsBefore).toBe(0);
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

  it.each([
    Object.freeze({
      mode: "preflight" as const,
      expectedTuple: Object.freeze([0, 0, 0] as const),
      expectedModuleCalls: 0,
    }),
    Object.freeze({
      mode: "post_operation" as const,
      expectedTuple: Object.freeze([1, 1, 0] as const),
      expectedModuleCalls: 1,
    }),
    Object.freeze({
      mode: "catch" as const,
      expectedTuple: Object.freeze([1, 0, 0] as const),
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
          invalidateCoreGameApplicationForHmrInternalV1(instance);
        } else if (mode === "post_operation") {
          fixture.useNextBootstrap((entropy) => {
            invalidateCoreGameApplicationForHmrInternalV1(instance);
            return canonicalBootstrapCandidateV1(entropy);
          });
        } else {
          fixture.useNextBootstrap((entropy) =>
            new Proxy(
              { rngSeed: entropy.nextNonZeroUint32() },
              {
                getPrototypeOf() {
                  invalidateCoreGameApplicationForHmrInternalV1(instance);
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
    )).toEqual([0, 0, 0]);
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
    )).toEqual([0, 0, 0]);
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
    )).toEqual([0, 0, 0]);
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

  it("enters the no-readiness semantic command path before dispatch returns", async () => {
    const commandForInvocation = vi.fn(adapterV1.commandForInvocation);
    const definition = defineCoreGameApplicationV1({
      entry: createSyntheticCounterGamePackageV1(),
      semantic: Object.freeze({
        ...adapterV1,
        commandForInvocation,
      }) as unknown as CoreSemanticAdapterV1<
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
    if (resolved.kind !== "resolved") throw new TypeError("synthetic story must resolve");
    const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
    });
    try {
      const pending = instance.semantic.dispatch(incrementV1);
      expect(commandForInvocation).toHaveBeenCalledOnce();
      await expect(pending).resolves.toEqual({ kind: "committed", count: 1 });
    } finally {
      await instance.dispose();
    }
  });

  it("prepares admitted semantic invocations in dispatch order without committing on failure", async () => {
    const options = Object.freeze({
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
    });
    const preparationFailure = new Error("synthetic content preparation failure");
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let markFirstStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    let releaseSecond!: () => void;
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    let markSecondStarted!: () => void;
    const secondStarted = new Promise<void>((resolve) => {
      markSecondStarted = resolve;
    });
    let callCount = 0;
    const prepareSemanticInvocation = vi.fn(async (_invocation: SyntheticInvocationV1) => {
      callCount += 1;
      if (callCount === 1) {
        markFirstStarted();
        await firstGate;
        throw preparationFailure;
      }
      markSecondStarted();
      await secondGate;
    });
    bindCoreApplicationReadinessOptionsInternalV1<SyntheticInvocationV1, never>(
      options,
      { prepareSemanticInvocation },
    );
    const instance = await createCoreGameApplicationInstanceV1(
      resolvedApplicationV1(),
      options,
    );
    try {
      await expect(instance.semantic.dispatch({ kind: "invalid" } as never)).resolves.toEqual({
        kind: "not_executed",
        code: "validation_failed",
      });
      expect(prepareSemanticInvocation).not.toHaveBeenCalled();

      const snapshotBefore = instance.admin.inspectForTest().snapshot;
      const logBefore = instance.admin.commandLog();
      const first = instance.semantic.dispatch(incrementV1);
      const second = instance.semantic.dispatch(incrementV1);
      await firstStarted;
      expect(prepareSemanticInvocation).toHaveBeenCalledOnce();
      expect(prepareSemanticInvocation.mock.calls[0]?.[0]).not.toBe(incrementV1);
      expect(prepareSemanticInvocation.mock.calls[0]?.[0]).toEqual(incrementV1);
      expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
      expect(instance.admin.commandLog()).toBe(logBefore);

      releaseFirst();
      await expect(first).rejects.toBe(preparationFailure);
      await secondStarted;
      expect(prepareSemanticInvocation).toHaveBeenCalledTimes(2);
      expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
      expect(instance.admin.commandLog()).toBe(logBefore);

      releaseSecond();
      await expect(second).resolves.toEqual({ kind: "committed", count: 1 });
      expect(instance.admin.commandLog()).toHaveLength(1);
    } finally {
      releaseFirst();
      releaseSecond();
      await instance.dispose();
    }
  });

  it.each(["load", "import"] as const)(
    "prepares a validated %s candidate before replacement and preserves State on failure",
    async (surface) => {
      const options = Object.freeze({
        host: hostServicesV1(createMemoryHostRecordStoreV1()),
      });
      const preparationFailure = new Error("synthetic replacement preparation failure");
      let rejectPreparation = false;
      const prepareReplacement = vi.fn(async () => {
        if (rejectPreparation) throw preparationFailure;
      });
      bindCoreApplicationReadinessOptionsInternalV1<never, SyntheticSnapshotV1>(
        options,
        { prepareReplacement },
      );
      const instance = await createCoreGameApplicationInstanceV1(
        resolvedApplicationV1(),
        options,
      );
      try {
        await instance.semantic.dispatch(incrementV1);
        await expect(instance.persistence.save("manual.1")).resolves.toMatchObject({
          kind: "saved",
        });
        const exported = await instance.persistence.exportCurrentSave();
        await instance.semantic.dispatch(incrementV1);
        const snapshotBefore = instance.admin.inspectForTest().snapshot;
        const logBefore = instance.admin.commandLog();

        rejectPreparation = true;
        const failed = surface === "load"
          ? await instance.persistence.load("manual.1")
          : await instance.persistence.importSave(exported.bytes);
        expect(failed).toEqual({ kind: "faulted", code: "persistence.unexpected" });
        expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
        expect(instance.admin.commandLog()).toBe(logBefore);

        rejectPreparation = false;
        const recovered = surface === "load"
          ? await instance.persistence.load("manual.1")
          : await instance.persistence.importSave(exported.bytes);
        expect(recovered.kind).toBe(surface === "load" ? "loaded" : "imported");
        expect(instance.semantic.observe().game).toEqual({ count: 1 });
        expect(prepareReplacement).toHaveBeenCalledTimes(2);
      } finally {
        await instance.dispose();
      }
    },
  );

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
      expect(fixture.eventSchemaInputs).toHaveLength(2);
      expect(fixture.eventSchemaInputs[0]).toBe(fixture.rawEvents[0]);
      expect(fixture.eventSchemaInputs[1]).toBe(fixture.rawEvents[1]);
      const committedEvents = fixture.projectedEvents();
      expect(committedEvents?.[0]).not.toBe(fixture.normalizedEvents[0]);
      expect(committedEvents?.[1]).not.toBe(fixture.normalizedEvents[1]);
      expect(committedEvents?.[0]).toEqual(fixture.normalizedEvents[0]);
      expect(committedEvents?.[1]).toEqual(fixture.normalizedEvents[1]);
      const committedEntry = instance.admin.commandLog()[0] as {
        readonly outcome: {
          readonly kind: "committed";
          readonly events: readonly EvidenceEventV1[];
        };
      };
      expect(committedEntry.outcome.events[0]).toBe(committedEvents?.[0]);
      expect(committedEntry.outcome.events[1]).toBe(committedEvents?.[1]);

      await expect(instance.semantic.dispatch(rejectV1)).resolves.toEqual({ kind: "rejected" });
      expect(fixture.rejectionSchemaInputs).toHaveLength(2);
      expect(fixture.rejectionSchemaInputs[0]).toBe(fixture.rawRejections[0]);
      expect(fixture.rejectionSchemaInputs[1]).toBe(fixture.rawRejections[1]);
      const rejectedReasons = fixture.projectedRejections();
      expect(rejectedReasons?.[0]).not.toBe(fixture.normalizedRejections[0]);
      expect(rejectedReasons?.[1]).not.toBe(fixture.normalizedRejections[1]);
      expect(rejectedReasons?.[0]).toEqual(fixture.normalizedRejections[0]);
      expect(rejectedReasons?.[1]).toEqual(fixture.normalizedRejections[1]);
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
      expect(instance.admin.commandLog()).toBe(logBeforeDebugValidation);

      const commandLogBytesBeforeReplay = canonicalJsonBytes(instance.admin.commandLog());
      await expect(instance.admin.replayAuthoritatively()).resolves.toMatchObject({
        authoritative: true,
        identityMatch: true,
        matches: true,
        executedEntries: 2,
        mismatches: [],
      });
      expect(fixture.eventSchemaInputs).toHaveLength(4);
      expect(fixture.rejectionSchemaInputs).toHaveLength(4);
      expect(canonicalJsonBytes(instance.admin.commandLog())).toEqual(commandLogBytesBeforeReplay);
      expect((instance.admin.commandLog()[0] as typeof committedEntry).outcome.events[0]).toBe(
        committedEvents?.[0],
      );
      expect((instance.admin.commandLog()[1] as typeof rejectedEntry).outcome.reasons[0]).toBe(
        rejectedReasons?.[0],
      );
    } finally {
      await instance.dispose();
    }
  });

  it("keeps Core candidate RNG admission ahead of malformed event finalization", async () => {
    const fixture = evidenceNormalizationFixtureV1({ zeroRngWithMalformedEvent: true });
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
      expect(fixture.rawEvents).toHaveLength(2);
      expect(fixture.eventSchemaInputs).toEqual([]);
      expect(fixture.normalizedEvents).toEqual([]);
      expect(fixture.projectedEvents()).toBeUndefined();
      expect(counter.snapshot()).toEqual({
        snapshotDigestTraversals: 0,
        bootstrapAdmissionCanonicalTraversals: 0,
        commandAdmissionCanonicalTraversals: 1,
        commandLogMetadataAdmissionCanonicalTraversals: 0,
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
      zeroRngWithMalformedEvent: true,
      beforeGameAttemptReturns: () => {
        if (instance !== undefined) invalidateCoreGameApplicationForHmrInternalV1(instance);
      },
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
      expect(fixture.eventSchemaInputs).toEqual([]);
      expect(counter.snapshot()).toEqual({
        snapshotDigestTraversals: 0,
        bootstrapAdmissionCanonicalTraversals: 0,
        commandAdmissionCanonicalTraversals: 1,
        commandLogMetadataAdmissionCanonicalTraversals: 0,
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

  it.each(["event", "rejection", "debug_validation"] as const)(
    "drops a finalized %s candidate when its Story schema invalidates the Core instance",
    async (target) => {
      let instance:
        | Awaited<ReturnType<typeof createCoreGameApplicationInstanceV1>>
        | undefined;
      const fixture = evidenceNormalizationFixtureV1({
        beforeEvidenceSchemaReturns: (kind) => {
          if (kind === target && instance !== undefined) {
            invalidateCoreGameApplicationForHmrInternalV1(instance);
          }
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
        const result = target === "event"
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

  it("correlates two prepared concurrent restarts with distinct exact publication contexts", async () => {
    const instance = await createInstanceV1({ seeds: [77, 83, 89] });
    const events: CorePresentationAnchorEventInternalV1[] = [];
    const unsubscribe = subscribeCoreApplicationPresentationAnchorEventsInternalV1(
      instance,
      (event) => events.push(event),
    );
    const first = prepareCoreApplicationRestartInternalV1(instance);
    const second = prepareCoreApplicationRestartInternalV1(instance);

    expect(first.publicationContext).not.toBe(second.publicationContext);
    expect(events).toEqual([]);

    const firstRun = first.run();
    expect(first.run()).toBe(firstRun);
    const secondRun = second.run();
    expect(second.run()).toBe(secondRun);
    await expect(Promise.all([firstRun, secondRun])).resolves.toEqual([
      { kind: "anchored", commandSequence: 0 },
      { kind: "anchored", commandSequence: 0 },
    ]);

    expect(events.map((event) => event.anchor)).toEqual([
      { epoch: 1, origin: "restart" },
      { epoch: 2, origin: "restart" },
    ]);
    expect(events[0]?.publicationContext).toBe(first.publicationContext);
    expect(events[1]?.publicationContext).toBe(second.publicationContext);
    expect(Object.isFrozen(events[0])).toBe(true);
    expect(Object.isFrozen(events[0]?.anchor)).toBe(true);

    unsubscribe();
    await instance.dispose();
  });

  it("keeps prepared restart correlation exact across queued load and import replacements", async () => {
    const instance = await createInstanceV1({ seeds: [77, 83] });
    await expect(instance.persistence.save("manual.1")).resolves.toMatchObject({ kind: "saved" });
    await instance.semantic.dispatch(incrementV1);
    const exported = await instance.persistence.exportCurrentSave();
    const bytes = (exported as { readonly bytes: Uint8Array }).bytes;
    const events: CorePresentationAnchorEventInternalV1[] = [];
    const unsubscribe = subscribeCoreApplicationPresentationAnchorEventsInternalV1(
      instance,
      (event) => events.push(event),
    );
    const prepared = prepareCoreApplicationRestartInternalV1(instance);

    const loaded = instance.persistence.load("manual.1");
    const imported = instance.persistence.importSave(bytes);
    const restarted = prepared.run();
    await expect(Promise.all([loaded, imported, restarted])).resolves.toEqual([
      { kind: "loaded", compatibility: "exact", commandSequence: 0 },
      { kind: "imported", compatibility: "exact", commandSequence: 1 },
      { kind: "anchored", commandSequence: 0 },
    ]);

    expect(events.map((event) => event.anchor)).toEqual([
      { epoch: 1, origin: "load" },
      { epoch: 2, origin: "import" },
      { epoch: 3, origin: "restart" },
    ]);
    expect(events[0]?.publicationContext).not.toBeNull();
    expect(events[1]?.publicationContext).not.toBeNull();
    expect(events[0]?.publicationContext).not.toBe(events[1]?.publicationContext);
    expect(events[0]?.publicationContext).not.toBe(prepared.publicationContext);
    expect(events[1]?.publicationContext).not.toBe(prepared.publicationContext);
    expect(events[2]?.publicationContext).toBe(prepared.publicationContext);

    unsubscribe();
    await instance.dispose();
  });

  it("preserves the public raw restart result and observer-isolated anchor contract", async () => {
    const instance = await createInstanceV1({ seeds: [77, 83] });
    const publicAnchors: unknown[] = [];
    const exactEvents: CorePresentationAnchorEventInternalV1[] = [];
    const unsubscribeThrowing = instance.subscribePresentationAnchor(() => {
      throw new Error("synthetic public anchor observer failure");
    });
    const unsubscribePublic = instance.subscribePresentationAnchor((anchor) => {
      publicAnchors.push(anchor);
    });
    const unsubscribeExactThrowing = subscribeCoreApplicationPresentationAnchorEventsInternalV1(
      instance,
      () => {
        throw new Error("synthetic exact anchor observer failure");
      },
    );
    const unsubscribeExact = subscribeCoreApplicationPresentationAnchorEventsInternalV1(
      instance,
      (event) => exactEvents.push(event),
    );

    await expect(instance.lifecycle.restart()).resolves.toEqual({
      kind: "anchored",
      commandSequence: 0,
    });
    expect(Object.keys(instance.lifecycle)).toEqual(["restart"]);
    expect(publicAnchors).toEqual([{ epoch: 1, origin: "restart" }]);
    expect(exactEvents).toHaveLength(1);
    expect(exactEvents[0]).toMatchObject({
      anchor: { epoch: 1, origin: "restart" },
    });
    expect(exactEvents[0]?.publicationContext).not.toBeNull();

    unsubscribeThrowing();
    unsubscribePublic();
    unsubscribeExactThrowing();
    unsubscribeExact();
    await instance.dispose();
  });

  it("fails closed for foreign and disposed internal composition targets", async () => {
    const foreign = Object.freeze({});
    expect(() => prepareCoreApplicationRestartInternalV1(foreign)).toThrowError(
      "core.application_internal_unavailable",
    );
    expect(() =>
      subscribeCoreApplicationPresentationAnchorEventsInternalV1(foreign, () => undefined)
    ).toThrowError("core.application_internal_unavailable");

    const instance = await createInstanceV1({ seeds: [77, 83] });
    const events: CorePresentationAnchorEventInternalV1[] = [];
    subscribeCoreApplicationPresentationAnchorEventsInternalV1(
      instance,
      (event) => events.push(event),
    );
    const prepared = prepareCoreApplicationRestartInternalV1(instance);
    await disposeCoreGameApplicationForRebootstrapInternalV1(instance);

    expect(() => prepareCoreApplicationRestartInternalV1(instance)).toThrowError(
      "core.application_internal_unavailable",
    );
    expect(() =>
      subscribeCoreApplicationPresentationAnchorEventsInternalV1(instance, () => undefined)
    ).toThrowError("core.application_internal_unavailable");
    const lateRun = prepared.run();
    expect(prepared.run()).toBe(lateRun);
    await expect(lateRun).resolves.toEqual({
      kind: "rejected",
      code: "hmr_invalidated",
    });
    expect(events).toEqual([]);
  });

  it("does not leak a tagged replacement origin into the next generic queue entry", async () => {
    const fixture = bootstrapCharacterizationFixtureV1();
    const instance = await createCoreGameApplicationInstanceV1(fixture.application, {
      host: hostServicesV1(createMemoryHostRecordStoreV1(), [91]),
    });
    try {
      const context = fixture.extensionContext();
      if (context === undefined) throw new TypeError("extension context missing");
      await expect(instance.persistence.save("manual.1")).resolves.toMatchObject({
        kind: "saved",
      });
      await instance.semantic.dispatch(incrementV1);
      const anchors: unknown[] = [];
      const exactEvents: CorePresentationAnchorEventInternalV1[] = [];
      const unsubscribe = instance.subscribePresentationAnchor((anchor) => anchors.push(anchor));
      const unsubscribeExact = subscribeCoreApplicationPresentationAnchorEventsInternalV1(
        instance,
        (event) => exactEvents.push(event),
      );

      const load = instance.persistence.load("manual.1");
      const generic = context.runtimeControl.enqueueAuthoritative(
        async (current) =>
          Object.freeze({
            kind: "replace" as const,
            snapshot: Object.freeze({ ...current }),
            result: "generic_anchored" as const,
            anchor: "replace_replay_base" as const,
          }),
        () => "outer_fault" as const,
      );
      await expect(Promise.all([load, generic])).resolves.toEqual([
        { kind: "loaded", compatibility: "exact", commandSequence: 0 },
        "generic_anchored",
      ]);
      expect(anchors).toEqual([
        { epoch: 1, origin: "load" },
        { epoch: 2, origin: "replacement" },
      ]);
      expect(exactEvents[0]?.publicationContext).not.toBeNull();
      expect(exactEvents[1]?.publicationContext).toBeNull();

      unsubscribe();
      unsubscribeExact();
    } finally {
      await instance.dispose();
    }
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

  it("defers every-commit autosave across an in-flight span and resumes at the next safepoint", async () => {
    const { counting, autoWrites } = countingRecordsV1();
    const instance = await createSafepointInstanceV1({
      classify: oddCountsInFlightV1,
      records: counting,
    });

    await instance.semantic.dispatch(incrementV1); // count 1: in flight
    await instance.autoSaveIdle();
    expect(autoWrites()).toEqual([]);

    await instance.semantic.dispatch(incrementV1); // count 2: safepoint
    await instance.autoSaveIdle();
    expect(autoWrites()).toHaveLength(1);
    expect((await storedAutoCurrentV1(counting))?.snapshot.commandSequence).toBe(2);

    await instance.semantic.dispatch(incrementV1); // count 3: a new span opens
    await instance.autoSaveIdle();
    expect(autoWrites()).toHaveLength(1);

    await instance.semantic.dispatch(incrementV1); // count 4: span closes
    await instance.autoSaveIdle();
    expect(autoWrites()).toHaveLength(2);
    expect((await storedAutoCurrentV1(counting))?.snapshot.commandSequence).toBe(4);
    expect(instance.diagnostics.runtimeFailures()).toEqual([]);
    await instance.dispose();
  });

  it("holds the last safepoint as debounce candidate, manual-save gate, and flush fallback mid-span", async () => {
    const { counting, autoWrites } = countingRecordsV1();
    const { scheduler, scheduled } = manualSchedulerV1();
    const instance = await createSafepointInstanceV1({
      classify: oddCountsInFlightV1,
      records: counting,
      autosave: { mode: "debounced", delayMs: 250 },
      scheduler,
    });

    await instance.semantic.dispatch(incrementV1); // in flight: no candidate, no timer
    expect(scheduled).toHaveLength(0);

    await instance.semantic.dispatch(incrementV1); // safepoint: debounce arms
    expect(scheduled).toHaveLength(1);

    await instance.semantic.dispatch(incrementV1); // in flight: candidate/timer stay put
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.cancelled).toBe(false);

    // Player-slot saves inside the span reject without touching the slot.
    await expect(instance.persistence.save("quick")).resolves.toEqual({
      kind: "rejected",
      code: "in_flight",
    });

    // A pagehide-style flush mid-span writes the safepoint Snapshot, not the
    // in-flight queue front.
    await instance.flushAutoSave();
    expect(autoWrites()).toHaveLength(1);
    const stored = await storedAutoCurrentV1(counting);
    expect(stored?.snapshot.commandSequence).toBe(2);
    expect(stored?.snapshot.state.simulation.counter.count).toBe(2);

    // The fallback record is an ordinary loadable autosave.
    await expect(instance.persistence.load("auto.current")).resolves.toMatchObject({
      kind: "loaded",
    });
    expect((instance.semantic.observe().game as { readonly count: number }).count).toBe(2);

    // Outside the span the player-slot gate reopens.
    await expect(instance.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await instance.dispose();
  });

  it("rejects R2 handoff at an in-flight current Snapshot instead of using the older safepoint", async () => {
    const records = createMemoryHostRecordStoreV1();
    const instance = await createSafepointInstanceV1({
      classify: oddCountsInFlightV1,
      records,
    });
    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(incrementV1); // exact current safepoint
    await instance.autoSaveIdle();
    await instance.semantic.dispatch(incrementV1); // current is now in flight

    await expect(disposeCoreGameApplicationForRebootstrapInternalV1(instance)).rejects.toThrow(
      "persistence.rebootstrap_current_not_safepoint",
    );
    expect((await storedAutoCurrentV1(records))?.snapshot.commandSequence).toBe(2);
    await expect(instance.persistence.lease.getStatus()).resolves.toMatchObject({
      kind: "unowned",
      fencingToken: 1,
    });
  });

  it("lets an armed pre-span debounce fire mid-span with the retained safepoint candidate", async () => {
    const { counting, autoWrites } = countingRecordsV1();
    const { scheduler, runLast } = manualSchedulerV1();
    const instance = await createSafepointInstanceV1({
      classify: oddCountsInFlightV1,
      records: counting,
      autosave: { mode: "debounced", delayMs: 250 },
      scheduler,
    });

    await instance.semantic.dispatch(incrementV1); // in flight
    await instance.semantic.dispatch(incrementV1); // safepoint: candidate + timer
    await instance.semantic.dispatch(incrementV1); // in flight: both stay put

    // The timer firing inside the span still writes the pre-span safepoint.
    runLast();
    await instance.autoSaveIdle();
    expect(autoWrites()).toHaveLength(1);
    expect((await storedAutoCurrentV1(counting))?.snapshot.commandSequence).toBe(2);
    await instance.dispose();
  });

  it("skips the flush when a span has no safepoint Snapshot in this anchor era", async () => {
    const { counting, autoWrites } = countingRecordsV1();
    const { scheduler } = manualSchedulerV1();
    const instance = await createSafepointInstanceV1({
      classify: (state) => state.simulation.counter.count >= 1 ? "in_flight" : "safepoint",
      records: counting,
      autosave: { mode: "debounced", delayMs: 800 },
      scheduler,
    });

    // The queue-front bootstrap state classifies as a safepoint: flush writes it.
    await instance.flushAutoSave();
    expect(autoWrites()).toHaveLength(1);

    // Inside the span, with no safepoint committed in this era, a flush has
    // nothing safe to write and leaves the stored pre-span record alone.
    await instance.semantic.dispatch(incrementV1);
    await instance.flushAutoSave();
    expect(autoWrites()).toHaveLength(1);
    expect((await storedAutoCurrentV1(counting))?.snapshot.commandSequence).toBe(0);
    await instance.dispose();
  });

  it("forfeits the inhibit with one diagnostic when a span exceeds its declared bound", async () => {
    const { counting, autoWrites } = countingRecordsV1();
    const instance = await createSafepointInstanceV1({
      classify: (state) => state.simulation.counter.count >= 1 ? "in_flight" : "safepoint",
      maxInFlightCommits: 2,
      records: counting,
    });
    const overruns = () =>
      instance.diagnostics.runtimeFailures().filter((failure) =>
        failure.message === "persistence.safepoint_span_exceeded"
      );

    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    expect(autoWrites()).toEqual([]);
    expect(overruns()).toHaveLength(0);

    // The third consecutive in-flight commit crosses the bound: the inhibit
    // forfeits, the overrun surfaces once, and autosave resumes.
    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    expect(autoWrites()).toHaveLength(1);
    expect(overruns()).toHaveLength(1);

    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    expect(autoWrites()).toHaveLength(2);
    expect(overruns()).toHaveLength(1);

    // The player-slot gate honors the forfeit too.
    await expect(instance.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });
    await instance.dispose();
  });

  it("treats a throwing classifier as a safepoint and surfaces the malfunction", async () => {
    const { counting, autoWrites } = countingRecordsV1();
    const instance = await createSafepointInstanceV1({
      classify: (state) => {
        if (state.simulation.counter.count === 1) {
          throw new Error("synthetic classifier bug");
        }
        return "safepoint";
      },
      records: counting,
    });

    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    // Fail open: a malfunctioning declaration cannot starve the autosave.
    expect(autoWrites()).toHaveLength(1);
    expect(
      instance.diagnostics.runtimeFailures().filter((failure) =>
        failure.message === "persistence.safepoint_classify_failed"
      ),
    ).toHaveLength(1);

    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    expect(autoWrites()).toHaveLength(2);
    await instance.dispose();
  });

  it("starts span tracking fresh after a load replaces the replay base", async () => {
    const { counting, autoWrites } = countingRecordsV1();
    const { scheduler } = manualSchedulerV1();
    const instance = await createSafepointInstanceV1({
      classify: oddCountsInFlightV1,
      records: counting,
      autosave: { mode: "debounced", delayMs: 800 },
      scheduler,
    });

    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(incrementV1); // safepoint: fallback candidate
    await instance.flushAutoSave();
    expect(autoWrites()).toHaveLength(1);

    await instance.semantic.dispatch(incrementV1); // count 3: in flight
    await expect(instance.persistence.load("auto.current")).resolves.toMatchObject({
      kind: "loaded",
    });

    // The pre-load safepoint Snapshot belongs to the replaced replay base: a
    // mid-span flush in the new era must not resurrect it.
    await instance.semantic.dispatch(incrementV1); // count 3 again: in flight
    await instance.flushAutoSave();
    expect(autoWrites()).toHaveLength(1);
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

  it("continues the exact authoritative Snapshot and replay base across rebootstrap", async () => {
    const records = createMemoryHostRecordStoreV1();
    const predecessor = await createInstanceV1({ records, seeds: [77] });
    expect(predecessor).not.toHaveProperty("invalidateForHmr");
    expect(predecessor).not.toHaveProperty("disposeForRebootstrap");
    await predecessor.semantic.dispatch(incrementV1);
    await predecessor.semantic.dispatch(incrementV1);
    const predecessorSnapshot = predecessor.admin.inspectForTest().snapshot;
    const predecessorDigest = predecessor.admin.stateDigest();
    expect(predecessorSnapshot).toMatchObject({
      state: { simulation: { counter: { count: 2 } } },
      rng: { algorithm: "xorshift32-v1", cursor: 77, rawDrawCount: 0 },
      commandSequence: 2,
    });

    const handoff = await disposeCoreGameApplicationForRebootstrapInternalV1(predecessor);
    expect(handoff).toMatchObject({
      save: { mediaType: "application/json" },
      lease: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    const prepareReplacement = vi.fn(async (snapshot: DeepReadonly<SyntheticSnapshotV1>) => {
      expect(canonicalJsonBytes(snapshot)).toEqual(canonicalJsonBytes(predecessorSnapshot));
    });
    const successorOptions = Object.freeze({
      host: hostServicesV1(records, [83]),
      handoff,
      onRebootstrapStartFailureInternal: () => undefined,
    });
    bindCoreApplicationReadinessOptionsInternalV1<never, SyntheticSnapshotV1>(
      successorOptions,
      { prepareReplacement },
    );
    const successor = await createCoreGameApplicationInstanceForRebootstrapInternalV1(
      resolvedApplicationV1(),
      successorOptions,
    );
    try {
      expect(prepareReplacement).toHaveBeenCalledOnce();
      const successorSnapshot = successor.admin.inspectForTest().snapshot;
      expect(canonicalJsonBytes(successorSnapshot)).toEqual(
        canonicalJsonBytes(predecessorSnapshot),
      );
      expect(successor.admin.stateDigest()).toBe(predecessorDigest);
      expect(successor.admin.commandLog()).toEqual([]);
      await expect(successor.admin.replayAuthoritatively()).resolves.toMatchObject({
        authoritative: true,
        identityMatch: true,
        matches: true,
        executedEntries: 0,
      });

      await expect(successor.semantic.dispatch(incrementV1)).resolves.toEqual({
        kind: "committed",
        count: 3,
      });
      expect(successor.admin.inspectForTest().snapshot).toMatchObject({
        rng: predecessorSnapshot.rng,
        commandSequence: 3,
      });
      expect(successor.admin.commandLog()).toMatchObject([
        {
          preStateDigest: predecessorDigest,
          commandSequence: { before: 2, after: 3 },
          committedRngBefore: predecessorSnapshot.rng,
        },
      ]);
    } finally {
      await successor.dispose();
    }
  });

  it("reconciles the exact adopted Snapshot through one ordinary replayable command", async () => {
    const records = createMemoryHostRecordStoreV1();
    const predecessor = await createInstanceV1({ records, seeds: [77] });
    await predecessor.semantic.dispatch(incrementV1);
    await predecessor.semantic.dispatch(incrementV1);
    const predecessorSnapshot = predecessor.admin.inspectForTest().snapshot;
    const predecessorDigest = predecessor.admin.stateDigest();
    const handoff = await disposeCoreGameApplicationForRebootstrapInternalV1(predecessor);
    const projectRebootstrapCommand = vi.fn(
      (snapshot: DeepReadonly<SyntheticSnapshotV1>, resolved: unknown) => {
        expect(canonicalJsonBytes(snapshot)).toEqual(canonicalJsonBytes(predecessorSnapshot));
        expect(resolved).toBe(application.resolved);
        return Object.freeze({ kind: "synthetic.increment" as const });
      },
    );
    const application = resolvedApplicationWithRebootstrapProjectorV1(
      projectRebootstrapCommand,
    );

    const successor = await createCoreGameApplicationInstanceForRebootstrapInternalV1(
      application,
      {
        host: hostServicesV1(records, [83]),
        handoff,
        onRebootstrapStartFailureInternal: () => undefined,
      },
    );
    try {
      expect(projectRebootstrapCommand).toHaveBeenCalledOnce();
      expect(successor.admin.inspectForTest().snapshot).toMatchObject({
        state: { simulation: { counter: { count: 3 } } },
        commandSequence: 3,
      });
      expect(successor.admin.commandLog()).toMatchObject([
        {
          source: "game",
          command: { kind: "synthetic.increment" },
          preStateDigest: predecessorDigest,
          commandSequence: { before: 2, after: 3 },
          outcome: { kind: "committed" },
        },
      ]);
      await expect(successor.admin.replayAuthoritatively()).resolves.toMatchObject({
        authoritative: true,
        identityMatch: true,
        matches: true,
        executedEntries: 1,
      });
      await successor.autoSaveIdle();
      await expect(storedAutoCurrentV1(records)).resolves.toMatchObject({
        snapshot: {
          state: { simulation: { counter: { count: 3 } } },
          commandSequence: 3,
        },
      });
    } finally {
      await successor.dispose();
    }
  });

  it("does not project on ordinary boot and accepts a null rebootstrap projection", async () => {
    const records = createMemoryHostRecordStoreV1();
    const projectRebootstrapCommand = vi.fn(
      (_snapshot: DeepReadonly<SyntheticSnapshotV1>, _resolved: unknown) => null,
    );
    const application = resolvedApplicationWithRebootstrapProjectorV1(
      projectRebootstrapCommand,
    );
    const predecessor = await createCoreGameApplicationInstanceV1(application, {
      host: hostServicesV1(records, [77]),
    });
    expect(projectRebootstrapCommand).not.toHaveBeenCalled();
    const predecessorSnapshot = predecessor.admin.inspectForTest().snapshot;
    const handoff = await disposeCoreGameApplicationForRebootstrapInternalV1(predecessor);

    const successor = await createCoreGameApplicationInstanceForRebootstrapInternalV1(
      application,
      {
        host: hostServicesV1(records, [83]),
        handoff,
        onRebootstrapStartFailureInternal: () => undefined,
      },
    );
    try {
      expect(projectRebootstrapCommand).toHaveBeenCalledOnce();
      expect(canonicalJsonBytes(successor.admin.inspectForTest().snapshot)).toEqual(
        canonicalJsonBytes(predecessorSnapshot),
      );
      expect(successor.admin.commandLog()).toEqual([]);
    } finally {
      await successor.dispose();
    }
  });

  it.each(["rejected command", "throwing projector"] as const)(
    "returns a retryable latest handoff after a %s",
    async (failureKind) => {
      const records = createMemoryHostRecordStoreV1();
      const predecessor = await createInstanceV1({ records, seeds: [77] });
      await predecessor.semantic.dispatch(incrementV1);
      const predecessorSnapshot = predecessor.admin.inspectForTest().snapshot;
      const firstHandoff = await disposeCoreGameApplicationForRebootstrapInternalV1(predecessor);
      const projectionFailure = new Error("synthetic rebootstrap projection failure");
      const projectRebootstrapCommand = vi.fn(
        (snapshot: DeepReadonly<SyntheticSnapshotV1>, _resolved: unknown) => {
          expect(canonicalJsonBytes(snapshot)).toEqual(canonicalJsonBytes(predecessorSnapshot));
          if (failureKind === "throwing projector") throw projectionFailure;
          return Object.freeze({ kind: "synthetic.reject" as const });
        },
      );
      let retryHandoff: DeepReadonly<CoreRebootstrapHandoffInternalV1> | undefined;
      const construction = createCoreGameApplicationInstanceForRebootstrapInternalV1(
        resolvedApplicationWithRebootstrapProjectorV1(projectRebootstrapCommand),
        {
          host: hostServicesV1(records, [83]),
          handoff: firstHandoff,
          onRebootstrapStartFailureInternal(outcome) {
            if (outcome.kind === "ready") retryHandoff = outcome.handoff;
          },
        },
      );
      if (failureKind === "throwing projector") {
        await expect(construction).rejects.toBe(projectionFailure);
      } else {
        await expect(construction).rejects.toThrow("core.rebootstrap_reconcile_not_committed");
      }
      expect(projectRebootstrapCommand).toHaveBeenCalledOnce();
      expect(retryHandoff).toMatchObject({
        save: { mediaType: "application/json" },
        lease: { fencingToken: 2 },
      });
      if (retryHandoff === undefined) throw new TypeError("missing retry handoff");

      const retry = await createCoreGameApplicationInstanceForRebootstrapInternalV1(
        resolvedApplicationV1(),
        {
          host: hostServicesV1(records, [89]),
          handoff: retryHandoff,
          onRebootstrapStartFailureInternal: () => undefined,
        },
      );
      try {
        expect(canonicalJsonBytes(retry.admin.inspectForTest().snapshot)).toEqual(
          canonicalJsonBytes(predecessorSnapshot),
        );
        expect(retry.admin.commandLog()).toEqual([]);
        await expect(retry.persistence.lease.getStatus()).resolves.toMatchObject({
          kind: "owned",
          fencingToken: 3,
        });
      } finally {
        await retry.dispose();
      }
    },
  );

  it("returns the latest Save and fence when construction fails after authoritative adoption", async () => {
    const records = createMemoryHostRecordStoreV1();
    const predecessor = await createInstanceV1({ records, seeds: [77] });
    await predecessor.semantic.dispatch(incrementV1);
    await predecessor.semantic.dispatch(incrementV1);
    const predecessorSnapshot = predecessor.admin.inspectForTest().snapshot;
    const firstHandoff = await disposeCoreGameApplicationForRebootstrapInternalV1(predecessor);
    const constructionFailure = new Error("synthetic post-adoption extension failure");
    let retryHandoff: DeepReadonly<CoreRebootstrapHandoffInternalV1> | undefined;

    await expect(
      createCoreGameApplicationInstanceForRebootstrapInternalV1(
        resolvedApplicationWithExtensionFailureV1(constructionFailure),
        {
          host: hostServicesV1(records, [83]),
          handoff: firstHandoff,
          onRebootstrapStartFailureInternal(outcome) {
            if (outcome.kind === "ready") retryHandoff = outcome.handoff;
          },
        },
      ),
    ).rejects.toBe(constructionFailure);
    expect(retryHandoff).toMatchObject({
      save: { mediaType: "application/json" },
      lease: { fencingToken: 2 },
    });
    if (retryHandoff === undefined) throw new TypeError("missing retry handoff");

    const retry = await createCoreGameApplicationInstanceForRebootstrapInternalV1(
      resolvedApplicationV1(),
      {
        host: hostServicesV1(records, [89]),
        handoff: retryHandoff,
        onRebootstrapStartFailureInternal: () => undefined,
      },
    );
    try {
      expect(canonicalJsonBytes(retry.admin.inspectForTest().snapshot)).toEqual(
        canonicalJsonBytes(predecessorSnapshot),
      );
      await expect(retry.persistence.lease.getStatus()).resolves.toMatchObject({
        kind: "owned",
        fencingToken: 3,
      });
    } finally {
      await retry.dispose();
    }
  });

  it("rejects rebootstrap disposal when its lease cannot produce a released handoff", async () => {
    const lease = leaseReleaseRecordsV1({ rejectRelease: true });
    const predecessor = await createInstanceV1({ records: lease.records });
    await predecessor.semantic.dispatch(incrementV1);
    await expect(disposeCoreGameApplicationForRebootstrapInternalV1(predecessor)).rejects.toThrow(
      "persistence.rebootstrap_lease_release_failed",
    );
  });

  it("publishes one disposal Promise before cleanup reentry and still releases persistence", async () => {
    const lease = leaseReleaseRecordsV1();
    const cleanupError = new Error("synthetic extension cleanup failure");
    let cleanupCalls = 0;
    let reentrantDisposal:
      | Promise<DeepReadonly<CoreRebootstrapHandoffInternalV1>>
      | undefined;
    let instance: Awaited<ReturnType<typeof createInstanceV1>> | undefined;
    const application = resolvedApplicationWithDisposeV1(() => {
      cleanupCalls += 1;
      if (instance === undefined) throw new TypeError("disposal fixture instance missing");
      reentrantDisposal = disposeCoreGameApplicationForRebootstrapInternalV1(instance);
      throw cleanupError;
    });
    instance = await createCoreGameApplicationInstanceV1(application, {
      host: hostServicesV1(lease.records),
    });

    const disposal = disposeCoreGameApplicationForRebootstrapInternalV1(instance);
    expect(reentrantDisposal).toBe(disposal);
    expect(disposeCoreGameApplicationForRebootstrapInternalV1(instance)).toBe(disposal);
    await expect(disposal).resolves.toMatchObject({
      save: { mediaType: "application/json" },
      lease: { ownerId: ownerIdV1, fencingToken: 1 },
    });
    expect(cleanupCalls).toBe(1);
    expect(lease.releaseAttempts()).toBe(1);
    expect(
      instance.diagnostics.runtimeFailures().filter((failure) =>
        failure.message === cleanupError.message
      ),
    ).toHaveLength(1);
  });

  it("keeps the Persistence disposal failure primary when cleanup and lease release both fail", async () => {
    const lease = leaseReleaseRecordsV1({ rejectRelease: true });
    const cleanupError = new Error("synthetic extension cleanup failure");
    let cleanupCalls = 0;
    const application = resolvedApplicationWithDisposeV1(() => {
      cleanupCalls += 1;
      throw cleanupError;
    });
    const instance = await createCoreGameApplicationInstanceV1(application, {
      host: hostServicesV1(lease.records),
    });

    const disposal = disposeCoreGameApplicationForRebootstrapInternalV1(instance);
    await expect(disposal).rejects.toThrow("persistence.rebootstrap_lease_release_failed");
    expect(disposeCoreGameApplicationForRebootstrapInternalV1(instance)).toBe(disposal);
    expect(cleanupCalls).toBe(1);
    expect(lease.releaseAttempts()).toBe(1);
    expect(
      instance.diagnostics.runtimeFailures().filter((failure) =>
        failure.message === cleanupError.message
      ),
    ).toHaveLength(1);
  });

  it("fences both mutation ingresses before a throwing timer cancellation and releases the lease", async () => {
    const lease = leaseReleaseRecordsV1();
    const cancellationError = new Error("synthetic autosave cancellation failure");
    let cancellationCalls = 0;
    let reentrantDispatch:
      | ReturnType<Awaited<ReturnType<typeof createInstanceV1>>["semantic"]["dispatch"]>
      | undefined;
    let reentrantClear:
      | ReturnType<Awaited<ReturnType<typeof createInstanceV1>>["persistence"]["clear"]>
      | undefined;
    let timerInstance: Awaited<ReturnType<typeof createInstanceV1>> | undefined;
    const scheduler: CoreSchedulerV1 = Object.freeze({
      schedule: () => () => {
        cancellationCalls += 1;
        if (timerInstance === undefined) throw new TypeError("timer fixture instance missing");
        expect(timerInstance.semantic.observe().status).toBe("hmr_invalidated");
        reentrantDispatch = timerInstance.semantic.dispatch(incrementV1);
        reentrantClear = timerInstance.persistence.clear("auto.current");
        throw cancellationError;
      },
    });
    const instance = await createInstanceV1({
      records: lease.records,
      autosave: { mode: "debounced", delayMs: 1_000 },
      scheduler,
    });
    timerInstance = instance;
    await instance.semantic.dispatch(incrementV1);

    expect(() => invalidateCoreGameApplicationForHmrInternalV1(instance)).not.toThrow();
    await expect(reentrantDispatch).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    await expect(reentrantClear).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    await expect(instance.semantic.dispatch(incrementV1)).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    await expect(instance.persistence.clear("auto.current")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    await expect(disposeCoreGameApplicationForRebootstrapInternalV1(instance)).resolves
      .toMatchObject({
        save: { mediaType: "application/json" },
        lease: { ownerId: ownerIdV1, fencingToken: 1 },
      });
    expect(cancellationCalls).toBe(1);
    expect(lease.releaseAttempts()).toBe(1);
    expect(
      instance.diagnostics.runtimeFailures().filter((failure) =>
        failure.message === cancellationError.message
      ),
    ).toHaveLength(1);
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

    invalidateCoreGameApplicationForHmrInternalV1(instance);
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

describe("stage cue dispatch batches", () => {
  it("stamps the latest commit's dispatches with its exact revision and epoch", async () => {
    let projection: "cue" | "open" | "invalid" | "throwing" = "cue";
    const adapter = Object.freeze({
      ...adapterV1,
      projectStageCueDispatches: (events: readonly { readonly count: number }[]) => {
        if (projection === "throwing") throw new Error("synthetic dispatch projection failure");
        if (projection === "invalid") {
          return [{ sceneId: "not-a-scene-id", cueId: "cue.test.counter.tick" }];
        }
        if (projection === "open") return [{ sceneId: "scene.test.counter", open: true as const }];
        return events.map(() => ({
          sceneId: "scene.test.counter",
          cueId: "cue.test.counter.tick",
        }));
      },
    });
    const definition = defineCoreGameApplicationV1({
      entry: createSyntheticCounterGamePackageV1(),
      semantic: adapter as unknown as CoreSemanticAdapterV1<
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
    if (resolved.kind !== "resolved") throw new Error("dispatch fixture must resolve");
    const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
      // Two entropy draws: bootstrap plus the restart at the end.
      host: hostServicesV1(createMemoryHostRecordStoreV1(), [77, 83]),
    });

    // No commit yet: no context.
    expect(instance.stageCueDispatches()).toBeNull();

    await instance.semantic.dispatch(incrementV1);
    const batch = instance.stageCueDispatches();
    expect(batch).toEqual({
      revision: instance.semantic.observe().revision,
      epoch: instance.presentationAnchor().epoch,
      dispatches: [{ sceneId: "scene.test.counter", cueId: "cue.test.counter.tick" }],
    });

    // A rejected command commits nothing and leaves the batch untouched.
    await instance.semantic.dispatch(rejectV1);
    expect(instance.stageCueDispatches()).toBe(batch);

    // The next commit replaces the batch (open form, one revision later).
    projection = "open";
    await instance.semantic.dispatch(incrementV1);
    const openBatch = instance.stageCueDispatches();
    expect(openBatch).toEqual({
      revision: instance.semantic.observe().revision,
      epoch: instance.presentationAnchor().epoch,
      dispatches: [{ sceneId: "scene.test.counter", open: true }],
    });
    expect(openBatch?.revision).toBe((batch?.revision ?? 0) + 1);

    // Invalid and throwing projections drop the context (fail-open) and
    // surface as observer faults; the stale batch no longer pairs.
    const faultsBefore = instance.diagnostics.runtimeFailures().length;
    projection = "invalid";
    await instance.semantic.dispatch(incrementV1);
    expect(instance.stageCueDispatches()).toBe(openBatch);
    projection = "throwing";
    await instance.semantic.dispatch(incrementV1);
    expect(instance.stageCueDispatches()).toBe(openBatch);
    expect(instance.diagnostics.runtimeFailures().length).toBe(faultsBefore + 2);
    expect(instance.stageCueDispatches()?.revision).not.toBe(
      instance.semantic.observe().revision,
    );

    // Anchor replacement (restart) advances the epoch and clears the batch.
    projection = "cue";
    await instance.semantic.dispatch(incrementV1);
    expect(instance.stageCueDispatches()).not.toBeNull();
    const epochBefore = instance.presentationAnchor().epoch;
    await expect(instance.lifecycle.restart()).resolves.toMatchObject({ kind: "anchored" });
    expect(instance.presentationAnchor().epoch).toBe(epochBefore + 1);
    expect(instance.stageCueDispatches()).toBeNull();
    await instance.dispose();
  });

  it("stamps the batch before semantic subscribers observe the commit's publication", async () => {
    // Hosts flush React synchronously inside the publication notification,
    // so the batch must already pair when the FIRST notification carrying
    // the committed revision reaches any later subscriber — stamping after
    // the dispatch promise resolves would present the commit context-free.
    const adapter = Object.freeze({
      ...adapterV1,
      projectStageCueDispatches: (events: readonly { readonly count: number }[]) =>
        events.map(() => ({ sceneId: "scene.test.counter", cueId: "cue.test.counter.tick" })),
    });
    const definition = defineCoreGameApplicationV1({
      entry: createSyntheticCounterGamePackageV1(),
      semantic: adapter as unknown as CoreSemanticAdapterV1<
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
    if (resolved.kind !== "resolved") throw new Error("dispatch fixture must resolve");
    const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
      host: hostServicesV1(createMemoryHostRecordStoreV1(), [77]),
    });

    const seen: { readonly revision: number; readonly batchRevision: number | null }[] = [];
    const unsubscribe = instance.semantic.subscribe(() => {
      seen.push({
        revision: instance.semantic.observe().revision as number,
        batchRevision: instance.stageCueDispatches()?.revision ?? null,
      });
    });
    await instance.semantic.dispatch(incrementV1);
    unsubscribe();

    const committedRevision = instance.semantic.observe().revision as number;
    const commitNotifications = seen.filter((entry) => entry.revision === committedRevision);
    expect(commitNotifications.length).toBeGreaterThan(0);
    for (const entry of commitNotifications) {
      expect(entry.batchRevision).toBe(committedRevision);
    }
    await instance.dispose();
  });
});
