// SPDX-License-Identifier: MIT

import { builtinProviders } from "@earendil-works/pi-ai/providers/all";

import { browserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";
import {
  getBrowserPiModelAvailabilityV1,
  isBrowserPiModelQualifiedV1,
} from "./browser-pi-browser-qualification.ts";
import { createPiAgentV1 } from "./browser-pi-runtime-bridge.js";

const creatorSystemPromptV1 = `You are the SillyOS Agent Creator.
Each user message is the exact follow-up requirement text for one proposed Program revision.
For every message, call sillyos_propose_program_revision exactly once.
Use the provided native read/write/edit tools when a workspace artifact is needed; they operate only on the open persistent Program workspace.
Pass one concise requirement that preserves the full intent of the user message.
SillyOS itself binds that requirement to the current proposal identity and original text.
After the tool succeeds, reply with one short sentence explaining that the revision is ready for human review.`;

let cachedProvidersV1;

function providersV1() {
  if (cachedProvidersV1 !== undefined) return cachedProvidersV1;
  const providers = builtinProviders();
  const ids = new Set();
  for (const provider of providers) {
    if (ids.has(provider.id)) throw new Error("Pinned Pi catalog has a duplicate Provider id");
    ids.add(provider.id);
  }
  cachedProvidersV1 = providers;
  return providers;
}

function modelFactsV1(provider, model) {
  return {
    providerId: provider.id,
    modelId: model.id,
    api: model.api,
    baseUrl: model.baseUrl,
  };
}

function resolveSelectionV1(selection) {
  const provider = providersV1().find(({ id }) => id === selection.providerId);
  const model = provider?.getModels().find(({ id }) => id === selection.modelId);
  if (provider === undefined || model === undefined || model.provider !== provider.id) return null;
  return { provider, model };
}

export function projectBrowserPiProviderCatalogV1() {
  const providers = providersV1().map((provider) => {
    const modelIds = new Set();
    const models = provider.getModels().map((model) => {
      if (modelIds.has(model.id) || model.provider !== provider.id) {
        throw new Error("Pinned Pi catalog has an invalid model identity");
      }
      modelIds.add(model.id);
      return Object.freeze({
        id: model.id,
        name: model.name,
        reasoning: model.reasoning,
        input: Object.freeze([...model.input]),
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        availability: getBrowserPiModelAvailabilityV1(modelFactsV1(provider, model)),
      });
    });
    const availability = models.some((model) => model.availability === "qualified")
      ? "qualified"
      : models.some((model) => model.availability === "candidate")
      ? "candidate"
      : "unavailable";
    return Object.freeze({
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl ?? null,
      availability,
      models: Object.freeze(models),
    });
  });
  return Object.freeze({
    revision: 1,
    distribution: browserPiDistributionIdentityV1,
    providers: Object.freeze(providers),
  });
}

export function isBrowserPiSelectionQualifiedV1(selection) {
  const resolved = resolveSelectionV1(selection);
  return resolved !== null &&
    isBrowserPiModelQualifiedV1(modelFactsV1(resolved.provider, resolved.model));
}

export function createBrowserPiProviderAgentV1(input) {
  const resolved = resolveSelectionV1(input.selection);
  if (
    resolved === null ||
    !isBrowserPiModelQualifiedV1(modelFactsV1(resolved.provider, resolved.model))
  ) {
    throw new Error("Selected Pi Provider/model is unavailable in SillyOS Browser");
  }
  const boundedModel = {
    ...resolved.model,
    maxTokens: Math.min(resolved.model.maxTokens, 2_048),
  };

  let apiKey = input.apiKey;
  const agent = createPiAgentV1({
    submit: input.submit,
    workspaceTools: input.workspaceTools,
    onCandidate: input.onCandidate,
    onTextDelta: input.onTextDelta,
    streamFn: (selectedModel, context, options) => {
      const proposed = context.messages.some((message) =>
        message.role === "toolResult" &&
        message.toolName === "sillyos_propose_program_revision"
      );
      return resolved.provider.stream(selectedModel, context, {
        ...options,
        maxRetries: 0,
        timeoutMs: 30_000,
        toolChoice: proposed ? "none" : "required",
        transport: "sse",
      });
    },
    getApiKey: (providerId) => providerId === resolved.provider.id ? apiKey : undefined,
    model: boundedModel,
    systemPrompt: creatorSystemPromptV1,
  });
  return {
    prompt: agent.prompt,
    abort: agent.abort,
    dispose() {
      apiKey = "";
      agent.dispose();
    },
  };
}
