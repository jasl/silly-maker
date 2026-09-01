// SPDX-License-Identifier: MIT

export type ProgramDataRepositoryOperationV1 =
  | "initialize"
  | "list_programs"
  | "load_program"
  | "load_program_revision"
  | "load_program_decision"
  | "load_latest_accepted_program_decision"
  | "list_accepted_program_decisions"
  | "create_program"
  | "apply_program_revision"
  | "decide_program_proposal"
  | "create_program_with_process"
  | "create_process_with_workspace"
  | "load_process_workspace_binding"
  | "apply_program_revision_with_process_transcript"
  | "decide_program_with_process_transcript"
  | "create_process"
  | "load_process"
  | "load_process_settings_override"
  | "set_process_settings_override"
  | "list_process_summaries"
  | "list_recent_process_summaries"
  | "begin_process_attempt"
  | "append_process_transcript"
  | "acquire_process_execution"
  | "renew_process_execution_lease"
  | "release_process_execution_lease"
  | "load_process_execution_lease"
  | "commit_process_execution_terminal"
  | "commit_program_revision_with_process_execution_terminal"
  | "query_process_operation"
  | "invoke_program_persistence_facet"
  | "load_transcript_page"
  | "load_process_network_access"
  | "set_process_network_access"
  | "reset"
  | "dispose";

export type ProgramDataRepositoryFailureCodeV1 =
  | "unavailable"
  | "database_newer"
  | "upgrade_blocked"
  | "quota_exceeded"
  | "transaction_aborted"
  | "request_failed"
  | "schema_invalid"
  | "disposed"
  | "wire_invalid"
  | "outcome_unknown"
  | "page_budget_too_small";

export interface ProgramDataRepositoryFailureV1 extends Error {
  readonly code: ProgramDataRepositoryFailureCodeV1;
  readonly operation: ProgramDataRepositoryOperationV1;
}

export function createProgramDataRepositoryFailureV1(
  code: ProgramDataRepositoryFailureCodeV1,
  operation: ProgramDataRepositoryOperationV1,
): ProgramDataRepositoryFailureV1 {
  const failure = new Error(
    `sillyos.program_data_repository.${code}`,
  ) as ProgramDataRepositoryFailureV1;
  failure.name = "ProgramDataRepositoryFailureV1";
  Object.defineProperties(failure, {
    code: { value: code, enumerable: true },
    operation: { value: operation, enumerable: true },
  });
  delete failure.stack;
  return failure;
}

export function isProgramDataRepositoryFailureV1(
  value: unknown,
): value is ProgramDataRepositoryFailureV1 {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<ProgramDataRepositoryFailureV1>;
  return candidate.name === "ProgramDataRepositoryFailureV1" &&
    typeof candidate.code === "string" && typeof candidate.operation === "string";
}
