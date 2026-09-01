// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitProgramPackageArchiveV1,
  type ProgramPackageArchiveV1,
} from "../../../src/program-platform/package/program-package-archive.ts";
import { translationProgramPackageSourceV1 } from "../distribution/bundled-package-source.ts";
import { resolveTranslationProgramPackageFacetsV1 } from "../runtime/translation-package-facets.ts";

const noProductQuotaV1 = {
  maximumManifestBytes: Number.MAX_SAFE_INTEGER,
  maximumFiles: Number.MAX_SAFE_INTEGER,
  maximumPathBytes: Number.MAX_SAFE_INTEGER,
  maximumFileBytes: Number.MAX_SAFE_INTEGER,
  maximumPackageBytes: Number.MAX_SAFE_INTEGER,
};

async function admittedPackageV1(): Promise<
  Awaited<ReturnType<typeof admitProgramPackageArchiveV1>>
> {
  return await admitProgramPackageArchiveV1(
    await translationProgramPackageSourceV1.loadArchive(),
    { limits: noProductQuotaV1 },
  );
}

describe("Translation Program package facets", () => {
  it("uses package-owned initial UI and best-effort settings", async () => {
    const facets = resolveTranslationProgramPackageFacetsV1(await admittedPackageV1());

    expect(facets.initialUi?.surface).toBe("translation.intake.v1");
    expect(facets.initialUi?.locales["zh-CN"]?.title).toBe("开始翻译");
    expect(facets.settings.effective.targetLocale).toBe("en");
    expect(facets.settings.effectiveSource).toBe("program_defaults");
    expect(facets.settings.diagnostics).toEqual([]);
  });

  it("falls back without blocking when optional package data is invalid", async () => {
    const admitted = await admittedPackageV1();
    const archive: ProgramPackageArchiveV1 = {
      manifest: admitted.manifest,
      files: admitted.files.map((file) => ({
        ...file,
        bytes: file.path === admitted.manifest.settingsDefaultsPath
          ? new TextEncoder().encode("not json").buffer
          : file.path === admitted.manifest.initialUiPath
          ? new TextEncoder().encode("{}").buffer
          : file.bytes,
      })),
    };
    const changed = await admitProgramPackageArchiveV1(archive, { limits: noProductQuotaV1 });
    const facets = resolveTranslationProgramPackageFacetsV1(changed);

    expect(facets.initialUi).toBeNull();
    expect(facets.settings.effective.targetLocale).toBe("en");
    expect(facets.settings.effectiveSource).toBe("built_in_defaults");
    expect(facets.settings.diagnostics).toEqual([
      { source: "program_defaults", code: "invalid_json", path: "/" },
    ]);
  });
});
