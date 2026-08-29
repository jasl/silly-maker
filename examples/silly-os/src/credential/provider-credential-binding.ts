// SPDX-License-Identifier: MIT

import type { BrowserPiModelSelectionV1 } from "../agent/browser-pi-worker-protocol.ts";
import {
  canonicalizeCredentialVaultBaseUrlV2,
  normalizeCredentialVaultBindingV2,
  type CredentialVaultBindingV2,
} from "./credential-vault-contracts.ts";

export type CredentialVaultConnectionIdentityV2 =
  | {
    readonly kind: "builtin";
    readonly providerId: string;
    readonly baseUrl: string;
  }
  | {
    readonly kind: "custom";
    readonly profileId: string;
    readonly baseUrl: string;
  };

/**
 * Derives one exact endpoint credential binding without requiring or recording
 * a model choice. Model preferences remain an independent product concern.
 */
export function credentialVaultBindingForConnectionV2(
  connection: CredentialVaultConnectionIdentityV2,
): CredentialVaultBindingV2 {
  const baseUrl = canonicalizeCredentialVaultBaseUrlV2(connection.baseUrl);
  if (baseUrl === null) throw new TypeError("sillyos.credential_vault.binding_invalid/baseUrl");
  return normalizeCredentialVaultBindingV2({
    bindingId: connection.kind === "builtin"
      ? `builtin:${connection.providerId}`
      : `custom:${connection.profileId}`,
    credentialKind: "api_key",
    baseUrl,
  });
}

/** Transitional Agent transport wrapper; identity is still model-free. */
export function credentialVaultBindingForSelectionV2(
  selection: BrowserPiModelSelectionV1,
): CredentialVaultBindingV2 {
  return credentialVaultBindingForConnectionV2(
    selection.kind === "builtin"
      ? { kind: "builtin", providerId: selection.providerId, baseUrl: selection.baseUrl }
      : {
        kind: "custom",
        profileId: selection.profile.profileId,
        baseUrl: selection.profile.baseUrl,
      },
  );
}
