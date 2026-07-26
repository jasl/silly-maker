// SPDX-License-Identifier: MIT
import type {
  SemanticStageStateV2,
  StageAppearanceV2,
  StageCameraV2,
  StageContentIdV2,
  StageEntryV2,
  StageLayerIdV2,
  StageLayerTransformV2,
  StagePlacementV2,
  StageTagV2,
} from "./semantic-stage.js";
import {
  defaultStagePlacementV2,
  parseSemanticStageStateV2,
  parseStageAppearanceV2,
  parseStageCameraV2,
  parseStageContentIdV2,
  parseStageLayerIdV2,
  parseStageLayerTransformV2,
  parseStagePlacementV2,
  parseStageTagV2,
} from "./semantic-stage.js";
import { PresentationDataError, readExactRecord } from "./presentation-data.js";

/**
 * The pure stage mutation vocabulary. A batch either produces one complete,
 * valid successor SemanticStageStateV2 or rejects with structured reasons
 * and leaves the input state untouched. Mutations carry no renderer
 * callbacks and cannot start animations or asset loads.
 */
export type StageMutationV2 =
  | {
      readonly kind: "show";
      readonly layerId: StageLayerIdV2;
      readonly tag: StageTagV2;
      readonly contentId: StageContentIdV2;
      readonly zOrder?: number;
      readonly placement?: StagePlacementV2;
      readonly appearance?: StageAppearanceV2;
    }
  | {
      readonly kind: "replace";
      readonly layerId: StageLayerIdV2;
      readonly tag: StageTagV2;
      readonly contentId: StageContentIdV2;
      readonly placement?: StagePlacementV2;
      readonly appearance?: StageAppearanceV2;
    }
  | { readonly kind: "hide"; readonly layerId: StageLayerIdV2; readonly tag: StageTagV2 }
  | { readonly kind: "clearLayer"; readonly layerId: StageLayerIdV2 }
  | { readonly kind: "clearStage" }
  | {
      readonly kind: "setPlacement";
      readonly layerId: StageLayerIdV2;
      readonly tag: StageTagV2;
      readonly placement: StagePlacementV2;
    }
  | {
      readonly kind: "setAppearance";
      readonly layerId: StageLayerIdV2;
      readonly tag: StageTagV2;
      readonly appearance: StageAppearanceV2;
    }
  | {
      readonly kind: "setLayerTransform";
      readonly layerId: StageLayerIdV2;
      readonly transform: StageLayerTransformV2;
    }
  | { readonly kind: "setCamera"; readonly camera: StageCameraV2 };

export type StageMutationRejectionCodeV2 =
  "stage.mutation_invalid" | "stage.layer_unknown" | "stage.tag_exists" | "stage.tag_unknown";

export interface StageMutationRejectionV2 {
  readonly code: StageMutationRejectionCodeV2;
  readonly mutationIndex: number;
  readonly pointer: string;
  readonly reason: string;
}

export type StageMutationBatchOutcomeV2 =
  | { readonly kind: "applied"; readonly state: SemanticStageStateV2 }
  | { readonly kind: "rejected"; readonly rejection: StageMutationRejectionV2 };

const mutationKeysV2: Readonly<Record<StageMutationV2["kind"], readonly string[]>> = Object.freeze({
  show: ["kind", "layerId", "tag", "contentId", "zOrder", "placement", "appearance"],
  replace: ["kind", "layerId", "tag", "contentId", "placement", "appearance"],
  hide: ["kind", "layerId", "tag"],
  clearLayer: ["kind", "layerId"],
  clearStage: ["kind"],
  setPlacement: ["kind", "layerId", "tag", "placement"],
  setAppearance: ["kind", "layerId", "tag", "appearance"],
  setLayerTransform: ["kind", "layerId", "transform"],
  setCamera: ["kind", "camera"],
});

function readMutationRecordV2(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new PresentationDataError(path, "object_expected");
  }
  const kind = Reflect.get(value, "kind") as StageMutationV2["kind"];
  const expected = Object.hasOwn(mutationKeysV2, kind) ? mutationKeysV2[kind] : undefined;
  if (expected === undefined) {
    throw new PresentationDataError(`${path}/kind`, "stage_mutation_kind_unknown");
  }
  const optionalKeys =
    kind === "show"
      ? ["zOrder", "placement", "appearance"]
      : kind === "replace"
        ? ["placement", "appearance"]
        : [];
  const presentKeys = expected.filter(
    (key) => !optionalKeys.includes(key) || Reflect.get(value, key) !== undefined,
  );
  return readExactRecord(value, presentKeys, path);
}

function parseOptionalZOrderV2(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > 1_000_000) {
    throw new PresentationDataError(path, "z_order_invalid");
  }
  return value;
}

/** Parses one plain-data stage mutation; throws PresentationDataError. */
export function parseStageMutationV2(value: unknown, path = "/mutation"): StageMutationV2 {
  const record = readMutationRecordV2(value, path);
  const kind = record.kind as StageMutationV2["kind"];
  switch (kind) {
    case "show": {
      const zOrder = parseOptionalZOrderV2(record.zOrder, `${path}/zOrder`);
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV2(record.layerId, `${path}/layerId`),
        tag: parseStageTagV2(record.tag, `${path}/tag`),
        contentId: parseStageContentIdV2(record.contentId, `${path}/contentId`),
        ...(zOrder === undefined ? {} : { zOrder }),
        ...(record.placement === undefined
          ? {}
          : { placement: parseStagePlacementV2(record.placement, `${path}/placement`) }),
        ...(record.appearance === undefined
          ? {}
          : { appearance: parseStageAppearanceV2(record.appearance, `${path}/appearance`) }),
      });
    }
    case "replace":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV2(record.layerId, `${path}/layerId`),
        tag: parseStageTagV2(record.tag, `${path}/tag`),
        contentId: parseStageContentIdV2(record.contentId, `${path}/contentId`),
        ...(record.placement === undefined
          ? {}
          : { placement: parseStagePlacementV2(record.placement, `${path}/placement`) }),
        ...(record.appearance === undefined
          ? {}
          : { appearance: parseStageAppearanceV2(record.appearance, `${path}/appearance`) }),
      });
    case "hide":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV2(record.layerId, `${path}/layerId`),
        tag: parseStageTagV2(record.tag, `${path}/tag`),
      });
    case "clearLayer":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV2(record.layerId, `${path}/layerId`),
      });
    case "clearStage":
      return Object.freeze({ kind });
    case "setPlacement":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV2(record.layerId, `${path}/layerId`),
        tag: parseStageTagV2(record.tag, `${path}/tag`),
        placement: parseStagePlacementV2(record.placement, `${path}/placement`),
      });
    case "setAppearance":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV2(record.layerId, `${path}/layerId`),
        tag: parseStageTagV2(record.tag, `${path}/tag`),
        appearance: parseStageAppearanceV2(record.appearance, `${path}/appearance`),
      });
    case "setLayerTransform":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV2(record.layerId, `${path}/layerId`),
        transform: parseStageLayerTransformV2(record.transform, `${path}/transform`),
      });
    case "setCamera":
      return Object.freeze({
        kind,
        camera: parseStageCameraV2(record.camera, `${path}/camera`),
      });
    default: {
      const exhaustive: never = kind;
      throw new PresentationDataError(`${path}/kind`, String(exhaustive));
    }
  }
}

interface MutableLayerV2 {
  readonly layerId: StageLayerIdV2;
  transform: StageLayerTransformV2;
  entries: StageEntryV2[];
}

interface MutableStageV2 {
  layers: Map<string, MutableLayerV2>;
  layerOrder: readonly StageLayerIdV2[];
  camera: StageCameraV2;
}

class StageMutationRejectionErrorV2 extends Error {
  readonly code: StageMutationRejectionCodeV2;
  readonly pointer: string;

  constructor(code: StageMutationRejectionCodeV2, pointer: string, reason: string) {
    super(reason);
    this.name = "StageMutationRejectionErrorV2";
    this.code = code;
    this.pointer = pointer;
  }
}

function requireLayerV2(
  stage: MutableStageV2,
  layerId: StageLayerIdV2,
  pointer: string,
): MutableLayerV2 {
  const layer = stage.layers.get(layerId as string);
  if (layer === undefined) {
    throw new StageMutationRejectionErrorV2(
      "stage.layer_unknown",
      pointer,
      `layer "${layerId}" is not declared on this stage`,
    );
  }
  return layer;
}

function entryIndexV2(layer: MutableLayerV2, tag: StageTagV2): number {
  return layer.entries.findIndex((entry) => entry.tag === tag);
}

/** Inserts keeping non-decreasing z-order; equal z-orders keep insertion order. */
function insertEntryV2(layer: MutableLayerV2, entry: StageEntryV2): void {
  let index = layer.entries.length;
  while (index > 0) {
    const previous = layer.entries[index - 1];
    if (previous === undefined || previous.zOrder <= entry.zOrder) break;
    index -= 1;
  }
  layer.entries.splice(index, 0, entry);
}

function applyMutationV2(stage: MutableStageV2, mutation: StageMutationV2, pointer: string): void {
  switch (mutation.kind) {
    case "show": {
      const layer = requireLayerV2(stage, mutation.layerId, pointer);
      if (entryIndexV2(layer, mutation.tag) >= 0) {
        throw new StageMutationRejectionErrorV2(
          "stage.tag_exists",
          pointer,
          `tag "${mutation.tag}" already exists on layer "${mutation.layerId}"; use replace`,
        );
      }
      insertEntryV2(
        layer,
        Object.freeze({
          tag: mutation.tag,
          contentId: mutation.contentId,
          zOrder: mutation.zOrder ?? 0,
          placement: mutation.placement ?? defaultStagePlacementV2,
          appearance: mutation.appearance ?? Object.freeze({}),
        }),
      );
      return;
    }
    case "replace": {
      const layer = requireLayerV2(stage, mutation.layerId, pointer);
      const index = entryIndexV2(layer, mutation.tag);
      const current = index >= 0 ? layer.entries[index] : undefined;
      if (current === undefined) {
        throw new StageMutationRejectionErrorV2(
          "stage.tag_unknown",
          pointer,
          `tag "${mutation.tag}" does not exist on layer "${mutation.layerId}"; use show`,
        );
      }
      // Replace keeps the entry's identity, order position, and — unless
      // explicitly overridden — its placement and appearance continuity.
      layer.entries[index] = Object.freeze({
        tag: current.tag,
        contentId: mutation.contentId,
        zOrder: current.zOrder,
        placement: mutation.placement ?? current.placement,
        appearance: mutation.appearance ?? current.appearance,
      });
      return;
    }
    case "hide": {
      const layer = requireLayerV2(stage, mutation.layerId, pointer);
      const index = entryIndexV2(layer, mutation.tag);
      if (index < 0) {
        throw new StageMutationRejectionErrorV2(
          "stage.tag_unknown",
          pointer,
          `tag "${mutation.tag}" does not exist on layer "${mutation.layerId}"`,
        );
      }
      layer.entries.splice(index, 1);
      return;
    }
    case "clearLayer": {
      const layer = requireLayerV2(stage, mutation.layerId, pointer);
      layer.entries = [];
      return;
    }
    case "clearStage": {
      for (const layer of stage.layers.values()) layer.entries = [];
      return;
    }
    case "setPlacement": {
      const layer = requireLayerV2(stage, mutation.layerId, pointer);
      const index = entryIndexV2(layer, mutation.tag);
      const current = index >= 0 ? layer.entries[index] : undefined;
      if (current === undefined) {
        throw new StageMutationRejectionErrorV2(
          "stage.tag_unknown",
          pointer,
          `tag "${mutation.tag}" does not exist on layer "${mutation.layerId}"`,
        );
      }
      layer.entries[index] = Object.freeze({ ...current, placement: mutation.placement });
      return;
    }
    case "setAppearance": {
      const layer = requireLayerV2(stage, mutation.layerId, pointer);
      const index = entryIndexV2(layer, mutation.tag);
      const current = index >= 0 ? layer.entries[index] : undefined;
      if (current === undefined) {
        throw new StageMutationRejectionErrorV2(
          "stage.tag_unknown",
          pointer,
          `tag "${mutation.tag}" does not exist on layer "${mutation.layerId}"`,
        );
      }
      layer.entries[index] = Object.freeze({ ...current, appearance: mutation.appearance });
      return;
    }
    case "setLayerTransform": {
      const layer = requireLayerV2(stage, mutation.layerId, pointer);
      layer.transform = mutation.transform;
      return;
    }
    case "setCamera": {
      stage.camera = mutation.camera;
      return;
    }
    default: {
      const exhaustive: never = mutation;
      throw new StageMutationRejectionErrorV2(
        "stage.mutation_invalid",
        pointer,
        String(exhaustive),
      );
    }
  }
}

/**
 * Applies a mutation batch atomically and purely: the input state is never
 * modified, an empty batch returns it unchanged, and any invalid mutation
 * rejects the whole batch with the failing index. The successor state is
 * re-validated through the canonical parser before it is published.
 */
export function reduceStageMutationsV2(
  state: SemanticStageStateV2,
  mutations: readonly unknown[],
): StageMutationBatchOutcomeV2 {
  if (mutations.length === 0) return Object.freeze({ kind: "applied" as const, state });

  const stage: MutableStageV2 = {
    layers: new Map(
      state.layers.map((layer) => [
        layer.layerId as string,
        { layerId: layer.layerId, transform: layer.transform, entries: [...layer.entries] },
      ]),
    ),
    layerOrder: state.layers.map((layer) => layer.layerId),
    camera: state.camera,
  };

  for (const [index, mutationValue] of mutations.entries()) {
    const pointer = `/mutations/${String(index)}`;
    let mutation: StageMutationV2;
    try {
      mutation = parseStageMutationV2(mutationValue, pointer);
    } catch (error) {
      return Object.freeze({
        kind: "rejected" as const,
        rejection: Object.freeze({
          code: "stage.mutation_invalid" as const,
          mutationIndex: index,
          pointer: error instanceof PresentationDataError ? error.path : pointer,
          reason: error instanceof PresentationDataError ? error.reason : "mutation_invalid",
        }),
      });
    }
    try {
      applyMutationV2(stage, mutation, pointer);
    } catch (error) {
      if (error instanceof StageMutationRejectionErrorV2) {
        return Object.freeze({
          kind: "rejected" as const,
          rejection: Object.freeze({
            code: error.code,
            mutationIndex: index,
            pointer: error.pointer,
            reason: error.message,
          }),
        });
      }
      throw error;
    }
  }

  const successor = parseSemanticStageStateV2({
    contractRevision: state.contractRevision,
    stageId: state.stageId,
    layers: stage.layerOrder.map((layerId) => {
      const layer = stage.layers.get(layerId as string);
      if (layer === undefined) throw new TypeError("stage layer disappeared during reduction");
      return {
        layerId: layer.layerId,
        transform: layer.transform,
        entries: layer.entries,
      };
    }),
    camera: stage.camera,
  });
  return Object.freeze({ kind: "applied" as const, state: successor });
}
