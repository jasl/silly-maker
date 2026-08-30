// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FolderOpen, LoaderCircle, TriangleAlert } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { CollectionStateV1 } from "../ui/collection-state.tsx";
import { ButtonV1 } from "../ui/design-system/button.tsx";

afterEach(cleanup);

describe("CollectionStateV1", () => {
  it("leaves static empty-state announcement semantics to the caller", () => {
    render(
      <CollectionStateV1
        data-testid="empty-programs"
        icon={FolderOpen}
        title="No programs yet"
        description="Programs you create will appear here."
      />,
    );

    const state = screen.getByTestId("empty-programs");
    expect(state).toHaveAttribute("data-slot", "collection-state");
    expect(state).toHaveAttribute("data-tone", "neutral");
    expect(state).not.toHaveAttribute("role");
    expect(state).not.toHaveAttribute("aria-live");
    expect(screen.getByText("No programs yet")).toHaveAttribute(
      "data-slot",
      "collection-state-title",
    );
  });

  it("forwards caller-owned live-region semantics and spinning icon presentation", () => {
    render(
      <CollectionStateV1
        icon={LoaderCircle}
        iconMotion="spin"
        title="Loading programs"
        role="status"
        aria-live="polite"
      />,
    );

    const state = screen.getByRole("status");
    expect(state).toHaveAttribute("aria-live", "polite");
    expect(state).toHaveAttribute("data-icon-motion", "spin");
    expect(state.querySelector("[data-slot=collection-state-icon]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("keeps visual tone, alert semantics, and actions explicit and orthogonal", () => {
    render(
      <CollectionStateV1
        icon={TriangleAlert}
        title="Programs unavailable"
        description="Try again when the repository is ready."
        tone="danger"
        role="alert"
        action={<ButtonV1>Try again</ButtonV1>}
      />,
    );

    expect(screen.getByRole("alert")).toHaveAttribute("data-tone", "danger");
    expect(screen.getByRole("button", { name: "Try again" })).toHaveAttribute(
      "type",
      "button",
    );
  });
});
