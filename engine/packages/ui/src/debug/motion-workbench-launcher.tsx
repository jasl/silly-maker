// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { MotionSourceIoV1 } from "./motion-io.ts";
import type { MotionSourceEntryV1, MotionSourceIndexV1 } from "./motion-sources.ts";
import type { MotionWorkbenchPreviewV1 } from "./motion-workbench.tsx";
import { MotionWorkbenchV1 } from "./motion-workbench.tsx";
import type { StageInspectCaptureV1 } from "./stage-inspect.ts";

/**
 * The Workbench launcher: the shared DevDock panel body that decides what
 * the Motion Workbench opens on. Entry points, in priority order:
 *
 * 1. capture — "Edit Motion" from the provenance card carries the live
 *    rendering as a detached fixture, so the Workbench shows exactly the
 *    scene the author clicked;
 * 2. preview case — Story-authored named fixtures for hard-to-reach scenes,
 *    reachable without replaying story progress;
 * 3. the Story's fallback preview context.
 *
 * All three are editor-local presentation fixtures — never Saves,
 * Snapshots, replay anchors, or a second gameplay state.
 */

export interface MotionPreviewCaseV1 {
  readonly caseId: string;
  readonly label: string;
  readonly motionId: string;
  readonly preview: MotionWorkbenchPreviewV1;
}

export interface MotionWorkbenchSelectionV1 {
  readonly source: MotionSourceEntryV1;
  /** Live-captured context; overrides the preview target/entry when set. */
  readonly capture: StageInspectCaptureV1 | null;
  /** The preview case this selection came from, when opened from one. */
  readonly caseId: string | null;
}

export interface MotionWorkbenchStoreV1 {
  observe(): MotionWorkbenchSelectionV1 | null;
  subscribe(listener: () => void): () => void;
  open(source: MotionSourceEntryV1, capture?: StageInspectCaptureV1 | null): void;
  openCase(previewCase: MotionPreviewCaseV1, source: MotionSourceEntryV1): void;
  close(): void;
}

/** Editor chrome state shared between the provenance and Workbench panels. */
export function createMotionWorkbenchStoreV1(): MotionWorkbenchStoreV1 {
  const listeners = new Set<() => void>();
  let current: MotionWorkbenchSelectionV1 | null = null;
  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };
  return Object.freeze({
    observe: () => current,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open(source: MotionSourceEntryV1, capture?: StageInspectCaptureV1 | null): void {
      current = Object.freeze({ source, capture: capture ?? null, caseId: null });
      notify();
    },
    openCase(previewCase: MotionPreviewCaseV1, source: MotionSourceEntryV1): void {
      current = Object.freeze({ source, capture: null, caseId: previewCase.caseId });
      notify();
    },
    close(): void {
      current = null;
      notify();
    },
  });
}

export interface MotionWorkbenchLauncherPropsV1 {
  readonly store: MotionWorkbenchStoreV1;
  readonly sources: MotionSourceIndexV1;
  /** The Story's default preview context (renderers, canvas, fallbacks). */
  readonly fallbackPreview: MotionWorkbenchPreviewV1;
  readonly cases?: readonly MotionPreviewCaseV1[];
  readonly io?: MotionSourceIoV1;
}

function selectionPreviewV1(
  selection: MotionWorkbenchSelectionV1,
  props: MotionWorkbenchLauncherPropsV1,
): MotionWorkbenchPreviewV1 {
  const fromCase = selection.caseId === null
    ? null
    : (props.cases?.find((candidate) => candidate.caseId === selection.caseId) ?? null);
  if (fromCase !== null) return fromCase.preview;
  if (selection.capture !== null) {
    return Object.freeze({
      ...props.fallbackPreview,
      target: selection.capture.target,
      ...(selection.capture.entryKey === null ? {} : { entryKey: selection.capture.entryKey }),
    });
  }
  return props.fallbackPreview;
}

export function MotionWorkbenchLauncherV1(props: MotionWorkbenchLauncherPropsV1): ReactElement {
  const { store } = props;
  const selection = useSyncExternalStore(store.subscribe, store.observe, store.observe);

  if (selection === null) {
    return (
      <div data-motion-workbench-launcher="empty">
        <p>从舞台溯源的 "编辑 Motion" 进入，或从下面打开：</p>
        {props.cases === undefined || props.cases.length === 0
          ? null
          : (
            <ul data-motion-workbench-cases="true">
              {props.cases.map((previewCase) => {
                const source = props.sources.get(previewCase.motionId);
                return source === null ? null : (
                  <li key={previewCase.caseId}>
                    <button
                      type="button"
                      data-motion-workbench-case={previewCase.caseId}
                      onClick={() => store.openCase(previewCase, source)}
                    >
                      {previewCase.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        <ul data-motion-workbench-sources="true">
          {props.sources.list().map((entry) => (
            <li key={entry.motionId}>
              <button
                type="button"
                data-motion-workbench-open={entry.motionId}
                onClick={() => store.open(entry)}
              >
                {entry.motionId}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      data-motion-workbench-launcher={selection.source.motionId}
      data-motion-workbench-context={selection.caseId ??
        (selection.capture === null ? "fallback" : "capture")}
    >
      <button type="button" data-motion-workbench-close="true" onClick={store.close}>
        关闭
      </button>
      <MotionWorkbenchV1
        source={selection.source}
        preview={selectionPreviewV1(selection, props)}
        {...(props.io === undefined ? {} : { io: props.io })}
      />
    </div>
  );
}
