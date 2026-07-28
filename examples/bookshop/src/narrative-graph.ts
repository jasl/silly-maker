// SPDX-License-Identifier: MIT
import type { NarrativeGraph } from "@sillymaker/base/story";
import { parseNarrativeGraph } from "@sillymaker/base/story";

import type { BookshopNarrativeNodeV1 } from "./narrative.ts";
import { bookshopScriptV1 } from "./narrative.ts";

/**
 * Projects the typed script into the generic narrative graph so
 * `lintNarrativeGraph` can prove it structurally sound (no missing
 * successors, no unreachable nodes, no pure loops) and prediction can
 * collect its dependencies. The test suite lints this projection.
 */
function graphNodeForV1(node: BookshopNarrativeNodeV1): unknown {
  const source = `narrative.ts#${node.nodeId}`;
  const base = { nodeId: node.nodeId, callTarget: null, source };
  switch (node.kind) {
    case "say":
      return {
        ...base,
        kind: "interaction",
        successors: [node.next],
        interaction: { definitionId: node.definitionId, seenRevision: node.seenRevision },
        dependencies: {
          textIds: node.speakerTextId === null ? [node.textId] : [node.speakerTextId, node.textId],
          assetIds: [],
          stageContentIds: [],
        },
      };
    case "branch":
      return {
        ...base,
        kind: "pure",
        successors: node.successors,
        interaction: null,
        dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
      };
    case "stage":
      return {
        ...base,
        kind: "pure",
        successors: [node.next],
        interaction: null,
        dependencies: { textIds: [], assetIds: [], stageContentIds: node.mayShow },
      };
    case "choice":
      return {
        ...base,
        kind: "interaction",
        successors: node.options.map((option) => option.next),
        interaction: { definitionId: node.definitionId, seenRevision: node.seenRevision },
        dependencies: {
          textIds: [node.promptTextId, ...node.options.map((option) => option.textId)],
          assetIds: [],
          stageContentIds: [],
        },
      };
    case "end":
      return {
        ...base,
        kind: "end",
        successors: [],
        interaction: null,
        dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
      };
    default: {
      const exhaustive: never = node;
      throw new TypeError(`unknown bookshop narrative node ${String(exhaustive)}`);
    }
  }
}

export function projectBookshopNarrativeGraphV1(): NarrativeGraph {
  const entry = bookshopScriptV1[0];
  if (entry === undefined) throw new TypeError("bookshop.narrative_script_empty");
  return parseNarrativeGraph({
    entryNodeId: entry.nodeId,
    nodes: bookshopScriptV1.map((node) => graphNodeForV1(node)),
  });
}
