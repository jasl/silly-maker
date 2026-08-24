// SPDX-License-Identifier: MIT

/**
 * Package-internal renderer hook invoked by the Deno Desktop shell through
 * `BrowserWindow.executeJs()`. It is intentionally not part of the public web
 * package surface.
 */
export const desktopCloseFlushGlobalKeyV1 = "__SILLYMAKER_DESKTOP_CLOSE_V1__";

type DesktopCloseFlushKindV1 = "preparing" | "flushed" | "failed";

interface DesktopCloseFlushStateV1 {
  readonly kind: DesktopCloseFlushKindV1;
  readonly protocolRevision: 1;
  readonly requestId: number;
}

function receiptV1(kind: DesktopCloseFlushKindV1, requestId: number): DesktopCloseFlushStateV1 {
  return { kind, protocolRevision: 1 as const, requestId };
}

function readActionV1(
  action: unknown,
): { readonly operation: "prepare" | "read"; readonly requestId: number } | null {
  if (action === null || typeof action !== "object") return null;
  const record = action as {
    readonly operation?: unknown;
    readonly protocolRevision?: unknown;
    readonly requestId?: unknown;
  };
  if (
    (record.operation !== "prepare" && record.operation !== "read") ||
    record.protocolRevision !== 1 ||
    typeof record.requestId !== "number" ||
    !Number.isSafeInteger(record.requestId) ||
    record.requestId < 1
  ) {
    return null;
  }
  return {
    operation: record.operation,
    requestId: record.requestId,
  };
}

export function installDesktopCloseFlushV1(input: {
  readonly enabled: boolean;
  /** Synchronously fences new authoritative ingress before persistence work. */
  readonly fence: () => void;
  readonly flush: () => Promise<void>;
  readonly reportFailure?: (error: unknown) => void;
  readonly target?: object;
}): () => void {
  if (!input.enabled) return () => {};
  const target = input.target ?? globalThis;
  if (Object.hasOwn(target, desktopCloseFlushGlobalKeyV1)) {
    throw new TypeError("web.desktop_close_bridge_collision");
  }

  let state: DesktopCloseFlushStateV1 | null = null;
  const prepareV1 = (requestId: number): DesktopCloseFlushStateV1 => {
    if (state?.kind === "preparing") {
      return state.requestId === requestId ? state : receiptV1("failed", requestId);
    }
    state = receiptV1("preparing", requestId);
    let preparation: Promise<void>;
    try {
      input.fence();
      preparation = Promise.resolve(input.flush());
    } catch (error) {
      try {
        input.reportFailure?.(error);
      } catch {
        // Diagnostic reporting cannot turn a failed flush into an acknowledgement.
      }
      state = receiptV1("failed", requestId);
      return state;
    }
    void preparation.then(
      () => {
        if (state?.requestId === requestId) {
          state = receiptV1("flushed", requestId);
        }
      },
      (error: unknown) => {
        try {
          input.reportFailure?.(error);
        } catch {
          // Diagnostic reporting cannot turn a failed flush into an acknowledgement.
        }
        if (state?.requestId === requestId) {
          state = receiptV1("failed", requestId);
        }
      },
    );
    return state;
  };
  const handler = (rawAction: unknown): DesktopCloseFlushStateV1 => {
    const action = readActionV1(rawAction);
    if (action === null) return receiptV1("failed", 1);
    if (action.operation === "prepare") return prepareV1(action.requestId);
    return state?.requestId === action.requestId ? state : receiptV1("failed", action.requestId);
  };

  try {
    Object.defineProperty(target, desktopCloseFlushGlobalKeyV1, {
      configurable: true,
      enumerable: false,
      value: handler,
      writable: false,
    });
  } catch (error) {
    throw new TypeError("web.desktop_close_bridge_collision", { cause: error });
  }

  return (): void => {
    const bridgeTarget = target as Record<string, unknown>;
    if (bridgeTarget[desktopCloseFlushGlobalKeyV1] === handler) {
      delete bridgeTarget[desktopCloseFlushGlobalKeyV1];
    }
  };
}
