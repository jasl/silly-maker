// SPDX-License-Identifier: MIT
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { SceneInspectorRenderInputV1 } from "@sillymaker/studio";
import { openStorySourceInDevServerV1 } from "@sillymaker/ui/debug/dev-source-client";

import {
  type NarrativeRouteV1,
  projectVnLastSoundCheckNarrativeInspectionV1,
} from "./narrative-inspector-projection.ts";
import styles from "./narrative-inspector.module.css";

const narrativeSourcePathV1 = "src/story/narrative.ts";
const audioSourcePathV1 = "src/content/audio.ts";

const routeLabelsV1: Readonly<Record<NarrativeRouteV1, string>> = {
  shared: "共通",
  archive: "归档路线",
  present: "当下路线",
};

function compactCueLabelV1(cueId: string): string {
  const separator = cueId.lastIndexOf(".");
  return separator === -1 ? cueId : cueId.slice(separator + 1);
}

function SourceOpenButtonV1(props: {
  readonly label: string;
  readonly ariaLabel: string;
  readonly path: string;
  report(result: string): void;
}): ReactElement {
  return (
    <button
      type="button"
      title={props.path}
      aria-label={props.ariaLabel}
      onClick={() => {
        void openStorySourceInDevServerV1(props.path).then((opened) => {
          props.report(opened ? `已在编辑器打开 ${props.path}` : `无法打开 ${props.path}`);
        });
      }}
    >
      {props.label}
    </button>
  );
}

export function VnLastSoundCheckNarrativeInspectorPanelV1(props: {
  readonly input: SceneInspectorRenderInputV1;
}): ReactElement {
  const [status, setStatus] = useState<string | null>(null);
  const inspection = useMemo(
    () =>
      projectVnLastSoundCheckNarrativeInspectionV1(
        props.input.scene,
        props.input.selectedObjectId,
      ),
    [props.input.scene, props.input.selectedObjectId],
  );
  return (
    <div className={styles.summary}>
      <dl>
        <dt>Scene</dt>
        <dd>
          <code>{inspection.sceneId}</code>
        </dd>
        <dt>当前对象</dt>
        <dd>{inspection.selectedObjectId ?? "未选择"}</dd>
        <dt>源码位置</dt>
        <dd>{inspection.selectedObjectJsonPointer ?? "—"}</dd>
      </dl>

      <div className={styles["source-actions"]}>
        {inspection.sceneSourcePath === null ? null : (
          <SourceOpenButtonV1
            label="打开 Scene"
            ariaLabel={`打开 Scene：${inspection.sceneId}`}
            path={inspection.sceneSourcePath}
            report={setStatus}
          />
        )}
        <SourceOpenButtonV1
          label="打开剧本"
          ariaLabel="打开《最后一次试音》剧本"
          path={narrativeSourcePathV1}
          report={setStatus}
        />
      </div>
      {status === null ? null : <p className={styles.status} role="status">{status}</p>}

      <details className={styles.group} open>
        <summary>场景绑定（{inspection.sceneBindings.length}）</summary>
        {inspection.sceneBindings.length === 0
          ? <p className={styles.empty}>当前 Scene 没有 Narrative 引用。</p>
          : (
            <div className={styles["binding-list"]}>
              {inspection.sceneBindings.map((binding) => (
                <article className={styles["binding-card"]} key={binding.nodeId}>
                  <code>{binding.nodeId}</code>
                  <dl className={styles["binding-meta"]}>
                    <dt>路线</dt>
                    <dd>{routeLabelsV1[binding.route]}</dd>
                    <dt>操作</dt>
                    <dd>
                      {binding.opensScene ? <span>打开 Scene</span> : null}
                      {binding.cueIds.length === 0 ? null : (
                        <span className={styles["cue-list"]}>
                          {binding.cueIds.map((cueId) => (
                            <code title={cueId} key={cueId}>{compactCueLabelV1(cueId)}</code>
                          ))}
                        </span>
                      )}
                      {binding.changesSelectedAppearance ? <span>修改当前对象外观</span> : null}
                      {!binding.opensScene && binding.cueIds.length === 0 &&
                          !binding.changesSelectedAppearance
                        ? "—"
                        : null}
                    </dd>
                  </dl>
                </article>
              ))}
            </div>
          )}
      </details>

      <details className={styles.group}>
        <summary>当前对象 Cue（{inspection.selectedCueIds.length}）</summary>
        {inspection.selectedCueIds.length === 0
          ? <p className={styles.empty}>当前对象没有 Cue。</p>
          : (
            <div className={styles["binding-list"]}>
              {inspection.selectedCueIds.map((cueId) => <code key={cueId}>{cueId}</code>)}
            </div>
          )}
      </details>

      <details className={styles.group}>
        <summary>角色台词（{inspection.dialogueBindings.length}）</summary>
        {inspection.dialogueBindings.length === 0
          ? <p className={styles.empty}>所选对象未绑定 VN 说话人。</p>
          : (
            <div className={styles["binding-list"]}>
              {inspection.dialogueBindings.map((binding) => (
                <article className={styles["binding-card"]} key={binding.nodeId}>
                  <code>{binding.nodeId}</code>
                  <dl className={styles["binding-meta"]}>
                    <dt>路线</dt>
                    <dd>{routeLabelsV1[binding.route]}</dd>
                    <dt>文本</dt>
                    <dd>
                      <code>{binding.textId}</code>
                    </dd>
                    <dt>语音</dt>
                    <dd>{binding.voiceAssetId ?? "未绑定"}</dd>
                  </dl>
                  <div className={styles["source-actions"]}>
                    <SourceOpenButtonV1
                      label="打开文本"
                      ariaLabel={`打开文本：${binding.textId}`}
                      path={binding.textSourcePath}
                      report={setStatus}
                    />
                    {binding.voiceAssetId === null ? null : (
                      <SourceOpenButtonV1
                        label="打开语音绑定"
                        ariaLabel={`打开语音绑定：${binding.voiceAssetId}`}
                        path={audioSourcePathV1}
                        report={setStatus}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
      </details>
    </div>
  );
}
