// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import type { NarrativeSurfaceDialogueRendererPropsV1 } from "@sillymaker/ui";

import {
  catcafeGameApplicationV1,
  projectCatcafeNarrativeSurfaceSelectionV1,
} from "../application/composition.tsx";
import { createCatcafeApplicationInstanceV1 } from "../application/core-application.ts";
import { CatcafeNarrativeRendererV1 } from "../application/ui.tsx";
import { catcafeTextForLocaleV1 } from "../content/presentation.ts";

afterEach(cleanup);

it("keeps the active Say frame and skin stable while locale-live labels change", async () => {
  const instance = await createCatcafeApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.example.cat-cafe",
  });
  let disposeUi: (() => void) | undefined;
  try {
    const ui = catcafeGameApplicationV1.ui(
      { instance, playerProfile } as unknown as Parameters<typeof catcafeGameApplicationV1.ui>[0],
    );
    disposeUi = ui.dispose;
    expect(Object.hasOwn(ui, "narrative")).toBe(true);
    expect(Object.hasOwn(ui.slots ?? {}, "narrative")).toBe(false);

    await expect(
      instance.semantic.dispatch({ kind: "invoke", actionId: "cc.begin_story" } as never),
    ).resolves.toMatchObject({ kind: "committed" });
    for (const occurrence of [1, 2, 3]) {
      await expect(
        instance.semantic.dispatch({
          kind: "resolve",
          expectedOccurrenceId: `interaction-occurrence.${String(occurrence)}`,
          resolution: { kind: "advance" },
        } as never),
      ).resolves.toMatchObject({ kind: "committed" });
    }
    const selection = projectCatcafeNarrativeSurfaceSelectionV1(instance.semantic.observe());
    expect(
      selection.choiceAvailability?.every((row) =>
        row.status === "enabled" && row.reasonTextIds.length === 0
      ),
    ).toBe(true);

    const pending = {
      kind: "say" as const,
      definitionId: "interaction.catcafe.locale-test",
      seenRevision: 1,
      occurrenceId: "interaction-occurrence.400",
      speakerTextId: "text.cc.speaker.cat",
      textId: "text.cc.line.greeting",
      advancePolicy: "confirm" as const,
    };
    const base = {
      kind: "dialogue" as const,
      pending,
      choiceAvailability: null,
      playerView: {
        kind: "say" as const,
        phase: "active" as const,
        playbackMode: "normal" as const,
        resolvedSpeakerText: "帧内说话者",
        resolvedText: "帧内文本不随语言切换",
        revealedCharacters: 10,
        revealLength: 10,
        revealComplete: true,
      },
      onActivate: vi.fn(),
      onChoose: vi.fn(),
      onResume: vi.fn(),
      onSubmitCustom: vi.fn(),
      onToggleAuto: vi.fn(),
      onToggleSkip: vi.fn(),
      onOpenHistory: vi.fn(),
      onReplayVoice: vi.fn(),
    };
    const propsForLocale = (locale: string): NarrativeSurfaceDialogueRendererPropsV1 => ({
      ...base,
      playerProfile: {
        ...playerProfile.current(),
        preferences: {
          ...playerProfile.current().preferences,
          locale,
        },
      },
      resolveText: (textId: string) => catcafeTextForLocaleV1(locale, textId),
    });

    const view = render(<CatcafeNarrativeRendererV1 {...propsForLocale("zh-CN")} />);
    const root = view.container.querySelector("[data-cc-narrative='say']");
    expect(root).toBeVisible();
    expect(root).toHaveStyle({
      background: "rgba(16, 20, 26, 0.82)",
      borderRadius: "16px",
    });
    expect(screen.getByText("帧内文本不随语言切换")).toBeVisible();
    expect(screen.getByRole("button", { name: "继续" })).toBeVisible();

    view.rerender(<CatcafeNarrativeRendererV1 {...propsForLocale("en")} />);
    expect(view.container.querySelector("[data-cc-narrative='say']")).toBe(root);
    expect(screen.getByText("帧内文本不随语言切换")).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
  } finally {
    disposeUi?.();
    await instance.dispose();
  }
});
