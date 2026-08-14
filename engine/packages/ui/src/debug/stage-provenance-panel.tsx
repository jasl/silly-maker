// SPDX-License-Identifier: MIT
import { useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { MotionSourceEntryV1, MotionSourceIndexV1 } from "./motion-sources.ts";
import type {
  StageEntryProvenanceV1,
  StageInspectCaptureV1,
  StageInspectControllerV1,
} from "./stage-inspect.ts";
import styles from "./stage-provenance-panel.module.css";

/**
 * The DevDock Stage-provenance card: lists what is on stage right now, lets
 * the author toggle click-to-inspect hit surfaces and labeled hit-region
 * outlines on the live stage, and resolves the selected entry's motion back
 * to its source file with "open source" / "edit motion" actions. Read-only
 * toward gameplay: it renders the inspect registry and never issues
 * semantic intents.
 */

export interface StageProvenancePanelPropsV1 {
  readonly controller: StageInspectControllerV1;
  /** Resolves motion ids to Story source files; omit to hide source rows. */
  readonly motionSources?: MotionSourceIndexV1;
  /** Opens a source path (dev server middleware); resolves false on failure. */
  openSource?(path: string): Promise<boolean>;
  /**
   * Hands the selected motion to an editing surface (Motion Workbench),
   * along with the live rendering captured as a detached preview fixture
   * so the Workbench opens on exactly what the author clicked.
   */
  onEditMotion?(entry: MotionSourceEntryV1, capture: StageInspectCaptureV1 | null): void;
}

function provenanceRowsV1(entry: StageEntryProvenanceV1): readonly (readonly [string, string])[] {
  return [
    ["layer", entry.layerId],
    ["tag", entry.tag],
    ["content", entry.contentId],
    ["renderer", entry.rendererId],
    ["phase", entry.phase],
    ["transition", entry.transitionId ?? entry.lastTransitionId ?? "—"],
    ["motion", entry.motionId ?? entry.lastMotionId ?? "—"],
  ] as const;
}

export function StageProvenancePanelV1(props: StageProvenancePanelPropsV1): ReactElement {
  const { controller } = props;
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.observe,
    controller.observe,
  );
  const [openResult, setOpenResult] = useState<"idle" | "opened" | "failed">("idle");

  const selected = snapshot.selectedKey === null
    ? null
    : (snapshot.entries.find((entry) => entry.frameKey === snapshot.selectedKey) ?? null);
  const selectedMotionId = selected === null ? null : (selected.motionId ?? selected.lastMotionId);
  const motionSource = selectedMotionId === null
    ? null
    : (props.motionSources?.get(selectedMotionId) ?? null);

  return (
    <div className={styles.panel} data-stage-provenance-panel="true">
      <p className={styles.intro}>
        点舞台上的角色或背景，查看它用了哪段 Motion、哪份源文件。
      </p>
      <button
        type="button"
        className={styles.toggle}
        data-stage-inspect-toggle={snapshot.enabled ? "on" : "off"}
        aria-pressed={snapshot.enabled}
        onClick={() => controller.setEnabled(!snapshot.enabled)}
      >
        {snapshot.enabled ? "结束点击检视" : "开始点击检视"}
      </button>
      <button
        type="button"
        className={styles.toggle}
        data-stage-hit-region-toggle={snapshot.highlightHitRegions ? "on" : "off"}
        aria-pressed={snapshot.highlightHitRegions}
        onClick={() => controller.setHighlightHitRegions(!snapshot.highlightHitRegions)}
      >
        {snapshot.highlightHitRegions ? "隐藏交互区域" : "显示交互区域"}
      </button>
      {snapshot.activeCueId === null
        ? null
        : (
          <p className={styles.cue} data-stage-provenance-cue={snapshot.activeCueId}>
            cue: {snapshot.activeCueId}
          </p>
        )}
      <ul className={styles.entries}>
        {snapshot.entries.map((entry) => (
          <li key={entry.frameKey}>
            <button
              type="button"
              className={styles.entry}
              data-stage-provenance-entry={entry.frameKey}
              data-stage-provenance-selected={entry.frameKey === snapshot.selectedKey
                ? "true"
                : undefined}
              onClick={() =>
                controller.select(
                  entry.frameKey === snapshot.selectedKey ? null : entry.frameKey,
                )}
            >
              <span className={styles["entry-tag"]}>{entry.tag}</span>
              <span className={styles["entry-content"]}>{entry.contentId}</span>
              <span className={styles["entry-phase"]}>{entry.phase}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected === null
        ? (
          <p className={styles.hint}>
            {snapshot.enabled
              ? "点舞台上的图，或从下面列表里选一项。"
              : "先打开点击检视，再点舞台。"}
          </p>
        )
        : (
          <dl className={styles.details} data-stage-provenance-details={selected.frameKey}>
            {provenanceRowsV1(selected).map(([label, value]) => (
              <div key={label} className={styles.row}>
                <dt>{label}</dt>
                <dd data-stage-provenance-field={label}>{value}</dd>
              </div>
            ))}
            {motionSource === null ? null : (
              <div className={styles.row}>
                <dt>source</dt>
                <dd data-stage-provenance-field="source">{motionSource.path}</dd>
              </div>
            )}
          </dl>
        )}
      {motionSource === null ? null : (
        <div className={styles.actions}>
          {props.openSource === undefined ? null : (
            <button
              type="button"
              data-stage-provenance-open={motionSource.path}
              onClick={() => {
                setOpenResult("idle");
                void props.openSource?.(motionSource.path).then((opened) =>
                  setOpenResult(opened ? "opened" : "failed")
                );
              }}
            >
              打开源文件
            </button>
          )}
          {props.onEditMotion === undefined ? null : (
            <button
              type="button"
              data-stage-provenance-edit={motionSource.motionId}
              onClick={() => props.onEditMotion?.(motionSource, controller.capture())}
            >
              编辑 Motion
            </button>
          )}
          {openResult === "failed"
            ? (
              <p className={styles.failure} data-stage-provenance-open-result="failed">
                打开失败：仅 dev server 提供源文件端口。
              </p>
            )
            : null}
        </div>
      )}
    </div>
  );
}
