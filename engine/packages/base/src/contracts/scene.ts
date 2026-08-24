// SPDX-License-Identifier: MIT
import { dataFailure, readArray, readExactRecord } from "./presentation-data.ts";
import type {
  SemanticStageStateV1,
  StageAppearanceV1,
  StageContentIdV1,
  StageLayerIdV1,
  StagePlacementV1,
  StageTagV1,
} from "./semantic-stage.ts";
import {
  parseStageAppearanceV1,
  parseStageContentIdV1,
  parseStageLayerIdV1,
  parseStagePlacementV1,
  parseStageTagV1,
} from "./semantic-stage.ts";
import type { StageMutationV1 } from "./semantic-stage-reducer.ts";
import { parseStageMutationV1 } from "./semantic-stage-reducer.ts";
import type {
  StageTargetChangeV1,
  StageTransitionCatalogV1,
  StageTransitionDefinitionV1,
  StageTransitionInputPolicyV1,
  StageTransitionInterruptionV1,
  StageTransitionReadinessV1,
  StageTransitionReducedMotionV1,
} from "./stage-transition.ts";
import { motionStageTransitionV1, parseStageTransitionDefinitionV1 } from "./stage-transition.ts";
import type { StageAmbientBindingV1, StageAmbientCatalogV1 } from "./stage-ambient.ts";
import type { StageRenderEntryV1 } from "./stage-render-target.ts";
import type { MotionDocumentV1 } from "./motion.ts";
import { motionDefinitionFromDocumentV1, parseMotionDocumentV1 } from "./motion.ts";

/**
 * Scene authoring contracts: a Scene is plain, versioned, validated
 * authoring data that a Story keeps as a standalone Document (typically a
 * `*.scene.json` file under `src/scenes/<scene>/`). The Document is the
 * single authoring authority for a scene's visual composition — entries
 * (stable `<layerId, tag>` identity, content, placement, appearance) and
 * named cues that show/hide those entries, each optionally declaring its
 * stage-edge presentation: a bound motion asset or an explicit instant cut.
 *
 * Scenes compile into the existing runtime contracts and never become a
 * second gameplay or Stage authority: `cueMutations` emits ordinary
 * `StageMutationV1` batches (byte-identical to hand-written ones, so
 * Snapshot/Save/digest/replay are unaffected), and
 * `sceneStageTransitionBindingsV1` derives exact-match transition-catalog
 * bindings so no Story-global resolver inference is needed.
 */

export interface SceneCanvasV1 {
  readonly width: number;
  readonly height: number;
}

/**
 * Presence-bound ambient loop (ambient-loop-motion, accepted 2026-08-15):
 * an ordinary motion Document sampled on the presentation clock while this
 * entry is settled on stage. Loop semantics live here in the binding, not
 * in the motion Document; `phaseMs` is a presentation-only phase offset so
 * entries sharing one loop Document need not move in lockstep.
 */
export interface SceneEntryAmbientV1 {
  readonly motionId: string;
  readonly phaseMs?: number;
}

export interface SceneEntryV1 {
  readonly layerId: StageLayerIdV1;
  readonly tag: StageTagV1;
  readonly contentId: StageContentIdV1;
  readonly zOrder?: number;
  readonly placement?: StagePlacementV1;
  readonly appearance?: StageAppearanceV1;
  readonly ambient?: SceneEntryAmbientV1;
}

/**
 * `show` ensures the entry is on stage with its declared content: absent
 * entries are shown with the declared zOrder/placement/appearance, an
 * entry already showing the same content is left untouched (placement and
 * appearance continuity), and an entry showing different content is
 * content-replaced without overriding its continuity. `hide` removes the
 * entry when present. Both are idempotent, so narrative re-entry cannot
 * double-mutate the stage.
 */
export type SceneCueKindV1 = "show" | "hide";

export interface SceneCueV1 {
  readonly cueId: string;
  readonly kind: SceneCueKindV1;
  readonly tag: StageTagV1;
  /** Motion asset presented on this cue's stage edge (enter for show, exit for hide). */
  readonly motionId?: string;
  /**
   * Explicit instant cut on this cue's stage edge (cue-identity proposal,
   * owner ruling #1): resolved cue-first through presentation edge context,
   * the derived binding returns a `kind: "cut"` definition — non-null, so
   * it suppresses outer catalog rules instead of falling through. Mutually
   * exclusive with `motionId`.
   */
  readonly cut?: true;
}

export interface SceneDocumentV1 {
  readonly format: "sillymaker.scene";
  readonly version: 1;
  readonly sceneId: string;
  readonly label: string;
  /** The logical design space the placements assume; Studio draws it. */
  readonly canvas: SceneCanvasV1;
  readonly entries: readonly SceneEntryV1[];
  readonly cues: readonly SceneCueV1[];
}

/**
 * Build-known runtime projection of one admitted Authoring Scene. Authoring
 * hierarchy, labels, source locations, and inspection facets stay in the
 * compiler result; Player code needs only the existing low-level document and
 * the layer order that document owns.
 */
export interface AuthoringSceneRuntimePlanV1 {
  readonly sourceKind: "authoring_scene";
  readonly sceneDocument: SceneDocumentV1;
  readonly orderedLayerIds: readonly StageLayerIdV1[];
}

/** Player-facing accessors for an Authoring Scene runtime plan. */
export interface AuthoringSceneRuntimeV1 extends SceneV1 {
  /**
   * Reconciles only paint authority already represented in the adopted Stage:
   * layer order plus z-order of currently visible declared entries. Hidden
   * cue targets stay hidden and gameplay-owned placement/appearance survive.
   */
  reconcileOrderingMutations(stage: SemanticStageStateV1): readonly StageMutationV1[];
}

/** The compiled scene: typed accessors over one validated Document. */
export interface SceneV1 {
  readonly sceneDocument: SceneDocumentV1;
  readonly sceneId: string;
  readonly label: string;
  readonly cueIds: readonly string[];
  /** Every contentId a cue of this scene may put on stage (for lint). */
  readonly mayShow: readonly string[];
  /** ContentIds the one cue may show; feeds a stage node's `mayShow`. */
  cueMayShow(cueId: string): readonly string[];
  cueMotionId(cueId: string): string | null;
  /** The cue's idempotent mutation batch against the current stage. */
  cueMutations(cueId: string, stage: SemanticStageStateV1): readonly StageMutationV1[];
  /**
   * Opens (or reopens) the scene: the deterministic mutation batch that
   * makes every layer this Document declares look exactly like its
   * declared entries — undeclared entries on those layers hide first, then
   * each declared entry shows, content-replaces, or corrects placement and
   * appearance back to the declared values. Idempotent: opening a matching
   * stage emits nothing. Layers the Document does not declare are never
   * touched; declared entries without a declared placement/appearance keep
   * whatever gameplay set; zOrder drift is not corrected (re-show owns it).
   */
  openMutations(stage: SemanticStageStateV1): readonly StageMutationV1[];
}

export const sceneDocumentFormatV1 = "sillymaker.scene";
export const sceneDocumentVersionV1 = 1;

const sceneIdPatternV1 = /^scene\.[a-z0-9_.-]+$/u;
const sceneCueIdPatternV1 = /^cue\.[a-z0-9_.-]+$/u;
const sceneMotionIdPatternV1 = /^motion\.[a-z0-9_.-]+$/u;
const sceneMaxIdLengthV1 = 96;
const sceneMaxLabelLengthV1 = 120;
const sceneCanvasLimitV1 = 1_000_000;
/** @internal Shared with the package-private Authoring Scene compiler. */
export const sceneMaxEntriesInternalV1 = 64;
/** @internal Shared with the package-private Authoring Scene compiler. */
export const sceneMaxCuesInternalV1 = 128;
const sceneZOrderLimitV1 = 1_000_000;

function parseSceneIdV1(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length > sceneMaxIdLengthV1 ||
    !sceneIdPatternV1.test(value)
  ) {
    return dataFailure(path, "scene_id_invalid");
  }
  return value;
}

function parseSceneCueIdV1(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length > sceneMaxIdLengthV1 ||
    !sceneCueIdPatternV1.test(value)
  ) {
    return dataFailure(path, "scene_cue_id_invalid");
  }
  return value;
}

function parseSceneMotionIdV1(
  value: unknown,
  path: string,
  code = "scene_cue_motion_id_invalid",
): string {
  if (
    typeof value !== "string" ||
    value.length > sceneMaxIdLengthV1 ||
    !sceneMotionIdPatternV1.test(value)
  ) {
    return dataFailure(path, code);
  }
  return value;
}

/** Bounded by the motion duration cap: phase is modulo the loop anyway. */
const sceneAmbientPhaseLimitMsV1 = 60_000;

function parseSceneEntryAmbientV1(value: unknown, path: string): SceneEntryAmbientV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "scene_ambient_invalid");
  }
  const hasPhase = hasDefinedOwnValueV1(value, "phaseMs");
  const record = readExactRecord(value, hasPhase ? ["motionId", "phaseMs"] : ["motionId"], path);
  const phaseMs = record.phaseMs;
  if (
    phaseMs !== undefined &&
    (typeof phaseMs !== "number" || !Number.isSafeInteger(phaseMs) || phaseMs < 0 ||
      phaseMs > sceneAmbientPhaseLimitMsV1)
  ) {
    return dataFailure(`${path}/phaseMs`, "scene_ambient_phase_invalid");
  }
  return {
    motionId: parseSceneMotionIdV1(
      record.motionId,
      `${path}/motionId`,
      "scene_ambient_motion_id_invalid",
    ),
    ...(phaseMs === undefined ? {} : { phaseMs }),
  };
}

function parseSceneCanvasV1(value: unknown, path: string): SceneCanvasV1 {
  const record = readExactRecord(value, ["width", "height"], path);
  const parseSide = (candidate: unknown, sidePath: string): number => {
    if (
      typeof candidate !== "number" ||
      !Number.isSafeInteger(candidate) ||
      candidate < 1 ||
      candidate > sceneCanvasLimitV1
    ) {
      return dataFailure(sidePath, "scene_canvas_invalid");
    }
    return candidate;
  };
  return {
    width: parseSide(record.width, `${path}/width`),
    height: parseSide(record.height, `${path}/height`),
  };
}

function hasDefinedOwnValueV1(value: object, key: string): boolean {
  return Object.hasOwn(value, key) && (value as Record<string, unknown>)[key] !== undefined;
}

function parseSceneEntryV1(value: unknown, path: string): SceneEntryV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "scene_entry_invalid");
  }
  const baseKeys = ["layerId", "tag", "contentId"];
  const optionalKeys = ["zOrder", "placement", "appearance", "ambient"].filter(
    (key) => hasDefinedOwnValueV1(value, key),
  );
  const record = readExactRecord(value, [...baseKeys, ...optionalKeys], path);
  const zOrder = record.zOrder;
  if (
    zOrder !== undefined &&
    (typeof zOrder !== "number" || !Number.isSafeInteger(zOrder) ||
      Math.abs(zOrder) > sceneZOrderLimitV1)
  ) {
    return dataFailure(`${path}/zOrder`, "z_order_invalid");
  }
  return {
    layerId: parseStageLayerIdV1(record.layerId, `${path}/layerId`),
    tag: parseStageTagV1(record.tag, `${path}/tag`),
    contentId: parseStageContentIdV1(record.contentId, `${path}/contentId`),
    ...(zOrder === undefined ? {} : { zOrder }),
    ...(record.placement === undefined
      ? {}
      : { placement: parseStagePlacementV1(record.placement, `${path}/placement`) }),
    ...(record.appearance === undefined
      ? {}
      : { appearance: parseStageAppearanceV1(record.appearance, `${path}/appearance`) }),
    ...(record.ambient === undefined
      ? {}
      : { ambient: parseSceneEntryAmbientV1(record.ambient, `${path}/ambient`) }),
  };
}

function parseSceneCueV1(value: unknown, path: string): SceneCueV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "scene_cue_invalid");
  }
  const hasMotion = hasDefinedOwnValueV1(value, "motionId");
  const hasCut = hasDefinedOwnValueV1(value, "cut");
  const record = readExactRecord(
    value,
    [
      "cueId",
      "kind",
      "tag",
      ...(hasMotion ? ["motionId"] : []),
      ...(hasCut ? ["cut"] : []),
    ],
    path,
  );
  if (record.kind !== "show" && record.kind !== "hide") {
    return dataFailure(`${path}/kind`, "scene_cue_kind_invalid");
  }
  if (hasCut && record.cut !== true) {
    return dataFailure(`${path}/cut`, "scene_cue_cut_invalid");
  }
  if (hasCut && hasMotion) {
    // A cue's edge plays a motion or is an explicit instant cut, never both.
    return dataFailure(`${path}/cut`, "scene_cue_cut_motion_conflict");
  }
  return {
    cueId: parseSceneCueIdV1(record.cueId, `${path}/cueId`),
    kind: record.kind,
    tag: parseStageTagV1(record.tag, `${path}/tag`),
    ...(hasMotion ? { motionId: parseSceneMotionIdV1(record.motionId, `${path}/motionId`) } : {}),
    ...(hasCut ? { cut: true as const } : {}),
  };
}

/**
 * Parses a `sillymaker.scene` Document (for example the value of a
 * `*.scene.json` import). Admission is strict: exact keys, the existing
 * stage integer bounds, unique tags and cue ids, cue tags resolving to a
 * declared entry, and per-cue presentations (`motionId` xor `cut`) — one
 * structured path on every failure. Divergent same-edge bindings are legal
 * per-cue declarations resolved through presentation edge context.
 */
export function parseSceneDocumentV1(value: unknown, path = ""): SceneDocumentV1 {
  const record = readExactRecord(
    value,
    ["format", "version", "sceneId", "label", "canvas", "entries", "cues"],
    path,
  );
  if (record.format !== sceneDocumentFormatV1) {
    return dataFailure(`${path}/format`, "scene_format_invalid");
  }
  if (record.version !== sceneDocumentVersionV1) {
    return dataFailure(`${path}/version`, "scene_version_unsupported");
  }
  if (
    typeof record.label !== "string" ||
    record.label.length === 0 ||
    record.label.length > sceneMaxLabelLengthV1
  ) {
    return dataFailure(`${path}/label`, "scene_label_invalid");
  }

  const rawEntries = readArray(record.entries, `${path}/entries`);
  if (rawEntries.length > sceneMaxEntriesInternalV1) {
    return dataFailure(`${path}/entries`, "scene_entries_count_invalid");
  }
  const entries: SceneEntryV1[] = [];
  const entriesByTag = new Map<string, SceneEntryV1>();
  for (const [index, entryValue] of rawEntries.entries()) {
    const entry = parseSceneEntryV1(entryValue, `${path}/entries/${String(index)}`);
    // Tags are unique across the whole Document (not just per layer) so a
    // cue's tag reference is never ambiguous.
    if (entriesByTag.has(entry.tag as string)) {
      return dataFailure(`${path}/entries/${String(index)}/tag`, "scene_entry_tag_duplicate");
    }
    entriesByTag.set(entry.tag as string, entry);
    entries.push(entry);
  }

  const rawCues = readArray(record.cues, `${path}/cues`);
  if (rawCues.length > sceneMaxCuesInternalV1) {
    return dataFailure(`${path}/cues`, "scene_cues_count_invalid");
  }
  const cues: SceneCueV1[] = [];
  const seenCueIds = new Set<string>();
  for (const [index, cueValue] of rawCues.entries()) {
    const cuePath = `${path}/cues/${String(index)}`;
    const cue = parseSceneCueV1(cueValue, cuePath);
    if (seenCueIds.has(cue.cueId)) {
      return dataFailure(`${cuePath}/cueId`, "scene_cue_id_duplicate");
    }
    seenCueIds.add(cue.cueId);
    if (!entriesByTag.has(cue.tag as string)) {
      return dataFailure(`${cuePath}/tag`, "scene_cue_tag_unknown");
    }
    // Two cues may bind divergent presentations to one stage edge: the
    // derived bindings resolve cue-first through presentation edge context
    // (cue-identity proposal, accepted 2026-08-17). Divergent edges leave
    // the context-free fallback table, so admission no longer rejects them.
    cues.push(cue);
  }

  return {
    format: sceneDocumentFormatV1,
    version: sceneDocumentVersionV1,
    sceneId: parseSceneIdV1(record.sceneId, `${path}/sceneId`),
    label: record.label,
    canvas: parseSceneCanvasV1(record.canvas, `${path}/canvas`),
    entries,
    cues,
  };
}

interface SceneIndexV1 {
  readonly sceneDocument: SceneDocumentV1;
  readonly entriesByTag: ReadonlyMap<string, SceneEntryV1>;
  readonly cuesById: ReadonlyMap<string, SceneCueV1>;
}

function indexSceneV1(sceneDocument: SceneDocumentV1): SceneIndexV1 {
  return {
    sceneDocument,
    entriesByTag: new Map(sceneDocument.entries.map((entry) => [entry.tag as string, entry])),
    cuesById: new Map(sceneDocument.cues.map((cue) => [cue.cueId, cue])),
  };
}

function requireCueV1(index: SceneIndexV1, cueId: string): SceneCueV1 {
  const cue = index.cuesById.get(cueId);
  if (cue === undefined) {
    return dataFailure(`/cues/${cueId}`, "scene_cue_unknown");
  }
  return cue;
}

function requireCueEntryV1(index: SceneIndexV1, cue: SceneCueV1): SceneEntryV1 {
  const entry = index.entriesByTag.get(cue.tag as string);
  if (entry === undefined) {
    // Admission guarantees the reference; this only guards internal misuse.
    return dataFailure(`/cues/${cue.cueId}/tag`, "scene_cue_tag_unknown");
  }
  return entry;
}

/**
 * The cue's mutation plan against one observed current content: `undefined`
 * means the entry is absent. Shared by the live accessor (reading the
 * authoritative stage) and the settled replay (folding cue order).
 */
function cueMutationPlanV1(
  cue: SceneCueV1,
  entry: SceneEntryV1,
  currentContentId: string | undefined,
): readonly StageMutationV1[] {
  const plans: unknown[] = [];
  switch (cue.kind) {
    case "show": {
      if (currentContentId === undefined) {
        plans.push({
          kind: "show",
          layerId: entry.layerId,
          tag: entry.tag,
          contentId: entry.contentId,
          ...(entry.zOrder === undefined ? {} : { zOrder: entry.zOrder }),
          ...(entry.placement === undefined ? {} : { placement: entry.placement }),
          ...(entry.appearance === undefined ? {} : { appearance: entry.appearance }),
        });
      } else if (currentContentId !== (entry.contentId as string)) {
        // Content replace keeps placement/appearance continuity on purpose:
        // gameplay may have moved or re-dressed the entry since it was shown.
        plans.push({
          kind: "replace",
          layerId: entry.layerId,
          tag: entry.tag,
          contentId: entry.contentId,
        });
      }
      break;
    }
    case "hide": {
      if (currentContentId !== undefined) {
        plans.push({ kind: "hide", layerId: entry.layerId, tag: entry.tag });
      }
      break;
    }
    default: {
      const exhaustive: never = cue.kind;
      return dataFailure(`/cues/${cue.cueId}/kind`, String(exhaustive));
    }
  }
  return plans.map((plan, planIndex) =>
    parseStageMutationV1(plan, `/cues/${cue.cueId}/mutations/${String(planIndex)}`)
  );
}

function currentContentIdV1(
  stage: SemanticStageStateV1,
  entry: SceneEntryV1,
): string | undefined {
  const layer = stage.layers.find((candidate) => candidate.layerId === entry.layerId);
  const current = layer?.entries.find((candidate) => candidate.tag === entry.tag);
  return current === undefined ? undefined : (current.contentId as string);
}

function samePlacementV1(current: StagePlacementV1, declared: StagePlacementV1): boolean {
  return current.x === declared.x &&
    current.y === declared.y &&
    current.scalePermille === declared.scalePermille &&
    current.opacityPermille === declared.opacityPermille &&
    current.mirrored === declared.mirrored;
}

function sameAppearanceV1(current: StageAppearanceV1, declared: StageAppearanceV1): boolean {
  const currentKeys = Object.keys(current);
  const declaredKeys = Object.keys(declared);
  return currentKeys.length === declaredKeys.length &&
    declaredKeys.every((key) => current[key] === declared[key]);
}

function layerOrderPlanV1(
  orderedLayerIds: readonly StageLayerIdV1[] | undefined,
  stage: SemanticStageStateV1,
): readonly unknown[] {
  if (
    orderedLayerIds === undefined ||
    (orderedLayerIds.length === stage.layers.length &&
      orderedLayerIds.every((layerId, index) => layerId === stage.layers[index]?.layerId))
  ) {
    return [];
  }
  return [{ kind: "setLayerOrder", layerIds: orderedLayerIds }];
}

/** The open plan: strangers on declared layers hide, declared entries settle. */
function openMutationPlanV1(
  sceneDocument: SceneDocumentV1,
  index: SceneIndexV1,
  stage: SemanticStageStateV1,
  options: SceneFromAdmittedDocumentInternalOptionsV1,
): readonly StageMutationV1[] {
  const plans: unknown[] = [...layerOrderPlanV1(options.orderedLayerIds, stage)];
  // Layer order and entry membership are separate authorities. An authored
  // empty layer participates in paint order, but it does not claim or hide
  // gameplay-owned entries that happen to occupy that layer.
  const declaredLayerIds: string[] = [];
  for (const entry of sceneDocument.entries) {
    if (!declaredLayerIds.includes(entry.layerId as string)) {
      declaredLayerIds.push(entry.layerId as string);
    }
  }

  for (const layerId of declaredLayerIds) {
    const layer = stage.layers.find((candidate) => (candidate.layerId as string) === layerId);
    for (const current of layer?.entries ?? []) {
      const declared = index.entriesByTag.get(current.tag as string);
      if (declared === undefined || (declared.layerId as string) !== layerId) {
        plans.push({ kind: "hide", layerId, tag: current.tag });
      }
    }
  }

  for (const entry of sceneDocument.entries) {
    const layer = stage.layers.find((candidate) => candidate.layerId === entry.layerId);
    const current = layer?.entries.find((candidate) => candidate.tag === entry.tag);
    if (current === undefined) {
      plans.push({
        kind: "show",
        layerId: entry.layerId,
        tag: entry.tag,
        contentId: entry.contentId,
        ...(entry.zOrder === undefined ? {} : { zOrder: entry.zOrder }),
        ...(entry.placement === undefined ? {} : { placement: entry.placement }),
        ...(entry.appearance === undefined ? {} : { appearance: entry.appearance }),
      });
      continue;
    }
    if ((current.contentId as string) !== (entry.contentId as string)) {
      plans.push({
        kind: "replace",
        layerId: entry.layerId,
        tag: entry.tag,
        contentId: entry.contentId,
      });
    }
    if (entry.placement !== undefined && !samePlacementV1(current.placement, entry.placement)) {
      plans.push({
        kind: "setPlacement",
        layerId: entry.layerId,
        tag: entry.tag,
        placement: entry.placement,
      });
    }
    if (entry.appearance !== undefined && !sameAppearanceV1(current.appearance, entry.appearance)) {
      plans.push({
        kind: "setAppearance",
        layerId: entry.layerId,
        tag: entry.tag,
        appearance: entry.appearance,
      });
    }
    if (
      options.reconcileZOrder === true &&
      entry.zOrder !== undefined &&
      current.zOrder !== entry.zOrder
    ) {
      plans.push({
        kind: "setZOrder",
        layerId: entry.layerId,
        tag: entry.tag,
        zOrder: entry.zOrder,
      });
    }
  }

  return plans.map((plan, planIndex) =>
    parseStageMutationV1(plan, `/open/mutations/${String(planIndex)}`)
  );
}

function authoringOrderingMutationPlanV1(
  plan: AuthoringSceneRuntimePlanV1,
  stage: SemanticStageStateV1,
): readonly StageMutationV1[] {
  const plans: unknown[] = [...layerOrderPlanV1(plan.orderedLayerIds, stage)];
  for (const entry of plan.sceneDocument.entries) {
    const layer = stage.layers.find((candidate) => candidate.layerId === entry.layerId);
    const current = layer?.entries.find((candidate) => candidate.tag === entry.tag);
    if (
      current !== undefined &&
      entry.zOrder !== undefined &&
      current.zOrder !== entry.zOrder
    ) {
      plans.push({
        kind: "setZOrder",
        layerId: entry.layerId,
        tag: entry.tag,
        zOrder: entry.zOrder,
      });
    }
  }
  return plans.map((mutation, index) =>
    parseStageMutationV1(mutation, `/reconcile/mutations/${String(index)}`)
  );
}

/** @internal Options used only by package-owned runtime-plan compilers. */
export interface SceneFromAdmittedDocumentInternalOptionsV1 {
  /**
   * Authoring Scene runtime plans own dense sibling paint order and therefore
   * reconcile declared z-order through ordinary authoritative mutations.
   * The low-level Scene entry deliberately leaves this false so existing
   * gameplay-owned z drift keeps its documented continuity.
   */
  readonly reconcileZOrder?: boolean;
  /**
   * Authoring Scene layers are the complete paint-order set for the Stage.
   * A same-set reorder becomes an ordinary mutation; a changed set fails the
   * atomic batch so the module-update owner can fall back to R3. Empty layers
   * do not claim gameplay-owned entry membership.
   */
  readonly orderedLayerIds?: readonly StageLayerIdV1[];
}

/**
 * @internal Package-only factory for a document already constructed by one
 * trusted compiler. It does not repeat public source admission.
 */
export function sceneFromAdmittedDocumentInternalV1(
  sceneDocument: SceneDocumentV1,
  options: SceneFromAdmittedDocumentInternalOptionsV1 = {},
): SceneV1 {
  const index = indexSceneV1(sceneDocument);

  const mayShow: string[] = [];
  for (const cue of sceneDocument.cues) {
    if (cue.kind !== "show") continue;
    const entry = requireCueEntryV1(index, cue);
    if (!mayShow.includes(entry.contentId as string)) mayShow.push(entry.contentId as string);
  }

  return {
    sceneDocument,
    sceneId: sceneDocument.sceneId,
    label: sceneDocument.label,
    cueIds: sceneDocument.cues.map((cue) => cue.cueId),
    mayShow,
    cueMayShow(cueId: string): readonly string[] {
      const cue = requireCueV1(index, cueId);
      if (cue.kind !== "show") return [];
      return [requireCueEntryV1(index, cue).contentId as string];
    },
    cueMotionId(cueId: string): string | null {
      return requireCueV1(index, cueId).motionId ?? null;
    },
    cueMutations(cueId: string, stage: SemanticStageStateV1): readonly StageMutationV1[] {
      const cue = requireCueV1(index, cueId);
      const entry = requireCueEntryV1(index, cue);
      return cueMutationPlanV1(cue, entry, currentContentIdV1(stage, entry));
    },
    openMutations(stage: SemanticStageStateV1): readonly StageMutationV1[] {
      return openMutationPlanV1(sceneDocument, index, stage, options);
    },
  };
}

/**
 * Materializes the Player-facing Scene accessors from a compiler-produced,
 * build-known runtime plan. The source was already admitted before compile;
 * this boundary deliberately trusts that typed representation and does not
 * parse the same document again.
 */
export function sceneFromAuthoringRuntimePlanV1(
  plan: AuthoringSceneRuntimePlanV1,
): AuthoringSceneRuntimeV1 {
  const scene = sceneFromAdmittedDocumentInternalV1(plan.sceneDocument, {
    reconcileZOrder: true,
    orderedLayerIds: plan.orderedLayerIds,
  });
  return {
    ...scene,
    reconcileOrderingMutations(stage: SemanticStageStateV1): readonly StageMutationV1[] {
      return authoringOrderingMutationPlanV1(plan, stage);
    },
  };
}

/**
 * Compiles one low-level scene Document (the raw `*.scene.json` import value
 * or an already-parsed `SceneDocumentV1`) into typed accessors. Public input
 * is admitted exactly once, then the package-only factory trusts the typed
 * data. Pure and deterministic; accessors never mutate the observed stage.
 */
export function sceneFromDocumentV1(value: unknown): SceneV1 {
  return sceneFromAdmittedDocumentInternalV1(parseSceneDocumentV1(value));
}

/**
 * The deterministic transition id derived from a cue id
 * (`cue.story.scene.name` → `transition.story.scene.name`); stable so
 * provenance, reduced-motion fallbacks, and tests can name it.
 */
export function sceneCueTransitionIdV1(cueId: string): string {
  const parsed = parseSceneCueIdV1(cueId, "/cueId");
  return `transition.${parsed.slice("cue.".length)}`;
}

/**
 * Edge-behavior overrides for one cue's derived motion transition. The
 * Document owns which motion plays on the cue's edge; the binding owns how
 * the edge behaves (input policy, interruption, reduced motion, readiness,
 * acknowledgment — for example a barrier-acknowledged blocking entrance).
 */
export interface SceneCueEdgeOptionsV1 {
  readonly inputPolicy?: StageTransitionInputPolicyV1;
  readonly interruption?: StageTransitionInterruptionV1;
  readonly reducedMotion?: StageTransitionReducedMotionV1;
  readonly readiness?: StageTransitionReadinessV1;
  readonly acknowledge?: boolean;
}

export interface SceneStageTransitionBindingsInputV1 {
  /**
   * The motion Documents the scene's cues reference: raw `*.motion.json`
   * import values or already-parsed `MotionDocumentV1`s. Every cue
   * `motionId` must be covered.
   */
  readonly motions: readonly unknown[];
  /** Overrides keyed by cueId; keys must name cues that bind a motion. */
  readonly edges?: Readonly<Record<string, SceneCueEdgeOptionsV1>>;
  /**
   * Dev-only observational diagnostics (never a resolution outcome): today
   * this reports a divergent multi-cue edge reached without presentation
   * edge context, which resolves as an instant cut.
   */
  reportFailure?(code: string, detail: string): void;
}

/**
 * The scene-derived transition-catalog fragment. Resolution is cue-first:
 * a change carrying presentation edge context resolves by the dispatching
 * cue's own declaration (motion, explicit cut, or null fall-through for a
 * bare cue). Without context, the exact-match edge-tuple fallback (enter
 * for show, exit for hide, matched on layer, entry key, and content) keeps
 * byte-identical pre-context behavior; divergent multi-cue edges resolve
 * only through context. Compose it in front of the Story catalog; null
 * returns fall through.
 */
export interface SceneStageTransitionBindingsV1 extends StageTransitionCatalogV1 {
  readonly definitions: readonly StageTransitionDefinitionV1[];
  resolveTransitionById(transitionId: string): StageTransitionDefinitionV1 | null;
}

/**
 * The effective edge behavior (with `motionStageTransitionV1` defaults
 * applied): cues sharing one edge keep a context-free fallback entry only
 * when both the motion and this behavior agree.
 */
function sceneEdgeBehaviorKeyV1(definition: StageTransitionDefinitionV1): string {
  return JSON.stringify({
    inputPolicy: definition.inputPolicy,
    interruption: definition.interruption,
    reducedMotion: definition.reducedMotion,
    readiness: definition.readiness,
    acknowledge: definition.acknowledge,
  });
}

/** The synthesized explicit-cut definition for one `cut: true` cue. */
function sceneCueCutTransitionV1(cueId: string): StageTransitionDefinitionV1 {
  return parseStageTransitionDefinitionV1({
    transitionId: sceneCueTransitionIdV1(cueId),
    kind: "cut",
    durationMs: 0,
    easing: "linear",
    inputPolicy: "target_active",
    interruption: "settle_and_retarget",
    reducedMotion: { kind: "settle" },
    readiness: { kind: "immediate" },
    acknowledge: false,
    slide: null,
  });
}

export function sceneStageTransitionBindingsV1(
  scene: SceneV1,
  input: SceneStageTransitionBindingsInputV1,
): SceneStageTransitionBindingsV1 {
  const motionsById = new Map<string, MotionDocumentV1>();
  for (const [index, motionValue] of input.motions.entries()) {
    const motionDocument = parseMotionDocumentV1(motionValue, `/motions/${String(index)}`);
    if (motionsById.has(motionDocument.motionId)) {
      return dataFailure(`/motions/${String(index)}/motionId`, "scene_motion_duplicate");
    }
    motionsById.set(motionDocument.motionId, motionDocument);
  }

  const index = indexSceneV1(scene.sceneDocument);
  const edges = input.edges ?? {};
  const reportFailure = input.reportFailure;
  for (const cueId of Object.keys(edges)) {
    const cue = index.cuesById.get(cueId);
    if (cue === undefined || cue.motionId === undefined) {
      return dataFailure(`/edges/${cueId}`, "scene_edge_options_unknown_cue");
    }
  }

  const definitions: StageTransitionDefinitionV1[] = [];
  const definitionsById = new Map<string, StageTransitionDefinitionV1>();
  // Cue-first resolution state: each cue's stage-edge key, plus its declared
  // presentation — a motion definition, an explicit cut, or null for a bare
  // cue (no scene-level presentation; resolution falls through to the outer
  // Story catalog instead of inheriting a sibling binding).
  const edgeKeyByCueId = new Map<string, string>();
  const presentationByCueId = new Map<string, StageTransitionDefinitionV1 | null>();
  // Context-free fallback accumulation per edge. Only edges whose bound
  // cues all agree (same motion, same effective options — exactly the set
  // prior admission accepted) keep a fallback entry, so behavior without
  // context stays byte-identical to the pre-cue-identity resolver.
  const fallbackByEdge = new Map<
    string,
    { definition: StageTransitionDefinitionV1; motionId: string } | "divergent"
  >();

  for (const cue of scene.sceneDocument.cues) {
    const entry = requireCueEntryV1(index, cue);
    const changeKind = cue.kind === "show" ? "enter" : "exit";
    const edgeKey = [
      changeKind,
      entry.layerId as string,
      `${entry.layerId}:${entry.tag}`,
      entry.contentId as string,
    ].join("|");
    edgeKeyByCueId.set(cue.cueId, edgeKey);

    if (cue.motionId === undefined && cue.cut === undefined) {
      presentationByCueId.set(cue.cueId, null);
      continue;
    }

    let definition: StageTransitionDefinitionV1;
    if (cue.motionId === undefined) {
      definition = sceneCueCutTransitionV1(cue.cueId);
    } else {
      const motionDocument = motionsById.get(cue.motionId);
      if (motionDocument === undefined) {
        return dataFailure(`/cues/${cue.cueId}/motionId`, "scene_cue_motion_missing");
      }
      definition = motionStageTransitionV1({
        transitionId: sceneCueTransitionIdV1(cue.cueId),
        motion: motionDocument,
        ...edges[cue.cueId],
      });
    }
    presentationByCueId.set(cue.cueId, definition);
    definitions.push(definition);
    definitionsById.set(definition.transitionId, definition);

    // Explicit cuts resolve only cue-first (proposal ruling #1): they never
    // enter the fallback, and their presence makes the edge divergent.
    const accumulated = fallbackByEdge.get(edgeKey);
    if (cue.cut !== undefined) {
      fallbackByEdge.set(edgeKey, "divergent");
    } else if (accumulated === undefined) {
      fallbackByEdge.set(edgeKey, { definition, motionId: cue.motionId as string });
    } else if (
      accumulated === "divergent" ||
      accumulated.motionId !== cue.motionId ||
      sceneEdgeBehaviorKeyV1(accumulated.definition) !== sceneEdgeBehaviorKeyV1(definition)
    ) {
      fallbackByEdge.set(edgeKey, "divergent");
    }
  }

  return {
    definitions,
    resolveTransition(change: StageTargetChangeV1): StageTransitionDefinitionV1 | null {
      const contentId = change.kind === "enter"
        ? change.next?.contentId
        : change.kind === "exit"
        ? change.previous?.contentId
        : undefined;
      if (contentId === undefined) return null;
      const edgeKey = [
        change.kind,
        change.layerId as string,
        change.entryKey,
        contentId as string,
      ].join("|");

      // Cue-first: a dispatch of this scene whose declared edge matches the
      // change resolves by that cue's own declaration (motion, explicit cut,
      // or null fall-through for a bare cue).
      const dispatches = change.dispatches;
      let ownOpen = false;
      if (dispatches !== undefined) {
        for (const dispatch of dispatches) {
          if (!("cueId" in dispatch)) {
            if (dispatch.sceneId === scene.sceneId) ownOpen = true;
            continue;
          }
          if (dispatch.sceneId !== scene.sceneId) continue;
          if (edgeKeyByCueId.get(dispatch.cueId) !== edgeKey) continue;
          return presentationByCueId.get(dispatch.cueId) ?? null;
        }
        // Dispatch context is complete for its commit: a change nothing of
        // THIS scene explains was not this scene's doing, so the edge-tuple
        // fallback must not claim it (that is exactly the cross-scene
        // silent override — for cue dispatches and foreign opens alike; the
        // un-fork evidence arrived as a foreign scene's open whose shared
        // enter edge another scene's entrance binding must not steal).
        // An open OF THIS SCENE genuinely produces its declared entries'
        // edges and keeps context-free fallback semantics (owner ruling #2).
        if (!ownOpen) return null;
      }

      const fallback = fallbackByEdge.get(edgeKey);
      if (fallback === undefined) return null;
      if (fallback === "divergent") {
        // Divergent multi-cue edges are resolvable only through context;
        // without it this scene declares nothing and resolution falls
        // through to the outer Story catalog.
        reportFailure?.(
          "scene.cue_binding_context_missing",
          `stage edge ${edgeKey} has divergent per-cue bindings and resolved without ` +
            "presentation edge context; falling through to the outer catalog",
        );
        return null;
      }
      return fallback.definition;
    },
    resolveTransitionById(transitionId: string): StageTransitionDefinitionV1 | null {
      return definitionsById.get(transitionId) ?? null;
    },
  };
}

export interface SceneAmbientCatalogInputV1 {
  /**
   * The motion Documents the entries' `ambient` bindings reference: raw
   * `*.motion.json` import values or already-parsed `MotionDocumentV1`s.
   * Every declared ambient `motionId` must be covered.
   */
  readonly motions: readonly unknown[];
}

/**
 * The scene-derived ambient catalog (ambient-loop-motion, accepted
 * 2026-08-15): exact-match presence bindings from a declared entry (layer,
 * entry key, content) to its looping motion. Same family as the derived
 * transition bindings — derived presentation data, resolved per settled
 * entry by the mounted stage; unmatched entries return null. Compose
 * multiple scenes' catalogs by trying each in order.
 */
export function sceneAmbientCatalogV1(
  scene: SceneV1,
  input: SceneAmbientCatalogInputV1,
): StageAmbientCatalogV1 {
  const motionsById = new Map<string, MotionDocumentV1>();
  for (const [index, motionValue] of input.motions.entries()) {
    const motionDocument = parseMotionDocumentV1(motionValue, `/motions/${String(index)}`);
    if (motionsById.has(motionDocument.motionId)) {
      return dataFailure(`/motions/${String(index)}/motionId`, "scene_motion_duplicate");
    }
    motionsById.set(motionDocument.motionId, motionDocument);
  }

  const bindingsByKey = new Map<string, StageAmbientBindingV1>();
  for (const [index, entry] of scene.sceneDocument.entries.entries()) {
    const ambient = entry.ambient;
    if (ambient === undefined) continue;
    const motionDocument = motionsById.get(ambient.motionId);
    if (motionDocument === undefined) {
      return dataFailure(
        `/entries/${String(index)}/ambient/motionId`,
        "scene_ambient_motion_missing",
      );
    }
    const key = [
      entry.layerId as string,
      `${entry.layerId}:${entry.tag}`,
      entry.contentId as string,
    ].join("|");
    bindingsByKey.set(
      key,
      {
        motion: motionDefinitionFromDocumentV1(motionDocument),
        phaseMs: ambient.phaseMs ?? 0,
      },
    );
  }

  return {
    resolveAmbient(
      layerId: StageLayerIdV1,
      entry: StageRenderEntryV1,
    ): StageAmbientBindingV1 | null {
      const key = [layerId as string, entry.key, entry.contentId as string].join("|");
      return bindingsByKey.get(key) ?? null;
    },
  };
}

export interface SceneSettledMutationsOptionsV1 {
  /** Replay cues up to and including this cue; omitted replays them all. */
  readonly throughCueId?: string;
}

/**
 * Replays the scene's cues in Document order against an empty stage and
 * returns the cumulative mutation batch — the detached-preview seed for
 * Studio canvases and preview cases. Pure; no Session and no reconciler.
 */
export function sceneSettledMutationsV1(
  scene: SceneV1,
  options: SceneSettledMutationsOptionsV1 = {},
): readonly StageMutationV1[] {
  const index = indexSceneV1(scene.sceneDocument);
  if (
    options.throughCueId !== undefined &&
    !index.cuesById.has(options.throughCueId)
  ) {
    return dataFailure(`/cues/${options.throughCueId}`, "scene_cue_unknown");
  }
  const presentContentByTag = new Map<string, string>();
  const collected: StageMutationV1[] = [];
  for (const cue of scene.sceneDocument.cues) {
    const entry = requireCueEntryV1(index, cue);
    const mutations = cueMutationPlanV1(
      cue,
      entry,
      presentContentByTag.get(entry.tag as string),
    );
    for (const mutation of mutations) {
      if (mutation.kind === "show" || mutation.kind === "replace") {
        presentContentByTag.set(entry.tag as string, entry.contentId as string);
      } else if (mutation.kind === "hide") {
        presentContentByTag.delete(entry.tag as string);
      }
      collected.push(mutation);
    }
    if (options.throughCueId !== undefined && cue.cueId === options.throughCueId) break;
  }
  return collected;
}
