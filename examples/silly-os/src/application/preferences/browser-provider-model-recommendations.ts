// SPDX-License-Identifier: MIT

import type { BrowserProviderBuiltinModelRefV1 } from "./browser-provider-settings-repository.ts";

export const browserProviderRecommendedModelFamiliesV1 = Object.freeze(
  [
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
  ] as const,
);

interface BrowserProviderRecommendationModelV1 {
  readonly modelId: string;
  readonly availability: { readonly status: "available" | "unavailable" };
}

interface BrowserProviderRecommendationProviderV1 {
  readonly providerId: string;
  readonly models: readonly BrowserProviderRecommendationModelV1[];
}

const asciiTokenV1 = /[a-z0-9]+/gu;
const ignorableNumericSuffixTokenV1 = /^(?:v)?\d{1,8}$/u;

function modelFamilyTokensV1(value: string): readonly string[] {
  return value.toLowerCase().match(asciiTokenV1) ?? [];
}

function hasOnlyIgnorableVersionSuffixV1(tokens: readonly string[]): boolean {
  return tokens.length <= 4 && tokens.every((token) => ignorableNumericSuffixTokenV1.test(token));
}

/**
 * Matches one maintained family against a Pi-owned model id without inventing
 * a model identity. Namespace/vendor prefixes are allowed. Only trailing
 * numeric date, patch, or packaging-version tokens are ignored; semantic
 * variants such as `fast`, `pro`, `batch`, or `vision` remain distinct.
 */
export function browserProviderModelMatchesRecommendedFamilyV1(
  modelId: string,
  recommendedFamily: string,
): boolean {
  const modelTokens = modelFamilyTokensV1(modelId);
  const familyTokens = modelFamilyTokensV1(recommendedFamily);
  if (familyTokens.length === 0 || familyTokens.length > modelTokens.length) return false;

  for (
    let start = 0;
    start + familyTokens.length <= modelTokens.length;
    start += 1
  ) {
    if (!familyTokens.every((token, index) => modelTokens[start + index] === token)) continue;
    if (hasOnlyIgnorableVersionSuffixV1(modelTokens.slice(start + familyTokens.length))) {
      return true;
    }
  }
  return false;
}

export function isBrowserProviderRecommendedModelIdV1(modelId: string): boolean {
  return browserProviderRecommendedModelFamiliesV1.some((family) =>
    browserProviderModelMatchesRecommendedFamilyV1(modelId, family)
  );
}

function compareBuiltinModelRefsV1(
  left: BrowserProviderBuiltinModelRefV1,
  right: BrowserProviderBuiltinModelRefV1,
): number {
  if (left.providerId !== right.providerId) return left.providerId < right.providerId ? -1 : 1;
  return left.modelId < right.modelId ? -1 : left.modelId > right.modelId ? 1 : 0;
}

/** Projects only exact Browser-available Pi catalog identities. */
export function recommendedBrowserProviderBuiltinModelRefsV1(
  providers: readonly BrowserProviderRecommendationProviderV1[],
): readonly BrowserProviderBuiltinModelRefV1[] {
  const seen = new Set<string>();
  const result: BrowserProviderBuiltinModelRefV1[] = [];
  for (const provider of providers) {
    for (const model of provider.models) {
      if (
        model.availability.status !== "available" ||
        !isBrowserProviderRecommendedModelIdV1(model.modelId)
      ) continue;
      const key = JSON.stringify([provider.providerId, model.modelId]);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(Object.freeze({ providerId: provider.providerId, modelId: model.modelId }));
    }
  }
  return Object.freeze(result.sort(compareBuiltinModelRefsV1));
}
