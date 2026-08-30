// SPDX-License-Identifier: MIT
import type { AgentSessionClientV1 } from "@sillymaker/agent/session";

import { admitSceneAuthoringOperationV1 } from "../core/scene-operations/admission.ts";
import type { SceneAuthoringOperationV1 } from "../core/scene-operations/contract.ts";

const configurationIdPatternInternalV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;
const actionIdPatternInternalV1 = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)+$/u;

export interface ExperimentalEmbeddedAgentBindingInputInternalV1 {
  readonly configurationId: string;
  readonly createClient: () => AgentSessionClientV1;
  /** Trusted product-side actions. Remote Artifacts carry only these IDs. */
  readonly sceneActions: Readonly<Record<string, unknown>>;
}

export interface ExperimentalEmbeddedAgentBindingInternalV1 {
  readonly configurationId: string;
  readonly actionSignature: string;
  readonly allowedActionIds: readonly string[];
  readonly sceneActions: Readonly<Record<string, SceneAuthoringOperationV1>>;
  readonly createClient: () => AgentSessionClientV1;
}

function admitSceneActionsInternalV1(
  value: Readonly<Record<string, unknown>>,
): {
  readonly actionIds: readonly string[];
  readonly actions: Readonly<Record<string, SceneAuthoringOperationV1>>;
} {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Experimental Agent scene actions must be a record");
  }
  const actionIds = Object.keys(value).toSorted();
  if (actionIds.length === 0) {
    throw new TypeError("Experimental Agent scene actions must contain string keys");
  }
  const actions: Record<string, SceneAuthoringOperationV1> = {};
  for (const actionId of actionIds) {
    if (actionId.length > 128 || !actionIdPatternInternalV1.test(actionId)) {
      throw new TypeError(`Experimental Agent action ID is invalid: ${actionId}`);
    }
    const admitted = admitSceneAuthoringOperationV1(value[actionId]);
    if (admitted.kind === "rejected") {
      throw new TypeError(
        `Experimental Agent action ${actionId} is invalid: ${admitted.diagnostic.code}`,
      );
    }
    actions[actionId] = admitted.operation;
  }
  return { actionIds, actions };
}

/**
 * Admits the private Agent-specific half before it is attached through the
 * neutral embedded Authoring companion bridge.
 */
export function admitExperimentalEmbeddedAgentBindingInternalV1(
  input: ExperimentalEmbeddedAgentBindingInputInternalV1,
): ExperimentalEmbeddedAgentBindingInternalV1 {
  if (
    input.configurationId.length > 96 ||
    !configurationIdPatternInternalV1.test(input.configurationId)
  ) {
    throw new TypeError("Experimental Agent configuration ID is invalid");
  }
  if (typeof input.createClient !== "function") {
    throw new TypeError("Experimental Agent client factory is required");
  }
  const admitted = admitSceneActionsInternalV1(input.sceneActions);
  return {
    configurationId: input.configurationId,
    actionSignature: admitted.actionIds.join("\u001f"),
    allowedActionIds: admitted.actionIds,
    sceneActions: admitted.actions,
    createClient: input.createClient,
  };
}
