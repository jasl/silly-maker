// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";

import { createTextContentSessionV1, parseLocaleId, type TextId } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import { vnReferenceTourGameApplicationV1 } from "../application/composition.tsx";
import { createVnReferenceTourApplicationInstanceV1 } from "../application/core-application.ts";
import { vnReferenceTourTextCatalogsV1 } from "../content/presentation.ts";
import {
  vnReferenceTourArchiveTextPackIdV1,
  vnReferenceTourPresentTextPackIdV1,
  vnReferenceTourSharedTextPackIdV1,
  vnReferenceTourTextContentManifestV1,
} from "../content/text-content.ts";
import type { VnReferenceTourSignalChoiceV1 } from "../story/narrative.ts";

async function runtimePackBytesV1(runtimePath: string): Promise<Uint8Array> {
  return await readFile(new URL(runtimePath, new URL("../../", import.meta.url)));
}

async function instanceAfterChoiceV1(route: VnReferenceTourSignalChoiceV1) {
  const instance = await createVnReferenceTourApplicationInstanceV1();
  await instance.semantic.dispatch(
    { kind: "invoke", actionId: "vn-reference-tour.begin_story" } as never,
  );
  for (let index = 0; index < 26; index += 1) {
    const pending = instance.semantic.observe().narrative.pending;
    if (pending === null || pending.kind !== "say") {
      throw new TypeError("vn-reference-tour.test_shared_say_missing");
    }
    await instance.semantic.dispatch({
      kind: "resolve",
      expectedOccurrenceId: pending.occurrenceId,
      resolution: { kind: "advance" },
    } as never);
  }
  const choice = instance.semantic.observe().narrative.pending;
  if (choice === null || choice.kind !== "choice") {
    throw new TypeError("vn-reference-tour.test_choice_missing");
  }
  await instance.semantic.dispatch({
    kind: "resolve",
    expectedOccurrenceId: choice.occurrenceId,
    resolution: {
      kind: "choose",
      choiceId: route === "archive"
        ? "choice.vn-reference-tour.archive-voice"
        : "choice.vn-reference-tour.present-voice",
    },
  } as never);
  return instance;
}

describe("VN Reference Tour runtime text-content gate", () => {
  it("loads only the route pack selected by the material choice", () => {
    const requiredForInvocation = vnReferenceTourGameApplicationV1.textContent
      ?.requiredPackIdsForInvocation;
    expect(
      requiredForInvocation?.({
        kind: "resolve",
        expectedOccurrenceId: "interaction-occurrence.27",
        resolution: {
          kind: "choose",
          choiceId: "choice.vn-reference-tour.archive-voice",
        },
      }),
    ).toEqual([vnReferenceTourArchiveTextPackIdV1]);
    expect(
      requiredForInvocation?.({
        kind: "resolve",
        expectedOccurrenceId: "interaction-occurrence.27",
        resolution: {
          kind: "choose",
          choiceId: "choice.vn-reference-tour.present-voice",
        },
      }),
    ).toEqual([vnReferenceTourPresentTextPackIdV1]);
    expect(
      requiredForInvocation?.({
        kind: "resolve",
        expectedOccurrenceId: "interaction-occurrence.1",
        resolution: { kind: "advance" },
      }),
    ).toEqual([]);
  });

  it("selects shared copy plus only the route required by a replacement Snapshot", async () => {
    const requiredForSnapshot = vnReferenceTourGameApplicationV1.textContent
      ?.requiredPackIdsForSnapshot;
    const initial = await createVnReferenceTourApplicationInstanceV1();
    const archive = await instanceAfterChoiceV1("archive");
    const present = await instanceAfterChoiceV1("present");
    try {
      expect(requiredForSnapshot?.(initial.admin.inspectForTest().snapshot)).toEqual([
        vnReferenceTourSharedTextPackIdV1,
      ]);
      expect(requiredForSnapshot?.(archive.admin.inspectForTest().snapshot)).toEqual([
        vnReferenceTourSharedTextPackIdV1,
        vnReferenceTourArchiveTextPackIdV1,
      ]);
      expect(requiredForSnapshot?.(present.admin.inspectForTest().snapshot)).toEqual([
        vnReferenceTourSharedTextPackIdV1,
        vnReferenceTourPresentTextPackIdV1,
      ]);
    } finally {
      await initial.dispose();
      await archive.dispose();
      await present.dispose();
    }
  });

  it("resolves all three editable packs in Chinese and English", async () => {
    const textContent = createTextContentSessionV1({
      manifest: vnReferenceTourTextContentManifestV1,
      bootstrapCatalogs: vnReferenceTourTextCatalogsV1.catalogs,
      loadPackBytes: (_descriptor, variant) => runtimePackBytesV1(variant.runtimePath),
    });
    const sharedLease = await textContent.acquire(vnReferenceTourSharedTextPackIdV1);
    const archiveLease = await textContent.acquire(vnReferenceTourArchiveTextPackIdV1);
    const presentLease = await textContent.acquire(vnReferenceTourPresentTextPackIdV1);
    try {
      expect(textContent.currentLocale()).toBe("zh-CN");
      expect(textContent.loadedVariantCount()).toBe(3);
      expect(textContent.resolveText("text.vn-reference-tour.choice.signal.archive" as TextId))
        .toBe(
          "发送修复后的旧台呼",
        );
      expect(textContent.resolveText("text.vn-reference-tour.archive.ending.title" as TextId)).toBe(
        "旧声入档",
      );
      expect(textContent.resolveText("text.vn-reference-tour.present.ending.title" as TextId)).toBe(
        "此刻入档",
      );

      await expect(textContent.activateLocale(parseLocaleId("en"))).resolves.toBe(true);
      expect(textContent.currentLocale()).toBe("en");
      expect(textContent.loadedVariantCount()).toBe(6);
      expect(textContent.resolveText("text.vn-reference-tour.choice.signal.archive" as TextId))
        .toBe(
          "Send the restored station call",
        );
      expect(textContent.resolveText("text.vn-reference-tour.archive.ending.title" as TextId)).toBe(
        "The Old Voice, Archived",
      );
      expect(textContent.resolveText("text.vn-reference-tour.present.ending.title" as TextId)).toBe(
        "This Moment, Archived",
      );
      expect(textContent.resolveText("text.vn-reference-tour.speaker.lin" as TextId)).toBe("林澄");
    } finally {
      presentLease.release();
      archiveLease.release();
      sharedLease.release();
      textContent.dispose();
    }
  });
});
