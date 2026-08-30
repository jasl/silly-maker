// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderCatalogRowV1 } from "../ui/provider-catalog-row.tsx";

afterEach(cleanup);

describe("ProviderCatalogRowV1", () => {
  it("owns button and active-navigation semantics while forwarding admitted facts", () => {
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(
      <ProviderCatalogRowV1
        ref={ref}
        kind="builtin"
        label="Anthropic"
        detail="anthropic"
        status={<span>Available</span>}
        facts="10 models"
        active
        data-provider-id="anthropic"
        data-credential-status="available"
        onClick={onClick}
      />,
    );

    const row = screen.getByRole("button", {
      name: /Anthropic.*anthropic.*Available.*10 models/u,
    });
    expect(row).toHaveAttribute("type", "button");
    expect(row).toHaveAttribute("aria-current", "page");
    expect(row).toHaveAttribute("data-provider-id", "anthropic");
    expect(row).toHaveAttribute("data-credential-status", "available");
    expect(ref.current).toBe(row);

    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("omits active navigation semantics for an inactive custom profile", () => {
    render(
      <ProviderCatalogRowV1
        kind="custom"
        label="Local model"
        detail="model-v1"
        facts="openai-completions"
        active={false}
        data-custom-profile-id="local-model"
        data-connection-status="available"
      />,
    );

    const row = screen.getByRole("button", {
      name: /Local model.*model-v1.*openai-completions/u,
    });
    expect(row).not.toHaveAttribute("aria-current");
    expect(row).toHaveAttribute("data-custom-profile-id", "local-model");
    expect(row).toHaveAttribute("data-connection-status", "available");
  });
});
