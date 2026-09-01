// SPDX-License-Identifier: MIT

import type { ProgramDataRepositoryV1 } from "../../../src/application/persistence/program-data-repository.ts";
import type {
  ProgramCatalogAcceptedDecisionListInputV1,
  ProgramCatalogApplyRevisionInputV1,
  ProgramCatalogCreateInputV1,
  ProgramCatalogDecideInputV1,
  ProgramCatalogListInputV1,
} from "../runtime/program-catalog-repository.ts";
import {
  creatorPersistenceFacetIdV1,
  type CreatorProcessOperationExpectationV1,
  type CreatorProgramDataRepositoryV1,
  type CreatorProgramProcessCreateBundleInputV1,
  type CreatorProgramProcessDecisionBundleInputV1,
  type CreatorProgramProcessExecutionRevisionBundleInputV1,
  type CreatorProgramProcessRevisionBundleInputV1,
} from "./creator-persistence-contract.ts";

function invokeV1<TResult>(
  repository: ProgramDataRepositoryV1,
  operation: string,
  input: unknown,
): Promise<TResult> {
  return repository.invokeProgramPersistenceFacet({
    revision: 1,
    facetId: creatorPersistenceFacetIdV1,
    operation,
    input,
  }) as Promise<TResult>;
}

/** Typed Creator facade over the generic Program persistence facet envelope. */
export function createCreatorProgramDataRepositoryV1(
  repository: ProgramDataRepositoryV1,
): CreatorProgramDataRepositoryV1 {
  return {
    ...repository,
    listPrograms(input: ProgramCatalogListInputV1) {
      return invokeV1(repository, "list_programs", input);
    },
    load(programId: string) {
      return invokeV1(repository, "load_program", programId);
    },
    loadProgramRevision(programId: string, revision: number) {
      return invokeV1(repository, "load_program_revision", { programId, revision });
    },
    loadDecision(programId: string, proposalId: string, programRevision: number) {
      return invokeV1(repository, "load_program_decision", {
        programId,
        proposalId,
        programRevision,
      });
    },
    loadLatestAcceptedDecision(programId: string) {
      return invokeV1(repository, "load_latest_accepted_program_decision", programId);
    },
    listAcceptedDecisions(input: ProgramCatalogAcceptedDecisionListInputV1) {
      return invokeV1(repository, "list_accepted_program_decisions", input);
    },
    create(input: ProgramCatalogCreateInputV1) {
      return invokeV1(repository, "create_program", input);
    },
    applyRevision(input: ProgramCatalogApplyRevisionInputV1) {
      return invokeV1(repository, "apply_program_revision", input);
    },
    decide(input: ProgramCatalogDecideInputV1) {
      return invokeV1(repository, "decide_program", input);
    },
    createProgramWithProcess(input: CreatorProgramProcessCreateBundleInputV1) {
      return invokeV1(repository, "create_program_with_process", input);
    },
    applyProgramRevisionWithProcessTranscript(
      input: CreatorProgramProcessRevisionBundleInputV1,
    ) {
      return invokeV1(repository, "apply_program_revision_with_process_transcript", input);
    },
    decideProgramWithProcessTranscript(input: CreatorProgramProcessDecisionBundleInputV1) {
      return invokeV1(repository, "decide_program_with_process_transcript", input);
    },
    commitProgramRevisionWithProcessExecutionTerminal(
      input: CreatorProgramProcessExecutionRevisionBundleInputV1,
    ) {
      return invokeV1(
        repository,
        "commit_program_revision_with_process_execution_terminal",
        input,
      );
    },
    queryCreatorProcessOperation(input: CreatorProcessOperationExpectationV1) {
      return invokeV1(repository, "query_process_operation", input);
    },
  };
}
