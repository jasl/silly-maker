// SPDX-License-Identifier: MIT
import { dataFailure, readArray, readExactRecord } from "./presentation-data.ts";

/**
 * Narrative aside V1 (narrative-aside proposal, opened 2026-08-27): a
 * one-shot, zero-authority batch of dialogue pages presented alongside the
 * current pending interaction (typically a running hold). Asides are
 * projected by the Story adapter from committed domain events, admitted
 * once and stamped by the instance with a monotonic per-instance sequence
 * plus the presentation epoch at commit time, and consumed by a host-local
 * paging controller. They carry no occurrence, no resolution, and no
 * routing power; they never enter State, Saves, digests, replay,
 * publications, or dialogue History, and load/bootstrap push nothing.
 */
export interface NarrativeAsidePageV1 {
  readonly speakerTextId: string | null;
  readonly textId: string;
}

/** The instance-stamped aside push delivered to `subscribeNarrativeAsides`. */
export interface NarrativeAsideV1 {
  readonly asideSequence: number;
  readonly epoch: number;
  readonly pages: readonly NarrativeAsidePageV1[];
}

export const narrativeAsidePageLimitV1 = 16;

// Same id shape the pending-interaction contract admits for say text ids.
const asideTextIdPatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;

function parseAsideTextIdV1(value: unknown, path: string, reason: string): string {
  if (
    typeof value !== "string" ||
    !asideTextIdPatternV1.test(value) ||
    value.length < 3 ||
    value.length > 96
  ) {
    return dataFailure(path, reason);
  }
  return value;
}

/**
 * Admits a Story-projected aside page list once at the instance boundary:
 * up to 16 exact-key pages whose text ids follow the pending-interaction id
 * pattern. An empty projection means "no aside this commit" and admits as
 * an empty frozen list.
 */
export function parseNarrativeAsidePagesV1(
  value: unknown,
  path = "/narrativeAside",
): readonly NarrativeAsidePageV1[] {
  const entries = readArray(value, path);
  if (entries.length > narrativeAsidePageLimitV1) {
    return dataFailure(path, "aside_pages_overflow");
  }
  return Object.freeze(entries.map((entry, index): NarrativeAsidePageV1 => {
    const pagePath = `${path}/${String(index)}`;
    const record = readExactRecord(entry, ["speakerTextId", "textId"], pagePath);
    return Object.freeze({
      speakerTextId: record.speakerTextId === null ? null : parseAsideTextIdV1(
        record.speakerTextId,
        `${pagePath}/speakerTextId`,
        "speaker_text_id_invalid",
      ),
      textId: parseAsideTextIdV1(record.textId, `${pagePath}/textId`, "text_id_invalid"),
    });
  }));
}
