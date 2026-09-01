// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type { IndexedDbProgramPersistenceFacetOperationsV1 } from "../../../src/application/persistence/program-persistence-facet.ts";
import {
  cloneProcessHeadV1,
  exactJsonValuesEqualV1,
  type ProcessHeadV1,
} from "../../../src/program-platform/process/program-process-repository.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryOperationV1,
} from "../../../src/application/persistence/program-data-repository-failure.ts";
import {
  cloneProcessWorkspaceBindingV1,
  type ProcessWorkspaceBindingV1,
} from "../../../src/application/persistence/program-data-repository.ts";
import {
  decodeIndexedDbProcessExecutionLeaseV1,
  decodeIndexedDbProcessV1,
  digestIndexedDbOperationV1,
  indexedDbProcessExecutionTransactionStoreNamesV1,
  requestIndexedDbResultV1,
} from "../../../src/application/persistence/indexeddb-process-execution-transaction-kernel.ts";
import {
  normalizeProgramCatalogAcceptedDecisionListInputV1,
  normalizeProgramCatalogApplyRevisionInputV1,
  normalizeProgramCatalogCreateInputV1,
  normalizeProgramCatalogDecideInputV1,
  normalizeProgramCatalogListInputV1,
  normalizeProgramCatalogProgramIdV1,
  normalizeProgramCatalogProposalIdV1,
  normalizeProgramCatalogRevisionV1,
  type ProgramCatalogAcceptedDecisionV1,
  type ProgramCatalogSummaryV1,
} from "../runtime/program-catalog-repository.ts";
import {
  normalizeCreatorProgramProcessCreateBundleInputV1,
  normalizeCreatorProgramProcessDecisionBundleInputV1,
  normalizeCreatorProgramProcessExecutionRevisionBundleInputV1,
  normalizeCreatorProgramProcessRevisionBundleInputV1,
  type CreatorProgramProcessCompositeCommitResultV1,
  type CreatorProgramProcessExecutionCompositeCommitResultV1,
} from "./creator-persistence-contract.ts";
import {
  creatorCatalogStoreNamesV1,
  decodeCreatorCatalogDecisionV1,
  decodeCreatorCatalogHeadProjectionV1,
  decodeCreatorProgramRevisionV1,
  loadCreatorCatalogRecordTxV1,
  prepareCreatorCatalogApplyRevisionV1,
  prepareCreatorCatalogCreateV1,
  prepareCreatorCatalogDecisionV1,
} from "./indexeddb-creator-catalog.ts";

const repositoryOperationV1: ProgramDataRepositoryOperationV1 = "invoke_program_persistence_facet";

function cursorWalkV1(
  request: IDBRequest<IDBCursorWithValue | null>,
  visit: (cursor: IDBCursorWithValue) => "continue" | "stop",
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    request.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      reject(request.error);
    }, { once: true });
    request.addEventListener("success", () => {
      if (settled) return;
      const cursor = request.result;
      if (cursor === null) {
        settled = true;
        resolve();
        return;
      }
      try {
        if (visit(cursor) === "stop") {
          settled = true;
          resolve();
        } else cursor.continue();
      } catch (error) {
        settled = true;
        reject(error);
      }
    });
  });
}

function workspaceBindingV1(value: unknown): ProcessWorkspaceBindingV1 {
  try {
    return cloneProcessWorkspaceBindingV1(value as ProcessWorkspaceBindingV1);
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperationV1);
  }
}

async function currentCreatorProcessStateV1(
  transaction: IDBTransaction,
  processId: string,
): Promise<{
  readonly process: ProcessHeadV1 | null;
  readonly lease: ReturnType<typeof decodeIndexedDbProcessExecutionLeaseV1> | null;
}> {
  const [processRow, leaseRow] = await Promise.all([
    requestIndexedDbResultV1(transaction.objectStore("processes").get(processId)),
    requestIndexedDbResultV1(
      transaction.objectStore("process_execution_leases").get(processId),
    ),
  ]);
  return {
    process: processRow === undefined
      ? null
      : decodeIndexedDbProcessV1(processRow, repositoryOperationV1),
    lease: leaseRow === undefined
      ? null
      : decodeIndexedDbProcessExecutionLeaseV1(leaseRow, repositoryOperationV1),
  };
}

export const indexedDbCreatorPersistenceFacetOperationsV1:
  IndexedDbProgramPersistenceFacetOperationsV1 = {
    async prepare(operation, rawInput) {
      if (operation === "list_programs") {
        const input = normalizeProgramCatalogListInputV1(
          rawInput as Parameters<typeof normalizeProgramCatalogListInputV1>[0],
        );
        return {
          storeNames: ["creator_program_heads"],
          mode: "readonly",
          async invoke({ transaction, keyRange }) {
            const range = input.before === null
              ? null
              : keyRange.upperBound([input.before.updatedAt, input.before.programId], true);
            const summaries: ProgramCatalogSummaryV1[] = [];
            let bytes = 0;
            let stopped = false;
            await cursorWalkV1(
              transaction.objectStore("creator_program_heads").index("by_updated_at")
                .openCursor(range, "prev"),
              (cursor) => {
                const projection = decodeCreatorCatalogHeadProjectionV1(
                  cursor.value,
                  repositoryOperationV1,
                );
                const head = projection.head;
                const summary: ProgramCatalogSummaryV1 = {
                  programId: head.programId,
                  name: projection.name,
                  kind: projection.kind,
                  programRevision: head.currentProgramRevision,
                  proposalStatus: head.proposal.status,
                  repositoryRevision: head.repositoryRevision,
                  updatedAt: head.updatedAt,
                };
                const nextBytes = new TextEncoder().encode(JSON.stringify(summary)).byteLength;
                if (bytes + nextBytes > input.maximumBytes) {
                  stopped = true;
                  return "stop";
                }
                summaries.push(summary);
                bytes += nextBytes;
                return "continue";
              },
            );
            if (stopped && summaries.length === 0) {
              throw createProgramDataRepositoryFailureV1(
                "page_budget_too_small",
                repositoryOperationV1,
              );
            }
            const last = summaries.at(-1);
            return {
              summaries,
              nextCursor: stopped && last !== undefined
                ? { updatedAt: last.updatedAt, programId: last.programId }
                : null,
            };
          },
        };
      }

      if (operation === "load_program") {
        const programId = normalizeProgramCatalogProgramIdV1(rawInput as string);
        return {
          storeNames: [
            "creator_program_heads",
            "creator_program_revisions",
            "creator_program_decisions",
          ],
          mode: "readonly",
          invoke: ({ transaction }) =>
            loadCreatorCatalogRecordTxV1(transaction, programId, repositoryOperationV1),
        };
      }

      if (operation === "load_program_revision") {
        if (
          rawInput === null || typeof rawInput !== "object" || Array.isArray(rawInput) ||
          Reflect.ownKeys(rawInput).length !== 2 || !Object.hasOwn(rawInput, "programId") ||
          !Object.hasOwn(rawInput, "revision")
        ) throw new TypeError("invalid Creator Program revision lookup");
        const row = rawInput as { readonly programId: unknown; readonly revision: unknown };
        const programId = normalizeProgramCatalogProgramIdV1(row.programId as string);
        const revision = normalizeProgramCatalogRevisionV1(row.revision as number);
        return {
          storeNames: ["creator_program_revisions"],
          mode: "readonly",
          async invoke({ transaction }) {
            const stored = await requestIndexedDbResultV1(
              transaction.objectStore("creator_program_revisions").get([programId, revision]),
            );
            return stored === undefined
              ? null
              : decodeCreatorProgramRevisionV1(stored, repositoryOperationV1);
          },
        };
      }

      if (operation === "load_program_decision") {
        if (
          rawInput === null || typeof rawInput !== "object" || Array.isArray(rawInput) ||
          Reflect.ownKeys(rawInput).length !== 3 || !Object.hasOwn(rawInput, "programId") ||
          !Object.hasOwn(rawInput, "proposalId") ||
          !Object.hasOwn(rawInput, "programRevision")
        ) throw new TypeError("invalid Creator Program decision lookup");
        const row = rawInput as {
          readonly programId: unknown;
          readonly proposalId: unknown;
          readonly programRevision: unknown;
        };
        const programId = normalizeProgramCatalogProgramIdV1(row.programId as string);
        const proposalId = normalizeProgramCatalogProposalIdV1(row.proposalId as string);
        const programRevision = normalizeProgramCatalogRevisionV1(row.programRevision as number);
        return {
          storeNames: ["creator_program_decisions"],
          mode: "readonly",
          async invoke({ transaction }) {
            const stored = await requestIndexedDbResultV1(
              transaction.objectStore("creator_program_decisions").get([
                programId,
                proposalId,
                programRevision,
              ]),
            );
            return stored === undefined
              ? null
              : decodeCreatorCatalogDecisionV1(stored, programId, repositoryOperationV1);
          },
        };
      }

      if (operation === "load_latest_accepted_program_decision") {
        const programId = normalizeProgramCatalogProgramIdV1(rawInput as string);
        return {
          storeNames: ["creator_program_heads", "creator_program_decisions"],
          mode: "readonly",
          async invoke({ transaction }) {
            const headRow = await requestIndexedDbResultV1(
              transaction.objectStore("creator_program_heads").get(programId),
            );
            if (headRow === undefined) return null;
            const reference = decodeCreatorCatalogHeadProjectionV1(
              headRow,
              repositoryOperationV1,
            ).head.latestAccepted;
            if (reference === null) return null;
            const decisionRow = await requestIndexedDbResultV1(
              transaction.objectStore("creator_program_decisions").get([
                programId,
                reference.proposalId,
                reference.programRevision,
              ]),
            );
            if (decisionRow === undefined) {
              throw createProgramDataRepositoryFailureV1(
                "schema_invalid",
                repositoryOperationV1,
              );
            }
            const decision = decodeCreatorCatalogDecisionV1(
              decisionRow,
              programId,
              repositoryOperationV1,
            );
            if (decision.status !== "accepted") {
              throw createProgramDataRepositoryFailureV1(
                "schema_invalid",
                repositoryOperationV1,
              );
            }
            return decision;
          },
        };
      }

      if (operation === "list_accepted_program_decisions") {
        const input = normalizeProgramCatalogAcceptedDecisionListInputV1(
          rawInput as Parameters<
            typeof normalizeProgramCatalogAcceptedDecisionListInputV1
          >[0],
        );
        return {
          storeNames: ["creator_program_decisions"],
          mode: "readonly",
          async invoke({ transaction, keyRange }) {
            const upper = input.beforeProgramRevision ?? Number.MAX_SAFE_INTEGER;
            const range = keyRange.bound(
              [input.programId, 0],
              [input.programId, upper],
              false,
              input.beforeProgramRevision !== null,
            );
            const decisions: ProgramCatalogAcceptedDecisionV1[] = [];
            let bytes = 0;
            let stopped = false;
            let lastScanned: number | null = null;
            await cursorWalkV1(
              transaction.objectStore("creator_program_decisions")
                .index("by_program_revision").openCursor(range, "prev"),
              (cursor) => {
                const decision = decodeCreatorCatalogDecisionV1(
                  cursor.value,
                  input.programId,
                  repositoryOperationV1,
                );
                const nextBytes = new TextEncoder().encode(JSON.stringify(decision)).byteLength;
                if (bytes + nextBytes > input.maximumBytes) {
                  stopped = true;
                  return "stop";
                }
                bytes += nextBytes;
                lastScanned = decision.programRevision;
                if (decision.status === "accepted") decisions.push(decision);
                return "continue";
              },
            );
            if (stopped && lastScanned === null) {
              throw createProgramDataRepositoryFailureV1(
                "page_budget_too_small",
                repositoryOperationV1,
              );
            }
            return { decisions, nextCursor: stopped ? lastScanned : null };
          },
        };
      }

      if (
        operation === "create_program" || operation === "apply_program_revision" ||
        operation === "decide_program"
      ) {
        const input = operation === "create_program"
          ? normalizeProgramCatalogCreateInputV1(
            rawInput as Parameters<typeof normalizeProgramCatalogCreateInputV1>[0],
          )
          : operation === "apply_program_revision"
          ? normalizeProgramCatalogApplyRevisionInputV1(
            rawInput as Parameters<typeof normalizeProgramCatalogApplyRevisionInputV1>[0],
          )
          : normalizeProgramCatalogDecideInputV1(
            rawInput as Parameters<typeof normalizeProgramCatalogDecideInputV1>[0],
          );
        const digest = await digestIndexedDbOperationV1(input);
        return {
          storeNames: operation === "apply_program_revision"
            ? [...creatorCatalogStoreNamesV1, "process_workspace_bindings"]
            : [...creatorCatalogStoreNamesV1],
          mode: "readwrite",
          async invoke({ transaction }) {
            const prepared = operation === "create_program"
              ? await prepareCreatorCatalogCreateV1({
                transaction,
                value: input as ReturnType<typeof normalizeProgramCatalogCreateInputV1>,
                digest,
                repositoryOperation: repositoryOperationV1,
              })
              : operation === "apply_program_revision"
              ? await prepareCreatorCatalogApplyRevisionV1({
                transaction,
                value: input as ReturnType<typeof normalizeProgramCatalogApplyRevisionInputV1>,
                digest,
                repositoryOperation: repositoryOperationV1,
              })
              : await prepareCreatorCatalogDecisionV1({
                transaction,
                value: input as ReturnType<typeof normalizeProgramCatalogDecideInputV1>,
                digest,
                repositoryOperation: repositoryOperationV1,
              });
            if (prepared.kind === "committed") await prepared.write();
            return prepared.kind === "conflict"
              ? { kind: "conflict", current: prepared.current }
              : { kind: prepared.kind, record: prepared.record };
          },
        };
      }

      if (operation === "create_program_with_process") {
        const input = normalizeCreatorProgramProcessCreateBundleInputV1(
          rawInput as Parameters<typeof normalizeCreatorProgramProcessCreateBundleInputV1>[0],
        );
        const compositeDigest = await digestIndexedDbOperationV1(input);
        return {
          storeNames: [
            ...creatorCatalogStoreNamesV1,
            ...indexedDbProcessExecutionTransactionStoreNamesV1,
            "process_workspace_bindings",
          ],
          mode: "readwrite",
          async invoke({ transaction, processExecution }) {
            const bindings = transaction.objectStore("process_workspace_bindings");
            const [currentProgram, currentProcess, workspaceRow, volumeOwnerRow] = await Promise
              .all([
                loadCreatorCatalogRecordTxV1(
                  transaction,
                  input.catalog.program.programId,
                  repositoryOperationV1,
                ),
                processExecution.loadProcess(input.process.processId),
                requestIndexedDbResultV1(bindings.get(input.process.processId)),
                requestIndexedDbResultV1(
                  bindings.index("by_volume_id").get(input.workspace.volumeId),
                ),
              ]);
            const currentWorkspace = workspaceRow === undefined
              ? null
              : workspaceBindingV1(workspaceRow);
            const volumeOwner = volumeOwnerRow === undefined
              ? null
              : workspaceBindingV1(volumeOwnerRow);
            if (volumeOwner !== null && volumeOwner.processId !== input.process.processId) {
              return { kind: "workspace_volume_owned", owner: volumeOwner };
            }
            const initialProcess = cloneProcessHeadV1({
              schemaVersion: 1,
              processId: input.process.processId,
              revision: 1,
              programPackage: input.process.programPackage,
              subjectProgramId: input.process.subjectProgramId,
              status: "active",
              transcriptFrontier: 0,
              activeAttempt: null,
              lastTerminalAttempt: null,
              checkpoint: null,
              createdAt: input.process.createdAt,
              updatedAt: input.process.createdAt,
            });
            const [catalog, process] = await Promise.all([
              prepareCreatorCatalogCreateV1({
                transaction,
                value: input.catalog,
                digest: compositeDigest,
                repositoryOperation: repositoryOperationV1,
              }),
              processExecution.prepareTranscriptAppend({
                value: input.transcript,
                digest: compositeDigest,
                initialProcess,
              }),
            ]);
            if (
              catalog.kind === "conflict" || process.kind === "conflict" ||
              catalog.kind !== process.kind ||
              (currentWorkspace !== null &&
                !exactJsonValuesEqualV1(currentWorkspace, input.workspace))
            ) return { kind: "conflict", currentProgram, currentProcess };
            if (catalog.kind === "unchanged" && process.kind === "unchanged") {
              if (currentWorkspace === null) {
                throw createProgramDataRepositoryFailureV1(
                  "schema_invalid",
                  repositoryOperationV1,
                );
              }
              return {
                kind: "unchanged",
                record: catalog.record,
                process: process.process,
                entries: process.entries,
                terminalAttemptReceipt: process.terminalAttemptReceipt,
              };
            }
            if (
              catalog.kind !== "committed" || process.kind !== "committed" ||
              currentWorkspace !== null
            ) return { kind: "conflict", currentProgram, currentProcess };
            await Promise.all([
              catalog.write(),
              process.write(),
              requestIndexedDbResultV1(bindings.add(input.workspace)),
            ]);
            return {
              kind: "committed",
              record: catalog.record,
              process: process.process,
              entries: process.entries,
              terminalAttemptReceipt: process.terminalAttemptReceipt,
            };
          },
        };
      }

      if (
        operation === "apply_program_revision_with_process_transcript" ||
        operation === "decide_program_with_process_transcript"
      ) {
        const input = operation === "apply_program_revision_with_process_transcript"
          ? normalizeCreatorProgramProcessRevisionBundleInputV1(
            rawInput as Parameters<
              typeof normalizeCreatorProgramProcessRevisionBundleInputV1
            >[0],
          )
          : normalizeCreatorProgramProcessDecisionBundleInputV1(
            rawInput as Parameters<
              typeof normalizeCreatorProgramProcessDecisionBundleInputV1
            >[0],
          );
        const compositeDigest = await digestIndexedDbOperationV1(input);
        return {
          storeNames: [
            ...creatorCatalogStoreNamesV1,
            ...indexedDbProcessExecutionTransactionStoreNamesV1,
            "process_workspace_bindings",
          ],
          mode: "readwrite",
          async invoke(
            { transaction, processExecution },
          ): Promise<CreatorProgramProcessCompositeCommitResultV1> {
            const programId = input.catalog.programId;
            const [currentProgram, currentProcess] = await Promise.all([
              loadCreatorCatalogRecordTxV1(transaction, programId, repositoryOperationV1),
              processExecution.loadProcess(input.transcript.processId),
            ]);
            const [catalog, process] = await Promise.all([
              operation === "apply_program_revision_with_process_transcript"
                ? prepareCreatorCatalogApplyRevisionV1({
                  transaction,
                  value: input.catalog as ReturnType<
                    typeof normalizeProgramCatalogApplyRevisionInputV1
                  >,
                  digest: compositeDigest,
                  repositoryOperation: repositoryOperationV1,
                })
                : prepareCreatorCatalogDecisionV1({
                  transaction,
                  value: input.catalog as ReturnType<typeof normalizeProgramCatalogDecideInputV1>,
                  digest: compositeDigest,
                  repositoryOperation: repositoryOperationV1,
                }),
              processExecution.prepareTranscriptAppend({
                value: input.transcript,
                digest: compositeDigest,
              }),
            ]);
            if (
              catalog.kind === "conflict" || process.kind === "conflict" ||
              catalog.kind !== process.kind || process.process.subjectProgramId !== programId
            ) return { kind: "conflict", currentProgram, currentProcess };
            if (catalog.kind === "committed" && process.kind === "committed") {
              await Promise.all([catalog.write(), process.write()]);
            }
            return {
              kind: catalog.kind,
              record: catalog.record,
              process: process.process,
              entries: process.entries,
              terminalAttemptReceipt: process.terminalAttemptReceipt,
            };
          },
        };
      }

      if (operation === "commit_program_revision_with_process_execution_terminal") {
        const input = normalizeCreatorProgramProcessExecutionRevisionBundleInputV1(
          rawInput as Parameters<
            typeof normalizeCreatorProgramProcessExecutionRevisionBundleInputV1
          >[0],
        );
        const digest = await digestIndexedDbOperationV1(input);
        return {
          storeNames: [
            ...creatorCatalogStoreNamesV1,
            ...indexedDbProcessExecutionTransactionStoreNamesV1,
            "process_workspace_bindings",
          ],
          mode: "readwrite",
          async invoke(
            { transaction, processExecution },
          ): Promise<CreatorProgramProcessExecutionCompositeCommitResultV1> {
            const processId = input.transcript.processId;
            const [currentProgram, currentState] = await Promise.all([
              loadCreatorCatalogRecordTxV1(
                transaction,
                input.catalog.programId,
                repositoryOperationV1,
              ),
              currentCreatorProcessStateV1(transaction, processId),
            ]);
            const terminal = await processExecution.prepareTerminal({
              value: input,
              operation: "execution_terminal",
              digest,
              validateReplayEvidence: async () => {
                const row = await requestIndexedDbResultV1(
                  transaction.objectStore("creator_program_revisions").get([
                    input.catalog.programId,
                    input.catalog.program.revision,
                  ]),
                );
                if (
                  row === undefined ||
                  !exactJsonValuesEqualV1(
                    decodeCreatorProgramRevisionV1(row, repositoryOperationV1),
                    input.catalog.program,
                  )
                ) {
                  throw createProgramDataRepositoryFailureV1(
                    "schema_invalid",
                    repositoryOperationV1,
                  );
                }
              },
            });
            if (
              terminal.kind === "conflict" ||
              terminal.process.subjectProgramId !== input.catalog.programId
            ) {
              return {
                kind: "conflict",
                currentProgram,
                currentProcess: currentState.process,
                currentLease: currentState.lease,
              };
            }
            if (terminal.kind === "unchanged") {
              if (
                currentProgram === null ||
                currentProgram.head.currentProgramRevision <
                  input.catalog.program.revision ||
                currentProgram.head.repositoryRevision <
                  input.catalog.expectedRepositoryRevision + 1
              ) {
                throw createProgramDataRepositoryFailureV1(
                  "schema_invalid",
                  repositoryOperationV1,
                );
              }
              return {
                kind: "unchanged",
                record: currentProgram,
                process: terminal.process,
                entries: terminal.entries,
                operationReceipt: terminal.operationReceipt,
              };
            }
            const catalog = await prepareCreatorCatalogApplyRevisionV1({
              transaction,
              value: input.catalog,
              digest: null,
              repositoryOperation: repositoryOperationV1,
            });
            if (catalog.kind !== "committed") {
              return {
                kind: "conflict",
                currentProgram,
                currentProcess: currentState.process,
                currentLease: currentState.lease,
              };
            }
            if (
              catalog.record.head.currentProgramRevision !==
                input.catalog.program.revision ||
              catalog.record.head.repositoryRevision !==
                input.catalog.expectedRepositoryRevision + 1
            ) {
              throw createProgramDataRepositoryFailureV1(
                "schema_invalid",
                repositoryOperationV1,
              );
            }
            await Promise.all([catalog.write(), terminal.write()]);
            return {
              kind: "committed",
              record: catalog.record,
              process: terminal.process,
              entries: terminal.entries,
              operationReceipt: terminal.operationReceipt,
            };
          },
        };
      }

      if (operation === "query_process_operation") {
        if (
          rawInput === null || typeof rawInput !== "object" || Array.isArray(rawInput) ||
          Reflect.ownKeys(rawInput).length !== 2 ||
          (rawInput as { readonly operation?: unknown }).operation !==
            "program_revision_terminal" ||
          !Object.hasOwn(rawInput, "input")
        ) throw new TypeError("invalid Creator Process operation expectation");
        const input = normalizeCreatorProgramProcessExecutionRevisionBundleInputV1(
          (rawInput as { readonly input: unknown }).input as Parameters<
            typeof normalizeCreatorProgramProcessExecutionRevisionBundleInputV1
          >[0],
        );
        const digest = await digestIndexedDbOperationV1(input);
        return {
          storeNames: [
            "process_commits",
            "processes",
            "transcript_entries",
            "creator_program_revisions",
          ],
          mode: "readonly",
          async invoke({ transaction, processExecution }) {
            const receipt = await processExecution.loadOperationReceipt(
              input.transcript.processId,
              input.transcript.commitId,
            );
            if (receipt === "absent") return { kind: "absent" };
            if (
              receipt === "invalid" || receipt.operation !== "execution_terminal" ||
              receipt.operationDigest !== digest
            ) return { kind: "mismatch", receipt: receipt === "invalid" ? null : receipt };
            const process = await processExecution.loadProcess(input.transcript.processId);
            if (
              process === null || process.revision < receipt.processRevision ||
              process.transcriptFrontier < receipt.transcriptFrontier
            ) {
              throw createProgramDataRepositoryFailureV1(
                "schema_invalid",
                repositoryOperationV1,
              );
            }
            for (const expected of input.transcript.entries) {
              const row = await requestIndexedDbResultV1(
                transaction.objectStore("transcript_entries").get([
                  expected.processId,
                  expected.sequence,
                ]),
              );
              if (row === undefined || !exactJsonValuesEqualV1(row, expected)) {
                throw createProgramDataRepositoryFailureV1(
                  "schema_invalid",
                  repositoryOperationV1,
                );
              }
            }
            const programRow = await requestIndexedDbResultV1(
              transaction.objectStore("creator_program_revisions").get([
                input.catalog.program.programId,
                input.catalog.program.revision,
              ]),
            );
            if (
              programRow === undefined ||
              !exactJsonValuesEqualV1(
                decodeCreatorProgramRevisionV1(programRow, repositoryOperationV1),
                input.catalog.program,
              )
            ) {
              throw createProgramDataRepositoryFailureV1(
                "schema_invalid",
                repositoryOperationV1,
              );
            }
            return { kind: "committed", receipt };
          },
        };
      }

      throw new TypeError(`unsupported Creator persistence operation: ${operation}`);
    },
  };
