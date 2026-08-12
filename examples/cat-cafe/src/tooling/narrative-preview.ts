// SPDX-License-Identifier: MIT
import type { StageRenderTarget } from "@sillymaker/base/story";
import { projectStageRenderTarget, reduceStageMutations } from "@sillymaker/base/story";

import type { CatcafeNarrativeNodeV1 } from "../features/dialogue/script.ts";
import {
  catcafeEntryNodeIdV1,
  catcafeNodeIdsV1,
  catcafeScriptV1,
} from "../features/dialogue/script.ts";
import { catcafeStageContentCatalogV1 } from "../presentation.ts";
import { createInitialCatcafeStageStateV1 } from "../state.ts";

export type CatcafeNarrativePreviewRouteV1 = "named" | "later";

export interface CatcafeNarrativePreviewCaseV1 {
  readonly previewId: string;
  readonly nodeId: string;
  readonly nodeKind: CatcafeNarrativeNodeV1["kind"];
  readonly route: CatcafeNarrativePreviewRouteV1 | null;
  readonly textIds: readonly string[];
  readonly target: StageRenderTarget;
}

const choiceIdByRouteV1 = Object.freeze({
  named: "choice.catcafe.name-xiaoyu",
  later: "choice.catcafe.name-later",
}) satisfies Readonly<Record<CatcafeNarrativePreviewRouteV1, string>>;

const nodesByIdV1 = new Map(catcafeScriptV1.map((node) => [node.nodeId, node]));

function textIdsForNodeV1(node: CatcafeNarrativeNodeV1): readonly string[] {
  switch (node.kind) {
    case "say":
      return Object.freeze([
        ...(node.speakerTextId === null ? [] : [node.speakerTextId]),
        node.textId,
      ]);
    case "choice":
      return Object.freeze([node.promptTextId, ...node.options.map((option) => option.textId)]);
    case "stage":
    case "branch":
    case "end":
      return Object.freeze([]);
    default: {
      const exhaustive: never = node;
      throw new TypeError(`catcafe.narrative_preview_node_unknown:${String(exhaustive)}`);
    }
  }
}

function previewIdV1(
  nodeId: string,
  route: CatcafeNarrativePreviewRouteV1 | null,
): string {
  return route === null ? nodeId : `${nodeId}@${route}`;
}

function traceRouteV1(
  route: CatcafeNarrativePreviewRouteV1,
): readonly CatcafeNarrativePreviewCaseV1[] {
  let cursor: string | null = catcafeEntryNodeIdV1;
  let routeContext: CatcafeNarrativePreviewRouteV1 | null = null;
  let flags: readonly string[] = Object.freeze([]);
  let stage = createInitialCatcafeStageStateV1();
  const previews: CatcafeNarrativePreviewCaseV1[] = [];

  for (let steps = 0; steps < 64 && cursor !== null; steps += 1) {
    const node: CatcafeNarrativeNodeV1 | undefined = nodesByIdV1.get(cursor);
    if (node === undefined) throw new TypeError(`catcafe.narrative_preview_node_missing:${cursor}`);

    if (node.kind === "stage") {
      const mutations = node.mutations(stage);
      const outcome = reduceStageMutations(stage, mutations);
      if (outcome.kind !== "applied") {
        throw new TypeError(`catcafe.narrative_preview_stage_invalid:${node.nodeId}`);
      }
      stage = outcome.state;
    }

    const projection = projectStageRenderTarget(stage, catcafeStageContentCatalogV1);
    if (projection.diagnostics.length !== 0) {
      throw new TypeError(`catcafe.narrative_preview_projection_failed:${node.nodeId}`);
    }
    previews.push(Object.freeze({
      previewId: previewIdV1(node.nodeId, routeContext),
      nodeId: node.nodeId,
      nodeKind: node.kind,
      route: routeContext,
      textIds: textIdsForNodeV1(node),
      target: projection.target,
    }));

    switch (node.kind) {
      case "stage":
      case "say":
        cursor = node.next;
        break;
      case "choice": {
        const choiceId = choiceIdByRouteV1[route];
        const option = node.options.find((candidate) => candidate.choiceId === choiceId);
        if (option === undefined) {
          throw new TypeError(`catcafe.narrative_preview_choice_missing:${choiceId}`);
        }
        flags = Object.freeze([...new Set([...flags, ...option.setFlags])].toSorted());
        routeContext = route;
        cursor = option.next;
        break;
      }
      case "branch": {
        const next = node.choose({ flags });
        if (!node.successors.includes(next)) {
          throw new TypeError(`catcafe.narrative_preview_branch_invalid:${node.nodeId}`);
        }
        cursor = next;
        break;
      }
      case "end":
        cursor = null;
        break;
      default: {
        const exhaustive: never = node;
        throw new TypeError(`catcafe.narrative_preview_node_unknown:${String(exhaustive)}`);
      }
    }
  }

  if (cursor !== null) throw new TypeError("catcafe.narrative_preview_runaway");
  return Object.freeze(previews);
}

function createPreviewCasesV1(): readonly CatcafeNarrativePreviewCaseV1[] {
  const unique = new Map<string, CatcafeNarrativePreviewCaseV1>();
  for (const route of ["named", "later"] as const) {
    for (const preview of traceRouteV1(route)) {
      if (!unique.has(preview.previewId)) unique.set(preview.previewId, preview);
    }
  }
  const previews = Object.freeze([...unique.values()]);
  const coveredNodeIds = new Set(previews.map((preview) => preview.nodeId));
  if (coveredNodeIds.size !== catcafeNodeIdsV1.length) {
    throw new TypeError("catcafe.narrative_preview_incomplete");
  }
  for (const nodeId of catcafeNodeIdsV1) {
    if (!coveredNodeIds.has(nodeId)) {
      throw new TypeError(`catcafe.narrative_preview_node_uncovered:${nodeId}`);
    }
  }
  return previews;
}

/** Detached authoring projections: physical script nodes in both explicit choice routes. */
export const catcafeNarrativePreviewCasesV1 = createPreviewCasesV1();
