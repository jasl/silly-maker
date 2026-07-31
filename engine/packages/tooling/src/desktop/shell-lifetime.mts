// SPDX-License-Identifier: MIT

/** Cancelable native close request emitted by `Deno.BrowserWindow`. */
export interface ShellCloseEventLikeV1 {
  preventDefault(): void;
}

/** Minimal surface of `Deno.BrowserWindow` the shell relies on. */
export interface ShellWindowLikeV1 {
  addEventListener(type: "close", listener: (event: ShellCloseEventLikeV1) => void): void;
}

/** Minimal surface of the `Deno.serve` handle used during shell shutdown. */
export interface ShellServerLikeV1 {
  shutdown(): Promise<void>;
}

/**
 * Creates an idempotent close request. `HttpServer.shutdown()` stops ingress
 * and lets active requests finish; only after that drain succeeds may the
 * process exit and tear down the native window.
 */
export function createShellShutdownV1(input: {
  readonly shutdown: ShellServerLikeV1["shutdown"];
  readonly exit: () => void;
}): () => void {
  let requested = false;
  async function drainAndExitV1(): Promise<void> {
    try {
      await input.shutdown();
    } catch {
      // A failed drain must not be converted back into an unsafe forced exit.
      // The runtime stays alive so the user can force-quit explicitly.
      return;
    }
    input.exit();
  }

  return (): void => {
    if (requested) return;
    requested = true;
    void drainAndExitV1();
  };
}

/**
 * Adopts the runtime's startup window and binds its native close request to
 * graceful server shutdown. The first `Deno.BrowserWindow` construction owns
 * the implicit startup window; callers retain the returned handle for the
 * shell lifetime. Plain `deno run` verification has no BrowserWindow and
 * receives null.
 */
export function adoptShellWindowV1(input: {
  readonly browserWindow: (new (options?: Record<never, never>) => ShellWindowLikeV1) | undefined;
  readonly requestShutdown: () => void;
}): ShellWindowLikeV1 | null {
  const BrowserWindow = input.browserWindow;
  if (typeof BrowserWindow !== "function") return null;
  let adopted: ShellWindowLikeV1;
  try {
    adopted = new BrowserWindow();
  } catch {
    try {
      adopted = new BrowserWindow({});
    } catch {
      return null;
    }
  }
  adopted.addEventListener("close", (event) => {
    // Keep the WebView (and therefore in-flight records request bodies) alive
    // until shutdown has stopped ingress and drained the HTTP server.
    event.preventDefault();
    input.requestShutdown();
  });
  return adopted;
}
