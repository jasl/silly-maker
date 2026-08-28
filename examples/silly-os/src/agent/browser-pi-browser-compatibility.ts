// SPDX-License-Identifier: MIT

import type { BrowserPiCatalogAvailabilityV1 } from "./browser-pi-worker-protocol.ts";

export interface BrowserPiProviderRouteFactsV1 {
  readonly providerId: string;
  readonly api: string;
  readonly baseUrl: string;
}

/**
 * Pi Providers whose pinned API-key login is one secret with no additional
 * account, endpoint, ambient-credential, or OAuth-only requirement.
 *
 * This is a Browser Settings credential-shape boundary, not a model-quality
 * or general Provider-support claim. The pinned Pi conformance test owns drift
 * detection for this list.
 */
export const browserPiSingleSecretProviderIdsV1 = Object.freeze(
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

const browserPiSingleSecretProviderIdSetV1 = new Set<string>(
  browserPiSingleSecretProviderIdsV1,
);

export const browserPiBrowserApiFamiliesV1 = Object.freeze(
  [
    "anthropic-messages",
    "google-generative-ai",
    "openai-completions",
    "openai-responses",
  ] as const,
);

const browserPiBrowserApiFamilySetV1 = new Set<string>(browserPiBrowserApiFamiliesV1);

function isCanonicalHttpsBaseUrlV1(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.origin === "null" || url.username.length !== 0 ||
      url.password.length !== 0 || url.search.length !== 0 || url.hash.length !== 0
    ) return false;
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/u, "");
    return `${url.origin}${path}` === value;
  } catch {
    return false;
  }
}

export function getBrowserPiProviderRouteAvailabilityV1(
  facts: BrowserPiProviderRouteFactsV1,
): BrowserPiCatalogAvailabilityV1 {
  return browserPiSingleSecretProviderIdSetV1.has(facts.providerId) &&
      browserPiBrowserApiFamilySetV1.has(facts.api) &&
      isCanonicalHttpsBaseUrlV1(facts.baseUrl)
    ? "available"
    : "unavailable";
}

export function isBrowserPiProviderRouteConfigurableV1(
  facts: BrowserPiProviderRouteFactsV1,
): boolean {
  return getBrowserPiProviderRouteAvailabilityV1(facts) === "available";
}
