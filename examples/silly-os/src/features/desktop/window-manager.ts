// SPDX-License-Identifier: MIT
// 桌面切片·窗口管理器：打开/关闭/聚焦（z 前置）/最小化/最大化/移动。
// 纯 UI 瞬态（不进权威状态、不入存档），快照不可变 + subscribe，
// React 经 useSyncExternalStore 消费。
export interface OsWindowRectV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type OsWindowModeV1 = "normal" | "minimized" | "maximized";

export interface OsWindowV1 {
  readonly windowId: string;
  readonly appId: string;
  readonly rect: OsWindowRectV1;
  readonly mode: OsWindowModeV1;
  /** 最大化前的还原矩形。 */
  readonly restoreRect: OsWindowRectV1 | null;
  /** 画序（越大越靠前）。 */
  readonly z: number;
  /** 任务栏序（按打开顺序稳定排列）。 */
  readonly order: number;
}

export interface OsWindowManagerSnapshotV1 {
  readonly windows: readonly OsWindowV1[];
  readonly focusedWindowId: string | null;
  readonly revision: number;
}

export interface OsWindowManagerV1 {
  snapshot(): OsWindowManagerSnapshotV1;
  subscribe(listener: () => void): () => void;
  /** singleton app 已开时改为聚焦还原；返回窗口 id。 */
  open(
    appId: string,
    options: {
      readonly rect: OsWindowRectV1;
      readonly singleton: boolean;
      readonly bounds?: OsWindowRectV1;
    },
  ): string;
  close(windowId: string): void;
  focus(windowId: string): void;
  minimize(windowId: string): void;
  /** 最大化 ↔ 还原。 */
  toggleMaximize(windowId: string, bounds: OsWindowRectV1): void;
  /** 任务栏按钮语义：最小化的还原聚焦；聚焦中的最小化；其余聚焦。 */
  taskbarActivate(windowId: string): void;
  move(windowId: string, x: number, y: number): void;
  /** 视口变化时把所有窗口拉回桌面（尺寸收缩、位置回界）。 */
  clampToBounds(bounds: OsWindowRectV1): void;
}

/** 把矩形约束进桌面：尺寸收缩到桌面内，位置整体回界（开窗与视口变化用）。 */
export function clampOsWindowRectV1(rect: OsWindowRectV1, bounds: OsWindowRectV1): OsWindowRectV1 {
  const width = Math.min(rect.width, bounds.width);
  const height = Math.min(rect.height, bounds.height);
  const x = Math.min(Math.max(rect.x, bounds.x), bounds.x + bounds.width - width);
  const y = Math.min(Math.max(rect.y, bounds.y), bounds.y + bounds.height - height);
  return Object.freeze({ x, y, width, height });
}

export function createOsWindowManagerV1(): OsWindowManagerV1 {
  let windows: readonly OsWindowV1[] = Object.freeze([]);
  let revision = 0;
  let nextWindow = 1;
  let nextZ = 1;
  let nextOrder = 1;
  let snapshotCache: OsWindowManagerSnapshotV1 | null = null;
  const listeners = new Set<() => void>();

  function focusedIdOf(list: readonly OsWindowV1[]): string | null {
    let top: OsWindowV1 | null = null;
    for (const window of list) {
      if (window.mode === "minimized") continue;
      if (top === null || window.z > top.z) top = window;
    }
    return top?.windowId ?? null;
  }

  function commit(next: readonly OsWindowV1[]): void {
    windows = Object.freeze(next);
    revision += 1;
    snapshotCache = null;
    for (const listener of [...listeners]) listener();
  }

  function update(windowId: string, patch: (window: OsWindowV1) => OsWindowV1): void {
    commit(windows.map((window) => (window.windowId === windowId ? patch(window) : window)));
  }

  const manager: OsWindowManagerV1 = {
    snapshot() {
      snapshotCache ??= Object.freeze({
        windows,
        focusedWindowId: focusedIdOf(windows),
        revision,
      });
      return snapshotCache;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open(appId, options) {
      if (options.singleton) {
        const existing = windows.find((window) => window.appId === appId);
        if (existing !== undefined) {
          update(existing.windowId, (window) => ({
            ...window,
            mode: window.mode === "minimized" ? "normal" : window.mode,
            z: nextZ++,
          }));
          return existing.windowId;
        }
      }
      const windowId = `window.${String(nextWindow++)}`;
      // 级联偏移新窗口，避免完全重叠；出界由调用方传入的桌面矩形拉回。
      const offset = ((nextOrder - 1) % 5) * 24;
      const cascaded = Object.freeze({
        ...options.rect,
        x: options.rect.x + offset,
        y: options.rect.y + offset,
      });
      commit([
        ...windows,
        Object.freeze({
          windowId,
          appId,
          rect:
            options.bounds === undefined ? cascaded : clampOsWindowRectV1(cascaded, options.bounds),
          mode: "normal" as const,
          restoreRect: null,
          z: nextZ++,
          order: nextOrder++,
        }),
      ]);
      return windowId;
    },
    close(windowId) {
      commit(windows.filter((window) => window.windowId !== windowId));
    },
    focus(windowId) {
      update(windowId, (window) => ({
        ...window,
        mode: window.mode === "minimized" ? "normal" : window.mode,
        z: nextZ++,
      }));
    },
    minimize(windowId) {
      update(windowId, (window) => ({ ...window, mode: "minimized" as const }));
    },
    toggleMaximize(windowId, bounds) {
      update(windowId, (window) =>
        window.mode === "maximized"
          ? {
              ...window,
              mode: "normal" as const,
              rect: window.restoreRect ?? window.rect,
              restoreRect: null,
              z: nextZ++,
            }
          : {
              ...window,
              mode: "maximized" as const,
              restoreRect: window.rect,
              rect: bounds,
              z: nextZ++,
            },
      );
    },
    taskbarActivate(windowId) {
      const target = windows.find((window) => window.windowId === windowId);
      if (target === undefined) return;
      if (target.mode === "minimized") {
        update(windowId, (window) => ({ ...window, mode: "normal" as const, z: nextZ++ }));
        return;
      }
      if (focusedIdOf(windows) === windowId) {
        update(windowId, (window) => ({ ...window, mode: "minimized" as const }));
        return;
      }
      update(windowId, (window) => ({ ...window, z: nextZ++ }));
    },
    move(windowId, x, y) {
      update(windowId, (window) =>
        window.mode === "maximized"
          ? window
          : { ...window, rect: Object.freeze({ ...window.rect, x, y }) },
      );
    },
    clampToBounds(bounds) {
      commit(
        windows.map((window) =>
          window.mode === "maximized"
            ? { ...window, rect: bounds }
            : { ...window, rect: clampOsWindowRectV1(window.rect, bounds) },
        ),
      );
    },
  };
  return Object.freeze(manager);
}
