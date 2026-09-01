// SPDX-License-Identifier: MIT

import type { ProgramDataRepositoryV1 } from "../../../src/application/persistence/program-data-repository.ts";
import type {
  TranslationBatchCandidateAcceptInputV1,
  TranslationBatchCandidateRecordV1,
  TranslationBatchCandidateRejectInputV1,
  TranslationWorksetAppendImportInputV1,
  TranslationWorksetBeginImportInputV1,
  TranslationWorksetGlossaryEntryV1,
  TranslationWorksetHeadV1,
  TranslationWorksetMutationResultV1,
  TranslationWorksetOperationExpectationV1,
  TranslationWorksetOperationQueryResultV1,
  TranslationWorksetPageRequestV1,
  TranslationWorksetPageResultV1,
  TranslationWorksetUnitRecordV1,
} from "../runtime/translation-workset-repository.ts";
import {
  translationPersistenceFacetIdV1,
  type TranslationBatchCandidateExecutionBundleInputV1,
  type TranslationBatchCandidateExecutionCompositeCommitResultV1,
  type TranslationBatchExecutionAcquireInputV1,
  type TranslationBatchExecutionAcquireResultV1,
  type TranslationProcessOperationExpectationV1,
  type TranslationProgramDataRepositoryV1,
  type TranslationWorksetFinalizeExecutionBundleInputV1,
  type TranslationWorksetFinalizeExecutionCompositeCommitResultV1,
  type TranslationWorksetImportExecutionAcquireInputV1,
  type TranslationWorksetImportExecutionAcquireResultV1,
} from "./translation-persistence-contract.ts";

function invokeV1<TResult>(
  repository: ProgramDataRepositoryV1,
  operation: string,
  input: unknown,
): Promise<TResult> {
  return repository.invokeProgramPersistenceFacet({
    revision: 1,
    facetId: translationPersistenceFacetIdV1,
    operation,
    input,
  }) as Promise<TResult>;
}

/** Typed Translation facade over the generic Program persistence facet envelope. */
export function createTranslationProgramDataRepositoryV1(
  repository: ProgramDataRepositoryV1,
): TranslationProgramDataRepositoryV1 {
  return {
    ...repository,
    acquireTranslationWorksetImportExecution(
      input: TranslationWorksetImportExecutionAcquireInputV1,
    ): Promise<TranslationWorksetImportExecutionAcquireResultV1> {
      return invokeV1(repository, "acquire_workset_import_execution", input);
    },
    acquireTranslationBatchExecution(
      input: TranslationBatchExecutionAcquireInputV1,
    ): Promise<TranslationBatchExecutionAcquireResultV1> {
      return invokeV1(repository, "acquire_batch_execution", input);
    },
    beginTranslationWorksetImport(
      input: TranslationWorksetBeginImportInputV1,
    ): Promise<TranslationWorksetMutationResultV1> {
      return invokeV1(repository, "begin_workset_import", input);
    },
    appendTranslationWorksetImport(
      input: TranslationWorksetAppendImportInputV1,
    ): Promise<TranslationWorksetMutationResultV1> {
      return invokeV1(repository, "append_workset_import", input);
    },
    commitTranslationWorksetFinalizeWithProcessExecutionTerminal(
      input: TranslationWorksetFinalizeExecutionBundleInputV1,
    ): Promise<TranslationWorksetFinalizeExecutionCompositeCommitResultV1> {
      return invokeV1(repository, "finalize_workset_with_execution_terminal", input);
    },
    commitTranslationBatchCandidateWithProcessExecutionTerminal(
      input: TranslationBatchCandidateExecutionBundleInputV1,
    ): Promise<TranslationBatchCandidateExecutionCompositeCommitResultV1> {
      return invokeV1(repository, "publish_candidate_with_execution_terminal", input);
    },
    loadTranslationWorksetHead(processId: string): Promise<TranslationWorksetHeadV1 | null> {
      return invokeV1(repository, "load_workset_head", processId);
    },
    loadTranslationBatchCandidate(
      processId: string,
      candidateId: string,
    ): Promise<TranslationBatchCandidateRecordV1 | null> {
      return invokeV1(repository, "load_batch_candidate", { processId, candidateId });
    },
    acceptTranslationBatchCandidate(
      input: TranslationBatchCandidateAcceptInputV1,
    ): Promise<TranslationWorksetMutationResultV1> {
      return invokeV1(repository, "accept_candidate", input);
    },
    rejectTranslationBatchCandidate(
      input: TranslationBatchCandidateRejectInputV1,
    ): Promise<TranslationWorksetMutationResultV1> {
      return invokeV1(repository, "reject_candidate", input);
    },
    loadTranslationWorksetUnitPage(
      input: TranslationWorksetPageRequestV1,
    ): Promise<TranslationWorksetPageResultV1<TranslationWorksetUnitRecordV1>> {
      return invokeV1(repository, "load_workset_unit_page", input);
    },
    loadTranslationWorksetGlossaryPage(
      input: TranslationWorksetPageRequestV1,
    ): Promise<TranslationWorksetPageResultV1<TranslationWorksetGlossaryEntryV1>> {
      return invokeV1(repository, "load_workset_glossary_page", input);
    },
    queryTranslationWorksetOperation(
      input: TranslationWorksetOperationExpectationV1,
    ): Promise<TranslationWorksetOperationQueryResultV1> {
      return invokeV1(repository, "query_workset_operation", input);
    },
    queryTranslationProcessOperation(input: TranslationProcessOperationExpectationV1) {
      return invokeV1(repository, "query_process_operation", input);
    },
  };
}
