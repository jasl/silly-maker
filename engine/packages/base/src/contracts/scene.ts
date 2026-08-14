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
import { motionStageTransitionV1 } from "./stage-transition.ts";
import type { MotionDocumentV1 } from "./motion.ts";
import { parseMotionDocumentV1 } from "./motion.ts";

/**
 * Scene authoring contracts: a Scene is plain, versioned, validated
 * authoring data that a Story keeps as a standalone Document (typically a
 * `*.scene.json` file under `src/scenes/<scene>/`). The Document is the
 * single authoring authority for a scene's visual composition — entries
 * (stable `<layerId, tag>` identity, content, placement, appearance) and
 * named cues that show/hide those entries, each optionally binding an
 * entrance/exit motion asset to exactly that cue's stage edge.
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

export interface SceneEntryV1 {
  readonly layerId: StageLayerIdV1;
  readonly tag: StageTagV1;
  readonly contentId: StageContentIdV1;
  readonly zOrder?: number;
  readonly placement?: StagePlacementV1;
  readonly appearance?: StageAppearanceV1;
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
const sceneMaxEntriesV1 = 64;
const sceneMaxCuesV1 = 128;
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

function parseSceneMotionIdV1(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length > sceneMaxIdLengthV1 ||
    !sceneMotionIdPatternV1.test(value)
  ) {
    return dataFailure(path, "scene_cue_motion_id_invalid");
  }
  return value;
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
  return Object.freeze({
    width: parseSide(record.width, `${path}/width`),
    height: parseSide(record.height, `${path}/height`),
  });
}

function parseSceneEntryV1(value: unknown, path: string): SceneEntryV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "scene_entry_invalid");
  }
  const baseKeys = ["layerId", "tag", "contentId"];
  const optionalKeys = ["zOrder", "placement", "appearance"].filter(
    (key) => Reflect.get(value, key) !== undefined,
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
  return Object.freeze({
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
  });
}

function parseSceneCueV1(value: unknown, path: string): SceneCueV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "scene_cue_invalid");
  }
  const hasMotion = Reflect.get(value, "motionId") !== undefined;
  const record = readExactRecord(
    value,
    hasMotion ? ["cueId", "kind", "tag", "motionId"] : ["cueId", "kind", "tag"],
    path,
  );
  if (record.kind !== "show" && record.kind !== "hide") {
    return dataFailure(`${path}/kind`, "scene_cue_kind_invalid");
  }
  return Object.freeze({
    cueId: parseSceneCueIdV1(record.cueId, `${path}/cueId`),
    kind: record.kind,
    tag: parseStageTagV1(record.tag, `${path}/tag`),
    ...(hasMotion ? { motionId: parseSceneMotionIdV1(record.motionId, `${path}/motionId`) } : {}),
  });
}

/**
 * Parses a `sillymaker.scene` Document (for example the value of a
 * `*.scene.json` import). Admission is strict: exact keys, the existing
 * stage integer bounds, unique tags and cue ids, cue tags resolving to a
 * declared entry, and unambiguous cue→motion bindings — one structured
 * path on every failure.
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
  if (rawEntries.length > sceneMaxEntriesV1) {
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
  if (rawCues.length > sceneMaxCuesV1) {
    return dataFailure(`${path}/cues`, "scene_cues_count_invalid");
  }
  const cues: SceneCueV1[] = [];
  const seenCueIds = new Set<string>();
  const boundMotionByEdge = new Map<string, string>();
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
    if (cue.motionId !== undefined) {
      // Two cues producing the same stage edge must agree on the motion;
      // otherwise resolution would be non-deterministic. Order-dependent
      // selection is an explicitly deferred runtime extension.
      const edgeKey = `${cue.kind}|${cue.tag}`;
      const bound = boundMotionByEdge.get(edgeKey);
      if (bound !== undefined && bound !== cue.motionId) {
        return dataFailure(`${cuePath}/motionId`, "scene_cue_binding_ambiguous");
      }
      boundMotionByEdge.set(edgeKey, cue.motionId);
    }
    cues.push(cue);
  }

  return Object.freeze({
    format: sceneDocumentFormatV1,
    version: sceneDocumentVersionV1,
    sceneId: parseSceneIdV1(record.sceneId, `${path}/sceneId`),
    label: record.label,
    canvas: parseSceneCanvasV1(record.canvas, `${path}/canvas`),
    entries: Object.freeze(entries),
    cues: Object.freeze(cues),
  });
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
  return Object.freeze(
    plans.map((plan, planIndex) =>
      parseStageMutationV1(plan, `/cues/${cue.cueId}/mutations/${String(planIndex)}`)
    ),
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

/** The open plan: strangers on declared layers hide, declared entries settle. */
function openMutationPlanV1(
  sceneDocument: SceneDocumentV1,
  index: SceneIndexV1,
  stage: SemanticStageStateV1,
): readonly StageMutationV1[] {
  const plans: unknown[] = [];
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
  }

  return Object.freeze(
    plans.map((plan, planIndex) =>
      parseStageMutationV1(plan, `/open/mutations/${String(planIndex)}`)
    ),
  );
}

/**
 * Compiles one scene Document (the raw `*.scene.json` import value or an
 * already-parsed `SceneDocumentV1`) into typed accessors. Pure and
 * deterministic; the accessors never mutate the observed stage.
 */
export function sceneFromDocumentV1(value: unknown): SceneV1 {
  const sceneDocument = parseSceneDocumentV1(value);
  const index = indexSceneV1(sceneDocument);

  const mayShow: string[] = [];
  for (const cue of sceneDocument.cues) {
    if (cue.kind !== "show") continue;
    const entry = requireCueEntryV1(index, cue);
    if (!mayShow.includes(entry.contentId as string)) mayShow.push(entry.contentId as string);
  }

  return Object.freeze({
    sceneDocument,
    sceneId: sceneDocument.sceneId,
    label: sceneDocument.label,
    cueIds: Object.freeze(sceneDocument.cues.map((cue) => cue.cueId)),
    mayShow: Object.freeze(mayShow),
    cueMayShow(cueId: string): readonly string[] {
      const cue = requireCueV1(index, cueId);
      if (cue.kind !== "show") return Object.freeze([]);
      return Object.freeze([requireCueEntryV1(index, cue).contentId as string]);
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
      return openMutationPlanV1(sceneDocument, index, stage);
    },
  });
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
}

/**
 * The scene-derived transition-catalog fragment: exact-match bindings from
 * a cue's stage edge (enter for show, exit for hide, matched on layer,
 * entry key, and content) to that cue's motion. Compose it in front of the
 * Story catalog; unbound edges return null and fall through.
 */
export interface SceneStageTransitionBindingsV1 extends StageTransitionCatalogV1 {
  readonly definitions: readonly StageTransitionDefinitionV1[];
  resolveTransitionById(transitionId: string): StageTransitionDefinitionV1 | null;
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
  for (const cueId of Object.keys(edges)) {
    const cue = index.cuesById.get(cueId);
    if (cue === undefined || cue.motionId === undefined) {
      return dataFailure(`/edges/${cueId}`, "scene_edge_options_unknown_cue");
    }
  }
  const definitions: StageTransitionDefinitionV1[] = [];
  const definitionsById = new Map<string, StageTransitionDefinitionV1>();
  const bindingsByEdge = new Map<string, StageTransitionDefinitionV1>();
  for (const cue of scene.sceneDocument.cues) {
    if (cue.motionId === undefined) continue;
    const entry = requireCueEntryV1(index, cue);
    const motionDocument = motionsById.get(cue.motionId);
    if (motionDocument === undefined) {
      return dataFailure(`/cues/${cue.cueId}/motionId`, "scene_cue_motion_missing");
    }
    const changeKind = cue.kind === "show" ? "enter" : "exit";
    const edgeKey = [
      changeKind,
      entry.layerId as string,
      `${entry.layerId}:${entry.tag}`,
      entry.contentId as string,
    ].join("|");
    // Document admission already rejected differing motions on one edge;
    // an identical duplicate cue simply reuses the first binding.
    if (bindingsByEdge.has(edgeKey)) continue;
    const definition = motionStageTransitionV1({
      transitionId: sceneCueTransitionIdV1(cue.cueId),
      motion: motionDocument,
      ...edges[cue.cueId],
    });
    definitions.push(definition);
    definitionsById.set(definition.transitionId, definition);
    bindingsByEdge.set(edgeKey, definition);
  }

  return Object.freeze({
    definitions: Object.freeze(definitions),
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
      return bindingsByEdge.get(edgeKey) ?? null;
    },
    resolveTransitionById(transitionId: string): StageTransitionDefinitionV1 | null {
      return definitionsById.get(transitionId) ?? null;
    },
  });
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
  return Object.freeze(collected);
}
