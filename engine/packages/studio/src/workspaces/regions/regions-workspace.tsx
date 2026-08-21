// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import type {
  StageContentGeometryV1,
  StageHitRegionV1,
  StagePlacementV1,
  StageRenderTargetV1,
} from "@sillymaker/base";
import type { AssetUrlRegistryV1, SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import { SemanticStageTargetHostV1 } from "@sillymaker/ui";
import { useAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type {
  RegionsIoListEntryV1,
  RegionsIoListSkipV1,
  RegionsSourceIoV1,
} from "../../core/regions-io.ts";
import { createRegionsDocumentSessionV1 } from "../../core/regions-session.ts";
import type { StudioAssetRegistryPortV1 } from "../../core/binding.ts";
import {
  addRegionV1,
  clearPolygonV1,
  editRegionsDocumentV1,
  graduateRegionsDocumentV1,
  inferRegionsIdPrefixV1,
  insertVertexV1,
  moveRegionV1,
  moveVertexV1,
  newRegionsDocumentV1,
  regionsDraftBlockingIssueV1,
  removeRegionV1,
  removeVertexV1,
  resizeRegionV1,
  seedPolygonV1,
} from "./regions-edit.ts";
import type { RegionsPlainDocumentV1 } from "./regions-edit.ts";
import styles from "../../studio-app.module.css";

/**
 * The Regions workspace (shaped-hit-regions M3): list/create/open
 * `sillymaker.regions` documents over the dev-server port, edit regions on
 * the scene workspace's compiled backdrop — the draft's regions are
 * injected into one chosen entry, so the host's real clip-path shapes and
 * hover reveals are the preview — and CAS-save through the same shared
 * authoring session discipline as scenes and motions. Selection clicks
 * ride the host's own shaped region buttons; the overlay adds drag
 * handles (move, resize, vertices, edge midpoints) for the selected
 * region only, and every drag coalesces into one undo step.
 */

export interface RegionsBackdropV1 {
  readonly canvas: { readonly width: number; readonly height: number };
  readonly target: StageRenderTargetV1;
}

export interface RegionsWorkspaceSectionPropsV1 {
  readonly io: RegionsSourceIoV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  readonly assets: StudioAssetRegistryPortV1 | null;
  /** The scene workspace's compiled draft; null keeps the canvas hidden. */
  readonly backdrop: RegionsBackdropV1 | null;
  /** Preview scale (CSS px per logical px), shared with the scene canvas. */
  readonly scale: number;
  /** The story segment for new document ids (from the scene id prefix). */
  readonly storyHint: string | null;
}

interface RegionsDragV1 {
  readonly pointerId: number;
  readonly mode: "move" | "resize" | "vertex";
  readonly regionIndex: number;
  readonly vertexIndex: number;
  readonly gesture: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly start: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly px: number;
    readonly py: number;
  };
}

function regionsSaveNoteV1(code: string): string {
  return code === "digest_conflict"
    ? "文件已被其他编辑更改——请重新加载后再改。"
    : `保存失败：${code}`;
}

/** Anchor-space point → canvas logical px under the entry's placement. */
function anchorToCanvasV1(
  placement: StagePlacementV1,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  const scale = placement.scalePermille / 1000;
  const mirror = placement.mirrored ? -1 : 1;
  return { x: placement.x + x * scale * mirror, y: placement.y + y * scale };
}

export function RegionsWorkspaceSectionV1(props: RegionsWorkspaceSectionPropsV1): ReactElement {
  const { io, backdrop, scale } = props;
  const [documents, setDocuments] = useState<readonly RegionsIoListEntryV1[] | null>(null);
  const [skips, setSkips] = useState<readonly RegionsIoListSkipV1[]>(Object.freeze([]));
  const [revision, setRevision] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [confirmSwitch, setConfirmSwitch] = useState<{ readonly path: string } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [backdropTag, setBackdropTag] = useState<string | null>(null);
  const [newDocStem, setNewDocStem] = useState<string | null>(null);
  const [newDocLabel, setNewDocLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const session = useMemo(() => createRegionsDocumentSessionV1(io), [io]);
  const snapshot = useAuthoringDocumentSessionV1(session);
  const draft = snapshot.draft;
  const dirty = snapshot.dirty;
  const busy = snapshot.saving;
  const loading = snapshot.loading;

  useEffect(() => {
    let active = true;
    void io.list().then((result) => {
      if (!active) return;
      if (result.kind !== "ok") {
        setDocuments(Object.freeze([]));
        setNote(`区域文档列表不可用：${result.code}`);
        return;
      }
      setDocuments(result.regionsDocuments);
      setSkips(result.skipped);
    });
    return () => {
      active = false;
    };
  }, [io, revision]);

  const openDocument = useCallback((path: string): void => {
    setNote(null);
    setConfirmSwitch(null);
    void session.open(path).then((result) => {
      if (result.kind === "stale") return;
      if (result.kind === "error") {
        setNote(`读取区域文档失败：${result.code}`);
        return;
      }
      setSelectedIndex(null);
      setSelectedVertex(null);
    });
  }, [session]);

  // The first listed document opens automatically (same shape as scenes:
  // a failed first open never retries on its own).
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (
      autoOpenedRef.current || documents === null || documents.length === 0 ||
      snapshot.path !== null || documents[0] === undefined
    ) {
      return;
    }
    autoOpenedRef.current = true;
    openDocument(documents[0].path);
  }, [documents, snapshot.path, openDocument]);

  const requestOpenDocument = useCallback((path: string): void => {
    if (dirty) {
      setConfirmSwitch({ path });
      return;
    }
    openDocument(path);
  }, [dirty, openDocument]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // The save gate is Document admission itself, re-run over the draft.
  const blockingIssue = useMemo(
    () => (draft === null ? null : regionsDraftBlockingIssueV1(draft)),
    [draft],
  );

  const editDraft = useCallback(
    (mutate: (plain: RegionsPlainDocumentV1) => void, coalesceKey?: string): void => {
      const current = session.getSnapshot().draft;
      if (current === null) return;
      session.replaceDraft(
        editRegionsDocumentV1(current, mutate),
        coalesceKey === undefined ? {} : { coalesceKey },
      );
    },
    [session],
  );

  const save = useCallback((): void => {
    const current = session.getSnapshot().draft;
    if (current === null) return;
    setNote(null);
    void session.save({ document: graduateRegionsDocumentV1(current) }).then((result) => {
      if (result.kind === "ok") setNote("已保存；运行中的游戏会热更新。");
      else if (result.kind === "error") setNote(regionsSaveNoteV1(result.code));
    });
  }, [session]);

  const confirmSaveAndOpen = useCallback((): void => {
    if (confirmSwitch === null || busy || blockingIssue !== null) return;
    const path = confirmSwitch.path;
    const current = session.getSnapshot().draft;
    if (current === null) return;
    void session.save({ document: graduateRegionsDocumentV1(current) }).then((result) => {
      if (result.kind === "ok") {
        setNote("已保存；运行中的游戏会热更新。");
        openDocument(path);
      } else if (result.kind === "error") {
        setNote(regionsSaveNoteV1(result.code));
      }
    });
  }, [blockingIssue, busy, confirmSwitch, openDocument, session]);

  const regionsIdPrefix = useMemo(
    () =>
      inferRegionsIdPrefixV1(
        (documents ?? []).map((entry) => entry.regionsId),
        props.storyHint,
      ),
    [documents, props.storyHint],
  );

  const createDocument = useCallback((): void => {
    if (newDocStem === null || creating) return;
    const stem = newDocStem.trim();
    if (!/^[a-z0-9][a-z0-9_-]*$/u.test(stem)) {
      setNote("文档名只能使用小写字母、数字、下划线和连字符。");
      return;
    }
    const label = newDocLabel.trim();
    const regionsDocument = newRegionsDocumentV1({
      regionsId: `${regionsIdPrefix}${stem}`,
      label: label.length === 0 ? stem : label,
    });
    const path = `src/regions/${stem}.regions.json`;
    setCreating(true);
    void io.create({ path, regionsDocument }).then((result) => {
      setCreating(false);
      if (result.kind === "error") {
        setNote(
          result.code === "already_exists"
            ? "同名区域文档已存在。"
            : `新建区域文档失败：${result.code}`,
        );
        return;
      }
      setNewDocStem(null);
      setNewDocLabel("");
      setRevision((current) => current + 1);
      setNote(`已创建 ${path}。`);
      requestOpenDocument(path);
    });
  }, [creating, io, newDocLabel, newDocStem, regionsIdPrefix, requestOpenDocument]);

  // ---- The backdrop preview ----------------------------------------------

  const entryOptions = useMemo(() => {
    if (backdrop === null) {
      return Object.freeze([]) as readonly {
        readonly tag: string;
        readonly placement: StagePlacementV1;
      }[];
    }
    const options: { readonly tag: string; readonly placement: StagePlacementV1 }[] = [];
    for (const layer of backdrop.target.layers) {
      for (const entry of layer.entries) {
        options.push({ tag: entry.tag as string, placement: entry.placement });
      }
    }
    return Object.freeze(options);
  }, [backdrop]);

  // Keep the chosen entry valid across recompiles; default to the first
  // entry that declares geometry (characters) over flat backgrounds.
  useEffect(() => {
    if (entryOptions.length === 0) {
      if (backdropTag !== null) setBackdropTag(null);
      return;
    }
    if (backdropTag !== null && entryOptions.some((option) => option.tag === backdropTag)) return;
    let fallback: string | null = null;
    if (backdrop !== null) {
      for (const layer of backdrop.target.layers) {
        for (const entry of layer.entries) {
          if (entry.geometry !== undefined) {
            fallback = entry.tag as string;
            break;
          }
        }
        if (fallback !== null) break;
      }
    }
    setBackdropTag(fallback ?? entryOptions[0]?.tag ?? null);
  }, [backdrop, backdropTag, entryOptions]);

  const hostEntry = useMemo(() => {
    if (backdrop === null || backdropTag === null) return null;
    for (const layer of backdrop.target.layers) {
      for (const entry of layer.entries) {
        if ((entry.tag as string) === backdropTag) return entry;
      }
    }
    return null;
  }, [backdrop, backdropTag]);

  // The preview: the backdrop target with the draft's regions swapped into
  // the chosen entry. The host renders real clip-path shapes and reveals.
  const previewTarget = useMemo((): StageRenderTargetV1 | null => {
    if (backdrop === null || draft === null || backdropTag === null) return null;
    const layers = backdrop.target.layers.map((layer) => ({
      ...layer,
      entries: layer.entries.map((entry) =>
        (entry.tag as string) === backdropTag
          ? { ...entry, hitRegions: draft.regions as readonly StageHitRegionV1[] }
          : entry
      ),
    }));
    return { ...backdrop.target, layers } as unknown as StageRenderTargetV1;
  }, [backdrop, backdropTag, draft]);

  // Hover reveals need runtime URLs: adapt the binding port when it
  // declares `resolve` (otherwise reveals stay invisible in the preview).
  const hostAssets = useMemo((): AssetUrlRegistryV1 | null => {
    const port = props.assets;
    if (port === null || port.resolve === undefined) return null;
    const resolve = port.resolve.bind(port);
    return {
      resolve,
      observe: () => port.observe(),
      subscribe: (listener) => port.subscribe(listener),
    };
  }, [props.assets]);

  // Preload the draft's hover assets (the shell only preloads the scene's).
  const assetsPort = props.assets;
  const hoverAssetIdsKey = useMemo(() => {
    if (draft === null) return "";
    const ids = new Set<string>();
    for (const region of draft.regions) {
      if (region.hoverAssetId !== undefined) ids.add(region.hoverAssetId as string);
    }
    return [...ids].sort().join("\n");
  }, [draft]);
  useEffect(() => {
    if (assetsPort === null || hoverAssetIdsKey.length === 0) return undefined;
    const controller = new AbortController();
    try {
      void assetsPort.preload(hoverAssetIdsKey.split("\n"), controller.signal).catch(() => {
        // Missing art keeps the code-native fallback; editing continues.
      });
    } catch {
      // Unresolvable ids surface through the draft gate, not a crash.
    }
    return () => controller.abort();
  }, [assetsPort, hoverAssetIdsKey]);

  const selectRegionById = useCallback((regionId: string): void => {
    const current = session.getSnapshot().draft;
    if (current === null) return;
    const index = current.regions.findIndex((region) => region.regionId === regionId);
    if (index >= 0) {
      setSelectedIndex(index);
      setSelectedVertex(null);
    }
  }, [session]);

  // ---- Drag gestures -------------------------------------------------------

  const dragRef = useRef<RegionsDragV1 | null>(null);
  const gestureRef = useRef(0);

  const onHandlePointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    mode: RegionsDragV1["mode"],
    regionIndex: number,
    vertexIndex: number,
  ): void => {
    if (event.button !== 0 || draft === null) return;
    const region = draft.regions[regionIndex];
    if (region === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedIndex(regionIndex);
    if (mode === "vertex") setSelectedVertex(vertexIndex);
    const point = vertexIndex >= 0 ? region.polygonPoints?.[vertexIndex] : undefined;
    gestureRef.current += 1;
    dragRef.current = {
      pointerId: event.pointerId,
      mode,
      regionIndex,
      vertexIndex,
      gesture: gestureRef.current,
      startClientX: event.clientX,
      startClientY: event.clientY,
      start: {
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        px: point?.x ?? 0,
        py: point?.y ?? 0,
      },
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    const placement = hostEntry?.placement;
    if (drag === null || drag.pointerId !== event.pointerId || placement === undefined) return;
    const entryScale = placement.scalePermille / 1000;
    if (entryScale === 0) return;
    const mirror = placement.mirrored ? -1 : 1;
    // Pointer deltas → anchor-space deltas: ÷ preview scale, ÷ entry scale,
    // and mirrored entries flip the x axis.
    const deltaX = ((event.clientX - drag.startClientX) / scale / entryScale) * mirror;
    const deltaY = (event.clientY - drag.startClientY) / scale / entryScale;
    const key = `regions-${drag.mode}:${String(drag.regionIndex)}:${String(drag.gesture)}`;
    if (drag.mode === "move") {
      editDraft((plain) => {
        moveRegionV1(
          plain,
          drag.regionIndex,
          drag.start.x + deltaX,
          drag.start.y + deltaY,
        );
      }, key);
      return;
    }
    if (drag.mode === "resize") {
      editDraft((plain) => {
        resizeRegionV1(
          plain,
          drag.regionIndex,
          drag.start.width + deltaX,
          drag.start.height + deltaY,
        );
      }, key);
      return;
    }
    editDraft((plain) => {
      moveVertexV1(
        plain,
        drag.regionIndex,
        drag.vertexIndex,
        drag.start.px + deltaX,
        drag.start.py + deltaY,
      );
    }, `${key}:${String(drag.vertexIndex)}`);
  };

  const onHandlePointerEnd = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
  };

  const dragHandleProps = (
    mode: RegionsDragV1["mode"],
    regionIndex: number,
    vertexIndex: number,
  ): {
    onPointerDown(event: ReactPointerEvent<HTMLElement>): void;
    onPointerMove(event: ReactPointerEvent<HTMLElement>): void;
    onPointerUp(event: ReactPointerEvent<HTMLElement>): void;
    onPointerCancel(event: ReactPointerEvent<HTMLElement>): void;
  } => ({
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) =>
      onHandlePointerDown(event, mode, regionIndex, vertexIndex),
    onPointerMove: onHandlePointerMove,
    onPointerUp: onHandlePointerEnd,
    onPointerCancel: onHandlePointerEnd,
  });

  // ---- Selected-region overlay geometry -----------------------------------

  const selectedRegion = selectedIndex === null ? undefined : draft?.regions[selectedIndex];

  const selectedOverlay = useMemo(() => {
    if (
      selectedRegion === undefined || hostEntry === null || selectedIndex === null
    ) {
      return null;
    }
    const placement = hostEntry.placement;
    const corner1 = anchorToCanvasV1(placement, selectedRegion.x, selectedRegion.y);
    const corner2 = anchorToCanvasV1(
      placement,
      selectedRegion.x + selectedRegion.width,
      selectedRegion.y + selectedRegion.height,
    );
    const vertices = (selectedRegion.polygonPoints ?? []).map((point, index) => ({
      index,
      at: anchorToCanvasV1(placement, point.x, point.y),
    }));
    const points = selectedRegion.polygonPoints ?? [];
    const midpoints = points.length === 0 || points.length >= 64 ? [] : points.map(
      (point, index) => {
        const next = points[(index + 1) % points.length] ?? point;
        return {
          index,
          at: anchorToCanvasV1(placement, (point.x + next.x) / 2, (point.y + next.y) / 2),
        };
      },
    );
    return {
      box: {
        left: Math.min(corner1.x, corner2.x),
        top: Math.min(corner1.y, corner2.y),
        width: Math.abs(corner2.x - corner1.x),
        height: Math.abs(corner2.y - corner1.y),
      },
      resizeAt: corner2,
      vertices,
      midpoints,
    };
  }, [hostEntry, selectedIndex, selectedRegion]);

  // ---- Rendering -----------------------------------------------------------

  const controlsDisabled = busy || loading || creating;

  return (
    <section className={styles["workbench"]} aria-label="区域" data-studio-regions="true">
      <h2>区域文档</h2>
      {note === null
        ? null
        : (
          <p className={styles["note"]} role="status" data-studio-regions-note="true">
            {note}
          </p>
        )}
      {confirmSwitch === null ? null : (
        <div
          className={styles["confirm"]}
          role="alertdialog"
          aria-label="未保存的区域修改"
          data-studio-regions-confirm="true"
        >
          <p>当前区域文档有未保存的修改。先保存，还是放弃这些修改？</p>
          <div className={styles["confirm-actions"]}>
            <button
              type="button"
              data-studio-regions-confirm-save="true"
              disabled={busy || blockingIssue !== null}
              onClick={confirmSaveAndOpen}
            >
              保存并继续
            </button>
            <button
              type="button"
              data-studio-regions-confirm-discard="true"
              disabled={busy}
              onClick={() => {
                if (confirmSwitch !== null) openDocument(confirmSwitch.path);
              }}
            >
              放弃修改
            </button>
            <button
              type="button"
              data-studio-regions-confirm-cancel="true"
              disabled={busy}
              onClick={() => setConfirmSwitch(null)}
            >
              取消
            </button>
          </div>
        </div>
      )}
      {blockingIssue === null && skips.length === 0
        ? null
        : (
          <div className={styles["diagnostics"]} data-studio-regions-diagnostics="true">
            {blockingIssue === null ? null : (
              <p data-studio-diagnostic="blocking">
                阻断：区域文档未通过校验——{blockingIssue}（保存已禁用）
              </p>
            )}
            {skips.map((skip) => (
              <p key={skip.path} data-studio-diagnostic="warning">
                警告：区域文件未索引（{skip.path}）：{skip.reason}
              </p>
            ))}
          </div>
        )}
      <div className={styles["regions-body"]}>
        <nav aria-label="区域文档列表" className={styles["navigator"]}>
          {documents === null
            ? <p>加载中…</p>
            : documents.length === 0
            ? <p>没有 *.regions.json</p>
            : (
              <ul data-studio-regions-docs="true">
                {documents.map((entry) => (
                  <li key={entry.path}>
                    <button
                      type="button"
                      data-studio-regions-doc={entry.regionsId}
                      aria-pressed={snapshot.path === entry.path}
                      onClick={() => requestOpenDocument(entry.path)}
                    >
                      {entry.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          {newDocStem === null
            ? (
              <button
                type="button"
                data-studio-regions-new="true"
                disabled={creating}
                onClick={() => setNewDocStem("")}
              >
                新建区域文档
              </button>
            )
            : (
              <div className={styles["new-scene"]} data-studio-regions-new-form="true">
                <label className={styles["field"]}>
                  <span>名称（{regionsIdPrefix}…）</span>
                  <input
                    type="text"
                    data-studio-regions-new-stem="true"
                    value={newDocStem}
                    onChange={(event) => setNewDocStem(event.target.value)}
                  />
                </label>
                <label className={styles["field"]}>
                  <span>标题</span>
                  <input
                    type="text"
                    data-studio-regions-new-label="true"
                    value={newDocLabel}
                    onChange={(event) => setNewDocLabel(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  data-studio-regions-new-create="true"
                  disabled={creating || newDocStem.trim().length === 0}
                  onClick={createDocument}
                >
                  创建
                </button>
                <button
                  type="button"
                  data-studio-regions-new-cancel="true"
                  disabled={creating}
                  onClick={() => setNewDocStem(null)}
                >
                  取消
                </button>
              </div>
            )}
        </nav>
        {draft === null ? <p>选择一个区域文档开始。</p> : (
          <div className={styles["regions-editor"]}>
            <div className={styles["regions-controls"]}>
              <span className={styles["topbar-scene"]}>
                {draft.label} · {snapshot.path ?? ""}
              </span>
              <button
                type="button"
                data-studio-regions-undo="true"
                disabled={!snapshot.canUndo || controlsDisabled}
                onClick={() => session.undo()}
              >
                撤销
              </button>
              <button
                type="button"
                data-studio-regions-redo="true"
                disabled={!snapshot.canRedo || controlsDisabled}
                onClick={() => session.redo()}
              >
                重做
              </button>
              <button
                type="button"
                data-studio-regions-discard="true"
                disabled={!dirty || controlsDisabled}
                onClick={() => session.discard()}
              >
                放弃修改
              </button>
              <button
                type="button"
                data-studio-regions-save="true"
                disabled={!dirty || controlsDisabled || blockingIssue !== null}
                onClick={save}
              >
                {busy ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                data-studio-regions-reload="true"
                disabled={controlsDisabled}
                onClick={() => {
                  const path = snapshot.path;
                  if (path !== null) requestOpenDocument(path);
                }}
              >
                重新加载
              </button>
            </div>
            {backdrop === null || previewTarget === null
              ? <p>先在上方场景工作区打开可编译的场景，画布才有预览背景。</p>
              : (
                <>
                  <label className={styles["field"]}>
                    <span>预览条目</span>
                    <select
                      data-studio-regions-backdrop="true"
                      value={backdropTag ?? ""}
                      onChange={(event) => setBackdropTag(event.target.value)}
                    >
                      {entryOptions.map((option) => (
                        <option key={option.tag} value={option.tag}>
                          {option.tag}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div
                    className={styles["canvas-clip"]}
                    data-studio-regions-canvas="true"
                    style={{
                      width: `${String(backdrop.canvas.width * scale)}px`,
                      height: `${String(backdrop.canvas.height * scale)}px`,
                    }}
                  >
                    <div
                      className={styles["canvas-scale"]}
                      style={{
                        width: `${String(backdrop.canvas.width)}px`,
                        height: `${String(backdrop.canvas.height)}px`,
                        transform: `scale(${String(scale)})`,
                      }}
                    >
                      <SemanticStageTargetHostV1
                        target={previewTarget}
                        renderers={props.renderers}
                        accessibleName={`区域预览 ${draft.label}`}
                        highlightHitRegions={true}
                        assets={hostAssets}
                        onHitRegionActivate={(activation) => selectRegionById(activation.regionId)}
                      />
                      <div className={styles["overlay"]}>
                        {selectedOverlay === null || selectedIndex === null ? null : (
                          <>
                            <button
                              type="button"
                              className={styles["region-box"]}
                              data-studio-region-box={String(selectedIndex)}
                              aria-label={`拖动区域 ${selectedRegion?.regionId ?? ""}`}
                              style={{
                                left: `${String(selectedOverlay.box.left)}px`,
                                top: `${String(selectedOverlay.box.top)}px`,
                                width: `${String(selectedOverlay.box.width)}px`,
                                height: `${String(selectedOverlay.box.height)}px`,
                              }}
                              {...dragHandleProps("move", selectedIndex, -1)}
                            />
                            <button
                              type="button"
                              className={styles["region-resize"]}
                              data-studio-region-resize={String(selectedIndex)}
                              aria-label={`调整区域大小 ${selectedRegion?.regionId ?? ""}`}
                              style={{
                                left: `${String(selectedOverlay.resizeAt.x)}px`,
                                top: `${String(selectedOverlay.resizeAt.y)}px`,
                              }}
                              {...dragHandleProps("resize", selectedIndex, -1)}
                            />
                            {selectedOverlay.vertices.map((vertex) => (
                              <button
                                key={`vertex:${String(vertex.index)}`}
                                type="button"
                                className={styles["region-vertex"]}
                                data-studio-region-vertex={String(vertex.index)}
                                aria-pressed={selectedVertex === vertex.index}
                                aria-label={`顶点 ${String(vertex.index + 1)}`}
                                style={{
                                  left: `${String(vertex.at.x)}px`,
                                  top: `${String(vertex.at.y)}px`,
                                }}
                                {...dragHandleProps("vertex", selectedIndex, vertex.index)}
                              />
                            ))}
                            {selectedOverlay.midpoints.map((midpoint) => (
                              <button
                                key={`midpoint:${String(midpoint.index)}`}
                                type="button"
                                className={styles["region-midpoint"]}
                                data-studio-region-add-vertex={String(midpoint.index)}
                                aria-label={`在边 ${String(midpoint.index + 1)} 上加顶点`}
                                style={{
                                  left: `${String(midpoint.at.x)}px`,
                                  top: `${String(midpoint.at.y)}px`,
                                }}
                                onClick={() => {
                                  const index = selectedIndex;
                                  editDraft((plain) => {
                                    insertVertexV1(plain, index, midpoint.index);
                                  });
                                }}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            <div className={styles["regions-panel"]}>
              <button
                type="button"
                data-studio-region-add="true"
                disabled={controlsDisabled || draft.regions.length >= 64}
                onClick={() => {
                  let addedIndex: number | null = null;
                  editDraft((plain) => {
                    addedIndex = addRegionV1(plain, seedRegionBoxV1(hostEntry));
                  });
                  if (addedIndex !== null) {
                    setSelectedIndex(addedIndex);
                    setSelectedVertex(null);
                  }
                }}
              >
                新增区域
              </button>
              <ul className={styles["regions-rows"]} data-studio-region-rows="true">
                {draft.regions.map((region, index) => {
                  const selected = index === selectedIndex;
                  return (
                    <li key={String(index)} data-studio-region-id={region.regionId}>
                      <button
                        type="button"
                        data-studio-region-row={String(index)}
                        aria-pressed={selected}
                        onClick={() => {
                          setSelectedIndex(selected ? null : index);
                          setSelectedVertex(null);
                        }}
                      >
                        {region.regionId}
                        {region.polygonPoints === undefined
                          ? ""
                          : `（${String(region.polygonPoints.length)} 顶点）`}
                      </button>
                      {!selected ? null : (
                        <div className={styles["regions-fields"]}>
                          <label className={styles["field"]}>
                            <span>区域 id</span>
                            <input
                              type="text"
                              data-studio-region-field="regionId"
                              value={region.regionId}
                              onChange={(event) =>
                                editDraft((plain) => {
                                  const target = plain.regions[index];
                                  if (target !== undefined) {
                                    target.regionId = event.target.value;
                                  }
                                }, `field:${String(index)}:regionId`)}
                            />
                          </label>
                          <label className={styles["field"]}>
                            <span>名称</span>
                            <input
                              type="text"
                              data-studio-region-field="accessibleNameText"
                              value={region.accessibleNameText}
                              onChange={(event) =>
                                editDraft((plain) => {
                                  const target = plain.regions[index];
                                  if (target !== undefined) {
                                    target.accessibleNameText = event.target.value;
                                  }
                                }, `field:${String(index)}:accessibleNameText`)}
                            />
                          </label>
                          {(["x", "y", "width", "height"] as const).map((axis) => (
                            <label key={axis} className={styles["field"]}>
                              <span>
                                {axis === "x"
                                  ? "X"
                                  : axis === "y"
                                  ? "Y"
                                  : axis === "width"
                                  ? "宽"
                                  : "高"}
                              </span>
                              <input
                                type="number"
                                data-studio-region-field={axis}
                                value={region[axis]}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  if (!Number.isFinite(value)) {
                                    return;
                                  }
                                  editDraft((plain) => {
                                    const target = plain.regions[index];
                                    if (target === undefined) {
                                      return;
                                    }
                                    if (axis === "x") {
                                      moveRegionV1(plain, index, value, target.y);
                                    } else if (axis === "y") {
                                      moveRegionV1(plain, index, target.x, value);
                                    } else if (axis === "width") {
                                      resizeRegionV1(plain, index, value, target.height);
                                    } else {
                                      resizeRegionV1(plain, index, target.width, value);
                                    }
                                  }, `field:${String(index)}:${axis}`);
                                }}
                              />
                            </label>
                          ))}
                          <label className={styles["field"]}>
                            <span>悬停资产</span>
                            <input
                              type="text"
                              data-studio-region-field="hoverAssetId"
                              value={(region.hoverAssetId as string | undefined) ?? ""}
                              onChange={(event) => {
                                const value = event.target.value.trim();
                                editDraft((plain) => {
                                  const target = plain.regions[index];
                                  if (target === undefined) return;
                                  if (value.length === 0) delete target.hoverAssetId;
                                  else target.hoverAssetId = value;
                                }, `field:${String(index)}:hoverAssetId`);
                              }}
                            />
                          </label>
                          <div className={styles["regions-row-actions"]}>
                            {region.polygonPoints === undefined
                              ? (
                                <button
                                  type="button"
                                  data-studio-region-polygon-seed="true"
                                  onClick={() =>
                                    editDraft((plain) => {
                                      seedPolygonV1(plain, index);
                                    })}
                                >
                                  转为多边形
                                </button>
                              )
                              : (
                                <button
                                  type="button"
                                  data-studio-region-polygon-clear="true"
                                  onClick={() => {
                                    setSelectedVertex(null);
                                    editDraft((plain) => {
                                      clearPolygonV1(plain, index);
                                    });
                                  }}
                                >
                                  还原矩形
                                </button>
                              )}
                            {region.polygonPoints === undefined || selectedVertex === null
                              ? null
                              : (
                                <button
                                  type="button"
                                  data-studio-region-vertex-delete="true"
                                  disabled={region.polygonPoints.length <= 3}
                                  onClick={() => {
                                    const vertexIndex = selectedVertex;
                                    setSelectedVertex(null);
                                    editDraft((plain) => {
                                      removeVertexV1(plain, index, vertexIndex);
                                    });
                                  }}
                                >
                                  删除顶点 {String(selectedVertex + 1)}
                                </button>
                              )}
                            <button
                              type="button"
                              data-studio-region-delete="true"
                              onClick={() => {
                                setSelectedIndex(null);
                                setSelectedVertex(null);
                                editDraft((plain) => {
                                  removeRegionV1(plain, index);
                                });
                              }}
                            >
                              删除区域
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The seed box for a new region: quarter-size and centered on the chosen
 * entry's content box when geometry is declared; a fixed anchor-relative
 * square otherwise (regions live in the entry's anchor space).
 */
function seedRegionBoxV1(
  hostEntry: { readonly geometry?: StageContentGeometryV1 } | null,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const geometry = hostEntry?.geometry;
  if (geometry === undefined) {
    return { x: -100, y: -200, width: 200, height: 200 };
  }
  const anchorX = Math.round((geometry.width * geometry.anchorXPermille) / 1000);
  const anchorY = Math.round((geometry.height * geometry.anchorYPermille) / 1000);
  const width = Math.max(1, Math.round(geometry.width / 4));
  const height = Math.max(1, Math.round(geometry.height / 4));
  return {
    x: Math.round(geometry.width / 2) - anchorX - Math.round(width / 2),
    y: Math.round(geometry.height / 2) - anchorY - Math.round(height / 2),
    width,
    height,
  };
}
