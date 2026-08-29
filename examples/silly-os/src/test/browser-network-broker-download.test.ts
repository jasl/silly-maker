// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";

import { executeBrowserNetworkDownloadV1 } from "../network/browser-network-broker-download.ts";
import {
  admitBrowserNetworkDownloadBrokerMessageV1,
  createBrowserNetworkDownloadChunkAckV1,
  createBrowserNetworkDownloadRequestV1,
  createBrowserNetworkDownloadSinkReadyV1,
  type BrowserNetworkDownloadBrokerMessageV1,
} from "../network/browser-network-download-stream-protocol.ts";

const requestV1 = createBrowserNetworkDownloadRequestV1(
  "network.request.download.test",
  "https://assets.example.test/archive.zip",
);
const channelsV1: MessageChannel[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const channel of channelsV1.splice(0)) {
    channel.port1.close();
    channel.port2.close();
  }
});

async function waitUntilV1(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for the Browser Network Broker download");
}

function observeSinkV1(channel: MessageChannel): BrowserNetworkDownloadBrokerMessageV1[] {
  const messages: BrowserNetworkDownloadBrokerMessageV1[] = [];
  channel.port2.addEventListener("message", (event: MessageEvent<unknown>) => {
    const message = admitBrowserNetworkDownloadBrokerMessageV1(event.data);
    if (message !== null) messages.push(message);
  });
  channel.port2.start();
  return messages;
}

describe("Browser Network Broker direct download", () => {
  it("performs zero GET before ready and keeps one 1 MiB chunk outstanding until ACK", async () => {
    const channel = new MessageChannel();
    channelsV1.push(channel);
    const messages = observeSinkV1(channel);
    const bytes = new Uint8Array(2 * 1_024 * 1_024 + 3);
    bytes.fill(7);
    const fetchV1 = vi.fn(async (
      _input: Parameters<typeof fetch>[0],
      _init?: Parameters<typeof fetch>[1],
    ) =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": String(bytes.byteLength),
          },
        },
      )
    );
    const result = executeBrowserNetworkDownloadV1(
      requestV1,
      channel.port1,
      new AbortController().signal,
      { fetch: fetchV1 },
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(fetchV1).not.toHaveBeenCalled();

    channel.port2.postMessage(createBrowserNetworkDownloadSinkReadyV1(requestV1.requestId));
    await waitUntilV1(() => messages.some(({ kind }) => kind === "network_broker_download_chunk"));
    expect(fetchV1).toHaveBeenCalledTimes(1);
    expect(fetchV1.mock.calls[0]?.[0]).toBe(requestV1.url);
    expect(fetchV1.mock.calls[0]?.[1]).toEqual({
      method: "GET",
      mode: "cors",
      redirect: "error",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
    expect(messages.filter(({ kind }) => kind === "network_broker_download_chunk")).toHaveLength(1);
    const first = messages.find(({ kind }) => kind === "network_broker_download_chunk");
    expect(first).toMatchObject({ sequence: 1, offset: 0, bytes: 1_024 * 1_024 });

    for (const sequence of [1, 2, 3]) {
      channel.port2.postMessage(
        createBrowserNetworkDownloadChunkAckV1(requestV1.requestId, sequence),
      );
      if (sequence < 3) {
        await waitUntilV1(() =>
          messages.filter(({ kind }) => kind === "network_broker_download_chunk").length ===
            sequence + 1
        );
      }
    }
    await expect(result).resolves.toMatchObject({
      kind: "network_broker_download_complete",
      bytes: bytes.byteLength,
      chunks: 3,
    });
    await waitUntilV1(() =>
      messages.some(({ kind }) => kind === "network_broker_download_complete")
    );
    expect(messages.filter(({ kind }) => kind === "network_broker_download_chunk")).toHaveLength(3);
    expect(messages.at(-1)).toMatchObject({ kind: "network_broker_download_complete" });
  });

  it("returns only scalar 4xx metadata and never transfers the response body", async () => {
    const channel = new MessageChannel();
    channelsV1.push(channel);
    const messages = observeSinkV1(channel);
    const cancelBodyV1 = vi.fn();
    const result = executeBrowserNetworkDownloadV1(
      requestV1,
      channel.port1,
      new AbortController().signal,
      {
        fetch: async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new TextEncoder().encode("secret diagnostic body"));
              },
              cancel: cancelBodyV1,
            }),
            {
              status: 404,
              headers: { "Content-Type": "text/plain", "Content-Length": "22" },
            },
          ),
      },
    );
    channel.port2.postMessage(createBrowserNetworkDownloadSinkReadyV1(requestV1.requestId));
    await expect(result).resolves.toMatchObject({
      kind: "network_broker_download_http_error",
      status: 404,
      contentType: "text/plain",
      declaredBytes: 22,
    });
    await waitUntilV1(() => messages.length === 1);
    expect(messages).toEqual([expect.objectContaining({
      kind: "network_broker_download_http_error",
      status: 404,
    })]);
    expect(JSON.stringify(messages)).not.toContain("secret diagnostic body");
    expect(cancelBodyV1).toHaveBeenCalledTimes(1);
  });

  it("rejects declared overflow before reading or transferring a chunk", async () => {
    const channel = new MessageChannel();
    channelsV1.push(channel);
    const messages = observeSinkV1(channel);
    const cancelBodyV1 = vi.fn();
    const result = executeBrowserNetworkDownloadV1(
      requestV1,
      channel.port1,
      new AbortController().signal,
      {
        fetch: async () =>
          new Response(new ReadableStream<Uint8Array>({ cancel: cancelBodyV1 }), {
            status: 200,
            headers: { "Content-Length": String(32 * 1_024 * 1_024 + 1) },
          }),
      },
    );
    channel.port2.postMessage(createBrowserNetworkDownloadSinkReadyV1(requestV1.requestId));
    await expect(result).resolves.toMatchObject({
      kind: "network_broker_download_failed",
      code: "response_too_large",
    });
    await waitUntilV1(() => messages.length === 1);
    expect(messages.some(({ kind }) => kind === "network_broker_download_chunk")).toBe(false);
    expect(cancelBodyV1).toHaveBeenCalledTimes(1);
  });

  it("bounds missing ACK and sink-ready waits without issuing another chunk or early GET", async () => {
    const noReadyChannel = new MessageChannel();
    channelsV1.push(noReadyChannel);
    const noReadyMessages = observeSinkV1(noReadyChannel);
    const noReadyFetchV1 = vi.fn(() => new Promise<Response>(() => {}));
    const noReadyResult = executeBrowserNetworkDownloadV1(
      requestV1,
      noReadyChannel.port1,
      new AbortController().signal,
      { fetch: noReadyFetchV1, totalDeadlineMilliseconds: 40, idleDeadlineMilliseconds: 20 },
    );
    await expect(noReadyResult).resolves.toMatchObject({ code: "deadline" });
    expect(noReadyFetchV1).not.toHaveBeenCalled();
    await waitUntilV1(() => noReadyMessages.length === 1);
    expect(noReadyMessages).toEqual([expect.objectContaining({ code: "deadline" })]);

    const noAckChannel = new MessageChannel();
    channelsV1.push(noAckChannel);
    const noAckMessages = observeSinkV1(noAckChannel);
    const noAckResult = executeBrowserNetworkDownloadV1(
      requestV1,
      noAckChannel.port1,
      new AbortController().signal,
      {
        fetch: async () => new Response(new Uint8Array(1_024 * 1_024 + 1)),
        totalDeadlineMilliseconds: 100,
        idleDeadlineMilliseconds: 20,
      },
    );
    noAckChannel.port2.postMessage(createBrowserNetworkDownloadSinkReadyV1(requestV1.requestId));
    await expect(noAckResult).resolves.toMatchObject({ code: "deadline" });
    await waitUntilV1(() =>
      noAckMessages.some(({ kind }) => kind === "network_broker_download_failed")
    );
    expect(
      noAckMessages.filter(({ kind }) => kind === "network_broker_download_chunk"),
    ).toHaveLength(1);
  });

  it("cancels promptly and ignores a fetch implementation that settles late", async () => {
    const channel = new MessageChannel();
    channelsV1.push(channel);
    const messages = observeSinkV1(channel);
    let settleLateV1!: (response: Response) => void;
    const controller = new AbortController();
    const result = executeBrowserNetworkDownloadV1(
      requestV1,
      channel.port1,
      controller.signal,
      {
        fetch: () =>
          new Promise<Response>((resolve) => {
            settleLateV1 = resolve;
          }),
      },
    );
    channel.port2.postMessage(createBrowserNetworkDownloadSinkReadyV1(requestV1.requestId));
    await waitUntilV1(() => settleLateV1 !== undefined);
    controller.abort();
    await expect(result).resolves.toMatchObject({ code: "cancelled" });
    await waitUntilV1(() => messages.length === 1);
    settleLateV1(new Response(new Uint8Array([1, 2, 3])));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(messages).toEqual([expect.objectContaining({ code: "cancelled" })]);
  });
});
