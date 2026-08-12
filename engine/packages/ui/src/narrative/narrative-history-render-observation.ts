// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  parseNarrativeHistoryV1,
  type DeepReadonly,
  type NarrativeHistoryV1,
} from "@sillymaker/base";

export interface NarrativeStableHistoryObservationPortInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1>;
  subscribeInternalV1(listener: () => void): () => void;
}

export interface NarrativeStableHistoryRenderObservationInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1>;
  subscribeInternalV1(listener: () => void): () => void;
}

interface NarrativeStableHistoryRenderObservationRecordInternalV1 {
  binding: NarrativeStableHistoryObservationPortInternalV1 | null;
  readonly listeners: Set<() => void>;
  readonly listenerHolders: Set<{ listener: (() => void) | null }>;
  currentSnapshot: DeepReadonly<NarrativeHistoryV1> | null;
  currentBytes: Uint8Array | null;
  unsubscribeRaw: (() => void) | null;
  active: boolean;
}

const narrativeStableHistoryRenderObservationRecordsInternalV1 = new WeakMap<
  NarrativeStableHistoryRenderObservationInternalV1,
  NarrativeStableHistoryRenderObservationRecordInternalV1
>();

function bytesEqualInternalV1(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function createNarrativeStableHistoryRenderObservationInternalV1(
  capturedPort: NarrativeStableHistoryObservationPortInternalV1,
): NarrativeStableHistoryRenderObservationInternalV1 {
  let observation!: NarrativeStableHistoryRenderObservationInternalV1;
  let record!: NarrativeStableHistoryRenderObservationRecordInternalV1;
  const refresh = (): boolean => {
    const binding = record.binding;
    if (!record.active || binding === null) return false;
    const parsed = parseNarrativeHistoryV1(binding.getSnapshotInternalV1());
    const bytes = canonicalJsonBytes(parsed);
    if (record.currentBytes !== null && bytesEqualInternalV1(record.currentBytes, bytes)) {
      return false;
    }
    record.currentSnapshot = parsed;
    record.currentBytes = Uint8Array.from(bytes);
    return true;
  };
  observation = Object.freeze({
    getSnapshotInternalV1(
      this: NarrativeStableHistoryRenderObservationInternalV1,
    ): DeepReadonly<NarrativeHistoryV1> {
      if (
        this !== observation ||
        narrativeStableHistoryRenderObservationRecordsInternalV1.get(observation) !== record
      ) {
        throw new TypeError("ui.narrative_stable_history_observation_invalid");
      }
      if (record.active) refresh();
      if (record.currentSnapshot === null) {
        throw new TypeError("ui.narrative_stable_history_observation_invalid");
      }
      return record.currentSnapshot;
    },
    subscribeInternalV1(
      this: NarrativeStableHistoryRenderObservationInternalV1,
      listener: () => void,
    ): () => void {
      if (
        this !== observation ||
        narrativeStableHistoryRenderObservationRecordsInternalV1.get(observation) !== record ||
        typeof listener !== "function"
      ) {
        throw new TypeError("ui.narrative_stable_history_observation_invalid");
      }
      if (!record.active) return Object.freeze((): void => {});
      refresh();
      record.listeners.add(listener);
      const holder: { listener: (() => void) | null } = { listener };
      record.listenerHolders.add(holder);
      if (record.unsubscribeRaw === null) {
        const rawListener = (): void => {
          if (!record.active) return;
          let changed = false;
          try {
            changed = refresh();
          } catch {
            changed = true;
          }
          if (!changed) return;
          for (const current of Object.freeze([...record.listeners])) {
            try {
              current();
            } catch {
              // Observation subscribers are isolated after canonical refresh.
            }
          }
        };
        const binding = record.binding;
        if (binding === null) {
          record.listeners.delete(listener);
          holder.listener = null;
          record.listenerHolders.delete(holder);
          return Object.freeze((): void => {});
        }
        const unsubscribe = binding.subscribeInternalV1(rawListener);
        if (typeof unsubscribe !== "function") {
          record.listeners.delete(listener);
          holder.listener = null;
          record.listenerHolders.delete(holder);
          throw new TypeError("ui.narrative_stable_history_observation_invalid");
        }
        record.unsubscribeRaw = unsubscribe;
      }
      let active = true;
      return Object.freeze((): void => {
        if (!active) return;
        active = false;
        const retainedListener = holder.listener;
        holder.listener = null;
        record.listenerHolders.delete(holder);
        if (retainedListener !== null) record.listeners.delete(retainedListener);
      });
    },
  });
  record = {
    binding: capturedPort,
    listeners: new Set(),
    listenerHolders: new Set(),
    currentSnapshot: null,
    currentBytes: null,
    unsubscribeRaw: null,
    active: true,
  };
  narrativeStableHistoryRenderObservationRecordsInternalV1.set(observation, record);
  return observation;
}

export function retireNarrativeStableHistoryRenderObservationInternalV1(
  observation: NarrativeStableHistoryRenderObservationInternalV1,
): void {
  const record = narrativeStableHistoryRenderObservationRecordsInternalV1.get(observation);
  if (record === undefined || !record.active) return;
  record.active = false;
  record.binding = null;
  record.listeners.clear();
  for (const holder of record.listenerHolders) holder.listener = null;
  record.listenerHolders.clear();
  const unsubscribe = record.unsubscribeRaw;
  record.unsubscribeRaw = null;
  if (unsubscribe === null) return;
  try {
    unsubscribe();
  } catch {
    // The retired observation stays fenced when raw cleanup is hostile.
  }
}
