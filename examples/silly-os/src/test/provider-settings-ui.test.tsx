// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSillyOsCopyV1 } from "../content/copy.ts";
import {
  type ProviderSettingsCatalogV1,
  type ProviderSettingsProfileV1,
  type ProviderSettingsPropsV1,
  type ProviderSettingsProviderV1,
  ProviderSettingsV1,
} from "../ui/provider-settings.tsx";

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
    availability: { status: "qualified" },
    models: [
      {
        providerId: "openai",
        modelId: "gpt-4.1-nano",
        name: "GPT-4.1 nano",
        availability: { status: "qualified" },
      },
      {
        providerId: "openai",
        modelId: "gpt-future-candidate",
        name: "Future candidate",
        availability: { status: "candidate", reason: "qualification_pending" },
      },
    ],
  },
  {
    providerId: "anthropic",
    name: "Anthropic",
    availability: { status: "candidate", reason: "qualification_pending" },
    models: [
      {
        providerId: "anthropic",
        modelId: "claude-candidate",
        name: "Claude candidate",
        availability: { status: "candidate", reason: "qualification_pending" },
      },
    ],
  },
  {
    providerId: "amazon-bedrock",
    name: "Amazon Bedrock",
    availability: { status: "unavailable", reason: "credential_flow_unavailable" },
    models: [
      {
        providerId: "amazon-bedrock",
        modelId: "bedrock-model",
        name: "Bedrock model",
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

function renderSettingsV1(input?: {
  readonly catalog?: ProviderSettingsCatalogV1;
  readonly profile?: ProviderSettingsProfileV1;
  readonly onInitialize?: ProviderSettingsPropsV1["onInitialize"];
  readonly onForget?: ProviderSettingsPropsV1["onForget"];
  readonly onRetryCatalog?: ProviderSettingsPropsV1["onRetryCatalog"];
}) {
  const onInitialize = input?.onInitialize ?? vi.fn();
  const onForget = input?.onForget ?? vi.fn();
  const onRetryCatalog = input?.onRetryCatalog ?? vi.fn();
  const view = render(
    <ProviderSettingsV1
      copy={getSillyOsCopyV1("en")}
      catalog={input?.catalog ?? readyCatalogV1}
      profile={input?.profile ?? disconnectedProfileV1}
      onBack={vi.fn()}
      onLocaleChange={vi.fn()}
      onRetryCatalog={onRetryCatalog}
      onInitialize={onInitialize}
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
        profile={disconnectedProfileV1}
        onBack={vi.fn()}
        onLocaleChange={vi.fn()}
        onRetryCatalog={onRetryCatalog}
        onInitialize={vi.fn()}
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
    expect(screen.queryByRole("button", { name: "Connect Agent Creator" })).toBeNull();
  });

  it("connects only an exact qualified model and clears the uncontrolled key before callback", () => {
    let inputValueDuringCallback = "not-called";
    const onInitialize = vi.fn(() => {
      inputValueDuringCallback = (screen.getByLabelText(
        "API key (memory only)",
      ) as HTMLInputElement).value;
    });
    renderSettingsV1({ onInitialize });

    const candidate = screen.getByRole("radio", { name: /Future candidate/ });
    expect(candidate).toBeDisabled();
    fireEvent.click(candidate);
    expect(screen.queryByLabelText("API key (memory only)")).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: /GPT-4.1 nano/ }));
    const keyInput = screen.getByLabelText("API key (memory only)") as HTMLInputElement;
    expect(keyInput).not.toHaveAttribute("value");
    fireEvent.change(keyInput, { target: { value: "sk-test-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Connect Agent Creator" }));

    expect(onInitialize).toHaveBeenCalledWith(
      { providerId: "openai", modelId: "gpt-4.1-nano" },
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
        profile={disconnectedProfileV1}
        onBack={vi.fn()}
        onLocaleChange={vi.fn()}
        onRetryCatalog={vi.fn()}
        onInitialize={onInitialize}
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
        active: { providerId: "openai", modelId: "gpt-4.1-nano" },
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
        active: { providerId: "openai", modelId: "gpt-4.1-nano" },
        diagnosticCode: "adapter_unavailable",
      },
    });

    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-diagnostic-code",
      "adapter_unavailable",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agent Creator could not connect. The key was not retained.",
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
});
