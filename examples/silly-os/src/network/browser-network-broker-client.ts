// SPDX-License-Identifier: MIT

import {
  admitBrowserNetworkBrokerFetchUrlFailedV1,
  admitBrowserNetworkBrokerFetchUrlRequestV1,
  admitBrowserNetworkBrokerFetchUrlResultV1,
  createBrowserNetworkBrokerCancelV1,
  createBrowserNetworkBrokerFetchUrlRequestV1,
  type BrowserNetworkBrokerFailureCodeV1,
  type BrowserNetworkBrokerFetchUrlResultV1,
} from "./browser-network-broker-protocol.ts";
import { normalizeBrowserNetworkUrlV1 } from "./browser-network-url.ts";

export class BrowserNetworkBrokerClientErrorV1 extends Error {
  constructor(readonly code: BrowserNetworkBrokerFailureCodeV1 | "invalid_url") {
    super(`sillyos.network_broker.${code}`);
    this.name = "BrowserNetworkBrokerClientErrorV1";
  }
}

export interface BrowserNetworkBrokerClientV1 {
  fetchUrl(
    url: string,
    signal?: AbortSignal,
  ): Promise<BrowserNetworkBrokerFetchUrlResultV1>;
  close(): void;
}

export interface BrowserNetworkBrokerClientOptionsV1 {
  readonly createRequestId?: () => string;
  readonly responseDeadlineMilliseconds?: number;
}

export const browserNetworkBrokerClientResponseDeadlineMillisecondsV1 = 20_000;

interface PendingRequestV1 {
  readonly resolve: (result: BrowserNetworkBrokerFetchUrlResultV1) => void;
  readonly reject: (error: BrowserNetworkBrokerClientErrorV1) => void;
  readonly signal: AbortSignal | null;
  readonly onAbort: (() => void) | null;
  readonly deadline: ReturnType<typeof setTimeout>;
}

export function createBrowserNetworkBrokerClientV1(
  port: MessagePort,
  options: BrowserNetworkBrokerClientOptionsV1 = {},
): BrowserNetworkBrokerClientV1 {
  const responseDeadlineMilliseconds = options.responseDeadlineMilliseconds ??
    browserNetworkBrokerClientResponseDeadlineMillisecondsV1;
  if (
    !Number.isSafeInteger(responseDeadlineMilliseconds) || responseDeadlineMilliseconds <= 0 ||
    responseDeadlineMilliseconds > 60_000
  ) throw new TypeError("sillyos.network_broker.client_deadline_invalid");
  const pendingV1 = new Map<string, PendingRequestV1>();
  let closedV1 = false;

  const detachV1 = (request: PendingRequestV1): void => {
    clearTimeout(request.deadline);
    if (request.signal !== null && request.onAbort !== null) {
      request.signal.removeEventListener("abort", request.onAbort);
    }
  };
  const closeV1 = (): void => {
    if (closedV1) return;
    closedV1 = true;
    port.removeEventListener("message", onMessageV1);
    port.removeEventListener("messageerror", onMessageErrorV1);
    port.close();
    for (const request of pendingV1.values()) {
      detachV1(request);
      request.reject(new BrowserNetworkBrokerClientErrorV1("network_failed"));
    }
    pendingV1.clear();
  };
  function onMessageErrorV1(): void {
    closeV1();
  }
  function onMessageV1(event: MessageEvent<unknown>): void {
    const result = admitBrowserNetworkBrokerFetchUrlResultV1(event.data);
    const failed = result === null ? admitBrowserNetworkBrokerFetchUrlFailedV1(event.data) : null;
    if (result === null && failed === null) {
      closeV1();
      return;
    }
    const record = result ?? failed;
    if (record === null) return;
    const request = pendingV1.get(record.requestId);
    // Cancellation/currentness may remove a request before the Broker settles.
    if (request === undefined) return;
    pendingV1.delete(record.requestId);
    detachV1(request);
    if (result !== null) request.resolve(result);
    else request.reject(new BrowserNetworkBrokerClientErrorV1(failed?.code ?? "network_failed"));
  }

  port.addEventListener("message", onMessageV1);
  port.addEventListener("messageerror", onMessageErrorV1);
  port.start();

  return {
    async fetchUrl(inputUrl, signal) {
      if (closedV1) throw new BrowserNetworkBrokerClientErrorV1("network_failed");
      const url = normalizeBrowserNetworkUrlV1(inputUrl);
      if (url === null) throw new BrowserNetworkBrokerClientErrorV1("invalid_url");
      if (signal?.aborted === true) throw new BrowserNetworkBrokerClientErrorV1("cancelled");
      const requestId = options.createRequestId?.() ?? `network.request.${crypto.randomUUID()}`;
      const message = createBrowserNetworkBrokerFetchUrlRequestV1(requestId, url);
      if (
        admitBrowserNetworkBrokerFetchUrlRequestV1(message) === null || pendingV1.has(requestId)
      ) {
        closeV1();
        throw new BrowserNetworkBrokerClientErrorV1("network_failed");
      }

      return await new Promise<BrowserNetworkBrokerFetchUrlResultV1>((resolve, reject) => {
        const onAbort = signal === undefined ? null : (): void => {
          const request = pendingV1.get(requestId);
          if (request === undefined) return;
          pendingV1.delete(requestId);
          detachV1(request);
          try {
            port.postMessage(createBrowserNetworkBrokerCancelV1(requestId));
          } catch {
            closeV1();
          }
          reject(new BrowserNetworkBrokerClientErrorV1("cancelled"));
        };
        const deadline = setTimeout(() => {
          const request = pendingV1.get(requestId);
          if (request === undefined) return;
          pendingV1.delete(requestId);
          detachV1(request);
          try {
            port.postMessage(createBrowserNetworkBrokerCancelV1(requestId));
          } catch {
            closeV1();
          }
          reject(new BrowserNetworkBrokerClientErrorV1("network_failed"));
        }, responseDeadlineMilliseconds);
        const request: PendingRequestV1 = {
          resolve,
          reject,
          signal: signal ?? null,
          onAbort,
          deadline,
        };
        pendingV1.set(requestId, request);
        signal?.addEventListener("abort", onAbort as () => void, { once: true });
        try {
          port.postMessage(message);
        } catch {
          pendingV1.delete(requestId);
          detachV1(request);
          reject(new BrowserNetworkBrokerClientErrorV1("network_failed"));
        }
      });
    },
    close: closeV1,
  };
}
