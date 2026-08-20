// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { CanonicalJsonError } from "../../contracts/canonical-json.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.ts";
import { commitAttemptV1, faultAttemptV1, rejectAttemptV1 } from "../../contracts/execution.ts";
import type { PatchSetIdentityV1 } from "../../contracts/hotfix.ts";
import type { BuildProvenanceV1 } from "../../contracts/provenance.ts";
import type { RngDrawTraceV1, RngStateV1 } from "../../contracts/rng.ts";
import { createTransactionalRngV1, rngStateV1Schema } from "../../contracts/rng.ts";
import type { GameSnapshotEnvelopeV1, RunIntegrityV1 } from "../../contracts/snapshot.ts";
import { createPristineRunIntegrityV1 } from "../../contracts/snapshot.ts";
import type { Digest, NonNegativeSafeInteger } from "../../contracts/values.ts";
import { digestCanonical } from "../../contracts/digest.ts";
import { digestBytes } from "../../contracts/digest.ts";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.ts";
import type { FinalizedCommandAttemptV1 } from "./command-log.ts";
import {
  createPurposeTaggedSnapshotWorkCounterV1,
  createSnapshotWorkCounterV1,
} from "../../internal/snapshot-work-instrumentation.ts";
import { admitCanonicalCommandForTargetInternalV1 } from "../../internal/canonical-command-admission.ts";
import { createRngZeroStateSnapshotBytesV1 } from "../../testkit/rng-zero-state-fixture.ts";
import type {
  SnapshotWorkEventV1,
  SnapshotWorkPurposeV1,
} from "../../internal/snapshot-work-instrumentation.ts";
import { markRunModifiedV1 } from "../session/run-integrity.ts";
import {
  inspectReplayBestEffortV1,
  replayAuthoritativelyFromAttemptsInternalV1,
  replayAuthoritativelyV1,
} from "./replay.ts";
import type {
  ReplayCommandLogEntryV1,
  ReplayDriverV1,
  ReplayIdentityV1,
  ReplayInputV1,
  ReplayLoggedCommandV1,
  ReplayRecordedOutcomeV1,
} from "./replay.ts";

interface SyntheticStateV1 {
  readonly value: NonNegativeSafeInteger;
}

type SyntheticSnapshotV1 = GameSnapshotEnvelopeV1<SyntheticStateV1, RngStateV1>;

type SyntheticCommandV1 =
  | { readonly kind: "add"; readonly amount: NonNegativeSafeInteger }
  | { readonly kind: "reject"; readonly code: string }
  | { readonly kind: "fault"; readonly code: string };

type SyntheticDebugCommandV1 = {
  readonly kind: "debug_add";
  readonly amount: NonNegativeSafeInteger;
};

interface SyntheticEventV1 {
  readonly kind: "value.changed";
  readonly before: NonNegativeSafeInteger;
  readonly after: NonNegativeSafeInteger;
}

interface SyntheticRejectionV1 {
  readonly code: string;
  readonly slot: "synthetic" | "other";
  readonly message: string;
}

interface SyntheticFaultV1 {
  readonly code: string;
  readonly operation: "synthetic.execute";
  readonly message: string;
  readonly stack: string;
}

type SyntheticLoggedCommandV1 =
  | ReplayLoggedCommandV1<"game", SyntheticCommandV1>
  | ReplayLoggedCommandV1<"debug", SyntheticDebugCommandV1>;

type SyntheticAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  SyntheticSnapshotV1,
  SyntheticEventV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type SyntheticFinalizedAttemptV1 = FinalizedCommandAttemptV1<
  SyntheticSnapshotV1,
  SyntheticEventV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type SyntheticEntryV1 = ReplayCommandLogEntryV1<
  SyntheticLoggedCommandV1,
  SyntheticEventV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

type SyntheticReplayInputV1 = ReplayInputV1<
  SyntheticSnapshotV1,
  SyntheticLoggedCommandV1,
  SyntheticEventV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

const textEncoderV1 = new TextEncoder();
const digestV1 = (label: string): Digest => digestBytes(textEncoderV1.encode(label));
const stateDigestV1 = (snapshot: SyntheticSnapshotV1): Digest =>
  digestCanonical("sillymaker:state:v1", snapshot);

function patchSetV1(label = "current"): PatchSetIdentityV1 {
  return Object.freeze({
    digest: digestV1(`patch:${label}`),
    simulationDigest: digestV1(`patch:simulation:${label}`),
    presentationDigest: digestV1(`patch:presentation:${label}`),
    appliedHotfixes: Object.freeze([]),
  });
}

function provenanceV1(
  overrides: {
    readonly storyId?: string;
    readonly storyRevision?: number;
    readonly storyDigest?: Digest;
    readonly engineVersion?: string;
    readonly engineDigest?: Digest;
    readonly stateContractRevision?: number;
    readonly stateContractDigest?: Digest;
    readonly simulationDigest?: Digest;
    readonly presentationDigest?: Digest;
    readonly patchSet?: PatchSetIdentityV1;
  } = {},
): BuildProvenanceV1 {
  return Object.freeze({
    story: Object.freeze({
      id: overrides.storyId ?? "story.replay-test",
      revision: parsePositiveSafeInteger(overrides.storyRevision ?? 1),
      digest: overrides.storyDigest ?? digestV1("story"),
    }),
    engine: Object.freeze({
      version: overrides.engineVersion ?? "1.0.0",
      digest: overrides.engineDigest ?? digestV1("engine"),
    }),
    resolved: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(overrides.stateContractRevision ?? 1),
      stateContractDigest: overrides.stateContractDigest ?? digestV1("state-contract"),
      simulationDigest: overrides.simulationDigest ?? digestV1("simulation"),
      presentationDigest: overrides.presentationDigest ?? digestV1("presentation"),
      patchSet: overrides.patchSet ?? patchSetV1(),
    }),
  });
}

function identityV1(provenance: BuildProvenanceV1, appBuildId?: Digest): ReplayIdentityV1 {
  return Object.freeze(appBuildId === undefined ? { provenance } : { provenance, appBuildId });
}

function rngStateV1(cursor: number, rawDrawCount: number): RngStateV1 {
  return rngStateV1Schema.parse({ algorithm: "xorshift32-v1", cursor, rawDrawCount });
}

function snapshotV1(
  value: number,
  commandSequence: number,
  rng = rngStateV1(0x1234_5678, 0),
  integrity: RunIntegrityV1 = createPristineRunIntegrityV1(),
): SyntheticSnapshotV1 {
  return Object.freeze({
    state: Object.freeze({ value: parseNonNegativeSafeInteger(value) }),
    rng,
    commandSequence: parseNonNegativeSafeInteger(commandSequence),
    integrity,
  });
}

function modifiedIntegrityV1(): RunIntegrityV1 {
  return Object.freeze({
    mode: "modified",
    mutationCount: parseNonNegativeSafeInteger(1),
    firstMutationSequence: parseNonNegativeSafeInteger(0),
    reasons: Object.freeze([
      Object.freeze({
        kind: "fixture_anchor" as const,
        fixtureId: "fixture.replay-test",
        sequence: parseNonNegativeSafeInteger(0),
      }),
    ]),
  });
}

function executeAttemptV1(
  snapshot: SyntheticSnapshotV1,
  logged: SyntheticLoggedCommandV1,
): SyntheticAttemptV1 {
  const rng = createTransactionalRngV1(snapshot.rng);
  if (logged.source === "debug") {
    const commandSequence = parseNonNegativeSafeInteger(snapshot.commandSequence + 1);
    const afterValue = parseNonNegativeSafeInteger(snapshot.state.value + logged.command.amount);
    const committed = snapshotV1(
      afterValue,
      commandSequence,
      snapshot.rng,
      markRunModifiedV1(snapshot.integrity, {
        kind: "debug_command",
        commandKind: logged.command.kind,
        sequence: commandSequence,
      }),
    );
    return commitAttemptV1(snapshot, committed, rng, [
      Object.freeze({ kind: "value.changed", before: snapshot.state.value, after: afterValue }),
    ]);
  }
  rng.nextInt({ purpose: `check:replay.${logged.command.kind}`, exclusiveMax: 10 });
  if (logged.command.kind === "reject") {
    return rejectAttemptV1(snapshot, rng, [
      Object.freeze({
        code: logged.command.code,
        slot: "synthetic" as const,
        message: "non-authoritative rejection detail",
      }),
    ]);
  }
  if (logged.command.kind === "fault") {
    return faultAttemptV1(
      snapshot,
      rng,
      Object.freeze({
        code: logged.command.code,
        operation: "synthetic.execute" as const,
        message: "non-authoritative fault detail",
        stack: "synthetic stack",
      }),
    );
  }
  const afterValue = parseNonNegativeSafeInteger(snapshot.state.value + logged.command.amount);
  const committed = snapshotV1(
    afterValue,
    snapshot.commandSequence + 1,
    rng.candidateState(),
    snapshot.integrity,
  );
  return commitAttemptV1(snapshot, committed, rng, [
    Object.freeze({ kind: "value.changed", before: snapshot.state.value, after: afterValue }),
  ]);
}

function finalizedAttemptV1(
  before: SyntheticSnapshotV1,
  logged: SyntheticLoggedCommandV1,
): SyntheticFinalizedAttemptV1 {
  const attempt = executeAttemptV1(before, logged);
  return Object.freeze({
    ...attempt,
    preSnapshot: before,
    preStateDigest: stateDigestV1(before),
    postStateDigest: stateDigestV1(attempt.result.snapshot),
  });
}

function outcomeV1(
  attempt: SyntheticAttemptV1,
): ReplayRecordedOutcomeV1<SyntheticEventV1, SyntheticRejectionV1, SyntheticFaultV1> {
  if (attempt.result.kind === "committed") {
    return Object.freeze({ kind: "committed", events: attempt.result.events });
  }
  if (attempt.result.kind === "rejected") {
    return Object.freeze({ kind: "rejected", reasons: attempt.result.reasons });
  }
  return Object.freeze({ kind: "faulted", fault: attempt.result.fault });
}

function entryV1(
  ordinal: number,
  before: SyntheticSnapshotV1,
  logged: SyntheticLoggedCommandV1,
): { readonly entry: SyntheticEntryV1; readonly after: SyntheticSnapshotV1 } {
  const attempt = finalizedAttemptV1(before, logged);
  const after = attempt.result.snapshot;
  const candidateRngAfter = attempt.diagnostics.candidateRngAfter;
  const entryBase = Object.freeze({
    logOrdinal: parsePositiveSafeInteger(ordinal),
    preStateDigest: stateDigestV1(before),
    postStateDigest: stateDigestV1(after),
    commandSequence: Object.freeze({
      before: before.commandSequence,
      after: after.commandSequence,
    }),
    committedRngBefore: attempt.diagnostics.committedRngBefore,
    attemptedDraws: attempt.diagnostics.attemptedDraws,
    ...(candidateRngAfter === undefined ? {} : { candidateRngAfter }),
    committedRngAfter: attempt.diagnostics.committedRngAfter,
    outcome: outcomeV1(attempt),
  });
  const entry: SyntheticEntryV1 = logged.source === "game"
    ? Object.freeze({
      ...entryBase,
      source: "game" as const,
      command: logged.command,
    })
    : Object.freeze({
      ...entryBase,
      source: "debug" as const,
      command: logged.command,
    });
  return Object.freeze({
    entry,
    after,
  });
}

function corpusV1() {
  const replayBase = snapshotV1(0, 0);
  const commands: readonly SyntheticLoggedCommandV1[] = Object.freeze([
    Object.freeze({
      source: "game" as const,
      command: Object.freeze({
        kind: "add" as const,
        amount: parseNonNegativeSafeInteger(2),
      }),
    }),
    Object.freeze({
      source: "game" as const,
      command: Object.freeze({ kind: "reject" as const, code: "synthetic.closed" }),
    }),
    Object.freeze({
      source: "game" as const,
      command: Object.freeze({ kind: "fault" as const, code: "synthetic.boom" }),
    }),
  ]);
  const entries: SyntheticEntryV1[] = [];
  let current = replayBase;
  commands.forEach((command, index) => {
    const finalized = entryV1(index + 1, current, command);
    entries.push(finalized.entry);
    current = finalized.after;
  });
  return Object.freeze({ replayBase, entries: Object.freeze(entries), current });
}

function createDriverV1(
  base: SyntheticSnapshotV1,
  submitted: SyntheticLoggedCommandV1[],
): ReplayDriverV1<
  SyntheticSnapshotV1,
  SyntheticLoggedCommandV1,
  SyntheticEventV1,
  SyntheticRejectionV1,
  SyntheticFaultV1,
  RngStateV1,
  RngDrawTraceV1
> {
  let current = base;
  return Object.freeze({
    getCurrentSnapshot: () => current,
    async submit(command: SyntheticLoggedCommandV1) {
      submitted.push(command);
      const attempt = finalizedAttemptV1(current, command);
      current = attempt.result.snapshot;
      return attempt;
    },
  });
}

function fixtureV1(overrides: Partial<SyntheticReplayInputV1> = {}): {
  readonly input: SyntheticReplayInputV1;
  readonly submitted: SyntheticLoggedCommandV1[];
} {
  const corpus = corpusV1();
  const submitted: SyntheticLoggedCommandV1[] = [];
  const provenance = provenanceV1();
  const input: SyntheticReplayInputV1 = {
    recordedIdentity: identityV1(provenance, digestV1("app-build")),
    runtimeIdentity: identityV1(provenance, digestV1("app-build")),
    replayBase: corpus.replayBase,
    replayBaseStateDigest: stateDigestV1(corpus.replayBase),
    commandLog: corpus.entries,
    currentSnapshot: corpus.current,
    currentStateDigest: stateDigestV1(corpus.current),
    projectStableRejection: ({ code, slot }) => Object.freeze({ code, slot }),
    projectStableFault: ({ code }) => Object.freeze({ code }),
    createDriver: (base) => createDriverV1(base, submitted),
    ...overrides,
  };
  return Object.freeze({ input, submitted });
}

function replaceEntryV1(
  entries: readonly SyntheticEntryV1[],
  index: number,
  replacement: SyntheticEntryV1,
): readonly SyntheticEntryV1[] {
  return Object.freeze(
    entries.map((entry, entryIndex) => (entryIndex === index ? replacement : entry)),
  );
}

describe("authoritative replay", () => {
  it("rejects a fixed zero RNG replay base before driver or digest work", async () => {
    const zero = JSON.parse(
      new TextDecoder().decode(createRngZeroStateSnapshotBytesV1()),
    ) as SyntheticSnapshotV1;
    const identity = identityV1(provenanceV1(), digestV1("app-build"));
    const executeAttempt = vi.fn(executeAttemptV1);
    const counter = createSnapshotWorkCounterV1();

    await expect(
      replayAuthoritativelyFromAttemptsInternalV1(
        {
          identity,
          replayBase: zero,
          replayBaseStateDigest:
            "sha256:0b8ce31faf5875e7897e65ea40233d01e9a47942431b50ced208c7c9593772b6" as Digest,
          commandLog: Object.freeze([]),
          currentSnapshot: zero,
          projectStableRejection: (rejection: SyntheticRejectionV1) => rejection,
          projectStableFault: (fault: SyntheticFaultV1) => fault,
          executeAttempt,
          validateSnapshot: (snapshot: SyntheticSnapshotV1) => {
            rngStateV1Schema.parse(snapshot.rng);
          },
        },
        counter.instrumentation,
      ),
    ).rejects.toMatchObject({ code: "rng.invalid_state" });
    expect(executeAttempt).not.toHaveBeenCalled();
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 0,
      canonicalDigests: 0,
      deepFreezeTraversals: 0,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
  });

  it("counts current, driver, and comparison work on the real from-attempts path", async () => {
    const fixture = fixtureV1();
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const instrumentation = Object.freeze({
      record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
        counter.instrumentation.record(event, purpose);
        purposes.instrumentation.record(event, purpose);
      },
    });

    await expect(
      replayAuthoritativelyFromAttemptsInternalV1(
        {
          identity: fixture.input.recordedIdentity,
          replayBase: fixture.input.replayBase,
          replayBaseStateDigest: fixture.input.replayBaseStateDigest,
          commandLog: fixture.input.commandLog,
          currentSnapshot: fixture.input.currentSnapshot,
          projectStableRejection: fixture.input.projectStableRejection,
          projectStableFault: fixture.input.projectStableFault,
          executeAttempt: executeAttemptV1,
        },
        instrumentation,
      ),
    ).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: true,
      matches: true,
      executedEntries: 3,
      mismatches: [],
    });
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 63,
      canonicalDigests: 26,
      deepFreezeTraversals: 3,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(purposes.snapshot()).toEqual({
      snapshotDigestTraversals: 26,
      snapshotFreezeTraversals: 0,
      bootstrapAdmissionCanonicalTraversals: 0,
      bootstrapHandoffFreezeTraversals: 0,
      commandAdmissionCanonicalTraversals: 3,
      commandHandoffFreezeTraversals: 3,
      commandLogMetadataAdmissionCanonicalTraversals: 0,
      commandLogMetadataFreezeTraversals: 0,
      evidenceAdmissionCanonicalTraversals: 0,
      replayComparisonTraversals: 34,
      totalPhysicalCanonicalTraversals: 63,
    });
  });

  it("rejects a fractional recorded command before driver construction", async () => {
    const fixture = fixtureV1();
    const first = fixture.input.commandLog[0];
    if (first?.source !== "game" || first.command.kind !== "add") {
      throw new TypeError("expected the first replay command to be additive");
    }
    const commandLog = replaceEntryV1(
      fixture.input.commandLog,
      0,
      Object.freeze({
        ...first,
        command: Object.freeze({
          ...first.command,
          amount: 0.25 as NonNegativeSafeInteger,
        }),
      }),
    );
    const createDriver = vi.fn(fixture.input.createDriver);

    let failure: unknown;
    try {
      await replayAuthoritativelyV1({ ...fixture.input, commandLog, createDriver });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(CanonicalJsonError);
    expect(failure).toMatchObject({ code: "number.not_integer", path: "/amount" });
    expect(createDriver).not.toHaveBeenCalled();
  });

  it("does not observe hostile commands when authoritative identity already blocks replay", async () => {
    const fixture = fixtureV1();
    const first = fixture.input.commandLog[0];
    if (first === undefined) throw new TypeError("expected a replay command");
    let commandGetterCalls = 0;
    const hostileEntry = { ...first } as Record<string, unknown>;
    Object.defineProperty(hostileEntry, "command", {
      enumerable: true,
      get(): never {
        commandGetterCalls += 1;
        throw new TypeError("blocked replay must not observe command input");
      },
    });
    const commandLog = replaceEntryV1(
      fixture.input.commandLog,
      0,
      hostileEntry as unknown as SyntheticEntryV1,
    );
    const createDriver = vi.fn(fixture.input.createDriver);

    await expect(
      replayAuthoritativelyV1({
        ...fixture.input,
        runtimeIdentity: identityV1(
          provenanceV1({ engineDigest: digestV1("engine.other") }),
          fixture.input.runtimeIdentity.appBuildId,
        ),
        commandLog,
        createDriver,
      }),
    ).resolves.toMatchObject({
      authoritative: false,
      identityMatch: false,
      visualMatch: false,
      matches: false,
      executedEntries: 0,
      mismatches: [{ scope: "identity", field: "engine_digest" }],
    });
    expect(commandGetterCalls).toBe(0);
    expect(createDriver).not.toHaveBeenCalled();
  });

  it("leaves earlier mutable commands unfrozen when full-vector admission fails", async () => {
    const fixture = fixtureV1();
    const first = fixture.input.commandLog[0];
    const second = fixture.input.commandLog[1];
    if (first?.source !== "game" || first.command.kind !== "add") {
      throw new TypeError("expected the first replay command to be additive");
    }
    if (second?.source !== "game" || second.command.kind !== "reject") {
      throw new TypeError("expected the second replay command to be a rejection");
    }
    const mutableChild = { note: "neutral" };
    const mutableFirstCommand = {
      ...first.command,
      metadata: mutableChild,
    };
    const mutableFirstEntry = {
      ...first,
      command: mutableFirstCommand,
    } as unknown as SyntheticEntryV1;
    const invalidSecondEntry = Object.freeze({
      ...second,
      command: Object.freeze({
        ...second.command,
        amount: 0.25,
      }),
    }) as unknown as SyntheticEntryV1;
    const commandLog = replaceEntryV1(
      replaceEntryV1(fixture.input.commandLog, 0, mutableFirstEntry),
      1,
      invalidSecondEntry,
    );
    const createDriver = vi.fn(fixture.input.createDriver);

    await expect(
      replayAuthoritativelyV1({ ...fixture.input, commandLog, createDriver }),
    ).rejects.toMatchObject({
      code: "number.not_integer",
      path: "/amount",
    });

    expect(Object.isFrozen(mutableFirstCommand)).toBe(false);
    expect(Object.isFrozen(mutableChild)).toBe(false);
    expect(createDriver).not.toHaveBeenCalled();
  });

  it("preflights an unrepresented later command across the full vector atomically", async () => {
    const fixture = fixtureV1();
    const second = fixture.input.commandLog[1];
    if (second?.source !== "game") {
      throw new TypeError("expected the second replay command to be a Game command");
    }
    let extraGetterReads = 0;
    const payload = ["neutral"];
    Object.defineProperty(payload, "hidden/~field", {
      enumerable: true,
      configurable: true,
      get() {
        extraGetterReads += 1;
        return 0.25;
      },
    });
    const commandLog = replaceEntryV1(
      fixture.input.commandLog,
      1,
      Object.freeze({
        ...second,
        command: Object.freeze({
          ...second.command,
          payload: Object.freeze(payload),
        }),
      }) as unknown as SyntheticEntryV1,
    );
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const instrumentation = Object.freeze({
      record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
        counter.instrumentation.record(event, purpose);
        purposes.instrumentation.record(event, purpose);
      },
    });
    const executeAttempt = vi.fn(executeAttemptV1);

    await expect(
      replayAuthoritativelyFromAttemptsInternalV1(
        {
          identity: fixture.input.recordedIdentity,
          replayBase: fixture.input.replayBase,
          replayBaseStateDigest: fixture.input.replayBaseStateDigest,
          commandLog,
          currentSnapshot: fixture.input.currentSnapshot,
          projectStableRejection: fixture.input.projectStableRejection,
          projectStableFault: fixture.input.projectStableFault,
          executeAttempt,
        },
        instrumentation,
      ),
    ).rejects.toMatchObject({
      code: "value.unrepresented_property",
      path: "/payload/hidden~1~0field",
    });

    expect(extraGetterReads).toBe(0);
    expect(executeAttempt).not.toHaveBeenCalled();
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 2,
      canonicalDigests: 0,
      deepFreezeTraversals: 0,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(purposes.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 2,
      commandHandoffFreezeTraversals: 0,
      replayComparisonTraversals: 0,
      totalPhysicalCanonicalTraversals: 2,
    });
  });

  it("captures every command slot before validating the vector", async () => {
    const fixture = fixtureV1();
    const first = fixture.input.commandLog[0];
    const second = fixture.input.commandLog[1];
    if (first?.source !== "game" || first.command.kind !== "add") {
      throw new TypeError("expected the first replay command to be additive");
    }
    if (second === undefined) throw new TypeError("expected a second replay command");
    const mutableFirstCommand = { ...first.command };
    const mutableFirstEntry = {
      ...first,
      command: mutableFirstCommand,
    } as SyntheticEntryV1;
    let secondCommandReads = 0;
    let secondSourceReads = 0;
    const secondEntry = { ...second } as Record<string, unknown>;
    Object.defineProperty(secondEntry, "source", {
      enumerable: true,
      get() {
        secondSourceReads += 1;
        return second.source;
      },
    });
    Object.defineProperty(secondEntry, "command", {
      enumerable: true,
      get() {
        secondCommandReads += 1;
        mutableFirstCommand.amount = 0.25 as NonNegativeSafeInteger;
        return second.command;
      },
    });
    const commandLog = replaceEntryV1(
      replaceEntryV1(fixture.input.commandLog, 0, mutableFirstEntry),
      1,
      secondEntry as unknown as SyntheticEntryV1,
    );
    const createDriver = vi.fn(fixture.input.createDriver);

    await expect(
      replayAuthoritativelyV1({ ...fixture.input, commandLog, createDriver }),
    ).rejects.toMatchObject({
      code: "number.not_integer",
      path: "/amount",
    });

    expect(secondCommandReads).toBe(1);
    expect(secondSourceReads).toBe(1);
    expect(Object.isFrozen(mutableFirstCommand)).toBe(false);
    expect(createDriver).not.toHaveBeenCalled();
  });

  it("rejects an invalid captured source before that entry's command admission", async () => {
    const fixture = fixtureV1();
    const sourceReads = fixture.input.commandLog.map(() => 0);
    const commandReads = fixture.input.commandLog.map(() => 0);
    const commandLog = fixture.input.commandLog.map((entry, index) =>
      Object.defineProperties({}, {
        source: {
          enumerable: true,
          get() {
            sourceReads[index] = (sourceReads[index] ?? 0) + 1;
            return index === 1 ? "surface" : entry.source;
          },
        },
        command: {
          enumerable: true,
          get() {
            commandReads[index] = (commandReads[index] ?? 0) + 1;
            return index === 1 ? { kind: "add", amount: 0.25 } : entry.command;
          },
        },
      }) as unknown as SyntheticEntryV1
    );
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const instrumentation = Object.freeze({
      record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
        counter.instrumentation.record(event, purpose);
        purposes.instrumentation.record(event, purpose);
      },
    });
    const executeAttempt = vi.fn(executeAttemptV1);

    await expect(
      replayAuthoritativelyFromAttemptsInternalV1(
        {
          identity: fixture.input.recordedIdentity,
          replayBase: fixture.input.replayBase,
          replayBaseStateDigest: fixture.input.replayBaseStateDigest,
          commandLog,
          currentSnapshot: fixture.input.currentSnapshot,
          projectStableRejection: fixture.input.projectStableRejection,
          projectStableFault: fixture.input.projectStableFault,
          executeAttempt,
        },
        instrumentation,
      ),
    ).rejects.toThrow("Replay command source must be game or debug");

    expect(sourceReads).toEqual(fixture.input.commandLog.map(() => 1));
    expect(commandReads).toEqual(fixture.input.commandLog.map(() => 1));
    expect(executeAttempt).not.toHaveBeenCalled();
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
  });

  it("submits the admitted projection captured by authoritative vector preflight", async () => {
    const fixture = fixtureV1();
    const second = fixture.input.commandLog[1];
    if (second?.source !== "game" || second.command.kind !== "reject") {
      throw new TypeError("expected the second replay command to be a rejection");
    }
    const originalSecondCommand = second.command;
    const mutableSecondEntry = { ...second };
    const mutableSecondSlot = mutableSecondEntry as unknown as {
      source: "game" | "debug";
      command: SyntheticCommandV1;
    };
    const commandLog = [...replaceEntryV1(
      fixture.input.commandLog,
      1,
      mutableSecondEntry,
    )];
    const submitted: SyntheticLoggedCommandV1[] = [];
    let releaseFirstSubmission: (() => void) | undefined;
    const firstSubmissionPending = new Promise<void>((resolve) => {
      releaseFirstSubmission = resolve;
    });
    let reportFirstSubmission: (() => void) | undefined;
    const firstSubmissionStarted = new Promise<void>((resolve) => {
      reportFirstSubmission = resolve;
    });
    const createDriver = vi.fn((base: SyntheticSnapshotV1) => {
      const driver = createDriverV1(base, submitted);
      let submissionIndex = 0;
      return Object.freeze({
        getCurrentSnapshot: driver.getCurrentSnapshot,
        async submit(command: SyntheticLoggedCommandV1) {
          if (submissionIndex === 0) {
            reportFirstSubmission?.();
            await firstSubmissionPending;
          }
          submissionIndex += 1;
          return await driver.submit(command);
        },
      });
    });
    const replay = replayAuthoritativelyV1({
      ...fixture.input,
      commandLog,
      createDriver,
    });

    await firstSubmissionStarted;
    mutableSecondSlot.source = "debug";
    mutableSecondSlot.command = Object.freeze({
      kind: "reject",
      code: "synthetic.replaced",
    });
    let appendedCommandReads = 0;
    const appendedEntry = { source: "game" } as Record<string, unknown>;
    Object.defineProperty(appendedEntry, "command", {
      enumerable: true,
      get(): never {
        appendedCommandReads += 1;
        throw new TypeError("post-capture entry must not be admitted or submitted");
      },
    });
    commandLog.push(appendedEntry as unknown as SyntheticEntryV1);
    releaseFirstSubmission?.();

    await expect(replay).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: true,
      matches: true,
      executedEntries: 3,
      mismatches: [],
    });
    expect(appendedCommandReads).toBe(0);
    expect(submitted).toHaveLength(3);
    expect(submitted[1]?.source).toBe("game");
    expect(submitted[1]?.command).not.toBe(originalSecondCommand);
    expect(submitted[1]?.command).toEqual(originalSecondCommand);
  });

  it("submits a captured null command without rereading its replay slot", async () => {
    const fixture = fixtureV1();
    const first = fixture.input.commandLog[0];
    if (first?.source !== "game") throw new TypeError("expected a Game command");
    let commandReads = 0;
    const firstEntry = { ...first } as Record<string, unknown>;
    Object.defineProperty(firstEntry, "command", {
      enumerable: true,
      get() {
        commandReads += 1;
        return commandReads === 1 ? null : first.command;
      },
    });
    const commandLog = replaceEntryV1(
      fixture.input.commandLog,
      0,
      firstEntry as unknown as SyntheticEntryV1,
    );
    const receivedCommands: unknown[] = [];
    const createDriver = vi.fn((base: SyntheticSnapshotV1) => {
      const driver = createDriverV1(base, []);
      let submissionIndex = 0;
      return Object.freeze({
        getCurrentSnapshot: driver.getCurrentSnapshot,
        submit(command: SyntheticLoggedCommandV1) {
          receivedCommands.push(command.command);
          const delegated = submissionIndex === 0
            ? Object.freeze({ source: "game" as const, command: first.command })
            : command;
          submissionIndex += 1;
          return driver.submit(delegated);
        },
      });
    });

    await expect(
      replayAuthoritativelyV1({ ...fixture.input, commandLog, createDriver }),
    ).resolves.toMatchObject({
      authoritative: true,
      matches: true,
      executedEntries: 3,
    });

    expect(commandReads).toBe(1);
    expect(receivedCommands[0]).toBeNull();
    expect(createDriver).toHaveBeenCalledOnce();
  });

  it.each(
    [
      ["engine_digest", { engineDigest: digestV1("engine.other") }],
      ["state_contract_revision", { stateContractRevision: 2 }],
      ["state_contract_digest", { stateContractDigest: digestV1("state.other") }],
      ["simulation_digest", { simulationDigest: digestV1("simulation.other") }],
    ] as const,
  )("blocks on %s before creating or reading a replay session", async (field, change) => {
    const fixture = fixtureV1();
    const createDriver = vi.fn(fixture.input.createDriver);
    const result = await replayAuthoritativelyV1({
      ...fixture.input,
      runtimeIdentity: identityV1(provenanceV1(change), fixture.input.runtimeIdentity.appBuildId),
      createDriver,
    });

    expect(result).toMatchObject({
      authoritative: false,
      identityMatch: false,
      visualMatch: false,
      matches: false,
      executedEntries: 0,
      mismatches: [{ scope: "identity", field }],
    });
    expect(createDriver).not.toHaveBeenCalled();
  });

  it("ignores non-blocking provenance drift and reports presentation/app drift only visually", async () => {
    const fixture = fixtureV1();
    const result = await replayAuthoritativelyV1({
      ...fixture.input,
      runtimeIdentity: identityV1(
        provenanceV1({
          storyId: "story.other",
          storyRevision: 9,
          storyDigest: digestV1("story.other"),
          engineVersion: "display-only",
          presentationDigest: digestV1("presentation.other"),
          patchSet: patchSetV1("other"),
        }),
        digestV1("app-build.other"),
      ),
    });

    expect(result).toMatchObject({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 3,
      mismatches: [],
    });
  });

  it("does not claim an exact visual match when both application identities are absent", async () => {
    const fixture = fixtureV1();
    const result = await replayAuthoritativelyV1({
      ...fixture.input,
      recordedIdentity: identityV1(fixture.input.recordedIdentity.provenance),
      runtimeIdentity: identityV1(fixture.input.runtimeIdentity.provenance),
    });

    expect(result).toMatchObject({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
    });
  });

  it("compares mixed outcomes, ordered events, digests, sequence, and every RNG field", async () => {
    const fixture = fixtureV1();
    await expect(replayAuthoritativelyV1(fixture.input)).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: true,
      matches: true,
      executedEntries: 3,
      mismatches: [],
    });
    expect(fixture.submitted).toHaveLength(3);
    expect(
      fixture.submitted.every(
        (command) => Object.keys(command).toSorted().join() === "command,source",
      ),
    ).toBe(true);
  });

  it("routes Game and Debug log entries through one isolated driver and compares modified integrity", async () => {
    const replayBase = snapshotV1(0, 0);
    const game = Object.freeze({
      source: "game" as const,
      command: Object.freeze({
        kind: "add" as const,
        amount: parseNonNegativeSafeInteger(2),
      }),
    });
    const debug = Object.freeze({
      source: "debug" as const,
      command: Object.freeze({
        kind: "debug_add" as const,
        amount: parseNonNegativeSafeInteger(3),
      }),
    });
    const first = entryV1(1, replayBase, game);
    const second = entryV1(2, first.after, debug);
    const submitted: SyntheticLoggedCommandV1[] = [];
    const commandGateCounter = createSnapshotWorkCounterV1();
    const provenance = provenanceV1();
    const appBuildId = digestV1("app-build");

    await expect(
      replayAuthoritativelyV1({
        recordedIdentity: identityV1(provenance, appBuildId),
        runtimeIdentity: identityV1(provenance, appBuildId),
        replayBase,
        replayBaseStateDigest: stateDigestV1(replayBase),
        commandLog: Object.freeze([first.entry, second.entry]),
        currentSnapshot: second.after,
        currentStateDigest: stateDigestV1(second.after),
        projectStableRejection: ({ code, slot }: SyntheticRejectionV1) =>
          Object.freeze({ code, slot }),
        projectStableFault: ({ code }: SyntheticFaultV1) => Object.freeze({ code }),
        createDriver: (base: SyntheticSnapshotV1) => {
          const driver = createDriverV1(base, submitted);
          return Object.freeze({
            getCurrentSnapshot: driver.getCurrentSnapshot,
            submit(command: SyntheticLoggedCommandV1) {
              admitCanonicalCommandForTargetInternalV1(
                command.command,
                command.source === "debug" ? "simulation_debug_execute" : "simulation_game_execute",
                commandGateCounter.instrumentation,
              );
              return driver.submit(command);
            },
          });
        },
      }),
    ).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: true,
      matches: true,
      executedEntries: 2,
      mismatches: [],
    });
    expect(submitted.map(({ source }) => source)).toEqual(["game", "debug"]);
    expect(commandGateCounter.snapshot()).toMatchObject({
      canonicalTraversals: 0,
      deepFreezeTraversals: 0,
    });
    expect(second.after.integrity).toMatchObject({
      mode: "modified",
      mutationCount: 1,
      reasons: [{ kind: "debug_command", commandKind: "debug_add", sequence: 2 }],
    });
  });

  it("ignores rejection message and fault message/stack drift outside stable projections", async () => {
    const fixture = fixtureV1();
    const rejection = fixture.input.commandLog[1];
    const fault = fixture.input.commandLog[2];
    if (rejection?.outcome.kind !== "rejected" || fault?.outcome.kind !== "faulted") {
      throw new TypeError("missing stable projection fixtures");
    }
    const changedRejection: SyntheticEntryV1 = Object.freeze({
      ...rejection,
      outcome: Object.freeze({
        kind: "rejected",
        reasons: Object.freeze(
          rejection.outcome.reasons.map((reason) =>
            Object.freeze({ ...reason, message: "different local wording" })
          ),
        ),
      }),
    });
    const changedFault: SyntheticEntryV1 = Object.freeze({
      ...fault,
      outcome: Object.freeze({
        kind: "faulted",
        fault: Object.freeze({
          ...fault.outcome.fault,
          message: "different local fault wording",
          stack: "different local stack",
        }),
      }),
    });
    const withRejection = replaceEntryV1(fixture.input.commandLog, 1, changedRejection);

    await expect(
      replayAuthoritativelyV1({
        ...fixture.input,
        commandLog: replaceEntryV1(withRejection, 2, changedFault),
      }),
    ).resolves.toMatchObject({ matches: true, mismatches: [] });
  });

  it("detects stable rejection slot drift", async () => {
    const fixture = fixtureV1();
    const rejection = fixture.input.commandLog[1];
    if (rejection?.outcome.kind !== "rejected") {
      throw new TypeError("missing rejection slot fixture");
    }
    const replacement: SyntheticEntryV1 = Object.freeze({
      ...rejection,
      outcome: Object.freeze({
        kind: "rejected",
        reasons: Object.freeze(
          rejection.outcome.reasons.map((reason) =>
            Object.freeze({ ...reason, slot: "other" as const })
          ),
        ),
      }),
    });
    const result = await replayAuthoritativelyV1({
      ...fixture.input,
      commandLog: replaceEntryV1(fixture.input.commandLog, 1, replacement),
    });

    expect(result.matches).toBe(false);
    expect(result.mismatches).toContainEqual({
      scope: "entry",
      logOrdinal: rejection.logOrdinal,
      field: "reasons",
    });
  });

  it.each(
    [
      ["outcome", 0],
      ["events", 0],
      ["reasons", 1],
      ["fault", 2],
      ["pre_state_digest", 0],
      ["post_state_digest", 0],
      ["command_sequence", 0],
      ["attempted_draws", 0],
      ["committed_rng_before", 0],
      ["candidate_rng_after", 0],
      ["committed_rng_after", 0],
    ] as const,
  )(
    "detects a recorded %s mismatch without applying log evidence",
    async (field, index) => {
      const fixture = fixtureV1();
      const original = fixture.input.commandLog[index];
      if (original === undefined) throw new TypeError("missing replay mutation entry");
      let replacement: SyntheticEntryV1;
      if (field === "outcome") {
        replacement = Object.freeze({
          ...original,
          outcome: Object.freeze({
            kind: "rejected" as const,
            reasons: Object.freeze([
              Object.freeze({
                code: "synthetic.closed",
                slot: "synthetic" as const,
                message: "diagnostic detail",
              }),
            ]),
          }),
        });
      } else if (field === "events") {
        replacement = Object.freeze({
          ...original,
          outcome: Object.freeze({
            kind: "committed" as const,
            events: Object.freeze([
              Object.freeze({
                kind: "value.changed" as const,
                before: parseNonNegativeSafeInteger(999),
                after: parseNonNegativeSafeInteger(1_000),
              }),
            ]),
          }),
        });
      } else if (field === "reasons") {
        replacement = Object.freeze({
          ...original,
          outcome: Object.freeze({
            kind: "rejected" as const,
            reasons: Object.freeze([
              Object.freeze({
                code: "synthetic.other",
                slot: "synthetic" as const,
                message: "changed diagnostic message",
              }),
            ]),
          }),
        });
      } else if (field === "fault") {
        replacement = Object.freeze({
          ...original,
          outcome: Object.freeze({
            kind: "faulted" as const,
            fault: Object.freeze({
              code: "synthetic.other",
              operation: "synthetic.execute" as const,
              message: "changed diagnostic message",
              stack: "changed diagnostic stack",
            }),
          }),
        });
      } else if (field === "pre_state_digest") {
        replacement = Object.freeze({ ...original, preStateDigest: digestV1(`wrong.${field}`) });
      } else if (field === "post_state_digest") {
        replacement = Object.freeze({ ...original, postStateDigest: digestV1(`wrong.${field}`) });
      } else if (field === "command_sequence") {
        replacement = Object.freeze({
          ...original,
          commandSequence: Object.freeze({
            before: parseNonNegativeSafeInteger(99),
            after: original.commandSequence.after,
          }),
        });
      } else if (field === "attempted_draws") {
        replacement = Object.freeze({ ...original, attemptedDraws: Object.freeze([]) });
      } else if (field === "candidate_rng_after") {
        replacement = Object.freeze({ ...original, candidateRngAfter: rngStateV1(7, 7) });
      } else if (field === "committed_rng_before") {
        replacement = Object.freeze({ ...original, committedRngBefore: rngStateV1(7, 7) });
      } else {
        replacement = Object.freeze({ ...original, committedRngAfter: rngStateV1(7, 7) });
      }

      const result = await replayAuthoritativelyV1({
        ...fixture.input,
        commandLog: replaceEntryV1(fixture.input.commandLog, index, replacement),
      });
      expect(result.matches).toBe(false);
      expect(result.mismatches).toContainEqual({
        scope: "entry",
        logOrdinal: original.logOrdinal,
        field,
      });
      expect(result.mismatches).not.toContainEqual({
        scope: "final",
        field: "current_state_digest",
      });
      expect(fixture.submitted).toHaveLength(3);
    },
  );

  it("checks both declared digests and base/final integrity even for an empty log", async () => {
    const base = snapshotV1(4, 0);
    const submitted: SyntheticLoggedCommandV1[] = [];
    const provenance = provenanceV1();
    const result = await replayAuthoritativelyV1({
      recordedIdentity: identityV1(provenance),
      runtimeIdentity: identityV1(provenance),
      replayBase: base,
      replayBaseStateDigest: digestV1("wrong.base"),
      commandLog: Object.freeze([]),
      currentSnapshot: snapshotV1(4, 0, base.rng, modifiedIntegrityV1()),
      currentStateDigest: digestV1("wrong.current"),
      projectStableRejection: ({ code, slot }) => Object.freeze({ code, slot }),
      projectStableFault: ({ code }) => Object.freeze({ code }),
      createDriver: (snapshot) => createDriverV1(snapshot, submitted),
    });

    expect(result.executedEntries).toBe(0);
    expect(result.matches).toBe(false);
    expect(result.mismatches).toEqual(
      expect.arrayContaining([
        { scope: "replay_base", field: "state_digest" },
        { scope: "final", field: "declared_current_state_digest" },
        { scope: "final", field: "integrity" },
        { scope: "final", field: "current_state_digest" },
      ]),
    );
    expect(submitted).toEqual([]);
  });

  it("detects an isolated driver that does not preserve replay-base integrity", async () => {
    const fixture = fixtureV1();
    const result = await replayAuthoritativelyV1({
      ...fixture.input,
      createDriver: (base) =>
        createDriverV1(
          snapshotV1(base.state.value, base.commandSequence, base.rng, modifiedIntegrityV1()),
          fixture.submitted,
        ),
    });

    expect(result.matches).toBe(false);
    expect(result.mismatches).toContainEqual({ scope: "replay_base", field: "integrity" });
  });
});

describe("best-effort replay inspection", () => {
  it("preserves permissive inspection for a fractional recorded command", async () => {
    const fixture = fixtureV1();
    const first = fixture.input.commandLog[0];
    if (first?.source !== "game" || first.command.kind !== "add") {
      throw new TypeError("expected the first replay command to be additive");
    }
    const commandLog = replaceEntryV1(
      fixture.input.commandLog,
      0,
      Object.freeze({
        ...first,
        command: Object.freeze({
          ...first.command,
          amount: 0.25 as NonNegativeSafeInteger,
        }),
      }),
    );
    const submitted: SyntheticLoggedCommandV1[] = [];

    const result = await inspectReplayBestEffortV1({
      ...fixture.input,
      commandLog,
      createDriver(base) {
        const driver = createDriverV1(base, []);
        return Object.freeze({
          getCurrentSnapshot: driver.getCurrentSnapshot,
          submit(command: SyntheticLoggedCommandV1) {
            submitted.push(command);
            const executable = command.source === "game" && command.command.kind === "add"
              ? Object.freeze({
                source: "game" as const,
                command: Object.freeze({
                  ...command.command,
                  amount: parseNonNegativeSafeInteger(2),
                }),
              })
              : command;
            return driver.submit(executable);
          },
        });
      },
    });

    expect(submitted[0]).toMatchObject({
      source: "game",
      command: { kind: "add", amount: 0.25 },
    });
    expect(result).toEqual({
      authoritative: false,
      identityMatch: true,
      visualMatch: true,
      matches: true,
      executedEntries: 3,
      mismatches: [],
    });
  });

  it("executes only in an isolated driver across blocking drift but never claims authority", async () => {
    const fixture = fixtureV1();
    const result = await inspectReplayBestEffortV1({
      ...fixture.input,
      runtimeIdentity: identityV1(provenanceV1({ simulationDigest: digestV1("simulation.other") })),
    });

    expect(result).toMatchObject({
      authoritative: false,
      identityMatch: false,
      visualMatch: false,
      matches: false,
      executedEntries: 3,
    });
    expect(result.mismatches).toContainEqual({ scope: "identity", field: "simulation_digest" });
    expect(fixture.submitted).toHaveLength(3);
  });
});
