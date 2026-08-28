// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { browserPiDistributionIdentityV1 } from "../agent/browser-pi-distribution.ts";
import type { BrowserPiProviderCatalogWireV1 } from "../agent/browser-pi-worker-protocol.ts";
import { projectProviderSettingsCatalogV1 } from "../ui/provider-settings-catalog.ts";

function catalogModelV1(id: string, baseUrl = "https://api.anthropic.com") {
  return {
    id,
    name: id,
    api: "anthropic-messages",
    baseUrl,
    reasoning: true,
    input: ["text"] as const,
    contextWindow: 200_000,
    maxTokens: 32_000,
    availability: "available" as const,
  };
}

describe("SillyOS Provider settings catalog presentation", () => {
  it("prefers an existing stable alias over its same-route dated snapshot", () => {
    const catalog: BrowserPiProviderCatalogWireV1 = {
      revision: 1,
      distribution: browserPiDistributionIdentityV1,
      providers: [{
        id: "anthropic",
        name: "Anthropic",
        baseUrl: "https://api.anthropic.com",
        availability: "available",
        models: [
          catalogModelV1("claude-sonnet-4-5"),
          catalogModelV1("claude-sonnet-4-5-20250929"),
          catalogModelV1("claude-opus-4-6"),
        ],
      }],
    };

    const projected = projectProviderSettingsCatalogV1(catalog);
    expect(projected.phase).toBe("ready");
    if (projected.phase !== "ready") throw new Error("expected ready catalog");
    expect(projected.providers[0]?.models.map(({ modelId }) => modelId)).toEqual([
      "claude-sonnet-4-5",
      "claude-opus-4-6",
    ]);
  });

  it("keeps exact dated records when Pi exposes no matching same-route alias", () => {
    const catalog: BrowserPiProviderCatalogWireV1 = {
      revision: 1,
      distribution: browserPiDistributionIdentityV1,
      providers: [{
        id: "anthropic",
        name: "Anthropic",
        baseUrl: "https://api.anthropic.com",
        availability: "available",
        models: [
          catalogModelV1("claude-sonnet-4-5", "https://gateway.example.com"),
          catalogModelV1("claude-sonnet-4-5-20250929"),
        ],
      }],
    };

    const projected = projectProviderSettingsCatalogV1(catalog);
    expect(projected.phase).toBe("ready");
    if (projected.phase !== "ready") throw new Error("expected ready catalog");
    expect(projected.providers[0]?.models.map(({ modelId }) => modelId)).toEqual([
      "claude-sonnet-4-5",
      "claude-sonnet-4-5-20250929",
    ]);
  });
});
