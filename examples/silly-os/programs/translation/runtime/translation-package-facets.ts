// SPDX-License-Identifier: MIT

import {
  type AdmittedProgramPackageArchiveV1,
  readProgramPackageTextFileV1,
} from "../../../src/program-platform/package/program-package-archive.ts";
import {
  resolveTranslationProgramSettingsV1,
  type TranslationProgramSettingsResolutionV1,
} from "./translation-program-settings.ts";

export interface TranslationInitialUiCopyV1 {
  readonly title: string;
  readonly description: string;
  readonly dropLabel: string;
  readonly formatNote: string;
  readonly chooseFileLabel: string;
}

export interface TranslationInitialUiV1 {
  readonly schemaVersion: 1;
  readonly surface: "translation.intake.v1";
  readonly locales: Readonly<Partial<Record<"en" | "zh-CN", TranslationInitialUiCopyV1>>>;
}

export interface TranslationProgramPackageFacetsV1 {
  readonly initialUi: TranslationInitialUiV1 | null;
  /** Exact package-owned defaults used to resolve each Process override. */
  readonly settingsDefaultsJson: string | null;
  readonly settings: TranslationProgramSettingsResolutionV1;
}

function recordV1(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function exactKeysV1(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  return Object.keys(value).toSorted().join("\0") === expected.toSorted().join("\0");
}

function trimmedTextV1(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.trim() === value ? value : null;
}

function admitCopyV1(value: unknown): TranslationInitialUiCopyV1 | null {
  const candidate = recordV1(value);
  if (
    candidate === null ||
    !exactKeysV1(candidate, [
      "chooseFileLabel",
      "description",
      "dropLabel",
      "formatNote",
      "title",
    ])
  ) return null;
  const title = trimmedTextV1(candidate.title);
  const description = trimmedTextV1(candidate.description);
  const dropLabel = trimmedTextV1(candidate.dropLabel);
  const formatNote = trimmedTextV1(candidate.formatNote);
  const chooseFileLabel = trimmedTextV1(candidate.chooseFileLabel);
  return title === null || description === null || dropLabel === null || formatNote === null ||
      chooseFileLabel === null
    ? null
    : { title, description, dropLabel, formatNote, chooseFileLabel };
}

export function admitTranslationInitialUiV1(value: unknown): TranslationInitialUiV1 | null {
  const candidate = recordV1(value);
  if (
    candidate === null || !exactKeysV1(candidate, ["locales", "schemaVersion", "surface"]) ||
    candidate.schemaVersion !== 1 || candidate.surface !== "translation.intake.v1"
  ) return null;
  const locales = recordV1(candidate.locales);
  if (
    locales === null ||
    !Object.keys(locales).every((locale) => locale === "en" || locale === "zh-CN")
  ) {
    return null;
  }
  const en = Object.hasOwn(locales, "en") ? admitCopyV1(locales.en) : null;
  const zhCn = Object.hasOwn(locales, "zh-CN") ? admitCopyV1(locales["zh-CN"]) : null;
  if (
    (Object.hasOwn(locales, "en") && en === null) ||
    (Object.hasOwn(locales, "zh-CN") && zhCn === null) ||
    (en === null && zhCn === null)
  ) return null;
  return {
    schemaVersion: 1,
    surface: "translation.intake.v1",
    locales: {
      ...(en === null ? {} : { en }),
      ...(zhCn === null ? {} : { "zh-CN": zhCn }),
    },
  };
}

function readJsonV1(
  archive: AdmittedProgramPackageArchiveV1,
  path: string | null,
): unknown {
  if (path === null) return null;
  const text = readProgramPackageTextFileV1(archive, path);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Interprets package-owned data at the Translation profile boundary. Invalid
 * optional UI falls back to the Host surface; invalid settings fall back field
 * by field and remain diagnostics rather than blocking the Process.
 */
export function resolveTranslationProgramPackageFacetsV1(
  archive: AdmittedProgramPackageArchiveV1,
): TranslationProgramPackageFacetsV1 {
  const defaultsPath = archive.manifest.settingsDefaultsPath;
  const defaults = defaultsPath === null
    ? null
    : readProgramPackageTextFileV1(archive, defaultsPath);
  return {
    initialUi: admitTranslationInitialUiV1(
      readJsonV1(archive, archive.manifest.initialUiPath),
    ),
    settingsDefaultsJson: defaults,
    settings: resolveTranslationProgramSettingsV1({
      programDefaultsJson: defaults,
    }),
  };
}
