// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type {
  AdmittedAuthoringSceneV1,
  AuthoringSceneFacetProjectionV1,
} from "@sillymaker/base/authoring/scene";
import { parseStageContentIdV1 } from "@sillymaker/base";
import type { StageContentIdV1, StagePlacementV1, StageTagV1 } from "@sillymaker/base";

import { sceneAuthoringOperationSchemaRevisionV1 } from "../core/scene-operations/contract.ts";
import type { SceneAuthoringOperationV1 } from "../core/scene-operations/contract.ts";
import { inspectorObjectOrderingV1 } from "./scene-model.ts";
import styles from "./inspector.module.css";

export interface InspectorObjectPanelPropsV1 {
  readonly scene: AdmittedAuthoringSceneV1;
  readonly facets: AuthoringSceneFacetProjectionV1;
  readonly selectedObjectId: StageTagV1 | null;
  readonly draftRevision: number;
  readonly disabled: boolean;
  execute(operation: SceneAuthoringOperationV1, coalesceKey?: string): void;
}

function NumberFieldV1(props: {
  readonly label: string;
  readonly value: number;
  readonly disabled: boolean;
  readonly min?: number;
  readonly max?: number;
  commit(value: number): void;
}): ReactElement {
  return (
    <label className={styles.field}>
      <span>{props.label}</span>
      <input
        key={props.value}
        type="number"
        defaultValue={props.value}
        disabled={props.disabled}
        {...(props.min === undefined ? {} : { min: props.min })}
        {...(props.max === undefined ? {} : { max: props.max })}
        onBlur={(event) => {
          const value = Number(event.currentTarget.value);
          if (Number.isSafeInteger(value) && value !== props.value) props.commit(value);
          else event.currentTarget.value = String(props.value);
        }}
      />
    </label>
  );
}

function facetSummaryV1(
  label: string,
  values: readonly { readonly id: string; readonly detail: string }[],
): ReactElement {
  return (
    <section className={styles["facet-group"]}>
      <h4>{label}</h4>
      {values.length === 0 ? <span className={styles.muted}>无</span> : (
        <ul>
          {values.map((value) => (
            <li key={`${label}:${value.id}`}>
              <code>{value.id}</code>
              <span>{value.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function InspectorObjectPanelV1(props: InspectorObjectPanelPropsV1): ReactElement {
  const selected = props.selectedObjectId === null
    ? undefined
    : props.facets.objects[props.selectedObjectId];
  if (selected === undefined) {
    return (
      <section className={styles.panel} aria-label="对象 Inspector">
        <header className={styles["section-header"]}>
          <div>
            <strong>Inspector</strong>
            <span>选择一个对象</span>
          </div>
        </header>
        <p className={styles.empty}>从层级树或预览画布选择对象。</p>
      </section>
    );
  }

  const inspection = selected.inspection;
  const objectId = inspection.objectId;
  const placement = inspection.localTransform;
  const ordering = inspectorObjectOrderingV1(props.scene.document, objectId);
  const layerIndex = props.scene.document.layers.findIndex(
    (layer) => layer.layerId === inspection.layerId,
  );
  const replacePlacement = (patch: Partial<StagePlacementV1>, field: string): void => {
    props.execute(
      {
        schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
        kind: "scene.object.set_local_transform",
        objectId: inspection.objectId,
        localTransform: { ...placement, ...patch },
      },
      `inspector:${objectId}:transform:${field}`,
    );
  };
  const visual = inspection.visual;

  return (
    <section
      className={styles.panel}
      aria-label="对象 Inspector"
      data-inspector-object-panel={objectId}
    >
      <header className={styles["section-header"]}>
        <div>
          <strong>{inspection.label}</strong>
          <span>{objectId}</span>
        </div>
      </header>
      <div className={styles["inspector-body"]}>
        <section className={styles["property-group"]}>
          <h3>Transform（local）</h3>
          <div className={styles["field-grid"]}>
            <NumberFieldV1
              label="X"
              value={placement.x}
              disabled={props.disabled}
              commit={(value) => replacePlacement({ x: value }, "x")}
            />
            <NumberFieldV1
              label="Y"
              value={placement.y}
              disabled={props.disabled}
              commit={(value) => replacePlacement({ y: value }, "y")}
            />
            <NumberFieldV1
              label="Scale ‰"
              value={placement.scalePermille}
              min={1}
              disabled={props.disabled}
              commit={(value) => replacePlacement({ scalePermille: value }, "scale")}
            />
            <NumberFieldV1
              label="Opacity ‰"
              value={placement.opacityPermille}
              min={0}
              max={1_000}
              disabled={props.disabled}
              commit={(value) => replacePlacement({ opacityPermille: value }, "opacity")}
            />
          </div>
          <label className={styles["checkbox-field"]}>
            <input
              type="checkbox"
              checked={placement.mirrored}
              disabled={props.disabled}
              onChange={(event) =>
                replacePlacement({ mirrored: event.currentTarget.checked }, "mirror")}
            />
            水平镜像
          </label>
        </section>

        <section className={styles["property-group"]}>
          <h3>Visual / Appearance</h3>
          {visual === null
            ? <p className={styles.muted}>分组对象没有 Visual；本轮不在 Inspector 中创建组件。</p>
            : (
              <>
                <label className={styles.field}>
                  <span>contentId</span>
                  <input
                    key={`${props.draftRevision}:${visual.contentId}`}
                    defaultValue={visual.contentId}
                    disabled={props.disabled}
                    onBlur={(event) => {
                      const input = event.currentTarget;
                      const contentId = event.currentTarget.value.trim();
                      if (contentId === visual.contentId) return;
                      let admittedContentId: StageContentIdV1;
                      try {
                        admittedContentId = parseStageContentIdV1(contentId);
                      } catch {
                        input.value = visual.contentId;
                        return;
                      }
                      props.execute({
                        schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
                        kind: "scene.object.set_visual_content",
                        objectId: inspection.objectId,
                        contentId: admittedContentId,
                      });
                    }}
                  />
                </label>
                {Object.entries(visual.appearance).length === 0
                  ? <p className={styles.muted}>当前 Visual 没有 appearance 字段。</p>
                  : Object.entries(visual.appearance).map(([key, value]) => (
                    <label className={styles.field} key={key}>
                      <span>{key}</span>
                      <input
                        key={`${props.draftRevision}:${key}:${value}`}
                        defaultValue={value}
                        disabled={props.disabled}
                        onBlur={(event) => {
                          const next = event.currentTarget.value.trim();
                          if (next === value) {
                            return;
                          }
                          props.execute({
                            schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
                            kind: "scene.object.set_appearance",
                            objectId: inspection.objectId,
                            key,
                            value: next.length === 0 ? null : next,
                          });
                        }}
                      />
                    </label>
                  ))}
              </>
            )}
        </section>

        <section className={styles["property-group"]}>
          <h3>Render order</h3>
          <div className={styles["button-row"]}>
            <button
              type="button"
              disabled={props.disabled || ordering?.previousObjectId === null}
              onClick={() => {
                if (ordering?.previousObjectId === null || ordering === null) return;
                props.execute({
                  schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
                  kind: "scene.object.move_before",
                  objectId: inspection.objectId,
                  beforeObjectId: ordering.previousObjectId,
                });
              }}
            >
              降低对象层序
            </button>
            <button
              type="button"
              disabled={props.disabled || ordering === null || !ordering.canMoveLater}
              onClick={() => {
                if (ordering === null) return;
                props.execute({
                  schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
                  kind: "scene.object.move_before",
                  objectId: inspection.objectId,
                  beforeObjectId: ordering.laterBeforeObjectId === null
                    ? null
                    : ordering.laterBeforeObjectId,
                });
              }}
            >
              提高对象层序
            </button>
          </div>
          <div className={styles["button-row"]}>
            <button
              type="button"
              disabled={props.disabled || layerIndex <= 0}
              onClick={() => {
                const previous = props.scene.document.layers[layerIndex - 1];
                if (previous === undefined) return;
                props.execute({
                  schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
                  kind: "scene.layer.move_before",
                  layerId: inspection.layerId,
                  beforeLayerId: previous.layerId,
                });
              }}
            >
              降低 Layer
            </button>
            <button
              type="button"
              disabled={props.disabled || layerIndex === -1 ||
                layerIndex === props.scene.document.layers.length - 1}
              onClick={() => {
                const later = props.scene.document.layers[layerIndex + 2];
                props.execute({
                  schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
                  kind: "scene.layer.move_before",
                  layerId: inspection.layerId,
                  beforeLayerId: later?.layerId ?? null,
                });
              }}
            >
              提高 Layer
            </button>
          </div>
        </section>

        <section className={styles["property-group"]}>
          <h3>Read-only facets</h3>
          {facetSummaryV1(
            "Hit regions",
            selected.hitRegions.map((region) => ({
              id: region.regionId,
              detail: `${region.status}${region.intentId === null ? "" : ` · ${region.intentId}`}`,
            })),
          )}
          {facetSummaryV1(
            "Motion",
            selected.motions.map((motion) => ({
              id: motion.motionId,
              detail: `${motion.status} · ${motion.channels.join(", ") || "no channels"}`,
            })),
          )}
          {facetSummaryV1(
            "Timeline",
            selected.timelines.map((timeline) => ({
              id: timeline.timelineId,
              detail: `${timeline.status} · ${
                timeline.channels.map((channel) => channel.property).join(", ") || "no channels"
              }`,
            })),
          )}
          {facetSummaryV1("Interaction", [
            ...selected.interactions.map((interaction) => ({
              id: interaction.intentId,
              detail: `${interaction.status} · region ${interaction.regionId}`,
            })),
            ...selected.guiControls.map((control) => ({
              id: control.intentId,
              detail: `${control.status} · GUI ${control.controlId}`,
            })),
          ])}
        </section>

        <section className={styles["property-group"]}>
          <h3>Source provenance</h3>
          <code data-inspector-source-pointer={inspection.jsonPointer}>
            {inspection.jsonPointer}
          </code>
          <span className={styles.muted}>compiled layer: {inspection.layerId}</span>
        </section>
      </div>
    </section>
  );
}
