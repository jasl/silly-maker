// SPDX-License-Identifier: MIT
import type { DevDockPanelAuthorityV1 } from "./dev-dock.tsx";

/**
 * Shared DevDock window control: the mounted window host publishes its
 * validated panel registry here, and any owner (the engine launcher or a
 * Story-mounted `StoryDebugDockV1`) opens/closes per-panel floating
 * windows through the same port. Open commands may name a panel that has
 * not loaded yet (lazy contributions); the window appears once the panel
 * registers.
 */

export interface DevDockPanelDescriptorV1 {
  readonly id: string;
  readonly title: string;
  readonly authority: DevDockPanelAuthorityV1;
}

interface DevDockControlListV1<T> {
  getCurrent(): readonly T[];
  subscribe(listener: () => void): () => void;
}

export interface DevDockControlV1 {
  /** Panels currently registered by the mounted dock (empty while gated off). */
  readonly panels: DevDockControlListV1<DevDockPanelDescriptorV1>;
  /** Panel ids with an open floating window, in opening order. */
  readonly openPanelIds: DevDockControlListV1<string>;
  open(panelId: string): void;
  close(panelId: string): void;
  closeAll(): void;
  /** Engine-internal: the mounted DevDock publishes its panel registry. */
  publishPanelsInternalV1(panels: readonly DevDockPanelDescriptorV1[]): void;
}

const maximumOpenDevDockWindowsV1 = 32;

export function createDevDockControlV1(): DevDockControlV1 {
  let panels: readonly DevDockPanelDescriptorV1[] = [];
  let openIds: readonly string[] = [];
  const panelListeners = new Set<() => void>();
  const openListeners = new Set<() => void>();
  const notify = (listeners: Set<() => void>): void => {
    for (const listener of [...listeners]) listener();
  };
  return {
    panels: {
      getCurrent: () => panels,
      subscribe(listener: () => void) {
        panelListeners.add(listener);
        return () => panelListeners.delete(listener);
      },
    },
    openPanelIds: {
      getCurrent: () => openIds,
      subscribe(listener: () => void) {
        openListeners.add(listener);
        return () => openListeners.delete(listener);
      },
    },
    open(panelId: string) {
      if (typeof panelId !== "string" || panelId.length === 0) {
        throw new TypeError("ui.devdock_invalid_panel_id");
      }
      if (openIds.includes(panelId) || openIds.length >= maximumOpenDevDockWindowsV1) return;
      openIds = [...openIds, panelId];
      notify(openListeners);
    },
    close(panelId: string) {
      if (!openIds.includes(panelId)) return;
      openIds = openIds.filter((id) => id !== panelId);
      notify(openListeners);
    },
    closeAll() {
      if (openIds.length === 0) return;
      openIds = [];
      notify(openListeners);
    },
    publishPanelsInternalV1(next: readonly DevDockPanelDescriptorV1[]) {
      panels = [...next];
      notify(panelListeners);
    },
  };
}
