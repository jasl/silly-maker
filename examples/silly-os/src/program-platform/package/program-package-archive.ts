// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

export const programPackageArchiveSchemaVersionV1 = 1;
export const sillyOsProgramHarnessCompatibilityV1 = "sillyos.program-harness.v1" as const;

export interface ProgramPackageAdmissionLimitsV1 {
  /** Maximum UTF-8 bytes occupied by the canonical manifest. */
  readonly maximumManifestBytes: number;
  /** Maximum number of files in one package. */
  readonly maximumFiles: number;
  /** Maximum UTF-8 bytes occupied by one package-relative path. */
  readonly maximumPathBytes: number;
  /** Maximum bytes occupied by one file. */
  readonly maximumFileBytes: number;
  /** Maximum bytes occupied by the canonical manifest plus file metadata and contents. */
  readonly maximumPackageBytes: number;
}

export interface ProgramPackageScriptV1 {
  readonly path: string;
  /** The fixed SillyOS harness owns these runtimes; package code never executes in the page realm. */
  readonly runtime: "quickjs" | "python";
}

export interface ProgramModelPromptOverlayV1 {
  readonly modelPattern: string;
  readonly path: string;
}

export interface ProgramPackageManifestV1 {
  readonly schemaVersion: 1;
  readonly programId: string;
  readonly packageVersion: string;
  /** Versioned SillyOS Program harness contract required by this package. */
  readonly harnessCompatibility: string;
  /** Named fixed execution profile selected from capabilities supplied by the Host. */
  readonly runtimeProfile: string;
  readonly name: string;
  readonly summary: string;
  readonly instructionsPath: string;
  /**
   * Optional ordered compatibility prompts selected from the resolved model id.
   * Matching is case-insensitive. Only `*` is interpreted by the fixed harness;
   * every other pattern character is literal.
   * Missing and an explicit empty array are the same admitted package contract.
   */
  readonly modelPromptOverlays?: readonly ProgramModelPromptOverlayV1[];
  /**
   * Optional soft preference order over resolved model-id patterns.
   * Patterns use the same full-id, `*`-only matching contract as prompt overlays.
   * Availability and final model selection remain SillyOS-owned runtime concerns.
   * Missing and an explicit empty array are the same admitted package contract.
   */
  readonly recommendedModelPatterns?: readonly string[];
  readonly settingsSchemaPath: string | null;
  /** Complete package defaults. Missing or invalid user overrides fall back to this document. */
  readonly settingsDefaultsPath: string | null;
  readonly initialUiPath: string | null;
  readonly scripts: readonly ProgramPackageScriptV1[];
  readonly capabilityIds: readonly string[];
}

export interface ProgramPackageArchiveFileV1 {
  readonly path: string;
  readonly mediaType: string;
  readonly bytes: ArrayBuffer;
}

/**
 * Structured-clone-safe package-source payload before repository admission.
 * Bundled and ZIP acquisition must produce this same input shape.
 */
export interface UnadmittedProgramPackageArchiveV1 {
  readonly manifest: unknown;
  readonly files: readonly ProgramPackageArchiveFileV1[];
}

export interface ProgramPackageArchiveV1 extends UnadmittedProgramPackageArchiveV1 {
  readonly manifest: ProgramPackageManifestV1;
}

/**
 * Process compatibility binding. Compatible Program fixes keep
 * `packageVersion` unchanged; an incompatible Process contract uses a new
 * value. Package bytes are deliberately not part of this identity.
 */
export interface InstalledProgramPackageReferenceV1 {
  readonly programId: string;
  readonly packageVersion: string;
}

export interface AdmittedProgramPackageArchiveV1 extends ProgramPackageArchiveV1 {
  readonly reference: InstalledProgramPackageReferenceV1;
}

/** Reads one admitted package file as UTF-8 without inventing fallback content. */
export function readProgramPackageTextFileV1(
  archive: Pick<AdmittedProgramPackageArchiveV1, "files">,
  path: string,
): string | null {
  const file = archive.files.find((candidate) => candidate.path === path);
  if (file === undefined) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(file.bytes);
  } catch {
    return null;
  }
}

export type ProgramPackageAdmissionFailureCodeV1 =
  | "archive_invalid"
  | "budget_invalid"
  | "duplicate_path"
  | "file_too_large"
  | "manifest_invalid"
  | "manifest_too_large"
  | "package_too_large"
  | "path_invalid"
  | "referenced_file_missing"
  | "referenced_text_invalid"
  | "too_many_files";

export class ProgramPackageAdmissionErrorV1 extends Error {
  constructor(
    readonly code: ProgramPackageAdmissionFailureCodeV1,
    readonly path: string | null = null,
  ) {
    super(
      path === null ? `sillyos.program_package.${code}` : `sillyos.program_package.${code}:${path}`,
    );
    this.name = "ProgramPackageAdmissionErrorV1";
  }
}

const textEncoderV1 = new TextEncoder();
const exactProgramIdPatternV1 = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
const exactCapabilityIdPatternV1 = /^[a-z0-9]+(?:[.:_/-][a-z0-9]+)*$/u;
const exactMediaTypePatternV1 = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u;

function exactKeysV1(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  return Object.keys(value).toSorted().join("\0") === expected.toSorted().join("\0");
}

function positiveSafeIntegerV1(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function compareCodeUnitsV1(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function admitLimitsV1(value: ProgramPackageAdmissionLimitsV1): ProgramPackageAdmissionLimitsV1 {
  if (
    value === null || typeof value !== "object" ||
    !positiveSafeIntegerV1(value.maximumManifestBytes) ||
    !positiveSafeIntegerV1(value.maximumFiles) ||
    !positiveSafeIntegerV1(value.maximumPathBytes) ||
    !positiveSafeIntegerV1(value.maximumFileBytes) ||
    !positiveSafeIntegerV1(value.maximumPackageBytes) ||
    value.maximumManifestBytes > value.maximumPackageBytes ||
    value.maximumFileBytes > value.maximumPackageBytes
  ) throw new ProgramPackageAdmissionErrorV1("budget_invalid");
  return { ...value };
}

function nonEmptyTrimmedTextV1(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

function containsControlCharacterV1(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || codeUnit === 0x7f) return true;
  }
  return false;
}

function exactPackagePathV1(
  value: unknown,
  limits: ProgramPackageAdmissionLimitsV1,
): string {
  if (
    !nonEmptyTrimmedTextV1(value) ||
    textEncoderV1.encode(value).byteLength > limits.maximumPathBytes ||
    value.startsWith("/") ||
    value.endsWith("/") ||
    value.includes("\\") ||
    value.includes("\0") ||
    containsControlCharacterV1(value)
  ) {
    throw new ProgramPackageAdmissionErrorV1(
      "path_invalid",
      typeof value === "string" ? value : null,
    );
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new ProgramPackageAdmissionErrorV1("path_invalid", value);
  }
  return value;
}

function cloneBytesV1(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (value instanceof Uint8Array) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
  }
  throw new ProgramPackageAdmissionErrorV1("archive_invalid");
}

function admitScriptV1(
  value: unknown,
  limits: ProgramPackageAdmissionLimitsV1,
): ProgramPackageScriptV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProgramPackageAdmissionErrorV1("manifest_invalid");
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (
    !exactKeysV1(record, ["path", "runtime"]) ||
    (record.runtime !== "quickjs" && record.runtime !== "python")
  ) throw new ProgramPackageAdmissionErrorV1("manifest_invalid");
  return {
    path: exactPackagePathV1(record.path, limits),
    runtime: record.runtime,
  };
}

function admitModelPromptOverlayV1(
  value: unknown,
  limits: ProgramPackageAdmissionLimitsV1,
): ProgramModelPromptOverlayV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProgramPackageAdmissionErrorV1("manifest_invalid");
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (
    !exactKeysV1(record, ["modelPattern", "path"])
  ) throw new ProgramPackageAdmissionErrorV1("manifest_invalid");
  return {
    modelPattern: admitModelPatternV1(record.modelPattern),
    path: exactPackagePathV1(record.path, limits),
  };
}

function admitModelPatternV1(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProgramPackageAdmissionErrorV1("manifest_invalid");
  }
  return value;
}

function admitManifestV1(
  value: unknown,
  limits: ProgramPackageAdmissionLimitsV1,
): ProgramPackageManifestV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProgramPackageAdmissionErrorV1("manifest_invalid");
  }
  const record = value as Readonly<Record<string, unknown>>;
  const manifestKeysV1 = [
    "capabilityIds",
    "initialUiPath",
    "instructionsPath",
    "harnessCompatibility",
    "name",
    "packageVersion",
    "programId",
    "runtimeProfile",
    "schemaVersion",
    "scripts",
    "settingsDefaultsPath",
    "settingsSchemaPath",
    "summary",
  ] as const;
  const hasModelPromptOverlays = Object.hasOwn(record, "modelPromptOverlays");
  const hasRecommendedModelPatterns = Object.hasOwn(record, "recommendedModelPatterns");
  const optionalManifestKeysV1 = [
    ...(hasModelPromptOverlays ? ["modelPromptOverlays"] : []),
    ...(hasRecommendedModelPatterns ? ["recommendedModelPatterns"] : []),
  ];
  if (
    !exactKeysV1(
      record,
      [...manifestKeysV1, ...optionalManifestKeysV1],
    ) ||
    record.schemaVersion !== programPackageArchiveSchemaVersionV1 ||
    !nonEmptyTrimmedTextV1(record.programId) ||
    !exactProgramIdPatternV1.test(record.programId) ||
    !nonEmptyTrimmedTextV1(record.packageVersion) ||
    !nonEmptyTrimmedTextV1(record.harnessCompatibility) ||
    !exactCapabilityIdPatternV1.test(record.harnessCompatibility) ||
    !nonEmptyTrimmedTextV1(record.runtimeProfile) ||
    !exactCapabilityIdPatternV1.test(record.runtimeProfile) ||
    !nonEmptyTrimmedTextV1(record.name) ||
    typeof record.summary !== "string" || record.summary.trim() !== record.summary ||
    !Array.isArray(record.scripts) || !Array.isArray(record.capabilityIds) ||
    (hasModelPromptOverlays && !Array.isArray(record.modelPromptOverlays)) ||
    (hasRecommendedModelPatterns && !Array.isArray(record.recommendedModelPatterns))
  ) throw new ProgramPackageAdmissionErrorV1("manifest_invalid");

  const scripts = record.scripts.map((script) => admitScriptV1(script, limits));
  if (new Set(scripts.map((script) => script.path)).size !== scripts.length) {
    throw new ProgramPackageAdmissionErrorV1("manifest_invalid");
  }
  const capabilityIds = record.capabilityIds.map((capabilityId) => {
    if (
      !nonEmptyTrimmedTextV1(capabilityId) ||
      !exactCapabilityIdPatternV1.test(capabilityId)
    ) throw new ProgramPackageAdmissionErrorV1("manifest_invalid");
    return capabilityId;
  });
  if (new Set(capabilityIds).size !== capabilityIds.length) {
    throw new ProgramPackageAdmissionErrorV1("manifest_invalid");
  }
  const modelPromptOverlays = hasModelPromptOverlays
    ? (record.modelPromptOverlays as readonly unknown[]).map((overlay) =>
      admitModelPromptOverlayV1(overlay, limits)
    )
    : [];
  const recommendedModelPatterns = hasRecommendedModelPatterns
    ? (record.recommendedModelPatterns as readonly unknown[]).map(admitModelPatternV1)
    : [];

  const nullablePathV1 = (path: unknown): string | null =>
    path === null ? null : exactPackagePathV1(path, limits);
  return {
    schemaVersion: 1,
    programId: record.programId,
    packageVersion: record.packageVersion,
    harnessCompatibility: record.harnessCompatibility,
    runtimeProfile: record.runtimeProfile,
    name: record.name,
    summary: record.summary,
    instructionsPath: exactPackagePathV1(record.instructionsPath, limits),
    ...(modelPromptOverlays.length === 0 ? {} : { modelPromptOverlays }),
    ...(recommendedModelPatterns.length === 0 ? {} : { recommendedModelPatterns }),
    settingsSchemaPath: nullablePathV1(record.settingsSchemaPath),
    settingsDefaultsPath: nullablePathV1(record.settingsDefaultsPath),
    initialUiPath: nullablePathV1(record.initialUiPath),
    scripts,
    capabilityIds: capabilityIds.toSorted(),
  };
}

function canonicalManifestBytesV1(manifest: ProgramPackageManifestV1): Uint8Array {
  return textEncoderV1.encode(JSON.stringify(manifest));
}

function referencedPathsV1(manifest: ProgramPackageManifestV1): readonly string[] {
  return [
    manifest.instructionsPath,
    ...(manifest.settingsSchemaPath === null ? [] : [manifest.settingsSchemaPath]),
    ...(manifest.settingsDefaultsPath === null ? [] : [manifest.settingsDefaultsPath]),
    ...(manifest.initialUiPath === null ? [] : [manifest.initialUiPath]),
    ...manifest.scripts.map((script) => script.path),
    ...(manifest.modelPromptOverlays ?? []).map((overlay) => overlay.path),
  ];
}

export interface AdmitProgramPackageArchiveOptionsV1 {
  readonly limits: ProgramPackageAdmissionLimitsV1;
}

/** Admits only the immutable manifest projection without loading package file bodies. */
export function admitProgramPackageManifestV1(
  value: unknown,
  limitsValue: ProgramPackageAdmissionLimitsV1,
): ProgramPackageManifestV1 {
  const limits = admitLimitsV1(limitsValue);
  const manifest = admitManifestV1(value, limits);
  if (canonicalManifestBytesV1(manifest).byteLength > limits.maximumManifestBytes) {
    throw new ProgramPackageAdmissionErrorV1("manifest_too_large");
  }
  return manifest;
}

export async function admitProgramPackageArchiveV1(
  value: unknown,
  options: AdmitProgramPackageArchiveOptionsV1,
): Promise<AdmittedProgramPackageArchiveV1> {
  const limits = admitLimitsV1(options.limits);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProgramPackageAdmissionErrorV1("archive_invalid");
  }
  const archive = value as Readonly<Record<string, unknown>>;
  if (!exactKeysV1(archive, ["files", "manifest"]) || !Array.isArray(archive.files)) {
    throw new ProgramPackageAdmissionErrorV1("archive_invalid");
  }
  if (archive.files.length > limits.maximumFiles) {
    throw new ProgramPackageAdmissionErrorV1("too_many_files");
  }

  const manifest = admitProgramPackageManifestV1(archive.manifest, limits);
  const manifestBytes = canonicalManifestBytesV1(manifest);

  const files = archive.files.map((entryValue): ProgramPackageArchiveFileV1 => {
    if (entryValue === null || typeof entryValue !== "object" || Array.isArray(entryValue)) {
      throw new ProgramPackageAdmissionErrorV1("archive_invalid");
    }
    const file = entryValue as Readonly<Record<string, unknown>>;
    if (
      !exactKeysV1(file, ["bytes", "mediaType", "path"]) ||
      typeof file.mediaType !== "string" ||
      !exactMediaTypePatternV1.test(file.mediaType)
    ) throw new ProgramPackageAdmissionErrorV1("archive_invalid");
    const path = exactPackagePathV1(file.path, limits);
    const bytes = cloneBytesV1(file.bytes);
    if (bytes.byteLength > limits.maximumFileBytes) {
      throw new ProgramPackageAdmissionErrorV1("file_too_large", path);
    }
    return { path, mediaType: file.mediaType, bytes };
  }).toSorted((left, right) => compareCodeUnitsV1(left.path, right.path));

  const filePaths = new Set<string>();
  for (const file of files) {
    if (filePaths.has(file.path)) {
      throw new ProgramPackageAdmissionErrorV1("duplicate_path", file.path);
    }
    filePaths.add(file.path);
  }
  for (const path of referencedPathsV1(manifest)) {
    if (!filePaths.has(path)) {
      throw new ProgramPackageAdmissionErrorV1("referenced_file_missing", path);
    }
  }
  for (const overlay of manifest.modelPromptOverlays ?? []) {
    if (readProgramPackageTextFileV1({ files }, overlay.path) === null) {
      throw new ProgramPackageAdmissionErrorV1("referenced_text_invalid", overlay.path);
    }
  }

  const byteLength = files.reduce(
    (total, file) =>
      total + textEncoderV1.encode(file.path).byteLength +
      textEncoderV1.encode(file.mediaType).byteLength + file.bytes.byteLength,
    manifestBytes.byteLength,
  );
  if (!Number.isSafeInteger(byteLength) || byteLength > limits.maximumPackageBytes) {
    throw new ProgramPackageAdmissionErrorV1("package_too_large");
  }

  return {
    manifest,
    files,
    reference: {
      programId: manifest.programId,
      packageVersion: manifest.packageVersion,
    },
  };
}

export function admitInstalledProgramPackageReferenceV1(
  value: unknown,
): InstalledProgramPackageReferenceV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProgramPackageAdmissionErrorV1("archive_invalid");
  }
  const reference = value as Readonly<Record<string, unknown>>;
  if (
    !exactKeysV1(reference, ["packageVersion", "programId"]) ||
    !nonEmptyTrimmedTextV1(reference.programId) ||
    !exactProgramIdPatternV1.test(reference.programId) ||
    !nonEmptyTrimmedTextV1(reference.packageVersion)
  ) throw new ProgramPackageAdmissionErrorV1("archive_invalid");
  return {
    programId: reference.programId,
    packageVersion: reference.packageVersion,
  };
}

export function admitProgramPackageProgramIdV1(value: unknown): string {
  if (
    !nonEmptyTrimmedTextV1(value) ||
    !exactProgramIdPatternV1.test(value)
  ) throw new ProgramPackageAdmissionErrorV1("archive_invalid");
  return value;
}

export function cloneProgramPackageArchiveV1(
  value: ProgramPackageArchiveV1,
): ProgramPackageArchiveV1 {
  return {
    manifest: {
      ...value.manifest,
      ...(value.manifest.modelPromptOverlays === undefined ? {} : {
        modelPromptOverlays: value.manifest.modelPromptOverlays.map((overlay) => ({
          ...overlay,
        })),
      }),
      ...(value.manifest.recommendedModelPatterns === undefined
        ? {}
        : { recommendedModelPatterns: [...value.manifest.recommendedModelPatterns] }),
      scripts: value.manifest.scripts.map((script) => ({ ...script })),
      capabilityIds: [...value.manifest.capabilityIds],
    },
    files: value.files.map((file) => ({
      path: file.path,
      mediaType: file.mediaType,
      bytes: file.bytes.slice(0),
    })),
  };
}

export function cloneProgramPackageManifestV1(
  value: ProgramPackageManifestV1,
): ProgramPackageManifestV1 {
  return {
    ...value,
    ...(value.modelPromptOverlays === undefined
      ? {}
      : { modelPromptOverlays: value.modelPromptOverlays.map((overlay) => ({ ...overlay })) }),
    ...(value.recommendedModelPatterns === undefined
      ? {}
      : { recommendedModelPatterns: [...value.recommendedModelPatterns] }),
    scripts: value.scripts.map((script) => ({ ...script })),
    capabilityIds: [...value.capabilityIds],
  };
}

export function cloneInstalledProgramPackageReferenceV1(
  value: InstalledProgramPackageReferenceV1,
): InstalledProgramPackageReferenceV1 {
  return { ...value };
}
