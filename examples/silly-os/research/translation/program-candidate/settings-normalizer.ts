// SPDX-License-Identifier: MIT

export type TranslationReviewPolicyV1 = "every_batch" | "flagged_batches" | "final_only";
export type TranslationPdfOcrPolicyV1 = "off" | "when_no_text";
export type TranslationPdfOutputV1 =
  | "translation_json"
  | "translated_markdown"
  | "bilingual_markdown";

/** Opaque selection identity only; Provider credentials remain SillyOS-owned. */
export type TranslationModelSelectionReferenceV1 = string;

export interface TranslationProgramSettingsV1 {
  readonly targetLocale: string;
  readonly defaultStyle: string;
  readonly reviewPolicy: TranslationReviewPolicyV1;
  readonly modelRoles: {
    readonly translate: TranslationModelSelectionReferenceV1 | null;
    readonly review: TranslationModelSelectionReferenceV1 | null;
    readonly ocr: TranslationModelSelectionReferenceV1 | null;
  };
  readonly pdf: {
    readonly ocr: TranslationPdfOcrPolicyV1;
    readonly output: TranslationPdfOutputV1;
  };
}

export interface TranslationProgramSettingsDiagnosticV1 {
  readonly source: "program_defaults" | "process_override";
  readonly code: "invalid_json" | "invalid_document";
  readonly path: string;
}

export interface TranslationProgramAttemptSettingsV1 {
  /** Independent settings snapshot captured for exactly one attempt. */
  readonly effective: TranslationProgramSettingsV1;
  readonly effectiveSource: "built_in_defaults" | "program_defaults" | "process_override";
  readonly diagnostics: readonly TranslationProgramSettingsDiagnosticV1[];
  /** Present only when the complete Process override is safe to persist. */
  readonly admittedProcessOverrideJson: string | null;
}

const builtInDefaultsV1: TranslationProgramSettingsV1 = {
  targetLocale: "en",
  defaultStyle: "Natural target-language prose that preserves source meaning and voice.",
  reviewPolicy: "every_batch",
  modelRoles: {
    translate: null,
    review: null,
    ocr: null,
  },
  pdf: {
    ocr: "off",
    output: "bilingual_markdown",
  },
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

function modelSelectionReferenceV1(
  value: unknown,
): TranslationModelSelectionReferenceV1 | null | undefined {
  if (value === null) return null;
  return nonEmptyTrimmedTextV1(value) ? value : undefined;
}

function cloneSettingsV1(value: TranslationProgramSettingsV1): TranslationProgramSettingsV1 {
  return {
    targetLocale: value.targetLocale,
    defaultStyle: value.defaultStyle,
    reviewPolicy: value.reviewPolicy,
    modelRoles: {
      translate: value.modelRoles.translate,
      review: value.modelRoles.review,
      ocr: value.modelRoles.ocr,
    },
    pdf: {
      ocr: value.pdf.ocr,
      output: value.pdf.output,
    },
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
  readonly path: string;
  readonly source: SettingsSourceV1;
  readonly diagnostics: TranslationProgramSettingsDiagnosticV1[];
}): void {
  for (const key of Object.keys(input.value)) {
    if (!input.knownKeys.has(key)) {
      input.diagnostics.push(
        diagnosticV1(input.source, "invalid_document", `${input.path}/${pointerSegmentV1(key)}`),
      );
    }
  }
}

function fieldValueV1<T>(input: {
  readonly value: DataRecordV1;
  readonly key: string;
  readonly fallback: T;
  readonly validate: (value: unknown) => value is T;
  readonly path: string;
  readonly source: SettingsSourceV1;
  readonly diagnostics: TranslationProgramSettingsDiagnosticV1[];
}): { readonly value: T; readonly accepted: boolean } {
  const candidate = input.value[input.key];
  if (!Object.hasOwn(input.value, input.key) || !input.validate(candidate)) {
    input.diagnostics.push(diagnosticV1(input.source, "invalid_document", input.path));
    return { value: input.fallback, accepted: false };
  }
  return { value: candidate, accepted: true };
}

function reviewPolicyV1(value: unknown): value is TranslationReviewPolicyV1 {
  return value === "every_batch" || value === "flagged_batches" || value === "final_only";
}

function modelReferenceV1(
  value: unknown,
): value is TranslationModelSelectionReferenceV1 | null {
  return modelSelectionReferenceV1(value) !== undefined;
}

function pdfOcrPolicyV1(value: unknown): value is TranslationPdfOcrPolicyV1 {
  return value === "off" || value === "when_no_text";
}

function pdfOutputV1(value: unknown): value is TranslationPdfOutputV1 {
  return value === "translation_json" || value === "translated_markdown" ||
    value === "bilingual_markdown";
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

  const targetLocale = fieldValueV1({
    value: input.value,
    key: "targetLocale",
    fallback: input.fallback.targetLocale,
    validate: nonEmptyTrimmedTextV1,
    path: "/targetLocale",
    source: input.source,
    diagnostics,
  });
  const defaultStyle = fieldValueV1({
    value: input.value,
    key: "defaultStyle",
    fallback: input.fallback.defaultStyle,
    validate: nonEmptyTrimmedTextV1,
    path: "/defaultStyle",
    source: input.source,
    diagnostics,
  });
  const reviewPolicy = fieldValueV1({
    value: input.value,
    key: "reviewPolicy",
    fallback: input.fallback.reviewPolicy,
    validate: reviewPolicyV1,
    path: "/reviewPolicy",
    source: input.source,
    diagnostics,
  });

  let translate = { value: input.fallback.modelRoles.translate, accepted: false };
  let review = { value: input.fallback.modelRoles.review, accepted: false };
  let ocr = { value: input.fallback.modelRoles.ocr, accepted: false };
  if (isRecordV1(input.value.modelRoles)) {
    translate = fieldValueV1({
      value: input.value.modelRoles,
      key: "translate",
      fallback: input.fallback.modelRoles.translate,
      validate: modelReferenceV1,
      path: "/modelRoles/translate",
      source: input.source,
      diagnostics,
    });
    review = fieldValueV1({
      value: input.value.modelRoles,
      key: "review",
      fallback: input.fallback.modelRoles.review,
      validate: modelReferenceV1,
      path: "/modelRoles/review",
      source: input.source,
      diagnostics,
    });
    ocr = fieldValueV1({
      value: input.value.modelRoles,
      key: "ocr",
      fallback: input.fallback.modelRoles.ocr,
      validate: modelReferenceV1,
      path: "/modelRoles/ocr",
      source: input.source,
      diagnostics,
    });
    appendUnknownFieldDiagnosticsV1({
      value: input.value.modelRoles,
      knownKeys: new Set(["translate", "review", "ocr"]),
      path: "/modelRoles",
      source: input.source,
      diagnostics,
    });
  } else {
    diagnostics.push(diagnosticV1(input.source, "invalid_document", "/modelRoles"));
  }

  let pdfOcr = { value: input.fallback.pdf.ocr, accepted: false };
  let pdfOutput = { value: input.fallback.pdf.output, accepted: false };
  if (isRecordV1(input.value.pdf)) {
    pdfOcr = fieldValueV1({
      value: input.value.pdf,
      key: "ocr",
      fallback: input.fallback.pdf.ocr,
      validate: pdfOcrPolicyV1,
      path: "/pdf/ocr",
      source: input.source,
      diagnostics,
    });
    pdfOutput = fieldValueV1({
      value: input.value.pdf,
      key: "output",
      fallback: input.fallback.pdf.output,
      validate: pdfOutputV1,
      path: "/pdf/output",
      source: input.source,
      diagnostics,
    });
    appendUnknownFieldDiagnosticsV1({
      value: input.value.pdf,
      knownKeys: new Set(["ocr", "output"]),
      path: "/pdf",
      source: input.source,
      diagnostics,
    });
  } else {
    diagnostics.push(diagnosticV1(input.source, "invalid_document", "/pdf"));
  }

  appendUnknownFieldDiagnosticsV1({
    value: input.value,
    knownKeys: new Set(["targetLocale", "defaultStyle", "reviewPolicy", "modelRoles", "pdf"]),
    path: "",
    source: input.source,
    diagnostics,
  });

  const settings = cloneSettingsV1({
    targetLocale: targetLocale.value,
    defaultStyle: defaultStyle.value,
    reviewPolicy: reviewPolicy.value,
    modelRoles: {
      translate: translate.value,
      review: review.value,
      ocr: ocr.value,
    },
    pdf: {
      ocr: pdfOcr.value,
      output: pdfOutput.value,
    },
  });
  const usedCandidateValue = targetLocale.accepted || defaultStyle.accepted ||
    reviewPolicy.accepted || translate.accepted || review.accepted || ocr.accepted ||
    pdfOcr.accepted || pdfOutput.accepted;
  return {
    settings,
    diagnostics,
    usedCandidateValue,
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
 * Resolve one attempt snapshot without persistence or Provider admission.
 * Persisted Process settings are complete documents, never merge patches.
 * For one attempt only, valid fields in a partial draft are interpreted while
 * missing or invalid fields fall back. A draft with any diagnostic is never a
 * persistence candidate.
 */
export function resolveTranslationProgramAttemptSettingsV1(input: {
  readonly programDefaultsJson?: string | null;
  readonly processOverrideJson?: string | null;
}): TranslationProgramAttemptSettingsV1 {
  const diagnostics: TranslationProgramSettingsDiagnosticV1[] = [];
  let programDefaults = cloneSettingsV1(builtInDefaultsV1);
  let programDefaultsSource: TranslationProgramAttemptSettingsV1["effectiveSource"] =
    "built_in_defaults";
  if (input.programDefaultsJson !== undefined && input.programDefaultsJson !== null) {
    const parsed = parseSettingsDocumentV1({
      source: "program_defaults",
      json: input.programDefaultsJson,
      fallback: builtInDefaultsV1,
    });
    programDefaults = parsed.settings;
    diagnostics.push(...parsed.diagnostics);
    if (parsed.usedCandidateValue) {
      programDefaultsSource = "program_defaults";
    }
  }

  let effective = programDefaults;
  let effectiveSource: TranslationProgramAttemptSettingsV1["effectiveSource"] =
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
    if (parsed.usedCandidateValue) {
      effectiveSource = "process_override";
    }
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
