// SPDX-License-Identifier: MIT
import type { DiagnosticEnvelopeV1 } from "./diagnostic-envelope.js";
import { createDiagnosticV1 } from "./diagnostic-envelope.js";
import type {
  SemanticStageStateV1,
  StageAppearanceV1,
  StageCameraV1,
  StageContentIdV1,
  StageLayerIdV1,
  StageLayerTransformV1,
  StagePlacementV1,
  StageTagV1,
} from "./semantic-stage.js";
import type { StrictJsonObjectV1 } from "./strict-json.js";
import { deepFreezeData } from "./presentation-data.js";
import type { AssetId } from "./presentation-ids.js";

/**
 * The Story content catalog resolves semantic stage content into renderer
 * bindings. Resolution must be a pure function of content ID and appearance
 * so the render target can always be rebuilt deterministically from the same
 * authoritative State and catalog.
 */
export interface StageContentResolutionV1 {
  readonly rendererId: string;
  readonly assetIds: readonly AssetId[];
  readonly accessibleName: string;
  readonly props: StrictJsonObjectV1;
}

export interface StageContentCatalogV1 {
  resolveContent(
    contentId: StageContentIdV1,
    appearance: StageAppearanceV1,
  ): StageContentResolutionV1 | null;
}

/** The renderer binding used when a catalog cannot resolve semantic content. */
export const stageFallbackRendererIdV1 = "renderer.stage.fallback";

export interface StageRenderEntryV1 {
  /** Stable presentation identity: `layerId:tag`. */
  readonly key: string;
  readonly tag: StageTagV1;
  readonly contentId: StageContentIdV1;
  readonly zOrder: number;
  readonly placement: StagePlacementV1;
  readonly appearance: StageAppearanceV1;
  readonly rendererId: string;
  readonly assetIds: readonly AssetId[];
  readonly accessibleName: string;
  readonly props: StrictJsonObjectV1;
  readonly fallback: boolean;
}

export interface StageRenderLayerV1 {
  readonly layerId: StageLayerIdV1;
  readonly transform: StageLayerTransformV1;
  readonly entries: readonly StageRenderEntryV1[];
}

/**
 * The non-authoritative renderer-facing stage target. It is rebuilt
 * deterministically from SemanticStageStateV1 plus the Story catalog on
 * every projection; it never enters a Save and cannot mutate State.
 */
export interface StageRenderTargetV1 {
  readonly stageId: SemanticStageStateV1["stageId"];
  readonly layers: readonly StageRenderLayerV1[];
  readonly camera: StageCameraV1;
  readonly requiredAssetIds: readonly AssetId[];
}

export interface StageRenderProjectionV1 {
  readonly target: StageRenderTargetV1;
  readonly diagnostics: readonly DiagnosticEnvelopeV1[];
}

function contentDiagnosticV1(code: string, message: string, pointer: string): DiagnosticEnvelopeV1 {
  return createDiagnosticV1({
    code,
    phase: "presentation",
    message,
    location: { jsonPointer: pointer },
    details: {},
  });
}

/**
 * Projects the semantic stage into its render target. Unresolvable content
 * keeps its stable identity but binds the code-native fallback renderer and
 * reports a structured diagnostic; projection failures never change
 * gameplay State.
 */
export function projectStageRenderTargetV1(
  state: SemanticStageStateV1,
  catalog: StageContentCatalogV1,
): StageRenderProjectionV1 {
  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const requiredAssetIds = new Set<AssetId>();

  const layers = state.layers.map((layer, layerIndex) => {
    const entries = layer.entries.map((entry, entryIndex) => {
      const pointer = `/layers/${String(layerIndex)}/entries/${String(entryIndex)}`;
      const resolution = catalog.resolveContent(entry.contentId, entry.appearance);
      if (resolution === null) {
        diagnostics.push(
          contentDiagnosticV1(
            "stage.content_unresolved",
            `stage content "${entry.contentId}" has no catalog resolution`,
            pointer,
          ),
        );
        return {
          key: `${layer.layerId}:${entry.tag}`,
          tag: entry.tag,
          contentId: entry.contentId,
          zOrder: entry.zOrder,
          placement: entry.placement,
          appearance: entry.appearance,
          rendererId: stageFallbackRendererIdV1,
          assetIds: [] as readonly AssetId[],
          accessibleName: entry.contentId as string,
          props: {},
          fallback: true,
        };
      }
      if (resolution.rendererId.length === 0) {
        diagnostics.push(
          contentDiagnosticV1(
            "stage.renderer_missing",
            `stage content "${entry.contentId}" resolved without a renderer`,
            pointer,
          ),
        );
      }
      if (resolution.accessibleName.length === 0) {
        diagnostics.push(
          contentDiagnosticV1(
            "stage.accessibility_missing",
            `stage content "${entry.contentId}" resolved without an accessible name`,
            pointer,
          ),
        );
      }
      for (const assetId of resolution.assetIds) requiredAssetIds.add(assetId);
      return {
        key: `${layer.layerId}:${entry.tag}`,
        tag: entry.tag,
        contentId: entry.contentId,
        zOrder: entry.zOrder,
        placement: entry.placement,
        appearance: entry.appearance,
        rendererId:
          resolution.rendererId.length === 0 ? stageFallbackRendererIdV1 : resolution.rendererId,
        assetIds: resolution.assetIds,
        accessibleName:
          resolution.accessibleName.length === 0
            ? (entry.contentId as string)
            : resolution.accessibleName,
        props: resolution.props,
        fallback: resolution.rendererId.length === 0,
      };
    });
    return { layerId: layer.layerId, transform: layer.transform, entries };
  });

  return Object.freeze({
    target: deepFreezeData({
      stageId: state.stageId,
      layers,
      camera: state.camera,
      requiredAssetIds: [...requiredAssetIds].sort(),
    }),
    diagnostics: Object.freeze(diagnostics),
  });
}
