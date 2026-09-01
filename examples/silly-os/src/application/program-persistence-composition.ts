// SPDX-License-Identifier: MIT

import { indexedDbCreatorPersistenceFacetV1 } from "../../programs/creator/persistence/creator-persistence-facet-descriptor.ts";
import { indexedDbTranslationPersistenceFacetV1 } from "../../programs/translation/persistence/translation-persistence-facet-descriptor.ts";
import type { IndexedDbProgramPersistenceFacetV1 } from "./persistence/program-persistence-facet.ts";

/** Build-known Program persistence facets selected by this SillyOS build. */
export const sillyOsProgramPersistenceFacetsV1: readonly IndexedDbProgramPersistenceFacetV1[] = [
  indexedDbCreatorPersistenceFacetV1,
  indexedDbTranslationPersistenceFacetV1,
];
