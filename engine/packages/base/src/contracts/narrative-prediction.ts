// SPDX-License-Identifier: MIT
import type { AssetDemandPlanV1 } from "./asset-demand.ts";
import { createAssetDemandPlanV1 } from "./asset-demand.ts";
import type {
  NarrativeGraphDependenciesV1,
  NarrativeGraphNodeKindV1,
  NarrativeGraphNodeV1,
  NarrativeGraphV1,
} from "./narrative-graph.ts";
import { emptyNarrativeDependenciesV1, parseNarrativeGraphV1 } from "./narrative-graph.ts";

/**
 * The typed narrative graph builder. It produces exactly the same runtime
 * contract as a hand-written graph literal — no parser, no DSL — while
 * stamping each node with a provable builder position (or a caller-provided
 * source) so lint diagnostics can point back at the definition.
 */

export interface NarrativeGraphBuilderNodeInputV1 {
  readonly nodeId: string;
  readonly successors?: readonly string[];
  readonly dependencies?: Partial<NarrativeGraphDependenciesV1>;
  readonly source?: string;
}

export interface NarrativeGraphBuilderV1 {
  interaction(
    input: NarrativeGraphBuilderNodeInputV1 & {
      readonly definitionId: string;
      readonly seenRevision?: number;
    },
  ): NarrativeGraphBuilderV1;
  pure(input: NarrativeGraphBuilderNodeInputV1): NarrativeGraphBuilderV1;
  call(
    input: NarrativeGraphBuilderNodeInputV1 & { readonly callTarget: string },
  ): NarrativeGraphBuilderV1;
  end(input: { readonly nodeId: string; readonly source?: string }): NarrativeGraphBuilderV1;
  build(): NarrativeGraphV1;
}

export function createNarrativeGraphBuilderV1(input: {
  readonly entryNodeId: string;
}): NarrativeGraphBuilderV1 {
  const nodes: unknown[] = [];

  const push = (
    kind: NarrativeGraphNodeKindV1,
    node: NarrativeGraphBuilderNodeInputV1 & {
      readonly callTarget?: string;
      readonly definitionId?: string;
      readonly seenRevision?: number;
    },
  ): void => {
    nodes.push({
      nodeId: node.nodeId,
      kind,
      successors: node.successors ?? [],
      callTarget: node.callTarget ?? null,
      interaction: kind === "interaction"
        ? { definitionId: node.definitionId, seenRevision: node.seenRevision ?? 1 }
        : null,
      dependencies: {
        ...emptyNarrativeDependenciesV1,
        ...node.dependencies,
      },
      source: node.source ?? `builder#${String(nodes.length)}`,
    });
  };

  const builder: NarrativeGraphBuilderV1 = {
    interaction(node) {
      push("interaction", node);
      return builder;
    },
    pure(node) {
      push("pure", node);
      return builder;
    },
    call(node) {
      push("call", node);
      return builder;
    },
    end(node) {
      push("end", { ...node, successors: [] });
      return builder;
    },
    build() {
      return parseNarrativeGraphV1({ entryNodeId: input.entryNodeId, nodes });
    },
  };
  return builder;
}

/**
 * Bounded, side-effect-free branch prediction. Starting from the current
 * cursor it walks every successor and call target — it never executes a
 * command, never consumes RNG, and never decides which hidden branch a
 * player will take — collecting the declared text/asset/stage dependencies
 * until the budget ends. The same graph, cursor, and budget always produce
 * the same prediction.
 */

export interface NarrativePredictionBudgetV1 {
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxAssets: number;
}

export const defaultNarrativePredictionBudgetV1: NarrativePredictionBudgetV1 = {
  maxNodes: 64,
  maxDepth: 16,
  maxAssets: 32,
};

export interface NarrativePredictionV1 {
  readonly visitedNodeIds: readonly string[];
  readonly textIds: readonly string[];
  readonly assetIds: readonly string[];
  readonly stageContentIds: readonly string[];
  /** True when a budget limit cut the traversal short. */
  readonly truncated: boolean;
}

export function predictNarrativeDependenciesV1(
  graph: NarrativeGraphV1,
  fromNodeId: string,
  budget: NarrativePredictionBudgetV1 = defaultNarrativePredictionBudgetV1,
): NarrativePredictionV1 {
  const nodesById = new Map<string, NarrativeGraphNodeV1>(
    graph.nodes.map((node) => [node.nodeId, node]),
  );
  const visited = new Set<string>();
  const textIds = new Set<string>();
  const assetIds = new Set<string>();
  const stageContentIds = new Set<string>();
  let truncated = false;

  const queue: { nodeId: string; depth: number }[] = [{ nodeId: fromNodeId, depth: 0 }];
  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined) break;
    if (visited.has(next.nodeId)) continue;
    if (visited.size >= budget.maxNodes) {
      truncated = true;
      break;
    }
    if (next.depth > budget.maxDepth) {
      truncated = true;
      continue;
    }
    const node = nodesById.get(next.nodeId);
    if (node === undefined) continue;
    visited.add(node.nodeId);

    for (const textId of node.dependencies.textIds) textIds.add(textId);
    for (const contentId of node.dependencies.stageContentIds) stageContentIds.add(contentId);
    for (const assetId of node.dependencies.assetIds) {
      if (assetIds.size >= budget.maxAssets) {
        truncated = true;
        break;
      }
      assetIds.add(assetId);
    }

    const edges = node.callTarget === null
      ? node.successors
      : [node.callTarget, ...node.successors];
    for (const successor of edges) {
      if (!visited.has(successor)) queue.push({ nodeId: successor, depth: next.depth + 1 });
    }
  }

  return {
    visitedNodeIds: [...visited],
    textIds: [...textIds],
    assetIds: [...assetIds],
    stageContentIds: [...stageContentIds],
    truncated,
  };
}

/**
 * Turns a prediction into an opportunistic asset demand plan: prefetch
 * never blocks, never bypasses the settled-exact demand of the current
 * target, and a revoked plan cancels whatever it still holds.
 */
export function narrativePredictionToDemandPlanV1(
  prediction: NarrativePredictionV1,
  input: { readonly planId: string; readonly group?: string },
): AssetDemandPlanV1 {
  return createAssetDemandPlanV1({
    planId: input.planId,
    entries: prediction.assetIds.map((assetId) => ({
      assetId,
      priority: "opportunistic" as const,
      group: input.group ?? "narrative-prefetch",
    })),
  });
}
