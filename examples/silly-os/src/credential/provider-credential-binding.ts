// SPDX-License-Identifier: MIT

import type { BrowserPiModelSelectionV1 } from "../agent/browser-pi-worker-protocol.ts";
import {
  canonicalizeCredentialVaultBaseUrlV1,
  normalizeCredentialVaultBindingV1,
  type CredentialVaultBindingV1,
} from "./credential-vault-contracts.ts";

/**
 * One Provider/custom profile owns one immutable credential endpoint. Model
 * changes inside the same built-in Provider scope do not create another key.
 */
export function credentialVaultBindingForSelectionV1(
  selection: BrowserPiModelSelectionV1,
): CredentialVaultBindingV1 {
  const inputBaseUrl = selection.kind === "builtin" ? selection.baseUrl : selection.profile.baseUrl;
  const baseUrl = canonicalizeCredentialVaultBaseUrlV1(inputBaseUrl);
  if (baseUrl === null) throw new TypeError("sillyos.credential_vault.binding_invalid/baseUrl");
  return normalizeCredentialVaultBindingV1({
    bindingId: selection.kind === "builtin"
      ? `builtin:${selection.providerId}`
      : `custom:${selection.profile.profileId}`,
    credentialKind: "api_key",
    baseUrl,
  });
}
