// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import type { CredentialVaultBindingV2 } from "../credential/credential-vault-contracts.ts";
import {
  type ProviderSettingsCatalogV1,
  type ProviderSettingsCustomProfileV1,
  type ProviderSettingsPropsV1,
  type ProviderSettingsProviderV1,
  type ProviderSettingsVaultV1,
  ProviderSettingsV1,
} from "../ui/provider-settings.tsx";

afterEach(cleanup);

const copyV1 = getSillyOsCopyV1("en");

const providersV1: readonly ProviderSettingsProviderV1[] = [
  {
    providerId: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    availability: { status: "available" },
    models: [
      {
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        name: "GPT-4.1 nano",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
        availability: { status: "available" },
      },
      {
        providerId: "openai",
        modelId: "gpt-latest",
        name: "GPT latest",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v2",
        availability: { status: "available" },
      },
      {
        providerId: "openai",
        modelId: "gpt-host-only",
        name: "GPT host only",
        api: "host-private-api",
        baseUrl: "https://api.openai.com/v1",
        availability: { status: "available" },
      },
      {
        providerId: "openai",
        modelId: "gpt-retired",
        name: "GPT retired",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
        availability: { status: "unavailable", reason: "browser_runtime_unavailable" },
      },
    ],
  },
  {
    providerId: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    availability: { status: "available" },
    models: [
      {
        providerId: "anthropic",
        modelId: "claude-latest",
        name: "Claude latest",
        api: "anthropic-messages",
        baseUrl: "https://api.anthropic.com",
        availability: { status: "available" },
      },
    ],
  },
];

const readyCatalogV1: ProviderSettingsCatalogV1 = {
  phase: "ready",
  providers: providersV1,
};

const customProfileV1: ProviderSettingsCustomProfileV1 = {
  profileId: "custom.gateway",
  displayName: "My gateway",
  api: "openai-responses",
  baseUrl: "https://llm.example.com/v1",
  modelId: "custom-model",
  contextWindow: 128_000,
  maxTokens: 16_384,
};

const openAiBindingV2: CredentialVaultBindingV2 = {
  bindingId: "builtin:openai",
  credentialKind: "api_key",
  baseUrl: "https://api.openai.com/v1",
};

const openAiAlternateBindingV2: CredentialVaultBindingV2 = {
  ...openAiBindingV2,
  baseUrl: "https://api.openai.com/v2",
};

function automaticVaultV1(
  bindings: readonly CredentialVaultBindingV2[] = [],
): ProviderSettingsVaultV1 {
  return {
    phase: "unlocked",
    protection: "device",
    state: "unlocked",
    bindings,
  };
}

function passwordVaultV1(
  state: "locked" | "unlocked",
  bindings: readonly CredentialVaultBindingV2[] = [],
): ProviderSettingsVaultV1 {
  return {
    phase: state,
    protection: "password",
    state,
    bindings,
  };
}

function settingsPropsV1(
  overrides: Partial<ProviderSettingsPropsV1> = {},
): ProviderSettingsPropsV1 {
  return {
    copy: copyV1,
    catalog: readyCatalogV1,
    customProfiles: [],
    enabledBuiltinModels: [],
    preferredBuiltinModel: null,
    connectionTest: { phase: "disconnected", active: null },
    credentialOperation: { phase: "idle", target: null },
    credentialReceipt: null,
    vault: automaticVaultV1(),
    onBack: vi.fn(),
    onLocaleChange: vi.fn(),
    onRetryCatalog: vi.fn(),
    onSaveCredential: vi.fn(),
    onTestConnection: vi.fn(),
    onSetVaultPassword: vi.fn(),
    onUseAutomaticVault: vi.fn(),
    onUnlockVault: vi.fn(),
    onLockVault: vi.fn(),
    onForgetCredential: vi.fn(),
    onSetBuiltinModelEnabled: vi.fn(),
    onCreateCustomProfile: vi.fn(() => null),
    onRemoveCustomProfile: vi.fn(),
    ...overrides,
  };
}

function renderSettingsV1(overrides: Partial<ProviderSettingsPropsV1> = {}) {
  const props = settingsPropsV1(overrides);
  return { props, ...render(<ProviderSettingsV1 {...props} />) };
}

function connectionSectionV1(): HTMLElement {
  const heading = screen.getByRole("heading", { name: copyV1.providerConnectionTitle });
  const section = heading.closest("section");
  if (section === null) throw new Error("provider connection section missing");
  return section;
}

describe("SillyOS Settings information architecture", () => {
  it("exposes General, Providers, and Credential Vault with General as the default", () => {
    const onLocaleChange = vi.fn();
    const { container } = renderSettingsV1({ onLocaleChange });

    const navigation = screen.getByRole("complementary", { name: copyV1.settings });
    const general = within(navigation).getByRole("button", {
      name: copyV1.settingsCategoryGeneral,
    });
    const providers = within(navigation).getByRole("button", {
      name: copyV1.settingsCategoryProviders,
    });
    const vault = within(navigation).getByRole("button", {
      name: copyV1.settingsCategoryCredentialVault,
    });

    expect(general).toHaveAttribute("aria-current", "page");
    expect(providers).not.toHaveAttribute("aria-current");
    expect(vault).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("heading", {
      level: 1,
      name: copyV1.settingsCategoryGeneral,
    })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: copyV1.providersLabel })).toBeNull();

    const topbar = container.querySelector(".silly-os-settings__topbar");
    expect(topbar).not.toBeNull();
    const localeSelect = within(topbar as HTMLElement).getByRole("combobox", {
      name: copyV1.settingsLanguage,
    });
    expect(localeSelect).toHaveValue("en");
    expect(within(localeSelect).getAllByRole("option").map((option) => option.textContent)).toEqual(
      [
        "English",
        "简体中文",
      ],
    );
    fireEvent.change(localeSelect, { target: { value: "zh-CN" } });
    expect(onLocaleChange).toHaveBeenCalledWith("zh-CN");
  });

  it("uses initialSection=providers as a direct Provider-settings entry", () => {
    renderSettingsV1({ initialSection: "providers" });

    const navigation = screen.getByRole("complementary", { name: copyV1.settings });
    expect(
      within(navigation).getByRole("button", {
        name: copyV1.settingsCategoryProviders,
      }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: copyV1.providersLabel })).toBeVisible();
    expect(screen.getByRole("heading", {
      level: 1,
      name: copyV1.providerSettingsTitle,
    })).toBeVisible();
  });
});

describe("SillyOS Credential Vault settings", () => {
  it("keeps Automatic, Password, Lock, Unlock, and exact-binding Forget independent", () => {
    const onSetVaultPassword = vi.fn();
    const onUseAutomaticVault = vi.fn();
    const onUnlockVault = vi.fn();
    const onLockVault = vi.fn();
    const onForgetCredential = vi.fn();
    const callbacks = {
      onSetVaultPassword,
      onUseAutomaticVault,
      onUnlockVault,
      onLockVault,
      onForgetCredential,
    };
    const view = renderSettingsV1({
      ...callbacks,
      initialSection: "credential_vault",
      vault: automaticVaultV1([openAiBindingV2]),
    });

    expect(screen.getByText(copyV1.credentialVaultAutomaticMode)).toHaveAttribute(
      "data-vault-mode",
      "device",
    );
    expect(screen.getByText(copyV1.credentialVaultAutomaticSecurityNotice)).toBeVisible();

    const password = screen.getByLabelText(copyV1.credentialVaultPassphrase);
    const confirmation = screen.getByLabelText(copyV1.credentialVaultConfirmPassphrase);
    fireEvent.change(password, { target: { value: "vault-password" } });
    fireEvent.change(confirmation, { target: { value: "vault-password" } });
    fireEvent.click(screen.getByRole("button", {
      name: copyV1.credentialVaultSwitchToPassword,
    }));
    expect(onSetVaultPassword).toHaveBeenCalledWith("vault-password");
    expect(password).toHaveValue("");
    expect(confirmation).toHaveValue("");
    expect(onUseAutomaticVault).not.toHaveBeenCalled();
    expect(onLockVault).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: `Forget ${openAiBindingV2.bindingId}` }));
    expect(onForgetCredential).toHaveBeenCalledWith([openAiBindingV2]);
    expect(onSetVaultPassword).toHaveBeenCalledOnce();

    view.rerender(
      <ProviderSettingsV1
        {...settingsPropsV1({
          ...callbacks,
          initialSection: "credential_vault",
          vault: passwordVaultV1("unlocked", [openAiBindingV2]),
        })}
      />,
    );
    expect(screen.getByText(copyV1.credentialVaultPasswordMode)).toHaveAttribute(
      "data-vault-mode",
      "password",
    );
    expect(screen.getByText(copyV1.credentialVaultPasswordSecurityNotice)).toBeVisible();
    const replacementPassword = screen.getByLabelText(copyV1.credentialVaultPassphrase);
    const replacementConfirmation = screen.getByLabelText(
      copyV1.credentialVaultConfirmPassphrase,
    );
    fireEvent.change(replacementPassword, { target: { value: "replacement-password" } });
    fireEvent.change(replacementConfirmation, { target: { value: "replacement-password" } });
    fireEvent.click(screen.getByRole("button", { name: copyV1.credentialVaultChangePassword }));
    expect(onSetVaultPassword).toHaveBeenLastCalledWith("replacement-password");
    expect(screen.queryByRole("button", {
      name: copyV1.credentialVaultSwitchToPassword,
    })).toBeNull();
    fireEvent.click(screen.getByRole("button", {
      name: copyV1.credentialVaultSwitchToAutomatic,
    }));
    expect(onUseAutomaticVault).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: copyV1.credentialVaultLock }));
    expect(onLockVault).toHaveBeenCalledOnce();

    view.rerender(
      <ProviderSettingsV1
        {...settingsPropsV1({
          ...callbacks,
          initialSection: "credential_vault",
          vault: passwordVaultV1("locked", [openAiBindingV2]),
        })}
      />,
    );
    const unlockPassword = screen.getByLabelText(copyV1.credentialVaultPassphrase);
    fireEvent.change(unlockPassword, { target: { value: "unlock-password" } });
    fireEvent.click(screen.getByRole("button", { name: copyV1.credentialVaultUnlock }));
    expect(onUnlockVault).toHaveBeenCalledWith("unlock-password");
    expect(unlockPassword).toHaveValue("");
    expect(screen.getByRole("button", {
      name: `Forget ${openAiBindingV2.bindingId}`,
    })).toBeDisabled();
    expect(onForgetCredential).toHaveBeenCalledOnce();
  });
});

describe("SillyOS Provider connection and model independence", () => {
  it("saves a model-free built-in connection with zero enabled models and no legacy persistence control", () => {
    let inputValueDuringCallback = "not-called";
    const onSaveCredential = vi.fn(() => {
      inputValueDuringCallback = (screen.getByLabelText(
        copyV1.providerKeyLabel,
      ) as HTMLInputElement).value;
    });
    const onTestConnection = vi.fn();
    const onSetBuiltinModelEnabled = vi.fn();
    renderSettingsV1({
      initialSection: "providers",
      enabledBuiltinModels: [],
      onSaveCredential,
      onTestConnection,
      onSetBuiltinModelEnabled,
    });

    expect(screen.getByRole("checkbox", { name: /GPT-4.1 nano/u })).not.toBeChecked();
    expect(screen.queryByRole("checkbox", { name: /Remember on this device/iu })).toBeNull();
    expect(document.body).not.toHaveTextContent(/session-only|Use remembered/iu);
    expect(screen.getByRole("button", { name: copyV1.providerSaveCredential })).toBeVisible();
    expect(screen.queryByRole("button", {
      name: copyV1.providerUpdateCredential,
    })).toBeNull();
    expect(screen.queryByRole("button", {
      name: copyV1.providerDeleteCredential,
    })).toBeNull();

    const keyInput = screen.getByLabelText(copyV1.providerKeyLabel) as HTMLInputElement;
    const secret = "sk-test-secret";
    fireEvent.change(keyInput, { target: { value: secret } });
    fireEvent.click(screen.getByRole("button", { name: copyV1.providerSaveCredential }));

    expect(onSaveCredential).toHaveBeenCalledWith(
      [
        {
          kind: "builtin",
          providerId: "openai",
          baseUrl: "https://api.openai.com/v1",
        },
        {
          kind: "builtin",
          providerId: "openai",
          baseUrl: "https://api.openai.com/v2",
        },
      ],
      secret,
    );
    expect(onTestConnection).not.toHaveBeenCalled();
    expect(onSetBuiltinModelEnabled).not.toHaveBeenCalled();
    expect(inputValueDuringCallback).toBe("");
    expect(keyInput).toHaveValue("");
    expect(keyInput).not.toHaveAttribute("value");
    expect(document.body.textContent).not.toContain(secret);
    expect(document.documentElement.outerHTML).not.toContain(secret);
    expect(screen.getByLabelText(`${copyV1.providerEndpointLabel} 1`)).toHaveValue(
      "https://api.openai.com/v1",
    );
    expect(screen.getByLabelText(`${copyV1.providerEndpointLabel} 2`)).toHaveValue(
      "https://api.openai.com/v2",
    );
  });

  it("tests any technically callable model independently of checkboxes and sends its exact selection", () => {
    const onSaveCredential = vi.fn();
    const onTestConnection = vi.fn();
    const onSetBuiltinModelEnabled = vi.fn();
    renderSettingsV1({
      initialSection: "providers",
      vault: automaticVaultV1([openAiBindingV2, openAiAlternateBindingV2]),
      enabledBuiltinModels: [],
      preferredBuiltinModel: null,
      onSaveCredential,
      onTestConnection,
      onSetBuiltinModelEnabled,
    });

    const connection = connectionSectionV1();
    const testModel = within(connection).getByRole("combobox");
    const options = within(testModel).getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options.map((option) => option.getAttribute("value"))).toEqual([
      "gpt-4.1-nano",
      "gpt-latest",
    ]);
    expect(testModel).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: /GPT-4.1 nano/u })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /GPT latest/u })).not.toBeChecked();

    fireEvent.change(testModel, { target: { value: "gpt-latest" } });
    fireEvent.click(
      within(connection).getByRole("button", {
        name: copyV1.providerTestConnection,
      }),
    );

    expect(onTestConnection).toHaveBeenCalledWith({
      kind: "builtin",
      providerId: "openai",
      modelId: "gpt-latest",
      api: "openai-responses",
      baseUrl: "https://api.openai.com/v2",
    });
    expect(onSaveCredential).not.toHaveBeenCalled();
    expect(onSetBuiltinModelEnabled).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: /GPT latest/u }));
    expect(onSetBuiltinModelEnabled).toHaveBeenCalledWith(
      { providerId: "openai", modelId: "gpt-latest" },
      true,
    );
    expect(onSaveCredential).not.toHaveBeenCalled();
    expect(onTestConnection).toHaveBeenCalledOnce();
  });

  it("shows a one-line save receipt only for an explicit successful save event", () => {
    const view = renderSettingsV1({
      initialSection: "providers",
      vault: automaticVaultV1([openAiBindingV2]),
    });

    expect(screen.queryByText(copyV1.providerCredentialSaved)).toBeNull();

    view.rerender(
      <ProviderSettingsV1
        {...settingsPropsV1({
          initialSection: "providers",
          vault: automaticVaultV1([openAiBindingV2]),
          credentialReceipt: {
            kind: "saved",
            target: {
              kind: "builtin",
              providerId: "openai",
              baseUrl: openAiBindingV2.baseUrl,
            },
          },
        })}
      />,
    );

    const receipt = screen.getByText(copyV1.providerCredentialSaved).closest("[role=status]");
    expect(receipt).not.toBeNull();
    expect(receipt).toHaveAttribute("data-credential-receipt", "saved");
    expect(receipt?.querySelector("small")).toBeNull();
    expect(receipt).not.toHaveTextContent("OpenAI");
    expect(receipt).not.toHaveTextContent("gpt-4.1-nano");

    view.rerender(
      <ProviderSettingsV1
        {...settingsPropsV1({
          initialSection: "providers",
          vault: automaticVaultV1([openAiBindingV2]),
        })}
      />,
    );
    expect(screen.queryByText(copyV1.providerCredentialSaved)).toBeNull();
  });

  it("keys Saved, Update, and Test to the exact endpoint of the selected test model", () => {
    const view = renderSettingsV1({
      initialSection: "providers",
      vault: automaticVaultV1([openAiBindingV2]),
    });
    let connection = connectionSectionV1();
    const testModel = within(connection).getByRole("combobox");
    const updateCredential = within(connection).getByRole("button", {
      name: copyV1.providerUpdateCredential,
    });
    const deleteCredential = within(connection).getByRole("button", {
      name: copyV1.providerDeleteCredential,
    });
    expect(updateCredential).toBeVisible();
    expect(deleteCredential).toBeVisible();
    expect(updateCredential.parentElement).toBe(deleteCredential.parentElement);
    expect(
      within(connection).getByRole("button", {
        name: copyV1.providerTestConnection,
      }),
    ).toBeEnabled();

    fireEvent.change(testModel, { target: { value: "gpt-latest" } });
    expect(
      within(connection).getByRole("button", {
        name: copyV1.providerSaveCredential,
      }),
    ).toBeVisible();
    expect(
      within(connection).getByRole("button", {
        name: copyV1.providerTestConnection,
      }),
    ).toBeDisabled();
    expect(
      within(connection).getByRole("button", { name: copyV1.providerDeleteCredential }),
    ).toBeVisible();

    view.rerender(
      <ProviderSettingsV1
        {...settingsPropsV1({
          initialSection: "providers",
          vault: automaticVaultV1([openAiBindingV2, openAiAlternateBindingV2]),
        })}
      />,
    );
    connection = connectionSectionV1();
    expect(
      within(connection).getByRole("button", {
        name: copyV1.providerUpdateCredential,
      }),
    ).toBeVisible();
    expect(
      within(connection).getByRole("button", {
        name: copyV1.providerDeleteCredential,
      }),
    ).toBeVisible();
    expect(
      within(connection).getByRole("button", {
        name: copyV1.providerTestConnection,
      }),
    ).toBeEnabled();
  });

  it("keeps Save, Delete, and Test separate and deletes every stored Provider endpoint scope", () => {
    const onSaveCredential = vi.fn();
    const onTestConnection = vi.fn();
    const onForgetCredential = vi.fn();
    renderSettingsV1({
      initialSection: "providers",
      vault: automaticVaultV1([openAiBindingV2, openAiAlternateBindingV2]),
      onSaveCredential,
      onTestConnection,
      onForgetCredential,
    });

    const connection = connectionSectionV1();
    const credentialControls = connection.querySelector(
      ".provider-settings__credential-controls",
    );
    const connectionActions = connection.querySelector(
      ".provider-settings__connection-actions",
    );
    expect(credentialControls).not.toBeNull();
    expect(connectionActions).not.toBeNull();
    expect(
      within(credentialControls as HTMLElement).getByRole("button", {
        name: copyV1.providerUpdateCredential,
      }),
    ).toBeVisible();
    expect(
      within(credentialControls as HTMLElement).getByRole("button", {
        name: copyV1.providerDeleteCredential,
      }),
    ).toBeVisible();
    expect(
      within(connectionActions as HTMLElement).queryByRole("button", {
        name: copyV1.providerDeleteCredential,
      }),
    ).toBeNull();
    fireEvent.click(
      within(connection).getByRole("button", {
        name: copyV1.providerTestConnection,
      }),
    );
    expect(onTestConnection).toHaveBeenCalledOnce();
    expect(onSaveCredential).not.toHaveBeenCalled();
    expect(onForgetCredential).not.toHaveBeenCalled();

    fireEvent.click(
      within(connection).getByRole("button", { name: copyV1.providerDeleteCredential }),
    );
    expect(onForgetCredential).toHaveBeenCalledWith([
      openAiBindingV2,
      openAiAlternateBindingV2,
    ]);
    expect(onSaveCredential).not.toHaveBeenCalled();
    expect(onTestConnection).toHaveBeenCalledOnce();
  });

  it("saves a custom endpoint credential against its model-free connection identity", () => {
    const onSaveCredential = vi.fn();
    renderSettingsV1({
      initialSection: "providers",
      customProfiles: [customProfileV1],
      onSaveCredential,
    });
    fireEvent.click(screen.getByRole("button", { name: /My gateway/u }));

    const keyInput = screen.getByLabelText(copyV1.providerKeyLabel);
    fireEvent.change(keyInput, { target: { value: "custom-secret" } });
    fireEvent.click(screen.getByRole("button", { name: copyV1.providerSaveCredential }));

    expect(onSaveCredential).toHaveBeenCalledWith(
      [{
        kind: "custom",
        profileId: customProfileV1.profileId,
        baseUrl: customProfileV1.baseUrl,
      }],
      "custom-secret",
    );
    expect(keyInput).toHaveValue("");
    expect(document.body.textContent).not.toContain("custom-secret");
  });
});

describe("SillyOS Provider availability labels", () => {
  it("labels a built-in only for its exact credential binding and always labels a complete custom profile", () => {
    const wrongEndpointBinding: CredentialVaultBindingV2 = {
      ...openAiBindingV2,
      baseUrl: "https://gateway.example.com/v1",
    };
    const view = renderSettingsV1({
      initialSection: "providers",
      customProfiles: [customProfileV1],
      vault: automaticVaultV1([wrongEndpointBinding]),
    });

    const openAiWithoutExactBinding = screen.getByRole("button", { name: /OpenAI/u });
    expect(openAiWithoutExactBinding).toHaveAttribute("data-credential-status", "unset");
    expect(within(openAiWithoutExactBinding).queryByText(copyV1.providerStatusAvailable))
      .toBeNull();
    const custom = screen.getByRole("button", { name: /My gateway/u });
    expect(custom).toHaveAttribute("data-connection-status", "available");
    expect(within(custom).getByText(copyV1.providerStatusAvailable)).toBeVisible();

    view.rerender(
      <ProviderSettingsV1
        {...settingsPropsV1({
          initialSection: "providers",
          customProfiles: [customProfileV1],
          vault: automaticVaultV1([openAiAlternateBindingV2]),
        })}
      />,
    );
    const openAiWithExactBinding = screen.getByRole("button", { name: /OpenAI/u });
    expect(openAiWithExactBinding).toHaveAttribute("data-credential-status", "available");
    expect(within(openAiWithExactBinding).getByText(copyV1.providerStatusAvailable)).toBeVisible();

    const anthropic = screen.getByRole("button", { name: /Anthropic/u });
    expect(anthropic).toHaveAttribute("data-credential-status", "unset");
    expect(within(anthropic).queryByText(copyV1.providerStatusAvailable)).toBeNull();
  });
});
