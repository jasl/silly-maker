// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { projectBrowserPiProviderCatalogV1 } from "../agent/browser-pi-provider-runtime-bridge.js";
import {
  browserProviderModelMatchesRecommendedFamilyV1,
  browserProviderRecommendedModelFamiliesV1,
  isBrowserProviderRecommendedModelIdV1,
  recommendedBrowserProviderBuiltinModelRefsV1,
} from "../product/browser-provider-model-recommendations.ts";
import { projectProviderSettingsCatalogV1 } from "../ui/provider-settings-catalog.ts";

describe("Browser Provider recommended model defaults", () => {
  it("keeps the owner-selected families as one explicit product list", () => {
    expect(browserProviderRecommendedModelFamiliesV1).toEqual([
      "fable-5",
      "opus-4-6",
      "opus-5",
      "deepseek-v4-pro",
      "deepSeek-v4-flash",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "gpt-5.6-luna",
      "gpt-5.6-terra",
      "gpt-5.6-sol",
      "minimax-m3",
      "kimi-k3",
      "qwen3.8-max",
      "gemini-3.7-flash",
      "gemini-flash-latest",
      "gemma-4-31b-it",
      "gemma-4-26b-a4b-it",
    ]);
  });

  it("matches case-insensitively across catalog namespaces and numeric suffixes", () => {
    const matches = [
      ["deepseek-ai/DeepSeek-V4-Flash-0731", "deepSeek-v4-flash"],
      ["anthropic.claude-opus-4-6-v1-0", "opus-4-6"],
      ["claude-opus-4.6", "opus-4-6"],
      ["zai-org/GLM-5.3.1", "glm-5.3"],
      ["google/gemma-4-26B-A4B-it", "gemma-4-26b-a4b-it"],
    ] as const;
    for (const [modelId, family] of matches) {
      expect(browserProviderModelMatchesRecommendedFamilyV1(modelId, family)).toBe(true);
    }
  });

  it("does not erase semantic suffixes or accept token substrings", () => {
    const misses = [
      ["gpt-5.6-luna-pro", "gpt-5.6-luna"],
      ["glm-5.3-flash", "glm-5.3"],
      ["deepseek-v4-flash-vision-exp", "deepseek-v4-flash"],
      ["fable-5-batch", "fable-5"],
      ["notfable-5", "fable-5"],
    ] as const;
    for (const [modelId, family] of misses) {
      expect(browserProviderModelMatchesRecommendedFamilyV1(modelId, family)).toBe(false);
    }
    expect(isBrowserProviderRecommendedModelIdV1("glm-5.3-flash")).toBe(true);
  });

  it("projects only exact Browser-available catalog refs without truncation", () => {
    const catalog = projectProviderSettingsCatalogV1(projectBrowserPiProviderCatalogV1());
    expect(catalog.phase).toBe("ready");
    if (catalog.phase !== "ready") throw new Error("expected ready catalog");

    const refs = recommendedBrowserProviderBuiltinModelRefsV1(catalog.providers);
    // The regression this test owns was an old 128-result truncation. The
    // upstream Pi catalog is data, so its exact current count is not a product
    // contract and must not need a source edit on every catalog refresh.
    expect(refs.length).toBeGreaterThan(128);
    expect(refs).toContainEqual({
      providerId: "baseten",
      modelId: "deepseek-ai/DeepSeek-V4-Flash-0731",
    });
    expect(refs).toContainEqual({ providerId: "anthropic", modelId: "claude-opus-5" });
  });

  it("excludes unavailable and duplicate catalog records", () => {
    const refs = recommendedBrowserProviderBuiltinModelRefsV1([{
      providerId: "provider",
      models: [
        { modelId: "claude-opus-5", availability: { status: "available" } },
        { modelId: "claude-opus-5", availability: { status: "available" } },
        { modelId: "deepseek-v4-pro", availability: { status: "unavailable" } },
        { modelId: "unlisted-model", availability: { status: "available" } },
      ],
    }]);
    expect(refs).toEqual([{ providerId: "provider", modelId: "claude-opus-5" }]);
  });
});
