// SPDX-License-Identifier: MIT
import { dataFailure, readArray, readExactRecord } from "./presentation-data.js";
import { parseInteractionOccurrenceIdV1 } from "./pending-interaction.js";

/**
 * NarrativeHistory: the player-readable record of resolved narrative
 * boundaries for the current run. It is Story/Narrative authoritative State
 * — it enters Snapshots and Saves, restores to the exact occurrence it was
 * saved at, and (M3 rollback ownership) rolls back together with the
 * checkpoint Snapshot that contains it. It is not the CommandLog (engine
 * evidence), not the Seen registry (Host profile), and not a Debug replay
 * source; those stay independent surfaces with independent data.
 */

const historyIdPatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;

function parseHistoryIdV1(value: unknown, path: string, reason: string): string {
  if (
    typeof value !== "string" ||
    !historyIdPatternV1.test(value) ||
    value.length < 3 ||
    value.length > 96
  ) {
    return dataFailure(path, reason);
  }
  return value;
}

export type NarrativeHistoryEntryKindV1 = "say" | "choice";

export interface NarrativeHistoryEntryV1 {
  readonly kind: NarrativeHistoryEntryKindV1;
  readonly occurrenceId: string;
  readonly definitionId: string;
  readonly seenRevision: number;
  readonly speakerTextId: string | null;
  /** The resolved line text, or the chosen option's text for choices. */
  readonly textId: string;
  /** Replayable voice line, when the entry had one. */
  readonly voiceAssetId: string | null;
}

export interface NarrativeHistoryV1 {
  readonly entries: readonly NarrativeHistoryEntryV1[];
}

export const emptyNarrativeHistoryV1: NarrativeHistoryV1 = Object.freeze({
  entries: Object.freeze([]),
});

/** The default backlog capacity; older entries fall off the front. */
export const narrativeHistoryMaxEntriesV1 = 100;

export function parseNarrativeHistoryEntryV1(
  value: unknown,
  path = "/entry",
): NarrativeHistoryEntryV1 {
  const record = readExactRecord(
    value,
    [
      "kind",
      "occurrenceId",
      "definitionId",
      "seenRevision",
      "speakerTextId",
      "textId",
      "voiceAssetId",
    ],
    path,
  );
  if (record.kind !== "say" && record.kind !== "choice") {
    return dataFailure(`${path}/kind`, "history_kind_invalid");
  }
  if (
    typeof record.seenRevision !== "number" ||
    !Number.isSafeInteger(record.seenRevision) ||
    record.seenRevision < 1
  ) {
    return dataFailure(`${path}/seenRevision`, "seen_revision_invalid");
  }
  return Object.freeze({
    kind: record.kind,
    occurrenceId: parseInteractionOccurrenceIdV1(record.occurrenceId, `${path}/occurrenceId`),
    definitionId: parseHistoryIdV1(
      record.definitionId,
      `${path}/definitionId`,
      "definition_id_invalid",
    ),
    seenRevision: record.seenRevision,
    speakerTextId:
      record.speakerTextId === null
        ? null
        : parseHistoryIdV1(record.speakerTextId, `${path}/speakerTextId`, "text_id_invalid"),
    textId: parseHistoryIdV1(record.textId, `${path}/textId`, "text_id_invalid"),
    voiceAssetId:
      record.voiceAssetId === null
        ? null
        : parseHistoryIdV1(record.voiceAssetId, `${path}/voiceAssetId`, "asset_id_invalid"),
  });
}

export function parseNarrativeHistoryV1(value: unknown, path = "/history"): NarrativeHistoryV1 {
  const record = readExactRecord(value, ["entries"], path);
  const entriesValue = readArray(record.entries, `${path}/entries`);
  if (entriesValue.length > narrativeHistoryMaxEntriesV1) {
    return dataFailure(`${path}/entries`, "history_too_long");
  }
  const seen = new Set<string>();
  const entries = entriesValue.map((entry, index) => {
    const parsed = parseNarrativeHistoryEntryV1(entry, `${path}/entries/${String(index)}`);
    if (seen.has(parsed.occurrenceId)) {
      return dataFailure(
        `${path}/entries/${String(index)}/occurrenceId`,
        "history_occurrence_duplicate",
      );
    }
    seen.add(parsed.occurrenceId);
    return parsed;
  });
  return Object.freeze({ entries: Object.freeze(entries) });
}

/** Appends within the bounded capacity, dropping the oldest entries. */
export function appendNarrativeHistoryV1(
  history: NarrativeHistoryV1,
  entry: NarrativeHistoryEntryV1,
  maxEntries = narrativeHistoryMaxEntriesV1,
): NarrativeHistoryV1 {
  const entries = [...history.entries, entry];
  return Object.freeze({
    entries: Object.freeze(entries.slice(Math.max(0, entries.length - maxEntries))),
  });
}
