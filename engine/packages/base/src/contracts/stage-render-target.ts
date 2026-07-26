// SPDX-License-Identifier: MIT
import type { DiagnosticEnvelopeV1 } from "./diagnostic-envelope.js";
import { createDiagnosticV1 } from "./diagnostic-envelope.js";
import type {
  SemanticStageStateV2,
  StageAppearanceV2,
  StageCameraV2,
  StageContentIdV2,
  StageLayerIdV2,
  StageLayerTransformV2,
  StagePlacementV2,
  StageTagV2,
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
export interface StageContentResolutionV2 {
  readonly rendererId: string;
  readonly assetIds: readonly AssetId[];
  readonly accessibleName: string;
  readonly props: StrictJsonObjectV1;
}

export interface StageContentCatalogV2 {
  resolveContent(
    contentId: StageContentIdV2,
    appearance: StageAppearanceV2,
  ): StageContentResolutionV2 | null;
}

/** The renderer binding used when a catalog cannot resolve semantic content. */
export const stageFallbackRendererIdV2 = "renderer.stage.fallback";

export interface StageRenderEntryV2 {
  /** Stable presentation identity: `layerId:tag`. */
  readonly key: string;
  readonly tag: StageTagV2;
  readonly contentId: StageContentIdV2;
  readonly zOrder: number;
  readonly placement: StagePlacementV2;
  readonly appearance: StageAppearanceV2;
  readonly rendererId: string;
  readonly assetIds: readonly AssetId[];
  readonly accessibleName: string;
  readonly props: StrictJsonObjectV1;
  readonly fallback: boolean;
}

export interface StageRenderLayerV2 {
  readonly layerId: StageLayerIdV2;
  readonly transform: StageLayerTransformV2;
  readonly entries: readonly StageRenderEntryV2[];
}

/**
 * The non-authoritative renderer-facing stage target. It is rebuilt
 * deterministically from SemanticStageStateV2 plus the Story catalog on
 * every projection; it never enters a Save and cannot mutate State.
 */
export interface StageRenderTargetV2 {
  readonly stageId: SemanticStageStateV2["stageId"];
  readonly layers: readonly StageRenderLayerV2[];
  readonly camera: StageCameraV2;
  readonly requiredAssetIds: readonly AssetId[];
}

export interface StageRenderProjectionV2 {
  readonly target: StageRenderTargetV2;
  readonly diagnostics: readonly DiagnosticEnvelopeV1[];
}

function contentDiagnosticV2(code: string, message: string, pointer: string): DiagnosticEnvelopeV1 {
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
export function projectStageRenderTargetV2(
  state: SemanticStageStateV2,
  catalog: StageContentCatalogV2,
): StageRenderProjectionV2 {
  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const requiredAssetIds = new Set<AssetId>();

  const layers = state.layers.map((layer, layerIndex) => {
    const entries = layer.entries.map((entry, entryIndex) => {
      const pointer = `/layers/${String(layerIndex)}/entries/${String(entryIndex)}`;
      const resolution = catalog.resolveContent(entry.contentId, entry.appearance);
      if (resolution === null) {
        diagnostics.push(
          contentDiagnosticV2(
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
          rendererId: stageFallbackRendererIdV2,
          assetIds: [] as readonly AssetId[],
          accessibleName: entry.contentId as string,
          props: {},
          fallback: true,
        };
      }
      if (resolution.rendererId.length === 0) {
        diagnostics.push(
          contentDiagnosticV2(
            "stage.renderer_missing",
            `stage content "${entry.contentId}" resolved without a renderer`,
            pointer,
          ),
        );
      }
      if (resolution.accessibleName.length === 0) {
        diagnostics.push(
          contentDiagnosticV2(
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
          resolution.rendererId.length === 0 ? stageFallbackRendererIdV2 : resolution.rendererId,
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
