// SPDX-License-Identifier: MIT
import type { StudioBindingV1 } from "./core/binding.ts";
import { defineEmbeddedAuthoringCompanionInternalV1 } from "./core/embedded-authoring-companion.ts";
import { admitExperimentalEmbeddedAgentBindingInternalV1 } from "./experimental-agent/binding.ts";
import type { ExperimentalEmbeddedAgentBindingInputInternalV1 } from "./experimental-agent/binding.ts";
import { createExperimentalEmbeddedAgentCompanionInternalV1 } from "./experimental-agent/runtime.tsx";

export type { ExperimentalEmbeddedAgentBindingInputInternalV1 };

/** Explicit product selection seam for the experimental Agent sibling. */
export function defineExperimentalEmbeddedAgentBindingInternalV1(
  binding: StudioBindingV1,
  input: ExperimentalEmbeddedAgentBindingInputInternalV1,
): StudioBindingV1 {
  const agentBinding = admitExperimentalEmbeddedAgentBindingInternalV1(input);
  return defineEmbeddedAuthoringCompanionInternalV1(
    binding,
    createExperimentalEmbeddedAgentCompanionInternalV1(agentBinding),
  );
}
