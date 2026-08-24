// SPDX-License-Identifier: MIT
import type { SceneDocumentV1 } from "@sillymaker/base";
import { createMotionSourceIndexV1 } from "@sillymaker/ui/debug";
import type { MotionPreviewCaseV1, MotionSourceIndexV1 } from "@sillymaker/ui/debug";

import type { StudioBindingV1 } from "../../core/binding.ts";
import type { StudioMotionSourcesV1 } from "../../core/motion-sources.ts";
import { compileSceneV1 } from "../scene/scene-compile.ts";

/**
 * Pure derivations for the motion workspace over the index-enumerated
 * motion sources: the cue-table motion catalog (load warnings stay visible
 * as authoring warnings, not silent skips) and the scene-derived Workbench
 * model — one preview case per motion-bearing cue, enter cases against the
 * scene settled after the cue and exit cases against the scene settled
 * just before it (where the entry still exists).
 */

export interface StudioMotionCatalogV1 {
  readonly ids: readonly string[];
  readonly failures: readonly string[];
}

export function buildMotionCatalogV1(
  loaded: StudioMotionSourcesV1 | null,
): StudioMotionCatalogV1 {
  if (loaded === null) {
    return { ids: [], failures: [] };
  }
  const ids: string[] = [];
  for (const source of loaded.sources) {
    if (!ids.includes(source.motionDocument.motionId)) ids.push(source.motionDocument.motionId);
  }
  return { ids, failures: loaded.warnings };
}

export type StudioMotionWorkbenchModelV1 =
  | { readonly kind: "none" }
  | { readonly kind: "unavailable"; readonly reasons: readonly string[] }
  | {
    readonly kind: "ready";
    readonly sources: MotionSourceIndexV1;
    readonly cases: readonly MotionPreviewCaseV1[];
    readonly fallbackPreview: MotionPreviewCaseV1["preview"];
    readonly warnings: readonly string[];
  };

export function buildMotionWorkbenchModelV1(
  loaded: StudioMotionSourcesV1 | null,
  binding: StudioBindingV1,
  draft: SceneDocumentV1 | null,
): StudioMotionWorkbenchModelV1 {
  const motions = loaded?.sources ?? [];
  if (motions.length === 0) {
    return loaded !== null && loaded.warnings.length > 0
      ? { kind: "unavailable", reasons: loaded.warnings }
      : { kind: "none" };
  }
  if (draft === null) return { kind: "none" };
  try {
    const sources = createMotionSourceIndexV1(
      Object.fromEntries(motions.map((source) => [source.path, source.motionDocument])),
    );
    const canvas = { width: draft.canvas.width, height: draft.canvas.height };
    const cases: MotionPreviewCaseV1[] = [];
    const warnings: string[] = [];
    for (const [index, cue] of draft.cues.entries()) {
      if (cue.motionId === undefined) continue;
      const entry = draft.entries.find((candidate) => candidate.tag === cue.tag);
      if (entry === undefined) continue;
      const entryKey = `${entry.layerId}:${entry.tag}`;
      // An enter case animates the entry arriving in the settled scene
      // after its cue; an exit case animates it leaving the scene as
      // settled just before its cue (where it is still present).
      const phase = cue.kind === "hide" ? ("exit" as const) : ("enter" as const);
      const settledThroughCueId = phase === "enter"
        ? cue.cueId
        : (draft.cues[index - 1]?.cueId ?? null);
      const settled = settledThroughCueId === null
        ? null
        : compileSceneV1(draft, settledThroughCueId, binding.catalog);
      if (settled === null || settled.kind !== "ok") {
        warnings.push(
          `Motion 预览 case 无法构造（${cue.cueId}）：${
            settled !== null && settled.kind === "error"
              ? settled.message
              : "该 cue 之前没有可回放的场景"
          }`,
        );
        continue;
      }
      const present = settled.target.layers.some((layer) =>
        layer.entries.some((candidate) => candidate.key === entryKey)
      );
      if (!present) {
        warnings.push(
          `Motion 预览 case 无法构造（${cue.cueId}）：条目 ${entryKey} 在预览场景里不在场`,
        );
        continue;
      }
      cases.push({
        caseId: cue.cueId,
        label: `${cue.cueId}（${entry.contentId}${phase === "exit" ? "，退场" : ""}）`,
        motionId: cue.motionId,
        preview: {
          target: settled.target,
          renderers: binding.renderers,
          entryKey,
          canvas,
          phase,
        },
      });
    }
    if (cases.length === 0 || cases[0] === undefined) {
      return warnings.length === 0 ? { kind: "none" } : { kind: "unavailable", reasons: warnings };
    }
    return {
      kind: "ready",
      sources,
      cases,
      fallbackPreview: cases[0].preview,
      warnings,
    };
  } catch (error) {
    return {
      kind: "unavailable",
      reasons: [
        `Motion 工坊不可用：${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}
