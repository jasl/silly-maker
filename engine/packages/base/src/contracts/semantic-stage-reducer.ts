// SPDX-License-Identifier: MIT
import type {
  SemanticStageStateV1,
  StageAppearanceV1,
  StageCameraV1,
  StageContentIdV1,
  StageEntryV1,
  StageLayerIdV1,
  StageLayerTransformV1,
  StagePlacementV1,
  StageTagV1,
} from "./semantic-stage.ts";
import {
  defaultStagePlacementV1,
  parseSemanticStageStateV1,
  parseStageAppearanceV1,
  parseStageCameraV1,
  parseStageContentIdV1,
  parseStageLayerIdV1,
  parseStageLayerTransformV1,
  parseStagePlacementV1,
  parseStageTagV1,
} from "./semantic-stage.ts";
import { PresentationDataError, readArray, readExactRecord } from "./presentation-data.ts";

/**
 * The pure stage mutation vocabulary. A batch either produces one complete,
 * valid successor SemanticStageStateV1 or rejects with structured reasons
 * and leaves the input state untouched. Mutations carry no renderer
 * callbacks and cannot start animations or asset loads.
 */
export type StageMutationV1 =
  | {
    readonly kind: "show";
    readonly layerId: StageLayerIdV1;
    readonly tag: StageTagV1;
    readonly contentId: StageContentIdV1;
    readonly zOrder?: number;
    readonly placement?: StagePlacementV1;
    readonly appearance?: StageAppearanceV1;
  }
  | {
    readonly kind: "replace";
    readonly layerId: StageLayerIdV1;
    readonly tag: StageTagV1;
    readonly contentId: StageContentIdV1;
    readonly placement?: StagePlacementV1;
    readonly appearance?: StageAppearanceV1;
  }
  | { readonly kind: "hide"; readonly layerId: StageLayerIdV1; readonly tag: StageTagV1 }
  | { readonly kind: "clearLayer"; readonly layerId: StageLayerIdV1 }
  | { readonly kind: "clearStage" }
  | {
    readonly kind: "setPlacement";
    readonly layerId: StageLayerIdV1;
    readonly tag: StageTagV1;
    readonly placement: StagePlacementV1;
  }
  | {
    readonly kind: "setAppearance";
    readonly layerId: StageLayerIdV1;
    readonly tag: StageTagV1;
    readonly appearance: StageAppearanceV1;
  }
  | {
    readonly kind: "setZOrder";
    readonly layerId: StageLayerIdV1;
    readonly tag: StageTagV1;
    readonly zOrder: number;
  }
  | { readonly kind: "setLayerOrder"; readonly layerIds: readonly StageLayerIdV1[] }
  | {
    readonly kind: "setLayerTransform";
    readonly layerId: StageLayerIdV1;
    readonly transform: StageLayerTransformV1;
  }
  | { readonly kind: "setCamera"; readonly camera: StageCameraV1 };

export type StageMutationRejectionCodeV1 =
  | "stage.mutation_invalid"
  | "stage.layer_unknown"
  | "stage.layer_order_invalid"
  | "stage.tag_exists"
  | "stage.tag_unknown";

export interface StageMutationRejectionV1 {
  readonly code: StageMutationRejectionCodeV1;
  readonly mutationIndex: number;
  readonly pointer: string;
  readonly reason: string;
}

export type StageMutationBatchOutcomeV1 =
  | { readonly kind: "applied"; readonly state: SemanticStageStateV1 }
  | { readonly kind: "rejected"; readonly rejection: StageMutationRejectionV1 };

const mutationKeysV1: Readonly<Record<StageMutationV1["kind"], readonly string[]>> = Object.freeze({
  show: ["kind", "layerId", "tag", "contentId", "zOrder", "placement", "appearance"],
  replace: ["kind", "layerId", "tag", "contentId", "placement", "appearance"],
  hide: ["kind", "layerId", "tag"],
  clearLayer: ["kind", "layerId"],
  clearStage: ["kind"],
  setPlacement: ["kind", "layerId", "tag", "placement"],
  setAppearance: ["kind", "layerId", "tag", "appearance"],
  setZOrder: ["kind", "layerId", "tag", "zOrder"],
  setLayerOrder: ["kind", "layerIds"],
  setLayerTransform: ["kind", "layerId", "transform"],
  setCamera: ["kind", "camera"],
});

function readMutationRecordV1(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new PresentationDataError(path, "object_expected");
  }
  const kind = Reflect.get(value, "kind") as StageMutationV1["kind"];
  const expected = Object.hasOwn(mutationKeysV1, kind) ? mutationKeysV1[kind] : undefined;
  if (expected === undefined) {
    throw new PresentationDataError(`${path}/kind`, "stage_mutation_kind_unknown");
  }
  const optionalKeys = kind === "show"
    ? ["zOrder", "placement", "appearance"]
    : kind === "replace"
    ? ["placement", "appearance"]
    : [];
  const presentKeys = expected.filter(
    (key) => !optionalKeys.includes(key) || Reflect.get(value, key) !== undefined,
  );
  return readExactRecord(value, presentKeys, path);
}

function parseZOrderV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > 1_000_000) {
    throw new PresentationDataError(path, "z_order_invalid");
  }
  return value;
}

function parseOptionalZOrderV1(value: unknown, path: string): number | undefined {
  return value === undefined ? undefined : parseZOrderV1(value, path);
}

/** Parses one plain-data stage mutation; throws PresentationDataError. */
export function parseStageMutationV1(value: unknown, path = "/mutation"): StageMutationV1 {
  const record = readMutationRecordV1(value, path);
  const kind = record.kind as StageMutationV1["kind"];
  switch (kind) {
    case "show": {
      const zOrder = parseOptionalZOrderV1(record.zOrder, `${path}/zOrder`);
      return Object.freeze({
        kind,
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
    case "replace":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV1(record.layerId, `${path}/layerId`),
        tag: parseStageTagV1(record.tag, `${path}/tag`),
        contentId: parseStageContentIdV1(record.contentId, `${path}/contentId`),
        ...(record.placement === undefined
          ? {}
          : { placement: parseStagePlacementV1(record.placement, `${path}/placement`) }),
        ...(record.appearance === undefined
          ? {}
          : { appearance: parseStageAppearanceV1(record.appearance, `${path}/appearance`) }),
      });
    case "hide":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV1(record.layerId, `${path}/layerId`),
        tag: parseStageTagV1(record.tag, `${path}/tag`),
      });
    case "clearLayer":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV1(record.layerId, `${path}/layerId`),
      });
    case "clearStage":
      return Object.freeze({ kind });
    case "setPlacement":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV1(record.layerId, `${path}/layerId`),
        tag: parseStageTagV1(record.tag, `${path}/tag`),
        placement: parseStagePlacementV1(record.placement, `${path}/placement`),
      });
    case "setAppearance":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV1(record.layerId, `${path}/layerId`),
        tag: parseStageTagV1(record.tag, `${path}/tag`),
        appearance: parseStageAppearanceV1(record.appearance, `${path}/appearance`),
      });
    case "setZOrder":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV1(record.layerId, `${path}/layerId`),
        tag: parseStageTagV1(record.tag, `${path}/tag`),
        zOrder: parseZOrderV1(record.zOrder, `${path}/zOrder`),
      });
    case "setLayerOrder":
      return Object.freeze({
        kind,
        layerIds: Object.freeze(
          readArray(record.layerIds, `${path}/layerIds`).map((layerId, index) =>
            parseStageLayerIdV1(layerId, `${path}/layerIds/${String(index)}`)
          ),
        ),
      });
    case "setLayerTransform":
      return Object.freeze({
        kind,
        layerId: parseStageLayerIdV1(record.layerId, `${path}/layerId`),
        transform: parseStageLayerTransformV1(record.transform, `${path}/transform`),
      });
    case "setCamera":
      return Object.freeze({
        kind,
        camera: parseStageCameraV1(record.camera, `${path}/camera`),
      });
    default: {
      const exhaustive: never = kind;
      throw new PresentationDataError(`${path}/kind`, String(exhaustive));
    }
  }
}

interface MutableLayerV1 {
  readonly layerId: StageLayerIdV1;
  transform: StageLayerTransformV1;
  entries: StageEntryV1[];
}

interface MutableStageV1 {
  layers: Map<string, MutableLayerV1>;
  layerOrder: readonly StageLayerIdV1[];
  camera: StageCameraV1;
}

class StageMutationRejectionErrorV1 extends Error {
  readonly code: StageMutationRejectionCodeV1;
  readonly pointer: string;

  constructor(code: StageMutationRejectionCodeV1, pointer: string, reason: string) {
    super(reason);
    this.name = "StageMutationRejectionErrorV1";
    this.code = code;
    this.pointer = pointer;
  }
}

function requireLayerV1(
  stage: MutableStageV1,
  layerId: StageLayerIdV1,
  pointer: string,
): MutableLayerV1 {
  const layer = stage.layers.get(layerId as string);
  if (layer === undefined) {
    throw new StageMutationRejectionErrorV1(
      "stage.layer_unknown",
      pointer,
      `layer "${layerId}" is not declared on this stage`,
    );
  }
  return layer;
}

function entryIndexV1(layer: MutableLayerV1, tag: StageTagV1): number {
  return layer.entries.findIndex((entry) => entry.tag === tag);
}

/** Inserts keeping non-decreasing z-order; equal z-orders keep insertion order. */
function insertEntryV1(layer: MutableLayerV1, entry: StageEntryV1): void {
  let index = layer.entries.length;
  while (index > 0) {
    const previous = layer.entries[index - 1];
    if (previous === undefined || previous.zOrder <= entry.zOrder) break;
    index -= 1;
  }
  layer.entries.splice(index, 0, entry);
}

function applyMutationV1(stage: MutableStageV1, mutation: StageMutationV1, pointer: string): void {
  switch (mutation.kind) {
    case "show": {
      const layer = requireLayerV1(stage, mutation.layerId, pointer);
      if (entryIndexV1(layer, mutation.tag) >= 0) {
        throw new StageMutationRejectionErrorV1(
          "stage.tag_exists",
          pointer,
          `tag "${mutation.tag}" already exists on layer "${mutation.layerId}"; use replace`,
        );
      }
      insertEntryV1(
        layer,
        Object.freeze({
          tag: mutation.tag,
          contentId: mutation.contentId,
          zOrder: mutation.zOrder ?? 0,
          placement: mutation.placement ?? defaultStagePlacementV1,
          appearance: mutation.appearance ?? Object.freeze({}),
        }),
      );
      return;
    }
    case "replace": {
      const layer = requireLayerV1(stage, mutation.layerId, pointer);
      const index = entryIndexV1(layer, mutation.tag);
      const current = index >= 0 ? layer.entries[index] : undefined;
      if (current === undefined) {
        throw new StageMutationRejectionErrorV1(
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
      const layer = requireLayerV1(stage, mutation.layerId, pointer);
      const index = entryIndexV1(layer, mutation.tag);
      if (index < 0) {
        throw new StageMutationRejectionErrorV1(
          "stage.tag_unknown",
          pointer,
          `tag "${mutation.tag}" does not exist on layer "${mutation.layerId}"`,
        );
      }
      layer.entries.splice(index, 1);
      return;
    }
    case "clearLayer": {
      const layer = requireLayerV1(stage, mutation.layerId, pointer);
      layer.entries = [];
      return;
    }
    case "clearStage": {
      for (const layer of stage.layers.values()) layer.entries = [];
      return;
    }
    case "setPlacement": {
      const layer = requireLayerV1(stage, mutation.layerId, pointer);
      const index = entryIndexV1(layer, mutation.tag);
      const current = index >= 0 ? layer.entries[index] : undefined;
      if (current === undefined) {
        throw new StageMutationRejectionErrorV1(
          "stage.tag_unknown",
          pointer,
          `tag "${mutation.tag}" does not exist on layer "${mutation.layerId}"`,
        );
      }
      layer.entries[index] = Object.freeze({ ...current, placement: mutation.placement });
      return;
    }
    case "setAppearance": {
      const layer = requireLayerV1(stage, mutation.layerId, pointer);
      const index = entryIndexV1(layer, mutation.tag);
      const current = index >= 0 ? layer.entries[index] : undefined;
      if (current === undefined) {
        throw new StageMutationRejectionErrorV1(
          "stage.tag_unknown",
          pointer,
          `tag "${mutation.tag}" does not exist on layer "${mutation.layerId}"`,
        );
      }
      layer.entries[index] = Object.freeze({ ...current, appearance: mutation.appearance });
      return;
    }
    case "setZOrder": {
      const layer = requireLayerV1(stage, mutation.layerId, pointer);
      const index = entryIndexV1(layer, mutation.tag);
      const current = index >= 0 ? layer.entries[index] : undefined;
      if (current === undefined) {
        throw new StageMutationRejectionErrorV1(
          "stage.tag_unknown",
          pointer,
          `tag "${mutation.tag}" does not exist on layer "${mutation.layerId}"`,
        );
      }
      if (current.zOrder === mutation.zOrder) return;
      layer.entries.splice(index, 1);
      insertEntryV1(layer, Object.freeze({ ...current, zOrder: mutation.zOrder }));
      return;
    }
    case "setLayerOrder": {
      const uniqueLayerIds = new Set(mutation.layerIds);
      if (
        mutation.layerIds.length !== stage.layers.size ||
        uniqueLayerIds.size !== mutation.layerIds.length ||
        mutation.layerIds.some((layerId) => !stage.layers.has(layerId as string))
      ) {
        throw new StageMutationRejectionErrorV1(
          "stage.layer_order_invalid",
          `${pointer}/layerIds`,
          "layerIds must be an exact permutation of the current stage layers",
        );
      }
      stage.layerOrder = mutation.layerIds;
      return;
    }
    case "setLayerTransform": {
      const layer = requireLayerV1(stage, mutation.layerId, pointer);
      layer.transform = mutation.transform;
      return;
    }
    case "setCamera": {
      stage.camera = mutation.camera;
      return;
    }
    default: {
      const exhaustive: never = mutation;
      throw new StageMutationRejectionErrorV1(
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
export function reduceStageMutationsV1(
  state: SemanticStageStateV1,
  mutations: readonly unknown[],
): StageMutationBatchOutcomeV1 {
  if (mutations.length === 0) return Object.freeze({ kind: "applied" as const, state });

  const stage: MutableStageV1 = {
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
    let mutation: StageMutationV1;
    try {
      mutation = parseStageMutationV1(mutationValue, pointer);
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
      applyMutationV1(stage, mutation, pointer);
    } catch (error) {
      if (error instanceof StageMutationRejectionErrorV1) {
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

  const successor = parseSemanticStageStateV1({
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
