// SPDX-License-Identifier: MIT
// Tooling-only projection of the Story-owned interaction document. The Player
// imports neither this module nor Flow/source metadata.

import type {
  NarrativeFlowGraphEdgeV1,
  NarrativeFlowGraphNodeV1,
  NarrativeFlowGraphV1,
} from "@sillymaker/studio";

import type {
  VnLastSoundCheckCompiledInteractionV1,
  VnLastSoundCheckInteractionDocV1,
  VnLastSoundCheckNarrativeNodeV1,
  VnLastSoundCheckStageOpV1,
} from "../story/narrative-kit.ts";
import { vnLastSoundCheckCompiledStoryV1, vnLastSoundCheckStoryDocV1 } from "../story/narrative.ts";
import { vnLastSoundCheckAuthoringTextForLocaleV1 } from "./text-content.ts";

type VnLastSoundCheckNarrativeNodeOfKindV1<TKind extends VnLastSoundCheckNarrativeNodeV1["kind"]> =
  Extract<
    VnLastSoundCheckNarrativeNodeV1,
    { readonly kind: TKind }
  >;

function compiledNodeV1<TKind extends VnLastSoundCheckNarrativeNodeV1["kind"]>(
  nodesById: ReadonlyMap<string, VnLastSoundCheckNarrativeNodeV1>,
  nodeId: string,
): VnLastSoundCheckNarrativeNodeOfKindV1<TKind> {
  // The runtime compiler already admitted this document; the projector only
  // joins its trusted output back to the same source blocks.
  return nodesById.get(nodeId) as VnLastSoundCheckNarrativeNodeOfKindV1<TKind>;
}

function stageSummaryV1(
  node: VnLastSoundCheckNarrativeNodeOfKindV1<"stage">,
  ops: readonly VnLastSoundCheckStageOpV1[],
): string {
  let dispatchIndex = 0;
  return ops.map((op) => {
    if ("setAppearance" in op) return `appearance:${op.setAppearance.tag}`;
    const dispatch = node.dispatches[dispatchIndex]!;
    dispatchIndex += 1;
    return "open" in op ? `open:${dispatch.sceneId}` : `cue:${dispatch.sceneId}/${op.cue}`;
  }).join(" + ");
}

/**
 * Projects admitted runtime nodes plus their Story-owned source document into
 * the retained read-only Flow shape. This is not a second compiler: runtime
 * targets and ids come from `compiled`, while copy/source annotations come
 * from `doc`.
 */
export function projectVnLastSoundCheckNarrativeFlowV1(
  compiled: VnLastSoundCheckCompiledInteractionV1,
  doc: VnLastSoundCheckInteractionDocV1,
  resolveText: (textId: string) => string | null = () => null,
): NarrativeFlowGraphV1 {
  const nodesById = new Map(compiled.nodes.map((node) => [node.nodeId, node]));
  const graphNodes: NarrativeFlowGraphNodeV1[] = [];
  const graphEdges: NarrativeFlowGraphEdgeV1[] = [];
  const nodeId = (name: string): string => `node.${doc.prefix}.${name}`;
  const nextEdge = (from: string, to: string): void => {
    graphEdges.push({
      from,
      to,
      label: { kind: "next" as const },
    });
  };

  for (const block of doc.blocks) {
    const id = nodeId(block.name);
    const source = `interaction-doc:${doc.docId}#${block.name}`;
    switch (block.kind) {
      case "say": {
        const node = compiledNodeV1<"say">(nodesById, id);
        graphNodes.push({
          nodeId: id,
          kind: "say",
          docId: doc.docId,
          blockName: block.name,
          summary: block.text ?? resolveText(node.textId) ?? node.textId,
          source,
        });
        nextEdge(id, node.next);
        break;
      }
      case "choice": {
        const node = compiledNodeV1<"choice">(nodesById, id);
        graphNodes.push({
          nodeId: id,
          kind: "menu",
          docId: doc.docId,
          blockName: block.name,
          summary: [
            block.prompt ?? resolveText(node.promptTextId) ?? node.promptTextId,
            ...block.options.map((option, index) =>
              option.text ?? resolveText(node.options[index]!.textId) ?? option.name
            ),
          ].join(" / "),
          source,
        });
        for (const [index, option] of block.options.entries()) {
          const compiledOption = node.options[index]!;
          const text = option.text ?? resolveText(compiledOption.textId);
          graphEdges.push({
            from: id,
            to: compiledOption.next,
            label: {
              kind: "choice" as const,
              choiceId: compiledOption.choiceId,
              textId: compiledOption.textId,
              ...(text === null || text === undefined ? {} : { text }),
              gates: [],
            },
          });
        }
        break;
      }
      case "stage": {
        const node = compiledNodeV1<"stage">(nodesById, id);
        graphNodes.push({
          nodeId: id,
          kind: "stage",
          docId: doc.docId,
          blockName: block.name,
          summary: stageSummaryV1(node, block.ops),
          source,
        });
        nextEdge(id, node.next);
        break;
      }
      case "branch": {
        const node = compiledNodeV1<"branch">(nodesById, id);
        graphNodes.push({
          nodeId: id,
          kind: "branch",
          docId: doc.docId,
          blockName: block.name,
          summary: block.cases
            .map((branchCase) =>
              branchCase.when === undefined ? "else" : `signal ${branchCase.when.signalChoice}`
            )
            .join(" | "),
          source,
        });
        for (const [index, branchCase] of block.cases.entries()) {
          const to = node.successors[index]!;
          graphEdges.push({
            from: id,
            to,
            label: {
              kind: "branch" as const,
              condition: branchCase.when === undefined
                ? "else"
                : `signal ${branchCase.when.signalChoice}`,
            },
          });
        }
        break;
      }
      case "hold": {
        if (block.ops !== undefined && block.ops.length > 0) {
          const stageId = nodeId(`${block.name}-stage`);
          const stage = compiledNodeV1<"stage">(nodesById, stageId);
          graphNodes.push({
            nodeId: stageId,
            kind: "stage",
            docId: doc.docId,
            blockName: `${block.name}-stage`,
            summary: stageSummaryV1(stage, block.ops),
            source,
          });
          graphEdges.push({ from: stageId, to: id, label: { kind: "next" as const } });
        }
        const node = compiledNodeV1<"hold">(nodesById, id);
        graphNodes.push({
          nodeId: id,
          kind: "hold",
          docId: doc.docId,
          blockName: block.name,
          summary: `hold ${String(block.durationMs)}ms${
            (block.skippable ?? false) ? " skippable" : ""
          }`,
          source,
        });
        nextEdge(id, node.next);
        break;
      }
      case "end": {
        graphNodes.push({
          nodeId: id,
          kind: "end",
          docId: doc.docId,
          blockName: block.name,
          summary: "end",
          source,
        });
        break;
      }
      default: {
        const exhaustive: never = block;
        throw new TypeError(
          `vn-last-sound-check.narrative_flow_block_unknown:${String(exhaustive)}`,
        );
      }
    }
  }

  return { nodes: graphNodes, edges: graphEdges };
}

export const vnLastSoundCheckFlowGraphV1 = projectVnLastSoundCheckNarrativeFlowV1(
  vnLastSoundCheckCompiledStoryV1,
  vnLastSoundCheckStoryDocV1,
  (textId) => vnLastSoundCheckAuthoringTextForLocaleV1(null, textId),
);
