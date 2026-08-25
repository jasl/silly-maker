// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { createInputRouterV1, InputContextProviderV1 } from "@sillymaker/ui/input";
import type { InputActionIdV1, InputRouterV1 } from "@sillymaker/ui/input";

import { CardsRootV1 } from "../application/cards-root.tsx";
import { cardsFocusNextActionV1, cardsFocusPreviousActionV1 } from "../gui/input.ts";

afterEach(cleanup);

async function renderCardsV1(): Promise<{
  readonly router: InputRouterV1;
  readonly reportFailure: ReturnType<typeof vi.fn>;
  readonly buttons: readonly HTMLButtonElement[];
}> {
  const router = createInputRouterV1();
  const reportFailure = vi.fn();
  render(
    <InputContextProviderV1 router={router}>
      <CardsRootV1 reportFailure={reportFailure} />
    </InputContextProviderV1>,
  );
  const buttons = await screen.findAllByRole<HTMLButtonElement>("button");
  return { router, reportFailure, buttons };
}

function routeActionV1(router: InputRouterV1, actionId: InputActionIdV1): void {
  act(() => {
    router.route({ kind: "action", actionId });
  });
}

it("renders the complete three-module product denominator", async () => {
  const { buttons, reportFailure } = await renderCardsV1();

  expect(screen.getByRole("heading", { name: "Feature Cards" })).toBeVisible();
  expect(screen.getByText("SILLYMAKER SHOWCASE")).toBeVisible();
  expect(screen.getByText("3 MODULES")).toBeVisible();
  expect(buttons).toHaveLength(3);
  expect(buttons.map((button) => button.dataset.cardId)).toEqual([
    "layout",
    "motion",
    "input",
  ]);
  expect(screen.getByText("Responsive CSS canvas")).toBeVisible();
  expect(screen.getByText("Springs and one-shot drift")).toBeVisible();
  expect(screen.getByText("Pointer, touch, keys, gamepad")).toBeVisible();
  expect(screen.getByText(/ARROW KEYS move focus/)).toBeVisible();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(reportFailure).not.toHaveBeenCalled();
});

it("shares one focus owner across semantic input and native controls", async () => {
  const user = userEvent.setup();
  const { buttons, router } = await renderCardsV1();
  const [layout, motion, input] = buttons;
  if (layout === undefined || motion === undefined || input === undefined) {
    throw new TypeError("cards.test_buttons_missing");
  }

  routeActionV1(router, cardsFocusNextActionV1);
  expect(layout).toHaveFocus();
  routeActionV1(router, cardsFocusNextActionV1);
  expect(motion).toHaveFocus();

  await user.keyboard("{Enter}");
  expect(screen.getByRole("status")).toHaveTextContent("Motion");
  expect(motion).toHaveAttribute("aria-expanded", "true");

  await user.keyboard("{ArrowRight}");
  expect(input).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent("Motion");

  await user.keyboard("z");
  expect(screen.getByRole("status")).toHaveTextContent("Input");
  expect(input).toHaveAttribute("aria-expanded", "true");
  expect(motion).toHaveAttribute("aria-expanded", "false");

  await user.keyboard("z");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await user.keyboard("{ArrowRight}");
  expect(input).toHaveFocus();

  await user.click(layout);
  expect(layout).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent("Layout");
  await user.click(layout);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("enters from either edge and clamps instead of wrapping", async () => {
  const { buttons, router } = await renderCardsV1();
  const [layout, , input] = buttons;
  if (layout === undefined || input === undefined) {
    throw new TypeError("cards.test_buttons_missing");
  }

  routeActionV1(router, cardsFocusPreviousActionV1);
  expect(input).toHaveFocus();
  routeActionV1(router, cardsFocusNextActionV1);
  expect(input).toHaveFocus();

  input.blur();
  routeActionV1(router, cardsFocusNextActionV1);
  expect(layout).toHaveFocus();
  routeActionV1(router, cardsFocusPreviousActionV1);
  expect(layout).toHaveFocus();
});
