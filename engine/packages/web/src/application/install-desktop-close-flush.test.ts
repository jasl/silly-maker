// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  desktopCloseFlushGlobalKeyV1,
  installDesktopCloseFlushV1,
} from "./install-desktop-close-flush.ts";

describe("desktop close flush bridge", () => {
  it("acknowledges only after the pending autosave flush completes", async () => {
    const target: Record<string, unknown> = {};
    const operations: string[] = [];
    let finishFlush!: () => void;
    const flush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishFlush = resolve;
        }),
    );
    const uninstall = installDesktopCloseFlushV1({
      enabled: true,
      fence: () => operations.push("fence"),
      flush: () => {
        operations.push("flush");
        return flush();
      },
      target,
    });
    const handler = target[desktopCloseFlushGlobalKeyV1] as (action: unknown) => unknown;

    expect(handler({ operation: "prepare", protocolRevision: 1, requestId: 7 })).toEqual({
      kind: "preparing",
      protocolRevision: 1,
      requestId: 7,
    });
    expect(flush).toHaveBeenCalledTimes(1);
    expect(operations).toEqual(["fence", "flush"]);
    expect(handler({ operation: "read", protocolRevision: 1, requestId: 7 })).toEqual({
      kind: "preparing",
      protocolRevision: 1,
      requestId: 7,
    });
    expect(handler({ operation: "read", protocolRevision: 1, requestId: 8 })).toEqual({
      kind: "failed",
      protocolRevision: 1,
      requestId: 8,
    });

    finishFlush();
    await Promise.resolve();
    await Promise.resolve();
    expect(handler({ operation: "read", protocolRevision: 1, requestId: 7 })).toEqual({
      kind: "flushed",
      protocolRevision: 1,
      requestId: 7,
    });

    uninstall();
    expect(Object.hasOwn(target, desktopCloseFlushGlobalKeyV1)).toBe(false);
  });

  it("returns a failed receipt and reports the error when persistence cannot flush", async () => {
    const target: Record<string, unknown> = {};
    const failure = new Error("disk full");
    const reportFailure = vi.fn();
    installDesktopCloseFlushV1({
      enabled: true,
      fence: () => {},
      flush: () => Promise.reject(failure),
      reportFailure,
      target,
    });
    const handler = target[desktopCloseFlushGlobalKeyV1] as (action: unknown) => unknown;

    expect(handler({ operation: "prepare", protocolRevision: 1, requestId: 11 })).toEqual({
      kind: "preparing",
      protocolRevision: 1,
      requestId: 11,
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(handler({ operation: "read", protocolRevision: 1, requestId: 11 })).toEqual({
      kind: "failed",
      protocolRevision: 1,
      requestId: 11,
    });
    expect(reportFailure).toHaveBeenCalledWith(failure);
  });

  it("does not install outside the marked desktop shell and rejects a live generation", () => {
    const target: Record<string, unknown> = {};
    const inactive = installDesktopCloseFlushV1({
      enabled: false,
      fence: () => {},
      flush: async () => {},
      target,
    });
    expect(Object.hasOwn(target, desktopCloseFlushGlobalKeyV1)).toBe(false);
    inactive();

    const first = installDesktopCloseFlushV1({
      enabled: true,
      fence: () => {},
      flush: async () => {},
      target,
    });
    const firstHandler = target[desktopCloseFlushGlobalKeyV1];
    expect(() =>
      installDesktopCloseFlushV1({
        enabled: true,
        fence: () => {},
        flush: async () => {},
        target,
      })
    ).toThrow("web.desktop_close_bridge_collision");
    expect(target[desktopCloseFlushGlobalKeyV1]).toBe(firstHandler);

    first();
    expect(Object.hasOwn(target, desktopCloseFlushGlobalKeyV1)).toBe(false);
  });
});
