// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  adoptShellWindowV1,
  createShellServerDrainInternalV1,
  createShellShutdownV1,
  requestShellRendererFlushV1,
  type ShellCloseEventLikeV1,
  type ShellWindowLikeV1,
} from "./shell-lifetime.mts";

describe("shell window adoption", () => {
  it("cancels non-authoritative requests only after preparation, before server drain", async () => {
    const operations: string[] = [];
    const requestShutdown = createShellShutdownV1({
      prepare: async () => {
        operations.push("prepare");
        return true;
      },
      shutdown: createShellServerDrainInternalV1({
        cancelNonAuthoritativeRequests: () => {
          operations.push("cancel downloads");
        },
        shutdown: async () => {
          operations.push("shutdown");
        },
      }),
      exit: () => {
        operations.push("exit");
      },
    });

    requestShutdown();
    for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();

    expect(operations).toEqual(["prepare", "cancel downloads", "shutdown", "exit"]);
  });

  it("flushes the renderer before graceful shutdown and exits only after the drain", async () => {
    let rendererStatus: "preparing" | "flushed" = "preparing";
    let continuePolling!: () => void;
    const pollGate = new Promise<void>((resolve) => {
      continuePolling = resolve;
    });
    let shutdowns = 0;
    let exits = 0;
    let finishShutdown!: () => void;
    const shutdownFinished = new Promise<void>((resolve) => {
      finishShutdown = resolve;
    });
    const operations: string[] = [];
    const listeners: Record<string, (event: ShellCloseEventLikeV1) => void> = {};
    let constructed = 0;
    class FakeWindow implements ShellWindowLikeV1 {
      constructor() {
        constructed += 1;
      }
      addEventListener(type: "close", listener: (event: ShellCloseEventLikeV1) => void): void {
        listeners[type] = listener;
      }
      executeJs(source: string): Promise<unknown> {
        const operation = source.includes('"operation":"prepare"')
          ? "prepare"
          : source.includes('"operation":"read"')
          ? "read"
          : "bad_script";
        operations.push(operation);
        return Promise.resolve({
          ok: true,
          value: {
            kind: rendererStatus,
            protocolRevision: 1,
            requestId: 1,
          },
        });
      }
    }
    const requestShutdown = createShellShutdownV1({
      prepare: () =>
        requestShellRendererFlushV1(adopted, {
          waitForPoll: () => pollGate,
          requestId: 1,
        }),
      shutdown: () => {
        shutdowns += 1;
        operations.push("shutdown");
        return shutdownFinished;
      },
      exit: () => {
        exits += 1;
      },
    });
    const adopted = adoptShellWindowV1({
      browserWindow: FakeWindow,
      requestShutdown,
    });
    expect(adopted).toBeInstanceOf(FakeWindow);
    expect(constructed).toBe(1);
    expect(shutdowns).toBe(0);
    const closeEvent = {
      preventDefault() {
        operations.push("preventDefault");
      },
    };
    listeners["close"]?.(closeEvent);
    listeners["close"]?.(closeEvent);
    await Promise.resolve();
    expect(shutdowns).toBe(0);
    expect(operations).toEqual(["preventDefault", "prepare", "preventDefault"]);
    expect(exits).toBe(0);
    rendererStatus = "flushed";
    continuePolling();
    for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
    expect(shutdowns).toBe(1);
    expect(operations).toEqual(["preventDefault", "prepare", "preventDefault", "read", "shutdown"]);
    finishShutdown();
    await shutdownFinished;
    await Promise.resolve();
    expect(exits).toBe(1);
  });

  it("returns null outside the desktop runtime (no BrowserWindow global)", () => {
    expect(
      adoptShellWindowV1({
        browserWindow: undefined,
        requestShutdown: () => {},
      }),
    ).toBeNull();
  });

  it("does not force an exit when graceful shutdown fails", async () => {
    let exits = 0;
    const requestShutdown = createShellShutdownV1({
      shutdown: () => Promise.reject(new Error("drain failed")),
      exit: () => {
        exits += 1;
      },
    });

    requestShutdown();
    await Promise.resolve();
    await Promise.resolve();

    expect(exits).toBe(0);
  });

  it.each([
    ["the renderer hook is absent", undefined],
    [
      "the renderer reports a failed flush",
      {
        kind: "failed",
        protocolRevision: 1,
      },
    ],
  ])("keeps the window and server alive when %s", async (_name, receipt) => {
    let shutdowns = 0;
    let exits = 0;
    let flushAttempts = 0;
    const requestShutdown = createShellShutdownV1({
      prepare: async () => {
        flushAttempts += 1;
        return receipt?.kind === "flushed";
      },
      shutdown: async () => {
        shutdowns += 1;
      },
      exit: () => {
        exits += 1;
      },
    });

    requestShutdown();
    await Promise.resolve();
    await Promise.resolve();

    expect(flushAttempts).toBe(1);
    expect(shutdowns).toBe(0);
    expect(exits).toBe(0);

    // A rejected close preparation is retryable; it does not poison the
    // lifetime coordinator or turn a later native close into a forced exit.
    requestShutdown();
    await Promise.resolve();
    await Promise.resolve();
    expect(flushAttempts).toBe(2);
    expect(shutdowns).toBe(0);
  });

  it("treats thrown renderer execution as a missing acknowledgement", async () => {
    const window = {
      addEventListener() {},
      executeJs: () => Promise.reject(new Error("renderer unavailable")),
    } satisfies ShellWindowLikeV1;

    await expect(
      requestShellRendererFlushV1(window, {
        waitForPoll: () => Promise.resolve(),
        requestId: 9,
      }),
    ).resolves.toBe(false);
  });

  it("keeps documented bare executeJs receipts compatible", async () => {
    const window = {
      addEventListener() {},
      executeJs: () =>
        Promise.resolve({
          kind: "flushed",
          protocolRevision: 1,
          requestId: 9,
        }),
    } satisfies ShellWindowLikeV1;

    await expect(
      requestShellRendererFlushV1(window, {
        waitForPoll: () => Promise.resolve(),
        requestId: 9,
      }),
    ).resolves.toBe(true);
  });

  it("rejects a failed executeJs envelope even when its value looks successful", async () => {
    const window = {
      addEventListener() {},
      executeJs: () =>
        Promise.resolve({
          ok: false,
          value: {
            kind: "flushed",
            protocolRevision: 1,
            requestId: 9,
          },
        }),
    } satisfies ShellWindowLikeV1;

    await expect(
      requestShellRendererFlushV1(window, {
        waitForPoll: () => Promise.resolve(),
        requestId: 9,
      }),
    ).resolves.toBe(false);
  });

  it("rejects a malformed successful executeJs envelope", async () => {
    const window = {
      addEventListener() {},
      executeJs: () => Promise.resolve({ ok: true }),
    } satisfies ShellWindowLikeV1;

    await expect(
      requestShellRendererFlushV1(window, {
        waitForPoll: () => Promise.resolve(),
        requestId: 9,
      }),
    ).resolves.toBe(false);
  });

  it("rejects executeJs envelope accessors without invoking them", async () => {
    let accessorCalls = 0;
    const envelope = Object.defineProperty({}, "ok", {
      get() {
        accessorCalls += 1;
        return true;
      },
    });
    const window = {
      addEventListener() {},
      executeJs: () => Promise.resolve(envelope),
    } satisfies ShellWindowLikeV1;

    await expect(
      requestShellRendererFlushV1(window, {
        waitForPoll: () => Promise.resolve(),
        requestId: 9,
      }),
    ).resolves.toBe(false);
    expect(accessorCalls).toBe(0);
  });

  it("rejects a stale renderer receipt from another close request", async () => {
    const window = {
      addEventListener() {},
      executeJs: () =>
        Promise.resolve({
          ok: true,
          value: {
            kind: "flushed",
            protocolRevision: 1,
            requestId: 8,
          },
        }),
    } satisfies ShellWindowLikeV1;

    await expect(
      requestShellRendererFlushV1(window, {
        waitForPoll: () => Promise.resolve(),
        requestId: 9,
      }),
    ).resolves.toBe(false);
  });

  it("falls back to an options-object construction before giving up", () => {
    let optionCalls = 0;
    class NeedsOptions implements ShellWindowLikeV1 {
      constructor(options?: Record<never, never>) {
        if (options === undefined) throw new Error("options required");
        optionCalls += 1;
      }
      addEventListener(): void {}
    }
    expect(
      adoptShellWindowV1({
        browserWindow: NeedsOptions,
        requestShutdown: () => {},
      }),
    ).toBeInstanceOf(NeedsOptions);
    expect(optionCalls).toBe(1);

    class AlwaysThrows implements ShellWindowLikeV1 {
      constructor() {
        throw new Error("no window backend");
      }
      addEventListener(): void {}
    }
    expect(
      adoptShellWindowV1({
        browserWindow: AlwaysThrows,
        requestShutdown: () => {},
      }),
    ).toBeNull();
  });
});
