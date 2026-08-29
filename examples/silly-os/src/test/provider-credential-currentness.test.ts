// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import type { BrowserPiModelSelectionV1 } from "../agent/browser-pi-worker-protocol.ts";
import {
  activeAgentUsesAnyCredentialBindingV1,
  shouldRevokeAgentAfterBuiltinModelVisibilityChangeV1,
} from "../credential/provider-credential-currentness.ts";
import { credentialVaultBindingForSelectionV2 } from "../credential/provider-credential-binding.ts";

const activeSelectionV1: BrowserPiModelSelectionV1 = {
  kind: "builtin",
  providerId: "anthropic",
  modelId: "claude-sonnet",
  api: "anthropic-messages",
  baseUrl: "https://api.anthropic.com/v1",
};

describe("Provider credential currentness", () => {
  it("revokes before replacing any exact binding owned by the active Agent", () => {
    expect(activeAgentUsesAnyCredentialBindingV1(activeSelectionV1, [
      credentialVaultBindingForSelectionV2(activeSelectionV1),
    ])).toBe(true);
    expect(activeAgentUsesAnyCredentialBindingV1(activeSelectionV1, [{
      ...credentialVaultBindingForSelectionV2(activeSelectionV1),
      baseUrl: "https://api.anthropic.com/v2",
    }])).toBe(false);
  });

  it("revokes when the active final visible model has no same-scope replacement", () => {
    const changedModel = { providerId: "anthropic", modelId: "claude-sonnet" };
    expect(shouldRevokeAgentAfterBuiltinModelVisibilityChangeV1({
      activeSelection: activeSelectionV1,
      changedModel,
      enabled: false,
      sameCredentialScopeReplacementAvailable: false,
    })).toBe(true);
    expect(shouldRevokeAgentAfterBuiltinModelVisibilityChangeV1({
      activeSelection: activeSelectionV1,
      changedModel,
      enabled: false,
      sameCredentialScopeReplacementAvailable: true,
    })).toBe(false);
  });
});
