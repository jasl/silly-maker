// SPDX-License-Identifier: MIT

import {
  applyProgramRepositoryDecisionV1,
  applyProgramRepositoryRevisionV1,
  buildProgramRepositoryCreateV1,
  cloneProgramRepositoryAggregateV1,
  createProgramRepositoryFailureV1,
  normalizeProgramRepositoryApplyRevisionInputV1,
  normalizeProgramRepositoryCreateInputV1,
  normalizeProgramRepositoryDecideInputV1,
  normalizeProgramRepositoryProgramIdV1,
  programRepositoryMaximumProgramsV1,
  programRepositoryAggregatesEqualV1,
  sortProgramRepositorySummariesV1,
  summarizeProgramRepositoryAggregateV1,
  type ProgramRepositoryAggregateV1,
  type ProgramRepositoryV1,
} from "./program-repository.ts";

export interface MemoryProgramRepositoryBackingV1 {
  readonly programs: Map<string, ProgramRepositoryAggregateV1>;
}

export function createMemoryProgramRepositoryBackingV1(): MemoryProgramRepositoryBackingV1 {
  return { programs: new Map() };
}

/** Deterministic P2-B0 conformance adapter. It shares only an explicit backing. */
export function createMemoryProgramRepositoryV1(input: {
  readonly backing?: MemoryProgramRepositoryBackingV1;
} = {}): ProgramRepositoryV1 {
  const backing = input.backing ?? createMemoryProgramRepositoryBackingV1();
  let disposed = false;

  const assertAvailableV1 = (
    operation: Parameters<typeof createProgramRepositoryFailureV1>[1],
  ): void => {
    if (disposed) throw createProgramRepositoryFailureV1("disposed", operation);
  };

  return {
    async initialize(): Promise<void> {
      assertAvailableV1("initialize");
    },

    async list() {
      assertAvailableV1("list");
      return sortProgramRepositorySummariesV1(
        [...backing.programs.values()].map((aggregate) =>
          summarizeProgramRepositoryAggregateV1(aggregate)
        ),
      );
    },

    async load(rawProgramId) {
      assertAvailableV1("load");
      const programId = normalizeProgramRepositoryProgramIdV1(rawProgramId);
      const aggregate = backing.programs.get(programId);
      return aggregate === undefined ? null : cloneProgramRepositoryAggregateV1(aggregate);
    },

    async create(rawInput) {
      assertAvailableV1("create");
      const normalized = normalizeProgramRepositoryCreateInputV1(rawInput);
      const candidate = buildProgramRepositoryCreateV1(normalized);
      const existing = backing.programs.get(candidate.programId);
      if (existing !== undefined) {
        if (programRepositoryAggregatesEqualV1(existing, candidate)) {
          return { kind: "unchanged", aggregate: cloneProgramRepositoryAggregateV1(existing) };
        }
        return { kind: "conflict", current: cloneProgramRepositoryAggregateV1(existing) };
      }
      if (backing.programs.size >= programRepositoryMaximumProgramsV1) {
        throw createProgramRepositoryFailureV1("quota_exceeded", "create");
      }
      backing.programs.set(candidate.programId, cloneProgramRepositoryAggregateV1(candidate));
      return { kind: "committed", aggregate: cloneProgramRepositoryAggregateV1(candidate) };
    },

    async applyRevision(rawInput) {
      assertAvailableV1("apply_revision");
      const normalized = normalizeProgramRepositoryApplyRevisionInputV1(rawInput);
      const current = backing.programs.get(normalized.programId);
      if (current === undefined) return { kind: "conflict", current: null };
      const result = applyProgramRepositoryRevisionV1(current, normalized);
      if (result.kind === "committed") {
        backing.programs.set(
          normalized.programId,
          cloneProgramRepositoryAggregateV1(result.aggregate),
        );
      }
      if (result.kind === "conflict") {
        return {
          kind: "conflict",
          current: result.current === null
            ? null
            : cloneProgramRepositoryAggregateV1(result.current),
        };
      }
      return { ...result, aggregate: cloneProgramRepositoryAggregateV1(result.aggregate) };
    },

    async decide(rawInput) {
      assertAvailableV1("decide");
      const normalized = normalizeProgramRepositoryDecideInputV1(rawInput);
      const current = backing.programs.get(normalized.programId);
      if (current === undefined) return { kind: "conflict", current: null };
      const result = applyProgramRepositoryDecisionV1(current, normalized);
      if (result.kind === "committed") {
        backing.programs.set(
          normalized.programId,
          cloneProgramRepositoryAggregateV1(result.aggregate),
        );
      }
      if (result.kind === "conflict") {
        return {
          kind: "conflict",
          current: result.current === null
            ? null
            : cloneProgramRepositoryAggregateV1(result.current),
        };
      }
      return { ...result, aggregate: cloneProgramRepositoryAggregateV1(result.aggregate) };
    },

    async dispose(): Promise<void> {
      disposed = true;
    },
  };
}
