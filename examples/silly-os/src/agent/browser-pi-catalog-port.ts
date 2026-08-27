// SPDX-License-Identifier: MIT

import {
  createDefaultBrowserPiWorkerV1,
  type BrowserPiWorkerFactoryV1,
  type BrowserPiWorkerLikeV1,
} from "./browser-pi-transport.ts";
import {
  admitBrowserPiWorkerOutboundMessageV1,
  type BrowserPiProviderCatalogWireV1,
  type BrowserPiWorkerCatalogRequestV1,
} from "./browser-pi-worker-protocol.ts";

export type BrowserPiCatalogQueryResultV1 =
  | { readonly kind: "ready"; readonly catalog: BrowserPiProviderCatalogWireV1 }
  | {
    readonly kind: "unavailable";
    readonly code: "catalog_unavailable" | "protocol_invalid" | "worker_failed";
  };

const browserPiCatalogTimeoutMillisecondsV1 = 5_000;

export function queryBrowserPiProviderCatalogV1(input: {
  readonly workerFactory?: BrowserPiWorkerFactoryV1;
} = {}): Promise<BrowserPiCatalogQueryResultV1> {
  const workerFactory = input.workerFactory ?? createDefaultBrowserPiWorkerV1;
  let worker: BrowserPiWorkerLikeV1;
  try {
    worker = workerFactory();
  } catch {
    return Promise.resolve({ kind: "unavailable", code: "worker_failed" });
  }

  return new Promise((resolve) => {
    let settled = false;
    const cleanup = (): void => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      try {
        worker.terminate();
      } catch {
        // Termination is best-effort after the one catalog projection settles.
      }
    };
    const settle = (result: BrowserPiCatalogQueryResultV1): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const onMessage = (event: { readonly data: unknown }): void => {
      const message = admitBrowserPiWorkerOutboundMessageV1(event.data);
      if (
        message === null || message.kind !== "catalog_response" || message.requestId !== 1
      ) {
        settle({ kind: "unavailable", code: "protocol_invalid" });
        return;
      }
      settle(
        message.ok
          ? { kind: "ready", catalog: message.catalog }
          : { kind: "unavailable", code: "catalog_unavailable" },
      );
    };
    const onError = (): void => settle({ kind: "unavailable", code: "worker_failed" });
    const timer = setTimeout(
      () => settle({ kind: "unavailable", code: "worker_failed" }),
      browserPiCatalogTimeoutMillisecondsV1,
    );
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    const request: BrowserPiWorkerCatalogRequestV1 = {
      revision: 1,
      kind: "catalog_request",
      requestId: 1,
    };
    try {
      // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
      worker.postMessage(request);
    } catch {
      settle({ kind: "unavailable", code: "worker_failed" });
    }
  });
}
