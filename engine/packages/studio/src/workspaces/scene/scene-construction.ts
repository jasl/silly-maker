// SPDX-License-Identifier: MIT
import type {
  MotionDocumentV1,
  SceneCanvasV1,
  SceneCueV1,
  SceneDocumentV1,
  SceneEntryV1,
} from "@sillymaker/base";

import type { StudioContentDescriptorV1 } from "../../core/binding.ts";
import type { defaultPlacementV1 } from "./scene-compile.ts";

/**
 * Scene Construction (Authoring Architecture S4): pure payload derivations
 * for building a scene from the Content browser — stable tag/cue/motion ids,
 * complete entry/cue operation payloads, the blank scene document, and the
 * created or cloned motion-document plan. The AR2 operation reducer owns
 * opened-draft changes; admission stays the single validator and documents
 * remain the only authoring authority.
 */

type StudioPlacementV1 = ReturnType<typeof defaultPlacementV1>;

/** The final dot-segment of a stable id ("content.a.b" → "b"). */
function idTailV1(id: string): string {
  const tail = id.split(".").at(-1) ?? "";
  return tail.length === 0 ? id : tail;
}

/** Appends "-2", "-3", … until the candidate is free. */
function dedupeIdV1(candidate: string, taken: readonly string[]): string {
  if (!taken.includes(candidate)) return candidate;
  for (let suffix = 2;; suffix += 1) {
    const next = `${candidate}-${String(suffix)}`;
    if (!taken.includes(next)) return next;
  }
}

/**
 * A stable entry tag derived from the contentId: `content.<rest>` becomes
 * `tag.<rest>`, deduplicated against the tags already in the document.
 */
export function deriveEntryTagV1(contentId: string, existingTags: readonly string[]): string {
  const rest = contentId.startsWith("content.") ? contentId.slice("content.".length) : contentId;
  return dedupeIdV1(`tag.${rest}`, existingTags);
}

/**
 * A cue id derived from the scene and the entry: `scene.<story>.<scene>`
 * plus the tag's final segment (`-hide` for exit cues), deduplicated.
 */
export function deriveCueIdV1(
  sceneId: string,
  tag: string,
  kind: "show" | "hide",
  existingCueIds: readonly string[],
): string {
  const sceneRest = sceneId.startsWith("scene.") ? sceneId.slice("scene.".length) : sceneId;
  const base = `cue.${sceneRest}.${idTailV1(tag)}${kind === "hide" ? "-hide" : ""}`;
  return dedupeIdV1(base, existingCueIds);
}

/**
 * Derives one complete entry operation payload from the descriptor. Placeable
 * content without a declared default placement starts at the canvas
 * center; backgrounds place nowhere (the show mutation's defaults own it).
 */
export function deriveContentEntryV1(
  document: SceneDocumentV1,
  descriptor: StudioContentDescriptorV1,
): SceneEntryV1 {
  const tag = deriveEntryTagV1(
    descriptor.contentId,
    document.entries.map((entry) => entry.tag as string),
  );
  const placement: StudioPlacementV1 | undefined = descriptor.defaultPlacement !== undefined
    ? { ...descriptor.defaultPlacement }
    : descriptor.category === "background"
    ? undefined
    : {
      x: Math.round(document.canvas.width / 2),
      y: Math.round(document.canvas.height / 2),
      scalePermille: 1000,
      opacityPermille: 1000,
      mirrored: false,
    };
  return Object.freeze({
    layerId: descriptor.defaultLayerId,
    tag,
    contentId: descriptor.contentId,
    zOrder: descriptor.defaultZOrder,
    ...(placement === undefined ? {} : { placement }),
    ...(descriptor.defaultAppearance === undefined
      ? {}
      : { appearance: { ...descriptor.defaultAppearance } }),
  }) as unknown as SceneEntryV1;
}

/** Derives one complete show/hide cue operation payload for the entry. */
export function deriveCueV1(
  document: SceneDocumentV1,
  tag: string,
  kind: "show" | "hide",
): SceneCueV1 {
  return Object.freeze({
    cueId: deriveCueIdV1(
      document.sceneId,
      tag,
      kind,
      document.cues.map((cue) => cue.cueId),
    ),
    kind,
    tag,
  }) as unknown as SceneCueV1;
}

/**
 * The sceneId prefix for a new scene: inferred from the scenes already in
 * the project, then from the content manifest's story segment, then the
 * literal "story" (authors may edit the id later; admission is the guard).
 */
export function inferSceneIdPrefixV1(
  sceneIds: readonly string[],
  contentIds: readonly string[],
): string {
  const fromScene = sceneIds[0];
  if (fromScene !== undefined) {
    const segments = fromScene.split(".");
    if (segments.length >= 3) return `${segments.slice(0, -1).join(".")}.`;
  }
  const fromContent = contentIds[0]?.split(".")[1];
  if (fromContent !== undefined && fromContent.length > 0) return `scene.${fromContent}.`;
  return "scene.story.";
}

/** The blank scene document a construction flow starts from. */
export function newSceneDocumentV1(input: {
  readonly sceneId: string;
  readonly label: string;
  readonly canvas: SceneCanvasV1;
}): SceneDocumentV1 {
  return {
    format: "sillymaker.scene",
    version: 1,
    sceneId: input.sceneId,
    label: input.label,
    canvas: { width: input.canvas.width, height: input.canvas.height },
    entries: [],
    cues: [],
  } as unknown as SceneDocumentV1;
}

export interface StudioMotionPlanV1 {
  readonly path: string;
  readonly motionId: string;
  readonly motionDocument: MotionDocumentV1;
}

/**
 * The created-or-cloned motion plan for one cue: the id derives from the
 * scene's story segment plus the cue's final segment, the file lands in
 * the scene's `motions/` directory (stem = the id's final segment, the
 * same rule `story check` lints), and the content either clones the
 * currently bound document or starts as a 300ms fade (in for show cues,
 * out for hide cues). Status starts `generated` — the human-tuning
 * promotion belongs to the Workbench save.
 */
export function deriveMotionPlanV1(input: {
  readonly scenePath: string;
  readonly sceneId: string;
  readonly cueId: string;
  readonly kind: "show" | "hide";
  readonly existingMotionIds: readonly string[];
  readonly source: MotionDocumentV1 | null;
}): StudioMotionPlanV1 {
  const story = input.sceneId.split(".")[1] ?? "story";
  const motionId = dedupeIdV1(
    `motion.${story}.${idTailV1(input.cueId)}`,
    input.existingMotionIds,
  );
  const stem = idTailV1(motionId);
  const sceneDirectory = input.scenePath.split("/").slice(0, -1).join("/");
  const path = `${
    sceneDirectory.length === 0 ? "" : `${sceneDirectory}/`
  }motions/${stem}.motion.json`;
  const body = input.source !== null
    ? {
      durationMs: input.source.durationMs,
      delayMs: input.source.delayMs,
      tracks: JSON.parse(JSON.stringify(input.source.tracks)) as MotionDocumentV1["tracks"],
    }
    : {
      durationMs: 300,
      delayMs: 0,
      tracks: [
        {
          channel: "opacityPermille",
          keyframes: input.kind === "hide"
            ? [{ atPermille: 0, value: 1000, easing: "ease_in_out" }, {
              atPermille: 1000,
              value: 0,
            }]
            : [{ atPermille: 0, value: 0, easing: "ease_in_out" }, {
              atPermille: 1000,
              value: 1000,
            }],
        },
      ],
    };
  const motionDocument = {
    format: "sillymaker.motion",
    version: 1,
    motionId,
    label: input.source !== null ? `${stem}（克隆）` : `${stem}（新建）`,
    ...body,
    authoring: { status: "generated" },
  } as unknown as MotionDocumentV1;
  return Object.freeze({ path, motionId, motionDocument });
}
