// SPDX-License-Identifier: MIT

import {
  browserNetworkBrokerContentTypeMaximumBytesV1,
  browserNetworkBrokerResponseMaximumBytesV1,
  createBrowserNetworkBrokerFetchUrlFailedV1,
  createBrowserNetworkBrokerFetchUrlResultV1,
  type BrowserNetworkBrokerFetchUrlFailedV1,
  type BrowserNetworkBrokerFetchUrlRequestV1,
  type BrowserNetworkBrokerFetchUrlResultV1,
} from "./browser-network-broker-protocol.ts";

export const browserNetworkBrokerTotalDeadlineMillisecondsV1 = 15_000;
export const browserNetworkBrokerIdleDeadlineMillisecondsV1 = 5_000;

export interface BrowserNetworkBrokerFetchRuntimeV1 {
  readonly fetch?: typeof fetch;
  readonly totalDeadlineMilliseconds?: number;
  readonly idleDeadlineMilliseconds?: number;
}

class BrowserNetworkBrokerAbortV1 extends Error {
  constructor(readonly reason: "cancelled" | "deadline") {
    super("sillyos.network_broker.request_aborted");
    this.name = "BrowserNetworkBrokerAbortV1";
  }
}

function validDeadlineV1(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= 60_000;
}

function textualContentTypeV1(value: string | null): string | null {
  if (
    value === null || /[\r\n]/u.test(value) ||
    new TextEncoder().encode(value).byteLength > browserNetworkBrokerContentTypeMaximumBytesV1
  ) return null;
  const segments = value.split(";");
  const essence = segments.shift()?.trim().toLowerCase() ?? "";
  const textual = /^text\/[a-z0-9!#$&^_.+-]+$/u.test(essence) ||
    essence === "application/json" || essence === "application/xml" ||
    /^application\/[a-z0-9!#$&^_.+-]+\+(?:json|xml)$/u.test(essence);
  if (!textual) return null;

  let charset: string | null = null;
  for (const rawParameter of segments) {
    const parameter = rawParameter.trim();
    if (parameter === "") continue;
    const separator = parameter.indexOf("=");
    if (separator <= 0) return null;
    const name = parameter.slice(0, separator).trim().toLowerCase();
    let parameterValue = parameter.slice(separator + 1).trim().toLowerCase();
    if (
      parameterValue.length >= 2 && parameterValue.startsWith('"') &&
      parameterValue.endsWith('"')
    ) parameterValue = parameterValue.slice(1, -1);
    if (name !== "charset") continue;
    if (charset !== null) return null;
    charset = parameterValue;
  }
  if (charset !== null && charset !== "utf-8" && charset !== "utf8") return null;
  return value;
}

function declaredLengthV1(response: Response): number | null {
  const value = response.headers.get("content-length");
  if (value === null || !/^(?:0|[1-9][0-9]*)$/u.test(value)) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) ? length : null;
}

function cancelledResultV1(
  requestId: string,
  reason: "cancelled" | "deadline",
): BrowserNetworkBrokerFetchUrlFailedV1 {
  return createBrowserNetworkBrokerFetchUrlFailedV1(
    requestId,
    reason === "cancelled" ? "cancelled" : "network_failed",
  );
}

/** Executes one fixed, credential-free Broker GET. */
export async function executeBrowserNetworkBrokerFetchUrlV1(
  request: BrowserNetworkBrokerFetchUrlRequestV1,
  signal: AbortSignal,
  runtime: BrowserNetworkBrokerFetchRuntimeV1 = {},
): Promise<BrowserNetworkBrokerFetchUrlResultV1 | BrowserNetworkBrokerFetchUrlFailedV1> {
  const fetchImplementation = runtime.fetch ?? fetch;
  const totalDeadlineMilliseconds = runtime.totalDeadlineMilliseconds ??
    browserNetworkBrokerTotalDeadlineMillisecondsV1;
  const idleDeadlineMilliseconds = runtime.idleDeadlineMilliseconds ??
    browserNetworkBrokerIdleDeadlineMillisecondsV1;
  if (!validDeadlineV1(totalDeadlineMilliseconds) || !validDeadlineV1(idleDeadlineMilliseconds)) {
    throw new TypeError("sillyos.network_broker.deadline_invalid");
  }

  const controller = new AbortController();
  let abortReason: "cancelled" | "deadline" | null = null;
  let rejectAbortV1: ((error: BrowserNetworkBrokerAbortV1) => void) | null = null;
  const abortGateV1 = new Promise<never>((_resolve, reject) => {
    rejectAbortV1 = reject;
  });
  const abortV1 = (reason: "cancelled" | "deadline"): void => {
    if (abortReason !== null) return;
    abortReason = reason;
    controller.abort();
    rejectAbortV1?.(new BrowserNetworkBrokerAbortV1(reason));
  };
  const onExternalAbortV1 = (): void => abortV1("cancelled");
  if (signal.aborted) abortV1("cancelled");
  else signal.addEventListener("abort", onExternalAbortV1, { once: true });

  const totalTimerV1 = setTimeout(() => abortV1("deadline"), totalDeadlineMilliseconds);
  let idleTimerV1: ReturnType<typeof setTimeout> | null = null;
  const resetIdleTimerV1 = (): void => {
    if (idleTimerV1 !== null) clearTimeout(idleTimerV1);
    idleTimerV1 = setTimeout(() => abortV1("deadline"), idleDeadlineMilliseconds);
  };
  let readerV1: ReadableStreamDefaultReader<Uint8Array> | null = null;

  try {
    const fetchPromiseV1 = fetchImplementation(request.url, {
      method: "GET",
      mode: "cors",
      redirect: "error",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: controller.signal,
    });
    const response = await Promise.race([fetchPromiseV1, abortGateV1]);
    if (response.status < 100 || response.status > 599 || response.type === "opaque") {
      return createBrowserNetworkBrokerFetchUrlFailedV1(request.requestId, "network_failed");
    }

    const contentType = textualContentTypeV1(response.headers.get("content-type"));
    if (contentType === null) {
      void response.body?.cancel().catch(() => {});
      return createBrowserNetworkBrokerFetchUrlFailedV1(
        request.requestId,
        "unsupported_content_type",
      );
    }
    const declaredLength = declaredLengthV1(response);
    if (
      declaredLength !== null && declaredLength > browserNetworkBrokerResponseMaximumBytesV1
    ) {
      void response.body?.cancel().catch(() => {});
      return createBrowserNetworkBrokerFetchUrlFailedV1(
        request.requestId,
        "response_too_large",
      );
    }

    const chunksV1: Uint8Array[] = [];
    let bytesV1 = 0;
    if (response.body !== null) {
      readerV1 = response.body.getReader();
      resetIdleTimerV1();
      while (true) {
        const record = await Promise.race([readerV1.read(), abortGateV1]);
        if (record.done) break;
        if (!(record.value instanceof Uint8Array)) {
          return createBrowserNetworkBrokerFetchUrlFailedV1(
            request.requestId,
            "network_failed",
          );
        }
        bytesV1 += record.value.byteLength;
        if (bytesV1 > browserNetworkBrokerResponseMaximumBytesV1) {
          void readerV1.cancel().catch(() => {});
          return createBrowserNetworkBrokerFetchUrlFailedV1(
            request.requestId,
            "response_too_large",
          );
        }
        chunksV1.push(record.value.slice());
        resetIdleTimerV1();
      }
    }

    const bytes = new Uint8Array(bytesV1);
    let offsetV1 = 0;
    for (const chunk of chunksV1) {
      bytes.set(chunk, offsetV1);
      offsetV1 += chunk.byteLength;
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return createBrowserNetworkBrokerFetchUrlFailedV1(
        request.requestId,
        "unsupported_content_type",
      );
    }
    return createBrowserNetworkBrokerFetchUrlResultV1({
      requestId: request.requestId,
      status: response.status,
      contentType,
      bytes: bytesV1,
      text,
    });
  } catch (error) {
    if (error instanceof BrowserNetworkBrokerAbortV1) {
      return cancelledResultV1(request.requestId, error.reason);
    }
    if (abortReason !== null) return cancelledResultV1(request.requestId, abortReason);
    return createBrowserNetworkBrokerFetchUrlFailedV1(request.requestId, "network_failed");
  } finally {
    clearTimeout(totalTimerV1);
    if (idleTimerV1 !== null) clearTimeout(idleTimerV1);
    signal.removeEventListener("abort", onExternalAbortV1);
    if (abortReason !== null) void readerV1?.cancel().catch(() => {});
    rejectAbortV1 = null;
  }
}
