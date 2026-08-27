// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from "vitest";

const harnessV1 = vi.hoisted(() => {
  const model = Object.freeze({
    id: "gpt-4.1-nano",
    name: "GPT-4.1 nano",
    provider: "openai",
    api: "openai-responses",
    baseUrl: "https://api.openai.com/v1",
    reasoning: false,
    input: ["text"],
    contextWindow: 1_000,
    maxTokens: 4_096,
  });
  const state = { builtinStopReason: "stop", customStopReason: "stop" };
  const streamSimple = vi.fn(() =>
    Object.freeze({
      result: () => Promise.resolve({ stopReason: state.builtinStopReason }),
    })
  );
  const customStreamSimple = vi.fn(() =>
    Object.freeze({
      result: () => Promise.resolve({ stopReason: state.customStopReason }),
    })
  );
  const customStreams = Object.freeze({
    stream: customStreamSimple,
    streamSimple: customStreamSimple,
  });
  const apiFactories = {
    openAICompletions: vi.fn(() => customStreams),
    openAIResponses: vi.fn(() => customStreams),
    anthropicMessages: vi.fn(() => customStreams),
    googleGenerativeAI: vi.fn(() => customStreams),
  };
  const createdInputs: unknown[] = [];
  return {
    model,
    state,
    streamSimple,
    customStreamSimple,
    apiFactories,
    createdInputs,
    provider: Object.freeze({
      id: "openai",
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      getModels: () => [model],
      streamSimple,
    }),
  };
});

vi.mock("@earendil-works/pi-ai/providers/all", () => ({
  builtinProviders: () => [harnessV1.provider],
}));

vi.mock("@earendil-works/pi-ai/api/openai-completions.lazy", () => ({
  openAICompletionsApi: harnessV1.apiFactories.openAICompletions,
}));

vi.mock("@earendil-works/pi-ai/api/openai-responses.lazy", () => ({
  openAIResponsesApi: harnessV1.apiFactories.openAIResponses,
}));

vi.mock("@earendil-works/pi-ai/api/anthropic-messages.lazy", () => ({
  anthropicMessagesApi: harnessV1.apiFactories.anthropicMessages,
}));

vi.mock("@earendil-works/pi-ai/api/google-generative-ai.lazy", () => ({
  googleGenerativeAIApi: harnessV1.apiFactories.googleGenerativeAI,
}));

vi.mock("../agent/browser-pi-runtime-bridge.js", () => ({
  createPiAgentV1: (input: unknown) => {
    harnessV1.createdInputs.push(input);
    return Object.freeze({
      prompt: vi.fn(),
      abort: vi.fn(),
      dispose: vi.fn(),
    });
  },
}));

import {
  browserPiCreatorToolChoiceV1,
  createBrowserPiProviderAgentV1,
  isBrowserPiSelectionAvailableV1,
  probeBrowserPiProviderSelectionV1,
} from "../agent/browser-pi-provider-runtime-bridge.js";

interface CapturedAgentInputV1 {
  readonly model: unknown;
  readonly streamFn: (
    model: unknown,
    context: { readonly messages: readonly unknown[] },
    options: Readonly<Record<string, unknown>>,
  ) => unknown;
}

describe("SillyOS Browser Pi Provider runtime bridge", () => {
  beforeEach(() => {
    harnessV1.state.builtinStopReason = "stop";
    harnessV1.state.customStopReason = "stop";
    harnessV1.streamSimple.mockClear();
    harnessV1.customStreamSimple.mockClear();
    harnessV1.createdInputs.length = 0;
    for (const factory of Object.values(harnessV1.apiFactories)) factory.mockClear();
  });

  it("uses only Pi-neutral tool-choice values across Providers", () => {
    expect(browserPiCreatorToolChoiceV1(false)).toBe("auto");
    expect(browserPiCreatorToolChoiceV1(true)).toBe("none");
  });

  it("passes the neutral choice through the actual Pi streamSimple call", () => {
    createBrowserPiProviderAgentV1({
      apiKey: "test-only-key",
      selection: { kind: "builtin", providerId: "openai", modelId: "gpt-4.1-nano" },
      submit: Object.freeze({
        revision: 1,
        proposalId: "proposal.test.1",
        programId: "program.test.1",
        baseProgramRevision: 1,
        text: "Test a neutral tool choice.",
      }),
      workspaceTools: Object.freeze([]),
      onCandidate: vi.fn(),
      onTextDelta: vi.fn(),
    });
    const input = harnessV1.createdInputs.at(-1) as CapturedAgentInputV1 | undefined;
    if (input === undefined) throw new Error("Pi Agent input was not captured");

    input.streamFn(harnessV1.model, { messages: [] }, {});
    input.streamFn(harnessV1.model, {
      messages: [{ role: "toolResult", toolName: "sillyos_propose_program_revision" }],
    }, {});

    expect(harnessV1.streamSimple).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { messages: [] },
      expect.objectContaining({ toolChoice: "auto" }),
    );
    expect(harnessV1.streamSimple).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ toolChoice: "none" }),
    );
  });

  it("accepts a built-in probe only after Pi reports stop or length", async () => {
    const input = {
      apiKey: "probe-only-key",
      selection: { kind: "builtin", providerId: "openai", modelId: "gpt-4.1-nano" },
      signal: new AbortController().signal,
    } as const;
    await expect(probeBrowserPiProviderSelectionV1(input)).resolves.toBe(true);
    expect(harnessV1.streamSimple).toHaveBeenLastCalledWith(
      harnessV1.model,
      expect.objectContaining({ messages: expect.any(Array) }),
      expect.objectContaining({
        apiKey: "probe-only-key",
        maxTokens: 1,
        maxRetries: 0,
      }),
    );
    expect(harnessV1.streamSimple).toHaveBeenLastCalledWith(
      harnessV1.model,
      expect.anything(),
      expect.not.objectContaining({ toolChoice: expect.anything() }),
    );

    harnessV1.state.builtinStopReason = "length";
    await expect(probeBrowserPiProviderSelectionV1(input)).resolves.toBe(true);
    harnessV1.state.builtinStopReason = "toolUse";
    await expect(probeBrowserPiProviderSelectionV1(input)).resolves.toBe(false);
    harnessV1.state.builtinStopReason = "error";
    await expect(probeBrowserPiProviderSelectionV1(input)).resolves.toBe(false);
  });

  it("constructs every admitted custom API family through Pi's public lazy adapters", async () => {
    const cases = [
      ["openai-completions", harnessV1.apiFactories.openAICompletions],
      ["openai-responses", harnessV1.apiFactories.openAIResponses],
      ["anthropic-messages", harnessV1.apiFactories.anthropicMessages],
      ["google-generative-ai", harnessV1.apiFactories.googleGenerativeAI],
    ] as const;
    harnessV1.state.customStopReason = "length";
    for (const [api, expectedFactory] of cases) {
      const selection = {
        kind: "custom",
        profile: {
          profileId: `custom.${api}`,
          displayName: `Private ${api}`,
          api,
          baseUrl: "https://gateway.example.test/v1",
          modelId: "private-model",
          contextWindow: 32_768,
          maxTokens: 4_096,
        },
      } as const;
      expect(isBrowserPiSelectionAvailableV1(selection)).toBe(true);
      await expect(probeBrowserPiProviderSelectionV1({
        apiKey: "custom-probe-key",
        selection,
        signal: new AbortController().signal,
      })).resolves.toBe(true);
      expect(expectedFactory).toHaveBeenCalled();
      expect(harnessV1.customStreamSimple).toHaveBeenLastCalledWith(
        expect.objectContaining({
          provider: `custom.${api}`,
          api,
          baseUrl: "https://gateway.example.test/v1",
          reasoning: false,
          input: ["text"],
        }),
        expect.anything(),
        expect.objectContaining({ apiKey: "custom-probe-key", maxTokens: 1 }),
      );

      createBrowserPiProviderAgentV1({
        apiKey: "custom-agent-key",
        selection,
        submit: Object.freeze({
          revision: 1,
          proposalId: "proposal.custom.1",
          programId: "program.custom.1",
          baseProgramRevision: 1,
          text: "Use the custom endpoint.",
        }),
        workspaceTools: Object.freeze([]),
        onCandidate: vi.fn(),
        onTextDelta: vi.fn(),
      });
      const captured = harnessV1.createdInputs.at(-1) as CapturedAgentInputV1 | undefined;
      expect(captured?.model).toMatchObject({
        provider: `custom.${api}`,
        api,
        baseUrl: "https://gateway.example.test/v1",
      });
    }
  });
});
