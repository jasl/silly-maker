// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import type {
  MotionChannelV1,
  MotionDefinitionV1,
  MotionDocumentV1,
  MotionNamedEasingV1,
  StageRenderTargetV1,
} from "@sillymaker/base";
import {
  motionDefinitionFromDocumentV1,
  parseMotionDocumentV1,
  sampleMotionAtV1,
} from "@sillymaker/base";

import type { SemanticStageEntryRendererV1 } from "../stage/semantic-stage-host.tsx";
import { SemanticStageHostV1 } from "../stage/semantic-stage-host.tsx";
import type { StageRenderFrameV1 } from "../stage/stage-reconciler.ts";
import { settledStageFrameV1 } from "../stage/stage-reconciler.ts";
import { moveMotionKeyframeV1, setMotionOffsetKeyframesV1 } from "./motion-edit.ts";
import type { MotionSourceEntryV1 } from "./motion-sources.ts";
import type { MotionIoErrorCodeV1, MotionSourceIoV1 } from "./motion-io.ts";
import styles from "./motion-workbench.module.css";

/**
 * The Motion Workbench: the single-motion editing loop. The canvas renders
 * the real Story renderers against a detached settled target (no Session,
 * no reconciler) with the edited motion composed over the animated entry at
 * a scrubbed time, so what the author sees is exactly what the player path
 * renders. The draft lives only in this component's memory and feeds only
 * this preview; the live game keeps consuming the saved asset until a
 * compare-and-swap save commits the file through the dev-server port.
 */

export interface MotionWorkbenchPreviewV1 {
  /** The detached settled context (background + the animated entry). */
  readonly target: StageRenderTargetV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  /** Which entry the motion animates (`layerId:tag`). */
  readonly entryKey: string;
  /** The logical canvas the placements were authored against. */
  readonly canvas: { readonly width: number; readonly height: number };
}

export interface MotionWorkbenchPropsV1 {
  readonly source: MotionSourceEntryV1;
  readonly preview: MotionWorkbenchPreviewV1;
  /** The write-back port; omit for a read-only preview (no save). */
  readonly io?: MotionSourceIoV1;
}

type WorkbenchSaveStatusV1 =
  | { readonly kind: "idle" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved" }
  | { readonly kind: "read_failed"; readonly code: MotionIoErrorCodeV1 }
  | { readonly kind: "write_failed"; readonly code: MotionIoErrorCodeV1 };

const workbenchRatesV1 = [0.25, 0.5, 1, 2] as const;

const workbenchEasingsV1: readonly MotionNamedEasingV1[] = [
  "linear",
  "ease_in",
  "ease_out",
  "ease_in_out",
  "ease_in_cubic",
  "ease_out_cubic",
  "ease_out_back",
];

function cloneMotionDocumentV1(motionDocument: MotionDocumentV1): MotionDocumentV1 {
  return JSON.parse(JSON.stringify(motionDocument)) as MotionDocumentV1;
}

function sameMotionDocumentV1(a: MotionDocumentV1, b: MotionDocumentV1): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function tryParseMotionDocumentV1(
  value: unknown,
): { readonly motionDocument: MotionDocumentV1; readonly error: null } | {
  readonly motionDocument: null;
  readonly error: string;
} {
  try {
    return { motionDocument: parseMotionDocumentV1(value), error: null };
  } catch (error) {
    return {
      motionDocument: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** A settled frame with the edited motion composed onto the animated entry. */
function workbenchFrameV1(
  target: StageRenderTargetV1,
  entryKey: string,
  motion: MotionDefinitionV1 | null,
  progress: number,
  ghostOnly: boolean,
): StageRenderFrameV1 {
  const settled = settledStageFrameV1(target);
  return Object.freeze({
    ...settled,
    layers: settled.layers.map((layer) =>
      Object.freeze({
        ...layer,
        entries: Object.freeze(
          layer.entries
            .filter((frameEntry) => !ghostOnly || frameEntry.entry.key === entryKey)
            .map((frameEntry) =>
              frameEntry.entry.key === entryKey && motion !== null
                ? Object.freeze({
                  ...frameEntry,
                  phase: "entering" as const,
                  transitionKind: "motion" as const,
                  transitionId: null,
                  progress,
                  motion,
                })
                : frameEntry
            ),
        ),
      })
    ),
  });
}

interface DraftEditorV1 {
  readonly draft: MotionDocumentV1;
  update(
    mutate: (next: {
      durationMs: number;
      delayMs: number;
      tracks: {
        channel: MotionChannelV1;
        keyframes: { atPermille: number; value: number; easing?: unknown }[];
      }[];
    }) => void,
  ): void;
  /** Replaces the whole draft (pure edit helpers return new documents). */
  replace(next: MotionDocumentV1): void;
}

function useDraftEditorV1(
  saved: MotionDocumentV1,
  revision: number,
): DraftEditorV1 {
  const [draft, setDraft] = useState<MotionDocumentV1>(() => cloneMotionDocumentV1(saved));
  const revisionRef = useRef(revision);
  useEffect(() => {
    if (revisionRef.current === revision) return;
    revisionRef.current = revision;
    setDraft(cloneMotionDocumentV1(saved));
  }, [saved, revision]);
  return {
    draft,
    update(mutate) {
      setDraft((current) => {
        const next = JSON.parse(JSON.stringify(current)) as Parameters<typeof mutate>[0] & {
          motionId: string;
        };
        mutate(next);
        return next as unknown as MotionDocumentV1;
      });
    },
    replace(next) {
      setDraft(next);
    },
  };
}

interface SelectedKeyframeV1 {
  readonly channel: MotionChannelV1;
  readonly index: number;
}

interface GhostDragStateV1 {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startOffsetX: number;
  readonly startOffsetY: number;
  readonly atPermille: number;
}

interface DotDragStateV1 {
  readonly pointerId: number;
  readonly channel: MotionChannelV1;
  readonly index: number;
  readonly barLeft: number;
  readonly barWidth: number;
  moved: boolean;
}

export function MotionWorkbenchV1(props: MotionWorkbenchPropsV1): ReactElement {
  const { source, preview, io } = props;

  // The saved side of A/B: refreshed from the dev-server port when present
  // so the CAS digest always matches the file this edit started from.
  const [saved, setSaved] = useState<MotionDocumentV1>(source.motionDocument);
  const [savedDigest, setSavedDigest] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<WorkbenchSaveStatusV1>({ kind: "idle" });
  const [revertRevision, setRevertRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSaved(source.motionDocument);
    setSavedDigest(null);
    if (io === undefined) return () => {};
    void io.read(source.path).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") {
        setSaved(result.motionDocument);
        setSavedDigest(result.digest);
      } else {
        setSaveStatus({ kind: "read_failed", code: result.code });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [io, source]);

  const editor = useDraftEditorV1(saved, revertRevision);
  const draft = editor.draft;

  const parsedDraft = useMemo(() => tryParseMotionDocumentV1(draft), [draft]);
  const lastValidRef = useRef<MotionDocumentV1>(saved);
  if (parsedDraft.motionDocument !== null) lastValidRef.current = parsedDraft.motionDocument;

  // Direct manipulation: selecting a keyframe dot seeks to its stop and
  // shows the pose ghost there; dragging the ghost writes the offsets at
  // that stop and dragging a dot moves the stop itself. The numeric
  // inspector stays the equal secondary entry over the same draft.
  const [selectedKeyframe, setSelectedKeyframe] = useState<SelectedKeyframeV1 | null>(null);
  const ghostDragRef = useRef<GhostDragStateV1 | null>(null);
  const dotDragRef = useRef<DotDragStateV1 | null>(null);
  const selectedStop = useMemo(() => {
    if (selectedKeyframe === null) return null;
    const track = draft.tracks.find((candidate) => candidate.channel === selectedKeyframe.channel);
    const keyframe = track?.keyframes[selectedKeyframe.index];
    return keyframe === undefined ? null : keyframe.atPermille;
  }, [draft, selectedKeyframe]);

  // A/B: which document drives the canvas; the inspector always edits draft.
  const [viewMode, setViewMode] = useState<"draft" | "saved">("draft");
  const viewedDocument = viewMode === "saved" ? saved : lastValidRef.current;
  const definition = useMemo(
    () => motionDefinitionFromDocumentV1(viewedDocument),
    [viewedDocument],
  );
  const totalMs = definition.delayMs + definition.durationMs;

  // The seekable editor clock: play/pause/restart/loop/rate plus a scrubber.
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [rate, setRate] = useState<number>(1);
  useEffect(() => {
    if (!playing) return () => {};
    let frame = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      const delta = (now - last) * rate;
      last = now;
      setTimeMs((current) => {
        const next = current + delta;
        if (next < totalMs) return next;
        if (loop) return next % Math.max(1, totalMs);
        setPlaying(false);
        return totalMs;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, rate, loop, totalMs]);
  const clampedTimeMs = Math.min(totalMs, Math.max(0, timeMs));
  const progress = totalMs <= 0 ? 1 : clampedTimeMs / totalMs;

  const mainFrame = useMemo(
    () => workbenchFrameV1(preview.target, preview.entryKey, definition, progress, false),
    [preview.target, preview.entryKey, definition, progress],
  );
  // Without a selection the ghost pins the start pose; with a selected
  // keyframe it shows (and drags) the pose at that stop.
  const ghostProgress = useMemo(() => {
    if (selectedStop === null) return 0;
    const total = draft.delayMs + draft.durationMs;
    return total <= 0 ? 1 : (draft.delayMs + (draft.durationMs * selectedStop) / 1000) / total;
  }, [draft.delayMs, draft.durationMs, selectedStop]);
  const ghostFrame = useMemo(
    () => workbenchFrameV1(preview.target, preview.entryKey, definition, ghostProgress, true),
    [preview.target, preview.entryKey, definition, ghostProgress],
  );

  const canvasBoxWidth = 360;
  const scale = canvasBoxWidth / preview.canvas.width;
  const canvasBoxHeight = Math.round(preview.canvas.height * scale);

  const ghostDraggable = selectedStop !== null && parsedDraft.motionDocument !== null;

  const onGhostPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!ghostDraggable || selectedStop === null || parsedDraft.motionDocument === null) return;
    if (event.button !== 0) return;
    event.preventDefault();
    const draftDefinition = motionDefinitionFromDocumentV1(parsedDraft.motionDocument);
    const stopTimeMs = draftDefinition.delayMs +
      (draftDefinition.durationMs * selectedStop) / 1000;
    const sample = sampleMotionAtV1(draftDefinition, stopTimeMs);
    ghostDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: sample.offsetX,
      startOffsetY: sample.offsetY,
      atPermille: selectedStop,
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onGhostPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = ghostDragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    const offsetX = drag.startOffsetX + (event.clientX - drag.startClientX) / scale;
    const offsetY = drag.startOffsetY + (event.clientY - drag.startClientY) / scale;
    editor.replace(setMotionOffsetKeyframesV1(draft, drag.atPermille, { offsetX, offsetY }));
  };

  const onGhostPointerEnd = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = ghostDragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    ghostDragRef.current = null;
  };

  const onDotPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    channel: MotionChannelV1,
    index: number,
    isEndpoint: boolean,
  ): void => {
    if (event.button !== 0 || isEndpoint) return;
    const bar = event.currentTarget.parentElement;
    if (bar === null) return;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return;
    dotDragRef.current = {
      pointerId: event.pointerId,
      channel,
      index,
      barLeft: rect.left,
      barWidth: rect.width,
      moved: false,
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onDotPointerMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = dotDragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    drag.moved = true;
    const atPermille = ((event.clientX - drag.barLeft) / drag.barWidth) * 1000;
    editor.replace(moveMotionKeyframeV1(draft, drag.channel, drag.index, atPermille));
  };

  const onDotPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = dotDragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    dotDragRef.current = null;
  };

  const dirty = !sameMotionDocumentV1(draft, saved);
  const canSave = io !== undefined && savedDigest !== null &&
    parsedDraft.motionDocument !== null && dirty && saveStatus.kind !== "saving";

  const save = (): void => {
    if (!canSave || io === undefined || savedDigest === null) return;
    const validDraft = parsedDraft.motionDocument;
    if (validDraft === null) return;
    // A Workbench save is a human decision: the asset graduates from
    // "generated" to "human_tuned" so collaboration rules (do not overwrite
    // human-tuned assets) can see it. Locks and notes are preserved.
    const motionDocument: MotionDocumentV1 = Object.freeze({
      ...validDraft,
      authoring: Object.freeze({ ...validDraft.authoring, status: "human_tuned" as const }),
    });
    setSaveStatus({ kind: "saving" });
    void io.write({ path: source.path, expectedDigest: savedDigest, motionDocument }).then(
      (result) => {
        if (result.kind === "ok") {
          setSaved(motionDocument);
          setSavedDigest(result.digest);
          setSaveStatus({ kind: "saved" });
        } else {
          setSaveStatus({ kind: "write_failed", code: result.code });
        }
      },
    );
  };

  const reload = (): void => {
    if (io === undefined) return;
    void io.read(source.path).then((result) => {
      if (result.kind === "ok") {
        setSaved(result.motionDocument);
        setSavedDigest(result.digest);
        setSaveStatus({ kind: "idle" });
      } else {
        setSaveStatus({ kind: "read_failed", code: result.code });
      }
    });
  };

  return (
    <div className={styles.workbench} data-motion-workbench={source.motionId}>
      <header className={styles.header}>
        <strong>{viewedDocument.label}</strong>
        <span className={styles.path}>{source.path}</span>
      </header>

      <div
        className={styles.canvas}
        style={{
          inlineSize: `${String(canvasBoxWidth)}px`,
          blockSize: `${String(canvasBoxHeight)}px`,
        }}
      >
        <div
          className={styles["canvas-scale"]}
          style={{
            inlineSize: `${String(preview.canvas.width)}px`,
            blockSize: `${String(preview.canvas.height)}px`,
            transform: `scale(${String(scale)})`,
          }}
        >
          <SemanticStageHostV1
            frame={mainFrame}
            renderers={preview.renderers}
            accessibleName={`Motion 预览 ${source.motionId}`}
          />
          <div
            className={styles.ghost}
            data-workbench-ghost="true"
            data-workbench-ghost-draggable={ghostDraggable ? "true" : undefined}
            aria-hidden="true"
            style={ghostDraggable ? { pointerEvents: "auto", cursor: "grab" } : undefined}
            onPointerDown={onGhostPointerDown}
            onPointerMove={onGhostPointerMove}
            onPointerUp={onGhostPointerEnd}
            onPointerCancel={onGhostPointerEnd}
          >
            <SemanticStageHostV1
              frame={ghostFrame}
              renderers={preview.renderers}
              accessibleName=""
            />
          </div>
        </div>
      </div>

      <div className={styles.transport}>
        <button
          type="button"
          data-workbench-play={playing ? "pause" : "play"}
          onClick={() => {
            if (!playing && clampedTimeMs >= totalMs) setTimeMs(0);
            setPlaying(!playing);
          }}
        >
          {playing ? "暂停" : "播放"}
        </button>
        <button
          type="button"
          data-workbench-restart="true"
          onClick={() => {
            setTimeMs(0);
            setPlaying(true);
          }}
        >
          重播
        </button>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={loop}
            onChange={(event) => setLoop(event.target.checked)}
          />
          循环
        </label>
        <select
          aria-label="播放速度"
          data-workbench-rate={String(rate)}
          value={String(rate)}
          onChange={(event) => setRate(Number(event.target.value))}
        >
          {workbenchRatesV1.map((value) => (
            <option key={value} value={String(value)}>
              {value}×
            </option>
          ))}
        </select>
        <span data-workbench-time={String(Math.round(clampedTimeMs))}>
          {Math.round(clampedTimeMs)} / {totalMs}ms
        </span>
      </div>
      <input
        type="range"
        className={styles.scrub}
        aria-label="时间轴"
        data-workbench-scrub="true"
        min={0}
        max={totalMs}
        step={1}
        value={clampedTimeMs}
        onChange={(event) => {
          setPlaying(false);
          setTimeMs(Number(event.target.value));
        }}
      />

      <div className={styles.ab}>
        <span>画布显示：</span>
        <label className={styles.check}>
          <input
            type="radio"
            name="workbench-ab"
            data-workbench-ab="draft"
            checked={viewMode === "draft"}
            onChange={() => setViewMode("draft")}
          />
          草稿
        </label>
        <label className={styles.check}>
          <input
            type="radio"
            name="workbench-ab"
            data-workbench-ab="saved"
            checked={viewMode === "saved"}
            onChange={() => setViewMode("saved")}
          />
          已保存
        </label>
        <button
          type="button"
          data-workbench-revert="true"
          disabled={!dirty}
          onClick={() => setRevertRevision((current) => current + 1)}
        >
          恢复到已保存
        </button>
      </div>

      <div className={styles.fields}>
        <label>
          时长 ms
          <input
            type="number"
            data-workbench-duration="true"
            value={draft.durationMs}
            min={1}
            onChange={(event) =>
              editor.update((next) => {
                next.durationMs = Math.trunc(Number(event.target.value));
              })}
          />
        </label>
        <label>
          延迟 ms
          <input
            type="number"
            data-workbench-delay="true"
            value={draft.delayMs}
            min={0}
            onChange={(event) =>
              editor.update((next) => {
                next.delayMs = Math.trunc(Number(event.target.value));
              })}
          />
        </label>
      </div>

      {draft.tracks.map((track, trackIndex) => (
        <section key={track.channel} className={styles.track} data-workbench-track={track.channel}>
          <h4 className={styles["track-title"]}>{track.channel}</h4>
          <div className={styles["track-bar"]}>
            {track.keyframes.map((keyframe, keyframeIndex) => {
              const isEndpoint = keyframeIndex === 0 ||
                keyframeIndex === track.keyframes.length - 1;
              const isSelected = selectedKeyframe?.channel === track.channel &&
                selectedKeyframe.index === keyframeIndex;
              return (
                <button
                  key={`${String(keyframe.atPermille)}.${String(keyframeIndex)}`}
                  type="button"
                  className={styles["track-dot"]}
                  style={{ insetInlineStart: `${String(keyframe.atPermille / 10)}%` }}
                  aria-label={`${track.channel} 关键帧 ${String(keyframeIndex)}`}
                  aria-pressed={isSelected}
                  data-workbench-dot={`${track.channel}:${String(keyframeIndex)}`}
                  data-workbench-dot-selected={isSelected ? "true" : undefined}
                  onPointerDown={(event) =>
                    onDotPointerDown(event, track.channel, keyframeIndex, isEndpoint)}
                  onPointerMove={onDotPointerMove}
                  onPointerUp={onDotPointerEnd}
                  onPointerCancel={onDotPointerEnd}
                  onClick={() => {
                    setSelectedKeyframe({ channel: track.channel, index: keyframeIndex });
                    setPlaying(false);
                    setTimeMs(
                      draft.delayMs + (draft.durationMs * keyframe.atPermille) / 1000,
                    );
                  }}
                />
              );
            })}
          </div>
          {track.keyframes.map((keyframe, keyframeIndex) => {
            const isFirst = keyframeIndex === 0;
            const isLast = keyframeIndex === track.keyframes.length - 1;
            const easingValue = typeof keyframe.easing === "string"
              ? keyframe.easing
              : keyframe.easing === undefined
              ? "default"
              : "custom";
            return (
              <div
                key={keyframeIndex}
                className={styles.keyframe}
                data-workbench-keyframe={`${track.channel}:${String(keyframeIndex)}`}
              >
                <input
                  type="number"
                  aria-label="位置 ‰"
                  data-workbench-kf-at="true"
                  value={keyframe.atPermille}
                  disabled={isFirst || isLast}
                  min={0}
                  max={1000}
                  onChange={(event) =>
                    editor.update((next) => {
                      const target = next.tracks[trackIndex]?.keyframes[keyframeIndex];
                      if (target !== undefined) {
                        target.atPermille = Math.trunc(Number(event.target.value));
                      }
                    })}
                />
                <input
                  type="number"
                  aria-label="值"
                  data-workbench-kf-value="true"
                  value={keyframe.value}
                  onChange={(event) =>
                    editor.update((next) => {
                      const target = next.tracks[trackIndex]?.keyframes[keyframeIndex];
                      if (target !== undefined) {
                        target.value = Math.trunc(Number(event.target.value));
                      }
                    })}
                />
                <select
                  aria-label="缓动"
                  data-workbench-kf-easing="true"
                  value={easingValue}
                  disabled={isLast || easingValue === "custom"}
                  onChange={(event) =>
                    editor.update((next) => {
                      const target = next.tracks[trackIndex]?.keyframes[keyframeIndex];
                      if (target === undefined) return;
                      if (event.target.value === "default") {
                        delete target.easing;
                      } else target.easing = event.target.value;
                    })}
                >
                  <option value="default">默认(linear)</option>
                  {workbenchEasingsV1.map((easing) => (
                    <option key={easing} value={easing}>
                      {easing}
                    </option>
                  ))}
                  {easingValue === "custom" ? <option value="custom">custom bezier</option> : null}
                </select>
                <button
                  type="button"
                  data-workbench-add-kf="true"
                  disabled={isLast}
                  aria-label="在此后插入关键帧"
                  onClick={() =>
                    editor.update((next) => {
                      const keyframes = next.tracks[trackIndex]?.keyframes;
                      const current = keyframes?.[keyframeIndex];
                      const following = keyframes?.[keyframeIndex + 1];
                      if (
                        keyframes === undefined || current === undefined ||
                        following === undefined
                      ) {
                        return;
                      }
                      keyframes.splice(keyframeIndex + 1, 0, {
                        atPermille: Math.trunc(
                          (current.atPermille + following.atPermille) / 2,
                        ),
                        value: Math.trunc((current.value + following.value) / 2),
                      });
                    })}
                >
                  ＋
                </button>
                <button
                  type="button"
                  data-workbench-remove-kf="true"
                  disabled={isFirst || isLast}
                  aria-label="删除关键帧"
                  onClick={() =>
                    editor.update((next) => {
                      next.tracks[trackIndex]?.keyframes.splice(keyframeIndex, 1);
                    })}
                >
                  −
                </button>
              </div>
            );
          })}
        </section>
      ))}

      {parsedDraft.error === null
        ? null
        : (
          <p className={styles.invalid} data-workbench-invalid="true">
            草稿无效：{parsedDraft.error}
          </p>
        )}

      <div className={styles.actions}>
        <button type="button" data-workbench-save="true" disabled={!canSave} onClick={save}>
          保存
        </button>
        {saveStatus.kind === "write_failed" && saveStatus.code === "digest_conflict"
          ? (
            <button type="button" data-workbench-reload="true" onClick={reload}>
              文件已被外部修改——重新读取
            </button>
          )
          : null}
        <span data-workbench-status={saveStatus.kind}>
          {saveStatus.kind === "idle" && !dirty
            ? "与已保存一致"
            : saveStatus.kind === "idle"
            ? "有未保存修改"
            : saveStatus.kind === "saving"
            ? "保存中…"
            : saveStatus.kind === "saved"
            ? "已保存"
            : saveStatus.kind === "read_failed"
            ? `读取失败：${saveStatus.code}`
            : `保存失败：${saveStatus.code}`}
        </span>
      </div>
    </div>
  );
}
