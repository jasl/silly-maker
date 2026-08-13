// SPDX-License-Identifier: MIT
/**
 * Story-hosted debug dock: the collapsed chip a game mounts when it hides
 * the built-in DevDock chip (`devDockChip: false`). Engine tool windows,
 * freeze, and session maintenance live here; the Story only supplies
 * visibility, a stats `info` slot, and which panels to launch.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  formatVersionStampV1,
  readVersionStampV1,
  type RuntimeCapabilityPortV1,
} from "@sillymaker/base";

import type { PresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import { Button } from "../primitives/button.tsx";
import type { DevDockControlV1 } from "./dev-dock-control.ts";
import {
  defaultSessionMaintenanceLabelsV1,
  sessionMaintenanceImportNoteV1,
  type SessionMaintenanceLabelsV1,
} from "./session-maintenance-panel.tsx";
import styles from "./story-debug-dock.module.css";

export interface StoryDebugDockToolV1 {
  readonly panelId: string;
  readonly label: string;
  readonly openedNote?: string;
}

export interface StoryDebugDockLabelsV1 extends SessionMaintenanceLabelsV1 {
  readonly chipLabel: string;
  readonly freezeLabel: string;
  readonly resumeLabel: string;
  readonly freezeNote: string;
  readonly resumeNote: string;
  readonly toolOpenedNote: string;
  readonly wipeDialogTitle: string;
  readonly wipeDialogDescription: string;
  readonly wipeBackdropLabel: string;
}

export const defaultStoryDebugDockLabelsV1: StoryDebugDockLabelsV1 = Object.freeze({
  ...defaultSessionMaintenanceLabelsV1,
  chipLabel: "调试",
  freezeLabel: "冻结画面",
  resumeLabel: "恢复画面",
  freezeNote: "画面已冻结——动画与 gameplay 输入暂停，调试点击照常。",
  resumeNote: "画面已恢复。",
  toolOpenedNote: "已打开工具窗口（拖动标题栏可移动，Esc 关闭）。",
  exportStateLabel: "导出状态",
  importStateLabel: "导入状态",
  wipeLabel: "清理本地库",
  wipeConfirmLabel: "确认清库",
  wipeCancelLabel: "取消",
  reinitializeLabel: "重新初始化",
  exportDoneText: "已导出状态 JSON（在下载文件夹）。",
  importDoneText: "状态已导入。",
  importIncompatibleText: "该状态与当前游戏/版本不兼容，已拒绝导入——当前会话未受影响。",
  importInvalidText: "文件不是有效的引擎存档（损坏或被改动过），已拒绝导入。",
  wipeDoneText: "已清库。",
  wipeDialogTitle: "清理全部本地存档？",
  wipeDialogDescription: "会清空本机上这个游戏的全部存档栏位。进行中的会话也会受影响。",
  wipeBackdropLabel: "取消清理本地库",
});

export interface StoryDebugDockPropsV1 {
  /** Story owns default-on vs capability gating. */
  readonly visible: boolean;
  readonly portalTarget: Element;
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly control: DevDockControlV1;
  readonly presentationFreeze?: PresentationFreezePortV1;
  readonly savePort?: SaveOverlayPortV1;
  /** Engine Core wipe (autosave drain + partial failure). */
  readonly clearAllSaves?: () => Promise<void>;
  readonly onReinitialize?: () => void | Promise<unknown>;
  /** After a successful wipe (reload, return to title, …). */
  readonly onWiped?: () => void;
  /** Game-specific live stats; the dock never reads Story state itself. */
  readonly info?: ReactNode;
  readonly tools?: readonly StoryDebugDockToolV1[];
  readonly labels?: Partial<StoryDebugDockLabelsV1>;
  /** First engine-tool click enables `debug_tools` + `cheats` (default true). */
  readonly grantCapabilitiesOnOpen?: boolean;
}

function failureNoteV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function StoryDebugDockWipeDialogV1(props: {
  readonly busy: boolean;
  readonly labels: StoryDebugDockLabelsV1;
  onConfirm(): void;
  onCancel(): void;
}): ReactElement {
  const { busy, onCancel } = props;
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (!busy) onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [busy, onCancel]);

  return (
    <div className={styles["story-debug-dock__wipe"]} data-debug-dock-wipe-dialog="true">
      <button
        type="button"
        className={styles["story-debug-dock__wipe-backdrop"]}
        aria-label={props.labels.wipeBackdropLabel}
        data-debug-dock-wipe-backdrop="true"
        disabled={busy}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="story-debug-dock-wipe-title"
        aria-describedby="story-debug-dock-wipe-description"
        tabIndex={-1}
        className={styles["story-debug-dock__wipe-dialog"]}
      >
        <strong id="story-debug-dock-wipe-title">{props.labels.wipeDialogTitle}</strong>
        <p
          id="story-debug-dock-wipe-description"
          className={styles["story-debug-dock__wipe-description"]}
        >
          {props.labels.wipeDialogDescription}
        </p>
        <div className={styles["story-debug-dock__wipe-actions"]}>
          <Button
            data-debug-dock-action="wipe_confirm"
            disabled={busy}
            onClick={props.onConfirm}
          >
            {busy
              ? `${props.labels.wipeConfirmLabel}${props.labels.busySuffix}`
              : props.labels.wipeConfirmLabel}
          </Button>
          <Button
            data-debug-dock-action="wipe_cancel"
            disabled={busy}
            onClick={onCancel}
          >
            {props.labels.wipeCancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StoryDebugDockV1(props: StoryDebugDockPropsV1): ReactElement | null {
  const labels = { ...defaultStoryDebugDockLabelsV1, ...props.labels };
  const grantOnOpen = props.grantCapabilitiesOnOpen !== false;
  const [busy, setBusy] = useState<"export" | "import" | "wipe" | "reinitialize" | null>(null);
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const capabilityState = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const frozen = useSyncExternalStore(
    props.presentationFreeze?.state.subscribe ?? (() => () => undefined),
    () => props.presentationFreeze?.state.getCurrent().frozen ?? false,
    () => props.presentationFreeze?.state.getCurrent().frozen ?? false,
  );
  const versionLine = formatVersionStampV1(readVersionStampV1());
  const tools = props.tools ?? [];

  const { clearAllSaves, onWiped } = props;
  const closeWipeConfirm = useCallback((): void => {
    if (busy === "wipe") return;
    setWipeConfirm(false);
  }, [busy]);

  const confirmWipe = useCallback((): void => {
    if (busy !== null || clearAllSaves === undefined) return;
    setBusy("wipe");
    setNote(null);
    void clearAllSaves()
      .then(() => {
        setWipeConfirm(false);
        setNote(labels.wipeDoneText);
        onWiped?.();
      })
      .catch((error: unknown) => {
        setWipeConfirm(false);
        setNote(failureNoteV1(error));
      })
      .finally(() => setBusy(null));
  }, [busy, clearAllSaves, labels.wipeDoneText, onWiped]);

  if (!props.visible) return null;

  return createPortal(
    <>
      <details
        className={styles["story-debug-dock"]}
        data-debug-dock="true"
        data-story-debug-dock="true"
        open={expanded}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary
          className={styles["story-debug-dock__chip"]}
          data-debug-dock-toggle="true"
        >
          {labels.chipLabel}
        </summary>
        <div className={styles["story-debug-dock__panel"]}>
          {props.info === undefined
            ? null
            : <div className={styles["story-debug-dock__info"]}>{props.info}</div>}
          <div className={styles["story-debug-dock__actions"]} data-debug-dock-actions="true">
            {props.onReinitialize === undefined ? null : (
              <Button
                data-debug-dock-action="reinitialize"
                disabled={busy !== null}
                onClick={() => {
                  closeWipeConfirm();
                  setBusy("reinitialize");
                  setNote(null);
                  void Promise.resolve()
                    .then(() => props.onReinitialize?.())
                    .catch((error: unknown) => setNote(failureNoteV1(error)))
                    .finally(() => setBusy(null));
                }}
              >
                {busy === "reinitialize"
                  ? `${labels.reinitializeLabel}${labels.busySuffix}`
                  : labels.reinitializeLabel}
              </Button>
            )}
            {props.savePort === undefined ? null : (
              <Button
                data-debug-dock-action="export_state"
                disabled={busy !== null}
                onClick={() => {
                  closeWipeConfirm();
                  setBusy("export");
                  setNote(null);
                  void props.savePort
                    ?.exportCurrentSave()
                    .then(() => setNote(labels.exportDoneText))
                    .catch((error: unknown) => setNote(failureNoteV1(error)))
                    .finally(() => setBusy(null));
                }}
              >
                {busy === "export"
                  ? `${labels.exportStateLabel}${labels.busySuffix}`
                  : labels.exportStateLabel}
              </Button>
            )}
            {props.savePort === undefined ? null : (
              <Button
                data-debug-dock-action="import_state"
                disabled={busy !== null}
                onClick={() => {
                  closeWipeConfirm();
                  setBusy("import");
                  setNote(null);
                  void props.savePort
                    ?.importSave()
                    .then((result) => {
                      const next = sessionMaintenanceImportNoteV1(result, labels);
                      if (next !== null) setNote(next);
                    })
                    .catch((error: unknown) => setNote(failureNoteV1(error)))
                    .finally(() => setBusy(null));
                }}
              >
                {busy === "import"
                  ? `${labels.importStateLabel}${labels.busySuffix}`
                  : labels.importStateLabel}
              </Button>
            )}
            {tools.map((tool) => (
              <Button
                key={tool.panelId}
                data-debug-dock-action={tool.panelId}
                disabled={busy !== null}
                onClick={() => {
                  closeWipeConfirm();
                  setNote(tool.openedNote ?? labels.toolOpenedNote);
                  if (grantOnOpen && !capabilityState.debugTools) {
                    void props.capabilities.setEnabled("debug_tools", true);
                    void props.capabilities.setEnabled("cheats", true);
                  }
                  props.control.open(tool.panelId);
                }}
              >
                {tool.label}
              </Button>
            ))}
            {props.presentationFreeze === undefined ? null : (
              <Button
                data-debug-dock-action="freeze"
                aria-pressed={frozen}
                onClick={() => {
                  closeWipeConfirm();
                  if (frozen) {
                    setNote(labels.resumeNote);
                    props.presentationFreeze?.resume();
                  } else {
                    setNote(labels.freezeNote);
                    props.presentationFreeze?.pause();
                  }
                }}
              >
                {frozen ? labels.resumeLabel : labels.freezeLabel}
              </Button>
            )}
            {clearAllSaves === undefined ? null : (
              <Button
                data-debug-dock-action="wipe_local"
                disabled={busy !== null}
                aria-expanded={wipeConfirm}
                onClick={() => {
                  setNote(null);
                  setWipeConfirm(true);
                }}
              >
                {labels.wipeLabel}
              </Button>
            )}
          </div>
          {note === null ? null : (
            <div
              className={styles["story-debug-dock__note"]}
              data-debug-dock-note="true"
              aria-live="polite"
            >
              {note}
            </div>
          )}
          {versionLine === null ? null : (
            <div
              className={styles["story-debug-dock__versions"]}
              data-debug-dock-versions="true"
            >
              {versionLine}
            </div>
          )}
        </div>
      </details>
      {wipeConfirm
        ? (
          <StoryDebugDockWipeDialogV1
            busy={busy === "wipe"}
            labels={labels}
            onConfirm={confirmWipe}
            onCancel={closeWipeConfirm}
          />
        )
        : null}
    </>,
    props.portalTarget,
  );
}
