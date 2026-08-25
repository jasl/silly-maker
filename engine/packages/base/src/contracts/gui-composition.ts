// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "./canonical-json.ts";
import { dataFailure, pointerSegment } from "./presentation-data.ts";
import { parseStrictJson, parseStrictJsonLimitsV1 } from "./strict-json.ts";
import type { StrictJsonObjectV1, StrictJsonValueV1 } from "./strict-json.ts";

/** Static DOM-GUI composition data. It never enters State, Save, digest, or replay. */
export interface GuiCompositionDocumentV1 {
  readonly format: "sillymaker.gui-composition";
  readonly version: 1;
  readonly compositionId: string;
  readonly root: GuiCompositionNodeV1;
}

export interface GuiCompositionNodeV1 {
  /** Stable instance/lifecycle identity inside one composition. */
  readonly nodeId: string;
  /** Build-known Code Surface selected by the application catalog. */
  readonly viewId: string;
  readonly props: StrictJsonObjectV1;
  /** Slot names are interpreted only by this node's parent view definition. */
  readonly slots: Readonly<Record<string, readonly GuiCompositionNodeV1[]>>;
}

export const guiCompositionDocumentFormatV1 = "sillymaker.gui-composition";
export const guiCompositionDocumentVersionV1 = 1;

const compositionIdPatternV1 = /^gui\.[a-z0-9_.-]+$/u;
const nodeIdPatternV1 = /^node\.[a-z0-9_.-]+$/u;
const viewIdPatternV1 = /^view\.[a-z0-9_.-]+$/u;
const slotIdPatternV1 = /^[a-z][a-z0-9_-]*$/u;
const guiCompositionMaxIdLengthV1 = 96;
const guiCompositionMaxSlotIdLengthV1 = 64;
/** Resource/stack bounds for the recursive direct-object admission path. */
const guiCompositionMaxNodeDepthV1 = 128;
const guiCompositionMaxDirectDepthV1 = 128;
const guiCompositionMaxDocumentWorkV1 = 100_000;

const guiCompositionSourceJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: 16_777_216,
  maxDepth: 512,
  maxArrayItems: 100_000,
  maxObjectMembers: 4_096,
  maxNodes: 2_000_000,
  maxStringBytes: 262_144,
});

interface GuiCompositionAdmissionStateV1 {
  readonly seenNodeIds: Set<string>;
  readonly active: Set<object>;
  work: number;
}

function consumeWorkV1(state: GuiCompositionAdmissionStateV1, path: string): void {
  state.work += 1;
  if (state.work > guiCompositionMaxDocumentWorkV1) {
    return dataFailure(path, "gui_composition_document_work_limit");
  }
}

function readExactRecordV1(
  value: unknown,
  keys: readonly string[],
  path: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "gui_composition_object_expected");
  }
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    return dataFailure(path, "gui_composition_object_keys_invalid");
  }
  return value as Record<string, unknown>;
}

function parseStableIdV1(
  value: unknown,
  pattern: RegExp,
  path: string,
  reason: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > guiCompositionMaxIdLengthV1 ||
    !pattern.test(value)
  ) {
    return dataFailure(path, reason);
  }
  return value;
}

function cloneDirectJsonValueV1(
  value: unknown,
  path: string,
  depth: number,
  state: GuiCompositionAdmissionStateV1,
): StrictJsonValueV1 {
  if (depth > guiCompositionMaxDirectDepthV1) {
    return dataFailure(path, "gui_composition_direct_depth_invalid");
  }
  consumeWorkV1(state, path);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string" || typeof value === "number") {
    try {
      canonicalJsonBytes(value);
    } catch {
      return dataFailure(path, "gui_composition_props_invalid");
    }
    return value;
  }
  if (typeof value !== "object") {
    return dataFailure(path, "gui_composition_props_invalid");
  }
  if (state.active.has(value)) {
    return dataFailure(path, "gui_composition_props_invalid");
  }
  state.active.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry, index) =>
        cloneDirectJsonValueV1(entry, `${path}/${String(index)}`, depth + 1, state)
      );
    }
    const entries: [string, StrictJsonValueV1][] = [];
    for (const [key, member] of Object.entries(value)) {
      try {
        canonicalJsonBytes(key);
      } catch {
        return dataFailure(`${path}/${pointerSegment(key)}`, "gui_composition_props_invalid");
      }
      entries.push([
        key,
        cloneDirectJsonValueV1(
          member,
          `${path}/${pointerSegment(key)}`,
          depth + 1,
          state,
        ),
      ]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function parsePropsV1(
  value: unknown,
  path: string,
  state: GuiCompositionAdmissionStateV1,
  fromStrictJson: boolean,
): StrictJsonObjectV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "gui_composition_props_invalid");
  }
  if (fromStrictJson) return value as StrictJsonObjectV1;
  return cloneDirectJsonValueV1(value, path, 0, state) as StrictJsonObjectV1;
}

function parseNodeV1(
  value: unknown,
  path: string,
  depth: number,
  state: GuiCompositionAdmissionStateV1,
  fromStrictJson: boolean,
): GuiCompositionNodeV1 {
  if (depth > guiCompositionMaxNodeDepthV1) {
    return dataFailure(path, "gui_composition_node_depth_invalid");
  }
  if (value !== null && typeof value === "object" && state.active.has(value)) {
    return dataFailure(path, "gui_composition_node_cycle");
  }
  const record = readExactRecordV1(value, ["nodeId", "viewId", "props", "slots"], path);
  consumeWorkV1(state, path);

  const nodeId = parseStableIdV1(
    record.nodeId,
    nodeIdPatternV1,
    `${path}/nodeId`,
    "gui_composition_node_id_invalid",
  );
  if (state.seenNodeIds.has(nodeId)) {
    return dataFailure(`${path}/nodeId`, "gui_composition_node_id_duplicate");
  }
  state.seenNodeIds.add(nodeId);
  const viewId = parseStableIdV1(
    record.viewId,
    viewIdPatternV1,
    `${path}/viewId`,
    "gui_composition_view_id_invalid",
  );
  if (record.slots === null || typeof record.slots !== "object" || Array.isArray(record.slots)) {
    return dataFailure(`${path}/slots`, "gui_composition_slots_invalid");
  }

  state.active.add(value as object);
  try {
    const props = parsePropsV1(record.props, `${path}/props`, state, fromStrictJson);
    const slots: Record<string, readonly GuiCompositionNodeV1[]> = {};
    for (const [slotId, children] of Object.entries(record.slots)) {
      const slotPath = `${path}/slots/${pointerSegment(slotId)}`;
      consumeWorkV1(state, slotPath);
      if (
        slotId.length === 0 ||
        slotId.length > guiCompositionMaxSlotIdLengthV1 ||
        !slotIdPatternV1.test(slotId)
      ) {
        return dataFailure(slotPath, "gui_composition_slot_id_invalid");
      }
      if (!Array.isArray(children)) {
        return dataFailure(slotPath, "gui_composition_slot_children_invalid");
      }
      slots[slotId] = children.map((child, index) =>
        parseNodeV1(child, `${slotPath}/${String(index)}`, depth + 1, state, fromStrictJson)
      );
    }
    return { nodeId, viewId, props, slots };
  } finally {
    state.active.delete(value as object);
  }
}

function admitGuiCompositionDocumentInternalV1(
  value: unknown,
  fromStrictJson: boolean,
): GuiCompositionDocumentV1 {
  const record = readExactRecordV1(
    value,
    ["format", "version", "compositionId", "root"],
    "",
  );
  if (record.format !== guiCompositionDocumentFormatV1) {
    return dataFailure("/format", "gui_composition_format_invalid");
  }
  if (record.version !== guiCompositionDocumentVersionV1) {
    return dataFailure("/version", "gui_composition_version_invalid");
  }
  const compositionId = parseStableIdV1(
    record.compositionId,
    compositionIdPatternV1,
    "/compositionId",
    "gui_composition_id_invalid",
  );
  const root = parseNodeV1(
    record.root,
    "/root",
    0,
    { seenNodeIds: new Set(), active: new Set(), work: 0 },
    fromStrictJson,
  );
  return {
    format: guiCompositionDocumentFormatV1,
    version: guiCompositionDocumentVersionV1,
    compositionId,
    root,
  };
}

/** Admits one product-owned plain object and returns normalized trusted data. */
export function admitGuiCompositionDocumentV1(value: unknown): GuiCompositionDocumentV1 {
  return admitGuiCompositionDocumentInternalV1(value, false);
}

/** Strict file/bytes boundary. Parsed Strict JSON values are not re-cloned as hostile objects. */
export function admitGuiCompositionSourceBytesV1(bytes: Uint8Array): GuiCompositionDocumentV1 {
  const parsed = parseStrictJson(bytes, guiCompositionSourceJsonLimitsV1);
  if (!parsed.ok) {
    return dataFailure(parsed.error.path ?? "", "gui_composition_json_invalid");
  }
  return admitGuiCompositionDocumentInternalV1(parsed.value, true);
}
