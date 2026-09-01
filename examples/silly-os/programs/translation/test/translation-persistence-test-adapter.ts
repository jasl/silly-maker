// SPDX-License-Identifier: MIT

import {
  createIndexedDbProgramDataRepositoryV1,
  type CreateIndexedDbProgramDataRepositoryOptionsV1,
} from "../../../src/application/persistence/indexeddb-program-data-repository.ts";
import type { ProgramProcessRepositoryV1 } from "../../../src/program-platform/process/program-process-repository.ts";
import type { TranslationProgramDataRepositoryV1 } from "../persistence/translation-persistence-contract.ts";
import { indexedDbTranslationPersistenceFacetV1 } from "../persistence/translation-persistence-facet-descriptor.ts";
import { createTranslationProgramDataRepositoryV1 } from "../persistence/translation-program-data-repository.ts";

export type TranslationPersistenceTestAdapterV1 =
  & TranslationProgramDataRepositoryV1
  & ProgramProcessRepositoryV1;

export function createTranslationPersistenceTestAdapterV1(
  options: CreateIndexedDbProgramDataRepositoryOptionsV1,
): TranslationPersistenceTestAdapterV1 {
  const repository = createIndexedDbProgramDataRepositoryV1({
    ...options,
    facets: [indexedDbTranslationPersistenceFacetV1, ...(options.facets ?? [])],
  });
  return createTranslationProgramDataRepositoryV1(
    repository,
  ) as TranslationPersistenceTestAdapterV1;
}
