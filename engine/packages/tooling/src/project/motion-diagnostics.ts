// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";

import type { DiagnosticEnvelopeV1 } from "@sillymaker/base";
import { createDiagnosticV1, parseMotionDocumentV1 } from "@sillymaker/base";

import { listAuthoringSourceFilesV1 } from "./authoring-index.ts";

/**
 * Motion source lint for `app check`: every `*.motion.json` under the
 * Story's source tree must pass strict Motion admission, keep one unique
 * motionId per file, and keep the filename in step with the id (the file
 * stem must be the id's final segment) so click-to-locate, the write port's
 * id↔path stability rule, and human navigation all agree. The file walk is
 * the shared Project Authoring Index, so `app check` and the Studio
 * ports can never disagree about which files exist. This guards the
 * authored data itself; the "no inline tunable animation constants in
 * scene code" rule stays a documented collaboration contract, not a
 * heuristic source scanner.
 */

const motionFileSuffixV1 = ".motion.json";

/** Scans one source root; returns [] when everything is consistent. */
export function collectMotionSourceDiagnosticsV1(
  sourceRoot: string,
): readonly DiagnosticEnvelopeV1[] {
  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const byMotionId = new Map<string, string>();

  for (
    const { path: file, filePath } of listAuthoringSourceFilesV1(sourceRoot, motionFileSuffixV1)
  ) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      diagnostics.push(
        createDiagnosticV1({
          code: "motion.document_json_invalid",
          phase: "lint",
          message: `motion source is not valid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
          location: { file },
          details: {},
        }),
      );
      continue;
    }

    let motionDocument;
    try {
      motionDocument = parseMotionDocumentV1(parsedJson, `/${file}`);
    } catch (error) {
      diagnostics.push(
        createDiagnosticV1({
          code: "motion.document_invalid",
          phase: "lint",
          message: error instanceof Error ? error.message : String(error),
          location: { file },
          details: {},
        }),
      );
      continue;
    }

    const previous = byMotionId.get(motionDocument.motionId);
    if (previous !== undefined) {
      diagnostics.push(
        createDiagnosticV1({
          code: "motion.id_duplicate",
          phase: "lint",
          message:
            `motion id "${motionDocument.motionId}" is declared by both "${previous}" and "${file}"`,
          location: { file },
          subject: { kind: "motion", id: motionDocument.motionId },
          details: {},
        }),
      );
      continue;
    }
    byMotionId.set(motionDocument.motionId, file);

    const stem = file.split("/").at(-1)?.slice(0, -motionFileSuffixV1.length) ?? "";
    if (!motionDocument.motionId.endsWith(`.${stem}`)) {
      diagnostics.push(
        createDiagnosticV1({
          code: "motion.id_filename_mismatch",
          phase: "lint",
          message:
            `motion id "${motionDocument.motionId}" does not end with the file stem ".${stem}"; ` +
            "click-to-locate and the write port rely on stable id↔path naming",
          suggestion: "rename the file to match the motion id's final segment (or vice versa)",
          location: { file },
          subject: { kind: "motion", id: motionDocument.motionId },
          details: {},
        }),
      );
    }
  }

  return diagnostics;
}
