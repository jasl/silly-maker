// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { SceneDocumentV1, StageContentCatalogV1, StageRenderTargetV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  parseMotionDocumentV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  sceneFromDocumentV1,
  sceneSettledMutationsV1,
} from "@sillymaker/base";
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import { SemanticStageTargetHostV1 } from "@sillymaker/ui";
import {
  createDevServerMotionIoV1,
  createMotionSourceIndexV1,
  createMotionWorkbenchStoreV1,
  MotionWorkbenchLauncherV1,
} from "@sillymaker/ui/debug";
import type { MotionPreviewCaseV1 } from "@sillymaker/ui/debug";

import type { SceneIoListEntryV1, SceneSourceIoV1 } from "./scene-io.ts";
import styles from "./studio-app.module.css";

/**
 * SillyMaker Studio V1: the project-level scene workspace. The navigator
 * lists the app's `*.scene.json` sources, the canvas renders the selected
 * scene through the Story's real renderers (a detached settled target — no
 * Session, no reconciler, no gameplay state), the inspector edits the
 * selected entry's placement, and the cue list drives the replay point and
 * cue→motion bindings. Drafts live only in Studio memory; saving goes
 * through the dev-only CAS scene port and the running game picks the file
 * change up over HMR. The Scene document stays the single authoring
 * authority — Studio never becomes a second gameplay or Stage authority.
 */

export interface StudioMotionSourceV1 {
  /** App-root-relative source path, e.g. `src/scenes/x/motions/y.motion.json`. */
  readonly path: string;
  /** The raw `*.motion.json` import value (or a parsed document). */
  readonly motionDocument: unknown;
}

/** The application's Studio binding, declared in `sillymaker.config.ts`. */
export interface StudioBindingV1 {
  readonly catalog: StageContentCatalogV1;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
  /** Motion sources the scenes may bind; feeds the embedded Workbench. */
  readonly motions?: readonly StudioMotionSourceV1[];
}

export interface StudioAppPropsV1 {
  readonly binding: StudioBindingV1;
  readonly io: SceneSourceIoV1;
}

const studioPreviewStageIdV1 = "stage.studio.preview";
const studioPreviewMaxWidthV1 = 720;

interface StudioLoadedSceneV1 {
  readonly path: string;
  readonly digest: string;
  readonly saved: SceneDocumentV1;
}

type StudioCompiledV1 =
  | { readonly kind: "ok"; readonly target: StageRenderTargetV1 }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

function cloneDocumentV1(sceneDocument: SceneDocumentV1): SceneDocumentV1 {
  return JSON.parse(JSON.stringify(sceneDocument)) as SceneDocumentV1;
}

function compileSceneV1(
  draft: SceneDocumentV1,
  throughCueId: string | null,
  catalog: StageContentCatalogV1,
): StudioCompiledV1 {
  try {
    const scene = sceneFromDocumentV1(draft);
    const layerIds: string[] = [];
    for (const entry of scene.sceneDocument.entries) {
      if (!layerIds.includes(entry.layerId as string)) layerIds.push(entry.layerId as string);
    }
    if (layerIds.length === 0) return { kind: "empty" };
    const mutations = sceneSettledMutationsV1(
      scene,
      throughCueId === null ? {} : { throughCueId },
    );
    const outcome = reduceStageMutationsV1(
      createSemanticStageStateV1({ stageId: studioPreviewStageIdV1, layerIds }),
      mutations,
    );
    if (outcome.kind !== "applied") {
      return { kind: "error", message: outcome.rejection.reason };
    }
    return {
      kind: "ok",
      target: projectStageRenderTargetV1(outcome.state, catalog).target,
    };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

function defaultPlacementV1(): {
  x: number;
  y: number;
  scalePermille: number;
  opacityPermille: number;
  mirrored: boolean;
} {
  return { x: 0, y: 0, scalePermille: 1000, opacityPermille: 1000, mirrored: false };
}

/** One draft edit: clone, mutate the plain JSON, and hand back a new doc. */
function editDocumentV1(
  draft: SceneDocumentV1,
  mutate: (plain: {
    entries: {
      layerId: string;
      tag: string;
      contentId: string;
      zOrder?: number;
      placement?: ReturnType<typeof defaultPlacementV1>;
      appearance?: Record<string, string>;
    }[];
    cues: { cueId: string; kind: string; tag: string; motionId?: string }[];
  }) => void,
): SceneDocumentV1 {
  const plain = JSON.parse(JSON.stringify(draft)) as Parameters<typeof mutate>[0];
  mutate(plain);
  return plain as unknown as SceneDocumentV1;
}

export function StudioAppV1(props: StudioAppPropsV1): ReactElement {
  const { binding, io } = props;
  const [scenes, setScenes] = useState<readonly SceneIoListEntryV1[] | null>(null);
  const [loaded, setLoaded] = useState<StudioLoadedSceneV1 | null>(null);
  const [draft, setDraft] = useState<SceneDocumentV1 | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [throughCueId, setThroughCueId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openScene = useCallback((path: string): void => {
    setNote(null);
    void io.read(path).then((result) => {
      if (result.kind !== "ok") {
        setNote(`读取场景失败：${result.code}`);
        return;
      }
      setLoaded({ path, digest: result.digest, saved: result.sceneDocument });
      setDraft(cloneDocumentV1(result.sceneDocument));
      setSelectedTag(result.sceneDocument.entries[0]?.tag ?? null);
      setThroughCueId(null);
    });
  }, [io]);

  useEffect(() => {
    let active = true;
    void io.list().then((result) => {
      if (!active) return;
      if (result.kind !== "ok") {
        setScenes(Object.freeze([]));
        setNote(`场景列表不可用：${result.code}`);
        return;
      }
      setScenes(result.scenes);
    });
    return () => {
      active = false;
    };
  }, [io]);

  // The first listed scene opens automatically so the workspace never
  // greets the author with an empty canvas.
  useEffect(() => {
    if (scenes !== null && scenes.length > 0 && loaded === null && scenes[0] !== undefined) {
      openScene(scenes[0].path);
    }
  }, [scenes, loaded, openScene]);

  const compiled = useMemo(
    () => (draft === null ? null : compileSceneV1(draft, throughCueId, binding.catalog)),
    [draft, throughCueId, binding.catalog],
  );

  const dirty = useMemo(
    () =>
      loaded !== null && draft !== null &&
      JSON.stringify(loaded.saved) !== JSON.stringify(draft),
    [loaded, draft],
  );

  const motionIds = useMemo(() => {
    const ids: string[] = [];
    for (const source of binding.motions ?? []) {
      try {
        ids.push(parseMotionDocumentV1(source.motionDocument).motionId);
      } catch {
        continue;
      }
    }
    return Object.freeze(ids);
  }, [binding.motions]);

  const workbench = useMemo(() => {
    const motions = binding.motions ?? [];
    if (motions.length === 0 || draft === null) return null;
    try {
      const sources = createMotionSourceIndexV1(
        Object.fromEntries(motions.map((source) => [source.path, source.motionDocument])),
      );
      const canvas = { width: draft.canvas.width, height: draft.canvas.height };
      const cases: MotionPreviewCaseV1[] = [];
      let fallbackEntryKey: string | null = null;
      for (const cue of draft.cues) {
        if (cue.motionId === undefined) continue;
        const entry = draft.entries.find((candidate) => candidate.tag === cue.tag);
        if (entry === undefined) continue;
        const throughCue = compileSceneV1(draft, cue.cueId, binding.catalog);
        if (throughCue.kind !== "ok") continue;
        const entryKey = `${entry.layerId}:${entry.tag}`;
        fallbackEntryKey = fallbackEntryKey ?? entryKey;
        cases.push({
          caseId: cue.cueId,
          label: `${cue.cueId}（${entry.contentId}）`,
          motionId: cue.motionId,
          preview: {
            target: throughCue.target,
            renderers: binding.renderers,
            entryKey,
            canvas,
          },
        });
      }
      if (cases.length === 0 || fallbackEntryKey === null || cases[0] === undefined) return null;
      return { sources, cases, fallbackPreview: cases[0].preview };
    } catch {
      return null;
    }
  }, [binding.catalog, binding.motions, binding.renderers, draft]);

  const workbenchStore = useMemo(() => createMotionWorkbenchStoreV1(), []);
  const motionIo = useMemo(() => createDevServerMotionIoV1(), []);

  const save = useCallback((): void => {
    if (loaded === null || draft === null || busy) return;
    setBusy(true);
    setNote(null);
    void io
      .write({ path: loaded.path, expectedDigest: loaded.digest, sceneDocument: draft })
      .then((result) => {
        if (result.kind !== "ok") {
          setNote(
            result.code === "digest_conflict"
              ? "文件已被其他编辑更改——请重新加载后再改。"
              : `保存失败：${result.code}`,
          );
          return;
        }
        setLoaded({ path: loaded.path, digest: result.digest, saved: cloneDocumentV1(draft) });
        setNote("已保存；运行中的游戏会热更新。");
      })
      .finally(() => setBusy(false));
  }, [busy, draft, io, loaded]);

  const selectedEntry = draft?.entries.find((entry) => entry.tag === selectedTag) ?? null;
  const scale = draft === null ? 1 : Math.min(1, studioPreviewMaxWidthV1 / draft.canvas.width);

  const editSelectedPlacement = useCallback(
    (mutatePlacement: (placement: ReturnType<typeof defaultPlacementV1>) => void): void => {
      if (draft === null || selectedTag === null) return;
      setDraft(
        editDocumentV1(draft, (plain) => {
          const entry = plain.entries.find((candidate) => candidate.tag === selectedTag);
          if (entry === undefined) return;
          const placement = entry.placement ?? defaultPlacementV1();
          mutatePlacement(placement);
          entry.placement = placement;
        }),
      );
    },
    [draft, selectedTag],
  );

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
    <div className={styles["studio"]} data-studio-root="true">
      <header className={styles["topbar"]}>
        <strong>SillyMaker Studio</strong>
        <span className={styles["topbar-scene"]}>
          {loaded === null ? "未选择场景" : `${draft?.label ?? ""} · ${loaded.path}`}
        </span>
        <button
          type="button"
          data-studio-save="true"
          disabled={!dirty || busy || compiled === null || compiled.kind === "error"}
          onClick={save}
        >
          {busy ? "保存中…" : "保存"}
        </button>
        {loaded === null ? null : (
          <button
            type="button"
            data-studio-reload="true"
            disabled={busy}
            onClick={() => openScene(loaded.path)}
          >
            重新加载
          </button>
        )}
      </header>
      {note === null ? null : (
        <p className={styles["note"]} role="status" data-studio-note="true">
          {note}
        </p>
      )}
      <div className={styles["columns"]}>
        <nav className={styles["navigator"]} aria-label="场景">
          <h2>场景</h2>
          {scenes === null
            ? <p>加载中…</p>
            : scenes.length === 0
            ? <p>没有 *.scene.json</p>
            : (
              <ul data-studio-scenes="true">
                {scenes.map((scene) => (
                  <li key={scene.path}>
                    <button
                      type="button"
                      data-studio-scene={scene.sceneId}
                      aria-pressed={loaded?.path === scene.path}
                      onClick={() => openScene(scene.path)}
                    >
                      {scene.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </nav>
        <main className={styles["stage"]}>
          {draft === null || compiled === null
            ? <p>选择一个场景开始。</p>
            : compiled.kind === "error"
            ? (
              <p className={styles["error"]} role="alert" data-studio-compile-error="true">
                场景无法编译：{compiled.message}
              </p>
            )
            : compiled.kind === "empty"
            ? <p>这个场景还没有条目。</p>
            : (
              <div
                className={styles["canvas-clip"]}
                data-studio-canvas="true"
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
                  <SemanticStageTargetHostV1
                    target={compiled.target}
                    renderers={binding.renderers}
                    accessibleName={`场景预览 ${draft.label}`}
                  />
                </div>
              </div>
            )}
          {draft === null ? null : (
            <section className={styles["cues"]} aria-label="Cue 列表">
              <h2>Cue</h2>
              <table data-studio-cues="true">
                <thead>
                  <tr>
                    <th>cue</th>
                    <th>kind</th>
                    <th>tag</th>
                    <th>motion</th>
                    <th>查看</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.cues.map((cue) => (
                    <tr key={cue.cueId} data-studio-cue={cue.cueId}>
                      <td>{cue.cueId}</td>
                      <td>{cue.kind}</td>
                      <td>{cue.tag}</td>
                      <td>
                        {cue.kind !== "show" ? (cue.motionId ?? "—") : (
                          <select
                            aria-label={`${cue.cueId} 的 motion`}
                            value={cue.motionId ?? ""}
                            onChange={(event) => {
                              const next = event.target.value;
                              setDraft(
                                editDocumentV1(draft, (plain) => {
                                  const target = plain.cues.find(
                                    (candidate) => candidate.cueId === cue.cueId,
                                  );
                                  if (target === undefined) return;
                                  if (next === "") delete target.motionId;
                                  else target.motionId = next;
                                }),
                              );
                            }}
                          >
                            <option value="">（无）</option>
                            {motionIds.map((motionId) => (
                              <option key={motionId} value={motionId}>{motionId}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          aria-pressed={throughCueId === cue.cueId}
                          onClick={() =>
                            setThroughCueId(throughCueId === cue.cueId ? null : cue.cueId)}
                        >
                          到此为止
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </main>
        <aside className={styles["inspector"]} aria-label="检视器">
          <h2>检视器</h2>
          {draft === null ? <p>—</p> : (
            <>
              <label className={styles["field"]}>
                <span>条目</span>
                <select
                  data-studio-entry-select="true"
                  value={selectedTag ?? ""}
                  onChange={(event) => setSelectedTag(event.target.value || null)}
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
                      editSelectedPlacement((placement) => {
                        placement.x = next;
                      }),
                  )}
                  {numberField(
                    "y",
                    selectedEntry.placement?.y ?? 0,
                    (next) =>
                      editSelectedPlacement((placement) => {
                        placement.y = next;
                      }),
                  )}
                  {numberField(
                    "缩放‰",
                    selectedEntry.placement?.scalePermille ?? 1000,
                    (next) =>
                      editSelectedPlacement((placement) => {
                        placement.scalePermille = next;
                      }),
                  )}
                  {numberField(
                    "层级",
                    selectedEntry.zOrder ?? 0,
                    (next) => {
                      setDraft(
                        editDocumentV1(draft, (plain) => {
                          const entry = plain.entries.find(
                            (candidate) => candidate.tag === selectedEntry.tag,
                          );
                          if (entry !== undefined) entry.zOrder = next;
                        }),
                      );
                    },
                  )}
                  <label className={styles["field"]}>
                    <span>镜像</span>
                    <input
                      type="checkbox"
                      checked={selectedEntry.placement?.mirrored ?? false}
                      onChange={(event) => {
                        const next = event.target.checked;
                        editSelectedPlacement((placement) => {
                          placement.mirrored = next;
                        });
                      }}
                    />
                  </label>
                  <p className={styles["appearance"]}>
                    外观：{JSON.stringify(selectedEntry.appearance ?? {})}
                  </p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      {workbench === null
        ? null
        : (
          <section className={styles["workbench"]} aria-label="Motion 工坊">
            <h2>Motion 工坊</h2>
            <MotionWorkbenchLauncherV1
              store={workbenchStore}
              sources={workbench.sources}
              fallbackPreview={workbench.fallbackPreview}
              cases={workbench.cases}
              io={motionIo}
            />
          </section>
        )}
    </div>
  );
}
