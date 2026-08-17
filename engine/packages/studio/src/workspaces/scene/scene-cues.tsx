// SPDX-License-Identifier: MIT
import { useState } from "react";
import type { ReactElement } from "react";

import type { SceneDocumentV1 } from "@sillymaker/base";

import styles from "../../studio-app.module.css";

/**
 * The cue table: replay-through-cue selection, per-cue motion binding for
 * show and hide cues alike (a hide cue's motion is its exit animation),
 * cue construction (append a show/hide cue for a declared entry; remove a
 * cue), and create-or-clone motion — a new `*.motion.json` next to the
 * scene, bound to this cue, discovered by the Project Authoring Index with
 * zero registration.
 */

export interface SceneCuesPropsV1 {
  readonly draft: SceneDocumentV1;
  readonly motionIds: readonly string[];
  readonly throughCueId: string | null;
  /** Construction callbacks are absent while a save/create is in flight. */
  readonly busy: boolean;
  onToggleThroughCue(cueId: string): void;
  onBindMotion(cueId: string, motionId: string | null): void;
  onAddCue(tag: string, kind: "show" | "hide"): void;
  onRemoveCue(cueId: string): void;
  onCreateMotion(cueId: string): void;
}

export function SceneCuesV1(props: SceneCuesPropsV1): ReactElement {
  const { draft, throughCueId } = props;
  const [newCueTag, setNewCueTag] = useState<string>("");
  const [newCueKind, setNewCueKind] = useState<"show" | "hide">("show");
  const effectiveNewCueTag = draft.entries.some((entry) => (entry.tag as string) === newCueTag)
    ? newCueTag
    : ((draft.entries[0]?.tag as string | undefined) ?? "");

  return (
    <section className={styles["cues"]} aria-label="Cue 列表">
      <h2>Cue</h2>
      <p data-studio-canvas-mode={throughCueId ?? "declared"}>
        {throughCueId === null
          ? "画布：声明构图（全部条目按声明位置显示，可直接拖拽）"
          : `画布：回放到 ${throughCueId}（再点一次「到此为止」回到声明构图）`}
      </p>
      <table data-studio-cues="true">
        <thead>
          <tr>
            <th>cue</th>
            <th>kind</th>
            <th>tag</th>
            <th>motion</th>
            <th>查看</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {draft.cues.map((cue) => (
            <tr key={cue.cueId} data-studio-cue={cue.cueId}>
              <td>{cue.cueId}</td>
              <td>{cue.kind}</td>
              <td>{cue.tag}</td>
              <td>
                <select
                  aria-label={`${cue.cueId} 的 motion`}
                  value={cue.motionId ?? ""}
                  onChange={(event) => props.onBindMotion(cue.cueId, event.target.value || null)}
                >
                  <option value="">（无）</option>
                  {/* A just-created id may not be re-listed yet; keep the bound value selectable. */}
                  {(cue.motionId !== undefined && !props.motionIds.includes(cue.motionId)
                    ? [...props.motionIds, cue.motionId]
                    : props.motionIds).map((motionId) => (
                      <option key={motionId} value={motionId}>{motionId}</option>
                    ))}
                </select>
                <button
                  type="button"
                  data-studio-create-motion={cue.cueId}
                  disabled={props.busy}
                  title={cue.motionId === undefined
                    ? "新建一个渐变 motion 文档并绑定到这个 cue"
                    : "克隆当前绑定的 motion 为新文档并改绑这个 cue"}
                  onClick={() => props.onCreateMotion(cue.cueId)}
                >
                  {cue.motionId === undefined ? "新建 motion" : "克隆 motion"}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  aria-pressed={throughCueId === cue.cueId}
                  onClick={() => props.onToggleThroughCue(cue.cueId)}
                >
                  到此为止
                </button>
              </td>
              <td>
                <button
                  type="button"
                  data-studio-remove-cue={cue.cueId}
                  disabled={props.busy}
                  onClick={() => props.onRemoveCue(cue.cueId)}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {draft.entries.length === 0 ? null : (
        <p className={styles["cue-add"]}>
          {
            /* Label avoids the substring "条目" so the inspector's entry
              select stays uniquely addressable in browser tests. */
          }
          <select
            aria-label="新 cue 目标"
            value={effectiveNewCueTag}
            onChange={(event) => setNewCueTag(event.target.value)}
          >
            {draft.entries.map((entry) => (
              <option key={entry.tag} value={entry.tag}>{entry.tag}</option>
            ))}
          </select>
          <select
            aria-label="新 cue 的类型"
            value={newCueKind}
            onChange={(event) => setNewCueKind(event.target.value === "hide" ? "hide" : "show")}
          >
            <option value="show">show</option>
            <option value="hide">hide</option>
          </select>
          <button
            type="button"
            data-studio-add-cue="true"
            disabled={props.busy || effectiveNewCueTag === ""}
            onClick={() => props.onAddCue(effectiveNewCueTag, newCueKind)}
          >
            新增 cue
          </button>
        </p>
      )}
    </section>
  );
}
