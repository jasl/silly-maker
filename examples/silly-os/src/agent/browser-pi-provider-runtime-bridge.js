// SPDX-License-Identifier: MIT

import {
  clampThinkingLevel,
  createProvider,
  getSupportedThinkingLevels,
} from "@earendil-works/pi-ai";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { googleGenerativeAIApi } from "@earendil-works/pi-ai/api/google-generative-ai.lazy";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { openAIResponsesApi } from "@earendil-works/pi-ai/api/openai-responses.lazy";
import { builtinProviders } from "@earendil-works/pi-ai/providers/all";

import { browserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";
import {
  getBrowserPiProviderRouteAvailabilityV1,
  isBrowserPiProviderRouteConfigurableV1,
} from "./browser-pi-browser-compatibility.ts";
import { createPiAgentV1 } from "./browser-pi-runtime-bridge.js";
import { composeProgramModelPromptOverlaysV1 } from "../program-platform/package/program-model-prompt-overlays.ts";

let cachedProvidersV1;

export function browserPiCompletionToolChoiceV1(proposed) {
  return proposed ? "none" : "auto";
}

export function browserPiAgentProviderTimeoutMillisecondsV1(runtimeProfile) {
  return runtimeProfile.providerTimeoutMilliseconds;
}

/** Cap the selected package's request envelope by the exact model capability. */
export function browserPiAgentMaximumOutputTokensV1(
  invocation,
  modelMaximumTokens,
) {
  if (!Number.isSafeInteger(modelMaximumTokens) || modelMaximumTokens <= 0) {
    throw new TypeError("Pi model maximum output tokens are invalid");
  }
  return Math.min(modelMaximumTokens, invocation.requestedOutputTokens);
}

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
    api: model.api,
    baseUrl: model.baseUrl,
  };
}

function customApiV1(api) {
  switch (api) {
    case "openai-completions":
      return openAICompletionsApi();
    case "openai-responses":
      return openAIResponsesApi();
    case "anthropic-messages":
      return anthropicMessagesApi();
    case "google-generative-ai":
      return googleGenerativeAIApi();
    default:
      return null;
  }
}

function resolveCustomSelectionV1(profile) {
  const api = customApiV1(profile.api);
  if (api === null) return null;
  const model = Object.freeze({
    id: profile.modelId,
    name: profile.displayName,
    provider: profile.profileId,
    api: profile.api,
    baseUrl: profile.baseUrl,
    reasoning: false,
    input: Object.freeze(["text"]),
    cost: Object.freeze({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }),
    contextWindow: profile.contextWindow,
    maxTokens: profile.maxTokens,
  });
  const provider = createProvider({
    id: profile.profileId,
    name: profile.displayName,
    baseUrl: profile.baseUrl,
    auth: {
      apiKey: {
        name: `${profile.displayName} API key`,
        resolve: async () => ({ auth: {} }),
      },
    },
    models: [model],
    api,
  });
  const selectedModel = provider.getModels()[0];
  if (
    selectedModel === undefined || selectedModel.id !== profile.modelId ||
    selectedModel.provider !== profile.profileId || selectedModel.api !== profile.api ||
    selectedModel.baseUrl !== profile.baseUrl
  ) return null;
  return { provider, model: selectedModel, custom: true };
}

function resolveSelectionV1(selection) {
  if (selection.kind === "custom") {
    try {
      return resolveCustomSelectionV1(selection.profile);
    } catch {
      return null;
    }
  }
  const provider = providersV1().find(({ id }) => id === selection.providerId);
  const model = provider?.getModels().find(({ id }) => id === selection.modelId);
  if (
    provider === undefined || model === undefined || model.provider !== provider.id ||
    model.api !== selection.api || model.baseUrl !== selection.baseUrl
  ) return null;
  return { provider, model, custom: false };
}

export function resolveBrowserPiReasoningEffortV1(selection, preferredReasoningEffort) {
  if (selection === null || selection.kind === "custom") return "off";
  const resolved = resolveSelectionV1(selection);
  return resolved === null ? "off" : clampThinkingLevel(resolved.model, preferredReasoningEffort);
}

export function projectBrowserPiProviderCatalogV1() {
  const providers = providersV1().map((provider) => {
    const modelIds = new Set();
    const models = provider.getModels().map((model) => {
      if (modelIds.has(model.id) || model.provider !== provider.id) {
        throw new Error("Pinned Pi catalog has an invalid model identity");
      }
      modelIds.add(model.id);
      const supportedReasoningEfforts = Object.freeze([...getSupportedThinkingLevels(model)]);
      return Object.freeze({
        id: model.id,
        name: model.name,
        api: model.api,
        baseUrl: model.baseUrl,
        reasoning: model.reasoning,
        supportedReasoningEfforts,
        defaultReasoningEffort: clampThinkingLevel(model, "medium"),
        input: Object.freeze([...model.input]),
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        availability: getBrowserPiProviderRouteAvailabilityV1(modelFactsV1(provider, model)),
      });
    });
    const availability = models.some((model) => model.availability === "available")
      ? "available"
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

export function isBrowserPiSelectionAvailableV1(selection) {
  const resolved = resolveSelectionV1(selection);
  return resolved !== null && (resolved.custom ||
    isBrowserPiProviderRouteConfigurableV1(modelFactsV1(resolved.provider, resolved.model)));
}

export async function probeBrowserPiProviderSelectionV1(input) {
  if (typeof input.fetch !== "function") return false;
  const resolved = resolveSelectionV1(input.selection);
  if (
    resolved === null || (!resolved.custom &&
      !isBrowserPiProviderRouteConfigurableV1(modelFactsV1(resolved.provider, resolved.model)))
  ) return false;
  try {
    const stream = resolved.provider.streamSimple(
      resolved.model,
      {
        messages: [{ role: "user", content: "Reply with OK.", timestamp: 0 }],
      },
      {
        apiKey: input.apiKey,
        signal: input.signal,
        maxTokens: 1,
        maxRetries: 0,
        timeoutMs: 30_000,
        transport: "sse",
        cacheRetention: "none",
        fetch: input.fetch,
      },
    );
    const message = await stream.result();
    return message.stopReason === "stop" || message.stopReason === "length";
  } catch {
    return false;
  }
}

export function createBrowserPiProviderAgentV1(input) {
  if (typeof input.fetch !== "function") {
    throw new Error("A guarded Provider fetch is required in SillyOS Browser");
  }
  const resolved = resolveSelectionV1(input.selection);
  if (
    resolved === null ||
    (!resolved.custom &&
      !isBrowserPiProviderRouteConfigurableV1(modelFactsV1(resolved.provider, resolved.model)))
  ) {
    throw new Error("Selected Pi Provider/model is unavailable in SillyOS Browser");
  }
  const effectiveReasoningEffort = resolveBrowserPiReasoningEffortV1(
    input.selection,
    input.reasoningEffort,
  );
  const boundedModel = {
    ...resolved.model,
    maxTokens: browserPiAgentMaximumOutputTokensV1(
      input.invocation,
      resolved.model.maxTokens,
    ),
  };
  const instructions = composeProgramModelPromptOverlaysV1({
    instructions: input.instructions,
    modelId: resolved.model.id,
    overlays: input.modelPromptOverlays ?? [],
  });

  let apiKey = input.apiKey;
  const completionTool = input.invocation.completion.kind === "candidate"
    ? input.invocation.completion.createTool({ onCandidate: input.onCandidate })
    : null;
  const completionToolName = completionTool?.name ?? null;
  const agent = createPiAgentV1({
    instructions,
    workspaceTools: input.workspaceTools,
    completionTool,
    onTextDelta: input.onTextDelta,
    streamFn: (selectedModel, context, options) => {
      const proposed = completionToolName !== null &&
        context.messages.some((message) =>
          message.role === "toolResult" && message.toolName === completionToolName
        );
      return resolved.provider.streamSimple(selectedModel, context, {
        ...options,
        maxRetries: 0,
        timeoutMs: browserPiAgentProviderTimeoutMillisecondsV1(
          input.runtimeProfile,
        ),
        ...(completionToolName === null
          ? {}
          : { toolChoice: browserPiCompletionToolChoiceV1(proposed) }),
        transport: "sse",
        fetch: input.fetch,
      });
    },
    getApiKey: (providerId) => providerId === resolved.provider.id ? apiKey : undefined,
    model: boundedModel,
    reasoningEffort: effectiveReasoningEffort,
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
