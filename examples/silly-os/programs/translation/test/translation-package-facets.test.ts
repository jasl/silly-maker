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
  it("uses package-owned initial UI and exposes exact settings defaults", async () => {
    const facets = resolveTranslationProgramPackageFacetsV1(await admittedPackageV1());

    expect(facets.initialUi?.surface).toBe("translation.workspace.v1");
    expect(facets.initialUi?.defaultLocale).toBe("en");
    const en = facets.initialUi?.locales.en;
    const zhCn = facets.initialUi?.locales["zh-CN"];
    expect(en?.intakeDocument.root.children).toEqual([
      { kind: "heading", text: "Start translating", level: 1 },
      {
        kind: "text",
        text:
          "Import one source file. SillyOS detects its structure, preserves the original, and prepares stable units before the Agent runs.",
        tone: "muted",
      },
    ]);
    expect(zhCn?.workbenchDocument.root.children).toHaveLength(3);
    expect(zhCn?.workbenchDocument.root.children[2]).toEqual({
      kind: "action",
      actionId: "translate-next-batch",
      label: "翻译下一批",
      prompt:
        "翻译下一批已准备好的内容。保持原意、人物关系、术语、格式和受保护标记，并返回可供审阅的候选结果。",
      variant: "primary",
    });
    expect(en?.dropLabel).toMatch(/VTT/u);
    expect(en?.dropLabel).toMatch(/ASS/u);
    expect(zhCn?.sourceLanguageLabel).toBe("源语言");
    expect(zhCn?.targetLanguageLabel).toBe("目标语言");
    expect(facets.settingsDefaultsJson).toContain('"targetLocale": "en"');
  });

  it("keeps invalid optional UI inert and leaves settings parsing to the controller", async () => {
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
    expect(facets.settingsDefaultsJson).toBe("not json");
  });

  it("rejects optional UI whose declared default locale is unavailable", async () => {
    const admitted = await admittedPackageV1();
    const initialUiFile = admitted.files.find(
      (file) => file.path === admitted.manifest.initialUiPath,
    );
    expect(initialUiFile).toBeDefined();
    const source = JSON.parse(new TextDecoder().decode(initialUiFile!.bytes)) as {
      readonly locales: Readonly<Record<string, unknown>>;
      readonly [key: string]: unknown;
    };
    const archive: ProgramPackageArchiveV1 = {
      manifest: admitted.manifest,
      files: admitted.files.map((file) => ({
        ...file,
        bytes: file.path === admitted.manifest.initialUiPath
          ? new TextEncoder().encode(JSON.stringify({
            ...source,
            defaultLocale: "zh-CN",
            locales: { en: source.locales.en },
          })).buffer
          : file.bytes,
      })),
    };
    const changed = await admitProgramPackageArchiveV1(archive, { limits: noProductQuotaV1 });

    expect(resolveTranslationProgramPackageFacetsV1(changed).initialUi).toBeNull();
  });

  it("keeps the complete localized UI optional when an OpenUI document is invalid", async () => {
    const admitted = await admittedPackageV1();
    const initialUiFile = admitted.files.find(
      (file) => file.path === admitted.manifest.initialUiPath,
    );
    expect(initialUiFile).toBeDefined();
    const source = JSON.parse(new TextDecoder().decode(initialUiFile!.bytes)) as {
      locales: Record<string, { workbenchDocument: { source: string } }>;
    };
    const english = source.locales.en;
    expect(english).toBeDefined();
    english!.workbenchDocument.source = 'root = Stack([Unknown("unadmitted component")])';
    const archive: ProgramPackageArchiveV1 = {
      manifest: admitted.manifest,
      files: admitted.files.map((file) => ({
        ...file,
        bytes: file.path === admitted.manifest.initialUiPath
          ? new TextEncoder().encode(JSON.stringify(source)).buffer
          : file.bytes,
      })),
    };
    const changed = await admitProgramPackageArchiveV1(archive, { limits: noProductQuotaV1 });

    expect(resolveTranslationProgramPackageFacetsV1(changed).initialUi).toBeNull();
  });
});
