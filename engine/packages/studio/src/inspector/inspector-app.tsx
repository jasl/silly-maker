// SPDX-License-Identifier: MIT
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactElement } from "react";

import type { MotionDefinitionV1 } from "@sillymaker/base";
import { projectAuthoringSceneFacetsV1 } from "@sillymaker/base/authoring/scene";
import type {
  AdmittedAuthoringSceneV1,
  AuthoringSceneFacetProjectionV1,
  CompiledAuthoringSceneV1,
} from "@sillymaker/base/authoring/scene";

import type {
  AuthoringSceneIoListEntryV1,
  AuthoringSceneIoListSkipV1,
  AuthoringSceneSourceIoV1,
} from "../core/authoring-scene-io.ts";
import {
  createAuthoringHostInternalV1,
  resolveAuthoringHostOwnerInternalV1,
} from "../core/authoring-host.ts";
import type { AuthoringHostInternalV1 } from "../core/authoring-host.ts";
import type { InspectorBindingV1 } from "../core/binding.ts";
import { loadInspectorMotionSourcesV1 } from "../core/motion-sources.ts";
import { saveWithConflictRefreshInternalV1 } from "../core/save-conflict.ts";
import { compileAuthoringSceneWithReceiptInternalV1 } from "../core/scene-compilation.ts";
import type { SceneAuthoringOperationV1 } from "../core/scene-operations/contract.ts";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";
import { InspectorObjectPanelV1 } from "./object-inspector.tsx";
import { InspectorSceneListV1 } from "./scene-list.tsx";
import { InspectorScenePreviewV1 } from "./scene-preview.tsx";
import { InspectorSceneTreeV1 } from "./scene-tree.tsx";
import { RuntimeInspectorPanelV1 } from "./runtime-inspector.tsx";
import { inspectorScrubChoicesV1, sampleInspectorScrubV1 } from "./scrub.ts";
import styles from "./inspector.module.css";

export interface InspectorAppPropsV1 {
  readonly binding: InspectorBindingV1;
  readonly io: AuthoringSceneSourceIoV1;
  readonly motionIo: MotionSourceIoV1;
}

export interface InspectorHostSurfacePropsInternalV1 {
  readonly host: AuthoringHostInternalV1;
  readonly binding: InspectorBindingV1;
  readonly mode: "standalone" | "embedded";
  readonly publicationRole: "visible" | "probe";
  readonly viewId: number;
}

interface ProjectionResultV1 {
  readonly compiled: CompiledAuthoringSceneV1;
  readonly facets: AuthoringSceneFacetProjectionV1;
}

type CompilationResultV1 =
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ok"; readonly compiled: CompiledAuthoringSceneV1 };

let nextInspectorViewIdInternalV1 = 1;

function errorLabelV1(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const record = error as { reason?: unknown; path?: unknown; code?: unknown; message?: unknown };
    if (typeof record.reason === "string") {
      return `${record.reason}${typeof record.path === "string" ? ` · ${record.path || "/"}` : ""}`;
    }
    if (typeof record.code === "string") return record.code;
    if (typeof record.message === "string") return record.message;
  }
  return error instanceof Error ? error.message : String(error);
}

function compileSceneV1(draft: AdmittedAuthoringSceneV1 | null): CompilationResultV1 {
  if (draft === null) return { kind: "empty" };
  try {
    return { kind: "ok", compiled: compileAuthoringSceneWithReceiptInternalV1(draft) };
  } catch (error) {
    return { kind: "error", message: errorLabelV1(error) };
  }
}

function projectSceneV1(
  compilation: CompilationResultV1,
  binding: InspectorBindingV1,
  motionDefinitions: ReadonlyMap<string, MotionDefinitionV1>,
): { readonly kind: "empty" } | { readonly kind: "error"; readonly message: string } | {
  readonly kind: "ok";
  readonly projection: ProjectionResultV1;
} {
  if (compilation.kind !== "ok") return compilation;
  try {
    const compiled = compilation.compiled;
    const facets = projectAuthoringSceneFacetsV1(compiled, binding.catalog, {
      motionDefinitions: [...motionDefinitions.values()],
      ...(binding.timelines === undefined ? {} : { timelineCatalog: binding.timelines }),
    });
    return { kind: "ok", projection: { compiled, facets } };
  } catch (error) {
    return { kind: "error", message: errorLabelV1(error) };
  }
}

function useDisposeHostOnUnmountInternalV1(host: AuthoringHostInternalV1): void {
  const hostEpochs = useMemo(() => new WeakMap<AuthoringHostInternalV1, number>(), []);
  useEffect(() => {
    const expectedEpoch = (hostEpochs.get(host) ?? 0) + 1;
    hostEpochs.set(host, expectedEpoch);
    return () => {
      queueMicrotask(() => {
        if (hostEpochs.get(host) !== expectedEpoch) return;
        hostEpochs.delete(host);
        void host.dispose().catch(() => undefined);
      });
    };
  }, [host, hostEpochs]);
}

function PendingSceneDialogInternalV1(props: {
  readonly busy: boolean;
  readonly canSave: boolean;
  onSaveAndSwitch(): void;
  onDiscardAndSwitch(): void;
  onCancel(): void;
}): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return undefined;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-label="切换 Scene"
      onCancel={(event) => {
        event.preventDefault();
        props.onCancel();
      }}
    >
      <p>当前 Scene 有未保存修改。保存、放弃，还是继续编辑？</p>
      <div className={styles["button-row"]}>
        <button
          type="button"
          disabled={props.busy || !props.canSave}
          onClick={props.onSaveAndSwitch}
        >
          保存并切换
        </button>
        <button type="button" disabled={props.busy} onClick={props.onDiscardAndSwitch}>
          放弃并切换
        </button>
        <button type="button" disabled={props.busy} onClick={props.onCancel}>
          取消
        </button>
      </div>
    </dialog>
  );
}

/** Direct standalone consumer; Vite publication uses the same Host surface below. */
export function InspectorAppV1(props: InspectorAppPropsV1): ReactElement {
  const host = useMemo(
    () => createAuthoringHostInternalV1({ sceneIo: props.io, motionIo: props.motionIo }),
    [props.io, props.motionIo],
  );
  const viewId = useMemo(() => nextInspectorViewIdInternalV1++, []);
  useDisposeHostOnUnmountInternalV1(host);
  return (
    <InspectorHostSurfaceInternalV1
      host={host}
      binding={props.binding}
      mode="standalone"
      publicationRole="visible"
      viewId={viewId}
    />
  );
}

/** The exact shared Host consumer used by standalone and embedded shells. */
export function InspectorHostSurfaceInternalV1(
  props: InspectorHostSurfacePropsInternalV1,
): ReactElement {
  const owner = resolveAuthoringHostOwnerInternalV1(props.host);
  const elementRef = useRef<HTMLDivElement>(null);
  const hostSnapshot = useSyncExternalStore(
    props.host.subscribe,
    props.host.getSnapshot,
    props.host.getSnapshot,
  );

  useLayoutEffect(() => {
    const connected = elementRef.current?.isConnected === true;
    owner.markViewConnected(props.viewId, connected);
    return () => owner.markViewConnected(props.viewId, false);
  }, [owner, props.viewId]);

  useEffect(() => {
    if (!hostSnapshot.dirty || props.publicationRole !== "visible") return undefined;
    const beforeUnload = (event: BeforeUnloadEvent): void => event.preventDefault();
    globalThis.addEventListener("beforeunload", beforeUnload);
    return () => globalThis.removeEventListener("beforeunload", beforeUnload);
  }, [hostSnapshot.dirty, props.publicationRole]);

  return (
    <div
      ref={elementRef}
      className={styles.host}
      data-inspector-root="true"
      data-authoring-host={String(hostSnapshot.identity)}
      data-authoring-host-ready={hostSnapshot.connected ? "connected" : "layout"}
      data-authoring-host-mode={props.mode}
      data-native-text="true"
    >
      <InspectorWithHostInternalV1 {...props} />
    </div>
  );
}

function InspectorWithHostInternalV1(props: InspectorHostSurfacePropsInternalV1): ReactElement {
  const owner = resolveAuthoringHostOwnerInternalV1(props.host);
  const hostSnapshot = useSyncExternalStore(
    props.host.subscribe,
    props.host.getSnapshot,
    props.host.getSnapshot,
  );
  const sessionSnapshot = useSyncExternalStore(
    owner.sceneSession.subscribe,
    owner.sceneSession.getSnapshot,
    owner.sceneSession.getSnapshot,
  );
  const [scenes, setScenes] = useState<readonly AuthoringSceneIoListEntryV1[] | null>(null);
  const [sceneSkips, setSceneSkips] = useState<readonly AuthoringSceneIoListSkipV1[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [pendingScenePath, setPendingScenePath] = useState<string | null>(null);
  const [motionDefinitions, setMotionDefinitions] = useState<
    ReadonlyMap<string, MotionDefinitionV1>
  >(
    new Map(),
  );
  const [motionWarnings, setMotionWarnings] = useState<readonly string[]>([]);
  const [scrubKey, setScrubKey] = useState("");
  const [scrubTimeMs, setScrubTimeMs] = useState(0);
  const visible = props.publicationRole === "visible";

  useEffect(() => {
    if (!visible) return undefined;
    let current = true;
    void owner.sceneIo.list().then((result) => {
      if (!current) return;
      if (result.kind === "error") {
        setScenes([]);
        setNote(`Scene 列表不可用：${result.code}`);
        return;
      }
      setScenes(result.scenes);
      setSceneSkips(result.skipped);
    });
    return () => {
      current = false;
    };
  }, [owner.sceneIo, visible]);

  const openSceneNow = useCallback((path: string): void => {
    setNote(null);
    setPendingScenePath(null);
    void owner.sceneSession.open(path).then((result) => {
      if (result.kind === "error") setNote(`Scene 读取失败：${result.code}`);
    });
  }, [owner.sceneSession]);

  useEffect(() => {
    if (
      !visible || scenes === null || scenes.length === 0 ||
      sessionSnapshot.draft !== null || sessionSnapshot.loading
    ) return;
    const first = scenes[0];
    if (first !== undefined) openSceneNow(first.path);
  }, [openSceneNow, scenes, sessionSnapshot.draft, sessionSnapshot.loading, visible]);

  const compilation = useMemo(
    () => compileSceneV1(sessionSnapshot.draft),
    [sessionSnapshot.draft],
  );
  const referencedMotionIds = useMemo(
    () => [
      ...new Set(
        compilation.kind === "ok"
          ? compilation.compiled.bindings.motions.map((reference) => reference.id)
          : [],
      ),
    ],
    [compilation],
  );

  useEffect(() => {
    if (!visible) return undefined;
    let current = true;
    void loadInspectorMotionSourcesV1(owner.motionIo, referencedMotionIds).then((loaded) => {
      if (!current) return;
      setMotionDefinitions(loaded.definitions);
      setMotionWarnings(loaded.warnings);
    });
    return () => {
      current = false;
    };
  }, [owner.motionIo, referencedMotionIds, visible]);

  const projection = useMemo(
    () => projectSceneV1(compilation, props.binding, motionDefinitions),
    [compilation, motionDefinitions, props.binding],
  );
  const scrubChoices = useMemo(
    () =>
      projection.kind === "ok"
        ? inspectorScrubChoicesV1(
          projection.projection.compiled,
          motionDefinitions,
          props.binding.timelines,
        )
        : [],
    [motionDefinitions, projection, props.binding.timelines],
  );
  const scrubChoice = scrubChoices.find((choice) => choice.key === scrubKey) ?? null;
  const scrubSample = sampleInspectorScrubV1(scrubChoice, scrubTimeMs);

  useEffect(() => {
    if (!visible || projection.kind !== "ok" || hostSnapshot.selectedObjectId !== null) return;
    const first = projection.projection.compiled.inspection.objects[0];
    if (first !== undefined) owner.selectObject(first.objectId);
  }, [hostSnapshot.selectedObjectId, owner, projection, visible]);

  const requestOpen = (path: string): void => {
    if (path === sessionSnapshot.path) return;
    if (sessionSnapshot.dirty) setPendingScenePath(path);
    else openSceneNow(path);
  };
  const save = async (): Promise<boolean> => {
    const result = await saveWithConflictRefreshInternalV1(owner.sceneSession);
    if (result.save.kind === "ok") {
      setNote("Scene 已保存。");
      return true;
    }
    if (result.save.kind === "error" && result.save.code === "digest_conflict") {
      setNote("CAS 冲突：已刷新磁盘基线并保留当前草稿，请检查后再次保存。");
    } else {
      setNote(`Scene 保存失败：${result.save.kind}`);
    }
    return false;
  };
  const execute = (operation: SceneAuthoringOperationV1, coalesceKey?: string): void => {
    const current = owner.sceneOperations.current();
    if (current === null) {
      setNote("当前 Scene 尚未准备好。");
      return;
    }
    const result = owner.sceneOperations.execute({
      documentIdentity: current.documentIdentity,
      expectedDraftRevision: current.draftRevision,
      operation,
      ...(coalesceKey === undefined ? {} : { coalesceKey }),
    });
    if (result.kind === "rejected" && result.diagnostic.code !== "scene_authoring.no_change") {
      setNote(`编辑未应用：${result.diagnostic.code} · ${result.diagnostic.path}`);
    }
  };

  const busy = sessionSnapshot.loading || sessionSnapshot.saving;
  const selectedObjectId = hostSnapshot.selectedObjectId;
  return (
    <main
      className={styles.app}
      data-inspector-ready={projection.kind === "ok" ? "true" : "false"}
      data-authoring-document-identity={sessionSnapshot.documentIdentity ?? undefined}
      data-authoring-draft-revision={String(sessionSnapshot.draftRevision)}
    >
      <header className={styles.toolbar}>
        <div>
          <strong>SillyMaker Inspector</strong>
          <span>{sessionSnapshot.path ?? "选择一个 Authoring Scene"}</span>
        </div>
        <div className={styles["button-row"]}>
          <button
            type="button"
            disabled={busy || !sessionSnapshot.canUndo}
            onClick={owner.sceneSession.undo}
          >
            撤销
          </button>
          <button
            type="button"
            disabled={busy || !sessionSnapshot.canRedo}
            onClick={owner.sceneSession.redo}
          >
            重做
          </button>
          <button
            type="button"
            disabled={busy || !sessionSnapshot.dirty}
            onClick={() => owner.sceneSession.discard()}
          >
            放弃修改
          </button>
          <button
            type="button"
            data-inspector-save="true"
            disabled={busy || !sessionSnapshot.dirty || sessionSnapshot.digest === null}
            onClick={() => void save()}
          >
            保存
          </button>
        </div>
      </header>

      {note === null ? null : <p className={styles.notice} role="status">{note}</p>}
      {sceneSkips.length === 0 && motionWarnings.length === 0
        ? null
        : (
          <details className={styles.diagnostics}>
            <summary>Authoring warnings ({sceneSkips.length + motionWarnings.length})</summary>
            <ul>
              {sceneSkips.map((skip) => <li key={skip.path}>{skip.path}: {skip.reason}</li>)}
              {motionWarnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </details>
        )}

      {!visible || props.binding.runtime === undefined
        ? null
        : <RuntimeInspectorPanelV1 source={props.binding.runtime} />}

      <div className={styles.layout}>
        <aside className={styles.navigator}>
          <InspectorSceneListV1
            scenes={scenes ?? []}
            currentPath={sessionSnapshot.path}
            disabled={busy}
            onOpen={requestOpen}
          />
          {projection.kind === "ok"
            ? (
              <InspectorSceneTreeV1
                document={sessionSnapshot.draft!.document}
                selectedObjectId={selectedObjectId}
                onSelectObject={owner.selectObject}
              />
            )
            : null}
        </aside>

        <section className={styles.center}>
          {projection.kind === "empty"
            ? <p className={styles.empty}>选择一个 Authoring Scene 开始检视。</p>
            : projection.kind === "error"
            ? <p className={styles.error} role="alert">Scene 编译/投影失败：{projection.message}</p>
            : (
              <>
                <section className={styles["scrub-bar"]} aria-label="Motion 与 Timeline scrub">
                  <label>
                    只读 scrub
                    <select
                      value={scrubChoice?.key ?? ""}
                      onChange={(event) => {
                        setScrubKey(event.currentTarget.value);
                        setScrubTimeMs(0);
                      }}
                    >
                      <option value="">关闭</option>
                      {scrubChoices.map((choice) => (
                        <option value={choice.key} key={choice.key}>
                          {choice.kind === "timeline" ? "Timeline" : "Motion"} · {choice.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input
                    type="range"
                    aria-label="Scrub 时间"
                    min={0}
                    max={Math.max(1, scrubChoice?.durationMs ?? 1)}
                    value={Math.min(scrubTimeMs, scrubChoice?.durationMs ?? 0)}
                    disabled={scrubChoice === null}
                    onChange={(event) => setScrubTimeMs(Number(event.currentTarget.value))}
                  />
                  <output>
                    {scrubChoice === null ? "—" : `${scrubTimeMs} / ${scrubChoice.durationMs} ms`}
                  </output>
                </section>
                <InspectorScenePreviewV1
                  document={sessionSnapshot.draft!.document}
                  facets={projection.projection.facets}
                  binding={props.binding}
                  selectedObjectId={selectedObjectId}
                  timelineOverlay={scrubSample.timelineOverlay}
                  motionOverlay={scrubSample.motionOverlay}
                  onSelectObject={owner.selectObject}
                />
                {projection.projection.facets.renderDiagnostics.length === 0
                  ? null
                  : (
                    <section className={styles.diagnostics} aria-label="Stage diagnostics">
                      <h2>Stage diagnostics</h2>
                      <ul>
                        {projection.projection.facets.renderDiagnostics.map((diagnostic) => (
                          <li key={`${diagnostic.code}:${diagnostic.location?.jsonPointer ?? ""}`}>
                            <code>{diagnostic.code}</code> {diagnostic.message}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
              </>
            )}
        </section>

        <aside className={styles.properties}>
          {projection.kind === "ok" && sessionSnapshot.draft !== null
            ? (
              <InspectorObjectPanelV1
                scene={sessionSnapshot.draft}
                facets={projection.projection.facets}
                selectedObjectId={selectedObjectId}
                draftRevision={sessionSnapshot.draftRevision}
                disabled={busy}
                execute={execute}
              />
            )
            : null}
        </aside>
      </div>

      {pendingScenePath === null ? null : (
        <PendingSceneDialogInternalV1
          busy={busy}
          canSave={sessionSnapshot.digest !== null}
          onSaveAndSwitch={() => {
            const nextPath = pendingScenePath;
            void save().then((saved) => {
              if (saved) openSceneNow(nextPath);
            }).catch((error) => setNote(`Scene 保存失败：${errorLabelV1(error)}`));
          }}
          onDiscardAndSwitch={() => {
            owner.sceneSession.discard();
            openSceneNow(pendingScenePath);
          }}
          onCancel={() => setPendingScenePath(null)}
        />
      )}
    </main>
  );
}
