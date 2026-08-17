// SPDX-License-Identifier: MIT
import type { NarrativeFlowGraphNodeV1, NarrativeFlowGraphV1 } from "../../core/binding.ts";

/**
 * Pure view model for the Flow workspace: document grouping and a small
 * deterministic layered layout (BFS rank from each document's first node,
 * document order as the tiebreaker). The layout is computed by the viewer
 * and never stored — the projection stays layout-free by contract.
 */

export interface FlowDocGroupV1 {
  /** null groups hand-written legacy nodes. */
  readonly docId: string | null;
  readonly label: string;
  readonly nodeCount: number;
}

export interface FlowLayoutNodeV1 {
  readonly node: NarrativeFlowGraphNodeV1;
  readonly col: number;
  readonly row: number;
}

/** A cross-document edge target rendered as a jumpable stub. */
export interface FlowLayoutStubV1 {
  readonly nodeId: string;
  /** The owning document when the merged graph knows the target. */
  readonly docId: string | null;
  readonly known: boolean;
  readonly col: number;
  readonly row: number;
}

export interface FlowLayoutEdgeV1 {
  readonly from: string;
  readonly to: string;
  readonly kind: "next" | "choice" | "roll" | "branch" | "call";
  readonly text: string;
}

export interface FlowDocLayoutV1 {
  readonly nodes: readonly FlowLayoutNodeV1[];
  readonly stubs: readonly FlowLayoutStubV1[];
  readonly edges: readonly FlowLayoutEdgeV1[];
  readonly rows: number;
  readonly cols: number;
}

const flowHandWrittenLabelV1 = "（手写节点）";

export function buildFlowDocGroupsV1(graph: NarrativeFlowGraphV1): readonly FlowDocGroupV1[] {
  const groups = new Map<string | null, number>();
  for (const node of graph.nodes) {
    groups.set(node.docId, (groups.get(node.docId) ?? 0) + 1);
  }
  return Object.freeze(
    [...groups.entries()].map(([docId, nodeCount]) =>
      Object.freeze({
        docId,
        label: docId ?? flowHandWrittenLabelV1,
        nodeCount,
      })
    ),
  );
}

function idTailV1(id: string): string {
  const dot = id.lastIndexOf(".");
  return dot === -1 ? id : id.slice(dot + 1);
}

/** The binding's optional default-locale text lookup (null for unknown ids). */
export type FlowTextResolverV1 = (textId: string) => string | null;

const flowTextIdPatternV1 = /text\.[a-z0-9][a-z0-9_.-]*/gu;

/**
 * Replace every resolvable `text.*` token in a summary with catalog copy.
 * Unknown tokens (and inline copy) stay verbatim, so projections that mix
 * shared textIds with inlined text degrade to today's display.
 */
export function resolveFlowTextV1(
  text: string,
  resolveText: FlowTextResolverV1 | undefined,
): string {
  if (resolveText === undefined) return text;
  return text.replace(flowTextIdPatternV1, (token) => {
    try {
      return resolveText(token) ?? token;
    } catch {
      return token;
    }
  });
}

function resolveFlowTokenV1(
  textId: string,
  resolveText: FlowTextResolverV1 | undefined,
): string | null {
  if (resolveText === undefined) return null;
  try {
    return resolveText(textId);
  } catch {
    return null;
  }
}

function edgeLabelTextV1(
  label: NarrativeFlowGraphV1["edges"][number]["label"],
  resolveText: FlowTextResolverV1 | undefined,
): string {
  switch (label.kind) {
    case "next":
      return "";
    case "choice": {
      const copy = label.text !== undefined && label.text.length > 0
        ? label.text
        : resolveFlowTokenV1(label.textId, resolveText) ?? idTailV1(label.choiceId);
      return label.gates.length === 0 ? copy : `${copy} [${label.gates.join(", ")}]`;
    }
    case "roll":
      return label.outcome;
    case "branch":
      return label.condition;
    case "call":
      return `@${label.label}`;
    default: {
      const exhaustive: never = label;
      throw new TypeError(`studio.flow_edge_label_unknown:${String(exhaustive)}`);
    }
  }
}

export function buildFlowDocLayoutV1(
  graph: NarrativeFlowGraphV1,
  docId: string | null,
  resolveText?: FlowTextResolverV1,
): FlowDocLayoutV1 {
  const docNodes = graph.nodes.filter((node) => node.docId === docId);
  const docNodeIds = new Set(docNodes.map((node) => node.nodeId));
  const nodeDocById = new Map(graph.nodes.map((node) => [node.nodeId, node.docId]));

  // BFS rank from the document's first node over intra-document edges;
  // nodes the walk never reaches land on their own trailing rows in
  // document order (deterministic, no cycles required).
  const rank = new Map<string, number>();
  const entry = docNodes[0];
  if (entry !== undefined) {
    rank.set(entry.nodeId, 0);
    const queue: string[] = [entry.nodeId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      const currentRank = rank.get(current) ?? 0;
      for (const edge of graph.edges) {
        if (edge.from !== current || !docNodeIds.has(edge.to)) continue;
        if (rank.has(edge.to)) continue;
        rank.set(edge.to, currentRank + 1);
        queue.push(edge.to);
      }
    }
  }
  let maxRank = 0;
  for (const value of rank.values()) maxRank = Math.max(maxRank, value);
  for (const node of docNodes) {
    if (rank.has(node.nodeId)) continue;
    maxRank += 1;
    rank.set(node.nodeId, maxRank);
  }

  // Columns: assignment order within each rank, document order overall.
  const nextColByRow = new Map<number, number>();
  const takeCol = (row: number): number => {
    const col = nextColByRow.get(row) ?? 0;
    nextColByRow.set(row, col + 1);
    return col;
  };
  const docOrder = new Map(docNodes.map((node, index) => [node.nodeId, index]));
  const layoutNodes = docNodes
    .map((node) => ({ node, row: rank.get(node.nodeId) ?? 0 }))
    .toSorted((a, b) =>
      a.row - b.row ||
      (docOrder.get(a.node.nodeId) ?? 0) - (docOrder.get(b.node.nodeId) ?? 0)
    )
    .map((placed): FlowLayoutNodeV1 =>
      Object.freeze({ node: placed.node, row: placed.row, col: takeCol(placed.row) })
    );
  const rowByNodeId = new Map(layoutNodes.map((placed) => [placed.node.nodeId, placed.row]));

  // Cross-document targets become one stub each, placed one row below
  // their first referencing node; clicking a stub jumps to its document.
  const stubs: FlowLayoutStubV1[] = [];
  const stubByNodeId = new Map<string, FlowLayoutStubV1>();
  const edges: FlowLayoutEdgeV1[] = [];
  for (const edge of graph.edges) {
    if (!docNodeIds.has(edge.from)) continue;
    if (!docNodeIds.has(edge.to) && !stubByNodeId.has(edge.to)) {
      const row = (rowByNodeId.get(edge.from) ?? 0) + 1;
      const stub = Object.freeze({
        nodeId: edge.to,
        docId: nodeDocById.get(edge.to) ?? null,
        known: nodeDocById.has(edge.to),
        row,
        col: takeCol(row),
      });
      stubByNodeId.set(edge.to, stub);
      stubs.push(stub);
    }
    edges.push(Object.freeze({
      from: edge.from,
      to: edge.to,
      kind: edge.label.kind,
      text: edgeLabelTextV1(edge.label, resolveText),
    }));
  }

  let rows = 0;
  let cols = 0;
  for (const [row, nextCol] of nextColByRow.entries()) {
    rows = Math.max(rows, row + 1);
    cols = Math.max(cols, nextCol);
  }
  return Object.freeze({
    nodes: Object.freeze(layoutNodes),
    stubs: Object.freeze(stubs),
    edges: Object.freeze(edges),
    rows,
    cols,
  });
}
