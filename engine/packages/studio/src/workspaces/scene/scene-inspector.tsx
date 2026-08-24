// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import type { SceneDocumentV1, StagePlacementV1 } from "@sillymaker/base";

import type { StudioContentDescriptorV1 } from "../../core/binding.ts";
import styles from "../../studio-app.module.css";
import { defaultPlacementV1 } from "./scene-compile.ts";

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
  /** Current session revision, captured when a continuous input run starts. */
  readonly draftRevision: number;
  /** Remounts half-input numeric state across document/save boundaries. */
  readonly pendingInputScope: string;
  readonly busy: boolean;
  onSelectTag(tag: string | null): void;
  onEditSelectedPlacement(
    placement: StagePlacementV1,
    coalesceKey?: string,
  ): void;
  onEditSelectedZOrder(next: number, coalesceKey?: string): void;
  onEditSelectedAppearance(key: string, value: string | null, coalesceKey?: string): void;
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

function SceneNumberFieldV1(props: {
  readonly label: string;
  readonly value: number;
  readonly draftRevision: number;
  onValue(next: number, runRevision: number): void;
}): ReactElement {
  const runRevisionRef = useRef(props.draftRevision);
  const emittedValueRef = useRef<number | null>(null);
  const [pendingState, setPendingState] = useState(() => ({
    sourceValue: props.value,
    text: String(props.value),
  }));
  const pending = pendingState.sourceValue === props.value
    ? pendingState.text
    : String(props.value);
  const resetPending = (): void => {
    setPendingState({ sourceValue: props.value, text: String(props.value) });
  };

  useEffect(() => {
    if (emittedValueRef.current === props.value) {
      emittedValueRef.current = null;
      setPendingState((current) => ({
        sourceValue: props.value,
        text: current.text,
      }));
      return;
    }
    setPendingState({ sourceValue: props.value, text: String(props.value) });
  }, [props.draftRevision, props.value]);

  return (
    <label className={styles["field"]}>
      <span>{props.label}</span>
      <input
        type="number"
        value={pending}
        onFocus={() => {
          runRevisionRef.current = props.draftRevision;
        }}
        onChange={(event) => {
          const nextText = event.target.value;
          setPendingState({ sourceValue: props.value, text: nextText });
          if (nextText.trim().length === 0) return;
          const next = Number(nextText);
          if (Number.isSafeInteger(next)) {
            emittedValueRef.current = next;
            props.onValue(next, runRevisionRef.current);
          }
        }}
        onBlur={resetPending}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            resetPending();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function SceneAppearanceTextFieldV1(props: {
  readonly entryTag: string;
  readonly appearanceKey: string;
  readonly value: string;
  readonly draftRevision: number;
  readonly busy: boolean;
  onValue(value: string, coalesceKey: string): void;
  onRemove(): void;
}): ReactElement {
  const runRevisionRef = useRef(props.draftRevision);
  return (
    <div
      className={styles["field"]}
      data-studio-appearance-row={props.appearanceKey}
    >
      <span>{props.appearanceKey}</span>
      <input
        type="text"
        aria-label={`外观 ${props.appearanceKey}`}
        data-studio-appearance-extra={props.appearanceKey}
        value={props.value}
        onFocus={() => {
          runRevisionRef.current = props.draftRevision;
        }}
        onChange={(event) => {
          const next = event.target.value;
          if (admissibleAppearanceValueV1(next)) {
            props.onValue(
              next,
              `field:${props.entryTag}:appearance:${props.appearanceKey}:` +
                String(runRevisionRef.current),
            );
          }
        }}
      />
      <button
        type="button"
        aria-label={`移除外观 ${props.appearanceKey}`}
        data-studio-appearance-remove={props.appearanceKey}
        disabled={props.busy}
        onClick={props.onRemove}
      >
        ✕
      </button>
    </div>
  );
}

export function SceneInspectorV1(props: SceneInspectorPropsV1): ReactElement {
  const { draft, selectedTag } = props;
  const selectedEntry = draft.entries.find((entry) => entry.tag === selectedTag) ?? null;
  const [pendingKey, setPendingKey] = useState("");
  const [pendingValue, setPendingValue] = useState("");

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
          <SceneNumberFieldV1
            key={`${selectedEntry.tag as string}:x:${props.pendingInputScope}`}
            label="x"
            value={selectedEntry.placement?.x ?? 0}
            draftRevision={props.draftRevision}
            onValue={(next, runRevision) =>
              props.onEditSelectedPlacement(
                {
                  ...defaultPlacementV1(),
                  ...selectedEntry.placement,
                  x: next,
                },
                `field:${selectedEntry.tag}:x:${String(runRevision)}`,
              )}
          />
          <SceneNumberFieldV1
            key={`${selectedEntry.tag as string}:y:${props.pendingInputScope}`}
            label="y"
            value={selectedEntry.placement?.y ?? 0}
            draftRevision={props.draftRevision}
            onValue={(next, runRevision) =>
              props.onEditSelectedPlacement(
                {
                  ...defaultPlacementV1(),
                  ...selectedEntry.placement,
                  y: next,
                },
                `field:${selectedEntry.tag}:y:${String(runRevision)}`,
              )}
          />
          <SceneNumberFieldV1
            key={`${selectedEntry.tag as string}:scale:${props.pendingInputScope}`}
            label="缩放‰"
            value={selectedEntry.placement?.scalePermille ?? 1000}
            draftRevision={props.draftRevision}
            onValue={(next, runRevision) =>
              props.onEditSelectedPlacement(
                {
                  ...defaultPlacementV1(),
                  ...selectedEntry.placement,
                  scalePermille: next,
                },
                `field:${selectedEntry.tag}:scalePermille:${String(runRevision)}`,
              )}
          />
          <SceneNumberFieldV1
            key={`${selectedEntry.tag as string}:z-order:${props.pendingInputScope}`}
            label="层级"
            value={selectedEntry.zOrder ?? 0}
            draftRevision={props.draftRevision}
            onValue={(next, runRevision) =>
              props.onEditSelectedZOrder(
                next,
                `field:${selectedEntry.tag}:zOrder:${String(runRevision)}`,
              )}
          />
          <label className={styles["field"]}>
            <span>镜像</span>
            <input
              type="checkbox"
              checked={selectedEntry.placement?.mirrored ?? false}
              onChange={(event) => {
                const next = event.target.checked;
                props.onEditSelectedPlacement({
                  ...defaultPlacementV1(),
                  ...selectedEntry.placement,
                  mirrored: next,
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
            <SceneAppearanceTextFieldV1
              key={key}
              entryTag={selectedEntry.tag as string}
              appearanceKey={key}
              value={props.effectiveAppearance[key] ?? ""}
              draftRevision={props.draftRevision}
              busy={props.busy}
              onValue={(next, coalesceKey) =>
                props.onEditSelectedAppearance(key, next, coalesceKey)}
              onRemove={() => props.onEditSelectedAppearance(key, null)}
            />
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
