// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";
import { createSystemDialogSessionStoreV1 } from "./system-dialog-session-store.ts";

describe("createSystemDialogSessionStoreV1", () => {
  it("publishes frozen external-store snapshots with stable identity", () => {
    const store = createSystemDialogSessionStoreV1();
    const initial = store.getSnapshot();

    expect(initial).toEqual({ active: null });
    expect(Object.isFrozen(initial)).toBe(true);
    expect(store.getSnapshot()).toBe(initial);

    store.open("settings");
    const opened = store.getSnapshot();
    expect(opened).toEqual({ active: "settings" });
    expect(opened).not.toBe(initial);
    expect(Object.isFrozen(opened)).toBe(true);
    expect(store.getSnapshot()).toBe(opened);

    store.close();
    const closed = store.getSnapshot();
    expect(closed).toEqual({ active: null });
    expect(closed).not.toBe(opened);
    expect(Object.isFrozen(closed)).toBe(true);
    expect(store.getSnapshot()).toBe(closed);
  });

  it("holds at most one surface: opening another replaces the current one", () => {
    const store = createSystemDialogSessionStoreV1();
    store.open("saves");
    expect(store.getSnapshot()).toEqual({ active: "saves" });
    store.open("settings");
    expect(store.getSnapshot()).toEqual({ active: "settings" });
    store.close();
    expect(store.getSnapshot()).toEqual({ active: null });
  });

  it("notifies exactly once per real transition and keeps open and close idempotent", () => {
    const store = createSystemDialogSessionStoreV1();
    const notifications: (string | null)[] = [];
    const listener = vi.fn(() => {
      notifications.push(store.getSnapshot().active);
    });
    const unsubscribe = store.subscribe(listener);

    const initial = store.getSnapshot();
    store.close();
    expect(store.getSnapshot()).toBe(initial);

    store.open("settings");
    const opened = store.getSnapshot();
    store.open("settings");
    expect(store.getSnapshot()).toBe(opened);

    store.close();
    const closed = store.getSnapshot();
    store.close();
    expect(store.getSnapshot()).toBe(closed);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(notifications).toEqual(["settings", null]);

    unsubscribe();
    store.open("saves");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
