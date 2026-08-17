// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type { SceneDocumentV1 } from "@sillymaker/base";

import type { StudioContentDescriptorV1 } from "../../core/binding.ts";
import styles from "../../studio-app.module.css";
import type { defaultPlacementV1 } from "./scene-compile.ts";

/**
 * The scene inspector: entry selection plus the numeric precision entry
 * over the same draft the canvas drags (x/y/scale/mirror/zOrder). Typed
 * fields carry per-field coalesce keys, so one field run is one undo step.
 * When the content manifest declares `appearanceFields` for the selected
 * entry's content, appearance edits become structured selects; entry
 * removal (with its dependent cues) also lives here.
 */

export interface SceneInspectorPropsV1 {
  readonly draft: SceneDocumentV1;
  readonly selectedTag: string | null;
  /** The manifest descriptor for the selected entry's content, if any. */
  readonly selectedDescriptor: StudioContentDescriptorV1 | null;
  /** Index-enumerated motion ids the ambient dropdown offers. */
  readonly motionIds: readonly string[];
  readonly busy: boolean;
  onSelectTag(tag: string | null): void;
  onEditSelectedPlacement(
    mutatePlacement: (placement: ReturnType<typeof defaultPlacementV1>) => void,
    coalesceKey?: string,
  ): void;
  onEditSelectedZOrder(next: number): void;
  onEditSelectedAppearance(key: string, value: string | null): void;
  /** Binds or clears the entry's presence-bound ambient loop. */
  onEditSelectedAmbient(motionId: string | null): void;
  onRemoveSelectedEntry(): void;
}

export function SceneInspectorV1(props: SceneInspectorPropsV1): ReactElement {
  const { draft, selectedTag } = props;
  const selectedEntry = draft.entries.find((entry) => entry.tag === selectedTag) ?? null;

  const numberField = (
    label: string,
    value: number,
    onValue: (next: number) => void,
  ): ReactElement => (
    <label className={styles["field"]}>
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isSafeInteger(next)) onValue(next);
        }}
      />
    </label>
  );

  return (
    <>
      <label className={styles["field"]}>
        <span>条目</span>
        <select
          data-studio-entry-select="true"
          value={selectedTag ?? ""}
          onChange={(event) => props.onSelectTag(event.target.value || null)}
        >
          {draft.entries.map((entry) => (
            <option key={entry.tag} value={entry.tag}>
              {entry.tag}（{entry.contentId}）
            </option>
          ))}
        </select>
      </label>
      {selectedEntry === null ? null : (
        <div data-studio-entry-inspector={selectedEntry.tag}>
          {numberField(
            "x",
            selectedEntry.placement?.x ?? 0,
            (next) =>
              props.onEditSelectedPlacement((placement) => {
                placement.x = next;
              }, `field:${selectedEntry.tag}:x`),
          )}
          {numberField(
            "y",
            selectedEntry.placement?.y ?? 0,
            (next) =>
              props.onEditSelectedPlacement((placement) => {
                placement.y = next;
              }, `field:${selectedEntry.tag}:y`),
          )}
          {numberField(
            "缩放‰",
            selectedEntry.placement?.scalePermille ?? 1000,
            (next) =>
              props.onEditSelectedPlacement((placement) => {
                placement.scalePermille = next;
              }, `field:${selectedEntry.tag}:scalePermille`),
          )}
          {numberField(
            "层级",
            selectedEntry.zOrder ?? 0,
            (next) => props.onEditSelectedZOrder(next),
          )}
          <label className={styles["field"]}>
            <span>镜像</span>
            <input
              type="checkbox"
              checked={selectedEntry.placement?.mirrored ?? false}
              onChange={(event) => {
                const next = event.target.checked;
                props.onEditSelectedPlacement((placement) => {
                  placement.mirrored = next;
                });
              }}
            />
          </label>
          {props.selectedDescriptor?.appearanceFields === undefined ||
              props.selectedDescriptor.appearanceFields.length === 0
            ? (
              <p className={styles["appearance"]}>
                外观：{JSON.stringify(selectedEntry.appearance ?? {})}
              </p>
            )
            : props.selectedDescriptor.appearanceFields.map((field) => (
              <label key={field.key} className={styles["field"]}>
                <span>{field.label}</span>
                <select
                  data-studio-appearance-field={field.key}
                  value={selectedEntry.appearance?.[field.key] ?? ""}
                  onChange={(event) =>
                    props.onEditSelectedAppearance(field.key, event.target.value || null)}
                >
                  <option value="">（未设置）</option>
                  {field.values.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            ))}
          <label className={styles["field"]}>
            <span>循环动效</span>
            <select
              data-studio-ambient-select={selectedEntry.tag}
              value={selectedEntry.ambient?.motionId ?? ""}
              disabled={props.busy}
              onChange={(event) => props.onEditSelectedAmbient(event.target.value || null)}
            >
              <option value="">（无）</option>
              {props.motionIds.map((motionId) => (
                <option key={motionId} value={motionId}>{motionId}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            data-studio-remove-entry={selectedEntry.tag}
            disabled={props.busy}
            onClick={props.onRemoveSelectedEntry}
          >
            移除条目（连同其 cue）
          </button>
        </div>
      )}
    </>
  );
}
