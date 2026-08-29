// SPDX-License-Identifier: MIT

/**
 * Plain continuation data for renderer-owned deterministic randomness.
 *
 * This stream has no gameplay authority: its state must not enter authoritative
 * State, Save, replay, or rule evaluation. It exists only so a presentation
 * effect can resume the same visual sequence after a renderer remount.
 */
export interface PresentationRngStateV1 {
  readonly algorithm: "xorshift32-v1";
  /** The non-zero uint32 position from which the next draw continues. */
  readonly cursor: number;
}

export interface PresentationRngStreamV1 {
  /** Return the next non-zero uint32 draw. */
  nextUint32(): number;
  /** Return an unbiased integer in `[0, exclusiveMax)`. */
  nextInt(exclusiveMax: number): number;
  /** Return an unbiased integer in the inclusive range `[min, maxInclusive]`. */
  nextIntInRange(min: number, maxInclusive: number): number;
  /** Capture plain data that resumes the exact next draw. */
  state(): PresentationRngStateV1;
}

const maximumUint32V1 = 0xffff_ffff;
const nonZeroUint32CardinalityV1 = maximumUint32V1;
const nonZeroSeedFallbackV1 = 0x9e37_79b9;

function foldByteV1(hash: number, byte: number): number {
  return Math.imul(hash ^ byte, 0x0100_0193) >>> 0;
}

function foldCodeUnitV1(hash: number, codeUnit: number): number {
  const lowByteFold = foldByteV1(hash, codeUnit & 0xff);
  return foldByteV1(lowByteFold, codeUnit >>> 8);
}

function foldTextV1(hash: number, text: string): number {
  let next = hash;
  for (let index = 0; index < text.length; index += 1) {
    next = foldCodeUnitV1(next, text.charCodeAt(index));
  }
  return next;
}

/**
 * Derive a non-zero uint32 seed from committed, cross-reload-stable facts.
 *
 * Suitable parts include occurrence ids, cue ids, effect ids, and committed
 * ordinals. A presentation-run epoch is not stable across reload/successor
 * publication and must not be passed here. Wall-clock time, `performance.now`,
 * and random values are likewise invalid seed sources even though this
 * function cannot distinguish their numeric values at runtime.
 *
 * Parts are type-tagged and length-prefixed before folding, so the structural
 * inputs `["a", 1]`, `["a1"]`, and `["a", "1"]` do not share an encoding.
 */
export function derivePresentationSeedV1(parts: readonly (string | number)[]): number {
  if (parts.length === 0) {
    throw new TypeError("ui.presentation_rng_seed_parts_empty");
  }

  let hash = 0x811c_9dc5;
  for (const part of parts) {
    let tag: "number" | "string";
    let text: string;
    if (typeof part === "number") {
      if (!Number.isFinite(part)) {
        throw new TypeError("ui.presentation_rng_seed_part_not_finite");
      }
      tag = "number";
      text = Object.is(part, -0) ? "0" : String(part);
    } else if (typeof part === "string") {
      tag = "string";
      text = part;
    } else {
      throw new TypeError("ui.presentation_rng_seed_part_invalid");
    }

    hash = foldTextV1(hash, `${tag}:${text.length}:`);
    hash = foldTextV1(hash, text);
    hash = foldCodeUnitV1(hash, 0x1f);
  }

  return hash === 0 ? nonZeroSeedFallbackV1 : hash;
}

function admitCursorV1(value: unknown): number {
  if (
    typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 ||
    value > maximumUint32V1
  ) {
    throw new TypeError("ui.presentation_rng_cursor_invalid");
  }
  return value;
}

/** Create a stream from a derived seed or a previously captured continuation. */
export function createPresentationRngStreamV1(
  input: number | PresentationRngStateV1,
): PresentationRngStreamV1 {
  let cursor: number;
  if (typeof input === "number") {
    cursor = admitCursorV1(input);
  } else {
    if (
      input === null || typeof input !== "object" ||
      (input as PresentationRngStateV1).algorithm !== "xorshift32-v1"
    ) {
      throw new TypeError("ui.presentation_rng_state_invalid");
    }
    cursor = admitCursorV1((input as PresentationRngStateV1).cursor);
  }

  const nextUint32 = (): number => {
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
      exclusiveMax > nonZeroUint32CardinalityV1
    ) {
      throw new TypeError("ui.presentation_rng_exclusive_max_invalid");
    }

    const acceptanceLimit = Math.floor(nonZeroUint32CardinalityV1 / exclusiveMax) *
      exclusiveMax;
    let normalizedDraw: number;
    do {
      // xorshift32 permutes the non-zero uint32 states. Subtracting one maps
      // that exact 2^32-1-state space onto [0, 2^32-2] before rejection.
      normalizedDraw = nextUint32() - 1;
    } while (normalizedDraw >= acceptanceLimit);
    return normalizedDraw % exclusiveMax;
  };

  return {
    nextUint32,
    nextInt,
    nextIntInRange(min: number, maxInclusive: number): number {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(maxInclusive)) {
        throw new TypeError("ui.presentation_rng_range_invalid");
      }
      const width = maxInclusive - min + 1;
      if (
        min > maxInclusive || !Number.isSafeInteger(width) ||
        width > nonZeroUint32CardinalityV1
      ) {
        throw new TypeError("ui.presentation_rng_range_invalid");
      }
      return min + nextInt(width);
    },
    state(): PresentationRngStateV1 {
      return { algorithm: "xorshift32-v1", cursor };
    },
  };
}
