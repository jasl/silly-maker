// SPDX-License-Identifier: MIT
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import type { DiagnosticEnvelopeV1 } from "@sillymaker/base";
import { createDiagnosticV1, parseMotionDocumentV1 } from "@sillymaker/base";

/**
 * Motion source lint for `story check`: every `*.motion.json` under the
 * Story's source tree must pass strict Motion admission, keep one unique
 * motionId per file, and keep the filename in step with the id (the file
 * stem must be the id's final segment) so click-to-locate, the write port's
 * id↔path stability rule, and human navigation all agree. This guards the
 * authored data itself; the "no inline tunable animation constants in scene
 * code" rule stays a documented collaboration contract, not a heuristic
 * source scanner.
 */

const motionFileSuffixV1 = ".motion.json";

function walkMotionFilesV1(root: string, collected: string[]): void {
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = resolve(root, name);
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      walkMotionFilesV1(path, collected);
      continue;
    }
    if (stat.isFile() && name.endsWith(motionFileSuffixV1)) collected.push(path);
  }
}

/** Scans one source root; returns [] when everything is consistent. */
export function collectMotionSourceDiagnosticsV1(
  sourceRoot: string,
): readonly DiagnosticEnvelopeV1[] {
  const files: string[] = [];
  walkMotionFilesV1(resolve(sourceRoot), files);
  files.sort((a, b) => a.localeCompare(b));

  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const byMotionId = new Map<string, string>();

  for (const filePath of files) {
    const file = relative(resolve(sourceRoot), filePath).split(sep).join("/");
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

  return Object.freeze(diagnostics);
}
