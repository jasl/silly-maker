// SPDX-License-Identifier: MIT

import {
  prepareTranslationDocumentV1,
  type TranslationExportResultV1,
  type TranslationSourceUnitV1,
} from "./translation-document-codec.ts";
import {
  cloneTranslationWorksetUnitV1,
  type TranslationWorksetHeadV1,
  type TranslationWorksetUnitRecordV1,
} from "./translation-workset-repository.ts";

export interface TranslationProcessExportInputV1 {
  readonly workset: TranslationWorksetHeadV1;
  /** Exact, ordered durable rows for the workset revision being exported. */
  readonly rows: readonly TranslationWorksetUnitRecordV1[];
  /** Required for structural round-trip formats; PDF text export uses admitted rows only. */
  readonly sourceBytes: Uint8Array | null;
}

export interface TranslationProcessExportArtifactV1 {
  readonly fileName: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
}

export type TranslationProcessExportRejectionReasonV1 =
  | "workset_not_ready"
  | "pending_review"
  | "translation_incomplete"
  | "row_mismatch"
  | "source_required"
  | "source_length_mismatch"
  | "source_digest_mismatch"
  | "source_not_utf8"
  | "source_document_mismatch"
  | "codec_rejected"
  | "unsupported_format"
  | "digest_unavailable";

export type TranslationProcessExportResultV1 =
  | { readonly kind: "exported"; readonly artifact: TranslationProcessExportArtifactV1 }
  | {
    readonly kind: "rejected";
    readonly reason: TranslationProcessExportRejectionReasonV1;
    readonly unitId: string | null;
    readonly codecReason?: Extract<
      TranslationExportResultV1,
      { readonly kind: "rejected" }
    >["reason"];
  };

const textEncoderV1 = new TextEncoder();

function rejectedV1(
  reason: TranslationProcessExportRejectionReasonV1,
  unitId: string | null = null,
  codecReason?: Extract<TranslationExportResultV1, { readonly kind: "rejected" }>["reason"],
): TranslationProcessExportResultV1 {
  return {
    kind: "rejected",
    reason,
    unitId,
    ...(codecReason === undefined ? {} : { codecReason }),
  };
}

async function sha256V1(bytes: Uint8Array): Promise<string | null> {
  if (globalThis.crypto?.subtle === undefined) return null;
  const digestInput = new Uint8Array(bytes);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", digestInput));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function protectedSegmentsEqualV1(
  left: TranslationSourceUnitV1["protectedSegments"],
  right: TranslationSourceUnitV1["protectedSegments"],
): boolean {
  return left.length === right.length && left.every((segment, index) => {
    const candidate = right[index];
    return candidate !== undefined && segment.token === candidate.token &&
      segment.kind === candidate.kind && segment.source === candidate.source;
  });
}

function sourceUnitMatchesV1(
  source: TranslationSourceUnitV1,
  row: TranslationWorksetUnitRecordV1,
): boolean {
  return source.unitId === row.unitId && source.order === row.order &&
    source.locator === row.locator && source.context === row.context &&
    source.durationMilliseconds === row.durationMilliseconds &&
    source.lineBreakPolicy === row.lineBreakPolicy && source.source === row.source &&
    protectedSegmentsEqualV1(source.protectedSegments, row.protectedSegments);
}

function translatedFileNameV1(
  sourceFileName: string,
  targetLocale: string,
  replacementExtension?: string,
): string {
  const leaf = sourceFileName.split(/[\\/]/u).at(-1) || "translation";
  const finalDot = leaf.lastIndexOf(".");
  const base = finalDot > 0 ? leaf.slice(0, finalDot) : leaf;
  const extension = replacementExtension ?? (finalDot > 0 ? leaf.slice(finalDot + 1) : "txt");
  return `${base}.${targetLocale}.${extension}`;
}

function mediaTypeV1(format: TranslationWorksetHeadV1["document"]["format"]): string | null {
  if (format === "plain_text" || format === "pdf_text_reflow") {
    return "text/plain;charset=utf-8";
  }
  if (format === "markdown") return "text/markdown;charset=utf-8";
  if (format === "subrip") return "application/x-subrip;charset=utf-8";
  if (format === "webvtt") return "text/vtt;charset=utf-8";
  if (format === "advanced_substation_alpha") return "text/x-ssa;charset=utf-8";
  if (format === "sillyos_translation_json") return "application/json;charset=utf-8";
  return null;
}

function pdfTextV1(rows: readonly TranslationWorksetUnitRecordV1[]): string | null {
  const pages: string[][] = [];
  let currentPage = 0;
  let currentLine = 0;
  for (const row of rows) {
    const match = /^pdf\/page\/(\d+)\/line\/(\d+)$/u.exec(row.locator);
    if (match === null || row.target === null) return null;
    const page = Number(match[1]);
    const line = Number(match[2]);
    if (
      !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(line) || line < 1 ||
      page < currentPage || page === currentPage && line <= currentLine
    ) return null;
    if (page !== currentPage) {
      pages.push([]);
      currentPage = page;
      currentLine = 0;
    }
    pages.at(-1)!.push(row.target);
    currentLine = line;
  }
  return pages.map((page) => page.join("\n")).join("\n\f\n");
}

/**
 * Deterministically derives one download artifact from a completed workset.
 * It owns no Workspace or repository I/O and creates no second persistence authority.
 */
export async function exportTranslationProcessV1(
  input: TranslationProcessExportInputV1,
): Promise<TranslationProcessExportResultV1> {
  const { workset } = input;
  if (workset.phase !== "ready") return rejectedV1("workset_not_ready");
  if (workset.pendingCandidateId !== null) return rejectedV1("pending_review");
  if (
    workset.acceptedUnitCount !== workset.expectedUnitCount ||
    workset.stagedUnitCount !== workset.expectedUnitCount ||
    input.rows.length !== workset.expectedUnitCount
  ) return rejectedV1("translation_incomplete");

  let rows: readonly TranslationWorksetUnitRecordV1[];
  try {
    rows = input.rows.map(cloneTranslationWorksetUnitV1);
  } catch {
    return rejectedV1("row_mismatch");
  }
  for (const [order, row] of rows.entries()) {
    if (row.processId !== workset.processId || row.order !== order || row.target === null) {
      return rejectedV1("row_mismatch", row.unitId);
    }
  }

  const mediaType = mediaTypeV1(workset.document.format);
  if (mediaType === null) return rejectedV1("unsupported_format");
  if (workset.document.format === "pdf_text_reflow") {
    const text = pdfTextV1(rows);
    if (text === null) return rejectedV1("row_mismatch");
    return {
      kind: "exported",
      artifact: {
        fileName: translatedFileNameV1(workset.source.fileName, workset.targetLocale, "txt"),
        mediaType,
        bytes: textEncoderV1.encode(text),
      },
    };
  }

  if (input.sourceBytes === null) return rejectedV1("source_required");
  if (input.sourceBytes.byteLength !== workset.source.byteLength) {
    return rejectedV1("source_length_mismatch");
  }
  const digest = await sha256V1(input.sourceBytes);
  if (digest === null) return rejectedV1("digest_unavailable");
  if (digest !== workset.source.sha256) return rejectedV1("source_digest_mismatch");
  let sourceText: string;
  try {
    sourceText = new TextDecoder("utf-8", { fatal: true }).decode(input.sourceBytes);
  } catch {
    return rejectedV1("source_not_utf8");
  }
  const prepared = prepareTranslationDocumentV1({
    text: sourceText,
    fileName: workset.source.fileName,
    mediaType: workset.source.mediaType,
  });
  if (
    prepared.format !== workset.document.format ||
    prepared.capability.grade !== "round_trip_supported" || prepared.exportTranslation === null ||
    prepared.sourceUnits.length !== rows.length ||
    prepared.sourceUnits.some((unit, index) => !sourceUnitMatchesV1(unit, rows[index]!))
  ) return rejectedV1("source_document_mismatch");

  const exported = prepared.exportTranslation(
    rows.map((row) => ({ unitId: row.unitId, target: row.target! })),
    { targetLocale: workset.targetLocale },
  );
  if (exported.kind === "rejected") {
    return rejectedV1("codec_rejected", exported.unitId, exported.reason);
  }
  return {
    kind: "exported",
    artifact: {
      fileName: translatedFileNameV1(workset.source.fileName, workset.targetLocale),
      mediaType,
      bytes: textEncoderV1.encode(exported.text),
    },
  };
}
