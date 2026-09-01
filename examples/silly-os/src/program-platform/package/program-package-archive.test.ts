// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitProgramPackageArchiveV1,
  ProgramPackageAdmissionErrorV1,
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
  it("admits structured-clone data and derives one exact order-independent content identity", async () => {
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
      contentDigest: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    expect(first.files.map((file) => file.path)).toEqual(
      source.files.map((file) => file.path).toSorted(),
    );

    new Uint8Array(source.files[0]!.bytes).fill(0);
    expect(new TextDecoder().decode(first.files[0]!.bytes)).not.toContain("\0");
  });

  it("uses the digest rather than the human package version as exact identity", async () => {
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
    expect(second.reference.contentDigest).not.toBe(first.reference.contentDigest);
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
