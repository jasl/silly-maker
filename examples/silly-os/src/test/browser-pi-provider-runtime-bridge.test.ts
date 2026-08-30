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
  const sameRouteModel = Object.freeze({
    ...model,
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    reasoning: true,
  });
  const unavailableModel = Object.freeze({
    ...model,
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    api: "mistral-conversations",
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
    sameRouteModel,
    unavailableModel,
    state,
    streamSimple,
    customStreamSimple,
    apiFactories,
    createdInputs,
    provider: Object.freeze({
      id: "openai",
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      getModels: () => [model, sameRouteModel, unavailableModel],
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
  browserPiAgentMaximumOutputTokensV1,
  browserPiAgentProviderTimeoutMillisecondsV1,
  browserPiCompletionToolChoiceV1,
  createBrowserPiProviderAgentV1,
  isBrowserPiSelectionAvailableV1,
  probeBrowserPiProviderSelectionV1,
  projectBrowserPiProviderCatalogV1,
  resolveBrowserPiReasoningEffortV1,
} from "../agent/browser-pi-provider-runtime-bridge.js";
import { creatorProgramHarnessReferenceV1 } from "../agent/browser-pi-agent-dispatch.ts";
import { creatorBuiltinProgramPackageV1 } from "../agent/builtin-program-packages/creator-current.ts";
import {
  translationBatchToolNameV1,
  translationBuiltinProgramPackageV1,
} from "../agent/builtin-program-packages/translation-current.ts";
import type { BrowserPiProviderCatalogWireV1 } from "../agent/browser-pi-worker-protocol.ts";
import {
  translationProgramHarnessReferenceV1,
} from "../product/translation/translation-batch-protocol.ts";

interface CapturedAgentInputV1 {
  readonly instructions: string;
  readonly completionTool: { readonly name: string };
  readonly model: unknown;
  readonly reasoningEffort: string;
  readonly streamFn: (
    model: unknown,
    context: { readonly messages: readonly unknown[] },
    options: Readonly<Record<string, unknown>>,
  ) => unknown;
}

function creatorDispatchV1(input: {
  readonly proposalId: string;
  readonly programId: string;
  readonly baseProgramRevision: number;
  readonly text: string;
}) {
  return {
    revision: 1,
    harnessReference: creatorProgramHarnessReferenceV1,
    programId: input.programId,
    submit: { revision: 1, ...input },
  } as const;
}

function translationDispatchV1() {
  return {
    revision: 1,
    harnessReference: translationProgramHarnessReferenceV1,
    programId: "program.translation.1",
    request: {
      sourceLocale: "zh-CN",
      targetLocale: "en",
      documentPurpose: "Fictional dialogue.",
      style: "Natural.",
      glossary: [],
      units: [{
        unitId: "translation.unit.000001",
        order: 0,
        locator: "line/1",
        context: null,
        durationMilliseconds: null,
        source: "你好。",
        protectedSegments: [],
      }],
    },
  } as const;
}

describe("SillyOS Browser Pi Provider runtime bridge", () => {
  const openAISelectionRouteV1 = Object.freeze(
    {
      api: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
    } as const,
  );

  beforeEach(() => {
    harnessV1.state.builtinStopReason = "stop";
    harnessV1.state.customStopReason = "stop";
    harnessV1.streamSimple.mockClear();
    harnessV1.customStreamSimple.mockClear();
    harnessV1.createdInputs.length = 0;
    for (const factory of Object.values(harnessV1.apiFactories)) factory.mockClear();
  });

  it("uses only Pi-neutral tool-choice values across Providers", () => {
    expect(browserPiCompletionToolChoiceV1(false)).toBe("auto");
    expect(browserPiCompletionToolChoiceV1(true)).toBe("none");
  });

  it("keeps Creator's short deadline and uses the measured Translation route envelope", () => {
    expect(browserPiAgentProviderTimeoutMillisecondsV1(
      creatorBuiltinProgramPackageV1,
      creatorDispatchV1({
        proposalId: "proposal.timeout.1",
        programId: "program.timeout.1",
        baseProgramRevision: 1,
        text: "Test the Creator timeout.",
      }),
    )).toBe(30_000);
    expect(browserPiAgentProviderTimeoutMillisecondsV1(
      translationBuiltinProgramPackageV1,
      translationDispatchV1(),
    )).toBe(180_000);
  });

  it("keeps Creator compact and sizes Translation output from the admitted unit count", () => {
    expect(browserPiAgentMaximumOutputTokensV1(
      creatorBuiltinProgramPackageV1,
      creatorDispatchV1({
        proposalId: "proposal.envelope.1",
        programId: "program.envelope.1",
        baseProgramRevision: 1,
        text: "Test the Creator envelope.",
      }),
      32_768,
    )).toBe(2_048);
    expect(browserPiAgentMaximumOutputTokensV1(translationBuiltinProgramPackageV1, {
      revision: 1,
      harnessReference: translationProgramHarnessReferenceV1,
      programId: "program.translation.1",
      request: {
        sourceLocale: "zh-CN",
        targetLocale: "en",
        documentPurpose: "Fictional dialogue.",
        style: "Natural.",
        glossary: [],
        units: Array.from({ length: 9 }, (_, index) => ({
          unitId: `translation.unit.${String(index + 1).padStart(6, "0")}`,
          order: index,
          locator: `line/${String(index + 1)}`,
          context: null,
          durationMilliseconds: null,
          source: `Source ${String(index + 1)}`,
          protectedSegments: [],
        })),
      },
    }, 32_768)).toBe(8_704);
    expect(browserPiAgentMaximumOutputTokensV1(translationBuiltinProgramPackageV1, {
      revision: 1,
      harnessReference: translationProgramHarnessReferenceV1,
      programId: "program.translation.1",
      request: {
        sourceLocale: "zh-CN",
        targetLocale: "en",
        documentPurpose: "Fictional dialogue.",
        style: "Natural.",
        glossary: [],
        units: [{
          unitId: "translation.unit.000001",
          order: 0,
          locator: "line/1",
          context: null,
          durationMilliseconds: null,
          source: "你好。",
          protectedSegments: [],
        }],
      },
    }, 3_000)).toBe(3_000);
  });

  it("projects Pi-native reasoning support and clamps one global preference per route", () => {
    const catalog = projectBrowserPiProviderCatalogV1() as BrowserPiProviderCatalogWireV1;
    expect(
      catalog.providers[0]?.models.map((model) => ({
        id: model.id,
        supportedReasoningEfforts: model.supportedReasoningEfforts,
        defaultReasoningEffort: model.defaultReasoningEffort,
      })),
    ).toEqual([
      {
        id: "gpt-4.1-nano",
        supportedReasoningEfforts: ["off"],
        defaultReasoningEffort: "off",
      },
      {
        id: "gpt-4.1-mini",
        supportedReasoningEfforts: ["off", "minimal", "low", "medium", "high"],
        defaultReasoningEffort: "medium",
      },
      {
        id: "gpt-4o-mini",
        supportedReasoningEfforts: ["off"],
        defaultReasoningEffort: "off",
      },
    ]);

    expect(resolveBrowserPiReasoningEffortV1({
      kind: "builtin",
      providerId: "openai",
      modelId: "gpt-4.1-nano",
      ...openAISelectionRouteV1,
    }, "max")).toBe("off");
    expect(resolveBrowserPiReasoningEffortV1({
      kind: "builtin",
      providerId: "openai",
      modelId: "gpt-4.1-mini",
      ...openAISelectionRouteV1,
    }, "max")).toBe("high");
    expect(resolveBrowserPiReasoningEffortV1({
      kind: "custom",
      profile: {
        profileId: "custom.reasoning-off",
        displayName: "Custom reasoning-off profile",
        api: "openai-responses",
        baseUrl: "https://gateway.example.test/v1",
        modelId: "private-model",
        contextWindow: 32_768,
        maxTokens: 4_096,
      },
    }, "max")).toBe("off");
  });

  it("passes the neutral choice through the actual Pi streamSimple call", () => {
    createBrowserPiProviderAgentV1({
      apiKey: "test-only-key",
      programPackage: creatorBuiltinProgramPackageV1,
      fetch,
      selection: {
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        ...openAISelectionRouteV1,
      },
      dispatch: creatorDispatchV1({
        proposalId: "proposal.test.1",
        programId: "program.test.1",
        baseProgramRevision: 1,
        text: "Test a neutral tool choice.",
      }),
      workspaceTools: Object.freeze([]),
      reasoningEffort: "high",
      onCandidate: vi.fn(),
      onTextDelta: vi.fn(),
    });
    const input = harnessV1.createdInputs.at(-1) as CapturedAgentInputV1 | undefined;
    if (input === undefined) throw new Error("Pi Agent input was not captured");
    expect(input.reasoningEffort).toBe("off");
    expect(input.model).toMatchObject({ maxTokens: 2_048 });

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

  it("selects the Translation prompt/tool without inheriting Creator completion behavior", () => {
    createBrowserPiProviderAgentV1({
      apiKey: "translation-test-key",
      programPackage: translationBuiltinProgramPackageV1,
      fetch,
      selection: {
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        ...openAISelectionRouteV1,
      },
      dispatch: {
        revision: 1,
        harnessReference: translationProgramHarnessReferenceV1,
        programId: "program.translation.1",
        request: {
          sourceLocale: "zh-CN",
          targetLocale: "en",
          documentPurpose: "Fictional dialogue.",
          style: "Natural.",
          glossary: [],
          units: [{
            unitId: "translation.unit.000001",
            order: 0,
            locator: "line/1",
            context: null,
            durationMilliseconds: null,
            source: "你好。",
            protectedSegments: [],
          }],
        },
      },
      workspaceTools: [],
      reasoningEffort: "low",
      onCandidate: vi.fn(),
      onTextDelta: vi.fn(),
    });
    const input = harnessV1.createdInputs.at(-1) as CapturedAgentInputV1 | undefined;
    if (input === undefined) throw new Error("Pi Agent input was not captured");
    expect(input.instructions).toContain(translationBatchToolNameV1);
    expect(input.completionTool.name).toBe(translationBatchToolNameV1);
    expect(input.model).toMatchObject({ maxTokens: 4_096 });

    input.streamFn(harnessV1.model, { messages: [] }, {});
    input.streamFn(harnessV1.model, {
      messages: [{ role: "toolResult", toolName: translationBatchToolNameV1 }],
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
      selection: {
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        ...openAISelectionRouteV1,
      },
      signal: new AbortController().signal,
      fetch,
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

  it("makes every model on a configurable route available without model-ID gating", async () => {
    const catalog = projectBrowserPiProviderCatalogV1() as BrowserPiProviderCatalogWireV1;
    expect(catalog.providers[0]?.models.map(({ id, availability }) => ({ id, availability })))
      .toEqual([
        { id: "gpt-4.1-nano", availability: "available" },
        { id: "gpt-4.1-mini", availability: "available" },
        { id: "gpt-4o-mini", availability: "unavailable" },
      ]);

    const sameRouteSelection = {
      kind: "builtin",
      providerId: "openai",
      modelId: "gpt-4.1-mini",
      ...openAISelectionRouteV1,
    } as const;
    expect(isBrowserPiSelectionAvailableV1(sameRouteSelection)).toBe(true);
    await expect(probeBrowserPiProviderSelectionV1({
      apiKey: "same-route-probe-key",
      selection: sameRouteSelection,
      signal: new AbortController().signal,
      fetch,
    })).resolves.toBe(true);
    expect(harnessV1.streamSimple).toHaveBeenLastCalledWith(
      harnessV1.sameRouteModel,
      expect.anything(),
      expect.objectContaining({ apiKey: "same-route-probe-key", maxTokens: 1 }),
    );

    createBrowserPiProviderAgentV1({
      apiKey: "same-route-agent-key",
      programPackage: creatorBuiltinProgramPackageV1,
      fetch,
      selection: sameRouteSelection,
      dispatch: creatorDispatchV1({
        proposalId: "proposal.same-route.1",
        programId: "program.same-route.1",
        baseProgramRevision: 1,
        text: "Use another model on the same route.",
      }),
      workspaceTools: Object.freeze([]),
      reasoningEffort: "medium",
      onCandidate: vi.fn(),
      onTextDelta: vi.fn(),
    });
    const captured = harnessV1.createdInputs.at(-1) as CapturedAgentInputV1 | undefined;
    expect(captured?.model).toMatchObject({
      id: "gpt-4.1-mini",
      provider: "openai",
      api: "openai-responses",
    });
    expect(captured?.reasoningEffort).toBe("medium");

    const unavailableSelection = {
      kind: "builtin",
      providerId: "openai",
      modelId: "gpt-4o-mini",
      ...openAISelectionRouteV1,
    } as const;
    expect(isBrowserPiSelectionAvailableV1(unavailableSelection)).toBe(false);
    await expect(probeBrowserPiProviderSelectionV1({
      apiKey: "unavailable-probe-key",
      selection: unavailableSelection,
      signal: new AbortController().signal,
      fetch,
    })).resolves.toBe(false);
    expect(() =>
      createBrowserPiProviderAgentV1({
        apiKey: "unavailable-agent-key",
        programPackage: creatorBuiltinProgramPackageV1,
        fetch,
        selection: unavailableSelection,
        dispatch: creatorDispatchV1({
          proposalId: "proposal.unavailable.1",
          programId: "program.unavailable.1",
          baseProgramRevision: 1,
          text: "Reject an unsupported route family.",
        }),
        workspaceTools: Object.freeze([]),
        reasoningEffort: "medium",
        onCandidate: vi.fn(),
        onTextDelta: vi.fn(),
      })
    ).toThrow("Selected Pi Provider/model is unavailable in SillyOS Browser");

    const routeMismatch = {
      kind: "builtin",
      providerId: "openai",
      modelId: "gpt-4.1-mini",
      api: "openai-completions",
      baseUrl: "https://api.openai.com/v1",
    } as const;
    expect(isBrowserPiSelectionAvailableV1(routeMismatch)).toBe(false);
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
        fetch,
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
        programPackage: creatorBuiltinProgramPackageV1,
        fetch,
        selection,
        dispatch: creatorDispatchV1({
          proposalId: "proposal.custom.1",
          programId: "program.custom.1",
          baseProgramRevision: 1,
          text: "Use the custom endpoint.",
        }),
        workspaceTools: Object.freeze([]),
        reasoningEffort: "max",
        onCandidate: vi.fn(),
        onTextDelta: vi.fn(),
      });
      const captured = harnessV1.createdInputs.at(-1) as CapturedAgentInputV1 | undefined;
      expect(captured?.model).toMatchObject({
        provider: `custom.${api}`,
        api,
        baseUrl: "https://gateway.example.test/v1",
      });
      expect(captured?.reasoningEffort).toBe("off");
    }
  });
});
