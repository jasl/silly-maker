// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { creatorProgramHarnessReferenceV1 } from "../agent/browser-pi-agent-dispatch.ts";
import { loadBrowserBuiltinProgramPackageV1 } from "../agent/browser-builtin-program-package-loader.ts";
import { creatorBuiltinProgramPackageV1 } from "../agent/builtin-program-packages/creator-current.ts";
import {
  translationBuiltinProgramPackageV1,
  translationProgramPromptRevisionV1,
} from "../agent/builtin-program-packages/translation-current.ts";
import { translationProgramHarnessReferenceV1 } from "../product/translation/translation-batch-protocol.ts";

describe("SillyOS build-known built-in Program prototypes", () => {
  it("resolves the selected current Creator and Translation implementations", async () => {
    await expect(loadBrowserBuiltinProgramPackageV1(
      creatorProgramHarnessReferenceV1,
    )).resolves.toBe(creatorBuiltinProgramPackageV1);
    await expect(loadBrowserBuiltinProgramPackageV1(
      translationProgramHarnessReferenceV1,
    )).resolves.toBe(translationBuiltinProgramPackageV1);

    expect(creatorBuiltinProgramPackageV1.harnessToolIds).toEqual([
      "read",
      "write",
      "edit",
      "bash",
      "grep",
      "fetch_url",
      "download",
    ]);
    expect(translationProgramHarnessReferenceV1).toBe("sillyos.harness.translation@1");
    expect(translationProgramPromptRevisionV1).toBe(5);
    expect(translationBuiltinProgramPackageV1.harnessToolIds).toEqual([]);
  });

  it("does not fall back for an unselected or unknown package reference", async () => {
    await expect(
      loadBrowserBuiltinProgramPackageV1("sillyos.harness.translation@2"),
    ).resolves.toBeNull();
    await expect(
      loadBrowserBuiltinProgramPackageV1("sillyos.harness.unknown@1"),
    ).resolves.toBeNull();
  });
});
