// SPDX-License-Identifier: MIT
import type { NonNegativeSafeInteger, RuntimeSchemaV1 } from "./values.ts";
import { parseNonNegativeSafeInteger } from "./values.ts";

export type RunIntegrityReasonV1 =
  | {
    readonly kind: "debug_command";
    readonly commandKind: string;
    readonly sequence: NonNegativeSafeInteger;
  }
  | {
    readonly kind: "fixture_anchor";
    readonly fixtureId: string;
    readonly sequence: NonNegativeSafeInteger;
  }
  | {
    readonly kind: "debug_bundle_anchor";
    readonly sequence: NonNegativeSafeInteger;
  };

export interface RunIntegrityV1 {
  readonly mode: "normal" | "modified";
  readonly mutationCount: NonNegativeSafeInteger;
  readonly firstMutationSequence: NonNegativeSafeInteger | null;
  readonly reasons: readonly RunIntegrityReasonV1[];
}

export interface GameSnapshotEnvelopeV1<TState, TRngState> {
  readonly state: TState;
  readonly rng: TRngState;
  readonly commandSequence: NonNegativeSafeInteger;
  readonly integrity: RunIntegrityV1;
}

function exactDataObjectV1(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`invalid ${label}`);
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join("\0") !== [...expectedKeys].sort().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return record;
}

function stringValueV1(value: unknown, label: string): string {
  if (typeof value !== "string") throw new TypeError(`invalid ${label}`);
  return value;
}

/** @internal Used only by the Session-owned integrity finalizer. */
export function parseRunIntegrityReasonV1(value: unknown): RunIntegrityReasonV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid RunIntegrityReasonV1");
  }
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "debug_bundle_anchor") {
    const fields = exactDataObjectV1(value, ["kind", "sequence"], "RunIntegrityReasonV1");
    return {
      kind,
      sequence: parseNonNegativeSafeInteger(fields.sequence),
    };
  }
  if (kind === "debug_command") {
    const fields = exactDataObjectV1(
      value,
      ["kind", "commandKind", "sequence"],
      "RunIntegrityReasonV1",
    );
    return {
      kind,
      commandKind: stringValueV1(fields.commandKind, "RunIntegrity commandKind"),
      sequence: parseNonNegativeSafeInteger(fields.sequence),
    };
  }
  if (kind === "fixture_anchor") {
    const fields = exactDataObjectV1(
      value,
      ["kind", "fixtureId", "sequence"],
      "RunIntegrityReasonV1",
    );
    return {
      kind,
      fixtureId: stringValueV1(fields.fixtureId, "RunIntegrity fixtureId"),
      sequence: parseNonNegativeSafeInteger(fields.sequence),
    };
  }
  throw new TypeError("invalid RunIntegrity reason kind");
}

function parseReasonsV1(value: unknown): readonly RunIntegrityReasonV1[] {
  if (!Array.isArray(value)) throw new TypeError("invalid RunIntegrity reasons");
  if (value.length > 16) throw new TypeError("RunIntegrity reasons exceed the limit");
  const seenKinds = new Set<RunIntegrityReasonV1["kind"]>();
  const parsed = value.map((entry) => {
    const reason = parseRunIntegrityReasonV1(entry);
    if (seenKinds.has(reason.kind)) throw new TypeError("duplicate RunIntegrity reason kind");
    seenKinds.add(reason.kind);
    return reason;
  });
  return parsed;
}

export const runIntegrityV1Schema: RuntimeSchemaV1<RunIntegrityV1> = {
  parse(value: unknown): RunIntegrityV1 {
    const fields = exactDataObjectV1(
      value,
      ["mode", "mutationCount", "firstMutationSequence", "reasons"],
      "RunIntegrityV1",
    );
    const mode = fields.mode;
    if (mode !== "normal" && mode !== "modified") {
      throw new TypeError("invalid RunIntegrity mode");
    }
    const mutationCount = parseNonNegativeSafeInteger(fields.mutationCount);
    const firstValue = fields.firstMutationSequence;
    const firstMutationSequence = firstValue === null
      ? null
      : parseNonNegativeSafeInteger(firstValue);
    const reasons = parseReasonsV1(fields.reasons);
    const pristine = mutationCount === 0 && firstMutationSequence === null && reasons.length === 0;
    const modified = mutationCount > 0 &&
      firstMutationSequence !== null &&
      reasons.length > 0 &&
      reasons.length <= mutationCount;
    if ((mode === "normal" && !pristine) || (mode === "modified" && !modified)) {
      throw new TypeError("inconsistent RunIntegrity mode");
    }
    return { mode, mutationCount, firstMutationSequence, reasons };
  },
};

export function createPristineRunIntegrityV1(): RunIntegrityV1 {
  return {
    mode: "normal",
    mutationCount: parseNonNegativeSafeInteger(0),
    firstMutationSequence: null,
    reasons: [],
  };
}

export function createGameSnapshotEnvelopeSchemaV1<TState, TRngState>(
  stateSchema: RuntimeSchemaV1<TState>,
  rngStateSchema: RuntimeSchemaV1<TRngState>,
): RuntimeSchemaV1<GameSnapshotEnvelopeV1<TState, TRngState>> {
  return {
    parse(value: unknown): GameSnapshotEnvelopeV1<TState, TRngState> {
      const fields = exactDataObjectV1(
        value,
        ["state", "rng", "commandSequence", "integrity"],
        "GameSnapshotEnvelopeV1",
      );
      return {
        state: stateSchema.parse(fields.state),
        rng: rngStateSchema.parse(fields.rng),
        commandSequence: parseNonNegativeSafeInteger(fields.commandSequence),
        integrity: runIntegrityV1Schema.parse(fields.integrity),
      };
    },
  };
}
