// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { credentialVaultBindingForSelectionV2 } from "../../../src/credential/provider-credential-binding.ts";
import {
  credentialVaultCanHandoffProviderCredentialV1 as creatorVaultCanHandoffProviderCredentialV1,
  credentialVaultHasProviderCredentialV1 as creatorVaultHasProviderCredentialV1,
  type AgentReadinessInputV1 as CreatorReadinessInputV1,
  projectAgentReadinessV1 as projectCreatorReadinessV1,
  projectCredentialVaultStatusV1 as projectCreatorVaultStatusV1,
} from "../../../src/ui/agent-readiness.ts";

const readyInputV1: CreatorReadinessInputV1 = Object.freeze({
  catalogStatus: "ready",
  vaultStatus: "unlocked",
  hasEnabledConfiguredModel: true,
  hasModelWithCredentialedProvider: true,
  agentStatus: "ready",
});

describe("Creator readiness projection", () => {
  it.each(
    [
      [
        { ...readyInputV1, catalogStatus: "loading" as const },
        { status: "catalog_loading", recoveryTarget: null },
      ],
      [
        { ...readyInputV1, catalogStatus: "failed" as const },
        { status: "catalog_failed", recoveryTarget: "providers" },
      ],
      [
        { ...readyInputV1, vaultStatus: "loading" as const },
        { status: "vault_loading", recoveryTarget: null },
      ],
      [
        { ...readyInputV1, vaultStatus: "unavailable" as const },
        { status: "vault_unavailable", recoveryTarget: "credential_vault" },
      ],
      [
        { ...readyInputV1, vaultStatus: "locked" as const },
        { status: "vault_locked", recoveryTarget: "credential_vault" },
      ],
      [
        { ...readyInputV1, hasEnabledConfiguredModel: false },
        { status: "model_required", recoveryTarget: "providers" },
      ],
      [
        { ...readyInputV1, hasModelWithCredentialedProvider: false },
        { status: "credential_required", recoveryTarget: "providers" },
      ],
      [
        { ...readyInputV1, agentStatus: "initializing" as const },
        { status: "agent_initializing", recoveryTarget: null },
      ],
      [
        { ...readyInputV1, agentStatus: "failed" as const },
        { status: "agent_failed", recoveryTarget: "providers" },
      ],
      [readyInputV1, { status: "ready", recoveryTarget: null }],
    ] as const,
  )("projects %# as %o", (input, expected) => {
    expect(projectCreatorReadinessV1(input)).toEqual(expected);
  });

  it("reports only the earliest unmet product dependency", () => {
    const downstreamBlockedV1 = Object.freeze({
      hasEnabledConfiguredModel: false,
      hasModelWithCredentialedProvider: false,
      agentStatus: "failed" as const,
    });

    expect(projectCreatorReadinessV1({
      ...downstreamBlockedV1,
      catalogStatus: "failed",
      vaultStatus: "unavailable",
    })).toEqual({ status: "catalog_failed", recoveryTarget: "providers" });
    expect(projectCreatorReadinessV1({
      ...downstreamBlockedV1,
      catalogStatus: "ready",
      vaultStatus: "loading",
    })).toEqual({ status: "vault_loading", recoveryTarget: null });
    expect(projectCreatorReadinessV1({
      ...downstreamBlockedV1,
      catalogStatus: "ready",
      vaultStatus: "unavailable",
    })).toEqual({ status: "vault_unavailable", recoveryTarget: "credential_vault" });
    expect(projectCreatorReadinessV1({
      ...downstreamBlockedV1,
      catalogStatus: "ready",
      vaultStatus: "locked",
    })).toEqual({ status: "vault_locked", recoveryTarget: "credential_vault" });
    expect(projectCreatorReadinessV1({
      ...downstreamBlockedV1,
      catalogStatus: "ready",
      vaultStatus: "unlocked",
    })).toEqual({ status: "model_required", recoveryTarget: "providers" });
    expect(projectCreatorReadinessV1({
      ...downstreamBlockedV1,
      catalogStatus: "ready",
      vaultStatus: "unlocked",
      hasEnabledConfiguredModel: true,
    })).toEqual({ status: "credential_required", recoveryTarget: "providers" });
    expect(projectCreatorReadinessV1({
      ...readyInputV1,
      agentStatus: "failed",
    })).toEqual({ status: "agent_failed", recoveryTarget: "providers" });
  });

  it.each(
    [
      [
        {
          phase: "busy",
          operation: "set_password",
          protection: "password",
          state: "unlocked",
          bindings: [],
        },
        "unlocked",
      ],
      [
        {
          phase: "busy",
          operation: "lock",
          protection: "password",
          state: "unlocked",
          bindings: [],
        },
        "unlocked",
      ],
      [
        { phase: "busy", operation: "initialize", protection: null, state: null, bindings: [] },
        "loading",
      ],
      [
        {
          phase: "failed",
          operation: "use_device",
          diagnosticCode: "operation_failed",
          protection: "password",
          state: "unlocked",
          bindings: [],
        },
        "unlocked",
      ],
      [
        {
          phase: "failed",
          operation: "unlock",
          diagnosticCode: "invalid_password",
          protection: "password",
          state: "locked",
          bindings: [],
        },
        "locked",
      ],
      [
        {
          phase: "failed",
          operation: "initialize",
          diagnosticCode: "operation_failed",
          protection: null,
          state: null,
          bindings: [],
        },
        "unavailable",
      ],
      [
        {
          phase: "unavailable",
          diagnosticCode: "initializing",
          protection: null,
          state: null,
          bindings: [],
        },
        "loading",
      ],
    ] as const,
  )("projects Vault snapshot %# as %s", (vault, expected) => {
    expect(projectCreatorVaultStatusV1(vault)).toBe(expected);
  });

  it("keeps a failed but physically unlocked Provider credential usable", () => {
    const selection = Object.freeze(
      {
        kind: "builtin",
        providerId: "anthropic",
        modelId: "claude-opus-5",
        api: "anthropic-messages",
        baseUrl: "https://api.anthropic.com",
      } as const,
    );
    const failedUnlockedVault = Object.freeze(
      {
        phase: "failed",
        operation: "use_device",
        diagnosticCode: "operation_failed",
        protection: "password",
        state: "unlocked",
        bindings: Object.freeze([credentialVaultBindingForSelectionV2(selection)]),
      } as const,
    );

    expect(creatorVaultHasProviderCredentialV1(failedUnlockedVault, selection)).toBe(true);
    expect(creatorVaultCanHandoffProviderCredentialV1(failedUnlockedVault)).toBe(true);
    expect(projectCreatorReadinessV1({
      ...readyInputV1,
      vaultStatus: projectCreatorVaultStatusV1(failedUnlockedVault),
      hasModelWithCredentialedProvider: creatorVaultHasProviderCredentialV1(
        failedUnlockedVault,
        selection,
      ),
    })).toEqual({ status: "ready", recoveryTarget: null });
  });

  it("keeps existing Agent readiness while a busy Vault blocks new handoff", () => {
    const selection = Object.freeze(
      {
        kind: "builtin",
        providerId: "anthropic",
        modelId: "claude-opus-5",
        api: "anthropic-messages",
        baseUrl: "https://api.anthropic.com",
      } as const,
    );
    const busyUnlockedVault = Object.freeze(
      {
        phase: "busy",
        operation: "set_password",
        protection: "device",
        state: "unlocked",
        bindings: Object.freeze([credentialVaultBindingForSelectionV2(selection)]),
      } as const,
    );

    expect(creatorVaultHasProviderCredentialV1(busyUnlockedVault, selection)).toBe(true);
    expect(creatorVaultCanHandoffProviderCredentialV1(busyUnlockedVault)).toBe(false);
    expect(projectCreatorReadinessV1({
      ...readyInputV1,
      vaultStatus: projectCreatorVaultStatusV1(busyUnlockedVault),
      hasModelWithCredentialedProvider: creatorVaultHasProviderCredentialV1(
        busyUnlockedVault,
        selection,
      ),
    })).toEqual({ status: "ready", recoveryTarget: null });
  });
});
