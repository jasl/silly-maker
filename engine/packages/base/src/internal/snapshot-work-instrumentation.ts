// SPDX-License-Identifier: MIT

export type SnapshotWorkEventV1 =
  | "canonical_traversal"
  | "canonical_digest"
  | "deep_freeze_traversal"
  | "command_log_continuity_verification"
  | "save_canonical_serialization"
  | "strict_json_parse"
  | "strict_json_preflight";

export interface SnapshotWorkInstrumentationV1 {
  record(event: SnapshotWorkEventV1): unknown;
}

export interface SnapshotWorkCountsV1 {
  readonly canonicalTraversals: number;
  readonly canonicalDigests: number;
  readonly deepFreezeTraversals: number;
  readonly commandLogContinuityVerifications: number;
  readonly saveCanonicalSerializations: number;
  readonly strictJsonParses: number;
  readonly strictJsonPreflights: number;
}

interface MutableSnapshotWorkCountsV1 {
  canonicalTraversals: number;
  canonicalDigests: number;
  deepFreezeTraversals: number;
  commandLogContinuityVerifications: number;
  saveCanonicalSerializations: number;
  strictJsonParses: number;
  strictJsonPreflights: number;
}

function emptyCountsV1(): MutableSnapshotWorkCountsV1 {
  return {
    canonicalTraversals: 0,
    canonicalDigests: 0,
    deepFreezeTraversals: 0,
    commandLogContinuityVerifications: 0,
    saveCanonicalSerializations: 0,
    strictJsonParses: 0,
    strictJsonPreflights: 0,
  };
}

/**
 * Records optional test/bench instrumentation without allowing a broken probe
 * to change authoritative production behavior.
 *
 * @internal
 */
export function recordSnapshotWorkV1(
  instrumentation: SnapshotWorkInstrumentationV1 | undefined,
  event: SnapshotWorkEventV1,
): void {
  try {
    const result = instrumentation?.record(event);
    if (result !== undefined) {
      void Promise.resolve(result).catch(() => undefined);
    }
  } catch {
    // Instrumentation is observational and must never affect authoritative work.
  }
}

/** @internal Test/bench counter; intentionally absent from package barrels. */
export function createSnapshotWorkCounterV1(): {
  readonly instrumentation: SnapshotWorkInstrumentationV1;
  reset(): void;
  snapshot(): SnapshotWorkCountsV1;
} {
  let counts = emptyCountsV1();
  const instrumentation: SnapshotWorkInstrumentationV1 = Object.freeze({
    record(event: SnapshotWorkEventV1) {
      switch (event) {
        case "canonical_traversal":
          counts.canonicalTraversals += 1;
          return;
        case "canonical_digest":
          counts.canonicalDigests += 1;
          return;
        case "deep_freeze_traversal":
          counts.deepFreezeTraversals += 1;
          return;
        case "command_log_continuity_verification":
          counts.commandLogContinuityVerifications += 1;
          return;
        case "save_canonical_serialization":
          counts.saveCanonicalSerializations += 1;
          return;
        case "strict_json_parse":
          counts.strictJsonParses += 1;
          return;
        case "strict_json_preflight":
          counts.strictJsonPreflights += 1;
      }
    },
  });
  return Object.freeze({
    instrumentation,
    reset() {
      counts = emptyCountsV1();
    },
    snapshot() {
      return Object.freeze({ ...counts });
    },
  });
}
