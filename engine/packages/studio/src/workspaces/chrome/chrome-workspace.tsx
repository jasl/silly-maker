// SPDX-License-Identifier: MIT
import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from "react";

import type { ChromeLayoutDocumentV1 } from "@sillymaker/base";
import { useAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";
import type { AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type {
  ChromeLayoutIoListEntryV1,
  ChromeLayoutIoListSkipV1,
  ChromeLayoutSourceIoV1,
} from "../../core/chrome-layout-io.ts";
import type { AuthoringHostInternalV1 } from "../../core/authoring-host.ts";
import { resolveAuthoringHostOwnerInternalV1 } from "../../core/authoring-host.ts";
import type { StudioChromeFixtureV1 } from "../../core/binding.ts";
import { saveWithConflictRefreshInternalV1 } from "../../core/save-conflict.ts";
import {
  addAnchorV1,
  addBoxV1,
  addOffsetV1,
  chromeLayoutDraftBlockingIssueV1,
  editChromeLayoutDocumentV1,
  graduateChromeLayoutDocumentV1,
  inferChromeLayoutIdPrefixV1,
  moveAnchorV1,
  moveBoxV1,
  newChromeLayoutDocumentV1,
  removeEntryV1,
  renameEntryV1,
  resizeBoxV1,
  setOffsetV1,
} from "./chrome-edit.ts";
import type { ChromeLayoutPlainDocumentV1, ChromeLayoutSectionV1 } from "./chrome-edit.ts";
import styles from "../../studio-app.module.css";

/**
 * The Chrome workspace (authorable-chrome-layout M2): list/create/open
 * `sillymaker.chrome-layout` documents over the dev-server port, drag
 * boxes and anchors on the document's own logical canvas, and CAS-save
 * through the same shared authoring session discipline as scenes,
 * motions, and regions. When the Story's binding declares a chrome
 * fixture for the open layoutId, the fixture's real chrome tree renders
 * under the handles (pointer-events disabled, render failures isolated);
 * otherwise the wireframe alone is the preview — the document stays
 * fully editable either way.
 */

export interface ChromeWorkspaceSectionPropsV1 {
  readonly io: ChromeLayoutSourceIoV1;
  /** The shell-owned session shared by visible and staging publication epochs. */
  readonly session: AuthoringDocumentSessionV1<ChromeLayoutDocumentV1>;
  /** Story-declared preview fixtures, matched to documents by layoutId. */
  readonly fixtures: readonly StudioChromeFixtureV1[];
  /** The story segment for new document ids (from the scene id prefix). */
  readonly storyHint: string | null;
  /** Stable Host close gate; omitted only by focused workspace tests. */
  readonly host?: AuthoringHostInternalV1;
  readonly publicationRole?: "visible" | "probe";
}

interface ChromeDragV1 {
  readonly pointerId: number;
  readonly mode: "move-box" | "resize-box" | "move-anchor";
  readonly name: string;
  readonly gesture: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly start: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

interface ChromeSelectionV1 {
  readonly section: ChromeLayoutSectionV1;
  readonly name: string;
}

const chromePreviewMaxWidthV1 = 720;

function chromeSaveNoteV1(code: string): string {
  return code === "digest_conflict"
    ? "文件已被其他编辑更改；已刷新保存基线并保留当前草稿，请检查后再次保存。"
    : `保存失败：${code}`;
}

/**
 * Isolates a Story fixture's render failure: a chrome component that
 * throws (for example over a renamed entry it still reads) reports
 * inline and leaves the wireframe editable instead of taking the
 * workspace down.
 */
class ChromeFixtureBoundaryV1 extends Component<
  { readonly children: ReactNode; readonly onError: () => void },
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(): void {
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Defers the fixture call into a child render so a throwing fixture is
 * caught by the boundary above (an eager `fixture.render(...)` in the
 * workspace's own render would crash the whole shell instead).
 */
function ChromeFixtureRenderV1(props: {
  readonly fixture: StudioChromeFixtureV1;
  readonly layout: Parameters<StudioChromeFixtureV1["render"]>[0];
}): ReactNode {
  return props.fixture.render(props.layout);
}

export function ChromeWorkspaceSectionV1(props: ChromeWorkspaceSectionPropsV1): ReactElement {
  const { io, session, fixtures } = props;
  const [documents, setDocuments] = useState<readonly ChromeLayoutIoListEntryV1[] | null>(null);
  const [skips, setSkips] = useState<readonly ChromeLayoutIoListSkipV1[]>(() => Object.freeze([]));
  const [revision, setRevision] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [confirmSwitch, setConfirmSwitch] = useState<{ readonly path: string } | null>(null);
  const [selection, setSelection] = useState<ChromeSelectionV1 | null>(null);
  const [fixtureFailed, setFixtureFailed] = useState(false);
  const [fixtureRetry, setFixtureRetry] = useState(0);
  const [newDocStem, setNewDocStem] = useState<string | null>(null);
  const [newDocLabel, setNewDocLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const snapshot = useAuthoringDocumentSessionV1(session);
  const draft = snapshot.draft;
  const dirty = snapshot.dirty;
  const busy = snapshot.saving;
  const loading = snapshot.loading;

  useEffect(() => {
    if (props.publicationRole === "probe") return undefined;
    let active = true;
    void io.list().then((result) => {
      if (!active) return;
      if (result.kind !== "ok") {
        setDocuments(Object.freeze([]));
        setNote(`界面布局文档列表不可用：${result.code}`);
        return;
      }
      setDocuments(result.chromeLayouts);
      setSkips(result.skipped);
    });
    return () => {
      active = false;
    };
  }, [io, props.publicationRole, revision]);

  const openDocument = useCallback((path: string): void => {
    setNote(null);
    setConfirmSwitch(null);
    void session.open(path).then((result) => {
      if (result.kind === "stale") return;
      if (result.kind === "error") {
        setNote(`读取界面布局文档失败：${result.code}`);
        return;
      }
      setSelection(null);
      setFixtureFailed(false);
      setFixtureRetry(0);
    });
  }, [session]);

  // The first listed document opens automatically (same shape as scenes
  // and regions: a failed first open never retries on its own).
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (
      props.publicationRole === "probe" ||
      autoOpenedRef.current || documents === null || documents.length === 0 ||
      snapshot.path !== null || documents[0] === undefined
    ) {
      return;
    }
    autoOpenedRef.current = true;
    openDocument(documents[0].path);
  }, [documents, snapshot.path, openDocument, props.publicationRole]);

  const requestOpenDocument = useCallback((path: string): void => {
    if (dirty) {
      setConfirmSwitch({ path });
      return;
    }
    openDocument(path);
  }, [dirty, openDocument]);

  // The save gate is Document admission itself, re-run over the draft.
  const blockingIssue = useMemo(
    () => (draft === null ? null : chromeLayoutDraftBlockingIssueV1(draft)),
    [draft],
  );

  const editDraft = useCallback(
    (mutate: (plain: ChromeLayoutPlainDocumentV1) => void, coalesceKey?: string): void => {
      const current = session.getSnapshot().draft;
      if (current === null) return;
      session.replaceDraft(
        editChromeLayoutDocumentV1(current, mutate),
        coalesceKey === undefined ? {} : { coalesceKey },
      );
    },
    [session],
  );

  const saveDocument = useCallback(async (): Promise<boolean> => {
    const current = session.getSnapshot().draft;
    if (current === null) return false;
    setNote(null);
    const result = await saveWithConflictRefreshInternalV1(session, {
      document: graduateChromeLayoutDocumentV1(current),
    });
    if (result.save.kind === "ok") {
      setNote("已保存；运行中的游戏会热更新。");
      return !session.getSnapshot().dirty;
    }
    if (result.save.kind === "error") {
      if (result.save.code === "digest_conflict" && result.refresh?.kind === "error") {
        setNote(`保存冲突，且刷新保存基线失败：${result.refresh.code}`);
      } else {
        setNote(chromeSaveNoteV1(result.save.code));
      }
    }
    return false;
  }, [session]);

  const save = useCallback((): void => {
    void saveDocument();
  }, [saveDocument]);

  const hostOwner = props.host === undefined
    ? null
    : resolveAuthoringHostOwnerInternalV1(props.host);
  useEffect(() => {
    if (hostOwner === null || props.publicationRole === "probe") return undefined;
    return hostOwner.registerCloseParticipant(
      "chrome",
      Object.freeze({
        getState: () => {
          const current = session.getSnapshot();
          return Object.freeze({
            dirty: current.dirty,
            busy: current.loading || current.saving || creating,
            canSave: current.path !== null && current.digest !== null && blockingIssue === null,
          });
        },
        subscribe: session.subscribe,
        save: saveDocument,
        discard: session.discard,
      }),
    );
  }, [blockingIssue, creating, hostOwner, props.publicationRole, saveDocument, session]);

  const confirmSaveAndOpen = useCallback((): void => {
    if (confirmSwitch === null || busy || blockingIssue !== null) return;
    const path = confirmSwitch.path;
    void saveDocument().then((saved) => {
      if (saved) openDocument(path);
    });
  }, [blockingIssue, busy, confirmSwitch, openDocument, saveDocument]);

  const layoutIdPrefix = useMemo(
    () =>
      inferChromeLayoutIdPrefixV1(
        (documents ?? []).map((entry) => entry.layoutId),
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
    const chromeLayoutDocument = newChromeLayoutDocumentV1({
      layoutId: `${layoutIdPrefix}${stem}`,
      label: label.length === 0 ? stem : label,
      canvas: { width: 1024, height: 576 },
    });
    const path = `src/chrome/${stem}.chrome-layout.json`;
    setCreating(true);
    void io.create({ path, chromeLayoutDocument }).then((result) => {
      setCreating(false);
      if (result.kind === "error") {
        setNote(
          result.code === "already_exists"
            ? "同名界面布局文档已存在。"
            : `新建界面布局文档失败：${result.code}`,
        );
        return;
      }
      setNewDocStem(null);
      setNewDocLabel("");
      setRevision((current) => current + 1);
      setNote(`已创建 ${path}。`);
      requestOpenDocument(path);
    });
  }, [creating, io, newDocLabel, newDocStem, layoutIdPrefix, requestOpenDocument]);

  // ---- The fixture preview -------------------------------------------------

  const fixture = useMemo(
    () =>
      (draft === null ? null : fixtures.find((entry) => entry.layoutId === draft.layoutId)) ??
        null,
    [draft, fixtures],
  );

  // Chrome documents carry their own canvas; the preview scale follows the
  // scene workspace's convention (CSS px per logical px, capped at 1).
  const scale = draft === null
    ? 1
    : Math.min(1, chromePreviewMaxWidthV1 / Math.max(1, draft.canvas.width));

  // ---- Drag gestures -------------------------------------------------------

  const dragRef = useRef<ChromeDragV1 | null>(null);
  const gestureRef = useRef(0);

  const onHandlePointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    mode: ChromeDragV1["mode"],
    name: string,
  ): void => {
    if (event.button !== 0 || draft === null) return;
    let start: ChromeDragV1["start"];
    if (mode === "move-anchor") {
      const anchor = draft.anchors[name];
      if (anchor === undefined) return;
      start = { x: anchor.x, y: anchor.y, width: 0, height: 0 };
    } else {
      const box = draft.boxes[name];
      if (box === undefined) return;
      start = { x: box.x, y: box.y, width: box.width, height: box.height };
    }
    event.preventDefault();
    event.stopPropagation();
    setSelection({ section: mode === "move-anchor" ? "anchors" : "boxes", name });
    gestureRef.current += 1;
    dragRef.current = {
      pointerId: event.pointerId,
      mode,
      name,
      gesture: gestureRef.current,
      startClientX: event.clientX,
      startClientY: event.clientY,
      start,
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId || scale === 0) return;
    // Pointer deltas → canvas logical px: chrome geometry lives directly in
    // the document's canvas space (no entry placement, unlike regions).
    const deltaX = (event.clientX - drag.startClientX) / scale;
    const deltaY = (event.clientY - drag.startClientY) / scale;
    const key = `chrome-${drag.mode}:${drag.name}:${String(drag.gesture)}`;
    if (drag.mode === "move-box") {
      editDraft((plain) => {
        moveBoxV1(plain, drag.name, drag.start.x + deltaX, drag.start.y + deltaY);
      }, key);
      return;
    }
    if (drag.mode === "resize-box") {
      editDraft((plain) => {
        resizeBoxV1(plain, drag.name, drag.start.width + deltaX, drag.start.height + deltaY);
      }, key);
      return;
    }
    editDraft((plain) => {
      moveAnchorV1(plain, drag.name, drag.start.x + deltaX, drag.start.y + deltaY);
    }, key);
  };

  const onHandlePointerEnd = (event: ReactPointerEvent<HTMLElement>): void => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
  };

  const dragHandleProps = (mode: ChromeDragV1["mode"], name: string): {
    onPointerDown(event: ReactPointerEvent<HTMLElement>): void;
    onPointerMove(event: ReactPointerEvent<HTMLElement>): void;
    onPointerUp(event: ReactPointerEvent<HTMLElement>): void;
    onPointerCancel(event: ReactPointerEvent<HTMLElement>): void;
  } => ({
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) =>
      onHandlePointerDown(event, mode, name),
    onPointerMove: onHandlePointerMove,
    onPointerUp: onHandlePointerEnd,
    onPointerCancel: onHandlePointerEnd,
  });

  // ---- Rendering -----------------------------------------------------------

  const controlsDisabled = busy || loading || creating;
  const selectedBox = selection?.section === "boxes" && draft !== null
    ? draft.boxes[selection.name] ?? null
    : null;

  return (
    <div className={styles["workbench"]} data-studio-chrome="true">
      <h2>界面布局文档</h2>
      {note === null
        ? null
        : (
          <p className={styles["note"]} role="status" data-studio-chrome-note="true">
            {note}
          </p>
        )}
      {confirmSwitch === null ? null : (
        <div
          className={styles["confirm"]}
          role="alertdialog"
          aria-label="未保存的界面布局修改"
          data-studio-chrome-confirm="true"
        >
          <p>当前界面布局文档有未保存的修改。先保存，还是放弃这些修改？</p>
          <div className={styles["confirm-actions"]}>
            <button
              type="button"
              data-studio-chrome-confirm-save="true"
              disabled={busy || blockingIssue !== null}
              onClick={confirmSaveAndOpen}
            >
              保存并继续
            </button>
            <button
              type="button"
              data-studio-chrome-confirm-discard="true"
              disabled={busy}
              onClick={() => {
                if (confirmSwitch !== null) openDocument(confirmSwitch.path);
              }}
            >
              放弃修改
            </button>
            <button
              type="button"
              data-studio-chrome-confirm-cancel="true"
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
          <div className={styles["diagnostics"]} data-studio-chrome-diagnostics="true">
            {blockingIssue === null ? null : (
              <p data-studio-diagnostic="blocking">
                阻断：界面布局文档未通过校验——{blockingIssue}（保存已禁用）
              </p>
            )}
            {skips.map((skip) => (
              <p key={skip.path} data-studio-diagnostic="warning">
                警告：界面布局文件未索引（{skip.path}）：{skip.reason}
              </p>
            ))}
          </div>
        )}
      <div className={styles["regions-body"]}>
        <nav aria-label="界面布局文档列表" className={styles["navigator"]}>
          {documents === null
            ? <p>加载中…</p>
            : documents.length === 0
            ? <p>没有 *.chrome-layout.json</p>
            : (
              <ul data-studio-chrome-docs="true">
                {documents.map((entry) => (
                  <li key={entry.path}>
                    <button
                      type="button"
                      data-studio-chrome-doc={entry.layoutId}
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
                data-studio-chrome-new="true"
                disabled={creating}
                onClick={() => setNewDocStem("")}
              >
                新建界面布局文档
              </button>
            )
            : (
              <div className={styles["new-scene"]} data-studio-chrome-new-form="true">
                <label className={styles["field"]}>
                  <span>名称（{layoutIdPrefix}…）</span>
                  <input
                    type="text"
                    data-studio-chrome-new-stem="true"
                    value={newDocStem}
                    onChange={(event) => setNewDocStem(event.target.value)}
                  />
                </label>
                <label className={styles["field"]}>
                  <span>标题</span>
                  <input
                    type="text"
                    data-studio-chrome-new-label="true"
                    value={newDocLabel}
                    onChange={(event) => setNewDocLabel(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  data-studio-chrome-new-create="true"
                  disabled={creating || newDocStem.trim().length === 0}
                  onClick={createDocument}
                >
                  创建
                </button>
                <button
                  type="button"
                  data-studio-chrome-new-cancel="true"
                  disabled={creating}
                  onClick={() => setNewDocStem(null)}
                >
                  取消
                </button>
              </div>
            )}
        </nav>
        {draft === null
          ? <p>选择一个界面布局文档开始。</p>
          : (
            <div className={styles["regions-editor"]}>
              <div className={styles["regions-controls"]}>
                <span className={styles["topbar-scene"]}>
                  {draft.label} · {snapshot.path ?? ""}
                </span>
                <button
                  type="button"
                  data-studio-chrome-undo="true"
                  disabled={!snapshot.canUndo || controlsDisabled}
                  onClick={() => session.undo()}
                >
                  撤销
                </button>
                <button
                  type="button"
                  data-studio-chrome-redo="true"
                  disabled={!snapshot.canRedo || controlsDisabled}
                  onClick={() => session.redo()}
                >
                  重做
                </button>
                <button
                  type="button"
                  data-studio-chrome-discard="true"
                  disabled={!dirty || controlsDisabled}
                  onClick={() => session.discard()}
                >
                  放弃修改
                </button>
                <button
                  type="button"
                  data-studio-chrome-save="true"
                  disabled={!dirty || controlsDisabled || blockingIssue !== null}
                  onClick={save}
                >
                  {busy ? "保存中…" : "保存"}
                </button>
                <button
                  type="button"
                  data-studio-chrome-reload="true"
                  disabled={controlsDisabled}
                  onClick={() => {
                    const path = snapshot.path;
                    if (path !== null) requestOpenDocument(path);
                  }}
                >
                  重新加载
                </button>
              </div>
              {fixtureFailed
                ? (
                  <p className={styles["note"]} data-studio-chrome-fixture-error="true">
                    预览夹具渲染失败——继续以线框编辑。
                    <button
                      type="button"
                      data-studio-chrome-fixture-retry="true"
                      onClick={() => {
                        setFixtureFailed(false);
                        setFixtureRetry((current) => current + 1);
                      }}
                    >
                      重试预览
                    </button>
                  </p>
                )
                : null}
              <div
                className={styles["canvas-clip"]}
                data-studio-chrome-canvas="true"
                style={{
                  width: `${String(draft.canvas.width * scale)}px`,
                  height: `${String(draft.canvas.height * scale)}px`,
                }}
              >
                <div
                  className={styles["canvas-scale"]}
                  style={{
                    width: `${String(draft.canvas.width)}px`,
                    height: `${String(draft.canvas.height)}px`,
                    transform: `scale(${String(scale)})`,
                  }}
                >
                  {fixture === null || fixtureFailed
                    ? null
                    : (
                      <div className={styles["chrome-fixture"]} data-studio-chrome-fixture="true">
                        <ChromeFixtureBoundaryV1
                          key={`${snapshot.path ?? ""}:${String(fixtureRetry)}`}
                          onError={() => setFixtureFailed(true)}
                        >
                          <ChromeFixtureRenderV1 fixture={fixture} layout={draft} />
                        </ChromeFixtureBoundaryV1>
                      </div>
                    )}
                  <div className={styles["overlay"]}>
                    {Object.entries(draft.boxes).map(([name, box]) => (
                      <button
                        key={`box:${name}`}
                        type="button"
                        className={styles["chrome-box"]}
                        data-studio-chrome-box={name}
                        aria-pressed={selection?.section === "boxes" && selection.name === name}
                        aria-label={`拖动盒 ${name}`}
                        style={{
                          left: `${String(box.x)}px`,
                          top: `${String(box.y)}px`,
                          width: `${String(box.width)}px`,
                          height: `${String(box.height)}px`,
                        }}
                        {...dragHandleProps("move-box", name)}
                      >
                        <span className={styles["chrome-box-label"]}>{name}</span>
                      </button>
                    ))}
                    {selection?.section === "boxes" && selectedBox !== null
                      ? (
                        <button
                          type="button"
                          className={styles["region-resize"]}
                          data-studio-chrome-resize={selection.name}
                          aria-label={`调整盒大小 ${selection.name}`}
                          style={{
                            left: `${String(selectedBox.x + selectedBox.width)}px`,
                            top: `${String(selectedBox.y + selectedBox.height)}px`,
                          }}
                          {...dragHandleProps("resize-box", selection.name)}
                        />
                      )
                      : null}
                    {Object.entries(draft.anchors).map(([name, anchor]) => (
                      <button
                        key={`anchor:${name}`}
                        type="button"
                        className={styles["chrome-anchor"]}
                        data-studio-chrome-anchor={name}
                        aria-pressed={selection?.section === "anchors" && selection.name === name}
                        aria-label={`拖动锚点 ${name}`}
                        style={{
                          left: `${String(anchor.x)}px`,
                          top: `${String(anchor.y)}px`,
                        }}
                        {...dragHandleProps("move-anchor", name)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <ChromeEntryPanelV1
                draft={draft}
                selection={selection}
                controlsDisabled={controlsDisabled}
                onSelect={setSelection}
                editDraft={editDraft}
              />
            </div>
          )}
      </div>
    </div>
  );
}

// ---- The entry panel -------------------------------------------------------

interface ChromeEntryPanelPropsV1 {
  readonly draft: {
    readonly boxes: Readonly<
      Record<
        string,
        {
          readonly x: number;
          readonly y: number;
          readonly width: number;
          readonly height: number;
        }
      >
    >;
    readonly anchors: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
    readonly offsets: Readonly<Record<string, number>>;
  };
  readonly selection: ChromeSelectionV1 | null;
  readonly controlsDisabled: boolean;
  onSelect(selection: ChromeSelectionV1 | null): void;
  editDraft(mutate: (plain: ChromeLayoutPlainDocumentV1) => void, coalesceKey?: string): void;
}

function ChromeEntryPanelV1(props: ChromeEntryPanelPropsV1): ReactElement {
  const { draft, selection, controlsDisabled, onSelect, editDraft } = props;

  const numberField = (
    section: ChromeLayoutSectionV1,
    name: string,
    fieldLabel: string,
    field: string,
    value: number,
    apply: (plain: ChromeLayoutPlainDocumentV1, next: number) => void,
  ): ReactElement => (
    <label key={field} className={styles["field"]}>
      <span>{fieldLabel}</span>
      <input
        type="number"
        data-studio-chrome-field={field}
        value={value}
        onChange={(event) => {
          const next = event.currentTarget.value === "" ? 0 : event.currentTarget.valueAsNumber;
          if (!Number.isFinite(next)) return;
          editDraft((plain) => {
            apply(plain, next);
          }, `field:${section}:${name}:${field}`);
        }}
      />
    </label>
  );

  const entryRow = (
    section: ChromeLayoutSectionV1,
    name: string,
    summary: string,
    fields: readonly ReactElement[],
  ): ReactElement => {
    const selected = selection?.section === section && selection.name === name;
    return (
      <li key={`${section}:${name}`} data-studio-chrome-entry={`${section}:${name}`}>
        <button
          type="button"
          data-studio-chrome-row={`${section}:${name}`}
          aria-pressed={selected}
          onClick={() => onSelect(selected ? null : { section, name })}
        >
          {name}（{summary}）
        </button>
        {!selected ? null : (
          <div className={styles["regions-fields"]}>
            <ChromeRenameFieldV1
              section={section}
              name={name}
              onRename={(to) => {
                const taken = Object.hasOwn(draft.boxes, to) ||
                  Object.hasOwn(draft.anchors, to) || Object.hasOwn(draft.offsets, to);
                if (taken) return;
                editDraft((plain) => {
                  renameEntryV1(plain, section, name, to);
                });
                onSelect({ section, name: to });
              }}
            />
            {fields}
            <div className={styles["regions-row-actions"]}>
              <button
                type="button"
                data-studio-chrome-delete="true"
                disabled={controlsDisabled}
                onClick={() => {
                  onSelect(null);
                  editDraft((plain) => {
                    removeEntryV1(plain, section, name);
                  });
                }}
              >
                删除
              </button>
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={styles["regions-panel"]}>
      <div className={styles["regions-row-actions"]}>
        <button
          type="button"
          data-studio-chrome-add-box="true"
          disabled={controlsDisabled}
          onClick={() => {
            let added: string | null = null;
            editDraft((plain) => {
              added = addBoxV1(plain);
            });
            if (added !== null) onSelect({ section: "boxes", name: added });
          }}
        >
          新增盒
        </button>
        <button
          type="button"
          data-studio-chrome-add-anchor="true"
          disabled={controlsDisabled}
          onClick={() => {
            let added: string | null = null;
            editDraft((plain) => {
              added = addAnchorV1(plain);
            });
            if (added !== null) onSelect({ section: "anchors", name: added });
          }}
        >
          新增锚点
        </button>
        <button
          type="button"
          data-studio-chrome-add-offset="true"
          disabled={controlsDisabled}
          onClick={() => {
            let added: string | null = null;
            editDraft((plain) => {
              added = addOffsetV1(plain);
            });
            if (added !== null) onSelect({ section: "offsets", name: added });
          }}
        >
          新增偏移
        </button>
      </div>
      <ul className={styles["regions-rows"]} data-studio-chrome-rows="true">
        {Object.entries(draft.boxes).map(([name, box]) =>
          entryRow(
            "boxes",
            name,
            `盒 ${String(box.x)},${String(box.y)} ${String(box.width)}×${String(box.height)}`,
            [
              numberField("boxes", name, "X", "x", box.x, (plain, next) => {
                const target = plain.boxes[name];
                if (target !== undefined) moveBoxV1(plain, name, next, target.y);
              }),
              numberField("boxes", name, "Y", "y", box.y, (plain, next) => {
                const target = plain.boxes[name];
                if (target !== undefined) moveBoxV1(plain, name, target.x, next);
              }),
              numberField("boxes", name, "宽", "width", box.width, (plain, next) => {
                const target = plain.boxes[name];
                if (target !== undefined) resizeBoxV1(plain, name, next, target.height);
              }),
              numberField("boxes", name, "高", "height", box.height, (plain, next) => {
                const target = plain.boxes[name];
                if (target !== undefined) resizeBoxV1(plain, name, target.width, next);
              }),
            ],
          )
        )}
        {Object.entries(draft.anchors).map(([name, anchor]) =>
          entryRow(
            "anchors",
            name,
            `锚点 ${String(anchor.x)},${String(anchor.y)}`,
            [
              numberField("anchors", name, "X", "x", anchor.x, (plain, next) => {
                const target = plain.anchors[name];
                if (target !== undefined) moveAnchorV1(plain, name, next, target.y);
              }),
              numberField("anchors", name, "Y", "y", anchor.y, (plain, next) => {
                const target = plain.anchors[name];
                if (target !== undefined) moveAnchorV1(plain, name, target.x, next);
              }),
            ],
          )
        )}
        {Object.entries(draft.offsets).map(([name, value]) =>
          entryRow(
            "offsets",
            name,
            `偏移 ${String(value)}`,
            [
              numberField("offsets", name, "值", "value", value, (plain, next) => {
                setOffsetV1(plain, name, next);
              }),
            ],
          )
        )}
      </ul>
    </div>
  );
}

/**
 * Renaming commits on blur or Enter (not per keystroke): entry names are
 * record keys, so live renames would remount the row and lose focus,
 * and transient collisions could silently merge entries.
 */
function ChromeRenameFieldV1(props: {
  readonly section: ChromeLayoutSectionV1;
  readonly name: string;
  onRename(to: string): void;
}): ReactElement {
  const [pending, setPending] = useState(props.name);
  useEffect(() => {
    setPending(props.name);
  }, [props.name]);
  const commit = (): void => {
    const next = pending.trim();
    if (next.length === 0 || next === props.name) {
      setPending(props.name);
      return;
    }
    props.onRename(next);
  };
  return (
    <label className={styles["field"]}>
      <span>名称</span>
      <input
        type="text"
        data-studio-chrome-field="name"
        value={pending}
        onChange={(event) => setPending(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
      />
    </label>
  );
}
