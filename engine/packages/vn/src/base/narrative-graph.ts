// SPDX-License-Identifier: MIT
import type { NarrativeGraph } from "@sillymaker/base/story";
import { parseNarrativeGraph } from "@sillymaker/base/story";
import type { StrictJsonValueV1 } from "@sillymaker/base/strict-json";

import type { CompiledVnInteractionDocumentV1 } from "./interaction-document.ts";

export interface ProjectVnNarrativeGraphInputV1<
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
> {
  readonly compiled: Pick<
    CompiledVnInteractionDocumentV1<TChoiceEffect, TPredicate>,
    "entryNodeId" | "nodes"
  >;
  readonly sourceForNode?: (
    node: CompiledVnInteractionDocumentV1<TChoiceEffect, TPredicate>["nodes"][number],
  ) => string | null;
  readonly assetIdsForNode?: (
    node: CompiledVnInteractionDocumentV1<TChoiceEffect, TPredicate>["nodes"][number],
  ) => readonly string[];
}

/**
 * Projects the compiled VN control plan into Base's generic lint/prediction
 * graph. Products contribute only their asset and source metadata; VN owns
 * the control-flow mapping, including ordered hold reroutes before expiry.
 */
export function projectVnNarrativeGraphV1<
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
>(input: ProjectVnNarrativeGraphInputV1<TChoiceEffect, TPredicate>): NarrativeGraph {
  const assetIdsForNode = input.assetIdsForNode ?? (() => []);
  const sourceForNode = input.sourceForNode ?? (() => null);

  return parseNarrativeGraph({
    entryNodeId: input.compiled.entryNodeId,
    nodes: input.compiled.nodes.map((node) => {
      const base = {
        nodeId: node.nodeId,
        callTarget: null,
        source: sourceForNode(node),
      };
      switch (node.kind) {
        case "say":
          return {
            ...base,
            kind: "interaction",
            successors: [node.next],
            interaction: {
              definitionId: node.definitionId,
              seenRevision: node.seenRevision,
            },
            dependencies: {
              textIds: node.speakerTextId === null
                ? [node.textId]
                : [node.speakerTextId, node.textId],
              assetIds: assetIdsForNode(node),
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
            dependencies: {
              textIds: [],
              assetIds: assetIdsForNode(node),
              stageContentIds: node.mayShow,
            },
          };
        case "choice":
          return {
            ...base,
            kind: "interaction",
            successors: node.options.map((option) => option.next),
            interaction: {
              definitionId: node.definitionId,
              seenRevision: node.seenRevision,
            },
            dependencies: {
              textIds: [node.promptTextId, ...node.options.map((option) => option.textId)],
              assetIds: assetIdsForNode(node),
              stageContentIds: [],
            },
          };
        case "hold":
          return {
            ...base,
            kind: "interaction",
            successors: [...node.when.map((arm) => arm.next), node.next],
            interaction: {
              definitionId: node.definitionId,
              seenRevision: node.seenRevision,
            },
            dependencies: {
              textIds: [],
              assetIds: assetIdsForNode(node),
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
          throw new TypeError(`vn.narrative_graph_node_unknown:${String(exhaustive)}`);
        }
      }
    }),
  });
}
