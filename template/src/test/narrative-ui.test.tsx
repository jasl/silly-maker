// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { createTextContentSessionV1, type TextId } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import type { NarrativeSurfaceDialogueRendererPropsV1 } from "@sillymaker/ui";

import {
  projectTemplateNarrativeSurfaceSelectionV1,
  templateGameApplicationV1,
} from "../application/composition.tsx";
import { createTemplateApplicationInstanceV1 } from "../application/core-application.ts";
import { TemplateNarrativeRendererV1 } from "../application/ui.tsx";
import { templateTextCatalogsV1 } from "../content/presentation.ts";
import {
  templateOpeningTextPackIdV1,
  templateTextContentManifestV1,
} from "../content/text-content.ts";

afterEach(cleanup);

it("declares the opaque Narrative surface and mounts a bound passive renderer", async () => {
  const instance = await createTemplateApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.template",
  });
  const textContent = createTextContentSessionV1({
    manifest: templateTextContentManifestV1,
    bootstrapCatalogs: templateTextCatalogsV1.catalogs,
    loadPackBytes: (_descriptor, variant) =>
      readFile(resolve(cwd(), "template", variant.runtimePath)),
  });
  const textContentLease = await textContent.acquire(templateOpeningTextPackIdV1);
  try {
    const ui = templateGameApplicationV1.ui(
      { instance, playerProfile, textContent, reportFailure: vi.fn() } as unknown as Parameters<
        typeof templateGameApplicationV1.ui
      >[0],
    );
    expect(Object.hasOwn(ui, "narrative")).toBe(true);
    expect(Object.hasOwn(ui.slots ?? {}, "narrative")).toBe(false);

    await expect(
      instance.semantic.dispatch({ kind: "invoke", actionId: "template.begin_story" } as never),
    ).resolves.toMatchObject({ kind: "committed" });
    const selection = projectTemplateNarrativeSurfaceSelectionV1(instance.semantic.observe());
    expect(selection.pending).toMatchObject({
      kind: "say",
      occurrenceId: "interaction-occurrence.1",
    });

    const onActivate = vi.fn();
    const pending = selection.pending;
    if (pending === null || pending.kind !== "say") throw new TypeError("expected template say");
    const callbacks = {
      onActivate,
      onChoose: vi.fn(),
      onResume: vi.fn(),
      onSubmitCustom: vi.fn(),
      onToggleAuto: vi.fn(),
      onToggleSkip: vi.fn(),
      onOpenHistory: vi.fn(),
      onReplayVoice: vi.fn(),
    };
    const sharedProps = {
      kind: "dialogue" as const,
      pending,
      choiceAvailability: null,
      playerProfile: playerProfile.current(),
      resolveText: (textId: string) => textContent.resolveText(textId as TextId),
      ...callbacks,
    };
    const preparingProps = ({
      ...sharedProps,
      playerView: {
        kind: "passive" as const,
        phase: "preparing" as const,
        playbackMode: "normal" as const,
      },
    }) satisfies NarrativeSurfaceDialogueRendererPropsV1;
    const activeProps = ({
      ...sharedProps,
      playerView: {
        kind: "say" as const,
        phase: "active" as const,
        playbackMode: "normal" as const,
        resolvedSpeakerText: "帧内小梅",
        resolvedText: "FRAME-CAPTURED",
        revealedCharacters: 5,
        revealLength: 14,
        revealComplete: false,
      },
    }) satisfies NarrativeSurfaceDialogueRendererPropsV1;

    const view = render(<TemplateNarrativeRendererV1 {...preparingProps} />);
    expect(document.querySelector("[data-dialogue='say']")).toHaveAttribute(
      "data-dialogue-reveal",
      "revealing",
    );
    expect(screen.getByText("小梅")).toBeVisible();
    view.rerender(<TemplateNarrativeRendererV1 {...activeProps} />);
    expect(screen.getByText("FRAME")).toBeVisible();
    expect(screen.getByText("帧内小梅")).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: "继续" }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  } finally {
    textContentLease.release();
    textContent.dispose();
    await instance.dispose();
  }
});
