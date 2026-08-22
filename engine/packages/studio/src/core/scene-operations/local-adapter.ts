// SPDX-License-Identifier: MIT
import type { SceneDocumentV1 } from "@sillymaker/base";
import type { AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import { admitSceneAuthoringEnvelopeV1 } from "./admission.ts";
import type {
  SceneAuthoringExecutionEnvelopeV1,
  SceneAuthoringExecutionResultV1,
  SceneAuthoringLocalAdapterV1,
} from "./contract.ts";
import { createSceneAuthoringOperationExecutorV1 } from "./executor.ts";

/**
 * Narrow local/dev port shared by React and framework-free callers. It
 * admits the serialized envelope but exposes no path, IO, save, or Session.
 */
export function createSceneAuthoringLocalAdapterV1(
  session: AuthoringDocumentSessionV1<SceneDocumentV1>,
): SceneAuthoringLocalAdapterV1 {
  const executor = createSceneAuthoringOperationExecutorV1(session);
  return Object.freeze({
    current() {
      const snapshot = session.getSnapshot();
      return snapshot.documentIdentity === null || snapshot.draft === null ? null : Object.freeze({
        documentIdentity: snapshot.documentIdentity,
        draftRevision: snapshot.draftRevision,
      });
    },
    execute(envelope: SceneAuthoringExecutionEnvelopeV1): SceneAuthoringExecutionResultV1 {
      const admission = admitSceneAuthoringEnvelopeV1(envelope);
      return admission.kind === "rejected" ? admission : executor.execute(admission.envelope);
    },
  });
}
