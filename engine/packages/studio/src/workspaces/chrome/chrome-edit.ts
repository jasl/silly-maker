// SPDX-License-Identifier: MIT
import type { ChromeLayoutDocumentV1 } from "@sillymaker/base";
import { parseChromeLayoutDocumentV1 } from "@sillymaker/base";

/**
 * Chrome workspace editing (authorable-chrome-layout M2): pure plain-JSON
 * commands over one `sillymaker.chrome-layout` draft — move/resize boxes,
 * move anchors, set offsets, add/remove/rename entries, the blank
 * document, and the id-prefix inference. Admission
 * (`parseChromeLayoutDocumentV1`) stays the single validator: the draft
 * gate below literally re-runs it, so the save button can never pass
 * something the port would reject.
 */

export interface ChromeLayoutPlainBoxV1 {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChromeLayoutPlainAnchorV1 {
  x: number;
  y: number;
}

export interface ChromeLayoutPlainDocumentV1 {
  format: "sillymaker.chrome-layout";
  version: 1;
  layoutId: string;
  label: string;
  canvas: { width: number; height: number };
  boxes: Record<string, ChromeLayoutPlainBoxV1>;
  anchors: Record<string, ChromeLayoutPlainAnchorV1>;
  offsets: Record<string, number>;
  authoring?: { status?: "generated" | "human_tuned"; locked?: boolean; notes?: string };
}

export type ChromeLayoutSectionV1 = "boxes" | "anchors" | "offsets";

/** Same admission budget: coordinates stay safe integers within ±1e6. */
const chromeEditMaxCoordinateV1 = 1_000_000;
/** Same admission cap: total entries across the three sections. */
const chromeEditMaxEntriesV1 = 256;
/** Admission rejects these anyway; plain-record renames can't hold them. */
const chromeEditDangerousNamesV1 = new Set(["__proto__", "prototype", "constructor"]);

function clampIntV1(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** One draft edit: clone, mutate the plain JSON, and hand back a new doc. */
export function editChromeLayoutDocumentV1(
  draft: ChromeLayoutDocumentV1,
  mutate: (plain: ChromeLayoutPlainDocumentV1) => void,
): ChromeLayoutDocumentV1 {
  const plain = structuredClone(draft) as ChromeLayoutPlainDocumentV1;
  mutate(plain);
  return plain as unknown as ChromeLayoutDocumentV1;
}

/** The blank chrome-layout document a creation flow starts from. */
export function newChromeLayoutDocumentV1(input: {
  readonly layoutId: string;
  readonly label: string;
  readonly canvas: { readonly width: number; readonly height: number };
}): ChromeLayoutDocumentV1 {
  return {
    format: "sillymaker.chrome-layout",
    version: 1,
    layoutId: input.layoutId,
    label: input.label,
    canvas: { width: input.canvas.width, height: input.canvas.height },
    boxes: {},
    anchors: {},
    offsets: {},
    authoring: { status: "generated" },
  } as unknown as ChromeLayoutDocumentV1;
}

/** Saving from the editor promotes the document to human-tuned. */
export function graduateChromeLayoutDocumentV1(
  draft: ChromeLayoutDocumentV1,
): ChromeLayoutDocumentV1 {
  return editChromeLayoutDocumentV1(draft, (plain) => {
    plain.authoring = { ...plain.authoring, status: "human_tuned" };
  });
}

/**
 * The layoutId prefix for a new document: inferred from the documents
 * already in the project, then from the story segment the shell knows
 * (scene ids), then the literal "story".
 */
export function inferChromeLayoutIdPrefixV1(
  layoutIds: readonly string[],
  storyHint: string | null,
): string {
  const fromExisting = layoutIds[0];
  if (fromExisting !== undefined) {
    const segments = fromExisting.split(".");
    if (segments.length >= 3) return `${segments.slice(0, -1).join(".")}.`;
  }
  if (storyHint !== null && storyHint.length > 0) return `layout.${storyHint}.`;
  return "layout.story.";
}

/**
 * The single save gate: re-run Document admission over the draft and
 * report the first failure (`reason at /path`), or null when the draft
 * would be accepted byte-for-byte by the port.
 */
export function chromeLayoutDraftBlockingIssueV1(draft: ChromeLayoutDocumentV1): string | null {
  try {
    parseChromeLayoutDocumentV1(draft);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function totalEntriesV1(plain: ChromeLayoutPlainDocumentV1): number {
  return Object.keys(plain.boxes).length + Object.keys(plain.anchors).length +
    Object.keys(plain.offsets).length;
}

function entryNameTakenV1(plain: ChromeLayoutPlainDocumentV1, name: string): boolean {
  return Object.hasOwn(plain.boxes, name) || Object.hasOwn(plain.anchors, name) ||
    Object.hasOwn(plain.offsets, name);
}

/** Appends "-2", "-3", … until the candidate is free across all sections. */
function dedupeEntryNameV1(plain: ChromeLayoutPlainDocumentV1, candidate: string): string {
  if (!entryNameTakenV1(plain, candidate)) return candidate;
  for (let suffix = 2;; suffix += 1) {
    const next = `${candidate}-${String(suffix)}`;
    if (!entryNameTakenV1(plain, next)) return next;
  }
}

/** Adds one box at a centered seed; returns its name (null when full). */
export function addBoxV1(plain: ChromeLayoutPlainDocumentV1): string | null {
  if (totalEntriesV1(plain) >= chromeEditMaxEntriesV1) return null;
  const name = dedupeEntryNameV1(plain, `box-${String(Object.keys(plain.boxes).length + 1)}`);
  const width = Math.max(1, Math.round(plain.canvas.width / 8));
  const height = Math.max(1, Math.round(plain.canvas.height / 8));
  plain.boxes[name] = {
    x: Math.round((plain.canvas.width - width) / 2),
    y: Math.round((plain.canvas.height - height) / 2),
    width,
    height,
  };
  return name;
}

/** Adds one anchor at the canvas center; returns its name (null when full). */
export function addAnchorV1(plain: ChromeLayoutPlainDocumentV1): string | null {
  if (totalEntriesV1(plain) >= chromeEditMaxEntriesV1) return null;
  const name = dedupeEntryNameV1(plain, `anchor-${String(Object.keys(plain.anchors).length + 1)}`);
  plain.anchors[name] = {
    x: Math.round(plain.canvas.width / 2),
    y: Math.round(plain.canvas.height / 2),
  };
  return name;
}

/** Adds one zero offset; returns its name (null when full). */
export function addOffsetV1(plain: ChromeLayoutPlainDocumentV1): string | null {
  if (totalEntriesV1(plain) >= chromeEditMaxEntriesV1) return null;
  const name = dedupeEntryNameV1(plain, `offset-${String(Object.keys(plain.offsets).length + 1)}`);
  plain.offsets[name] = 0;
  return name;
}

export function removeEntryV1(
  plain: ChromeLayoutPlainDocumentV1,
  section: ChromeLayoutSectionV1,
  name: string,
): void {
  switch (section) {
    case "boxes":
      delete plain.boxes[name];
      return;
    case "anchors":
      delete plain.anchors[name];
      return;
    case "offsets":
      delete plain.offsets[name];
      return;
    default: {
      const exhaustive: never = section;
      throw new TypeError(`unknown chrome-layout section ${String(exhaustive)}`);
    }
  }
}

/**
 * Renames one entry in place, preserving the section's key order. A taken
 * target name is a no-op: record keys are the identity, so a collision
 * would silently merge two entries.
 */
export function renameEntryV1(
  plain: ChromeLayoutPlainDocumentV1,
  section: ChromeLayoutSectionV1,
  from: string,
  to: string,
): void {
  if (from === to || entryNameTakenV1(plain, to) || chromeEditDangerousNamesV1.has(to)) return;
  const renameIn = <TValue>(record: Record<string, TValue>): Record<string, TValue> => {
    const next: Record<string, TValue> = {};
    for (const [key, value] of Object.entries(record)) {
      next[key === from ? to : key] = value;
    }
    return next;
  };
  switch (section) {
    case "boxes":
      if (!Object.hasOwn(plain.boxes, from)) return;
      plain.boxes = renameIn(plain.boxes);
      return;
    case "anchors":
      if (!Object.hasOwn(plain.anchors, from)) return;
      plain.anchors = renameIn(plain.anchors);
      return;
    case "offsets":
      if (!Object.hasOwn(plain.offsets, from)) return;
      plain.offsets = renameIn(plain.offsets);
      return;
    default: {
      const exhaustive: never = section;
      throw new TypeError(`unknown chrome-layout section ${String(exhaustive)}`);
    }
  }
}

/** Moves one box's origin (positions may be negative — parked elements). */
export function moveBoxV1(
  plain: ChromeLayoutPlainDocumentV1,
  name: string,
  x: number,
  y: number,
): void {
  const box = plain.boxes[name];
  if (box === undefined) return;
  box.x = clampIntV1(x, -chromeEditMaxCoordinateV1, chromeEditMaxCoordinateV1);
  box.y = clampIntV1(y, -chromeEditMaxCoordinateV1, chromeEditMaxCoordinateV1);
}

export function resizeBoxV1(
  plain: ChromeLayoutPlainDocumentV1,
  name: string,
  width: number,
  height: number,
): void {
  const box = plain.boxes[name];
  if (box === undefined) return;
  box.width = clampIntV1(width, 1, chromeEditMaxCoordinateV1);
  box.height = clampIntV1(height, 1, chromeEditMaxCoordinateV1);
}

export function moveAnchorV1(
  plain: ChromeLayoutPlainDocumentV1,
  name: string,
  x: number,
  y: number,
): void {
  const anchor = plain.anchors[name];
  if (anchor === undefined) return;
  anchor.x = clampIntV1(x, -chromeEditMaxCoordinateV1, chromeEditMaxCoordinateV1);
  anchor.y = clampIntV1(y, -chromeEditMaxCoordinateV1, chromeEditMaxCoordinateV1);
}

export function setOffsetV1(
  plain: ChromeLayoutPlainDocumentV1,
  name: string,
  value: number,
): void {
  if (!Object.hasOwn(plain.offsets, name)) return;
  plain.offsets[name] = clampIntV1(value, -chromeEditMaxCoordinateV1, chromeEditMaxCoordinateV1);
}
