// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import { useAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type {
  RegionsDocumentV1,
  SceneDocumentV1,
  StageAppearanceV1,
  StageContentIdV1,
  StagePlacementV1,
} from "@sillymaker/base";
import type { AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type { SceneIoListEntryV1, SceneIoListSkipV1, SceneSourceIoV1 } from "./core/scene-io.ts";
import { createSceneDocumentSessionV1 } from "./core/scene-session.ts";
import { createSceneAuthoringLocalAdapterV1 } from "./core/scene-operations/local-adapter.ts";
import type {
  SceneAuthoringCurrentV1,
  SceneAuthoringExecutionResultV1,
  SceneAuthoringOperationV1,
} from "./core/scene-operations/contract.ts";
import { loadStudioMotionSourcesV1 } from "./core/motion-sources.ts";
import type { StudioMotionSourcesV1 } from "./core/motion-sources.ts";
import type { RegionsSourceIoV1 } from "./core/regions-io.ts";
import { createRegionsDocumentSessionV1 } from "./core/regions-session.ts";
import { applyPreviewAppearanceV1, compileSceneV1 } from "./workspaces/scene/scene-compile.ts";
import {
  deriveMotionPlanV1,
  deriveContentEntryV1,
  deriveCueV1,
  inferSceneIdPrefixV1,
  newSceneDocumentV1,
} from "./workspaces/scene/scene-construction.ts";
import { SceneCanvasV1 } from "./workspaces/scene/scene-canvas.tsx";
import { SceneCuesV1 } from "./workspaces/scene/scene-cues.tsx";
import { SceneInspectorV1 } from "./workspaces/scene/scene-inspector.tsx";
import type { SceneEntryResolutionV1 } from "./workspaces/scene/scene-inspector.tsx";
import { ContentBrowserV1 } from "./workspaces/content/content-browser.tsx";
import {
  createFlowWorkspaceActivationOwnerInternalV1,
  ProgressiveFlowWorkspaceHostInternalV1,
  useDisposeFlowWorkspaceActivationOnUnmountInternalV1,
} from "./workspaces/flow/flow-workspace-activation.tsx";
import type { FlowWorkspaceActivationOwnerInternalV1 } from "./workspaces/flow/flow-workspace-activation.tsx";
import {
  buildMotionCatalogV1,
  buildMotionWorkbenchModelV1,
} from "./workspaces/motion/motion-cases.ts";
import { MotionWorkspaceSectionV1 } from "./workspaces/motion/motion-workspace.tsx";
import { RegionsWorkspaceSectionV1 } from "./workspaces/regions/regions-workspace.tsx";
import type { StudioBindingV1, StudioContentDescriptorV1 } from "./core/binding.ts";
import styles from "./studio-app.module.css";

export type {
  NarrativeFlowEdgeLabelV1,
  NarrativeFlowGraphEdgeV1,
  NarrativeFlowGraphNodeV1,
  NarrativeFlowGraphV1,
  StudioAppearanceFieldV1,
  StudioAssetRegistryPortV1,
  StudioBindingV1,
  StudioContentDescriptorV1,
} from "./core/binding.ts";

/**
 * SillyMaker Studio: the unified authoring shell. The shell owns project
 * navigation, the shared authoring document session (drafts, dirty, CAS
 * saves, undo/redo, the dirty-navigation gate, the stale-open fence), the
 * authoring-diagnostics panel, and asset preloading; the workspaces own
 * their domain representations — the scene workspace's canvas/inspector/
 * cue table and the embedded Motion workspace. Drafts live only in session
 * memory; saving goes through the dev-only CAS scene port and the running
 * game picks the file change up over HMR. The Scene document stays the
 * single authoring authority — Studio never becomes a second gameplay or
 * Stage authority.
 */

export interface StudioAppPropsV1 {
  readonly binding: StudioBindingV1;
  readonly io: SceneSourceIoV1;
  /** The motion port: the index-backed list plus per-document read/write. */
  readonly motionIo: MotionSourceIoV1;
  /** The regions port; omitted hides the Regions workspace entirely. */
  readonly regionsIo?: RegionsSourceIoV1;
}

interface StudioAppWithAuthoringSessionsPropsV1 extends StudioAppPropsV1 {
  readonly sceneSession: AuthoringDocumentSessionV1<SceneDocumentV1>;
  readonly regionsSession: AuthoringDocumentSessionV1<RegionsDocumentV1> | null;
  readonly flowActivation: FlowWorkspaceActivationOwnerInternalV1;
}

const studioPreviewMaxWidthV1 = 720;

function saveNoteV1(code: string): string {
  return code === "digest_conflict"
    ? "文件已被其他编辑更改——请重新加载后再改。"
    : `保存失败：${code}`;
}

export function StudioAppV1(props: StudioAppPropsV1): ReactElement {
  const sceneSession = useMemo(() => createSceneDocumentSessionV1(props.io), [props.io]);
  const regionsSession = useMemo(
    () => props.regionsIo === undefined ? null : createRegionsDocumentSessionV1(props.regionsIo),
    [props.regionsIo],
  );
  const flowActivation = useMemo(() => createFlowWorkspaceActivationOwnerInternalV1(), []);
  useDisposeFlowWorkspaceActivationOnUnmountInternalV1(flowActivation);
  return (
    <StudioAppWithAuthoringSessionsV1
      {...props}
      sceneSession={sceneSession}
      regionsSession={regionsSession}
      flowActivation={flowActivation}
    />
  );
}

/** Package-internal seam that keeps authoring sessions across live-publication staging roots. */
export function StudioAppWithAuthoringSessionsV1(
  props: StudioAppWithAuthoringSessionsPropsV1,
): ReactElement {
  const { binding, io, motionIo, regionsIo, regionsSession } = props;
  const [scenes, setScenes] = useState<readonly SceneIoListEntryV1[] | null>(null);
  const [sceneSkips, setSceneSkips] = useState<readonly SceneIoListSkipV1[]>(Object.freeze([]));
  // Index-enumerated motion documents (null while loading); registration-free.
  const [motionSources, setMotionSources] = useState<StudioMotionSourcesV1 | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [throughCueId, setThroughCueId] = useState<string | null>(null);
  // 试穿 (fitting) preview: per-tag appearance overrides that recompile the
  // canvas only — the session draft, dirty state, and saves never see them.
  const [fitting, setFitting] = useState(false);
  const [fittingByTag, setFittingByTag] = useState<
    Readonly<Record<string, Readonly<Record<string, string>>>>
  >(Object.freeze({}));
  const [note, setNote] = useState<string | null>(null);
  /** A dirty draft gates navigation: save, discard, or cancel — never silent loss. */
  const [confirmNavigation, setConfirmNavigation] = useState<{ readonly path: string } | null>(
    null,
  );
  const [assetWarning, setAssetWarning] = useState<string | null>(null);
  // Declared hit regions render as labeled outlines by default: authors
  // place art against the interactive areas, not blind.
  const [showHitRegions, setShowHitRegions] = useState(true);
  // Scene Construction: the new-scene form (navigator) and the busy flag
  // shared by every dev-port create call.
  const [newSceneStem, setNewSceneStem] = useState<string | null>(null);
  const [newSceneLabel, setNewSceneLabel] = useState("");
  const [creating, setCreating] = useState(false);
  // Bumped after a motion create so the index-backed catalog re-lists.
  const [motionsRevision, setMotionsRevision] = useState(0);
  const [scenesRevision, setScenesRevision] = useState(0);

  // The shared authoring session owns saved/draft/dirty, the CAS save, the
  // monotonic open fence, and undo/redo; the shell maps its results to
  // notes and confirms.
  const session = props.sceneSession;
  const sceneOperations = useMemo(() => createSceneAuthoringLocalAdapterV1(session), [session]);
  const snapshot = useAuthoringDocumentSessionV1(session);
  const draft = snapshot.draft;
  const dirty = snapshot.dirty;
  const busy = snapshot.saving;
  const loading = snapshot.loading;

  const sceneOperationCurrent = useMemo<SceneAuthoringCurrentV1 | null>(
    () =>
      draft === null || snapshot.documentIdentity === null ? null : Object.freeze({
        documentIdentity: snapshot.documentIdentity,
        draftRevision: snapshot.draftRevision,
      }),
    [draft, snapshot.documentIdentity, snapshot.draftRevision],
  );

  const executeSceneOperationAt = useCallback((
    current: SceneAuthoringCurrentV1,
    operation: SceneAuthoringOperationV1,
    coalesceKey?: string,
  ): SceneAuthoringExecutionResultV1 => {
    const result = sceneOperations.execute({
      documentIdentity: current.documentIdentity,
      expectedDraftRevision: current.draftRevision,
      operation,
      ...(coalesceKey === undefined ? {} : { coalesceKey }),
    });
    if (
      result.kind === "rejected" &&
      result.diagnostic.code !== "scene_authoring.no_change"
    ) {
      setNote(`编辑未应用：${result.diagnostic.code}`);
    } else {
      setNote((previousNote) => previousNote?.startsWith("编辑未应用：") ? null : previousNote);
    }
    return result;
  }, [sceneOperations]);

  const executeSceneOperation = useCallback((
    operation: SceneAuthoringOperationV1,
    coalesceKey?: string,
  ): SceneAuthoringExecutionResultV1 | null => {
    return sceneOperationCurrent === null
      ? null
      : executeSceneOperationAt(sceneOperationCurrent, operation, coalesceKey);
  }, [executeSceneOperationAt, sceneOperationCurrent]);

  const selectedTagCurrent = selectedTag !== null &&
      draft?.entries.some((entry) => (entry.tag as string) === selectedTag)
    ? selectedTag
    : (draft?.entries[0]?.tag as string | undefined) ?? null;
  const throughCueIdCurrent = throughCueId !== null &&
      draft?.cues.some((cue) => cue.cueId === throughCueId)
    ? throughCueId
    : null;

  const openScene = useCallback((path: string): void => {
    setNote(null);
    setConfirmNavigation(null);
    void session.open(path).then((result) => {
      if (result.kind === "stale") return;
      if (result.kind === "error") {
        setNote(`读取场景失败：${result.code}`);
        return;
      }
      const opened = session.getSnapshot().draft;
      setSelectedTag((opened?.entries[0]?.tag as string | undefined) ?? null);
      setThroughCueId(null);
      setFitting(false);
      setFittingByTag(Object.freeze({}));
      setAssetWarning(null);
    });
  }, [session]);

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
      setSceneSkips(result.skipped);
    });
    return () => {
      active = false;
    };
  }, [io, scenesRevision]);

  // The motion catalog comes from the Project Authoring Index (list) plus
  // per-document reads — no hand-registered source paths anywhere. The
  // revision bumps after a motion create so the new document lists.
  useEffect(() => {
    let active = true;
    void loadStudioMotionSourcesV1(motionIo).then((result) => {
      if (active) setMotionSources(result);
    });
    return () => {
      active = false;
    };
  }, [motionIo, motionsRevision]);

  // The first listed scene opens automatically so the workspace never
  // greets the author with an empty canvas. A failed first open must not
  // retry on the loading false-edge — path stays null, and putting
  // `loading` in this effect's deps would loop forever (S0 kept `loaded`
  // null on error and did not re-fire). Authors retry from the navigator.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (
      autoOpenedRef.current || scenes === null || scenes.length === 0 ||
      snapshot.path !== null || scenes[0] === undefined
    ) {
      return;
    }
    autoOpenedRef.current = true;
    openScene(scenes[0].path);
  }, [scenes, snapshot.path, openScene]);

  const compiled = useMemo(
    () => (draft === null ? null : compileSceneV1(draft, throughCueIdCurrent, binding.catalog)),
    [draft, throughCueIdCurrent, binding.catalog],
  );
  // Save gating and blocking diagnostics stay on the real draft's compile;
  // the fitting preview only ever swaps what the canvas renders.
  const compileBlocked = compiled === null || compiled.kind === "error";

  const fittingCompiled = useMemo(() => {
    if (draft === null || !fitting || Object.keys(fittingByTag).length === 0) return null;
    return compileSceneV1(
      applyPreviewAppearanceV1(draft, fittingByTag),
      throughCueIdCurrent,
      binding.catalog,
    );
  }, [binding.catalog, draft, fitting, fittingByTag, throughCueIdCurrent]);
  const canvasCompiled = fittingCompiled !== null && fittingCompiled.kind === "ok"
    ? fittingCompiled
    : compiled;

  // Navigation gate: switching or reloading a scene with a dirty draft asks
  // first; the browser unload path gets the same protection.
  const requestOpenScene = useCallback((path: string): void => {
    if (dirty) {
      setConfirmNavigation({ path });
      return;
    }
    openScene(path);
  }, [dirty, openScene]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const motionCatalog = useMemo(() => buildMotionCatalogV1(motionSources), [motionSources]);
  const workbench = useMemo(
    () => buildMotionWorkbenchModelV1(motionSources, binding, draft),
    [motionSources, binding, draft],
  );

  // Real art: preload the assets the compiled targets require and re-render
  // as bytes arrive; the Story's renderers resolve URLs from the same
  // registry, so loaded images replace the code-native fallbacks in place.
  const assets = binding.assets ?? null;
  const assetsRevision = useSyncExternalStore(
    useCallback(
      (listener: () => void) => (assets === null ? () => {} : assets.subscribe(listener)),
      [assets],
    ),
    () => (assets === null ? 0 : assets.observe().revision),
    () => 0,
  );
  void assetsRevision;

  // Newline-joined key: placement drags recompile the target but keep the
  // same asset set, so they must not restart the preload effect.
  const requiredAssetIdsKey = useMemo(() => {
    const ids = new Set<string>();
    if (canvasCompiled !== null && canvasCompiled.kind === "ok") {
      for (const assetId of canvasCompiled.target.requiredAssetIds) ids.add(assetId as string);
    }
    if (workbench.kind === "ready") {
      for (const previewCase of workbench.cases) {
        for (const assetId of previewCase.preview.target.requiredAssetIds) {
          ids.add(assetId as string);
        }
      }
    }
    return [...ids].sort().join("\n");
  }, [canvasCompiled, workbench]);

  useEffect(() => {
    if (assets === null || requiredAssetIdsKey.length === 0) return undefined;
    const controller = new AbortController();
    try {
      void assets.preload(requiredAssetIdsKey.split("\n"), controller.signal)
        .then(() => setAssetWarning(null))
        .catch(() => {
          // Failed loads keep the code-native fallback; the dev canvas
          // never crashes over missing art — but the author must know.
          if (!controller.signal.aborted) {
            setAssetWarning("部分资产加载失败，画布显示替代图形。");
          }
        });
    } catch {
      setAssetWarning("部分资产标识无法解析，画布显示替代图形。");
    }
    return () => controller.abort();
  }, [assets, requiredAssetIdsKey]);

  const save = useCallback((): void => {
    setNote(null);
    void session.save().then((result) => {
      if (result.kind === "ok") {
        setNote(
          session.getSnapshot().dirty
            ? "已保存先前版本；当前仍有未保存修改。"
            : "已保存；运行中的游戏会热更新。",
        );
      } else if (result.kind === "error") setNote(saveNoteV1(result.code));
    });
  }, [session]);

  const confirmSaveAndOpen = useCallback((): void => {
    // The same compile guard as the top-bar save: a non-compilable draft
    // cannot be persisted from the navigation confirm either.
    if (confirmNavigation === null || busy || compileBlocked) return;
    const path = confirmNavigation.path;
    void session.save().then((result) => {
      if (result.kind === "ok") {
        if (session.getSnapshot().dirty) {
          setNote("已保存先前版本；当前仍有未保存修改。");
          return;
        }
        setNote("已保存；运行中的游戏会热更新。");
        openScene(path);
      } else if (result.kind === "error") {
        setNote(saveNoteV1(result.code));
      }
    });
  }, [busy, compileBlocked, confirmNavigation, openScene, session]);

  const confirmDiscardAndOpen = useCallback((): void => {
    if (confirmNavigation === null) return;
    openScene(confirmNavigation.path);
  }, [confirmNavigation, openScene]);

  const scale = draft === null ? 1 : Math.min(1, studioPreviewMaxWidthV1 / draft.canvas.width);

  // Renderer coverage derives from the compiled target every recompile, so
  // fixed gaps heal on their own (empty rendererIds are already reported by
  // the projection as stage.renderer_missing / content_unresolved).
  const rendererWarnings = useMemo(() => {
    if (compiled === null || compiled.kind !== "ok") return Object.freeze([]) as readonly string[];
    const lines: string[] = [];
    for (const layer of compiled.target.layers) {
      for (const entry of layer.entries) {
        if (
          (entry.rendererId as string) === "" ||
          Object.hasOwn(binding.renderers, entry.rendererId as string)
        ) {
          continue;
        }
        const line = `stage.renderer_unregistered: ${entry.key}（renderer "${entry
          .rendererId as string}" 未在 Studio 绑定注册）`;
        if (!lines.includes(line)) lines.push(line);
      }
    }
    return Object.freeze(lines);
  }, [binding.renderers, compiled]);

  // Placeable manifest content whose resolution declares no geometry gets
  // no canvas selection box; the author must know why dragging is missing
  // (backgrounds legitimately omit geometry and stay quiet).
  const geometryWarnings = useMemo(() => {
    const manifest = binding.contents;
    if (manifest === undefined || draft === null) return Object.freeze([]) as readonly string[];
    const lines: string[] = [];
    for (const entry of draft.entries) {
      const descriptor = manifest.find(
        (candidate) => candidate.contentId === (entry.contentId as string),
      );
      if (descriptor === undefined || descriptor.category === "background") continue;
      let geometry;
      try {
        geometry = binding.catalog.resolveContent(
          entry.contentId,
          entry.appearance ?? (Object.freeze({}) as StageAppearanceV1),
        )?.geometry;
      } catch {
        continue;
      }
      if (geometry !== undefined) continue;
      lines.push(
        `内容 ${entry.contentId as string} 未声明 geometry——画布无法直接拖拽（条目 ${entry
          .tag as string}，可在检视器数字编辑）`,
      );
    }
    return Object.freeze(lines);
  }, [binding.catalog, binding.contents, draft]);

  // Ambient loops reference motion documents by id; a binding the index
  // cannot resolve would silently never play, so it warns per entry.
  const ambientWarnings = useMemo(() => {
    if (draft === null || motionSources === null) return Object.freeze([]) as readonly string[];
    const known = new Set(motionCatalog.ids);
    return Object.freeze(
      draft.entries
        .filter((entry) => entry.ambient !== undefined && !known.has(entry.ambient.motionId))
        .map((entry) =>
          `条目 ${entry.tag as string} 的循环动效 ${entry.ambient?.motionId ?? ""} 未被索引` +
          "——循环不会播放（检查 motion 文档是否存在且可解析）"
        ),
    );
  }, [draft, motionCatalog.ids, motionSources]);

  // Authoring diagnostics: warnings stay visible but never block saving;
  // only a compile failure (shown as blocking) disables the save button.
  const authoringWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (compiled !== null && compiled.kind === "ok") warnings.push(...compiled.diagnostics);
    for (const skip of sceneSkips) {
      warnings.push(`场景文件未索引（${skip.path}）：${skip.reason}`);
    }
    warnings.push(...motionCatalog.failures);
    if (workbench.kind === "unavailable") warnings.push(...workbench.reasons);
    if (workbench.kind === "ready") warnings.push(...workbench.warnings);
    if (assetWarning !== null) warnings.push(assetWarning);
    if (fittingCompiled !== null && fittingCompiled.kind === "error") {
      warnings.push(`试穿预览无法编译：${fittingCompiled.message}（画布退回文档声明状态）`);
    }
    warnings.push(...rendererWarnings);
    warnings.push(...geometryWarnings);
    warnings.push(...ambientWarnings);
    return Object.freeze(warnings);
  }, [
    ambientWarnings,
    assetWarning,
    compiled,
    fittingCompiled,
    geometryWarnings,
    motionCatalog.failures,
    rendererWarnings,
    sceneSkips,
    workbench,
  ]);

  const writeActorPlacementAt = useCallback(
    (
      current: SceneAuthoringCurrentV1,
      tag: string,
      placement: StagePlacementV1,
      coalesceKey?: string,
    ): SceneAuthoringExecutionResultV1 => {
      return executeSceneOperationAt(current, {
        schemaRevision: 1,
        kind: "scene.entry.set_placement",
        tag,
        placement,
      }, coalesceKey);
    },
    [executeSceneOperationAt],
  );

  const editSelectedPlacement = useCallback(
    (
      placement: StagePlacementV1,
      coalesceKey?: string,
    ): void => {
      if (selectedTagCurrent === null || sceneOperationCurrent === null) return;
      writeActorPlacementAt(sceneOperationCurrent, selectedTagCurrent, placement, coalesceKey);
    },
    [sceneOperationCurrent, selectedTagCurrent, writeActorPlacementAt],
  );

  // ---- Scene Construction (S4) ------------------------------------------

  const contents = binding.contents ?? null;

  // ContentIds whose default resolution declares geometry: these get a
  // draggable selection box on the canvas; the browser flags the rest.
  const geometryContentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const descriptor of contents ?? []) {
      try {
        const resolution = binding.catalog.resolveContent(
          descriptor.contentId as StageContentIdV1,
          Object.freeze({ ...descriptor.defaultAppearance }) as StageAppearanceV1,
        );
        if (resolution?.geometry !== undefined) ids.add(descriptor.contentId);
      } catch {
        // Unresolvable content is the projection diagnostics' report.
      }
    }
    return ids;
  }, [binding.catalog, contents]);

  const selectedDescriptor = useMemo((): StudioContentDescriptorV1 | null => {
    if (contents === null || selectedTagCurrent === null || draft === null) return null;
    const entry = draft.entries.find(
      (candidate) => (candidate.tag as string) === selectedTagCurrent,
    );
    if (entry === undefined) return null;
    return contents.find(
      (descriptor) => descriptor.contentId === (entry.contentId as string),
    ) ?? null;
  }, [contents, draft, selectedTagCurrent]);

  // The selected entry's declared appearance merged with active fitting
  // overrides — what the inspector fields display and the resolution uses.
  const selectedEffectiveAppearance = useMemo((): Readonly<Record<string, string>> => {
    if (draft === null || selectedTagCurrent === null) return Object.freeze({});
    const entry = draft.entries.find(
      (candidate) => (candidate.tag as string) === selectedTagCurrent,
    );
    if (entry === undefined) return Object.freeze({});
    const declared = { ...entry.appearance } as Record<string, string>;
    const override = fitting ? fittingByTag[selectedTagCurrent] ?? {} : {};
    return Object.freeze({ ...declared, ...override });
  }, [draft, fitting, fittingByTag, selectedTagCurrent]);

  // Read-only derived data: what the catalog actually resolved for the
  // effective appearance (renderer, assets in resolution order). The Story
  // compositor keeps ownership; Studio only shows its output.
  const selectedResolution = useMemo((): SceneEntryResolutionV1 | null => {
    if (draft === null || selectedTagCurrent === null) return null;
    const entry = draft.entries.find(
      (candidate) => (candidate.tag as string) === selectedTagCurrent,
    );
    if (entry === undefined) return null;
    try {
      const resolution = binding.catalog.resolveContent(
        entry.contentId,
        selectedEffectiveAppearance as StageAppearanceV1,
      );
      if (resolution === null || resolution === undefined) return null;
      return Object.freeze({
        rendererId: resolution.rendererId as string,
        assetIds: Object.freeze(resolution.assetIds.map((assetId) => assetId as string)),
        hasGeometry: resolution.geometry !== undefined,
      });
    } catch {
      return null;
    }
  }, [binding.catalog, draft, selectedEffectiveAppearance, selectedTagCurrent]);

  const addContent = useCallback((descriptor: StudioContentDescriptorV1): void => {
    const current = session.getSnapshot().draft;
    if (current === null) return;
    const entry = deriveContentEntryV1(current, descriptor);
    const result = executeSceneOperation({
      schemaRevision: 1,
      kind: "scene.entry.add",
      entry,
    });
    if (result?.kind === "applied") setSelectedTag(entry.tag as string);
  }, [executeSceneOperation, session]);

  const removeSelectedEntry = useCallback((): void => {
    if (selectedTagCurrent === null) return;
    const current = session.getSnapshot().draft;
    if (current === null) return;
    const removesThroughCue = throughCueIdCurrent !== null &&
      current.cues.some((cue) =>
        cue.cueId === throughCueIdCurrent && (cue.tag as string) === selectedTagCurrent
      );
    const result = executeSceneOperation({
      schemaRevision: 1,
      kind: "scene.entry.remove",
      tag: selectedTagCurrent,
    });
    if (result?.kind !== "applied") return;
    if (removesThroughCue) setThroughCueId(null);
    const remaining = session.getSnapshot().draft;
    setSelectedTag((remaining?.entries[0]?.tag as string | undefined) ?? null);
  }, [executeSceneOperation, selectedTagCurrent, session, throughCueIdCurrent]);

  const addCue = useCallback((tag: string, kind: "show" | "hide"): void => {
    const current = session.getSnapshot().draft;
    if (current === null) return;
    executeSceneOperation({
      schemaRevision: 1,
      kind: "scene.cue.add",
      cue: deriveCueV1(current, tag, kind),
    });
  }, [executeSceneOperation, session]);

  const removeCue = useCallback((cueId: string): void => {
    const result = executeSceneOperation({
      schemaRevision: 1,
      kind: "scene.cue.remove",
      cueId,
    });
    if (result?.kind === "applied" && throughCueIdCurrent === cueId) setThroughCueId(null);
  }, [executeSceneOperation, throughCueIdCurrent]);

  const editSelectedAppearance = useCallback((
    key: string,
    value: string | null,
    coalesceKey?: string,
  ): void => {
    if (selectedTagCurrent === null) return;
    if (fitting) {
      // Fitting routes the same edits into the ephemeral override map;
      // clearing a key drops the override (back to the declared value).
      setFittingByTag((current) => {
        const forTag: Record<string, string> = { ...current[selectedTagCurrent] };
        if (value === null) delete forTag[key];
        else forTag[key] = value;
        const next: Record<string, Readonly<Record<string, string>>> = { ...current };
        if (Object.keys(forTag).length === 0) delete next[selectedTagCurrent];
        else next[selectedTagCurrent] = Object.freeze(forTag);
        return Object.freeze(next);
      });
      return;
    }
    executeSceneOperation({
      schemaRevision: 1,
      kind: "scene.entry.set_appearance",
      tag: selectedTagCurrent,
      key,
      value,
    }, coalesceKey);
  }, [executeSceneOperation, fitting, selectedTagCurrent]);

  const toggleFitting = useCallback((next: boolean): void => {
    setFitting(next);
    if (!next) setFittingByTag(Object.freeze({}));
  }, []);

  // A new scene: id prefix inferred from the project, the file lands at
  // src/scenes/<stem>/<stem>.scene.json (stem = the id's final segment),
  // and the created document opens through the ordinary navigation gate.
  const sceneIdPrefix = useMemo(
    () =>
      inferSceneIdPrefixV1(
        (scenes ?? []).map((scene) => scene.sceneId),
        (contents ?? []).map((descriptor) => descriptor.contentId),
      ),
    [contents, scenes],
  );

  const createScene = useCallback((): void => {
    if (newSceneStem === null || creating) return;
    const stem = newSceneStem.trim();
    if (!/^[a-z0-9][a-z0-9_-]*$/u.test(stem)) {
      setNote("场景名只能使用小写字母、数字、下划线和连字符。");
      return;
    }
    const label = newSceneLabel.trim();
    const sceneDocument = newSceneDocumentV1({
      sceneId: `${sceneIdPrefix}${stem}`,
      label: label.length === 0 ? stem : label,
      canvas: draft?.canvas ?? { width: 1280, height: 720 },
    });
    const path = `src/scenes/${stem}/${stem}.scene.json`;
    setCreating(true);
    void io.create({ path, sceneDocument }).then((result) => {
      setCreating(false);
      if (result.kind === "error") {
        setNote(
          result.code === "already_exists"
            ? "同名场景或场景 id 已存在。"
            : `新建场景失败：${result.code}`,
        );
        return;
      }
      setNewSceneStem(null);
      setNewSceneLabel("");
      setScenesRevision((revision) => revision + 1);
      setNote(`已创建 ${path}。`);
      requestOpenScene(path);
    });
  }, [creating, draft, io, newSceneLabel, newSceneStem, requestOpenScene, sceneIdPrefix]);

  // Create-or-clone a motion for one cue: the document lands next to the
  // scene, the Project Authoring Index picks it up (revision bump), and
  // the cue rebinds to the new id as one undoable draft edit.
  const createMotionForCue = useCallback((cueId: string): void => {
    const operationReceipt = sceneOperations.current();
    const currentSnapshot = session.getSnapshot();
    const current = currentSnapshot.draft;
    const scenePath = currentSnapshot.path;
    if (current === null || scenePath === null || operationReceipt === null || creating) return;
    const cue = current.cues.find((candidate) => candidate.cueId === cueId);
    if (cue === undefined) return;
    const source = cue.motionId === undefined ? null : (motionSources?.sources ?? []).find(
      (candidate) => candidate.motionDocument.motionId === cue.motionId,
    )?.motionDocument ?? null;
    const plan = deriveMotionPlanV1({
      scenePath,
      sceneId: current.sceneId,
      cueId,
      kind: cue.kind,
      existingMotionIds: (motionSources?.sources ?? []).map(
        (candidate) => candidate.motionDocument.motionId,
      ),
      source,
    });
    setCreating(true);
    void motionIo.create({ path: plan.path, motionDocument: plan.motionDocument }).then(
      (result) => {
        setCreating(false);
        if (result.kind === "error") {
          setNote(`新建 motion 失败：${result.code}`);
          return;
        }
        setMotionsRevision((revision) => revision + 1);
        const bindingResult = sceneOperations.execute({
          documentIdentity: operationReceipt.documentIdentity,
          expectedDraftRevision: operationReceipt.draftRevision,
          operation: {
            schemaRevision: 1,
            kind: "scene.cue.set_motion",
            cueId,
            motionId: plan.motionId,
          },
        });
        setNote(
          bindingResult.kind === "applied"
            ? `已创建 ${plan.path} 并绑定到 ${cueId}。`
            : `已创建 ${plan.path}，但场景草稿已变化，未自动绑定到 ${cueId}。`,
        );
      },
    );
  }, [creating, motionIo, motionSources, sceneOperations, session]);

  return (
    <div className={styles["studio"]} data-studio-root="true">
      <header className={styles["topbar"]}>
        <strong>SillyMaker Studio</strong>
        <span className={styles["topbar-scene"]}>
          {snapshot.path === null ? "未选择场景" : `${draft?.label ?? ""} · ${snapshot.path}`}
        </span>
        <button
          type="button"
          data-studio-undo="true"
          disabled={!snapshot.canUndo || busy || loading}
          onClick={() => session.undo()}
        >
          撤销
        </button>
        <button
          type="button"
          data-studio-redo="true"
          disabled={!snapshot.canRedo || busy || loading}
          onClick={() => session.redo()}
        >
          重做
        </button>
        <button
          type="button"
          data-studio-save="true"
          disabled={!dirty || busy || loading || compileBlocked}
          onClick={save}
        >
          {busy ? "保存中…" : "保存"}
        </button>
        {snapshot.path === null ? null : (
          <button
            type="button"
            data-studio-reload="true"
            disabled={busy || loading}
            onClick={() => {
              const path = snapshot.path;
              if (path !== null) requestOpenScene(path);
            }}
          >
            重新加载
          </button>
        )}
        <label className={styles["topbar-toggle"]}>
          <input
            type="checkbox"
            data-studio-hit-regions-toggle="true"
            checked={showHitRegions}
            onChange={(event) => setShowHitRegions(event.target.checked)}
          />
          交互区域
        </label>
      </header>
      {note === null ? null : (
        <p className={styles["note"]} role="status" data-studio-note="true">
          {note}
        </p>
      )}
      {confirmNavigation === null ? null : (
        <div
          className={styles["confirm"]}
          role="alertdialog"
          aria-label="未保存的修改"
          data-studio-dirty-confirm="true"
        >
          <p>当前场景有未保存的修改。先保存，还是放弃这些修改？</p>
          <div className={styles["confirm-actions"]}>
            <button
              type="button"
              data-studio-confirm-save="true"
              disabled={busy || compileBlocked}
              onClick={confirmSaveAndOpen}
            >
              保存并继续
            </button>
            <button
              type="button"
              data-studio-confirm-discard="true"
              disabled={busy}
              onClick={confirmDiscardAndOpen}
            >
              放弃修改
            </button>
            <button
              type="button"
              data-studio-confirm-cancel="true"
              disabled={busy}
              onClick={() => setConfirmNavigation(null)}
            >
              取消
            </button>
          </div>
        </div>
      )}
      {authoringWarnings.length === 0 && (compiled === null || compiled.kind !== "error")
        ? null
        : (
          <section
            className={styles["diagnostics"]}
            aria-label="创作诊断"
            data-studio-diagnostics="true"
          >
            {compiled !== null && compiled.kind === "error"
              ? (
                <p data-studio-diagnostic="blocking">
                  阻断：场景无法编译——{compiled.message}（保存已禁用）
                </p>
              )
              : null}
            {authoringWarnings.map((warning, index) => (
              <p key={`${warning}:${String(index)}`} data-studio-diagnostic="warning">
                警告：{warning}
              </p>
            ))}
          </section>
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
                      aria-pressed={snapshot.path === scene.path}
                      onClick={() => requestOpenScene(scene.path)}
                    >
                      {scene.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          {newSceneStem === null
            ? (
              <button
                type="button"
                data-studio-new-scene="true"
                disabled={creating}
                onClick={() => setNewSceneStem("")}
              >
                新建场景
              </button>
            )
            : (
              <div className={styles["new-scene"]} data-studio-new-scene-form="true">
                <label className={styles["field"]}>
                  <span>场景名（{sceneIdPrefix}…）</span>
                  <input
                    type="text"
                    data-studio-new-scene-stem="true"
                    value={newSceneStem}
                    onChange={(event) => setNewSceneStem(event.target.value)}
                  />
                </label>
                <label className={styles["field"]}>
                  <span>标题</span>
                  <input
                    type="text"
                    data-studio-new-scene-label="true"
                    value={newSceneLabel}
                    onChange={(event) => setNewSceneLabel(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  data-studio-new-scene-create="true"
                  disabled={creating || newSceneStem.trim().length === 0}
                  onClick={createScene}
                >
                  创建
                </button>
                <button
                  type="button"
                  data-studio-new-scene-cancel="true"
                  disabled={creating}
                  onClick={() => setNewSceneStem(null)}
                >
                  取消
                </button>
              </div>
            )}
          {contents === null || contents.length === 0 ? null : (
            <ContentBrowserV1
              contents={contents}
              geometryContentIds={geometryContentIds}
              canAdd={draft !== null && !busy && !loading}
              onAdd={addContent}
            />
          )}
        </nav>
        <main className={styles["stage"]}>
          {draft === null || compiled === null || sceneOperationCurrent === null
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
              <SceneCanvasV1
                draft={draft}
                target={(canvasCompiled !== null && canvasCompiled.kind === "ok"
                  ? canvasCompiled
                  : compiled).target}
                renderers={binding.renderers}
                accessibleName={`场景预览 ${draft.label}`}
                showHitRegions={showHitRegions}
                scale={scale}
                selectedTag={selectedTagCurrent}
                onSelectTag={setSelectedTag}
                operationCurrent={sceneOperationCurrent}
                onWritePlacement={writeActorPlacementAt}
              />
            )}
          {draft === null ? null : (
            <SceneCuesV1
              draft={draft}
              motionIds={motionCatalog.ids}
              throughCueId={throughCueIdCurrent}
              busy={busy || loading || creating}
              onToggleThroughCue={(cueId) =>
                setThroughCueId(throughCueIdCurrent === cueId ? null : cueId)}
              onBindMotion={(cueId, motionId) =>
                executeSceneOperation({
                  schemaRevision: 1,
                  kind: "scene.cue.set_motion",
                  cueId,
                  motionId,
                })}
              onAddCue={addCue}
              onRemoveCue={removeCue}
              onCreateMotion={createMotionForCue}
            />
          )}
        </main>
        <aside className={styles["inspector"]} aria-label="检视器">
          <h2>检视器</h2>
          {draft === null ? <p>—</p> : (
            <SceneInspectorV1
              draft={draft}
              selectedTag={selectedTagCurrent}
              selectedDescriptor={selectedDescriptor}
              effectiveAppearance={selectedEffectiveAppearance}
              fitting={fitting}
              resolution={selectedResolution}
              motionIds={motionCatalog.ids}
              draftRevision={snapshot.draftRevision}
              pendingInputScope={`${snapshot.documentIdentity ?? "none"}:${
                snapshot.saving ? "saving" : "idle"
              }`}
              busy={busy || loading || creating}
              onSelectTag={setSelectedTag}
              onToggleFitting={toggleFitting}
              onEditSelectedPlacement={editSelectedPlacement}
              onEditSelectedZOrder={(next, coalesceKey) => {
                if (selectedTagCurrent === null) return;
                executeSceneOperation({
                  schemaRevision: 1,
                  kind: "scene.entry.set_z_order",
                  tag: selectedTagCurrent,
                  zOrder: next,
                }, coalesceKey);
              }}
              onEditSelectedAppearance={editSelectedAppearance}
              onEditSelectedAmbient={(motionId) => {
                if (selectedTagCurrent === null) return;
                // Bind or clear the presence loop as one undoable draft
                // edit; an explicit phaseMs survives a motion swap.
                executeSceneOperation({
                  schemaRevision: 1,
                  kind: "scene.entry.set_ambient",
                  tag: selectedTagCurrent,
                  motionId,
                });
              }}
              onRemoveSelectedEntry={removeSelectedEntry}
            />
          )}
        </aside>
      </div>
      {workbench.kind !== "ready"
        ? null
        : <MotionWorkspaceSectionV1 workbench={workbench} io={motionIo} />}
      {regionsIo === undefined || regionsSession === null ? null : (
        <RegionsWorkspaceSectionV1
          io={regionsIo}
          session={regionsSession}
          renderers={binding.renderers}
          assets={assets}
          backdrop={draft !== null && canvasCompiled !== null && canvasCompiled.kind === "ok"
            ? { canvas: draft.canvas, target: canvasCompiled.target }
            : null}
          scale={scale}
          storyHint={sceneIdPrefix.split(".")[1] ?? null}
        />
      )}
      {binding.flow === undefined ? null : (
        <ProgressiveFlowWorkspaceHostInternalV1
          activation={props.flowActivation}
          flow={binding.flow}
          {...(binding.resolveText === undefined ? {} : { resolveText: binding.resolveText })}
        />
      )}
    </div>
  );
}
