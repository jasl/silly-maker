// SPDX-License-Identifier: MIT

import {
  admitBrowserNetworkDownloadChunkAckV1,
  admitBrowserNetworkDownloadSinkAbortV1,
  admitBrowserNetworkDownloadSinkReadyV1,
  browserNetworkDownloadChunkMaximumBytesV1,
  browserNetworkDownloadContentTypeMaximumBytesV1,
  browserNetworkDownloadTotalMaximumBytesV1,
  createBrowserNetworkDownloadChunkV1,
  createBrowserNetworkDownloadCompleteV1,
  createBrowserNetworkDownloadFailedV1,
  createBrowserNetworkDownloadHttpErrorV1,
  createBrowserNetworkDownloadResponseV1,
  type BrowserNetworkDownloadBrokerMessageV1,
  type BrowserNetworkDownloadFailureCodeV1,
  type BrowserNetworkDownloadRequestV1,
  type BrowserNetworkDownloadTerminalV1,
} from "./browser-network-download-stream-protocol.ts";

export const browserNetworkDownloadTotalDeadlineMillisecondsV1 = 30_000;
export const browserNetworkDownloadIdleDeadlineMillisecondsV1 = 5_000;

export interface BrowserNetworkDownloadRuntimeV1 {
  readonly fetch?: typeof fetch;
  readonly totalDeadlineMilliseconds?: number;
  readonly idleDeadlineMilliseconds?: number;
}

type WaitStateV1 =
  | { readonly kind: "ready" }
  | { readonly kind: "ack"; readonly sequence: number };

class BrowserNetworkDownloadAbortV1 extends Error {
  constructor(readonly code: BrowserNetworkDownloadFailureCodeV1) {
    super("sillyos.network_broker.download_aborted");
    this.name = "BrowserNetworkDownloadAbortV1";
  }
}

function validDeadlineV1(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= 60_000;
}

function contentTypeV1(response: Response): string | null {
  const value = response.headers.get("content-type");
  return value !== null && !/[\r\n]/u.test(value) &&
      new TextEncoder().encode(value).byteLength <= browserNetworkDownloadContentTypeMaximumBytesV1
    ? value
    : null;
}

function declaredLengthV1(response: Response): number | null {
  const value = response.headers.get("content-length");
  if (value === null || !/^(?:0|[1-9][0-9]*)$/u.test(value)) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) ? length : null;
}

/**
 * Runs one credential-free GET only after the transferred Host sink is ready.
 * The direct port carries at most one unacknowledged 1 MiB chunk.
 */
export async function executeBrowserNetworkDownloadV1(
  request: BrowserNetworkDownloadRequestV1,
  sinkPort: MessagePort,
  signal: AbortSignal,
  runtime: BrowserNetworkDownloadRuntimeV1 = {},
): Promise<BrowserNetworkDownloadTerminalV1> {
  const fetchImplementation = runtime.fetch ?? fetch;
  const totalDeadlineMilliseconds = runtime.totalDeadlineMilliseconds ??
    browserNetworkDownloadTotalDeadlineMillisecondsV1;
  const idleDeadlineMilliseconds = runtime.idleDeadlineMilliseconds ??
    browserNetworkDownloadIdleDeadlineMillisecondsV1;
  if (!validDeadlineV1(totalDeadlineMilliseconds) || !validDeadlineV1(idleDeadlineMilliseconds)) {
    sinkPort.close();
    throw new TypeError("sillyos.network_broker.download_deadline_invalid");
  }

  const fetchControllerV1 = new AbortController();
  let abortCodeV1: BrowserNetworkDownloadFailureCodeV1 | null = null;
  let rejectAbortV1: ((error: BrowserNetworkDownloadAbortV1) => void) | null = null;
  const abortGateV1 = new Promise<never>((_resolve, reject) => {
    rejectAbortV1 = reject;
  });
  let waitingV1: {
    readonly expected: WaitStateV1;
    readonly resolve: () => void;
  } | null = null;
  let idleTimerV1: ReturnType<typeof setTimeout> | null = null;
  let readerV1: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let terminalV1: BrowserNetworkDownloadTerminalV1 | null = null;

  const abortV1 = (code: BrowserNetworkDownloadFailureCodeV1): void => {
    if (abortCodeV1 !== null || terminalV1 !== null) return;
    abortCodeV1 = code;
    fetchControllerV1.abort();
    rejectAbortV1?.(new BrowserNetworkDownloadAbortV1(code));
  };
  const resetIdleDeadlineV1 = (): void => {
    if (idleTimerV1 !== null) clearTimeout(idleTimerV1);
    idleTimerV1 = setTimeout(() => abortV1("deadline"), idleDeadlineMilliseconds);
  };
  const postV1 = (
    message: BrowserNetworkDownloadBrokerMessageV1,
    transfer: Transferable[] = [],
  ): boolean => {
    try {
      sinkPort.postMessage(message, transfer);
      return true;
    } catch {
      abortV1("sink_failed");
      return false;
    }
  };
  const waitForV1 = async (expected: WaitStateV1): Promise<void> => {
    resetIdleDeadlineV1();
    const messageV1 = new Promise<void>((resolve) => {
      waitingV1 = { expected, resolve };
    });
    try {
      await Promise.race([messageV1, abortGateV1]);
    } finally {
      waitingV1 = null;
    }
  };
  const onExternalAbortV1 = (): void => abortV1("cancelled");
  const onSinkMessageErrorV1 = (): void => abortV1("sink_failed");
  const onSinkMessageV1 = (event: MessageEvent<unknown>): void => {
    if (event.ports.length !== 0) {
      for (const port of event.ports) port.close();
      abortV1("sink_failed");
      return;
    }
    const sinkAbort = admitBrowserNetworkDownloadSinkAbortV1(event.data);
    if (sinkAbort !== null && sinkAbort.requestId === request.requestId) {
      abortV1(sinkAbort.code);
      return;
    }
    const waiting = waitingV1;
    if (waiting?.expected.kind === "ready") {
      const ready = admitBrowserNetworkDownloadSinkReadyV1(event.data);
      if (ready !== null && ready.requestId === request.requestId) {
        waiting.resolve();
        return;
      }
    } else if (waiting?.expected.kind === "ack") {
      const ack = admitBrowserNetworkDownloadChunkAckV1(event.data);
      if (
        ack !== null && ack.requestId === request.requestId &&
        ack.sequence === waiting.expected.sequence
      ) {
        waiting.resolve();
        return;
      }
    }
    abortV1("sink_failed");
  };

  sinkPort.addEventListener("message", onSinkMessageV1);
  sinkPort.addEventListener("messageerror", onSinkMessageErrorV1);
  sinkPort.start();
  if (signal.aborted) abortV1("cancelled");
  else signal.addEventListener("abort", onExternalAbortV1, { once: true });
  const totalTimerV1 = setTimeout(() => abortV1("deadline"), totalDeadlineMilliseconds);

  const settleV1 = (
    terminal: BrowserNetworkDownloadTerminalV1,
  ): BrowserNetworkDownloadTerminalV1 => {
    terminalV1 = terminal;
    postV1(terminal);
    return terminal;
  };

  try {
    // No fetch or response metadata is created before this exact capability handshake.
    await waitForV1({ kind: "ready" });
    resetIdleDeadlineV1();
    const fetchPromiseV1 = fetchImplementation(request.url, {
      method: "GET",
      mode: "cors",
      redirect: "error",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: fetchControllerV1.signal,
    });
    const response = await Promise.race([fetchPromiseV1, abortGateV1]);
    const responseContentType = contentTypeV1(response);
    const declaredBytes = declaredLengthV1(response);

    if (response.status >= 400 && response.status <= 599) {
      void response.body?.cancel().catch(() => {});
      return settleV1(createBrowserNetworkDownloadHttpErrorV1({
        requestId: request.requestId,
        status: response.status,
        contentType: responseContentType,
        declaredBytes,
      }));
    }
    if (
      response.status < 200 || response.status > 299 || response.type === "opaque"
    ) {
      void response.body?.cancel().catch(() => {});
      return settleV1(createBrowserNetworkDownloadFailedV1(
        request.requestId,
        "network_failed",
      ));
    }
    if (declaredBytes !== null && declaredBytes > browserNetworkDownloadTotalMaximumBytesV1) {
      void response.body?.cancel().catch(() => {});
      return settleV1(createBrowserNetworkDownloadFailedV1(
        request.requestId,
        "response_too_large",
      ));
    }
    if (
      !postV1(createBrowserNetworkDownloadResponseV1({
        requestId: request.requestId,
        status: response.status,
        contentType: responseContentType,
        declaredBytes,
      }))
    ) throw new BrowserNetworkDownloadAbortV1("sink_failed");

    let bytesV1 = 0;
    let sequenceV1 = 0;
    if (response.body !== null) {
      readerV1 = response.body.getReader();
      while (true) {
        resetIdleDeadlineV1();
        const record = await Promise.race([readerV1.read(), abortGateV1]);
        if (record.done) break;
        if (!(record.value instanceof Uint8Array)) {
          return settleV1(createBrowserNetworkDownloadFailedV1(
            request.requestId,
            "network_failed",
          ));
        }
        for (
          let sourceOffsetV1 = 0;
          sourceOffsetV1 < record.value.byteLength;
          sourceOffsetV1 += browserNetworkDownloadChunkMaximumBytesV1
        ) {
          const chunkBytesV1 = Math.min(
            browserNetworkDownloadChunkMaximumBytesV1,
            record.value.byteLength - sourceOffsetV1,
          );
          if (bytesV1 + chunkBytesV1 > browserNetworkDownloadTotalMaximumBytesV1) {
            void readerV1.cancel().catch(() => {});
            return settleV1(createBrowserNetworkDownloadFailedV1(
              request.requestId,
              "response_too_large",
            ));
          }
          const chunkV1 = record.value.slice(sourceOffsetV1, sourceOffsetV1 + chunkBytesV1).buffer;
          sequenceV1 += 1;
          const message = createBrowserNetworkDownloadChunkV1({
            requestId: request.requestId,
            sequence: sequenceV1,
            offset: bytesV1,
            chunk: chunkV1,
          });
          if (!postV1(message, [chunkV1])) {
            throw new BrowserNetworkDownloadAbortV1("sink_failed");
          }
          await waitForV1({ kind: "ack", sequence: sequenceV1 });
          bytesV1 += chunkBytesV1;
        }
      }
    }
    return settleV1(createBrowserNetworkDownloadCompleteV1({
      requestId: request.requestId,
      bytes: bytesV1,
      chunks: sequenceV1,
    }));
  } catch (error) {
    const code = error instanceof BrowserNetworkDownloadAbortV1
      ? error.code
      : abortCodeV1 ?? "network_failed";
    const failed = createBrowserNetworkDownloadFailedV1(request.requestId, code);
    if (terminalV1 === null) settleV1(failed);
    return terminalV1 ?? failed;
  } finally {
    clearTimeout(totalTimerV1);
    if (idleTimerV1 !== null) clearTimeout(idleTimerV1);
    signal.removeEventListener("abort", onExternalAbortV1);
    sinkPort.removeEventListener("message", onSinkMessageV1);
    sinkPort.removeEventListener("messageerror", onSinkMessageErrorV1);
    fetchControllerV1.abort();
    if (abortCodeV1 !== null) void readerV1?.cancel().catch(() => {});
    try {
      readerV1?.releaseLock();
    } catch {
      // A cancelled reader may already have released its lock.
    }
    waitingV1 = null;
    rejectAbortV1 = null;
    sinkPort.close();
  }
}
