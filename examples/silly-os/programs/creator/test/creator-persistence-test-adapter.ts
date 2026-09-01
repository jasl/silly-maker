// SPDX-License-Identifier: MIT

import {
  createIndexedDbProgramDataRepositoryV1,
  type CreateIndexedDbProgramDataRepositoryOptionsV1,
} from "../../../src/application/persistence/indexeddb-program-data-repository.ts";
import type { ProgramProcessRepositoryV1 } from "../../../src/program-platform/process/program-process-repository.ts";
import type { CreatorProgramDataRepositoryV1 } from "../persistence/creator-persistence-contract.ts";
import { indexedDbCreatorPersistenceFacetV1 } from "../persistence/creator-persistence-facet-descriptor.ts";
import { createCreatorProgramDataRepositoryV1 } from "../persistence/creator-program-data-repository.ts";

export type CreatorPersistenceTestAdapterV1 =
  & CreatorProgramDataRepositoryV1
  & ProgramProcessRepositoryV1;

export function createCreatorPersistenceTestAdapterV1(
  options: CreateIndexedDbProgramDataRepositoryOptionsV1,
): CreatorPersistenceTestAdapterV1 {
  const repository = createIndexedDbProgramDataRepositoryV1({
    ...options,
    facets: [indexedDbCreatorPersistenceFacetV1, ...(options.facets ?? [])],
  });
  return createCreatorProgramDataRepositoryV1(repository) as CreatorPersistenceTestAdapterV1;
}
