// SPDX-License-Identifier: MIT
import { digestCanonicalInternalV1 } from "../../contracts/digest.ts";
import { projectCanonicalJsonInternalV1 } from "../../contracts/canonical-json.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.ts";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
} from "../../contracts/values.ts";
import { parsePositiveSafeInteger } from "../../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "../../internal/snapshot-work-instrumentation.ts";
import { recordSnapshotWorkV1 } from "../../internal/snapshot-work-instrumentation.ts";
import { admitCanonicalCommandInternalV1 } from "../../internal/canonical-command-admission.ts";
import { admitFinalizedCommandAttemptEvidenceInternalV1 } from "../../internal/finalized-evidence-admission.ts";

interface CommandLogSnapshotV1 {
  readonly rng: unknown;
  readonly commandSequence: NonNegativeSafeInteger;
}

export type CommandLogCommandSourceV1 = "game" | "debug";

interface LoggedCommandShapeV1 {
  readonly source: CommandLogCommandSourceV1;
  readonly command: unknown;
}

interface CommandLogEntryBaseForV1<TRngState, TRngDrawTrace> {
  readonly logOrdinal: PositiveSafeInteger;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
  readonly commandSequence: {
    readonly before: NonNegativeSafeInteger;
    readonly after: NonNegativeSafeInteger;
  };
  readonly committedRngBefore: TRngState;
  readonly attemptedDraws: readonly TRngDrawTrace[];
  readonly candidateRngAfter?: TRngState;
  readonly committedRngAfter: TRngState;
}

type CommandLogOutcomeV1<TEvent, TRejection, TFault> =
  | { readonly kind: "committed"; readonly events: readonly TEvent[] }
  | { readonly kind: "rejected"; readonly reasons: readonly TRejection[] }
  | { readonly kind: "faulted"; readonly fault: TFault };

type CommandLogEngineFieldV1<TRngState, TRngDrawTrace> =
  | keyof LoggedCommandShapeV1
  | keyof CommandLogEntryBaseForV1<TRngState, TRngDrawTrace>
  | "outcome";

type CommandLogEntryForV1<TLoggedCommand, TEvent, TRejection, TFault, TRngState, TRngDrawTrace> =
  TLoggedCommand extends LoggedCommandShapeV1 ? DeepReadonly<
      & CommandLogEntryBaseForV1<TRngState, TRngDrawTrace>
      & Pick<TLoggedCommand, keyof LoggedCommandShapeV1>
      & Omit<TLoggedCommand, CommandLogEngineFieldV1<TRngState, TRngDrawTrace>>
      & {
        readonly outcome: CommandLogOutcomeV1<TEvent, TRejection, TFault>;
      }
    >
    : never;

interface InternalCommandLogEntryV1<TSnapshot, TEntry> {
  readonly entry: TEntry;
  readonly postAttemptSnapshot: DeepReadonly<TSnapshot>;
}

export type FinalizedCommandAttemptV1<
  TSnapshot extends CommandLogSnapshotV1 = CommandLogSnapshotV1,
  TEvent = unknown,
  TRejection = unknown,
  TFault = unknown,
  TRngState = TSnapshot["rng"],
  TRngDrawTrace = unknown,
> =
  & DeepReadonly<
    CommandExecutionAttemptEnvelopeV1<
      TSnapshot,
      TEvent,
      TRejection,
      TFault,
      TRngState,
      TRngDrawTrace
    >
  >
  & {
    readonly preSnapshot: DeepReadonly<TSnapshot>;
    readonly preStateDigest: Digest;
    readonly postStateDigest: Digest;
  };

interface PreparedCommandLogAnchorV1<TSnapshot> {
  readonly snapshot: DeepReadonly<TSnapshot>;
  readonly stateDigest: Digest;
  readonly nextOrdinal: PositiveSafeInteger;
  readonly emptyEntries: never[];
}

export interface CommandLogV1<
  TSnapshot extends CommandLogSnapshotV1,
  TLoggedCommand extends LoggedCommandShapeV1,
  TEvent = unknown,
  TRejection = unknown,
  TFault = unknown,
  TRngState = TSnapshot["rng"],
  TRngDrawTrace = unknown,
> {
  append(
    loggedCommand: DeepReadonly<TLoggedCommand>,
    finalizedAttempt: FinalizedCommandAttemptV1<
      TSnapshot,
      TEvent,
      TRejection,
      TFault,
      TRngState,
      TRngDrawTrace
    >,
  ): CommandLogEntryForV1<TLoggedCommand, TEvent, TRejection, TFault, TRngState, TRngDrawTrace>;
  entries(): readonly CommandLogEntryForV1<
    TLoggedCommand,
    TEvent,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >[];
  replayBase(): DeepReadonly<TSnapshot>;
  replayBaseStateDigest(): Digest;
  prepareAnchor(snapshot: DeepReadonly<TSnapshot>): PreparedCommandLogAnchorV1<TSnapshot>;
  establishPreparedAnchor(prepared: PreparedCommandLogAnchorV1<TSnapshot>): void;
  establishAnchor(snapshot: DeepReadonly<TSnapshot>): void;
}

type CommandLogInternalV1<
  TSnapshot extends CommandLogSnapshotV1,
  TLoggedCommand extends LoggedCommandShapeV1,
  TEvent = unknown,
  TRejection = unknown,
  TFault = unknown,
  TRngState = TSnapshot["rng"],
  TRngDrawTrace = unknown,
> =
  & CommandLogV1<
    TSnapshot,
    TLoggedCommand,
    TEvent,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >
  & {
    latestEntryInternalV1():
      | CommandLogEntryForV1<
        TLoggedCommand,
        TEvent,
        TRejection,
        TFault,
        TRngState,
        TRngDrawTrace
      >
      | undefined;
  };

const commandLogMaximumEntriesV1 = 200;

const commandLogReservedFieldsV1 = new Set<PropertyKey>([
  "source",
  "command",
  "logOrdinal",
  "preStateDigest",
  "postStateDigest",
  "commandSequence",
  "committedRngBefore",
  "attemptedDraws",
  "candidateRngAfter",
  "committedRngAfter",
  "outcome",
]);

function projectAdditionalLoggedCommandFieldsV1(
  loggedCommand: object,
  instrumentation?: SnapshotWorkInstrumentationV1,
): Readonly<Record<string, unknown>> | undefined {
  const entries: Array<readonly [string, unknown]> = [];
  for (const [key, value] of Object.entries(loggedCommand)) {
    if (key === "source" || key === "command") continue;
    if (commandLogReservedFieldsV1.has(key)) {
      throw new TypeError(`CommandLog logged-command field ${key} is engine-owned`);
    }
    entries.push([key, value]);
  }
  if (entries.length === 0) return undefined;
  return projectCanonicalJsonInternalV1(
    Object.fromEntries(entries),
    instrumentation,
    "command_log_metadata_admission",
  ).value;
}

function createOutcomeV1<
  TSnapshot extends CommandLogSnapshotV1,
  TEvent,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  attempt: FinalizedCommandAttemptV1<
    TSnapshot,
    TEvent,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >,
): DeepReadonly<CommandLogOutcomeV1<TEvent, TRejection, TFault>> {
  switch (attempt.result.kind) {
    case "committed":
      return {
        kind: "committed",
        events: [...attempt.result.events],
      };
    case "rejected":
      return {
        kind: "rejected",
        reasons: [...attempt.result.reasons],
      };
    case "faulted":
      return { kind: "faulted", fault: attempt.result.fault };
  }
  throw new TypeError("Finalized command attempt has an invalid outcome");
}

function validateFinalizedAttemptV1<
  TSnapshot extends CommandLogSnapshotV1,
  TEvent,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace,
>(
  expectedPreSnapshot: DeepReadonly<TSnapshot>,
  expectedPreStateDigest: Digest,
  attempt: FinalizedCommandAttemptV1<
    TSnapshot,
    TEvent,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >,
  auditStateDigests: boolean,
  instrumentation?: SnapshotWorkInstrumentationV1,
): void {
  recordSnapshotWorkV1(instrumentation, "command_log_continuity_verification");
  if (attempt.preSnapshot !== expectedPreSnapshot) {
    throw new TypeError("Finalized command attempt breaks snapshot continuity");
  }
  if (auditStateDigests) {
    if (
      attempt.preStateDigest !==
        digestCanonicalInternalV1("sillymaker:state:v1", attempt.preSnapshot, instrumentation)
    ) {
      throw new TypeError("Finalized command attempt pre-state digest mismatch");
    }
    if (
      attempt.postStateDigest !==
        digestCanonicalInternalV1("sillymaker:state:v1", attempt.result.snapshot, instrumentation)
    ) {
      throw new TypeError("Finalized command attempt post-state digest mismatch");
    }
  }
  if (attempt.preStateDigest !== expectedPreStateDigest) {
    throw new TypeError("Finalized command attempt breaks digest continuity");
  }
  if (attempt.result.kind !== "committed" && attempt.postStateDigest !== attempt.preStateDigest) {
    throw new TypeError("Non-committed finalized attempt changed the state digest");
  }
  if (attempt.result.kind !== "committed" && attempt.result.snapshot !== attempt.preSnapshot) {
    throw new TypeError("Non-committed finalized attempt changed the Snapshot");
  }
}

/** @internal Instrumented Session path; intentionally absent from package barrels. */
export function createCommandLogInternalV1<
  TSnapshot extends CommandLogSnapshotV1,
  TLoggedCommand extends LoggedCommandShapeV1 = LoggedCommandShapeV1,
  TEvent = unknown,
  TRejection = unknown,
  TFault = unknown,
  TRngState = TSnapshot["rng"],
  TRngDrawTrace = unknown,
>(
  input: {
    readonly replayBase: DeepReadonly<TSnapshot>;
    readonly replayBaseStateDigest?: Digest;
    readonly limit: number;
    readonly auditStateDigests: boolean;
    readonly admitExternalInputs?: boolean;
  },
  instrumentation?: SnapshotWorkInstrumentationV1,
): CommandLogInternalV1<
  TSnapshot,
  TLoggedCommand,
  TEvent,
  TRejection,
  TFault,
  TRngState,
  TRngDrawTrace
> {
  type PublicEntry = CommandLogEntryForV1<
    TLoggedCommand,
    TEvent,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  >;
  type InternalEntry = InternalCommandLogEntryV1<TSnapshot, PublicEntry>;

  const limit = parsePositiveSafeInteger(input.limit);
  if (limit > commandLogMaximumEntriesV1) {
    throw new TypeError(`CommandLog limit exceeds ${commandLogMaximumEntriesV1}`);
  }

  let replayBase = input.replayBase;
  let replayBaseDigest = input.replayBaseStateDigest ??
    digestCanonicalInternalV1("sillymaker:state:v1", replayBase, instrumentation);
  let nextOrdinal = parsePositiveSafeInteger(1);
  const internalEntries: InternalEntry[] = [];
  const publicEntries: PublicEntry[] = [];
  let publicEntriesSnapshot: readonly PublicEntry[] | undefined = [];

  const log: CommandLogInternalV1<
    TSnapshot,
    TLoggedCommand,
    TEvent,
    TRejection,
    TFault,
    TRngState,
    TRngDrawTrace
  > = {
    append(loggedCommand, finalizedAttempt) {
      const source = loggedCommand.source;
      if (source !== "game" && source !== "debug") {
        throw new TypeError("CommandLog source must be game or debug");
      }
      if (
        source === "debug" &&
        finalizedAttempt.result.kind === "rejected"
      ) {
        throw new TypeError("Debug CommandLog entries cannot be rejected");
      }
      const command = input.admitExternalInputs === true
        ? admitCanonicalCommandInternalV1(loggedCommand.command, instrumentation)
        : loggedCommand.command;
      const admittedAttempt = input.admitExternalInputs === true
        ? admitFinalizedCommandAttemptEvidenceInternalV1(finalizedAttempt, instrumentation)
        : finalizedAttempt;
      const preAttemptSnapshot = internalEntries.at(-1)?.postAttemptSnapshot ?? replayBase;
      const preAttemptStateDigest = internalEntries.at(-1)?.entry.postStateDigest ??
        replayBaseDigest;
      validateFinalizedAttemptV1(
        preAttemptSnapshot,
        preAttemptStateDigest,
        admittedAttempt,
        input.auditStateDigests,
        instrumentation,
      );

      const additionalLoggedCommandFields = projectAdditionalLoggedCommandFieldsV1(
        loggedCommand,
        instrumentation,
      );
      const postAttemptSnapshot = admittedAttempt.result.snapshot;
      const diagnostics = admittedAttempt.diagnostics;
      const entry = {
        source,
        command,
        ...additionalLoggedCommandFields,
        logOrdinal: nextOrdinal,
        preStateDigest: admittedAttempt.preStateDigest,
        postStateDigest: admittedAttempt.postStateDigest,
        commandSequence: {
          before: admittedAttempt.preSnapshot.commandSequence,
          after: postAttemptSnapshot.commandSequence,
        },
        committedRngBefore: diagnostics.committedRngBefore,
        attemptedDraws: [...diagnostics.attemptedDraws],
        ...(diagnostics.candidateRngAfter === undefined
          ? {}
          : { candidateRngAfter: diagnostics.candidateRngAfter }),
        committedRngAfter: diagnostics.committedRngAfter,
        outcome: createOutcomeV1(admittedAttempt),
      } as PublicEntry;
      const followingOrdinal = parsePositiveSafeInteger(nextOrdinal + 1);
      const internalEntry = {
        entry,
        postAttemptSnapshot,
      } as InternalEntry;

      if (internalEntries.length === limit) {
        const evicted = internalEntries[0];
        if (evicted === undefined) throw new TypeError("CommandLog eviction invariant failed");
        replayBase = evicted.postAttemptSnapshot;
        replayBaseDigest = evicted.entry.postStateDigest;
        internalEntries.shift();
        publicEntries.shift();
      }
      internalEntries.push(internalEntry);
      publicEntries.push(entry);
      publicEntriesSnapshot = undefined;
      nextOrdinal = followingOrdinal;
      return entry;
    },
    entries() {
      publicEntriesSnapshot ??= [...publicEntries];
      return publicEntriesSnapshot;
    },
    latestEntryInternalV1: () => publicEntries.at(-1),
    replayBase: () => replayBase,
    replayBaseStateDigest: () => replayBaseDigest,
    prepareAnchor(snapshot) {
      return {
        snapshot,
        stateDigest: digestCanonicalInternalV1("sillymaker:state:v1", snapshot, instrumentation),
        nextOrdinal: parsePositiveSafeInteger(1),
        emptyEntries: [],
      };
    },
    establishPreparedAnchor(prepared) {
      replayBase = prepared.snapshot;
      replayBaseDigest = prepared.stateDigest;
      internalEntries.length = 0;
      publicEntries.length = 0;
      nextOrdinal = prepared.nextOrdinal;
      publicEntriesSnapshot = prepared.emptyEntries;
    },
    establishAnchor(snapshot) {
      log.establishPreparedAnchor(log.prepareAnchor(snapshot));
    },
  };

  return log;
}

export function createCommandLogV1<
  TSnapshot extends CommandLogSnapshotV1,
  TLoggedCommand extends LoggedCommandShapeV1 = LoggedCommandShapeV1,
  TEvent = unknown,
  TRejection = unknown,
  TFault = unknown,
  TRngState = TSnapshot["rng"],
  TRngDrawTrace = unknown,
>(input: {
  readonly replayBase: DeepReadonly<TSnapshot>;
  readonly limit: number;
}): CommandLogV1<TSnapshot, TLoggedCommand, TEvent, TRejection, TFault, TRngState, TRngDrawTrace> {
  return createCommandLogInternalV1({
    replayBase: input.replayBase,
    limit: input.limit,
    auditStateDigests: true,
    admitExternalInputs: true,
  });
}
