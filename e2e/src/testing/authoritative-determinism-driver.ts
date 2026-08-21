// SPDX-License-Identifier: MIT
import {
  authoritativeDeterminismCommandClassesV1,
  prepareAuthoritativeDeterminismWorkloadV1,
  runAuthoritativeDeterminismTranscriptV1,
} from "@sillymaker/base/testkit/authoritative-determinism";
import type {
  AuthoritativeDeterminismCommandClassV1,
  AuthoritativeDeterminismCommandLogEntryV1,
  AuthoritativeDeterminismDispatchResultV1,
} from "@sillymaker/base/testkit/authoritative-determinism";

export type AuthoritativeDeterminismTraceRngStateV1 = readonly [
  cursor: number,
  rawDrawCount: number,
];

export interface AuthoritativeDeterminismTraceDrawV1 {
  readonly ordinal: number;
  readonly purpose: string;
  readonly exclusiveMax: number;
  readonly result: number;
  readonly before: AuthoritativeDeterminismTraceRngStateV1;
  readonly after: AuthoritativeDeterminismTraceRngStateV1;
}

export type AuthoritativeDeterminismTraceOutcomeV1 =
  | {
    readonly kind: "committed";
    readonly events: readonly {
      readonly kind: "determinism.committed";
      readonly commandClass: "no_draw_committed" | "rng_committed";
      readonly result: number | null;
    }[];
  }
  | {
    readonly kind: "rejected";
    readonly reasons: readonly { readonly code: "determinism.rejected" }[];
  }
  | {
    readonly kind: "faulted";
    readonly fault: { readonly code: "determinism.faulted" };
  };

export interface AuthoritativeDeterminismCommandTraceV1 {
  readonly command: { readonly kind: AuthoritativeDeterminismCommandClassV1 };
  readonly dispatch: "executed";
  readonly outcome: AuthoritativeDeterminismTraceOutcomeV1;
  readonly status: "ready" | "fault_paused";
  readonly snapshot: {
    readonly retained: boolean;
    readonly digests: { readonly before: string; readonly after: string };
    readonly sequence: { readonly before: number; readonly after: number };
  };
  readonly rng: {
    readonly committedBefore: AuthoritativeDeterminismTraceRngStateV1;
    readonly attemptedDraws: readonly AuthoritativeDeterminismTraceDrawV1[];
    readonly candidateAfter: AuthoritativeDeterminismTraceRngStateV1;
    readonly committedAfter: AuthoritativeDeterminismTraceRngStateV1;
  };
  readonly log: {
    readonly source: "game";
    readonly ordinal: number;
    readonly outcome: AuthoritativeDeterminismTraceOutcomeV1;
  };
}

export interface AuthoritativeDeterminismTraceV1 {
  readonly schemaVersion: 1;
  readonly workload: "authoritative-determinism-v1";
  readonly rngAlgorithm: "xorshift32-v1";
  readonly commands: readonly AuthoritativeDeterminismCommandTraceV1[];
}

export interface AuthoritativeDeterminismBootstrapInputV1 {
  readonly schemaVersion: 1;
  readonly rngSeed: number;
}

export function verifyTripwireDeterministicDateOperationsV1(): void {
  const epoch = new Date(0);
  const parsedEpoch = Date.parse("1970-01-01T00:00:00Z");
  const parsedTenths = Date.parse("1970-01-01T00:00:00.1Z");
  const parsedHundredths = Date.parse("1970-01-01T00:00:00.12+00:00");
  const constructedEpoch = new Date("1970-01-01T00:00:00Z");
  const constructedTenths = new Date("1970-01-01T00:00:00.1Z");
  const constructedHundredths = new Date("1970-01-01T00:00:00.12+00:00");
  const utcEpoch = Date.UTC(1970, 0, 1, 0, 0, 0, 0);
  if (
    epoch.toISOString() !== "1970-01-01T00:00:00.000Z" || parsedEpoch !== 0 ||
    parsedTenths !== 100 || parsedHundredths !== 120 ||
    constructedEpoch.getTime() !== 0 || constructedTenths.getTime() !== 100 ||
    constructedHundredths.getTime() !== 120 || utcEpoch !== 0
  ) {
    throw new TypeError("deterministic Date operations changed inside the tripwire realm");
  }
}

function parseAuthoritativeDeterminismBootstrapInputV1(
  value: unknown,
): AuthoritativeDeterminismBootstrapInputV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError("invalid authoritative determinism bootstrap input");
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== 2 ||
    !keys.includes("schemaVersion") ||
    !keys.includes("rngSeed") ||
    Reflect.get(value, "schemaVersion") !== 1 ||
    typeof Reflect.get(value, "rngSeed") !== "number"
  ) {
    throw new TypeError("invalid authoritative determinism bootstrap input");
  }
  return Object.freeze({
    schemaVersion: 1,
    rngSeed: Reflect.get(value, "rngSeed") as number,
  });
}

type TraceOutcomeInputV1 =
  | {
    readonly kind: "committed";
    readonly events: readonly {
      readonly kind: "determinism.committed";
      readonly commandClass: "no_draw_committed" | "rng_committed";
      readonly result: number | null;
    }[];
  }
  | {
    readonly kind: "rejected";
    readonly reasons: readonly { readonly code: "determinism.rejected" }[];
  }
  | {
    readonly kind: "faulted";
    readonly fault: { readonly code: "determinism.faulted" };
  };

interface TraceRngStateInputV1 {
  readonly algorithm: "xorshift32-v1";
  readonly cursor: number;
  readonly rawDrawCount: number;
}

function traceRngStateV1(
  state: TraceRngStateInputV1,
): AuthoritativeDeterminismTraceRngStateV1 {
  if (state.algorithm !== "xorshift32-v1") {
    throw new TypeError("Authoritative determinism workload changed RNG algorithm");
  }
  return Object.freeze([state.cursor, state.rawDrawCount]);
}

function traceOutcomeV1(outcome: TraceOutcomeInputV1): AuthoritativeDeterminismTraceOutcomeV1 {
  switch (outcome.kind) {
    case "committed":
      return Object.freeze({
        kind: "committed",
        events: Object.freeze(
          outcome.events.map((event) =>
            Object.freeze({
              kind: event.kind,
              commandClass: event.commandClass,
              result: event.result,
            })
          ),
        ),
      });
    case "rejected":
      return Object.freeze({
        kind: "rejected",
        reasons: Object.freeze(
          outcome.reasons.map((reason) => Object.freeze({ code: reason.code })),
        ),
      });
    case "faulted":
      return Object.freeze({
        kind: "faulted",
        fault: Object.freeze({ code: outcome.fault.code }),
      });
  }
  throw new TypeError("Authoritative determinism outcome kind is invalid");
}

const initialRngV1 = Object.freeze([97, 0] as const);
const drawnRngV1 = Object.freeze([25_701_511, 1] as const);
const attemptedDrawV1 = Object.freeze({
  ordinal: 1,
  purpose: "check:determinism.workload",
  exclusiveMax: 7,
  result: 3,
  before: initialRngV1,
  after: drawnRngV1,
});
const initialDigestV1 = "sha256:a59f3a725667dd295c173264e707a8f92b8eddf3609e14d27685ffbc5e3a2966";
const noDrawDigestV1 = "sha256:80b2dc3a69418b738e7bde9818543858b7e07caa518f543b730f7591ff646e27";
const drawnDigestV1 = "sha256:64cb7c488d923ccc3a227ca569883f51952f1ec3de76795529c9163cd4fd6227";
const noDrawOutcomeV1 = Object.freeze({
  kind: "committed" as const,
  events: Object.freeze([
    Object.freeze({
      kind: "determinism.committed" as const,
      commandClass: "no_draw_committed" as const,
      result: null,
    }),
  ]),
});
const drawnOutcomeV1 = Object.freeze({
  kind: "committed" as const,
  events: Object.freeze([
    Object.freeze({
      kind: "determinism.committed" as const,
      commandClass: "rng_committed" as const,
      result: 3,
    }),
  ]),
});
const rejectedOutcomeV1 = Object.freeze({
  kind: "rejected" as const,
  reasons: Object.freeze([Object.freeze({ code: "determinism.rejected" as const })]),
});
const faultedOutcomeV1 = Object.freeze({
  kind: "faulted" as const,
  fault: Object.freeze({ code: "determinism.faulted" as const }),
});

/** Fixed DET0 oracle shared by the Deno and Chromium characterization tests. */
export const authoritativeDeterminismTraceExpectedV1: AuthoritativeDeterminismTraceV1 = Object
  .freeze({
    schemaVersion: 1,
    workload: "authoritative-determinism-v1",
    rngAlgorithm: "xorshift32-v1",
    commands: Object.freeze([
      Object.freeze({
        command: Object.freeze({ kind: "no_draw_committed" }),
        dispatch: "executed",
        outcome: noDrawOutcomeV1,
        status: "ready",
        snapshot: Object.freeze({
          retained: false,
          digests: Object.freeze({ before: initialDigestV1, after: noDrawDigestV1 }),
          sequence: Object.freeze({ before: 0, after: 1 }),
        }),
        rng: Object.freeze({
          committedBefore: initialRngV1,
          attemptedDraws: Object.freeze([]),
          candidateAfter: initialRngV1,
          committedAfter: initialRngV1,
        }),
        log: Object.freeze({ source: "game", ordinal: 1, outcome: noDrawOutcomeV1 }),
      }),
      Object.freeze({
        command: Object.freeze({ kind: "rng_committed" }),
        dispatch: "executed",
        outcome: drawnOutcomeV1,
        status: "ready",
        snapshot: Object.freeze({
          retained: false,
          digests: Object.freeze({ before: initialDigestV1, after: drawnDigestV1 }),
          sequence: Object.freeze({ before: 0, after: 1 }),
        }),
        rng: Object.freeze({
          committedBefore: initialRngV1,
          attemptedDraws: Object.freeze([attemptedDrawV1]),
          candidateAfter: drawnRngV1,
          committedAfter: drawnRngV1,
        }),
        log: Object.freeze({ source: "game", ordinal: 1, outcome: drawnOutcomeV1 }),
      }),
      Object.freeze({
        command: Object.freeze({ kind: "rejected" }),
        dispatch: "executed",
        outcome: rejectedOutcomeV1,
        status: "ready",
        snapshot: Object.freeze({
          retained: true,
          digests: Object.freeze({ before: initialDigestV1, after: initialDigestV1 }),
          sequence: Object.freeze({ before: 0, after: 0 }),
        }),
        rng: Object.freeze({
          committedBefore: initialRngV1,
          attemptedDraws: Object.freeze([attemptedDrawV1]),
          candidateAfter: drawnRngV1,
          committedAfter: initialRngV1,
        }),
        log: Object.freeze({ source: "game", ordinal: 1, outcome: rejectedOutcomeV1 }),
      }),
      Object.freeze({
        command: Object.freeze({ kind: "faulted" }),
        dispatch: "executed",
        outcome: faultedOutcomeV1,
        status: "fault_paused",
        snapshot: Object.freeze({
          retained: true,
          digests: Object.freeze({ before: initialDigestV1, after: initialDigestV1 }),
          sequence: Object.freeze({ before: 0, after: 0 }),
        }),
        rng: Object.freeze({
          committedBefore: initialRngV1,
          attemptedDraws: Object.freeze([attemptedDrawV1]),
          candidateAfter: drawnRngV1,
          committedAfter: initialRngV1,
        }),
        log: Object.freeze({ source: "game", ordinal: 1, outcome: faultedOutcomeV1 }),
      }),
    ]),
  });

function commandTraceV1(input: {
  readonly commandClass: AuthoritativeDeterminismCommandClassV1;
  readonly dispatchResult: AuthoritativeDeterminismDispatchResultV1;
  readonly status: string;
  readonly snapshotRetained: boolean;
  readonly entry: AuthoritativeDeterminismCommandLogEntryV1;
}): AuthoritativeDeterminismCommandTraceV1 {
  if (input.dispatchResult.kind !== "executed") {
    throw new TypeError(
      `Authoritative determinism command was not executed: ${input.commandClass}`,
    );
  }
  const entry = input.entry;
  if (entry.candidateRngAfter === undefined) {
    throw new TypeError(
      `Authoritative determinism RNG candidate is missing: ${input.commandClass}`,
    );
  }
  if (entry.command.kind !== input.commandClass) {
    throw new TypeError(
      `Authoritative determinism command identity changed: ${input.commandClass}`,
    );
  }
  if (input.status !== "ready" && input.status !== "fault_paused") {
    throw new TypeError(`Authoritative determinism Session status is invalid: ${input.status}`);
  }
  return Object.freeze({
    command: Object.freeze({ kind: entry.command.kind }),
    dispatch: "executed" as const,
    outcome: traceOutcomeV1(input.dispatchResult.execution),
    status: input.status,
    snapshot: Object.freeze({
      retained: input.snapshotRetained,
      digests: Object.freeze({
        before: entry.preStateDigest,
        after: entry.postStateDigest,
      }),
      sequence: Object.freeze({
        before: entry.commandSequence.before,
        after: entry.commandSequence.after,
      }),
    }),
    rng: Object.freeze({
      committedBefore: traceRngStateV1(entry.committedRngBefore),
      attemptedDraws: Object.freeze(
        entry.attemptedDraws.map((draw) =>
          Object.freeze({
            ordinal: draw.ordinal,
            purpose: draw.purpose,
            exclusiveMax: draw.exclusiveMax,
            result: draw.result,
            before: traceRngStateV1(draw.before),
            after: traceRngStateV1(draw.after),
          })
        ),
      ),
      candidateAfter: traceRngStateV1(entry.candidateRngAfter),
      committedAfter: traceRngStateV1(entry.committedRngAfter),
    }),
    log: Object.freeze({
      source: entry.source,
      ordinal: entry.logOrdinal,
      outcome: traceOutcomeV1(entry.outcome),
    }),
  });
}

/** Runs the same neutral per-command trace in Deno or a Vite-served browser realm. */
export async function collectAuthoritativeDeterminismTraceV1(
  input: AuthoritativeDeterminismBootstrapInputV1,
): Promise<
  AuthoritativeDeterminismTraceV1
> {
  const bootstrapInput = parseAuthoritativeDeterminismBootstrapInputV1(input);
  const commands: AuthoritativeDeterminismCommandTraceV1[] = [];
  for (const commandClass of authoritativeDeterminismCommandClassesV1) {
    const prepared = prepareAuthoritativeDeterminismWorkloadV1({
      commandClass,
      bootstrapInput,
    });
    const run = await prepared.runOnce();
    const entry = run.commandLog[0];
    if (entry === undefined || run.commandLog.length !== 1) {
      throw new TypeError(`Authoritative determinism command log is invalid: ${commandClass}`);
    }
    commands.push(
      commandTraceV1({
        commandClass,
        dispatchResult: run.dispatchResult,
        status: run.status,
        snapshotRetained: run.snapshotRetained,
        entry,
      }),
    );
  }
  return Object.freeze({
    schemaVersion: 1,
    workload: "authoritative-determinism-v1",
    rngAlgorithm: "xorshift32-v1",
    commands: Object.freeze(commands),
  });
}

/** Collects the maintained four-command trace from one Session plus its full replay. */
export async function collectAuthoritativeDeterminismTranscriptTraceV1(
  input: AuthoritativeDeterminismBootstrapInputV1,
) {
  const bootstrapInput = parseAuthoritativeDeterminismBootstrapInputV1(input);
  const run = await runAuthoritativeDeterminismTranscriptV1({ bootstrapInput });
  return Object.freeze({
    commands: Object.freeze(
      run.steps.map((step) =>
        commandTraceV1({
          commandClass: step.commandClass,
          dispatchResult: step.dispatchResult,
          status: step.status,
          snapshotRetained: step.snapshotRetained,
          entry: step.commandLogEntry,
        })
      ),
    ),
    replay: run.replay,
  });
}
