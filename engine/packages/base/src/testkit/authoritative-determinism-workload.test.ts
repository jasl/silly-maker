// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
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
}): AuthoritativeDeterminismWorkCountsV1 {
  return Object.freeze({
    canonicalTraversals: input.committed ? 1 : 0,
    canonicalDigests: input.committed ? 1 : 0,
    deepFreezeTraversals: input.committed ? 1 : 0,
    commandLogContinuityVerifications: input.log ? 1 : 0,
    purposes: Object.freeze({
      snapshotDigestTraversals: input.committed ? 1 : 0,
      snapshotFreezeTraversals: input.committed ? 1 : 0,
      bootstrapAdmissionCanonicalTraversals: 0,
      bootstrapHandoffFreezeTraversals: 0,
      commandAdmissionCanonicalTraversals: 0,
      evidenceAdmissionCanonicalTraversals: 0,
      replayComparisonTraversals: 0,
      totalPhysicalCanonicalTraversals: input.committed ? 1 : 0,
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
      expect(prepared.setupCounts).toEqual(countsV1({ committed: true, log: false }));

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

describe("authoritative determinism permissive baseline", () => {
  it.each(
    [
      ["fractional_command", "committed", "ready", false, 0.25, undefined],
      ["fractional_fact", "committed", "ready", false, 1, 0.5],
      ["fractional_rejection", "rejected", "ready", true, 1, 0.75],
      ["fractional_fault", "faulted", "fault_paused", true, 1, 0.875],
    ] as const,
  )(
    "retains the current %s late-admission behavior",
    async (unsafeCase, outcome, status, snapshotRetained, commandAmount, evidenceValue) => {
      const workload = createUnsafeAuthoritativeDeterminismWorkloadV1(unsafeCase);
      const result = await workload.dispatch();

      expect(result).toMatchObject({ kind: "executed", execution: { kind: outcome } });
      expect(workload.status()).toBe(status);
      expect(workload.snapshot() === workload.initialSnapshot).toBe(snapshotRetained);
      expect(workload.commandLog()).toHaveLength(1);
      const entry = workload.commandLog()[0];
      expect(entry?.command).toEqual({ kind: unsafeCase, amount: commandAmount });
      if (unsafeCase === "fractional_fact") {
        expect(entry?.outcome).toEqual({
          kind: "committed",
          facts: [{ kind: "determinism.unsafe_fact", value: evidenceValue }],
        });
      } else if (unsafeCase === "fractional_rejection") {
        expect(entry?.outcome).toEqual({
          kind: "rejected",
          reasons: [{ code: "determinism.unsafe_rejection", value: evidenceValue }],
        });
      } else if (unsafeCase === "fractional_fault") {
        expect(entry?.outcome).toEqual({
          kind: "faulted",
          fault: { code: "determinism.unsafe_fault", value: evidenceValue },
        });
      }
      expect(workload.counts()).toEqual(
        countsV1({ committed: outcome === "committed", log: true }),
      );
    },
  );

  it("retains a fractional attempted RNG draw in the current CommandLog", async () => {
    const workload = createUnsafeAuthoritativeDeterminismWorkloadV1("fractional_rng_draw");
    const result = await workload.dispatch();

    expect(result).toEqual({
      kind: "executed",
      execution: {
        kind: "rejected",
        snapshot: workload.initialSnapshot,
        reasons: [{ code: "determinism.unsafe_rejection", value: 1 }],
      },
    });
    expect(workload.status()).toBe("ready");
    expect(workload.snapshot()).toBe(workload.initialSnapshot);
    expect(workload.snapshot()).toMatchObject({
      state: { value: 0 },
      rng: initialRngV1,
      commandSequence: 0,
    });
    expect(workload.normalizerCalls()).toBe(0);
    expect(workload.counts()).toEqual(countsV1({ committed: false, log: true }));

    const entry = workload.commandLog()[0];
    if (entry === undefined) throw new TypeError("expected fractional RNG CommandLog entry");
    expect(entry).toEqual({
      source: "game",
      command: { kind: "fractional_rng_draw", amount: 1 },
      logOrdinal: 1,
      preStateDigest: entry.preStateDigest,
      postStateDigest: entry.postStateDigest,
      commandSequence: { before: 0, after: 0 },
      committedRngBefore: initialRngV1,
      attemptedDraws: [{ ...drawTraceV1, result: 0.5 }],
      candidateRngAfter: drawnRngV1,
      committedRngAfter: initialRngV1,
      outcome: {
        kind: "rejected",
        reasons: [{ code: "determinism.unsafe_rejection", value: 1 }],
      },
    });
    expect(entry.postStateDigest).toBe(entry.preStateDigest);
    expect(workload.replayBase()).toBe(workload.initialSnapshot);
  });

  it("retains a fractional candidate RNG state in the current CommandLog", async () => {
    const workload = createUnsafeAuthoritativeDeterminismWorkloadV1("fractional_rng_state");
    const result = await workload.dispatch();

    expect(result).toEqual({
      kind: "executed",
      execution: {
        kind: "rejected",
        snapshot: workload.initialSnapshot,
        reasons: [{ code: "determinism.unsafe_rejection", value: 1 }],
      },
    });
    expect(workload.status()).toBe("ready");
    expect(workload.snapshot()).toBe(workload.initialSnapshot);
    expect(workload.snapshot()).toMatchObject({
      state: { value: 0 },
      rng: initialRngV1,
      commandSequence: 0,
    });
    expect(workload.normalizerCalls()).toBe(0);
    expect(workload.counts()).toEqual(countsV1({ committed: false, log: true }));

    const entry = workload.commandLog()[0];
    if (entry === undefined) throw new TypeError("expected fractional RNG state log entry");
    expect(entry).toEqual({
      source: "game",
      command: { kind: "fractional_rng_state", amount: 1 },
      logOrdinal: 1,
      preStateDigest: entry.preStateDigest,
      postStateDigest: entry.postStateDigest,
      commandSequence: { before: 0, after: 0 },
      committedRngBefore: initialRngV1,
      attemptedDraws: [drawTraceV1],
      candidateRngAfter: { ...drawnRngV1, rawDrawCount: 0.5 },
      committedRngAfter: initialRngV1,
      outcome: {
        kind: "rejected",
        reasons: [{ code: "determinism.unsafe_rejection", value: 1 }],
      },
    });
    expect(entry.postStateDigest).toBe(entry.preStateDigest);
    expect(workload.replayBase()).toBe(workload.initialSnapshot);
  });

  it("locks the rejected Promise and untouched Session for an illegal fallback fault", async () => {
    const workload = createUnsafeAuthoritativeDeterminismWorkloadV1("illegal_fallback_fault");

    await expect(workload.dispatch()).rejects.toThrow(
      "Non-committed command attempt changed the Snapshot",
    );
    expect(workload.normalizerCalls()).toBe(1);
    expect(workload.status()).toBe("ready");
    expect(workload.snapshot()).toBe(workload.initialSnapshot);
    expect(workload.snapshot()).toMatchObject({
      state: { value: 0 },
      rng: initialRngV1,
      commandSequence: 0,
    });
    expect(workload.commandLog()).toEqual([]);
    expect(workload.replayBase()).toBe(workload.initialSnapshot);
    expect(workload.counts()).toEqual(countsV1({ committed: false, log: false }));
  });
});
