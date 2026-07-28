// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "@sillymaker/base";

/**
 * The system layer hosts at most one modal dialog at a time (the standard
 * game-menu convention): opening another surface replaces the current one,
 * so Save and Settings never stack.
 */
export type SystemDialogSurfaceV1 = "settings" | "saves";

export interface SystemDialogSessionStateV1 {
  readonly active: SystemDialogSurfaceV1 | null;
}

export interface SystemDialogSessionStoreV1 {
  getSnapshot(): DeepReadonly<SystemDialogSessionStateV1>;
  subscribe(listener: () => void): () => void;
  open(surface: SystemDialogSurfaceV1): void;
  close(): void;
}

export function createSystemDialogSessionStoreV1(): SystemDialogSessionStoreV1 {
  let state: DeepReadonly<SystemDialogSessionStateV1> = Object.freeze({ active: null });
  const listeners = new Set<() => void>();

  const publish = (active: SystemDialogSurfaceV1 | null): void => {
    state = Object.freeze({ active });
    for (const listener of [...listeners]) listener();
  };

  return Object.freeze({
    getSnapshot(): DeepReadonly<SystemDialogSessionStateV1> {
      return state;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },

    open(surface: SystemDialogSurfaceV1): void {
      if (state.active === surface) return;
      publish(surface);
    },

    close(): void {
      if (state.active === null) return;
      publish(null);
    },
  });
}
