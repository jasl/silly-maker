// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";

import { createTextContentSessionV1, parseLocaleId, type TextId } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  projectVnReferenceTourNarrativeSurfaceSelectionV1,
  vnReferenceTourGameApplicationV1,
} from "../application/composition.tsx";
import { createVnReferenceTourApplicationInstanceV1 } from "../application/core-application.ts";
import { vnReferenceTourTextCatalogsV1 } from "../content/presentation.ts";
import {
  vnReferenceTourEndingTextPackIdV1,
  vnReferenceTourOpeningTextPackIdV1,
  vnReferenceTourTextContentManifestV1,
} from "../content/text-content.ts";

async function runtimePackBytesV1(runtimePath: string): Promise<Uint8Array> {
  return await readFile(new URL(runtimePath, new URL("../../", import.meta.url)));
}

async function advanceToFirstChoiceV1(
  instance: Awaited<ReturnType<typeof createVnReferenceTourApplicationInstanceV1>>,
): Promise<ReturnType<typeof projectVnReferenceTourNarrativeSurfaceSelectionV1>> {
  await instance.semantic.dispatch(
    { kind: "invoke", actionId: "vn-reference-tour.begin_story" } as never,
  );
  const greeting =
    projectVnReferenceTourNarrativeSurfaceSelectionV1(instance.semantic.observe()).pending;
  if (greeting === null) throw new TypeError("vn-reference-tour test greeting missing");
  await instance.semantic.dispatch({
    kind: "resolve",
    expectedOccurrenceId: greeting.occurrenceId,
    resolution: { kind: "advance" },
  } as never);
  return projectVnReferenceTourNarrativeSurfaceSelectionV1(instance.semantic.observe());
}

describe("VnReferenceTour runtime text-content gate", () => {
  it("selects the ending pack for an admitted automation-equivalent choice", async () => {
    const instance = await createVnReferenceTourApplicationInstanceV1();
    try {
      const choice = await advanceToFirstChoiceV1(instance);
      if (choice.pending === null || choice.pending.kind !== "choice") {
        throw new TypeError("vn-reference-tour test choice missing");
      }
      const requiredForInvocation = vnReferenceTourGameApplicationV1.textContent
        ?.requiredPackIdsForInvocation;
      expect(
        requiredForInvocation?.({
          kind: "resolve",
          expectedOccurrenceId: choice.pending.occurrenceId,
          resolution: { kind: "choose", choiceId: "choice.vn-reference-tour.look" },
        }),
      ).toEqual([vnReferenceTourEndingTextPackIdV1]);
      expect(
        requiredForInvocation?.({
          kind: "resolve",
          expectedOccurrenceId: choice.pending.occurrenceId,
          resolution: { kind: "advance" },
        }),
      ).toEqual([]);
    } finally {
      await instance.dispose();
    }
  });

  it("selects only the packs required by a replacement Snapshot", async () => {
    const instance = await createVnReferenceTourApplicationInstanceV1();
    try {
      const requiredForSnapshot = vnReferenceTourGameApplicationV1.textContent
        ?.requiredPackIdsForSnapshot;
      expect(requiredForSnapshot?.(instance.admin.inspectForTest().snapshot)).toEqual([
        vnReferenceTourOpeningTextPackIdV1,
      ]);
      const choice = await advanceToFirstChoiceV1(instance);
      if (choice.pending === null || choice.pending.kind !== "choice") {
        throw new TypeError("vn-reference-tour test choice missing");
      }
      await instance.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: choice.pending.occurrenceId,
        resolution: {
          kind: "choose",
          choiceId: "choice.vn-reference-tour.look",
        },
      } as never);
      expect(requiredForSnapshot?.(instance.admin.inspectForTest().snapshot)).toEqual([
        vnReferenceTourOpeningTextPackIdV1,
        vnReferenceTourEndingTextPackIdV1,
      ]);
    } finally {
      await instance.dispose();
    }
  });

  it("resolves text after the selected runtime pack is admitted", async () => {
    const textContent = createTextContentSessionV1({
      manifest: vnReferenceTourTextContentManifestV1,
      bootstrapCatalogs: vnReferenceTourTextCatalogsV1.catalogs,
      loadPackBytes: (_descriptor, variant) => runtimePackBytesV1(variant.runtimePath),
    });
    const openingLease = await textContent.acquire(vnReferenceTourOpeningTextPackIdV1);
    const endingLease = await textContent.acquire(vnReferenceTourEndingTextPackIdV1);
    try {
      expect(textContent.currentLocale()).toBe("zh-CN");
      expect(textContent.loadedVariantCount()).toBe(2);
      expect(textContent.resolveText("text.vn-reference-tour.line.cat" as TextId)).toBe(
        "看，檐角下躲着一只小猫，毛都淋湿了。",
      );
      await expect(textContent.activateLocale(parseLocaleId("en"))).resolves.toBe(true);
      expect(textContent.currentLocale()).toBe("en");
      expect(textContent.loadedVariantCount()).toBe(4);
      expect(textContent.resolveText("text.vn-reference-tour.line.greeting" as TextId)).toBe(
        "The rain has stopped, and the courtyard stones still shine with water.",
      );
      expect(textContent.resolveText("text.vn-reference-tour.line.ending-warm" as TextId)).toBe(
        "Mei carries the kitten inside and winks at you. Today is a good day.",
      );
      expect(textContent.resolveText("text.vn-reference-tour.choice.inside" as TextId)).toBe(
        "先回屋里",
      );
      expect(textContent.resolveText("text.vn-reference-tour.line.ending-plain" as TextId)).toBe(
        "屋里茶还温着。院子里的雨声停了。",
      );
    } finally {
      endingLease.release();
      openingLease.release();
      textContent.dispose();
    }
  });
});
