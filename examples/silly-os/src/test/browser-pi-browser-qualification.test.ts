// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  browserPiQualifiedSelectionsV1,
  getBrowserPiModelAvailabilityV1,
  isBrowserPiModelQualifiedV1,
  type BrowserPiModelQualificationFactsV1,
} from "../agent/browser-pi-browser-qualification.ts";

const expectedQualifiedProfilesV1 = Object.freeze(
  [
    {
      providerId: "openai",
      modelId: "gpt-4.1-nano",
      api: "openai-responses",
      baseUrl: "https://api.openai.com/v1",
    },
    {
      providerId: "anthropic",
      modelId: "claude-sonnet-4-5-20250929",
      api: "anthropic-messages",
      baseUrl: "https://api.anthropic.com",
    },
    {
      providerId: "google",
      modelId: "gemini-2.5-flash",
      api: "google-generative-ai",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    },
    {
      providerId: "deepseek",
      modelId: "deepseek-v4-flash",
      api: "openai-completions",
      baseUrl: "https://api.deepseek.com",
    },
    {
      providerId: "xai",
      modelId: "grok-4.3",
      api: "openai-responses",
      baseUrl: "https://api.x.ai/v1",
    },
  ] satisfies readonly BrowserPiModelQualificationFactsV1[],
);

describe("SillyOS Browser Pi qualification overlay", () => {
  it("qualifies only the five exact profiles that passed the Browser gate", () => {
    expect(browserPiQualifiedSelectionsV1).toEqual(expectedQualifiedProfilesV1);
    for (const profile of expectedQualifiedProfilesV1) {
      expect(getBrowserPiModelAvailabilityV1(profile)).toBe("qualified");
      expect(isBrowserPiModelQualifiedV1(profile)).toBe(true);
    }
  });

  it("keeps the mutable Anthropic alias and blocked OpenRouter profile as candidates", () => {
    const candidates = [
      {
        providerId: "anthropic",
        modelId: "claude-sonnet-4-5",
        api: "anthropic-messages",
        baseUrl: "https://api.anthropic.com",
      },
      {
        providerId: "openrouter",
        modelId: "google/gemini-2.5-flash",
        api: "openai-completions",
        baseUrl: "https://openrouter.ai/api/v1",
      },
    ] as const;
    for (const candidate of candidates) {
      expect(getBrowserPiModelAvailabilityV1(candidate)).toBe("candidate");
      expect(isBrowserPiModelQualifiedV1(candidate)).toBe(false);
    }
  });

  it("rejects profile drift in every exact tuple dimension", () => {
    const exact = expectedQualifiedProfilesV1[1];
    if (exact === undefined) throw new Error("expected the Anthropic fixed profile");
    const drifted = [
      { ...exact, providerId: "anthropic-other" },
      { ...exact, modelId: "claude-sonnet-4-5-20250929-drift" },
      { ...exact, api: "openai-completions" },
      { ...exact, baseUrl: "https://api.anthropic.com/v1" },
    ];
    for (const profile of drifted) {
      expect(getBrowserPiModelAvailabilityV1(profile)).toBe("unavailable");
      expect(isBrowserPiModelQualifiedV1(profile)).toBe(false);
    }
  });
});
