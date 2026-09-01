// SPDX-License-Identifier: MIT

import { Zip, ZipPassThrough, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  admitProgramPackageArchiveV1,
  ProgramPackageAdmissionErrorV1,
  type ProgramPackageAdmissionLimitsV1,
  type ProgramPackageManifestV1,
} from "./program-package-archive.ts";
import {
  decodeProgramPackageZipV1,
  ProgramPackageZipErrorV1,
  type ProgramPackageZipBudgetsV1,
} from "./program-package-zip.ts";

const textEncoderV1 = new TextEncoder();
const archiveLimitsV1: ProgramPackageAdmissionLimitsV1 = {
  maximumManifestBytes: 4_096,
  maximumFiles: 16,
  maximumPathBytes: 256,
  maximumFileBytes: 16_384,
  maximumPackageBytes: 65_536,
};
const budgetsV1: ProgramPackageZipBudgetsV1 = {
  maximumCompressedBytes: 65_536,
  maximumUncompressedBytes: 65_536,
  maximumEntries: 32,
};

const manifestV1: ProgramPackageManifestV1 = {
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
  initialUiPath: null,
  scripts: [{ path: "scripts/prepare.js", runtime: "quickjs" }],
  capabilityIds: ["workspace.read", "workspace.write"],
};

function zipV1(
  files: Readonly<Record<string, string>> = {},
  prefix = "",
): Uint8Array<ArrayBuffer> {
  return zipSync(Object.fromEntries(
    Object.entries({
      "program.json": JSON.stringify(manifestV1),
      "instructions/SKILL.md": "Translate the admitted workset.",
      "settings/schema.json": "{}",
      "scripts/prepare.js": "export function prepare() {}",
      ...files,
    }).map(([path, value]) => [`${prefix}${path}`, textEncoderV1.encode(value)]),
  ));
}

function duplicateEntryZipV1(path: string): Uint8Array<ArrayBuffer> {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let terminalError: unknown = null;
  const zip = new Zip((error, chunk) => {
    if (error !== null) terminalError = error;
    else chunks.push(chunk.slice());
  });
  for (const value of ["first", "second"]) {
    const file = new ZipPassThrough(path);
    zip.add(file);
    file.push(textEncoderV1.encode(value), true);
  }
  zip.end();
  if (terminalError !== null) throw terminalError;
  const byteLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

const decodeV1 = async (
  bytes: ArrayBuffer | Uint8Array,
  overrides: {
    readonly budgets?: ProgramPackageZipBudgetsV1;
    readonly archiveLimits?: ProgramPackageAdmissionLimitsV1;
  } = {},
) =>
  await decodeProgramPackageZipV1(bytes, {
    budgets: overrides.budgets ?? budgetsV1,
    archiveLimits: overrides.archiveLimits ?? archiveLimitsV1,
  });

describe("external Program package ZIP V1", () => {
  it("decodes root and single-directory packages to the same admitted archive identity", async () => {
    const root = await decodeV1(zipV1());
    const nested = await decodeV1(zipV1({}, "translation-program/"));
    const admittedRoot = await admitProgramPackageArchiveV1(root, { limits: archiveLimitsV1 });
    const admittedNested = await admitProgramPackageArchiveV1(nested, {
      limits: archiveLimitsV1,
    });

    expect(admittedRoot.reference).toEqual(admittedNested.reference);
    expect(root.manifest).toEqual(manifestV1);
    expect(admittedRoot.files.map((file) => [file.path, file.mediaType])).toEqual([
      ["instructions/SKILL.md", "text/markdown"],
      ["scripts/prepare.js", "application/javascript"],
      ["settings/schema.json", "application/json"],
    ]);
  });

  it("ignores explicit directory entries", async () => {
    const archive = await decodeV1(zipSync({
      "translation-program/": new Uint8Array(),
      "translation-program/program.json": textEncoderV1.encode(JSON.stringify(manifestV1)),
      "translation-program/instructions/": new Uint8Array(),
      "translation-program/instructions/SKILL.md": textEncoderV1.encode("Instructions."),
      "translation-program/settings/schema.json": textEncoderV1.encode("{}"),
      "translation-program/scripts/prepare.js": textEncoderV1.encode("export {}"),
    }));

    const admitted = await admitProgramPackageArchiveV1(archive, { limits: archiveLimitsV1 });
    expect(admitted.files.map((file) => file.path)).toEqual([
      "instructions/SKILL.md",
      "scripts/prepare.js",
      "settings/schema.json",
    ]);
  });

  it.each([
    "../escape.txt",
    "/absolute.txt",
    "C:/absolute.txt",
    "nested\\windows.txt",
  ])("rejects unsafe ZIP entry %s before exposing archive data", async (path) => {
    await expect(decodeV1(zipV1({ [path]: "unsafe" }))).rejects.toMatchObject({
      code: "path_invalid",
    });
  });

  it("rejects exact duplicate and case-colliding file entries without silent overwrite", async () => {
    await expect(decodeV1(duplicateEntryZipV1("program.json"))).rejects.toMatchObject({
      code: "duplicate_path",
    });
    await expect(
      decodeV1(zipV1({
        "assets/Portrait.png": "first",
        "assets/portrait.png": "second",
      })),
    ).rejects.toMatchObject({ code: "duplicate_path" });
  });

  it("rejects missing, multiple, and malformed manifests before package admission", async () => {
    await expect(
      decodeV1(zipSync({ "instructions/SKILL.md": textEncoderV1.encode("missing") })),
    ).rejects.toMatchObject({ code: "manifest_missing" });
    await expect(
      decodeV1(zipSync({
        "program.json": textEncoderV1.encode(JSON.stringify(manifestV1)),
        "nested/program.json": textEncoderV1.encode(JSON.stringify(manifestV1)),
      })),
    ).rejects.toMatchObject({ code: "manifest_multiple" });
    await expect(
      decodeV1(zipSync({ "program.json": textEncoderV1.encode("not json") })),
    ).rejects.toBeInstanceOf(ProgramPackageZipErrorV1);
    const semanticallyIncomplete = await decodeV1(zipSync({
      "program.json": textEncoderV1.encode(JSON.stringify(manifestV1)),
      "settings/schema.json": textEncoderV1.encode("{}"),
      "scripts/prepare.js": textEncoderV1.encode("export {}"),
    }));
    await expect(
      admitProgramPackageArchiveV1(semanticallyIncomplete, { limits: archiveLimitsV1 }),
    ).rejects.toBeInstanceOf(ProgramPackageAdmissionErrorV1);
  });

  it("enforces caller-owned compressed, uncompressed, and entry work budgets", async () => {
    const bytes = zipV1();
    await expect(decodeV1(bytes, {
      budgets: { ...budgetsV1, maximumCompressedBytes: bytes.byteLength - 1 },
    })).rejects.toMatchObject({ code: "compressed_budget_exceeded" });
    await expect(decodeV1(bytes, {
      budgets: { ...budgetsV1, maximumUncompressedBytes: 1 },
    })).rejects.toMatchObject({ code: "uncompressed_budget_exceeded" });
    await expect(decodeV1(bytes, {
      budgets: { ...budgetsV1, maximumEntries: 1 },
    })).rejects.toMatchObject({ code: "entry_budget_exceeded" });
  });
});
