// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { CanonicalJsonError, canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { digestBytes } from "../contracts/digest.ts";
import {
  authoritativeDeterminismCommandClassesV1,
  authoritativeDeterminismDrawPurposeV1,
  prepareAuthoritativeDeterminismWorkloadV1,
} from "./index.ts";
import type {
  AuthoritativeDeterminismCommandClassV1,
  AuthoritativeDeterminismWorkCountsV1,
} from "./index.ts";
import { createUnsafeAuthoritativeDeterminismWorkloadV1 } from "./authoritative-determinism-workload.ts";

const initialRngV1 = Object.freeze({
  algorithm: "xorshift32-v1" as const,
  cursor: 97,
  rawDrawCount: 0,
});
const drawnRngV1 = Object.freeze({
  algorithm: "xorshift32-v1" as const,
  cursor: 25_701_511,
  rawDrawCount: 1,
});
const drawTraceV1 = Object.freeze({
  ordinal: 1,
  purpose: authoritativeDeterminismDrawPurposeV1,
  exclusiveMax: 7,
  result: 3,
  before: initialRngV1,
  after: drawnRngV1,
});

// Derived by running this exact neutral Session transcript against the
// S0-complete production source at 96a0a93. The expected bytes never call the
// canonical helper under test.
const s0CompleteRngCommitGoldenV1 = Object.freeze({
  dispatchResult: Object.freeze({
    byteLength: 351,
    bytesDigest: "sha256:4af2e55854e0b159e52e15d9d0746fb9f386326672802c04e49a3a6a4b307632",
  }),
  snapshot: Object.freeze({
    byteLength: 202,
    bytesDigest: "sha256:4dea43d8d13fc2c044a8c0e05dd2ba98ffb0f75506ca0e3d3b85cf02095e313a",
  }),
  commandLog: Object.freeze({
    byteLength: 900,
    bytesDigest: "sha256:d9d5f751b390c1b3ef5ec45b3ed0d1ffd2b7a54d4d03e9ced17b4d6a802100c5",
  }),
});

function byteEvidenceV1(value: unknown) {
  const bytes = canonicalJsonBytes(value);
  return Object.freeze({
    byteLength: bytes.byteLength,
    bytesDigest: digestBytes(bytes),
  });
}

interface ExpectedRngStateV1 {
  readonly algorithm: "xorshift32-v1";
  readonly cursor: number;
  readonly rawDrawCount: number;
}

interface ExpectedRngDrawTraceV1 {
  readonly ordinal: number;
  readonly purpose: string;
  readonly exclusiveMax: number;
  readonly result: number;
  readonly before: ExpectedRngStateV1;
  readonly after: ExpectedRngStateV1;
}

function countsV1(input: {
  readonly committed: boolean;
  readonly log: boolean;
  readonly commandAdmission?: boolean;
  readonly evidenceAdmissions?: number;
  readonly evidenceFreezes?: number;
}): AuthoritativeDeterminismWorkCountsV1 {
  const commandAdmission = input.commandAdmission ?? true;
  const evidenceAdmissions = input.evidenceAdmissions ?? 1;
  const evidenceFreezes = input.evidenceFreezes ?? (evidenceAdmissions === 0 ? 0 : 1);
  return Object.freeze({
    canonicalTraversals: (input.committed ? 1 : 0) + (commandAdmission ? 1 : 0) +
      evidenceAdmissions,
    canonicalDigests: input.committed ? 1 : 0,
    deepFreezeTraversals: (input.committed ? 1 : 0) + (commandAdmission ? 1 : 0) +
      evidenceFreezes,
    commandLogContinuityVerifications: input.log ? 1 : 0,
    purposes: Object.freeze({
      snapshotDigestTraversals: input.committed ? 1 : 0,
      snapshotFreezeTraversals: input.committed ? 1 : 0,
      bootstrapAdmissionCanonicalTraversals: 0,
      bootstrapHandoffFreezeTraversals: 0,
      commandAdmissionCanonicalTraversals: commandAdmission ? 1 : 0,
      commandHandoffFreezeTraversals: commandAdmission ? 1 : 0,
      evidenceAdmissionCanonicalTraversals: evidenceAdmissions,
      replayComparisonTraversals: 0,
      totalPhysicalCanonicalTraversals: (input.committed ? 1 : 0) +
        (commandAdmission ? 1 : 0) + evidenceAdmissions,
    }),
  });
}

const commandExpectationsV1 = [
  {
    commandClass: "no_draw_committed",
    outcome: "committed",
    status: "ready",
    snapshotRetained: false,
    sequenceAfter: 1,
    stateValue: 1,
    liveRng: initialRngV1,
    attemptedDraws: Object.freeze([]),
    candidateRngAfter: initialRngV1,
    committedRngAfter: initialRngV1,
    logOutcome: Object.freeze({
      kind: "committed",
      facts: Object.freeze([
        Object.freeze({
          kind: "determinism.committed",
          commandClass: "no_draw_committed",
          result: null,
        }),
      ]),
    }),
    counts: countsV1({ committed: true, log: true }),
  },
  {
    commandClass: "rng_committed",
    outcome: "committed",
    status: "ready",
    snapshotRetained: false,
    sequenceAfter: 1,
    stateValue: 3,
    liveRng: drawnRngV1,
    attemptedDraws: Object.freeze([drawTraceV1]),
    candidateRngAfter: drawnRngV1,
    committedRngAfter: drawnRngV1,
    logOutcome: Object.freeze({
      kind: "committed",
      facts: Object.freeze([
        Object.freeze({
          kind: "determinism.committed",
          commandClass: "rng_committed",
          result: 3,
        }),
      ]),
    }),
    counts: countsV1({ committed: true, log: true }),
  },
  {
    commandClass: "rejected",
    outcome: "rejected",
    status: "ready",
    snapshotRetained: true,
    sequenceAfter: 0,
    stateValue: 0,
    liveRng: initialRngV1,
    attemptedDraws: Object.freeze([drawTraceV1]),
    candidateRngAfter: drawnRngV1,
    committedRngAfter: initialRngV1,
    logOutcome: Object.freeze({
      kind: "rejected",
      reasons: Object.freeze([Object.freeze({ code: "determinism.rejected" })]),
    }),
    counts: countsV1({ committed: false, log: true }),
  },
  {
    commandClass: "faulted",
    outcome: "faulted",
    status: "fault_paused",
    snapshotRetained: true,
    sequenceAfter: 0,
    stateValue: 0,
    liveRng: initialRngV1,
    attemptedDraws: Object.freeze([drawTraceV1]),
    candidateRngAfter: drawnRngV1,
    committedRngAfter: initialRngV1,
    logOutcome: Object.freeze({
      kind: "faulted",
      fault: Object.freeze({ code: "determinism.faulted" }),
    }),
    counts: countsV1({ committed: false, log: true }),
  },
] as const satisfies readonly {
  readonly commandClass: AuthoritativeDeterminismCommandClassV1;
  readonly outcome: "committed" | "rejected" | "faulted";
  readonly status: "ready" | "fault_paused";
  readonly snapshotRetained: boolean;
  readonly sequenceAfter: number;
  readonly stateValue: number;
  readonly liveRng: ExpectedRngStateV1;
  readonly attemptedDraws: readonly ExpectedRngDrawTraceV1[];
  readonly candidateRngAfter: ExpectedRngStateV1;
  readonly committedRngAfter: ExpectedRngStateV1;
  readonly logOutcome: unknown;
  readonly counts: AuthoritativeDeterminismWorkCountsV1;
}[];

describe("authoritative determinism workload", () => {
  it("publishes the four neutral command classes", () => {
    expect(authoritativeDeterminismCommandClassesV1).toEqual([
      "no_draw_committed",
      "rng_committed",
      "rejected",
      "faulted",
    ]);
  });

  it.each(commandExpectationsV1)(
    "locks the current $commandClass Session and evidence baseline",
    async (expected) => {
      const prepared = prepareAuthoritativeDeterminismWorkloadV1({
        commandClass: expected.commandClass,
      });
      expect(prepared.descriptor).toEqual({
        workloadId: `authoritative-determinism-v1/${expected.commandClass}`,
        commandClass: expected.commandClass,
        rngSeed: 97,
        exclusiveMax: 7,
        drawPurpose: authoritativeDeterminismDrawPurposeV1,
      });
      expect(prepared.setupCounts).toEqual(
        countsV1({
          committed: true,
          log: false,
          commandAdmission: false,
          evidenceAdmissions: 0,
        }),
      );

      const run = await prepared.runOnce();
      expect(run.dispatchResult).toMatchObject({
        kind: "executed",
        execution: { kind: expected.outcome },
      });
      expect(run.status).toBe(expected.status);
      expect(run.snapshotRetained).toBe(expected.snapshotRetained);
      if (expected.snapshotRetained) expect(run.currentSnapshot).toBe(run.initialSnapshot);
      else expect(run.currentSnapshot).not.toBe(run.initialSnapshot);
      expect(run.currentSnapshot).toMatchObject({
        state: { value: expected.stateValue },
        rng: expected.liveRng,
        commandSequence: expected.sequenceAfter,
      });
      expect(run.counts).toEqual(expected.counts);

      expect(run.commandLog).toHaveLength(1);
      const entry = run.commandLog[0];
      expect(entry).toEqual({
        source: "game",
        command: { kind: expected.commandClass },
        logOrdinal: 1,
        preStateDigest: entry?.preStateDigest,
        postStateDigest: entry?.postStateDigest,
        commandSequence: { before: 0, after: expected.sequenceAfter },
        committedRngBefore: initialRngV1,
        attemptedDraws: expected.attemptedDraws,
        candidateRngAfter: expected.candidateRngAfter,
        committedRngAfter: expected.committedRngAfter,
        outcome: expected.logOutcome,
      });
      if (expected.snapshotRetained) expect(entry?.postStateDigest).toBe(entry?.preStateDigest);
      else expect(entry?.postStateDigest).not.toBe(entry?.preStateDigest);
      await expect(prepared.runOnce()).rejects.toThrow(
        "Authoritative determinism workload can only run once",
      );
    },
  );

  it("matches the independent S0-complete RNG-commit byte oracle", async () => {
    const run = await prepareAuthoritativeDeterminismWorkloadV1({
      commandClass: "rng_committed",
    }).runOnce();

    expect(byteEvidenceV1(run.dispatchResult)).toEqual(
      s0CompleteRngCommitGoldenV1.dispatchResult,
    );
    expect(byteEvidenceV1(run.currentSnapshot)).toEqual(s0CompleteRngCommitGoldenV1.snapshot);
    expect(byteEvidenceV1(run.commandLog)).toEqual(s0CompleteRngCommitGoldenV1.commandLog);
    expect(run.commandLog[0]?.attemptedDraws).toEqual([drawTraceV1]);
  });
});

function expectCanonicalErrorV1(error: unknown, path: string): void {
  expect(error).toBeInstanceOf(CanonicalJsonError);
  expect(error).toMatchObject({
    name: "CanonicalJsonError",
    code: "number.not_integer",
    path,
  });
}

describe("authoritative determinism evidence finalization", () => {
  it("rejects a fractional command at canonical admission before any authoritative work", async () => {
    const workload = createUnsafeAuthoritativeDeterminismWorkloadV1("fractional_command");
    const dispatch = workload.dispatch();

    await expect(dispatch).rejects.toEqual(
      expect.objectContaining({
        name: "CanonicalJsonError",
        code: "number.not_integer",
        path: "/amount",
      }),
    );
    await expect(dispatch).rejects.toBeInstanceOf(CanonicalJsonError);
    expect(workload.status()).toBe("ready");
    expect(workload.snapshot()).toBe(workload.initialSnapshot);
    expect(workload.commandLog()).toEqual([]);
    expect(workload.normalizerCalls()).toBe(0);
    expect(workload.normalizerErrors()).toEqual([]);
    expect(workload.counts()).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 0,
      deepFreezeTraversals: 0,
      commandLogContinuityVerifications: 0,
      purposes: {
        snapshotDigestTraversals: 0,
        snapshotFreezeTraversals: 0,
        bootstrapAdmissionCanonicalTraversals: 0,
        bootstrapHandoffFreezeTraversals: 0,
        commandAdmissionCanonicalTraversals: 1,
        commandHandoffFreezeTraversals: 0,
        evidenceAdmissionCanonicalTraversals: 0,
        replayComparisonTraversals: 0,
        totalPhysicalCanonicalTraversals: 1,
      },
    });
  });

  it.each(
    [
      ["fractional_fact", "/result/facts/0/value"],
      ["fractional_rejection", "/result/reasons/0/value"],
      ["fractional_fault", "/result/fault/value"],
      ["fractional_rng_draw", "/diagnostics/attemptedDraws/0/result"],
      ["fractional_rng_state", "/diagnostics/candidateRngAfter/rawDrawCount"],
    ] as const,
  )(
    "normalizes %s failure before candidate Snapshot work and logs only the stable fallback",
    async (unsafeCase, errorPath) => {
      const workload = createUnsafeAuthoritativeDeterminismWorkloadV1(unsafeCase);
      const result = await workload.dispatch();

      expect(result).toMatchObject({
        kind: "executed",
        execution: {
          kind: "faulted",
          snapshot: workload.initialSnapshot,
          fault: { code: "determinism.stable_fault" },
        },
      });
      expect(workload.status()).toBe("fault_paused");
      expect(workload.snapshot()).toBe(workload.initialSnapshot);
      expect(workload.snapshot()).toMatchObject({
        state: { value: 0 },
        rng: initialRngV1,
        commandSequence: 0,
      });
      expect(workload.normalizerCalls()).toBe(1);
      const [normalizedError] = workload.normalizerErrors();
      expectCanonicalErrorV1(normalizedError, errorPath);
      expect(workload.commandLog()).toHaveLength(1);
      const entry = workload.commandLog()[0];
      expect(entry).toMatchObject({
        source: "game",
        command: { kind: unsafeCase, amount: 1 },
        commandSequence: { before: 0, after: 0 },
        committedRngBefore: initialRngV1,
        attemptedDraws: [],
        candidateRngAfter: initialRngV1,
        committedRngAfter: initialRngV1,
        outcome: {
          kind: "faulted",
          fault: { code: "determinism.stable_fault" },
        },
      });
      expect(entry?.postStateDigest).toBe(entry?.preStateDigest);
      expect(workload.replayBase()).toBe(workload.initialSnapshot);
      expect(workload.counts()).toEqual(
        countsV1({
          committed: false,
          log: true,
          evidenceAdmissions: 2,
          evidenceFreezes: 1,
        }),
      );
    },
  );

  it("finalizes debug validation errors before returning them", async () => {
    const workload = createUnsafeAuthoritativeDeterminismWorkloadV1(
      "fractional_debug_validation",
    );
    const result = await workload.executeDebug();

    expect(result).toMatchObject({
      kind: "executed",
      attempt: {
        result: {
          kind: "faulted",
          snapshot: workload.initialSnapshot,
          fault: { code: "determinism.stable_fault" },
        },
      },
    });
    expect(workload.status()).toBe("fault_paused");
    expect(workload.snapshot()).toBe(workload.initialSnapshot);
    expect(workload.normalizerCalls()).toBe(1);
    const [normalizedError] = workload.normalizerErrors();
    expectCanonicalErrorV1(normalizedError, "/errors/0/value");
    expect(workload.commandLog()).toHaveLength(1);
    expect(workload.commandLog()[0]).toMatchObject({
      source: "debug",
      command: { kind: "fractional_debug_validation" },
      commandSequence: { before: 0, after: 0 },
      outcome: {
        kind: "faulted",
        fault: { code: "determinism.stable_fault" },
      },
    });
    expect(workload.replayBase()).toBe(workload.initialSnapshot);
    expect(workload.counts()).toEqual(
      countsV1({
        committed: false,
        log: true,
        evidenceAdmissions: 2,
        evidenceFreezes: 1,
      }),
    );
  });

  it("rejects with the invalid fallback fault after preserving the original evidence error", async () => {
    const workload = createUnsafeAuthoritativeDeterminismWorkloadV1("illegal_fallback_fault");
    const dispatch = workload.dispatch();

    await expect(dispatch).rejects.toEqual(
      expect.objectContaining({
        name: "CanonicalJsonError",
        code: "number.not_integer",
        path: "/result/fault/value",
      }),
    );
    await expect(dispatch).rejects.toBeInstanceOf(CanonicalJsonError);
    expect(workload.normalizerCalls()).toBe(1);
    const [originalError] = workload.normalizerErrors();
    expectCanonicalErrorV1(originalError, "/result/facts/0/value");
    expect(workload.status()).toBe("ready");
    expect(workload.snapshot()).toBe(workload.initialSnapshot);
    expect(workload.snapshot()).toMatchObject({
      state: { value: 0 },
      rng: initialRngV1,
      commandSequence: 0,
    });
    expect(workload.commandLog()).toEqual([]);
    expect(workload.replayBase()).toBe(workload.initialSnapshot);
    expect(workload.counts()).toEqual(
      countsV1({
        committed: false,
        log: false,
        evidenceAdmissions: 2,
        evidenceFreezes: 0,
      }),
    );
  });
});
