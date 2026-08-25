// SPDX-License-Identifier: MIT
import { dataFailure, readArray, readExactRecord } from "./presentation-data.ts";
import type { AssetId } from "./presentation-ids.ts";
import type { StageHitRegionPointV1, StageHitRegionV1 } from "./stage-render-target.ts";
import { hitRegionPolygonValidV1 } from "./stage-render-target.ts";

/**
 * The `sillymaker.regions` Document family (shaped-hit-regions, accepted
 * 2026-08-21): plain versioned JSON carrying one editable set of stage hit
 * regions — the Studio-first entry to shaped, hover-revealing regions.
 * Story catalogs import the file, admit it once through
 * `parseRegionsDocumentV1`, and hand `regions` to their `resolveContent`;
 * the binding stays in Story code, exactly like motion documents binding
 * cues. Studio's region editor and the `story regions trace` devtool read
 * and write this format; the runtime and Saves only ever see parsed data.
 *
 * Admission is strict (a broken Document fails with a structured path);
 * the render-target projection separately degrades invalid refinements at
 * runtime for catalog-constructed regions.
 */

export type RegionsAuthoringStatusV1 = "generated" | "human_tuned";

/**
 * Non-runtime authoring metadata. Editing tools and collaboration rules
 * read it (do not overwrite human-tuned or locked documents); consumers of
 * `regions` never see it.
 */
export interface RegionsAuthoringV1 {
  readonly status?: RegionsAuthoringStatusV1;
  readonly locked?: boolean;
  readonly notes?: string;
}

export interface RegionsDocumentV1 {
  readonly format: "sillymaker.regions";
  readonly version: 1;
  readonly regionsId: string;
  readonly label: string;
  /** Empty is valid: a freshly created Document starts without regions. */
  readonly regions: readonly StageHitRegionV1[];
  readonly authoring?: RegionsAuthoringV1;
}

export const regionsDocumentFormatV1 = "sillymaker.regions";
export const regionsDocumentVersionV1 = 1;

const regionsIdPatternV1 = /^regions\.[a-z0-9_.-]+$/u;
const regionsMaxIdLengthV1 = 96;
const regionsMaxLabelLengthV1 = 120;
const regionsMaxNotesLengthV1 = 500;
const regionsMaxRegionIdLengthV1 = 96;
const regionsMaxAccessibleNameLengthV1 = 120;
const regionsMaxCoordinateV1 = 1_000_000;

function requireRegionsIntV1(
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

function parseRegionsPolygonPointsV1(
  value: unknown,
  path: string,
  bounds: Pick<StageHitRegionV1, "x" | "y" | "width" | "height">,
): readonly StageHitRegionPointV1[] {
  const rawPoints = readArray(value, path);
  const points = rawPoints.map((point, index) => {
    const record = readExactRecord(point, ["x", "y"], `${path}/${String(index)}`);
    return {
      x: requireRegionsIntV1(
        record.x,
        -regionsMaxCoordinateV1,
        regionsMaxCoordinateV1,
        `${path}/${String(index)}/x`,
        "regions_polygon_point_invalid",
      ),
      y: requireRegionsIntV1(
        record.y,
        -regionsMaxCoordinateV1,
        regionsMaxCoordinateV1,
        `${path}/${String(index)}/y`,
        "regions_polygon_point_invalid",
      ),
    };
  });
  if (!hitRegionPolygonValidV1(bounds, points)) {
    return dataFailure(path, "regions_polygon_invalid");
  }
  return points;
}

function parseRegionsRegionV1(value: unknown, path: string): StageHitRegionV1 {
  const hasPolygon = value !== null && typeof value === "object" &&
    Object.hasOwn(value, "polygonPoints");
  const hasHover = value !== null && typeof value === "object" &&
    Object.hasOwn(value, "hoverAssetId");
  const record = readExactRecord(
    value,
    [
      "regionId",
      "accessibleNameText",
      "x",
      "y",
      "width",
      "height",
      ...(hasPolygon ? ["polygonPoints"] : []),
      ...(hasHover ? ["hoverAssetId"] : []),
    ],
    path,
  );
  if (
    typeof record.regionId !== "string" ||
    record.regionId.length === 0 ||
    record.regionId.length > regionsMaxRegionIdLengthV1
  ) {
    return dataFailure(`${path}/regionId`, "regions_region_id_invalid");
  }
  if (
    typeof record.accessibleNameText !== "string" ||
    record.accessibleNameText.length === 0 ||
    record.accessibleNameText.length > regionsMaxAccessibleNameLengthV1
  ) {
    return dataFailure(`${path}/accessibleNameText`, "regions_accessible_name_invalid");
  }
  const bounds = {
    x: requireRegionsIntV1(
      record.x,
      -regionsMaxCoordinateV1,
      regionsMaxCoordinateV1,
      `${path}/x`,
      "regions_bounds_invalid",
    ),
    y: requireRegionsIntV1(
      record.y,
      -regionsMaxCoordinateV1,
      regionsMaxCoordinateV1,
      `${path}/y`,
      "regions_bounds_invalid",
    ),
    width: requireRegionsIntV1(
      record.width,
      1,
      regionsMaxCoordinateV1,
      `${path}/width`,
      "regions_bounds_invalid",
    ),
    height: requireRegionsIntV1(
      record.height,
      1,
      regionsMaxCoordinateV1,
      `${path}/height`,
      "regions_bounds_invalid",
    ),
  };
  const polygonPoints = hasPolygon
    ? parseRegionsPolygonPointsV1(record.polygonPoints, `${path}/polygonPoints`, bounds)
    : undefined;
  let hoverAssetId: AssetId | undefined;
  if (hasHover) {
    if (typeof record.hoverAssetId !== "string" || record.hoverAssetId.length === 0) {
      return dataFailure(`${path}/hoverAssetId`, "regions_hover_asset_invalid");
    }
    hoverAssetId = record.hoverAssetId as AssetId;
  }
  return {
    regionId: record.regionId,
    accessibleNameText: record.accessibleNameText,
    ...bounds,
    ...(polygonPoints === undefined ? {} : { polygonPoints }),
    ...(hoverAssetId === undefined ? {} : { hoverAssetId }),
  };
}

function parseRegionsAuthoringV1(value: unknown, path: string): RegionsAuthoringV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return dataFailure(path, "regions_authoring_invalid");
  }
  const allowed = new Set(["status", "locked", "notes"]);
  const record = value as Record<string, unknown>;
  const result: { status?: RegionsAuthoringStatusV1; locked?: boolean; notes?: string } = {};
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      return dataFailure(path, "regions_authoring_invalid");
    }
    const memberValue = record[key];
    if (key === "status") {
      if (memberValue !== "generated" && memberValue !== "human_tuned") {
        return dataFailure(`${path}/status`, "regions_authoring_status_invalid");
      }
      result.status = memberValue;
    } else if (key === "locked") {
      if (typeof memberValue !== "boolean") {
        return dataFailure(`${path}/locked`, "regions_authoring_locked_invalid");
      }
      result.locked = memberValue;
    } else {
      if (
        typeof memberValue !== "string" ||
        memberValue.length === 0 ||
        memberValue.length > regionsMaxNotesLengthV1
      ) {
        return dataFailure(`${path}/notes`, "regions_authoring_notes_invalid");
      }
      result.notes = memberValue;
    }
  }
  return result;
}

/**
 * Parses a `sillymaker.regions` Document (for example the value of a
 * `*.regions.json` import). Admission is strict: exact keys, safe-integer
 * coordinates, bounded sizes, unique region ids, the shared polygon rule,
 * and a structured path on every failure.
 */
export function parseRegionsDocumentV1(value: unknown, path = ""): RegionsDocumentV1 {
  const hasAuthoring = value !== null && typeof value === "object" &&
    Object.hasOwn(value, "authoring");
  const baseKeys = ["format", "version", "regionsId", "label", "regions"];
  const record = readExactRecord(value, hasAuthoring ? [...baseKeys, "authoring"] : baseKeys, path);
  if (record.format !== regionsDocumentFormatV1) {
    return dataFailure(`${path}/format`, "regions_format_invalid");
  }
  if (record.version !== regionsDocumentVersionV1) {
    return dataFailure(`${path}/version`, "regions_version_unsupported");
  }
  if (
    typeof record.regionsId !== "string" ||
    record.regionsId.length > regionsMaxIdLengthV1 ||
    !regionsIdPatternV1.test(record.regionsId)
  ) {
    return dataFailure(`${path}/regionsId`, "regions_id_invalid");
  }
  if (
    typeof record.label !== "string" ||
    record.label.length === 0 ||
    record.label.length > regionsMaxLabelLengthV1
  ) {
    return dataFailure(`${path}/label`, "regions_label_invalid");
  }
  const rawRegions = readArray(record.regions, `${path}/regions`);
  const regions = rawRegions.map((region, index) =>
    parseRegionsRegionV1(region, `${path}/regions/${String(index)}`)
  );
  const seen = new Set<string>();
  regions.forEach((region, index) => {
    if (seen.has(region.regionId)) {
      dataFailure(`${path}/regions/${String(index)}/regionId`, "regions_region_id_duplicate");
    }
    seen.add(region.regionId);
  });
  const authoring = hasAuthoring
    ? parseRegionsAuthoringV1(record.authoring, `${path}/authoring`)
    : undefined;
  return {
    format: regionsDocumentFormatV1,
    version: regionsDocumentVersionV1,
    regionsId: record.regionsId,
    label: record.label,
    regions,
    ...(authoring === undefined ? {} : { authoring }),
  };
}
