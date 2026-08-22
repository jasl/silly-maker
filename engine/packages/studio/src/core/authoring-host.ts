// SPDX-License-Identifier: MIT
import type { RegionsDocumentV1, SceneDocumentV1 } from "@sillymaker/base";
import { createMotionWorkbenchStoreV1 } from "@sillymaker/ui/debug";
import type {
  AuthoringDocumentSessionV1,
  AuthoringSessionSnapshotV1,
  MotionSourceIoV1,
  MotionWorkbenchStoreV1,
} from "@sillymaker/ui/debug";

import type { RegionsSourceIoV1 } from "./regions-io.ts";
import { createRegionsDocumentSessionV1 } from "./regions-session.ts";
import type { SceneSourceIoV1 } from "./scene-io.ts";
import type { SceneAuthoringLocalAdapterV1 } from "./scene-operations/contract.ts";
import { createSceneAuthoringLocalAdapterV1 } from "./scene-operations/local-adapter.ts";
import { createSceneDocumentSessionV1 } from "./scene-session.ts";
import {
  createFlowWorkspaceActivationOwnerInternalV1,
} from "../workspaces/flow/flow-workspace-activation.tsx";
import type {
  FlowWorkspaceActivationOwnerInternalV1,
  FlowWorkspaceLoaderInternalV1,
} from "../workspaces/flow/flow-workspace-activation.tsx";

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
  readonly scene: AuthoringHostDocumentSnapshotInternalV1;
  readonly regions: AuthoringHostDocumentSnapshotInternalV1 | null;
  readonly activeMotionId: string | null;
}

/** Opaque tooling owner. It deliberately exposes no source IO or session writer. */
export interface AuthoringHostInternalV1 {
  getSnapshot(): AuthoringHostSnapshotInternalV1;
  subscribe(listener: () => void): () => void;
  dispose(): Promise<void>;
}

export interface CreateAuthoringHostInputInternalV1 {
  readonly sceneIo: SceneSourceIoV1;
  readonly motionIo: MotionSourceIoV1;
  readonly regionsIo?: RegionsSourceIoV1;
  readonly loadFlowWorkspace?: FlowWorkspaceLoaderInternalV1;
  readonly reportFailure?: (error: unknown) => void;
}

export interface AuthoringCloseParticipantStateInternalV1 {
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly canSave: boolean;
}

export interface AuthoringCloseParticipantInternalV1 {
  getState(): AuthoringCloseParticipantStateInternalV1;
  subscribe(listener: () => void): () => void;
  save(): Promise<boolean>;
  discard(): void;
}

interface AuthoringHostOwnerInternalV1 {
  readonly sceneIo: SceneSourceIoV1;
  readonly motionIo: MotionSourceIoV1;
  readonly regionsIo: RegionsSourceIoV1 | undefined;
  readonly sceneSession: AuthoringDocumentSessionV1<SceneDocumentV1>;
  readonly sceneOperations: SceneAuthoringLocalAdapterV1;
  readonly regionsSession: AuthoringDocumentSessionV1<RegionsDocumentV1> | null;
  readonly motionStore: MotionWorkbenchStoreV1;
  readonly flowActivation: FlowWorkspaceActivationOwnerInternalV1;
  readonly closeParticipants: Map<string, AuthoringCloseParticipantInternalV1>;
  markViewConnected(viewId: number, connected: boolean): void;
  registerCloseParticipant(
    id: string,
    participant: AuthoringCloseParticipantInternalV1,
  ): () => void;
  getCloseState(): AuthoringCloseParticipantStateInternalV1;
  saveAndClose(): Promise<boolean>;
  discardAndClose(): void;
}

const ownersInternalV1 = new WeakMap<AuthoringHostInternalV1, AuthoringHostOwnerInternalV1>();
let nextAuthoringHostIdentityInternalV1 = 0;

function documentSnapshotInternalV1<TDocument>(
  snapshot: AuthoringSessionSnapshotV1<TDocument>,
): AuthoringHostDocumentSnapshotInternalV1 {
  return Object.freeze({
    documentIdentity: snapshot.documentIdentity,
    draftRevision: snapshot.draftRevision,
    path: snapshot.path,
    digest: snapshot.digest,
    dirty: snapshot.dirty,
    loading: snapshot.loading,
    saving: snapshot.saving,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
  });
}

export function createAuthoringHostInternalV1(
  input: CreateAuthoringHostInputInternalV1,
): AuthoringHostInternalV1 {
  const identity = ++nextAuthoringHostIdentityInternalV1;
  const sceneSession = createSceneDocumentSessionV1(input.sceneIo);
  const sceneOperations = createSceneAuthoringLocalAdapterV1(sceneSession);
  const regionsSession = input.regionsIo === undefined
    ? null
    : createRegionsDocumentSessionV1(input.regionsIo);
  const motionStore = createMotionWorkbenchStoreV1();
  const flowActivation = createFlowWorkspaceActivationOwnerInternalV1({
    ...(input.loadFlowWorkspace === undefined ? {} : { load: input.loadFlowWorkspace }),
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
  });
  const listeners = new Set<() => void>();
  const connectedViews = new Set<number>();
  const closeParticipants = new Map<string, AuthoringCloseParticipantInternalV1>();
  const participantUnsubscribes = new Map<string, () => void>();
  let disposed = false;
  let revision = 0;
  let snapshot!: AuthoringHostSnapshotInternalV1;

  const rebuildSnapshot = (): void => {
    const scene = documentSnapshotInternalV1(sceneSession.getSnapshot());
    const regions = regionsSession === null
      ? null
      : documentSnapshotInternalV1(regionsSession.getSnapshot());
    const participantDirty = [...closeParticipants.values()].some(
      (participant) => participant.getState().dirty,
    );
    revision += 1;
    snapshot = Object.freeze({
      identity,
      revision,
      connected: connectedViews.size > 0,
      dirty: scene.dirty || (regions?.dirty ?? false) || participantDirty,
      scene,
      regions,
      activeMotionId: motionStore.observe()?.source.motionId ?? null,
    });
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
  rebuildSnapshot();
  const sourceUnsubscribes = [
    sceneSession.subscribe(publish),
    motionStore.subscribe(publish),
    ...(regionsSession === null ? [] : [regionsSession.subscribe(publish)]),
  ];

  const getCloseState = (): AuthoringCloseParticipantStateInternalV1 => {
    const states = [...closeParticipants.values()].map((participant) => participant.getState());
    return Object.freeze({
      dirty: states.some((state) => state.dirty),
      busy: states.some((state) => state.busy),
      canSave: states.every((state) => !state.dirty || state.canSave),
    });
  };

  const owner: AuthoringHostOwnerInternalV1 = {
    sceneIo: input.sceneIo,
    motionIo: input.motionIo,
    regionsIo: input.regionsIo,
    sceneSession,
    sceneOperations,
    regionsSession,
    motionStore,
    flowActivation,
    closeParticipants,
    markViewConnected(viewId, connected): void {
      if (disposed) return;
      const changed = connected ? !connectedViews.has(viewId) : connectedViews.has(viewId);
      if (!changed) return;
      if (connected) connectedViews.add(viewId);
      else connectedViews.delete(viewId);
      publish();
    },
    registerCloseParticipant(id, participant): () => void {
      if (disposed) return () => {};
      participantUnsubscribes.get(id)?.();
      closeParticipants.set(id, participant);
      participantUnsubscribes.set(id, participant.subscribe(publish));
      publish();
      return () => {
        if (closeParticipants.get(id) !== participant) return;
        participantUnsubscribes.get(id)?.();
        participantUnsubscribes.delete(id);
        closeParticipants.delete(id);
        publish();
      };
    },
    getCloseState,
    async saveAndClose(): Promise<boolean> {
      const state = getCloseState();
      if (state.busy || !state.canSave) return false;
      for (const participant of [...closeParticipants.values()]) {
        if (participant.getState().dirty && !(await participant.save())) return false;
      }
      return !getCloseState().dirty;
    },
    discardAndClose(): void {
      for (const participant of [...closeParticipants.values()]) {
        if (participant.getState().dirty) participant.discard();
      }
    },
  };

  const host: AuthoringHostInternalV1 = Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      for (const unsubscribe of sourceUnsubscribes) unsubscribe();
      for (const unsubscribe of participantUnsubscribes.values()) unsubscribe();
      participantUnsubscribes.clear();
      closeParticipants.clear();
      connectedViews.clear();
      listeners.clear();
      await flowActivation.dispose();
    },
  });
  ownersInternalV1.set(host, owner);
  return host;
}

export function resolveAuthoringHostOwnerInternalV1(
  host: AuthoringHostInternalV1,
): AuthoringHostOwnerInternalV1 {
  const owner = ownersInternalV1.get(host);
  if (owner === undefined) throw new TypeError("Unknown Authoring Host owner");
  return owner;
}
