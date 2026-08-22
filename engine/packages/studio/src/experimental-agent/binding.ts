// SPDX-License-Identifier: MIT
import type { AgentRpcClientPortInternalV1 } from "@sillymaker/agent/internal";

import type { StudioBindingV1 } from "../core/binding.ts";
import { admitSceneAuthoringOperationV1 } from "../core/scene-operations/admission.ts";
import type { SceneAuthoringOperationV1 } from "../core/scene-operations/contract.ts";

const configurationIdPatternInternalV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/u;
const actionIdPatternInternalV1 = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)+$/u;

export interface ExperimentalEmbeddedAgentBindingInputInternalV1 {
  readonly configurationId: string;
  readonly createClient: () => AgentRpcClientPortInternalV1;
  /** Trusted product-side actions. Remote Artifacts carry only these IDs. */
  readonly sceneActions: Readonly<Record<string, unknown>>;
}

export interface ExperimentalEmbeddedAgentBindingInternalV1 {
  readonly configurationId: string;
  readonly actionSignature: string;
  readonly allowedActionIds: readonly string[];
  readonly sceneActions: Readonly<Record<string, SceneAuthoringOperationV1>>;
  readonly createClient: () => AgentRpcClientPortInternalV1;
}

const agentBindingsInternalV1 = new WeakMap<
  StudioBindingV1,
  ExperimentalEmbeddedAgentBindingInternalV1
>();

function admitSceneActionsInternalV1(
  value: Readonly<Record<string, unknown>>,
): {
  readonly actionIds: readonly string[];
  readonly actions: Readonly<Record<string, SceneAuthoringOperationV1>>;
} {
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError("Experimental Agent scene actions must be a plain record");
  }
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some((key) => typeof key === "symbol") || ownKeys.length === 0 || ownKeys.length > 32
  ) {
    throw new TypeError("Experimental Agent scene actions must contain 1-32 string keys");
  }
  const actions: Record<string, SceneAuthoringOperationV1> = {};
  for (const actionId of (ownKeys as string[]).toSorted()) {
    if (actionId.length > 128 || !actionIdPatternInternalV1.test(actionId)) {
      throw new TypeError(`Experimental Agent action ID is invalid: ${actionId}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, actionId);
    if (
      descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined ||
      !("value" in descriptor)
    ) {
      throw new TypeError(`Experimental Agent action must be inert data: ${actionId}`);
    }
    const admitted = admitSceneAuthoringOperationV1(descriptor.value);
    if (admitted.kind === "rejected") {
      throw new TypeError(
        `Experimental Agent action ${actionId} is invalid: ${admitted.diagnostic.code}`,
      );
    }
    Object.defineProperty(actions, actionId, {
      value: admitted.operation,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  const actionIds = Object.freeze(Object.keys(actions));
  return Object.freeze({ actionIds, actions: Object.freeze(actions) });
}

/**
 * Engine-Lab-only selection seam. It decorates the exact frozen Studio binding
 * without adding Agent fields to the stable `StudioBindingV1` contract.
 */
export function defineExperimentalEmbeddedAgentBindingInternalV1(
  binding: StudioBindingV1,
  input: ExperimentalEmbeddedAgentBindingInputInternalV1,
): StudioBindingV1 {
  if (
    input.configurationId.length > 96 ||
    !configurationIdPatternInternalV1.test(input.configurationId)
  ) {
    throw new TypeError("Experimental Agent configuration ID is invalid");
  }
  if (typeof input.createClient !== "function") {
    throw new TypeError("Experimental Agent client factory is required");
  }
  if (agentBindingsInternalV1.has(binding)) {
    throw new TypeError("Studio binding already has an Experimental Agent configuration");
  }
  const admitted = admitSceneActionsInternalV1(input.sceneActions);
  agentBindingsInternalV1.set(
    binding,
    Object.freeze({
      configurationId: input.configurationId,
      actionSignature: admitted.actionIds.join("\u001f"),
      allowedActionIds: admitted.actionIds,
      sceneActions: admitted.actions,
      createClient: input.createClient,
    }),
  );
  return binding;
}

export function resolveExperimentalEmbeddedAgentBindingInternalV1(
  binding: StudioBindingV1,
): ExperimentalEmbeddedAgentBindingInternalV1 | null {
  return agentBindingsInternalV1.get(binding) ?? null;
}
