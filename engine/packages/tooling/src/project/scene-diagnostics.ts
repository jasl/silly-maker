// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";

import type { DiagnosticEnvelopeV1 } from "@sillymaker/base";
import { createDiagnosticV1, parseSceneDocumentV1 } from "@sillymaker/base";

import { buildAuthoringProjectIndexV1, listAuthoringSourceFilesV1 } from "./authoring-index.ts";

/**
 * Scene source lint for `story check`: every `*.scene.json` under the
 * Story's source tree must pass strict Scene admission, keep one unique
 * sceneId per file, keep the filename in step with the id (the file stem
 * must be the id's final segment), and reference only motion ids that a
 * `*.motion.json` in the same tree declares.
 *
 * Edge collisions changed with cue identity (accepted 2026-08-17): two
 * cues declaring divergent presentations (motion or explicit cut) on one
 * stage edge are legal per-cue bindings resolved through presentation edge
 * context, so they no longer diagnose. What still diagnoses is a declared
 * presentation colliding with a **bare** cue on the same edge: the bare
 * cue states no intent, so context-free resolution silently inherits the
 * sibling's motion. The fix is an explicit declaration (`cut: true` or the
 * same motion), not a stage-identity fork. Final lint disposition is
 * re-evaluated after the clone migration completes (owner ruling #3).
 *
 * The file walk and motion-id enumeration are the shared Project Authoring
 * Index, so `story check` and the Studio ports can never disagree about
 * which files exist. This guards the authored data itself; the
 * single-authoring-authority rule (a scene-managed scene's placements live
 * only in its document) stays a documented collaboration contract, not a
 * heuristic source scanner.
 */

const sceneFileSuffixV1 = ".scene.json";

/** Scans one source root; returns [] when everything is consistent. */
export function collectSceneSourceDiagnosticsV1(
  sourceRoot: string,
): readonly DiagnosticEnvelopeV1[] {
  const files = listAuthoringSourceFilesV1(sourceRoot, sceneFileSuffixV1);
  if (files.length === 0) return Object.freeze([]);

  // Motion ids declared by parseable motion sources; broken files are the
  // motion lint's job.
  const motionIds = new Set(
    buildAuthoringProjectIndexV1(sourceRoot).motions.map((motion) => motion.motionId),
  );
  const diagnostics: DiagnosticEnvelopeV1[] = [];
  const bySceneId = new Map<string, string>();
  // Cross-document stage-edge declarations (same tuple the context-free
  // fallback matches on): kind + layer + entry key + content. Explicit
  // cuts are declarations too.
  const declaredEdges = new Map<
    string,
    { readonly file: string; readonly cueId: string; readonly presentation: string }
  >();
  // First bare cue seen per edge; a later declaration reports the pairing
  // once and consumes the record, while later bare cues on an already
  // declared edge each report their own leak site.
  const bareEdges = new Map<string, { readonly file: string; readonly cueId: string }>();
  const scopeSuggestionV1 = "declare the bare cue's presentation explicitly — `cut: true` " +
    "for a deliberate instant edge, or the same motion if inheriting it is intended";

  for (const { path: file, filePath } of files) {
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

    // Ambient loops reference motions by the same discipline as cues: the
    // id must resolve inside this source tree or the loop silently never
    // plays.
    for (const entry of sceneDocument.entries) {
      if (entry.ambient === undefined || motionIds.has(entry.ambient.motionId)) continue;
      diagnostics.push(
        createDiagnosticV1({
          code: "scene.ambient_motion_missing",
          phase: "lint",
          message: `entry "${entry.tag as string}" declares ambient motion ` +
            `"${entry.ambient.motionId}", but no *.motion.json in this source tree declares it`,
          location: { file },
          subject: { kind: "scene", id: sceneDocument.sceneId },
          details: {},
        }),
      );
    }

    const entriesByTag = new Map(
      sceneDocument.entries.map((entry) => [entry.tag as string, entry]),
    );
    for (const cue of sceneDocument.cues) {
      // Admission guarantees the cue's tag names a declared entry.
      const entry = entriesByTag.get(cue.tag as string);
      if (entry === undefined) continue;
      const edgeKey = [
        cue.kind === "show" ? "enter" : "exit",
        entry.layerId as string,
        `${entry.layerId}:${entry.tag}`,
        entry.contentId as string,
      ].join("|");

      if (cue.motionId === undefined && cue.cut === undefined) {
        const declared = declaredEdges.get(edgeKey);
        if (declared !== undefined) {
          diagnostics.push(
            createDiagnosticV1({
              code: "scene.cue_binding_scope_collision",
              phase: "lint",
              message: `cue "${cue.cueId}" declares nothing for a stage edge that cue ` +
                `"${declared.cueId}" (${declared.file}) presents with ` +
                `${declared.presentation}; without dispatch context the fallback matches ` +
                "the edge, not the cue, so that presentation also plays for this cue",
              suggestion: scopeSuggestionV1,
              location: { file },
              subject: { kind: "scene", id: sceneDocument.sceneId },
              details: {},
            }),
          );
        } else if (!bareEdges.has(edgeKey)) {
          bareEdges.set(edgeKey, { file, cueId: cue.cueId });
        }
        continue;
      }

      if (cue.motionId !== undefined && !motionIds.has(cue.motionId)) {
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

      const presentation = cue.motionId === undefined
        ? "an explicit cut"
        : `motion "${cue.motionId}"`;
      const bare = bareEdges.get(edgeKey);
      if (bare !== undefined) {
        bareEdges.delete(edgeKey);
        diagnostics.push(
          createDiagnosticV1({
            code: "scene.cue_binding_scope_collision",
            phase: "lint",
            message: `cue "${cue.cueId}" presents a stage edge with ${presentation}, but ` +
              `cue "${bare.cueId}" (${bare.file}) declares nothing for the same edge; ` +
              "without dispatch context the fallback matches the edge, not the cue, so " +
              "the presentation also plays for the bare cue",
            suggestion: scopeSuggestionV1,
            location: { file },
            subject: { kind: "scene", id: sceneDocument.sceneId },
            details: {},
          }),
        );
      }

      // Divergent declared-vs-declared edges are legal per-cue bindings
      // (resolved through presentation edge context); only the first
      // declaration is remembered for bare-cue pairing.
      if (!declaredEdges.has(edgeKey)) {
        declaredEdges.set(edgeKey, { file, cueId: cue.cueId, presentation });
      }
    }
  }

  return Object.freeze(diagnostics);
}
