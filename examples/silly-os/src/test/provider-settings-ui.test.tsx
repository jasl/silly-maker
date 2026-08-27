// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import {
  type ProviderSettingsCatalogV1,
  type ProviderSettingsCustomProfileV1,
  type ProviderSettingsProfileV1,
  type ProviderSettingsPropsV1,
  type ProviderSettingsProviderV1,
  ProviderSettingsV1,
} from "../ui/provider-settings.tsx";
import { CreatorHomeV1 } from "../ui/creator-home.tsx";

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
    availability: { status: "qualified" },
    models: [
      {
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        name: "GPT-4.1 nano",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
        availability: { status: "qualified" },
      },
      {
        providerId: "openai",
        modelId: "gpt-future-candidate",
        name: "Future candidate",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
        availability: { status: "candidate", reason: "qualification_pending" },
      },
    ],
  },
  {
    providerId: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    availability: { status: "candidate", reason: "qualification_pending" },
    models: [
      {
        providerId: "anthropic",
        modelId: "claude-candidate",
        name: "Claude candidate",
        api: "anthropic-messages",
        baseUrl: "https://api.anthropic.com",
        availability: { status: "candidate", reason: "qualification_pending" },
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

function renderSettingsV1(input?: {
  readonly catalog?: ProviderSettingsCatalogV1;
  readonly customProfiles?: readonly ProviderSettingsCustomProfileV1[];
  readonly profile?: ProviderSettingsProfileV1;
  readonly onInitialize?: ProviderSettingsPropsV1["onInitialize"];
  readonly onCreateCustomProfile?: ProviderSettingsPropsV1["onCreateCustomProfile"];
  readonly onRemoveCustomProfile?: ProviderSettingsPropsV1["onRemoveCustomProfile"];
  readonly onForget?: ProviderSettingsPropsV1["onForget"];
  readonly onRetryCatalog?: ProviderSettingsPropsV1["onRetryCatalog"];
}) {
  const onInitialize = input?.onInitialize ?? vi.fn();
  const onCreateCustomProfile = input?.onCreateCustomProfile ?? vi.fn(() => null);
  const onRemoveCustomProfile = input?.onRemoveCustomProfile ?? vi.fn();
  const onForget = input?.onForget ?? vi.fn();
  const onRetryCatalog = input?.onRetryCatalog ?? vi.fn();
  const view = render(
    <ProviderSettingsV1
      copy={getSillyOsCopyV1("en")}
      catalog={input?.catalog ?? readyCatalogV1}
      customProfiles={input?.customProfiles ?? []}
      profile={input?.profile ?? disconnectedProfileV1}
      onBack={vi.fn()}
      onLocaleChange={vi.fn()}
      onRetryCatalog={onRetryCatalog}
      onInitialize={onInitialize}
      onCreateCustomProfile={onCreateCustomProfile}
      onRemoveCustomProfile={onRemoveCustomProfile}
      onForget={onForget}
    />,
  );
  return view;
}

describe("SillyOS Provider settings", () => {
  it("focuses the return action and opens the first qualified Provider", () => {
    renderSettingsV1({
      catalog: { phase: "ready", providers: providersV1.toReversed() },
    });

    expect(screen.getByRole("button", { name: "Back to Agent Creator" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: "OpenAI" })).toBeVisible();
  });

  it("renders honest loading and failure states without inventing a catalog", () => {
    const onRetryCatalog = vi.fn();
    const view = renderSettingsV1({ catalog: { phase: "loading" }, onRetryCatalog });

    expect(screen.getByRole("status")).toHaveTextContent("Loading the Pi catalog");
    expect(screen.queryByRole("navigation", { name: "Pi Providers" })).toBeNull();

    view.rerender(
      <ProviderSettingsV1
        copy={getSillyOsCopyV1("en")}
        catalog={{ phase: "failed", diagnosticCode: "worker_unavailable" }}
        customProfiles={[]}
        profile={disconnectedProfileV1}
        onBack={vi.fn()}
        onLocaleChange={vi.fn()}
        onRetryCatalog={onRetryCatalog}
        onInitialize={vi.fn()}
        onCreateCustomProfile={vi.fn(() => null)}
        onRemoveCustomProfile={vi.fn()}
        onForget={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-diagnostic-code",
      "worker_unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryCatalog).toHaveBeenCalledOnce();
  });

  it("keeps the full Pi projection inspectable while exposing Browser truth", () => {
    renderSettingsV1();

    expect(screen.getByRole("navigation", { name: "Pi Providers" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Built-in Providers" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Custom Endpoints" })).toBeVisible();
    expect(screen.getByRole("button", { name: /OpenAI/ })).toHaveAttribute(
      "data-availability",
      "qualified",
    );
    expect(screen.getByRole("button", { name: /Anthropic/ })).toHaveAttribute(
      "data-availability",
      "candidate",
    );
    expect(screen.getByRole("button", { name: /Amazon Bedrock/ })).toHaveAttribute(
      "data-availability",
      "unavailable",
    );
    expect(screen.getByText("GPT-4.1 nano")).toBeVisible();
    expect(screen.getByText("Future candidate")).toBeVisible();
    expect(screen.getByRole("radio", { name: /Future candidate/ })).toBeDisabled();
    expect(
      screen.getByText(/exact Provider and model path has passed the SillyOS Browser contract/),
    ).toBeVisible();
    const endpoint = screen.getByLabelText("Endpoint");
    expect(endpoint).toHaveValue("https://api.openai.com/v1");
    expect(endpoint).toHaveAttribute("readonly");
    expect(endpoint).toHaveAttribute("data-endpoint-editable", "false");
    const connectionSection = screen.getByRole("heading", { name: "Connection" })
      .closest("section");
    const modelsSection = screen.getByRole("heading", { name: "Models from Pi" })
      .closest("section");
    expect(connectionSection).not.toBeNull();
    expect(modelsSection).not.toBeNull();
    expect(
      (connectionSection!.compareDocumentPosition(modelsSection!) &
        Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Anthropic/ }));
    expect(screen.getByRole("heading", { name: "Anthropic" })).toBeVisible();
    expect(screen.getByText("Claude candidate")).toBeVisible();
    expect(
      screen.getAllByText(/has not passed SillyOS Browser qualification/).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText("API key (memory only)")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Amazon Bedrock/ }));
    expect(screen.getByRole("heading", { name: "Amazon Bedrock" })).toBeVisible();
    expect(screen.getByText("Bedrock model")).toBeVisible();
    expect(screen.getAllByText(/credential flow is not available/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Test connection" })).toBeNull();
  });

  it("tests only an exact qualified model and clears the uncontrolled key before callback", () => {
    let inputValueDuringCallback = "not-called";
    const onInitialize = vi.fn(() => {
      inputValueDuringCallback = (screen.getByLabelText(
        "API key (memory only)",
      ) as HTMLInputElement).value;
    });
    renderSettingsV1({ onInitialize });

    const candidate = screen.getByRole("radio", { name: /Future candidate/ });
    expect(candidate).toBeDisabled();
    expect(screen.getByRole("radio", { name: /GPT-4.1 nano/ })).toBeChecked();
    const keyInput = screen.getByLabelText("API key (memory only)") as HTMLInputElement;
    expect(keyInput).not.toHaveAttribute("value");
    expect(keyInput).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show API key" }));
    expect(keyInput).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide API key" }));
    expect(keyInput).toHaveAttribute("type", "password");
    fireEvent.change(keyInput, { target: { value: "sk-test-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));

    expect(onInitialize).toHaveBeenCalledWith(
      { kind: "builtin", providerId: "openai", modelId: "gpt-4.1-nano" },
      "sk-test-secret",
    );
    expect(inputValueDuringCallback).toBe("");
    expect(keyInput).toHaveValue("");
    expect(keyInput).not.toHaveAttribute("value");
    expect(document.body.textContent).not.toContain("sk-test-secret");
  });

  it("rejects a stale draft instead of silently selecting a replacement model", async () => {
    const onInitialize = vi.fn();
    const view = renderSettingsV1({ onInitialize });

    fireEvent.click(screen.getByRole("radio", { name: /GPT-4.1 nano/ }));
    expect(screen.getByLabelText("API key (memory only)")).toBeVisible();

    view.rerender(
      <ProviderSettingsV1
        copy={getSillyOsCopyV1("en")}
        catalog={{
          phase: "ready",
          providers: [{ ...providersV1[0]!, models: [providersV1[0]!.models[1]!] }],
        }}
        customProfiles={[]}
        profile={disconnectedProfileV1}
        onBack={vi.fn()}
        onLocaleChange={vi.fn()}
        onRetryCatalog={vi.fn()}
        onInitialize={onInitialize}
        onCreateCustomProfile={vi.fn(() => null)}
        onRemoveCustomProfile={vi.fn()}
        onForget={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("API key (memory only)")).toBeNull();
    });
    expect(screen.getByRole("radio", { name: /Future candidate/ })).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("Choose a qualified model");
    expect(onInitialize).not.toHaveBeenCalled();
  });

  it("shows the exact connected profile and forget action", () => {
    const onForget = vi.fn();
    renderSettingsV1({
      profile: {
        phase: "ready",
        active: { kind: "builtin", providerId: "openai", modelId: "gpt-4.1-nano" },
      },
      onForget,
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Agent Creator connectedOpenAI · GPT-4.1 nano",
    );
    fireEvent.click(screen.getByRole("button", { name: "Forget key" }));
    expect(onForget).toHaveBeenCalledOnce();
  });

  it("keeps a failed exact profile visible without retaining its key", () => {
    renderSettingsV1({
      profile: {
        phase: "failed",
        active: { kind: "builtin", providerId: "openai", modelId: "gpt-4.1-nano" },
        diagnosticCode: "adapter_unavailable",
      },
    });

    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-diagnostic-code",
      "adapter_unavailable",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The connection test failed. Check the key, model, endpoint, and Browser access. " +
        "The key was not retained.",
    );
    expect(screen.getByLabelText("API key (memory only)")).toHaveValue("");
  });

  it("uses sequential mobile navigation and restores focus to the inspected Provider", () => {
    narrowViewportV1 = true;
    const view = renderSettingsV1();
    const anthropic = screen.getByRole("button", { name: /Anthropic/ });

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

  it("filters Provider and model identities without changing their Pi-owned text", () => {
    renderSettingsV1();

    fireEvent.change(screen.getByLabelText("Search Providers"), {
      target: { value: "anthropic" },
    });
    expect(screen.getByRole("button", { name: /Anthropic/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /OpenAI/ })).toBeNull();

    fireEvent.change(screen.getByLabelText("Search Providers"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /OpenAI/ }));
    fireEvent.change(screen.getByLabelText("Search models"), {
      target: { value: "gpt-future-candidate" },
    });
    expect(screen.getByText("Future candidate")).toBeVisible();
    expect(screen.queryByText("GPT-4.1 nano")).toBeNull();
  });

  it("creates a custom endpoint from the separate section", () => {
    const onCreateCustomProfile = vi.fn(() => customProfileV1);
    renderSettingsV1({ onCreateCustomProfile });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("heading", { name: "Add a custom endpoint" })).toBeVisible();
    expect(screen.getByText(/API key is never stored/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: customProfileV1.displayName },
    });
    fireEvent.change(screen.getByLabelText("Pi API family"), {
      target: { value: customProfileV1.api },
    });
    fireEvent.change(screen.getByLabelText(/^Endpoint/), {
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

  it("tests and removes a custom profile without retaining its key in the DOM", () => {
    let inputValueDuringCallback = "not-called";
    const onInitialize = vi.fn(() => {
      inputValueDuringCallback = (screen.getByLabelText(
        "API key (memory only)",
      ) as HTMLInputElement).value;
    });
    const onRemoveCustomProfile = vi.fn();
    renderSettingsV1({ customProfiles: [customProfileV1], onInitialize, onRemoveCustomProfile });

    const custom = screen.getByRole("button", { name: /My gateway/ });
    expect(custom).toHaveAttribute("data-connection-status", "untested");
    fireEvent.click(custom);
    const endpoint = screen.getByLabelText("Endpoint");
    expect(endpoint).toHaveValue(customProfileV1.baseUrl);
    expect(endpoint).toHaveAttribute("readonly");
    expect(endpoint).toHaveAttribute("data-endpoint-editable", "custom-profile");

    const keyInput = screen.getByLabelText("API key (memory only)") as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: "custom-test-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    expect(onInitialize).toHaveBeenCalledWith(
      { kind: "custom", profile: customProfileV1 },
      "custom-test-secret",
    );
    expect(inputValueDuringCallback).toBe("");
    expect(keyInput).toHaveValue("");
    expect(document.body.textContent).not.toContain("custom-test-secret");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemoveCustomProfile).toHaveBeenCalledWith(customProfileV1.profileId);
  });

  it("marks the active custom profile as verified in this browser", () => {
    renderSettingsV1({
      customProfiles: [customProfileV1],
      profile: {
        phase: "ready",
        active: { kind: "custom", profile: customProfileV1 },
      },
    });

    const custom = screen.getByRole("button", { name: /My gateway/ });
    expect(custom).toHaveAttribute("data-connection-status", "verified");
    fireEvent.click(custom);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Verified in this browserMy gateway · custom-model",
    );
  });
});

describe("SillyOS Creator Home Provider warning", () => {
  const copy = getSillyOsCopyV1("en");

  it("renders only when Provider setup is required and opens the Providers view from the card", () => {
    const onOpenSettings = vi.fn();
    const view = render(
      <CreatorHomeV1
        copy={copy}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Browser Pi Provider/ })).toBeNull();

    view.rerender(
      <CreatorHomeV1
        copy={copy}
        onCreate={vi.fn()}
        onLocaleChange={vi.fn()}
        providerSetup={{ status: "available", onOpenSettings }}
      />,
    );

    const warning = screen.getByRole("button", { name: /Browser Pi Provider/ });
    expect(warning).toHaveAttribute("data-pi-agent-runtime", "pi_provider");
    expect(warning).toHaveAttribute("data-pi-agent-status", "available");
    expect(warning).toHaveTextContent("API key required");
    fireEvent.click(screen.getByText(copy.piLiveDescription));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
