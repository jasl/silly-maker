// SPDX-License-Identifier: MIT

import type { BrowserPiModelSelectionV1 } from "../agent/browser-pi-worker-protocol.ts";
import type { BrowserProviderBuiltinModelRefV1 } from "../product/browser-provider-settings-repository.ts";
import {
  credentialVaultBindingsEqualV2,
  type CredentialVaultBindingV2,
} from "./credential-vault-contracts.ts";
import { credentialVaultBindingForSelectionV2 } from "./provider-credential-binding.ts";

/** Replacement is fail-closed whenever the current Agent owns any target binding. */
export function activeAgentUsesAnyCredentialBindingV1(
  activeSelection: BrowserPiModelSelectionV1 | null,
  bindings: readonly CredentialVaultBindingV2[],
): boolean {
  if (activeSelection === null) return false;
  try {
    const activeBinding = credentialVaultBindingForSelectionV2(activeSelection);
    return bindings.some((binding) => credentialVaultBindingsEqualV2(activeBinding, binding));
  } catch {
    return true;
  }
}

export function shouldRevokeAgentAfterBuiltinModelVisibilityChangeV1(input: {
  readonly activeSelection: BrowserPiModelSelectionV1 | null;
  readonly changedModel: BrowserProviderBuiltinModelRefV1;
  readonly enabled: boolean;
  readonly sameCredentialScopeReplacementAvailable: boolean;
}): boolean {
  const active = input.activeSelection;
  return !input.enabled && !input.sameCredentialScopeReplacementAvailable &&
    active?.kind === "builtin" && active.providerId === input.changedModel.providerId &&
    active.modelId === input.changedModel.modelId;
}
