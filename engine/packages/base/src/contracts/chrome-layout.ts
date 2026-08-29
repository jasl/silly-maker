// SPDX-License-Identifier: MIT
import { dataFailure, readExactRecord } from "./presentation-data.ts";

/**
 * The `sillymaker.chrome-layout` Document family (authorable-chrome-layout,
 * accepted 2026-08-22): plain versioned JSON carrying the hand-tuned
 * placement geometry of one chrome surface (a HUD, a sheet, a menu) in
 * logical canvas space. Stories import the file, admit it once through
 * `parseChromeLayoutDocumentV1`, and read named entries as frozen typed
 * data; behavior (exclusivity, occupancy gates, intent legality) stays in
 * Story code. Layout documents are zero-authority presentation data — they
 * never touch Saves, digests, or replay.
 *
 * Three entry kinds cover the geometry that actually gets tuned:
 * `boxes` are placed rectangles (position + size), `anchors` are
 * position-only points for self-sizing elements, and `offsets` are named
 * integer scalars (font-metric compensation and similar).
 *
 * The optional `widgets` section (M3, intent-binding widgets, accepted
 * 2026-08-29) declares icon-button chrome as data: each widget is the
 * "canvas box + asset + intent id" triple from the proposal, rendered by a
 * generic chrome host. A widget only ever reports "intent id activated";
 * routing power and legality stay in Story rules (the same boundary as
 * `regions never gain routing power`). The `hold_progress` kind places a
 * read-only progress meter for the currently pending authoritative hold.
 * Documents without `widgets` parse byte-identically to before.
 */

export type ChromeLayoutAuthoringStatusV1 = "generated" | "human_tuned";

/**
 * Non-runtime authoring metadata. Editing tools and collaboration rules
 * read it (do not overwrite human-tuned or locked documents); runtime
 * consumers of the geometry never see it.
 */
export interface ChromeLayoutAuthoringV1 {
  readonly status?: ChromeLayoutAuthoringStatusV1;
  readonly locked?: boolean;
  readonly notes?: string;
}

export interface ChromeLayoutCanvasV1 {
  readonly width: number;
  readonly height: number;
}

export interface ChromeLayoutBoxV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ChromeLayoutAnchorV1 {
  readonly x: number;
  readonly y: number;
}

export type ChromeLayoutWidgetKindV1 = "intent" | "hold_progress";

/**
 * An intent-binding icon button: geometry via a named `boxes` entry, an
 * optional icon asset id, a required label text id (the accessible name),
 * and the stable intent id the Story maps to a semantic invocation.
 */
export interface ChromeLayoutIntentWidgetV1 {
  readonly kind: "intent";
  /** Name of the `boxes` entry the widget occupies (admission-checked). */
  readonly box: string;
  readonly intentId: string;
  readonly labelTextId: string;
  readonly assetId?: string;
}

/**
 * A read-only progress meter for the currently pending authoritative hold
 * (fill fraction from committed `remainingMs`/`totalMs`); hidden while no
 * hold is pending. Cosmetic bar styling beyond the meter stays in Story
 * renderers.
 */
export interface ChromeLayoutHoldProgressWidgetV1 {
  readonly kind: "hold_progress";
  readonly box: string;
  readonly labelTextId: string;
}

export type ChromeLayoutWidgetV1 = ChromeLayoutIntentWidgetV1 | ChromeLayoutHoldProgressWidgetV1;

export interface ChromeLayoutDocumentV1 {
  readonly format: "sillymaker.chrome-layout";
  readonly version: 1;
  readonly layoutId: string;
  readonly label: string;
  /** Logical canvas the coordinates live in (same space as GameViewport). */
  readonly canvas: ChromeLayoutCanvasV1;
  /** Empty sections are valid: a freshly created Document starts blank. */
  readonly boxes: Readonly<Record<string, ChromeLayoutBoxV1>>;
  readonly anchors: Readonly<Record<string, ChromeLayoutAnchorV1>>;
  readonly offsets: Readonly<Record<string, number>>;
  /** Optional intent-binding widget declarations (M3); absent when unused. */
  readonly widgets?: Readonly<Record<string, ChromeLayoutWidgetV1>>;
  readonly authoring?: ChromeLayoutAuthoringV1;
}

export const chromeLayoutDocumentFormatV1 = "sillymaker.chrome-layout";
export const chromeLayoutDocumentVersionV1 = 1;

const chromeLayoutIdPatternV1 = /^layout\.[a-z0-9_.-]+$/u;
const chromeLayoutMaxIdLengthV1 = 96;
const chromeLayoutMaxLabelLengthV1 = 120;
const chromeLayoutMaxNotesLengthV1 = 500;
const chromeLayoutMaxEntryNameLengthV1 = 96;
/** Total entries across boxes + anchors + offsets. */
const chromeLayoutMaxEntriesV1 = 256;
const chromeLayoutMaxCoordinateV1 = 1_000_000;
/** Own keys that would mutate object prototypes when assigned. */
const chromeLayoutDangerousNamesV1 = new Set(["__proto__", "prototype", "constructor"]);

function requireChromeLayoutIntV1(
  value: unknown,
  min: number,
  max: number,
  path: string,
  reason: string,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    return dataFailure(path, reason);
  }
  return value;
}

function readChromeLayoutSectionEntriesV1(
  value: unknown,
  path: string,
): readonly (readonly [string, unknown])[] {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "object_expected");
  }
  const entries: (readonly [string, unknown])[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") return dataFailure(path, "symbol_key");
    if (
      key.length === 0 ||
      key.length > chromeLayoutMaxEntryNameLengthV1 ||
      key.trim().length === 0 ||
      chromeLayoutDangerousNamesV1.has(key)
    ) {
      return dataFailure(path, "chrome_layout_entry_name_invalid");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      return dataFailure(`${path}/${key}`, "data_property_expected");
    }
    entries.push([key, descriptor.value]);
  }
  return entries;
}

function parseChromeLayoutBoxV1(value: unknown, path: string): ChromeLayoutBoxV1 {
  const record = readExactRecord(value, ["x", "y", "width", "height"], path);
  return Object.freeze({
    x: requireChromeLayoutIntV1(
      record.x,
      -chromeLayoutMaxCoordinateV1,
      chromeLayoutMaxCoordinateV1,
      `${path}/x`,
      "chrome_layout_box_invalid",
    ),
    y: requireChromeLayoutIntV1(
      record.y,
      -chromeLayoutMaxCoordinateV1,
      chromeLayoutMaxCoordinateV1,
      `${path}/y`,
      "chrome_layout_box_invalid",
    ),
    width: requireChromeLayoutIntV1(
      record.width,
      1,
      chromeLayoutMaxCoordinateV1,
      `${path}/width`,
      "chrome_layout_box_invalid",
    ),
    height: requireChromeLayoutIntV1(
      record.height,
      1,
      chromeLayoutMaxCoordinateV1,
      `${path}/height`,
      "chrome_layout_box_invalid",
    ),
  });
}

function parseChromeLayoutAnchorV1(value: unknown, path: string): ChromeLayoutAnchorV1 {
  const record = readExactRecord(value, ["x", "y"], path);
  return Object.freeze({
    x: requireChromeLayoutIntV1(
      record.x,
      -chromeLayoutMaxCoordinateV1,
      chromeLayoutMaxCoordinateV1,
      `${path}/x`,
      "chrome_layout_anchor_invalid",
    ),
    y: requireChromeLayoutIntV1(
      record.y,
      -chromeLayoutMaxCoordinateV1,
      chromeLayoutMaxCoordinateV1,
      `${path}/y`,
      "chrome_layout_anchor_invalid",
    ),
  });
}

function parseChromeLayoutSectionV1<TEntry>(
  value: unknown,
  path: string,
  parseEntry: (value: unknown, path: string) => TEntry,
): Readonly<Record<string, TEntry>> {
  const entries = readChromeLayoutSectionEntriesV1(value, path);
  return Object.freeze(
    Object.fromEntries(
      entries.map(([name, entry]) => [name, parseEntry(entry, `${path}/${name}`)]),
    ),
  );
}

function requireChromeLayoutIdV1(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > chromeLayoutMaxEntryNameLengthV1 ||
    value.trim().length === 0
  ) {
    return dataFailure(path, "chrome_layout_widget_invalid");
  }
  return value;
}

function parseChromeLayoutWidgetV1(
  value: unknown,
  path: string,
  boxes: Readonly<Record<string, ChromeLayoutBoxV1>>,
): ChromeLayoutWidgetV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "chrome_layout_widget_invalid");
  }
  const kind: unknown = Reflect.get(value, "kind");
  if (kind !== "intent" && kind !== "hold_progress") {
    return dataFailure(`${path}/kind`, "chrome_layout_widget_kind_invalid");
  }
  const parsedKind: ChromeLayoutWidgetKindV1 = kind;
  switch (parsedKind) {
    case "intent": {
      const hasAsset = Object.hasOwn(value, "assetId");
      const record = readExactRecord(
        value,
        hasAsset
          ? ["kind", "box", "intentId", "labelTextId", "assetId"]
          : ["kind", "box", "intentId", "labelTextId"],
        path,
      );
      const box = requireChromeLayoutIdV1(record.box, `${path}/box`);
      if (boxes[box] === undefined) {
        return dataFailure(`${path}/box`, "chrome_layout_widget_box_unknown");
      }
      return Object.freeze({
        kind: "intent" as const,
        box,
        intentId: requireChromeLayoutIdV1(record.intentId, `${path}/intentId`),
        labelTextId: requireChromeLayoutIdV1(record.labelTextId, `${path}/labelTextId`),
        ...(hasAsset
          ? { assetId: requireChromeLayoutIdV1(record.assetId, `${path}/assetId`) }
          : {}),
      });
    }
    case "hold_progress": {
      const record = readExactRecord(value, ["kind", "box", "labelTextId"], path);
      const box = requireChromeLayoutIdV1(record.box, `${path}/box`);
      if (boxes[box] === undefined) {
        return dataFailure(`${path}/box`, "chrome_layout_widget_box_unknown");
      }
      return Object.freeze({
        kind: "hold_progress" as const,
        box,
        labelTextId: requireChromeLayoutIdV1(record.labelTextId, `${path}/labelTextId`),
      });
    }
    default: {
      const unreachable: never = parsedKind;
      throw new TypeError(`chrome_layout_widget_kind_unreachable:${String(unreachable)}`);
    }
  }
}

function parseChromeLayoutAuthoringV1(value: unknown, path: string): ChromeLayoutAuthoringV1 {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return dataFailure(path, "chrome_layout_authoring_invalid");
  }
  const allowed = new Set(["status", "locked", "notes"]);
  const result: { status?: ChromeLayoutAuthoringStatusV1; locked?: boolean; notes?: string } = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol" || !allowed.has(key)) {
      return dataFailure(path, "chrome_layout_authoring_invalid");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      return dataFailure(`${path}/${key}`, "chrome_layout_authoring_invalid");
    }
    const memberValue: unknown = descriptor.value;
    if (key === "status") {
      if (memberValue !== "generated" && memberValue !== "human_tuned") {
        return dataFailure(`${path}/status`, "chrome_layout_authoring_status_invalid");
      }
      result.status = memberValue;
    } else if (key === "locked") {
      if (typeof memberValue !== "boolean") {
        return dataFailure(`${path}/locked`, "chrome_layout_authoring_locked_invalid");
      }
      result.locked = memberValue;
    } else {
      if (
        typeof memberValue !== "string" ||
        memberValue.length === 0 ||
        memberValue.length > chromeLayoutMaxNotesLengthV1
      ) {
        return dataFailure(`${path}/notes`, "chrome_layout_authoring_notes_invalid");
      }
      result.notes = memberValue;
    }
  }
  return Object.freeze(result);
}

/**
 * Parses a `sillymaker.chrome-layout` Document (for example the value of a
 * `*.chrome-layout.json` import). Admission is strict: exact keys,
 * safe-integer canvas-space coordinates (positions may be negative,
 * sizes are >= 1), bounded entry names, a total entry cap, and a
 * structured path on every failure.
 */
export function parseChromeLayoutDocumentV1(value: unknown, path = ""): ChromeLayoutDocumentV1 {
  const hasAuthoring = value !== null && typeof value === "object" &&
    Object.hasOwn(value, "authoring");
  const hasWidgets = value !== null && typeof value === "object" &&
    Object.hasOwn(value, "widgets");
  const baseKeys = [
    "format",
    "version",
    "layoutId",
    "label",
    "canvas",
    "boxes",
    "anchors",
    "offsets",
    ...(hasWidgets ? ["widgets"] : []),
  ];
  const record = readExactRecord(value, hasAuthoring ? [...baseKeys, "authoring"] : baseKeys, path);
  if (record.format !== chromeLayoutDocumentFormatV1) {
    return dataFailure(`${path}/format`, "chrome_layout_format_invalid");
  }
  if (record.version !== chromeLayoutDocumentVersionV1) {
    return dataFailure(`${path}/version`, "chrome_layout_version_unsupported");
  }
  if (
    typeof record.layoutId !== "string" ||
    record.layoutId.length > chromeLayoutMaxIdLengthV1 ||
    !chromeLayoutIdPatternV1.test(record.layoutId)
  ) {
    return dataFailure(`${path}/layoutId`, "chrome_layout_id_invalid");
  }
  if (
    typeof record.label !== "string" ||
    record.label.length === 0 ||
    record.label.length > chromeLayoutMaxLabelLengthV1
  ) {
    return dataFailure(`${path}/label`, "chrome_layout_label_invalid");
  }
  const canvasRecord = readExactRecord(record.canvas, ["width", "height"], `${path}/canvas`);
  const canvas = Object.freeze({
    width: requireChromeLayoutIntV1(
      canvasRecord.width,
      1,
      chromeLayoutMaxCoordinateV1,
      `${path}/canvas/width`,
      "chrome_layout_canvas_invalid",
    ),
    height: requireChromeLayoutIntV1(
      canvasRecord.height,
      1,
      chromeLayoutMaxCoordinateV1,
      `${path}/canvas/height`,
      "chrome_layout_canvas_invalid",
    ),
  });
  const boxes = parseChromeLayoutSectionV1(record.boxes, `${path}/boxes`, parseChromeLayoutBoxV1);
  const anchors = parseChromeLayoutSectionV1(
    record.anchors,
    `${path}/anchors`,
    parseChromeLayoutAnchorV1,
  );
  const offsets = parseChromeLayoutSectionV1(
    record.offsets,
    `${path}/offsets`,
    (entryValue, entryPath) =>
      requireChromeLayoutIntV1(
        entryValue,
        -chromeLayoutMaxCoordinateV1,
        chromeLayoutMaxCoordinateV1,
        entryPath,
        "chrome_layout_offset_invalid",
      ),
  );
  const widgets = hasWidgets
    ? parseChromeLayoutSectionV1(
      record.widgets,
      `${path}/widgets`,
      (entryValue, entryPath) => parseChromeLayoutWidgetV1(entryValue, entryPath, boxes),
    )
    : undefined;
  const entryCount = Object.keys(boxes).length + Object.keys(anchors).length +
    Object.keys(offsets).length + (widgets === undefined ? 0 : Object.keys(widgets).length);
  if (entryCount > chromeLayoutMaxEntriesV1) {
    return dataFailure(path, "chrome_layout_entries_count_invalid");
  }
  const authoring = hasAuthoring
    ? parseChromeLayoutAuthoringV1(record.authoring, `${path}/authoring`)
    : undefined;
  return Object.freeze({
    format: chromeLayoutDocumentFormatV1,
    version: chromeLayoutDocumentVersionV1,
    layoutId: record.layoutId,
    label: record.label,
    canvas,
    boxes,
    anchors,
    offsets,
    ...(widgets === undefined ? {} : { widgets }),
    ...(authoring === undefined ? {} : { authoring }),
  });
}
