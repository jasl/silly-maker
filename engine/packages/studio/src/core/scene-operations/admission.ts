// SPDX-License-Identifier: MIT
import { parseStageContentIdV1, parseStageLayerIdV1, parseStageTagV1 } from "@sillymaker/base";
import type { StagePlacementV1 } from "@sillymaker/base";

import type {
  SceneAuthoringDiagnosticCodeV1,
  SceneAuthoringDiagnosticV1,
  SceneAuthoringEnvelopeAdmissionResultV1,
  SceneAuthoringExecutionEnvelopeV1,
  SceneAuthoringOperationAdmissionResultV1,
  SceneAuthoringOperationV1,
} from "./contract.ts";
import { sceneAuthoringOperationSchemaRevisionV1 } from "./contract.ts";

const coalesceKeyMaxLengthV1 = 256;
const documentIdentityMaxLengthV1 = 200;
const appearanceKeyPatternV1 = /^[a-z][a-z0-9_]*$/u;
const appearanceValuePatternV1 = /^[a-z0-9][a-z0-9_.-]*$/u;

class SceneAuthoringAdmissionFailureV1 extends Error {
  readonly diagnostic: SceneAuthoringDiagnosticV1;

  constructor(code: SceneAuthoringDiagnosticCodeV1, path: string) {
    super(code);
    this.diagnostic = { code, path };
  }
}

function rejectV1(code: SceneAuthoringDiagnosticCodeV1, path: string): never {
  throw new SceneAuthoringAdmissionFailureV1(code, path);
}

function rejectionV1(
  error: unknown,
  fallbackCode: SceneAuthoringDiagnosticCodeV1,
  fallbackPath: string,
): { readonly kind: "rejected"; readonly diagnostic: SceneAuthoringDiagnosticV1 } {
  return error instanceof SceneAuthoringAdmissionFailureV1
    ? { kind: "rejected", diagnostic: error.diagnostic }
    : { kind: "rejected", diagnostic: { code: fallbackCode, path: fallbackPath } };
}

/** Ordinary JSON-record admission. Parsed data is not an object-authenticity boundary. */
function recordV1(
  value: unknown,
  expectedKeys: readonly string[],
  path: string,
  code: SceneAuthoringDiagnosticCodeV1,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return rejectV1(code, path);
  }
  const record = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(record);
  if (
    keys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(record, key))
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

function parseAppearanceFieldV1(
  keyValue: unknown,
  value: unknown,
): { readonly key: string; readonly value: string | null } {
  if (
    typeof keyValue !== "string" || keyValue.length > 64 ||
    !appearanceKeyPatternV1.test(keyValue)
  ) {
    return rejectV1("scene_authoring.operation_payload_invalid", "/operation/key");
  }
  if (value === null) return { key: keyValue, value: null };
  if (
    typeof value !== "string" || value.length > 64 ||
    !appearanceValuePatternV1.test(value)
  ) {
    return rejectV1("scene_authoring.operation_payload_invalid", "/operation/value");
  }
  return { key: keyValue, value };
}

function boundedIntegerV1(
  value: unknown,
  minimum: number,
  maximum: number,
  path: string,
): number {
  if (
    typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum ||
    value > maximum
  ) {
    return rejectV1("scene_authoring.operation_payload_invalid", path);
  }
  return value;
}

function parseLocalTransformV1(value: unknown): StagePlacementV1 {
  const input = recordV1(
    value,
    ["x", "y", "scalePermille", "opacityPermille", "mirrored"],
    "/operation/localTransform",
    "scene_authoring.operation_payload_invalid",
  );
  if (typeof input.mirrored !== "boolean") {
    return rejectV1(
      "scene_authoring.operation_payload_invalid",
      "/operation/localTransform/mirrored",
    );
  }
  return {
    x: boundedIntegerV1(input.x, -1_000_000, 1_000_000, "/operation/localTransform/x"),
    y: boundedIntegerV1(input.y, -1_000_000, 1_000_000, "/operation/localTransform/y"),
    scalePermille: boundedIntegerV1(
      input.scalePermille,
      1,
      100_000,
      "/operation/localTransform/scalePermille",
    ),
    opacityPermille: boundedIntegerV1(
      input.opacityPermille,
      0,
      1_000,
      "/operation/localTransform/opacityPermille",
    ),
    mirrored: input.mirrored,
  };
}

function nullableTagV1(value: unknown, path: string): ReturnType<typeof parseStageTagV1> | null {
  return value === null ? null : parseAtV1(parseStageTagV1, value, path);
}

function nullableLayerIdV1(
  value: unknown,
  path: string,
): ReturnType<typeof parseStageLayerIdV1> | null {
  return value === null ? null : parseAtV1(parseStageLayerIdV1, value, path);
}

function operationAllowsCoalescingV1(operation: SceneAuthoringOperationV1): boolean {
  return operation.kind === "scene.object.set_local_transform" ||
    operation.kind === "scene.object.set_appearance";
}

function admitKnownOperationV1(value: unknown, kind: string): SceneAuthoringOperationV1 {
  const schemaRevision = sceneAuthoringOperationSchemaRevisionV1;
  switch (kind) {
    case "scene.object.set_local_transform": {
      const input = recordV1(
        value,
        ["schemaRevision", "kind", "objectId", "localTransform"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      const localTransform = parseLocalTransformV1(input.localTransform);
      return {
        schemaRevision,
        kind,
        objectId: parseAtV1(parseStageTagV1, input.objectId, "/operation/objectId"),
        localTransform,
      };
    }
    case "scene.object.set_visual_content": {
      const input = recordV1(
        value,
        ["schemaRevision", "kind", "objectId", "contentId"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        objectId: parseAtV1(parseStageTagV1, input.objectId, "/operation/objectId"),
        contentId: parseAtV1(
          parseStageContentIdV1,
          input.contentId,
          "/operation/contentId",
        ),
      };
    }
    case "scene.object.set_appearance": {
      const input = recordV1(
        value,
        ["schemaRevision", "kind", "objectId", "key", "value"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      const appearance = parseAppearanceFieldV1(input.key, input.value);
      return {
        schemaRevision,
        kind,
        objectId: parseAtV1(parseStageTagV1, input.objectId, "/operation/objectId"),
        key: appearance.key,
        value: appearance.value,
      };
    }
    case "scene.object.move_before": {
      const input = recordV1(
        value,
        ["schemaRevision", "kind", "objectId", "beforeObjectId"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        objectId: parseAtV1(parseStageTagV1, input.objectId, "/operation/objectId"),
        beforeObjectId: nullableTagV1(input.beforeObjectId, "/operation/beforeObjectId"),
      };
    }
    case "scene.layer.move_before": {
      const input = recordV1(
        value,
        ["schemaRevision", "kind", "layerId", "beforeLayerId"],
        "/operation",
        "scene_authoring.operation_payload_invalid",
      );
      return {
        schemaRevision,
        kind,
        layerId: parseAtV1(parseStageLayerIdV1, input.layerId, "/operation/layerId"),
        beforeLayerId: nullableLayerIdV1(input.beforeLayerId, "/operation/beforeLayerId"),
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
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return rejectV1("scene_authoring.operation_payload_invalid", "/operation");
    }
    const input = value as Readonly<Record<string, unknown>>;
    if (input.schemaRevision !== sceneAuthoringOperationSchemaRevisionV1) {
      return rejectV1(
        "scene_authoring.operation_schema_unsupported",
        "/operation/schemaRevision",
      );
    }
    if (typeof input.kind !== "string") {
      return rejectV1("scene_authoring.operation_kind_unknown", "/operation/kind");
    }
    return { kind: "admitted", operation: admitKnownOperationV1(value, input.kind) };
  } catch (error) {
    return rejectionV1(error, "scene_authoring.operation_payload_invalid", "/operation");
  }
}

export function admitSceneAuthoringEnvelopeV1(
  value: unknown,
): SceneAuthoringEnvelopeAdmissionResultV1 {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return rejectV1("scene_authoring.envelope_invalid", "/envelope");
    }
    const candidate = value as Readonly<Record<string, unknown>>;
    const hasCoalesceKey = Object.hasOwn(candidate, "coalesceKey");
    const input = recordV1(
      candidate,
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
      typeof input.documentIdentity !== "string" || input.documentIdentity.length === 0 ||
      input.documentIdentity.length > documentIdentityMaxLengthV1
    ) {
      return rejectV1("scene_authoring.envelope_invalid", "/envelope/documentIdentity");
    }
    if (
      typeof input.expectedDraftRevision !== "number" ||
      !Number.isSafeInteger(input.expectedDraftRevision) || input.expectedDraftRevision < 0
    ) {
      return rejectV1("scene_authoring.envelope_invalid", "/envelope/expectedDraftRevision");
    }
    const coalesceKey = input.coalesceKey;
    if (
      coalesceKey !== undefined &&
      (typeof coalesceKey !== "string" || coalesceKey.length === 0 ||
        coalesceKey.length > coalesceKeyMaxLengthV1)
    ) {
      return rejectV1("scene_authoring.envelope_invalid", "/envelope/coalesceKey");
    }
    const operation = admitSceneAuthoringOperationV1(input.operation);
    if (operation.kind === "rejected") return operation;
    if (coalesceKey !== undefined && !operationAllowsCoalescingV1(operation.operation)) {
      return rejectV1("scene_authoring.envelope_invalid", "/envelope/coalesceKey");
    }
    const envelope: SceneAuthoringExecutionEnvelopeV1 = {
      documentIdentity: input.documentIdentity,
      expectedDraftRevision: input.expectedDraftRevision,
      operation: operation.operation,
      ...(coalesceKey === undefined ? {} : { coalesceKey }),
    };
    return { kind: "admitted", envelope };
  } catch (error) {
    return rejectionV1(error, "scene_authoring.envelope_invalid", "/envelope");
  }
}
