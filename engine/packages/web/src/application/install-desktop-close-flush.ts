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
  return Object.freeze({ kind, protocolRevision: 1 as const, requestId });
}

function readActionV1(
  action: unknown,
): { readonly operation: "prepare" | "read"; readonly requestId: number } | null {
  if (action === null || typeof action !== "object") return null;
  try {
    const operationDescriptor = Object.getOwnPropertyDescriptor(action, "operation");
    const revisionDescriptor = Object.getOwnPropertyDescriptor(action, "protocolRevision");
    const requestIdDescriptor = Object.getOwnPropertyDescriptor(action, "requestId");
    if (
      operationDescriptor === undefined ||
      !("value" in operationDescriptor) ||
      (operationDescriptor.value !== "prepare" && operationDescriptor.value !== "read") ||
      revisionDescriptor === undefined ||
      !("value" in revisionDescriptor) ||
      revisionDescriptor.value !== 1 ||
      requestIdDescriptor === undefined ||
      !("value" in requestIdDescriptor) ||
      !Number.isSafeInteger(requestIdDescriptor.value) ||
      requestIdDescriptor.value < 1
    ) {
      return null;
    }
    return Object.freeze({
      operation: operationDescriptor.value,
      requestId: requestIdDescriptor.value as number,
    });
  } catch {
    return null;
  }
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
  try {
    if (Object.getOwnPropertyDescriptor(target, desktopCloseFlushGlobalKeyV1) !== undefined) {
      throw new TypeError("web.desktop_close_bridge_collision");
    }
  } catch (error) {
    if (error instanceof TypeError && error.message === "web.desktop_close_bridge_collision") {
      throw error;
    }
    throw new TypeError("web.desktop_close_bridge_collision", { cause: error });
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
    const descriptor = Object.getOwnPropertyDescriptor(target, desktopCloseFlushGlobalKeyV1);
    if (descriptor !== undefined && "value" in descriptor && descriptor.value === handler) {
      Reflect.deleteProperty(target, desktopCloseFlushGlobalKeyV1);
    }
  };
}
