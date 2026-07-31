// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  adoptShellWindowV1,
  createShellShutdownV1,
  type ShellCloseEventLikeV1,
  type ShellWindowLikeV1,
} from "./shell-lifetime.mts";

describe("shell window adoption", () => {
  it("retains the adopted startup window and exits only after graceful shutdown", async () => {
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
    }
    const requestShutdown = createShellShutdownV1({
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
    expect(shutdowns).toBe(1);
    expect(operations).toEqual(["preventDefault", "shutdown", "preventDefault"]);
    expect(exits).toBe(0);
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
