// SPDX-License-Identifier: MIT
import type { AgentHostInternalV1 } from "@sillymaker/agent/internal";
import { createAgentHostInternalV1 } from "@sillymaker/agent/internal";

import type {
  EmbeddedAuthoringCompanionDefinitionInternalV1,
  EmbeddedAuthoringCompanionOwnerInternalV1,
  EmbeddedAuthoringCompanionRenderInputInternalV1,
} from "../core/embedded-authoring-companion.ts";
import type { ExperimentalEmbeddedAgentBindingInternalV1 } from "./binding.ts";
import { EmbeddedAgentSurfaceInternalV1 } from "./embedded-agent-surface.tsx";

interface ExperimentalEmbeddedAgentOwnerInternalV1
  extends EmbeddedAuthoringCompanionOwnerInternalV1 {
  readonly host: AgentHostInternalV1;
}

/** Selected only by the private Agent entry; absent from Authoring-only graphs. */
export function createExperimentalEmbeddedAgentCompanionInternalV1(
  binding: ExperimentalEmbeddedAgentBindingInternalV1,
): EmbeddedAuthoringCompanionDefinitionInternalV1 {
  return {
    compatibilityId: binding.configurationId,
    contentSignature: binding.actionSignature,
    createOwner(): ExperimentalEmbeddedAgentOwnerInternalV1 {
      const host = createAgentHostInternalV1({
        client: binding.createClient(),
        allowedActionIds: binding.allowedActionIds,
      });
      let disposed = false;
      return {
        host,
        async dispose(): Promise<void> {
          if (disposed) return;
          disposed = true;
          await host.dispose();
        },
      };
    },
    render(
      owner: EmbeddedAuthoringCompanionOwnerInternalV1,
      renderInput: EmbeddedAuthoringCompanionRenderInputInternalV1,
    ) {
      const agentOwner = owner as ExperimentalEmbeddedAgentOwnerInternalV1;
      return (
        <EmbeddedAgentSurfaceInternalV1
          host={agentOwner.host}
          binding={binding}
          sceneOperations={renderInput.sceneOperations}
          authoringRevision={renderInput.authoringRevision}
          publicationRole={renderInput.publicationRole}
        />
      );
    },
  };
}
