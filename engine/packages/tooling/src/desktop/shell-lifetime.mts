// SPDX-License-Identifier: MIT

/** Cancelable native close request emitted by `Deno.BrowserWindow`. */
export interface ShellCloseEventLikeV1 {
  preventDefault(): void;
}

/** Minimal surface of `Deno.BrowserWindow` the shell relies on. */
export interface ShellWindowLikeV1 {
  addEventListener(type: "close", listener: (event: ShellCloseEventLikeV1) => void): void;
  /** Runs in the adopted webview's main world. */
  executeJs?(source: string): Promise<unknown>;
}

/** Minimal surface of the `Deno.serve` handle used during shell shutdown. */
export interface ShellServerLikeV1 {
  shutdown(): Promise<void>;
}

/**
 * Builds the non-authoritative request drain used only after renderer
 * preparation has acknowledged the exact current autosave. Active downloads
 * are cancelled before the server begins its graceful record-request drain.
 */
export function createShellServerDrainInternalV1(input: {
  readonly cancelNonAuthoritativeRequests: () => void;
  readonly shutdown: ShellServerLikeV1["shutdown"];
}): ShellServerLikeV1["shutdown"] {
  return async (): Promise<void> => {
    input.cancelNonAuthoritativeRequests();
    await input.shutdown();
  };
}

let nextRendererFlushRequestIdV1 = 0;

function readOwnDataPropertyV1(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
}

function unwrapExecuteJsResultV1(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  const okDescriptor = Object.getOwnPropertyDescriptor(value, "ok");
  if (okDescriptor === undefined) return value;
  if (!("value" in okDescriptor) || okDescriptor.value !== true) return null;
  const valueDescriptor = Object.getOwnPropertyDescriptor(value, "value");
  return valueDescriptor !== undefined && "value" in valueDescriptor ? valueDescriptor.value : null;
}

function rendererFlushStatusV1(
  value: unknown,
  requestId: number,
): "preparing" | "flushed" | "failed" | null {
  try {
    const receipt = unwrapExecuteJsResultV1(value);
    if (receipt === null || typeof receipt !== "object") return null;
    if (
      readOwnDataPropertyV1(receipt, "protocolRevision") !== 1 ||
      readOwnDataPropertyV1(receipt, "requestId") !== requestId
    ) {
      return null;
    }
    const kind = readOwnDataPropertyV1(receipt, "kind");
    return kind === "preparing" || kind === "flushed" || kind === "failed" ? kind : null;
  } catch {
    return null;
  }
}

function rendererFlushRequestSourceV1(operation: "prepare" | "read", requestId: number): string {
  return `globalThis.__SILLYMAKER_DESKTOP_CLOSE_V1__?.(${
    JSON.stringify({
      operation,
      protocolRevision: 1,
      requestId,
    })
  })`;
}

function allocateRendererFlushRequestIdV1(): number {
  nextRendererFlushRequestIdV1 = nextRendererFlushRequestIdV1 >= Number.MAX_SAFE_INTEGER
    ? 1
    : nextRendererFlushRequestIdV1 + 1;
  return nextRendererFlushRequestIdV1;
}

/**
 * Asks the adopted renderer to verify the exact current authoritative
 * Snapshot in `auto.current`. Deno Desktop 2.9.x currently wraps an
 * `executeJs()` value in `{ ok, value }`, while its declared API returns the
 * value directly; this internal bridge accepts both shapes and fails closed on
 * an execution-failure envelope. `executeJs()` only transports synchronous JSON
 * values, so the first call starts preparation and close-scoped reads wait for
 * its terminal receipt. This is not a page heartbeat: polling exists only while
 * a native close is pending, and no timeout converts a missing receipt into
 * process exit.
 */
export async function requestShellRendererFlushV1(
  window: ShellWindowLikeV1 | null,
  options: {
    readonly waitForPoll?: () => Promise<void>;
    /** Deterministic injection for tests; production allocates monotonically. */
    readonly requestId?: number;
  } = {},
): Promise<boolean> {
  if (window === null || typeof window.executeJs !== "function") return false;
  const requestId = options.requestId ?? allocateRendererFlushRequestIdV1();
  if (!Number.isSafeInteger(requestId) || requestId < 1) return false;
  const waitForPoll = options.waitForPoll ??
    (() => new Promise<void>((resolve) => setTimeout(resolve, 25)));
  try {
    let status = rendererFlushStatusV1(
      await window.executeJs(rendererFlushRequestSourceV1("prepare", requestId)),
      requestId,
    );
    while (status === "preparing") {
      await waitForPoll();
      status = rendererFlushStatusV1(
        await window.executeJs(rendererFlushRequestSourceV1("read", requestId)),
        requestId,
      );
    }
    return status === "flushed";
  } catch {
    return false;
  }
}

/**
 * Creates an idempotent close request. An optional renderer preparation must
 * acknowledge before `HttpServer.shutdown()` stops ingress and lets active
 * requests finish; only after that drain succeeds may the process exit and
 * tear down the native window.
 */
export function createShellShutdownV1(input: {
  readonly prepare?: () => boolean | Promise<boolean>;
  readonly shutdown: ShellServerLikeV1["shutdown"];
  readonly exit: () => void;
}): () => void {
  let phase: "idle" | "preparing" | "draining" | "drain_failed" = "idle";
  async function drainAndExitV1(): Promise<void> {
    try {
      const prepared = input.prepare === undefined ? true : await input.prepare();
      if (!prepared) {
        phase = "idle";
        return;
      }
    } catch {
      phase = "idle";
      return;
    }
    phase = "draining";
    try {
      await input.shutdown();
    } catch {
      // A failed drain must not be converted back into an unsafe forced exit.
      // The runtime stays alive so the user can force-quit explicitly.
      phase = "drain_failed";
      return;
    }
    input.exit();
  }

  return (): void => {
    if (phase !== "idle") return;
    phase = "preparing";
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
