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
  const numericBudgetModel = Object.freeze({
    ...sameRouteModel,
    id: "gpt-numeric-budget",
    name: "GPT numeric budget fixture",
    api: "openai-completions",
    compat: Object.freeze({ supportsThinkingTokenBudget: true }),
  });
  const requiredReasoningModel = Object.freeze({
    ...sameRouteModel,
    id: "gemini-3-flash",
    name: "Gemini 3 Flash fixture",
    api: "google-generative-ai",
    baseUrl: "https://generativelanguage.googleapis.com",
    thinkingLevelMap: Object.freeze({ off: null }),
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
    numericBudgetModel,
    requiredReasoningModel,
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
      getModels: () => [
        model,
        sameRouteModel,
        numericBudgetModel,
        requiredReasoningModel,
        unavailableModel,
      ],
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
import type { BrowserPiAgentDispatchV1 } from "../agent/browser-pi-agent-dispatch.ts";
import type { BrowserProgramRuntimeProfileV1 } from "../agent/browser-program-runtime-profile.ts";
import {
  creatorProgramRuntimeProfileImplementationV1,
  creatorProgramRuntimeProfileV1,
} from "../../programs/creator/runtime-profile/creator-runtime-profile.ts";
import {
  translationBatchToolNameV1,
  translationProgramRuntimeProfileImplementationV1,
  translationProgramRuntimeProfileV1,
} from "../../programs/translation/runtime-profile/translation-runtime-profile.ts";
import type { BrowserPiProviderCatalogWireV1 } from "../agent/browser-pi-worker-protocol.ts";

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
    runtimeProfile: creatorProgramRuntimeProfileV1,
    programPackage: {
      programId: input.programId,
      packageVersion: "1.0.0",
      contentDigest: "c".repeat(64),
    },
    workspaceProgramId: input.programId,
    payload: { revision: 1, ...input },
  } as const;
}

function translationDispatchV1() {
  return {
    revision: 1,
    runtimeProfile: translationProgramRuntimeProfileV1,
    programPackage: {
      programId: "sillyos.translation",
      packageVersion: "1.0.0",
      contentDigest: "d".repeat(64),
    },
    workspaceProgramId: "sillyos.translation",
    payload: {
      kind: "batch",
      requestedOutputTokens: 4_608,
      instruction: "Translate the admitted batch faithfully.",
      request: {
        sourceLocale: "zh-CN",
        targetLocale: "en",
        documentPurpose: "Fictional dialogue.",
        style: "Natural.",
        glossary: [],
        confirmedMeaningFacts: [],
        neighboringUnits: { preceding: null, following: null },
        units: [{
          unitId: "translation.unit.000001",
          order: 0,
          locator: "line/1",
          context: null,
          durationMilliseconds: null,
          lineBreakPolicy: "forbidden",
          source: "你好。",
          protectedSegments: [],
        }],
      },
    },
  } as const;
}

function invocationV1(
  runtimeProfile: BrowserProgramRuntimeProfileV1,
  dispatch: BrowserPiAgentDispatchV1,
) {
  const admission = runtimeProfile.admitDispatch(dispatch);
  if (admission.kind === "rejected") throw new Error("test dispatch was rejected");
  return admission.invocation;
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
      creatorProgramRuntimeProfileImplementationV1,
    )).toBe(30_000);
    expect(browserPiAgentProviderTimeoutMillisecondsV1(
      translationProgramRuntimeProfileImplementationV1,
    )).toBe(180_000);
  });

  it("keeps Creator compact and uses Translation's planned output envelope", () => {
    const creatorDispatch = creatorDispatchV1({
      proposalId: "proposal.envelope.1",
      programId: "program.envelope.1",
      baseProgramRevision: 1,
      text: "Test the Creator envelope.",
    });
    expect(browserPiAgentMaximumOutputTokensV1(
      invocationV1(creatorProgramRuntimeProfileImplementationV1, creatorDispatch),
      32_768,
    )).toBe(2_048);
    const translationDispatch = translationDispatchV1();
    const translationInvocation = invocationV1(
      translationProgramRuntimeProfileImplementationV1,
      {
        ...translationDispatch,
        payload: { ...translationDispatch.payload, requestedOutputTokens: 8_704 },
      },
    );
    expect(browserPiAgentMaximumOutputTokensV1(translationInvocation, 32_768)).toBe(8_704);
    expect(browserPiAgentMaximumOutputTokensV1(translationInvocation, 3_000)).toBe(3_000);
  });

  it("treats the Program output request as answer room when reasoning is enabled", () => {
    const translationDispatch = translationDispatchV1();
    const invocation = invocationV1(
      translationProgramRuntimeProfileImplementationV1,
      {
        ...translationDispatch,
        payload: { ...translationDispatch.payload, requestedOutputTokens: 8_704 },
      },
    );

    expect(browserPiAgentMaximumOutputTokensV1(invocation, 32_768, "off")).toBe(8_704);
    expect(browserPiAgentMaximumOutputTokensV1(invocation, 32_768, "low")).toBe(10_752);
    expect(browserPiAgentMaximumOutputTokensV1(invocation, 32_768, "high")).toBe(25_088);
    expect(browserPiAgentMaximumOutputTokensV1(invocation, 10_000, "high")).toBe(10_000);
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
        id: "gpt-numeric-budget",
        supportedReasoningEfforts: ["off", "minimal", "low", "medium", "high"],
        defaultReasoningEffort: "medium",
      },
      {
        id: "gemini-3-flash",
        supportedReasoningEfforts: ["minimal", "low", "medium", "high"],
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
    const dispatch = creatorDispatchV1({
      proposalId: "proposal.test.1",
      programId: "program.test.1",
      baseProgramRevision: 1,
      text: "Test a neutral tool choice.",
    });
    createBrowserPiProviderAgentV1({
      apiKey: "test-only-key",
      instructions: "Create the requested Program.",
      runtimeProfile: creatorProgramRuntimeProfileImplementationV1,
      harnessToolIds: creatorProgramRuntimeProfileImplementationV1.harnessToolIds,
      fetch,
      selection: {
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        ...openAISelectionRouteV1,
      },
      invocation: invocationV1(creatorProgramRuntimeProfileImplementationV1, dispatch),
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
    expect(harnessV1.streamSimple).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.anything(),
      expect.not.objectContaining({ thinkingBudgets: expect.anything() }),
    );
  });

  it("uses honest candidate ceilings for effort-only and numeric-budget reasoning", () => {
    const dispatch = creatorDispatchV1({
      proposalId: "proposal.thinking-budget.1",
      programId: "program.thinking-budget.1",
      baseProgramRevision: 1,
      text: "Reserve answer room independently from thinking.",
    });
    const invocation = invocationV1(creatorProgramRuntimeProfileImplementationV1, dispatch);
    const commonInput = {
      apiKey: "thinking-budget-key",
      instructions: "Create the requested Program.",
      runtimeProfile: creatorProgramRuntimeProfileImplementationV1,
      harnessToolIds: creatorProgramRuntimeProfileImplementationV1.harnessToolIds,
      fetch,
      selection: {
        kind: "builtin" as const,
        providerId: "openai",
        modelId: "gpt-4.1-mini",
        ...openAISelectionRouteV1,
      },
      invocation,
      workspaceTools: Object.freeze([]),
      onCandidate: vi.fn(),
      onTextDelta: vi.fn(),
    };

    createBrowserPiProviderAgentV1({ ...commonInput, reasoningEffort: "high" });
    createBrowserPiProviderAgentV1({
      ...commonInput,
      selection: {
        kind: "builtin" as const,
        providerId: "openai",
        modelId: "gpt-numeric-budget",
        api: "openai-completions" as const,
        baseUrl: openAISelectionRouteV1.baseUrl,
      },
      reasoningEffort: "high",
    });
    createBrowserPiProviderAgentV1({
      ...commonInput,
      selection: {
        kind: "builtin" as const,
        providerId: "openai",
        modelId: "gemini-3-flash",
        api: "google-generative-ai" as const,
        baseUrl: "https://generativelanguage.googleapis.com",
      },
      reasoningEffort: "high",
    });
    const [effortOnlyInput, numericBudgetInput, requiredReasoningInput] = harnessV1
      .createdInputs as CapturedAgentInputV1[];
    expect(effortOnlyInput?.model).toMatchObject({ maxTokens: 2_048 });
    expect(effortOnlyInput?.reasoningEffort).toBe("off");
    expect(numericBudgetInput?.model).toMatchObject({ maxTokens: 4_096 });
    expect(numericBudgetInput?.reasoningEffort).toBe("high");
    expect(requiredReasoningInput?.model).toMatchObject({ maxTokens: 4_096 });
    expect(requiredReasoningInput?.reasoningEffort).toBe("minimal");

    effortOnlyInput?.streamFn(effortOnlyInput.model, { messages: [] }, { reasoning: "off" });
    numericBudgetInput?.streamFn(
      numericBudgetInput.model,
      { messages: [] },
      { reasoning: "high" },
    );
    requiredReasoningInput?.streamFn(
      requiredReasoningInput.model,
      { messages: [] },
      { reasoning: "minimal" },
    );
    expect(harnessV1.streamSimple).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      { messages: [] },
      expect.not.objectContaining({ thinkingBudgets: expect.anything() }),
    );
    expect(harnessV1.streamSimple).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      { messages: [] },
      expect.objectContaining({ thinkingBudgets: { high: 2_048 } }),
    );
    expect(harnessV1.streamSimple).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      { messages: [] },
      expect.not.objectContaining({ thinkingBudgets: expect.anything() }),
    );
  });

  it("keeps the Translation instructions unchanged when the package has no overlays", () => {
    const baselineDispatch = translationDispatchV1();
    const dispatch = {
      ...baselineDispatch,
      payload: { ...baselineDispatch.payload, requestedOutputTokens: 4_096 },
    };
    createBrowserPiProviderAgentV1({
      apiKey: "translation-test-key",
      instructions: "Translate the admitted batch faithfully.",
      modelPromptOverlays: [],
      runtimeProfile: translationProgramRuntimeProfileImplementationV1,
      harnessToolIds: translationProgramRuntimeProfileImplementationV1.harnessToolIds,
      fetch,
      selection: {
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        ...openAISelectionRouteV1,
      },
      invocation: invocationV1(translationProgramRuntimeProfileImplementationV1, dispatch),
      workspaceTools: [],
      reasoningEffort: "low",
      onCandidate: vi.fn(),
      onTextDelta: vi.fn(),
    });
    const input = harnessV1.createdInputs.at(-1) as CapturedAgentInputV1 | undefined;
    if (input === undefined) throw new Error("Pi Agent input was not captured");
    expect(input.instructions).toBe("Translate the admitted batch faithfully.");
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

  it("resolves model overlays for each new run after the model selection changes", () => {
    const dispatch = creatorDispatchV1({
      proposalId: "proposal.overlay-switch.1",
      programId: "program.overlay-switch.1",
      baseProgramRevision: 1,
      text: "Resolve the overlay against this run's model.",
    });
    const invocation = invocationV1(creatorProgramRuntimeProfileImplementationV1, dispatch);
    const modelPromptOverlays = [{
      modelPattern: "gpt-4.1-nano",
      path: "prompts/models/nano.md",
      instructions: "Use the nano-specific completion convention.",
    }, {
      modelPattern: "gpt-4.1-mini",
      path: "prompts/models/mini.md",
      instructions: "Use the mini-specific completion convention.",
    }];
    const commonInput = {
      apiKey: "overlay-switch-key",
      instructions: "Create the requested Program.",
      modelPromptOverlays,
      runtimeProfile: creatorProgramRuntimeProfileImplementationV1,
      harnessToolIds: creatorProgramRuntimeProfileImplementationV1.harnessToolIds,
      fetch,
      invocation,
      workspaceTools: Object.freeze([]),
      reasoningEffort: "medium" as const,
      onCandidate: vi.fn(),
      onTextDelta: vi.fn(),
    };

    createBrowserPiProviderAgentV1({
      ...commonInput,
      selection: {
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        ...openAISelectionRouteV1,
      },
    });
    createBrowserPiProviderAgentV1({
      ...commonInput,
      selection: {
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt-4.1-mini",
        ...openAISelectionRouteV1,
      },
    });

    const [nanoInput, miniInput] = harnessV1.createdInputs as CapturedAgentInputV1[];
    expect(nanoInput?.instructions).toBe(
      "Create the requested Program.\n\nUse the nano-specific completion convention.",
    );
    expect(miniInput?.instructions).toBe(
      "Create the requested Program.\n\nUse the mini-specific completion convention.",
    );
    expect(nanoInput?.completionTool.name).toBe("sillyos_propose_program_revision");
    expect(miniInput?.completionTool.name).toBe("sillyos_propose_program_revision");
    expect(nanoInput?.model).toMatchObject({ id: "gpt-4.1-nano", maxTokens: 2_048 });
    expect(miniInput?.model).toMatchObject({ id: "gpt-4.1-mini", maxTokens: 2_048 });
  });

  it("matches a custom model only by its resolved model ID", () => {
    const dispatch = creatorDispatchV1({
      proposalId: "proposal.custom-overlay.1",
      programId: "program.custom-overlay.1",
      baseProgramRevision: 1,
      text: "Use one overlay across custom routes with the same model ID.",
    });
    const invocation = invocationV1(creatorProgramRuntimeProfileImplementationV1, dispatch);
    const commonInput = {
      apiKey: "custom-overlay-key",
      instructions: "Create the requested Program.",
      modelPromptOverlays: [{
        modelPattern: "private-shared-model",
        path: "prompts/models/private-shared.md",
        instructions: "Use the private model's stable tool convention.",
      }],
      runtimeProfile: creatorProgramRuntimeProfileImplementationV1,
      harnessToolIds: creatorProgramRuntimeProfileImplementationV1.harnessToolIds,
      fetch,
      invocation,
      workspaceTools: Object.freeze([]),
      reasoningEffort: "high" as const,
      onCandidate: vi.fn(),
      onTextDelta: vi.fn(),
    };
    for (
      const [profileId, api, baseUrl] of [
        ["custom.route-a", "openai-completions", "https://a.example.test/v1"],
        ["custom.route-b", "anthropic-messages", "https://b.example.test/v1"],
      ] as const
    ) {
      createBrowserPiProviderAgentV1({
        ...commonInput,
        selection: {
          kind: "custom",
          profile: {
            profileId,
            displayName: profileId,
            api,
            baseUrl,
            modelId: "private-shared-model",
            contextWindow: 32_768,
            maxTokens: 4_096,
          },
        },
      });
    }

    const [routeAInput, routeBInput] = harnessV1.createdInputs as CapturedAgentInputV1[];
    const expectedInstructions =
      "Create the requested Program.\n\nUse the private model's stable tool convention.";
    expect(routeAInput?.instructions).toBe(expectedInstructions);
    expect(routeBInput?.instructions).toBe(expectedInstructions);
    expect(routeAInput?.model).toMatchObject({
      id: "private-shared-model",
      provider: "custom.route-a",
      api: "openai-completions",
    });
    expect(routeBInput?.model).toMatchObject({
      id: "private-shared-model",
      provider: "custom.route-b",
      api: "anthropic-messages",
    });
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
        { id: "gpt-numeric-budget", availability: "available" },
        { id: "gemini-3-flash", availability: "available" },
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

    const sameRouteDispatch = creatorDispatchV1({
      proposalId: "proposal.same-route.1",
      programId: "program.same-route.1",
      baseProgramRevision: 1,
      text: "Use another model on the same route.",
    });
    createBrowserPiProviderAgentV1({
      apiKey: "same-route-agent-key",
      instructions: "Create the requested Program.",
      runtimeProfile: creatorProgramRuntimeProfileImplementationV1,
      harnessToolIds: creatorProgramRuntimeProfileImplementationV1.harnessToolIds,
      fetch,
      selection: sameRouteSelection,
      invocation: invocationV1(
        creatorProgramRuntimeProfileImplementationV1,
        sameRouteDispatch,
      ),
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
    expect(captured?.reasoningEffort).toBe("off");

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
    const unavailableDispatch = creatorDispatchV1({
      proposalId: "proposal.unavailable.1",
      programId: "program.unavailable.1",
      baseProgramRevision: 1,
      text: "Reject an unsupported route family.",
    });
    expect(() =>
      createBrowserPiProviderAgentV1({
        apiKey: "unavailable-agent-key",
        instructions: "Create the requested Program.",
        runtimeProfile: creatorProgramRuntimeProfileImplementationV1,
        harnessToolIds: creatorProgramRuntimeProfileImplementationV1.harnessToolIds,
        fetch,
        selection: unavailableSelection,
        invocation: invocationV1(
          creatorProgramRuntimeProfileImplementationV1,
          unavailableDispatch,
        ),
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

      const dispatch = creatorDispatchV1({
        proposalId: "proposal.custom.1",
        programId: "program.custom.1",
        baseProgramRevision: 1,
        text: "Use the custom endpoint.",
      });
      createBrowserPiProviderAgentV1({
        apiKey: "custom-agent-key",
        instructions: "Create the requested Program.",
        runtimeProfile: creatorProgramRuntimeProfileImplementationV1,
        harnessToolIds: creatorProgramRuntimeProfileImplementationV1.harnessToolIds,
        fetch,
        selection,
        invocation: invocationV1(creatorProgramRuntimeProfileImplementationV1, dispatch),
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
