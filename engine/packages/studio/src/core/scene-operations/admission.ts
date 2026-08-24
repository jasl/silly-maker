// SPDX-License-Identifier: MIT
import {
  parseSceneDocumentV1,
  parseStageAppearanceV1,
  parseStagePlacementV1,
  parseStageTagV1,
} from "@sillymaker/base";
import type {
  SceneCueV1,
  SceneEntryV1,
  StageAppearanceV1,
  StagePlacementV1,
} from "@sillymaker/base";

import type {
  SceneAuthoringDiagnosticCodeV1,
  SceneAuthoringDiagnosticV1,
  SceneAuthoringOperationAdmissionResultV1,
  SceneAuthoringOperationV1,
} from "./contract.ts";
import { sceneAuthoringOperationSchemaRevisionV1 } from "./contract.ts";

const operationIdPatternV1 = /^(?:cue|motion)\.[a-z0-9_.-]+$/u;
const operationIdMaxLengthV1 = 96;

class SceneAuthoringAdmissionFailureV1 extends Error {
  readonly diagnostic: SceneAuthoringDiagnosticV1;

  constructor(code: SceneAuthoringDiagnosticCodeV1, path: string) {
    super(code);
    this.diagnostic = { code, path };
  }
}

function rejectV1(
  code: SceneAuthoringDiagnosticCodeV1,
  path: string,
): never {
  throw new SceneAuthoringAdmissionFailureV1(code, path);
}

function rejectionV1(
  error: unknown,
  fallbackCode: SceneAuthoringDiagnosticCodeV1,
  fallbackPath: string,
): { readonly kind: "rejected"; readonly diagnostic: SceneAuthoringDiagnosticV1 } {
  return error instanceof SceneAuthoringAdmissionFailureV1
    ? { kind: "rejected", diagnostic: error.diagnostic }
    : {
      kind: "rejected",
      diagnostic: { code: fallbackCode, path: fallbackPath },
    };
}

function normalizeRecordV1(
  value: unknown,
  path: string,
  code: SceneAuthoringDiagnosticCodeV1,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return rejectV1(code, path);
  }
  const source = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(source).map((key) => [key, source[key]]));
}

function requireExactFieldsV1(
  record: Record<string, unknown>,
  expectedKeys: readonly string[],
  path: string,
  code: SceneAuthoringDiagnosticCodeV1,
): Record<string, unknown> {
  const actualKeys = Object.keys(record);
  if (
    actualKeys.length !== expectedKeys.length ||
    !expectedKeys.every((key) => Object.hasOwn(record, key))
  ) {
    return rejectV1(code, path);
  }
  return record;
}

function parseAtV1<TValue>(
  parser: (value: unknown, path: string) => TValue,
  value: unknown,
  path: string,
): TValue {
  try {
    return parser(value, path);
  } catch {
    return rejectV1("scene_authoring.operation_payload_invalid", path);
  }
}

function parseOperationIdV1(value: unknown, prefix: "cue" | "motion", path: string): string {
  if (
    typeof value !== "string" || value.length > operationIdMaxLengthV1 ||
    !operationIdPatternV1.test(value) || !value.startsWith(`${prefix}.`)
  ) {
    return rejectV1("scene_authoring.operation_payload_invalid", path);
  }
  return value;
}

function parseZOrderV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > 1_000_000) {
    return rejectV1("scene_authoring.operation_payload_invalid", path);
  }
  return value;
}

function parseNullableMotionIdV1(value: unknown, path: string): string | null {
  return value === null ? null : parseOperationIdV1(value, "motion", path);
}

function parseEntryV1(value: unknown, path: string): SceneEntryV1 {
  try {
    const entry = normalizeRecordV1(
      value,
      path,
      "scene_authoring.operation_payload_invalid",
    );
    const document = parseSceneDocumentV1({
      format: "sillymaker.scene",
      version: 1,
      sceneId: "scene.operation",
      label: "Operation",
      canvas: { width: 1, height: 1 },
      entries: [entry],
      cues: [],
    }, path);
    const admitted = document.entries[0];
    if (admitted === undefined) return rejectV1("scene_authoring.operation_payload_invalid", path);
    return admitted;
  } catch {
    return rejectV1("scene_authoring.operation_payload_invalid", path);
  }
}

function parseCueV1(value: unknown, path: string): SceneCueV1 {
  const cueRecord = normalizeRecordV1(
    value,
    path,
    "scene_authoring.operation_payload_invalid",
  );
  const keys = ["cueId", "kind", "tag"];
  if (Object.hasOwn(cueRecord, "motionId")) keys.push("motionId");
  if (Object.hasOwn(cueRecord, "cut")) keys.push("cut");
  requireExactFieldsV1(
    cueRecord,
    keys,
    path,
    "scene_authoring.operation_payload_invalid",
  );
  const tag = parseAtV1(parseStageTagV1, cueRecord.tag, `${path}/tag`);
  try {
    const document = parseSceneDocumentV1({
      format: "sillymaker.scene",
      version: 1,
      sceneId: "scene.operation",
      label: "Operation",
      canvas: { width: 1, height: 1 },
      entries: [{
        layerId: "layer.operation",
        tag,
        contentId: "content.operation",
      }],
      cues: [cueRecord],
    }, path);
    const cue = document.cues[0];
    if (cue === undefined) return rejectV1("scene_authoring.operation_payload_invalid", path);
    return cue;
  } catch {
    return rejectV1("scene_authoring.operation_payload_invalid", path);
  }
}

function parseAppearanceFieldV1(
  keyValue: unknown,
  value: unknown,
): { readonly key: string; readonly value: string | null } {
  if (typeof keyValue !== "string") {
    return rejectV1("scene_authoring.operation_payload_invalid", "/operation/key");
  }
  let keyAppearance: StageAppearanceV1;
  try {
    keyAppearance = parseStageAppearanceV1({ [keyValue]: "value" }, "/operation");
  } catch {
    return rejectV1("scene_authoring.operation_payload_invalid", "/operation/key");
  }
  const key = Object.keys(keyAppearance)[0];
  if (key === undefined) {
    return rejectV1("scene_authoring.operation_payload_invalid", "/operation/key");
  }
  if (value === null) return { key, value: null };
  let appearance: StageAppearanceV1;
  try {
    appearance = parseStageAppearanceV1({ [key]: value }, "/operation");
  } catch {
    return rejectV1("scene_authoring.operation_payload_invalid", "/operation/value");
  }
  return { key, value: appearance[key] ?? null };
}

function admitKnownOperationV1(
  value: Record<string, unknown>,
  kind: string,
): SceneAuthoringOperationV1 {
  const schemaRevision = sceneAuthoringOperationSchemaRevisionV1;
  switch (kind) {
    case "scene.entry.set_placement": {
      const record = requireExactFieldsV1(
        value,
        ["schemaRevision", "kind", "tag", "placement"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      const placement = parseAtV1<StagePlacementV1>(
        parseStagePlacementV1,
        record.placement,
        "/operation/placement",
      );
      return {
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
        placement,
      };
    }
    case "scene.entry.add": {
      const record = requireExactFieldsV1(
        value,
        ["schemaRevision", "kind", "entry"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        entry: parseEntryV1(record.entry, "/operation/entry"),
      };
    }
    case "scene.entry.remove": {
      const record = requireExactFieldsV1(
        value,
        ["schemaRevision", "kind", "tag"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
      };
    }
    case "scene.entry.set_z_order": {
      const record = requireExactFieldsV1(
        value,
        ["schemaRevision", "kind", "tag", "zOrder"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
        zOrder: parseZOrderV1(record.zOrder, "/operation/zOrder"),
      };
    }
    case "scene.entry.set_appearance": {
      const record = requireExactFieldsV1(
        value,
        ["schemaRevision", "kind", "tag", "key", "value"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      const appearance = parseAppearanceFieldV1(record.key, record.value);
      return {
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
        key: appearance.key,
        value: appearance.value,
      };
    }
    case "scene.entry.set_ambient": {
      const record = requireExactFieldsV1(
        value,
        ["schemaRevision", "kind", "tag", "motionId"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
        motionId: parseNullableMotionIdV1(record.motionId, "/operation/motionId"),
      };
    }
    case "scene.cue.add": {
      const record = requireExactFieldsV1(
        value,
        ["schemaRevision", "kind", "cue"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        cue: parseCueV1(record.cue, "/operation/cue"),
      };
    }
    case "scene.cue.remove": {
      const record = requireExactFieldsV1(
        value,
        ["schemaRevision", "kind", "cueId"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        cueId: parseOperationIdV1(record.cueId, "cue", "/operation/cueId"),
      };
    }
    case "scene.cue.set_motion": {
      const record = requireExactFieldsV1(
        value,
        ["schemaRevision", "kind", "cueId", "motionId"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        cueId: parseOperationIdV1(record.cueId, "cue", "/operation/cueId"),
        motionId: parseNullableMotionIdV1(record.motionId, "/operation/motionId"),
      };
    }
    default:
      return rejectV1("scene_authoring.operation_kind_unknown", "/operation/kind");
  }
}

export function admitSceneAuthoringOperationV1(
  value: unknown,
): SceneAuthoringOperationAdmissionResultV1 {
  try {
    const record = normalizeRecordV1(
      value,
      "/operation",
      "scene_authoring.operation_payload_invalid",
    );
    const schemaRevision = record.schemaRevision;
    if (schemaRevision !== sceneAuthoringOperationSchemaRevisionV1) {
      return rejectV1(
        "scene_authoring.operation_schema_unsupported",
        "/operation/schemaRevision",
      );
    }
    const kind = record.kind;
    if (typeof kind !== "string") {
      return rejectV1("scene_authoring.operation_kind_unknown", "/operation/kind");
    }
    return { kind: "admitted", operation: admitKnownOperationV1(record, kind) };
  } catch (error) {
    return rejectionV1(error, "scene_authoring.operation_payload_invalid", "/operation");
  }
}
