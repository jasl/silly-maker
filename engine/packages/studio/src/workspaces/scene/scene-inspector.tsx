// SPDX-License-Identifier: MIT
import { useState } from "react";
import type { ReactElement } from "react";

import type { SceneDocumentV1 } from "@sillymaker/base";

import type { StudioContentDescriptorV1 } from "../../core/binding.ts";
import styles from "../../studio-app.module.css";
import type { defaultPlacementV1 } from "./scene-compile.ts";

/**
 * The scene inspector: entry selection plus the numeric precision entry
 * over the same draft the canvas drags (x/y/scale/mirror/zOrder). Typed
 * fields carry per-field coalesce keys, so one field run is one undo step.
 * Appearance editing needs no manifest registration: manifest
 * `appearanceFields` render as structured selects, every other declared
 * key renders as a free-text row (committed only when admissible), and
 * new keys join through the add row. The 试穿 (fitting) toggle routes
 * appearance edits into an ephemeral canvas-only preview, and the
 * read-only resolution panel shows what the catalog actually resolved
 * (renderer, assets in resolution order). Entry removal (with its
 * dependent cues) also lives here.
 */

/** What the catalog resolved for the selected entry (derived, read-only). */
export interface SceneEntryResolutionV1 {
  readonly rendererId: string;
  readonly assetIds: readonly string[];
  readonly hasGeometry: boolean;
}

export interface SceneInspectorPropsV1 {
  readonly draft: SceneDocumentV1;
  readonly selectedTag: string | null;
  /** The manifest descriptor for the selected entry's content, if any. */
  readonly selectedDescriptor: StudioContentDescriptorV1 | null;
  /** The selected entry's declared appearance merged with fitting overrides. */
  readonly effectiveAppearance: Readonly<Record<string, string>>;
  /** Fitting preview: appearance edits stay canvas-only while active. */
  readonly fitting: boolean;
  /** What the catalog resolves for the effective appearance (null: unresolved). */
  readonly resolution: SceneEntryResolutionV1 | null;
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
  onToggleFitting(next: boolean): void;
  /** Binds or clears the entry's presence-bound ambient loop. */
  onEditSelectedAmbient(motionId: string | null): void;
  onRemoveSelectedEntry(): void;
}

// Mirrors the semantic-stage appearance admission grammar, so the inspector
// commits only values `parseStageAppearanceV1` would accept and a half-typed
// value never turns into a blocking compile error.
const appearanceKeyPatternV1 = /^[a-z][a-z0-9_]*$/u;
const appearanceValuePatternV1 = /^[a-z0-9][a-z0-9_.-]*$/u;
const appearanceMaxLengthV1 = 64;

function admissibleAppearanceKeyV1(key: string): boolean {
  return appearanceKeyPatternV1.test(key) && key.length <= appearanceMaxLengthV1;
}

function admissibleAppearanceValueV1(value: string): boolean {
  return appearanceValuePatternV1.test(value) && value.length <= appearanceMaxLengthV1;
}

export function SceneInspectorV1(props: SceneInspectorPropsV1): ReactElement {
  const { draft, selectedTag } = props;
  const selectedEntry = draft.entries.find((entry) => entry.tag === selectedTag) ?? null;
  const [pendingKey, setPendingKey] = useState("");
  const [pendingValue, setPendingValue] = useState("");

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

  const descriptorFields = props.selectedDescriptor?.appearanceFields ?? [];
  const coveredKeys = new Set(descriptorFields.map((field) => field.key));
  const extraKeys = Object.keys(props.effectiveAppearance).filter(
    (key) => !coveredKeys.has(key),
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
          <label className={styles["field"]}>
            <span>试穿预览</span>
            <input
              type="checkbox"
              data-studio-fitting-toggle="true"
              checked={props.fitting}
              onChange={(event) => props.onToggleFitting(event.target.checked)}
            />
          </label>
          {props.fitting
            ? (
              <p className={styles["appearance"]}>
                试穿中：外观改动只影响画布，不写入文档；关闭开关即恢复。
              </p>
            )
            : null}
          {descriptorFields.map((field) => (
            <label key={field.key} className={styles["field"]}>
              <span>{field.label}</span>
              <select
                data-studio-appearance-field={field.key}
                value={props.effectiveAppearance[field.key] ?? ""}
                onChange={(event) =>
                  props.onEditSelectedAppearance(field.key, event.target.value || null)}
              >
                <option value="">（未设置）</option>
                {field.values.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          ))}
          {extraKeys.map((key) => (
            <div key={key} className={styles["field"]} data-studio-appearance-row={key}>
              <span>{key}</span>
              <input
                type="text"
                aria-label={`外观 ${key}`}
                data-studio-appearance-extra={key}
                value={props.effectiveAppearance[key] ?? ""}
                onChange={(event) => {
                  const next = event.target.value;
                  if (admissibleAppearanceValueV1(next)) {
                    props.onEditSelectedAppearance(key, next);
                  }
                }}
              />
              <button
                type="button"
                aria-label={`移除外观 ${key}`}
                data-studio-appearance-remove={key}
                disabled={props.busy}
                onClick={() =>
                  props.onEditSelectedAppearance(key, null)}
              >
                ✕
              </button>
            </div>
          ))}
          <div className={styles["field"]} data-studio-appearance-add-row="true">
            <input
              type="text"
              aria-label="新外观键"
              placeholder="外观键"
              value={pendingKey}
              onChange={(event) => setPendingKey(event.target.value)}
            />
            <input
              type="text"
              aria-label="新外观值"
              placeholder="值"
              value={pendingValue}
              onChange={(event) => setPendingValue(event.target.value)}
            />
            <button
              type="button"
              data-studio-appearance-add="true"
              disabled={props.busy ||
                !admissibleAppearanceKeyV1(pendingKey) ||
                !admissibleAppearanceValueV1(pendingValue)}
              onClick={() => {
                props.onEditSelectedAppearance(pendingKey, pendingValue);
                setPendingKey("");
                setPendingValue("");
              }}
            >
              添加外观键
            </button>
          </div>
          <section
            className={styles["appearance"]}
            aria-label="解析结果"
            data-studio-resolution={selectedEntry.tag}
          >
            <p>
              解析 renderer：{props.resolution === null
                ? "（内容未解析）"
                : `${props.resolution.rendererId}${
                  props.resolution.hasGeometry ? "" : "（无 geometry）"
                }`}
            </p>
            {props.resolution === null
              ? null
              : props.resolution.assetIds.length === 0
              ? <p>资产：无</p>
              : (
                <ol data-studio-resolution-assets="true">
                  {props.resolution.assetIds.map((assetId, index) => (
                    <li
                      key={`${String(index)}:${assetId}`}
                      data-studio-resolution-asset={assetId}
                    >
                      {assetId}
                    </li>
                  ))}
                </ol>
              )}
          </section>
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
