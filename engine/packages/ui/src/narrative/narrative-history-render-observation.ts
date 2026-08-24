// SPDX-License-Identifier: MIT
import type { DeepReadonly, NarrativeHistoryV1 } from "@sillymaker/base";

export interface NarrativeStableHistoryObservationPortInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1>;
  subscribeInternalV1(listener: () => void): () => void;
}

export interface NarrativeStableHistoryRenderObservationInternalV1 {
  getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1>;
  subscribeInternalV1(listener: () => void): () => void;
  retireInternalV1(): void;
}

function equalHistoryInternalV1(
  left: DeepReadonly<NarrativeHistoryV1>,
  right: DeepReadonly<NarrativeHistoryV1>,
): boolean {
  if (left === right) return true;
  if (left.entries.length !== right.entries.length) return false;
  for (let index = 0; index < left.entries.length; index += 1) {
    const leftEntry = left.entries[index]!;
    const rightEntry = right.entries[index]!;
    if (
      leftEntry.kind !== rightEntry.kind ||
      leftEntry.occurrenceId !== rightEntry.occurrenceId ||
      leftEntry.definitionId !== rightEntry.definitionId ||
      leftEntry.seenRevision !== rightEntry.seenRevision ||
      leftEntry.speakerTextId !== rightEntry.speakerTextId ||
      leftEntry.textId !== rightEntry.textId ||
      leftEntry.voiceAssetId !== rightEntry.voiceAssetId
    ) return false;
  }
  return true;
}

export function createNarrativeStableHistoryRenderObservationInternalV1(
  capturedPort: NarrativeStableHistoryObservationPortInternalV1,
): NarrativeStableHistoryRenderObservationInternalV1 {
  const listeners = new Set<() => void>();
  let currentSnapshot: DeepReadonly<NarrativeHistoryV1> | null = null;
  let unsubscribeRaw: (() => void) | null = null;
  let active = true;

  const refresh = (): boolean => {
    if (!active) return false;
    const next = capturedPort.getSnapshotInternalV1();
    if (currentSnapshot !== null && equalHistoryInternalV1(currentSnapshot, next)) return false;
    currentSnapshot = next;
    return true;
  };

  const notify = (): void => {
    for (const current of [...listeners]) {
      try {
        current();
      } catch {
        // One subscriber cannot prevent the remaining observers from refreshing.
      }
    }
  };

  return {
    getSnapshotInternalV1(): DeepReadonly<NarrativeHistoryV1> {
      if (active && unsubscribeRaw === null) refresh();
      if (currentSnapshot === null) {
        throw new TypeError("ui.narrative_stable_history_observation_invalid");
      }
      return currentSnapshot;
    },
    subscribeInternalV1(listener: () => void): () => void {
      if (!active) return (): void => {};
      refresh();
      listeners.add(listener);
      if (unsubscribeRaw === null) {
        unsubscribeRaw = capturedPort.subscribeInternalV1((): void => {
          if (!active) return;
          let changed = false;
          try {
            changed = refresh();
          } catch {
            changed = true;
          }
          if (!changed) return;
          notify();
        });
        if (refresh()) notify();
      }
      let subscribed = true;
      return (): void => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
    retireInternalV1(): void {
      if (!active) return;
      active = false;
      listeners.clear();
      const unsubscribe = unsubscribeRaw;
      unsubscribeRaw = null;
      if (unsubscribe === null) return;
      try {
        unsubscribe();
      } catch {
        // Retirement remains final even when the upstream cleanup throws.
      }
    },
  };
}

export function retireNarrativeStableHistoryRenderObservationInternalV1(
  observation: NarrativeStableHistoryRenderObservationInternalV1,
): void {
  observation.retireInternalV1();
}
