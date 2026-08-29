// SPDX-License-Identifier: MIT

import {
  advanceBrowserProgramContinuationV1,
  applyProgramRepositoryAgentRunTerminalV3,
  applyProgramRepositoryDecisionV3,
  applyProgramRepositoryRevisionV3,
  browserProgramContinuationManifestsEqualV1,
  browserProgramContinuationMatchesAggregateV1,
  browserProgramContinuationMatchesMutationPreStateV3,
  buildProgramRepositoryCreateV3,
  cloneBrowserProgramContinuationManifestV1,
  cloneProgramRepositoryAggregateV3,
  createProgramRepositoryFailureV3,
  normalizeProgramRepositoryApplyRevisionInputV3,
  normalizeProgramRepositoryCreateInputV3,
  normalizeProgramRepositoryDecideInputV3,
  normalizeProgramRepositorySettleAgentRunInputV3,
  normalizeProgramRepositoryProgramIdV3,
  programRepositoryMaximumProgramsV3,
  programRepositoryAggregatesEqualV3,
  sortProgramRepositorySummariesV3,
  summarizeProgramRepositoryAggregateV3,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryAggregateV3,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "./program-repository.ts";
import {
  applyProgramNetworkAccessMutationV1,
  cloneProgramNetworkAccessV1,
  createDefaultProgramNetworkAccessV1,
  normalizeProgramNetworkAccessMutationV1,
  type ProgramNetworkAccessV1,
} from "./program-network-access.ts";

export interface MemoryProgramRepositoryBackingV3 {
  readonly programs: Map<string, ProgramRepositoryAggregateV3>;
  readonly workspaceContinuations: Map<string, BrowserProgramContinuationManifestV1>;
  readonly programNetworkAccess: Map<string, ProgramNetworkAccessV1>;
}

export function createMemoryProgramRepositoryBackingV3(): MemoryProgramRepositoryBackingV3 {
  return {
    programs: new Map(),
    workspaceContinuations: new Map(),
    programNetworkAccess: new Map(),
  };
}

/** Deterministic V3 conformance adapter. It shares only an explicit backing. */
export function createMemoryProgramRepositoryV3(input: {
  readonly backing?: MemoryProgramRepositoryBackingV3;
} = {}): ProgramRepositoryWithWorkspaceContinuationV1 {
  const backing = input.backing ?? createMemoryProgramRepositoryBackingV3();
  let disposed = false;

  const assertAvailableV1 = (
    operation: Parameters<typeof createProgramRepositoryFailureV3>[1],
  ): void => {
    if (disposed) throw createProgramRepositoryFailureV3("disposed", operation);
  };

  const loadStoredPairV3 = (
    programId: string,
    operation: Parameters<typeof createProgramRepositoryFailureV3>[1],
  ): {
    readonly aggregate: ProgramRepositoryAggregateV3;
    readonly continuation: BrowserProgramContinuationManifestV1;
  } | null => {
    const storedAggregate = backing.programs.get(programId);
    const storedContinuation = backing.workspaceContinuations.get(programId);
    if (storedAggregate === undefined && storedContinuation === undefined) return null;
    if (storedAggregate === undefined || storedContinuation === undefined) {
      throw createProgramRepositoryFailureV3("schema_invalid", operation);
    }
    let aggregate: ProgramRepositoryAggregateV3;
    let continuation: BrowserProgramContinuationManifestV1;
    try {
      aggregate = cloneProgramRepositoryAggregateV3(storedAggregate);
      continuation = cloneBrowserProgramContinuationManifestV1(storedContinuation);
    } catch {
      throw createProgramRepositoryFailureV3("schema_invalid", operation);
    }
    if (!browserProgramContinuationMatchesAggregateV1(continuation, aggregate)) {
      throw createProgramRepositoryFailureV3("schema_invalid", operation);
    }
    return { aggregate, continuation };
  };

  const loadStoredNetworkAccessV1 = (
    programId: string,
    operation: Parameters<typeof createProgramRepositoryFailureV3>[1],
  ): ProgramNetworkAccessV1 | null => {
    const pair = loadStoredPairV3(programId, operation);
    if (pair === null) return null;
    const stored = backing.programNetworkAccess.get(programId);
    if (stored === undefined) return createDefaultProgramNetworkAccessV1(programId);
    try {
      const access = cloneProgramNetworkAccessV1(stored);
      if (access.programId !== pair.aggregate.programId) {
        throw new TypeError("Program network access identity mismatch");
      }
      return access;
    } catch {
      throw createProgramRepositoryFailureV3("schema_invalid", operation);
    }
  };

  const writePairAtomicallyV3 = (pair: {
    readonly programId: string;
    readonly aggregate: ProgramRepositoryAggregateV3;
    readonly continuation: BrowserProgramContinuationManifestV1;
    readonly operation: Parameters<typeof createProgramRepositoryFailureV3>[1];
  }): void => {
    const previousAggregate = backing.programs.get(pair.programId);
    const previousContinuation = backing.workspaceContinuations.get(pair.programId);
    try {
      backing.programs.set(pair.programId, pair.aggregate);
      backing.workspaceContinuations.set(pair.programId, pair.continuation);
    } catch {
      try {
        if (previousAggregate === undefined) backing.programs.delete(pair.programId);
        else backing.programs.set(pair.programId, previousAggregate);
        if (previousContinuation === undefined) {
          backing.workspaceContinuations.delete(pair.programId);
        } else backing.workspaceContinuations.set(pair.programId, previousContinuation);
      } catch {
        // One-shot conformance failures restore through the same backing. A backing
        // that also rejects rollback is unavailable to this deterministic adapter.
      }
      throw createProgramRepositoryFailureV3("transaction_aborted", pair.operation);
    }
  };

  const commitPairV3 = (
    current: {
      readonly aggregate: ProgramRepositoryAggregateV3;
      readonly continuation: BrowserProgramContinuationManifestV1;
    },
    next: ProgramRepositoryAggregateV3,
    operation: Parameters<typeof createProgramRepositoryFailureV3>[1],
  ): void => {
    const nextAggregate = cloneProgramRepositoryAggregateV3(next);
    const nextContinuation = advanceBrowserProgramContinuationV1(current.continuation, next);
    writePairAtomicallyV3({
      programId: next.programId,
      aggregate: nextAggregate,
      continuation: nextContinuation,
      operation,
    });
  };

  return {
    async initialize(): Promise<void> {
      assertAvailableV1("initialize");
    },

    async list() {
      assertAvailableV1("list");
      const programIds = new Set([
        ...backing.programs.keys(),
        ...backing.workspaceContinuations.keys(),
      ]);
      return sortProgramRepositorySummariesV3(
        [...programIds].map((programId) => {
          const pair = loadStoredPairV3(programId, "list");
          if (pair === null) throw createProgramRepositoryFailureV3("schema_invalid", "list");
          return summarizeProgramRepositoryAggregateV3(pair.aggregate);
        }),
      );
    },

    async load(rawProgramId) {
      assertAvailableV1("load");
      const programId = normalizeProgramRepositoryProgramIdV3(rawProgramId);
      return loadStoredPairV3(programId, "load")?.aggregate ?? null;
    },

    async loadWorkspaceContinuation(rawProgramId) {
      assertAvailableV1("load_workspace_continuation");
      const programId = normalizeProgramRepositoryProgramIdV3(rawProgramId);
      return loadStoredPairV3(programId, "load_workspace_continuation")?.continuation ?? null;
    },

    async loadProgramNetworkAccess(rawProgramId) {
      assertAvailableV1("load_program_network_access");
      const programId = normalizeProgramRepositoryProgramIdV3(rawProgramId);
      return loadStoredNetworkAccessV1(programId, "load_program_network_access");
    },

    async setProgramNetworkAccess(rawInput) {
      assertAvailableV1("set_program_network_access");
      const mutation = normalizeProgramNetworkAccessMutationV1(rawInput);
      const current = loadStoredNetworkAccessV1(
        mutation.programId,
        "set_program_network_access",
      );
      if (current === null) return { kind: "missing" };
      const applied = applyProgramNetworkAccessMutationV1(current, mutation);
      if (applied.kind === "unchanged") {
        return { kind: "unchanged", value: cloneProgramNetworkAccessV1(applied.value) };
      }
      const next = cloneProgramNetworkAccessV1(applied.value);
      const previous = backing.programNetworkAccess.get(mutation.programId);
      try {
        if (next.enabled) backing.programNetworkAccess.set(mutation.programId, next);
        else backing.programNetworkAccess.delete(mutation.programId);
      } catch {
        try {
          if (previous === undefined) backing.programNetworkAccess.delete(mutation.programId);
          else backing.programNetworkAccess.set(mutation.programId, previous);
        } catch {
          // The deterministic backing is unavailable if both mutation and rollback reject.
        }
        throw createProgramRepositoryFailureV3(
          "transaction_aborted",
          "set_program_network_access",
        );
      }
      return { kind: "committed", value: cloneProgramNetworkAccessV1(next) };
    },

    async create(rawInput) {
      assertAvailableV1("create");
      const normalized = normalizeProgramRepositoryCreateInputV3(rawInput);
      const candidate = buildProgramRepositoryCreateV3(normalized);
      const existing = loadStoredPairV3(candidate.programId, "create");
      if (existing !== null) {
        if (
          programRepositoryAggregatesEqualV3(existing.aggregate, candidate) &&
          browserProgramContinuationManifestsEqualV1(
            existing.continuation,
            normalized.continuation,
          )
        ) {
          return {
            kind: "unchanged",
            aggregate: cloneProgramRepositoryAggregateV3(existing.aggregate),
          };
        }
        return {
          kind: "conflict",
          current: cloneProgramRepositoryAggregateV3(existing.aggregate),
        };
      }
      if (backing.programs.size >= programRepositoryMaximumProgramsV3) {
        throw createProgramRepositoryFailureV3("quota_exceeded", "create");
      }
      const storedAggregate = cloneProgramRepositoryAggregateV3(candidate);
      const storedContinuation = cloneBrowserProgramContinuationManifestV1(normalized.continuation);
      writePairAtomicallyV3({
        programId: candidate.programId,
        aggregate: storedAggregate,
        continuation: storedContinuation,
        operation: "create",
      });
      return { kind: "committed", aggregate: cloneProgramRepositoryAggregateV3(candidate) };
    },

    async applyRevision(rawInput) {
      assertAvailableV1("apply_revision");
      const normalized = normalizeProgramRepositoryApplyRevisionInputV3(rawInput);
      const current = loadStoredPairV3(normalized.programId, "apply_revision");
      if (current === null) return { kind: "conflict", current: null };
      if (
        !browserProgramContinuationMatchesMutationPreStateV3(
          normalized.continuation,
          current.continuation,
          normalized.expectedRepositoryRevision,
        )
      ) {
        return {
          kind: "conflict",
          current: cloneProgramRepositoryAggregateV3(current.aggregate),
        };
      }
      const result = applyProgramRepositoryRevisionV3(current.aggregate, normalized);
      if (result.kind === "committed") {
        commitPairV3(current, result.aggregate, "apply_revision");
      }
      if (result.kind === "conflict") {
        return {
          kind: "conflict",
          current: result.current === null
            ? null
            : cloneProgramRepositoryAggregateV3(result.current),
        };
      }
      return { ...result, aggregate: cloneProgramRepositoryAggregateV3(result.aggregate) };
    },

    async decide(rawInput) {
      assertAvailableV1("decide");
      const normalized = normalizeProgramRepositoryDecideInputV3(rawInput);
      const current = loadStoredPairV3(normalized.programId, "decide");
      if (current === null) return { kind: "conflict", current: null };
      if (
        !browserProgramContinuationMatchesMutationPreStateV3(
          normalized.continuation,
          current.continuation,
          normalized.expectedRepositoryRevision,
        )
      ) {
        return {
          kind: "conflict",
          current: cloneProgramRepositoryAggregateV3(current.aggregate),
        };
      }
      const result = applyProgramRepositoryDecisionV3(current.aggregate, normalized);
      if (result.kind === "committed") {
        commitPairV3(current, result.aggregate, "decide");
      }
      if (result.kind === "conflict") {
        return {
          kind: "conflict",
          current: result.current === null
            ? null
            : cloneProgramRepositoryAggregateV3(result.current),
        };
      }
      return { ...result, aggregate: cloneProgramRepositoryAggregateV3(result.aggregate) };
    },

    async settleAgentRun(rawInput) {
      assertAvailableV1("settle_agent_run");
      const normalized = normalizeProgramRepositorySettleAgentRunInputV3(rawInput);
      const current = loadStoredPairV3(normalized.programId, "settle_agent_run");
      if (current === null) return { kind: "conflict", current: null };
      if (
        !browserProgramContinuationMatchesMutationPreStateV3(
          normalized.continuation,
          current.continuation,
          normalized.expectedRepositoryRevision,
        )
      ) {
        return {
          kind: "conflict",
          current: cloneProgramRepositoryAggregateV3(current.aggregate),
        };
      }
      const result = applyProgramRepositoryAgentRunTerminalV3(current.aggregate, normalized);
      if (result.kind === "committed") {
        commitPairV3(current, result.aggregate, "settle_agent_run");
      }
      if (result.kind === "conflict") {
        return {
          kind: "conflict",
          current: result.current === null
            ? null
            : cloneProgramRepositoryAggregateV3(result.current),
        };
      }
      return { ...result, aggregate: cloneProgramRepositoryAggregateV3(result.aggregate) };
    },

    async reset(): Promise<void> {
      assertAvailableV1("reset");
      backing.programs.clear();
      backing.workspaceContinuations.clear();
      backing.programNetworkAccess.clear();
    },

    async dispose(): Promise<void> {
      disposed = true;
    },
  };
}
