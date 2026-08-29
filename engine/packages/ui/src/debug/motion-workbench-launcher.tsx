// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { MotionSourceIoV1 } from "./motion-io.ts";
import type { MotionSourceEntryV1, MotionSourceIndexV1 } from "./motion-sources.ts";
import type {
  MotionWorkbenchCloseParticipantV1,
  MotionWorkbenchPreviewV1,
} from "./motion-workbench.tsx";
import { MotionWorkbenchV1 } from "./motion-workbench.tsx";
import type { StageInspectCaptureV1 } from "./stage-inspect.ts";

/**
 * The Workbench launcher: the shared DevDock panel body that decides what
 * the Motion Workbench opens on. Entry points, in priority order:
 *
 * 1. capture — "Edit Motion" from the provenance card carries the live
 *    rendering as a detached fixture, so the Workbench shows exactly the
 *    scene the author clicked;
 * 2. preview case — Story-authored named fixtures for hard-to-reach scenes,
 *    reachable without replaying story progress;
 * 3. the Story's fallback preview context.
 *
 * All three are editor-local presentation fixtures — never Saves,
 * Snapshots, replay anchors, or a second gameplay state.
 */

export interface MotionPreviewCaseV1 {
  readonly caseId: string;
  readonly label: string;
  readonly motionId: string;
  readonly preview: MotionWorkbenchPreviewV1;
}

export interface MotionWorkbenchSelectionV1 {
  readonly source: MotionSourceEntryV1;
  /** Live-captured context; overrides the preview target/entry when set. */
  readonly capture: StageInspectCaptureV1 | null;
  /** The preview case this selection came from, when opened from one. */
  readonly caseId: string | null;
}

export interface MotionWorkbenchStoreV1 {
  observe(): MotionWorkbenchSelectionV1 | null;
  subscribe(listener: () => void): () => void;
  open(source: MotionSourceEntryV1, capture?: StageInspectCaptureV1 | null): void;
  openCase(previewCase: MotionPreviewCaseV1, source: MotionSourceEntryV1): void;
  close(): void;
}

type MotionWorkbenchSelectionChangeGateV1 = (
  next: MotionWorkbenchSelectionV1 | null,
) => boolean;

interface MotionWorkbenchStoreOwnerV1 {
  request(next: MotionWorkbenchSelectionV1 | null): void;
  registerSelectionChangeGate(gate: MotionWorkbenchSelectionChangeGateV1): () => void;
}

const motionWorkbenchStoreOwnersV1 = new WeakMap<
  MotionWorkbenchStoreV1,
  MotionWorkbenchStoreOwnerV1
>();

/** Editor chrome state shared between the provenance and Workbench panels. */
export function createMotionWorkbenchStoreV1(): MotionWorkbenchStoreV1 {
  const listeners = new Set<() => void>();
  const selectionChangeGates = new Set<MotionWorkbenchSelectionChangeGateV1>();
  let current: MotionWorkbenchSelectionV1 | null = null;
  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };
  const commit = (next: MotionWorkbenchSelectionV1 | null): void => {
    current = next;
    notify();
  };
  const request = (next: MotionWorkbenchSelectionV1 | null): void => {
    for (const gate of [...selectionChangeGates]) {
      if (gate(next)) return;
    }
    commit(next);
  };
  const store: MotionWorkbenchStoreV1 = {
    observe: () => current,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open(source: MotionSourceEntryV1, capture?: StageInspectCaptureV1 | null): void {
      request({ source, capture: capture ?? null, caseId: null });
    },
    openCase(previewCase: MotionPreviewCaseV1, source: MotionSourceEntryV1): void {
      request({ source, capture: null, caseId: previewCase.caseId });
    },
    close(): void {
      request(null);
    },
  };
  motionWorkbenchStoreOwnersV1.set(
    store,
    {
      request,
      registerSelectionChangeGate(gate: MotionWorkbenchSelectionChangeGateV1): () => void {
        selectionChangeGates.add(gate);
        return () => selectionChangeGates.delete(gate);
      },
    },
  );
  return store;
}

export interface MotionWorkbenchLauncherPropsV1 {
  readonly store: MotionWorkbenchStoreV1;
  readonly sources: MotionSourceIndexV1;
  /** The Story's default preview context (renderers, canvas, fallbacks). */
  readonly fallbackPreview: MotionWorkbenchPreviewV1;
  readonly cases?: readonly MotionPreviewCaseV1[];
  readonly io?: MotionSourceIoV1;
  readonly registerCloseParticipant?: (
    participant: MotionWorkbenchCloseParticipantV1,
  ) => () => void;
  /** Probe surfaces sharing the store must not own interactive selection changes. */
  readonly guardSelectionChanges?: boolean;
}

interface MotionWorkbenchCloseStateV1 {
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly canSave: boolean;
}

const cleanCloseStateV1: MotionWorkbenchCloseStateV1 = {
  dirty: false,
  busy: false,
  canSave: false,
};

interface MotionWorkbenchCloseParticipantSlotV1 {
  getParticipant(): MotionWorkbenchCloseParticipantV1 | null;
  getSnapshot(): MotionWorkbenchCloseStateV1;
  subscribe(listener: () => void): () => void;
  register(participant: MotionWorkbenchCloseParticipantV1): () => void;
}

function createMotionWorkbenchCloseParticipantSlotV1(): MotionWorkbenchCloseParticipantSlotV1 {
  const listeners = new Set<() => void>();
  let participant: MotionWorkbenchCloseParticipantV1 | null = null;
  let participantUnsubscribe: (() => void) | null = null;
  let snapshot = cleanCloseStateV1;
  const publish = (): void => {
    snapshot = participant?.getState() ?? cleanCloseStateV1;
    for (const listener of [...listeners]) listener();
  };
  return {
    getParticipant: () => participant,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    register(next: MotionWorkbenchCloseParticipantV1): () => void {
      participantUnsubscribe?.();
      participant = next;
      participantUnsubscribe = next.subscribe(publish);
      publish();
      return () => {
        if (participant !== next) return;
        participantUnsubscribe?.();
        participantUnsubscribe = null;
        participant = null;
        publish();
      };
    },
  };
}

interface PendingSelectionChangeV1 {
  readonly selection: MotionWorkbenchSelectionV1 | null;
}

function selectionPreviewV1(
  selection: MotionWorkbenchSelectionV1,
  props: MotionWorkbenchLauncherPropsV1,
): MotionWorkbenchPreviewV1 {
  const fromCase = selection.caseId === null
    ? null
    : (props.cases?.find((candidate) => candidate.caseId === selection.caseId) ?? null);
  if (fromCase !== null) return fromCase.preview;
  if (selection.capture !== null) {
    return {
      ...props.fallbackPreview,
      target: selection.capture.target,
      ...(selection.capture.entryKey === null ? {} : { entryKey: selection.capture.entryKey }),
    };
  }
  return props.fallbackPreview;
}

export function MotionWorkbenchLauncherV1(props: MotionWorkbenchLauncherPropsV1): ReactElement {
  const { registerCloseParticipant: registerHostCloseParticipant, store } = props;
  const selection = useSyncExternalStore(store.subscribe, store.observe, store.observe);
  const storeOwner = motionWorkbenchStoreOwnersV1.get(store) ?? null;
  const participantSlot = useMemo(createMotionWorkbenchCloseParticipantSlotV1, []);
  const closeState = useSyncExternalStore(
    participantSlot.subscribe,
    participantSlot.getSnapshot,
    participantSlot.getSnapshot,
  );
  const [pendingSelectionChange, setPendingSelectionChange] = useState<
    PendingSelectionChangeV1 | null
  >(null);
  const pendingSelectionChangeRef = useRef(pendingSelectionChange);
  const replacePendingSelectionChange = useCallback(
    (next: PendingSelectionChangeV1 | null): void => {
      pendingSelectionChangeRef.current = next;
      setPendingSelectionChange(next);
    },
    [],
  );

  const registerCloseParticipant = useCallback(
    (participant: MotionWorkbenchCloseParticipantV1): () => void => {
      const unregisterSlot = participantSlot.register(participant);
      const unregisterHost = registerHostCloseParticipant?.(participant) ?? (() => {});
      return () => {
        unregisterHost();
        unregisterSlot();
      };
    },
    [participantSlot, registerHostCloseParticipant],
  );

  useEffect(() => {
    if (storeOwner === null || props.guardSelectionChanges === false) return undefined;
    return storeOwner.registerSelectionChangeGate((next) => {
      const participant = participantSlot.getParticipant();
      if (participant === null || !participant.getState().dirty) return false;
      replacePendingSelectionChange({ selection: next });
      return true;
    });
  }, [participantSlot, props.guardSelectionChanges, replacePendingSelectionChange, storeOwner]);

  const commitPendingSelectionChange = useCallback((): void => {
    const pending = pendingSelectionChangeRef.current;
    if (pending === null) return;
    replacePendingSelectionChange(null);
    if (storeOwner === null) store.close();
    else storeOwner.request(pending.selection);
  }, [replacePendingSelectionChange, store, storeOwner]);

  const requestClose = (): void => {
    if (storeOwner !== null) {
      store.close();
      return;
    }
    const participant = participantSlot.getParticipant();
    if (participant !== null && participant.getState().dirty) {
      replacePendingSelectionChange({ selection: null });
      return;
    }
    store.close();
  };

  const saveAndContinue = async (): Promise<void> => {
    const participant = participantSlot.getParticipant();
    if (participant === null) return;
    const state = participant.getState();
    if (state.busy || (state.dirty && !state.canSave)) return;
    if (state.dirty && !(await participant.save())) return;
    commitPendingSelectionChange();
  };

  const discardAndContinue = (): void => {
    const participant = participantSlot.getParticipant();
    if (participant === null) return;
    const state = participant.getState();
    if (state.busy) return;
    if (state.dirty) participant.discard();
    commitPendingSelectionChange();
  };

  if (selection === null) {
    return (
      <div data-motion-workbench-launcher="empty" data-silly-tool-surface="true">
        <p>从舞台溯源的 "编辑 Motion" 进入，或从下面打开：</p>
        {props.cases === undefined || props.cases.length === 0
          ? null
          : (
            <ul data-motion-workbench-cases="true">
              {props.cases.map((previewCase) => {
                const source = props.sources.get(previewCase.motionId);
                return source === null ? null : (
                  <li key={previewCase.caseId}>
                    <button
                      type="button"
                      data-motion-workbench-case={previewCase.caseId}
                      onClick={() => store.openCase(previewCase, source)}
                    >
                      {previewCase.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        <ul data-motion-workbench-sources="true">
          {props.sources.list().map((entry) => (
            <li key={entry.motionId}>
              <button
                type="button"
                data-motion-workbench-open={entry.motionId}
                onClick={() => store.open(entry)}
              >
                {entry.motionId}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      data-motion-workbench-launcher={selection.source.motionId}
      data-motion-workbench-context={selection.caseId ??
        (selection.capture === null ? "fallback" : "capture")}
      data-silly-tool-surface="true"
    >
      <button type="button" data-motion-workbench-close="true" onClick={requestClose}>
        关闭
      </button>
      <MotionWorkbenchV1
        source={selection.source}
        preview={selectionPreviewV1(selection, props)}
        {...(props.io === undefined ? {} : { io: props.io })}
        registerCloseParticipant={registerCloseParticipant}
      />
      {pendingSelectionChange === null ? null : (
        <dialog
          open
          role="alertdialog"
          aria-modal="true"
          aria-label="关闭未保存的 Motion"
          data-blocking-focus-scope="true"
          data-motion-workbench-close-confirm="true"
        >
          <p>Motion 仍有未保存修改。保存、放弃，还是继续编辑？</p>
          <button
            type="button"
            data-motion-workbench-close-save="true"
            disabled={closeState.busy || !closeState.canSave}
            onClick={() => void saveAndContinue()}
          >
            保存并继续
          </button>
          <button
            type="button"
            data-motion-workbench-close-discard="true"
            disabled={closeState.busy}
            onClick={discardAndContinue}
          >
            放弃并继续
          </button>
          <button
            type="button"
            data-motion-workbench-close-cancel="true"
            disabled={closeState.busy}
            autoFocus
            onClick={() => replacePendingSelectionChange(null)}
          >
            取消
          </button>
        </dialog>
      )}
    </div>
  );
}
