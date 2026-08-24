// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";

import type { DiagnosticEnvelopeV1 } from "@sillymaker/base";
import { createDiagnosticV1, parseRegionsDocumentV1 } from "@sillymaker/base";

import { listAuthoringSourceFilesV1 } from "./authoring-index.ts";

/**
 * Regions source lint for `story check` (shaped-hit-regions, accepted
 * 2026-08-21): every `*.regions.json` under the Story's source tree must
 * pass strict regions admission, keep one unique regionsId per file, and
 * keep the filename in step with the id (the file stem must be the id's
 * final segment) so click-to-locate, the write port's id↔path stability
 * rule, and human navigation all agree. The file walk is the shared
 * Project Authoring Index, so `story check` and the Studio ports can never
 * disagree about which files exist.
 */

const regionsFileSuffixV1 = ".regions.json";

/** Scans one source root; returns [] when everything is consistent. */
export function collectRegionsSourceDiagnosticsV1(
  sourceRoot: string,
): readonly DiagnosticEnvelopeV1[] {
  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const byRegionsId = new Map<string, string>();

  for (
    const { path: file, filePath } of listAuthoringSourceFilesV1(sourceRoot, regionsFileSuffixV1)
  ) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      diagnostics.push(
        createDiagnosticV1({
          code: "regions.document_json_invalid",
          phase: "lint",
          message: `regions source is not valid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
          location: { file },
          details: {},
        }),
      );
      continue;
    }

    let regionsDocument;
    try {
      regionsDocument = parseRegionsDocumentV1(parsedJson, `/${file}`);
    } catch (error) {
      diagnostics.push(
        createDiagnosticV1({
          code: "regions.document_invalid",
          phase: "lint",
          message: error instanceof Error ? error.message : String(error),
          location: { file },
          details: {},
        }),
      );
      continue;
    }

    const previous = byRegionsId.get(regionsDocument.regionsId);
    if (previous !== undefined) {
      diagnostics.push(
        createDiagnosticV1({
          code: "regions.id_duplicate",
          phase: "lint",
          message: `regions id "${regionsDocument.regionsId}" is declared by both ` +
            `"${previous}" and "${file}"`,
          location: { file },
          subject: { kind: "regions", id: regionsDocument.regionsId },
          details: {},
        }),
      );
      continue;
    }
    byRegionsId.set(regionsDocument.regionsId, file);

    const stem = file.split("/").at(-1)?.slice(0, -regionsFileSuffixV1.length) ?? "";
    if (!regionsDocument.regionsId.endsWith(`.${stem}`)) {
      diagnostics.push(
        createDiagnosticV1({
          code: "regions.id_filename_mismatch",
          phase: "lint",
          message:
            `regions id "${regionsDocument.regionsId}" does not end with the file stem ".${stem}"; ` +
            "click-to-locate and the write port rely on stable id↔path naming",
          suggestion: "rename the file to match the regions id's final segment (or vice versa)",
          location: { file },
          subject: { kind: "regions", id: regionsDocument.regionsId },
          details: {},
        }),
      );
    }
  }

  return diagnostics;
}
