// SPDX-License-Identifier: MIT

import {
  createIndexedDbProgramDataRepositoryV1,
  type CreateIndexedDbProgramDataRepositoryOptionsV1,
} from "../product/indexeddb-program-data-repository.ts";
import type { ProgramCatalogRepositoryV1 } from "../product/program-catalog-repository.ts";
import type { ProgramDataRepositoryV1 } from "../product/program-data-repository.ts";
import type { ProgramProcessRepositoryV1 } from "../product/program-process-repository.ts";

/** Test-only access to the physical repository's lower-level mutation facets. */
export type IndexedDbProgramDataRepositoryTestAdapterV1 =
  & ProgramDataRepositoryV1
  & ProgramCatalogRepositoryV1
  & ProgramProcessRepositoryV1;

export function createIndexedDbProgramDataRepositoryTestAdapterV1(
  options: CreateIndexedDbProgramDataRepositoryOptionsV1,
): IndexedDbProgramDataRepositoryTestAdapterV1 {
  return createIndexedDbProgramDataRepositoryV1(
    options,
  ) as IndexedDbProgramDataRepositoryTestAdapterV1;
}
