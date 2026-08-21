// SPDX-License-Identifier: MIT
import type { DiagnosticEnvelopeV1 } from "./diagnostic-envelope.ts";
import { createDiagnosticV1 } from "./diagnostic-envelope.ts";
import type {
  SemanticStageStateV1,
  StageAppearanceV1,
  StageCameraV1,
  StageContentIdV1,
  StageLayerIdV1,
  StageLayerTransformV1,
  StagePlacementV1,
  StageTagV1,
} from "./semantic-stage.ts";
import type { StrictJsonObjectV1 } from "./strict-json.ts";
import { deepFreezeData } from "./presentation-data.ts";
import type { AssetId } from "./presentation-ids.ts";

/**
 * The Story content catalog resolves semantic stage content into renderer
 * bindings. Resolution must be a pure function of content ID and appearance
 * so the render target can always be rebuilt deterministically from the same
 * authoritative State and catalog.
 */
/**
 * A pointer/keyboard-activatable region on stage content (R-gap C: touch
 * gameplay). Regions are presentation data the content catalog resolves
 * per contentId + appearance — a character's zones can move as it grows.
 * Activation forms a semantic invocation in Story code; regions never
 * carry gameplay authority themselves. Coordinates are integer logical
 * pixels relative to the entry's anchor (the same space renderers use).
 */
export interface StageHitRegionV1 {
  readonly regionId: string;
  readonly accessibleNameText: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Authoring geometry of one resolved content: the content box in logical
 * canvas pixels and the anchor the placement point pins (permille of the
 * box; 500/1000 is bottom center). When declared, the engine stage host
 * owns the anchor transform — renderers stop hand-rolling
 * `translate(-50%, -100%)` — and editors can draw selection bounds,
 * pivots, and ground lines. Geometry is presentation data resolved per
 * contentId + appearance (a character's box grows with it); it never
 * enters authoritative State or Saves. Hit-region coordinates stay in the
 * anchor space and are unaffected.
 */
export interface StageContentGeometryV1 {
  readonly width: number;
  readonly height: number;
  /** 0..1000; 500 = horizontal center. */
  readonly anchorXPermille: number;
  /** 0..1000; 1000 = bottom edge. */
  readonly anchorYPermille: number;
}

export interface StageContentResolutionV1 {
  readonly rendererId: string;
  readonly assetIds: readonly AssetId[];
  readonly accessibleName: string;
  readonly props: StrictJsonObjectV1;
  /** Optional activatable regions; omitted content is inert. */
  readonly hitRegions?: readonly StageHitRegionV1[];
  /** Optional content box + anchor; omitted content keeps renderer CSS. */
  readonly geometry?: StageContentGeometryV1;
  /**
   * Optional ordered frame set (authorable-frame-set, accepted 2026-08-21):
   * the assets a motion `frame` track indexes into, sharing the entry's
   * geometry box. The sampled index reaches the renderer as presentation
   * data; omitted content ignores frame tracks. All frames join the
   * required-asset preload so a swap never flashes.
   */
  readonly frameAssetIds?: readonly AssetId[];
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
  readonly hitRegions: readonly StageHitRegionV1[];
  /** The validated frame set; empty when the content declares none. */
  readonly frameAssetIds: readonly AssetId[];
  readonly geometry?: StageContentGeometryV1;
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
/** Per-entry hit-region budget. Picture-dense SLGs need headroom beyond early VN pets. */
const maxHitRegionsV1 = 64;

/** Per-entry frame-set budget (authorable-frame-set, accepted 2026-08-21). */
const maxFrameAssetsV1 = 64;

function validateFrameAssetIdsV1(
  frameAssetIds: readonly AssetId[] | undefined,
  pointer: string,
  diagnostics: DiagnosticEnvelopeV1[],
): readonly AssetId[] {
  if (frameAssetIds === undefined || frameAssetIds.length === 0) return Object.freeze([]);
  const ok = frameAssetIds.length <= maxFrameAssetsV1 &&
    frameAssetIds.every((assetId) => typeof assetId === "string" && assetId.length > 0);
  if (!ok) {
    diagnostics.push(
      contentDiagnosticV1(
        "stage.frame_assets_invalid",
        "invalid stage content frame set",
        `${pointer}/frameAssetIds`,
      ),
    );
    return Object.freeze([]);
  }
  return Object.freeze([...frameAssetIds]);
}

const maxGeometrySideV1 = 1_000_000;

function validateGeometryV1(
  geometry: StageContentGeometryV1 | undefined,
  pointer: string,
  diagnostics: DiagnosticEnvelopeV1[],
): StageContentGeometryV1 | undefined {
  if (geometry === undefined) return undefined;
  const sideOk = (value: number): boolean =>
    Number.isSafeInteger(value) && value > 0 && value <= maxGeometrySideV1;
  const anchorOk = (value: number): boolean =>
    Number.isSafeInteger(value) && value >= 0 && value <= 1000;
  if (
    !sideOk(geometry.width) ||
    !sideOk(geometry.height) ||
    !anchorOk(geometry.anchorXPermille) ||
    !anchorOk(geometry.anchorYPermille)
  ) {
    diagnostics.push(
      contentDiagnosticV1("stage.geometry_invalid", "invalid stage content geometry", pointer),
    );
    return undefined;
  }
  return Object.freeze({
    width: geometry.width,
    height: geometry.height,
    anchorXPermille: geometry.anchorXPermille,
    anchorYPermille: geometry.anchorYPermille,
  });
}

function validateHitRegionsV1(
  regions: readonly StageHitRegionV1[] | undefined,
  pointer: string,
  diagnostics: DiagnosticEnvelopeV1[],
): readonly StageHitRegionV1[] {
  if (regions === undefined || regions.length === 0) return Object.freeze([]);
  const seen = new Set<string>();
  const valid: StageHitRegionV1[] = [];
  regions.forEach((region, index) => {
    const path = `${pointer}/hitRegions/${String(index)}`;
    const ok = typeof region.regionId === "string" &&
      region.regionId !== "" &&
      typeof region.accessibleNameText === "string" &&
      region.accessibleNameText !== "" &&
      Number.isSafeInteger(region.x) &&
      Number.isSafeInteger(region.y) &&
      Number.isSafeInteger(region.width) &&
      region.width > 0 &&
      Number.isSafeInteger(region.height) &&
      region.height > 0 &&
      !seen.has(region.regionId) &&
      valid.length < maxHitRegionsV1;
    if (!ok) {
      diagnostics.push(
        contentDiagnosticV1("stage.hit_region_invalid", `invalid stage hit region`, path),
      );
      return;
    }
    seen.add(region.regionId);
    valid.push(
      Object.freeze({
        regionId: region.regionId,
        accessibleNameText: region.accessibleNameText,
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
      }),
    );
  });
  return Object.freeze(valid);
}

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
          hitRegions: [] as readonly StageHitRegionV1[],
          frameAssetIds: [] as readonly AssetId[],
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
      const frameAssetIds = validateFrameAssetIdsV1(resolution.frameAssetIds, pointer, diagnostics);
      for (const assetId of frameAssetIds) requiredAssetIds.add(assetId);
      const geometry = validateGeometryV1(resolution.geometry, pointer, diagnostics);
      return {
        key: `${layer.layerId}:${entry.tag}`,
        tag: entry.tag,
        contentId: entry.contentId,
        zOrder: entry.zOrder,
        placement: entry.placement,
        appearance: entry.appearance,
        rendererId: resolution.rendererId.length === 0
          ? stageFallbackRendererIdV1
          : resolution.rendererId,
        assetIds: resolution.assetIds,
        accessibleName: resolution.accessibleName.length === 0
          ? (entry.contentId as string)
          : resolution.accessibleName,
        props: resolution.props,
        fallback: resolution.rendererId.length === 0,
        hitRegions: validateHitRegionsV1(resolution.hitRegions, pointer, diagnostics),
        frameAssetIds,
        ...(geometry === undefined ? {} : { geometry }),
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
