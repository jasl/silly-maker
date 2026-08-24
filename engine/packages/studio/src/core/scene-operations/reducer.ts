// SPDX-License-Identifier: MIT
import { parseSceneDocumentV1 } from "@sillymaker/base";
import type { SceneCueV1, SceneDocumentV1, SceneEntryV1 } from "@sillymaker/base";

import type {
  SceneAuthoringDiagnosticCodeV1,
  SceneAuthoringDiagnosticV1,
  SceneAuthoringOperationV1,
  SceneAuthoringReductionResultV1,
} from "./contract.ts";

function rejectedV1(
  code: SceneAuthoringDiagnosticCodeV1,
  path: string,
): SceneAuthoringReductionResultV1 {
  const diagnostic: SceneAuthoringDiagnosticV1 = { code, path };
  return { kind: "rejected", diagnostic };
}

function unreachableV1(value: never): never {
  void value;
  throw new TypeError("Unreachable Scene authoring operation");
}

function finalizeV1(candidate: unknown): SceneAuthoringReductionResultV1 {
  let next: SceneDocumentV1;
  try {
    next = parseSceneDocumentV1(candidate);
  } catch {
    return rejectedV1("scene_authoring.result_invalid", "/document");
  }
  return { kind: "reduced", document: next };
}

function replaceEntryV1(
  document: SceneDocumentV1,
  tag: string,
  replace: (entry: SceneEntryV1) => SceneEntryV1,
): readonly SceneEntryV1[] | null {
  let found = false;
  const entries = document.entries.map((entry) => {
    if ((entry.tag as string) !== tag) return entry;
    found = true;
    return replace(entry);
  });
  return found ? entries : null;
}

function replaceCueV1(
  document: SceneDocumentV1,
  cueId: string,
  replace: (cue: SceneCueV1) => SceneCueV1,
): readonly SceneCueV1[] | null {
  let found = false;
  const cues = document.cues.map((cue) => {
    if (cue.cueId !== cueId) return cue;
    found = true;
    return replace(cue);
  });
  return found ? cues : null;
}

/**
 * Pure Scene reducer. It owns no Session, IO, save, HMR, clock, or runtime
 * authority; every successful candidate is re-admitted as SceneDocumentV1.
 */
export function reduceSceneAuthoringOperationV1(
  document: SceneDocumentV1,
  operation: SceneAuthoringOperationV1,
): SceneAuthoringReductionResultV1 {
  switch (operation.kind) {
    case "scene.entry.set_placement": {
      const entries = replaceEntryV1(
        document,
        operation.tag,
        (entry) => ({ ...entry, placement: operation.placement }),
      );
      if (entries === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/tag");
      }
      return finalizeV1({ ...document, entries });
    }
    case "scene.entry.add": {
      if (document.entries.some((entry) => entry.tag === operation.entry.tag)) {
        return rejectedV1("scene_authoring.target_conflict", "/operation/entry/tag");
      }
      return finalizeV1({
        ...document,
        entries: [...document.entries, operation.entry],
      });
    }
    case "scene.entry.remove": {
      if (!document.entries.some((entry) => (entry.tag as string) === operation.tag)) {
        return rejectedV1("scene_authoring.target_missing", "/operation/tag");
      }
      return finalizeV1({
        ...document,
        entries: document.entries.filter((entry) => (entry.tag as string) !== operation.tag),
        cues: document.cues.filter((cue) => (cue.tag as string) !== operation.tag),
      });
    }
    case "scene.entry.set_z_order": {
      const entries = replaceEntryV1(
        document,
        operation.tag,
        (entry) => ({ ...entry, zOrder: operation.zOrder }),
      );
      if (entries === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/tag");
      }
      return finalizeV1({ ...document, entries });
    }
    case "scene.entry.set_appearance": {
      const entries = replaceEntryV1(document, operation.tag, (entry) => {
        const appearance: Record<string, string> = { ...entry.appearance };
        if (operation.value === null) delete appearance[operation.key];
        else appearance[operation.key] = operation.value;
        const mutable: Record<string, unknown> = { ...entry };
        if (Object.keys(appearance).length === 0) delete mutable.appearance;
        else mutable.appearance = appearance;
        return mutable as unknown as SceneEntryV1;
      });
      if (entries === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/tag");
      }
      return finalizeV1({ ...document, entries });
    }
    case "scene.entry.set_ambient": {
      const entries = replaceEntryV1(document, operation.tag, (entry) => {
        const mutable: Record<string, unknown> = { ...entry };
        if (operation.motionId === null) delete mutable.ambient;
        else {
          const phaseMs = entry.ambient?.phaseMs;
          mutable.ambient = {
            motionId: operation.motionId,
            ...(phaseMs === undefined ? {} : { phaseMs }),
          };
        }
        return mutable as unknown as SceneEntryV1;
      });
      if (entries === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/tag");
      }
      return finalizeV1({ ...document, entries });
    }
    case "scene.cue.add": {
      if (document.cues.some((cue) => cue.cueId === operation.cue.cueId)) {
        return rejectedV1("scene_authoring.target_conflict", "/operation/cue/cueId");
      }
      if (!document.entries.some((entry) => entry.tag === operation.cue.tag)) {
        return rejectedV1("scene_authoring.target_missing", "/operation/cue/tag");
      }
      return finalizeV1({ ...document, cues: [...document.cues, operation.cue] });
    }
    case "scene.cue.remove": {
      if (!document.cues.some((cue) => cue.cueId === operation.cueId)) {
        return rejectedV1("scene_authoring.target_missing", "/operation/cueId");
      }
      return finalizeV1({
        ...document,
        cues: document.cues.filter((cue) => cue.cueId !== operation.cueId),
      });
    }
    case "scene.cue.set_motion": {
      const cues = replaceCueV1(document, operation.cueId, (cue) => {
        const mutable = { ...cue } as {
          cueId: string;
          kind: SceneCueV1["kind"];
          tag: SceneCueV1["tag"];
          motionId?: string;
          cut?: true;
        };
        // The selector owns this cue's complete edge presentation: choosing
        // a motion replaces cut; choosing none clears either representation.
        delete mutable.motionId;
        delete mutable.cut;
        if (operation.motionId !== null) mutable.motionId = operation.motionId;
        return mutable;
      });
      if (cues === null) {
        return rejectedV1("scene_authoring.target_missing", "/operation/cueId");
      }
      return finalizeV1({ ...document, cues });
    }
  }
  return unreachableV1(operation);
}
