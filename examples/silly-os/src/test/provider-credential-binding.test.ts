// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  credentialVaultBindingForConnectionV2,
  credentialVaultBindingForSelectionV2,
} from "../credential/provider-credential-binding.ts";

describe("Provider credential Vault binding", () => {
  it("shares one immutable built-in endpoint binding across model choices", () => {
    const first = credentialVaultBindingForSelectionV2({
      kind: "builtin",
      providerId: "anthropic",
      modelId: "claude-sonnet",
      api: "anthropic-messages",
      baseUrl: "https://api.anthropic.com/",
    });
    const second = credentialVaultBindingForSelectionV2({
      kind: "builtin",
      providerId: "anthropic",
      modelId: "claude-opus",
      api: "anthropic-messages",
      baseUrl: "https://api.anthropic.com",
    });
    expect(first).toEqual({
      bindingId: "builtin:anthropic",
      credentialKind: "api_key",
      baseUrl: "https://api.anthropic.com",
    });
    expect(second).toEqual(first);
  });

  it("keeps custom profile identity and complete path-bound endpoint", () => {
    expect(credentialVaultBindingForSelectionV2({
      kind: "custom",
      profile: {
        profileId: "custom.1234",
        displayName: "Gateway",
        api: "openai-responses",
        baseUrl: "https://gateway.example.test/team/v1/",
        modelId: "model-a",
        contextWindow: 32_768,
        maxTokens: 4_096,
      },
    })).toEqual({
      bindingId: "custom:custom.1234",
      credentialKind: "api_key",
      baseUrl: "https://gateway.example.test/team/v1",
    });
  });

  it("fails rather than rebinding an invalid or non-HTTPS endpoint", () => {
    expect(() =>
      credentialVaultBindingForSelectionV2({
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt",
        api: "openai-responses",
        baseUrl: "http://localhost:11434/v1",
      })
    ).toThrow(/binding_invalid/u);
  });

  it("derives endpoint identity without a model and keeps multiple Provider endpoints distinct", () => {
    const first = credentialVaultBindingForConnectionV2({
      kind: "builtin",
      providerId: "anthropic",
      baseUrl: "https://api.anthropic.com/v1",
    });
    const second = credentialVaultBindingForConnectionV2({
      kind: "builtin",
      providerId: "anthropic",
      baseUrl: "https://gateway.example.test/anthropic",
    });
    expect(first.bindingId).toBe(second.bindingId);
    expect(first.baseUrl).not.toBe(second.baseUrl);
  });
});
