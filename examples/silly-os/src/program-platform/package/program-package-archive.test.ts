// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitProgramPackageArchiveV1,
  cloneProgramPackageArchiveV1,
  cloneProgramPackageManifestV1,
  ProgramPackageAdmissionErrorV1,
  readProgramPackageTextFileV1,
  type ProgramPackageAdmissionLimitsV1,
  type ProgramPackageArchiveV1,
} from "./program-package-archive.ts";

const limitsV1: ProgramPackageAdmissionLimitsV1 = {
  maximumManifestBytes: 4_096,
  maximumFiles: 16,
  maximumPathBytes: 256,
  maximumFileBytes: 16_384,
  maximumPackageBytes: 65_536,
};

const bytesV1 = (value: string): ArrayBuffer => new TextEncoder().encode(value).buffer;

function archiveV1(overrides: Partial<ProgramPackageArchiveV1> = {}): ProgramPackageArchiveV1 {
  return {
    manifest: {
      schemaVersion: 1,
      programId: "community.example.translation",
      packageVersion: "1.0.0",
      harnessCompatibility: "sillyos.program-harness.v1",
      runtimeProfile: "agent.workspace.v1",
      name: "Translation",
      summary: "A focused translation workflow.",
      instructionsPath: "instructions/SKILL.md",
      settingsSchemaPath: "settings/schema.json",
      settingsDefaultsPath: null,
      initialUiPath: "ui/initial.json",
      scripts: [{ path: "scripts/prepare.js", runtime: "quickjs" }],
      capabilityIds: ["workspace.read", "workspace.write"],
    },
    files: [
      {
        path: "instructions/SKILL.md",
        mediaType: "text/markdown",
        bytes: bytesV1("Translate the admitted workset."),
      },
      {
        path: "settings/schema.json",
        mediaType: "application/json",
        bytes: bytesV1("{}"),
      },
      {
        path: "ui/initial.json",
        mediaType: "application/json",
        bytes: bytesV1('{"kind":"translation-import"}'),
      },
      {
        path: "scripts/prepare.js",
        mediaType: "application/javascript",
        bytes: bytesV1("export function prepare() {}"),
      },
    ],
    ...overrides,
  };
}

describe("Program package archive V1", () => {
  it("admits structured-clone data and derives an order-independent compatibility binding", async () => {
    const source = archiveV1();
    const first = await admitProgramPackageArchiveV1(source, { limits: limitsV1 });
    const second = await admitProgramPackageArchiveV1(
      structuredClone({ ...source, files: source.files.toReversed() }),
      { limits: limitsV1 },
    );

    expect(first.reference).toEqual(second.reference);
    expect(first.reference).toMatchObject({
      programId: source.manifest.programId,
      packageVersion: source.manifest.packageVersion,
    });
    expect(first.files.map((file) => file.path)).toEqual(
      source.files.map((file) => file.path).toSorted(),
    );

    new Uint8Array(source.files[0]!.bytes).fill(0);
    expect(new TextDecoder().decode(first.files[0]!.bytes)).not.toContain("\0");
  });

  it("uses locale-independent code-unit path order for admitted files", async () => {
    const source = archiveV1();
    const unicodeFiles = [
      ...source.files,
      { path: "资料/é.txt", mediaType: "text/plain", bytes: bytesV1("nfc") },
      { path: "资料/e\u0301.txt", mediaType: "text/plain", bytes: bytesV1("nfd") },
    ];
    const first = await admitProgramPackageArchiveV1(
      { ...source, files: unicodeFiles },
      { limits: limitsV1 },
    );
    const second = await admitProgramPackageArchiveV1(
      { ...source, files: unicodeFiles.toReversed() },
      { limits: limitsV1 },
    );

    expect(first.files.map((file) => file.path).slice(-2)).toEqual([
      "资料/e\u0301.txt",
      "资料/é.txt",
    ]);
    expect(second.reference).toEqual(first.reference);
  });

  it("keeps compatible changed bytes on the same Program binding", async () => {
    const first = await admitProgramPackageArchiveV1(archiveV1(), { limits: limitsV1 });
    const changed = archiveV1();
    const changedFiles = changed.files.map((file) =>
      file.path === "instructions/SKILL.md"
        ? { ...file, bytes: bytesV1("A revised instruction set.") }
        : file
    );
    const second = await admitProgramPackageArchiveV1(
      { ...changed, files: changedFiles },
      { limits: limitsV1 },
    );

    expect(second.reference.packageVersion).toBe(first.reference.packageVersion);
    expect(second.reference).toEqual(first.reference);
    expect(readProgramPackageTextFileV1(second, "instructions/SKILL.md")).toBe(
      "A revised instruction set.",
    );
  });

  it("treats a missing and explicit empty model overlay list as the same package", async () => {
    const missing = archiveV1();
    const explicitEmpty = archiveV1({
      manifest: { ...missing.manifest, modelPromptOverlays: [] },
    });

    const first = await admitProgramPackageArchiveV1(missing, { limits: limitsV1 });
    const second = await admitProgramPackageArchiveV1(explicitEmpty, { limits: limitsV1 });

    expect(first.manifest).not.toHaveProperty("modelPromptOverlays");
    expect(second.manifest).not.toHaveProperty("modelPromptOverlays");
    expect(second.reference).toEqual(first.reference);
  });

  it("treats a missing and explicit empty recommended-model list as the same package", async () => {
    const missing = archiveV1();
    const explicitEmpty = archiveV1({
      manifest: { ...missing.manifest, recommendedModelPatterns: [] },
    });

    const first = await admitProgramPackageArchiveV1(missing, { limits: limitsV1 });
    const second = await admitProgramPackageArchiveV1(explicitEmpty, { limits: limitsV1 });

    expect(first.manifest).not.toHaveProperty("recommendedModelPatterns");
    expect(second.manifest).not.toHaveProperty("recommendedModelPatterns");
    expect(second.reference).toEqual(first.reference);
  });

  it("preserves ordered recommended model patterns in admission and clones", async () => {
    const source = archiveV1();
    const recommendedModelPatterns = [
      "*glm-5.3-flash*",
      "*glm-5.3-flash*",
      "deepseek/deepseek-v4-flash*",
    ] as const;
    const admitted = await admitProgramPackageArchiveV1({
      ...source,
      manifest: { ...source.manifest, recommendedModelPatterns },
    }, { limits: limitsV1 });
    const reversed = await admitProgramPackageArchiveV1({
      ...source,
      manifest: {
        ...source.manifest,
        recommendedModelPatterns: recommendedModelPatterns.toReversed(),
      },
    }, { limits: limitsV1 });

    expect(admitted.manifest.recommendedModelPatterns).toEqual(recommendedModelPatterns);
    expect(admitted.reference).toEqual(reversed.reference);
    expect(reversed.manifest.recommendedModelPatterns).toEqual(
      recommendedModelPatterns.toReversed(),
    );
    const manifestClone = cloneProgramPackageManifestV1(admitted.manifest);
    const archiveClone = cloneProgramPackageArchiveV1(admitted);
    expect(manifestClone.recommendedModelPatterns).toEqual(recommendedModelPatterns);
    expect(archiveClone.manifest.recommendedModelPatterns).toEqual(recommendedModelPatterns);
    expect(manifestClone.recommendedModelPatterns).not.toBe(
      admitted.manifest.recommendedModelPatterns,
    );
    expect(archiveClone.manifest.recommendedModelPatterns).not.toBe(
      admitted.manifest.recommendedModelPatterns,
    );
  });

  it.each([
    null,
    undefined,
    [""],
    [42],
  ])("rejects an invalid recommended-model declaration %#", async (recommendedModelPatterns) => {
    const source = archiveV1();
    await expect(
      admitProgramPackageArchiveV1({
        ...source,
        manifest: { ...source.manifest, recommendedModelPatterns },
      }, { limits: limitsV1 }),
    ).rejects.toMatchObject({ code: "manifest_invalid" });
  });

  it("admits ordered model overlays and clones their declaration objects", async () => {
    const source = archiveV1();
    const modelPromptOverlays = [
      { modelPattern: "*glm-5.3-flash*", path: "prompts/models/glm.md" },
      { modelPattern: "*", path: "prompts/models/common.md" },
      { modelPattern: " literal model id ", path: "prompts/models/common.md" },
      { modelPattern: "openrouter/*", path: "prompts/models/glm.md" },
    ] as const;
    const admitted = await admitProgramPackageArchiveV1({
      ...source,
      manifest: { ...source.manifest, modelPromptOverlays },
      files: [
        ...source.files,
        {
          path: "prompts/models/glm.md",
          mediaType: "text/markdown",
          bytes: bytesV1("Call the completion tool exactly once."),
        },
        {
          path: "prompts/models/common.md",
          mediaType: "text/markdown",
          bytes: bytesV1("Return a complete typed candidate."),
        },
      ],
    }, { limits: limitsV1 });

    expect(admitted.manifest.modelPromptOverlays).toEqual(modelPromptOverlays);
    const manifestClone = cloneProgramPackageManifestV1(admitted.manifest);
    const archiveClone = cloneProgramPackageArchiveV1(admitted);
    expect(manifestClone.modelPromptOverlays).toEqual(modelPromptOverlays);
    expect(archiveClone.manifest.modelPromptOverlays).toEqual(modelPromptOverlays);
    expect(manifestClone.modelPromptOverlays).not.toBe(admitted.manifest.modelPromptOverlays);
    expect(archiveClone.manifest.modelPromptOverlays).not.toBe(
      admitted.manifest.modelPromptOverlays,
    );
    expect(manifestClone.modelPromptOverlays?.[0]).not.toBe(
      admitted.manifest.modelPromptOverlays?.[0],
    );
  });

  it.each([
    null,
    undefined,
    [{ modelPattern: "", path: "prompts/models/glm.md" }],
    [{ modelPattern: "*glm*", path: "prompts/models/glm.md", priority: 1 }],
  ])("rejects an invalid model overlay declaration %#", async (modelPromptOverlays) => {
    const source = archiveV1();
    await expect(
      admitProgramPackageArchiveV1({
        ...source,
        manifest: { ...source.manifest, modelPromptOverlays },
      }, { limits: limitsV1 }),
    ).rejects.toMatchObject({ code: "manifest_invalid" });
  });

  it("applies package path and UTF-8 admission to model overlay files", async () => {
    const source = archiveV1();
    await expect(
      admitProgramPackageArchiveV1({
        ...source,
        manifest: {
          ...source.manifest,
          modelPromptOverlays: [{ modelPattern: "*glm*", path: "../overlay.md" }],
        },
      }, { limits: limitsV1 }),
    ).rejects.toMatchObject({ code: "path_invalid", path: "../overlay.md" });

    await expect(
      admitProgramPackageArchiveV1({
        ...source,
        manifest: {
          ...source.manifest,
          modelPromptOverlays: [{ modelPattern: "*glm*", path: "prompts/models/glm.md" }],
        },
      }, { limits: limitsV1 }),
    ).rejects.toMatchObject({
      code: "referenced_file_missing",
      path: "prompts/models/glm.md",
    });

    await expect(
      admitProgramPackageArchiveV1({
        ...source,
        manifest: {
          ...source.manifest,
          modelPromptOverlays: [{ modelPattern: "*glm*", path: "prompts/models/glm.md" }],
        },
        files: [...source.files, {
          path: "prompts/models/glm.md",
          mediaType: "text/markdown",
          bytes: new Uint8Array([0xc3, 0x28]).buffer,
        }],
      }, { limits: limitsV1 }),
    ).rejects.toMatchObject({
      code: "referenced_text_invalid",
      path: "prompts/models/glm.md",
    });
  });

  it.each([
    "../escape.js",
    "/absolute.js",
    "nested//empty.js",
    "windows\\path.js",
    "dot/./segment.js",
  ])("rejects non-canonical package path %s", async (path) => {
    const source = archiveV1();
    await expect(
      admitProgramPackageArchiveV1(
        { ...source, files: [{ ...source.files[0], path }, ...source.files.slice(1)] },
        { limits: limitsV1 },
      ),
    ).rejects.toMatchObject({ code: "path_invalid" });
  });

  it("rejects duplicate and missing referenced files", async () => {
    const duplicate = archiveV1();
    await expect(
      admitProgramPackageArchiveV1(
        { ...duplicate, files: [...duplicate.files, duplicate.files[0]] },
        { limits: limitsV1 },
      ),
    ).rejects.toMatchObject({ code: "duplicate_path" });

    const missing = archiveV1();
    await expect(
      admitProgramPackageArchiveV1(
        { ...missing, files: missing.files.slice(1) },
        { limits: limitsV1 },
      ),
    ).rejects.toMatchObject({
      code: "referenced_file_missing",
      path: "instructions/SKILL.md",
    });
  });

  it("enforces caller-owned work and memory budgets without imposing semantic limits", async () => {
    const source = archiveV1();
    await expect(
      admitProgramPackageArchiveV1(source, {
        limits: { ...limitsV1, maximumFiles: source.files.length - 1 },
      }),
    ).rejects.toMatchObject({ code: "too_many_files" });
    await expect(
      admitProgramPackageArchiveV1(source, {
        limits: { ...limitsV1, maximumFileBytes: 1 },
      }),
    ).rejects.toMatchObject({ code: "file_too_large" });
    await expect(
      admitProgramPackageArchiveV1(source, {
        limits: { ...limitsV1, maximumPackageBytes: 1 },
      }),
    ).rejects.toBeInstanceOf(ProgramPackageAdmissionErrorV1);
  });

  it("rejects unknown manifest fields and callback-shaped archive content", async () => {
    const source = archiveV1();
    await expect(
      admitProgramPackageArchiveV1({
        ...source,
        manifest: { ...source.manifest, createPrompt: () => "same-realm callback" },
      }, { limits: limitsV1 }),
    ).rejects.toMatchObject({ code: "manifest_invalid" });
  });
});
