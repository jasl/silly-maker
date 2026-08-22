// SPDX-License-Identifier: MIT
import type { MotionDocumentV1 } from "@sillymaker/base";
import { parseMotionDocumentV1 } from "@sillymaker/base";

/**
 * The motion source index: maps a `motionId` back to the Story source file
 * that authored it, so DevTools can reverse-locate an animation from the
 * running picture. Stories build it from the same JSON modules they import
 * for their transition catalogs — typically one `import.meta.glob` over the
 * motion directory — so the index can never disagree with the shipped data.
 */

export interface MotionSourceEntryV1 {
  readonly motionId: string;
  /** Project-relative source path, e.g. `src/motions/enter.motion.json`. */
  readonly path: string;
  readonly motionDocument: MotionDocumentV1;
}

export interface MotionSourceIndexV1 {
  get(motionId: string): MotionSourceEntryV1 | null;
  list(): readonly MotionSourceEntryV1[];
}

export interface CreateMotionSourceIndexOptionsV1 {
  /**
   * Prefixed onto each module path to form the project-relative source
   * path: `import.meta.glob` keys are relative to the importing module
   * (`./motions/x.motion.json`), so a Story importing from `src/` passes
   * `"src"` to get `src/motions/x.motion.json`.
   */
  readonly sourceRoot?: string;
}

/**
 * Builds the index from a module-path → parsed-JSON record (the shape of
 * `import.meta.glob("./motions/*.motion.json", { eager: true, import:
 * "default" })`). Every value passes strict Motion admission; duplicate
 * motion ids across files are an authoring error and fail fast.
 */
export function createMotionSourceIndexV1(
  modules: Readonly<Record<string, unknown>>,
  options?: CreateMotionSourceIndexOptionsV1,
): MotionSourceIndexV1 {
  const sourceRoot = options?.sourceRoot ?? "";
  const byId = new Map<string, MotionSourceEntryV1>();
  for (const [modulePath, value] of Object.entries(modules)) {
    const relative = modulePath.replace(/^\.?\//u, "");
    const path = sourceRoot === "" ? relative : `${sourceRoot}/${relative}`;
    const motionDocument = parseMotionDocumentV1(value, `/${path}`);
    if (byId.has(motionDocument.motionId)) {
      throw new TypeError(`ui.motion_source_duplicate: ${motionDocument.motionId}`);
    }
    byId.set(
      motionDocument.motionId,
      Object.freeze({ motionId: motionDocument.motionId, path, motionDocument }),
    );
  }
  const entries = Object.freeze(
    [...byId.values()].toSorted((a, b) => a.motionId.localeCompare(b.motionId)),
  );
  return Object.freeze({
    get: (motionId: string) => byId.get(motionId) ?? null,
    list: () => entries,
  });
}
