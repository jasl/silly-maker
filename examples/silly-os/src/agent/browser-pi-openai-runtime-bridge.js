// SPDX-License-Identifier: MIT

import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";

import { createPiAgentV1 } from "./browser-pi-runtime-bridge.js";

export const browserOpenAiModelIdV1 = "gpt-4.1-nano";

const openAiSystemPromptV1 = `You are the SillyOS Agent Creator.
Each user message is the exact follow-up requirement text for one proposed Program revision.
For every message, call sillyos_propose_program_revision exactly once.
Pass one concise requirement that preserves the full intent of the user message.
SillyOS itself binds that requirement to the current proposal identity and original text.
After the tool succeeds, reply with one short sentence explaining that the revision is ready for human review.`;

export function createOpenAiPiAgentV1(input) {
  const provider = openaiProvider();
  const model = provider.getModels().find(({ id }) => id === browserOpenAiModelIdV1);
  if (model === undefined) {
    throw new Error("Pinned OpenAI model is unavailable from the pinned Pi catalog");
  }
  const boundedModel = { ...model, maxTokens: Math.min(model.maxTokens, 2_048) };

  let apiKey = input.apiKey;
  const agent = createPiAgentV1({
    submit: input.submit,
    onCandidate: input.onCandidate,
    onTextDelta: input.onTextDelta,
    streamFn: (selectedModel, context, options) => {
      const proposed = context.messages.some((message) =>
        message.role === "toolResult" &&
        message.toolName === "sillyos_propose_program_revision"
      );
      return provider.stream(selectedModel, context, {
        ...options,
        maxRetries: 0,
        timeoutMs: 30_000,
        toolChoice: proposed ? "none" : "required",
        transport: "sse",
      });
    },
    getApiKey: (providerId) => providerId === provider.id ? apiKey : undefined,
    model: boundedModel,
    systemPrompt: openAiSystemPromptV1,
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
