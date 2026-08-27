// SPDX-License-Identifier: MIT

import {
  advanceBrowserProgramContinuationV1,
  applyProgramRepositoryAgentRunTerminalV2,
  applyProgramRepositoryDecisionV2,
  applyProgramRepositoryRevisionV2,
  browserProgramContinuationManifestsEqualV1,
  browserProgramContinuationMatchesAggregateV1,
  buildProgramRepositoryCreateV2,
  cloneBrowserProgramContinuationManifestV1,
  cloneProgramRepositoryAggregateV2,
  createProgramRepositoryFailureV2,
  normalizeProgramRepositoryApplyRevisionInputV2,
  normalizeProgramRepositoryCreateInputV2,
  normalizeProgramRepositoryDecideInputV2,
  normalizeProgramRepositorySettleAgentRunInputV2,
  normalizeProgramRepositoryProgramIdV2,
  normalizeProgramRepositoryWorkspaceContinuationInsertV1,
  programRepositoryMaximumProgramsV2,
  programRepositoryAggregatesEqualV2,
  sortProgramRepositorySummariesV2,
  summarizeProgramRepositoryAggregateV2,
  type BrowserProgramContinuationManifestV1,
  type ProgramRepositoryAggregateV2,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "./program-repository.ts";

export interface MemoryProgramRepositoryBackingV2 {
  readonly programs: Map<string, ProgramRepositoryAggregateV2>;
  readonly workspaceContinuations: Map<string, BrowserProgramContinuationManifestV1>;
}

export function createMemoryProgramRepositoryBackingV2(): MemoryProgramRepositoryBackingV2 {
  return { programs: new Map(), workspaceContinuations: new Map() };
}

/** Deterministic P2 conformance adapter. It shares only an explicit backing. */
export function createMemoryProgramRepositoryV2(input: {
  readonly backing?: MemoryProgramRepositoryBackingV2;
} = {}): ProgramRepositoryWithWorkspaceContinuationV1 {
  const backing = input.backing ?? createMemoryProgramRepositoryBackingV2();
  let disposed = false;

  const assertAvailableV1 = (
    operation: Parameters<typeof createProgramRepositoryFailureV2>[1],
  ): void => {
    if (disposed) throw createProgramRepositoryFailureV2("disposed", operation);
  };

  const loadStoredContinuationV1 = (
    programId: string,
    aggregate: ProgramRepositoryAggregateV2 | undefined,
    operation: Parameters<typeof createProgramRepositoryFailureV2>[1],
  ): BrowserProgramContinuationManifestV1 | null => {
    const stored = backing.workspaceContinuations.get(programId);
    if (stored === undefined) return null;
    let continuation: BrowserProgramContinuationManifestV1;
    try {
      continuation = cloneBrowserProgramContinuationManifestV1(stored);
    } catch {
      throw createProgramRepositoryFailureV2("schema_invalid", operation);
    }
    if (
      aggregate === undefined ||
      !browserProgramContinuationMatchesAggregateV1(continuation, aggregate)
    ) throw createProgramRepositoryFailureV2("schema_invalid", operation);
    return continuation;
  };

  const commitAggregateV1 = (
    current: ProgramRepositoryAggregateV2,
    next: ProgramRepositoryAggregateV2,
    operation: Parameters<typeof createProgramRepositoryFailureV2>[1],
  ): void => {
    const continuation = loadStoredContinuationV1(current.programId, current, operation);
    const nextContinuation = continuation === null
      ? null
      : advanceBrowserProgramContinuationV1(continuation, next);
    backing.programs.set(next.programId, cloneProgramRepositoryAggregateV2(next));
    if (nextContinuation !== null) {
      backing.workspaceContinuations.set(
        next.programId,
        cloneBrowserProgramContinuationManifestV1(nextContinuation),
      );
    }
  };

  return {
    async initialize(): Promise<void> {
      assertAvailableV1("initialize");
    },

    async list() {
      assertAvailableV1("list");
      return sortProgramRepositorySummariesV2(
        [...backing.programs.values()].map((aggregate) =>
          summarizeProgramRepositoryAggregateV2(aggregate)
        ),
      );
    },

    async load(rawProgramId) {
      assertAvailableV1("load");
      const programId = normalizeProgramRepositoryProgramIdV2(rawProgramId);
      const aggregate = backing.programs.get(programId);
      return aggregate === undefined ? null : cloneProgramRepositoryAggregateV2(aggregate);
    },

    async loadWorkspaceContinuation(rawProgramId) {
      assertAvailableV1("load_workspace_continuation");
      const programId = normalizeProgramRepositoryProgramIdV2(rawProgramId);
      const aggregate = backing.programs.get(programId);
      return loadStoredContinuationV1(
        programId,
        aggregate,
        "load_workspace_continuation",
      );
    },

    async create(rawInput) {
      assertAvailableV1("create");
      const normalized = normalizeProgramRepositoryCreateInputV2(rawInput);
      const candidate = buildProgramRepositoryCreateV2(normalized);
      const existing = backing.programs.get(candidate.programId);
      loadStoredContinuationV1(candidate.programId, existing, "create");
      if (existing !== undefined) {
        if (programRepositoryAggregatesEqualV2(existing, candidate)) {
          return { kind: "unchanged", aggregate: cloneProgramRepositoryAggregateV2(existing) };
        }
        return { kind: "conflict", current: cloneProgramRepositoryAggregateV2(existing) };
      }
      if (backing.programs.size >= programRepositoryMaximumProgramsV2) {
        throw createProgramRepositoryFailureV2("quota_exceeded", "create");
      }
      backing.programs.set(candidate.programId, cloneProgramRepositoryAggregateV2(candidate));
      return { kind: "committed", aggregate: cloneProgramRepositoryAggregateV2(candidate) };
    },

    async applyRevision(rawInput) {
      assertAvailableV1("apply_revision");
      const normalized = normalizeProgramRepositoryApplyRevisionInputV2(rawInput);
      const current = backing.programs.get(normalized.programId);
      loadStoredContinuationV1(normalized.programId, current, "apply_revision");
      if (current === undefined) return { kind: "conflict", current: null };
      const result = applyProgramRepositoryRevisionV2(current, normalized);
      if (result.kind === "committed") {
        commitAggregateV1(current, result.aggregate, "apply_revision");
      }
      if (result.kind === "conflict") {
        return {
          kind: "conflict",
          current: result.current === null
            ? null
            : cloneProgramRepositoryAggregateV2(result.current),
        };
      }
      return { ...result, aggregate: cloneProgramRepositoryAggregateV2(result.aggregate) };
    },

    async decide(rawInput) {
      assertAvailableV1("decide");
      const normalized = normalizeProgramRepositoryDecideInputV2(rawInput);
      const current = backing.programs.get(normalized.programId);
      loadStoredContinuationV1(normalized.programId, current, "decide");
      if (current === undefined) return { kind: "conflict", current: null };
      const result = applyProgramRepositoryDecisionV2(current, normalized);
      if (result.kind === "committed") {
        commitAggregateV1(current, result.aggregate, "decide");
      }
      if (result.kind === "conflict") {
        return {
          kind: "conflict",
          current: result.current === null
            ? null
            : cloneProgramRepositoryAggregateV2(result.current),
        };
      }
      return { ...result, aggregate: cloneProgramRepositoryAggregateV2(result.aggregate) };
    },

    async settleAgentRun(rawInput) {
      assertAvailableV1("settle_agent_run");
      const normalized = normalizeProgramRepositorySettleAgentRunInputV2(rawInput);
      const current = backing.programs.get(normalized.programId);
      loadStoredContinuationV1(normalized.programId, current, "settle_agent_run");
      if (current === undefined) return { kind: "conflict", current: null };
      const result = applyProgramRepositoryAgentRunTerminalV2(current, normalized);
      if (result.kind === "committed") {
        commitAggregateV1(current, result.aggregate, "settle_agent_run");
      }
      if (result.kind === "conflict") {
        return {
          kind: "conflict",
          current: result.current === null
            ? null
            : cloneProgramRepositoryAggregateV2(result.current),
        };
      }
      return { ...result, aggregate: cloneProgramRepositoryAggregateV2(result.aggregate) };
    },

    async insertWorkspaceContinuation(rawContinuation) {
      assertAvailableV1("insert_workspace_continuation");
      const continuation = normalizeProgramRepositoryWorkspaceContinuationInsertV1(
        rawContinuation,
      );
      const aggregate = backing.programs.get(continuation.programId);
      const current = loadStoredContinuationV1(
        continuation.programId,
        aggregate,
        "insert_workspace_continuation",
      );
      if (
        aggregate === undefined ||
        !browserProgramContinuationMatchesAggregateV1(continuation, aggregate)
      ) {
        return {
          kind: "conflict",
          current: current === null ? null : cloneBrowserProgramContinuationManifestV1(current),
        };
      }
      if (
        current !== null &&
        browserProgramContinuationManifestsEqualV1(current, continuation)
      ) {
        return {
          kind: "unchanged",
          continuation: cloneBrowserProgramContinuationManifestV1(current),
        };
      }
      if (current !== null) {
        return {
          kind: "conflict",
          current: cloneBrowserProgramContinuationManifestV1(current),
        };
      }
      const inserted = cloneBrowserProgramContinuationManifestV1(continuation);
      backing.workspaceContinuations.set(inserted.programId, inserted);
      return {
        kind: "committed",
        continuation: cloneBrowserProgramContinuationManifestV1(inserted),
      };
    },

    async dispose(): Promise<void> {
      disposed = true;
    },
  };
}
