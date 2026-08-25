// SPDX-License-Identifier: MIT
import type { StageContentCatalogV1, TimelineCatalogV1 } from "@sillymaker/base";
import type { AssetUrlRegistryV1, SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import type { RuntimeInspectorSourceV1 } from "./runtime-inspection.ts";

/**
 * Story-owned, read-only narrative projection. It remains a data contract even
 * though M5 retired the Flow workspace; no layout or editing authority lives
 * in this shape.
 */
export interface NarrativeFlowGraphNodeV1 {
  readonly nodeId: string;
  readonly kind:
    | "say"
    | "menu"
    | "effect"
    | "roll"
    | "stage"
    | "branch"
    | "flag"
    | "barrier"
    | "hold"
    | "end";
  readonly docId: string | null;
  readonly blockName: string | null;
  readonly summary: string;
  readonly source: string;
}

export type NarrativeFlowEdgeLabelV1 =
  | { readonly kind: "next" }
  | {
    readonly kind: "choice";
    readonly choiceId: string;
    readonly textId: string;
    readonly text?: string;
    readonly gates: readonly string[];
  }
  | { readonly kind: "roll"; readonly outcome: string }
  | { readonly kind: "branch"; readonly condition: string }
  | { readonly kind: "call"; readonly label: string };

export interface NarrativeFlowGraphEdgeV1 {
  readonly from: string;
  readonly to: string;
  readonly label: NarrativeFlowEdgeLabelV1;
}

export interface NarrativeFlowGraphV1 {
  readonly nodes: readonly NarrativeFlowGraphNodeV1[];
  readonly edges: readonly NarrativeFlowGraphEdgeV1[];
}

/**
 * The small application-owned seam the Inspector cannot discover from source
 * files. Source enumeration and writes stay on the dev-server ports and never
 * enter this binding.
 */
export interface InspectorBindingV1 {
  readonly catalog: StageContentCatalogV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  readonly assets?: AssetUrlRegistryV1;
  readonly timelines?: TimelineCatalogV1;
  /** Optional application-owned runtime projection; the Inspector never loads a unit through it. */
  readonly runtime?: RuntimeInspectorSourceV1;
}
