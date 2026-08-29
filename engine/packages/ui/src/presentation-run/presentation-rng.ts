// SPDX-License-Identifier: MIT
// Deterministic presentation-side randomness — the aperiodic-transient
// defer from the ambient-loop-motion proposal (§ boundary: "随机时点的
// 非周期表现…将来证据驱动的另案原语"), evidence-gated by the external
// golden-baseline audit (2026-08-29): word-effect scatter positions,
// blink-phase jitter, and visual lotteries need draws that replay
// identically for one committed trajectory, which renderer-local
// Math.random() cannot give. A renderer derives a seed from committed
// facts (occurrence ids, transient sequences, cue ids, epochs), draws
// through the stream, and optionally keeps the plain stream state for
// continuity across remounts within one app run.
//
// Zero-authority by construction: streams never enter State, Saves,
// digests, replay, or the CommandLog, and authoritative code keeps
// drawing through the session's transactional `RuleRngV1`. The core is
// the same proven xorshift32 as the authoritative RNG so the two sides
// share one audited generator, without sharing any state.

export interface PresentationRngStateV1 {
  readonly algorithm: "xorshift32-v1";
  /** Non-zero uint32 stream position. */
  readonly cursor: number;
}

export interface PresentationRngStreamV1 {
  /** The next raw draw: a uint32. */
  nextUint32(): number;
  /** Unbiased integer in `[0, exclusiveMax)` via rejection sampling. */
  nextInt(exclusiveMax: number): number;
  /** Unbiased integer in `[min, maxInclusive]` — the scatter-in-box shape. */
  nextIntInRange(min: number, maxInclusive: number): number;
  /** Serializable snapshot; feed back to resume the exact stream. */
  state(): PresentationRngStateV1;
}

/** xorshift32 never visits 0, so a zero fold maps to a fixed constant. */
const presentationSeedZeroFallbackV1 = 0x9e3779b9;

function foldCodeUnitV1(hash: number, code: number): number {
  let next = hash ^ (code & 0xff);
  next = Math.imul(next, 0x01000193) >>> 0;
  next = next ^ (code >>> 8);
  return Math.imul(next, 0x01000193) >>> 0;
}

/**
 * Folds stable identifiers into a non-zero uint32 seed (FNV-1a over
 * type-tagged parts, so `["a", 1]`, `["a1"]`, and `["a", "1"]` all
 * derive distinct seeds). Parts must be strings or finite numbers —
 * committed facts, never wall clocks.
 */
export function derivePresentationSeedV1(parts: readonly (string | number)[]): number {
  if (parts.length === 0) {
    throw new TypeError("ui.presentation_rng_seed_parts_empty");
  }
  let hash = 0x811c9dc5;
  for (const part of parts) {
    if (typeof part === "number") {
      if (!Number.isFinite(part)) {
        throw new TypeError("ui.presentation_rng_seed_part_not_finite");
      }
      hash = foldCodeUnitV1(hash, 0x6e); // "n"
      const text = String(part);
      for (let index = 0; index < text.length; index += 1) {
        hash = foldCodeUnitV1(hash, text.charCodeAt(index));
      }
    } else if (typeof part === "string") {
      hash = foldCodeUnitV1(hash, 0x73); // "s"
      for (let index = 0; index < part.length; index += 1) {
        hash = foldCodeUnitV1(hash, part.charCodeAt(index));
      }
    } else {
      throw new TypeError("ui.presentation_rng_seed_part_invalid");
    }
    hash = foldCodeUnitV1(hash, 0x1f); // part separator
  }
  return hash === 0 ? presentationSeedZeroFallbackV1 : hash;
}

function parsePresentationCursorV1(value: unknown): number {
  if (
    typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 ||
    value > 0xffff_ffff
  ) {
    throw new TypeError("ui.presentation_rng_cursor_invalid");
  }
  return value;
}

export function createPresentationRngStreamV1(
  input: number | PresentationRngStateV1,
): PresentationRngStreamV1 {
  let cursor: number;
  if (typeof input === "number") {
    cursor = parsePresentationCursorV1(input);
  } else {
    if (
      input === null || typeof input !== "object" ||
      (input as PresentationRngStateV1).algorithm !== "xorshift32-v1"
    ) {
      throw new TypeError("ui.presentation_rng_state_invalid");
    }
    cursor = parsePresentationCursorV1((input as PresentationRngStateV1).cursor);
  }

  const nextRaw = (): number => {
    let next = cursor >>> 0;
    next = (next ^ ((next << 13) >>> 0)) >>> 0;
    next = (next ^ (next >>> 17)) >>> 0;
    next = (next ^ ((next << 5) >>> 0)) >>> 0;
    cursor = next;
    return next;
  };

  const nextInt = (exclusiveMax: number): number => {
    if (
      !Number.isSafeInteger(exclusiveMax) || exclusiveMax < 1 ||
      exclusiveMax > 0x1_0000_0000
    ) {
      throw new TypeError("ui.presentation_rng_exclusive_max_invalid");
    }
    const limit = Math.floor(0x1_0000_0000 / exclusiveMax) * exclusiveMax;
    let raw;
    do {
      raw = nextRaw();
    } while (raw >= limit);
    return raw % exclusiveMax;
  };

  return Object.freeze({
    nextUint32: nextRaw,
    nextInt,
    nextIntInRange(min: number, maxInclusive: number): number {
      if (
        !Number.isSafeInteger(min) || !Number.isSafeInteger(maxInclusive) ||
        min > maxInclusive || maxInclusive - min + 1 > 0x1_0000_0000
      ) {
        throw new TypeError("ui.presentation_rng_range_invalid");
      }
      return min + nextInt(maxInclusive - min + 1);
    },
    state(): PresentationRngStateV1 {
      return Object.freeze({ algorithm: "xorshift32-v1", cursor });
    },
  });
}
