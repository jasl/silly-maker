// SPDX-License-Identifier: MIT
import type { SceneDocumentV1 } from "@sillymaker/base";
import type { AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type {
  SceneAuthoringExecutionEnvelopeV1,
  SceneAuthoringExecutionResultV1,
  SceneAuthoringLocalAdapterV1,
} from "./contract.ts";
import { createSceneAuthoringOperationExecutorV1 } from "./executor.ts";

/**
 * Narrow package-private local/dev port shared by React and framework-free
 * callers. Its typed collaborators have already admitted external operations;
 * it exposes no path, IO, save, or Session.
 */
export function createSceneAuthoringLocalAdapterV1(
  session: AuthoringDocumentSessionV1<SceneDocumentV1>,
): SceneAuthoringLocalAdapterV1 {
  const executor = createSceneAuthoringOperationExecutorV1(session);
  return {
    current() {
      const snapshot = session.getSnapshot();
      return snapshot.documentIdentity === null || snapshot.draft === null ? null : {
        documentIdentity: snapshot.documentIdentity,
        draftRevision: snapshot.draftRevision,
      };
    },
    execute(envelope: SceneAuthoringExecutionEnvelopeV1): SceneAuthoringExecutionResultV1 {
      return executor.execute(envelope);
    },
  };
}
