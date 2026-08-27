// SPDX-License-Identifier: MIT

import type { BrowserPiCatalogAvailabilityV1 } from "./browser-pi-worker-protocol.ts";

export interface BrowserPiModelQualificationFactsV1 {
  readonly providerId: string;
  readonly modelId: string;
  readonly api: string;
  readonly baseUrl: string;
}

export const browserPiQualifiedSelectionV1 = Object.freeze(
  {
    providerId: "openai",
    modelId: "gpt-4.1-nano",
    api: "openai-responses",
    baseUrl: "https://api.openai.com/v1",
  } as const,
);

const browserPiCandidateSelectionsV1 = Object.freeze(
  [
    Object.freeze({
      providerId: "anthropic",
      modelId: "claude-sonnet-4-5",
      api: "anthropic-messages",
      baseUrl: "https://api.anthropic.com",
    }),
    Object.freeze({
      providerId: "google",
      modelId: "gemini-2.5-flash",
      api: "google-generative-ai",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    }),
    Object.freeze({
      providerId: "openrouter",
      modelId: "openai/gpt-5.4",
      api: "openai-completions",
      baseUrl: "https://openrouter.ai/api/v1",
    }),
    Object.freeze({
      providerId: "deepseek",
      modelId: "deepseek-v4-flash",
      api: "openai-completions",
      baseUrl: "https://api.deepseek.com",
    }),
    Object.freeze({
      providerId: "xai",
      modelId: "grok-4.3",
      api: "openai-responses",
      baseUrl: "https://api.x.ai/v1",
    }),
  ] satisfies readonly BrowserPiModelQualificationFactsV1[],
);

function matchesFactsV1(
  left: BrowserPiModelQualificationFactsV1,
  right: BrowserPiModelQualificationFactsV1,
): boolean {
  return left.providerId === right.providerId && left.modelId === right.modelId &&
    left.api === right.api && left.baseUrl === right.baseUrl;
}

export function getBrowserPiModelAvailabilityV1(
  facts: BrowserPiModelQualificationFactsV1,
): BrowserPiCatalogAvailabilityV1 {
  if (matchesFactsV1(facts, browserPiQualifiedSelectionV1)) return "qualified";
  return browserPiCandidateSelectionsV1.some((candidate) => matchesFactsV1(facts, candidate))
    ? "candidate"
    : "unavailable";
}

export function isBrowserPiModelQualifiedV1(
  facts: BrowserPiModelQualificationFactsV1,
): boolean {
  return getBrowserPiModelAvailabilityV1(facts) === "qualified";
}
