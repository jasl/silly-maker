// SPDX-License-Identifier: MIT
/**
 * Game-scene debug launcher: collapsed chip, grouped actions (state /
 * scene / story cheats), freeze, and inlined session maintenance.
 * Floating tool windows stay on `DevDockV1`. The reference outer UI mounts
 * this component; products may instead compose it directly to own visibility
 * and the `info` slot.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";

import {
  formatVersionStampV1,
  readVersionStampV1,
  type RuntimeCapabilityPortV1,
  type SessionFaultCauseV1,
} from "@sillymaker/base";

import type { PresentationFreezePortV1 } from "../presentation-run/presentation-freeze.ts";
import type { PresentationRatePortV1 } from "../presentation-run/presentation-rate.ts";
import type { SaveOverlayPortV1 } from "../persistence/save-overlay.tsx";
import { Button } from "../primitives/button.tsx";
import { DevelopmentToolLauncherInternalV1 } from "../internal/development-tool-launcher.tsx";
import type { DevDockPositionV1 } from "./dev-dock.tsx";
import type { DevDockControlV1 } from "./dev-dock-control.ts";
import { useAuxiliarySurfacePortalTargetV1 } from "../shell/auxiliary-surface-portal.tsx";
import {
  defaultSessionMaintenanceLabelsV1,
  engineSessionMaintenancePanelIdV1,
  sessionMaintenanceImportNoteV1,
  type SessionMaintenanceLabelsV1,
} from "./session-maintenance-panel.tsx";
import { engineStateInspectorPanelIdV1, engineStateTunerPanelIdV1 } from "./state-tuner.ts";
import { resolveInspectorPageHrefV1 } from "./inspector-page-href.ts";
import styles from "./story-debug-dock.module.css";

export interface StoryDebugDockToolV1 {
  readonly panelId: string;
  readonly label: string;
  readonly openedNote?: string;
  /** When omitted, the tool is treated as `read_only`. */
  readonly authority?: "read_only" | "cheat";
}

export type StoryDebugDockConfirmKindV1 = "wipe" | "reload" | "reinitialize";
type StoryDebugDockGroupV1 = "state" | "scene" | "rate" | "tools" | "cheat";
type StoryDebugDockToolGroupV1 = Exclude<StoryDebugDockGroupV1, "rate">;

export interface StoryDebugDockLabelsV1 extends SessionMaintenanceLabelsV1 {
  readonly chipLabel: string;
  readonly freezeLabel: string;
  readonly resumeLabel: string;
  readonly freezeNote: string;
  readonly resumeNote: string;
  readonly rateLabel: string;
  readonly ratePinnedLabel: string;
  readonly toolOpenedNote: string;
  readonly wipeDialogTitle: string;
  readonly wipeDialogDescription: string;
  readonly wipeBackdropLabel: string;
  readonly reloadCurrentStateLabel: string;
  readonly reloadConfirmLabel: string;
  readonly reloadDialogTitle: string;
  readonly reloadDialogDescription: string;
  readonly reloadBackdropLabel: string;
  readonly reloadDoneText: string;
  readonly reinitializeConfirmLabel: string;
  readonly reinitializeDialogTitle: string;
  readonly reinitializeDialogDescription: string;
  readonly reinitializeBackdropLabel: string;
  readonly sectionStateLabel: string;
  readonly sectionSceneLabel: string;
  readonly sectionToolsLabel: string;
  readonly sectionCheatLabel: string;
  readonly inspectorLabel: string;
  readonly inspectorOpenedNote: string;
  readonly cheatLockReason: string;
  readonly faultCauseLabel: string;
}

export const defaultStoryDebugDockLabelsV1: StoryDebugDockLabelsV1 = {
  ...defaultSessionMaintenanceLabelsV1,
  chipLabel: "调试",
  freezeLabel: "冻结画面",
  resumeLabel: "恢复画面",
  freezeNote: "画面已冻结——动画与 gameplay 输入暂停，调试点击照常。",
  resumeNote: "画面已恢复。",
  rateLabel: "倍速",
  ratePinnedLabel: "实时段 1×",
  toolOpenedNote: "已打开工具窗口（拖动标题栏可移动，Esc 关闭）。",
  exportStateLabel: "导出状态",
  importStateLabel: "导入状态",
  wipeLabel: "清空存储",
  wipeConfirmLabel: "确认清空",
  wipeCancelLabel: "取消",
  reinitializeLabel: "初始化",
  exportDoneText: "已导出状态 JSON（在下载文件夹）。",
  importDoneText: "状态已导入。",
  importIncompatibleText: "该状态与当前游戏/版本不兼容，已拒绝导入——当前会话未受影响。",
  importInvalidText: "文件不是有效的引擎存档（损坏或被改动过），已拒绝导入。",
  wipeDoneText: "已清空存储。",
  wipeDialogTitle: "清空全部本地存储？",
  wipeDialogDescription: "会清空本机上这个游戏的全部存档栏位。进行中的会话也会受影响。",
  wipeBackdropLabel: "取消清空存储",
  reloadCurrentStateLabel: "刷新状态",
  reloadConfirmLabel: "确认刷新",
  reloadDialogTitle: "用当前状态重新加载？",
  reloadDialogDescription:
    "会把现在的权威状态（含状态编辑写入的值）当作存档重新加载。进行中的演出会重建，存档栏位不变。",
  reloadBackdropLabel: "取消刷新状态",
  reloadDoneText: "已用当前状态重新加载。",
  reinitializeConfirmLabel: "确认初始化",
  reinitializeDialogTitle: "初始化会话？",
  reinitializeDialogDescription: "会结束当前会话并回到标题。本地存档栏位不会清空。",
  reinitializeBackdropLabel: "取消初始化",
  sectionStateLabel: "状态",
  sectionSceneLabel: "场景",
  sectionToolsLabel: "工具",
  sectionCheatLabel: "作弊",
  inspectorLabel: "Inspector",
  inspectorOpenedNote: "已在新标签页打开 Inspector（游戏会话继续运行）。",
  cheatLockReason: "需要启用作弊功能",
  faultCauseLabel: "最近故障",
};

export interface StoryDebugDockPropsV1 {
  /** Story owns default-on vs capability gating. */
  readonly visible: boolean;
  /** Hides the debug action and menu while retaining another development action. */
  readonly debugVisible?: boolean;
  /** Optional authoring action hosted by the same movable development launcher. */
  readonly authoringAction?: {
    readonly label: string;
    activate(): void | Promise<void>;
  };
  /**
   * Portal host. When omitted, the dock follows the DevDock portal
   * coordinator (viewport canvas when present, then blocking scopes).
   */
  readonly portalTarget?: Element;
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly control: DevDockControlV1;
  readonly presentationFreeze?: PresentationFreezePortV1;
  /** Presentation playback-rate port; renders the 倍速 preset row. */
  readonly presentationRate?: PresentationRatePortV1;
  readonly savePort?: SaveOverlayPortV1;
  /** Engine Core wipe (autosave drain + partial failure). */
  readonly clearAllSaves?: () => Promise<void>;
  /**
   * Reload the live authoritative snapshot (including debug-patched
   * leaves) as a new session. Must not download a file.
   */
  readonly onReloadCurrentState?: () => void | Promise<unknown>;
  readonly onReinitialize?: () => void | Promise<unknown>;
  /** After a successful wipe (reload, return to title, …). */
  readonly onWiped?: () => void;
  /** Game-specific live stats; the dock never reads Story state itself. */
  readonly info?: ReactNode;
  /**
   * The session's non-authoritative last-fault-cause record (raw message +
   * stack summary behind the latest normalized throw); rendered whenever
   * non-null so a paused session explains itself without console digging.
   */
  readonly faultCause?: {
    getCurrent(): SessionFaultCauseV1 | null;
    subscribe(listener: () => void): () => void;
  };
  /**
   * Tools to list before the panel registry is published. When omitted,
   * the dock lists `control.panels` (skipping inlined session maintenance).
   */
  readonly tools?: readonly StoryDebugDockToolV1[];
  readonly labels?: Partial<StoryDebugDockLabelsV1>;
  /**
   * Expanding the chip or clicking a tool enables `debug_tools` + `cheats`
   * (default true). Engine default launchers set false: they only appear
   * after `debug_tools` is already on.
   */
  readonly grantCapabilitiesOnOpen?: boolean;
  /**
   * Same-origin Inspector page. When omitted, the dock reads
   * `meta[name="sillymaker-inspector"]` (injected by the Vite plugin during
   * `vite dev`). Pass `""` to hide the link even when the meta is present.
   * Absolute and protocol-relative URLs are ignored.
   */
  readonly inspectorHref?: string;
  /** Chip/menu corner; defaults to `top_right`. */
  readonly position?: DevDockPositionV1;
  /** Lets pointer users move the collapsed launcher between Host-surface corners. */
  readonly movableChip?: boolean;
  /** @internal Reports a movable launcher's committed Host-surface corner. */
  onPositionChangeInternalV1?(position: DevDockPositionV1): void;
  readonly expanded?: boolean;
  readonly defaultExpanded?: boolean;
  onExpandedChange?(expanded: boolean): void;
}

function failureNoteV1(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Debug playback-rate presets; a Story's Ctrl fast-forward pin stays its own binding. */
const presentationRatePresetsV1: readonly number[] = [0.5, 1, 2, 4, 8];

function formatRatePresetV1(rate: number): string {
  return `${rate}×`;
}

function confirmSpecV1(
  kind: StoryDebugDockConfirmKindV1,
  labels: StoryDebugDockLabelsV1,
): {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly backdropLabel: string;
  readonly confirmAction: string;
  readonly cancelAction: string;
} {
  switch (kind) {
    case "wipe":
      return {
        title: labels.wipeDialogTitle,
        description: labels.wipeDialogDescription,
        confirmLabel: labels.wipeConfirmLabel,
        backdropLabel: labels.wipeBackdropLabel,
        confirmAction: "wipe_confirm",
        cancelAction: "wipe_cancel",
      };
    case "reload":
      return {
        title: labels.reloadDialogTitle,
        description: labels.reloadDialogDescription,
        confirmLabel: labels.reloadConfirmLabel,
        backdropLabel: labels.reloadBackdropLabel,
        confirmAction: "reload_confirm",
        cancelAction: "reload_cancel",
      };
    case "reinitialize":
      return {
        title: labels.reinitializeDialogTitle,
        description: labels.reinitializeDialogDescription,
        confirmLabel: labels.reinitializeConfirmLabel,
        backdropLabel: labels.reinitializeBackdropLabel,
        confirmAction: "reinitialize_confirm",
        cancelAction: "reinitialize_cancel",
      };
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function StoryDebugDockConfirmDialogV1(props: {
  readonly kind: StoryDebugDockConfirmKindV1;
  readonly busy: boolean;
  readonly labels: StoryDebugDockLabelsV1;
  onConfirm(): void;
  onCancel(): void;
}): ReactElement {
  const { busy, kind, onCancel } = props;
  const spec = confirmSpecV1(kind, props.labels);
  const titleId = `story-debug-dock-confirm-title-${kind}`;
  const descriptionId = `story-debug-dock-confirm-description-${kind}`;
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
    <div
      className={styles["story-debug-dock__wipe"]}
      data-debug-dock-confirm-dialog={kind}
      {...(kind === "wipe" ? { "data-debug-dock-wipe-dialog": "true" } : {})}
    >
      <button
        type="button"
        className={styles["story-debug-dock__wipe-backdrop"]}
        aria-label={spec.backdropLabel}
        data-debug-dock-confirm-backdrop={kind}
        {...(kind === "wipe" ? { "data-debug-dock-wipe-backdrop": "true" } : {})}
        disabled={busy}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={styles["story-debug-dock__wipe-dialog"]}
      >
        <strong id={titleId}>{spec.title}</strong>
        <p id={descriptionId} className={styles["story-debug-dock__wipe-description"]}>
          {spec.description}
        </p>
        <div className={styles["story-debug-dock__wipe-actions"]}>
          <Button
            data-debug-dock-action={spec.confirmAction}
            disabled={busy}
            onClick={props.onConfirm}
          >
            {busy ? `${spec.confirmLabel}${props.labels.busySuffix}` : spec.confirmLabel}
          </Button>
          <Button
            data-debug-dock-action={spec.cancelAction}
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

function dockToolSectionV1(tool: StoryDebugDockToolV1): StoryDebugDockToolGroupV1 {
  if (
    tool.panelId === engineStateInspectorPanelIdV1 ||
    tool.panelId === engineStateTunerPanelIdV1
  ) {
    return "state";
  }
  const authority = tool.authority ?? "read_only";
  switch (authority) {
    case "read_only":
      return tool.panelId.includes("workbench") || tool.panelId.includes("inspector")
        ? "tools"
        : "scene";
    case "cheat":
      return "cheat";
    default: {
      const exhaustive: never = authority;
      return exhaustive;
    }
  }
}

function compareStateToolsV1(left: StoryDebugDockToolV1, right: StoryDebugDockToolV1): number {
  const rank = (tool: StoryDebugDockToolV1): number => {
    if (tool.panelId === engineStateInspectorPanelIdV1) return 0;
    if (tool.panelId === engineStateTunerPanelIdV1) return 1;
    return 2;
  };
  return rank(left) - rank(right);
}

function StoryDebugDockSectionV1(props: {
  readonly section: StoryDebugDockGroupV1;
  readonly title: string;
  readonly children: ReactNode;
}): ReactElement {
  const headingId = `story-debug-dock-section-${props.section}`;
  return (
    <section
      className={styles["story-debug-dock__section"]}
      data-debug-dock-section={props.section}
      role="group"
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className={styles["story-debug-dock__section-title"]}>
        {props.title}
      </h3>
      <div className={styles["story-debug-dock__actions"]}>
        {props.children}
      </div>
    </section>
  );
}

function StoryDebugDockToolButtonV1(props: {
  readonly tool: StoryDebugDockToolV1;
  readonly busy: boolean;
  readonly locked: boolean;
  readonly open: boolean;
  readonly control: DevDockControlV1;
  readonly openedNote: string;
  onBusyGuard(): void;
  onOpened(note: string): void;
  grantCapabilities(): void;
}): ReactElement {
  return (
    <Button
      data-debug-dock-action={props.tool.panelId}
      aria-pressed={props.open}
      disabled={props.busy || props.locked}
      onClick={() => {
        props.onBusyGuard();
        if (props.locked) return;
        props.onOpened(props.openedNote);
        props.grantCapabilities();
        if (props.open) props.control.close(props.tool.panelId);
        else props.control.open(props.tool.panelId);
      }}
    >
      {props.tool.label}
    </Button>
  );
}

export function StoryDebugDockV1(props: StoryDebugDockPropsV1): ReactElement | null {
  const labels = { ...defaultStoryDebugDockLabelsV1, ...props.labels };
  const debugVisible = props.debugVisible !== false;
  const grantOnOpen = props.grantCapabilitiesOnOpen !== false;
  const position = props.position ?? "top_right";
  const [busy, setBusy] = useState<
    "export" | "import" | "wipe" | "reload" | "reinitialize" | null
  >(null);
  const [confirm, setConfirm] = useState<StoryDebugDockConfirmKindV1 | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [internalExpanded, setInternalExpanded] = useState(props.defaultExpanded === true);
  const expanded = props.expanded ?? internalExpanded;
  const chipRef = useRef<HTMLButtonElement>(null);
  const coordinatorSelection = useAuxiliarySurfacePortalTargetV1();
  const portalTarget = props.portalTarget ?? coordinatorSelection.target;
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
  const presentationRate = useSyncExternalStore(
    props.presentationRate?.state.subscribe ?? (() => () => undefined),
    () => props.presentationRate?.state.getCurrent().rate ?? 1,
    () => props.presentationRate?.state.getCurrent().rate ?? 1,
  );
  const presentationRatePinned = useSyncExternalStore(
    props.presentationRate?.state.subscribe ?? (() => () => undefined),
    () => props.presentationRate?.state.getCurrent().pinned ?? false,
    () => props.presentationRate?.state.getCurrent().pinned ?? false,
  );
  const registry = useSyncExternalStore(
    props.control.panels.subscribe,
    props.control.panels.getCurrent,
    props.control.panels.getCurrent,
  );
  const faultCause = useSyncExternalStore(
    props.faultCause?.subscribe ?? (() => () => undefined),
    () => props.faultCause?.getCurrent() ?? null,
    () => props.faultCause?.getCurrent() ?? null,
  );
  const openPanelIds = useSyncExternalStore(
    props.control.openPanelIds.subscribe,
    props.control.openPanelIds.getCurrent,
    props.control.openPanelIds.getCurrent,
  );

  const versionLine = formatVersionStampV1(readVersionStampV1());
  const tools = props.tools ?? registry
    .filter((panel) => panel.id !== engineSessionMaintenancePanelIdV1)
    .map((panel): StoryDebugDockToolV1 => ({
      panelId: panel.id,
      label: panel.title,
      authority: panel.authority,
    }));
  const cheatsEnabled = capabilityState.debugTools && capabilityState.cheats;
  const stateTools = tools.filter((tool) => dockToolSectionV1(tool) === "state")
    .slice()
    .sort(compareStateToolsV1);
  const sceneTools = tools.filter((tool) => dockToolSectionV1(tool) === "scene");
  const toolTools = tools.filter((tool) => dockToolSectionV1(tool) === "tools");
  const cheatTools = tools.filter((tool) => dockToolSectionV1(tool) === "cheat");
  const cheatCapabilityLocked = !cheatsEnabled && !grantOnOpen;
  const tunerLocked = cheatCapabilityLocked;
  const storyCheatsLocked = cheatTools.length > 0 && cheatCapabilityLocked;
  const stateTunerLockReason = cheatCapabilityLocked &&
    stateTools.some((tool) => tool.panelId === engineStateTunerPanelIdV1);
  const inspectorHref = resolveInspectorPageHrefV1(props.inspectorHref);
  const hasStateSection = props.savePort !== undefined ||
    props.onReloadCurrentState !== undefined ||
    props.onReinitialize !== undefined ||
    props.clearAllSaves !== undefined ||
    stateTools.length > 0;
  const hasSceneSection = props.presentationFreeze !== undefined || sceneTools.length > 0;
  const hasRateSection = props.presentationRate !== undefined;
  const hasToolsSection = toolTools.length > 0 || inspectorHref !== undefined;

  const { clearAllSaves, onWiped, onExpandedChange } = props;
  const setExpanded = useCallback((next: boolean): void => {
    if (props.expanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  }, [onExpandedChange, props.expanded]);
  const grantCapabilities = useCallback((): void => {
    if (!grantOnOpen || capabilityState.debugTools) return;
    void props.capabilities.setEnabled("debug_tools", true);
    void props.capabilities.setEnabled("cheats", true);
  }, [capabilityState.debugTools, grantOnOpen, props.capabilities]);

  // Crossing portal surfaces (game canvas ⇄ dialog/overlay focus scopes)
  // always lands collapsed: an expanded launcher menu must never arrive
  // already covering a dialog's content. Expanding inside a scope stays an
  // explicit user action there.
  const previousSurfaceRef = useRef(coordinatorSelection.surface);
  useEffect(() => {
    if (props.portalTarget !== undefined) return;
    if (previousSurfaceRef.current === coordinatorSelection.surface) return;
    previousSurfaceRef.current = coordinatorSelection.surface;
    setExpanded(false);
  }, [coordinatorSelection.surface, props.portalTarget, setExpanded]);
  const closeConfirm = useCallback((): void => {
    if (busy === "wipe" || busy === "reload" || busy === "reinitialize") return;
    setConfirm(null);
  }, [busy]);

  const runConfirmedV1 = useCallback((
    kind: StoryDebugDockConfirmKindV1,
    work: () => void | Promise<unknown>,
    doneNote: string,
  ): void => {
    if (busy !== null) return;
    setBusy(kind);
    setNote(null);
    void Promise.resolve()
      .then(() => work())
      .then(() => {
        setConfirm(null);
        if (doneNote.length > 0) setNote(doneNote);
        if (kind === "wipe") onWiped?.();
      })
      .catch((error: unknown) => {
        setConfirm(null);
        setNote(failureNoteV1(error));
      })
      .finally(() => setBusy(null));
  }, [busy, onWiped]);

  const confirmAction = useCallback((): void => {
    if (confirm === null) return;
    switch (confirm) {
      case "wipe":
        if (clearAllSaves === undefined) return;
        runConfirmedV1("wipe", () => clearAllSaves(), labels.wipeDoneText);
        return;
      case "reload":
        if (props.onReloadCurrentState === undefined) return;
        runConfirmedV1("reload", () => props.onReloadCurrentState?.(), labels.reloadDoneText);
        return;
      case "reinitialize":
        if (props.onReinitialize === undefined) return;
        runConfirmedV1("reinitialize", () => props.onReinitialize?.(), "");
        return;
      default: {
        const exhaustive: never = confirm;
        void exhaustive;
      }
    }
  }, [
    clearAllSaves,
    confirm,
    labels.reloadDoneText,
    labels.wipeDoneText,
    props,
    runConfirmedV1,
  ]);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if ((event.target as Element | null)?.closest?.("[data-devdock-window]") !== null) {
        return;
      }
      if (
        (event.target as Element | null)?.closest?.("[data-debug-dock-confirm-dialog]") !== null
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setExpanded(false);
      const chip = chipRef.current;
      queueMicrotask(() => {
        if (chip?.isConnected === true) chip.focus({ preventScroll: true });
      });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [expanded, setExpanded]);

  useEffect(() => {
    if (debugVisible || !expanded) return;
    setExpanded(false);
  }, [debugVisible, expanded, setExpanded]);

  if (!props.visible || portalTarget === null) return null;

  const renderToolButtonV1 = (tool: StoryDebugDockToolV1, locked: boolean): ReactElement => (
    <StoryDebugDockToolButtonV1
      key={tool.panelId}
      tool={tool}
      busy={busy !== null}
      locked={locked}
      open={openPanelIds.includes(tool.panelId)}
      control={props.control}
      openedNote={tool.openedNote ?? labels.toolOpenedNote}
      onBusyGuard={closeConfirm}
      onOpened={(nextNote) => {
        setNote(nextNote);
        // A tool window owns the work area after selection. Collapse the
        // launcher so its menu does not cover the window; the foreground chip
        // remains available to open another tool.
        setExpanded(false);
      }}
      grantCapabilities={grantCapabilities}
    />
  );

  return (
    <DevelopmentToolLauncherInternalV1
      portalTarget={portalTarget}
      position={position}
      movable={props.movableChip === true}
      {...(props.onPositionChangeInternalV1 === undefined
        ? {}
        : { onPositionChange: props.onPositionChangeInternalV1 })}
      {...(props.authoringAction === undefined ? {} : {
        authoringAction: {
          label: props.authoringAction.label,
          onActivate: props.authoringAction.activate,
        },
      })}
      {...(debugVisible
        ? {
          debugAction: {
            label: labels.chipLabel,
            expanded,
            buttonRef: chipRef,
            onActivate: () => {
              const next = !expanded;
              setExpanded(next);
              if (next) grantCapabilities();
            },
          },
        }
        : {})}
      overlay={confirm === null ? null : (
        <StoryDebugDockConfirmDialogV1
          kind={confirm}
          busy={busy === confirm}
          labels={labels}
          onConfirm={confirmAction}
          onCancel={closeConfirm}
        />
      )}
    >
      {debugVisible && expanded
        ? (
          <div
            className={styles["story-debug-dock__panel"]}
            role="group"
            aria-label={labels.chipLabel}
            data-native-text="true"
          >
            {props.info === undefined
              ? null
              : <div className={styles["story-debug-dock__info"]}>{props.info}</div>}
            <div className={styles["story-debug-dock__body"]} data-debug-dock-actions="true">
              {hasStateSection
                ? (
                  <StoryDebugDockSectionV1
                    section="state"
                    title={labels.sectionStateLabel}
                  >
                    {props.savePort === undefined ? null : (
                      <>
                        <Button
                          data-debug-dock-action="export_state"
                          disabled={busy !== null}
                          onClick={() => {
                            closeConfirm();
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
                        <Button
                          data-debug-dock-action="import_state"
                          disabled={busy !== null}
                          onClick={() => {
                            closeConfirm();
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
                      </>
                    )}
                    {stateTools.map((tool) =>
                      renderToolButtonV1(
                        tool,
                        tool.panelId === engineStateTunerPanelIdV1 && tunerLocked,
                      )
                    )}
                    {props.onReloadCurrentState === undefined ? null : (
                      <Button
                        data-debug-dock-action="reload_current"
                        disabled={busy !== null}
                        aria-expanded={confirm === "reload"}
                        onClick={() => {
                          setNote(null);
                          setConfirm("reload");
                        }}
                      >
                        {labels.reloadCurrentStateLabel}
                      </Button>
                    )}
                    {props.onReinitialize === undefined ? null : (
                      <Button
                        data-debug-dock-action="reinitialize"
                        disabled={busy !== null}
                        aria-expanded={confirm === "reinitialize"}
                        onClick={() => {
                          setNote(null);
                          setConfirm("reinitialize");
                        }}
                      >
                        {labels.reinitializeLabel}
                      </Button>
                    )}
                    {clearAllSaves === undefined ? null : (
                      <Button
                        className={styles["story-debug-dock__danger"]}
                        data-debug-dock-action="wipe_local"
                        disabled={busy !== null}
                        aria-expanded={confirm === "wipe"}
                        onClick={() => {
                          setNote(null);
                          setConfirm("wipe");
                        }}
                      >
                        {labels.wipeLabel}
                      </Button>
                    )}
                    {stateTunerLockReason
                      ? (
                        <p className={styles["story-debug-dock__authority-reason"]}>
                          {labels.cheatLockReason}
                        </p>
                      )
                      : null}
                  </StoryDebugDockSectionV1>
                )
                : null}
              {hasSceneSection
                ? (
                  <StoryDebugDockSectionV1
                    section="scene"
                    title={labels.sectionSceneLabel}
                  >
                    {props.presentationFreeze === undefined ? null : (
                      <Button
                        data-debug-dock-action="freeze"
                        data-devdock-freeze-toggle="true"
                        aria-pressed={frozen}
                        onClick={() => {
                          closeConfirm();
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
                    {sceneTools.map((tool) => renderToolButtonV1(tool, false))}
                  </StoryDebugDockSectionV1>
                )
                : null}
              {hasRateSection
                ? (
                  <StoryDebugDockSectionV1
                    section="rate"
                    title={labels.rateLabel}
                  >
                    <div className={styles["story-debug-dock__rate-options"]}>
                      {presentationRatePresetsV1.map((preset) => (
                        <Button
                          key={preset}
                          data-debug-dock-action="rate"
                          data-debug-dock-rate={String(preset)}
                          aria-pressed={presentationRate === preset}
                          onClick={() => props.presentationRate?.setRate(preset)}
                        >
                          {formatRatePresetV1(preset)}
                        </Button>
                      ))}
                    </div>
                    {presentationRatePinned && (
                      <span
                        className={styles["story-debug-dock__rate-pinned"]}
                        data-debug-dock-rate-pinned=""
                      >
                        {labels.ratePinnedLabel}
                      </span>
                    )}
                  </StoryDebugDockSectionV1>
                )
                : null}
              {hasToolsSection
                ? (
                  <StoryDebugDockSectionV1
                    section="tools"
                    title={labels.sectionToolsLabel}
                  >
                    {toolTools.map((tool) => renderToolButtonV1(tool, false))}
                    {inspectorHref === undefined ? null : (
                      <a
                        className={styles["story-debug-dock__inspector"]}
                        href={inspectorHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-debug-dock-action="inspector"
                        onClick={() => setNote(labels.inspectorOpenedNote)}
                      >
                        {labels.inspectorLabel}
                      </a>
                    )}
                  </StoryDebugDockSectionV1>
                )
                : null}
              {cheatTools.length === 0 ? null : (
                <StoryDebugDockSectionV1
                  section="cheat"
                  title={labels.sectionCheatLabel}
                >
                  {cheatTools.map((tool) =>
                    renderToolButtonV1(tool, !cheatsEnabled && !grantOnOpen)
                  )}
                  {storyCheatsLocked
                    ? (
                      <p className={styles["story-debug-dock__authority-reason"]}>
                        {labels.cheatLockReason}
                      </p>
                    )
                    : null}
                </StoryDebugDockSectionV1>
              )}
            </div>
            {note === null || note.length === 0 ? null : (
              <div
                className={styles["story-debug-dock__note"]}
                data-debug-dock-note="true"
                aria-live="polite"
              >
                {note}
              </div>
            )}
            {faultCause === null ? null : (
              <div
                className={styles["story-debug-dock__fault"]}
                data-debug-dock-fault-cause={faultCause.at}
              >
                <strong>{labels.faultCauseLabel}</strong>
                <div>{faultCause.message}</div>
                {faultCause.stackSummary.length === 0
                  ? null
                  : (
                    <pre className={styles["story-debug-dock__fault-stack"]}>
                      {faultCause.stackSummary.join("\n")}
                    </pre>
                  )}
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
        )
        : null}
    </DevelopmentToolLauncherInternalV1>
  );
}
