// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { CanonicalJsonError } from "../../contracts/canonical-json.ts";
import { digestCanonical } from "../../contracts/digest.ts";
import { rngStateV1Schema } from "../../contracts/rng.ts";
import type { RngStateV1 } from "../../contracts/rng.ts";
import { createPristineRunIntegrityV1 } from "../../contracts/snapshot.ts";
import type { GameSnapshotEnvelopeV1 } from "../../contracts/snapshot.ts";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.ts";
import type { Digest, PositiveSafeInteger } from "../../contracts/values.ts";
import {
  createPurposeTaggedSnapshotWorkCounterV1,
  createSnapshotWorkCounterV1,
} from "../../internal/snapshot-work-instrumentation.ts";
import type {
  SnapshotWorkEventV1,
  SnapshotWorkPurposeV1,
} from "../../internal/snapshot-work-instrumentation.ts";
import {
  admitCommandAttemptEvidenceInternalV1,
  withFinalizedEvidenceHandoffInternalV1,
} from "../../internal/finalized-evidence-admission.ts";
import {
  createCommandLogInternalV1,
  createCommandLogV1,
  type FinalizedCommandAttemptV1,
} from "./command-log.ts";

interface FixtureStateV1 {
  readonly value: number;
}

type FixtureSnapshotV1 = GameSnapshotEnvelopeV1<FixtureStateV1, RngStateV1>;

interface FixtureCommandV1 {
  readonly kind: "fixture.command";
  readonly ordinal: PositiveSafeInteger;
}

type FixtureLoggedCommandV1 =
  | {
    readonly source: "game";
    readonly command: FixtureCommandV1;
  }
  | {
    readonly source: "debug";
    readonly command: {
      readonly kind: "debug.fixture.command";
      readonly ordinal: PositiveSafeInteger;
    };
  };

interface FixtureFactV1 {
  readonly kind: "fixture.committed";
  readonly value: number;
}

interface FixtureRejectionV1 {
  readonly code: "fixture.rejected";
}

interface FixtureFaultV1 {
  readonly code: "fixture.faulted";
}

type FixtureAttemptV1 = FinalizedCommandAttemptV1<
  FixtureSnapshotV1,
  FixtureFactV1,
  FixtureRejectionV1,
  FixtureFaultV1
>;

interface FixtureAttemptEntryV1 {
  readonly parsedCommand: FixtureLoggedCommandV1;
  readonly finalizedAttempt: FixtureAttemptV1;
}

const fixedRngV1 = rngStateV1Schema.parse({
  algorithm: "xorshift32-v1",
  cursor: 17,
  rawDrawCount: 0,
});

function snapshotAtSequence(sequence: number, value = sequence): FixtureSnapshotV1 {
  return Object.freeze({
    state: Object.freeze({ value }),
    rng: fixedRngV1,
    commandSequence: parseNonNegativeSafeInteger(sequence),
    integrity: createPristineRunIntegrityV1(),
  });
}

function stateDigest(snapshot: FixtureSnapshotV1): Digest {
  return digestCanonical("sillymaker:state:v1", snapshot);
}

function parsedCommand(ordinal: number): FixtureLoggedCommandV1 {
  return Object.freeze({
    source: "game",
    command: Object.freeze({
      kind: "fixture.command",
      ordinal: parsePositiveSafeInteger(ordinal),
    }),
  });
}

function parsedDebugCommand(ordinal: number): FixtureLoggedCommandV1 {
  return Object.freeze({
    source: "debug",
    command: Object.freeze({
      kind: "debug.fixture.command",
      ordinal: parsePositiveSafeInteger(ordinal),
    }),
  });
}

function diagnostics(snapshot: FixtureSnapshotV1) {
  return Object.freeze({
    committedRngBefore: snapshot.rng,
    attemptedDraws: Object.freeze([]),
    committedRngAfter: snapshot.rng,
  });
}

function finalizationEvidence(before: FixtureSnapshotV1, after: FixtureSnapshotV1) {
  return Object.freeze({
    preSnapshot: before,
    preStateDigest: stateDigest(before),
    postStateDigest: stateDigest(after),
  });
}

function finalizedAttempt(before: FixtureSnapshotV1, ordinal: number): FixtureAttemptV1 {
  if (ordinal % 3 === 1) {
    const snapshot = snapshotAtSequence(before.commandSequence + 1, before.state.value + 1);
    return Object.freeze({
      ...finalizationEvidence(before, snapshot),
      result: Object.freeze({
        kind: "committed",
        snapshot,
        facts: Object.freeze([
          Object.freeze({ kind: "fixture.committed", value: snapshot.state.value }),
        ]),
      }),
      diagnostics: diagnostics(snapshot),
    });
  }
  if (ordinal % 3 === 2) {
    return Object.freeze({
      ...finalizationEvidence(before, before),
      result: Object.freeze({
        kind: "rejected",
        snapshot: before,
        reasons: Object.freeze([Object.freeze({ code: "fixture.rejected" })]),
      }),
      diagnostics: diagnostics(before),
    });
  }
  return Object.freeze({
    ...finalizationEvidence(before, before),
    result: Object.freeze({
      kind: "faulted",
      snapshot: before,
      fault: Object.freeze({ code: "fixture.faulted" }),
    }),
    diagnostics: diagnostics(before),
  });
}

function mixedAttempts(count: number): readonly FixtureAttemptEntryV1[] {
  const entries: FixtureAttemptEntryV1[] = [];
  let snapshot = snapshotAtSequence(0);
  for (let ordinal = 1; ordinal <= count; ordinal += 1) {
    const attempt = finalizedAttempt(snapshot, ordinal);
    entries.push(
      Object.freeze({
        parsedCommand: parsedCommand(ordinal),
        finalizedAttempt: attempt,
      }),
    );
    snapshot = attempt.result.snapshot;
  }
  return Object.freeze(entries);
}

function createFixtureLog(replayBase = snapshotAtSequence(0)) {
  return createCommandLogV1<
    FixtureSnapshotV1,
    FixtureLoggedCommandV1,
    FixtureFactV1,
    FixtureRejectionV1,
    FixtureFaultV1
  >({ replayBase, limit: 200 });
}

function createMeasuredFixtureLog(replayBase: FixtureSnapshotV1) {
  const counter = createSnapshotWorkCounterV1();
  const purposes = createPurposeTaggedSnapshotWorkCounterV1();
  const instrumentation = Object.freeze({
    record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
      counter.instrumentation.record(event, purpose);
      purposes.instrumentation.record(event, purpose);
    },
  });
  const log = createCommandLogInternalV1<
    FixtureSnapshotV1,
    FixtureLoggedCommandV1,
    FixtureFactV1,
    FixtureRejectionV1,
    FixtureFaultV1
  >(
    {
      replayBase,
      replayBaseStateDigest: stateDigest(replayBase),
      limit: 200,
      auditStateDigests: false,
    },
    instrumentation,
  );
  counter.reset();
  purposes.reset();
  return Object.freeze({ counter, instrumentation, log, purposes });
}

const fractionalEvidenceCasesV1 = [
  {
    name: "fact",
    path: "/result/facts/0/value",
    createAttempt(before: FixtureSnapshotV1): FixtureAttemptV1 {
      const after = snapshotAtSequence(before.commandSequence + 1, before.state.value + 1);
      return {
        ...finalizationEvidence(before, after),
        result: {
          kind: "committed",
          snapshot: after,
          facts: [{ kind: "fixture.committed", value: 0.25 }],
        },
        diagnostics: diagnostics(after),
      } as unknown as FixtureAttemptV1;
    },
  },
  {
    name: "rejection",
    path: "/result/reasons/0/weight",
    createAttempt(before: FixtureSnapshotV1): FixtureAttemptV1 {
      return {
        ...finalizationEvidence(before, before),
        result: {
          kind: "rejected",
          snapshot: before,
          reasons: [{ code: "fixture.rejected", weight: 0.25 }],
        },
        diagnostics: diagnostics(before),
      } as unknown as FixtureAttemptV1;
    },
  },
  {
    name: "fault",
    path: "/result/fault/weight",
    createAttempt(before: FixtureSnapshotV1): FixtureAttemptV1 {
      return {
        ...finalizationEvidence(before, before),
        result: {
          kind: "faulted",
          snapshot: before,
          fault: { code: "fixture.faulted", weight: 0.25 },
        },
        diagnostics: diagnostics(before),
      } as unknown as FixtureAttemptV1;
    },
  },
  {
    name: "RNG state",
    path: "/diagnostics/committedRngBefore/cursor",
    createAttempt(before: FixtureSnapshotV1): FixtureAttemptV1 {
      const attempt = finalizedAttempt(before, 2);
      return {
        ...attempt,
        diagnostics: {
          ...attempt.diagnostics,
          committedRngBefore: {
            algorithm: "xorshift32-v1",
            cursor: 0.25,
            rawDrawCount: 0,
          },
        },
      } as unknown as FixtureAttemptV1;
    },
  },
  {
    name: "RNG draw",
    path: "/diagnostics/attemptedDraws/0/result",
    createAttempt(before: FixtureSnapshotV1): FixtureAttemptV1 {
      const attempt = finalizedAttempt(before, 2);
      return {
        ...attempt,
        diagnostics: {
          ...attempt.diagnostics,
          attemptedDraws: [{
            ordinal: 1,
            purpose: "demand:fixture",
            exclusiveMax: 10,
            result: 0.25,
            before: before.rng,
            after: before.rng,
          }],
        },
      } as unknown as FixtureAttemptV1;
    },
  },
] as const;

describe("CommandLog", () => {
  it("keeps digest recomputation behind an explicit internal audit mode", () => {
    const replayBase = snapshotAtSequence(0);
    const counter = createSnapshotWorkCounterV1();
    const log = createCommandLogInternalV1<
      FixtureSnapshotV1,
      FixtureLoggedCommandV1,
      FixtureFactV1,
      FixtureRejectionV1,
      FixtureFaultV1
    >(
      {
        replayBase,
        replayBaseStateDigest: stateDigest(replayBase),
        limit: 200,
        auditStateDigests: true,
      },
      counter.instrumentation,
    );
    counter.reset();

    log.append(parsedCommand(1), finalizedAttempt(replayBase, 1));

    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 4,
      canonicalDigests: 2,
      deepFreezeTraversals: 2,
      commandLogContinuityVerifications: 1,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
  });

  it("throws CanonicalJsonError before continuity or log mutation", () => {
    const replayBase = snapshotAtSequence(0);
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const instrumentation = Object.freeze({
      record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
        counter.instrumentation.record(event, purpose);
        purposes.instrumentation.record(event, purpose);
      },
    });
    const log = createCommandLogInternalV1<
      FixtureSnapshotV1,
      FixtureLoggedCommandV1,
      FixtureFactV1,
      FixtureRejectionV1,
      FixtureFaultV1
    >(
      {
        replayBase,
        replayBaseStateDigest: stateDigest(replayBase),
        limit: 200,
        auditStateDigests: false,
      },
      instrumentation,
    );
    counter.reset();
    purposes.reset();
    const replayBaseBefore = log.replayBase();
    const entriesBefore = log.entries();
    const invalid = {
      source: "game",
      command: { kind: "fixture.command", ordinal: 0.25 },
    } as never;

    let failure: unknown;
    try {
      log.append(invalid, finalizedAttempt(replayBase, 1));
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(CanonicalJsonError);
    expect(failure).toMatchObject({ code: "number.not_integer", path: "/ordinal" });

    expect(log.replayBase()).toBe(replayBaseBefore);
    expect(log.entries()).toBe(entriesBefore);
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 0,
      deepFreezeTraversals: 0,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(purposes.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      commandHandoffFreezeTraversals: 0,
      totalPhysicalCanonicalTraversals: 1,
    });
    expect(log.append(parsedCommand(1), finalizedAttempt(replayBase, 1)).logOrdinal).toBe(1);
  });

  it("admits and recursively freezes one direct command identity", () => {
    const replayBase = snapshotAtSequence(0);
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const instrumentation = Object.freeze({
      record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
        counter.instrumentation.record(event, purpose);
        purposes.instrumentation.record(event, purpose);
      },
    });
    const log = createCommandLogInternalV1<
      FixtureSnapshotV1,
      FixtureLoggedCommandV1,
      FixtureFactV1,
      FixtureRejectionV1,
      FixtureFaultV1
    >(
      {
        replayBase,
        replayBaseStateDigest: stateDigest(replayBase),
        limit: 200,
        auditStateDigests: false,
      },
      instrumentation,
    );
    counter.reset();
    purposes.reset();
    const nested = { note: "neutral" };
    const command = {
      kind: "fixture.command" as const,
      ordinal: parsePositiveSafeInteger(1),
      metadata: nested,
    };
    const logged = { source: "game" as const, command };

    const entry = log.append(logged, finalizedAttempt(replayBase, 1));

    expect(entry.command).toBe(command);
    expect(Object.isFrozen(command)).toBe(true);
    expect(Object.isFrozen(nested)).toBe(true);
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 2,
      canonicalDigests: 0,
      deepFreezeTraversals: 2,
      commandLogContinuityVerifications: 1,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(purposes.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      commandHandoffFreezeTraversals: 1,
      evidenceAdmissionCanonicalTraversals: 1,
      totalPhysicalCanonicalTraversals: 2,
    });
  });

  it.each(fractionalEvidenceCasesV1)(
    "rejects fractional $name evidence before continuity or log mutation",
    ({ createAttempt, path }: (typeof fractionalEvidenceCasesV1)[number]) => {
      const replayBase = snapshotAtSequence(0);
      const measured = createMeasuredFixtureLog(replayBase);
      const replayBaseBefore = measured.log.replayBase();
      const replayBaseDigestBefore = measured.log.replayBaseStateDigest();
      const entriesBefore = measured.log.entries();

      let failure: unknown;
      try {
        measured.log.append(parsedCommand(1), createAttempt(replayBase));
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeInstanceOf(CanonicalJsonError);
      expect(failure).toMatchObject({ code: "number.not_integer", path });
      expect(measured.log.replayBase()).toBe(replayBaseBefore);
      expect(measured.log.replayBaseStateDigest()).toBe(replayBaseDigestBefore);
      expect(measured.log.entries()).toBe(entriesBefore);
      expect(measured.counter.snapshot()).toEqual({
        canonicalTraversals: 2,
        canonicalDigests: 0,
        deepFreezeTraversals: 1,
        commandLogContinuityVerifications: 0,
        saveCanonicalSerializations: 0,
        strictJsonParses: 0,
        strictJsonPreflights: 0,
      });
      expect(measured.purposes.snapshot()).toEqual({
        snapshotDigestTraversals: 0,
        snapshotFreezeTraversals: 0,
        bootstrapAdmissionCanonicalTraversals: 0,
        bootstrapHandoffFreezeTraversals: 0,
        commandAdmissionCanonicalTraversals: 1,
        commandHandoffFreezeTraversals: 1,
        evidenceAdmissionCanonicalTraversals: 1,
        replayComparisonTraversals: 0,
        totalPhysicalCanonicalTraversals: 2,
      });
      expect(
        measured.log.append(parsedCommand(1), finalizedAttempt(replayBase, 1)).logOrdinal,
      ).toBe(1);
    },
  );

  it("rejects an extra finalized-attempt field before evidence traversal or continuity", () => {
    const replayBase = snapshotAtSequence(0);
    const measured = createMeasuredFixtureLog(replayBase);
    const entriesBefore = measured.log.entries();
    const invalidAttempt = {
      ...finalizedAttempt(replayBase, 1),
      unexpected: "not represented by the finalized-attempt contract",
    } as unknown as FixtureAttemptV1;

    expect(() => measured.log.append(parsedCommand(1), invalidAttempt)).toThrow(
      "Finalized command attempt has invalid fields",
    );
    expect(measured.log.entries()).toBe(entriesBefore);
    expect(measured.counter.snapshot()).toMatchObject({
      canonicalTraversals: 1,
      deepFreezeTraversals: 1,
      commandLogContinuityVerifications: 0,
    });
    expect(measured.purposes.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      commandHandoffFreezeTraversals: 1,
      evidenceAdmissionCanonicalTraversals: 0,
      totalPhysicalCanonicalTraversals: 1,
    });
    expect(
      measured.log.append(parsedCommand(1), finalizedAttempt(replayBase, 1)).logOrdinal,
    ).toBe(1);
  });

  it("does not invoke an outer evidence getter while checking a Debug outcome", () => {
    const replayBase = snapshotAtSequence(0);
    const measured = createMeasuredFixtureLog(replayBase);
    const validAttempt = finalizedAttempt(replayBase, 1);
    const entriesBefore = measured.log.entries();
    let resultReads = 0;
    const invalidAttempt = Object.defineProperties({}, {
      result: {
        enumerable: true,
        get() {
          resultReads += 1;
          return validAttempt.result;
        },
      },
      diagnostics: { enumerable: true, value: validAttempt.diagnostics },
      preSnapshot: { enumerable: true, value: validAttempt.preSnapshot },
      preStateDigest: { enumerable: true, value: validAttempt.preStateDigest },
      postStateDigest: { enumerable: true, value: validAttempt.postStateDigest },
    }) as FixtureAttemptV1;

    let failure: unknown;
    try {
      measured.log.append(parsedDebugCommand(1), invalidAttempt);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(CanonicalJsonError);
    expect(failure).toMatchObject({ code: "value.getter", path: "/result" });
    expect(resultReads).toBe(0);
    expect(measured.log.entries()).toBe(entriesBefore);
    expect(measured.counter.snapshot()).toMatchObject({
      commandLogContinuityVerifications: 0,
    });
  });

  it("does not partially freeze earlier evidence when a later value is invalid", () => {
    const replayBase = snapshotAtSequence(0);
    const measured = createMeasuredFixtureLog(replayBase);
    const after = snapshotAtSequence(1, 1);
    const fact = { kind: "fixture.committed" as const, value: 1 };
    const draw = { kind: "fixture.draw", raw: 0.25 };
    const invalidAttempt = {
      ...finalizationEvidence(replayBase, after),
      result: { kind: "committed", snapshot: after, facts: [fact] },
      diagnostics: {
        committedRngBefore: replayBase.rng,
        attemptedDraws: [draw],
        committedRngAfter: after.rng,
      },
    } as unknown as FixtureAttemptV1;

    expect(() => measured.log.append(parsedCommand(1), invalidAttempt)).toThrow(
      CanonicalJsonError,
    );
    expect(Object.isFrozen(fact)).toBe(false);
    expect(Object.isFrozen(draw)).toBe(false);
    expect(measured.log.entries()).toEqual([]);
    expect(measured.counter.snapshot()).toMatchObject({
      deepFreezeTraversals: 1,
      commandLogContinuityVerifications: 0,
    });
  });

  it("records the same finalized and frozen evidence identities", () => {
    const replayBase = snapshotAtSequence(0);
    const log = createFixtureLog(replayBase);
    const fact = { kind: "fixture.committed" as const, value: 1 };
    const committedRngBefore = {
      algorithm: "xorshift32-v1" as const,
      cursor: 17,
      rawDrawCount: 0,
    };
    const candidateRngAfter = {
      algorithm: "xorshift32-v1" as const,
      cursor: 18,
      rawDrawCount: 1,
    };
    const committedRngAfter = candidateRngAfter;
    const draw = {
      ordinal: 1,
      purpose: "demand:fixture",
      exclusiveMax: 10,
      result: 7,
      before: committedRngBefore,
      after: candidateRngAfter,
    };
    const after = Object.freeze({
      ...snapshotAtSequence(1, 1),
      rng: committedRngAfter,
    }) as FixtureSnapshotV1;
    const attempt = {
      ...finalizationEvidence(replayBase, after),
      result: { kind: "committed", snapshot: after, facts: [fact] },
      diagnostics: {
        committedRngBefore,
        attemptedDraws: [draw],
        candidateRngAfter,
        committedRngAfter,
      },
    } as unknown as FixtureAttemptV1;

    const entry = log.append(parsedCommand(1), attempt);

    expect(entry.outcome.kind).toBe("committed");
    if (entry.outcome.kind !== "committed") throw new TypeError("Expected committed outcome");
    expect(entry.outcome.facts[0]).toBe(fact);
    expect(entry.attemptedDraws[0]).toBe(draw);
    expect(entry.committedRngBefore).toBe(committedRngBefore);
    expect(entry.candidateRngAfter).toBe(candidateRngAfter);
    expect(entry.committedRngAfter).toBe(committedRngAfter);
    for (
      const evidence of [
        fact,
        draw,
        committedRngBefore,
        candidateRngAfter,
        committedRngAfter,
      ]
    ) {
      expect(Object.isFrozen(evidence)).toBe(true);
    }
  });

  it("consumes a Session evidence handoff without repeating admission", () => {
    const replayBase = snapshotAtSequence(0);
    const measured = createMeasuredFixtureLog(replayBase);
    const candidate = finalizedAttempt(replayBase, 1);
    const admitted = admitCommandAttemptEvidenceInternalV1(
      replayBase,
      { result: candidate.result, diagnostics: candidate.diagnostics },
      {},
      measured.instrumentation,
    );
    const finalized = Object.freeze({
      ...admitted,
      ...finalizationEvidence(replayBase, admitted.result.snapshot),
    }) as FixtureAttemptV1;

    const entry = withFinalizedEvidenceHandoffInternalV1(
      finalized,
      () => measured.log.append(parsedCommand(1), finalized),
    );

    expect(entry.logOrdinal).toBe(1);
    expect(measured.counter.snapshot()).toEqual({
      canonicalTraversals: 2,
      canonicalDigests: 0,
      deepFreezeTraversals: 2,
      commandLogContinuityVerifications: 1,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(measured.purposes.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      commandHandoffFreezeTraversals: 1,
      evidenceAdmissionCanonicalTraversals: 1,
      totalPhysicalCanonicalTraversals: 2,
    });
  });

  it("captures source and command once before recording the admitted identity", () => {
    const replayBase = snapshotAtSequence(0);
    const log = createFixtureLog(replayBase);
    const nested = { note: "first value" };
    const firstCommand = {
      kind: "fixture.command" as const,
      ordinal: parsePositiveSafeInteger(1),
      metadata: nested,
    };
    const laterCommand = {
      kind: "fixture.command" as const,
      ordinal: 0.25,
    };
    let sourceReads = 0;
    let commandReads = 0;
    const loggedCommand = Object.defineProperties({}, {
      source: {
        enumerable: true,
        get() {
          sourceReads += 1;
          return sourceReads === 1 ? "game" : "debug";
        },
      },
      command: {
        enumerable: true,
        get() {
          commandReads += 1;
          return commandReads === 1 ? firstCommand : laterCommand;
        },
      },
    }) as FixtureLoggedCommandV1;

    const entry = log.append(loggedCommand, finalizedAttempt(replayBase, 1));

    expect(sourceReads).toBe(1);
    expect(commandReads).toBe(1);
    expect(entry.source).toBe("game");
    expect(entry.command).toBe(firstCommand);
    expect(Object.isFrozen(firstCommand)).toBe(true);
    expect(Object.isFrozen(nested)).toBe(true);
  });

  it("preserves additional enumerable logged-command fields exactly once", () => {
    type ExtendedLoggedCommandV1 = {
      readonly source: "game";
      readonly command: FixtureCommandV1;
      readonly label: string;
      readonly __proto__: { readonly kind: "neutral.metadata" };
    };
    const replayBase = snapshotAtSequence(0);
    const log = createCommandLogV1<
      FixtureSnapshotV1,
      ExtendedLoggedCommandV1,
      FixtureFactV1,
      FixtureRejectionV1,
      FixtureFaultV1
    >({ replayBase, limit: 200 });
    const command = {
      kind: "fixture.command" as const,
      ordinal: parsePositiveSafeInteger(1),
    };
    const metadata = Object.freeze({ kind: "neutral.metadata" as const });
    let labelReads = 0;
    const loggedCommand = Object.create(null) as Record<PropertyKey, unknown>;
    Object.defineProperties(loggedCommand, {
      source: { enumerable: true, value: "game" },
      command: { enumerable: true, value: command },
      label: {
        enumerable: true,
        get() {
          labelReads += 1;
          return "neutral";
        },
      },
    });
    Object.defineProperty(loggedCommand, "__proto__", {
      enumerable: true,
      value: metadata,
    });

    const entry = log.append(
      loggedCommand as unknown as ExtendedLoggedCommandV1,
      finalizedAttempt(replayBase, 1),
    );

    expect(labelReads).toBe(1);
    expect(entry.label).toBe("neutral");
    expect(Object.hasOwn(entry, "__proto__")).toBe(true);
    expect(entry.__proto__).toBe(metadata);
    expect(Object.getPrototypeOf(entry)).toBe(Object.prototype);
  });

  it("keeps cheap identity and digest-chain checks when internal recomputation is off", () => {
    const replayBase = snapshotAtSequence(0);
    const createReleaseLog = () =>
      createCommandLogInternalV1<
        FixtureSnapshotV1,
        FixtureLoggedCommandV1,
        FixtureFactV1,
        FixtureRejectionV1,
        FixtureFaultV1
      >({
        replayBase,
        replayBaseStateDigest: stateDigest(replayBase),
        limit: 200,
        auditStateDigests: false,
      });
    const unrelatedDigest = stateDigest(snapshotAtSequence(99));

    const brokenPre = createReleaseLog();
    expect(() =>
      brokenPre.append(
        parsedCommand(1),
        Object.freeze({
          ...finalizedAttempt(replayBase, 1),
          preStateDigest: unrelatedDigest,
        }),
      )
    ).toThrow("Finalized command attempt breaks digest continuity");
    expect(brokenPre.entries()).toEqual([]);

    const brokenNonCommittedPost = createReleaseLog();
    expect(() =>
      brokenNonCommittedPost.append(
        parsedCommand(2),
        Object.freeze({
          ...finalizedAttempt(replayBase, 2),
          postStateDigest: unrelatedDigest,
        }),
      )
    ).toThrow("Non-committed finalized attempt changed the state digest");
    expect(brokenNonCommittedPost.entries()).toEqual([]);

    const brokenIdentity = createReleaseLog();
    const sameBytesDifferentReference = snapshotAtSequence(0);
    expect(sameBytesDifferentReference).not.toBe(replayBase);
    expect(() =>
      brokenIdentity.append(parsedCommand(1), finalizedAttempt(sameBytesDifferentReference, 1))
    ).toThrow("Finalized command attempt breaks snapshot continuity");
    expect(brokenIdentity.entries()).toEqual([]);
  });

  it("ignores package-internal digest hints at the public constructor boundary", () => {
    const replayBase = snapshotAtSequence(0);
    const inputWithInternalField = {
      replayBase,
      limit: 200,
      replayBaseStateDigest: stateDigest(snapshotAtSequence(99)),
    };
    const log = createCommandLogV1<
      FixtureSnapshotV1,
      FixtureLoggedCommandV1,
      FixtureFactV1,
      FixtureRejectionV1,
      FixtureFaultV1
    >(inputWithInternalField);

    expect(log.replayBaseStateDigest()).toBe(stateDigest(replayBase));
    expect(() => log.append(parsedCommand(1), finalizedAttempt(replayBase, 1))).not.toThrow();
  });

  it("moves the replay base before evicting the 201st mixed entry", () => {
    const attempts = mixedAttempts(201);
    const log = createFixtureLog(attempts[0]!.finalizedAttempt.preSnapshot);

    for (const fixture of attempts) {
      log.append(fixture.parsedCommand, fixture.finalizedAttempt);
    }

    const entries = log.entries();
    const evictedPostSnapshot = attempts[0]?.finalizedAttempt.result.snapshot;
    expect(evictedPostSnapshot).toBeDefined();
    expect(entries).toHaveLength(200);
    expect(entries[0]?.logOrdinal).toBe(2);
    expect(entries.at(-1)?.logOrdinal).toBe(201);
    expect(new Set(entries.map((entry) => entry.outcome.kind))).toEqual(
      new Set(["committed", "rejected", "faulted"]),
    );
    expect(entries.at(-1)?.outcome).toEqual({
      kind: "faulted",
      fault: { code: "fixture.faulted" },
    });
    expect(log.replayBase()).toBe(evictedPostSnapshot);
    expect(log.replayBaseStateDigest()).toBe(stateDigest(evictedPostSnapshot!));
    expect(entries[0]?.preStateDigest).toBe(log.replayBaseStateDigest());
  });

  it("keeps public entries separate from immutable post snapshots", () => {
    const attempts = mixedAttempts(201);
    const log = createFixtureLog(attempts[0]!.finalizedAttempt.preSnapshot);
    for (const fixture of attempts) {
      log.append(fixture.parsedCommand, fixture.finalizedAttempt);
    }

    const entries = log.entries();
    const first = entries[0];
    expect(first).toBeDefined();
    expect(Object.isFrozen(log)).toBe(true);
    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.outcome)).toBe(true);
    expect(Object.isFrozen(first?.commandSequence)).toBe(true);
    expect(Object.isFrozen(first?.attemptedDraws)).toBe(true);
    expect(first).not.toBe(attempts[1]?.finalizedAttempt);
    expect(first?.outcome).not.toBe(attempts[1]?.finalizedAttempt.result);
    expect(first?.attemptedDraws).not.toBe(
      attempts[1]?.finalizedAttempt.diagnostics.attemptedDraws,
    );
    expect(Object.keys(first ?? {})).not.toContain("snapshot");
    expect(Object.keys(first ?? {})).not.toContain("postAttemptSnapshot");
    expect(Object.isFrozen(log.replayBase())).toBe(true);
  });

  it("establishes a new anchor, clears entries, and resets log ordinal to one", () => {
    const attempts = mixedAttempts(3);
    const log = createFixtureLog(attempts[0]!.finalizedAttempt.preSnapshot);
    for (const fixture of attempts) {
      log.append(fixture.parsedCommand, fixture.finalizedAttempt);
    }
    const previousEntries = log.entries();
    expect(previousEntries.map((entry) => entry.logOrdinal)).toEqual([1, 2, 3]);

    const anchor = snapshotAtSequence(50, 87);
    log.establishAnchor(anchor);

    expect(log.replayBase()).toBe(anchor);
    expect(log.replayBaseStateDigest()).toBe(stateDigest(anchor));
    expect(log.entries()).toEqual([]);
    expect(Object.isFrozen(log.entries())).toBe(true);
    expect(previousEntries).toHaveLength(3);

    const attempt = finalizedAttempt(anchor, 2);
    const entry = log.append(parsedCommand(1), attempt);
    expect(entry.logOrdinal).toBe(1);
    expect(entry.preStateDigest).toBe(stateDigest(anchor));
    expect(log.entries()).toEqual([entry]);
  });

  it("validates finalized snapshot and digest evidence before appending", () => {
    const first = mixedAttempts(1)[0];
    expect(first).toBeDefined();
    const log = createFixtureLog(first!.finalizedAttempt.preSnapshot);
    const unrelated = snapshotAtSequence(99);
    const wrongDigestAttempt: FixtureAttemptV1 = Object.freeze({
      ...first!.finalizedAttempt,
      postStateDigest: stateDigest(unrelated),
    });

    expect(() => log.append(first!.parsedCommand, wrongDigestAttempt)).toThrow();
    expect(log.entries()).toEqual([]);

    log.append(first!.parsedCommand, first!.finalizedAttempt);
    const sameBytesDifferentReference = snapshotAtSequence(1, 1);
    expect(sameBytesDifferentReference).not.toBe(first!.finalizedAttempt.result.snapshot);
    expect(stateDigest(sameBytesDifferentReference)).toBe(first!.finalizedAttempt.postStateDigest);
    const discontinuousAttempt = finalizedAttempt(sameBytesDifferentReference, 2);

    expect(() => log.append(parsedCommand(2), discontinuousAttempt)).toThrow();
    expect(log.entries()).toHaveLength(1);
  });

  it("rejects a non-Game/Debug source before mutating the log", () => {
    const first = mixedAttempts(1)[0]!;
    const log = createFixtureLog(first.finalizedAttempt.preSnapshot);
    const replayBaseBefore = log.replayBase();
    const entriesBefore = log.entries();

    expect(() =>
      log.append(
        { source: "semantic", command: first.parsedCommand.command } as never,
        first.finalizedAttempt,
      )
    ).toThrow("CommandLog source must be game or debug");
    expect(log.replayBase()).toBe(replayBaseBefore);
    expect(log.entries()).toBe(entriesBefore);
  });

  it("rejects a Debug-source rejected outcome before mutating the log", () => {
    const rejected = mixedAttempts(2)[1]!;
    const log = createFixtureLog(rejected.finalizedAttempt.preSnapshot);
    const replayBaseBefore = log.replayBase();
    const entriesBefore = log.entries();

    expect(() =>
      log.append(
        { source: "debug", command: rejected.parsedCommand.command } as never,
        rejected.finalizedAttempt,
      )
    ).toThrow("Debug CommandLog entries cannot be rejected");
    expect(log.replayBase()).toBe(replayBaseBefore);
    expect(log.entries()).toBe(entriesBefore);
  });

  it("retains parsed Debug commands with committed and faulted finalized attempts", () => {
    const base = snapshotAtSequence(0);
    const log = createFixtureLog(base);
    const committed = finalizedAttempt(base, 1);
    const committedEntry = log.append(parsedDebugCommand(1), committed);
    const faulted = finalizedAttempt(committed.result.snapshot, 3);
    const faultedEntry = log.append(parsedDebugCommand(2), faulted);

    expect(committedEntry).toMatchObject({
      source: "debug",
      command: { kind: "debug.fixture.command", ordinal: 1 },
      outcome: { kind: "committed" },
    });
    expect(faultedEntry).toMatchObject({
      source: "debug",
      command: { kind: "debug.fixture.command", ordinal: 2 },
      outcome: { kind: "faulted" },
    });
    expect(log.entries()).toEqual([committedEntry, faultedEntry]);
  });

  it("prepares every throwing anchor value before committing the reset", () => {
    const first = mixedAttempts(1)[0]!;
    const log = createFixtureLog(first.finalizedAttempt.preSnapshot);
    log.append(first.parsedCommand, first.finalizedAttempt);
    const replayBaseBefore = log.replayBase();
    const entriesBefore = log.entries();
    const invalid = Object.freeze({
      ...snapshotAtSequence(70),
      state: Object.freeze({ value: -0 }),
    }) as FixtureSnapshotV1;

    expect(() => log.prepareAnchor(invalid)).toThrow();
    expect(log.replayBase()).toBe(replayBaseBefore);
    expect(log.entries()).toBe(entriesBefore);

    const anchor = snapshotAtSequence(70);
    const prepared = log.prepareAnchor(anchor);
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.emptyEntries)).toBe(true);
    log.establishPreparedAnchor(prepared);
    expect(log.replayBase()).toBe(anchor);
    expect(log.replayBaseStateDigest()).toBe(stateDigest(anchor));
    expect(log.entries()).toBe(prepared.emptyEntries);
  });

  it("does not mutate the log when the following ordinal cannot be represented", () => {
    const replayBase = snapshotAtSequence(0);
    const log = createFixtureLog(replayBase);
    const prepared = log.prepareAnchor(replayBase);
    const exhausted = Object.freeze({
      ...prepared,
      nextOrdinal: parsePositiveSafeInteger(Number.MAX_SAFE_INTEGER),
    });
    log.establishPreparedAnchor(exhausted);
    const entriesBefore = log.entries();
    const replayBaseBefore = log.replayBase();

    expect(() => log.append(parsedCommand(1), finalizedAttempt(replayBase, 1))).toThrow();
    expect(log.entries()).toBe(entriesBefore);
    expect(log.replayBase()).toBe(replayBaseBefore);
    expect(log.replayBaseStateDigest()).toBe(stateDigest(replayBase));
  });
});
