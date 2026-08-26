// SPDX-License-Identifier: MIT

import {
  applyProgramRepositoryAgentRunTerminalV2,
  applyProgramRepositoryDecisionV2,
  applyProgramRepositoryRevisionV2,
  buildProgramRepositoryCreateV2,
  cloneProgramRepositoryAggregateV2,
  createProgramRepositoryFailureV2,
  normalizeProgramRepositoryApplyRevisionInputV2,
  normalizeProgramRepositoryCreateInputV2,
  normalizeProgramRepositoryDecideInputV2,
  normalizeProgramRepositorySettleAgentRunInputV2,
  normalizeProgramRepositoryProgramIdV2,
  programRepositoryMaximumProgramsV2,
  programRepositoryAggregatesEqualV2,
  sortProgramRepositorySummariesV2,
  summarizeProgramRepositoryAggregateV2,
  type ProgramRepositoryAggregateV2,
  type ProgramRepositoryV2,
} from "./program-repository.ts";

export interface MemoryProgramRepositoryBackingV2 {
  readonly programs: Map<string, ProgramRepositoryAggregateV2>;
}

export function createMemoryProgramRepositoryBackingV2(): MemoryProgramRepositoryBackingV2 {
  return { programs: new Map() };
}

/** Deterministic P2 conformance adapter. It shares only an explicit backing. */
export function createMemoryProgramRepositoryV2(input: {
  readonly backing?: MemoryProgramRepositoryBackingV2;
} = {}): ProgramRepositoryV2 {
  const backing = input.backing ?? createMemoryProgramRepositoryBackingV2();
  let disposed = false;

  const assertAvailableV1 = (
    operation: Parameters<typeof createProgramRepositoryFailureV2>[1],
  ): void => {
    if (disposed) throw createProgramRepositoryFailureV2("disposed", operation);
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

    async create(rawInput) {
      assertAvailableV1("create");
      const normalized = normalizeProgramRepositoryCreateInputV2(rawInput);
      const candidate = buildProgramRepositoryCreateV2(normalized);
      const existing = backing.programs.get(candidate.programId);
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
      if (current === undefined) return { kind: "conflict", current: null };
      const result = applyProgramRepositoryRevisionV2(current, normalized);
      if (result.kind === "committed") {
        backing.programs.set(
          normalized.programId,
          cloneProgramRepositoryAggregateV2(result.aggregate),
        );
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
      if (current === undefined) return { kind: "conflict", current: null };
      const result = applyProgramRepositoryDecisionV2(current, normalized);
      if (result.kind === "committed") {
        backing.programs.set(
          normalized.programId,
          cloneProgramRepositoryAggregateV2(result.aggregate),
        );
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
      if (current === undefined) return { kind: "conflict", current: null };
      const result = applyProgramRepositoryAgentRunTerminalV2(current, normalized);
      if (result.kind === "committed") {
        backing.programs.set(
          normalized.programId,
          cloneProgramRepositoryAggregateV2(result.aggregate),
        );
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

    async dispose(): Promise<void> {
      disposed = true;
    },
  };
}
