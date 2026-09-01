// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  NonNegativeSafeInteger,
  NonZeroUint32,
  PositiveSafeInteger,
  RuntimeSchemaV1,
} from "./values.ts";
import {
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "./values.ts";

export interface RngStateV1 {
  readonly algorithm: "xorshift32-v1";
  readonly cursor: NonZeroUint32;
  readonly rawDrawCount: NonNegativeSafeInteger;
}

export interface RuleDrawRequestV1 {
  readonly exclusiveMax: number;
  readonly purpose: string;
}

export interface RngDrawTraceV1 {
  readonly ordinal: PositiveSafeInteger;
  readonly purpose: string;
  readonly exclusiveMax: PositiveSafeInteger;
  readonly result: NonNegativeSafeInteger;
  readonly before: RngStateV1;
  readonly after: RngStateV1;
}

export interface RuleRngV1 {
  nextInt(request: DeepReadonly<RuleDrawRequestV1>): NonNegativeSafeInteger;
  candidateState(): RngStateV1;
  attemptedDraws(): readonly RngDrawTraceV1[];
}

/** @internal Recognizable nested-schema failure; intentionally absent from package barrels. */
export class RngStateSchemaFailureInternalV1 extends TypeError {
  readonly code = "rng.invalid_state" as const;

  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "RngStateSchemaFailureInternalV1";
  }
}

function parseRngCursorV1(value: unknown): NonZeroUint32 {
  try {
    return parseNonZeroUint32(value);
  } catch (error) {
    throw new RngStateSchemaFailureInternalV1("invalid RngStateV1 cursor", error);
  }
}

/** @internal Core bootstrap runtime guard; intentionally absent from package barrels. */
export function parseRngSeedInternalV1(value: unknown): NonZeroUint32 {
  return parseRngCursorV1(value);
}

export const rngStateV1Schema: RuntimeSchemaV1<RngStateV1> = {
  parse(value: unknown): RngStateV1 {
    try {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
      ) {
        throw new TypeError("invalid RngStateV1");
      }
      const record = value as Record<string, unknown>;
      if (Object.keys(record).sort().join("\0") !== "algorithm\0cursor\0rawDrawCount") {
        throw new TypeError("invalid RngStateV1 fields");
      }
      if (record.algorithm !== "xorshift32-v1") {
        throw new TypeError("invalid RngStateV1 algorithm");
      }
      return {
        algorithm: "xorshift32-v1",
        cursor: parseRngCursorV1(record.cursor),
        rawDrawCount: parseNonNegativeSafeInteger(record.rawDrawCount),
      };
    } catch (error) {
      if (error instanceof RngStateSchemaFailureInternalV1) throw error;
      throw new RngStateSchemaFailureInternalV1("invalid RngStateV1", error);
    }
  },
};

/** @internal Standard-Core finalized-evidence guard; intentionally absent from package barrels. */
export function parseRngDrawTraceInternalV1(value: unknown): RngDrawTraceV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new TypeError("invalid RngDrawTraceV1");
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join("\0") !==
      "after\0before\0exclusiveMax\0ordinal\0purpose\0result"
  ) {
    throw new TypeError("invalid RngDrawTraceV1 fields");
  }
  const exclusiveMax = parsePositiveSafeInteger(record.exclusiveMax);
  if (exclusiveMax > 0x1_0000_0000) {
    throw new TypeError("RngDrawTraceV1 exclusiveMax exceeds uint32 range");
  }
  const result = parseNonNegativeSafeInteger(record.result);
  if (result >= exclusiveMax) throw new TypeError("RngDrawTraceV1 result is out of range");
  return {
    ordinal: parsePositiveSafeInteger(record.ordinal),
    purpose: parsePurpose(record.purpose),
    exclusiveMax,
    result,
    before: rngStateV1Schema.parse(record.before),
    after: rngStateV1Schema.parse(record.after),
  };
}

function parsePurpose(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    !/^(?:demand|check|scheduler):[a-z0-9._:-]+$/u.test(value)
  ) {
    throw new TypeError("invalid RNG purpose");
  }
  return value;
}

function state(cursor: number, rawDrawCount: number): RngStateV1 {
  return {
    algorithm: "xorshift32-v1",
    cursor: parseRngCursorV1(cursor),
    rawDrawCount: parseNonNegativeSafeInteger(rawDrawCount),
  };
}

export function createTransactionalRngV1(input: NonZeroUint32): RuleRngV1;
export function createTransactionalRngV1(input: DeepReadonly<RngStateV1>): RuleRngV1;
export function createTransactionalRngV1(
  input: NonZeroUint32 | DeepReadonly<RngStateV1>,
): RuleRngV1 {
  const initial = typeof input === "number" ? state(input, 0) : input;
  let cursor = initial.cursor as number;
  let rawDrawCount = initial.rawDrawCount as number;
  const traces: RngDrawTraceV1[] = [];

  const nextRaw = (purpose: string, exclusiveMax: PositiveSafeInteger): number => {
    const before = state(cursor, rawDrawCount);
    let next = cursor >>> 0;
    next = (next ^ ((next << 13) >>> 0)) >>> 0;
    next = (next ^ (next >>> 17)) >>> 0;
    next = (next ^ ((next << 5) >>> 0)) >>> 0;
    cursor = next;
    rawDrawCount += 1;
    const after = state(cursor, rawDrawCount);
    traces.push({
      ordinal: parsePositiveSafeInteger(traces.length + 1),
      purpose,
      exclusiveMax,
      result: parseNonNegativeSafeInteger(next % exclusiveMax),
      before,
      after,
    });
    return next;
  };

  return {
    nextInt(request: DeepReadonly<RuleDrawRequestV1>): NonNegativeSafeInteger {
      const exclusiveMax = parsePositiveSafeInteger(request.exclusiveMax);
      if (exclusiveMax > 0x1_0000_0000) {
        throw new TypeError("exclusiveMax exceeds uint32 range");
      }
      const purpose = parsePurpose(request.purpose);
      const limit = Math.floor(0x1_0000_0000 / exclusiveMax) * exclusiveMax;
      let raw;
      do {
        raw = nextRaw(purpose, exclusiveMax);
      } while (raw >= limit);
      return parseNonNegativeSafeInteger(raw % exclusiveMax);
    },
    candidateState(): RngStateV1 {
      return state(cursor, rawDrawCount);
    },
    attemptedDraws(): readonly RngDrawTraceV1[] {
      return traces.slice();
    },
  };
}
