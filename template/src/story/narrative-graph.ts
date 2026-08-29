// SPDX-License-Identifier: MIT
import type { NarrativeGraph } from "@sillymaker/base/story";
import { projectVnNarrativeGraphV1 } from "@sillymaker/vn/interaction";

import { templateCompiledOpeningV1 } from "./narrative.ts";

/** The engine-owned VN projection feeds Base linting and prediction. */
export function projectTemplateNarrativeGraphV1(): NarrativeGraph {
  return projectVnNarrativeGraphV1({
    compiled: templateCompiledOpeningV1,
    sourceForNode: (node) => `story/narrative.ts#${node.nodeId}`,
  });
}
