// SPDX-License-Identifier: MIT
import type { StageTagV1 } from "@sillymaker/base";
import type { AdmittedAuthoringSceneV1 } from "@sillymaker/base/authoring/scene";
import type {
  AuthoringDocumentSessionV1,
  AuthoringSessionSnapshotV1,
  MotionSourceIoV1,
} from "@sillymaker/ui/debug";

import type { AuthoringSceneSourceIoV1 } from "./authoring-scene-io.ts";
import type { SceneAuthoringLocalAdapterV1 } from "./scene-operations/contract.ts";
import { createSceneAuthoringLocalAdapterV1 } from "./scene-operations/local-adapter.ts";
import { createSceneDocumentSessionV1 } from "./scene-session.ts";
import { saveWithConflictRefreshInternalV1 } from "./save-conflict.ts";

export interface AuthoringHostDocumentSnapshotInternalV1 {
  readonly documentIdentity: string | null;
  readonly draftRevision: number;
  readonly path: string | null;
  readonly digest: string | null;
  readonly dirty: boolean;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface AuthoringHostSnapshotInternalV1 {
  readonly identity: number;
  readonly revision: number;
  readonly connected: boolean;
  readonly dirty: boolean;
  readonly selectedObjectId: StageTagV1 | null;
  readonly scene: AuthoringHostDocumentSnapshotInternalV1;
}

/** Public tooling view of the Host. Source IO and mutation remain package-private. */
export interface AuthoringHostInternalV1 {
  getSnapshot(): AuthoringHostSnapshotInternalV1;
  subscribe(listener: () => void): () => void;
  dispose(): Promise<void>;
}

export interface CreateAuthoringHostInputInternalV1 {
  readonly sceneIo: AuthoringSceneSourceIoV1;
  readonly motionIo: MotionSourceIoV1;
}

export interface AuthoringCloseStateInternalV1 {
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly canSave: boolean;
}

export interface AuthoringHostOwnerInternalV1 {
  readonly sceneIo: AuthoringSceneSourceIoV1;
  readonly motionIo: MotionSourceIoV1;
  readonly sceneSession: AuthoringDocumentSessionV1<AdmittedAuthoringSceneV1>;
  readonly sceneOperations: SceneAuthoringLocalAdapterV1;
  selectObject(objectId: StageTagV1 | null): boolean;
  markViewConnected(viewId: number, connected: boolean): void;
  getCloseState(): AuthoringCloseStateInternalV1;
  saveAndClose(): Promise<boolean>;
  discardAndClose(): void;
}

interface AuthoringHostWithOwnerInternalV1 extends AuthoringHostInternalV1 {
  readonly ownerInternalV1: AuthoringHostOwnerInternalV1;
}

let nextAuthoringHostIdentityInternalV1 = 0;

function documentSnapshotInternalV1(
  snapshot: AuthoringSessionSnapshotV1<AdmittedAuthoringSceneV1>,
): AuthoringHostDocumentSnapshotInternalV1 {
  return {
    documentIdentity: snapshot.documentIdentity,
    draftRevision: snapshot.draftRevision,
    path: snapshot.path,
    digest: snapshot.digest,
    dirty: snapshot.dirty,
    loading: snapshot.loading,
    saving: snapshot.saving,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
  };
}

function sceneHasObjectInternalV1(
  scene: AdmittedAuthoringSceneV1 | null,
  objectId: StageTagV1,
): boolean {
  return scene?.sourceMap.objects.some((entry) => entry.objectId === objectId) ?? false;
}

export function createAuthoringHostInternalV1(
  input: CreateAuthoringHostInputInternalV1,
): AuthoringHostInternalV1 {
  const identity = ++nextAuthoringHostIdentityInternalV1;
  const sceneSession = createSceneDocumentSessionV1(input.sceneIo);
  const sceneOperations = createSceneAuthoringLocalAdapterV1(sceneSession);
  const listeners = new Set<() => void>();
  const connectedViews = new Set<number>();
  let disposed = false;
  let revision = 0;
  let selectedObjectId: StageTagV1 | null = null;
  let observedDocumentIdentity = sceneSession.getSnapshot().documentIdentity;
  let snapshot!: AuthoringHostSnapshotInternalV1;

  const rebuildSnapshot = (): void => {
    const scene = documentSnapshotInternalV1(sceneSession.getSnapshot());
    revision += 1;
    snapshot = {
      identity,
      revision,
      connected: connectedViews.size > 0,
      dirty: scene.dirty,
      selectedObjectId,
      scene,
    };
  };
  const publish = (): void => {
    if (disposed) return;
    rebuildSnapshot();
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Host observers are observational.
      }
    }
  };
  const publishScene = (): void => {
    if (disposed) return;
    const sceneSnapshot = sceneSession.getSnapshot();
    if (sceneSnapshot.documentIdentity !== observedDocumentIdentity) {
      observedDocumentIdentity = sceneSnapshot.documentIdentity;
      selectedObjectId = null;
    } else if (
      selectedObjectId !== null &&
      !sceneHasObjectInternalV1(sceneSnapshot.draft, selectedObjectId)
    ) {
      selectedObjectId = null;
    }
    publish();
  };
  rebuildSnapshot();
  const unsubscribeScene = sceneSession.subscribe(publishScene);

  const getCloseState = (): AuthoringCloseStateInternalV1 => {
    const current = sceneSession.getSnapshot();
    const busy = current.loading || current.saving;
    return {
      dirty: current.dirty,
      busy,
      canSave: !current.dirty || (
        current.path !== null && current.digest !== null && current.draft !== null && !busy
      ),
    };
  };

  const owner: AuthoringHostOwnerInternalV1 = {
    sceneIo: input.sceneIo,
    motionIo: input.motionIo,
    sceneSession,
    sceneOperations,
    selectObject(objectId): boolean {
      if (disposed) return false;
      const draft = sceneSession.getSnapshot().draft;
      if (objectId !== null && !sceneHasObjectInternalV1(draft, objectId)) return false;
      if (selectedObjectId === objectId) return true;
      selectedObjectId = objectId;
      publish();
      return true;
    },
    markViewConnected(viewId, connected): void {
      if (disposed) return;
      const changed = connected ? !connectedViews.has(viewId) : connectedViews.has(viewId);
      if (!changed) return;
      if (connected) connectedViews.add(viewId);
      else connectedViews.delete(viewId);
      publish();
    },
    getCloseState,
    async saveAndClose(): Promise<boolean> {
      if (disposed) return false;
      const state = getCloseState();
      if (state.busy || !state.canSave) return false;
      if (!state.dirty) return true;
      const result = await saveWithConflictRefreshInternalV1(sceneSession);
      return result.save.kind === "ok" && !sceneSession.getSnapshot().dirty;
    },
    discardAndClose(): void {
      if (disposed) return;
      sceneSession.discard();
    },
  };

  const host: AuthoringHostWithOwnerInternalV1 = {
    ownerInternalV1: owner,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      unsubscribeScene();
      connectedViews.clear();
      listeners.clear();
    },
  };
  return host;
}

export function resolveAuthoringHostOwnerInternalV1(
  host: AuthoringHostInternalV1,
): AuthoringHostOwnerInternalV1 {
  return (host as AuthoringHostWithOwnerInternalV1).ownerInternalV1;
}
