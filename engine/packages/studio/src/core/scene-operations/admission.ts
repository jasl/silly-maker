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
  SceneAuthoringEnvelopeAdmissionResultV1,
  SceneAuthoringExecutionEnvelopeV1,
  SceneAuthoringOperationAdmissionResultV1,
  SceneAuthoringOperationV1,
} from "./contract.ts";
import { sceneAuthoringOperationSchemaRevisionV1 } from "./contract.ts";

const operationIdPatternV1 = /^(?:cue|motion)\.[a-z0-9_.-]+$/u;
const operationIdMaxLengthV1 = 96;
// Covers the longest admitted tag + appearance key + monotonic run suffix
// while keeping an explicit bound on non-UI envelopes.
const coalesceKeyMaxLengthV1 = 256;
const documentIdentityMaxLengthV1 = 200;

class SceneAuthoringAdmissionFailureV1 extends Error {
  readonly diagnostic: SceneAuthoringDiagnosticV1;

  constructor(code: SceneAuthoringDiagnosticCodeV1, path: string) {
    super(code);
    this.diagnostic = Object.freeze({ code, path });
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
    ? Object.freeze({ kind: "rejected", diagnostic: error.diagnostic })
    : Object.freeze({
      kind: "rejected",
      diagnostic: Object.freeze({ code: fallbackCode, path: fallbackPath }),
    });
}

function readRecordV1(
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
  code: SceneAuthoringDiagnosticCodeV1,
): Record<string, unknown> {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return rejectV1(code, path);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")) return rejectV1(code, path);
  const actual = keys as string[];
  const actualKeys = new Set(actual);
  if (
    actual.length !== expectedKeys.length ||
    !expectedKeys.every((key) => actualKeys.has(key))
  ) {
    return rejectV1(code, path);
  }
  const record: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
      return rejectV1(code, `${path}/${key}`);
    }
    record[key] = descriptor.value;
  }
  return record;
}

function readDiscriminatorV1(value: unknown, key: string): unknown {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return rejectV1("scene_authoring.operation_payload_invalid", "/operation");
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
    return rejectV1("scene_authoring.operation_payload_invalid", `/operation/${key}`);
  }
  return descriptor.value;
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
    const document = parseSceneDocumentV1({
      format: "sillymaker.scene",
      version: 1,
      sceneId: "scene.operation",
      label: "Operation",
      canvas: { width: 1, height: 1 },
      entries: [value],
      cues: [],
    }, path);
    const entry = document.entries[0];
    if (entry === undefined) return rejectV1("scene_authoring.operation_payload_invalid", path);
    return entry;
  } catch {
    return rejectV1("scene_authoring.operation_payload_invalid", path);
  }
}

function parseCueV1(value: unknown, path: string): SceneCueV1 {
  const cueRecord = readRecordV1(
    value,
    (() => {
      if (value === null || typeof value !== "object") return [];
      const keys = ["cueId", "kind", "tag"];
      if (Object.getOwnPropertyDescriptor(value, "motionId") !== undefined) keys.push("motionId");
      if (Object.getOwnPropertyDescriptor(value, "cut") !== undefined) keys.push("cut");
      return keys;
    })(),
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
      cues: [value],
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
  if (value === null) return Object.freeze({ key, value: null });
  let appearance: StageAppearanceV1;
  try {
    appearance = parseStageAppearanceV1({ [key]: value }, "/operation");
  } catch {
    return rejectV1("scene_authoring.operation_payload_invalid", "/operation/value");
  }
  return Object.freeze({ key, value: appearance[key] ?? null });
}

function operationAllowsCoalescingV1(operation: SceneAuthoringOperationV1): boolean {
  return operation.kind === "scene.entry.set_placement" ||
    operation.kind === "scene.entry.set_z_order" ||
    operation.kind === "scene.entry.set_appearance";
}

function admitKnownOperationV1(value: unknown, kind: string): SceneAuthoringOperationV1 {
  const schemaRevision = sceneAuthoringOperationSchemaRevisionV1;
  switch (kind) {
    case "scene.entry.set_placement": {
      const record = readRecordV1(
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
      return Object.freeze({
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
        placement,
      });
    }
    case "scene.entry.add": {
      const record = readRecordV1(
        value,
        ["schemaRevision", "kind", "entry"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return Object.freeze({
        schemaRevision,
        kind,
        entry: parseEntryV1(record.entry, "/operation/entry"),
      });
    }
    case "scene.entry.remove": {
      const record = readRecordV1(
        value,
        ["schemaRevision", "kind", "tag"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return Object.freeze({
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
      });
    }
    case "scene.entry.set_z_order": {
      const record = readRecordV1(
        value,
        ["schemaRevision", "kind", "tag", "zOrder"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return Object.freeze({
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
        zOrder: parseZOrderV1(record.zOrder, "/operation/zOrder"),
      });
    }
    case "scene.entry.set_appearance": {
      const record = readRecordV1(
        value,
        ["schemaRevision", "kind", "tag", "key", "value"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      const appearance = parseAppearanceFieldV1(record.key, record.value);
      return Object.freeze({
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
        key: appearance.key,
        value: appearance.value,
      });
    }
    case "scene.entry.set_ambient": {
      const record = readRecordV1(
        value,
        ["schemaRevision", "kind", "tag", "motionId"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return Object.freeze({
        schemaRevision,
        kind,
        tag: parseAtV1(parseStageTagV1, record.tag, "/operation/tag") as string,
        motionId: parseNullableMotionIdV1(record.motionId, "/operation/motionId"),
      });
    }
    case "scene.cue.add": {
      const record = readRecordV1(
        value,
        ["schemaRevision", "kind", "cue"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return Object.freeze({
        schemaRevision,
        kind,
        cue: parseCueV1(record.cue, "/operation/cue"),
      });
    }
    case "scene.cue.remove": {
      const record = readRecordV1(
        value,
        ["schemaRevision", "kind", "cueId"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return Object.freeze({
        schemaRevision,
        kind,
        cueId: parseOperationIdV1(record.cueId, "cue", "/operation/cueId"),
      });
    }
    case "scene.cue.set_motion": {
      const record = readRecordV1(
        value,
        ["schemaRevision", "kind", "cueId", "motionId"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return Object.freeze({
        schemaRevision,
        kind,
        cueId: parseOperationIdV1(record.cueId, "cue", "/operation/cueId"),
        motionId: parseNullableMotionIdV1(record.motionId, "/operation/motionId"),
      });
    }
    default:
      return rejectV1("scene_authoring.operation_kind_unknown", "/operation/kind");
  }
}

export function admitSceneAuthoringOperationV1(
  value: unknown,
): SceneAuthoringOperationAdmissionResultV1 {
  try {
    const schemaRevision = readDiscriminatorV1(value, "schemaRevision");
    if (schemaRevision !== sceneAuthoringOperationSchemaRevisionV1) {
      return rejectV1(
        "scene_authoring.operation_schema_unsupported",
        "/operation/schemaRevision",
      );
    }
    const kind = readDiscriminatorV1(value, "kind");
    if (typeof kind !== "string") {
      return rejectV1("scene_authoring.operation_kind_unknown", "/operation/kind");
    }
    return Object.freeze({ kind: "admitted", operation: admitKnownOperationV1(value, kind) });
  } catch (error) {
    return rejectionV1(error, "scene_authoring.operation_payload_invalid", "/operation");
  }
}

export function admitSceneAuthoringEnvelopeV1(
  value: unknown,
): SceneAuthoringEnvelopeAdmissionResultV1 {
  try {
    const hasCoalesceKey = value !== null && typeof value === "object" &&
      Object.getOwnPropertyDescriptor(value, "coalesceKey") !== undefined;
    const record = readRecordV1(
      value,
      [
        "documentIdentity",
        "expectedDraftRevision",
        "operation",
        ...(hasCoalesceKey ? ["coalesceKey"] : []),
      ],
      "/envelope",
      "scene_authoring.envelope_invalid",
    );
    if (
      typeof record.documentIdentity !== "string" || record.documentIdentity.length === 0 ||
      record.documentIdentity.length > documentIdentityMaxLengthV1
    ) {
      return rejectV1("scene_authoring.envelope_invalid", "/envelope/documentIdentity");
    }
    if (
      typeof record.expectedDraftRevision !== "number" ||
      !Number.isSafeInteger(record.expectedDraftRevision) || record.expectedDraftRevision < 0
    ) {
      return rejectV1("scene_authoring.envelope_invalid", "/envelope/expectedDraftRevision");
    }
    const coalesceKey = record.coalesceKey;
    if (
      coalesceKey !== undefined &&
      (typeof coalesceKey !== "string" || coalesceKey.length === 0 ||
        coalesceKey.length > coalesceKeyMaxLengthV1)
    ) {
      return rejectV1("scene_authoring.envelope_invalid", "/envelope/coalesceKey");
    }
    const operation = admitSceneAuthoringOperationV1(record.operation);
    if (operation.kind === "rejected") return operation;
    if (coalesceKey !== undefined && !operationAllowsCoalescingV1(operation.operation)) {
      return rejectV1("scene_authoring.envelope_invalid", "/envelope/coalesceKey");
    }
    const envelope: SceneAuthoringExecutionEnvelopeV1 = Object.freeze({
      documentIdentity: record.documentIdentity,
      expectedDraftRevision: record.expectedDraftRevision,
      operation: operation.operation,
      ...(coalesceKey === undefined ? {} : { coalesceKey }),
    }) as SceneAuthoringExecutionEnvelopeV1;
    return Object.freeze({ kind: "admitted", envelope });
  } catch (error) {
    return rejectionV1(error, "scene_authoring.envelope_invalid", "/envelope");
  }
}
