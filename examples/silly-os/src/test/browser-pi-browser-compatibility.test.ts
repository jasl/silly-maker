// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  browserPiBrowserApiFamiliesV1,
  browserPiSingleSecretProviderIdsV1,
  getBrowserPiProviderRouteAvailabilityV1,
  isBrowserPiProviderRouteConfigurableV1,
} from "../agent/browser-pi-browser-compatibility.ts";

const expectedSingleSecretProviderIdsV1 = Object.freeze(
  [
    "ant-ling",
    "anthropic",
    "baseten",
    "cerebras",
    "deepseek",
    "fireworks",
    "github-copilot",
    "google",
    "groq",
    "huggingface",
    "kimi-coding",
    "minimax",
    "minimax-cn",
    "moonshotai",
    "moonshotai-cn",
    "nvidia",
    "openai",
    "opencode",
    "opencode-go",
    "openrouter",
    "qwen-token-plan",
    "qwen-token-plan-cn",
    "qwen-token-plan-individual",
    "together",
    "vercel-ai-gateway",
    "xai",
    "xiaomi",
    "xiaomi-token-plan-ams",
    "xiaomi-token-plan-cn",
    "xiaomi-token-plan-sgp",
    "zai",
    "zai-coding-cn",
  ] as const,
);

interface PinnedPiProviderV1 {
  readonly id: string;
  readonly auth: {
    readonly apiKey?: {
      readonly login?: (interaction: {
        readonly signal: AbortSignal;
        readonly prompt: (prompt: { readonly type: string }) => Promise<string>;
        readonly notify: () => void;
      }) => Promise<unknown>;
    };
  };
  getModels(): readonly {
    readonly id: string;
    readonly api: string;
    readonly baseUrl: string;
  }[];
}

const piProvidersModuleSpecifierV1: string = "@earendil-works/pi-ai/providers/all";

async function builtinProvidersV1(): Promise<readonly PinnedPiProviderV1[]> {
  const module = await import(piProvidersModuleSpecifierV1) as {
    readonly builtinProviders: () => readonly PinnedPiProviderV1[];
  };
  return module.builtinProviders();
}

describe("SillyOS Browser Pi Provider compatibility", () => {
  it("pins the Browser Settings single-secret Provider shape to Pi 0.84.3", async () => {
    expect(browserPiSingleSecretProviderIdsV1).toEqual(expectedSingleSecretProviderIdsV1);
    const providers = await builtinProvidersV1();
    const providerById = new Map(providers.map((provider) => [provider.id, provider]));

    for (const providerId of expectedSingleSecretProviderIdsV1) {
      const provider = providerById.get(providerId);
      if (provider === undefined) throw new Error(`missing pinned Pi Provider: ${providerId}`);
      const login = provider.auth.apiKey?.login;
      if (login === undefined) throw new Error(`missing API-key login: ${providerId}`);
      const prompts: string[] = [];
      const credential = await login({
        signal: new AbortController().signal,
        async prompt(prompt) {
          prompts.push(prompt.type);
          return "shape-test-secret";
        },
        notify() {},
      });
      expect(prompts, providerId).toEqual(["secret"]);
      expect(credential, providerId).toEqual({
        type: "api_key",
        key: "shape-test-secret",
      });
    }
  });

  it("makes every pinned model on a supported canonical route available", async () => {
    const providers = await builtinProvidersV1();
    const selectedIds = new Set<string>(browserPiSingleSecretProviderIdsV1);
    const selectedModels = providers.flatMap((provider) =>
      selectedIds.has(provider.id) ? provider.getModels().map((model) => ({ provider, model })) : []
    );
    expect(selectedModels).toHaveLength(1_032);
    expect(
      new Set(
        selectedModels.map(({ provider, model }) =>
          `${provider.id}\0${model.api}\0${model.baseUrl}`
        ),
      ),
    ).toHaveLength(40);

    for (const { provider, model } of selectedModels) {
      expect(browserPiBrowserApiFamiliesV1, `${provider.id}/${model.id}`).toContain(model.api);
      const route = {
        providerId: provider.id,
        api: model.api,
        baseUrl: model.baseUrl,
      };
      expect(getBrowserPiProviderRouteAvailabilityV1(route), `${provider.id}/${model.id}`).toBe(
        "available",
      );
      expect(isBrowserPiProviderRouteConfigurableV1(route), `${provider.id}/${model.id}`).toBe(
        true,
      );
    }
  });

  it("uses Provider, API family, and canonical HTTPS endpoint only—not model identity", () => {
    const route = {
      providerId: "openai",
      api: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
    } as const;
    const firstModel = { ...route, modelId: "first" };
    const unseenModel = { ...route, modelId: "unseen-future-model" };
    expect(getBrowserPiProviderRouteAvailabilityV1(firstModel)).toBe("available");
    expect(getBrowserPiProviderRouteAvailabilityV1(unseenModel)).toBe("available");

    for (
      const incompatible of [
        { ...route, providerId: "azure-openai-responses" },
        { ...route, api: "mistral-conversations" },
        { ...route, baseUrl: "http://api.openai.com/v1" },
        { ...route, baseUrl: "https://api.openai.com/v1/" },
        { ...route, baseUrl: "https://api.openai.com/v1?mode=test" },
      ]
    ) {
      expect(getBrowserPiProviderRouteAvailabilityV1(incompatible)).toBe("unavailable");
      expect(isBrowserPiProviderRouteConfigurableV1(incompatible)).toBe(false);
    }
  });

  it("keeps every Provider outside the bounded single-secret set unavailable", async () => {
    const selectedIds = new Set<string>(browserPiSingleSecretProviderIdsV1);
    const providers = await builtinProvidersV1();
    for (const provider of providers) {
      if (selectedIds.has(provider.id)) continue;
      for (const model of provider.getModels()) {
        expect(
          getBrowserPiProviderRouteAvailabilityV1({
            providerId: provider.id,
            api: model.api,
            baseUrl: model.baseUrl,
          }),
          `${provider.id}/${model.id}`,
        ).toBe("unavailable");
      }
    }
    expect(providers.find(({ id }) => id === "mistral")?.getModels()).not.toHaveLength(0);
  });
});
