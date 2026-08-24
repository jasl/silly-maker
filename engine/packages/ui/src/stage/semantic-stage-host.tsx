// SPDX-License-Identifier: MIT
import { Fragment, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type {
  MotionSampleV1,
  StageContentGeometryV1,
  StageHitRegionV1,
  StageLayerIdV1,
  StageRenderEntryV1,
  StageRenderTargetV1,
  TimelineChannelValueV1,
  TimelinePropertyV1,
} from "@sillymaker/base";
import {
  motionTotalDurationMsV1,
  sampleMotionAtV1,
  timelineChannelBaselineV1,
} from "@sillymaker/base";

import type { AssetUrlRegistryV1 } from "../assets/use-asset-url.ts";
import { useAssetUrlV1 } from "../assets/use-asset-url.ts";
import type {
  StageFrameEntryV1,
  StageFrameLayerV1,
  StageRenderFrameV1,
} from "./stage-reconciler.ts";
import { settledStageFrameV1 } from "./stage-reconciler.ts";
import styles from "./semantic-stage-host.module.css";
import { useOptionalGameViewportV1 } from "../viewport/game-viewport.tsx";

/**
 * Renders one semantic stage render frame with stable presentation
 * identities. The host owns layer/camera/placement composition and the
 * visual interpolation of active transitions; Story renderers own the
 * content of each entry. It renders immutable projection data and never
 * becomes a gameplay authority.
 */

export interface SemanticStageEntryRendererInputV1 {
  readonly layerId: StageLayerIdV1;
  readonly entry: StageRenderEntryV1;
  /**
   * The sampled `frame` channel (authorable-frame-set, accepted
   * 2026-08-21): an index into `entry.frameAssetIds`, already clamped by
   * the host; null when no motion/ambient frame track drives this entry or
   * the content declares no frame set. Presentation data only — renderers
   * showing `frameAssetIds[frameIndex]` must fall back to their default
   * art on null.
   */
  readonly frameIndex: number | null;
}

export type SemanticStageEntryRendererV1 = (input: SemanticStageEntryRendererInputV1) => ReactNode;

export interface SemanticStageHostDiagnosticV1 {
  readonly code: "stage.renderer_unregistered";
  readonly entryKey: string;
  readonly rendererId: string;
}

/** Narrow, non-authoritative observation port optionally supplied by devtools. */
export interface SemanticStageInspectionSnapshotV1 {
  readonly enabled: boolean;
  readonly highlightHitRegions: boolean;
  readonly selectedKey: string | null;
}

export interface SemanticStageInspectionFrameV1 {
  readonly frame: StageRenderFrameV1;
  readonly activeCueId: string | null;
}

export interface SemanticStageInspectionPortV1 {
  observe(): SemanticStageInspectionSnapshotV1;
  subscribe(listener: () => void): () => void;
  select(frameKey: string | null): void;
  recordFrame(input: SemanticStageInspectionFrameV1): void;
}

export interface SemanticStageHostPropsV1 {
  readonly frame: StageRenderFrameV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  readonly accessibleName: string;
  /** Active timeline overlay channels; null when no cue is playing. */
  readonly overlay?: readonly TimelineChannelValueV1[] | null;
  /**
   * Presence-bound ambient loop samples keyed by entry key, precomputed on
   * the presentation clock for settled entries only (the stage owner
   * suspends loops while an entry's transition is in flight). Composes over
   * the settled placement like a one-shot motion; null when no loops run.
   */
  readonly ambient?: ReadonlyMap<string, MotionSampleV1> | null;
  /** The playing cue's ID, exposed as `data-stage-cue` for observation. */
  readonly activeCueId?: string | null;
  /**
   * Activates a content hit region (pointer click or keyboard). Story code
   * turns activations into semantic invocations; the host renders regions
   * as focusable buttons only when this callback is present.
   */
  onHitRegionActivate?(input: {
    readonly layerId: StageLayerIdV1;
    readonly tag: string;
    readonly contentId: string;
    readonly regionId: string;
  }): void;
  /**
   * Resolves hover-reveal assets to runtime URLs (shaped-hit-regions,
   * accepted 2026-08-21). The host shows a region's `hoverAssetId` aligned
   * to the entry's geometry box while the pointer is inside the region's
   * shape or its button holds keyboard focus. Without a registry (or an
   * unresolved asset) the reveal simply stays hidden — it is feedback
   * enhancement, never activation semantics.
   */
  readonly assets?: AssetUrlRegistryV1 | null;
  /**
   * Dev-only provenance: when present the host reports each rendered frame
   * to the controller and, while inspection is enabled, overlays click
   * surfaces that select entries. Absent in production compositions.
   */
  readonly inspect?: SemanticStageInspectionPortV1 | null;
  /**
   * Dev-only: outline every declared hit region with its regionId label.
   * Editors pass it directly; the game stage flips it through the inspect
   * controller instead. Outlines never intercept pointer input.
   */
  readonly highlightHitRegions?: boolean;
  reportDiagnostic?(diagnostic: SemanticStageHostDiagnosticV1): void;
}

const noopInspectSubscribeV1 = (): () => void => () => {};
const inspectDisabledSnapshotV1: SemanticStageInspectionSnapshotV1 = Object.freeze({
  enabled: false,
  highlightHitRegions: false,
  selectedKey: null,
});

/** Overlay channel lookup: entry channels by layer/tag, camera channels flat. */
interface OverlayIndexV1 {
  readonly entry: ReadonlyMap<string, ReadonlyMap<TimelinePropertyV1, number>>;
  readonly camera: ReadonlyMap<TimelinePropertyV1, number>;
}

const emptyOverlayIndexV1: OverlayIndexV1 = Object.freeze({
  entry: new Map<string, ReadonlyMap<TimelinePropertyV1, number>>(),
  camera: new Map<TimelinePropertyV1, number>(),
});

function indexOverlayV1(
  values: readonly TimelineChannelValueV1[] | null | undefined,
): OverlayIndexV1 {
  if (values === null || values === undefined || values.length === 0) return emptyOverlayIndexV1;
  const entry = new Map<string, Map<TimelinePropertyV1, number>>();
  const camera = new Map<TimelinePropertyV1, number>();
  for (const channel of values) {
    if (channel.target.kind === "camera") {
      camera.set(channel.property, channel.value);
      continue;
    }
    const key = `${channel.target.layerId}\u0000${channel.target.tag}`;
    const bucket = entry.get(key) ?? new Map<TimelinePropertyV1, number>();
    bucket.set(channel.property, channel.value);
    entry.set(key, bucket);
  }
  return Object.freeze({ entry, camera });
}

function overlayChannelV1(
  channels: ReadonlyMap<TimelinePropertyV1, number> | undefined,
  property: TimelinePropertyV1,
): number {
  return channels?.get(property) ?? timelineChannelBaselineV1(property);
}

const permilleV1 = (value: number): number => value / 1000;
const lerpV1 = (from: number, to: number, progress: number): number =>
  from + (to - from) * progress;

function cameraStyleV1(
  frame: StageRenderFrameV1,
  channels: ReadonlyMap<TimelinePropertyV1, number>,
): CSSProperties {
  const { camera } = frame;
  const x = camera.x - overlayChannelV1(channels, "offsetX");
  const y = camera.y - overlayChannelV1(channels, "offsetY");
  const zoom = permilleV1(camera.zoomPermille) *
    permilleV1(overlayChannelV1(channels, "scalePermille"));
  const opacity = permilleV1(overlayChannelV1(channels, "opacityPermille"));
  return {
    transform: `translate3d(${String(-x)}px, ${String(-y)}px, 0) scale(${String(zoom)})`,
    ...(opacity === 1 ? {} : { opacity }),
  };
}

function layerStyleV1(layer: StageFrameLayerV1): CSSProperties {
  const { transform } = layer;
  return {
    transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0) scale(${
      String(
        permilleV1(transform.scalePermille),
      )
    })`,
  };
}

/** The in-flight one-shot motion sample of an entry; undefined otherwise. */
function motionSampleV1(frameEntry: StageFrameEntryV1): MotionSampleV1 | undefined {
  const { transitionKind, progress, motion } = frameEntry;
  if (transitionKind !== "motion" || motion === null) return undefined;
  return sampleMotionAtV1(motion, progress * motionTotalDurationMsV1(motion));
}

function entryStyleV1(
  frameEntry: StageFrameEntryV1,
  channels: ReadonlyMap<TimelinePropertyV1, number> | undefined,
  ambientSample: MotionSampleV1 | undefined,
  motionSample: MotionSampleV1 | undefined,
): CSSProperties {
  const { entry, phase, transitionKind, progress, slide, fromPlacement } = frameEntry;
  let x = entry.placement.x;
  let y = entry.placement.y;
  let scale = permilleV1(entry.placement.scalePermille);
  // The settled placement opacity is the authoritative base; transition
  // fades and timeline overlays compose multiplicatively on top of it.
  let opacity = permilleV1(entry.placement.opacityPermille);

  if (transitionKind === "crossfade") {
    opacity *= phase === "exiting" ? 1 - progress : progress;
  } else if (transitionKind === "slide") {
    if (fromPlacement !== null) {
      x = lerpV1(fromPlacement.x, x, progress);
      y = lerpV1(fromPlacement.y, y, progress);
      scale = lerpV1(permilleV1(fromPlacement.scalePermille), scale, progress);
      opacity = lerpV1(permilleV1(fromPlacement.opacityPermille), opacity, progress);
    } else if (slide !== null) {
      const displacement = phase === "exiting" ? progress : 1 - progress;
      x += slide.x * displacement;
      y += slide.y * displacement;
      opacity *= phase === "exiting" ? 1 - progress : progress;
    }
  } else if (motionSample !== undefined) {
    // Motion keyframes own the whole envelope (including exit fades): the
    // run progress is linear, per-segment easing lives in the asset, and
    // the sampled values compose over the settled placement exactly like a
    // timeline overlay — offsets add, permille channels multiply.
    x += motionSample.offsetX;
    y += motionSample.offsetY;
    scale *= permilleV1(motionSample.scalePermille);
    opacity *= permilleV1(motionSample.opacityPermille);
  } else if (phase === "exiting") {
    opacity *= 1 - progress;
  }

  // Presence-bound ambient loop: sampled on the presentation clock for
  // settled entries only, composing over the settled placement exactly
  // like a one-shot motion (offsets add, permille channels multiply).
  if (ambientSample !== undefined && phase === "settled") {
    x += ambientSample.offsetX;
    y += ambientSample.offsetY;
    scale *= permilleV1(ambientSample.scalePermille);
    opacity *= permilleV1(ambientSample.opacityPermille);
  }

  // Timeline overlay: decorative offsets and multipliers on top of the
  // settled composition; they clear when the cue finishes.
  if (channels !== undefined) {
    x += overlayChannelV1(channels, "offsetX");
    y += overlayChannelV1(channels, "offsetY");
    scale *= permilleV1(overlayChannelV1(channels, "scalePermille"));
    opacity *= permilleV1(overlayChannelV1(channels, "opacityPermille"));
  }

  const mirror = entry.placement.mirrored ? " scaleX(-1)" : "";
  return {
    transform: `translate3d(${String(x)}px, ${String(y)}px, 0) scale(${String(scale)})${mirror}`,
    zIndex: entry.zOrder,
    ...(opacity === 1 ? {} : { opacity }),
  };
}

/**
 * The engine-owned content box for geometry-declaring content: the anchor
 * offset composes after the wrapper's scale/mirror (exactly where renderer
 * CSS used to put `translate(-50%, -100%)`), so the placement point pins
 * the declared anchor and mirroring flips content around it. Hit regions
 * stay siblings in the wrapper's anchor space, untouched by this box.
 */
function contentBoxStyleV1(geometry: StageContentGeometryV1): CSSProperties {
  const anchorX = (geometry.width * geometry.anchorXPermille) / 1000;
  const anchorY = (geometry.height * geometry.anchorYPermille) / 1000;
  return {
    width: `${String(geometry.width)}px`,
    height: `${String(geometry.height)}px`,
    transform: `translate(${String(-anchorX)}px, ${String(-anchorY)}px)`,
  };
}

function hitRegionBoxStyleV1(region: StageHitRegionV1): CSSProperties {
  return {
    left: `${String(region.x)}px`,
    top: `${String(region.y)}px`,
    width: `${String(region.width)}px`,
    height: `${String(region.height)}px`,
  };
}

/**
 * The CSS `clip-path` of a shaped region, in the region button's own box
 * coordinates. Clipping is what makes pointer hit-testing follow the shape
 * — browsers exclude clipped-out pixels from hit testing natively, so the
 * runtime never reads pixels and the region stays pure serializable data.
 */
function hitRegionClipPathV1(region: StageHitRegionV1): string | undefined {
  const points = region.polygonPoints;
  if (points === undefined) return undefined;
  const path = points
    .map((point) => `${String(point.x - region.x)}px ${String(point.y - region.y)}px`)
    .join(", ");
  return `polygon(${path})`;
}

/**
 * One hover/focus reveal overlay: the region's declared asset aligned to
 * the entry's geometry box (silhouette highlights are authored same-frame
 * as the base art). Renders nothing until the registry resolves a runtime
 * URL; re-renders when asset bytes arrive.
 */
function StageHoverRevealV1(props: {
  readonly assets: AssetUrlRegistryV1 | null;
  readonly assetId: string;
  readonly geometry: StageContentGeometryV1;
  readonly regionId: string;
}): ReactElement | null {
  const url = useAssetUrlV1(props.assets, props.assetId, "stage_hover_reveal");
  if (url === null) return null;
  return (
    <img
      className={styles["hover-reveal"]}
      data-stage-hover-reveal={props.regionId}
      src={url}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={contentBoxStyleV1(props.geometry)}
    />
  );
}

function StageEntryV1(props: {
  readonly layerId: StageLayerIdV1;
  readonly frameEntry: StageFrameEntryV1;
  readonly renderer: SemanticStageEntryRendererV1 | undefined;
  readonly overlayChannels: ReadonlyMap<TimelinePropertyV1, number> | undefined;
  readonly ambientSample: MotionSampleV1 | undefined;
  readonly onHitRegionActivate: SemanticStageHostPropsV1["onHitRegionActivate"];
  readonly assets: AssetUrlRegistryV1 | null;
  readonly inspect: SemanticStageInspectionPortV1 | null;
  readonly inspectEnabled: boolean;
  readonly inspectSelected: boolean;
  readonly hitRegionsHighlighted: boolean;
}): ReactElement {
  const { layerId, frameEntry, renderer, onHitRegionActivate, inspect } = props;
  const { entry, phase } = frameEntry;
  const exiting = phase === "exiting";
  // Hover/focus reveal state: the pointer rests on at most one region
  // button and keyboard focus on at most one, so two ids cover every
  // combination. Pure UI transients — never authoritative, never saved.
  const [hoverRegionId, setHoverRegionId] = useState<string | null>(null);
  const [focusRegionId, setFocusRegionId] = useState<string | null>(null);
  useEffect(() => {
    // Exiting unmounts the region buttons without blur/leave events.
    if (!exiting) return;
    setHoverRegionId(null);
    setFocusRegionId(null);
  }, [exiting]);
  const revealRegions = exiting || (hoverRegionId === null && focusRegionId === null)
    ? []
    : entry.hitRegions.filter(
      (region) =>
        region.hoverAssetId !== undefined &&
        (region.regionId === hoverRegionId || region.regionId === focusRegionId),
    );
  const ambientLooping = props.ambientSample !== undefined && phase === "settled";
  const motionSample = motionSampleV1(frameEntry);
  // The frame channel: an in-flight one-shot motion owns the entry's frame
  // override; a settled entry reads its ambient loop. The host clamps to
  // the declared frame set so renderers can trust the index.
  const rawFrameIndex = motionSample !== undefined
    ? motionSample.frameIndex
    : ambientLooping
    ? (props.ambientSample?.frameIndex ?? null)
    : null;
  const frameIndex = rawFrameIndex === null || entry.frameAssetIds.length === 0
    ? null
    : Math.min(rawFrameIndex, entry.frameAssetIds.length - 1);
  return (
    <div
      className={styles.entry}
      style={entryStyleV1(frameEntry, props.overlayChannels, props.ambientSample, motionSample)}
      role={exiting ? undefined : "img"}
      aria-label={exiting ? undefined : entry.accessibleName}
      aria-hidden={exiting ? true : undefined}
      data-stage-phase={phase}
      data-stage-frame={frameIndex === null ? undefined : String(frameIndex)}
      data-stage-ambient={ambientLooping ? "true" : undefined}
      {...(exiting
        ? { "data-stage-exiting": "true", "data-stage-exiting-key": entry.key }
        : { "data-stage-key": entry.key, "data-stage-tag": entry.tag })}
      data-stage-content={entry.contentId}
      data-stage-renderer={entry.rendererId}
      data-stage-fallback={renderer === undefined || entry.fallback ? "true" : undefined}
    >
      {(() => {
        const content = renderer === undefined
          ? <div className={styles.fallback}>{entry.accessibleName}</div>
          : renderer({ layerId, entry, frameIndex });
        return entry.geometry === undefined
          ? content
          : (
            <div data-stage-content-box="true" style={contentBoxStyleV1(entry.geometry)}>
              {content}
            </div>
          );
      })()}
      {revealRegions.map((region) =>
        entry.geometry === undefined || region.hoverAssetId === undefined
          ? null
          : (
            <StageHoverRevealV1
              key={`reveal:${region.regionId}`}
              assets={props.assets}
              assetId={region.hoverAssetId}
              geometry={entry.geometry}
              regionId={region.regionId}
            />
          )
      )}
      {onHitRegionActivate === undefined || exiting || entry.hitRegions.length === 0
        ? null
        : entry.hitRegions.map((region, regionIndex) => {
          const clipPath = hitRegionClipPathV1(region);
          return (
            <Fragment key={region.regionId}>
              <button
                type="button"
                className={styles["hit-region"]}
                data-stage-hit-region={region.regionId}
                data-stage-hit-region-shape={clipPath === undefined ? undefined : "polygon"}
                aria-label={region.accessibleNameText}
                style={{
                  ...hitRegionBoxStyleV1(region),
                  // Catalog order is paint order: later regions win an
                  // overlap without changing the independent DOM/focus order.
                  zIndex: regionIndex,
                  ...(clipPath === undefined ? {} : { clipPath }),
                }}
                onClick={() =>
                  onHitRegionActivate({
                    layerId,
                    tag: entry.tag as string,
                    contentId: entry.contentId as string,
                    regionId: region.regionId,
                  })}
                onPointerEnter={() => setHoverRegionId(region.regionId)}
                onPointerLeave={() =>
                  setHoverRegionId((current) => current === region.regionId ? null : current)}
                onFocus={() => setFocusRegionId(region.regionId)}
                onBlur={() =>
                  setFocusRegionId((current) => current === region.regionId ? null : current)}
              />
              {clipPath === undefined ? null : (
                // clip-path clips the button's own focus outline, so a
                // shaped region's focus indicator is this bounding-box
                // sibling (shown via CSS on :focus-visible). Shapes narrow
                // pointer hits; keyboard keeps the box.
                <span
                  className={styles["hit-region-focus"]}
                  data-stage-hit-region-focus={region.regionId}
                  aria-hidden="true"
                  style={hitRegionBoxStyleV1(region)}
                />
              )}
            </Fragment>
          );
        })}
      {!props.hitRegionsHighlighted || exiting || entry.hitRegions.length === 0
        ? null
        : entry.hitRegions.map((region) => {
          const clipPath = hitRegionClipPathV1(region);
          return (
            <div
              key={`outline:${region.regionId}`}
              className={styles["hit-region-outline"]}
              data-stage-hit-region-outline={region.regionId}
              aria-hidden="true"
              style={hitRegionBoxStyleV1(region)}
            >
              {clipPath === undefined ? null : (
                <span
                  className={styles["hit-region-outline-shape"]}
                  data-stage-hit-region-outline-shape={region.regionId}
                  style={{ clipPath }}
                />
              )}
              <span className={styles["hit-region-outline-label"]}>{region.regionId}</span>
            </div>
          );
        })}
      {inspect === null || !props.inspectEnabled ? null : (
        <button
          type="button"
          className={styles["inspect-hit"]}
          data-stage-inspect-hit={frameEntry.frameKey}
          data-stage-inspect-selected={props.inspectSelected ? "true" : undefined}
          aria-label={`inspect ${entry.tag as string}`}
          onClick={() => inspect.select(props.inspectSelected ? null : frameEntry.frameKey)}
        />
      )}
    </div>
  );
}

export function SemanticStageHostV1(props: SemanticStageHostPropsV1): ReactElement {
  const { frame, renderers, accessibleName, reportDiagnostic } = props;
  const overlayIndex = indexOverlayV1(props.overlay);

  const inspect = props.inspect ?? null;
  const activeCueId = props.activeCueId ?? null;
  const inspectState = useSyncExternalStore(
    inspect === null ? noopInspectSubscribeV1 : inspect.subscribe,
    inspect === null ? () => inspectDisabledSnapshotV1 : inspect.observe,
    inspect === null ? () => inspectDisabledSnapshotV1 : inspect.observe,
  );
  useEffect(() => {
    if (inspect === null) return;
    inspect.recordFrame({ frame, activeCueId });
  }, [inspect, frame, activeCueId]);

  const missing = useMemo(
    () =>
      frame.layers.flatMap((layer) =>
        layer.entries
          .filter(
            (frameEntry) =>
              frameEntry.phase !== "exiting" &&
              !Object.hasOwn(renderers, frameEntry.entry.rendererId),
          )
          .map((frameEntry) =>
            Object.freeze({
              code: "stage.renderer_unregistered" as const,
              entryKey: frameEntry.entry.key,
              rendererId: frameEntry.entry.rendererId,
            })
          )
      ),
    [frame, renderers],
  );

  useEffect(() => {
    if (reportDiagnostic === undefined) return;
    for (const diagnostic of missing) reportDiagnostic(diagnostic);
  }, [missing, reportDiagnostic]);

  // Stage space lives on the logical canvas: placements, hit regions, and
  // renderer coordinates are logical pixels, and a managed GameViewport
  // scales the whole stage uniformly (Ren'Py-style letterboxed canvas).
  // Without a viewport the stage renders 1:1 for tests and bare hosts.
  const geometry = useOptionalGameViewportV1();
  const scaledRootStyle = geometry === null ? undefined : ({
    insetBlockEnd: "auto",
    insetInlineEnd: "auto",
    inlineSize: `${String(geometry.canvas.width)}px`,
    blockSize: `${String(geometry.canvas.height)}px`,
    transform: `scale(${String(geometry.scale)})`,
    transformOrigin: "0 0",
  } as const);

  return (
    <div
      className={styles.root}
      style={scaledRootStyle}
      role="group"
      aria-label={accessibleName}
      data-semantic-stage="true"
      data-stage-scale={geometry === null ? undefined : geometry.scale.toFixed(4)}
      data-stage-settled={frame.settled ? "true" : "false"}
      data-stage-cue={props.activeCueId ?? undefined}
      data-stage-input-blocked={frame.inputGate.blocked ? "true" : undefined}
      data-stage-skip-on-input={frame.inputGate.skipOnInput ? "true" : undefined}
    >
      <div
        className={styles.camera}
        style={cameraStyleV1(frame, overlayIndex.camera)}
        data-stage-camera="true"
      >
        {frame.layers.map((layer) => (
          <div
            key={layer.layerId}
            className={styles.layer}
            style={layerStyleV1(layer)}
            hidden={!layer.transform.visible}
            data-stage-layer={layer.layerId}
          >
            {layer.entries.map((frameEntry) => (
              <StageEntryV1
                key={frameEntry.frameKey}
                layerId={layer.layerId}
                frameEntry={frameEntry}
                onHitRegionActivate={props.onHitRegionActivate}
                assets={props.assets ?? null}
                inspect={inspect}
                inspectEnabled={inspectState.enabled}
                inspectSelected={inspectState.selectedKey === frameEntry.frameKey}
                hitRegionsHighlighted={props.highlightHitRegions === true ||
                  inspectState.highlightHitRegions}
                overlayChannels={overlayIndex.entry.get(
                  `${layer.layerId}\u0000${frameEntry.entry.tag}`,
                )}
                ambientSample={props.ambient?.get(frameEntry.entry.key)}
                renderer={Object.hasOwn(renderers, frameEntry.entry.rendererId)
                  ? renderers[frameEntry.entry.rendererId]
                  : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Renders one settled target without transitions (no reconciler needed). */
export function SemanticStageTargetHostV1(props: {
  readonly target: StageRenderTargetV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  readonly accessibleName: string;
  /** Dev-only: outline declared hit regions (editors, previews). */
  readonly highlightHitRegions?: boolean;
  /** Hover-reveal asset URLs; see SemanticStageHostPropsV1.assets. */
  readonly assets?: AssetUrlRegistryV1 | null;
  /** Region buttons render only when provided; previews may pass a no-op. */
  readonly onHitRegionActivate?: SemanticStageHostPropsV1["onHitRegionActivate"];
  reportDiagnostic?(diagnostic: SemanticStageHostDiagnosticV1): void;
}): ReactElement {
  const frame = useMemo(() => settledStageFrameV1(props.target), [props.target]);
  return (
    <SemanticStageHostV1
      frame={frame}
      renderers={props.renderers}
      accessibleName={props.accessibleName}
      {...(props.highlightHitRegions === undefined
        ? {}
        : { highlightHitRegions: props.highlightHitRegions })}
      {...(props.assets === undefined ? {} : { assets: props.assets })}
      {...(props.onHitRegionActivate === undefined
        ? {}
        : { onHitRegionActivate: props.onHitRegionActivate })}
      {...(props.reportDiagnostic === undefined
        ? {}
        : { reportDiagnostic: props.reportDiagnostic })}
    />
  );
}
