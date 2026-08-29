// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import {
  type ProviderSettingsCatalogV1,
  type ProviderSettingsCustomProfileV1,
  type ProviderSettingsProfileV1,
  type ProviderSettingsPropsV1,
  type ProviderSettingsProviderV1,
  type ProviderSettingsVaultV1,
  ProviderSettingsV1,
} from "../ui/provider-settings.tsx";
import { CreatorHomeV1 } from "../ui/creator-home.tsx";
import {
  providerApiKeyWarningRequiredV1,
  selectionsShareCredentialScopeV1,
} from "../ui/silly-os-app.tsx";

afterEach(cleanup);

let narrowViewportV1 = false;

beforeEach(() => {
  narrowViewportV1 = false;
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === "(max-width: 767px)" && narrowViewportV1,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    },
  });
});

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
        baseUrl: "https://api.openai.com/v1",
        availability: { status: "available" },
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
  {
    providerId: "amazon-bedrock",
    name: "Amazon Bedrock",
    baseUrl: null,
    availability: { status: "unavailable", reason: "credential_flow_unavailable" },
    models: [
      {
        providerId: "amazon-bedrock",
        modelId: "bedrock-model",
        name: "Bedrock model",
        api: "bedrock-converse-stream",
        baseUrl: "",
        availability: { status: "unavailable", reason: "credential_flow_unavailable" },
      },
    ],
  },
];

const readyCatalogV1: ProviderSettingsCatalogV1 = {
  phase: "ready",
  providers: providersV1,
};

const disconnectedProfileV1: ProviderSettingsProfileV1 = {
  phase: "disconnected",
  active: null,
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

const openAiNanoSelectionV1 = {
  kind: "builtin",
  providerId: "openai",
  modelId: "gpt-4.1-nano",
  api: "openai-responses",
  baseUrl: "https://api.openai.com/v1",
} as const;

const defaultEnabledModelsV1 = [{ providerId: "openai", modelId: "gpt-4.1-nano" }] as const;

const absentVaultV1: ProviderSettingsVaultV1 = { phase: "absent", bindings: [] };
const openAiBindingV1 = {
  bindingId: "builtin:openai",
  credentialKind: "api_key",
  baseUrl: "https://api.openai.com/v1",
} as const;

describe("SillyOS Provider credential scope", () => {
  const openAiNanoV1 = openAiNanoSelectionV1;
  const openAiLatestV1 = { ...openAiNanoV1, modelId: "gpt-latest" } as const;

  it("shares a built-in key only within one Provider and canonical endpoint", () => {
    expect(selectionsShareCredentialScopeV1(openAiNanoV1, openAiLatestV1)).toBe(true);
    expect(selectionsShareCredentialScopeV1(openAiNanoV1, {
      ...openAiLatestV1,
      baseUrl: "https://gateway.example.com/v1",
    })).toBe(false);
    expect(selectionsShareCredentialScopeV1(openAiNanoV1, {
      ...openAiLatestV1,
      providerId: "other-openai",
    })).toBe(false);
  });

  it("keeps custom credential scope exact", () => {
    const custom = { kind: "custom", profile: customProfileV1 } as const;
    expect(selectionsShareCredentialScopeV1(custom, custom)).toBe(true);
    expect(selectionsShareCredentialScopeV1(custom, {
      kind: "custom",
      profile: { ...customProfileV1, modelId: "other-model" },
    })).toBe(false);
  });

  it("keys the Provider warning to Worker credential presence instead of model options", () => {
    expect(providerApiKeyWarningRequiredV1("available")).toBe(true);
    expect(providerApiKeyWarningRequiredV1("failed")).toBe(true);
    for (const status of ["credential_saved", "testing", "ready", "test_failed"] as const) {
      expect(providerApiKeyWarningRequiredV1(status)).toBe(false);
    }
  });
});

function renderSettingsV1(input?: {
  readonly catalog?: ProviderSettingsCatalogV1;
  readonly customProfiles?: readonly ProviderSettingsCustomProfileV1[];
  readonly enabledBuiltinModels?: ProviderSettingsPropsV1["enabledBuiltinModels"];
  readonly preferredBuiltinModel?: ProviderSettingsPropsV1["preferredBuiltinModel"];
  readonly profile?: ProviderSettingsProfileV1;
  readonly vault?: ProviderSettingsVaultV1;
  readonly onSaveCredential?: ProviderSettingsPropsV1["onSaveCredential"];
  readonly onTestConnection?: ProviderSettingsPropsV1["onTestConnection"];
  readonly onCreateVault?: ProviderSettingsPropsV1["onCreateVault"];
  readonly onUnlockVault?: ProviderSettingsPropsV1["onUnlockVault"];
  readonly onLockVault?: ProviderSettingsPropsV1["onLockVault"];
  readonly onUseRemembered?: ProviderSettingsPropsV1["onUseRemembered"];
  readonly onForgetRemembered?: ProviderSettingsPropsV1["onForgetRemembered"];
  readonly onSetBuiltinModelEnabled?: ProviderSettingsPropsV1["onSetBuiltinModelEnabled"];
  readonly onCreateCustomProfile?: ProviderSettingsPropsV1["onCreateCustomProfile"];
  readonly onRemoveCustomProfile?: ProviderSettingsPropsV1["onRemoveCustomProfile"];
  readonly onForget?: ProviderSettingsPropsV1["onForget"];
  readonly onRetryCatalog?: ProviderSettingsPropsV1["onRetryCatalog"];
}) {
  const onSaveCredential = input?.onSaveCredential ?? vi.fn();
  const onTestConnection = input?.onTestConnection ?? vi.fn();
  const onCreateVault = input?.onCreateVault ?? vi.fn();
  const onUnlockVault = input?.onUnlockVault ?? vi.fn();
  const onLockVault = input?.onLockVault ?? vi.fn();
  const onUseRemembered = input?.onUseRemembered ?? vi.fn();
  const onForgetRemembered = input?.onForgetRemembered ?? vi.fn();
  const onSetBuiltinModelEnabled = input?.onSetBuiltinModelEnabled ?? vi.fn();
  const onCreateCustomProfile = input?.onCreateCustomProfile ?? vi.fn(() => null);
  const onRemoveCustomProfile = input?.onRemoveCustomProfile ?? vi.fn();
  const onForget = input?.onForget ?? vi.fn();
  const onRetryCatalog = input?.onRetryCatalog ?? vi.fn();

  function SettingsHarnessV1() {
    const [enabledBuiltinModels, setEnabledBuiltinModels] = useState(
      input?.enabledBuiltinModels ?? defaultEnabledModelsV1,
    );
    return (
      <ProviderSettingsV1
        copy={getSillyOsCopyV1("en")}
        catalog={input?.catalog ?? readyCatalogV1}
        customProfiles={input?.customProfiles ?? []}
        enabledBuiltinModels={enabledBuiltinModels}
        preferredBuiltinModel={input?.preferredBuiltinModel ?? null}
        profile={input?.profile ?? disconnectedProfileV1}
        vault={input?.vault ?? absentVaultV1}
        onBack={vi.fn()}
        onLocaleChange={vi.fn()}
        onRetryCatalog={onRetryCatalog}
        onSaveCredential={onSaveCredential}
        onTestConnection={onTestConnection}
        onCreateVault={onCreateVault}
        onUnlockVault={onUnlockVault}
        onLockVault={onLockVault}
        onUseRemembered={onUseRemembered}
        onForgetRemembered={onForgetRemembered}
        onSetBuiltinModelEnabled={(model, enabled) => {
          onSetBuiltinModelEnabled(model, enabled);
          setEnabledBuiltinModels((current) =>
            enabled
              ? [...current, model]
              : current.filter((candidate) =>
                candidate.providerId !== model.providerId || candidate.modelId !== model.modelId
              )
          );
        }}
        onCreateCustomProfile={onCreateCustomProfile}
        onRemoveCustomProfile={onRemoveCustomProfile}
        onForget={onForget}
      />
    );
  }

  return render(<SettingsHarnessV1 />);
}

function disconnectedSettingsPropsV1(): ProviderSettingsPropsV1 {
  return {
    copy: getSillyOsCopyV1("en"),
    catalog: readyCatalogV1,
    customProfiles: [],
    enabledBuiltinModels: defaultEnabledModelsV1,
    preferredBuiltinModel: null,
    profile: disconnectedProfileV1,
    vault: absentVaultV1,
    onBack: vi.fn(),
    onLocaleChange: vi.fn(),
    onRetryCatalog: vi.fn(),
    onSaveCredential: vi.fn(),
    onTestConnection: vi.fn(),
    onCreateVault: vi.fn(),
    onUnlockVault: vi.fn(),
    onLockVault: vi.fn(),
    onUseRemembered: vi.fn(),
    onForgetRemembered: vi.fn(),
    onSetBuiltinModelEnabled: vi.fn(),
    onCreateCustomProfile: vi.fn(() => null),
    onRemoveCustomProfile: vi.fn(),
    onForget: vi.fn(),
  };
}

describe("SillyOS Provider settings", () => {
  it("focuses the return action and opens the first available Provider", () => {
    renderSettingsV1({
      catalog: { phase: "ready", providers: providersV1.toReversed() },
    });

    expect(screen.getByRole("button", { name: "Back to Agent Creator" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Anthropic" })).toBeVisible();
  });

  it("renders loading and failure states without branding or inventing a catalog", () => {
    const onRetryCatalog = vi.fn();
    const view = renderSettingsV1({ catalog: { phase: "loading" }, onRetryCatalog });

    expect(screen.getByRole("status")).toHaveTextContent("Loading the model catalog");
    expect(screen.queryByRole("navigation", { name: "Model Providers" })).toBeNull();
    expect(view.container).not.toHaveTextContent(/\bPi\b/u);

    view.rerender(
      <ProviderSettingsV1
        {...disconnectedSettingsPropsV1()}
        catalog={{ phase: "failed", diagnosticCode: "worker_unavailable" }}
        onRetryCatalog={onRetryCatalog}
      />,
    );

    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-diagnostic-code",
      "worker_unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryCatalog).toHaveBeenCalledOnce();
  });

  it("shows only Browser route availability and keeps unavailable Providers inspectable", () => {
    const view = renderSettingsV1();

    expect(screen.getByRole("navigation", { name: "Model Providers" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Built-in Providers" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Custom Endpoints" })).toBeVisible();
    expect(screen.getByRole("button", { name: /OpenAI/u })).toHaveAttribute(
      "data-availability",
      "available",
    );
    expect(screen.getByRole("button", { name: /Anthropic/u })).toHaveAttribute(
      "data-availability",
      "available",
    );
    expect(screen.getByRole("button", { name: /Amazon Bedrock/u })).toHaveAttribute(
      "data-availability",
      "unavailable",
    );
    expect(screen.getByRole("heading", { name: "Available models" })).toBeVisible();
    expect(screen.getByText(/Choose models that may appear/u)).toBeVisible();
    expect(view.container).not.toHaveTextContent(/qualified|candidate|\bPi\b/iu);

    fireEvent.click(screen.getByRole("button", { name: /Amazon Bedrock/u }));
    expect(screen.getByRole("heading", { name: "Amazon Bedrock" })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /Bedrock model/u })).toBeDisabled();
    expect(screen.getAllByText(/credential flow is not available/u).length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: /Connection model/u })).toBeDisabled();
    expect(screen.queryByLabelText("API key")).toBeNull();
  });

  it("uses independent checkboxes for model visibility and a separate connection target", () => {
    const onSetBuiltinModelEnabled = vi.fn();
    renderSettingsV1({ onSetBuiltinModelEnabled });

    const nano = screen.getByRole("checkbox", { name: /GPT-4.1 nano/u });
    const latest = screen.getByRole("checkbox", { name: /GPT latest/u });
    const connectionModel = screen.getByRole("combobox", {
      name: /Connection model/u,
    });

    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(nano).toBeChecked();
    expect(latest).not.toBeChecked();
    expect(connectionModel).toHaveValue("gpt-4.1-nano");

    fireEvent.click(latest);
    expect(nano).toBeChecked();
    expect(latest).toBeChecked();
    expect(onSetBuiltinModelEnabled).toHaveBeenLastCalledWith(
      { providerId: "openai", modelId: "gpt-latest" },
      true,
    );

    fireEvent.change(connectionModel, { target: { value: "gpt-latest" } });
    expect(connectionModel).toHaveValue("gpt-latest");

    fireEvent.click(nano);
    expect(nano).not.toBeChecked();
    expect(latest).toBeChecked();
    expect(connectionModel).toHaveValue("gpt-latest");
    expect(onSetBuiltinModelEnabled).toHaveBeenLastCalledWith(
      { providerId: "openai", modelId: "gpt-4.1-nano" },
      false,
    );
  });

  it("initializes the connection target from the stored preferred model", () => {
    renderSettingsV1({
      enabledBuiltinModels: [
        { providerId: "openai", modelId: "gpt-4.1-nano" },
        { providerId: "openai", modelId: "gpt-latest" },
      ],
      preferredBuiltinModel: { providerId: "openai", modelId: "gpt-latest" },
    });

    expect(screen.getByRole("combobox", { name: /Connection model/u })).toHaveValue(
      "gpt-latest",
    );
  });

  it("requires one enabled model before exposing the key form", () => {
    renderSettingsV1({ enabledBuiltinModels: [] });

    const connectionModel = screen.getByRole("combobox", {
      name: /Connection model/u,
    });
    expect(connectionModel).toBeDisabled();
    expect(connectionModel).toHaveTextContent("Choose a model in Available models first");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Choose at least one available model below",
    );
    expect(screen.queryByLabelText("API key")).toBeNull();
  });

  it("saves the exact selected model without testing and clears the uncontrolled key", () => {
    let inputValueDuringCallback = "not-called";
    const onSaveCredential = vi.fn(() => {
      inputValueDuringCallback = (screen.getByLabelText(
        "API key",
      ) as HTMLInputElement).value;
    });
    const onTestConnection = vi.fn();
    renderSettingsV1({ onSaveCredential, onTestConnection });

    const keyInput = screen.getByLabelText("API key") as HTMLInputElement;
    expect(keyInput).not.toHaveAttribute("value");
    expect(keyInput).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show API key" }));
    expect(keyInput).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide API key" }));
    expect(keyInput).toHaveAttribute("type", "password");
    fireEvent.change(keyInput, { target: { value: "sk-test-secret" } });
    expect(screen.getByRole("button", { name: "Test connection" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save key" }));

    expect(onSaveCredential).toHaveBeenCalledWith(
      openAiNanoSelectionV1,
      "sk-test-secret",
      "session_only",
    );
    expect(onTestConnection).not.toHaveBeenCalled();
    expect(inputValueDuringCallback).toBe("");
    expect(keyInput).toHaveValue("");
    expect(keyInput).not.toHaveAttribute("value");
    expect(document.body.textContent).not.toContain("sk-test-secret");
  });

  it("keeps persistence session-only by default and enables opt-in only while unlocked", () => {
    const onSaveCredential = vi.fn();
    const locked = renderSettingsV1({
      vault: { phase: "locked", bindings: [openAiBindingV1] },
      onSaveCredential,
    });

    const lockedRemember = screen.getByRole("checkbox", { name: /Remember on this device/u });
    expect(lockedRemember).not.toBeChecked();
    expect(lockedRemember).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Use remembered key" })).toBeNull();
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "session-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Save key" }));
    expect(onSaveCredential).toHaveBeenLastCalledWith(
      openAiNanoSelectionV1,
      "session-key",
      "session_only",
    );

    locked.unmount();
    renderSettingsV1({
      vault: { phase: "unlocked", bindings: [openAiBindingV1] },
      onSaveCredential,
    });
    const remember = screen.getByRole("checkbox", { name: /Remember on this device/u });
    expect(remember).toBeEnabled();
    expect(remember).not.toBeChecked();
    fireEvent.click(remember);
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "remember-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Save key" }));
    expect(onSaveCredential).toHaveBeenLastCalledWith(
      openAiNanoSelectionV1,
      "remember-key",
      "remember_on_device",
    );
  });

  it("rejects mismatched Vault passphrases locally and clears matching input before create", () => {
    const onCreateVault = vi.fn();
    renderSettingsV1({ onCreateVault });

    const passphrase = screen.getByLabelText("Vault passphrase") as HTMLInputElement;
    const confirmation = screen.getByLabelText("Confirm passphrase") as HTMLInputElement;
    fireEvent.change(passphrase, { target: { value: "correct horse" } });
    fireEvent.change(confirmation, { target: { value: "wrong battery" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Vault" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Passphrases do not match");
    expect(onCreateVault).not.toHaveBeenCalled();

    fireEvent.change(confirmation, { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Vault" }));
    expect(onCreateVault).toHaveBeenCalledWith("correct horse");
    expect(passphrase).toHaveValue("");
    expect(confirmation).toHaveValue("");
    expect(document.body).not.toHaveTextContent("correct horse");
  });

  it("keeps Vault unlock, lock, and orphan-binding cleanup independently actionable", () => {
    const onUnlockVault = vi.fn();
    const onLockVault = vi.fn();
    const onForgetRemembered = vi.fn();
    const orphanBinding = {
      bindingId: "custom:removed-profile",
      credentialKind: "api_key",
      baseUrl: "https://removed.example.com/v1",
    } as const;
    const locked = renderSettingsV1({
      vault: { phase: "locked", bindings: [orphanBinding] },
      onUnlockVault,
      onForgetRemembered,
    });

    const passphrase = screen.getByLabelText("Vault passphrase") as HTMLInputElement;
    fireEvent.change(passphrase, { target: { value: "vault-passphrase" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(onUnlockVault).toHaveBeenCalledWith("vault-passphrase");
    expect(passphrase).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Forget custom:removed-profile" }));
    expect(onForgetRemembered).toHaveBeenCalledWith(orphanBinding);

    locked.unmount();
    renderSettingsV1({
      vault: { phase: "unlocked", bindings: [] },
      onLockVault,
    });
    fireEvent.click(screen.getByRole("button", { name: "Lock" }));
    expect(onLockVault).toHaveBeenCalledOnce();
  });

  it("keeps active-session and remembered-key actions independent", () => {
    const onForget = vi.fn();
    const onUseRemembered = vi.fn();
    const onForgetRemembered = vi.fn();
    renderSettingsV1({
      profile: { phase: "credential_saved", active: openAiNanoSelectionV1 },
      vault: { phase: "unlocked", bindings: [openAiBindingV1] },
      onForget,
      onUseRemembered,
      onForgetRemembered,
    });

    fireEvent.click(screen.getByRole("button", { name: "Use remembered key" }));
    expect(onUseRemembered).toHaveBeenCalledWith(openAiNanoSelectionV1);
    expect(onForget).not.toHaveBeenCalled();
    expect(onForgetRemembered).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Forget remembered key" }));
    expect(onForgetRemembered).toHaveBeenCalledWith(openAiBindingV1);
    expect(onForget).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Forget session key" }));
    expect(onForget).toHaveBeenCalledOnce();
    expect(onUseRemembered).toHaveBeenCalledOnce();
    expect(onForgetRemembered).toHaveBeenCalledOnce();
  });

  it("makes a saved key usable before any connection test and keeps testing optional", () => {
    const onForget = vi.fn();
    const onTestConnection = vi.fn();
    renderSettingsV1({
      profile: { phase: "credential_saved", active: openAiNanoSelectionV1 },
      onForget,
      onTestConnection,
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "API key saved in Agent Worker memoryOpenAI · GPT-4.1 nano",
    );
    expect(
      screen.getByText(/Save a key in the current Agent Worker session to use it immediately/u),
    )
      .toBeVisible();
    expect(
      screen.getByText(
        /Saving makes enabled models on this Provider endpoint available without a request/u,
      ),
    )
      .toBeVisible();
    expect(screen.getByText(/never controls availability/u)).toBeVisible();
    expect(screen.queryByText(/connection test required/u)).toBeNull();
    expect(screen.getByLabelText("API key")).toHaveAttribute(
      "placeholder",
      "Paste a new key to replace the saved key",
    );
    const testConnection = screen.getByRole("button", { name: "Test connection" });
    expect(testConnection).toBeEnabled();
    fireEvent.click(testConnection);
    expect(onTestConnection).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Forget session key" }));
    expect(onForget).toHaveBeenCalledOnce();
  });

  it("filters Provider and model identities without changing catalog text", () => {
    renderSettingsV1();

    fireEvent.change(screen.getByLabelText("Search Providers"), {
      target: { value: "anthropic" },
    });
    expect(screen.getByRole("button", { name: /Anthropic/u })).toBeVisible();
    expect(screen.queryByRole("button", { name: /OpenAI/u })).toBeNull();

    fireEvent.change(screen.getByLabelText("Search Providers"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /OpenAI/u }));
    fireEvent.change(screen.getByLabelText("Search models"), {
      target: { value: "gpt-latest" },
    });
    expect(screen.getByText("GPT latest")).toBeVisible();
    expect(screen.queryByText("GPT-4.1 nano")).toBeNull();
  });

  it("creates a custom endpoint from its separate section", () => {
    const onCreateCustomProfile = vi.fn(() => customProfileV1);
    renderSettingsV1({ onCreateCustomProfile });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("heading", { name: "Add a custom endpoint" })).toBeVisible();
    expect(screen.getByText(/API key stays session-only/u)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: customProfileV1.displayName },
    });
    fireEvent.change(screen.getByLabelText("API format"), {
      target: { value: customProfileV1.api },
    });
    fireEvent.change(screen.getByLabelText(/^Endpoint/u), {
      target: { value: customProfileV1.baseUrl },
    });
    fireEvent.change(screen.getByLabelText("Model ID"), {
      target: { value: customProfileV1.modelId },
    });
    fireEvent.change(screen.getByLabelText("Context window"), {
      target: { value: String(customProfileV1.contextWindow) },
    });
    fireEvent.change(screen.getByLabelText("Maximum output tokens"), {
      target: { value: String(customProfileV1.maxTokens) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save endpoint" }));

    expect(onCreateCustomProfile).toHaveBeenCalledWith({
      displayName: customProfileV1.displayName,
      api: customProfileV1.api,
      baseUrl: customProfileV1.baseUrl,
      modelId: customProfileV1.modelId,
      contextWindow: customProfileV1.contextWindow,
      maxTokens: customProfileV1.maxTokens,
    });
  });

  it("saves and removes a custom profile without retaining its key in the DOM", () => {
    let inputValueDuringCallback = "not-called";
    const onSaveCredential = vi.fn(() => {
      inputValueDuringCallback = (screen.getByLabelText(
        "API key",
      ) as HTMLInputElement).value;
    });
    const onRemoveCustomProfile = vi.fn();
    renderSettingsV1({
      customProfiles: [customProfileV1],
      onSaveCredential,
      onRemoveCustomProfile,
    });

    fireEvent.click(screen.getByRole("button", { name: /My gateway/u }));
    const endpoint = screen.getByLabelText("Endpoint");
    expect(endpoint).toHaveValue(customProfileV1.baseUrl);
    expect(endpoint).toHaveAttribute("readonly");
    expect(endpoint).toHaveAttribute("data-endpoint-editable", "custom-profile");

    const keyInput = screen.getByLabelText("API key") as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: "custom-test-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Save key" }));
    expect(onSaveCredential).toHaveBeenCalledWith(
      { kind: "custom", profile: customProfileV1 },
      "custom-test-secret",
      "session_only",
    );
    expect(inputValueDuringCallback).toBe("");
    expect(keyInput).toHaveValue("");
    expect(document.body.textContent).not.toContain("custom-test-secret");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemoveCustomProfile).toHaveBeenCalledWith(customProfileV1.profileId);
  });

  it("uses sequential mobile navigation and restores focus to the inspected Provider", () => {
    narrowViewportV1 = true;
    const view = renderSettingsV1();
    const anthropic = screen.getByRole("button", { name: /Anthropic/u });

    fireEvent.click(anthropic);
    expect(view.container.querySelector(".provider-settings")).toHaveAttribute(
      "data-mobile-view",
      "detail",
    );
    const back = screen.getByRole("button", { name: "Back to Providers" });
    expect(back).toHaveFocus();

    fireEvent.click(back);
    expect(view.container.querySelector(".provider-settings")).toHaveAttribute(
      "data-mobile-view",
      "providers",
    );
    expect(anthropic).toHaveFocus();
  });
});

describe("SillyOS Creator Home Provider warning", () => {
  const copy = getSillyOsCopyV1("en");

  it("renders either a setup warning or a non-empty saved-key picker, never both", () => {
    const onOpenSettings = vi.fn();
    const onOpenModelSettings = vi.fn();
    const onSelect = vi.fn();
    const view = render(
      <CreatorHomeV1
        copy={copy}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        onOpenSettings={onOpenSettings}
        providerModel={{
          status: "required",
          selectedValue: null,
          options: [],
          onSelect,
          onOpenSettings: onOpenModelSettings,
        }}
        providerSetup={{ status: "available", onOpenSettings }}
      />,
    );

    const warning = screen.getByRole("button", { name: /Model Provider/u });
    expect(warning).toHaveTextContent("API key required");
    expect(warning).not.toHaveTextContent(/\bPi\b/u);
    const emptyPicker = screen.getByRole("combobox", { name: "Agent Creator model" });
    expect(emptyPicker).toBeEnabled();
    fireEvent.click(emptyPicker);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(
      screen.getByText("No enabled model is available to the current key in this browser session."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Model settings" }));
    expect(onOpenModelSettings).toHaveBeenCalledOnce();
    fireEvent.click(warning);
    expect(onOpenSettings).toHaveBeenCalledOnce();

    view.rerender(
      <CreatorHomeV1
        copy={copy}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        onOpenSettings={onOpenSettings}
        providerModel={{
          status: "ready",
          selectedValue: "builtin:openai:gpt-latest",
          options: [
            {
              value: "builtin:openai:gpt-latest",
              modelName: "GPT latest",
              providerName: "OpenAI",
            },
            {
              value: "builtin:openai:gpt-mini",
              modelName: "GPT mini",
              providerName: "OpenAI",
            },
          ],
          onSelect,
          onOpenSettings: onOpenModelSettings,
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: /Model Provider/u })).toBeNull();
    const picker = screen.getByRole("combobox", { name: "Agent Creator model" });
    expect(picker).toHaveAttribute("data-selected-value", "builtin:openai:gpt-latest");
    expect(picker).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(picker);
    expect(picker).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox", { name: "Agent Creator model" })).toBeVisible();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(
      screen.queryByText(
        "No enabled model is available to the current key in this browser session.",
      ),
    ).toBeNull();
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");

    fireEvent.keyDown(picker, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("data-active", "true");
    fireEvent.keyDown(picker, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("builtin:openai:gpt-mini");
    expect(picker).toHaveAttribute("aria-expanded", "false");
    expect(picker).toHaveFocus();

    fireEvent.keyDown(picker, { key: " " });
    expect(picker).toHaveAttribute("aria-expanded", "true");
    const modelSettings = screen.getByRole("button", { name: "Model settings" });
    expect(modelSettings).not.toHaveAttribute("role", "option");
    modelSettings.focus();
    fireEvent.keyDown(modelSettings, { key: "Escape" });
    expect(picker).toHaveAttribute("aria-expanded", "false");
    expect(picker).toHaveFocus();

    fireEvent.click(picker);
    const keyboardModelSettings = screen.getByRole("button", { name: "Model settings" });
    keyboardModelSettings.focus();
    fireEvent.keyDown(keyboardModelSettings, { key: "Enter" });
    expect(onOpenModelSettings).toHaveBeenCalledTimes(2);
    expect(picker).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the warning absent and disables the picker while a model switch settles", () => {
    render(
      <CreatorHomeV1
        copy={copy}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        onOpenSettings={vi.fn()}
        providerModel={{
          status: "initializing",
          selectedValue: "builtin:openai:gpt-latest",
          options: [{
            value: "builtin:openai:gpt-latest",
            modelName: "GPT latest",
            providerName: "OpenAI",
          }],
          onSelect: vi.fn(),
          onOpenSettings: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: /Model Provider/u })).toBeNull();
    const picker = screen.getByRole("combobox", { name: "Agent Creator model" });
    expect(picker).toBeDisabled();
    expect(picker.closest("[data-model-state]"))
      .toHaveAttribute("data-model-state", "initializing");
    expect(screen.getByText("Switching model…")).toBeVisible();
  });
});
