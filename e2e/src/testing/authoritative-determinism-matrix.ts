// SPDX-License-Identifier: MIT
import {
  authoritativeDeterminismTranscriptCommandClassesV1,
} from "@sillymaker/base/testkit/authoritative-determinism";
import type {
  AuthoritativeDeterminismCommandClassV1,
} from "@sillymaker/base/testkit/authoritative-determinism";
import {
  authoritativeOrderingVectorExpectedV1,
  evaluateDeterminismSaveSummaryProjectionV1,
  evaluatePersistenceUtcAdmissionVectorsV1,
  evaluateSaveMetadataCompactVectorsV1,
  persistenceUtcAdmissionExpectedV1,
  runAuthoritativeOrderingVectorsV1,
  saveMetadataCompactExpectedV1,
} from "@sillymaker/base/testkit/determinism-vectors";

import {
  collectAuthoritativeDeterminismTranscriptTraceV1,
} from "./authoritative-determinism-driver.ts";
import type { AuthoritativeDeterminismCommandTraceV1 } from "./authoritative-determinism-driver.ts";

const transcriptRngSeedV1 = 1_236_431_772;
const exclusiveMaxV1 = 7 as const;

interface AuthoritativeDeterminismReplayTraceV1 {
  readonly authoritative: boolean;
  readonly identityMatch: boolean;
  readonly visualMatch: boolean;
  readonly matches: boolean;
  readonly executedEntries: number;
  readonly mismatches: readonly unknown[];
}

export interface AuthoritativeDeterminismMatrixCommandV1 {
  readonly ordinal: number;
  readonly input: {
    readonly command: { readonly kind: AuthoritativeDeterminismCommandClassV1 };
    readonly rngSeed: number;
    readonly exclusiveMax: 7;
  };
  readonly trace: AuthoritativeDeterminismCommandTraceV1;
}

export interface AuthoritativeDeterminismMatrixV1 {
  readonly schemaVersion: 1;
  readonly transcript: {
    readonly workload: "authoritative-determinism-parity-v1";
    readonly commands: readonly AuthoritativeDeterminismMatrixCommandV1[];
    readonly replay: AuthoritativeDeterminismReplayTraceV1;
  };
  readonly authoritativeOrdering: unknown;
  readonly persistenceUtcAdmission: unknown;
  readonly saveMetadata: {
    readonly summaryProjection: readonly string[] | null;
    readonly compact: unknown;
  };
}

export interface AuthoritativeDeterminismMatrixDivergenceV1 {
  readonly project: string;
  readonly repeat: number;
  readonly vector: string;
  readonly commandOrdinal: number | null;
  readonly commandIdentity: string | null;
  readonly sequence: { readonly before: number; readonly after: number } | null;
  readonly pointer: string;
  readonly expected: unknown;
  readonly actual: unknown;
}

const replayExpectedV1: AuthoritativeDeterminismReplayTraceV1 = Object.freeze({
  authoritative: true,
  identityMatch: true,
  visualMatch: false,
  matches: true,
  executedEntries: 4,
  mismatches: Object.freeze([]),
});

const rejectionSamplingInitialRngV1 = Object.freeze([1_236_431_772, 0] as const);
const rejectionSamplingRejectedRngV1 = Object.freeze([4_294_967_292, 1] as const);
const rejectionSamplingCommittedRngV1 = Object.freeze([1_015_932, 2] as const);
const faultCandidateRngV1 = Object.freeze([4_027_545_596, 3] as const);
const initialDigestV1 = "sha256:ba95cd444da04d33e163b1bb59024883a84838dd276668b2105d14c66b4bbf27";
const noDrawDigestV1 = "sha256:ee9ec04cede40586fe22ac82a54c3dc31ddad47a888bb963cbdf6fad6a97665d";
const rngCommittedDigestV1 =
  "sha256:a69c2ff76d07348a5bff1f2e2b2de247d69780a417b345f9838bfb021012f165";
const noDrawOutcomeV1 = Object.freeze({
  kind: "committed" as const,
  facts: Object.freeze([
    Object.freeze({
      kind: "determinism.committed" as const,
      commandClass: "no_draw_committed" as const,
      result: null,
    }),
  ]),
});
const rejectedOutcomeV1 = Object.freeze({
  kind: "rejected" as const,
  reasons: Object.freeze([Object.freeze({ code: "determinism.rejected" as const })]),
});
const rngCommittedOutcomeV1 = Object.freeze({
  kind: "committed" as const,
  facts: Object.freeze([
    Object.freeze({
      kind: "determinism.committed" as const,
      commandClass: "rng_committed" as const,
      result: 1,
    }),
  ]),
});
const faultedOutcomeV1 = Object.freeze({
  kind: "faulted" as const,
  fault: Object.freeze({ code: "determinism.faulted" as const }),
});

const rejectionSamplingDrawsV1 = Object.freeze([
  Object.freeze({
    ordinal: 1,
    purpose: "check:determinism.workload",
    exclusiveMax: exclusiveMaxV1,
    result: 0,
    before: rejectionSamplingInitialRngV1,
    after: rejectionSamplingRejectedRngV1,
  }),
  Object.freeze({
    ordinal: 2,
    purpose: "check:determinism.workload",
    exclusiveMax: exclusiveMaxV1,
    result: 1,
    before: rejectionSamplingRejectedRngV1,
    after: rejectionSamplingCommittedRngV1,
  }),
]);
const faultDrawsV1 = Object.freeze([
  Object.freeze({
    ordinal: 1,
    purpose: "check:determinism.workload",
    exclusiveMax: exclusiveMaxV1,
    result: 4,
    before: rejectionSamplingCommittedRngV1,
    after: faultCandidateRngV1,
  }),
]);

function matrixCommandV1(
  ordinal: number,
  trace: AuthoritativeDeterminismCommandTraceV1,
): AuthoritativeDeterminismMatrixCommandV1 {
  return Object.freeze({
    ordinal,
    input: Object.freeze({
      command: Object.freeze({ kind: trace.command.kind }),
      rngSeed: transcriptRngSeedV1,
      exclusiveMax: exclusiveMaxV1,
    }),
    trace,
  });
}

const transcriptTraceExpectedV1 = Object.freeze(
  [
    Object.freeze({
      command: Object.freeze({ kind: "no_draw_committed" as const }),
      dispatch: "executed" as const,
      outcome: noDrawOutcomeV1,
      status: "ready" as const,
      snapshot: Object.freeze({
        retained: false,
        digests: Object.freeze({ before: initialDigestV1, after: noDrawDigestV1 }),
        sequence: Object.freeze({ before: 0, after: 1 }),
      }),
      rng: Object.freeze({
        committedBefore: rejectionSamplingInitialRngV1,
        attemptedDraws: Object.freeze([]),
        candidateAfter: rejectionSamplingInitialRngV1,
        committedAfter: rejectionSamplingInitialRngV1,
      }),
      log: Object.freeze({ source: "game" as const, ordinal: 1, outcome: noDrawOutcomeV1 }),
    }),
    Object.freeze({
      command: Object.freeze({ kind: "rejected" as const }),
      dispatch: "executed" as const,
      outcome: rejectedOutcomeV1,
      status: "ready" as const,
      snapshot: Object.freeze({
        retained: true,
        digests: Object.freeze({ before: noDrawDigestV1, after: noDrawDigestV1 }),
        sequence: Object.freeze({ before: 1, after: 1 }),
      }),
      rng: Object.freeze({
        committedBefore: rejectionSamplingInitialRngV1,
        attemptedDraws: rejectionSamplingDrawsV1,
        candidateAfter: rejectionSamplingCommittedRngV1,
        committedAfter: rejectionSamplingInitialRngV1,
      }),
      log: Object.freeze({ source: "game" as const, ordinal: 2, outcome: rejectedOutcomeV1 }),
    }),
    Object.freeze({
      command: Object.freeze({ kind: "rng_committed" as const }),
      dispatch: "executed" as const,
      outcome: rngCommittedOutcomeV1,
      status: "ready" as const,
      snapshot: Object.freeze({
        retained: false,
        digests: Object.freeze({ before: noDrawDigestV1, after: rngCommittedDigestV1 }),
        sequence: Object.freeze({ before: 1, after: 2 }),
      }),
      rng: Object.freeze({
        committedBefore: rejectionSamplingInitialRngV1,
        attemptedDraws: rejectionSamplingDrawsV1,
        candidateAfter: rejectionSamplingCommittedRngV1,
        committedAfter: rejectionSamplingCommittedRngV1,
      }),
      log: Object.freeze({
        source: "game" as const,
        ordinal: 3,
        outcome: rngCommittedOutcomeV1,
      }),
    }),
    Object.freeze({
      command: Object.freeze({ kind: "faulted" as const }),
      dispatch: "executed" as const,
      outcome: faultedOutcomeV1,
      status: "fault_paused" as const,
      snapshot: Object.freeze({
        retained: true,
        digests: Object.freeze({ before: rngCommittedDigestV1, after: rngCommittedDigestV1 }),
        sequence: Object.freeze({ before: 2, after: 2 }),
      }),
      rng: Object.freeze({
        committedBefore: rejectionSamplingCommittedRngV1,
        attemptedDraws: faultDrawsV1,
        candidateAfter: faultCandidateRngV1,
        committedAfter: rejectionSamplingCommittedRngV1,
      }),
      log: Object.freeze({ source: "game" as const, ordinal: 4, outcome: faultedOutcomeV1 }),
    }),
  ] satisfies readonly AuthoritativeDeterminismCommandTraceV1[],
);

export const authoritativeDeterminismMatrixExpectedV1: AuthoritativeDeterminismMatrixV1 = Object
  .freeze({
    schemaVersion: 1,
    transcript: Object.freeze({
      workload: "authoritative-determinism-parity-v1",
      commands: Object.freeze([
        ...transcriptTraceExpectedV1.map((trace, index) => matrixCommandV1(index + 1, trace)),
      ]),
      replay: replayExpectedV1,
    }),
    authoritativeOrdering: authoritativeOrderingVectorExpectedV1,
    persistenceUtcAdmission: persistenceUtcAdmissionExpectedV1,
    saveMetadata: Object.freeze({
      summaryProjection: saveMetadataCompactExpectedV1.summaries.valid,
      compact: saveMetadataCompactExpectedV1,
    }),
  });

function compactReplayV1(value: AuthoritativeDeterminismReplayTraceV1) {
  return Object.freeze({
    authoritative: value.authoritative,
    identityMatch: value.identityMatch,
    visualMatch: value.visualMatch,
    matches: value.matches,
    executedEntries: value.executedEntries,
    mismatches: Object.freeze([...value.mismatches]),
  });
}

/** Collects the DET4 transcript plus the existing DET2e and M0a pure vectors. */
export async function collectAuthoritativeDeterminismMatrixV1(): Promise<
  AuthoritativeDeterminismMatrixV1
> {
  const transcript = await collectAuthoritativeDeterminismTranscriptTraceV1({
    schemaVersion: 1,
    rngSeed: transcriptRngSeedV1,
  });
  if (transcript.commands.length !== authoritativeDeterminismTranscriptCommandClassesV1.length) {
    throw new TypeError("Authoritative determinism transcript command count changed");
  }
  const commands = transcript.commands.map((trace, index) => {
    if (trace.command.kind !== authoritativeDeterminismTranscriptCommandClassesV1[index]) {
      throw new TypeError("Authoritative determinism transcript command order changed");
    }
    return matrixCommandV1(index + 1, trace);
  });

  const summaryProjection = evaluateDeterminismSaveSummaryProjectionV1({
    state: Object.freeze({ checkpoint: 7, scene: "Neutral scene" }),
    summarizeSave(state) {
      return Object.freeze([`Checkpoint ${String(state.checkpoint)}`, state.scene]);
    },
  });
  return Object.freeze({
    schemaVersion: 1,
    transcript: Object.freeze({
      workload: "authoritative-determinism-parity-v1",
      commands: Object.freeze(commands),
      replay: compactReplayV1(transcript.replay),
    }),
    authoritativeOrdering: await runAuthoritativeOrderingVectorsV1(),
    persistenceUtcAdmission: evaluatePersistenceUtcAdmissionVectorsV1(),
    saveMetadata: Object.freeze({
      summaryProjection,
      compact: evaluateSaveMetadataCompactVectorsV1(),
    }),
  });
}

function escapeJsonPointerTokenV1(token: string): string {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

interface JsonDivergenceV1 {
  readonly pointer: string;
  readonly expected: unknown;
  readonly actual: unknown;
}

const missingJsonValueV1 = Object.freeze({ kind: "missing" as const });

function firstJsonDivergenceV1(
  expected: unknown,
  actual: unknown,
  pointer = "",
): JsonDivergenceV1 | null {
  if (Object.is(expected, actual)) return null;
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      return Object.freeze({ pointer, expected, actual });
    }
    const sharedLength = Math.min(expected.length, actual.length);
    for (let index = 0; index < sharedLength; index += 1) {
      const difference = firstJsonDivergenceV1(
        expected[index],
        actual[index],
        `${pointer}/${String(index)}`,
      );
      if (difference !== null) return difference;
    }
    if (expected.length !== actual.length) {
      return Object.freeze({
        pointer: `${pointer}/${String(sharedLength)}`,
        expected: sharedLength < expected.length ? expected[sharedLength] : missingJsonValueV1,
        actual: sharedLength < actual.length ? actual[sharedLength] : missingJsonValueV1,
      });
    }
    return null;
  }
  if (
    typeof expected === "object" && expected !== null &&
    typeof actual === "object" && actual !== null
  ) {
    const expectedRecord = expected as Readonly<Record<string, unknown>>;
    const actualRecord = actual as Readonly<Record<string, unknown>>;
    const expectedKeys = Object.keys(expectedRecord);
    const actualKeys = Object.keys(actualRecord);
    const sharedLength = Math.min(expectedKeys.length, actualKeys.length);
    for (let index = 0; index < sharedLength; index += 1) {
      const expectedKey = expectedKeys[index] as string;
      const actualKey = actualKeys[index] as string;
      if (expectedKey !== actualKey) {
        return Object.freeze({ pointer, expected: expectedKeys, actual: actualKeys });
      }
      const difference = firstJsonDivergenceV1(
        expectedRecord[expectedKey],
        actualRecord[actualKey],
        `${pointer}/${escapeJsonPointerTokenV1(expectedKey)}`,
      );
      if (difference !== null) return difference;
    }
    if (expectedKeys.length !== actualKeys.length) {
      const key = (expectedKeys[sharedLength] ?? actualKeys[sharedLength]) as string;
      return Object.freeze({
        pointer: `${pointer}/${escapeJsonPointerTokenV1(key)}`,
        expected: Object.hasOwn(expectedRecord, key) ? expectedRecord[key] : missingJsonValueV1,
        actual: Object.hasOwn(actualRecord, key) ? actualRecord[key] : missingJsonValueV1,
      });
    }
    return null;
  }
  return Object.freeze({ pointer, expected, actual });
}

function recordValueV1(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function commandVectorV1(root: unknown): readonly unknown[] | null {
  const transcript = recordValueV1(recordValueV1(root)?.transcript);
  return Array.isArray(transcript?.commands) ? transcript.commands : null;
}

function commandContextFromVectorV1(
  commands: readonly unknown[],
  index: number,
  fallbackOrdinal = index + 1,
) {
  const command = recordValueV1(commands[index]);
  const input = recordValueV1(command?.input);
  const commandInput = recordValueV1(input?.command);
  const trace = recordValueV1(command?.trace);
  const snapshot = recordValueV1(trace?.snapshot);
  const sequence = recordValueV1(snapshot?.sequence);
  const before = sequence?.before;
  const after = sequence?.after;
  return Object.freeze({
    commandOrdinal: typeof command?.ordinal === "number" ? command.ordinal : fallbackOrdinal,
    commandIdentity: typeof commandInput?.kind === "string" ? commandInput.kind : null,
    sequence: typeof before === "number" && typeof after === "number"
      ? Object.freeze({ before, after })
      : null,
  });
}

function replayEntryMismatchOrdinalV1(root: unknown): number | null {
  const transcript = recordValueV1(recordValueV1(root)?.transcript);
  const replay = recordValueV1(transcript?.replay);
  if (!Array.isArray(replay?.mismatches)) return null;
  for (const value of replay.mismatches) {
    const mismatch = recordValueV1(value);
    const ordinal = mismatch?.logOrdinal;
    if (
      mismatch?.scope === "entry" && typeof ordinal === "number" &&
      Number.isSafeInteger(ordinal) && ordinal > 0
    ) {
      return ordinal;
    }
  }
  return null;
}

function commandContextV1(expected: unknown, actual: unknown, pointer: string) {
  const match = /^\/transcript\/commands\/(\d+)(?:\/|$)/u.exec(pointer);
  if (match !== null) {
    const index = Number(match[1]);
    const commands = commandVectorV1(expected) ?? commandVectorV1(actual);
    return commands === null
      ? Object.freeze({ commandOrdinal: index + 1, commandIdentity: null, sequence: null })
      : commandContextFromVectorV1(commands, index);
  }
  if (pointer === "/transcript/replay" || pointer.startsWith("/transcript/replay/")) {
    const ordinal = replayEntryMismatchOrdinalV1(actual) ?? replayEntryMismatchOrdinalV1(expected);
    if (ordinal !== null) {
      for (const root of [expected, actual]) {
        const commands = commandVectorV1(root);
        if (commands === null) continue;
        const index = commands.findIndex(
          (value) => recordValueV1(value)?.ordinal === ordinal,
        );
        const resolvedIndex = index >= 0 ? index : ordinal - 1;
        if (commands[resolvedIndex] !== undefined) {
          return commandContextFromVectorV1(commands, resolvedIndex, ordinal);
        }
      }
    }
  }
  return Object.freeze({ commandOrdinal: null, commandIdentity: null, sequence: null });
}

/** Returns the first exact JSON divergence, enriched with DET4 runtime/command context. */
export function compareAuthoritativeDeterminismMatrixV1(input: {
  readonly project: string;
  readonly repeat: number;
  readonly expected: unknown;
  readonly actual: unknown;
}): AuthoritativeDeterminismMatrixDivergenceV1 | null {
  const difference = firstJsonDivergenceV1(input.expected, input.actual);
  if (difference === null) return null;
  const context = commandContextV1(input.expected, input.actual, difference.pointer);
  const vector = difference.pointer.split("/")[1] || "root";
  return Object.freeze({
    project: input.project,
    repeat: input.repeat,
    vector,
    commandOrdinal: context.commandOrdinal,
    commandIdentity: context.commandIdentity,
    sequence: context.sequence,
    pointer: difference.pointer || "/",
    expected: difference.expected,
    actual: difference.actual,
  });
}
