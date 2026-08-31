// SPDX-License-Identifier: MIT

import type { TranslationBatchRequestV1 } from "./translation-batch-protocol.ts";
import type { TranslationSourceUnitV1 } from "./translation-document-codec.ts";

function protectedAdjacencyV1(source: string, token: string) {
  const start = source.indexOf(token);
  const end = start + token.length;
  return {
    adjacentBefore: start > 0 && !/\s/u.test(source[start - 1] ?? ""),
    adjacentAfter: end < source.length && !/\s/u.test(source[end] ?? ""),
  };
}

function translationUnitPromptValueV1(unit: TranslationSourceUnitV1) {
  return {
    unitId: unit.unitId,
    locator: unit.locator,
    context: unit.context,
    durationMilliseconds: unit.durationMilliseconds,
    protectedSegments: unit.protectedSegments.map((segment) => ({
      token: segment.token,
      kind: segment.kind,
      ...protectedAdjacencyV1(unit.source, segment.token),
    })),
    source: unit.source,
  };
}

/** Exact dynamic prompt serialization shared by planning and execution. */
export function createTranslationBatchUserPromptV1(request: TranslationBatchRequestV1): string {
  return JSON.stringify({
    schema: "sillyos.translation-batch-request.v1",
    sourceLocale: request.sourceLocale,
    targetLocale: request.targetLocale,
    documentPurpose: request.documentPurpose,
    style: request.style,
    glossary: request.glossary,
    confirmedMeaningFacts: request.confirmedMeaningFacts,
    neighboringUnits: {
      preceding: request.neighboringUnits.preceding === null
        ? null
        : translationUnitPromptValueV1(request.neighboringUnits.preceding),
      following: request.neighboringUnits.following === null
        ? null
        : translationUnitPromptValueV1(request.neighboringUnits.following),
    },
    units: request.units.map(translationUnitPromptValueV1),
  });
}
