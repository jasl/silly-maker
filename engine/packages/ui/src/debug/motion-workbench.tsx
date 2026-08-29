// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import {
  createAuthoringDocumentSessionV1,
  useAuthoringDocumentSessionV1,
} from "./authoring-session.ts";
import type { AuthoringDocumentIoV1 } from "./authoring-session.ts";
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
  /**
   * Which edge the motion plays on. `enter` (default) animates the entry
   * arriving in the settled target; `exit` animates it leaving — the
   * target must be the scene *before* the exit, with the entry present.
   */
  readonly phase?: "enter" | "exit";
}

export interface MotionWorkbenchPropsV1 {
  readonly source: MotionSourceEntryV1;
  readonly preview: MotionWorkbenchPreviewV1;
  /** The write-back port; omit for a read-only preview (no save). */
  readonly io?: MotionSourceIoV1;
  /** Optional Host close gate. It receives commands, never the source IO or document session. */
  readonly registerCloseParticipant?: (
    participant: MotionWorkbenchCloseParticipantV1,
  ) => () => void;
}

export interface MotionWorkbenchCloseParticipantV1 {
  getState(): { readonly dirty: boolean; readonly busy: boolean; readonly canSave: boolean };
  subscribe(listener: () => void): () => void;
  save(): Promise<boolean>;
  discard(): void;
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

/** Adapts the motion CAS port to the shared authoring-session io shape. */
function motionSessionIoV1(io: MotionSourceIoV1): AuthoringDocumentIoV1<MotionDocumentV1> {
  return {
    read: (path: string) =>
      io.read(path).then((result) =>
        result.kind === "ok"
          ? { kind: "ok" as const, digest: result.digest, document: result.motionDocument }
          : { kind: "error" as const, code: result.code }
      ),
    write: (input: { path: string; expectedDigest: string; document: MotionDocumentV1 }) =>
      io.write({
        path: input.path,
        expectedDigest: input.expectedDigest,
        motionDocument: input.document,
      }),
  };
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
  phase: "enter" | "exit",
): StageRenderFrameV1 {
  const settled = settledStageFrameV1(target);
  return {
    ...settled,
    layers: settled.layers.map((layer) => ({
      ...layer,
      entries: layer.entries
        .filter((frameEntry) => !ghostOnly || frameEntry.entry.key === entryKey)
        .map((frameEntry) =>
          frameEntry.entry.key === entryKey && motion !== null
            ? {
              ...frameEntry,
              phase: phase === "exit" ? ("exiting" as const) : ("entering" as const),
              transitionKind: "motion" as const,
              transitionId: null,
              progress,
              motion,
            }
            : frameEntry
        ),
    })),
  };
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
    coalesceKey?: string,
  ): void;
  /** Replaces the whole draft (pure edit helpers return new documents). */
  replace(next: MotionDocumentV1, coalesceKey?: string): void;
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
  const registerCloseParticipant = props.registerCloseParticipant;

  // The shared authoring session owns saved/draft/dirty, CAS, discard, and
  // undo/redo; the Workbench keeps its edit vocabulary and note texts. The
  // saved side of A/B refreshes from the dev-server port when present so
  // the CAS digest always matches the file this edit started from.
  const session = useMemo(() => {
    const created = createAuthoringDocumentSessionV1<MotionDocumentV1>(
      io === undefined ? {} : { io: motionSessionIoV1(io) },
    );
    created.installSaved({ path: source.path, document: source.motionDocument, digest: null });
    return created;
  }, [io, source]);
  const sessionSnapshot = useAuthoringDocumentSessionV1(session);
  const saved = sessionSnapshot.saved ?? source.motionDocument;
  const draft = sessionSnapshot.draft ?? source.motionDocument;
  const savedDigest = sessionSnapshot.digest;
  const [saveStatus, setSaveStatus] = useState<WorkbenchSaveStatusV1>({ kind: "idle" });

  useEffect(() => {
    setSaveStatus({ kind: "idle" });
    if (io === undefined) return () => {};
    let cancelled = false;
    void session.refreshSaved().then((result) => {
      if (cancelled || result.kind !== "error") return;
      setSaveStatus({ kind: "read_failed", code: result.code as MotionIoErrorCodeV1 });
    });
    return () => {
      cancelled = true;
    };
  }, [io, session]);

  // A/B: which document drives the canvas; the inspector always edits the
  // draft, so any edit gesture (including undo/redo) while previewing
  // "saved" flips the canvas back to draft — editing what you see requires
  // seeing what you edit.
  const [viewMode, setViewMode] = useState<"draft" | "saved">("draft");
  const editor: DraftEditorV1 = {
    draft,
    update(mutate, coalesceKey) {
      setViewMode("draft");
      const next = cloneMotionDocumentV1(draft);
      mutate(next as unknown as Parameters<typeof mutate>[0]);
      session.replaceDraft(next, coalesceKey === undefined ? {} : { coalesceKey });
    },
    replace(next, coalesceKey) {
      setViewMode("draft");
      session.replaceDraft(next, coalesceKey === undefined ? {} : { coalesceKey });
    },
  };

  const parsedDraft = useMemo(() => tryParseMotionDocumentV1(draft), [draft]);
  const lastValidRef = useRef<MotionDocumentV1>(saved);
  useLayoutEffect(() => {
    if (parsedDraft.motionDocument !== null) lastValidRef.current = parsedDraft.motionDocument;
  }, [parsedDraft.motionDocument]);

  // Direct manipulation: selecting a keyframe dot seeks to its stop and
  // shows the pose ghost there; dragging the ghost writes the offsets at
  // that stop and dragging a dot moves the stop itself. The numeric
  // inspector stays the equal secondary entry over the same draft.
  const [selectedKeyframe, setSelectedKeyframe] = useState<SelectedKeyframeV1 | null>(null);
  const ghostDragRef = useRef<GhostDragStateV1 | null>(null);
  const dotDragRef = useRef<DotDragStateV1 | null>(null);
  // One undo step per drag gesture: every pointer-down starts a new
  // coalescing run, so scrubbing a ghost or a dot stays a single undo.
  const gestureRef = useRef(0);
  const selectedStop = useMemo(() => {
    if (selectedKeyframe === null) return null;
    const track = draft.tracks.find((candidate) => candidate.channel === selectedKeyframe.channel);
    const keyframe = track?.keyframes[selectedKeyframe.index];
    return keyframe === undefined ? null : keyframe.atPermille;
  }, [draft, selectedKeyframe]);

  const viewedDocument = viewMode === "saved"
    ? saved
    : parsedDraft.motionDocument ?? lastValidRef.current;
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
  const timeMsRef = useRef(timeMs);
  useLayoutEffect(() => {
    timeMsRef.current = timeMs;
  }, [timeMs]);
  useEffect(() => {
    if (!playing) return () => {};
    let frame = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      const delta = (now - last) * rate;
      last = now;
      const current = timeMsRef.current;
      const next = current + delta;
      if (next < totalMs) {
        timeMsRef.current = next;
        setTimeMs(next);
      } else if (loop) {
        const wrapped = next % Math.max(1, totalMs);
        timeMsRef.current = wrapped;
        setTimeMs(wrapped);
      } else {
        timeMsRef.current = totalMs;
        setTimeMs(totalMs);
        setPlaying(false);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, rate, loop, totalMs]);
  const clampedTimeMs = Math.min(totalMs, Math.max(0, timeMs));
  const progress = totalMs <= 0 ? 1 : clampedTimeMs / totalMs;

  const previewPhase = preview.phase ?? "enter";
  const mainFrame = useMemo(
    () =>
      workbenchFrameV1(
        preview.target,
        preview.entryKey,
        definition,
        progress,
        false,
        previewPhase,
      ),
    [preview.target, preview.entryKey, definition, progress, previewPhase],
  );
  // Without a selection the ghost pins the start pose; with a selected
  // keyframe it shows (and drags) the pose at that stop.
  const ghostProgress = useMemo(() => {
    if (selectedStop === null) return 0;
    const total = draft.delayMs + draft.durationMs;
    return total <= 0 ? 1 : (draft.delayMs + (draft.durationMs * selectedStop) / 1000) / total;
  }, [draft.delayMs, draft.durationMs, selectedStop]);
  const ghostFrame = useMemo(
    () =>
      workbenchFrameV1(
        preview.target,
        preview.entryKey,
        definition,
        ghostProgress,
        true,
        previewPhase,
      ),
    [preview.target, preview.entryKey, definition, ghostProgress, previewPhase],
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
    gestureRef.current += 1;
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
    editor.replace(
      setMotionOffsetKeyframesV1(draft, drag.atPermille, { offsetX, offsetY }),
      `ghost:${String(gestureRef.current)}`,
    );
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
    gestureRef.current += 1;
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
    editor.replace(
      moveMotionKeyframeV1(draft, drag.channel, drag.index, atPermille),
      `dot:${String(gestureRef.current)}`,
    );
  };

  const onDotPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const drag = dotDragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    dotDragRef.current = null;
  };

  const dirty = sessionSnapshot.dirty;
  const canSave = io !== undefined && savedDigest !== null &&
    parsedDraft.motionDocument !== null && dirty && saveStatus.kind !== "saving";

  const saveDocument = useCallback(async (): Promise<boolean> => {
    const current = session.getSnapshot();
    const validDraft = current.draft === null
      ? null
      : tryParseMotionDocumentV1(current.draft).motionDocument;
    if (
      io === undefined || !current.dirty || current.digest === null || current.saving ||
      validDraft === null
    ) return false;
    // A Workbench save is a human decision: the asset graduates from
    // "generated" to "human_tuned" so collaboration rules (do not overwrite
    // human-tuned assets) can see it. Locks and notes are preserved.
    const motionDocument: MotionDocumentV1 = {
      ...validDraft,
      authoring: { ...validDraft.authoring, status: "human_tuned" as const },
    };
    setSaveStatus({ kind: "saving" });
    const result = await session.save({ document: motionDocument });
    if (result.kind === "ok") {
      setSaveStatus({ kind: "saved" });
      return !session.getSnapshot().dirty;
    }
    if (result.kind === "error") {
      if (result.code === "digest_conflict") await session.refreshSaved();
      setSaveStatus({ kind: "write_failed", code: result.code as MotionIoErrorCodeV1 });
    } else {
      setSaveStatus({ kind: "idle" });
    }
    return false;
  }, [io, session]);

  const save = useCallback((): void => {
    void saveDocument();
  }, [saveDocument]);

  useEffect(() => {
    if (registerCloseParticipant === undefined) return undefined;
    return registerCloseParticipant({
      getState: () => {
        const current = session.getSnapshot();
        const validDraft = current.draft !== null &&
          tryParseMotionDocumentV1(current.draft).motionDocument !== null;
        return {
          dirty: current.dirty,
          busy: current.loading || current.saving,
          canSave: current.dirty && current.digest !== null && validDraft,
        };
      },
      subscribe: session.subscribe,
      save: saveDocument,
      discard: session.discard,
    });
  }, [registerCloseParticipant, saveDocument, session]);

  const reload = (): void => {
    if (io === undefined) return;
    void session.refreshSaved().then((result) => {
      if (result.kind === "ok") {
        setSaveStatus({ kind: "idle" });
      } else if (result.kind === "error") {
        setSaveStatus({ kind: "read_failed", code: result.code as MotionIoErrorCodeV1 });
      }
    });
  };

  return (
    <div
      className={styles.workbench}
      data-motion-workbench={source.motionId}
      data-silly-tool-surface="true"
    >
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
          data-workbench-undo="true"
          disabled={!sessionSnapshot.canUndo}
          onClick={() => {
            setViewMode("draft");
            session.undo();
          }}
        >
          撤销
        </button>
        <button
          type="button"
          data-workbench-redo="true"
          disabled={!sessionSnapshot.canRedo}
          onClick={() => {
            setViewMode("draft");
            session.redo();
          }}
        >
          重做
        </button>
        <button
          type="button"
          data-workbench-revert="true"
          disabled={!dirty}
          onClick={() => session.discard()}
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
              }, "field:durationMs")}
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
              }, "field:delayMs")}
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
                    }, `field:${track.channel}:${String(keyframeIndex)}:at`)}
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
                    }, `field:${track.channel}:${String(keyframeIndex)}:value`)}
                />
                {track.channel === "frame"
                  // Frames sample stepwise; admission rejects easing on
                  // frame keyframes, so the editor never offers it.
                  ? <span data-workbench-kf-stepped="true">阶梯</span>
                  : (
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
                      {easingValue === "custom"
                        ? <option value="custom">custom bezier</option>
                        : null}
                    </select>
                  )}
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
