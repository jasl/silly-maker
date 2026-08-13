// SPDX-License-Identifier: MIT
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import type { DiagnosticEnvelopeV1 } from "@sillymaker/base";
import { createDiagnosticV1, parseMotionDocumentV1, parseSceneDocumentV1 } from "@sillymaker/base";

/**
 * Scene source lint for `story check`: every `*.scene.json` under the
 * Story's source tree must pass strict Scene admission, keep one unique
 * sceneId per file, keep the filename in step with the id (the file stem
 * must be the id's final segment), and reference only motion ids that a
 * `*.motion.json` in the same tree declares. This guards the authored data
 * itself; the single-authoring-authority rule (a scene-managed scene's
 * placements live only in its document) stays a documented collaboration
 * contract, not a heuristic source scanner.
 */

const sceneFileSuffixV1 = ".scene.json";
const motionFileSuffixV1 = ".motion.json";

function walkFilesV1(root: string, suffix: string, collected: string[]): void {
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
      walkFilesV1(path, suffix, collected);
      continue;
    }
    if (stat.isFile() && name.endsWith(suffix)) collected.push(path);
  }
}

/** Motion ids declared by parseable motion sources; broken files are the motion lint's job. */
function knownMotionIdsV1(sourceRoot: string): ReadonlySet<string> {
  const files: string[] = [];
  walkFilesV1(sourceRoot, motionFileSuffixV1, files);
  const ids = new Set<string>();
  for (const filePath of files) {
    try {
      ids.add(parseMotionDocumentV1(JSON.parse(readFileSync(filePath, "utf8"))).motionId);
    } catch {
      continue;
    }
  }
  return ids;
}

/** Scans one source root; returns [] when everything is consistent. */
export function collectSceneSourceDiagnosticsV1(
  sourceRoot: string,
): readonly DiagnosticEnvelopeV1[] {
  const root = resolve(sourceRoot);
  const files: string[] = [];
  walkFilesV1(root, sceneFileSuffixV1, files);
  files.sort((a, b) => a.localeCompare(b));
  if (files.length === 0) return Object.freeze([]);

  const motionIds = knownMotionIdsV1(root);
  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const bySceneId = new Map<string, string>();

  for (const filePath of files) {
    const file = relative(root, filePath).split(sep).join("/");
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      diagnostics.push(
        createDiagnosticV1({
          code: "scene.document_json_invalid",
          phase: "lint",
          message: `scene source is not valid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
          location: { file },
          details: {},
        }),
      );
      continue;
    }

    let sceneDocument;
    try {
      sceneDocument = parseSceneDocumentV1(parsedJson, `/${file}`);
    } catch (error) {
      diagnostics.push(
        createDiagnosticV1({
          code: "scene.document_invalid",
          phase: "lint",
          message: error instanceof Error ? error.message : String(error),
          location: { file },
          details: {},
        }),
      );
      continue;
    }

    const previous = bySceneId.get(sceneDocument.sceneId);
    if (previous !== undefined) {
      diagnostics.push(
        createDiagnosticV1({
          code: "scene.id_duplicate",
          phase: "lint",
          message:
            `scene id "${sceneDocument.sceneId}" is declared by both "${previous}" and "${file}"`,
          location: { file },
          subject: { kind: "scene", id: sceneDocument.sceneId },
          details: {},
        }),
      );
      continue;
    }
    bySceneId.set(sceneDocument.sceneId, file);

    const stem = file.split("/").at(-1)?.slice(0, -sceneFileSuffixV1.length) ?? "";
    if (!sceneDocument.sceneId.endsWith(`.${stem}`)) {
      diagnostics.push(
        createDiagnosticV1({
          code: "scene.id_filename_mismatch",
          phase: "lint",
          message:
            `scene id "${sceneDocument.sceneId}" does not end with the file stem ".${stem}"; ` +
            "navigation and the write port rely on stable id↔path naming",
          suggestion: "rename the file to match the scene id's final segment (or vice versa)",
          location: { file },
          subject: { kind: "scene", id: sceneDocument.sceneId },
          details: {},
        }),
      );
    }

    for (const cue of sceneDocument.cues) {
      if (cue.motionId === undefined || motionIds.has(cue.motionId)) continue;
      diagnostics.push(
        createDiagnosticV1({
          code: "scene.cue_motion_missing",
          phase: "lint",
          message: `cue "${cue.cueId}" references motion "${cue.motionId}", ` +
            "but no *.motion.json in this source tree declares it",
          location: { file },
          subject: { kind: "scene", id: sceneDocument.sceneId },
          details: {},
        }),
      );
    }
  }

  return Object.freeze(diagnostics);
}
