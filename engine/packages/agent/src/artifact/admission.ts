// SPDX-License-Identifier: MIT
import {
  type BoundedCanonicalJsonLimitsInternalV1,
  projectBoundedCanonicalJsonInternalV1,
} from "@sillymaker/base/runtime/internal";

import type {
  UiArtifactAdmissionResultInternalV1,
  UiArtifactDiagnosticInternalV1,
  UiArtifactDocumentInternalV1,
  UiArtifactNodeInternalV1,
  UiArtifactRevisionInternalV1,
  UiIntentAdmissionResultInternalV1,
  UiIntentDiagnosticInternalV1,
} from "./contract.ts";
import {
  uiArtifactSchemaRevisionInternalV1,
  uiIntentSchemaRevisionInternalV1,
} from "./contract.ts";

const artifactProjectionLimitsInternalV1: BoundedCanonicalJsonLimitsInternalV1 = {
  maxBytes: 65_536 as BoundedCanonicalJsonLimitsInternalV1["maxBytes"],
  maxDepth: 12 as BoundedCanonicalJsonLimitsInternalV1["maxDepth"],
  maxNodes: 1_024 as BoundedCanonicalJsonLimitsInternalV1["maxNodes"],
};
const intentProjectionLimitsInternalV1: BoundedCanonicalJsonLimitsInternalV1 = {
  maxBytes: 2_048 as BoundedCanonicalJsonLimitsInternalV1["maxBytes"],
  maxDepth: 3 as BoundedCanonicalJsonLimitsInternalV1["maxDepth"],
  maxNodes: 16 as BoundedCanonicalJsonLimitsInternalV1["maxNodes"],
};
const identifierPatternInternalV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const maxArtifactTreeDepthInternalV1 = 8;
const maxArtifactNodesInternalV1 = 128;
const maxArtifactChildrenInternalV1 = 32;
const maxArtifactTextInternalV1 = 4_096;

type CanonicalRecordInternalV1 = Readonly<Record<string, unknown>>;

class ArtifactAdmissionFailureInternalV1 extends Error {
  readonly diagnostic: UiArtifactDiagnosticInternalV1;

  constructor(code: UiArtifactDiagnosticInternalV1["code"], path: string) {
    super(code);
    this.diagnostic = { code, path };
  }
}

function artifactRejectInternalV1(
  code: UiArtifactDiagnosticInternalV1["code"],
  path: string,
): never {
  throw new ArtifactAdmissionFailureInternalV1(code, path);
}

function exactRecordInternalV1(
  value: unknown,
  keys: readonly string[],
  path: string,
): CanonicalRecordInternalV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return artifactRejectInternalV1("artifact.payload_invalid", path);
  }
  const actual = Object.keys(value);
  if (actual.length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) {
    return artifactRejectInternalV1("artifact.payload_invalid", path);
  }
  return value as CanonicalRecordInternalV1;
}

function identifierInternalV1(value: unknown, path: string): string {
  if (typeof value !== "string" || !identifierPatternInternalV1.test(value)) {
    return artifactRejectInternalV1("artifact.payload_invalid", path);
  }
  return value;
}

function textInternalV1(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length > maxArtifactTextInternalV1) {
    return artifactRejectInternalV1("artifact.payload_invalid", path);
  }
  return value;
}

export function admitUiArtifactCandidateInternalV1(
  value: unknown,
  allowedActionIds: readonly string[],
): UiArtifactAdmissionResultInternalV1 {
  const allowed = new Set<string>();
  for (const actionId of allowedActionIds) {
    if (!identifierPatternInternalV1.test(actionId) || allowed.has(actionId)) {
      throw new TypeError("UiArtifact allowed action IDs must be unique bounded identifiers");
    }
    allowed.add(actionId);
  }
  let projection: ReturnType<typeof projectBoundedCanonicalJsonInternalV1>;
  try {
    projection = projectBoundedCanonicalJsonInternalV1(value, artifactProjectionLimitsInternalV1);
  } catch {
    return {
      kind: "rejected",
      diagnostic: { code: "artifact.canonical_invalid", path: "/" },
    };
  }
  if (projection.kind === "rejected") {
    return {
      kind: "rejected",
      diagnostic: {
        code: projection.code === "canonical.invalid"
          ? "artifact.canonical_invalid"
          : "artifact.limit_exceeded",
        path: "/",
      },
    };
  }

  const nodeIds = new Set<string>();
  let nodeCount = 0;
  const parseNode = (candidate: unknown, path: string, depth: number): UiArtifactNodeInternalV1 => {
    if (depth > maxArtifactTreeDepthInternalV1 || ++nodeCount > maxArtifactNodesInternalV1) {
      return artifactRejectInternalV1("artifact.limit_exceeded", path);
    }
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
      return artifactRejectInternalV1("artifact.payload_invalid", path);
    }
    const kind = (candidate as CanonicalRecordInternalV1).kind;
    if (typeof kind !== "string") {
      return artifactRejectInternalV1("artifact.payload_invalid", `${path}/kind`);
    }
    const admitNodeId = (raw: unknown): string => {
      const nodeId = identifierInternalV1(raw, `${path}/nodeId`);
      if (nodeIds.has(nodeId)) {
        return artifactRejectInternalV1("artifact.node_duplicate", `${path}/nodeId`);
      }
      nodeIds.add(nodeId);
      return nodeId;
    };
    switch (kind) {
      case "column": {
        const record = exactRecordInternalV1(candidate, ["kind", "nodeId", "children"], path);
        const nodeId = admitNodeId(record.nodeId);
        if (
          !Array.isArray(record.children) ||
          record.children.length > maxArtifactChildrenInternalV1
        ) return artifactRejectInternalV1("artifact.limit_exceeded", `${path}/children`);
        const children = record.children.map((child, index) =>
          parseNode(child, `${path}/children/${index}`, depth + 1)
        );
        return { kind: "column", nodeId, children };
      }
      case "text": {
        const record = exactRecordInternalV1(candidate, ["kind", "nodeId", "text"], path);
        return {
          kind: "text",
          nodeId: admitNodeId(record.nodeId),
          text: textInternalV1(record.text, `${path}/text`),
        };
      }
      case "action": {
        const record = exactRecordInternalV1(
          candidate,
          ["kind", "nodeId", "label", "actionId"],
          path,
        );
        const actionId = identifierInternalV1(record.actionId, `${path}/actionId`);
        if (!allowed.has(actionId)) {
          return artifactRejectInternalV1("artifact.action_unknown", `${path}/actionId`);
        }
        return {
          kind: "action",
          nodeId: admitNodeId(record.nodeId),
          label: textInternalV1(record.label, `${path}/label`),
          actionId,
        };
      }
      default:
        return artifactRejectInternalV1("artifact.node_unknown", `${path}/kind`);
    }
  };

  try {
    const document = exactRecordInternalV1(
      projection.value,
      ["schemaRevision", "root"],
      "/",
    );
    if (document.schemaRevision !== uiArtifactSchemaRevisionInternalV1) {
      return {
        kind: "rejected",
        diagnostic: {
          code: "artifact.schema_unsupported",
          path: "/schemaRevision",
        },
      };
    }
    const admitted: UiArtifactDocumentInternalV1 = {
      schemaRevision: uiArtifactSchemaRevisionInternalV1,
      root: parseNode(document.root, "/root", 1),
    };
    return { kind: "admitted", document: admitted };
  } catch (error) {
    if (error instanceof ArtifactAdmissionFailureInternalV1) {
      return { kind: "rejected", diagnostic: error.diagnostic };
    }
    return {
      kind: "rejected",
      diagnostic: { code: "artifact.payload_invalid", path: "/" },
    };
  }
}

export function createUiArtifactRevisionInternalV1(input: {
  readonly hostIdentity: number;
  readonly revision: number;
  readonly sessionId: string;
  readonly runId: string;
  readonly completedSequence: number;
  readonly document: UiArtifactDocumentInternalV1;
}): UiArtifactRevisionInternalV1 {
  for (const value of [input.hostIdentity, input.revision, input.completedSequence]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError("UiArtifact revision identity must be a positive safe integer");
    }
  }
  return {
    hostIdentity: input.hostIdentity,
    revision: input.revision,
    source: {
      sessionId: input.sessionId,
      runId: input.runId,
      completedSequence: input.completedSequence,
    },
    document: input.document,
  };
}

function intentDiagnosticInternalV1(
  code: UiIntentDiagnosticInternalV1["code"],
  path: string,
): UiIntentAdmissionResultInternalV1 {
  return { kind: "rejected", diagnostic: { code, path } };
}

function findActionInternalV1(
  node: UiArtifactNodeInternalV1,
  nodeId: string,
): Extract<UiArtifactNodeInternalV1, { readonly kind: "action" }> | null {
  if (node.nodeId === nodeId) return node.kind === "action" ? node : null;
  if (node.kind !== "column") return null;
  for (const child of node.children) {
    const found = findActionInternalV1(child, nodeId);
    if (found !== null) return found;
  }
  return null;
}

export function admitUiIntentInternalV1(
  value: unknown,
  current: UiArtifactRevisionInternalV1 | null,
): UiIntentAdmissionResultInternalV1 {
  let projection: ReturnType<typeof projectBoundedCanonicalJsonInternalV1>;
  try {
    projection = projectBoundedCanonicalJsonInternalV1(value, intentProjectionLimitsInternalV1);
  } catch {
    return intentDiagnosticInternalV1("ui_intent.invalid", "/");
  }
  if (projection.kind === "rejected") {
    return intentDiagnosticInternalV1("ui_intent.invalid", "/");
  }
  const candidate = projection.value;
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return intentDiagnosticInternalV1("ui_intent.invalid", "/");
  }
  const record = candidate as CanonicalRecordInternalV1;
  const keys = Object.keys(record);
  const expectedKeys = [
    "schemaRevision",
    "kind",
    "hostIdentity",
    "artifactRevision",
    "nodeId",
    "actionId",
  ];
  if (
    keys.length !== expectedKeys.length || !expectedKeys.every((key) => keys.includes(key)) ||
    record.schemaRevision !== uiIntentSchemaRevisionInternalV1 ||
    record.kind !== "ui.action.invoke" ||
    typeof record.hostIdentity !== "number" || !Number.isSafeInteger(record.hostIdentity) ||
    typeof record.artifactRevision !== "number" || !Number.isSafeInteger(record.artifactRevision) ||
    typeof record.nodeId !== "string" || !identifierPatternInternalV1.test(record.nodeId) ||
    typeof record.actionId !== "string" || !identifierPatternInternalV1.test(record.actionId)
  ) return intentDiagnosticInternalV1("ui_intent.invalid", "/");
  if (current === null || record.hostIdentity !== current.hostIdentity) {
    return intentDiagnosticInternalV1("ui_intent.host_stale", "/hostIdentity");
  }
  if (record.artifactRevision !== current.revision) {
    return intentDiagnosticInternalV1("ui_intent.artifact_stale", "/artifactRevision");
  }
  const action = findActionInternalV1(current.document.root, record.nodeId);
  if (action === null || action.actionId !== record.actionId) {
    return intentDiagnosticInternalV1("ui_intent.action_mismatch", "/actionId");
  }
  return {
    kind: "admitted",
    intent: {
      schemaRevision: uiIntentSchemaRevisionInternalV1,
      kind: "ui.action.invoke",
      hostIdentity: current.hostIdentity,
      artifactRevision: current.revision,
      nodeId: record.nodeId,
      actionId: record.actionId,
    },
  };
}
