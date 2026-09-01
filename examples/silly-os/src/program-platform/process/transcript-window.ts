// SPDX-License-Identifier: MIT

import type { TranscriptEntryV1, TranscriptPageV1 } from "./program-process-repository.ts";

interface TranscriptWindowPageV1 {
  readonly entries: readonly TranscriptEntryV1[];
  readonly byteLength: number;
  readonly nextBeforeSequence: number | null;
}

export interface TranscriptWindowV1 {
  readonly processId: string;
  readonly pages: readonly TranscriptWindowPageV1[];
  readonly newerOmitted: boolean;
}

interface TranscriptWindowProjectionV1 {
  readonly entries: readonly TranscriptEntryV1[];
  readonly byteLength: number;
  readonly nextBeforeSequence: number | null;
  readonly newerOmitted: boolean;
}

function transcriptWindowPageV1(page: TranscriptPageV1): TranscriptWindowPageV1 {
  return {
    entries: page.entries,
    byteLength: page.byteLength,
    nextBeforeSequence: page.nextBeforeSequence,
  };
}

export function createTranscriptWindowV1(page: TranscriptPageV1): TranscriptWindowV1 {
  return {
    processId: page.processId,
    pages: [transcriptWindowPageV1(page)],
    newerOmitted: false,
  };
}

export function projectTranscriptWindowV1(
  window: TranscriptWindowV1,
): TranscriptWindowProjectionV1 {
  return {
    entries: window.pages.flatMap((page) => page.entries),
    byteLength: window.pages.reduce((sum, page) => sum + page.byteLength, 0),
    nextBeforeSequence: window.pages[0]?.nextBeforeSequence ?? null,
    newerOmitted: window.newerOmitted,
  };
}

/**
 * Prepends one older durable page and evicts complete pages from the newer end
 * until the mounted byte window fits. At least the requested page remains
 * visible even when one admitted entry alone exceeds the preferred window.
 */
export function prependTranscriptWindowPageV1(input: {
  readonly current: TranscriptWindowV1;
  readonly page: TranscriptPageV1;
  readonly maximumBytes: number;
}): TranscriptWindowV1 {
  if (input.page.processId !== input.current.processId) {
    throw new TypeError("transcript page belongs to another Process");
  }
  const pages = [transcriptWindowPageV1(input.page), ...input.current.pages];
  let byteLength = pages.reduce((sum, page) => sum + page.byteLength, 0);
  let newerOmitted = input.current.newerOmitted;
  while (pages.length > 1 && byteLength > input.maximumBytes) {
    const removed = pages.pop();
    if (removed !== undefined) byteLength -= removed.byteLength;
    newerOmitted = true;
  }
  return { processId: input.current.processId, pages, newerOmitted };
}
