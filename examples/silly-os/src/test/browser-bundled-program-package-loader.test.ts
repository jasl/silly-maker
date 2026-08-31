// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { creatorProgramHarnessReferenceV1 } from "../agent/browser-pi-agent-dispatch.ts";
import { loadBrowserBundledProgramPackageV1 } from "../agent/browser-bundled-program-package-loader.ts";
import { creatorBundledProgramPackageV1 } from "../agent/bundled-program-packages/creator-current.ts";
import {
  translationBundledProgramPackageV1,
  translationProgramPromptRevisionV1,
} from "../agent/bundled-program-packages/translation-current.ts";
import { translationProgramHarnessReferenceV1 } from "../product/translation/translation-batch-protocol.ts";

describe("SillyOS build-known bundled Program packages", () => {
  it("selects current Creator and Translation without adding runtime privilege", async () => {
    await expect(loadBrowserBundledProgramPackageV1(
      creatorProgramHarnessReferenceV1,
    )).resolves.toBe(creatorBundledProgramPackageV1);
    await expect(loadBrowserBundledProgramPackageV1(
      translationProgramHarnessReferenceV1,
    )).resolves.toBe(translationBundledProgramPackageV1);

    expect(creatorBundledProgramPackageV1.harnessToolIds).toEqual([
      "read",
      "write",
      "edit",
      "bash",
      "grep",
      "fetch_url",
      "download",
    ]);
    expect(translationProgramHarnessReferenceV1).toBe("sillyos.harness.translation@1");
    expect(translationProgramPromptRevisionV1).toBe(6);
    expect(translationBundledProgramPackageV1.harnessToolIds).toEqual([]);
  });

  it("does not fall back for an unselected or unknown package reference", async () => {
    await expect(
      loadBrowserBundledProgramPackageV1("sillyos.harness.translation@2"),
    ).resolves.toBeNull();
    await expect(
      loadBrowserBundledProgramPackageV1("sillyos.harness.unknown@1"),
    ).resolves.toBeNull();
  });
});
