// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";

import type { DiagnosticEnvelopeV1 } from "@sillymaker/base";
import { createDiagnosticV1, parseChromeLayoutDocumentV1 } from "@sillymaker/base";

import { listAuthoringSourceFilesV1 } from "./authoring-index.ts";

/**
 * Chrome-layout source lint for `app check` (authorable-chrome-layout,
 * accepted 2026-08-22): every `*.chrome-layout.json` under the Story's
 * source tree must pass strict chrome-layout admission, keep one unique
 * layoutId per file, and keep the filename in step with the id (the file
 * stem must be the id's final segment) so click-to-locate, the write
 * port's id↔path stability rule, and human navigation all agree. The file
 * walk is the shared Project Authoring Index, so `app check` and the
 * Studio ports can never disagree about which files exist.
 */

const chromeLayoutFileSuffixV1 = ".chrome-layout.json";

/** Scans one source root; returns [] when everything is consistent. */
export function collectChromeLayoutSourceDiagnosticsV1(
  sourceRoot: string,
): readonly DiagnosticEnvelopeV1[] {
  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const byLayoutId = new Map<string, string>();

  for (
    const { path: file, filePath } of listAuthoringSourceFilesV1(
      sourceRoot,
      chromeLayoutFileSuffixV1,
    )
  ) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      diagnostics.push(
        createDiagnosticV1({
          code: "chrome_layout.document_json_invalid",
          phase: "lint",
          message: `chrome-layout source is not valid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
          location: { file },
          details: {},
        }),
      );
      continue;
    }

    let layoutDocument;
    try {
      layoutDocument = parseChromeLayoutDocumentV1(parsedJson, `/${file}`);
    } catch (error) {
      diagnostics.push(
        createDiagnosticV1({
          code: "chrome_layout.document_invalid",
          phase: "lint",
          message: error instanceof Error ? error.message : String(error),
          location: { file },
          details: {},
        }),
      );
      continue;
    }

    const previous = byLayoutId.get(layoutDocument.layoutId);
    if (previous !== undefined) {
      diagnostics.push(
        createDiagnosticV1({
          code: "chrome_layout.id_duplicate",
          phase: "lint",
          message: `chrome-layout id "${layoutDocument.layoutId}" is declared by both ` +
            `"${previous}" and "${file}"`,
          location: { file },
          subject: { kind: "chrome-layout", id: layoutDocument.layoutId },
          details: {},
        }),
      );
      continue;
    }
    byLayoutId.set(layoutDocument.layoutId, file);

    const stem = file.split("/").at(-1)?.slice(0, -chromeLayoutFileSuffixV1.length) ?? "";
    if (!layoutDocument.layoutId.endsWith(`.${stem}`)) {
      diagnostics.push(
        createDiagnosticV1({
          code: "chrome_layout.id_filename_mismatch",
          phase: "lint",
          message:
            `chrome-layout id "${layoutDocument.layoutId}" does not end with the file stem ` +
            `".${stem}"; click-to-locate and the write port rely on stable id↔path naming`,
          suggestion: "rename the file to match the layout id's final segment (or vice versa)",
          location: { file },
          subject: { kind: "chrome-layout", id: layoutDocument.layoutId },
          details: {},
        }),
      );
    }
  }

  return diagnostics;
}
