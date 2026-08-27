// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

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
  const streamSimple = vi.fn(() => Object.freeze({ kind: "mock-stream" }));
  const createdInputs: unknown[] = [];
  return {
    model,
    streamSimple,
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
} from "../agent/browser-pi-provider-runtime-bridge.js";

interface CapturedAgentInputV1 {
  readonly streamFn: (
    model: unknown,
    context: { readonly messages: readonly unknown[] },
    options: Readonly<Record<string, unknown>>,
  ) => unknown;
}

describe("SillyOS Browser Pi Provider runtime bridge", () => {
  it("uses only Pi-neutral tool-choice values across Providers", () => {
    expect(browserPiCreatorToolChoiceV1(false)).toBe("auto");
    expect(browserPiCreatorToolChoiceV1(true)).toBe("none");
  });

  it("passes the neutral choice through the actual Pi streamSimple call", () => {
    createBrowserPiProviderAgentV1({
      apiKey: "test-only-key",
      selection: { providerId: "openai", modelId: "gpt-4.1-nano" },
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
});
