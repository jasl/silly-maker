// SPDX-License-Identifier: MIT
import type { DiagnosticEnvelopeV1 } from "./diagnostic-envelope.ts";
import { createDiagnosticV1 } from "./diagnostic-envelope.ts";
import { dataFailure, readArray, readExactRecord } from "./presentation-data.ts";

/**
 * The generic, JSON-safe narrative graph: the shape Stories project their
 * typed TS narrative IR into for linting and bounded prediction. There is
 * no parser and no DSL — Stories keep authoring plain TypeScript data, and
 * a builder (below) or a hand-written literal produce the exact same
 * runtime contract. Nodes carry optional source metadata so diagnostics
 * point back to a definition, JSON pointer, or provable builder position.
 */

const graphIdPatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;

function parseGraphIdV1(value: unknown, path: string, reason: string): string {
  if (
    typeof value !== "string" ||
    !graphIdPatternV1.test(value) ||
    value.length < 3 ||
    value.length > 96
  ) {
    return dataFailure(path, reason);
  }
  return value;
}

export type NarrativeGraphNodeKindV1 = "interaction" | "pure" | "call" | "end";

export interface NarrativeGraphDependenciesV1 {
  readonly textIds: readonly string[];
  readonly assetIds: readonly string[];
  readonly stageContentIds: readonly string[];
}

export const emptyNarrativeDependenciesV1: NarrativeGraphDependenciesV1 = Object.freeze({
  textIds: Object.freeze([]),
  assetIds: Object.freeze([]),
  stageContentIds: Object.freeze([]),
});

export interface NarrativeGraphNodeV1 {
  readonly nodeId: string;
  readonly kind: NarrativeGraphNodeKindV1;
  /** Direct successors: next pointers and every choice branch. */
  readonly successors: readonly string[];
  /** Call nodes jump here first, then continue through successors. */
  readonly callTarget: string | null;
  /** Interaction identity; required exactly for interaction nodes. */
  readonly interaction: {
    readonly definitionId: string;
    readonly seenRevision: number;
  } | null;
  readonly dependencies: NarrativeGraphDependenciesV1;
  /** Diagnostics location: a JSON pointer or provable builder position. */
  readonly source: string | null;
}

export interface NarrativeGraphV1 {
  readonly entryNodeId: string;
  readonly nodes: readonly NarrativeGraphNodeV1[];
}

function parseIdListV1(value: unknown, path: string, reason: string): readonly string[] {
  const items = readArray(value, path);
  return Object.freeze(
    items.map((item, index) => parseGraphIdV1(item, `${path}/${String(index)}`, reason)),
  );
}

export function parseNarrativeGraphNodeV1(value: unknown, path = "/node"): NarrativeGraphNodeV1 {
  const record = readExactRecord(
    value,
    ["nodeId", "kind", "successors", "callTarget", "interaction", "dependencies", "source"],
    path,
  );
  if (
    record.kind !== "interaction" &&
    record.kind !== "pure" &&
    record.kind !== "call" &&
    record.kind !== "end"
  ) {
    return dataFailure(`${path}/kind`, "narrative_node_kind_invalid");
  }
  const interaction = record.interaction === null ? null : (() => {
    const interactionRecord = readExactRecord(
      record.interaction,
      ["definitionId", "seenRevision"],
      `${path}/interaction`,
    );
    if (
      typeof interactionRecord.seenRevision !== "number" ||
      !Number.isSafeInteger(interactionRecord.seenRevision) ||
      interactionRecord.seenRevision < 1
    ) {
      return dataFailure(`${path}/interaction/seenRevision`, "seen_revision_invalid");
    }
    return Object.freeze({
      definitionId: parseGraphIdV1(
        interactionRecord.definitionId,
        `${path}/interaction/definitionId`,
        "definition_id_invalid",
      ),
      seenRevision: interactionRecord.seenRevision,
    });
  })();
  if ((record.kind === "interaction") !== (interaction !== null)) {
    return dataFailure(`${path}/interaction`, "narrative_interaction_identity_invalid");
  }
  if ((record.kind === "call") !== (record.callTarget !== null)) {
    return dataFailure(`${path}/callTarget`, "narrative_call_target_invalid");
  }
  const dependenciesRecord = readExactRecord(
    record.dependencies,
    ["textIds", "assetIds", "stageContentIds"],
    `${path}/dependencies`,
  );
  if (record.source !== null && (typeof record.source !== "string" || record.source.length > 256)) {
    return dataFailure(`${path}/source`, "narrative_source_invalid");
  }
  return Object.freeze({
    nodeId: parseGraphIdV1(record.nodeId, `${path}/nodeId`, "node_id_invalid"),
    kind: record.kind,
    successors: parseIdListV1(record.successors, `${path}/successors`, "node_id_invalid"),
    callTarget: record.callTarget === null
      ? null
      : parseGraphIdV1(record.callTarget, `${path}/callTarget`, "node_id_invalid"),
    interaction,
    dependencies: Object.freeze({
      textIds: parseIdListV1(
        dependenciesRecord.textIds,
        `${path}/dependencies/textIds`,
        "text_id_invalid",
      ),
      assetIds: parseIdListV1(
        dependenciesRecord.assetIds,
        `${path}/dependencies/assetIds`,
        "asset_id_invalid",
      ),
      stageContentIds: parseIdListV1(
        dependenciesRecord.stageContentIds,
        `${path}/dependencies/stageContentIds`,
        "content_id_invalid",
      ),
    }),
    source: record.source,
  });
}

export function parseNarrativeGraphV1(value: unknown, path = ""): NarrativeGraphV1 {
  const record = readExactRecord(value, ["entryNodeId", "nodes"], path === "" ? "/" : path);
  const nodesValue = readArray(record.nodes, `${path}/nodes`);
  if (nodesValue.length === 0 || nodesValue.length > 10_000) {
    return dataFailure(`${path}/nodes`, "narrative_nodes_invalid");
  }
  return Object.freeze({
    entryNodeId: parseGraphIdV1(record.entryNodeId, `${path}/entryNodeId`, "node_id_invalid"),
    nodes: Object.freeze(
      nodesValue.map((node, index) =>
        parseNarrativeGraphNodeV1(node, `${path}/nodes/${String(index)}`)
      ),
    ),
  });
}

export type NarrativeLintCodeV1 =
  | "narrative.node_duplicate"
  | "narrative.entry_missing"
  | "narrative.successor_missing"
  | "narrative.call_target_missing"
  | "narrative.node_unreachable"
  | "narrative.pure_loop"
  | "narrative.interaction_duplicate";

function lintDiagnosticV1(
  code: NarrativeLintCodeV1,
  message: string,
  source: string,
): DiagnosticEnvelopeV1 {
  return createDiagnosticV1({
    code,
    phase: "lint",
    message,
    // JSON pointers go to jsonPointer; builder positions and source refs
    // ("builder#3", "story.ts#intro") go to the file location.
    location: source.startsWith("/") ? { jsonPointer: source } : { file: source },
    details: {},
  });
}

/**
 * Lints one narrative graph: duplicate node IDs, a missing entry, dangling
 * successors, missing call targets, unreachable nodes, pure loops (cycles
 * with no interaction boundary, which would run a runner away), and
 * duplicate interaction definition IDs. Every finding carries a stable code
 * and the node's source (or its JSON pointer) so authors can jump back.
 */
export function lintNarrativeGraphV1(graph: NarrativeGraphV1): readonly DiagnosticEnvelopeV1[] {
  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const nodesById = new Map<string, NarrativeGraphNodeV1>();
  const pointerOf = (node: NarrativeGraphNodeV1, index: number): string =>
    node.source ?? `/nodes/${String(index)}`;
  const indexById = new Map<string, number>();

  for (const [index, node] of graph.nodes.entries()) {
    if (nodesById.has(node.nodeId)) {
      diagnostics.push(
        lintDiagnosticV1(
          "narrative.node_duplicate",
          `node "${node.nodeId}" is declared more than once`,
          pointerOf(node, index),
        ),
      );
      continue;
    }
    nodesById.set(node.nodeId, node);
    indexById.set(node.nodeId, index);
  }

  if (!nodesById.has(graph.entryNodeId)) {
    diagnostics.push(
      lintDiagnosticV1(
        "narrative.entry_missing",
        `entry node "${graph.entryNodeId}" does not exist`,
        "/entryNodeId",
      ),
    );
  }

  const seenDefinitions = new Map<string, string>();
  for (const [index, node] of graph.nodes.entries()) {
    for (const successor of node.successors) {
      if (!nodesById.has(successor)) {
        diagnostics.push(
          lintDiagnosticV1(
            "narrative.successor_missing",
            `node "${node.nodeId}" points at missing successor "${successor}"`,
            pointerOf(node, index),
          ),
        );
      }
    }
    if (node.callTarget !== null && !nodesById.has(node.callTarget)) {
      diagnostics.push(
        lintDiagnosticV1(
          "narrative.call_target_missing",
          `call node "${node.nodeId}" targets missing node "${node.callTarget}"`,
          pointerOf(node, index),
        ),
      );
    }
    if (node.interaction !== null) {
      const existing = seenDefinitions.get(node.interaction.definitionId);
      if (existing !== undefined) {
        diagnostics.push(
          lintDiagnosticV1(
            "narrative.interaction_duplicate",
            `interaction definition "${node.interaction.definitionId}" appears on "${existing}" and "${node.nodeId}"`,
            pointerOf(node, index),
          ),
        );
      } else {
        seenDefinitions.set(node.interaction.definitionId, node.nodeId);
      }
    }
  }

  // Reachability from the entry across successors and call targets.
  const reachable = new Set<string>();
  const pending = nodesById.has(graph.entryNodeId) ? [graph.entryNodeId] : [];
  while (pending.length > 0) {
    const nodeId = pending.pop();
    if (nodeId === undefined || reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    const node = nodesById.get(nodeId);
    if (node === undefined) continue;
    for (const successor of node.successors) pending.push(successor);
    if (node.callTarget !== null) pending.push(node.callTarget);
  }
  for (const [index, node] of graph.nodes.entries()) {
    if (nodesById.get(node.nodeId) !== node) continue; // duplicate already reported
    if (!reachable.has(node.nodeId) && nodesById.has(graph.entryNodeId)) {
      diagnostics.push(
        lintDiagnosticV1(
          "narrative.node_unreachable",
          `node "${node.nodeId}" is unreachable from the entry`,
          pointerOf(node, index),
        ),
      );
    }
  }

  // Pure loops: a cycle that never crosses an interaction or end boundary
  // would spin a runner forever. Interaction nodes break the cycle because
  // they always stop and wait for a resolution.
  const visiting = new Set<string>();
  const settled = new Set<string>();
  const inCycle = new Set<string>();
  const walk = (nodeId: string): void => {
    if (settled.has(nodeId) || visiting.has(nodeId)) return;
    const stack: { nodeId: string; nextSuccessor: number }[] = [{ nodeId, nextSuccessor: 0 }];
    visiting.add(nodeId);
    while (stack.length > 0) {
      const frame = stack.at(-1);
      if (frame === undefined) break;
      const node = nodesById.get(frame.nodeId);
      if (node === undefined || node.kind === "interaction" || node.kind === "end") {
        visiting.delete(frame.nodeId);
        settled.add(frame.nodeId);
        stack.pop();
        continue;
      }
      const edges = node.callTarget === null
        ? node.successors
        : [node.callTarget, ...node.successors];
      if (frame.nextSuccessor >= edges.length) {
        visiting.delete(frame.nodeId);
        settled.add(frame.nodeId);
        stack.pop();
        continue;
      }
      const nextId = edges[frame.nextSuccessor];
      frame.nextSuccessor += 1;
      if (nextId === undefined || !nodesById.has(nextId)) continue;
      if (visiting.has(nextId)) {
        inCycle.add(nextId);
        continue;
      }
      if (!settled.has(nextId)) {
        visiting.add(nextId);
        stack.push({ nodeId: nextId, nextSuccessor: 0 });
      }
    }
  };
  for (const node of graph.nodes) walk(node.nodeId);
  for (const nodeId of inCycle) {
    const index = indexById.get(nodeId);
    const node = nodesById.get(nodeId);
    if (node === undefined || index === undefined) continue;
    diagnostics.push(
      lintDiagnosticV1(
        "narrative.pure_loop",
        `node "${nodeId}" sits on a pure cycle with no interaction boundary`,
        pointerOf(node, index),
      ),
    );
  }

  return Object.freeze(diagnostics);
}
