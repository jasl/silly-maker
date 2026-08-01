// SPDX-License-Identifier: MIT

export type SnapshotWorkEventV1 =
  | "canonical_traversal"
  | "canonical_digest"
  | "deep_freeze_traversal"
  | "command_log_continuity_verification"
  | "save_canonical_serialization"
  | "strict_json_parse"
  | "strict_json_preflight";

/** @internal Physical traversal purpose; intentionally absent from package barrels. */
export type SnapshotWorkPurposeV1 =
  | "snapshot_digest"
  | "snapshot_freeze"
  | "bootstrap_admission"
  | "bootstrap_handoff_freeze"
  | "command_admission"
  | "evidence_admission"
  | "replay_comparison";

export interface SnapshotWorkInstrumentationV1 {
  record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1): unknown;
}

export interface PurposeTaggedSnapshotWorkCountsV1 {
  readonly snapshotDigestTraversals: number;
  readonly snapshotFreezeTraversals: number;
  readonly bootstrapAdmissionCanonicalTraversals: number;
  readonly bootstrapHandoffFreezeTraversals: number;
  readonly commandAdmissionCanonicalTraversals: number;
  readonly evidenceAdmissionCanonicalTraversals: number;
  readonly replayComparisonTraversals: number;
  readonly totalPhysicalCanonicalTraversals: number;
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
  purpose?: SnapshotWorkPurposeV1,
): void {
  try {
    const result = instrumentation?.record(event, purpose);
    if (result !== undefined) {
      void Promise.resolve(result).catch(() => undefined);
    }
  } catch {
    // Instrumentation is observational and must never affect authoritative work.
  }
}

function emptyPurposeTaggedCountsV1(): PurposeTaggedSnapshotWorkCountsV1 {
  return {
    snapshotDigestTraversals: 0,
    snapshotFreezeTraversals: 0,
    bootstrapAdmissionCanonicalTraversals: 0,
    bootstrapHandoffFreezeTraversals: 0,
    commandAdmissionCanonicalTraversals: 0,
    evidenceAdmissionCanonicalTraversals: 0,
    replayComparisonTraversals: 0,
    totalPhysicalCanonicalTraversals: 0,
  };
}

/** @internal Test/bench counter; intentionally absent from package barrels. */
export function createPurposeTaggedSnapshotWorkCounterV1(): {
  readonly instrumentation: SnapshotWorkInstrumentationV1;
  reset(): void;
  snapshot(): PurposeTaggedSnapshotWorkCountsV1;
} {
  let counts = emptyPurposeTaggedCountsV1();
  const instrumentation: SnapshotWorkInstrumentationV1 = Object.freeze({
    record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
      if (event === "canonical_traversal") {
        counts = {
          ...counts,
          totalPhysicalCanonicalTraversals: counts.totalPhysicalCanonicalTraversals + 1,
        };
      }
      switch (purpose) {
        case "snapshot_digest":
          if (event === "canonical_traversal") {
            counts = { ...counts, snapshotDigestTraversals: counts.snapshotDigestTraversals + 1 };
          }
          return;
        case "snapshot_freeze":
          if (event === "deep_freeze_traversal") {
            counts = { ...counts, snapshotFreezeTraversals: counts.snapshotFreezeTraversals + 1 };
          }
          return;
        case "bootstrap_admission":
          if (event === "canonical_traversal") {
            counts = {
              ...counts,
              bootstrapAdmissionCanonicalTraversals: counts.bootstrapAdmissionCanonicalTraversals +
                1,
            };
          }
          return;
        case "bootstrap_handoff_freeze":
          if (event === "deep_freeze_traversal") {
            counts = {
              ...counts,
              bootstrapHandoffFreezeTraversals: counts.bootstrapHandoffFreezeTraversals + 1,
            };
          }
          return;
        case "command_admission":
          if (event === "canonical_traversal") {
            counts = {
              ...counts,
              commandAdmissionCanonicalTraversals: counts.commandAdmissionCanonicalTraversals + 1,
            };
          }
          return;
        case "evidence_admission":
          if (event === "canonical_traversal") {
            counts = {
              ...counts,
              evidenceAdmissionCanonicalTraversals: counts.evidenceAdmissionCanonicalTraversals + 1,
            };
          }
          return;
        case "replay_comparison":
          if (event === "canonical_traversal") {
            counts = {
              ...counts,
              replayComparisonTraversals: counts.replayComparisonTraversals + 1,
            };
          }
          return;
        case undefined:
          return;
      }
    },
  });
  return Object.freeze({
    instrumentation,
    reset() {
      counts = emptyPurposeTaggedCountsV1();
    },
    snapshot() {
      return Object.freeze({ ...counts });
    },
  });
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
