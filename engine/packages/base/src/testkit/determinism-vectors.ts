// SPDX-License-Identifier: MIT
import { normalizeSaveSummaryInternalV1 } from "../contracts/persistence.ts";
import type { DeepReadonly } from "../contracts/values.ts";

export { authoritativeOrderingVectorExpectedV1 } from "./authoritative-ordering-vector-expected.ts";
export { runAuthoritativeOrderingVectorsV1 } from "./authoritative-ordering-vectors.ts";
export {
  evaluateSaveMetadataCompactVectorsV1,
  saveMetadataCompactExpectedV1,
  saveMetadataCorpusRevisionV1,
} from "./save-metadata-corpus.ts";
export type {
  SaveMetadataCompactByteVectorV1,
  SaveMetadataCompactRecordIdV1,
  SaveMetadataCompactVectorsV1,
} from "./save-metadata-corpus.ts";
export {
  evaluatePersistenceUtcAdmissionVectorsV1,
  persistenceUtcAdmissionExpectedV1,
} from "./persistence-utc-vectors.ts";
export interface DeterminismSaveSummaryProjectionInputV1<TState> {
  readonly state: DeepReadonly<TState>;
  readonly summarizeSave: (state: DeepReadonly<TState>) => readonly string[] | null;
}

/** @internal Browser-neutral DET4 seam; not part of the production runtime API. */
export function evaluateDeterminismSaveSummaryProjectionV1<TState>(
  input: DeterminismSaveSummaryProjectionInputV1<TState>,
): readonly string[] | null {
  return normalizeSaveSummaryInternalV1(input.summarizeSave(input.state));
}
