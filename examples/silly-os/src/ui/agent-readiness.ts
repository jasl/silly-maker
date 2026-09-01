// SPDX-License-Identifier: MIT

import type { BrowserPiModelSelectionV1 } from "../agent/browser-pi-worker-protocol.ts";
import { credentialVaultBindingsEqualV2 } from "../credential/credential-vault-contracts.ts";
import { credentialVaultBindingForSelectionV2 } from "../credential/provider-credential-binding.ts";
import type { ProviderSettingsVaultV1 } from "./provider-settings.tsx";

export type AgentReadinessRecoveryTargetV1 =
  | "providers"
  | "credential_vault"
  | null;

export type AgentReadinessV1 =
  | { readonly status: "catalog_loading"; readonly recoveryTarget: null }
  | { readonly status: "catalog_failed"; readonly recoveryTarget: "providers" }
  | { readonly status: "vault_loading"; readonly recoveryTarget: null }
  | { readonly status: "vault_unavailable"; readonly recoveryTarget: "credential_vault" }
  | { readonly status: "vault_locked"; readonly recoveryTarget: "credential_vault" }
  | { readonly status: "model_required"; readonly recoveryTarget: "providers" }
  | { readonly status: "credential_required"; readonly recoveryTarget: "providers" }
  | { readonly status: "agent_initializing"; readonly recoveryTarget: null }
  | { readonly status: "agent_failed"; readonly recoveryTarget: "providers" | null }
  | { readonly status: "ready"; readonly recoveryTarget: null };

export interface AgentReadinessInputV1 {
  readonly catalogStatus: "loading" | "failed" | "ready";
  readonly vaultStatus: "loading" | "unavailable" | "locked" | "unlocked";
  readonly hasEnabledConfiguredModel: boolean;
  readonly hasModelWithCredentialedProvider: boolean;
  readonly hasSelectedModel: boolean;
  readonly agentStatus: "initializing" | "failed" | "ready";
}

/**
 * Keeps transient Vault actions truthful to the physical state they preserve.
 * Changing the unlock mode or failing an action does not revoke an already
 * unlocked Vault; a lock action separately revokes the Agent credential.
 */
export function projectCredentialVaultStatusV1(
  vault: ProviderSettingsVaultV1,
): AgentReadinessInputV1["vaultStatus"] {
  switch (vault.phase) {
    case "unavailable":
      return vault.diagnosticCode === "initializing" ? "loading" : "unavailable";
    case "busy":
      return vault.state ?? "loading";
    case "failed":
      return vault.state ?? "unavailable";
    case "locked":
      return "locked";
    case "unlocked":
      return "unlocked";
  }
  const exhaustive: never = vault;
  return exhaustive;
}

/** A busy Vault preserves state but does not admit a new credential handoff. */
export function credentialVaultCanHandoffProviderCredentialV1(
  vault: ProviderSettingsVaultV1,
): boolean {
  return vault.state === "unlocked" && vault.phase !== "busy";
}

/**
 * Credentials belong to a Provider endpoint. Models are available only when
 * their Provider endpoint has a matching saved credential.
 */
export function credentialVaultHasProviderCredentialV1(
  vault: ProviderSettingsVaultV1,
  selection: BrowserPiModelSelectionV1,
): boolean {
  if (vault.state !== "unlocked") return false;
  try {
    const binding = credentialVaultBindingForSelectionV2(selection);
    return vault.bindings.some((candidate) => credentialVaultBindingsEqualV2(candidate, binding));
  } catch {
    return false;
  }
}

/** Projects the first actionable blocker in the Host Agent dependency order. */
export function projectAgentReadinessV1(
  input: AgentReadinessInputV1,
): AgentReadinessV1 {
  if (input.catalogStatus === "loading") {
    return { status: "catalog_loading", recoveryTarget: null };
  }
  if (input.catalogStatus === "failed") {
    return { status: "catalog_failed", recoveryTarget: "providers" };
  }
  if (input.vaultStatus === "loading") {
    return { status: "vault_loading", recoveryTarget: null };
  }
  if (input.vaultStatus === "unavailable") {
    return { status: "vault_unavailable", recoveryTarget: "credential_vault" };
  }
  if (input.vaultStatus === "locked") {
    return { status: "vault_locked", recoveryTarget: "credential_vault" };
  }
  if (!input.hasEnabledConfiguredModel) {
    return { status: "model_required", recoveryTarget: "providers" };
  }
  if (!input.hasModelWithCredentialedProvider) {
    return { status: "credential_required", recoveryTarget: "providers" };
  }
  if (!input.hasSelectedModel) {
    return { status: "model_required", recoveryTarget: "providers" };
  }
  if (input.agentStatus === "initializing") {
    return { status: "agent_initializing", recoveryTarget: null };
  }
  if (input.agentStatus === "failed") {
    return { status: "agent_failed", recoveryTarget: "providers" };
  }
  return { status: "ready", recoveryTarget: null };
}
