// SPDX-License-Identifier: MIT

import { canonicalizeTranslationTargetLocaleV1 } from "./translation-target-language.ts";

export interface TranslationProgramSettingsV1 {
  readonly targetLocale: string;
  readonly defaultStyle: string;
}

export interface TranslationProgramSettingsDiagnosticV1 {
  readonly source: "program_defaults" | "process_override";
  readonly code: "invalid_json" | "invalid_document";
  readonly path: string;
}

export interface TranslationProgramSettingsResolutionV1 {
  /** Independent resolved values consumed when a Process imports its source. */
  readonly effective: TranslationProgramSettingsV1;
  readonly effectiveSource: "built_in_defaults" | "program_defaults" | "process_override";
  readonly diagnostics: readonly TranslationProgramSettingsDiagnosticV1[];
  /** Present only when the complete Process override is safe to persist. */
  readonly admittedProcessOverrideJson: string | null;
}

const builtInDefaultsV1: TranslationProgramSettingsV1 = {
  targetLocale: "en",
  defaultStyle: "Natural target-language prose that preserves source meaning and voice.",
};

type DataRecordV1 = Readonly<Record<string, unknown>>;
type SettingsSourceV1 = TranslationProgramSettingsDiagnosticV1["source"];

interface InterpretedSettingsDocumentV1 {
  readonly settings: TranslationProgramSettingsV1;
  readonly diagnostics: readonly TranslationProgramSettingsDiagnosticV1[];
  readonly usedCandidateValue: boolean;
  readonly canonicalJson: string | null;
}

function isRecordV1(value: unknown): value is DataRecordV1 {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyTrimmedTextV1(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function cloneSettingsV1(value: TranslationProgramSettingsV1): TranslationProgramSettingsV1 {
  return {
    targetLocale: value.targetLocale,
    defaultStyle: value.defaultStyle,
  };
}

function diagnosticV1(
  source: SettingsSourceV1,
  code: TranslationProgramSettingsDiagnosticV1["code"],
  path: string,
): TranslationProgramSettingsDiagnosticV1 {
  return { source, code, path };
}

function pointerSegmentV1(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function appendUnknownFieldDiagnosticsV1(input: {
  readonly value: DataRecordV1;
  readonly knownKeys: ReadonlySet<string>;
  readonly source: SettingsSourceV1;
  readonly diagnostics: TranslationProgramSettingsDiagnosticV1[];
}): void {
  for (const key of Object.keys(input.value)) {
    if (!input.knownKeys.has(key)) {
      input.diagnostics.push(
        diagnosticV1(input.source, "invalid_document", `/${pointerSegmentV1(key)}`),
      );
    }
  }
}

function fieldValueV1(input: {
  readonly value: DataRecordV1;
  readonly key: keyof TranslationProgramSettingsV1;
  readonly fallback: string;
  readonly path: string;
  readonly source: SettingsSourceV1;
  readonly diagnostics: TranslationProgramSettingsDiagnosticV1[];
}): { readonly value: string; readonly accepted: boolean } {
  const candidate = input.value[input.key];
  if (!Object.hasOwn(input.value, input.key) || !nonEmptyTrimmedTextV1(candidate)) {
    input.diagnostics.push(diagnosticV1(input.source, "invalid_document", input.path));
    return { value: input.fallback, accepted: false };
  }
  return { value: candidate, accepted: true };
}

function targetLocaleFieldValueV1(input: {
  readonly value: DataRecordV1;
  readonly fallback: string;
  readonly source: SettingsSourceV1;
  readonly diagnostics: TranslationProgramSettingsDiagnosticV1[];
}): { readonly value: string; readonly accepted: boolean } {
  const canonical = canonicalizeTranslationTargetLocaleV1(input.value.targetLocale);
  if (!Object.hasOwn(input.value, "targetLocale") || canonical === null) {
    input.diagnostics.push(
      diagnosticV1(input.source, "invalid_document", "/targetLocale"),
    );
    return { value: input.fallback, accepted: false };
  }
  return { value: canonical, accepted: true };
}

function interpretSettingsValueV1(input: {
  readonly source: SettingsSourceV1;
  readonly value: unknown;
  readonly fallback: TranslationProgramSettingsV1;
}): InterpretedSettingsDocumentV1 {
  const diagnostics: TranslationProgramSettingsDiagnosticV1[] = [];
  if (!isRecordV1(input.value)) {
    return {
      settings: cloneSettingsV1(input.fallback),
      diagnostics: [diagnosticV1(input.source, "invalid_document", "/")],
      usedCandidateValue: false,
      canonicalJson: null,
    };
  }

  const targetLocale = targetLocaleFieldValueV1({
    value: input.value,
    fallback: input.fallback.targetLocale,
    source: input.source,
    diagnostics,
  });
  const defaultStyle = fieldValueV1({
    value: input.value,
    key: "defaultStyle",
    fallback: input.fallback.defaultStyle,
    path: "/defaultStyle",
    source: input.source,
    diagnostics,
  });
  appendUnknownFieldDiagnosticsV1({
    value: input.value,
    knownKeys: new Set(["targetLocale", "defaultStyle"]),
    source: input.source,
    diagnostics,
  });

  const settings = cloneSettingsV1({
    targetLocale: targetLocale.value,
    defaultStyle: defaultStyle.value,
  });
  return {
    settings,
    diagnostics,
    usedCandidateValue: targetLocale.accepted || defaultStyle.accepted,
    canonicalJson: diagnostics.length === 0 ? JSON.stringify(settings) : null,
  };
}

function parseSettingsDocumentV1(input: {
  readonly source: SettingsSourceV1;
  readonly json: string;
  readonly fallback: TranslationProgramSettingsV1;
}): InterpretedSettingsDocumentV1 {
  try {
    return interpretSettingsValueV1({
      source: input.source,
      value: JSON.parse(input.json),
      fallback: input.fallback,
    });
  } catch {
    return {
      settings: cloneSettingsV1(input.fallback),
      diagnostics: [diagnosticV1(input.source, "invalid_json", "/")],
      usedCandidateValue: false,
      canonicalJson: null,
    };
  }
}

/**
 * Resolve one independent settings projection without persistence. Persisted
 * Process settings are complete documents, never merge patches. A partial
 * draft may provide per-field preview values, but any diagnostic makes it
 * ineligible to persist.
 */
export function resolveTranslationProgramSettingsV1(input: {
  readonly programDefaultsJson?: string | null;
  readonly processOverrideJson?: string | null;
}): TranslationProgramSettingsResolutionV1 {
  const diagnostics: TranslationProgramSettingsDiagnosticV1[] = [];
  let programDefaults = cloneSettingsV1(builtInDefaultsV1);
  let programDefaultsSource: TranslationProgramSettingsResolutionV1["effectiveSource"] =
    "built_in_defaults";
  if (input.programDefaultsJson !== undefined && input.programDefaultsJson !== null) {
    const parsed = parseSettingsDocumentV1({
      source: "program_defaults",
      json: input.programDefaultsJson,
      fallback: builtInDefaultsV1,
    });
    programDefaults = parsed.settings;
    diagnostics.push(...parsed.diagnostics);
    if (parsed.usedCandidateValue) programDefaultsSource = "program_defaults";
  }

  let effective = programDefaults;
  let effectiveSource: TranslationProgramSettingsResolutionV1["effectiveSource"] =
    programDefaultsSource;
  let admittedProcessOverrideJson: string | null = null;
  if (input.processOverrideJson !== undefined && input.processOverrideJson !== null) {
    const parsed = parseSettingsDocumentV1({
      source: "process_override",
      json: input.processOverrideJson,
      fallback: programDefaults,
    });
    effective = parsed.settings;
    diagnostics.push(...parsed.diagnostics);
    if (parsed.usedCandidateValue) effectiveSource = "process_override";
    admittedProcessOverrideJson = parsed.canonicalJson;
  }

  return {
    effective: cloneSettingsV1(effective),
    effectiveSource,
    diagnostics: [...diagnostics],
    admittedProcessOverrideJson,
  };
}

export const translationProgramBuiltInSettingsV1 = cloneSettingsV1(builtInDefaultsV1);
