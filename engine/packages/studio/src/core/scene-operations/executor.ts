// SPDX-License-Identifier: MIT
import type { SceneDocumentV1 } from "@sillymaker/base";
import type { AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type {
  SceneAuthoringDiagnosticCodeV1,
  SceneAuthoringExecutionEnvelopeV1,
  SceneAuthoringExecutionResultV1,
  SceneAuthoringOperationExecutorV1,
} from "./contract.ts";
import { reduceSceneAuthoringOperationV1 } from "./reducer.ts";

function rejectedV1(
  code: SceneAuthoringDiagnosticCodeV1,
  path: string,
): SceneAuthoringExecutionResultV1 {
  return Object.freeze({
    kind: "rejected",
    diagnostic: Object.freeze({ code, path }),
  });
}

function unreachableV1(value: never): never {
  void value;
  throw new TypeError("Unreachable Scene authoring replacement result");
}

/**
 * Binds the pure Scene reducer to exactly one existing document session.
 * Stale envelopes are rejected before reduction, then the session performs
 * a second identity/revision CAS before the single history commit.
 */
export function createSceneAuthoringOperationExecutorV1(
  session: AuthoringDocumentSessionV1<SceneDocumentV1>,
): SceneAuthoringOperationExecutorV1 {
  return Object.freeze({
    execute(envelope: SceneAuthoringExecutionEnvelopeV1): SceneAuthoringExecutionResultV1 {
      const current = session.getSnapshot();
      if (current.documentIdentity === null || current.draft === null) {
        return rejectedV1("scene_authoring.document_unavailable", "/envelope/documentIdentity");
      }
      if (current.documentIdentity !== envelope.documentIdentity) {
        return rejectedV1("scene_authoring.document_stale", "/envelope/documentIdentity");
      }
      if (current.draftRevision !== envelope.expectedDraftRevision) {
        return rejectedV1("scene_authoring.revision_stale", "/envelope/expectedDraftRevision");
      }

      const reduction = reduceSceneAuthoringOperationV1(current.draft, envelope.operation);
      if (reduction.kind === "rejected") return reduction;

      const replaced = session.replaceDraftIfCurrent({
        documentIdentity: envelope.documentIdentity,
        expectedDraftRevision: envelope.expectedDraftRevision,
        document: reduction.document,
        ...(envelope.coalesceKey === undefined ? {} : { coalesceKey: envelope.coalesceKey }),
      });
      switch (replaced.kind) {
        case "ok":
          return Object.freeze({
            kind: "applied",
            documentIdentity: envelope.documentIdentity,
            draftRevision: replaced.draftRevision,
          });
        case "stale_document":
          return rejectedV1("scene_authoring.document_stale", "/envelope/documentIdentity");
        case "stale_revision":
          return rejectedV1("scene_authoring.revision_stale", "/envelope/expectedDraftRevision");
        case "not_ready":
          return rejectedV1(
            "scene_authoring.document_unavailable",
            "/envelope/documentIdentity",
          );
        case "unchanged":
          return rejectedV1("scene_authoring.no_change", "/operation");
      }
      return unreachableV1(replaced);
    },
  });
}
