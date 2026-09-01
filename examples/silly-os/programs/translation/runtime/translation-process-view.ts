// SPDX-License-Identifier: MIT

import type { TranslationSourceUnitV1 } from "./translation-document-codec.ts";

/** One pageable row projected from the durable Translation Process work set. */
export interface TranslationProcessUnitProjectionV1 extends TranslationSourceUnitV1 {
  readonly target: string | null;
}

/**
 * A bounded UI window over one Process-owned translation work set. It is a
 * presentation projection, not a second aggregate or independently addressable
 * aggregate.
 */
export interface TranslationProcessRowWindowV1 {
  readonly offset: number;
  readonly limit: number;
  readonly totalRowCount: number;
  readonly rows: readonly TranslationProcessUnitProjectionV1[];
  readonly nextOffset: number | null;
}
