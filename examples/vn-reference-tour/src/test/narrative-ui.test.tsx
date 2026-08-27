// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createTextContentSessionV1, type TextId } from "@sillymaker/base";
import { createPlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import type { NarrativeSurfaceDialogueRendererPropsV1 } from "@sillymaker/ui";

import {
  projectVnReferenceTourNarrativeSurfaceSelectionV1,
  vnReferenceTourGameApplicationV1,
} from "../application/composition.tsx";
import { createVnReferenceTourApplicationInstanceV1 } from "../application/core-application.ts";
import { VnReferenceTourNarrativeRendererV1 } from "../application/ui.tsx";
import { vnReferenceTourTextCatalogsV1 } from "../content/presentation.ts";
import {
  vnReferenceTourSharedTextPackIdV1,
  vnReferenceTourTextContentManifestV1,
} from "../content/text-content.ts";

const packageRootPathV1 = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

afterEach(cleanup);

it("declares the opaque Narrative surface and mounts a bound passive renderer", async () => {
  const instance = await createVnReferenceTourApplicationInstanceV1();
  const playerProfile = await createPlayerProfileStoreV1({
    records: createMemoryHostRecordStoreV1(),
    storyId: "story.example.vn-reference-tour",
  });
  const textContent = createTextContentSessionV1({
    manifest: vnReferenceTourTextContentManifestV1,
    bootstrapCatalogs: vnReferenceTourTextCatalogsV1.catalogs,
    loadPackBytes: (_descriptor, variant) =>
      readFile(resolve(packageRootPathV1, variant.runtimePath)),
  });
  const textContentLease = await textContent.acquire(vnReferenceTourSharedTextPackIdV1);
  try {
    const ui = vnReferenceTourGameApplicationV1.ui(
      { instance, playerProfile, textContent, reportFailure: vi.fn() } as unknown as Parameters<
        typeof vnReferenceTourGameApplicationV1.ui
      >[0],
    );
    expect(Object.hasOwn(ui, "narrative")).toBe(true);
    expect(Object.hasOwn(ui.slots ?? {}, "narrative")).toBe(false);

    await expect(
      instance.semantic.dispatch(
        { kind: "invoke", actionId: "vn-reference-tour.begin_story" } as never,
      ),
    ).resolves.toMatchObject({ kind: "committed" });
    const firstPending = instance.semantic.observe().narrative.pending;
    if (firstPending === null || firstPending.kind !== "say") {
      throw new TypeError("expected vn-reference-tour opening narration");
    }
    await expect(instance.semantic.dispatch({
      kind: "resolve",
      expectedOccurrenceId: firstPending.occurrenceId,
      resolution: { kind: "advance" },
    } as never)).resolves.toMatchObject({ kind: "committed" });
    const selection = projectVnReferenceTourNarrativeSurfaceSelectionV1(
      instance.semantic.observe(),
    );
    expect(selection.pending).toMatchObject({
      kind: "say",
      occurrenceId: "interaction-occurrence.2",
    });

    const onActivate = vi.fn();
    const pending = selection.pending;
    if (pending === null || pending.kind !== "say") {
      throw new TypeError("expected vn-reference-tour say");
    }
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
        resolvedSpeakerText: "帧内林澄",
        resolvedText: "FRAME-CAPTURED",
        revealedCharacters: 5,
        revealLength: 14,
        revealComplete: false,
      },
    }) satisfies NarrativeSurfaceDialogueRendererPropsV1;

    const view = render(<VnReferenceTourNarrativeRendererV1 {...preparingProps} />);
    expect(document.querySelector("[data-dialogue='say']")).toHaveAttribute(
      "data-dialogue-reveal",
      "revealing",
    );
    expect(screen.getByText("林澄")).toBeVisible();
    view.rerender(<VnReferenceTourNarrativeRendererV1 {...activeProps} />);
    expect(screen.getByText("FRAME")).toBeVisible();
    expect(screen.getByText("帧内林澄")).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: "继续" }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  } finally {
    textContentLease.release();
    textContent.dispose();
    await instance.dispose();
  }
});
