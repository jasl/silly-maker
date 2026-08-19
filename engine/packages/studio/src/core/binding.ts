// SPDX-License-Identifier: MIT
import type { StageContentCatalogV1, StagePlacementV1 } from "@sillymaker/base";
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";

/**
 * The application-declared Studio binding contracts: only what a file scan
 * cannot discover (Authoring Architecture S2). Scene and motion documents
 * are enumerated by the Project Authoring Index over the dev-server ports —
 * the binding registers no source paths.
 */

/** One structured appearance control: an enumerated select, not free text. */
export interface StudioAppearanceFieldV1 {
  /** The appearance key this field writes (for example "expression"). */
  readonly key: string;
  readonly label: string;
  readonly values: readonly string[];
}

/**
 * One content the author may add to a scene from the Content browser
 * (Scene Construction S4). The descriptor owns entry-construction defaults
 * and the structured appearance controls; content geometry stays owned by
 * the catalog's `resolveContent` — the descriptor never becomes a second
 * geometry declaration point.
 */
export interface StudioContentDescriptorV1 {
  readonly contentId: string;
  readonly label: string;
  readonly category: "background" | "character" | "prop" | "effect";
  /** The layer a new entry for this content lands on. */
  readonly defaultLayerId: string;
  readonly defaultZOrder: number;
  /** Omitted: backgrounds place nowhere; placeable content starts centered. */
  readonly defaultPlacement?: StagePlacementV1;
  readonly defaultAppearance?: Readonly<Record<string, string>>;
  readonly appearanceFields?: readonly StudioAppearanceFieldV1[];
}

/**
 * Narrow runtime-image registry port: the canvas preloads the compiled
 * target's assets through it and re-renders as bytes arrive. A Story
 * binding constructs the same registry the game uses (resolved manifest +
 * browser image loader) and binds its renderers to it; without one the
 * canvas keeps the Story's code-native fallbacks.
 */
export interface StudioAssetRegistryPortV1 {
  preload(assetIds: readonly string[], signal: AbortSignal): Promise<unknown>;
  observe(): { readonly revision: number };
  subscribe(listener: () => void): () => void;
}

/**
 * The read-only narrative flow projection (Authoring Architecture S5;
 * shape frozen by the interaction-table proposal). Derived data: the
 * Story's interaction-document compiler emits it — it is never edited,
 * carries no layout, and never becomes a second author authority. Nodes
 * group by their source document; edges carry the author-meaningful label
 * (choice, branch condition, roll outcome, cross-document call).
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
  /** The source interaction document; null for hand-written legacy nodes. */
  readonly docId: string | null;
  readonly blockName: string | null;
  /** Human-readable digest: textId / effect id+params / conditions. */
  readonly summary: string;
  /** Source reference, e.g. `interaction-doc:doc.template.opening#greeting`. */
  readonly source: string;
}

export type NarrativeFlowEdgeLabelV1 =
  | { readonly kind: "next" }
  | {
    readonly kind: "choice";
    readonly choiceId: string;
    readonly textId: string;
    /** Authored option copy when the Story compiler inlined it. */
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

/** The application's Studio binding, declared in `sillymaker.config.ts`. */
export interface StudioBindingV1 {
  readonly catalog: StageContentCatalogV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  /** Runtime-image registry so the canvas draws real art; renderers must be bound to it. */
  readonly assets?: StudioAssetRegistryPortV1;
  /**
   * The content authoring manifest: what the Content browser offers for
   * scene construction. Omitted: Studio stays a tuning-only workspace for
   * this application (no content browsing, no add-entry).
   */
  readonly contents?: readonly StudioContentDescriptorV1[];
  /**
   * The compiled narrative flow projection the Flow workspace renders
   * read-only. Omitted: the application has no interaction documents (or
   * has not wired the projection) and the Flow workspace stays hidden.
   */
  readonly flow?: NarrativeFlowGraphV1;
  /**
   * Optional default-locale text lookup for authoring displays: the Flow
   * workspace resolves `text.*` ids in node summaries and choice-edge
   * textIds through it, so projections that reference shared copy stay
   * human-readable without every kit inlining text. Returns null for
   * unknown ids. Presentation-only — never a second text authority.
   */
  readonly resolveText?: (textId: string) => string | null;
}
