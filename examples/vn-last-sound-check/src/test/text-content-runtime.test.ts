// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";

import { createTextContentSessionV1, parseLocaleId, type TextId } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { vnLastSoundCheckGameApplicationV1 } from "../application/production-application.tsx";
import { createVnLastSoundCheckApplicationInstanceV1 } from "../application/core-application.ts";
import { vnLastSoundCheckTextCatalogsV1 } from "../content/presentation.ts";
import {
  vnLastSoundCheckArchiveTextPackIdV1,
  vnLastSoundCheckPresentTextPackIdV1,
  vnLastSoundCheckSharedTextPackIdV1,
  vnLastSoundCheckTextContentManifestV1,
} from "../content/text-content.ts";
import type { VnLastSoundCheckSignalChoiceV1 } from "../story/narrative.ts";

async function runtimePackBytesV1(runtimePath: string): Promise<Uint8Array> {
  return await readFile(new URL(runtimePath, new URL("../../", import.meta.url)));
}

const maxNarrativeAdvancesV1 = 128;

async function reachChoiceV1(
  instance: Awaited<ReturnType<typeof createVnLastSoundCheckApplicationInstanceV1>>,
) {
  await instance.semantic.dispatch(
    { kind: "invoke", actionId: "vn-last-sound-check.begin_story" } as never,
  );
  for (let step = 0; step < maxNarrativeAdvancesV1; step += 1) {
    const pending = instance.semantic.observe().narrative.pending;
    if (pending?.kind === "choice") return pending;
    if (pending === null || pending.kind !== "say") {
      throw new TypeError("vn-last-sound-check.test_shared_say_missing");
    }
    await instance.semantic.dispatch({
      kind: "resolve",
      expectedOccurrenceId: pending.occurrenceId,
      resolution: { kind: "advance" },
    } as never);
  }
  throw new TypeError("vn-last-sound-check.test_choice_advance_limit");
}

async function instanceAfterChoiceV1(route: VnLastSoundCheckSignalChoiceV1) {
  const instance = await createVnLastSoundCheckApplicationInstanceV1();
  const choice = await reachChoiceV1(instance);
  await instance.semantic.dispatch({
    kind: "resolve",
    expectedOccurrenceId: choice.occurrenceId,
    resolution: {
      kind: "choose",
      choiceId: route === "archive"
        ? "choice.vn-last-sound-check.archive-voice"
        : "choice.vn-last-sound-check.present-voice",
    },
  } as never);
  return instance;
}

describe("One Last Sound Check runtime text-content gate", () => {
  it("loads only the route pack selected by the material choice", async () => {
    const requiredForInvocation = vnLastSoundCheckGameApplicationV1.textContent
      ?.requiredPackIdsForInvocation;
    const instance = await createVnLastSoundCheckApplicationInstanceV1();
    try {
      const choice = await reachChoiceV1(instance);
      expect(
        requiredForInvocation?.({
          kind: "resolve",
          expectedOccurrenceId: choice.occurrenceId,
          resolution: {
            kind: "choose",
            choiceId: "choice.vn-last-sound-check.archive-voice",
          },
        }),
      ).toEqual([vnLastSoundCheckArchiveTextPackIdV1]);
      expect(
        requiredForInvocation?.({
          kind: "resolve",
          expectedOccurrenceId: choice.occurrenceId,
          resolution: {
            kind: "choose",
            choiceId: "choice.vn-last-sound-check.present-voice",
          },
        }),
      ).toEqual([vnLastSoundCheckPresentTextPackIdV1]);
      expect(
        requiredForInvocation?.({
          kind: "resolve",
          expectedOccurrenceId: choice.occurrenceId,
          resolution: { kind: "advance" },
        }),
      ).toEqual([]);
    } finally {
      await instance.dispose();
    }
  });

  it("selects shared copy plus only the route required by a replacement Snapshot", async () => {
    const requiredForSnapshot = vnLastSoundCheckGameApplicationV1.textContent
      ?.requiredPackIdsForSnapshot;
    const initial = await createVnLastSoundCheckApplicationInstanceV1();
    const archive = await instanceAfterChoiceV1("archive");
    const present = await instanceAfterChoiceV1("present");
    try {
      expect(requiredForSnapshot?.(initial.admin.inspectForTest().snapshot)).toEqual([
        vnLastSoundCheckSharedTextPackIdV1,
      ]);
      expect(requiredForSnapshot?.(archive.admin.inspectForTest().snapshot)).toEqual([
        vnLastSoundCheckSharedTextPackIdV1,
        vnLastSoundCheckArchiveTextPackIdV1,
      ]);
      expect(requiredForSnapshot?.(present.admin.inspectForTest().snapshot)).toEqual([
        vnLastSoundCheckSharedTextPackIdV1,
        vnLastSoundCheckPresentTextPackIdV1,
      ]);
    } finally {
      await initial.dispose();
      await archive.dispose();
      await present.dispose();
    }
  });

  it("resolves all three editable packs in Chinese and English", async () => {
    const textContent = createTextContentSessionV1({
      manifest: vnLastSoundCheckTextContentManifestV1,
      bootstrapCatalogs: vnLastSoundCheckTextCatalogsV1.catalogs,
      loadPackBytes: (_descriptor, variant) => runtimePackBytesV1(variant.runtimePath),
    });
    const sharedLease = await textContent.acquire(vnLastSoundCheckSharedTextPackIdV1);
    const archiveLease = await textContent.acquire(vnLastSoundCheckArchiveTextPackIdV1);
    const presentLease = await textContent.acquire(vnLastSoundCheckPresentTextPackIdV1);
    try {
      expect(textContent.currentLocale()).toBe("zh-CN");
      expect(textContent.loadedVariantCount()).toBe(3);
      expect(textContent.resolveText("text.vn-last-sound-check.choice.signal.archive" as TextId))
        .toBe(
          "发送修复后的旧台呼",
        );
      expect(textContent.resolveText("text.vn-last-sound-check.archive.ending.title" as TextId))
        .toBe(
          "旧声入档",
        );
      expect(textContent.resolveText("text.vn-last-sound-check.present.ending.title" as TextId))
        .toBe(
          "此刻入档",
        );

      await expect(textContent.activateLocale(parseLocaleId("en"))).resolves.toBe(true);
      expect(textContent.currentLocale()).toBe("en");
      expect(textContent.loadedVariantCount()).toBe(6);
      expect(textContent.resolveText("text.vn-last-sound-check.choice.signal.archive" as TextId))
        .toBe(
          "Send the restored station call",
        );
      expect(textContent.resolveText("text.vn-last-sound-check.archive.ending.title" as TextId))
        .toBe(
          "The Old Voice, Archived",
        );
      expect(textContent.resolveText("text.vn-last-sound-check.present.ending.title" as TextId))
        .toBe(
          "This Moment, Archived",
        );
      expect(textContent.resolveText("text.vn-last-sound-check.speaker.lin" as TextId)).toBe(
        "Lin Cheng",
      );
      expect(textContent.resolveText("text.vn-last-sound-check.playback.history" as TextId)).toBe(
        "History",
      );
    } finally {
      presentLease.release();
      archiveLease.release();
      sharedLease.release();
      textContent.dispose();
    }
  });
});
