// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import type { NarrativeSurfaceDialogueRendererPropsV1 } from "@sillymaker/ui";

import {
  bookshopGameApplicationV1,
  projectBookshopNarrativeSurfaceSelectionV1,
} from "../application/composition.tsx";
import { createBookshopApplicationInstanceV1 } from "../application/core-application.ts";
import { BookshopNarrativeRendererV1 } from "../application/ui.tsx";
import { bookshopTextForLocaleV1 } from "../content/presentation.ts";

afterEach(cleanup);

function advanceV1(occurrence: number) {
  return ({
    kind: "resolve" as const,
    expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
    resolution: { kind: "advance" as const },
  });
}

it("keeps a current Choice disabled until coins enable the same occurrence", async () => {
  const instance = await createBookshopApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.example.bookshop",
  });
  const dispatch = async (invocation: unknown): Promise<void> => {
    await expect(instance.semantic.dispatch(invocation as never)).resolves.toMatchObject({
      kind: "committed",
    });
  };
  try {
    const ui = bookshopGameApplicationV1.ui(
      { instance, playerProfile } as unknown as Parameters<typeof bookshopGameApplicationV1.ui>[0],
    );
    expect(Object.hasOwn(ui, "narrative")).toBe(true);
    expect(Object.hasOwn(ui.slots ?? {}, "narrative")).toBe(false);

    await dispatch({ kind: "invoke", actionId: "bookshop.begin_story" });
    for (const occurrence of [1, 2, 3, 4]) await dispatch(advanceV1(occurrence));
    await dispatch({
      kind: "resolve",
      expectedOccurrenceId: "interaction-occurrence.5",
      resolution: { kind: "choose", choiceId: "choice.bookshop.help" },
    });
    for (const occurrence of [6, 7, 8]) await dispatch(advanceV1(occurrence));

    const before = projectBookshopNarrativeSurfaceSelectionV1(instance.semantic.observe());
    const pending = before.pending;
    if (pending === null || pending.kind !== "choice") {
      throw new TypeError("expected bookshop choice");
    }
    expect(pending.occurrenceId).toBe("interaction-occurrence.9");
    expect(before.choiceAvailability).toContainEqual({
      choiceId: "choice.bookshop.buy",
      status: "disabled",
      reasonTextIds: ["text.bookshop.choice.insufficient-coins"],
    });

    const onChoose = vi.fn();
    const rendererProps = (
      choiceAvailability: NarrativeSurfaceDialogueRendererPropsV1["choiceAvailability"],
    ): NarrativeSurfaceDialogueRendererPropsV1 => ({
      kind: "dialogue" as const,
      pending,
      choiceAvailability,
      voiceReplayAvailable: false,
      playerProfile: playerProfile.current(),
      playerView: {
        kind: "passive" as const,
        phase: "active" as const,
        playbackMode: "normal" as const,
      },
      resolveText: (textId: string) => bookshopTextForLocaleV1(null, textId),
      onActivate: vi.fn(),
      onChoose,
      onResume: vi.fn(),
      onSubmitCustom: vi.fn(),
      onToggleAuto: vi.fn(),
      onToggleSkip: vi.fn(),
      onOpenHistory: vi.fn(),
      onReplayVoice: vi.fn(),
    });

    const view = render(
      <BookshopNarrativeRendererV1 {...rendererProps(before.choiceAvailability)} />,
    );
    const buy = screen.getByRole("button", { name: "花一枚硬币买下它" });
    expect(buy).toBeDisabled();
    expect(screen.getByText("硬币不足")).toBeVisible();
    await userEvent.setup().click(buy);
    expect(onChoose).not.toHaveBeenCalled();

    await dispatch({ kind: "invoke", actionId: "bookshop.earn_coin" });
    const after = projectBookshopNarrativeSurfaceSelectionV1(instance.semantic.observe());
    expect(after.pending?.occurrenceId).toBe(pending.occurrenceId);
    expect(after.choiceAvailability).toContainEqual({
      choiceId: "choice.bookshop.buy",
      status: "enabled",
      reasonTextIds: [],
    });
    view.rerender(
      <BookshopNarrativeRendererV1 {...rendererProps(after.choiceAvailability)} />,
    );
    const enabledBuy = screen.getByRole("button", { name: "花一枚硬币买下它" });
    expect(enabledBuy).toBeEnabled();
    expect(screen.queryByText("硬币不足")).toBeNull();
    await userEvent.setup().click(enabledBuy);
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith("choice.bookshop.buy");
  } finally {
    await instance.dispose();
  }
});
