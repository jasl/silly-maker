// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { createTextContentSessionV1, parseLocaleId, type TextId } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  projectTemplateNarrativeSurfaceSelectionV1,
  templateGameApplicationV1,
} from "../application/composition.tsx";
import { createTemplateApplicationInstanceV1 } from "../application/core-application.ts";
import { templateTextCatalogsV1 } from "../content/presentation.ts";
import {
  templateEndingTextPackIdV1,
  templateOpeningTextPackIdV1,
  templateTextContentManifestV1,
} from "../content/text-content.ts";

async function runtimePackBytesV1(runtimePath: string): Promise<Uint8Array> {
  return await readFile(resolve(cwd(), "template", runtimePath));
}

async function advanceToFirstChoiceV1(
  instance: Awaited<ReturnType<typeof createTemplateApplicationInstanceV1>>,
): Promise<ReturnType<typeof projectTemplateNarrativeSurfaceSelectionV1>> {
  await instance.semantic.dispatch({ kind: "invoke", actionId: "template.begin_story" } as never);
  const greeting = projectTemplateNarrativeSurfaceSelectionV1(instance.semantic.observe()).pending;
  if (greeting === null) throw new TypeError("template test greeting missing");
  await instance.semantic.dispatch({
    kind: "resolve",
    expectedOccurrenceId: greeting.occurrenceId,
    resolution: { kind: "advance" },
  } as never);
  return projectTemplateNarrativeSurfaceSelectionV1(instance.semantic.observe());
}

describe("Template runtime text-content gate", () => {
  it("selects the ending pack for an admitted automation-equivalent choice", async () => {
    const instance = await createTemplateApplicationInstanceV1();
    try {
      const choice = await advanceToFirstChoiceV1(instance);
      if (choice.pending === null || choice.pending.kind !== "choice") {
        throw new TypeError("template test choice missing");
      }
      const requiredForInvocation = templateGameApplicationV1.textContent
        ?.requiredPackIdsForInvocation;
      expect(
        requiredForInvocation?.({
          kind: "resolve",
          expectedOccurrenceId: choice.pending.occurrenceId,
          resolution: { kind: "choose", choiceId: "choice.template.look" },
        }),
      ).toEqual([templateEndingTextPackIdV1]);
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
    const instance = await createTemplateApplicationInstanceV1();
    try {
      const requiredForSnapshot = templateGameApplicationV1.textContent
        ?.requiredPackIdsForSnapshot;
      expect(requiredForSnapshot?.(instance.admin.inspectForTest().snapshot)).toEqual([
        templateOpeningTextPackIdV1,
      ]);
      const choice = await advanceToFirstChoiceV1(instance);
      if (choice.pending === null || choice.pending.kind !== "choice") {
        throw new TypeError("template test choice missing");
      }
      await instance.semantic.dispatch({
        kind: "resolve",
        expectedOccurrenceId: choice.pending.occurrenceId,
        resolution: {
          kind: "choose",
          choiceId: "choice.template.look",
        },
      } as never);
      expect(requiredForSnapshot?.(instance.admin.inspectForTest().snapshot)).toEqual([
        templateOpeningTextPackIdV1,
        templateEndingTextPackIdV1,
      ]);
    } finally {
      await instance.dispose();
    }
  });

  it("resolves text after the selected runtime pack is admitted", async () => {
    const textContent = createTextContentSessionV1({
      manifest: templateTextContentManifestV1,
      bootstrapCatalogs: templateTextCatalogsV1.catalogs,
      loadPackBytes: (_descriptor, variant) => runtimePackBytesV1(variant.runtimePath),
    });
    const openingLease = await textContent.acquire(templateOpeningTextPackIdV1);
    const endingLease = await textContent.acquire(templateEndingTextPackIdV1);
    try {
      expect(textContent.currentLocale()).toBe("zh-CN");
      expect(textContent.loadedVariantCount()).toBe(2);
      expect(textContent.resolveText("text.template.line.cat" as TextId)).toBe(
        "看，檐角下躲着一只小猫，毛都淋湿了。",
      );
      await expect(textContent.activateLocale(parseLocaleId("en"))).resolves.toBe(true);
      expect(textContent.currentLocale()).toBe("en");
      expect(textContent.loadedVariantCount()).toBe(4);
      expect(textContent.resolveText("text.template.line.greeting" as TextId)).toBe(
        "The rain has stopped, and the courtyard stones still shine with water.",
      );
      expect(textContent.resolveText("text.template.line.ending-warm" as TextId)).toBe(
        "Mei carries the kitten inside and winks at you. Today is a good day.",
      );
      expect(textContent.resolveText("text.template.choice.inside" as TextId)).toBe(
        "先回屋里",
      );
      expect(textContent.resolveText("text.template.line.ending-plain" as TextId)).toBe(
        "屋里茶还温着。院子里的雨声停了。",
      );
    } finally {
      endingLease.release();
      openingLease.release();
      textContent.dispose();
    }
  });
});
