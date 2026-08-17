// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createOsWindowManagerV1 } from "../game/features/desktop/window-manager.ts";

const rect = Object.freeze({ x: 100, y: 100, width: 300, height: 200 });
const bounds = Object.freeze({ x: 0, y: 0, width: 1024, height: 734 });

describe("window manager", () => {
  it("opens windows with cascade offsets and focuses the newest", () => {
    const wm = createOsWindowManagerV1();
    const first = wm.open("app.a", { rect, singleton: false });
    const second = wm.open("app.a", { rect, singleton: false });
    const snapshot = wm.snapshot();
    expect(snapshot.windows).toHaveLength(2);
    expect(snapshot.focusedWindowId).toBe(second);
    const [a, b] = snapshot.windows;
    expect(b!.rect.x).toBe(a!.rect.x + 24);
    expect(first).not.toBe(second);
  });

  it("singleton apps focus the existing window instead of opening twice", () => {
    const wm = createOsWindowManagerV1();
    const first = wm.open("app.s", { rect, singleton: true });
    wm.open("app.other", { rect, singleton: false });
    const again = wm.open("app.s", { rect, singleton: true });
    expect(again).toBe(first);
    expect(wm.snapshot().windows).toHaveLength(2);
    expect(wm.snapshot().focusedWindowId).toBe(first);
  });

  it("focus raises z; minimized windows never hold focus", () => {
    const wm = createOsWindowManagerV1();
    const a = wm.open("app.a", { rect, singleton: false });
    const b = wm.open("app.b", { rect, singleton: false });
    wm.focus(a);
    expect(wm.snapshot().focusedWindowId).toBe(a);
    wm.minimize(a);
    expect(wm.snapshot().focusedWindowId).toBe(b);
    wm.minimize(b);
    expect(wm.snapshot().focusedWindowId).toBeNull();
  });

  it("taskbar activation restores, minimizes when focused, focuses otherwise", () => {
    const wm = createOsWindowManagerV1();
    const a = wm.open("app.a", { rect, singleton: false });
    const b = wm.open("app.b", { rect, singleton: false });
    wm.taskbarActivate(a); // unfocused → focus
    expect(wm.snapshot().focusedWindowId).toBe(a);
    wm.taskbarActivate(a); // focused → minimize
    expect(wm.snapshot().windows.find((w) => w.windowId === a)?.mode).toBe("minimized");
    expect(wm.snapshot().focusedWindowId).toBe(b);
    wm.taskbarActivate(a); // minimized → restore + focus
    expect(wm.snapshot().windows.find((w) => w.windowId === a)?.mode).toBe("normal");
    expect(wm.snapshot().focusedWindowId).toBe(a);
  });

  it("maximize captures the restore rect; restore brings it back; move is inert while maximized", () => {
    const wm = createOsWindowManagerV1();
    const a = wm.open("app.a", { rect, singleton: false });
    wm.toggleMaximize(a, bounds);
    let win = wm.snapshot().windows[0]!;
    expect(win.mode).toBe("maximized");
    expect(win.rect).toStrictEqual(bounds);
    wm.move(a, 500, 500);
    expect(wm.snapshot().windows[0]!.rect).toStrictEqual(bounds);
    wm.toggleMaximize(a, bounds);
    win = wm.snapshot().windows[0]!;
    expect(win.mode).toBe("normal");
    expect(win.rect).toStrictEqual(rect);
  });

  it("close removes the window and refocuses the next-topmost", () => {
    const wm = createOsWindowManagerV1();
    const a = wm.open("app.a", { rect, singleton: false });
    const b = wm.open("app.b", { rect, singleton: false });
    wm.close(b);
    expect(wm.snapshot().windows.map((w) => w.windowId)).toStrictEqual([a]);
    expect(wm.snapshot().focusedWindowId).toBe(a);
  });
});
