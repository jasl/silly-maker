// SPDX-License-Identifier: MIT

import {
  type AdmittedProgramPackageArchiveV1,
  readProgramPackageTextFileV1,
} from "../../../src/program-platform/package/program-package-archive.ts";
import {
  admitProgramOpenUiDocumentV1,
  type ProgramOpenUiAdmissionBudgetsV1,
  type ProgramOpenUiDocumentV1,
} from "../../../src/program-platform/ui/openui/program-openui-document.ts";
import type { ProgramUiLocalizationV1 } from "../../../src/program-platform/ui/program-ui-localization.ts";

export interface TranslationInitialUiCopyV1 {
  /** Package-authored guidance shown before a source has been imported. */
  readonly intakeDocument: ProgramOpenUiDocumentV1;
  /** Package-authored guidance and Agent intent shown for a prepared workset. */
  readonly workbenchDocument: ProgramOpenUiDocumentV1;
  readonly dropLabel: string;
  readonly formatNote: string;
  readonly chooseFileLabel: string;
  readonly sourceLanguageLabel: string;
  readonly targetLanguageLabel: string;
}

export interface TranslationInitialUiV1
  extends ProgramUiLocalizationV1<TranslationInitialUiCopyV1, "en" | "zh-CN"> {
  readonly schemaVersion: 3;
  readonly surface: "translation.workspace.v1";
}

interface TranslationProgramPackageFacetsV1 {
  readonly initialUi: TranslationInitialUiV1 | null;
  /** Package-owned defaults from the mounted current compatible implementation. */
  readonly settingsDefaultsJson: string | null;
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

function admitDocumentV1(value: unknown): ProgramOpenUiDocumentV1 | null {
  const candidate = recordV1(value);
  const source = candidate?.source;
  if (typeof source !== "string") return null;
  const sourceBytes = new TextEncoder().encode(source).byteLength;
  /*
   * The installed package archive already owns physical-capacity admission.
   * Derive the parser's recursion/count ceilings from this exact source rather
   * than imposing a second, arbitrary product quota on package-authored UI.
   * No valid tree can contain more nodes or nesting levels than source code
   * characters, and no visible string can exceed the complete source bytes.
   */
  const structuralCeiling = Math.max(1, source.length);
  const budgets = {
    maximumSourceBytes: Math.max(1, sourceBytes),
    maximumTextBytes: Math.max(1, sourceBytes),
    maximumNodes: structuralCeiling,
    maximumDepth: structuralCeiling,
  } as const satisfies ProgramOpenUiAdmissionBudgetsV1;
  const result = admitProgramOpenUiDocumentV1(value, budgets);
  return result.kind === "admitted" ? result.document : null;
}

function admitCopyV1(value: unknown): TranslationInitialUiCopyV1 | null {
  const candidate = recordV1(value);
  if (
    candidate === null ||
    !exactKeysV1(candidate, [
      "chooseFileLabel",
      "dropLabel",
      "formatNote",
      "intakeDocument",
      "sourceLanguageLabel",
      "targetLanguageLabel",
      "workbenchDocument",
    ])
  ) return null;
  const intakeDocument = admitDocumentV1(candidate.intakeDocument);
  const workbenchDocument = admitDocumentV1(candidate.workbenchDocument);
  const dropLabel = trimmedTextV1(candidate.dropLabel);
  const formatNote = trimmedTextV1(candidate.formatNote);
  const chooseFileLabel = trimmedTextV1(candidate.chooseFileLabel);
  const sourceLanguageLabel = trimmedTextV1(candidate.sourceLanguageLabel);
  const targetLanguageLabel = trimmedTextV1(candidate.targetLanguageLabel);
  return intakeDocument === null || workbenchDocument === null || dropLabel === null ||
      formatNote === null || chooseFileLabel === null || sourceLanguageLabel === null ||
      targetLanguageLabel === null
    ? null
    : {
      intakeDocument,
      workbenchDocument,
      dropLabel,
      formatNote,
      chooseFileLabel,
      sourceLanguageLabel,
      targetLanguageLabel,
    };
}

export function admitTranslationInitialUiV1(value: unknown): TranslationInitialUiV1 | null {
  const candidate = recordV1(value);
  if (
    candidate === null ||
    !exactKeysV1(candidate, ["defaultLocale", "locales", "schemaVersion", "surface"]) ||
    candidate.schemaVersion !== 3 || candidate.surface !== "translation.workspace.v1"
  ) return null;
  const defaultLocale = candidate.defaultLocale === "en" || candidate.defaultLocale === "zh-CN"
    ? candidate.defaultLocale
    : null;
  const locales = recordV1(candidate.locales);
  if (
    defaultLocale === null ||
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
    (defaultLocale === "en" ? en === null : zhCn === null)
  ) return null;
  return {
    schemaVersion: 3,
    surface: "translation.workspace.v1",
    defaultLocale,
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
  };
}
